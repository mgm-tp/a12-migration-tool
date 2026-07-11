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

import chalk from "chalk";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import { createDefaultModelAttributeAccessor } from "../../core/shared.js";
import type { Logger, MigrationParameters } from "../../types.js";

import { loadUserConfig } from "./load-user-config.js";
import { migrateCLI } from "./process.js";
import type { CLIMigrationOptions } from "./types.js";

const yargsInstance = yargs(hideBin(process.argv));

/** @public */
export function createMigrationCLI(params: MigrationParameters) {
	const {
		commandName,
		modelType,
		extension = "json",
		modelAttributeAccessor = createDefaultModelAttributeAccessor(modelType)
	} = params;

	const configFileTemplate = `${params.modelType.toLowerCase()}-model-migration.config`;

	let builder = (commandName ? yargsInstance.scriptName(commandName) : yargsInstance)
		.usage(
			"Usage: $0 <paths> [options]\n" +
				`<paths> can be specified as a list of files or a folder that will be searched for ${modelType} model files`
		)
		.demandCommand(1)
		.option("backup", {
			alias: "b",
			description: "Backup models before migration",
			type: "boolean",
			nargs: 0,
			default: false
		})
		.option("debug", {
			alias: "d",
			description: "Print debug output",
			type: "boolean",
			nargs: 0,
			default: false
		})
		.option("next", {
			alias: "n",
			description: "Migrate only to the next version, not further",
			type: "boolean",
			nargs: 0,
			default: false
		})
		.option("force", {
			alias: "f",
			description: "Force migration even if the model has 'do-not-migrate' annotation",
			type: "boolean",
			nargs: 0,
			default: false
		})
		.option("help", {
			alias: "h",
			type: "boolean",
			nargs: 0,
			default: false
		})
		.option("config", {
			alias: "c",
			description: "Path to the configuration file",
			defaultDescription: `<cwd>/${configFileTemplate}.[tj]s`,
			hidden: !params.postMigration,
			type: "string"
		})
		.option("validate-schema", {
			description: "Enable or disable validation of models against the JSON schemas",
			type: "boolean",
			default: true,
			nargs: 0
		});

	if (params.enabledWorkspace) {
		builder = builder
			.option("workspace", {
				alias: "w",
				description: "Path to the workspace directory for model and resource lookup (if --resources is not specified)",
				type: "string"
			})
			.option("resources", {
				description:
					"Path to the resources directory for resource lookup and side result output (defaults to workspace path)",
				type: "string"
			});
	}

	if (params.cliOptions) {
		for (const [key, opts] of Object.entries(params.cliOptions)) {
			builder = builder.option(key, opts);
		}
	}
	const argv = builder.locale("en").parseSync();

	const options: CLIMigrationOptions = {
		...argv,
		paths: (isExecutedByElectron() ? argv._.slice(1) : argv._).map(String),
		nextOnly: argv.next,
		workspace: params.enabledWorkspace ? (argv.workspace as string | undefined) : undefined,
		resources: params.enabledWorkspace ? (argv.resources as string | undefined) : undefined
	};

	const logger = createCLILogger(options.debug);

	loadMaybeUserConfig().then((fileConfig) => {
		const isCliArgument = (key: string): key is Extract<keyof typeof argv, string> => key in argv;
		const isConfigObject = (value: unknown): value is Record<string, unknown> =>
			typeof value === "object" && value !== null && !Array.isArray(value);

		const customValues = params.cliOptions
			? Object.keys(params.cliOptions).reduce<Record<string, unknown>>((acc, key) => {
					const camelKey = key.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
					if (isCliArgument(camelKey)) {
						acc[key] = argv[camelKey];
					}
					return acc;
				}, {})
			: undefined;

		const userConfig = customValues
			? { ...(isConfigObject(fileConfig) ? fileConfig : {}), ...customValues }
			: fileConfig;

		migrateCLI({
			...options,
			...params,
			logger,
			extension,
			userConfig,
			modelAttributeAccessor
		}).catch(() => process.exit(1));
	});

	async function loadMaybeUserConfig() {
		if (!params.postMigration) {
			return undefined;
		}

		return loadUserConfig(configFileTemplate, argv.config as string | undefined, logger);
	}
}

const isExecutedByElectron = () => {
	// This variable built_with_electron = 1 when it runs in Electron Environment
	return (process.config.variables as { [key: string]: number | boolean | string }).built_with_electron;
};

function createCLILogger(debug: boolean): Logger {
	return {
		log: (text) => {
			console.log(text);
		},
		error(text: string) {
			console.log(chalk.red(text));
		},
		info(text: string) {
			if (debug) {
				console.log(chalk.blue(text));
			}
		}
	};
}
