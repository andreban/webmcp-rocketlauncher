/**
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { getState, prepareLaunch, igniteEngines, resetSystem } from "../state";
import { appendLog, renderState } from "../ui";

/**
 * Returns a successful tool execution response containing the serialized data.
 *
 * @param data - The payload to serialize and return.
 * @returns A structured object compatible with WebMCP tool execution results.
 */
export function ok(data: unknown): object {
  return { content: [{ type: "text", text: JSON.stringify(data) }] };
}

/**
 * Returns a failed tool execution response containing an error message.
 *
 * @param message - The error message to return.
 * @returns A structured object compatible with WebMCP tool execution results.
 */
export function err(message: string): object {
  return { content: [{ type: "text", text: `Error: ${message}` }] };
}

/**
 * Executes the get_page_state tool, returning the current rocket status and fuel level.
 *
 * @returns A successful response containing the current state.
 */
export function execGetPageState(): object {
  const state = getState();
  appendLog("tool-call", "▶ get_page_state()");
  const result = { status: state.status, fuel: state.fuel };
  appendLog("tool-result", `◀ ${JSON.stringify(result)}`);
  return ok(result);
}

/**
 * Executes the prepare_launch tool, transitioning the system to the PREPARED state.
 *
 * @param input - The tool input arguments containing auth_code and trajectory.
 * @returns A successful response if preparation succeeds, or an error response.
 */
export function execPrepareLaunch(input: Record<string, unknown>): object {
  const authCode = String(input["auth_code"] ?? "");
  const trajectory = String(input["trajectory"] ?? "");
  appendLog(
    "tool-call",
    `▶ prepare_launch({\n  auth_code: "${authCode}",\n  trajectory: "${trajectory}"\n})`,
  );
  const result = prepareLaunch(authCode, trajectory);
  if (result.success) {
    appendLog(
      "tool-result",
      `◀ ${JSON.stringify({ status: result.status, trajectory: result.trajectory })}`,
    );
    renderState();
    appendLog("state-marker", "[PREPARED] Systems warm");
    return ok({ status: result.status, trajectory: result.trajectory });
  } else {
    appendLog("tool-error", `◀ Error: ${result.error}`);
    return err(result.error);
  }
}

/**
 * Executes the ignite_engines tool, transitioning the system to the LAUNCHED state.
 *
 * @returns A successful response if ignition succeeds, or an error response.
 */
export function execIgniteEngines(): object {
  appendLog("tool-call", "▶ ignite_engines()");
  const result = igniteEngines();
  if (result.success) {
    appendLog("tool-result", `◀ ${JSON.stringify({ status: result.status })}`);
    renderState();
    appendLog("state-marker", "[LAUNCHED] Engines firing");
    return ok({ status: result.status });
  } else {
    appendLog("tool-error", `◀ Error: ${result.error}`);
    return err(result.error);
  }
}

/**
 * Executes the reset_system tool, returning the system to the IDLE state.
 *
 * @returns A successful response containing the reset state.
 */
export function execResetSystem(): object {
  appendLog("tool-call", "▶ reset_system()");
  const result = resetSystem();
  appendLog("tool-result", `◀ ${JSON.stringify(result)}`);
  renderState();
  appendLog("state-marker", "[IDLE] System initialized");
  return ok(result);
}
