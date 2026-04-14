import {
  formatBrowserTaskApps,
  getBrowserHelpTopic,
  getBrowserTask,
  listBrowserTasks
} from "../../browser-fixtures.js";
import type { BrowserTaskCard, TaskSpec, Viewport } from "../../types.js";
import {
  configureBrowserStart,
  createScenarioFile,
  openBrowserNoteScenario
} from "../scenario-builders.js";
import { browserBounds, explorerBounds, noteBoundsRight } from "./shared.js";

const implementationPath = "packages/core/src/tasks/representative/browser-extended-tasks.ts";

function buildHelpTask(
  viewport: Viewport,
  instruction: string,
  topicId: string,
  fileId: string,
  fileName: string,
  appendText: string,
  initialContent = "",
  preopen = true
) {
  const envState = openBrowserNoteScenario({
    instruction,
    viewport,
    start: { page: "explorer", categoryId: "workflow", taskId: "workflow_mail_bridge" },
    browserBounds: browserBounds(),
    workspaceFiles: [
      createScenarioFile("file-draft", "draft.txt", "Draft reference", "/workspace"),
      createScenarioFile("file-reference", "reference.txt", "Reference material", "/workspace")
    ],
    explorerWindow: {
      windowId: "explorer-main",
      bounds: explorerBounds(),
      focused: false,
      minimized: false
    },
    noteTarget: {
      fileId,
      fileName,
      initialContent,
      preopen,
      windowId: "notes-target",
      bounds: noteBoundsRight(),
      focused: false,
      minimized: false
    }
  }).envState;
  return {
    envState,
    targets: {
      targetFileId: fileId,
      targetHelpTopicId: topicId,
      appendText,
      expectedSavedContent: initialContent + appendText
    }
  };
}

function buildTaskTask(
  viewport: Viewport,
  instruction: string,
  categoryId: string,
  taskId: string,
  fileId: string,
  fileName: string,
  appendText: string,
  initialContent = "",
  preopen = true,
  startCategoryId = "workflow",
  startTaskId = "workflow_mail_bridge"
) {
  const envState = openBrowserNoteScenario({
    instruction,
    viewport,
    start: { page: "explorer", categoryId: startCategoryId, taskId: startTaskId },
    browserBounds: browserBounds(),
    workspaceFiles: [
      createScenarioFile("file-draft", "draft.txt", "Draft reference", "/workspace"),
      createScenarioFile("file-reference", "reference.txt", "Reference material", "/workspace")
    ],
    explorerWindow: {
      windowId: "explorer-main",
      bounds: explorerBounds(),
      focused: false,
      minimized: false
    },
    noteTarget: {
      fileId,
      fileName,
      initialContent,
      preopen,
      windowId: "notes-target",
      bounds: noteBoundsRight(),
      focused: false,
      minimized: false
    }
  }).envState;
  return {
    envState,
    targets: {
      targetFileId: fileId,
      targetCategoryId: categoryId,
      targetBrowserTaskId: taskId,
      appendText,
      expectedSavedContent: initialContent + appendText
    }
  };
}

function findTask(predicate: (task: BrowserTaskCard) => boolean) {
  const match = listBrowserTasks().find((entry) => predicate(entry.task));
  if (!match) {
    throw new Error("Expected browser task match was not found.");
  }
  return match;
}

const windowControls = getBrowserHelpTopic("window-controls");
const workflowNotes = getBrowserHelpTopic("workflow-notes");
const keyboardShortcuts = getBrowserHelpTopic("keyboard-shortcuts");
const workflowMailBridge = getBrowserTask("workflow", "workflow_mail_bridge");
const workflowTerminalCapture = getBrowserTask("workflow", "workflow_terminal_capture");
const workflowHelpDigest = getBrowserTask("workflow", "workflow_help_digest");
const thunderbirdMockNotes = getBrowserTask("thunderbird", "thunderbird_mock_notes");
const thunderbirdPack = getBrowserTask("thunderbird", "thunderbird_task_pack");
const chromeBookmarkCleanup = getBrowserTask("chrome", "chrome_bookmark_cleanup");
const chromeHelpCapture = getBrowserTask("chrome", "chrome_help_capture");
const terminalTask = findTask((task) => task.appRefs.includes("Terminal"));
const mailSummaryTask = findTask((task) => task.title.includes("summary"));
const desktopFirefoxTask = findTask((task) => task.owner === "Desktop Team" && task.difficulty === "Easy" && task.appRefs.includes("Firefox"));
const hardSupportTask = findTask((task) => task.owner === "Support Docs" && task.difficulty === "Hard");

