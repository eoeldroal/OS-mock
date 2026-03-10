import type { Computer13ActionType } from "./types.js";

export const COMPUTER_13_ACTION_TYPES: Computer13ActionType[] = [
  "MOVE_TO",
  "CLICK",
  "MOUSE_DOWN",
  "MOUSE_UP",
  "RIGHT_CLICK",
  "DOUBLE_CLICK",
  "DRAG_TO",
  "SCROLL",
  "TYPING",
  "PRESS",
  "KEY_DOWN",
  "KEY_UP",
  "HOTKEY",
  "WAIT",
  "FAIL",
  "DONE"
];

export const COMPUTER_13_KEYS = [
  "enter",
  "escape",
  "backspace",
  "tab",
  "f2",
  "ctrl",
  "shift",
  "alt",
  "meta",
  "s",
  "c",
  "v",
  "a"
];

export const COMPUTER_13_SCHEMA = {
  viewport: { width: 1280, height: 800 },
  actionTypes: COMPUTER_13_ACTION_TYPES,
  keys: COMPUTER_13_KEYS
};

