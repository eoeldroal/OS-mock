import type { TaskSpec, Viewport } from "../types.js";
import {
  addBrowserWindow,
  addExplorerWindow,
  addFiles,
  addMailWindow,
  addTerminalWindow,
  createEmptyEnv,
  createFile
} from "../env/factory.js";

function explorerBounds() {
  return { x: 92, y: 84, width: 340, height: 430 };
}

function browserBounds() {
  return { x: 438, y: 84, width: 640, height: 380 };
}

function terminalBounds() {
  return { x: 438, y: 482, width: 540, height: 250 };
}

function mailBounds() {
  return { x: 952, y: 84, width: 280, height: 420 };
}

function addUbuntuCompanionApps(envState: ReturnType<typeof createEmptyEnv>, mode: "browser" | "mail" | "terminal") {
  let next = envState;
  next = addBrowserWindow(next, "browser-main", browserBounds(), mode === "browser", mode !== "browser");
  next = addTerminalWindow(next, "terminal-main", terminalBounds(), mode === "terminal", mode !== "terminal");
  next = addMailWindow(next, "mail-main", mailBounds(), mode === "mail", mode !== "mail");
  return next;
}

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
  envState = addUbuntuCompanionApps(envState, "browser");
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
  envState = addUbuntuCompanionApps(envState, "browser");
  return {
    envState,
    targets: {
      targetFileId: "file-help-log",
      appendText: reminderLine,
      expectedSavedContent: reminderLine
    }
  };
}

function buildMailExtractTask(seed: number, viewport: Viewport) {
  const reminderLine = "Remember to test perturbations while the viewer is open.";
  let envState = createEmptyEnv(
    viewport,
    "In Thunderbird, open the Mock environment notes message, record its reminder sentence in mail-log.txt, and save."
  );
  envState = addFiles(envState, [
    createFile("file-mail-log", "mail-log.txt", ""),
    createFile("file-reference", "reference.txt", "Mail review checklist")
  ]);
  envState = addExplorerWindow(envState, "explorer-main", explorerBounds(), false);
  envState = addUbuntuCompanionApps(envState, "mail");
  return {
    envState,
    targets: {
      targetFileId: "file-mail-log",
      targetMessageId: "msg-2",
      appendText: reminderLine,
      expectedSavedContent: reminderLine
    }
  };
}

function buildTerminalRecordTask(seed: number, viewport: Viewport) {
  let envState = createEmptyEnv(
    viewport,
    "In Terminal, run pwd, record the output in terminal-log.txt, and save."
  );
  envState = addFiles(envState, [
    createFile("file-terminal-log", "terminal-log.txt", ""),
    createFile("file-runbook", "runbook.txt", "pwd should resolve to /workspace")
  ]);
  envState = addExplorerWindow(envState, "explorer-main", explorerBounds(), false);
  envState = addUbuntuCompanionApps(envState, "terminal");
  return {
    envState,
    targets: {
      targetFileId: "file-terminal-log",
      targetCommand: "pwd",
      targetCommandOutput: "/workspace",
      appendText: "/workspace",
      expectedSavedContent: "/workspace"
    }
  };
}

export const REPRESENTATIVE_TASKS: TaskSpec[] = [
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
    id: "mail_extract_mock_note",
    instruction: "Open the Mock environment notes email, copy its reminder line into mail-log.txt, and save.",
    domain: "Thunderbird",
    split: "representative",
    maxSteps: 96,
    seedDefaults: [0, 1, 2],
    setup: buildMailExtractTask,
    goalPredicates: ["mail.message_opened", "note.target_opened", "note.target_appended", "note.saved"],
    progressPredicates: ["mail.message_opened", "note.target_opened", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  },
  {
    id: "terminal_record_working_directory",
    instruction: "Run pwd in Terminal, copy the output into terminal-log.txt, and save.",
    domain: "OS",
    split: "representative",
    maxSteps: 64,
    seedDefaults: [0, 1, 2],
    setup: buildTerminalRecordTask,
    goalPredicates: ["terminal.command_ran", "note.target_opened", "note.target_appended", "note.saved"],
    progressPredicates: ["terminal.command_ran", "note.target_opened", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  }
];
