import { getFileExplorerLayout } from "../apps/file-explorer.js";
import { getBrowserLiteLayout } from "../apps/browser-lite.js";
import { getMailLiteLayout, getVisibleMailMessages } from "../apps/mail-lite.js";
import {
  getLineStartOffsets,
  getLines,
  getNoteEditorLayout,
  NOTE_CHAR_WIDTH,
  NOTE_LINE_HEIGHT
} from "../apps/note-editor.js";
import { getTerminalLiteLayout } from "../apps/terminal-lite.js";
import type {
  BrowserLiteState,
  Computer13Action,
  EnvState,
  FileExplorerState,
  MailLiteState,
  NoteEditorState,
  Point,
  Rect,
  TerminalLiteState,
  WindowInstance
} from "../types.js";
import { addNoteEditorWindow, launchAppWindow } from "./factory.js";
import { renameFile, updateFileContent } from "../system/filesystem.js";
import { pointInRect, clipPoint } from "../system/pointer.js";
import {
  closeWindow,
  focusWindow,
  getFocusedWindowId,
  getPopupBounds,
  getTaskbarItems,
  getTopmostWindowAtPoint,
  getWindowFrameControls,
  minimizeWindow,
  restoreWindow,
  toggleMaximizeWindow
} from "../system/window-manager.js";
import { setClipboardText } from "../system/clipboard.js";

export type ReduceResult = {
  envState: EnvState;
  actionAccepted: boolean;
  focusChanged: boolean;
};

function deepEqualEnv(left: EnvState, right: EnvState) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function popupButtonBounds(state: EnvState): Rect {
  const bounds = getPopupBounds(state.viewport);
  return {
    x: bounds.x + bounds.width - 120,
    y: bounds.y + bounds.height - 52,
    width: 96,
    height: 32
  };
}

function syncWindowTitles(state: EnvState): EnvState {
  const next = structuredClone(state);
  next.windows = next.windows.map((window) => {
    if (window.appId !== "note-editor") {
      return window;
    }
    const note = next.appStates.noteEditor[window.id];
    const file = next.fileSystem.files[note.fileId];
    return {
      ...window,
      title: file?.name ?? window.title
    };
  });
  return next;
}

function openOrFocusNoteEditor(state: EnvState, fileId: string, preferredId?: string): EnvState {
  const existingWindow = state.windows.find((window) => {
    if (window.appId !== "note-editor") {
      return false;
    }
    const note = state.appStates.noteEditor[window.id];
    return note?.fileId === fileId;
  });

  if (existingWindow) {
    return restoreWindow(state, existingWindow.id);
  }

  const nextId = preferredId ?? `notes-${fileId}`;
  const noteCount = state.windows.filter((window) => window.appId === "note-editor").length;
  const bounds =
    noteCount === 0
      ? { x: 420, y: 84, width: 390, height: 470 }
      : { x: 830, y: 84, width: 390, height: 470 };

  return addNoteEditorWindow(state, nextId, fileId, bounds, true);
}

function handlePopupClick(state: EnvState, point: Point) {
  if (state.popups.length === 0) {
    return { envState: state, accepted: false };
  }
  const buttonBounds = popupButtonBounds(state);
  if (!pointInRect(point, buttonBounds)) {
    return { envState: state, accepted: false };
  }
  const next = structuredClone(state);
  next.popups.pop();
  const fallback = next.windows
    .filter((window) => !window.minimized)
    .sort((left, right) => right.zIndex - left.zIndex)[0];
  next.windows = next.windows.map((window) => ({
    ...window,
    focused: window.id === fallback?.id
  }));
  return { envState: next, accepted: true };
}

