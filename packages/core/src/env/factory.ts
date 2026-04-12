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
import { BROWSER_BOOKMARKS, BROWSER_HELP_TOPICS, BROWSER_TASK_CATEGORIES } from "../browser-fixtures.js";
import { nextZIndex } from "../system/window-manager.js";

export const GNOME_TOP_BAR_HEIGHT = 32;
export const GNOME_DOCK_WIDTH = 76;

export const DEFAULT_VIEWPORT: Viewport = {
  width: 1280,
  height: 800
};

export function createFile(id: string, name: string, content: string): FileEntry {
  return {
    id,
    name,
    content,
    path: `/workspace/${name}`
  };
}

export function createEmptyEnv(viewport: Viewport, instruction?: string): EnvState {
  return {
    viewport,
    pointer: {
      x: 120,
      y: 80,
      buttonsPressed: []
    },
    keyboard: {
      pressedKeys: []
    },
    clipboard: {
      text: ""
    },
    fileSystem: {
      cwd: "/workspace",
      files: {},
      order: []
    },
    windows: [],
    appStates: {
      fileExplorer: {},
      noteEditor: {},
      browserLite: {},
      terminalLite: {},
      mailLite: {}
    },
    popups: [],
    taskbarHeight: 48,
    instruction
  };
}

export function addFiles(envState: EnvState, files: FileEntry[]) {
  const next = structuredClone(envState);
  for (const file of files) {
    next.fileSystem.files[file.id] = file;
    next.fileSystem.order.push(file.id);
  }
  return next;
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
  const next = structuredClone(envState);
  if (focused) {
    next.windows = next.windows.map((window) => ({ ...window, focused: false }));
  }
  next.windows.push(
    createWindow(windowId, "file-explorer", "Files", bounds, nextZIndex(next), focused, minimized, false)
  );
  const explorerState: FileExplorerState = {
    id: windowId
  };
  next.appStates.fileExplorer[windowId] = explorerState;
  return next;
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
  const next = structuredClone(envState);
  if (focused) {
    next.windows = next.windows.map((window) => ({ ...window, focused: false }));
  }
  const file = next.fileSystem.files[fileId];
  next.windows.push(
    createWindow(
      windowId,
      "note-editor",
      file?.name ?? "Untitled",
      bounds,
      nextZIndex(next),
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
    dirty
  };
  next.appStates.noteEditor[windowId] = noteState;
  return next;
}

export function addBrowserWindow(
  envState: EnvState,
  windowId: string,
  bounds: Rect,
  focused = false,
  minimized = true
) {
  const next = structuredClone(envState);
  if (focused) {
    next.windows = next.windows.map((window) => ({ ...window, focused: false }));
  }
  next.windows.push(
    createWindow(
      windowId,
      "browser-lite",
      "Mozilla Firefox",
      bounds,
      nextZIndex(next),
      focused,
      minimized,
      false
    )
  );
  const browserState: BrowserLiteState = {
    id: windowId,
    appName: "Mozilla Firefox",
    url: "https://os-world.github.io/explorer.html",
    pageTitle: "OSWorld Explorer",
    currentPage: "explorer",
    tabs: [
      { id: `${windowId}-tab-1`, title: "OSWorld Explorer", active: true },
      { id: `${windowId}-tab-2`, title: "Ubuntu help", active: false }
    ],
    bookmarks: structuredClone(BROWSER_BOOKMARKS),
    categories: structuredClone(BROWSER_TASK_CATEGORIES),
    selectedCategoryId: "workflow",
    selectedTaskId: "workflow_mail_bridge",
    helpTopics: structuredClone(BROWSER_HELP_TOPICS),
    selectedHelpTopicId: BROWSER_HELP_TOPICS[0]?.id ?? "",
    helpLines: [...(BROWSER_HELP_TOPICS[0]?.lines ?? [])],
    lastOpenedBookmarkId: undefined
  };
  next.appStates.browserLite[windowId] = browserState;
  return next;
}

export function addTerminalWindow(
  envState: EnvState,
  windowId: string,
  bounds: Rect,
  focused = false,
  minimized = true
) {
  const next = structuredClone(envState);
  if (focused) {
    next.windows = next.windows.map((window) => ({ ...window, focused: false }));
  }
  next.windows.push(
    createWindow(
      windowId,
      "terminal-lite",
      "Terminal",
      bounds,
      nextZIndex(next),
      focused,
      minimized,
      false
    )
  );
  const terminalState: TerminalLiteState = {
    id: windowId,
    cwd: "/workspace",
    prompt: "baghyeonbin@ubuntu",
    status: "idle",
    lines: [
      "Welcome to Ubuntu Terminal",
      "Supported commands: pwd, ls, cat <file>"
    ],
    input: "",
    lastCommand: "",
    lastOutput: "",
    executedCommands: []
  };
  next.appStates.terminalLite[windowId] = terminalState;
  return next;
}

export function addMailWindow(
  envState: EnvState,
  windowId: string,
  bounds: Rect,
  focused = false,
  minimized = true
) {
  const next = structuredClone(envState);
  if (focused) {
    next.windows = next.windows.map((window) => ({ ...window, focused: false }));
  }
  next.windows.push(
    createWindow(
      windowId,
      "mail-lite",
      "Thunderbird",
      bounds,
      nextZIndex(next),
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
        sender: "OSWorld Team",
        subject: "Ubuntu desktop task pack",
        preview: "Review browser, mail, terminal, and files workflow coverage.",
        body: [
          "Hi team,",
          "Review browser, mail, terminal, and files workflow coverage.",
          "This task pack mirrors representative OSWorld desktop scenarios."
        ]
      },
      {
        id: "msg-2",
        folderId: "inbox",
        sender: "Research Ops",
        subject: "Mock environment notes",
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
    ]
  };
  next.appStates.mailLite[windowId] = mailState;
  return next;
}

export function launchAppWindow(envState: EnvState, appId: string) {
  if (appId === "file-explorer") {
    return addExplorerWindow(
      envState,
      "explorer-main",
      { x: 84, y: 82, width: 340, height: 446 },
      true,
      false
    );
  }

  if (appId === "browser-lite") {
    return addBrowserWindow(
      envState,
      "browser-main",
      { x: 440, y: 82, width: 550, height: 360 },
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
      { x: 1000, y: 82, width: 280, height: 420 },
      true,
      false
    );
  }

  return envState;
}
