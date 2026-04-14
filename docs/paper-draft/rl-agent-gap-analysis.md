# RL-Agent Gap Analysis and Roadmap

Date: 2026-03-19

## 2026-03-19 Structural Refactor Update

The first structural refactor pass is now in the codebase.

Scope of this pass:

- core no longer uses `Date.now()` for environment-side entity creation or task sampling defaults
- environment state now carries a deterministic `nextEntityId` counter
- Files and Terminal now rely on a shared filesystem contract instead of each feature inventing its own path logic
- file entries now carry an explicit `directory` field in addition to the compatibility `path` string
- filesystem state now carries explicit root mappings for:
  - `Home`
  - `Desktop`
  - `Documents`
  - `Downloads`
  - `workspace`

What changed structurally:

- dynamic file and folder creation from the Files context menu now goes through shared filesystem helpers
- dynamic file creation from terminal commands now allocates IDs at env-application time instead of inside the shell command registry
- terminal file commands now resolve files relative to the terminal `cwd` instead of searching the entire mock filesystem by bare filename
- Files sidebar place filtering now goes through shared filesystem helpers instead of app-local string rules

Why this matters:

- determinism is stronger because dynamic IDs are now replay-stable
- the filesystem contract is less coupled to File Explorer implementation details
- future work such as nested folders, move semantics, and directory-scoped collisions now has a cleaner foundation

This is intentionally a phase-1 refactor, not the final filesystem design.

Still open after this pass:

- the filesystem is not yet a true parent/child tree
- `path` still exists as a compatibility field and should eventually become a pure derived view
- reducer responsibility is still too broad for long-term extensibility
- Browser explorer detail layout still needs a full rect-owned SSOT pass

## Scope

This document records the current limitations of the Ubuntu OS mock when it is used as if it were a real reinforcement learning agent environment rather than a scripted demo.

The findings below are based on:

- live MCP rollouts through the interactive client
- direct viewer inspection with browser screenshots
- drag-heavy mixed-input rollouts through the live viewer
- representative task exploration on `browser_help_preopen_note_distractors`
- representative task exploration on `terminal_record_working_directory`
- representative task exploration on `mail_extract_mock_note`
- representative task exploration on `rename_note_in_explorer`
- follow-up regression checks through `npm test` and `npm run build`

This document is intentionally narrower than a full product roadmap. It is a gap analysis for making the environment more credible, more adversarial, and more useful for RL loop prototyping.

## 2026-03-19 Parallel Adversarial QA Update

A stricter parallel QA harness now exists at:

- `npm run qa:osworld-adversarial`

This harness runs three representative tasks in parallel with:

- unlimited sessions (`maxSteps: 0`)
- a minimum of 100 actual interaction steps per scenario
- real viewer clicks and drags for spatial interaction
- MCP `computer13.step` actions for hotkeys and text entry
- run-scoped artifacts under `output/playwright/osworld-adversarial-qa/runs/<timestamp>`

Latest fully passing run:

- report: `/Users/baghyeonbin/Desktop/CoWork/output/playwright/osworld-adversarial-qa/report.json`
- run folder: `/Users/baghyeonbin/Desktop/CoWork/output/playwright/osworld-adversarial-qa/runs/2026-03-19T07-43-56-466Z`

The current passing run verifies:

- browser help capture with wrong-path clicks, Files sidebar exploration, and repeated window drags
- mail extraction with popup disruption, minimize-all recovery, folder switching, and final-state verification
- terminal working-directory capture with dock switching, Files interaction, and repeated drag stress

This update also surfaced three concrete infrastructure problems that were fixed during the same iteration:

- session screenshots in `/tmp/os-mock/sessions/...` were not stable evidence because later runs could overwrite them
- browser-local `page.keyboard` input was not reliable enough for copy/paste under stress, even when the visual selection looked correct
- mail final-state recovery could still be overturned by delayed single-click dispatches after aggressive stress actions

Fixes applied:

- archived final screenshots are now copied into the run-specific artifact directory before cleanup
- adversarial QA now uses MCP `HOTKEY`, `TYPING`, and `PRESS` actions for text and clipboard operations while keeping viewer-local pointer interaction for clicks and drags
- mail finalization now includes a quiet period plus explicit a11y verification that `Mock environment notes` is focused before `DONE`

