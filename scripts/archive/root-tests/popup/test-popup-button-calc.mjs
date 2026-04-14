/**
 * Calculate button position from popup bounds
 */

import { MockOsEnv } from "./packages/core/dist/index.js";

const env = new MockOsEnv({ width: 1280, height: 1024 });
env.reset({
  taskId: "dismiss_popup_then_append_note",
  seed: 0,
  maxSteps: 0
});

const render = env.getRenderModel();
const popup = render.popups[0];

console.log("Popup bounds:", popup.bounds);
console.log("Popup width:", popup.bounds.width);
console.log("Popup height:", popup.bounds.height);

// From PopupLayer.tsx:
// button at right: 24, bottom: 22
// padding: "10px 18px" - so button width is ~40px, height ~20px

// Button right edge is at: popup.x + popup.width - 24
// Button left edge is at: popup.x + popup.width - 24 - 40
// Button center X is at: popup.x + popup.width - 24 - 20

// Button bottom edge is at: popup.y + popup.height - 22
// Button top edge is at: popup.y + popup.height - 22 - 20
// Button center Y is at: popup.y + popup.height - 22 - 10

const buttonCenterX = popup.bounds.x + popup.bounds.width - 24 - 20;
const buttonCenterY = popup.bounds.y + popup.bounds.height - 22 - 10;

console.log("\nCalculated button center:");
console.log(`X: ${popup.bounds.x} + ${popup.bounds.width} - 24 - 20 = ${buttonCenterX}`);
console.log(`Y: ${popup.bounds.y} + ${popup.bounds.height} - 22 - 10 = ${buttonCenterY}`);

console.log("\nLet's try clicking:");
const result = env.step({
  type: "click",
  x: buttonCenterX,
  y: buttonCenterY
});

console.log("Result:", {
  actionAccepted: result.actionAccepted,
  reward: result.reward,
  info: result.info?.actionSummary
});

const afterRender = env.getRenderModel();
console.log("\nAfter click, popups count:", afterRender.popups?.length || 0);
