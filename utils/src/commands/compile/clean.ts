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
import * as Path from "node:path";

import { INDEX_FILE_NAME, SCHEMA_FILE_NAME } from "../../constants.js";
import type { ResolvedConfiguration } from "../../types.js";

export async function clean(config: ResolvedConfiguration, options?: { force: boolean }): Promise<void> {
	const { stepsDirPath } = config;
	const schemaFilePaths = config.schema
		? (await Fs.readdir(stepsDirPath, { withFileTypes: true }))
				.filter((version) => version.isDirectory())
				.map((version) => Path.join(stepsDirPath, version.name, SCHEMA_FILE_NAME))
		: [];

	for (const filePath of [...schemaFilePaths, Path.join(stepsDirPath, INDEX_FILE_NAME)]) {
		try {
			await Fs.unlink(filePath);
		} catch (error: any) {
			if (!options?.force || error.code !== "ENOENT") {
				throw error;
			}
		}
	}
}
