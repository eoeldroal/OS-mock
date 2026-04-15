import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { chromium } from "playwright";
import type { A11yNode, RenderModel, StepResult } from "../../../core/src/types.js";

type CallToolResult = {
  content?: Array<{ type?: string; text?: string }>;
};

type QaScenarioResult = {
  name: string;
  passed: boolean;
  details: Record<string, unknown>;
};

type HiddenState = {
  envState: {
    fileSystem: {
      files: Record<string, { id: string; name: string }>;
    };
    appStates: {
      mailLite: Record<
        string,
        {
          messages: Array<{ id: string; subject: string }>;
          selectedMessageId: string;
          previewBody: string[];
        }
      >;
    };
  };
  targets: {
    targetFileId?: string;
    targetMessageId?: string;
    targetCommand?: string;
    targetCommandOutput?: string;
    appendText?: string;
    expectedSavedContent?: string;
  };
};

const TASK_IDS = {
  explorer: "rename_note_in_explorer",
  mail: "mail_extract_mock_note",
  terminal: "terminal_record_working_directory"
} as const;

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "../../../..");
const serverEntry = resolve(rootDir, "packages/mcp-server/dist/index.js");
const artifactDir = resolve(rootDir, "output", "playwright", "local-input-qa");

function parseToolText(result: CallToolResult) {
  const text = result.content?.find((item) => item.type === "text")?.text;
  if (!text) {
    throw new Error("Tool result did not contain text content.");
  }
  return JSON.parse(text) as unknown;
}

function flatten(nodes: A11yNode[]): A11yNode[] {
  return nodes.flatMap((node) => [node, ...flatten(node.children)]);
}

function findNode(nodes: A11yNode[], predicate: (node: A11yNode) => boolean) {
  const match = flatten(nodes).find(predicate);
  if (!match) {
    throw new Error("Required a11y node not found.");
  }
  return match;
}

function center(bounds: { x: number; y: number; width: number; height: number }) {
  return {
    x: bounds.x + Math.round(bounds.width / 2),
    y: bounds.y + Math.round(bounds.height / 2)
  };
}

async function screenshot(page: import("playwright").Page, name: string) {
  const path = resolve(artifactDir, `${name}.png`);
  await page.screenshot({ path, fullPage: true });
  return path;
}

async function callTool<T>(client: Client, name: string, args: Record<string, unknown>) {
  return parseToolText((await client.callTool({ name, arguments: args })) as CallToolResult) as T;
}

async function fetchRenderModel(viewerUrl: string, sessionId: string) {
  const response = await fetch(`${new URL(viewerUrl).origin}/api/sessions/${sessionId}/render-model`);
  if (!response.ok) {
    throw new Error(`Failed to load render model for session ${sessionId}.`);
  }
  return response.json() as Promise<RenderModel>;
}

async function waitForUi(page: import("playwright").Page, timeout = 260) {
  await page.waitForTimeout(timeout);
}

async function observe(client: Client, sessionId: string) {
  return callTool<StepResult>(client, "computer13.observe", { sessionId });
}

async function getHiddenState(client: Client, sessionId: string) {
  return callTool<HiddenState>(client, "trainer.get_hidden_state", { sessionId });
}

function getTargetFileName(hidden: HiddenState) {
  const targetFileId = hidden.targets.targetFileId;
  if (!targetFileId) {
    throw new Error("Hidden state did not include targets.targetFileId.");
  }
  const targetFile = hidden.envState.fileSystem.files[targetFileId];
  if (!targetFile) {
    throw new Error(`Target file ${targetFileId} was not found in hidden filesystem state.`);
  }
  return targetFile.name;
}

function getTargetMessageSubject(hidden: HiddenState) {
  const targetMessageId = hidden.targets.targetMessageId;
  if (!targetMessageId) {
    throw new Error("Hidden state did not include targets.targetMessageId.");
  }
  for (const mailState of Object.values(hidden.envState.appStates.mailLite)) {
    const message = mailState.messages.find((item) => item.id === targetMessageId);
    if (message) {
      return message.subject;
    }
  }
  throw new Error(`Target mail message ${targetMessageId} was not found in hidden mail state.`);
}

function matchesMailMessageSubject(node: A11yNode, subject: string) {
  return node.role === "listitem" && (node.name === subject || node.name.endsWith(` - ${subject}`) || node.name.includes(subject));
}

async function waitForObservedNode(
  client: Client,
  page: import("playwright").Page,
  sessionId: string,
  predicate: (node: A11yNode) => boolean,
  attempts = 24,
  delayMs = 300
) {
  let latest: StepResult | null = null;
  for (let index = 0; index < attempts; index += 1) {
    latest = await observe(client, sessionId);
    const match = flatten(latest.observation.a11yTree).find(predicate);
    if (match) {
      return { observed: latest, node: match };
    }
    await waitForUi(page, delayMs);
  }
  throw new Error("Required a11y node not found.");
}

async function focusNoteTextboxByIcon(
  client: Client,
  page: import("playwright").Page,
  sessionId: string,
  fileName: string
) {
  const observed = await callTool<StepResult>(client, "computer13.observe", { sessionId });
  const taskbarIcon = findNode(
    observed.observation.a11yTree,
    (node) => node.role === "icon" && node.name === fileName
  );
  const point = center(taskbarIcon.bounds);
  await page.mouse.click(point.x, point.y);
  await waitForUi(page, 260);
  const refreshed = await callTool<StepResult>(client, "computer13.observe", { sessionId });
  return findNode(
    refreshed.observation.a11yTree,
    (node) => node.role === "textbox" && node.name === fileName
  );
}

