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

/** @public */
export type GenericModel = object;

// ──────────────────────────────────────────────
// Workspace types
// ──────────────────────────────────────────────

/** @public - Minimum A12 model header fields needed for workspace lookup */
export interface ModelHeader {
	readonly id: string;
	readonly modelType: string;
	readonly modelVersion: string;
	readonly [key: string]: unknown;
}

/** @public - A resource (non-model file) in the workspace */
export interface WorkspaceResource {
	/** File name or relative path of the resource, e.g. "logo.png" */
	readonly path: string;
	/** SHA-256 hex hash of the file content, used for deduplication */
	readonly hash: string;
}

/** @public - A model (JSON with A12 header) in the workspace */
export interface WorkspaceModel {
	/** The model header (id, modelType, modelVersion, etc.) */
	readonly header: ModelHeader;
	/** Relative path to the model file in the workspace */
	readonly path: string;
}

/** @public - Workspace input containing models and resources */
export interface Workspace {
	/** Models (JSON files with A12 header) in the workspace */
	readonly models: WorkspaceModel[];
	/** Resources (non-model files) in the workspace */
	readonly resources: WorkspaceResource[];
	/** Resolve the full model object. CLI: fs.readFileSync, SME: from store */
	readonly resolveModel?: (model: WorkspaceModel) => GenericModel | undefined;
	/** Resolve resource binary content. CLI: fs.readFileSync, SME: from store/blob */
	readonly resolveResource?: (resource: WorkspaceResource) => Uint8Array | undefined;
}

/** @public - Input for creating a side result resource */
export interface SideResultResourceInput {
	/** Original file name or relative path, e.g. `"logo.png"` or `"assets/logo.png"` */
	readonly originalName: string;
	/** Binary content of the resource */
	readonly content: Uint8Array;
	/**
	 * File name or relative path where this resource should be written, e.g. `"assets/logo.png"`.
	 * Defaults to `"{originalBaseName}_{hash8}.{extension}"`. Use the `generateResourceName` and `sha256Hex` utilities to generate reproducible names.
	 * Be aware that if this is set, the automatic deduplication of files with the same content is not possible anymore.
	 */
	readonly path?: string;
}

/** @public - Input for creating a side result model */
export interface SideResultModelInput {
	/** The model object, already at the current/target version */
	readonly model: GenericModel;
	/**
	 * File name or relative path where this model should be written, e.g. `"Model.json"`.
	 * Defaults to `"{model.header.id}.json"`.
	 */
	readonly path?: string;
}

/** @public - A generated resource as a side result of migration */
export interface SideResultResource {
	/**
	 * File name or relative path of the resource.
	 * Defaults to `"{originalBaseName}_{hash8}.{extension}"`, e.g. `"logo_a1b2c3d4.png"`.
	 */
	readonly path: string;
	/** Binary content of the resource */
	readonly content: Uint8Array;
	/** Original file name or relative path as provided in the input, e.g. `"logo.png"` */
	readonly originalName: string;
	/** SHA-256 hex hash of the content */
	readonly hash: string;
}

/** @public - A generated model as a side result of migration */
export interface SideResultModel {
	/** The model object */
	readonly model: GenericModel;
	/** File name or relative path within the workspace where this model should be written */
	readonly path: string;
}

/** @public - Context passed to migration steps for workspace access and side result creation */
export interface MigrationStepContext {
	/** Workspace with existing models and resources (if available) */
	readonly workspace?: Workspace;
	/** User-provided configuration (from config file or CLI options), if any */
	readonly userConfig?: unknown;

	// ── Find (lightweight references) ──
	/** Find a resource in the workspace by its relative path */
	findResource(path: string): WorkspaceResource | undefined;
	/** Find a model in the workspace by its ID */
	findModel(id: string): WorkspaceModel | undefined;

	// ── Resolve (full data, delegates to workspace callbacks) ──
	/** Resolve full model object. Returns `undefined` if no `resolveModel` callback is configured. */
	resolveModel(model: WorkspaceModel): GenericModel | undefined;
	/** Resolve resource binary content. Returns `undefined` if no `resolveResource` callback is configured. */
	resolveResource(resource: WorkspaceResource): Uint8Array | undefined;

