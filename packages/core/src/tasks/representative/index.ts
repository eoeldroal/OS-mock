import type { TaskSpec } from "../../types.js";
import { REPRESENTATIVE_BROWSER_WEB_TASKS } from "./browser-web-tasks.js";
import { REPRESENTATIVE_CROSS_APP_TASKS } from "./cross-app-tasks.js";

export const REPRESENTATIVE_TASKS: TaskSpec[] = [...REPRESENTATIVE_CROSS_APP_TASKS, ...REPRESENTATIVE_BROWSER_WEB_TASKS];
