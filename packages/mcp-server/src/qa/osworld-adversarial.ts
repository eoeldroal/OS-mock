import { existsSync } from "node:fs";
import { copyFile, mkdir, writeFile } from "node:fs/promises";
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

type QaAction = {
  label: string;
  run: () => Promise<void>;
};

type MinStepResult = {
  reachedStepIndex: number;
  actionsRun: number;
  actionCounts: Record<string, number>;
  recoveries: number;
};

type ToolCaller = <T>(name: string, args: Record<string, unknown>) => Promise<T>;

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "../../../..");
const serverEntry = resolve(rootDir, "packages/mcp-server/dist/index.js");
const artifactRootDir = resolve(rootDir, "output", "playwright", "osworld-adversarial-qa");
const runId = new Date().toISOString().replace(/[:.]/g, "-");
const runDir = resolve(artifactRootDir, "runs", runId);
const MIN_STEPS_PER_SCENARIO = 100;

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
  const path = resolve(runDir, `${name}.png`);
  await page.screenshot({ path, fullPage: true });
  return path;
}

async function rawCallTool<T>(client: Client, name: string, args: Record<string, unknown>) {
  return parseToolText((await client.callTool({ name, arguments: args })) as CallToolResult) as T;
}

function createQueuedToolCaller(client: Client): ToolCaller {
  let queue = Promise.resolve();

  return async <T>(name: string, args: Record<string, unknown>) => {
    const task = queue.then(() => rawCallTool<T>(client, name, args));
    queue = task.then(() => undefined, () => undefined);
    return task;
  };
}

async function waitForUi(page: import("playwright").Page, timeout = 220) {
  await page.waitForTimeout(timeout);
}

function logProgress(message: string, data?: Record<string, unknown>) {
  const suffix = data ? ` ${JSON.stringify(data)}` : "";
  console.error(`[osworld-adversarial] ${message}${suffix}`);
}

async function writeCheckpoint(name: string, stage: string, details: Record<string, unknown>) {
  await writeFile(
    resolve(runDir, `${name}-${stage}.json`),
    JSON.stringify(
      {
        recordedAt: new Date().toISOString(),
        name,
        stage,
        ...details
      },
      null,
      2
    )
  );
}

async function fetchRenderModel(viewerUrl: string, sessionId: string) {
  const response = await fetch(`${new URL(viewerUrl).origin}/api/sessions/${sessionId}/render-model`);
  if (!response.ok) {
    throw new Error(`Failed to load render model for session ${sessionId}.`);
  }
  return response.json() as Promise<RenderModel>;
}

async function observe(callTool: ToolCaller, sessionId: string) {
  return callTool<StepResult>("computer13.observe", { sessionId });
}

async function sendAction(callTool: ToolCaller, sessionId: string, action: Record<string, unknown>) {
  return callTool<StepResult>("computer13.step", { sessionId, action });
}

async function sendHotkey(callTool: ToolCaller, sessionId: string, keys: string[]) {
  return sendAction(callTool, sessionId, { type: "HOTKEY", keys });
}

async function sendTyping(callTool: ToolCaller, sessionId: string, text: string) {
  return sendAction(callTool, sessionId, { type: "TYPING", text });
}

async function sendPress(callTool: ToolCaller, sessionId: string, key: string) {
  return sendAction(callTool, sessionId, { type: "PRESS", key });
}

async function archiveObservationScreenshot(
  screenshotPath: string | undefined,
  archivedName: string
) {
  if (!screenshotPath || !existsSync(screenshotPath)) {
    return null;
  }
  const archivedPath = resolve(runDir, archivedName);
  await copyFile(screenshotPath, archivedPath);
  return archivedPath;
}

async function clickNode(page: import("playwright").Page, node: A11yNode, opts?: { double?: boolean }) {
  const point = center(node.bounds);
  if (opts?.double) {
    await page.mouse.dblclick(point.x, point.y);
  } else {
    await page.mouse.click(point.x, point.y);
  }
}

