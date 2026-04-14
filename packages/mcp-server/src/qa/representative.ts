import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { chromium } from "playwright";
import {
  BROWSER_HELP_TOPICS,
  getBrowserTask,
  getBrowserTaskCategory
} from "../../../core/src/browser-fixtures.js";
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
        }
      >;
    };
  };
  targets: {
    targetFileId?: string;
    targetCategoryId?: string;
    targetBrowserTaskId?: string;
    targetMessageId?: string;
    targetCommand?: string;
    targetCommandOutput?: string;
    appendText?: string;
    expectedSavedContent?: string;
  };
};

const TASK_IDS = {
  browserWorkflow: "browser_log_task_preopen_note_hard",
  browserHelp: "browser_help_preopen_note_distractors",
  mail: "mail_extract_mock_note",
  terminal: "terminal_record_working_directory"
} as const;

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "../../../..");
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

function getBrowserHelpTopicByLine(line: string) {
  return BROWSER_HELP_TOPICS.find((topic) => topic.lines.includes(line));
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

async function focusNoteTextboxByIcon(
  client: Client,
  page: import("playwright").Page,
  sessionId: string,
  fileName: string
) {
  const observed = await observe(client, sessionId);
  const taskbarIcon = findNode(
    observed.observation.a11yTree,
    (node) => node.role === "icon" && node.name === fileName
  );
  await page.mouse.click(
    taskbarIcon.bounds.x + Math.round(taskbarIcon.bounds.width / 2),
    taskbarIcon.bounds.y + Math.round(taskbarIcon.bounds.height / 2)
  );
  await waitForUi(page, 260);
  const refreshed = await observe(client, sessionId);
  return findNode(
    refreshed.observation.a11yTree,
    (node) => node.role === "textbox" && node.name === fileName
  );
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

async function scenarioBrowserWorkflow(client: Client, page: import("playwright").Page, sessionId: string) {
  const reset = await callTool<StepResult>(client, "trainer.reset", {
    sessionId,
    taskId: TASK_IDS.browserWorkflow,
    seed: 0
  });
  const hidden = await getHiddenState(client, sessionId);
  const targetFileName = getTargetFileName(hidden);
  const targetCategory = getBrowserTaskCategory(hidden.targets.targetCategoryId ?? "");
  const targetTask = getBrowserTask(hidden.targets.targetCategoryId ?? "", hidden.targets.targetBrowserTaskId ?? "");
  const appendText = hidden.targets.appendText ?? targetTask.id;
  const expectedSavedContent = hidden.targets.expectedSavedContent ?? appendText;

  await page.goto(reset.observation.viewerUrl!, { waitUntil: "domcontentloaded" });
  await waitForUi(page, 350);
  const artifacts: string[] = [];
  artifacts.push(await screenshot(page, "browser-workflow-reset"));

  const explorerTab = findNode(
    reset.observation.a11yTree,
    (node) => node.role === "button" && node.name === "Task Board"
  );
  await page.mouse.click(
    explorerTab.bounds.x + Math.round(explorerTab.bounds.width / 2),
    explorerTab.bounds.y + Math.round(explorerTab.bounds.height / 2)
  );
  await waitForUi(page, 300);

  const { node: workflowNode } = await waitForObservedNode(
    client,
    page,
    sessionId,
    (node) => node.role === "listitem" && node.name === targetCategory.label
  );
  await page.mouse.click(
    workflowNode.bounds.x + Math.round(workflowNode.bounds.width / 2),
    workflowNode.bounds.y + Math.round(workflowNode.bounds.height / 2)
  );
  await waitForUi(page, 300);
  const { node: taskOneNode } = await waitForObservedNode(
    client,
    page,
    sessionId,
    (node) => node.role === "listitem" && node.name === targetTask.title
  );
  await page.mouse.click(
    taskOneNode.bounds.x + Math.round(taskOneNode.bounds.width / 2),
    taskOneNode.bounds.y + Math.round(taskOneNode.bounds.height / 2)
  );
  await waitForUi(page, 300);
  artifacts.push(await screenshot(page, "browser-workflow-selected"));

  const textBox = await focusNoteTextboxByIcon(client, page, sessionId, targetFileName);
  await page.mouse.click(textBox.bounds.x + textBox.bounds.width - 12, textBox.bounds.y + textBox.bounds.height - 12);
  await waitForUi(page, 250);
  await page.keyboard.type(appendText, { delay: 30 });
  await waitForUi(page, 300);
  artifacts.push(await screenshot(page, "browser-workflow-typed"));

  await page.getByRole("button", { name: "Save" }).click();
  await waitForUi(page, 320);
  artifacts.push(await screenshot(page, "browser-workflow-saved"));

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
    name: "browser-workflow-task-id",
    passed:
      joined === expectedSavedContent &&
      final.terminated &&
      !final.truncated &&
      final.cumulativeReward > 0,
    details: {
      targetCategory: targetCategory.label,
      targetTaskTitle: targetTask.title,
      targetTaskId: targetTask.id,
      joined,
      finalReward: final.cumulativeReward,
      screenshotPath: final.observation.screenshotPath,
      artifacts
    }
  } satisfies QaScenarioResult;
}

async function scenarioBrowserHelp(client: Client, page: import("playwright").Page, sessionId: string) {
  const reset = await callTool<StepResult>(client, "trainer.reset", {
    sessionId,
    taskId: TASK_IDS.browserHelp,
    seed: 0
  });
  const hidden = await getHiddenState(client, sessionId);
  const targetFileName = getTargetFileName(hidden);
  const appendText = hidden.targets.appendText ?? "";
  const expectedSavedContent = hidden.targets.expectedSavedContent ?? appendText;
  const topic = getBrowserHelpTopicByLine(appendText);

  await page.goto(reset.observation.viewerUrl!, { waitUntil: "domcontentloaded" });
  await waitForUi(page, 350);
  const artifacts: string[] = [];
  artifacts.push(await screenshot(page, "browser-help-reset"));

  const { node: explorerTab } = await waitForObservedNode(
    client,
    page,
    sessionId,
    (node) => node.role === "button" && node.name === "Task Board"
  );
  await page.mouse.click(
    explorerTab.bounds.x + Math.round(explorerTab.bounds.width / 2),
    explorerTab.bounds.y + Math.round(explorerTab.bounds.height / 2)
  );
  await waitForUi(page, 300);

  const { node: docsBookmark } = await waitForObservedNode(
    client,
    page,
    sessionId,
    (node) => node.role === "listitem" && node.name === "Ubuntu Docs"
  );
  await page.mouse.click(
    docsBookmark.bounds.x + Math.round(docsBookmark.bounds.width / 2),
    docsBookmark.bounds.y + Math.round(docsBookmark.bounds.height / 2)
  );
  await waitForUi(page, 300);
  artifacts.push(await screenshot(page, "browser-help-tab"));

  if (topic) {
    const { node: topicNode } = await waitForObservedNode(
      client,
      page,
      sessionId,
      (node) => node.role === "listitem" && node.name === topic.title
    );
    await page.mouse.click(topicNode.bounds.x + Math.round(topicNode.bounds.width / 2), topicNode.bounds.y + 18);
    await waitForUi(page, 250);
  }

  const observed = await observe(client, sessionId);
  const helpLine = findNode(
    observed.observation.a11yTree,
    (node) => node.role === "label" && node.text === appendText
  );
  await page.mouse.click(helpLine.bounds.x + 12, helpLine.bounds.y + Math.round(helpLine.bounds.height / 2));
  await waitForUi(page, 200);
  await page.keyboard.press("Control+C");
  await waitForUi(page, 240);

  const textBox = await focusNoteTextboxByIcon(client, page, sessionId, targetFileName);
  await page.mouse.click(textBox.bounds.x + 10, textBox.bounds.y + 10);
  await waitForUi(page, 250);
  await page.keyboard.press("Control+V");
  await waitForUi(page, 300);
  artifacts.push(await screenshot(page, "browser-help-typed"));

  await page.getByRole("button", { name: "Save" }).click();
  await waitForUi(page, 320);
  artifacts.push(await screenshot(page, "browser-help-saved"));

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
    name: "browser-help-line-capture",
    passed: joined === expectedSavedContent && final.terminated && !final.truncated,
    details: {
      targetFileName,
      appendText,
      joined,
      finalReward: final.cumulativeReward,
      screenshotPath: final.observation.screenshotPath,
      artifacts
    }
  } satisfies QaScenarioResult;
}

