import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { A11yNode, Computer13Action, StepResult } from "../../core/src/types.js";

type CliOptions = {
  taskId: string;
  seed: number;
  keepOpen: boolean;
  sessionId?: string;
};

type CallToolResult = {
  content?: Array<{ type?: string; text?: string }>;
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "../../..");
const serverEntry = resolve(rootDir, "packages/mcp-server/dist/index.js");

function parseCliArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    taskId: "dismiss_popup_then_append_note",
    seed: 0,
    keepOpen: false
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
    if (current === "--keep-open") {
      options.keepOpen = true;
      continue;
    }
    if (current === "--session") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("Missing value for --session");
      }
      options.sessionId = value;
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${current}`);
  }

  if (Number.isNaN(options.seed)) {
    throw new Error("--seed must be a number");
  }

  return options;
}

function flatten(nodes: A11yNode[]): A11yNode[] {
  return nodes.flatMap((node) => [node, ...flatten(node.children)]);
}

function findNode(nodes: A11yNode[], predicate: (node: A11yNode) => boolean): A11yNode {
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

function parseToolText(result: CallToolResult) {
  const text = result.content?.find((item) => item.type === "text")?.text;
  if (!text) {
    throw new Error("Tool result did not contain text content.");
  }
  return JSON.parse(text) as unknown;
}

function extractQuotedText(instruction: string) {
  const match = instruction.match(/"([^"]+)"/);
  if (!match) {
    throw new Error(`Could not extract quoted text from instruction: ${instruction}`);
  }
  return match[1];
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
      name: "os-mock-test-client",
      version: "0.1.0"
    },
    {
      capabilities: {}
    }
  );

  let sessionId = options.sessionId;

  try {
    await client.connect(transport);

    const tools = await client.listTools();
    console.log(
      JSON.stringify(
        {
          client: "connected",
          toolCount: tools.tools.length,
          tools: tools.tools.map((tool) => tool.name).sort()
        },
        null,
        2
      )
    );

    if (!sessionId) {
      const created = parseToolText(
        (await client.callTool({
          name: "trainer.create_session",
          arguments: {}
        })) as CallToolResult
      ) as { sessionId: string; viewerUrl: string };
      sessionId = created.sessionId;
      console.log(JSON.stringify({ created }, null, 2));
    }

    const tasks = parseToolText(
      (await client.callTool({
        name: "trainer.list_tasks",
        arguments: {}
      })) as CallToolResult
    );
    console.log(JSON.stringify({ availableTasks: tasks }, null, 2));

    const reset = parseToolText(
      (await client.callTool({
        name: "trainer.reset",
        arguments: {
          sessionId,
          taskId: options.taskId,
          seed: options.seed
        }
      })) as CallToolResult
    ) as StepResult;
    console.log(
      JSON.stringify(
        {
          reset: {
            sessionId,
            taskId: options.taskId,
            seed: options.seed,
            viewerUrl: reset.observation.viewerUrl,
            screenshotPath: reset.observation.screenshotPath,
            instruction: reset.task?.instruction
          }
        },
        null,
        2
      )
    );

    const solved = await solveTaskThroughMcp(client, sessionId, options.taskId, reset);
    console.log(
      JSON.stringify(
        {
          final: {
            sessionId,
            taskId: options.taskId,
            terminated: solved.terminated,
            truncated: solved.truncated,
            cumulativeReward: solved.cumulativeReward,
            screenshotPath: solved.observation.screenshotPath,
            viewerUrl: solved.observation.viewerUrl,
            focusedWindowId: solved.observation.focusedWindowId
          }
        },
        null,
        2
      )
    );

    if (!options.keepOpen) {
      const closed = parseToolText(
        (await client.callTool({
          name: "trainer.close_session",
          arguments: { sessionId }
        })) as CallToolResult
      );
      console.log(JSON.stringify({ closed }, null, 2));
    } else {
      console.log(JSON.stringify({ keptOpen: { sessionId } }, null, 2));
    }
  } finally {
    await client.close();
  }
}

async function solveTaskThroughMcp(
  client: Client,
  sessionId: string,
  taskId: string,
  initial: StepResult
) {
  let current = initial;

  const step = async (action: Computer13Action) => {
    current = parseToolText(
      (await client.callTool({
        name: "computer13.step",
        arguments: { sessionId, action }
      })) as CallToolResult
    ) as StepResult;
    console.log(
      JSON.stringify(
        {
          step: {
            stepIndex: current.stepIndex,
            action,
            reward: current.reward,
            cumulativeReward: current.cumulativeReward,
            lastProgress: current.info.lastProgress,
            screenshotPath: current.observation.screenshotPath
          }
        },
        null,
        2
      )
    );
    return current;
  };

  const observe = async () => {
    current = parseToolText(
      (await client.callTool({
        name: "computer13.observe",
        arguments: { sessionId }
      })) as CallToolResult
    ) as StepResult;
    return current;
  };

  const nodes = () => current.observation.a11yTree;

  switch (taskId) {
    case "dismiss_popup_then_append_note": {
      const dismissButton = findNode(nodes(), (node) => node.role === "button" && node.name === "Dismiss");
      await step({ type: "CLICK", ...center(dismissButton.bounds) });

      await observe();
      const todoFile = findNode(nodes(), (node) => node.role === "listitem" && node.name === "todo.txt");
      await step({ type: "DOUBLE_CLICK", ...center(todoFile.bounds) });

      await observe();
      const textBox = findNode(nodes(), (node) => node.role === "textbox" && node.name === "todo.txt");
      await step({
        type: "CLICK",
        x: textBox.bounds.x + textBox.bounds.width - 6,
        y: textBox.bounds.y + 8
      });

      const appendLine = extractQuotedText(current.task?.instruction ?? "");
      await step({ type: "TYPING", text: `\n${appendLine}` });
      await step({ type: "HOTKEY", keys: ["ctrl", "s"] });
      return step({ type: "DONE" });
    }
    case "rename_note_in_explorer": {
      const draftFile = findNode(nodes(), (node) => node.role === "listitem" && node.name === "draft.txt");
      await step({ type: "CLICK", ...center(draftFile.bounds) });
      await step({ type: "PRESS", key: "f2" });
      await step({ type: "TYPING", text: "final.txt" });
      await step({ type: "PRESS", key: "enter" });
      return step({ type: "DONE" });
    }
    case "copy_line_between_windows": {
      const sourceLine = findNode(
        nodes(),
        (node) => node.role === "label" && node.name === "Line 1" && node.text !== undefined
      );
      const sourceBox = findNode(nodes(), (node) => node.role === "textbox" && node.name === "source.txt");
      await step({ type: "CLICK", x: sourceBox.bounds.x + 10, y: sourceBox.bounds.y + 8 });
      await step({ type: "HOTKEY", keys: ["ctrl", "c"] });

      await observe();
      const targetBox = findNode(nodes(), (node) => node.role === "textbox" && node.name === "target.txt");
      await step({
        type: "CLICK",
        x: targetBox.bounds.x + targetBox.bounds.width - 6,
        y: targetBox.bounds.y + 8
      });
      await step({ type: "TYPING", text: sourceLine.text ?? "" });
      await step({ type: "HOTKEY", keys: ["ctrl", "s"] });
      return step({ type: "DONE" });
    }
    case "minimize_recover_and_save": {
      const recoverIcon = findNode(nodes(), (node) => node.role === "icon" && node.name === "recover.txt");
      await step({ type: "CLICK", ...center(recoverIcon.bounds) });
      await step({ type: "HOTKEY", keys: ["ctrl", "s"] });
      return step({ type: "DONE" });
    }
    default:
      throw new Error(`No scripted MCP solver defined for task: ${taskId}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