async function scenarioLocalSolve(
  client: Client,
  page: import("playwright").Page,
  sessionId: string
): Promise<QaScenarioResult> {
  const reset = await callTool<StepResult>(client, "trainer.reset", {
    sessionId,
    taskId: "dismiss_popup_then_append_note",
    seed: 0
  });

  await page.goto(reset.observation.viewerUrl!, { waitUntil: "domcontentloaded" });
  await waitForUi(page, 300);
  const artifacts: string[] = [];
  artifacts.push(await screenshot(page, "scenario1-reset"));

  await page.getByRole("button", { name: "Dismiss" }).click();
  await waitForUi(page, 320);
  artifacts.push(await screenshot(page, "scenario1-popup-dismissed"));

  let observed = await callTool<StepResult>(client, "computer13.observe", { sessionId });
  const todoFile = findNode(
    observed.observation.a11yTree,
    (node) => node.role === "listitem" && node.name === "todo.txt"
  );
  const todoCenter = center(todoFile.bounds);
  await page.mouse.dblclick(todoCenter.x, todoCenter.y);
  await waitForUi(page, 360);
  artifacts.push(await screenshot(page, "scenario1-note-opened"));

  observed = await callTool<StepResult>(client, "computer13.observe", { sessionId });
  const lineOne = findNode(
    observed.observation.a11yTree,
    (node) => node.role === "label" && node.name === "Line 1" && node.text === "- milk"
  );
  const clickPoint = {
    x: lineOne.bounds.x + lineOne.bounds.width - 12,
    y: lineOne.bounds.y + Math.round(lineOne.bounds.height / 2)
  };
  await page.mouse.click(clickPoint.x, clickPoint.y);
  await waitForUi(page, 300);
  await page.keyboard.press("Enter");
  await page.keyboard.type("- bread", { delay: 35 });
  await waitForUi(page, 320);
  artifacts.push(await screenshot(page, "scenario1-typed"));

  await page.getByRole("button", { name: "Save" }).click();
  await waitForUi(page, 320);
  artifacts.push(await screenshot(page, "scenario1-saved"));

  observed = await callTool<StepResult>(client, "computer13.observe", { sessionId });
  const final = await callTool<StepResult>(client, "computer13.step", {
    sessionId,
    action: { type: "DONE" }
  });
  artifacts.push(await screenshot(page, "scenario1-done"));

  const passed =
    final.terminated &&
    !final.truncated &&
    final.cumulativeReward > 0 &&
    observed.observation.a11yTree.some((node) => node.role === "desktop");

  return {
    name: "local-solve-dismiss-popup-append-note",
    passed,
    details: {
      finalReward: final.cumulativeReward,
      terminated: final.terminated,
      truncated: final.truncated,
      screenshotPath: final.observation.screenshotPath,
      artifacts
    }
  };
}

async function scenarioMixedDockAndPerturbation(
  client: Client,
  page: import("playwright").Page,
  sessionId: string
): Promise<QaScenarioResult> {
  const reset = await callTool<StepResult>(client, "trainer.reset", {
    sessionId,
    taskId: "rename_note_in_explorer",
    seed: 0
  });

  await page.goto(reset.observation.viewerUrl!, { waitUntil: "domcontentloaded" });
  await waitForUi(page, 320);
  const artifacts: string[] = [];
  artifacts.push(await screenshot(page, "scenario2-reset"));

  let observed = await callTool<StepResult>(client, "computer13.observe", { sessionId });
  const terminalIcon = findNode(
    observed.observation.a11yTree,
    (node) => node.role === "icon" && /terminal/i.test(node.name)
  );
  const terminalIconCenter = center(terminalIcon.bounds);
  await page.mouse.click(terminalIconCenter.x, terminalIconCenter.y);
  await waitForUi(page, 320);
  artifacts.push(await screenshot(page, "scenario2-terminal-restored"));
  observed = await callTool<StepResult>(client, "computer13.observe", { sessionId });
  const terminalVisible = flatten(observed.observation.a11yTree).some(
    (node) => node.role === "window" && /terminal/i.test(node.name) && node.visible
  );

  observed = await callTool<StepResult>(client, "computer13.observe", { sessionId });
  const mailIcon = findNode(
    observed.observation.a11yTree,
    (node) => node.role === "icon" && /thunderbird|mail/i.test(node.name)
  );
  const mailIconCenter = center(mailIcon.bounds);
  await page.mouse.click(mailIconCenter.x, mailIconCenter.y);
  await waitForUi(page, 320);
  artifacts.push(await screenshot(page, "scenario2-mail-restored"));
  observed = await callTool<StepResult>(client, "computer13.observe", { sessionId });
  const mailVisible = flatten(observed.observation.a11yTree).some(
    (node) => node.role === "window" && /thunderbird/i.test(node.name) && node.visible
  );

  await callTool<StepResult>(client, "trainer.apply_perturbation", {
    sessionId,
    op: "PopupInject",
    params: {
      title: "Injected popup",
      message: "Noise added during rollout"
    }
  });
  await waitForUi(page, 320);
  artifacts.push(await screenshot(page, "scenario2-popup-injected"));

  await page.getByRole("button", { name: "Dismiss" }).click();
  await waitForUi(page, 320);
  artifacts.push(await screenshot(page, "scenario2-popup-cleared"));

  observed = await callTool<StepResult>(client, "computer13.observe", { sessionId });
  const draftFile = findNode(
    observed.observation.a11yTree,
    (node) => node.role === "listitem" && node.name === "draft.txt"
  );
  const fileCenter = center(draftFile.bounds);
  await page.mouse.click(fileCenter.x, fileCenter.y);
  await waitForUi(page, 300);
  await page.keyboard.press("F2");
  await page.keyboard.type("final.txt", { delay: 35 });
  await page.keyboard.press("Enter");
  await waitForUi(page, 360);
  artifacts.push(await screenshot(page, "scenario2-renamed"));

  const final = await callTool<StepResult>(client, "computer13.step", {
    sessionId,
    action: { type: "DONE" }
  });
  artifacts.push(await screenshot(page, "scenario2-done"));

  return {
    name: "mixed-local-dock-mcp-perturbation-rename",
    passed:
      final.terminated &&
      !final.truncated &&
      final.cumulativeReward > 0 &&
      terminalVisible &&
      mailVisible,
    details: {
      finalReward: final.cumulativeReward,
      terminalVisible,
      mailVisible,
      screenshotPath: final.observation.screenshotPath,
      artifacts
    }
  };
}

