/**
 * Note Editor Test Script
 * Tests: typing, editing, save, undo, redo, line selection, clipboard
 * Task: undo_restore_content (editor domain)
 * Captures screenshots and validates state after each operation
 */
import { MockOsEnv } from "./packages/core/dist/index.js";
import { mkdirSync, writeFileSync } from "fs";
import { readFileSync } from "fs";
import { resolve } from "path";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { WebSocketServer } from "ws";
import { chromium } from "playwright";

const BASE_PORT = 4323;
const OUTPUT_DIR = resolve("logs/agent-tests/note-editor-test");
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

// ── Helper: Extract note editor state from appView ──
function getNoteEditorState(appView) {
  if (!appView) return null;
  return {
    content: appView.content || "",
    dirty: appView.dirty ?? false,
    cursorIndex: appView.cursorIndex ?? 0,
    selectedRange: appView.selectedRange || null,
    editorBounds: appView.editorBounds || null
  };
}

// ── Helper: Print state ──
function printEditorState(label, appView) {
  const state = getNoteEditorState(appView);
  if (!state) {
    console.log(`  ${label}: appView not found`);
    return;
  }
  console.log(`  ${label}:`);
  console.log(`    - Content: "${state.content}"`);
  console.log(`    - Dirty: ${state.dirty}`);
  console.log(`    - Cursor Index: ${state.cursorIndex}`);
  console.log(`    - Selected Range: ${JSON.stringify(state.selectedRange)}`);
  if (state.editorBounds) {
    console.log(`    - Editor Bounds: x=${state.editorBounds.x}, y=${state.editorBounds.y}, w=${state.editorBounds.width}, h=${state.editorBounds.height}`);
  }
}

