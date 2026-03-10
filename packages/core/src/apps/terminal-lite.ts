import type {
  A11yNode,
  AppPlugin,
  BuildContext,
  Rect,
  TerminalLiteState,
  TerminalLiteViewModel
} from "../types.js";

const HEADER_HEIGHT = 32;
const PADDING = 12;

export function getTerminalLiteLayout(bounds: Rect, state: TerminalLiteState) {
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
    terminalBounds,
    inputBounds,
    lineHeight
  };
}

export const terminalLitePlugin: AppPlugin<TerminalLiteState> = {
  id: "terminal-lite",
  title: "Terminal",
  create() {
    return {
      id: "terminal-1",
      cwd: "/workspace",
      prompt: "baghyeonbin@os-mock",
      lines: [],
      input: "",
      status: "idle",
      lastCommand: "",
      lastOutput: "",
      executedCommands: []
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
                bounds: {
                  x: nextLayout.terminalBounds.x + 12,
                  y: nextLayout.terminalBounds.y + 16 + index * nextLayout.lineHeight,
                  width: nextLayout.terminalBounds.width - 24,
                  height: nextLayout.lineHeight
                },
                visible: true,
                enabled: true,
                focusable: false,
                focused: false,
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
  buildViewModel(state): TerminalLiteViewModel {
    return {
      type: "terminal-lite",
      cwd: state.cwd,
      prompt: state.prompt,
      lines: state.lines,
      input: state.input,
      status: state.status
    };
  }
};