function handleWindowFrameClick(state: EnvState, windowId: string, point: Point, isDoubleClick: boolean) {
  const window = state.windows.find((item) => item.id === windowId);
  if (!window) {
    return { envState: state, accepted: false, handled: false };
  }

  const controls = getWindowFrameControls(window.bounds);
  if (pointInRect(point, controls.closeButtonBounds)) {
    return {
      envState: closeWindow(state, windowId),
      accepted: true,
      handled: true
    };
  }

  if (pointInRect(point, controls.minimizeButtonBounds)) {
    return {
      envState: minimizeWindow(state, windowId),
      accepted: true,
      handled: true
    };
  }

  if (pointInRect(point, controls.maximizeButtonBounds)) {
    return {
      envState: toggleMaximizeWindow(state, windowId),
      accepted: true,
      handled: true
    };
  }

  if (pointInRect(point, controls.titleBarBounds)) {
    return {
      envState: isDoubleClick ? toggleMaximizeWindow(state, windowId) : focusWindow(state, windowId),
      accepted: true,
      handled: true
    };
  }

  return { envState: state, accepted: false, handled: false };
}

function handleTaskbarActivation(state: EnvState, windowId: string, appId: string) {
  const existingWindow = state.windows
    .filter((window) => window.id === windowId || window.appId === appId)
    .sort((left, right) => right.zIndex - left.zIndex)[0];

  if (existingWindow) {
    return restoreWindow(state, existingWindow.id);
  }

  return launchAppWindow(state, appId);
}

function handleFileExplorerClick(
  state: EnvState,
  window: WindowInstance,
  explorer: FileExplorerState,
  point: Point,
  isDoubleClick: boolean
) {
  const files = state.fileSystem.order.map((id) => state.fileSystem.files[id]).filter(Boolean);
  const layout = getFileExplorerLayout(window.bounds, files.length);
  const clickedIndex = layout.rows.findIndex((row) => pointInRect(point, row));
  if (clickedIndex === -1) {
    return { envState: state, accepted: false };
  }

  const next = structuredClone(state);
  const nextExplorer = next.appStates.fileExplorer[window.id];
  const file = files[clickedIndex];
  nextExplorer.selectedFileId = file.id;
  if (isDoubleClick) {
    return {
      envState: openOrFocusNoteEditor(next, file.id, file.id === "file-todo" ? "notes-todo" : undefined),
      accepted: true
    };
  }
  return { envState: next, accepted: true };
}

function getCursorFromPoint(buffer: string, editorBounds: Rect, point: Point) {
  const lines = getLines(buffer);
  const lineOffsets = getLineStartOffsets(buffer);
  const clampedLine = Math.max(
    0,
    Math.min(lines.length - 1, Math.floor((point.y - editorBounds.y) / NOTE_LINE_HEIGHT))
  );
  const line = lines[clampedLine] ?? "";
  const rawColumn = Math.floor((point.x - editorBounds.x) / NOTE_CHAR_WIDTH);
  const clampedColumn = Math.max(0, Math.min(line.length, rawColumn));
  return {
    selectedLineIndex: clampedLine,
    cursorIndex: lineOffsets[clampedLine] + clampedColumn
  };
}

function saveNote(state: EnvState, noteWindowId: string) {
  const next = structuredClone(state);
  const note = next.appStates.noteEditor[noteWindowId];
  next.fileSystem = updateFileContent(next.fileSystem, note.fileId, note.buffer);
  note.dirty = false;
  return next;
}

function insertText(buffer: string, cursorIndex: number, text: string) {
  return {
    buffer: `${buffer.slice(0, cursorIndex)}${text}${buffer.slice(cursorIndex)}`,
    cursorIndex: cursorIndex + text.length
  };
}

function handleNoteEditorClick(state: EnvState, window: WindowInstance, note: NoteEditorState, point: Point) {
  const layout = getNoteEditorLayout(window.bounds);
  if (pointInRect(point, layout.saveButtonBounds)) {
    return { envState: saveNote(state, window.id), accepted: true };
  }

  if (!pointInRect(point, layout.editorBounds)) {
    return { envState: state, accepted: false };
  }

  const next = structuredClone(state);
  const nextNote = next.appStates.noteEditor[window.id];
  const cursor = getCursorFromPoint(nextNote.buffer, layout.editorBounds, point);
  nextNote.cursorIndex = cursor.cursorIndex;
  nextNote.selectedLineIndex = cursor.selectedLineIndex;
  return { envState: next, accepted: true };
}

