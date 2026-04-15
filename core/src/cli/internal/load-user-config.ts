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

import * as Fs from "node:fs";
import * as Path from "node:path";

// @ts-expect-error no need to have type
import transformAssets from "babel-plugin-transform-assets-import-to-string";
import { createJiti } from "jiti";

import { Logger } from "../../types.js";

const SUPPORT_CONFIG_FILE_EXTENSIONS = ["ts", "mts", "cts", "js", "mjs", "cjs"];
export async function loadUserConfig(
	template: string,
	configFilePath: string | undefined,
	logger: Logger
): Promise<unknown> {
	const cwd = process.cwd();
	const absolutePath = configFilePath
		? Path.resolve(cwd, configFilePath)
		: findDefaultConfigFile(template, cwd, logger);

	if (absolutePath && Fs.existsSync(absolutePath)) {
		logger.info(`Loading configuration file from ${absolutePath}`);

		return loadFile(absolutePath);
	}

	if (configFilePath) {
		throw new Error(`The configuration file ${absolutePath} is not exist`);
	}

	return undefined;
}

function findDefaultConfigFile(template: string, cwd: string, logger: Logger): string | undefined {
	for (const ext of SUPPORT_CONFIG_FILE_EXTENSIONS) {
		const filePath = Path.resolve(cwd, `${template}.${ext}`);
		logger.info(`Looking for configuration file at ${filePath}`);

		if (Fs.existsSync(filePath)) {
			return filePath;
		}
	}

	return undefined;
}

async function loadFile(filePath: string): Promise<unknown> {
	const absolutePath = Path.resolve(filePath);

	try {
		const jiti = createJiti(import.meta.url, {
			interopDefault: true,
			jsx: true,
			extensions: [".js", ".mjs", ".cjs", ".ts", ".tsx", ".mts", ".cts", ".svg"],
			transformOptions: { babel: { plugins: [transformAssets] } }
		});

		return await jiti.import(absolutePath, { default: true });
	} catch (error) {
		console.error(`Failed to load config file from "${absolutePath}":`, (error as Error).message);
		throw error;
	}
}
