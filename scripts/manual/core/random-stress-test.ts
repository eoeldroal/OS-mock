/**
 * Random stress test for Mock OS environment.
 *
 * Spawns N episodes, each with a random task and seed.
 * Each episode executes random valid actions until termination/truncation.
 * Checks for crashes, invariant violations, and edge-case bugs.
 *
 * Run: npx tsx scripts/manual/core/random-stress-test.ts [episodes=50]
 */

import { MockOsEnv } from "../../../packages/core/src/index.js";
import type { Computer13Action, A11yNode, StepResult } from "../../../packages/core/src/types.js";

const NUM_EPISODES = Number(process.argv[2]) || 50;

type Finding = {
  severity: "BUG" | "WARNING" | "CRASH";
  episode: number;
  taskId: string;
  seed: number;
  step: number;
  action: string;
  description: string;
  detail?: string;
};

const findings: Finding[] = [];

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateRandomAction(viewport: { width: number; height: number }): Computer13Action {
  const x = randomInt(0, viewport.width - 1);
  const y = randomInt(0, viewport.height - 1);

  const actionType = randomChoice([
    "CLICK", "CLICK", "CLICK",          // weight clicks higher
    "DOUBLE_CLICK",
    "RIGHT_CLICK",
    "MOVE_TO",
    "SCROLL",
    "TYPING",
    "PRESS",
    "HOTKEY",
    "MOUSE_DOWN", "MOUSE_UP",
    "DRAG_TO",
    "WAIT"
  ]);

  switch (actionType) {
    case "CLICK":
      return { type: "CLICK", x, y };
    case "DOUBLE_CLICK":
      return { type: "DOUBLE_CLICK", x, y };
    case "RIGHT_CLICK":
      return { type: "RIGHT_CLICK", x, y };
    case "MOVE_TO":
      return { type: "MOVE_TO", x, y };
    case "SCROLL":
      return { type: "SCROLL", dx: randomInt(-3, 3), dy: randomInt(-3, 3) };
    case "TYPING":
      return { type: "TYPING", text: randomChoice(["hello", "test", "a", "abc123", "file.txt", " ", "\n"]) };
    case "PRESS":
      return { type: "PRESS", key: randomChoice(["enter", "escape", "backspace", "f2", "tab"]) };
    case "HOTKEY":
      return { type: "HOTKEY", keys: randomChoice([["ctrl", "s"], ["ctrl", "c"], ["ctrl", "v"], ["ctrl", "a"]]) };
    case "MOUSE_DOWN":
      return { type: "MOUSE_DOWN", button: "left" };
    case "MOUSE_UP":
      return { type: "MOUSE_UP", button: "left" };
    case "DRAG_TO":
      return { type: "DRAG_TO", x, y };
    case "WAIT":
      return { type: "WAIT" };
    default:
      return { type: "CLICK", x, y };
  }
}

function collectAllNodes(tree: A11yNode[]): A11yNode[] {
  const result: A11yNode[] = [];
  for (const node of tree) {
    result.push(node);
    result.push(...collectAllNodes(node.children));
  }
  return result;
}

