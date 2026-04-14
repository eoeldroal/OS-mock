import { MockOsEnv } from "/sessions/sharp-clever-thompson/mnt/CoWork/packages/core/dist/index.js";

const results = [];

// Utility: Validate env state for corruption
function validateState(hs) {
  const issues = [];
  const state = hs.envState;

  // Check window IDs are unique
  const windowIds = state.windows.map(w => w.id);
  if (new Set(windowIds).size !== windowIds.length) {
    issues.push("Duplicate window IDs found");
  }

  // Check for orphaned appStates
  const appStateIds = new Set();
  Object.values(state.appStates).forEach(appType => {
    Object.keys(appType).forEach(id => {
      appStateIds.add(id);
    });
  });

  const windowAppStateIds = new Set(state.windows.map(w => w.id));
  appStateIds.forEach(id => {
    if (!windowAppStateIds.has(id)) {
      issues.push(`Orphaned appState: ${id}`);
    }
  });

  // Check dragState is clean after drag operations
  if (state.dragState && Object.keys(state.dragState).length > 0) {
    // dragState should be null or empty after operations complete
    // Only flag if it seems stuck
  }

  // Check all window bounds are valid
  state.windows.forEach(w => {
    if (w.bounds.width <= 0 || w.bounds.height <= 0) {
      issues.push(`Window ${w.id} has invalid size: ${w.bounds.width}x${w.bounds.height}`);
    }
  });

  // Check pointer within viewport
  if (state.pointer.x < -100 || state.pointer.y < -100 || state.pointer.x > 1380 || state.pointer.y > 900) {
    issues.push(`Pointer out of bounds: (${state.pointer.x}, ${state.pointer.y})`);
  }

  return { valid: issues.length === 0, issues };
}

function logResult(testNum, testName, passed, error, details) {
  const result = { testNum, testName, passed, error, details };
  results.push(result);
  const status = passed ? "PASS" : "FAIL";
  console.log(`[${testNum}] ${status}: ${testName}`);
  if (error) console.log(`  Error: ${error}`);
  if (details) {
    Object.entries(details).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        console.log(`  ${key}: ${JSON.stringify(value)}`);
      }
    });
  }
}

console.log("===============================================");
console.log("EXTREME DRAG & WINDOW MANAGEMENT EDGE CASES");
console.log("===============================================\n");

// ============================================================
// Test 1: Rapid drag sequences (50+ drags in quick succession)
// ============================================================
console.log("Test 1: Rapid drag sequences (50+ drags)");
{
  try {
    const env = new MockOsEnv();
    env.reset({ taskId: "delete_scratch_file", seed: 1 });
    let hs = env.getHiddenState();

    const explorerWindow = hs.envState.windows.find(w => w.appId === "file-explorer");
    if (!explorerWindow) throw new Error("No explorer window");

    const titlebarY = explorerWindow.bounds.y + 15;
    const titlebarX = explorerWindow.bounds.x + explorerWindow.bounds.width / 2;

    // Start drag
    env.step({ type: "MOUSE_DOWN", button: "left" });
    env.step({ type: "MOVE_TO", x: titlebarX, y: titlebarY });

    // Rapid drags
    for (let i = 0; i < 50; i++) {
      const newX = explorerWindow.bounds.x + 100 + (i % 20) * 5;
      const newY = explorerWindow.bounds.y + 100 + (i % 15) * 3;
      env.step({ type: "DRAG_TO", x: newX, y: newY });
    }

    env.step({ type: "MOUSE_UP", button: "left" });

    hs = env.getHiddenState();
    const validate = validateState(hs);
    const dragStateClean = !hs.envState.dragState || Object.keys(hs.envState.dragState).length === 0;

    const passed = validate.valid && dragStateClean;
    logResult(1, "Rapid drag sequences (50+)", passed, validate.issues.length > 0 ? validate.issues[0] : undefined, {
      windowCount: hs.envState.windows.length,
      dragStateClean,
      validState: validate.valid,
      orphanedAppStates: validate.issues.filter(i => i.includes("Orphaned")).length
    });
  } catch (e) {
    logResult(1, "Rapid drag sequences (50+)", false, e.message);
  }
}

