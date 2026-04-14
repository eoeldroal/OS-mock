/**
 * Sub-agent RL-style test harness for Mock OS.
 *
 * Each test scenario:
 *  1. Creates a MockOsEnv
 *  2. Resets with a task
 *  3. Executes a scripted sequence of Computer13Actions
 *  4. Checks step results (actionAccepted, reward, terminated, etc.)
 *  5. Reports bugs / limitations found
 *
 * Run: npx tsx scripts/manual/core/agent-test-harness.ts [suite]
 * Suites: drag, sidebar, window-mgmt, task-lifecycle, perturbation, text-editing, edge-cases, apps, all
 */

import { MockOsEnv } from "../../../packages/core/src/index.js";
import type { Computer13Action, StepResult, A11yNode } from "../../../packages/core/src/types.js";

/* ─── Helpers ─── */
type Finding = {
  severity: "BUG" | "LIMITATION" | "WARNING";
  suite: string;
  test: string;
  description: string;
  detail?: string;
};

const findings: Finding[] = [];

function report(f: Omit<Finding, "suite">, suite: string) {
  findings.push({ ...f, suite });
}

function findNode(tree: A11yNode[], predicate: (n: A11yNode) => boolean): A11yNode | undefined {
  for (const node of tree) {
    if (predicate(node)) return node;
    const child = findNode(node.children, predicate);
    if (child) return child;
  }
  return undefined;
}

function findAllNodes(tree: A11yNode[], predicate: (n: A11yNode) => boolean): A11yNode[] {
  const results: A11yNode[] = [];
  for (const node of tree) {
    if (predicate(node)) results.push(node);
    results.push(...findAllNodes(node.children, predicate));
  }
  return results;
}

function centerOf(bounds: { x: number; y: number; width: number; height: number }) {
  return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
}

