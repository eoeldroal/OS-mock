import { describe, expect, it } from "vitest";
import { MockOsEnv } from "../../src/env/session.js";
import { listTaskAuthoringMetadata } from "../../src/tasks/registry.js";
import { getNodePath } from "../../src/system/filesystem.js";
import type { A11yNode, TaskSpec } from "../../src/types.js";
import { TEAM3_MAIL_TASKS, TEAM3_TASKS } from "../../src/tasks/team3/index.js";

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

const MAIL_TEAM3_TASKS = TEAM3_TASKS
  .filter(isTaskSpec)
  .filter((task) => task.domain === "Thunderbird + Note Editor");

function getVisibleMailWindow(env: MockOsEnv) {
  return env
    .getHiddenState()
    .envState
    .windows
    .find((window) => window.appId === "mail-lite" && !window.minimized);
}

function clickNode(env: MockOsEnv, node: A11yNode) {
  return env.step({
    type: "CLICK",
    x: node.bounds.x + Math.max(8, Math.round(node.bounds.width / 2)),
    y: node.bounds.y + Math.max(8, Math.round(node.bounds.height / 2))
  });
}

describe("team3 mail task regression coverage", () => {
  it("keeps the modular team3 mail catalog aligned with registry metadata", () => {
    const team3Ids = MAIL_TEAM3_TASKS.map((task) => task.id).sort();
    const modularIds = TEAM3_MAIL_TASKS.map((task) => task.id).sort();
    const authoringMetadata = listTaskAuthoringMetadata("all")
      .filter((task) => task.domain === "Thunderbird + Note Editor")
      .sort((left, right) => left.id.localeCompare(right.id));

    expect(team3Ids).toEqual(modularIds);
    expect(authoringMetadata).toHaveLength(TEAM3_MAIL_TASKS.length);
    expect(authoringMetadata.map((task) => task.id)).toEqual(modularIds);
    expect(new Set(authoringMetadata.map((task) => task.implementationPath))).toEqual(
      new Set(["packages/core/src/tasks/team3/mail.ts"])
    );
  });

  it("wires every team3 mail task through the visible mail-main window and target message path", () => {
    const failures: Array<Record<string, unknown>> = [];

    for (const task of TEAM3_MAIL_TASKS) {
      const env = new MockOsEnv();
      env.reset({ taskId: task.id, seed: 0, maxSteps: 0 });

      const hiddenBefore = env.getHiddenState();
      const mailWindow = getVisibleMailWindow(env);
      const targetMessageId = hiddenBefore.targets.targetMessageId;
      const targetFileId = hiddenBefore.targets.targetFileId;
      const targetNode = hiddenBefore.envState.fileSystem.nodes[targetFileId];
      const mailStateBefore = mailWindow
        ? hiddenBefore.envState.appStates.mailLite[mailWindow.id]
        : undefined;
      const targetMessage = mailStateBefore?.messages.find((message) => message.id === targetMessageId);

      if (!mailWindow || !mailStateBefore || !targetMessage || !targetNode) {
        failures.push({
          taskId: task.id,
          mailWindowId: mailWindow?.id,
          targetMessageId,
          hasMailState: Boolean(mailStateBefore),
          visibleMessageIds: mailStateBefore?.messages.map((message) => message.id),
          targetFileId,
          hasTargetFileNode: Boolean(targetNode)
        });
        continue;
      }

      let observation = env.observe().observation;
      let nodes = flattenA11y(observation.a11yTree);
      const folderNode =
        targetMessage.folderId !== mailStateBefore.selectedFolder
          ? nodes.find((node) => node.id === `${mailWindow.id}-folder-${targetMessage.folderId}`)
          : undefined;

      const progressIds = new Set<string>();

      if (folderNode) {
        const folderClick = clickNode(env, folderNode);
        for (const progress of folderClick.info.lastProgress) {
          progressIds.add(progress);
        }
        observation = env.observe().observation;
        nodes = flattenA11y(observation.a11yTree);
      }

      const messageNode = nodes.find((node) => node.id === `${mailWindow.id}-message-${targetMessageId}`);
      if (!messageNode) {
        failures.push({
          taskId: task.id,
          mailWindowId: mailWindow.id,
          targetFolderId: targetMessage.folderId,
          selectedFolderAfterFolderClick: env.getHiddenState().envState.appStates.mailLite[mailWindow.id].selectedFolder,
          targetMessageId,
          targetFilePath: getNodePath(hiddenBefore.envState.fileSystem, targetFileId),
          visibleMessageIdsAfterFolderClick: env
            .getHiddenState()
            .envState
            .appStates
            .mailLite[mailWindow.id]
            .messages
            .filter((message) => message.folderId === env.getHiddenState().envState.appStates.mailLite[mailWindow.id].selectedFolder)
            .map((message) => message.id)
        });
        continue;
      }

      const messageClick = clickNode(env, messageNode);
      for (const progress of messageClick.info.lastProgress) {
        progressIds.add(progress);
      }

      const hiddenAfter = env.getHiddenState();
      const mailStateAfter = hiddenAfter.envState.appStates.mailLite[mailWindow.id];
      const targetFilePath = getNodePath(hiddenAfter.envState.fileSystem, targetFileId);

      if (
        mailStateAfter.selectedMessageId !== targetMessageId ||
        !progressIds.has("mail.message_opened") ||
        targetFilePath !== hiddenAfter.envState.fileSystem.files[targetFileId]?.path
      ) {
        failures.push({
          taskId: task.id,
          mailWindowId: mailWindow.id,
          targetMessageId,
          actualSelectedMessageId: mailStateAfter.selectedMessageId,
          progress: [...progressIds],
          targetFilePath,
          legacyTargetFilePath: hiddenAfter.envState.fileSystem.files[targetFileId]?.path
        });
      }
    }

    expect(failures).toEqual([]);
  });
});
