/**
 * Files + Window/Shell Tasks (T01–T50)
 *
 * 50 tasks for RL training via MCP server.
 * All tasks use only File Explorer, Note Editor, and Window/Shell primitives.
 */

import type { PredicateId, Rect, TaskSpec, TaskSummary, Viewport } from "../types.js";
import { withTaskSummaries } from "./with-task-summaries.js";
import {
  addBrowserWindow,
  addExplorerWindow,
  addFiles,
  addMailWindow,
  addNoteEditorWindow,
  addTerminalWindow,
  createEmptyEnv,
  createFile
} from "../env/factory.js";
import { createPopup } from "../system/popup-manager.js";
import { minimizeAllWindows } from "../system/window-manager.js";

/* ═══════════════════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════════════════ */

function pick<T>(seed: number, arr: T[]): T {
  return arr[Math.abs(seed) % arr.length];
}

const EXP: Rect = { x: 92, y: 84, width: 340, height: 430 };
const NOTE_L: Rect = { x: 440, y: 84, width: 390, height: 470 };
const NOTE_R: Rect = { x: 850, y: 84, width: 390, height: 470 };
const NOTE_C: Rect = { x: 452, y: 108, width: 460, height: 500 };
const BRW: Rect = { x: 458, y: 84, width: 520, height: 360 };
const TRM: Rect = { x: 458, y: 462, width: 520, height: 250 };
const MIL: Rect = { x: 992, y: 84, width: 240, height: 420 };

const T_NAMES = ["report.txt", "meeting.txt", "checklist.txt"];
const D_NAMES = ["readme.txt", "config.txt", "scratch.txt", "extra.txt"];
const R_OLD = ["draft.txt", "log.txt", "temp.txt"];
const R_NEW = ["final.txt", "archive.txt", "saved.txt"];
const APPENDS = ["\n- buy milk", "\n- send report", "\n- review PR"];
const P_TITLES = ["System notice", "Welcome back", "Reminder"];
const P_MSGS = [
  "Please dismiss to continue.",
  "Close this before working.",
  "Save your work regularly."
];
const SRC_LINES = ["Alpha plan", "Bravo plan", "Charlie plan"];
const DIRTY_ORIG = ["- milk", "Draft v1", "Notes"];
const DIRTY_EXPD = ["- milk\n- bread", "Draft v1\nApproved", "Notes\nSaved"];

/* ═══════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════ */

function addCompanions(e: ReturnType<typeof createEmptyEnv>) {
  let s = e;
  s = addBrowserWindow(s, "browser-main", BRW, false, true);
  s = addTerminalWindow(s, "terminal-main", TRM, false, true);
  s = addMailWindow(s, "mail-main", MIL, false, true);
  return s;
}

function dists(count: number) {
  return Array.from({ length: count }, (_, i) =>
    createFile(`file-d${i}`, D_NAMES[i], `Distractor ${i + 1}`)
  );
}

function rot<T>(arr: T[], seed: number): T[] {
  if (arr.length <= 1) return arr;
  const r = Math.abs(seed) % arr.length;
  return [...arr.slice(r), ...arr.slice(0, r)];
}

function popup(e: ReturnType<typeof createEmptyEnv>, seed: number) {
  const next = structuredClone(e);
  next.popups.push(createPopup("popup-1", pick(seed, P_TITLES), pick(seed, P_MSGS)));
  next.windows = next.windows.map((w) => ({ ...w, focused: false }));
  return next;
}

/* ═══════════════════════════════════════════════════════════
   Reusable pattern builders
   ═══════════════════════════════════════════════════════════ */

function setupOpenFile(seed: number, vp: Viewport, dc: number) {
  const name = pick(seed, T_NAMES);
  let e = createEmptyEnv(vp, `I need to check what's inside ${name}, could you open it?`);
  e = addFiles(e, rot([createFile("file-target", name, "File content"), ...dists(dc)], seed));
  e = addExplorerWindow(e, "explorer-main", EXP, true, false);
  e = addCompanions(e);
  return { envState: e, targets: { targetFileId: "file-target" } };
}

function setupRename(seed: number, vp: Viewport, dc: number, presel: boolean) {
  const old = pick(seed, R_OLD);
  const nw = pick(seed, R_NEW);
  const instr = presel
    ? `That file is selected already. Just rename it to ${nw}.`
    : `Could you rename ${old} to ${nw} for me?`;
  let e = createEmptyEnv(vp, instr);
  e = addFiles(e, rot([createFile("file-target", old, "Body"), ...dists(dc)], seed));
  e = addExplorerWindow(e, "explorer-main", EXP, true, false);
  if (presel) e.appStates.fileExplorer["explorer-main"].selectedFileId = "file-target";
  e = addCompanions(e);
  return { envState: e, targets: { targetFileId: "file-target", oldName: old, newName: nw } };
}

function setupOpenAppendSave(seed: number, vp: Viewport, dc: number) {
  const name = pick(seed, T_NAMES);
  const init = "TODO:";
  const ap = pick(seed, APPENDS);
  let e = createEmptyEnv(vp, `Open ${name}, add "${ap.trim()}" at the end, and save the file.`);
  e = addFiles(e, rot([createFile("file-target", name, init), ...dists(dc)], seed));
  e = addExplorerWindow(e, "explorer-main", EXP, true, false);
  e = addCompanions(e);
  return { envState: e, targets: { targetFileId: "file-target", appendText: ap, expectedSavedContent: init + ap } };
}

function setupRenameThenOpen(seed: number, vp: Viewport, dc: number) {
  const old = pick(seed, R_OLD);
  const nw = pick(seed, R_NEW);
  let e = createEmptyEnv(vp, `Rename ${old} to ${nw}, then open it so I can start editing.`);
  e = addFiles(e, rot([createFile("file-target", old, "Body"), ...dists(dc)], seed));
  e = addExplorerWindow(e, "explorer-main", EXP, true, false);
  e = addCompanions(e);
  return { envState: e, targets: { targetFileId: "file-target", oldName: old, newName: nw } };
}

function setupDockLaunchOpen(seed: number, vp: Viewport, dc: number) {
  const name = pick(seed, T_NAMES);
  let e = createEmptyEnv(vp, `The file manager isn't running. Launch it from the dock and open ${name}.`);
  e = addFiles(e, rot([createFile("file-target", name, "File content"), ...dists(dc)], seed));
  e = addCompanions(e);
  return { envState: e, targets: { targetFileId: "file-target" } };
}

function setupDockLaunchRename(seed: number, vp: Viewport, dc: number) {
  const old = pick(seed, R_OLD);
  const nw = pick(seed, R_NEW);
  let e = createEmptyEnv(vp, `Files app is closed. Open it from the dock, then rename ${old} to ${nw}.`);
  e = addFiles(e, rot([createFile("file-target", old, "Body"), ...dists(dc)], seed));
  e = addCompanions(e);
  return { envState: e, targets: { targetFileId: "file-target", oldName: old, newName: nw } };
}

/* ═══════════════════════════════════════════════════════════
   Individual setup functions (unique patterns)
   ═══════════════════════════════════════════════════════════ */

// T01
function setupPopupDismiss(seed: number, vp: Viewport) {
  let e = createEmptyEnv(vp, "There's some dialog in the way and I can't do anything. Please close it.");
  e = addFiles(e, [createFile("file-1", "readme.txt", "Hello")]);
  e = addExplorerWindow(e, "explorer-main", EXP, false, false);
  e = addCompanions(e);
  e = popup(e, seed);
  return { envState: e, targets: {} };
}

