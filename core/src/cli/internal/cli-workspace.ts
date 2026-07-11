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

import * as FsSync from "node:fs";
import * as Fs from "node:fs/promises";
import * as Path from "node:path";

import { glob } from "glob";
import JSON5 from "json5";

import { isModelInstance } from "@com.mgmtp.a12.base/base-model-api";

import { type InternalMigrationResult, sha256Hex } from "../../core/shared.js";
import type {
	GenericModel,
	Logger,
	ModelHeader,
	SideResultModel,
	SideResultResource,
	Workspace,
	WorkspaceModel,
	WorkspaceResource
} from "../../types.js";

import { toRelativePath } from "./cli-utils.js";

/**
 * Tries to parse a string as an A12 model.
 * @param content - The file content as string.
 * @returns The model header if the content is a valid model, undefined otherwise.
 */
function tryParseAsModel(filePath: string, content: string): ModelHeader | undefined {
	if (!filePath.endsWith(".json")) {
		return undefined;
	}
	try {
		const parsed = JSON5.parse(content);
		if (isModelInstance(parsed)) {
			return parsed.header as ModelHeader;
		}
	} catch {
		// Not a valid JSON model
	}
	return undefined;
}

/** @internal */
export class CLIWorkspace implements Workspace {
	readonly models: WorkspaceModel[] = [];
	readonly resources: WorkspaceResource[] = [];

	private readonly _workspacePath: string | undefined;
	private readonly _resourcesPath: string | undefined;
	private readonly _sideResources = new Map<string, SideResultResource>();
	private readonly _sideModels = new Map<string, SideResultModel>();
	private readonly _modelDeletions = new Set<string>(); // workspace-relative paths
	private readonly _resourceDeletions = new Set<string>(); // resource-relative paths

	constructor(options: { workspacePath?: string; resourcesPath?: string }) {
		this._workspacePath = options.workspacePath;
		this._resourcesPath = options.resourcesPath;
	}

	async scan(logger: Logger): Promise<void> {
		const modelAbsolutePaths = new Set<string>();

		// Scan workspace for models (only if workspace path is provided)
		if (this._workspacePath) {
			const workspacePattern = Path.join(this._workspacePath, "**", "*").split(Path.sep).join("/");
			const workspaceFiles = await glob(workspacePattern, { nodir: true, ignore: "**/node_modules/**" });

			for (const filePath of workspaceFiles) {
				const relativePath = Path.relative(this._workspacePath, filePath).split(Path.sep).join("/");
				try {
					const content = await Fs.readFile(filePath, "utf-8");
					const header = tryParseAsModel(filePath, content);
					if (header) {
						this.models.push({ header, path: relativePath });
						modelAbsolutePaths.add(filePath);
					}
				} catch {
					// Skip unreadable files
				}
			}
		}

		// Scan resources directory for non-model files
		if (this._resourcesPath) {
			const resPattern = Path.join(this._resourcesPath, "**", "*").split(Path.sep).join("/");
			const resourceFiles = await glob(resPattern, { nodir: true, ignore: "**/node_modules/**" });

			for (const filePath of resourceFiles) {
				// check if file is already known to be a model
				if (modelAbsolutePaths?.has(filePath)) {
					continue;
				}

				const relativePath = Path.relative(this._resourcesPath, filePath).split(Path.sep).join("/");
				try {
					const content = await Fs.readFile(filePath);
					// Skip files that are A12 models
					const contentStr = content.toString("utf-8");
					const header = tryParseAsModel(filePath, contentStr);
					if (header) {
						continue;
					}
					const hash = sha256Hex(new Uint8Array(content));
					this.resources.push({ path: relativePath, hash });
				} catch {
					// Skip unreadable files
				}
			}
		}

		logger.info("Workspace scanned: " + this.models.length + " model(s), " + this.resources.length + " resource(s)");
	}

	resolveModel = (model: WorkspaceModel): GenericModel | undefined => {
		if (!this._workspacePath) {
			return undefined;
		}
		try {
			const absolutePath = Path.join(this._workspacePath, model.path);
			const content = FsSync.readFileSync(absolutePath, "utf-8");
			return JSON5.parse(content) as GenericModel;
		} catch {
			return undefined;
		}
	};