/* ─── Test Suite: Drag ─── */
function testDrag(suiteName: string) {
  console.log(`\n=== Suite: ${suiteName} ===`);

  // Test 1: Basic window drag (use rename task — no popup)
  {
    const env = new MockOsEnv();
    env.reset({ taskId: "rename_note_in_explorer", seed: 0 });

    const hs0 = env.getHiddenState();
    const explorerWin = hs0.envState.windows.find((w) => w.id === "explorer-main");
    if (!explorerWin) {
      report({ severity: "BUG", test: "basic-drag", description: "No explorer-main window found" }, suiteName);
    } else {
      const origX = explorerWin.bounds.x;
      const titleBarX = explorerWin.bounds.x + explorerWin.bounds.width / 2;
      const titleBarY = explorerWin.bounds.y + 15;

      env.step({ type: "MOVE_TO", x: titleBarX, y: titleBarY });
      env.step({ type: "MOUSE_DOWN", button: "left" });

      // Verify dragState is set
      const hsAfterDown = env.getHiddenState();
      if (!hsAfterDown.envState.dragState) {
        report({ severity: "BUG", test: "basic-drag", description: "dragState not set after MOUSE_DOWN on title bar" }, suiteName);
      } else {
        env.step({ type: "DRAG_TO", x: titleBarX + 100, y: titleBarY });
        env.step({ type: "MOUSE_UP", button: "left" });

        const hs1 = env.getHiddenState();
        const movedWin = hs1.envState.windows.find((w) => w.id === "explorer-main");
        if (!movedWin || movedWin.bounds.x === origX) {
          report({ severity: "BUG", test: "basic-drag", description: `Window did not move. origX=${origX}, currentX=${movedWin?.bounds.x}` }, suiteName);
        } else {
          console.log(`  ✓ basic-drag: window moved from x=${origX} to x=${movedWin.bounds.x}`);
        }

        // Verify dragState cleared
        if (hs1.envState.dragState) {
          report({ severity: "BUG", test: "basic-drag-cleanup", description: "dragState not cleared after MOUSE_UP" }, suiteName);
        } else {
          console.log(`  ✓ basic-drag-cleanup: dragState cleared after MOUSE_UP`);
        }
      }
    }
  }

  // Test 2: Drag then click — interactions must still work
  {
    const env = new MockOsEnv();
    env.reset({ taskId: "rename_note_in_explorer", seed: 0 });

    const hs = env.getHiddenState();
    const win = hs.envState.windows.find((w) => w.id === "explorer-main")!;
    const tbX = win.bounds.x + win.bounds.width / 2;
    const tbY = win.bounds.y + 15;

    // Do a drag
    env.step({ type: "MOVE_TO", x: tbX, y: tbY });
    env.step({ type: "MOUSE_DOWN", button: "left" });
    env.step({ type: "DRAG_TO", x: tbX + 50, y: tbY });
    env.step({ type: "MOUSE_UP", button: "left" });

    // Now try clicking a taskbar icon
    const obs = env.observe();
    const dock = findNode(obs.observation.a11yTree, (n) => n.role === "menu" && n.name === "Ubuntu Dock");
    if (dock && dock.children.length > 0) {
      const icon = dock.children[0];
      const c = centerOf(icon.bounds);
      const clickResult = env.step({ type: "CLICK", x: c.x, y: c.y });
      if (clickResult.actionAccepted) {
        console.log(`  ✓ drag-then-click: taskbar click accepted after drag`);
      } else {
        report({ severity: "BUG", test: "drag-then-click", description: "Taskbar click rejected after drag" }, suiteName);
      }
    }
  }

  // Test 3: Multiple drag cycles (use task with high maxSteps)
  {
    const env = new MockOsEnv();
    env.reset({ taskId: "browser_capture_help_line", seed: 0 }); // maxSteps=128
    const hs = env.getHiddenState();
    const win = hs.envState.windows.find((w) => w.id === "explorer-main");
    if (!win) {
      report({ severity: "WARNING", test: "multi-drag", description: "No explorer window" }, suiteName);
    } else {
      let ok = true;
      let lastX = win.bounds.x;
      for (let i = 0; i < 3; i++) {
        // Use current position from hidden state
        const currentWin = env.getHiddenState().envState.windows.find((w) => w.id === "explorer-main")!;
        const tbX = currentWin.bounds.x + currentWin.bounds.width / 2;
        const tbY = currentWin.bounds.y + 15;

        env.step({ type: "MOVE_TO", x: tbX, y: tbY });
        env.step({ type: "MOUSE_DOWN", button: "left" });
        for (let j = 1; j <= 3; j++) {
          env.step({ type: "DRAG_TO", x: tbX + j * 10, y: tbY });
        }
        env.step({ type: "MOUSE_UP", button: "left" });

        const hsAfter = env.getHiddenState();
        if (hsAfter.envState.dragState) {
          report({
            severity: "BUG",
            test: "multi-drag",
            description: `dragState still set after MOUSE_UP on cycle ${i}`,
            detail: JSON.stringify(hsAfter.envState.dragState)
          }, suiteName);
          ok = false;
          break;
        }
        const movedWin = hsAfter.envState.windows.find((w) => w.id === "explorer-main")!;
        if (movedWin.bounds.x <= lastX) {
          report({ severity: "BUG", test: "multi-drag", description: `Window didn't move on cycle ${i}. lastX=${lastX}, currentX=${movedWin.bounds.x}` }, suiteName);
          ok = false;
          break;
        }
        lastX = movedWin.bounds.x;
      }
      if (ok) console.log(`  ✓ multi-drag: 3 drag cycles OK, window moved progressively`);
    }
  }

  // Test 4: Drag maximized window (should be no-op)
  {
    const env = new MockOsEnv();
    env.reset({ taskId: "rename_note_in_explorer", seed: 0 });
    const hs = env.getHiddenState();
    const win = hs.envState.windows.find((w) => w.id === "explorer-main")!;

    // Maximize button click
    const maxBtnX = win.bounds.x + 58 + 6;
    const maxBtnY = win.bounds.y + 14 + 6;
    env.step({ type: "CLICK", x: maxBtnX, y: maxBtnY });

    const hsMax = env.getHiddenState();
    const maxWin = hsMax.envState.windows.find((w) => w.id === "explorer-main");
    if (maxWin?.maximized) {
      // Try to drag
      const tbX = maxWin.bounds.x + maxWin.bounds.width / 2;
      const tbY = maxWin.bounds.y + 15;
      env.step({ type: "MOVE_TO", x: tbX, y: tbY });
      env.step({ type: "MOUSE_DOWN", button: "left" });
      env.step({ type: "DRAG_TO", x: tbX + 100, y: tbY });
      env.step({ type: "MOUSE_UP", button: "left" });

      const hsFinal = env.getHiddenState();
      const w = hsFinal.envState.windows.find((w) => w.id === "explorer-main");
      if (w?.maximized) {
        console.log(`  ✓ drag-maximized: maximized window correctly not dragged`);
      } else {
        report({ severity: "WARNING", test: "drag-maximized", description: "Drag un-maximized the window" }, suiteName);
      }
    } else {
      report({ severity: "WARNING", test: "drag-maximized", description: "Maximize button click didn't maximize" }, suiteName);
    }
  }

  // Test 5: Popup blocks drag
  {
    const env = new MockOsEnv();
    env.reset({ taskId: "dismiss_popup_then_append_note", seed: 0 });
    const hs = env.getHiddenState();
    if (hs.envState.popups.length === 0) {
      report({ severity: "WARNING", test: "popup-blocks-drag", description: "No popup in task" }, suiteName);
    } else {
      const win = hs.envState.windows.find((w) => !w.minimized);
      if (win) {
        const tbX = win.bounds.x + win.bounds.width / 2;
        const tbY = win.bounds.y + 15;
        env.step({ type: "MOVE_TO", x: tbX, y: tbY });
        env.step({ type: "MOUSE_DOWN", button: "left" });
        const hsDown = env.getHiddenState();
        if (!hsDown.envState.dragState) {
          console.log(`  ✓ popup-blocks-drag: popup correctly prevents drag initiation`);
        } else {
          report({ severity: "BUG", test: "popup-blocks-drag", description: "Drag started despite active popup" }, suiteName);
        }
        env.step({ type: "MOUSE_UP", button: "left" });
      }
    }
  }
}

