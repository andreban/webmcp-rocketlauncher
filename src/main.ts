/**
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import "./style.css";
import { initUI } from "./ui";
import { initTools, type RegistrationMode } from "./tools";

const params = new URLSearchParams(window.location.search);
const mode = (params.get("mode") ?? "static") as RegistrationMode;

document
  .querySelectorAll<HTMLAnchorElement>("#mode-switcher a")
  .forEach((a) => {
    if (a.dataset["mode"] === mode) a.classList.add("active");
  });

initUI();
initTools(mode);

window.addEventListener("load", () => {
  document.body.classList.remove("preload");
});
