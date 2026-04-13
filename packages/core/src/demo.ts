import { MockOsEnv } from "./env/session.js";
import { getBrowserHelpTopic, getBrowserTask, getBrowserTaskCategory } from "./browser-fixtures.js";
import type { A11yNode, Computer13Action } from "./types.js";

function flatten(nodes: A11yNode[]): A11yNode[] {
  return nodes.flatMap((node) => [node, ...flatten(node.children)]);
}

function findNode(nodes: A11yNode[], predicate: (node: A11yNode) => boolean): A11yNode {
  const match = flatten(nodes).find(predicate);
  if (!match) {
    throw new Error("Required a11y node not found.");
  }
  return match;
}

function center(bounds: { x: number; y: number; width: number; height: number }) {
  return {
    x: bounds.x + Math.round(bounds.width / 2),
    y: bounds.y + Math.round(bounds.height / 2)
  };
}

function clickNode(env: MockOsEnv, node: A11yNode, type: "CLICK" | "DOUBLE_CLICK" = "CLICK") {
  const point = center(node.bounds);
  return env.step({ type, ...point });
}

function observeNodes(env: MockOsEnv) {
  return env.observe().observation.a11yTree;
}

function focusNoteTextbox(env: MockOsEnv, fileName: string) {
  const textBox = findNode(observeNodes(env), (node) => node.role === "textbox" && node.name === fileName);
  env.step({
    type: "CLICK",
    x: textBox.bounds.x + textBox.bounds.width - 12,
    y: textBox.bounds.y + textBox.bounds.height - 12
  });
}

function appendAndSaveOpenNote(env: MockOsEnv, fileName: string, text: string) {
  focusNoteTextbox(env, fileName);
  env.step({ type: "TYPING", text });
  env.step({ type: "HOTKEY", keys: ["ctrl", "s"] });
}

function getTargetFileName(env: MockOsEnv, fileId: string) {
  const file = env.getHiddenState().envState.fileSystem.files[fileId];
  if (!file) {
    throw new Error(`Required file not found: ${fileId}`);
  }
  return file.name;
}

function findHelpTopicIdByLine(line: string) {
  return ["dock-basics", "window-controls", "workflow-notes", "keyboard-shortcuts"].find((topicId) =>
    getBrowserHelpTopic(topicId).lines.includes(line)
  );
}

export function solveDismissPopupThenAppendNote(seed = 0) {
  const env = new MockOsEnv();
  env.reset({ taskId: "dismiss_popup_then_append_note", seed });
  const hidden = env.getHiddenState();
  const dismissButton = findNode(observeNodes(env), (node) => node.role === "button" && node.name === "Dismiss");
  clickNode(env, dismissButton);
  const todoFile = findNode(observeNodes(env), (node) => node.role === "listitem" && node.name === "todo.txt");
  clickNode(env, todoFile, "DOUBLE_CLICK");
  appendAndSaveOpenNote(env, "todo.txt", hidden.targets.appendText);
  return env.step({ type: "DONE" });
}

export function solveRenameNoteInExplorer(seed = 0) {
  const env = new MockOsEnv();
  env.reset({ taskId: "rename_note_in_explorer", seed });
  const draftFile = findNode(observeNodes(env), (node) => node.role === "listitem" && node.name === "draft.txt");
  clickNode(env, draftFile);
  env.step({ type: "PRESS", key: "f2" });
  env.step({ type: "TYPING", text: "final.txt" });
  env.step({ type: "PRESS", key: "enter" });
  return env.step({ type: "DONE" });
}

export function solveCopyLineBetweenWindows(seed = 0) {
  const env = new MockOsEnv();
  env.reset({ taskId: "copy_line_between_windows", seed });
  const sourceBox = findNode(observeNodes(env), (node) => node.role === "textbox" && node.name === "source.txt");
  env.step({ type: "CLICK", x: sourceBox.bounds.x + 10, y: sourceBox.bounds.y + 8 });
  env.step({ type: "HOTKEY", keys: ["ctrl", "c"] });
  focusNoteTextbox(env, "target.txt");
  env.step({ type: "HOTKEY", keys: ["ctrl", "v"] });
  env.step({ type: "HOTKEY", keys: ["ctrl", "s"] });
  return env.step({ type: "DONE" });
}