// T03
function setupRestoreMinimized(seed: number, vp: Viewport) {
  const name = pick(seed, T_NAMES);
  let e = createEmptyEnv(vp, "I was editing something but the window vanished. Can you bring it back?");
  e = addFiles(e, [createFile("file-1", name, "Content")]);
  e = addNoteEditorWindow(e, "notes-1", "file-1", NOTE_C, false, undefined, false, true);
  e = addExplorerWindow(e, "explorer-main", EXP, true, false);
  e = addCompanions(e);
  return { envState: e, targets: { noteWindowId: "notes-1" } };
}

// T04
function setupRefocusBackground(seed: number, vp: Viewport) {
  const name = pick(seed, T_NAMES);
  let e = createEmptyEnv(vp, "My text editor is behind the file manager. Switch back to it please.");
  e = addFiles(e, [createFile("file-1", name, "Content")]);
  e = addNoteEditorWindow(e, "notes-1", "file-1", NOTE_C, false, undefined, false, false);
  e = addExplorerWindow(e, "explorer-main", EXP, true, false);
  e = addCompanions(e);
  return { envState: e, targets: { noteWindowId: "notes-1" } };
}

// T05
function setupSaveDirty(seed: number, vp: Viewport) {
  const idx = Math.abs(seed) % DIRTY_ORIG.length;
  const name = pick(seed, T_NAMES);
  let e = createEmptyEnv(vp, "I forgot to save my file. Please save it before I lose my changes.");
  e = addFiles(e, [createFile("file-1", name, DIRTY_ORIG[idx])]);
  e = addNoteEditorWindow(e, "notes-1", "file-1", NOTE_C, true, DIRTY_EXPD[idx], true, false);
  e = addCompanions(e);
  return { envState: e, targets: { targetFileId: "file-1", expectedSavedContent: DIRTY_EXPD[idx] } };
}

// T14
function setupPopupThenOpen(seed: number, vp: Viewport) {
  const name = pick(seed, T_NAMES);
  let e = createEmptyEnv(vp, `Something popped up. Get rid of it, then open ${name} for me.`);
  e = addFiles(e, rot([createFile("file-target", name, "Content"), ...dists(1)], seed));
  e = addExplorerWindow(e, "explorer-main", EXP, false, false);
  e = addCompanions(e);
  e = popup(e, seed);
  return { envState: e, targets: { targetFileId: "file-target" } };
}

// T15
function setupPopupThenRename(seed: number, vp: Viewport) {
  const old = pick(seed, R_OLD);
  const nw = pick(seed, R_NEW);
  let e = createEmptyEnv(vp, `A popup appeared while I was about to rename ${old}. Dismiss it and rename the file to ${nw}.`);
  e = addFiles(e, rot([createFile("file-target", old, "Body"), ...dists(1)], seed));
  e = addExplorerWindow(e, "explorer-main", EXP, false, false);
  e = addCompanions(e);
  e = popup(e, seed);
  return { envState: e, targets: { targetFileId: "file-target", oldName: old, newName: nw } };
}

// T16
function setupRestoreAndSave(seed: number, vp: Viewport) {
  const name = pick(seed, T_NAMES);
  const idx = Math.abs(seed) % DIRTY_ORIG.length;
  let e = createEmptyEnv(vp, "My editor is hidden and has unsaved work. Bring it back and save.");
  e = addFiles(e, [createFile("file-1", name, DIRTY_ORIG[idx])]);
  e = addNoteEditorWindow(e, "notes-1", "file-1", NOTE_C, false, DIRTY_EXPD[idx], true, true);
  e = addExplorerWindow(e, "explorer-main", EXP, true, false);
  e = addCompanions(e);
  return { envState: e, targets: { noteWindowId: "notes-1", targetFileId: "file-1", expectedSavedContent: DIRTY_EXPD[idx] } };
}

// T17
function setupRestoreSpecificOfTwo(seed: number, vp: Viewport) {
  const tgt = pick(seed, ["alpha.txt", "beta.txt", "gamma.txt"]);
  const other = pick(seed, ["delta.txt", "epsilon.txt", "zeta.txt"]);
  let e = createEmptyEnv(vp, `Two editor windows are minimized. Restore the one with ${tgt}.`);
  e = addFiles(e, [createFile("file-target", tgt, "Target"), createFile("file-other", other, "Other")]);
  e = addNoteEditorWindow(e, "notes-target", "file-target", NOTE_L, false, undefined, false, true);
  e = addNoteEditorWindow(e, "notes-other", "file-other", NOTE_R, false, undefined, false, true);
  e = addExplorerWindow(e, "explorer-main", EXP, true, false);
  e = addCompanions(e);
  return { envState: e, targets: { noteWindowId: "notes-target" } };
}

// T18
function setupRestoreFromAllMin(seed: number, vp: Viewport) {
  const name = pick(seed, T_NAMES);
  let e = createEmptyEnv(vp, `Everything got minimized somehow. I need my editor for ${name} back.`);
  e = addFiles(e, [createFile("file-1", name, "Content")]);
  e = addNoteEditorWindow(e, "notes-1", "file-1", NOTE_C, true, undefined, false, false);
  e = addExplorerWindow(e, "explorer-main", EXP, false, false);
  e = addCompanions(e);
  e = minimizeAllWindows(e);
  return { envState: e, targets: { noteWindowId: "notes-1" } };
}

// T19
function setupOpenAndAppend(seed: number, vp: Viewport) {
  const name = pick(seed, T_NAMES);
  const ap = pick(seed, APPENDS);
  let e = createEmptyEnv(vp, `Open ${name} and add "${ap.trim()}" at the end.`);
  e = addFiles(e, [createFile("file-1", name, "TODO:")]);
  e = addExplorerWindow(e, "explorer-main", EXP, true, false);
  e = addCompanions(e);
  return { envState: e, targets: { targetFileId: "file-1", appendText: ap } };
}

// T20
function setupPopupThenRestore(seed: number, vp: Viewport) {
  const name = pick(seed, T_NAMES);
  let e = createEmptyEnv(vp, "A dialog popped up and my editor is also minimized. Fix both.");
  e = addFiles(e, [createFile("file-1", name, "Content")]);
  e = addNoteEditorWindow(e, "notes-1", "file-1", NOTE_C, false, undefined, false, true);
  e = addExplorerWindow(e, "explorer-main", EXP, false, false);
  e = addCompanions(e);
  e = popup(e, seed);
  return { envState: e, targets: { noteWindowId: "notes-1" } };
}

// T23
function setupRestoreExplorerThenRename(seed: number, vp: Viewport) {
  const old = pick(seed, R_OLD);
  const nw = pick(seed, R_NEW);
  let e = createEmptyEnv(vp, `The file manager is minimized. Restore it and rename ${old} to ${nw}.`);
  e = addFiles(e, rot([createFile("file-target", old, "Body"), ...dists(1)], seed));
  e = addExplorerWindow(e, "explorer-main", EXP, false, true);
  e = addCompanions(e);
  return { envState: e, targets: { targetFileId: "file-target", oldName: old, newName: nw } };
}

// T24
function setupSwitchBetweenNotes(seed: number, vp: Viewport) {
  const tgt = pick(seed, ["alpha.txt", "beta.txt", "gamma.txt"]);
  const other = pick(seed, ["delta.txt", "epsilon.txt", "zeta.txt"]);
  let e = createEmptyEnv(vp, `I have two files open. Switch to the one called ${tgt}.`);
  e = addFiles(e, [createFile("file-target", tgt, "Target"), createFile("file-other", other, "Other")]);
  e = addNoteEditorWindow(e, "notes-target", "file-target", NOTE_L, false, undefined, false, false);
  e = addNoteEditorWindow(e, "notes-other", "file-other", NOTE_R, true, undefined, false, false);
  e = addCompanions(e);
  return { envState: e, targets: { noteWindowId: "notes-target" } };
}

