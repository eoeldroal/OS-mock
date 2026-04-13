import { formatBrowserTaskApps, getBrowserHelpTopic, getBrowserTask } from "../../browser-fixtures.js";
import {
  addBrowserWindow,
  addExplorerWindow,
  addFiles,
  addNoteEditorWindow,
  createEmptyEnv,
  createFile
} from "../../env/factory.js";
import type { BrowserLiteState, PredicateId, TaskSpec, Viewport } from "../../types.js";
import { browserBounds, explorerBounds, noteBoundsRight } from "./shared.js";

const implementationPath = "packages/core/src/tasks/representative/browser-bulk-tasks.ts";

type BrowserStart =
  | { page: "explorer"; categoryId?: string; taskId?: string }
  | { page: "help"; topicId?: string };

type HelpTaskConfig = {
  id: string;
  instruction: string;
  subtype: string;
  topicId: string;
  fileId: string;
  fileName: string;
  appendText: string;
  startState: string;
  objective: string;
  initialContent?: string;
  preopen?: boolean;
  start?: BrowserStart;
  targetBookmarkId?: string;
  targetPage?: "explorer" | "help";
};

type ExplorerTaskConfig = {
  id: string;
  instruction: string;
  subtype: string;
  categoryId: string;
  taskId: string;
  fileId: string;
  fileName: string;
  appendText: string;
  startState: string;
  objective: string;
  initialContent?: string;
  preopen?: boolean;
  start?: BrowserStart;
  targetBookmarkId?: string;
  targetPage?: "explorer" | "help";
  family?: string;
};

function setBrowserExplorer(browser: BrowserLiteState, categoryId: string, taskId: string) {
  browser.currentPage = "explorer";
  browser.tabs = browser.tabs.map((tab, index) => ({ ...tab, active: index === 0 }));
  browser.pageTitle = "OSWorld Explorer";
  browser.url = "https://os-world.github.io/explorer.html";
  browser.selectedCategoryId = categoryId;
  browser.selectedTaskId = taskId;
}

function setBrowserHelp(browser: BrowserLiteState, topicId: string) {
  const topic = getBrowserHelpTopic(topicId);
  browser.currentPage = "help";
  browser.tabs = browser.tabs.map((tab, index) => ({ ...tab, active: index === 1 }));
  browser.pageTitle = "Ubuntu help";
  browser.url = "https://help.ubuntu.com/mock/osworld";
  browser.selectedHelpTopicId = topic.id;
  browser.helpLines = [...topic.lines];
}

function createBrowserEnv(viewport: Viewport, instruction: string, start: BrowserStart) {
  const envState = addBrowserWindow(createEmptyEnv(viewport, instruction), "browser-main", browserBounds(), true, false);
  const browser = envState.appStates.browserLite["browser-main"];
  if (start.page === "help") {
    setBrowserHelp(browser, start.topicId ?? "dock-basics");
  } else {
    setBrowserExplorer(browser, start.categoryId ?? "workflow", start.taskId ?? "workflow_mail_bridge");
  }
  return envState;
}

function addRepresentativeNote(
  envState: ReturnType<typeof createEmptyEnv>,
  fileId: string,
  fileName: string,
  initialContent: string,
  preopen: boolean
) {
  let next = addFiles(envState, [
    createFile(fileId, fileName, initialContent),
    createFile("file-draft", "draft.txt", "Draft reference"),
    createFile("file-reference", "reference.txt", "Reference material")
  ]);
  next = addExplorerWindow(next, "explorer-main", explorerBounds(), false);
  if (preopen) {
    next = addNoteEditorWindow(next, "notes-target", fileId, noteBoundsRight(), false, initialContent, false);
  }
  return next;
}

function buildHelpTask(config: HelpTaskConfig, viewport: Viewport) {
  const start = config.start ?? { page: "explorer", categoryId: "workflow", taskId: "workflow_mail_bridge" };
  let envState = createBrowserEnv(viewport, config.instruction, start);
  envState = addRepresentativeNote(envState, config.fileId, config.fileName, config.initialContent ?? "", config.preopen ?? true);
  return {
    envState,
    targets: {
      targetFileId: config.fileId,
      targetHelpTopicId: config.topicId,
      appendText: config.appendText,
      expectedSavedContent: (config.initialContent ?? "") + config.appendText,
      ...(config.targetBookmarkId
        ? { targetBookmarkId: config.targetBookmarkId, targetPage: config.targetPage ?? "help" }
        : {})
    }
  };
}

