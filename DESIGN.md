# PRD: WebMCP Rocket Launch Demo

## 1. Document Overview

| Field            | Value                                                                                                                                                                        |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Project Name** | WebMCP Rocket Launch State Machine                                                                                                                                           |
| **Version**      | 1.0.0                                                                                                                                                                        |
| **Status**       | Draft                                                                                                                                                                        |
| **Objective**    | Demonstrate an AI agent resolving tool dependencies and managing webpage state via WebMCP — a browser-native protocol for exposing structured tools to in-browser AI agents. |

---

## 2. Product Summary

A technical showcase where an AI agent must navigate a **State Gate**. The primary action (`ignite_engines`) is locked behind a prerequisite state (`PREPARED`). The agent must discover the error, backtrack to the preparation step, gather required parameters from the user, and complete the sequence — without hallucinating any values.

Tools are registered client-side via `navigator.modelContext.registerTool()`. No backend server is required.

---

## 3. Tech Stack

| Layer             | Choice                                               |
| ----------------- | ---------------------------------------------------- |
| **Bundler**       | Vite                                                 |
| **Language**      | TypeScript                                           |
| **UI**            | Vanilla JS (no framework)                            |
| **Tool Protocol** | WebMCP (Imperative API via `navigator.modelContext`) |
| **Styling**       | Plain CSS                                            |

### Requirements

