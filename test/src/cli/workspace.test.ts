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

import { describe, test } from "vitest";

import { given } from "./assertions.js";

describe("workspace", () => {
	test("side result extraction with --workspace flag", () => {
		given()
			.file("<models-dir>/workspace/with-embedded-data.json")
			.when.exec(
				`workspace-asset-migration <models-dir>/workspace/with-embedded-data.json --workspace <models-dir>/workspace`
			)
			.then.exitCode.should.beEqualZero()
			.and.directory.should.matchSnapshot()
			.and.stdout.should.matchSnapshot()
			.start();
	});

	test("model deletion with --workspace flag", () => {
		given()
			.file("<models-dir>/workspace/to-be-deleted.json")
			.when.exec(
				`workspace-asset-migration <models-dir>/workspace/to-be-deleted.json --workspace <models-dir>/workspace`
			)
			.then.exitCode.should.beEqualZero()
			.and.directory.should.matchSnapshot()
			.and.stdout.should.matchSnapshot()
			.start();
	});

	test("side result extraction without --workspace flag", () => {
		given()
			.file("<models-dir>/workspace/with-embedded-data.json")
			.when.exec(`workspace-asset-migration <models-dir>/workspace/with-embedded-data.json`)
			.then.exitCode.should.beEqualZero()
			.and.directory.should.matchSnapshot()
			.and.stdout.should.matchSnapshot()
			.start();
	});

	test("dedup when resource already exists in workspace", () => {
		given()
			.file("<models-dir>/workspace/with-embedded-data.json")
			.file("<models-dir>/workspace/existing-data.bin")
			.when.exec(
				`workspace-asset-migration <models-dir>/workspace/with-embedded-data.json --workspace <models-dir>/workspace`
			)
			.then.exitCode.should.beEqualZero()
			.and.directory.should.matchSnapshot()
			.and.stdout.should.matchSnapshot()
			.start();
	});

	test("migration of model without embedded data", () => {
		given()
			.file("<models-dir>/workspace/no-embedded-data.json")
			.when.exec(
				`workspace-asset-migration <models-dir>/workspace/no-embedded-data.json --workspace <models-dir>/workspace`
			)
			.then.exitCode.should.beEqualZero()
			.and.directory.should.matchSnapshot()
			.and.stdout.should.matchSnapshot()
			.start();
	});

	test("side result extraction with --resources flag", () => {
		given()
			.file("<models-dir>/workspace/with-embedded-data.json")
			.when.exec(
				`workspace-asset-migration <models-dir>/workspace/with-embedded-data.json --workspace <models-dir>/workspace --resources <models-dir>/output`
			)
			.then.exitCode.should.beEqualZero()
			.and.directory.should.matchSnapshot()
			.and.stdout.should.matchSnapshot()
			.start();
	});

	test("dedup side results across two models with same embedded data", () => {
		given()
			.file("<models-dir>/workspace/with-embedded-data.json")
			.file("<models-dir>/workspace/with-embedded-data-duplicate.json")
			.when.exec(
				`workspace-asset-migration <models-dir>/workspace/with-embedded-data.json <models-dir>/workspace/with-embedded-data-duplicate.json --workspace <models-dir>/workspace`
			)
			.then.exitCode.should.beEqualZero()
			.and.directory.should.matchSnapshot()
			.and.stdout.should.matchSnapshot()
			.start();
	});

	test("dedup side results within a single model with duplicate embedded data", () => {
		given()
			.file("<models-dir>/workspace/with-duplicate-embedded-data.json")
			.when.exec(
				`workspace-asset-migration <models-dir>/workspace/with-duplicate-embedded-data.json --workspace <models-dir>/workspace`
			)
			.then.exitCode.should.beEqualZero()
			.and.directory.should.matchSnapshot()
			.and.stdout.should.matchSnapshot()
			.start();
	});

	test("dedup nested resource when already exists in workspace", () => {
		given()
			.file("<models-dir>/workspace/with-nested-embedded-data.json")
			.file("<models-dir>/workspace/data/nested/other-existing-data.bin")
			.when.exec(
				`workspace-asset-migration <models-dir>/workspace/with-nested-embedded-data.json --workspace <models-dir>/workspace`
			)
			.then.exitCode.should.beEqualZero()
			.and.directory.should.matchSnapshot()
			.and.stdout.should.matchSnapshot()
			.start();
	});

	test("resolveModel reads content from another model in workspace", () => {
		given()
			.file("<models-dir>/workspace/with-data-to-replace.json")
			.file("<models-dir>/workspace/models/nested/other-model-type.json")
			.when.exec(
				`workspace-asset-migration <models-dir>/workspace/with-data-to-replace.json --workspace <models-dir>/workspace`
			)
			.then.exitCode.should.beEqualZero()
			.and.directory.should.matchSnapshot()
			.and.stdout.should.matchSnapshot()
			.start();
	});

	test("resolveModel reads content and deletes source model when flagged", () => {
		given()
			.file("<models-dir>/workspace/with-data-to-replace.json")
			.file("<models-dir>/workspace/models/nested/other-model-type-delete.json")
			.when.exec(
				`workspace-asset-migration <models-dir>/workspace/with-data-to-replace.json --workspace <models-dir>/workspace`
			)
			.then.exitCode.should.beEqualZero()
			.and.directory.should.matchSnapshot()
			.and.stdout.should.matchSnapshot()
			.start();
	});

	test("addModel creates a side model in workspace", () => {
		given()
			.file("<models-dir>/workspace/with-extract-to-model.json")
			.when.exec(
				`workspace-asset-migration <models-dir>/workspace/with-extract-to-model.json --workspace <models-dir>/workspace`
			)
			.then.exitCode.should.beEqualZero()
			.and.directory.should.matchSnapshot()
			.and.stdout.should.matchSnapshot()
			.start();
	});

	test("auto-detect workspace from directory input", () => {
		given()
			.dir("<models-dir>/workspace")
			.when.exec(`workspace-asset-migration <models-dir>/workspace`)
			.then.exitCode.should.beEqualZero()
			.and.directory.should.matchSnapshot()
			.and.stdout.should.matchSnapshot()
			.start();
	});
});
