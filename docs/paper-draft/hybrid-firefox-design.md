# Hybrid Firefox Design

Date: 2026-03-20

## Goal

Replace the current synthetic Firefox content surface with a host-managed real Chromium page, while keeping the existing mock shell and window manager authoritative for:

- window position
- focus
- minimize / maximize / restore
- z-order
- dock behavior
- task and perturbation flow

The target is not "run a full desktop browser inside the viewer." The target is:

- the CoWork shell still owns the desktop
- the Firefox content area is rendered by a real browser engine
- screenshot realism improves sharply
- interaction remains controllable and replayable

## Recommended Form

Use a server-side Playwright runtime plus a viewer-side streamed browser surface.

Do not use an in-viewer `iframe` as the primary architecture.

Reason:

- the viewer itself is already a browser page
- nested browser semantics would be constrained by cross-origin rules, focus ownership, popup behavior, file chooser behavior, and clipboard limitations
- the current host already runs Playwright for screenshots, so a persistent Chromium runtime fits the existing stack better than a client-side nested browser

This design should be thought of as:

- mock shell outside
- real browser engine inside the Firefox content rect

## Current Constraints In The Codebase

These parts already exist and should be preserved:

- authoritative shell state in [session.ts](/Users/baghyeonbin/Desktop/CoWork/packages/core/src/env/session.ts)
- render-model fetch + websocket updates in [host.ts](/Users/baghyeonbin/Desktop/CoWork/packages/mcp-server/src/host.ts)
- browser-local interaction dispatch in [DesktopSurface.tsx](/Users/baghyeonbin/Desktop/CoWork/packages/web/src/components/DesktopSurface.tsx)
- viewer session fetch / action POST flow in [render-model.ts](/Users/baghyeonbin/Desktop/CoWork/packages/web/src/render-model.ts)
- current single-source render and a11y assembly in [observation.ts](/Users/baghyeonbin/Desktop/CoWork/packages/core/src/env/observation.ts)

These are the current architectural blockers:

1. Firefox is still fully environment-owned.
   The state and layout are generated entirely by [browser-lite.ts](/Users/baghyeonbin/Desktop/CoWork/packages/core/src/apps/browser-lite.ts).

2. Render model and a11y are built entirely from core env state.
   That is good for determinism, but it means a real Chromium page becomes a second authority unless we explicitly integrate it.

3. Viewer action routing is coarse-grained.
   The viewer posts generic `Computer13Action` events to [host.ts](/Users/baghyeonbin/Desktop/CoWork/packages/mcp-server/src/host.ts), which currently forwards them directly to `MockOsEnv.step(...)`.

## Design Principles

1. Keep shell authority in core.
2. Move only browser content rendering and DOM interaction into the host runtime.
3. Avoid a split-brain system where the user sees one browser state but the a11y tree reports another.
4. Preserve deterministic training behavior by limiting the browser surface to controlled pages first.
5. Land this incrementally behind a mode flag rather than replacing `browser-lite` in one shot.

## Proposed Architecture

### High-Level Data Flow

1. Core env still owns a Firefox window and its frame chrome.
2. Host detects that a browser window is in `hybrid` mode.
3. Host maintains a persistent Playwright `BrowserContext` and `Page` for that window.
4. Host captures the page viewport for the Firefox content rect.
5. Host exposes the captured frame to the viewer as an image endpoint.
6. Viewer renders the Firefox frame chrome normally, but draws the content area from the host-provided browser frame.
7. Pointer / keyboard events that land inside the browser content rect are forwarded to the host's Playwright page instead of to `MockOsEnv.step(...)`.
8. Host produces browser DOM-derived metadata for the Firefox subtree so the observation and a11y path stay aligned enough for agents.

### Recommended Runtime Shape

- one host-level Chromium browser process shared across sessions
- one browser context per CoWork session
- one page per Firefox window

That is the best tradeoff between:

- startup latency
- isolation
- deterministic cleanup
- memory use

## File And Module Changes

이 문서의 일부 섹션은 원래 “제안 아키텍처”였다. 현재 구현에서는 그 제안 중 상당 부분이 **더 얇은 형태로 실제 코드에 반영**되어 있다.

### 1. Core Types

Change:

- [types.ts](/Users/baghyeonbin/Desktop/CoWork/packages/core/src/types.ts)

Current implementation already uses:

- `renderMode: "synthetic" | "hybrid"`
- `BrowserSurfaceViewModel`
- `browserAugmentations`

Recommended additions:

