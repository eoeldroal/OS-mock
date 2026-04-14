import { produce } from "immer";
import type {
  A11yNode,
  AppActionResult,
  AppPlugin,
  BuildContext,
  Computer13Action,
  EnvState,
  Point,
  Rect,
  TerminalLiteState,
  TerminalLiteViewModel,
  WindowInstance
} from "../types.js";
import { pointInRect } from "../system/pointer.js";
import { setClipboardText } from "../system/clipboard.js";

const HEADER_HEIGHT = 32;
const PADDING = 12;

export function getTerminalLiteLayout(bounds: Rect, state: TerminalLiteState) {
  const headerBounds = {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: HEADER_HEIGHT
  };

  const terminalBounds = {
    x: bounds.x + PADDING,
    y: bounds.y + HEADER_HEIGHT + 10,
    width: bounds.width - PADDING * 2,
    height: bounds.height - HEADER_HEIGHT - 20
  };

  const lineHeight = 22;
  const inputBounds = {
    x: terminalBounds.x + 12,
    y: terminalBounds.y + 16 + state.lines.length * lineHeight,
    width: terminalBounds.width - 24,
    height: 24
  };

  return {
    headerBounds,
    terminalBounds,
    inputBounds,
    lineRects: state.lines.map((_, index) => ({
      x: terminalBounds.x + 12,
      y: terminalBounds.y + 16 + index * lineHeight,
      width: terminalBounds.width - 24,
      height: lineHeight
    }))
  };
}

export function handleTerminalAction(
  state: EnvState,
  window: WindowInstance,
  terminal: TerminalLiteState,
  action: Computer13Action,
  point: Point
): AppActionResult | null {
  if (action.type === "CLICK") {
    const layout = getTerminalLiteLayout(window.bounds, terminal);
    const clickedLineIndex = layout.lineRects.findIndex((rect) => pointInRect(point, rect));
    if (clickedLineIndex >= 0) {
      const next = produce(state, (draft) => {
        draft.appStates.terminalLite[window.id].selectedLineIndex = clickedLineIndex;
      });
      return { appState: next.appStates.terminalLite[window.id], envState: next, accepted: true };
    }

    // Clicking anywhere in the terminal content area (including empty space
    // below lines / input) focuses the input — just like a real terminal.
    if (pointInRect(point, layout.inputBounds) || pointInRect(point, layout.terminalBounds)) {
      if (terminal.selectedLineIndex === undefined) {
        return { appState: terminal, envState: state, accepted: true };
      }
      const next = produce(state, (draft) => {
        draft.appStates.terminalLite[window.id].selectedLineIndex = undefined;
      });
      return { appState: next.appStates.terminalLite[window.id], envState: next, accepted: true };
    }
    // Click on empty area in terminal: accept as focus click
    return { appState: terminal, envState: state, accepted: true };
  }

  if (action.type === "TYPING") {
    const next = produce(state, (draft) => {
      const nextTerminal = draft.appStates.terminalLite[window.id];
      nextTerminal.input = `${nextTerminal.input}${action.text.replace(/\r?\n/g, "")}`;
      nextTerminal.selectedLineIndex = undefined;
      nextTerminal.status = nextTerminal.input ? "editing" : "idle";
    });
    return { appState: next.appStates.terminalLite[window.id], envState: next, accepted: true };
  }

  if (action.type === "PRESS") {
    const lower = action.key.toLowerCase();
    let handled = false;

    // Arrow Up: Navigate backward through command history
    if (lower === "arrowup") {
      if (terminal.executedCommands.length === 0) {
        return { appState: terminal, accepted: false };
      }
      const newIndex = Math.min(
        (terminal.historyIndex ?? -1) + 1,
        terminal.executedCommands.length - 1
      );
      const cmd = terminal.executedCommands[terminal.executedCommands.length - 1 - newIndex];
      const next = produce(state, draft => {
        const t = draft.appStates.terminalLite[window.id];
        t.historyIndex = newIndex;
        t.input = cmd;
      });
      return { appState: next.appStates.terminalLite[window.id], envState: next, accepted: true };
    }

    // Arrow Down: Navigate forward through command history
    if (lower === "arrowdown") {
      const currentIndex = terminal.historyIndex ?? -1;
      if (currentIndex <= 0) {
        // Back to empty input
        const next = produce(state, draft => {
          const t = draft.appStates.terminalLite[window.id];
          t.historyIndex = -1;
          t.input = "";
        });
        return { appState: next.appStates.terminalLite[window.id], envState: next, accepted: true };
      }
      const newIndex = currentIndex - 1;
      const cmd = terminal.executedCommands[terminal.executedCommands.length - 1 - newIndex];
      const next = produce(state, draft => {
        const t = draft.appStates.terminalLite[window.id];
        t.historyIndex = newIndex;
        t.input = cmd;
      });
      return { appState: next.appStates.terminalLite[window.id], envState: next, accepted: true };
    }

    const next = produce(state, (draft) => {
      const nextTerminal = draft.appStates.terminalLite[window.id];

      if (lower === "backspace") {
        nextTerminal.input = nextTerminal.input.slice(0, -1);
        nextTerminal.selectedLineIndex = undefined;
        nextTerminal.status = nextTerminal.input ? "editing" : "idle";
        handled = true;
      } else if (lower === "escape") {
        if (nextTerminal.selectedLineIndex !== undefined) {
          nextTerminal.selectedLineIndex = undefined;
          handled = true;
        } else {
          nextTerminal.input = "";
          nextTerminal.status = "idle";
          handled = true;
        }
      } else if (lower === "enter") {
        handled = true;
      }
    });

    if (handled) {
      return { appState: next.appStates.terminalLite[window.id], envState: next, accepted: true };
    }
    return null;
  }

  if (action.type === "HOTKEY") {
    const normalized = action.keys.map((key) => key.toLowerCase()).sort();
    if (normalized.includes("ctrl") && normalized.includes("c")) {
      if (!terminal.lines[terminal.selectedLineIndex ?? -1]) {
        return null;
      }
      const next = produce(state, (draft) => {
        const nextTerminal = draft.appStates.terminalLite[window.id];
        const selectedLine = nextTerminal.lines[nextTerminal.selectedLineIndex ?? -1];
        draft.clipboard = setClipboardText(draft.clipboard, selectedLine);
      });
      return { appState: next.appStates.terminalLite[window.id], envState: next, accepted: true };
    }
  }

  if (action.type === "SCROLL") {
    const direction = action.dy > 0 ? 1 : action.dy < 0 ? -1 : 0;
    if (direction === 0) {
      return null;
    }

    if (terminal.lines.length === 0) {
      return null;
    }

    const next = produce(state, (draft) => {
      const nextTerminal = draft.appStates.terminalLite[window.id];
      const current = nextTerminal.selectedLineIndex ?? 0;
      const newIndex = Math.max(0, Math.min(nextTerminal.lines.length - 1, current + direction));
      nextTerminal.selectedLineIndex = newIndex;
    });
    return { appState: next.appStates.terminalLite[window.id], envState: next, accepted: true };
  }

  return null;
}

