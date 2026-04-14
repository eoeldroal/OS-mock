import {
  addBrowserWindow,
  addExplorerWindow,
  addMailWindow,
  addNoteEditorWindow,
  addTerminalWindow,
  createEmptyEnv
} from "../env/factory.js";
import {
  createFileEntry,
  ensureDirectoryPath,
  getFileDirectory,
  getFilesInDirectory,
  insertFileEntry,
  normalizeDirectory,
  setWorkingDirectory
} from "../system/filesystem.js";
import { getBrowserHelpTopic } from "../browser-fixtures.js";
import { focusWindow, raiseWindow } from "../system/window-manager.js";
import type { BrowserLiteState, EnvState, FileEntry } from "../types.js";
import type {
  BrowserScenarioContext,
  BrowserScenarioOptions,
  BrowserScenarioStart,
  CompanionWindowOptions,
  ExplorerWorkspaceScenarioOptions,
  MailScenarioContext,
  MailScenarioOptions,
  MailSetupOptions,
  NoteTargetOptions,
  ScenarioContext,
  ScenarioExplorerWindowOptions,
  ScenarioNoteWindowOptions,
  ScenarioFileDefinition,
  Team3MailFolder,
  Team3MailMessage,
  TerminalScenarioContext,
  TerminalScenarioOptions,
  TerminalSetupOptions
} from "./scenario-types.js";

export function createScenarioFile(
  id: string,
  name: string,
  content: string,
  directory: string,
  kind: FileEntry["kind"] = "file"
): FileEntry {
  return createFileEntry(id, name, content, directory, kind);
}

export function createNoteTargets(targetFileId: string, expectedSavedContent: string) {
  return {
    targetFileId,
    appendText: expectedSavedContent,
    expectedSavedContent
  };
}

export function addScenarioEntries(envState: EnvState, entries: ScenarioFileDefinition[]): EnvState {
  return entries.reduce((nextState, entry) => {
    const directory = normalizeDirectory(entry.directory ?? getFileDirectory(entry.path));
    return {
      ...nextState,
      fileSystem: insertFileEntry(
        ensureDirectoryPath(nextState.fileSystem, directory),
        createFileEntry(entry.id, entry.name, entry.content, directory, entry.kind ?? "file")
      )
    };
  }, envState);
}

function addScenarioExplorerWindow(envState: EnvState, options: ScenarioExplorerWindowOptions) {
  const windowId = options.windowId ?? "explorer-main";
  const nextState = addExplorerWindow(
    envState,
    windowId,
    options.bounds,
    options.focused ?? false,
    options.minimized ?? false
  );
  const explorerState = nextState.appStates.fileExplorer[windowId];
  if (options.currentPlace) {
    explorerState.currentPlace = options.currentPlace;
  }
  if (options.currentDirectory) {
    explorerState.currentDirectory = normalizeDirectory(options.currentDirectory);
  }
  if (options.selectedFileId) {
    explorerState.selectedFileId = options.selectedFileId;
  }
  return nextState;
}

function addScenarioNoteWindow(envState: EnvState, noteTarget: ScenarioNoteWindowOptions) {
  if (!noteTarget.preopen) {
    return { envState, noteWindowId: undefined };
  }
  const windowId = noteTarget.windowId ?? `notes-${noteTarget.fileId}`;
  const initialContent = noteTarget.buffer ?? noteTarget.initialContent ?? "";
  const nextState = addNoteEditorWindow(
    envState,
    windowId,
    noteTarget.fileId,
    noteTarget.bounds ?? { x: 968, y: 84, width: 300, height: 380 },
    noteTarget.focused ?? false,
    initialContent,
    noteTarget.dirty ?? false,
    noteTarget.minimized ?? false
  );
  return { envState: nextState, noteWindowId: windowId };
}

function finalizeWindowFocus(envState: EnvState, focusWindowId?: string) {
  if (!focusWindowId) {
    return envState;
  }
  return raiseWindow(focusWindow(envState, focusWindowId), focusWindowId);
}

function normalizeTaskBrowserTabs(browser: BrowserLiteState, active: "explorer" | "help") {
  browser.tabs = [
    {
      id: `${browser.id}-tab-1`,
      title: "Task Board",
      active: active === "explorer"
    },
    {
      id: `${browser.id}-tab-2`,
      title: "Ubuntu help",
      active: active === "help"
    }
  ];
}

