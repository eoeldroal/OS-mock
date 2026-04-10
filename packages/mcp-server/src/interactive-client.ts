import { spawn } from "node:child_process";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { Computer13Action, StepResult } from "../../core/src/types.js";

//터미널에서 직접 명령어를 치며 서버와 소통하는 도구
//유저가 click 10 20이라고 치면, 클라이언트가 이를 { type: "CLICK", x: 10, y: 20 }이라는 정식 Action JSON으로 번역하여 서버의 computer13.step 도구를 호출

type CliOptions = {
  taskId?: string;
  seed: number;
  autoOpen: boolean;
};

type CallToolResult = {
  content?: Array<{ type?: string; text?: string }>;
};

type SessionContext = {
  sessionId: string;
  viewerUrl: string;
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "../../..");
const serverEntry = resolve(rootDir, "packages/mcp-server/dist/index.js");

function parseCliArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    seed: 0,
    autoOpen: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (current === "--task") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("Missing value for --task");
      }
      options.taskId = value;
      index += 1;
      continue;
    }
    if (current === "--seed") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("Missing value for --seed");
      }
      options.seed = Number(value);
      index += 1;
      continue;
    }
    if (current === "--open") {
      options.autoOpen = true;
      continue;
    }
    throw new Error(`Unknown argument: ${current}`);
  }

  if (Number.isNaN(options.seed)) {
    throw new Error("--seed must be a number");
  }

  return options;
}

function parseToolText(result: CallToolResult) {
  const text = result.content?.find((item) => item.type === "text")?.text;
  if (!text) {
    throw new Error("Tool result did not contain text content.");
  }
  return JSON.parse(text) as unknown;
}

function decodeEscapes(text: string) {
  return text
    .replace(/\\\\/g, "\u0000")
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, "\"")
    .replace(/\\r/g, "\r")
    .replace(/\u0000/g, "\\");
}

function summarizeStep(result: StepResult) {
  return {
    taskId: result.task?.id,
    instruction: result.task?.instruction,
    stepIndex: result.stepIndex,
    reward: result.reward,
    cumulativeReward: result.cumulativeReward,
    terminated: result.terminated,
    truncated: result.truncated,
    focusedWindowId: result.observation.focusedWindowId,
    screenshotPath: result.observation.screenshotPath,
    viewerUrl: result.observation.viewerUrl,
    lastProgress: result.info.lastProgress,
    lastViolations: result.info.lastViolations
  };
}

function printHelp() {
  console.log(`
Commands:
  help
  tools
  tasks
  create
  open
  reset <taskId> [seed]
  sample [seed]
  observe
  step <json-action>
  click <x> <y>
  double <x> <y>
  move <x> <y>
  type <text>              Use \\n for newline
  press <key>
  hotkey <k1+k2+...>
  wait
  done
  fail
  perturb <op> [json-params]
  snapshot [name]
  restore <snapshotId>
  hidden
  close
  exit
`);
}

function openViewer(url: string) {
  const command = process.platform === "darwin" ? "open" : "xdg-open";
  const child = spawn(command, [url], {
    stdio: "ignore",
    detached: true
  });
  child.unref();
}

async function createSession(client: Client) {
  return parseToolText(
    (await client.callTool({
      name: "trainer.create_session",
      arguments: {}
    })) as CallToolResult
  ) as SessionContext;
}

