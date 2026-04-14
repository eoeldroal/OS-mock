import { MockOsEnv } from "/sessions/sharp-clever-thompson/mnt/CoWork/packages/core/dist/index.js";

class TestResults {
  constructor() {
    this.results = [];
  }

  add(result) {
    this.results.push(result);
  }

  report() {
    console.log("======================================");
    console.log("Test Results Summary");
    console.log("======================================");
    for (const result of this.results) {
      const status = result.passed ? "PASS" : "FAIL";
      console.log(`${result.taskId} (seed=${result.seed}): ${status}`);
      if (result.failureReason) {
        console.log(`  Reason: ${result.failureReason}`);
      }
    }

    const passCount = this.results.filter((r) => r.passed).length;
    console.log(`\nTotal: ${passCount}/${this.results.length} tests passed`);

    return passCount === this.results.length;
  }
}

// Helper to find a file position in the file explorer
function findFileInExplorer(hs, fileName) {
  const files = hs.envState.fileSystem.order
    .map((id) => hs.envState.fileSystem.files[id])
    .filter(Boolean);
  const index = files.findIndex((f) => f.name === fileName);
  if (index >= 0) {
    return { index, file: files[index] };
  }
  return null;
}

// Helper to get file explorer row bounds
function getFileExplorerRowBounds(explorerBounds, index) {
  const HEADER_HEIGHT = 40;
  const SIDEBAR_WIDTH = 176;
  const TOOLBAR_HEIGHT = 54;
  const MAIN_PADDING = 16;
  const ROW_HEIGHT = 50;

  const mainX = explorerBounds.x + SIDEBAR_WIDTH;
  const sectionY = explorerBounds.y + HEADER_HEIGHT + TOOLBAR_HEIGHT + MAIN_PADDING;
  const listY = sectionY + 24;

  return {
    x: mainX + MAIN_PADDING,
    y: listY + index * ROW_HEIGHT,
    width: explorerBounds.width - SIDEBAR_WIDTH - MAIN_PADDING * 2,
    height: ROW_HEIGHT
  };
}

// Helper to check if predicates are satisfied
function checkPredicates(hs, predicates, targets) {
  for (const pred of predicates) {
    if (!checkPredicate(hs, pred, targets)) {
      return false;
    }
  }
  return true;
}

function checkPredicate(hs, predicate, targets) {
  const state = hs.envState;

  switch (predicate) {
    case "file.deleted":
      return (
        !Object.values(state.fileSystem.files).some((f) => f.name === targets.deletedFileName) &&
        !state.fileSystem.order.some((id) => state.fileSystem.files[id]?.name === targets.deletedFileName)
      );

    case "file.created":
      return Object.values(state.fileSystem.files).some((f) => f.name === targets.createdFileName);

    case "terminal.command_ran":
      return Object.values(state.appStates.terminalLite).some(
        (terminal) =>
          terminal.lastCommand === targets.targetCommand &&
          terminal.lastOutput === targets.targetCommandOutput
      );

    case "terminal.multi_commands_ran": {
      const requiredCommands = targets.requiredCommands?.split(",") ?? [];
      return Object.values(state.appStates.terminalLite).some(
        (terminal) => requiredCommands.every((cmd) => terminal.executedCommands?.includes(cmd.trim()))
      );
    }

    case "note.target_opened": {
      const targetFileId = targets.targetFileId;
      return Object.values(state.appStates.noteEditor).some((note) => note.fileId === targetFileId);
    }

    case "note.target_appended": {
      return Object.values(state.appStates.noteEditor).some((note) =>
        note.buffer.endsWith(targets.appendText)
      );
    }

    case "note.saved": {
      const file = state.fileSystem.files[targets.targetFileId];
      const notes = Object.values(state.appStates.noteEditor).filter((note) => note.fileId === targets.targetFileId);
      return (
        file?.content === targets.expectedSavedContent &&
        notes.every((note) => note.dirty === false && note.buffer === targets.expectedSavedContent)
      );
    }

    default:
      return false;
  }
}

const testResults = new TestResults();

console.log("======================================");
console.log("Testing NEW Tasks (Batch 6) - FULL");
console.log("======================================\n");

