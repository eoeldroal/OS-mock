import { describe, expect, it } from "vitest";
import { MockOsEnv } from "../src/env/session.js";
import {
  solveBrowserCaptureHelpLine,
  solveBrowserLogWorkflowTaskId,
  runScriptedPolicyDemo,
  solveCopyLineBetweenWindows,
  solveDismissPopupThenAppendNote,
  solveMailExtractMockNote,
  solveMinimizeRecoverAndSave,
  solveRenameNoteInExplorer,
  solveTerminalRecordWorkingDirectory
} from "../src/demo.js";

describe("MockOsEnv", () => {
  it("resets deterministically for the same task and seed", () => {
    const left = new MockOsEnv();
    const right = new MockOsEnv();
    const leftResult = left.reset({ taskId: "dismiss_popup_then_append_note", seed: 1 });
    const rightResult = right.reset({ taskId: "dismiss_popup_then_append_note", seed: 1 });

    expect(leftResult.observation.a11yTree).toEqual(rightResult.observation.a11yTree);
    expect(left.getRenderModel()).toEqual(right.getRenderModel());
  });

  it("applies perturbations and snapshot restore", () => {
    const env = new MockOsEnv();
    env.reset({ taskId: "rename_note_in_explorer", seed: 0 });
    const snapshotId = env.snapshot("before");
    env.applyPerturbation("PopupInject", { title: "Injected", message: "Noise" });
    expect(env.getHiddenState().envState.popups).toHaveLength(1);
    env.restore(snapshotId);
    expect(env.getHiddenState().envState.popups).toHaveLength(0);
  });

  it("solves all starter and representative tasks with scripted policies", () => {
    const results = [
      solveDismissPopupThenAppendNote(),
      solveRenameNoteInExplorer(),
      solveCopyLineBetweenWindows(),
      solveMinimizeRecoverAndSave(),
      solveBrowserLogWorkflowTaskId(),
      solveBrowserCaptureHelpLine(),
      solveMailExtractMockNote(),
      solveTerminalRecordWorkingDirectory()
    ];

    for (const result of results) {
      expect(result.terminated).toBe(true);
      expect(result.reward).toBeGreaterThan(0);
    }
  });

  it("runs the combined scripted demo", () => {
    const results = runScriptedPolicyDemo();
    expect(Object.values(results).every((result) => result.terminated)).toBe(true);
  });

  it("supports window controls and pinned dock relaunch", () => {
    const env = new MockOsEnv();
    env.reset({ taskId: "rename_note_in_explorer", seed: 0 });

    let render = env.getRenderModel();
    const filesWindow = render.windows.find((window) => window.appId === "file-explorer");
    const browserWindow = render.windows.find((window) => window.appId === "browser-lite");

    expect(filesWindow).toBeTruthy();
    expect(browserWindow).toBeTruthy();

    env.step({
      type: "CLICK",
      x: filesWindow!.maximizeButtonBounds.x + 6,
      y: filesWindow!.maximizeButtonBounds.y + 6
    });
    render = env.getRenderModel();
    const maximizedFiles = render.windows.find((window) => window.id === filesWindow!.id);
    expect(maximizedFiles?.maximized).toBe(true);

    env.step({
      type: "CLICK",
      x: maximizedFiles!.maximizeButtonBounds.x + 6,
      y: maximizedFiles!.maximizeButtonBounds.y + 6
    });
    render = env.getRenderModel();
    const restoredFiles = render.windows.find((window) => window.id === filesWindow!.id);
    expect(restoredFiles?.maximized).toBe(false);
    expect(restoredFiles?.bounds).toEqual(filesWindow!.bounds);

    env.step({
      type: "CLICK",
      x: restoredFiles!.minimizeButtonBounds.x + 6,
      y: restoredFiles!.minimizeButtonBounds.y + 6
    });
    render = env.getRenderModel();
    expect(render.windows.find((window) => window.id === filesWindow!.id)?.minimized).toBe(true);

    const filesDock = render.taskbarItems.find((item) => item.appId === "file-explorer" && item.pinned);
    env.step({
      type: "CLICK",
      x: filesDock!.bounds.x + 20,
      y: filesDock!.bounds.y + 20
    });
    render = env.getRenderModel();
    expect(render.windows.find((window) => window.id === filesWindow!.id)?.minimized).toBe(false);

    env.step({
      type: "CLICK",
      x: browserWindow!.closeButtonBounds.x + 6,
      y: browserWindow!.closeButtonBounds.y + 6
    });
    render = env.getRenderModel();
    expect(render.windows.some((window) => window.id === browserWindow!.id)).toBe(false);

    const browserDock = render.taskbarItems.find((item) => item.appId === "browser-lite" && item.pinned);
    env.step({
      type: "CLICK",
      x: browserDock!.bounds.x + 20,
      y: browserDock!.bounds.y + 20
    });
    render = env.getRenderModel();
    expect(render.windows.some((window) => window.appId === "browser-lite" && !window.minimized)).toBe(true);
  });
});