function buildExplorerTask(config: ExplorerTaskConfig, viewport: Viewport) {
  const start = config.start ?? { page: "explorer", categoryId: "workflow", taskId: "workflow_mail_bridge" };
  let envState = createBrowserEnv(viewport, config.instruction, start);
  envState = addRepresentativeNote(envState, config.fileId, config.fileName, config.initialContent ?? "", config.preopen ?? true);
  return {
    envState,
    targets: {
      targetFileId: config.fileId,
      targetCategoryId: config.categoryId,
      targetBrowserTaskId: config.taskId,
      appendText: config.appendText,
      expectedSavedContent: (config.initialContent ?? "") + config.appendText,
      ...(config.targetBookmarkId
        ? { targetBookmarkId: config.targetBookmarkId, targetPage: config.targetPage ?? "explorer" }
        : {})
    }
  };
}

const dockBasics = getBrowserHelpTopic("dock-basics");
const windowControls = getBrowserHelpTopic("window-controls");
const workflowNotes = getBrowserHelpTopic("workflow-notes");
const keyboardShortcuts = getBrowserHelpTopic("keyboard-shortcuts");

const workflowMailBridge = getBrowserTask("workflow", "workflow_mail_bridge");
const workflowTerminalCapture = getBrowserTask("workflow", "workflow_terminal_capture");
const workflowHelpDigest = getBrowserTask("workflow", "workflow_help_digest");
const osRestore = getBrowserTask("os", "os_restore_window");
const osPopupDismissal = getBrowserTask("os", "os_popup_dismissal");
const osDockRelaunch = getBrowserTask("os", "os_dock_relaunch");
const chromeExplorerReview = getBrowserTask("chrome", "chrome_explorer_review");
const chromeHelpCapture = getBrowserTask("chrome", "chrome_help_capture");
const chromeBookmarkCleanup = getBrowserTask("chrome", "chrome_bookmark_cleanup");
const thunderbirdMockNotes = getBrowserTask("thunderbird", "thunderbird_mock_notes");
const thunderbirdPack = getBrowserTask("thunderbird", "thunderbird_task_pack");
const thunderbirdInboxTriage = getBrowserTask("thunderbird", "thunderbird_inbox_triage");

