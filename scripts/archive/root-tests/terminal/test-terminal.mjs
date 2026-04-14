/**
 * Comprehensive Terminal App Test Script
 * Tests all terminal features with Playwright screenshots and visual verification
 */
import { MockOsEnv } from "./packages/core/dist/index.js";
import { mkdirSync, writeFileSync, readFileSync } from "fs";
import { resolve } from "path";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { WebSocketServer } from "ws";
import { chromium } from "playwright";

const OUTPUT_DIR = resolve("/sessions/sharp-clever-thompson/mnt/CoWork/logs/agent-tests/terminal-test");
mkdirSync(OUTPUT_DIR, { recursive: true });

let stepCounter = 0;
const testResults = [];

// ── Helper: Print terminal state ──
function printTerminalState(env, stepNum, stepName) {
  const hidden = env.getHiddenState();
  console.log(`\n[STEP ${stepNum}] ${stepName}`);
  console.log("─".repeat(70));

  if (hidden.terminalState) {
    const ts = hidden.terminalState;
    console.log(`  Input Line: "${ts.inputLine || ''}"`);
    console.log(`  Lines Count: ${ts.lines?.length || 0}`);
    console.log(`  Current Dir: ${ts.cwd || 'unknown'}`);
    console.log(`  Status: ${ts.status || 'ready'}`);

    if (ts.lines && ts.lines.length > 0) {
      console.log(`  Last 3 Lines:`);
      ts.lines.slice(-3).forEach((line, i) => {
        console.log(`    ${i}: "${line}"`);
      });
    }

    if (ts.executedCommands) {
      console.log(`  Executed Commands: ${ts.executedCommands.length}`);
      ts.executedCommands.slice(-2).forEach((cmd, i) => {
        console.log(`    ${i}: ${cmd}`);
      });
    }
  } else {
    console.log("  (No terminal state available)");
  }
}

// ── Server setup (following batch-replay pattern) ──
async function startServer(port) {
  const fastify = Fastify({ logger: false });
  try {
    const webAssetsDir = resolve("packages/web/dist/assets");
    await fastify.register(fastifyStatic, { root: webAssetsDir, prefix: "/assets/" });
  } catch {}

  fastify.get("/session/s1", async (_, reply) => {
    try {
      const html = readFileSync("packages/web/dist/index.html", "utf8");
      return reply.type("text/html").send(html);
    } catch {
      return reply.type("text/html").send("<h1>Build web first</h1>");
    }
  });

  let currentModel = null;
  fastify.get("/api/sessions/s1/render-model", async () => currentModel);

  const wss = new WebSocketServer({ noServer: true });
  const subs = new Set();
  fastify.server.on("upgrade", (req, sock, head) => {
    if (!req.url?.startsWith("/ws")) { sock.destroy(); return; }
    wss.handleUpgrade(req, sock, head, ws => {
      subs.add(ws);
      if (currentModel) ws.send(JSON.stringify(currentModel));
      ws.on("close", () => subs.delete(ws));
    });
  });

  await fastify.listen({ host: "127.0.0.1", port });

  return {
    setModel(m) {
      currentModel = m;
      const payload = JSON.stringify(m);
      for (const ws of subs) { if (ws.readyState === 1) ws.send(payload); }
    },
    async close() { await fastify.close(); }
  };
}

// ── Screenshot and state capture ──
async function captureStep(env, page, stepNum, name) {
  stepCounter++;
  printTerminalState(env, stepNum, name);

  const server = await global.server;
  server.setModel(env.getRenderModel());
  await page.waitForTimeout(400);

  const ssPath = resolve(OUTPUT_DIR, `${String(stepNum).padStart(2, '0')}_${name.replace(/\s+/g, '_')}.png`);
  await page.screenshot({ path: ssPath });

  testResults.push({
    step: stepNum,
    name,
    screenshot: ssPath,
    terminalState: env.getHiddenState().terminalState
  });

  console.log(`  Screenshot: ${ssPath}`);
  return ssPath;
}