/* ─── Test Suite: Sidebar ─── */
function testSidebar(suiteName: string) {
  console.log(`\n=== Suite: ${suiteName} ===`);

  const env = new MockOsEnv();
  env.reset({ taskId: "rename_note_in_explorer", seed: 0 });

  const hs = env.getHiddenState();
  const explorerWin = hs.envState.windows.find((w) => w.id === "explorer-main");
  if (!explorerWin) {
    report({ severity: "BUG", test: "sidebar-setup", description: "No explorer-main window found" }, suiteName);
    return;
  }

  // Get layout directly from the layout function to use exact hit regions
  // HEADER_HEIGHT=40, sidebar starts at bounds.y + 40 + 16 + 46
  const HEADER_HEIGHT = 40;
  const SIDEBAR_MARGIN_TOP = 16;
  const SIDEBAR_TOP_OFFSET = 46;
  const SIDEBAR_ITEM_HEIGHT = 38;
  const SIDEBAR_ITEM_GAP = 6;

  const sidebarItems = ["Home", "Desktop", "Documents", "Downloads", "workspace"];
  const sidebarX = explorerWin.bounds.x + 14 + 40; // center of sidebar item
  const sidebarBaseY = explorerWin.bounds.y + HEADER_HEIGHT + SIDEBAR_MARGIN_TOP + SIDEBAR_TOP_OFFSET;

  for (let i = 0; i < sidebarItems.length; i++) {
    const itemCenterY = sidebarBaseY + i * (SIDEBAR_ITEM_HEIGHT + SIDEBAR_ITEM_GAP) + SIDEBAR_ITEM_HEIGHT / 2;
    const r = env.step({ type: "CLICK", x: sidebarX, y: itemCenterY });
    const hsAfter = env.getHiddenState();
    const explorer = hsAfter.envState.appStates.fileExplorer["explorer-main"];
    if (explorer?.currentPlace === sidebarItems[i]) {
      console.log(`  ✓ sidebar-${sidebarItems[i]}: click at y=${Math.round(itemCenterY)} → currentPlace="${sidebarItems[i]}"`);
    } else {
      report({
        severity: "BUG",
        test: `sidebar-${sidebarItems[i]}`,
        description: `Sidebar click at y=${Math.round(itemCenterY)} did not set currentPlace to "${sidebarItems[i]}"`,
        detail: `currentPlace="${explorer?.currentPlace}", accepted=${r.actionAccepted}`
      }, suiteName);
    }
  }
}

/* ─── Test Suite: Window Management ─── */
function testWindowManagement(suiteName: string) {
  console.log(`\n=== Suite: ${suiteName} ===`);

  // Test 1: Close button
  {
    const env = new MockOsEnv();
    env.reset({ taskId: "rename_note_in_explorer", seed: 0 });
    const hs = env.getHiddenState();
    const win = hs.envState.windows.find((w) => w.id === "explorer-main")!;
    const initialWindows = hs.envState.windows.length;

    // Close button at (bounds.x + 18 + 6, bounds.y + 14 + 6)
    const closeX = win.bounds.x + 18 + 6;
    const closeY = win.bounds.y + 14 + 6;
    env.step({ type: "CLICK", x: closeX, y: closeY });
    const afterWindows = env.getHiddenState().envState.windows.length;
    if (afterWindows < initialWindows) {
      console.log(`  ✓ close-button: window closed (${initialWindows} → ${afterWindows})`);
    } else {
      report({ severity: "BUG", test: "close-button", description: `Window not closed.` }, suiteName);
    }
  }

  // Test 2: Minimize button
  {
    const env = new MockOsEnv();
    env.reset({ taskId: "rename_note_in_explorer", seed: 0 });
    const hs = env.getHiddenState();
    const win = hs.envState.windows.find((w) => w.id === "explorer-main")!;

    const minX = win.bounds.x + 38 + 6;
    const minY = win.bounds.y + 14 + 6;
    env.step({ type: "CLICK", x: minX, y: minY });
    const minWin = env.getHiddenState().envState.windows.find((w) => w.id === "explorer-main");
    if (minWin?.minimized) {
      console.log(`  ✓ minimize-button: window minimized`);
    } else {
      report({ severity: "BUG", test: "minimize-button", description: "Not minimized after click" }, suiteName);
    }
  }

  // Test 3: Maximize button click
  {
    const env = new MockOsEnv();
    env.reset({ taskId: "rename_note_in_explorer", seed: 0 });
    const hs = env.getHiddenState();
    const win = hs.envState.windows.find((w) => w.id === "explorer-main")!;

    const maxX = win.bounds.x + 58 + 6;
    const maxY = win.bounds.y + 14 + 6;
    env.step({ type: "CLICK", x: maxX, y: maxY });
    const maxWin = env.getHiddenState().envState.windows.find((w) => w.id === "explorer-main");
    if (maxWin?.maximized) {
      console.log(`  ✓ maximize-button: window maximized`);
    } else {
      report({ severity: "BUG", test: "maximize-button", description: "Not maximized after click" }, suiteName);
    }
  }

  // Test 4: Double-click title bar to maximize
  {
    const env = new MockOsEnv();
    env.reset({ taskId: "rename_note_in_explorer", seed: 0 });
    const hs = env.getHiddenState();
    const win = hs.envState.windows.find((w) => w.id === "explorer-main")!;

    // Double-click on title bar center (avoid control buttons on the left)
    const tbX = win.bounds.x + win.bounds.width / 2;
    const tbY = win.bounds.y + 15;
    env.step({ type: "DOUBLE_CLICK", x: tbX, y: tbY });
    const maxWin = env.getHiddenState().envState.windows.find((w) => w.id === "explorer-main");
    if (maxWin?.maximized) {
      console.log(`  ✓ maximize-double-click: title bar double-click maximized window`);
    } else {
      report({ severity: "WARNING", test: "maximize-double-click", description: "Double-click on title bar did not maximize" }, suiteName);
    }
  }

  // Test 5: Taskbar restore from minimized
  {
    const env = new MockOsEnv();
    env.reset({ taskId: "minimize_recover_and_save", seed: 0 });
    const obs = env.observe();
    const dock = findNode(obs.observation.a11yTree, (n) => n.role === "menu" && n.name === "Ubuntu Dock");
    if (dock && dock.children.length > 0) {
      const icon = dock.children[0];
      const c = centerOf(icon.bounds);
      env.step({ type: "CLICK", x: c.x, y: c.y });
      const hs = env.getHiddenState();
      const restored = hs.envState.windows.filter((w) => !w.minimized && w.focused);
      if (restored.length > 0) {
        console.log(`  ✓ taskbar-restore: window restored from minimized via taskbar`);
      } else {
        report({ severity: "BUG", test: "taskbar-restore", description: "Taskbar click didn't restore" }, suiteName);
      }
    }
  }

  // Test 6: Focus switching between windows
  {
    const env = new MockOsEnv();
    env.reset({ taskId: "copy_line_between_windows", seed: 0 });
    const hs = env.getHiddenState();
    const visibleWindows = hs.envState.windows.filter((w) => !w.minimized);
    if (visibleWindows.length >= 2) {
      const w1 = visibleWindows[0];
      const w2 = visibleWindows[1];

      const c2 = { x: w2.bounds.x + w2.bounds.width / 2, y: w2.bounds.y + w2.bounds.height / 2 };
      env.step({ type: "CLICK", x: c2.x, y: c2.y });
      const w2Focused = env.getHiddenState().envState.windows.find((w) => w.id === w2.id)?.focused;

      const c1 = { x: w1.bounds.x + w1.bounds.width / 2, y: w1.bounds.y + w1.bounds.height / 2 };
      env.step({ type: "CLICK", x: c1.x, y: c1.y });
      const hs2 = env.getHiddenState();
      const w1Focused = hs2.envState.windows.find((w) => w.id === w1.id)?.focused;
      const w2Unfocused = !hs2.envState.windows.find((w) => w.id === w2.id)?.focused;

      if (w2Focused && w1Focused && w2Unfocused) {
        console.log(`  ✓ focus-switch: focus correctly switches between windows`);
      } else {
        report({ severity: "BUG", test: "focus-switch", description: "Focus not switching correctly" }, suiteName);
      }
    }
  }
}