// T25
function setupOpenFromUnfocusedExplorer(seed: number, vp: Viewport) {
  const name = pick(seed, T_NAMES);
  let e = createEmptyEnv(vp, `The file manager is open but behind my editor. Go to it and open ${name}.`);
  e = addFiles(e, rot([createFile("file-target", name, "Content"), ...dists(1)], seed));
  e = addNoteEditorWindow(e, "notes-other", "file-d0", NOTE_R, true, undefined, false, false);
  e = addExplorerWindow(e, "explorer-main", EXP, false, false);
  e = addCompanions(e);
  return { envState: e, targets: { targetFileId: "file-target" } };
}

// T30
function setupPopupThenOpenAppendSave(seed: number, vp: Viewport) {
  const name = pick(seed, T_NAMES);
  const init = "TODO:";
  const ap = pick(seed, APPENDS);
  let e = createEmptyEnv(vp, `There's a popup blocking me. After you close it, open ${name}, add "${ap.trim()}", and save.`);
  e = addFiles(e, [createFile("file-1", name, init)]);
  e = addExplorerWindow(e, "explorer-main", EXP, false, false);
  e = addCompanions(e);
  e = popup(e, seed);
  return { envState: e, targets: { targetFileId: "file-1", appendText: ap, expectedSavedContent: init + ap } };
}

// T31
function setupPopupThenRestoreSave(seed: number, vp: Viewport) {
  const name = pick(seed, T_NAMES);
  const idx = Math.abs(seed) % DIRTY_ORIG.length;
  let e = createEmptyEnv(vp, "A notification appeared and my editor is minimized with unsaved changes. Handle both.");
  e = addFiles(e, [createFile("file-1", name, DIRTY_ORIG[idx])]);
  e = addNoteEditorWindow(e, "notes-1", "file-1", NOTE_C, false, DIRTY_EXPD[idx], true, true);
  e = addExplorerWindow(e, "explorer-main", EXP, false, false);
  e = addCompanions(e);
  e = popup(e, seed);
  return { envState: e, targets: { noteWindowId: "notes-1", targetFileId: "file-1", expectedSavedContent: DIRTY_EXPD[idx] } };
}

// T32
function setupRestoreAppendSave(seed: number, vp: Viewport) {
  const name = pick(seed, T_NAMES);
  const init = "Start";
  const ap = pick(seed, APPENDS);
  let e = createEmptyEnv(vp, `Bring back my hidden editor, add "${ap.trim()}" to the file, then save.`);
  e = addFiles(e, [createFile("file-1", name, init)]);
  e = addNoteEditorWindow(e, "notes-1", "file-1", NOTE_C, false, init, false, true);
  e = addExplorerWindow(e, "explorer-main", EXP, true, false);
  e = addCompanions(e);
  return { envState: e, targets: { noteWindowId: "notes-1", targetFileId: "file-1", appendText: ap, expectedSavedContent: init + ap } };
}

// T33
function setupDockLaunchOpenAppendSave(seed: number, vp: Viewport) {
  const name = pick(seed, T_NAMES);
  const init = "TODO:";
  const ap = pick(seed, APPENDS);
  let e = createEmptyEnv(vp, `The file manager is closed. Launch it, open ${name}, write "${ap.trim()}", and save.`);
  e = addFiles(e, [createFile("file-1", name, init)]);
  e = addCompanions(e);
  return { envState: e, targets: { targetFileId: "file-1", appendText: ap, expectedSavedContent: init + ap } };
}

// T34
function setupAllMinRestoreAndSave(seed: number, vp: Viewport) {
  const name = pick(seed, T_NAMES);
  const idx = Math.abs(seed) % DIRTY_ORIG.length;
  let e = createEmptyEnv(vp, "I minimized everything by accident. Find my editor and save the work in progress.");
  e = addFiles(e, [createFile("file-1", name, DIRTY_ORIG[idx])]);
  e = addNoteEditorWindow(e, "notes-1", "file-1", NOTE_C, true, DIRTY_EXPD[idx], true, false);
  e = addExplorerWindow(e, "explorer-main", EXP, false, false);
  e = addCompanions(e);
  e = minimizeAllWindows(e);
  return { envState: e, targets: { noteWindowId: "notes-1", targetFileId: "file-1", expectedSavedContent: DIRTY_EXPD[idx] } };
}

// T35
function setupPopupDockLaunchOpen(seed: number, vp: Viewport) {
  const name = pick(seed, T_NAMES);
  let e = createEmptyEnv(vp, `A dialog is blocking everything and the file manager isn't even open. Clear the dialog, open Files, and pull up ${name}.`);
  e = addFiles(e, [createFile("file-1", name, "Content")]);
  e = addCompanions(e);
  e = popup(e, seed);
  return { envState: e, targets: { targetFileId: "file-1" } };
}

// T36
function setupCopyPasteSave(seed: number, vp: Viewport) {
  const line = pick(seed, SRC_LINES);
  const tgtInit = "Target body";
  let e = createEmptyEnv(vp, `Copy the first line from source.txt and paste it at the end of target.txt, then save target.txt.`);
  e = addFiles(e, [
    createFile("file-src", "source.txt", `${line}\nLine two`),
    createFile("file-tgt", "target.txt", tgtInit)
  ]);
  e = addNoteEditorWindow(e, "notes-src", "file-src", NOTE_L, true, undefined, false, false);
  e = addNoteEditorWindow(e, "notes-tgt", "file-tgt", NOTE_R, false, undefined, false, false);
  e = addCompanions(e);
  return { envState: e, targets: { sourceLine: line, targetFileId: "file-tgt", expectedSavedContent: tgtInit + line } };
}

// T38 (popup + rename among 3 — fixed from duplicate T15)
function setupPopupThenRenameAmongThree(seed: number, vp: Viewport) {
  const old = pick(seed, R_OLD);
  const nw = pick(seed, R_NEW);
  let e = createEmptyEnv(vp, `Got a popup stuck on screen. Close it, then rename ${old} to ${nw}. There are other files too.`);
  e = addFiles(e, rot([createFile("file-target", old, "Body"), ...dists(2)], seed));
  e = addExplorerWindow(e, "explorer-main", EXP, false, false);
  e = addCompanions(e);
  e = popup(e, seed);
  return { envState: e, targets: { targetFileId: "file-target", oldName: old, newName: nw } };
}

// T40
function setupRestoreAmongThreeThenSave(seed: number, vp: Viewport) {
  const tgt = pick(seed, ["alpha.txt", "beta.txt", "gamma.txt"]);
  const other = pick(seed, ["delta.txt", "epsilon.txt", "zeta.txt"]);
  const idx = Math.abs(seed) % DIRTY_ORIG.length;
  let e = createEmptyEnv(vp, `Several windows are minimized. Find the editor for ${tgt} and save it.`);
  e = addFiles(e, [createFile("file-target", tgt, DIRTY_ORIG[idx]), createFile("file-other", other, "Other")]);
  e = addNoteEditorWindow(e, "notes-target", "file-target", NOTE_L, false, DIRTY_EXPD[idx], true, true);
  e = addNoteEditorWindow(e, "notes-other", "file-other", NOTE_R, false, undefined, false, true);
  e = addExplorerWindow(e, "explorer-main", EXP, false, true);
  e = addCompanions(e);
  return { envState: e, targets: { noteWindowId: "notes-target", targetFileId: "file-target", expectedSavedContent: DIRTY_EXPD[idx] } };
}

// T41
function setupRenameOpenAppendSave(seed: number, vp: Viewport) {
  const old = pick(seed, R_OLD);
  const nw = pick(seed, R_NEW);
  const init = "Body";
  const ap = pick(seed, APPENDS);
  let e = createEmptyEnv(vp, `The file ${old} is done. Rename it to ${nw}, open it, add "${ap.trim()}" at the end, and save.`);
  e = addFiles(e, rot([createFile("file-target", old, init), ...dists(1)], seed));
  e = addExplorerWindow(e, "explorer-main", EXP, true, false);
  e = addCompanions(e);
  return { envState: e, targets: { targetFileId: "file-target", oldName: old, newName: nw, appendText: ap, expectedSavedContent: init + ap } };
}

