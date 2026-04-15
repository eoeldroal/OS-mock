import { MockOsEnv } from "./env/session.js";
import { getFileEntry } from "./system/filesystem.js";
import type { A11yNode } from "./types.js";

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
  const taskbarIcon = flatten(observeNodes(env)).find((node) => node.role === "icon" && node.name === fileName);
  if (taskbarIcon) {
    clickNode(env, taskbarIcon);
  }
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
  const file = getFileEntry(env.getHiddenState().envState.fileSystem, fileId);
  if (!file) {
    throw new Error(`Required file not found: ${fileId}`);
  }
  return file.name;
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
  const taskbarRecover = findNode(
    observeNodes(env),
    (node) => node.role === "icon" && node.name.toLowerCase().includes("recover.txt")
  );
  clickNode(env, taskbarRecover);
  env.step({ type: "HOTKEY", keys: ["ctrl", "s"] });
  return env.step({ type: "DONE" });
}

export function solveMailExtractMockNote(seed = 0) {
  const env = new MockOsEnv();
  env.reset({ taskId: "mail_extract_mock_note", seed });
  const hidden = env.getHiddenState();
  const message = findNode(
    observeNodes(env),
    (node) => node.role === "listitem" && node.id.endsWith(hidden.targets.targetMessageId)
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
    mail_extract_mock_note: solveMailExtractMockNote(),
    terminal_record_working_directory: solveTerminalRecordWorkingDirectory()
  };
}
