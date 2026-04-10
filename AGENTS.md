# CoWork Agent Onboarding

This repository is a local OSWorld-inspired training gym prototype. It is not a VM-based environment. It is a deterministic mock desktop with:

- a TypeScript core environment
- a browser viewer that renders the current desktop state
- an MCP server exposing Computer-13 style tools
- local test clients for scripted and interactive inspection

The current target is a stronger Ubuntu/GNOME-like mock environment suitable for RL loop prototyping, perturbation testing, and visual/a11y verification.

## Current Status

The project is working end to end.

- The MCP server starts and serves a live viewer at `http://127.0.0.1:4315`
- The viewer updates in real time when MCP actions mutate environment state
- The viewer also accepts direct local mouse and keyboard input in the browser
- Window controls now work through both MCP click coordinates and direct browser clicks
- Visual PNG observation and a11y-like tree are both produced from the same authoritative state
- Starter tasks pass through the core environment and through the MCP layer
- The shell now looks Ubuntu/GNOME-like rather than a generic desktop mock
- Representative apps from the OSWorld paper direction have been added: Files, Text Editor, Firefox, Terminal, Thunderbird
- The OSWorld Explorer-inspired representative QA suite currently passes all 4 representative tasks end to end

This is still a mock, not a realistic full OS. The current goal is breadth of controllable environment composition, not pixel-faithful Ubuntu reproduction.

## Environment Requirements

- macOS or Linux
- Node 20 LTS
- npm
- Playwright Chromium installed

If `node@20` was installed with Homebrew, use:

```bash
export PATH="/opt/homebrew/opt/node@20/bin:$PATH"
```

## Quick Start

From repo root:

```bash
npm install
npx playwright install chromium
npm run build
npm test
```

Main run modes:

- MCP server only:

```bash
npm run start:mcp
```

- Deterministic scripted demo:

```bash
npm run demo:scripted
```

- Local MCP test client:

```bash
npm run test:mcp-client
```

- Interactive MCP client with browser auto-open:

```bash
npm run interactive:mcp-client -- --task dismiss_popup_then_append_note --open
```

## Repo Structure

- `packages/core`
  - authoritative environment state
  - task specs
  - app plugins
  - perturbations
  - reward/evaluation logic
- `packages/web`
  - browser viewer
  - Ubuntu/GNOME-like shell rendering
  - window rendering, dock, top bar, popup and pointer layers
- `packages/mcp-server`
  - MCP stdio server
  - viewer host
  - screenshot capture
  - test and interactive clients

## Key Entry Points

- Core API:
  - `/Users/baghyeonbin/Desktop/CoWork/packages/core/src/env/session.ts`
- Core exports:
  - `/Users/baghyeonbin/Desktop/CoWork/packages/core/src/index.ts`
- Viewer surface:
  - `/Users/baghyeonbin/Desktop/CoWork/packages/web/src/components/DesktopSurface.tsx`
- Window chrome:
  - `/Users/baghyeonbin/Desktop/CoWork/packages/web/src/components/WindowFrame.tsx`
- MCP server:
  - `/Users/baghyeonbin/Desktop/CoWork/packages/mcp-server/src/index.ts`
- Viewer host:
  - `/Users/baghyeonbin/Desktop/CoWork/packages/mcp-server/src/host.ts`
- MCP test client:
  - `/Users/baghyeonbin/Desktop/CoWork/packages/mcp-server/src/test-client.ts`
- MCP interactive client:
  - `/Users/baghyeonbin/Desktop/CoWork/packages/mcp-server/src/interactive-client.ts`

## Root Scripts

Defined in `/Users/baghyeonbin/Desktop/CoWork/package.json`.

- `build`
- `build:core`
- `build:web`
- `build:mcp`
- `dev:mcp`
- `dev:web`
- `start:mcp`
- `test:mcp-client`
- `interactive:mcp-client`
- `demo:scripted`
- `test`
- `typecheck`
- `qa:representative`
- `qa:local-input`

## Current Mock Shell

The visual shell currently includes:

- Ubuntu-like top bar
- left-side dock
- Ubuntu-toned background and window chrome
- live pointer rendering
- popup/modal layer
- task instruction overlay

The dock currently includes these representative apps:

- `FI` -> Files
- `WEB` -> Firefox
- `TERM` -> Terminal
- `MAIL` -> Thunderbird

The Text Editor is typically launched by opening files from Files rather than from a dedicated dock icon.

Dock behavior is now closer to a launcher:

- pinned apps remain clickable even after their window is closed
- clicking a pinned app focuses/restores the running window if it exists
- clicking a pinned app relaunches a default window if it was closed
- note-editor windows still appear as per-document dynamic dock items

