import type { PopupState } from "../types.js";

export function createPopup(id: string, title: string, message: string, buttonLabel = "Dismiss"): PopupState {
  return {
    id,
    title,
    message,
    buttonLabel,
    hijacksFocus: true
  };
}

