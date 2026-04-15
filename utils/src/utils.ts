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
import path from "node:path";
import * as Process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

import { Ajv } from "ajv";
import betterAjvErrors from "better-ajv-errors";
import Semver from "semver";

import { INDEX_FILE_NAME, TRANSFORM_FILE_NAME, VERSION_PREFIX } from "./constants.js";
import { ResolvedConfiguration, Configuration as UserConfiguration } from "./types.js";

/** @internal */
export async function parseConfig(configPath: string | undefined): Promise<ResolvedConfiguration> {
	const absoluteConfigPath = resolvePath(configPath ?? "migration-tool.config.json", Process.cwd());
	const configFileDirPath = Path.dirname(absoluteConfigPath);

	const userConfig = await validateConfig(JSON.parse(await Fs.readFile(absoluteConfigPath, "utf8")));
	const {
		tsConfigPath,
		modelInterfaceName,
		adjustModelFuncPath,
		referenceModelPath,
		stepsDirPath = "./src/internal/steps",
		...rest
	} = userConfig;

	const resolvedTsConfigPath = resolvePath(tsConfigPath ?? "tsconfig.json", configFileDirPath);

	return {
		...rest,
		modelInterfaceName: (version) => resolveModelInterfaceName(version, modelInterfaceName),
		adjustModelFuncPath: adjustModelFuncPath ? resolvePath(adjustModelFuncPath, configFileDirPath) : undefined,
		referenceModelPath: referenceModelPath ? resolvePath(referenceModelPath, configFileDirPath) : undefined,
		stepsDirPath: resolvePath(stepsDirPath, configFileDirPath),
		tsConfigPath: resolvedTsConfigPath
	};
}

function resolveModelInterfaceName(
	version: string,
	modelInterfaceName: UserConfiguration["modelInterfaceName"]
): string {
	if (typeof modelInterfaceName === "string") {
		return modelInterfaceName;
	}

	for (const [versionRange, targetModelInterfaceName] of modelInterfaceName) {
		if (Semver.satisfies(version, versionRange, { includePrerelease: true })) {
			return targetModelInterfaceName;
		}
	}

	throw new Error(`Can not resolve model interface name for version ${version}`);
}

export function resolvePath(path: string, basePath: string): string {
	return Path.resolve(basePath, path);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function validateConfig(config: object): Promise<UserConfiguration> {
	const configSchemaPath = pathToFileURL(Path.join(__dirname, "..", "config.schema.json")).href;
	const configSchema = await import(configSchemaPath, { with: { type: "json" } });
	const validate = new Ajv().compile(configSchema.default);

	if (!validate(config) && validate.errors) {
		console.error(betterAjvErrors(configSchema, config, validate.errors, { format: "js", indent: 2 }));
		throw new Error("Invalid migration tool config");
	}

	return config as UserConfiguration;
}

export function isOfficialVersion(version: string): boolean {
	return Semver.coerce(version)?.version === version;
}

export async function getLatestVersion(config: ResolvedConfiguration) {
	const stepInfos = await extractStepInfos(config);

	return stepInfos.map(({ version }) => version).sort(Semver.compare)[stepInfos.length - 1];
}

export interface StepInfo {
	version: string;
	transform?: boolean;
	shouldAppendNewline?: boolean;
}

export async function extractStepInfos(config: ResolvedConfiguration): Promise<StepInfo[]> {
	const stepInfos: StepInfo[] = [];

	for (const subDirName of await Fs.readdir(config.stepsDirPath)) {
		if (!FsSync.lstatSync(Path.join(config.stepsDirPath, subDirName)).isDirectory()) {
			continue;
		}

		const version = subDirName.replace(VERSION_PREFIX, "");
		if (!subDirName.startsWith(VERSION_PREFIX) || !Semver.valid(version)) {
			throw new Error(
				`Sub directory of steps directory must follow the pattern ${VERSION_PREFIX}<version>. Got: ${subDirName}`
			);
		}

		const stepInfo: StepInfo = { version };
		const transformFilePath = Path.join(config.stepsDirPath, subDirName, TRANSFORM_FILE_NAME);
		if (FsSync.existsSync(transformFilePath) && (await Fs.stat(transformFilePath)).isFile()) {
			stepInfo.transform = true;
		}

		stepInfos.push(stepInfo);
	}

	stepInfos.sort((x, y) => Semver.compare(x.version, y.version));

	return stepInfos.map((stepInfo, stepInfoIndex) => {
		const previousStepInfo = stepInfos[stepInfoIndex - 1];

		if (previousStepInfo && isOfficialVersion(previousStepInfo.version)) {
			return { ...stepInfo, shouldAppendNewline: true };
		}

		return stepInfo;
	});
}

export function getIndexFilePath(config: ResolvedConfiguration) {
	return Path.join(config.stepsDirPath, INDEX_FILE_NAME);
}