- **Chrome 146+** with the `#enable-webmcp-testing` flag enabled (`chrome://flags/#enable-webmcp-testing`)
- The [Model Context Tool Inspector Extension](https://googlechromelabs.github.io/webmcp-tools/) is recommended for development and manual tool testing

### Architecture

All tools are registered in the browser via `navigator.modelContext.registerTool()`. The state machine is held in TypeScript module state — no server required. The agent is provided by the **Model Context Tool Inspector Extension**, which reads the page's registered tools and drives the interaction via its built-in Gemini model.

```
Browser Tab
└── Vite + TypeScript app
    ├── State machine (IDLE / PREPARED / LAUNCHED)
    ├── navigator.modelContext.registerTool(...)  ← WebMCP Imperative API
    └── UI (rocket SVG, status badge)

Model Context Tool Inspector Extension (Chrome)
└── Reads registered tools from the page
└── Drives agent loop via Gemini 2.5 Flash (user provides API key)
```

---

## 4. State Machine

### 4.1 States

| State      | Description                                  | UI Color |
| ---------- | -------------------------------------------- | -------- |
| `IDLE`     | Initial state. Systems cold.                 | Red      |
| `PREPARED` | Auth verified, trajectory set, systems warm. | Yellow   |
| `LAUNCHED` | Engines firing. Animation active.            | Green    |

### 4.2 Transitions

```
IDLE  ──[prepare_launch]──▶  PREPARED  ──[ignite_engines]──▶  LAUNCHED
                                                                    │
                              IDLE  ◀──────[reset_system]──────────┘
```

---

## 5. WebMCP Tool Specifications

All tools are registered using the **Imperative API**:

```ts
navigator.modelContext.registerTool({
  name,
  description,
  inputSchema,
  execute,
});
```

The `execute` function must return `{ content: [{ type: "text", text: string }] }`.

### 5.1 Registration Strategies

The app supports two tool registration strategies, selectable via the `?mode=` URL query parameter. This enables direct comparison of how each pattern affects agent behavior.

#### Strategy A — Static (`?mode=static`, default)

All four tools are registered once on page load and remain registered for the entire session. Tool descriptions include state prerequisites so the agent understands when each tool is applicable. `ignite_engines` intentionally returns an error when called from `IDLE` — the agent must discover this, backtrack, and call `prepare_launch` first.

This is the **error-driven discovery** pattern: the agent navigates via error messages and tool descriptions.

#### Strategy B — Dynamic (`?mode=dynamic`)

Only the tools valid for the current state are registered at any given time. On each successful state transition, stale tools are unregistered via `navigator.modelContext.unregisterTool()` and replacement tools are registered:

| State      | Registered tools                   |
| ---------- | ---------------------------------- |
| `IDLE`     | `get_page_state`, `prepare_launch` |
| `PREPARED` | `get_page_state`, `ignite_engines` |
| `LAUNCHED` | `get_page_state`, `reset_system`   |

This is the **context-driven availability** pattern: the agent only sees tools it can legally call. No wrong-state errors are possible, but the backtrack-from-error behavior is also eliminated.

Registration is kept in sync via a state subscription (`state.subscribe()`), so both manual button clicks and agent tool calls trigger re-registration automatically.

#### Comparison

| Aspect                         | Static | Dynamic |
| ------------------------------ | ------ | ------- |
| Agent sees wrong-state tools?  | Yes    | No      |
| Agent must interpret errors?   | Yes    | No      |
| Tool list changes mid-session? | No     | Yes     |
| Error-driven backtrack path?   | Yes    | No      |

---

### 5.2 Tool Definitions

`get_page_state` is registered in both strategies and is never unregistered.

---

### `get_page_state` <!-- always registered -->

- **Purpose:** Read the current rocket state.
- **Arguments:** none
- **Returns:**
  ```ts
  {
    status: "IDLE" | "PREPARED" | "LAUNCHED";
    fuel: number;
  }
  ```

---

### `prepare_launch`

- **Purpose:** Transition from `IDLE` → `PREPARED`.
- **Arguments:**

  | Name         | Type     | Required | Description                                                                  |
  | ------------ | -------- | -------- | ---------------------------------------------------------------------------- |
  | `auth_code`  | `string` | yes      | Exact 4-digit authorization code. The agent must ask the user — never guess. |
  | `trajectory` | `string` | yes      | Destination (e.g. `"Moon"`, `"Mars"`).                                       |

- **Returns on success:** `{ status: "PREPARED"; trajectory: string }`
- **Returns on error:** `Error: Invalid auth_code.` or `Error: System must be in IDLE state.`

---

### `ignite_engines`

- **Purpose:** Transition from `PREPARED` → `LAUNCHED`.
- **Arguments:** none
- **Returns on success:** `{ status: "LAUNCHED" }`
- **Returns on error:** `Error: Ignition sequence inhibited. System must be in PREPARED state.`

---

### `reset_system`

- **Purpose:** Transition from `LAUNCHED` → `IDLE`. Resets all state.
- **Arguments:** none
- **Returns:** `{ status: "IDLE"; fuel: 100 }`

---

## 6. UI Layout

```
┌──────────────────────────────────────────────────────────┐
│  [Static Mode]  [Dynamic Mode]       ← mode switcher     │
├──────────────────────────┬───────────────────────────────┤
│                          │  ACTION LOG                   │
│   [STATUS BADGE]         │  ─────────────────────────── │
│                          │  [IDLE]  System initialized   │
│      (rocket SVG)        │  ▶ prepare_launch(            │
│                          │      auth_code: "1234",       │
│  ── Manual Controls ──   │      trajectory: "Moon")      │
│  Auth code: [____]       │  ◀ { status: "PREPARED" }     │
│  Trajectory: [____]      │  [PREPARED]  Systems warm     │
│  [Prepare Launch]        │  ▶ ignite_engines()           │
│  [Ignite Engines]        │  ◀ { status: "LAUNCHED" }     │
│  [Reset]                 │  [LAUNCHED]  Engines firing   │
└──────────────────────────┴───────────────────────────────┘
```

- **Mode switcher:** Two tab-style links at the top of the page — "Static Mode" and "Dynamic Mode". Clicking switches the `?mode=` URL param and reloads the page. The active mode is visually highlighted.
- **Left panel:** Rocket graphic + status badge + manual controls
- **Right panel:** Action log — populated by every state transition regardless of trigger source (manual or WebMCP)
- **Rocket graphic:** CSS/SVG that reacts to state (idle = static, prepared = glow, launched = animated); style is cartoony — bold outlines, flat colors, exaggerated proportions
- **Manual controls:** Always visible; buttons are enabled/disabled based on current state

The log captures the same three things whether triggered by a button click or a WebMCP tool call:

- The action name and input params on entry
- The result or error string on exit
- A state-change marker when a transition succeeds

---

## 7. Technical Workflow

### 7.1 Static Mode (`?mode=static`)

1. Page loads → all four tools registered via `navigator.modelContext.registerTool()`
2. User opens the Model Context Tool Inspector Extension and enters: _"Start the launch."_
3. Extension surfaces all four registered tools to Gemini 2.5 Flash.
4. Agent calls `get_page_state` → sees `IDLE`.
5. Agent attempts `ignite_engines` → receives State Error.
6. Agent determines `prepare_launch` is needed.
7. Agent asks user (via extension): _"What is the 4-digit auth code?"_
8. User replies in the extension. Agent calls `prepare_launch({ auth_code, trajectory })` → page transitions to `PREPARED`.
9. Agent calls `ignite_engines()` → page transitions to `LAUNCHED`.
10. The page UI updates immediately on each tool call.

### 7.2 Dynamic Mode (`?mode=dynamic`)

1. Page loads → only `get_page_state` and `prepare_launch` registered.
2. User opens the Model Context Tool Inspector Extension and enters: _"Start the launch."_
3. Extension surfaces only the two registered tools.
4. Agent calls `get_page_state` → sees `IDLE`.
5. Agent calls `prepare_launch` — `ignite_engines` is not yet visible.
6. Agent asks user: _"What is the 4-digit auth code?"_
7. User replies. Agent calls `prepare_launch({ auth_code, trajectory })` → page transitions to `PREPARED` → `prepare_launch` is unregistered, `ignite_engines` is registered.
8. Extension now surfaces `ignite_engines`. Agent calls it → page transitions to `LAUNCHED` → `ignite_engines` is unregistered, `reset_system` is registered.
9. The page UI updates immediately on each tool call.

---

## 8. Implementation Chunks

Each chunk is independently reviewable and buildable in order.

---

### Chunk 1 — Project Scaffold

- Init Vite + TypeScript project (`npm create vite`)
- Download WebMCP type definitions into the project:
  ```
  https://raw.githubusercontent.com/GoogleChromeLabs/webmcp-tools/refs/heads/main/demos/shared/types/webmcp.d.ts
  ```
- Reference the file in `tsconfig.json` via `typeRoots` or a `/// <reference path="..." />` directive
- Verify dev server runs in Chrome 146+ with the flag enabled

**Review gate:** `npm run dev` opens a blank page with no console errors.

---

### Chunk 2 — State Machine

- Implement state module: `getState()`, `transitionTo()`, and the transition guard logic
- No UI yet — state lives in a TypeScript module
- Unit-testable in isolation

**Review gate:** Calling transition functions in the browser console moves state correctly and rejects invalid transitions.

---

### Chunk 3 — Static UI

- Two-panel layout (rocket panel + log panel) in HTML/CSS
- Status badge with correct color per state
- Rocket SVG (cartoony style: bold outlines, flat colors, exaggerated proportions) — static, no animation yet; SVG is generated inline, not sourced from an external file
- Log panel renders hardcoded placeholder entries

**Review gate:** Layout matches the design at all three states when toggled manually via the browser console.

---

### Chunk 4 — Interactive UI with Manual Controls

- Status badge and rocket SVG react to live state changes
- Manual control buttons wired to the state machine (`prepare_launch`, `ignite_engines`, `reset_system`)
- Input fields for `auth_code` and `trajectory` for `prepare_launch`
- Log panel populated by each state transition (action, params, result/error, state-change markers)
- Rocket animation active only in `LAUNCHED` state

**Review gate:** The full launch sequence can be driven end-to-end using the manual controls, with the log updating in real time and the rocket animating on launch.

---

### Chunk 5 — WebMCP Tool Registration with Dual Strategy

- New module `src/tools.ts` implements both registration strategies
- `RegistrationMode = "static" | "dynamic"` type exported from `tools.ts`
- `initTools(mode)` called from `main.ts` after `initUI()`; mode read from `?mode=` URL param (default: `"static"`)
- `execute()` handlers wire into the same state module and call `appendLog` / `renderState` from `ui.ts` — log entries appear identically whether triggered by manual controls or agent
- Return correct `{ content: [{ type: "text", text }] }` shapes for success and error cases
- **Static strategy:** all four tools registered once; descriptions include state prerequisites
- **Dynamic strategy:** `state.subscribe()` callback re-registers tools on every state change; only tools valid for the current state are visible to the agent
- `state.ts` gains a `subscribe(listener)` function to support dynamic re-registration from both tool calls and manual button clicks
- Mode switcher added to `index.html` as two tab-style links (`?mode=static` / `?mode=dynamic`); active mode highlighted in CSS
- Unit tests cover `subscribe()` behavior in `state.test.ts`

**Review gate (Static):** Model Context Tool Inspector Extension lists all four tools; running the full agent sequence drives the same UI transitions as the manual controls, with the agent backtracking from the ignition error.

**Review gate (Dynamic):** Switching to `?mode=dynamic` and running the agent shows only two tools initially; after each successful transition the tool list updates; agent completes the sequence without encountering any wrong-state errors.

---

## 9. Success Criteria

### Both Modes

- [ ] Agent does not guess or hallucinate the `auth_code`.
- [ ] UI updates in real time on each successful tool call.
- [ ] Agent console accurately streams each tool call and its result.
- [ ] `reset_system` returns the full UI to `IDLE` state.
- [ ] Mode switcher correctly highlights the active mode and reloads with the correct `?mode=` param.

### Static Mode

- [ ] All four tools are inspectable via the Model Context Tool Inspector Extension at page load.
- [ ] Agent correctly interprets the ignition error and backtracks to `prepare_launch`.

### Dynamic Mode

- [ ] Only `get_page_state` and `prepare_launch` are visible to the agent at page load.
- [ ] Tool list updates after each successful state transition.
- [ ] Agent completes the full sequence without encountering any wrong-state errors.
