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

import type { Workspace } from "@com.mgmtp.a12.migrationtool/migrationtool-core/types";
import { assetMigrationTool } from "@com.mgmtp.a12.migrationtool/migrationtool-test-workspace-asset-migration-tool/lib/api.js";

import OtherModelTypeDelete from "../../fixtures/models/workspace/models/nested/other-model-type-delete.json" with { type: "json" };
import OtherModelType from "../../fixtures/models/workspace/models/nested/other-model-type.json" with { type: "json" };
import NoEmbeddedData from "../../fixtures/models/workspace/no-embedded-data.json" with { type: "json" };
import ToBeDeleted from "../../fixtures/models/workspace/to-be-deleted.json" with { type: "json" };
import WithDataToReplace from "../../fixtures/models/workspace/with-data-to-replace.json" with { type: "json" };
import WithDuplicateEmbeddedData from "../../fixtures/models/workspace/with-duplicate-embedded-data.json" with { type: "json" };
import WithEmbeddedDataDuplicate from "../../fixtures/models/workspace/with-embedded-data-duplicate.json" with { type: "json" };
import WithEmbeddedData from "../../fixtures/models/workspace/with-embedded-data.json" with { type: "json" };
import WithExtractToModel from "../../fixtures/models/workspace/with-extract-to-model.json" with { type: "json" };
import WithNestedEmbeddedData from "../../fixtures/models/workspace/with-nested-embedded-data.json" with { type: "json" };

