import type { TaskSpec, Viewport } from "../../types.js";
import { createScenarioFile, openBrowserNoteScenario } from "../scenario-builders.js";
import {
  browserHelpBrowserBounds,
  browserHelpExplorerBounds,
  browserHelpNoteBounds
} from "./shared.js";

const implementationPath = "packages/core/src/tasks/representative/browser-help-tasks.ts";

function buildBrowserHelpPreopenNoteDistractors(seed: number, viewport: Viewport) {
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
      initialContent: "Previous summary entry\n",
      appendText: "Representative desktop-style tasks often span browser, mail, terminal, and file workflows."
    }
  ];
  const v = variants[Math.abs(seed) % variants.length];
  const envState = openBrowserNoteScenario({
    instruction: `In Firefox, switch to Ubuntu help, type the requested help line into the open ${v.fileName}, and save.`,
    viewport,
    start: { page: "explorer", categoryId: "workflow", taskId: "workflow_mail_bridge" },
    browserBounds: browserHelpBrowserBounds(),
    workspaceFiles: [
      createScenarioFile("file-draft", "draft.txt", "Draft content", "/workspace"),
      createScenarioFile("file-reference", "reference.txt", "Reference material", "/workspace")
    ],
    explorerWindow: {
      windowId: "explorer-main",
      bounds: browserHelpExplorerBounds(),
      focused: false,
      minimized: false
    },
    noteTarget: {
      fileId: v.fileId,
      fileName: v.fileName,
      initialContent: v.initialContent,
      preopen: true,
      windowId: "notes-help",
      bounds: browserHelpNoteBounds(),
      focused: false,
      minimized: false
    }
  }).envState;
  return {
    envState,
    targets: {
      targetFileId: v.fileId,
      appendText: v.appendText,
      expectedSavedContent: v.initialContent + v.appendText
    }
  };
}

export const REPRESENTATIVE_BROWSER_HELP_TASKS: TaskSpec[] = [
  {
    id: "browser_help_preopen_note_distractors",
    instruction: "In Firefox, switch to Ubuntu help, type the requested help line into the open note, and save.",
    domain: "Chrome",
    split: "representative",
    maxSteps: 64,
    seedDefaults: [0, 1, 2],
    summary: {
      family: "browser_extract_to_note",
      level: "C",
      apps: ["browser", "note", "files"],
      startState:
        "A help note is already visible in its own window beside Firefox, while distractor files remain visible in File Explorer; some seeds also begin with existing note content.",
      objective: "Switch to Ubuntu help, copy the requested help text into the pre-opened note, and save it without getting distracted by nearby files.",
      implementationPath
    },
    setup: buildBrowserHelpPreopenNoteDistractors,
    goalPredicates: ["browser.help_page_opened", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.help_page_opened", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  }
];
