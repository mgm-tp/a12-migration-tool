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

import Path from "node:path";

import { describe, it, test } from "vitest";

import { FIXTURES_PATH, given } from "./assertions.js";

describe("configurable", () => {
	test("basic", () => {
		given()
			.file("<models-dir>/basic/v30.0.0-1.json")
			.when.exec(
				`configurable-page-model-migration --config ./page-model-migration.config.ts <models-dir>/basic/v30.0.0-1.json`,
				{
					cwd: Path.join(FIXTURES_PATH, "user-configs/ts")
				}
			)
			.then.exitCode.should.beEqualZero()
			.and.directory.should.matchSnapshot()
			.and.stdout.should.matchSnapshot()
			.start();
	});

	test("upgrade version with skip post migration", () => {
		given()
			.file("<models-dir>/basic/v30.0.0-2.json")
			.when.exec(`configurable-page-model-migration <models-dir>/basic/v30.0.0-2.json`)
			.then.exitCode.should.beEqualZero()
			.and.directory.should.matchSnapshot()
			.and.stdout.should.matchSnapshot()
			.start();
	});

	test("help", () => {
		given()
			.file("<models-dir>/basic/v30.0.0-1.json")
			.when.exec(`configurable-page-model-migration --help`, {
				cwd: Path.join(FIXTURES_PATH, "user-configs/ts")
			})
			.then.exitCode.should.beEqualZero()
			.and.stdout.should.matchSnapshot()
			.start();
	});

	describe("config", () => {
		describe("when the config argument is not given", () => {
			describe("when having a TS config file in the working dir", () => {
				it("should load that file", () => {
					given()
						.when.exec(`configurable-page-model-migration <models-dir>/basic/v30.0.0-1.json`, {
							cwd: Path.join(FIXTURES_PATH, "user-configs/ts")
						})
						.and.stdout.should.match(
							`Reading config file: <TEST_DIR>/fixtures/user-configs/ts/page-model-migration.config.ts`
						)
						.start();
				});
			});

			describe("when having a JS config file in the working dir", () => {
				it("should load that file", () => {
					given()
						.when.exec(`configurable-page-model-migration <models-dir>/basic/v30.0.0-1.json`, {
							cwd: Path.join(FIXTURES_PATH, "user-configs/js")
						})
						.and.stdout.should.match(
							`Reading config file: <TEST_DIR>/fixtures/user-configs/js/page-model-migration.config.js`
						)
						.start();
				});
			});

			describe("when having both TS and JS config files in the working dir", () => {
				it("should load the TS file", () => {
					given()
						.when.exec(`configurable-page-model-migration <models-dir>/basic/v30.0.0-1.json`, {
							cwd: Path.join(FIXTURES_PATH, "user-configs/both")
						})
						.and.stdout.should.match(
							`Reading config file: <TEST_DIR>/fixtures/user-configs/both/page-model-migration.config.ts`
						)
						.start();
				});
			});

			describe("when having a TS file with `.mts` extension in the working dir", () => {
				it("should load that file", () => {
					given()
						.when.exec(
							`configurable-page-model-migration --config page-model-migration.config.mts <models-dir>/basic/v30.0.0-1.json`,
							{
								cwd: Path.join(FIXTURES_PATH, "user-configs/ts/ESM")
							}
						)
						.and.stdout.should.match(
							`Reading config file: <TEST_DIR>/fixtures/user-configs/ts/ESM/page-model-migration.config.mts`
						)
						.start();
				});
			});

			describe("when having a TS file with `.cts` extension in the working dir", () => {
				it("should load that file", () => {
					given()
						.when.exec(
							`configurable-page-model-migration --config page-model-migration.config.cts <models-dir>/basic/v30.0.0-1.json`,
							{
								cwd: Path.join(FIXTURES_PATH, "user-configs/ts/CJS")
							}
						)
						.and.stdout.should.match(
							`Reading config file: <TEST_DIR>/fixtures/user-configs/ts/CJS/page-model-migration.config.cts`
						)
						.start();
				});
			});

			describe("when having no config file in the working dir", () => {
				it("should not throw error", () => {
					given()
						.file("<models-dir>/basic/v30.0.0-1.json")
						.when.exec(`configurable-page-model-migration <models-dir>/basic/v30.0.0-1.json`, {
							cwd: Path.join(FIXTURES_PATH, "user-configs/empty")
						})
						.exitCode.should.beEqualZero()
						.and.directory.should.matchSnapshot()
						.and.stdout.should.matchSnapshot()
						.start();
				});
			});
		});

		describe("when the config argument is given", () => {
			describe("when the path is relative", () => {
				it("should resolve regarding to the working dir", () => {
					given()
						.when.exec(
							`configurable-page-model-migration --config ./ts/page-model-migration.config.ts <models-dir>/basic/v30.0.0-1.json`,
							{
								cwd: Path.join(FIXTURES_PATH, "user-configs")
							}
						)
						.and.stdout.should.match(
							`Reading config file: <TEST_DIR>/fixtures/user-configs/ts/page-model-migration.config.ts`
						)
						.start();
				});
			});

			describe("when the path is absolute", () => {
				it("should resolve correctly", () => {
					given()
						.when.exec(
							`configurable-page-model-migration --config <TEST_DIR>/fixtures/user-configs/ts/page-model-migration.config.ts <models-dir>/basic/v30.0.0-1.json`
						)
						.and.stdout.should.match(
							`Reading config file: <TEST_DIR>/fixtures/user-configs/ts/page-model-migration.config.ts`
						)
						.start();
				});
			});

			describe("when the path is not exist", () => {
				it("should throw error", () => {
					given()
						.file("<models-dir>/basic/v30.0.0-1.json")
						.when.exec(
							`configurable-page-model-migration --config ./fixtures/migration-unknown.config.ts <models-dir>/basic/v30.0.0-1.json`
						)
						.then.exitCode.should.not.beEqualZero()
						.and.stderr.should.match(
							`The configuration file <TEST_DIR>/fixtures/migration-unknown.config.ts is not exist`
						)
						.start();
				});
			});
		});
	});
});