## Current Mock Apps

Implemented app modules:

- Files
- Text Editor
- Mozilla Firefox
- Terminal
- Thunderbird

Relevant files:

- `/Users/baghyeonbin/Desktop/CoWork/packages/core/src/apps/file-explorer.ts`
- `/Users/baghyeonbin/Desktop/CoWork/packages/core/src/apps/note-editor.ts`
- `/Users/baghyeonbin/Desktop/CoWork/packages/core/src/apps/browser-lite.ts`
- `/Users/baghyeonbin/Desktop/CoWork/packages/core/src/apps/terminal-lite.ts`
- `/Users/baghyeonbin/Desktop/CoWork/packages/core/src/apps/mail-lite.ts`

## Official UI References Used

When improving realism, prefer structural fidelity to these official references instead of inventing layouts:

- GNOME Files (Nautilus):
  - `https://apps.gnome.org/en/Nautilus/`
  - takeaways: sidebar `Places`, header/path navigation, search field, grid/list modes, file-manager semantics
- GNOME Text Editor:
  - `https://apps.gnome.org/en/TextEditor/`
  - takeaways: simple document-centric editor, clean headerbar, save state, line-numbered text area, low chrome density
- GNOME Console:
  - `https://apps.gnome.org/en/Console/`
  - takeaways: minimalist dark terminal surface, friendly terminal framing, very little in-app chrome beyond the terminal itself
- Firefox:
  - `https://www.mozilla.org/en-US/firefox/new/`
  - takeaways: rounded tabs, large address bar, navigation controls on the left, clean toolbar, roomy browser content area
- Thunderbird:
  - `https://www.thunderbird.net/en-US/thunderbird/all/`
  - takeaways: desktop mail client conventions, folder pane + message list + preview pane, search-first mail toolbar
- OSWorld Explorer:
  - `https://os-world.github.io/explorer.html`
  - takeaways: browser page content should feel like a task/data explorer, with filters/category controls, recording panel, and instruction/detail sections

These references should inform shell/app structure, spacing, and information hierarchy. They should not be used to justify static screenshots in places that need local interaction.

## Current Starter Tasks

- `dismiss_popup_then_append_note`
- `rename_note_in_explorer`
- `copy_line_between_windows`
- `minimize_recover_and_save`
- `browser_select_category_task`
- `browser_switch_to_help`
- `browser_log_task_id_simple`
- `browser_help_log_summary_simple`
- `browser_help_to_preopen_note`
- `browser_select_from_help_and_log_preopen`

Task definitions live under:

- `/Users/baghyeonbin/Desktop/CoWork/packages/core/src/tasks/starter/`
- starter entrypoint: `/Users/baghyeonbin/Desktop/CoWork/packages/core/src/tasks/starter-tasks.ts`

## Current Representative Tasks

These tasks are intended to be closer to OSWorld Explorer-style RL rollouts than the minimal starter set.

- `browser_help_preopen_note_distractors`
- `browser_log_task_preopen_note_hard`
- `mail_extract_mock_note`
- `terminal_record_working_directory`

Representative task definitions live under:

- `/Users/baghyeonbin/Desktop/CoWork/packages/core/src/tasks/representative/`
- representative entrypoint: `/Users/baghyeonbin/Desktop/CoWork/packages/core/src/tasks/representative-tasks.ts`

Task registry and split handling live under:

- `/Users/baghyeonbin/Desktop/CoWork/packages/core/src/tasks/registry.ts`
- `trainer.list_tasks`/`listTasks()` returns only agent-safe public catalog fields (`id`, `instruction`, `maxSteps`, `seedDefaults`, `domain`, `split`); internal task metadata is authoring-only and must not be exposed to the agent under test

Supported task splits:

- `all`
- `starter`
- `representative`
- `train`
- `eval`

## Current Perturbations

- `PopupInject`
- `MinimizeAll`
- `RandomPointerSpawn`
- `WindowClose`
- `ZOrderShuffle`

Perturbation logic lives in:

- `/Users/baghyeonbin/Desktop/CoWork/packages/core/src/env/perturbations.ts`

## MCP Surface

Agent-facing tools:

- `computer13.observe`
- `computer13.step`
- `computer13.list_action_space`

Trainer/debug-facing tools:

- `trainer.create_session`
- `trainer.list_tasks`
- `trainer.reset`
- `trainer.sample_task`
- `trainer.apply_perturbation`
- `trainer.snapshot`
- `trainer.restore_snapshot`
- `trainer.get_hidden_state`
- `trainer.close_session`