// ============================================================
// Test 1: delete_scratch_file
// ============================================================
console.log("=== Test 1: delete_scratch_file ===");
{
  const env = new MockOsEnv();
  const resetResult = env.reset({ taskId: "delete_scratch_file", seed: 0 });
  const hs = env.getHiddenState();

  const task = env.getTask();
  const targetPredicates = task?.goalPredicates ?? [];
  console.log("Task goalPredicates:", targetPredicates);

  const explorerWindow = hs.envState.windows.find((w) => w.appId === "file-explorer");
  if (!explorerWindow) {
    console.log("ERROR: No file explorer window found");
    testResults.add({
      taskId: "delete_scratch_file",
      seed: 0,
      passed: false,
      predicates: targetPredicates,
      failureReason: "No file explorer window"
    });
  } else {
    const targetFile = Object.values(hs.envState.fileSystem.files).find(
      (f) => f.name === hs.targets.deletedFileName
    );

    if (!targetFile) {
      console.log("ERROR: Target file not found");
      testResults.add({
        taskId: "delete_scratch_file",
        seed: 0,
        passed: false,
        predicates: targetPredicates,
        failureReason: "Target file not found"
      });
    } else {
      console.log("Target file to delete:", targetFile.name);

      const filePos = findFileInExplorer(hs, targetFile.name);
      if (!filePos) {
        console.log("ERROR: Could not find file position in explorer");
        testResults.add({
          taskId: "delete_scratch_file",
          seed: 0,
          passed: false,
          predicates: targetPredicates,
          failureReason: "File not in explorer"
        });
      } else {
        const rowBounds = getFileExplorerRowBounds(explorerWindow.bounds, filePos.index);
        const clickX = rowBounds.x + rowBounds.width / 2;
        const clickY = rowBounds.y + rowBounds.height / 2;

        // Click to select file
        env.step({ type: "CLICK", x: clickX, y: clickY });

        // Press Delete key
        env.step({ type: "PRESS", key: "delete" });

        // Check final state
        const finalHs = env.getHiddenState();
        const passed = checkPredicates(finalHs, targetPredicates, hs.targets);

        console.log("Test PASSED:", passed);
        testResults.add({
          taskId: "delete_scratch_file",
          seed: 0,
          passed,
          predicates: targetPredicates
        });
      }
    }
  }
}

console.log("\n");

// ============================================================
// Test 2: terminal_echo_to_file (FULL WORKFLOW)
// ============================================================
console.log("=== Test 2: terminal_echo_to_file (FULL) ===");
{
  const env = new MockOsEnv();
  env.reset({ taskId: "terminal_echo_to_file", seed: 0 });
  const hs = env.getHiddenState();

  const task = env.getTask();
  const targetPredicates = task?.goalPredicates ?? [];
  console.log("Task goalPredicates:", targetPredicates);

  const terminalWindow = hs.envState.windows.find((w) => w.appId === "terminal-lite");
  if (!terminalWindow) {
    console.log("ERROR: No terminal window found");
    testResults.add({
      taskId: "terminal_echo_to_file",
      seed: 0,
      passed: false,
      predicates: targetPredicates,
      failureReason: "No terminal window"
    });
  } else {
    // Step 1: Type and execute echo command
    env.step({ type: "CLICK", x: terminalWindow.bounds.x + 50, y: terminalWindow.bounds.y + 50 });
    env.step({ type: "TYPING", text: `echo "Hello world" > greeting.txt` });
    env.step({ type: "PRESS", key: "enter" });

    // Step 2: Open the greeting.txt file in note editor
    // Find greeting.txt in file explorer and double-click it
    const explorerWindow = hs.envState.windows.find((w) => w.appId === "file-explorer");
    if (explorerWindow) {
      let grepResult = findFileInExplorer(env.getHiddenState(), "greeting.txt");
      if (grepResult) {
        const rowBounds = getFileExplorerRowBounds(explorerWindow.bounds, grepResult.index);
        const clickX = rowBounds.x + rowBounds.width / 2;
        const clickY = rowBounds.y + rowBounds.height / 2;
        env.step({ type: "DOUBLE_CLICK", x: clickX, y: clickY });
      }
    }

    const finalHs = env.getHiddenState();
    const passed = checkPredicates(finalHs, targetPredicates, hs.targets);

    console.log("Test PASSED:", passed);
    testResults.add({
      taskId: "terminal_echo_to_file",
      seed: 0,
      passed,
      predicates: targetPredicates
    });
  }
}

console.log("\n");

