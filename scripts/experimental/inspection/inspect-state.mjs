/**
 * Inspect the hidden and render state structure
 */

import { MockOsEnv } from "../../../packages/core/dist/index.js";

const env = new MockOsEnv({ width: 1280, height: 1024 });
env.reset({
  taskId: "dismiss_popup_then_append_note",
  seed: 0,
  maxSteps: 0
});

console.log("=== Hidden State Keys ===");
const hidden = env.getHiddenState();
console.log(Object.keys(hidden));

console.log("\n=== Render Model Keys ===");
const render = env.getRenderModel();
console.log(Object.keys(render));

console.log("\n=== After Dismiss ===");
const result = env.step({
  type: "CLICK",
  x: 808,
  y: 600
});
console.log("Step result:", {
  actionAccepted: result.actionAccepted,
  reward: result.reward,
  info: result.info
});

const hidden2 = env.getHiddenState();
console.log("Hidden state keys after dismiss:", Object.keys(hidden2));

console.log("\n=== After Type ===");
env.step({
  type: "TYPING",
  text: "Hello World"
});

const hidden3 = env.getHiddenState();
console.log("Hidden state keys after type:", Object.keys(hidden3));
console.log("Trying to find text in state...");
console.log(JSON.stringify(hidden3, null, 2).substring(0, 500));
