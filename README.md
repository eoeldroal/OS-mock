# OS Mock + Computer-13 MCP Demo

Minimal OSWorld-like training gym example with:

- deterministic mock OS core
- Ubuntu/GNOME-style browser viewer
- Computer-13 style MCP tools
- direct browser-local mouse and keyboard interaction on the viewer itself
- trainer-facing session, reset, snapshot, and perturbation tools
- visual PNG observation plus a11y-like tree
- representative desktop apps: Files, Text Editor, Firefox, Terminal, Thunderbird

## Requirements

- macOS or Linux
- `Node 20 LTS`
- npm

If you installed `node@20` via Homebrew, expose it in the current shell:

```bash
export PATH="/opt/homebrew/opt/node@20/bin:$PATH"
```

## Install

```bash
npm install
npx playwright install chromium
```

## Build

```bash
npm run build
```

This builds:

- `packages/core/dist`
- `packages/web/dist`
- `packages/mcp-server/dist`

## Run the MCP server

```bash
npm run start:mcp
```

The process starts:

- MCP stdio server
- local viewer host at `http://127.0.0.1:4315`

The viewer route pattern is:

```text
http://127.0.0.1:4315/session/<sessionId>
```

## Manual MCP flow

1. Create a session:

```json
{
  "tool": "trainer.create_session",
  "arguments": {}
}
```

2. List tasks:

```json
{
  "tool": "trainer.list_tasks",
  "arguments": {}
}
```

To inspect the RL-oriented representative tasks only:

```json
{
  "tool": "trainer.list_tasks",
  "arguments": {
    "split": "representative"
  }
}
```

Supported task splits:

- `all`
- `starter`
- `representative`
- `train`
- `eval`

3. Reset to a task:

```json
{
  "tool": "trainer.reset",
  "arguments": {
    "sessionId": "s1",
    "taskId": "dismiss_popup_then_append_note",
    "seed": 0
  }
}
```

4. Observe:

```json
{
  "tool": "computer13.observe",
  "arguments": {
    "sessionId": "s1"
  }
}
```

5. Step:

```json
{
  "tool": "computer13.step",
  "arguments": {
    "sessionId": "s1",
    "action": {
      "type": "CLICK",
      "x": 900,
      "y": 480
    }
  }
}
```

## Scripted policy demo

Run the deterministic starter-task solver:

```bash
npm run demo:scripted
```

## MCP test client

Run a local MCP client that spawns the built server over stdio, creates a session, resets a task, and solves it through MCP tool calls:

```bash
npm run test:mcp-client
```

Choose a specific starter task:

```bash
npm run test:mcp-client -- --task rename_note_in_explorer
npm run test:mcp-client -- --task copy_line_between_windows
npm run test:mcp-client -- --task minimize_recover_and_save
```

Keep the session open so you can inspect the viewer URL after the run:

```bash
npm run test:mcp-client -- --keep-open
```

## Interactive MCP client

Run a persistent local MCP client, auto-create a session, and optionally reset a task immediately:

```bash
npm run interactive:mcp-client -- --task dismiss_popup_then_append_note --open
```

Useful commands inside the prompt:

```text
help
tasks
reset dismiss_popup_then_append_note 0
observe
click 778 484
double 262 112
type \n- bread
hotkey ctrl+s
done
perturb PopupInject {"title":"Injected popup","message":"Noise added during rollout"}
```

The browser viewer is directly interactive:

- local mouse clicks on windows, dock icons, popups, and save buttons dispatch viewer actions
- local mouse clicks on title-bar controls dispatch window-management actions
  - red button: close
  - yellow button: minimize
  - green button: maximize / restore
- local keyboard input dispatches `TYPING`, `PRESS`, and `HOTKEY` actions
- MCP calls and browser-local input both mutate the same authoritative environment state

The dock behaves like a launcher for pinned core apps:

- Files, Firefox, Terminal, and Thunderbird remain clickable even after their window is closed
- clicking a pinned app restores or focuses the running instance if present
- clicking a pinned app relaunches a default window if no running instance exists
- note-editor documents still show up as dynamic dock items

Single clicks are intentionally delayed by 180ms so the viewer can distinguish click vs. double-click. For automated scripts, wait at least ~250ms after a click before typing.

## Local browser-input QA

Run the mixed local-input + MCP QA suite:

```bash
npm run qa:local-input
```

This opens the viewer in headless Chromium via Playwright and verifies:

- local click/typing can solve `dismiss_popup_then_append_note`
- local dock interaction + MCP perturbation + local recovery can solve `rename_note_in_explorer`
- local dock restore + local save can solve `minimize_recover_and_save`
- local window controls and pinned dock relaunch work end to end

Artifacts are written to:

- `/Users/baghyeonbin/Desktop/CoWork/output/playwright/local-input-qa`
- `/Users/baghyeonbin/Desktop/CoWork/output/playwright/local-input-qa/report.json`

## Representative QA

Run the OSWorld Explorer-inspired representative QA suite:

```bash
npm run qa:representative
```

This verifies richer multi-app tasks meant to be usable as RL rollout targets:

- `browser_log_workflow_task_id`
- `browser_capture_help_line`
- `mail_extract_mock_note`
- `terminal_record_working_directory`

Artifacts are written to:

- `/Users/baghyeonbin/Desktop/CoWork/output/playwright/representative-qa`
- `/Users/baghyeonbin/Desktop/CoWork/output/playwright/representative-qa/report.json`

## Test

```bash
npm test
```

## RL loop sketch

```ts
import { MockOsEnv } from "./packages/core/src/index.js";

const env = new MockOsEnv();
env.reset({ taskId: "dismiss_popup_then_append_note", seed: 0 });

while (true) {
  const obs = env.observe();
  const action = policy(obs.observation);
  const step = env.step(action);
  buffer.push({ obs, action, reward: step.reward });
  if (step.terminated || step.truncated) break;
}
```

## Current starter tasks

- `dismiss_popup_then_append_note`
- `rename_note_in_explorer`
- `copy_line_between_windows`
- `minimize_recover_and_save`

## Current representative tasks

These are broader OSWorld Explorer-inspired tasks for RL prototyping.

- `browser_log_workflow_task_id`
- `browser_capture_help_line`
- `mail_extract_mock_note`
- `terminal_record_working_directory`

## Included mock apps

- `Files`
- `Text Editor`
- `Mozilla Firefox`
- `Terminal`
- `Thunderbird`

## Current perturbations

- `PopupInject`
- `MinimizeAll`
- `RandomPointerSpawn`
- `WindowClose`
- `ZOrderShuffle`