The viewer route format is:

```text
http://127.0.0.1:4315/session/<sessionId>
```

Health route:

```text
http://127.0.0.1:4315/healthz
```

## Manual Review Workflow

For human inspection, prefer the interactive MCP client:

```bash
npm run interactive:mcp-client -- --task dismiss_popup_then_append_note --open
```

Useful commands inside the interactive prompt:

- `help`
- `tasks`
- `observe`
- `reset <taskId> <seed>`
- `click <x> <y>`
- `double <x> <y>`
- `type <text>`
- `press <key>`
- `hotkey ctrl+s`
- `perturb PopupInject {"title":"Injected popup","message":"Noise added during rollout"}`
- `snapshot <name>`
- `restore <snapshotId>`
- `done`

This is the best way to watch the browser viewer while sending step-by-step MCP actions.

## Direct Browser Interaction

The viewer is not passive anymore.

- Local mouse clicks in the browser can dismiss popups, activate dock icons, open files, place the note-editor cursor, and click save controls.
- Local mouse clicks can also use window frame controls:
  - red button: close window
  - yellow button: minimize window
  - green button: maximize/restore window
- Local keyboard input in the browser dispatches `TYPING`, `PRESS`, and `HOTKEY` actions.
- Browser-local input and MCP tool calls mutate the same `MockOsEnv` session, so mixed interaction is supported.

Implementation touchpoints:

- `/Users/baghyeonbin/Desktop/CoWork/packages/web/src/components/DesktopSurface.tsx`
- `/Users/baghyeonbin/Desktop/CoWork/packages/web/src/DesktopApp.tsx`
- `/Users/baghyeonbin/Desktop/CoWork/packages/web/src/render-model.ts`
- `/Users/baghyeonbin/Desktop/CoWork/packages/mcp-server/src/host.ts`

Important behavior:

- Single clicks are delayed by 180ms to separate them from double-clicks.
- Automated browser scripts should wait at least ~250ms after a click before sending keyboard input.

## Strict Visual QA And Local-Input QA

Two artifact families are important:

- prior strict MCP/viewer QA:
  - `/Users/baghyeonbin/Desktop/CoWork/output/playwright/strict-qa`
  - `/Users/baghyeonbin/Desktop/CoWork/output/playwright/strict-qa/strict-qa-report.json`
- current local browser-input QA:
  - `/Users/baghyeonbin/Desktop/CoWork/output/playwright/local-input-qa`
  - `/Users/baghyeonbin/Desktop/CoWork/output/playwright/local-input-qa/report.json`

Run local browser-input QA with:

```bash
npm run qa:local-input
```

Run representative-task QA with:

```bash
npm run qa:representative
```

This suite currently verifies:

- local-only solve of `dismiss_popup_then_append_note`
- mixed local dock interaction + MCP perturbation + local recovery for `rename_note_in_explorer`
- local dock restore + local save for `minimize_recover_and_save`
- local window controls and pinned dock relaunch:
  - maximize Files
  - restore Files
  - minimize Files
  - restore Files from dock
  - close Firefox
  - relaunch Firefox from dock

Representative visual artifacts:

- `/Users/baghyeonbin/Desktop/CoWork/output/playwright/local-input-qa/scenario1-typed.png`
- `/Users/baghyeonbin/Desktop/CoWork/output/playwright/local-input-qa/scenario1-saved.png`
- `/Users/baghyeonbin/Desktop/CoWork/output/playwright/local-input-qa/scenario2-popup-injected.png`
- `/Users/baghyeonbin/Desktop/CoWork/output/playwright/local-input-qa/scenario3-editor-restored.png`
- `/Users/baghyeonbin/Desktop/CoWork/output/playwright/local-input-qa/scenario4-files-maximized.png`
- `/Users/baghyeonbin/Desktop/CoWork/output/playwright/local-input-qa/scenario4-files-minimized.png`
- `/Users/baghyeonbin/Desktop/CoWork/output/playwright/local-input-qa/scenario4-browser-closed.png`
- `/Users/baghyeonbin/Desktop/CoWork/output/playwright/local-input-qa/scenario4-browser-relaunched.png`

Representative Explorer-inspired QA artifacts:

