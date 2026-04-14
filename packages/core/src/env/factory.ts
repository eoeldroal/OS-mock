import type {
  BrowserLiteState,
  EnvState,
  FileEntry,
  FileExplorerState,
  MailLiteState,
  NoteEditorState,
  Rect,
  TerminalLiteState,
  Viewport,
  WindowInstance
} from "../types.js";
import { produce, setAutoFreeze } from "immer";
import { nextZIndex } from "../system/window-manager.js";
import { createEmptyFileSystemState, createFileEntry, getFileEntry, insertFileEntry } from "../system/filesystem.js";
import { BROWSER_BOOKMARKS, BROWSER_HELP_TOPICS, BROWSER_TASK_CATEGORIES } from "../browser-fixtures.js";

// Disable auto-freeze so task setup functions can mutate state returned by produce.
// Freezing is a dev-time safety net; our reducer architecture already ensures immutability.
setAutoFreeze(false);

export const GNOME_TOP_BAR_HEIGHT = 32;
export const GNOME_DOCK_WIDTH = 76;

export const DEFAULT_VIEWPORT: Viewport = {
  width: 1280,
  height: 800
};

export function createFile(
  id: string,
  name: string,
  content: string,
  options?: {
    directory?: string;
    kind?: FileEntry["kind"];
  }
): FileEntry {
  return createFileEntry(
    id,
    name,
    content,
    options?.directory,
    options?.kind
  );
}

export function createEmptyEnv(viewport: Viewport, instruction?: string): EnvState {
  return {
    viewport,
    nextEntityId: 1,
    pointer: {
      x: 120,
      y: 80,
      buttonsPressed: []
    },
    keyboard: {
      pressedKeys: []
    },
    dragState: undefined,
    resizeState: undefined,
    clipboard: {
      text: ""
    },
    fileSystem: createEmptyFileSystemState(),
    windows: [],
    appStates: {
      fileExplorer: {},
      noteEditor: {},
      browserLite: {},
      terminalLite: {},
      mailLite: {}
    },
    popups: [],
    contextMenu: undefined,
    taskbarHeight: 48,
    desktopIcons: [
      {
        id: "desktop-home",
        label: "Home",
        appId: "file-explorer",
        position: { x: 100, y: 60 },
        bounds: { x: 88, y: 44, width: 72, height: 72 }
      },
      {
        id: "desktop-documents",
        label: "Documents",
        appId: "file-explorer",
        position: { x: 100, y: 152 },
        bounds: { x: 88, y: 136, width: 88, height: 72 }
      },
      {
        id: "desktop-downloads",
        label: "Downloads",
        appId: "file-explorer",
        position: { x: 100, y: 244 },
        bounds: { x: 88, y: 228, width: 88, height: 72 }
      },
      {
        id: "desktop-trash",
        label: "Trash",
        action: "open-trash",
        position: { x: 100, y: 336 },
        bounds: { x: 88, y: 320, width: 72, height: 72 }
      },
      {
        id: "desktop-notes",
        label: "notes.txt",
        appId: "note-editor",
        position: { x: 100, y: 428 },
        bounds: { x: 88, y: 412, width: 88, height: 72 }
      }
    ],
    instruction
  };
}

export function addFiles(envState: EnvState, files: FileEntry[]) {
  return produce(envState, draft => {
    for (const file of files) {
      draft.fileSystem = insertFileEntry(draft.fileSystem, file);
    }
  });
}

export function createWindow(
  id: string,
  appId: string,
  title: string,
  bounds: Rect,
  zIndex: number,
  focused = false,
  minimized = false,
  maximized = false,
  restoredBounds?: Rect
): WindowInstance {
  return {
    id,
    appId,
    title,
    bounds,
    restoredBounds,
    zIndex,
    focused,
    minimized,
    maximized
  };
}

export function addExplorerWindow(
  envState: EnvState,
  windowId: string,
  bounds: Rect,
  focused = true,
  minimized = false
) {
  return produce(envState, draft => {
    if (focused) {
      draft.windows = draft.windows.map((window) => ({ ...window, focused: false }));
    }
    draft.windows.push(
      createWindow(windowId, "file-explorer", "Files", bounds, nextZIndex(draft), focused, minimized, false)
    );
    const explorerState: FileExplorerState = {
      id: windowId,
      currentPlace: "workspace",
      currentDirectory: draft.fileSystem.roots.workspace
    };
    draft.appStates.fileExplorer[windowId] = explorerState;
  });
}

export function addNoteEditorWindow(
  envState: EnvState,
  windowId: string,
  fileId: string,
  bounds: Rect,
  focused = true,
  buffer?: string,
  dirty = false,
  minimized = false
) {
  return produce(envState, draft => {
    if (focused) {
      draft.windows = draft.windows.map((window) => ({ ...window, focused: false }));
    }
    const file = getFileEntry(draft.fileSystem, fileId);
    draft.windows.push(
      createWindow(
        windowId,
        "note-editor",
        file?.name ?? "Untitled",
        bounds,
        nextZIndex(draft),
        focused,
        minimized,
        false
      )
    );
    const noteState: NoteEditorState = {
      id: windowId,
      fileId,
      buffer: buffer ?? file?.content ?? "",
      cursorIndex: (buffer ?? file?.content ?? "").length,
      dirty,
      undoStack: [],
      redoStack: []
    };
    draft.appStates.noteEditor[windowId] = noteState;
  });
}

