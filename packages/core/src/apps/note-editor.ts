import { produce } from "immer";
import type {
  A11yNode,
  AppActionResult,
  AppPlugin,
  BuildContext,
  Computer13Action,
  EnvState,
  NoteEditorState,
  NoteEditorViewModel,
  Point,
  Rect,
  WindowInstance
} from "../types.js";
import { getFileEntry } from "../system/filesystem.js";
import { setClipboardText } from "../system/clipboard.js";
import { updateFileContent } from "../system/filesystem.js";
import { pointInRect } from "../system/pointer.js";

const HEADER_HEIGHT = 40;
const TOOLBAR_HEIGHT = 52;
const PADDING = 16;
const GUTTER_WIDTH = 44;
const EDITOR_INNER_PADDING = 14;
export const NOTE_LINE_HEIGHT = 26;
export const NOTE_CHAR_WIDTH = 9;

export function getNoteEditorLayout(bounds: Rect, content: string = "") {
  const toolbarBounds = {
    x: bounds.x,
    y: bounds.y + HEADER_HEIGHT,
    width: bounds.width,
    height: TOOLBAR_HEIGHT
  };

  const saveButtonBounds = {
    x: bounds.x + bounds.width - 74,
    y: bounds.y + HEADER_HEIGHT + 11,
    width: 58,
    height: 30
  };

  const editorFrameBounds = {
    x: bounds.x + PADDING,
    y: bounds.y + HEADER_HEIGHT + TOOLBAR_HEIGHT + PADDING,
    width: bounds.width - PADDING * 2,
    height: bounds.height - HEADER_HEIGHT - TOOLBAR_HEIGHT - PADDING * 2
  };

  const gutterBounds = {
    x: editorFrameBounds.x + EDITOR_INNER_PADDING,
    y: editorFrameBounds.y + EDITOR_INNER_PADDING,
    width: GUTTER_WIDTH,
    height: editorFrameBounds.height - EDITOR_INNER_PADDING * 2
  };

  const editorBounds = {
    x: editorFrameBounds.x + GUTTER_WIDTH + EDITOR_INNER_PADDING,
    y: editorFrameBounds.y + EDITOR_INNER_PADDING,
    width: editorFrameBounds.width - GUTTER_WIDTH - EDITOR_INNER_PADDING * 2,
    height: editorFrameBounds.height - EDITOR_INNER_PADDING * 2
  };

  // Compute line rects based on content
  const lines = getLines(content);
  const lineRects: Rect[] = lines.map((_, index) => ({
    x: editorBounds.x,
    y: editorBounds.y + index * NOTE_LINE_HEIGHT,
    width: editorBounds.width,
    height: NOTE_LINE_HEIGHT
  }));

  return {
    toolbarBounds,
    saveButtonBounds,
    editorFrameBounds,
    gutterBounds,
    editorBounds,
    lineRects
  };
}

export function getLines(content: string): string[] {
  return content.split("\n");
}

export function getLineStartOffsets(content: string): number[] {
  const lines = getLines(content);
  const offsets: number[] = [];
  let running = 0;
  for (const line of lines) {
    offsets.push(running);
    running += line.length + 1;
  }
  return offsets;
}

function insertText(buffer: string, cursorIndex: number, text: string) {
  return {
    buffer: `${buffer.slice(0, cursorIndex)}${text}${buffer.slice(cursorIndex)}`,
    cursorIndex: cursorIndex + text.length
  };
}

function pushUndo(state: EnvState, windowId: string): EnvState {
  return produce(state, draft => {
    const note = draft.appStates.noteEditor[windowId];
    note.undoStack.push({ buffer: note.buffer, cursorIndex: note.cursorIndex });
    if (note.undoStack.length > 50) note.undoStack.shift();
    note.redoStack = [];
  });
}

function getCursorFromPoint(buffer: string, editorBounds: Rect, point: Point) {
  const lines = getLines(buffer);
  const lineOffsets = getLineStartOffsets(buffer);
  const clampedLine = Math.max(
    0,
    Math.min(lines.length - 1, Math.floor((point.y - editorBounds.y) / NOTE_LINE_HEIGHT))
  );
  const line = lines[clampedLine] ?? "";
  const clampedColumn = Math.max(
    0,
    Math.min(line.length, Math.floor((point.x - editorBounds.x) / NOTE_CHAR_WIDTH))
  );
  return {
    cursorIndex: (lineOffsets[clampedLine] ?? 0) + clampedColumn,
    selectedLineIndex: clampedLine
  };
}

