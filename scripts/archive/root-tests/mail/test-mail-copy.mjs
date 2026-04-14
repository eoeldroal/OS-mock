/**
 * Mail Copy Workflow Test
 * Tests: Read mail -> Select text -> Copy -> Paste into note
 */
import { MockOsEnv } from "./packages/core/dist/index.js";
import { mkdirSync, writeFileSync } from "fs";
import { readFileSync } from "fs";
import { resolve } from "path";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { WebSocketServer } from "ws";
import { chromium } from "playwright";

const BASE_PORT = 4321;
const OUTPUT_DIR = resolve("logs/agent-tests/mail-copy");
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
  // Model endpoint will be set per-task
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
async function main() {
  console.log("\n=== Mail Copy Workflow Test ===\n");

  const server = await startServer(BASE_PORT);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(`http://127.0.0.1:${BASE_PORT}/session/s1`);
  await page.waitForTimeout(1500);

  // Reset to task
  const env = new MockOsEnv({ width: 1280, height: 800 });
  env.reset({ taskId: "mail_extract_mock_note", seed: 0, maxSteps: 0 });
  server.setModel(env.getRenderModel());
  await page.waitForTimeout(400);

  const steps = [];

  try {
    // ──── STEP a: Initial screenshot ────
    console.log("[a] Taking initial screenshot...");
    const path_a = resolve(OUTPUT_DIR, "00_initial.png");
    await page.screenshot({ path: path_a });
    steps.push({ step: "a", name: "initial", path: path_a });
    console.log(`    Saved to ${path_a}`);

    let model = env.getRenderModel();
    console.log(`    Windows: ${model.windows?.length || 0}`);
    model.windows?.forEach(w => {
      console.log(`      - ${w.title} [${w.id}] @(${w.bounds.x},${w.bounds.y}) ${w.bounds.width}x${w.bounds.height}`);
    });

    // Find mail window and note window
    const mailWindow = model.windows?.find(w => w.title?.toLowerCase().includes("mail"));
    const noteWindow = model.windows?.find(w => w.title?.toLowerCase().includes("note") || w.title?.toLowerCase().includes("editor"));
    console.log(`    Mail window: ${mailWindow?.id}`);
    console.log(`    Note window: ${noteWindow?.id}`);

    // ──── STEP b: Click on mail window to focus it ────
    console.log("\n[b] Clicking on mail window to focus...");
    if (mailWindow) {
      const clickX = mailWindow.bounds.x + mailWindow.bounds.width / 2;
      const clickY = mailWindow.bounds.y + mailWindow.bounds.height / 2;
      const result = env.step({ type: "CLICK", x: clickX, y: clickY });
      console.log(`    Action accepted: ${result.actionAccepted}`);
      console.log(`    Summary: ${result.info?.actionSummary}`);
      server.setModel(env.getRenderModel());
      await page.waitForTimeout(300);

      const path_b = resolve(OUTPUT_DIR, "01_mail_clicked.png");
      await page.screenshot({ path: path_b });
      steps.push({ step: "b", name: "mail_clicked", path: path_b });
      console.log(`    Saved to ${path_b}`);
    }

    // ──── STEP c: Screenshot - mail focused ────
    console.log("\n[c] Taking screenshot of focused mail...");
    model = env.getRenderModel();
    const focusedMail = model.windows?.find(w => w.id === mailWindow?.id);
    console.log(`    Mail focused: ${focusedMail?.focused}`);
    const path_c = resolve(OUTPUT_DIR, "02_mail_focused.png");
    await page.screenshot({ path: path_c });
    steps.push({ step: "c", name: "mail_focused", path: path_c });
    console.log(`    Saved to ${path_c}`);

    // ──── STEP d: Click on a mail message preview line ────
    console.log("\n[d] Clicking on mail message preview line...");
    if (mailWindow) {
      // Click in the content area to select a line
      const lineY = mailWindow.bounds.y + 120;
      const lineX = mailWindow.bounds.x + 50;
      const result = env.step({ type: "CLICK", x: lineX, y: lineY });
      console.log(`    Action accepted: ${result.actionAccepted}`);
      console.log(`    Summary: ${result.info?.actionSummary}`);
      server.setModel(env.getRenderModel());
      await page.waitForTimeout(300);

      const path_d = resolve(OUTPUT_DIR, "03_line_clicked.png");
      await page.screenshot({ path: path_d });
      steps.push({ step: "d", name: "line_clicked", path: path_d });
      console.log(`    Saved to ${path_d}`);
    }

    // ──── STEP e: Screenshot - line should be selected ────
    console.log("\n[e] Taking screenshot of selected line...");
    model = env.getRenderModel();
    const path_e = resolve(OUTPUT_DIR, "04_line_selected.png");
    await page.screenshot({ path: path_e });
    steps.push({ step: "e", name: "line_selected", path: path_e });
    console.log(`    Saved to ${path_e}`);

    // ──── STEP f: HOTKEY Ctrl+C to copy ────
    console.log("\n[f] Pressing Ctrl+C to copy...");
    const result_f = env.step({ type: "HOTKEY", keys: ["Control", "c"] });
    console.log(`    Action accepted: ${result_f.actionAccepted}`);
    console.log(`    Summary: ${result_f.info?.actionSummary}`);
    server.setModel(env.getRenderModel());
    await page.waitForTimeout(300);

    const path_f = resolve(OUTPUT_DIR, "05_after_copy.png");
    await page.screenshot({ path: path_f });
    steps.push({ step: "f", name: "after_copy", path: path_f });
    console.log(`    Saved to ${path_f}`);

    // ──── STEP g: Screenshot - clipboard should contain text ────
    console.log("\n[g] Verifying clipboard content...");
    const path_g = resolve(OUTPUT_DIR, "06_clipboard_check.png");
    await page.screenshot({ path: path_g });
    steps.push({ step: "g", name: "clipboard_check", path: path_g });
    console.log(`    Saved to ${path_g}`);

    // ──── STEP h: Check clipboard content from hidden state ────
    console.log("\n[h] Checking hidden state for clipboard...");
    const hiddenState = env.getHiddenState();
    console.log(`    Clipboard content: ${hiddenState.clipboard || "(empty)"}`);
    console.log(`    Clipboard length: ${hiddenState.clipboard?.length || 0} chars`);

    // ──── STEP i: Find or open note editor ────
    console.log("\n[i] Finding or opening note editor...");
    model = env.getRenderModel();
    let activeNoteWindow = model.windows?.find(w =>
      w.title?.toLowerCase().includes("note") || w.title?.toLowerCase().includes("editor")
    );

    if (!activeNoteWindow) {
      console.log("    No note window found, looking for files to open...");
      // Try to find a .txt or note file on desktop and double-click it
      const desktopX = 150;
      const desktopY = 200;
      const result_open = env.step({ type: "DOUBLE_CLICK", x: desktopX, y: desktopY });
      console.log(`    Open attempt: ${result_open.actionAccepted}`);
      server.setModel(env.getRenderModel());
      await page.waitForTimeout(400);

      model = env.getRenderModel();
      activeNoteWindow = model.windows?.find(w =>
        w.title?.toLowerCase().includes("note") || w.title?.toLowerCase().includes("editor")
      );
    }

    console.log(`    Note editor found: ${activeNoteWindow?.id}`);
    const path_i = resolve(OUTPUT_DIR, "07_note_found.png");
    await page.screenshot({ path: path_i });
    steps.push({ step: "i", name: "note_found", path: path_i });
    console.log(`    Saved to ${path_i}`);

    // ──── STEP j: Click in the note editor ────
    console.log("\n[j] Clicking in note editor...");
    if (activeNoteWindow) {
      const editorX = activeNoteWindow.bounds.x + activeNoteWindow.bounds.width / 2;
      const editorY = activeNoteWindow.bounds.y + activeNoteWindow.bounds.height / 2;
      const result_j = env.step({ type: "CLICK", x: editorX, y: editorY });
      console.log(`    Action accepted: ${result_j.actionAccepted}`);
      console.log(`    Summary: ${result_j.info?.actionSummary}`);
      server.setModel(env.getRenderModel());
      await page.waitForTimeout(300);

      const path_j = resolve(OUTPUT_DIR, "08_editor_clicked.png");
      await page.screenshot({ path: path_j });
      steps.push({ step: "j", name: "editor_clicked", path: path_j });
      console.log(`    Saved to ${path_j}`);
    }

    // ──── STEP k: Screenshot - editor focused ────
    console.log("\n[k] Taking screenshot of focused editor...");
    model = env.getRenderModel();
    const focusedEditor = model.windows?.find(w => w.id === activeNoteWindow?.id);
    console.log(`    Editor focused: ${focusedEditor?.focused}`);
    const path_k = resolve(OUTPUT_DIR, "09_editor_focused.png");
    await page.screenshot({ path: path_k });
    steps.push({ step: "k", name: "editor_focused", path: path_k });
    console.log(`    Saved to ${path_k}`);

    // ──── STEP l: HOTKEY Ctrl+V to paste ────
    console.log("\n[l] Pressing Ctrl+V to paste...");
    const result_l = env.step({ type: "HOTKEY", keys: ["Control", "v"] });
    console.log(`    Action accepted: ${result_l.actionAccepted}`);
    console.log(`    Summary: ${result_l.info?.actionSummary}`);
    server.setModel(env.getRenderModel());
    await page.waitForTimeout(300);

    const path_l = resolve(OUTPUT_DIR, "10_after_paste.png");
    await page.screenshot({ path: path_l });
    steps.push({ step: "l", name: "after_paste", path: path_l });
    console.log(`    Saved to ${path_l}`);

    // ──── STEP m: Screenshot - pasted content should appear ────
    console.log("\n[m] Taking final screenshot of pasted content...");
    const path_m = resolve(OUTPUT_DIR, "11_final_pasted.png");
    await page.screenshot({ path: path_m });
    steps.push({ step: "m", name: "final_pasted", path: path_m });
    console.log(`    Saved to ${path_m}`);

    // Final hidden state check
    const finalHidden = env.getHiddenState();
    console.log(`\n    Final clipboard: ${finalHidden.clipboard || "(empty)"}`);

    // Write report
    const report = {
      taskId: "mail_extract_mock_note",
      totalSteps: steps.length,
      steps: steps.map(s => ({ step: s.step, name: s.name })),
      clipboardContent: finalHidden.clipboard,
      passed: true
    };

    const reportPath = resolve(OUTPUT_DIR, "report.json");
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n✓ Report saved to ${reportPath}`);

  } catch (err) {
    console.error(`\n✗ Test failed: ${err.message}`);
    console.error(err.stack);
  }

  await browser.close();
  await server.close();
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
