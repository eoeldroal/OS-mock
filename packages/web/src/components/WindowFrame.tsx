import type { WindowViewModel } from "../../../core/src/types.js";
import { getAppMeta } from "../app-assets";
import { BrowserBody } from "./window-bodies/BrowserBody";
import { FileExplorerBody } from "./window-bodies/FileExplorerBody";
import { MailBody } from "./window-bodies/MailBody";
import { NoteEditorBody } from "./window-bodies/NoteEditorBody";
import { TerminalBody } from "./window-bodies/TerminalBody";
import { WINDOW_TITLE_BAR_HEIGHT } from "./window-bodies/layout-helpers.js";

function getChromeTheme(appId: string, focused: boolean) {
  if (appId === "terminal-lite") {
    return {
      background: focused ? "var(--shell-headerbar-dark-bg)" : "var(--shell-headerbar-dark-bg-unfocused)",
      color: "var(--shell-headerbar-dark-text)",
      border: focused ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(255,255,255,0.05)",
      contentBackground: "#221a29"
    };
  }

  if (appId === "browser-lite") {
    return {
      background: focused ? "var(--shell-headerbar-bg)" : "var(--shell-headerbar-bg-unfocused)",
      color: "var(--shell-headerbar-text)",
      border: focused ? "1px solid var(--shell-headerbar-border)" : "1px solid rgba(74,57,84,0.1)",
      contentBackground: "#fbfaf8"
    };
  }

  return {
    background: focused ? "var(--shell-headerbar-bg)" : "var(--shell-headerbar-bg-unfocused)",
    color: "var(--shell-headerbar-text)",
    border: focused ? "1px solid rgba(74,57,84,0.14)" : "1px solid rgba(74,57,84,0.09)",
    contentBackground: "#fbfaf8"
  };
}

function HeaderBarButtons({ maximized, dark }: { maximized: boolean; dark: boolean }) {
  const buttons = [
    {
      label: "Close window",
      background: dark ? "rgba(233,84,32,0.9)" : "#e95420",
      border: dark ? "rgba(255,255,255,0.08)" : "rgba(130,48,22,0.22)"
    },
    {
      label: "Minimize window",
      background: dark ? "rgba(248,202,86,0.88)" : "#f6c657",
      border: dark ? "rgba(255,255,255,0.08)" : "rgba(115,81,24,0.18)"
    },
    {
      label: maximized ? "Restore window" : "Maximize window",
      background: dark ? "rgba(117,198,87,0.9)" : "#69b85a",
      border: dark ? "rgba(255,255,255,0.08)" : "rgba(31,83,24,0.18)"
    }
  ];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {buttons.map((button) => (
        <button
          key={button.label}
          type="button"
          aria-label={button.label}
          title={button.label}
          style={{
            width: 17,
            height: 17,
            padding: 0,
            borderRadius: 999,
            border: `1px solid ${button.border}`,
            background: button.background,
            cursor: "pointer",
            boxShadow: dark
              ? "inset 0 1px 0 rgba(255,255,255,0.12)"
              : "inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -1px 0 rgba(0,0,0,0.08), 0 0.5px 0 rgba(255,255,255,0.2)"
          }}
        />
      ))}
    </div>
  );
}

function renderWindowBody(window: WindowViewModel) {
  if (window.appView.type === "file-explorer") {
    return <FileExplorerBody model={window.appView} windowBounds={window.bounds} focused={window.focused} />;
  }
  if (window.appView.type === "note-editor") {
    return <NoteEditorBody model={window.appView} windowBounds={window.bounds} focused={window.focused} />;
  }
  if (window.appView.type === "browser-lite") {
    return <BrowserBody model={window.appView} windowBounds={window.bounds} focused={window.focused} />;
  }
  if (window.appView.type === "terminal-lite") {
    return <TerminalBody model={window.appView} windowBounds={window.bounds} focused={window.focused} />;
  }
  return <MailBody model={window.appView} windowBounds={window.bounds} focused={window.focused} />;
}

export function WindowFrame({ window }: { window: WindowViewModel }) {
  if (window.minimized) {
    return null;
  }

  const meta = getAppMeta(window.appId);
  const chromeTheme = getChromeTheme(window.appId, window.focused);
  const darkChrome = window.appId === "terminal-lite";

  return (
    <div
      style={{
        position: "absolute",
        left: window.bounds.x,
        top: window.bounds.y,
        width: window.bounds.width,
        height: window.bounds.height,
        borderRadius: 13,
        overflow: "hidden",
        border: chromeTheme.border,
        background: chromeTheme.contentBackground,
        boxShadow: window.focused
          ? "var(--shell-window-shadow), 0 1px 0 rgba(255,255,255,0.36) inset"
          : "var(--shell-window-shadow-unfocused), 0 1px 0 rgba(255,255,255,0.16) inset",
        zIndex: window.zIndex + 10
      }}
    >
      <div
        style={{
          height: WINDOW_TITLE_BAR_HEIGHT,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 12px 0 10px",
          background: chromeTheme.background,
          color: chromeTheme.color,
          borderBottom: darkChrome ? "1px solid rgba(255,255,255,0.05)" : "1px solid rgba(48,40,51,0.07)",
          boxShadow: darkChrome
            ? "inset 0 1px 0 rgba(255,255,255,0.04)"
            : "inset 0 1px 0 rgba(255,255,255,0.58)"
        }}
      >
        <HeaderBarButtons maximized={window.maximized} dark={darkChrome} />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            minWidth: 0,
            flex: 1,
            justifyContent: "center",
            padding: "0 14px"
          }}
        >
          <img
            src={meta.icon}
            alt={meta.label}
            draggable={false}
            style={{
              width: 16,
              height: 16,
              objectFit: "contain",
              filter: darkChrome ? "drop-shadow(0 1px 2px rgba(0,0,0,0.3))" : "drop-shadow(0 1px 1px rgba(255,255,255,0.2))"
            }}
          />
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: 0.02,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              textShadow: darkChrome ? "none" : "0 1px 0 rgba(255,255,255,0.32)"
            }}
          >
            {window.title}
          </div>
        </div>
        <div style={{ width: 62 }} />
      </div>

      <div style={{ height: `calc(100% - ${WINDOW_TITLE_BAR_HEIGHT}px)`, background: chromeTheme.contentBackground }}>
        {renderWindowBody(window)}
      </div>
    </div>
  );
}
