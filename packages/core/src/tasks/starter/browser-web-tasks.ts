import type { TaskSpec, TaskSummary, Viewport } from "../../types.js";
import {
  DEFAULT_BROWSER_EXTERNAL_PAGE_TITLE,
  DEFAULT_BROWSER_EXTERNAL_PAGE_URL
} from "../../apps/browser-defaults.js";
import { configureBrowserStart, createScenarioFile, openExplorerWithFiles } from "../scenario-builders.js";
import { withTaskSummaries } from "../with-task-summaries.js";
import { browserBounds, explorerBounds } from "./shared.js";

const implementationPath = "packages/core/src/tasks/starter/browser-web-tasks.ts";

function buildBriefingHeadingTask(_seed: number, viewport: Viewport) {
  const expectedHeading = "Quarterly Dock Briefing";
  const envState = openExplorerWithFiles({
    instruction: "In Firefox, open briefing.local, write the page heading into briefing-log.txt, and save.",
    viewport,
    files: [
      createScenarioFile("file-briefing-log", "briefing-log.txt", "", "/workspace"),
      createScenarioFile("file-briefing-ref", "workspace-readme.txt", "Use the browser to capture the requested field.", "/workspace")
    ],
    explorerWindow: {
      windowId: "explorer-main",
      bounds: explorerBounds(),
      focused: false,
      minimized: false
    },
    browserWindow: {
      windowId: "browser-main",
      bounds: browserBounds(),
      focused: true,
      minimized: false
    },
    terminalWindow: false,
    mailWindow: false
  });

  configureBrowserStart(envState.appStates.browserLite["browser-main"], {
    renderMode: "hybrid",
    currentPage: "external",
    url: DEFAULT_BROWSER_EXTERNAL_PAGE_URL,
    pageTitle: DEFAULT_BROWSER_EXTERNAL_PAGE_TITLE,
    tabs: [{ id: "browser-main-tab-1", title: DEFAULT_BROWSER_EXTERNAL_PAGE_TITLE, active: true }]
  });

  return {
    envState,
    targets: {
      targetFileId: "file-briefing-log",
      appendText: expectedHeading,
      expectedSavedContent: expectedHeading,
      targetBrowserUrlFragment: "browser-fixtures/briefing"
    }
  };
}

function buildCatalogOwnerTask(_seed: number, viewport: Viewport) {
  const expectedOwnerCode = "OPS-482";
  const envState = openExplorerWithFiles({
    instruction:
      "In Firefox Ops Catalog, search for kernel backlog, open the matching entry, write its owner code into owner-log.txt, and save.",
    viewport,
    files: [
      createScenarioFile("file-owner-log", "owner-log.txt", "", "/workspace"),
      createScenarioFile("file-owner-ref", "handoff.txt", "Capture the owner code exactly as shown in Firefox.", "/workspace")
    ],
    explorerWindow: {
      windowId: "explorer-main",
      bounds: explorerBounds(),
      focused: false,
      minimized: false
    },
    browserWindow: {
      windowId: "browser-main",
      bounds: browserBounds(),
      focused: true,
      minimized: false
    },
    terminalWindow: false,
    mailWindow: false
  });

  configureBrowserStart(envState.appStates.browserLite["browser-main"], {
    renderMode: "hybrid",
    currentPage: "external",
    url: DEFAULT_BROWSER_EXTERNAL_PAGE_URL,
    pageTitle: DEFAULT_BROWSER_EXTERNAL_PAGE_TITLE,
    tabs: [{ id: "browser-main-tab-1", title: DEFAULT_BROWSER_EXTERNAL_PAGE_TITLE, active: true }]
  });

  return {
    envState,
    targets: {
      targetFileId: "file-owner-log",
      appendText: expectedOwnerCode,
      expectedSavedContent: expectedOwnerCode,
      targetBrowserUrlFragment: "#entry=kernel-backlog"
    }
  };
}

const STARTER_BROWSER_WEB_TASKS_BASE = [
  {
    id: "browser_open_briefing_heading_to_note",
    instruction: "Open briefing.local in Firefox, capture the page heading in briefing-log.txt, and save.",
    domain: "Browser",
    split: "starter",
    maxSteps: 28,
    seedDefaults: [0, 1, 2],
    setup: buildBriefingHeadingTask,
    goalPredicates: ["browser.url_matches", "note.target_opened", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.url_matches", "note.target_opened", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  },
  {
    id: "browser_catalog_owner_to_note",
    instruction: "Open catalog.local in Firefox, search for kernel backlog, capture its owner code in owner-log.txt, and save.",
    domain: "Browser",
    split: "starter",
    maxSteps: 38,
    seedDefaults: [0, 1, 2],
    setup: buildCatalogOwnerTask,
    goalPredicates: ["browser.url_matches", "note.target_opened", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.url_matches", "note.target_opened", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  }
] satisfies Omit<TaskSpec, "summary">[];

const summaries: Record<string, TaskSummary> = {
  browser_open_briefing_heading_to_note: {
    family: "browser_external_extract_to_note",
    level: "B",
    apps: ["browser", "files", "note"],
    startState: "Firefox is focused on a public reference page, File Explorer shows briefing-log.txt on the left, and the note is still unopened.",
    objective: "Use the browser address bar to open the local briefing page, capture its visible heading, record it in briefing-log.txt, and save.",
    implementationPath
  },
  browser_catalog_owner_to_note: {
    family: "browser_search_extract_to_note",
    level: "B",
    apps: ["browser", "files", "note"],
    startState: "Firefox is focused on a public reference page while File Explorer keeps owner-log.txt available but unopened.",
    objective: "Open catalog.local, search the catalog, open the correct card, extract the owner code, record it in owner-log.txt, and save the note.",
    implementationPath
  }
};

export const STARTER_BROWSER_WEB_TASKS = withTaskSummaries(STARTER_BROWSER_WEB_TASKS_BASE, summaries);
