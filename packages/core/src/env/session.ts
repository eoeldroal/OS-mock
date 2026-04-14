import { COMPUTER_13_SCHEMA } from "../action-space.js";
import { finalizeObservation } from "../observation/index.js";
import { applyPerturbation, listPerturbations } from "./perturbations.js";
import { buildObservation, buildRenderModel } from "./observation.js";
import { reduceEnvState } from "./reducer.js";
import { evaluateTaskState } from "./evaluator.js";
import { createEmptyEnv, DEFAULT_VIEWPORT } from "./factory.js";
import { getTaskSpec, listTasks, sampleTask, type TaskSplit } from "../tasks/registry.js";
import type {
  Computer13Action,
  EnvState,
  RenderModel,
  SessionSnapshot,
  StepResult,
  TaskSpec,
  Viewport
} from "../types.js";

function createEmptyInfo() {
  return {
    lastProgress: [],
    lastViolations: [],
    focusChanged: false,
    actionSummary: "observe"
  };
}

export class MockOsEnv {
  private currentTask?: TaskSpec;
  private envState: EnvState;
  private targets: Record<string, string>;
  private seed = 0;
  private stepIndex = 0;
  private cumulativeReward = 0;
  private achievedProgress: string[] = [];
  private terminated = false;
  private truncated = false;
  private snapshots = new Map<string, SessionSnapshot>();

  constructor(private readonly viewport: Viewport = DEFAULT_VIEWPORT) {
    this.envState = createEmptyEnv(viewport);
    this.targets = {};
  }

  listTasks(split: TaskSplit = "all") {
    return listTasks(split);
  }

  getActionSpace() {
    return {
      ...COMPUTER_13_SCHEMA,
      perturbations: listPerturbations()
    };
  }

  getTask() {
    return this.currentTask;
  }

  getRenderModel(): RenderModel {
    return buildRenderModel(this.envState, this.stepIndex, this.currentTask);
  }

  getHiddenState() {
    return {
      taskId: this.currentTask?.id,
      seed: this.seed,
      stepIndex: this.stepIndex,
      cumulativeReward: this.cumulativeReward,
      achievedProgress: this.achievedProgress,
      terminated: this.terminated,
      truncated: this.truncated,
      targets: this.targets,
      envState: this.envState
    };
  }

  observe(extras?: { screenshotPath?: string; viewerUrl?: string }): StepResult {
    return {
      task: this.currentTask
        ? {
            id: this.currentTask.id,
            instruction: this.envState.instruction ?? this.currentTask.instruction,
            maxSteps: this.currentTask.maxSteps
          }
        : undefined,
      stepIndex: this.stepIndex,
      actionAccepted: true,
      reward: 0,
      cumulativeReward: this.cumulativeReward,
      terminated: this.terminated,
      truncated: this.truncated,
      observation: finalizeObservation(
        buildObservation(this.envState, this.stepIndex, this.currentTask, extras)
      ),
      info: createEmptyInfo()
    };
  }

  reset(opts: { taskId: string; seed: number; maxSteps?: number }): StepResult {
    this.currentTask = getTaskSpec(opts.taskId);
    if (opts.maxSteps !== undefined) {
      // Override task's maxSteps. 0 means unlimited (no truncation).
      this.currentTask = { ...this.currentTask, maxSteps: opts.maxSteps };
    }
    this.seed = opts.seed;
    const setup = this.currentTask.setup(opts.seed, this.viewport);
    this.envState = structuredClone(setup.envState);
    this.envState.instruction = this.envState.instruction ?? this.currentTask.instruction;
    this.targets = setup.targets;
    this.stepIndex = 0;
    this.cumulativeReward = 0;
    this.achievedProgress = [];
    this.terminated = false;
    this.truncated = false;
    this.snapshots.clear();
    return this.observe();
  }

  sampleTask(seed = 0, split: TaskSplit = "all") {
    return sampleTask(seed, split);
  }

  applyPerturbation(op: string, params?: Record<string, unknown>) {
    this.envState = applyPerturbation(this.envState, op, params);
    return this.observe();
  }

  snapshot(name?: string) {
    const snapshotId = `${name ?? "snapshot"}-${this.snapshots.size + 1}`;
    this.snapshots.set(snapshotId, {
      envState: structuredClone(this.envState),
      stepIndex: this.stepIndex,
      cumulativeReward: this.cumulativeReward,
      achievedProgress: [...this.achievedProgress],
      terminated: this.terminated,
      truncated: this.truncated
    });
    return snapshotId;
  }

  restore(snapshotId: string) {
    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot) {
      throw new Error(`Unknown snapshot: ${snapshotId}`);
    }
    this.envState = structuredClone(snapshot.envState);
    this.stepIndex = snapshot.stepIndex;
    this.cumulativeReward = snapshot.cumulativeReward;
    this.achievedProgress = [...snapshot.achievedProgress];
    this.terminated = snapshot.terminated;
    this.truncated = snapshot.truncated;
    return this.observe();
  }

  step(action: Computer13Action): StepResult {
    if (!this.currentTask) {
      throw new Error("No task loaded. Call reset() first.");
    }
    if (this.terminated || this.truncated) {
      return {
        ...this.observe(),
        actionAccepted: false
      };
    }

    const reduced = reduceEnvState(this.envState, action);
    this.envState = reduced.envState;
    this.stepIndex += 1;

    for (const scheduled of this.currentTask.scheduledPerturbations ?? []) {
      if (scheduled.stepIndex === this.stepIndex) {
        this.envState = applyPerturbation(this.envState, scheduled.op, scheduled.params);
      }
    }

    const evaluation = evaluateTaskState(
      this.envState,
      this.currentTask,
      this.targets,
      this.achievedProgress
    );

    let reward = evaluation.progress.length * 0.1 - evaluation.violations.length * 0.1;
    this.achievedProgress.push(...evaluation.progress);

    if (action.type === "DONE") {
      this.terminated = true;
      reward += evaluation.goalSatisfied ? 1 : -0.5;
    } else if (action.type === "FAIL") {
      this.terminated = true;
      reward -= 0.25;
    }

    // maxSteps === 0 means unlimited (no truncation)
    if (this.currentTask.maxSteps > 0 && this.stepIndex >= this.currentTask.maxSteps && !this.terminated) {
      this.truncated = true;
    }

    this.cumulativeReward += reward;

    return {
      task: {
        id: this.currentTask.id,
        instruction: this.envState.instruction ?? this.currentTask.instruction,
        maxSteps: this.currentTask.maxSteps
      },
      stepIndex: this.stepIndex,
      actionAccepted: reduced.actionAccepted,
      reward,
      cumulativeReward: this.cumulativeReward,
      terminated: this.terminated,
      truncated: this.truncated,
      observation: finalizeObservation(
        buildObservation(this.envState, this.stepIndex, this.currentTask)
      ),
      info: {
        lastProgress: evaluation.progress,
        lastViolations: evaluation.violations,
        focusChanged: reduced.focusChanged,
        actionSummary: reduced.actionSummary
      }
    };
  }
}