async function clickByPredicate(
  callTool: ToolCaller,
  page: import("playwright").Page,
  sessionId: string,
  predicate: (node: A11yNode) => boolean,
  opts?: { double?: boolean }
) {
  const current = await observe(callTool, sessionId);
  const node = findNode(current.observation.a11yTree, predicate);
  await clickNode(page, node, opts);
  return node;
}

async function clickByPredicateWithRetry(
  callTool: ToolCaller,
  page: import("playwright").Page,
  sessionId: string,
  predicate: (node: A11yNode) => boolean,
  opts?: { double?: boolean; attempts?: number; waitMs?: number }
) {
  const attempts = opts?.attempts ?? 4;
  const waitMs = opts?.waitMs ?? 220;
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await clickByPredicate(callTool, page, sessionId, predicate, opts);
    } catch (error) {
      lastError = error;
      await waitForUi(page, waitMs);
    }
  }

  throw lastError ?? new Error("Required a11y node not found after retries.");
}

async function waitForNode(
  callTool: ToolCaller,
  sessionId: string,
  predicate: (node: A11yNode) => boolean,
  opts?: { attempts?: number; waitMs?: number }
) {
  const attempts = opts?.attempts ?? 6;
  const waitMs = opts?.waitMs ?? 220;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const current = await observe(callTool, sessionId);
    const match = flatten(current.observation.a11yTree).find(predicate);
    if (match) {
      return match;
    }
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
  throw new Error("Required a11y node did not appear.");
}

async function dragWindow(
  page: import("playwright").Page,
  viewerUrl: string,
  sessionId: string,
  windowId: string,
  delta: { x: number; y: number; steps?: number }
) {
  const render = await fetchRenderModel(viewerUrl, sessionId);
  const targetWindow = render.windows.find((window) => window.id === windowId);
  if (!targetWindow) {
    throw new Error(`Window ${windowId} not found in render model.`);
  }

  const dragStart = {
    x: targetWindow.titleBarBounds.x + Math.round(targetWindow.titleBarBounds.width / 2),
    y: targetWindow.titleBarBounds.y + Math.round(targetWindow.titleBarBounds.height / 2)
  };

  await page.mouse.move(dragStart.x, dragStart.y);
  await page.mouse.down();
  await page.mouse.move(dragStart.x + delta.x, dragStart.y + delta.y, {
    steps: delta.steps ?? 8
  });
  await page.mouse.up();
  await waitForUi(page, 180);
}

async function openFileFromExplorer(
  callTool: ToolCaller,
  page: import("playwright").Page,
  sessionId: string,
  fileName: string
) {
  await clickByPredicate(
    callTool,
    page,
    sessionId,
    (node) => node.role === "listitem" && node.name === fileName,
    { double: true }
  );
  await waitForUi(page, 340);
}

async function focusTextbox(
  callTool: ToolCaller,
  page: import("playwright").Page,
  sessionId: string,
  name: string
) {
  const node = await clickByPredicate(
    callTool,
    page,
    sessionId,
    (candidate) => candidate.role === "textbox" && candidate.name === name
  );
  await page.mouse.click(node.bounds.x + 12, node.bounds.y + 12);
  await waitForUi(page, 220);
}

async function saveOpenEditor(
  callTool: ToolCaller,
  page: import("playwright").Page,
  sessionId: string
) {
  await clickByPredicate(callTool, page, sessionId, (node) => node.role === "button" && node.name === "Save");
  await waitForUi(page, 260);
}

async function dismissPopupIfPresent(callTool: ToolCaller, page: import("playwright").Page, sessionId: string) {
  const current = await observe(callTool, sessionId);
  const dismiss = flatten(current.observation.a11yTree).find(
    (node) => node.role === "button" && node.name.toLowerCase() === "dismiss"
  );
  if (!dismiss) {
    return false;
  }
  await clickNode(page, dismiss);
  await waitForUi(page, 240);
  return true;
}

