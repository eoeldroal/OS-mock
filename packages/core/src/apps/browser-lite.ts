import type {
  A11yNode,
  AppPlugin,
  BrowserLiteState,
  BrowserLiteViewModel,
  BuildContext,
  Rect
} from "../types.js";

const HEADER_HEIGHT = 32;
const TAB_HEIGHT = 30;
const TOOLBAR_HEIGHT = 42;
const PADDING = 12;
const CONTENT_INSET = 14;
const BOOKMARK_WIDTH = 138;
const CATEGORY_WIDTH = 136;
const TASK_WIDTH = 208;

function rowBounds(base: Rect, index: number, height: number, gap = 8): Rect {
  return {
    x: base.x,
    y: base.y + index * (height + gap),
    width: base.width,
    height
  };
}

export function getBrowserLiteLayout(bounds: Rect, state: BrowserLiteState) {
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
    x: bounds.x + PADDING,
    y: bounds.y + HEADER_HEIGHT + TAB_HEIGHT + TOOLBAR_HEIGHT + 8,
    width: bounds.width - PADDING * 2,
    height: bounds.height - HEADER_HEIGHT - TAB_HEIGHT - TOOLBAR_HEIGHT - 20
  };

  const bookmarksBounds = {
    x: contentFrameBounds.x + CONTENT_INSET,
    y: contentFrameBounds.y + CONTENT_INSET + 32,
    width: BOOKMARK_WIDTH,
    height: contentFrameBounds.height - CONTENT_INSET * 2 - 32
  };

  const categoriesBounds = {
    x: bookmarksBounds.x + bookmarksBounds.width + 14,
    y: bookmarksBounds.y + 32,
    width: CATEGORY_WIDTH,
    height: bookmarksBounds.height - 32
  };

  const tasksBounds = {
    x: categoriesBounds.x + categoriesBounds.width + 14,
    y: categoriesBounds.y + 32,
    width: TASK_WIDTH,
    height: categoriesBounds.height - 32
  };

  const detailBounds = {
    x: tasksBounds.x + tasksBounds.width + 16,
    y: bookmarksBounds.y + 32,
    width:
      contentFrameBounds.x + contentFrameBounds.width - CONTENT_INSET - (tasksBounds.x + tasksBounds.width + 16),
    height: tasksBounds.height
  };

  const helpTopicsBounds = {
    x: bookmarksBounds.x + bookmarksBounds.width + 14,
    y: bookmarksBounds.y + 32,
    width: 188,
    height: bookmarksBounds.height - 32
  };

  const helpDetailBounds = {
    x: helpTopicsBounds.x + helpTopicsBounds.width + 18,
    y: bookmarksBounds.y + 32,
    width:
      contentFrameBounds.x + contentFrameBounds.width - CONTENT_INSET - (helpTopicsBounds.x + helpTopicsBounds.width + 18),
    height: helpTopicsBounds.height
  };

  const selectedCategory =
    state.categories.find((category) => category.id === state.selectedCategoryId) ?? state.categories[0];
  const selectedTask =
    selectedCategory?.tasks.find((task) => task.id === state.selectedTaskId) ?? selectedCategory?.tasks[0];
  const selectedHelpTopic =
    state.helpTopics.find((topic) => topic.id === state.selectedHelpTopicId) ?? state.helpTopics[0];

  return {
    tabsBounds,
    addressBounds,
    contentFrameBounds,
    bookmarksBounds,
    categoriesBounds,
    tasksBounds,
    detailBounds,
    helpTopicsBounds,
    helpDetailBounds,
    selectedCategory,
    selectedTask,
    selectedHelpTopic,
    tabRects: state.tabs.map((_, index) => ({
      x: tabsBounds.x + index * 122,
      y: tabsBounds.y,
      width: 114,
      height: TAB_HEIGHT
    })),
    bookmarkRects: state.bookmarks.map((_, index) => rowBounds(bookmarksBounds, index, 26)),
    categoryRects: state.categories.map((_, index) => rowBounds(categoriesBounds, index, 34)),
    taskRects: (selectedCategory?.tasks ?? []).map((_, index) => rowBounds(tasksBounds, index, 70, 10)),
    helpTopicRects: state.helpTopics.map((_, index) => rowBounds(helpTopicsBounds, index, 38, 10))
  };
}

