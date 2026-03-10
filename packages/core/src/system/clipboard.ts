import type { ClipboardState } from "../types.js";

export function setClipboardText(clipboard: ClipboardState, text: string): ClipboardState {
  return { text };
}

