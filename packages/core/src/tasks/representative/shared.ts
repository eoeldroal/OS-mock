import {
  addBrowserWindow,
  addMailWindow,
  addTerminalWindow,
  createEmptyEnv
} from "../../env/factory.js";

export function explorerBounds() {
  return { x: 92, y: 84, width: 340, height: 430 };
}

export function browserBounds() {
  return { x: 438, y: 84, width: 640, height: 380 };
}

export function terminalBounds() {
  return { x: 438, y: 482, width: 540, height: 250 };
}

export function mailBounds() {
  return { x: 952, y: 84, width: 280, height: 420 };
}

export function noteBoundsRight() {
  return { x: 968, y: 84, width: 300, height: 380 };
}

export function addRepresentativeUbuntuCompanionApps(
  envState: ReturnType<typeof createEmptyEnv>,
  mode: "browser" | "mail" | "terminal"
) {
  let next = envState;
  next = addBrowserWindow(next, "browser-main", browserBounds(), mode === "browser", mode !== "browser");
  next = addTerminalWindow(next, "terminal-main", terminalBounds(), mode === "terminal", mode !== "terminal");
  next = addMailWindow(next, "mail-main", mailBounds(), mode === "mail", mode !== "mail");
  return next;
}