export function addBrowserWindow(
  envState: EnvState,
  windowId: string,
  bounds: Rect,
  focused = false,
  minimized = true
) {
  return produce(envState, draft => {
    if (focused) {
      draft.windows = draft.windows.map((window) => ({ ...window, focused: false }));
    }
    draft.windows.push(
      createWindow(
        windowId,
        "browser-lite",
        "Mozilla Firefox",
        bounds,
        nextZIndex(draft),
        focused,
        minimized,
        false
      )
    );
    const browserState: BrowserLiteState = {
      id: windowId,
      appName: "Mozilla Firefox",
      renderMode: "hybrid",
      url: "https://www.google.com",
      addressInput: "https://www.google.com",
      addressBarFocused: false,
      addressReplaceOnType: false,
      pageTitle: "Google",
      currentPage: "external",
      tabs: [
        { id: `${windowId}-tab-1`, title: "Google", active: true },
        { id: `${windowId}-tab-2`, title: "Task Board", active: false }
      ],
      bookmarks: structuredClone(BROWSER_BOOKMARKS),
      categories: structuredClone(BROWSER_TASK_CATEGORIES),
      selectedCategoryId: "",
      selectedTaskId: "",
      helpTopics: structuredClone(BROWSER_HELP_TOPICS),
      selectedHelpTopicId: BROWSER_HELP_TOPICS[0]?.id ?? "",
      helpLines: [...(BROWSER_HELP_TOPICS[0]?.lines ?? [])],
      lastOpenedBookmarkId: undefined,
      selectedHelpLineIndex: undefined
    };
    draft.appStates.browserLite[windowId] = browserState;
  });
}

export function addTerminalWindow(
  envState: EnvState,
  windowId: string,
  bounds: Rect,
  focused = false,
  minimized = true
) {
  return produce(envState, draft => {
    if (focused) {
      draft.windows = draft.windows.map((window) => ({ ...window, focused: false }));
    }
    draft.windows.push(
      createWindow(
        windowId,
        "terminal-lite",
        "Terminal",
        bounds,
        nextZIndex(draft),
        focused,
        minimized,
        false
      )
    );
    const terminalState: TerminalLiteState = {
      id: windowId,
      cwd: draft.fileSystem.cwd,
      prompt: "baghyeonbin@ubuntu",
      status: "idle",
      lines: [],
      input: "",
      lastCommand: "",
      lastOutput: "",
      executedCommands: [],
      historyIndex: -1,
      selectedLineIndex: undefined
    };
    draft.appStates.terminalLite[windowId] = terminalState;
  });
}

export function addMailWindow(
  envState: EnvState,
  windowId: string,
  bounds: Rect,
  focused = false,
  minimized = true
) {
  return produce(envState, draft => {
    if (focused) {
      draft.windows = draft.windows.map((window) => ({ ...window, focused: false }));
    }
    draft.windows.push(
      createWindow(
        windowId,
        "mail-lite",
        "Thunderbird",
        bounds,
        nextZIndex(draft),
        focused,
        minimized,
        false
      )
    );
    const mailState: MailLiteState = {
      id: windowId,
      selectedFolder: "inbox",
      folders: [
        { id: "inbox", name: "Inbox", unread: 3 },
        { id: "drafts", name: "Drafts", unread: 1 },
        { id: "sent", name: "Sent", unread: 0 },
        { id: "archive", name: "Archive", unread: 0 }
      ],
      messages: [
        {
          id: "msg-1",
          folderId: "inbox",
          sender: "Desktop Team",
          subject: "Ubuntu desktop task pack",
          preview: "Review browser, mail, terminal, and files workflow coverage.",
          body: [
            "Hi team,",
            "Review browser, mail, terminal, and files workflow coverage.",
            "This task pack covers representative desktop scenarios."
          ]
        },
        {
          id: "msg-2",
          folderId: "inbox",
          sender: "Research Ops",
          subject: "Workspace notes",
          preview: "Remember to test perturbations while the viewer is open.",
          body: [
            "Hi team,",
            "Remember to test perturbations while the viewer is open.",
            "Please keep the viewer and a11y tree aligned while validating tasks."
          ]
        }
      ],
      selectedMessageId: "msg-1",
      previewBody: [
        "Hi team,",
        "Review browser, mail, terminal, and files workflow coverage.",
        "This task pack mirrors representative OSWorld desktop scenarios."
      ],
      selectedPreviewLineIndex: undefined
    };
    draft.appStates.mailLite[windowId] = mailState;
  });
}

export function launchAppWindow(envState: EnvState, appId: string) {
  if (appId === "file-explorer") {
    return addExplorerWindow(
      envState,
      "explorer-main",
      { x: 84, y: 82, width: 388, height: 460 },
      true,
      false
    );
  }

  if (appId === "browser-lite") {
    return addBrowserWindow(
      envState,
      "browser-main",
      { x: 492, y: 82, width: 760, height: 420 },
      true,
      false
    );
  }

  if (appId === "terminal-lite") {
    return addTerminalWindow(
      envState,
      "terminal-main",
      { x: 440, y: 460, width: 520, height: 240 },
      true,
      false
    );
  }

  if (appId === "mail-lite") {
    return addMailWindow(
      envState,
      "mail-main",
      { x: 792, y: 82, width: 460, height: 460 },
      true,
      false
    );
  }

  return envState;
}
