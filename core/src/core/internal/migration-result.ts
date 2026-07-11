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

import type { ErrorObject } from "ajv";

import type { GenericModel, Logger, SideResultModel, SideResultResource } from "../../types.js";

/** @internal */
export class MigrationResultAccumulator {
	private results: InternalMigrationResult[] = [];

	public get hasErrors(): boolean {
		return this.count("error") > 0;
	}

	public add(other: InternalMigrationResult | MigrationResultAccumulator) {
		if (other instanceof MigrationResultAccumulator) {
			this.results = [...this.results, ...other.results];
		} else {
			this.results.push(other);
		}
		return this;
	}

	public summarize(): string {
		return [
			"Migration Summary",
			"=================",
			`Migrated:${this.count("success").toString().padStart(8, " ")}`,
			`Skipped :${this.count("skip").toString().padStart(8, " ")}`,
			`Errors  :${this.count("error").toString().padStart(8, " ")}`
		].join("\n");
	}

	private count(type: MigrationResultType): number {
		return this.results.filter((result) => result.type === type).length;
	}
}

type MigrationResultType = "error" | "success" | "skip";

/** @internal */
export class InternalMigrationResult {
	public static readonly Success = (
		message: string,
		model: GenericModel,
		sideResources?: SideResultResource[],
		sideModels?: SideResultModel[],
		isDeleted?: boolean,
		deletedModels?: string[],
		deletedResources?: string[]
	) =>
		new InternalMigrationResult(
			"success",
			message,
			"",
			model,
			sideResources,
			sideModels,
			isDeleted,
			deletedModels,
			deletedResources
		);
	public static readonly Skip = (message: string) => new InternalMigrationResult("skip", message);
	public static readonly Ignore = (message: string) => new InternalMigrationResult("ignore", message);
	public static readonly Error = (message: string, details?: string | ErrorMessagePayload) =>
		new InternalMigrationResult("error", message, details);

	private constructor(
		public readonly type: MigrationResultType | "ignore",
		public readonly message?: string,
		public readonly details?: string | ErrorMessagePayload,
		public readonly model?: GenericModel,
		public readonly sideResources?: SideResultResource[],
		public readonly sideModels?: SideResultModel[],
		public readonly isDeleted?: boolean,
		public readonly deletedModels?: string[],
		public readonly deletedResources?: string[]
	) {}

	getMigratedModel(): GenericModel {
		if (this.type === "success" && this.model) {
			return this.model;
		}

		throw new Error("Can not get model from unsuccessful migration");
	}

	resolveMessage(modelLabel: string): string {
		return createDefaultMessageResolver().resolve(this, modelLabel);
	}

	logTo(logger: Logger, messageResolver = createDefaultMessageResolver(), modelLabel = ""): InternalMigrationResult {
		const message = messageResolver.resolve(this, modelLabel);
		if (this.type === "error") {
			logger.error(`ERROR: ${message}`);
		}

		if (this.type === "ignore") {
			logger.info(`${message}`);
		}

		if (this.type === "skip" || this.type === "success") {
			logger.log(`${message}`);
		}

		return this;
	}

	addTo(accumulator: MigrationResultAccumulator): InternalMigrationResult {
		accumulator.add(this);
		return this;
	}
}

/** @internal */
export interface ErrorMessagePayload {
	schema: any;
	model: object;
	errors: ErrorObject[];
}

/** @internal */
export interface MessageResolver {
	resolve(result: InternalMigrationResult, modelLabel: string): string;
}

function createDefaultMessageResolver(): MessageResolver {
	return {
		resolve(result: InternalMigrationResult, modelLabel: string): string {
			let message = "";
			if (result.message) {
				message += result.message;
			}

			const { details } = result;
			if (details) {
				if (typeof details === "string") {
					message += `. ${details}`;
				} else {
					const error = details.errors[0];
					message += `. The field/object at path "${error.instancePath}" ${error.message}`;
				}
			}

			return message.replace(/\$0/g, modelLabel);
		}
	};
}
