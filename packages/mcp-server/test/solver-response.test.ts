import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import type { StepResult } from "../../core/src/types.js";
import { serializeSolverResult } from "../src/tools/solver-response.js";

const tempDirs: string[] = [];

function createStepResult(screenshotPath?: string): StepResult {
  return {
    task: {
      id: "secret-task-id",
      instruction: "Do the thing.",
      maxSteps: 64
    },
    stepIndex: 3,
    actionAccepted: true,
    reward: 0.2,
    cumulativeReward: 0.4,
    terminated: false,
    truncated: false,
    observation: {
      viewport: { width: 1280, height: 800 },
      screenshotPath,
      viewerUrl: "http://127.0.0.1:4315/session/s1",
      pointer: { x: 12, y: 34 },
      focusedWindowId: "browser-main",
      a11yTree: [
        {
          id: "desktop",
          role: "desktop",
          name: "Desktop",
          bounds: { x: 0, y: 0, width: 1280, height: 800 },
          visible: true,
          enabled: true,
          focusable: false,
          focused: false,
          children: []
        }
      ],
      browserAugmentations: [
        {
          windowId: "browser-main",
          source: "hybrid-dom",
          strategy: "replace-content",
          contentBounds: { x: 10, y: 10, width: 100, height: 100 },
          nodes: []
        }
      ]
    },
    info: {
      lastProgress: ["browser.help_page_opened"],
      lastViolations: [],
      focusChanged: false,
      actionSummary: "browser_navigation"
    }
  };
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe("serializeSolverResult", () => {
  it("removes debug-only fields and task id from solver payload", async () => {
    const dir = mkdtempSync(join(tmpdir(), "solver-response-"));
    tempDirs.push(dir);
    const screenshotPath = join(dir, "frame.png");
    writeFileSync(screenshotPath, Buffer.from("89504e470d0a1a0a", "hex"));

    const serialized = await serializeSolverResult(createStepResult(screenshotPath));
    const payload = JSON.parse(serialized.content.find((entry) => entry.type === "text")!.text);

    expect(payload.task).toEqual({
      instruction: "Do the thing.",
      maxSteps: 64
    });
    expect(payload.stepsRemaining).toBe(61);
    expect(payload.observation).toEqual({
      viewport: { width: 1280, height: 800 },
      pointer: { x: 12, y: 34 },
      focusedWindowId: "browser-main"
    });
    expect(payload).not.toHaveProperty("reward");
    expect(payload).not.toHaveProperty("cumulativeReward");
    expect(JSON.stringify(payload)).not.toContain("secret-task-id");
    expect(JSON.stringify(payload)).not.toContain("viewerUrl");
    expect(JSON.stringify(payload)).not.toContain("screenshotPath");
    expect(JSON.stringify(payload)).not.toContain("a11yTree");
    expect(JSON.stringify(payload)).not.toContain("browserAugmentations");

    const image = serialized.content.find((entry) => entry.type === "image");
    expect(image).toBeTruthy();
    expect(image).toMatchObject({
      type: "image",
      mimeType: "image/png"
    });
  });

  it("omits image content when no screenshot is available", async () => {
    const serialized = await serializeSolverResult(createStepResult());
    expect(serialized.content.some((entry) => entry.type === "image")).toBe(false);
  });
});
