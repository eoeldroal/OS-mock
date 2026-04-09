---
name: os-mock-task-author
description: Use when the user wants to design or implement OS-mock tasks from high-level requests or compact batch-generation prompts. This skill expands minimal input into task families, variation matrices, deduped runnable TaskSpec implementations, synced inventory docs, and validation steps while staying inside the current environment unless expansion is explicitly allowed.
---

# OS Mock Task Author

Use this skill to design and implement OS-mock tasks.
Accept natural language, short structured prompts, or mixed input.
The default outcome is runnable task code plus synced docs, not just a proposal.

User request: $ARGUMENTS

---

## When to use

- Add new OS-mock tasks from high-level requests
- Expand a task family into multiple runnable `TaskSpec`s
- Generate a batch of varied tasks without duplicating the current inventory
- Turn a short user request into real task code and synced docs

## Step 0 — Start from partial input and ask iteratively

Do not assume the user will provide a complete request.
Accept partial input such as only a goal, only an app combination, or only a desired batch size.
The skill must gather missing information through multiple short follow-up questions when needed.

The target request shape is still:

- `goal`: what the simulated user must accomplish
- `apps`: which apps or surfaces are involved
- `count`: how many tasks to generate
- `splits`: `starter`, `representative`, or both
  - `starter`: shorter single-app or simple save/complete tasks
  - `representative`: longer multi-app extraction workflows
- `difficulties`: one or more of `easy`, `medium`, `hard`
- `variation_preferences`: content/layout/focus/window-state/distractor preferences
- `constraints`: excluded features and whether to stay inside the current implementation surface

But this is an internal normalized shape, not a required user-facing schema.
The user may provide only a subset.

If important fields are missing, ask for them one at a time or in a short sequence, prioritizing the highest-impact unknowns first.
Default question priority:

1. `goal`
2. `apps`
3. `count`
4. `splits`
   Ask with a short explanation: `starter` means shorter single-app or simple save/complete tasks, and `representative` means longer multi-app extraction workflows. If the user is unsure, recommend the closer fit instead of repeating the label only.
5. `difficulties`
6. `variation_preferences`
7. `constraints`

Do not ask for predicates, setup details, target keys, or max steps unless they are truly necessary to resolve an ambiguity.
Infer those from the codebase whenever possible.

Only write a normalized request block after enough information has been collected to design families and generate a batch.

```md
### Normalized Request
- goal:
- apps:
- count:
- splits:
- difficulties:
- variation_preferences:
- constraints:
- assumptions:
```

If information is still missing after the first answer, ask again instead of forcing assumptions too early.

## Step 1 — Read context first

Read these files before doing anything else:

- `doc/task/ai-task-prompt-template.md`
- `doc/task/task-expansion-spec.md`
- `doc/task/tasks-and-perturbations.md`
- `doc/task/task-hub.md`
- `packages/core/src/types.ts`
- `packages/core/src/env/evaluator.ts`
- `packages/core/src/tasks/starter-tasks.ts`
- `packages/core/src/tasks/representative-tasks.ts`
- `packages/core/src/tasks/registry.ts`
- `AGENTS.md`
- [references/repo-task-workflow.md](references/repo-task-workflow.md)

## Step 2 — Expand the request into task families

Before designing individual tasks, infer the smallest useful set of task families.
For each family, decide:

- target split and domain
- source app and sink app
- intended workflow shape
- candidate goal and progress predicates
- default setup pattern
- allowed variation axes
- expected difficulty band

Family-first generation is mandatory for large batches.
Do not jump directly from a short request to a flat list of task IDs.

## Step 3 — Build a variation matrix

Generate candidate tasks by expanding each family across a bounded variation matrix.
Use only the current implementation surface.
Perturbations are out of scope for this skill version.

Preferred variation axes:

- `difficulty`
- `content`
- `initial window state`
- `initial focus`
- `distractor count`
- `layout`
- `initial selected item`

Default difficulty semantics:

