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

import * as Path from "node:path";

import ts from "typescript";

import { ResolvedConfiguration } from "../../types.js";

/*
 * ===== BEGIN THIRD-PARTY SOURCE: [TypeScript] (https://github.com/microsoft/TypeScript),
 * [https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API#a-minimal-compiler]
 * Licensed under the Apache-2.0 License.
 * Copyright (c) Microsoft Corporation
 * Modified by mgm technology partners on [2023-08-29].
 */
export function compileSources({ tsConfigPath }: ResolvedConfiguration): void {
	console.log(`\nCompiling source files...`);

	const configFile = ts.readConfigFile(tsConfigPath, ts.sys.readFile);
	const parsedConfig = ts.parseJsonConfigFileContent(configFile.config, ts.sys, Path.dirname(tsConfigPath));

	const program = ts.createProgram(parsedConfig.fileNames, parsedConfig.options);
	const diagnostics = ts.getPreEmitDiagnostics(program).concat(program.emit().diagnostics);

	diagnostics.forEach((diagnostic) => {
		const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");

		if (diagnostic.file && diagnostic.start) {
			const { line, character } = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start);
			console.error(`${diagnostic.file.fileName}:${line + 1}:${character + 1} - ${message}`);
		} else {
			console.error(message);
		}
	});

	if (diagnostics.length > 0) {
		throw new Error("TypeScript compilation failed");
	}

	console.log(`Compiled source files successfully!`);
}
// ===== END THIRD-PARTY SOURCE =====
