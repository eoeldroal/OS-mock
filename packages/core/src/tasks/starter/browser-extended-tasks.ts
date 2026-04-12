import { getBrowserHelpTopic, getBrowserTask, formatBrowserTaskApps } from "../../browser-fixtures.js";
import {
  addBrowserWindow,
  addExplorerWindow,
  addFiles,
  addNoteEditorWindow,
  createEmptyEnv,
  createFile
} from "../../env/factory.js";
import type { BrowserLiteState, TaskSpec, Viewport } from "../../types.js";
import { browserBounds, explorerBounds, noteBoundsRight } from "./shared.js";

const implementationPath = "packages/core/src/tasks/starter/browser-extended-tasks.ts";

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

function createBrowserOnlyEnv(viewport: Viewport, instruction: string) {
  return addBrowserWindow(createEmptyEnv(viewport, instruction), "browser-main", browserBounds(), true, false);
}

function addUnopenedNote(envState: ReturnType<typeof createEmptyEnv>, fileId: string, fileName: string, initialContent = "") {
  let next = addFiles(envState, [createFile(fileId, fileName, initialContent)]);
  next = addExplorerWindow(next, "explorer-main", explorerBounds(), false);
  return next;
}

function addPreopenedNote(envState: ReturnType<typeof createEmptyEnv>, fileId: string, fileName: string, initialContent = "") {
  let next = addFiles(envState, [createFile(fileId, fileName, initialContent)]);
  next = addNoteEditorWindow(next, "notes-target", fileId, noteBoundsRight(), false, initialContent, false);
  return next;
}

function buildBookmarkTask(viewport: Viewport, instruction: string, startMode: "explorer" | "help", topicId?: string) {
  const envState = createBrowserOnlyEnv(viewport, instruction);
  const browser = envState.appStates.browserLite["browser-main"];
  if (startMode === "help") {
    setBrowserHelp(browser, topicId ?? "workflow-notes");
  } else {
    setBrowserExplorer(browser, "workflow", "workflow_mail_bridge");
  }
  return envState;
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
  let envState = createBrowserOnlyEnv(viewport, instruction);
  const browser = envState.appStates.browserLite["browser-main"];
  setBrowserExplorer(browser, "workflow", "workflow_mail_bridge");
  envState = preopen
    ? addPreopenedNote(envState, fileId, fileName, initialContent)
    : addUnopenedNote(envState, fileId, fileName, initialContent);

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
  let envState = createBrowserOnlyEnv(viewport, instruction);
  const browser = envState.appStates.browserLite["browser-main"];
  setBrowserExplorer(browser, "workflow", "workflow_mail_bridge");
  envState = preopen
    ? addPreopenedNote(envState, fileId, fileName, initialContent)
    : addUnopenedNote(envState, fileId, fileName, initialContent);

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
const chromeHelp = getBrowserTask("chrome", "chrome_help_capture");
const chromeBookmarkCleanup = getBrowserTask("chrome", "chrome_bookmark_cleanup");
const workflowDigest = getBrowserTask("workflow", "workflow_help_digest");
const thunderbirdPack = getBrowserTask("thunderbird", "thunderbird_task_pack");

export const STARTER_BROWSER_EXTENDED_TASKS: TaskSpec[] = [
  {
    id: "browser_open_osworld_from_bookmark",
    instruction: "In Firefox, use the OSWorld bookmark to open OSWorld Explorer.",
    domain: "Chrome",
    split: "starter",
    maxSteps: 12,
    seedDefaults: [0, 1, 2],
    summary: {
      family: "browser_bookmark_navigation",
      level: "A",
      apps: ["browser"],
      startState: "Firefox starts on Ubuntu help with a help topic already visible.",
      objective: "Use a bookmark instead of the tab strip to return to OSWorld Explorer.",
      implementationPath
    },
    setup(_seed, viewport) {
      return {
        envState: buildBookmarkTask(viewport, "In Firefox, use the OSWorld bookmark to open OSWorld Explorer.", "help", "workflow-notes"),
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
      startState: "Firefox starts on OSWorld Explorer with a task card selected.",
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
    instruction: "In Firefox, use the Research Board bookmark to open OSWorld Explorer and focus the Chrome category.",
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
        envState: buildBookmarkTask(viewport, "In Firefox, use the Research Board bookmark to open OSWorld Explorer and focus the Chrome category.", "help", "dock-basics"),
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
    instruction: "In Firefox OSWorld Explorer, select the Restore a minimized editor task, write its title into task-title.txt, and save.",
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
        "In Firefox OSWorld Explorer, select the Restore a minimized editor task, write its title into task-title.txt, and save.",
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
    instruction: "In Firefox OSWorld Explorer, select the Capture the Ubuntu help reminder task, write its owner line into owner-note.txt, and save.",
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
        "In Firefox OSWorld Explorer, select the Capture the Ubuntu help reminder task, write its owner line into owner-note.txt, and save.",
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
    instruction: "In Firefox OSWorld Explorer, select the Digest a help topic into notes task, complete task-brief.txt with its id and title, and save.",
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
        "In Firefox OSWorld Explorer, select the Digest a help topic into notes task, complete task-brief.txt with its id and title, and save.",
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
    instruction: "In Firefox OSWorld Explorer, select the Review the Ubuntu desktop task pack task, write its app list into task-apps.txt, and save.",
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
        "In Firefox OSWorld Explorer, select the Review the Ubuntu desktop task pack task, write its app list into task-apps.txt, and save.",
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
    instruction: "In Firefox OSWorld Explorer, select the Dismiss a blocking popup task, write its difficulty line into task-difficulty.txt, and save.",
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
        "In Firefox OSWorld Explorer, select the Dismiss a blocking popup task, write its difficulty line into task-difficulty.txt, and save.",
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
    instruction: "In Firefox OSWorld Explorer, select the Clean up a browser bookmark note task, write its instruction into task-instruction.txt, and save.",
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
        "In Firefox OSWorld Explorer, select the Clean up a browser bookmark note task, write its instruction into task-instruction.txt, and save.",
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
    instruction: "In Firefox, use the Downloads bookmark to open OSWorld Explorer, select the Digest a help topic into notes task, write its difficulty into workflow-difficulty.txt, and save.",
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
        "In Firefox, use the Downloads bookmark to open OSWorld Explorer, select the Digest a help topic into notes task, write its difficulty into workflow-difficulty.txt, and save.",
        "workflow",
        "workflow_help_digest",
        "file-workflow-difficulty",
        "workflow-difficulty.txt",
        "Difficulty: " + workflowDigest.difficulty
      );
      setBrowserHelp(built.envState.appStates.browserLite["browser-main"], "dock-basics");
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
  }
];