- `/Users/baghyeonbin/Desktop/CoWork/output/playwright/representative-qa`
- `/Users/baghyeonbin/Desktop/CoWork/output/playwright/representative-qa/report.json`
- `/Users/baghyeonbin/Desktop/CoWork/output/playwright/representative-qa/browser-workflow-selected.png`
- `/Users/baghyeonbin/Desktop/CoWork/output/playwright/representative-qa/browser-help-saved.png`
- `/Users/baghyeonbin/Desktop/CoWork/output/playwright/representative-qa/mail-saved.png`
- `/Users/baghyeonbin/Desktop/CoWork/output/playwright/representative-qa/terminal-command-ran.png`
- `/Users/baghyeonbin/Desktop/CoWork/output/playwright/representative-qa/browser-workflow-selected.png`

## Core RL Usage

For actual training code, prefer importing the core API directly rather than going through MCP.

The intended fast path is:

```ts
import { MockOsEnv } from "/Users/baghyeonbin/Desktop/CoWork/packages/core/src/index.ts";

const env = new MockOsEnv();
env.reset({ taskId: "dismiss_popup_then_append_note", seed: 0 });
const step = env.step({ type: "CLICK", x: 100, y: 100 });
```

Use MCP when:

- a human needs to inspect behavior
- tool-call traces matter
- live viewer synchronization matters

Use the core API when:

- rollout speed matters
- building RL collectors
- running many automated episodes

## Verification Already Performed

The following were run and passed:

- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run test:mcp-client`
- `npm run test:mcp-client -- --task rename_note_in_explorer`
- `npm run test:mcp-client -- --task copy_line_between_windows`
- `npm run test:mcp-client -- --task minimize_recover_and_save`
- `npm run qa:representative`

Representative QA pass criteria:

- `browser_log_task_preopen_note_hard`
- `browser_help_preopen_note_distractors`
- `mail_extract_mock_note`
- `terminal_record_working_directory`

Current representative QA report:

- `/Users/baghyeonbin/Desktop/CoWork/output/playwright/representative-qa/report.json`

In addition, strict visual QA was performed using a persistent Node + Playwright + MCP flow, since `playwright-interactive` style `js_repl` was not available in that session.

## Visual QA Artifacts

Main report:

- `/Users/baghyeonbin/Desktop/CoWork/output/playwright/strict-qa/strict-qa-report.json`

Visual artifact folders:

- `/Users/baghyeonbin/Desktop/CoWork/output/playwright/strict-qa`
- `/Users/baghyeonbin/Desktop/CoWork/output/playwright/ubuntu-mock-check`

Representative verified images:

- Initial Ubuntu mock shell:
  - `/Users/baghyeonbin/Desktop/CoWork/output/playwright/strict-qa/scenario1-initial.png`
- Popup dismissed:
  - `/Users/baghyeonbin/Desktop/CoWork/output/playwright/strict-qa/scenario1-popup-cleared.png`
- Note opened:
  - `/Users/baghyeonbin/Desktop/CoWork/output/playwright/strict-qa/scenario1-note-opened.png`
- Dirty editor state:
  - `/Users/baghyeonbin/Desktop/CoWork/output/playwright/strict-qa/scenario1-dirty.png`
- Saved editor state:
  - `/Users/baghyeonbin/Desktop/CoWork/output/playwright/strict-qa/scenario1-saved.png`
- Dense workspace with Firefox:
  - `/Users/baghyeonbin/Desktop/CoWork/output/playwright/strict-qa/scenario2-dense-workspace.png`
- Popup perturbation:
  - `/Users/baghyeonbin/Desktop/CoWork/output/playwright/strict-qa/scenario4-after-popup-inject.png`
- Reduced viewport:
  - `/Users/baghyeonbin/Desktop/CoWork/output/playwright/strict-qa/scenario5-small-viewport.png`

## What Was Strictly Verified

The following claims were confirmed visually and through MCP/a11y state:

- viewer is no longer blank or stale
- MCP actions visibly update the viewer in real time
- Ubuntu/GNOME shell rendering is present
- Files, Text Editor, Firefox, Terminal, and Thunderbird are visible and distinct
- starter tasks complete end to end
- perturbations visibly change the workspace
- visual state and a11y/tree state align in tested scenarios
- viewport fit is acceptable in tested `1280x800` and `1100x720` states

Specific verified perturbation behaviors:

- `PopupInject` created a visible dialog and focused `popup-1`
- `RandomPointerSpawn` moved the pointer to a different visible location
- `MinimizeAll` reduced visible window count to zero in the tested state
- `WindowClose(browser-main)` removed Firefox from visible windows
- `ZOrderShuffle` preserved popup focus when popup was present

## Important Behavioral Notes

- Modal popups intentionally block dock interactions until the popup is dismissed
- The viewer updates over websocket; if the viewer is open on the correct session URL, state changes should be visible live
- The Text Editor is file-driven, so text windows often appear after double-clicking a file in Files
- The browser viewer and MCP mutate the same session state. Mixed interaction is expected and is the normal debugging path.
- In browser automation, duplicate visible text can make `getByText(...)` unreliable. When a click target also appears inside preview content, prefer clicking the center of the a11y node bounds from `computer13.observe`.
- A real example: the representative mail QA initially failed because clicking `Mock environment notes` via text selector hit preview text instead of the message-list item. The fix was to click the `mail.message` a11y node center.
- Single-click handling still has a 180ms delay to allow double-click disambiguation. Automation should wait ~250ms after click before typing.

## Known Issues

There is one explicitly recorded visual issue:

- The instruction overlay overlaps the Files window header in startup states

Evidence:

- `/Users/baghyeonbin/Desktop/CoWork/output/playwright/strict-qa/scenario1-initial.png`
- `/Users/baghyeonbin/Desktop/CoWork/output/playwright/strict-qa/scenario2-dense-workspace.png`

Likely source:

- `/Users/baghyeonbin/Desktop/CoWork/packages/web/src/components/DesktopSurface.tsx`

Current overlay placement is around:

- `left: 86`
- `top: 50`

The overlap is visual/UX debt, not a functional blocker.

## Historical Bug Already Fixed

There used to be a black-screen viewer bug.

Root cause:

- viewer static assets were served from the wrong path
- `/session/:id` was not reliably returning the built `index.html`

Fix location:

- `/Users/baghyeonbin/Desktop/CoWork/packages/mcp-server/src/host.ts`

Do not regress this by changing asset hosting without retesting viewer screenshots.

## Recommended Next Steps

If continuing development, the highest-value next items are:

1. Move or redesign the instruction overlay so it no longer covers primary windows
2. Add richer Ubuntu-like app behaviors, especially browser/files/editor interactions
3. Expand multi-app workflows beyond starter tasks
4. Add more OSWorld-representative app surfaces if needed
5. Add stronger visual regression checks for shell layout and app restoration

## When Opening a New Session

A new agent should start with:

1. Read this file
2. Read `/Users/baghyeonbin/Desktop/CoWork/README.md`
3. Run:

```bash
export PATH="/opt/homebrew/opt/node@20/bin:$PATH"
npm run build
npm test
```

4. If visual confirmation is needed, run:

```bash
npm run interactive:mcp-client -- --task dismiss_popup_then_append_note --open
```

5. If investigating regressions, compare against:

- `/Users/baghyeonbin/Desktop/CoWork/output/playwright/strict-qa/strict-qa-report.json`
- `/Users/baghyeonbin/Desktop/CoWork/output/playwright/strict-qa`

## Repo-local Task Authoring Skill

For task-family expansion driven by high-level goals, app scope, batch size, split, difficulty mix, variation preferences, and inventory coverage, prefer the repo-local Codex skill at:

- `.codex/skills/os-mock-task-author/SKILL.md`

Expected responsibility of this skill:

- accept partial user input and gather missing task-design information through multiple short follow-up questions
- expand short requests into task families, variation matrices, and deduped runnable `TaskSpec` implementations
- support intentionally impossible task design, following `doc/personal/20260410_osworld_impossible_tasks.md`
- follow `doc/task/osworld-mock-authoring-guide.md` so generated tasks preserve core capability while avoiding benchmark-domain leakage
- prefer family-first batch generation over isolated one-off task invention
- keep `doc/task/task-hub.md` and `doc/task/tasks-and-perturbations.md` synchronized with task inventory changes
- run `node .codex/skills/os-mock-task-author/scripts/audit-task-batch.mjs --mode inventory` after task-inventory changes
- run `node .codex/skills/os-mock-task-author/scripts/audit-task-batch.mjs --mode candidates --input <candidate-json>` before promoting generated candidates
- extend evaluator, session reward logic, or predicate space only when the request explicitly allows runnable impossible-task support
- submit a proposal package for user review before editing task inventory by default

Current policy for this skill:

- default to proposal-first review, not immediate runnable task implementation
- treat `starter` as shorter single-app or simple save/complete tasks
- treat `representative` as longer multi-app extraction workflows
- impossible tasks are allowed, but remain proposal-only unless runtime expansion is explicitly authorized
- treat minimized/unfocused/help-start/distractor/existing-content changes as setup variation before creating a brand-new browser task
- do not use perturbations in the current task-generation flow unless the policy changes later
- use dedup and quality gates before promoting candidates to new tasks

This file should be kept current whenever:

- the shell layout changes
- app inventory changes
- task inventory changes
- task-family generation policy changes
- visual QA findings change
