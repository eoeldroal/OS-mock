import type { TaskSpec } from "../../types.js";
import { STARTER_BROWSER_WEB_TASKS } from "./browser-web-tasks.js";
import { STARTER_DESKTOP_TASKS } from "./desktop-tasks.js";

export const STARTER_TASKS: TaskSpec[] = [...STARTER_DESKTOP_TASKS, ...STARTER_BROWSER_WEB_TASKS];