async function scenarioMail(client: Client, page: import("playwright").Page, sessionId: string) {
  const reset = await callTool<StepResult>(client, "trainer.reset", {
    sessionId,
    taskId: TASK_IDS.mail,
    seed: 0
  });
  const hidden = await getHiddenState(client, sessionId);
  const messageSubject = getTargetMessageSubject(hidden);
  const targetFileName = getTargetFileName(hidden);
  const expectedSavedContent = hidden.targets.expectedSavedContent ?? hidden.targets.appendText ?? "";

  await page.goto(reset.observation.viewerUrl!, { waitUntil: "domcontentloaded" });
  await waitForUi(page, 350);
  const artifacts: string[] = [];
  artifacts.push(await screenshot(page, "mail-reset"));

  const { node: messageNode } = await waitForObservedNode(
    client,
    page,
    sessionId,
    (node) => matchesMailMessageSubject(node, messageSubject)
  );
  const messageCenter = center(messageNode.bounds);
  await page.mouse.click(messageCenter.x, messageCenter.y);
  await waitForUi(page, 300);
  artifacts.push(await screenshot(page, "mail-message-selected"));

  const { node: mailFileNode } = await waitForObservedNode(
    client,
    page,
    sessionId,
    (node) => node.role === "listitem" && node.name === targetFileName
  );
  await page.mouse.dblclick(
    mailFileNode.bounds.x + Math.round(mailFileNode.bounds.width / 2),
    mailFileNode.bounds.y + Math.round(mailFileNode.bounds.height / 2)
  );
  await waitForUi(page, 360);
  const { node: textBox } = await waitForObservedNode(
    client,
    page,
    sessionId,
    (node) => node.role === "textbox" && node.name === targetFileName
  );
  await page.mouse.click(textBox.bounds.x + 10, textBox.bounds.y + 10);
  await waitForUi(page, 250);
  await page.keyboard.type(expectedSavedContent, { delay: 28 });
  await waitForUi(page, 300);
  artifacts.push(await screenshot(page, "mail-typed"));

  await page.getByRole("button", { name: "Save" }).click();
  await waitForUi(page, 320);
  artifacts.push(await screenshot(page, "mail-saved"));

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
    name: "mail-reminder-capture",
    passed:
      joined === expectedSavedContent &&
      final.terminated &&
      !final.truncated &&
      final.cumulativeReward > 0,
    details: {
      targetFileName,
      messageSubject,
      joined,
      finalReward: final.cumulativeReward,
      screenshotPath: final.observation.screenshotPath,
      artifacts
    }
  } satisfies QaScenarioResult;
}

