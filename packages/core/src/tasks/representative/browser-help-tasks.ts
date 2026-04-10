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

const implementationPath = "packages/core/src/tasks/representative/browser-help-tasks.ts";

function buildBrowserHelpCaptureTask(seed: number, viewport: Viewport) {
  const reminderLine = "Use the dock to switch between Files, Text Editor, Terminal, Firefox, and Thunderbird.";
  let envState = createEmptyEnv(
    viewport,
    "In Firefox, switch to Ubuntu help, copy the dock reminder line into ubuntu-help.txt, and save."
  );
  envState = addFiles(envState, [
    createFile("file-help-log", "ubuntu-help.txt", ""),
    createFile("file-todo", "todo.txt", "- review help page")
  ]);
  envState = addExplorerWindow(envState, "explorer-main", explorerBounds(), false);
  envState = addRepresentativeUbuntuCompanionApps(envState, "browser");
  return {
    envState,
    targets: {
      targetFileId: "file-help-log",
      appendText: reminderLine,
      expectedSavedContent: reminderLine
    }
  };
}

function buildBrowserHelpFromMinimized(seed: number, viewport: Viewport) {
  const helpLine = "Representative OSWorld-style tasks often span browser, mail, terminal, and file workflows.";
  let envState = createEmptyEnv(
    viewport,
    "Restore Firefox from the dock, switch to Ubuntu help, copy the workflow summary line into help-log.txt, and save."
  );
  envState = addFiles(envState, [
    createFile("file-help-log", "help-log.txt", ""),
    createFile("file-scratch", "scratch.txt", "Temporary notes")
  ]);
  envState = addExplorerWindow(envState, "explorer-main", explorerBounds(), true);
  envState = addBrowserWindow(envState, "browser-main", browserBounds(), false, true);
  return {
    envState,
    targets: {
      targetFileId: "file-help-log",
      appendText: helpLine,
      expectedSavedContent: helpLine
    }
  };
}