async function scenarioMinimizeRecover(
  client: Client,
  page: import("playwright").Page,
  sessionId: string
): Promise<QaScenarioResult> {
  const reset = await callTool<StepResult>(client, "trainer.reset", {
    sessionId,
    taskId: "minimize_recover_and_save",
    seed: 0
  });

  await page.goto(reset.observation.viewerUrl!, { waitUntil: "domcontentloaded" });
  await waitForUi(page, 320);
  const artifacts: string[] = [];
  artifacts.push(await screenshot(page, "scenario3-reset"));

  const observed = await callTool<StepResult>(client, "computer13.observe", { sessionId });
  const recoverIcon = findNode(
    observed.observation.a11yTree,
    (node) => node.role === "icon" && /recover\.txt/i.test(node.name)
  );
  const recoverIconCenter = center(recoverIcon.bounds);
  await page.mouse.click(recoverIconCenter.x, recoverIconCenter.y);
  await waitForUi(page, 320);
  artifacts.push(await screenshot(page, "scenario3-editor-restored"));

  await page.getByRole("button", { name: "Save" }).click();
  await waitForUi(page, 320);
  artifacts.push(await screenshot(page, "scenario3-saved"));

  const final = await callTool<StepResult>(client, "computer13.step", {
    sessionId,
    action: { type: "DONE" }
  });
  artifacts.push(await screenshot(page, "scenario3-done"));

  return {
    name: "local-dock-recover-and-save",
    passed: final.terminated && !final.truncated && final.cumulativeReward > 0,
    details: {
      finalReward: final.cumulativeReward,
      screenshotPath: final.observation.screenshotPath,
      artifacts
    }
  };
}

async function scenarioWindowControlsAndRelaunch(
  client: Client,
  page: import("playwright").Page,
  sessionId: string
): Promise<QaScenarioResult> {
  const reset = await callTool<StepResult>(client, "trainer.reset", {
    sessionId,
    taskId: "rename_note_in_explorer",
    seed: 0
  });

  await page.goto(reset.observation.viewerUrl!, { waitUntil: "domcontentloaded" });
  await waitForUi(page, 320);
  const artifacts: string[] = [];
  artifacts.push(await screenshot(page, "scenario4-reset"));

  let observed = await callTool<StepResult>(client, "computer13.observe", { sessionId });
  let maximizeNode = findNode(
    observed.observation.a11yTree,
    (node) => node.role === "button" && node.id === "explorer-main-maximize"
  );
  let maximizeCenter = center(maximizeNode.bounds);
  await page.mouse.click(maximizeCenter.x, maximizeCenter.y);
  await waitForUi(page, 320);
  artifacts.push(await screenshot(page, "scenario4-files-maximized"));

  observed = await callTool<StepResult>(client, "computer13.observe", { sessionId });
  maximizeNode = findNode(
    observed.observation.a11yTree,
    (node) => node.role === "button" && node.id === "explorer-main-maximize"
  );
  maximizeCenter = center(maximizeNode.bounds);
  await page.mouse.click(maximizeCenter.x, maximizeCenter.y);
  await waitForUi(page, 320);
  artifacts.push(await screenshot(page, "scenario4-files-restored"));

  observed = await callTool<StepResult>(client, "computer13.observe", { sessionId });
  const minimizeNode = findNode(
    observed.observation.a11yTree,
    (node) => node.role === "button" && node.id === "explorer-main-minimize"
  );
  const minimizeCenter = center(minimizeNode.bounds);
  await page.mouse.click(minimizeCenter.x, minimizeCenter.y);
  await waitForUi(page, 320);
  artifacts.push(await screenshot(page, "scenario4-files-minimized"));

  observed = await callTool<StepResult>(client, "computer13.observe", { sessionId });
  const filesDockIcon = findNode(
    observed.observation.a11yTree,
    (node) => node.role === "icon" && node.name === "Files"
  );
  const filesDockCenter = center(filesDockIcon.bounds);
  await page.mouse.click(filesDockCenter.x, filesDockCenter.y);
  await waitForUi(page, 320);
  artifacts.push(await screenshot(page, "scenario4-files-restored-from-dock"));

  observed = await callTool<StepResult>(client, "computer13.observe", { sessionId });
  const browserCloseNode = findNode(
    observed.observation.a11yTree,
    (node) => node.role === "button" && node.id === "browser-main-close"
  );
  const browserCloseCenter = center(browserCloseNode.bounds);
  await page.mouse.click(browserCloseCenter.x, browserCloseCenter.y);
  await waitForUi(page, 320);
  artifacts.push(await screenshot(page, "scenario4-browser-closed"));

  observed = await callTool<StepResult>(client, "computer13.observe", { sessionId });
  const browserDockIcon = findNode(
    observed.observation.a11yTree,
    (node) => node.role === "icon" && /mozilla firefox/i.test(node.name)
  );
  const browserDockCenter = center(browserDockIcon.bounds);
  await page.mouse.click(browserDockCenter.x, browserDockCenter.y);
  await waitForUi(page, 320);
  artifacts.push(await screenshot(page, "scenario4-browser-relaunched"));

  observed = await callTool<StepResult>(client, "computer13.observe", { sessionId });
  const browserVisible = flatten(observed.observation.a11yTree).some(
    (node) => node.role === "window" && /mozilla firefox/i.test(node.name) && node.visible
  );
  const filesVisible = flatten(observed.observation.a11yTree).some(
    (node) => node.role === "window" && node.name === "Files" && node.visible
  );

  return {
    name: "local-window-controls-and-dock-relaunch",
    passed: browserVisible && filesVisible,
    details: {
      browserVisible,
      filesVisible,
      artifacts
    }
  };
}

