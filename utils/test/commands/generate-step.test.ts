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

import { existsSync, readFileSync, rmSync } from "node:fs";
import * as Path from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
	GenerateStepAnswers,
	createNewStep,
	createScenario,
	getNextVersions
} from "../../src/commands/generate-step.js";
import { TRANSFORM_FILE_NAME, VERSION_PREFIX } from "../../src/constants.js";
import { parseConfig } from "../../src/utils.js";

import { FIXTURES_DIR } from "../utils.js";

function getConfigPath(fixtureName: string) {
	return Path.join(FIXTURES_DIR, fixtureName, "migration-tool.config.json");
}

function getStepDir(fixtureName: string, version: string) {
	return Path.join(FIXTURES_DIR, fixtureName, "steps", `${VERSION_PREFIX}${version}`);
}

function getTransformFilePath(fixtureName: string, version: string) {
	return Path.join(getStepDir(fixtureName, version), TRANSFORM_FILE_NAME);
}

async function cleanStepDir(fixtureName: string, version: string) {
	rmSync(getStepDir(fixtureName, version), { recursive: true });
}

function assertFileMatchSnapshot(fixtureName: string, version: string, fileName: string) {
	expect(readFileSync(Path.join(getStepDir(fixtureName, version), `${fileName}.ts`), "utf8")).toMatchSnapshot(
		`${version}/${fileName}.ts`
	);
}

async function validateAnswer(fixtureName: string, answers: GenerateStepAnswers) {
	const config = await parseConfig(getConfigPath(fixtureName));
	const scenario = await createScenario(config);

	const availableVersions = scenario.versionChoices.map((choice) => choice.value);
	expect(availableVersions.includes(answers.nextVersion)).toBeTruthy();
}

describe("Generate step", () => {
	describe("getNextVersions", () => {
		const testCases: [string, string[]][] = [
			["30.0.0", ["30.1.0-pre.1", "31.0.0-pre.1"]],
			["30.0.0-pre.1", ["30.0.0-pre.2", "30.0.0"]],
			["30.0.0-pre.4", ["30.0.0-pre.5", "30.0.0"]],
			["30.1.0", ["30.2.0-pre.1", "31.0.0-pre.1"]]
		];

		for (const [latestVersion, expectedNextVersions] of testCases) {
			it(`should return ${expectedNextVersions} for latest version ${latestVersion}`, () => {
				expect(getNextVersions(latestVersion)).toStrictEqual(expectedNextVersions);
			});
		}
	});

	describe("when latest version is an official major (30.0.0)", () => {
		const fixtureName = "latest-official-major";
		it("should generate scenario correctly", async () => {
			expect(await createScenario(await parseConfig(getConfigPath(fixtureName)))).toMatchSnapshot("scenario");
		});

		describe("when user chooses the next minor pre version without transformation", () => {
			const answers: GenerateStepAnswers = { nextVersion: "30.1.0-pre.1" };

			beforeAll(async () => {
				await validateAnswer(fixtureName, answers);
			});

			afterAll(() => {
				cleanStepDir(fixtureName, answers.nextVersion);
			});

			it("should copy the reference model and not create transform file", async () => {
				await createNewStep(answers, await parseConfig(getConfigPath(fixtureName)));

				expect(existsSync(getTransformFilePath(fixtureName, answers.nextVersion))).toBeFalsy();
				assertFileMatchSnapshot(fixtureName, answers.nextVersion, "model");
			});
		});

		describe("when user chooses the next major pre version with transformation", () => {
			const answers: GenerateStepAnswers = { nextVersion: "31.0.0-pre.1", hasTransformFile: true };

			beforeAll(async () => {
				await validateAnswer(fixtureName, answers);
			});

			afterAll(() => {
				cleanStepDir(fixtureName, answers.nextVersion);
			});

			it("should copy the reference model and create transform file", async () => {
				await createNewStep(answers, await parseConfig(getConfigPath(fixtureName)));

				assertFileMatchSnapshot(fixtureName, answers.nextVersion, "model");
				assertFileMatchSnapshot(fixtureName, answers.nextVersion, "transform");
			});
		});
	});

	describe("when latest version is a minor pre (30.1.0-pre.2)", () => {
		const fixtureName = "latest-pre-minor";
		it("should generate scenario correctly", async () => {
			expect(await createScenario(await parseConfig(getConfigPath(fixtureName)))).toMatchSnapshot("scenario");
		});

		describe("when choose the next minor pre version without transformation", () => {
			const answers: GenerateStepAnswers = { nextVersion: "30.1.0-pre.3" };

			beforeAll(async () => {
				await validateAnswer(fixtureName, answers);
			});

			afterAll(() => {
				cleanStepDir(fixtureName, answers.nextVersion);
			});

			it("should copy the reference model and not create transform file", async () => {
				await createNewStep(answers, await parseConfig(getConfigPath(fixtureName)));

				expect(existsSync(getTransformFilePath(fixtureName, answers.nextVersion))).toBeFalsy();
				assertFileMatchSnapshot(fixtureName, answers.nextVersion, "model");
			});
		});

		describe("when choose the next minor pre version with transformation", () => {
			const answers: GenerateStepAnswers = { nextVersion: "30.1.0-pre.3", hasTransformFile: true };

			beforeAll(async () => {
				await validateAnswer(fixtureName, answers);
			});

			afterAll(() => {
				cleanStepDir(fixtureName, answers.nextVersion);
			});

			it("should copy the reference model and create transform file", async () => {
				await createNewStep(answers, await parseConfig(getConfigPath(fixtureName)));

				assertFileMatchSnapshot(fixtureName, answers.nextVersion, "model");
				assertFileMatchSnapshot(fixtureName, answers.nextVersion, "transform");
			});
		});

		describe("when choose the official version", () => {
			const answers: GenerateStepAnswers = { nextVersion: "30.1.0" };

			beforeAll(async () => {
				await validateAnswer(fixtureName, answers);
			});

			afterAll(() => {
				cleanStepDir(fixtureName, answers.nextVersion);
			});

			it("should reference to the latest pre model and not create transform file", async () => {
				await createNewStep(answers, await parseConfig(getConfigPath(fixtureName)));

				expect(existsSync(getTransformFilePath(fixtureName, answers.nextVersion))).toBeFalsy();
				assertFileMatchSnapshot(fixtureName, answers.nextVersion, "model");
			});
		});
	});

	describe("when given adjusting model function", () => {
		const fixtureName = "latest-pre-minor-with-model-adjustment";
		const answers: GenerateStepAnswers = { nextVersion: "31.0.0-pre.2", hasTransformFile: true };

		beforeAll(async () => {
			await validateAnswer(fixtureName, answers);
		});

		afterAll(() => {
			cleanStepDir(fixtureName, answers.nextVersion);
		});

		it("should adjust the reference model", async () => {
			await createNewStep(answers, await parseConfig(getConfigPath(fixtureName)));

			assertFileMatchSnapshot(fixtureName, answers.nextVersion, "model");
			assertFileMatchSnapshot(fixtureName, answers.nextVersion, "transform");
		});
	});

	describe("when latest version is an official minor (version-30.1.0)", () => {
		it("should generate scenario correctly", async () => {
			expect(await createScenario(await parseConfig(getConfigPath("latest-official-minor")))).toMatchSnapshot(
				"scenario"
			);
		});
	});
});
