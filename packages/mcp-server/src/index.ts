//프로그램이 실행될 때 가장 먼저 호출되는 진입점(Entry Point)
//2단계에서 만든 '심장(엔진)'과 3단계에서 만든 '조이패드(도구)'를 결합하고, 외부의 AI 에이전트가 이 서버에 접속할 수 있도록 통신 케이블을 꽂아주는 역할
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { HostApp } from "./host.js";
import { registerComputer13Tools } from "./tools/computer13.js";
import { registerTrainerTools } from "./tools/trainer.js";

async function main() {
  const host = new HostApp();
  await host.start();
  //mcp 통신규격
  const server = new McpServer({
    name: "os-mock-computer13",
    version: "0.1.0"
  });
  //빈 껍데기인 server와 심장인 host를 엮어주는 작업
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
