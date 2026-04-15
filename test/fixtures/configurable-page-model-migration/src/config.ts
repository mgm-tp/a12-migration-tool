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

import { isModelInstance } from "@com.mgmtp.a12.base/base-model-api/lib/main/model/index.js";
import { GenericModel, MigrationParameters } from "@com.mgmtp.a12.migrationtool/migrationtool-core/types";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { MIGRATION_STEPS } from "./steps/index.js";
import { PageModel } from "./steps/version-30.0.0/page-model.js";

function isRequiredMigrate(model: PageModel) {
	return model.content.numberField > 40;
}

export const MIGRATION_CONFIG: MigrationParameters = {
	modelType: "page",
	minimumSupportedVersion: "30.0.0",
	migrationSteps: MIGRATION_STEPS,
	postMigration: {
		isRequired: (model) => isPageModel(model) && isRequiredMigrate(model),
		migrate: (model, context) => {
			if (!isPageModel(model)) {
				throw new Error("Model is not a page model");
			}

			if (!isRequiredMigrate(model)) {
				return { status: "skip", skipMessage: "Model is not a page model", model };
			}

			const { userConfig = { multiplier: 2 } } = context;

			context.logger.info(JSON.stringify(userConfig, null, 2));

			if (
				!!userConfig &&
				typeof userConfig === "object" &&
				"multiplier" in userConfig &&
				typeof userConfig.multiplier === "number"
			) {
				return {
					status: "success",
					model: {
						...model,
						content: {
							...model.content,
							numberField: model.content.numberField * userConfig.multiplier
						}
					}
				};
			}

			throw new Error("Additional config is missing or invalid");
		}
	}
};

function isPageModel(model: GenericModel): model is PageModel {
	if (!isModelInstance(model)) {
		return false;
	}

	return model.header.modelType === "page";
}
