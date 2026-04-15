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
const SIDEBAR_SUPPLEMENTAL_MIN_TOOLBAR_WIDTH = 430;
const SIDEBAR_SUMMARY_HEIGHT = 54;
const SIDEBAR_SUMMARY_BOTTOM_MARGIN = 36;
const SIDEBAR_SECTION_HEADING_HEIGHT = 12;
const SIDEBAR_SECTION_HEADING_GAP = 10;
const SIDEBAR_SECTION_GAP = 18;
const SIDEBAR_SECTION_BOTTOM_GAP = 14;
const FAVORITES_ITEM_HEIGHT = 24;
const FAVORITES_ITEM_GAP = 4;
const STORAGE_ITEM_HEIGHT = 22;
const STORAGE_ITEM_GAP = 4;
const FAVORITES_COUNT = 3;
const STORAGE_COUNT = 3;
const FILE_LIST_HEADER_HEIGHT = 35;
const FILE_LIST_FOOTER_HEIGHT = 27;

export const FILE_EXPLORER_STACKED_LIST_MIN_WIDTH = 132;
export const FILE_EXPLORER_MIN_WINDOW_WIDTH = SIDEBAR_WIDTH + MAIN_PADDING * 2 + FILE_EXPLORER_STACKED_LIST_MIN_WIDTH;
export const FILE_EXPLORER_COMPACT_ROWS_BREAKPOINT = 340;
export const FILE_EXPLORER_STACKED_ROWS_BREAKPOINT = 200;

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
  const mainWidth = Math.max(0, bounds.width - SIDEBAR_WIDTH);
  const mainHeight = Math.max(0, bounds.height - HEADER_HEIGHT);
  const listWidth = Math.max(0, bounds.width - SIDEBAR_WIDTH - MAIN_PADDING * 2);
  const listHeight = Math.max(0, bounds.height - HEADER_HEIGHT - TOOLBAR_HEIGHT - MAIN_PADDING * 2 - 24);
  const compactRows = listWidth < FILE_EXPLORER_COMPACT_ROWS_BREAKPOINT;
  const stackedRows = listWidth < FILE_EXPLORER_STACKED_ROWS_BREAKPOINT;

  // ── Sidebar ──
  const sidebarBounds: Rect = {
    x: bounds.x,
    y: bounds.y + HEADER_HEIGHT,
    width: SIDEBAR_WIDTH,
    height: mainHeight
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
  const lastSidebarItemRect = sidebarItemRects[sidebarItemRects.length - 1];

  // ── Main area (right of sidebar) ──
  const mainX = bounds.x + SIDEBAR_WIDTH;
  const mainBounds: Rect = {
    x: mainX,
    y: bounds.y + HEADER_HEIGHT,
    width: mainWidth,
    height: mainHeight
  };

  // ── Toolbar (breadcrumb + search bar) ──
  const toolbarBounds: Rect = {
    x: mainX,
    y: bounds.y + HEADER_HEIGHT,
    width: mainWidth,
    height: TOOLBAR_HEIGHT
  };

  const backButtonBounds: Rect = {
    x: toolbarBounds.x + 16,
    y: toolbarBounds.y + 16,
    width: 22,
    height: 22
  };

  const canShowSidebarSupplemental = toolbarBounds.width >= SIDEBAR_SUPPLEMENTAL_MIN_TOOLBAR_WIDTH;
  const sectionHeadingX = sidebarBounds.x + 14;
  const sectionHeadingWidth = sidebarBounds.width - 28;
  const sectionItemX = sidebarBounds.x + 26;
  const sectionItemWidth = sidebarBounds.width - 40;
  const tentativeSidebarSummaryBounds = canShowSidebarSupplemental
    ? {
        x: sidebarBounds.x + 12,
        y: sidebarBounds.y + sidebarBounds.height - SIDEBAR_SUMMARY_HEIGHT - SIDEBAR_SUMMARY_BOTTOM_MARGIN,
        width: sidebarBounds.width - 24,
        height: SIDEBAR_SUMMARY_HEIGHT
      }
    : undefined;
  const sidebarSummaryBounds = tentativeSidebarSummaryBounds &&
    tentativeSidebarSummaryBounds.y >=
      (lastSidebarItemRect ? lastSidebarItemRect.y + lastSidebarItemRect.height + SIDEBAR_SECTION_GAP : sidebarBounds.y + SIDEBAR_SECTION_GAP)
    ? tentativeSidebarSummaryBounds
    : undefined;
  const sidebarContentFloor = sidebarSummaryBounds
    ? sidebarSummaryBounds.y - SIDEBAR_SECTION_BOTTOM_GAP
    : sidebarBounds.y + sidebarBounds.height - SIDEBAR_SECTION_BOTTOM_GAP;
  let sidebarSectionCursorY = lastSidebarItemRect
    ? lastSidebarItemRect.y + lastSidebarItemRect.height + SIDEBAR_SECTION_GAP
    : sidebarBounds.y + SIDEBAR_SECTION_GAP;
  let sidebarFavoritesHeadingBounds: Rect | undefined;
  let sidebarFavoriteItemRects: Rect[] = [];
  let sidebarStorageHeadingBounds: Rect | undefined;
  let sidebarStorageItemRects: Rect[] = [];

  const placeSection = (
    itemCount: number,
    itemHeight: number,
    itemGap: number
  ): { headingBounds: Rect; itemRects: Rect[] } | undefined => {
    const itemsHeight = itemCount * itemHeight + Math.max(0, itemCount - 1) * itemGap;
    const sectionHeight = SIDEBAR_SECTION_HEADING_HEIGHT + SIDEBAR_SECTION_HEADING_GAP + itemsHeight;
    if (sidebarSectionCursorY + sectionHeight > sidebarContentFloor) {
      return undefined;
    }

    const headingBounds: Rect = {
      x: sectionHeadingX,
      y: sidebarSectionCursorY,
      width: sectionHeadingWidth,
      height: SIDEBAR_SECTION_HEADING_HEIGHT
    };
    const itemRects: Rect[] = Array.from({ length: itemCount }, (_, index) => ({
      x: sectionItemX,
      y: sidebarSectionCursorY + SIDEBAR_SECTION_HEADING_HEIGHT + SIDEBAR_SECTION_HEADING_GAP + index * (itemHeight + itemGap),
      width: sectionItemWidth,
      height: itemHeight
    }));
    sidebarSectionCursorY += sectionHeight + SIDEBAR_SECTION_GAP;
    return { headingBounds, itemRects };
  };

  if (canShowSidebarSupplemental && (!sidebarSummaryBounds || sidebarSummaryBounds.y > sidebarSectionCursorY)) {
    const favoritesSection = placeSection(FAVORITES_COUNT, FAVORITES_ITEM_HEIGHT, FAVORITES_ITEM_GAP);
    if (favoritesSection) {
      sidebarFavoritesHeadingBounds = favoritesSection.headingBounds;
      sidebarFavoriteItemRects = favoritesSection.itemRects;
    }

    const storageSection = placeSection(STORAGE_COUNT, STORAGE_ITEM_HEIGHT, STORAGE_ITEM_GAP);
    if (storageSection) {
      sidebarStorageHeadingBounds = storageSection.headingBounds;
      sidebarStorageItemRects = storageSection.itemRects;
    }
  }

  // ── File list ──
  const sectionY = bounds.y + HEADER_HEIGHT + TOOLBAR_HEIGHT + MAIN_PADDING;
  const listY = sectionY + 24; // 24px for section heading
  const listBounds: Rect = {
    x: mainX + MAIN_PADDING,
    y: listY,
    width: listWidth,
    height: listHeight
  };
  const listHeaderHeight = Math.min(FILE_LIST_HEADER_HEIGHT, listBounds.height);
  const listFooterHeight = Math.min(FILE_LIST_FOOTER_HEIGHT, Math.max(0, listBounds.height - listHeaderHeight));
  const listHeaderBounds: Rect = {
    x: listBounds.x,
    y: listBounds.y,
    width: listBounds.width,
    height: listHeaderHeight
  };
  const listFooterBounds: Rect = {
    x: listBounds.x,
    y: listBounds.y + Math.max(0, listBounds.height - listFooterHeight),
    width: listBounds.width,
    height: listFooterHeight
  };
  const listViewportBounds: Rect = {
    x: listBounds.x,
    y: listHeaderBounds.y + listHeaderBounds.height,
    width: listBounds.width,
    height: Math.max(0, listFooterBounds.y - (listHeaderBounds.y + listHeaderBounds.height))
  };

  const fileRowRects: Rect[] = Array.from({ length: fileCount }).map((_, index) => ({
    x: listViewportBounds.x,
    y: listViewportBounds.y + index * ROW_HEIGHT,
    width: listViewportBounds.width,
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
    sidebarFavoritesHeadingBounds,
    sidebarFavoriteItemRects,
    sidebarStorageHeadingBounds,
    sidebarStorageItemRects,
    sidebarSummaryBounds,
    mainBounds,
    toolbarBounds,
    backButtonBounds,
    listBounds,
    listHeaderBounds,
    listViewportBounds,
    listFooterBounds,
    fileRowRects,
    renameHintBounds,
    compactRows,
    stackedRows
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
            bounds: layout.listViewportBounds,
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
      places: SIDEBAR_PLACES,
      renameMode: state.renameMode,
      files,
      layout
    };
  }
};
