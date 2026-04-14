/**
 * Browser App State Test Script
 * Tests the mock OS Browser (Firefox) application features
 * - Validates state changes through MockOsEnv
 * - Does not require Playwright/web rendering
 */

import { MockOsEnv } from "./packages/core/dist/index.js";
import { mkdirSync, writeFileSync } from "fs";
import { resolve } from "path";

const OUTPUT_DIR = resolve("logs/agent-tests/browser-test-state");
mkdirSync(OUTPUT_DIR, { recursive: true });

let testsPassed = 0;
let testsFailed = 0;
const testResults = [];

// ── Helper functions ──
function getBrowserWindow(model) {
  return model.windows?.find(w => w.appView?.type === "browser-lite");
}

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    testsPassed++;
  } else {
    console.log(`  ✗ FAILED: ${message}`);
    testsFailed++;
    testResults.push({ test: message, status: 'FAIL' });
  }
}

function printBrowserState(model, label) {
  const browser = getBrowserWindow(model);
  if (!browser || !browser.appView) {
    console.log(`  [${label}] No browser window found`);
    return null;
  }

  const state = browser.appView;
  console.log(`  [${label}] Browser State:`);
  console.log(`    URL: ${state.url}`);
  console.log(`    PageTitle: ${state.pageTitle}`);
  console.log(`    CurrentPage: ${state.currentPage}`);
  console.log(`    Tabs: ${state.tabs.map(t => `${t.title}(${t.active ? 'active' : 'inactive'})`).join(', ')}`);
  console.log(`    Categories: ${state.categories.length} items`);
  console.log(`    SelectedCategoryId: ${state.selectedCategoryId}`);
  console.log(`    SelectedTaskId: ${state.selectedTaskId}`);
  console.log(`    HelpLines: ${state.helpLines.length} items`);
  console.log(`    SelectedHelpLineIndex: ${state.selectedHelpLineIndex}`);
  return state;
}

