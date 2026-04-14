#!/usr/bin/env node

/**
 * Enhanced Test: Rename a file in explorer and browse categories in browser
 * Scenario: rename_then_edit_content - with detailed debugging
 */
import { MockOsEnv } from "./packages/core/dist/index.js";
import { mkdirSync, writeFileSync } from "fs";
import { resolve } from "path";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { WebSocketServer } from "ws";
import { chromium } from "playwright";
import { readFileSync } from "fs";

const OUTPUT_DIR = resolve("logs/agent-tests/rename-browse");
mkdirSync(OUTPUT_DIR, { recursive: true });

// ── Start server ──
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

// ── Main test ──
async function runTest() {
  console.log("\n=== Enhanced File Rename & Browse Test ===\n");

  const server = await startServer(3000);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  const env = new MockOsEnv({ width: 1280, height: 800 });
  let screenshotNum = 0;
  const results = [];

  try {
    // Navigate to viewer
    await page.goto("http://127.0.0.1:3000/session/s1");
    await page.waitForTimeout(1500);

    async function takeScreenshot(label) {
      const filename = `${String(screenshotNum).padStart(2, '0')}-${label}.png`;
      const filepath = resolve(OUTPUT_DIR, filename);
      await page.screenshot({ path: filepath });
      console.log(`  ✓ Screenshot: ${filename}`);
      screenshotNum++;
      return filepath;
    }

    function logStep(title) {
      console.log(`\nSTEP ${screenshotNum}: ${title}`);
    }

    function logState(model) {
      const visibleWins = model.windows?.filter(w => !w.minimized) || [];
      const minimizedWins = model.windows?.filter(w => w.minimized) || [];
      console.log(`  Windows: ${visibleWins.length} visible, ${minimizedWins.length} minimized`);
      visibleWins.forEach((w, i) => {
        console.log(`    [${i}] ${w.id} - bounds: (${w.bounds.x}, ${w.bounds.y}, ${w.bounds.width}x${w.bounds.height})`);
      });
    }

    // STEP 1: Reset to task
    logStep("Initialize and reset to task 'rename_then_edit_content'");
    env.reset({ taskId: "rename_then_edit_content", seed: 0, maxSteps: 0 });
    const initialModel = env.getRenderModel();
    server.setModel(initialModel);
    await page.waitForTimeout(300);
    await takeScreenshot("initial-state");
    logState(initialModel);
    results.push({ step: 1, action: "Initialize", passed: true });

    // STEP 2: Click on first file in explorer
    logStep("Click on first file to select it");
    const explorerWin = initialModel.windows?.[0];
    if (explorerWin) {
      const clickX = explorerWin.bounds.x + 100;
      const clickY = explorerWin.bounds.y + 150;
      console.log(`  Clicking at (${clickX}, ${clickY}) in explorer window`);

      const result = env.step({ type: "CLICK", x: clickX, y: clickY });
      console.log(`  Action accepted: ${result.actionAccepted}`);

      const model2 = env.getRenderModel();
      server.setModel(model2);
      await page.waitForTimeout(300);
      await takeScreenshot("file-selected");
      results.push({ step: 2, action: "Click file", passed: result.actionAccepted });
    }

    // STEP 3: Press F2 to enter rename mode
    logStep("Press F2 to enter rename mode");
    const result3 = env.step({ type: "PRESS", key: "f2" });
    console.log(`  Action accepted: ${result3.actionAccepted}`);

    const model3 = env.getRenderModel();
    server.setModel(model3);
    await page.waitForTimeout(300);
    await takeScreenshot("rename-mode-active");
    results.push({ step: 3, action: "Press F2", passed: result3.actionAccepted });

    // STEP 4: Type new filename
    logStep("Type new filename 'new-name.txt'");
    const result4 = env.step({ type: "TYPING", text: "new-name.txt" });
    console.log(`  Action accepted: ${result4.actionAccepted}`);

    const model4 = env.getRenderModel();
    server.setModel(model4);
    await page.waitForTimeout(300);
    await takeScreenshot("new-name-typed");
    results.push({ step: 4, action: "Type filename", passed: result4.actionAccepted });

    // STEP 5: Press Enter to confirm rename
    logStep("Press Enter to confirm rename");
    const result5 = env.step({ type: "PRESS", key: "Enter" });
    console.log(`  Action accepted: ${result5.actionAccepted}`);

    const model5 = env.getRenderModel();
    server.setModel(model5);
    await page.waitForTimeout(300);
    await takeScreenshot("rename-confirmed");
    results.push({ step: 5, action: "Press Enter", passed: result5.actionAccepted });

    // STEP 6: Switch to browser window
    logStep("Switch focus to browser window");
    const model6 = env.getRenderModel();
    const allWins = model6.windows?.filter(w => !w.minimized) || [];
    console.log(`  Available windows: ${allWins.length}`);

    if (allWins.length > 1) {
      const browserWin = allWins[1];
      console.log(`  Clicking on browser window: ${browserWin.id}`);
      const browserClickX = browserWin.bounds.x + 100;
      const browserClickY = browserWin.bounds.y + 150;

      const result6 = env.step({
        type: "CLICK",
        x: browserClickX,
        y: browserClickY
      });
      console.log(`  Action accepted: ${result6.actionAccepted}`);

      const model6Updated = env.getRenderModel();
      server.setModel(model6Updated);
      await page.waitForTimeout(300);
      await takeScreenshot("browser-focused");
      results.push({ step: 6, action: "Focus browser", passed: result6.actionAccepted });

      // STEP 7: Click on category in browser
      logStep("Click on a category in the browser");
      // Try clicking on a category button/link
      const categoryX = browserWin.bounds.x + 150;
      const categoryY = browserWin.bounds.y + 120;
      console.log(`  Clicking category at (${categoryX}, ${categoryY})`);

      const result7 = env.step({
        type: "CLICK",
        x: categoryX,
        y: categoryY
      });
      console.log(`  Action accepted: ${result7.actionAccepted}`);

      const model7 = env.getRenderModel();
      server.setModel(model7);
      await page.waitForTimeout(300);
      await takeScreenshot("category-clicked");
      results.push({ step: 7, action: "Click category", passed: result7.actionAccepted });

      // STEP 8: Scroll down in browser
      logStep("Scroll down in browser content");
      const result8 = env.step({
        type: "SCROLL",
        x: browserWin.bounds.x + 200,
        y: browserWin.bounds.y + 300,
        dx: 0,
        dy: 3
      });
      console.log(`  Action accepted: ${result8.actionAccepted}`);

      const model8 = env.getRenderModel();
      server.setModel(model8);
      await page.waitForTimeout(300);
      await takeScreenshot("browser-scrolled");
      results.push({ step: 8, action: "Scroll browser", passed: result8.actionAccepted });
    } else {
      console.log("  ⚠ Only 1 window available - skipping browser steps");
      results.push({ step: 6, action: "Focus browser", passed: false, reason: "Only 1 window" });
    }

    // Print summary
    console.log("\n" + "═".repeat(60));
    console.log("TEST RESULTS SUMMARY");
    console.log("═".repeat(60));

    results.forEach(r => {
      const status = r.passed ? "✓ PASS" : "✗ FAIL";
      const reason = r.reason ? ` (${r.reason})` : "";
      console.log(`${status} - Step ${r.step}: ${r.action}${reason}`);
    });

    const passCount = results.filter(r => r.passed).length;
    console.log(`\nTotal: ${passCount}/${results.length} steps passed`);
    console.log(`Screenshots saved to: ${OUTPUT_DIR}`);

    // Write detailed report
    writeFileSync(resolve(OUTPUT_DIR, "test-report.json"), JSON.stringify({
      timestamp: new Date().toISOString(),
      task: "rename_then_edit_content",
      results,
      totalSteps: results.length,
      passedSteps: passCount,
      screenshots: {
        directory: OUTPUT_DIR,
        count: screenshotNum
      }
    }, null, 2));

  } catch (error) {
    console.error("Error:", error);
    await takeScreenshot("error");
  } finally {
    await browser.close();
    await server.close();
  }
}

runTest().catch(console.error);
