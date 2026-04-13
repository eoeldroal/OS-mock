import type { TaskSpec } from "../types.js";
import { REPRESENTATIVE_TASKS } from "./representative/index.js";
import { STARTER_TASKS } from "./starter/index.js";
import { FILES_WINDOW_TASKS } from "./files-window-tasks.js";

export type TaskSplit = "all" | "starter" | "representative" | "train" | "eval";

const FW_STARTER = FILES_WINDOW_TASKS.filter((t) => t.split === "starter");
const FW_REPRESENTATIVE = FILES_WINDOW_TASKS.filter((t) => t.split === "representative");

export const ALL_TASKS: TaskSpec[] = [...STARTER_TASKS, ...REPRESENTATIVE_TASKS, ...FILES_WINDOW_TASKS];

const TASK_MAP = new Map<string, TaskSpec>(ALL_TASKS.map((task) => [task.id, task]));

function resolveTasks(split: TaskSplit = "all") {
  if (split === "starter") {
    return [...STARTER_TASKS, ...FW_STARTER];
  }
  if (split === "representative" || split === "train" || split === "eval") {
    return [...REPRESENTATIVE_TASKS, ...FW_REPRESENTATIVE];
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
  return {
    ...toPublicSummary(task),
    family: task.summary.family,
    subtype: task.summary.subtype,
    level: task.summary.level,
    apps: task.summary.apps,
    startState: task.summary.startState,
    objective: task.summary.objective,
    implementationPath: task.summary.implementationPath,
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
  const task = TASK_MAP.get(taskId);
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
