import { describe, expect, it } from "vitest";
import {
  openBrowserNoteScenario,
  openBrowserWithPage
} from "../../src/tasks/scenario-builders.js";

const VIEWPORT = { width: 1280, height: 800 };
const BROWSER_BOUNDS = { x: 492, y: 84, width: 760, height: 540 };
const EXPLORER_BOUNDS = { x: 92, y: 84, width: 388, height: 446 };
const NOTE_BOUNDS = { x: 842, y: 84, width: 390, height: 470 };

describe("browser scenario builders", () => {
  it("opens Firefox directly on a requested start surface", () => {
    const helpScenario = openBrowserWithPage({
      instruction: "Open help.",
      viewport: VIEWPORT,
      start: { page: "help", topicId: "workflow-notes" },
      browserBounds: BROWSER_BOUNDS,
      browserFocused: false,
      browserMinimized: true
    });
    const explorerScenario = openBrowserWithPage({
      instruction: "Open explorer.",
      viewport: VIEWPORT,
      start: { page: "explorer", categoryId: "chrome", taskId: "chrome_help_capture" },
      browserBounds: BROWSER_BOUNDS
    });

    const helpWindow = helpScenario.envState.windows.find((window) => window.id === "browser-main");
    const explorerWindow = explorerScenario.envState.windows.find((window) => window.id === "browser-main");

    expect(helpWindow?.focused).toBe(false);
    expect(helpWindow?.minimized).toBe(true);
    expect(helpScenario.browserState.currentPage).toBe("help");
    expect(helpScenario.browserState.selectedHelpTopicId).toBe("workflow-notes");
    expect(helpScenario.browserState.helpLines.length).toBeGreaterThan(0);

    expect(explorerWindow?.focused).toBe(true);
    expect(explorerWindow?.minimized).toBe(false);
    expect(explorerScenario.browserState.currentPage).toBe("explorer");
    expect(explorerScenario.browserState.selectedCategoryId).toBe("chrome");
    expect(explorerScenario.browserState.selectedTaskId).toBe("chrome_help_capture");
  });

  it("creates browser-note scenarios with explicit note/editor semantics", () => {
    const unopenedScenario = openBrowserNoteScenario({
      instruction: "Open explorer and leave a note unopened.",
      viewport: VIEWPORT,
      start: { page: "explorer", categoryId: "workflow", taskId: "workflow_mail_bridge" },
      browserBounds: BROWSER_BOUNDS,
      explorerWindow: {
        windowId: "explorer-main",
        bounds: EXPLORER_BOUNDS,
        focused: true,
        minimized: false
      },
      noteTarget: {
        fileId: "file-note",
        fileName: "note.txt",
        initialContent: "seed",
        preopen: false,
        windowId: "notes-target",
        bounds: NOTE_BOUNDS
      }
    });
    const preopenedScenario = openBrowserNoteScenario({
      instruction: "Open note beside browser.",
      viewport: VIEWPORT,
      start: { page: "help", topicId: "dock-basics" },
      browserBounds: BROWSER_BOUNDS,
      explorerWindow: {
        windowId: "explorer-main",
        bounds: EXPLORER_BOUNDS,
        focused: false,
        minimized: false
      },
      noteTarget: {
        fileId: "file-help",
        fileName: "help.txt",
        initialContent: "prefix\n",
        preopen: true,
        windowId: "notes-help",
        bounds: NOTE_BOUNDS,
        focused: false,
        minimized: false
      }
    });

    expect(unopenedScenario.noteFileId).toBe("file-note");
    expect(unopenedScenario.noteWindowId).toBeUndefined();
    expect(unopenedScenario.explorerWindowId).toBe("explorer-main");
    expect(unopenedScenario.envState.fileSystem.files["file-note"]?.path).toBe("/workspace/note.txt");

    expect(preopenedScenario.noteFileId).toBe("file-help");
    expect(preopenedScenario.noteWindowId).toBe("notes-help");
    expect(preopenedScenario.explorerWindowId).toBe("explorer-main");
    expect(preopenedScenario.browserState.currentPage).toBe("help");
    expect(preopenedScenario.envState.appStates.noteEditor["notes-help"]?.buffer).toBe("prefix\n");
  });
});
