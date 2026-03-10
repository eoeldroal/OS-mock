import type {
  A11yNode,
  AppPlugin,
  BuildContext,
  NoteEditorState,
  NoteEditorViewModel,
  Rect
} from "../types.js";

const HEADER_HEIGHT = 40;
const TOOLBAR_HEIGHT = 52;
const PADDING = 16;
const GUTTER_WIDTH = 56;
const EDITOR_INNER_PADDING = 18;
export const NOTE_LINE_HEIGHT = 26;
export const NOTE_CHAR_WIDTH = 9;

export function getNoteEditorLayout(bounds: Rect) {
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

  const editorBounds = {
    x: editorFrameBounds.x + GUTTER_WIDTH + EDITOR_INNER_PADDING,
    y: editorFrameBounds.y + EDITOR_INNER_PADDING,
    width: editorFrameBounds.width - GUTTER_WIDTH - EDITOR_INNER_PADDING * 2,
    height: editorFrameBounds.height - EDITOR_INNER_PADDING * 2
  };

  return {
    toolbarBounds,
    saveButtonBounds,
    editorFrameBounds,
    editorBounds
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

export const noteEditorPlugin: AppPlugin<NoteEditorState> = {
  id: "note-editor",
  title: "Note Editor",
  create() {
    return {
      id: "notes-1",
      fileId: "",
      buffer: "",
      cursorIndex: 0,
      dirty: false
    };
  },
  reduce(state) {
    return state;
  },
  buildA11y(state, ctx: BuildContext) {
    const file = ctx.envState.fileSystem.files[state.fileId];
    const content = state.buffer;
    const lines = getLines(content);
    const layout = getNoteEditorLayout(ctx.window.bounds);

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
    const file = ctx.envState.fileSystem.files[state.fileId];
    const content = state.buffer;
    const layout = getNoteEditorLayout(ctx.window.bounds);
    return {
      type: "note-editor",
      fileName: file?.name ?? "Untitled",
      content,
      cursorIndex: state.cursorIndex,
      selectedLineIndex: state.selectedLineIndex,
      dirty: state.dirty,
      saveButtonBounds: layout.saveButtonBounds,
      editorBounds: layout.editorBounds,
      lines: getLines(content)
    };
  }
};
