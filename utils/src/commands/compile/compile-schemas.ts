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

import * as FsSync from "node:fs";
import * as Fs from "node:fs/promises";
import { createRequire } from "node:module";
import * as Path from "node:path";

import gitDiff from "git-diff";
import {
	DEFAULT_CONFIG,
	SchemaGenerator,
	createFormatter,
	createParser,
	createProgram
} from "ts-json-schema-generator";
import type ts from "typescript";

import { CHECK_MARK, SCHEMA_FILE_NAME, VERSION_PREFIX } from "../../constants.js";
import type { ResolvedConfiguration } from "../../types.js";
import { getLatestVersion } from "../../utils.js";

const REFERENCE_SCHEMA_FILE_NAME = "schema.ref.json";

// The program comes from ts-json-schema-generator's own TypeScript; the host's may be TypeScript 7, which has no compiler API.
const generatorTypeScript: typeof ts = createRequire(import.meta.resolve("ts-json-schema-generator"))("typescript");

interface SchemaSource {
	generator: SchemaGenerator;
	program: ts.Program;
}

interface SchemaTarget {
	version: string;
	modelFilePath: string;
	typeName: string;
}

export async function validateLatestSchema(config: ResolvedConfiguration) {
	const latestVersion = `${VERSION_PREFIX}${await getLatestVersion(config)}`;
	const latestSchemaPath = Path.join(config.stepsDirPath, latestVersion, SCHEMA_FILE_NAME);
	const referenceSchemaPath = Path.join(config.stepsDirPath, latestVersion, REFERENCE_SCHEMA_FILE_NAME);
	const [target] = resolveTargets(config, [latestVersion]);

	await writeSchema(referenceSchemaPath, createSchema(createGenerator(config), target, config));

	const diff = gitDiff(await Fs.readFile(referenceSchemaPath, "utf-8"), await Fs.readFile(latestSchemaPath, "utf-8"), {
		color: false,
		noHeaders: true
	});

	if (diff !== undefined) {
		throw new Error(`Schema at ${latestSchemaPath} does not match against the generated one. \nDiff: ${diff}`);
	}

	await Fs.unlink(referenceSchemaPath);

	console.log(`${CHECK_MARK} Validated latest schema consistency!`);
}

export async function validateSchemas(config: ResolvedConfiguration) {
	for (const version of await Fs.readdir(config.stepsDirPath)) {
		if (!FsSync.lstatSync(Path.join(config.stepsDirPath, version)).isDirectory()) {
			continue;
		}

		if (!FsSync.existsSync(Path.join(config.stepsDirPath, version, SCHEMA_FILE_NAME))) {
			throw new Error(`Schema file for ${version} does not exist`);
		}
	}

	console.log(`${CHECK_MARK} Validated schema files existence!`);
}

export async function compileSchemas(config: ResolvedConfiguration) {
	const versions: string[] = [];

	for (const version of await Fs.readdir(config.stepsDirPath)) {
		if (!FsSync.lstatSync(Path.join(config.stepsDirPath, version)).isDirectory()) {
			continue;
		}
		if (config.persistentSchema && FsSync.existsSync(Path.join(config.stepsDirPath, version, SCHEMA_FILE_NAME))) {
			console.log(`Schema file for ${version} already exists`);
			continue;
		}
		versions.push(version);
	}

	const targets = resolveTargets(config, versions);

	if (targets.length > 0) {
		const generator = createGenerator(config);

		for (const target of targets) {
			console.log(`Compiling JSON schema for ${target.version}`);
			await writeSchema(
				Path.join(config.stepsDirPath, target.version, SCHEMA_FILE_NAME),
				createSchema(generator, target, config)
			);
		}
	}

	console.log("Compiled JSON schemas successfully!");
}

function resolveTargets(config: ResolvedConfiguration, versions: string[]): SchemaTarget[] {
	return versions.map((version) => {
		const modelFilePath = Path.join(config.stepsDirPath, version, config.stepModelFileName);

		if (!FsSync.existsSync(modelFilePath)) {
			throw new Error(`Model file ${modelFilePath} does not exist`);
		}

		return { version, modelFilePath, typeName: config.modelInterfaceName(version.replace(VERSION_PREFIX, "")) };
	});
}

