---
name: os-mock-task-author
description: Use when the user wants to design or implement OS-mock tasks from high-level requests or compact batch-generation prompts. This skill expands minimal input into task families, variation matrices, deduped runnable or intentionally impossible task plans, synced inventory docs, and validation steps while staying inside the current environment unless expansion is explicitly allowed.
---

# OS Mock Task Author

Use this skill to design and implement OS-mock tasks.
Accept natural language, short structured prompts, or mixed input.
The default outcome is a reviewable proposal package, not immediate code changes.
Only implement task code and docs after the user explicitly approves the proposal or explicitly asks to skip review.
If the user explicitly wants intentionally impossible tasks, this skill must support that path too.

User request: $ARGUMENTS

---

## When to use

- Add new OS-mock tasks from high-level requests
- Expand a task family into multiple runnable `TaskSpec`s
- Design intentionally impossible tasks that test whether the agent should recognize failure and abort
- Generate a batch of varied tasks without duplicating the current inventory
- Turn a short user request into a proposal package first, then into real task code and synced docs only after approval

## Step 0 — Start from partial input and ask iteratively

Do not assume the user will provide a complete request.
Accept partial input such as only a goal, only an app combination, only a desired batch size, or only a request for impossible tasks.
The skill must gather missing information through multiple short follow-up questions when needed.

The normalized request shape is:

- `goal`: what the simulated user must accomplish, or fail to accomplish in an impossible task
- `apps`: which apps or surfaces are involved
- `count`: how many tasks to generate
- `splits`: `starter`, `representative`, or both
- `difficulties`: one or more of `easy`, `medium`, `hard`
- `feasibility`: `runnable`, `impossible`, or `mixed`
- `variation_preferences`: content/layout/focus/window-state/distractor preferences
- `constraints`: excluded features, implementation-surface limits, and whether runtime expansion is allowed

Ask for missing fields in this order unless the request already answers them:

1. `goal`
2. `apps`
3. `count`
4. `splits`
   Explain briefly that `starter` is shorter and simpler, while `representative` is longer and more workflow-heavy.
5. `feasibility`
   Explain briefly that `runnable` means solvable in the current environment, `impossible` means the correct behavior is to recognize failure, and `mixed` means generate both.
6. `difficulties`
7. `variation_preferences`
8. `constraints`

Do not ask for predicates, targets, or max steps unless the ambiguity is real.
Infer those from the codebase whenever possible.

```md
### Normalized Request
- goal:
- apps:
- count:
- splits:
- difficulties:
- feasibility:
- variation_preferences:
- constraints:
- assumptions:
```

## Step 1 — Read context first

Read these files before doing anything else:

- `doc/task/ai-task-prompt-template.md`
- `doc/task/task-expansion-spec.md`
- `doc/task/tasks-and-perturbations.md`
- `doc/task/task-hub.md`
- `doc/personal/20260410_osworld_impossible_tasks.md`
- `doc/task/osworld-mock-authoring-guide.md`
- `packages/core/src/types.ts`
- `packages/core/src/env/evaluator.ts`
- `packages/core/src/env/session.ts`
- `packages/core/src/tasks/starter-tasks.ts`
- `packages/core/src/tasks/representative-tasks.ts`
- `packages/core/src/tasks/registry.ts`
- `AGENTS.md`
- [references/repo-task-workflow.md](references/repo-task-workflow.md)

Treat `doc/personal/20260410_osworld_impossible_tasks.md` as the policy anchor for intentionally impossible tasks.
Treat `doc/task/osworld-mock-authoring-guide.md` as the policy anchor for contamination-safe mock task generation, domain substitution, and metadata isolation.

## Step 2 — Expand the request into task families

Before designing individual tasks, infer the smallest useful set of task families.
For each family, decide:

- core capability being measured
- split and domain
- source app and sink app
- intended workflow shape
- feasibility mode: `runnable` or `impossible`
- candidate predicates and progress chain
- default setup pattern
- allowed variation axes
- expected difficulty band

Family-first generation is mandatory for large batches.
Do not jump directly from a short request to a flat list of task IDs.

For impossible-task families, explicitly state why the task cannot be completed:

- removed or deprecated feature
- nonexistent file, data, or resource
- logically contradictory instruction
- hallucinated capability outside the current environment

For runnable families, first extract the capability you want to test, then choose a safe local mock domain that does not mirror benchmark surface text or public-service content too closely.

## Step 3 — Build a variation matrix

Generate candidate tasks by expanding each family across a bounded variation matrix.
Use only the current implementation surface unless the user explicitly allows runtime expansion.
Perturbations are out of scope for this skill version.

Preferred variation axes:

- `difficulty`
- `content`
- `initial window state`
- `initial focus`
- `distractor count`
- `layout`
- `initial selected item`
- `impossibility reason` for impossible-task families

## Step 4 — Dedup gate and quality rubric

Every candidate task must pass both gates before implementation or promotion.

