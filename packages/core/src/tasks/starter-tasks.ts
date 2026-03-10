import { createPopup } from "../system/popup-manager.js";
import type { TaskSpec, Viewport } from "../types.js";
import {
  addBrowserWindow,
  addExplorerWindow,
  addFiles,
  addMailWindow,
  addNoteEditorWindow,
  addTerminalWindow,
  createEmptyEnv,
  createFile
} from "../env/factory.js";
import { minimizeAllWindows } from "../system/window-manager.js";

function pickVariant(seed: number, values: string[]) {
  return values[Math.abs(seed) % values.length];
}

function explorerBounds() {
  return { x: 92, y: 84, width: 340, height: 430 };
}

function noteBoundsLeft() {
  return { x: 432, y: 84, width: 390, height: 470 };
}

function noteBoundsRight() {
  return { x: 842, y: 84, width: 390, height: 470 };
}

function noteBoundsCenter() {
  return { x: 452, y: 108, width: 460, height: 500 };
}

function browserBounds() {
  return { x: 458, y: 84, width: 520, height: 360 };
}

function terminalBounds() {
  return { x: 458, y: 462, width: 520, height: 250 };
}

function mailBounds() {
  return { x: 992, y: 84, width: 240, height: 420 };
}

function addUbuntuCompanionApps(envState: ReturnType<typeof createEmptyEnv>, mode: "visible-browser" | "minimized") {
  let next = envState;
  if (mode === "visible-browser") {
    next = addBrowserWindow(next, "browser-main", browserBounds(), false, false);
    next = addTerminalWindow(next, "terminal-main", terminalBounds(), false, true);
    next = addMailWindow(next, "mail-main", mailBounds(), false, true);
    return next;
  }
  next = addBrowserWindow(next, "browser-main", browserBounds(), false, true);
  next = addTerminalWindow(next, "terminal-main", terminalBounds(), false, true);
  next = addMailWindow(next, "mail-main", mailBounds(), false, true);
  return next;
}

function buildDismissPopupTask(seed: number, viewport: Viewport) {
  const appendText = pickVariant(seed, ["\n- bread", "\n- coffee", "\n- apples"]);
  let envState = createEmptyEnv(
    viewport,
    `Dismiss the popup, open todo.txt, append "${appendText.trim()}" to the end, and save.`
  );
  envState = addFiles(envState, [createFile("file-todo", "todo.txt", "- milk")]);
  envState = addExplorerWindow(envState, "explorer-main", explorerBounds(), false);
  envState = addUbuntuCompanionApps(envState, "minimized");
  envState.popups.push(
    createPopup("popup-1", "Welcome back", "Close this popup before continuing with your task.")
  );
  return {
    envState,
    targets: {
      popupId: "popup-1",
      targetFileId: "file-todo",
      noteWindowId: "notes-todo",
      appendText,
      expectedSavedContent: `- milk${appendText}`
    }
  };
}

function buildRenameTask(seed: number, viewport: Viewport) {
  let envState = createEmptyEnv(viewport, "Rename draft.txt to final.txt in File Explorer.");
  envState = addFiles(envState, [
    createFile("file-draft", "draft.txt", "Draft body"),
    createFile("file-reference", "reference.txt", "Reference body")
  ]);
  envState = addExplorerWindow(envState, "explorer-main", explorerBounds(), true);
  envState = addUbuntuCompanionApps(envState, "visible-browser");
  return {
    envState,
    targets: {
      targetFileId: "file-draft",
      oldName: "draft.txt",
      newName: "final.txt"
    }
  };
}

function buildCopyTask(seed: number, viewport: Viewport) {
  const sourceLine = pickVariant(seed, ["Alpha plan", "Bravo plan", "Charlie plan"]);
  let envState = createEmptyEnv(
    viewport,
    "Copy the first line from source.txt into the end of target.txt, then save target.txt."
  );
  envState = addFiles(envState, [
    createFile("file-source", "source.txt", `${sourceLine}\nLine two`),
    createFile("file-target", "target.txt", "Target body")
  ]);
  envState = addNoteEditorWindow(envState, "notes-source", "file-source", noteBoundsLeft(), true);
  envState = addNoteEditorWindow(envState, "notes-target", "file-target", noteBoundsRight(), false);
  envState = addUbuntuCompanionApps(envState, "minimized");
  return {
    envState,
    targets: {
      sourceFileId: "file-source",
      sourceLine,
      targetFileId: "file-target",
      expectedSavedContent: `Target body${sourceLine}`
    }
  };
}

function buildMinimizeRecoverTask(seed: number, viewport: Viewport) {
  const suffix = pickVariant(seed, ["\nSaved from minimized state", "\nRecovered via taskbar"]);
  let envState = createEmptyEnv(viewport, "Restore the hidden note editor window and save the pending change.");
  envState = addFiles(envState, [createFile("file-recover", "recover.txt", "Start content")]);
  envState = addExplorerWindow(envState, "explorer-main", explorerBounds(), false);
  envState = addNoteEditorWindow(
    envState,
    "notes-recover",
    "file-recover",
    noteBoundsCenter(),
    true,
    `Start content${suffix}`,
    true
  );
  envState = addUbuntuCompanionApps(envState, "minimized");
  envState = minimizeAllWindows(envState);
  return {
    envState,
    targets: {
      targetFileId: "file-recover",
      noteWindowId: "notes-recover",
      expectedSavedContent: `Start content${suffix}`
    }
  };
}

export const STARTER_TASKS: TaskSpec[] = [
  {
    id: "dismiss_popup_then_append_note",
    instruction: "Dismiss the popup, open todo.txt, append the requested line, and save.",
    domain: "OS",
    split: "starter",
    maxSteps: 30,
    seedDefaults: [0, 1, 2],
    setup: buildDismissPopupTask,
    goalPredicates: ["popup.dismissed", "note.todo_opened", "note.target_appended", "note.saved"],
    progressPredicates: ["popup.dismissed", "note.todo_opened", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  },
  {
    id: "rename_note_in_explorer",
    instruction: "Rename draft.txt to final.txt in File Explorer.",
    domain: "Files",
    split: "starter",
    maxSteps: 20,
    seedDefaults: [0, 1, 2],
    setup: buildRenameTask,
    goalPredicates: ["file.renamed"],
    progressPredicates: ["file.renamed"],
    forbiddenPredicates: []
  },
  {
    id: "copy_line_between_windows",
    instruction: "Copy the first line from source.txt into the end of target.txt, then save target.txt.",
    domain: "Workflow",
    split: "starter",
    maxSteps: 30,
    seedDefaults: [0, 1, 2],
    setup: buildCopyTask,
    goalPredicates: ["clipboard.source_line_copied", "note.target_pasted", "note.saved"],
    progressPredicates: ["clipboard.source_line_copied", "note.target_pasted", "note.saved"],
    forbiddenPredicates: []
  },
  {
    id: "minimize_recover_and_save",
    instruction: "Restore the hidden note editor window and save the pending change.",
    domain: "OS",
    split: "starter",
    maxSteps: 20,
    seedDefaults: [0, 1, 2],
    setup: buildMinimizeRecoverTask,
    goalPredicates: ["window.note_restored", "note.saved"],
    progressPredicates: ["window.note_restored", "note.saved"],
    forbiddenPredicates: []
  }
];