function validateInvariants(
  env: MockOsEnv,
  result: StepResult,
  episode: number,
  taskId: string,
  seed: number,
  stepIdx: number,
  action: Computer13Action
) {
  const actionStr = JSON.stringify(action);
  const hs = env.getHiddenState();

  // Invariant 1: No negative bounds in a11y tree
  const allNodes = collectAllNodes(result.observation.a11yTree);
  const badBounds = allNodes.filter(
    (n) => n.visible && (n.bounds.width < 0 || n.bounds.height < 0)
  );
  if (badBounds.length > 0) {
    findings.push({
      severity: "BUG",
      episode, taskId, seed, step: stepIdx, action: actionStr,
      description: `Negative bounds in a11y tree: ${badBounds.length} nodes`,
      detail: badBounds.map((n) => `${n.id}(${n.role}): ${n.bounds.width}x${n.bounds.height}`).join(", ")
    });
  }

  // Invariant 2: Pointer should be within viewport
  const pointer = hs.envState.pointer;
  const vp = hs.envState.viewport;
  if (pointer.x < 0 || pointer.x >= vp.width || pointer.y < 0 || pointer.y >= vp.height) {
    findings.push({
      severity: "BUG",
      episode, taskId, seed, step: stepIdx, action: actionStr,
      description: `Pointer out of bounds: (${pointer.x}, ${pointer.y}) in ${vp.width}x${vp.height}`
    });
  }

  // Invariant 3: No duplicate window IDs
  const windowIds = hs.envState.windows.map((w) => w.id);
  const uniqueIds = new Set(windowIds);
  if (uniqueIds.size !== windowIds.length) {
    findings.push({
      severity: "BUG",
      episode, taskId, seed, step: stepIdx, action: actionStr,
      description: `Duplicate window IDs: ${windowIds.join(", ")}`
    });
  }

  // Invariant 4: At most one focused window
  const focusedWindows = hs.envState.windows.filter((w) => w.focused);
  if (focusedWindows.length > 1) {
    findings.push({
      severity: "BUG",
      episode, taskId, seed, step: stepIdx, action: actionStr,
      description: `Multiple focused windows: ${focusedWindows.map((w) => w.id).join(", ")}`
    });
  }

  // Invariant 5: zIndex values should be unique among non-minimized windows
  const visibleWindows = hs.envState.windows.filter((w) => !w.minimized);
  const zIndexes = visibleWindows.map((w) => w.zIndex);
  const uniqueZ = new Set(zIndexes);
  if (uniqueZ.size !== zIndexes.length && visibleWindows.length > 0) {
    findings.push({
      severity: "WARNING",
      episode, taskId, seed, step: stepIdx, action: actionStr,
      description: `Non-unique zIndex among visible windows: ${JSON.stringify(zIndexes)}`
    });
  }

  // Invariant 6: stepIndex should match
  if (result.stepIndex !== stepIdx) {
    findings.push({
      severity: "BUG",
      episode, taskId, seed, step: stepIdx, action: actionStr,
      description: `stepIndex mismatch: expected ${stepIdx}, got ${result.stepIndex}`
    });
  }

  // Invariant 7: cumulative reward should be consistent
  if (Math.abs(hs.cumulativeReward - result.cumulativeReward) > 0.001) {
    findings.push({
      severity: "BUG",
      episode, taskId, seed, step: stepIdx, action: actionStr,
      description: `Cumulative reward mismatch: hidden=${hs.cumulativeReward}, result=${result.cumulativeReward}`
    });
  }

  // Invariant 8: Window bounds should be reasonable
  for (const win of hs.envState.windows) {
    if (!win.minimized && (win.bounds.width <= 0 || win.bounds.height <= 0)) {
      findings.push({
        severity: "BUG",
        episode, taskId, seed, step: stepIdx, action: actionStr,
        description: `Window ${win.id} has non-positive dimensions: ${win.bounds.width}x${win.bounds.height}`
      });
    }
  }

  // Invariant 9: dragState should reference existing window
  if (hs.envState.dragState) {
    const dragWin = hs.envState.windows.find((w) => w.id === hs.envState.dragState!.windowId);
    if (!dragWin) {
      findings.push({
        severity: "BUG",
        episode, taskId, seed, step: stepIdx, action: actionStr,
        description: `dragState references non-existent window: ${hs.envState.dragState.windowId}`
      });
    }
  }

  // Invariant 10: App states should have matching window entries
  for (const [appType, states] of Object.entries(hs.envState.appStates)) {
    for (const stateId of Object.keys(states as Record<string, unknown>)) {
      const matchingWindow = hs.envState.windows.find((w) => w.id === stateId);
      if (!matchingWindow) {
        findings.push({
          severity: "WARNING",
          episode, taskId, seed, step: stepIdx, action: actionStr,
          description: `Orphaned app state: ${appType}[${stateId}] has no matching window`
        });
      }
    }
  }
}