/* ─── Test Suite: Task Lifecycle ─── */
function testTaskLifecycle(suiteName: string) {
  console.log(`\n=== Suite: ${suiteName} ===`);

  const env = new MockOsEnv();
  const allTasks = env.listTasks("all");
  console.log(`  Found ${allTasks.length} tasks total`);

  // Test 1: Every task can be reset without error
  for (const task of allTasks) {
    for (const seed of task.seedDefaults) {
      try {
        env.reset({ taskId: task.id, seed });
        const obs = env.observe();
        if (!obs.observation.a11yTree || obs.observation.a11yTree.length === 0) {
          report({ severity: "BUG", test: `reset-${task.id}-s${seed}`, description: "Empty a11y tree after reset" }, suiteName);
        }
      } catch (err) {
        report({ severity: "BUG", test: `reset-${task.id}-s${seed}`, description: `Reset error: ${(err as Error).message}` }, suiteName);
      }
    }
  }
  console.log(`  ✓ all-tasks-reset: ${allTasks.length} tasks × seeds OK`);

  // Test 2: DONE without completing goal gives negative reward
  {
    const env2 = new MockOsEnv();
    env2.reset({ taskId: allTasks[0].id, seed: 0 });
    const r = env2.step({ type: "DONE" });
    if (r.reward < 0) {
      console.log(`  ✓ premature-done: correctly penalizes (reward=${r.reward})`);
    } else {
      report({ severity: "WARNING", test: "premature-done", description: `reward=${r.reward}` }, suiteName);
    }
  }

  // Test 3: FAIL gives negative reward
  {
    const env3 = new MockOsEnv();
    env3.reset({ taskId: allTasks[0].id, seed: 0 });
    const r = env3.step({ type: "FAIL" });
    if (r.reward < 0) {
      console.log(`  ✓ fail-action: correctly penalizes (reward=${r.reward})`);
    } else {
      report({ severity: "WARNING", test: "fail-reward", description: `reward=${r.reward}` }, suiteName);
    }
  }

  // Test 4: Post-termination steps rejected
  {
    const env4 = new MockOsEnv();
    env4.reset({ taskId: allTasks[0].id, seed: 0 });
    env4.step({ type: "DONE" });
    const r = env4.step({ type: "CLICK", x: 100, y: 100 });
    if (!r.actionAccepted) {
      console.log(`  ✓ post-termination: actions correctly rejected`);
    } else {
      report({ severity: "BUG", test: "post-termination", description: "Actions accepted after DONE" }, suiteName);
    }
  }

  // Test 5: Truncation at maxSteps
  {
    const env5 = new MockOsEnv();
    const task = allTasks.find((t) => t.maxSteps <= 30) ?? allTasks[0];
    env5.reset({ taskId: task.id, seed: 0 });
    let lastResult: StepResult | null = null;
    for (let i = 0; i < task.maxSteps + 5; i++) {
      lastResult = env5.step({ type: "WAIT" });
      if (lastResult.truncated || lastResult.terminated) break;
    }
    if (lastResult?.truncated) {
      console.log(`  ✓ truncation: correctly truncated at maxSteps=${task.maxSteps}`);
    } else {
      report({ severity: "BUG", test: "truncation", description: `Not truncated` }, suiteName);
    }
  }

  // Test 6: Snapshot/restore
  {
    const env6 = new MockOsEnv();
    env6.reset({ taskId: allTasks[0].id, seed: 0 });
    env6.step({ type: "CLICK", x: 200, y: 200 });
    const snapId = env6.snapshot("test");
    env6.step({ type: "CLICK", x: 300, y: 300 });
    const stateAfter = JSON.stringify(env6.getHiddenState().envState);
    env6.restore(snapId);
    const stateRestored = JSON.stringify(env6.getHiddenState().envState);
    if (stateAfter !== stateRestored) {
      console.log(`  ✓ snapshot-restore: state correctly restored`);
    } else {
      report({ severity: "BUG", test: "snapshot-restore", description: "State unchanged after restore" }, suiteName);
    }
  }
}

