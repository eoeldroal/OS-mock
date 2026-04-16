import { spawn } from "node:child_process";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { existsSync, mkdirSync } from "node:fs";
import { appendFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { Computer13Action, StepResult } from "../../../core/src/types.js";

type CliOptions = {
  taskId?: string;
  seed: number;
  autoOpen: boolean;
  debug: boolean;
};

type CallToolResult = {
  content?: Array<{ type?: string; text?: string }>;
  isError?: boolean;
};

type SessionContext = {
  sessionId: string;
  viewerUrl: string;
};

type LogEntry = {
  seq: number;
  ts: string;
  elapsed_ms: number;
  sessionId: string;
  event: string;
  command?: string;
  action?: Computer13Action;
  result?: {
    stepIndex?: number;
    actionAccepted?: boolean;
    actionSummary?: string;
    reward?: number;
    cumulativeReward?: number;
    terminated?: boolean;
    truncated?: boolean;
    focusedWindowId?: string;
  };
  taskId?: string;
  seed?: number;
  error?: string;
};

/* ─── Action Logger ─── */
class ActionLogger {
  private entries: LogEntry[] = [];
  private seq = 0;
  private startTime = Date.now();
  private logPath: string;
  private sessionId = "";

  constructor() {
    const logsDir = resolve(dirname(fileURLToPath(import.meta.url)), "../../../logs");
    mkdirSync(logsDir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    this.logPath = resolve(logsDir, `session-${timestamp}.jsonl`);
    writeFileSync(this.logPath, "");
  }

  setSession(sessionId: string) {
    this.sessionId = sessionId;
  }

  log(event: string, data: Partial<Omit<LogEntry, "seq" | "ts" | "elapsed_ms" | "sessionId" | "event">> = {}) {
    const entry: LogEntry = {
      seq: this.seq++,
      ts: new Date().toISOString(),
      elapsed_ms: Date.now() - this.startTime,
      sessionId: this.sessionId,
      event,
      ...data
    };
    this.entries.push(entry);
    appendFileSync(this.logPath, JSON.stringify(entry) + "\n");
    return entry;
  }

  logStep(command: string, action: Computer13Action | undefined, stepResult: ReturnType<typeof summarizeStep>) {
    this.log("step", {
      command,
      action,
      result: {
        stepIndex: stepResult.stepIndex,
        actionAccepted: stepResult.actionAccepted,
        actionSummary: stepResult.actionSummary,
        reward: stepResult.reward,
        cumulativeReward: stepResult.cumulativeReward,
        terminated: stepResult.terminated,
        truncated: stepResult.truncated,
        focusedWindowId: stepResult.focusedWindowId
      }
    });
  }

  getPath() {
    return this.logPath;
  }

  getEntryCount() {
    return this.entries.length;
  }

  printSummary() {
    const steps = this.entries.filter((e) => e.event === "step");
    const resets = this.entries.filter((e) => e.event === "reset");
    const accepted = steps.filter((e) => e.result?.actionAccepted);
    const rejected = steps.filter((e) => e.result && !e.result.actionAccepted);
    const lastStep = steps[steps.length - 1];
    const elapsed = Date.now() - this.startTime;

    console.log(`\n╔════════════════════════════════════════╗`);
    console.log(`║  SESSION LOG SUMMARY                   ║`);
    console.log(`╚════════════════════════════════════════╝`);
    console.log(`  Log file:     ${this.logPath}`);
    console.log(`  Duration:     ${(elapsed / 1000).toFixed(1)}s`);
    console.log(`  Total events: ${this.entries.length}`);
    console.log(`  Resets:       ${resets.length}`);
    console.log(`  Steps:        ${steps.length} (${accepted.length} accepted, ${rejected.length} rejected)`);
    if (lastStep?.result) {
      console.log(`  Last reward:  ${lastStep.result.reward}`);
      console.log(`  Cum. reward:  ${lastStep.result.cumulativeReward}`);
      console.log(`  Terminated:   ${lastStep.result.terminated}`);
      console.log(`  Truncated:    ${lastStep.result.truncated}`);
    }
    console.log(``);
  }
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "../../../..");
const sourceServerEntry = resolve(rootDir, "packages/mcp-server/src/index.ts");
const builtServerEntry = resolve(rootDir, "packages/mcp-server/dist/index.js");

function parseCliArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    seed: 0,
    autoOpen: false,
    debug: false
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
    if (current === "--debug") {
      options.debug = true;
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

  if (result.isError) {
    throw new Error(text);
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(text);
  }
}

function resolveServerLaunch() {
  if (existsSync(sourceServerEntry)) {
    return {
      command: process.execPath,
      args: ["--import", "tsx", sourceServerEntry],
      label: sourceServerEntry
    };
  }

  if (existsSync(builtServerEntry)) {
    return {
      command: process.execPath,
      args: [builtServerEntry],
      label: builtServerEntry
    };
  }

  throw new Error(
    `OS mock MCP server was not found at ${sourceServerEntry} or ${builtServerEntry}.`
  );
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
    maxSteps: result.task?.maxSteps === 0 ? "unlimited" : result.task?.maxSteps,
    stepIndex: result.stepIndex,
    actionAccepted: result.actionAccepted,
    actionSummary: result.info.actionSummary,
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
CLI flags:
  --open                   Auto-open viewer in browser
  --task <taskId>          Load task on startup
  --seed <n>               Set seed (default: 0)
  --debug                  Debug mode: unlimited steps (no truncation)

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
  right <x> <y>            Right-click
  move <x> <y>
  scroll <dx> <dy>         Scroll (dy>0 = down, dy<0 = up)
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
  log                      Show log summary & file path
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
  const serverLaunch = resolveServerLaunch();

  const logger = new ActionLogger();
  console.log(`Action log: ${logger.getPath()}`);

  const transport = new StdioClientTransport({
    command: serverLaunch.command,
    args: serverLaunch.args,
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
    console.log(`Server:  ${serverLaunch.label}`);

    session = await createSession(client);
    logger.setSession(session.sessionId);
    logger.log("session_created", { command: "create" });
    console.log(`Session: ${session.sessionId}`);
    console.log(`Viewer:  ${session.viewerUrl}`);

    if (options.debug) {
      console.log("DEBUG MODE: maxSteps unlimited (no truncation).");
    }

    if (options.autoOpen) {
      openViewer(session.viewerUrl);
      console.log("Opened viewer in the default browser.");
    }

    if (options.taskId) {
      const resetArgs: Record<string, unknown> = {
        sessionId: session.sessionId,
        taskId: options.taskId,
        seed: options.seed
      };
      if (options.debug) {
        resetArgs.maxSteps = 0;
      }
      const reset = parseToolText(
        (await client.callTool({
          name: "trainer.reset",
          arguments: resetArgs
        })) as CallToolResult
      ) as StepResult;
      const summary = summarizeStep(reset);
      logger.log("reset", { command: `reset ${options.taskId} ${options.seed}`, taskId: options.taskId, seed: options.seed });
      console.log(JSON.stringify(summary, null, 2));
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
          logger.log("exit", { command });
          break;
        }

        if (command === "help") {
          printHelp();
          continue;
        }

        if (command === "log") {
          logger.printSummary();
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
          logger.setSession(session.sessionId);
          logger.log("session_created", { command: "create" });
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
          const resetArgs: Record<string, unknown> = {
            sessionId: session.sessionId,
            taskId,
            seed
          };
          if (options.debug) {
            resetArgs.maxSteps = 0;
          }
          const reset = parseToolText(
            (await client.callTool({
              name: "trainer.reset",
              arguments: resetArgs
            })) as CallToolResult
          ) as StepResult;
          const summary = summarizeStep(reset);
          logger.log("reset", { command: line, taskId, seed });
          console.log(JSON.stringify(summary, null, 2));
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
          logger.log("sample", { command: line });
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
          const summary = summarizeStep(observed);
          logger.log("observe", { command: "observe", result: { stepIndex: summary.stepIndex, focusedWindowId: summary.focusedWindowId } });
          console.log(JSON.stringify(summary, null, 2));
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
          const summary = summarizeStep(stepped);
          logger.logStep(line, action, summary);
          console.log(JSON.stringify(summary, null, 2));
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
          const summary = summarizeStep(stepped);
          logger.logStep(line, action, summary);
          console.log(JSON.stringify(summary, null, 2));
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
          const summary = summarizeStep(perturbed);
          logger.log("perturbation", { command: line, result: { stepIndex: summary.stepIndex, actionSummary: summary.actionSummary } });
          console.log(JSON.stringify(summary, null, 2));
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
          logger.log("snapshot", { command: line });
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
          const summary = summarizeStep(restored);
          logger.log("restore", { command: line });
          console.log(JSON.stringify(summary, null, 2));
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
          logger.log("hidden_state", { command: "hidden" });
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
          logger.log("session_closed", { command: "close" });
          console.log(JSON.stringify(closed, null, 2));
          session = await createSession(client);
          logger.setSession(session.sessionId);
          logger.log("session_created", { command: "create" });
          console.log(`New session: ${session.sessionId}`);
          console.log(`Viewer:      ${session.viewerUrl}`);
          continue;
        }

        console.log(`Unknown command: ${command}`);
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        logger.log("error", { command: line, error: errMsg });
        console.error(errMsg);
      }
    }
  } finally {
    rl.close();
    logger.printSummary();
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
  if (command === "right") {
    return {
      type: "RIGHT_CLICK",
      x: Number(args[0]),
      y: Number(args[1])
    };
  }
  if (command === "scroll") {
    return {
      type: "SCROLL",
      dx: Number(args[0] ?? 0),
      dy: Number(args[1] ?? 0)
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
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
