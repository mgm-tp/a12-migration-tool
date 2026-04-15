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

import * as ChildProcess from "node:child_process";
import * as FsSync from "node:fs";
import * as Fs from "node:fs/promises";
import * as Path from "node:path";

import gitDiff from "git-diff";
import parallelLimit, { Task } from "run-parallel-limit";

import { CHECK_MARK, SCHEMA_FILE_NAME, VERSION_PREFIX } from "../../constants.js";
import { ResolvedConfiguration } from "../../types.js";
import { getLatestVersion } from "../../utils.js";

type CompileTask = (callback: FsSync.NoParamCallback) => void;

export async function validateLatestSchema(config: ResolvedConfiguration) {
	const latestVersion = `${VERSION_PREFIX}${await getLatestVersion(config)}`;
	const latestSchemaPath = Path.join(config.stepsDirPath, latestVersion, SCHEMA_FILE_NAME);
	const referenceSchemaPath = Path.join(config.stepsDirPath, latestVersion, "schema.ref.json");

	await parallelLimitPromise([createCompileTask(latestVersion, config, referenceSchemaPath, true)], 1);

	const diff = gitDiff(await Fs.readFile(referenceSchemaPath, "utf-8"), await Fs.readFile(latestSchemaPath, "utf-8"), {
		color: false,
		noHeaders: true
	});

	if (diff !== undefined) {
		throw new Error(`Schema at ${latestSchemaPath} does not match against the generated one. \nDiff: ${diff}`);
	}

	await Fs.unlink(referenceSchemaPath);

	console.log(`${CHECK_MARK} Validated latest schema consistency!`);
}

export async function validateSchemas(config: ResolvedConfiguration) {
	for (const version of await Fs.readdir(config.stepsDirPath)) {
		if (!FsSync.lstatSync(Path.join(config.stepsDirPath, version)).isDirectory()) {
			continue;
		}

		if (!FsSync.existsSync(Path.join(config.stepsDirPath, version, SCHEMA_FILE_NAME))) {
			throw new Error(`Schema file for ${version} does not exist`);
		}
	}

	console.log(`${CHECK_MARK} Validated schema files existence!`);
}

export async function compileSchemas(config: ResolvedConfiguration) {
	const compileTasks: CompileTask[] = [];

	for (const version of await Fs.readdir(config.stepsDirPath)) {
		if (!FsSync.lstatSync(Path.join(config.stepsDirPath, version)).isDirectory()) {
			continue;
		}
		const schemaFilePath = Path.join(config.stepsDirPath, version, SCHEMA_FILE_NAME);
		if (FsSync.existsSync(schemaFilePath)) {
			console.log(`Schema file for ${version} already exists`);
			continue;
		}
		compileTasks.push(createCompileTask(version, config));
	}

	await parallelLimitPromise(compileTasks, 4);

	console.log("Compiled JSON schemas successfully!");
}

function createCompileTask(
	version: string,
	resolvedConfig: ResolvedConfiguration,
	output?: string,
	silent?: boolean
): CompileTask {
	return (callback) => {
		try {
			if (!silent) {
				console.log(`Compiling JSON schema for ${version}`);
			}

			const modelFilePath = Path.join(resolvedConfig.stepsDirPath, version, resolvedConfig.stepModelFileName);
			if (!FsSync.existsSync(modelFilePath)) {
				callback(new Error(`Model file ${modelFilePath} does not exist`));
				return;
			}

			const config = {
				tsconfig: resolvedConfig.tsConfigPath,
				type: resolvedConfig.modelInterfaceName(version.replace(VERSION_PREFIX, "")),
				path: Path.join(resolvedConfig.stepsDirPath, version, resolvedConfig.stepModelFileName),
				output: output ?? Path.join(resolvedConfig.stepsDirPath, version, SCHEMA_FILE_NAME)
			};

			const childProcess = ChildProcess.spawn("node", [
				Path.join(import.meta.dirname, "compile-schema"),
				config.path,
				config.tsconfig,
				config.type,
				config.output
			]);

			childProcess.stderr.on("data", (error) => {
				console.error(Buffer.from(error).toString());
				callback(error);
			});

			childProcess.on("close", () => callback(null));
		} catch (error) {
			callback(error as any);
		}
	};
}

function parallelLimitPromise<T>(tasks: Task<T>[], limit: number): Promise<void> {
	return new Promise((resolve, reject) => {
		parallelLimit(tasks, limit, (error) => {
			if (error) {
				reject(error);
			} else {
				resolve();
			}
		});
	});
}