export const REPRESENTATIVE_BROWSER_EXTENDED_TASKS: TaskSpec[] = [
  {
    id: "browser_help_topic_title_to_note",
    instruction: "In Firefox, switch to Window controls, write its topic title into topic-title.txt, and save.",
    domain: "Chrome",
    split: "representative",
    maxSteps: 60,
    seedDefaults: [0, 1, 2],
    summary: {
      family: "browser_help_extract_to_note",
      level: "C",
      apps: ["browser", "note", "files"],
      startState: "topic-title.txt is already open beside Firefox and distractor files remain visible in File Explorer.",
      objective: "Switch to the requested help topic, record its title in the open note, and save.",
      implementationPath
    },
    setup(_seed, viewport) {
      return buildHelpTask(
        viewport,
        "In Firefox, switch to Window controls, write its topic title into topic-title.txt, and save.",
        "window-controls",
        "file-topic-title",
        "topic-title.txt",
        windowControls.title
      );
    },
    goalPredicates: ["browser.help_topic_opened", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.help_topic_opened", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  },
  {
    id: "browser_help_header_and_tip_to_note",
    instruction: "In Firefox, switch to Window controls, write its title and first help line into topic-brief.txt, and save.",
    domain: "Chrome",
    split: "representative",
    maxSteps: 64,
    seedDefaults: [0, 1, 2],
    summary: {
      family: "browser_help_extract_to_note",
      level: "C",
      apps: ["browser", "note", "files"],
      startState: "topic-brief.txt is already open and Firefox starts on the wrong page.",
      objective: "Capture a two-line help brief from the requested topic and save it in the open note.",
      implementationPath
    },
    setup(_seed, viewport) {
      return buildHelpTask(
        viewport,
        "In Firefox, switch to Window controls, write its title and first help line into topic-brief.txt, and save.",
        "window-controls",
        "file-topic-brief",
        "topic-brief.txt",
        windowControls.title + "\n" + windowControls.lines[0]
      );
    },
    goalPredicates: ["browser.help_topic_opened", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.help_topic_opened", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  },
  {
    id: "browser_help_bookmark_capture_note",
    instruction: "In Firefox, use the Ubuntu Docs bookmark, switch to Workflow notes, write its first detail line into bookmark-help-log.txt, and save.",
    domain: "Chrome",
    split: "representative",
    maxSteps: 64,
    seedDefaults: [0, 1, 2],
    summary: {
      family: "browser_help_extract_to_note",
      level: "C",
      apps: ["browser", "note", "files"],
      startState: "bookmark-help-log.txt is unopened in File Explorer while Firefox starts on Explorer.",
      objective: "Use the help bookmark, navigate to the requested topic, open the note, and save the requested detail line.",
      implementationPath
    },
    setup(_seed, viewport) {
      const built = buildHelpTask(
        viewport,
        "In Firefox, use the Ubuntu Docs bookmark, switch to Workflow notes, write its first detail line into bookmark-help-log.txt, and save.",
        "workflow-notes",
        "file-bookmark-help-log",
        "bookmark-help-log.txt",
        workflowNotes.lines[0],
        "",
        false
      );
      return {
        ...built,
        targets: {
          ...built.targets,
          targetBookmarkId: "ubuntu-docs",
          targetPage: "help"
        }
      };
    },
    goalPredicates: ["browser.bookmark_opened", "browser.help_topic_opened", "note.target_opened", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.bookmark_opened", "browser.help_topic_opened", "note.target_opened", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  },
  {
    id: "browser_record_task_action_count_note",
    instruction: "In Firefox Task Board, select the Bridge a Thunderbird summary into notes task, write its action count into action-count.txt, and save.",
    domain: "Chrome",
    split: "representative",
    maxSteps: 64,
    seedDefaults: [0, 1, 2],
    summary: {
      family: "browser_task_metadata_to_note",
      level: "C",
      apps: ["browser", "note", "files"],
      startState: "action-count.txt is already open and Firefox shows a different task card.",
      objective: "Select the requested Workflow task, count its visible actions, record that line, and save.",
      implementationPath
    },
    setup(_seed, viewport) {
      return buildTaskTask(
        viewport,
        "In Firefox Task Board, select the Bridge a Thunderbird summary into notes task, write its action count into action-count.txt, and save.",
        "workflow",
        "workflow_mail_bridge",
        "file-action-count",
        "action-count.txt",
        "Action count: " + String(workflowMailBridge.actions.length),
        "",
        true,
        "workflow",
        "workflow_terminal_capture"
      );
    },
    goalPredicates: ["browser.task_selected", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.task_selected", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  },
  {
    id: "browser_record_task_apps_note",
    instruction: "In Firefox Task Board, select the Capture terminal output in notes task, write its app list into task-apps-log.txt, and save.",
    domain: "Chrome",
    split: "representative",
    maxSteps: 64,
    seedDefaults: [0, 1, 2],
    summary: {
      family: "browser_task_metadata_to_note",
      level: "C",
      apps: ["browser", "note", "files"],
      startState: "task-apps-log.txt is already open and distractor files remain visible beside Firefox.",
      objective: "Select the requested task, record its app list into the open note, and save.",
      implementationPath
    },
    setup(_seed, viewport) {
      return buildTaskTask(
        viewport,
        "In Firefox Task Board, select the Capture terminal output in notes task, write its app list into task-apps-log.txt, and save.",
        "workflow",
        "workflow_terminal_capture",
        "file-task-apps-log",
        "task-apps-log.txt",
        "Apps: " + formatBrowserTaskApps(workflowTerminalCapture)
      );
    },
    goalPredicates: ["browser.task_selected", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.task_selected", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  },
  {
    id: "browser_record_task_owner_difficulty_note",
    instruction: "In Firefox Task Board, select the Capture the workspace reminder task, write its owner and difficulty into owner-difficulty.txt, and save.",
    domain: "Chrome",
    split: "representative",
    maxSteps: 64,
    seedDefaults: [0, 1, 2],
    summary: {
      family: "browser_task_metadata_to_note",
      level: "C",
      apps: ["browser", "note", "files"],
      startState: "owner-difficulty.txt is already open with distractor files visible in File Explorer.",
      objective: "Select the requested Thunderbird task, record both owner and difficulty into the open note, and save.",
      implementationPath
    },
    setup(_seed, viewport) {
      return buildTaskTask(
        viewport,
        "In Firefox Task Board, select the Capture the workspace reminder task, write its owner and difficulty into owner-difficulty.txt, and save.",
        "thunderbird",
        "thunderbird_mock_notes",
        "file-owner-difficulty",
        "owner-difficulty.txt",
        "Owner: " + thunderbirdMockNotes.owner + "\nDifficulty: " + thunderbirdMockNotes.difficulty
      );
    },
    goalPredicates: ["browser.task_selected", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.task_selected", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  },
  {
    id: "browser_record_task_full_card_note",
    instruction: "In Firefox Task Board, select the Clean up a browser bookmark note task, write its id, title, owner, and difficulty into task-card-log.txt, and save.",
    domain: "Chrome",
    split: "representative",
    maxSteps: 68,
    seedDefaults: [0, 1, 2],
    summary: {
      family: "browser_task_metadata_to_note",
      level: "C",
      apps: ["browser", "note", "files"],
      startState: "task-card-log.txt is already open and Firefox still shows the wrong task card.",
      objective: "Select the requested Chrome task, record a four-line task card summary, and save.",
      implementationPath
    },
    setup(_seed, viewport) {
      return buildTaskTask(
        viewport,
        "In Firefox Task Board, select the Clean up a browser bookmark note task, write its id, title, owner, and difficulty into task-card-log.txt, and save.",
        "chrome",
        "chrome_bookmark_cleanup",
        "file-task-card-log",
        "task-card-log.txt",
        "Task ID: " + chromeBookmarkCleanup.id + "\nTitle: " + chromeBookmarkCleanup.title + "\nOwner: " + chromeBookmarkCleanup.owner + "\nDifficulty: " + chromeBookmarkCleanup.difficulty
      );
    },
    goalPredicates: ["browser.task_selected", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.task_selected", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  },
  {
    id: "browser_find_terminal_task_and_log_id",
    instruction: "In Firefox Task Board, find the task whose app list includes Terminal, write its task id into compare-log.txt, and save.",
    domain: "Chrome",
    split: "representative",
    maxSteps: 72,
    seedDefaults: [0, 1, 2],
    summary: {
      family: "browser_compare_to_note",
      level: "D",
      apps: ["browser", "note", "files"],
      startState: "compare-log.txt is unopened in File Explorer while Firefox starts on a non-terminal task card.",
      objective: "Search the visible task cards by metadata, find the only task that mentions Terminal, and save its id into the note.",
      implementationPath
    },
    setup(_seed, viewport) {
      return buildTaskTask(
        viewport,
        "In Firefox Task Board, find the task whose app list includes Terminal, write its task id into compare-log.txt, and save.",
        terminalTask.categoryId,
        terminalTask.task.id,
        "file-compare-log",
        "compare-log.txt",
        terminalTask.task.id,
        "",
        false
      );
    },
    goalPredicates: ["browser.task_selected", "note.target_opened", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.task_selected", "note.target_opened", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  },
  {
    id: "browser_find_mail_review_task_and_log_title",
    instruction: "In Firefox Task Board, find the task about reviewing a Thunderbird summary, write its title into review-log.txt, and save.",
    domain: "Chrome",
    split: "representative",
    maxSteps: 72,
    seedDefaults: [0, 1, 2],
    summary: {
      family: "browser_compare_to_note",
      level: "D",
      apps: ["browser", "note", "files"],
      startState: "review-log.txt is already open and Firefox starts on the wrong task card.",
      objective: "Identify the task whose title mentions the Thunderbird summary workflow, record its title, and save.",
      implementationPath
    },
    setup(_seed, viewport) {
      return buildTaskTask(
        viewport,
        "In Firefox Task Board, find the task about reviewing a Thunderbird summary, write its title into review-log.txt, and save.",
        mailSummaryTask.categoryId,
        mailSummaryTask.task.id,
        "file-review-log",
        "review-log.txt",
        mailSummaryTask.task.title,
        "",
        true,
        "workflow",
        "workflow_terminal_capture"
      );
    },
    goalPredicates: ["browser.task_selected", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.task_selected", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  },
  {
    id: "browser_find_easy_desktop_task_and_log_id",
    instruction: "In Firefox Task Board, find the easy Desktop Team task that still uses Firefox, write its id into desktop-log.txt, and save.",
    domain: "Chrome",
    split: "representative",
    maxSteps: 72,
    seedDefaults: [0, 1, 2],
    summary: {
      family: "browser_compare_to_note",
      level: "D",
      apps: ["browser", "note", "files"],
      startState: "desktop-log.txt is already open beside Firefox and distractor files remain visible.",
      objective: "Use owner, difficulty, and app metadata together to identify the requested OS task, then save its id.",
      implementationPath
    },
    setup(_seed, viewport) {
      return buildTaskTask(
        viewport,
        "In Firefox Task Board, find the easy Desktop Team task that still uses Firefox, write its id into desktop-log.txt, and save.",
        desktopFirefoxTask.categoryId,
        desktopFirefoxTask.task.id,
        "file-desktop-log",
        "desktop-log.txt",
        desktopFirefoxTask.task.id
      );
    },
    goalPredicates: ["browser.task_selected", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.task_selected", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  },
  {
    id: "browser_find_hard_support_task_and_log_title",
    instruction: "In Firefox Task Board, find the hard Support Docs task, write its title into support-log.txt, and save.",
    domain: "Chrome",
    split: "representative",
    maxSteps: 72,
    seedDefaults: [0, 1, 2],
    summary: {
      family: "browser_compare_to_note",
      level: "D",
      apps: ["browser", "note", "files"],
      startState: "support-log.txt is unopened while Firefox starts on a different task card.",
      objective: "Use owner and difficulty metadata together to identify the requested task, open the note, and save its title.",
      implementationPath
    },
    setup(_seed, viewport) {
      return buildTaskTask(
        viewport,
        "In Firefox Task Board, find the hard Support Docs task, write its title into support-log.txt, and save.",
        hardSupportTask.categoryId,
        hardSupportTask.task.id,
        "file-support-log",
        "support-log.txt",
        hardSupportTask.task.title,
        "",
        false
      );
    },
    goalPredicates: ["browser.task_selected", "note.target_opened", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.task_selected", "note.target_opened", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  },
  {
    id: "browser_compare_help_topics_and_log_title",
    instruction: "In Firefox Ubuntu help, compare Dock basics and Keyboard shortcuts, write the topic that mentions Ctrl+S into topic-compare.txt, and save.",
    domain: "Chrome",
    split: "representative",
    maxSteps: 72,
    seedDefaults: [0, 1, 2],
    summary: {
      family: "browser_compare_to_note",
      level: "D",
      apps: ["browser", "note", "files"],
      startState: "topic-compare.txt is already open beside Firefox while Explorer remains on screen with distractor files.",
      objective: "Compare two help topics by their visible lines, identify the one that mentions Ctrl+S, and save its title.",
      implementationPath
    },
    setup(_seed, viewport) {
      return buildHelpTask(
        viewport,
        "In Firefox Ubuntu help, compare Dock basics and Keyboard shortcuts, write the topic that mentions Ctrl+S into topic-compare.txt, and save.",
        "keyboard-shortcuts",
        "file-topic-compare",
        "topic-compare.txt",
        keyboardShortcuts.title
      );
    },
    goalPredicates: ["browser.help_topic_opened", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.help_topic_opened", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  },
  {
    id: "browser_compare_two_tasks_and_log_common_app",
    instruction: "In Firefox Task Board, compare Capture terminal output in notes and Capture the Ubuntu help reminder, write their shared app into common-app.txt, and save.",
    domain: "Chrome",
    split: "representative",
    maxSteps: 72,
    seedDefaults: [0, 1, 2],
    summary: {
      family: "browser_compare_to_note",
      level: "D",
      apps: ["browser", "note", "files"],
      startState: "common-app.txt is already open while Firefox starts on the Workflow category.",
      objective: "Compare the app lists on two different task cards, identify the shared app, and save it in the open note.",
      implementationPath
    },
    setup(_seed, viewport) {
      return buildTaskTask(
        viewport,
        "In Firefox Task Board, compare Capture terminal output in notes and Capture the Ubuntu help reminder, write their shared app into common-app.txt, and save.",
        "chrome",
        "chrome_help_capture",
        "file-common-app",
        "common-app.txt",
        "Text Editor"
      );
    },
    goalPredicates: ["browser.task_selected", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.task_selected", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  },
  {
    id: "browser_fix_help_digest_note",
    instruction: "In Firefox, switch to Workflow notes, append its title and second detail line to help-digest.txt, and save.",
    domain: "Chrome",
    split: "representative",
    maxSteps: 68,
    seedDefaults: [0, 1, 2],
    summary: {
      family: "browser_brief_to_note",
      level: "C",
      apps: ["browser", "note", "files"],
      startState: "help-digest.txt is already open with a heading while Firefox starts on Explorer.",
      objective: "Capture a second help-topic digest block into the open note and save it.",
      implementationPath
    },
    setup(_seed, viewport) {
      return buildHelpTask(
        viewport,
        "In Firefox, switch to Workflow notes, append its title and second detail line to help-digest.txt, and save.",
        "workflow-notes",
        "file-help-digest",
        "help-digest.txt",
        "Topic: " + workflowNotes.title + "\nReminder: " + workflowNotes.lines[1],
        "Saved digest:\n",
        true
      );
    },
    goalPredicates: ["browser.help_topic_opened", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.help_topic_opened", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  },
  {
    id: "browser_fix_task_owner_brief_note",
    instruction: "In Firefox Task Board, select the Capture the Ubuntu help reminder task, append its owner and apps block to owner-brief.txt, and save.",
    domain: "Chrome",
    split: "representative",
    maxSteps: 68,
    seedDefaults: [0, 1, 2],
    summary: {
      family: "browser_brief_to_note",
      level: "C",
      apps: ["browser", "note", "files"],
      startState: "owner-brief.txt is already open with a heading and Firefox starts on the wrong task card.",
      objective: "Select the requested task, append its owner/apps block to the note, and save.",
      implementationPath
    },
    setup(_seed, viewport) {
      return buildTaskTask(
        viewport,
        "In Firefox Task Board, select the Capture the Ubuntu help reminder task, append its owner and apps block to owner-brief.txt, and save.",
        "chrome",
        "chrome_help_capture",
        "file-owner-brief",
        "owner-brief.txt",
        "Owner: " + chromeHelpCapture.owner + "\nApps: " + formatBrowserTaskApps(chromeHelpCapture),
        "Owner brief:\n",
        true
      );
    },
    goalPredicates: ["browser.task_selected", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.task_selected", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  },
  {
    id: "browser_bookmark_task_title_to_note",
    instruction: "In Firefox, use the Research Board bookmark to open Task Board, select the Capture the Ubuntu help reminder task, write its title into bookmark-task-title.txt, and save.",
    domain: "Chrome",
    split: "representative",
    maxSteps: 68,
    seedDefaults: [0, 1, 2],
    summary: {
      family: "browser_task_metadata_to_note",
      subtype: "task-title-via-bookmark",
      level: "C",
      apps: ["browser", "note", "files"],
      startState: "Firefox starts on Ubuntu help while bookmark-task-title.txt is unopened in File Explorer.",
      objective: "Use the Research Board bookmark to reopen Explorer, select the requested task, record its title, and save the note.",
      implementationPath
    },
    setup(_seed, viewport) {
      const built = buildTaskTask(
        viewport,
        "In Firefox, use the Research Board bookmark to open Task Board, select the Capture the Ubuntu help reminder task, write its title into bookmark-task-title.txt, and save.",
        "chrome",
        "chrome_help_capture",
        "file-bookmark-task-title",
        "bookmark-task-title.txt",
        chromeHelpCapture.title,
        "",
        false
      );
      configureBrowserStart(built.envState.appStates.browserLite["browser-main"], {
        page: "help",
        topicId: "workflow-notes"
      });
      return {
        ...built,
        targets: {
          ...built.targets,
          targetBookmarkId: "research-board",
          targetPage: "explorer"
        }
      };
    },
    goalPredicates: ["browser.bookmark_opened", "browser.task_selected", "note.target_opened", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.bookmark_opened", "browser.task_selected", "note.target_opened", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  },
  {
    id: "browser_help_two_lines_to_note",
    instruction: "In Firefox, switch to Window controls, write its first and second help lines into window-controls-note.txt, and save.",
    domain: "Chrome",
    split: "representative",
    maxSteps: 68,
    seedDefaults: [0, 1, 2],
    summary: {
      family: "browser_help_extract_to_note",
      subtype: "help-two-lines",
      level: "C",
      apps: ["browser", "note", "files"],
      startState: "window-controls-note.txt is already open beside Firefox while distractor files remain visible in File Explorer.",
      objective: "Switch to the requested help topic, capture both visible help lines, and save the open note.",
      implementationPath
    },
    setup(_seed, viewport) {
      return buildHelpTask(
        viewport,
        "In Firefox, switch to Window controls, write its first and second help lines into window-controls-note.txt, and save.",
        "window-controls",
        "file-window-controls-note",
        "window-controls-note.txt",
        windowControls.lines[0] + "\n" + windowControls.lines[1]
      );
    },
    goalPredicates: ["browser.help_topic_opened", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.help_topic_opened", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  },
  {
    id: "browser_record_task_actions_to_note",
    instruction: "In Firefox Task Board, select the Bridge a Thunderbird summary into notes task, write its first and last actions into task-actions.txt, and save.",
    domain: "Chrome",
    split: "representative",
    maxSteps: 68,
    seedDefaults: [0, 1, 2],
    summary: {
      family: "browser_task_metadata_to_note",
      subtype: "task-actions-first-last",
      level: "C",
      apps: ["browser", "note", "files"],
      startState: "task-actions.txt is already open while Firefox still shows a different task card.",
      objective: "Select the requested workflow task, record its first and last actions, and save the note.",
      implementationPath
    },
    setup(_seed, viewport) {
      return buildTaskTask(
        viewport,
        "In Firefox Task Board, select the Bridge a Thunderbird summary into notes task, write its first and last actions into task-actions.txt, and save.",
        "workflow",
        "workflow_mail_bridge",
        "file-task-actions",
        "task-actions.txt",
        "First action: " + workflowMailBridge.actions[0] + "\nLast action: " + workflowMailBridge.actions[workflowMailBridge.actions.length - 1],
        "",
        true,
        "workflow",
        "workflow_terminal_capture"
      );
    },
    goalPredicates: ["browser.task_selected", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.task_selected", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  },
  {
    id: "browser_compare_tasks_and_log_shared_owner",
    instruction: "In Firefox Task Board, compare Clean up a browser bookmark note and Digest a help topic into notes, write their shared owner into shared-owner.txt, and save.",
    domain: "Chrome",
    split: "representative",
    maxSteps: 72,
    seedDefaults: [0, 1, 2],
    summary: {
      family: "browser_compare_to_note",
      subtype: "task-compare-shared-owner",
      level: "D",
      apps: ["browser", "note", "files"],
      startState: "shared-owner.txt is unopened in File Explorer while Firefox starts on a different task card.",
      objective: "Compare the two requested task cards, identify their shared owner, and save it into the note.",
      implementationPath
    },
    setup(_seed, viewport) {
      return buildTaskTask(
        viewport,
        "In Firefox Task Board, compare Clean up a browser bookmark note and Digest a help topic into notes, write their shared owner into shared-owner.txt, and save.",
        "chrome",
        "chrome_bookmark_cleanup",
        "file-shared-owner",
        "shared-owner.txt",
        chromeBookmarkCleanup.owner,
        "",
        false
      );
    },
    goalPredicates: ["browser.task_selected", "note.target_opened", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.task_selected", "note.target_opened", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  },
  {
    id: "browser_find_dual_app_mail_task_and_log_id",
    instruction: "In Firefox Task Board, find the Thunderbird task whose app list includes both Thunderbird and Firefox, write its task id into dual-app-mail.txt, and save.",
    domain: "Chrome",
    split: "representative",
    maxSteps: 72,
    seedDefaults: [0, 1, 2],
    summary: {
      family: "browser_compare_to_note",
      subtype: "task-find-thunderbird-firefox",
      level: "D",
      apps: ["browser", "note", "files"],
      startState: "dual-app-mail.txt is unopened in File Explorer while Firefox starts on a different task card.",
      objective: "Use the task app list to identify the only Thunderbird task that also references Firefox, then save its id.",
      implementationPath
    },
    setup(_seed, viewport) {
      return buildTaskTask(
        viewport,
        "In Firefox Task Board, find the Thunderbird task whose app list includes both Thunderbird and Firefox, write its task id into dual-app-mail.txt, and save.",
        "thunderbird",
        "thunderbird_task_pack",
        "file-dual-app-mail",
        "dual-app-mail.txt",
        thunderbirdPack.id,
        "",
        false
      );
    },
    goalPredicates: ["browser.task_selected", "note.target_opened", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.task_selected", "note.target_opened", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  },
  {
    id: "browser_compare_help_topics_and_log_restore_title",
    instruction: "In Firefox Ubuntu help, compare Dock basics and Window controls, write the topic that mentions unsaved text staying intact into restore-topic.txt, and save.",
    domain: "Chrome",
    split: "representative",
    maxSteps: 72,
    seedDefaults: [0, 1, 2],
    summary: {
      family: "browser_compare_to_note",
      subtype: "help-compare-restore-intact",
      level: "D",
      apps: ["browser", "note", "files"],
      startState: "restore-topic.txt is already open while Firefox starts on Explorer with distractor files visible.",
      objective: "Compare two help topics by their visible guidance, identify the one about unsaved text staying intact, and save its title.",
      implementationPath
    },
    setup(_seed, viewport) {
      return buildHelpTask(
        viewport,
        "In Firefox Ubuntu help, compare Dock basics and Window controls, write the topic that mentions unsaved text staying intact into restore-topic.txt, and save.",
        "window-controls",
        "file-restore-topic",
        "restore-topic.txt",
        windowControls.title
      );
    },
    goalPredicates: ["browser.help_topic_opened", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.help_topic_opened", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  },
  {
    id: "browser_find_maildesk_firefox_task_and_log_heading",
    instruction: "In Firefox Task Board, find the Mail Desk task that also uses Firefox, record its card heading in mail-firefox-heading.txt, and save.",
    domain: "Chrome",
    split: "representative",
    maxSteps: 72,
    seedDefaults: [0, 1, 2],
    summary: {
      family: "browser_compare_to_note",
      subtype: "task-find-maildesk-firefox-heading",
      level: "D",
      apps: ["browser", "note", "files"],
      startState: "mail-firefox-heading.txt is unopened in File Explorer while Firefox starts on a different task card.",
      objective: "Use owner and app metadata together to identify the requested Thunderbird card, then save its heading.",
      implementationPath
    },
    setup(_seed, viewport) {
      return buildTaskTask(
        viewport,
        "In Firefox Task Board, find the Mail Desk task that also uses Firefox, record its card heading in mail-firefox-heading.txt, and save.",
        "thunderbird",
        "thunderbird_task_pack",
        "file-mail-firefox-heading",
        "mail-firefox-heading.txt",
        thunderbirdPack.title,
        "",
        false
      );
    },
    goalPredicates: ["browser.task_selected", "note.target_opened", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.task_selected", "note.target_opened", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  },
  {
    id: "browser_compare_workflow_tasks_and_log_shared_level_label",
    instruction: "In Firefox Task Board, compare Bridge a Thunderbird summary into notes and Capture terminal output in notes, write their matching level label into workflow-common-level.txt, and save.",
    domain: "Chrome",
    split: "representative",
    maxSteps: 72,
    seedDefaults: [0, 1, 2],
    summary: {
      family: "browser_compare_to_note",
      subtype: "task-compare-shared-level-label",
      level: "D",
      apps: ["browser", "note", "files"],
      startState: "workflow-common-level.txt is already open while Firefox starts on the Workflow category.",
      objective: "Compare two workflow task cards, identify the matching level label they share, and save it in the open note.",
      implementationPath
    },
    setup(_seed, viewport) {
      return buildTaskTask(
        viewport,
        "In Firefox Task Board, compare Bridge a Thunderbird summary into notes and Capture terminal output in notes, write their matching level label into workflow-common-level.txt, and save.",
        "workflow",
        "workflow_terminal_capture",
        "file-workflow-common-level",
        "workflow-common-level.txt",
        workflowMailBridge.difficulty
      );
    },
    goalPredicates: ["browser.task_selected", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.task_selected", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  },
  {
    id: "browser_record_task_domain_owner_block",
    instruction: "In Firefox Task Board, select the Review the Ubuntu desktop task pack task, append its domain and owner block to pack-domain-owner.txt, and save.",
    domain: "Chrome",
    split: "representative",
    maxSteps: 68,
    seedDefaults: [0, 1, 2],
    summary: {
      family: "browser_brief_to_note",
      subtype: "task-domain-owner-block",
      level: "C",
      apps: ["browser", "note", "files"],
      startState: "pack-domain-owner.txt is already open with a heading while Firefox starts on a different task card.",
      objective: "Select the requested Thunderbird task, append its domain and owner block, and save the note.",
      implementationPath
    },
    setup(_seed, viewport) {
      return buildTaskTask(
        viewport,
        "In Firefox Task Board, select the Review the Ubuntu desktop task pack task, append its domain and owner block to pack-domain-owner.txt, and save.",
        "thunderbird",
        "thunderbird_task_pack",
        "file-pack-domain-owner",
        "pack-domain-owner.txt",
        "Domain: " + thunderbirdPack.domain + "\nOwner: " + thunderbirdPack.owner,
        "Pack summary:\n",
        true
      );
    },
    goalPredicates: ["browser.task_selected", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.task_selected", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  },
  {
    id: "browser_bookmark_help_reminder_block_note",
    instruction: "In Firefox, use the Ubuntu Docs bookmark, switch to Workflow notes, append the topic name and follow-up reminder to workflow-reminder-block.txt, and save.",
    domain: "Chrome",
    split: "representative",
    maxSteps: 68,
    seedDefaults: [0, 1, 2],
    summary: {
      family: "browser_help_extract_to_note",
      subtype: "bookmark-help-reminder-block",
      level: "C",
      apps: ["browser", "note", "files"],
      startState: "workflow-reminder-block.txt is unopened in File Explorer while Firefox starts on Explorer.",
      objective: "Use the help bookmark, capture the workflow topic header and reminder block, open the note, and save it.",
      implementationPath
    },
    setup(_seed, viewport) {
      const built = buildHelpTask(
        viewport,
        "In Firefox, use the Ubuntu Docs bookmark, switch to Workflow notes, append the topic name and follow-up reminder to workflow-reminder-block.txt, and save.",
        "workflow-notes",
        "file-workflow-reminder-block",
        "workflow-reminder-block.txt",
        "Topic: " + workflowNotes.title + "\nReminder: " + workflowNotes.lines[1],
        "",
        false
      );
      return {
        ...built,
        targets: {
          ...built.targets,
          targetBookmarkId: "ubuntu-docs",
          targetPage: "help"
        }
      };
    },
    goalPredicates: ["browser.bookmark_opened", "browser.help_topic_opened", "note.target_opened", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.bookmark_opened", "browser.help_topic_opened", "note.target_opened", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  }
];
