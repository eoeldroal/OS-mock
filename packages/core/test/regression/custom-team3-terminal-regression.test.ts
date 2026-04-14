import { describe, expect, it } from "vitest";
import { MockOsEnv } from "../../src/env/session.js";
import { getFilesInDirectory, getNodePath } from "../../src/system/filesystem.js";
import type { A11yNode, TaskSpec } from "../../src/types.js";
import { TEAM3_TASKS, TEAM3_TERMINAL_TASKS } from "../../src/tasks/team3/index.js";

function flattenA11y(nodes: A11yNode[]): A11yNode[] {
  return nodes.flatMap((node) => [node, ...flattenA11y(node.children)]);
}

function isTaskSpec(value: unknown): value is TaskSpec {
  return Boolean(
    value &&
      typeof value === "object" &&
      "id" in value &&
      "setup" in value &&
      "domain" in value
  );
}

const TERMINAL_TEAM3_TASKS = TEAM3_TASKS
  .filter(isTaskSpec)
  .filter((task) => task.domain === "Terminal + Note Editor");

function getVisibleTerminalWindow(env: MockOsEnv) {
  return env
    .getHiddenState()
    .envState
    .windows
    .find((window) => window.appId === "terminal-lite" && !window.minimized);
}

function ensureVisibleTerminal(env: MockOsEnv) {
  let terminalWindow = getVisibleTerminalWindow(env);
  if (terminalWindow) {
    return terminalWindow;
  }

  const dockItem = env
    .getRenderModel()
    .taskbarItems
    .find((item) => item.appId === "terminal-lite" && item.pinned);

  expect(dockItem).toBeTruthy();

  env.step({
    type: "CLICK",
    x: dockItem!.bounds.x + Math.round(dockItem!.bounds.width / 2),
    y: dockItem!.bounds.y + Math.round(dockItem!.bounds.height / 2)
  });

  terminalWindow = getVisibleTerminalWindow(env);
  expect(terminalWindow).toBeTruthy();
  return terminalWindow!;
}

function focusTerminalSession(env: MockOsEnv) {
  const sessionNode = flattenA11y(env.observe().observation.a11yTree).find(
    (node) => node.role === "textbox" && node.name === "Terminal session"
  );

  expect(sessionNode).toBeTruthy();

  env.step({
    type: "CLICK",
    x: sessionNode!.bounds.x + 12,
    y: sessionNode!.bounds.y + 12
  });
}

describe("team3 terminal task regression coverage", () => {
  it("materializes every terminal task target note file in the authoritative filesystem tree", () => {
    const failures: Array<Record<string, unknown>> = [];

    for (const task of TERMINAL_TEAM3_TASKS) {
      const env = new MockOsEnv();
      env.reset({ taskId: task.id, seed: 0, maxSteps: 0 });

      const hidden = env.getHiddenState();
      const { fileSystem } = hidden.envState;
      const targetFileId = hidden.targets.targetFileId;
      const targetNode = fileSystem.nodes[targetFileId];
      const targetEntry = fileSystem.files[targetFileId];
      const parentPath = targetNode?.parentId ? getNodePath(fileSystem, targetNode.parentId) : undefined;
      const listedInParent = parentPath
        ? getFilesInDirectory(fileSystem, parentPath).some((entry) => entry.id === targetFileId)
        : false;

      if (
        !targetNode ||
        targetNode.kind !== "file" ||
        !targetNode.parentId ||
        !targetEntry ||
        !parentPath ||
        getNodePath(fileSystem, targetFileId) !== targetEntry.path ||
        !listedInParent
      ) {
        failures.push({
          taskId: task.id,
          targetFileId,
          hasNode: Boolean(targetNode),
          nodeKind: targetNode?.kind,
          hasParent: Boolean(targetNode?.parentId),
          hasLegacyEntry: Boolean(targetEntry),
          authoritativePath: targetNode ? getNodePath(fileSystem, targetFileId) : undefined,
          legacyPath: targetEntry?.path,
          listedInParent
        });
      }
    }

    expect(failures).toEqual([]);
  });

  it("runs each terminal task through a visible terminal window that is wired to the task state", () => {
    const failures: Array<Record<string, unknown>> = [];

    for (const task of TEAM3_TERMINAL_TASKS) {
      const env = new MockOsEnv();
      env.reset({ taskId: task.id, seed: 0, maxSteps: 0 });

      const expectedCommand = env.getHiddenState().targets.targetCommand;
      const expectedOutput = env.getHiddenState().targets.targetCommandOutput;

      const terminalWindow = ensureVisibleTerminal(env);
      const visibleTerminalBefore = env.getHiddenState().envState.appStates.terminalLite[terminalWindow.id];

      focusTerminalSession(env);
      env.step({ type: "TYPING", text: expectedCommand });
      const execute = env.step({ type: "PRESS", key: "enter" });

      const hidden = env.getHiddenState();
      const visibleTerminalAfter = hidden.envState.appStates.terminalLite[terminalWindow.id];
      const sessionNode = flattenA11y(env.observe().observation.a11yTree).find(
        (node) => node.role === "textbox" && node.name === "Terminal session"
      );

      if (
        !visibleTerminalBefore ||
        !visibleTerminalAfter ||
        !sessionNode ||
        visibleTerminalAfter.lastCommand !== expectedCommand ||
        visibleTerminalAfter.lastOutput !== expectedOutput ||
        !execute.info.lastProgress.includes("terminal.command_ran")
      ) {
        failures.push({
          taskId: task.id,
          windowId: terminalWindow.id,
          visibleCwdBefore: visibleTerminalBefore?.cwd,
          visibleCwdAfter: visibleTerminalAfter?.cwd,
          expectedCommand,
          actualCommand: visibleTerminalAfter?.lastCommand,
          expectedOutput,
          actualOutput: visibleTerminalAfter?.lastOutput,
          progress: execute.info.lastProgress,
          actionAccepted: execute.actionAccepted,
          hasTerminalSessionNode: Boolean(sessionNode)
        });
      }
    }

    expect(failures).toEqual([]);
  });
});
