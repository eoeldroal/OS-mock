import { produce } from "immer";
import { handleFileExplorerAction } from "../apps/file-explorer.js";
import { FILE_EXPLORER_MIN_WINDOW_WIDTH } from "../apps/file-explorer.js";
import { handleBrowserAction } from "../apps/browser-lite.js";
import { handleMailAction } from "../apps/mail-lite.js";
import { handleNoteEditorAction } from "../apps/note-editor.js";
import { handleTerminalAction } from "../apps/terminal-lite.js";
import { executeCommand } from "../apps/terminal-commands.js";
import { applyTerminalCommandResult, deleteFileWithCleanup } from "../system/state-utils.js";
import {
  createContextMenu,
  getContextMenuBounds,
  getContextMenuItemBounds,
  getFileExplorerContextMenu,
  getNoteEditorContextMenu,
  getTerminalContextMenu,
  getDesktopContextMenu
} from "../system/context-menu.js";
import type {
  Computer13Action,
  DesktopIcon,
  EnvState,
  FileSystemPlace,
  MouseButton,
  Point,
  Rect,
  ResizeEdge,
  WindowInstance,
  WindowResizeState
} from "../types.js";
import { addExplorerWindow, addNoteEditorWindow, GNOME_DOCK_WIDTH, GNOME_TOP_BAR_HEIGHT, launchAppWindow } from "./factory.js";
import { pointInRect, clipPoint } from "../system/pointer.js";
import {
  closeWindow,
  focusWindow,
  getFocusedWindowId,
  getPopupBounds,
  getResizeEdge,
  getTaskbarItems,
  getTopmostWindowAtPoint,
  getWindowFrameControls,
  minimizeWindow,
  raiseWindow,
  restoreWindow,
  toggleMaximizeWindow
} from "../system/window-manager.js";
import {
  createFileEntry,
  createUniqueEntryName,
  ensureDirectoryPath,
  findFileByName,
  getFileEntry,
  getOrderedFiles,
  getPlacePath,
  insertFileEntry
} from "../system/filesystem.js";
import { allocateEntityId } from "../system/entity-id.js";

export type ReduceResult = {
  envState: EnvState;
  actionAccepted: boolean;
  focusChanged: boolean;
  actionSummary: string;
};

function deepEqualEnv(left: EnvState, right: EnvState) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function windowStateChanged(previous: EnvState, next: EnvState) {
  return previous.windows.some((window) => {
    const updated = next.windows.find((candidate) => candidate.id === window.id);
    return (
      updated &&
      (updated.minimized !== window.minimized ||
        updated.maximized !== window.maximized ||
        updated.bounds.x !== window.bounds.x ||
        updated.bounds.y !== window.bounds.y ||
        updated.bounds.width !== window.bounds.width ||
        updated.bounds.height !== window.bounds.height)
    );
  });
}

function noteBufferChanged(previous: EnvState, next: EnvState) {
  return Object.entries(previous.appStates.noteEditor).some(([id, note]) => {
    const updated = next.appStates.noteEditor[id];
    return updated && updated.buffer !== note.buffer;
  });
}

function selectionChanged(previous: EnvState, next: EnvState) {
  return (
    Object.entries(previous.appStates.noteEditor).some(([id, note]) => {
      const updated = next.appStates.noteEditor[id];
      return (
        updated &&
        (updated.selectedLineIndex !== note.selectedLineIndex || updated.cursorIndex !== note.cursorIndex)
      );
    }) ||
    Object.entries(previous.appStates.browserLite).some(([id, browser]) => {
      const updated = next.appStates.browserLite[id];
      return updated && updated.selectedHelpLineIndex !== browser.selectedHelpLineIndex;
    }) ||
    Object.entries(previous.appStates.terminalLite).some(([id, terminal]) => {
      const updated = next.appStates.terminalLite[id];
      return updated && updated.selectedLineIndex !== terminal.selectedLineIndex;
    }) ||
    Object.entries(previous.appStates.mailLite).some(([id, mail]) => {
      const updated = next.appStates.mailLite[id];
      return updated && updated.selectedPreviewLineIndex !== mail.selectedPreviewLineIndex;
    })
  );
}

function detectSpecificAppChange(previous: EnvState, next: EnvState): string | null {
  for (const [id, browser] of Object.entries(previous.appStates.browserLite)) {
    const updated = next.appStates.browserLite[id];
    if (updated && (updated.currentPage !== browser.currentPage ||
      updated.selectedCategoryId !== browser.selectedCategoryId ||
      updated.selectedTaskId !== browser.selectedTaskId)) {
      return "browser_navigation";
    }
  }
  for (const [id, mail] of Object.entries(previous.appStates.mailLite)) {
    const updated = next.appStates.mailLite[id];
    if (updated && (updated.selectedFolder !== mail.selectedFolder ||
      updated.selectedMessageId !== mail.selectedMessageId)) {
      return "mail_selection";
    }
  }
  for (const [id, explorer] of Object.entries(previous.appStates.fileExplorer)) {
    const updated = next.appStates.fileExplorer[id];
    if (updated && updated.selectedFileId !== explorer.selectedFileId) {
      return "file_selection";
    }
  }
  for (const [id, terminal] of Object.entries(previous.appStates.terminalLite)) {
    const updated = next.appStates.terminalLite[id];
    if (updated && updated.lastCommand !== terminal.lastCommand) {
      return "command_ran";
    }
  }
  return null;
}