export function configureBrowserStart(browser: BrowserLiteState, start: BrowserScenarioStart) {
  if (start.page === "help") {
    const topic = getBrowserHelpTopic(start.topicId ?? "dock-basics");
    normalizeTaskBrowserTabs(browser, "help");
    browser.currentPage = "help";
    browser.pageTitle = "Ubuntu help";
    browser.url = "https://help.ubuntu.com/desktop-guide";
    browser.selectedHelpTopicId = topic.id;
    browser.helpLines = [...topic.lines];
    return;
  }

  normalizeTaskBrowserTabs(browser, "explorer");
  browser.currentPage = "explorer";
  browser.pageTitle = "Task Board";
  browser.url = "https://workspace.local/task-board";
  browser.selectedCategoryId = start.categoryId ?? "workflow";
  browser.selectedTaskId = start.taskId ?? "workflow_mail_bridge";
}

export function openBrowserWithPage({
  instruction,
  viewport,
  start,
  browserWindowId = "browser-main",
  browserBounds,
  browserFocused = true,
  browserMinimized = false
}: Pick<
  BrowserScenarioOptions,
  | "instruction"
  | "viewport"
  | "start"
  | "browserWindowId"
  | "browserBounds"
  | "browserFocused"
  | "browserMinimized"
>): BrowserScenarioContext {
  const envState = addBrowserWindow(
    createEmptyEnv(viewport, instruction),
    browserWindowId,
    browserBounds,
    browserFocused,
    browserMinimized
  );
  const browserState = envState.appStates.browserLite[browserWindowId];
  configureBrowserStart(browserState, start);

  return {
    envState,
    browserState,
    browserWindowId,
    noteFileId: ""
  };
}

export function openBrowserNoteScenario({
  instruction,
  viewport,
  start,
  browserWindowId = "browser-main",
  browserBounds,
  browserFocused = true,
  browserMinimized = false,
  workspaceFiles = [],
  explorerWindow = false,
  noteTarget
}: BrowserScenarioOptions): BrowserScenarioContext {
  const browserScenario = openBrowserWithPage({
    instruction,
    viewport,
    start,
    browserWindowId,
    browserBounds,
    browserFocused,
    browserMinimized
  });

  const noteEntries = noteTarget
    ? [
        createScenarioFile(
          noteTarget.fileId,
          noteTarget.fileName,
          noteTarget.initialContent ?? "",
          normalizeDirectory(noteTarget.directory ?? "/workspace")
        )
      ]
    : [];
  let envState = addScenarioEntries(browserScenario.envState, [...noteEntries, ...workspaceFiles]);

  let explorerWindowId: string | undefined;
  if (explorerWindow) {
    explorerWindowId = explorerWindow.windowId ?? "explorer-main";
    envState = addScenarioExplorerWindow(envState, explorerWindow);
  }

  let noteWindowId: string | undefined;
  if (noteTarget?.preopen) {
    const built = addScenarioNoteWindow(envState, noteTarget);
    envState = built.envState;
    noteWindowId = built.noteWindowId;
  }

  const explicitFocusWindowId =
    noteTarget?.preopen && noteTarget.focused
      ? noteWindowId
      : explorerWindow && explorerWindow.focused
        ? explorerWindowId
        : browserFocused
          ? browserWindowId
          : undefined;
  envState = finalizeWindowFocus(envState, explicitFocusWindowId);

  return {
    envState,
    browserState: envState.appStates.browserLite[browserWindowId],
    browserWindowId,
    noteFileId: noteTarget?.fileId ?? "",
    noteWindowId,
    explorerWindowId
  };
}

function addOptionalBrowserWindow(envState: EnvState, options: CompanionWindowOptions | false | undefined) {
  if (!options) {
    return envState;
  }
  return addBrowserWindow(
    envState,
    options.windowId ?? "browser-main",
    options.bounds,
    options.focused ?? false,
    options.minimized ?? false
  );
}

function addOptionalTerminalWindow(envState: EnvState, options: CompanionWindowOptions | false | undefined) {
  if (!options) {
    return envState;
  }
  return addTerminalWindow(
    envState,
    options.windowId ?? "terminal-main",
    options.bounds,
    options.focused ?? false,
    options.minimized ?? false
  );
}

function addOptionalMailWindow(envState: EnvState, options: CompanionWindowOptions | false | undefined) {
  if (!options) {
    return envState;
  }
  return addMailWindow(
    envState,
    options.windowId ?? "mail-main",
    options.bounds,
    options.focused ?? false,
    options.minimized ?? false
  );
}