async function main() {
  const options = parseCliArgs(process.argv.slice(2));
  if (!existsSync(serverEntry)) {
    throw new Error(`Built MCP server not found at ${serverEntry}. Run npm run build first.`);
  }

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
      name: "os-mock-interactive-client",
      version: "0.1.0"
    },
    {
      capabilities: {}
    }
  );

  const rl = readline.createInterface({ input, output });
  let session = { sessionId: "", viewerUrl: "" };

  try {
    await client.connect(transport);
    const tools = await client.listTools();
    console.log(`Connected. ${tools.tools.length} MCP tools available.`);

    session = await createSession(client);
    console.log(`Session: ${session.sessionId}`);
    console.log(`Viewer:  ${session.viewerUrl}`);

    if (options.autoOpen) {
      openViewer(session.viewerUrl);
      console.log("Opened viewer in the default browser.");
    }

    if (options.taskId) {
      const reset = parseToolText(
        (await client.callTool({
          name: "trainer.reset",
          arguments: {
            sessionId: session.sessionId,
            taskId: options.taskId,
            seed: options.seed
          }
        })) as CallToolResult
      ) as StepResult;
      console.log(JSON.stringify(summarizeStep(reset), null, 2));
    }

    printHelp();

    while (true) {
      const line = (await rl.question("os-mock> ")).trim();
      if (!line) {
        continue;
      }
      const [command, ...rest] = line.split(" ");

      try {
        if (command === "exit" || command === "quit") {
          break;
        }

        if (command === "help") {
          printHelp();
          continue;
        }

        if (command === "tools") {
          const nextTools = await client.listTools();
          console.log(nextTools.tools.map((tool) => tool.name).sort().join("\n"));
          continue;
        }

        if (command === "tasks") {
          const tasks = parseToolText(
            (await client.callTool({
              name: "trainer.list_tasks",
              arguments: {}
            })) as CallToolResult
          );
          console.log(JSON.stringify(tasks, null, 2));
          continue;
        }

        if (command === "create") {
          session = await createSession(client);
          console.log(JSON.stringify(session, null, 2));
          continue;
        }

        if (command === "open") {
          openViewer(session.viewerUrl);
          console.log(`Opened ${session.viewerUrl}`);
          continue;
        }

        if (command === "reset") {
          const taskId = rest[0];
          const seed = rest[1] ? Number(rest[1]) : 0;
          if (!taskId) {
            console.log("Usage: reset <taskId> [seed]");
            continue;
          }
          const reset = parseToolText(
            (await client.callTool({
              name: "trainer.reset",
              arguments: {
                sessionId: session.sessionId,
                taskId,
                seed
              }
            })) as CallToolResult
          ) as StepResult;
          console.log(JSON.stringify(summarizeStep(reset), null, 2));
          continue;
        }

        if (command === "sample") {
          const seed = rest[0] ? Number(rest[0]) : undefined;
          const sampled = parseToolText(
            (await client.callTool({
              name: "trainer.sample_task",
              arguments: {
                sessionId: session.sessionId,
                seed
              }
            })) as CallToolResult
          );
          console.log(JSON.stringify(sampled, null, 2));
          continue;
        }

        if (command === "observe") {
          const observed = parseToolText(
            (await client.callTool({
              name: "computer13.observe",
              arguments: {
                sessionId: session.sessionId
              }
            })) as CallToolResult
          ) as StepResult;
          console.log(JSON.stringify(summarizeStep(observed), null, 2));
          continue;
        }

        if (command === "step") {
          const action = JSON.parse(rest.join(" ")) as Computer13Action;
          const stepped = parseToolText(
            (await client.callTool({
              name: "computer13.step",
              arguments: {
                sessionId: session.sessionId,
                action
              }
            })) as CallToolResult
          ) as StepResult;
          console.log(JSON.stringify(summarizeStep(stepped), null, 2));
          continue;
        }

        const action = toAction(command, rest);
        if (action) {
          const stepped = parseToolText(
            (await client.callTool({
              name: "computer13.step",
              arguments: {
                sessionId: session.sessionId,
                action
              }
            })) as CallToolResult
          ) as StepResult;
          console.log(JSON.stringify(summarizeStep(stepped), null, 2));
          continue;
        }

        if (command === "perturb") {
          const op = rest[0];
          const params = rest[1] ? JSON.parse(rest.slice(1).join(" ")) : undefined;
          if (!op) {
            console.log("Usage: perturb <op> [json-params]");
            continue;
          }
          const perturbed = parseToolText(
            (await client.callTool({
              name: "trainer.apply_perturbation",
              arguments: {
                sessionId: session.sessionId,
                op,
                params
              }
            })) as CallToolResult
          ) as StepResult;
          console.log(JSON.stringify(summarizeStep(perturbed), null, 2));
          continue;
        }

        if (command === "snapshot") {
          const name = rest[0];
          const snap = parseToolText(
            (await client.callTool({
              name: "trainer.snapshot",
              arguments: {
                sessionId: session.sessionId,
                name
              }
            })) as CallToolResult
          );
          console.log(JSON.stringify(snap, null, 2));
          continue;
        }

        if (command === "restore") {
          const snapshotId = rest[0];
          if (!snapshotId) {
            console.log("Usage: restore <snapshotId>");
            continue;
          }
          const restored = parseToolText(
            (await client.callTool({
              name: "trainer.restore_snapshot",
              arguments: {
                sessionId: session.sessionId,
                snapshotId
              }
            })) as CallToolResult
          ) as StepResult;
          console.log(JSON.stringify(summarizeStep(restored), null, 2));
          continue;
        }

        if (command === "hidden") {
          const hidden = parseToolText(
            (await client.callTool({
              name: "trainer.get_hidden_state",
              arguments: {
                sessionId: session.sessionId
              }
            })) as CallToolResult
          );
          console.log(JSON.stringify(hidden, null, 2));
          continue;
        }

        if (command === "close") {
          const closed = parseToolText(
            (await client.callTool({
              name: "trainer.close_session",
              arguments: {
                sessionId: session.sessionId
              }
            })) as CallToolResult
          );
          console.log(JSON.stringify(closed, null, 2));
          session = await createSession(client);
          console.log(`New session: ${session.sessionId}`);
          console.log(`Viewer:      ${session.viewerUrl}`);
          continue;
        }

        console.log(`Unknown command: ${command}`);
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
      }
    }
  } finally {
    rl.close();
    if (session.sessionId) {
      try {
        await client.callTool({
          name: "trainer.close_session",
          arguments: {
            sessionId: session.sessionId
          }
        });
      } catch {}
    }
    await client.close();
  }
}

function toAction(command: string, args: string[]): Computer13Action | null {
  if (command === "click") {
    return {
      type: "CLICK",
      x: Number(args[0]),
      y: Number(args[1])
    };
  }
  if (command === "double") {
    return {
      type: "DOUBLE_CLICK",
      x: Number(args[0]),
      y: Number(args[1])
    };
  }
  if (command === "move") {
    return {
      type: "MOVE_TO",
      x: Number(args[0]),
      y: Number(args[1])
    };
  }
  if (command === "type") {
    return {
      type: "TYPING",
      text: decodeEscapes(args.join(" "))
    };
  }
  if (command === "press") {
    return {
      type: "PRESS",
      key: args[0]
    };
  }
  if (command === "hotkey") {
    return {
      type: "HOTKEY",
      keys: args.join(" ").split("+").map((item) => item.trim()).filter(Boolean)
    };
  }
  if (command === "wait") {
    return { type: "WAIT" };
  }
  if (command === "done") {
    return { type: "DONE" };
  }
  if (command === "fail") {
    return { type: "FAIL" };
  }
  return null;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