const HELP_BATCH: HelpTaskConfig[] = [
  {
    id: "browser_help_dock_heading_tail_bundle_rep",
    instruction: "In Firefox, move to Dock basics, copy the heading plus both dock reminders into dock-bundle.txt, and save.",
    subtype: "dock-bundle-rep",
    topicId: "dock-basics",
    fileId: "file-dock-bundle",
    fileName: "dock-bundle.txt",
    appendText: "Heading: " + dockBasics.title + "\n" + dockBasics.lines.join("\n"),
    startState: "dock-bundle.txt is already open beside Firefox while Explorer remains visible.",
    objective: "Capture the full Dock basics bundle and save it into the open note.",
    preopen: true
  },
  {
    id: "browser_help_window_heading_restore_bundle_rep",
    instruction: "In Firefox, move to Window controls, copy the heading plus both window reminders into window-bundle.txt, and save.",
    subtype: "window-bundle-rep",
    topicId: "window-controls",
    fileId: "file-window-bundle",
    fileName: "window-bundle.txt",
    appendText: "Heading: " + windowControls.title + "\n" + windowControls.lines.join("\n"),
    startState: "window-bundle.txt is already open while Firefox still shows OSWorld Explorer.",
    objective: "Capture the full Window controls bundle and save it.",
    preopen: true
  },
  {
    id: "browser_help_workflow_heading_followup_bundle_rep",
    instruction: "In Firefox, move to Workflow notes, copy the heading and both workflow reminders into workflow-bundle.txt, and save.",
    subtype: "workflow-bundle-rep",
    topicId: "workflow-notes",
    fileId: "file-workflow-bundle",
    fileName: "workflow-bundle.txt",
    appendText: "Heading: " + workflowNotes.title + "\n" + workflowNotes.lines.join("\n"),
    startState: "workflow-bundle.txt is already open in the editor while Firefox shows a different page.",
    objective: "Capture the full Workflow notes bundle and save the note.",
    preopen: true
  },
  {
    id: "browser_help_shortcuts_heading_followup_bundle_rep",
    instruction: "In Firefox, move to Keyboard shortcuts, copy the heading and both shortcut reminders into shortcut-bundle.txt, and save.",
    subtype: "shortcuts-bundle-rep",
    topicId: "keyboard-shortcuts",
    fileId: "file-shortcut-bundle",
    fileName: "shortcut-bundle.txt",
    appendText: "Heading: " + keyboardShortcuts.title + "\n" + keyboardShortcuts.lines.join("\n"),
    startState: "shortcut-bundle.txt is already open beside Firefox while Explorer remains visible.",
    objective: "Capture the full Keyboard shortcuts bundle and save it.",
    preopen: true
  },
  {
    id: "browser_bookmark_workflow_opening_bundle_rep",
    instruction: "In Firefox, use the Ubuntu Docs bookmark, move to Workflow notes, copy the heading and opening sentence into workflow-opening-bundle.txt, and save.",
    subtype: "bookmark-workflow-opening-bundle",
    topicId: "workflow-notes",
    fileId: "file-workflow-opening-bundle",
    fileName: "workflow-opening-bundle.txt",
    appendText: "Heading: " + workflowNotes.title + "\nOpening: " + workflowNotes.lines[0],
    startState: "Firefox starts on Explorer while workflow-opening-bundle.txt is unopened in File Explorer.",
    objective: "Use the help bookmark, move to Workflow notes, capture its heading plus opening sentence, and save.",
    preopen: false,
    targetBookmarkId: "ubuntu-docs",
    targetPage: "help",
    start: { page: "explorer", categoryId: "chrome", taskId: "chrome_help_capture" }
  },
  {
    id: "browser_bookmark_window_followup_bundle_rep",
    instruction: "In Firefox, use the Ubuntu Docs bookmark, move to Window controls, copy the heading and follow-up sentence into window-followup-bundle.txt, and save.",
    subtype: "bookmark-window-followup-bundle",
    topicId: "window-controls",
    fileId: "file-window-followup-bundle",
    fileName: "window-followup-bundle.txt",
    appendText: "Heading: " + windowControls.title + "\nFollow-up: " + windowControls.lines[1],
    startState: "Firefox starts on Explorer while window-followup-bundle.txt is unopened in File Explorer.",
    objective: "Use the help bookmark, move to Window controls, capture its heading plus follow-up sentence, and save.",
    preopen: false,
    targetBookmarkId: "ubuntu-docs",
    targetPage: "help",
    start: { page: "explorer", categoryId: "os", taskId: "os_restore_window" }
  },
  {
    id: "browser_help_clue_explorer_return_heading",
    instruction: "In Firefox Ubuntu help, look across the help topics, choose the one that says Explorer can be reopened quickly, copy that heading into explorer-return-heading.txt, and save.",
    subtype: "help-clue-explorer-return",
    topicId: "dock-basics",
    fileId: "file-explorer-return-heading",
    fileName: "explorer-return-heading.txt",
    appendText: "Heading: " + dockBasics.title,
    startState: "explorer-return-heading.txt is already open while Firefox still shows Explorer.",
    objective: "Use the help clues to choose the correct topic and save its heading.",
    preopen: true
  },
  {
    id: "browser_help_clue_unsaved_text_heading",
    instruction: "In Firefox Ubuntu help, look across the help topics, choose the one about restored unsaved text, copy that heading into unsaved-text-heading.txt, and save.",
    subtype: "help-clue-unsaved-text",
    topicId: "window-controls",
    fileId: "file-unsaved-text-heading",
    fileName: "unsaved-text-heading.txt",
    appendText: "Heading: " + windowControls.title,
    startState: "unsaved-text-heading.txt is already open beside Firefox with distractor files visible.",
    objective: "Use the help clues to choose the restore topic and save its heading.",
    preopen: true
  },
  {
    id: "browser_help_clue_multi_app_heading",
    instruction: "In Firefox Ubuntu help, look across the help topics, choose the one that mentions browser, mail, terminal, and file workflows together, copy that heading into multi-app-heading.txt, and save.",
    subtype: "help-clue-multi-app",
    topicId: "workflow-notes",
    fileId: "file-multi-app-heading",
    fileName: "multi-app-heading.txt",
    appendText: "Heading: " + workflowNotes.title,
    startState: "multi-app-heading.txt is unopened in File Explorer while Firefox starts on Explorer.",
    objective: "Use the help clues to choose the multi-app workflow topic and save its heading.",
    preopen: false
  },
  {
    id: "browser_help_clue_save_shortcut_heading",
    instruction: "In Firefox Ubuntu help, look across the help topics, choose the one about the save shortcut, copy that heading into save-shortcut-heading.txt, and save.",
    subtype: "help-clue-save-shortcut",
    topicId: "keyboard-shortcuts",
    fileId: "file-save-shortcut-heading",
    fileName: "save-shortcut-heading.txt",
    appendText: "Heading: " + keyboardShortcuts.title,
    startState: "save-shortcut-heading.txt is unopened in File Explorer while Firefox still shows Explorer.",
    objective: "Use the help clues to choose the shortcut topic and save its heading.",
    preopen: false
  }
];

