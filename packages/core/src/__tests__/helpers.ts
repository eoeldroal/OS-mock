import {
  createEmptyEnv,
  addFiles,
  createFile,
  addExplorerWindow,
  addTerminalWindow,
  addNoteEditorWindow,
  addBrowserWindow,
  addMailWindow,
  DEFAULT_VIEWPORT
} from '../env/factory.js';
import { reduceEnvState, type ReduceResult } from '../env/reducer.js';
import type { EnvState, Computer13Action, FileEntry } from '../types.js';

export function createTestEnvWithTerminal(): EnvState {
  let env = createEmptyEnv(DEFAULT_VIEWPORT, 'test task');
  env = addTerminalWindow(env, 'terminal-1', { x: 100, y: 100, width: 600, height: 400 }, true);
  return env;
}

export function createTestEnvWithFiles(files: Array<{ name: string; content: string }>): EnvState {
  let env = createEmptyEnv(DEFAULT_VIEWPORT, 'test task');
  env = addFiles(env, files.map((f, i) => createFile(`file-${i}`, f.name, f.content)));
  env = addExplorerWindow(env, 'explorer-1', { x: 100, y: 100, width: 400, height: 400 }, false);
  env = addTerminalWindow(env, 'terminal-1', { x: 520, y: 100, width: 600, height: 400 }, true);
  return env;
}

export function createTestEnvWithNoteEditor(fileName: string, content: string): EnvState {
  let env = createEmptyEnv(DEFAULT_VIEWPORT, 'test task');
  env = addFiles(env, [createFile('file-test', fileName, content)]);
  env = addExplorerWindow(env, 'explorer-1', { x: 100, y: 100, width: 400, height: 400 }, false);
  env = addNoteEditorWindow(env, 'notes-test', 'file-test', { x: 520, y: 100, width: 400, height: 400 }, true);
  return env;
}

export function createTestEnvFull(): EnvState {
  let env = createEmptyEnv(DEFAULT_VIEWPORT, 'test task');
  env = addFiles(env, [createFile('file-1', 'test.txt', 'content')]);
  env = addExplorerWindow(env, 'explorer-1', { x: 100, y: 100, width: 400, height: 400 }, false);
  env = addTerminalWindow(env, 'terminal-1', { x: 520, y: 100, width: 600, height: 400 }, true);
  env = addBrowserWindow(env, 'browser-1', { x: 440, y: 82, width: 550, height: 360 }, false, false);
  env = addMailWindow(env, 'mail-1', { x: 1000, y: 82, width: 280, height: 420 }, false, true);
  return env;
}

// Helper to run a sequence of actions
export function runActions(env: EnvState, actions: Computer13Action[]): ReduceResult {
  let result: ReduceResult = {
    envState: env,
    actionAccepted: true,
    focusChanged: false,
    actionSummary: ''
  };
  for (const action of actions) {
    result = reduceEnvState(result.envState, action);
  }
  return result;
}

// Helper to type text into terminal and press Enter
export function typeAndEnter(env: EnvState, text: string): ReduceResult {
  return runActions(env, [
    { type: 'TYPING', text },
    { type: 'PRESS', key: 'Enter' }
  ]);
}

// Get terminal output from the last command
export function getLastTerminalOutput(env: EnvState): string {
  const terminals = Object.values(env.appStates.terminalLite);
  if (terminals.length === 0) return '';
  return terminals[0].lastOutput;
}

// Get terminal lines
export function getTerminalLines(env: EnvState): string[] {
  const terminals = Object.values(env.appStates.terminalLite);
  if (terminals.length === 0) return [];
  return terminals[0].lines;
}

// Get file content by name
export function getFileByName(env: EnvState, name: string): FileEntry | undefined {
  return Object.values(env.fileSystem.files).find((f) => f.name === name);
}

// Get focused window ID
export function getFocusedWindowId(env: EnvState): string | undefined {
  if (env.popups.length > 0) {
    return env.popups[env.popups.length - 1]?.id;
  }
  return env.windows.find((window) => window.focused)?.id;
}

// Get window by ID
export function getWindowById(env: EnvState, windowId: string) {
  return env.windows.find((w) => w.id === windowId);
}

// Get note editor by window ID
export function getNoteEditorState(env: EnvState, windowId: string) {
  return env.appStates.noteEditor[windowId];
}

// Get terminal by window ID
export function getTerminalState(env: EnvState, windowId: string) {
  return env.appStates.terminalLite[windowId];
}

// Helper to type text without pressing Enter
export function typeText(env: EnvState, text: string): ReduceResult {
  return reduceEnvState(env, { type: 'TYPING', text });
}

// Helper to press a key
export function pressKey(env: EnvState, key: string): ReduceResult {
  return reduceEnvState(env, { type: 'PRESS', key });
}

// Helper to perform hotkey
export function hotkey(env: EnvState, keys: string[]): ReduceResult {
  return reduceEnvState(env, { type: 'HOTKEY', keys });
}

// Helper to click at coordinates
export function clickAt(env: EnvState, x: number, y: number): ReduceResult {
  return reduceEnvState(env, { type: 'CLICK', x, y });
}

// Helper to scroll
export function scrollDown(env: EnvState, amount = 3): ReduceResult {
  return reduceEnvState(env, { type: 'SCROLL', dx: 0, dy: amount });
}

export function scrollUp(env: EnvState, amount = 3): ReduceResult {
  return reduceEnvState(env, { type: 'SCROLL', dx: 0, dy: -amount });
}