// T42
function setupPopupThenRenameOpen(seed: number, vp: Viewport) {
  const old = pick(seed, R_OLD);
  const nw = pick(seed, R_NEW);
  let e = createEmptyEnv(vp, `There's a popup in the way. After dismissing it, rename ${old} to ${nw} and open the file.`);
  e = addFiles(e, rot([createFile("file-target", old, "Body"), ...dists(1)], seed));
  e = addExplorerWindow(e, "explorer-main", EXP, false, false);
  e = addCompanions(e);
  e = popup(e, seed);
  return { envState: e, targets: { targetFileId: "file-target", oldName: old, newName: nw } };
}

// T43
function setupPopupThenCopyPasteSave(seed: number, vp: Viewport) {
  const line = pick(seed, SRC_LINES);
  const tgtInit = "Target body";
  let e = createEmptyEnv(vp, `A notification is blocking me. Dismiss it, then copy the first line from source.txt to target.txt and save.`);
  e = addFiles(e, [
    createFile("file-src", "source.txt", `${line}\nLine two`),
    createFile("file-tgt", "target.txt", tgtInit)
  ]);
  e = addNoteEditorWindow(e, "notes-src", "file-src", NOTE_L, false, undefined, false, false);
  e = addNoteEditorWindow(e, "notes-tgt", "file-tgt", NOTE_R, false, undefined, false, false);
  e = addCompanions(e);
  e = popup(e, seed);
  return { envState: e, targets: { sourceLine: line, targetFileId: "file-tgt", expectedSavedContent: tgtInit + line } };
}

// T44
function setupPopupRestoreAppendSave(seed: number, vp: Viewport) {
  const name = pick(seed, T_NAMES);
  const init = "Start";
  const ap = pick(seed, APPENDS);
  let e = createEmptyEnv(vp, `Popup is stuck, my editor is minimized. Close the popup, bring back the editor, add "${ap.trim()}", and save.`);
  e = addFiles(e, [createFile("file-1", name, init)]);
  e = addNoteEditorWindow(e, "notes-1", "file-1", NOTE_C, false, init, false, true);
  e = addExplorerWindow(e, "explorer-main", EXP, false, false);
  e = addCompanions(e);
  e = popup(e, seed);
  return { envState: e, targets: { noteWindowId: "notes-1", targetFileId: "file-1", appendText: ap, expectedSavedContent: init + ap } };
}

// T45
function setupDockLaunchRenameThenOpen(seed: number, vp: Viewport) {
  const old = pick(seed, R_OLD);
  const nw = pick(seed, R_NEW);
  let e = createEmptyEnv(vp, `File manager is closed. Open it from the dock, rename ${old} to ${nw}, then open the renamed file.`);
  e = addFiles(e, rot([createFile("file-target", old, "Body"), ...dists(1)], seed));
  e = addCompanions(e);
  return { envState: e, targets: { targetFileId: "file-target", oldName: old, newName: nw } };
}

// T46
function setupAllMinRestoreAppendSave(seed: number, vp: Viewport) {
  const name = pick(seed, T_NAMES);
  const init = "Start";
  const ap = pick(seed, APPENDS);
  let e = createEmptyEnv(vp, `All windows are hidden. Find my editor for ${name}, add "${ap.trim()}", and save.`);
  e = addFiles(e, [createFile("file-1", name, init)]);
  e = addNoteEditorWindow(e, "notes-1", "file-1", NOTE_C, true, init, false, false);
  e = addExplorerWindow(e, "explorer-main", EXP, false, false);
  e = addCompanions(e);
  e = minimizeAllWindows(e);
  return { envState: e, targets: { noteWindowId: "notes-1", targetFileId: "file-1", appendText: ap, expectedSavedContent: init + ap } };
}

// T47
function setupPopupDockLaunchOpenAppendSave(seed: number, vp: Viewport) {
  const name = pick(seed, T_NAMES);
  const init = "TODO:";
  const ap = pick(seed, APPENDS);
  let e = createEmptyEnv(vp, `A dialog is blocking everything and the file manager isn't running. Close the dialog, launch Files, open ${name}, add "${ap.trim()}", and save.`);
  e = addFiles(e, [createFile("file-1", name, init)]);
  e = addCompanions(e);
  e = popup(e, seed);
  return { envState: e, targets: { targetFileId: "file-1", appendText: ap, expectedSavedContent: init + ap } };
}

// T48
function setupPopupRenameOpenAppendSave(seed: number, vp: Viewport) {
  const old = pick(seed, R_OLD);
  const nw = pick(seed, R_NEW);
  const init = "Body";
  const ap = pick(seed, APPENDS);
  let e = createEmptyEnv(vp, `Popup is in the way. Dismiss it, rename ${old} to ${nw}, open it, write "${ap.trim()}", and save.`);
  e = addFiles(e, [createFile("file-target", old, init)]);
  e = addExplorerWindow(e, "explorer-main", EXP, false, false);
  e = addCompanions(e);
  e = popup(e, seed);
  return { envState: e, targets: { targetFileId: "file-target", oldName: old, newName: nw, appendText: ap, expectedSavedContent: init + ap } };
}

// T49
function setupPopupAllMinRestoreSave(seed: number, vp: Viewport) {
  const name = pick(seed, T_NAMES);
  const idx = Math.abs(seed) % DIRTY_ORIG.length;
  let e = createEmptyEnv(vp, "Everything is a mess — there's a popup and all windows are minimized. Close the popup, find my editor, and save my work.");
  e = addFiles(e, [createFile("file-1", name, DIRTY_ORIG[idx])]);
  e = addNoteEditorWindow(e, "notes-1", "file-1", NOTE_C, true, DIRTY_EXPD[idx], true, false);
  e = addExplorerWindow(e, "explorer-main", EXP, false, false);
  e = addCompanions(e);
  e = minimizeAllWindows(e);
  e = popup(e, seed);
  return { envState: e, targets: { noteWindowId: "notes-1", targetFileId: "file-1", expectedSavedContent: DIRTY_EXPD[idx] } };
}

// T50
function setupDockLaunchOpenCopyPasteSave(seed: number, vp: Viewport) {
  const line = pick(seed, SRC_LINES);
  const tgtInit = "Target body";
  let e = createEmptyEnv(vp, `The file manager is closed. Launch it, open both source.txt and target.txt. Copy the first line from source.txt into target.txt and save.`);
  e = addFiles(e, [
    createFile("file-src", "source.txt", `${line}\nLine two`),
    createFile("file-tgt", "target.txt", tgtInit)
  ]);
  e = addCompanions(e);
  return { envState: e, targets: { sourceLine: line, targetFileId: "file-tgt", expectedSavedContent: tgtInit + line } };
}

/* ═══════════════════════════════════════════════════════════
   Task Specs
   ═══════════════════════════════════════════════════════════ */

const implementationPath = "packages/core/src/tasks/files-window-tasks.ts";