async function scenarioTerminal(client: Client, page: import("playwright").Page, sessionId: string) {
  const reset = await callTool<StepResult>(client, "trainer.reset", {
    sessionId,
    taskId: TASK_IDS.terminal,
    seed: 0
  });
  const hidden = await getHiddenState(client, sessionId);
  const targetCommand = hidden.targets.targetCommand ?? "pwd";
  const targetCommandOutput = hidden.targets.targetCommandOutput ?? hidden.targets.appendText ?? "";
  const targetFileName = getTargetFileName(hidden);

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
  await page.keyboard.type(targetCommand, { delay: 40 });
  await page.keyboard.press("Enter");
  await waitForUi(page, 320);
  artifacts.push(await screenshot(page, "terminal-command-ran"));

  const terminalFileNode = findNode(
    observed.observation.a11yTree,
    (node) => node.role === "listitem" && node.name === targetFileName
  );
  await page.mouse.dblclick(
    terminalFileNode.bounds.x + Math.round(terminalFileNode.bounds.width / 2),
    terminalFileNode.bounds.y + Math.round(terminalFileNode.bounds.height / 2)
  );
  await waitForUi(page, 360);
  observed = await observe(client, sessionId);
  const textBox = findNode(
    observed.observation.a11yTree,
    (node) => node.role === "textbox" && node.name === targetFileName
  );
  await page.mouse.click(textBox.bounds.x + 10, textBox.bounds.y + 10);
  await waitForUi(page, 250);
  await page.keyboard.type(targetCommandOutput, { delay: 28 });
  await waitForUi(page, 300);
  artifacts.push(await screenshot(page, "terminal-typed"));

  await page.getByRole("button", { name: "Save" }).click();
  await waitForUi(page, 320);
  artifacts.push(await screenshot(page, "terminal-saved"));

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
    name: "terminal-working-directory-capture",
    passed:
      joined === targetCommandOutput &&
      final.terminated &&
      !final.truncated &&
      final.cumulativeReward > 0,
    details: {
      targetFileName,
      targetCommand,
      joined,
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
