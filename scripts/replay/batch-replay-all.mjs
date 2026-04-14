/**
 * Batch Replay ALL Tasks with Screenshots.
 * Runs every registered task, takes screenshots at key checkpoints,
 * and writes a per-task JSON report + images.
 */
import { MockOsEnv } from "../../packages/core/dist/index.js";
import { mkdirSync, writeFileSync, readFileSync } from "fs";
import { resolve } from "path";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { WebSocketServer } from "ws";
import { chromium } from "playwright";

const BASE_PORT = 4320;
const OUTPUT_ROOT = resolve("logs/batch-replay");
mkdirSync(OUTPUT_ROOT, { recursive: true });

// ── Get all tasks ──
const tempEnv = new MockOsEnv({ width: 1280, height: 800 });
const allTasks = tempEnv.listTasks("all");
console.log(`Found ${allTasks.length} tasks:`);
allTasks.forEach(t => console.log(`  ${t.id} (maxSteps=${t.maxSteps}, domain=${t.domain})`));

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

// ── Run a single task ──
async function replayTask(task, page, server) {
  const taskDir = resolve(OUTPUT_ROOT, task.id);
  mkdirSync(taskDir, { recursive: true });

  const env = new MockOsEnv({ width: 1280, height: 800 });
  const issues = [];
  const screenshots = [];

  // Reset
  env.reset({ taskId: task.id, seed: 0, maxSteps: 0 });
  server.setModel(env.getRenderModel());
  await page.waitForTimeout(400);

  // Screenshot: initial state
  const initPath = resolve(taskDir, "00_initial.png");
  await page.screenshot({ path: initPath });
  screenshots.push({ name: "initial", step: 0, path: initPath });

  // Get initial state info
  const initHidden = env.getHiddenState();
  const initModel = env.getRenderModel();

  // Check initial state
  if (initModel.popups?.length > 0) {
    // Has popup - check if popup is visible
  }

  // Define action sequences to test each task's core mechanics
  const actionSequences = buildActionSequence(task, env);

  let stepCount = 0;
  for (const batch of actionSequences) {
    // Auto-dismiss any popups that appeared during previous batch
    {
      let model = env.getRenderModel();
      while (model.popups?.length > 0) {
        const popup = model.popups[0];
        const dismissX = popup.bounds.x + popup.bounds.width - 60;
        const dismissY = popup.bounds.y + popup.bounds.height - 30;
        env.step({ type: "CLICK", x: dismissX, y: dismissY });
        stepCount++;
        model = env.getRenderModel();
      }
    }

    for (const action of batch.actions) {
      try {
        const result = env.step(action);
        stepCount++;

        if (!result.actionAccepted) {
          issues.push({
            step: stepCount,
            type: "REJECTED",
            action: action.type,
            coords: action.x !== undefined ? `(${action.x},${action.y})` : undefined,
            summary: result.info?.actionSummary
          });
        }

        // Check for unexpected termination
        if (result.terminated && !batch.expectTermination) {
          issues.push({
            step: stepCount,
            type: "UNEXPECTED_TERMINATION",
            action: action.type
          });
        }

        // Check rewards
        if (result.reward !== 0) {
          issues.push({
            step: stepCount,
            type: "REWARD",
            reward: result.reward,
            cumulative: result.cumulativeReward,
            progress: result.info?.lastProgress,
            summary: result.info?.actionSummary
          });
        }
      } catch (err) {
        issues.push({
          step: stepCount,
          type: "CRASH",
          action: action.type,
          error: err.message
        });
      }
    }

    // Screenshot after batch
    server.setModel(env.getRenderModel());
    await page.waitForTimeout(300);
    const ssPath = resolve(taskDir, `${batch.name}.png`);
    await page.screenshot({ path: ssPath });
    screenshots.push({ name: batch.name, step: stepCount, path: ssPath });
  }

  // Final state
  const finalHidden = env.getHiddenState();
  const finalModel = env.getRenderModel();

  // Additional checks
  if (finalModel.windows) {
    for (const w of finalModel.windows) {
      // Check window bounds are within viewport
      if (w.bounds.x + w.bounds.width < 0 || w.bounds.y + w.bounds.height < 0) {
        issues.push({ type: "WINDOW_OFF_SCREEN", window: w.id, bounds: w.bounds });
      }
      if (w.bounds.width < 50 || w.bounds.height < 50) {
        issues.push({ type: "WINDOW_TOO_SMALL", window: w.id, bounds: w.bounds });
      }
    }
  }

  const report = {
    taskId: task.id,
    domain: task.domain,
    split: task.split,
    maxSteps: task.maxSteps,
    totalStepsExecuted: stepCount,
    finalReward: finalHidden.cumulativeReward,
    terminated: finalHidden.terminated,
    truncated: finalHidden.truncated,
    windowCount: finalModel.windows?.length || 0,
    popupCount: finalModel.popups?.length || 0,
    issueCount: issues.length,
    issues,
    screenshots: screenshots.map(s => ({ name: s.name, step: s.step }))
  };

  writeFileSync(resolve(taskDir, "report.json"), JSON.stringify(report, null, 2));
  return report;
}

