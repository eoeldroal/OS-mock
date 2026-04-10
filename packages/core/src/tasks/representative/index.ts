import type { TaskSpec } from "../../types.js";
import { REPRESENTATIVE_BROWSER_EXTENDED_TASKS } from "./browser-extended-tasks.js";
import { REPRESENTATIVE_BROWSER_HELP_TASKS } from "./browser-help-tasks.js";
import { REPRESENTATIVE_BROWSER_NOTE_LOG_TASKS } from "./browser-note-log-tasks.js";
import { REPRESENTATIVE_CROSS_APP_TASKS } from "./cross-app-tasks.js";

export const REPRESENTATIVE_TASKS: TaskSpec[] = [
  ...REPRESENTATIVE_BROWSER_HELP_TASKS,
  ...REPRESENTATIVE_BROWSER_NOTE_LOG_TASKS,
  ...REPRESENTATIVE_BROWSER_EXTENDED_TASKS,
  ...REPRESENTATIVE_CROSS_APP_TASKS
];
