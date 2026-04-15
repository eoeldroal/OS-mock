import { produce } from "immer";
import type {
  A11yNode,
  AppActionResult,
  AppPlugin,
  BrowserLiteState,
  BrowserLiteViewModel,
  BuildContext,
  Computer13Action,
  EnvState,
  Point,
  Rect,
  WindowInstance
} from "../types.js";
import { pointInRect } from "../system/pointer.js";
import { setClipboardText } from "../system/clipboard.js";
import {
  DEFAULT_BROWSER_EXTERNAL_PAGE_TITLE,
  DEFAULT_BROWSER_EXTERNAL_PAGE_URL,
  DEFAULT_BROWSER_EXTERNAL_TAB_ID
} from "./browser-defaults.js";

const HEADER_HEIGHT = 32;
const TAB_HEIGHT = 30;
const TOOLBAR_HEIGHT = 42;
const PADDING = 12;
const CONTENT_INSET = 14;
const COLUMN_HEADER_ZONE = 32;
const BOOKMARK_MIN_WIDTH = 88;
const BOOKMARK_MAX_WIDTH = 120;
const CATEGORY_MIN_WIDTH = 84;
const CATEGORY_MAX_WIDTH = 120;
const TASK_MIN_WIDTH = 148;
const TASK_MAX_WIDTH = 196;
const DETAIL_MIN_WIDTH = 264;
const COLUMN_GAP = 10;
const DETAIL_GAP = 12;
const EXPLORER_SITE_HEADER_HEIGHT = 76;
const HELP_PAGE_HEADER_HEIGHT = 84;
const TASK_BOARD_TITLE = "Task Board";
const HELP_CENTER_TITLE = "Ubuntu help";
const TASK_BOARD_URL = "https://workspace.local/task-board";
const HELP_CENTER_URL = "https://workspace.local/help-center";

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function ensureTab(
  browser: BrowserLiteState,
  title: string,
  id: string
) {
  const existingIndex = browser.tabs.findIndex((tab) => tab.id === id || tab.title === title);
  if (existingIndex >= 0) {
    return existingIndex;
  }
  browser.tabs.push({ id, title, active: false });
  return browser.tabs.length - 1;
}

function activateTab(browser: BrowserLiteState, index: number) {
  browser.tabs = browser.tabs.map((tab, tabIndex) => ({
    ...tab,
    active: tabIndex === index
  }));
}

function rowBounds(base: Rect, index: number, height: number, gap = 8): Rect {
  return {
    x: base.x,
    y: base.y + index * (height + gap),
    width: base.width,
    height
  };
}

function insetTop(bounds: Rect, topOffset: number): Rect {
  return {
    x: bounds.x,
    y: bounds.y + topOffset,
    width: bounds.width,
    height: Math.max(0, bounds.height - topOffset)
  };
}

function setBrowserPage(browser: BrowserLiteState, page: "explorer" | "help") {
  browser.currentPage = page;
  browser.selectedHelpLineIndex = undefined;
  browser.addressBarFocused = false;
  browser.addressReplaceOnType = false;
  if (page === "explorer") {
    const explorerIndex = ensureTab(browser, TASK_BOARD_TITLE, "tab-osworld");
    activateTab(browser, explorerIndex);
    browser.pageTitle = TASK_BOARD_TITLE;
    browser.url = TASK_BOARD_URL;
    browser.addressInput = browser.url;
    if (!browser.selectedCategoryId && browser.categories[0]) {
      browser.selectedCategoryId = browser.categories[0].id;
      browser.selectedTaskId = browser.categories[0].tasks[0]?.id ?? "";
    }
  } else {
    const helpIndex = ensureTab(browser, HELP_CENTER_TITLE, "tab-help");
    activateTab(browser, helpIndex);
    browser.pageTitle = HELP_CENTER_TITLE;
    browser.url = HELP_CENTER_URL;
    browser.addressInput = browser.url;
    if (!browser.selectedHelpTopicId && browser.helpTopics[0]) {
      browser.selectedHelpTopicId = browser.helpTopics[0].id;
    }
    const topic = browser.helpTopics.find((item) => item.id === browser.selectedHelpTopicId) ?? browser.helpTopics[0];
    browser.helpLines = [...(topic?.lines ?? [])];
  }
}

function setHelpTopic(browser: BrowserLiteState, topicId: string) {
  const topic = browser.helpTopics.find((item) => item.id === topicId) ?? browser.helpTopics[0];
  if (!topic) {
    return;
  }
  browser.selectedHelpTopicId = topic.id;
  browser.helpLines = [...topic.lines];
  browser.selectedHelpLineIndex = undefined;
}

