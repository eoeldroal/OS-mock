import {
  addBrowserWindow,
  addExplorerWindow,
  addFiles,
  addNoteEditorWindow,
  createEmptyEnv,
  createFile
} from "../../env/factory.js";
import type { TaskSpec, TaskSummary, Viewport } from "../../types.js";
import { withTaskSummaries } from "../with-task-summaries.js";
import {
  addRepresentativeUbuntuCompanionApps,
  browserBounds,
  explorerBounds,
  noteBoundsRight
} from "./shared.js";

const implementationPath = "packages/core/src/tasks/representative/browser-note-log-tasks.ts";

function buildBrowserLogTaskPreopenNoteHard(seed: number, viewport: Viewport) {
  const variants = [
    { cat: "chrome", task: "chrome_help_capture", label: "Chrome" },
    { cat: "os", task: "os_popup_dismissal", label: "OS" },
    { cat: "thunderbird", task: "thunderbird_task_pack", label: "Thunderbird" }
  ];
  const v = variants[Math.abs(seed) % variants.length];
  const existingContent = "Previous entry: workflow_mail_bridge\n";
  let envState = createEmptyEnv(
    viewport,
    `In Firefox OSWorld Explorer, select the ${v.label} category and "${v.task}" task, then append its task id to browser-log.txt and save.`
  );
  envState = addFiles(envState, [
    createFile("file-browser-log", "browser-log.txt", existingContent),
    createFile("file-notes", "notes.txt", "General notes"),
    createFile("file-draft", "draft.txt", "Draft content"),
    createFile("file-reference", "reference.txt", "Reference material")
  ]);
  envState = addExplorerWindow(envState, "explorer-main", explorerBounds(), false);
  envState = addNoteEditorWindow(
    envState,
    "notes-browser-log",
    "file-browser-log",
    noteBoundsRight(),
    false,
    existingContent,
    false
  );
  envState = addBrowserWindow(envState, "browser-main", browserBounds(), true, false);
  envState.appStates.browserLite["browser-main"].selectedCategoryId = "workflow";
  envState.appStates.browserLite["browser-main"].selectedTaskId = "workflow_mail_bridge";
  return {
    envState,
    targets: {
      targetFileId: "file-browser-log",
      targetCategoryId: v.cat,
      targetBrowserTaskId: v.task,
      appendText: v.task,
      expectedSavedContent: existingContent + v.task
    }
  };
}

function buildBrowserLogTaskInstructionText(seed: number, viewport: Viewport) {
  const variants = [
    { cat: "os", task: "os_restore_window", label: "OS", instr: "Bring a minimized editor window back from the dock and save the pending work." },
    { cat: "chrome", task: "chrome_help_capture", label: "Chrome", instr: "Switch to the Ubuntu help tab and record the dock reminder line in a note." },
    { cat: "thunderbird", task: "thunderbird_mock_notes", label: "Thunderbird", instr: "Open the Mock environment notes message and copy its reminder into a note." }
  ];
  const v = variants[Math.abs(seed) % variants.length];
  let envState = createEmptyEnv(
    viewport,
    `In Firefox OSWorld Explorer, select the ${v.label} category and "${v.task}" task, write its instruction text into instruction-log.txt, and save.`
  );
  envState = addFiles(envState, [
    createFile("file-instr-log", "instruction-log.txt", ""),
    createFile("file-scratch", "scratch.txt", "Temporary notes")
  ]);
  envState = addExplorerWindow(envState, "explorer-main", explorerBounds(), false);
  envState = addRepresentativeUbuntuCompanionApps(envState, "browser");
  envState.appStates.browserLite["browser-main"].selectedCategoryId = "workflow";
  envState.appStates.browserLite["browser-main"].selectedTaskId = "workflow_mail_bridge";
  return {
    envState,
    targets: {
      targetFileId: "file-instr-log",
      targetCategoryId: v.cat,
      targetBrowserTaskId: v.task,
      appendText: v.instr,
      expectedSavedContent: v.instr
    }
  };
}

