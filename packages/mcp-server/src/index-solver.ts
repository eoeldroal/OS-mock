import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { HostApp } from "./host.js";
import { registerSolverTools } from "./tools/solver.js";

function requireOneOfEnv(names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) {
      return value;
    }
  }
  throw new Error(`Missing required environment variable. Expected one of: ${names.join(", ")}`);
}

function parseOptionalInteger(name: string) {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") {
    return undefined;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Environment variable ${name} must be an integer, received: ${raw}`);
  }
  return parsed;
}

function parseOptionalIntegerFromNames(names: string[]) {
  for (const name of names) {
    const parsed = parseOptionalInteger(name);
    if (parsed !== undefined) {
      return parsed;
    }
  }
  return undefined;
}

async function main() {
  const taskId = requireOneOfEnv(["OS_MOCK_SOLVER_TASK_ID", "SOLVER_TASK_ID"]);
  const seed = parseOptionalIntegerFromNames(["OS_MOCK_SOLVER_TASK_SEED", "SOLVER_TASK_SEED"]) ?? 0;
  const maxSteps = parseOptionalIntegerFromNames([
    "OS_MOCK_SOLVER_MAX_STEPS",
    "SOLVER_TASK_MAX_STEPS"
  ]);

  const host = new HostApp();
  await host.start();

  const { sessionId } = host.createSession();
  await host.reset(sessionId, taskId, seed, maxSteps);

  const server = new McpServer({
    name: "os-mock-solver",
    version: "0.1.0"
  });

  registerSolverTools(server, { host, sessionId });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error(
    JSON.stringify(
      {
        solverSessionReady: true,
        taskId,
        seed,
        maxSteps: maxSteps ?? "task-default",
        sessionId
      },
      null,
      2
    )
  );

  const shutdown = async () => {
    try {
      host.closeSession(sessionId);
    } finally {
      await host.stop();
      await server.close();
    }
  };

  process.stdin.on("close", () => {
    void shutdown();
  });
  process.on("SIGINT", () => {
    void shutdown();
  });
  process.on("SIGTERM", () => {
    void shutdown();
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
