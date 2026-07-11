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

import type { GenericModel, Logger, ResolvedMigrationParameters, Workspace } from "../../types.js";

import { InternalMigrationResult } from "./migration-result.js";
import { createMigrationStepContext } from "./migration-step-context.js";
import { MigratorUtils } from "./migration-utils.js";
import { ModelUtils } from "./model-utils.js";

/** @internal */
export function migrateModel(
	params: ResolvedMigrationParameters & {
		model: GenericModel;
		logger: Logger;
		nextOnly?: boolean;
		force?: boolean;
		validateSchema?: boolean;
		workspace?: Workspace;
	}
): InternalMigrationResult {
	const { migrationSteps, logger, nextOnly, modelType, modelAttributeAccessor, workspace } = params;

	const {
		context,
		getOptionalSideResources,
		getOptionalSideModels,
		getOptionalIsDeleted,
		getOptionalDeletedModels,
		getOptionalDeletedResources
	} = createMigrationStepContext({
		logger,
		workspace,
		userConfig: params.userConfig
	});

	let model = ModelUtils.deepClone(params.model);

	try {
		const validationResult = ModelUtils.validateModel(model, params, context);

		if (validationResult instanceof InternalMigrationResult) {
			return validationResult;
		}

		const capableMigrationSteps = MigratorUtils.findCapableMigrationSteps(
			modelAttributeAccessor.getVersion(model),
			migrationSteps,
			!!nextOnly,
			logger,
			modelType
		);

		if (capableMigrationSteps.length === 0) {
			if (!params.postMigration?.migrate) {
				return InternalMigrationResult.Error("Model $0 can not be migrated since no migration steps were found");
			}
		} else {
			capableMigrationSteps.forEach((step) => {
				if (step.isMigrated?.(model, context)) {
					logger.info(`Skipping step ${step.version} — model already migrated`);
					return;
				}
				logger.info(`Migrating to version ${step.version}`);
				if (step.transform) {
					model = step.transform(model, logger, context);
				}
				model = modelAttributeAccessor.setVersion(model, step.version);
			});
		}

		if (!params.postMigration?.migrate) {
			return InternalMigrationResult.Success(
				`Migrated model $0 successfully`,
				model,
				getOptionalSideResources(),
				getOptionalSideModels(),
				getOptionalIsDeleted(),
				getOptionalDeletedModels(),
				getOptionalDeletedResources()
			);
		}

		const postMigrationResult = params.postMigration.migrate(model, {
			...params,
			...context
		});

		if (postMigrationResult.status === "success") {
			return InternalMigrationResult.Success(
				`Migrated model $0 successfully`,
				postMigrationResult.model,
				getOptionalSideResources(),
				getOptionalSideModels(),
				getOptionalIsDeleted(),
				getOptionalDeletedModels(),
				getOptionalDeletedResources()
			);
		}

		if (postMigrationResult.status === "skip") {
			// It still can be a case when only the general model is migrated
			return InternalMigrationResult.Success(
				`Migrated model $0 successfully`,
				postMigrationResult.model,
				getOptionalSideResources(),
				getOptionalSideModels(),
				getOptionalIsDeleted(),
				getOptionalDeletedModels(),
				getOptionalDeletedResources()
			);
		}

		if (postMigrationResult.status === "error") {
			return InternalMigrationResult.Error(postMigrationResult.errorMessage);
		}

		throw new Error(`Unknown post migration result type: ${postMigrationResult}`);
	} catch (error) {
		logger.error(String(error));
		return InternalMigrationResult.Error(String(error));
	}
}