Residual risk after the passing run:

- viewer-only local editor text entry still appears less stable than MCP-driven text actions under heavy stress
- one strict subagent rollout on the terminal task reported that the terminal clearly showed `/workspace`, but the editor buffer remained empty in the same session
- evidence:
  - `/Users/baghyeonbin/Desktop/CoWork/output/playwright/agent-cycle2/averroes-terminal/20-stress-complete.png`
  - `/Users/baghyeonbin/Desktop/CoWork/output/playwright/agent-cycle2/averroes-terminal/24-pwd-after-dock-focus.png`

This means the environment is now materially stronger for OSWorld-style parallel rollouts, but viewer-only text-input fidelity should still be treated as an open bug class rather than as fully closed.

Follow-up update from the next cycle:

- the click-to-type race in the viewer was narrowed to delayed single-click dispatch
- `DesktopSurface` now flushes any pending single click before forwarding keyboard input, so `click -> immediate typing` no longer races against the 180ms double-click disambiguation timer
- local-input QA now includes a dedicated `local-fast-click-then-type` regression and it passes in the latest run
- latest local-input report: `/Users/baghyeonbin/Desktop/CoWork/output/playwright/local-input-qa/report.json`
- local-input QA now also includes explicit viewer-only clipboard regressions for:
  - browser help line -> `ubuntu-help.txt`
  - terminal `/workspace` output -> `terminal-log.txt`
- both viewer-only clipboard regressions pass on the latest local-input run
- local-input QA now also includes a visible-text double-click regression for:
  - `ubuntu-help.txt`
  - `terminal-log.txt`
- the visible-text file-open regression also passes on the latest local-input run
- local-input QA now also includes visible-text source-line selection and clipboard regressions for:
  - browser help reminder line
  - terminal `/workspace` output line
- those visible-text source-line clipboard regressions also pass on the latest local-input run
- local-input QA now also includes a heavy-click mail recovery regression
- this regression verifies that Thunderbird can be driven through repeated folder/message thrash and still recover to:
  - `selectedMessageId = msg-2`
  - the correct `Mock environment notes` preview body
  - a correctly saved `mail-log.txt`
- local-input QA now also includes a file-explorer creation regression
- this regression verifies that `New File` and `New Folder` created from the Files context menu inside `Downloads` appear immediately in the current place rather than silently landing in a different directory
- evidence:
  - `/Users/baghyeonbin/Desktop/CoWork/output/playwright/local-input-qa/scenario8-after-save.png`
  - `/Users/baghyeonbin/Desktop/CoWork/output/playwright/local-input-qa/scenario9-after-save.png`
  - `/Users/baghyeonbin/Desktop/CoWork/output/playwright/local-input-qa/scenario10-browser-after-dblclick.png`
  - `/Users/baghyeonbin/Desktop/CoWork/output/playwright/local-input-qa/scenario10-terminal-after-dblclick.png`
  - `/Users/baghyeonbin/Desktop/CoWork/output/playwright/local-input-qa/scenario11-browser-visible-text-paste.png`
  - `/Users/baghyeonbin/Desktop/CoWork/output/playwright/local-input-qa/scenario11-terminal-visible-text-paste.png`
  - `/Users/baghyeonbin/Desktop/CoWork/output/playwright/local-input-qa/scenario12-after-mail-recovery.png`
  - `/Users/baghyeonbin/Desktop/CoWork/output/playwright/local-input-qa/scenario12-after-save.png`
  - `/Users/baghyeonbin/Desktop/CoWork/output/playwright/local-input-qa/scenario13-after-new-file.png`
  - `/Users/baghyeonbin/Desktop/CoWork/output/playwright/local-input-qa/scenario13-after-new-folder.png`

Additional diagnostic hardening from the same cycle:

- viewer render-model payloads now carry `sessionId`
- the web client ignores mismatched session updates and exposes that state as a toast instead of silently rendering the wrong model
- host-side viewer logs now record render-model fetches, websocket connects/closes, and broadcast events per session

This does not prove that the previously reported headed-browser desync is fully resolved, but it makes the next recurrence materially easier to classify as either:

- a real cross-session delivery bug, or
- an external browser/control-path issue outside the mock environment itself

Follow-up desync verification from the next cycle:

- a dedicated multi-session viewer desync regression was added at `npm run qa:viewer-desync`
- this regression opens two different sessions on the same host:
  - session A: `browser_help_preopen_note_distractors`
  - session B: `terminal_record_working_directory`
- it verifies both the rendered scene and the viewer title metadata before and after reload
- latest passing report:
  - `/Users/baghyeonbin/Desktop/CoWork/output/playwright/viewer-desync-qa/report.json`
- latest passing screenshots:
  - `/Users/baghyeonbin/Desktop/CoWork/output/playwright/viewer-desync-qa/session-a-browser-initial.png`
  - `/Users/baghyeonbin/Desktop/CoWork/output/playwright/viewer-desync-qa/session-b-terminal-initial.png`

Current interpretation:

- the previously reported desync is not reproduced by the current dedicated local regression
- session-aware payload checks and visible screenshots now support the claim that the environment-side viewer path is behaving correctly under this two-session scenario
- if a desync is reported again specifically from an external headed control path, it should now be treated as a narrower reproduction problem rather than as an assumed core viewer defect

This reduces the residual bug from a broad “viewer-only typing may fail” statement to a narrower warning:

- basic immediate typing after click is now covered and passing
- basic viewer-only copy/paste for browser help and terminal output is also covered and passing
- basic visible-text file opening is also covered and passing
- basic visible-text source-line clicking for browser help and terminal output is also covered and passing
- heavy-click mail recovery is also covered and passing
- place-aware file and folder creation in Files is also covered and passing
- long stress runs that mix repeated drags, dock switches, and editor refocuses should still be watched because they have historically exposed timing-sensitive viewer behavior faster than deterministic happy-path QA

## Recent Progress From Live MCP Exploration

The following issues were identified during live rollouts and were fixed immediately:

- Browser help lines can now be selected and copied via `Ctrl+C`.
- Terminal output lines can now be selected and copied via `Ctrl+C`.
- Mail preview lines can now be selected and copied via `Ctrl+C`.
- Selected source lines now have visible highlight feedback in the viewer.
- `actionAccepted` is now shown in the interactive MCP client summary.
- `actionSummary` now exposes coarse effect labels such as `clipboard_changed`, `rejected`, and `window_dragged`.
- Inert clicks on already-focused windows no longer look like meaningful progress.
- Thunderbird preview geometry was aligned more closely with the rendered three-column layout.
- Window movement now works through explicit `MOUSE_DOWN` -> `DRAG_TO` -> `MOUSE_UP` MCP sequences.
- Viewer-local mouse dragging now dispatches the same window-move sequence, so browser-side manual dragging mutates the same session state as MCP actions.
- Dragged windows are now promoted to the front, matching the visual expectation seen in real desktop window moves.
- Viewer-local dragging now uses pointer capture plus drag-release cleanup, which makes repeated drag attempts materially more stable under real browser input.
- The viewer no longer renders the task instruction string inside the desktop surface, eliminating the old bottom-right overlay class of clutter.
- File Explorer sidebar places now exist in the a11y tree, so agents and QA can target them without relying on brittle text hit testing.
- Local-input QA now includes a repeated-drag regression that immediately clicks the sidebar and frame controls after drag completion.

These fixes improve realism, but they do not close the broader fidelity gap described below.

## Additional Findings From Drag-Heavy Exploration

The latest live exploration intentionally used messy user-style behavior rather than optimal scripted action sequences:

- attempted title-bar dragging before the feature existed and confirmed it was a visual no-op even though the pointer moved
- retried the same gesture after the reducer change and confirmed window bounds changed in hidden state and screenshots
- repeated the gesture through browser-local input in the live viewer rather than through MCP-only actions
- used mixed interaction paths where local drag updated the same session that the interactive MCP client was observing
- used screenshots to confirm that a dragged Files window was incorrectly left behind Firefox, then fixed the drag path so the moved window is raised above overlapping windows

This surfaced one new strength and one new limitation:

- the environment now supports a real window-move recovery path that feels materially closer to a desktop
- a single local drag gesture currently expands into many intermediate step events, which is realistic at the input level but can inflate RL transcripts and no-op budgets if used naively

## Current Strengths