const TASK_BATCH: ExplorerTaskConfig[] = [
  {
    id: "browser_card_opsdesk_summary_heading",
    instruction: "In Firefox OSWorld Explorer, identify the Ops Desk card about Thunderbird summaries, copy the card heading into opsdesk-summary-heading.txt, and save.",
    subtype: "opsdesk-summary-heading",
    categoryId: "workflow",
    taskId: "workflow_mail_bridge",
    fileId: "file-opsdesk-summary-heading",
    fileName: "opsdesk-summary-heading.txt",
    appendText: "Heading: " + workflowMailBridge.title,
    startState: "opsdesk-summary-heading.txt is already open while Firefox still shows another Workflow card.",
    objective: "Use the card clue to identify the right Workflow entry and save its heading.",
    preopen: true,
    family: "browser_compare_to_note"
  },
  {
    id: "browser_card_opsdesk_summary_coordinator_level",
    instruction: "In Firefox OSWorld Explorer, identify the Ops Desk card about Thunderbird summaries, copy the coordinator line and level label into opsdesk-summary-level.txt, and save.",
    subtype: "opsdesk-summary-coordinator-level",
    categoryId: "workflow",
    taskId: "workflow_mail_bridge",
    fileId: "file-opsdesk-summary-level",
    fileName: "opsdesk-summary-level.txt",
    appendText: "Coordinator: " + workflowMailBridge.owner + "\nLevel: " + workflowMailBridge.difficulty,
    startState: "opsdesk-summary-level.txt is already open while Firefox still highlights another card.",
    objective: "Identify the correct Workflow entry, capture its coordinator plus level block, and save.",
    preopen: true,
    family: "browser_compare_to_note"
  },
  {
    id: "browser_card_infralab_terminal_reference",
    instruction: "In Firefox OSWorld Explorer, identify the Infra Lab card about terminal capture, copy the card reference into terminal-reference.txt, and save.",
    subtype: "infralab-terminal-reference",
    categoryId: "workflow",
    taskId: "workflow_terminal_capture",
    fileId: "file-terminal-reference",
    fileName: "terminal-reference.txt",
    appendText: "Card ref: " + workflowTerminalCapture.id,
    startState: "terminal-reference.txt is unopened in File Explorer while Firefox still shows another Workflow card.",
    objective: "Identify the terminal capture card by its clue and save the reference code.",
    preopen: false,
    family: "browser_compare_to_note"
  },
  {
    id: "browser_card_supportdocs_digest_heading",
    instruction: "In Firefox OSWorld Explorer, identify the Support Docs card about digesting help, copy the card heading into supportdocs-digest-heading.txt, and save.",
    subtype: "supportdocs-digest-heading",
    categoryId: "workflow",
    taskId: "workflow_help_digest",
    fileId: "file-supportdocs-digest-heading",
    fileName: "supportdocs-digest-heading.txt",
    appendText: "Heading: " + workflowHelpDigest.title,
    startState: "supportdocs-digest-heading.txt is already open while Firefox still shows another Workflow card.",
    objective: "Identify the Support Docs card and save its heading.",
    preopen: true,
    family: "browser_compare_to_note"
  },
  {
    id: "browser_card_supportdocs_digest_step_bundle",
    instruction: "In Firefox OSWorld Explorer, identify the Support Docs card about digesting help, copy its lead step and final step into supportdocs-digest-steps.txt, and save.",
    subtype: "supportdocs-digest-step-bundle",
    categoryId: "workflow",
    taskId: "workflow_help_digest",
    fileId: "file-supportdocs-digest-steps",
    fileName: "supportdocs-digest-steps.txt",
    appendText: "Lead step: " + workflowHelpDigest.actions[0] + "\nFinal step: " + workflowHelpDigest.actions[workflowHelpDigest.actions.length - 1],
    startState: "supportdocs-digest-steps.txt is already open while Firefox still highlights another card.",
    objective: "Identify the Support Docs card, copy its lead plus final steps, and save.",
    preopen: true,
    family: "browser_compare_to_note"
  },
  {
    id: "browser_card_desktopteam_dock_heading",
    instruction: "In Firefox OSWorld Explorer, identify the Desktop Team card about relaunching Firefox from the dock, copy the card heading into desktopteam-dock-heading.txt, and save.",
    subtype: "desktopteam-dock-heading",
    categoryId: "os",
    taskId: "os_dock_relaunch",
    fileId: "file-desktopteam-dock-heading",
    fileName: "desktopteam-dock-heading.txt",
    appendText: "Heading: " + osDockRelaunch.title,
    startState: "desktopteam-dock-heading.txt is unopened in File Explorer while Firefox still shows another OS card.",
    objective: "Identify the Desktop Team dock card and save its heading.",
    preopen: false,
    family: "browser_compare_to_note"
  },
  {
    id: "browser_card_desktopteam_dock_level",
    instruction: "In Firefox OSWorld Explorer, identify the Desktop Team card about relaunching Firefox from the dock, copy its level label into desktopteam-dock-level.txt, and save.",
    subtype: "desktopteam-dock-level",
    categoryId: "os",
    taskId: "os_dock_relaunch",
    fileId: "file-desktopteam-dock-level",
    fileName: "desktopteam-dock-level.txt",
    appendText: "Level: " + osDockRelaunch.difficulty,
    startState: "desktopteam-dock-level.txt is already open while Firefox still highlights another OS card.",
    objective: "Identify the Desktop Team dock card and save its level label.",
    preopen: true,
    family: "browser_compare_to_note"
  },
  {
    id: "browser_card_research_board_only_heading",
    instruction: "In Firefox OSWorld Explorer, identify the Research Board card that stays inside Firefox only, copy the card heading into research-board-only-heading.txt, and save.",
    subtype: "research-board-only-heading",
    categoryId: "chrome",
    taskId: "chrome_explorer_review",
    fileId: "file-research-board-only-heading",
    fileName: "research-board-only-heading.txt",
    appendText: "Heading: " + chromeExplorerReview.title,
    startState: "research-board-only-heading.txt is already open while Firefox still shows another Chrome card.",
    objective: "Identify the browser-only Research Board card and save its heading.",
    preopen: true,
    family: "browser_compare_to_note"
  },
  {
    id: "browser_card_help_capture_domain_coordinator",
    instruction: "In Firefox OSWorld Explorer, identify the Chrome card about the help reminder, copy its domain tag and coordinator line into help-capture-domain-coordinator.txt, and save.",
    subtype: "help-capture-domain-coordinator-rep",
    categoryId: "chrome",
    taskId: "chrome_help_capture",
    fileId: "file-help-capture-domain-coordinator",
    fileName: "help-capture-domain-coordinator.txt",
    appendText: "Domain: " + chromeHelpCapture.domain + "\nCoordinator: " + chromeHelpCapture.owner,
    startState: "help-capture-domain-coordinator.txt is already open while Firefox still highlights another Chrome card.",
    objective: "Identify the help reminder card and save its domain plus coordinator block.",
    preopen: true,
    family: "browser_compare_to_note"
  },
  {
    id: "browser_card_bookmark_cleanup_step_pair",
    instruction: "In Firefox OSWorld Explorer, identify the Chrome card about bookmark note cleanup, copy the middle two steps into bookmark-cleanup-step-pair.txt, and save.",
    subtype: "bookmark-cleanup-step-pair",
    categoryId: "chrome",
    taskId: "chrome_bookmark_cleanup",
    fileId: "file-bookmark-cleanup-step-pair",
    fileName: "bookmark-cleanup-step-pair.txt",
    appendText: "Middle steps: " + chromeBookmarkCleanup.actions[1] + " | " + chromeBookmarkCleanup.actions[2],
    startState: "bookmark-cleanup-step-pair.txt is already open while Firefox still highlights another Chrome card.",
    objective: "Identify the bookmark cleanup card, capture its middle two steps, and save.",
    preopen: true,
    family: "browser_compare_to_note"
  },
  {
    id: "browser_card_mock_notes_coordinator_level",
    instruction: "In Firefox OSWorld Explorer, identify the Mail Desk card about mock environment notes, copy the coordinator line and level label into mock-notes-level.txt, and save.",
    subtype: "mock-notes-coordinator-level",
    categoryId: "thunderbird",
    taskId: "thunderbird_mock_notes",
    fileId: "file-mock-notes-level",
    fileName: "mock-notes-level.txt",
    appendText: "Coordinator: " + thunderbirdMockNotes.owner + "\nLevel: " + thunderbirdMockNotes.difficulty,
    startState: "mock-notes-level.txt is already open while Firefox still shows another Thunderbird card.",
    objective: "Identify the mock notes card, capture its coordinator plus level block, and save.",
    preopen: true,
    family: "browser_compare_to_note"
  },
  {
    id: "browser_card_task_pack_cross_app_heading",
    instruction: "In Firefox OSWorld Explorer, identify the Mail Desk card that spans Thunderbird and Firefox together, copy the card heading into task-pack-cross-app-heading.txt, and save.",
    subtype: "task-pack-cross-app-heading",
    categoryId: "thunderbird",
    taskId: "thunderbird_task_pack",
    fileId: "file-task-pack-cross-app-heading",
    fileName: "task-pack-cross-app-heading.txt",
    appendText: "Heading: " + thunderbirdPack.title,
    startState: "task-pack-cross-app-heading.txt is unopened in File Explorer while Firefox still shows another Thunderbird card.",
    objective: "Identify the cross-app Thunderbird card and save its heading.",
    preopen: false,
    family: "browser_compare_to_note"
  },
  {
    id: "browser_card_inbox_triage_followup_block",
    instruction: "In Firefox OSWorld Explorer, identify the Mail Desk card about inbox triage, copy the coordinator line and final step into inbox-triage-followup.txt, and save.",
    subtype: "inbox-triage-followup-block",
    categoryId: "thunderbird",
    taskId: "thunderbird_inbox_triage",
    fileId: "file-inbox-triage-followup",
    fileName: "inbox-triage-followup.txt",
    appendText: "Coordinator: " + thunderbirdInboxTriage.owner + "\nFinal step: " + thunderbirdInboxTriage.actions[thunderbirdInboxTriage.actions.length - 1],
    startState: "inbox-triage-followup.txt is already open while Firefox still shows another Thunderbird card.",
    objective: "Identify the inbox triage card, capture its follow-up block, and save.",
    preopen: true,
    family: "browser_compare_to_note"
  },
  {
    id: "browser_bookmark_task_pack_heading_capture_rep",
    instruction: "In Firefox, use the Research Board bookmark, move to the Thunderbird task-pack card, copy the card heading into bookmarked-task-pack-heading.txt, and save.",
    subtype: "bookmark-task-pack-heading-rep",
    categoryId: "thunderbird",
    taskId: "thunderbird_task_pack",
    fileId: "file-bookmarked-task-pack-heading",
    fileName: "bookmarked-task-pack-heading.txt",
    appendText: "Heading: " + thunderbirdPack.title,
    startState: "Firefox starts on Ubuntu help while bookmarked-task-pack-heading.txt is unopened in File Explorer.",
    objective: "Use the Research Board bookmark, move to the Thunderbird task-pack card, and save its heading.",
    preopen: false,
    targetBookmarkId: "research-board",
    targetPage: "explorer",
    start: { page: "help", topicId: "dock-basics" },
    family: "browser_task_metadata_to_note"
  },
  {
    id: "browser_bookmark_help_capture_level_capture_rep",
    instruction: "In Firefox, use the Downloads bookmark, move to the Chrome help reminder card, copy its level label into bookmarked-help-level.txt, and save.",
    subtype: "bookmark-help-capture-level",
    categoryId: "chrome",
    taskId: "chrome_help_capture",
    fileId: "file-bookmarked-help-level",
    fileName: "bookmarked-help-level.txt",
    appendText: "Level: " + chromeHelpCapture.difficulty,
    startState: "Firefox starts on Ubuntu help while bookmarked-help-level.txt is unopened in File Explorer.",
    objective: "Use the Downloads bookmark, move back to Explorer, identify the help reminder card, and save its level label.",
    preopen: false,
    targetBookmarkId: "downloads",
    targetPage: "explorer",
    start: { page: "help", topicId: "keyboard-shortcuts" },
    family: "browser_task_metadata_to_note"
  }
];

