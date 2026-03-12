/**
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  getState,
  prepareLaunch,
  igniteEngines,
  resetSystem,
  VALID_AUTH_CODE,
} from "./state";

const app = document.getElementById("app")!;
const badge = document.querySelector<HTMLElement>(".status-badge")!;
const log = document.getElementById("log")!;
const authInput = document.getElementById("auth-code") as HTMLInputElement;
const trajectoryInput = document.getElementById(
  "trajectory",
) as HTMLSelectElement;
const authDisplay = document.getElementById("auth-display")!;
const btnPrepare = document.getElementById("btn-prepare") as HTMLButtonElement;
const btnIgnite = document.getElementById("btn-ignite") as HTMLButtonElement;
const btnReset = document.getElementById("btn-reset") as HTMLButtonElement;

const STATE_LABELS: Record<string, string> = {
  IDLE: "● IDLE",
  PREPARED: "● PREPARED",
  LAUNCHED: "● LAUNCHED",
};

const STATE_MARKERS: Record<string, string> = {
  IDLE: "[IDLE] System initialized",
  PREPARED: "[PREPARED] Systems warm",
  LAUNCHED: "[LAUNCHED] Engines firing",
};

export type LogEntryType =
  | "state-marker"
  | "tool-call"
  | "tool-result"
  | "tool-error";

export function appendLog(type: LogEntryType, text: string): void {
  const div = document.createElement("div");
  div.className = `log-entry ${type}`;
  div.textContent = text;
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}

export function renderState(): void {
  const { status } = getState();
  app.dataset.state = status;
  badge.dataset.state = status;
  badge.textContent = STATE_LABELS[status];
}

export function initUI(): void {
  // Show auth code
  authDisplay.textContent = VALID_AUTH_CODE;

  // Clear placeholder log entries and render live state
  log.innerHTML = "";
  renderState();
  appendLog("state-marker", STATE_MARKERS[getState().status]);

  btnPrepare.addEventListener("click", () => {
    const authCode = authInput.value.trim();
    const trajectory = trajectoryInput.value.trim();

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
      appendLog("state-marker", STATE_MARKERS[getState().status]);
    } else {
      appendLog("tool-error", `◀ Error: ${result.error}`);
    }
  });

  btnIgnite.addEventListener("click", () => {
    appendLog("tool-call", "▶ ignite_engines()");

    const result = igniteEngines();
    if (result.success) {
      appendLog(
        "tool-result",
        `◀ ${JSON.stringify({ status: result.status })}`,
      );
      renderState();
      appendLog("state-marker", STATE_MARKERS[getState().status]);
    } else {
      appendLog("tool-error", `◀ Error: ${result.error}`);
    }
  });

  btnReset.addEventListener("click", () => {
    appendLog("tool-call", "▶ reset_system()");
    const result = resetSystem();
    appendLog("tool-result", `◀ ${JSON.stringify(result)}`);
    renderState();
    appendLog("state-marker", STATE_MARKERS[getState().status]);
  });
}
