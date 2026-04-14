/**
 * Log Replay Script
 * Reads the viewer log, groups actions into phases,
 * and replays them via the host HTTP API.
 * After each phase, pauses so the caller can take a screenshot.
 */
import { readFileSync } from "fs";

const HOST = "http://127.0.0.1:4315";
const LOG_FILE = process.argv[2] || "logs/viewer-2026-03-10T11-11-51.jsonl";

// ── Parse log ──
const entries = readFileSync(LOG_FILE, "utf8")
  .trim()
  .split("\n")
  .map(l => JSON.parse(l));

const resetEntry = entries.find(e => e.event === "reset");
const actionEntries = entries.filter(e => e.event === "step" && e.action);

// ── Group into phases ──
function groupPhases(actions) {
  const phases = [];
  let current = null;

  for (const a of actions) {
    const label = classifyAction(a);
    if (!current || current.label !== label) {
      if (current) phases.push(current);
      current = { label, actions: [a], startStep: a.stepIndex, endStep: a.stepIndex };
    } else {
      current.actions.push(a);
      current.endStep = a.stepIndex;
    }
  }
  if (current) phases.push(current);
  return phases;
}

function classifyAction(entry) {
  const s = entry.actionSummary;
  if (s === "popup_dismissed") return "popup_dismiss";
  if (s === "window_dragged") return "window_drag";
  if (s === "window_resized") return "window_resize";
  if (s === "browser_navigation") return "browser_nav";
  if (s === "mail_selection") return "mail_select";
  if (s === "window_state_changed") return "taskbar_click";
  if (s === "rejected") return "rejected_click";
  if (entry.action?.type === "MOUSE_DOWN" || entry.action?.type === "MOUSE_UP") return "mouse_control";
  if (entry.action?.type === "MOVE_TO") return "pointer_move";
  if (entry.action?.type === "CLICK") return "click";
  return "other";
}

// Merge consecutive phases of same label (with small gaps of mouse_control/pointer_move)
function mergePhases(phases) {
  const merged = [];
  for (const p of phases) {
    const last = merged[merged.length - 1];
    if (last && (
      (last.label === "window_drag" && (p.label === "mouse_control" || p.label === "pointer_move")) ||
      (last.label === "window_resize" && (p.label === "mouse_control" || p.label === "pointer_move"))
    )) {
      last.actions.push(...p.actions);
      last.endStep = p.endStep;
    } else if (last && last.label === p.label) {
      last.actions.push(...p.actions);
      last.endStep = p.endStep;
    } else {
      merged.push({ ...p });
    }
  }
  return merged;
}

const rawPhases = groupPhases(actionEntries);
const phases = mergePhases(rawPhases);

// ── API helpers ──
async function createSession() {
  const res = await fetch(`${HOST}/api/sessions`, { method: "POST" });
  // Use trainer MCP route - not available via HTTP directly
  // Instead, we'll create via the interactive flow
  return null;
}

async function postAction(sessionId, action) {
  const res = await fetch(`${HOST}/api/sessions/${sessionId}/viewer-action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action })
  });
  return res.json();
}

async function getRenderModel(sessionId) {
  const res = await fetch(`${HOST}/api/sessions/${sessionId}/render-model`);
  return res.json();
}

// ── Main ──
const mode = process.argv[3] || "info"; // "info" = just print phase plan, "replay" = execute

if (mode === "info") {
  console.log(`Task: ${resetEntry?.taskId}, Seed: ${resetEntry?.seed || 0}`);
  console.log(`Total actions: ${actionEntries.length}`);
  console.log(`\n=== Phase Plan (${phases.length} phases) ===`);
  phases.forEach((p, i) => {
    console.log(`Phase ${i + 1}: [${p.label}] steps ${p.startStep}-${p.endStep} (${p.actions.length} actions)`);
  });

  // Also output as JSON for machine consumption
  const plan = phases.map((p, i) => ({
    phase: i + 1,
    label: p.label,
    startStep: p.startStep,
    endStep: p.endStep,
    actionCount: p.actions.length,
    firstAction: p.actions[0].action,
    lastAction: p.actions[p.actions.length - 1].action,
    hasRejected: p.actions.some(a => a.actionAccepted === false),
    rewards: p.actions.filter(a => a.reward !== 0).map(a => ({ step: a.stepIndex, reward: a.reward }))
  }));
  console.log("\n=== Phase Plan JSON ===");
  console.log(JSON.stringify(plan, null, 2));

} else if (mode === "replay") {
  const sessionId = process.argv[4] || "s1";

  console.log(`Replaying ${actionEntries.length} actions to session ${sessionId}...`);
  console.log(`Phases: ${phases.length}`);

  for (let pi = 0; pi < phases.length; pi++) {
    const phase = phases[pi];
    console.log(`\n--- Phase ${pi + 1}/${phases.length}: [${phase.label}] steps ${phase.startStep}-${phase.endStep} (${phase.actions.length} actions) ---`);

    const issues = [];
    for (const entry of phase.actions) {
      const result = await postAction(sessionId, entry.action);

      // Compare with original log
      if (result.error) {
        issues.push({ step: entry.stepIndex, type: "API_ERROR", detail: result.error });
        continue;
      }

      // Check actionAccepted matches
      if (result.actionAccepted !== entry.actionAccepted) {
        issues.push({
          step: entry.stepIndex,
          type: "ACCEPTED_MISMATCH",
          expected: entry.actionAccepted,
          got: result.actionAccepted,
          action: entry.action,
          summary: result.info?.actionSummary
        });
      }

      // Check actionSummary matches
      if (result.info?.actionSummary !== entry.actionSummary) {
        issues.push({
          step: entry.stepIndex,
          type: "SUMMARY_MISMATCH",
          expected: entry.actionSummary,
          got: result.info?.actionSummary,
          action: entry.action
        });
      }

      // Check reward matches
      if (result.reward !== entry.reward) {
        issues.push({
          step: entry.stepIndex,
          type: "REWARD_MISMATCH",
          expected: entry.reward,
          got: result.reward
        });
      }

      // Check truncation
      if (result.truncated !== entry.truncated) {
        issues.push({
          step: entry.stepIndex,
          type: "TRUNCATION_MISMATCH",
          expected: entry.truncated,
          got: result.truncated
        });
      }
    }

    if (issues.length > 0) {
      console.log(`  ISSUES FOUND: ${issues.length}`);
      issues.forEach(i => console.log(`    ${JSON.stringify(i)}`));
    } else {
      console.log(`  OK - all ${phase.actions.length} actions matched`);
    }

    // Print "SCREENSHOT_POINT" marker for sub-agent to know when to capture
    console.log(`SCREENSHOT_POINT phase=${pi + 1} label=${phase.label} endStep=${phase.endStep}`);
  }

  // Final state check
  const model = await getRenderModel(sessionId);
  console.log("\n=== Final Render Model Summary ===");
  console.log(`Windows: ${model.windows?.length}`);
  console.log(`Popups: ${model.popups?.length}`);
  console.log(`Desktop Icons: ${model.desktopIcons?.length}`);
  console.log(`Context Menu: ${model.contextMenu ? "open" : "none"}`);
  model.windows?.forEach(w => {
    console.log(`  Window [${w.id}] app=${w.appId} focused=${w.focused} minimized=${w.minimized} bounds=${JSON.stringify(w.bounds)}`);
  });
}
