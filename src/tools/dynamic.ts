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

const STATE_DEPENDENT_TOOLS = [
  "run_diagnostics",
  "load_fuel",
  "prepare_launch",
  "ignite_engines",
  "reset_system",
  "abort_sequence",
] as const;

function syncRegistrations(): void {
  const ctx = navigator.modelContext!;
  const { status } = getState();

  for (const name of STATE_DEPENDENT_TOOLS) {
    try {
      ctx.unregisterTool(name);
    } catch {
      // tool was not registered — nothing to unregister
    }
  }

  if (status === "IDLE") {
    ctx.registerTool({
      name: "run_diagnostics",
      description: "Step 1 of 4: Runs system checks. Required before launching rockets. If the user asks to launch a rocket, automatically execute this step without asking for confirmation. If the user provided launch details (like trajectory or auth_code), retain those details for later steps. Transitions to DIAGNOSTICS.",
      execute: execRunDiagnostics,
    });
  }

  if (status === "DIAGNOSTICS") {
    ctx.registerTool({
      name: "load_fuel",
      description: "Step 2 of 4: Loads propellants. Required before launching rockets. If you have launch details (trajectory, auth_code), retain them for later steps. Transitions to FUELED.",
      inputSchema: {
        type: "object",
        properties: {
          amount: { type: "number", description: "Fuel amount in tons." },
          oxidizer_ratio: { type: "number", description: "Oxidizer ratio (e.g., 2.5)." },
        },
        required: ["amount", "oxidizer_ratio"],
      },
      execute: execLoadFuel,
    });
  }

  if (status === "FUELED") {
    ctx.registerTool({
      name: "prepare_launch",
      description:
        "Step 3 of 4: prepares the system for ignition. Required before launching rockets. Requires the user's 4-digit auth_code — ask the user, never guess it.",
      inputSchema: {
        type: "object",
        properties: {
          auth_code: {
            type: "string",
            description:
              "4-digit authorization code. Must be obtained from the user.",
          },
          trajectory: {
            type: "string",
            description: 'Launch destination, e.g. "Moon" or "Mars".',
          },
        },
        required: ["auth_code", "trajectory"],
      },
      execute: execPrepareLaunch,
    });
  }

  if (status === "PREPARED") {
    ctx.registerTool({
      name: "ignite_engines",
      description:
        "Step 4 of 4: fires the engines to launch the rocket. The system is prepared and ready for ignition.",
      execute: execIgniteEngines,
    });
  }

  if (status === "LAUNCHED") {
    ctx.registerTool({
      name: "reset_system",
      description: "Resets the system to IDLE with full fuel.",
      execute: execResetSystem,
    });
  } else if (status !== "IDLE") {
    ctx.registerTool({
      name: "abort_sequence",
      description: "Aborts the sequence and resets to IDLE.",
      execute: execAbortSequence,
    });
  }
}
/**
 * Initializes WebMCP tools in dynamic mode.
 * Registers `get_page_state` globally and subscribes to state changes
 * to dynamically register/unregister state-dependent tools.
 */
export function initDynamicTools(): void {
  const ctx = navigator.modelContext!;

  ctx.registerTool({
    name: "get_page_state",
    description: "Returns the current rocket state (status and fuel level).",
    annotations: { readOnlyHint: true },
    execute: execGetPageState,
  });

  ctx.registerTool({
    name: "calculate_fuel",
    description: "Calculates the required fuel amount and oxidizer ratio based on the target trajectory.",
    inputSchema: {
      type: "object",
      properties: {
        trajectory: {
          type: "string",
          description: 'Launch destination, e.g. "Moon", "Mars", "ISS".',
        },
      },
      required: ["trajectory"],
    },
    execute: execCalculateFuel,
  });

  syncRegistrations();
  subscribe(syncRegistrations);
}
