/**
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/** The five possible states of the rocket launch system. */
export type Status =
  | "IDLE"
  | "DIAGNOSTICS"
  | "FUELED"
  | "PREPARED"
  | "LAUNCHED";

/** The full state of the rocket launch system. */
export interface State {
  /** Current lifecycle status. */
  status: Status;
  /** Fuel level (0–100). Resets to 100 on {@link resetSystem}. */
  fuel: number;
  /** Destination set during {@link prepareLaunch}. Cleared on {@link resetSystem}. */
  trajectory?: Trajectory;
  /** Fuel amount loaded. */
  fuelAmount?: number;
  /** Oxidizer ratio loaded. */
  oxidizerRatio?: number;
  /** Auth code used. */
  authCode?: string;
}

/**
 * The authorization code the user must provide to the agent.
 * Displayed on the page so the user can share it with the agent when asked.
 */
export const VALID_AUTH_CODE = "1234";

/** The supported launch destinations. */
export const TRAJECTORIES = [
  "Moon",
  "Mars",
  "ISS",
  "Jupiter",
  "Alpha Centauri",
] as const;

/** A supported launch destination. */
export type Trajectory = (typeof TRAJECTORIES)[number];

/** Accepted range for the fuel amount, in tons. */
export const FUEL_AMOUNT_RANGE = { min: 1, max: 500 } as const;

/** Accepted range for the oxidizer ratio. */
export const OXIDIZER_RATIO_RANGE = { min: 1, max: 5 } as const;

/** Machine-readable reason a transition was rejected. */
export type ErrorCode = "INVALID_STATE" | "INVALID_AUTH_CODE" | "INVALID_INPUT";

/** A rejected transition. `error` is suitable for returning to the agent. */
export type Failure = { success: false; code: ErrorCode; error: string };

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

function fail(code: ErrorCode, error: string): Failure {
  return { success: false, code, error };
}

function unknownTrajectory(trajectory: string): Failure {
  return fail(
    "INVALID_INPUT",
    `Unknown trajectory "${trajectory}". Supported destinations: ${TRAJECTORIES.join(", ")}.`,
  );
}

/** Returns a snapshot of the current rocket state. */
export function getState(): Readonly<State> {
  return { ...state };
}

/**
 * Resolves a user-supplied destination to a supported {@link Trajectory},
 * ignoring case and surrounding whitespace.
 *
 * @returns The matching trajectory, or `undefined` if it is not supported.
 */
export function normalizeTrajectory(value: string): Trajectory | undefined {
  const needle = value.trim().toLowerCase();
  return TRAJECTORIES.find((t) => t.toLowerCase() === needle);
}

const FUEL_PROFILES: Record<
  Trajectory,
  { amount: number; oxidizerRatio: number }
> = {
  Moon: { amount: 100, oxidizerRatio: 2.5 },
  Mars: { amount: 250, oxidizerRatio: 3.2 },
  ISS: { amount: 50, oxidizerRatio: 2.0 },
  Jupiter: { amount: 400, oxidizerRatio: 4.0 },
  "Alpha Centauri": { amount: 500, oxidizerRatio: 5.0 },
};

/** Return type of {@link calculateFuel}. */
export type CalculateFuelResult =
  | {
      success: true;
      trajectory: Trajectory;
      amount: number;
      oxidizerRatio: number;
    }
  | Failure;

/**
 * Returns the fuel amount and oxidizer ratio required for a destination.
 * Does not change state.
 *
 * @param trajectory - The launch destination, matched case-insensitively
 *   against {@link TRAJECTORIES}.
 */
export function calculateFuel(trajectory: string): CalculateFuelResult {
  const resolved = normalizeTrajectory(trajectory);
  if (!resolved) return unknownTrajectory(trajectory);
  return { success: true, trajectory: resolved, ...FUEL_PROFILES[resolved] };
}

/** Return type of {@link runDiagnostics}. */
export type DiagnosticsResult =
  | { success: true; status: "DIAGNOSTICS" }
  | Failure;

/**
 * Attempts to transition the system from `IDLE` to `DIAGNOSTICS`.
 *
 * @returns `DiagnosticsResult` — success with the new status, or failure with an
 *   error string suitable for returning to the agent.
 */
export function runDiagnostics(): DiagnosticsResult {
  if (state.status !== "IDLE") {
    return fail(
      "INVALID_STATE",
      "System must be in IDLE state to run diagnostics.",
    );
  }
  state = { ...state, status: "DIAGNOSTICS" };
  notify();
  return { success: true, status: "DIAGNOSTICS" };
}