export function openExplorerWithFiles({
  instruction,
  viewport,
  files = [],
  explorerWindow = false,
  noteWindows = [],
  browserWindow = false,
  terminalWindow = false,
  mailWindow = false
}: ExplorerWorkspaceScenarioOptions): EnvState {
  let envState = createEmptyEnv(viewport, instruction);
  envState = addScenarioEntries(envState, files);
  const focusCandidates: string[] = [];

  if (explorerWindow) {
    envState = addScenarioExplorerWindow(envState, explorerWindow);
    if (explorerWindow.focused) {
      focusCandidates.push(explorerWindow.windowId ?? "explorer-main");
    }
  }

  for (const noteWindow of noteWindows) {
    const built = addScenarioNoteWindow(envState, noteWindow);
    envState = built.envState;
    if (noteWindow.preopen && noteWindow.focused && built.noteWindowId) {
      focusCandidates.push(built.noteWindowId);
    }
  }

  envState = addOptionalBrowserWindow(envState, browserWindow);
  if (browserWindow && browserWindow.focused) {
    focusCandidates.push(browserWindow.windowId ?? "browser-main");
  }
  envState = addOptionalTerminalWindow(envState, terminalWindow);
  if (terminalWindow && terminalWindow.focused) {
    focusCandidates.push(terminalWindow.windowId ?? "terminal-main");
  }
  envState = addOptionalMailWindow(envState, mailWindow);
  if (mailWindow && mailWindow.focused) {
    focusCandidates.push(mailWindow.windowId ?? "mail-main");
  }

  envState = finalizeWindowFocus(envState, focusCandidates.at(-1));

  return envState;
}

export function materializeNoteTarget(envState: EnvState, noteTarget: NoteTargetOptions): ScenarioContext {
  const directory = normalizeDirectory(noteTarget.directory ?? "/workspace");
  const initialContent = noteTarget.initialContent ?? "";
  const nextState = addScenarioEntries(envState, [
    createScenarioFile(noteTarget.fileId, noteTarget.fileName, initialContent, directory)
  ]);

  return {
    envState: nextState,
    noteFileId: noteTarget.fileId
  };
}

export function createTerminalScenario({
  instruction,
  viewport,
  cwd,
  noteTarget,
  noteWindow = {
    ...noteTarget,
    preopen: true,
    windowId: "notes-target",
    bounds: { x: 968, y: 84, width: 300, height: 380 },
    focused: false,
    minimized: false
  },
  explorerWindow = false,
  scenarioFiles = [],
  history = []
}: TerminalScenarioOptions): TerminalScenarioContext {
  const normalizedCwd = normalizeDirectory(cwd);
  let envState = createEmptyEnv(viewport, instruction);
  envState = addScenarioEntries(envState, scenarioFiles);
  const withNoteTarget = materializeNoteTarget(envState, noteTarget);
  envState = withNoteTarget.envState;
  if (explorerWindow) {
    envState = addScenarioExplorerWindow(envState, explorerWindow);
  }
  if (noteWindow) {
    const built = addScenarioNoteWindow(envState, {
      ...noteWindow,
      fileId: noteTarget.fileId,
      fileName: noteTarget.fileName,
      initialContent: noteWindow.initialContent ?? noteTarget.initialContent,
      directory: noteWindow.directory ?? noteTarget.directory
    });
    envState = built.envState;
  }
  envState.fileSystem = setWorkingDirectory(envState.fileSystem, normalizedCwd);
  envState = addTerminalWindow(
    envState,
    "terminal-main",
    { x: 438, y: 482, width: 540, height: 250 },
    true,
    false
  );

  const terminalState = envState.appStates.terminalLite["terminal-main"];
  terminalState.cwd = normalizedCwd;
  terminalState.executedCommands = [...history];
  terminalState.lines = history.map((command) => `${terminalState.prompt}:~${terminalState.cwd}$ ${command}`);

  return {
    envState,
    noteFileId: withNoteTarget.noteFileId,
    terminalState
  };
}

export function buildMailFolders(
  messages: Team3MailMessage[],
  folders: Team3MailFolder[] = [],
  initialFolderId = "inbox"
) {
  const folderMap = new Map<string, { id: string; name: string; unread: number }>();

  for (const folder of folders) {
    folderMap.set(folder.id, { id: folder.id, name: folder.name, unread: 0 });
  }

  if (!folderMap.has(initialFolderId)) {
    folderMap.set(initialFolderId, {
      id: initialFolderId,
      name: initialFolderId[0].toUpperCase() + initialFolderId.slice(1),
      unread: 0
    });
  }

  for (const message of messages) {
    if (!folderMap.has(message.folderId)) {
      folderMap.set(message.folderId, {
        id: message.folderId,
        name: message.folderId[0].toUpperCase() + message.folderId.slice(1),
        unread: 0
      });
    }
    const folder = folderMap.get(message.folderId);
    if (folder) {
      folder.unread += 1;
    }
  }

  return Array.from(folderMap.values());
}

