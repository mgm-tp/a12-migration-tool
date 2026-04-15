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

import { ModelUtils, createDefaultModelAttributeAccessor, migrateModel } from "../../core/shared.js";
import { GenericModel, Logger, MigrationParameters, MigrationResult, MigrationTool } from "../../types.js";

/** @public */
export function createMigrationTool(parameters: MigrationParameters): MigrationTool {
	const migrate = createMigrationAdapter(parameters);

	return { migrate: (models) => models.map(migrate) };
}

function createMigrationAdapter(parameters: MigrationParameters) {
	return (model: GenericModel): MigrationResult => {
		const {
			modelType,
			extension = "json",
			modelAttributeAccessor = createDefaultModelAttributeAccessor(modelType)
		} = parameters;

		const logger = createBrowserLogger(modelType);

		logger.log(`Migrating model with id '${modelAttributeAccessor.getId(model)}'`);

		const result = migrateModel({
			...parameters,
			extension,
			modelAttributeAccessor,
			model: ModelUtils.deepClone(model),
			logger,
			validateSchema: true
		});

		const modelId = modelAttributeAccessor.getId(model);

		switch (result.type) {
			case "success":
				return { status: "success", model: result.getMigratedModel() };
			case "error":
				return { status: "error", model, errorMessage: result.resolveMessage(`Model ${modelId}`) };
			case "skip":
				return { status: "skip", model, skipMessage: result.resolveMessage(`Model ${modelId}`) };
			default:
				throw new Error("Unknown migration result type");
		}
	};
}

function createBrowserLogger(modelType: string): Logger {
	const prefix = `[${modelType[0].toUpperCase() + modelType.slice(1)} Migration Tool]`;

	return {
		log(text) {
			console.log(prefix, text);
		},
		error(text) {
			console.error(prefix, text);
		},
		info(text) {
			console.info(prefix, text);
		}
	};
}
