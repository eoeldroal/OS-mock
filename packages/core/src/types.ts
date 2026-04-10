export type MouseButton = "left" | "middle" | "right";

export type Point = { x: number; y: number };

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Viewport = {
  width: number;
  height: number;
};

export type Computer13ActionType =
  | "MOVE_TO"
  | "CLICK"
  | "MOUSE_DOWN"
  | "MOUSE_UP"
  | "RIGHT_CLICK"
  | "DOUBLE_CLICK"
  | "DRAG_TO"
  | "SCROLL"
  | "TYPING"
  | "PRESS"
  | "KEY_DOWN"
  | "KEY_UP"
  | "HOTKEY"
  | "WAIT"
  | "FAIL"
  | "DONE";

export type Computer13Action =
  | { type: "MOVE_TO"; x: number; y: number }
  | { type: "CLICK"; button?: MouseButton; x?: number; y?: number; numClicks?: number }
  | { type: "MOUSE_DOWN"; button?: MouseButton }
  | { type: "MOUSE_UP"; button?: MouseButton }
  | { type: "RIGHT_CLICK"; x?: number; y?: number }
  | { type: "DOUBLE_CLICK"; x?: number; y?: number }
  | { type: "DRAG_TO"; x: number; y: number }
  | { type: "SCROLL"; dx: number; dy: number }
  | { type: "TYPING"; text: string }
  | { type: "PRESS"; key: string }
  | { type: "KEY_DOWN"; key: string }
  | { type: "KEY_UP"; key: string }
  | { type: "HOTKEY"; keys: string[] }
  | { type: "WAIT" }
  | { type: "FAIL" }
  | { type: "DONE" };

export type A11yRole =
  | "desktop"
  | "window"
  | "button"
  | "textbox"
  | "list"
  | "listitem"
  | "menu"
  | "menuitem"
  | "icon"
  | "dialog"
  | "label";

export type A11yNode = {
  id: string;
  role: A11yRole;
  name: string;
  text?: string;
  bounds: Rect;
  visible: boolean;
  enabled: boolean;
  focusable: boolean;
  focused: boolean;
  children: A11yNode[];
};

export type WindowInstance = {
  id: string;
  appId: string;
  title: string;
  bounds: Rect;
  restoredBounds?: Rect;
  minimized: boolean;
  maximized: boolean;
  focused: boolean;
  zIndex: number;
};

export type FileEntry = {
  id: string;
  name: string;
  path: string;
  content: string;
};

export type FileSystemState = {
  cwd: string;
  files: Record<string, FileEntry>;
  order: string[];
};

export type ClipboardState = {
  text: string;
};

export type PointerState = {
  x: number;
  y: number;
  buttonsPressed: MouseButton[];
};

export type KeyboardState = {
  pressedKeys: string[];
};

export type PopupState = {
  id: string;
  title: string;
  message: string;
  buttonLabel: string;
  hijacksFocus: boolean;
};

export type FileExplorerState = {
  id: string;
  selectedFileId?: string;
  renameMode?: {
    fileId: string;
    draft: string;
    replaceOnType: boolean;
  };
};

export type NoteEditorState = {
  id: string;
  fileId: string;
  buffer: string;
  cursorIndex: number;
  selectedLineIndex?: number;
  dirty: boolean;
};

export type BrowserLiteState = {
  id: string;
  appName: string;
  url: string;
  pageTitle: string;
  currentPage: "explorer" | "help";
  tabs: Array<{
    id: string;
    title: string;
    active: boolean;
  }>;
  bookmarks: string[];
  categories: Array<{
    id: string;
    label: string;
    tasks: Array<{
      id: string;
      domain: string;
      title: string;
      instruction: string;
      actions: string[];
    }>;
  }>;
  selectedCategoryId: string;
  selectedTaskId: string;
  helpLines: string[];
};

export type TerminalLiteState = {
  id: string;
  cwd: string;
  prompt: string;
  lines: string[];
  input: string;
  status: string;
  lastCommand: string;
  lastOutput: string;
  executedCommands: string[];
};

export type MailLiteState = {
  id: string;
  selectedFolder: string;
  folders: Array<{
    id: string;
    name: string;
    unread: number;
  }>;
  messages: Array<{
    id: string;
    folderId: string;
    sender: string;
    subject: string;
    preview: string;
    body: string[];
  }>;
  selectedMessageId: string;
  previewBody: string[];
};

export type AppStates = {
  fileExplorer: Record<string, FileExplorerState>;
  noteEditor: Record<string, NoteEditorState>;
  browserLite: Record<string, BrowserLiteState>;
  terminalLite: Record<string, TerminalLiteState>;
  mailLite: Record<string, MailLiteState>;
};

export type TaskbarItem = {
  windowId: string;
  title: string;
  appId: string;
  pinned: boolean;
  running: boolean;
  iconLabel: string;
  bounds: Rect;
};

export type PopupViewModel = {
  id: string;
  title: string;
  message: string;
  buttonLabel: string;
  bounds: Rect;
};

export type FileExplorerViewModel = {
  type: "file-explorer";
  selectedFileId?: string;
  renameMode?: FileExplorerState["renameMode"];
  files: FileEntry[];
};