export function solveMinimizeRecoverAndSave(seed = 0) {
  const env = new MockOsEnv();
  env.reset({ taskId: "minimize_recover_and_save", seed });
  const taskbarRecover = findNode(observeNodes(env), (node) => node.role === "icon" && node.name === "recover.txt");
  clickNode(env, taskbarRecover);
  env.step({ type: "HOTKEY", keys: ["ctrl", "s"] });
  return env.step({ type: "DONE" });
}

export function solveBrowserLogTaskPreopenNoteHard(seed = 0) {
  const env = new MockOsEnv();
  env.reset({ taskId: "browser_log_task_preopen_note_hard", seed });
  const hidden = env.getHiddenState();
  const category = getBrowserTaskCategory(hidden.targets.targetCategoryId);
  const task = getBrowserTask(hidden.targets.targetCategoryId, hidden.targets.targetBrowserTaskId);
  const categoryNode = findNode(observeNodes(env), (node) => node.role === "listitem" && node.name === category.label);
  clickNode(env, categoryNode);
  const targetTask = findNode(observeNodes(env), (node) => node.role === "listitem" && node.name === task.title);
  clickNode(env, targetTask);
  appendAndSaveOpenNote(env, getTargetFileName(env, hidden.targets.targetFileId), hidden.targets.appendText);
  return env.step({ type: "DONE" });
}

export function solveBrowserHelpPreopenNoteDistractors(seed = 0) {
  const env = new MockOsEnv();
  env.reset({ taskId: "browser_help_preopen_note_distractors", seed });
  const hidden = env.getHiddenState();
  const helpTab = findNode(observeNodes(env), (node) => node.role === "button" && node.name === "Ubuntu help");
  clickNode(env, helpTab);
  const topicId = findHelpTopicIdByLine(hidden.targets.appendText);
  if (topicId) {
    const topic = getBrowserHelpTopic(topicId);
    const topicNode = findNode(observeNodes(env), (node) => node.role === "listitem" && node.name === topic.title);
    clickNode(env, topicNode);
  }
  appendAndSaveOpenNote(env, getTargetFileName(env, hidden.targets.targetFileId), hidden.targets.appendText);
  return env.step({ type: "DONE" });
}

export function solveMailExtractMockNote(seed = 0) {
  const env = new MockOsEnv();
  env.reset({ taskId: "mail_extract_mock_note", seed });
  const hidden = env.getHiddenState();
  const message = findNode(
    observeNodes(env),
    (node) => node.role === "listitem" && node.name.includes("Mock environment notes")
  );
  clickNode(env, message);
  const file = findNode(observeNodes(env), (node) => node.role === "listitem" && node.name === "mail-log.txt");
  clickNode(env, file, "DOUBLE_CLICK");
  appendAndSaveOpenNote(env, "mail-log.txt", hidden.targets.appendText);
  return env.step({ type: "DONE" });
}

export function solveTerminalRecordWorkingDirectory(seed = 0) {
  const env = new MockOsEnv();
  env.reset({ taskId: "terminal_record_working_directory", seed });
  const hidden = env.getHiddenState();
  const terminal = findNode(observeNodes(env), (node) => node.role === "textbox" && node.name === "Terminal session");
  env.step({ type: "CLICK", x: terminal.bounds.x + 12, y: terminal.bounds.y + 12 });
  env.step({ type: "TYPING", text: "pwd" });
  env.step({ type: "PRESS", key: "enter" });
  const file = findNode(observeNodes(env), (node) => node.role === "listitem" && node.name === "terminal-log.txt");
  clickNode(env, file, "DOUBLE_CLICK");
  appendAndSaveOpenNote(env, "terminal-log.txt", hidden.targets.appendText);
  return env.step({ type: "DONE" });
}

export function runScriptedPolicyDemo() {
  return {
    dismiss_popup_then_append_note: solveDismissPopupThenAppendNote(),
    rename_note_in_explorer: solveRenameNoteInExplorer(),
    copy_line_between_windows: solveCopyLineBetweenWindows(),
    minimize_recover_and_save: solveMinimizeRecoverAndSave(),
    browser_log_task_preopen_note_hard: solveBrowserLogTaskPreopenNoteHard(),
    browser_help_preopen_note_distractors: solveBrowserHelpPreopenNoteDistractors(),
    mail_extract_mock_note: solveMailExtractMockNote(),
    terminal_record_working_directory: solveTerminalRecordWorkingDirectory()
  };
}

export const solveBrowserLogWorkflowTaskId = solveBrowserLogTaskPreopenNoteHard;
export const solveBrowserCaptureHelpLine = solveBrowserHelpPreopenNoteDistractors;
