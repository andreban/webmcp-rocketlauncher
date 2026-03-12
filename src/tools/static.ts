/**
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  execGetPageState,
  execPrepareLaunch,
  execIgniteEngines,
  execResetSystem,
} from "./execute";

export function initStaticTools(): void {
  const ctx = navigator.modelContext!;

  ctx.registerTool({
    name: "get_page_state",
    description: "Returns the current rocket state (status and fuel level).",
    annotations: { readOnlyHint: true },
    execute: execGetPageState,
  });

  ctx.registerTool({
    name: "prepare_launch",
    description:
      "Transitions the system from IDLE to PREPARED. Requires the user's 4-digit auth_code — ask the user, never guess it. Only valid when status is IDLE.",
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

  ctx.registerTool({
    name: "ignite_engines",
    description:
      "Fires the rocket engines, transitioning from PREPARED to LAUNCHED. Only valid when status is PREPARED — call prepare_launch first if status is IDLE.",
    execute: execIgniteEngines,
  });

  ctx.registerTool({
    name: "reset_system",
    description:
      "Resets the system to IDLE with full fuel. Valid from any state.",
    execute: execResetSystem,
  });
}
