/**
 * Log Replay with Headless Browser Screenshots.
 *
 * 1. Starts the replay server
 * 2. Opens the viewer in headless Chromium (Playwright)
 * 3. Replays actions from the log in checkpoints
 * 4. Takes a screenshot at each checkpoint
 * 5. Logs issues (mismatches between original log and replay)
 */
import { MockOsEnv } from "../../packages/core/dist/index.js";
import { readFileSync, mkdirSync, writeFileSync } from "fs";
import { resolve } from "path";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { WebSocketServer } from "ws";
import { chromium } from "playwright";

const LOG_FILE = process.argv[2] || "logs/viewer-2026-03-10T11-11-51.jsonl";
const OUTPUT_DIR = resolve("logs/replay-screenshots");
mkdirSync(OUTPUT_DIR, { recursive: true });

// ── Parse log ──
const entries = readFileSync(LOG_FILE, "utf8").trim().split("\n").map(l => JSON.parse(l));
const resetEntry = entries.find(e => e.event === "reset");
const actionEntries = entries.filter(e => e.event === "step" && e.action);

const TASK_ID = resetEntry?.taskId || "dismiss_popup_then_append_note";
const SEED = resetEntry?.seed || 0;

// ── Define meaningful checkpoints ──
const checkpoints = [
  { name: "01_initial", upToStep: 0, description: "Initial state after reset" },
  { name: "02_popup_dismissed", upToStep: 1, description: "After popup dismiss" },
  { name: "03_first_drag_done", upToStep: 20, description: "After first window drag + mouse up" },
  { name: "04_first_resize_done", upToStep: 40, description: "After first window resize + mouse up" },
  { name: "05_clicking_phase", upToStep: 57, description: "After clicking around various UI elements" },
  { name: "06_taskbar_click", upToStep: 58, description: "After taskbar click (window state change)" },
  { name: "07_second_drag_done", upToStep: 75, description: "After second window drag" },
  { name: "08_second_resize_done", upToStep: 99, description: "After second large resize" },
  { name: "09_browser_nav", upToStep: 107, description: "After browser navigation + rejected clicks" },
  { name: "10_third_drag_done", upToStep: 121, description: "After third drag operation" },
  { name: "11_more_taskbar", upToStep: 124, description: "After more taskbar clicks" },
  { name: "12_fourth_drag_done", upToStep: 139, description: "After fourth drag" },
  { name: "13_third_resize_done", upToStep: 160, description: "After third resize" },
  { name: "14_mail_selection", upToStep: 163, description: "After mail selection (final)" }
];

// ── Setup env ──
const env = new MockOsEnv({ width: 1280, height: 800 });
env.reset({ taskId: TASK_ID, seed: SEED, maxSteps: 0 });

// ── Setup server ──
const PORT = 4316; // Different port to avoid conflict
const fastify = Fastify({ logger: false });

fastify.get("/api/sessions/s1/render-model", async () => env.getRenderModel());

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

const wss = new WebSocketServer({ noServer: true });
const subscribers = new Set();
fastify.server.on("upgrade", (request, socket, head) => {
  if (!request.url?.startsWith("/ws")) { socket.destroy(); return; }
  wss.handleUpgrade(request, socket, head, (ws) => {
    subscribers.add(ws);
    ws.send(JSON.stringify(env.getRenderModel()));
    ws.on("close", () => subscribers.delete(ws));
  });
});

function broadcast() {
  const payload = JSON.stringify(env.getRenderModel());
  for (const ws of subscribers) {
    if (ws.readyState === 1) ws.send(payload);
  }
}

await fastify.listen({ host: "127.0.0.1", port: PORT });
console.log(`Replay server ready at http://127.0.0.1:${PORT}/session/s1`);

// ── Launch headless browser ──
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(`http://127.0.0.1:${PORT}/session/s1`);
await page.waitForTimeout(1500); // Let viewer render

// ── Replay actions checkpoint by checkpoint ──
let currentStep = 0;
const allIssues = [];

console.log(`\nTask: ${TASK_ID}, Seed: ${SEED}`);
console.log(`Total actions to replay: ${actionEntries.length}`);
console.log(`Checkpoints: ${checkpoints.length}`);
console.log("═".repeat(70));

