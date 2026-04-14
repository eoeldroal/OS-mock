/**
 * Verify Fixes - Uses the same WebSocket architecture as scripts/replay/batch-replay-all.mjs
 * for proper React viewer rendering in Playwright screenshots.
 */
import { MockOsEnv } from "../../packages/core/dist/index.js";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { WebSocketServer } from "ws";
import { chromium } from "playwright";
import { mkdirSync, readFileSync } from "fs";
import { resolve } from "path";

const OUT = resolve("logs/batch-replay/verify-fixes");
mkdirSync(OUT, { recursive: true });

// ── Reuse the same server architecture as scripts/replay/batch-replay-all.mjs ──
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

const PORT = 4360;
const server = await startServer(PORT);
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(`http://127.0.0.1:${PORT}/session/s1`);
await page.waitForTimeout(1500);

const env = new MockOsEnv({ width: 1280, height: 800 });

async function screenshot(name) {
  server.setModel(env.getRenderModel());
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`Screenshot: ${name}`);
}

function step(action) {
  return env.step(action);
}

// ============ TEST 1: File Explorer Sidebar Navigation ============
console.log("\n=== TEST 1: File Explorer Sidebar Navigation ===");
env.reset({ taskId: "rename_note_in_explorer", seed: 0 });
await screenshot("01_initial");

const model = env.getRenderModel();
const explorer = model.windows.find(w => w.appId === "file-explorer");
console.log("Explorer window:", explorer?.id, "bounds:", explorer?.bounds);
console.log("Initial currentPlace:", explorer?.appView.currentPlace);
console.log("Initial files:", explorer?.appView.files.map(f => f.name));

// Click each sidebar place
const SIDEBAR_PLACES = ["Home", "Desktop", "Documents", "Downloads", "workspace"];
const SIDEBAR_X = explorer.bounds.x + 14;
const SIDEBAR_BASE_Y = explorer.bounds.y + 40 + 16 + 46;
const SIDEBAR_ITEM_HEIGHT = 38;
const SIDEBAR_ITEM_GAP = 6;

for (let i = 0; i < SIDEBAR_PLACES.length; i++) {
  const y = SIDEBAR_BASE_Y + i * (SIDEBAR_ITEM_HEIGHT + SIDEBAR_ITEM_GAP) + SIDEBAR_ITEM_HEIGHT / 2;
  const x = SIDEBAR_X + 60;
  const r = step({ type: "CLICK", x, y });
  const m = env.getRenderModel();
  const exp = m.windows.find(w => w.appId === "file-explorer");
  console.log(`Clicked ${SIDEBAR_PLACES[i]} (${x},${y}): currentPlace=${exp.appView.currentPlace}, files=${exp.appView.files.length} [${exp.appView.files.map(f=>f.name).join(", ")}]`);
  await screenshot(`02_sidebar_${SIDEBAR_PLACES[i]}`);
}

// ============ TEST 2: Note Editor Cursor ============
console.log("\n=== TEST 2: Note Editor Cursor ===");
env.reset({ taskId: "undo_restore_content", seed: 0 });
await screenshot("03_note_initial");

const noteModel = env.getRenderModel();
const noteWin = noteModel.windows.find(w => w.appId === "note-editor");
if (noteWin) {
  console.log("Note editor:", noteWin.appView.fileName, "cursor:", noteWin.appView.cursorIndex);
  const editorBounds = noteWin.appView.editorBounds;
  step({ type: "CLICK", x: editorBounds.x + 50, y: editorBounds.y + 20 });
  const m2 = env.getRenderModel();
  const n2 = m2.windows.find(w => w.appId === "note-editor");
  console.log("After click: cursor=", n2.appView.cursorIndex, "content length=", n2.appView.content.length);
  await screenshot("04_note_cursor");

  step({ type: "TYPING", text: "TEST" });
  const m3 = env.getRenderModel();
  const n3 = m3.windows.find(w => w.appId === "note-editor");
  console.log("After typing: dirty=", n3.appView.dirty, "cursor=", n3.appView.cursorIndex);
  await screenshot("05_note_typed");
}

