import { getBrowserHelpTopic, getBrowserTask, formatBrowserTaskApps } from "../../browser-fixtures.js";
import type { TaskSpec, Viewport } from "../../types.js";
import {
  configureBrowserStart,
  openBrowserNoteScenario,
  openBrowserWithPage
} from "../scenario-builders.js";
import { browserBounds, explorerBounds, noteBoundsRight } from "./shared.js";

const implementationPath = "packages/core/src/tasks/starter/browser-extended-tasks.ts";

function createBrowserOnlyEnv(viewport: Viewport, instruction: string) {
  return openBrowserWithPage({
    instruction,
    viewport,
    start: { page: "explorer", categoryId: "workflow", taskId: "workflow_mail_bridge" },
    browserBounds: browserBounds()
  }).envState;
}

function buildBookmarkTask(viewport: Viewport, instruction: string, startMode: "explorer" | "help", topicId?: string) {
  return openBrowserWithPage({
    instruction,
    viewport,
    start:
      startMode === "help"
        ? { page: "help", topicId: topicId ?? "workflow-notes" }
        : { page: "explorer", categoryId: "workflow", taskId: "workflow_mail_bridge" },
    browserBounds: browserBounds()
  }).envState;
}

function buildHelpToNoteTask(
  viewport: Viewport,
  instruction: string,
  topicId: string,
  fileId: string,
  fileName: string,
  appendText: string,
  initialContent = "",
  preopen = false
) {
  const envState = openBrowserNoteScenario({
    instruction,
    viewport,
    start: { page: "explorer", categoryId: "workflow", taskId: "workflow_mail_bridge" },
    browserBounds: browserBounds(),
    explorerWindow: preopen
      ? false
      : {
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

function buildTaskToNoteTask(
  viewport: Viewport,
  instruction: string,
  categoryId: string,
  taskId: string,
  fileId: string,
  fileName: string,
  appendText: string,
  initialContent = "",
  preopen = false
) {
  const envState = openBrowserNoteScenario({
    instruction,
    viewport,
    start: { page: "explorer", categoryId: "workflow", taskId: "workflow_mail_bridge" },
    browserBounds: browserBounds(),
    explorerWindow: preopen
      ? false
      : {
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

const dockBasics = getBrowserHelpTopic("dock-basics");
const keyboardShortcuts = getBrowserHelpTopic("keyboard-shortcuts");
const workflowNotes = getBrowserHelpTopic("workflow-notes");
const windowControls = getBrowserHelpTopic("window-controls");
const osRestore = getBrowserTask("os", "os_restore_window");
const osPopupDismissal = getBrowserTask("os", "os_popup_dismissal");
const osDockRelaunch = getBrowserTask("os", "os_dock_relaunch");
const chromeHelp = getBrowserTask("chrome", "chrome_help_capture");
const chromeBookmarkCleanup = getBrowserTask("chrome", "chrome_bookmark_cleanup");
const workflowDigest = getBrowserTask("workflow", "workflow_help_digest");
const thunderbirdPack = getBrowserTask("thunderbird", "thunderbird_task_pack");

export const STARTER_BROWSER_EXTENDED_TASKS: TaskSpec[] = [
  {
    id: "browser_open_osworld_from_bookmark",
    instruction: "In Firefox, use the Task Board bookmark to open Task Board.",
    domain: "Chrome",
    split: "starter",
    maxSteps: 12,
    seedDefaults: [0, 1, 2],
    summary: {
      family: "browser_bookmark_navigation",
      level: "A",
      apps: ["browser"],
      startState: "Firefox starts on Ubuntu help with a help topic already visible.",
      objective: "Use a bookmark instead of the tab strip to return to Task Board.",
      implementationPath
    },
    setup(_seed, viewport) {
      return {
        envState: buildBookmarkTask(viewport, "In Firefox, use the Task Board bookmark to open Task Board.", "help", "workflow-notes"),
        targets: { targetBookmarkId: "osworld", targetPage: "explorer" }
      };
    },
    goalPredicates: ["browser.bookmark_opened"],
    progressPredicates: ["browser.bookmark_opened"],
    forbiddenPredicates: []
  },
  {
    id: "browser_open_help_from_bookmark",
    instruction: "In Firefox, use the Ubuntu Docs bookmark to open Ubuntu help.",
    domain: "Chrome",
    split: "starter",
    maxSteps: 12,
    seedDefaults: [0, 1, 2],
    summary: {
      family: "browser_bookmark_navigation",
      level: "A",
      apps: ["browser"],
      startState: "Firefox starts on Task Board with a task card selected.",
      objective: "Open Ubuntu help by bookmark rather than by tab switch.",
      implementationPath
    },
    setup(_seed, viewport) {
      return {
        envState: buildBookmarkTask(viewport, "In Firefox, use the Ubuntu Docs bookmark to open Ubuntu help.", "explorer"),
        targets: { targetBookmarkId: "ubuntu-docs", targetPage: "help" }
      };
    },
    goalPredicates: ["browser.bookmark_opened"],
    progressPredicates: ["browser.bookmark_opened"],
    forbiddenPredicates: []
  },
  {
    id: "browser_open_research_board_from_bookmark",
    instruction: "In Firefox, use the Research Board bookmark to open Task Board and focus the Chrome category.",
    domain: "Chrome",
    split: "starter",
    maxSteps: 14,
    seedDefaults: [0, 1, 2],
    summary: {
      family: "browser_bookmark_navigation",
      level: "A",
      apps: ["browser"],
      startState: "Firefox starts on Ubuntu help and the browser bookmarks are visible.",
      objective: "Use the Research Board bookmark to jump back into Explorer with the Chrome category selected.",
      implementationPath
    },
    setup(_seed, viewport) {
      return {
        envState: buildBookmarkTask(viewport, "In Firefox, use the Research Board bookmark to open Task Board and focus the Chrome category.", "help", "dock-basics"),
        targets: { targetBookmarkId: "research-board", targetPage: "explorer", targetCategoryId: "chrome" }
      };
    },
    goalPredicates: ["browser.bookmark_opened", "browser.category_selected"],
    progressPredicates: ["browser.bookmark_opened", "browser.category_selected"],
    forbiddenPredicates: []
  },
  {
    id: "browser_open_help_topic_from_bookmark",
    instruction: "In Firefox, use the Ubuntu Docs bookmark, switch to Keyboard shortcuts, and leave that topic open.",
    domain: "Chrome",
    split: "starter",
    maxSteps: 16,
    seedDefaults: [0, 1, 2],
    summary: {
      family: "browser_bookmark_navigation",
      level: "A",
      apps: ["browser"],
      startState: "Firefox starts on Explorer with the wrong task selected.",
      objective: "Open Ubuntu help from bookmarks and select the requested help topic.",
      implementationPath
    },
    setup(_seed, viewport) {
      return {
        envState: buildBookmarkTask(viewport, "In Firefox, use the Ubuntu Docs bookmark, switch to Keyboard shortcuts, and leave that topic open.", "explorer"),
        targets: { targetBookmarkId: "ubuntu-docs", targetPage: "help", targetHelpTopicId: "keyboard-shortcuts" }
      };
    },
    goalPredicates: ["browser.bookmark_opened", "browser.help_topic_opened"],
    progressPredicates: ["browser.bookmark_opened", "browser.help_topic_opened"],
    forbiddenPredicates: []
  },
  {
    id: "browser_help_dock_line_to_note",
    instruction: "In Firefox, open Ubuntu help, switch to Dock basics, write the requested help line into dock-note.txt, and save.",
    domain: "Chrome",
    split: "starter",
    maxSteps: 34,
    seedDefaults: [0, 1, 2],
    summary: {
      family: "browser_help_extract_to_note",
      level: "B",
      apps: ["browser", "note"],
      startState: "Firefox starts on Explorer while dock-note.txt remains unopened in File Explorer.",
      objective: "Open the target note, switch to the requested help topic, record its main line, and save.",
      implementationPath
    },
    setup(_seed, viewport) {
      return buildHelpToNoteTask(
        viewport,
        "In Firefox, open Ubuntu help, switch to Dock basics, write the requested help line into dock-note.txt, and save.",
        "dock-basics",
        "file-dock-note",
        "dock-note.txt",
        dockBasics.lines[0]
      );
    },
    goalPredicates: ["browser.help_topic_opened", "note.target_opened", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.help_topic_opened", "note.target_opened", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  },
  {
    id: "browser_help_shortcut_line_to_note",
    instruction: "In Firefox, use the Ubuntu Docs bookmark, switch to Keyboard shortcuts, type the requested line into shortcut-note.txt, and save.",
    domain: "Chrome",
    split: "starter",
    maxSteps: 34,
    seedDefaults: [0, 1, 2],
    summary: {
      family: "browser_help_extract_to_note",
      level: "B",
      apps: ["browser", "note"],
      startState: "shortcut-note.txt is already open and Firefox starts on Explorer.",
      objective: "Use bookmarks to reach the requested help topic, append the shortcut line into the open note, and save.",
      implementationPath
    },
    setup(_seed, viewport) {
      const built = buildHelpToNoteTask(
        viewport,
        "In Firefox, use the Ubuntu Docs bookmark, switch to Keyboard shortcuts, type the requested line into shortcut-note.txt, and save.",
        "keyboard-shortcuts",
        "file-shortcut-note",
        "shortcut-note.txt",
        keyboardShortcuts.lines[0],
        "",
        true
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
    goalPredicates: ["browser.bookmark_opened", "browser.help_topic_opened", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.bookmark_opened", "browser.help_topic_opened", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  },
  {
    id: "browser_record_task_title_to_note",
    instruction: "In Firefox Task Board, select the Restore a minimized editor task, write its title into task-title.txt, and save.",
    domain: "Chrome",
    split: "starter",
    maxSteps: 34,
    seedDefaults: [0, 1, 2],
    summary: {
      family: "browser_task_metadata_to_note",
      level: "B",
      apps: ["browser", "note"],
      startState: "Firefox starts on the wrong Explorer selection and task-title.txt is still unopened in File Explorer.",
      objective: "Select the requested task, open the note, record its title, and save.",
      implementationPath
    },
    setup(_seed, viewport) {
      return buildTaskToNoteTask(
        viewport,
        "In Firefox Task Board, select the Restore a minimized editor task, write its title into task-title.txt, and save.",
        "os",
        "os_restore_window",
        "file-task-title",
        "task-title.txt",
        osRestore.title
      );
    },
    goalPredicates: ["browser.task_selected", "note.target_opened", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.task_selected", "note.target_opened", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  },
  {
    id: "browser_record_task_owner_to_note",
    instruction: "In Firefox Task Board, select the Capture the Ubuntu help reminder task, write its owner line into owner-note.txt, and save.",
    domain: "Chrome",
    split: "starter",
    maxSteps: 34,
    seedDefaults: [0, 1, 2],
    summary: {
      family: "browser_task_metadata_to_note",
      level: "B",
      apps: ["browser", "note"],
      startState: "owner-note.txt is already open, but Firefox still shows the wrong task card.",
      objective: "Select the requested task, append its owner line into the open note, and save.",
      implementationPath
    },
    setup(_seed, viewport) {
      return buildTaskToNoteTask(
        viewport,
        "In Firefox Task Board, select the Capture the Ubuntu help reminder task, write its owner line into owner-note.txt, and save.",
        "chrome",
        "chrome_help_capture",
        "file-owner-note",
        "owner-note.txt",
        "Owner: " + chromeHelp.owner,
        "",
        true
      );
    },
    goalPredicates: ["browser.task_selected", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.task_selected", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  },
  {
    id: "browser_complete_help_brief_note",
    instruction: "In Firefox, switch to Workflow notes, complete help-brief.txt with the requested topic and detail lines, and save.",
    domain: "Chrome",
    split: "starter",
    maxSteps: 36,
    seedDefaults: [0, 1, 2],
    summary: {
      family: "browser_brief_to_note",
      level: "B",
      apps: ["browser", "note"],
      startState: "help-brief.txt is already open with a short heading and Firefox starts on Explorer.",
      objective: "Fill the open brief with the requested help topic title and detail line, then save.",
      implementationPath
    },
    setup(_seed, viewport) {
      return buildHelpToNoteTask(
        viewport,
        "In Firefox, switch to Workflow notes, complete help-brief.txt with the requested topic and detail lines, and save.",
        "workflow-notes",
        "file-help-brief",
        "help-brief.txt",
        "Topic: " + workflowNotes.title + "\nDetail: " + workflowNotes.lines[0],
        "Help brief:\n",
        true
      );
    },
    goalPredicates: ["browser.help_topic_opened", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.help_topic_opened", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  },
  {
    id: "browser_complete_task_brief_note",
    instruction: "In Firefox Task Board, select the Digest a help topic into notes task, complete task-brief.txt with its id and title, and save.",
    domain: "Chrome",
    split: "starter",
    maxSteps: 36,
    seedDefaults: [0, 1, 2],
    summary: {
      family: "browser_brief_to_note",
      level: "B",
      apps: ["browser", "note"],
      startState: "task-brief.txt is already open with a short heading while Firefox starts on the wrong selection.",
      objective: "Select the requested task and finish the open brief with its id and title before saving.",
      implementationPath
    },
    setup(_seed, viewport) {
      return buildTaskToNoteTask(
        viewport,
        "In Firefox Task Board, select the Digest a help topic into notes task, complete task-brief.txt with its id and title, and save.",
        "workflow",
        "workflow_help_digest",
        "file-task-brief",
        "task-brief.txt",
        "Task ID: " + workflowDigest.id + "\nTitle: " + workflowDigest.title,
        "Task brief:\n",
        true
      );
    },
    goalPredicates: ["browser.task_selected", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.task_selected", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  },
  {
    id: "browser_record_task_apps_to_note",
    instruction: "In Firefox Task Board, select the Review the Ubuntu desktop task pack task, write its app list into task-apps.txt, and save.",
    domain: "Chrome",
    split: "starter",
    maxSteps: 36,
    seedDefaults: [0, 1, 2],
    summary: {
      family: "browser_task_metadata_to_note",
      level: "B",
      apps: ["browser", "note"],
      startState: "Firefox starts on the wrong task card and task-apps.txt remains unopened in File Explorer.",
      objective: "Select the requested Thunderbird task, record its app list into the note, and save.",
      implementationPath
    },
    setup(_seed, viewport) {
      return buildTaskToNoteTask(
        viewport,
        "In Firefox Task Board, select the Review the Ubuntu desktop task pack task, write its app list into task-apps.txt, and save.",
        "thunderbird",
        "thunderbird_task_pack",
        "file-task-apps",
        "task-apps.txt",
        "Apps: " + formatBrowserTaskApps(thunderbirdPack)
      );
    },
    goalPredicates: ["browser.task_selected", "note.target_opened", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.task_selected", "note.target_opened", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  },
  {
    id: "browser_help_second_line_to_note",
    instruction: "In Firefox, switch to Window controls, write its second help line into restore-tip.txt, and save.",
    domain: "Chrome",
    split: "starter",
    maxSteps: 34,
    seedDefaults: [0, 1, 2],
    summary: {
      family: "browser_help_extract_to_note",
      subtype: "help-second-line",
      level: "B",
      apps: ["browser", "note"],
      startState: "Firefox starts on Explorer while restore-tip.txt is still unopened in File Explorer.",
      objective: "Switch to the requested help topic, open the note, record its second help line, and save.",
      implementationPath
    },
    setup(_seed, viewport) {
      return buildHelpToNoteTask(
        viewport,
        "In Firefox, switch to Window controls, write its second help line into restore-tip.txt, and save.",
        "window-controls",
        "file-restore-tip",
        "restore-tip.txt",
        windowControls.lines[1]
      );
    },
    goalPredicates: ["browser.help_topic_opened", "note.target_opened", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.help_topic_opened", "note.target_opened", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  },
  {
    id: "browser_record_task_difficulty_to_note",
    instruction: "In Firefox Task Board, select the Dismiss a blocking popup task, write its difficulty line into task-difficulty.txt, and save.",
    domain: "Chrome",
    split: "starter",
    maxSteps: 34,
    seedDefaults: [0, 1, 2],
    summary: {
      family: "browser_task_metadata_to_note",
      subtype: "task-difficulty",
      level: "B",
      apps: ["browser", "note"],
      startState: "Firefox starts on the wrong task card and task-difficulty.txt remains unopened in File Explorer.",
      objective: "Select the requested OS task, record its difficulty line into the note, and save.",
      implementationPath
    },
    setup(_seed, viewport) {
      return buildTaskToNoteTask(
        viewport,
        "In Firefox Task Board, select the Dismiss a blocking popup task, write its difficulty line into task-difficulty.txt, and save.",
        "os",
        "os_popup_dismissal",
        "file-task-difficulty",
        "task-difficulty.txt",
        "Difficulty: " + osPopupDismissal.difficulty
      );
    },
    goalPredicates: ["browser.task_selected", "note.target_opened", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.task_selected", "note.target_opened", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  },
  {
    id: "browser_record_task_instruction_to_note",
    instruction: "In Firefox Task Board, select the Clean up a browser bookmark note task, write its instruction into task-instruction.txt, and save.",
    domain: "Chrome",
    split: "starter",
    maxSteps: 36,
    seedDefaults: [0, 1, 2],
    summary: {
      family: "browser_task_metadata_to_note",
      subtype: "task-instruction",
      level: "B",
      apps: ["browser", "note"],
      startState: "task-instruction.txt is already open with a short heading while Firefox starts on the wrong task card.",
      objective: "Select the requested Chrome task, append its instruction into the open note, and save.",
      implementationPath
    },
    setup(_seed, viewport) {
      return buildTaskToNoteTask(
        viewport,
        "In Firefox Task Board, select the Clean up a browser bookmark note task, write its instruction into task-instruction.txt, and save.",
        "chrome",
        "chrome_bookmark_cleanup",
        "file-task-instruction",
        "task-instruction.txt",
        "Instruction: " + chromeBookmarkCleanup.instruction,
        "Task instruction:\n",
        true
      );
    },
    goalPredicates: ["browser.task_selected", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.task_selected", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  },
  {
    id: "browser_bookmark_task_difficulty_to_note",
    instruction: "In Firefox, use the Downloads bookmark to open Task Board, select the Digest a help topic into notes task, write its difficulty into workflow-difficulty.txt, and save.",
    domain: "Chrome",
    split: "starter",
    maxSteps: 38,
    seedDefaults: [0, 1, 2],
    summary: {
      family: "browser_task_metadata_to_note",
      subtype: "task-difficulty-via-bookmark",
      level: "B",
      apps: ["browser", "note"],
      startState: "Firefox starts on Ubuntu help and workflow-difficulty.txt remains unopened in File Explorer.",
      objective: "Use a bookmark to reopen Explorer, select the requested task, record its difficulty, and save the note.",
      implementationPath
    },
    setup(_seed, viewport) {
      const built = buildTaskToNoteTask(
        viewport,
        "In Firefox, use the Downloads bookmark to open Task Board, select the Digest a help topic into notes task, write its difficulty into workflow-difficulty.txt, and save.",
        "workflow",
        "workflow_help_digest",
        "file-workflow-difficulty",
        "workflow-difficulty.txt",
        "Difficulty: " + workflowDigest.difficulty
      );
      configureBrowserStart(built.envState.appStates.browserLite["browser-main"], {
        page: "help",
        topicId: "dock-basics"
      });
      return {
        ...built,
        targets: {
          ...built.targets,
          targetBookmarkId: "downloads",
          targetPage: "explorer"
        }
      };
    },
    goalPredicates: ["browser.bookmark_opened", "browser.task_selected", "note.target_opened", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.bookmark_opened", "browser.task_selected", "note.target_opened", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  },
  {
    id: "browser_record_task_first_action_to_note",
    instruction: "In Firefox Task Board, select the Relaunch Firefox from the dock task, write its first action into dock-relaunch-step.txt, and save.",
    domain: "Chrome",
    split: "starter",
    maxSteps: 36,
    seedDefaults: [0, 1, 2],
    summary: {
      family: "browser_task_metadata_to_note",
      subtype: "task-first-action",
      level: "B",
      apps: ["browser", "note"],
      startState: "Firefox starts on the wrong task card and dock-relaunch-step.txt remains unopened in File Explorer.",
      objective: "Select the requested OS task, record its first visible action into a note, and save.",
      implementationPath
    },
    setup(_seed, viewport) {
      return buildTaskToNoteTask(
        viewport,
        "In Firefox Task Board, select the Relaunch Firefox from the dock task, write its first action into dock-relaunch-step.txt, and save.",
        "os",
        "os_dock_relaunch",
        "file-dock-relaunch-step",
        "dock-relaunch-step.txt",
        "First action: " + osDockRelaunch.actions[0]
      );
    },
    goalPredicates: ["browser.task_selected", "note.target_opened", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.task_selected", "note.target_opened", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  },
  {
    id: "browser_help_title_and_second_line_to_note",
    instruction: "In Firefox, switch to Window controls, write its title and second help line into restore-brief.txt, and save.",
    domain: "Chrome",
    split: "starter",
    maxSteps: 36,
    seedDefaults: [0, 1, 2],
    summary: {
      family: "browser_help_extract_to_note",
      subtype: "help-title-second-line-starter",
      level: "B",
      apps: ["browser", "note"],
      startState: "restore-brief.txt is already open while Firefox still shows Task Board.",
      objective: "Switch to the requested help topic, record its title plus the restore reminder, and save.",
      implementationPath
    },
    setup(_seed, viewport) {
      return buildHelpToNoteTask(
        viewport,
        "In Firefox, switch to Window controls, write its title and second help line into restore-brief.txt, and save.",
        "window-controls",
        "file-restore-brief",
        "restore-brief.txt",
        "Topic: " + windowControls.title + "\nReminder: " + windowControls.lines[1],
        "",
        true
      );
    },
    goalPredicates: ["browser.help_topic_opened", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.help_topic_opened", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  },
  {
    id: "browser_record_task_last_action_to_note",
    instruction: "In Firefox Task Board, select the Relaunch Firefox from the dock task, write its last action into dock-relaunch-last-step.txt, and save.",
    domain: "Chrome",
    split: "starter",
    maxSteps: 36,
    seedDefaults: [0, 1, 2],
    summary: {
      family: "browser_task_metadata_to_note",
      subtype: "task-last-action",
      level: "B",
      apps: ["browser", "note"],
      startState: "Firefox starts on the wrong task card and dock-relaunch-last-step.txt remains unopened in File Explorer.",
      objective: "Select the requested OS task, record its final visible action, and save the note.",
      implementationPath
    },
    setup(_seed, viewport) {
      return buildTaskToNoteTask(
        viewport,
        "In Firefox Task Board, select the Relaunch Firefox from the dock task, write its last action into dock-relaunch-last-step.txt, and save.",
        "os",
        "os_dock_relaunch",
        "file-dock-relaunch-last-step",
        "dock-relaunch-last-step.txt",
        "Last action: " + osDockRelaunch.actions[osDockRelaunch.actions.length - 1]
      );
    },
    goalPredicates: ["browser.task_selected", "note.target_opened", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.task_selected", "note.target_opened", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  },
  {
    id: "browser_bookmark_help_title_to_note",
    instruction: "In Firefox, use the Ubuntu Docs bookmark, switch to Workflow notes, write the topic title into workflow-topic.txt, and save.",
    domain: "Chrome",
    split: "starter",
    maxSteps: 36,
    seedDefaults: [0, 1, 2],
    summary: {
      family: "browser_help_extract_to_note",
      subtype: "bookmark-help-title",
      level: "B",
      apps: ["browser", "note"],
      startState: "Firefox starts on Explorer while workflow-topic.txt is already open in the editor.",
      objective: "Use the help bookmark, switch to the requested topic, record its title, and save.",
      implementationPath
    },
    setup(_seed, viewport) {
      const built = buildHelpToNoteTask(
        viewport,
        "In Firefox, use the Ubuntu Docs bookmark, switch to Workflow notes, write the topic title into workflow-topic.txt, and save.",
        "workflow-notes",
        "file-workflow-topic",
        "workflow-topic.txt",
        workflowNotes.title,
        "",
        true
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
    goalPredicates: ["browser.bookmark_opened", "browser.help_topic_opened", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.bookmark_opened", "browser.help_topic_opened", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  },
  {
    id: "browser_record_task_owner_then_apps_to_note",
    instruction: "In Firefox Task Board, select the Review the Ubuntu desktop task pack task, write its owner followed by its apps into pack-owner-apps.txt, and save.",
    domain: "Chrome",
    split: "starter",
    maxSteps: 36,
    seedDefaults: [0, 1, 2],
    summary: {
      family: "browser_task_metadata_to_note",
      subtype: "task-owner-then-apps",
      level: "B",
      apps: ["browser", "note"],
      startState: "pack-owner-apps.txt is already open while Firefox still shows a different task card.",
      objective: "Select the requested Thunderbird task, record the owner first and the apps next, then save.",
      implementationPath
    },
    setup(_seed, viewport) {
      return buildTaskToNoteTask(
        viewport,
        "In Firefox Task Board, select the Review the Ubuntu desktop task pack task, write its owner followed by its apps into pack-owner-apps.txt, and save.",
        "thunderbird",
        "thunderbird_task_pack",
        "file-pack-owner-apps",
        "pack-owner-apps.txt",
        "Owner: " + thunderbirdPack.owner + "\nApps used: " + formatBrowserTaskApps(thunderbirdPack),
        "",
        true
      );
    },
    goalPredicates: ["browser.task_selected", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.task_selected", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  },
  {
    id: "browser_record_task_domain_owner_to_note",
    instruction: "In Firefox Task Board, select the Capture the Ubuntu help reminder task, write its domain and owner into chrome-task-note.txt, and save.",
    domain: "Chrome",
    split: "starter",
    maxSteps: 36,
    seedDefaults: [0, 1, 2],
    summary: {
      family: "browser_task_metadata_to_note",
      subtype: "task-domain-owner",
      level: "B",
      apps: ["browser", "note"],
      startState: "chrome-task-note.txt remains unopened in File Explorer while Firefox starts on the wrong task card.",
      objective: "Select the requested Chrome task, record its domain and owner, and save the note.",
      implementationPath
    },
    setup(_seed, viewport) {
      return buildTaskToNoteTask(
        viewport,
        "In Firefox Task Board, select the Capture the Ubuntu help reminder task, write its domain and owner into chrome-task-note.txt, and save.",
        "chrome",
        "chrome_help_capture",
        "file-chrome-task-note",
        "chrome-task-note.txt",
        "Domain: " + chromeHelp.domain + "\nOwner: " + chromeHelp.owner
      );
    },
    goalPredicates: ["browser.task_selected", "note.target_opened", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.task_selected", "note.target_opened", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  }
];
