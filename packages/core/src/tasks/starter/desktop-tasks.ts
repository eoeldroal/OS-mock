import { createPopup } from "../../system/popup-manager.js";
import { minimizeAllWindows } from "../../system/window-manager.js";
import {
  addExplorerWindow,
  addFiles,
  addNoteEditorWindow,
  createEmptyEnv,
  createFile
} from "../../env/factory.js";
import type { TaskSpec, Viewport } from "../../types.js";
import {
  addStarterUbuntuCompanionApps,
  explorerBounds,
  noteBoundsCenter,
  noteBoundsLeft,
  noteBoundsRight,
  pickVariant
} from "./shared.js";

const implementationPath = "packages/core/src/tasks/starter/desktop-tasks.ts";

function buildDismissPopupTask(seed: number, viewport: Viewport) {
  const appendText = pickVariant(seed, ["\n- bread", "\n- coffee", "\n- apples"]);
  let envState = createEmptyEnv(
    viewport,
    `Dismiss the popup, open todo.txt, append "${appendText.trim()}" to the end, and save.`
  );
  envState = addFiles(envState, [createFile("file-todo", "todo.txt", "- milk")]);
  envState = addExplorerWindow(envState, "explorer-main", explorerBounds(), false);
  envState = addStarterUbuntuCompanionApps(envState, "minimized");
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
  envState = addStarterUbuntuCompanionApps(envState, "visible-browser");
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
  envState = addStarterUbuntuCompanionApps(envState, "minimized");
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
  envState = addStarterUbuntuCompanionApps(envState, "minimized");
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

export const STARTER_DESKTOP_TASKS: TaskSpec[] = [
  {
    id: "dismiss_popup_then_append_note",
    instruction: "Dismiss the popup, open todo.txt, append the requested line, and save.",
    domain: "OS",
    split: "starter",
    maxSteps: 30,
    seedDefaults: [0, 1, 2],
    summary: {
      family: "popup_note_save",
      level: "B",
      apps: ["popup", "files", "note"],
      startState: "A blocking popup is centered over the desktop, File Explorer is open with todo.txt available, and the companion apps are minimized.",
      objective: "Clear the modal block, open todo.txt, append the requested line, and save the note.",
      implementationPath
    },
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
    summary: {
      family: "files_rename",
      level: "A",
      apps: ["files"],
      startState: "File Explorer is focused with draft.txt and a distractor file visible, while browser, terminal, and mail remain in the workspace.",
      objective: "Rename the selected draft file inside File Explorer without leaving the file-management flow.",
      implementationPath
    },
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
    summary: {
      family: "note_copy_paste",
      level: "B",
      apps: ["note", "clipboard"],
      startState: "Two note-editor windows are already open side by side for source.txt and target.txt, with the source window focused.",
      objective: "Copy the first source line, append it to the target note, and save the edited target file.",
      implementationPath
    },
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
    summary: {
      family: "window_recover_save",
      level: "A",
      apps: ["window", "note"],
      startState: "All windows start minimized, including a dirty recover.txt editor with unsaved text already in its buffer.",
      objective: "Restore the hidden editor window from the dock or window stack and save the pending buffer.",
      implementationPath
    },
    setup: buildMinimizeRecoverTask,
    goalPredicates: ["window.note_restored", "note.saved"],
    progressPredicates: ["window.note_restored", "note.saved"],
    forbiddenPredicates: []
  }
];