const RAW_FILES_WINDOW_TASKS = [
  // ── TIER A ──
  { id: "popup_dismiss", instruction: "Dismiss the blocking popup.", domain: "OS", split: "starter", maxSteps: 5, seedDefaults: [0, 1, 2], setup: setupPopupDismiss, goalPredicates: ["popup.dismissed"], progressPredicates: ["popup.dismissed"], forbiddenPredicates: [] },
  { id: "open_single_file", instruction: "Open the target file from the file explorer.", domain: "Files", split: "starter", maxSteps: 8, seedDefaults: [0, 1, 2], setup: (s, v) => setupOpenFile(s, v, 0), goalPredicates: ["note.target_opened"], progressPredicates: ["note.target_opened"], forbiddenPredicates: [] },
  { id: "restore_minimized_note", instruction: "Restore the minimized editor window.", domain: "OS", split: "starter", maxSteps: 8, seedDefaults: [0, 1, 2], setup: setupRestoreMinimized, goalPredicates: ["window.note_restored"], progressPredicates: ["window.note_restored"], forbiddenPredicates: [] },
  { id: "refocus_background_note", instruction: "Switch focus back to the text editor behind other windows.", domain: "OS", split: "starter", maxSteps: 8, seedDefaults: [0, 1, 2], setup: setupRefocusBackground, goalPredicates: ["window.note_restored"], progressPredicates: ["window.note_restored"], forbiddenPredicates: [] },
  { id: "save_dirty_note", instruction: "Save the unsaved changes in the editor.", domain: "Files", split: "starter", maxSteps: 5, seedDefaults: [0, 1, 2], setup: setupSaveDirty, goalPredicates: ["note.saved"], progressPredicates: ["note.saved"], forbiddenPredicates: [] },
  { id: "open_among_two", instruction: "Open the correct file from a list of two.", domain: "Files", split: "starter", maxSteps: 8, seedDefaults: [0, 1, 2], setup: (s, v) => setupOpenFile(s, v, 1), goalPredicates: ["note.target_opened"], progressPredicates: ["note.target_opened"], forbiddenPredicates: [] },
  { id: "open_among_three", instruction: "Open the correct file from a list of three.", domain: "Files", split: "starter", maxSteps: 8, seedDefaults: [0, 1, 2], setup: (s, v) => setupOpenFile(s, v, 2), goalPredicates: ["note.target_opened"], progressPredicates: ["note.target_opened"], forbiddenPredicates: [] },
  { id: "open_among_four", instruction: "Open the correct file from a list of four.", domain: "Files", split: "starter", maxSteps: 8, seedDefaults: [0, 1, 2, 3], setup: (s, v) => setupOpenFile(s, v, 3), goalPredicates: ["note.target_opened"], progressPredicates: ["note.target_opened"], forbiddenPredicates: [] },
  { id: "rename_preselected", instruction: "Rename the already-selected file.", domain: "Files", split: "starter", maxSteps: 10, seedDefaults: [0, 1, 2], setup: (s, v) => setupRename(s, v, 1, true), goalPredicates: ["file.renamed"], progressPredicates: ["file.renamed"], forbiddenPredicates: [] },
  { id: "rename_single", instruction: "Select and rename the file.", domain: "Files", split: "starter", maxSteps: 10, seedDefaults: [0, 1, 2], setup: (s, v) => setupRename(s, v, 0, false), goalPredicates: ["file.renamed"], progressPredicates: ["file.renamed"], forbiddenPredicates: [] },

  // ── TIER B ──
  { id: "rename_among_two", instruction: "Rename the correct file from a list of two.", domain: "Files", split: "starter", maxSteps: 15, seedDefaults: [0, 1, 2], setup: (s, v) => setupRename(s, v, 1, false), goalPredicates: ["file.renamed"], progressPredicates: ["file.renamed"], forbiddenPredicates: [] },
  { id: "rename_among_three", instruction: "Rename the correct file from a list of three.", domain: "Files", split: "starter", maxSteps: 15, seedDefaults: [0, 1, 2], setup: (s, v) => setupRename(s, v, 2, false), goalPredicates: ["file.renamed"], progressPredicates: ["file.renamed"], forbiddenPredicates: [] },
  { id: "rename_among_four", instruction: "Rename the correct file from a list of four.", domain: "Files", split: "starter", maxSteps: 15, seedDefaults: [0, 1, 2, 3], setup: (s, v) => setupRename(s, v, 3, false), goalPredicates: ["file.renamed"], progressPredicates: ["file.renamed"], forbiddenPredicates: [] },
  { id: "popup_then_open", instruction: "Dismiss popup, then open a file.", domain: "OS", split: "starter", maxSteps: 15, seedDefaults: [0, 1, 2], setup: setupPopupThenOpen, goalPredicates: ["popup.dismissed", "note.target_opened"], progressPredicates: ["popup.dismissed", "note.target_opened"], forbiddenPredicates: [] },
  { id: "popup_then_rename", instruction: "Dismiss popup, then rename a file.", domain: "OS", split: "starter", maxSteps: 18, seedDefaults: [0, 1, 2], setup: setupPopupThenRename, goalPredicates: ["popup.dismissed", "file.renamed"], progressPredicates: ["popup.dismissed", "file.renamed"], forbiddenPredicates: [] },
  { id: "restore_and_save", instruction: "Restore hidden editor and save pending changes.", domain: "OS", split: "starter", maxSteps: 15, seedDefaults: [0, 1, 2], setup: setupRestoreAndSave, goalPredicates: ["window.note_restored", "note.saved"], progressPredicates: ["window.note_restored", "note.saved"], forbiddenPredicates: [] },
  { id: "restore_specific_of_two", instruction: "Restore the correct editor from two minimized.", domain: "OS", split: "starter", maxSteps: 12, seedDefaults: [0, 1, 2], setup: setupRestoreSpecificOfTwo, goalPredicates: ["window.note_restored"], progressPredicates: ["window.note_restored"], forbiddenPredicates: [] },
  { id: "restore_from_all_minimized", instruction: "Find and restore the editor when everything is minimized.", domain: "OS", split: "starter", maxSteps: 12, seedDefaults: [0, 1, 2], setup: setupRestoreFromAllMin, goalPredicates: ["window.note_restored"], progressPredicates: ["window.note_restored"], forbiddenPredicates: [] },
  { id: "open_and_append", instruction: "Open a file and append text.", domain: "Files", split: "starter", maxSteps: 18, seedDefaults: [0, 1, 2], setup: setupOpenAndAppend, goalPredicates: ["note.target_opened", "note.target_appended"], progressPredicates: ["note.target_opened", "note.target_appended"], forbiddenPredicates: [] },
  { id: "popup_then_restore", instruction: "Dismiss popup, then restore minimized editor.", domain: "OS", split: "starter", maxSteps: 15, seedDefaults: [0, 1, 2], setup: setupPopupThenRestore, goalPredicates: ["popup.dismissed", "window.note_restored"], progressPredicates: ["popup.dismissed", "window.note_restored"], forbiddenPredicates: [] },
  { id: "dock_launch_then_open", instruction: "Launch file manager from dock and open a file.", domain: "OS", split: "starter", maxSteps: 15, seedDefaults: [0, 1, 2], setup: (s, v) => setupDockLaunchOpen(s, v, 0), goalPredicates: ["note.target_opened"], progressPredicates: ["note.target_opened"], forbiddenPredicates: [] },
  { id: "dock_launch_then_rename", instruction: "Launch file manager from dock and rename a file.", domain: "OS", split: "starter", maxSteps: 18, seedDefaults: [0, 1, 2], setup: (s, v) => setupDockLaunchRename(s, v, 1), goalPredicates: ["file.renamed"], progressPredicates: ["file.renamed"], forbiddenPredicates: [] },
  { id: "restore_explorer_then_rename", instruction: "Restore minimized explorer and rename a file.", domain: "Files", split: "starter", maxSteps: 18, seedDefaults: [0, 1, 2], setup: setupRestoreExplorerThenRename, goalPredicates: ["file.renamed"], progressPredicates: ["file.renamed"], forbiddenPredicates: [] },
  { id: "switch_between_notes", instruction: "Switch focus to the correct editor window.", domain: "OS", split: "starter", maxSteps: 8, seedDefaults: [0, 1, 2], setup: setupSwitchBetweenNotes, goalPredicates: ["window.note_restored"], progressPredicates: ["window.note_restored"], forbiddenPredicates: [] },
  { id: "open_from_unfocused_explorer", instruction: "Switch to file manager and open a file.", domain: "Files", split: "starter", maxSteps: 15, seedDefaults: [0, 1, 2], setup: setupOpenFromUnfocusedExplorer, goalPredicates: ["note.target_opened"], progressPredicates: ["note.target_opened"], forbiddenPredicates: [] },

  // ── TIER C ──
  { id: "open_append_save", instruction: "Open a file, append text, and save.", domain: "Files", split: "starter", maxSteps: 22, seedDefaults: [0, 1, 2], setup: (s, v) => setupOpenAppendSave(s, v, 0), goalPredicates: ["note.target_opened", "note.target_appended", "note.saved"], progressPredicates: ["note.target_opened", "note.target_appended", "note.saved"], forbiddenPredicates: [] },
  { id: "open_append_save_among_three", instruction: "Open the correct file from three, append, and save.", domain: "Files", split: "starter", maxSteps: 25, seedDefaults: [0, 1, 2], setup: (s, v) => setupOpenAppendSave(s, v, 2), goalPredicates: ["note.target_opened", "note.target_appended", "note.saved"], progressPredicates: ["note.target_opened", "note.target_appended", "note.saved"], forbiddenPredicates: [] },
  { id: "open_append_save_among_four", instruction: "Open the correct file from four, append, and save.", domain: "Files", split: "starter", maxSteps: 25, seedDefaults: [0, 1, 2, 3], setup: (s, v) => setupOpenAppendSave(s, v, 3), goalPredicates: ["note.target_opened", "note.target_appended", "note.saved"], progressPredicates: ["note.target_opened", "note.target_appended", "note.saved"], forbiddenPredicates: [] },
  { id: "rename_then_open", instruction: "Rename a file and then open it.", domain: "Files", split: "starter", maxSteps: 22, seedDefaults: [0, 1, 2], setup: (s, v) => setupRenameThenOpen(s, v, 1), goalPredicates: ["file.renamed", "note.target_opened"], progressPredicates: ["file.renamed", "note.target_opened"], forbiddenPredicates: [] },
  { id: "popup_then_open_append_save", instruction: "Dismiss popup, open file, append, and save.", domain: "OS", split: "starter", maxSteps: 28, seedDefaults: [0, 1, 2], setup: setupPopupThenOpenAppendSave, goalPredicates: ["popup.dismissed", "note.target_opened", "note.target_appended", "note.saved"], progressPredicates: ["popup.dismissed", "note.target_opened", "note.target_appended", "note.saved"], forbiddenPredicates: [] },
  { id: "popup_then_restore_save", instruction: "Dismiss popup, restore editor, and save.", domain: "OS", split: "starter", maxSteps: 20, seedDefaults: [0, 1, 2], setup: setupPopupThenRestoreSave, goalPredicates: ["popup.dismissed", "window.note_restored", "note.saved"], progressPredicates: ["popup.dismissed", "window.note_restored", "note.saved"], forbiddenPredicates: [] },
  { id: "restore_append_save", instruction: "Restore hidden editor, append text, and save.", domain: "OS", split: "starter", maxSteps: 22, seedDefaults: [0, 1, 2], setup: setupRestoreAppendSave, goalPredicates: ["window.note_restored", "note.target_appended", "note.saved"], progressPredicates: ["window.note_restored", "note.target_appended", "note.saved"], forbiddenPredicates: [] },
  { id: "dock_launch_open_append_save", instruction: "Launch explorer from dock, open file, append, and save.", domain: "OS", split: "starter", maxSteps: 28, seedDefaults: [0, 1, 2], setup: setupDockLaunchOpenAppendSave, goalPredicates: ["note.target_opened", "note.target_appended", "note.saved"], progressPredicates: ["note.target_opened", "note.target_appended", "note.saved"], forbiddenPredicates: [] },
  { id: "all_minimized_restore_and_save", instruction: "Restore editor from all-minimized state and save.", domain: "OS", split: "starter", maxSteps: 15, seedDefaults: [0, 1, 2], setup: setupAllMinRestoreAndSave, goalPredicates: ["window.note_restored", "note.saved"], progressPredicates: ["window.note_restored", "note.saved"], forbiddenPredicates: [] },
  { id: "popup_then_dock_launch_open", instruction: "Dismiss popup, launch explorer from dock, and open a file.", domain: "OS", split: "starter", maxSteps: 20, seedDefaults: [0, 1, 2], setup: setupPopupDockLaunchOpen, goalPredicates: ["popup.dismissed", "note.target_opened"], progressPredicates: ["popup.dismissed", "note.target_opened"], forbiddenPredicates: [] },
  { id: "copy_line_paste_save", instruction: "Copy a line between editors and save.", domain: "Workflow", split: "starter", maxSteps: 28, seedDefaults: [0, 1, 2], setup: setupCopyPasteSave, goalPredicates: ["clipboard.source_line_copied", "note.target_pasted", "note.saved"], progressPredicates: ["clipboard.source_line_copied", "note.target_pasted", "note.saved"], forbiddenPredicates: [] },
  { id: "rename_then_open_among_three", instruction: "Rename a file among three and open it.", domain: "Files", split: "starter", maxSteps: 22, seedDefaults: [0, 1, 2], setup: (s, v) => setupRenameThenOpen(s, v, 2), goalPredicates: ["file.renamed", "note.target_opened"], progressPredicates: ["file.renamed", "note.target_opened"], forbiddenPredicates: [] },
  { id: "popup_then_rename_among_three", instruction: "Dismiss popup and rename a file among three.", domain: "OS", split: "starter", maxSteps: 22, seedDefaults: [0, 1, 2], setup: setupPopupThenRenameAmongThree, goalPredicates: ["popup.dismissed", "file.renamed"], progressPredicates: ["popup.dismissed", "file.renamed"], forbiddenPredicates: [] },
  { id: "dock_launch_rename_among_three", instruction: "Launch explorer from dock and rename a file among three.", domain: "OS", split: "starter", maxSteps: 22, seedDefaults: [0, 1, 2], setup: (s, v) => setupDockLaunchRename(s, v, 2), goalPredicates: ["file.renamed"], progressPredicates: ["file.renamed"], forbiddenPredicates: [] },
  { id: "restore_among_three_then_save", instruction: "Restore the correct editor from three minimized and save.", domain: "OS", split: "starter", maxSteps: 18, seedDefaults: [0, 1, 2], setup: setupRestoreAmongThreeThenSave, goalPredicates: ["window.note_restored", "note.saved"], progressPredicates: ["window.note_restored", "note.saved"], forbiddenPredicates: [] },

  // ── TIER D ──
  { id: "rename_open_append_save", instruction: "Rename, open, append, and save a file.", domain: "Files", split: "representative", maxSteps: 32, seedDefaults: [0, 1, 2], setup: setupRenameOpenAppendSave, goalPredicates: ["file.renamed", "note.target_opened", "note.target_appended", "note.saved"], progressPredicates: ["file.renamed", "note.target_opened", "note.target_appended", "note.saved"], forbiddenPredicates: [] },
  { id: "popup_then_rename_open", instruction: "Dismiss popup, rename, and open a file.", domain: "Files", split: "representative", maxSteps: 28, seedDefaults: [0, 1, 2], setup: setupPopupThenRenameOpen, goalPredicates: ["popup.dismissed", "file.renamed", "note.target_opened"], progressPredicates: ["popup.dismissed", "file.renamed", "note.target_opened"], forbiddenPredicates: [] },
  { id: "popup_then_copy_paste_save", instruction: "Dismiss popup, copy between editors, and save.", domain: "Workflow", split: "representative", maxSteps: 35, seedDefaults: [0, 1, 2], setup: setupPopupThenCopyPasteSave, goalPredicates: ["popup.dismissed", "clipboard.source_line_copied", "note.target_pasted", "note.saved"], progressPredicates: ["popup.dismissed", "clipboard.source_line_copied", "note.target_pasted", "note.saved"], forbiddenPredicates: [] },
  { id: "popup_then_restore_append_save", instruction: "Dismiss popup, restore editor, append, and save.", domain: "OS", split: "representative", maxSteps: 28, seedDefaults: [0, 1, 2], setup: setupPopupRestoreAppendSave, goalPredicates: ["popup.dismissed", "window.note_restored", "note.target_appended", "note.saved"], progressPredicates: ["popup.dismissed", "window.note_restored", "note.target_appended", "note.saved"], forbiddenPredicates: [] },
  { id: "dock_launch_rename_then_open", instruction: "Launch explorer, rename, and open a file.", domain: "Files", split: "representative", maxSteps: 28, seedDefaults: [0, 1, 2], setup: setupDockLaunchRenameThenOpen, goalPredicates: ["file.renamed", "note.target_opened"], progressPredicates: ["file.renamed", "note.target_opened"], forbiddenPredicates: [] },
  { id: "all_minimized_restore_append_save", instruction: "Restore editor from all-minimized, append, and save.", domain: "OS", split: "representative", maxSteps: 28, seedDefaults: [0, 1, 2], setup: setupAllMinRestoreAppendSave, goalPredicates: ["window.note_restored", "note.target_appended", "note.saved"], progressPredicates: ["window.note_restored", "note.target_appended", "note.saved"], forbiddenPredicates: [] },
  { id: "popup_dock_launch_open_append_save", instruction: "Dismiss popup, launch explorer, open, append, and save.", domain: "OS", split: "representative", maxSteps: 35, seedDefaults: [0, 1, 2], setup: setupPopupDockLaunchOpenAppendSave, goalPredicates: ["popup.dismissed", "note.target_opened", "note.target_appended", "note.saved"], progressPredicates: ["popup.dismissed", "note.target_opened", "note.target_appended", "note.saved"], forbiddenPredicates: [] },
  { id: "popup_rename_open_append_save", instruction: "Dismiss popup, rename, open, append, and save.", domain: "Files", split: "representative", maxSteps: 38, seedDefaults: [0, 1, 2], setup: setupPopupRenameOpenAppendSave, goalPredicates: ["popup.dismissed", "file.renamed", "note.target_opened", "note.target_appended", "note.saved"], progressPredicates: ["popup.dismissed", "file.renamed", "note.target_opened", "note.target_appended", "note.saved"], forbiddenPredicates: [] },
  { id: "popup_all_minimized_restore_save", instruction: "Handle popup and all-minimized state, restore and save.", domain: "OS", split: "representative", maxSteps: 22, seedDefaults: [0, 1, 2], setup: setupPopupAllMinRestoreSave, goalPredicates: ["popup.dismissed", "window.note_restored", "note.saved"], progressPredicates: ["popup.dismissed", "window.note_restored", "note.saved"], forbiddenPredicates: [] },
  { id: "dock_launch_open_copy_paste_save", instruction: "Launch explorer, open two files, copy between them, and save.", domain: "Workflow", split: "representative", maxSteps: 40, seedDefaults: [0, 1, 2], setup: setupDockLaunchOpenCopyPasteSave, goalPredicates: ["clipboard.source_line_copied", "note.target_pasted", "note.saved"], progressPredicates: ["clipboard.source_line_copied", "note.target_pasted", "note.saved"], forbiddenPredicates: [] }
] satisfies Omit<TaskSpec, "summary">[];

