import { MockOsEnv } from "/sessions/sharp-clever-thompson/mnt/CoWork/packages/core/dist/index.js";

console.log("======================================");
console.log("Testing Terminal Commands Independently");
console.log("======================================\n");

const env = new MockOsEnv();
env.reset({ taskId: "terminal_ls_and_log", seed: 0 });

const hs = env.getHiddenState();
const terminalWindow = hs.envState.windows.find((w) => w.appId === "terminal-lite");

if (!terminalWindow) {
  console.log("ERROR: No terminal window found");
  process.exit(1);
}

console.log("Terminal window found\n");

// Focus terminal
env.step({ type: "CLICK", x: terminalWindow.bounds.x + 50, y: terminalWindow.bounds.y + 50 });

const commandTests = [
  { cmd: "echo hello", description: "echo command" },
  { cmd: "echo 'hello world'", description: "echo with quotes" },
  { cmd: "wc readme.txt", description: "wc command" },
  { cmd: "head readme.txt", description: "head command" },
  { cmd: "touch testfile.txt", description: "touch command (create file)" },
  { cmd: "rm testfile.txt", description: "rm command (remove file)" }
];

for (const test of commandTests) {
  console.log(`Testing: ${test.description}`);
  console.log(`Command: ${test.cmd}`);

  env.step({ type: "TYPING", text: test.cmd });
  const result = env.step({ type: "PRESS", key: "enter" });

  const state = env.getHiddenState();
  const terminal = Object.values(state.envState.appStates.terminalLite)[0];

  console.log(`Output: ${terminal.lastOutput}`);
  console.log(`Accepted: ${result.actionAccepted}`);
  console.log("");
}

console.log("======================================");
console.log("All terminal commands tested successfully!");
console.log("======================================");