/** Return type of {@link loadFuel}. */
export type LoadFuelResult =
  | {
      success: true;
      status: "FUELED";
      fuelAmount: number;
      oxidizerRatio: number;
    }
  | Failure;

function inRange(value: number, range: { min: number; max: number }): boolean {
  return Number.isFinite(value) && value >= range.min && value <= range.max;
}

/**
 * Attempts to transition the system from `DIAGNOSTICS` to `FUELED`.
 *
 * @param amount - Fuel amount in tons, within {@link FUEL_AMOUNT_RANGE}.
 * @param oxidizerRatio - Oxidizer ratio, within {@link OXIDIZER_RATIO_RANGE}.
 * @returns `LoadFuelResult` — success with the new status, or failure with an
 *   error string suitable for returning to the agent.
 */
export function loadFuel(
  amount: number,
  oxidizerRatio: number,
): LoadFuelResult {
  if (state.status !== "DIAGNOSTICS") {
    return fail(
      "INVALID_STATE",
      "System must be in DIAGNOSTICS state to load fuel. Please run diagnostics.",
    );
  }
  if (!inRange(amount, FUEL_AMOUNT_RANGE)) {
    return fail(
      "INVALID_INPUT",
      `Fuel amount must be between ${FUEL_AMOUNT_RANGE.min} and ${FUEL_AMOUNT_RANGE.max} tons.`,
    );
  }
  if (!inRange(oxidizerRatio, OXIDIZER_RATIO_RANGE)) {
    return fail(
      "INVALID_INPUT",
      `Oxidizer ratio must be between ${OXIDIZER_RATIO_RANGE.min} and ${OXIDIZER_RATIO_RANGE.max}.`,
    );
  }
  state = { ...state, status: "FUELED", fuelAmount: amount, oxidizerRatio };
  notify();
  return { success: true, status: "FUELED", fuelAmount: amount, oxidizerRatio };
}

/** Return type of {@link prepareLaunch}. */
export type PrepareResult =
  | { success: true; status: "PREPARED"; trajectory: Trajectory }
  | Failure;

/**
 * Attempts to transition the system from `FUELED` to `PREPARED`.
 *
 * @param authCode - Must equal {@link VALID_AUTH_CODE}. The agent must ask the
 *   user for this value and never guess it.
 * @param trajectory - The launch destination (e.g. `"Moon"`, `"Mars"`), matched
 *   case-insensitively against {@link TRAJECTORIES}.
 * @returns `PrepareResult` — success with the new status, or failure with an
 *   error string suitable for returning to the agent.
 */
export function prepareLaunch(
  authCode: string,
  trajectory: string,
): PrepareResult {
  if (state.status !== "FUELED") {
    return fail(
      "INVALID_STATE",
      "System must be in FUELED state. Please load fuel.",
    );
  }
  if (authCode !== VALID_AUTH_CODE) {
    return fail(
      "INVALID_AUTH_CODE",
      "Invalid auth_code. Ask the user for the correct 4-digit code.",
    );
  }
  const resolved = normalizeTrajectory(trajectory);
  if (!resolved) return unknownTrajectory(trajectory);
  state = { ...state, status: "PREPARED", trajectory: resolved, authCode };
  notify();
  return { success: true, status: "PREPARED", trajectory: resolved };
}

/** Return type of {@link igniteEngines}. */
export type IgniteResult = { success: true; status: "LAUNCHED" } | Failure;

/**
 * Attempts to transition the system from `PREPARED` to `LAUNCHED`.
 *
 * Intentionally returns an error when called from any other state so the agent
 * is forced to discover the state gate and backtrack through the sequence.
 *
 * @returns `IgniteResult` — success with the new status, or failure with an
 *   error string suitable for returning to the agent.
 */
export function igniteEngines(): IgniteResult {
  if (state.status !== "PREPARED") {
    return fail(
      "INVALID_STATE",
      "Ignition sequence inhibited. System must be in PREPARED state.",
    );
  }
  state = { ...state, status: "LAUNCHED" };
  notify();
  return { success: true, status: "LAUNCHED" };
}

/** Return type of {@link resetSystem}. */
export type ResetResult = { status: "IDLE"; fuel: number };

/**
 * Resets the system to its initial `IDLE` state with full fuel.
 * Clears all parameters. Valid from any state; backs both `abort_sequence`
 * and `reset_system`.
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
