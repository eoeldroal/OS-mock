# Repo Task Workflow

## Purpose

This reference maps high-level AI task-generation requests into concrete OS-mock repository edits.
The target outcome is a runnable batch of tasks by default, but it also supports intentionally impossible-task design when the user asks for it.
Perturbations are out of scope for this workflow version.

## Conversational Intake

Do not require a full schema up front.
Users may start with only a goal, an app pair, a rough batch size, or a request for impossible tasks.
The skill should ask multiple short follow-up questions until the request is sufficient for family planning.

Ask missing fields in this order unless the request already answers them:

1. `goal`
2. `apps`
3. `count`
4. `splits`
5. `feasibility`
6. `difficulties`
7. `variation_preferences`
8. `constraints`

## Minimal Request To Code Mapping

| Request field | Where it lands |
|---|---|
| `goal` | plain-language task goal that becomes the basis for `TaskSpec.instruction` and final success design |
| `apps` | source app, sink app, and family selection |
| `count` | batch size target |
| `splits` | `TaskSpec.split` and target task file |
| `feasibility` | whether the batch is `runnable`, `impossible`, or `mixed` |
| `difficulties` | affects horizon, distractors, setup difficulty, and workflow complexity |
| `variation_preferences` | preferred variation axes for matrix generation |
| `constraints` | excluded features plus implementation-surface limits and whether runtime expansion is allowed |

## Family-First Batch Generation

Always generate large batches in this order:

1. infer task families from the minimal request
2. define each family's source app, sink app, workflow shape, feasibility mode, and predicate chain
3. expand a bounded variation matrix per family
4. run dedup and quality gates
5. implement only the surviving candidates, or keep impossible candidates proposal-only if runtime support is absent

Preferred variation axes:

- `difficulty`
- `content`
- `initial window state`
- `initial focus`
- `distractor count`
- `layout`
- `initial selected item`
- `impossibility reason`

## Impossible Task Rule

Use `doc/personal/20260410_osworld_impossible_tasks.md` as the reference for intentionally impossible tasks.
If the user wants runnable impossible tasks, extend evaluator/session/reward behavior first.
If runtime expansion is not allowed, keep impossible tasks proposal-only and say so explicitly.

## Files To Update

Task implementation:

- `packages/core/src/tasks/starter-tasks.ts`
- `packages/core/src/tasks/representative-tasks.ts`
- `packages/core/src/tasks/registry.ts`

Runtime support when runnable impossible tasks are requested:

- `packages/core/src/types.ts`
- `packages/core/src/env/evaluator.ts`
- `packages/core/src/env/session.ts`

Docs to keep in sync:

- `doc/task/task-hub.md`
- `doc/task/tasks-and-perturbations.md`
- `AGENTS.md`
- `doc/task/task-expansion-spec.md`
- `doc/task/ai-task-prompt-template.md`

## Validation

After inventory changes, run:

- `npm run build`
- `npm test`
- `node .codex/skills/os-mock-task-author/scripts/audit-task-batch.mjs --mode inventory`
- `node .codex/skills/os-mock-task-author/scripts/audit-task-batch.mjs --mode candidates --input <candidate-json>` before promoting generated candidates
