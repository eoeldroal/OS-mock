import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { HostApp } from "./host.js";
import { registerComputer13Tools } from "./tools/computer13.js";
import { registerTrainerTools } from "./tools/trainer.js";

async function main() {
  const host = new HostApp();
  await host.start();

  const server = new McpServer({
    name: "os-mock-computer13",
    version: "0.1.0"
  });

  registerComputer13Tools(server, host);
  registerTrainerTools(server, host);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  const shutdown = async () => {
    await host.stop();
    await server.close();
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
