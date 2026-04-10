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
  let envState = createEmptyEnv(
    viewport,
    `In Firefox OSWorld Explorer, select the ${v.label} category and the "${v.task}" task.`
  );
  envState = addBrowserWindow(envState, "browser-main", browserBounds(), true, false);
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
  let envState = createEmptyEnv(viewport, "In Firefox, switch to the Ubuntu help tab.");
  envState = addBrowserWindow(envState, "browser-main", browserBounds(), true, false);
  return { envState, targets: {} };
}

function buildBrowserSelectFromMinimized(seed: number, viewport: Viewport) {
  const variants = [
    { cat: "thunderbird", task: "thunderbird_task_pack", label: "Thunderbird" },
    { cat: "os", task: "os_popup_dismissal", label: "OS" },
    { cat: "chrome", task: "chrome_help_capture", label: "Chrome" }
  ];
  const v = variants[Math.abs(seed) % variants.length];
  let envState = createEmptyEnv(
    viewport,
    `Restore Firefox from the dock and select the ${v.label} category and "${v.task}" task in OSWorld Explorer.`
  );
  envState = addExplorerWindow(envState, "explorer-main", explorerBounds(), true);
  envState = addBrowserWindow(envState, "browser-main", browserBounds(), false, true);
  envState.appStates.browserLite["browser-main"].selectedCategoryId = "workflow";
  envState.appStates.browserLite["browser-main"].selectedTaskId = "workflow_mail_bridge";
  return {
    envState,
    targets: { targetCategoryId: v.cat, targetBrowserTaskId: v.task }
  };
}

function buildBrowserSelectFromUnfocused(seed: number, viewport: Viewport) {
  const variants = [
    { cat: "os", task: "os_restore_window", label: "OS" },
    { cat: "chrome", task: "chrome_explorer_review", label: "Chrome" },
    { cat: "workflow", task: "workflow_terminal_capture", label: "Workflow" }
  ];
  const v = variants[Math.abs(seed) % variants.length];
  let envState = createEmptyEnv(
    viewport,
    `Focus Firefox and select the ${v.label} category and "${v.task}" task in OSWorld Explorer.`
  );
  envState = addExplorerWindow(envState, "explorer-main", explorerBounds(), true);
  envState = addBrowserWindow(envState, "browser-main", browserBounds(), false, false);
  envState.appStates.browserLite["browser-main"].selectedCategoryId = "workflow";
  envState.appStates.browserLite["browser-main"].selectedTaskId = "workflow_mail_bridge";
  return {
    envState,
    targets: { targetCategoryId: v.cat, targetBrowserTaskId: v.task }
  };
}

function buildBrowserSelectFromHelpPage(seed: number, viewport: Viewport) {
  const variants = [
    { cat: "workflow", task: "workflow_mail_bridge", label: "Workflow" },
    { cat: "thunderbird", task: "thunderbird_mock_notes", label: "Thunderbird" },
    { cat: "os", task: "os_popup_dismissal", label: "OS" }
  ];
  const v = variants[Math.abs(seed) % variants.length];
  let envState = createEmptyEnv(
    viewport,
    `In Firefox, switch from Ubuntu help to OSWorld Explorer and select the ${v.label} category and "${v.task}" task.`
  );
  envState = addBrowserWindow(envState, "browser-main", browserBounds(), true, false);
  const browser = envState.appStates.browserLite["browser-main"];
  browser.currentPage = "help";
  browser.tabs = browser.tabs.map((tab, i) => ({ ...tab, active: i === 1 }));
  browser.pageTitle = "Ubuntu help";
  browser.url = "https://help.ubuntu.com/mock/osworld";
  return {
    envState,
    targets: { targetCategoryId: v.cat, targetBrowserTaskId: v.task }
  };
}

function buildBrowserHelpFromUnfocusedStarter(seed: number, viewport: Viewport) {
  let envState = createEmptyEnv(viewport, "Focus Firefox and switch to the Ubuntu help tab.");
  envState = addExplorerWindow(envState, "explorer-main", explorerBounds(), true);
  envState = addBrowserWindow(envState, "browser-main", browserBounds(), false, false);
  return { envState, targets: {} };
}