// ── Build task-specific action sequences ──
function buildActionSequence(task, env) {
  const model = env.getRenderModel();
  const sequences = [];

  // 1. Handle popup if present
  if (model.popups?.length > 0) {
    const popup = model.popups[0];
    // Click dismiss button (typically bottom-right area of popup)
    const dismissX = popup.bounds.x + popup.bounds.width - 60;
    const dismissY = popup.bounds.y + popup.bounds.height - 30;
    sequences.push({
      name: "01_popup_dismiss",
      actions: [{ type: "CLICK", x: dismissX, y: dismissY }]
    });
  }

  // 2. Test window operations based on visible windows
  const visibleWindows = model.windows?.filter(w => !w.minimized) || [];
  const minimizedWindows = model.windows?.filter(w => w.minimized) || [];

  if (visibleWindows.length > 0) {
    const w = visibleWindows[0];

    // 2a. Drag test
    const dragStartX = w.bounds.x + w.bounds.width / 2;
    const dragStartY = w.bounds.y + 15; // title bar
    sequences.push({
      name: "02_window_drag",
      actions: [
        { type: "MOVE_TO", x: dragStartX, y: dragStartY },
        { type: "MOUSE_DOWN", button: "left" },
        { type: "DRAG_TO", x: dragStartX + 100, y: dragStartY + 50 },
        { type: "DRAG_TO", x: dragStartX + 150, y: dragStartY + 80 },
        { type: "MOUSE_UP", button: "left" }
      ]
    });

    // 2b. Resize test (bottom-right corner)
    const resizeX = w.bounds.x + w.bounds.width + 150 - 4;
    const resizeY = w.bounds.y + w.bounds.height + 80 - 4;
    sequences.push({
      name: "03_window_resize",
      actions: [
        { type: "MOVE_TO", x: resizeX, y: resizeY },
        { type: "MOUSE_DOWN", button: "left" },
        { type: "DRAG_TO", x: resizeX + 80, y: resizeY + 60 },
        { type: "DRAG_TO", x: resizeX + 120, y: resizeY + 100 },
        { type: "MOUSE_UP", button: "left" }
      ]
    });

    // 2c. Click inside window content
    const contentX = w.bounds.x + w.bounds.width / 2;
    const contentY = w.bounds.y + w.bounds.height / 2 + 80;
    sequences.push({
      name: "04_content_click",
      actions: [
        { type: "CLICK", x: contentX, y: contentY },
        { type: "CLICK", x: contentX - 30, y: contentY + 30 },
        { type: "CLICK", x: contentX + 30, y: contentY - 30 }
      ]
    });
  }

  // 3. Taskbar interaction - restore minimized windows
  if (minimizedWindows.length > 0) {
    const taskbarActions = [];
    const dockX = 35;
    // Click each dock icon to restore
    for (let i = 0; i < Math.min(minimizedWindows.length, 3); i++) {
      taskbarActions.push({ type: "CLICK", x: dockX, y: 110 + i * 66 });
    }
    sequences.push({
      name: "05_taskbar_restore",
      actions: taskbarActions
    });
  }

  // 4. Right-click for context menu (split into two checkpoints to capture visible menu)
  if (visibleWindows.length > 0) {
    const w = visibleWindows[0];
    sequences.push({
      name: "06_context_menu_open",
      actions: [
        { type: "RIGHT_CLICK", x: w.bounds.x + 200, y: w.bounds.y + 250 }
      ]
    });
    sequences.push({
      name: "06_context_menu_dismiss",
      actions: [
        { type: "PRESS", key: "Escape" }
      ]
    });
  }

  // 5. Desktop icon double-click test
  sequences.push({
    name: "07_desktop_icon",
    actions: [
      { type: "DOUBLE_CLICK", x: 100, y: 60 },   // Home icon position
    ]
  });

  // 6. Keyboard shortcuts
  sequences.push({
    name: "08_keyboard",
    actions: [
      { type: "TYPING", text: "test" },
      { type: "HOTKEY", keys: ["Control", "z"] },
      { type: "PRESS", key: "Escape" }
    ]
  });

  // 7. Scroll test
  if (visibleWindows.length > 0) {
    const w = visibleWindows[0];
    sequences.push({
      name: "09_scroll",
      actions: [
        { type: "SCROLL", x: w.bounds.x + 200, y: w.bounds.y + 300, dx: 0, dy: 3 },
        { type: "SCROLL", x: w.bounds.x + 200, y: w.bounds.y + 300, dx: 0, dy: -3 }
      ]
    });
  }

  return sequences;
}