async function ensureMinSteps(
  callTool: ToolCaller,
  page: import("playwright").Page,
  sessionId: string,
  actionCycle: QaAction[],
  minSteps = MIN_STEPS_PER_SCENARIO
): Promise<MinStepResult> {
  let cycleIndex = 0;
  let recoveries = 0;
  const actionCounts: Record<string, number> = {};
  while (true) {
    const current = await observe(callTool, sessionId);
    if (current.stepIndex >= minSteps) {
      return {
        reachedStepIndex: current.stepIndex,
        actionsRun: cycleIndex,
        actionCounts,
        recoveries
      };
    }
    const action = actionCycle[cycleIndex % actionCycle.length];
    actionCounts[action.label] = (actionCounts[action.label] ?? 0) + 1;
    try {
      await action.run();
    } catch {
      recoveries += 1;
      await page.mouse.click(1196, 752);
      await waitForUi(page, 120);
    }
    await waitForUi(page, 100);
    cycleIndex += 1;
    if (cycleIndex > minSteps * 6) {
      throw new Error(`Could not reach ${minSteps} steps for session ${sessionId}.`);
    }
  }
}

async function scenarioBrowserHelpRecovery(
  callTool: ToolCaller,
  page: import("playwright").Page,
  sessionId: string
): Promise<QaScenarioResult> {
  logProgress("browser scenario start", { sessionId });
  const reset = await callTool<StepResult>("trainer.reset", {
    sessionId,
    taskId: "browser_capture_help_line",
    seed: 0,
    maxSteps: 0
  });

  await page.goto(reset.observation.viewerUrl!, { waitUntil: "domcontentloaded" });
  await waitForUi(page, 320);
  const artifacts: string[] = [];
  artifacts.push(await screenshot(page, "browser-recovery-reset"));

  await clickByPredicate(callTool, page, sessionId, (node) => node.role === "listitem" && node.name === "OS");
  await waitForUi(page, 180);
  await clickByPredicate(callTool, page, sessionId, (node) => node.role === "listitem" && node.name === "Chrome");
  await waitForUi(page, 180);
  await clickByPredicate(callTool, page, sessionId, (node) => node.role === "listitem" && node.name === "Ubuntu Docs");
  await waitForUi(page, 180);
  artifacts.push(await screenshot(page, "browser-recovery-wrong-path"));

  await clickByPredicate(callTool, page, sessionId, (node) => node.role === "button" && node.name === "Ubuntu help");
  await waitForUi(page, 220);
  await clickByPredicate(callTool, page, sessionId, (node) => node.role === "label" && node.name === "Help line 2");
  await sendHotkey(callTool, sessionId, ["ctrl", "c"]);
  await waitForUi(page, 220);
  artifacts.push(await screenshot(page, "browser-recovery-help-selected"));

  await openFileFromExplorer(callTool, page, sessionId, "ubuntu-help.txt");
  await focusTextbox(callTool, page, sessionId, "ubuntu-help.txt");
  await sendHotkey(callTool, sessionId, ["ctrl", "v"]);
  await waitForUi(page, 220);
  await saveOpenEditor(callTool, page, sessionId);
  artifacts.push(await screenshot(page, "browser-recovery-saved"));
  logProgress("browser scenario saved");

  const minSteps = await ensureMinSteps(callTool, page, sessionId, [
    {
      label: "browser-tab-explorer",
      run: async () => {
        await clickByPredicate(callTool, page, sessionId, (node) => node.role === "button" && node.name === "Task Board");
      }
    },
    {
      label: "browser-tab-help",
      run: async () => {
        await clickByPredicate(callTool, page, sessionId, (node) => node.role === "button" && node.name === "Ubuntu help");
      }
    },
    {
      label: "browser-bookmark-docs",
      run: async () => {
        await clickByPredicate(callTool, page, sessionId, (node) => node.role === "listitem" && node.name === "Ubuntu Docs");
      }
    },
    {
      label: "files-place-home",
      run: async () => {
        await clickByPredicate(callTool, page, sessionId, (node) => node.role === "listitem" && node.name === "Home");
      }
    },
    {
      label: "files-place-downloads",
      run: async () => {
        await clickByPredicate(callTool, page, sessionId, (node) => node.role === "listitem" && node.name === "Downloads");
      }
    },
    {
      label: "files-place-workspace",
      run: async () => {
        await clickByPredicate(callTool, page, sessionId, (node) => node.role === "listitem" && node.name === "workspace");
      }
    },
    {
      label: "files-select-target",
      run: async () => {
        await clickByPredicate(callTool, page, sessionId, (node) => node.role === "listitem" && node.name === "ubuntu-help.txt");
      }
    },
    {
      label: "files-select-other",
      run: async () => {
        await clickByPredicate(callTool, page, sessionId, (node) => node.role === "listitem" && node.name === "todo.txt");
      }
    },
    {
      label: "drag-files-window",
      run: async () => {
        await dragWindow(page, reset.observation.viewerUrl!, sessionId, "explorer-main", { x: 54, y: 22 });
      }
    },
    {
      label: "drag-files-window-back",
      run: async () => {
        await dragWindow(page, reset.observation.viewerUrl!, sessionId, "explorer-main", { x: -48, y: -18 });
      }
    }
  ]);
  logProgress("browser scenario reached min steps", {
    sessionId,
    reachedStepIndex: minSteps.reachedStepIndex,
    actionsRun: minSteps.actionsRun
  });
  await writeCheckpoint("browser-help-recovery-copy-paste", "post-min-steps", {
    sessionId,
    reachedStepIndex: minSteps.reachedStepIndex,
    actionsRun: minSteps.actionsRun,
    actionCounts: minSteps.actionCounts
  });

  await clickByPredicate(callTool, page, sessionId, (node) => node.role === "button" && node.name === "Ubuntu help");
  await waitForUi(page, 180);
  logProgress("browser scenario before DONE", { sessionId });

  const final = await callTool<StepResult>("computer13.step", {
    sessionId,
    action: { type: "DONE" }
  });
  logProgress("browser scenario after DONE", {
    sessionId,
    finalStepIndex: final.stepIndex,
    finalReward: final.cumulativeReward,
    terminated: final.terminated
  });
  const archivedFinalScreenshotPath = await archiveObservationScreenshot(
    final.observation.screenshotPath,
    "browser-recovery-final.png"
  );

  return {
    name: "browser-help-recovery-copy-paste",
    passed:
      final.terminated &&
      !final.truncated &&
      final.cumulativeReward > 0 &&
      minSteps.reachedStepIndex >= MIN_STEPS_PER_SCENARIO,
    details: {
      finalReward: final.cumulativeReward,
      finalStepIndex: final.stepIndex,
      exploratoryActionsRun: minSteps.actionsRun,
      exploratoryActionCounts: minSteps.actionCounts,
      exploratoryRecoveries: minSteps.recoveries,
      reachedStepIndex: minSteps.reachedStepIndex,
      screenshotPath: archivedFinalScreenshotPath,
      originalScreenshotPath: final.observation.screenshotPath,
      artifacts
    }
  };
}

