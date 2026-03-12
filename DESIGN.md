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

Tools should be registered on page load. `get_page_state`, `prepare_launch`, and `reset_system` are always available. `ignite_engines` is always registered but returns an error if state is not `PREPARED` — this is intentional: the agent must discover and handle the error itself.

---

### `get_page_state`

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
┌──────────────────────────┬───────────────────────────────┐
│                          │  TOOL CALL LOG                │
│   [STATUS BADGE]         │  ─────────────────────────── │
│                          │  [IDLE]  System initialized   │
│      (rocket SVG)        │  ▶ get_page_state()           │
│                          │  ◀ { status:"IDLE", fuel:100 }│
│                          │  ▶ ignite_engines()           │
│                          │  ✗ Error: must be PREPARED    │
│                          │  ▶ prepare_launch(            │
│                          │      auth_code: "1234",       │
│                          │      trajectory: "Moon")      │
│                          │  ◀ { status: "PREPARED" }     │
│                          │  [PREPARED]  Systems warm     │
│                          │  ▶ ignite_engines()           │
│                          │  ◀ { status: "LAUNCHED" }     │
│                          │  [LAUNCHED]  Engines firing   │
└──────────────────────────┴───────────────────────────────┘
```

- **Left panel:** Rocket graphic + status badge — animates on state change
- **Right panel:** In-page tool call log — populated from within each `execute()` handler
- **Rocket graphic:** CSS/SVG that reacts to state (idle = static, prepared = glow, launched = animated)

The log captures three things, all from inside `execute()`:

- The tool name and input params on entry
- The result or error string on exit
- A state-change marker when a transition succeeds

---

## 7. Technical Workflow

1. Page loads → all four tools registered via `navigator.modelContext.registerTool()`
2. User opens the Model Context Tool Inspector Extension and enters: _"Start the launch."_
3. Extension surfaces registered tools to Gemini 2.5 Flash.
4. Agent calls `get_page_state` → sees `IDLE`.
5. Agent attempts `ignite_engines` → receives State Error.
6. Agent determines `prepare_launch` is needed.
7. Agent asks user (via extension): _"What is the 4-digit auth code?"_
8. User replies in the extension. Agent calls `prepare_launch({ auth_code, trajectory })` → page transitions to `PREPARED`.
9. Agent calls `ignite_engines()` → page transitions to `LAUNCHED`.
10. The page UI updates immediately on each tool call.

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

### Chunk 3 — WebMCP Tool Registration

- Register all four tools via `navigator.modelContext.registerTool()`
- `execute()` handlers wire into the state module from Chunk 2
- Return correct `{ content: [{ type: "text", text }] }` shapes for success and error cases

**Review gate:** Model Context Tool Inspector Extension lists all four tools; manual execution via the extension triggers correct state transitions and returns expected responses.

---

### Chunk 4 — Static UI

- Two-panel layout (rocket panel + log panel) in HTML/CSS
- Status badge with correct color per state
- Rocket SVG placeholder (static, no animation yet)
- Log panel renders hardcoded placeholder entries

**Review gate:** Layout matches the design at all three states when toggled manually via the browser console.

---

### Chunk 5 — Dynamic UI Binding

- Status badge and rocket SVG react to state changes
- Log panel populated by `execute()` handlers (tool name, params, result/error, state-change markers)
- Rocket animation active only in `LAUNCHED` state

**Review gate:** Running the full tool sequence via the extension updates the page in real time with correct log entries and visual transitions.

---

## 9. Success Criteria

- [ ] Agent does not guess or hallucinate the `auth_code`.
- [ ] Agent correctly interprets the ignition error and backtracks.
- [ ] UI updates in real time on each successful tool call.
- [ ] Agent console accurately streams each tool call and its result.
- [ ] `reset_system` returns the full UI to `IDLE` state.
- [ ] All tools are inspectable via the Model Context Tool Inspector Extension.
