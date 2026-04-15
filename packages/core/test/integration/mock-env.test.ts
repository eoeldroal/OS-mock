import { describe, expect, it } from "vitest";
import {
  DEFAULT_BROWSER_EXTERNAL_PAGE_TITLE,
  DEFAULT_BROWSER_EXTERNAL_PAGE_URL
} from "../../src/apps/browser-defaults.js";
import {
  addBrowserWindow,
  addFiles,
  addMailWindow,
  addNoteEditorWindow,
  createEmptyEnv,
  createFile,
  DEFAULT_VIEWPORT
} from "../../src/env/factory.js";
import { MockOsEnv } from "../../src/env/session.js";
import { getOrderedFiles } from "../../src/system/filesystem.js";
import { getTaskbarItems, focusWindow } from "../../src/system/window-manager.js";
import type { A11yNode } from "../../src/types.js";
import {
  runScriptedPolicyDemo,
  solveCopyLineBetweenWindows,
  solveDismissPopupThenAppendNote,
  solveMailExtractMockNote,
  solveMinimizeRecoverAndSave,
  solveRenameNoteInExplorer,
  solveTerminalRecordWorkingDirectory
} from "../../src/demo.js";
import { getTaskSpec } from "../../src/tasks/registry.js";

function flattenA11y(nodes: A11yNode[]): A11yNode[] {
  return nodes.flatMap((node) => [node, ...flattenA11y(node.children)]);
}

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
      solveMailExtractMockNote(),
      solveTerminalRecordWorkingDirectory()
    ];

    for (const result of results) {
      expect(result.terminated).toBe(true);
      expect(result.reward).toBeGreaterThan(0);
    }
  });

  it("initializes browser windows with the safer real-web default page", () => {
    const env = addBrowserWindow(createEmptyEnv(DEFAULT_VIEWPORT), "browser-main", {
      x: 120,
      y: 80,
      width: 720,
      height: 520
    });
    const browser = env.appStates.browserLite["browser-main"];

    expect(browser.url).toBe(DEFAULT_BROWSER_EXTERNAL_PAGE_URL);
    expect(browser.addressInput).toBe(DEFAULT_BROWSER_EXTERNAL_PAGE_URL);
    expect(browser.pageTitle).toBe(DEFAULT_BROWSER_EXTERNAL_PAGE_TITLE);
    expect(browser.tabs[0]?.title).toBe(DEFAULT_BROWSER_EXTERNAL_PAGE_TITLE);
  });

  it("keeps note dock items in a stable file-based order and exposes visible badge labels", () => {
    let env = createEmptyEnv(DEFAULT_VIEWPORT);
    env = addFiles(env, [
      createFile("file-draft", "draft.txt", "Draft"),
      createFile("file-reference", "reference.txt", "Reference")
    ]);
    env = addNoteEditorWindow(env, "notes-draft", "file-draft", { x: 120, y: 90, width: 320, height: 360 }, true);
    env = addNoteEditorWindow(env, "notes-reference", "file-reference", { x: 460, y: 90, width: 320, height: 360 }, false);

    const initialItems = getTaskbarItems(env).filter((item) => item.appId === "note-editor");
    expect(initialItems.map((item) => item.title)).toEqual(["draft.txt", "reference.txt"]);
    expect(initialItems.map((item) => item.badgeLabel)).toEqual(["DRA", "REF"]);

    const refocused = focusWindow(env, "notes-reference");
    const refocusedItems = getTaskbarItems(refocused).filter((item) => item.appId === "note-editor");
    expect(refocusedItems.map((item) => item.title)).toEqual(["draft.txt", "reference.txt"]);
  });

  it("derives default Thunderbird folder counts from the actual message list", () => {
    const env = addMailWindow(createEmptyEnv(DEFAULT_VIEWPORT), "mail-main", {
      x: 84,
      y: 82,
      width: 960,
      height: 540
    });
    const mail = env.appStates.mailLite["mail-main"];

    expect(mail.folders).toEqual([
      { id: "inbox", name: "Inbox", unread: 2 },
      { id: "drafts", name: "Drafts", unread: 0 },
      { id: "sent", name: "Sent", unread: 0 },
      { id: "archive", name: "Archive", unread: 0 }
    ]);
  });

  it("starts browser web tasks from the safer real-web landing page before local navigation", () => {
    const taskIds = [
      "browser_open_briefing_heading_to_note",
      "browser_catalog_owner_to_note",
      "browser_intake_confirmation_to_note",
      "browser_catalog_audit_append_save"
    ] as const;

    for (const taskId of taskIds) {
      const setup = getTaskSpec(taskId).setup(0, DEFAULT_VIEWPORT);
      const browser = setup.envState.appStates.browserLite["browser-main"];

      expect(browser.url).toBe(DEFAULT_BROWSER_EXTERNAL_PAGE_URL);
      expect(browser.pageTitle).toBe(DEFAULT_BROWSER_EXTERNAL_PAGE_TITLE);
      expect(browser.currentPage).toBe("external");
    }
  });

  it("uses task-completion summaries for non-terminal DONE actions", () => {
    expect(solveRenameNoteInExplorer().info.actionSummary).toBe("task_completed");

    const incomplete = new MockOsEnv();
    incomplete.reset({ taskId: "rename_note_in_explorer", seed: 0 });
    expect(incomplete.step({ type: "DONE" }).info.actionSummary).toBe("task_done_without_goal");
  });

  it("keeps terminal completion summaries for terminal-like tasks", () => {
    expect(solveTerminalRecordWorkingDirectory().info.actionSummary).toBe("terminal_task_completed");
  });

  it("labels note typing as text changes before cursor movement side effects", () => {
    const env = new MockOsEnv();
    env.reset({ taskId: "copy_line_between_windows", seed: 0, maxSteps: 0 });

    const typed = env.step({ type: "TYPING", text: "x" });

    expect(typed.actionAccepted).toBe(true);
    expect(typed.info.actionSummary).toBe("text_changed");
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

    const focusBrowserDock = render.taskbarItems.find((item) => item.appId === "browser-lite" && item.pinned);
    env.step({
      type: "CLICK",
      x: focusBrowserDock!.bounds.x + 20,
      y: focusBrowserDock!.bounds.y + 20
    });
    render = env.getRenderModel();
    const focusedBrowser = render.windows.find((window) => window.id === browserWindow!.id);

    env.step({
      type: "CLICK",
      x: focusedBrowser!.closeButtonBounds.x + 6,
      y: focusedBrowser!.closeButtonBounds.y + 6
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

  it("supports dragging a window through the mouse action sequence", () => {
    const env = new MockOsEnv();
    env.reset({ taskId: "rename_note_in_explorer", seed: 0 });

    const explorerWindow = env.getRenderModel().windows.find((window) => window.appId === "file-explorer");
    expect(explorerWindow).toBeTruthy();

    const dragStart = {
      x: explorerWindow!.titleBarBounds.x + Math.round(explorerWindow!.titleBarBounds.width / 2),
      y: explorerWindow!.titleBarBounds.y + Math.round(explorerWindow!.titleBarBounds.height / 2)
    };

    env.step({ type: "MOVE_TO", x: dragStart.x, y: dragStart.y });
    env.step({ type: "MOUSE_DOWN", button: "left" });
    const dragResult = env.step({ type: "DRAG_TO", x: dragStart.x + 180, y: dragStart.y + 96 });
    env.step({ type: "MOUSE_UP", button: "left" });

    const movedWindow = env.getRenderModel().windows.find((window) => window.id === explorerWindow!.id);
    const browserWindow = env.getRenderModel().windows.find((window) => window.appId === "browser-lite");
    expect(movedWindow?.bounds.x).toBe(272);
    expect(movedWindow?.bounds.y).toBe(180);
    expect(movedWindow!.zIndex).toBeGreaterThan(browserWindow!.zIndex);
    expect(dragResult.actionAccepted).toBe(true);
    expect(dragResult.info.actionSummary).toBe("window_dragged");
  });

  it("supports dragging a window through one atomic DRAG action", () => {
    const env = new MockOsEnv();
    env.reset({ taskId: "rename_note_in_explorer", seed: 0, maxSteps: 0 });

    const explorerWindow = env.getRenderModel().windows.find((window) => window.appId === "file-explorer");
    expect(explorerWindow).toBeTruthy();

    const dragStart = {
      x: explorerWindow!.titleBarBounds.x + Math.round(explorerWindow!.titleBarBounds.width / 2),
      y: explorerWindow!.titleBarBounds.y + Math.round(explorerWindow!.titleBarBounds.height / 2)
    };

    const dragResult = env.step({
      type: "DRAG",
      x1: dragStart.x,
      y1: dragStart.y,
      x2: dragStart.x + 180,
      y2: dragStart.y + 96
    });

    const movedWindow = env.getRenderModel().windows.find((window) => window.id === explorerWindow!.id);
    const browserWindow = env.getRenderModel().windows.find((window) => window.appId === "browser-lite");
    expect(movedWindow?.bounds.x).toBe(272);
    expect(movedWindow?.bounds.y).toBe(180);
    expect(movedWindow!.zIndex).toBeGreaterThan(browserWindow!.zIndex);
    expect(dragResult.actionAccepted).toBe(true);
    expect(dragResult.info.actionSummary).toBe("window_dragged");
    expect(dragResult.stepIndex).toBe(1);
    expect(env.getHiddenState().stepIndex).toBe(1);
  });

  it("applies external browser runtime sync before evaluating task progress", () => {
    const env = new MockOsEnv();
    env.reset({ taskId: "browser_catalog_owner_to_note", seed: 0, maxSteps: 0 });

    const synced = env.step(
      { type: "WAIT" },
      {
        externalBrowserRuntimeSync: [
          {
            windowId: "browser-main",
            url: "osmock://browser-fixtures/catalog#entry=kernel-backlog",
            pageTitle: "Ops Catalog",
            addressInput: "osmock://browser-fixtures/catalog#entry=kernel-backlog",
            activeTabTitle: "Ops Catalog"
          }
        ]
      }
    );

    expect(synced.info.lastProgress).toContain("browser.url_matches");
    expect(env.getHiddenState().envState.appStates.browserLite["browser-main"].url).toContain("#entry=kernel-backlog");
  });

  it("snaps a dragged window to maximize when released at the top edge", () => {
    const env = new MockOsEnv();
    env.reset({ taskId: "rename_note_in_explorer", seed: 0, maxSteps: 0 });

    const explorerWindow = env.getRenderModel().windows.find((window) => window.appId === "file-explorer");
    expect(explorerWindow).toBeTruthy();

    const dragStart = {
      x: explorerWindow!.titleBarBounds.x + Math.round(explorerWindow!.titleBarBounds.width / 2),
      y: explorerWindow!.titleBarBounds.y + Math.round(explorerWindow!.titleBarBounds.height / 2)
    };

    env.step({ type: "MOVE_TO", x: dragStart.x, y: dragStart.y });
    env.step({ type: "MOUSE_DOWN", button: "left" });
    env.step({ type: "DRAG_TO", x: dragStart.x, y: 6 });
    const release = env.step({ type: "MOUSE_UP", button: "left" });

    const snappedWindow = env.getRenderModel().windows.find((window) => window.appId === "file-explorer");
    expect(snappedWindow?.maximized).toBe(true);
    expect(release.info.actionSummary).toBe("window_state_changed");
  });

  it("supports selecting and copying source lines across terminal and mail surfaces", () => {
    const terminalEnv = new MockOsEnv();
    terminalEnv.reset({ taskId: "terminal_record_working_directory", seed: 0 });
    const terminalBox = terminalEnv
      .observe()
      .observation.a11yTree;
    const terminalSession = flattenA11y(terminalBox)
      .find((node) => node.role === "textbox" && node.name === "Terminal session");
    terminalEnv.step({
      type: "CLICK",
      x: terminalSession!.bounds.x + 12,
      y: terminalSession!.bounds.y + 12
    });
    terminalEnv.step({ type: "TYPING", text: "pwd" });
    terminalEnv.step({ type: "PRESS", key: "enter" });
    const terminalLine = flattenA11y(terminalEnv.observe().observation.a11yTree)
      .find((node) => node.role === "label" && node.text === "/workspace");
    terminalEnv.step({
      type: "CLICK",
      x: terminalLine!.bounds.x + Math.round(terminalLine!.bounds.width / 2),
      y: terminalLine!.bounds.y + Math.round(terminalLine!.bounds.height / 2)
    });
    const terminalCopy = terminalEnv.step({ type: "HOTKEY", keys: ["ctrl", "c"] });
    expect(terminalEnv.getHiddenState().envState.clipboard.text).toBe("/workspace");
    expect(terminalCopy.info.actionSummary).toBe("clipboard_changed");

    const mailEnv = new MockOsEnv();
    mailEnv.reset({ taskId: "mail_extract_mock_note", seed: 0 });
    const mailHidden = mailEnv.getHiddenState();
    const mailMessage = flattenA11y(mailEnv.observe().observation.a11yTree)
      .find(
        (node) => node.role === "listitem" && node.id.endsWith(mailHidden.targets.targetMessageId)
      );
    mailEnv.step({
      type: "CLICK",
      x: mailMessage!.bounds.x + Math.round(mailMessage!.bounds.width / 2),
      y: mailMessage!.bounds.y + Math.round(mailMessage!.bounds.height / 2)
    });
    const previewLine = flattenA11y(mailEnv.observe().observation.a11yTree)
      .find(
        (node) =>
          node.role === "label" &&
          node.text === mailHidden.targets.appendText
      );
    mailEnv.step({
      type: "CLICK",
      x: previewLine!.bounds.x + Math.round(previewLine!.bounds.width / 2),
      y: previewLine!.bounds.y + Math.round(previewLine!.bounds.height / 2)
    });
    const mailCopy = mailEnv.step({ type: "HOTKEY", keys: ["ctrl", "c"] });
    expect(mailEnv.getHiddenState().envState.clipboard.text).toBe(mailHidden.targets.appendText);
    expect(mailCopy.info.actionSummary).toBe("clipboard_changed");
  });

  it("allocates deterministic runtime file ids and directories for terminal-created files", () => {
    const runTouchFlow = () => {
      const env = new MockOsEnv();
      env.reset({ taskId: "terminal_record_working_directory", seed: 0 });

      const terminalSession = flattenA11y(env.observe().observation.a11yTree).find(
        (node) => node.role === "textbox" && node.name === "Terminal session"
      );
      expect(terminalSession).toBeTruthy();

      env.step({
        type: "CLICK",
        x: terminalSession!.bounds.x + 12,
        y: terminalSession!.bounds.y + 12
      });
      env.step({ type: "TYPING", text: "touch created.txt" });
      env.step({ type: "PRESS", key: "enter" });

      const created = getOrderedFiles(env.getHiddenState().envState.fileSystem).find((file) => file.name === "created.txt");
      expect(created).toBeTruthy();

      return {
        id: created!.id,
        directory: created!.directory,
        path: created!.path,
        kind: created!.kind
      };
    };

    const left = runTouchFlow();
    const right = runTouchFlow();

    expect(left).toEqual(right);
    expect(left.directory).toBe("/workspace");
    expect(left.path).toBe("/workspace/created.txt");
    expect(left.kind).toBe("file");
  });

  it("supports shell-like cwd changes and folder creation in terminal", () => {
    const env = new MockOsEnv();
    env.reset({ taskId: "terminal_record_working_directory", seed: 0 });

    const terminalSession = flattenA11y(env.observe().observation.a11yTree).find(
      (node) => node.role === "textbox" && node.name === "Terminal session"
    );
    expect(terminalSession).toBeTruthy();

    env.step({
      type: "CLICK",
      x: terminalSession!.bounds.x + 12,
      y: terminalSession!.bounds.y + 12
    });

    env.step({ type: "TYPING", text: "mkdir notes" });
    env.step({ type: "PRESS", key: "enter" });
    env.step({ type: "TYPING", text: "cd notes" });
    env.step({ type: "PRESS", key: "enter" });
    env.step({ type: "TYPING", text: "touch log.txt" });
    env.step({ type: "PRESS", key: "enter" });

    const hidden = env.getHiddenState().envState;
    const terminal = hidden.appStates.terminalLite["terminal-main"];
    const orderedFiles = getOrderedFiles(hidden.fileSystem);
    const folder = orderedFiles.find((file) => file.name === "notes");
    const child = orderedFiles.find((file) => file.name === "log.txt");

    expect(folder?.kind).toBe("folder");
    expect(folder?.path).toBe("/workspace/notes");
    expect(terminal.cwd).toBe("/workspace/notes");
    expect(child?.path).toBe("/workspace/notes/log.txt");
  });

  it("supports opening folders into a deeper explorer directory context", () => {
    const env = new MockOsEnv();
    env.reset({ taskId: "terminal_record_working_directory", seed: 0 });

    const terminalSession = flattenA11y(env.observe().observation.a11yTree).find(
      (node) => node.role === "textbox" && node.name === "Terminal session"
    );
    expect(terminalSession).toBeTruthy();

    env.step({
      type: "CLICK",
      x: terminalSession!.bounds.x + 12,
      y: terminalSession!.bounds.y + 12
    });
    env.step({ type: "TYPING", text: "mkdir notes" });
    env.step({ type: "PRESS", key: "enter" });

    const folderNode = flattenA11y(env.observe().observation.a11yTree).find(
      (node) => node.role === "listitem" && node.name === "notes"
    );
    expect(folderNode).toBeTruthy();

    env.step({
      type: "DOUBLE_CLICK",
      x: folderNode!.bounds.x + Math.round(folderNode!.bounds.width / 2),
      y: folderNode!.bounds.y + Math.round(folderNode!.bounds.height / 2)
    });

    const explorer = env.getHiddenState().envState.appStates.fileExplorer["explorer-main"];
    expect(explorer.currentDirectory).toBe("/workspace/notes");
  });

  it("maintains authoritative filesystem tree nodes for nested folders and cwd", () => {
    const env = new MockOsEnv();
    env.reset({ taskId: "terminal_record_working_directory", seed: 0 });

    const terminalSession = flattenA11y(env.observe().observation.a11yTree).find(
      (node) => node.role === "textbox" && node.name === "Terminal session"
    );
    expect(terminalSession).toBeTruthy();

    env.step({
      type: "CLICK",
      x: terminalSession!.bounds.x + 12,
      y: terminalSession!.bounds.y + 12
    });
    env.step({ type: "TYPING", text: "mkdir notes" });
    env.step({ type: "PRESS", key: "enter" });
    env.step({ type: "TYPING", text: "cd notes" });
    env.step({ type: "PRESS", key: "enter" });
    env.step({ type: "TYPING", text: "touch log.txt" });
    env.step({ type: "PRESS", key: "enter" });

    const fileSystem = env.getHiddenState().envState.fileSystem;
    const workspaceRootId = fileSystem.rootNodeIds.workspace;
    const workspaceRoot = fileSystem.nodes[workspaceRootId];
    const orderedFiles = getOrderedFiles(fileSystem);
    const notesEntry = orderedFiles.find((file) => file.name === "notes");
    const logEntry = orderedFiles.find((file) => file.name === "log.txt");

    expect(notesEntry).toBeTruthy();
    expect(logEntry).toBeTruthy();
    expect(workspaceRoot.childrenOrder).toContain(notesEntry!.id);
    expect(fileSystem.nodes[notesEntry!.id].childrenOrder).toContain(logEntry!.id);
    expect(fileSystem.cwdNodeId).toBe(notesEntry!.id);
  });

  it("supports quoted terminal paths for folders with spaces", () => {
    const env = new MockOsEnv();
    env.reset({ taskId: "terminal_record_working_directory", seed: 0 });

    const terminalSession = flattenA11y(env.observe().observation.a11yTree).find(
      (node) => node.role === "textbox" && node.name === "Terminal session"
    );
    expect(terminalSession).toBeTruthy();

    env.step({
      type: "CLICK",
      x: terminalSession!.bounds.x + 12,
      y: terminalSession!.bounds.y + 12
    });
    env.step({ type: "TYPING", text: "mkdir \"New Folder\"" });
    env.step({ type: "PRESS", key: "enter" });
    env.step({ type: "TYPING", text: "cd \"New Folder\"" });
    env.step({ type: "PRESS", key: "enter" });
    env.step({ type: "TYPING", text: "touch inside.txt" });
    env.step({ type: "PRESS", key: "enter" });
    env.step({ type: "TYPING", text: "cd .." });
    env.step({ type: "PRESS", key: "enter" });
    env.step({ type: "TYPING", text: "ls \"New Folder\"" });
    env.step({ type: "PRESS", key: "enter" });

    const terminal = env.getHiddenState().envState.appStates.terminalLite["terminal-main"];
    expect(terminal.cwd).toBe("/workspace");
    expect(terminal.lastCommand).toBe("ls \"New Folder\"");
    expect(terminal.lastOutput).toBe("inside.txt");
  });

});