```ts
export type BrowserRenderMode = "synthetic" | "hybrid";

export type BrowserHybridState = {
  mode: BrowserRenderMode;
  runtimeWindowId?: string;
  initialUrl?: string;
  lastKnownUrl?: string;
  lastKnownTitle?: string;
  frameRevision?: number;
  contentReady: boolean;
};
```

`BrowserLiteState` now carries `renderMode`, and `BrowserLiteViewModel` carries a host-backed `surface` payload when needed.

The current shape is conceptually:

```ts
hybrid?: {
  enabled: boolean;
  frameUrl?: string;
  frameRevision?: number;
  contentBounds: Rect;
  loading: boolean;
  lastKnownUrl?: string;
  lastKnownTitle?: string;
};
```

### 2. Browser App Plugin

Change:

- [browser-lite.ts](/Users/baghyeonbin/Desktop/CoWork/packages/core/src/apps/browser-lite.ts)

Refactor:

- keep browser chrome, tabs, address bar, history affordances, and high-level browser shell state in core
- stop treating the content area as a fully synthetic page when in hybrid mode

In hybrid mode, this plugin should:

- still compute `contentBounds`
- still handle shell-level clicks on tabs / nav / address bar if desired
- stop generating synthetic task/detail body content
- expose enough metadata for the viewer to render a host-backed content frame

This file should become "browser shell state and shell hit-testing," not "entire Firefox application renderer."

### 3. Observation And Render Model Integration

Change:

- [observation.ts](/Users/baghyeonbin/Desktop/CoWork/packages/core/src/env/observation.ts)
- [session.ts](/Users/baghyeonbin/Desktop/CoWork/packages/core/src/env/session.ts)

Current behavior:

- `buildRenderModel(...)` and `buildA11yTree(...)` are purely core-derived

Needed change:

- allow host-supplied browser runtime metadata to be merged into the Firefox window's appView and a11y subtree before the final observation is returned

Recommended pattern:

- keep `MockOsEnv` pure by default
- add an optional host-side render augmentation step in [host.ts](/Users/baghyeonbin/Desktop/CoWork/packages/mcp-server/src/host.ts)

That means:

- `MockOsEnv.getRenderModel()` stays pure
- `HostApp.getSessionRenderModel(...)` augments browser windows with hybrid payloads
- `decorateResult(...)` augments `result.observation.a11yTree` for browser windows before returning

This avoids forcing Playwright awareness into core env logic.

### 4. Host Runtime Manager

The current implementation uses a leaner runtime surface than this draft originally proposed.

Actual modules today:

- `packages/mcp-server/src/browser-runtime/hybrid-browser-manager.ts`
- `packages/mcp-server/src/browser-runtime/browser-surface-template.ts`
- `packages/mcp-server/src/browser-runtime/browser-dom-snapshot.ts`

Conceptually they still cover the same responsibilities:

- host-managed Chromium lifecycle
- frame capture and streaming
- browser content templating/composition
- DOM-derived augmentation for observation

### 5. Host API Surface

Change:

- [host.ts](/Users/baghyeonbin/Desktop/CoWork/packages/mcp-server/src/host.ts)

Add:

- host-owned browser runtime manager instance
- sync hook when sessions reset or restore
- extra routes for browser frame and browser input

Recommended new endpoints:

- `GET /api/sessions/:sessionId/browser/:windowId/frame`
- `POST /api/sessions/:sessionId/browser/:windowId/input`
- `GET /api/sessions/:sessionId/browser/:windowId/a11y`
- `POST /api/sessions/:sessionId/browser/:windowId/nav`

Current responsibilities inside `HostApp` are close to this shape:

1. On `createSession(...)`:
- create host session bookkeeping, but do not eagerly launch Firefox page yet

2. On `reset(...)` / `restoreSnapshot(...)`:
- inspect env windows
- ensure hybrid Firefox runtimes exist for the matching browser windows
- navigate them to the initial URL if needed

3. On `closeSession(...)`:
- dispose Playwright context for that session

4. On render-model fetch / websocket broadcast:
- augment Firefox windows with latest hybrid surface metadata

5. On viewer browser-content input:
- forward to Playwright only for `external` browser pages
- keep `explorer` / `help` task pages env-owned

### 6. Viewer Transport And Rendering

Change:

- [render-model.ts](/Users/baghyeonbin/Desktop/CoWork/packages/web/src/render-model.ts)
- [DesktopApp.tsx](/Users/baghyeonbin/Desktop/CoWork/packages/web/src/DesktopApp.tsx)
- [WindowFrame.tsx](/Users/baghyeonbin/Desktop/CoWork/packages/web/src/components/WindowFrame.tsx)
- [DesktopSurface.tsx](/Users/baghyeonbin/Desktop/CoWork/packages/web/src/components/DesktopSurface.tsx)

