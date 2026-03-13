/**
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  getState,
  runDiagnostics,
  loadFuel,
  prepareLaunch,
  igniteEngines,
  resetSystem,
  VALID_AUTH_CODE,
} from "./state";

const app = document.getElementById("app")!;
const badge = document.querySelector<HTMLElement>(".status-badge")!;

const authInput = document.getElementById("auth-code") as HTMLInputElement;
const trajectoryInput = document.getElementById(
  "trajectory",
) as HTMLSelectElement;
const authDisplay = document.getElementById("auth-display")!;
const btnDiagnostics = document.getElementById("btn-diagnostics") as HTMLButtonElement;
const fuelAmountInput = document.getElementById("fuel-amount") as HTMLInputElement;
const oxidizerRatioInput = document.getElementById("oxidizer-ratio") as HTMLInputElement;
const btnFuel = document.getElementById("btn-fuel") as HTMLButtonElement;
const btnPrepare = document.getElementById("btn-prepare") as HTMLButtonElement;
const btnIgnite = document.getElementById("btn-ignite") as HTMLButtonElement;
const btnAbort = document.getElementById("btn-abort") as HTMLButtonElement;
const btnReset = document.getElementById("btn-reset") as HTMLButtonElement;

const STATE_LABELS: Record<string, string> = {
  IDLE: "● IDLE",
  DIAGNOSTICS: "● DIAGNOSTICS",
  FUELED: "● FUELED",
  PREPARED: "● PREPARED",
  LAUNCHED: "● LAUNCHED",
};

const STATE_MARKERS: Record<string, string> = {
  IDLE: "[IDLE] System initialized",
  DIAGNOSTICS: "[DIAGNOSTICS] Systems checked",
  FUELED: "[FUELED] Propellants loaded",
  PREPARED: "[PREPARED] Systems warm",
  LAUNCHED: "[LAUNCHED] Engines firing",
};

/** Types of log entries that can be displayed in the UI. */
export type LogEntryType =
  | "state-marker"
  | "tool-call"
  | "tool-result"
  | "tool-error";

/**
 * Appends a log entry to the log panel (Removed functionality, kept as no-op for backward compat if needed or just logged to console).
 *
 * @param type - The styling category of the log entry.
 * @param text - The content of the log entry.
 */
export function appendLog(type: LogEntryType, text: string): void {
  console.log(`[${type}] ${text}`);
}

export function renderState(): void {
  const state = getState();
  const { status } = state;
  app.dataset.state = status;
  badge.dataset.state = status;
  badge.textContent = STATE_LABELS[status];

  // Update state nodes
  const nodes = document.querySelectorAll(".state-node");
  const connectors = document.querySelectorAll(".node-connector");

  let stateIndex = 0;
  switch (status) {
    case "IDLE": stateIndex = 0; break;
    case "DIAGNOSTICS": stateIndex = 1; break;
    case "FUELED": stateIndex = 2; break;
    case "PREPARED": stateIndex = 3; break;
    case "LAUNCHED": stateIndex = 4; break;
  }

  // Update classes for nodes and connectors
  nodes.forEach((node, index) => {
    node.classList.remove("active", "completed");
    if (index < stateIndex) {
      node.classList.add("completed");
    } else if (index === stateIndex) {
      node.classList.add("active");
    }
  });

  connectors.forEach((connector, index) => {
    connector.classList.remove("completed");
    if (index < stateIndex) {
      connector.classList.add("completed");
    }
  });

  // Update specific node details
  const idleFuelEl = document.getElementById("state-idle-fuel");
  if (idleFuelEl) idleFuelEl.textContent = state.fuel.toString();

  const fueledAmountEl = document.getElementById("state-fueled-amount");
  const fueledRatioEl = document.getElementById("state-fueled-ratio");
  if (fueledAmountEl) fueledAmountEl.textContent = state.fuelAmount !== undefined ? state.fuelAmount.toString() : "--";
  if (fueledRatioEl) fueledRatioEl.textContent = state.oxidizerRatio !== undefined ? state.oxidizerRatio.toString() : "--";

  const preparedTrajectoryEl = document.getElementById("state-prepared-trajectory");
  const preparedAuthEl = document.getElementById("state-prepared-auth");
  if (preparedTrajectoryEl) preparedTrajectoryEl.textContent = state.trajectory || "--";
  if (preparedAuthEl) preparedAuthEl.textContent = state.authCode || "--";
}

/**
 * Initializes the UI, setting up event listeners for manual controls
 * and rendering the initial state.
 */
export function initUI(): void {
  // Show auth code
  authDisplay.textContent = VALID_AUTH_CODE;

  // Clear placeholder log entries and render live state
  renderState();
  appendLog("state-marker", STATE_MARKERS[getState().status]);

  const drawerToggle = document.getElementById("drawer-toggle")!;
  const drawer = document.getElementById("manual-controls-drawer")!;
  drawerToggle.addEventListener("click", () => {
    drawer.classList.toggle("open");
  });

  btnDiagnostics.addEventListener("click", () => {
    appendLog("tool-call", "▶ run_diagnostics()");
    const result = runDiagnostics();
    if (result.success) {
      appendLog("tool-result", `◀ ${JSON.stringify(result)}`);
      renderState();
      appendLog("state-marker", STATE_MARKERS[getState().status]);
    } else {
      appendLog("tool-error", `◀ Error: ${result.error}`);
    }
  });

  btnFuel.addEventListener("click", () => {
    const amount = Number(fuelAmountInput.value);
    const oxidizerRatio = Number(oxidizerRatioInput.value);

    appendLog(
      "tool-call",
      `▶ load_fuel({\n  amount: ${amount},\n  oxidizerRatio: ${oxidizerRatio}\n})`
    );

    const result = loadFuel(amount, oxidizerRatio);
    if (result.success) {
      appendLog(
        "tool-result",
        `◀ ${JSON.stringify({ status: result.status, fuelAmount: result.fuelAmount, oxidizerRatio: result.oxidizerRatio })}`
      );
      renderState();
      appendLog("state-marker", STATE_MARKERS[getState().status]);
    } else {
      appendLog("tool-error", `◀ Error: ${result.error}`);
    }
  });

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

  btnAbort.addEventListener("click", () => {
    appendLog("tool-call", "▶ abort_sequence()");
    const result = resetSystem();
    appendLog("tool-result", `◀ ${JSON.stringify(result)}`);
    renderState();
    appendLog("state-marker", STATE_MARKERS[getState().status]);
  });

  btnReset.addEventListener("click", () => {
    appendLog("tool-call", "▶ reset_system()");
    const result = resetSystem();
    appendLog("tool-result", `◀ ${JSON.stringify(result)}`);
    renderState();
    appendLog("state-marker", STATE_MARKERS[getState().status]);
  });
}