function noteOpenPredicates(preopen: boolean | undefined): PredicateId[] {
  return preopen === false ? ["note.target_opened"] : [];
}

function makeHelpTask(config: HelpTaskConfig): TaskSpec {
  return {
    id: config.id,
    instruction: config.instruction,
    domain: "Chrome",
    split: "representative",
    maxSteps: config.targetBookmarkId ? 72 : 68,
    seedDefaults: [0, 1, 2],
    summary: {
      family: "browser_help_extract_to_note",
      subtype: config.subtype,
      level: "C",
      apps: ["browser", "note", "files"],
      startState: config.startState,
      objective: config.objective,
      implementationPath
    },
    setup(_seed, viewport) {
      return buildHelpTask(config, viewport);
    },
    goalPredicates: config.targetBookmarkId
      ? (["browser.bookmark_opened", "browser.help_topic_opened", ...noteOpenPredicates(config.preopen), "note.target_appended", "note.saved"] as PredicateId[])
      : (["browser.help_topic_opened", ...noteOpenPredicates(config.preopen), "note.target_appended", "note.saved"] as PredicateId[]),
    progressPredicates: config.targetBookmarkId
      ? (["browser.bookmark_opened", "browser.help_topic_opened", ...noteOpenPredicates(config.preopen), "note.target_appended", "note.saved"] as PredicateId[])
      : (["browser.help_topic_opened", ...noteOpenPredicates(config.preopen), "note.target_appended", "note.saved"] as PredicateId[]),
    forbiddenPredicates: []
  };
}

