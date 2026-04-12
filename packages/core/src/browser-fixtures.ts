import type { BrowserBookmark, BrowserHelpTopic, BrowserTaskCard, BrowserTaskCategory } from "./types.js";

export const BROWSER_BOOKMARKS: BrowserBookmark[] = [
  { id: "downloads", label: "Downloads", page: "explorer", targetCategoryId: "workflow" },
  { id: "osworld", label: "OSWorld", page: "explorer" },
  { id: "ubuntu-docs", label: "Ubuntu Docs", page: "help", targetHelpTopicId: "dock-basics" },
  { id: "research-board", label: "Research Board", page: "explorer", targetCategoryId: "chrome" }
];

export const BROWSER_HELP_TOPICS: BrowserHelpTopic[] = [
  {
    id: "dock-basics",
    title: "Dock basics",
    lines: [
      "Use the dock to switch between Files, Text Editor, Terminal, Firefox, and Thunderbird.",
      "Use the OSWorld bookmark to return to Explorer quickly."
    ]
  },
  {
    id: "window-controls",
    title: "Window controls",
    lines: [
      "Use the title-bar buttons to close, minimize, or maximize a window.",
      "Restoring a minimized editor keeps its unsaved text intact."
    ]
  },
  {
    id: "workflow-notes",
    title: "Workflow notes",
    lines: [
      "Representative OSWorld-style tasks often span browser, mail, terminal, and file workflows.",
      "Record extracted text in a note and save before finishing."
    ]
  },
  {
    id: "keyboard-shortcuts",
    title: "Keyboard shortcuts",
    lines: [
      "Use Ctrl+S to save the active note editor.",
      "Use Ctrl+C and Ctrl+V after selecting the source line."
    ]
  }
];

export const BROWSER_TASK_CATEGORIES: BrowserTaskCategory[] = [
  {
    id: "workflow",
    label: "Workflow",
    tasks: [
      {
        id: "workflow_mail_bridge",
        domain: "Workflow",
        title: "Bridge a Thunderbird summary into notes",
        instruction: "Review a Thunderbird summary and record the task id in a local note.",
        actions: ["Open Firefox", "Select Workflow", "Inspect task card", "Log task id into a note"],
        owner: "Ops Desk",
        difficulty: "Medium",
        appRefs: ["Firefox", "Thunderbird", "Text Editor"]
      },
      {
        id: "workflow_terminal_capture",
        domain: "Workflow",
        title: "Capture terminal output in notes",
        instruction: "Run a short terminal command and store its output in a text note.",
        actions: ["Open Terminal", "Run pwd", "Open note", "Save output"],
        owner: "Infra Lab",
        difficulty: "Medium",
        appRefs: ["Terminal", "Text Editor"]
      },
      {
        id: "workflow_help_digest",
        domain: "Workflow",
        title: "Digest a help topic into notes",
        instruction: "Read a help topic in Firefox and save a short digest in a note.",
        actions: ["Open Firefox", "Switch to help", "Extract key line", "Save digest"],
        owner: "Support Docs",
        difficulty: "Hard",
        appRefs: ["Firefox", "Text Editor"]
      }
    ]
  },
  {
    id: "os",
    label: "OS",
    tasks: [
      {
        id: "os_restore_window",
        domain: "OS",
        title: "Restore a minimized editor",
        instruction: "Bring a minimized editor window back from the dock and save the pending work.",
        actions: ["Inspect dock", "Restore window", "Save file"],
        owner: "Desktop Team",
        difficulty: "Easy",
        appRefs: ["Dock", "Text Editor"]
      },
      {
        id: "os_popup_dismissal",
        domain: "OS",
        title: "Dismiss a blocking popup",
        instruction: "Clear a modal popup before interacting with the desktop again.",
        actions: ["Find popup", "Dismiss dialog", "Resume task"],
        owner: "Desktop Team",
        difficulty: "Easy",
        appRefs: ["Desktop", "Firefox"]
      },
      {
        id: "os_dock_relaunch",
        domain: "OS",
        title: "Relaunch Firefox from the dock",
        instruction: "Close Firefox, relaunch it from the dock, and verify the browser is back.",
        actions: ["Close browser", "Use dock launcher", "Confirm browser restored"],
        owner: "Desktop Team",
        difficulty: "Medium",
        appRefs: ["Dock", "Firefox"]
      }
    ]
  },
  {
    id: "chrome",
    label: "Chrome",
    tasks: [
      {
        id: "chrome_explorer_review",
        domain: "Chrome",
        title: "Review the OSWorld Explorer board",
        instruction: "Open the explorer board and inspect a browser-oriented task card.",
        actions: ["Open browser", "Navigate board", "Inspect visible task details"],
        owner: "Research Board",
        difficulty: "Medium",
        appRefs: ["Firefox"]
      },
      {
        id: "chrome_help_capture",
        domain: "Chrome",
        title: "Capture the Ubuntu help reminder",
        instruction: "Switch to the Ubuntu help tab and record the dock reminder line in a note.",
        actions: ["Switch tab", "Read reminder line", "Save line into a note"],
        owner: "Support Docs",
        difficulty: "Medium",
        appRefs: ["Firefox", "Text Editor"]
      },
      {
        id: "chrome_bookmark_cleanup",
        domain: "Chrome",
        title: "Clean up a browser bookmark note",
        instruction: "Open the research board, inspect the bookmark guidance, and repair the local bookmark note.",
        actions: ["Open research board", "Inspect bookmark guidance", "Update note", "Save note"],
        owner: "Support Docs",
        difficulty: "Hard",
        appRefs: ["Firefox", "Text Editor"]
      }
    ]
  },
  {
    id: "thunderbird",
    label: "Thunderbird",
    tasks: [
      {
        id: "thunderbird_mock_notes",
        domain: "Thunderbird",
        title: "Capture the mock environment reminder",
        instruction: "Open the Mock environment notes message and copy its reminder into a note.",
        actions: ["Open Thunderbird", "Select message", "Copy reminder text", "Save note"],
        owner: "Mail Desk",
        difficulty: "Hard",
        appRefs: ["Thunderbird", "Text Editor"]
      },
      {
        id: "thunderbird_task_pack",
        domain: "Thunderbird",
        title: "Review the Ubuntu desktop task pack",
        instruction: "Open the Ubuntu desktop task pack message and review its workflow coverage.",
        actions: ["Open inbox", "Select task pack message", "Read preview"],
        owner: "Mail Desk",
        difficulty: "Medium",
        appRefs: ["Thunderbird", "Firefox"]
      },
      {
        id: "thunderbird_inbox_triage",
        domain: "Thunderbird",
        title: "Triage a support inbox task",
        instruction: "Review the support inbox summary and record the final action in a note.",
        actions: ["Open support inbox", "Inspect summary", "Record follow-up", "Save note"],
        owner: "Mail Desk",
        difficulty: "Hard",
        appRefs: ["Thunderbird", "Text Editor"]
      }
    ]
  }
];

