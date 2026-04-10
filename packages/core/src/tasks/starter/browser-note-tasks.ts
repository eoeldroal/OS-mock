import {
  addBrowserWindow,
  addExplorerWindow,
  addFiles,
  addNoteEditorWindow,
  createEmptyEnv,
  createFile
} from "../../env/factory.js";
import type { TaskSpec, Viewport } from "../../types.js";
import {
  browserBounds,
  explorerBounds,
  noteBoundsRight
} from "./shared.js";

const implementationPath = "packages/core/src/tasks/starter/browser-note-tasks.ts";

function buildBrowserLogTaskFromHelpStart(seed: number, viewport: Viewport) {
  const variants = [
    { cat: "os", task: "os_restore_window", label: "OS" },
    { cat: "thunderbird", task: "thunderbird_mock_notes", label: "Thunderbird" },
    { cat: "chrome", task: "chrome_explorer_review", label: "Chrome" }
  ];
  const v = variants[Math.abs(seed) % variants.length];
  let envState = createEmptyEnv(
    viewport,
    `In Firefox, switch from Ubuntu help back to OSWorld Explorer, select the ${v.label} category and "${v.task}" task, write its task id into browser-log.txt, and save.`
  );
  envState = addFiles(envState, [
    createFile("file-browser-log", "browser-log.txt", ""),
    createFile("file-scratch", "scratch.txt", "Temporary notes")
  ]);
  envState = addExplorerWindow(envState, "explorer-main", explorerBounds(), false);
  envState = addBrowserWindow(envState, "browser-main", browserBounds(), true, false);
  const browser = envState.appStates.browserLite["browser-main"];
  browser.currentPage = "help";
  browser.tabs = browser.tabs.map((tab, index) => ({ ...tab, active: index === 1 }));
  browser.pageTitle = "Ubuntu help";
  browser.url = "https://help.ubuntu.com/mock/osworld";
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

function buildBrowserHelpToPreopenNote(seed: number, viewport: Viewport) {
  const helpLine = "Use the dock to switch between Files, Text Editor, Terminal, Firefox, and Thunderbird.";
  let envState = createEmptyEnv(
    viewport,
    "In Firefox, switch to Ubuntu help, then type the dock reminder line into help-notes.txt and save."
  );
  envState = addFiles(envState, [createFile("file-help-notes", "help-notes.txt", "")]);
  envState = addNoteEditorWindow(envState, "notes-help", "file-help-notes", noteBoundsRight(), false);
  envState = addBrowserWindow(envState, "browser-main", browserBounds(), true, false);
  return {
    envState,
    targets: {
      targetFileId: "file-help-notes",
      appendText: helpLine,
      expectedSavedContent: helpLine
    }
  };
}

function buildBrowserLogTaskIdSimple(seed: number, viewport: Viewport) {
  const variants = [
    { cat: "os", task: "os_restore_window", label: "OS" },
    { cat: "chrome", task: "chrome_help_capture", label: "Chrome" },
    { cat: "thunderbird", task: "thunderbird_mock_notes", label: "Thunderbird" }
  ];
  const v = variants[Math.abs(seed) % variants.length];
  let envState = createEmptyEnv(
    viewport,
    `In Firefox OSWorld Explorer, select the ${v.label} category and "${v.task}" task, write its task id into task-log.txt, and save.`
  );
  envState = addFiles(envState, [createFile("file-task-log", "task-log.txt", "")]);
  envState = addExplorerWindow(envState, "explorer-main", explorerBounds(), false);
  envState = addBrowserWindow(envState, "browser-main", browserBounds(), true, false);
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

function buildBrowserHelpLogSummarySimple(seed: number, viewport: Viewport) {
  const summaryLine = "Representative OSWorld-style tasks often span browser, mail, terminal, and file workflows.";
  let envState = createEmptyEnv(
    viewport,
    "In Firefox, switch to Ubuntu help, write the workflow summary line into summary-log.txt, and save."
  );
  envState = addFiles(envState, [createFile("file-summary-log", "summary-log.txt", "")]);
  envState = addExplorerWindow(envState, "explorer-main", explorerBounds(), false);
  envState = addBrowserWindow(envState, "browser-main", browserBounds(), true, false);
  return {
    envState,
    targets: {
      targetFileId: "file-summary-log",
      appendText: summaryLine,
      expectedSavedContent: summaryLine
    }
  };
}

function buildBrowserSelectFromHelpAndLogPreopen(seed: number, viewport: Viewport) {
  const variants = [
    { cat: "chrome", task: "chrome_explorer_review", label: "Chrome" },
    { cat: "os", task: "os_popup_dismissal", label: "OS" },
    { cat: "thunderbird", task: "thunderbird_task_pack", label: "Thunderbird" }
  ];
  const v = variants[Math.abs(seed) % variants.length];
  let envState = createEmptyEnv(
    viewport,
    `In Firefox, switch from Ubuntu help to OSWorld Explorer, select the ${v.label} category and "${v.task}" task, write its task id into the open task-log.txt, and save.`
  );
  envState = addFiles(envState, [createFile("file-task-log", "task-log.txt", "")]);
  envState = addNoteEditorWindow(envState, "notes-task-log", "file-task-log", noteBoundsRight(), false);
  envState = addBrowserWindow(envState, "browser-main", browserBounds(), true, false);
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

function buildBrowserHelpLogSummaryPreopen(seed: number, viewport: Viewport) {
  const summaryLine = "Representative OSWorld-style tasks often span browser, mail, terminal, and file workflows.";
  let envState = createEmptyEnv(
    viewport,
    "In Firefox, switch to Ubuntu help, type the workflow summary line into the open summary-log.txt, and save."
  );
  envState = addFiles(envState, [createFile("file-summary-log", "summary-log.txt", "")]);
  envState = addNoteEditorWindow(envState, "notes-summary", "file-summary-log", noteBoundsRight(), false);
  envState = addBrowserWindow(envState, "browser-main", browserBounds(), true, false);
  return {
    envState,
    targets: {
      targetFileId: "file-summary-log",
      appendText: summaryLine,
      expectedSavedContent: summaryLine
    }
  };
}

function buildBrowserSelectLogToPreopen(seed: number, viewport: Viewport) {
  const variants = [
    { cat: "workflow", task: "workflow_terminal_capture", label: "Workflow" },
    { cat: "thunderbird", task: "thunderbird_mock_notes", label: "Thunderbird" },
    { cat: "os", task: "os_restore_window", label: "OS" }
  ];
  const v = variants[Math.abs(seed) % variants.length];
  let envState = createEmptyEnv(
    viewport,
    `In Firefox OSWorld Explorer, select the ${v.label} category and "${v.task}" task, write its task id into the open task-log.txt, and save.`
  );
  envState = addFiles(envState, [createFile("file-task-log", "task-log.txt", "")]);
  envState = addNoteEditorWindow(envState, "notes-task-log", "file-task-log", noteBoundsRight(), false);
  envState = addBrowserWindow(envState, "browser-main", browserBounds(), true, false);
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

export const STARTER_BROWSER_NOTE_TASKS: TaskSpec[] = [
  {
    id: "browser_log_task_from_help_start",
    instruction: "Switch Firefox from help to OSWorld Explorer, select the target task, and save its id into browser-log.txt.",
    domain: "Chrome",
    split: "starter",
    maxSteps: 40,
    seedDefaults: [0, 1, 2],
    summary: {
      family: "browser_extract_to_note",
      level: "B",
      apps: ["browser", "note"],
      startState: "Firefox starts on Ubuntu help and a blank browser-log.txt is available in File Explorer.",
      objective: "Return to OSWorld Explorer, choose the requested task card, write its task id into browser-log.txt, and save it.",
      implementationPath
    },
    setup: buildBrowserLogTaskFromHelpStart,
    goalPredicates: ["browser.task_selected", "note.target_opened", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.task_selected", "note.target_opened", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  },
  {
    id: "browser_help_to_preopen_note",
    instruction: "Switch Firefox to Ubuntu help, type the dock reminder line into the open note, and save.",
    domain: "Chrome",
    split: "starter",
    maxSteps: 30,
    seedDefaults: [0, 1, 2],
    summary: {
      family: "browser_extract_to_note",
      level: "B",
      apps: ["browser", "note"],
      startState: "Firefox starts on Explorer and help-notes.txt is already open in a note editor window.",
      objective: "Switch to Ubuntu help, copy the dock reminder into the pre-opened note, and save it.",
      implementationPath
    },
    setup: buildBrowserHelpToPreopenNote,
    goalPredicates: ["browser.help_page_opened", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.help_page_opened", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  },
  {
    id: "browser_log_task_id_simple",
    instruction: "In Firefox, select the target task and save its id into task-log.txt.",
    domain: "Chrome",
    split: "starter",
    maxSteps: 35,
    seedDefaults: [0, 1, 2],
    summary: {
      family: "browser_extract_to_note",
      level: "B",
      apps: ["browser", "note"],
      startState: "Firefox is focused on OSWorld Explorer with the wrong selection and task-log.txt exists unopened in File Explorer.",
      objective: "Select the requested Explorer task, open task-log.txt, write the task id, and save the note.",
      implementationPath
    },
    setup: buildBrowserLogTaskIdSimple,
    goalPredicates: ["browser.task_selected", "note.target_opened", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.task_selected", "note.target_opened", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  },
  {
    id: "browser_help_log_summary_simple",
    instruction: "Switch Firefox to Ubuntu help and save the workflow summary line into summary-log.txt.",
    domain: "Chrome",
    split: "starter",
    maxSteps: 35,
    seedDefaults: [0, 1, 2],
    summary: {
      family: "browser_extract_to_note",
      level: "B",
      apps: ["browser", "note"],
      startState: "Firefox starts focused on Explorer and summary-log.txt exists unopened in File Explorer.",
      objective: "Open Ubuntu help, capture the workflow summary line, write it into summary-log.txt, and save.",
      implementationPath
    },
    setup: buildBrowserHelpLogSummarySimple,
    goalPredicates: ["browser.help_page_opened", "note.target_opened", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.help_page_opened", "note.target_opened", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  },
  {
    id: "browser_select_from_help_and_log_preopen",
    instruction: "Switch Firefox from help to Explorer, select the target task, and save its id into the open note.",
    domain: "Chrome",
    split: "starter",
    maxSteps: 35,
    seedDefaults: [0, 1, 2],
    summary: {
      family: "browser_extract_to_note",
      level: "B",
      apps: ["browser", "note"],
      startState: "Firefox starts on Ubuntu help and task-log.txt is already open in a note editor.",
      objective: "Leave the help tab, select the requested Explorer task, append its id into the open note, and save it.",
      implementationPath
    },
    setup: buildBrowserSelectFromHelpAndLogPreopen,
    goalPredicates: ["browser.task_selected", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.task_selected", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  },
  {
    id: "browser_help_log_summary_preopen",
    instruction: "Switch Firefox to Ubuntu help and type the workflow summary into the open note, then save.",
    domain: "Chrome",
    split: "starter",
    maxSteps: 30,
    seedDefaults: [0, 1, 2],
    summary: {
      family: "browser_extract_to_note",
      level: "B",
      apps: ["browser", "note"],
      startState: "Firefox begins on Explorer and summary-log.txt is already open for editing.",
      objective: "Switch to help, capture the workflow summary line, append it into the open note, and save.",
      implementationPath
    },
    setup: buildBrowserHelpLogSummaryPreopen,
    goalPredicates: ["browser.help_page_opened", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.help_page_opened", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  },
  {
    id: "browser_select_log_to_preopen",
    instruction: "In Firefox Explorer, select the target task and save its id into the open note.",
    domain: "Chrome",
    split: "starter",
    maxSteps: 25,
    seedDefaults: [0, 1, 2],
    summary: {
      family: "browser_extract_to_note",
      level: "B",
      apps: ["browser", "note"],
      startState: "Firefox is focused on Explorer with task-log.txt already open beside it.",
      objective: "Select the requested task card, append its id into the pre-opened note, and save the result.",
      implementationPath
    },
    setup: buildBrowserSelectLogToPreopen,
    goalPredicates: ["browser.task_selected", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.task_selected", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  }
];
