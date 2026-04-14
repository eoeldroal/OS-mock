/**
 * Complete Browser App Test Script
 * Tests the mock OS Browser (Firefox) application with proper layout calculations
 */

import { MockOsEnv } from "./packages/core/dist/index.js";
import { mkdirSync, writeFileSync } from "fs";
import { resolve } from "path";

const OUTPUT_DIR = resolve("logs/agent-tests/browser-test-complete");
mkdirSync(OUTPUT_DIR, { recursive: true });

let testsPassed = 0;
let testsFailed = 0;

// ── Layout calculation (from browser-lite.ts) ──
const HEADER_HEIGHT = 32;
const TAB_HEIGHT = 30;
const TOOLBAR_HEIGHT = 42;
const PADDING = 12;
const CONTENT_INSET = 14;
const CATEGORY_WIDTH = 136;

function rowBounds(base, index, height, gap = 8) {
  return {
    x: base.x,
    y: base.y + index * (height + gap),
    width: base.width,
    height
  };
}

function getBrowserLayout(windowBounds, state) {
  const tabsBounds = {
    x: windowBounds.x + 12,
    y: windowBounds.y + HEADER_HEIGHT + 6,
    width: windowBounds.width - 24,
    height: TAB_HEIGHT
  };

  const addressBounds = {
    x: windowBounds.x + 52,
    y: windowBounds.y + HEADER_HEIGHT + TAB_HEIGHT + 14,
    width: windowBounds.width - 64,
    height: 30
  };

  const contentFrameBounds = {
    x: windowBounds.x + PADDING,
    y: windowBounds.y + HEADER_HEIGHT + TAB_HEIGHT + TOOLBAR_HEIGHT + 8,
    width: windowBounds.width - PADDING * 2,
    height: windowBounds.height - HEADER_HEIGHT - TAB_HEIGHT - TOOLBAR_HEIGHT - 20
  };

  const bookmarksBounds = {
    x: contentFrameBounds.x + CONTENT_INSET,
    y: contentFrameBounds.y + CONTENT_INSET + 32,
    width: 138,
    height: contentFrameBounds.height - CONTENT_INSET * 2 - 32
  };

  const categoriesBounds = {
    x: bookmarksBounds.x + bookmarksBounds.width + 14,
    y: bookmarksBounds.y + 32,
    width: CATEGORY_WIDTH,
    height: bookmarksBounds.height - 32
  };

  return {
    tabsBounds,
    addressBounds,
    contentFrameBounds,
    bookmarksBounds,
    categoriesBounds,
    tabRects: state.tabs.map((_, index) => ({
      x: tabsBounds.x + index * 122,
      y: tabsBounds.y,
      width: 114,
      height: TAB_HEIGHT
    })),
    categoryRects: state.categories.map((_, index) => rowBounds(categoriesBounds, index, 34))
  };
}

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
  }
}

function printBrowserState(model, label, verbose = false) {
  const browser = getBrowserWindow(model);
  if (!browser || !browser.appView) {
    console.log(`  [${label}] No browser window found`);
    return null;
  }

  const state = browser.appView;
  if (verbose) {
    console.log(`  [${label}] Browser State:`);
    console.log(`    URL: ${state.url}`);
    console.log(`    PageTitle: ${state.pageTitle}`);
    console.log(`    CurrentPage: ${state.currentPage}`);
    console.log(`    ActiveTab: ${state.tabs.find(t => t.active)?.title}`);
    console.log(`    Categories: ${state.categories.map(c => c.label).join(', ')}`);
    if (state.currentPage === "help") {
      console.log(`    HelpLines: ${state.helpLines.length} items`);
      console.log(`    SelectedLineIndex: ${state.selectedHelpLineIndex}`);
    }
  }
  return state;
}

