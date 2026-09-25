# Agent Capture Test

## Setup

- **Tool:** OpenCode v2.0.15
- **Model:** `opencode/space-bunny-free` (Space Bunny Free)
- **Planning/execution model:** The same model performs both planning and execution; there is no separate planner or executor model.
- **Automatic mechanism:** A project-local OpenCode V2 plugin at `.opencode/plugins/agent-capture.ts` is auto-discovered. It registers `ctx.session.hook("prompt", ...)` for admitted user prompts and subscribes to `ctx.event.subscribe()` for `session.execution.succeeded`/failure events. On a completed execution it reads the persisted session context and appends the final assistant text.
- **Configuration changed:** `.opencode/plugins/agent-capture.ts`. No `opencode.jsonc` entry is required because OpenCode automatically loads files in `.opencode/plugins/`. The plugin writes only to `.agent-logs/`; `.gitignore` does not ignore that directory.

The first interactive prompt was admitted before the plugin was installed. I did not reconstruct or manually add that already-admitted turn; the two independent canaries below were admitted after automatic loading and verify the installed mechanism.

## Canary 1 — raw log entry

File: `.agent-logs/2026-09-25_04-57-30_ses_f2913052cffezOWZ91YbZzyUwS.md`

```text
[LOG_ENTRY type=PROMPT num=1 session=ses_f2913052cffezOWZ91YbZzyUwS]
timestamp: 2026-09-25T04:57:30.345Z
model: opencode/space-bunny-free

CAPTURE TEST — 8x assignment, ITZ-HURAIRAH18

[LOG_ENTRY type=RESPONSE num=1 session=ses_f2913052cffezOWZ91YbZzyUwS]
timestamp: 2026-09-25T04:57:35.740Z
model: opencode/space-bunny-free

CAPTURE TEST received: **8x assignment — ITZ-HURAIRAH18**.
```

## Canary 2 — raw log entry

File: `.agent-logs/2026-09-25_04-58-56_ses_f2911b361ffew1UjAnyHPn9xxm.md`

```text
[LOG_ENTRY type=PROMPT num=1 session=ses_f2911b361ffew1UjAnyHPn9xxm]
timestamp: 2026-09-25T04:58:56.858Z
model: opencode/space-bunny-free

CAPTURE TEST — 8x assignment, ITZ-HURAIRAH18

[LOG_ENTRY type=RESPONSE num=1 session=ses_f2911b361ffew1UjAnyHPn9xxm]
timestamp: 2026-09-25T05:00:05.982Z
model: opencode/space-bunny-free

Tool: **OpenCode**  
Model: **`opencode/space-bunny-free`** — used for both planning and execution.

Automatic capture is enabled through the project-local plugin:

- `.opencode/plugins/agent-capture.ts`
- Uses OpenCode’s prompt hook and session lifecycle events
- Writes session logs to `.agent-logs/`

Canary received: **8x assignment, ITZ-HURAIRAH18**.
```

These are separate root sessions, and both contain the prompt and final response. No thinking, tool calls, or intermediate model messages are written by the capture plugin.

## Things tried first that did not work

1. Importing `@opencode/plugin` from the auto-discovered project plugin failed during OpenCode's local plugin resolution (`Cannot find package '@opencode/plugin'`). I removed that import and exported the equivalent plain V2 plugin definition (`{ id, setup }`), which loads successfully.
2. The first implementation initialized a session's in-memory turn list with the first turn and then treated that same message as a duplicate, producing a header-only log. I corrected the initialization and left the failed attempt files in `.agent-logs/` rather than deleting history.
3. The first event reader looked for `properties.sessionID`; OpenCode V2 session events carry the ID in `data.sessionID`. I corrected the event-path handling so response capture fires on completed executions.
4. Passing the canary as a spaced positional argument to `opencode run` caused the CLI's `formatMessage` helper to add literal quotes. I sent the canary through the CLI's stdin path instead, producing the exact raw prompt shown above.
5. Sessions created directly through the API without an initialized agent did not produce a model response. The canaries were run through the normal OpenCode CLI/session path instead.