async function scenarioMailPerturbationRecovery(
  callTool: ToolCaller,
  page: import("playwright").Page,
  sessionId: string
): Promise<QaScenarioResult> {
  logProgress("mail scenario start", { sessionId });
  const reset = await callTool<StepResult>("trainer.reset", {
    sessionId,
    taskId: "mail_extract_mock_note",
    seed: 0,
    maxSteps: 0
  });

  await page.goto(reset.observation.viewerUrl!, { waitUntil: "domcontentloaded" });
  await waitForUi(page, 320);
  const artifacts: string[] = [];
  artifacts.push(await screenshot(page, "mail-recovery-reset"));

  await clickByPredicate(
    callTool,
    page,
    sessionId,
    (node) => node.role === "listitem" && node.name.includes("Ubuntu desktop task pack")
  );
  await waitForUi(page, 180);
  await clickByPredicate(callTool, page, sessionId, (node) => node.role === "listitem" && node.name === "Archive");
  await waitForUi(page, 180);
  await clickByPredicate(callTool, page, sessionId, (node) => node.role === "listitem" && node.name === "Inbox");
  await waitForUi(page, 180);
  await callTool("trainer.apply_perturbation", {
    sessionId,
    op: "PopupInject",
    params: {
      title: "Injected popup",
      message: "Noise added during adversarial QA."
    }
  });
  await waitForUi(page, 240);
  artifacts.push(await screenshot(page, "mail-recovery-popup"));
  await dismissPopupIfPresent(callTool, page, sessionId);

  await clickByPredicate(
    callTool,
    page,
    sessionId,
    (node) => node.role === "listitem" && node.name.includes("Workspace notes")
  );
  await waitForUi(page, 220);
  await clickByPredicate(callTool, page, sessionId, (node) => node.role === "label" && node.name === "Preview line 2");
  await sendHotkey(callTool, sessionId, ["ctrl", "c"]);
  await waitForUi(page, 220);
  await callTool("trainer.apply_perturbation", {
    sessionId,
    op: "MinimizeAll"
  });
  await waitForUi(page, 260);
  artifacts.push(await screenshot(page, "mail-recovery-minimized"));

  await clickByPredicate(callTool, page, sessionId, (node) => node.role === "icon" && /files/i.test(node.name));
  await waitForUi(page, 260);
  await openFileFromExplorer(callTool, page, sessionId, "mail-log.txt");
  await focusTextbox(callTool, page, sessionId, "mail-log.txt");
  await sendHotkey(callTool, sessionId, ["ctrl", "v"]);
  await waitForUi(page, 220);
  await saveOpenEditor(callTool, page, sessionId);
  artifacts.push(await screenshot(page, "mail-recovery-saved"));
  logProgress("mail scenario saved");

  const minSteps = await ensureMinSteps(callTool, page, sessionId, [
    {
      label: "mail-dock-icon",
      run: async () => {
        await clickByPredicate(callTool, page, sessionId, (node) => node.role === "icon" && /thunderbird|mail/i.test(node.name));
      }
    },
    {
      label: "mail-folder-inbox",
      run: async () => {
        await clickByPredicate(callTool, page, sessionId, (node) => node.role === "listitem" && node.name === "Inbox");
      }
    },
    {
      label: "mail-folder-drafts",
      run: async () => {
        await clickByPredicate(callTool, page, sessionId, (node) => node.role === "listitem" && node.name === "Drafts");
      }
    },
    {
      label: "mail-folder-archive",
      run: async () => {
        await clickByPredicate(callTool, page, sessionId, (node) => node.role === "listitem" && node.name === "Archive");
      }
    },
    {
      label: "files-place-home",
      run: async () => {
        await clickByPredicate(callTool, page, sessionId, (node) => node.role === "listitem" && node.name === "Home");
      }
    },
    {
      label: "files-place-workspace",
      run: async () => {
        await clickByPredicate(callTool, page, sessionId, (node) => node.role === "listitem" && node.name === "workspace");
      }
    },
    {
      label: "files-select-target",
      run: async () => {
        await clickByPredicate(callTool, page, sessionId, (node) => node.role === "listitem" && node.name === "mail-log.txt");
      }
    },
    {
      label: "files-select-reference",
      run: async () => {
        await clickByPredicate(callTool, page, sessionId, (node) => node.role === "listitem" && node.name === "reference.txt");
      }
    },
    {
      label: "drag-files-window",
      run: async () => {
        await dragWindow(page, reset.observation.viewerUrl!, sessionId, "explorer-main", { x: 52, y: 20 });
      }
    },
    {
      label: "drag-files-window-back",
      run: async () => {
        await dragWindow(page, reset.observation.viewerUrl!, sessionId, "explorer-main", { x: -44, y: -18 });
      }
    }
  ]);
  logProgress("mail scenario reached min steps", {
    sessionId,
    reachedStepIndex: minSteps.reachedStepIndex,
    actionsRun: minSteps.actionsRun
  });
  await writeCheckpoint("mail-perturbation-recovery-copy-paste", "post-min-steps", {
    sessionId,
    reachedStepIndex: minSteps.reachedStepIndex,
    actionsRun: minSteps.actionsRun,
    actionCounts: minSteps.actionCounts
  });

  await waitForUi(page, 420);
  await clickByPredicateWithRetry(
    callTool,
    page,
    sessionId,
    (node) => node.role === "icon" && /thunderbird|mail/i.test(node.name)
  );
  await waitForUi(page, 180);
  await clickByPredicateWithRetry(callTool, page, sessionId, (node) => node.role === "listitem" && node.name === "Inbox");
  await waitForUi(page, 180);
  await clickByPredicateWithRetry(
    callTool,
    page,
    sessionId,
    (node) => node.role === "listitem" && node.name.includes("Workspace notes"),
    { attempts: 6, waitMs: 260 }
  );
  await waitForUi(page, 360);
  await waitForNode(
    callTool,
    sessionId,
    (node) =>
      node.role === "listitem" &&
      node.name.includes("Workspace notes") &&
      node.focused,
    { attempts: 6, waitMs: 220 }
  );
  logProgress("mail scenario before DONE", { sessionId });

  const final = await callTool<StepResult>("computer13.step", {
    sessionId,
    action: { type: "DONE" }
  });
  logProgress("mail scenario after DONE", {
    sessionId,
    finalStepIndex: final.stepIndex,
    finalReward: final.cumulativeReward,
    terminated: final.terminated
  });
  const archivedFinalScreenshotPath = await archiveObservationScreenshot(
    final.observation.screenshotPath,
    "mail-recovery-final.png"
  );

  return {
    name: "mail-perturbation-recovery-copy-paste",
    passed:
      final.terminated &&
      !final.truncated &&
      final.cumulativeReward > 0 &&
      minSteps.reachedStepIndex >= MIN_STEPS_PER_SCENARIO,
    details: {
      finalReward: final.cumulativeReward,
      finalStepIndex: final.stepIndex,
      exploratoryActionsRun: minSteps.actionsRun,
      exploratoryActionCounts: minSteps.actionCounts,
      exploratoryRecoveries: minSteps.recoveries,
      reachedStepIndex: minSteps.reachedStepIndex,
      screenshotPath: archivedFinalScreenshotPath,
      originalScreenshotPath: final.observation.screenshotPath,
      artifacts
    }
  };
}

