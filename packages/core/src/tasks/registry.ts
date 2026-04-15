import type { TaskSpec } from "../types.js";
import { REPRESENTATIVE_TASKS } from "./representative/index.js";
import { STARTER_TASKS } from "./starter/index.js";
import { FILES_WINDOW_TASKS } from "./files-window-tasks.js";
import { TEAM3_TASKS } from "./team3/index.js";

export type TaskSplit = "all" | "starter" | "representative" | "train" | "eval";

const FW_STARTER = FILES_WINDOW_TASKS.filter((t) => t.split === "starter");
const FW_REPRESENTATIVE = FILES_WINDOW_TASKS.filter((t) => t.split === "representative");

const TEAM3_STARTER = TEAM3_TASKS.filter((t) => t.split === "starter");
const TEAM3_REPRESENTATIVE = TEAM3_TASKS.filter((t) => t.split === "representative");

export const ALL_TASKS: TaskSpec[] = [...STARTER_TASKS, ...REPRESENTATIVE_TASKS, ...FILES_WINDOW_TASKS, ...TEAM3_TASKS];

const TASK_MAP = new Map<string, TaskSpec>(ALL_TASKS.map((task) => [task.id, task]));
const TASK_ID_ALIASES: Record<string, string> = {};

// 2. 범인이었던 resolveTasks 함수를 동적 필터링으로 수정 ✅
function resolveTasks(split: TaskSplit = "all") {
  if (split === "all") {
    return ALL_TASKS;
  }
  if (split === "starter") {
    return [...STARTER_TASKS, ...FW_STARTER, ...TEAM3_STARTER];
  }
  if (split === "representative" || split === "train" || split === "eval") {
    return [...REPRESENTATIVE_TASKS, ...FW_REPRESENTATIVE, ...TEAM3_REPRESENTATIVE];
  }
  return ALL_TASKS;
}

function toPublicSummary(task: TaskSpec) {
  return {
    id: task.id,
    instruction: task.instruction,
    maxSteps: task.maxSteps,
    seedDefaults: task.seedDefaults,
    domain: task.domain,
    split: task.split
  };
}

function toAuthoringSummary(task: TaskSpec) {
  const inferredImplementationPath =
    task.domain === "Thunderbird + Note Editor"
      ? "packages/core/src/tasks/team3/mail.ts"
      : task.domain === "Terminal + Note Editor"
        ? "packages/core/src/tasks/team3/terminal.ts"
        : "packages/core/src/tasks/team3/index.ts";
  const summary = task.summary ?? {
    family: "legacy-imported-task",
    subtype: undefined,
    level: "C" as const,
    apps: [],
    startState: "",
    objective: "",
    implementationPath: inferredImplementationPath
  };
  return {
    ...toPublicSummary(task),
    family: summary.family,
    subtype: summary.subtype,
    level: summary.level,
    apps: summary.apps,
    startState: summary.startState,
    objective: summary.objective,
    implementationPath: summary.implementationPath,
    goalPredicates: task.goalPredicates,
    progressPredicates: task.progressPredicates
  };
}

export function listTasks(split: TaskSplit = "all") {
  return resolveTasks(split).map(toPublicSummary);
}

export function listTaskAuthoringMetadata(split: TaskSplit = "all") {
  return resolveTasks(split).map(toAuthoringSummary);
}

export function listStarterTasks() {
  return listTasks("starter");
}

export function getTaskSpec(taskId: string): TaskSpec {
  const resolvedId = TASK_ID_ALIASES[taskId] ?? taskId;
  const task = TASK_MAP.get(resolvedId);
  if (!task) {
    throw new Error(`Unknown task: ${taskId}`);
  }
  return task;
}

export function sampleTask(seed = Date.now(), split: TaskSplit = "all"): TaskSpec {
  const tasks = resolveTasks(split);
  return tasks[abs(seed) % tasks.length];
}

function abs(value: number) {
  return Math.abs(value);
}