export function handleNoteEditorAction(
  state: EnvState,
  window: WindowInstance,
  note: NoteEditorState,
  action: Computer13Action,
  point: Point
): AppActionResult | null {
  if (action.type === "CLICK") {
    const layout = getNoteEditorLayout(window.bounds, note.buffer);
    if (pointInRect(point, layout.saveButtonBounds)) {
      const next = produce(state, (draft) => {
        const nextNote = draft.appStates.noteEditor[window.id];
        nextNote.dirty = false;
        draft.fileSystem = updateFileContent(draft.fileSystem, nextNote.fileId, nextNote.buffer);
      });
      return { appState: next.appStates.noteEditor[window.id], envState: next, accepted: true };
    }

    if (!pointInRect(point, layout.editorBounds)) {
      // Click outside editor area but inside window: accept as focus click
      return { appState: note, envState: state, accepted: true };
    }

    const next = produce(state, (draft) => {
      const nextNote = draft.appStates.noteEditor[window.id];
      const cursor = getCursorFromPoint(nextNote.buffer, layout.editorBounds, point);
      nextNote.cursorIndex = cursor.cursorIndex;
      nextNote.selectedLineIndex = cursor.selectedLineIndex;
    });
    return { appState: next.appStates.noteEditor[window.id], envState: next, accepted: true };
  }

  if (action.type === "TYPING") {
    let afterUndo = pushUndo(state, window.id);
    const next = produce(afterUndo, (draft) => {
      const nextNote = draft.appStates.noteEditor[window.id];
      const inserted = insertText(nextNote.buffer, nextNote.cursorIndex, action.text);
      nextNote.buffer = inserted.buffer;
      nextNote.cursorIndex = inserted.cursorIndex;
      nextNote.selectedLineIndex = undefined;
      nextNote.dirty = true;
    });
    return { appState: next.appStates.noteEditor[window.id], envState: next, accepted: true };
  }

  if (action.type === "PRESS") {
    const lower = action.key.toLowerCase();
    let handled = false;

    if (lower === "backspace" && note.cursorIndex <= 0) {
      return null;
    }

    let afterUndo = state;
    if (lower === "backspace" || lower === "enter") {
      afterUndo = pushUndo(state, window.id);
    }

    const next = produce(afterUndo, (draft) => {
      const nextNote = draft.appStates.noteEditor[window.id];

      if (lower === "backspace") {
        nextNote.buffer = `${nextNote.buffer.slice(0, nextNote.cursorIndex - 1)}${nextNote.buffer.slice(nextNote.cursorIndex)}`;
        nextNote.cursorIndex -= 1;
        nextNote.selectedLineIndex = undefined;
        nextNote.dirty = true;
        handled = true;
      } else if (lower === "enter") {
        const inserted = insertText(nextNote.buffer, nextNote.cursorIndex, "\n");
        nextNote.buffer = inserted.buffer;
        nextNote.cursorIndex = inserted.cursorIndex;
        nextNote.selectedLineIndex = undefined;
        nextNote.dirty = true;
        handled = true;
      } else if (lower === "escape") {
        nextNote.selectedLineIndex = undefined;
        handled = true;
      }
    });
    if (handled) {
      return { appState: next.appStates.noteEditor[window.id], envState: next, accepted: true };
    }
    return null;
  }

  if (action.type === "HOTKEY") {
    const normalized = action.keys.map((key) => key.toLowerCase()).sort();
    let handled = false;

    // Ctrl+Z: Undo
    if (normalized.includes("ctrl") && normalized.includes("z") && !normalized.includes("shift")) {
      if (note.undoStack.length === 0) {
        return { appState: note, accepted: false };
      }
      const next = produce(state, draft => {
        const n = draft.appStates.noteEditor[window.id];
        n.redoStack.push({ buffer: n.buffer, cursorIndex: n.cursorIndex });
        const prev = n.undoStack.pop()!;
        n.buffer = prev.buffer;
        n.cursorIndex = prev.cursorIndex;
        n.dirty = true;
      });
      return { appState: next.appStates.noteEditor[window.id], envState: next, accepted: true };
    }

    // Ctrl+Shift+Z: Redo
    if (normalized.includes("ctrl") && normalized.includes("z") && normalized.includes("shift")) {
      if (note.redoStack.length === 0) {
        return { appState: note, accepted: false };
      }
      const next = produce(state, draft => {
        const n = draft.appStates.noteEditor[window.id];
        n.undoStack.push({ buffer: n.buffer, cursorIndex: n.cursorIndex });
        const future = n.redoStack.pop()!;
        n.buffer = future.buffer;
        n.cursorIndex = future.cursorIndex;
        n.dirty = true;
      });
      return { appState: next.appStates.noteEditor[window.id], envState: next, accepted: true };
    }

    const next = produce(state, (draft) => {
      const nextNote = draft.appStates.noteEditor[window.id];

      if (normalized.includes("ctrl") && normalized.includes("c")) {
        const lines = getLines(nextNote.buffer);
        const selectedLine = lines[nextNote.selectedLineIndex ?? 0] ?? "";
        draft.clipboard = setClipboardText(draft.clipboard, selectedLine);
        handled = true;
      } else if (normalized.includes("ctrl") && normalized.includes("s")) {
        nextNote.dirty = false;
        draft.fileSystem = updateFileContent(draft.fileSystem, nextNote.fileId, nextNote.buffer);
        handled = true;
      } else if (normalized.includes("ctrl") && normalized.includes("v")) {
        nextNote.undoStack.push({ buffer: nextNote.buffer, cursorIndex: nextNote.cursorIndex });
        if (nextNote.undoStack.length > 50) nextNote.undoStack.shift();
        nextNote.redoStack = [];
        const inserted = insertText(nextNote.buffer, nextNote.cursorIndex, draft.clipboard.text);
        nextNote.buffer = inserted.buffer;
        nextNote.cursorIndex = inserted.cursorIndex;
        nextNote.selectedLineIndex = undefined;
        nextNote.dirty = true;
        handled = true;
      }
    });
    if (handled) {
      return { appState: next.appStates.noteEditor[window.id], envState: next, accepted: true };
    }
    return null;
  }

  if (action.type === "SCROLL") {
    const direction = action.dy > 0 ? 1 : action.dy < 0 ? -1 : 0;
    if (direction === 0) {
      return null;
    }

    const lines = getLines(note.buffer);
    const currentLine = note.selectedLineIndex ?? 0;
    const newLine = Math.max(0, Math.min(lines.length - 1, currentLine + direction));
    if (newLine === currentLine && note.selectedLineIndex !== undefined) {
      return null;
    }

    const next = produce(state, (draft) => {
      const nextNote = draft.appStates.noteEditor[window.id];
      nextNote.selectedLineIndex = newLine;
      const offsets = getLineStartOffsets(nextNote.buffer);
      const line = lines[newLine] ?? "";
      nextNote.cursorIndex = Math.min(offsets[newLine] + line.length, offsets[newLine] + Math.max(0, nextNote.cursorIndex - (offsets[currentLine] ?? 0)));
    });
    return { appState: next.appStates.noteEditor[window.id], envState: next, accepted: true };
  }

  return null;
}

