/**
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { VALID_AUTH_CODE, _resetForTesting, getState } from "../state";
import {
  execAbortSequence,
  execCalculateFuel,
  execGetPageState,
  execIgniteEngines,
  execLoadFuel,
  execPrepareLaunch,
  execResetSystem,
  execRunDiagnostics,
} from "./execute";

vi.mock("../ui", () => ({ appendLog: vi.fn(), renderState: vi.fn() }));

beforeEach(() => {
  _resetForTesting();
});

describe("tool results", () => {
  it("returns plain JSON-serializable objects, not MCP content wrappers", () => {
    expect(execGetPageState()).toEqual({ status: "IDLE", fuel: 100 });
  });

  it("runs the full launch sequence", () => {
    expect(execRunDiagnostics()).toEqual({ status: "DIAGNOSTICS" });
    expect(execLoadFuel({ amount: 250, oxidizer_ratio: 3.2 })).toEqual({
      status: "FUELED",
      fuelAmount: 250,
      oxidizerRatio: 3.2,
    });
    expect(
      execPrepareLaunch({ auth_code: VALID_AUTH_CODE, trajectory: "Mars" }),
    ).toEqual({ status: "PREPARED", trajectory: "Mars" });
    expect(execIgniteEngines()).toEqual({ status: "LAUNCHED" });
    expect(execResetSystem()).toEqual({ status: "IDLE", fuel: 100 });
  });

  it("calculates fuel for a known trajectory", () => {
    expect(execCalculateFuel({ trajectory: "ISS" })).toEqual({
      trajectory: "ISS",
      amount: 50,
      oxidizerRatio: 2.0,
    });
  });

  it("aborts back to IDLE", () => {
    execRunDiagnostics();
    expect(execAbortSequence()).toEqual({ status: "IDLE", fuel: 100 });
    expect(getState().status).toBe("IDLE");
  });
});

describe("tool errors", () => {
  it("resolves a structured error for a wrong-state call", () => {
    expect(execIgniteEngines()).toEqual({
      error: "Ignition sequence inhibited. System must be in PREPARED state.",
      code: "INVALID_STATE",
    });
  });

  it("resolves a structured error for an invalid auth code", () => {
    execRunDiagnostics();
    execLoadFuel({ amount: 100, oxidizer_ratio: 2.5 });
    expect(
      execPrepareLaunch({ auth_code: "0000", trajectory: "Moon" }),
    ).toMatchObject({ code: "INVALID_AUTH_CODE" });
  });

  it("resolves a structured error for missing fuel inputs", () => {
    execRunDiagnostics();
    expect(execLoadFuel({})).toMatchObject({ code: "INVALID_INPUT" });
  });

  it("resolves a structured error for an unknown trajectory", () => {
    expect(execCalculateFuel({ trajectory: "Pluto" })).toMatchObject({
      code: "INVALID_INPUT",
    });
  });
});
