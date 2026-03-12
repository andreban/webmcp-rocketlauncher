/**
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/** The three possible states of the rocket launch system. */
export type Status = "IDLE" | "PREPARED" | "LAUNCHED";

/** The full state of the rocket launch system. */
export interface State {
  /** Current lifecycle status. */
  status: Status;
  /** Fuel level (0–100). Resets to 100 on {@link resetSystem}. */
  fuel: number;
  /** Destination set during {@link prepareLaunch}. Cleared on {@link resetSystem}. */
  trajectory?: string;
}

/**
 * The authorization code the user must provide to the agent.
 * Displayed on the page so the user can share it with the agent when asked.
 */
export const VALID_AUTH_CODE = "1234";

let state: State = { status: "IDLE", fuel: 100 };

type StateListener = () => void;
const listeners: StateListener[] = [];

/**
 * Subscribes to state changes. The listener is called after every successful
 * transition. Returns an unsubscribe function.
 */
export function subscribe(listener: StateListener): () => void {
  listeners.push(listener);
  return () => {
    const idx = listeners.indexOf(listener);
    if (idx !== -1) listeners.splice(idx, 1);
  };
}

function notify(): void {
  for (const l of listeners) l();
}

/** Returns a snapshot of the current rocket state. */
export function getState(): Readonly<State> {
  return { ...state };
}

/** Return type of {@link prepareLaunch}. */
export type PrepareResult =
  | { success: true; status: "PREPARED"; trajectory: string }
  | { success: false; error: string };

/**
 * Attempts to transition the system from `IDLE` to `PREPARED`.
 *
 * @param authCode - Must equal {@link VALID_AUTH_CODE}. The agent must ask the
 *   user for this value and never guess it.
 * @param trajectory - The launch destination (e.g. `"Moon"`, `"Mars"`).
 * @returns `PrepareResult` — success with the new status, or failure with an
 *   error string suitable for returning to the agent.
 */
export function prepareLaunch(
  authCode: string,
  trajectory: string,
): PrepareResult {
  if (state.status !== "IDLE") {
    return { success: false, error: "System must be in IDLE state." };
  }
  if (authCode !== VALID_AUTH_CODE) {
    return { success: false, error: "Invalid auth_code." };
  }
  state = { ...state, status: "PREPARED", trajectory };
  notify();
  return { success: true, status: "PREPARED", trajectory };
}

/** Return type of {@link igniteEngines}. */
export type IgniteResult =
  | { success: true; status: "LAUNCHED" }
  | { success: false; error: string };

/**
 * Attempts to transition the system from `PREPARED` to `LAUNCHED`.
 *
 * Intentionally returns an error when called from `IDLE` so the agent is
 * forced to discover the state gate and backtrack to {@link prepareLaunch}.
 *
 * @returns `IgniteResult` — success with the new status, or failure with an
 *   error string suitable for returning to the agent.
 */
export function igniteEngines(): IgniteResult {
  if (state.status !== "PREPARED") {
    return {
      success: false,
      error: "Ignition sequence inhibited. System must be in PREPARED state.",
    };
  }
  state = { ...state, status: "LAUNCHED" };
  notify();
  return { success: true, status: "LAUNCHED" };
}

/** Return type of {@link resetSystem}. */
export type ResetResult = { status: "IDLE"; fuel: number };

/**
 * Resets the system to its initial `IDLE` state with full fuel.
 * Clears trajectory. Valid from any state.
 */
export function resetSystem(): ResetResult {
  state = { status: "IDLE", fuel: 100 };
  notify();
  return { status: "IDLE", fuel: 100 };
}

/** Resets module-level state and listeners to `IDLE`. For use in tests only. */
export function _resetForTesting(): void {
  state = { status: "IDLE", fuel: 100 };
  listeners.length = 0;
}
