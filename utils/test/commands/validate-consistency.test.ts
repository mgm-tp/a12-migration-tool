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

import * as Fs from "fs";
import * as Path from "path";

import { describe, expect, test } from "vitest";

import { FIXTURES_DIR, execute } from "../utils.js";

describe("validate-consistency", () => {
	test("should exit 0 when the latest version is official and matches the reference model", () => {
		const { exitCode, stdout } = execute(`migration-tool-utils validate-consistency`);

		expect(exitCode).toEqual(0);
		expect(stdout).toMatchSnapshot("stdout");
	});

	test("should exit 0 when the latest version is an pre and matches the reference model", () => {
		const { exitCode } = execute(`migration-tool-utils validate-consistency`, "latest-pre-minor");

		expect(exitCode).toEqual(0);
	});

	test("should exit non zero when inconsistent without adjusted model function", () => {
		const { exitCode, stderr } = execute(
			`migration-tool-utils validate-consistency`,
			"inconsistent-without-model-adjustment"
		);

		expect(exitCode).not.toEqual(0);
		expect(stderr).toMatch("Inconsistency between models");
		expect(stderr).toMatch(
			`
export interface Model {
 	readonly numberField: number;
 	readonly stringField?: string;
-	readonly booleanField: boolean;
 }
 `.trim()
		);
	});

	test("should exit non zero when the latest version is re-exported and not match with the reference model", () => {
		const { exitCode, stderr } = execute(
			`migration-tool-utils validate-consistency`,
			"inconsistent-with-latest-official-step"
		);

		expect(exitCode).not.toEqual(0);
		expect(stderr).toMatch("Inconsistency between models");
		expect(stderr).toMatch(
			`
export interface Model {
 	readonly numberField: number;
 	readonly booleanField: BooleanType;
-	readonly stringField: string;
 }
 `.trim()
		);
	});

	test("should exit non zero when inconsistent with adjusted model function", () => {
		const { exitCode, stderr } = execute(
			`migration-tool-utils validate-consistency`,
			"inconsistent-with-model-adjustment"
		);

		expect(exitCode).not.toEqual(0);
		expect(stderr).toMatch("Inconsistency between models");
		expect(stderr).toMatch(
			`
export interface Model {
 	readonly numberField: number;
 	readonly booleanField: BooleanType;
-	readonly stringField: string;
 }
 `.trim()
		);
	});

	test("should exit 0 when schema files exist, index file is synchronized and model files are consistent", () => {
		const { stdout, stderr, exitCode } = execute(
			`migration-tool-utils validate-consistency`,
			"with-persistent-schema-flag"
		);

		expect(exitCode).toEqual(0);
		expect(stdout).toMatchSnapshot("stdout");
		expect(stderr).toMatchSnapshot("stderr");
	});

	test("should exit non zero when missing schema file and enabling persistentSchema", () => {
		const { exitCode, stderr } = execute(
			`migration-tool-utils validate-consistency`,
			"missing-schema-with-persistent-schema-flag"
		);

		expect(exitCode).not.toEqual(0);
		expect(stderr).toMatch("Schema file for version-31.0.0 does not exist");
	});

	test("should exit non zero when index file asynchronous and enabling persistentSchema", () => {
		const { exitCode, stderr } = execute(
			`migration-tool-utils validate-consistency`,
			"asynchronous-index-file-with-persistent-schema-flag"
		);

		expect(exitCode).not.toEqual(0);
		expect(stderr).toMatch(/Error: Inconsistency in .*src[/\\]steps[/\\]index\.ts/);
	});

	test("should exit non zero when the latest schema file inconsistent and enabling persistentSchema", () => {
		const fixtureName = "inconsistent-latest-schema-with-persistent-schema-flag";
		const fixtureDir = Path.join(FIXTURES_DIR, fixtureName);
		const schemaReferenceFilePath = Path.join(fixtureDir, "src/steps/version-32.0.0/schema.ref.json");

		expect(Fs.existsSync(schemaReferenceFilePath)).toEqual(false);

		const { exitCode, stderr } = execute(`migration-tool-utils validate-consistency`, fixtureName);

		expect(exitCode).not.toEqual(0);
		expect(stderr).toMatch(/Error: Schema at .*[/\\]schema\.json does not match against the generated one/);

		expect(Fs.existsSync(schemaReferenceFilePath)).toEqual(true);

		Fs.unlinkSync(schemaReferenceFilePath);

		expect(Fs.existsSync(schemaReferenceFilePath)).toEqual(false);
	});
});
