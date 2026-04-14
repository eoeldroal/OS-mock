import type { ContextMenuItem, ContextMenuState, Point, Rect } from "../types.js";

export const CONTEXT_MENU_ITEM_HEIGHT = 32;
export const CONTEXT_MENU_WIDTH = 200;
export const CONTEXT_MENU_PADDING = 4;

export function createContextMenu(
  items: ContextMenuItem[],
  position: Point,
  sourceWindowId?: string
): ContextMenuState {
  return { items, position, sourceWindowId };
}

export function getContextMenuBounds(menu: ContextMenuState): Rect {
  const height = menu.items.length * CONTEXT_MENU_ITEM_HEIGHT + CONTEXT_MENU_PADDING * 2;
  return {
    x: menu.position.x,
    y: menu.position.y,
    width: CONTEXT_MENU_WIDTH,
    height
  };
}

export function getContextMenuItemBounds(menu: ContextMenuState, index: number): Rect {
  return {
    x: menu.position.x + CONTEXT_MENU_PADDING,
    y: menu.position.y + CONTEXT_MENU_PADDING + index * CONTEXT_MENU_ITEM_HEIGHT,
    width: CONTEXT_MENU_WIDTH - CONTEXT_MENU_PADDING * 2,
    height: CONTEXT_MENU_ITEM_HEIGHT
  };
}

// Standard context menus for each app
export function getFileExplorerContextMenu(hasSelection: boolean): ContextMenuItem[] {
  return [
    { id: "open", label: "Open", enabled: hasSelection },
    { id: "rename", label: "Rename", enabled: hasSelection, shortcut: "F2" },
    { id: "delete", label: "Delete", enabled: hasSelection, shortcut: "Delete" },
    { id: "new-file", label: "New File", enabled: true },
    { id: "new-folder", label: "New Folder", enabled: true }
  ];
}

export function getNoteEditorContextMenu(hasSelection: boolean): ContextMenuItem[] {
  return [
    { id: "cut", label: "Cut", enabled: hasSelection, shortcut: "Ctrl+X" },
    { id: "copy", label: "Copy", enabled: hasSelection, shortcut: "Ctrl+C" },
    { id: "paste", label: "Paste", enabled: true, shortcut: "Ctrl+V" },
    { id: "select-all", label: "Select All", enabled: true, shortcut: "Ctrl+A" }
  ];
}

export function getTerminalContextMenu(hasSelection: boolean): ContextMenuItem[] {
  return [
    { id: "copy", label: "Copy", enabled: hasSelection, shortcut: "Ctrl+C" },
    { id: "paste", label: "Paste", enabled: true, shortcut: "Ctrl+V" },
    { id: "clear", label: "Clear Terminal", enabled: true }
  ];
}

export function getDesktopContextMenu(): ContextMenuItem[] {
  return [
    { id: "new-file", label: "New File", enabled: true },
    { id: "new-folder", label: "New Folder", enabled: true },
    { id: "open-terminal", label: "Open Terminal", enabled: true },
    { id: "settings", label: "Settings", enabled: false }
  ];
}
