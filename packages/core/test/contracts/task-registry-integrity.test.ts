import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  ALL_TASKS,
  getTaskSpec,
  listTaskAuthoringMetadata,
  listTasks
} from "../../src/tasks/registry.js";

const REPO_ROOT = fileURLToPath(new URL("../../../../", import.meta.url));

describe("task registry integrity", () => {
  it("keeps catalog split counts stable and task ids unique", () => {
    const allTasks = listTasks("all");
    const starterTasks = listTasks("starter");
    const representativeTasks = listTasks("representative");
    const trainTasks = listTasks("train");
    const evalTasks = listTasks("eval");

    expect(allTasks).toHaveLength(96);
    expect(starterTasks).toHaveLength(48);
    expect(representativeTasks).toHaveLength(48);
    expect(trainTasks).toHaveLength(48);
    expect(evalTasks).toHaveLength(48);

    expect(new Set(ALL_TASKS.map((task) => task.id)).size).toBe(ALL_TASKS.length);
    expect(trainTasks.map((task) => task.id)).toEqual(representativeTasks.map((task) => task.id));
    expect(evalTasks.map((task) => task.id)).toEqual(representativeTasks.map((task) => task.id));
  });

  it("removes legacy browser fixture aliases from the live registry", () => {
    expect(() => getTaskSpec("browser_log_workflow_task_id")).toThrow("Unknown task");
    expect(() => getTaskSpec("browser_capture_help_line")).toThrow("Unknown task");
  });

  it("keeps public catalog summaries and authoring metadata aligned across splits", () => {
    const splits = ["all", "starter", "representative", "train", "eval"] as const;

    for (const split of splits) {
      const publicTasks = listTasks(split);
      const authoringMetadata = listTaskAuthoringMetadata(split);

      expect(authoringMetadata.map((task) => task.id)).toEqual(publicTasks.map((task) => task.id));

      for (const task of publicTasks) {
        const resolved = getTaskSpec(task.id);
        expect(resolved.id).toBe(task.id);
        expect(resolved.split).toBe(task.split);
        expect(resolved.maxSteps).toBe(task.maxSteps);
      }
    }
  });

  it("publishes authoring metadata with implementation paths that exist on disk", () => {
    const authoringMetadata = listTaskAuthoringMetadata("all");
    const missingPaths = authoringMetadata
      .filter((task) => !existsSync(resolve(REPO_ROOT, task.implementationPath)))
      .map((task) => ({ id: task.id, implementationPath: task.implementationPath }));

    expect(authoringMetadata).toHaveLength(ALL_TASKS.length);
    expect(new Set(authoringMetadata.map((task) => task.id)).size).toBe(authoringMetadata.length);
    expect(missingPaths).toEqual([]);
  });

  it("keeps removed browser fixture aliases out of the public catalog surface", () => {
    const publicIds = new Set(listTasks("all").map((task) => task.id));
    const authoringIds = new Set(listTaskAuthoringMetadata("all").map((task) => task.id));

    expect(publicIds.has("browser_log_workflow_task_id")).toBe(false);
    expect(publicIds.has("browser_capture_help_line")).toBe(false);
    expect(authoringIds.has("browser_log_workflow_task_id")).toBe(false);
    expect(authoringIds.has("browser_capture_help_line")).toBe(false);
  });

  it("normalizes legacy imported task metadata into canonical team3 implementation paths", () => {
    const authoringMetadata = listTaskAuthoringMetadata("all");
    const legacyImportedTasks = authoringMetadata.filter((task) => task.family === "legacy-imported-task");

    expect(legacyImportedTasks.length).toBeGreaterThan(0);
    expect(
      legacyImportedTasks.every(
        (task) =>
          task.apps.length === 0 &&
          task.startState === "" &&
          task.objective === "" &&
          (task.implementationPath === "packages/core/src/tasks/team3/mail.ts" ||
            task.implementationPath === "packages/core/src/tasks/team3/terminal.ts" ||
            task.implementationPath === "packages/core/src/tasks/team3/index.ts")
      )
    ).toBe(true);
  });
});
