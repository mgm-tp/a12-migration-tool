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

import * as TsJsonSchemaGenerator from "ts-json-schema-generator";

const [path, tsconfig, type, output] = process.argv.slice(2);

const config: TsJsonSchemaGenerator.Config = { path, tsconfig, type };

try {
	const schema = TsJsonSchemaGenerator.createGenerator(config).createSchema(config.type);
	Fs.mkdirSync(Path.dirname(output), { recursive: true });
	Fs.writeFileSync(output, JSON.stringify(schema, null, 2));
} catch (error) {
	if (error instanceof Error && "diagnostic" in error) {
		const ts = (await import("typescript")).default;
		const diagnostic = error.diagnostic as import("typescript").Diagnostic;
		const allDiagnostics = [diagnostic, ...(diagnostic.relatedInformation ?? [])];
		console.error(
			ts.formatDiagnostics(allDiagnostics, {
				getCanonicalFileName: (fileName) => fileName,
				getCurrentDirectory: () => "",
				getNewLine: () => "\n"
			})
		);
	} else {
		console.error(error instanceof Error ? error.message : error);
	}
	process.exit(1);
}