// ============================================================
// Test 2: Drag to extreme coordinates
// ============================================================
console.log("\nTest 2: Drag to extreme coordinates");
{
  try {
    const env = new MockOsEnv();
    env.reset({ taskId: "delete_scratch_file", seed: 2 });
    let hs = env.getHiddenState();

    const explorerWindow = hs.envState.windows.find(w => w.appId === "file-explorer");
    if (!explorerWindow) throw new Error("No explorer window");

    const titlebarY = explorerWindow.bounds.y + 15;
    const titlebarX = explorerWindow.bounds.x + explorerWindow.bounds.width / 2;

    // Drag to negative coordinates
    env.step({ type: "MOUSE_DOWN", button: "left" });
    env.step({ type: "MOVE_TO", x: titlebarX, y: titlebarY });
    env.step({ type: "DRAG_TO", x: -100, y: -100 });
    env.step({ type: "MOUSE_UP", button: "left" });

    hs = env.getHiddenState();
    const dragStateClean1 = !hs.envState.dragState || Object.keys(hs.envState.dragState).length === 0;

    // Drag to max coordinates
    env.step({ type: "MOUSE_DOWN", button: "left" });
    env.step({ type: "MOVE_TO", x: titlebarX, y: titlebarY });
    env.step({ type: "DRAG_TO", x: 1280, y: 800 });
    env.step({ type: "MOUSE_UP", button: "left" });

    hs = env.getHiddenState();
    const dragStateClean2 = !hs.envState.dragState || Object.keys(hs.envState.dragState).length === 0;
    const validate = validateState(hs);

    // Drag to exact 0,0
    env.step({ type: "MOUSE_DOWN", button: "left" });
    env.step({ type: "MOVE_TO", x: titlebarX, y: titlebarY });
    env.step({ type: "DRAG_TO", x: 0, y: 0 });
    env.step({ type: "MOUSE_UP", button: "left" });

    hs = env.getHiddenState();
    const dragStateClean3 = !hs.envState.dragState || Object.keys(hs.envState.dragState).length === 0;
    const validate3 = validateState(hs);

    const passed = dragStateClean1 && dragStateClean2 && dragStateClean3 && validate.valid && validate3.valid;
    logResult(2, "Drag to extreme coordinates", passed,
      !validate.valid ? validate.issues[0] : !validate3.valid ? validate3.issues[0] : undefined, {
      dragStateClean1,
      dragStateClean2,
      dragStateClean3,
      windowCount: hs.envState.windows.length
    });
  } catch (e) {
    logResult(2, "Drag to extreme coordinates", false, e.message);
  }
}

// ============================================================
// Test 3: Drag window then immediately close it
// ============================================================
console.log("\nTest 3: Drag window then immediately close");
{
  try {
    const env = new MockOsEnv();
    env.reset({ taskId: "delete_scratch_file", seed: 3 });
    let hs = env.getHiddenState();

    const explorerWindow = hs.envState.windows.find(w => w.appId === "file-explorer");
    if (!explorerWindow) throw new Error("No explorer window");

    const titlebarY = explorerWindow.bounds.y + 15;
    const titlebarX = explorerWindow.bounds.x + explorerWindow.bounds.width / 2;
    const closeButtonX = explorerWindow.bounds.x + explorerWindow.bounds.width - 15;
    const closeButtonY = explorerWindow.bounds.y + 15;

    // Start drag on titlebar
    env.step({ type: "MOUSE_DOWN", button: "left" });
    env.step({ type: "MOVE_TO", x: titlebarX, y: titlebarY });
    env.step({ type: "DRAG_TO", x: titlebarX + 100, y: titlebarY + 50 });
    // NO MOUSE_UP - immediately close
    env.step({ type: "CLICK", x: closeButtonX, y: closeButtonY });

    hs = env.getHiddenState();
    const validate = validateState(hs);
    const windowStillExists = hs.envState.windows.some(w => w.id === explorerWindow.id);
    const dragStateClean = !hs.envState.dragState || Object.keys(hs.envState.dragState).length === 0;

    const passed = validate.valid && dragStateClean && !windowStillExists;
    logResult(3, "Drag window then immediately close", passed,
      validate.issues.length > 0 ? validate.issues[0] : undefined, {
      windowClosed: !windowStillExists,
      dragStateClean,
      validState: validate.valid,
      windowCount: hs.envState.windows.length
    });
  } catch (e) {
    logResult(3, "Drag window then immediately close", false, e.message);
  }
}