/* ─── Test Suite: Perturbations ─── */
function testPerturbations(suiteName: string) {
  console.log(`\n=== Suite: ${suiteName} ===`);

  const perturbations = ["PopupInject", "MinimizeAll", "RandomPointerSpawn", "WindowClose", "ZOrderShuffle"];

  for (const op of perturbations) {
    const env = new MockOsEnv();
    env.reset({ taskId: "rename_note_in_explorer", seed: 0 });
    try {
      const before = JSON.stringify(env.getHiddenState().envState);
      env.applyPerturbation(op);
      const after = JSON.stringify(env.getHiddenState().envState);
      if (before === after) {
        report({ severity: "WARNING", test: `perturbation-${op}`, description: `No effect` }, suiteName);
      } else {
        console.log(`  ✓ perturbation-${op}: applied`);
      }
    } catch (err) {
      report({ severity: "BUG", test: `perturbation-${op}`, description: `Error: ${(err as Error).message}` }, suiteName);
    }
  }

  // Popup blocks window interaction
  {
    const env = new MockOsEnv();
    env.reset({ taskId: "rename_note_in_explorer", seed: 0 });
    env.applyPerturbation("PopupInject");
    const hs = env.getHiddenState();
    const win = hs.envState.windows.find((w) => !w.minimized);
    if (win && hs.envState.popups.length > 0) {
      const c = { x: win.bounds.x + 50, y: win.bounds.y + 50 };
      const r = env.step({ type: "CLICK", x: c.x, y: c.y });
      console.log(`  ✓ popup-blocks: window click while popup → ${r.info.actionSummary}`);
    }
  }

  // WindowClose + continue
  {
    const env = new MockOsEnv();
    env.reset({ taskId: "copy_line_between_windows", seed: 0 });
    const before = env.getHiddenState().envState.windows.length;
    env.applyPerturbation("WindowClose");
    const after = env.getHiddenState().envState.windows.length;
    if (after < before) {
      const r = env.step({ type: "WAIT" });
      console.log(`  ✓ WindowClose-recovery: ${before}→${after} windows, WAIT accepted=${r.actionAccepted}`);
    }
  }
}

/* ─── Test Suite: Text Editing ─── */
function testTextEditing(suiteName: string) {
  console.log(`\n=== Suite: ${suiteName} ===`);

  // Test 1: Type + Backspace
  {
    const env = new MockOsEnv();
    env.reset({ taskId: "dismiss_popup_then_append_note", seed: 0 });

    // Dismiss popup
    const hs0 = env.getHiddenState();
    if (hs0.envState.popups.length > 0) {
      const obs = env.observe();
      const popup = findNode(obs.observation.a11yTree, (n) => n.role === "dialog");
      if (popup) {
        const btn = findNode(popup.children, (n) => n.role === "button");
        if (btn) env.step({ type: "CLICK", ...centerOf(btn.bounds) });
      }
    }

    // Open todo.txt via double-click
    const obs2 = env.observe();
    const fileItems = findAllNodes(obs2.observation.a11yTree, (n) => n.role === "listitem" && n.name.includes("todo"));
    if (fileItems.length > 0) {
      env.step({ type: "DOUBLE_CLICK", ...centerOf(fileItems[0].bounds) });
    }

    // Type and backspace
    const hs1 = env.getHiddenState();
    const noteIds = Object.keys(hs1.envState.appStates.noteEditor);
    if (noteIds.length > 0) {
      env.step({ type: "TYPING", text: "hello" });
      env.step({ type: "PRESS", key: "Backspace" });
      const hs2 = env.getHiddenState();
      const anyContainsHell = Object.values(hs2.envState.appStates.noteEditor).some((n) => n.buffer.includes("hell") && !n.buffer.includes("hello"));
      if (anyContainsHell) {
        console.log(`  ✓ type-backspace: typing and backspace work`);
      } else {
        report({ severity: "BUG", test: "type-backspace", description: "Unexpected buffer content" }, suiteName);
      }
    } else {
      report({ severity: "WARNING", test: "type-backspace", description: "No note editor opened" }, suiteName);
    }
  }

  // Test 2: Copy-paste
  {
    const env = new MockOsEnv();
    env.reset({ taskId: "copy_line_between_windows", seed: 0 });
    const hs = env.getHiddenState();
    const noteWins = hs.envState.windows.filter((w) => w.appId === "note-editor" && !w.minimized);
    if (noteWins.length >= 2) {
      const src = noteWins[0];
      env.step({ type: "CLICK", x: src.bounds.x + 50, y: src.bounds.y + 50 });
      env.step({ type: "HOTKEY", keys: ["ctrl", "c"] });
      const clipText = env.getHiddenState().envState.clipboard.text;

      if (clipText) {
        const tgt = noteWins[1];
        env.step({ type: "CLICK", x: tgt.bounds.x + 50, y: tgt.bounds.y + 50 });
        env.step({ type: "HOTKEY", keys: ["ctrl", "v"] });
        const tgtNote = env.getHiddenState().envState.appStates.noteEditor[tgt.id];
        if (tgtNote.buffer.includes(clipText)) {
          console.log(`  ✓ copy-paste: "${clipText}" pasted OK`);
        } else {
          report({ severity: "BUG", test: "copy-paste", description: `Paste failed` }, suiteName);
        }
      } else {
        report({ severity: "WARNING", test: "copy-paste", description: "Clipboard empty after Ctrl+C" }, suiteName);
      }
    }
  }

  // Test 3: Ctrl+S
  {
    const env = new MockOsEnv();
    env.reset({ taskId: "copy_line_between_windows", seed: 0 });
    const hs = env.getHiddenState();
    const noteWin = hs.envState.windows.find((w) => w.appId === "note-editor" && !w.minimized);
    if (noteWin) {
      env.step({ type: "CLICK", x: noteWin.bounds.x + 50, y: noteWin.bounds.y + 50 });
      env.step({ type: "TYPING", text: "test" });
      env.step({ type: "HOTKEY", keys: ["ctrl", "s"] });
      const note = env.getHiddenState().envState.appStates.noteEditor[noteWin.id];
      if (!note.dirty) {
        console.log(`  ✓ ctrl-s: saved (dirty=false)`);
      } else {
        report({ severity: "BUG", test: "ctrl-s", description: "Still dirty after Ctrl+S" }, suiteName);
      }
    }
  }

  // Test 4: Rename via F2
  {
    const env = new MockOsEnv();
    env.reset({ taskId: "rename_note_in_explorer", seed: 0 });
    const hs = env.getHiddenState();
    const explorer = hs.envState.appStates.fileExplorer["explorer-main"];
    const draftFile = Object.values(hs.envState.fileSystem.files).find((f) => f.name === "draft.txt");
    if (draftFile) {
      // Click on file to select it (use a11y tree)
      const obs = env.observe();
      const fileItem = findNode(obs.observation.a11yTree, (n) => n.role === "listitem" && n.name === "draft.txt");
      if (fileItem) {
        env.step({ type: "CLICK", ...centerOf(fileItem.bounds) });
        env.step({ type: "PRESS", key: "F2" });
        env.step({ type: "TYPING", text: "final.txt" });
        env.step({ type: "PRESS", key: "Enter" });
        const renamed = Object.values(env.getHiddenState().envState.fileSystem.files).find((f) => f.name === "final.txt");
        if (renamed) {
          console.log(`  ✓ rename-f2: renamed to "final.txt"`);
        } else {
          report({ severity: "BUG", test: "rename-f2", description: "Rename failed" }, suiteName);
        }
      }
    }
  }
}

