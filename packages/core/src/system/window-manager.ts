import type { EnvState, Point, Rect, ResizeEdge, TaskbarItem, WindowInstance } from "../types.js";
import { pointInRect } from "./pointer.js";

export const WINDOW_FRAME_HEADER_HEIGHT = 40;
export const RESIZE_HANDLE_SIZE = 8; // pixels from edge that count as resize handle
const PINNED_APP_IDS = ["file-explorer", "browser-lite", "terminal-lite", "mail-lite"] as const;

export function getWindowFrameControls(bounds: Rect) {
  const controlsY = bounds.y + 14;
  return {
    titleBarBounds: {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: WINDOW_FRAME_HEADER_HEIGHT
    },
    closeButtonBounds: {
      x: bounds.x + 18,
      y: controlsY,
      width: 12,
      height: 12
    },
    minimizeButtonBounds: {
      x: bounds.x + 38,
      y: controlsY,
      width: 12,
      height: 12
    },
    maximizeButtonBounds: {
      x: bounds.x + 58,
      y: controlsY,
      width: 12,
      height: 12
    }
  };
}

export function cloneWindows(windows: WindowInstance[]): WindowInstance[] {
  return windows.map((window) => ({ ...window, bounds: { ...window.bounds } }));
}

export function getFocusedWindowId(state: EnvState): string | undefined {
  if (state.popups.length > 0) {
    return state.popups[state.popups.length - 1]?.id;
  }
  return state.windows.find((window) => window.focused)?.id;
}

export function nextZIndex(state: EnvState): number {
  return state.windows.reduce((max, window) => Math.max(max, window.zIndex), 0) + 1;
}

export function focusWindow(state: EnvState, windowId: string): EnvState {
  const target = state.windows.find((window) => window.id === windowId);
  if (!target || target.focused) {
    return state;
  }
  const windows = cloneWindows(state.windows).map((window) => ({
    ...window,
    focused: window.id === windowId,
    zIndex: window.id === windowId ? nextZIndex(state) : window.zIndex
  }));
  return { ...state, windows };
}

export function raiseWindow(state: EnvState, windowId: string): EnvState {
  const target = state.windows.find((window) => window.id === windowId);
  if (!target) {
    return state;
  }

  const highestZIndex = state.windows.reduce((max, window) => Math.max(max, window.zIndex), 0);
  if (target.zIndex === highestZIndex) {
    return state;
  }

  return {
    ...state,
    windows: cloneWindows(state.windows).map((window) => ({
      ...window,
      zIndex: window.id === windowId ? highestZIndex + 1 : window.zIndex
    }))
  };
}

export function minimizeAllWindows(state: EnvState): EnvState {
  return {
    ...state,
    windows: cloneWindows(state.windows).map((window) => ({
      ...window,
      minimized: true,
      focused: false
    }))
  };
}

export function minimizeWindow(state: EnvState, windowId: string): EnvState {
  const windows = cloneWindows(state.windows).map((window) =>
    window.id === windowId ? { ...window, minimized: true, focused: false } : { ...window }
  );
  const fallback = windows
    .filter((window) => !window.minimized)
    .sort((left, right) => right.zIndex - left.zIndex)[0];

  return {
    ...state,
    windows: windows.map((window) => ({
      ...window,
      focused: window.id === fallback?.id
    }))
  };
}

export function restoreWindow(state: EnvState, windowId: string): EnvState {
  return focusWindow(
    {
      ...state,
      windows: cloneWindows(state.windows).map((window) =>
        window.id === windowId ? { ...window, minimized: false } : { ...window }
      )
    },
    windowId
  );
}

export function toggleMaximizeWindow(state: EnvState, windowId: string): EnvState {
  const viewportBounds: Rect = {
    x: 88,
    y: 44,
    width: state.viewport.width - 106,
    height: state.viewport.height - 60
  };

  const windows = cloneWindows(state.windows).map((window) => {
    if (window.id !== windowId) {
      return { ...window };
    }

    if (window.maximized) {
      return {
        ...window,
        bounds: window.restoredBounds ? { ...window.restoredBounds } : { ...window.bounds },
        restoredBounds: undefined,
        maximized: false,
        minimized: false
      };
    }

    return {
      ...window,
      restoredBounds: window.restoredBounds ? { ...window.restoredBounds } : { ...window.bounds },
      bounds: viewportBounds,
      maximized: true,
      minimized: false
    };
  });

  return focusWindow({ ...state, windows }, windowId);
}

