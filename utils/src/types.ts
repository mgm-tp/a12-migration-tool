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

export interface ResolvedConfiguration
	extends Omit<Configuration, "modelInterfaceName" | "tsConfigPath" | "stepsDirPath"> {
	modelInterfaceName: (version: string) => string;
	tsConfigPath: string;
	stepsDirPath: string;
	schema?: boolean;
}

export interface Configuration {
	/**
	 * The name of the model interface or an array of tuples of Semver version range and model interface name
	 */
	modelInterfaceName: string | ModelInterfaceNameMap;

	/**
	 * The name of the model definition file in each step directory
	 */
	stepModelFileName: string;

	/**
	 * The path to model definition file in the core package of the engine
	 */
	referenceModelPath?: string;

	/**
	 * The path to source steps directory
	 */
	stepsDirPath?: string;

	/**
	 * The path to the function adjusts the target model file to make it compatible with the migration tool
	 */
	adjustModelFuncPath?: string;

	/**
	 * The path to tsconfig file for generating JSON schemas
	 * @default "./tsconfig.json"
	 */
	tsConfigPath?: string;

	persistentSchema?: boolean;

	/**
	 * The path to the schema definition file for migration-tool.config.json
	 */
	$schema?: string;
}

/**
 * A map between Semver version range and its corresponding model interface name
 */
export type ModelInterfaceNameMap = [versionRange: string, modelInterfaceName: string][];