// ============================================================
// Test 4: Drag during popup appearance
// ============================================================
console.log("\nTest 4: Drag during popup appearance");
{
  try {
    const env = new MockOsEnv();
    env.reset({ taskId: "delete_scratch_file", seed: 4 });
    let hs = env.getHiddenState();

    const explorerWindow = hs.envState.windows.find(w => w.appId === "file-explorer");
    if (!explorerWindow) throw new Error("No explorer window");

    const titlebarY = explorerWindow.bounds.y + 15;
    const titlebarX = explorerWindow.bounds.x + explorerWindow.bounds.width / 2;

    // Start drag
    env.step({ type: "MOUSE_DOWN", button: "left" });
    env.step({ type: "MOVE_TO", x: titlebarX, y: titlebarY });
    env.step({ type: "DRAG_TO", x: titlebarX + 50, y: titlebarY + 50 });

    // Try to trigger a delete operation while dragging (will cause popup)
    const files = Object.values(hs.envState.appStates.fileExplorer)[0];
    if (files && hs.envState.fileSystem.files[Object.keys(hs.envState.fileSystem.files)[0]]) {
      // This might trigger a popup
      env.step({ type: "PRESS", key: "delete" });
    }

    // Continue dragging
    env.step({ type: "DRAG_TO", x: titlebarX + 100, y: titlebarY + 100 });
    env.step({ type: "MOUSE_UP", button: "left" });

    hs = env.getHiddenState();
    const validate = validateState(hs);
    const dragStateClean = !hs.envState.dragState || Object.keys(hs.envState.dragState).length === 0;

    const passed = validate.valid && dragStateClean;
    logResult(4, "Drag during popup appearance", passed,
      validate.issues.length > 0 ? validate.issues[0] : undefined, {
      dragStateClean,
      popupsCount: hs.envState.popups.length,
      validState: validate.valid
    });
  } catch (e) {
    logResult(4, "Drag during popup appearance", false, e.message);
  }
}

// ============================================================
// Test 5: Drag two windows sequentially without proper release
// ============================================================
console.log("\nTest 5: Drag two windows sequentially (improper release)");
{
  try {
    const env = new MockOsEnv();
    env.reset({ taskId: "delete_scratch_file", seed: 5 });
    let hs = env.getHiddenState();

    const windows = hs.envState.windows.filter(w => w.appId !== "gnome-shell");
    if (windows.length < 2) throw new Error("Need at least 2 windows");

    const win1 = windows[0];
    const win2 = windows[1];

    const titlebarY1 = win1.bounds.y + 15;
    const titlebarX1 = win1.bounds.x + win1.bounds.width / 2;
    const titlebarY2 = win2.bounds.y + 15;
    const titlebarX2 = win2.bounds.x + win2.bounds.width / 2;

    // Drag win1
    env.step({ type: "MOUSE_DOWN", button: "left" });
    env.step({ type: "MOVE_TO", x: titlebarX1, y: titlebarY1 });
    env.step({ type: "DRAG_TO", x: titlebarX1 + 50, y: titlebarY1 + 50 });
    env.step({ type: "MOUSE_UP", button: "left" });

    // Immediately drag win2 without proper cleanup
    env.step({ type: "MOUSE_DOWN", button: "left" });
    env.step({ type: "MOVE_TO", x: titlebarX2, y: titlebarY2 });
    env.step({ type: "DRAG_TO", x: titlebarX2 + 100, y: titlebarY2 + 100 });
    env.step({ type: "MOUSE_UP", button: "left" });

    hs = env.getHiddenState();
    const validate = validateState(hs);
    const dragStateClean = !hs.envState.dragState || Object.keys(hs.envState.dragState).length === 0;

    const passed = validate.valid && dragStateClean;
    logResult(5, "Drag two windows sequentially", passed,
      validate.issues.length > 0 ? validate.issues[0] : undefined, {
      dragStateClean,
      windowCount: hs.envState.windows.length,
      validState: validate.valid
    });
  } catch (e) {
    logResult(5, "Drag two windows sequentially", false, e.message);
  }
}

