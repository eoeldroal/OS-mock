# CoWork: Semantic Core, Layered Realism

This document is the research-facing description of the repository.

Where [README.md](/Users/baghyeonbin/Desktop/CoWork/README.md) is the operational entrypoint, this file explains the system in the terms that best match its intended paper story and long-term architecture.

## One-Sentence Summary

CoWork is a deterministic desktop research environment built around a semantically authoritative core, with visual realism and browser-runtime detail layered on top without duplicating authority.

## What Problem This System Solves

Many desktop-agent environments force an uncomfortable tradeoff:

- either they are highly realistic but difficult to control, inspect, and reproduce
- or they are easy to control but too synthetic to support convincing human inspection and screenshot-driven evaluation

CoWork is designed to sit between those extremes.

It does not attempt to emulate a full operating system.
Instead, it treats desktop semantics as the primary object of the system:

- window topology
- application state
- filesystem state
- reward semantics
- perturbation semantics
- canonical accessibility-like observation

Those semantics are deterministic and authoritative.
Realism is then layered on top in carefully bounded ways.

## Governing Philosophy

The repository is organized around five principles.

### 1. Semantic Core Is Authoritative

There is one authoritative environment state.

The following belong to the core and nowhere else:

- visible windows
- app-local state
- filesystem truth
- reward targets and predicates
- perturbation effects
- canonical observation

The viewer, the MCP host, and browser runtime components are consumers of this authority, not peers.

### 2. Realism Is Layered

Realism should improve perception without fragmenting semantics.

In CoWork:

- shell structure remains core-owned
- browser runtime pixels may come from a host-managed Chromium session
- browser DOM-derived nodes appear as declared augmentations
- screenshots and live inspection are downstream products of the same semantic world

This lets the system become more visually credible without becoming semantically ambiguous.

### 3. Tasks Are Scenarios, Not Patches

Tasks should not be hidden bags of state mutations.

Instead, a task should construct a visible, inspectable scenario:

- the relevant workspace exists
- the relevant applications are open
- the relevant files exist in the authoritative filesystem
- the reward contract matches the visible interaction path

This is the reason the repository now favors scenario builders and task-family modules over handwritten `EnvState` assembly.

### 4. Observations Are Contracts

Observation is a typed interface, not an incidental dump.

The canonical observation model includes:

- `a11yTree` as the semantic observation surface
- structured browser augmentation for runtime-derived browser detail

Different consumers may receive different augmentation payloads, but they should still share the same top-level observation contract.

### 5. Compatibility Is Not Authority

Compatibility layers are acceptable.
They are not allowed to become the source of truth.

Examples include:

- filesystem compatibility mirrors
- thin re-export entrypoints
- browser augmentation merge helpers

These exist for migration, stability, or ergonomics.
They should never be mistaken for the authoritative model.

## System Layers

The repository is best understood as four layers.

### Semantic Core

This layer defines the environment's truth.

Primary responsibilities:

- environment state
- reducers
- reward evaluation
- perturbations
- canonical observation
- tree-backed filesystem

Primary files:

- [packages/core/src/env/session.ts](/Users/baghyeonbin/Desktop/CoWork/packages/core/src/env/session.ts)
- [packages/core/src/env/reducer.ts](/Users/baghyeonbin/Desktop/CoWork/packages/core/src/env/reducer.ts)
- [packages/core/src/env/evaluator.ts](/Users/baghyeonbin/Desktop/CoWork/packages/core/src/env/evaluator.ts)
- [packages/core/src/env/observation.ts](/Users/baghyeonbin/Desktop/CoWork/packages/core/src/env/observation.ts)
- [packages/core/src/system/filesystem.ts](/Users/baghyeonbin/Desktop/CoWork/packages/core/src/system/filesystem.ts)

### Scenario Layer

This layer turns abstract tasks into concrete desktop episodes.

Primary responsibilities:

- shared scenario composition
- visible workspace construction
- target artifact creation
- task family modularization

Primary files:

- [packages/core/src/tasks/scenario-types.ts](/Users/baghyeonbin/Desktop/CoWork/packages/core/src/tasks/scenario-types.ts)
- [packages/core/src/tasks/scenario-builders.ts](/Users/baghyeonbin/Desktop/CoWork/packages/core/src/tasks/scenario-builders.ts)
- [packages/core/src/tasks/team3/index.ts](/Users/baghyeonbin/Desktop/CoWork/packages/core/src/tasks/team3/index.ts)
- [packages/core/src/tasks/registry.ts](/Users/baghyeonbin/Desktop/CoWork/packages/core/src/tasks/registry.ts)

### Interaction Layer

This layer exposes multiple ways to act on the same semantic state.

Primary responsibilities:

- core API rollouts
- MCP tools
- interactive inspection
- scripted clients
- browser-local user input

Primary files:

