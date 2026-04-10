import {
  addBrowserWindow,
  addExplorerWindow,
  addFiles,
  createEmptyEnv,
  createFile
} from "../../env/factory.js";
import type { TaskSpec, TaskSummary, Viewport } from "../../types.js";
import { withTaskSummaries } from "../with-task-summaries.js";
import {
  addRepresentativeUbuntuCompanionApps,
  browserBounds,
  explorerBounds
} from "./shared.js";

const implementationPath = "packages/core/src/tasks/representative/browser-selection-log-tasks.ts";

function buildBrowserTaskIdLogTask(seed: number, viewport: Viewport) {
  let envState = createEmptyEnv(
    viewport,
    "In Firefox, open Workflow in OSWorld Explorer, select the Bridge a Thunderbird summary into notes task, write its task id into browser-log.txt, and save."
  );
  envState = addFiles(envState, [
    createFile("file-browser-log", "browser-log.txt", ""),
    createFile("file-scratch", "scratch.txt", "Temporary notes")
  ]);
  envState = addExplorerWindow(envState, "explorer-main", explorerBounds(), false);
  envState = addRepresentativeUbuntuCompanionApps(envState, "browser");
  envState.appStates.browserLite["browser-main"].selectedCategoryId = "chrome";
  envState.appStates.browserLite["browser-main"].selectedTaskId = "chrome_explorer_review";
  return {
    envState,
    targets: {
      targetFileId: "file-browser-log",
      targetCategoryId: "workflow",
      targetBrowserTaskId: "workflow_mail_bridge",
      appendText: "workflow_mail_bridge",
      expectedSavedContent: "workflow_mail_bridge"
    }
  };
}

function buildBrowserLogTaskFromMinimized(seed: number, viewport: Viewport) {
  const variants = [
    { cat: "thunderbird", task: "thunderbird_task_pack", label: "Thunderbird" },
    { cat: "os", task: "os_restore_window", label: "OS" },
    { cat: "chrome", task: "chrome_explorer_review", label: "Chrome" }
  ];
  const v = variants[Math.abs(seed) % variants.length];
  let envState = createEmptyEnv(
    viewport,
    `Restore Firefox from the dock, select the ${v.label} category and "${v.task}" task in OSWorld Explorer, write its task id into browser-log.txt, and save.`
  );
  envState = addFiles(envState, [
    createFile("file-browser-log", "browser-log.txt", ""),
    createFile("file-scratch", "scratch.txt", "Temporary notes")
  ]);
  envState = addExplorerWindow(envState, "explorer-main", explorerBounds(), true);
  envState = addBrowserWindow(envState, "browser-main", browserBounds(), false, true);
  envState.appStates.browserLite["browser-main"].selectedCategoryId = "workflow";
  envState.appStates.browserLite["browser-main"].selectedTaskId = "workflow_mail_bridge";
  return {
    envState,
    targets: {
      targetFileId: "file-browser-log",
      targetCategoryId: v.cat,
      targetBrowserTaskId: v.task,
      appendText: v.task,
      expectedSavedContent: v.task
    }
  };
}

function buildBrowserLogTaskUnfocusedHelpStart(seed: number, viewport: Viewport) {
  const variants = [
    { cat: "workflow", task: "workflow_terminal_capture", label: "Workflow" },
    { cat: "os", task: "os_popup_dismissal", label: "OS" },
    { cat: "thunderbird", task: "thunderbird_mock_notes", label: "Thunderbird" }
  ];
  const v = variants[Math.abs(seed) % variants.length];
  let envState = createEmptyEnv(
    viewport,
    `Focus Firefox, switch from Ubuntu help to OSWorld Explorer, select the ${v.label} category and "${v.task}" task, write its task id into task-log.txt, and save.`
  );
  envState = addFiles(envState, [
    createFile("file-task-log", "task-log.txt", ""),
    createFile("file-notes", "notes.txt", "General notes"),
    createFile("file-scratch", "scratch.txt", "Temporary")
  ]);
  envState = addExplorerWindow(envState, "explorer-main", explorerBounds(), true);
  envState = addBrowserWindow(envState, "browser-main", browserBounds(), false, false);
  const browser = envState.appStates.browserLite["browser-main"];
  browser.currentPage = "help";
  browser.tabs = browser.tabs.map((tab, index) => ({ ...tab, active: index === 1 }));
  browser.pageTitle = "Ubuntu help";
  browser.url = "https://help.ubuntu.com/mock/osworld";
  return {
    envState,
    targets: {
      targetFileId: "file-task-log",
      targetCategoryId: v.cat,
      targetBrowserTaskId: v.task,
      appendText: v.task,
      expectedSavedContent: v.task
    }
  };
}