// ============ TEST 3: Context Menu ============
console.log("\n=== TEST 3: Context Menu ===");
env.reset({ taskId: "context_menu_delete", seed: 0 });
await screenshot("06_ctx_initial");

const ctxModel = env.getRenderModel();
const ctxExplorer = ctxModel.windows.find(w => w.appId === "file-explorer");
step({ type: "CLICK", x: ctxExplorer.bounds.x + 300, y: ctxExplorer.bounds.y + 180 });
await screenshot("07_ctx_file_selected");

step({ type: "RIGHT_CLICK", x: ctxExplorer.bounds.x + 300, y: ctxExplorer.bounds.y + 180 });
const ctxM = env.getRenderModel();
console.log("Context menu:", ctxM.contextMenu ? `${ctxM.contextMenu.items.length} items: ${ctxM.contextMenu.items.map(i=>i.label).join(", ")}` : "NONE");
await screenshot("08_ctx_menu_visible");

step({ type: "PRESS", key: "Escape" });
await screenshot("09_ctx_menu_dismissed");

// ============ TEST 4: Desktop Icons ============
console.log("\n=== TEST 4: Desktop Icons ===");
env.reset({ taskId: "desktop_icon_launch", seed: 0 });
await screenshot("10_desktop_icons");
const iconModel = env.getRenderModel();
console.log("Desktop icons:", iconModel.desktopIcons.map(i => `${i.label}(${i.bounds.x},${i.bounds.y})`));

// ============ TEST 5: Popup Dismiss ============
console.log("\n=== TEST 5: Popup ===");
env.reset({ taskId: "dismiss_popup_then_append_note", seed: 0 });
await screenshot("11_popup_visible");
const popModel = env.getRenderModel();
console.log("Popups:", popModel.popups?.length, popModel.popups?.[0]?.title);

if (popModel.popups?.length > 0) {
  const p = popModel.popups[0];
  step({ type: "CLICK", x: p.bounds.x + p.bounds.width - 60, y: p.bounds.y + p.bounds.height - 30 });
  await screenshot("12_popup_dismissed");
  const m = env.getRenderModel();
  console.log("After dismiss: popups=", m.popups?.length);
}

// ============ TEST 6: Terminal ============
console.log("\n=== TEST 6: Terminal ===");
env.reset({ taskId: "terminal_ls_and_log", seed: 0 });
await screenshot("13_terminal_initial");
const termModel = env.getRenderModel();
const termWin = termModel.windows.find(w => w.appId === "terminal-lite");
if (termWin) {
  console.log("Terminal prompt:", termWin.appView.prompt);
  step({ type: "TYPING", text: "ls" });
  await screenshot("14_terminal_typed");
  step({ type: "PRESS", key: "Enter" });
  await screenshot("15_terminal_executed");
  const tm = env.getRenderModel();
  const t = tm.windows.find(w => w.appId === "terminal-lite");
  console.log("After ls: output lines=", t.appView.outputLines?.length);
}

// ============ TEST 7: Mail ============
console.log("\n=== TEST 7: Mail ===");
env.reset({ taskId: "mail_extract_mock_note", seed: 0 });
await screenshot("16_mail_initial");
const mailModel = env.getRenderModel();
const mailWin = mailModel.windows.find(w => w.appId === "mail-lite");
if (mailWin) {
  console.log("Mail inbox:", mailWin.appView.inbox?.length, "messages");
  console.log("Selected:", mailWin.appView.selectedMessageId);
}

// ============ TEST 8: Browser ============
console.log("\n=== TEST 8: Browser ===");
env.reset({ taskId: "browser_log_workflow_task_id", seed: 0 });
await screenshot("17_browser_initial");
const brModel = env.getRenderModel();
const brWin = brModel.windows.find(w => w.appId === "browser-lite");
if (brWin) {
  console.log("Browser URL:", brWin.appView.currentUrl);
  console.log("Page title:", brWin.appView.pageTitle);
}

await browser.close();
await server.close();
console.log("\n=== All verification tests complete! ===");
console.log(`Screenshots saved to: ${OUT}/`);