function setBrowserPage(browser: BrowserLiteState, page: "explorer" | "help") {
  browser.currentPage = page;
  browser.tabs = browser.tabs.map((tab, index) => ({
    ...tab,
    active: page === "explorer" ? index === 0 : index === 1
  }));
  if (page === "explorer") {
    browser.pageTitle = "OSWorld Explorer";
    browser.url = "https://os-world.github.io/explorer.html";
    if (!browser.selectedCategoryId && browser.categories[0]) {
      browser.selectedCategoryId = browser.categories[0].id;
      browser.selectedTaskId = browser.categories[0].tasks[0]?.id ?? "";
    }
  } else {
    browser.pageTitle = "Ubuntu help";
    browser.url = "https://help.ubuntu.com/mock/osworld";
  }
}

function handleBrowserClick(state: EnvState, window: WindowInstance, browser: BrowserLiteState, point: Point) {
  const layout = getBrowserLiteLayout(window.bounds, browser);
  const next = structuredClone(state);
  const nextBrowser = next.appStates.browserLite[window.id];

  const clickedTabIndex = layout.tabRects.findIndex((rect) => pointInRect(point, rect));
  if (clickedTabIndex >= 0) {
    setBrowserPage(nextBrowser, clickedTabIndex === 0 ? "explorer" : "help");
    return { envState: next, accepted: true };
  }

  const clickedBookmarkIndex = layout.bookmarkRects.findIndex((rect) => pointInRect(point, rect));
  if (clickedBookmarkIndex >= 0) {
    const bookmark = nextBrowser.bookmarks[clickedBookmarkIndex];
    if (bookmark === "OSWorld") {
      setBrowserPage(nextBrowser, "explorer");
      return { envState: next, accepted: true };
    }
    if (bookmark === "Ubuntu Docs") {
      setBrowserPage(nextBrowser, "help");
      return { envState: next, accepted: true };
    }
  }

  if (nextBrowser.currentPage !== "explorer") {
    return { envState: state, accepted: false };
  }

  const clickedCategoryIndex = layout.categoryRects.findIndex((rect) => pointInRect(point, rect));
  if (clickedCategoryIndex >= 0) {
    const category = nextBrowser.categories[clickedCategoryIndex];
    nextBrowser.selectedCategoryId = category.id;
    nextBrowser.selectedTaskId = category.tasks[0]?.id ?? "";
    return { envState: next, accepted: true };
  }

  const selectedCategory =
    nextBrowser.categories.find((category) => category.id === nextBrowser.selectedCategoryId) ??
    nextBrowser.categories[0];
  const clickedTaskIndex = layout.taskRects.findIndex((rect) => pointInRect(point, rect));
  if (clickedTaskIndex >= 0 && selectedCategory?.tasks[clickedTaskIndex]) {
    nextBrowser.selectedTaskId = selectedCategory.tasks[clickedTaskIndex].id;
    return { envState: next, accepted: true };
  }

  return { envState: state, accepted: false };
}

function runTerminalCommand(state: EnvState, windowId: string) {
  const next = structuredClone(state);
  const terminal = next.appStates.terminalLite[windowId];
  const command = terminal.input.trim();
  const promptPrefix = `${terminal.prompt}:~${terminal.cwd}$`;

  if (!command) {
    terminal.input = "";
    return next;
  }

  const outputLines: string[] = [];
  if (command === "pwd") {
    outputLines.push(terminal.cwd);
  } else if (command === "ls") {
    outputLines.push(next.fileSystem.order.map((id) => next.fileSystem.files[id]?.name).filter(Boolean).join("  "));
  } else if (command.startsWith("cat ")) {
    const fileName = command.slice(4).trim();
    const file = Object.values(next.fileSystem.files).find((entry) => entry.name === fileName);
    if (file) {
      outputLines.push(...file.content.split("\n"));
    } else {
      outputLines.push(`cat: ${fileName}: No such file`);
    }
  } else {
    outputLines.push(`command not found: ${command}`);
  }

  terminal.lines.push(`${promptPrefix} ${command}`, ...outputLines);
  terminal.lastCommand = command;
  terminal.lastOutput = outputLines.join("\n");
  terminal.executedCommands.push(command);
  terminal.status = `ran ${command}`;
  terminal.input = "";
  return next;
}

