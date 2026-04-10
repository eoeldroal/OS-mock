import type { TaskSpec, TaskSummary } from "../types.js";

type TaskBase = Omit<TaskSpec, "summary">;

export function withTaskSummaries(
  tasks: TaskBase[],
  summaries: Record<string, TaskSummary>
): TaskSpec[] {
  return tasks.map((task) => {
    const summary = summaries[task.id];
    if (!summary) {
      throw new Error(`Missing task summary for ${task.id}`);
    }
    return {
      ...task,
      summary
    };
  });
}
