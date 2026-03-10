import browserIcon from "./assets/icon-browser.svg";
import browserPageScreenshot from "./assets/osworld-explorer-page.png";
import filesIcon from "./assets/icon-files.svg";
import mailIcon from "./assets/icon-mail.svg";
import terminalIcon from "./assets/icon-terminal.svg";
import textEditorIcon from "./assets/icon-text-editor.svg";
import ubuntuWallpaper from "./assets/ubuntu-wallpaper-dark.png";

const APP_META: Record<string, { label: string; icon: string; accent: string }> = {
  "file-explorer": {
    label: "Files",
    icon: filesIcon,
    accent: "#f4a259"
  },
  "note-editor": {
    label: "Text Editor",
    icon: textEditorIcon,
    accent: "#58a6ff"
  },
  "browser-lite": {
    label: "Firefox",
    icon: browserIcon,
    accent: "#ff8f3d"
  },
  "terminal-lite": {
    label: "Terminal",
    icon: terminalIcon,
    accent: "#f97316"
  },
  "mail-lite": {
    label: "Thunderbird",
    icon: mailIcon,
    accent: "#5fa8ff"
  }
};

export function getAppMeta(appId: string) {
  return APP_META[appId] ?? {
    label: "Application",
    icon: textEditorIcon,
    accent: "#94a3b8"
  };
}

export { browserPageScreenshot, ubuntuWallpaper };