export const browserLitePlugin: AppPlugin<BrowserLiteState> = {
  id: "browser-lite",
  title: "Mozilla Firefox",
  create() {
    return {
      id: "browser-1",
      appName: "Mozilla Firefox",
      url: "https://os-world.github.io/explorer.html",
      pageTitle: "OSWorld Explorer",
      currentPage: "explorer",
      tabs: [
        { id: "tab-1", title: "OSWorld Explorer", active: true },
        { id: "tab-2", title: "Ubuntu help", active: false }
      ],
      bookmarks: [],
      categories: [],
      selectedCategoryId: "",
      selectedTaskId: "",
      helpTopics: [],
      selectedHelpTopicId: "",
      helpLines: [],
      lastOpenedBookmarkId: undefined
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
              id: ctx.window.id + "-categories",
              role: "list",
              name: "Explorer categories",
              bounds: nextLayout.categoriesBounds,
              visible: true,
              enabled: true,
              focusable: true,
              focused: false,
              children: state.categories.map((category, index) => ({
                id: ctx.window.id + "-category-" + category.id,
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
              id: ctx.window.id + "-tasks",
              role: "list",
              name: "Explorer tasks",
              bounds: nextLayout.tasksBounds,
              visible: true,
              enabled: true,
              focusable: true,
              focused: false,
              children: (nextLayout.selectedCategory?.tasks ?? []).map((task, index) => ({
                id: ctx.window.id + "-task-" + task.id,
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
              id: ctx.window.id + "-task-detail",
              role: "textbox",
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
              focusable: true,
              focused: false,
              children: [
                {
                  id: ctx.window.id + "-task-id",
                  role: "label",
                  name: "Task ID",
                  text: nextLayout.selectedTask?.id ?? "",
                  bounds: {
                    x: nextLayout.detailBounds.x,
                    y: nextLayout.detailBounds.y,
                    width: nextLayout.detailBounds.width,
                    height: 24
                  },
                  visible: true,
                  enabled: true,
                  focusable: false,
                  focused: false,
                  children: []
                },
                {
                  id: ctx.window.id + "-instruction",
                  role: "label",
                  name: "Instruction",
                  text: nextLayout.selectedTask?.instruction ?? "",
                  bounds: {
                    x: nextLayout.detailBounds.x,
                    y: nextLayout.detailBounds.y + 36,
                    width: nextLayout.detailBounds.width,
                    height: 72
                  },
                  visible: true,
                  enabled: true,
                  focusable: false,
                  focused: false,
                  children: []
                },
                {
                  id: ctx.window.id + "-owner",
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
                  id: ctx.window.id + "-difficulty",
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
                  id: ctx.window.id + "-apps",
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
                  id: ctx.window.id + "-action-" + index,
                  role: "label" as const,
                  name: "Action " + (index + 1),
                  text: action,
                  bounds: {
                    x: nextLayout.detailBounds.x,
                    y: nextLayout.detailBounds.y + 228 + index * 24,
                    width: nextLayout.detailBounds.width,
                    height: 22
                  },
                  visible: true,
                  enabled: true,
                  focusable: false,
                  focused: false,
                  children: []
                }))
              ]
            }
          ]
        : [
            {
              id: ctx.window.id + "-help-topics",
              role: "list",
              name: "Help topics",
              bounds: nextLayout.helpTopicsBounds,
              visible: true,
              enabled: true,
              focusable: true,
              focused: false,
              children: state.helpTopics.map((topic, index) => ({
                id: ctx.window.id + "-help-topic-" + topic.id,
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
              id: ctx.window.id + "-help",
              role: "textbox",
              name: nextLayout.selectedHelpTopic?.title ?? "Ubuntu help",
              text: [nextLayout.selectedHelpTopic?.title ?? "", ...state.helpLines].filter(Boolean).join("\n"),
              bounds: nextLayout.helpDetailBounds,
              visible: true,
              enabled: true,
              focusable: true,
              focused: false,
              children: [
                {
                  id: ctx.window.id + "-help-topic-title",
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
                  id: ctx.window.id + "-help-line-" + index,
                  role: "label" as const,
                  name: "Help line " + (index + 1),
                  text: line,
                  bounds: {
                    x: nextLayout.helpDetailBounds.x,
                    y: nextLayout.helpDetailBounds.y + 48 + index * 32,
                    width: nextLayout.helpDetailBounds.width,
                    height: 26
                  },
                  visible: true,
                  enabled: true,
                  focusable: false,
                  focused: false,
                  children: []
                }))
              ]
            }
          ];

    return [
      {
        id: ctx.window.id + "-window",
        role: "window",
        name: ctx.window.title,
        bounds: ctx.window.bounds,
        visible: !ctx.window.minimized,
        enabled: true,
        focusable: true,
        focused: ctx.window.focused,
        children: [
          ...state.tabs.map((tab, index) => ({
            id: ctx.window.id + "-tab-" + tab.id,
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
            id: ctx.window.id + "-address",
            role: "textbox",
            name: "Address bar",
            text: state.url,
            bounds: nextLayout.addressBounds,
            visible: true,
            enabled: true,
            focusable: true,
            focused: false,
            children: []
          },
          {
            id: ctx.window.id + "-bookmarks",
            role: "list",
            name: "Bookmarks",
            bounds: nextLayout.bookmarksBounds,
            visible: true,
            enabled: true,
            focusable: true,
            focused: false,
            children: state.bookmarks.map((bookmark, index) => ({
              id: ctx.window.id + "-bookmark-" + bookmark.id,
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
  buildViewModel(state): BrowserLiteViewModel {
    return {
      type: "browser-lite",
      appName: state.appName,
      url: state.url,
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
      lastOpenedBookmarkId: state.lastOpenedBookmarkId
    };
  }
};
