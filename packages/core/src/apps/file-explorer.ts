import { produce } from "immer";
import type {
  A11yNode,
  AppActionResult,
  AppPlugin,
  BuildContext,
  Computer13Action,
  FileEntry,
  FileExplorerLayout,
  FileSystemPlace,
  FileExplorerState,
  FileExplorerViewModel,
  Point,
  ReduceContext,
  Rect,
  EnvState,
  WindowInstance
} from "../types.js";
import { getFileDirectory, getFileEntry, getFilesInDirectory, getPlacePath, renameFile } from "../system/filesystem.js";
import { pointInRect } from "../system/pointer.js";
import { deleteFileWithCleanup } from "../system/state-utils.js";

const HEADER_HEIGHT = 40;
const SIDEBAR_WIDTH = 176;
const TOOLBAR_HEIGHT = 54;
const MAIN_PADDING = 16;
const ROW_HEIGHT = 50;
const SIDEBAR_ITEM_HEIGHT = 38;
const SIDEBAR_ITEM_GAP = 6;
const SIDEBAR_TOP_OFFSET = 46; // "Places" label height + margin

export const SIDEBAR_PLACES: FileSystemPlace[] = ["Home", "Desktop", "Documents", "Downloads", "workspace"];

function getExplorerDirectory(state: EnvState, explorer: FileExplorerState) {
  return explorer.currentDirectory || getPlacePath(state.fileSystem, explorer.currentPlace);
}

/**
 * Compute the canonical layout for a file explorer window.
 * This is the SINGLE SOURCE OF TRUTH for all element positions.
 * Both hit-testing (reducer) and rendering (React) use these exact rects.
 */
export function getFileExplorerLayout(bounds: Rect, fileCount: number): FileExplorerLayout {
  // ── Sidebar ──
  const sidebarBounds: Rect = {
    x: bounds.x,
    y: bounds.y + HEADER_HEIGHT,
    width: SIDEBAR_WIDTH,
    height: bounds.height - HEADER_HEIGHT
  };
  const sidebarX = bounds.x + 14;
  // "Places" label: 16px padding-top from sidebar, then label itself ~16px tall, then 14px margin
  const sidebarBaseY = bounds.y + HEADER_HEIGHT + 16 + SIDEBAR_TOP_OFFSET;
  const sidebarItemRects: Rect[] = SIDEBAR_PLACES.map((_, index) => ({
    x: sidebarX,
    y: sidebarBaseY + index * (SIDEBAR_ITEM_HEIGHT + SIDEBAR_ITEM_GAP),
    width: SIDEBAR_WIDTH - 28,
    height: SIDEBAR_ITEM_HEIGHT
  }));

  // ── Main area (right of sidebar) ──
  const mainX = bounds.x + SIDEBAR_WIDTH;
  const mainBounds: Rect = {
    x: mainX,
    y: bounds.y + HEADER_HEIGHT,
    width: bounds.width - SIDEBAR_WIDTH,
    height: bounds.height - HEADER_HEIGHT
  };

  // ── Toolbar (breadcrumb + search bar) ──
  const toolbarBounds: Rect = {
    x: mainX,
    y: bounds.y + HEADER_HEIGHT,
    width: bounds.width - SIDEBAR_WIDTH,
    height: TOOLBAR_HEIGHT
  };

  const backButtonBounds: Rect = {
    x: toolbarBounds.x + 16,
    y: toolbarBounds.y + 16,
    width: 22,
    height: 22
  };

  // ── File list ──
  const sectionY = bounds.y + HEADER_HEIGHT + TOOLBAR_HEIGHT + MAIN_PADDING;
  const listY = sectionY + 24; // 24px for section heading
  const listBounds: Rect = {
    x: mainX + MAIN_PADDING,
    y: listY,
    width: bounds.width - SIDEBAR_WIDTH - MAIN_PADDING * 2,
    height: bounds.height - HEADER_HEIGHT - TOOLBAR_HEIGHT - MAIN_PADDING * 2 - 24
  };

  const fileRowRects: Rect[] = Array.from({ length: fileCount }).map((_, index) => ({
    x: listBounds.x,
    y: listBounds.y + index * ROW_HEIGHT,
    width: listBounds.width,
    height: ROW_HEIGHT
  }));

  const renameHintBounds: Rect = {
    x: mainX + MAIN_PADDING,
    y: sectionY,
    width: 220,
    height: 20
  };

  return {
    sidebarBounds,
    sidebarItemRects,
    mainBounds,
    toolbarBounds,
    backButtonBounds,
    listBounds,
    fileRowRects,
    renameHintBounds
  };
}

function buildFileNode(file: FileEntry, bounds: Rect, selected: boolean): A11yNode {
  return {
    id: `file-${file.id}`,
    role: "listitem",
    name: file.name,
    text: file.path,
    bounds,
    visible: true,
    enabled: true,
    focusable: true,
    focused: selected,
    children: []
  };
}

