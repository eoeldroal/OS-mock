import type { TaskSpec } from "../../types.js";
import { STARTER_BROWSER_NAVIGATION_TASKS } from "./browser-navigation-tasks.js";
import { STARTER_BROWSER_NOTE_TASKS } from "./browser-note-tasks.js";
import { STARTER_BROWSER_EXTENDED_TASKS } from "./browser-extended-tasks.js";
import { STARTER_BROWSER_BULK_TASKS } from "./browser-bulk-tasks.js";
import { STARTER_DESKTOP_TASKS } from "./desktop-tasks.js";

export const STARTER_TASKS: TaskSpec[] = [
  ...STARTER_DESKTOP_TASKS,
  ...STARTER_BROWSER_NAVIGATION_TASKS,
  ...STARTER_BROWSER_NOTE_TASKS,
  ...STARTER_BROWSER_EXTENDED_TASKS,
  ...STARTER_BROWSER_BULK_TASKS
];
