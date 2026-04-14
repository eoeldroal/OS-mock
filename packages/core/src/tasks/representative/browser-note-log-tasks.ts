import type { TaskSpec, Viewport } from "../../types.js";
import { createScenarioFile, openBrowserNoteScenario } from "../scenario-builders.js";
import { browserBounds, explorerBounds, noteBoundsRight } from "./shared.js";

const implementationPath = "packages/core/src/tasks/representative/browser-note-log-tasks.ts";

function buildBrowserLogTaskPreopenNoteHard(seed: number, viewport: Viewport) {
  const variants = [
    {
      cat: "chrome",
      task: "chrome_help_capture",
      label: "Chrome",
      initialContent: "Previous entry: workflow_mail_bridge\n",
      fileName: "browser-log.txt"
    },
    {
      cat: "os",
      task: "os_popup_dismissal",
      label: "OS",
      initialContent: "Previous entry: chrome_explorer_review\n",
      fileName: "task-log.txt"
    },
    {
      cat: "thunderbird",
      task: "thunderbird_task_pack",
      label: "Thunderbird",
      initialContent: "Previous entry: os_restore_window\n",
      fileName: "task-log.txt"
    }
  ];
  const v = variants[Math.abs(seed) % variants.length];
  const envState = openBrowserNoteScenario({
    instruction: `In Firefox Task Board, select the ${v.label} category and "${v.task}" task, append its task id to the open ${v.fileName}, and save.`,
    viewport,
    start: { page: "explorer", categoryId: "workflow", taskId: "workflow_mail_bridge" },
    browserBounds: browserBounds(),
    workspaceFiles: [
      createScenarioFile("file-notes", "notes.txt", "General notes", "/workspace"),
      createScenarioFile("file-draft", "draft.txt", "Draft content", "/workspace"),
      createScenarioFile("file-reference", "reference.txt", "Reference material", "/workspace")
    ],
    explorerWindow: {
      windowId: "explorer-main",
      bounds: explorerBounds(),
      focused: false,
      minimized: false
    },
    noteTarget: {
      fileId: "file-browser-log",
      fileName: v.fileName,
      initialContent: v.initialContent,
      preopen: true,
      windowId: "notes-browser-log",
      bounds: noteBoundsRight(),
      focused: false,
      minimized: false
    }
  }).envState;
  return {
    envState,
    targets: {
      targetFileId: "file-browser-log",
      targetCategoryId: v.cat,
      targetBrowserTaskId: v.task,
      appendText: v.task,
      expectedSavedContent: v.initialContent + v.task
    }
  };
}

export const REPRESENTATIVE_BROWSER_NOTE_LOG_TASKS: TaskSpec[] = [
  {
    id: "browser_log_task_preopen_note_hard",
    instruction: "In Firefox Task Board, select the target task and append its id to the open note, then save.",
    domain: "Chrome",
    split: "representative",
    maxSteps: 80,
    seedDefaults: [0, 1, 2],
    summary: {
      family: "browser_extract_to_note",
      level: "C",
      apps: ["browser", "note", "files"],
      startState: "The target log note is already open with existing content, and distractor files remain visible beside Firefox.",
      objective: "Select the requested Explorer task, append its task id after the existing log entry, and save the updated note.",
      implementationPath
    },
    setup: buildBrowserLogTaskPreopenNoteHard,
    goalPredicates: ["browser.task_selected", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.task_selected", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  }
];
