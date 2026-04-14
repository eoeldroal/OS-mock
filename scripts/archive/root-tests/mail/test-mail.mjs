/**
 * Mail (Thunderbird) App Test Script
 * Tests mail features: folder switching, message selection, preview, copying
 */
import { MockOsEnv } from "./packages/core/dist/index.js";
import { mkdirSync, writeFileSync, readFileSync } from "fs";
import { resolve } from "path";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { WebSocketServer } from "ws";
import { chromium } from "playwright";

const BASE_PORT = 4321;
const OUTPUT_DIR = resolve("logs/agent-tests/mail-test");
mkdirSync(OUTPUT_DIR, { recursive: true });

// ── Serve viewer for screenshots ──
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

// ── Helper to print mail appView state ──
function printMailState(env, windowId) {
  const model = env.getRenderModel();
  const window = model.windows?.find(w => w.id === windowId);
  if (!window || window.appView.type !== "mail-lite") {
    console.log("  [ERROR] Mail window not found or wrong app type");
    return;
  }
  const view = window.appView;
  console.log("  MailView State:");
  console.log(`    selectedFolder: ${view.selectedFolder}`);
  console.log(`    folders: [${view.folders.map(f => `${f.name}(id=${f.id})`).join(", ")}]`);
  console.log(`    messages: [${view.messages.map(m => `${m.id}`).join(", ")}]`);
  console.log(`    selectedMessageId: ${view.selectedMessageId}`);
  console.log(`    previewBody lines: ${view.previewBody.length}`);
  if (view.previewBody.length > 0) {
    console.log(`    previewBody[0..2]: [${view.previewBody.slice(0, 3).map(l => `"${l}"`).join(", ")}${view.previewBody.length > 3 ? ", ..." : ""}]`);
  }
  console.log(`    selectedPreviewLineIndex: ${view.selectedPreviewLineIndex ?? "undefined"}`);
}

