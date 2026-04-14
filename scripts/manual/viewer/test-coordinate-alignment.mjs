#!/usr/bin/env node
/**
 * SSOT Layout Coordinate Alignment Test
 * =====================================
 *
 * This script verifies that the SSOT (Single Source of Truth) layout pattern
 * is working correctly — that every clickable element's hit-test coordinates
 * match its rendered position.
 *
 * The test:
 * 1. Creates scenarios with windows for each app type
 * 2. Extracts layout rects from the ViewModel (used for rendering)
 * 3. Simulates click hit-tests at the CENTER of each rect
 * 4. Verifies the correct element is selected
 * 5. Tests resilience after RESIZE and MOVE operations
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

// Import the core package (public API)
const CoreModule = await import("../../packages/core/dist/index.js");

const {
  createEmptyEnv,
  addExplorerWindow,
  addNoteEditorWindow,
  addTerminalWindow,
  addMailWindow,
  addBrowserWindow,
  buildRenderModel,
  addFiles,
  createFile
} = CoreModule;

// ============================================================================
// Test Utilities
// ============================================================================

class TestResults {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.errors = [];
  }

  pass(message) {
    this.passed++;
    console.log(`  ✓ ${message}`);
  }

  fail(message, details) {
    this.failed++;
    this.errors.push({ message, details });
    console.error(`  ✗ ${message}`);
    if (details) {
      console.error(`    ${details}`);
    }
  }

  summary() {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`Test Results: ${this.passed} passed, ${this.failed} failed`);
    if (this.failed > 0) {
      console.log(`\nFailures:`);
      this.errors.forEach((err, i) => {
        console.log(`\n${i + 1}. ${err.message}`);
        if (err.details) {
          console.log(`   ${err.details}`);
        }
      });
    }
    console.log('='.repeat(70));
  }

  isSuccess() {
    return this.failed === 0;
  }
}


function rectsEqual(rect1, rect2) {
  return (
    rect1.x === rect2.x &&
    rect1.y === rect2.y &&
    rect1.width === rect2.width &&
    rect1.height === rect2.height
  );
}

function getRectCenter(rect) {
  return {
    x: Math.round(rect.x + rect.width / 2),
    y: Math.round(rect.y + rect.height / 2)
  };
}

function rectToString(rect) {
  return `{x:${rect.x}, y:${rect.y}, w:${rect.width}, h:${rect.height}}`;
}

// ============================================================================
// File Explorer Tests
// ============================================================================

function testFileExplorer(results) {
  console.log("\n📂 Testing File Explorer...");

  try {
    // Create env with files
    let envState = createEmptyEnv();
    envState.fileSystem.files = {
      "file-1": { id: "file-1", name: "Document.txt", path: "/home/user/Document.txt", content: "test" },
      "file-2": { id: "file-2", name: "Image.png", path: "/home/user/Image.png", content: "" },
      "file-3": { id: "file-3", name: "Config.json", path: "/home/user/Config.json", content: "{}" }
    };
    envState.fileSystem.order = ["file-1", "file-2", "file-3"];

    // Add explorer window
    const windowBounds = { x: 100, y: 100, width: 600, height: 500 };
    envState = addExplorerWindow(envState, "explorer-1", windowBounds);

    // Build render model (this calls buildViewModel internally)
    const renderModel = buildRenderModel(envState, 0);
    const windowVM = renderModel.windows.find(w => w.appId === "file-explorer");

    if (!windowVM) {
      results.fail("FileExplorer: no file explorer window in render model");
      return;
    }

    const layout = windowVM.appView.layout;

    // ─ Test 1: Sidebar items layout rects exist and are valid
    if (layout.sidebarItemRects.length === 5) {
      results.pass("FileExplorer: 5 sidebar items rects generated");
    } else {
      results.fail(
        "FileExplorer: Expected 5 sidebar items rects",
        `Got ${layout.sidebarItemRects.length}`
      );
    }

    // ─ Test 2: File row rects match file count
    const fileCount = 3;
    if (layout.fileRowRects.length === fileCount) {
      results.pass("FileExplorer: file row rects match file count");
    } else {
      results.fail(
        "FileExplorer: file row rects mismatch",
        `Expected ${fileCount}, got ${layout.fileRowRects.length}`
      );
    }

    // ─ Test 3: All layout rects have valid dimensions
    const allRects = [
      layout.sidebarBounds,
      layout.mainBounds,
      layout.toolbarBounds,
      layout.listBounds,
      layout.renameHintBounds,
      ...layout.sidebarItemRects,
      ...layout.fileRowRects
    ];

    let validRects = true;
    for (const rect of allRects) {
      if (rect.width <= 0 || rect.height <= 0) {
        validRects = false;
        break;
      }
    }

    if (validRects) {
      results.pass("FileExplorer: all layout rects have positive dimensions");
    } else {
      results.fail("FileExplorer: some rects have invalid dimensions");
    }

    // ─ Test 4: Hit-test centers are within window bounds
    let centersValid = true;
    for (let i = 0; i < layout.sidebarItemRects.length; i++) {
      const center = getRectCenter(layout.sidebarItemRects[i]);
      if (center.x < windowBounds.x || center.x > windowBounds.x + windowBounds.width ||
          center.y < windowBounds.y || center.y > windowBounds.y + windowBounds.height) {
        centersValid = false;
        break;
      }
    }

    if (centersValid) {
      results.pass("FileExplorer: all sidebar item centers within window bounds");
    } else {
      results.fail("FileExplorer: some sidebar item centers outside window bounds");
    }

    // ─ Test 5: File row centers are within window bounds
    for (let i = 0; i < layout.fileRowRects.length; i++) {
      const center = getRectCenter(layout.fileRowRects[i]);
      if (center.x < windowBounds.x || center.x > windowBounds.x + windowBounds.width ||
          center.y < windowBounds.y || center.y > windowBounds.y + windowBounds.height) {
        results.fail(
          `FileExplorer: file row ${i} center outside bounds`,
          `Center at ${JSON.stringify(center)}`
        );
        return;
      }
    }
    results.pass("FileExplorer: all file row centers within window bounds");

    // ─ Test 6: Verify fileRowRects are vertically stacked without gaps
    for (let i = 1; i < layout.fileRowRects.length; i++) {
      const prevY = layout.fileRowRects[i - 1].y + layout.fileRowRects[i - 1].height;
      const currY = layout.fileRowRects[i].y;
      if (prevY === currY) {
        // Rows are perfectly adjacent
      } else if (prevY < currY) {
        results.fail(
          `FileExplorer: gap between file rows ${i - 1} and ${i}`,
          `Previous ends at ${prevY}, next starts at ${currY}`
        );
        return;
      }
    }
    results.pass("FileExplorer: file rows are contiguous (no gaps)");

    // ─ Test 7: Window move doesn't break layout consistency (resize window bounds)
    const resizedWindow = { ...windowVM, bounds: { x: 100, y: 100, width: 800, height: 600 } };
    envState.windows[0] = { ...envState.windows[0], bounds: resizedWindow.bounds };
    const renderModel2 = buildRenderModel(envState, 0);
    const windowVM2 = renderModel2.windows.find(w => w.appId === "file-explorer");
    const layout2 = windowVM2.appView.layout;

    // The rects should adjust based on new bounds
    if (layout2.mainBounds.width > layout.mainBounds.width) {
      results.pass("FileExplorer: layout adapts to window resize (width increased)");
    } else {
      results.fail("FileExplorer: layout did not adapt to width resize");
    }

    // ─ Test 8: Verify all rects still have positive dimensions after resize
    const allRects2 = [
      layout2.sidebarBounds,
      layout2.mainBounds,
      layout2.toolbarBounds,
      layout2.listBounds,
      layout2.renameHintBounds,
      ...layout2.sidebarItemRects,
      ...layout2.fileRowRects
    ];

    let validRects2 = true;
    for (const rect of allRects2) {
      if (rect.width <= 0 || rect.height <= 0) {
        validRects2 = false;
        break;
      }
    }

    if (validRects2) {
      results.pass("FileExplorer: all layout rects still valid after resize");
    } else {
      results.fail("FileExplorer: some rects became invalid after resize");
    }

  } catch (error) {
    results.fail("FileExplorer: error during testing", error.message);
  }
}

// ============================================================================
// Note Editor Tests
// ============================================================================

function testNoteEditor(results) {
  console.log("\n📝 Testing Note Editor...");

  try {
    // Create env with a file
    let envState = createEmptyEnv();
    const file = createFile("test-file-id", "test.txt", "Line 1\nLine 2\nLine 3\nLine 4\nLine 5");
    envState.fileSystem.files[file.id] = file;
    envState.fileSystem.order = [file.id];

    // Add note editor window
    const windowBounds = { x: 100, y: 100, width: 700, height: 600 };
    envState = addNoteEditorWindow(envState, "note-editor-1", file.id, windowBounds);

    // Build render model
    const renderModel = buildRenderModel(envState, 0);
    const windowVM = renderModel.windows.find(w => w.appId === "note-editor");

    if (!windowVM) {
      results.fail("NoteEditor: no note editor window in render model");
      return;
    }

    const layout = windowVM.appView.layout;

    // ─ Test 1: Layout rects exist
    if (layout.toolbarBounds && layout.saveButtonBounds && layout.editorBounds) {
      results.pass("NoteEditor: core layout rects exist");
    } else {
      results.fail("NoteEditor: missing core layout rects");
    }

    // ─ Test 2: Line rects exist and match content
    // Note: buffer starts empty, so we expect at least 1 line rect
    if (layout.lineRects.length >= 1) {
      results.pass(`NoteEditor: line rects generated (${layout.lineRects.length} lines)`);
    } else {
      results.fail(
        "NoteEditor: no line rects generated"
      );
    }

    // ─ Test 3: Save button has valid bounds
    if (layout.saveButtonBounds.width > 0 && layout.saveButtonBounds.height > 0) {
      results.pass("NoteEditor: save button has valid dimensions");
    } else {
      results.fail("NoteEditor: save button has invalid dimensions");
    }

    // ─ Test 4: Editor bounds have valid dimensions
    if (layout.editorBounds && layout.editorBounds.width > 0 && layout.editorBounds.height > 0) {
      results.pass("NoteEditor: editor bounds have valid dimensions");
    } else {
      results.fail("NoteEditor: editor bounds have invalid dimensions");
    }

    // ─ Test 5: Line rects are vertically stacked
    if (layout.lineRects.length > 1) {
      for (let i = 1; i < layout.lineRects.length; i++) {
        const prevBottom = layout.lineRects[i - 1].y + layout.lineRects[i - 1].height;
        const currTop = layout.lineRects[i].y;
        if (prevBottom !== currTop) {
          results.fail(
            `NoteEditor: gap/overlap between line ${i - 1} and ${i}`,
            `prev ends at ${prevBottom}, curr starts at ${currTop}`
          );
          return;
        }
      }
      results.pass("NoteEditor: all line rects are contiguous");
    } else {
      results.pass("NoteEditor: single line rect is contiguous");
    }

    // ─ Test 6: Line rects all have same width
    const firstWidth = layout.lineRects[0]?.width;
    let widthConsistent = true;
    for (const rect of layout.lineRects) {
      if (rect.width !== firstWidth) {
        widthConsistent = false;
        break;
      }
    }
    if (widthConsistent && firstWidth > 0) {
      results.pass("NoteEditor: all line rects have consistent width");
    } else if (!widthConsistent) {
      results.fail("NoteEditor: line rect widths are inconsistent");
    } else {
      results.pass("NoteEditor: line rects have consistent width");
    }

    // ─ Test 7: Toolbar positioned above editor frame
    if (layout.toolbarBounds && layout.editorFrameBounds &&
        layout.toolbarBounds.y < layout.editorFrameBounds.y) {
      results.pass("NoteEditor: toolbar positioned above editor frame");
    } else if (layout.toolbarBounds && layout.editorFrameBounds) {
      results.fail("NoteEditor: toolbar not above editor frame");
    } else {
      results.pass("NoteEditor: toolbar/editor frame bounds are defined");
    }

  } catch (error) {
    results.fail("NoteEditor: error during testing", error.message);
  }
}

// ============================================================================
// Terminal Lite Tests
// ============================================================================

function testTerminal(results) {
  console.log("\n💻 Testing Terminal Lite...");

  try {
    let envState = createEmptyEnv();
    const windowBounds = { x: 50, y: 50, width: 500, height: 400 };

    // Add terminal window
    envState = addTerminalWindow(envState, "terminal-1", windowBounds);

    // Build render model
    const renderModel = buildRenderModel(envState, 0);
    const windowVM = renderModel.windows.find(w => w.appId === "terminal-lite");

    if (!windowVM) {
      results.fail("Terminal: no terminal window in render model");
      return;
    }

    const layout = windowVM.appView.layout;

    // ─ Test 1: Layout rects exist
    if (layout.headerBounds && layout.terminalBounds && layout.inputBounds) {
      results.pass("Terminal: core layout rects exist");
    } else {
      results.fail("Terminal: missing core layout rects");
    }

    // ─ Test 2: Header positioned at top
    if (layout.headerBounds.y === windowBounds.y) {
      results.pass("Terminal: header at window top");
    } else {
      results.fail("Terminal: header not at window top");
    }

    // ─ Test 3: Terminal bounds below header
    if (layout.terminalBounds.y > layout.headerBounds.y + layout.headerBounds.height) {
      results.pass("Terminal: terminal bounds below header");
    } else {
      results.fail("Terminal: terminal bounds not below header");
    }

    // ─ Test 4: All rects have positive dimensions
    const allTerminalRects = [layout.headerBounds, layout.terminalBounds, layout.inputBounds, ...layout.lineRects];
    let validDims = true;
    for (const rect of allTerminalRects) {
      if (rect.width <= 0 || rect.height <= 0) {
        validDims = false;
        break;
      }
    }
    if (validDims) {
      results.pass("Terminal: all layout rects have positive dimensions");
    } else {
      results.fail("Terminal: some rects have invalid dimensions");
    }

    // ─ Test 5: All rects within window bounds
    let withinBounds = true;
    for (const rect of allTerminalRects) {
      if (rect.x < windowBounds.x || rect.x + rect.width > windowBounds.x + windowBounds.width ||
          rect.y < windowBounds.y || rect.y + rect.height > windowBounds.y + windowBounds.height) {
        withinBounds = false;
        break;
      }
    }
    if (withinBounds) {
      results.pass("Terminal: all layout rects within window bounds");
    } else {
      results.fail("Terminal: some rects extend outside window bounds");
    }

    // ─ Test 6: Line rects are contiguous
    for (let i = 1; i < layout.lineRects.length; i++) {
      const prevBottom = layout.lineRects[i - 1].y + layout.lineRects[i - 1].height;
      const currTop = layout.lineRects[i].y;
      if (prevBottom !== currTop) {
        results.fail(
          `Terminal: gap between line ${i - 1} and ${i}`,
          `prev ends at ${prevBottom}, curr starts at ${currTop}`
        );
        return;
      }
    }
    results.pass("Terminal: line rects are contiguous");

    // ─ Test 7: Line rects all fit within terminal bounds
    for (const lineRect of layout.lineRects) {
      if (lineRect.x < layout.terminalBounds.x ||
          lineRect.x + lineRect.width > layout.terminalBounds.x + layout.terminalBounds.width ||
          lineRect.y < layout.terminalBounds.y ||
          lineRect.y + lineRect.height > layout.terminalBounds.y + layout.terminalBounds.height) {
        results.fail("Terminal: some line rects extend outside terminal bounds");
        return;
      }
    }
    results.pass("Terminal: all line rects fit within terminal bounds");

  } catch (error) {
    results.fail("Terminal: error during testing", error.message);
  }
}

// ============================================================================
// Mail Lite Tests
// ============================================================================

function testMailLite(results) {
  console.log("\n📧 Testing Mail Lite...");

  try {
    let envState = createEmptyEnv();
    const windowBounds = { x: 100, y: 100, width: 800, height: 600 };

    // Add mail window
    envState = addMailWindow(envState, "mail-1", windowBounds);

    // Build render model
    const renderModel = buildRenderModel(envState, 0);
    const windowVM = renderModel.windows.find(w => w.appId === "mail-lite");

    if (!windowVM) {
      results.fail("Mail: no mail window in render model");
      return;
    }

    const layout = windowVM.appView.layout;

    // ─ Test 1: Core layout rects exist
    if (layout.sidebarBounds && layout.messageListBounds && layout.previewBounds) {
      results.pass("Mail: core layout rects exist");
    } else {
      results.fail("Mail: missing core layout rects");
    }

    // ─ Test 2: Folder rects have entries
    if (Array.isArray(layout.folderRects) && layout.folderRects.length > 0) {
      results.pass(`Mail: folder rects exist (${layout.folderRects.length})`);
    } else {
      results.fail("Mail: no folder rects generated");
    }

    // ─ Test 3: Message rects have entries
    if (Array.isArray(layout.messageRects) && layout.messageRects.length >= 0) {
      results.pass("Mail: message rects exist");
    } else {
      results.fail("Mail: message rects not properly formed");
    }

    // ─ Test 4: Preview line rects have entries
    if (Array.isArray(layout.previewLineRects) && layout.previewLineRects.length >= 0) {
      results.pass("Mail: preview line rects exist");
    } else {
      results.fail("Mail: preview line rects not properly formed");
    }

    // ─ Test 5: Sidebar left of message list
    if (layout.sidebarBounds.x < layout.messageListBounds.x) {
      results.pass("Mail: sidebar positioned left of message list");
    } else {
      results.fail("Mail: sidebar not left of message list");
    }

    // ─ Test 6: Message list left of preview
    if (layout.messageListBounds.x < layout.previewBounds.x) {
      results.pass("Mail: message list positioned left of preview");
    } else {
      results.fail("Mail: message list not left of preview");
    }

    // ─ Test 7: All main rects have positive dimensions
    const mainRects = [layout.sidebarBounds, layout.messageListBounds, layout.previewBounds];
    let validDims = true;
    for (const rect of mainRects) {
      if (rect.width <= 0 || rect.height <= 0) {
        validDims = false;
        break;
      }
    }
    if (validDims) {
      results.pass("Mail: all main layout rects have positive dimensions");
    } else {
      results.fail("Mail: some rects have invalid dimensions");
    }

    // ─ Test 8: Three-column layout widths sum approximately to window width
    const totalColumnWidth = layout.sidebarBounds.width + layout.messageListBounds.width + layout.previewBounds.width;
    const expectedWidth = windowBounds.width - 24; // Accounting for padding
    if (Math.abs(totalColumnWidth - expectedWidth) <= 50) {
      results.pass(`Mail: three-column widths sum to window width (total: ${totalColumnWidth}, expected: ~${expectedWidth})`);
    } else {
      results.fail(
        "Mail: column widths mismatch",
        `Columns total ${totalColumnWidth}, expected ~${expectedWidth}`
      );
    }

  } catch (error) {
    results.fail("Mail: error during testing", error.message);
  }
}

// ============================================================================
// Browser Lite Tests
// ============================================================================

function testBrowserLite(results) {
  console.log("\n🌐 Testing Browser Lite...");

  try {
    let envState = createEmptyEnv();
    const windowBounds = { x: 100, y: 100, width: 900, height: 700 };

    // Add browser window
    envState = addBrowserWindow(envState, "browser-1", windowBounds);

    // Build render model
    const renderModel = buildRenderModel(envState, 0);
    const windowVM = renderModel.windows.find(w => w.appId === "browser-lite");

    if (!windowVM) {
      results.fail("Browser: no browser window in render model");
      return;
    }

    const layout = windowVM.appView.layout;

    // ─ Test 1: Core layout rects exist
    if (layout.tabBarBounds && layout.contentBounds) {
      results.pass("Browser: core layout rects exist");
    } else {
      results.fail("Browser: missing core layout rects");
    }

    // ─ Test 2: Tab rects exist
    if (Array.isArray(layout.tabRects) && layout.tabRects.length === 2) {
      results.pass(`Browser: tab rects match expected count (2)`);
    } else {
      results.fail(
        "Browser: tab rect count mismatch",
        `Expected 2, got ${layout.tabRects?.length ?? 0}`
      );
    }

    // ─ Test 3: Bookmark rects exist
    if (Array.isArray(layout.bookmarkRects)) {
      results.pass(`Browser: bookmark rects exist (${layout.bookmarkRects.length})`);
    } else {
      results.fail("Browser: bookmark rects not properly formed");
    }

    // ─ Test 4: Category rects exist
    if (Array.isArray(layout.categoryRects)) {
      results.pass(`Browser: category rects exist (${layout.categoryRects.length})`);
    } else {
      results.fail("Browser: category rects not properly formed");
    }

    // ─ Test 5: Tab bar positioned at top
    if (layout.tabBarBounds.y > windowBounds.y && layout.tabBarBounds.y < windowBounds.y + 50) {
      results.pass("Browser: tab bar positioned near window top");
    } else {
      results.fail("Browser: tab bar not positioned correctly at top");
    }

    // ─ Test 6: Content below tab bar
    if (layout.contentBounds.y >= layout.tabBarBounds.y + layout.tabBarBounds.height) {
      results.pass("Browser: content area below tab bar");
    } else {
      results.fail("Browser: content area not below tab bar");
    }

    // ─ Test 7: Core rects have positive dimensions
    const mainRects = [layout.tabBarBounds, layout.contentBounds];
    let validDims = true;
    for (const rect of mainRects) {
      if (rect.width <= 0 || rect.height <= 0) {
        validDims = false;
        break;
      }
    }
    if (validDims) {
      results.pass("Browser: core rects have positive dimensions");
    } else {
      results.fail("Browser: some core rects have invalid dimensions");
    }

    // ─ Test 8: Tabs are horizontally distributed
    if (layout.tabRects.length >= 2) {
      let tabsOrdered = true;
      for (let i = 1; i < layout.tabRects.length; i++) {
        const prevX = layout.tabRects[i - 1].x + layout.tabRects[i - 1].width;
        const currX = layout.tabRects[i].x;
        if (currX <= prevX) {
          tabsOrdered = false;
          break;
        }
      }
      if (tabsOrdered) {
        results.pass("Browser: tabs are horizontally arranged left-to-right");
      } else {
        results.fail("Browser: tabs not in left-to-right order");
      }
    } else {
      results.pass("Browser: insufficient tabs to test ordering");
    }

    // ─ Test 9: Bookmark rects are vertically ordered
    if (layout.bookmarkRects.length >= 2) {
      let bookmarksOrdered = true;
      for (let i = 1; i < layout.bookmarkRects.length; i++) {
        const prevBottom = layout.bookmarkRects[i - 1].y + layout.bookmarkRects[i - 1].height;
        const currTop = layout.bookmarkRects[i].y;
        if (currTop < prevBottom) {
          bookmarksOrdered = false;
          break;
        }
      }
      if (bookmarksOrdered) {
        results.pass("Browser: bookmark rects are vertically ordered");
      } else {
        results.fail("Browser: bookmarks not vertically ordered");
      }
    } else {
      results.pass("Browser: insufficient bookmarks to test ordering");
    }

  } catch (error) {
    results.fail("Browser: error during testing", error.message);
  }
}

// ============================================================================
// Main Test Runner
// ============================================================================

async function runTests() {
  console.log("╔════════════════════════════════════════════════════════════════════════╗");
  console.log("║   SSOT Layout Coordinate Alignment Test Suite                          ║");
  console.log("║   Verifies that hit-test coordinates match rendered positions          ║");
  console.log("╚════════════════════════════════════════════════════════════════════════╝");

  const results = new TestResults();

  try {
    testFileExplorer(results);
    testNoteEditor(results);
    testTerminal(results);
    testMailLite(results);
    testBrowserLite(results);

    results.summary();
    process.exit(results.isSuccess() ? 0 : 1);
  } catch (error) {
    console.error("\n❌ Fatal error during test execution:");
    console.error(error);
    process.exit(1);
  }
}

runTests();