export const noteEditorPlugin: AppPlugin<NoteEditorState> = {
  id: "note-editor",
  title: "Note Editor",
  create() {
    return {
      id: "notes-1",
      fileId: "",
      buffer: "",
      cursorIndex: 0,
      dirty: false,
      undoStack: [],
      redoStack: []
    };
  },
  reduce(state) {
    return state;
  },
  buildA11y(state, ctx: BuildContext) {
    const file = getFileEntry(ctx.envState.fileSystem, state.fileId);
    const content = state.buffer;
    const lines = getLines(content);
    const layout = getNoteEditorLayout(ctx.window.bounds, content);

    return [
      {
        id: `${ctx.window.id}-window`,
        role: "window",
        name: ctx.window.title,
        bounds: ctx.window.bounds,
        visible: !ctx.window.minimized,
        enabled: true,
        focusable: true,
        focused: ctx.window.focused,
        children: [
          {
            id: `${ctx.window.id}-save`,
            role: "button",
            name: "Save",
            text: state.dirty ? "Unsaved changes" : "All changes saved",
            bounds: layout.saveButtonBounds,
            visible: true,
            enabled: true,
            focusable: true,
            focused: false,
            children: []
          },
          {
            id: `${ctx.window.id}-textbox`,
            role: "textbox",
            name: file?.name ?? "Untitled",
            text: content,
            bounds: layout.editorBounds,
            visible: true,
            enabled: true,
            focusable: true,
            focused: ctx.window.focused,
            children: lines.map((line, index) => ({
              id: `${ctx.window.id}-line-${index}`,
              role: "label",
              name: `Line ${index + 1}`,
              text: line,
              bounds: {
                x: layout.editorBounds.x,
                y: layout.editorBounds.y + index * NOTE_LINE_HEIGHT,
                width: layout.editorBounds.width,
                height: NOTE_LINE_HEIGHT
              },
              visible: true,
              enabled: true,
              focusable: true,
              focused: state.selectedLineIndex === index,
              children: []
            }))
          }
        ]
      }
    ];
  },
  buildViewModel(state, ctx: BuildContext): NoteEditorViewModel {
    const file = getFileEntry(ctx.envState.fileSystem, state.fileId);
    const content = state.buffer;
    const layout = getNoteEditorLayout(ctx.window.bounds, content);
    return {
      type: "note-editor",
      fileName: file?.name ?? "Untitled",
      content,
      cursorIndex: state.cursorIndex,
      selectedLineIndex: state.selectedLineIndex,
      dirty: state.dirty,
      saveButtonBounds: layout.saveButtonBounds,
      editorBounds: layout.editorBounds,
      lines: getLines(content),
      layout
    };
  }
};