async function scenarioLocalWindowDrag(
  client: Client,
  page: import("playwright").Page,
  sessionId: string
): Promise<QaScenarioResult> {
  const reset = await callTool<StepResult>(client, "trainer.reset", {
    sessionId,
    taskId: "rename_note_in_explorer",
    seed: 0
  });

  await page.goto(reset.observation.viewerUrl!, { waitUntil: "domcontentloaded" });
  await waitForUi(page, 320);
  const artifacts: string[] = [];
  artifacts.push(await screenshot(page, "scenario5-reset"));

  let observed = await callTool<StepResult>(client, "computer13.observe", { sessionId });
  const filesWindow = findNode(
    observed.observation.a11yTree,
    (node) => node.role === "window" && node.name === "Files"
  );
  const dragStart = {
    x: filesWindow.bounds.x + Math.round(filesWindow.bounds.width / 2),
    y: filesWindow.bounds.y + 20
  };

  await page.mouse.move(dragStart.x, dragStart.y);
  await page.mouse.down();
  await page.mouse.move(dragStart.x + 180, dragStart.y + 96, { steps: 14 });
  await page.mouse.up();
  await waitForUi(page, 420);
  artifacts.push(await screenshot(page, "scenario5-files-dragged"));

  observed = await callTool<StepResult>(client, "computer13.observe", { sessionId });
  const movedWindow = findNode(
    observed.observation.a11yTree,
    (node) => node.role === "window" && node.name === "Files"
  );
  const hidden = await callTool<{
    envState: {
      windows: Array<{ id: string; appId: string; zIndex: number }>;
    };
  }>(client, "trainer.get_hidden_state", { sessionId });
  const movedHiddenWindow = hidden.envState.windows.find((window) => window.id === "explorer-main");
  const browserHiddenWindow = hidden.envState.windows.find((window) => window.appId === "browser-lite");
  const browserVisible = flatten(observed.observation.a11yTree).some(
    (node) => node.role === "window" && /mozilla firefox/i.test(node.name) && node.visible
  );

  const movedEnough = movedWindow.bounds.x >= 260 && movedWindow.bounds.y >= 170;
  const raisedAboveBrowser =
    typeof movedHiddenWindow?.zIndex === "number" &&
    typeof browserHiddenWindow?.zIndex === "number" &&
    movedHiddenWindow.zIndex > browserHiddenWindow.zIndex;

  return {
    name: "local-window-drag",
    passed: movedEnough && browserVisible && raisedAboveBrowser,
    details: {
      browserVisible,
      movedBounds: movedWindow.bounds,
      movedEnough,
      raisedAboveBrowser,
      zOrder: {
        files: movedHiddenWindow?.zIndex ?? null,
        browser: browserHiddenWindow?.zIndex ?? null
      },
      screenshotPath: observed.observation.screenshotPath,
      artifacts
    }
  };
}

async function scenarioRepeatedDragAndFollowUpClicks(
  client: Client,
  page: import("playwright").Page,
  sessionId: string
): Promise<QaScenarioResult> {
  const reset = await callTool<StepResult>(client, "trainer.reset", {
    sessionId,
    taskId: "rename_note_in_explorer",
    seed: 0,
    maxSteps: 0
  });

  await page.goto(reset.observation.viewerUrl!, { waitUntil: "domcontentloaded" });
  await waitForUi(page, 320);
  const artifacts: string[] = [];
  artifacts.push(await screenshot(page, "scenario6-reset"));

  let render = await fetchRenderModel(reset.observation.viewerUrl!, sessionId);
  let filesWindow = render.windows.find((window) => window.id === "explorer-main");
  if (!filesWindow || filesWindow.appView.type !== "file-explorer") {
    throw new Error("File Explorer window was not available for repeated drag QA.");
  }

  const firstDragStart = {
    x: filesWindow.titleBarBounds.x + Math.round(filesWindow.titleBarBounds.width / 2),
    y: filesWindow.titleBarBounds.y + Math.round(filesWindow.titleBarBounds.height / 2)
  };
  await page.mouse.move(firstDragStart.x, firstDragStart.y);
  await page.mouse.down();
  await page.mouse.move(firstDragStart.x + 180, firstDragStart.y + 96, { steps: 10 });
  await page.mouse.up();
  await waitForUi(page, 180);
  artifacts.push(await screenshot(page, "scenario6-after-first-drag"));

  render = await fetchRenderModel(reset.observation.viewerUrl!, sessionId);
  filesWindow = render.windows.find((window) => window.id === "explorer-main");
  if (!filesWindow || filesWindow.appView.type !== "file-explorer") {
    throw new Error("File Explorer window was not available after the first drag.");
  }
  const afterFirstDragBounds = { ...filesWindow.bounds };
  const downloadsRect = filesWindow.appView.layout.sidebarItemRects[3];
  await page.mouse.click(
    downloadsRect.x + Math.round(downloadsRect.width / 2),
    downloadsRect.y + Math.round(downloadsRect.height / 2)
  );
  await waitForUi(page, 260);
  artifacts.push(await screenshot(page, "scenario6-after-downloads-click"));

  render = await fetchRenderModel(reset.observation.viewerUrl!, sessionId);
  filesWindow = render.windows.find((window) => window.id === "explorer-main");
  if (!filesWindow || filesWindow.appView.type !== "file-explorer") {
    throw new Error("File Explorer window was not available after the post-drag sidebar click.");
  }
  const downloadsClickWorked = filesWindow.appView.currentPlace === "Downloads";

  const secondDragStart = {
    x: filesWindow.titleBarBounds.x + Math.round(filesWindow.titleBarBounds.width / 2),
    y: filesWindow.titleBarBounds.y + Math.round(filesWindow.titleBarBounds.height / 2)
  };
  await page.mouse.move(secondDragStart.x, secondDragStart.y);
  await page.mouse.down();
  await page.mouse.move(secondDragStart.x + 120, secondDragStart.y + 60, { steps: 8 });
  await page.mouse.up();
  await waitForUi(page, 180);
  artifacts.push(await screenshot(page, "scenario6-after-second-drag"));

  render = await fetchRenderModel(reset.observation.viewerUrl!, sessionId);
  filesWindow = render.windows.find((window) => window.id === "explorer-main");
  if (!filesWindow || filesWindow.appView.type !== "file-explorer") {
    throw new Error("File Explorer window was not available after the second drag.");
  }
  const secondDragWorked =
    filesWindow.bounds.x !== afterFirstDragBounds.x || filesWindow.bounds.y !== afterFirstDragBounds.y;

  await page.mouse.click(
    filesWindow.maximizeButtonBounds.x + Math.round(filesWindow.maximizeButtonBounds.width / 2),
    filesWindow.maximizeButtonBounds.y + Math.round(filesWindow.maximizeButtonBounds.height / 2)
  );
  await waitForUi(page, 260);
  artifacts.push(await screenshot(page, "scenario6-after-maximize-click"));

  render = await fetchRenderModel(reset.observation.viewerUrl!, sessionId);
  filesWindow = render.windows.find((window) => window.id === "explorer-main");
  const maximizeWorked = Boolean(filesWindow?.maximized);

  return {
    name: "local-repeated-drag-followup-clicks",
    passed: downloadsClickWorked && secondDragWorked && maximizeWorked,
    details: {
      downloadsClickWorked,
      secondDragWorked,
      maximizeWorked,
      boundsAfterFirstDrag: afterFirstDragBounds,
      boundsAfterSecondDrag: filesWindow?.bounds ?? null,
      currentPlaceAfterClick:
        filesWindow && filesWindow.appView.type === "file-explorer" ? filesWindow.appView.currentPlace : null,
      artifacts
    }
  };
}

