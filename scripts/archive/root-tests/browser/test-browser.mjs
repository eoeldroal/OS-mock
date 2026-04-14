/**
 * Browser App Test Script
 * Tests the mock OS Browser (Firefox) application features
 * - Tabs navigation
 * - Category clicking
 * - Help lines selection and copying
 * - URL bar interaction
 */

import { MockOsEnv } from "./packages/core/dist/index.js";
import { mkdirSync, writeFileSync } from "fs";
import { resolve } from "path";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { WebSocketServer } from "ws";
import { chromium } from "playwright";

const OUTPUT_DIR = resolve("logs/agent-tests/browser-test");
mkdirSync(OUTPUT_DIR, { recursive: true });

let screenshotCounter = 0;

// ── Serve viewer for screenshots ──
async function startServer(port) {
  const fastify = Fastify({ logger: false });
  try {
    const webAssetsDir = resolve("packages/web/dist/assets");
    await fastify.register(fastifyStatic, { root: webAssetsDir, prefix: "/assets/" });
  } catch {}
  fastify.get("/session/s1", async (_, reply) => {
    try {
      const html = require("fs").readFileSync("packages/web/dist/index.html", "utf8");
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

// ── Helper functions ──
function getWindowId(model, appName) {
  const window = model.windows?.find(w => w.appView?.type === appName);
  return window?.id;
}

function getBrowserWindow(model) {
  return model.windows?.find(w => w.appView?.type === "browser-lite");
}

async function takeScreenshot(page, label) {
  screenshotCounter++;
  const filename = `${String(screenshotCounter).padStart(2, '0')}_${label}.png`;
  const filepath = resolve(OUTPUT_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: false });
  console.log(`  Screenshot: ${filename}`);
  return { label, filepath };
}

function printBrowserState(model, label) {
  const browser = getBrowserWindow(model);
  if (!browser || !browser.appView) {
    console.log(`  [${label}] No browser window found`);
    return;
  }

  const state = browser.appView;
  console.log(`  [${label}] Browser State:`);
  console.log(`    URL: ${state.url}`);
  console.log(`    PageTitle: ${state.pageTitle}`);
  console.log(`    CurrentPage: ${state.currentPage}`);
  console.log(`    Tabs: ${state.tabs.map(t => `${t.title}(${t.active ? 'active' : 'inactive'})`).join(', ')}`);
  console.log(`    Categories: ${state.categories.length} items - ${state.categories.map(c => c.label).join(', ')}`);
  console.log(`    SelectedCategoryId: ${state.selectedCategoryId}`);
  console.log(`    SelectedTaskId: ${state.selectedTaskId}`);
  console.log(`    HelpLines: ${state.helpLines.length} items`);
  console.log(`    SelectedHelpLineIndex: ${state.selectedHelpLineIndex}`);
}

// ── Main test ──
async function main() {
  console.log("\n═══════════════════════════════════════");
  console.log("   BROWSER APP TEST SCRIPT");
  console.log("═══════════════════════════════════════\n");

  // Start server
  console.log("1. Starting Fastify server...");
  const server = await startServer(4320);
  console.log("   ✓ Server started at http://127.0.0.1:4320\n");

  // Launch browser
  console.log("2. Launching Playwright browser...");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto("http://127.0.0.1:4320/session/s1");
  await page.waitForTimeout(500);
  console.log("   ✓ Browser loaded\n");

  // Initialize MockOsEnv
  console.log("3. Creating MockOsEnv and resetting to 'browser_capture_help_line' task...");
  const env = new MockOsEnv({ width: 1280, height: 800 });
  env.reset({ taskId: "browser_capture_help_line", seed: 0, maxSteps: 0 });
  console.log("   ✓ Environment reset\n");

  // Step 1: Initial screenshot
  console.log("STEP 1: Initial State - OSWorld Explorer");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  let model = env.getRenderModel();
  server.setModel(model);
  await page.waitForTimeout(400);
  await takeScreenshot(page, "01_initial_state");
  printBrowserState(model, "Initial");
  console.log();

  // Step 2: Print browser appView state details
  console.log("STEP 2: Detailed Browser AppView State");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  const browserWindow = getBrowserWindow(model);
  if (browserWindow) {
    console.log(`  Window bounds: ${JSON.stringify(browserWindow.bounds)}`);
    console.log(`  Window title: ${browserWindow.title}`);
    console.log(`  Window focused: ${browserWindow.focused}`);
    console.log(`  AppView type: ${browserWindow.appView.type}`);
  }
  console.log();

  // Step 3: Click on browser window to focus
  console.log("STEP 3: Click on Browser Window to Focus");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  if (browserWindow) {
    const clickX = browserWindow.bounds.x + browserWindow.bounds.width / 2;
    const clickY = browserWindow.bounds.y + browserWindow.bounds.height / 2;
    console.log(`  Clicking at (${clickX}, ${clickY})`);
    const result = env.step({ type: "CLICK", x: clickX, y: clickY });
    console.log(`  Action accepted: ${result.actionAccepted}`);
    model = env.getRenderModel();
    server.setModel(model);
    await page.waitForTimeout(300);
    await takeScreenshot(page, "02_browser_focused");
    printBrowserState(model, "After focus");
  }
  console.log();

  // Step 4: Click on different category tabs
  console.log("STEP 4: Click on Different Categories");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  const browserState = browserWindow.appView;
  const categories = browserState.categories;

  if (categories.length > 0) {
    console.log(`  Found ${categories.length} categories: ${categories.map(c => c.label).join(', ')}`);

    // Try to click on the first few categories
    for (let i = 0; i < Math.min(2, categories.length); i++) {
      console.log(`\n  [Category ${i + 1}] Clicking on "${categories[i].label}"`);

      // Calculate click position for category (they're in a vertical list on the left)
      // Based on getBrowserLiteLayout: categoryRects starts at categoriesBounds.x/y
      // Each category is 34px tall with 8px gap
      const categoryClickX = browserWindow.bounds.x + 150; // Approximate x position for categories
      const categoryClickY = browserWindow.bounds.y + 120 + (i * 42); // Approximate y for each category

      console.log(`    Clicking at approx (${categoryClickX}, ${categoryClickY})`);
      const result = env.step({ type: "CLICK", x: categoryClickX, y: categoryClickY });
      console.log(`    Action accepted: ${result.actionAccepted}`);

      model = env.getRenderModel();
      server.setModel(model);
      await page.waitForTimeout(300);
      await takeScreenshot(page, `03_category_${i + 1}_clicked`);
      printBrowserState(model, `After category ${i + 1} click`);
    }
  }
  console.log();

  // Step 5: Switch to help page (by clicking help tab or bookmark)
  console.log("STEP 5: Switch to Help Page");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  Current page: ${browserState.currentPage}`);
  console.log(`  Available tabs: ${browserState.tabs.map(t => t.title).join(', ')}`);

  if (browserState.tabs.length > 1) {
    // Click on second tab (Ubuntu help)
    console.log(`  Clicking on tab "Ubuntu help" (tab index 1)`);
    const tabClickX = browserWindow.bounds.x + 140; // Second tab position
    const tabClickY = browserWindow.bounds.y + 70; // Tab bar y position

    const result = env.step({ type: "CLICK", x: tabClickX, y: tabClickY });
    console.log(`  Action accepted: ${result.actionAccepted}`);

    model = env.getRenderModel();
    server.setModel(model);
    await page.waitForTimeout(300);
    await takeScreenshot(page, "04_help_tab_clicked");
    printBrowserState(model, "After help tab click");
  }
  console.log();

  // Step 6: Click on a help line to select it
  console.log("STEP 6: Click on Help Line to Select");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  const helpState = browserWindow.appView;
  console.log(`  Current page: ${helpState.currentPage}`);
  console.log(`  Help lines available: ${helpState.helpLines.length}`);

  if (helpState.helpLines.length > 0) {
    console.log(`  First help line: "${helpState.helpLines[0]}"`);

    // Click on first help line
    // Based on helpLineRects in getBrowserLiteLayout: starts at helpTextBounds.y + 70 + index * 66
    const helpLineClickX = browserWindow.bounds.x + 600; // Middle of help text area
    const helpLineClickY = browserWindow.bounds.y + 200; // Approximate position of first help line

    console.log(`  Clicking at approx (${helpLineClickX}, ${helpLineClickY})`);
    const result = env.step({ type: "CLICK", x: helpLineClickX, y: helpLineClickY });
    console.log(`  Action accepted: ${result.actionAccepted}`);

    model = env.getRenderModel();
    server.setModel(model);
    await page.waitForTimeout(300);
    await takeScreenshot(page, "05_help_line_selected");
    printBrowserState(model, "After help line selection");
  }
  console.log();

  // Step 7: Copy selected help line with Ctrl+C
  console.log("STEP 7: Copy Selected Help Line (Ctrl+C)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  if (helpState.helpLines.length > 0) {
    console.log(`  Executing HOTKEY: Ctrl+C`);
    const result = env.step({ type: "HOTKEY", keys: ["ctrl", "c"] });
    console.log(`  Action accepted: ${result.actionAccepted}`);

    // Get clipboard state from hidden state
    const hiddenState = env.getHiddenState();
    console.log(`  Clipboard content: "${hiddenState.clipboard || '(empty)'}"`);

    model = env.getRenderModel();
    server.setModel(model);
    await page.waitForTimeout(200);
    await takeScreenshot(page, "06_help_line_copied");
    printBrowserState(model, "After copy");
  }
  console.log();

  // Step 8: Click on a different help line
  console.log("STEP 8: Click on Different Help Line");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  if (helpState.helpLines.length > 1) {
    console.log(`  Second help line: "${helpState.helpLines[1]}"`);

    const helpLineClickX = browserWindow.bounds.x + 600;
    const helpLineClickY = browserWindow.bounds.y + 270; // Offset for second line

    console.log(`  Clicking at approx (${helpLineClickX}, ${helpLineClickY})`);
    const result = env.step({ type: "CLICK", x: helpLineClickX, y: helpLineClickY });
    console.log(`  Action accepted: ${result.actionAccepted}`);

    model = env.getRenderModel();
    server.setModel(model);
    await page.waitForTimeout(300);
    await takeScreenshot(page, "07_different_help_line");
    printBrowserState(model, "After selecting different line");
  }
  console.log();

  // Step 9: Switch back to explorer page
  console.log("STEP 9: Switch Back to Explorer Page");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  const currentState = browserWindow.appView;
  console.log(`  Current page: ${currentState.currentPage}`);

  if (currentState.tabs.length > 0) {
    console.log(`  Clicking on first tab "OSWorld Explorer"`);
    const tabClickX = browserWindow.bounds.x + 80; // First tab position
    const tabClickY = browserWindow.bounds.y + 70;

    const result = env.step({ type: "CLICK", x: tabClickX, y: tabClickY });
    console.log(`  Action accepted: ${result.actionAccepted}`);

    model = env.getRenderModel();
    server.setModel(model);
    await page.waitForTimeout(300);
    await takeScreenshot(page, "08_back_to_explorer");
    printBrowserState(model, "After switching back");
  }
  console.log();

  // Step 10: Click on URL bar
  console.log("STEP 10: Click on URL Bar");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  Current URL: ${currentState.url}`);

  const urlBarClickX = browserWindow.bounds.x + 640; // Middle of URL bar
  const urlBarClickY = browserWindow.bounds.y + 105; // URL bar y position

  console.log(`  Clicking at (${urlBarClickX}, ${urlBarClickY})`);
  const result = env.step({ type: "CLICK", x: urlBarClickX, y: urlBarClickY });
  console.log(`  Action accepted: ${result.actionAccepted}`);

  model = env.getRenderModel();
  server.setModel(model);
  await page.waitForTimeout(300);
  await takeScreenshot(page, "09_url_bar_clicked");
  printBrowserState(model, "After URL bar click");
  console.log();

  // Summary
  console.log("═══════════════════════════════════════");
  console.log("   TEST COMPLETE");
  console.log("═══════════════════════════════════════");
  console.log(`Screenshots saved to: ${OUTPUT_DIR}`);
  console.log(`Total screenshots: ${screenshotCounter}`);
  console.log();

  await browser.close();
  await server.close();
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
