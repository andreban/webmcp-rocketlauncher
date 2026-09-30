/**
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VALID_AUTH_CODE, _resetForTesting } from "../state";
import { initDynamicTools } from "./dynamic";
import { initStaticTools } from "./static";
import {
  createFakeModelContext,
  executeTool,
  type FakeModelContext,
} from "./testing";

vi.mock("../ui", () => ({ appendLog: vi.fn(), renderState: vi.fn() }));

let ctx: FakeModelContext;

function registeredNames(): string[] {
  return [...ctx.tools.keys()].sort();
}

beforeEach(() => {
  _resetForTesting();
  ctx = createFakeModelContext();
  vi.stubGlobal("document", { modelContext: ctx });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("static mode", () => {
  it("registers every tool up-front", () => {
    initStaticTools();
    expect(registeredNames()).toEqual([
      "abort_sequence",
      "calculate_fuel",
      "get_page_state",
      "ignite_engines",
      "load_fuel",
      "prepare_launch",
      "reset_system",
      "run_diagnostics",
    ]);
  });

  it("marks only the query tools as read-only and none as consequential", () => {
    initStaticTools();
    for (const tool of ctx.tools.values()) {
      const readOnly = ["get_page_state", "calculate_fuel"].includes(tool.name);
      expect(tool.annotations?.readOnlyHint, tool.name).toBe(readOnly);
      expect(tool.annotations?.consequentialHint, tool.name).toBeUndefined();
    }
  });

  it("keeps tool budgets within WebMCP limits", () => {
    initStaticTools();
    for (const tool of ctx.tools.values()) {
      expect(tool.name.length, tool.name).toBeLessThanOrEqual(30);
      expect(tool.description.length, tool.name).toBeLessThanOrEqual(500);
    }
  });
});

describe("dynamic mode", () => {
  it("registers only the tools valid for each state", async () => {
    initDynamicTools();
    expect(registeredNames()).toEqual([
      "calculate_fuel",
      "get_page_state",
      "run_diagnostics",
    ]);

    await executeTool(ctx, "run_diagnostics");
    expect(registeredNames()).toEqual([
      "abort_sequence",
      "calculate_fuel",
      "get_page_state",
      "load_fuel",
    ]);

    await executeTool(ctx, "load_fuel", { amount: 100, oxidizer_ratio: 2.5 });
    expect(registeredNames()).toEqual([
      "abort_sequence",
      "calculate_fuel",
      "get_page_state",
      "prepare_launch",
    ]);

    await executeTool(ctx, "prepare_launch", {
      auth_code: VALID_AUTH_CODE,
      trajectory: "Moon",
    });
    expect(registeredNames()).toEqual([
      "abort_sequence",
      "calculate_fuel",
      "get_page_state",
      "ignite_engines",
    ]);

    await executeTool(ctx, "ignite_engines");
    expect(registeredNames()).toEqual([
      "calculate_fuel",
      "get_page_state",
      "reset_system",
    ]);
  });

  it("re-registers the IDLE tools after a reset without duplicate errors", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    initDynamicTools();
    await executeTool(ctx, "run_diagnostics");
    await executeTool(ctx, "abort_sequence");
    await Promise.resolve();

    expect(registeredNames()).toEqual([
      "calculate_fuel",
      "get_page_state",
      "run_diagnostics",
    ]);
    expect(consoleError).not.toHaveBeenCalled();
  });
});