function buildActionSummary(
  previous: EnvState,
  next: EnvState,
  action: Computer13Action,
  accepted: boolean,
  focusChanged: boolean
) {
  const previousFiles = getOrderedFiles(previous.fileSystem);

  if (action.type === "WAIT") {
    return "wait";
  }
  if (action.type === "DONE") {
    return "done";
  }
  if (action.type === "FAIL") {
    return "fail";
  }
  if (!accepted) {
    return "rejected";
  }
  if (previous.contextMenu && !next.contextMenu) {
    return "context_menu_closed";
  }
  if (!previous.contextMenu && next.contextMenu) {
    return "context_menu_opened";
  }
  if (previous.popups.length > next.popups.length) {
    return "popup_dismissed";
  }
  if (previous.clipboard.text !== next.clipboard.text) {
    return "clipboard_changed";
  }
  if (previous.windows.length < next.windows.length) {
    return "window_opened";
  }
  if (previous.windows.length > next.windows.length) {
    return "window_closed";
  }
  if (windowStateChanged(previous, next)) {
    if (action.type === "DRAG_TO" || action.type === "DRAG") {
      const maximizedChanged = previous.windows.some((w) => {
        const updated = next.windows.find((candidate) => candidate.id === w.id);
        return updated && updated.maximized !== w.maximized;
      });
      if (maximizedChanged) {
        return "window_state_changed";
      }
      // Check if width/height changed (resize) vs just position (drag)
      const sizeChanged = previous.windows.some((w) => {
        const u = next.windows.find(c => c.id === w.id);
        return u && (u.bounds.width !== w.bounds.width || u.bounds.height !== w.bounds.height);
      });
      return sizeChanged ? "window_resized" : "window_dragged";
    }
    return "window_state_changed";
  }
  const appChange = detectSpecificAppChange(previous, next);
  if (appChange) {
    return appChange;
  }
  if (noteBufferChanged(previous, next)) {
    return action.type === "HOTKEY" ? "text_pasted" : "text_changed";
  }
  if (selectionChanged(previous, next)) {
    return "selection_changed";
  }
  if (previousFiles.some((file) => {
    const updated = getFileEntry(next.fileSystem, file.id);
    return updated && updated.content !== file.content;
  })) {
    return "file_saved";
  }
  if (focusChanged) {
    return "focus_changed";
  }
  if (action.type === "TYPING") {
    return "text_changed";
  }
  if (action.type === "MOVE_TO" || action.type === "DRAG_TO" || action.type === "DRAG") {
    return "pointer_moved";
  }
  return "action_applied";
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

function isWindowFrameControlHit(window: WindowInstance, point: Point) {
  const controls = getWindowFrameControls(window.bounds);
  return (
    pointInRect(point, controls.closeButtonBounds) ||
    pointInRect(point, controls.minimizeButtonBounds) ||
    pointInRect(point, controls.maximizeButtonBounds)
  );
}

function clampWindowOrigin(state: EnvState, bounds: Rect, origin: Point): Point {
  const minX = GNOME_DOCK_WIDTH + 12;
  const minY = GNOME_TOP_BAR_HEIGHT + 12;
  const maxX = Math.max(minX, state.viewport.width - bounds.width - 12);
  const maxY = Math.max(minY, state.viewport.height - bounds.height - 12);
  return {
    x: Math.max(minX, Math.min(maxX, origin.x)),
    y: Math.max(minY, Math.min(maxY, origin.y))
  };
}

function beginWindowDrag(state: EnvState, point: Point, button: MouseButton) {
  if (button !== "left" || state.popups.length > 0) {
    return state;
  }

  const targetWindow = getTopmostWindowAtPoint(state, point);
  if (!targetWindow || targetWindow.maximized) {
    return state;
  }

  const controls = getWindowFrameControls(targetWindow.bounds);
  if (!pointInRect(point, controls.titleBarBounds) || isWindowFrameControlHit(targetWindow, point)) {
    return state;
  }

  const focused = focusWindow(state, targetWindow.id);
  const raised = raiseWindow(focused, targetWindow.id);
  const next = produce(raised, draft => {
    draft.dragState = {
      windowId: targetWindow.id,
      pointerOffset: {
        x: point.x - targetWindow.bounds.x,
        y: point.y - targetWindow.bounds.y
      }
    };
  });
  return next;
}

function updateDraggedWindow(state: EnvState, point: Point) {
  if (!state.dragState || !state.pointer.buttonsPressed.includes("left")) {
    return state;
  }

  const next = produce(state, draft => {
    const draggedWindow = draft.windows.find((window) => window.id === draft.dragState?.windowId);
    if (!draggedWindow || draggedWindow.minimized || draggedWindow.maximized) {
      draft.dragState = undefined;
      return;
    }

    if (draft.dragState) {
      const nextOrigin = clampWindowOrigin(draft, draggedWindow.bounds, {
        x: point.x - draft.dragState.pointerOffset.x,
        y: point.y - draft.dragState.pointerOffset.y
      });
      draggedWindow.bounds = {
        ...draggedWindow.bounds,
        x: nextOrigin.x,
        y: nextOrigin.y
      };
    }
  });
  return next;
}

function applyAtomicDrag(state: EnvState, start: Point, end: Point, button: MouseButton) {
  let next = produce(state, draft => {
    Object.assign(draft.pointer, start);
    if (!draft.pointer.buttonsPressed.includes(button)) {
      draft.pointer.buttonsPressed.push(button);
    }
  });

  const resizeTarget = getTopmostWindowAtPoint(next, start);
  if (resizeTarget && getResizeEdge(resizeTarget, start)) {
    next = beginWindowResize(next, start, button);
  } else {
    next = beginWindowDrag(next, start, button);
  }

  next = produce(next, draft => {
    Object.assign(draft.pointer, end);
  });

  if (next.resizeState) {
    next = updateResizedWindow(next, end);
  } else {
    next = updateDraggedWindow(next, end);
  }

  next = applyWindowDragReleaseSnap(next, end, button);

  return produce(next, draft => {
    draft.pointer.buttonsPressed = draft.pointer.buttonsPressed.filter((pressed) => pressed !== button);
    if (button === "left") {
      draft.dragState = undefined;
      draft.resizeState = undefined;
    }
  });
}

function applyWindowDragReleaseSnap(state: EnvState, point: Point, button: MouseButton) {
  if (button !== "left" || !state.dragState) {
    return state;
  }

  const draggedWindow = state.windows.find((window) => window.id === state.dragState?.windowId);
  if (!draggedWindow || draggedWindow.minimized || draggedWindow.maximized) {
    return state;
  }

  const topSnapThreshold = GNOME_TOP_BAR_HEIGHT + 16;
  if (point.y <= topSnapThreshold) {
    return toggleMaximizeWindow(state, draggedWindow.id);
  }

  return state;
}

const MIN_WINDOW_WIDTH = 200;
const MIN_WINDOW_HEIGHT = 150;

function getMinimumWindowWidth(window: WindowInstance) {
  if (window.appId === "file-explorer") {
    return FILE_EXPLORER_MIN_WINDOW_WIDTH;
  }
  return MIN_WINDOW_WIDTH;
}

function beginWindowResize(state: EnvState, point: Point, button: MouseButton): EnvState {
  if (button !== "left" || state.popups.length > 0) return state;

  const targetWindow = getTopmostWindowAtPoint(state, point);
  if (!targetWindow || targetWindow.maximized || targetWindow.minimized) return state;

  const edge = getResizeEdge(targetWindow, point);
  if (!edge) return state;

  const focused = focusWindow(state, targetWindow.id);
  const raised = raiseWindow(focused, targetWindow.id);
  return produce(raised, draft => {
    draft.resizeState = {
      windowId: targetWindow.id,
      edge,
      initialBounds: { ...targetWindow.bounds },
      initialPointer: { ...point }
    };
  });
}

function updateResizedWindow(state: EnvState, point: Point): EnvState {
  if (!state.resizeState || !state.pointer.buttonsPressed.includes("left")) return state;

  return produce(state, draft => {
    const resize = draft.resizeState;
    if (!resize) return;

    const win = draft.windows.find(w => w.id === resize.windowId);
    if (!win) { draft.resizeState = undefined; return; }

    const dx = point.x - resize.initialPointer.x;
    const dy = point.y - resize.initialPointer.y;
    const ib = resize.initialBounds;
    const minWindowWidth = getMinimumWindowWidth(win);

    let newX = ib.x, newY = ib.y, newW = ib.width, newH = ib.height;

    // Apply resize based on edge
    if (resize.edge.includes("e")) newW = Math.max(minWindowWidth, ib.width + dx);
    if (resize.edge.includes("w")) {
      const proposedW = ib.width - dx;
      if (proposedW >= minWindowWidth) { newX = ib.x + dx; newW = proposedW; }
    }
    if (resize.edge.includes("s")) newH = Math.max(MIN_WINDOW_HEIGHT, ib.height + dy);
    if (resize.edge.includes("n")) {
      const proposedH = ib.height - dy;
      if (proposedH >= MIN_WINDOW_HEIGHT) { newY = ib.y + dy; newH = proposedH; }
    }

    win.bounds = { x: newX, y: newY, width: newW, height: newH };
  });
}

function syncWindowTitles(state: EnvState): EnvState {
  const next = produce(state, draft => {
    draft.windows = draft.windows.map((window) => {
      if (window.appId !== "note-editor") {
        return window;
      }
      const note = draft.appStates.noteEditor[window.id];
      const file = getFileEntry(draft.fileSystem, note.fileId);
      return {
        ...window,
        title: file?.name ?? window.title
      };
    });
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
  const noteWidth = noteCount === 0 ? 360 : 346;
  const noteHeight = noteCount === 0 ? 400 : 400;
  const top = 94;
  const visibleWindows = state.windows
    .filter((window) => !window.minimized && window.appId !== "note-editor")
    .sort((left, right) => right.zIndex - left.zIndex);
  const anchorWindow = visibleWindows[0];
  const defaultCenteredX = Math.max(
    92,
    Math.round((state.viewport.width - noteWidth) / 2)
  );

  let x = defaultCenteredX;
  if (anchorWindow) {
    const rightCandidate = anchorWindow.bounds.x + anchorWindow.bounds.width + 16;
    const leftCandidate = anchorWindow.bounds.x - noteWidth - 16;
    const maxRight = state.viewport.width - noteWidth - 18;
    const leftLimit = 84;

    if (rightCandidate <= maxRight) {
      x = rightCandidate;
    } else if (leftCandidate >= leftLimit) {
      x = leftCandidate;
    } else {
      x = Math.max(leftLimit, Math.min(maxRight, defaultCenteredX));
    }
  }

  const bounds = { x, y: top, width: noteWidth, height: noteHeight };

  return addNoteEditorWindow(state, nextId, fileId, bounds, true);
}

const DEFAULT_EXPLORER_LAUNCH_BOUNDS = { x: 84, y: 82, width: 388, height: 460 };

function openOrFocusExplorerWindow(
  state: EnvState,
  place: FileSystemPlace = "workspace",
  directory = getPlacePath(state.fileSystem, place)
): EnvState {
  const ensuredState = produce(state, draft => {
    draft.fileSystem = ensureDirectoryPath(draft.fileSystem, directory);
  });
  const existingWindow = ensuredState.windows
    .filter((window) => window.appId === "file-explorer")
    .sort((left, right) => right.zIndex - left.zIndex)[0];

  if (existingWindow) {
    const restored = restoreWindow(ensuredState, existingWindow.id);
    return produce(restored, draft => {
      const explorer = draft.appStates.fileExplorer[existingWindow.id];
      explorer.currentPlace = place;
      explorer.currentDirectory = directory;
      explorer.selectedFileId = undefined;
      explorer.renameMode = undefined;
    });
  }

  const next = addExplorerWindow(ensuredState, "explorer-main", DEFAULT_EXPLORER_LAUNCH_BOUNDS, true, false);
  return produce(next, draft => {
    const explorer = draft.appStates.fileExplorer["explorer-main"];
    explorer.currentPlace = place;
    explorer.currentDirectory = directory;
    explorer.selectedFileId = undefined;
    explorer.renameMode = undefined;
  });
}

function ensureNoteFile(state: EnvState, name: string, directory: string): { envState: EnvState; fileId: string } {
  const existing = findFileByName(state.fileSystem, name, directory);
  if (existing) {
    return { envState: state, fileId: existing.id };
  }

  let fileId = "";
  const next = produce(state, draft => {
    fileId = allocateEntityId(draft, "file");
    draft.fileSystem = insertFileEntry(draft.fileSystem, createFileEntry(fileId, name, "", directory));
  });
  return { envState: next, fileId };
}

function activateDesktopIcon(state: EnvState, icon: DesktopIcon): EnvState {
  if (icon.action === "open-trash") {
    return openOrFocusExplorerWindow(state, icon.place ?? "Desktop", icon.directory ?? "/desktop/Trash");
  }

  if (icon.appId === "note-editor") {
    const targetDirectory = icon.directory ?? getPlacePath(state.fileSystem, "Desktop");
    const ensured = ensureNoteFile(state, icon.label, targetDirectory);
    return openOrFocusNoteEditor(ensured.envState, ensured.fileId);
  }

  if (icon.appId === "file-explorer") {
    return openOrFocusExplorerWindow(
      state,
      icon.place ?? "workspace",
      icon.directory ?? getPlacePath(state.fileSystem, icon.place ?? "workspace")
    );
  }

  if (icon.appId) {
    return launchAppWindow(state, icon.appId);
  }

  return state;
}

function handlePopupClick(state: EnvState, point: Point) {
  if (state.popups.length === 0) {
    return { envState: state, accepted: false };
  }
  const buttonBounds = popupButtonBounds(state);
  if (!pointInRect(point, buttonBounds)) {
    return { envState: state, accepted: false };
  }
  const next = produce(state, draft => {
    draft.popups.pop();
    const fallback = draft.windows
      .filter((window) => !window.minimized)
      .sort((left, right) => right.zIndex - left.zIndex)[0];
    draft.windows = draft.windows.map((window) => ({
      ...window,
      focused: window.id === fallback?.id
    }));
  });
  return { envState: next, accepted: true };
}

function dismissContextMenu(state: EnvState): EnvState {
  if (!state.contextMenu) {
    return state;
  }
  return produce(state, draft => {
    draft.contextMenu = undefined;
  });
}

function handleContextMenuClick(state: EnvState, point: Point): { envState: EnvState; accepted: boolean; handled: boolean } {
  if (!state.contextMenu) {
    return { envState: state, accepted: false, handled: false };
  }

  // Check if click is on a menu item
  for (let i = 0; i < state.contextMenu.items.length; i++) {
    const itemBounds = getContextMenuItemBounds(state.contextMenu, i);
    if (pointInRect(point, itemBounds)) {
      const item = state.contextMenu.items[i];
      if (!item.enabled) {
        // Click on disabled item - just dismiss
        return { envState: dismissContextMenu(state), accepted: true, handled: true };
      }
      // Execute the menu item action
      const sourceWindowId = state.contextMenu.sourceWindowId;
      const sourceWindow = sourceWindowId ? state.windows.find(w => w.id === sourceWindowId) : null;

      let result = state;

      if (item.id === "open" && sourceWindow?.appId === "file-explorer") {
        // Open file - equivalent to double-click
        const explorer = state.appStates.fileExplorer[sourceWindowId!];
        if (explorer.selectedFileId) {
          const file = getFileEntry(state.fileSystem, explorer.selectedFileId);
          if (file?.kind === "folder") {
            result = produce(state, draft => {
              draft.appStates.fileExplorer[sourceWindowId!].currentDirectory = file.path;
              draft.appStates.fileExplorer[sourceWindowId!].selectedFileId = undefined;
            });
          } else if (file) {
            result = openOrFocusNoteEditor(state, explorer.selectedFileId);
          }
        }
      } else if (item.id === "rename" && sourceWindow?.appId === "file-explorer") {
        // Enter rename mode
        const explorer = state.appStates.fileExplorer[sourceWindowId!];
        if (explorer.selectedFileId) {
          const file = getFileEntry(state.fileSystem, explorer.selectedFileId);
          if (file) {
            result = produce(state, draft => {
              draft.appStates.fileExplorer[sourceWindowId!].renameMode = {
                fileId: explorer.selectedFileId!,
                draft: file.name,
                replaceOnType: true
              };
            });
          }
        }
      } else if (item.id === "delete" && sourceWindow?.appId === "file-explorer") {
        // Delete file
        const explorer = state.appStates.fileExplorer[sourceWindowId!];
        if (explorer.selectedFileId) {
          result = produce(deleteFileWithCleanup(state, explorer.selectedFileId), draft => {
            draft.appStates.fileExplorer[sourceWindowId!].selectedFileId = undefined;
          });
        }
      } else if (item.id === "new-file" || item.id === "new-folder") {
        const explorerState =
          sourceWindow?.appId === "file-explorer" ? state.appStates.fileExplorer[sourceWindowId!] : undefined;
        const defaultBaseName = item.id === "new-folder" ? "New Folder" : "Untitled";
        const defaultExtension = item.id === "new-folder" ? "" : ".txt";
        const baseDir =
          explorerState?.currentDirectory ??
          getPlacePath(state.fileSystem, explorerState?.currentPlace ?? "Desktop");
        const candidateName = createUniqueEntryName(state.fileSystem, baseDir, defaultBaseName, defaultExtension);
        result = produce(state, draft => {
          const newEntryId = allocateEntityId(draft, "file");
          draft.fileSystem = insertFileEntry(
            draft.fileSystem,
            createFileEntry(
              newEntryId,
              candidateName,
              "",
              baseDir,
              item.id === "new-folder" ? "folder" : "file"
            )
          );
          if (sourceWindow?.appId === "file-explorer") {
            draft.appStates.fileExplorer[sourceWindowId!].selectedFileId = newEntryId;
            draft.appStates.fileExplorer[sourceWindowId!].renameMode = {
              fileId: newEntryId,
              draft: candidateName,
              replaceOnType: true
            };
          }
        });
      } else if (item.id === "copy" && sourceWindow?.appId === "note-editor") {
        // Copy selected text in note editor
        const note = state.appStates.noteEditor[sourceWindowId!];
        const lines = note.buffer.split("\n");
        if (note.selectedLineIndex !== undefined && note.selectedLineIndex >= 0 && note.selectedLineIndex < lines.length) {
          result = produce(state, draft => {
            draft.clipboard.text = lines[note.selectedLineIndex!];
          });
        }
      } else if (item.id === "paste" && sourceWindow?.appId === "note-editor") {
        // Paste into note editor
        const note = state.appStates.noteEditor[sourceWindowId!];
        result = produce(state, draft => {
          const text = draft.appStates.noteEditor[sourceWindowId!].buffer;
          const textBefore = text.substring(0, note.cursorIndex);
          const textAfter = text.substring(note.cursorIndex);
          draft.appStates.noteEditor[sourceWindowId!].buffer = textBefore + state.clipboard.text + textAfter;
          draft.appStates.noteEditor[sourceWindowId!].cursorIndex = note.cursorIndex + state.clipboard.text.length;
          draft.appStates.noteEditor[sourceWindowId!].dirty = true;
        });
      } else if (item.id === "copy" && sourceWindow?.appId === "terminal-lite") {
        // Copy from terminal
        const terminal = state.appStates.terminalLite[sourceWindowId!];
        if (terminal.selectedLineIndex !== undefined && terminal.selectedLineIndex >= 0 && terminal.selectedLineIndex < terminal.lines.length) {
          result = produce(state, draft => {
            draft.clipboard.text = terminal.lines[terminal.selectedLineIndex!];
          });
        }
      } else if (item.id === "paste" && sourceWindow?.appId === "terminal-lite") {
        // Paste into terminal
        result = produce(state, draft => {
          draft.appStates.terminalLite[sourceWindowId!].input += state.clipboard.text;
        });
      } else if (item.id === "clear" && sourceWindow?.appId === "terminal-lite") {
        // Clear terminal
        result = produce(state, draft => {
          draft.appStates.terminalLite[sourceWindowId!].lines = [];
          draft.appStates.terminalLite[sourceWindowId!].selectedLineIndex = undefined;
        });
      } else if (item.id === "open-terminal") {
        // Launch terminal
        result = launchAppWindow(state, "terminal-lite");
      }

      return { envState: dismissContextMenu(result), accepted: true, handled: true };
    }
  }

  // Click outside menu items - just dismiss
  return { envState: dismissContextMenu(state), accepted: true, handled: true };
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
      envState: isDoubleClick ? toggleMaximizeWindow(state, windowId) : raiseWindow(focusWindow(state, windowId), windowId),
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

// NEW: App action dispatcher
function dispatchToApp(
  state: EnvState,
  window: WindowInstance,
  action: Computer13Action,
  point: Point
): { envState: EnvState; accepted: boolean } | null {
  const appId = window.appId;

  if (appId === "file-explorer") {
    const explorer = state.appStates.fileExplorer[window.id];
    const result = handleFileExplorerAction(state, window, explorer, action, point);
    if (!result) return null;
    return { envState: result.envState ?? state, accepted: result.accepted };
  }

  if (appId === "note-editor") {
    const note = state.appStates.noteEditor[window.id];
    const result = handleNoteEditorAction(state, window, note, action, point);
    if (!result) return null;
    return { envState: result.envState ?? state, accepted: result.accepted };
  }

  if (appId === "browser-lite") {
    const browser = state.appStates.browserLite[window.id];
    const result = handleBrowserAction(state, window, browser, action, point);
    if (!result) return null;
    return { envState: result.envState ?? state, accepted: result.accepted };
  }

  if (appId === "terminal-lite") {
    const terminal = state.appStates.terminalLite[window.id];
    // Special handling for Enter key -> run command
    if (action.type === "PRESS" && action.key.toLowerCase() === "enter") {
      const command = terminal.input.trim();
      if (!command) {
        const next = produce(state, draft => {
          draft.appStates.terminalLite[window.id].input = "";
        });
        return { envState: next, accepted: true };
      }
      const cmdResult = executeCommand(command, {
        cwd: terminal.cwd,
        fileSystem: state.fileSystem
      });
      let next = applyTerminalCommandResult(state, window.id, command, cmdResult);
      // Reset history index after executing command
      next = produce(next, draft => {
        draft.appStates.terminalLite[window.id].historyIndex = -1;
      });
      return { envState: next, accepted: true };
    }
    const result = handleTerminalAction(state, window, terminal, action, point);
    if (!result) return null;
    return { envState: result.envState ?? state, accepted: result.accepted };
  }

  if (appId === "mail-lite") {
    const mail = state.appStates.mailLite[window.id];
    const result = handleMailAction(state, window, mail, action, point);
    if (!result) return null;
    return { envState: result.envState ?? state, accepted: result.accepted };
  }

  return null;
}

// The main reduceEnvState function
export function reduceEnvState(envState: EnvState, action: Computer13Action): ReduceResult {
  const previousFocused = getFocusedWindowId(envState);
  const previousState = structuredClone(envState);  // Keep this one clone for buildActionSummary comparison
  let next = envState;
  let accepted = true;

  switch (action.type) {
    case "MOVE_TO":
      next = produce(next, draft => {
        Object.assign(draft.pointer, clipPoint({ x: action.x, y: action.y }, draft.viewport));
      });
      break;

    case "MOUSE_DOWN":
      next = produce(next, draft => {
        if (!draft.pointer.buttonsPressed.includes(action.button ?? "left")) {
          draft.pointer.buttonsPressed.push(action.button ?? "left");
        }
      });
      // Try resize first, then drag
      const resizeTarget = getTopmostWindowAtPoint(next, { x: next.pointer.x, y: next.pointer.y });
      if (resizeTarget && getResizeEdge(resizeTarget, { x: next.pointer.x, y: next.pointer.y })) {
        next = beginWindowResize(next, { x: next.pointer.x, y: next.pointer.y }, action.button ?? "left");
      } else {
        next = beginWindowDrag(next, { x: next.pointer.x, y: next.pointer.y }, action.button ?? "left");
      }
      break;

    case "MOUSE_UP":
      next = applyWindowDragReleaseSnap(next, { x: next.pointer.x, y: next.pointer.y }, action.button ?? "left");
      next = produce(next, draft => {
        draft.pointer.buttonsPressed = draft.pointer.buttonsPressed.filter(
          b => b !== (action.button ?? "left")
        );
        if ((action.button ?? "left") === "left") {
          draft.dragState = undefined;
          draft.resizeState = undefined;
        }
      });
      break;

    case "DRAG_TO":
      next = produce(next, draft => {
        Object.assign(draft.pointer, clipPoint({ x: action.x, y: action.y }, draft.viewport));
      });
      if (next.resizeState) {
        next = updateResizedWindow(next, { x: next.pointer.x, y: next.pointer.y });
      } else {
        next = updateDraggedWindow(next, { x: next.pointer.x, y: next.pointer.y });
      }
      break;

    case "DRAG": {
      const button = action.button ?? "left";
      const start = clipPoint({ x: action.x1, y: action.y1 }, next.viewport);
      const end = clipPoint({ x: action.x2, y: action.y2 }, next.viewport);
      next = applyAtomicDrag(next, start, end, button);
      break;
    }

    case "SCROLL": {
      // Try app-specific scroll
      const focusedWindow = next.windows.find(w => w.focused);
      if (next.popups.length > 0 || !focusedWindow) {
        accepted = false;
        break;
      }
      const scrollResult = dispatchToApp(next, focusedWindow, action, next.pointer);
      if (scrollResult) {
        next = scrollResult.envState;
        accepted = scrollResult.accepted;
      } else {
        accepted = true; // scroll with no handler = accepted but no-op
      }
      break;
    }

    case "WAIT":
    case "DONE":
    case "FAIL":
      accepted = true;
      break;

    case "TYPING": {
      if (next.popups.length > 0) { accepted = false; break; }
      const focusedWindow = next.windows.find(w => w.focused);
      if (!focusedWindow) { accepted = false; break; }
      const typingResult = dispatchToApp(next, focusedWindow, action, next.pointer);
      if (typingResult) {
        next = typingResult.envState;
        accepted = typingResult.accepted;
      } else {
        // App doesn't handle typing — accept as no-op (like typing in a non-editable area)
        accepted = true;
      }
      break;
    }

    case "PRESS": {
      // Context menu Escape handling
      const lower = action.key.toLowerCase();
      if (next.contextMenu && lower === "escape") {
        next = dismissContextMenu(next);
        accepted = true;
        break;
      }
      // Popup Enter/Escape handling
      if (next.popups.length > 0 && (lower === "enter" || lower === "escape")) {
        const result = handlePopupClick(next, { x: popupButtonBounds(next).x + 8, y: popupButtonBounds(next).y + 8 });
        next = result.envState;
        accepted = result.accepted;
        break;
      }
      const focusedWindow = next.windows.find(w => w.focused);
      if (!focusedWindow) {
        // No focused window: Escape always accepted, other keys rejected
        accepted = lower === "escape";
        break;
      }
      const pressResult = dispatchToApp(next, focusedWindow, action, next.pointer);
      if (pressResult) {
        next = pressResult.envState;
        accepted = pressResult.accepted;
        // After file-explorer PRESS Enter (rename commit), sync titles
        if (focusedWindow.appId === "file-explorer" && lower === "enter" && accepted) {
          next = syncWindowTitles(next);
        }
      } else {
        // App doesn't handle this key — accept as no-op (like pressing unbound key)
        accepted = true;
      }
      break;
    }

    case "HOTKEY": {
      if (next.popups.length > 0) { accepted = false; break; }
      const focusedWindow = next.windows.find(w => w.focused);
      if (!focusedWindow) { accepted = false; break; }
      const hotkeyResult = dispatchToApp(next, focusedWindow, action, next.pointer);
      if (hotkeyResult) {
        next = hotkeyResult.envState;
        accepted = hotkeyResult.accepted;
      } else {
        // App doesn't handle this hotkey — accept as no-op
        accepted = true;
      }
      break;
    }

    case "KEY_DOWN":
      next = produce(next, draft => {
        if (!draft.keyboard.pressedKeys.includes(action.key.toLowerCase())) {
          draft.keyboard.pressedKeys.push(action.key.toLowerCase());
        }
      });
      break;

    case "KEY_UP":
      next = produce(next, draft => {
        draft.keyboard.pressedKeys = draft.keyboard.pressedKeys.filter(k => k !== action.key.toLowerCase());
      });
      break;

    case "RIGHT_CLICK":
    case "DOUBLE_CLICK":
    case "CLICK": {
      const point = clipPoint(
        { x: action.x ?? next.pointer.x, y: action.y ?? next.pointer.y },
        next.viewport
      );
      next = produce(next, draft => { Object.assign(draft.pointer, point); });

      // 0. Context Menu handling
      if (next.contextMenu && (action.type === "CLICK" || action.type === "DOUBLE_CLICK")) {
        const menuResult = handleContextMenuClick(next, point);
        next = menuResult.envState;
        accepted = menuResult.accepted;
        break;
      }

      // Dismiss context menu on right-click (will open new one if applicable)
      if (action.type === "RIGHT_CLICK" && next.contextMenu) {
        next = dismissContextMenu(next);
      }

      // 1. Popup
      if (next.popups.length > 0) {
        const popupResult = handlePopupClick(next, point);
        next = popupResult.envState;
        accepted = popupResult.accepted;
        break;
      }

      // 2. Taskbar
      const taskbarItem = getTaskbarItems(next).find(item => pointInRect(point, item.bounds));
      if (taskbarItem) {
        next = handleTaskbarActivation(next, taskbarItem.windowId, taskbarItem.appId);
        accepted = true;
        break;
      }

      // 3. Desktop icons (only if no window at this point)
      const targetWindow = getTopmostWindowAtPoint(next, point);
      if (!targetWindow) {
        if (action.type === "RIGHT_CLICK") {
          next = produce(next, draft => {
            draft.contextMenu = createContextMenu(getDesktopContextMenu(), point);
          });
          accepted = true;
          break;
        }
        // Desktop icons (double-click to launch)
        if (action.type === "DOUBLE_CLICK") {
          const icon = next.desktopIcons.find(i => pointInRect(point, i.bounds));
          if (icon) {
            next = activateDesktopIcon(next, icon);
            accepted = true;
            break;
          }
        }
        // Single click on desktop icon - just accept (visual feedback in UI)
        const clickedIcon = next.desktopIcons.find(i => pointInRect(point, i.bounds));
        if (clickedIcon) {
          accepted = true;
          break;
        }
        // Click on empty desktop area: accept as desktop focus (like real Ubuntu)
        accepted = true;
        break;
      }

      // 4. Window targeting

      // 5. Window frame controls
      const frameResult = handleWindowFrameClick(next, targetWindow.id, point, action.type === "DOUBLE_CLICK");
      if (frameResult.handled) {
        next = frameResult.envState;
        accepted = frameResult.accepted;
        break;
      }

      // 6. RIGHT_CLICK: Create context menu or delegated context menu
      if (action.type === "RIGHT_CLICK") {
        const isContentArea = !pointInRect(point, getWindowFrameControls(targetWindow.bounds).titleBarBounds);
        if (isContentArea) {
          let contextMenuItems: ReturnType<typeof getFileExplorerContextMenu> = [];
          if (targetWindow.appId === "file-explorer") {
            const explorer = next.appStates.fileExplorer[targetWindow.id];
            contextMenuItems = getFileExplorerContextMenu(!!explorer.selectedFileId);
          } else if (targetWindow.appId === "note-editor") {
            const note = next.appStates.noteEditor[targetWindow.id];
            contextMenuItems = getNoteEditorContextMenu(note.selectedLineIndex !== undefined);
          } else if (targetWindow.appId === "terminal-lite") {
            const terminal = next.appStates.terminalLite[targetWindow.id];
            contextMenuItems = getTerminalContextMenu(terminal.selectedLineIndex !== undefined);
          } else {
            contextMenuItems = [];
          }

          if (contextMenuItems.length > 0) {
            next = produce(next, draft => {
              draft.contextMenu = createContextMenu(contextMenuItems, point, targetWindow.id);
            });
            accepted = true;
            break;
          }
        }
      }

      // 7. Focus + delegate to app
      const wasFocused = targetWindow.focused;
      next = focusWindow(next, targetWindow.id);
      const focusAccepted = !wasFocused;

      // Map DOUBLE_CLICK to CLICK with numClicks=2 for app handlers
      const appAction = action.type === "DOUBLE_CLICK"
        ? { ...action, type: "CLICK" as const, numClicks: 2 }
        : action.type === "RIGHT_CLICK"
        ? action
        : action;

      const appResult = dispatchToApp(
        next,
        next.windows.find(w => w.id === targetWindow.id)!,
        appAction,
        point
      );

      if (appResult) {
        next = appResult.envState;
        accepted = appResult.accepted || focusAccepted;
        // After file-explorer double-click, open or focus the note editor
        if (targetWindow.appId === "file-explorer" && action.type === "DOUBLE_CLICK" && accepted) {
          const explorer = next.appStates.fileExplorer[targetWindow.id];
          if (explorer.selectedFileId) {
            const file = getFileEntry(next.fileSystem, explorer.selectedFileId);
            if (file?.kind !== "folder") {
              next = openOrFocusNoteEditor(
                next,
                explorer.selectedFileId,
                explorer.selectedFileId === "file-todo" ? "notes-todo" : undefined
              );
            }
          }
        }
      } else {
        accepted = focusAccepted;
      }
      break;
    }

    default:
      accepted = false;
      break;
  }

  const focusChanged = previousFocused !== getFocusedWindowId(next);
  const actionSummary = buildActionSummary(previousState, next, action, accepted, focusChanged);
  return {
    envState: next,
    actionAccepted: accepted && !deepEqualEnv(envState, next) ? true : accepted,
    focusChanged,
    actionSummary
  };
}
