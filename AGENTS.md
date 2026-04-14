# CoWork Agent Guide

## What This Repository Is

CoWork is a deterministic desktop research environment for agent training and evaluation.

It is:

- a TypeScript semantic core
- a browser viewer for human inspection
- an MCP server exposing Computer-13 style tools
- a task catalog for desktop workflows

It is not:

- a VM
- a full OS emulator
- a pixel-faithful Ubuntu clone

The goal is controllable, inspectable desktop interaction with enough realism for RL prototyping, agent evaluation, perturbation testing, and human debugging.

## Governing Philosophy

Read and modify the system through one doctrine:

`Semantic Core, Layered Realism`

This expands into five rules:

1. `semantic core is authoritative`
2. `realism is layered`
3. `tasks are scenarios, not patches`
4. `observations are contracts`
5. `compatibility is not authority`

In practice:

- `EnvState` is the single source of truth
- reward, filesystem, window state, and task semantics belong to the core
- viewer/runtime realism may augment the experience, but it must not create a second semantic authority
- task setup should use scenario builders instead of hand-built hidden state
- compatibility entrypoints may remain, but they should stay thin

## Current Architecture

The codebase is easiest to reason about in four layers.

### 1. Semantic Core

Owns:

- environment state
- reducers and app logic
- perturbations
- reward evaluation
- canonical observation
- authoritative filesystem tree

Key files:

- `packages/core/src/env/session.ts`
- `packages/core/src/env/reducer.ts`
- `packages/core/src/env/evaluator.ts`
- `packages/core/src/env/observation.ts`
- `packages/core/src/system/filesystem.ts`

### 2. Scenario Layer

Owns:

- task setup composition
- scenario builders
- task registry
- family-specific task modules

Key files:

- `packages/core/src/tasks/scenario-types.ts`
- `packages/core/src/tasks/scenario-builders.ts`
- `packages/core/src/tasks/registry.ts`
- `packages/core/src/tasks/starter/index.ts`
- `packages/core/src/tasks/representative/index.ts`
- `packages/core/src/tasks/team3/index.ts`
- `packages/core/src/tasks/files-window-tasks.ts`

### 3. Interaction Layer

Owns:

- MCP tool surface
- interactive client
- scripted client
- browser-local input in the viewer

Key files:

- `packages/mcp-server/src/index.ts`
- `packages/mcp-server/src/host.ts`
- `packages/mcp-server/src/clients/interactive.ts`
- `packages/mcp-server/src/clients/test.ts`
- `packages/web/src/DesktopApp.tsx`
- `packages/web/src/components/DesktopSurface.tsx`

### 4. Realism Layer

Owns:

- viewer rendering
- hybrid browser runtime
- browser runtime augmentation

Key files:

- `packages/core/src/observation/browser-augmentation.ts`
- `packages/mcp-server/src/browser-runtime/hybrid-browser-manager.ts`
- `packages/mcp-server/src/browser-runtime/browser-dom-snapshot.ts`
- `packages/web/src/components/window-bodies/BrowserBody.tsx`

## Repository Layout

- `packages/core`
  - semantic core
  - task registry and scenario builders
  - app implementations
  - filesystem, window system, perturbations
- `packages/web`
  - desktop viewer
  - shell rendering
  - window bodies and local input handling
- `packages/mcp-server`
  - MCP host and tools
  - `src/clients/*` for user-facing CLI clients
  - `src/qa/*` for end-to-end QA flows
  - `src/browser-runtime/*` for hybrid browser realism
- `packages/core/test`
  - `contracts/*` for contract boundaries
  - `integration/*` for environment-level integration tests
  - `regression/*` for focused subsystem regression tests
- `scripts`
  - `validation/*` for maintained validation entrypoints
  - `manual/*` for opt-in human-run harnesses
  - `replay/*` for log replay utilities
  - `experimental/*` for exploratory tools
  - `archive/*` for historical one-off material
- `docs`
  - current design and analysis notes
  - `archive/*` for historical reports

Treat these as generated or runtime directories, not source:

- `packages/*/dist`
- `output/`
- `tmp/`
- `logs/`
- `.playwright-cli/`

## Core Product Surface

Current desktop apps:

- Files
- Text Editor
- Firefox
- Terminal
- Thunderbird

Current shell capabilities:

- top bar
- launcher-style left dock
- popup/modal layer
- local mouse and keyboard input in the browser viewer
- title-bar dragging
- top-edge snap-to-maximize
- window controls through both MCP and browser-local input

Important limitation:

- broader resize, half-tiling, and full compositor vocabulary are still incomplete

## Browser Model

Firefox is intentionally hybrid, but not uniformly so.

- `explorer` and `help` task surfaces are env-owned semantic pages
- `external` browser pages can use a host-managed hybrid runtime
- browser observation remains canonical in the core
- runtime browser detail is attached through `browserAugmentations`

This split is important:

- synthetic task surfaces should remain core-authoritative
- runtime browser pixels should be treated as realism, not authority

## Filesystem Model

The filesystem is tree-first.

- authoritative state lives in `nodes`, `rootNodeIds`, and `cwdNodeId`
- compatibility caches such as `files` and `order` may still exist
- new logic should prefer tree-first helpers

Prefer these helpers:

- `getFileEntry(...)`
- `getOrderedFiles(...)`
- `getFilesInDirectory(...)`
- `setWorkingDirectory(...)`
- `ensureDirectoryPath(...)`

Avoid introducing new direct logic over:

- `fileSystem.files[...]`
- `fileSystem.order`
- `fileSystem.directoryChildren`