function buildBrowserSelectLogUnfocused(seed: number, viewport: Viewport) {
  const variants = [
    { cat: "thunderbird", task: "thunderbird_task_pack", label: "Thunderbird" },
    { cat: "os", task: "os_popup_dismissal", label: "OS" },
    { cat: "chrome", task: "chrome_help_capture", label: "Chrome" }
  ];
  const v = variants[Math.abs(seed) % variants.length];
  let envState = createEmptyEnv(
    viewport,
    `Focus Firefox, select the ${v.label} category and "${v.task}" task, write its task id into task-log.txt, and save.`
  );
  envState = addFiles(envState, [
    createFile("file-task-log", "task-log.txt", ""),
    createFile("file-scratch", "scratch.txt", "Temporary notes"),
    createFile("file-notes", "notes.txt", "General notes")
  ]);
  envState = addExplorerWindow(envState, "explorer-main", explorerBounds(), true);
  envState = addBrowserWindow(envState, "browser-main", browserBounds(), false, false);
  envState.appStates.browserLite["browser-main"].selectedCategoryId = "workflow";
  envState.appStates.browserLite["browser-main"].selectedTaskId = "workflow_mail_bridge";
  return {
    envState,
    targets: {
      targetFileId: "file-task-log",
      targetCategoryId: v.cat,
      targetBrowserTaskId: v.task,
      appendText: v.task,
      expectedSavedContent: v.task
    }
  };
}

function buildBrowserLogTaskWithDistractors(seed: number, viewport: Viewport) {
  const variants = [
    { cat: "workflow", task: "workflow_terminal_capture", label: "Workflow" },
    { cat: "thunderbird", task: "thunderbird_mock_notes", label: "Thunderbird" },
    { cat: "chrome", task: "chrome_explorer_review", label: "Chrome" }
  ];
  const v = variants[Math.abs(seed) % variants.length];
  let envState = createEmptyEnv(
    viewport,
    `In Firefox OSWorld Explorer, select the ${v.label} category and "${v.task}" task, write its task id into task-log.txt, and save.`
  );
  envState = addFiles(envState, [
    createFile("file-task-log", "task-log.txt", ""),
    createFile("file-draft", "draft.txt", "Draft content"),
    createFile("file-reference", "reference.txt", "Reference material")
  ]);
  envState = addExplorerWindow(envState, "explorer-main", explorerBounds(), false);
  envState = addRepresentativeUbuntuCompanionApps(envState, "browser");
  envState.appStates.browserLite["browser-main"].selectedCategoryId = "os";
  envState.appStates.browserLite["browser-main"].selectedTaskId = "os_popup_dismissal";
  return {
    envState,
    targets: {
      targetFileId: "file-task-log",
      targetCategoryId: v.cat,
      targetBrowserTaskId: v.task,
      appendText: v.task,
      expectedSavedContent: v.task
    }
  };
}