function buildBrowserLogTaskTitleText(seed: number, viewport: Viewport) {
  const variants = [
    { cat: "workflow", task: "workflow_mail_bridge", label: "Workflow", title: "Bridge a Thunderbird summary into notes" },
    { cat: "os", task: "os_popup_dismissal", label: "OS", title: "Dismiss a blocking popup" },
    { cat: "chrome", task: "chrome_explorer_review", label: "Chrome", title: "Review the OSWorld Explorer board" }
  ];
  const v = variants[Math.abs(seed) % variants.length];
  let envState = createEmptyEnv(
    viewport,
    `In Firefox OSWorld Explorer, select the ${v.label} category and "${v.task}" task, write its title into title-log.txt, and save.`
  );
  envState = addFiles(envState, [
    createFile("file-title-log", "title-log.txt", ""),
    createFile("file-scratch", "scratch.txt", "Temporary notes")
  ]);
  envState = addExplorerWindow(envState, "explorer-main", explorerBounds(), false);
  envState = addRepresentativeUbuntuCompanionApps(envState, "browser");
  envState.appStates.browserLite["browser-main"].selectedCategoryId = "chrome";
  envState.appStates.browserLite["browser-main"].selectedTaskId = "chrome_help_capture";
  return {
    envState,
    targets: {
      targetFileId: "file-title-log",
      targetCategoryId: v.cat,
      targetBrowserTaskId: v.task,
      appendText: v.title,
      expectedSavedContent: v.title
    }
  };
}

