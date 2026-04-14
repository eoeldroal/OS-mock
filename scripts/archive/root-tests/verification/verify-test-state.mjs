/**
 * Verify the test state at each step
 */

import { MockOsEnv } from "./packages/core/dist/index.js";

const env = new MockOsEnv({ width: 1280, height: 1024 });
env.reset({
  taskId: "dismiss_popup_then_append_note",
  seed: 0,
  maxSteps: 0
});

console.log("=== Step 1: Initial State ===");
let hidden = env.getHiddenState();
console.log("Popups dismissed:", hidden.popupDismissed ?? "undefined");
console.log("Clipboard text:", hidden.clipboard.text);

console.log("\n=== Step 2: After Dismiss ===");
env.step({
  type: "CLICK",
  x: 808,
  y: 600
});
hidden = env.getHiddenState();
console.log("Popups dismissed:", hidden.popupDismissed ?? "undefined");

console.log("\n=== Step 3: After Type ===");
env.step({
  type: "TYPING",
  text: "Hello World"
});
hidden = env.getHiddenState();
console.log("Clipboard text:", hidden.clipboard.text);
console.log("Keyboard pressedKeys:", hidden.keyboard.pressedKeys);

console.log("\n=== Step 4: After Save ===");
env.step({
  type: "HOTKEY",
  keys: ["ctrl", "s"]
});
hidden = env.getHiddenState();
console.log("Files in workspace:");
if (hidden.fileSystem.files) {
  Object.entries(hidden.fileSystem.files).forEach(([path, content]) => {
    console.log(`  ${path}: "${content}"`);
  });
}

console.log("\n=== Step 5: After Undo ===");
env.step({
  type: "HOTKEY",
  keys: ["ctrl", "z"]
});
hidden = env.getHiddenState();
console.log("Clipboard text after undo:", hidden.clipboard.text);
console.log("Files in workspace after undo:");
if (hidden.fileSystem.files) {
  Object.entries(hidden.fileSystem.files).forEach(([path, content]) => {
    console.log(`  ${path}: "${content}"`);
  });
}
