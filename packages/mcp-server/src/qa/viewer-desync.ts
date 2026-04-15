import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { chromium } from "playwright";
import type { StepResult } from "../../../core/src/types.js";
import { DEFAULT_BROWSER_EXTERNAL_BODY_MARKER } from "../../../core/src/apps/browser-defaults.js";

type CallToolResult = {
  content?: Array<{ type?: string; text?: string }>;
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "../../../..");
const serverEntry = resolve(rootDir, "packages/mcp-server/dist/index.js");
const artifactDir = resolve(rootDir, "output", "playwright", "viewer-desync-qa");

function parseToolText(result: CallToolResult) {
  const text = result.content?.find((item) => item.type === "text")?.text;
  if (!text) {
    throw new Error("Tool result did not contain text content.");
  }
  return JSON.parse(text) as unknown;
}

async function callTool<T>(client: Client, name: string, args: Record<string, unknown>) {
  return parseToolText((await client.callTool({ name, arguments: args })) as CallToolResult) as T;
}

async function screenshot(page: import("playwright").Page, name: string) {
  const path = resolve(artifactDir, `${name}.png`);
  await page.screenshot({ path, fullPage: true });
  return path;
}

async function waitForReady(page: import("playwright").Page, expectedTaskId: string, expectedSessionId: string) {
  await page.waitForFunction(
    ({ taskId, sessionId }) =>
      document.title.includes(taskId) && document.title.includes(sessionId),
    { taskId: expectedTaskId, sessionId: expectedSessionId },
    { timeout: 10_000 }
  );
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
      name: "os-mock-viewer-desync-qa",
      version: "0.1.0"
    },
    {
      capabilities: {}
    }
  );

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const pageA = await context.newPage();
  const pageB = await context.newPage();

  try {
    await client.connect(transport);

    const a = await callTool<{ sessionId: string; viewerUrl: string }>(client, "trainer.create_session", {});
    const b = await callTool<{ sessionId: string; viewerUrl: string }>(client, "trainer.create_session", {});

    await callTool<StepResult>(client, "trainer.reset", {
      sessionId: a.sessionId,
      taskId: "browser_open_briefing_heading_to_note",
      seed: 0,
      maxSteps: 0
    });
    await callTool<StepResult>(client, "trainer.reset", {
      sessionId: b.sessionId,
      taskId: "terminal_record_working_directory",
      seed: 0,
      maxSteps: 0
    });

    await pageA.goto(a.viewerUrl, { waitUntil: "domcontentloaded" });
    await pageB.goto(b.viewerUrl, { waitUntil: "domcontentloaded" });

    await waitForReady(pageA, "browser_open_briefing_heading_to_note", a.sessionId);
    await waitForReady(pageB, "terminal_record_working_directory", b.sessionId);

    const shots: string[] = [];
    shots.push(await screenshot(pageA, "session-a-browser-initial"));
    shots.push(await screenshot(pageB, "session-b-terminal-initial"));

    await callTool<StepResult>(client, "trainer.reset", {
      sessionId: a.sessionId,
      taskId: "browser_open_briefing_heading_to_note",
      seed: 1,
      maxSteps: 0
    });
    await callTool<StepResult>(client, "trainer.reset", {
      sessionId: b.sessionId,
      taskId: "terminal_record_working_directory",
      seed: 1,
      maxSteps: 0
    });

    await pageA.reload({ waitUntil: "domcontentloaded" });
    await pageB.reload({ waitUntil: "domcontentloaded" });

    await waitForReady(pageA, "browser_open_briefing_heading_to_note", a.sessionId);
    await waitForReady(pageB, "terminal_record_working_directory", b.sessionId);

    shots.push(await screenshot(pageA, "session-a-browser-reloaded"));
    shots.push(await screenshot(pageB, "session-b-terminal-reloaded"));

    const titleA = await pageA.title();
    const titleB = await pageB.title();
    const bodyA = await pageA.locator("body").innerText();
    const bodyB = await pageB.locator("body").innerText();

    const passed =
      titleA.includes(a.sessionId) &&
      titleA.includes("browser_open_briefing_heading_to_note") &&
      titleB.includes(b.sessionId) &&
      titleB.includes("terminal_record_working_directory") &&
      bodyA.includes(DEFAULT_BROWSER_EXTERNAL_BODY_MARKER) &&
      bodyB.includes("Terminal");

    const report = {
      generatedAt: new Date().toISOString(),
      passed,
      sessionA: {
        sessionId: a.sessionId,
        viewerUrl: a.viewerUrl,
        title: titleA
      },
      sessionB: {
        sessionId: b.sessionId,
        viewerUrl: b.viewerUrl,
        title: titleB
      },
      artifacts: shots
    };

    await writeFile(resolve(artifactDir, "report.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));

    if (!passed) {
      process.exitCode = 1;
    }

    await callTool(client, "trainer.close_session", { sessionId: a.sessionId });
    await callTool(client, "trainer.close_session", { sessionId: b.sessionId });
  } finally {
    await browser.close();
    await client.close();
    await transport.close();
  }
}

void main();