### Dedup gate

Create a `task fingerprint` from:

- family
- split
- domain
- app scope
- feasibility mode
- goal predicates
- progress chain
- setup shape
- output artifact
- variation axes actually used

Treat a candidate as a duplicate risk if two or more of these are effectively the same as an existing task, including cases where the impossibility reason and observable cues are effectively identical.
Differences limited to `minimized`, `unfocused`, `help-start`, `distractors`, `preopen note`, or `existing content` should normally be absorbed as seed/setup variation, not promoted into a brand-new browser task.
Differences that only rename domains, files, or text while preserving the same capability and workflow meaning should also count as duplicate risk.

If duplicate risk is high, prefer one of these outcomes in order:

1. absorb it into seed variation of an existing task
2. absorb it into an existing family as a documented variation
3. promote it to a new task only if it changes workflow meaning, setup meaning, or impossibility reasoning meaning

### Quality rubric

Runnable candidates must pass:

- `Executable`
- `Evaluable`
- `Non-trivial`
- `Instruction clarity`
- `Learning value`

Impossible candidates must pass:

- `Clearly impossible`
- `Diagnosable`
- `No fake workaround`
- `Abort semantics defined`
- `Runtime path declared`

## Step 5 — Submit a proposal package for review first

Before editing task code, docs, or inventory, present a review package to the user.
Do not mutate the repository until the user explicitly approves the proposal or explicitly asks to proceed without review.

The review package must include:

- normalized request
- proposed task families
- candidate task IDs and draft instructions
- variation matrix
- dedup assessment
- files that would be edited
- whether impossible tasks are proposal-only or need runtime expansion
- planned validation steps

If the user requests changes, revise the proposal first instead of partially implementing it.

## Step 6 — Implement runnable tasks, proposal-only impossible tasks, or runtime extensions

Only after approval, implement the approved scope.

Important current-runtime limitation:

- The current session flow treats `FAIL` as a small negative-reward terminal action.
- Therefore, intentionally impossible tasks are not currently runnable as correct-by-`FAIL` tasks without runtime changes.

Decision rule:

1. If the user wants impossible-task ideas only, generate proposal-only impossible tasks and document the intended abort behavior.
2. If the user wants impossible tasks to be runnable in the environment, extend the evaluator/session/reward contract first, then add the task definitions.
3. If the user did not authorize runtime expansion, do not silently fake runnable impossible tasks.

A runnable task counts as complete only if it is registered, deterministic, evaluable, and loadable through the current registry/session flow.
A runnable impossible task counts as complete only if the runtime has explicit success semantics for recognized impossibility and the expected abort path is testable.

## Step 7 — Sync docs and inventory

Update these in the same change when task inventory or generation policy changes:

- `doc/task/task-hub.md`
- `doc/task/tasks-and-perturbations.md`
- `AGENTS.md` when the visible task inventory or workflow guidance changed
- `doc/task/task-expansion-spec.md` when generation policy or taxonomy changed
- `doc/task/ai-task-prompt-template.md` when the request schema or output schema changed

When updating task docs, write explanatory task descriptions in Korean.
If you need to preserve the exact `TaskSpec.instruction`, keep it as a raw original-string column.

## Step 8 — Validate the batch

When task code changes, prefer:

- `npm run build`
- `npm test`
- `npm run qa:representative` when representative behavior changed materially
- `node .codex/skills/os-mock-task-author/scripts/audit-task-batch.mjs --mode inventory`
- `node .codex/skills/os-mock-task-author/scripts/audit-task-batch.mjs --mode candidates --input <candidate-json>`

If the work only changes docs or skill files, consistency review is sufficient.
If you add runnable impossible-task support, include validation that proves the intended abort path is rewarded correctly.

## Authoring rules

- Stay inside the current reducer, evaluator, and app behavior unless the request explicitly allows expansion
- Start from core capability first, then design a mock-domain substitution instead of copying benchmark surface forms
- Avoid direct reuse of benchmark domains, famous public services, or benchmark-original phrasing when a local offline analogue can carry the same capability
- Parameterize target file names, seed text, and initial selection state when possible instead of hard-coding one visible trajectory
- Keep evaluator metadata and authoring-only setup details isolated from the agent-facing surface
- Treat `constraints` and excluded features as hard limits
- Default to proposal-first review before editing inventory files
- Prefer family expansion over isolated task invention
- Prefer batch diversity over raw count inflation
- Do not use perturbations in this skill version
- Do not claim impossible tasks are runnable unless the runtime contract has actually been extended

## Final response must include

- proposal summary or implemented task IDs with `instruction` shown in the summary table
- family assignment for the batch
- feasibility mode for the batch: `runnable`, `impossible`, or `mixed`
- variation summary
- why the new tasks are not duplicates
- coverage impact
- whether evaluator, predicate space, or session reward logic changed
- whether impossible tasks are proposal-only or runnable
- whether the user approved implementation or the response is still proposal-only
