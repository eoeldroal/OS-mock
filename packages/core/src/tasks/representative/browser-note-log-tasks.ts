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

  let envState = createEmptyEnv(
    viewport,
    `In Firefox OSWorld Explorer, select the ${v.label} category and "${v.task}" task, append its task id to the open ${v.fileName}, and save.`
  );
  envState = addFiles(envState, [
    createFile("file-browser-log", v.fileName, v.initialContent),
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
    v.initialContent,
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
      expectedSavedContent: v.initialContent + v.task
    }
  };
}

export const REPRESENTATIVE_BROWSER_NOTE_LOG_TASKS: TaskSpec[] = [
  {
    id: "browser_log_task_preopen_note_hard",
    instruction: "In Firefox OSWorld Explorer, select the target task and append its id to the open note, then save.",
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
