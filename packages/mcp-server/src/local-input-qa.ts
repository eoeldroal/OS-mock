import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { chromium } from "playwright";
import type { A11yNode, StepResult } from "../../core/src/types.js";

type CallToolResult = {
  content?: Array<{ type?: string; text?: string }>;
};

type QaScenarioResult = {
  name: string;
  passed: boolean;
  details: Record<string, unknown>;
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "../../..");
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

async function waitForUi(page: import("playwright").Page, timeout = 260) {
  await page.waitForTimeout(timeout);
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

  await page.getByText("todo.txt", { exact: true }).first().dblclick();
  await waitForUi(page, 360);
  artifacts.push(await screenshot(page, "scenario1-note-opened"));

  let observed = await callTool<StepResult>(client, "computer13.observe", { sessionId });
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
