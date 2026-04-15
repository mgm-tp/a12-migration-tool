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
	MessageResolver,
	MigrationResultAccumulator,
	migrateModel
} from "../../core/shared.js";

import { CLIMigrationParameters } from "./types.js";

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
export async function migrateCLI(parameters: CLIMigrationParameters): Promise<void> {
	const cwd = Process.cwd();
	const accumulator = new MigrationResultAccumulator();
	const { logger, modelType } = parameters;

	logger.log(createBanner(modelType));

	for (const path of parameters.paths) {
		const absolutePath = Path.resolve(cwd, path);

		try {
			const stat = await Fs.stat(absolutePath);

			if (stat.isFile()) {
				(await processFile(absolutePath, false, parameters))
					.logTo(logger, cliMessageResolver, toRelativePath(absolutePath))
					.addTo(accumulator);
				continue;
			}

			if (stat.isDirectory()) {
				accumulator.add(await processDirectory(absolutePath, parameters));
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

	logger.log("\n\n" + accumulator.summarize());

	if (accumulator.hasErrors) {
		throw new Error("Migration failed");
	}
}

function toRelativePath(absolutePath: string): string {
	return Path.relative(Process.cwd(), absolutePath);
}

function createBanner(modelType: string) {
	const content = ` ${modelType} Migration Tool `.toUpperCase();

	return [`-`.repeat(content.length), content, `-`.repeat(content.length)].join("\n");
}

async function processDirectory(
	directoryPath: string,
	parameters: CLIMigrationParameters
): Promise<MigrationResultAccumulator> {
	const { logger, modelType, extension } = parameters;
	logger.log(`\nMigrating all ${modelType} models in directory ${toRelativePath(directoryPath)}`);

	const accumulator = new MigrationResultAccumulator();

	// Glob expects an "/" as separator, therefore it makes more sense to always replace OS default separator as "/"
	const pattern = Path.join(directoryPath, "**", `*.${extension}`).split(Path.sep).join("/");
	for await (const filePath of await glob(pattern, { ignore: "/**/node_modules/**" })) {
		(await processFile(filePath, true, parameters))
			.logTo(logger, cliMessageResolver, toRelativePath(filePath))
			.addTo(accumulator);
	}

	return accumulator;
}

async function processFile(
	absolutePath: string,
	directoryMode: boolean,
	parameters: CLIMigrationParameters
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

		const result = migrateModel({ ...parameters, model });

		if (result.type === "success") {
			await Fs.writeFile(absolutePath, `${JSON.stringify(result.getMigratedModel(), undefined, 2)}${Os.EOL}`);
		}

		return result;
	} catch (error) {
		return InternalMigrationResult.Error(`$0 is not a valid ${parameters.extension} file`, String(error));
	}
}
