import { describe, expect, it } from "vitest";
import { MockOsEnv } from "../../src/env/session.js";
import { evaluateTaskState } from "../../src/env/evaluator.js";
import {
  cloneFileSystem,
  createEmptyFileSystemState,
  createFileEntry,
  getFileEntry,
  getFilesInDirectory,
  getOrderedFiles,
  insertFileEntry,
  renameFile,
  setWorkingDirectory
} from "../../src/system/filesystem.js";

describe("filesystem tree-first regression coverage", () => {
  it("materializes ordered files and directory listings from authoritative tree nodes even when legacy caches are stale", () => {
    let fileSystem = createEmptyFileSystemState();
    fileSystem = insertFileEntry(
      fileSystem,
      createFileEntry("file-alpha", "alpha.txt", "alpha", "/workspace")
    );
    fileSystem = insertFileEntry(
      fileSystem,
      createFileEntry("file-notes", "notes.txt", "notes", "/workspace/docs")
    );
    fileSystem = setWorkingDirectory(fileSystem, "/workspace/docs");

    const stale = cloneFileSystem(fileSystem);
    stale.files = {
      "file-alpha": {
        id: "file-alpha",
        name: "stale-alpha.txt",
        directory: "/wrong",
        path: "/wrong/stale-alpha.txt",
        content: "stale",
        kind: "file"
      }
    };
    stale.order = ["file-alpha"];
    stale.directoryChildren = { "/wrong": ["file-alpha"] };
    stale.cwd = "/wrong";

    expect(getOrderedFiles(stale).map((file) => file.path)).toEqual([
      "/workspace/alpha.txt",
      "/workspace/docs",
      "/workspace/docs/notes.txt"
    ]);
    expect(getFilesInDirectory(stale, "/workspace").map((file) => file.name)).toEqual([
      "alpha.txt",
      "docs"
    ]);
    expect(getFilesInDirectory(stale, "/workspace/docs").map((file) => file.name)).toEqual([
      "notes.txt"
    ]);
    expect(getFileEntry(stale, "file-alpha")?.path).toBe("/workspace/alpha.txt");
  });

  it("lets evaluator file predicates follow tree-backed helpers even when compatibility caches disagree", () => {
    const env = new MockOsEnv();
    env.reset({ taskId: "rename_note_in_explorer", seed: 0, maxSteps: 0 });

    const task = env.getTask();
    expect(task).toBeTruthy();

    const hidden = structuredClone(env.getHiddenState());
    const targetFileId = hidden.targets.targetFileId;
    const renamedFileSystem = renameFile(hidden.envState.fileSystem, targetFileId, hidden.targets.newName);
    const stale = cloneFileSystem(renamedFileSystem);

    stale.files[targetFileId] = {
      id: targetFileId,
      name: hidden.targets.oldName,
      directory: "/workspace",
      path: `/workspace/${hidden.targets.oldName}`,
      content: "Draft body",
      kind: "file"
    };

    const result = evaluateTaskState(
      {
        ...hidden.envState,
        fileSystem: stale
      },
      task!,
      hidden.targets,
      []
    );

    expect(result.progress).toContain("file.renamed");
    expect(result.goalSatisfied).toBe(true);
  });
});