export function handleFileExplorerAction(
  state: EnvState,
  window: WindowInstance,
  explorer: FileExplorerState,
  action: Computer13Action,
  point: Point
): AppActionResult | null {
  const files = getFilesInDirectory(state.fileSystem, getExplorerDirectory(state, explorer));

  if (action.type === "CLICK") {
    const layout = getFileExplorerLayout(window.bounds, files.length);
    const isDoubleClick = action.numClicks === 2;

    const rootDirectory = getPlacePath(state.fileSystem, explorer.currentPlace);
    if (pointInRect(point, layout.backButtonBounds) && explorer.currentDirectory !== rootDirectory) {
      const next = produce(state, (draft) => {
        const nextExplorer = draft.appStates.fileExplorer[window.id];
        nextExplorer.currentDirectory = getFileDirectory(nextExplorer.currentDirectory);
        nextExplorer.selectedFileId = undefined;
        nextExplorer.renameMode = undefined;
      });
      return { appState: next.appStates.fileExplorer[window.id], envState: next, accepted: true };
    }

    // Check sidebar clicks first (uses canonical layout rects)
    const clickedSidebarIndex = layout.sidebarItemRects.findIndex((rect) => pointInRect(point, rect));
    if (clickedSidebarIndex >= 0) {
      const place = SIDEBAR_PLACES[clickedSidebarIndex];
      const next = produce(state, (draft) => {
        const nextExplorer = draft.appStates.fileExplorer[window.id];
        nextExplorer.currentPlace = place;
        nextExplorer.currentDirectory = getPlacePath(draft.fileSystem, place);
        nextExplorer.selectedFileId = undefined;
      });
      return { appState: next.appStates.fileExplorer[window.id], envState: next, accepted: true };
    }

    const clickedIndex = layout.fileRowRects.findIndex((row) => pointInRect(point, row));
    if (clickedIndex === -1) {
      // Click on empty area: deselect any selected file (like real Ubuntu file manager)
      const next = produce(state, (draft) => {
        draft.appStates.fileExplorer[window.id].selectedFileId = undefined;
      });
      return { appState: next.appStates.fileExplorer[window.id], envState: next, accepted: true };
    }

    const next = produce(state, (draft) => {
      const nextExplorer = draft.appStates.fileExplorer[window.id];
      const file = files[clickedIndex];
      if (isDoubleClick && file.kind === "folder") {
        nextExplorer.currentDirectory = file.path;
        nextExplorer.selectedFileId = undefined;
        nextExplorer.renameMode = undefined;
        return;
      }
      nextExplorer.selectedFileId = file.id;
    });
    return { appState: next.appStates.fileExplorer[window.id], envState: next, accepted: true };
  }

  if (action.type === "RIGHT_CLICK") {
    const layout = getFileExplorerLayout(window.bounds, files.length);
    const clickedIndex = layout.fileRowRects.findIndex((row) => pointInRect(point, row));
    if (clickedIndex === -1) {
      // Right-click on empty area: deselect and accept (could trigger desktop context menu)
      const next = produce(state, (draft) => {
        draft.appStates.fileExplorer[window.id].selectedFileId = undefined;
      });
      return { appState: next.appStates.fileExplorer[window.id], envState: next, accepted: true };
    }

    const next = produce(state, (draft) => {
      const nextExplorer = draft.appStates.fileExplorer[window.id];
      const file = files[clickedIndex];
      nextExplorer.selectedFileId = file.id;
      nextExplorer.renameMode = {
        fileId: file.id,
        draft: file.name,
        replaceOnType: true
      };
    });
    return { appState: next.appStates.fileExplorer[window.id], envState: next, accepted: true };
  }

  if (action.type === "TYPING") {
    if (!explorer.renameMode) {
      return null;
    }
    const next = produce(state, (draft) => {
      const nextExplorer = draft.appStates.fileExplorer[window.id];
      nextExplorer.renameMode!.draft = nextExplorer.renameMode!.replaceOnType
        ? action.text
        : `${nextExplorer.renameMode!.draft}${action.text}`;
      nextExplorer.renameMode!.replaceOnType = false;
    });
    return { appState: next.appStates.fileExplorer[window.id], envState: next, accepted: true };
  }

  if (action.type === "PRESS") {
    const lower = action.key.toLowerCase();
    if (!explorer.renameMode && lower !== "f2") {
      return null;
    }

    let handled = false;
    const next = produce(state, (draft) => {
      const nextExplorer = draft.appStates.fileExplorer[window.id];

      if (lower === "f2" && nextExplorer.selectedFileId) {
        const file = getFileEntry(draft.fileSystem, nextExplorer.selectedFileId);
        if (!file) {
          return;
        }
        nextExplorer.renameMode = {
          fileId: nextExplorer.selectedFileId,
          draft: file.name,
          replaceOnType: true
        };
        handled = true;
        return;
      }

      if (lower === "delete" && nextExplorer.selectedFileId && !nextExplorer.renameMode) {
        const fileId = nextExplorer.selectedFileId;
        const deleted = deleteFileWithCleanup(draft as EnvState, fileId);
        draft.fileSystem = deleted.fileSystem;
        draft.appStates.noteEditor = deleted.appStates.noteEditor;
        draft.windows = deleted.windows;
        handled = true;
        return;
      }

      if (!nextExplorer.renameMode) {
        return;
      }

      if (lower === "backspace") {
        nextExplorer.renameMode.draft = nextExplorer.renameMode.draft.slice(0, -1);
        nextExplorer.renameMode.replaceOnType = false;
        handled = true;
        return;
      }

      if (lower === "escape") {
        nextExplorer.renameMode = undefined;
        handled = true;
        return;
      }

      if (lower === "enter") {
        draft.fileSystem = renameFile(draft.fileSystem, nextExplorer.renameMode.fileId, nextExplorer.renameMode.draft);
        nextExplorer.renameMode = undefined;
        // Sync window titles (TODO: syncWindowTitles)
        handled = true;
        return;
      }
    });
    if (handled) {
      return { appState: next.appStates.fileExplorer[window.id], envState: next, accepted: true };
    }
    return null;
  }

  if (action.type === "SCROLL") {
    const direction = action.dy > 0 ? 1 : action.dy < 0 ? -1 : 0;
    if (direction === 0) {
      return null;
    }

    if (files.length === 0) {
      return null;
    }

    const next = produce(state, (draft) => {
      const nextExplorer = draft.appStates.fileExplorer[window.id];
      const currentIndex = files.findIndex((file) => file.id === nextExplorer.selectedFileId);
      const newIndex = Math.max(0, Math.min(files.length - 1, (currentIndex === -1 ? 0 : currentIndex) + direction));
      nextExplorer.selectedFileId = files[newIndex].id;
    });
    return { appState: next.appStates.fileExplorer[window.id], envState: next, accepted: true };
  }

  return null;
}

