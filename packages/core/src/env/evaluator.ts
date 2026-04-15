import type { EnvState, PredicateId, TaskSpec } from "../types.js";
import { getFileEntry, getOrderedFiles } from "../system/filesystem.js";

function findNoteWindowsForFile(state: EnvState, fileId: string) {
  return Object.values(state.appStates.noteEditor).filter((note) => note.fileId === fileId);
}

function evaluatePredicate(
  predicate: PredicateId,
  state: EnvState,
  task: TaskSpec,
  targets: Record<string, string>
) {
  let orderedFiles: ReturnType<typeof getOrderedFiles> | undefined;
  const getOrderedTreeFiles = () => {
    orderedFiles ??= getOrderedFiles(state.fileSystem);
    return orderedFiles;
  };
  const hasNamedFile = (name: string) => getOrderedTreeFiles().some((file) => file.name === name);

  switch (predicate) {
    case "note.target_opened":
      return findNoteWindowsForFile(state, targets.targetFileId).length > 0;
    case "popup.dismissed":
      return state.popups.length === 0;
    case "note.todo_opened":
      return findNoteWindowsForFile(state, targets.targetFileId).length > 0;
    case "note.target_appended":
      return findNoteWindowsForFile(state, targets.targetFileId).some((note) =>
        note.buffer.endsWith(targets.appendText)
      );
    case "note.saved": {
      const file = getFileEntry(state.fileSystem, targets.targetFileId);
      const notes = findNoteWindowsForFile(state, targets.targetFileId);
      return (
        file?.content === targets.expectedSavedContent &&
        notes.every((note) => note.dirty === false && note.buffer === targets.expectedSavedContent)
      );
    }
    case "file.renamed":
      return (
        hasNamedFile(targets.newName) &&
        !hasNamedFile(targets.oldName)
      );
    case "clipboard.source_line_copied":
      return state.clipboard.text === targets.sourceLine;
    case "note.target_pasted":
      return findNoteWindowsForFile(state, targets.targetFileId).some((note) =>
        note.buffer.endsWith(targets.sourceLine)
      );
    case "window.note_restored": {
      const noteWindow = state.windows.find((window) => window.id === targets.noteWindowId);
      return Boolean(noteWindow && !noteWindow.minimized && noteWindow.focused);
    }
    case "browser.task_selected":
      return Object.values(state.appStates.browserLite).some(
        (browser) =>
          browser.currentPage === "explorer" &&
          browser.selectedCategoryId === targets.targetCategoryId &&
          browser.selectedTaskId === targets.targetBrowserTaskId
      );
    case "browser.category_selected":
      return Object.values(state.appStates.browserLite).some(
        (browser) =>
          browser.currentPage === "explorer" && browser.selectedCategoryId === targets.targetCategoryId
      );
    case "browser.bookmark_opened":
      return Object.values(state.appStates.browserLite).some(
        (browser) =>
          browser.lastOpenedBookmarkId === targets.targetBookmarkId &&
          (!targets.targetPage || browser.currentPage === targets.targetPage)
      );
    case "browser.osworld_opened":
      return Object.values(state.appStates.browserLite).some((browser) =>
        browser.currentPage === "explorer" || browser.url.includes("os-world.github.io/explorer.html")
      );
    case "browser.help_page_opened":
      return Object.values(state.appStates.browserLite).some((browser) => browser.currentPage === "help");
    case "browser.help_topic_opened":
      return Object.values(state.appStates.browserLite).some(
        (browser) =>
          browser.currentPage === "help" && browser.selectedHelpTopicId === targets.targetHelpTopicId
      );
    case "browser.url_matches":
      return Object.values(state.appStates.browserLite).some((browser) =>
        browser.currentPage === "external" && browser.url.includes(targets.targetBrowserUrlFragment)
      );
    case "mail.message_opened":
      return Object.values(state.appStates.mailLite).some(
        (mail) => mail.selectedMessageId === targets.targetMessageId
      );
    case "terminal.command_ran":
      return Object.values(state.appStates.terminalLite).some(
        (terminal) =>
          terminal.lastCommand === targets.targetCommand && terminal.lastOutput === targets.targetCommandOutput
      );
    case "file.deleted":
      return !hasNamedFile(targets.deletedFileName);
    case "file.created":
      return hasNamedFile(targets.createdFileName);
    case "terminal.multi_commands_ran": {
      const requiredCommands = targets.requiredCommands?.split(",") ?? [];
      return Object.values(state.appStates.terminalLite).some(
        (terminal) => requiredCommands.every((cmd) => terminal.executedCommands.includes(cmd.trim()))
      );
    }
    case "window.resized": {
      const targetWin = state.windows.find(w => w.id === targets.targetWindowId);
      if (!targetWin) return false;
      const minW = Number(targets.minWidth ?? 0);
      const minH = Number(targets.minHeight ?? 0);
      return targetWin.bounds.width >= minW && targetWin.bounds.height >= minH;
    }
    case "context_menu.action_executed":
      // Check that the expected side-effect occurred (e.g., file deleted, terminal cleared)
      // This is verified by checking the resulting state rather than the action itself
      if (targets.contextMenuEffect === "file_deleted") {
        return !hasNamedFile(targets.deletedFileName);
      }
      if (targets.contextMenuEffect === "terminal_cleared") {
        return Object.values(state.appStates.terminalLite).some(t => t.lines.length <= 2);
      }
      return false;
    case "terminal.history_used":
      return Object.values(state.appStates.terminalLite).some(
        t => t.input === targets.expectedHistoryCommand
      );
    case "note.undo_performed":
      return findNoteWindowsForFile(state, targets.targetFileId).some(
        note => note.buffer === targets.expectedBufferAfterUndo
      );
    default:
      return false;
  }
}

export function evaluateTaskState(
  state: EnvState,
  task: TaskSpec,
  targets: Record<string, string>,
  achievedProgress: string[]
) {
  const progress = task.progressPredicates
    .filter((predicate) => evaluatePredicate(predicate, state, task, targets))
    .filter((predicate) => !achievedProgress.includes(predicate));

  const violations = task.forbiddenPredicates.filter((predicate) =>
    evaluatePredicate(predicate, state, task, targets)
  );

  const goalSatisfied = task.goalPredicates.every((predicate) =>
    evaluatePredicate(predicate, state, task, targets)
  );

  return {
    progress,
    violations,
    goalSatisfied
  };
}
