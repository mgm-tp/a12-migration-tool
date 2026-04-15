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

import Fs from "node:fs/promises";
import Path from "node:path";

import notice from "eslint-plugin-notice";

import { strict } from "@com.mgmtp.a12.devtools/eslint-config";

const license = await Fs.readFile(Path.join(import.meta.dirname, "license_header.txt"), "utf-8");

export default [
	...strict,
	{
		name: "root/ignores",
		ignores: [
			"**/node_modules",
			"**/target",
			"**/lib",
			"**/bin",
			"**/dist",
			"**/build",
			"**/steps/index.ts",
			".pnpmfile.cjs",
			"copyright.js"
		]
	},
	{
		name: "root/base",
		languageOptions: {
			parserOptions: {
				tsconfigRootDir: import.meta.dirname
			}
		},
		plugins: {
			notice
		},
		rules: {
			"no-inner-declarations": "off",
			"@typescript-eslint/no-namespace": "off",
			"@typescript-eslint/no-explicit-any": "warn",
			"@typescript-eslint/no-empty-function": "warn",
			"@typescript-eslint/no-empty-interface": "warn",
			"sort-imports": [
				"error",
				{
					ignoreDeclarationSort: true
				}
			],
			"notice/notice": ["error", { template: license, onNonMatchingHeader: "replace", chars: license.length }],
			"@typescript-eslint/no-unused-vars": [
				"warn",
				{
					ignoreRestSiblings: true
				}
			],
			"no-restricted-imports": [
				"error",
				{
					patterns: ["../**/internal/*", "@com.mgmtp.a12*/**/src/**", "@com.mgmtp.a12*/**/internal/**"]
				}
			],
			"import/no-extraneous-dependencies": "error",
			"import/order": [
				"error",
				{
					groups: ["builtin", "external", "internal", "parent", "sibling", "index"],
					pathGroups: [
						{
							pattern: "../**",
							group: "parent",
							position: "after"
						}
					],
					"newlines-between": "always",
					alphabetize: {
						order: "asc",
						caseInsensitive: true
					}
				}
			]
		}
	},
	{
		name: "core",
		files: ["./core/src/**"],
		rules: {
			"import/no-nodejs-modules": "error"
		}
	},
	{
		name: "core/overrides",
		files: ["./core/src/cli/**"],
		rules: {
			"import/no-nodejs-modules": "off"
		}
	}
];
