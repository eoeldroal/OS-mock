import browserIcon from "./assets/icon-browser.svg";
import filesIcon from "./assets/icon-files.svg";
import mailIcon from "./assets/icon-mail.svg";
import terminalIcon from "./assets/icon-terminal.svg";
import textEditorIcon from "./assets/icon-text-editor.svg";
import ubuntuWallpaper from "./assets/ubuntu-wallpaper-dark.png";

const APP_META: Record<string, { label: string; icon: string; accent: string }> = {
  "file-explorer": {
    label: "Files",
    icon: filesIcon,
    accent: "#f6a15f"
  },
  "note-editor": {
    label: "Text Editor",
    icon: textEditorIcon,
    accent: "#62a8ff"
  },
  "browser-lite": {
    label: "Firefox",
    icon: browserIcon,
    accent: "#f08b61"
  },
  "terminal-lite": {
    label: "Terminal",
    icon: terminalIcon,
    accent: "#8ecb63"
  },
  "mail-lite": {
    label: "Thunderbird",
    icon: mailIcon,
    accent: "#79adff"
  }
};

export function getAppMeta(appId: string) {
  return APP_META[appId] ?? {
    label: "Application",
    icon: textEditorIcon,
    accent: "#94a3b8"
  };
}

export { ubuntuWallpaper };
