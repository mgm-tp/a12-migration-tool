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

import type { Logger, MigrationStepContext } from "@com.mgmtp.a12.migrationtool/migrationtool-core/types";

import type { WorkspaceAssetModel } from "../version-2.0.0-alpha.1/workspace-asset-model.js";

export default function transform(
	model: WorkspaceAssetModel,
	logger: Logger,
	context?: MigrationStepContext
): WorkspaceAssetModel {
	if (model.content.title === "DELETE_ME") {
		context?.deleteCurrentModel("merged into another model");
		logger.info("Model marked for deletion: " + model.header.id);
	}

	if (model.content.extractedText === "REPLACE") {
		const otherModelIds = ["other-model-type", "other-model-type-delete"];
		const modelToExtractFrom = otherModelIds.map((id) => context?.findModel(id)).find(Boolean);
		if (modelToExtractFrom) {
			const resolvedModel = context?.resolveModel(modelToExtractFrom);
			const extractedText = (resolvedModel as Record<string, any>).content.data as string;
			logger.info("Extracted data from other model: " + extractedText);
			if ((resolvedModel as Record<string, any>).content.delete === "true") {
				context?.deleteModel(modelToExtractFrom.header.id, "data extracted into asset model");
				logger.info("Marked other model for deletion: " + modelToExtractFrom.header.id);
			}
			return { ...model, content: { ...model.content, extractedText } };
		}
	}

	if (model.content.extractToModel) {
		const newModelId = "extracted-model";
		context?.addModel({
			model: {
				header: {
					id: newModelId,
					modelType: "extracted",
					modelVersion: "1.0.0",
					locales: [],
					labels: [],
					modelReferences: [],
					annotations: []
				},
				content: { extractedFromModel: model.content.extractToModel }
			}
		});
		logger.info("Created side model: " + newModelId);
	}

	return model;
}