export function createMailScenario({
  instruction,
  viewport,
  noteTarget,
  noteWindow = {
    ...noteTarget,
    preopen: true,
    windowId: "notes-target",
    bounds: { x: 968, y: 84, width: 300, height: 380 },
    focused: false,
    minimized: false
  },
  explorerWindow = false,
  scenarioFiles = [],
  messages,
  folders = [],
  initialFolderId = "inbox",
  mailWindow = {
    windowId: "mail-main",
    bounds: { x: 438, y: 84, width: 520, height: 560 },
    focused: true,
    minimized: false
  }
}: MailScenarioOptions & { mailWindow?: CompanionWindowOptions | false }): MailScenarioContext {
  let envState = createEmptyEnv(viewport, instruction);
  envState = addScenarioEntries(envState, scenarioFiles);
  const withNoteTarget = materializeNoteTarget(envState, noteTarget);
  envState = withNoteTarget.envState;
  const focusCandidates: string[] = [];
  if (explorerWindow) {
    envState = addScenarioExplorerWindow(envState, explorerWindow);
    if (explorerWindow.focused) {
      focusCandidates.push(explorerWindow.windowId ?? "explorer-main");
    }
  }
  if (noteWindow) {
    const built = addScenarioNoteWindow(envState, {
      ...noteWindow,
      fileId: noteTarget.fileId,
      fileName: noteTarget.fileName,
      initialContent: noteWindow.initialContent ?? noteTarget.initialContent,
      directory: noteWindow.directory ?? noteTarget.directory
    });
    envState = built.envState;
    if (noteWindow.preopen && noteWindow.focused && built.noteWindowId) {
      focusCandidates.push(built.noteWindowId);
    }
  }
  if (mailWindow) {
    envState = addMailWindow(
      envState,
      mailWindow.windowId ?? "mail-main",
      mailWindow.bounds,
      mailWindow.focused ?? true,
      mailWindow.minimized ?? false
    );
    if (mailWindow.focused ?? true) {
      focusCandidates.push(mailWindow.windowId ?? "mail-main");
    }
  }

  envState = finalizeWindowFocus(envState, focusCandidates.at(-1));

  const mailState = envState.appStates.mailLite[mailWindow && mailWindow.windowId ? mailWindow.windowId : "mail-main"];
  mailState.folders = buildMailFolders(messages, folders, initialFolderId);
  mailState.messages = messages;
  mailState.selectedFolder = initialFolderId;
  mailState.selectedMessageId = "";
  mailState.previewBody = [];
  mailState.selectedPreviewLineIndex = undefined;

  return {
    envState,
    noteFileId: withNoteTarget.noteFileId,
    mailState
  };
}

export function listDirectoryOutput(envState: EnvState, directory = envState.fileSystem.cwd) {
  return getFilesInDirectory(envState.fileSystem, directory)
    .map((entry) => (entry.kind === "folder" ? `${entry.name}/` : entry.name))
    .join("  ");
}

export function catCommandOutput(fileContent: string) {
  return fileContent.split("\n").join("\n");
}

export function buildTerminalTaskSetup({
  expectedSavedContent,
  targetCommand,
  targetCommandOutput,
  ...scenario
}: TerminalSetupOptions) {
  const terminalScenario = createTerminalScenario(scenario);
  return {
    envState: terminalScenario.envState,
    targets: {
      ...createNoteTargets(terminalScenario.noteFileId, expectedSavedContent),
      targetCommand,
      targetCommandOutput
    }
  };
}

export function buildPwdTerminalTask(
  scenario: TerminalScenarioOptions,
  expectedSavedContent = normalizeDirectory(scenario.cwd)
) {
  const normalizedCwd = normalizeDirectory(scenario.cwd);
  return buildTerminalTaskSetup({
    ...scenario,
    expectedSavedContent,
    targetCommand: "pwd",
    targetCommandOutput: normalizedCwd
  });
}

export function buildLsTerminalTask(
  scenario: TerminalScenarioOptions,
  expectedSavedContent: string
) {
  const built = buildTerminalTaskSetup({
    ...scenario,
    expectedSavedContent,
    targetCommand: "ls",
    targetCommandOutput: ""
  });

  return {
    envState: built.envState,
    targets: {
      ...built.targets,
      targetCommandOutput: listDirectoryOutput(built.envState, scenario.cwd)
    }
  };
}

export function buildCatTerminalTask(
  scenario: TerminalScenarioOptions,
  sourceFile: ScenarioFileDefinition,
  expectedSavedContent: string
) {
  return buildTerminalTaskSetup({
    ...scenario,
    scenarioFiles: [...(scenario.scenarioFiles ?? []), sourceFile],
    expectedSavedContent,
    targetCommand: `cat ${sourceFile.name}`,
    targetCommandOutput: catCommandOutput(sourceFile.content)
  });
}

export function buildMailTaskSetup({
  expectedSavedContent,
  targetMessageId,
  ...scenario
}: MailSetupOptions) {
  const mailScenario = createMailScenario(scenario);
  return {
    envState: mailScenario.envState,
    targets: {
      ...createNoteTargets(mailScenario.noteFileId, expectedSavedContent),
      targetMessageId
    }
  };
}
