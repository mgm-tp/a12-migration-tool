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

/* istanbul ignore file */

import * as Fs from "node:fs/promises";
import * as Path from "node:path";
import { pathToFileURL } from "node:url";

import inquirer from "inquirer";
import * as Semver from "semver";
import { IndentationText, Project } from "ts-morph";

import { TRANSFORM_FILE_NAME, VERSION_PREFIX } from "../constants.js";
import type { ResolvedConfiguration } from "../types.js";
import { getLatestVersion, isOfficialVersion } from "../utils.js";

export async function generateStep(config: ResolvedConfiguration) {
	const { versionChoices, latestVersion } = await createScenario(config);

	const { nextVersion } = await inquirer.prompt([
		{
			type: "list",
			name: "nextVersion",
			message: `Which model version would you like to create? The current version is ${latestVersion}`,
			choices: versionChoices
		}
	]);

	let hasTransformFile = false;
	if (!isOfficialVersion(nextVersion)) {
		const transformAnswers = await inquirer.prompt([
			{
				type: "confirm",
				name: "hasTransformFile",
				message: "Do you want to create a transform file?",
				default: false
			}
		]);
		hasTransformFile = transformAnswers.hasTransformFile;
	}

	await createNewStep({ nextVersion, hasTransformFile }, config);

	console.log("Created new step successfully! Please run command 'migration-tool-utils compile' again.");
}

/** @internal */
export async function createScenario(config: ResolvedConfiguration) {
	const latestVersion = await getLatestVersion(config);
	const availableVersions = getNextVersions(latestVersion);

	const versionChoices = availableVersions.map((version) => ({
		name: version,
		value: version
	}));

	return { versionChoices, latestVersion };
}

/** @internal */
export function getNextVersions(latestVersion: string): string[] {
	const semver = new Semver.SemVer(latestVersion);

	if (semver.prerelease && semver.prerelease[0] === "pre") {
		return [semver.inc("prerelease", "pre").format(), Semver.coerce(semver.version)?.version ?? ""];
	}

	return [
		semver.inc("preminor", "pre").inc("prerelease", "pre").format(),
		semver.inc("premajor", "pre").inc("prerelease", "pre").format()
	];
}

/** @internal */
export interface GenerateStepAnswers {
	nextVersion: string;
	hasTransformFile?: boolean;
}

/** @internal */
export async function createNewStep(answers: GenerateStepAnswers, config: ResolvedConfiguration): Promise<void> {
	if (!config.referenceModelPath) {
		throw new Error("Can not create new step without specifying reference model path!");
	}

	const { nextVersion, hasTransformFile } = answers;
	const latestVersion = await getLatestVersion(config);

	const newStepDir = Path.join(config.stepsDirPath, `${VERSION_PREFIX}${nextVersion}`);
	await Fs.mkdir(newStepDir);

	const project = new Project({ manipulationSettings: { indentationText: IndentationText.Tab } });

	const newStepModelPath = Path.join(newStepDir, config.stepModelFileName);
	const modelNameForImport = Path.parse(config.stepModelFileName).name;

	/**
	 * Re-export the latest model in official version
	 */
	if (isOfficialVersion(nextVersion)) {
		await Fs.writeFile(newStepModelPath, "");

		project.addSourceFileAtPath(newStepModelPath).addExportDeclaration({
			isTypeOnly: true,
			moduleSpecifier: `../${VERSION_PREFIX}${latestVersion}/${modelNameForImport}.js`
		});

		await project.save();
		return;
	}

	/**
	 * Copy the current model
	 */
	await Fs.copyFile(config.referenceModelPath, newStepModelPath);

	project.addSourceFileAtPath(newStepModelPath);
	const newStepModelFile = project.addSourceFileAtPath(newStepModelPath);
	if (config.adjustModelFuncPath) {
		const sourceModelAdjuster = await import(pathToFileURL(config.adjustModelFuncPath).href);
		sourceModelAdjuster.default(newStepModelFile);
	}

	if (!hasTransformFile) {
		await project.save();
		return;
	}

	/**
	 * Create new transform function/file
	 */
	await Fs.writeFile(Path.join(newStepDir, TRANSFORM_FILE_NAME), "");

	const transformFile = project.addSourceFileAtPath(Path.join(newStepDir, TRANSFORM_FILE_NAME));

	transformFile.addImportDeclarations([
		{ namespaceImport: "OldModel", moduleSpecifier: `../${VERSION_PREFIX}${latestVersion}/${modelNameForImport}.js` },
		{ namespaceImport: "NewModel", moduleSpecifier: `./${modelNameForImport}.js` }
	]);

	transformFile
		.addFunction({
			name: "transform",
			isDefaultExport: true,
			parameters: [{ name: "oldModel", type: `OldModel.${config.modelInterfaceName(latestVersion)}` }],
			returnType: `NewModel.${config.modelInterfaceName(nextVersion)}`
		})
		.setBodyText(`throw new Error("Not implemented");`);

	await project.save();
}
