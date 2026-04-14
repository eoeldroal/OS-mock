#!/usr/bin/env node

/**
 * Test: Rename a file in explorer and browse categories in browser
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
  console.log("\n=== File Rename & Browse Test ===\n");

  const server = await startServer(3000);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  const env = new MockOsEnv({ width: 1280, height: 800 });
  let screenshotNum = 0;

  try {
    // Navigate to viewer
    await page.goto("http://127.0.0.1:3000/session/s1");
    await page.waitForTimeout(1500);

    async function takeScreenshot(label) {
      const filename = `${String(screenshotNum).padStart(2, '0')}-${label}.png`;
      const filepath = resolve(OUTPUT_DIR, filename);
      await page.screenshot({ path: filepath });
      console.log(`✓ Screenshot: ${filename}`);
      screenshotNum++;
      return filepath;
    }

    // STEP 1: Reset to task
    console.log("\nSTEP 1: Initialize and reset to task 'rename_then_edit_content'");
    env.reset({ taskId: "rename_then_edit_content", seed: 0, maxSteps: 0 });
    server.setModel(env.getRenderModel());
    await page.waitForTimeout(300);
    await takeScreenshot("01-initial");

    // Get render model to understand structure
    const initialModel = env.getRenderModel();
    console.log(`  Visible windows: ${initialModel.windows?.length || 0}`);
    console.log(`  Popups: ${initialModel.popups?.length || 0}`);

    // STEP 2: Click on file explorer window (first visible window)
    console.log("\nSTEP 2: Click on file explorer");
    const visibleWindows = initialModel.windows?.filter(w => !w.minimized) || [];
    if (visibleWindows.length > 0) {
      const explorerWindow = visibleWindows[0];
      // Click in the file list area
      const clickX = explorerWindow.bounds.x + 100;
      const clickY = explorerWindow.bounds.y + 150;

      env.step({
        type: "CLICK",
        x: clickX,
        y: clickY
      });
      server.setModel(env.getRenderModel());
      await page.waitForTimeout(300);
      await takeScreenshot("02-file-selected");
    }

    // STEP 3: Press F2 to rename
    console.log("\nSTEP 3: Press F2 for rename mode");
    env.step({
      type: "PRESS",
      key: "f2"
    });
    server.setModel(env.getRenderModel());
    await page.waitForTimeout(300);
    await takeScreenshot("03-rename-mode");

    // STEP 4: Type new filename
    console.log("\nSTEP 4: Type new filename");
    env.step({
      type: "TYPING",
      text: "new-name.txt"
    });
    server.setModel(env.getRenderModel());
    await page.waitForTimeout(300);
    await takeScreenshot("04-new-name-typed");

    // STEP 5: Press Enter to confirm rename
    console.log("\nSTEP 5: Press Enter to confirm rename");
    env.step({
      type: "PRESS",
      key: "Enter"
    });
    server.setModel(env.getRenderModel());
    await page.waitForTimeout(300);
    await takeScreenshot("05-rename-confirmed");

    // STEP 6: Switch to browser window
    console.log("\nSTEP 6: Switch to browser window");
    const updatedModel = env.getRenderModel();
    const allWindows = updatedModel.windows?.filter(w => !w.minimized) || [];
    if (allWindows.length > 1) {
      // Click on another window (likely the browser)
      const browserWindow = allWindows[1];
      const browserClickX = browserWindow.bounds.x + 100;
      const browserClickY = browserWindow.bounds.y + 150;

      env.step({
        type: "CLICK",
        x: browserClickX,
        y: browserClickY
      });
      server.setModel(env.getRenderModel());
      await page.waitForTimeout(300);
      await takeScreenshot("06-browser-focused");

      // STEP 7: Click on category in browser
      console.log("\nSTEP 7: Click on category");
      const categoryClickX = browserWindow.bounds.x + 150;
      const categoryClickY = browserWindow.bounds.y + 100;

      env.step({
        type: "CLICK",
        x: categoryClickX,
        y: categoryClickY
      });
      server.setModel(env.getRenderModel());
      await page.waitForTimeout(300);
      await takeScreenshot("07-category-clicked");

      // STEP 8: Scroll down in browser
      console.log("\nSTEP 8: Scroll down");
      env.step({
        type: "SCROLL",
        x: browserWindow.bounds.x + 200,
        y: browserWindow.bounds.y + 300,
        dx: 0,
        dy: 3
      });
      server.setModel(env.getRenderModel());
      await page.waitForTimeout(300);
      await takeScreenshot("08-scrolled");
    }

    console.log("\n✓ Test sequence completed");

  } catch (error) {
    console.error("Error:", error);
    await takeScreenshot("99-error");
  } finally {
    await browser.close();
    await server.close();
    console.log(`\nScreenshots saved to: ${OUTPUT_DIR}`);
  }
}

runTest().catch(console.error);