function buildBrowserHelpFromMinimizedStarter(seed: number, viewport: Viewport) {
  let envState = createEmptyEnv(viewport, "Restore Firefox from the dock and switch to the Ubuntu help tab.");
  envState = addExplorerWindow(envState, "explorer-main", explorerBounds(), true);
  envState = addBrowserWindow(envState, "browser-main", browserBounds(), false, true);
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
      startState: "Firefox is focused on OSWorld Explorer with the wrong category and task already selected.",
      objective: "Stay inside the browser and update the Explorer selection to the requested category-task pair.",
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
      startState: "Firefox starts focused on the Explorer tab with Ubuntu help available in the tab strip.",
      objective: "Change the active browser tab from Explorer to Ubuntu help.",
      implementationPath
    },
    setup: buildBrowserSwitchToHelp,
    goalPredicates: ["browser.help_page_opened"],
    progressPredicates: ["browser.help_page_opened"],
    forbiddenPredicates: []
  },
  {
    id: "browser_select_from_minimized",
    instruction: "Restore Firefox from the dock and select the target category and task.",
    domain: "Chrome",
    split: "starter",
    maxSteps: 20,
    seedDefaults: [0, 1, 2],
    summary: {
      family: "browser_navigate",
      level: "A",
      apps: ["browser", "window"],
      startState: "Firefox is minimized to the dock while File Explorer remains visible in the workspace.",
      objective: "Restore the browser first, then complete the Explorer category-task selection.",
      implementationPath
    },
    setup: buildBrowserSelectFromMinimized,
    goalPredicates: ["browser.task_selected"],
    progressPredicates: ["browser.task_selected"],
    forbiddenPredicates: []
  },
  {
    id: "browser_select_from_unfocused",
    instruction: "Focus Firefox and select the target category and task in OSWorld Explorer.",
    domain: "Chrome",
    split: "starter",
    maxSteps: 15,
    seedDefaults: [0, 1, 2],
    summary: {
      family: "browser_navigate",
      level: "A",
      apps: ["browser", "window"],
      startState: "Firefox is open but unfocused behind a focused File Explorer window.",
      objective: "Bring Firefox to the foreground and update the Explorer selection.",
      implementationPath
    },
    setup: buildBrowserSelectFromUnfocused,
    goalPredicates: ["browser.task_selected"],
    progressPredicates: ["browser.task_selected"],
    forbiddenPredicates: []
  },
  {
    id: "browser_select_from_help_page",
    instruction: "In Firefox, switch from Ubuntu help to OSWorld Explorer and select the target task.",
    domain: "Chrome",
    split: "starter",
    maxSteps: 15,
    seedDefaults: [0, 1, 2],
    summary: {
      family: "browser_navigate",
      level: "A",
      apps: ["browser"],
      startState: "Firefox starts on the Ubuntu help tab rather than the Explorer tab.",
      objective: "Switch back to OSWorld Explorer and select the requested task card.",
      implementationPath
    },
    setup: buildBrowserSelectFromHelpPage,
    goalPredicates: ["browser.task_selected"],
    progressPredicates: ["browser.task_selected"],
    forbiddenPredicates: []
  },
  {
    id: "browser_help_from_unfocused_starter",
    instruction: "Focus Firefox and switch to the Ubuntu help tab.",
    domain: "Chrome",
    split: "starter",
    maxSteps: 15,
    seedDefaults: [0, 1, 2],
    summary: {
      family: "browser_navigate",
      level: "A",
      apps: ["browser", "window"],
      startState: "Firefox is open in the background while another window has focus.",
      objective: "Focus the browser and move from Explorer to the Ubuntu help tab.",
      implementationPath
    },
    setup: buildBrowserHelpFromUnfocusedStarter,
    goalPredicates: ["browser.help_page_opened"],
    progressPredicates: ["browser.help_page_opened"],
    forbiddenPredicates: []
  },
  {
    id: "browser_help_from_minimized_starter",
    instruction: "Restore Firefox from the dock and switch to the Ubuntu help tab.",
    domain: "Chrome",
    split: "starter",
    maxSteps: 20,
    seedDefaults: [0, 1, 2],
    summary: {
      family: "browser_navigate",
      level: "A",
      apps: ["browser", "window"],
      startState: "Firefox begins minimized to the dock with Ubuntu help available once the window is restored.",
      objective: "Restore the browser and activate the help tab.",
      implementationPath
    },
    setup: buildBrowserHelpFromMinimizedStarter,
    goalPredicates: ["browser.help_page_opened"],
    progressPredicates: ["browser.help_page_opened"],
    forbiddenPredicates: []
  }
];
