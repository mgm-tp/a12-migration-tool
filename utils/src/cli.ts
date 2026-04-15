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

import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import { main as compile } from "./commands/compile/main.js";
import { generateStep } from "./commands/generate-step.js";
import { validateConsistency } from "./commands/validate-consistency.js";
import { validateOfficialVersion } from "./commands/validate-official-version.js";
import { parseConfig } from "./utils.js";

const argv = yargs(hideBin(process.argv))
	.usage("Usage: $0 <command> [options]")
	.command("compile", "Compile JSON schemas and all source files", (y) => {
		return y.option("schema", {
			description: "Enable or disable generation of JSON schemas",
			type: "boolean",
			default: true,
			nargs: 0
		});
	})
	.command("generate-step", "Create a new step interactively")
	.command("validate-official-version", "Validate the latest step is an official version for final release")
	.command(
		"validate-consistency",
		"Validate the model definition in the latest step model is matched the one in core module"
	)
	.option("config", {
		alias: "c",
		type: "string",
		description:
			"Path to the config file. If not specified, the tool will look for 'migration-tool.config.json' file in the current working directory"
	})
	.demandCommand(1, 1)
	.help("help")
	.locale("en")
	.parseSync();

async function main() {
	const config = await parseConfig(argv.config);

	if (argv._.includes("compile")) {
		await compile({ ...config, schema: !!argv["schema"] });
	} else if (argv._.includes("generate-step")) {
		// istanbul ignore next
		await generateStep(config);
	} else if (argv._.includes("validate-official-version")) {
		await validateOfficialVersion(config);
	} else if (argv._.includes("validate-consistency")) {
		await validateConsistency({ ...config, schema: true });
	} else {
		throw new Error("Unknown command. Got: " + argv._);
	}
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