export function closeWindow(state: EnvState, windowId: string): EnvState {
  const windows = cloneWindows(state.windows).filter((window) => window.id !== windowId);
  const fallback = windows
    .filter((window) => !window.minimized)
    .sort((left, right) => right.zIndex - left.zIndex)[0];

  // Clean up orphaned app states for the closed window
  const appStates = { ...state.appStates };
  for (const key of Object.keys(appStates) as Array<keyof typeof appStates>) {
    const bucket = appStates[key] as Record<string, unknown>;
    if (windowId in bucket) {
      const clone = { ...bucket };
      delete clone[windowId];
      (appStates as Record<string, unknown>)[key] = clone;
    }
  }

  return {
    ...state,
    appStates,
    // Clear dragState if the closed window was being dragged
    dragState: state.dragState?.windowId === windowId ? undefined : state.dragState,
    windows: windows.map((window) => ({
      ...window,
      focused: window.id === fallback?.id
    }))
  };
}

export function getTopmostWindowAtPoint(state: EnvState, point: Point): WindowInstance | undefined {
  return cloneWindows(state.windows)
    .filter((window) => !window.minimized && pointInRect(point, window.bounds))
    .sort((left, right) => right.zIndex - left.zIndex)[0];
}

export function getTaskbarItems(state: EnvState): TaskbarItem[] {
  const itemWidth = 56;
  const itemHeight = 56;
  const x = 10;
  const startY = 84;
  const iconLabels: Record<string, string> = {
    "file-explorer": "FI",
    "note-editor": "TXT",
    "browser-lite": "WEB",
    "terminal-lite": "TERM",
    "mail-lite": "MAIL"
  };
  const titles: Record<string, string> = {
    "file-explorer": "Files",
    "browser-lite": "Mozilla Firefox",
    "terminal-lite": "Terminal",
    "mail-lite": "Thunderbird"
  };
  const items: TaskbarItem[] = [];
  const sortedWindows = state.windows.slice().sort((left, right) => right.zIndex - left.zIndex);

  for (const appId of PINNED_APP_IDS) {
    const primaryWindow = sortedWindows.find((window) => window.appId === appId);
    items.push({
      windowId: primaryWindow?.id ?? `launcher-${appId}`,
      title: primaryWindow?.title ?? titles[appId] ?? appId,
      appId,
      pinned: true,
      running: Boolean(primaryWindow),
      iconLabel: iconLabels[appId] ?? "APP",
      bounds: {
        x,
        y: startY + items.length * (itemHeight + 10),
        width: itemWidth,
        height: itemHeight
      }
    });
  }

  const noteWindows = state.windows
    .slice()
    .filter((window) => window.appId === "note-editor")
    .sort((left, right) => left.zIndex - right.zIndex);

  for (const window of noteWindows) {
    items.push({
      windowId: window.id,
      title: window.title,
      appId: window.appId,
      pinned: false,
      running: true,
      iconLabel: iconLabels[window.appId] ?? "APP",
      bounds: {
        x,
        y: startY + items.length * (itemHeight + 10),
        width: itemWidth,
        height: itemHeight
      }
    });
  }

  return items;
}

export function getPopupBounds(viewport: { width: number; height: number }): Rect {
  return {
    x: Math.round((viewport.width - 420) / 2),
    y: Math.round((viewport.height - 240) / 2),
    width: 420,
    height: 240
  };
}

export function getResizeEdge(window: WindowInstance, point: Point): ResizeEdge | null {
  if (window.minimized || window.maximized) return null;

  const { x, y, width, height } = window.bounds;
  const r = RESIZE_HANDLE_SIZE;

  // Must be within window bounds + handle tolerance
  if (point.x < x - r || point.x > x + width + r ||
      point.y < y - r || point.y > y + height + r) {
    return null;
  }

  const onLeft = point.x >= x - r && point.x <= x + r;
  const onRight = point.x >= x + width - r && point.x <= x + width + r;
  const onTop = point.y >= y - r && point.y <= y + r;
  const onBottom = point.y >= y + height - r && point.y <= y + height + r;

  // Corners first (more specific)
  if (onTop && onLeft) return "nw";
  if (onTop && onRight) return "ne";
  if (onBottom && onLeft) return "sw";
  if (onBottom && onRight) return "se";

  // Edges
  if (onTop) return "n";
  if (onBottom) return "s";
  if (onLeft) return "w";
  if (onRight) return "e";

  return null;
}