// ============================================================
// Test 6: Close window while dragState references it
// ============================================================
console.log("\nTest 6: Close window while dragState references it");
{
  try {
    const env = new MockOsEnv();
    env.reset({ taskId: "delete_scratch_file", seed: 6 });
    let hs = env.getHiddenState();

    const explorerWindow = hs.envState.windows.find(w => w.appId === "file-explorer");
    if (!explorerWindow) throw new Error("No explorer window");

    const titlebarY = explorerWindow.bounds.y + 15;
    const titlebarX = explorerWindow.bounds.x + explorerWindow.bounds.width / 2;
    const closeButtonX = explorerWindow.bounds.x + explorerWindow.bounds.width - 15;
    const closeButtonY = explorerWindow.bounds.y + 15;

    // Start drag
    env.step({ type: "MOUSE_DOWN", button: "left" });
    env.step({ type: "MOVE_TO", x: titlebarX, y: titlebarY });
    env.step({ type: "DRAG_TO", x: titlebarX + 50, y: titlebarY + 50 });
    // Still dragging - dragState should reference this window

    // Close the window while it's being dragged
    env.step({ type: "CLICK", x: closeButtonX, y: closeButtonY });

    // Release mouse
    env.step({ type: "MOUSE_UP", button: "left" });

    hs = env.getHiddenState();
    const validate = validateState(hs);
    const dragStateClean = !hs.envState.dragState || Object.keys(hs.envState.dragState).length === 0;
    const windowClosed = !hs.envState.windows.some(w => w.id === explorerWindow.id);

    const passed = validate.valid && dragStateClean && windowClosed;
    logResult(6, "Close window while dragState references it", passed,
      validate.issues.length > 0 ? validate.issues[0] : undefined, {
      windowClosed,
      dragStateClean,
      validState: validate.valid
    });
  } catch (e) {
    logResult(6, "Close window while dragState references it", false, e.message);
  }
}

// ============================================================
// Test 7: Minimize window during drag
// ============================================================
console.log("\nTest 7: Minimize window during drag");
{
  try {
    const env = new MockOsEnv();
    env.reset({ taskId: "delete_scratch_file", seed: 7 });
    let hs = env.getHiddenState();

    const explorerWindow = hs.envState.windows.find(w => w.appId === "file-explorer");
    if (!explorerWindow) throw new Error("No explorer window");

    const titlebarY = explorerWindow.bounds.y + 15;
    const titlebarX = explorerWindow.bounds.x + explorerWindow.bounds.width / 2;
    const minimizeButtonX = explorerWindow.bounds.x + explorerWindow.bounds.width - 45;
    const minimizeButtonY = explorerWindow.bounds.y + 15;

    // Start drag
    env.step({ type: "MOUSE_DOWN", button: "left" });
    env.step({ type: "MOVE_TO", x: titlebarX, y: titlebarY });
    env.step({ type: "DRAG_TO", x: titlebarX + 50, y: titlebarY + 50 });

    // Click minimize while dragging
    env.step({ type: "CLICK", x: minimizeButtonX, y: minimizeButtonY });

    // Release
    env.step({ type: "MOUSE_UP", button: "left" });

    hs = env.getHiddenState();
    const validate = validateState(hs);
    const dragStateClean = !hs.envState.dragState || Object.keys(hs.envState.dragState).length === 0;
    const windowMinimized = hs.envState.windows.find(w => w.id === explorerWindow.id)?.minimized;

    const passed = validate.valid && dragStateClean;
    logResult(7, "Minimize window during drag", passed,
      validate.issues.length > 0 ? validate.issues[0] : undefined, {
      windowMinimized,
      dragStateClean,
      validState: validate.valid
    });
  } catch (e) {
    logResult(7, "Minimize window during drag", false, e.message);
  }
}

