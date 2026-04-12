import { addBrowserWindow, addExplorerWindow, createEmptyEnv } from "../../env/factory.js";
import type { TaskSpec, Viewport } from "../../types.js";
import { browserBounds, explorerBounds } from "./shared.js";

const implementationPath = "packages/core/src/tasks/starter/browser-navigation-tasks.ts";

function buildBrowserSelectCategoryTask(seed: number, viewport: Viewport) {
  const variants = [
    { cat: "thunderbird", task: "thunderbird_task_pack", label: "Thunderbird" },
    { cat: "os", task: "os_popup_dismissal", label: "OS" },
    { cat: "chrome", task: "chrome_help_capture", label: "Chrome" }
  ];
  const v = variants[Math.abs(seed) % variants.length];
  const mode = Math.abs(seed) % 2;

  let envState = createEmptyEnv(
    viewport,
    `In Firefox OSWorld Explorer, select the ${v.label} category and the "${v.task}" task.`
  );

  if (mode === 0) {
    envState = addBrowserWindow(envState, "browser-main", browserBounds(), true, false);
  } else {
    envState = addExplorerWindow(envState, "explorer-main", explorerBounds(), true);
    envState = addBrowserWindow(envState, "browser-main", browserBounds(), false, false);
  }

  envState.appStates.browserLite["browser-main"].selectedCategoryId = "workflow";
  envState.appStates.browserLite["browser-main"].selectedTaskId = "workflow_mail_bridge";
  return {
    envState,
    targets: {
      targetCategoryId: v.cat,
      targetBrowserTaskId: v.task
    }
  };
}

function buildBrowserSwitchToHelp(seed: number, viewport: Viewport) {
  const mode = Math.abs(seed) % 2;
  let envState = createEmptyEnv(viewport, "In Firefox, switch to the Ubuntu help tab.");

  if (mode === 0) {
    envState = addBrowserWindow(envState, "browser-main", browserBounds(), true, false);
  } else {
    envState = addExplorerWindow(envState, "explorer-main", explorerBounds(), true);
    envState = addBrowserWindow(envState, "browser-main", browserBounds(), false, false);
  }

  return { envState, targets: {} };
}

export const STARTER_BROWSER_NAVIGATION_TASKS: TaskSpec[] = [
  {
    id: "browser_select_category_task",
    instruction: "In Firefox, select the target category and task in OSWorld Explorer.",
    domain: "Chrome",
    split: "starter",
    maxSteps: 15,
    seedDefaults: [0, 1, 2],
    summary: {
      family: "browser_navigate",
      level: "A",
      apps: ["browser"],
      startState: "Firefox starts on OSWorld Explorer with the wrong category-task pair selected; depending on seed it may already be focused or sit behind File Explorer.",
      objective: "Bring the browser into use if needed and update the Explorer selection to the requested category-task pair.",
      implementationPath
    },
    setup: buildBrowserSelectCategoryTask,
    goalPredicates: ["browser.task_selected"],
    progressPredicates: ["browser.task_selected"],
    forbiddenPredicates: []
  },
  {
    id: "browser_switch_to_help",
    instruction: "In Firefox, switch to the Ubuntu help tab.",
    domain: "Chrome",
    split: "starter",
    maxSteps: 10,
    seedDefaults: [0, 1, 2],
    summary: {
      family: "browser_navigate",
      level: "A",
      apps: ["browser"],
      startState: "Firefox starts on the Explorer tab with Ubuntu help available in the tab strip; another window may hold focus first.",
      objective: "Activate Firefox if needed and switch the active browser tab from Explorer to Ubuntu help.",
      implementationPath
    },
    setup: buildBrowserSwitchToHelp,
    goalPredicates: ["browser.help_page_opened"],
    progressPredicates: ["browser.help_page_opened"],
    forbiddenPredicates: []
  }
];