for (const checkpoint of checkpoints) {
  const actionsForPhase = actionEntries.filter(
    a => a.stepIndex > currentStep && a.stepIndex <= checkpoint.upToStep
  );

  // Execute actions
  const phaseIssues = [];
  for (const entry of actionsForPhase) {
    const result = env.step(entry.action);

    // Compare with original log
    if (result.actionAccepted !== entry.actionAccepted) {
      phaseIssues.push({
        step: entry.stepIndex,
        type: "ACCEPTED_MISMATCH",
        expected: entry.actionAccepted,
        got: result.actionAccepted,
        action: entry.action.type,
        expectedSummary: entry.actionSummary,
        gotSummary: result.info?.actionSummary
      });
    }
    if (result.info?.actionSummary !== entry.actionSummary) {
      phaseIssues.push({
        step: entry.stepIndex,
        type: "SUMMARY_MISMATCH",
        expected: entry.actionSummary,
        got: result.info?.actionSummary,
        action: entry.action.type
      });
    }
    if (Math.abs(result.reward - entry.reward) > 0.001) {
      phaseIssues.push({
        step: entry.stepIndex,
        type: "REWARD_MISMATCH",
        expected: entry.reward,
        got: result.reward
      });
    }
  }

  currentStep = checkpoint.upToStep;

  // Broadcast updated state to viewer
  broadcast();
  await page.waitForTimeout(500); // Let viewer re-render

  // Take screenshot
  const screenshotPath = resolve(OUTPUT_DIR, `${checkpoint.name}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: false });

  // Get state summary
  const hidden = env.getHiddenState();
  const model = env.getRenderModel();

  const windowSummary = model.windows?.map(w =>
    `${w.id}(${w.appId}) ${w.focused ? "FOCUSED" : ""} ${w.minimized ? "MIN" : ""} [${w.bounds.x},${w.bounds.y} ${w.bounds.width}x${w.bounds.height}]`
  ).join(" | ");

  // Log checkpoint info
  console.log(`\n📸 ${checkpoint.name}: ${checkpoint.description}`);
  console.log(`   Step: ${hidden.stepIndex}, Reward: ${hidden.cumulativeReward}, Windows: ${model.windows?.length}, Popups: ${model.popups?.length}`);
  console.log(`   ${windowSummary}`);
  console.log(`   Screenshot: ${screenshotPath}`);

  if (phaseIssues.length > 0) {
    console.log(`   ⚠️  ISSUES: ${phaseIssues.length}`);
    for (const issue of phaseIssues) {
      console.log(`      ${JSON.stringify(issue)}`);
    }
    allIssues.push(...phaseIssues);
  } else {
    console.log(`   ✅ No mismatches (${actionsForPhase.length} actions replayed)`);
  }
}

// ── Summary report ──
console.log("\n" + "═".repeat(70));
console.log("REPLAY COMPLETE");
console.log("═".repeat(70));

const hidden = env.getHiddenState();
console.log(`Final step: ${hidden.stepIndex}`);
console.log(`Final cumulative reward: ${hidden.cumulativeReward}`);
console.log(`Terminated: ${hidden.terminated}, Truncated: ${hidden.truncated}`);
console.log(`Total issues: ${allIssues.length}`);

if (allIssues.length > 0) {
  console.log("\n=== ALL ISSUES ===");
  for (const issue of allIssues) {
    console.log(`  ${JSON.stringify(issue)}`);
  }
}

// Save report
const report = {
  logFile: LOG_FILE,
  taskId: TASK_ID,
  seed: SEED,
  totalActions: actionEntries.length,
  checkpoints: checkpoints.length,
  finalStep: hidden.stepIndex,
  finalReward: hidden.cumulativeReward,
  terminated: hidden.terminated,
  truncated: hidden.truncated,
  totalIssues: allIssues.length,
  issues: allIssues,
  screenshotDir: OUTPUT_DIR
};
writeFileSync(resolve(OUTPUT_DIR, "replay-report.json"), JSON.stringify(report, null, 2));
console.log(`\nReport saved: ${OUTPUT_DIR}/replay-report.json`);
console.log(`Screenshots saved: ${OUTPUT_DIR}/`);

await browser.close();
await fastify.close();
process.exit(0);
