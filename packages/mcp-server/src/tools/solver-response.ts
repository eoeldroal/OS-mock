import { readFile } from "node:fs/promises";
import type { Observation, StepResult } from "../../../core/src/types.js";

export type SolverObservation = Pick<Observation, "viewport" | "pointer" | "focusedWindowId">;
export type SolverTextContent = {
  type: "text";
  text: string;
};

export type SolverImageContent = {
  type: "image";
  mimeType: string;
  data: string;
};

export type SolverStepPayload = {
  task?: {
    instruction: string;
    maxSteps: number;
  };
  stepIndex: number;
  actionAccepted: boolean;
  terminated: boolean;
  truncated: boolean;
  stepsRemaining: number | null;
  observation: SolverObservation;
};

export type SolverSerializedResult = {
  payload: SolverStepPayload;
  content: Array<SolverTextContent | SolverImageContent>;
};

function sanitizeObservation(observation: Observation): SolverObservation {
  return {
    viewport: observation.viewport,
    pointer: observation.pointer,
    focusedWindowId: observation.focusedWindowId
  };
}

function sanitizeStepResult(result: StepResult): SolverStepPayload {
  const maxSteps = result.task?.maxSteps;
  return {
    task: result.task
      ? {
          instruction: result.task.instruction,
          maxSteps: result.task.maxSteps
        }
      : undefined,
    stepIndex: result.stepIndex,
    actionAccepted: result.actionAccepted,
    terminated: result.terminated,
    truncated: result.truncated,
    stepsRemaining:
      maxSteps === undefined ? null : maxSteps === 0 ? null : Math.max(0, maxSteps - result.stepIndex),
    observation: sanitizeObservation(result.observation)
  };
}

async function maybeReadScreenshotAsImageContent(
  observation: Observation
): Promise<SolverImageContent | undefined> {
  if (!observation.screenshotPath) {
    return undefined;
  }
  const bytes = await readFile(observation.screenshotPath);
  return {
    type: "image",
    mimeType: "image/png",
    data: bytes.toString("base64")
  };
}

export async function serializeSolverResult(
  result: StepResult
): Promise<SolverSerializedResult> {
  const payload = sanitizeStepResult(result);
  const image = await maybeReadScreenshotAsImageContent(result.observation);
  const content: Array<SolverTextContent | SolverImageContent> = [
    {
      type: "text",
      text: JSON.stringify(payload, null, 2)
    }
  ];
  if (image) {
    content.push(image);
  }
  return {
    payload,
    content
  };
}