function handleMailClick(state: EnvState, window: WindowInstance, mail: MailLiteState, point: Point) {
  const layout = getMailLiteLayout(window.bounds, mail);
  const next = structuredClone(state);
  const nextMail = next.appStates.mailLite[window.id];

  const clickedFolderIndex = layout.folderRects.findIndex((rect) => pointInRect(point, rect));
  if (clickedFolderIndex >= 0) {
    const folder = nextMail.folders[clickedFolderIndex];
    nextMail.selectedFolder = folder.id;
    const firstMessage = getVisibleMailMessages(nextMail)[0];
    nextMail.selectedMessageId = firstMessage?.id ?? "";
    nextMail.previewBody = firstMessage?.body ?? [];
    return { envState: next, accepted: true };
  }

  const visibleMessages = getVisibleMailMessages(nextMail);
  const clickedMessageIndex = layout.messageRects.findIndex((rect) => pointInRect(point, rect));
  if (clickedMessageIndex >= 0 && visibleMessages[clickedMessageIndex]) {
    const message = visibleMessages[clickedMessageIndex];
    nextMail.selectedMessageId = message.id;
    nextMail.previewBody = message.body;
    return { envState: next, accepted: true };
  }

  return { envState: state, accepted: false };
}

function handleTyping(state: EnvState, text: string) {
  if (state.popups.length > 0) {
    return { envState: state, accepted: false };
  }
  const focusedWindow = state.windows.find((window) => window.focused);
  if (!focusedWindow) {
    return { envState: state, accepted: false };
  }

  if (focusedWindow.appId === "file-explorer") {
    const next = structuredClone(state);
    const explorer = next.appStates.fileExplorer[focusedWindow.id];
    if (!explorer.renameMode) {
      return { envState: state, accepted: false };
    }
    explorer.renameMode.draft = explorer.renameMode.replaceOnType
      ? text
      : `${explorer.renameMode.draft}${text}`;
    explorer.renameMode.replaceOnType = false;
    return { envState: next, accepted: true };
  }

  if (focusedWindow.appId === "terminal-lite") {
    const next = structuredClone(state);
    const terminal = next.appStates.terminalLite[focusedWindow.id];
    terminal.input = `${terminal.input}${text.replace(/\r?\n/g, "")}`;
    terminal.status = terminal.input ? "editing" : "idle";
    return { envState: next, accepted: true };
  }

  if (focusedWindow.appId !== "note-editor") {
    return { envState: state, accepted: false };
  }

  const next = structuredClone(state);
  const note = next.appStates.noteEditor[focusedWindow.id];
  const inserted = insertText(note.buffer, note.cursorIndex, text);
  note.buffer = inserted.buffer;
  note.cursorIndex = inserted.cursorIndex;
  note.selectedLineIndex = undefined;
  note.dirty = true;
  return { envState: next, accepted: true };
}

