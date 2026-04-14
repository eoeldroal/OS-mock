import type { BrowserLiteViewModel, Rect } from "../../../core/src/types.js";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttr(value: string) {
  return escapeHtml(value).replaceAll("`", "&#96;");
}

function relativeRect(rect: Rect, contentBounds: Rect) {
  return {
    x: rect.x - contentBounds.x,
    y: rect.y - contentBounds.y,
    width: rect.width,
    height: rect.height
  };
}

function insetRect(rect: Rect, dx: number, dy: number) {
  return {
    x: rect.x + dx,
    y: rect.y + dy,
    width: Math.max(0, rect.width - dx * 2),
    height: Math.max(0, rect.height - dy * 2)
  };
}

function rectStyle(rect: Rect, contentBounds: Rect, extra = "") {
  const relative = relativeRect(rect, contentBounds);
  return `position:absolute;left:${relative.x}px;top:${relative.y}px;width:${relative.width}px;height:${relative.height}px;${extra}`;
}

function a11yAttrs(attrs: Record<string, string | number | boolean | undefined>) {
  return Object.entries(attrs)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `data-a11y-${key}="${escapeAttr(String(value))}"`)
    .join(" ");
}

function renderExplorer(model: BrowserLiteViewModel) {
  const { layout } = model;
  const selectedCategory =
    model.categories.find((category) => category.id === model.selectedCategoryId) ?? model.categories[0];
  const selectedTask =
    selectedCategory?.tasks.find((task) => task.id === model.selectedTaskId) ?? selectedCategory?.tasks[0];
  const taskPane: Rect = {
    x: layout.taskColumnBounds.x,
    y: layout.taskColumnBounds.y + 18,
    width: layout.taskColumnBounds.width,
    height: Math.max(120, layout.taskColumnBounds.height - 18)
  };
  const taskRects = (selectedCategory?.tasks ?? []).map((_, index) => insetRect(layout.taskRects[index], 8, 4));
  const detailBounds = insetRect(layout.detailBounds, 18, 0);
  const sectionBar: Rect = {
    x: layout.bookmarkColumnBounds.x,
    y: layout.bookmarkColumnBounds.y - 34,
    width: layout.detailBounds.x + layout.detailBounds.width - layout.bookmarkColumnBounds.x,
    height: 24
  };

  const bookmarks = model.bookmarks
    .map((bookmark, index) => {
      const active =
        bookmark.id === model.lastOpenedBookmarkId ||
        (bookmark.page === "explorer" && model.currentPage === "explorer") ||
        (bookmark.page === "help" && model.currentPage === "help");
      return `<div style="${rectStyle(
        layout.bookmarkRects[index],
        layout.contentBounds,
        `display:flex;align-items:center;justify-content:space-between;padding:0 6px;border-radius:8px;font:500 13px/1.2 Ubuntu, system-ui, sans-serif;color:${
          active ? "#1f2937" : "#3f4a5a"
        };background:transparent;`
      )}" ${a11yAttrs({
        id: `bookmark-${bookmark.id}`,
        role: "listitem",
        name: bookmark.label,
        focused: bookmark.id === model.lastOpenedBookmarkId
      })}><span style="display:flex;align-items:center;"><span style="width:7px;height:7px;margin-right:8px;border-radius:999px;background:${
        active ? "#2563eb" : "#cbd5e1"
      };"></span>${escapeHtml(bookmark.label)}</span><span style="font:600 11px/1 Ubuntu,system-ui,sans-serif;color:#94a3b8;">${
        bookmark.id === "downloads" ? "16" : bookmark.id === "osworld" ? "8" : bookmark.id === "ubuntu-docs" ? "12" : "5"
      }</span></div>`;
    })
    .join("");

  const categories = model.categories
    .map((category, index) => {
      const selected = category.id === model.selectedCategoryId;
      return `<div style="${rectStyle(
        layout.categoryRects[index],
        layout.contentBounds,
        `display:flex;align-items:center;justify-content:space-between;padding:0 10px;border-radius:8px;border:1px solid ${
          selected ? "rgba(37,99,235,0.28)" : "rgba(226,232,240,0.95)"
        };background:${selected ? "#eef4ff" : "#ffffff"};color:#1f2937;font:500 13px/1.2 Ubuntu, system-ui, sans-serif;`
      )}" ${a11yAttrs({
        id: `category-${category.id}`,
        role: "listitem",
        name: category.label,
        focused: selected
      })}><span>${escapeHtml(category.label)}</span><span style="min-width:22px;height:20px;padding:0 6px;border-radius:999px;background:${
        selected ? "#dbeafe" : "#f1f5f9"
      };color:${selected ? "#1d4ed8" : "#64748b"};display:inline-flex;align-items:center;justify-content:center;font:700 11px/1 Ubuntu,system-ui,sans-serif;">${category.tasks.length}</span></div>`;
    })
    .join("");

  const tasks = (selectedCategory?.tasks ?? [])
    .map((task, index) => {
      const selected = task.id === model.selectedTaskId;
      return `<div style="${rectStyle(
        taskRects[index],
        layout.contentBounds,
        `padding:10px 12px;border-radius:10px;border:1px solid ${
          selected ? "rgba(37,99,235,0.18)" : "rgba(226,232,240,0.9)"
        };background:${selected ? "#f8fbff" : "#ffffff"};box-shadow:none;display:flex;flex-direction:column;justify-content:flex-start;overflow:hidden;`
      )}" ${a11yAttrs({
        id: `task-${task.id}`,
        role: "listitem",
        name: task.title,
        text: task.id,
        focused: selected
      })}>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
          <div style="font:700 11px/1.1 'Ubuntu Mono', ui-monospace, monospace;color:#2563eb;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(task.id)}</div>
          <span style="padding:3px 8px;border-radius:999px;background:${selected ? "#dbeafe" : "#f8fafc"};color:${selected ? "#1d4ed8" : "#64748b"};font:700 10px/1 Ubuntu,system-ui,sans-serif;">${escapeHtml(task.domain)}</span>
        </div>
        <div style="margin-top:7px;font:700 13px/1.32 Ubuntu, system-ui, sans-serif;color:#111827;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${escapeHtml(task.title)}</div>
        <div style="margin-top:4px;font:400 10px/1.35 Ubuntu, system-ui, sans-serif;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">Open details for full instruction</div>
      </div>`;
    })
    .join("");

  const actions = (selectedTask?.actions ?? [])
    .map((action, index) => {
      const rect = layout.detailActionRects[index];
      return `<div style="${rectStyle(
        rect,
        layout.contentBounds,
        "display:flex;align-items:center;font:500 11px/1.3 Ubuntu, system-ui, sans-serif;color:#334155;overflow:hidden;"
      )}" ${a11yAttrs({
        id: `action-${index + 1}`,
        role: "label",
        name: `Action ${index + 1}`,
        text: action
      })}><span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;margin-right:8px;border-radius:999px;background:#dbeafe;color:#1d4ed8;font:700 11px/1 Ubuntu,system-ui,sans-serif;">${
        index + 1
      }</span>${escapeHtml(action)}</div>`;
    })
    .join("");

  return `
    <div style="${rectStyle(sectionBar, layout.contentBounds, "display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(226,232,240,0.95);font:500 11px/1 Ubuntu, system-ui, sans-serif;color:#64748b;")}" ${a11yAttrs({ id: "recording-toolbar", role: "label", name: "Explorer toolbar" })}>
      <span>Showing ${selectedCategory?.tasks.length ?? 0} recordings in ${escapeHtml(selectedCategory?.label ?? "selected category")}</span>
      <span>Updated 11:24</span>
    </div>
    <div style="${rectStyle(layout.bookmarkHeaderBounds, layout.contentBounds, "font:700 11px/1 Ubuntu, system-ui, sans-serif;letter-spacing:0.08em;text-transform:uppercase;color:#94a3b8;")}" ${a11yAttrs({ id: "bookmarks-label", role: "label", name: "Quick links" })}>Quick links</div>
    ${bookmarks}
    <div style="${rectStyle(layout.categoryHeaderBounds, layout.contentBounds, "font:800 11px/1 Ubuntu, system-ui, sans-serif;letter-spacing:0.08em;text-transform:uppercase;color:#94a3b8;")}" ${a11yAttrs({ id: "categories-label", role: "label", name: "Categories" })}>Categories</div>
    ${categories}
    <div style="${rectStyle(taskPane, layout.contentBounds, "border-radius:12px;border:1px solid rgba(226,232,240,0.95);background:#ffffff;box-shadow:0 1px 2px rgba(15,23,42,0.03);")}" ${a11yAttrs({
      id: "recording-panel",
      role: "label",
      name: "Recording list",
      text: [selectedTask?.id ?? "", selectedTask?.instruction ?? "", ...(selectedTask?.actions ?? [])].filter(Boolean).join("\n")
    })}></div>
    <div style="${rectStyle(layout.taskHeaderBounds, layout.contentBounds, "font:800 12px/1 Ubuntu, system-ui, sans-serif;letter-spacing:0.08em;text-transform:uppercase;color:#475569;")}" ${a11yAttrs({ id: "results-label", role: "label", name: "Recordings" })}>Recordings</div>
    ${tasks}
    <div style="${rectStyle(
      detailBounds,
      layout.contentBounds,
      "border-radius:14px;border:1px solid rgba(203,213,225,0.92);background:linear-gradient(180deg,#ffffff 0%,#f8fbff 100%);box-shadow:0 4px 10px rgba(15,23,42,0.04);overflow:hidden;"
    )}" ${a11yAttrs({
      id: "task-detail",
      role: "label",
      name: selectedTask?.title ?? "Selected task",
      text: [selectedTask?.id ?? "", selectedTask?.instruction ?? "", ...(selectedTask?.actions ?? [])].filter(Boolean).join("\n")
    })}></div>
    <div style="${rectStyle(layout.detailTitleBounds, layout.contentBounds, "padding:0 18px;display:flex;align-items:center;font:700 16px/1.2 Ubuntu, system-ui, sans-serif;color:#0f172a;")}" ${a11yAttrs({ id: "detail-title", role: "label", name: "Recording details" })}>Recording details</div>
    <div style="${rectStyle(layout.detailTaskIdLabelBounds, layout.contentBounds, "padding:0 18px;font:700 10px/1 Ubuntu, system-ui, sans-serif;letter-spacing:0.08em;text-transform:uppercase;color:#94a3b8;")}" ${a11yAttrs({ id: "detail-task-id-label", role: "label", name: "Task ID" })}>Task ID</div>
    <div style="${rectStyle(layout.detailTaskIdValueBounds, layout.contentBounds, "padding:0 18px;font:700 14px/1.4 'Ubuntu Mono', ui-monospace, monospace;color:#2563eb;")}" ${a11yAttrs({ id: "detail-task-id-value", role: "label", name: "Task ID", text: selectedTask?.id ?? "" })}>${escapeHtml(selectedTask?.id ?? "")}</div>
    <div style="${rectStyle(layout.detailInstructionLabelBounds, layout.contentBounds, "padding:0 18px;font:700 10px/1 Ubuntu, system-ui, sans-serif;letter-spacing:0.08em;text-transform:uppercase;color:#94a3b8;")}" ${a11yAttrs({ id: "instruction-label", role: "label", name: "Instruction" })}>Instruction</div>
    <div style="${rectStyle(layout.detailInstructionBounds, layout.contentBounds, "padding:0 18px;font:400 12px/1.5 Ubuntu, system-ui, sans-serif;color:#334155;white-space:pre-wrap;overflow:hidden;")}" ${a11yAttrs({ id: "instruction-value", role: "label", name: "Instruction", text: selectedTask?.instruction ?? "" })}>${escapeHtml(selectedTask?.instruction ?? "")}</div>
    <div style="${rectStyle(layout.detailActionsLabelBounds, layout.contentBounds, "padding:0 18px;font:700 10px/1 Ubuntu, system-ui, sans-serif;letter-spacing:0.08em;text-transform:uppercase;color:#94a3b8;")}" ${a11yAttrs({ id: "actions-label", role: "label", name: "Recommended actions" })}>Suggested steps</div>
    ${actions}
  `;
}