const summaries: Record<string, TaskSummary> = {
  // ── TIER A ──
  popup_dismiss: { family: "popup_dismiss", level: "A", apps: ["popup"], startState: "A blocking popup is centered over the desktop; File Explorer and companion apps are behind it.", objective: "Dismiss the modal popup to unblock the desktop.", implementationPath },
  open_single_file: { family: "file_open", level: "A", apps: ["files"], startState: "File Explorer is focused with the target file visible among no distractors.", objective: "Open the target file from the file explorer.", implementationPath },
  restore_minimized_note: { family: "window_restore", level: "A", apps: ["window", "note"], startState: "The note editor is minimized; File Explorer is focused.", objective: "Restore the minimized editor window to the desktop.", implementationPath },
  refocus_background_note: { family: "window_focus", level: "A", apps: ["window", "note"], startState: "The note editor is open but behind the focused file manager.", objective: "Bring the background text editor to the foreground.", implementationPath },
  save_dirty_note: { family: "note_save", level: "A", apps: ["note"], startState: "The note editor is focused with unsaved (dirty) changes in its buffer.", objective: "Save the pending changes in the editor.", implementationPath },
  open_among_two: { family: "file_open", level: "A", apps: ["files"], startState: "File Explorer is focused showing two files including the target.", objective: "Open the correct file from a list of two.", implementationPath },
  open_among_three: { family: "file_open", level: "A", apps: ["files"], startState: "File Explorer is focused showing three files including the target.", objective: "Open the correct file from a list of three.", implementationPath },
  open_among_four: { family: "file_open", level: "A", apps: ["files"], startState: "File Explorer is focused showing four files including the target.", objective: "Open the correct file from a list of four.", implementationPath },
  rename_preselected: { family: "file_rename", level: "A", apps: ["files"], startState: "File Explorer is focused with the target file already selected.", objective: "Rename the pre-selected file to the specified new name.", implementationPath },
  rename_single: { family: "file_rename", level: "A", apps: ["files"], startState: "File Explorer is focused with a single target file visible.", objective: "Select and rename the file.", implementationPath },

  // ── TIER B ──
  rename_among_two: { family: "file_rename", level: "B", apps: ["files"], startState: "File Explorer is focused showing two files including the target.", objective: "Identify and rename the correct file from two.", implementationPath },
  rename_among_three: { family: "file_rename", level: "B", apps: ["files"], startState: "File Explorer is focused showing three files including the target.", objective: "Identify and rename the correct file from three.", implementationPath },
  rename_among_four: { family: "file_rename", level: "B", apps: ["files"], startState: "File Explorer is focused showing four files including the target.", objective: "Identify and rename the correct file from four.", implementationPath },
  popup_then_open: { family: "popup_then_file", level: "B", apps: ["popup", "files"], startState: "A popup blocks the desktop; File Explorer has the target file behind it.", objective: "Dismiss the popup and then open the target file.", implementationPath },
  popup_then_rename: { family: "popup_then_rename", level: "B", apps: ["popup", "files"], startState: "A popup blocks the desktop; File Explorer has the target file behind it.", objective: "Dismiss the popup and then rename the target file.", implementationPath },
  restore_and_save: { family: "window_restore_save", level: "B", apps: ["window", "note"], startState: "The note editor is minimized with unsaved changes; Explorer is focused.", objective: "Restore the hidden editor and save its pending changes.", implementationPath },
  restore_specific_of_two: { family: "window_restore", level: "B", apps: ["window", "note"], startState: "Two editor windows are minimized; Explorer is focused.", objective: "Restore the correct editor from two minimized windows.", implementationPath },
  restore_from_all_minimized: { family: "window_restore", level: "B", apps: ["window", "note"], startState: "All windows including the editor are minimized.", objective: "Find and restore the editor from a fully minimized desktop.", implementationPath },
  open_and_append: { family: "file_open_append", level: "B", apps: ["files", "note"], startState: "File Explorer is focused with the target file visible; no editor is open.", objective: "Open the file and append the requested text.", implementationPath },
  popup_then_restore: { family: "popup_then_restore", level: "B", apps: ["popup", "window", "note"], startState: "A popup blocks the desktop and the editor is minimized behind it.", objective: "Dismiss the popup and restore the minimized editor.", implementationPath },
  dock_launch_then_open: { family: "dock_launch_open", level: "B", apps: ["dock", "files"], startState: "File Explorer is not running; files exist in the virtual filesystem.", objective: "Launch File Explorer from the dock and open the target file.", implementationPath },
  dock_launch_then_rename: { family: "dock_launch_rename", level: "B", apps: ["dock", "files"], startState: "File Explorer is not running; files exist in the virtual filesystem.", objective: "Launch File Explorer from the dock and rename the target file.", implementationPath },
  restore_explorer_then_rename: { family: "window_restore_rename", level: "B", apps: ["window", "files"], startState: "File Explorer is minimized with the target file inside.", objective: "Restore the minimized explorer and rename the target file.", implementationPath },
  switch_between_notes: { family: "window_focus", level: "B", apps: ["window", "note"], startState: "Two note editors are open side by side; the wrong one is focused.", objective: "Switch focus to the correct editor window.", implementationPath },
  open_from_unfocused_explorer: { family: "window_focus_open", level: "B", apps: ["window", "files"], startState: "File Explorer is open but behind the focused editor window.", objective: "Switch to the file manager and open the target file.", implementationPath },

  // ── TIER C ──
  open_append_save: { family: "file_open_edit_save", level: "C", apps: ["files", "note"], startState: "File Explorer is focused with the target file visible; no editor open.", objective: "Open the file, append text, and save.", implementationPath },
  open_append_save_among_three: { family: "file_open_edit_save", level: "C", apps: ["files", "note"], startState: "File Explorer is focused showing three files including the target.", objective: "Open the correct file from three, append text, and save.", implementationPath },
  open_append_save_among_four: { family: "file_open_edit_save", level: "C", apps: ["files", "note"], startState: "File Explorer is focused showing four files including the target.", objective: "Open the correct file from four, append text, and save.", implementationPath },
  rename_then_open: { family: "file_rename_open", level: "C", apps: ["files"], startState: "File Explorer is focused with the target file and one distractor.", objective: "Rename the file and then open it for editing.", implementationPath },
  popup_then_open_append_save: { family: "popup_then_file_edit", level: "C", apps: ["popup", "files", "note"], startState: "A popup blocks the desktop; File Explorer is behind it with the target file.", objective: "Dismiss popup, open the file, append text, and save.", implementationPath },
  popup_then_restore_save: { family: "popup_then_restore_save", level: "C", apps: ["popup", "window", "note"], startState: "A popup blocks the desktop; the editor is minimized with unsaved changes.", objective: "Dismiss popup, restore the editor, and save pending changes.", implementationPath },
  restore_append_save: { family: "window_restore_edit_save", level: "C", apps: ["window", "note"], startState: "The note editor is minimized; Explorer is focused.", objective: "Restore the hidden editor, append text, and save.", implementationPath },
  dock_launch_open_append_save: { family: "dock_launch_edit", level: "C", apps: ["dock", "files", "note"], startState: "File Explorer is not running; files exist in the virtual filesystem.", objective: "Launch explorer, open the file, append text, and save.", implementationPath },
  all_minimized_restore_and_save: { family: "all_minimized_restore_save", level: "C", apps: ["window", "note"], startState: "All windows are minimized; the editor has unsaved changes.", objective: "Restore the editor from a fully minimized desktop and save.", implementationPath },
  popup_then_dock_launch_open: { family: "popup_dock_launch_open", level: "C", apps: ["popup", "dock", "files"], startState: "A popup blocks the desktop and File Explorer is not running.", objective: "Dismiss popup, launch explorer from dock, and open the file.", implementationPath },
  copy_line_paste_save: { family: "clipboard_copy_paste", level: "C", apps: ["note", "clipboard"], startState: "Two note editors are open side by side with source.txt focused.", objective: "Copy a line from source, paste into target, and save.", implementationPath },
  rename_then_open_among_three: { family: "file_rename_open", level: "C", apps: ["files"], startState: "File Explorer is focused showing three files including the target.", objective: "Rename the correct file among three and open it.", implementationPath },
  popup_then_rename_among_three: { family: "popup_then_rename", level: "C", apps: ["popup", "files"], startState: "A popup blocks the desktop; Explorer has three files behind it.", objective: "Dismiss popup and rename the correct file among three.", implementationPath },
  dock_launch_rename_among_three: { family: "dock_launch_rename", level: "C", apps: ["dock", "files"], startState: "File Explorer is not running; three files exist in the filesystem.", objective: "Launch explorer from dock and rename the correct file among three.", implementationPath },
  restore_among_three_then_save: { family: "window_restore_save", level: "C", apps: ["window", "note"], startState: "Three windows are minimized including the target editor with unsaved changes.", objective: "Restore the correct editor from three minimized and save.", implementationPath },

  // ── TIER D ──
  rename_open_append_save: { family: "file_rename_edit_save", level: "D", apps: ["files", "note"], startState: "File Explorer is focused with the target file and a distractor.", objective: "Rename the file, open it, append text, and save.", implementationPath },
  popup_then_rename_open: { family: "popup_then_rename_open", level: "D", apps: ["popup", "files"], startState: "A popup blocks the desktop; Explorer has the target file behind it.", objective: "Dismiss popup, rename the file, and open it.", implementationPath },
  popup_then_copy_paste_save: { family: "popup_then_clipboard", level: "D", apps: ["popup", "note", "clipboard"], startState: "A popup blocks the desktop; two editors are open behind it.", objective: "Dismiss popup, copy a line between editors, and save.", implementationPath },
  popup_then_restore_append_save: { family: "popup_then_restore_edit", level: "D", apps: ["popup", "window", "note"], startState: "A popup blocks the desktop; the editor is minimized behind it.", objective: "Dismiss popup, restore the editor, append text, and save.", implementationPath },
  dock_launch_rename_then_open: { family: "dock_launch_rename_open", level: "D", apps: ["dock", "files"], startState: "File Explorer is not running; files exist in the virtual filesystem.", objective: "Launch explorer, rename the file, and open the renamed file.", implementationPath },
  all_minimized_restore_append_save: { family: "all_minimized_restore_edit", level: "D", apps: ["window", "note"], startState: "All windows are minimized; the editor has existing content.", objective: "Restore the editor from a fully minimized desktop, append text, and save.", implementationPath },
  popup_dock_launch_open_append_save: { family: "popup_dock_launch_edit", level: "D", apps: ["popup", "dock", "files", "note"], startState: "A popup blocks the desktop and File Explorer is not running.", objective: "Dismiss popup, launch explorer, open the file, append text, and save.", implementationPath },
  popup_rename_open_append_save: { family: "popup_rename_edit", level: "D", apps: ["popup", "files", "note"], startState: "A popup blocks the desktop; Explorer has the target file behind it.", objective: "Dismiss popup, rename the file, open it, append text, and save.", implementationPath },
  popup_all_minimized_restore_save: { family: "popup_all_minimized_save", level: "D", apps: ["popup", "window", "note"], startState: "A popup blocks the desktop and all windows are minimized; the editor has unsaved changes.", objective: "Dismiss popup, restore the editor from all-minimized state, and save.", implementationPath },
  dock_launch_open_copy_paste_save: { family: "dock_launch_clipboard", level: "D", apps: ["dock", "note", "clipboard"], startState: "File Explorer is not running; source.txt and target.txt exist in the filesystem.", objective: "Launch explorer, open both files, copy a line from source to target, and save.", implementationPath }
};

export const FILES_WINDOW_TASKS = withTaskSummaries(RAW_FILES_WINDOW_TASKS, summaries);