function buildBrowserSelectLogMinimizedPreopen(seed: number, viewport: Viewport) {
  const variants = [
    { cat: "os", task: "os_restore_window", label: "OS" },
    { cat: "chrome", task: "chrome_explorer_review", label: "Chrome" },
    { cat: "workflow", task: "workflow_terminal_capture", label: "Workflow" }
  ];
  const v = variants[Math.abs(seed) % variants.length];
  let envState = createEmptyEnv(
    viewport,
    `Restore Firefox from the dock, select the ${v.label} category and "${v.task}" task, write its task id into the open task-log.txt, and save.`
  );
  envState = addFiles(envState, [
    createFile("file-task-log", "task-log.txt", ""),
    createFile("file-scratch", "scratch.txt", "Temporary notes")
  ]);
  envState = addExplorerWindow(envState, "explorer-main", explorerBounds(), false);
  envState = addNoteEditorWindow(envState, "notes-task-log", "file-task-log", noteBoundsRight(), true);
  envState = addBrowserWindow(envState, "browser-main", browserBounds(), false, true);
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

function buildBrowserLogTaskAppendExisting(seed: number, viewport: Viewport) {
  const variants = [
    { cat: "thunderbird", task: "thunderbird_mock_notes", label: "Thunderbird" },
    { cat: "os", task: "os_restore_window", label: "OS" },
    { cat: "workflow", task: "workflow_terminal_capture", label: "Workflow" }
  ];
  const v = variants[Math.abs(seed) % variants.length];
  const existingContent = "Previous: chrome_explorer_review\n";
  let envState = createEmptyEnv(
    viewport,
    `In Firefox OSWorld Explorer, select the ${v.label} category and "${v.task}" task, append its task id to the open task-log.txt, and save.`
  );
  envState = addFiles(envState, [
    createFile("file-task-log", "task-log.txt", existingContent),
    createFile("file-draft", "draft.txt", "Draft content"),
    createFile("file-reference", "reference.txt", "Reference material")
  ]);
  envState = addExplorerWindow(envState, "explorer-main", explorerBounds(), false);
  envState = addNoteEditorWindow(envState, "notes-task-log", "file-task-log", noteBoundsRight(), false, existingContent, false);
  envState = addBrowserWindow(envState, "browser-main", browserBounds(), true, false);
  envState.appStates.browserLite["browser-main"].selectedCategoryId = "chrome";
  envState.appStates.browserLite["browser-main"].selectedTaskId = "chrome_explorer_review";
  return {
    envState,
    targets: {
      targetFileId: "file-task-log",
      targetCategoryId: v.cat,
      targetBrowserTaskId: v.task,
      appendText: v.task,
      expectedSavedContent: existingContent + v.task
    }
  };
}

function buildBrowserLogInstructionUnfocusedDistractors(seed: number, viewport: Viewport) {
  const variants = [
    { cat: "workflow", task: "workflow_terminal_capture", label: "Workflow", instr: "Run a short terminal command and store its output in a text note." },
    { cat: "os", task: "os_popup_dismissal", label: "OS", instr: "Clear a modal popup before interacting with the desktop again." },
    { cat: "chrome", task: "chrome_explorer_review", label: "Chrome", instr: "Open the explorer board and inspect a browser-oriented task card." }
  ];
  const v = variants[Math.abs(seed) % variants.length];
  let envState = createEmptyEnv(
    viewport,
    `Focus Firefox, select the ${v.label} category and "${v.task}" task, write its instruction text into instruction-log.txt, and save.`
  );
  envState = addFiles(envState, [
    createFile("file-instr-log", "instruction-log.txt", ""),
    createFile("file-draft", "draft.txt", "Draft content"),
    createFile("file-notes", "notes.txt", "General notes"),
    createFile("file-reference", "reference.txt", "Reference material")
  ]);
  envState = addExplorerWindow(envState, "explorer-main", explorerBounds(), true);
  envState = addBrowserWindow(envState, "browser-main", browserBounds(), false, false);
  envState.appStates.browserLite["browser-main"].selectedCategoryId = "thunderbird";
  envState.appStates.browserLite["browser-main"].selectedTaskId = "thunderbird_mock_notes";
  return {
    envState,
    targets: {
      targetFileId: "file-instr-log",
      targetCategoryId: v.cat,
      targetBrowserTaskId: v.task,
      appendText: v.instr,
      expectedSavedContent: v.instr
    }
  };
}

function buildBrowserSelectAppendMinimizedDistractors(seed: number, viewport: Viewport) {
  const variants = [
    { cat: "chrome", task: "chrome_help_capture", label: "Chrome" },
    { cat: "workflow", task: "workflow_terminal_capture", label: "Workflow" },
    { cat: "thunderbird", task: "thunderbird_mock_notes", label: "Thunderbird" }
  ];
  const v = variants[Math.abs(seed) % variants.length];
  const existingContent = "Previous: os_restore_window\n";
  let envState = createEmptyEnv(
    viewport,
    `Restore Firefox from the dock, select the ${v.label} category and "${v.task}" task, append its task id to the open task-log.txt, and save.`
  );
  envState = addFiles(envState, [
    createFile("file-task-log", "task-log.txt", existingContent),
    createFile("file-draft", "draft.txt", "Draft content"),
    createFile("file-notes", "notes.txt", "General notes"),
    createFile("file-reference", "reference.txt", "Reference material")
  ]);
  envState = addExplorerWindow(envState, "explorer-main", explorerBounds(), true);
  envState = addNoteEditorWindow(envState, "notes-task-log", "file-task-log", noteBoundsRight(), false, existingContent, false);
  envState = addBrowserWindow(envState, "browser-main", browserBounds(), false, true);
  envState.appStates.browserLite["browser-main"].selectedCategoryId = "os";
  envState.appStates.browserLite["browser-main"].selectedTaskId = "os_restore_window";
  return {
    envState,
    targets: {
      targetFileId: "file-task-log",
      targetCategoryId: v.cat,
      targetBrowserTaskId: v.task,
      appendText: v.task,
      expectedSavedContent: existingContent + v.task
    }
  };
}

const NOTE_LOG_TASKS = [
  {
    id: "browser_log_task_preopen_note_hard",
    instruction: "In Firefox OSWorld Explorer, select the target task and append its id to the open browser-log.txt, then save.",
    domain: "Chrome",
    split: "representative",
    maxSteps: 80,
    seedDefaults: [0, 1, 2],
    setup: buildBrowserLogTaskPreopenNoteHard,
    goalPredicates: ["browser.task_selected", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.task_selected", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  },
  {
    id: "browser_log_task_instruction_text",
    instruction: "Select the target task in OSWorld Explorer and save its instruction text into a note.",
    domain: "Chrome",
    split: "representative",
    maxSteps: 64,
    seedDefaults: [0, 1, 2],
    setup: buildBrowserLogTaskInstructionText,
    goalPredicates: ["browser.task_selected", "note.target_opened", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.task_selected", "note.target_opened", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  },
  {
    id: "browser_log_task_title_text",
    instruction: "Select the target task in OSWorld Explorer and save its title into a note.",
    domain: "Chrome",
    split: "representative",
    maxSteps: 64,
    seedDefaults: [0, 1, 2],
    setup: buildBrowserLogTaskTitleText,
    goalPredicates: ["browser.task_selected", "note.target_opened", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.task_selected", "note.target_opened", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  },
  {
    id: "browser_select_log_minimized_preopen",
    instruction: "Restore Firefox, select the target task, and save its id into the open note.",
    domain: "Chrome",
    split: "representative",
    maxSteps: 64,
    seedDefaults: [0, 1, 2],
    setup: buildBrowserSelectLogMinimizedPreopen,
    goalPredicates: ["browser.task_selected", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.task_selected", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  },
  {
    id: "browser_log_task_append_existing",
    instruction: "Select the target task and append its id to a note that already has content, then save.",
    domain: "Chrome",
    split: "representative",
    maxSteps: 96,
    seedDefaults: [0, 1, 2],
    setup: buildBrowserLogTaskAppendExisting,
    goalPredicates: ["browser.task_selected", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.task_selected", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  },
  {
    id: "browser_log_instruction_unfocused_distractors",
    instruction: "Focus Firefox, select the target task, and save its instruction text into a note among distractors.",
    domain: "Chrome",
    split: "representative",
    maxSteps: 112,
    seedDefaults: [0, 1, 2],
    setup: buildBrowserLogInstructionUnfocusedDistractors,
    goalPredicates: ["browser.task_selected", "note.target_opened", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.task_selected", "note.target_opened", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  },
  {
    id: "browser_select_append_minimized_distractors",
    instruction: "Restore Firefox, select the target task, and append its id to a note with content among distractors.",
    domain: "Chrome",
    split: "representative",
    maxSteps: 112,
    seedDefaults: [0, 1, 2],
    setup: buildBrowserSelectAppendMinimizedDistractors,
    goalPredicates: ["browser.task_selected", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.task_selected", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  }
] satisfies Omit<TaskSpec, "summary">[];

const summaries: Record<string, TaskSummary> = {
  browser_log_task_preopen_note_hard: {
    family: "browser_extract_to_note",
    level: "C",
    apps: ["browser", "note", "files"],
    startState: "browser-log.txt is already open with existing content, Firefox is focused on Explorer, and three distractor files share the workspace.",
    objective: "Select the requested task card, append its id to the open browser-log.txt, and save the existing note.",
    implementationPath
  },
  browser_log_task_instruction_text: {
    family: "browser_extract_to_note",
    level: "C",
    apps: ["browser", "note"],
    startState: "Firefox is focused on Explorer with instruction-log.txt unopened and a non-target task currently selected.",
    objective: "Select the requested task card, capture its instruction text, write it into instruction-log.txt, and save.",
    implementationPath
  },
  browser_log_task_title_text: {
    family: "browser_extract_to_note",
    level: "C",
    apps: ["browser", "note"],
    startState: "Firefox is focused on Explorer with title-log.txt unopened and the wrong task currently selected.",
    objective: "Select the requested Explorer task, record its title in title-log.txt, and save.",
    implementationPath
  },
  browser_select_log_minimized_preopen: {
    family: "browser_extract_to_note",
    level: "C",
    apps: ["browser", "window", "note"],
    startState: "Firefox is minimized to the dock and task-log.txt is already open in a note editor window.",
    objective: "Restore Firefox, select the requested task, append its id into the open note, and save.",
    implementationPath
  },
  browser_log_task_append_existing: {
    family: "browser_extract_to_note",
    level: "C",
    apps: ["browser", "note", "files"],
    startState: "task-log.txt is already open with existing content while Firefox stays focused on Explorer.",
    objective: "Select the requested task card, append its id after the existing note content, and save.",
    implementationPath
  },
  browser_log_instruction_unfocused_distractors: {
    family: "browser_extract_to_note",
    level: "C",
    apps: ["browser", "window", "note", "files"],
    startState: "Firefox is unfocused, instruction-log.txt is unopened, and three distractor files are present.",
    objective: "Refocus Firefox, select the requested task, capture its instruction text, write it into instruction-log.txt, and save.",
    implementationPath
  },
  browser_select_append_minimized_distractors: {
    family: "browser_extract_to_note",
    level: "C",
    apps: ["browser", "window", "note", "files"],
    startState: "Firefox starts minimized and task-log.txt is already open with prior content plus three distractor files in the workspace.",
    objective: "Restore Firefox, select the requested task, append its id to the open note, and save.",
    implementationPath
  }
};

export const REPRESENTATIVE_BROWSER_NOTE_LOG_TASKS = withTaskSummaries(NOTE_LOG_TASKS, summaries);
