#!/usr/bin/env node

import { MockOsEnv } from "../../../packages/core/dist/index.js";

const env = new MockOsEnv({ width: 1280, height: 800 });
env.reset({ taskId: "rename_then_edit_content", seed: 0, maxSteps: 0 });
const model = env.getRenderModel();

console.log("=== Initial State ===");
console.log("Visible windows:");
(model.windows || []).filter(w => !w.minimized).forEach((w, i) => {
  console.log(`  [${i}] ${w.id}`);
});
console.log("Minimized windows:");
(model.windows || []).filter(w => w.minimized).forEach((w, i) => {
  console.log(`  [${i}] ${w.id}`);
});

// Try clicking to restore a window
console.log("\nAttempting to restore minimized windows...");
const allWins = model.windows || [];
const taskbarX = 35;
const minimizedWins = allWins.filter(w => w.minimized);

if (minimizedWins.length > 0) {
  console.log(`Found ${minimizedWins.length} minimized windows`);

  // Try to restore first minimized window by clicking taskbar
  env.step({ type: "CLICK", x: taskbarX, y: 110 });

  const model2 = env.getRenderModel();
  console.log("\nAfter first taskbar click:");
  console.log("Visible windows:");
  (model2.windows || []).filter(w => !w.minimized).forEach((w, i) => {
    console.log(`  [${i}] ${w.id}`);
  });

  // Try another
  env.step({ type: "CLICK", x: taskbarX, y: 176 });
  const model3 = env.getRenderModel();
  console.log("\nAfter second taskbar click:");
  console.log("Visible windows:");
  (model3.windows || []).filter(w => !w.minimized).forEach((w, i) => {
    console.log(`  [${i}] ${w.id}`);
  });
}
