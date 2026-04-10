import type { EnvState, PredicateId, TaskSpec } from "../types.js";

function findNoteWindowsForFile(state: EnvState, fileId: string) {
  return Object.values(state.appStates.noteEditor).filter((note) => note.fileId === fileId);
}

function evaluatePredicate(
  predicate: PredicateId,
  state: EnvState,
  task: TaskSpec,
  targets: Record<string, string>
) {
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
      const file = state.fileSystem.files[targets.targetFileId];
      const notes = findNoteWindowsForFile(state, targets.targetFileId);
      return (
        file?.content === targets.expectedSavedContent &&
        notes.every((note) => note.dirty === false && note.buffer === targets.expectedSavedContent)
      );
    }
    case "file.renamed":
      return (
        Object.values(state.fileSystem.files).some((file) => file.name === targets.newName) &&
        !Object.values(state.fileSystem.files).some((file) => file.name === targets.oldName)
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
    case "browser.help_page_opened":
      return Object.values(state.appStates.browserLite).some((browser) => browser.currentPage === "help");
    case "browser.help_topic_opened":
      return Object.values(state.appStates.browserLite).some(
        (browser) =>
          browser.currentPage === "help" && browser.selectedHelpTopicId === targets.targetHelpTopicId
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
