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

import * as Fs from "node:fs/promises";
import * as Path from "node:path";

import gitDiff from "git-diff";
import { Project } from "ts-morph";

import { CHECK_MARK, VERSION_PREFIX } from "../constants.js";
import { ResolvedConfiguration } from "../types.js";
import { extractStepInfos } from "../utils.js";

import { validateLatestSchema, validateSchemas } from "./compile/compile-schemas.js";
import { validateIndexFile } from "./compile/generate-index-file.js";

export async function validateConsistency(config: ResolvedConfiguration): Promise<void> {
	await validateModelConsistency(config);

	if (config.persistentSchema) {
		await validateSchemas(config);
		await validateIndexFile(config);
		await validateLatestSchema(config);
	}
}

async function resolveLatestDefinedStep(config: ResolvedConfiguration) {
	const stepInfos = await extractStepInfos(config);
	const project = new Project();

	for (const stepInfo of [...stepInfos].reverse()) {
		const modelPath = Path.join(config.stepsDirPath, `${VERSION_PREFIX}${stepInfo.version}`, config.stepModelFileName);
		const modelFile = project.addSourceFileAtPath(modelPath);
		if (
			modelFile.getExportDeclarations().some((exportDeclaration) => {
				return exportDeclaration.getModuleSpecifier()?.getFullText().includes("version-");
			})
		) {
			continue;
		}

		return stepInfo.version;
	}

	// istanbul ignore next
	throw new Error("Can not find latest defined step!");
}

async function validateModelConsistency(config: ResolvedConfiguration) {
	const latestVersion = await resolveLatestDefinedStep(config);

	if (!config.referenceModelPath) {
		throw new Error("Can not validate model consistency without specifying reference model path!");
	}

	const coreModel = new Project().addSourceFileAtPath(config.referenceModelPath);
	if (config.adjustModelFuncPath) {
		const sourceModelAdjuster = await import(config.adjustModelFuncPath);
		sourceModelAdjuster.default(coreModel);
	}

	const latestStepModelPath = Path.join(
		config.stepsDirPath,
		`${VERSION_PREFIX}${latestVersion}`,
		config.stepModelFileName
	);
	const latestStepModel = await Fs.readFile(latestStepModelPath, "utf-8");

	const diff = gitDiff(removeCopyright(coreModel.getFullText()), removeCopyright(latestStepModel), {
		color: false,
		noHeaders: true
	});

	if (diff !== undefined) {
		throw new Error(
			`Inconsistency between models ${config.referenceModelPath} and ${latestStepModelPath}. \nDifference: ${diff}`
		);
	}

	console.log(`${CHECK_MARK} Validated model consistency!`);
}

function removeCopyright(text: string): string {
	return text.replace(/\/\*[\s\S]*copyright[^]*?\*\//g, "").trimStart();
}
