import {
  addBrowserWindow,
  addExplorerWindow,
  addFiles,
  addNoteEditorWindow,
  createEmptyEnv,
  createFile
} from "../../env/factory.js";
import type { TaskSpec, Viewport } from "../../types.js";
import { browserBounds, explorerBounds, noteBoundsRight } from "./shared.js";

const implementationPath = "packages/core/src/tasks/starter/browser-note-tasks.ts";

function applyHelpPage(browser: ReturnType<typeof createEmptyEnv>["appStates"]["browserLite"][string]) {
  browser.currentPage = "help";
  browser.tabs = browser.tabs.map((tab, index) => ({ ...tab, active: index === 1 }));
  browser.pageTitle = "Ubuntu help";
  browser.url = "https://help.ubuntu.com/mock/osworld";
}

function buildBrowserLogTaskIdSimple(seed: number, viewport: Viewport) {
  const variants = [
    { cat: "os", task: "os_restore_window", label: "OS", fileId: "file-task-log", fileName: "task-log.txt" },
    { cat: "chrome", task: "chrome_help_capture", label: "Chrome", fileId: "file-browser-log", fileName: "browser-log.txt" },
    { cat: "thunderbird", task: "thunderbird_mock_notes", label: "Thunderbird", fileId: "file-task-log", fileName: "task-log.txt" }
  ];
  const v = variants[Math.abs(seed) % variants.length];
  let envState = createEmptyEnv(
    viewport,
    `In Firefox, select the ${v.label} category and "${v.task}" task, write its task id into ${v.fileName}, and save.`
  );
  envState = addFiles(envState, [createFile(v.fileId, v.fileName, "")]);
  envState = addExplorerWindow(envState, "explorer-main", explorerBounds(), false);
  envState = addBrowserWindow(envState, "browser-main", browserBounds(), true, false);
  envState.appStates.browserLite["browser-main"].selectedCategoryId = "workflow";
  envState.appStates.browserLite["browser-main"].selectedTaskId = "workflow_mail_bridge";
  return {
    envState,
    targets: {
      targetFileId: v.fileId,
      targetCategoryId: v.cat,
      targetBrowserTaskId: v.task,
      appendText: v.task,
      expectedSavedContent: v.task
    }
  };
}

function buildBrowserHelpLogSummarySimple(seed: number, viewport: Viewport) {
  const variants = [
    {
      fileId: "file-summary-log",
      fileName: "summary-log.txt",
      appendText: "Representative OSWorld-style tasks often span browser, mail, terminal, and file workflows."
    },
    {
      fileId: "file-help-log",
      fileName: "help-log.txt",
      appendText: "Use the dock to switch between Files, Text Editor, Terminal, Firefox, and Thunderbird."
    }
  ];
  const v = variants[Math.abs(seed) % variants.length];
  let envState = createEmptyEnv(
    viewport,
    `In Firefox, switch to Ubuntu help, write the requested help line into ${v.fileName}, and save.`
  );
  envState = addFiles(envState, [createFile(v.fileId, v.fileName, "")]);
  envState = addExplorerWindow(envState, "explorer-main", explorerBounds(), false);
  envState = addBrowserWindow(envState, "browser-main", browserBounds(), true, false);
  return {
    envState,
    targets: {
      targetFileId: v.fileId,
      appendText: v.appendText,
      expectedSavedContent: v.appendText
    }
  };
}

