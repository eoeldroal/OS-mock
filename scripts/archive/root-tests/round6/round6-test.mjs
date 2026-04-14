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

    default:
      return false;
  }
}

const testResults = new TestResults();

console.log("======================================");
console.log("Testing NEW Tasks (Batch 6)");
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

  // Get file explorer window and file to delete
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
    console.log("Explorer window bounds:", explorerWindow.bounds);

    // Find the file to delete (scratch.txt, temp.txt, or old-notes.txt)
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

      // Find file position and click it
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

        console.log(`Clicking file at (${clickX}, ${clickY})`);

        // Click to select file
        let result = env.step({ type: "CLICK", x: clickX, y: clickY });
        console.log("After click - actionAccepted:", result.actionAccepted);

        // Press Delete key
        console.log("Pressing Delete key");
        result = env.step({ type: "PRESS", key: "delete" });
        console.log("After delete - actionAccepted:", result.actionAccepted);
        console.log("After delete - reward:", result.reward);
        console.log("After delete - lastProgress:", result.info.lastProgress);

        // Check final state
        const finalHs = env.getHiddenState();
        const passed = checkPredicates(finalHs, targetPredicates, hs.targets);

        console.log(
          "Files remaining:",
          Object.keys(finalHs.envState.fileSystem.files).map((id) => finalHs.envState.fileSystem.files[id].name)
        );
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
// Test 2: terminal_echo_to_file
// ============================================================
console.log("=== Test 2: terminal_echo_to_file ===");
{
  const env = new MockOsEnv();
  const resetResult = env.reset({ taskId: "terminal_echo_to_file", seed: 0 });
  const hs = env.getHiddenState();

  const task = env.getTask();
  const targetPredicates = task?.goalPredicates ?? [];
  console.log("Task goalPredicates:", targetPredicates);
  console.log("Target command:", hs.targets.targetCommand);
  console.log("Target command output:", hs.targets.targetCommandOutput);

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
    console.log("Terminal window found");

    // Click on terminal to focus it
    let result = env.step({ type: "CLICK", x: terminalWindow.bounds.x + 50, y: terminalWindow.bounds.y + 50 });

    // Type the echo command
    const command = `echo "Hello world" > greeting.txt`;
    console.log(`Typing command: ${command}`);
    result = env.step({ type: "TYPING", text: command });
    console.log("After typing - actionAccepted:", result.actionAccepted);

    // Press Enter to execute
    console.log("Pressing Enter");
    result = env.step({ type: "PRESS", key: "enter" });
    console.log("After enter - actionAccepted:", result.actionAccepted);
    console.log("After enter - reward:", result.reward);
    console.log("After enter - lastProgress:", result.info.lastProgress);

    // Check final state
    const finalHs = env.getHiddenState();
    const terminalState = Object.values(finalHs.envState.appStates.terminalLite)[0];
    if (terminalState) {
      console.log("Terminal lastCommand:", terminalState.lastCommand);
      console.log("Terminal lastOutput:", terminalState.lastOutput);
    }

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
  const resetResult = env.reset({ taskId: "terminal_touch_and_echo", seed: 0 });
  const hs = env.getHiddenState();

  const task = env.getTask();
  const targetPredicates = task?.goalPredicates ?? [];
  console.log("Task goalPredicates:", targetPredicates);
  console.log("Created file name:", hs.targets.createdFileName);
  console.log("Required commands:", hs.targets.requiredCommands);

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
    console.log("Terminal window found");

    // Click on terminal to focus it
    let result = env.step({ type: "CLICK", x: terminalWindow.bounds.x + 50, y: terminalWindow.bounds.y + 50 });

    // First command: touch new-note.txt
    const touchCmd = "touch new-note.txt";
    console.log(`Typing command: ${touchCmd}`);
    result = env.step({ type: "TYPING", text: touchCmd });

    console.log("Pressing Enter");
    result = env.step({ type: "PRESS", key: "enter" });
    console.log("After touch - lastProgress:", result.info.lastProgress);

    // Second command: echo content into the file
    const echoCmd = `echo "Hello from terminal" > new-note.txt`;
    console.log(`Typing command: ${echoCmd}`);
    result = env.step({ type: "TYPING", text: echoCmd });

    console.log("Pressing Enter");
    result = env.step({ type: "PRESS", key: "enter" });
    console.log("After echo - reward:", result.reward);
    console.log("After echo - lastProgress:", result.info.lastProgress);

    // Check final state
    const finalHs = env.getHiddenState();
    const terminalState = Object.values(finalHs.envState.appStates.terminalLite)[0];
    if (terminalState) {
      console.log("Terminal executedCommands:", terminalState.executedCommands);
    }

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
// Test 4: terminal_multi_command_chain
// ============================================================
console.log("=== Test 4: terminal_multi_command_chain ===");
{
  const env = new MockOsEnv();
  const resetResult = env.reset({ taskId: "terminal_multi_command_chain", seed: 0 });
  const hs = env.getHiddenState();

  const task = env.getTask();
  const targetPredicates = task?.goalPredicates ?? [];
  console.log("Task goalPredicates:", targetPredicates);
  console.log("Required commands:", hs.targets.requiredCommands);

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
    console.log("Terminal window found");

    // Click on terminal to focus it
    let result = env.step({ type: "CLICK", x: terminalWindow.bounds.x + 50, y: terminalWindow.bounds.y + 50 });

    // Command 1: pwd
    console.log("Typing: pwd");
    result = env.step({ type: "TYPING", text: "pwd" });
    console.log("Pressing Enter");
    result = env.step({ type: "PRESS", key: "enter" });
    console.log("After pwd - lastProgress:", result.info.lastProgress);

    // Command 2: ls
    console.log("Typing: ls");
    result = env.step({ type: "TYPING", text: "ls" });
    console.log("Pressing Enter");
    result = env.step({ type: "PRESS", key: "enter" });
    console.log("After ls - lastProgress:", result.info.lastProgress);

    // Command 3: cat info.txt
    console.log("Typing: cat info.txt");
    result = env.step({ type: "TYPING", text: "cat info.txt" });
    console.log("Pressing Enter");
    result = env.step({ type: "PRESS", key: "enter" });
    console.log("After cat - reward:", result.reward);
    console.log("After cat - lastProgress:", result.info.lastProgress);

    // Check final state
    const finalHs = env.getHiddenState();
    const terminalState = Object.values(finalHs.envState.appStates.terminalLite)[0];
    if (terminalState) {
      console.log("Terminal executedCommands:", terminalState.executedCommands);
    }

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
