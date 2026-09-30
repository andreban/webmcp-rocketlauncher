/**
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { vi } from "vitest";

/** In-memory stand-in for `document.modelContext`, for use in tests only. */
export interface FakeModelContext {
  /** Currently registered tools, keyed by name. */
  tools: Map<string, WebMCP.ModelContextTool>;
  registerTool: ReturnType<typeof vi.fn>;
}

/**
 * Creates a fake model context that mirrors the spec's registration rules:
 * duplicate names reject, and aborting the registration signal unregisters.
 */
export function createFakeModelContext(): FakeModelContext {
  const tools = new Map<string, WebMCP.ModelContextTool>();
  const registerTool = vi.fn(
    (
      tool: WebMCP.ModelContextTool,
      options: WebMCP.ModelContextRegisterToolOptions = {},
    ): Promise<void> => {
      if (tools.has(tool.name)) {
        return Promise.reject(
          new DOMException(
            `Duplicate tool name: ${tool.name}`,
            "InvalidStateError",
          ),
        );
      }
      if (options.signal?.aborted) return Promise.resolve();
      tools.set(tool.name, tool);
      options.signal?.addEventListener("abort", () => tools.delete(tool.name));
      return Promise.resolve();
    },
  );
  return { tools, registerTool };
}

/** Executes a registered fake tool the way the browser would. */
export async function executeTool(
  ctx: FakeModelContext,
  name: string,
  input: Record<string, unknown> = {},
): Promise<unknown> {
  const tool = ctx.tools.get(name);
  if (!tool) throw new Error(`Tool not registered: ${name}`);
  return tool.execute(input, { signal: new AbortController().signal });
}