	// ── Mutations ──
	/**
	 * Add a resource file as a side result of migration.
	 * The SHA-256 hash is always computed from the content and used for deduplication.
	 * The name defaults to `"{originalBaseName}_{hash8}.{extension}"` if not provided.
	 * If the same content already exists in the workspace or was already added, the existing entry is returned.
	 */
	addResource(input: SideResultResourceInput): SideResultResource;
	/**
	 * Add a JSON model as a side result of migration.
	 * The name defaults to `"{id}.json"` if not provided.
	 * If a model at the same path was already added in this run, the existing entry is returned.
	 * If a model at the same path exists in the workspace, it will be overwritten.
	 */
	addModel(input: SideResultModelInput): SideResultModel;
	/** Mark the currently migrating model for deletion. Works without a workspace. */
	deleteCurrentModel(reason?: string): void;
	/** Queue a workspace model for deletion by its ID. Requires a workspace. */
	deleteModel(id: string, reason?: string): void;
	/** Queue a workspace resource for deletion by its path. Requires a workspace. */
	deleteResource(path: string, reason?: string): void;
}

// ──────────────────────────────────────────────
// Migration step & parameters
// ──────────────────────────────────────────────

/** @public */
export interface MigrationStep {
	readonly version: string;
	isMigrated?(model: GenericModel, context?: MigrationStepContext): boolean;
	transform?(model: GenericModel, logger: Logger, context?: MigrationStepContext): GenericModel;
	schema?: any;
}

/** @public */
export interface MigrationParameters {
	readonly commandName?: string;
	readonly modelType: string;
	readonly migrationSteps: MigrationStep[];
	readonly minimumSupportedVersion?: string;
	readonly deprecationMessage?: string;
	readonly extension?: string;
	readonly modelAttributeAccessor?: ModelAttributeAccessor;
	readonly postMigration?: PostMigrationConfiguration;
	readonly userConfig?: unknown;
	/**
	 * Enables workspace support: registers the `--workspace` and `--resources` CLI options
	 * and forwards a `Workspace` to migration steps. Defaults to `false`.
	 */
	readonly enabledWorkspace?: boolean;

	readonly cliOptions?: Record<
		string,
		{
			description: string;
			type: "boolean" | "string" | "number";
			default?: unknown;
			alias?: string;
		}
	>;
}

// ──────────────────────────────────────────────
// Migration tool & results
// ──────────────────────────────────────────────

/**
 * @public
 * Base interface for A12 Migration tools
 */
export interface MigrationTool {
	migrate: (models: object[], workspace?: Workspace) => MigrationResult[];
}

/**
 * @public
 * Possible results of a migration
 */
export type MigrationResult =
	| {
			status: "success";
			model: object;
			sideResources?: SideResultResource[];
			sideModels?: SideResultModel[];
			isDeleted?: boolean;
			deletedModels?: string[];
			deletedResources?: string[];
	  }
	| { status: "skip"; model: object; skipMessage: string }
	| { status: "error"; model: object; errorMessage: string };

// ──────────────────────────────────────────────
// Post-migration
// ──────────────────────────────────────────────

export interface PostMigrationConfiguration {
	isRequired(model: GenericModel, context: PostMigrationContext): boolean;
	migrate(model: GenericModel, context: PostMigrationContext): MigrationResult;
}

export interface PostMigrationContext extends MigrationStepContext {
	readonly userConfig?: unknown;
	readonly logger: Logger;
}

// ──────────────────────────────────────────────
// Model attribute accessor
// ──────────────────────────────────────────────

/** @public */
export interface ModelAttributeAccessor {
	isTargetModel(model: GenericModel): boolean;
	isIgnoredModel?(model: GenericModel): boolean;
	getId(model: GenericModel): string;
	getVersion(model: GenericModel): string;
	setVersion(model: GenericModel, version: string): GenericModel;
}

/** @internal */
export interface ResolvedMigrationParameters extends MigrationParameters {
	readonly modelAttributeAccessor: ModelAttributeAccessor;
	readonly extension: string;
	readonly logger: Logger;
}

// ──────────────────────────────────────────────
// Logger
// ──────────────────────────────────────────────

/** @public */
export interface Logger {
	log(text: string): void;
	info(text: string): void;
	error(text: string): void;
}