// ── Main test function ──
async function runMailTest() {
  console.log("\n=== Mail (Thunderbird) App Test ===\n");

  const server = await startServer(BASE_PORT);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  try {
    // 1. Navigate to app
    console.log("1. Navigating to app...");
    await page.goto(`http://127.0.0.1:${BASE_PORT}/session/s1`);
    await page.waitForTimeout(800);

    // 2. Reset to mail_extract_mock_note task
    console.log("2. Resetting to mail_extract_mock_note task (seed=0)...");
    const env = new MockOsEnv({ width: 1280, height: 800 });
    env.reset({ taskId: "mail_extract_mock_note", seed: 0, maxSteps: 0 });
    server.setModel(env.getRenderModel());
    await page.waitForTimeout(400);

    // Get the mail window ID
    const model = env.getRenderModel();
    const mailWindow = model.windows?.find(w => w.appView.type === "mail-lite");
    if (!mailWindow) {
      throw new Error("No mail window found!");
    }
    const windowId = mailWindow.id;
    console.log(`   Mail window ID: ${windowId}`);

    // 3a. Screenshot initial state
    console.log("\n3a. Taking initial screenshot...");
    const initialPath = resolve(OUTPUT_DIR, "00_initial.png");
    await page.screenshot({ path: initialPath });
    console.log(`   Saved: ${initialPath}`);
    printMailState(env, windowId);

    // 3b. Click on mail window to focus
    console.log("\n3b. Clicking on mail window to focus...");
    const clickX = mailWindow.bounds.x + mailWindow.bounds.width / 2;
    const clickY = mailWindow.bounds.y + mailWindow.bounds.height / 2;
    const result1 = env.step({ type: "CLICK", x: clickX, y: clickY });
    console.log(`   Action accepted: ${result1.actionAccepted}`);
    server.setModel(env.getRenderModel());
    await page.waitForTimeout(300);
    const click1Path = resolve(OUTPUT_DIR, "01_after_focus_click.png");
    await page.screenshot({ path: click1Path });
    printMailState(env, windowId);

    // 3c. Get folder bounds from layout and click on folders
    console.log("\n3c. Testing folder clicks...");
    const folders = env.getRenderModel().windows.find(w => w.id === windowId).appView.folders;
    console.log(`   Found ${folders.length} folders: ${folders.map(f => f.name).join(", ")}`);

    // Click on Drafts folder
    if (folders.length > 1) {
      console.log("\n   Clicking on Drafts folder...");
      // Sidebar is at x: bounds.x + 12, folders at y: bounds.y + 32 + 58 + index*44
      const sidebarX = mailWindow.bounds.x + 12 + 50;
      const draftsY = mailWindow.bounds.y + 32 + 58 + 1 * 44 + 22; // index 1, midpoint
      const result2 = env.step({ type: "CLICK", x: sidebarX, y: draftsY });
      console.log(`    Action accepted: ${result2.actionAccepted}`);
      server.setModel(env.getRenderModel());
      await page.waitForTimeout(300);
      const draftsPath = resolve(OUTPUT_DIR, "02_after_drafts_click.png");
      await page.screenshot({ path: draftsPath });
      console.log(`    Saved: ${draftsPath}`);
      printMailState(env, windowId);
    }

    // Click on Sent folder
    if (folders.length > 2) {
      console.log("\n   Clicking on Sent folder...");
      const sidebarX = mailWindow.bounds.x + 12 + 50;
      const sentY = mailWindow.bounds.y + 32 + 58 + 2 * 44 + 22; // index 2, midpoint
      const result3 = env.step({ type: "CLICK", x: sidebarX, y: sentY });
      console.log(`    Action accepted: ${result3.actionAccepted}`);
      server.setModel(env.getRenderModel());
      await page.waitForTimeout(300);
      const sentPath = resolve(OUTPUT_DIR, "03_after_sent_click.png");
      await page.screenshot({ path: sentPath });
      console.log(`    Saved: ${sentPath}`);
      printMailState(env, windowId);
    }

    // Click on Archive folder
    if (folders.length > 3) {
      console.log("\n   Clicking on Archive folder...");
      const sidebarX = mailWindow.bounds.x + 12 + 50;
      const archiveY = mailWindow.bounds.y + 32 + 58 + 3 * 44 + 22; // index 3, midpoint
      const result4 = env.step({ type: "CLICK", x: sidebarX, y: archiveY });
      console.log(`    Action accepted: ${result4.actionAccepted}`);
      server.setModel(env.getRenderModel());
      await page.waitForTimeout(300);
      const archivePath = resolve(OUTPUT_DIR, "04_after_archive_click.png");
      await page.screenshot({ path: archivePath });
      console.log(`    Saved: ${archivePath}`);
      printMailState(env, windowId);
    }

    // Click back to Inbox
    console.log("\n   Clicking back on Inbox folder...");
    const sidebarX = mailWindow.bounds.x + 12 + 50;
    const inboxY = mailWindow.bounds.y + 32 + 58 + 0 * 44 + 22; // index 0, midpoint
    const result5 = env.step({ type: "CLICK", x: sidebarX, y: inboxY });
    console.log(`    Action accepted: ${result5.actionAccepted}`);
    server.setModel(env.getRenderModel());
    await page.waitForTimeout(300);
    const inboxPath = resolve(OUTPUT_DIR, "05_back_to_inbox.png");
    await page.screenshot({ path: inboxPath });
    printMailState(env, windowId);

    // 3d. Click on a message in the message list
    console.log("\n3d. Clicking on first message in list...");
    const messages = env.getRenderModel().windows.find(w => w.id === windowId).appView.messages;
    if (messages.length > 0) {
      // Message list is at x: sidebarX + sidebarWidth + 12, messages at y: ... + index*92
      const msgX = mailWindow.bounds.x + 12 + 100 + 50; // rough sidebar + gutter + offset
      const msgY = mailWindow.bounds.y + 32 + 58 + 0 * 92 + 46; // first message, midpoint
      const result6 = env.step({ type: "CLICK", x: msgX, y: msgY });
      console.log(`    Action accepted: ${result6.actionAccepted}`);
      server.setModel(env.getRenderModel());
      await page.waitForTimeout(300);
      const msgPath = resolve(OUTPUT_DIR, "06_after_message_click.png");
      await page.screenshot({ path: msgPath });
      console.log(`    Saved: ${msgPath}`);
      printMailState(env, windowId);
    }

    // 3e. Click on a preview body line to highlight it
    console.log("\n3e. Clicking on preview body line...");
    let previewX = mailWindow.bounds.x + 12 + 100 + 50 + 100 + 50; // rough estimate
    let previewY = mailWindow.bounds.y + 32 + 58 + 0 * 24 + 14; // first line
    const previewLines = env.getRenderModel().windows.find(w => w.id === windowId).appView.previewBody;
    if (previewLines.length > 0) {
      // Preview lines are at x: msgX + msgWidth + 12, y: ... + index*24
      const result7 = env.step({ type: "CLICK", x: previewX, y: previewY });
      console.log(`    Action accepted: ${result7.actionAccepted}`);
      server.setModel(env.getRenderModel());
      await page.waitForTimeout(300);
      const previewPath = resolve(OUTPUT_DIR, "07_after_preview_click.png");
      await page.screenshot({ path: previewPath });
      console.log(`    Saved: ${previewPath}`);
      printMailState(env, windowId);
    }

    // 3f. Hotkey Ctrl+C to copy
    console.log("\n3f. Pressing Ctrl+C to copy selected preview line...");
    const result8 = env.step({ type: "HOTKEY", keys: ["ctrl", "c"] });
    console.log(`    Action accepted: ${result8.actionAccepted}`);
    server.setModel(env.getRenderModel());
    await page.waitForTimeout(300);
    const copyPath = resolve(OUTPUT_DIR, "08_after_copy.png");
    await page.screenshot({ path: copyPath });

    // Check clipboard
    const hiddenState = env.getHiddenState();
    console.log(`    Clipboard content: "${hiddenState.clipboard ?? "EMPTY"}"`);
    printMailState(env, windowId);

    // 3g. Right-click for context menu
    console.log("\n3g. Right-clicking for context menu...");
    const result9 = env.step({ type: "RIGHT_CLICK", x: previewX, y: previewY });
    console.log(`    Action accepted: ${result9.actionAccepted}`);
    server.setModel(env.getRenderModel());
    await page.waitForTimeout(300);
    const contextPath = resolve(OUTPUT_DIR, "09_context_menu.png");
    await page.screenshot({ path: contextPath });
    console.log(`    Saved: ${contextPath}`);
    printMailState(env, windowId);

    console.log("\n=== Test Complete ===\n");
    console.log(`Screenshots saved to: ${OUTPUT_DIR}`);

  } catch (err) {
    console.error("Test failed:", err);
  } finally {
    await browser.close();
    await server.close();
  }
}

runMailTest().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
