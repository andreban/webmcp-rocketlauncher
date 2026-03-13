/**
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  VALID_AUTH_CODE,
  _resetForTesting,
  getState,
  igniteEngines,
  prepareLaunch,
  resetSystem,
  runDiagnostics,
  loadFuel,
  subscribe,
} from "./state.ts";

beforeEach(() => {
  _resetForTesting();
});

describe("getState", () => {
  it("returns IDLE with fuel 100 initially", () => {
    expect(getState()).toEqual({ status: "IDLE", fuel: 100 });
  });
});

describe("runDiagnostics", () => {
  it("transitions IDLE → DIAGNOSTICS", () => {
    const result = runDiagnostics();
    expect(result).toEqual({ success: true, status: "DIAGNOSTICS" });
    expect(getState().status).toBe("DIAGNOSTICS");
  });

  it("rejects if not in IDLE state", () => {
    runDiagnostics();
    const result = runDiagnostics();
    expect(result).toEqual({
      success: false,
      error: "System must be in IDLE state to run diagnostics.",
    });
  });
});

describe("loadFuel", () => {
  it("transitions DIAGNOSTICS → FUELED with valid inputs", () => {
    runDiagnostics();
    const result = loadFuel(100, 2.5);
    expect(result).toEqual({
      success: true,
      status: "FUELED",
      fuelAmount: 100,
      oxidizerRatio: 2.5,
    });
    expect(getState().status).toBe("FUELED");
    expect(getState().fuelAmount).toBe(100);
    expect(getState().oxidizerRatio).toBe(2.5);
  });

  it("rejects if not in DIAGNOSTICS state", () => {
    const result = loadFuel(100, 2.5);
    expect(result).toEqual({
      success: false,
      error: "System must be in DIAGNOSTICS state to load fuel. Please run diagnostics.",
    });
  });
});

describe("prepareLaunch", () => {
  it("transitions FUELED → PREPARED with valid inputs", () => {
    runDiagnostics();
    loadFuel(100, 2.5);
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
    runDiagnostics();
    loadFuel(100, 2.5);
    const result = prepareLaunch("0000", "Moon");
    expect(result).toEqual({ success: false, error: "Invalid auth_code." });
    expect(getState().status).toBe("FUELED");
  });

  it("rejects if not in FUELED state", () => {
    const result = prepareLaunch(VALID_AUTH_CODE, "Mars");
    expect(result).toEqual({
      success: false,
      error: "System must be in FUELED state. Please load fuel.",
    });
  });
});

describe("igniteEngines", () => {
  it("transitions PREPARED → LAUNCHED", () => {
    runDiagnostics();
    loadFuel(100, 2.5);
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
    runDiagnostics();
    loadFuel(100, 2.5);
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
    runDiagnostics();
    loadFuel(100, 2.5);
    prepareLaunch(VALID_AUTH_CODE, "Moon");
    igniteEngines();
    const result = resetSystem();
    expect(result).toEqual({ status: "IDLE", fuel: 100 });
    expect(getState()).toEqual({ status: "IDLE", fuel: 100 });
  });

  it("clears trajectory on reset", () => {
    runDiagnostics();
    loadFuel(100, 2.5);
    prepareLaunch(VALID_AUTH_CODE, "Mars");
    igniteEngines();
    resetSystem();
    expect(getState().trajectory).toBeUndefined();
  });
});

describe("subscribe", () => {
  it("calls the listener after each successful transition", () => {
    const listener = vi.fn();
    subscribe(listener);
    runDiagnostics();
    expect(listener).toHaveBeenCalledTimes(1);
    loadFuel(100, 2.5);
    expect(listener).toHaveBeenCalledTimes(2);
    prepareLaunch(VALID_AUTH_CODE, "Moon");
    expect(listener).toHaveBeenCalledTimes(3);
    igniteEngines();
    expect(listener).toHaveBeenCalledTimes(4);
    resetSystem();
    expect(listener).toHaveBeenCalledTimes(5);
  });

  it("does not call the listener on failed transitions", () => {
    const listener = vi.fn();
    subscribe(listener);
    runDiagnostics();
    loadFuel(100, 2.5);
    prepareLaunch("wrong", "Moon");
    igniteEngines(); // called from FUELED — should fail
    expect(listener).toHaveBeenCalledTimes(2); // Only success calls runDiagnostics & loadFuel
  });

  it("stops calling the listener after unsubscribing", () => {
    const listener = vi.fn();
    const unsubscribe = subscribe(listener);
    runDiagnostics();
    unsubscribe();
    loadFuel(100, 2.5);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
