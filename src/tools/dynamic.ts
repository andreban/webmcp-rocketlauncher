/**
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { getState, subscribe } from "../state";
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

/** Unregisters the tools registered for the previous state when aborted. */
let stateToolsController: AbortController | undefined;

function syncRegistrations(): void {
  stateToolsController?.abort();
  stateToolsController = new AbortController();
  const { signal } = stateToolsController;
  const { status } = getState();

  if (status === "IDLE") {
    registerTool(
      {
        name: "run_diagnostics",
        description:
          "Step 1 of 4: Runs system checks. Required before launching rockets. If the user asks to launch a rocket, automatically execute this step without asking for confirmation. If the user provided launch details (like trajectory or auth_code), retain those details for later steps. Transitions to DIAGNOSTICS.",
        annotations: { readOnlyHint: false },
        execute: execRunDiagnostics,
      },
      signal,
    );
  }

  if (status === "DIAGNOSTICS") {
    registerTool(
      {
        name: "load_fuel",
        description:
          "Step 2 of 4: Loads propellants. Required before launching rockets. If you have launch details (trajectory, auth_code), retain them for later steps. Transitions to FUELED.",
        inputSchema: LOAD_FUEL_SCHEMA,
        annotations: { readOnlyHint: false },
        execute: execLoadFuel,
      },
      signal,
    );
  }

  if (status === "FUELED") {
    registerTool(
      {
        name: "prepare_launch",
        description:
          "Step 3 of 4: prepares the system for ignition. Required before launching rockets. Requires the user's 4-digit auth_code — ask the user, never guess it.",
        inputSchema: PREPARE_LAUNCH_SCHEMA,
        annotations: { readOnlyHint: false },
        execute: execPrepareLaunch,
      },
      signal,
    );
  }

  if (status === "PREPARED") {
    registerTool(
      {
        name: "ignite_engines",
        description:
          "Step 4 of 4: fires the engines to launch the rocket. The system is prepared and ready for ignition.",
        annotations: { readOnlyHint: false },
        execute: execIgniteEngines,
      },
      signal,
    );
  }

  if (status === "LAUNCHED") {
    registerTool(
      {
        name: "reset_system",
        description: "Resets the system to IDLE with full fuel.",
        annotations: { readOnlyHint: false },
        execute: execResetSystem,
      },
      signal,
    );
  } else if (status !== "IDLE") {
    registerTool(
      {
        name: "abort_sequence",
        description: "Aborts the sequence and resets to IDLE.",
        annotations: { readOnlyHint: false },
        execute: execAbortSequence,
      },
      signal,
    );
  }
}

/**
 * Initializes WebMCP tools in dynamic mode.
 * Registers `get_page_state` and `calculate_fuel` for the whole session and
 * subscribes to state changes to swap in the tools valid for each state.
 */
export function initDynamicTools(): void {
  registerTool({
    name: "get_page_state",
    description: "Returns the current rocket state (status and fuel level).",
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

  syncRegistrations();
  subscribe(syncRegistrations);
}