function buildBrowserSelectDifferentCategoryLog(seed: number, viewport: Viewport) {
  const variants = [
    { cat: "thunderbird", task: "thunderbird_task_pack", label: "Thunderbird", initCat: "os", initTask: "os_restore_window" },
    { cat: "workflow", task: "workflow_mail_bridge", label: "Workflow", initCat: "chrome", initTask: "chrome_explorer_review" },
    { cat: "chrome", task: "chrome_help_capture", label: "Chrome", initCat: "thunderbird", initTask: "thunderbird_mock_notes" }
  ];
  const v = variants[Math.abs(seed) % variants.length];
  let envState = createEmptyEnv(
    viewport,
    `In Firefox OSWorld Explorer, switch from the current category to ${v.label}, select "${v.task}", write its task id into task-log.txt, and save.`
  );
  envState = addFiles(envState, [
    createFile("file-task-log", "task-log.txt", ""),
    createFile("file-scratch", "scratch.txt", "Temporary notes"),
    createFile("file-notes", "notes.txt", "General notes")
  ]);
  envState = addExplorerWindow(envState, "explorer-main", explorerBounds(), false);
  envState = addRepresentativeUbuntuCompanionApps(envState, "browser");
  envState.appStates.browserLite["browser-main"].selectedCategoryId = v.initCat;
  envState.appStates.browserLite["browser-main"].selectedTaskId = v.initTask;
  return {
    envState,
    targets: {
      targetFileId: "file-task-log",
      targetCategoryId: v.cat,
      targetBrowserTaskId: v.task,
      appendText: v.task,
      expectedSavedContent: v.task
    }
  };
}

function buildBrowserLogTaskMinimizedDistractors(seed: number, viewport: Viewport) {
  const variants = [
    { cat: "chrome", task: "chrome_help_capture", label: "Chrome" },
    { cat: "workflow", task: "workflow_mail_bridge", label: "Workflow" },
    { cat: "os", task: "os_popup_dismissal", label: "OS" }
  ];
  const v = variants[Math.abs(seed) % variants.length];
  let envState = createEmptyEnv(
    viewport,
    `Restore Firefox from the dock, select the ${v.label} category and "${v.task}" task, write its task id into task-log.txt, and save.`
  );
  envState = addFiles(envState, [
    createFile("file-task-log", "task-log.txt", ""),
    createFile("file-draft", "draft.txt", "Draft content"),
    createFile("file-notes", "notes.txt", "General notes"),
    createFile("file-reference", "reference.txt", "Reference material")
  ]);
  envState = addExplorerWindow(envState, "explorer-main", explorerBounds(), true);
  envState = addBrowserWindow(envState, "browser-main", browserBounds(), false, true);
  envState.appStates.browserLite["browser-main"].selectedCategoryId = "workflow";
  envState.appStates.browserLite["browser-main"].selectedTaskId = "workflow_terminal_capture";
  return {
    envState,
    targets: {
      targetFileId: "file-task-log",
      targetCategoryId: v.cat,
      targetBrowserTaskId: v.task,
      appendText: v.task,
      expectedSavedContent: v.task
    }
  };
}

function buildBrowserLogTaskUnfocusedDistractors(seed: number, viewport: Viewport) {
  const variants = [
    { cat: "os", task: "os_restore_window", label: "OS" },
    { cat: "thunderbird", task: "thunderbird_task_pack", label: "Thunderbird" },
    { cat: "workflow", task: "workflow_terminal_capture", label: "Workflow" }
  ];
  const v = variants[Math.abs(seed) % variants.length];
  let envState = createEmptyEnv(
    viewport,
    `Focus Firefox, select the ${v.label} category and "${v.task}" task, write its task id into task-log.txt, and save.`
  );
  envState = addFiles(envState, [
    createFile("file-task-log", "task-log.txt", ""),
    createFile("file-draft", "draft.txt", "Draft content"),
    createFile("file-notes", "notes.txt", "General notes"),
    createFile("file-reference", "reference.txt", "Reference material")
  ]);
  envState = addExplorerWindow(envState, "explorer-main", explorerBounds(), true);
  envState = addBrowserWindow(envState, "browser-main", browserBounds(), false, false);
  envState.appStates.browserLite["browser-main"].selectedCategoryId = "chrome";
  envState.appStates.browserLite["browser-main"].selectedTaskId = "chrome_explorer_review";
  return {
    envState,
    targets: {
      targetFileId: "file-task-log",
      targetCategoryId: v.cat,
      targetBrowserTaskId: v.task,
      appendText: v.task,
      expectedSavedContent: v.task
    }
  };
}