function handlePress(state: EnvState, key: string) {
  const lower = key.toLowerCase();
  if (state.popups.length > 0 && (lower === "enter" || lower === "escape")) {
    const result = handlePopupClick(state, { x: popupButtonBounds(state).x + 8, y: popupButtonBounds(state).y + 8 });
    return { envState: result.envState, accepted: result.accepted };
  }

  const focusedWindow = state.windows.find((window) => window.focused);
  if (!focusedWindow) {
    return { envState: state, accepted: false };
  }

  if (focusedWindow.appId === "file-explorer") {
    const next = structuredClone(state);
    const explorer = next.appStates.fileExplorer[focusedWindow.id];
    if (lower === "f2" && explorer.selectedFileId) {
      const file = next.fileSystem.files[explorer.selectedFileId];
      explorer.renameMode = {
        fileId: explorer.selectedFileId,
        draft: file.name,
        replaceOnType: true
      };
      return { envState: next, accepted: true };
    }

    if (!explorer.renameMode) {
      return { envState: state, accepted: false };
    }

    if (lower === "backspace") {
      explorer.renameMode.draft = explorer.renameMode.draft.slice(0, -1);
      explorer.renameMode.replaceOnType = false;
      return { envState: next, accepted: true };
    }

    if (lower === "escape") {
      explorer.renameMode = undefined;
      return { envState: next, accepted: true };
    }

    if (lower === "enter") {
      next.fileSystem = renameFile(next.fileSystem, explorer.renameMode.fileId, explorer.renameMode.draft);
      explorer.renameMode = undefined;
      return { envState: syncWindowTitles(next), accepted: true };
    }

    return { envState: state, accepted: false };
  }

  if (focusedWindow.appId === "terminal-lite") {
    const next = structuredClone(state);
    const terminal = next.appStates.terminalLite[focusedWindow.id];

    if (lower === "backspace") {
      terminal.input = terminal.input.slice(0, -1);
      terminal.status = terminal.input ? "editing" : "idle";
      return { envState: next, accepted: true };
    }

    if (lower === "escape") {
      terminal.input = "";
      terminal.status = "idle";
      return { envState: next, accepted: true };
    }

    if (lower === "enter") {
      return { envState: runTerminalCommand(next, focusedWindow.id), accepted: true };
    }

    return { envState: state, accepted: false };
  }

  if (focusedWindow.appId !== "note-editor") {
    return { envState: state, accepted: false };
  }

  const next = structuredClone(state);
  const note = next.appStates.noteEditor[focusedWindow.id];

  if (lower === "backspace") {
    if (note.cursorIndex <= 0) {
      return { envState: state, accepted: false };
    }
    note.buffer = `${note.buffer.slice(0, note.cursorIndex - 1)}${note.buffer.slice(note.cursorIndex)}`;
    note.cursorIndex -= 1;
    note.selectedLineIndex = undefined;
    note.dirty = true;
    return { envState: next, accepted: true };
  }

  if (lower === "enter") {
    const inserted = insertText(note.buffer, note.cursorIndex, "\n");
    note.buffer = inserted.buffer;
    note.cursorIndex = inserted.cursorIndex;
    note.selectedLineIndex = undefined;
    note.dirty = true;
    return { envState: next, accepted: true };
  }

  if (lower === "escape") {
    note.selectedLineIndex = undefined;
    return { envState: next, accepted: true };
  }

  return { envState: state, accepted: false };
}

function handleHotkey(state: EnvState, keys: string[]) {
  if (state.popups.length > 0) {
    return { envState: state, accepted: false };
  }
  const normalized = keys.map((key) => key.toLowerCase()).sort();
  const focusedWindow = state.windows.find((window) => window.focused);
  if (!focusedWindow || focusedWindow.appId !== "note-editor") {
    return { envState: state, accepted: false };
  }

  const next = structuredClone(state);
  const note = next.appStates.noteEditor[focusedWindow.id];
  if (normalized.includes("ctrl") && normalized.includes("s")) {
    return { envState: saveNote(next, focusedWindow.id), accepted: true };
  }

  if (normalized.includes("ctrl") && normalized.includes("c")) {
    const lines = getLines(note.buffer);
    const selectedLine = lines[note.selectedLineIndex ?? 0] ?? "";
    next.clipboard = setClipboardText(next.clipboard, selectedLine);
    return { envState: next, accepted: true };
  }

  if (normalized.includes("ctrl") && normalized.includes("v")) {
    const inserted = insertText(note.buffer, note.cursorIndex, next.clipboard.text);
    note.buffer = inserted.buffer;
    note.cursorIndex = inserted.cursorIndex;
    note.selectedLineIndex = undefined;
    note.dirty = true;
    return { envState: next, accepted: true };
  }

  return { envState: state, accepted: false };
}

