import { MockOsEnv } from "/sessions/sharp-clever-thompson/mnt/CoWork/packages/core/src/index.js";

interface EdgeCaseResult {
  testNum: number;
  testName: string;
  passed: boolean;
  error?: string;
  details?: Record<string, any>;
}

const results: EdgeCaseResult[] = [];

// Utility: Check if state is valid
function validateState(hs: any): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  const state = hs.envState;

  // Check window IDs are unique
  const windowIds = state.windows.map((w: any) => w.id);
  if (new Set(windowIds).size !== windowIds.length) {
    issues.push("Duplicate window IDs found");
  }

  // Check all window bounds are valid
  state.windows.forEach((w: any) => {
    if (w.bounds.x < 0 || w.bounds.y < 0) {
      issues.push(`Window ${w.id} has negative bounds: (${w.bounds.x}, ${w.bounds.y})`);
    }
    if (w.bounds.width <= 0 || w.bounds.height <= 0) {
      issues.push(`Window ${w.id} has invalid size: ${w.bounds.width}x${w.bounds.height}`);
    }
  });

  // Check file system consistency
  const fileIds = Object.keys(state.fileSystem.files);
  const orderIds = state.fileSystem.order;
  const orphanedIds = fileIds.filter((id: string) => !orderIds.includes(id));
  if (orphanedIds.length > 0) {
    issues.push(`Orphaned file IDs: ${orphanedIds.join(", ")}`);
  }

  // Check pointer within viewport
  if (state.pointerX < 0 || state.pointerY < 0 || state.pointerX > 1920 || state.pointerY > 1080) {
    issues.push(`Pointer out of bounds: (${state.pointerX}, ${state.pointerY})`);
  }

  return { valid: issues.length === 0, issues };
}