function buildBrowserLogFromHelpUnfocusedDistractors(seed: number, viewport: Viewport) {
  const variants = [
    { cat: "chrome", task: "chrome_explorer_review", label: "Chrome" },
    { cat: "thunderbird", task: "thunderbird_task_pack", label: "Thunderbird" },
    { cat: "os", task: "os_popup_dismissal", label: "OS" }
  ];
  const v = variants[Math.abs(seed) % variants.length];
  let envState = createEmptyEnv(
    viewport,
    `Focus Firefox, switch from Ubuntu help to OSWorld Explorer, select the ${v.label} category and "${v.task}" task, write its task id into task-log.txt, and save.`
  );
  envState = addFiles(envState, [
    createFile("file-task-log", "task-log.txt", ""),
    createFile("file-draft", "draft.txt", "Draft content"),
    createFile("file-notes", "notes.txt", "General notes"),
    createFile("file-reference", "reference.txt", "Reference material")
  ]);
  envState = addExplorerWindow(envState, "explorer-main", explorerBounds(), true);
  envState = addBrowserWindow(envState, "browser-main", browserBounds(), false, false);
  const browser = envState.appStates.browserLite["browser-main"];
  browser.currentPage = "help";
  browser.tabs = browser.tabs.map((tab, i) => ({ ...tab, active: i === 1 }));
  browser.pageTitle = "Ubuntu help";
  browser.url = "https://help.ubuntu.com/mock/osworld";
  return {
    envState,
    targets: {
      targetFileId: "file-task-log",
      targetCategoryId: v.cat,
      targetBrowserTaskId: v.task,
      appendText: v.task,
      expectedSavedContent: v.task
    }
  };
}

function buildBrowserSelectLogMinimizedHelpStart(seed: number, viewport: Viewport) {
  const variants = [
    { cat: "os", task: "os_restore_window", label: "OS" },
    { cat: "workflow", task: "workflow_mail_bridge", label: "Workflow" },
    { cat: "chrome", task: "chrome_help_capture", label: "Chrome" }
  ];
  const v = variants[Math.abs(seed) % variants.length];
  let envState = createEmptyEnv(
    viewport,
    `Restore Firefox from the dock, switch from Ubuntu help to OSWorld Explorer, select the ${v.label} category and "${v.task}" task, write its task id into task-log.txt, and save.`
  );
  envState = addFiles(envState, [
    createFile("file-task-log", "task-log.txt", ""),
    createFile("file-scratch", "scratch.txt", "Temporary notes")
  ]);
  envState = addExplorerWindow(envState, "explorer-main", explorerBounds(), true);
  envState = addBrowserWindow(envState, "browser-main", browserBounds(), false, true);
  const browser = envState.appStates.browserLite["browser-main"];
  browser.currentPage = "help";
  browser.tabs = browser.tabs.map((tab, i) => ({ ...tab, active: i === 1 }));
  browser.pageTitle = "Ubuntu help";
  browser.url = "https://help.ubuntu.com/mock/osworld";
  return {
    envState,
    targets: {
      targetFileId: "file-task-log",
      targetCategoryId: v.cat,
      targetBrowserTaskId: v.task,
      appendText: v.task,
      expectedSavedContent: v.task
    }
  };
}

