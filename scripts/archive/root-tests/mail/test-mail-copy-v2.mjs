/**
 * Mail Copy Workflow Test - Version 2
 * Tests: Read mail -> Select text -> Copy -> Paste into note
 * Improved with better window detection and state tracking
 */
import { MockOsEnv } from "./packages/core/dist/index.js";
import { mkdirSync, writeFileSync } from "fs";
import { readFileSync } from "fs";
import { resolve } from "path";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { WebSocketServer } from "ws";
import { chromium } from "playwright";

const BASE_PORT = 4322;
const OUTPUT_DIR = resolve("logs/agent-tests/mail-copy-v2");
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

// ── Main test ──
async function main() {
  console.log("\n=== Mail Copy Workflow Test V2 ===\n");

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

  const results = {
    steps: [],
    issues: [],
    clipboard: {}
  };

  try {
    // ──── STEP a: Initial screenshot ────
    console.log("[STEP a] Taking initial screenshot...");
    const path_a = resolve(OUTPUT_DIR, "00_initial.png");
    await page.screenshot({ path: path_a });

    let model = env.getRenderModel();
    const hidden = env.getHiddenState();

    console.log(`  Windows: ${model.windows?.length || 0}`);
    model.windows?.forEach(w => {
      console.log(`    - Title: "${w.title}" | ID: ${w.id} | Focused: ${w.focused}`);
      console.log(`      Bounds: (${w.bounds.x}, ${w.bounds.y}) ${w.bounds.width}x${w.bounds.height}`);
    });
    console.log(`  Hidden State:`);
    console.log(`    - Clipboard: "${hidden.clipboard || "(empty)"}"`);
    console.log(`    - Focused Window ID: ${hidden.focusedWindowId}`);

    results.steps.push({ step: 'a', name: 'initial', status: 'PASS', path: path_a });

    // Find actual window by ID (not by title)
    const mailWindow = model.windows?.find(w => w.id?.includes("mail"));
    const noteWindow = model.windows?.find(w => w.id?.includes("note") || w.id?.includes("editor"));
    const fileWindow = model.windows?.find(w => w.id?.includes("explorer"));

    console.log(`\n  Detected Windows:`);
    console.log(`    Mail Window: ${mailWindow?.id} ("${mailWindow?.title}")`);
    console.log(`    Note Window: ${noteWindow?.id} ("${noteWindow?.title}")`);
    console.log(`    File Window: ${fileWindow?.id} ("${fileWindow?.title}")`);

    // ──── STEP b: Click on mail window to focus it ────
    console.log("\n[STEP b] Clicking on mail window to focus...");
    if (mailWindow) {
      const clickX = mailWindow.bounds.x + mailWindow.bounds.width / 2;
      const clickY = mailWindow.bounds.y + 50; // click on content area
      console.log(`  Clicking at (${clickX}, ${clickY})`);

      const result = env.step({ type: "CLICK", x: clickX, y: clickY });
      console.log(`  Action accepted: ${result.actionAccepted}`);
      console.log(`  Summary: ${result.info?.actionSummary}`);

      server.setModel(env.getRenderModel());
      await page.waitForTimeout(300);

      const path_b = resolve(OUTPUT_DIR, "01_mail_clicked.png");
      await page.screenshot({ path: path_b });

      model = env.getRenderModel();
      const mailAfterClick = model.windows?.find(w => w.id === mailWindow.id);
      console.log(`  Mail focused after click: ${mailAfterClick?.focused}`);

      results.steps.push({ step: 'b', name: 'mail_clicked', status: 'PASS', focused: mailAfterClick?.focused });
    } else {
      results.issues.push({ step: 'b', issue: 'Mail window not found' });
      results.steps.push({ step: 'b', name: 'mail_clicked', status: 'FAIL' });
    }

    // ──── STEP c: Click on a mail message to select it ────
    console.log("\n[STEP c] Clicking on mail message to select...");
    if (mailWindow) {
      const selectX = mailWindow.bounds.x + 30;
      const selectY = mailWindow.bounds.y + 120;
      console.log(`  Clicking at (${selectX}, ${selectY})`);

      const result = env.step({ type: "CLICK", x: selectX, y: selectY });
      console.log(`  Action accepted: ${result.actionAccepted}`);
      console.log(`  Summary: ${result.info?.actionSummary}`);

      server.setModel(env.getRenderModel());
      await page.waitForTimeout(300);

      const path_c = resolve(OUTPUT_DIR, "02_line_selected.png");
      await page.screenshot({ path: path_c });

      results.steps.push({ step: 'c', name: 'line_selected', status: 'PASS' });
    }

    // ──---- STEP d: Select all text in the message ----
    console.log("\n[STEP d] Selecting all text (Ctrl+A)...");
    let result_d = env.step({ type: "HOTKEY", keys: ["Control", "a"] });
    console.log(`  Action accepted: ${result_d.actionAccepted}`);
    console.log(`  Summary: ${result_d.info?.actionSummary}`);

    server.setModel(env.getRenderModel());
    await page.waitForTimeout(300);

    const path_d = resolve(OUTPUT_DIR, "03_text_selected.png");
    await page.screenshot({ path: path_d });
    results.steps.push({ step: 'd', name: 'text_selected', status: 'PASS' });

    // ──── STEP e: Copy to clipboard (Ctrl+C) ────
    console.log("\n[STEP e] Copying to clipboard (Ctrl+C)...");
    let result_e = env.step({ type: "HOTKEY", keys: ["Control", "c"] });
    console.log(`  Action accepted: ${result_e.actionAccepted}`);
    console.log(`  Summary: ${result_e.info?.actionSummary}`);

    server.setModel(env.getRenderModel());
    await page.waitForTimeout(300);

    const path_e = resolve(OUTPUT_DIR, "04_after_copy.png");
    await page.screenshot({ path: path_e });

    const hidden_e = env.getHiddenState();
    console.log(`  Clipboard after copy: "${hidden_e.clipboard || "(empty)"}"`);
    console.log(`  Clipboard length: ${hidden_e.clipboard?.length || 0} chars`);

    results.clipboard.afterCopy = hidden_e.clipboard;
    results.steps.push({ step: 'e', name: 'after_copy', status: result_e.actionAccepted ? 'PASS' : 'FAIL', clipboardLength: hidden_e.clipboard?.length || 0 });

    // ──---- STEP f: Find or open note editor ----
    console.log("\n[STEP f] Finding or opening note editor...");
    model = env.getRenderModel();
    let activeNoteWindow = model.windows?.find(w => w.id?.includes("note") || w.id?.includes("editor"));

    if (!activeNoteWindow) {
      console.log("  No note window found. Trying to open from file explorer...");

      // Double-click on a file in the file window if visible
      if (fileWindow) {
        const fileX = fileWindow.bounds.x + 80;
        const fileY = fileWindow.bounds.y + 100;
        console.log(`  Double-clicking file at (${fileX}, ${fileY})`);

        const result_open = env.step({ type: "DOUBLE_CLICK", x: fileX, y: fileY });
        console.log(`  Open attempt: ${result_open.actionAccepted}`);
        console.log(`  Summary: ${result_open.info?.actionSummary}`);

        server.setModel(env.getRenderModel());
        await page.waitForTimeout(500);

        model = env.getRenderModel();
        activeNoteWindow = model.windows?.find(w => w.id?.includes("note") || w.id?.includes("editor"));
      }
    }

    console.log(`  Note editor found: ${activeNoteWindow?.id} ("${activeNoteWindow?.title}")`);
    const path_f = resolve(OUTPUT_DIR, "05_note_found.png");
    await page.screenshot({ path: path_f });

    if (activeNoteWindow) {
      results.steps.push({ step: 'f', name: 'note_found', status: 'PASS' });
    } else {
      results.issues.push({ step: 'f', issue: 'Note window not found after open attempt' });
      results.steps.push({ step: 'f', name: 'note_found', status: 'FAIL' });
    }

    // ──---- STEP g: Click in note editor ----
    console.log("\n[STEP g] Clicking in note editor...");
    if (activeNoteWindow) {
      const editorX = activeNoteWindow.bounds.x + activeNoteWindow.bounds.width / 2;
      const editorY = activeNoteWindow.bounds.y + activeNoteWindow.bounds.height / 2;
      console.log(`  Clicking at (${editorX}, ${editorY})`);

      const result_g = env.step({ type: "CLICK", x: editorX, y: editorY });
      console.log(`  Action accepted: ${result_g.actionAccepted}`);
      console.log(`  Summary: ${result_g.info?.actionSummary}`);

      server.setModel(env.getRenderModel());
      await page.waitForTimeout(300);

      const path_g = resolve(OUTPUT_DIR, "06_editor_clicked.png");
      await page.screenshot({ path: path_g });

      model = env.getRenderModel();
      const editorAfter = model.windows?.find(w => w.id === activeNoteWindow.id);
      console.log(`  Editor focused: ${editorAfter?.focused}`);

      results.steps.push({ step: 'g', name: 'editor_clicked', status: 'PASS', focused: editorAfter?.focused });
    }

    // ──---- STEP h: Paste from clipboard (Ctrl+V) ----
    console.log("\n[STEP h] Pasting from clipboard (Ctrl+V)...");
    let result_h = env.step({ type: "HOTKEY", keys: ["Control", "v"] });
    console.log(`  Action accepted: ${result_h.actionAccepted}`);
    console.log(`  Summary: ${result_h.info?.actionSummary}`);

    server.setModel(env.getRenderModel());
    await page.waitForTimeout(300);

    const path_h = resolve(OUTPUT_DIR, "07_after_paste.png");
    await page.screenshot({ path: path_h });

    const hidden_h = env.getHiddenState();
    console.log(`  Clipboard after paste: "${hidden_h.clipboard || "(empty)"}"`);

    results.clipboard.afterPaste = hidden_h.clipboard;
    results.steps.push({ step: 'h', name: 'after_paste', status: result_h.actionAccepted ? 'PASS' : 'FAIL' });

    // ──---- STEP i: Final screenshot ----
    console.log("\n[STEP i] Taking final screenshot...");
    const path_i = resolve(OUTPUT_DIR, "08_final.png");
    await page.screenshot({ path: path_i });
    results.steps.push({ step: 'i', name: 'final', status: 'PASS' });

    // ──---- Summary ----
    console.log("\n" + "=".repeat(70));
    console.log("TEST SUMMARY");
    console.log("=".repeat(70));

    const passCount = results.steps.filter(s => s.status === 'PASS').length;
    const failCount = results.steps.filter(s => s.status === 'FAIL').length;

    console.log(`Total steps: ${results.steps.length}`);
    console.log(`Passed: ${passCount}`);
    console.log(`Failed: ${failCount}`);
    console.log(`Issues: ${results.issues.length}`);

    console.log("\nStep Results:");
    results.steps.forEach(s => {
      const status = s.status === 'PASS' ? '✓' : '✗';
      console.log(`  ${status} ${s.step}: ${s.name} - ${s.status}`);
    });

    if (results.issues.length > 0) {
      console.log("\nIssues:");
      results.issues.forEach(i => {
        console.log(`  - Step ${i.step}: ${i.issue}`);
      });
    }

    console.log("\nClipboard Tracking:");
    console.log(`  After Copy: "${results.clipboard.afterCopy || "(empty)"}" (${(results.clipboard.afterCopy?.length || 0)} chars)`);
    console.log(`  After Paste: "${results.clipboard.afterPaste || "(empty)"}" (${(results.clipboard.afterPaste?.length || 0)} chars)`);

    // Write report
    const report = {
      taskId: "mail_extract_mock_note",
      timestamp: new Date().toISOString(),
      totalSteps: results.steps.length,
      passed: passCount,
      failed: failCount,
      issues: results.issues,
      steps: results.steps,
      clipboard: results.clipboard
    };

    const reportPath = resolve(OUTPUT_DIR, "report.json");
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n✓ Report saved to ${reportPath}`);

  } catch (err) {
    console.error(`\n✗ Test failed: ${err.message}`);
    console.error(err.stack);
    results.issues.push({ global: err.message });
  }

  await browser.close();
  await server.close();
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
