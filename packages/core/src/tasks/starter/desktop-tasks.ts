import { createPopup } from "../../system/popup-manager.js";
import { minimizeAllWindows } from "../../system/window-manager.js";
import type { TaskSpec, Viewport } from "../../types.js";
import { createScenarioFile, openExplorerWithFiles } from "../scenario-builders.js";
import {
  browserBounds,
  explorerBounds,
  mailBounds,
  noteBoundsCenter,
  noteBoundsLeft,
  noteBoundsRight,
  pickVariant,
  renameBrowserBounds,
  renameExplorerBounds,
  terminalBounds
} from "./shared.js";

const implementationPath = "packages/core/src/tasks/starter/desktop-tasks.ts";

function buildDismissPopupTask(seed: number, viewport: Viewport) {
  const appendText = pickVariant(seed, ["\n- bread", "\n- coffee", "\n- apples"]);
  let envState = openExplorerWithFiles({
    instruction: `Dismiss the popup, open todo.txt, append "${appendText.trim()}" to the end, and save.`,
    viewport,
    files: [createScenarioFile("file-todo", "todo.txt", "- milk", "/workspace")],
    explorerWindow: { windowId: "explorer-main", bounds: explorerBounds(), focused: false, minimized: false },
    browserWindow: { windowId: "browser-main", bounds: browserBounds(), focused: false, minimized: true },
    terminalWindow: { windowId: "terminal-main", bounds: terminalBounds(), focused: false, minimized: true },
    mailWindow: { windowId: "mail-main", bounds: mailBounds(), focused: false, minimized: true }
  });
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
  const envState = openExplorerWithFiles({
    instruction: "Rename draft.txt to final.txt in File Explorer.",
    viewport,
    files: [
      createScenarioFile("file-draft", "draft.txt", "Draft body", "/workspace"),
      createScenarioFile("file-reference", "reference.txt", "Reference body", "/workspace")
    ],
    explorerWindow: { windowId: "explorer-main", bounds: renameExplorerBounds(), focused: true, minimized: false },
    browserWindow: { windowId: "browser-main", bounds: renameBrowserBounds(), focused: false, minimized: true },
    terminalWindow: { windowId: "terminal-main", bounds: terminalBounds(), focused: false, minimized: true },
    mailWindow: { windowId: "mail-main", bounds: mailBounds(), focused: false, minimized: true }
  });
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
  const envState = openExplorerWithFiles({
    instruction: "Copy the first line from source.txt into the end of target.txt, then save target.txt.",
    viewport,
    files: [
      createScenarioFile("file-source", "source.txt", `${sourceLine}\nLine two`, "/workspace"),
      createScenarioFile("file-target", "target.txt", "Target body", "/workspace")
    ],
    noteWindows: [
      {
        fileId: "file-source",
        fileName: "source.txt",
        initialContent: `${sourceLine}\nLine two`,
        preopen: true,
        windowId: "notes-source",
        bounds: noteBoundsLeft(),
        focused: true,
        minimized: false
      },
      {
        fileId: "file-target",
        fileName: "target.txt",
        initialContent: "Target body",
        preopen: true,
        windowId: "notes-target",
        bounds: noteBoundsRight(),
        focused: false,
        minimized: false
      }
    ],
    browserWindow: { windowId: "browser-main", bounds: browserBounds(), focused: false, minimized: true },
    terminalWindow: { windowId: "terminal-main", bounds: terminalBounds(), focused: false, minimized: true },
    mailWindow: { windowId: "mail-main", bounds: mailBounds(), focused: false, minimized: true }
  });
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
  let envState = openExplorerWithFiles({
    instruction: "Restore the hidden note editor window and save the pending change.",
    viewport,
    files: [createScenarioFile("file-recover", "recover.txt", "Start content", "/workspace")],
    explorerWindow: { windowId: "explorer-main", bounds: explorerBounds(), focused: false, minimized: false },
    noteWindows: [
      {
        fileId: "file-recover",
        fileName: "recover.txt",
        initialContent: "Start content",
        buffer: `Start content${suffix}`,
        preopen: true,
        windowId: "notes-recover",
        bounds: noteBoundsCenter(),
        focused: true,
        minimized: false,
        dirty: true
      }
    ],
    browserWindow: { windowId: "browser-main", bounds: browserBounds(), focused: false, minimized: true },
    terminalWindow: { windowId: "terminal-main", bounds: terminalBounds(), focused: false, minimized: true },
    mailWindow: { windowId: "mail-main", bounds: mailBounds(), focused: false, minimized: true }
  });
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
      startState: "File Explorer is focused with draft.txt and a distractor file visible, while the companion apps stay minimized and out of the way.",
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
