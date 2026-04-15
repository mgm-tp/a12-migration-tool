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

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { configurablePageMigrationTool } from "@com.mgmtp.a12.migrationtool/migrationtool-test-configurable-page-migration-tool/lib/api.js";
import { pageMigrationTool } from "@com.mgmtp.a12.migrationtool/migrationtool-test-page-migration-tool/lib/api.js";

import BasicModel from "../../fixtures/models/basic/v30.0.0-1.json" with { type: "json" };
import DontMigrateModel from "../../fixtures/models/invalid-models/do-not-migrate.json" with { type: "json" };
import InvalidPageModel2 from "../../fixtures/models/invalid-models/invalid-page-model-2.json" with { type: "json" };
import InvalidPageModel from "../../fixtures/models/invalid-models/invalid-page-model.json" with { type: "json" };
import LegacyModel from "../../fixtures/models/invalid-models/legacy.json" with { type: "json" };
import Newer from "../../fixtures/models/invalid-models/newer.json" with { type: "json" };
import ModelWithStepMessage from "../../fixtures/models/invalid-models/page-model-with-step-message.json" with { type: "json" };
import UnknownVersion from "../../fixtures/models/invalid-models/unknown-version.json" with { type: "json" };

describe("web", () => {
	const originalConsole = console;
	let outputs: Record<"log" | "info" | "error", unknown[]> = { error: [], log: [], info: [] };

	beforeEach(() => {
		outputs = { error: [], log: [], info: [] };
		originalConsole.error = console.error;
		originalConsole.log = console.log;
		originalConsole.info = console.info;

		console.error = (...messages) => outputs.error.push([...messages]);
		console.log = (...messages) => outputs.log.push([...messages]);
		console.info = (...messages) => outputs.info.push([...messages]);
	});

	afterEach(() => {
		console.error = originalConsole.error;
		console.log = originalConsole.log;
		console.info = originalConsole.info;
	});

	it("should migrate successfully", () => {
		expect(pageMigrationTool.migrate([BasicModel])).toMatchSnapshot();
		expect(outputs).toMatchSnapshot();
	});

	it("should return correct migration results", () => {
		expect(
			pageMigrationTool.migrate([
				DontMigrateModel,
				LegacyModel,
				Newer,
				UnknownVersion,
				InvalidPageModel,
				InvalidPageModel2,
				ModelWithStepMessage
			])
		).toMatchSnapshot();

		expect(outputs).toMatchSnapshot();
	});

	it("should return correct migration results with user config", () => {
		expect(configurablePageMigrationTool.migrate([BasicModel])).toMatchSnapshot();

		expect(outputs).toMatchSnapshot();
	});
});
