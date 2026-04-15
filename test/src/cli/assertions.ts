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
import * as process from "node:process";
import { fileURLToPath } from "node:url";

import { SyncResult, execaSync } from "execa";
import Fse from "fs-extra";
import { globSync } from "glob";
import { expect } from "vitest";

const __dirname = Path.dirname(fileURLToPath(import.meta.url));

export const FIXTURES_PATH = Path.join(__dirname, "..", "..", "fixtures");
const MODELS_PATH = Path.join(FIXTURES_PATH, "models");
const TEMP_PATH = Path.join(__dirname, "..", "..", "target", "temp");
const MODELS_PATH_PLACEHOLDER = "<models-dir>";
const TEST_DIR = "<TEST_DIR>";

interface Workspace {
	files: string[];
}

interface TestCase extends Workspace {
	command: string;
	cwd?: string;
	result: SyncResult;
}

export function given() {
	Fse.removeSync(TEMP_PATH);
	Fse.mkdirsSync(TEMP_PATH);

	return new Setup();
}

class Setup {
	constructor(private workspace: Workspace = { files: [] }) {}

	thatWorkspace() {
		this.workspace.files.forEach((file) => this.copyFile(file));
		return new Setup({ ...this.workspace });
	}

	file(path: string) {
		this.copyFile(path);
		this.workspace = { files: [...this.workspace.files, path] };
		return this;
	}

	dir(path: string) {
		return this.file(path);
	}

	exec(command: string, options?: { cwd?: string }) {
		let result: SyncResult;

		try {
			result = execaSync({
				...options,
				env: { FORCE_COLOR: "true" }
			})`${command.replace(MODELS_PATH_PLACEHOLDER, TEMP_PATH).replace(TEST_DIR, process.cwd()).split(" ")}`;
		} catch (e) {
			result = e as any;
		}

		return new MainAssertion({ command, cwd: options?.cwd, result, ...this.workspace });
	}

	get when() {
		return this;
	}

	private copyFile(filePath: string) {
		Fse.copySync(
			filePath.replace(MODELS_PATH_PLACEHOLDER, MODELS_PATH),
			filePath.replace(MODELS_PATH_PLACEHOLDER, TEMP_PATH)
		);
	}
}

class BaseAssertion {
	get should() {
		return this;
	}

	get then() {
		return this;
	}

	get and() {
		return this;
	}

	get also() {
		return this;
	}
}

class MainAssertion extends BaseAssertion {
	constructor(public testCase: TestCase) {
		super();
	}

	get exitCode() {
		return new ExitCodeAssertion(this);
	}

	get directory() {
		return new DirectoryAssertion(this);
	}

	get stdout() {
		return new StdoutAssertion(this);
	}

	get stderr() {
		return new StderrAssertion(this);
	}

	get given() {
		return new Setup({ files: this.testCase.files });
	}

	start() {
		return this.testCase;
	}
}

class ExitCodeAssertion extends BaseAssertion {
	private negative = false;
	constructor(private parent: MainAssertion) {
		super();
	}

	get not() {
		this.negative = true;
		return this;
	}

	beEqualZero() {
		if (this.negative) {
			expect(this.parent.testCase.result.exitCode).not.toEqual(0);
		} else {
			expect(this.parent.testCase.result.exitCode).toEqual(0);
		}
		return this.parent;
	}
}

class DirectoryAssertion extends BaseAssertion {
	constructor(private parent: MainAssertion) {
		super();
	}

	matchSnapshot() {
		const filePaths = globSync(Path.join(TEMP_PATH, "**", "*.*").split(Path.sep).join("/"));

		expect(filePaths.map((e) => `${MODELS_PATH_PLACEHOLDER}/${Path.relative(TEMP_PATH, e)}`)).toMatchSnapshot(
			getSnapshotName(this.parent.testCase, "File structure")
		);

		for (const filePath of filePaths) {
			const file = Fs.readFileSync(filePath, "utf8");
			expect(file).toMatchSnapshot(
				getSnapshotName(this.parent.testCase, `File ${MODELS_PATH_PLACEHOLDER}/${Path.relative(TEMP_PATH, filePath)}`)
			);
		}

		return this.parent;
	}
}

export class StdoutAssertion extends BaseAssertion {
	private readonly stdout: string;

	constructor(private parent: MainAssertion) {
		super();
		this.stdout = replaceAll(this.parent.testCase.result.stdout as string, process.cwd(), TEST_DIR);
	}

	matchSnapshot() {
		expect(this.stdout).toMatchSnapshot(getSnapshotName(this.parent.testCase, "Standard output"));
		return this.parent;
	}

	match(matcher: string | RegExp) {
		expect(this.stdout).toMatch(matcher);
		return this.parent;
	}
}

export class StderrAssertion extends BaseAssertion {
	private readonly stderr: string;
	constructor(private parent: MainAssertion) {
		super();
		this.stderr = replaceAll(this.parent.testCase.result.stderr as string, process.cwd(), TEST_DIR);
	}

	matchSnapshot() {
		expect(this.stderr).toMatchSnapshot(getSnapshotName(this.parent.testCase, "Standard error"));
		return this.parent;
	}

	match(matcher: string | RegExp) {
		expect(this.stderr).toMatch(matcher);
		return this.parent;
	}
}

function getSnapshotName(testCase: TestCase, targetSnapshot: string) {
	const header = "-".repeat(10) + "Test case" + "-".repeat(10);
	return [
		"",
		header,
		"Command:",
		testCase.command,
		testCase.cwd ? `Working dir: ${replaceAll(testCase.cwd, process.cwd(), TEST_DIR)}` : undefined,
		"Workspace:",
		...testCase.files,
		header.replace(/[^-]/g, "-"),
		"Snapshot:",
		targetSnapshot,
		""
	]
		.filter((item) => item !== undefined)
		.join("\n");
}

const replaceAll = (str: string, search: string, replacement: string) => {
	return str.split(search).join(replacement);
};
