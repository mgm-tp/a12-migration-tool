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

import { MigrationResult } from "@com.mgmtp.a12.base/base-model-migration-api/lib/main/migration-tool/index.js";

/** @public */
export type GenericModel = object;

/** @public */
export interface MigrationStep {
	readonly version: string;
	transform?(model: GenericModel, logger: Logger): GenericModel;
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
}

export interface PostMigrationConfiguration {
	isRequired(model: GenericModel, context: PostMigrationContext): boolean;
	migrate(model: GenericModel, context: PostMigrationContext): MigrationResult;
}

export interface PostMigrationContext {
	readonly userConfig?: unknown;
	readonly logger: Logger;
}

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

/** @public */
export interface Logger {
	log(text: string): void;
	info(text: string): void;
	error(text: string): void;
}

/**
 * Re-export types from the base-model-migration-api package.
 * So that consumers of this package don't have to install the base-model-migration-api package directly
 * @public
 */
export { MigrationTool } from "@com.mgmtp.a12.base/base-model-migration-api/lib/main/migration-tool/index.js";
export { MigrationResult };
