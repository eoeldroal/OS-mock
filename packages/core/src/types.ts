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
  | "DRAG"
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
  | { type: "DRAG"; x1: number; y1: number; x2: number; y2: number; button?: MouseButton }
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

export type FileSystemPlace = "Home" | "Desktop" | "Documents" | "Downloads" | "workspace";

export type FileEntry = {
  id: string;
  name: string;
  directory: string;
  path: string;
  content: string;
  kind: "file" | "folder";
};

export type FileMetadata = {
  createdAt: number;
  modifiedAt: number;
  size: number;
};

export type FileSystemNode = {
  id: string;
  name: string;
  kind: "file" | "folder";
  parentId?: string;
  mountPath?: string;
  content: string;
  childrenOrder: string[];
  metadata: FileMetadata;
};

export type FileSystemState = {
  cwdNodeId: string;
  rootNodeIds: Record<FileSystemPlace, string>;
  nodes: Record<string, FileSystemNode>;
  cwd: string;
  roots: Record<FileSystemPlace, string>;
  files: Record<string, FileEntry>;
  order: string[];
  directoryChildren: Record<string, string[]>;
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

export type WindowDragState = {
  windowId: string;
  pointerOffset: Point;
};

export type ResizeEdge = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

export type WindowResizeState = {
  windowId: string;
  edge: ResizeEdge;
  initialBounds: Rect;
  initialPointer: Point;
};

export type PopupState = {
  id: string;
  title: string;
  message: string;
  buttonLabel: string;
  hijacksFocus: boolean;
};

export type ContextMenuItem = {
  id: string;
  label: string;
  enabled: boolean;
  shortcut?: string;
};

export type ContextMenuState = {
  items: ContextMenuItem[];
  position: Point;
  sourceWindowId?: string;
  selectedIndex?: number;
};

export type FileExplorerState = {
  id: string;
  selectedFileId?: string;
  currentPlace: FileSystemPlace;
  currentDirectory: string;
  renameMode?: {
    fileId: string;
    draft: string;
    replaceOnType: boolean;
  };
};

export type BrowserBookmark = {
  id: string;
  label: string;
  page: "explorer" | "help";
  targetCategoryId?: string;
  targetHelpTopicId?: string;
};

export type BrowserTaskCard = {
  id: string;
  domain: string;
  title: string;
  instruction: string;
  actions: string[];
  owner: string;
  difficulty: "Easy" | "Medium" | "Hard";
  appRefs: string[];
};

export type BrowserTaskCategory = {
  id: string;
  label: string;
  tasks: BrowserTaskCard[];
};

export type BrowserHelpTopic = {
  id: string;
  title: string;
  lines: string[];
};

export type NoteEditorState = {
  id: string;
  fileId: string;
  buffer: string;
  cursorIndex: number;
  selectedLineIndex?: number;
  dirty: boolean;
  undoStack: Array<{ buffer: string; cursorIndex: number }>;
  redoStack: Array<{ buffer: string; cursorIndex: number }>;
};

export type BrowserLiteState = {
  id: string;
  appName: string;
  renderMode: "synthetic" | "hybrid";
  url: string;
  addressInput: string;
  addressBarFocused: boolean;
  addressReplaceOnType: boolean;
  pageTitle: string;
  currentPage: "explorer" | "help" | "external";
  tabs: Array<{
    id: string;
    title: string;
    active: boolean;
  }>;
  bookmarks: BrowserBookmark[];
  categories: BrowserTaskCategory[];
  selectedCategoryId: string;
  selectedTaskId: string;
  helpTopics: BrowserHelpTopic[];
  selectedHelpTopicId: string;
  helpLines: string[];
  lastOpenedBookmarkId?: string;
  selectedHelpLineIndex?: number;
};

export type BrowserSurfaceViewModel = {
  windowId: string;
  frameVersion: number;
  frameUrl: string;
  title: string;
  url: string;
  loading: boolean;
  width: number;
  height: number;
};

export type BrowserContentInput =
  | { kind: "click" | "double_click"; x: number; y: number }
  | { kind: "scroll"; x: number; y: number; dx: number; dy: number }
  | { kind: "type"; text: string }
  | { kind: "press"; key: string }
  | { kind: "hotkey"; keys: string[] };

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
  historyIndex: number;
  selectedLineIndex?: number;
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
  selectedPreviewLineIndex?: number;
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
  minimized: boolean;
  iconLabel: string;
  badgeLabel?: string;
  bounds: Rect;
};

