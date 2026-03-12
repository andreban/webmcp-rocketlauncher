/**
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { initStaticTools } from "./tools/static";
import { initDynamicTools } from "./tools/dynamic";

/** The type of WebMCP tool registration to use. */
export type RegistrationMode = "static" | "dynamic";

/**
 * Initializes the WebMCP tools for the application based on the given registration mode.
 *
 * @param mode - The registration mode ("static" or "dynamic").
 */
export function initTools(mode: RegistrationMode): void {
  if (!navigator.modelContext) return;
  if (mode === "static") {
    initStaticTools();
  } else {
    initDynamicTools();
  }
}
