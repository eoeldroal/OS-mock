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

const implementationPath = "packages/core/src/tasks/starter/browser-bulk-tasks.ts";

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

function addNoteTarget(
  envState: ReturnType<typeof createEmptyEnv>,
  fileId: string,
  fileName: string,
  initialContent: string,
  preopen: boolean
) {
  let next = addFiles(envState, [createFile(fileId, fileName, initialContent)]);
  next = addExplorerWindow(next, "explorer-main", explorerBounds(), false);
  if (preopen) {
    next = addNoteEditorWindow(next, "notes-target", fileId, noteBoundsRight(), false, initialContent, false);
  }
  return next;
}

function buildHelpTask(config: HelpTaskConfig, viewport: Viewport) {
  const start = config.start ?? { page: "explorer", categoryId: "workflow", taskId: "workflow_mail_bridge" };
  let envState = createBrowserEnv(viewport, config.instruction, start);
  envState = addNoteTarget(envState, config.fileId, config.fileName, config.initialContent ?? "", config.preopen ?? false);
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
  envState = addNoteTarget(envState, config.fileId, config.fileName, config.initialContent ?? "", config.preopen ?? false);
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
const chromeHelpCapture = getBrowserTask("chrome", "chrome_help_capture");
const chromeBookmarkCleanup = getBrowserTask("chrome", "chrome_bookmark_cleanup");
const thunderbirdPack = getBrowserTask("thunderbird", "thunderbird_task_pack");

const HELP_BATCH: HelpTaskConfig[] = [
  {
    id: "browser_help_dock_heading_snapshot",
    instruction: "In Firefox, open Dock basics, copy the section heading into dock-heading-snapshot.txt, and save.",
    subtype: "dock-heading-snapshot",
    topicId: "dock-basics",
    fileId: "file-dock-heading-snapshot",
    fileName: "dock-heading-snapshot.txt",
    appendText: "Heading: " + dockBasics.title,
    startState: "dock-heading-snapshot.txt is unopened in File Explorer while Firefox still shows OSWorld Explorer.",
    objective: "Move to Dock basics, capture its section heading, and save the note.",
    preopen: false
  },
  {
    id: "browser_help_window_restore_hint_capture",
    instruction: "In Firefox, open Window controls, copy the sentence about restored unsaved text into restore-hint-capture.txt, and save.",
    subtype: "window-restore-hint",
    topicId: "window-controls",
    fileId: "file-restore-hint-capture",
    fileName: "restore-hint-capture.txt",
    appendText: windowControls.lines[1],
    startState: "restore-hint-capture.txt is unopened in File Explorer while Firefox starts on the wrong page.",
    objective: "Move to Window controls, capture the restore guidance sentence, and save.",
    preopen: false
  },
  {
    id: "browser_help_workflow_opening_sentence_capture",
    instruction: "In Firefox, open Workflow notes, copy the opening sentence into workflow-opening-capture.txt, and save.",
    subtype: "workflow-opening-sentence",
    topicId: "workflow-notes",
    fileId: "file-workflow-opening-capture",
    fileName: "workflow-opening-capture.txt",
    appendText: workflowNotes.lines[0],
    startState: "workflow-opening-capture.txt is already open while Firefox still shows the wrong task card.",
    objective: "Move to Workflow notes, capture its opening sentence, and save the open note.",
    preopen: true
  },
  {
    id: "browser_help_shortcuts_heading_opening_block",
    instruction: "In Firefox, open Keyboard shortcuts, copy the heading and the opening sentence into shortcut-opening-block.txt, and save.",
    subtype: "shortcuts-heading-opening-block",
    topicId: "keyboard-shortcuts",
    fileId: "file-shortcut-opening-block",
    fileName: "shortcut-opening-block.txt",
    appendText: "Heading: " + keyboardShortcuts.title + "\nOpening: " + keyboardShortcuts.lines[0],
    startState: "shortcut-opening-block.txt is already open beside Firefox.",
    objective: "Capture the heading plus opening sentence from Keyboard shortcuts and save.",
    preopen: true
  },
  {
    id: "browser_help_dock_heading_tail_block",
    instruction: "In Firefox, open Dock basics, copy the heading and the closing sentence into dock-tail-block.txt, and save.",
    subtype: "dock-heading-tail-block",
    topicId: "dock-basics",
    fileId: "file-dock-tail-block",
    fileName: "dock-tail-block.txt",
    appendText: "Heading: " + dockBasics.title + "\nClosing: " + dockBasics.lines[1],
    startState: "dock-tail-block.txt is already open while Firefox still shows OSWorld Explorer.",
    objective: "Capture the Dock basics heading plus closing sentence and save the note.",
    preopen: true
  },
  {
    id: "browser_bookmark_workflow_heading_snapshot",
    instruction: "In Firefox, use the Ubuntu Docs bookmark, move to Workflow notes, copy the section heading into workflow-heading-snapshot.txt, and save.",
    subtype: "bookmark-workflow-heading",
    topicId: "workflow-notes",
    fileId: "file-workflow-heading-snapshot",
    fileName: "workflow-heading-snapshot.txt",
    appendText: "Heading: " + workflowNotes.title,
    startState: "Firefox starts on Explorer while workflow-heading-snapshot.txt is already open in the editor.",
    objective: "Use the help bookmark, move to Workflow notes, capture its heading, and save.",
    preopen: true,
    targetBookmarkId: "ubuntu-docs",
    targetPage: "help",
    start: { page: "explorer", categoryId: "workflow", taskId: "workflow_terminal_capture" }
  },
  {
    id: "browser_bookmark_shortcuts_tail_sentence",
    instruction: "In Firefox, use the Ubuntu Docs bookmark, move to Keyboard shortcuts, copy the closing sentence into shortcut-tail-sentence.txt, and save.",
    subtype: "bookmark-shortcuts-tail",
    topicId: "keyboard-shortcuts",
    fileId: "file-shortcut-tail-sentence",
    fileName: "shortcut-tail-sentence.txt",
    appendText: keyboardShortcuts.lines[1],
    startState: "shortcut-tail-sentence.txt is unopened in File Explorer while Firefox starts on Explorer.",
    objective: "Use the help bookmark, move to Keyboard shortcuts, capture the closing sentence, and save.",
    preopen: false,
    targetBookmarkId: "ubuntu-docs",
    targetPage: "help",
    start: { page: "explorer", categoryId: "chrome", taskId: "chrome_explorer_review" }
  },
  {
    id: "browser_help_window_full_excerpt",
    instruction: "In Firefox, open Window controls, copy the full help excerpt into window-full-excerpt.txt, and save.",
    subtype: "window-full-excerpt",
    topicId: "window-controls",
    fileId: "file-window-full-excerpt",
    fileName: "window-full-excerpt.txt",
    appendText: "Heading: " + windowControls.title + "\n" + windowControls.lines.join("\n"),
    startState: "window-full-excerpt.txt is unopened in File Explorer while Firefox starts on Explorer.",
    objective: "Capture the full Window controls excerpt and save it into the note.",
    preopen: false
  },
  {
    id: "browser_help_dock_tail_sentence_preopen",
    instruction: "In Firefox, open Dock basics, copy the closing sentence into dock-tail-preopen.txt, and save.",
    subtype: "dock-tail-preopen",
    topicId: "dock-basics",
    fileId: "file-dock-tail-preopen",
    fileName: "dock-tail-preopen.txt",
    appendText: dockBasics.lines[1],
    startState: "dock-tail-preopen.txt is already open beside Firefox.",
    objective: "Move to Dock basics, capture the closing sentence, and save the open note.",
    preopen: true
  },
  {
    id: "browser_help_shortcuts_save_hint_capture",
    instruction: "In Firefox, open Keyboard shortcuts, copy the save shortcut sentence into save-hint-capture.txt, and save.",
    subtype: "shortcuts-save-hint",
    topicId: "keyboard-shortcuts",
    fileId: "file-save-hint-capture",
    fileName: "save-hint-capture.txt",
    appendText: keyboardShortcuts.lines[0],
    startState: "save-hint-capture.txt is unopened in File Explorer while Firefox starts on Explorer.",
    objective: "Move to Keyboard shortcuts, capture the save shortcut sentence, and save.",
    preopen: false
  },
  {
    id: "browser_bookmark_window_heading_snapshot",
    instruction: "In Firefox, use the Ubuntu Docs bookmark, move to Window controls, copy the section heading into window-heading-snapshot.txt, and save.",
    subtype: "bookmark-window-heading",
    topicId: "window-controls",
    fileId: "file-window-heading-snapshot",
    fileName: "window-heading-snapshot.txt",
    appendText: "Heading: " + windowControls.title,
    startState: "Firefox starts on Explorer while window-heading-snapshot.txt remains unopened in File Explorer.",
    objective: "Use the help bookmark, move to Window controls, capture its heading, and save.",
    preopen: false,
    targetBookmarkId: "ubuntu-docs",
    targetPage: "help",
    start: { page: "explorer", categoryId: "os", taskId: "os_popup_dismissal" }
  },
  {
    id: "browser_help_workflow_reminder_block",
    instruction: "In Firefox, open Workflow notes, copy the heading plus the follow-up sentence into workflow-reminder-block-starter.txt, and save.",
    subtype: "workflow-reminder-block",
    topicId: "workflow-notes",
    fileId: "file-workflow-reminder-block-starter",
    fileName: "workflow-reminder-block-starter.txt",
    appendText: "Heading: " + workflowNotes.title + "\nFollow-up: " + workflowNotes.lines[1],
    startState: "workflow-reminder-block-starter.txt is already open while Firefox still shows OSWorld Explorer.",
    objective: "Capture the Workflow notes heading plus follow-up sentence and save the note.",
    preopen: true
  }
];

const TASK_BATCH: ExplorerTaskConfig[] = [
  {
    id: "browser_task_mail_bridge_heading_snapshot",
    instruction: "In Firefox OSWorld Explorer, open the Workflow card about Thunderbird summaries, copy the card heading into mail-bridge-heading.txt, and save.",
    subtype: "mail-bridge-heading",
    categoryId: "workflow",
    taskId: "workflow_mail_bridge",
    fileId: "file-mail-bridge-heading",
    fileName: "mail-bridge-heading.txt",
    appendText: "Heading: " + workflowMailBridge.title,
    startState: "mail-bridge-heading.txt is unopened in File Explorer while Firefox still highlights the wrong card.",
    objective: "Open the Workflow summary card, capture its heading, and save the note.",
    preopen: false
  },
  {
    id: "browser_task_mail_bridge_coordinator_block",
    instruction: "In Firefox OSWorld Explorer, open the Workflow card about Thunderbird summaries, copy the coordinator line into mail-bridge-coordinator.txt, and save.",
    subtype: "mail-bridge-coordinator",
    categoryId: "workflow",
    taskId: "workflow_mail_bridge",
    fileId: "file-mail-bridge-coordinator",
    fileName: "mail-bridge-coordinator.txt",
    appendText: "Coordinator: " + workflowMailBridge.owner,
    startState: "mail-bridge-coordinator.txt is already open while Firefox still shows another card.",
    objective: "Open the Workflow summary card, capture the coordinator line, and save.",
    preopen: true
  },
  {
    id: "browser_task_mail_bridge_lead_step",
    instruction: "In Firefox OSWorld Explorer, open the Workflow card about Thunderbird summaries, copy the lead step into mail-bridge-lead-step.txt, and save.",
    subtype: "mail-bridge-lead-step",
    categoryId: "workflow",
    taskId: "workflow_mail_bridge",
    fileId: "file-mail-bridge-lead-step",
    fileName: "mail-bridge-lead-step.txt",
    appendText: "Lead step: " + workflowMailBridge.actions[0],
    startState: "mail-bridge-lead-step.txt is unopened in File Explorer while Firefox still highlights the wrong card.",
    objective: "Open the Workflow summary card, capture the lead step, and save the note.",
    preopen: false
  },
  {
    id: "browser_task_mail_bridge_finish_step",
    instruction: "In Firefox OSWorld Explorer, open the Workflow card about Thunderbird summaries, copy the final step into mail-bridge-finish-step.txt, and save.",
    subtype: "mail-bridge-finish-step",
    categoryId: "workflow",
    taskId: "workflow_mail_bridge",
    fileId: "file-mail-bridge-finish-step",
    fileName: "mail-bridge-finish-step.txt",
    appendText: "Final step: " + workflowMailBridge.actions[workflowMailBridge.actions.length - 1],
    startState: "mail-bridge-finish-step.txt is unopened in File Explorer while Firefox starts on Explorer.",
    objective: "Open the Workflow summary card, capture the final step, and save the note.",
    preopen: false
  },
  {
    id: "browser_task_terminal_capture_domain_tag",
    instruction: "In Firefox OSWorld Explorer, open the Workflow card about terminal capture, copy its domain tag into terminal-domain-tag.txt, and save.",
    subtype: "terminal-domain-tag",
    categoryId: "workflow",
    taskId: "workflow_terminal_capture",
    fileId: "file-terminal-domain-tag",
    fileName: "terminal-domain-tag.txt",
    appendText: "Domain: " + workflowTerminalCapture.domain,
    startState: "terminal-domain-tag.txt is already open beside Firefox.",
    objective: "Open the terminal capture card, copy its domain tag, and save the note.",
    preopen: true
  },
  {
    id: "browser_task_terminal_capture_coordinator_block",
    instruction: "In Firefox OSWorld Explorer, open the Workflow card about terminal capture, copy the coordinator line and domain tag into terminal-coordinator-block.txt, and save.",
    subtype: "terminal-coordinator-domain",
    categoryId: "workflow",
    taskId: "workflow_terminal_capture",
    fileId: "file-terminal-coordinator-block",
    fileName: "terminal-coordinator-block.txt",
    appendText: "Coordinator: " + workflowTerminalCapture.owner + "\nDomain: " + workflowTerminalCapture.domain,
    startState: "terminal-coordinator-block.txt is already open while Firefox still shows another Workflow card.",
    objective: "Open the terminal capture card, copy its coordinator plus domain block, and save.",
    preopen: true
  },
  {
    id: "browser_task_help_digest_level_label",
    instruction: "In Firefox OSWorld Explorer, open the Workflow card about digesting help, copy its level label into help-digest-level.txt, and save.",
    subtype: "help-digest-level",
    categoryId: "workflow",
    taskId: "workflow_help_digest",
    fileId: "file-help-digest-level",
    fileName: "help-digest-level.txt",
    appendText: "Level: " + workflowHelpDigest.difficulty,
    startState: "help-digest-level.txt is unopened in File Explorer while Firefox still highlights the wrong card.",
    objective: "Open the help digest card, copy its level label, and save the note.",
    preopen: false
  },
  {
    id: "browser_task_restore_window_heading_snapshot",
    instruction: "In Firefox OSWorld Explorer, open the OS card about bringing back the editor, copy the card heading into restore-window-heading.txt, and save.",
    subtype: "restore-window-heading",
    categoryId: "os",
    taskId: "os_restore_window",
    fileId: "file-restore-window-heading",
    fileName: "restore-window-heading.txt",
    appendText: "Heading: " + osRestore.title,
    startState: "restore-window-heading.txt is unopened in File Explorer while Firefox starts on another OS card.",
    objective: "Open the OS restore card, capture its heading, and save the note.",
    preopen: false
  },
  {
    id: "browser_task_popup_dismissal_domain_level",
    instruction: "In Firefox OSWorld Explorer, open the OS card about clearing a blocking popup, copy the domain tag and level label into popup-domain-level.txt, and save.",
    subtype: "popup-domain-level",
    categoryId: "os",
    taskId: "os_popup_dismissal",
    fileId: "file-popup-domain-level",
    fileName: "popup-domain-level.txt",
    appendText: "Domain: " + osPopupDismissal.domain + "\nLevel: " + osPopupDismissal.difficulty,
    startState: "popup-domain-level.txt is already open beside Firefox.",
    objective: "Open the popup handling card, capture the domain plus level block, and save.",
    preopen: true
  },
  {
    id: "browser_task_dock_relaunch_coordinator_note",
    instruction: "In Firefox OSWorld Explorer, open the OS card about relaunching Firefox from the dock, copy the coordinator line into dock-relaunch-coordinator.txt, and save.",
    subtype: "dock-relaunch-coordinator",
    categoryId: "os",
    taskId: "os_dock_relaunch",
    fileId: "file-dock-relaunch-coordinator",
    fileName: "dock-relaunch-coordinator.txt",
    appendText: "Coordinator: " + osDockRelaunch.owner,
    startState: "dock-relaunch-coordinator.txt is unopened in File Explorer while Firefox still shows another OS card.",
    objective: "Open the dock relaunch card, capture the coordinator line, and save the note.",
    preopen: false
  },
  {
    id: "browser_task_help_capture_coordinator_domain",
    instruction: "In Firefox OSWorld Explorer, open the Chrome card about the help reminder, copy the coordinator line and domain tag into help-capture-coordinator-domain.txt, and save.",
    subtype: "help-capture-coordinator-domain",
    categoryId: "chrome",
    taskId: "chrome_help_capture",
    fileId: "file-help-capture-coordinator-domain",
    fileName: "help-capture-coordinator-domain.txt",
    appendText: "Coordinator: " + chromeHelpCapture.owner + "\nDomain: " + chromeHelpCapture.domain,
    startState: "help-capture-coordinator-domain.txt is unopened in File Explorer while Firefox still highlights another card.",
    objective: "Open the help reminder card, capture its coordinator plus domain block, and save.",
    preopen: false
  },
  {
    id: "browser_task_bookmark_cleanup_heading_coordinator",
    instruction: "In Firefox OSWorld Explorer, open the Chrome card about bookmark note cleanup, copy the card heading and coordinator line into bookmark-cleanup-heading.txt, and save.",
    subtype: "bookmark-cleanup-heading-coordinator",
    categoryId: "chrome",
    taskId: "chrome_bookmark_cleanup",
    fileId: "file-bookmark-cleanup-heading",
    fileName: "bookmark-cleanup-heading.txt",
    appendText: "Heading: " + chromeBookmarkCleanup.title + "\nCoordinator: " + chromeBookmarkCleanup.owner,
    startState: "bookmark-cleanup-heading.txt is already open while Firefox still shows the wrong Chrome card.",
    objective: "Open the bookmark cleanup card, capture its heading plus coordinator line, and save.",
    preopen: true
  },
  {
    id: "browser_bookmark_pack_coordinator_block",
    instruction: "In Firefox, use the Research Board bookmark, open the Thunderbird task-pack card, copy the coordinator line and app roster into task-pack-coordinator.txt, and save.",
    subtype: "bookmark-pack-coordinator-roster",
    categoryId: "thunderbird",
    taskId: "thunderbird_task_pack",
    fileId: "file-task-pack-coordinator",
    fileName: "task-pack-coordinator.txt",
    appendText: "Coordinator: " + thunderbirdPack.owner + "\nApp roster: " + formatBrowserTaskApps(thunderbirdPack),
    startState: "Firefox starts on Ubuntu help while task-pack-coordinator.txt is unopened in File Explorer.",
    objective: "Use the Research Board bookmark, move to the Thunderbird card, capture its coordinator plus app roster, and save.",
    preopen: false,
    targetBookmarkId: "research-board",
    targetPage: "explorer",
    start: { page: "help", topicId: "workflow-notes" }
  }
];

function noteOpenPredicates(preopen: boolean | undefined): PredicateId[] {
  return preopen ? [] : ["note.target_opened"];
}

function makeHelpTask(config: HelpTaskConfig): TaskSpec {
  return {
    id: config.id,
    instruction: config.instruction,
    domain: "Chrome",
    split: "starter",
    maxSteps: config.targetBookmarkId ? 38 : 36,
    seedDefaults: [0, 1, 2],
    summary: {
      family: "browser_help_extract_to_note",
      subtype: config.subtype,
      level: "B",
      apps: ["browser", "note"],
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
    split: "starter",
    maxSteps: config.targetBookmarkId ? 38 : 36,
    seedDefaults: [0, 1, 2],
    summary: {
      family: "browser_task_metadata_to_note",
      subtype: config.subtype,
      level: "B",
      apps: ["browser", "note"],
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

export const STARTER_BROWSER_BULK_TASKS: TaskSpec[] = [
  ...HELP_BATCH.map(makeHelpTask),
  ...TASK_BATCH.map(makeExplorerTask)
];