export type DesktopIcon = {
  id: string;
  label: string;
  appId?: string;
  action?: string;
  place?: FileSystemPlace;
  directory?: string;
  position: Point;
  bounds: Rect;
};

export type PopupViewModel = {
  id: string;
  title: string;
  message: string;
  buttonLabel: string;
  bounds: Rect;
};

/** Layout rects computed once by the core engine — used by hit-testing, rendering, and a11y. */
export type FileExplorerLayout = {
  sidebarBounds: Rect;
  sidebarItemRects: Rect[];
  sidebarFavoritesHeadingBounds?: Rect;
  sidebarFavoriteItemRects: Rect[];
  sidebarStorageHeadingBounds?: Rect;
  sidebarStorageItemRects: Rect[];
  sidebarSummaryBounds?: Rect;
  mainBounds: Rect;
  toolbarBounds: Rect;
  backButtonBounds: Rect;
  listBounds: Rect;
  listHeaderBounds: Rect;
  listViewportBounds: Rect;
  listFooterBounds: Rect;
  fileRowRects: Rect[];
  renameHintBounds: Rect;
  compactRows: boolean;
  stackedRows: boolean;
};

export type FileExplorerViewModel = {
  type: "file-explorer";
  selectedFileId?: string;
  currentPlace: FileSystemPlace;
  currentDirectory: string;
  places: FileSystemPlace[];
  renameMode?: FileExplorerState["renameMode"];
  files: FileEntry[];
  /** Single-source-of-truth layout — both hit-testing and rendering use these rects */
  layout: FileExplorerLayout;
};

/** Layout rects computed once by the core engine — used by hit-testing, rendering, and a11y. */
export type NoteEditorLayout = {
  toolbarBounds: Rect;
  saveButtonBounds: Rect;
  editorFrameBounds: Rect;
  gutterBounds: Rect;
  editorBounds: Rect;
  lineRects: Rect[];
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
  /** Single-source-of-truth layout — both hit-testing and rendering use these rects */
  layout: NoteEditorLayout;
};

/** Layout rects computed once by the core engine — used by hit-testing and rendering. */
export type BrowserLiteLayout = {
  tabBarBounds: Rect;
  tabRects: Rect[];
  addressBarBounds: Rect;
  contentBounds: Rect;
  bookmarkColumnBounds: Rect;
  bookmarkHeaderBounds: Rect;
  bookmarkRects: Rect[];
  categoryColumnBounds: Rect;
  categoryHeaderBounds: Rect;
  categoryRects: Rect[];
  taskColumnBounds: Rect;
  taskHeaderBounds: Rect;
  taskRects: Rect[];
  detailBounds: Rect;
  detailTitleBounds: Rect;
  detailTaskIdLabelBounds: Rect;
  detailTaskIdValueBounds: Rect;
  detailInstructionLabelBounds: Rect;
  detailInstructionBounds: Rect;
  detailActionsLabelBounds: Rect;
  detailActionRects: Rect[];
  helpTopicsBounds: Rect;
  helpDetailBounds: Rect;
  helpTextBounds: Rect;
  helpLineRects: Rect[];
  helpTopicRects: Rect[];
  selectedCategory?: BrowserLiteState["categories"][0];
  selectedTask?: BrowserLiteState["categories"][0]["tasks"][0];
  selectedHelpTopic?: BrowserLiteState["helpTopics"][0];
};

export type BrowserLiteViewModel = {
  type: "browser-lite";
  appName: string;
  renderMode: BrowserLiteState["renderMode"];
  url: string;
  addressInput: string;
  addressBarFocused: boolean;
  pageTitle: string;
  currentPage: BrowserLiteState["currentPage"];
  tabs: BrowserLiteState["tabs"];
  bookmarks: BrowserLiteState["bookmarks"];
  categories: BrowserLiteState["categories"];
  selectedCategoryId: string;
  selectedTaskId: string;
  helpTopics: BrowserLiteState["helpTopics"];
  selectedHelpTopicId: string;
  helpLines: string[];
  lastOpenedBookmarkId?: string;
  selectedHelpLineIndex?: number;
  surface?: BrowserSurfaceViewModel;
  /** Single-source-of-truth layout — both hit-testing and rendering use these rects */
  layout: BrowserLiteLayout;
};

