/**
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { getState, prepareLaunch, igniteEngines, resetSystem } from "../state";
import { appendLog, renderState } from "../ui";

export function ok(data: unknown): object {
  return { content: [{ type: "text", text: JSON.stringify(data) }] };
}

export function err(message: string): object {
  return { content: [{ type: "text", text: `Error: ${message}` }] };
}

export function execGetPageState(): object {
  const state = getState();
  appendLog("tool-call", "▶ get_page_state()");
  const result = { status: state.status, fuel: state.fuel };
  appendLog("tool-result", `◀ ${JSON.stringify(result)}`);
  return ok(result);
}

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

export function execResetSystem(): object {
  appendLog("tool-call", "▶ reset_system()");
  const result = resetSystem();
  appendLog("tool-result", `◀ ${JSON.stringify(result)}`);
  renderState();
  appendLog("state-marker", "[IDLE] System initialized");
  return ok(result);
}