export const terminalLitePlugin: AppPlugin<TerminalLiteState> = {
  id: "terminal-lite",
  title: "Terminal",
  create() {
    return {
      id: "terminal-1",
      cwd: "/workspace",
      prompt: "baghyeonbin@ubuntu",
      lines: [],
      input: "",
      status: "idle",
      lastCommand: "",
      lastOutput: "",
      executedCommands: [],
      historyIndex: -1,
      selectedLineIndex: undefined
    };
  },
  reduce(state) {
    return state;
  },
  buildA11y(state, ctx: BuildContext) {
    const nextLayout = getTerminalLiteLayout(ctx.window.bounds, state);
    const currentPrompt = `${state.prompt}:~${state.cwd}$ ${state.input}`;
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
            id: `${ctx.window.id}-terminal`,
            role: "textbox",
            name: "Terminal session",
            text: [...state.lines, currentPrompt].join("\n"),
            bounds: nextLayout.terminalBounds,
            visible: true,
            enabled: true,
            focusable: true,
            focused: ctx.window.focused,
            children: [
              ...state.lines.map((line, index) => ({
                id: `${ctx.window.id}-line-${index}`,
                role: "label" as const,
                name: `Terminal line ${index + 1}`,
                text: line,
                bounds: nextLayout.lineRects[index],
                visible: true,
                enabled: true,
                focusable: true,
                focused: state.selectedLineIndex === index,
                children: []
              })),
              {
                id: `${ctx.window.id}-input`,
                role: "label",
                name: "Terminal prompt",
                text: currentPrompt,
                bounds: nextLayout.inputBounds,
                visible: true,
                enabled: true,
                focusable: false,
                focused: false,
                children: []
              }
            ]
          }
        ]
      }
    ];
  },
  buildViewModel(state, ctx: BuildContext): TerminalLiteViewModel {
    const layout = getTerminalLiteLayout(ctx.window.bounds, state);
    return {
      type: "terminal-lite",
      cwd: state.cwd,
      prompt: state.prompt,
      lines: state.lines,
      input: state.input,
      status: state.status,
      selectedLineIndex: state.selectedLineIndex,
      layout
    };
  }
};
