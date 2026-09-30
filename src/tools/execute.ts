/**
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  getState,
  calculateFuel,
  runDiagnostics,
  loadFuel,
  prepareLaunch,
  igniteEngines,
  resetSystem,
  type ErrorCode,
  type Failure,
} from "../state";
import { appendLog, renderState } from "../ui";

/**
 * Structured error returned to the agent.
 *
 * Native WebMCP tools resolve errors rather than throwing: a thrown error or
 * rejected promise reaches the agent only as a generic `UnknownError`.
 */
export interface ToolError {
  error: string;
  code: ErrorCode;
}

function toolError(failure: Failure): ToolError {
  appendLog("tool-error", `◀ Error: ${failure.error}`);
  return { error: failure.error, code: failure.code };
}

function toolResult<T>(result: T): T {
  appendLog("tool-result", `◀ ${JSON.stringify(result)}`);
  return result;
}

/**
 * Executes the get_page_state tool, returning the current rocket status and fuel level.
 */
export function execGetPageState(): { status: string; fuel: number } {
  const state = getState();
  appendLog("tool-call", "▶ get_page_state()");
  return toolResult({ status: state.status, fuel: state.fuel });
}

/**
 * Executes the calculate_fuel tool, returning the required amount and oxidizer ratio.
 *
 * @param input - The tool input arguments containing trajectory.
 */
export function execCalculateFuel(
  input: Record<string, unknown>,
): { trajectory: string; amount: number; oxidizerRatio: number } | ToolError {
  const trajectory = String(input["trajectory"] ?? "");
  appendLog(
    "tool-call",
    `▶ calculate_fuel({\n  trajectory: "${trajectory}"\n})`,
  );
  const result = calculateFuel(trajectory);
  if (!result.success) return toolError(result);
  return toolResult({
    trajectory: result.trajectory,
    amount: result.amount,
    oxidizerRatio: result.oxidizerRatio,
  });
}

/**
 * Executes the run_diagnostics tool, transitioning the system to the DIAGNOSTICS state.
 */
export function execRunDiagnostics(): { status: string } | ToolError {
  appendLog("tool-call", "▶ run_diagnostics()");
  const result = runDiagnostics();
  if (!result.success) return toolError(result);
  renderState();
  appendLog("state-marker", "[DIAGNOSTICS] Systems checked");
  return toolResult({ status: result.status });
}

/**
 * Executes the load_fuel tool, transitioning the system to the FUELED state.
 *
 * @param input - The tool input arguments containing amount and oxidizer_ratio.
 */
export function execLoadFuel(
  input: Record<string, unknown>,
): { status: string; fuelAmount: number; oxidizerRatio: number } | ToolError {
  const amount = Number(input["amount"]);
  const oxidizerRatio = Number(input["oxidizer_ratio"]);
  appendLog(
    "tool-call",
    `▶ load_fuel({\n  amount: ${amount},\n  oxidizer_ratio: ${oxidizerRatio}\n})`,
  );
  const result = loadFuel(amount, oxidizerRatio);
  if (!result.success) return toolError(result);
  renderState();
  appendLog("state-marker", "[FUELED] Propellants loaded");
  return toolResult({
    status: result.status,
    fuelAmount: result.fuelAmount,
    oxidizerRatio: result.oxidizerRatio,
  });
}

/**
 * Executes the prepare_launch tool, transitioning the system to the PREPARED state.
 *
 * @param input - The tool input arguments containing auth_code and trajectory.
 */
export function execPrepareLaunch(
  input: Record<string, unknown>,
): { status: string; trajectory: string } | ToolError {
  const authCode = String(input["auth_code"] ?? "");
  const trajectory = String(input["trajectory"] ?? "");
  appendLog(
    "tool-call",
    `▶ prepare_launch({\n  auth_code: "${authCode}",\n  trajectory: "${trajectory}"\n})`,
  );
  const result = prepareLaunch(authCode, trajectory);
  if (!result.success) return toolError(result);
  renderState();
  appendLog("state-marker", "[PREPARED] Systems warm");
  return toolResult({ status: result.status, trajectory: result.trajectory });
}

/**
 * Executes the ignite_engines tool, transitioning the system to the LAUNCHED state.
 */
export function execIgniteEngines(): { status: string } | ToolError {
  appendLog("tool-call", "▶ ignite_engines()");
  const result = igniteEngines();
  if (!result.success) return toolError(result);
  renderState();
  appendLog("state-marker", "[LAUNCHED] Engines firing");
  return toolResult({ status: result.status });
}

function execReset(toolName: string): { status: string; fuel: number } {
  appendLog("tool-call", `▶ ${toolName}()`);
  const result = resetSystem();
  renderState();
  appendLog("state-marker", "[IDLE] System initialized");
  return toolResult(result);
}

/**
 * Executes the abort_sequence tool, returning the system to the IDLE state.
 */
export function execAbortSequence(): { status: string; fuel: number } {
  return execReset("abort_sequence");
}

/**
 * Executes the reset_system tool, returning the system to the IDLE state.
 */
export function execResetSystem(): { status: string; fuel: number } {
  return execReset("reset_system");
}
