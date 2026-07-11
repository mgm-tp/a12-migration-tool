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

import type {
	GenericModel,
	MigrationStep,
	MigrationStepContext,
	Workspace
} from "@com.mgmtp.a12.migrationtool/migrationtool-core/types";
import { createMigrationTool } from "@com.mgmtp.a12.migrationtool/migrationtool-core/web";

describe("isMigrated", () => {
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

	const baseStep: MigrationStep = {
		version: "1.0.0",
		schema: {}
	};

	const step: MigrationStep = {
		version: "2.0.0",
		isMigrated(model: GenericModel, _context?: MigrationStepContext): boolean {
			return (model as any).content._migrated === true;
		},
		transform(model: GenericModel): GenericModel {
			const m = model as any;
			return { ...m, content: { ...m.content, _migrated: true, transformed: true } };
		},
		schema: {}
	};

	function createModel(content: Record<string, unknown>): GenericModel {
		return {
			header: { id: "test-id", modelType: "is-migrated-test", modelVersion: "1.0.0" },
			content
		};
	}

	const tool = createMigrationTool({
		modelType: "is-migrated-test",
		migrationSteps: [baseStep, step]
	});

	it("should skip step when isMigrated returns true", () => {
		const model = createModel({ _migrated: true });
		const results = tool.migrate([model]);

		expect(results).toHaveLength(1);
		expect(results[0].status).toBe("success");

		if (results[0].status === "success") {
			expect(results[0].model).not.toHaveProperty("content.transformed");
			expect((results[0].model as any).header.modelVersion).toBe("1.0.0");
		}
	});

	it("should run step when isMigrated returns false", () => {
		const model = createModel({});
		const results = tool.migrate([model]);

		expect(results).toHaveLength(1);
		expect(results[0].status).toBe("success");

		if (results[0].status === "success") {
			expect((results[0].model as any).header.modelVersion).toBe("2.0.0");
			expect((results[0].model as any).content.transformed).toBe(true);
		}
	});

	it("should run step normally when isMigrated is not provided (backward compat)", () => {
		const stepWithoutIsMigrated: MigrationStep = {
			version: "2.0.0",
			transform(model: GenericModel): GenericModel {
				const m = model as any;
				return { ...m, content: { ...m.content, transformed: true } };
			},
			schema: {}
		};

		const toolWithoutIsMigrated = createMigrationTool({
			modelType: "is-migrated-test",
			migrationSteps: [baseStep, stepWithoutIsMigrated]
		});

		const model = createModel({});
		const results = toolWithoutIsMigrated.migrate([model]);

		expect(results).toHaveLength(1);
		expect(results[0].status).toBe("success");

		if (results[0].status === "success") {
			expect((results[0].model as any).header.modelVersion).toBe("2.0.0");
			expect((results[0].model as any).content.transformed).toBe(true);
		}
	});

	it("should pass context with workspace to isMigrated", () => {
		let receivedContext: MigrationStepContext | undefined;

		const stepWithContextCheck: MigrationStep = {
			version: "2.0.0",
			isMigrated(_model: GenericModel, context?: MigrationStepContext): boolean {
				receivedContext = context;
				return false;
			},
			transform(model: GenericModel): GenericModel {
				return model;
			},
			schema: {}
		};

		const toolWithContext = createMigrationTool({
			modelType: "is-migrated-test",
			migrationSteps: [baseStep, stepWithContextCheck],
			enabledWorkspace: true
		});

		const workspace: Workspace = {
			models: [{ header: { id: "other-id", modelType: "other", modelVersion: "1.0.0" }, path: "other.json" }],
			resources: []
		};

		const model = createModel({});
		toolWithContext.migrate([model], workspace);

		expect(receivedContext).toBeDefined();
		expect(receivedContext?.findModel("other-id")).toBeDefined();
		expect(receivedContext?.findModel("other-id")?.header.id).toBe("other-id");
	});

	it("should return model unchanged when isMigrated returns true for the only capable step", () => {
		const model = createModel({ _migrated: true, existingData: "keep-this" });
		const results = tool.migrate([model]);

		expect(results).toHaveLength(1);
		expect(results[0].status).toBe("success");

		if (results[0].status === "success") {
			expect((results[0].model as any).content._migrated).toBe(true);
			expect((results[0].model as any).content.existingData).toBe("keep-this");
			expect((results[0].model as any).content.transformed).toBeUndefined();
			expect((results[0].model as any).header.modelVersion).toBe("1.0.0");
		}
	});

	it("should be idempotent across repeated runs — version stays the same, bypassing semver increment", () => {
		let transformCallCount = 0;

		const extractionStep: MigrationStep = {
			version: "2.0.0",
			isMigrated(model: GenericModel): boolean {
				return (model as any).content._extracted === true;
			},
			transform(model: GenericModel): GenericModel {
				transformCallCount++;
				const m = model as any;
				return { ...m, content: { ...m.content, _extracted: true } };
			},
			schema: {}
		};

		const extractionTool = createMigrationTool({
			modelType: "is-migrated-test",
			migrationSteps: [baseStep, extractionStep]
		});

		const model = createModel({ _extracted: true });

		// First run: isMigrated returns true → step skipped, version stays at 1.0.0
		const results1 = extractionTool.migrate([model]);
		expect(results1[0].status).toBe("success");
		if (results1[0].status === "success") {
			expect((results1[0].model as any).header.modelVersion).toBe("1.0.0");
		}
		expect(transformCallCount).toBe(0);

		// Second run on same model: step is still "capable" by semver (2.0.0 > 1.0.0)
		// but isMigrated still returns true → skipped again, version unchanged
		const results2 = extractionTool.migrate([model]);
		expect(results2[0].status).toBe("success");
		if (results2[0].status === "success") {
			expect((results2[0].model as any).header.modelVersion).toBe("1.0.0");
		}
		expect(transformCallCount).toBe(0);

		// Both runs produce the same result — isMigrated prevents the version bump
		// that would otherwise make the step "not capable" on re-run
	});
});