Recommended viewer strategy:

- Firefox shell stays in React
- content area renders an `<img>` whose source points at the host frame endpoint with `?rev=<frameRevision>`

Why `<img>` first:

- minimal disruption
- screenshot capture works immediately
- avoids trying to mount a second browser runtime inside the current browser runtime

In [WindowFrame.tsx](/Users/baghyeonbin/Desktop/CoWork/packages/web/src/components/WindowFrame.tsx):

- if `window.appView.type === "browser-lite"` and `appView.hybrid?.enabled`, render host-backed image content instead of synthetic content body

In [DesktopSurface.tsx](/Users/baghyeonbin/Desktop/CoWork/packages/web/src/components/DesktopSurface.tsx):

- detect whether the pointer event lands inside the hybrid browser content rect
- if yes, route the event to browser input endpoint rather than generic `viewer-action`
- keep shell drag/title-bar/control behavior unchanged

### 7. Browser Input Protocol

Add browser-specific input messages separate from `Computer13Action`.

Why:

- shell actions and DOM actions have different lifecycles
- the shell wants viewport-space coordinates
- Playwright wants page-viewport coordinates and direct keyboard semantics

Recommended shape:

```ts
type BrowserRuntimeInput =
  | { type: "click"; x: number; y: number; button?: "left" | "middle" | "right"; clickCount?: number }
  | { type: "move"; x: number; y: number }
  | { type: "down"; button?: "left" | "middle" | "right" }
  | { type: "up"; button?: "left" | "middle" | "right" }
  | { type: "scroll"; dx: number; dy: number }
  | { type: "type"; text: string }
  | { type: "press"; key: string }
  | { type: "hotkey"; keys: string[] };
```

This should be interpreted by the host runtime, not by core env.

## Lifecycle And State-Sync Risks

### 1. Split-Brain Render State

This is the hardest problem.

Today:

- what the user sees
- what the a11y tree says
- what the env thinks

all come from one state graph.

With hybrid Firefox:

- shell comes from env
- browser content comes from Playwright

If these drift, the system becomes brittle again.

Mitigation:

- keep browser shell state small and explicit in core
- keep browser content state host-owned
- merge host metadata into render-model and observation only at the host boundary
- never let viewer improvise browser state locally

### 2. Snapshot / Restore Drift

Current snapshots in [session.ts](/Users/baghyeonbin/Desktop/CoWork/packages/core/src/env/session.ts) still store env state only.

That is not enough once a real browser page exists.

Mitigation:

- add host-side browser runtime snapshots
- store at least URL, scroll position, selected tab, and storage state for the whitelisted browser page set
- for v1, keep browser tasks constrained to local mirrored pages whose state can be reconstructed deterministically

### 3. Reset / Restore / Window-Reopen Races

The env can recreate or close browser windows instantly, but a Playwright page is asynchronous to launch and navigate.

Mitigation:

- HostApp owns a reconciliation loop:
  - inspect env browser windows
  - create missing runtimes
  - tear down orphan runtimes
  - expose `loading` state until page is ready

### 4. Resize And Frame Capture Thrash

If the browser window resizes or moves frequently, naive frame capture will flood the host.

Mitigation:

- movement alone should not require browser rerender if only the outer shell moved
- only recapture when the content viewport changes size or the browser page visually changes
- debounce resize-driven page.setViewportSize / capture
- maintain frame cache by `sessionId + windowId + revision`

### 5. Input Ordering Bugs

The current viewer action path queues actions in [DesktopApp.tsx](/Users/baghyeonbin/Desktop/CoWork/packages/web/src/DesktopApp.tsx). Browser input needs similar serialization.

Mitigation:

- keep a per-window browser input queue in the host runtime
- viewer should not fire generic shell click and browser click for the same event
- shell hit-testing must decide whether the target is titlebar/chrome or browser content

### 6. Determinism Regressions

Real browsers introduce:

- timers
- animations
- asynchronous network
- popup behavior
- storage persistence

Mitigation:

- local mirrored pages first
- fixed fonts, viewport, locale, timezone, and profile
- optional request interception / offline mode
- avoid arbitrary external sites in the first implementation

## Suggested Phased Implementation

### Phase 0: Add The Abstraction Boundary

Goal:

- create no-op hybrid plumbing without changing user-visible behavior yet

Work:

- this phase is effectively complete in the current codebase

Success:

- no visual regressions
- no task regressions

### Phase 1: Static Host-Backed Browser Frame

Goal:

- render Firefox content from a real Chromium page, but read-only

Work:

- this phase is also effectively present now

Success:

- representative screenshots show a real browser-rendered page
- shell interaction still works

### Phase 2: Pointer And Keyboard Forwarding

Goal:

- make Firefox content interactive enough for browser tasks

Work:

- current implementation uses a narrower version:
  - `external` pages forward to host/runtime
  - task-owned `explorer` / `help` pages stay synthetic and core-authoritative

Success:

- simple browser tasks can be completed through the hybrid surface

### Phase 3: Browser A11y Integration

Goal:

- make `observe()` align with the real page content

Work:

- host fetches a DOM/a11y snapshot from Playwright
- translate it into a subtree that fits the existing `A11yNode` model in [types.ts](/Users/baghyeonbin/Desktop/CoWork/packages/core/src/types.ts)
- merge that subtree under the Firefox window node in [observation.ts](/Users/baghyeonbin/Desktop/CoWork/packages/core/src/env/observation.ts) or at the host decoration layer

Success:

- a11y targeting for browser tasks is credible again

### Phase 4: Snapshot / Restore And Deterministic Policy

Goal:

- make hybrid Firefox training-safe

Work:

- host-side browser snapshot support
- reset / restore integration
- local mirror policy for OSWorld Explorer and help pages
- request interception or offline replay support

Success:

- browser state survives reset / restore semantics expected by trainer workflows

## Minimal-Disruption Migration Path

The least risky path is:

1. keep `browser-lite` as the shell plugin
2. add `renderMode`
3. let the host augment Firefox appView rather than replacing core render-model assembly
4. switch only the content body to host-backed rendering first
5. keep tabs, address bar, and nav affordances synthetic until the host path is stable

That avoids rewriting:

- task logic
- shell hit-testing
- window management
- existing viewer transport

all at once.

## Non-Goals For V1

Do not try to support these immediately:

- arbitrary internet navigation
- downloads
- uploads and file picker integration
- popup windows
- devtools
- extension support
- full multi-tab session restore

If these are included too early, the complexity jumps before the realism win is locked in.

## Expected Payoff

If implemented well, this will:

- remove the strongest current screenshot-level giveaway
- make Firefox windows look meaningfully more real than any amount of synthetic JSX tuning
- improve subagent "real vs replica" confusion substantially for browser-centered scenes

It will not by itself make the entire desktop indistinguishable from real Ubuntu.

The next biggest giveaways after this will still be:

- Files semantics and visual density
- Thunderbird semantics and density
- cross-app uniformity

But hybrid Firefox is still the highest-leverage realism upgrade available in the current codebase.

## Difficulty And Expected Effect

### Implementation Difficulty

Estimated difficulty by phase:

- Phase 0: low to medium
- Phase 1: medium
- Phase 2: medium to high
- Phase 3: high
- Phase 4: high

Practical interpretation:

- a screenshot-only proof of concept is realistic in a short cycle
- an actually usable hybrid browser is a meaningful subsystem project
- a training-grade deterministic hybrid browser is a full architectural feature, not a UI tweak

### Expected Effect On Realism

Expected gains:

- Firefox screenshot realism: very high
- overall desktop screenshot realism: high
- short browser-task interaction realism: medium to high
- long-horizon browser-task realism: medium

This is the single change most likely to move blind screenshot audits from:

- "obvious replica"

to:

- "possibly real, need another cue"

### Likelihood Of Fooling Agents

For screenshot-only evaluators:

- likely high if the rendered page is believable and locally mirrored

For short-horizon interactive agents:

- likely medium to high once click, scroll, typing, selection, and address-bar flows are forwarded cleanly

For longer OSWorld-style agents:

- likely medium unless the following are also addressed later:
  - upload and download flows
  - clipboard parity
  - tab and history behavior
  - browser dialogs
  - observation and a11y parity

The important point is that hybrid Firefox does not need to solve the entire sim-to-real gap by itself. It only needs to remove the strongest current giveaway, which it is well positioned to do.

## Recommendation

Proceed with the hybrid Firefox architecture, but do it as:

- host-managed Playwright runtime
- image-backed browser surface in the viewer
- browser-specific input routing
- host-side render-model and a11y augmentation
- strict deterministic policy around allowed pages

This is the best balance between:

- realism
- engineering risk
- compatibility with the current shell/window-manager architecture
- future RL-oriented determinism