describe("workspace", () => {
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

	it("should migrate without workspace and extract embedded data as side result", () => {
		const results = assetMigrationTool.migrate([WithEmbeddedData]);

		expect(results).toHaveLength(1);
		expect(results[0].status).toBe("success");

		if (results[0].status === "success") {
			// embeddedData should be removed, dataRef should be set
			expect(results[0].model).toHaveProperty("content.dataRef");
			expect(results[0].model).not.toHaveProperty("content.embeddedData");

			// sideResources should contain the extracted data
			expect(results[0].sideResources).toBeDefined();
			expect(results[0].sideResources).toHaveLength(1);
			expect(results[0].sideResources?.[0].originalName).toBe("data.bin");
		}

		expect(results).toMatchSnapshot();
		expect(outputs).toMatchSnapshot();
	});

	it("should produce side result with empty workspace", () => {
		const workspace: Workspace = { models: [], resources: [] };
		const results = assetMigrationTool.migrate([WithEmbeddedData], workspace);

		expect(results).toHaveLength(1);
		expect(results[0].status).toBe("success");

		if (results[0].status === "success") {
			expect(results[0].sideResources).toHaveLength(1);
		}

		expect(results).toMatchSnapshot();
		expect(outputs).toMatchSnapshot();
	});

	it("should deduplicate when resource already exists in workspace", () => {
		// SHA-256 of "Hello" (base64 "SGVsbG8=")
		const workspace: Workspace = {
			models: [],
			resources: [
				{ path: "existing-data.bin", hash: "185f8db32271fe25f561a6fc938b2e264306ec304eda518007d1764826381969" }
			]
		};

		const results = assetMigrationTool.migrate([WithEmbeddedData], workspace);

		expect(results).toHaveLength(1);
		expect(results[0].status).toBe("success");

		if (results[0].status === "success") {
			// Should reference existing resource, no new side results
			expect((results[0].model as any).content.dataRef).toBe("existing-data.bin");
			expect(results[0].sideResources).toBeUndefined();
		}

		expect(results).toMatchSnapshot();
		expect(outputs).toMatchSnapshot();
	});

	it("should mark model for deletion", () => {
		const results = assetMigrationTool.migrate([ToBeDeleted]);

		expect(results).toHaveLength(1);
		expect(results[0].status).toBe("success");

		if (results[0].status === "success") {
			expect(results[0].isDeleted).toBe(true);
		}

		expect(results).toMatchSnapshot();
		expect(outputs).toMatchSnapshot();
	});

	it("should migrate model without embedded data", () => {
		const results = assetMigrationTool.migrate([NoEmbeddedData]);

		expect(results).toHaveLength(1);
		expect(results[0].status).toBe("success");

		if (results[0].status === "success") {
			expect(results[0].sideResources).toBeUndefined();
			expect(results[0].model).not.toHaveProperty("content.embeddedData");
			expect(results[0].model).not.toHaveProperty("content.dataRef");
		}

		expect(results).toMatchSnapshot();
		expect(outputs).toMatchSnapshot();
	});

	it("should deduplicate side results across two models with same embedded data", () => {
		const results = assetMigrationTool.migrate([WithEmbeddedData, WithEmbeddedDataDuplicate]);

		expect(results).toHaveLength(2);
		expect(results[0].status).toBe("success");
		expect(results[1].status).toBe("success");

		if (results[0].status === "success" && results[1].status === "success") {
			// Both models should reference the same side result name
			expect((results[0].model as any).content.dataRef).toBe("data_185f8db3.bin");
			expect((results[1].model as any).content.dataRef).toBe("data_185f8db3.bin");

			// Each model gets its own side result list (context is per-model),
			// but within each list the side result should appear exactly once
			expect(results[0].sideResources).toHaveLength(1);
			expect(results[1].sideResources).toHaveLength(1);

			// Both side results should have the same hash
			expect(results[0].sideResources?.[0].hash).toBe(results[1].sideResources?.[0].hash);
			expect(results[0].sideResources?.[0].path).toBe(results[1].sideResources?.[0].path);
		}
	});

	it("should deduplicate side results within a single model when both embedded fields have the same content", () => {
		const results = assetMigrationTool.migrate([WithDuplicateEmbeddedData]);

		expect(results).toHaveLength(1);
		expect(results[0].status).toBe("success");

		if (results[0].status === "success") {
			// Both embeddedData and embeddedData2 had the same content ("Hello"),
			// so dedup should result in exactly 1 side result, not 2
			expect(results[0].sideResources).toHaveLength(1);
			expect(results[0].sideResources?.[0].path).toBe("data_185f8db3.bin");
			expect((results[0].model as any).content.dataRef).toBe("data_185f8db3.bin");
			expect((results[0].model as any).content.dataRef2).toBe("data_185f8db3.bin");
		}
	});

	it("should extract and deduplicate nested embedded data as side result", () => {
		const results = assetMigrationTool.migrate([WithNestedEmbeddedData]);

		expect(results).toHaveLength(1);
		expect(results[0].status).toBe("success");

		if (results[0].status === "success") {
			expect(results[0].sideResources).toHaveLength(1);
			// SHA-256 of "Hello World" → first 8 hex chars = a591a6d4
			expect(results[0].sideResources?.[0].path).toBe("data_a591a6d4.bin");
			expect((results[0].model as any).content.dataRef).toBe("data_a591a6d4.bin");
		}

		expect(results).toMatchSnapshot();
		expect(outputs).toMatchSnapshot();
	});

	it("should resolve model content from workspace via resolveModel", () => {
		const workspace: Workspace = {
			models: [{ header: OtherModelType.header, path: "models/nested/other-model-type.json" }],
			resources: [],
			resolveModel: () => OtherModelType
		};

		const results = assetMigrationTool.migrate([WithDataToReplace], workspace);

		expect(results).toHaveLength(1);
		expect(results[0].status).toBe("success");

		if (results[0].status === "success") {
			expect((results[0].model as any).content.extractedText).toBe("important data to extract");
			expect(results[0].deletedModels).toBeUndefined();
		}

		expect(results).toMatchSnapshot();
		expect(outputs).toMatchSnapshot();
	});

	it("should resolve model content and delete source model when flagged", () => {
		const workspace: Workspace = {
			models: [{ header: OtherModelTypeDelete.header, path: "models/nested/other-model-type-delete.json" }],
			resources: [],
			resolveModel: () => OtherModelTypeDelete
		};

		const results = assetMigrationTool.migrate([WithDataToReplace], workspace);

		expect(results).toHaveLength(1);
		expect(results[0].status).toBe("success");

		if (results[0].status === "success") {
			expect((results[0].model as any).content.extractedText).toBe("important data to extract and then delete model");
			expect(results[0].deletedModels).toContain("other-model-type-delete");
		}

		expect(results).toMatchSnapshot();
		expect(outputs).toMatchSnapshot();
	});

	it("should create a side model via addModel", () => {
		const results = assetMigrationTool.migrate([WithExtractToModel]);

		expect(results).toHaveLength(1);
		expect(results[0].status).toBe("success");

		if (results[0].status === "success") {
			expect(results[0].sideModels).toHaveLength(1);
			expect(results[0].sideModels?.[0].path).toBe("extracted-model.json");
			expect((results[0].sideModels?.[0].model as any).content.extractedFromModel).toBe("extract into new model");
		}

		expect(results).toMatchSnapshot();
		expect(outputs).toMatchSnapshot();
	});
});