function openBrowserBookmark(browser: BrowserLiteState, bookmarkIndex: number) {
  const bookmark = browser.bookmarks[bookmarkIndex];
  if (!bookmark) {
    return false;
  }

  browser.lastOpenedBookmarkId = bookmark.id;
  setBrowserPage(browser, bookmark.page);

  if (bookmark.page === "explorer" && bookmark.targetCategoryId) {
    const category = browser.categories.find((item) => item.id === bookmark.targetCategoryId) ?? browser.categories[0];
    if (category) {
      browser.selectedCategoryId = category.id;
      browser.selectedTaskId = category.tasks[0]?.id ?? "";
    }
  }

  if (bookmark.page === "help") {
    setHelpTopic(browser, bookmark.targetHelpTopicId ?? browser.helpTopics[0]?.id ?? "");
  }

  return true;
}

function setUbuntuHelpExternalPage(browser: BrowserLiteState) {
  const helpIndex = ensureTab(browser, HELP_CENTER_TITLE, "tab-help");
  setExternalPage(browser, "https://help.ubuntu.com/", HELP_CENTER_TITLE, helpIndex);
}

function setDefaultExternalPage(browser: BrowserLiteState, activeTabIndex = 0) {
  setExternalPage(
    browser,
    DEFAULT_BROWSER_EXTERNAL_PAGE_URL,
    DEFAULT_BROWSER_EXTERNAL_PAGE_TITLE,
    activeTabIndex
  );
}

function setExternalPage(browser: BrowserLiteState, url: string, title?: string, activeTabIndex = 0) {
  browser.currentPage = "external";
  browser.url = url;
  browser.addressInput = url;
  browser.pageTitle = title ?? url;
  browser.addressBarFocused = false;
  browser.addressReplaceOnType = false;
  browser.selectedHelpLineIndex = undefined;
  browser.selectedCategoryId = "";
  browser.selectedTaskId = "";
  browser.tabs = browser.tabs.map((tab, index) => ({
    ...tab,
    title: index === activeTabIndex ? (title ?? tab.title) : tab.title,
    active: index === activeTabIndex
  }));
}

function setOsWorldPage(browser: BrowserLiteState) {
  const explorerIndex = ensureTab(browser, TASK_BOARD_TITLE, "tab-osworld");
  activateTab(browser, explorerIndex);
  setBrowserPage(browser, "explorer");
}

function applyAddressInput(browser: BrowserLiteState) {
  const rawInput = browser.addressInput.trim();
  const normalized = rawInput.toLowerCase();
  if (!normalized) {
    browser.addressInput = browser.url;
    browser.addressBarFocused = false;
    browser.addressReplaceOnType = false;
    return;
  }
  if (normalized.includes("help") || normalized.includes("ubuntu")) {
    setUbuntuHelpExternalPage(browser);
    return;
  }
  if (normalized.includes("os-world") || normalized.includes("explorer")) {
    setOsWorldPage(browser);
    return;
  }
  if (normalized.includes("briefing.local")) {
    setExternalPage(browser, "osmock://browser-fixtures/briefing", "Dock Briefing");
    return;
  }
  if (normalized.includes("catalog.local")) {
    setExternalPage(browser, "osmock://browser-fixtures/catalog", "Ops Catalog");
    return;
  }
  if (normalized.includes("intake.local")) {
    setExternalPage(browser, "osmock://browser-fixtures/intake", "Access Intake");
    return;
  }
  if (normalized.startsWith("osmock://")) {
    setExternalPage(browser, rawInput, "OS Mock Fixture");
    return;
  }

  const resolvedUrl = /^https?:\/\//i.test(rawInput) ? rawInput : `https://${rawInput}`;
  let title = resolvedUrl;
  try {
    const url = new URL(resolvedUrl);
    title = url.hostname.replace(/^www\./, "");
  } catch {
    title = resolvedUrl;
  }
  setExternalPage(browser, resolvedUrl, title);
}

