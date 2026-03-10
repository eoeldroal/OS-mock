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
const artifactDir = resolve(rootDir, "output", "playwright", "representative-qa");

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

async function observe(client: Client, sessionId: string) {
  return callTool<StepResult>(client, "computer13.observe", { sessionId });
}

async function scenarioBrowserWorkflow(client: Client, page: import("playwright").Page, sessionId: string) {
  const reset = await callTool<StepResult>(client, "trainer.reset", {
    sessionId,
    taskId: "browser_log_workflow_task_id",
    seed: 0
  });

  await page.goto(reset.observation.viewerUrl!, { waitUntil: "domcontentloaded" });
  await waitForUi(page, 350);
  const artifacts: string[] = [];
  artifacts.push(await screenshot(page, "browser-workflow-reset"));

  await page.getByText("Workflow", { exact: true }).click();
  await waitForUi(page, 300);
  await page.getByText("Bridge a Thunderbird summary into notes", { exact: true }).click();
  await waitForUi(page, 300);
  artifacts.push(await screenshot(page, "browser-workflow-selected"));

  await page.getByText("browser-log.txt", { exact: true }).first().dblclick();
  await waitForUi(page, 360);
  let observed = await observe(client, sessionId);
  const textBox = findNode(
    observed.observation.a11yTree,
    (node) => node.role === "textbox" && node.name === "browser-log.txt"
  );
  await page.mouse.click(textBox.bounds.x + 10, textBox.bounds.y + 10);
  await waitForUi(page, 250);
  await page.keyboard.type("workflow_mail_bridge", { delay: 30 });
  await waitForUi(page, 300);
  artifacts.push(await screenshot(page, "browser-workflow-typed"));

  await page.getByRole("button", { name: "Save" }).click();
  await waitForUi(page, 320);
  artifacts.push(await screenshot(page, "browser-workflow-saved"));

  const final = await callTool<StepResult>(client, "computer13.step", {
    sessionId,
    action: { type: "DONE" }
  });

  return {
    name: "browser-workflow-task-id",
    passed: final.terminated && !final.truncated && final.cumulativeReward > 0,
    details: {
      finalReward: final.cumulativeReward,
      screenshotPath: final.observation.screenshotPath,
      artifacts
    }
  } satisfies QaScenarioResult;
}

async function scenarioBrowserHelp(client: Client, page: import("playwright").Page, sessionId: string) {
  const reset = await callTool<StepResult>(client, "trainer.reset", {
    sessionId,
    taskId: "browser_capture_help_line",
    seed: 0
  });

  await page.goto(reset.observation.viewerUrl!, { waitUntil: "domcontentloaded" });
  await waitForUi(page, 350);
  const artifacts: string[] = [];
  artifacts.push(await screenshot(page, "browser-help-reset"));

  await page.getByText("Ubuntu help", { exact: true }).click();
  await waitForUi(page, 300);
  artifacts.push(await screenshot(page, "browser-help-tab"));

  await page.getByText("ubuntu-help.txt", { exact: true }).first().dblclick();
  await waitForUi(page, 360);
  const observed = await observe(client, sessionId);
  const textBox = findNode(
    observed.observation.a11yTree,
    (node) => node.role === "textbox" && node.name === "ubuntu-help.txt"
  );
  await page.mouse.click(textBox.bounds.x + 10, textBox.bounds.y + 10);
  await waitForUi(page, 250);
  await page.keyboard.type(
    "Use the dock to switch between Files, Text Editor, Terminal, Firefox, and Thunderbird.",
    { delay: 24 }
  );
  await waitForUi(page, 300);
  artifacts.push(await screenshot(page, "browser-help-typed"));

  await page.getByRole("button", { name: "Save" }).click();
  await waitForUi(page, 320);
  artifacts.push(await screenshot(page, "browser-help-saved"));

  const final = await callTool<StepResult>(client, "computer13.step", {
    sessionId,
    action: { type: "DONE" }
  });

  return {
    name: "browser-help-line-capture",
    passed: final.terminated && !final.truncated && final.cumulativeReward > 0,
    details: {
      finalReward: final.cumulativeReward,
      screenshotPath: final.observation.screenshotPath,
      artifacts
    }
  } satisfies QaScenarioResult;
}

