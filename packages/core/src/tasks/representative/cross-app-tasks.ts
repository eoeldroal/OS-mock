import {
  addExplorerWindow,
  addFiles,
  createEmptyEnv,
  createFile
} from "../../env/factory.js";
import type { TaskSpec, TaskSummary, Viewport } from "../../types.js";
import { withTaskSummaries } from "../with-task-summaries.js";
import { addRepresentativeUbuntuCompanionApps, explorerBounds } from "./shared.js";

const implementationPath = "packages/core/src/tasks/representative/cross-app-tasks.ts";

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
  envState = addRepresentativeUbuntuCompanionApps(envState, "mail");
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
  envState = addRepresentativeUbuntuCompanionApps(envState, "terminal");
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

const CROSS_APP_TASKS = [
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
] satisfies Omit<TaskSpec, "summary">[];

const summaries: Record<string, TaskSummary> = {
  mail_extract_mock_note: {
    family: "mail_extract_to_note",
    level: "C",
    apps: ["mail", "note"],
    startState: "Thunderbird is the active app, File Explorer is open beside it, and mail-log.txt is available but not yet opened.",
    objective: "Open the target email, capture its reminder sentence, write it into mail-log.txt, and save the note.",
    implementationPath
  },
  terminal_record_working_directory: {
    family: "terminal_record_to_note",
    level: "C",
    apps: ["terminal", "note"],
    startState: "Terminal is focused with File Explorer visible and terminal-log.txt waiting to receive the command output.",
    objective: "Run pwd, capture /workspace, record it into terminal-log.txt, and save the note.",
    implementationPath
  }
};

export const REPRESENTATIVE_CROSS_APP_TASKS = withTaskSummaries(CROSS_APP_TASKS, summaries);