// ============================================================
// Test 8: MOUSE_UP without prior MOUSE_DOWN
// ============================================================
console.log("\nTest 8: MOUSE_UP without prior MOUSE_DOWN");
{
  try {
    const env = new MockOsEnv();
    env.reset({ taskId: "delete_scratch_file", seed: 8 });

    // MOUSE_UP without MOUSE_DOWN
    env.step({ type: "MOUSE_UP", button: "left" });
    env.step({ type: "MOUSE_UP", button: "middle" });
    env.step({ type: "MOUSE_UP", button: "right" });

    let hs = env.getHiddenState();
    const validate = validateState(hs);
    const dragStateClean = !hs.envState.dragState || Object.keys(hs.envState.dragState).length === 0;

    const passed = validate.valid && dragStateClean;
    logResult(8, "MOUSE_UP without prior MOUSE_DOWN", passed,
      validate.issues.length > 0 ? validate.issues[0] : undefined, {
      dragStateClean,
      validState: validate.valid
    });
  } catch (e) {
    logResult(8, "MOUSE_UP without prior MOUSE_DOWN", false, e.message);
  }
}

// ============================================================
// Test 9: Multiple MOUSE_DOWN without MOUSE_UP between them
// ============================================================
console.log("\nTest 9: Multiple MOUSE_DOWN without MOUSE_UP");
{
  try {
    const env = new MockOsEnv();
    env.reset({ taskId: "delete_scratch_file", seed: 9 });
    let hs = env.getHiddenState();

    const explorerWindow = hs.envState.windows.find(w => w.appId === "file-explorer");
    if (!explorerWindow) throw new Error("No explorer window");

    const titlebarY = explorerWindow.bounds.y + 15;
    const titlebarX = explorerWindow.bounds.x + explorerWindow.bounds.width / 2;

    // Multiple MOUSE_DOWN without MOUSE_UP
    env.step({ type: "MOUSE_DOWN", button: "left" });
    env.step({ type: "MOVE_TO", x: titlebarX, y: titlebarY });
    env.step({ type: "MOUSE_DOWN", button: "left" });
    env.step({ type: "MOUSE_DOWN", button: "left" });
    env.step({ type: "DRAG_TO", x: titlebarX + 50, y: titlebarY + 50 });
    env.step({ type: "MOUSE_UP", button: "left" });

    hs = env.getHiddenState();
    const validate = validateState(hs);
    const dragStateClean = !hs.envState.dragState || Object.keys(hs.envState.dragState).length === 0;

    const passed = validate.valid && dragStateClean;
    logResult(9, "Multiple MOUSE_DOWN without MOUSE_UP", passed,
      validate.issues.length > 0 ? validate.issues[0] : undefined, {
      dragStateClean,
      validState: validate.valid,
      windowCount: hs.envState.windows.length
    });
  } catch (e) {
    logResult(9, "Multiple MOUSE_DOWN without MOUSE_UP", false, e.message);
  }
}

// ============================================================
// Test 10: Drag a minimized window
// ============================================================
console.log("\nTest 10: Drag a minimized window");
{
  try {
    const env = new MockOsEnv();
    env.reset({ taskId: "delete_scratch_file", seed: 10 });
    let hs = env.getHiddenState();

    let explorerWindow = hs.envState.windows.find(w => w.appId === "file-explorer");
    if (!explorerWindow) throw new Error("No explorer window");

    // Minimize the window
    const minimizeButtonX = explorerWindow.bounds.x + explorerWindow.bounds.width - 45;
    const minimizeButtonY = explorerWindow.bounds.y + 15;
    env.step({ type: "CLICK", x: minimizeButtonX, y: minimizeButtonY });

    hs = env.getHiddenState();
    explorerWindow = hs.envState.windows.find(w => w.appId === "file-explorer");

    if (!explorerWindow.minimized) throw new Error("Window not minimized");

    // Try to drag the minimized window at its previous titlebar position
    const titlebarY = explorerWindow.bounds.y + 15;
    const titlebarX = explorerWindow.bounds.x + explorerWindow.bounds.width / 2;

    env.step({ type: "MOUSE_DOWN", button: "left" });
    env.step({ type: "MOVE_TO", x: titlebarX, y: titlebarY });
    env.step({ type: "DRAG_TO", x: titlebarX + 100, y: titlebarY + 50 });
    env.step({ type: "MOUSE_UP", button: "left" });

    hs = env.getHiddenState();
    const validate = validateState(hs);
    const dragStateClean = !hs.envState.dragState || Object.keys(hs.envState.dragState).length === 0;

    const passed = validate.valid && dragStateClean;
    logResult(10, "Drag a minimized window", passed,
      validate.issues.length > 0 ? validate.issues[0] : undefined, {
      dragStateClean,
      validState: validate.valid,
      windowStillMinimized: explorerWindow.minimized
    });
  } catch (e) {
    logResult(10, "Drag a minimized window", false, e.message);
  }
}