export function handleBrowserAction(
  state: EnvState,
  window: WindowInstance,
  browser: BrowserLiteState,
  action: Computer13Action,
  point: Point
): AppActionResult | null {
  const layout = getBrowserLiteLayout(window.bounds, browser);

  if (action.type === "CLICK") {
    let handled = false;
    const next = produce(state, (draft) => {
      const nextBrowser = draft.appStates.browserLite[window.id];

      const clickedTabIndex = layout.tabRects.findIndex((rect) => pointInRect(point, rect));
      if (clickedTabIndex >= 0) {
        const clickedTab = nextBrowser.tabs[clickedTabIndex];
        if (clickedTab?.title === DEFAULT_BROWSER_EXTERNAL_PAGE_TITLE) {
          setDefaultExternalPage(nextBrowser, 0);
        } else if (clickedTab?.title === TASK_BOARD_TITLE) {
          setBrowserPage(nextBrowser, "explorer");
        } else if (clickedTab?.title === HELP_CENTER_TITLE) {
          setBrowserPage(nextBrowser, "help");
        } else if (clickedTabIndex === 0) {
          setDefaultExternalPage(nextBrowser, 0);
        } else {
          setBrowserPage(nextBrowser, "help");
        }
        handled = true;
        return;
      }

      if (pointInRect(point, layout.addressBarBounds)) {
        nextBrowser.addressBarFocused = true;
        nextBrowser.addressInput = nextBrowser.url;
        nextBrowser.addressReplaceOnType = true;
        handled = true;
        return;
      }

      nextBrowser.addressBarFocused = false;
      nextBrowser.addressReplaceOnType = false;

      const clickedBookmarkIndex = layout.bookmarkRects.findIndex((rect) => pointInRect(point, rect));
      if (clickedBookmarkIndex >= 0) {
        handled = openBrowserBookmark(nextBrowser, clickedBookmarkIndex);
        return;
      }

      if (nextBrowser.currentPage === "help") {
        const clickedHelpTopicIndex = layout.helpTopicRects.findIndex((rect) => pointInRect(point, rect));
        if (clickedHelpTopicIndex >= 0) {
          const topic = nextBrowser.helpTopics[clickedHelpTopicIndex];
          if (topic) {
            setHelpTopic(nextBrowser, topic.id);
            handled = true;
          }
          return;
        }
        const clickedHelpLineIndex = layout.helpLineRects.findIndex((rect) => pointInRect(point, rect));
        if (clickedHelpLineIndex >= 0) {
          nextBrowser.selectedHelpLineIndex = clickedHelpLineIndex;
          handled = true;
          return;
        }
        return;
      }

      if (nextBrowser.currentPage === "external") {
        return;
      }

      const clickedCategoryIndex = layout.categoryRects.findIndex((rect) => pointInRect(point, rect));
      if (clickedCategoryIndex >= 0) {
        const category = nextBrowser.categories[clickedCategoryIndex];
        nextBrowser.selectedCategoryId = category.id;
        nextBrowser.selectedTaskId = category.tasks[0]?.id ?? "";
        nextBrowser.selectedHelpLineIndex = undefined;
        handled = true;
        return;
      }

      const selectedCategory =
        nextBrowser.categories.find((category) => category.id === nextBrowser.selectedCategoryId) ??
        nextBrowser.categories[0];
      const clickedTaskIndex = layout.taskRects.findIndex((rect) => pointInRect(point, rect));
      if (clickedTaskIndex >= 0 && selectedCategory?.tasks[clickedTaskIndex]) {
        nextBrowser.selectedTaskId = selectedCategory.tasks[clickedTaskIndex].id;
        nextBrowser.selectedHelpLineIndex = undefined;
        handled = true;
        return;
      }
    });

    if (handled) {
      return { appState: next.appStates.browserLite[window.id], envState: next, accepted: true };
    }
    // Click on empty area in browser: accept as focus click
    return { appState: browser, envState: state, accepted: true };
  }

  if (action.type === "HOTKEY") {
    const normalized = action.keys.map((key) => key.toLowerCase()).sort();
    if (normalized.includes("ctrl") && normalized.includes("l")) {
      const next = produce(state, (draft) => {
        const nextBrowser = draft.appStates.browserLite[window.id];
        nextBrowser.addressBarFocused = true;
        nextBrowser.addressInput = nextBrowser.url;
        nextBrowser.addressReplaceOnType = true;
      });
      return { appState: next.appStates.browserLite[window.id], envState: next, accepted: true };
    }
    if (normalized.includes("ctrl") && normalized.includes("c")) {
      if (browser.addressBarFocused) {
        const next = produce(state, (draft) => {
          const nextBrowser = draft.appStates.browserLite[window.id];
          draft.clipboard = setClipboardText(draft.clipboard, nextBrowser.addressInput || nextBrowser.url);
        });
        return { appState: next.appStates.browserLite[window.id], envState: next, accepted: true };
      }
      if (!browser.helpLines[browser.selectedHelpLineIndex ?? -1]) {
        return null;
      }
      const next = produce(state, (draft) => {
        const nextBrowser = draft.appStates.browserLite[window.id];
        const selectedLine = nextBrowser.helpLines[nextBrowser.selectedHelpLineIndex ?? -1];
        draft.clipboard = setClipboardText(draft.clipboard, selectedLine);
      });
      return { appState: next.appStates.browserLite[window.id], envState: next, accepted: true };
    }
  }

  if (action.type === "TYPING") {
    if (!browser.addressBarFocused) {
      return null;
    }
    const next = produce(state, (draft) => {
      const nextBrowser = draft.appStates.browserLite[window.id];
      nextBrowser.addressInput = nextBrowser.addressReplaceOnType
        ? action.text
        : `${nextBrowser.addressInput}${action.text}`;
      nextBrowser.addressReplaceOnType = false;
    });
    return { appState: next.appStates.browserLite[window.id], envState: next, accepted: true };
  }

  if (action.type === "PRESS" && browser.addressBarFocused) {
    const lowerKey = action.key.toLowerCase();
    const next = produce(state, (draft) => {
      const nextBrowser = draft.appStates.browserLite[window.id];
      if (lowerKey === "backspace") {
        nextBrowser.addressInput = nextBrowser.addressInput.slice(0, -1);
        nextBrowser.addressReplaceOnType = false;
        return;
      }
      if (lowerKey === "escape") {
        nextBrowser.addressInput = nextBrowser.url;
        nextBrowser.addressBarFocused = false;
        nextBrowser.addressReplaceOnType = false;
        return;
      }
      if (lowerKey === "enter") {
        applyAddressInput(nextBrowser);
      }
    });
    return { appState: next.appStates.browserLite[window.id], envState: next, accepted: true };
  }

  if (action.type === "SCROLL") {
    const direction = action.dy > 0 ? 1 : action.dy < 0 ? -1 : 0;
    if (direction === 0) {
      return null;
    }

    const next = produce(state, (draft) => {
      const nextBrowser = draft.appStates.browserLite[window.id];

      if (nextBrowser.currentPage === "help") {
        const current = nextBrowser.selectedHelpLineIndex ?? 0;
        const newIndex = Math.max(0, Math.min(nextBrowser.helpLines.length - 1, current + direction));
        nextBrowser.selectedHelpLineIndex = newIndex;
      } else {
        const selectedCategory =
          nextBrowser.categories.find((category) => category.id === nextBrowser.selectedCategoryId) ?? nextBrowser.categories[0];
        if (selectedCategory) {
          const tasks = selectedCategory.tasks;
          const currentIndex = tasks.findIndex((task) => task.id === nextBrowser.selectedTaskId);
          const newIndex = Math.max(0, Math.min(tasks.length - 1, (currentIndex === -1 ? 0 : currentIndex) + direction));
          nextBrowser.selectedTaskId = tasks[newIndex]?.id ?? nextBrowser.selectedTaskId;
        }
      }
    });

    return { appState: next.appStates.browserLite[window.id], envState: next, accepted: true };
  }

  return null;
}