/* ─── Test Suite: Edge Cases ─── */
function testEdgeCases(suiteName: string) {
  console.log(`\n=== Suite: ${suiteName} ===`);

  // Click outside all windows
  {
    const env = new MockOsEnv();
    env.reset({ taskId: "rename_note_in_explorer", seed: 0 });
    const r = env.step({ type: "CLICK", x: 1200, y: 700 });
    console.log(`  ✓ click-outside: accepted=${r.actionAccepted}, summary=${r.info.actionSummary}`);
  }

  // Negative coords clamped
  {
    const env = new MockOsEnv();
    env.reset({ taskId: "rename_note_in_explorer", seed: 0 });
    env.step({ type: "CLICK", x: -100, y: -100 });
    const hs = env.getHiddenState();
    if (hs.envState.pointer.x >= 0 && hs.envState.pointer.y >= 0) {
      console.log(`  ✓ negative-coords: clamped to (${hs.envState.pointer.x}, ${hs.envState.pointer.y})`);
    } else {
      report({ severity: "BUG", test: "negative-coords", description: `Pointer at (${hs.envState.pointer.x}, ${hs.envState.pointer.y})` }, suiteName);
    }
  }

  // Out of bounds
  {
    const env = new MockOsEnv();
    env.reset({ taskId: "rename_note_in_explorer", seed: 0 });
    env.step({ type: "MOVE_TO", x: 99999, y: 99999 });
    const hs = env.getHiddenState();
    if (hs.envState.pointer.x <= hs.envState.viewport.width && hs.envState.pointer.y <= hs.envState.viewport.height) {
      console.log(`  ✓ out-of-bounds: clamped to (${hs.envState.pointer.x}, ${hs.envState.pointer.y})`);
    } else {
      report({ severity: "BUG", test: "out-of-bounds", description: `Pointer exceeds viewport` }, suiteName);
    }
  }

  // Terminal unknown command
  {
    const env = new MockOsEnv();
    env.reset({ taskId: "terminal_record_working_directory", seed: 0 });
    const hs = env.getHiddenState();
    const termWin = hs.envState.windows.find((w) => w.appId === "terminal-lite" && !w.minimized);
    if (termWin) {
      env.step({ type: "CLICK", x: termWin.bounds.x + 50, y: termWin.bounds.y + termWin.bounds.height - 20 });
      env.step({ type: "TYPING", text: "unknown_cmd" });
      env.step({ type: "PRESS", key: "Enter" });
      const term = env.getHiddenState().envState.appStates.terminalLite[termWin.id];
      if (term?.lastOutput?.includes("command not found")) {
        console.log(`  ✓ terminal-unknown-cmd: "command not found"`);
      } else {
        report({ severity: "WARNING", test: "terminal-unknown-cmd", description: `Output: "${term?.lastOutput}"` }, suiteName);
      }
    }
  }

  // RIGHT_CLICK on file should select + enter rename mode
  {
    const env = new MockOsEnv();
    env.reset({ taskId: "rename_note_in_explorer", seed: 0 });
    // Find a file in the explorer — use hidden state to get the file explorer window
    const hs = env.getHiddenState();
    const explorerWin = hs.envState.windows.find((w) => w.appId === "file-explorer");
    if (explorerWin) {
      // File rows start at roughly bounds.y + 40(header) + 16(margin) + 46(offset) + 32(headerLabel) = bounds.y+134
      const fileY = explorerWin.bounds.y + 134 + 16; // center of first file row
      const fileX = explorerWin.bounds.x + 176 + 100; // past sidebar into content area
      const r = env.step({ type: "RIGHT_CLICK", x: fileX, y: fileY });
      const hs2 = env.getHiddenState();
      const explorer = hs2.envState.appStates.fileExplorer[explorerWin.id];
      if (r.actionAccepted && explorer?.renameMode) {
        console.log(`  ✓ right-click-rename: RIGHT_CLICK on file enters rename mode (file=${explorer.renameMode.fileId})`);
      } else {
        report({ severity: "BUG", test: "right-click-rename", description: `RIGHT_CLICK on file did not enter rename mode. accepted=${r.actionAccepted}, renameMode=${JSON.stringify(explorer?.renameMode)}` }, suiteName);
      }
    } else {
      report({ severity: "BUG", test: "right-click-rename", description: "No file explorer window found" }, suiteName);
    }
  }

  // SCROLL in note editor should move selectedLineIndex
  {
    const env = new MockOsEnv();
    env.reset({ taskId: "rename_note_in_explorer", seed: 0 });
    // Focus the note editor if one exists, or check file explorer scroll
    const hs = env.getHiddenState();
    const explorerWin = hs.envState.windows.find((w) => w.appId === "file-explorer");
    if (explorerWin) {
      // First, select a file by clicking
      const fileY = explorerWin.bounds.y + 134 + 16;
      const fileX = explorerWin.bounds.x + 176 + 100;
      env.step({ type: "CLICK", x: fileX, y: fileY });
      const hs1 = env.getHiddenState();
      const selectedBefore = hs1.envState.appStates.fileExplorer[explorerWin.id]?.selectedFileId;

      // Scroll down
      const r = env.step({ type: "SCROLL", dx: 0, dy: 3 });
      const hs2 = env.getHiddenState();
      const selectedAfter = hs2.envState.appStates.fileExplorer[explorerWin.id]?.selectedFileId;

      if (r.actionAccepted && selectedAfter && selectedAfter !== selectedBefore) {
        console.log(`  ✓ scroll-file-explorer: SCROLL changes file selection (${selectedBefore} → ${selectedAfter})`);
      } else if (hs1.envState.fileSystem.order.length <= 1) {
        console.log(`  ✓ scroll-file-explorer: only 1 file, scroll correctly has no selection change`);
      } else {
        report({ severity: "BUG", test: "scroll-file-explorer", description: `SCROLL did not change file selection. before=${selectedBefore}, after=${selectedAfter}` }, suiteName);
      }
    }
  }

  // SCROLL in browser help page should move selectedHelpLineIndex
  {
    const env = new MockOsEnv();
    env.reset({ taskId: "browser_capture_help_line", seed: 0 });
    const hs = env.getHiddenState();
    const browserWin = hs.envState.windows.find((w) => w.appId === "browser-lite");
    if (browserWin) {
      const browser = hs.envState.appStates.browserLite[browserWin.id];
      // Navigate to help page by clicking second tab
      const tabX = browserWin.bounds.x + 12 + 122 + 57; // second tab center
      const tabY = browserWin.bounds.y + 32 + 6 + 15;
      env.step({ type: "CLICK", x: tabX, y: tabY });

      const hsBefore = env.getHiddenState();
      const browserBefore = hsBefore.envState.appStates.browserLite[browserWin.id];
      const idxBefore = browserBefore.selectedHelpLineIndex;

      // Scroll down
      env.step({ type: "SCROLL", dx: 0, dy: 3 });
      const hsAfter = env.getHiddenState();
      const browserAfter = hsAfter.envState.appStates.browserLite[browserWin.id];
      const idxAfter = browserAfter.selectedHelpLineIndex;

      if (browserAfter.currentPage === "help" && idxAfter !== undefined && (idxBefore === undefined || idxAfter !== idxBefore)) {
        console.log(`  ✓ scroll-browser-help: SCROLL moves help line selection (${idxBefore} → ${idxAfter})`);
      } else if (browserAfter.helpLines.length === 0) {
        console.log(`  ✓ scroll-browser-help: no help lines available, scroll accepted`);
      } else {
        report({ severity: "BUG", test: "scroll-browser-help", description: `SCROLL did not change help line index. page=${browserAfter.currentPage}, before=${idxBefore}, after=${idxAfter}` }, suiteName);
      }
    }
  }

  // A11y tree: check for negative-width bounds
  {
    const env = new MockOsEnv();
    env.reset({ taskId: "rename_note_in_explorer", seed: 0 });
    const obs = env.observe();
    const allNodes = findAllNodes(obs.observation.a11yTree, () => true);
    const badBounds = allNodes.filter((n) => n.visible && (n.bounds.width < 0 || n.bounds.height < 0));
    if (badBounds.length > 0) {
      report({
        severity: "BUG",
        test: "a11y-negative-bounds",
        description: `${badBounds.length} visible nodes have negative bounds`,
        detail: badBounds.map((n) => `${n.id}(${n.role}): ${n.bounds.width}x${n.bounds.height}`).join(", ")
      }, suiteName);
    } else {
      console.log(`  ✓ a11y-bounds: no negative-size bounds in ${allNodes.filter((n) => n.visible).length} visible nodes`);
    }
  }

  // Empty TYPING
  {
    const env = new MockOsEnv();
    env.reset({ taskId: "copy_line_between_windows", seed: 0 });
    const r = env.step({ type: "TYPING", text: "" });
    console.log(`  ✓ empty-typing: accepted=${r.actionAccepted}`);
  }
}

