/**
 * Test: Dismiss Popup, Edit Note, and Save
 * Tests the complete workflow: dismiss popup -> edit text -> save -> undo
 */

import { MockOsEnv } from "./packages/core/dist/index.js";
import { mkdirSync } from "fs";
import { resolve } from "path";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { WebSocketServer } from "ws";
import { chromium } from "playwright";
import { readFileSync } from "fs";

const OUTPUT_DIR = resolve("logs/agent-tests/popup-edit");
mkdirSync(OUTPUT_DIR, { recursive: true });

let screenshotCounter = 1;

async function main() {
  console.log("=== Popup Edit Test ===\n");

  // Initialize MockOsEnv first
  console.log("Initializing MockOsEnv...");
  const env = new MockOsEnv({ width: 1280, height: 1024 });

  // Reset to task
  console.log("Resetting to task 'dismiss_popup_then_append_note', seed 0...");
  env.reset({
    taskId: "dismiss_popup_then_append_note",
    seed: 0,
    maxSteps: 0
  });

  // Start server
  console.log("Starting Fastify server...");
  const server = await startServer(3456, env);

  // Launch browser
  console.log("Launching browser...");
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 1024 } });

  // Navigate to viewer
  console.log("Navigating to viewer...\n");
  await page.goto("http://127.0.0.1:3456/session/s1");
  await page.waitForTimeout(500);

  try {
    // Step a: Initial state (with popup)
    console.log("Step a: Initial state (with popup)");
    server.setModel(env.getRenderModel());
    await page.waitForTimeout(500);
    await takeScreenshot(page, OUTPUT_DIR, "01_initial_state_with_popup");

    const initialRender = env.getRenderModel();
    console.log("Initial render has popups:", initialRender.popups?.length > 0);

    // Step b: Click dismiss button
    console.log("\nStep b: Click dismiss button");
    if (initialRender.popups && initialRender.popups.length > 0) {
      const popup = initialRender.popups[0];
      console.log(`Found popup: "${popup.title}"`);

      // Button is positioned at right: 24, bottom: 22 within the popup
      // padding: "10px 18px" means button is roughly 36px wide (18+18) and 20px tall (10+10)
      // Calculate button center position (approximately)
      const buttonCenterX = popup.bounds.x + popup.bounds.width - 24 - 18;  // right edge minus offset minus half button
      const buttonCenterY = popup.bounds.y + popup.bounds.height - 22 - 10; // bottom edge minus offset minus half button

      console.log(`Clicking dismiss button at (${buttonCenterX}, ${buttonCenterY})`);

      const result = env.step({
        type: "CLICK",
        x: buttonCenterX,
        y: buttonCenterY
      });

      console.log(`  Action accepted: ${result.actionAccepted}`);
      console.log(`  Reward: ${result.reward}`);

      await page.waitForTimeout(300);
      server.setModel(env.getRenderModel());
      await page.waitForTimeout(300);
    }

    // Step c: Screenshot after dismiss
    console.log("Step c: After dismiss");
    await takeScreenshot(page, OUTPUT_DIR, "02_after_dismiss_popup");

    const afterDismissRender = env.getRenderModel();
    console.log("After dismiss popups count:", afterDismissRender.popups?.length || 0);

    // Step d: Click in note editor - look for todo.txt or text editor
    console.log("\nStep d: Click in note editor");
    let editorFound = false;
    if (afterDismissRender.windows && afterDismissRender.windows.length > 0) {
      // Try to find text editor window
      const textEditorWindow = afterDismissRender.windows.find(w =>
        w.title && (w.title.includes("Text") || w.title.includes("Editor") || w.title.includes("gedit"))
      );

      if (textEditorWindow && textEditorWindow.bounds) {
        const bounds = textEditorWindow.bounds;
        const clickX = bounds.x + bounds.width / 2;
        const clickY = bounds.y + bounds.height / 2;
        console.log(`Found text editor: "${textEditorWindow.title}", clicking at (${clickX}, ${clickY})`);

        const result = env.step({
          type: "CLICK",
          x: clickX,
          y: clickY
        });
        console.log(`  Action accepted: ${result.actionAccepted}`);
        editorFound = true;

        await page.waitForTimeout(300);
        server.setModel(env.getRenderModel());
        await page.waitForTimeout(300);
      }
    }

    if (!editorFound) {
      console.log("No dedicated text editor found, will click in Files window");
    }

    // Step e: Screenshot after clicking in editor
    console.log("Step e: After clicking in editor");
    await takeScreenshot(page, OUTPUT_DIR, "03_editor_focused");

    // Step f: Type "Hello World"
    console.log("\nStep f: Type 'Hello World'");
    const typeResult = env.step({
      type: "TYPING",
      text: "Hello World"
    });
    console.log(`  Type result accepted: ${typeResult.actionAccepted}`);

    await page.waitForTimeout(300);
    server.setModel(env.getRenderModel());
    await page.waitForTimeout(300);

    // Step g: Screenshot after typing
    console.log("Step g: After typing");
    await takeScreenshot(page, OUTPUT_DIR, "04_after_typing");

    // Step h: Save with Ctrl+S
    console.log("\nStep h: Save with Ctrl+S");
    const saveResult = env.step({
      type: "HOTKEY",
      keys: ["ctrl", "s"]
    });
    console.log(`  Save result accepted: ${saveResult.actionAccepted}`);
    console.log(`  Reward: ${saveResult.reward}`);

    await page.waitForTimeout(300);
    server.setModel(env.getRenderModel());
    await page.waitForTimeout(300);

    // Step i: Screenshot saved state
    console.log("Step i: After save");
    await takeScreenshot(page, OUTPUT_DIR, "05_after_save");

    // Step j: Undo with Ctrl+Z
    console.log("\nStep j: Undo (Ctrl+Z)");
    const undoResult = env.step({
      type: "HOTKEY",
      keys: ["ctrl", "z"]
    });
    console.log(`  Undo result accepted: ${undoResult.actionAccepted}`);

    await page.waitForTimeout(300);
    server.setModel(env.getRenderModel());
    await page.waitForTimeout(300);

    // Step k: Screenshot undo state
    console.log("Step k: After undo");
    await takeScreenshot(page, OUTPUT_DIR, "06_after_undo");

    console.log("\n=== Test Complete ===");
    console.log(`Screenshots saved to: ${OUTPUT_DIR}`);

  } finally {
    // Cleanup
    await browser.close();
    await server.close();
  }
}

