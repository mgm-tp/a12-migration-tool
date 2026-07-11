/*
 * SPDX-License-Identifier: EUPL-1.2 OR LicenseRef-commercial
 *
 * Copyright (c) 2012-2026 mgm technology partners GmbH
 *
 * Dual License
 * ------------
 * This source file is part of the mgm A12 Platform and available under
 * a choice of two different licenses:
 *
 * 1. Open-Source License - EUPL v1.2
 *    You may redistribute and/or modify this file under the terms of the
 *    European Union Public License, version 1.2 - see https://eupl.eu/.
 *
 * 2. Commercial License
 *    Alternatively, you may obtain a commercial license from
 *    mgm technology partners GmbH, that permits use of this software
 *    under different terms (including support and maintenance services).
 *
 *    Please contact a12-license@mgm-tp.com for more information.
 *
 * You must select and comply with exactly one of the above license options.
 *
 * Warranty Disclaimer (applies to either option)
 * ----------------------------------------------
 * THIS SOFTWARE IS PROVIDED "AS IS" AND WITHOUT WARRANTY OF ANY KIND,
 * WHETHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NON-INFRINGEMENT, EXCEPT WHERE SUCH DISCLAIMERS ARE HELD TO BE
 * LEGALLY INVALID. SEE THE RESPECTIVE LICENSE TEXT FOR DETAILS.
 */

import { isModelInstance } from "@com.mgmtp.a12.base/base-model-api";

import type {
	Logger,
	MigrationStepContext,
	SideResultModel,
	SideResultModelInput,
	SideResultResource,
	SideResultResourceInput,
	Workspace,
	WorkspaceModel,
	WorkspaceResource
} from "../../types.js";

import { generateResourceName, sha256Hex } from "./workspace-utils.js";

/** @internal */
export interface MigrationStepContextResult {
	/** The context to pass to migration steps and post-migration */
	readonly context: MigrationStepContext;
	/** Returns collected side results, or undefined if none were added */
	getOptionalSideResources(): SideResultResource[] | undefined;
	/** Returns collected side models, or undefined if none were added */
	getOptionalSideModels(): SideResultModel[] | undefined;
	/** Returns true if the model was marked for deletion, or undefined otherwise */
	getOptionalIsDeleted(): true | undefined;
	/** Returns models queued for deletion, or undefined if none were queued */
	getOptionalDeletedModels(): string[] | undefined;
	/** Returns resource names queued for deletion, or undefined if none were queued */
	getOptionalDeletedResources(): string[] | undefined;
}

/** @internal */
export function createMigrationStepContext(params: {
	readonly logger: Logger;
	readonly workspace?: Workspace;
	readonly userConfig?: unknown;
}): MigrationStepContextResult {
	const { logger, workspace, userConfig } = params;
	const sideResources = new Map<string, SideResultResource>();
	const sideModels = new Map<string, SideResultModel>();
	let deleted = false;
	const deletedModels: string[] = [];
	const deletedResources: string[] = [];

	const context: MigrationStepContext = {
		workspace,
		userConfig,

		// ── Find (lightweight) ──
		findModel: (id) => findModelById(workspace, id),
		findResource: (path) => findResourceByPath(workspace, path),

		// ── Resolve (delegates to workspace callbacks) ──
		resolveModel: (model) => {
			if (!workspace?.resolveModel) {
				logger.info("resolveModel called but no resolveModel callback configured on workspace");
				return undefined;
			}
			return workspace.resolveModel(model);
		},
		resolveResource: (resource) => {
			if (!workspace?.resolveResource) {
				logger.info("resolveResource called but no resolveResource callback configured on workspace");
				return undefined;
			}
			return workspace.resolveResource(resource);
		},

		// ── Mutations ──
		addResource: (input) => addResourceToContext(logger, workspace, sideResources, input),
		addModel: (input) => addModelToContext(logger, workspace, sideModels, input),
		deleteCurrentModel: (reason) => {
			deleted = true;
			logger.info(`Model marked for deletion${reason ? ": " + reason : ""}`);
		},
		deleteModel: (id, reason) => {
			deletedModels.push(id);
			logger.info(`Model queued for deletion: ${id}${reason ? " (" + reason + ")" : ""}`);
		},
		deleteResource: (path, reason) => {
			deletedResources.push(path);
			logger.info(`Resource queued for deletion: ${path}${reason ? " (" + reason + ")" : ""}`);
		}
	};

	return {
		context,
		getOptionalSideResources: () => (sideResources.size > 0 ? [...sideResources.values()] : undefined),
		getOptionalSideModels: () => (sideModels.size > 0 ? [...sideModels.values()] : undefined),
		getOptionalIsDeleted: () => (deleted ? true : undefined),
		getOptionalDeletedModels: () => (deletedModels.length > 0 ? [...deletedModels] : undefined),
		getOptionalDeletedResources: () => (deletedResources.length > 0 ? [...deletedResources] : undefined)
	};
}

function addResourceToContext(
	logger: Logger,
	workspace: Workspace | undefined,
	sideResources: Map<string, SideResultResource>,
	input: SideResultResourceInput
): SideResultResource {
	const hash = sha256Hex(input.content);

	if (!input.path) {
		const existingInContext = sideResources.get(hash);
		if (existingInContext) {
			return existingInContext;
		}

		const existinginWorkSpace = findResourceByHash(workspace, hash);
		if (existinginWorkSpace) {
			logger.info("Resource already exists in workspace: " + existinginWorkSpace.path);
			return {
				...input,
				hash,
				path: existinginWorkSpace.path
			};
		}
	}

	const newResource: SideResultResource = {
		...input,
		hash,
		path: input.path ?? generateResourceName(input.originalName, hash)
	};
	sideResources.set(hash, newResource);
	logger.info("Extracted embedded data as side result: " + newResource.path);

	return newResource;
}

function addModelToContext(
	logger: Logger,
	workspace: Workspace | undefined,
	sideModels: Map<string, SideResultModel>,
	input: SideResultModelInput
): SideResultModel {
	const path = deriveModelPath(input);

	const existingInContext = sideModels.get(path);
	if (existingInContext) {
		return existingInContext;
	}

	const existingInWorkspace = workspace?.models.find((m) => m.path === path);
	if (existingInWorkspace) {
		logger.info("Updating existing model in workspace: " + path);
	}

	const newModel: SideResultModel = { model: input.model, path };
	sideModels.set(path, newModel);
	logger.info("Added model as side result: " + path);
	return newModel;
}

function deriveModelPath(input: SideResultModelInput): string {
	if (input.path) {
		return input.path;
	}
	const model = input.model;
	if (!isModelInstance(model)) {
		throw new Error("The Side Result is not a Model. Use 'addModel' instead.");
	}
	return `${model.header.id}.json`;
}

function findResourceByHash(workspace: Workspace | undefined, hash: string): WorkspaceResource | undefined {
	return workspace?.resources.find((r) => r.hash === hash);
}

function findResourceByPath(workspace: Workspace | undefined, path: string): WorkspaceResource | undefined {
	return workspace?.resources.find((r) => r.path === path);
}

function findModelById(workspace: Workspace | undefined, id: string): WorkspaceModel | undefined {
	if (!workspace?.models) {
		return undefined;
	}
	return workspace.models.find((m) => m.header.id === id);
}