export function getBrowserLiteLayout(bounds: Rect, state: BrowserLiteState) {
  const pageInset = state.currentPage === "external" ? 2 : PADDING;
  const contentVerticalInset = state.currentPage === "external" ? 4 : 8;
  const tabsBounds = {
    x: bounds.x + 12,
    y: bounds.y + HEADER_HEIGHT + 6,
    width: bounds.width - 24,
    height: TAB_HEIGHT
  };

  const addressBounds = {
    x: bounds.x + 52,
    y: bounds.y + HEADER_HEIGHT + TAB_HEIGHT + 14,
    width: bounds.width - 64,
    height: 30
  };

  const contentFrameBounds = {
    x: bounds.x + pageInset,
    y: bounds.y + HEADER_HEIGHT + TAB_HEIGHT + TOOLBAR_HEIGHT + contentVerticalInset,
    width: bounds.width - pageInset * 2,
    height: bounds.height - HEADER_HEIGHT - TAB_HEIGHT - TOOLBAR_HEIGHT - (contentVerticalInset + 8)
  };

  const siteHeaderHeight = state.currentPage === "explorer" ? EXPLORER_SITE_HEADER_HEIGHT : HELP_PAGE_HEADER_HEIGHT;
  const horizontalBudget = Math.max(0, contentFrameBounds.width - CONTENT_INSET * 2 - COLUMN_GAP * 2 - DETAIL_GAP);
  const requestedBookmarkWidth =
    state.currentPage === "help"
      ? clamp(Math.round(horizontalBudget * 0.12), BOOKMARK_MIN_WIDTH, 112)
      : clamp(Math.round(horizontalBudget * 0.12), BOOKMARK_MIN_WIDTH, BOOKMARK_MAX_WIDTH);
  const requestedCategoryWidth = clamp(
    Math.round(horizontalBudget * (state.currentPage === "help" ? 0.13 : 0.12)),
    CATEGORY_MIN_WIDTH,
    CATEGORY_MAX_WIDTH
  );
  let detailTargetWidth = clamp(
    Math.round(horizontalBudget * (state.currentPage === "help" ? 0.58 : 0.5)),
    DETAIL_MIN_WIDTH,
    420
  );
  let requestedTaskWidth = horizontalBudget - requestedBookmarkWidth - requestedCategoryWidth - detailTargetWidth;
  if (requestedTaskWidth < TASK_MIN_WIDTH) {
    const deficit = TASK_MIN_WIDTH - requestedTaskWidth;
    detailTargetWidth = Math.max(228, detailTargetWidth - deficit);
    requestedTaskWidth = horizontalBudget - requestedBookmarkWidth - requestedCategoryWidth - detailTargetWidth;
  }
  requestedTaskWidth = clamp(requestedTaskWidth, TASK_MIN_WIDTH, TASK_MAX_WIDTH);

  const bookmarksBounds = {
    x: contentFrameBounds.x + CONTENT_INSET,
    y: contentFrameBounds.y + CONTENT_INSET + siteHeaderHeight,
    width: requestedBookmarkWidth,
    height: contentFrameBounds.height - CONTENT_INSET * 2 - siteHeaderHeight
  };

  const categoriesBounds = {
    x: bookmarksBounds.x + bookmarksBounds.width + COLUMN_GAP,
    y: bookmarksBounds.y + 32,
    width: requestedCategoryWidth,
    height: bookmarksBounds.height - 32
  };

  const tasksBounds = {
    x: categoriesBounds.x + categoriesBounds.width + COLUMN_GAP,
    y: categoriesBounds.y + 32,
    width: requestedTaskWidth,
    height: categoriesBounds.height - 32
  };

  const detailX = tasksBounds.x + tasksBounds.width + DETAIL_GAP;
  const detailWidth = Math.max(
    216,
    contentFrameBounds.x + contentFrameBounds.width - CONTENT_INSET - detailX
  );
  const detailBounds = {
    x: detailX,
    y: bookmarksBounds.y + 32,
    width: detailWidth,
    height: tasksBounds.height
  };

  const bookmarkHeaderBounds = {
    x: bookmarksBounds.x,
    y: bookmarksBounds.y,
    width: bookmarksBounds.width,
    height: COLUMN_HEADER_ZONE
  };

  const categoryHeaderBounds = {
    x: categoriesBounds.x,
    y: categoriesBounds.y,
    width: categoriesBounds.width,
    height: COLUMN_HEADER_ZONE
  };

  const taskHeaderBounds = {
    x: tasksBounds.x,
    y: tasksBounds.y,
    width: tasksBounds.width,
    height: COLUMN_HEADER_ZONE
  };

  const detailTitleBounds = {
    x: detailBounds.x,
    y: detailBounds.y,
    width: detailBounds.width,
    height: 30
  };

  const detailTaskIdLabelBounds = {
    x: detailBounds.x,
    y: detailTitleBounds.y + detailTitleBounds.height + 16,
    width: detailBounds.width,
    height: 16
  };

  const detailTaskIdValueBounds = {
    x: detailBounds.x,
    y: detailTaskIdLabelBounds.y + detailTaskIdLabelBounds.height + 8,
    width: detailBounds.width,
    height: 22
  };

  const detailInstructionLabelBounds = {
    x: detailBounds.x,
    y: detailTaskIdValueBounds.y + detailTaskIdValueBounds.height + 18,
    width: detailBounds.width,
    height: 16
  };

  const detailInstructionBounds = {
    x: detailBounds.x,
    y: detailInstructionLabelBounds.y + detailInstructionLabelBounds.height + 8,
    width: detailBounds.width,
    height: 102
  };

  const helpTopicsBounds = {
    x: categoriesBounds.x,
    y: bookmarksBounds.y + 32,
    width: clamp(Math.round(contentFrameBounds.width * 0.14), 116, 152),
    height: bookmarksBounds.height - 32
  };

  const helpDetailBounds = {
    x: helpTopicsBounds.x + helpTopicsBounds.width + 18,
    y: bookmarksBounds.y + 32,
    width:
      contentFrameBounds.x + contentFrameBounds.width - CONTENT_INSET - (helpTopicsBounds.x + helpTopicsBounds.width + 18),
    height: helpTopicsBounds.height
  };

  const helpTextBounds = {
    x: helpDetailBounds.x,
    y: helpDetailBounds.y,
    width: helpDetailBounds.width,
    height: helpDetailBounds.height
  };

  const selectedCategory =
    state.categories.find((category) => category.id === state.selectedCategoryId) ?? state.categories[0];
  const selectedTask =
    selectedCategory?.tasks.find((task) => task.id === state.selectedTaskId) ?? selectedCategory?.tasks[0];
  const selectedHelpTopic =
    state.helpTopics.find((topic) => topic.id === state.selectedHelpTopicId) ?? state.helpTopics[0];

  const detailActionsLabelBounds = {
    x: detailBounds.x,
    y: detailInstructionBounds.y + detailInstructionBounds.height + 18,
    width: detailBounds.width,
    height: 16
  };

  const detailActionRects = (selectedTask?.actions ?? []).map((_, index) => ({
    x: detailBounds.x,
    y: detailActionsLabelBounds.y + detailActionsLabelBounds.height + 8 + index * 26,
    width: detailBounds.width,
    height: 20
  }));

  return {
    tabBarBounds: tabsBounds,
    tabRects: (() => {
      const tabCount = Math.max(1, state.tabs.length);
      const gap = 8;
      const availableWidth = tabsBounds.width - (tabCount - 1) * gap;
      const desiredWidths = state.tabs.map((tab) => clamp(84 + tab.title.length * 7, 112, 190));
      const desiredTotal = desiredWidths.reduce((sum, width) => sum + width, 0);
      const scaledWidths =
        desiredTotal <= availableWidth
          ? desiredWidths
          : desiredWidths.map((width) => Math.max(96, Math.floor((width / desiredTotal) * availableWidth)));

      let cursor = tabsBounds.x;
      return state.tabs.map((_, index) => {
        const remainingWidth = tabsBounds.x + tabsBounds.width - cursor - gap * Math.max(0, tabCount - index - 1);
        const width = index === state.tabs.length - 1 ? remainingWidth : Math.min(scaledWidths[index], remainingWidth);
        const rect = {
          x: cursor,
          y: tabsBounds.y,
          width,
          height: TAB_HEIGHT
        };
        cursor += width + gap;
        return rect;
      });
    })(),
    addressBarBounds: addressBounds,
    contentBounds: contentFrameBounds,
    bookmarkColumnBounds: bookmarksBounds,
    bookmarkHeaderBounds,
    bookmarkRects: state.bookmarks.map((_, index) => rowBounds(insetTop(bookmarksBounds, COLUMN_HEADER_ZONE), index, 26)),
    categoryColumnBounds: categoriesBounds,
    categoryHeaderBounds,
    categoryRects: state.categories.map((_, index) => rowBounds(insetTop(categoriesBounds, COLUMN_HEADER_ZONE), index, 34)),
    taskColumnBounds: tasksBounds,
    taskHeaderBounds,
    taskRects: (selectedCategory?.tasks ?? []).map((_, index) => rowBounds(insetTop(tasksBounds, COLUMN_HEADER_ZONE), index, 76, 8)),
    detailBounds,
    detailTitleBounds,
    detailTaskIdLabelBounds,
    detailTaskIdValueBounds,
    detailInstructionLabelBounds,
    detailInstructionBounds,
    detailActionsLabelBounds,
    detailActionRects,
    helpTopicsBounds,
    helpDetailBounds,
    helpTextBounds,
    helpLineRects: (() => {
      const selectedIndex = state.selectedHelpLineIndex ?? 0;
      let cursorY = helpTextBounds.y + 130;
      return state.helpLines.map((_, index) => {
        const height = index === selectedIndex ? 92 : 46;
        const rect = {
          x: helpTextBounds.x,
          y: cursorY,
          width: helpTextBounds.width,
          height
        };
        cursorY += height + 12;
        return rect;
      });
    })(),
    helpTopicRects: state.helpTopics.map((_, index) => rowBounds(insetTop(helpTopicsBounds, COLUMN_HEADER_ZONE), index, 54, 8)),
    selectedCategory,
    selectedTask,
    selectedHelpTopic
  };
}