- The environment is deterministic and fast enough for repeated reset-step-observe loops.
- The same authoritative state drives the MCP layer, the viewer, screenshots, and the a11y-like tree.
- Multi-window tasks already exist across Files, Text Editor, Firefox, Terminal, and Thunderbird.
- The environment supports real visual inspection instead of a hidden or purely textual simulation.
- The pinned dock and basic window controls provide a credible minimal desktop control loop.

These strengths make the project viable as a training gym prototype. The limitations are mostly about depth, realism, and behavioral coverage.

## Remaining Limitations

### 1. Interaction Realism Is Still Shallow

Current interaction depth is still much closer to a task fixture than to a desktop:

- text selection is line-based, not range-based
- there is no drag selection
- there is no word selection on double click
- there is no selection extension with `Shift`
- there is no cursor movement with arrow keys, `Home`, `End`, `PageUp`, or `PageDown`
- there is no text selection in browser task details, only in help lines
- there is no terminal prompt cursor navigation or shell history
- there is no context menu behavior even though `RIGHT_CLICK` exists in the action space
- window movement now exists, but only as title-bar drag with no resize, snap, tiling, edge docking, or drag-from-maximized behavior
- scroll input exists in the action space but still behaves as a non-substantive no-op

Why this matters for RL:

- many realistic rollouts depend on partial selection, correction, and recovery
- the current environment over-rewards exact scripted paths and under-exposes common failure modes
- policy learning will overfit to discrete click targets instead of learning robust desktop manipulation

### 2. Geometry and Hit-Testing Still Risk Divergence

The live MCP exploration surfaced a real class of bug: rendered layout and interaction layout can diverge.

Observed example:

- Thunderbird preview sizing behaved inconsistently during exploration because the renderer and the logical hit regions were not tightly coupled enough

Current structural risk:

- app layout math is computed in core app layout helpers
- viewer presentation is separately styled in React
- if these drift, a screenshot can look plausible while click targets or a11y bounds are wrong

Why this matters for RL:

- training data becomes contaminated if the agent sees one geometry and interacts with another
- debugging gets harder because screenshots, a11y nodes, and reward state can disagree

### 3. Feedback for RL Is Still Too Coarse

`actionAccepted` is now exposed in the interactive client, which is useful, but the environment still lacks richer step diagnostics.

Missing feedback layers:

- no reason code for rejected actions
- no explicit classification of no-op vs focus-only vs state-changing action
- no indication of which widget or surface consumed the action
- `actionSummary` now provides a coarse delta label, but it is still single-label and lossy
- no structured consumer trace such as `window.frame.titlebar`, `files.row`, or `mail.preview`
- no structured distinction between useful exploration and thrashing
- no compression layer that groups high-frequency local drag motion into a higher-level gesture record

Why this matters for RL:

- policy debugging becomes slower
- reward shaping options remain limited
- action filtering and curriculum design become guesswork

### 4. App Fidelity Is Still Narrow

#### Files

- no nested directories
- no list/grid mode switching
- no sorting, renaming conflicts, duplicate names, or file metadata variation
- no drag and drop between folders
- no context menu workflows

#### Text Editor

- no caret navigation beyond click placement
- no selection ranges
- no copy-cut-paste semantics beyond line-level copy from note editor
- no undo-redo
- no save state transitions beyond clean/dirty

#### Firefox

- tabs are static and low-behavior
- address bar is not an editable navigation surface
- there is no page scroll or partially hidden content
- browser pages act more like local panels than interactive documents
- task detail text is visible but not yet a general selectable text surface

#### Terminal

- command language is tiny
- no shell history
- no cursor navigation inside the prompt
- no multiline output pagination
- no command latency, failure timing, or partial output

#### Thunderbird

- no compose flow
- no search behavior
- no thread navigation
- no scrolling
- no folder-specific dynamics
- narrow widths can still produce cramped presentation

Why this matters for RL:

- richer app semantics are what differentiate a desktop environment from a UI toy
- many real recovery strategies depend on app-internal state rather than just desktop chrome

### 5. Environment Dynamics Are Too Static

The current environment is mostly synchronous and stable within a rollout.

Missing dynamic elements:

- delayed page or app updates
- notifications arriving during work
- focus-stealing events
- background app state changes
- timer-based perturbations
- temporary disabled states
- race conditions between observation and action

Why this matters for RL:

- real desktop tasks are noisy and non-stationary
- current agents can succeed without learning timing-aware recovery behavior

### 6. Perturbation Coverage Is Still Limited

Existing perturbations are useful but narrow:

- `PopupInject`
- `MinimizeAll`
- `RandomPointerSpawn`
- `WindowClose`
- `ZOrderShuffle`

Missing perturbation families:

- partial text corruption
- clipboard corruption or overwrite
- transient loading overlays
- delayed modal appearance
- app-specific state mutations
- task-irrelevant notifications
- file-system-level surprises such as duplicate names or missing files
- viewport changes mid-task

Why this matters for RL:

- recovery and robustness are currently under-trained
- the environment still favors idealized successful trajectories

### 7. QA Coverage Is Good but Not Yet Adversarial Enough

Current QA validates representative flows, but it still leans toward expected-path success.

Gaps:

- there is no action-space fuzzing with assertions about invariant preservation
- there is no targeted no-op budget analysis
- there is no automated verification that screenshots, a11y bounds, and hit targets stay aligned
- there is no viewport stress matrix across multiple app combinations
- there is no dedicated regression suite for partially wrong trajectories beyond the current repeated-drag follow-up coverage
- there is no transcript-level artifact combining actions, observations, rewards, and screenshots into one bundle
- there is not yet a complete drag-focused regression suite covering cancellation, drag-to-edge loss, and overlapped-window drag behavior

Why this matters for RL:

- many failures only appear after wrong actions, not optimal ones
- adversarial QA is closer to actual training-time behavior than deterministic demos

### 8. UX Debt Still Leaks Into Training

Some visual and layout debt is not merely cosmetic because it can alter what the agent perceives:

- narrow app windows can hide or compress important affordances
- some multi-window states leave little safe click space
- the mock still lacks a deeper notion of occlusion, overlap cost, and visual clutter

Why this matters for RL:

- visual clutter should be intentional and measurable, not accidental
- accidental clutter creates brittle policies and confusing debugging sessions

## Root Causes

The main root causes are structural rather than incidental:

1. The environment started as a deterministic mock for end-to-end task completion, not as a rich interaction substrate.
2. Several app surfaces are still panel-like views instead of generalized document surfaces.
3. The action space is broader than the implemented state transitions.
4. Reward and observation tooling have focused on task completion more than on trajectory analysis.
5. Layout truth is still spread across logical geometry code and visual component code.

## Improvement Principles

The next stage should follow these principles:

1. One visible interaction model per surface type.
   If a surface looks selectable, it should expose a consistent selection model.

2. One geometry source per app.
   The renderer, hit-testing, and a11y bounds should all derive from the same layout contract.

3. Wrong actions should be first-class.
   Rejection, recovery, distraction, and partial progress should be observable and testable.

4. Dynamics should be intentional.
   Noise and perturbation should come from modeled rules, not incidental layout bugs.

5. QA should validate non-optimal rollouts, not only successful scripted ones.

## Proposed Roadmap

### Phase 0: Interaction Contract Cleanup

Goal:

- make each app surface expose a clear interaction contract

Work:

- define reusable selectable-text surface behavior in core
- standardize selection state naming across browser, mail, terminal, and note editor
- add explicit action result tags such as `focus_only`, `selection_changed`, `clipboard_changed`, `no_effect`
- align layout contracts so renderer, reducer, and a11y all consume shared geometry definitions
- keep title-bar dragging covered by both MCP-driven and viewer-local regression checks so the new gesture path does not silently degrade

Exit criteria:

- every selectable line or block has one canonical geometry source
- every rejected click can be explained with a structured reason code
- title-bar dragging works in both live MCP rollouts and browser-local input with matching window geometry

### Phase 1: Real Text Manipulation

Goal:

- move from line-click imitation to more realistic text handling

Work:

- add caret navigation with arrows, `Home`, `End`, and selection anchors
- add drag selection and `Shift` extension
- add copy and paste for selected ranges, not only selected lines
- allow browser task details and mail preview to behave like proper selectable documents
- add a reusable drag gesture substrate so future file drag, resize, and selection drag do not each reinvent pointer capture logic

Exit criteria:

- representative tasks can be solved through more than one realistic text-selection path
- partial edits and corrections are possible without reopening the file or surface