function runEpisode(episode: number) {
  const env = new MockOsEnv();
  const allTasks = env.listTasks("all");
  const task = randomChoice(allTasks);
  const seed = randomInt(0, 99);

  let stepIdx = 0;

  try {
    const resetResult = env.reset({ taskId: task.id, seed });
    validateInvariants(env, resetResult, episode, task.id, seed, 0, { type: "WAIT" });
  } catch (err) {
    findings.push({
      severity: "CRASH",
      episode, taskId: task.id, seed, step: 0, action: "reset",
      description: `Reset crashed: ${(err as Error).message}`
    });
    return { taskId: task.id, seed, steps: 0, outcome: "crash" };
  }

  let lastResult: StepResult | null = null;

  while (stepIdx < task.maxSteps + 5) {
    stepIdx++;
    const action = generateRandomAction({ width: 1280, height: 800 });

    try {
      const result = env.step(action);
      lastResult = result;
      validateInvariants(env, result, episode, task.id, seed, stepIdx, action);

      if (result.terminated || result.truncated) {
        break;
      }
    } catch (err) {
      findings.push({
        severity: "CRASH",
        episode, taskId: task.id, seed, step: stepIdx,
        action: JSON.stringify(action),
        description: `Step crashed: ${(err as Error).message}`,
        detail: (err as Error).stack
      });
      return { taskId: task.id, seed, steps: stepIdx, outcome: "crash" };
    }
  }

  // Check that perturbations don't crash
  try {
    const perturbOps = ["PopupInject", "MinimizeAll", "RandomPointerSpawn", "ZOrderShuffle"];
    for (const op of perturbOps) {
      env.reset({ taskId: task.id, seed });
      env.applyPerturbation(op);
    }
  } catch (err) {
    findings.push({
      severity: "CRASH",
      episode, taskId: task.id, seed, step: stepIdx,
      action: "perturbation",
      description: `Perturbation crashed: ${(err as Error).message}`
    });
  }

  // Check snapshot/restore doesn't crash
  try {
    env.reset({ taskId: task.id, seed });
    const snapId = env.snapshot("test");
    env.step({ type: "CLICK", x: 400, y: 300 });
    env.restore(snapId);
  } catch (err) {
    findings.push({
      severity: "CRASH",
      episode, taskId: task.id, seed, step: stepIdx,
      action: "snapshot/restore",
      description: `Snapshot/restore crashed: ${(err as Error).message}`
    });
  }

  const outcome = lastResult?.terminated ? "terminated" : lastResult?.truncated ? "truncated" : "running";
  return { taskId: task.id, seed, steps: stepIdx, outcome };
}

function main() {
  console.log(`╔════════════════════════════════════════╗`);
  console.log(`║  Random Stress Test - ${NUM_EPISODES} episodes      ║`);
  console.log(`╚════════════════════════════════════════╝`);
  console.log(``);

  const results: ReturnType<typeof runEpisode>[] = [];

  for (let i = 0; i < NUM_EPISODES; i++) {
    const result = runEpisode(i);
    results.push(result);
    if ((i + 1) % 10 === 0) {
      console.log(`  ... ${i + 1}/${NUM_EPISODES} episodes complete`);
    }
  }

  const totalSteps = results.reduce((sum, r) => sum + r.steps, 0);
  const crashes = results.filter((r) => r.outcome === "crash");
  const terminated = results.filter((r) => r.outcome === "terminated");
  const truncated = results.filter((r) => r.outcome === "truncated");
  const taskCoverage = new Set(results.map((r) => r.taskId));

  console.log(``);
  console.log(`╔════════════════════════════════════════╗`);
  console.log(`║  RESULTS                               ║`);
  console.log(`╚════════════════════════════════════════╝`);
  console.log(`  Episodes:     ${NUM_EPISODES}`);
  console.log(`  Total steps:  ${totalSteps}`);
  console.log(`  Crashes:      ${crashes.length}`);
  console.log(`  Terminated:   ${terminated.length}`);
  console.log(`  Truncated:    ${truncated.length}`);
  console.log(`  Task coverage: ${taskCoverage.size}/${new MockOsEnv().listTasks("all").length}`);
  console.log(``);

  const bugs = findings.filter((f) => f.severity === "BUG");
  const warnings = findings.filter((f) => f.severity === "WARNING");
  const crashFindings = findings.filter((f) => f.severity === "CRASH");

  if (findings.length === 0) {
    console.log(`  ✅ No issues found across ${totalSteps} random actions!`);
  } else {
    console.log(`  FINDINGS: ${bugs.length} bugs, ${warnings.length} warnings, ${crashFindings.length} crashes`);
    console.log(``);

    // Deduplicate by description
    const seen = new Set<string>();
    for (const f of findings) {
      const key = `${f.severity}:${f.description}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const icon = f.severity === "BUG" ? "🔴" : f.severity === "CRASH" ? "💥" : "⚠️";
      console.log(`  ${icon} [${f.severity}] ${f.description}`);
      console.log(`     Task: ${f.taskId} seed=${f.seed} step=${f.step}`);
      console.log(`     Action: ${f.action}`);
      if (f.detail) {
        console.log(`     Detail: ${f.detail.slice(0, 200)}`);
      }
      console.log(``);
    }
  }

  console.log(`  Total unique findings: ${new Set(findings.map((f) => `${f.severity}:${f.description}`)).size}`);
  process.exit(findings.filter((f) => f.severity === "CRASH").length > 0 ? 1 : 0);
}

main();