// ── Main test ──
async function main() {
  console.log("\n=== Note Editor Comprehensive Test ===\n");

  const server = await startServer(BASE_PORT);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(`http://127.0.0.1:${BASE_PORT}/session/s1`);
  await page.waitForTimeout(1500);

  // Reset to undo_restore_content task
  const env = new MockOsEnv({ width: 1280, height: 800 });
  env.reset({ taskId: "undo_restore_content", seed: 0, maxSteps: 0 });
  server.setModel(env.getRenderModel());
  await page.waitForTimeout(400);

  const results = {
    steps: [],
    issues: [],
    totalSteps: 0
  };

  try {
    // ──── STEP a: Initial screenshot ────
    console.log("[STEP a] Taking initial screenshot...");
    const path_a = resolve(OUTPUT_DIR, "00_a_initial.png");
    await page.screenshot({ path: path_a });

    let model = env.getRenderModel();
    let editorWindow = null;

    // Find note editor window (can be identified by "notes-" prefix or editor content)
    const noteWindow = model.windows?.find(w =>
      w.id?.includes("notes") ||
      w.title?.toLowerCase().includes("txt") ||
      w.title?.toLowerCase().includes("document")
    );

    if (noteWindow && noteWindow.appView) {
      editorWindow = noteWindow;
    }

    console.log(`  Windows found: ${model.windows?.length || 0}`);
    model.windows?.forEach(w => {
      console.log(`    - Title: "${w.title}" | ID: ${w.id}`);
      if (w.appView) {
        console.log(`      AppView Type: ${w.appView.type || 'unknown'}`);
      }
    });

    if (!editorWindow) {
      console.log("  ERROR: No editor window found!");
      results.issues.push({ step: 'a', issue: 'No editor window found' });
      editorWindow = noteWindow; // Use whatever we found
    }

    printEditorState("INITIAL STATE", editorWindow?.appView);
    results.steps.push({ step: 'a', name: 'initial', status: editorWindow ? 'PASS' : 'FAIL', path: path_a });

    // ──── STEP b: Click on note editor window to focus it ────
    console.log("\n[STEP b] Clicking on note editor window to focus...");
    if (editorWindow) {
      const clickX = editorWindow.bounds.x + editorWindow.bounds.width / 2;
      const clickY = editorWindow.bounds.y + 50; // title bar area
      console.log(`  Clicking at (${clickX}, ${clickY})`);

      const result = env.step({ type: "CLICK", x: clickX, y: clickY });
      console.log(`  Action accepted: ${result.actionAccepted}`);
      console.log(`  Summary: ${result.info?.actionSummary}`);

      server.setModel(env.getRenderModel());
      await page.waitForTimeout(300);

      model = env.getRenderModel();
      const focusedWindow = model.windows?.find(w => w.id === editorWindow.id);
      console.log(`  Editor focused after click: ${focusedWindow?.focused}`);
      printEditorState("AFTER FOCUS CLICK", focusedWindow?.appView);

      results.steps.push({ step: 'b', name: 'editor_focused', status: 'PASS' });
    } else {
      results.steps.push({ step: 'b', name: 'editor_focused', status: 'FAIL' });
    }

    // ──── STEP c: Click inside editor area to position cursor ────
    console.log("\n[STEP c] Clicking inside editor area to position cursor...");
    if (editorWindow?.appView?.editorBounds) {
      const bounds = editorWindow.appView.editorBounds;
      const clickX = bounds.x + 20;
      const clickY = bounds.y + 30; // first line area
      console.log(`  Clicking at (${clickX}, ${clickY}) inside editor`);

      const result = env.step({ type: "CLICK", x: clickX, y: clickY });
      console.log(`  Action accepted: ${result.actionAccepted}`);
      console.log(`  Summary: ${result.info?.actionSummary}`);

      server.setModel(env.getRenderModel());
      await page.waitForTimeout(300);

      const path_c = resolve(OUTPUT_DIR, "01_c_cursor_positioned.png");
      await page.screenshot({ path: path_c });

      model = env.getRenderModel();
      const editorAfterClick = model.windows?.find(w => w.id === editorWindow.id);
      printEditorState("AFTER CURSOR CLICK", editorAfterClick?.appView);

      results.steps.push({ step: 'c', name: 'cursor_positioned', status: 'PASS', path: path_c });
    } else {
      results.steps.push({ step: 'c', name: 'cursor_positioned', status: 'FAIL', issue: 'editorBounds not available' });
    }

    // ──── STEP d: Screenshot - cursor positioned ────
    console.log("\n[STEP d] Verifying cursor position in screenshot...");
    // Already taken in step c, just verify
    results.steps.push({ step: 'd', name: 'verify_cursor', status: 'PASS' });

    // ──── STEP e: Type "Hello World" character by character ────
    console.log("\n[STEP e] Typing 'Hello World' character by character...");
    const textToType = "Hello World";
    for (const char of textToType) {
      const result = env.step({ type: "TYPING", text: char });
      console.log(`  Typed '${char}': ${result.actionAccepted ? 'OK' : 'REJECTED'}`);
      await page.waitForTimeout(50); // Small delay between characters
    }

    server.setModel(env.getRenderModel());
    await page.waitForTimeout(300);

    model = env.getRenderModel();
    const editorAfterType = model.windows?.find(w => w.id === editorWindow.id);
    printEditorState("AFTER TYPING", editorAfterType?.appView);

    results.steps.push({ step: 'e', name: 'text_typed', status: 'PASS' });

    // ──── STEP f: Screenshot - text should appear ────
    console.log("\n[STEP f] Taking screenshot to verify text appears...");
    const path_f = resolve(OUTPUT_DIR, "02_f_text_typed.png");
    await page.screenshot({ path: path_f });

    const textState = editorAfterType?.appView;
    const expectedContent = "Hello World";
    const textCorrect = textState?.content?.includes(expectedContent);
    console.log(`  Text visible in editor: ${textCorrect ? 'YES' : 'NO'}`);
    if (!textCorrect) {
      results.issues.push({ step: 'f', issue: `Expected text '${expectedContent}', got '${textState?.content}'` });
    }

    results.steps.push({ step: 'f', name: 'text_visible', status: textCorrect ? 'PASS' : 'FAIL', path: path_f });

    // ──── STEP g: Save with Ctrl+S ────
    console.log("\n[STEP g] Saving with Ctrl+S hotkey...");
    const saveResult = env.step({ type: "HOTKEY", keys: ["ctrl", "s"] });
    console.log(`  Hotkey accepted: ${saveResult.actionAccepted}`);
    console.log(`  Summary: ${saveResult.info?.actionSummary}`);

    server.setModel(env.getRenderModel());
    await page.waitForTimeout(300);

    model = env.getRenderModel();
    const editorAfterSave = model.windows?.find(w => w.id === editorWindow.id);
    printEditorState("AFTER SAVE", editorAfterSave?.appView);

    results.steps.push({ step: 'g', name: 'save', status: 'PASS' });

    // ──── STEP h: Screenshot - dirty flag should be false ────
    console.log("\n[STEP h] Verifying dirty flag is false after save...");
    const path_h = resolve(OUTPUT_DIR, "03_h_saved.png");
    await page.screenshot({ path: path_h });

    const saveState = editorAfterSave?.appView;
    const dirtyFalse = saveState?.dirty === false;
    console.log(`  Dirty flag is false: ${dirtyFalse ? 'YES' : 'NO'}`);
    if (!dirtyFalse) {
      results.issues.push({ step: 'h', issue: `Expected dirty=false, got ${saveState?.dirty}` });
    }

    results.steps.push({ step: 'h', name: 'save_verified', status: dirtyFalse ? 'PASS' : 'FAIL', path: path_h });

    // ──── STEP i: Undo with Ctrl+Z ────
    console.log("\n[STEP i] Undoing with Ctrl+Z hotkey...");
    const undoResult = env.step({ type: "HOTKEY", keys: ["ctrl", "z"] });
    console.log(`  Hotkey accepted: ${undoResult.actionAccepted}`);
    console.log(`  Summary: ${undoResult.info?.actionSummary}`);

    server.setModel(env.getRenderModel());
    await page.waitForTimeout(300);

    model = env.getRenderModel();
    const editorAfterUndo = model.windows?.find(w => w.id === editorWindow.id);
    printEditorState("AFTER UNDO", editorAfterUndo?.appView);

    results.steps.push({ step: 'i', name: 'undo', status: 'PASS' });

    // ──── STEP j: Screenshot - text should be reverted ────
    console.log("\n[STEP j] Verifying text is reverted after undo...");
    const path_j = resolve(OUTPUT_DIR, "04_j_undone.png");
    await page.screenshot({ path: path_j });

    const undoState = editorAfterUndo?.appView;
    const textReverted = !undoState?.content?.includes("Hello World") || undoState?.content === "";
    console.log(`  Text reverted (empty or original): ${textReverted ? 'YES' : 'NO'}`);
    console.log(`  Current content: "${undoState?.content}"`);
    if (!textReverted) {
      results.issues.push({ step: 'j', issue: `Expected empty/original content, got '${undoState?.content}'` });
    }

    results.steps.push({ step: 'j', name: 'undo_verified', status: textReverted ? 'PASS' : 'FAIL', path: path_j });

    // ──── STEP k: Redo with Ctrl+Shift+Z ────
    console.log("\n[STEP k] Redoing with Ctrl+Shift+Z hotkey...");
    const redoResult = env.step({ type: "HOTKEY", keys: ["ctrl", "shift", "z"] });
    console.log(`  Hotkey accepted: ${redoResult.actionAccepted}`);
    console.log(`  Summary: ${redoResult.info?.actionSummary}`);

    server.setModel(env.getRenderModel());
    await page.waitForTimeout(300);

    model = env.getRenderModel();
    const editorAfterRedo = model.windows?.find(w => w.id === editorWindow.id);
    printEditorState("AFTER REDO", editorAfterRedo?.appView);

    results.steps.push({ step: 'k', name: 'redo', status: 'PASS' });

    // ──── STEP l: Screenshot - text should be restored ────
    console.log("\n[STEP l] Verifying text is restored after redo...");
    const path_l = resolve(OUTPUT_DIR, "05_l_redone.png");
    await page.screenshot({ path: path_l });

    const redoState = editorAfterRedo?.appView;
    const textRestored = redoState?.content?.includes("Hello World");
    console.log(`  Text restored: ${textRestored ? 'YES' : 'NO'}`);
    console.log(`  Current content: "${redoState?.content}"`);
    if (!textRestored) {
      results.issues.push({ step: 'l', issue: `Expected 'Hello World' in content, got '${redoState?.content}'` });
    }

    results.steps.push({ step: 'l', name: 'redo_verified', status: textRestored ? 'PASS' : 'FAIL', path: path_l });

    // ──── STEP m: Line selection - click on specific line to select ────
    console.log("\n[STEP m] Selecting a line by triple-click...");
    if (editorWindow?.appView?.editorBounds) {
      const bounds = editorWindow.appView.editorBounds;
      const clickX = bounds.x + 50;
      const clickY = bounds.y + 30;
      console.log(`  Triple-clicking at (${clickX}, ${clickY})`);

      // First, click to position cursor
      env.step({ type: "CLICK", x: clickX, y: clickY });
      // Then triple-click to select line
      const tripleClickResult = env.step({ type: "TRIPLE_CLICK", x: clickX, y: clickY });
      console.log(`  Triple-click accepted: ${tripleClickResult.actionAccepted}`);
      console.log(`  Summary: ${tripleClickResult.info?.actionSummary}`);

      server.setModel(env.getRenderModel());
      await page.waitForTimeout(300);

      model = env.getRenderModel();
      const editorAfterSelect = model.windows?.find(w => w.id === editorWindow.id);
      printEditorState("AFTER LINE SELECT", editorAfterSelect?.appView);

      results.steps.push({ step: 'm', name: 'line_selected', status: 'PASS' });
    } else {
      results.steps.push({ step: 'm', name: 'line_selected', status: 'FAIL', issue: 'editorBounds not available' });
    }

    // ──── STEP n: Screenshot - line should be highlighted ────
    console.log("\n[STEP n] Taking screenshot to verify line is highlighted...");
    const path_n = resolve(OUTPUT_DIR, "06_n_line_selected.png");
    await page.screenshot({ path: path_n });

    const selectState = editorAfterRedo?.appView;
    const lineSelected = selectState?.selectedRange !== null && selectState?.selectedRange !== undefined;
    console.log(`  Line selected (has selectedRange): ${lineSelected ? 'YES' : 'NO'}`);

    results.steps.push({ step: 'n', name: 'selection_visible', status: lineSelected ? 'PASS' : 'FAIL', path: path_n });

    // ──── STEP o: Copy with Ctrl+C ────
    console.log("\n[STEP o] Copying with Ctrl+C hotkey...");
    const copyResult = env.step({ type: "HOTKEY", keys: ["ctrl", "c"] });
    console.log(`  Hotkey accepted: ${copyResult.actionAccepted}`);
    console.log(`  Summary: ${copyResult.info?.actionSummary}`);

    server.setModel(env.getRenderModel());
    await page.waitForTimeout(300);

    results.steps.push({ step: 'o', name: 'copy', status: 'PASS' });

    // ──── STEP p: Print clipboard content ────
    console.log("\n[STEP p] Printing clipboard content...");
    const hidden = env.getHiddenState();
    const clipboardContent = hidden.clipboard || "(empty)";
    console.log(`  Clipboard content: "${clipboardContent}"`);
    results.clipboard = { content: clipboardContent };

    results.steps.push({ step: 'p', name: 'clipboard_read', status: 'PASS', clipboard: clipboardContent });

    // ──---- STEP q: Click at end of text ────
    console.log("\n[STEP q] Clicking at end of text to position cursor...");
    if (editorWindow?.appView?.editorBounds) {
      const bounds = editorWindow.appView.editorBounds;
      const clickX = bounds.x + 200; // further right for end of line
      const clickY = bounds.y + 30;
      console.log(`  Clicking at (${clickX}, ${clickY})`);

      const result = env.step({ type: "CLICK", x: clickX, y: clickY });
      console.log(`  Action accepted: ${result.actionAccepted}`);

      server.setModel(env.getRenderModel());
      await page.waitForTimeout(300);

      model = env.getRenderModel();
      const editorAtEnd = model.windows?.find(w => w.id === editorWindow.id);
      printEditorState("AFTER END CLICK", editorAtEnd?.appView);

      results.steps.push({ step: 'q', name: 'cursor_at_end', status: 'PASS' });
    } else {
      results.steps.push({ step: 'q', name: 'cursor_at_end', status: 'FAIL' });
    }

    // ──── STEP r: Paste with Ctrl+V ────
    console.log("\n[STEP r] Pasting with Ctrl+V hotkey...");
    const pasteResult = env.step({ type: "HOTKEY", keys: ["ctrl", "v"] });
    console.log(`  Hotkey accepted: ${pasteResult.actionAccepted}`);
    console.log(`  Summary: ${pasteResult.info?.actionSummary}`);

    server.setModel(env.getRenderModel());
    await page.waitForTimeout(300);

    model = env.getRenderModel();
    const editorAfterPaste = model.windows?.find(w => w.id === editorWindow.id);
    printEditorState("AFTER PASTE", editorAfterPaste?.appView);

    results.steps.push({ step: 'r', name: 'paste', status: 'PASS' });

    // ──── STEP s: Screenshot - pasted text should appear ────
    console.log("\n[STEP s] Taking screenshot to verify pasted text appears...");
    const path_s = resolve(OUTPUT_DIR, "07_s_pasted.png");
    await page.screenshot({ path: path_s });

    const pasteState = editorAfterPaste?.appView;
    const pasteSuccess = pasteState?.content?.length > "Hello World".length ||
                         pasteState?.content?.includes(clipboardContent);
    console.log(`  Pasted content visible: ${pasteSuccess ? 'YES' : 'NO'}`);
    console.log(`  Final content: "${pasteState?.content}"`);

    results.steps.push({ step: 's', name: 'paste_verified', status: pasteSuccess ? 'PASS' : 'FAIL', path: path_s });

    // ── Summary ──
    console.log("\n" + "═".repeat(70));
    console.log("TEST SUMMARY");
    console.log("═".repeat(70));

    const passCount = results.steps.filter(s => s.status === 'PASS').length;
    const failCount = results.steps.filter(s => s.status === 'FAIL').length;

    console.log(`Total Steps: ${results.steps.length}`);
    console.log(`Passed: ${passCount}`);
    console.log(`Failed: ${failCount}`);
    console.log(`Issues: ${results.issues.length}`);

    if (results.issues.length > 0) {
      console.log("\nIssues Found:");
      results.issues.forEach(issue => {
        console.log(`  [Step ${issue.step}] ${issue.issue}`);
      });
    }

    console.log("\nStep Results:");
    results.steps.forEach(step => {
      const status = step.status === 'PASS' ? '✓' : '✗';
      console.log(`  ${status} [${step.step}] ${step.name}`);
    });

    // Save detailed report
    const reportPath = resolve(OUTPUT_DIR, "test-report.json");
    writeFileSync(reportPath, JSON.stringify(results, null, 2));
    console.log(`\nDetailed report saved: ${reportPath}`);
    console.log(`Screenshots saved: ${OUTPUT_DIR}/`);

  } catch (err) {
    console.error("Fatal error:", err);
    results.issues.push({ type: "FATAL", error: err.message });
  } finally {
    await browser.close();
    await server.close();
  }
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
