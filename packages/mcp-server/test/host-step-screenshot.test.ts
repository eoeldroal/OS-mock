import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HostApp } from "../src/host.js";
import { ScreenshotService } from "../src/screenshot.js";

const tempDirs: string[] = [];

afterEach(async () => {
  vi.restoreAllMocks();
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
  delete process.env.OS_MOCK_PORT;
});

describe("HostApp step screenshots", () => {
  it("captures a fresh screenshot for each step result", async () => {
    process.env.OS_MOCK_PORT = "4491";

    const tempDir = mkdtempSync(join(tmpdir(), "host-step-screenshot-"));
    tempDirs.push(tempDir);

    const captureSpy = vi
      .spyOn(ScreenshotService.prototype, "capture")
      .mockResolvedValueOnce(join(tempDir, "frame-reset.png"))
      .mockResolvedValueOnce(join(tempDir, "frame-step.png"));

    const host = new HostApp();
    try {
      (host as unknown as { viewerLogPath?: string }).viewerLogPath = join(tempDir, "viewer.jsonl");
      writeFileSync(join(tempDir, "viewer.jsonl"), "");

      const { sessionId } = host.createSession();
      const reset = await host.reset(sessionId, "rename_note_in_explorer", 0, 0);
      const step = await host.step(sessionId, { type: "CLICK", x: 369, y: 265 });

      expect(reset.observation.screenshotPath).toBe(join(tempDir, "frame-reset.png"));
      expect(step.observation.screenshotPath).toBe(join(tempDir, "frame-step.png"));
      expect(captureSpy).toHaveBeenCalledTimes(2);
    } finally {
      await host.stop();
    }
  });
});