// ============================================================
// Test 11: Maximize then drag titlebar
// ============================================================
console.log("\nTest 11: Maximize then drag titlebar");
{
  try {
    const env = new MockOsEnv();
    env.reset({ taskId: "delete_scratch_file", seed: 11 });
    let hs = env.getHiddenState();

    let explorerWindow = hs.envState.windows.find(w => w.appId === "file-explorer");
    if (!explorerWindow) throw new Error("No explorer window");

    // Double-click titlebar to maximize
    const titlebarY = explorerWindow.bounds.y + 15;
    const titlebarX = explorerWindow.bounds.x + explorerWindow.bounds.width / 2;
    env.step({ type: "DOUBLE_CLICK", x: titlebarX, y: titlebarY });

    hs = env.getHiddenState();
    explorerWindow = hs.envState.windows.find(w => w.appId === "file-explorer");

    if (!explorerWindow.maximized) throw new Error("Window not maximized");

    // Now try to drag the maximized window
    env.step({ type: "MOUSE_DOWN", button: "left" });
    env.step({ type: "MOVE_TO", x: titlebarX, y: titlebarY });
    env.step({ type: "DRAG_TO", x: titlebarX + 100, y: titlebarY + 50 });
    env.step({ type: "MOUSE_UP", button: "left" });

    hs = env.getHiddenState();
    const validate = validateState(hs);
    const dragStateClean = !hs.envState.dragState || Object.keys(hs.envState.dragState).length === 0;

    const passed = validate.valid && dragStateClean;
    logResult(11, "Maximize then drag titlebar", passed,
      validate.issues.length > 0 ? validate.issues[0] : undefined, {
      dragStateClean,
      validState: validate.valid,
      windowStillMaximized: explorerWindow.maximized
    });
  } catch (e) {
    logResult(11, "Maximize then drag titlebar", false, e.message);
  }
}

// ============================================================
// Test 12: Rapid window focus changes (100 times)
// ============================================================
console.log("\nTest 12: Rapid window focus changes (100 times)");
{
  try {
    const env = new MockOsEnv();
    env.reset({ taskId: "delete_scratch_file", seed: 12 });
    let hs = env.getHiddenState();

    const windows = hs.envState.windows.filter(w => w.appId !== "gnome-shell").slice(0, 4);
    if (windows.length < 2) throw new Error("Need at least 2 windows");

    // Click between windows 100 times
    for (let i = 0; i < 100; i++) {
      const win = windows[i % windows.length];
      const clickX = win.bounds.x + 50;
      const clickY = win.bounds.y + 50;
      env.step({ type: "CLICK", x: clickX, y: clickY });
    }

    hs = env.getHiddenState();
    const validate = validateState(hs);

    const passed = validate.valid;
    logResult(12, "Rapid window focus changes (100x)", passed,
      validate.issues.length > 0 ? validate.issues[0] : undefined, {
      validState: validate.valid,
      windowCount: hs.envState.windows.length,
      orphanedAppStates: validate.issues.filter(i => i.includes("Orphaned")).length
    });
  } catch (e) {
    logResult(12, "Rapid window focus changes (100x)", false, e.message);
  }
}

