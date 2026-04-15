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

import { test } from "vitest";

import { given } from "./assertions.js";

test("Un-exist models", () => {
	given()
		.when.exec(`page-model-migration <models-dir>/invalid-models/un-exist.json`)
		.then.exitCode.should.not.beEqualZero()
		.and.directory.should.matchSnapshot()
		.and.stdout.should.matchSnapshot()
		.start();
});

test("Invalid json file", () => {
	given()
		.file("<models-dir>/invalid-models/invalid-json.json")
		.when.exec(`page-model-migration <models-dir>/invalid-models/invalid-json.json`)
		.then.exitCode.should.not.beEqualZero()
		.and.directory.should.matchSnapshot()
		.and.stdout.should.matchSnapshot()

		.also.given.thatWorkspace()
		.when.exec(`page-model-migration <models-dir>/invalid-models/invalid-json.json --debug`)
		.then.stdout.should.matchSnapshot()
		.start();

	given()
		.file("<models-dir>/invalid-models/invalid-json5.json")
		.when.exec(`page-model-migration <models-dir>/invalid-models/invalid-json5.json`)
		.then.exitCode.should.not.beEqualZero()
		.and.directory.should.matchSnapshot()
		.and.stdout.should.matchSnapshot()

		.also.given.thatWorkspace()
		.when.exec(`page-model-migration <models-dir>/invalid-models/invalid-json5.json --debug`)
		.then.stdout.should.matchSnapshot()
		.start();
});

test("Unknown version", () => {
	given()
		.file("<models-dir>/invalid-models/unknown-version.json")
		.when.exec(`page-model-migration <models-dir>/invalid-models/unknown-version.json`)
		.then.exitCode.should.not.beEqualZero()
		.and.directory.should.matchSnapshot()
		.and.stdout.should.matchSnapshot()
		.start();
});

test("Is not page model", () => {
	given()
		.file("<models-dir>/invalid-models/document-model.json")
		.when.exec(`page-model-migration <models-dir>/invalid-models/document-model.json`)
		.then.exitCode.should.not.beEqualZero()
		.and.directory.should.matchSnapshot()
		.and.stdout.should.matchSnapshot()
		.start();

	given()
		.file("<models-dir>/invalid-models/valid-json5.json")
		.when.exec(`page-model-migration <models-dir>/invalid-models/valid-json5.json`)
		.then.exitCode.should.not.beEqualZero()
		.and.directory.should.matchSnapshot()
		.and.stdout.should.matchSnapshot();
});

test("Invalid page model", () => {
	given()
		.file("<models-dir>/invalid-models/invalid-page-model.json")
		.when.exec(`page-model-migration <models-dir>/invalid-models/invalid-page-model.json`)
		.then.exitCode.should.not.beEqualZero()
		.and.directory.should.matchSnapshot()
		.and.stdout.should.matchSnapshot()
		.start();

	given()
		.file("<models-dir>/invalid-models/invalid-page-model-2.json")
		.when.exec(`page-model-migration <models-dir>/invalid-models/invalid-page-model-2.json`)
		.then.exitCode.should.not.beEqualZero()
		.and.directory.should.matchSnapshot()
		.and.stdout.should.matchSnapshot()
		.start();

	given()
		.file("<models-dir>/invalid-models/invalid-page-model-with-do-not-migrate.json")
		.when.exec(`page-model-migration <models-dir>/invalid-models/invalid-page-model-with-do-not-migrate.json`)
		.then.exitCode.should.beEqualZero()
		.and.directory.should.matchSnapshot()
		.and.stdout.should.matchSnapshot()
		.start();
});

test("Up-to-date model", () => {
	given()
		.file("<models-dir>/invalid-models/up-to-date-page-model.json")
		.when.exec(`page-model-migration <models-dir>/invalid-models/up-to-date-page-model.json`)
		.then.exitCode.should.beEqualZero()
		.and.directory.should.matchSnapshot()
		.and.stdout.should.matchSnapshot()
		.start();
});

test("Legacy model", () => {
	given()
		.file("<models-dir>/invalid-models/legacy.json")
		.when.exec(`page-model-migration <models-dir>/invalid-models/legacy.json`)
		.then.exitCode.should.not.beEqualZero()
		.and.directory.should.matchSnapshot()
		.and.stdout.should.matchSnapshot()
		.start();
});

test("Newer model", () => {
	given()
		.file("<models-dir>/invalid-models/newer.json")
		.when.exec(`page-model-migration <models-dir>/invalid-models/newer.json`)
		.then.exitCode.should.beEqualZero()
		.and.directory.should.matchSnapshot()
		.and.stdout.should.matchSnapshot()
		.start();
});

test("Has do-not-migrate annotation", () => {
	given()
		.file("<models-dir>/invalid-models/do-not-migrate.json")
		.when.exec(`page-model-migration <models-dir>/invalid-models/do-not-migrate.json`)
		.then.exitCode.should.beEqualZero()
		.and.directory.should.matchSnapshot()
		.and.stdout.should.matchSnapshot()
		.start();
});
