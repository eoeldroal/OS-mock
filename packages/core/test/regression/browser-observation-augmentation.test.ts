import { describe, expect, it } from "vitest";
import {
  createBrowserContentReplacementAugmentation,
  withBrowserAugmentations
} from "../../src/observation/index.js";
import { MockOsEnv } from "../../src/env/session.js";
import type { A11yNode, Observation } from "../../src/types.js";

function flattenA11y(nodes: A11yNode[]): A11yNode[] {
  return nodes.flatMap((node) => [node, ...flattenA11y(node.children)]);
}

function findNode(nodes: A11yNode[], predicate: (node: A11yNode) => boolean) {
  return flattenA11y(nodes).find(predicate);
}

function getBrowserObservation(taskId = "browser_log_task_preopen_note_hard") {
  const env = new MockOsEnv();
  env.reset({ taskId, seed: 0, maxSteps: 0 });
  return env.observe().observation;
}

function clickNode(env: MockOsEnv, node: A11yNode) {
  return env.step({
    type: "CLICK",
    x: node.bounds.x + Math.max(8, Math.round(node.bounds.width / 2)),
    y: node.bounds.y + Math.max(8, Math.round(node.bounds.height / 2))
  });
}

describe("browser observation augmentation regression coverage", () => {
  it("always exposes browserAugmentations on core observations, even before host decoration", () => {
    const env = new MockOsEnv();
    env.reset({ taskId: "browser_help_preopen_note_distractors", seed: 0, maxSteps: 0 });

    const initialObservation = env.observe().observation;
    const afterStepObservation = env.step({ type: "WAIT" }).observation;

    expect(initialObservation).toHaveProperty("browserAugmentations");
    expect(afterStepObservation).toHaveProperty("browserAugmentations");
    expect(initialObservation.browserAugmentations).toEqual([]);
    expect(afterStepObservation.browserAugmentations).toEqual([]);
  });

  it("preserves core synthetic browser chrome nodes when browser content is augmented", () => {
    const env = new MockOsEnv();
    env.reset({ taskId: "browser_log_task_preopen_note_hard", seed: 0, maxSteps: 0 });
    const initialObservation = env.observe().observation;
    const osworldTab = findNode(initialObservation.a11yTree, (node) => node.name === "Task Board");

    expect(osworldTab).toBeTruthy();
    clickNode(env, osworldTab!);

    const baseObservation = env.observe().observation;
    const baseNodes = flattenA11y(baseObservation.a11yTree);
    const browserWindow = findNode(baseObservation.a11yTree, (node) => node.id === "browser-main-window");
    const explorerTasks = findNode(baseObservation.a11yTree, (node) => node.id === "browser-main-tasks");
    const addressBar = findNode(baseObservation.a11yTree, (node) => node.id === "browser-main-address");
    const bookmarks = findNode(baseObservation.a11yTree, (node) => node.id === "browser-main-bookmarks");
    const closeButton = findNode(baseObservation.a11yTree, (node) => node.id === "browser-main-close");
    const desktopRoot = findNode(baseObservation.a11yTree, (node) => node.id === "desktop");

    expect(browserWindow).toBeTruthy();
    expect(explorerTasks).toBeTruthy();
    expect(addressBar).toBeTruthy();
    expect(bookmarks).toBeTruthy();
    expect(closeButton).toBeTruthy();
    expect(desktopRoot).toBeTruthy();

    const augmented: Observation = withBrowserAugmentations(baseObservation, [
      createBrowserContentReplacementAugmentation({
        windowId: "browser-main",
        source: "hybrid-dom",
        contentBounds: explorerTasks!.bounds,
        nodes: [
          {
            id: "browser-main-hybrid-content",
            role: "label",
            name: "Hybrid browser content",
            text: "Injected DOM snapshot",
            bounds: {
              x: explorerTasks!.bounds.x + 8,
              y: explorerTasks!.bounds.y + 8,
              width: Math.max(40, explorerTasks!.bounds.width - 16),
              height: 24
            },
            visible: true,
            enabled: true,
            focusable: false,
            focused: false,
            children: []
          }
        ]
      })
    ]);

    const augmentedNodes = flattenA11y(augmented.a11yTree);

    expect(augmented.browserAugmentations).toHaveLength(1);
    expect(augmented.browserAugmentations[0]).toMatchObject({
      windowId: "browser-main",
      source: "hybrid-dom",
      strategy: "replace-content"
    });
    expect(augmentedNodes.find((node) => node.id === "browser-main-hybrid-content")).toBeTruthy();
    expect(augmentedNodes.find((node) => node.id === "desktop")).toBeTruthy();
    expect(augmentedNodes.find((node) => node.id === "browser-main-window")).toBeTruthy();
    expect(augmentedNodes.find((node) => node.id === "browser-main-close")).toBeTruthy();
    expect(augmentedNodes.find((node) => node.id === "browser-main-address")).toBeTruthy();
    expect(augmentedNodes.find((node) => node.id === "browser-main-bookmarks")).toBeTruthy();
    expect(augmentedNodes.find((node) => node.id === "browser-main-tasks")).toBeFalsy();
    expect(baseNodes.find((node) => node.id === "browser-main-tasks")).toBeTruthy();
  });
});
