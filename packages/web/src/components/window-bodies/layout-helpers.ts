import type { Rect } from "../../../../core/src/types.js";
import type { WindowBounds } from "./body-types.js";

export const WINDOW_TITLE_BAR_HEIGHT = 40;

export function toLocalRect(bounds: Rect, windowBounds: WindowBounds) {
  return {
    left: bounds.x - windowBounds.x,
    top: bounds.y - (windowBounds.y + WINDOW_TITLE_BAR_HEIGHT),
    width: bounds.width,
    height: bounds.height
  };
}

export function narrowWidth(width: number, threshold: number) {
  return width < threshold;
}
