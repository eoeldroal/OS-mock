import type { TaskSpec } from "../types.js";
import { REPRESENTATIVE_TASKS } from "./representative-tasks.js";
import { STARTER_TASKS } from "./starter-tasks.js";

export type TaskSplit = "all" | "starter" | "representative" | "train" | "eval";

export const ALL_TASKS: TaskSpec[] = [...STARTER_TASKS, ...REPRESENTATIVE_TASKS];

const TASK_MAP = new Map<string, TaskSpec>(ALL_TASKS.map((task) => [task.id, task]));

function resolveTasks(split: TaskSplit = "all") {
  if (split === "starter") {
    return STARTER_TASKS;
  }
  if (split === "representative" || split === "train" || split === "eval") {
    return REPRESENTATIVE_TASKS;
  }
  return ALL_TASKS;
}

function toSummary(task: TaskSpec) {
  return {
    id: task.id,
    instruction: task.instruction,
    maxSteps: task.maxSteps,
    seedDefaults: task.seedDefaults,
    domain: task.domain,
    split: task.split
  };
}

export function listTasks(split: TaskSplit = "all") {
  return resolveTasks(split).map(toSummary);
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
  return tasks[Math.abs(seed) % tasks.length];
}