export type NoteEditorViewModel = {
  type: "note-editor";
  fileName: string;
  content: string;
  cursorIndex: number;
  selectedLineIndex?: number;
  dirty: boolean;
  saveButtonBounds: Rect;
  editorBounds: Rect;
  lines: string[];
};

export type BrowserLiteViewModel = {
  type: "browser-lite";
  appName: string;
  url: string;
  pageTitle: string;
  currentPage: BrowserLiteState["currentPage"];
  tabs: BrowserLiteState["tabs"];
  bookmarks: string[];
  categories: BrowserLiteState["categories"];
  selectedCategoryId: string;
  selectedTaskId: string;
  helpLines: string[];
};

export type TerminalLiteViewModel = {
  type: "terminal-lite";
  cwd: string;
  prompt: string;
  lines: string[];
  input: string;
  status: string;
};

export type MailLiteViewModel = {
  type: "mail-lite";
  selectedFolder: string;
  folders: MailLiteState["folders"];
  messages: MailLiteState["messages"];
  selectedMessageId: string;
  previewBody: string[];
};

export type AppViewModel =
  | FileExplorerViewModel
  | NoteEditorViewModel
  | BrowserLiteViewModel
  | TerminalLiteViewModel
  | MailLiteViewModel;

export type WindowViewModel = {
  id: string;
  appId: string;
  title: string;
  bounds: Rect;
  titleBarBounds: Rect;
  closeButtonBounds: Rect;
  minimizeButtonBounds: Rect;
  maximizeButtonBounds: Rect;
  minimized: boolean;
  maximized: boolean;
  focused: boolean;
  zIndex: number;
  appView: AppViewModel;
};

export type RenderModel = {
  viewport: Viewport;
  desktopTitle: string;
  shellName: string;
  topBarTitle: string;
  topBarClock: string;
  windows: WindowViewModel[];
  popups: PopupViewModel[];
  taskbarItems: TaskbarItem[];
  pointer: PointerState;
  focusedWindowId?: string;
  instruction?: string;
  stepIndex: number;
};

export type Observation = {
  viewport: Viewport;
  screenshotPath?: string;
  viewerUrl?: string;
  pointer: Point;
  focusedWindowId?: string;
  a11yTree: A11yNode[];
};

export type StepInfo = {
  lastProgress: string[];
  lastViolations: string[];
  focusChanged: boolean;
};

export type StepResult = {
  task?: {
    id: string;
    instruction: string;
    maxSteps: number;
  };
  stepIndex: number;
  actionAccepted: boolean;
  reward: number;
  cumulativeReward: number;
  terminated: boolean;
  truncated: boolean;
  observation: Observation;
  info: StepInfo;
};

export type PredicateId =
  | "note.target_opened"
  | "popup.dismissed"
  | "note.todo_opened"
  | "note.target_appended"
  | "note.saved"
  | "file.renamed"
  | "clipboard.source_line_copied"
  | "note.target_pasted"
  | "window.note_restored"
  | "browser.task_selected"
  | "browser.help_page_opened"
  | "mail.message_opened"
  | "terminal.command_ran";

export type ScheduledPerturbation = {
  stepIndex: number;
  op: string;
  params?: Record<string, unknown>;
};

export type TaskLevel = "A" | "B" | "C" | "D";

export type TaskSummary = {
  family: string;
  level: TaskLevel;
  apps: string[];
  startState: string;
  objective: string;
  implementationPath: string;
};

export type TaskSpec = {
  id: string;
  instruction: string;
  maxSteps: number;
  seedDefaults: number[];
  domain?: string;
  split?: "starter" | "representative";
  summary: TaskSummary;
  setup(seed: number, viewport: Viewport): TaskSetup;
  goalPredicates: PredicateId[];
  progressPredicates: PredicateId[];
  forbiddenPredicates: PredicateId[];
  scheduledPerturbations?: ScheduledPerturbation[];
};

export type TaskSetup = {
  envState: EnvState;
  targets: Record<string, string>;
};

export type SessionSnapshot = {
  envState: EnvState;
  stepIndex: number;
  cumulativeReward: number;
  achievedProgress: string[];
  terminated: boolean;
  truncated: boolean;
};

export type EnvState = {
  viewport: Viewport;
  pointer: PointerState;
  keyboard: KeyboardState;
  clipboard: ClipboardState;
  fileSystem: FileSystemState;
  windows: WindowInstance[];
  appStates: AppStates;
  popups: PopupState[];
  taskbarHeight: number;
  instruction?: string;
};

export type CreateAppContext = {
  viewport: Viewport;
};

export type ReduceContext = {
  envState: EnvState;
  window: WindowInstance;
  pointer: Point;
};

export type BuildContext = {
  envState: EnvState;
  window: WindowInstance;
};

export interface AppPlugin<TState> {
  id: string;
  title: string;
  create(seed: number, ctx: CreateAppContext): TState;
  reduce(state: TState, action: Computer13Action, ctx: ReduceContext): TState;
  buildA11y(state: TState, ctx: BuildContext): A11yNode[];
  buildViewModel(state: TState, ctx: BuildContext): AppViewModel;
}
