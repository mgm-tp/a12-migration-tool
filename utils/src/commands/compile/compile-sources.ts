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

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import * as Path from "node:path";

import type { ResolvedConfiguration } from "../../types.js";

/**
 * Absolute path of the `tsc` the package being compiled brings along. Resolved
 * through `typescript/package.json`, the one subpath TypeScript 7 exports —
 * `typescript/bin/tsc` is not in its `exports` map and throws
 * `ERR_PACKAGE_PATH_NOT_EXPORTED` there, while resolving fine under 6.
 */
function resolveTsc(cwd: string): string {
	const require = createRequire(Path.join(cwd, "package.json"));
	const packagePath = require.resolve("typescript/package.json");
	const { bin } = JSON.parse(readFileSync(packagePath, "utf8")) as {
		bin: { tsc: string };
	};

	return Path.join(Path.dirname(packagePath), bin.tsc);
}

export function compileSources({ tsConfigPath }: ResolvedConfiguration): void {
	console.log(`\nCompiling source files...`);

	try {
		// tsc reports diagnostics on stdout; this command has always put them on
		// stderr, so both of the child's streams go there.
		execFileSync(process.execPath, [resolveTsc(process.cwd()), "--project", tsConfigPath], {
			stdio: ["inherit", process.stderr, process.stderr]
		});
	} catch {
		throw new Error("TypeScript compilation failed");
	}

	console.log(`Compiled source files successfully!`);
}
