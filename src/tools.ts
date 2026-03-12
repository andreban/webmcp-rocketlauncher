/**
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { initStaticTools } from "./tools/static";
import { initDynamicTools } from "./tools/dynamic";

export type RegistrationMode = "static" | "dynamic";

export function initTools(mode: RegistrationMode): void {
  if (!navigator.modelContext) return;
  if (mode === "static") {
    initStaticTools();
  } else {
    initDynamicTools();
  }
}
