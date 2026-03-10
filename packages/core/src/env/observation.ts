import {
  browserLitePlugin,
  fileExplorerPlugin,
  mailLitePlugin,
  noteEditorPlugin,
  terminalLitePlugin
} from "../apps/index.js";
import type { A11yNode, EnvState, Observation, RenderModel, TaskSpec, WindowViewModel } from "../types.js";
import { getPopupBounds, getTaskbarItems, getWindowFrameControls } from "../system/window-manager.js";

function buildPopupA11y(state: EnvState): A11yNode[] {
  return state.popups.map((popup) => {
    const bounds = getPopupBounds(state.viewport);
    return {
      id: popup.id,
      role: "dialog",
      name: popup.title,
      text: popup.message,
      bounds,
      visible: true,
      enabled: true,
      focusable: true,
      focused: true,
      children: [
        {
          id: `${popup.id}-dismiss`,
          role: "button",
          name: popup.buttonLabel,
          bounds: {
            x: bounds.x + bounds.width - 120,
            y: bounds.y + bounds.height - 52,
            width: 96,
            height: 32
          },
          visible: true,
          enabled: true,
          focusable: true,
          focused: false,
          children: []
        }
      ]
    };
  });
}

export function buildRenderModel(state: EnvState, stepIndex: number): RenderModel {
  const windows: WindowViewModel[] = state.windows
    .map((window) => {
      const controls = getWindowFrameControls(window.bounds);
      if (window.appId === "file-explorer") {
        return {
          ...window,
          ...controls,
          appView: fileExplorerPlugin.buildViewModel(state.appStates.fileExplorer[window.id], {
            envState: state,
            window
          })
        };
      }

      if (window.appId === "browser-lite") {
        return {
          ...window,
          ...controls,
          appView: browserLitePlugin.buildViewModel(state.appStates.browserLite[window.id], {
            envState: state,
            window
          })
        };
      }

      if (window.appId === "terminal-lite") {
        return {
          ...window,
          ...controls,
          appView: terminalLitePlugin.buildViewModel(state.appStates.terminalLite[window.id], {
            envState: state,
            window
          })
        };
      }

      if (window.appId === "mail-lite") {
        return {
          ...window,
          ...controls,
          appView: mailLitePlugin.buildViewModel(state.appStates.mailLite[window.id], {
            envState: state,
            window
          })
        };
      }

      return {
        ...window,
        ...controls,
        appView: noteEditorPlugin.buildViewModel(state.appStates.noteEditor[window.id], {
          envState: state,
          window
        })
      };
    })
    .sort((left, right) => left.zIndex - right.zIndex);

  return {
    viewport: state.viewport,
    desktopTitle: "Ubuntu Desktop",
    shellName: "Ubuntu 24.04 LTS",
    topBarTitle: "Activities",
    topBarClock: "Mon 11:24",
    windows,
    popups: state.popups.map((popup) => ({
      id: popup.id,
      title: popup.title,
      message: popup.message,
      buttonLabel: popup.buttonLabel,
      bounds: getPopupBounds(state.viewport)
    })),
    taskbarItems: getTaskbarItems(state),
    pointer: state.pointer,
    focusedWindowId:
      state.popups[state.popups.length - 1]?.id ?? state.windows.find((window) => window.focused)?.id,
    instruction: state.instruction,
    stepIndex
  };
}

export function buildA11yTree(state: EnvState): A11yNode[] {
  const windowNodes = state.windows.flatMap((window) => {
    const controls = getWindowFrameControls(window.bounds);
    const controlNodes: A11yNode[] = [
      {
        id: `${window.id}-close`,
        role: "button",
        name: "Close window",
        bounds: controls.closeButtonBounds,
        visible: !window.minimized,
        enabled: true,
        focusable: true,
        focused: false,
        children: []
      },
      {
        id: `${window.id}-minimize`,
        role: "button",
        name: "Minimize window",
        bounds: controls.minimizeButtonBounds,
        visible: !window.minimized,
        enabled: true,
        focusable: true,
        focused: false,
        children: []
      },
      {
        id: `${window.id}-maximize`,
        role: "button",
        name: window.maximized ? "Restore window" : "Maximize window",
        bounds: controls.maximizeButtonBounds,
        visible: !window.minimized,
        enabled: true,
        focusable: true,
        focused: false,
        children: []
      }
    ];

    function attachControls(nodes: A11yNode[]) {
      return nodes.map((node) =>
        node.role === "window"
          ? {
              ...node,
              children: [...controlNodes, ...node.children]
            }
          : node
      );
    }

    if (window.appId === "file-explorer") {
      return attachControls(fileExplorerPlugin.buildA11y(state.appStates.fileExplorer[window.id], {
        envState: state,
        window
      }));
    }

    if (window.appId === "browser-lite") {
      return attachControls(browserLitePlugin.buildA11y(state.appStates.browserLite[window.id], {
        envState: state,
        window
      }));
    }

    if (window.appId === "terminal-lite") {
      return attachControls(terminalLitePlugin.buildA11y(state.appStates.terminalLite[window.id], {
        envState: state,
        window
      }));
    }

    if (window.appId === "mail-lite") {
      return attachControls(mailLitePlugin.buildA11y(state.appStates.mailLite[window.id], {
        envState: state,
        window
      }));
    }

    return attachControls(noteEditorPlugin.buildA11y(state.appStates.noteEditor[window.id], {
      envState: state,
      window
    }));
  });

  const topBarNode: A11yNode = {
    id: "topbar",
    role: "menu",
    name: "Top bar",
    bounds: {
      x: 0,
      y: 0,
      width: state.viewport.width,
      height: 32
    },
    visible: true,
    enabled: true,
    focusable: false,
    focused: false,
    children: [
      {
        id: "topbar-activities",
        role: "menuitem",
        name: "Activities",
        bounds: {
          x: 18,
          y: 6,
          width: 92,
          height: 20
        },
        visible: true,
        enabled: true,
        focusable: true,
        focused: false,
        children: []
      }
    ]
  };

  const taskbarNode: A11yNode = {
    id: "dock",
    role: "menu",
    name: "Ubuntu Dock",
    bounds: {
      x: 0,
      y: 64,
      width: 76,
      height: state.viewport.height - 88
    },
    visible: true,
    enabled: true,
    focusable: false,
    focused: false,
    children: getTaskbarItems(state).map((item) => ({
      id: `taskbar-${item.windowId}`,
      role: "icon",
      name: item.title,
      bounds: item.bounds,
      visible: true,
      enabled: true,
      focusable: true,
      focused: false,
      children: []
    }))
  };

  return [
    {
      id: "desktop",
      role: "desktop",
      name: "OS Mock Desktop",
      bounds: {
        x: 0,
        y: 0,
        width: state.viewport.width,
        height: state.viewport.height
      },
      visible: true,
      enabled: true,
      focusable: false,
      focused: false,
      children: [topBarNode, taskbarNode, ...windowNodes, ...buildPopupA11y(state)]
    }
  ];
}

export function buildObservation(
  state: EnvState,
  stepIndex: number,
  task?: TaskSpec,
  extras?: { screenshotPath?: string; viewerUrl?: string }
): Observation {
  return {
    viewport: state.viewport,
    screenshotPath: extras?.screenshotPath,
    viewerUrl: extras?.viewerUrl,
    pointer: { x: state.pointer.x, y: state.pointer.y },
    focusedWindowId:
      state.popups[state.popups.length - 1]?.id ?? state.windows.find((window) => window.focused)?.id,
    a11yTree: buildA11yTree(state)
  };
}