const bookmarkMap = new Map(BROWSER_BOOKMARKS.map((bookmark) => [bookmark.id, bookmark]));
const helpTopicMap = new Map(BROWSER_HELP_TOPICS.map((topic) => [topic.id, topic]));
const categoryMap = new Map(BROWSER_TASK_CATEGORIES.map((category) => [category.id, category]));
const taskMap = new Map<string, BrowserTaskCard>();
for (const category of BROWSER_TASK_CATEGORIES) {
  for (const task of category.tasks) {
    taskMap.set(`${category.id}:${task.id}`, task);
  }
}

export function getBrowserBookmark(bookmarkId: string) {
  const bookmark = bookmarkMap.get(bookmarkId);
  if (!bookmark) {
    throw new Error(`Unknown browser bookmark: ${bookmarkId}`);
  }
  return bookmark;
}

export function getBrowserHelpTopic(topicId: string) {
  const topic = helpTopicMap.get(topicId);
  if (!topic) {
    throw new Error(`Unknown help topic: ${topicId}`);
  }
  return topic;
}

export function getBrowserTaskCategory(categoryId: string) {
  const category = categoryMap.get(categoryId);
  if (!category) {
    throw new Error(`Unknown browser task category: ${categoryId}`);
  }
  return category;
}

export function getBrowserTask(categoryId: string, taskId: string) {
  const task = taskMap.get(`${categoryId}:${taskId}`);
  if (!task) {
    throw new Error(`Unknown browser task: ${categoryId}/${taskId}`);
  }
  return task;
}

export function listBrowserTasks() {
  return BROWSER_TASK_CATEGORIES.flatMap((category) =>
    category.tasks.map((task) => ({ categoryId: category.id, categoryLabel: category.label, task }))
  );
}

export function formatBrowserTaskApps(task: BrowserTaskCard) {
  return task.appRefs.join(', ');
}