- `easy`: short horizon, simple setup, low distractor count, favorable focus
- `medium`: 2-3 step workflow, moderate distractors, less favorable initial state
- `hard`: longer multi-step workflow, less favorable initial state, more distractors

If the user asks for multiple difficulties at once, generate a mixed batch from the same family inventory.

## Step 4 — Dedup gate and quality rubric

Every candidate task must pass both gates before implementation.

### Dedup gate

Create a `task fingerprint` from:

- family
- split
- domain
- app scope
- goal predicates
- progress chain
- setup shape
- output artifact
- variation axes actually used

Treat a candidate as a duplicate risk if two or more of these are effectively the same as an existing task:

- app scope
- goal predicate set
- progress chain
- source app -> sink app structure
- setup shape
- workflow meaning with only string substitution differences

If duplicate risk is high, prefer one of these outcomes in order:

1. absorb it into seed variation of an existing task
2. absorb it into an existing family as a documented variation
3. promote it to a new task only if it changes workflow meaning or setup meaning

### Quality rubric

Every candidate must pass:

- `Executable`: supported by the current reducer, app state, factory, and action surface
- `Evaluable`: success can be judged with current predicates and targets
- `Non-trivial`: not just a renamed or reworded copy of an existing task
- `Instruction clarity`: the final artifact and success condition are obvious from the instruction
- `Learning value`: observation, selection, transition, and completion are meaningfully separated

If any rubric item fails, discard the candidate or downgrade it to family variation.

## Step 5 — Implement runnable tasks

The default outcome is runnable task code.
Do not stop at a proposal unless the user explicitly asks for proposal-only output.

Implementation rules:

- add or update deterministic `build*Task` setup functions
- add `TaskSpec` entries in the correct task file
- keep `goalPredicates` minimal
- keep `progressPredicates` ordered and meaningful
- keep `forbiddenPredicates` empty unless the failure state is already supported
- reuse existing `targets` key names whenever possible
- keep `seedDefaults` at `[0, 1, 2]` unless the user asks otherwise

A task counts as runnable only if:

- it is registered in the task inventory
- its setup is deterministic
- its predicates are evaluable in the current environment
- it can be loaded through the existing task registry and session flow

## Step 6 — Sync docs and inventory

Update these in the same change when task inventory changes:

- `doc/task/task-hub.md`
- `doc/task/tasks-and-perturbations.md`
- `AGENTS.md` when the visible task inventory or workflow guidance changed
- `doc/task/task-expansion-spec.md` when generation policy or taxonomy changed
- `doc/task/ai-task-prompt-template.md` when the request schema or output schema changed

## Step 7 — Validate the batch

When task code changes, prefer:

- `npm run build`
- `npm test`
- `npm run qa:representative` when representative behavior changed materially
- `node .codex/skills/os-mock-task-author/scripts/audit-task-batch.mjs --mode inventory` to audit the current inventory
- `node .codex/skills/os-mock-task-author/scripts/audit-task-batch.mjs --mode candidates --input <candidate-json>` before promoting a generated batch

If only docs or skill files changed, consistency review is sufficient.

## Authoring rules

- Stay inside the current reducer, evaluator, and app behavior unless the request explicitly allows expansion
- Treat `constraints` and excluded features as hard limits
- Prefer partial high-level input and gather missing information conversationally
- Ask follow-up questions multiple times when the current request is not decision-complete
- Do not demand a full schema from the user before continuing
- Prefer family expansion over isolated task invention
- Prefer batch diversity over raw count inflation
- Do not use perturbations in this skill version

## Final response must include

- implemented or changed task IDs with `instruction` shown in the summary table
  - The summary table MUST include an `Instruction` column displaying the `TaskSpec.instruction` value for every task
  - Example format:
    ```
    | # | ID | Split | Level | Instruction |
    |---|---|---|---|---|
    | 1 | `browser_switch_to_help` | starter | A | In Firefox, switch to the Ubuntu help tab. |
    ```
- family assignment for the batch
- variation summary
- why the new tasks are not duplicates
- coverage impact
- whether evaluator or predicate space changed
- which docs were updated
- what validation ran
