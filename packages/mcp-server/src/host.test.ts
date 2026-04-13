import { afterEach, describe, expect, it, vi } from "vitest";
import { HostApp } from "./host.js";

const hosts: HostApp[] = [];

describe("HostApp", () => {
  afterEach(async () => {
    vi.restoreAllMocks();
    while (hosts.length > 0) {
      const host = hosts.pop();
      if (host) {
        await host.stop().catch(() => undefined);
      }
    }
  });

  it("decorates MCP step results with screenshotPath and viewerUrl", async () => {
    const host = new HostApp();
    hosts.push(host);
    vi.spyOn((host as any).screenshotService, "capture").mockResolvedValue("/tmp/mock-step.png");

    const { sessionId, viewerUrl } = host.createSession();
    await host.reset(sessionId, "rename_note_in_explorer", 0);
    const result = await host.step(sessionId, { type: "WAIT" });

    expect(result.observation.viewerUrl).toBe(viewerUrl);
    expect(result.observation.screenshotPath).toBe("/tmp/mock-step.png");
  });

  it("returns viewer metadata without forcing screenshot capture for viewer actions", async () => {
    const host = new HostApp();
    hosts.push(host);
    const captureSpy = vi
      .spyOn((host as any).screenshotService, "capture")
      .mockResolvedValue("/tmp/mock-viewer.png");

    const { sessionId, viewerUrl } = host.createSession();
    await host.reset(sessionId, "rename_note_in_explorer", 0);
    captureSpy.mockClear();

    const result = await host.viewerAction(sessionId, { type: "WAIT" });

    expect(result.observation.viewerUrl).toBe(viewerUrl);
    expect(result.observation.screenshotPath).toBeUndefined();
    expect(captureSpy).not.toHaveBeenCalled();
  });
});