async function scenarioTopEdgeSnapMaximize(
  client: Client,
  page: import("playwright").Page,
  sessionId: string
): Promise<QaScenarioResult> {
  const reset = await callTool<StepResult>(client, "trainer.reset", {
    sessionId,
    taskId: "rename_note_in_explorer",
    seed: 0,
    maxSteps: 0
  });

  await page.goto(reset.observation.viewerUrl!, { waitUntil: "domcontentloaded" });
  await waitForUi(page, 320);
  const artifacts: string[] = [];
  artifacts.push(await screenshot(page, "scenario14-reset"));

  let render = await fetchRenderModel(reset.observation.viewerUrl!, sessionId);
  let filesWindow = render.windows.find((window) => window.id === "explorer-main");
  if (!filesWindow) {
    throw new Error("File Explorer window was not available for snap QA.");
  }

  const dragStart = {
    x: filesWindow.titleBarBounds.x + Math.round(filesWindow.titleBarBounds.width / 2),
    y: filesWindow.titleBarBounds.y + Math.round(filesWindow.titleBarBounds.height / 2)
  };
  await page.mouse.move(dragStart.x, dragStart.y);
  await page.mouse.down();
  await page.mouse.move(dragStart.x, 6, { steps: 14 });
  await page.mouse.up();
  await waitForUi(page, 320);
  artifacts.push(await screenshot(page, "scenario14-after-top-snap"));

  render = await fetchRenderModel(reset.observation.viewerUrl!, sessionId);
  filesWindow = render.windows.find((window) => window.id === "explorer-main");
  return {
    name: "local-top-edge-snap-maximize",
    passed: Boolean(filesWindow?.maximized),
    details: {
      maximized: filesWindow?.maximized ?? false,
      bounds: filesWindow?.bounds ?? null,
      artifacts
    }
  };
}

async function scenarioFastClickThenType(
  client: Client,
  page: import("playwright").Page,
  sessionId: string
): Promise<QaScenarioResult> {
  const reset = await callTool<StepResult>(client, "trainer.reset", {
    sessionId,
    taskId: "dismiss_popup_then_append_note",
    seed: 0,
    maxSteps: 0
  });

  await page.goto(reset.observation.viewerUrl!, { waitUntil: "domcontentloaded" });
  await waitForUi(page, 300);
  const artifacts: string[] = [];
  artifacts.push(await screenshot(page, "scenario7-reset"));

  await page.getByRole("button", { name: "Dismiss" }).click();
  await waitForUi(page, 320);

  let observed = await callTool<StepResult>(client, "computer13.observe", { sessionId });
  const todoFile = findNode(
    observed.observation.a11yTree,
    (node) => node.role === "listitem" && node.name === "todo.txt"
  );
  const todoCenter = center(todoFile.bounds);
  await page.mouse.dblclick(todoCenter.x, todoCenter.y);
  await waitForUi(page, 360);
  artifacts.push(await screenshot(page, "scenario7-note-opened"));

  observed = await callTool<StepResult>(client, "computer13.observe", { sessionId });
  const lineOne = findNode(
    observed.observation.a11yTree,
    (node) => node.role === "label" && node.name === "Line 1" && node.text === "- milk"
  );
  const clickPoint = {
    x: lineOne.bounds.x + lineOne.bounds.width - 12,
    y: lineOne.bounds.y + Math.round(lineOne.bounds.height / 2)
  };
  await page.mouse.click(clickPoint.x, clickPoint.y);
  await page.keyboard.type("!", { delay: 0 });
  await waitForUi(page, 260);
  artifacts.push(await screenshot(page, "scenario7-after-immediate-typing"));

  const render = await fetchRenderModel(reset.observation.viewerUrl!, sessionId);
  const noteWindow = render.windows.find((window) => window.appView.type === "note-editor");
  const firstLine =
    noteWindow && noteWindow.appView.type === "note-editor" ? noteWindow.appView.lines[0] ?? null : null;

  return {
    name: "local-fast-click-then-type",
    passed: firstLine === "- milk!",
    details: {
      firstLine,
      artifacts
    }
  };
}

