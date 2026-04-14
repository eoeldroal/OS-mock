import { describe, expect, it } from "vitest";
import { MockOsEnv } from "../../src/env/session.js";
import { ALL_TASKS, getTaskSpec, listTaskAuthoringMetadata } from "../../src/tasks/registry.js";
import { getFileEntry } from "../../src/system/filesystem.js";
import type { A11yNode, PredicateId } from "../../src/types.js";

function flattenA11y(nodes: A11yNode[]): A11yNode[] {
  return nodes.flatMap((node) => [node, ...flattenA11y(node.children)]);
}

const REQUIRED_TARGET_KEYS: Partial<Record<PredicateId, string[]>> = {
  "note.target_opened": ["targetFileId"],
  "note.todo_opened": ["targetFileId"],
  "note.target_appended": ["targetFileId", "appendText"],
  "note.saved": ["targetFileId", "expectedSavedContent"],
  "file.renamed": ["oldName", "newName"],
  "clipboard.source_line_copied": ["sourceLine"],
  "note.target_pasted": ["targetFileId", "sourceLine"],
  "window.note_restored": ["noteWindowId"],
  "browser.task_selected": ["targetCategoryId", "targetBrowserTaskId"],
  "browser.category_selected": ["targetCategoryId"],
  "browser.bookmark_opened": ["targetBookmarkId"],
  "browser.help_topic_opened": ["targetHelpTopicId"],
  "mail.message_opened": ["targetMessageId"],
  "terminal.command_ran": ["targetCommand", "targetCommandOutput"],
  "file.deleted": ["deletedFileName"],
  "file.created": ["createdFileName"],
  "terminal.multi_commands_ran": ["requiredCommands"],
  "window.resized": ["targetWindowId", "minWidth", "minHeight"],
  "context_menu.action_executed": ["contextMenuEffect"],
  "terminal.history_used": ["expectedHistoryCommand"],
  "note.undo_performed": ["targetFileId", "expectedBufferAfterUndo"]
};

function hasRequiredTargetValue(value: unknown) {
  if (typeof value === "string") {
    return value.length > 0;
  }
  if (typeof value === "number") {
    return Number.isFinite(value);
  }
  if (typeof value === "boolean") {
    return true;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return value !== undefined && value !== null;
}

describe("task contract regression coverage", () => {
  it("resets every task into a non-empty canonical observation", () => {
    const failures: Array<Record<string, unknown>> = [];

    for (const task of ALL_TASKS) {
      const env = new MockOsEnv();

      try {
        const resetResult = env.reset({ taskId: task.id, seed: 0, maxSteps: 0 });
        const nodes = flattenA11y(resetResult.observation.a11yTree);
        const desktopNode = nodes.find((node) => node.id === "desktop" && node.role === "desktop");

        if (
          resetResult.task?.id !== task.id ||
          resetResult.stepIndex !== 0 ||
          resetResult.terminated ||
          resetResult.truncated ||
          !desktopNode ||
          resetResult.observation.a11yTree.length === 0 ||
          !Array.isArray(resetResult.observation.browserAugmentations)
        ) {
          failures.push({
            taskId: task.id,
            resetTaskId: resetResult.task?.id,
            stepIndex: resetResult.stepIndex,
            terminated: resetResult.terminated,
            truncated: resetResult.truncated,
            nodeCount: nodes.length,
            hasDesktopNode: Boolean(desktopNode),
            browserAugmentations: resetResult.observation.browserAugmentations
          });
        }
      } catch (error) {
        failures.push({
          taskId: task.id,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    expect(failures).toEqual([]);
  });

  it("provides the target keys required by every registered predicate contract", () => {
    const failures: Array<Record<string, unknown>> = [];

    for (const task of ALL_TASKS) {
      const env = new MockOsEnv();
      env.reset({ taskId: task.id, seed: 0, maxSteps: 0 });
      const hiddenState = env.getHiddenState();
      const predicates = [
        ...task.goalPredicates,
        ...task.progressPredicates,
        ...task.forbiddenPredicates
      ];
      const missingKeys = new Set<string>();

      for (const predicate of predicates) {
        for (const key of REQUIRED_TARGET_KEYS[predicate] ?? []) {
          const value = hiddenState.targets[key];
          if (!hasRequiredTargetValue(value)) {
            missingKeys.add(key);
          }
        }
      }

      const targetFileId = hiddenState.targets.targetFileId;
      if (targetFileId) {
        const targetFile = getFileEntry(hiddenState.envState.fileSystem, targetFileId);
        if (!targetFile) {
          missingKeys.add("targetFileId");
        }
      }

      if (missingKeys.size > 0) {
        failures.push({
          taskId: task.id,
          predicates,
          missingKeys: [...missingKeys]
        });
      }
    }

    expect(failures).toEqual([]);
  });

  it("keeps canonical representative aliases reset-compatible with the same public contract", () => {
    const aliasPairs = [
      ["browser_log_workflow_task_id", "browser_log_task_preopen_note_hard"],
      ["browser_capture_help_line", "browser_help_preopen_note_distractors"]
    ] as const;

    for (const [aliasId, canonicalId] of aliasPairs) {
      const env = new MockOsEnv();
      const resetResult = env.reset({ taskId: aliasId, seed: 0, maxSteps: 0 });

      expect(resetResult.task?.id).toBe(canonicalId);
      expect(getTaskSpec(aliasId).id).toBe(canonicalId);
      expect(flattenA11y(resetResult.observation.a11yTree).some((node) => node.id === "desktop")).toBe(true);
      expect(Array.isArray(resetResult.observation.browserAugmentations)).toBe(true);
    }
  });

  it("keeps blank authoring descriptions isolated to explicit legacy-imported tasks", () => {
    const authoringMetadata = listTaskAuthoringMetadata("all");
    const blankDescriptions = authoringMetadata.filter(
      (task) => task.apps.length === 0 || task.startState === "" || task.objective === ""
    );

    expect(blankDescriptions.length).toBeGreaterThan(0);
    expect(blankDescriptions.every((task) => task.family === "legacy-imported-task")).toBe(true);
  });
});