export const browserLitePlugin: AppPlugin<BrowserLiteState> = {
  id: "browser-lite",
  title: "Mozilla Firefox",
  create() {
    return {
      id: "browser-1",
      appName: "Mozilla Firefox",
      renderMode: "hybrid",
      url: DEFAULT_BROWSER_EXTERNAL_PAGE_URL,
      addressInput: DEFAULT_BROWSER_EXTERNAL_PAGE_URL,
      addressBarFocused: false,
      addressReplaceOnType: false,
      pageTitle: DEFAULT_BROWSER_EXTERNAL_PAGE_TITLE,
      currentPage: "external",
      tabs: [
        { id: DEFAULT_BROWSER_EXTERNAL_TAB_ID, title: DEFAULT_BROWSER_EXTERNAL_PAGE_TITLE, active: true },
        { id: "tab-osworld", title: TASK_BOARD_TITLE, active: false }
      ],
      bookmarks: [],
      categories: [],
      selectedCategoryId: "",
      selectedTaskId: "",
      helpTopics: [],
      selectedHelpTopicId: "",
      helpLines: [],
      lastOpenedBookmarkId: undefined,
      selectedHelpLineIndex: undefined
    };
  },
  reduce(state) {
    return state;
  },
  buildA11y(state, ctx: BuildContext) {
    const nextLayout = getBrowserLiteLayout(ctx.window.bounds, state);

    const explorerChildren: A11yNode[] =
      state.currentPage === "explorer"
        ? [
            {
              id: `${ctx.window.id}-categories`,
              role: "list",
              name: "Explorer categories",
              bounds: nextLayout.categoryColumnBounds,
              visible: true,
              enabled: true,
              focusable: true,
              focused: false,
              children: state.categories.map((category, index) => ({
                id: `${ctx.window.id}-category-${category.id}`,
                role: "listitem",
                name: category.label,
                bounds: nextLayout.categoryRects[index],
                visible: true,
                enabled: true,
                focusable: true,
                focused: category.id === state.selectedCategoryId,
                children: []
              }))
            },
            {
              id: `${ctx.window.id}-tasks`,
              role: "list",
              name: "Explorer tasks",
              bounds: nextLayout.taskColumnBounds,
              visible: true,
              enabled: true,
              focusable: true,
              focused: false,
              children: (nextLayout.selectedCategory?.tasks ?? []).map((task, index) => ({
                id: `${ctx.window.id}-task-${task.id}`,
                role: "listitem",
                name: task.title,
                text: task.id,
                bounds: nextLayout.taskRects[index],
                visible: true,
                enabled: true,
                focusable: true,
                focused: task.id === state.selectedTaskId,
                children: []
              }))
            },
            {
              id: `${ctx.window.id}-task-detail`,
              role: "label",
              name: nextLayout.selectedTask?.title ?? "Task detail",
              text: [
                nextLayout.selectedTask?.id ?? "",
                nextLayout.selectedTask?.instruction ?? "",
                nextLayout.selectedTask?.owner ? "Owner: " + nextLayout.selectedTask.owner : "",
                nextLayout.selectedTask?.difficulty ? "Difficulty: " + nextLayout.selectedTask.difficulty : "",
                nextLayout.selectedTask?.appRefs?.length ? "Apps: " + nextLayout.selectedTask.appRefs.join(", ") : "",
                ...(nextLayout.selectedTask?.actions ?? [])
              ]
                .filter(Boolean)
                .join("\n"),
              bounds: nextLayout.detailBounds,
              visible: true,
              enabled: true,
              focusable: false,
              focused: false,
              children: [
                {
                  id: `${ctx.window.id}-task-id`,
                  role: "label",
                  name: "Task ID",
                  text: nextLayout.selectedTask?.id ?? "",
                  bounds: nextLayout.detailTaskIdValueBounds,
                  visible: true,
                  enabled: true,
                  focusable: false,
                  focused: false,
                  children: []
                },
                {
                  id: `${ctx.window.id}-instruction`,
                  role: "label",
                  name: "Instruction",
                  text: nextLayout.selectedTask?.instruction ?? "",
                  bounds: nextLayout.detailInstructionBounds,
                  visible: true,
                  enabled: true,
                  focusable: false,
                  focused: false,
                  children: []
                },
                {
                  id: `${ctx.window.id}-owner`,
                  role: "label",
                  name: "Owner",
                  text: nextLayout.selectedTask?.owner ?? "",
                  bounds: {
                    x: nextLayout.detailBounds.x,
                    y: nextLayout.detailBounds.y + 122,
                    width: nextLayout.detailBounds.width,
                    height: 22
                  },
                  visible: true,
                  enabled: true,
                  focusable: false,
                  focused: false,
                  children: []
                },
                {
                  id: `${ctx.window.id}-difficulty`,
                  role: "label",
                  name: "Difficulty",
                  text: nextLayout.selectedTask?.difficulty ?? "",
                  bounds: {
                    x: nextLayout.detailBounds.x,
                    y: nextLayout.detailBounds.y + 148,
                    width: nextLayout.detailBounds.width,
                    height: 22
                  },
                  visible: true,
                  enabled: true,
                  focusable: false,
                  focused: false,
                  children: []
                },
                {
                  id: `${ctx.window.id}-apps`,
                  role: "label",
                  name: "Apps",
                  text: nextLayout.selectedTask?.appRefs?.join(", ") ?? "",
                  bounds: {
                    x: nextLayout.detailBounds.x,
                    y: nextLayout.detailBounds.y + 174,
                    width: nextLayout.detailBounds.width,
                    height: 42
                  },
                  visible: true,
                  enabled: true,
                  focusable: false,
                  focused: false,
                  children: []
                },
                ...(nextLayout.selectedTask?.actions ?? []).map((action, index) => ({
                  id: `${ctx.window.id}-action-${index}`,
                  role: "label" as const,
                  name: `Action ${index + 1}`,
                  text: action,
                  bounds: nextLayout.detailActionRects[index],
                  visible: true,
                  enabled: true,
                  focusable: false,
                  focused: false,
                  children: []
                }))
              ]
            }
          ]
        : state.currentPage === "help"
        ? [
            {
              id: `${ctx.window.id}-help-topics`,
              role: "list",
              name: "Help topics",
              bounds: nextLayout.helpTopicsBounds,
              visible: true,
              enabled: true,
              focusable: true,
              focused: false,
              children: state.helpTopics.map((topic, index) => ({
                id: `${ctx.window.id}-help-topic-${topic.id}`,
                role: "listitem",
                name: topic.title,
                bounds: nextLayout.helpTopicRects[index],
                visible: true,
                enabled: true,
                focusable: true,
                focused: topic.id === state.selectedHelpTopicId,
                children: []
              }))
            },
            {
              id: `${ctx.window.id}-help`,
              role: "label",
              name: nextLayout.selectedHelpTopic?.title ?? HELP_CENTER_TITLE,
              text: [nextLayout.selectedHelpTopic?.title ?? "", ...state.helpLines].filter(Boolean).join("\n"),
              bounds: nextLayout.helpDetailBounds,
              visible: true,
              enabled: true,
              focusable: false,
              focused: false,
              children: [
                {
                  id: `${ctx.window.id}-help-topic-title`,
                  role: "label",
                  name: "Help topic title",
                  text: nextLayout.selectedHelpTopic?.title ?? "",
                  bounds: {
                    x: nextLayout.helpDetailBounds.x,
                    y: nextLayout.helpDetailBounds.y,
                    width: nextLayout.helpDetailBounds.width,
                    height: 28
                  },
                  visible: true,
                  enabled: true,
                  focusable: false,
                  focused: false,
                  children: []
                },
                ...state.helpLines.map((line, index) => ({
                  id: `${ctx.window.id}-help-line-${index}`,
                  role: "label" as const,
                  name: `Help line ${index + 1}`,
                  text: line,
                  bounds: nextLayout.helpLineRects[index],
                  visible: true,
                  enabled: true,
                  focusable: true,
                  focused: state.selectedHelpLineIndex === index,
                  children: []
                }))
              ]
            }
          ]
        : [];

    return [
      {
        id: `${ctx.window.id}-window`,
        role: "window",
        name: ctx.window.title,
        bounds: ctx.window.bounds,
        visible: !ctx.window.minimized,
        enabled: true,
        focusable: true,
        focused: ctx.window.focused,
        children: [
          ...state.tabs.map((tab, index) => ({
            id: `${ctx.window.id}-tab-${tab.id}`,
            role: "button" as const,
            name: tab.title,
            bounds: nextLayout.tabRects[index],
            visible: true,
            enabled: true,
            focusable: true,
            focused: tab.active,
            children: []
          })),
          {
            id: `${ctx.window.id}-address`,
            role: "textbox",
            name: "Address bar",
            text: state.addressBarFocused ? state.addressInput : state.url,
            bounds: nextLayout.addressBarBounds,
            visible: true,
            enabled: true,
            focusable: true,
            focused: state.addressBarFocused,
            children: []
          },
          {
            id: `${ctx.window.id}-bookmarks`,
            role: "list",
            name: "Bookmarks",
            bounds: nextLayout.bookmarkColumnBounds,
            visible: true,
            enabled: true,
            focusable: true,
            focused: false,
            children: state.bookmarks.map((bookmark, index) => ({
              id: `${ctx.window.id}-bookmark-${bookmark.id}`,
              role: "listitem",
              name: bookmark.label,
              bounds: nextLayout.bookmarkRects[index],
              visible: true,
              enabled: true,
              focusable: true,
              focused: bookmark.id === state.lastOpenedBookmarkId,
              children: []
            }))
          },
          ...explorerChildren
        ]
      }
    ];
  },
  buildViewModel(state, ctx: BuildContext): BrowserLiteViewModel {
    const layout = getBrowserLiteLayout(ctx.window.bounds, state);
    return {
      type: "browser-lite",
      appName: state.appName,
      renderMode: state.renderMode,
      url: state.url,
      addressInput: state.addressInput,
      addressBarFocused: state.addressBarFocused,
      pageTitle: state.pageTitle,
      currentPage: state.currentPage,
      tabs: state.tabs,
      bookmarks: state.bookmarks,
      categories: state.categories,
      selectedCategoryId: state.selectedCategoryId,
      selectedTaskId: state.selectedTaskId,
      helpTopics: state.helpTopics,
      selectedHelpTopicId: state.selectedHelpTopicId,
      helpLines: state.helpLines,
      lastOpenedBookmarkId: state.lastOpenedBookmarkId,
      selectedHelpLineIndex: state.selectedHelpLineIndex,
      layout
    };
  }
};