async function scenarioViewerOnlyTerminalClipboard(
  client: Client,
  page: import("playwright").Page,
  sessionId: string
): Promise<QaScenarioResult> {
  const reset = await callTool<StepResult>(client, "trainer.reset", {
    sessionId,
    taskId: TASK_IDS.terminal,
    seed: 0,
    maxSteps: 0
  });
  const hidden = await getHiddenState(client, sessionId);
  const targetCommand = hidden.targets.targetCommand ?? "pwd";
  const targetCommandOutput = hidden.targets.targetCommandOutput ?? hidden.targets.appendText ?? "";
  const targetFileName = getTargetFileName(hidden);

  await page.goto(reset.observation.viewerUrl!, { waitUntil: "domcontentloaded" });
  await waitForUi(page, 320);
  const artifacts: string[] = [];
  artifacts.push(await screenshot(page, "scenario9-reset"));

  let observed = await callTool<StepResult>(client, "computer13.observe", { sessionId });
  const terminalBox = findNode(
    observed.observation.a11yTree,
    (node) => node.role === "textbox" && node.name === "Terminal session"
  );
  await page.mouse.click(terminalBox.bounds.x + 12, terminalBox.bounds.y + 12);
  await page.keyboard.type(targetCommand, { delay: 0 });
  await page.keyboard.press("Enter");
  await waitForUi(page, 320);
  artifacts.push(await screenshot(page, "scenario9-after-pwd"));

  observed = await callTool<StepResult>(client, "computer13.observe", { sessionId });
  const outputLine = findNode(
    observed.observation.a11yTree,
    (node) => node.role === "label" && node.text === targetCommandOutput
  );
  const outputPoint = center(outputLine.bounds);
  await page.mouse.click(outputPoint.x, outputPoint.y);
  await page.keyboard.press("Control+C");
  await waitForUi(page, 260);
  artifacts.push(await screenshot(page, "scenario9-after-copy"));

  observed = await callTool<StepResult>(client, "computer13.observe", { sessionId });
  const logFile = findNode(
    observed.observation.a11yTree,
    (node) => node.role === "listitem" && node.name === targetFileName
  );
  const logFilePoint = center(logFile.bounds);
  await page.mouse.dblclick(logFilePoint.x, logFilePoint.y);
  await waitForUi(page, 360);

  observed = await callTool<StepResult>(client, "computer13.observe", { sessionId });
  const textBox = findNode(
    observed.observation.a11yTree,
    (node) => node.role === "textbox" && node.name === targetFileName
  );
  await page.mouse.click(textBox.bounds.x + 12, textBox.bounds.y + 12);
  await page.keyboard.press("Control+V");
  await waitForUi(page, 260);
  artifacts.push(await screenshot(page, "scenario9-after-paste"));

  await page.getByRole("button", { name: "Save" }).click();
  await waitForUi(page, 260);
  artifacts.push(await screenshot(page, "scenario9-after-save"));

  const render = await fetchRenderModel(reset.observation.viewerUrl!, sessionId);
  const noteWindow = render.windows.find(
    (window) => window.title === targetFileName && window.appView.type === "note-editor"
  );
  const joined =
    noteWindow && noteWindow.appView.type === "note-editor" ? noteWindow.appView.lines.join("\n") : null;

  const final = await callTool<StepResult>(client, "computer13.step", {
    sessionId,
    action: { type: "DONE" }
  });

  return {
    name: "viewer-only-terminal-copy-paste",
    passed: joined === targetCommandOutput && final.terminated && final.cumulativeReward > 0,
    details: {
      targetFileName,
      targetCommand,
      joined,
      finalReward: final.cumulativeReward,
      artifacts
    }
  };
}

async function scenarioVisibleTextFileOpen(
  client: Client,
  page: import("playwright").Page,
  sessionId: string
): Promise<QaScenarioResult> {
  const artifacts: string[] = [];

  let reset = await callTool<StepResult>(client, "trainer.reset", {
    sessionId,
    taskId: TASK_IDS.explorer,
    seed: 0,
    maxSteps: 0
  });
  let hidden = await getHiddenState(client, sessionId);
  let targetFileName = getTargetFileName(hidden);

  await page.goto(reset.observation.viewerUrl!, { waitUntil: "domcontentloaded" });
  await waitForUi(page, 320);
  artifacts.push(await screenshot(page, "scenario10-browser-reset"));

  let observed = await callTool<StepResult>(client, "computer13.observe", { sessionId });
  const browserHelpFile = findNode(
    observed.observation.a11yTree,
    (node) => node.role === "listitem" && node.name === targetFileName
  );
  const browserHelpPoint = center(browserHelpFile.bounds);
  await page.mouse.dblclick(browserHelpPoint.x, browserHelpPoint.y);
  await waitForUi(page, 360);
  artifacts.push(await screenshot(page, "scenario10-browser-after-dblclick"));

  observed = await callTool<StepResult>(client, "computer13.observe", { sessionId });
  const browserOpenWorked = flatten(observed.observation.a11yTree).some(
    (node) => node.role === "textbox" && node.name === targetFileName
  );

  reset = await callTool<StepResult>(client, "trainer.reset", {
    sessionId,
    taskId: TASK_IDS.terminal,
    seed: 0,
    maxSteps: 0
  });
  hidden = await getHiddenState(client, sessionId);
  targetFileName = getTargetFileName(hidden);

  await page.goto(reset.observation.viewerUrl!, { waitUntil: "domcontentloaded" });
  await waitForUi(page, 320);
  artifacts.push(await screenshot(page, "scenario10-terminal-reset"));

  observed = await callTool<StepResult>(client, "computer13.observe", { sessionId });
  const terminalLogFile = findNode(
    observed.observation.a11yTree,
    (node) => node.role === "listitem" && node.name === targetFileName
  );
  const terminalLogPoint = center(terminalLogFile.bounds);
  await page.mouse.dblclick(terminalLogPoint.x, terminalLogPoint.y);
  await waitForUi(page, 360);
  artifacts.push(await screenshot(page, "scenario10-terminal-after-dblclick"));

  observed = await callTool<StepResult>(client, "computer13.observe", { sessionId });
  const terminalOpenWorked = flatten(observed.observation.a11yTree).some(
    (node) => node.role === "textbox" && node.name === targetFileName
  );

  return {
    name: "visible-text-file-open",
    passed: browserOpenWorked && terminalOpenWorked,
    details: {
      browserOpenWorked,
      terminalOpenWorked,
      artifacts
    }
  };
}

