import type { TaskSpec, TaskSummary, Viewport } from "../../types.js";
import {
  DEFAULT_BROWSER_EXTERNAL_PAGE_TITLE,
  DEFAULT_BROWSER_EXTERNAL_PAGE_URL
} from "../../apps/browser-defaults.js";
import { configureBrowserStart, createScenarioFile, openExplorerWithFiles } from "../scenario-builders.js";
import { withTaskSummaries } from "../with-task-summaries.js";
import { browserBounds, explorerBounds, noteBoundsRight } from "./shared.js";

const implementationPath = "packages/core/src/tasks/representative/browser-web-tasks.ts";

function buildIntakeConfirmationTask(_seed: number, viewport: Viewport) {
  const expectedConfirmationCode = "INT-417";
  const envState = openExplorerWithFiles({
    instruction:
      "In Firefox Access Intake, submit a request for Nari Kim from Release Ops with purpose \"shift audit\", write the confirmation code into intake-log.txt, and save.",
    viewport,
    files: [
      createScenarioFile("file-intake-log", "intake-log.txt", "", "/workspace"),
      createScenarioFile("file-intake-ref", "request-template.txt", "Name: Nari Kim\nTeam: Release Ops\nPurpose: shift audit", "/workspace")
    ],
    explorerWindow: {
      windowId: "explorer-main",
      bounds: explorerBounds(),
      focused: false,
      minimized: false
    },
    noteWindows: [],
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
      targetFileId: "file-intake-log",
      appendText: expectedConfirmationCode,
      expectedSavedContent: expectedConfirmationCode,
      targetBrowserUrlFragment: "#submitted=intake-417"
    }
  };
}

function buildCatalogAuditAppendTask(_seed: number, viewport: Viewport) {
  const initialContent = "Audit capture:\n";
  const appendText = "MSG-204\nReady for review";
  const envState = openExplorerWithFiles({
    instruction:
      "In Firefox Ops Catalog, search for mail audit, open the matching entry, append its owner code and status to the open audit-note.txt, and save.",
    viewport,
    files: [
      createScenarioFile("file-audit-note", "audit-note.txt", initialContent, "/workspace"),
      createScenarioFile("file-audit-ref", "browser-audit-guide.txt", "Capture the owner code followed by the status line.", "/workspace")
    ],
    explorerWindow: false,
    noteWindows: [
      {
        fileId: "file-audit-note",
        fileName: "audit-note.txt",
        initialContent,
        preopen: true,
        windowId: "notes-audit",
        bounds: noteBoundsRight(),
        focused: false,
        minimized: false
      }
    ],
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
      targetFileId: "file-audit-note",
      appendText,
      expectedSavedContent: `${initialContent}${appendText}`,
      targetBrowserUrlFragment: "#entry=mail-audit"
    }
  };
}

const REPRESENTATIVE_BROWSER_WEB_TASKS_BASE = [
  {
    id: "browser_intake_confirmation_to_note",
    instruction: "Open intake.local in Firefox, submit the intake form, capture its confirmation code in intake-log.txt, and save.",
    domain: "Browser",
    split: "representative",
    maxSteps: 44,
    seedDefaults: [0, 1, 2],
    setup: buildIntakeConfirmationTask,
    goalPredicates: ["browser.url_matches", "note.target_opened", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.url_matches", "note.target_opened", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  },
  {
    id: "browser_catalog_audit_append_save",
    instruction: "Open catalog.local in Firefox, search for mail audit, append its owner code and status to audit-note.txt, and save.",
    domain: "Browser",
    split: "representative",
    maxSteps: 46,
    seedDefaults: [0, 1, 2],
    setup: buildCatalogAuditAppendTask,
    goalPredicates: ["browser.url_matches", "note.target_appended", "note.saved"],
    progressPredicates: ["browser.url_matches", "note.target_appended", "note.saved"],
    forbiddenPredicates: []
  }
] satisfies Omit<TaskSpec, "summary">[];

const summaries: Record<string, TaskSummary> = {
  browser_intake_confirmation_to_note: {
    family: "browser_form_submit_to_note",
    level: "C",
    apps: ["browser", "note"],
    startState: "Firefox is focused on a public reference page and intake-log.txt exists locally but is not yet open.",
    objective: "Open intake.local, complete the intake form, capture the confirmation code revealed after submission, record it in intake-log.txt, and save the note.",
    implementationPath
  },
  browser_catalog_audit_append_save: {
    family: "browser_search_append_open_note",
    level: "C",
    apps: ["browser", "note"],
    startState: "Firefox is focused on a public reference page while audit-note.txt is already open on the right with an audit header waiting for appended details.",
    objective: "Open catalog.local, search the catalog, open the correct detail card, append its owner code plus status to audit-note.txt, and save.",
    implementationPath
  }
};

export const REPRESENTATIVE_BROWSER_WEB_TASKS = withTaskSummaries(REPRESENTATIVE_BROWSER_WEB_TASKS_BASE, summaries);
