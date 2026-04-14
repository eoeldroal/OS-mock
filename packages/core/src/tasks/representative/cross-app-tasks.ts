import type { TaskSpec, TaskSummary, Viewport } from "../../types.js";
import {
  createMailScenario,
  createNoteTargets,
  createScenarioFile,
  createTerminalScenario
} from "../scenario-builders.js";
import { withTaskSummaries } from "../with-task-summaries.js";
import { explorerBounds, mailAuditBounds, mailAuditExplorerBounds } from "./shared.js";

const implementationPath = "packages/core/src/tasks/representative/cross-app-tasks.ts";

function buildMailExtractTask(_seed: number, viewport: Viewport) {
  const reminderLine = "Remember to test perturbations while the viewer is open.";
  const mailScenario = createMailScenario({
    instruction:
      "In Thunderbird, open the Workspace notes message, record its reminder sentence in mail-log.txt, and save.",
    viewport,
    noteTarget: {
      fileId: "file-mail-log",
      fileName: "mail-log.txt",
      initialContent: ""
    },
    noteWindow: false,
    explorerWindow: {
      windowId: "explorer-main",
      bounds: mailAuditExplorerBounds(),
      focused: false,
      minimized: false
    },
    mailWindow: {
      windowId: "mail-main",
      bounds: mailAuditBounds(),
      focused: true,
      minimized: false
    },
    scenarioFiles: [
      createScenarioFile("file-reference", "reference.txt", "Mail review checklist", "/workspace")
    ],
    folders: [{ id: "inbox", name: "Inbox" }],
    messages: [
      {
        id: "msg-1",
        folderId: "inbox",
        sender: "updates@osmock.local",
        subject: "System update available",
        preview: "A new desktop build is ready for review.",
        body: ["A new desktop build is ready for review."]
      },
      {
        id: "msg-2",
        folderId: "inbox",
        sender: "ops@osmock.local",
        subject: "Workspace notes",
        preview: reminderLine,
        body: ["Workspace notes", "", reminderLine]
      }
    ]
  });
  return {
    envState: mailScenario.envState,
    targets: {
      ...createNoteTargets("file-mail-log", reminderLine),
      targetMessageId: "msg-2",
    }
  };
}

function buildTerminalRecordTask(_seed: number, viewport: Viewport) {
  const terminalScenario = createTerminalScenario({
    instruction: "In Terminal, run pwd, record the output in terminal-log.txt, and save.",
    viewport,
    cwd: "/workspace",
    noteTarget: {
      fileId: "file-terminal-log",
      fileName: "terminal-log.txt",
      initialContent: ""
    },
    noteWindow: false,
    explorerWindow: {
      windowId: "explorer-main",
      bounds: explorerBounds(),
      focused: false,
      minimized: false
    },
    scenarioFiles: [
      createScenarioFile("file-runbook", "runbook.txt", "pwd should resolve to /workspace", "/workspace")
    ]
  });
  return {
    envState: terminalScenario.envState,
    targets: {
      ...createNoteTargets("file-terminal-log", "/workspace"),
      targetCommand: "pwd",
      targetCommandOutput: "/workspace",
    }
  };
}

const CROSS_APP_TASKS = [
  {
    id: "mail_extract_mock_note",
    instruction: "Open the Workspace notes email, copy its reminder line into mail-log.txt, and save.",
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
    startState: "Thunderbird is the active app, File Explorer stays visible on the left, and mail-log.txt is available but not yet opened.",
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