function renderHelp(model: BrowserLiteViewModel) {
  const { layout } = model;
  const topicPanel = model.helpTopics
    .map((topic, index) => {
      const selected = topic.id === model.selectedHelpTopicId;
      return `<div style="${rectStyle(
        layout.helpTopicRects[index],
        layout.contentBounds,
        `display:flex;align-items:center;padding:0 10px;border-radius:10px;border:1px solid ${
          selected ? "rgba(37,99,235,0.24)" : "rgba(226,232,240,0.95)"
        };background:${selected ? "#eff6ff" : "#ffffff"};font:600 13px/1.3 Ubuntu, system-ui, sans-serif;color:${
          selected ? "#1d4ed8" : "#334155"
        };`
      )}" ${a11yAttrs({
        id: `help-topic-${topic.id}`,
        role: "listitem",
        name: topic.title,
        focused: selected
      })}>${escapeHtml(topic.title)}</div>`;
    })
    .join("");

  const helpTitleHeight = 18;
  const helpSubtitleHeight = 18;
  const titleRect: Rect = {
    x: layout.helpDetailBounds.x,
    y: layout.helpDetailBounds.y + 18,
    width: layout.helpDetailBounds.width,
    height: helpTitleHeight
  };
  const subtitleRect: Rect = {
    x: layout.helpDetailBounds.x,
    y: layout.helpTextBounds.y + helpTitleHeight + 22,
    width: layout.helpDetailBounds.width,
    height: helpSubtitleHeight
  };

  const lines = model.helpLines
    .map((line, index) => {
      const selected = model.selectedHelpLineIndex === index;
      const isHeaderLine = index === 0 && line.trim().toLowerCase() === "ubuntu help";
      return `<div style="${rectStyle(
        layout.helpLineRects[index],
        layout.contentBounds,
        isHeaderLine
          ? "padding:12px 16px;border-radius:14px;border:1px solid rgba(226,232,240,0.95);background:#ffffff;font:700 14px/1.35 Ubuntu, system-ui, sans-serif;color:#334155;"
          : `padding:12px 16px;border-radius:14px;border:1px solid ${
              selected ? "rgba(37,99,235,0.24)" : "rgba(226,232,240,0.95)"
            };background:${selected ? "#eff6ff" : "#ffffff"};box-shadow:${
              selected ? "0 8px 24px rgba(37,99,235,0.08)" : "none"
            };font:400 13px/1.55 Ubuntu, system-ui, sans-serif;color:#334155;`
      )}" ${a11yAttrs({
        id: `help-line-${index + 1}`,
        role: "label",
        name: `Help line ${index + 1}`,
        text: line,
        focused: selected
      })}>${escapeHtml(line)}</div>`;
    })
    .join("");

  return `
    <div style="${rectStyle(layout.helpTopicsBounds, layout.contentBounds, "border-radius:14px;border:1px solid rgba(226,232,240,0.95);background:#f8fafc;overflow:hidden;")}" ${a11yAttrs({ id: "help-topics-panel", role: "list", name: "Help topics" })}></div>
    <div style="${rectStyle({ x: layout.helpTopicsBounds.x, y: layout.helpTopicsBounds.y - 18, width: layout.helpTopicsBounds.width, height: 16 }, layout.contentBounds, "font:800 11px/1 Ubuntu, system-ui, sans-serif;letter-spacing:0.08em;text-transform:uppercase;color:#94a3b8;")}" ${a11yAttrs({ id: "help-topics-label", role: "label", name: "Help topics" })}>Help topics</div>
    ${topicPanel}
    <div style="${rectStyle(titleRect, layout.contentBounds, "font:700 12px/1 Ubuntu, system-ui, sans-serif;color:#64748b;letter-spacing:0.08em;text-transform:uppercase;")}" ${a11yAttrs({ id: "help-title", role: "label", name: "Help guide" })}>Guide</div>
    <div style="${rectStyle(subtitleRect, layout.contentBounds, "font:400 12px/1.45 Ubuntu, system-ui, sans-serif;color:#64748b;")}" ${a11yAttrs({ id: "help-subtitle", role: "label", name: "Help subtitle" })}>Reference notes for local desktop workflows, shortcuts, and troubleshooting.</div>
    ${lines}
  `;
}

export function renderBrowserSurfaceHtml(model: BrowserLiteViewModel) {
  const content = model.currentPage === "help" ? renderHelp(model) : renderExplorer(model);
  const width = model.layout.contentBounds.width;
  const height = model.layout.contentBounds.height;

  return `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${escapeHtml(model.pageTitle)}</title>
      <style>
        :root {
          color-scheme: light;
          font-family: Ubuntu, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        * { box-sizing: border-box; }
        html, body {
          margin: 0;
          width: ${width}px;
          height: ${height}px;
          overflow: hidden;
          background: linear-gradient(180deg, #ffffff 0%, #f7f9fc 100%);
        }
        body {
          position: relative;
          color: #0f172a;
        }
        .hero {
          position: absolute;
          left: 18px;
          top: 12px;
          right: 18px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .hero-title {
          font: 800 16px/1 Ubuntu, system-ui, sans-serif;
          color: #111827;
        }
        .hero-subtitle {
          margin-top: 4px;
          font: 400 11px/1.3 Ubuntu, system-ui, sans-serif;
          color: #64748b;
        }
        .crumb {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 6px;
          color: #64748b;
          font: 700 10px/1 Ubuntu, system-ui, sans-serif;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .chips {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .chip {
          border-radius: 999px;
          border: 1px solid #dbe3ef;
          background: #f8fafc;
          padding: 4px 10px;
          font: 700 11px/1 Ubuntu, system-ui, sans-serif;
          color: #475569;
        }
        .banner {
          position: absolute;
          left: 18px;
          top: 52px;
          right: 18px;
          height: 30px;
          border-radius: 10px;
          border: 1px solid #dbeafe;
          background: linear-gradient(180deg, #f8fbff 0%, #eef5ff 100%);
          color: #31527c;
          display: flex;
          align-items: center;
          padding: 0 14px;
          font: 500 12px/1 Ubuntu, system-ui, sans-serif;
        }
      </style>
    </head>
    <body>
      <div class="hero">
        <div>
          <div class="crumb">
            <span>Datasets</span>
            <span>/</span>
            <span>${escapeHtml(model.currentPage === "help" ? "Help" : "Task Board")}</span>
          </div>
          <div class="hero-title">${escapeHtml(model.currentPage === "help" ? "Help Center" : "Task Board")}</div>
          <div class="hero-subtitle">${
            model.currentPage === "help"
              ? "Quick-reference notes and workflow guidance"
              : "Browse workflow cards, app coverage, and task metadata"
          }</div>
        </div>
        <div class="chips">
          <span class="chip">dataset</span>
          <span class="chip">${escapeHtml(
            model.categories.find((category) => category.id === model.selectedCategoryId)?.label ?? "workflow"
          )}</span>
        </div>
      </div>
      <div class="banner">${
        model.currentPage === "help"
          ? "Reference notes stay available here while you copy exact lines into local files."
          : "Workflow cards are searchable by domain, app family, and workflow category."
      }</div>
      ${content}
    </body>
  </html>`;
}
