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

import * as Semver from "semver";

import type { Logger, MigrationStep } from "../../types.js";

/** @internal */
export namespace MigratorUtils {
	export function getLatestVersion(migrators: MigrationStep[]): string {
		const sortedVersions = getMigratableVersions(migrators).sort(Semver.compare);

		return sortedVersions[sortedVersions.length - 1];
	}

	export function findCapableMigrationSteps(
		modelVersion: string,
		migrators: MigrationStep[],
		nextOnly: boolean,
		logger: Logger,
		modelType: string
	): MigrationStep[] {
		logger.info(`${modelType[0].toUpperCase() + modelType.slice(1)} model found with version ${modelVersion}.`);

		const migratableVersions = getMigratableVersions(migrators, modelVersion);
		const result: MigrationStep[] = migrators
			.filter((migrator) => migratableVersions.includes(migrator.version))
			.sort((x, y) => Semver.compare(x.version, y.version));

		if (nextOnly) {
			return result.slice(0, 1);
		}

		return result;
	}

	export function getMigratableVersions(migrators: MigrationStep[], currentVersion?: string): string[] {
		const migrationVersions: string[] = [];

		for (const migrator of migrators) {
			if (!Semver.valid(migrator.version)) {
				throw new Error("Invalid version name: " + migrator.version);
			}

			if (!currentVersion || Semver.gt(migrator.version, currentVersion)) {
				migrationVersions.push(migrator.version);
			}
		}

		return migrationVersions;
	}
}