async function scenarioTerminalRecovery(
  callTool: ToolCaller,
  page: import("playwright").Page,
  sessionId: string
): Promise<QaScenarioResult> {
  logProgress("terminal scenario start", { sessionId });
  const reset = await callTool<StepResult>("trainer.reset", {
    sessionId,
    taskId: "terminal_record_working_directory",
    seed: 0,
    maxSteps: 0
  });

  await page.goto(reset.observation.viewerUrl!, { waitUntil: "domcontentloaded" });
  await waitForUi(page, 320);
  const artifacts: string[] = [];
  artifacts.push(await screenshot(page, "terminal-recovery-reset"));

  await clickByPredicate(callTool, page, sessionId, (node) => node.role === "textbox" && node.name === "Terminal session");
  await waitForUi(page, 180);
  await sendTyping(callTool, sessionId, "ls");
  await sendPress(callTool, sessionId, "enter");
  await waitForUi(page, 220);
  await sendTyping(callTool, sessionId, "pwd");
  await sendPress(callTool, sessionId, "enter");
  await waitForUi(page, 260);
  artifacts.push(await screenshot(page, "terminal-recovery-commands"));

  await clickByPredicate(
    callTool,
    page,
    sessionId,
    (node) => node.role === "label" && node.text === "/workspace"
  );
  await sendHotkey(callTool, sessionId, ["ctrl", "c"]);
  await waitForUi(page, 220);
  await callTool("trainer.apply_perturbation", {
    sessionId,
    op: "MinimizeAll"
  });
  await waitForUi(page, 260);
  artifacts.push(await screenshot(page, "terminal-recovery-minimized"));

  await clickByPredicate(callTool, page, sessionId, (node) => node.role === "icon" && /files/i.test(node.name));
  await waitForUi(page, 240);
  await openFileFromExplorer(callTool, page, sessionId, "terminal-log.txt");
  await focusTextbox(callTool, page, sessionId, "terminal-log.txt");
  await sendHotkey(callTool, sessionId, ["ctrl", "v"]);
  await waitForUi(page, 220);
  await saveOpenEditor(callTool, page, sessionId);
  artifacts.push(await screenshot(page, "terminal-recovery-saved"));
  logProgress("terminal scenario saved");

  const minSteps = await ensureMinSteps(callTool, page, sessionId, [
    {
      label: "terminal-dock-icon",
      run: async () => {
        await clickByPredicate(callTool, page, sessionId, (node) => node.role === "icon" && /terminal/i.test(node.name));
      }
    },
    {
      label: "terminal-focus-textbox",
      run: async () => {
        await clickByPredicate(callTool, page, sessionId, (node) => node.role === "textbox" && node.name === "Terminal session");
      }
    },
    {
      label: "files-place-home",
      run: async () => {
        await clickByPredicate(callTool, page, sessionId, (node) => node.role === "listitem" && node.name === "Home");
      }
    },
    {
      label: "files-place-workspace",
      run: async () => {
        await clickByPredicate(callTool, page, sessionId, (node) => node.role === "listitem" && node.name === "workspace");
      }
    },
    {
      label: "files-select-target",
      run: async () => {
        await clickByPredicate(callTool, page, sessionId, (node) => node.role === "listitem" && node.name === "terminal-log.txt");
      }
    },
    {
      label: "files-select-runbook",
      run: async () => {
        await clickByPredicate(callTool, page, sessionId, (node) => node.role === "listitem" && node.name === "runbook.txt");
      }
    },
    {
      label: "drag-files-window",
      run: async () => {
        await dragWindow(page, reset.observation.viewerUrl!, sessionId, "explorer-main", { x: 52, y: 18 });
      }
    },
    {
      label: "drag-files-window-back",
      run: async () => {
        await dragWindow(page, reset.observation.viewerUrl!, sessionId, "explorer-main", { x: -46, y: -16 });
      }
    },
    {
      label: "drag-editor-window",
      run: async () => {
        const render = await fetchRenderModel(reset.observation.viewerUrl!, sessionId);
        const noteWindow = render.windows.find((window) => window.title === "terminal-log.txt");
        if (!noteWindow) {
          throw new Error("terminal-log.txt window not found for drag.");
        }
        await dragWindow(page, reset.observation.viewerUrl!, sessionId, noteWindow.id, { x: 36, y: 14 });
      }
    },
    {
      label: "drag-editor-window-back",
      run: async () => {
        const render = await fetchRenderModel(reset.observation.viewerUrl!, sessionId);
        const noteWindow = render.windows.find((window) => window.title === "terminal-log.txt");
        if (!noteWindow) {
          throw new Error("terminal-log.txt window not found for drag.");
        }
        await dragWindow(page, reset.observation.viewerUrl!, sessionId, noteWindow.id, { x: -32, y: -12 });
      }
    }
  ]);
  logProgress("terminal scenario reached min steps", {
    sessionId,
    reachedStepIndex: minSteps.reachedStepIndex,
    actionsRun: minSteps.actionsRun
  });
  await writeCheckpoint("terminal-recovery-copy-paste", "post-min-steps", {
    sessionId,
    reachedStepIndex: minSteps.reachedStepIndex,
    actionsRun: minSteps.actionsRun,
    actionCounts: minSteps.actionCounts
  });
  logProgress("terminal scenario before DONE", { sessionId });

  const final = await callTool<StepResult>("computer13.step", {
    sessionId,
    action: { type: "DONE" }
  });
  logProgress("terminal scenario after DONE", {
    sessionId,
    finalStepIndex: final.stepIndex,
    finalReward: final.cumulativeReward,
    terminated: final.terminated
  });
  const archivedFinalScreenshotPath = await archiveObservationScreenshot(
    final.observation.screenshotPath,
    "terminal-recovery-final.png"
  );

  return {
    name: "terminal-recovery-copy-paste",
    passed:
      final.terminated &&
      !final.truncated &&
      final.cumulativeReward > 0 &&
      minSteps.reachedStepIndex >= MIN_STEPS_PER_SCENARIO,
    details: {
      finalReward: final.cumulativeReward,
      finalStepIndex: final.stepIndex,
      exploratoryActionsRun: minSteps.actionsRun,
      exploratoryActionCounts: minSteps.actionCounts,
      exploratoryRecoveries: minSteps.recoveries,
      reachedStepIndex: minSteps.reachedStepIndex,
      screenshotPath: archivedFinalScreenshotPath,
      originalScreenshotPath: final.observation.screenshotPath,
      artifacts
    }
  };
}