// ── Main test ──
async function main() {
  console.log("\n═══════════════════════════════════════════════════");
  console.log("   COMPLETE BROWSER APP TEST");
  console.log("═══════════════════════════════════════════════════\n");

  // Initialize
  console.log("Initializing MockOsEnv...");
  const env = new MockOsEnv({ width: 1280, height: 800 });
  env.reset({ taskId: "browser_capture_help_line", seed: 0, maxSteps: 0 });
  console.log("✓ Environment initialized\n");

  let model = env.getRenderModel();
  const browserWindow = getBrowserWindow(model);
  let state = printBrowserState(model, "Initial", true);
  const layout = getBrowserLayout(browserWindow.bounds, state);

  // ════════════════════════════════════════════════════════
  // TEST SUITE 1: Basic Properties
  // ════════════════════════════════════════════════════════
  console.log("TEST SUITE 1: Basic Properties");
  console.log("─────────────────────────────────────────────────────");
  assert(browserWindow.title === "Mozilla Firefox", "Window title is 'Mozilla Firefox'");
  assert(browserWindow.appView.type === "browser-lite", "App type is 'browser-lite'");
  assert(state.currentPage === "explorer", "Initial page is 'explorer'");
  assert(state.pageTitle === "OSWorld Explorer", "Page title is 'OSWorld Explorer'");
  assert(state.tabs.length === 2, "Has 2 tabs");
  assert(state.categories.length === 4, "Has 4 categories");
  console.log();

  // ════════════════════════════════════════════════════════
  // TEST SUITE 2: Tab Navigation
  // ════════════════════════════════════════════════════════
  console.log("TEST SUITE 2: Tab Navigation");
  console.log("─────────────────────────────────────────────────────");

  // Calculate proper tab click position for Ubuntu help tab (tab 1)
  const helpTabRect = layout.tabRects[1];
  const helpTabX = helpTabRect.x + helpTabRect.width / 2;
  const helpTabY = helpTabRect.y + helpTabRect.height / 2;

  console.log(`Clicking Ubuntu help tab at (${Math.round(helpTabX)}, ${Math.round(helpTabY)})`);
  let result = env.step({ type: "CLICK", x: helpTabX, y: helpTabY });
  assert(result.actionAccepted === true, "Tab click accepted");

  model = env.getRenderModel();
  state = printBrowserState(model, "After help tab click", true);
  assert(state.currentPage === "help", "Switched to help page");
  assert(state.tabs[1].active === true, "Help tab is now active");
  console.log();

  // ════════════════════════════════════════════════════════
  // TEST SUITE 3: Help Line Selection & Copy
  // ════════════════════════════════════════════════════════
  console.log("TEST SUITE 3: Help Line Selection & Copy");
  console.log("─────────────────────────────────────────────────────");

  if (state.helpLines.length > 0) {
    console.log(`Available help lines: ${state.helpLines.length}`);
    console.log(`Line 0: "${state.helpLines[0]}"`);

    // Click on first help line (approximate position in help text area)
    // Based on layout: helpLineRects start at helpTextBounds.y + 70 + index * 66
    const helpTextX = browserWindow.bounds.x + browserWindow.bounds.width / 2;
    const helpTextY = browserWindow.bounds.y + 200;

    console.log(`Clicking first help line at (${Math.round(helpTextX)}, ${Math.round(helpTextY)})`);
    result = env.step({ type: "CLICK", x: helpTextX, y: helpTextY });
    assert(result.actionAccepted === true, "Help line click accepted");

    model = env.getRenderModel();
    state = printBrowserState(model, "After line click", false);
    assert(state.selectedHelpLineIndex === 0, "First help line is selected");

    // Copy the line
    console.log("Copying selected line with Ctrl+C");
    result = env.step({ type: "HOTKEY", keys: ["ctrl", "c"] });
    assert(result.actionAccepted === true, "Copy hotkey accepted");

    const hiddenState = env.getHiddenState();
    const clipboardContent = hiddenState.clipboard || "";
    console.log(`Clipboard: "${clipboardContent}"`);
    assert(clipboardContent === state.helpLines[0], "Clipboard contains selected line");
  }
  console.log();

  // ════════════════════════════════════════════════════════
  // TEST SUITE 4: Back to Explorer & Category Navigation
  // ════════════════════════════════════════════════════════
  console.log("TEST SUITE 4: Back to Explorer & Category Navigation");
  console.log("─────────────────────────────────────────────────────");

  // Switch back to explorer
  const explorerTabRect = layout.tabRects[0];
  const explorerTabX = explorerTabRect.x + explorerTabRect.width / 2;
  const explorerTabY = explorerTabRect.y + explorerTabRect.height / 2;

  console.log(`Switching back to explorer tab at (${Math.round(explorerTabX)}, ${Math.round(explorerTabY)})`);
  result = env.step({ type: "CLICK", x: explorerTabX, y: explorerTabY });
  assert(result.actionAccepted === true, "Explorer tab click accepted");

  model = env.getRenderModel();
  state = printBrowserState(model, "After explorer tab click", false);
  assert(state.currentPage === "explorer", "Back on explorer page");
  assert(state.tabs[0].active === true, "Explorer tab is active");

  // Try clicking on a different category
  if (state.categories.length > 1) {
    const categoryIndex = 1; // Try "OS" category
    const categoryRect = layout.categoryRects[categoryIndex];
    const categoryX = categoryRect.x + categoryRect.width / 2;
    const categoryY = categoryRect.y + categoryRect.height / 2;

    console.log(`Clicking category "${state.categories[categoryIndex].label}" at (${Math.round(categoryX)}, ${Math.round(categoryY)})`);
    result = env.step({ type: "CLICK", x: categoryX, y: categoryY });
    assert(result.actionAccepted === true, "Category click accepted");

    model = env.getRenderModel();
    state = printBrowserState(model, "After category click", false);
    assert(state.selectedCategoryId === state.categories[categoryIndex].id, "Selected category changed");
  }
  console.log();

  // ════════════════════════════════════════════════════════
  // TEST SUITE 5: URL Bar Interaction
  // ════════════════════════════════════════════════════════
  console.log("TEST SUITE 5: URL Bar Interaction");
  console.log("─────────────────────────────────────────────────────");

  const urlBarX = layout.addressBounds.x + layout.addressBounds.width / 2;
  const urlBarY = layout.addressBounds.y + layout.addressBounds.height / 2;

  console.log(`Clicking URL bar at (${Math.round(urlBarX)}, ${Math.round(urlBarY)})`);
  result = env.step({ type: "CLICK", x: urlBarX, y: urlBarY });
  assert(result.actionAccepted === true, "URL bar click accepted");

  model = env.getRenderModel();
  state = printBrowserState(model, "After URL bar click", false);
  assert(state.url === "https://os-world.github.io/explorer.html", "URL unchanged after click");
  console.log();

  // ════════════════════════════════════════════════════════
  // SUMMARY
  // ════════════════════════════════════════════════════════
  console.log("═══════════════════════════════════════════════════");
  console.log("   TEST SUMMARY");
  console.log("═══════════════════════════════════════════════════");
  console.log(`Total Tests: ${testsPassed + testsFailed}`);
  console.log(`Passed: ${testsPassed} (${Math.round((testsPassed / (testsPassed + testsFailed)) * 100)}%)`);
  console.log(`Failed: ${testsFailed}`);
  console.log();

  const summary = {
    taskId: "browser_capture_help_line",
    totalTests: testsPassed + testsFailed,
    passed: testsPassed,
    failed: testsFailed,
    successRate: Math.round((testsPassed / (testsPassed + testsFailed)) * 100),
    timestamp: new Date().toISOString()
  };

  writeFileSync(resolve(OUTPUT_DIR, "test-summary.json"), JSON.stringify(summary, null, 2));
  console.log(`Summary saved to: ${OUTPUT_DIR}/test-summary.json`);

  process.exit(testsFailed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
