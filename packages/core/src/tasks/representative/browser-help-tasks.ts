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
      appendText: "Representative OSWorld-style tasks often span browser, mail, terminal, and file workflows."
    }
  ];
  const v = variants[Math.abs(seed) % variants.length];

  let envState = createEmptyEnv(
    viewport,
    `In Firefox, switch to Ubuntu help, type the requested help line into the open ${v.fileName}, and save.`
  );
  envState = addFiles(envState, [
    createFile(v.fileId, v.fileName, v.initialContent),
    createFile("file-draft", "draft.txt", "Draft content"),
    createFile("file-reference", "reference.txt", "Reference material")
  ]);
  envState = addExplorerWindow(envState, "explorer-main", explorerBounds(), false);
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
      startState: "A help note is already open beside Firefox and distractor files are visible in File Explorer; some seeds also begin with existing note content.",
      objective: "Switch to Ubuntu help, copy the requested help text into the pre-opened note, and save it without getting distracted by nearby files.",
      implementationPath
    },
    setup: buildBrowserHelpPreopenNoteDistractors,
    goalPredicates: ["browser.help_page_opened", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.help_page_opened", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  }
];