async function main() {
  if (!existsSync(serverEntry)) {
    throw new Error(`Built MCP server not found at ${serverEntry}. Run npm run build first.`);
  }

  await mkdir(runDir, { recursive: true });

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
      name: "os-mock-osworld-adversarial-qa",
      version: "0.1.0"
    },
    {
      capabilities: {}
    }
  );

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const callTool = createQueuedToolCaller(client);

  let sessionIds: string[] = [];

  try {
    await client.connect(transport);
    logProgress("client connected", { runId, runDir });

    const created = await Promise.all([
      callTool<{ sessionId: string; viewerUrl: string }>("trainer.create_session", {}),
      callTool<{ sessionId: string; viewerUrl: string }>("trainer.create_session", {}),
      callTool<{ sessionId: string; viewerUrl: string }>("trainer.create_session", {})
    ]);
    logProgress("sessions created", { sessionIds: created.map((item) => item.sessionId) });

    sessionIds = created.map((item) => item.sessionId);

    const pages = await Promise.all([context.newPage(), context.newPage(), context.newPage()]);
    const [browserResult, mailResult, terminalResult] = await Promise.all([
      scenarioBrowserHelpRecovery(callTool, pages[0], sessionIds[0]),
      scenarioMailPerturbationRecovery(callTool, pages[1], sessionIds[1]),
      scenarioTerminalRecovery(callTool, pages[2], sessionIds[2])
    ]);

    const results = [browserResult, mailResult, terminalResult];
    const report = {
      generatedAt: new Date().toISOString(),
      runId,
      runDir,
      minStepsPerScenario: MIN_STEPS_PER_SCENARIO,
      parallelScenarios: results.length,
      passed: results.every((result) => result.passed),
      results
    };

    await writeFile(resolve(runDir, "report.json"), JSON.stringify(report, null, 2));
    await writeFile(resolve(artifactRootDir, "report.json"), JSON.stringify(report, null, 2));
    logProgress("report written", { runId, passed: report.passed });
    console.log(JSON.stringify(report, null, 2));

    if (!report.passed) {
      process.exitCode = 1;
    }
  } finally {
    for (const sessionId of sessionIds) {
      try {
        await callTool("trainer.close_session", { sessionId });
      } catch {
        // ignore cleanup failures
      }
    }
    await client.close();
    await context.close();
    await browser.close();
  }
}

void main();
