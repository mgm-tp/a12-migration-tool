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

import { globSync } from "glob";
import { beforeAll, describe, expect, it } from "vitest";

import { FIXTURES_DIR, execute } from "../utils.js";

describe("Compile", () => {
	beforeAll(() => {
		[["lib"], ["schema.json"], ["steps", "index.ts"]].map((patterns) => {
			globSync(
				Path.join(FIXTURES_DIR, "**", ...patterns)
					.split(Path.sep)
					.join("/"),
				{ ignore: "**/*with-persistent-schema-flag/**" }
			).forEach((path) => Fs.rmSync(path, { recursive: true }));
		});
	});

	it("should work with basic case", () => {
		testCommand("basic", "lib");
	});

	it("should emit files in regard of tsconfig", () => {
		testCommand("with-advanced-ts-config", "lib");
	});

	it("should work with model interface mapping", () => {
		testCommand("with-model-interface-name-config", "lib");
	});

	it("should throw error when tsconfig file does not exist", () => {
		const { stderr, exitCode } = execute(`migration-tool-utils compile`, "missing-tsconfig-field");

		expect(exitCode).not.toEqual(0);
		expect(stderr).toMatch("Cannot read config file");
	});

	it("should throw error when migration-tool.config.json misses a required field", () => {
		const { stderr, exitCode } = execute(`migration-tool-utils compile`, "missing-required-field");

		expect(exitCode).not.toEqual(0);
		expect(stderr).toMatch("must have required property 'modelInterfaceName'");
	});

	it("should throw error when model interface mapping in migration-tool.config.json does not cover all versions", () => {
		const { stderr, exitCode } = execute(`migration-tool-utils compile`, "unresolved-version");

		expect(exitCode).not.toEqual(0);
		expect(stderr).toMatch("Can not resolve model interface name for version 30.1.0-pre.4");
	});

	it("should throw error when missing model file inside a step directory", () => {
		const { stderr, exitCode } = execute(`migration-tool-utils compile`, "missing-model");

		expect(exitCode).not.toEqual(0);
		expect(stderr).toMatch(/Error: Model file \S+\/model.ts does not exist/);
	});

	it("should throw error when having compilation errors", () => {
		const { stderr, exitCode } = execute(`migration-tool-utils compile`, "has-compile-errors");

		expect(exitCode).not.toEqual(0);
		expect(stderr).toMatch("Error: TypeScript compilation failed");
		expect(stderr).toMatch("Type 'string' is not assignable to type 'number'");
		expect(stderr).toMatch(
			"Cannot find module './version-30.0.0/schema.json'. Consider using '--resolveJsonModule' to import module with '.json' extension."
		);
	});

	it("should persist schema and index files when enabling persistentSchema", () => {
		testCommand("with-persistent-schema-flag", "src");
	});

	it("should generate new schema, index file and persist them when enabling persistentSchema", () => {
		const fixtureName = "missing-schema-with-persistent-schema-flag";
		const fixtureDir = Path.join(FIXTURES_DIR, fixtureName);
		const schemaFilePath = Path.join(fixtureDir, "src/steps/version-31.0.0/schema.json");
		const indexFilePath = Path.join(fixtureDir, "src/steps/index.ts");

		expect(Fs.existsSync(schemaFilePath)).toEqual(false);
		expect(Fs.existsSync(indexFilePath)).toEqual(false);

		testCommand(fixtureName, "src");

		expect(Fs.existsSync(schemaFilePath)).toEqual(true);
		expect(Fs.existsSync(indexFilePath)).toEqual(true);

		Fs.unlinkSync(schemaFilePath);
		Fs.unlinkSync(indexFilePath);
	});

	it("should not create new schema when passing no-schema", () => {
		testCommand("with-no-schema", "src", "--no-schema");
	});
});

function testCommand(fixtureName: string, outDir = "lib", ...options: string[]) {
	const fixtureDir = Path.join(FIXTURES_DIR, fixtureName);
	const { stdout, stderr, exitCode } = execute(`migration-tool-utils compile ${options.join(" ")}`, fixtureName);

	for (const path of readFilePaths(Path.join(fixtureDir, outDir))) {
		expect(Fs.readFileSync(path, "utf8")).toMatchSnapshot(Path.relative(fixtureDir, path));
	}

	expect(readFilePaths(fixtureDir, { relative: true })).toMatchSnapshot("workspaces");
	expect(stdout).toMatchSnapshot("stdout");
	expect(stderr).toMatchSnapshot("stderr");
	expect(exitCode).toEqual(0);
}

function readFilePaths(dirPath: string, options?: { relative: boolean }): string[] {
	return globSync(Path.join(dirPath, "**/*.*").split(Path.sep).join("/")).flatMap((filePath) => {
		if (Fs.lstatSync(filePath).isDirectory()) {
			return [];
		}

		return options?.relative ? Path.relative(dirPath, filePath) : filePath;
	});
}
