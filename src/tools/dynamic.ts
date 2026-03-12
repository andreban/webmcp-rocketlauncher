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
} from "./execute";

const STATE_DEPENDENT_TOOLS = [
  "prepare_launch",
  "ignite_engines",
  "reset_system",
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
      name: "prepare_launch",
      description:
        "Step 1 of 2 to launch the rocket: prepares the system for ignition. Call this first, then ignite_engines will become available. Requires the user's 4-digit auth_code — ask the user, never guess it.",
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
        "Step 2 of 2 to launch the rocket: fires the engines. The system is prepared and ready for ignition.",
      execute: execIgniteEngines,
    });
  }

  if (status === "LAUNCHED") {
    ctx.registerTool({
      name: "reset_system",
      description: "Resets the system to IDLE with full fuel.",
      execute: execResetSystem,
    });
  }
}

export function initDynamicTools(): void {
  const ctx = navigator.modelContext!;

  ctx.registerTool({
    name: "get_page_state",
    description: "Returns the current rocket state (status and fuel level).",
    annotations: { readOnlyHint: true },
    execute: execGetPageState,
  });

  syncRegistrations();
  subscribe(syncRegistrations);
}
