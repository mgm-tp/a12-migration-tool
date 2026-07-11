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

import { Ajv } from "ajv";
import * as Semver from "semver";

import type { GenericModel, MigrationStep, MigrationStepContext, ResolvedMigrationParameters } from "../../types.js";

import { type ErrorMessagePayload, InternalMigrationResult } from "./migration-result.js";
import { MigratorUtils } from "./migration-utils.js";

/** @internal */
export namespace ModelUtils {
	export function validateModel(
		model: GenericModel,
		parameters: ResolvedMigrationParameters & { force?: boolean; validateSchema?: boolean },
		context: MigrationStepContext
	): InternalMigrationResult | true {
		const { minimumSupportedVersion, modelType, migrationSteps, force, modelAttributeAccessor } = parameters;

		if (!modelAttributeAccessor.isTargetModel(model)) {
			return InternalMigrationResult.Error(`$0 is not a(n) ${modelType} model file`);
		}

		if (modelAttributeAccessor.isIgnoredModel?.(model) && !force) {
			return InternalMigrationResult.Skip(`Skip $0 because it has the 'do-not-migrate' annotation`);
		}

		const modelVersion = modelAttributeAccessor.getVersion(model);
		const latestVersion = MigratorUtils.getLatestVersion(migrationSteps);

		if (minimumSupportedVersion && Semver.lt(modelVersion, minimumSupportedVersion)) {
			const deprecationMessage = [
				`$0 has version ${modelVersion} which is lower than the minimum supported version ${minimumSupportedVersion}`,
				parameters.deprecationMessage ?? ""
			]
				.filter(Boolean)
				.join(". ");

			return InternalMigrationResult.Error(deprecationMessage);
		}

		if (Semver.gt(modelVersion, latestVersion)) {
			return InternalMigrationResult.Skip(`Skip $0 because its version is newer than the latest one`);
		}

		const currentVersionMigrator = findCurrentVersionMigrator(migrationSteps, modelVersion);
		if (!currentVersionMigrator) {
			return InternalMigrationResult.Error(`$0 has non-existent version ${modelVersion}`);
		}

		if (parameters.validateSchema) {
			const schemaError = validateSchema(model, currentVersionMigrator);
			if (schemaError !== null) {
				return InternalMigrationResult.Error(
					`$0 is not a valid ${modelType} model or can not be validated`,
					schemaError
				);
			}
		}

		if (parameters.postMigration?.isRequired?.(model, { ...parameters, ...context })) {
			return true;
		}

		if (Semver.eq(modelVersion, latestVersion)) {
			return InternalMigrationResult.Skip(`Skip $0 because it is up-to-date`);
		}

		return true;
	}

	function findCurrentVersionMigrator(migrators: MigrationStep[], modelVersion: string): MigrationStep | undefined {
		return migrators.find((migrator) => migrator.version === modelVersion);
	}

	const ajv = new Ajv();

	function validateSchema(model: GenericModel, migrator: MigrationStep): ErrorMessagePayload | null {
		const validate = ajv.compile(migrator.schema);

		if (!validate(model) && validate.errors) {
			return { schema: migrator.schema, errors: validate.errors, model: model };
		}

		return null;
	}

	export function deepClone(model: GenericModel): GenericModel {
		return JSON.parse(JSON.stringify(model));
	}
}