- [packages/mcp-server/src/host.ts](/Users/baghyeonbin/Desktop/CoWork/packages/mcp-server/src/host.ts)
- [packages/mcp-server/src/clients/interactive.ts](/Users/baghyeonbin/Desktop/CoWork/packages/mcp-server/src/clients/interactive.ts)
- [packages/mcp-server/src/clients/test.ts](/Users/baghyeonbin/Desktop/CoWork/packages/mcp-server/src/clients/test.ts)
- [packages/web/src/components/DesktopSurface.tsx](/Users/baghyeonbin/Desktop/CoWork/packages/web/src/components/DesktopSurface.tsx)

### Realism Layer

This layer increases perceptual credibility without taking semantic ownership.

Primary responsibilities:

- shell rendering
- browser-content compositing
- browser DOM-derived augmentation
- screenshot-oriented QA and inspection

Primary files:

- [packages/core/src/observation/browser-augmentation.ts](/Users/baghyeonbin/Desktop/CoWork/packages/core/src/observation/browser-augmentation.ts)
- [packages/mcp-server/src/browser-runtime/hybrid-browser-manager.ts](/Users/baghyeonbin/Desktop/CoWork/packages/mcp-server/src/browser-runtime/hybrid-browser-manager.ts)
- [packages/mcp-server/src/browser-runtime/browser-dom-snapshot.ts](/Users/baghyeonbin/Desktop/CoWork/packages/mcp-server/src/browser-runtime/browser-dom-snapshot.ts)

## Current Structural Decisions

### Task Catalog

The active registry exposes:

- `all`: 200 tasks
- `starter`: 100 tasks
- `representative`: 100 tasks
- `train`: 100 tasks
- `eval`: 100 tasks

This catalog is assembled from:

- starter task families
- representative task families
- files/window tasks
- modularized `team3` task families

The registry is the authoritative surface for task discovery and split resolution.

### Team3 Modularization

The earlier monolithic `custom_team3` task source has been replaced by explicit family modules:

- [packages/core/src/tasks/team3/mail.ts](/Users/baghyeonbin/Desktop/CoWork/packages/core/src/tasks/team3/mail.ts)
- [packages/core/src/tasks/team3/terminal.ts](/Users/baghyeonbin/Desktop/CoWork/packages/core/src/tasks/team3/terminal.ts)
- [packages/core/src/tasks/team3/shared.ts](/Users/baghyeonbin/Desktop/CoWork/packages/core/src/tasks/team3/shared.ts)

This matters architecturally because it makes scenario-based task composition visible in the code structure itself.

### Filesystem

The filesystem is now tree-first.

- nodes and root references are authoritative
- working directory is managed through tree-aware helpers
- compatibility caches are maintained for older consumers but are not conceptually primary

This gives the environment a cleaner story for both task authoring and evaluation.

### Observation

Observation now has a cleaner two-part model:

- canonical semantic observation via `a11yTree`
- structured runtime detail via `browserAugmentations`

This preserves a single observation contract while allowing browser realism to evolve independently.

## Public Surface

The repository still keeps some thin compatibility entrypoints.

Examples:

- [packages/core/src/tasks/starter-tasks.ts](/Users/baghyeonbin/Desktop/CoWork/packages/core/src/tasks/starter-tasks.ts)
- [packages/core/src/tasks/representative-tasks.ts](/Users/baghyeonbin/Desktop/CoWork/packages/core/src/tasks/representative-tasks.ts)

These should be understood as public convenience surfaces, not as the primary implementation homes of those task families.

## Why This Design Is Useful For Research

This architecture supports a clearer experimental story than either a pure mock or a full OS emulator.

Benefits include:

- deterministic and reproducible semantics
- inspectable reward contracts
- shared task authoring patterns
- layered realism for human and screenshot inspection
- one conceptual observation model across RL, MCP, and browser-driven evaluation

Stated differently:

CoWork is not trying to be a desktop operating system.
It is trying to be a strong experimental substrate for desktop-agent research.

## Current Direction

The most important remaining work is no longer emergency repair.
It is philosophical completion:

- move more task families onto shared scenario builders
- continue reducing non-authoritative compatibility usage
- keep browser realism explicitly layered rather than semantically duplicated
- keep documentation, QA, and task metadata aligned with the same model

## Suggested Reading Order

1. [README.md](/Users/baghyeonbin/Desktop/CoWork/README.md)
2. [AGENTS.md](/Users/baghyeonbin/Desktop/CoWork/AGENTS.md)
3. [packages/core/src/env/session.ts](/Users/baghyeonbin/Desktop/CoWork/packages/core/src/env/session.ts)
4. [packages/core/src/tasks/scenario-builders.ts](/Users/baghyeonbin/Desktop/CoWork/packages/core/src/tasks/scenario-builders.ts)
5. [packages/core/src/tasks/registry.ts](/Users/baghyeonbin/Desktop/CoWork/packages/core/src/tasks/registry.ts)
6. [packages/mcp-server/src/host.ts](/Users/baghyeonbin/Desktop/CoWork/packages/mcp-server/src/host.ts)
