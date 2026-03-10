import type { Point, Viewport } from "../types.js";

export function clipPoint(point: Point, viewport: Viewport): Point {
  return {
    x: Math.max(0, Math.min(viewport.width - 1, Math.round(point.x))),
    y: Math.max(0, Math.min(viewport.height - 1, Math.round(point.y)))
  };
}

export function pointInRect(point: Point, rect: { x: number; y: number; width: number; height: number }) {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

