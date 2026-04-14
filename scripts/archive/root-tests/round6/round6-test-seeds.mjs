import { MockOsEnv } from "/sessions/sharp-clever-thompson/mnt/CoWork/packages/core/dist/index.js";

console.log("======================================");
console.log("Testing with Multiple Seeds");
console.log("======================================\n");

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

    default:
      return false;
  }
}

const results = {};

// Test with seeds 0, 1, 2
for (const seed of [0, 1, 2]) {
  console.log(`\n======== SEED ${seed} ========\n`);

  // Test 1: delete_scratch_file
  console.log("Testing delete_scratch_file...");
  {
    const env = new MockOsEnv();
    env.reset({ taskId: "delete_scratch_file", seed });
    const hs = env.getHiddenState();
    const task = env.getTask();

    const explorerWindow = hs.envState.windows.find((w) => w.appId === "file-explorer");
    const targetFile = Object.values(hs.envState.fileSystem.files).find(
      (f) => f.name === hs.targets.deletedFileName
    );

    if (explorerWindow && targetFile) {
      const filePos = findFileInExplorer(hs, targetFile.name);
      if (filePos) {
        const rowBounds = getFileExplorerRowBounds(explorerWindow.bounds, filePos.index);
        env.step({ type: "CLICK", x: rowBounds.x + rowBounds.width / 2, y: rowBounds.y + rowBounds.height / 2 });
        env.step({ type: "PRESS", key: "delete" });

        const finalHs = env.getHiddenState();
        const passed = checkPredicates(finalHs, task.goalPredicates, hs.targets);
        console.log(`  Deleted: ${targetFile.name} - PASSED: ${passed}`);
        results[`delete_scratch_file_${seed}`] = passed;
      }
    }
  }

  // Test 2: terminal_touch_and_echo
  console.log("Testing terminal_touch_and_echo...");
  {
    const env = new MockOsEnv();
    env.reset({ taskId: "terminal_touch_and_echo", seed });
    const hs = env.getHiddenState();
    const task = env.getTask();

    const terminalWindow = hs.envState.windows.find((w) => w.appId === "terminal-lite");
    if (terminalWindow) {
      env.step({ type: "CLICK", x: terminalWindow.bounds.x + 50, y: terminalWindow.bounds.y + 50 });
      env.step({ type: "TYPING", text: "touch new-note.txt" });
      env.step({ type: "PRESS", key: "enter" });
      env.step({ type: "TYPING", text: `echo "Hello from terminal" > new-note.txt` });
      env.step({ type: "PRESS", key: "enter" });

      const finalHs = env.getHiddenState();
      const passed = checkPredicates(finalHs, task.goalPredicates, hs.targets);
      console.log(`  Multi-command execution - PASSED: ${passed}`);
      results[`terminal_touch_and_echo_${seed}`] = passed;
    }
  }
}

console.log("\n\n======================================");
console.log("Multi-Seed Test Results Summary");
console.log("======================================\n");

const byTask = {};
for (const [key, value] of Object.entries(results)) {
  const parts = key.split("_");
  const seed = parts[parts.length - 1];
  const task = parts.slice(0, -1).join("_");
  if (!byTask[task]) byTask[task] = [];
  byTask[task].push({ seed: parseInt(seed), passed: value });
}

for (const [task, results] of Object.entries(byTask)) {
  const passed = results.filter((r) => r.passed).length;
  const total = results.length;
  console.log(`${task}: ${passed}/${total} seeds passed`);
  for (const r of results) {
    const status = r.passed ? "✓" : "✗";
    console.log(`  Seed ${r.seed}: ${status}`);
  }
}

const allPassed = Object.values(results).every((r) => r);
const passCount = Object.values(results).filter((r) => r).length;
const totalTests = Object.keys(results).length;

console.log(`\nTotal: ${passCount}/${totalTests} tests passed`);

process.exit(allPassed ? 0 : 1);
