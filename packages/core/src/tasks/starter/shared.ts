import {
  addBrowserWindow,
  addMailWindow,
  addTerminalWindow,
  createEmptyEnv
} from "../../env/factory.js";

export function pickVariant(seed: number, values: string[]) {
  return values[Math.abs(seed) % values.length];
}

export function explorerBounds() {
  return { x: 92, y: 84, width: 340, height: 430 };
}

export function noteBoundsLeft() {
  return { x: 432, y: 84, width: 390, height: 470 };
}

export function noteBoundsRight() {
  return { x: 842, y: 84, width: 390, height: 470 };
}

export function noteBoundsCenter() {
  return { x: 452, y: 108, width: 460, height: 500 };
}

export function browserBounds() {
  return { x: 458, y: 84, width: 520, height: 360 };
}

export function terminalBounds() {
  return { x: 458, y: 462, width: 520, height: 250 };
}

export function mailBounds() {
  return { x: 992, y: 84, width: 240, height: 420 };
}

export function addStarterUbuntuCompanionApps(
  envState: ReturnType<typeof createEmptyEnv>,
  mode: "visible-browser" | "minimized"
) {
  let next = envState;
  if (mode === "visible-browser") {
    next = addBrowserWindow(next, "browser-main", browserBounds(), false, false);
    next = addTerminalWindow(next, "terminal-main", terminalBounds(), false, true);
    next = addMailWindow(next, "mail-main", mailBounds(), false, true);
    return next;
  }
  next = addBrowserWindow(next, "browser-main", browserBounds(), false, true);
  next = addTerminalWindow(next, "terminal-main", terminalBounds(), false, true);
  next = addMailWindow(next, "mail-main", mailBounds(), false, true);
  return next;
}