// ── Main test execution ──
async function runTerminalTests() {
  console.log("\n" + "═".repeat(70));
  console.log("TERMINAL APP TEST SUITE");
  console.log("═".repeat(70));

  const PORT = 4321;
  const server = await startServer(PORT);
  global.server = server;

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  console.log(`\nLaunching browser to http://127.0.0.1:${PORT}/session/s1`);
  await page.goto(`http://127.0.0.1:${PORT}/session/s1`);
  await page.waitForTimeout(1500);

  // Create environment and reset to terminal_echo_to_file task
  const env = new MockOsEnv({ width: 1280, height: 800 });
  console.log("\nResetting to 'terminal_echo_to_file' task (seed 0)...");
  env.reset({ taskId: "terminal_echo_to_file", seed: 0, maxSteps: 0 });

  let stepNum = 1;
  let action;

  try {
    // STEP 1: Screenshot initial state
    console.log("\n" + "─".repeat(70));
    console.log("STEP 1: Initial State (should show terminal prompt)");
    await captureStep(env, page, stepNum++, "Initial_State_Terminal_Prompt");

    // STEP 2: Click on terminal to focus
    console.log("\n" + "─".repeat(70));
    console.log("STEP 2: Click terminal to focus");
    action = { type: "CLICK", x: 640, y: 400 };
    env.step(action);
    await captureStep(env, page, stepNum++, "Terminal_Focused");

    // STEP 3-4: Type "echo hello" character by character
    console.log("\n" + "─".repeat(70));
    console.log("STEP 3-4: Type 'echo hello' character by character");
    const text = "echo hello";
    for (const char of text) {
      action = { type: "TYPING", text: char };
      env.step(action);
    }
    await captureStep(env, page, stepNum++, "Typed_echo_hello");

    // STEP 5: Press Enter
    console.log("\n" + "─".repeat(70));
    console.log("STEP 5: Press Enter to execute");
    action = { type: "PRESS", key: "Enter" };
    env.step(action);
    await captureStep(env, page, stepNum++, "After_Echo_Executed");

    // STEP 6-7: Type "ls"
    console.log("\n" + "─".repeat(70));
    console.log("STEP 6-7: Type 'ls'");
    for (const char of "ls") {
      action = { type: "TYPING", text: char };
      env.step(action);
    }
    await captureStep(env, page, stepNum++, "Typed_ls");

    // STEP 8: Press Enter
    console.log("\n" + "─".repeat(70));
    console.log("STEP 8: Press Enter to execute ls");
    action = { type: "PRESS", key: "Enter" };
    env.step(action);
    await captureStep(env, page, stepNum++, "After_ls_Executed");

    // STEP 9: Press ArrowUp to recall last command
    console.log("\n" + "─".repeat(70));
    console.log("STEP 9: Press ArrowUp to recall 'ls'");
    action = { type: "PRESS", key: "ArrowUp" };
    env.step(action);
    await captureStep(env, page, stepNum++, "Recalled_ls");

    // STEP 10: Press ArrowUp again
    console.log("\n" + "─".repeat(70));
    console.log("STEP 10: Press ArrowUp again to recall 'echo hello'");
    action = { type: "PRESS", key: "ArrowUp" };
    env.step(action);
    await captureStep(env, page, stepNum++, "Recalled_echo_hello");

    // STEP 11: Press Escape to clear input
    console.log("\n" + "─".repeat(70));
    console.log("STEP 11: Press Escape to clear input");
    action = { type: "PRESS", key: "Escape" };
    env.step(action);
    await captureStep(env, page, stepNum++, "Input_Cleared");

    // STEP 12-13: Type "cat scratch.txt"
    console.log("\n" + "─".repeat(70));
    console.log("STEP 12-13: Type 'cat scratch.txt'");
    for (const char of "cat scratch.txt") {
      action = { type: "TYPING", text: char };
      env.step(action);
    }
    await captureStep(env, page, stepNum++, "Typed_cat_scratch");

    // STEP 14: Press Enter
    console.log("\n" + "─".repeat(70));
    console.log("STEP 14: Press Enter to execute cat");
    action = { type: "PRESS", key: "Enter" };
    env.step(action);
    await captureStep(env, page, stepNum++, "Cat_File_Output");

    // STEP 15: Right-click for context menu
    console.log("\n" + "─".repeat(70));
    console.log("STEP 15: Right-click on terminal for context menu");
    action = { type: "RIGHT_CLICK", x: 640, y: 400 };
    env.step(action);
    await captureStep(env, page, stepNum++, "Context_Menu_Opened");

    // STEP 16: Press Escape to dismiss menu
    console.log("\n" + "─".repeat(70));
    console.log("STEP 16: Press Escape to dismiss context menu");
    action = { type: "PRESS", key: "Escape" };
    env.step(action);
    await captureStep(env, page, stepNum++, "Context_Menu_Dismissed");

    console.log("\n" + "═".repeat(70));
    console.log("ALL TESTS COMPLETED SUCCESSFULLY");
    console.log("═".repeat(70));

  } catch (err) {
    console.error(`\nTEST FAILED at step ${stepNum}:`, err.message);
    console.error(err);
  }

  // Save results
  const reportPath = resolve(OUTPUT_DIR, "test-report.json");
  writeFileSync(reportPath, JSON.stringify({
    taskId: "terminal_echo_to_file",
    totalSteps: stepNum - 1,
    resultsCount: testResults.length,
    results: testResults
  }, null, 2));

  console.log(`\nTest report saved to: ${reportPath}`);
  console.log(`Screenshots saved to: ${OUTPUT_DIR}`);

  await browser.close();
  await server.close();
}

// ── Run tests ──
runTerminalTests().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