// ============================================================
// Test 3: terminal_touch_and_echo
// ============================================================
console.log("=== Test 3: terminal_touch_and_echo ===");
{
  const env = new MockOsEnv();
  env.reset({ taskId: "terminal_touch_and_echo", seed: 0 });
  const hs = env.getHiddenState();

  const task = env.getTask();
  const targetPredicates = task?.goalPredicates ?? [];
  console.log("Task goalPredicates:", targetPredicates);

  const terminalWindow = hs.envState.windows.find((w) => w.appId === "terminal-lite");
  if (!terminalWindow) {
    console.log("ERROR: No terminal window found");
    testResults.add({
      taskId: "terminal_touch_and_echo",
      seed: 0,
      passed: false,
      predicates: targetPredicates,
      failureReason: "No terminal window"
    });
  } else {
    // Click on terminal to focus it
    env.step({ type: "CLICK", x: terminalWindow.bounds.x + 50, y: terminalWindow.bounds.y + 50 });

    // First command: touch new-note.txt
    env.step({ type: "TYPING", text: "touch new-note.txt" });
    env.step({ type: "PRESS", key: "enter" });

    // Second command: echo content into the file
    env.step({ type: "TYPING", text: `echo "Hello from terminal" > new-note.txt` });
    env.step({ type: "PRESS", key: "enter" });

    const finalHs = env.getHiddenState();
    const passed = checkPredicates(finalHs, targetPredicates, hs.targets);

    console.log("Test PASSED:", passed);
    testResults.add({
      taskId: "terminal_touch_and_echo",
      seed: 0,
      passed,
      predicates: targetPredicates
    });
  }
}

console.log("\n");

// ============================================================
// Test 4: terminal_multi_command_chain (FULL WORKFLOW)
// ============================================================
console.log("=== Test 4: terminal_multi_command_chain (FULL) ===");
{
  const env = new MockOsEnv();
  env.reset({ taskId: "terminal_multi_command_chain", seed: 0 });
  const hs = env.getHiddenState();

  const task = env.getTask();
  const targetPredicates = task?.goalPredicates ?? [];
  console.log("Task goalPredicates:", targetPredicates);

  const terminalWindow = hs.envState.windows.find((w) => w.appId === "terminal-lite");
  if (!terminalWindow) {
    console.log("ERROR: No terminal window found");
    testResults.add({
      taskId: "terminal_multi_command_chain",
      seed: 0,
      passed: false,
      predicates: targetPredicates,
      failureReason: "No terminal window"
    });
  } else {
    // Click on terminal to focus it
    env.step({ type: "CLICK", x: terminalWindow.bounds.x + 50, y: terminalWindow.bounds.y + 50 });

    // Command 1: pwd
    env.step({ type: "TYPING", text: "pwd" });
    env.step({ type: "PRESS", key: "enter" });

    // Command 2: ls
    env.step({ type: "TYPING", text: "ls" });
    env.step({ type: "PRESS", key: "enter" });

    // Command 3: cat info.txt
    env.step({ type: "TYPING", text: "cat info.txt" });
    env.step({ type: "PRESS", key: "enter" });

    // Step 2: Open the log.txt file in note editor and append content
    const explorerWindow = hs.envState.windows.find((w) => w.appId === "file-explorer");
    if (explorerWindow) {
      let logPos = findFileInExplorer(env.getHiddenState(), "log.txt");
      if (logPos) {
        const rowBounds = getFileExplorerRowBounds(explorerWindow.bounds, logPos.index);
        const clickX = rowBounds.x + rowBounds.width / 2;
        const clickY = rowBounds.y + rowBounds.height / 2;
        env.step({ type: "DOUBLE_CLICK", x: clickX, y: clickY });

        // Append the cat output to the note
        const catOutput = hs.targets.appendText;
        env.step({ type: "TYPING", text: catOutput });

        // Save the note
        env.step({ type: "HOTKEY", keys: ["ctrl", "s"] });
      }
    }

    const finalHs = env.getHiddenState();
    const passed = checkPredicates(finalHs, targetPredicates, hs.targets);

    console.log("Test PASSED:", passed);
    testResults.add({
      taskId: "terminal_multi_command_chain",
      seed: 0,
      passed,
      predicates: targetPredicates
    });
  }
}

console.log("\n");

// ============================================================
// Final Report
// ============================================================
const allPassed = testResults.report();
process.exit(allPassed ? 0 : 1);
