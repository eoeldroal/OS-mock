import { describe, expect, it } from "vitest";
import {
  createBrowserContentReplacementAugmentation,
  createObservation,
  finalizeObservation,
  withBrowserAugmentations
} from "../../src/observation/index.js";
import type { A11yNode, Observation, Rect } from "../../src/types.js";

function flatten(nodes: A11yNode[]): A11yNode[] {
  return nodes.flatMap((node) => [node, ...flatten(node.children)]);
}

function createNode(
  id: string,
  bounds: Rect,
  children: A11yNode[] = [],
  overrides: Partial<A11yNode> = {}
): A11yNode {
  return {
    id,
    role: "label",
    name: id,
    bounds,
    visible: true,
    enabled: true,
    focusable: false,
    focused: false,
    children,
    ...overrides
  };
}

describe("observation contract regression coverage", () => {
  it("normalizes the canonical observation shape before augmentation is applied", () => {
    const observation = createObservation({
      viewport: { width: 1280, height: 800 },
      pointer: { x: 10, y: 20 },
      focusedWindowId: "browser-main",
      a11yTree: [createNode("desktop", { x: 0, y: 0, width: 1280, height: 800 })]
    });

    expect(observation.browserAugmentations).toEqual([]);
    expect(observation.a11yTree).toHaveLength(1);
    expect(observation.focusedWindowId).toBe("browser-main");
  });

  it("applies browser augmentations in a window-scoped, idempotent way", () => {
    const browserContentBounds = { x: 160, y: 120, width: 480, height: 320 };
    const browserWindow = createNode(
      "browser-main-window",
      { x: 120, y: 80, width: 560, height: 420 },
      [
        createNode("browser-main-address", { x: 140, y: 96, width: 360, height: 28 }),
        createNode("browser-main-content", browserContentBounds)
      ],
      { role: "window", focusable: true }
    );
    const noteWindow = createNode(
      "note-main-window",
      { x: 760, y: 120, width: 320, height: 260 },
      [createNode("note-main-editor", { x: 780, y: 148, width: 280, height: 200 })],
      { role: "window", focusable: true }
    );
    const baseObservation: Observation = createObservation({
      viewport: { width: 1280, height: 800 },
      pointer: { x: 0, y: 0 },
      a11yTree: [
        createNode(
          "desktop",
          { x: 0, y: 0, width: 1280, height: 800 },
          [browserWindow, noteWindow],
          { role: "desktop" }
        )
      ]
    });

    const augmentation = createBrowserContentReplacementAugmentation({
      windowId: "browser-main",
      source: "hybrid-dom",
      contentBounds: browserContentBounds,
      nodes: [
        createNode("browser-main-hybrid-heading", { x: 176, y: 136, width: 220, height: 24 }),
        createNode("browser-main-hybrid-link", { x: 176, y: 172, width: 160, height: 20 }, [], {
          role: "button",
          focusable: true
        })
      ]
    });

    const once = withBrowserAugmentations(baseObservation, [augmentation]);
    const twice = finalizeObservation(once);
    const onceIds = flatten(once.a11yTree).map((node) => node.id);
    const twiceIds = flatten(twice.a11yTree).map((node) => node.id);

    expect(once.browserAugmentations).toHaveLength(1);
    expect(onceIds).toContain("browser-main-address");
    expect(onceIds).toContain("browser-main-hybrid-heading");
    expect(onceIds).toContain("browser-main-hybrid-link");
    expect(onceIds).not.toContain("browser-main-content");
    expect(onceIds).toContain("note-main-editor");
    expect(twiceIds).toEqual(onceIds);
  });
});
