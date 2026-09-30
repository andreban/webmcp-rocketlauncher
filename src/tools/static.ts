/**
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  execGetPageState,
  execPrepareLaunch,
  execIgniteEngines,
  execResetSystem,
  execRunDiagnostics,
  execCalculateFuel,
  execLoadFuel,
  execAbortSequence,
} from "./execute";
import {
  CALCULATE_FUEL_SCHEMA,
  LOAD_FUEL_SCHEMA,
  PREPARE_LAUNCH_SCHEMA,
  registerTool,
} from "./shared";

/**
 * Initializes and registers all WebMCP tools statically.
 * In static mode, all tools are registered up-front regardless of current state.
 */
export function initStaticTools(): void {
  registerTool({
    name: "get_page_state",
    description:
      "Returns the current rocket state (status and fuel level). If the user asks to launch a rocket, automatically execute this step first without asking for confirmation.",
    annotations: { readOnlyHint: true },
    execute: execGetPageState,
  });

  registerTool({
    name: "calculate_fuel",
    description:
      "Calculates the required fuel amount and oxidizer ratio based on the target trajectory.",
    inputSchema: CALCULATE_FUEL_SCHEMA,
    annotations: { readOnlyHint: true },
    execute: execCalculateFuel,
  });

  registerTool({
    name: "run_diagnostics",
    description:
      "Runs system checks. Transitions from IDLE to DIAGNOSTICS. Only valid when status is IDLE.",
    annotations: { readOnlyHint: false },
    execute: execRunDiagnostics,
  });

  registerTool({
    name: "load_fuel",
    description:
      "Loads propellants. Transitions from DIAGNOSTICS to FUELED. Only valid when status is DIAGNOSTICS.",
    inputSchema: LOAD_FUEL_SCHEMA,
    annotations: { readOnlyHint: false },
    execute: execLoadFuel,
  });

  registerTool({
    name: "prepare_launch",
    description:
      "Transitions the system from FUELED to PREPARED. Requires the user's 4-digit auth_code — ask the user, never guess it. Only valid when status is FUELED.",
    inputSchema: PREPARE_LAUNCH_SCHEMA,
    annotations: { readOnlyHint: false },
    execute: execPrepareLaunch,
  });

  registerTool({
    name: "ignite_engines",
    description:
      "Fires the rocket engines, transitioning from PREPARED to LAUNCHED. Only valid when status is PREPARED — follow the full prerequisite chain first.",
    annotations: { readOnlyHint: false },
    execute: execIgniteEngines,
  });

  registerTool({
    name: "abort_sequence",
    description:
      "Aborts the sequence and resets to IDLE. Valid from any state during the sequence.",
    annotations: { readOnlyHint: false },
    execute: execAbortSequence,
  });

  registerTool({
    name: "reset_system",
    description:
      "Resets the system to IDLE with full fuel. Valid from any state.",
    annotations: { readOnlyHint: false },
    execute: execResetSystem,
  });
}
