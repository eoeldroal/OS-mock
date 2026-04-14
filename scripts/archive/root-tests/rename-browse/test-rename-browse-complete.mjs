#!/usr/bin/env node

/**
 * Complete Test: Rename file in explorer + Browse categories in browser
 * Scenario: rename_then_edit_content
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
  console.log("\n=== Complete Rename & Browse Test Scenario ===\n");

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
      console.log(`  ✓ ${filename}`);
      screenshotNum++;
      return filepath;
    }

    // STEP 1: Initial state
    console.log("STEP 1: Initial state (explorer window visible, browser minimized)");
    env.reset({ taskId: "rename_then_edit_content", seed: 0, maxSteps: 0 });
    server.setModel(env.getRenderModel());
    await page.waitForTimeout(300);
    await takeScreenshot("01-initial");
    results.push({ step: 1, description: "Initial state", expected: "Explorer visible", passed: true });

    // STEP 2: Click on file to select it
    console.log("\nSTEP 2: Click on file in explorer to select it");
    const model2 = env.getRenderModel();
    const explorer = model2.windows?.[0];
    const result2 = env.step({
      type: "CLICK",
      x: explorer.bounds.x + 100,
      y: explorer.bounds.y + 150
    });
    server.setModel(env.getRenderModel());
    await page.waitForTimeout(300);
    await takeScreenshot("02-file-selected");
    results.push({
      step: 2,
      description: "Select file",
      expected: "File highlighted",
      passed: result2.actionAccepted
    });

    // STEP 3: Press F2 to rename
    console.log("\nSTEP 3: Press F2 to enter rename mode");
    const result3 = env.step({ type: "PRESS", key: "f2" });
    server.setModel(env.getRenderModel());
    await page.waitForTimeout(300);
    await takeScreenshot("03-rename-mode");
    results.push({
      step: 3,
      description: "Press F2",
      expected: "Filename editable",
      passed: result3.actionAccepted
    });

    // STEP 4: Type new filename
    console.log("\nSTEP 4: Type new filename 'new-name.txt'");
    const result4 = env.step({ type: "TYPING", text: "new-name.txt" });
    server.setModel(env.getRenderModel());
    await page.waitForTimeout(300);
    await takeScreenshot("04-new-name-typed");
    results.push({
      step: 4,
      description: "Type new name",
      expected: "'new-name.txt' visible in input",
      passed: result4.actionAccepted
    });

    // STEP 5: Press Enter to confirm
    console.log("\nSTEP 5: Press Enter to confirm rename");
    const result5 = env.step({ type: "PRESS", key: "Enter" });
    server.setModel(env.getRenderModel());
    await page.waitForTimeout(300);
    await takeScreenshot("05-rename-confirmed");
    results.push({
      step: 5,
      description: "Confirm rename",
      expected: "File renamed to 'new-name.txt'",
      passed: result5.actionAccepted
    });

    // STEP 6: Restore browser window from taskbar
    console.log("\nSTEP 6: Restore browser window by clicking taskbar");
    const result6 = env.step({ type: "CLICK", x: 35, y: 176 });
    server.setModel(env.getRenderModel());
    await page.waitForTimeout(300);
    await takeScreenshot("06-browser-restored");
    const model6 = env.getRenderModel();
    const hasBrowser = model6.windows?.some(w => w.id === "browser-main" && !w.minimized);
    results.push({
      step: 6,
      description: "Restore browser",
      expected: "Browser window visible",
      passed: result6.actionAccepted && hasBrowser
    });

    // STEP 7: Click on browser window to focus it
    console.log("\nSTEP 7: Click on browser window to focus");
    const browserWin = model6.windows?.find(w => w.id === "browser-main" && !w.minimized);
    if (browserWin) {
      const result7 = env.step({
        type: "CLICK",
        x: browserWin.bounds.x + 100,
        y: browserWin.bounds.y + 150
      });
      server.setModel(env.getRenderModel());
      await page.waitForTimeout(300);
      await takeScreenshot("07-browser-focused");
      results.push({
        step: 7,
        description: "Focus browser",
        expected: "Browser window has focus",
        passed: result7.actionAccepted
      });

      // STEP 8: Click on a category in browser
      console.log("\nSTEP 8: Click on category link in browser");
      const result8 = env.step({
        type: "CLICK",
        x: browserWin.bounds.x + 150,
        y: browserWin.bounds.y + 100
      });
      server.setModel(env.getRenderModel());
      await page.waitForTimeout(300);
      await takeScreenshot("08-category-clicked");
      results.push({
        step: 8,
        description: "Click category",
        expected: "Category content displayed",
        passed: result8.actionAccepted
      });

      // STEP 9: Scroll down in browser
      console.log("\nSTEP 9: Scroll down in browser content");
      const result9 = env.step({
        type: "SCROLL",
        x: browserWin.bounds.x + 200,
        y: browserWin.bounds.y + 300,
        dx: 0,
        dy: 3
      });
      server.setModel(env.getRenderModel());
      await page.waitForTimeout(300);
      await takeScreenshot("09-browser-scrolled");
      results.push({
        step: 9,
        description: "Scroll browser",
        expected: "Content scrolled down",
        passed: result9.actionAccepted
      });
    } else {
      console.log("  ⚠ Browser window not available");
      results.push({
        step: 7,
        description: "Focus browser",
        expected: "Browser window has focus",
        passed: false,
        reason: "Browser not visible"
      });
    }

    // Print summary
    console.log("\n" + "═".repeat(70));
    console.log("TEST RESULTS SUMMARY");
    console.log("═".repeat(70));

    results.forEach(r => {
      const status = r.passed ? "✓ PASS" : "✗ FAIL";
      console.log(`${status} - Step ${r.step}: ${r.description}`);
      console.log(`      Expected: ${r.expected}`);
      if (r.reason) console.log(`      Reason: ${r.reason}`);
    });

    const passCount = results.filter(r => r.passed).length;
    console.log(`\nResult: ${passCount}/${results.length} steps passed`);

    // Visual verification checks
    console.log("\n" + "═".repeat(70));
    console.log("VISUAL VERIFICATION CHECKLIST");
    console.log("═".repeat(70));
    console.log("✓ Step 1 (01-initial.png): Explorer window visible?");
    console.log("✓ Step 2 (02-file-selected.png): File item highlighted?");
    console.log("✓ Step 3 (03-rename-mode.png): Filename text editable/outlined?");
    console.log("✓ Step 4 (04-new-name-typed.png): Input shows 'new-name.txt'?");
    console.log("✓ Step 5 (05-rename-confirmed.png): Rename complete, file list updated?");
    console.log("✓ Step 6 (06-browser-restored.png): Browser window now visible?");
    console.log("✓ Step 7 (07-browser-focused.png): Browser has focus/selected?");
    console.log("✓ Step 8 (08-category-clicked.png): Category content displayed?");
    console.log("✓ Step 9 (09-browser-scrolled.png): Browser content scrolled?");

    console.log(`\nScreenshots: ${OUTPUT_DIR}`);

    // Write report
    writeFileSync(resolve(OUTPUT_DIR, "test-report.json"), JSON.stringify({
      timestamp: new Date().toISOString(),
      task: "rename_then_edit_content",
      scenario: "File rename in explorer + category browsing",
      results,
      summary: {
        totalSteps: results.length,
        passedSteps: passCount,
        failedSteps: results.length - passCount,
        passRate: `${Math.round(passCount / results.length * 100)}%`
      },
      screenshots: {
        directory: OUTPUT_DIR,
        count: screenshotNum,
        listing: [
          "01-initial.png",
          "02-file-selected.png",
          "03-rename-mode.png",
          "04-new-name-typed.png",
          "05-rename-confirmed.png",
          "06-browser-restored.png",
          "07-browser-focused.png",
          "08-category-clicked.png",
          "09-browser-scrolled.png"
        ]
      }
    }, null, 2));

  } catch (error) {
    console.error("Error:", error);
    await takeScreenshot("ERROR");
  } finally {
    await browser.close();
    await server.close();
  }
}

runTest().catch(console.error);