async function scenarioMailHeavyClickRecovery(
  client: Client,
  page: import("playwright").Page,
  sessionId: string
): Promise<QaScenarioResult> {
  const reset = await callTool<StepResult>(client, "trainer.reset", {
    sessionId,
    taskId: TASK_IDS.mail,
    seed: 0,
    maxSteps: 0
  });
  const hidden = await getHiddenState(client, sessionId);
  const targetMessageSubject = getTargetMessageSubject(hidden);
  const targetFileName = getTargetFileName(hidden);
  const expectedSavedContent = hidden.targets.expectedSavedContent ?? hidden.targets.appendText ?? "";
  const distractorSubject = Object.values(hidden.envState.appStates.mailLite)
    .flatMap((mailState) => mailState.messages.map((message) => message.subject))
    .find((subject) => subject !== targetMessageSubject);

  await page.goto(reset.observation.viewerUrl!, { waitUntil: "domcontentloaded" });
  await waitForUi(page, 320);
  const artifacts: string[] = [];
  artifacts.push(await screenshot(page, "scenario12-reset"));

  const clickNodeByPredicate = async (predicate: (node: A11yNode) => boolean) => {
    const observed = await callTool<StepResult>(client, "computer13.observe", { sessionId });
    const node = flatten(observed.observation.a11yTree).find(predicate);
    if (!node) {
      return false;
    }
    const point = center(node.bounds);
    await page.mouse.click(point.x, point.y);
    await waitForUi(page, 80);
    return true;
  };

  for (let round = 0; round < 20; round += 1) {
    await clickNodeByPredicate((node) => node.role === "listitem" && node.name === "Drafts");
    await clickNodeByPredicate((node) => node.role === "listitem" && node.name === "Inbox");
    if (distractorSubject) {
      await clickNodeByPredicate((node) => matchesMailMessageSubject(node, distractorSubject));
    }
    await clickNodeByPredicate((node) => matchesMailMessageSubject(node, targetMessageSubject));
    await clickNodeByPredicate((node) => node.role === "icon" && /thunderbird|mail/i.test(node.name));
  }
  artifacts.push(await screenshot(page, "scenario12-after-heavy-click-stress"));

  await clickNodeByPredicate((node) => node.role === "listitem" && node.name === "Inbox");
  await clickNodeByPredicate((node) => matchesMailMessageSubject(node, targetMessageSubject));
  await waitForUi(page, 260);
  artifacts.push(await screenshot(page, "scenario12-after-mail-recovery"));

  let observed = await callTool<StepResult>(client, "computer13.observe", { sessionId });
  const logFile = findNode(
    observed.observation.a11yTree,
    (node) => node.role === "listitem" && node.name === targetFileName
  );
  const logPoint = center(logFile.bounds);
  await page.mouse.dblclick(logPoint.x, logPoint.y);
  await waitForUi(page, 360);

  observed = await callTool<StepResult>(client, "computer13.observe", { sessionId });
  const textBox = findNode(
    observed.observation.a11yTree,
    (node) => node.role === "textbox" && node.name === targetFileName
  );
  await page.mouse.click(textBox.bounds.x + 12, textBox.bounds.y + 12);
  await page.keyboard.type(expectedSavedContent, { delay: 0 });
  await waitForUi(page, 260);
  await page.getByRole("button", { name: "Save" }).click();
  await waitForUi(page, 260);
  artifacts.push(await screenshot(page, "scenario12-after-save"));

  const render = await fetchRenderModel(reset.observation.viewerUrl!, sessionId);
  const mailWindow = render.windows.find((window) => window.title === "Thunderbird" && window.appView.type === "mail-lite");
  const noteWindow = render.windows.find(
    (window) => window.title === targetFileName && window.appView.type === "note-editor"
  );
  const mailApp = mailWindow?.appView.type === "mail-lite" ? mailWindow.appView : undefined;
  const noteApp = noteWindow?.appView.type === "note-editor" ? noteWindow.appView : undefined;

  const mailRecovered =
    mailApp !== undefined &&
    mailApp.selectedMessageId === hidden.targets.targetMessageId &&
    noteApp !== undefined;
  const noteSaved =
    noteApp !== undefined &&
    noteApp.lines.join("\n") === expectedSavedContent;

  return {
    name: "local-mail-heavy-click-recovery",
    passed: mailRecovered && noteSaved,
    details: {
      mailRecovered,
      noteSaved,
      targetFileName,
      targetMessageSubject,
      selectedMessageId: mailApp?.selectedMessageId ?? null,
      previewBody: mailApp?.previewBody ?? null,
      noteContent: noteApp?.lines.join("\n") ?? null,
      artifacts
    }
  };
}