// ============================================================
// Test 13: Close all windows one by one (with safety limit)
// ============================================================
console.log("\nTest 13: Close all windows one by one");
{
  try {
    const env = new MockOsEnv();
    env.reset({ taskId: "delete_scratch_file", seed: 13 });
    let hs = env.getHiddenState();

    let windowCount = hs.envState.windows.filter(w => w.appId !== "gnome-shell").length;
    const closureResults = [];
    let iterations = 0;
    const maxIterations = 20; // Safety limit

    // Close windows one by one with safety limit
    while (iterations < maxIterations) {
      hs = env.getHiddenState();
      const closableWindows = hs.envState.windows.filter(w => w.appId !== "gnome-shell");
      if (closableWindows.length === 0) break;

      const win = closableWindows[0];
      const closeButtonX = win.bounds.x + win.bounds.width - 15;
      const closeButtonY = win.bounds.y + 15;

      env.step({ type: "CLICK", x: closeButtonX, y: closeButtonY });

      hs = env.getHiddenState();
      closureResults.push(`Closed ${win.appId}`);
      iterations++;
    }

    hs = env.getHiddenState();
    const validate = validateState(hs);
    const dragStateClean = !hs.envState.dragState || Object.keys(hs.envState.dragState).length === 0;
    const noOrphanedStates = validate.issues.filter(i => i.includes("Orphaned")).length === 0;

    const passed = validate.valid && dragStateClean && noOrphanedStates;
    logResult(13, "Close all windows one by one", passed,
      validate.issues.length > 0 ? validate.issues.slice(0, 2).join("; ") : undefined, {
      windowsClosed: closureResults.length,
      dragStateClean,
      orphanedAppStates: validate.issues.filter(i => i.includes("Orphaned")).length,
      validState: validate.valid,
      hitIterationLimit: iterations === maxIterations
    });
  } catch (e) {
    logResult(13, "Close all windows one by one", false, e.message);
  }
}

// ============================================================
// Test 14: Open/close/reopen same app repeatedly
// ============================================================
console.log("\nTest 14: Open/close/reopen same app repeatedly");
{
  try {
    const env = new MockOsEnv();
    env.reset({ taskId: "delete_scratch_file", seed: 14 });

    const cycleCount = 5;
    const cycleLogs = [];

    for (let cycle = 0; cycle < cycleCount; cycle++) {
      let hs = env.getHiddenState();

      // Find file explorer
      let explorerWindow = hs.envState.windows.find(w => w.appId === "file-explorer");

      if (explorerWindow) {
        // Close it
        const closeButtonX = explorerWindow.bounds.x + explorerWindow.bounds.width - 15;
        const closeButtonY = explorerWindow.bounds.y + 15;
        env.step({ type: "CLICK", x: closeButtonX, y: closeButtonY });
        cycleLogs.push(`Cycle ${cycle}: Closed explorer`);
      }

      // Wait a step and reopen by clicking taskbar or dock
      hs = env.getHiddenState();
      const taskbar = hs.envState.windows.find(w => w.appId === "gnome-shell");
      if (taskbar) {
        // Click somewhere on taskbar to trigger app launcher (this might not work depending on impl)
        env.step({ type: "CLICK", x: taskbar.bounds.x + 100, y: taskbar.bounds.y + 15 });
        cycleLogs.push(`Cycle ${cycle}: Attempted reopen`);
      }
    }

    let hs = env.getHiddenState();
    const validate = validateState(hs);
    const dragStateClean = !hs.envState.dragState || Object.keys(hs.envState.dragState).length === 0;

    const passed = validate.valid && dragStateClean;
    logResult(14, "Open/close/reopen same app (5x)", passed,
      validate.issues.length > 0 ? validate.issues[0] : undefined, {
      dragStateClean,
      validState: validate.valid,
      cyclesCompleted: cycleCount,
      windowCount: hs.envState.windows.length
    });
  } catch (e) {
    logResult(14, "Open/close/reopen same app (5x)", false, e.message);
  }
}

// ============================================================
// Summary Report
// ============================================================
console.log("\n===============================================");
console.log("SUMMARY");
console.log("===============================================");

const passed = results.filter(r => r.passed).length;
const failed = results.filter(r => !r.passed).length;
const passRate = ((passed / results.length) * 100).toFixed(1);

console.log(`Total Tests: ${results.length}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Pass Rate: ${passRate}%`);

if (failed > 0) {
  console.log("\nFailed Tests:");
  results.filter(r => !r.passed).forEach(r => {
    console.log(`  [${r.testNum}] ${r.testName}: ${r.error}`);
  });
}

console.log("\n===============================================");
console.log("DETAILED RESULTS");
console.log("===============================================");
console.log(JSON.stringify(results, null, 2));

process.exit(failed > 0 ? 1 : 0);