async function startServer(port, env) {
  const fastify = Fastify({ logger: false });

  // Serve web assets
  try {
    const webAssetsDir = resolve("packages/web/dist/assets");
    await fastify.register(fastifyStatic, {
      root: webAssetsDir,
      prefix: "/assets/"
    });
  } catch (e) {
    console.warn("Could not register static assets (web may not be built)");
  }

  fastify.get("/session/s1", async (_, reply) => {
    try {
      const html = readFileSync("packages/web/dist/index.html", "utf8");
      return reply.type("text/html").send(html);
    } catch {
      return reply.type("text/html").send("<h1>ERROR: Build web first with: npm run build</h1>");
    }
  });

  let currentModel = null;
  fastify.get("/api/sessions/s1/render-model", async () => currentModel);

  const wss = new WebSocketServer({ noServer: true });
  const subs = new Set();

  fastify.server.on("upgrade", (req, sock, head) => {
    if (!req.url?.startsWith("/ws")) {
      sock.destroy();
      return;
    }
    wss.handleUpgrade(req, sock, head, (ws) => {
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
        if (ws.readyState === 1) {
          ws.send(payload);
        }
      }
    },
    async close() {
      await fastify.close();
    }
  };
}

async function takeScreenshot(page, outputDir, name) {
  const filename = `${String(screenshotCounter).padStart(2, "0")}_${name}.png`;
  const filepath = resolve(outputDir, filename);
  await page.screenshot({ path: filepath });
  console.log(`  Screenshot: ${filename}`);
  screenshotCounter++;
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