async function scenarioFileExplorerCreateEntries(
  client: Client,
  page: import("playwright").Page,
  sessionId: string
): Promise<QaScenarioResult> {
  const reset = await callTool<StepResult>(client, "trainer.reset", {
    sessionId,
    taskId: TASK_IDS.explorer,
    seed: 0,
    maxSteps: 0
  });

  await page.goto(reset.observation.viewerUrl!, { waitUntil: "domcontentloaded" });
  await waitForUi(page, 320);
  const artifacts: string[] = [];
  artifacts.push(await screenshot(page, "scenario13-reset"));

  let render = await fetchRenderModel(reset.observation.viewerUrl!, sessionId);
  let filesWindow = render.windows.find((window) => window.id === "explorer-main");
  if (!filesWindow || filesWindow.appView.type !== "file-explorer") {
    throw new Error("File Explorer window not available for create-entry QA.");
  }

  const downloadsRect = filesWindow.appView.layout.sidebarItemRects[3];
  await page.mouse.click(
    downloadsRect.x + Math.round(downloadsRect.width / 2),
    downloadsRect.y + Math.round(downloadsRect.height / 2)
  );
  await waitForUi(page, 260);
  artifacts.push(await screenshot(page, "scenario13-after-downloads-click"));

  render = await fetchRenderModel(reset.observation.viewerUrl!, sessionId);
  filesWindow = render.windows.find((window) => window.id === "explorer-main");
  if (!filesWindow || filesWindow.appView.type !== "file-explorer") {
    throw new Error("File Explorer window disappeared during create-entry QA.");
  }

  const emptyPoint = {
    x: filesWindow.appView.layout.listBounds.x + 40,
    y: filesWindow.appView.layout.listBounds.y + 40
  };
  await page.mouse.click(emptyPoint.x, emptyPoint.y, { button: "right" });
  await waitForUi(page, 220);

  let observed = await callTool<StepResult>(client, "computer13.observe", { sessionId });
  let newFileMenuItem = findNode(
    observed.observation.a11yTree,
    (node) => node.role === "menuitem" && node.name === "New File"
  );
  let point = center(newFileMenuItem.bounds);
  await page.mouse.click(point.x, point.y);
  await waitForUi(page, 260);
  artifacts.push(await screenshot(page, "scenario13-after-new-file"));

  render = await fetchRenderModel(reset.observation.viewerUrl!, sessionId);
  filesWindow = render.windows.find((window) => window.id === "explorer-main");
  const createdFileName =
    filesWindow && filesWindow.appView.type === "file-explorer"
      ? filesWindow.appView.files.find((file) => file.path.startsWith("/downloads/"))?.name ?? null
      : null;

  await page.mouse.click(emptyPoint.x + 40, emptyPoint.y + 60, { button: "right" });
  await waitForUi(page, 220);
  observed = await callTool<StepResult>(client, "computer13.observe", { sessionId });
  const newFolderMenuItem = findNode(
    observed.observation.a11yTree,
    (node) => node.role === "menuitem" && node.name === "New Folder"
  );
  point = center(newFolderMenuItem.bounds);
  await page.mouse.click(point.x, point.y);
  await waitForUi(page, 260);
  artifacts.push(await screenshot(page, "scenario13-after-new-folder"));

  render = await fetchRenderModel(reset.observation.viewerUrl!, sessionId);
  filesWindow = render.windows.find((window) => window.id === "explorer-main");
  const fileEntries =
    filesWindow && filesWindow.appView.type === "file-explorer"
      ? filesWindow.appView.files.filter((file) => file.path.startsWith("/downloads/"))
      : [];
  const createdFolderName = fileEntries.find((file) => file.kind === "folder")?.name ?? null;

  return {
    name: "file-explorer-create-entries",
    passed: Boolean(createdFileName) && Boolean(createdFolderName),
    details: {
      createdFileName,
      createdFolderName,
      visibleDownloadEntries: fileEntries.map((file) => ({
        name: file.name,
        path: file.path,
        kind: file.kind ?? "file"
      })),
      artifacts
    }
  };
}

async function main() {
  if (!existsSync(serverEntry)) {
    throw new Error(`Built MCP server not found at ${serverEntry}. Run npm run build first.`);
  }

  await mkdir(artifactDir, { recursive: true });

  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [serverEntry],
    cwd: rootDir,
    env: {
      ...process.env,
      PATH: process.env.PATH ?? ""
    },
    stderr: "pipe"
  });

  transport.stderr?.on("data", (chunk) => {
    process.stderr.write(`[mcp-server] ${chunk}`);
  });

  const client = new Client(
    {
      name: "os-mock-local-input-qa",
      version: "0.1.0"
    },
    {
      capabilities: {}
    }
  );

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const results: QaScenarioResult[] = [];

  try {
    await client.connect(transport);
    const created = await callTool<{ sessionId: string; viewerUrl: string }>(client, "trainer.create_session", {});

    results.push(await scenarioLocalSolve(client, page, created.sessionId));
    results.push(await scenarioMixedDockAndPerturbation(client, page, created.sessionId));
    results.push(await scenarioMinimizeRecover(client, page, created.sessionId));
    results.push(await scenarioWindowControlsAndRelaunch(client, page, created.sessionId));
    results.push(await scenarioLocalWindowDrag(client, page, created.sessionId));
    results.push(await scenarioRepeatedDragAndFollowUpClicks(client, page, created.sessionId));
    results.push(await scenarioTopEdgeSnapMaximize(client, page, created.sessionId));
    results.push(await scenarioFastClickThenType(client, page, created.sessionId));
    results.push(await scenarioViewerOnlyTerminalClipboard(client, page, created.sessionId));
    results.push(await scenarioVisibleTextFileOpen(client, page, created.sessionId));
    results.push(await scenarioMailHeavyClickRecovery(client, page, created.sessionId));
    results.push(await scenarioFileExplorerCreateEntries(client, page, created.sessionId));

    await callTool(client, "trainer.close_session", { sessionId: created.sessionId });
  } finally {
    await client.close();
    await context.close();
    await browser.close();
  }

  const report = {
    generatedAt: new Date().toISOString(),
    passed: results.every((result) => result.passed),
    results
  };

  await writeFile(resolve(artifactDir, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));

  if (!report.passed) {
    process.exitCode = 1;
  }
}

void main();