async function scenarioMail(client: Client, page: import("playwright").Page, sessionId: string) {
  const reset = await callTool<StepResult>(client, "trainer.reset", {
    sessionId,
    taskId: "mail_extract_mock_note",
    seed: 0
  });

  await page.goto(reset.observation.viewerUrl!, { waitUntil: "domcontentloaded" });
  await waitForUi(page, 350);
  const artifacts: string[] = [];
  artifacts.push(await screenshot(page, "mail-reset"));

  let observed = await observe(client, sessionId);
  const messageNode = findNode(
    observed.observation.a11yTree,
    (node) => node.role === "listitem" && node.name.includes("Mock environment notes")
  );
  const messageCenter = center(messageNode.bounds);
  await page.mouse.click(messageCenter.x, messageCenter.y);
  await waitForUi(page, 300);
  artifacts.push(await screenshot(page, "mail-message-selected"));

  await page.getByText("mail-log.txt", { exact: true }).first().dblclick();
  await waitForUi(page, 360);
  observed = await observe(client, sessionId);
  const textBox = findNode(
    observed.observation.a11yTree,
    (node) => node.role === "textbox" && node.name === "mail-log.txt"
  );
  await page.mouse.click(textBox.bounds.x + 10, textBox.bounds.y + 10);
  await waitForUi(page, 250);
  await page.keyboard.type("Remember to test perturbations while the viewer is open.", { delay: 28 });
  await waitForUi(page, 300);
  artifacts.push(await screenshot(page, "mail-typed"));

  await page.getByRole("button", { name: "Save" }).click();
  await waitForUi(page, 320);
  artifacts.push(await screenshot(page, "mail-saved"));

  const final = await callTool<StepResult>(client, "computer13.step", {
    sessionId,
    action: { type: "DONE" }
  });

  return {
    name: "mail-reminder-capture",
    passed: final.terminated && !final.truncated && final.cumulativeReward > 0,
    details: {
      finalReward: final.cumulativeReward,
      screenshotPath: final.observation.screenshotPath,
      artifacts
    }
  } satisfies QaScenarioResult;
}

async function scenarioTerminal(client: Client, page: import("playwright").Page, sessionId: string) {
  const reset = await callTool<StepResult>(client, "trainer.reset", {
    sessionId,
    taskId: "terminal_record_working_directory",
    seed: 0
  });

  await page.goto(reset.observation.viewerUrl!, { waitUntil: "domcontentloaded" });
  await waitForUi(page, 350);
  const artifacts: string[] = [];
  artifacts.push(await screenshot(page, "terminal-reset"));

  let observed = await observe(client, sessionId);
  const terminal = findNode(
    observed.observation.a11yTree,
    (node) => node.role === "textbox" && node.name === "Terminal session"
  );
  await page.mouse.click(terminal.bounds.x + 12, terminal.bounds.y + 12);
  await waitForUi(page, 250);
  await page.keyboard.type("pwd", { delay: 40 });
  await page.keyboard.press("Enter");
  await waitForUi(page, 320);
  artifacts.push(await screenshot(page, "terminal-command-ran"));

  await page.getByText("terminal-log.txt", { exact: true }).first().dblclick();
  await waitForUi(page, 360);
  observed = await observe(client, sessionId);
  const textBox = findNode(
    observed.observation.a11yTree,
    (node) => node.role === "textbox" && node.name === "terminal-log.txt"
  );
  await page.mouse.click(textBox.bounds.x + 10, textBox.bounds.y + 10);
  await waitForUi(page, 250);
  await page.keyboard.type("/workspace", { delay: 28 });
  await waitForUi(page, 300);
  artifacts.push(await screenshot(page, "terminal-typed"));

  await page.getByRole("button", { name: "Save" }).click();
  await waitForUi(page, 320);
  artifacts.push(await screenshot(page, "terminal-saved"));

  const final = await callTool<StepResult>(client, "computer13.step", {
    sessionId,
    action: { type: "DONE" }
  });

  return {
    name: "terminal-working-directory-capture",
    passed: final.terminated && !final.truncated && final.cumulativeReward > 0,
    details: {
      finalReward: final.cumulativeReward,
      screenshotPath: final.observation.screenshotPath,
      artifacts
    }
  } satisfies QaScenarioResult;
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
      name: "os-mock-representative-qa",
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
    const sessionId = created.sessionId;

    results.push(await scenarioBrowserWorkflow(client, page, sessionId));
    results.push(await scenarioBrowserHelp(client, page, sessionId));
    results.push(await scenarioMail(client, page, sessionId));
    results.push(await scenarioTerminal(client, page, sessionId));

    const taskList = await callTool(client, "trainer.list_tasks", { split: "representative" });
    const report = {
      generatedAt: new Date().toISOString(),
      sessionId,
      viewerUrl: created.viewerUrl,
      representativeTaskCount: Array.isArray(taskList) ? taskList.length : undefined,
      passed: results.every((result) => result.passed),
      results
    };

    const reportPath = resolve(artifactDir, "report.json");
    await writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));

    await callTool(client, "trainer.close_session", { sessionId });
  } finally {
    await browser.close();
    await client.close();
    await transport.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