export const fileExplorerPlugin: AppPlugin<FileExplorerState> = {
  id: "file-explorer",
  title: "File Explorer",
  create() {
    return {
      id: "explorer-1",
      currentPlace: "workspace",
      currentDirectory: "/workspace"
    };
  },
  reduce(state) {
    return state;
  },
  buildA11y(state, ctx: BuildContext) {
    const files = getFilesInDirectory(ctx.envState.fileSystem, state.currentDirectory);
    const layout = getFileExplorerLayout(ctx.window.bounds, files.length);
    return [
      {
        id: `${ctx.window.id}-window`,
        role: "window",
        name: ctx.window.title,
        bounds: ctx.window.bounds,
        visible: !ctx.window.minimized,
        enabled: true,
        focusable: true,
        focused: ctx.window.focused,
        children: [
          ...SIDEBAR_PLACES.map((place, index) => ({
            id: `${ctx.window.id}-sidebar-${place.toLowerCase()}`,
            role: "button" as const,
            name: place,
            bounds: layout.sidebarItemRects[index],
            visible: true,
            enabled: true,
            focusable: true,
            focused: state.currentPlace === place,
            children: []
          })),
          {
            id: `${ctx.window.id}-list`,
            role: "list",
            name: "Files",
            bounds: layout.listBounds,
            visible: true,
            enabled: true,
            focusable: true,
            focused: ctx.window.focused,
            children: files.map((file, index) =>
              buildFileNode(file, layout.fileRowRects[index], state.selectedFileId === file.id)
            )
          },
          {
            id: `${ctx.window.id}-rename-hint`,
            role: "label",
            name: "Workspace files heading",
            text: state.renameMode ? `Renaming ${state.renameMode.draft}` : "Workspace files",
            bounds: layout.renameHintBounds,
            visible: true,
            enabled: true,
            focusable: false,
            focused: false,
            children: []
          }
        ]
      }
    ];
  },
  buildViewModel(state, ctx: BuildContext): FileExplorerViewModel {
    const files = getFilesInDirectory(ctx.envState.fileSystem, state.currentDirectory);
    // Compute canonical layout ONCE — shared by renderer, hit-tester, and a11y
    const layout = getFileExplorerLayout(ctx.window.bounds, files.length);
    return {
      type: "file-explorer",
      selectedFileId: state.selectedFileId,
      currentPlace: state.currentPlace,
      currentDirectory: state.currentDirectory,
      renameMode: state.renameMode,
      files,
      layout
    };
  }
};
