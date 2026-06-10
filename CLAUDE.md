# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install           # install dependencies
npm run dev           # start Vite dev server
npm run build         # type-check + build to dist/
npm run preview       # preview the production build
npm run test          # run tests once (vitest)
npm run test:watch    # run tests in watch mode
npm run format        # format all files with prettier
npm run format:check  # check formatting without writing
```

Type-checking is done via `tsc` as part of `npm run build`. Tests use Vitest. Unit tests live alongside source files as `*.test.ts`.

Always run `npm run format`, `npm run test`, and `npm run build` before committing. Always write unit tests for new modules.

## Requirements

- **Chrome 146+** with `chrome://flags/#enable-webmcp-testing` set to Enabled
- The [Model Context Tool Inspector Extension](https://googlechromelabs.github.io/webmcp-tools/) for manual tool testing and agent interaction

## Architecture

This is a Vite + TypeScript + Vanilla JS app (no framework). The app demonstrates WebMCP — a browser-native API that exposes structured tools to in-browser AI agents via `document.modelContext`.

### WebMCP Imperative API

Tools are registered on page load using:

```ts
document.modelContext.registerTool({
  name,
  description,
  inputSchema,
  execute,
});
```

The `execute` function runs directly in the browser when the Chrome Extension calls a tool. It must return `{ content: [{ type: "text", text: string }] }`. There is no server — all state and tool logic lives in the browser.

Type definitions for `document.modelContext` live in `src/types/webmcp.d.ts` (sourced from the GoogleChromeLabs repo).

### State Machine

The app has three states: `IDLE` → `PREPARED` → `LAUNCHED` → `IDLE`. State is held in a TypeScript module (`src/state.ts`). The four registered tools map directly to state transitions:

| Tool             | Transition              |
| ---------------- | ----------------------- |
| `get_page_state` | read-only               |
| `prepare_launch` | `IDLE` → `PREPARED`     |
| `ignite_engines` | `PREPARED` → `LAUNCHED` |
| `reset_system`   | `LAUNCHED` → `IDLE`     |

`ignite_engines` is always registered but intentionally returns an error when called from `IDLE` — this forces the agent to discover and handle the state gate.

### UI

Two-panel layout: left panel shows the rocket SVG and status badge; right panel shows a tool call log. The log is populated entirely from within `execute()` handlers — no browser events are needed for this with the imperative API.

### License

All source files must include this header:

```ts
/**
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
```

For HTML files use `<!-- Copyright 2026 Google LLC / SPDX-License-Identifier: Apache-2.0 -->`.
For CSS files use the `/* ... */` block form.

### Commits

Do not add `Co-Authored-By` trailers to commits.
