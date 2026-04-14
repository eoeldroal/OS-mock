/**
 * Debug: Check the render model and popup structure
 */

import { MockOsEnv } from "./packages/core/dist/index.js";

async function main() {
  console.log("=== Debugging PopupEdit Task ===\n");

  // Initialize MockOsEnv
  const env = new MockOsEnv({ width: 1280, height: 1024 });

  // Reset to task
  env.reset({
    taskId: "dismiss_popup_then_append_note",
    seed: 0,
    maxSteps: 0
  });

  console.log("Initial state:");
  const initialRender = env.getRenderModel();
  console.log(JSON.stringify(initialRender, null, 2));

  console.log("\n=== Popups ===");
  if (initialRender.popups && initialRender.popups.length > 0) {
    initialRender.popups.forEach((popup, i) => {
      console.log(`\nPopup ${i}:`);
      console.log(`  title: ${popup.title}`);
      console.log(`  dismissButtonBounds: ${JSON.stringify(popup.dismissButtonBounds)}`);
      console.log(`  messageBounds: ${JSON.stringify(popup.messageBounds)}`);
    });
  }

  console.log("\n=== Windows ===");
  if (initialRender.windows && initialRender.windows.length > 0) {
    initialRender.windows.forEach((w, i) => {
      console.log(`\nWindow ${i}: ${w.title}`);
      console.log(`  contentBounds: ${JSON.stringify(w.contentBounds)}`);
    });
  }

  console.log("\n=== AppView ===");
  if (initialRender.appView) {
    console.log(JSON.stringify(initialRender.appView, null, 2));
  }

  // Try to click the dismiss button
  if (initialRender.popups && initialRender.popups.length > 0) {
    const popup = initialRender.popups[0];
    if (popup.dismissButtonBounds) {
      const bounds = popup.dismissButtonBounds;
      console.log(`\n=== Clicking dismiss at (${bounds.x + bounds.width/2}, ${bounds.y + bounds.height/2}) ===`);

      const result = env.step({
        type: "click",
        x: bounds.x + bounds.width / 2,
        y: bounds.y + bounds.height / 2
      });

      console.log("\nStep result:");
      console.log(`  actionAccepted: ${result.actionAccepted}`);
      console.log(`  reward: ${result.reward}`);
      console.log(`  terminated: ${result.terminated}`);
      console.log(`  info: ${JSON.stringify(result.info)}`);

      console.log("\n=== After dismiss ===");
      const afterRender = env.getRenderModel();
      console.log(`Popups count: ${afterRender.popups?.length || 0}`);
      if (afterRender.popups && afterRender.popups.length > 0) {
        afterRender.popups.forEach((p, i) => {
          console.log(`  Popup ${i}: ${p.title}`);
        });
      }
    }
  }
}

main().catch(console.error);