export function reduceEnvState(envState: EnvState, action: Computer13Action): ReduceResult {
  const previousFocused = getFocusedWindowId(envState);
  let next = structuredClone(envState);
  let accepted = true;

  switch (action.type) {
    case "MOVE_TO":
      next.pointer = { ...next.pointer, ...clipPoint({ x: action.x, y: action.y }, next.viewport) };
      break;
    case "MOUSE_DOWN":
      if (!next.pointer.buttonsPressed.includes(action.button ?? "left")) {
        next.pointer.buttonsPressed.push(action.button ?? "left");
      }
      break;
    case "MOUSE_UP":
      next.pointer.buttonsPressed = next.pointer.buttonsPressed.filter(
        (button) => button !== (action.button ?? "left")
      );
      break;
    case "DRAG_TO":
      next.pointer = { ...next.pointer, ...clipPoint({ x: action.x, y: action.y }, next.viewport) };
      break;
    case "SCROLL":
      accepted = true;
      break;
    case "WAIT":
    case "DONE":
    case "FAIL":
      accepted = true;
      break;
    case "TYPING": {
      const typingResult = handleTyping(next, action.text);
      next = typingResult.envState;
      accepted = typingResult.accepted;
      break;
    }
    case "PRESS": {
      const pressResult = handlePress(next, action.key);
      next = pressResult.envState;
      accepted = pressResult.accepted;
      break;
    }
    case "HOTKEY": {
      const hotkeyResult = handleHotkey(next, action.keys);
      next = hotkeyResult.envState;
      accepted = hotkeyResult.accepted;
      break;
    }
    case "KEY_DOWN":
      if (!next.keyboard.pressedKeys.includes(action.key.toLowerCase())) {
        next.keyboard.pressedKeys.push(action.key.toLowerCase());
      }
      break;
    case "KEY_UP":
      next.keyboard.pressedKeys = next.keyboard.pressedKeys.filter((key) => key !== action.key.toLowerCase());
      break;
    case "RIGHT_CLICK":
    case "DOUBLE_CLICK":
    case "CLICK": {
      const point = clipPoint(
        {
          x: action.x ?? next.pointer.x,
          y: action.y ?? next.pointer.y
        },
        next.viewport
      );
      next.pointer = { ...next.pointer, ...point };

      const popupResult = handlePopupClick(next, point);
      if (next.popups.length > 0) {
        next = popupResult.envState;
        accepted = popupResult.accepted;
        break;
      }

      const taskbarItem = getTaskbarItems(next).find((item) => pointInRect(point, item.bounds));
      if (taskbarItem) {
        next = handleTaskbarActivation(next, taskbarItem.windowId, taskbarItem.appId);
        accepted = true;
        break;
      }

      const targetWindow = getTopmostWindowAtPoint(next, point);
      if (!targetWindow) {
        accepted = false;
        break;
      }

      const frameResult = handleWindowFrameClick(next, targetWindow.id, point, action.type === "DOUBLE_CLICK");
      if (frameResult.handled) {
        next = frameResult.envState;
        accepted = frameResult.accepted;
        break;
      }

      next = focusWindow(next, targetWindow.id);
      if (targetWindow.appId === "file-explorer") {
        const result = handleFileExplorerClick(
          next,
          next.windows.find((window) => window.id === targetWindow.id)!,
          next.appStates.fileExplorer[targetWindow.id],
          point,
          action.type === "DOUBLE_CLICK"
        );
        next = result.envState;
        accepted = true;
      } else if (targetWindow.appId === "note-editor") {
        const result = handleNoteEditorClick(
          next,
          next.windows.find((window) => window.id === targetWindow.id)!,
          next.appStates.noteEditor[targetWindow.id],
          point
        );
        next = result.envState;
        accepted = true;
      } else if (targetWindow.appId === "browser-lite") {
        const result = handleBrowserClick(
          next,
          next.windows.find((window) => window.id === targetWindow.id)!,
          next.appStates.browserLite[targetWindow.id],
          point
        );
        next = result.envState;
        accepted = true;
      } else if (targetWindow.appId === "mail-lite") {
        const result = handleMailClick(
          next,
          next.windows.find((window) => window.id === targetWindow.id)!,
          next.appStates.mailLite[targetWindow.id],
          point
        );
        next = result.envState;
        accepted = true;
      } else {
        accepted = true;
      }
      break;
    }
    default:
      accepted = false;
      break;
  }

  const focusChanged = previousFocused !== getFocusedWindowId(next);
  return {
    envState: next,
    actionAccepted: accepted && !deepEqualEnv(envState, next) ? true : accepted,
    focusChanged
  };
}
