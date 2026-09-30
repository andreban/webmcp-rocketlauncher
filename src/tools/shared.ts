/**
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  FUEL_AMOUNT_RANGE,
  OXIDIZER_RATIO_RANGE,
  TRAJECTORIES,
} from "../state";

const trajectoryProperty = {
  type: "string",
  enum: [...TRAJECTORIES],
  description: "Launch destination.",
};

/** Input schema for `calculate_fuel`. */
export const CALCULATE_FUEL_SCHEMA = {
  type: "object",
  properties: { trajectory: trajectoryProperty },
  required: ["trajectory"],
};

/** Input schema for `load_fuel`. */
export const LOAD_FUEL_SCHEMA = {
  type: "object",
  properties: {
    amount: {
      type: "number",
      minimum: FUEL_AMOUNT_RANGE.min,
      maximum: FUEL_AMOUNT_RANGE.max,
      description: "Fuel amount in tons.",
    },
    oxidizer_ratio: {
      type: "number",
      minimum: OXIDIZER_RATIO_RANGE.min,
      maximum: OXIDIZER_RATIO_RANGE.max,
      description: "Oxidizer-to-fuel ratio (e.g., 2.5).",
    },
  },
  required: ["amount", "oxidizer_ratio"],
};

/** Input schema for `prepare_launch`. */
export const PREPARE_LAUNCH_SCHEMA = {
  type: "object",
  properties: {
    auth_code: {
      type: "string",
      description:
        "4-digit authorization code. Must be obtained from the user.",
    },
    trajectory: trajectoryProperty,
  },
  required: ["auth_code", "trajectory"],
};

/**
 * Registers a tool on `document.modelContext`, logging registration failures
 * (e.g. a duplicate name) instead of leaving the returned promise unhandled.
 *
 * @param tool - The tool to register.
 * @param signal - Aborting this signal unregisters the tool.
 */
export function registerTool(
  tool: WebMCP.ModelContextTool,
  signal?: AbortSignal,
): void {
  document.modelContext!.registerTool(tool, { signal }).catch((error) => {
    console.error(`Failed to register WebMCP tool "${tool.name}":`, error);
  });
}
