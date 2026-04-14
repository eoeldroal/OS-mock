import { describe, expect, it } from "vitest";
import { FILES_WINDOW_TASKS } from "../../src/tasks/files-window-tasks.js";
import { getFileEntry } from "../../src/system/filesystem.js";
import type { Viewport } from "../../src/types.js";

const VIEWPORT: Viewport = { width: 1280, height: 800 };

function getTask(taskId: string) {
  const task = FILES_WINDOW_TASKS.find((candidate) => candidate.id === taskId);
  expect(task, `expected task ${taskId} to exist`).toBeTruthy();
  return task!;
}

describe("files-window scenario builder regression", () => {
  it("keeps open-file tasks on the shared explorer + companion workspace", () => {
    const task = getTask("open_single_file");
    const setup = task.setup(0, VIEWPORT);

    expect(setup.targets).toMatchObject({ targetFileId: "file-target" });
    expect(getFileEntry(setup.envState.fileSystem, "file-target")?.name).toBeTruthy();
    expect(setup.envState.windows.map((window) => window.id)).toEqual(
      expect.arrayContaining(["explorer-main", "browser-main", "terminal-main", "mail-main"])
    );
    expect(setup.envState.appStates.fileExplorer["explorer-main"].selectedFileId).toBeUndefined();
  });

  it("keeps rename-preselected tasks selected through explorer scenario setup", () => {
    const task = getTask("rename_preselected");
    const setup = task.setup(0, VIEWPORT);

    expect(setup.targets).toMatchObject({
      targetFileId: "file-target",
      oldName: expect.any(String),
      newName: expect.any(String)
    });
    expect(setup.envState.appStates.fileExplorer["explorer-main"].selectedFileId).toBe("file-target");
    expect(setup.envState.windows.some((window) => window.id === "explorer-main")).toBe(true);
  });

  it("keeps dock-launch tasks file-backed but without a pre-opened explorer", () => {
    const task = getTask("dock_launch_then_open");
    const setup = task.setup(0, VIEWPORT);

    expect(setup.targets).toMatchObject({ targetFileId: "file-target" });
    expect(getFileEntry(setup.envState.fileSystem, "file-target")?.name).toBeTruthy();
    expect(setup.envState.windows.some((window) => window.id === "explorer-main")).toBe(false);
    expect(setup.envState.windows.map((window) => window.id)).toEqual(
      expect.arrayContaining(["browser-main", "terminal-main", "mail-main"])
    );
  });
});