unless you are explicitly working inside compatibility plumbing.

## Task System

The active catalog is registry-driven.

Authoritative surface:

- `packages/core/src/tasks/registry.ts`

Current split counts:

- `all`: `200`
- `starter`: `100`
- `representative`: `100`
- `train`: `100`
- `eval`: `100`

Primary catalog sources:

- `packages/core/src/tasks/starter/index.ts`
- `packages/core/src/tasks/representative/index.ts`
- `packages/core/src/tasks/files-window-tasks.ts`
- `packages/core/src/tasks/team3/index.ts`

Compatibility entrypoints:

- `packages/core/src/tasks/starter-tasks.ts`
- `packages/core/src/tasks/representative-tasks.ts`

These are thin public surfaces only.

When adding or modifying tasks:

- prefer scenario builders
- make visible workspace state match reward semantics
- avoid hidden bespoke state that the visible app path cannot reach
- keep task IDs stable unless explicitly doing a migration

## Observation Contract

The canonical observation model is:

- `a11yTree`
- `browserAugmentations`

The contract lives in:

- `packages/core/src/types.ts`
- `packages/core/src/env/observation.ts`
- `packages/core/src/observation/browser-augmentation.ts`

Rules:

- `a11yTree` is the canonical semantic surface
- augmentations are explicit and typed
- host/runtime may add browser detail, but they should do it through the shared augmentation contract

## MCP Surface

Agent-facing tools:

- `computer13.observe`
- `computer13.step`
- `computer13.list_action_space`

Trainer/debug tools:

- `trainer.create_session`
- `trainer.list_tasks`
- `trainer.reset`
- `trainer.sample_task`
- `trainer.apply_perturbation`
- `trainer.snapshot`
- `trainer.restore_snapshot`
- `trainer.get_hidden_state`
- `trainer.close_session`

Viewer base URL:

- `http://127.0.0.1:4315`

Health check:

- `http://127.0.0.1:4315/healthz`

## Commands You Will Actually Use

Environment setup:

```bash
export PATH="/opt/homebrew/opt/node@20/bin:$PATH"
npm install
npx playwright install chromium
```

Main development commands:

```bash
npm run build
npm run typecheck
npm test
```

Useful focused commands:

```bash
npm run test:contracts
npm run test:harness
npm run test:stress
npm run validate:all
```

Run modes:

```bash
npm run start:mcp
npm run demo:scripted
npm run test:mcp-client
npm run interactive:mcp-client -- --task dismiss_popup_then_append_note --open
```

QA:

```bash
npm run qa:representative
npm run qa:local-input
npm run qa:viewer-desync
npm run qa:osworld-adversarial
```

If the default port is already occupied:

```bash
OS_MOCK_PORT=4461 npm run qa:local-input
```

## Validation Policy

Before claiming a meaningful refactor is complete, prefer:

```bash
npm run typecheck
npm test
npm run validate:all
```

Use lighter validation when appropriate:

- doc-only change: no runtime tests required
- narrow core refactor: run affected regression tests plus `typecheck`
- task/QA/reflection change: at minimum run `test:contracts` and the relevant QA

## Manual Debugging Workflow

Best human inspection path:

```bash
npm run interactive:mcp-client -- --task dismiss_popup_then_append_note --open
```

Useful interactive commands:

- `tasks`
- `observe`
- `reset <taskId> <seed>`
- `click <x> <y>`
- `double <x> <y>`
- `type <text>`
- `press <key>`
- `hotkey ctrl+s`
- `snapshot <name>`
- `restore <snapshotId>`
- `done`

## Working Rules For Future Agents

When changing the codebase:

- keep the semantic core authoritative
- do not let viewer/runtime realism become a second semantic source
- prefer scenario builders over handwritten `EnvState` assembly
- prefer tree-first filesystem helpers
- prefer shared observation augmentation helpers over ad hoc mutation
- keep compatibility entrypoints thin
- keep docs aligned with current paths and scripts

When cleaning up:

- remove dead code conservatively
- keep public entrypoints if they still serve compatibility
- move exploratory material into `scripts/experimental` or `docs/archive`, not root

When testing:

- treat `packages/core/test/contracts` as the public invariants
- treat `packages/core/test/regression` as subsystem guardrails
- treat `packages/core/test/integration` as environment-level confirmation

## Known Limitations

Current debt worth remembering:

- window resize and broader tiling behavior are incomplete
- some large task files still contain unique setup patterns that could be pushed further into shared builders
- the browser model is intentionally mixed: semantic task pages are synthetic while external browsing can be hybrid

These are design realities, not hidden bugs.

## Documents Worth Reading

Read these in order:

1. `AGENTS.md`
2. `README.md`
3. `README-Revised.md` if you need deeper architectural framing

Useful current docs:

- `docs/paper-draft/hybrid-firefox-design.md`
- `docs/paper-draft/rl-agent-gap-analysis.md`
- `docs/paper-draft/sim-to-real-audit.md`

Historical material lives under `docs/archive/` and should not be treated as the current source of truth.

## First Five Minutes In A New Session

From repo root:

```bash
export PATH="/opt/homebrew/opt/node@20/bin:$PATH"
npm run build
npm test
npm run test:contracts
```

If you need visual confirmation:

```bash
npm run interactive:mcp-client -- --task dismiss_popup_then_append_note --open
```

If you need the fullest confidence check:

```bash
npm run validate:all
```

Keep this file current when:

- architecture changes
- task registry structure changes
- script paths change
- test taxonomy changes
- MCP client or QA entrypoints move