export type TerminalLiteLayout = {
  headerBounds: Rect;
  terminalBounds: Rect;
  lineRects: Rect[];
  inputBounds: Rect;
};

export type TerminalLiteViewModel = {
  type: "terminal-lite";
  cwd: string;
  prompt: string;
  lines: string[];
  input: string;
  status: string;
  selectedLineIndex?: number;
  layout: TerminalLiteLayout;
};

/** Layout rects computed once by the core engine — used by hit-testing, rendering, and a11y. */
export type MailLiteLayout = {
  headerBounds: Rect;
  sidebarBounds: Rect;
  folderRects: Rect[];
  messageListBounds: Rect;
  messageRects: Rect[];
  previewBounds: Rect;
  previewLineRects: Rect[];
};

export type MailLiteViewModel = {
  type: "mail-lite";
  selectedFolder: string;
  folders: MailLiteState["folders"];
  messages: MailLiteState["messages"];
  selectedMessageId: string;
  previewBody: string[];
  /** Single-source-of-truth layout — both hit-testing and rendering use these rects */
  layout: MailLiteLayout;
  selectedPreviewLineIndex?: number;
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
  sessionId?: string;
  viewport: Viewport;
  desktopTitle: string;
  shellName: string;
  topBarTitle: string;
  topBarClock: string;
  taskLoaded: boolean;
  taskId?: string;
  windows: WindowViewModel[];
  popups: PopupViewModel[];
  taskbarItems: TaskbarItem[];
  desktopIcons: DesktopIcon[];
  pointer: PointerState;
  focusedWindowId?: string;
  contextMenu?: {
    items: ContextMenuItem[];
    position: Point;
    bounds: Rect;
  };
  stepIndex: number;
};

export type Observation = {
  viewport: Viewport;
  screenshotPath?: string;
  viewerUrl?: string;
  pointer: Point;
  focusedWindowId?: string;
  /** Canonical observation tree after any registered browser augmentations are applied. */
  a11yTree: A11yNode[];
  /** Explicit browser-runtime overlays that explain how the canonical tree was augmented. */
  browserAugmentations: BrowserObservationAugmentation[];
};

export type BrowserObservationAugmentationSource =
  | "hybrid-dom"
  | "synthetic-browser"
  | "future-runtime";

export type BrowserObservationAugmentationStrategy = "replace-content";

export type BrowserObservationAugmentation = {
  windowId: string;
  source: BrowserObservationAugmentationSource;
  strategy: BrowserObservationAugmentationStrategy;
  contentBounds: Rect;
  nodes: A11yNode[];
};

export type StepInfo = {
  lastProgress: string[];
  lastViolations: string[];
  focusChanged: boolean;
  actionSummary: string;
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
  | "file.deleted"
  | "file.created"
  | "clipboard.source_line_copied"
  | "note.target_pasted"
  | "window.note_restored"
  | "browser.task_selected"
  | "browser.category_selected"
  | "browser.bookmark_opened"
  | "browser.osworld_opened"
  | "browser.help_page_opened"
  | "browser.help_topic_opened"
  | "browser.url_matches"
  | "mail.message_opened"
  | "terminal.command_ran"
  | "terminal.multi_commands_ran"
  | "window.resized"
  | "context_menu.action_executed"
  | "terminal.history_used"
  | "note.undo_performed";

export type ScheduledPerturbation = {
  stepIndex: number;
  op: string;
  params?: Record<string, unknown>;
};

export type TaskLevel = "A" | "B" | "C" | "D";

export type TaskSummary = {
  family: string;
  subtype?: string;
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
  summary?: TaskSummary;
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
  nextEntityId: number;
  pointer: PointerState;
  keyboard: KeyboardState;
  dragState?: WindowDragState;
  resizeState?: WindowResizeState;
  clipboard: ClipboardState;
  fileSystem: FileSystemState;
  windows: WindowInstance[];
  appStates: AppStates;
  popups: PopupState[];
  contextMenu?: ContextMenuState;
  taskbarHeight: number;
  desktopIcons: DesktopIcon[];
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

export type AppActionResult = {
  appState: unknown;
  envState?: EnvState;
  accepted: boolean;
};