const SELECTION_LOG_TASKS = [
  {
    id: "browser_log_workflow_task_id",
    instruction: "Open Workflow in OSWorld Explorer, select the bridge task, and save its task id into browser-log.txt.",
    domain: "Workflow",
    split: "representative",
    maxSteps: 64,
    seedDefaults: [0, 1, 2],
    setup: buildBrowserTaskIdLogTask,
    goalPredicates: ["browser.task_selected", "note.target_opened", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.task_selected", "note.target_opened", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  },
  {
    id: "browser_log_task_from_minimized",
    instruction: "Restore Firefox from the dock, select the target task in OSWorld Explorer, and save its id into browser-log.txt.",
    domain: "Chrome",
    split: "representative",
    maxSteps: 80,
    seedDefaults: [0, 1, 2],
    setup: buildBrowserLogTaskFromMinimized,
    goalPredicates: ["browser.task_selected", "note.target_opened", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.task_selected", "note.target_opened", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  },
  {
    id: "browser_log_task_unfocused_help_start",
    instruction: "Focus Firefox, switch from help to OSWorld Explorer, select the target task, and save its id into task-log.txt.",
    domain: "Chrome",
    split: "representative",
    maxSteps: 96,
    seedDefaults: [0, 1, 2],
    setup: buildBrowserLogTaskUnfocusedHelpStart,
    goalPredicates: ["browser.task_selected", "note.target_opened", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.task_selected", "note.target_opened", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  },
  {
    id: "browser_select_log_unfocused",
    instruction: "Focus Firefox, select the target task, and save its id into task-log.txt.",
    domain: "Chrome",
    split: "representative",
    maxSteps: 64,
    seedDefaults: [0, 1, 2],
    setup: buildBrowserSelectLogUnfocused,
    goalPredicates: ["browser.task_selected", "note.target_opened", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.task_selected", "note.target_opened", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  },
  {
    id: "browser_log_task_with_distractors",
    instruction: "Select the target task in Explorer and save its id into task-log.txt among distractor files.",
    domain: "Chrome",
    split: "representative",
    maxSteps: 80,
    seedDefaults: [0, 1, 2],
    setup: buildBrowserLogTaskWithDistractors,
    goalPredicates: ["browser.task_selected", "note.target_opened", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.task_selected", "note.target_opened", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  },
  {
    id: "browser_select_different_category_log",
    instruction: "Switch to the target category in OSWorld Explorer, select the task, and save its id.",
    domain: "Chrome",
    split: "representative",
    maxSteps: 80,
    seedDefaults: [0, 1, 2],
    setup: buildBrowserSelectDifferentCategoryLog,
    goalPredicates: ["browser.task_selected", "note.target_opened", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.task_selected", "note.target_opened", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  },
  {
    id: "browser_log_task_minimized_distractors",
    instruction: "Restore Firefox, select the target task, and save its id into task-log.txt among distractors.",
    domain: "Chrome",
    split: "representative",
    maxSteps: 96,
    seedDefaults: [0, 1, 2],
    setup: buildBrowserLogTaskMinimizedDistractors,
    goalPredicates: ["browser.task_selected", "note.target_opened", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.task_selected", "note.target_opened", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  },
  {
    id: "browser_log_task_unfocused_distractors",
    instruction: "Focus Firefox, select the target task, and save its id into task-log.txt among distractors.",
    domain: "Chrome",
    split: "representative",
    maxSteps: 96,
    seedDefaults: [0, 1, 2],
    setup: buildBrowserLogTaskUnfocusedDistractors,
    goalPredicates: ["browser.task_selected", "note.target_opened", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.task_selected", "note.target_opened", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  },
  {
    id: "browser_log_from_help_unfocused_distractors",
    instruction: "Focus Firefox on help, switch to Explorer, select the target task, and save its id among distractors.",
    domain: "Chrome",
    split: "representative",
    maxSteps: 112,
    seedDefaults: [0, 1, 2],
    setup: buildBrowserLogFromHelpUnfocusedDistractors,
    goalPredicates: ["browser.task_selected", "note.target_opened", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.task_selected", "note.target_opened", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  },
  {
    id: "browser_select_log_minimized_help_start",
    instruction: "Restore minimized Firefox from help, switch to Explorer, select the target task, and save its id.",
    domain: "Chrome",
    split: "representative",
    maxSteps: 96,
    seedDefaults: [0, 1, 2],
    setup: buildBrowserSelectLogMinimizedHelpStart,
    goalPredicates: ["browser.task_selected", "note.target_opened", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.task_selected", "note.target_opened", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  }
] satisfies Omit<TaskSpec, "summary">[];

const summaries: Record<string, TaskSummary> = {
  browser_log_workflow_task_id: {
    family: "browser_extract_to_note",
    level: "C",
    apps: ["browser", "note"],
    startState: "Firefox is focused on Explorer but the wrong category-task is selected, and browser-log.txt exists unopened in File Explorer.",
    objective: "Switch to Workflow, pick workflow_mail_bridge, record its task id in browser-log.txt, and save.",
    implementationPath
  },
  browser_log_task_from_minimized: {
    family: "browser_extract_to_note",
    level: "C",
    apps: ["browser", "window", "note"],
    startState: "Firefox starts minimized to the dock while File Explorer remains visible with browser-log.txt ready.",
    objective: "Restore Firefox, select the requested Explorer task, log its id into browser-log.txt, and save.",
    implementationPath
  },
  browser_log_task_unfocused_help_start: {
    family: "browser_extract_to_note",
    level: "C",
    apps: ["browser", "window", "note"],
    startState: "Firefox is open but unfocused and currently showing Ubuntu help instead of Explorer.",
    objective: "Focus Firefox, leave help, select the requested task card, write its id into task-log.txt, and save.",
    implementationPath
  },
  browser_select_log_unfocused: {
    family: "browser_extract_to_note",
    level: "C",
    apps: ["browser", "window", "note"],
    startState: "Firefox is unfocused behind File Explorer, with task-log.txt waiting unopened in the workspace.",
    objective: "Refocus Firefox, select the requested task, open task-log.txt, record the id, and save.",
    implementationPath
  },
  browser_log_task_with_distractors: {
    family: "browser_extract_to_note",
    level: "C",
    apps: ["browser", "note", "files"],
    startState: "Firefox is focused on Explorer with two distractor files visible alongside task-log.txt.",
    objective: "Select the requested task card, ignore distractor files, write the task id into task-log.txt, and save.",
    implementationPath
  },
  browser_select_different_category_log: {
    family: "browser_extract_to_note",
    level: "C",
    apps: ["browser", "note"],
    startState: "Firefox starts on the wrong Explorer category and task, with task-log.txt unopened in File Explorer.",
    objective: "Change to the target category, select the target task, write its id into task-log.txt, and save.",
    implementationPath
  },
  browser_log_task_minimized_distractors: {
    family: "browser_extract_to_note",
    level: "C",
    apps: ["browser", "window", "note", "files"],
    startState: "Firefox is minimized and three distractor files share the workspace with task-log.txt.",
    objective: "Restore the browser, select the requested task, record its id into task-log.txt, and save despite the distractors.",
    implementationPath
  },
  browser_log_task_unfocused_distractors: {
    family: "browser_extract_to_note",
    level: "C",
    apps: ["browser", "window", "note", "files"],
    startState: "Firefox is open but unfocused, and three distractor files sit beside task-log.txt in File Explorer.",
    objective: "Focus Firefox, select the requested task, write the task id into task-log.txt, and save.",
    implementationPath
  },
  browser_log_from_help_unfocused_distractors: {
    family: "browser_extract_to_note",
    level: "C",
    apps: ["browser", "window", "note", "files"],
    startState: "Firefox is unfocused, starts on Ubuntu help, and three distractor files surround task-log.txt.",
    objective: "Focus Firefox, leave help for Explorer, select the target task, write its id into task-log.txt, and save.",
    implementationPath
  },
  browser_select_log_minimized_help_start: {
    family: "browser_extract_to_note",
    level: "C",
    apps: ["browser", "window", "note"],
    startState: "Firefox is minimized to the dock and will reopen on the Ubuntu help tab instead of Explorer.",
    objective: "Restore Firefox, switch away from help, select the requested task, log its id into task-log.txt, and save.",
    implementationPath
  }
};

export const REPRESENTATIVE_BROWSER_SELECTION_LOG_TASKS = withTaskSummaries(SELECTION_LOG_TASKS, summaries);
