/**
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
  VALID_AUTH_CODE,
  _resetForTesting,
  getState,
  igniteEngines,
  prepareLaunch,
  resetSystem,
} from "./state.ts";

beforeEach(() => {
  _resetForTesting();
});

describe("getState", () => {
  it("returns IDLE with fuel 100 initially", () => {
    expect(getState()).toEqual({ status: "IDLE", fuel: 100 });
  });
});

describe("prepareLaunch", () => {
  it("transitions IDLE → PREPARED with valid inputs", () => {
    const result = prepareLaunch(VALID_AUTH_CODE, "Moon");
    expect(result).toEqual({
      success: true,
      status: "PREPARED",
      trajectory: "Moon",
    });
    expect(getState().status).toBe("PREPARED");
    expect(getState().trajectory).toBe("Moon");
  });

  it("rejects an invalid auth_code", () => {
    const result = prepareLaunch("0000", "Moon");
    expect(result).toEqual({ success: false, error: "Invalid auth_code." });
    expect(getState().status).toBe("IDLE");
  });

  it("rejects if not in IDLE state", () => {
    prepareLaunch(VALID_AUTH_CODE, "Moon");
    const result = prepareLaunch(VALID_AUTH_CODE, "Mars");
    expect(result).toEqual({
      success: false,
      error: "System must be in IDLE state.",
    });
  });
});

describe("igniteEngines", () => {
  it("transitions PREPARED → LAUNCHED", () => {
    prepareLaunch(VALID_AUTH_CODE, "Moon");
    const result = igniteEngines();
    expect(result).toEqual({ success: true, status: "LAUNCHED" });
    expect(getState().status).toBe("LAUNCHED");
  });

  it("rejects if called from IDLE", () => {
    const result = igniteEngines();
    expect(result).toEqual({
      success: false,
      error: "Ignition sequence inhibited. System must be in PREPARED state.",
    });
    expect(getState().status).toBe("IDLE");
  });

  it("rejects if called again after LAUNCHED", () => {
    prepareLaunch(VALID_AUTH_CODE, "Moon");
    igniteEngines();
    const result = igniteEngines();
    expect(result).toEqual({
      success: false,
      error: "Ignition sequence inhibited. System must be in PREPARED state.",
    });
  });
});

describe("resetSystem", () => {
  it("transitions LAUNCHED → IDLE with full fuel", () => {
    prepareLaunch(VALID_AUTH_CODE, "Moon");
    igniteEngines();
    const result = resetSystem();
    expect(result).toEqual({ status: "IDLE", fuel: 100 });
    expect(getState()).toEqual({ status: "IDLE", fuel: 100 });
  });

  it("clears trajectory on reset", () => {
    prepareLaunch(VALID_AUTH_CODE, "Mars");
    igniteEngines();
    resetSystem();
    expect(getState().trajectory).toBeUndefined();
  });
});
