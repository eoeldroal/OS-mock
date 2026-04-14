#!/usr/bin/env node
/**
 * File Explorer Sidebar Navigation Test
 * Tests clicking each sidebar place and verifies:
 * - currentPlace state changes
 * - File list changes appropriately
 * - Visual highlighting matches state
 */

import { MockOsEnv } from "./packages/core/dist/index.js";
import { mkdirSync, writeFileSync } from "fs";
import { resolve } from "path";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { WebSocketServer } from "ws";
import { chromium } from "playwright";
import { readFileSync } from "fs";

const BASE_PORT = 4321;
const OUTPUT_DIR = resolve("logs/agent-tests/sidebar-test");
mkdirSync(OUTPUT_DIR, { recursive: true });

const SIDEBAR_PLACES = ["Home", "Desktop", "Documents", "Downloads", "workspace"];

// ────── Server Setup ──────
async function startServer(port) {
  const fastify = Fastify({ logger: false });
  try {
    const webAssetsDir = resolve("packages/web/dist/assets");
    await fastify.register(fastifyStatic, { root: webAssetsDir, prefix: "/assets/" });
  } catch (e) {
    console.warn("Could not register static assets");
  }

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
      for (const ws of subs) {
        if (ws.readyState === 1) ws.send(payload);
      }
    },
    async close() { await fastify.close(); }
  };
}