function buildBrowserHelpPreopenNoteDistractors(seed: number, viewport: Viewport) {
  const helpLine = "Use the dock to switch between Files, Text Editor, Terminal, Firefox, and Thunderbird.";
  let envState = createEmptyEnv(
    viewport,
    "In Firefox, switch to Ubuntu help, type the dock reminder line into help-notes.txt, and save."
  );
  envState = addFiles(envState, [
    createFile("file-help-notes", "help-notes.txt", ""),
    createFile("file-draft", "draft.txt", "Draft content"),
    createFile("file-reference", "reference.txt", "Reference material"),
    createFile("file-scratch", "scratch.txt", "Scratch pad")
  ]);
  envState = addExplorerWindow(envState, "explorer-main", explorerBounds(), false);
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

function buildBrowserHelpUnfocusedDistractors(seed: number, viewport: Viewport) {
  const helpLine = "Representative OSWorld-style tasks often span browser, mail, terminal, and file workflows.";
  let envState = createEmptyEnv(
    viewport,
    "Focus Firefox, switch to Ubuntu help, copy the workflow summary line into help-log.txt, and save."
  );
  envState = addFiles(envState, [
    createFile("file-help-log", "help-log.txt", ""),
    createFile("file-draft", "draft.txt", "Draft content"),
    createFile("file-notes", "notes.txt", "General notes"),
    createFile("file-reference", "reference.txt", "Reference material")
  ]);
  envState = addExplorerWindow(envState, "explorer-main", explorerBounds(), true);
  envState = addBrowserWindow(envState, "browser-main", browserBounds(), false, false);
  return {
    envState,
    targets: {
      targetFileId: "file-help-log",
      appendText: helpLine,
      expectedSavedContent: helpLine
    }
  };
}

function buildBrowserHelpLogUnfocusedPreopen(seed: number, viewport: Viewport) {
  const helpLine = "Use the dock to switch between Files, Text Editor, Terminal, Firefox, and Thunderbird.";
  let envState = createEmptyEnv(
    viewport,
    "Focus Firefox, switch to Ubuntu help, type the dock reminder line into the open help-notes.txt, and save."
  );
  envState = addFiles(envState, [
    createFile("file-help-notes", "help-notes.txt", ""),
    createFile("file-scratch", "scratch.txt", "Temporary notes")
  ]);
  envState = addExplorerWindow(envState, "explorer-main", explorerBounds(), true);
  envState = addNoteEditorWindow(envState, "notes-help", "file-help-notes", noteBoundsRight(), false);
  envState = addBrowserWindow(envState, "browser-main", browserBounds(), false, false);
  return {
    envState,
    targets: {
      targetFileId: "file-help-notes",
      appendText: helpLine,
      expectedSavedContent: helpLine
    }
  };
}

function buildBrowserHelpLogMinimizedPreopen(seed: number, viewport: Viewport) {
  const helpLine = "Use the dock to switch between Files, Text Editor, Terminal, Firefox, and Thunderbird.";
  let envState = createEmptyEnv(
    viewport,
    "Restore Firefox from the dock, switch to Ubuntu help, type the dock reminder line into the open help-notes.txt, and save."
  );
  envState = addFiles(envState, [
    createFile("file-help-notes", "help-notes.txt", ""),
    createFile("file-scratch", "scratch.txt", "Temporary notes")
  ]);
  envState = addExplorerWindow(envState, "explorer-main", explorerBounds(), false);
  envState = addNoteEditorWindow(envState, "notes-help", "file-help-notes", noteBoundsRight(), true);
  envState = addBrowserWindow(envState, "browser-main", browserBounds(), false, true);
  return {
    envState,
    targets: {
      targetFileId: "file-help-notes",
      appendText: helpLine,
      expectedSavedContent: helpLine
    }
  };
}

function buildBrowserHelpLogDockWithDistractors(seed: number, viewport: Viewport) {
  const helpLine = "Use the dock to switch between Files, Text Editor, Terminal, Firefox, and Thunderbird.";
  let envState = createEmptyEnv(
    viewport,
    "In Firefox, switch to Ubuntu help, write the dock reminder line into help-log.txt, and save."
  );
  envState = addFiles(envState, [
    createFile("file-help-log", "help-log.txt", ""),
    createFile("file-draft", "draft.txt", "Draft content"),
    createFile("file-reference", "reference.txt", "Reference material")
  ]);
  envState = addExplorerWindow(envState, "explorer-main", explorerBounds(), false);
  envState = addRepresentativeUbuntuCompanionApps(envState, "browser");
  return {
    envState,
    targets: {
      targetFileId: "file-help-log",
      appendText: helpLine,
      expectedSavedContent: helpLine
    }
  };
}

function buildBrowserHelpLogSummaryDistractors(seed: number, viewport: Viewport) {
  const summaryLine = "Representative OSWorld-style tasks often span browser, mail, terminal, and file workflows.";
  let envState = createEmptyEnv(
    viewport,
    "In Firefox, switch to Ubuntu help, write the workflow summary line into summary-log.txt, and save."
  );
  envState = addFiles(envState, [
    createFile("file-summary-log", "summary-log.txt", ""),
    createFile("file-draft", "draft.txt", "Draft content"),
    createFile("file-reference", "reference.txt", "Reference material")
  ]);
  envState = addExplorerWindow(envState, "explorer-main", explorerBounds(), false);
  envState = addRepresentativeUbuntuCompanionApps(envState, "browser");
  return {
    envState,
    targets: {
      targetFileId: "file-summary-log",
      appendText: summaryLine,
      expectedSavedContent: summaryLine
    }
  };
}

function buildBrowserHelpAppendExisting(seed: number, viewport: Viewport) {
  const helpLine = "Use the dock to switch between Files, Text Editor, Terminal, Firefox, and Thunderbird.";
  const existingContent = "Previous help note\n";
  let envState = createEmptyEnv(
    viewport,
    "In Firefox, switch to Ubuntu help, append the dock reminder line to the open help-notes.txt, and save."
  );
  envState = addFiles(envState, [
    createFile("file-help-notes", "help-notes.txt", existingContent),
    createFile("file-draft", "draft.txt", "Draft content"),
    createFile("file-reference", "reference.txt", "Reference material")
  ]);
  envState = addExplorerWindow(envState, "explorer-main", explorerBounds(), false);
  envState = addNoteEditorWindow(envState, "notes-help", "file-help-notes", noteBoundsRight(), false, existingContent, false);
  envState = addBrowserWindow(envState, "browser-main", browserBounds(), true, false);
  return {
    envState,
    targets: {
      targetFileId: "file-help-notes",
      appendText: helpLine,
      expectedSavedContent: existingContent + helpLine
    }
  };
}

function buildBrowserHelpMinimizedDistractors(seed: number, viewport: Viewport) {
  const summaryLine = "Representative OSWorld-style tasks often span browser, mail, terminal, and file workflows.";
  let envState = createEmptyEnv(
    viewport,
    "Restore Firefox from the dock, switch to Ubuntu help, write the workflow summary line into summary-log.txt, and save."
  );
  envState = addFiles(envState, [
    createFile("file-summary-log", "summary-log.txt", ""),
    createFile("file-draft", "draft.txt", "Draft content"),
    createFile("file-notes", "notes.txt", "General notes"),
    createFile("file-reference", "reference.txt", "Reference material")
  ]);
  envState = addExplorerWindow(envState, "explorer-main", explorerBounds(), true);
  envState = addBrowserWindow(envState, "browser-main", browserBounds(), false, true);
  return {
    envState,
    targets: {
      targetFileId: "file-summary-log",
      appendText: summaryLine,
      expectedSavedContent: summaryLine
    }
  };
}

function buildBrowserHelpAppendUnfocusedDistractors(seed: number, viewport: Viewport) {
  const summaryLine = "Representative OSWorld-style tasks often span browser, mail, terminal, and file workflows.";
  const existingContent = "Previous summary entry\n";
  let envState = createEmptyEnv(
    viewport,
    "Focus Firefox, switch to Ubuntu help, append the workflow summary line to the open summary-log.txt, and save."
  );
  envState = addFiles(envState, [
    createFile("file-summary-log", "summary-log.txt", existingContent),
    createFile("file-draft", "draft.txt", "Draft content"),
    createFile("file-notes", "notes.txt", "General notes"),
    createFile("file-reference", "reference.txt", "Reference material")
  ]);
  envState = addExplorerWindow(envState, "explorer-main", explorerBounds(), true);
  envState = addNoteEditorWindow(envState, "notes-summary", "file-summary-log", noteBoundsRight(), false, existingContent, false);
  envState = addBrowserWindow(envState, "browser-main", browserBounds(), false, false);
  return {
    envState,
    targets: {
      targetFileId: "file-summary-log",
      appendText: summaryLine,
      expectedSavedContent: existingContent + summaryLine
    }
  };
}

const HELP_TASKS = [
  {
    id: "browser_capture_help_line",
    instruction: "Switch Firefox to Ubuntu help, copy the dock reminder line into ubuntu-help.txt, and save.",
    domain: "Chrome",
    split: "representative",
    maxSteps: 128,
    seedDefaults: [0, 1, 2],
    setup: buildBrowserHelpCaptureTask,
    goalPredicates: ["browser.help_page_opened", "note.target_opened", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.help_page_opened", "note.target_opened", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  },
  {
    id: "browser_help_from_minimized",
    instruction: "Restore Firefox from the dock, switch to Ubuntu help, and save the workflow summary line into help-log.txt.",
    domain: "Chrome",
    split: "representative",
    maxSteps: 80,
    seedDefaults: [0, 1, 2],
    setup: buildBrowserHelpFromMinimized,
    goalPredicates: ["browser.help_page_opened", "note.target_opened", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.help_page_opened", "note.target_opened", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  },
  {
    id: "browser_help_preopen_note_distractors",
    instruction: "In Firefox, switch to Ubuntu help, type the dock reminder line into the open help-notes.txt, and save.",
    domain: "Chrome",
    split: "representative",
    maxSteps: 64,
    seedDefaults: [0, 1, 2],
    setup: buildBrowserHelpPreopenNoteDistractors,
    goalPredicates: ["browser.help_page_opened", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.help_page_opened", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  },
  {
    id: "browser_help_unfocused_distractors",
    instruction: "Focus Firefox, switch to Ubuntu help, and save the workflow summary line into help-log.txt.",
    domain: "Chrome",
    split: "representative",
    maxSteps: 96,
    seedDefaults: [0, 1, 2],
    setup: buildBrowserHelpUnfocusedDistractors,
    goalPredicates: ["browser.help_page_opened", "note.target_opened", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.help_page_opened", "note.target_opened", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  },
  {
    id: "browser_help_log_unfocused_preopen",
    instruction: "Focus Firefox, switch to help, and type the dock reminder into the open note, then save.",
    domain: "Chrome",
    split: "representative",
    maxSteps: 64,
    seedDefaults: [0, 1, 2],
    setup: buildBrowserHelpLogUnfocusedPreopen,
    goalPredicates: ["browser.help_page_opened", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.help_page_opened", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  },
  {
    id: "browser_help_log_minimized_preopen",
    instruction: "Restore Firefox, switch to help, and type the dock reminder into the open note, then save.",
    domain: "Chrome",
    split: "representative",
    maxSteps: 64,
    seedDefaults: [0, 1, 2],
    setup: buildBrowserHelpLogMinimizedPreopen,
    goalPredicates: ["browser.help_page_opened", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.help_page_opened", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  },
  {
    id: "browser_help_log_dock_with_distractors",
    instruction: "Switch to Ubuntu help and save the dock reminder into help-log.txt among distractor files.",
    domain: "Chrome",
    split: "representative",
    maxSteps: 80,
    seedDefaults: [0, 1, 2],
    setup: buildBrowserHelpLogDockWithDistractors,
    goalPredicates: ["browser.help_page_opened", "note.target_opened", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.help_page_opened", "note.target_opened", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  },
  {
    id: "browser_help_log_summary_distractors",
    instruction: "Switch to Ubuntu help and save the workflow summary into summary-log.txt among distractors.",
    domain: "Chrome",
    split: "representative",
    maxSteps: 80,
    seedDefaults: [0, 1, 2],
    setup: buildBrowserHelpLogSummaryDistractors,
    goalPredicates: ["browser.help_page_opened", "note.target_opened", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.help_page_opened", "note.target_opened", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  },
  {
    id: "browser_help_append_existing",
    instruction: "Switch to Ubuntu help and append the dock reminder to a note that already has content, then save.",
    domain: "Chrome",
    split: "representative",
    maxSteps: 96,
    seedDefaults: [0, 1, 2],
    setup: buildBrowserHelpAppendExisting,
    goalPredicates: ["browser.help_page_opened", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.help_page_opened", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  },
  {
    id: "browser_help_minimized_distractors",
    instruction: "Restore Firefox, switch to help, and save the workflow summary into a note among distractors.",
    domain: "Chrome",
    split: "representative",
    maxSteps: 96,
    seedDefaults: [0, 1, 2],
    setup: buildBrowserHelpMinimizedDistractors,
    goalPredicates: ["browser.help_page_opened", "note.target_opened", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.help_page_opened", "note.target_opened", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  },
  {
    id: "browser_help_append_unfocused_distractors",
    instruction: "Focus Firefox, switch to help, and append the summary line to a note with existing content.",
    domain: "Chrome",
    split: "representative",
    maxSteps: 112,
    seedDefaults: [0, 1, 2],
    setup: buildBrowserHelpAppendUnfocusedDistractors,
    goalPredicates: ["browser.help_page_opened", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.help_page_opened", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  }
] satisfies Omit<TaskSpec, "summary">[];

const summaries: Record<string, TaskSummary> = {
  browser_capture_help_line: {
    family: "browser_extract_to_note",
    level: "C",
    apps: ["browser", "note"],
    startState: "Firefox is focused on Explorer with ubuntu-help.txt unopened in File Explorer.",
    objective: "Switch to Ubuntu help, capture the dock reminder line, write it into ubuntu-help.txt, and save.",
    implementationPath
  },
  browser_help_from_minimized: {
    family: "browser_extract_to_note",
    level: "C",
    apps: ["browser", "window", "note"],
    startState: "Firefox starts minimized to the dock and help-log.txt is unopened in File Explorer.",
    objective: "Restore Firefox, switch to help, record the workflow summary line into help-log.txt, and save.",
    implementationPath
  },
  browser_help_preopen_note_distractors: {
    family: "browser_extract_to_note",
    level: "C",
    apps: ["browser", "note", "files"],
    startState: "help-notes.txt is already open while three distractor files remain visible beside Firefox.",
    objective: "Switch to Ubuntu help, write the dock reminder into the pre-opened help note, and save.",
    implementationPath
  },
  browser_help_unfocused_distractors: {
    family: "browser_extract_to_note",
    level: "C",
    apps: ["browser", "window", "note", "files"],
    startState: "Firefox is unfocused and multiple distractor files are present alongside help-log.txt.",
    objective: "Focus Firefox, switch to help, record the workflow summary into help-log.txt, and save.",
    implementationPath
  },
  browser_help_log_unfocused_preopen: {
    family: "browser_extract_to_note",
    level: "C",
    apps: ["browser", "window", "note"],
    startState: "Firefox is unfocused and help-notes.txt is already open in a note editor.",
    objective: "Refocus Firefox, switch to Ubuntu help, append the dock reminder into the open note, and save.",
    implementationPath
  },
  browser_help_log_minimized_preopen: {
    family: "browser_extract_to_note",
    level: "C",
    apps: ["browser", "window", "note"],
    startState: "Firefox is minimized while help-notes.txt is already open and waiting for text input.",
    objective: "Restore Firefox, switch to help, append the dock reminder into the open note, and save.",
    implementationPath
  },
  browser_help_log_dock_with_distractors: {
    family: "browser_extract_to_note",
    level: "C",
    apps: ["browser", "note", "files"],
    startState: "Firefox is focused on Explorer with help-log.txt unopened and two distractor files visible.",
    objective: "Switch to help, capture the dock reminder line, write it into help-log.txt, and save despite the distractors.",
    implementationPath
  },
  browser_help_log_summary_distractors: {
    family: "browser_extract_to_note",
    level: "C",
    apps: ["browser", "note", "files"],
    startState: "Firefox is focused on Explorer with summary-log.txt unopened and two distractor files visible.",
    objective: "Switch to help, capture the workflow summary line, write it into summary-log.txt, and save.",
    implementationPath
  },
  browser_help_append_existing: {
    family: "browser_extract_to_note",
    level: "C",
    apps: ["browser", "note", "files"],
    startState: "help-notes.txt is already open with prior content while Firefox remains focused on Explorer.",
    objective: "Switch to help, append the dock reminder line to the existing help note, and save.",
    implementationPath
  },
  browser_help_minimized_distractors: {
    family: "browser_extract_to_note",
    level: "C",
    apps: ["browser", "window", "note", "files"],
    startState: "Firefox is minimized and summary-log.txt sits among three distractor files.",
    objective: "Restore Firefox, open Ubuntu help, record the workflow summary into summary-log.txt, and save.",
    implementationPath
  },
  browser_help_append_unfocused_distractors: {
    family: "browser_extract_to_note",
    level: "C",
    apps: ["browser", "window", "note", "files"],
    startState: "Firefox is unfocused and summary-log.txt is already open with existing content plus three distractor files.",
    objective: "Focus Firefox, switch to help, append the workflow summary line into the open note, and save.",
    implementationPath
  }
};

export const REPRESENTATIVE_BROWSER_HELP_TASKS = withTaskSummaries(HELP_TASKS, summaries);