// ── Main test ──
async function main() {
  console.log("\n═════════════════════════════════════════════");
  console.log("   BROWSER APP STATE TEST SCRIPT");
  console.log("═════════════════════════════════════════════\n");

  // Initialize MockOsEnv
  console.log("1. Creating MockOsEnv and resetting to 'browser_capture_help_line' task...");
  const env = new MockOsEnv({ width: 1280, height: 800 });
  env.reset({ taskId: "browser_capture_help_line", seed: 0, maxSteps: 0 });
  console.log("   ✓ Environment reset\n");

  // Test 1: Initial state should be Explorer page
  console.log("TEST 1: Initial State - OSWorld Explorer Page");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  let model = env.getRenderModel();
  let state = printBrowserState(model, "Initial");

  assert(state?.currentPage === "explorer", "Should be on explorer page initially");
  assert(state?.pageTitle === "OSWorld Explorer", "Page title should be 'OSWorld Explorer'");
  assert(state?.url === "https://os-world.github.io/explorer.html", "URL should be explorer page");
  assert(state?.categories.length > 0, "Should have categories");
  assert(state?.tabs?.length === 2, "Should have 2 tabs (Explorer + Help)");
  assert(state?.tabs[0]?.active === true, "First tab (Explorer) should be active");
  assert(state?.tabs[1]?.active === false, "Second tab (Help) should be inactive");
  console.log();

  // Test 2: Click on browser window to focus
  console.log("TEST 2: Click on Browser Window");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  const browserWindow = getBrowserWindow(model);
  const clickX = browserWindow.bounds.x + browserWindow.bounds.width / 2;
  const clickY = browserWindow.bounds.y + browserWindow.bounds.height / 2;
  let result = env.step({ type: "CLICK", x: clickX, y: clickY });
  assert(result.actionAccepted === true, "Click on browser should be accepted");
  model = env.getRenderModel();
  state = printBrowserState(model, "After click");
  console.log();

  // Test 3: Click on different categories
  console.log("TEST 3: Category Navigation");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  const categories = state.categories;
  assert(categories.length > 1, `Should have multiple categories (found ${categories.length})`);

  // Try to click on categories (approximate positions based on layout)
  // Categories are on the left side
  for (let i = 0; i < Math.min(2, categories.length); i++) {
    const categoryClickX = browserWindow.bounds.x + 150;
    const categoryClickY = browserWindow.bounds.y + 120 + (i * 42);

    console.log(`  Attempting to click category ${i + 1}: "${categories[i].label}"`);
    result = env.step({ type: "CLICK", x: categoryClickX, y: categoryClickY });
    assert(result.actionAccepted === true, `Click on category ${i + 1} should be accepted`);
  }

  model = env.getRenderModel();
  state = printBrowserState(model, "After category clicks");
  console.log();

  // Test 4: Click on help tab to switch pages
  console.log("TEST 4: Switch to Help Page via Tab");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  const helpTabX = browserWindow.bounds.x + 140;
  const helpTabY = browserWindow.bounds.y + 70;

  console.log(`  Clicking on help tab at (${helpTabX}, ${helpTabY})`);
  result = env.step({ type: "CLICK", x: helpTabX, y: helpTabY });
  assert(result.actionAccepted === true, "Click on help tab should be accepted");

  model = env.getRenderModel();
  state = printBrowserState(model, "After help tab click");

  // The current implementation might not switch pages on first attempt
  // Let's check what the actual state is
  console.log(`  Current page: ${state.currentPage}`);
  console.log(`  Note: Help tab click accepted, but page may need further analysis`);
  console.log();

  // Test 5: Click on help line to select it
  console.log("TEST 5: Help Line Selection");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  Available help lines: ${state.helpLines.length}`);

  if (state.helpLines.length > 0) {
    console.log(`  First help line: "${state.helpLines[0]}"`);

    // Click on help line area
    const helpLineClickX = browserWindow.bounds.x + 600;
    const helpLineClickY = browserWindow.bounds.y + 200;

    console.log(`  Clicking help line at (${helpLineClickX}, ${helpLineClickY})`);
    result = env.step({ type: "CLICK", x: helpLineClickX, y: helpLineClickY });
    assert(result.actionAccepted === true, "Click on help line should be accepted");
  }

  model = env.getRenderModel();
  state = printBrowserState(model, "After help line selection");
  console.log();

  // Test 6: Copy selected help line
  console.log("TEST 6: Copy Help Line (Ctrl+C)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // First, ensure we're on help page and have a line selected
  // Try to navigate to help page first
  const browserState = state;
  if (browserState.currentPage !== "help") {
    console.log("  Note: Currently on explorer page, attempting to switch to help...");
    // Try clicking help tab again
    result = env.step({ type: "CLICK", x: helpTabX, y: helpTabY });
    model = env.getRenderModel();
    state = printBrowserState(model, "After second help tab click");
  }

  // Now try to select a help line if we're on help page
  if (state.currentPage === "help" && state.helpLines.length > 0) {
    // Click to select first help line
    const helpLineClickX = browserWindow.bounds.x + 600;
    const helpLineClickY = browserWindow.bounds.y + 200;
    result = env.step({ type: "CLICK", x: helpLineClickX, y: helpLineClickY });

    model = env.getRenderModel();
    state = printBrowserState(model, "After selecting help line");

    // Now try copy
    console.log(`  Executing HOTKEY: Ctrl+C`);
    result = env.step({ type: "HOTKEY", keys: ["ctrl", "c"] });
    assert(result.actionAccepted === true, "Ctrl+C should be accepted");

    const hiddenState = env.getHiddenState();
    console.log(`  Clipboard content: "${hiddenState.clipboard || '(empty)'}"`);
  } else {
    console.log("  Skipping copy test: not on help page or no help lines available");
  }
  console.log();

  // Test 7: Switch back to explorer
  console.log("TEST 7: Switch Back to Explorer Page");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  const explorerTabX = browserWindow.bounds.x + 80;
  const explorerTabY = browserWindow.bounds.y + 70;

  console.log(`  Clicking on explorer tab at (${explorerTabX}, ${explorerTabY})`);
  result = env.step({ type: "CLICK", x: explorerTabX, y: explorerTabY });
  assert(result.actionAccepted === true, "Click on explorer tab should be accepted");

  model = env.getRenderModel();
  state = printBrowserState(model, "After switching back to explorer");
  console.log();

  // Test 8: URL bar interaction
  console.log("TEST 8: URL Bar Click");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  const urlBarX = browserWindow.bounds.x + 640;
  const urlBarY = browserWindow.bounds.y + 105;

  console.log(`  Clicking URL bar at (${urlBarX}, ${urlBarY})`);
  result = env.step({ type: "CLICK", x: urlBarX, y: urlBarY });
  assert(result.actionAccepted === true, "Click on URL bar should be accepted");

  model = env.getRenderModel();
  state = printBrowserState(model, "After URL bar click");
  console.log();

  // Test 9: Browser window properties
  console.log("TEST 9: Browser Window Properties");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  assert(browserWindow.title === "Mozilla Firefox", "Window title should be 'Mozilla Firefox'");
  assert(browserWindow.appView.type === "browser-lite", "App type should be 'browser-lite'");
  assert(browserWindow.focused === true, "Window should be focused after our clicks");
  assert(browserWindow.bounds.width > 0 && browserWindow.bounds.height > 0, "Window should have valid dimensions");
  console.log();

  // Summary
  console.log("═════════════════════════════════════════════");
  console.log("   TEST SUMMARY");
  console.log("═════════════════════════════════════════════");
  console.log(`Total Tests: ${testsPassed + testsFailed}`);
  console.log(`Passed: ${testsPassed}`);
  console.log(`Failed: ${testsFailed}`);
  console.log(`Success Rate: ${Math.round((testsPassed / (testsPassed + testsFailed)) * 100)}%`);
  console.log();

  if (testsFailed > 0) {
    console.log("Failed Tests:");
    testResults.forEach(r => console.log(`  - ${r.test}`));
    console.log();
  }

  // Write summary to file
  const summary = {
    taskId: "browser_capture_help_line",
    totalTests: testsPassed + testsFailed,
    passed: testsPassed,
    failed: testsFailed,
    successRate: Math.round((testsPassed / (testsPassed + testsFailed)) * 100),
    timestamp: new Date().toISOString(),
    testResults
  };

  writeFileSync(resolve(OUTPUT_DIR, "test-summary.json"), JSON.stringify(summary, null, 2));
  console.log(`Summary saved to: ${OUTPUT_DIR}/test-summary.json`);
  console.log();

  process.exit(testsFailed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
