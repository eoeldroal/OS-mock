import type {
  EnvState,
  FileEntry,
  FileExplorerState,
  FileSystemPlace,
  MailLiteState,
  Rect,
  TaskSetup,
  TerminalLiteState,
  Viewport
} from "../types.js";

export type ScenarioFileDefinition = FileEntry;

export type NoteTargetOptions = {
  fileId: string;
  fileName: string;
  initialContent?: string;
  directory?: string;
};

export type ScenarioNoteWindowOptions = NoteTargetOptions & {
  preopen?: boolean;
  windowId?: string;
  bounds?: Rect;
  focused?: boolean;
  minimized?: boolean;
  dirty?: boolean;
  buffer?: string;
};

export type ScenarioExplorerWindowOptions = {
  windowId?: string;
  bounds: Rect;
  focused?: boolean;
  minimized?: boolean;
  selectedFileId?: string;
  currentPlace?: FileSystemPlace;
  currentDirectory?: string;
};

export type CompanionWindowOptions = {
  windowId?: string;
  bounds: Rect;
  focused?: boolean;
  minimized?: boolean;
};

export type ExplorerScenarioOptions = {
  instruction: string;
  viewport: Viewport;
  files?: ScenarioFileDefinition[];
  explorerWindow: ScenarioExplorerWindowOptions;
  noteWindows?: ScenarioNoteWindowOptions[];
  browserWindow?: CompanionWindowOptions | false;
  terminalWindow?: CompanionWindowOptions | false;
  mailWindow?: CompanionWindowOptions | false;
};

export type ExplorerWorkspaceScenarioOptions = Omit<ExplorerScenarioOptions, "explorerWindow"> & {
  explorerWindow?: ScenarioExplorerWindowOptions | false;
};

export type TerminalScenarioOptions = {
  instruction: string;
  viewport: Viewport;
  cwd: string;
  noteTarget: NoteTargetOptions;
  noteWindow?: ScenarioNoteWindowOptions | false;
  explorerWindow?: ScenarioExplorerWindowOptions | false;
  scenarioFiles?: ScenarioFileDefinition[];
  history?: string[];
};

export type Team3MailFolder = {
  id: string;
  name: string;
};

export type Team3MailMessage = {
  id: string;
  folderId: string;
  sender: string;
  subject: string;
  preview: string;
  body: string[];
};

export type MailScenarioOptions = {
  instruction: string;
  viewport: Viewport;
  noteTarget: NoteTargetOptions;
  noteWindow?: ScenarioNoteWindowOptions | false;
  explorerWindow?: ScenarioExplorerWindowOptions | false;
  scenarioFiles?: ScenarioFileDefinition[];
  messages: Team3MailMessage[];
  folders?: Team3MailFolder[];
  initialFolderId?: string;
};

export type TerminalSetupOptions = TerminalScenarioOptions & {
  expectedSavedContent: string;
  targetCommand: string;
  targetCommandOutput: string;
};

export type MailSetupOptions = MailScenarioOptions & {
  expectedSavedContent: string;
  targetMessageId: string;
};

export type ScenarioContext = {
  envState: EnvState;
  noteFileId: string;
};

export type TerminalScenarioContext = ScenarioContext & {
  terminalState: TerminalLiteState;
};

export type MailScenarioContext = ScenarioContext & {
  mailState: MailLiteState;
};

export type ExplorerScenarioContext = {
  envState: EnvState;
  explorerState: FileExplorerState;
  explorerWindowId: string;
  noteWindowIds: string[];
};

export type TaskSetupBuilder<TResult extends Record<string, string>> = {
  envState: EnvState;
  targets: TResult;
};

export type ScenarioTaskSetup = TaskSetup;
