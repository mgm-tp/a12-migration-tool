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

describe("userConfig on MigrationStepContext", () => {
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

	function createModel(content: Record<string, unknown> = {}): GenericModel {
		return {
			header: { id: "test-id", modelType: "user-config-test", modelVersion: "1.0.0" },
			content
		};
	}

	it("should make userConfig accessible in transform()", () => {
		let capturedConfig: unknown;

		const step: MigrationStep = {
			version: "2.0.0",
			transform(model: GenericModel, _logger, context?: MigrationStepContext): GenericModel {
				capturedConfig = context?.userConfig;
				return model;
			},
			schema: {}
		};

		const tool = createMigrationTool({
			modelType: "user-config-test",
			migrationSteps: [baseStep, step],
			userConfig: { keepAnnotations: true, outputFormat: "compact" }
		});

		tool.migrate([createModel()]);

		expect(capturedConfig).toEqual({ keepAnnotations: true, outputFormat: "compact" });
	});

	it("should make userConfig accessible in isMigrated()", () => {
		let capturedConfig: unknown;

		const step: MigrationStep = {
			version: "2.0.0",
			isMigrated(_model: GenericModel, context?: MigrationStepContext): boolean {
				capturedConfig = context?.userConfig;
				return false;
			},
			transform(model: GenericModel): GenericModel {
				return model;
			},
			schema: {}
		};

		const tool = createMigrationTool({
			modelType: "user-config-test",
			migrationSteps: [baseStep, step],
			userConfig: { verbose: true }
		});

		tool.migrate([createModel()]);

		expect(capturedConfig).toEqual({ verbose: true });
	});

	it("should have userConfig as undefined when not provided", () => {
		let capturedConfig: unknown = "not-set";

		const step: MigrationStep = {
			version: "2.0.0",
			transform(model: GenericModel, _logger, context?: MigrationStepContext): GenericModel {
				capturedConfig = context?.userConfig;
				return model;
			},
			schema: {}
		};

		const tool = createMigrationTool({
			modelType: "user-config-test",
			migrationSteps: [baseStep, step]
		});

		tool.migrate([createModel()]);

		expect(capturedConfig).toBeUndefined();
	});
});

describe("addModel overwrite behavior", () => {
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

	function createModel(content: Record<string, unknown> = {}): GenericModel {
		return {
			header: { id: "test-id", modelType: "add-model-test", modelVersion: "1.0.0" },
			content
		};
	}

	it("should overwrite an existing workspace model via addModel", () => {
		const newModelContent = {
			header: { id: "existing-model", modelType: "other", modelVersion: "2.0.0" },
			content: { updated: true }
		};

		const step: MigrationStep = {
			version: "2.0.0",
			transform(model: GenericModel, _logger, context?: MigrationStepContext): GenericModel {
				context?.addModel({ model: newModelContent, path: "existing-model.json" });
				return model;
			},
			schema: {}
		};

		const workspace: Workspace = {
			models: [
				{
					header: { id: "existing-model", modelType: "other", modelVersion: "1.0.0" },
					path: "existing-model.json"
				}
			],
			resources: []
		};

		const tool = createMigrationTool({
			modelType: "add-model-test",
			migrationSteps: [baseStep, step]
		});

		const results = tool.migrate([createModel()], workspace);

		expect(results).toHaveLength(1);
		expect(results[0].status).toBe("success");

		if (results[0].status === "success") {
			// The model should appear as a side model (overwriting the workspace entry)
			expect(results[0].sideModels).toHaveLength(1);
			expect(results[0].sideModels?.[0].path).toBe("existing-model.json");
			expect((results[0].sideModels?.[0].model as any).content.updated).toBe(true);
		}
	});

	it("should still deduplicate addModel calls within same migration run", () => {
		const newModelContent = {
			header: { id: "dup-model", modelType: "other", modelVersion: "2.0.0" },
			content: { first: true }
		};
		const secondModelContent = {
			header: { id: "dup-model", modelType: "other", modelVersion: "2.0.0" },
			content: { second: true }
		};

		const step: MigrationStep = {
			version: "2.0.0",
			transform(model: GenericModel, _logger, context?: MigrationStepContext): GenericModel {
				context?.addModel({ model: newModelContent, path: "dup-model.json" });
				context?.addModel({ model: secondModelContent, path: "dup-model.json" });
				return model;
			},
			schema: {}
		};

		const tool = createMigrationTool({
			modelType: "add-model-test",
			migrationSteps: [baseStep, step]
		});

		const results = tool.migrate([createModel()]);

		expect(results).toHaveLength(1);
		expect(results[0].status).toBe("success");

		if (results[0].status === "success") {
			// Should only have one side model (first call wins within same run)
			expect(results[0].sideModels).toHaveLength(1);
			expect((results[0].sideModels?.[0].model as any).content.first).toBe(true);
		}
	});
});