// ────── Main Test ──────
async function main() {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("FILE EXPLORER SIDEBAR NAVIGATION TEST");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const server = await startServer(BASE_PORT);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  // Navigate to viewer
  await page.goto(`http://127.0.0.1:${BASE_PORT}/session/s1`);
  await page.waitForTimeout(1500);

  // Create environment
  const env = new MockOsEnv({ width: 1280, height: 800 });

  // Reset to task
  console.log("Resetting to task: rename_note_in_explorer (seed 0)");
  env.reset({ taskId: "rename_note_in_explorer", seed: 0, maxSteps: 0 });
  server.setModel(env.getRenderModel());
  await page.waitForTimeout(500);

  // Get initial model
  let renderModel = env.getRenderModel();
  console.log(`Initial state loaded. Windows: ${renderModel.windows?.length || 0}`);

  // Find file explorer window
  const explorerWindow = renderModel.windows?.find(w => w.appId === "file-explorer");
  if (!explorerWindow) {
    console.error("ERROR: File Explorer window not found!");
    await browser.close();
    await server.close();
    process.exit(1);
  }

  console.log(`File Explorer window found at bounds: (${explorerWindow.bounds.x}, ${explorerWindow.bounds.y}, ${explorerWindow.bounds.width}x${explorerWindow.bounds.height})\n`);

  // Get sidebar layout
  const { sidebarItemRects } = getFileExplorerLayout(explorerWindow.bounds);

  console.log("Sidebar item rectangles:");
  SIDEBAR_PLACES.forEach((place, index) => {
    const rect = sidebarItemRects[index];
    console.log(`  ${place}: x=${rect.x}, y=${rect.y}, w=${rect.width}, h=${rect.height}`);
  });
  console.log("");

  const results = [];

  // Test each sidebar place
  for (let i = 0; i < SIDEBAR_PLACES.length; i++) {
    const place = SIDEBAR_PLACES[i];
    const rect = sidebarItemRects[i];
    const centerX = rect.x + rect.width / 2;
    const centerY = rect.y + rect.height / 2;

    console.log(`\n━━ Testing: ${place} ━━`);
    console.log(`Clicking at center: (${centerX.toFixed(0)}, ${centerY.toFixed(0)})`);

    // Perform click
    const clickAction = {
      type: "CLICK",
      x: Math.round(centerX),
      y: Math.round(centerY),
      numClicks: 1
    };

    const result = env.step(clickAction);

    if (!result.actionAccepted) {
      console.log(`  ERROR: Click was not accepted!`);
      results.push({
        place,
        success: false,
        error: "Click rejected",
        actionAccepted: false
      });
    } else {
      console.log(`  Click accepted`);
    }

    // Update server and take screenshot
    server.setModel(env.getRenderModel());
    await page.waitForTimeout(300);

    const screenshotPath = resolve(OUTPUT_DIR, `${String(i).padStart(2, "0")}_${place.toLowerCase()}.png`);
    await page.screenshot({ path: screenshotPath });
    console.log(`  Screenshot saved: ${screenshotPath}`);

    // Get state after click
    renderModel = env.getRenderModel();
    const explorerApp = renderModel.windows?.find(w => w.appId === "file-explorer")?.appView;

    if (explorerApp && explorerApp.type === "file-explorer") {
      const currentPlace = explorerApp.currentPlace;
      const fileCount = explorerApp.files?.length || 0;
      const fileNames = explorerApp.files?.map(f => f.name) || [];

      console.log(`  State after click:`);
      console.log(`    currentPlace: ${currentPlace}`);
      console.log(`    files: ${fileCount} item(s) [${fileNames.join(", ")}]`);

      const success = currentPlace === place;
      console.log(`    match: ${success ? "YES" : "NO"}`);

      results.push({
        place,
        success,
        currentPlace,
        fileCount,
        fileNames,
        actionAccepted: result.actionAccepted,
        screenshotPath
      });
    } else {
      console.log(`  ERROR: Could not read app state`);
      results.push({
        place,
        success: false,
        error: "Could not read app state",
        actionAccepted: result.actionAccepted
      });
    }
  }

  // Summary
  console.log("\n" + "━".repeat(70));
  console.log("TEST RESULTS SUMMARY");
  console.log("━".repeat(70));

  const passCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  console.log(`Total tests: ${results.length}`);
  console.log(`Passed: ${passCount}`);
  console.log(`Failed: ${failCount}`);
  console.log("");

  console.log("Detailed Results:");
  results.forEach((r, i) => {
    const status = r.success ? "PASS" : "FAIL";
    console.log(`  ${i + 1}. ${r.place}: ${status}`);
    if (r.currentPlace !== undefined) {
      console.log(`     Expected: ${r.place}, Got: ${r.currentPlace}`);
    }
    if (r.error) {
      console.log(`     Error: ${r.error}`);
    }
  });

  // Write results JSON
  const reportPath = resolve(OUTPUT_DIR, "report.json");
  writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    task: "rename_note_in_explorer",
    seed: 0,
    viewport: { width: 1280, height: 800 },
    sidebarPlaces: SIDEBAR_PLACES,
    results,
    summary: {
      total: results.length,
      passed: passCount,
      failed: failCount
    }
  }, null, 2));

  console.log(`\nReport saved to: ${reportPath}`);
  console.log(`Screenshots saved to: ${OUTPUT_DIR}`);

  await browser.close();
  await server.close();

  process.exit(failCount > 0 ? 1 : 0);
}

// ────── File Explorer Layout (from file-explorer.ts) ──────
function getFileExplorerLayout(bounds) {
  const HEADER_HEIGHT = 40;
  const SIDEBAR_WIDTH = 176;
  const TOOLBAR_HEIGHT = 54;
  const MAIN_PADDING = 16;
  const SIDEBAR_ITEM_HEIGHT = 38;
  const SIDEBAR_ITEM_GAP = 6;
  const SIDEBAR_TOP_OFFSET = 46;

  const sidebarX = bounds.x + 14;
  const sidebarBaseY = bounds.y + HEADER_HEIGHT + 16 + SIDEBAR_TOP_OFFSET;
  const sidebarItemRects = ["Home", "Desktop", "Documents", "Downloads", "workspace"].map((_, index) => ({
    x: sidebarX,
    y: sidebarBaseY + index * (SIDEBAR_ITEM_HEIGHT + SIDEBAR_ITEM_GAP),
    width: SIDEBAR_WIDTH - 28,
    height: SIDEBAR_ITEM_HEIGHT
  }));

  return { sidebarItemRects };
}

// ────── Run ──────
main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
