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
import * as Os from "node:os";
import * as Path from "node:path";
import * as Process from "node:process";

import betterAjvErrors from "better-ajv-errors";
import { glob } from "glob";
import JSON5 from "json5";

import {
	InternalMigrationResult,
	type MessageResolver,
	MigrationResultAccumulator,
	migrateModel
} from "../../core/shared.js";

import { toRelativePath } from "./cli-utils.js";
import { CLIWorkspace } from "./cli-workspace.js";
import type { CLIMigrationParameters } from "./types.js";

const cliMessageResolver: MessageResolver = {
	resolve(result: InternalMigrationResult, modelLabel: string): string {
		let message = "";

		if (result.message) {
			message += result.message;
		}

		if (result.details) {
			if (typeof result.details === "string") {
				message += "\n" + result.details;
			} else {
				const { schema, model, errors } = result.details;
				const errorMessages = betterAjvErrors(schema, model, errors, { format: "js", indent: 2 });

				message += "\n" + errorMessages.map((errorMessage) => JSON.stringify(errorMessage, null, 2)).join("\n");
			}
		}

		return message.replace(/\$0/g, modelLabel);
	}
};

/** @internal */
export async function migrateCLI(params: CLIMigrationParameters): Promise<void> {
	let parameters = params;
	const cwd = Process.cwd();
	const accumulator = new MigrationResultAccumulator();
	const { logger, modelType } = parameters;

	logger.log(createBanner(modelType));

	if (parameters.enabledWorkspace && !parameters.workspace && !parameters.resources) {
		const candidateRoots = new Set<string>();
		for (const path of parameters.paths) {
			const absolutePath = Path.resolve(cwd, path);
			try {
				const stat = await Fs.stat(absolutePath);
				if (stat.isDirectory()) {
					candidateRoots.add(absolutePath);
				} else if (stat.isFile()) {
					candidateRoots.add(Path.dirname(absolutePath));
				}
			} catch {
				// Path does not exist; will be caught later in the main loop
			}
		}
		if (candidateRoots.size === 1) {
			const [autoDetectedRoot] = candidateRoots;
			parameters = { ...parameters, workspace: Path.relative(cwd, autoDetectedRoot) || "." };
			logger.info(`Auto-detected workspace from input path: ${toRelativePath(autoDetectedRoot)}`);
		}
	}

	// Scan workspace if --workspace or --resources flag is provided
	let workspace: CLIWorkspace | undefined;
	if (parameters.enabledWorkspace && (parameters.workspace || parameters.resources)) {
		const workspacePath = parameters.workspace ? Path.resolve(cwd, parameters.workspace) : undefined;
		const resourcesPath = parameters.resources ? Path.resolve(cwd, parameters.resources) : workspacePath;
		const activeRootPath = workspacePath ?? resourcesPath ?? cwd;
		workspace = new CLIWorkspace({ workspacePath, resourcesPath });
		await workspace.scan(logger);
		logger.log(`\nWorkspace: ${toRelativePath(activeRootPath)}`);
	}

	const deletedModelPaths: string[] = [];

	for (const path of parameters.paths) {
		const absolutePath = Path.resolve(cwd, path);

		try {
			const stat = await Fs.stat(absolutePath);

			if (stat.isFile()) {
				(await processFile(absolutePath, false, parameters, workspace, deletedModelPaths))
					.logTo(logger, cliMessageResolver, toRelativePath(absolutePath))
					.addTo(accumulator);
				continue;
			}

			if (stat.isDirectory()) {
				accumulator.add(await processDirectory(absolutePath, parameters, workspace, deletedModelPaths));
				continue;
			}

			/* istanbul ignore next */
			InternalMigrationResult.Error(`$0 is not a file nor a directory`)
				.logTo(logger, cliMessageResolver, toRelativePath(absolutePath))
				.addTo(accumulator);
		} catch (error) {
			InternalMigrationResult.Error(`$0 may not exist`)
				.logTo(logger, cliMessageResolver, toRelativePath(absolutePath))
				.addTo(accumulator);
		}
	}

	// Save side results
	if (workspace) {
		await workspace.saveSideResources(logger);
		await workspace.saveSideModels(logger);
		await workspace.deleteMarkedModels(logger);
		await workspace.deleteMarkedResources(logger);
	}

	// Delete models marked for deletion
	if (deletedModelPaths.length > 0) {
		let deleted = 0;
		for (const filePath of deletedModelPaths) {
			try {
				await Fs.rm(filePath, { force: true });
				logger.info("Deleted model file: " + toRelativePath(filePath));
				deleted++;
			} catch (error) {
				logger.error(`Failed to delete model file ${toRelativePath(filePath)}: ${error}`);
			}
		}
		logger.log(`\n${deleted}/${deletedModelPaths.length} model(s) deleted`);
	}

	logger.log("\n\n" + accumulator.summarize());

	if (accumulator.hasErrors) {
		throw new Error("Migration failed");
	}
}

function createBanner(modelType: string) {
	const content = ` ${modelType} Migration Tool `.toUpperCase();

	return [`-`.repeat(content.length), content, `-`.repeat(content.length)].join("\n");
}

async function processDirectory(
	directoryPath: string,
	parameters: CLIMigrationParameters,
	workspace: CLIWorkspace | undefined,
	deletedModelPaths: string[]
): Promise<MigrationResultAccumulator> {
	const { logger, modelType, extension } = parameters;
	logger.log(`\nMigrating all ${modelType} models in directory ${toRelativePath(directoryPath)}`);

	const accumulator = new MigrationResultAccumulator();

	// Glob expects an "/" as separator, therefore it makes more sense to always replace OS default separator as "/"
	const pattern = Path.join(directoryPath, "**", `*.${extension}`).split(Path.sep).join("/");
	for await (const filePath of await glob(pattern, { ignore: "**/node_modules/**" })) {
		(await processFile(filePath, true, parameters, workspace, deletedModelPaths))
			.logTo(logger, cliMessageResolver, toRelativePath(filePath))
			.addTo(accumulator);
	}

	return accumulator;
}

async function processFile(
	absolutePath: string,
	directoryMode: boolean,
	parameters: CLIMigrationParameters,
	workspace: CLIWorkspace | undefined,
	deletedModelPaths: string[]
): Promise<InternalMigrationResult> {
	try {
		const { modelType, logger, backup, modelAttributeAccessor } = parameters;
		const model = JSON5.parse(await Fs.readFile(absolutePath, "utf-8"));

		if (directoryMode && !modelAttributeAccessor.isTargetModel(model)) {
			return InternalMigrationResult.Ignore(`\nIgnore $0 because it is not a(n) ${modelType} model file`);
		}

		logger.log(`\nReading ${toRelativePath(absolutePath)}`);

		if (backup) {
			logger.info("Creating backup");
			await Fs.copyFile(absolutePath, `${absolutePath}_bak`);
		}

		const result = migrateModel({ ...parameters, model, workspace });
		workspace?.add(result);

		if (result.type === "success") {
			if (result.isDeleted) {
				deletedModelPaths.push(absolutePath);
			}
			// Always write the migrated model — other steps may still read it; deletions are applied after all steps complete.
			await Fs.writeFile(absolutePath, `${JSON.stringify(result.getMigratedModel(), undefined, 2)}${Os.EOL}`);
		}

		return result;
	} catch (error) {
		return InternalMigrationResult.Error(`$0 is not a valid ${parameters.extension} file`, String(error));
	}
}