/* ─── Test Suite: App-Specific ─── */
function testApps(suiteName: string) {
  console.log(`\n=== Suite: ${suiteName} ===`);

  // Browser tabs
  {
    const env = new MockOsEnv();
    env.reset({ taskId: "browser_log_workflow_task_id", seed: 0 });
    const browser = Object.values(env.getHiddenState().envState.appStates.browserLite)[0];
    if (browser) {
      console.log(`  ✓ browser-setup: page="${browser.currentPage}", categories=${browser.categories.length}`);
    }
  }

  // Mail
  {
    const env = new MockOsEnv();
    env.reset({ taskId: "mail_extract_mock_note", seed: 0 });
    const mail = Object.values(env.getHiddenState().envState.appStates.mailLite)[0];
    if (mail) {
      console.log(`  ✓ mail-setup: folders=${mail.folders.length}, selected="${mail.selectedFolder}"`);
    }
  }

  // Terminal commands
  {
    const env = new MockOsEnv();
    env.reset({ taskId: "terminal_record_working_directory", seed: 0 });
    const hs = env.getHiddenState();
    const termWin = hs.envState.windows.find((w) => w.appId === "terminal-lite" && !w.minimized);
    if (termWin) {
      const c = { x: termWin.bounds.x + termWin.bounds.width / 2, y: termWin.bounds.y + termWin.bounds.height - 20 };
      env.step({ type: "CLICK", x: c.x, y: c.y });

      for (const cmd of ["pwd", "ls"]) {
        env.step({ type: "TYPING", text: cmd });
        env.step({ type: "PRESS", key: "Enter" });
        const term = env.getHiddenState().envState.appStates.terminalLite[termWin.id];
        console.log(`  ✓ terminal-${cmd}: output="${term?.lastOutput?.slice(0, 50)}"`);
      }
    }
  }

  // End-to-end: Complete rename task
  {
    const env = new MockOsEnv();
    env.reset({ taskId: "rename_note_in_explorer", seed: 0 });
    const obs = env.observe();
    const draftItem = findNode(obs.observation.a11yTree, (n) => n.role === "listitem" && n.name === "draft.txt");
    if (draftItem) {
      env.step({ type: "CLICK", ...centerOf(draftItem.bounds) });
      env.step({ type: "PRESS", key: "F2" });
      env.step({ type: "TYPING", text: "final.txt" });
      env.step({ type: "PRESS", key: "Enter" });
      const r = env.step({ type: "DONE" });
      if (r.reward > 0) {
        console.log(`  ✓ e2e-rename: task completed, reward=${r.reward}, cumulative=${r.cumulativeReward}`);
      } else {
        report({ severity: "WARNING", test: "e2e-rename", description: `Low reward=${r.reward}` }, suiteName);
      }
    }
  }
}