function makeExplorerTask(config: ExplorerTaskConfig): TaskSpec {
  return {
    id: config.id,
    instruction: config.instruction,
    domain: "Chrome",
    split: "representative",
    maxSteps: config.targetBookmarkId ? 72 : 68,
    seedDefaults: [0, 1, 2],
    summary: {
      family: config.family ?? "browser_task_metadata_to_note",
      subtype: config.subtype,
      level: config.family === "browser_compare_to_note" ? "D" : "C",
      apps: ["browser", "note", "files"],
      startState: config.startState,
      objective: config.objective,
      implementationPath
    },
    setup(_seed, viewport) {
      return buildExplorerTask(config, viewport);
    },
    goalPredicates: config.targetBookmarkId
      ? (["browser.bookmark_opened", "browser.task_selected", ...noteOpenPredicates(config.preopen), "note.target_appended", "note.saved"] as PredicateId[])
      : (["browser.task_selected", ...noteOpenPredicates(config.preopen), "note.target_appended", "note.saved"] as PredicateId[]),
    progressPredicates: config.targetBookmarkId
      ? (["browser.bookmark_opened", "browser.task_selected", ...noteOpenPredicates(config.preopen), "note.target_appended", "note.saved"] as PredicateId[])
      : (["browser.task_selected", ...noteOpenPredicates(config.preopen), "note.target_appended", "note.saved"] as PredicateId[]),
    forbiddenPredicates: []
  };
}

export const REPRESENTATIVE_BROWSER_BULK_TASKS: TaskSpec[] = [
  ...HELP_BATCH.map(makeHelpTask),
  ...TASK_BATCH.map(makeExplorerTask)
];
