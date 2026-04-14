/**
 * Window Operations Test Suite
 * Tests: drag, resize, minimize, restore, close
 */
import { MockOsEnv } from "./packages/core/dist/index.js";
import { mkdirSync, writeFileSync, readFileSync } from "fs";
import { resolve } from "path";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { WebSocketServer } from "ws";
import { chromium } from "playwright";

const BASE_PORT = 4321;
const OUTPUT_DIR = resolve("logs/agent-tests/window-ops");
mkdirSync(OUTPUT_DIR, { recursive: true });

// Serve viewer for screenshots
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

// Helper: Take screenshot
async function screenshot(page, name, stepNum) {
  const path = resolve(OUTPUT_DIR, `${String(stepNum).padStart(2, "0")}_${name}.png`);
  await page.screenshot({ path });
  console.log(`  Screenshot: ${name} -> ${path}`);
  return path;
}

// Main test
async function runTest() {
  console.log("\n=== Window Operations Test ===\n");

  const server = await startServer(BASE_PORT);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(`http://127.0.0.1:${BASE_PORT}/session/s1`);
  await page.waitForTimeout(500);

  // Initialize env
  const env = new MockOsEnv({ width: 1280, height: 800 });
  env.reset({ taskId: "copy_line_between_windows", seed: 0, maxSteps: 0 });
  server.setModel(env.getRenderModel());
  await page.waitForTimeout(500);

  let step = 0;
  const results = [];

  // Step 0: Initial state
  console.log(`\n[Step ${step}] Initial state - many windows visible`);
  await screenshot(page, "initial_state", step);
  let model = env.getRenderModel();
  const initialWindows = model.windows || [];
  console.log(`  Initial windows: ${initialWindows.length}`);
  initialWindows.forEach(w => console.log(`    - ${w.id}: bounds(${w.bounds.x}, ${w.bounds.y}, ${w.bounds.width}x${w.bounds.height}), minimized=${w.minimized}`));
  results.push({ step, action: "initial", status: "PASS", windowCount: initialWindows.length });

  // Find first non-minimized window for dragging
  const windowToDrag = initialWindows.find(w => !w.minimized);
  if (!windowToDrag) {
    console.log("ERROR: No visible windows to drag");
    process.exit(1);
  }

  // Step 1: Move to window title bar
  step++;
  console.log(`\n[Step ${step}] Move to window title bar center`);
  const dragStartX = windowToDrag.bounds.x + windowToDrag.bounds.width / 2;
  const dragStartY = windowToDrag.bounds.y + 15;
  console.log(`  Moving to (${dragStartX}, ${dragStartY})`);
  env.step({ type: "MOVE_TO", x: dragStartX, y: dragStartY });
  server.setModel(env.getRenderModel());
  await page.waitForTimeout(200);
  await screenshot(page, "move_to_titlebar", step);
  results.push({ step, action: "move_to_titlebar", status: "PASS" });

  // Step 2: Mouse down
  step++;
  console.log(`\n[Step ${step}] Mouse down (left button)`);
  env.step({ type: "MOUSE_DOWN", button: "left" });
  server.setModel(env.getRenderModel());
  await page.waitForTimeout(200);
  await screenshot(page, "mouse_down", step);
  results.push({ step, action: "mouse_down", status: "PASS" });

  // Step 3: Drag to new position (100px right, 50px down)
  step++;
  console.log(`\n[Step ${step}] Drag to new position (100px right, 50px down)`);
  const dragEndX = dragStartX + 100;
  const dragEndY = dragStartY + 50;
  console.log(`  Dragging to (${dragEndX}, ${dragEndY})`);
  env.step({ type: "DRAG_TO", x: dragEndX, y: dragEndY });
  server.setModel(env.getRenderModel());
  await page.waitForTimeout(200);
  await screenshot(page, "drag_to_new_position", step);
  results.push({ step, action: "drag_to_new_position", status: "PASS" });

  // Step 4: Mouse up
  step++;
  console.log(`\n[Step ${step}] Mouse up`);
  env.step({ type: "MOUSE_UP", button: "left" });
  server.setModel(env.getRenderModel());
  await page.waitForTimeout(200);
  await screenshot(page, "mouse_up_after_drag", step);

  model = env.getRenderModel();
  const draggedWindow = model.windows.find(w => w.id === windowToDrag.id);
  const windowMoved = draggedWindow.bounds.x !== windowToDrag.bounds.x || draggedWindow.bounds.y !== windowToDrag.bounds.y;
  console.log(`  Window before: (${windowToDrag.bounds.x}, ${windowToDrag.bounds.y})`);
  console.log(`  Window after:  (${draggedWindow.bounds.x}, ${draggedWindow.bounds.y})`);
  console.log(`  Position changed: ${windowMoved}`);
  results.push({
    step,
    action: "mouse_up_after_drag",
    status: windowMoved ? "PASS" : "FAIL",
    windowMoved,
    beforePos: { x: windowToDrag.bounds.x, y: windowToDrag.bounds.y },
    afterPos: { x: draggedWindow.bounds.x, y: draggedWindow.bounds.y }
  });

  // Find second window for resize
  const windowToResize = initialWindows.find(w => !w.minimized && w.id !== windowToDrag.id);
  if (!windowToResize) {
    console.log("WARNING: Only one window available, skipping resize test");
  } else {
    // Step 5: Move to bottom-right corner of another window
    step++;
    console.log(`\n[Step ${step}] Move to bottom-right corner of window`);
    const resizeStartX = windowToResize.bounds.x + windowToResize.bounds.width - 4;
    const resizeStartY = windowToResize.bounds.y + windowToResize.bounds.height - 4;
    console.log(`  Moving to (${resizeStartX}, ${resizeStartY})`);
    env.step({ type: "MOVE_TO", x: resizeStartX, y: resizeStartY });
    server.setModel(env.getRenderModel());
    await page.waitForTimeout(200);
    await screenshot(page, "move_to_resize_corner", step);
    results.push({ step, action: "move_to_resize_corner", status: "PASS" });

    // Step 6: Mouse down for resize
    step++;
    console.log(`\n[Step ${step}] Mouse down for resize`);
    env.step({ type: "MOUSE_DOWN", button: "left" });
    server.setModel(env.getRenderModel());
    await page.waitForTimeout(200);
    await screenshot(page, "mouse_down_resize", step);
    results.push({ step, action: "mouse_down_resize", status: "PASS" });

    // Step 7: Drag to resize (expand by 80px width, 60px height)
    step++;
    console.log(`\n[Step ${step}] Drag to resize (expand 80px width, 60px height)`);
    const resizeEndX = resizeStartX + 80;
    const resizeEndY = resizeStartY + 60;
    console.log(`  Dragging to (${resizeEndX}, ${resizeEndY})`);
    env.step({ type: "DRAG_TO", x: resizeEndX, y: resizeEndY });
    server.setModel(env.getRenderModel());
    await page.waitForTimeout(200);
    await screenshot(page, "drag_to_resize", step);
    results.push({ step, action: "drag_to_resize", status: "PASS" });

    // Step 8: Mouse up to complete resize
    step++;
    console.log(`\n[Step ${step}] Mouse up to complete resize`);
    env.step({ type: "MOUSE_UP", button: "left" });
    server.setModel(env.getRenderModel());
    await page.waitForTimeout(200);
    await screenshot(page, "mouse_up_after_resize", step);

    model = env.getRenderModel();
    const resizedWindow = model.windows.find(w => w.id === windowToResize.id);
    const windowResized = resizedWindow.bounds.width !== windowToResize.bounds.width ||
                          resizedWindow.bounds.height !== windowToResize.bounds.height;
    console.log(`  Window before: ${windowToResize.bounds.width}x${windowToResize.bounds.height}`);
    console.log(`  Window after:  ${resizedWindow.bounds.width}x${resizedWindow.bounds.height}`);
    console.log(`  Size changed: ${windowResized}`);
    results.push({
      step,
      action: "mouse_up_after_resize",
      status: windowResized ? "PASS" : "FAIL",
      windowResized,
      beforeSize: { width: windowToResize.bounds.width, height: windowToResize.bounds.height },
      afterSize: { width: resizedWindow.bounds.width, height: resizedWindow.bounds.height }
    });
  }

  // Find a window with minimize button
  step++;
  console.log(`\n[Step ${step}] Click minimize button`);
  model = env.getRenderModel();
  const windowToMinimize = model.windows.find(w => !w.minimized);
  if (!windowToMinimize) {
    console.log("  WARNING: No visible windows to minimize");
    results.push({ step, action: "minimize_click", status: "SKIP" });
  } else {
    // Minimize button is typically at top-right, before close button
    const minimizeX = windowToMinimize.bounds.x + windowToMinimize.bounds.width - 50;
    const minimizeY = windowToMinimize.bounds.y + 12;
    console.log(`  Clicking minimize button at (${minimizeX}, ${minimizeY})`);
    env.step({ type: "CLICK", x: minimizeX, y: minimizeY });
    server.setModel(env.getRenderModel());
    await page.waitForTimeout(300);
    await screenshot(page, "after_minimize", step);

    model = env.getRenderModel();
    const minimizedWindow = model.windows.find(w => w.id === windowToMinimize.id);
    const isMinimized = minimizedWindow.minimized;
    console.log(`  Window minimized: ${isMinimized}`);
    results.push({
      step,
      action: "minimize_click",
      status: isMinimized ? "PASS" : "FAIL",
      windowMinimized: isMinimized,
      windowId: windowToMinimize.id
    });

    // Step 9: Click taskbar icon to restore
    step++;
    console.log(`\n[Step ${step}] Click taskbar icon to restore`);
    // Taskbar icons are on the left side, roughly at x=35
    const taskbarIconY = 110; // Approximate position
    console.log(`  Clicking taskbar at (35, ${taskbarIconY})`);
    env.step({ type: "CLICK", x: 35, y: taskbarIconY });
    server.setModel(env.getRenderModel());
    await page.waitForTimeout(300);
    await screenshot(page, "after_restore", step);

    model = env.getRenderModel();
    const restoredWindow = model.windows.find(w => w.id === windowToMinimize.id);
    const isRestored = !restoredWindow.minimized;
    console.log(`  Window restored: ${isRestored}`);
    results.push({
      step,
      action: "taskbar_restore",
      status: isRestored ? "PASS" : "FAIL",
      windowRestored: isRestored,
      windowId: windowToMinimize.id
    });
  }

  // Step 10: Find a window and close it
  step++;
  console.log(`\n[Step ${step}] Click close button`);
  model = env.getRenderModel();
  const windowToClose = model.windows.find(w => !w.minimized);
  if (!windowToClose) {
    console.log("  WARNING: No visible windows to close");
    results.push({ step, action: "close_click", status: "SKIP" });
  } else {
    // Close button is typically at top-right corner
    const closeX = windowToClose.bounds.x + windowToClose.bounds.width - 20;
    const closeY = windowToClose.bounds.y + 12;
    console.log(`  Clicking close button at (${closeX}, ${closeY})`);
    const windowCountBefore = model.windows.length;
    env.step({ type: "CLICK", x: closeX, y: closeY });
    server.setModel(env.getRenderModel());
    await page.waitForTimeout(300);
    await screenshot(page, "after_close", step);

    model = env.getRenderModel();
    const windowCountAfter = model.windows.length;
    const windowClosed = !model.windows.find(w => w.id === windowToClose.id);
    console.log(`  Window count before: ${windowCountBefore}, after: ${windowCountAfter}`);
    console.log(`  Window closed: ${windowClosed}`);
    results.push({
      step,
      action: "close_click",
      status: windowClosed ? "PASS" : "FAIL",
      windowClosed,
      windowCountBefore,
      windowCountAfter,
      windowId: windowToClose.id
    });
  }

  // Write report
  const report = {
    scenario: "Drag windows, resize them, minimize and restore",
    totalSteps: step,
    results,
    timestamp: new Date().toISOString()
  };

  writeFileSync(resolve(OUTPUT_DIR, "test-report.json"), JSON.stringify(report, null, 2));
  console.log(`\n✓ Report saved: ${resolve(OUTPUT_DIR, "test-report.json")}`);
  console.log(`✓ Screenshots saved to: ${OUTPUT_DIR}`);

  // Summary
  const passCount = results.filter(r => r.status === "PASS").length;
  const failCount = results.filter(r => r.status === "FAIL").length;
  const skipCount = results.filter(r => r.status === "SKIP").length;

  console.log(`\n=== TEST SUMMARY ===`);
  console.log(`Total steps: ${step}`);
  console.log(`PASS: ${passCount}`);
  console.log(`FAIL: ${failCount}`);
  console.log(`SKIP: ${skipCount}`);

  if (failCount === 0) {
    console.log("\n✓ ALL TESTS PASSED");
  } else {
    console.log("\n✗ SOME TESTS FAILED");
    results.filter(r => r.status === "FAIL").forEach(r => {
      console.log(`  Step ${r.step}: ${r.action}`);
    });
  }

  await browser.close();
  await server.close();
}

runTest().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
