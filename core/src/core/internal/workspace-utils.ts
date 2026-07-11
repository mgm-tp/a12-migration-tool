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

import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";

/**
 * @public
 * Generates a reproducible resource name from an original file name and a hash.
 * Format: `{baseName}_{hash8}.{extension}`
 * Example: `generateResourceName("logo.png", "a1b2c3d4e5f6...")` → `"logo_a1b2c3d4.png"`
 *
 * Relative paths are preserved: `"assets/logo.png"` → `"assets/logo_a1b2c3d4.png"`
 */
export function generateResourceName(originalName: string, hash: string): string {
	const lastDot = originalName.lastIndexOf(".");
	if (lastDot === -1) {
		return `${originalName}_${hash.substring(0, 8)}`;
	}
	const base = originalName.substring(0, lastDot);
	const ext = originalName.substring(lastDot);
	return `${base}_${hash.substring(0, 8)}${ext}`;
}

/**
 * @public
 * Computes the SHA-256 hash of a `Uint8Array` and returns it as a lowercase hex string.
 * Works in both Node.js and browser environments.
 */
export function sha256Hex(data: Uint8Array): string {
	return bytesToHex(sha256(data));
}
