import { readFileSync } from "fs";

const logFile = process.argv[2] || "logs/viewer-2026-03-10T11-11-51.jsonl";
const lines = readFileSync(logFile, "utf8").trim().split("\n").map(l => JSON.parse(l));

console.log("=== Action Summary Distribution ===");
const summaries = {};
lines.forEach(l => { const s = l.actionSummary || "reset"; summaries[s] = (summaries[s] || 0) + 1; });
Object.entries(summaries).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${k}: ${v}`));

console.log("\n=== Rejected Actions ===");
lines.filter(l => l.actionAccepted === false).forEach(l =>
  console.log(`  seq=${l.seq} step=${l.stepIndex} action=${JSON.stringify(l.action)}`));

console.log("\n=== Step Range ===");
const steps = lines.filter(l => l.stepIndex !== undefined).map(l => l.stepIndex);
console.log(`  min: ${Math.min(...steps)}, max: ${Math.max(...steps)}, total events: ${lines.length}`);

console.log("\n=== Truncation Check (task maxSteps=30) ===");
lines.filter(l => l.stepIndex >= 28 && l.stepIndex <= 33).forEach(l =>
  console.log(`  step=${l.stepIndex} truncated=${l.truncated} accepted=${l.actionAccepted} summary=${l.actionSummary}`));
const last = lines[lines.length - 1];
console.log(`  LAST: step=${last.stepIndex} truncated=${last.truncated} accepted=${last.actionAccepted}`);

console.log("\n=== Non-zero Rewards ===");
lines.filter(l => l.reward !== undefined && l.reward !== 0).forEach(l =>
  console.log(`  step=${l.stepIndex} reward=${l.reward} cumR=${l.cumulativeReward} summary=${l.actionSummary}`));

console.log("\n=== Timing Analysis ===");
const viewerActions = lines.filter(l => l.source === "viewer");
if (viewerActions.length > 1) {
  const gaps = [];
  for (let i = 1; i < viewerActions.length; i++) {
    const gap = viewerActions[i].elapsed_ms - viewerActions[i - 1].elapsed_ms;
    gaps.push({ seq: viewerActions[i].seq, gap, step: viewerActions[i].stepIndex });
  }
  const sorted = gaps.sort((a, b) => b.gap - a.gap).slice(0, 5);
  console.log("  Top 5 longest gaps between actions:");
  sorted.forEach(g => console.log(`    seq=${g.seq} step=${g.step} gap=${g.gap}ms`));
}

console.log("\n=== Drag/Resize Step Consumption ===");
let dragSteps = 0, resizeSteps = 0, clickSteps = 0, otherSteps = 0;
lines.forEach(l => {
  if (l.actionSummary === "window_dragged") dragSteps++;
  else if (l.actionSummary === "window_resized") resizeSteps++;
  else if (l.action && (l.action.type === "CLICK" || l.action.type === "DOUBLE_CLICK" || l.action.type === "RIGHT_CLICK")) clickSteps++;
  else otherSteps++;
});
console.log(`  Drag steps: ${dragSteps} (${(dragSteps/lines.length*100).toFixed(1)}%)`);
console.log(`  Resize steps: ${resizeSteps} (${(resizeSteps/lines.length*100).toFixed(1)}%)`);
console.log(`  Click steps: ${clickSteps} (${(clickSteps/lines.length*100).toFixed(1)}%)`);
console.log(`  Other steps: ${otherSteps} (${(otherSteps/lines.length*100).toFixed(1)}%)`);