// ── Main ──
async function main() {
  console.log("\n=== Starting Batch Replay ===\n");

  const server = await startServer(BASE_PORT);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(`http://127.0.0.1:${BASE_PORT}/session/s1`);
  await page.waitForTimeout(1500);

  const results = [];

  for (const task of allTasks) {
    console.log(`\n━━━ Task: ${task.id} (${task.domain}/${task.split}) ━━━`);
    try {
      const report = await replayTask(task, page, server);
      results.push(report);

      const issueTypes = {};
      report.issues.forEach(i => { issueTypes[i.type] = (issueTypes[i.type] || 0) + 1; });
      const issueStr = Object.entries(issueTypes).map(([k, v]) => `${k}:${v}`).join(", ");

      console.log(`  Steps: ${report.totalStepsExecuted}, Reward: ${report.finalReward}, Issues: ${report.issueCount} [${issueStr}]`);
      console.log(`  Screenshots: ${report.screenshots.length}`);

      if (report.issues.filter(i => i.type === "CRASH").length > 0) {
        console.log(`  ⛔ CRASHES DETECTED:`);
        report.issues.filter(i => i.type === "CRASH").forEach(i => console.log(`    ${i.error}`));
      }
    } catch (err) {
      console.log(`  ⛔ TASK FAILED: ${err.message}`);
      results.push({ taskId: task.id, error: err.message, issueCount: 1, issues: [{ type: "TASK_CRASH", error: err.message }] });
    }
  }

  // Summary
  console.log("\n" + "═".repeat(70));
  console.log("BATCH REPLAY SUMMARY");
  console.log("═".repeat(70));
  console.log(`Tasks tested: ${results.length}`);
  console.log(`Tasks with crashes: ${results.filter(r => r.issues?.some(i => i.type === "CRASH" || i.type === "TASK_CRASH")).length}`);
  console.log(`Total issues: ${results.reduce((s, r) => s + (r.issueCount || 0), 0)}`);

  // Per-task summary table
  console.log("\n| Task | Steps | Reward | Issues | Crashes |");
  console.log("|------|-------|--------|--------|---------|");
  for (const r of results) {
    const crashes = r.issues?.filter(i => i.type === "CRASH" || i.type === "TASK_CRASH").length || 0;
    console.log(`| ${r.taskId} | ${r.totalStepsExecuted || "ERR"} | ${r.finalReward ?? "ERR"} | ${r.issueCount} | ${crashes} |`);
  }

  // Write master report
  writeFileSync(resolve(OUTPUT_ROOT, "master-report.json"), JSON.stringify(results, null, 2));
  console.log(`\nMaster report: ${OUTPUT_ROOT}/master-report.json`);
  console.log(`Screenshots: ${OUTPUT_ROOT}/<task-id>/`);

  await browser.close();
  await server.close();
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