/**
 * Builds a single TypeScript program covering every step model, so that each schema is generated
 * from the shared program instead of paying for a full program per version.
 */
function createGenerator(config: ResolvedConfiguration): SchemaSource {
	const generatorConfig = {
		...DEFAULT_CONFIG,
		path: Path.join(config.stepsDirPath, "*", config.stepModelFileName),
		tsconfig: config.tsConfigPath
	};

	let program: ts.Program;

	try {
		program = createProgram(generatorConfig);
	} catch (error) {
		throw toSchemaError(error, config);
	}

	return {
		program,
		generator: new SchemaGenerator(
			program,
			createParser(program, generatorConfig),
			createFormatter(generatorConfig),
			generatorConfig
		)
	};
}

function createSchema(
	{ generator, program }: SchemaSource,
	target: SchemaTarget,
	config: ResolvedConfiguration
): unknown {
	const node = findModelNode(program, target);

	if (node === undefined) {
		throw new Error(`Type ${target.typeName} for ${target.version} does not exist in ${target.modelFilePath}`);
	}

	try {
		return generator.createSchemaFromNodes([node]);
	} catch (error) {
		throw toSchemaError(error, config, [target.version]);
	}
}

/**
 * Resolves the model type through the type checker rather than the file's own statements, because a
 * step model may re-export the type of an earlier step instead of declaring it.
 */
function findModelNode(program: ts.Program, target: SchemaTarget): ts.Node | undefined {
	const checker = program.getTypeChecker();
	const sourceFile = program
		.getSourceFiles()
		.find((file) => Path.resolve(file.fileName) === Path.resolve(target.modelFilePath));
	const moduleSymbol = sourceFile && checker.getSymbolAtLocation(sourceFile);

	if (moduleSymbol === undefined) {
		return undefined;
	}

	const exportedSymbol = checker.getExportsOfModule(moduleSymbol).find((symbol) => symbol.name === target.typeName);

	if (exportedSymbol === undefined) {
		return undefined;
	}

	const declaredSymbol =
		exportedSymbol.flags & generatorTypeScript.SymbolFlags.Alias
			? checker.getAliasedSymbol(exportedSymbol)
			: exportedSymbol;

	return declaredSymbol.declarations?.[0];
}

async function writeSchema(filePath: string, schema: unknown): Promise<void> {
	const temporaryFilePath = `${filePath}.tmp`;

	await Fs.writeFile(temporaryFilePath, JSON.stringify(schema, null, 2));
	await Fs.rename(temporaryFilePath, filePath);
}

function toSchemaError(error: unknown, config: ResolvedConfiguration, versions?: string[]): unknown {
	if (!(error instanceof Error) || !("diagnostic" in error)) {
		return error;
	}

	const diagnostic = error.diagnostic as ts.Diagnostic;
	const diagnostics = [diagnostic, ...((diagnostic.relatedInformation ?? []) as ts.Diagnostic[])];
	const failingVersions = versions ?? resolveVersions(diagnostics, config);
	const subject = failingVersions.length > 0 ? failingVersions.join(", ") : "the step models";

	return new Error(
		`Failed to generate JSON schema for ${subject}\n${generatorTypeScript.formatDiagnostics(diagnostics, {
			getCanonicalFileName: (fileName) => fileName,
			getCurrentDirectory: () => "",
			getNewLine: () => "\n"
		})}`
	);
}

function resolveVersions(diagnostics: ts.Diagnostic[], config: ResolvedConfiguration): string[] {
	const versions = diagnostics
		.map((diagnostic) => diagnostic.file?.fileName)
		.filter((fileName) => fileName !== undefined)
		.map((fileName) => Path.relative(config.stepsDirPath, fileName).split(Path.sep)[0])
		.filter((version) => version?.startsWith(VERSION_PREFIX));

	return [...new Set(versions)];
}