function buildBrowserHelpToPreopenNote(seed: number, viewport: Viewport) {
  const variants = [
    {
      fileId: "file-help-notes",
      fileName: "help-notes.txt",
      initialContent: "",
      appendText: "Use the dock to switch between Files, Text Editor, Terminal, Firefox, and Thunderbird."
    },
    {
      fileId: "file-summary-notes",
      fileName: "summary-notes.txt",
      initialContent: "Previous note:\n",
      appendText: "Representative OSWorld-style tasks often span browser, mail, terminal, and file workflows."
    }
  ];
  const v = variants[Math.abs(seed) % variants.length];
  let envState = createEmptyEnv(
    viewport,
    `In Firefox, switch to Ubuntu help, type the requested help line into the open ${v.fileName}, and save.`
  );
  envState = addFiles(envState, [createFile(v.fileId, v.fileName, v.initialContent)]);
  envState = addNoteEditorWindow(
    envState,
    "notes-help",
    v.fileId,
    noteBoundsRight(),
    false,
    v.initialContent,
    false
  );
  envState = addBrowserWindow(envState, "browser-main", browserBounds(), true, false);
  return {
    envState,
    targets: {
      targetFileId: v.fileId,
      appendText: v.appendText,
      expectedSavedContent: v.initialContent + v.appendText
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
  applyHelpPage(envState.appStates.browserLite["browser-main"]);
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
    id: "browser_log_task_id_simple",
    instruction: "In Firefox, select the target task and save its id into a note.",
    domain: "Chrome",
    split: "starter",
    maxSteps: 35,
    seedDefaults: [0, 1, 2],
    summary: {
      family: "browser_extract_to_note",
      level: "B",
      apps: ["browser", "note"],
      startState: "Firefox is focused on OSWorld Explorer with the wrong selection, and a blank task-id note exists unopened in File Explorer.",
      objective: "Select the requested Explorer task, open the target note, write the task id, and save it.",
      implementationPath
    },
    setup: buildBrowserLogTaskIdSimple,
    goalPredicates: ["browser.task_selected", "note.target_opened", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.task_selected", "note.target_opened", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  },
  {
    id: "browser_help_log_summary_simple",
    instruction: "In Firefox, switch to Ubuntu help, write the requested help line into a note, and save.",
    domain: "Chrome",
    split: "starter",
    maxSteps: 35,
    seedDefaults: [0, 1, 2],
    summary: {
      family: "browser_extract_to_note",
      level: "B",
      apps: ["browser", "note"],
      startState: "Firefox starts on Explorer while an unopened note file waits in File Explorer for a line from Ubuntu help.",
      objective: "Open Ubuntu help, capture the requested help text, write it into the target note, and save.",
      implementationPath
    },
    setup: buildBrowserHelpLogSummarySimple,
    goalPredicates: ["browser.help_page_opened", "note.target_opened", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.help_page_opened", "note.target_opened", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  },
  {
    id: "browser_help_to_preopen_note",
    instruction: "In Firefox, switch to Ubuntu help, type the requested help line into the open note, and save.",
    domain: "Chrome",
    split: "starter",
    maxSteps: 30,
    seedDefaults: [0, 1, 2],
    summary: {
      family: "browser_extract_to_note",
      level: "B",
      apps: ["browser", "note"],
      startState: "Firefox starts on Explorer and the target help note is already open in the editor, sometimes with existing content.",
      objective: "Switch to Ubuntu help, copy the requested help line into the pre-opened note, and save the result.",
      implementationPath
    },
    setup: buildBrowserHelpToPreopenNote,
    goalPredicates: ["browser.help_page_opened", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.help_page_opened", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  },
  {
    id: "browser_select_from_help_and_log_preopen",
    instruction: "In Firefox, switch from help to Explorer, select the target task, and save its id into the open note.",
    domain: "Chrome",
    split: "starter",
    maxSteps: 35,
    seedDefaults: [0, 1, 2],
    summary: {
      family: "browser_extract_to_note",
      level: "B",
      apps: ["browser", "note"],
      startState: "Firefox starts on Ubuntu help and task-log.txt is already open beside the browser.",
      objective: "Leave the help tab, select the requested Explorer task, append its id into the open note, and save.",
      implementationPath
    },
    setup: buildBrowserSelectFromHelpAndLogPreopen,
    goalPredicates: ["browser.task_selected", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.task_selected", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  }
];