	resolveResource = (resource: WorkspaceResource): Uint8Array | undefined => {
		if (!this._resourcesPath) {
			return undefined;
		}
		try {
			const absolutePath = Path.join(this._resourcesPath, resource.path);
			return new Uint8Array(FsSync.readFileSync(absolutePath));
		} catch {
			return undefined;
		}
	};

	add(result: InternalMigrationResult): void {
		if (result.type !== "success") {
			return;
		}
		if (result.sideResources) {
			for (const r of result.sideResources) {
				this._sideResources.set(r.hash, r);
			}
		}
		if (result.sideModels) {
			for (const m of result.sideModels) {
				this._sideModels.set(m.path, m);
			}
		}
		if (result.deletedModels) {
			for (const id of result.deletedModels) {
				const found = this.models.find((m) => m.header.id === id);
				if (found) {
					this._modelDeletions.add(found.path);
				}
			}
		}
		if (result.deletedResources) {
			for (const name of result.deletedResources) {
				this._resourceDeletions.add(name);
			}
		}
	}

	async saveSideResources(logger: Logger): Promise<void> {
		if (!this._resourcesPath || this._sideResources.size === 0) {
			return;
		}
		let saved = 0;
		for (const resource of this._sideResources.values()) {
			const targetPath = Path.join(this._resourcesPath, resource.path);
			try {
				await Fs.mkdir(Path.dirname(targetPath), { recursive: true });
				await Fs.writeFile(targetPath, resource.content);
				logger.info("Saved resource: " + resource.path);
				saved++;
			} catch (error) {
				logger.error(`Failed to save resource ${resource.path}: ${error}`);
			}
		}
		logger.log(`\n${saved}/${this._sideResources.size} resource(s) saved to ${toRelativePath(this._resourcesPath)}`);
	}

	async saveSideModels(logger: Logger): Promise<void> {
		if (!this._workspacePath || this._sideModels.size === 0) {
			return;
		}
		let saved = 0;
		for (const model of this._sideModels.values()) {
			const targetPath = Path.join(this._workspacePath, model.path);
			try {
				await Fs.mkdir(Path.dirname(targetPath), { recursive: true });
				await Fs.writeFile(targetPath, JSON.stringify(model.model, undefined, "\t"));
				logger.info("Saved model: " + model.path);
				saved++;
			} catch (error) {
				logger.error(`Failed to save model ${model.path}: ${error}`);
			}
		}
		logger.log(`\n${saved}/${this._sideModels.size} model(s) saved to ${toRelativePath(this._workspacePath)}`);
	}

	async deleteMarkedModels(logger: Logger): Promise<void> {
		if (!this._workspacePath || this._modelDeletions.size === 0) {
			return;
		}
		let deleted = 0;
		for (const relativePath of this._modelDeletions) {
			const absolutePath = Path.join(this._workspacePath, relativePath);
			try {
				await Fs.rm(absolutePath, { force: true });
				logger.info("Deleted model: " + relativePath);
				deleted++;
			} catch (error) {
				logger.error(`Failed to delete model ${relativePath}: ${error}`);
			}
		}
		logger.log(`\n${deleted}/${this._modelDeletions.size} model(s) deleted from workspace`);
	}

	async deleteMarkedResources(logger: Logger): Promise<void> {
		if (!this._resourcesPath || this._resourceDeletions.size === 0) {
			return;
		}
		let deleted = 0;
		for (const relativePath of this._resourceDeletions) {
			const absolutePath = Path.join(this._resourcesPath, relativePath);
			try {
				await Fs.rm(absolutePath, { force: true });
				logger.info("Deleted resource: " + relativePath);
				deleted++;
			} catch (error) {
				logger.error(`Failed to delete resource ${relativePath}: ${error}`);
			}
		}
		logger.log(`\n${deleted}/${this._resourceDeletions.size} resource(s) deleted from workspace`);
	}
}
