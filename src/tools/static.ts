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

/**
 * Initializes and registers all WebMCP tools statically.
 * In static mode, all tools are registered up-front regardless of current state.
 */
export function initStaticTools(): void {
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

  ctx.registerTool({
    name: "run_diagnostics",
    description: "Runs system checks. Transitions from IDLE to DIAGNOSTICS. Only valid when status is IDLE.",
    execute: execRunDiagnostics,
  });

  ctx.registerTool({
    name: "load_fuel",
    description: "Loads propellants. Transitions from DIAGNOSTICS to FUELED. Only valid when status is DIAGNOSTICS.",
    inputSchema: {
      type: "object",
      properties: {
        amount: {
          type: "number",
          description: "Fuel amount in tons.",
        },
        oxidizer_ratio: {
          type: "number",
          description: "Oxidizer ratio (e.g., 2.5).",
        },
      },
      required: ["amount", "oxidizer_ratio"],
    },
    execute: execLoadFuel,
  });

  ctx.registerTool({
    name: "prepare_launch",
    description:
      "Transitions the system from FUELED to PREPARED. Requires the user's 4-digit auth_code — ask the user, never guess it. Only valid when status is FUELED.",
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
      "Fires the rocket engines, transitioning from PREPARED to LAUNCHED. Only valid when status is PREPARED — follow the full prerequisite chain first.",
    execute: execIgniteEngines,
  });

  ctx.registerTool({
    name: "abort_sequence",
    description:
      "Aborts the sequence and resets to IDLE. Valid from any state during the sequence.",
    execute: execAbortSequence,
  });

  ctx.registerTool({
    name: "reset_system",
    description:
      "Resets the system to IDLE with full fuel. Valid from any state.",
    execute: execResetSystem,
  });
}