### Phase 2: App Fidelity Expansion

Goal:

- make each core app feel less like a fixture and more like an environment

Work:

- Files: directories, sorting, duplicate-name handling, rename conflicts
- Text Editor: undo-redo, range selection, better save-state feedback
- Firefox: editable address bar, scrollable pages, selectable task details, more than two static tabs
- Terminal: history, cursor movement, command latency, richer but bounded command set
- Thunderbird: adaptive layout, scrolling preview, compose and search-lite workflows

Exit criteria:

- each app has at least one recovery path and one distractor path that are not purely decorative

### Phase 3: Dynamic Environment Behavior

Goal:

- introduce time and background state as part of the environment

Work:

- timer-driven perturbations
- delayed popups and notifications
- background app state changes
- transient loading states
- asynchronous task-relevant updates
- transcript compaction for high-frequency pointer motion so drag-heavy rollouts remain analyzable

Exit criteria:

- at least one representative task can be interrupted and still completed through recovery actions

### Phase 4: RL Telemetry and Reward Diagnostics

Goal:

- make trajectory analysis much easier

Work:

- add structured step event logs
- emit state-delta summaries in observation info
- separate positive progress, neutral interaction, and harmful interaction
- expose optional richer reward traces for trainer-facing tools

Exit criteria:

- a failed rollout can be understood without replaying the entire task manually

### Phase 5: Adversarial QA and Evaluation

Goal:

- validate robustness rather than only happy-path completion

Work:

- add no-op and wrong-click regression suites
- add viewport matrix tests
- add geometry consistency tests between render, a11y, and hit-testing
- add stochastic perturbation QA
- store rollout bundles with screenshot, action trace, reward trace, and hidden-state diff

Exit criteria:

- the environment can prove not only that tasks are solvable, but that off-policy behavior is meaningfully handled

## Priority Order

Priority order for the next implementation cycle:

1. shared geometry contract across render, a11y, and reducer
2. reusable selection and caret substrate
3. adaptive Thunderbird layout and scrollable content surfaces
4. structured action result diagnostics
5. dynamic perturbation framework with timers
6. adversarial QA harness

This order is deliberate. Richer apps built on top of unstable geometry or weak telemetry will create expensive debugging debt.

## Concrete Next Tasks

The next concrete engineering tasks should be:

1. Extract per-app layout objects that both renderer and reducer consume directly.
2. Introduce a reusable `SelectableTextState` model in core.
3. Upgrade note editor from line selection to range selection.
4. Make browser task details selectable, not only help lines.
5. Add Thunderbird adaptive width behavior for narrow windows.
6. Add reducer-level reason codes for rejected actions.
7. Add a geometry consistency test that compares render-model bounds to a11y bounds for key surfaces.
8. Add local-input drag QA scenarios for drag cancellation, overlapped windows, and repeated drag motion.
9. Add one QA scenario that intentionally performs several wrong actions before recovery.

## Acceptance Criteria For A Stronger Next Milestone

The next milestone should be considered successful only if all of the following are true:

- a representative task can be solved through at least two distinct realistic action paths
- browser, mail, terminal, and note editor all support the same core copy-paste mental model
- viewer screenshots, a11y nodes, and click targets remain aligned under narrow and wide viewports
- non-trivial wrong actions produce structured diagnostic feedback
- at least one timer-based perturbation can interrupt a rollout
- QA contains both happy-path and recovery-path scenarios

## Suggested Ownership Areas

- `packages/core/src/env/reducer.ts`
  action semantics, selection logic, rejection diagnostics
- `packages/core/src/apps/*.ts`
  canonical geometry and a11y layout
- `packages/web/src/components/WindowFrame.tsx`
  visible interaction affordances and layout stress behavior
- `packages/core/test/integration/mock-env.test.ts`
  deterministic regression coverage
- `packages/mcp-server/src/clients/interactive.ts`
  trainer-facing step visibility

## Final Note

The environment is already strong enough to demonstrate end-to-end desktop rollouts. The next challenge is different: make it hard in the right ways.

The target should not be pixel-perfect Ubuntu. The target should be a mock desktop where:

- visual state is trustworthy
- wrong actions are informative
- recovery is meaningful
- app surfaces support more than one successful strategy
- perturbations produce realistic policy pressure
