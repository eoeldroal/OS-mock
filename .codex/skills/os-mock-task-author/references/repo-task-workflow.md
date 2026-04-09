# Repo Task Workflow

## Purpose

This reference maps high-level AI task-generation requests into concrete OS-mock repository edits.
The target outcome is a runnable batch of tasks, not only a design proposal.
Perturbations are out of scope for this workflow version.

## Conversational Intake

Do not require a full schema up front.
Users may start with only a goal, an app pair, or a rough batch size.
The skill should ask multiple short follow-up questions until the request is sufficient for family planning.

Ask missing fields in this order unless the request already answers them:

1. `goal`
2. `apps`
3. `count`
4. `splits`
5. `difficulties`
6. `variation_preferences`
7. `constraints`

Infer everything else from the codebase when possible.

## Minimal Request To Code Mapping

| Request field | Where it lands |
|---|---|
| `goal` | plain-language task goal that becomes the basis for `TaskSpec.instruction` and final success design |
| `apps` | source app, sink app, and family selection |
| `count` | batch size target, not necessarily one family per task |
| `splits` | `TaskSpec.split` and target task file |
| `difficulties` | affects `maxSteps`, distractors, setup difficulty, and workflow complexity |
| `variation_preferences` | preferred variation axes for matrix generation |
| `constraints` | excluded features plus implementation-surface limits |

## Inferred Planning Fields

The skill should infer these before implementation:

- family
- domain
- workflow
- candidate predicates
- required setup shape
- targets plan
- max steps band
- seed variation strategy
- batch quota usage

## Family-First Batch Generation

Always generate large batches in this order:

1. infer task families from the minimal request
2. define each family's source app, sink app, workflow shape, and predicate chain
3. expand a bounded variation matrix per family
4. run dedup and quality gates
5. implement only the surviving candidates

Preferred variation axes:

- `difficulty`
- `content`
- `initial window state`
- `initial focus`
- `distractor count`
- `layout`
- `initial selected item`

## Batch Diversity Quotas

Use these defaults unless the user requests otherwise:

- same `domain`: at most 40% of a generated batch
- same `goalPredicates` combination: at most 25% of a generated batch
- same `app scope`: do not emit more than 3 in a row
- prefer underused predicates and underused app combinations when inventory coverage is uneven

Difficulty defaults:

- `easy`: short horizon, favorable setup, low distractors
- `medium`: moderate horizon, moderate distractors, less favorable setup
- `hard`: longer horizon, less favorable setup, more distractors

## Dedup Gate

Compute a `task fingerprint` from:

- family
- split
- domain
- app scope
- goal predicate set
- progress chain
- setup shape
- output artifact
- variation axes actually used

Treat a candidate as a duplicate risk when two or more of these are effectively unchanged from an existing task:

- app scope
- goal predicate set
- progress chain
- source app -> sink app structure
- setup shape
- workflow meaning with only content substitution differences

Resolution order:

1. seed variation of an existing task
2. documented family variation
3. new task only when workflow meaning or setup meaning materially changes

## Quality Rubric

Implement only candidates that pass all of these:

- `Executable`
- `Evaluable`
- `Non-trivial`
- `Instruction clarity`
- `Learning value`

If a candidate fails, drop it or absorb it into an existing family variation.

## Files To Update

Task implementation:

- `packages/core/src/tasks/starter-tasks.ts`
- `packages/core/src/tasks/representative-tasks.ts`
- `packages/core/src/tasks/registry.ts`

Predicate and evaluation changes only when explicitly required:

- `packages/core/src/types.ts`
- `packages/core/src/env/evaluator.ts`
- reducer or app files if the requested behavior is not currently observable

Docs to keep in sync:

- `doc/task/task-hub.md` (primary inventory and coverage doc)
- `doc/task/tasks-and-perturbations.md`
- `AGENTS.md`
- `doc/task/task-expansion-spec.md` when generation policy or taxonomy changes
- `doc/task/ai-task-prompt-template.md` when the request or output schema changes

## Current Reusable Targets Keys

- `targetFileId`
- `sourceFileId`
- `noteWindowId`
- `popupId`
- `appendText`
- `expectedSavedContent`
- `oldName`
- `newName`
- `sourceLine`
- `targetCategoryId`
- `targetBrowserTaskId`
- `targetMessageId`
- `targetCommand`
- `targetCommandOutput`

Prefer these names before inventing new keys.

## Implementation Checklist

For every new batch or task family:

1. normalize the minimal request
2. infer families and coverage targets
3. generate the bounded variation matrix
4. run dedup and quality gates
5. add or update deterministic `build*Task` setup functions
6. add the `TaskSpec` entries
7. confirm setup, targets, and predicates are mutually consistent
8. update `doc/task/task-hub.md`
9. update `doc/task/tasks-and-perturbations.md`
10. update `AGENTS.md` if inventory or workflow guidance changed materially
11. run validation proportional to the code change
12. run `node .codex/skills/os-mock-task-author/scripts/audit-task-batch.mjs --mode inventory` after inventory changes
13. run `node .codex/skills/os-mock-task-author/scripts/audit-task-batch.mjs --mode candidates --input <candidate-json>` before promoting generated candidates

## Candidate JSON Shape

```json
{
  "tasks": [
    {
      "id": "example_task",
      "split": "starter",
      "domain": "Files",
      "instruction": "Open the target file and save it after appending the requested line.",
      "family": "note_edit_save",
      "appScope": ["files", "note"],
      "goalPredicates": ["note.target_opened", "note.saved"],
      "progressPredicates": ["note.target_opened", "note.saved"],
      "targetKeys": ["targetFileId", "appendText", "expectedSavedContent"],
      "variationAxes": ["initial_focus", "distractor_count"],
      "outputArtifact": "saved-target-file"
    }
  ]
}
```

## Runnable Completion Criteria

A generated batch is complete only if:

- the new tasks are registered and discoverable through the current registry
- the setup is deterministic
- the evaluator can judge success with the declared targets
- the batch passes the requested validation commands
