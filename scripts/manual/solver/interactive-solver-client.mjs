#!/usr/bin/env node

import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "../../..");
const serverEntry = resolve(rootDir, "packages/mcp-server/dist/index-solver.js");

function requireOneOfEnv(names) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  throw new Error(`Missing required env var. Expected one of: ${names.join(", ")}`);
}

function parseObservePayload(result) {
  const textItem = result.content?.find((item) => item.type === "text");
  const imageItem = result.content?.find((item) => item.type === "image");
  const payload = textItem?.text ? JSON.parse(textItem.text) : null;
  let imagePath = null;
  if (imageItem?.data) {
    const dir =
      globalThis.__solverArtifactDir ??
      resolve(
        process.env.OS_MOCK_SOLVER_ARTIFACT_DIR ||
          join(tmpdir(), `interactive-solver-${new Date().toISOString().replace(/[:.]/g, "-")}`)
      );
    mkdirSync(dir, { recursive: true });
    const prefix = String(globalThis.__solverStepCounter ?? 0).padStart(3, "0");
    imagePath = join(dir, `${prefix}-${globalThis.__lastToolName ?? "observe"}.png`);
    writeFileSync(imagePath, Buffer.from(imageItem.data, "base64"));
    globalThis.__solverArtifactDir = dir;
  }
  return { payload, imagePath };
}

function printHelp() {
  console.log(`
Commands:
  observe
  click <x> <y>
  double_click <x> <y>
  right_click <x> <y>
  drag <x1> <y1> <x2> <y2>
  scroll <dx> <dy>
  type <text>
  press <key>
  hotkey <k1+k2+...>
  wait
  done
  fail [reason]
  tools
  help
  exit
`);
}

function parseCommand(line) {
  const [command, ...rest] = line.trim().split(" ");
  if (!command) return null;
  switch (command) {
    case "observe":
    case "wait":
    case "done":
      return { tool: command, args: {} };
    case "click":
    case "double_click":
    case "right_click":
      return { tool: command, args: { x: Number(rest[0]), y: Number(rest[1]) } };
    case "drag":
      return {
        tool: command,
        args: {
          x1: Number(rest[0]),
          y1: Number(rest[1]),
          x2: Number(rest[2]),
          y2: Number(rest[3])
        }
      };
    case "scroll":
      return { tool: command, args: { dx: Number(rest[0]), dy: Number(rest[1]) } };
    case "type":
      return { tool: command, args: { text: rest.join(" ") } };
    case "press":
      return { tool: command, args: { key: rest.join(" ") } };
    case "hotkey":
      return { tool: command, args: { keys: rest.join(" ").split("+").filter(Boolean) } };
    case "fail":
      return { tool: command, args: rest.length ? { reason: rest.join(" ") } : {} };
    default:
      return { tool: command, args: null };
  }
}

async function main() {
  const taskId = requireOneOfEnv(["OS_MOCK_SOLVER_TASK_ID", "SOLVER_TASK_ID"]);
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [serverEntry],
    cwd: rootDir,
    env: process.env,
    stderr: "pipe"
  });
  transport.stderr?.on("data", (chunk) => {
    process.stderr.write(String(chunk));
  });

  const client = new Client(
    {
      name: "interactive-solver-client",
      version: "0.1.0"
    },
    { capabilities: {} }
  );

  await client.connect(transport);
  globalThis.__solverStepCounter = 0;
  globalThis.__lastToolName = "observe";

  console.log(`Connected to solver session for task ${taskId}.`);
  printHelp();

  const rl = readline.createInterface({ input, output });
  try {
    while (true) {
      const line = await rl.question("solver> ");
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (trimmed === "exit" || trimmed === "quit") break;
      if (trimmed === "help") {
        printHelp();
        continue;
      }
      if (trimmed === "tools") {
        const tools = await client.listTools();
        console.log(tools.tools.map((tool) => tool.name).sort().join("\n"));
        continue;
      }

      const parsed = parseCommand(trimmed);
      if (!parsed || parsed.args === null) {
        console.log(`Unknown or malformed command: ${trimmed}`);
        continue;
      }

      globalThis.__lastToolName = parsed.tool;
      const result = await client.callTool({ name: parsed.tool, arguments: parsed.args });
      const { payload, imagePath } = parseObservePayload(result);
      globalThis.__solverStepCounter += 1;
      console.log(
        JSON.stringify(
          {
            tool: parsed.tool,
            actionAccepted: payload?.actionAccepted,
            stepIndex: payload?.stepIndex,
            terminated: payload?.terminated,
            truncated: payload?.truncated,
            stepsRemaining: payload?.stepsRemaining,
            imagePath,
            artifactDir: globalThis.__solverArtifactDir ?? null
          },
          null,
          2
        )
      );
    }
  } finally {
    rl.close();
    await client.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