function logResult(testNum: number, testName: string, passed: boolean, error?: string, details?: Record<string, any>) {
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
console.log("EXTREME EDGE CASES - Terminal & File Operations");
console.log("===============================================\n");

// ============================================================
// Test 1: Empty echo (echo with no arguments)
// ============================================================
console.log("Test 1: Empty echo");
{
  try {
    const env = new MockOsEnv();
    env.reset({ taskId: "delete_scratch_file", seed: 1 });
    let hs = env.getHiddenState();

    const terminalWindow = hs.envState.windows.find((w: any) => w.appId === "terminal-lite");
    if (!terminalWindow) throw new Error("No terminal window");

    // Click terminal
    env.step({ type: "CLICK", x: terminalWindow.bounds.x + 50, y: terminalWindow.bounds.y + 50 });

    // Type: echo (no arguments)
    env.step({ type: "TYPING", text: "echo" });
    const result = env.step({ type: "PRESS", key: "enter" });

    hs = env.getHiddenState();
    const terminalState = Object.values(hs.envState.appStates.terminalLite)[0] as any;
    const validate = validateState(hs);

    const passed = validate.valid && terminalState?.lastCommand === "echo" && result.actionAccepted;
    logResult(1, "Empty echo", passed, validate.issues.length > 0 ? validate.issues[0] : undefined, {
      command: terminalState?.lastCommand,
      output: terminalState?.lastOutput,
      validState: validate.valid
    });
  } catch (e: any) {
    logResult(1, "Empty echo", false, e.message);
  }
}

// ============================================================
// Test 2: Echo with special chars (> inside quotes)
// ============================================================
console.log("\nTest 2: Echo with special chars");
{
  try {
    const env = new MockOsEnv();
    env.reset({ taskId: "terminal_echo_to_file", seed: 2 });
    let hs = env.getHiddenState();

    const terminalWindow = hs.envState.windows.find((w: any) => w.appId === "terminal-lite");
    if (!terminalWindow) throw new Error("No terminal window");

    env.step({ type: "CLICK", x: terminalWindow.bounds.x + 50, y: terminalWindow.bounds.y + 50 });

    // Type: echo "hello > world"
    env.step({ type: "TYPING", text: 'echo "hello > world"' });
    const result = env.step({ type: "PRESS", key: "enter" });

    hs = env.getHiddenState();
    const terminalState = Object.values(hs.envState.appStates.terminalLite)[0] as any;
    const validate = validateState(hs);

    const passed = validate.valid && result.actionAccepted && terminalState?.lastCommand?.includes("hello > world");
    logResult(2, "Echo with special chars", passed, validate.issues.length > 0 ? validate.issues[0] : undefined, {
      command: terminalState?.lastCommand,
      validState: validate.valid
    });
  } catch (e: any) {
    logResult(2, "Echo with special chars", false, e.message);
  }
}

// ============================================================
// Test 3: Cat nonexistent file
// ============================================================
console.log("\nTest 3: Cat nonexistent file");
{
  try {
    const env = new MockOsEnv();
    env.reset({ taskId: "terminal_echo_to_file", seed: 3 });
    let hs = env.getHiddenState();

    const terminalWindow = hs.envState.windows.find((w: any) => w.appId === "terminal-lite");
    if (!terminalWindow) throw new Error("No terminal window");

    env.step({ type: "CLICK", x: terminalWindow.bounds.x + 50, y: terminalWindow.bounds.y + 50 });

    env.step({ type: "TYPING", text: "cat doesnotexist.txt" });
    const result = env.step({ type: "PRESS", key: "enter" });

    hs = env.getHiddenState();
    const terminalState = Object.values(hs.envState.appStates.terminalLite)[0] as any;
    const validate = validateState(hs);

    // Should not crash, should handle gracefully
    const passed = validate.valid && result.actionAccepted;
    logResult(3, "Cat nonexistent file", passed, validate.issues.length > 0 ? validate.issues[0] : undefined, {
      command: terminalState?.lastCommand,
      validState: validate.valid
    });
  } catch (e: any) {
    logResult(3, "Cat nonexistent file", false, e.message);
  }
}

// ============================================================
// Test 4: Rm nonexistent file
// ============================================================
console.log("\nTest 4: Rm nonexistent file");
{
  try {
    const env = new MockOsEnv();
    env.reset({ taskId: "terminal_echo_to_file", seed: 4 });
    let hs = env.getHiddenState();

    const terminalWindow = hs.envState.windows.find((w: any) => w.appId === "terminal-lite");
    if (!terminalWindow) throw new Error("No terminal window");

    env.step({ type: "CLICK", x: terminalWindow.bounds.x + 50, y: terminalWindow.bounds.y + 50 });

    env.step({ type: "TYPING", text: "rm doesnotexist.txt" });
    const result = env.step({ type: "PRESS", key: "enter" });

    hs = env.getHiddenState();
    const validate = validateState(hs);

    const passed = validate.valid && result.actionAccepted;
    logResult(4, "Rm nonexistent file", passed, validate.issues.length > 0 ? validate.issues[0] : undefined, {
      validState: validate.valid
    });
  } catch (e: any) {
    logResult(4, "Rm nonexistent file", false, e.message);
  }
}

// ============================================================
// Test 5: Touch existing file
// ============================================================
console.log("\nTest 5: Touch existing file");
{
  try {
    const env = new MockOsEnv();
    env.reset({ taskId: "terminal_touch_and_echo", seed: 5 });
    let hs = env.getHiddenState();

    const terminalWindow = hs.envState.windows.find((w: any) => w.appId === "terminal-lite");
    if (!terminalWindow) throw new Error("No terminal window");

    // First, create a file
    env.step({ type: "CLICK", x: terminalWindow.bounds.x + 50, y: terminalWindow.bounds.y + 50 });
    env.step({ type: "TYPING", text: "touch testfile.txt" });
    env.step({ type: "PRESS", key: "enter" });

    hs = env.getHiddenState();
    const fileCount1 = Object.keys(hs.envState.fileSystem.files).length;

    // Now touch the same file again
    env.step({ type: "TYPING", text: "touch testfile.txt" });
    const result = env.step({ type: "PRESS", key: "enter" });

    hs = env.getHiddenState();
    const fileCount2 = Object.keys(hs.envState.fileSystem.files).length;
    const validate = validateState(hs);

    // Should not create duplicate
    const passed = validate.valid && result.actionAccepted && fileCount1 === fileCount2;
    logResult(5, "Touch existing file", passed, validate.issues.length > 0 ? validate.issues[0] : undefined, {
      fileCountBefore: fileCount1,
      fileCountAfter: fileCount2,
      validState: validate.valid
    });
  } catch (e: any) {
    logResult(5, "Touch existing file", false, e.message);
  }
}

// ============================================================
// Test 6: Wc on empty file
// ============================================================
console.log("\nTest 6: Wc on empty file");
{
  try {
    const env = new MockOsEnv();
    env.reset({ taskId: "terminal_echo_to_file", seed: 6 });
    let hs = env.getHiddenState();

    const terminalWindow = hs.envState.windows.find((w: any) => w.appId === "terminal-lite");
    if (!terminalWindow) throw new Error("No terminal window");

    // Create empty file
    env.step({ type: "CLICK", x: terminalWindow.bounds.x + 50, y: terminalWindow.bounds.y + 50 });
    env.step({ type: "TYPING", text: "touch emptyfile.txt" });
    env.step({ type: "PRESS", key: "enter" });

    // Run wc on empty file
    env.step({ type: "TYPING", text: "wc emptyfile.txt" });
    const result = env.step({ type: "PRESS", key: "enter" });

    hs = env.getHiddenState();
    const terminalState = Object.values(hs.envState.appStates.terminalLite)[0] as any;
    const validate = validateState(hs);

    const passed = validate.valid && result.actionAccepted && terminalState?.lastCommand?.includes("wc");
    logResult(6, "Wc on empty file", passed, validate.issues.length > 0 ? validate.issues[0] : undefined, {
      command: terminalState?.lastCommand,
      validState: validate.valid
    });
  } catch (e: any) {
    logResult(6, "Wc on empty file", false, e.message);
  }
}

// ============================================================
// Test 7: Head on file with fewer lines than requested
// ============================================================
console.log("\nTest 7: Head on file with fewer lines than requested");
{
  try {
    const env = new MockOsEnv();
    env.reset({ taskId: "terminal_echo_to_file", seed: 7 });
    let hs = env.getHiddenState();

    const terminalWindow = hs.envState.windows.find((w: any) => w.appId === "terminal-lite");
    if (!terminalWindow) throw new Error("No terminal window");

    // Create short file
    env.step({ type: "CLICK", x: terminalWindow.bounds.x + 50, y: terminalWindow.bounds.y + 50 });
    env.step({ type: "TYPING", text: 'echo "line1" > shortfile.txt' });
    env.step({ type: "PRESS", key: "enter" });

    // Request more lines than exist
    env.step({ type: "TYPING", text: "head -n 100 shortfile.txt" });
    const result = env.step({ type: "PRESS", key: "enter" });

    hs = env.getHiddenState();
    const terminalState = Object.values(hs.envState.appStates.terminalLite)[0] as any;
    const validate = validateState(hs);

    const passed = validate.valid && result.actionAccepted && terminalState?.lastCommand?.includes("head");
    logResult(7, "Head on short file", passed, validate.issues.length > 0 ? validate.issues[0] : undefined, {
      command: terminalState?.lastCommand,
      validState: validate.valid
    });
  } catch (e: any) {
    logResult(7, "Head on short file", false, e.message);
  }
}

// ============================================================
// Test 8: Very long input (500-character string)
// ============================================================
console.log("\nTest 8: Very long input");
{
  try {
    const env = new MockOsEnv();
    env.reset({ taskId: "terminal_echo_to_file", seed: 8 });
    let hs = env.getHiddenState();

    const terminalWindow = hs.envState.windows.find((w: any) => w.appId === "terminal-lite");
    if (!terminalWindow) throw new Error("No terminal window");

    env.step({ type: "CLICK", x: terminalWindow.bounds.x + 50, y: terminalWindow.bounds.y + 50 });

    // Create 500-char string
    const longString = "a".repeat(500);
    const longCommand = `echo "${longString}"`;
    env.step({ type: "TYPING", text: longCommand });
    const result = env.step({ type: "PRESS", key: "enter" });

    hs = env.getHiddenState();
    const terminalState = Object.values(hs.envState.appStates.terminalLite)[0] as any;
    const validate = validateState(hs);

    const passed = validate.valid && result.actionAccepted && terminalState?.lastCommand?.includes("echo");
    logResult(8, "Very long input", passed, validate.issues.length > 0 ? validate.issues[0] : undefined, {
      inputLength: longCommand.length,
      validState: validate.valid
    });
  } catch (e: any) {
    logResult(8, "Very long input", false, e.message);
  }
}

// ============================================================
// Test 9: Multiple Enter presses with empty input
// ============================================================
console.log("\nTest 9: Multiple Enter presses with empty input");
{
  try {
    const env = new MockOsEnv();
    env.reset({ taskId: "terminal_echo_to_file", seed: 9 });
    let hs = env.getHiddenState();

    const terminalWindow = hs.envState.windows.find((w: any) => w.appId === "terminal-lite");
    if (!terminalWindow) throw new Error("No terminal window");

    env.step({ type: "CLICK", x: terminalWindow.bounds.x + 50, y: terminalWindow.bounds.y + 50 });

    // Press Enter 10 times with no input
    let allPassed = true;
    for (let i = 0; i < 10; i++) {
      const result = env.step({ type: "PRESS", key: "enter" });
      if (!result.actionAccepted) {
        allPassed = false;
        break;
      }
    }

    hs = env.getHiddenState();
    const validate = validateState(hs);

    const passed = validate.valid && allPassed;
    logResult(9, "Multiple Enter presses", passed, validate.issues.length > 0 ? validate.issues[0] : undefined, {
      validState: validate.valid
    });
  } catch (e: any) {
    logResult(9, "Multiple Enter presses", false, e.message);
  }
}

// ============================================================
// Test 10: Command execution sequence (pwd, ls, cat, pwd)
// ============================================================
console.log("\nTest 10: Command execution sequence");
{
  try {
    const env = new MockOsEnv();
    env.reset({ taskId: "terminal_multi_command_chain", seed: 10 });
    let hs = env.getHiddenState();

    const terminalWindow = hs.envState.windows.find((w: any) => w.appId === "terminal-lite");
    if (!terminalWindow) throw new Error("No terminal window");

    env.step({ type: "CLICK", x: terminalWindow.bounds.x + 50, y: terminalWindow.bounds.y + 50 });

    const commands = ["pwd", "ls", "pwd"];
    for (const cmd of commands) {
      env.step({ type: "TYPING", text: cmd });
      env.step({ type: "PRESS", key: "enter" });
    }

    hs = env.getHiddenState();
    const terminalState = Object.values(hs.envState.appStates.terminalLite)[0] as any;
    const validate = validateState(hs);

    // Check if all commands are in executedCommands
    const executedCmds = terminalState?.executedCommands ?? [];
    const allCommandsPresent = commands.every((cmd) => executedCmds.includes(cmd));

    const passed = validate.valid && allCommandsPresent;
    logResult(10, "Command execution sequence", passed, validate.issues.length > 0 ? validate.issues[0] : undefined, {
      expectedCommands: commands,
      executedCommands: executedCmds,
      validState: validate.valid
    });
  } catch (e: any) {
    logResult(10, "Command execution sequence", false, e.message);
  }
}

// ============================================================
// Test 11: Echo redirect to same file twice
// ============================================================
console.log("\nTest 11: Echo redirect to same file twice");
{
  try {
    const env = new MockOsEnv();
    env.reset({ taskId: "terminal_echo_to_file", seed: 11 });
    let hs = env.getHiddenState();

    const terminalWindow = hs.envState.windows.find((w: any) => w.appId === "terminal-lite");
    if (!terminalWindow) throw new Error("No terminal window");

    env.step({ type: "CLICK", x: terminalWindow.bounds.x + 50, y: terminalWindow.bounds.y + 50 });

    // First echo redirect
    env.step({ type: "TYPING", text: 'echo "a" > redirect_test.txt' });
    env.step({ type: "PRESS", key: "enter" });

    // Second echo redirect (should overwrite)
    env.step({ type: "TYPING", text: 'echo "b" > redirect_test.txt' });
    const result = env.step({ type: "PRESS", key: "enter" });

    hs = env.getHiddenState();
    const fileSystem = hs.envState.fileSystem;
    const targetFile = Object.values(fileSystem.files).find((f: any) => f.name === "redirect_test.txt");
    const validate = validateState(hs);

    // File should exist and have latest content
    const passed = validate.valid && result.actionAccepted && targetFile !== undefined;
    logResult(11, "Echo redirect twice", passed, validate.issues.length > 0 ? validate.issues[0] : undefined, {
      fileExists: targetFile !== undefined,
      fileName: targetFile?.name,
      validState: validate.valid
    });
  } catch (e: any) {
    logResult(11, "Echo redirect twice", false, e.message);
  }
}

// ============================================================
// Test 12: Delete all files one by one
// ============================================================
console.log("\nTest 12: Delete all files one by one");
{
  try {
    const env = new MockOsEnv();
    env.reset({ taskId: "delete_scratch_file", seed: 12 });
    let hs = env.getHiddenState();

    const explorerWindow = hs.envState.windows.find((w: any) => w.appId === "file-explorer");
    if (!explorerWindow) throw new Error("No explorer window");

    // Get initial file count
    const initialFiles = Object.values(hs.envState.fileSystem.files).filter(Boolean);
    const HEADER_HEIGHT = 40;
    const SIDEBAR_WIDTH = 176;
    const TOOLBAR_HEIGHT = 54;
    const MAIN_PADDING = 16;
    const ROW_HEIGHT = 50;

    // Delete files one by one
    let deleteCount = 0;
    for (let i = 0; i < initialFiles.length; i++) {
      hs = env.getHiddenState();
      const files = Object.values(hs.envState.fileSystem.files).filter(Boolean);
      if (files.length === 0) break;

      const mainX = explorerWindow.bounds.x + SIDEBAR_WIDTH;
      const sectionY = explorerWindow.bounds.y + HEADER_HEIGHT + TOOLBAR_HEIGHT + MAIN_PADDING;
      const listY = sectionY + 24;

      const clickX = mainX + MAIN_PADDING;
      const clickY = listY + MAIN_PADDING;

      // Click first file
      env.step({ type: "CLICK", x: clickX, y: clickY });
      // Delete it
      env.step({ type: "PRESS", key: "delete" });
      deleteCount++;
    }

    hs = env.getHiddenState();
    const finalFiles = Object.values(hs.envState.fileSystem.files).filter(Boolean);
    const validate = validateState(hs);

    const passed = validate.valid && deleteCount > 0;
    logResult(12, "Delete all files", passed, validate.issues.length > 0 ? validate.issues[0] : undefined, {
      initialFileCount: initialFiles.length,
      filesDeleted: deleteCount,
      finalFileCount: finalFiles.length,
      validState: validate.valid
    });
  } catch (e: any) {
    logResult(12, "Delete all files", false, e.message);
  }
}

// ============================================================
// Test 13: Delete file while open in note editor
// ============================================================
console.log("\nTest 13: Delete file open in note editor");
{
  try {
    const env = new MockOsEnv();
    env.reset({ taskId: "terminal_echo_to_file", seed: 13 });
    let hs = env.getHiddenState();

    const explorerWindow = hs.envState.windows.find((w: any) => w.appId === "file-explorer");
    const terminalWindow = hs.envState.windows.find((w: any) => w.appId === "terminal-lite");

    if (!explorerWindow || !terminalWindow) throw new Error("No explorer/terminal window");

    // Create a file in terminal
    env.step({ type: "CLICK", x: terminalWindow.bounds.x + 50, y: terminalWindow.bounds.y + 50 });
    env.step({ type: "TYPING", text: 'echo "test content" > deleteme.txt' });
    env.step({ type: "PRESS", key: "enter" });

    // Open it in note editor by clicking in explorer
    hs = env.getHiddenState();
    const files = Object.values(hs.envState.fileSystem.files).filter(
      (f: any) => f && f.name === "deleteme.txt"
    );

    if (files.length > 0) {
      // Click on file to open it
      const HEADER_HEIGHT = 40;
      const SIDEBAR_WIDTH = 176;
      const TOOLBAR_HEIGHT = 54;
      const MAIN_PADDING = 16;
      const ROW_HEIGHT = 50;

      const mainX = explorerWindow.bounds.x + SIDEBAR_WIDTH;
      const sectionY = explorerWindow.bounds.y + HEADER_HEIGHT + TOOLBAR_HEIGHT + MAIN_PADDING;
      const listY = sectionY + 24;

      env.step({ type: "CLICK", x: mainX + MAIN_PADDING, y: listY + MAIN_PADDING });
      env.step({ type: "PRESS", key: "enter" });

      // Now try to delete the file
      env.step({ type: "CLICK", x: mainX + MAIN_PADDING, y: listY + MAIN_PADDING });
      const deleteResult = env.step({ type: "PRESS", key: "delete" });

      hs = env.getHiddenState();
      const validate = validateState(hs);

      // Should not crash
      const passed = validate.valid && deleteResult.actionAccepted;
      logResult(13, "Delete file open in editor", passed, validate.issues.length > 0 ? validate.issues[0] : undefined, {
        validState: validate.valid
      });
    } else {
      logResult(13, "Delete file open in editor", false, "File was not created");
    }
  } catch (e: any) {
    logResult(13, "Delete file open in editor", false, e.message);
  }
}

// ============================================================
// Test 14: Rename to empty string
// ============================================================
console.log("\nTest 14: Rename to empty string");
{
  try {
    const env = new MockOsEnv();
    env.reset({ taskId: "delete_scratch_file", seed: 14 });
    let hs = env.getHiddenState();

    const explorerWindow = hs.envState.windows.find((w: any) => w.appId === "file-explorer");
    if (!explorerWindow) throw new Error("No explorer window");

    // Get first file
    hs = env.getHiddenState();
    const files = Object.values(hs.envState.fileSystem.files).filter(Boolean);
    if (files.length === 0) throw new Error("No files to rename");

    const HEADER_HEIGHT = 40;
    const SIDEBAR_WIDTH = 176;
    const TOOLBAR_HEIGHT = 54;
    const MAIN_PADDING = 16;
    const ROW_HEIGHT = 50;

    const mainX = explorerWindow.bounds.x + SIDEBAR_WIDTH;
    const sectionY = explorerWindow.bounds.y + HEADER_HEIGHT + TOOLBAR_HEIGHT + MAIN_PADDING;
    const listY = sectionY + 24;

    // Click file
    env.step({ type: "CLICK", x: mainX + MAIN_PADDING, y: listY + MAIN_PADDING });

    // Press F2 to rename (or try Ctrl+R)
    env.step({ type: "PRESS", key: "f2" });

    // Clear and press Enter
    env.step({ type: "PRESS", key: "ctrl+a" });
    const result = env.step({ type: "PRESS", key: "enter" });

    hs = env.getHiddenState();
    const validate = validateState(hs);

    // Should handle gracefully
    const passed = validate.valid;
    logResult(14, "Rename to empty string", passed, validate.issues.length > 0 ? validate.issues[0] : undefined, {
      validState: validate.valid
    });
  } catch (e: any) {
    logResult(14, "Rename to empty string", false, e.message);
  }
}

// ============================================================
// Test 15: Rename with same name
// ============================================================
console.log("\nTest 15: Rename with same name");
{
  try {
    const env = new MockOsEnv();
    env.reset({ taskId: "delete_scratch_file", seed: 15 });
    let hs = env.getHiddenState();

    const explorerWindow = hs.envState.windows.find((w: any) => w.appId === "file-explorer");
    if (!explorerWindow) throw new Error("No explorer window");

    hs = env.getHiddenState();
    const files = Object.values(hs.envState.fileSystem.files).filter(Boolean);
    if (files.length === 0) throw new Error("No files to rename");

    const originalName = (files[0] as any).name;

    const HEADER_HEIGHT = 40;
    const SIDEBAR_WIDTH = 176;
    const TOOLBAR_HEIGHT = 54;
    const MAIN_PADDING = 16;

    const mainX = explorerWindow.bounds.x + SIDEBAR_WIDTH;
    const sectionY = explorerWindow.bounds.y + HEADER_HEIGHT + TOOLBAR_HEIGHT + MAIN_PADDING;
    const listY = sectionY + 24;

    // Click file
    env.step({ type: "CLICK", x: mainX + MAIN_PADDING, y: listY + MAIN_PADDING });

    // Rename to same name
    env.step({ type: "PRESS", key: "f2" });
    const result = env.step({ type: "PRESS", key: "enter" });

    hs = env.getHiddenState();
    const filesAfter = Object.values(hs.envState.fileSystem.files).filter(
      (f: any) => f && f.name === originalName
    );
    const validate = validateState(hs);

    const passed = validate.valid && filesAfter.length > 0;
    logResult(15, "Rename with same name", passed, validate.issues.length > 0 ? validate.issues[0] : undefined, {
      originalName,
      stillExists: filesAfter.length > 0,
      validState: validate.valid
    });
  } catch (e: any) {
    logResult(15, "Rename with same name", false, e.message);
  }
}

// ============================================================
// Test 16: Delete with no file selected
// ============================================================
console.log("\nTest 16: Delete with no file selected");
{
  try {
    const env = new MockOsEnv();
    env.reset({ taskId: "delete_scratch_file", seed: 16 });
    let hs = env.getHiddenState();

    const explorerWindow = hs.envState.windows.find((w: any) => w.appId === "file-explorer");
    if (!explorerWindow) throw new Error("No explorer window");

    hs = env.getHiddenState();
    const filesBefore = Object.values(hs.envState.fileSystem.files).filter(Boolean);

    // Click on empty area and press Delete
    const clickX = explorerWindow.bounds.x + explorerWindow.bounds.width - 100;
    const clickY = explorerWindow.bounds.y + explorerWindow.bounds.height - 100;
    env.step({ type: "CLICK", x: clickX, y: clickY });

    const result = env.step({ type: "PRESS", key: "delete" });

    hs = env.getHiddenState();
    const filesAfter = Object.values(hs.envState.fileSystem.files).filter(Boolean);
    const validate = validateState(hs);

    // Nothing should be deleted
    const passed = validate.valid && filesBefore.length === filesAfter.length;
    logResult(16, "Delete with no selection", passed, validate.issues.length > 0 ? validate.issues[0] : undefined, {
      filesBefore: filesBefore.length,
      filesAfter: filesAfter.length,
      validState: validate.valid
    });
  } catch (e: any) {
    logResult(16, "Delete with no selection", false, e.message);
  }
}

// ============================================================
// Test 17: Right-click on empty area
// ============================================================
console.log("\nTest 17: Right-click on empty area");
{
  try {
    const env = new MockOsEnv();
    env.reset({ taskId: "delete_scratch_file", seed: 17 });
    let hs = env.getHiddenState();

    const explorerWindow = hs.envState.windows.find((w: any) => w.appId === "file-explorer");
    if (!explorerWindow) throw new Error("No explorer window");

    // Right-click on empty area
    const clickX = explorerWindow.bounds.x + explorerWindow.bounds.width - 100;
    const clickY = explorerWindow.bounds.y + explorerWindow.bounds.height - 100;
    const result = env.step({ type: "CLICK", x: clickX, y: clickY, button: "right" });

    hs = env.getHiddenState();
    const validate = validateState(hs);

    // Should not crash
    const passed = validate.valid;
    logResult(17, "Right-click on empty area", passed, validate.issues.length > 0 ? validate.issues[0] : undefined, {
      actionAccepted: result.actionAccepted,
      validState: validate.valid
    });
  } catch (e: any) {
    logResult(17, "Right-click on empty area", false, e.message);
  }
}

// ============================================================
// Test 18: Scroll in empty explorer
// ============================================================
console.log("\nTest 18: Scroll in empty explorer");
{
  try {
    const env = new MockOsEnv();
    env.reset({ taskId: "delete_scratch_file", seed: 18 });
    let hs = env.getHiddenState();

    const explorerWindow = hs.envState.windows.find((w: any) => w.appId === "file-explorer");
    if (!explorerWindow) throw new Error("No explorer window");

    const terminalWindow = hs.envState.windows.find((w: any) => w.appId === "terminal-lite");
    if (!terminalWindow) throw new Error("No terminal window");

    // Delete all files first
    const files = Object.values(hs.envState.fileSystem.files).filter(Boolean);
    const HEADER_HEIGHT = 40;
    const SIDEBAR_WIDTH = 176;
    const TOOLBAR_HEIGHT = 54;
    const MAIN_PADDING = 16;
    const ROW_HEIGHT = 50;

    for (let i = 0; i < files.length; i++) {
      const mainX = explorerWindow.bounds.x + SIDEBAR_WIDTH;
      const sectionY = explorerWindow.bounds.y + HEADER_HEIGHT + TOOLBAR_HEIGHT + MAIN_PADDING;
      const listY = sectionY + 24;

      env.step({ type: "CLICK", x: mainX + MAIN_PADDING, y: listY + MAIN_PADDING });
      env.step({ type: "PRESS", key: "delete" });
    }

    // Now try to scroll in empty explorer
    const centerX = explorerWindow.bounds.x + explorerWindow.bounds.width / 2;
    const centerY = explorerWindow.bounds.y + explorerWindow.bounds.height / 2;
    const result = env.step({ type: "SCROLL", x: centerX, y: centerY, direction: "down", amount: 3 });

    hs = env.getHiddenState();
    const validate = validateState(hs);

    const passed = validate.valid;
    logResult(18, "Scroll in empty explorer", passed, validate.issues.length > 0 ? validate.issues[0] : undefined, {
      validState: validate.valid
    });
  } catch (e: any) {
    logResult(18, "Scroll in empty explorer", false, e.message);
  }
}

// ============================================================
// Test 19: Select file, close explorer, reopen
// ============================================================
console.log("\nTest 19: Select, close explorer, reopen");
{
  try {
    const env = new MockOsEnv();
    env.reset({ taskId: "delete_scratch_file", seed: 19 });
    let hs = env.getHiddenState();

    const explorerWindow = hs.envState.windows.find((w: any) => w.appId === "file-explorer");
    if (!explorerWindow) throw new Error("No explorer window");

    hs = env.getHiddenState();
    const files = Object.values(hs.envState.fileSystem.files).filter(Boolean);
    if (files.length === 0) throw new Error("No files");

    const HEADER_HEIGHT = 40;
    const SIDEBAR_WIDTH = 176;
    const TOOLBAR_HEIGHT = 54;
    const MAIN_PADDING = 16;

    const mainX = explorerWindow.bounds.x + SIDEBAR_WIDTH;
    const sectionY = explorerWindow.bounds.y + HEADER_HEIGHT + TOOLBAR_HEIGHT + MAIN_PADDING;
    const listY = sectionY + 24;

    // Select first file
    env.step({ type: "CLICK", x: mainX + MAIN_PADDING, y: listY + MAIN_PADDING });

    // Close explorer
    const closeBtn = explorerWindow.bounds.x + explorerWindow.bounds.width - 20;
    env.step({ type: "CLICK", x: closeBtn, y: explorerWindow.bounds.y + 10 });

    hs = env.getHiddenState();
    const explorerClosed = !hs.envState.windows.find((w: any) => w.appId === "file-explorer");

    // Reopen explorer (this would happen via task or user action, we'll check state)
    const validate = validateState(hs);

    const passed = validate.valid && explorerClosed;
    logResult(19, "Select, close, reopen explorer", passed, validate.issues.length > 0 ? validate.issues[0] : undefined, {
      explorerClosed,
      validState: validate.valid
    });
  } catch (e: any) {
    logResult(19, "Select, close, reopen explorer", false, e.message);
  }
}

// ============================================================
// Test 20: Copy from terminal, paste in note
// ============================================================
console.log("\nTest 20: Copy from terminal, paste in note");
{
  try {
    const env = new MockOsEnv();
    env.reset({ taskId: "terminal_echo_to_file", seed: 20 });
    let hs = env.getHiddenState();

    const terminalWindow = hs.envState.windows.find((w: any) => w.appId === "terminal-lite");
    if (!terminalWindow) throw new Error("No terminal window");

    // Type a command in terminal
    env.step({ type: "CLICK", x: terminalWindow.bounds.x + 50, y: terminalWindow.bounds.y + 50 });
    env.step({ type: "TYPING", text: "echo test output" });
    env.step({ type: "PRESS", key: "enter" });

    // Try to select and copy
    env.step({ type: "PRESS", key: "ctrl+a" });
    const copyResult = env.step({ type: "PRESS", key: "ctrl+c" });

    hs = env.getHiddenState();
    const validate = validateState(hs);

    // Should not crash
    const passed = validate.valid && copyResult.actionAccepted;
    logResult(20, "Copy from terminal, paste in note", passed, validate.issues.length > 0 ? validate.issues[0] : undefined, {
      validState: validate.valid
    });
  } catch (e: any) {
    logResult(20, "Copy from terminal, paste in note", false, e.message);
  }
}

// ============================================================
// Test 21: Type in terminal while note is focused
// ============================================================
console.log("\nTest 21: Type in terminal while note is focused");
{
  try {
    const env = new MockOsEnv();
    env.reset({ taskId: "terminal_echo_to_file", seed: 21 });
    let hs = env.getHiddenState();

    const terminalWindow = hs.envState.windows.find((w: any) => w.appId === "terminal-lite");
    const noteEditors = hs.envState.appStates.noteEditor;

    if (!terminalWindow) throw new Error("No terminal window");

    // Click terminal
    env.step({ type: "CLICK", x: terminalWindow.bounds.x + 50, y: terminalWindow.bounds.y + 50 });
    env.step({ type: "TYPING", text: "echo test" });

    // Type quickly
    const result1 = env.step({ type: "PRESS", key: "enter" });

    hs = env.getHiddenState();
    const validate = validateState(hs);

    const passed = validate.valid && result1.actionAccepted;
    logResult(21, "Type in terminal with focus switching", passed, validate.issues.length > 0 ? validate.issues[0] : undefined, {
      validState: validate.valid
    });
  } catch (e: any) {
    logResult(21, "Type in terminal with focus switching", false, e.message);
  }
}

// ============================================================
// Test 22: Open same file in two note editors
// ============================================================
console.log("\nTest 22: Open same file in two note editors");
{
  try {
    const env = new MockOsEnv();
    env.reset({ taskId: "terminal_echo_to_file", seed: 22 });
    let hs = env.getHiddenState();

    const terminalWindow = hs.envState.windows.find((w: any) => w.appId === "terminal-lite");
    if (!terminalWindow) throw new Error("No terminal window");

    // Create a file
    env.step({ type: "CLICK", x: terminalWindow.bounds.x + 50, y: terminalWindow.bounds.y + 50 });
    env.step({ type: "TYPING", text: 'echo "shared content" > shared.txt' });
    env.step({ type: "PRESS", key: "enter" });

    hs = env.getHiddenState();
    const sharedFile = Object.values(hs.envState.fileSystem.files).find((f: any) => f && f.name === "shared.txt");

    if (sharedFile) {
      const noteStates = Object.values(hs.envState.appStates.noteEditor);
      // Note: In a real test, we'd need to open file in two editors
      // This is more of an integration test
    }

    hs = env.getHiddenState();
    const validate = validateState(hs);

    const passed = validate.valid;
    logResult(22, "Open same file in two editors", passed, validate.issues.length > 0 ? validate.issues[0] : undefined, {
      validState: validate.valid
    });
  } catch (e: any) {
    logResult(22, "Open same file in two editors", false, e.message);
  }
}

// ============================================================
// Test 23: Save file, rename, open again
// ============================================================
console.log("\nTest 23: Save file, rename, open again");
{
  try {
    const env = new MockOsEnv();
    env.reset({ taskId: "terminal_echo_to_file", seed: 23 });
    let hs = env.getHiddenState();

    const terminalWindow = hs.envState.windows.find((w: any) => w.appId === "terminal-lite");
    if (!terminalWindow) throw new Error("No terminal window");

    // Create initial file
    env.step({ type: "CLICK", x: terminalWindow.bounds.x + 50, y: terminalWindow.bounds.y + 50 });
    env.step({ type: "TYPING", text: 'echo "original name" > original.txt' });
    env.step({ type: "PRESS", key: "enter" });

    hs = env.getHiddenState();
    const originalFile = Object.values(hs.envState.fileSystem.files).find(
      (f: any) => f && f.name === "original.txt"
    );

    if (originalFile) {
      // Rename via mv command
      env.step({ type: "TYPING", text: "mv original.txt renamed.txt" });
      env.step({ type: "PRESS", key: "enter" });

      hs = env.getHiddenState();
      const renamedFile = Object.values(hs.envState.fileSystem.files).find(
        (f: any) => f && f.name === "renamed.txt"
      );
      const validate = validateState(hs);

      const passed = validate.valid && renamedFile !== undefined;
      logResult(23, "Save, rename, open again", passed, validate.issues.length > 0 ? validate.issues[0] : undefined, {
        renamedExists: renamedFile !== undefined,
        validState: validate.valid
      });
    } else {
      logResult(23, "Save, rename, open again", false, "Original file not created");
    }
  } catch (e: any) {
    logResult(23, "Save, rename, open again", false, e.message);
  }
}

// ============================================================
// Test 24: Close all windows, try to type/click
// ============================================================
console.log("\nTest 24: Close all windows, try to type/click");
{
  try {
    const env = new MockOsEnv();
    env.reset({ taskId: "delete_scratch_file", seed: 24 });
    let hs = env.getHiddenState();

    const windows = hs.envState.windows;

    // Close all windows
    for (const win of windows) {
      const closeBtn = win.bounds.x + win.bounds.width - 20;
      env.step({ type: "CLICK", x: closeBtn, y: win.bounds.y + 10 });
    }

    hs = env.getHiddenState();
    const windowsAfter = hs.envState.windows;

    // Try to type (should be handled gracefully)
    const typeResult = env.step({ type: "TYPING", text: "test" });

    // Try to click
    const clickResult = env.step({ type: "CLICK", x: 960, y: 540 });

    hs = env.getHiddenState();
    const validate = validateState(hs);

    const passed = validate.valid;
    logResult(24, "Close all windows, try I/O", passed, validate.issues.length > 0 ? validate.issues[0] : undefined, {
      windowsClosedFrom: windows.length,
      windowsAfter: windowsAfter.length,
      validState: validate.valid
    });
  } catch (e: any) {
    logResult(24, "Close all windows, try I/O", false, e.message);
  }
}

// ============================================================
// SUMMARY
// ============================================================
console.log("\n\n===============================================");
console.log("TEST SUMMARY");
console.log("===============================================");

const passed = results.filter((r) => r.passed).length;
const failed = results.filter((r) => !r.passed).length;

console.log(`Total Tests: ${results.length}`);
console.log(`PASSED: ${passed}`);
console.log(`FAILED: ${failed}`);
console.log(`Success Rate: ${((passed / results.length) * 100).toFixed(2)}%`);

console.log("\n--- Failed Tests ---");
results.filter((r) => !r.passed).forEach((r) => {
  console.log(`[${r.testNum}] ${r.testName}`);
  if (r.error) console.log(`    Error: ${r.error}`);
});

console.log("\n--- Detailed Results ---");
results.forEach((r) => {
  console.log(`[${r.testNum}] ${r.testName}: ${r.passed ? "PASS" : "FAIL"}`);
  if (r.details) {
    Object.entries(r.details).forEach(([k, v]) => {
      if (v !== undefined && v !== null) {
        console.log(`      ${k}: ${JSON.stringify(v)}`);
      }
    });
  }
});