/* ─── Main Runner ─── */
const suite = process.argv[2] ?? "all";
const suites: Record<string, (name: string) => void> = {
  drag: testDrag,
  sidebar: testSidebar,
  "window-mgmt": testWindowManagement,
  "task-lifecycle": testTaskLifecycle,
  perturbation: testPerturbations,
  "text-editing": testTextEditing,
  "edge-cases": testEdgeCases,
  apps: testApps,
};

console.log("╔════════════════════════════════════════╗");
console.log("║  Mock OS RL Agent Test Harness v2.0    ║");
console.log("╚════════════════════════════════════════╝");

const toRun = suite === "all" ? Object.entries(suites) : [[suite, suites[suite]]];

for (const [name, fn] of toRun) {
  if (!fn) { console.error(`Unknown suite: ${name}`); continue; }
  try {
    (fn as (name: string) => void)(name as string);
  } catch (err) {
    console.error(`Suite "${name}" crashed:`, err);
    findings.push({ severity: "BUG", suite: name as string, test: "suite-crash", description: `Crashed: ${(err as Error).message}` });
  }
}

console.log("\n╔════════════════════════════════════════╗");
console.log("║  FINDINGS SUMMARY                      ║");
console.log("╚════════════════════════════════════════╝");

const bugs = findings.filter((f) => f.severity === "BUG");
const limitations = findings.filter((f) => f.severity === "LIMITATION");
const warnings = findings.filter((f) => f.severity === "WARNING");

if (bugs.length > 0) {
  console.log(`\n🔴 BUGS (${bugs.length}):`);
  bugs.forEach((f) => console.log(`  [${f.suite}/${f.test}] ${f.description}${f.detail ? `\n    Detail: ${f.detail}` : ""}`));
}
if (limitations.length > 0) {
  console.log(`\n🟡 LIMITATIONS (${limitations.length}):`);
  limitations.forEach((f) => console.log(`  [${f.suite}/${f.test}] ${f.description}`));
}
if (warnings.length > 0) {
  console.log(`\n🟠 WARNINGS (${warnings.length}):`);
  warnings.forEach((f) => console.log(`  [${f.suite}/${f.test}] ${f.description}${f.detail ? `\n    Detail: ${f.detail}` : ""}`));
}
if (findings.length === 0) {
  console.log("\n✅ No issues found!");
}

console.log(`\nTotal: ${bugs.length} bugs, ${limitations.length} limitations, ${warnings.length} warnings`);
process.exit(bugs.length > 0 ? 1 : 0);
