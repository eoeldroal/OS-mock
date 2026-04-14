import type { BrowserBodyProps } from "./body-types.js";
import { PaneScrollArea } from "../PaneScrollArea.js";
import { toLocalRect } from "./layout-helpers.js";

export function BrowserBody({ model, windowBounds }: BrowserBodyProps) {
  const { layout } = model;
  const hybridSurface = model.renderMode === "hybrid" ? model.surface : undefined;
  const tabBarRect = toLocalRect(layout.tabBarBounds, windowBounds);
  const addressRect = toLocalRect(layout.addressBarBounds, windowBounds);
  const contentRect = toLocalRect(layout.contentBounds, windowBounds);
  const selectedCategory =
    layout.selectedCategory ?? model.categories.find((category) => category.id === model.selectedCategoryId);
  const selectedTask =
    layout.selectedTask ?? selectedCategory?.tasks.find((task) => task.id === model.selectedTaskId);
  const selectedHelpTopic =
    layout.selectedHelpTopic ?? model.helpTopics.find((topic) => topic.id === model.selectedHelpTopicId);
  const compactContent = contentRect.width < 760;
  const ultraCompactContent = contentRect.width < 620;
  const yaruInk = "#2e3436";
  const yaruMuted = "#6f7682";
  const yaruBorder = "#d6dce4";
  const yaruPanel = "#fbfcfd";
  const yaruPanelAlt = "#f3f5f7";
  const yaruAccent = "#e95420";
  const yaruAccentSoft = "#fde6de";
  const helpTopicSummary = {
    "dock-basics": "Switch apps from the dock and return to the task board without losing context.",
    "window-controls": "Use headerbar controls to close, minimize, maximize, and recover your workspace safely.",
    "workflow-notes": "Move between browser, terminal, mail, and notes while recording the right line.",
    "keyboard-shortcuts": "Lean on save, copy, and paste shortcuts once the source line is selected."
  } as const;
  const bookmarkSummary = {
    downloads: "Open the workflow lane that highlights file handoff and saved-note tasks.",
    osworld: "Return to the current task board and inspect another workflow card.",
    "ubuntu-docs": "Jump back into the Ubuntu guidance view with the current topic selected.",
    "research-board": "Open the alternate board with browser-heavy review cards."
  } as const;
  const compactBookmarkLabel = {
    downloads: "Downloads",
    osworld: "Board",
    "ubuntu-docs": "Docs",
    "research-board": "Research"
  } as const;
  const appRosterLabel = selectedTask?.appRefs?.join(" · ") ?? "Browser · Notes";

  const columnHeaderStyle = {
    position: "absolute" as const,
    fontSize: 10.5,
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: 0.8,
    color: yaruMuted
  };

  function panelStyle(rect: ReturnType<typeof toLocalRect>, accent = yaruBorder, background = yaruPanel) {
    return {
      position: "absolute" as const,
      left: rect.left - contentRect.left,
      top: rect.top - contentRect.top,
      width: rect.width,
      height: rect.height,
      borderRadius: 14,
      border: `1px solid ${accent}`,
      background,
      boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 12px 28px rgba(15,23,42,0.05)",
      overflow: "hidden" as const
    };
  }

  const elevatedBodyText = {
    color: "#1f2937",
    textShadow: "0 1px 0 rgba(255,255,255,0.7)"
  } as const;

  function getScrollMetrics(
    rects: Array<ReturnType<typeof toLocalRect>>,
    containerTop: number,
    visibleOffset: number,
    minViewportTop: number,
    viewportHeight: number
  ) {
    const rowTops = rects.map((rect) => rect.top - containerTop + visibleOffset);
    const viewportTop = Math.max(minViewportTop, rowTops.length > 0 ? Math.min(...rowTops) : minViewportTop);
    const contentHeight =
      rowTops.length > 0
        ? Math.max(viewportHeight, ...rects.map((rect, index) => rowTops[index] - viewportTop + rect.height))
        : viewportHeight;
    return {
      viewportTop,
      contentHeight,
      getTop(index: number) {
        return rowTops[index] - viewportTop;
      }
    };
  }

  function renderExplorerSurface() {
    const bookmarkColumnRect = toLocalRect(layout.bookmarkColumnBounds, windowBounds);
    const categoryColumnRect = toLocalRect(layout.categoryColumnBounds, windowBounds);
    const taskColumnRect = toLocalRect(layout.taskColumnBounds, windowBounds);
    const detailRect = toLocalRect(layout.detailBounds, windowBounds);
    const bookmarkHeaderRect = toLocalRect(layout.bookmarkHeaderBounds, windowBounds);
    const categoryHeaderRect = toLocalRect(layout.categoryHeaderBounds, windowBounds);
    const taskHeaderRect = toLocalRect(layout.taskHeaderBounds, windowBounds);
    const bookmarkRects = model.bookmarks.map((_, index) => toLocalRect(layout.bookmarkRects[index], windowBounds));
    const categoryRects = model.categories.map((_, index) => toLocalRect(layout.categoryRects[index], windowBounds));
    const taskRects = (selectedCategory?.tasks ?? []).map((_, index) => toLocalRect(layout.taskRects[index], windowBounds));
    const bookmarkScroll = getScrollMetrics(bookmarkRects, bookmarkColumnRect.top, 4, 40, Math.max(0, bookmarkColumnRect.height - 48));
    const categoryScroll = getScrollMetrics(categoryRects, categoryColumnRect.top, 4, 40, Math.max(0, categoryColumnRect.height - 48));
    const taskScroll = getScrollMetrics(taskRects, taskColumnRect.top, 6, 40, Math.max(0, taskColumnRect.height - 48));

    return (
      <>
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, #f8f9fb 0%, #edf1f5 100%)"
          }}
        />
        <div
          style={{
            position: "absolute",
            left: bookmarkColumnRect.left - contentRect.left,
            top: 16,
            right: 18,
            height: compactContent ? 82 : 96,
            display: "block"
          }}
        >
          <div
            style={{
              borderRadius: 16,
              border: "1px solid #d7dde5",
              background: "linear-gradient(180deg, #ffffff 0%, #f5f7fa 100%)",
              boxShadow: "0 12px 24px rgba(15,23,42,0.05)",
              height: "100%"
            }}
          >
            <div style={{ padding: "14px 16px 0", fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", color: yaruMuted }}>
              Task Board
            </div>
            <div style={{ padding: "4px 16px 0", fontSize: 17, fontWeight: 800, color: yaruInk }}>Task board and workflow catalog</div>
            <div style={{ padding: "4px 16px 0", fontSize: 12.5, color: "#526071", lineHeight: 1.42 }}>
              Browse active workflow cards, confirm the handoff, and record the requested detail in a local note before moving on.
            </div>
            <div style={{ padding: "10px 16px 0", display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[
                `${model.categories.length} lanes`,
                `${selectedCategory?.tasks.length ?? 0} visible cards`,
                selectedTask?.difficulty ? `Level ${selectedTask.difficulty}` : "Level medium"
              ]
                .slice(0, compactContent ? 2 : 3)
                .map((chip) => (
                  <div
                    key={chip}
                    style={{
                      padding: "4px 9px",
                      borderRadius: 999,
                      background: "#ffffff",
                      border: "1px solid #d8dee7",
                      fontSize: 10.5,
                      fontWeight: 700,
                      color: "#526071"
                    }}
                  >
                    {chip}
                  </div>
                ))}
            </div>
          </div>
        </div>
        <div style={panelStyle(bookmarkColumnRect, "#d9dfe7", "linear-gradient(180deg, #f8f9fb 0%, #f1f4f7 100%)")}>
          <div style={{ ...columnHeaderStyle, left: bookmarkHeaderRect.left - contentRect.left + 14, top: bookmarkHeaderRect.top - contentRect.top + 12 }}>
            Bookmarks
          </div>
          <PaneScrollArea
            style={{ top: bookmarkScroll.viewportTop, left: 0, right: 0, bottom: 8 }}
            contentStyle={{ height: bookmarkScroll.contentHeight }}
          >
            {model.bookmarks.map((bookmark, index) => {
              const rect = bookmarkRects[index];
              const active = model.lastOpenedBookmarkId === bookmark.id;
              return (
                <div
                  key={bookmark.id}
                  style={{
                    position: "absolute",
                    left: rect.left - bookmarkColumnRect.left + 10,
                    top: bookmarkScroll.getTop(index),
                    width: rect.width - 20,
                    height: rect.height - 8,
                    borderRadius: 10,
                    background: active ? yaruAccentSoft : "transparent",
                    color: active ? "#8f3516" : "#3a4350",
                    display: "flex",
                    alignItems: "center",
                    padding: "0 10px",
                    fontSize: 13,
                    fontWeight: active ? 700 : 600
                  }}
                >
                  <span
                    style={{
                      minWidth: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      fontSize: compactContent ? 12 : 13,
                      fontWeight: active ? 700 : 600
                    }}
                  >
                    {compactContent
                      ? compactBookmarkLabel[bookmark.id as keyof typeof compactBookmarkLabel] ?? bookmark.label
                      : bookmark.label}
                  </span>
                </div>
              );
            })}
          </PaneScrollArea>
        </div>

        <div style={panelStyle(categoryColumnRect, "#d9dfe7", "linear-gradient(180deg, #f8f9fb 0%, #f1f4f7 100%)")}>
          <div style={{ ...columnHeaderStyle, left: categoryHeaderRect.left - contentRect.left + 14, top: categoryHeaderRect.top - contentRect.top + 12 }}>
            Categories
          </div>
          <PaneScrollArea
            style={{ top: categoryScroll.viewportTop, left: 0, right: 0, bottom: 8 }}
            contentStyle={{ height: categoryScroll.contentHeight }}
          >
            {model.categories.map((category, index) => {
              const rect = categoryRects[index];
              const active = category.id === model.selectedCategoryId;
              return (
                <div
                  key={category.id}
                  style={{
                    position: "absolute",
                    left: rect.left - categoryColumnRect.left + 10,
                    top: categoryScroll.getTop(index),
                    width: rect.width - 20,
                    height: rect.height - 8,
                    borderRadius: 12,
                    border: active ? `1px solid ${yaruAccent}` : "1px solid transparent",
                    background: active ? yaruAccentSoft : "rgba(255,255,255,0.78)",
                    color: active ? "#8f3516" : "#334155",
                    display: "flex",
                    alignItems: "center",
                    padding: "0 12px",
                    fontSize: 13,
                    fontWeight: active ? 700 : 600
                  }}
                >
                  {category.label}
                </div>
              );
            })}
          </PaneScrollArea>
        </div>

        <div style={panelStyle(taskColumnRect, "#d7dde5", "linear-gradient(180deg, #fdfefe 0%, #f7f9fb 100%)")}>
          <div style={{ ...columnHeaderStyle, left: taskHeaderRect.left - contentRect.left + 14, top: taskHeaderRect.top - contentRect.top + 12 }}>
            Tasks
          </div>
          <PaneScrollArea
            style={{ top: taskScroll.viewportTop, left: 0, right: 0, bottom: 8 }}
            contentStyle={{ height: taskScroll.contentHeight }}
          >
            {(selectedCategory?.tasks ?? []).map((task, index) => {
              const rect = taskRects[index];
              const active = task.id === model.selectedTaskId;
              return (
                <div
                  key={task.id}
                  style={{
                    position: "absolute",
                    left: rect.left - taskColumnRect.left + 10,
                    top: taskScroll.getTop(index),
                    width: rect.width - 20,
                    height: rect.height - 12,
                    borderRadius: 14,
                    border: active ? `1px solid ${yaruAccent}` : "1px solid #dbe2ea",
                    background: active ? "linear-gradient(180deg, #fff4ef 0%, #fde8df 100%)" : "#ffffff",
                    padding: "10px 13px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    boxShadow: active ? "0 8px 18px rgba(233,84,32,0.10)" : "0 3px 10px rgba(15,23,42,0.04)"
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 700, color: yaruInk, lineHeight: 1.3 }}>{task.title}</div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ fontSize: 11, color: yaruMuted, fontWeight: 700, letterSpacing: "0.01em" }}>{task.id}</div>
                    <div
                      style={{
                        padding: "3px 7px",
                        borderRadius: 999,
                        background: active ? "rgba(255,255,255,0.86)" : "#f3f6f9",
                        border: "1px solid #dde3ea",
                        fontSize: 10.5,
                        fontWeight: 700,
                        color: "#677486"
                      }}
                    >
                      {task.difficulty}
                    </div>
                  </div>
                  {!compactContent && <div style={{ fontSize: 11.5, color: "#5d6978", lineHeight: 1.35, overflow: "hidden" }}>
                    {task.instruction.slice(0, 88)}
                  </div>}
                </div>
              );
            })}
          </PaneScrollArea>
        </div>

        <div style={panelStyle(detailRect, "#d7dde5", "linear-gradient(180deg, #ffffff 0%, #f7f9fb 100%)")}>
          <PaneScrollArea
            style={{ inset: 0 }}
            viewportStyle={{ paddingRight: 8 }}
            contentStyle={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: yaruInk, lineHeight: 1.25 }}>
                  {selectedTask?.title ?? "Select a task"}
                </div>
                <div style={{ marginTop: 6, fontSize: 11.5, fontWeight: 700, color: "#8f3516", wordBreak: "break-word" }}>
                  {selectedTask?.id ?? ""}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end", maxWidth: "54%" }}>
                {[
                  selectedTask?.domain ? `Domain: ${selectedTask.domain}` : "",
                  selectedTask?.difficulty ? `Level: ${selectedTask.difficulty}` : "",
                  selectedTask?.owner ? `Owner: ${selectedTask.owner}` : ""
                ]
                  .filter(Boolean)
                  .map((chip) => (
                    <div
                      key={chip}
                      style={{
                        padding: "5px 8px",
                        borderRadius: 999,
                        background: "#eef2f7",
                        border: "1px solid #d8dee7",
                        fontSize: 10.5,
                        fontWeight: 700,
                        color: "#526071"
                      }}
                    >
                      {chip}
                    </div>
                  ))}
              </div>
            </div>

            <div
              style={{
                borderRadius: 14,
                border: "1px solid #dde3ea",
                background: "linear-gradient(180deg, #ffffff 0%, #f6f8fa 100%)",
                padding: "12px 13px"
              }}
            >
              <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: yaruMuted }}>
                Instruction
              </div>
              <div
                style={{
                  marginTop: 8,
                  fontSize: 12.5,
                  fontWeight: 500,
                  lineHeight: 1.55,
                  whiteSpace: "pre-wrap",
                  ...elevatedBodyText
                }}
              >
                {selectedTask?.instruction ?? ""}
              </div>
            </div>

            {!!selectedTask?.appRefs?.length && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {selectedTask.appRefs.map((app) => (
                  <div
                    key={app}
                    style={{
                      padding: "5px 9px",
                      borderRadius: 999,
                      background: "#fff7f3",
                      border: "1px solid #f1d2c5",
                      color: "#9a3412",
                      fontSize: 10.5,
                      fontWeight: 700
                    }}
                  >
                    {app}
                  </div>
                ))}
              </div>
            )}

            <div
              style={{
                borderRadius: 14,
                border: "1px solid #dde3ea",
                background: "linear-gradient(180deg, #fbfcfd 0%, #f5f7fa 100%)",
                padding: "12px 13px"
              }}
            >
              <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: yaruMuted }}>
                Action plan
              </div>
              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                {(selectedTask?.actions ?? []).map((action, index) => (
                  <div
                    key={`${selectedTask?.id ?? "task"}-action-${index}`}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 8,
                      fontSize: 12,
                      fontWeight: 500,
                      color: "#334155",
                      lineHeight: 1.45
                    }}
                  >
                    <span
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 999,
                        background: "#eef2f7",
                        border: "1px solid #d8dee7",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#526071",
                        flexShrink: 0
                      }}
                    >
                      {index + 1}
                    </span>
                    <span>{action}</span>
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: compactContent ? "1fr" : "repeat(2, minmax(0, 1fr))",
                gap: 10
              }}
            >
              {[
                { label: "Apps", value: appRosterLabel },
                { label: "Recording", value: selectedTask?.owner ?? "Assigned team" }
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    borderRadius: 12,
                    border: "1px solid #dde3ea",
                    background: "linear-gradient(180deg, #ffffff 0%, #f6f8fa 100%)",
                    padding: "10px 12px"
                  }}
                >
                  <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: yaruMuted }}>
                    {item.label}
                  </div>
                  <div style={{ marginTop: 5, fontSize: 12, fontWeight: 700, color: "#364152", lineHeight: 1.35 }}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </PaneScrollArea>
        </div>
      </>
    );
  }

  function renderHelpSurface() {
    const bookmarkColumnRect = toLocalRect(layout.bookmarkColumnBounds, windowBounds);
    const topicPanelRect = toLocalRect(layout.helpTopicsBounds, windowBounds);
    const detailPanelRect = toLocalRect(layout.helpDetailBounds, windowBounds);
    const selectedHelpLineIndex = model.selectedHelpLineIndex ?? 0;
    const selectedLineRect = toLocalRect(layout.helpLineRects[selectedHelpLineIndex], windowBounds);
    const selectedLine =
      model.helpLines[model.selectedHelpLineIndex ?? -1] ??
      model.helpLines[0] ??
      "";
    const helpBookmarkRects = model.bookmarks.map((_, index) => toLocalRect(layout.bookmarkRects[index], windowBounds));
    const helpTopicRects = model.helpTopics.map((_, index) => toLocalRect(layout.helpTopicRects[index], windowBounds));
    const helpLineRects = model.helpLines.map((_, index) => toLocalRect(layout.helpLineRects[index], windowBounds));
    const helpBookmarkScroll = getScrollMetrics(helpBookmarkRects, bookmarkColumnRect.top, 8, 40, Math.max(0, bookmarkColumnRect.height - 48));
    const helpTopicScroll = getScrollMetrics(helpTopicRects, topicPanelRect.top, 4, 40, Math.max(0, topicPanelRect.height - 48));
    const helpLineScroll = getScrollMetrics(helpLineRects, detailPanelRect.top, 0, 112, Math.max(0, detailPanelRect.height - 126));
    const selectedTopicSummary =
      helpTopicSummary[selectedHelpTopic?.id as keyof typeof helpTopicSummary] ??
      "Read the topic summary, keep the requested line visible, then copy it into the open note.";
    const secondaryLines = model.helpLines.filter((_, index) => index !== selectedHelpLineIndex);

    return (
      <>
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, #f8f9fb 0%, #edf1f5 100%)"
          }}
        />
        <div
          style={{
            position: "absolute",
            left: bookmarkColumnRect.left - contentRect.left,
            top: 16,
            right: 18,
            minHeight: compactContent ? 72 : 68,
            borderRadius: 16,
            border: "1px solid #d7dde5",
            background: "linear-gradient(180deg, #ffffff 0%, #f5f7fa 100%)",
            boxShadow: "0 8px 20px rgba(15,23,42,0.04)",
            padding: compactContent ? "12px 14px" : "14px 16px"
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", color: yaruMuted }}>
            Help Center
          </div>
          <div
            style={{
              marginTop: 5,
              fontSize: 12.5,
              color: "#526071",
              lineHeight: 1.42,
              maxWidth: compactContent ? "100%" : "84%"
            }}
          >
            Review one guidance topic, keep the requested line in view, then copy it into the note without covering the browser.
          </div>
        </div>
        <div style={panelStyle(bookmarkColumnRect, "#d9dfe7", "linear-gradient(180deg, #f9fbfd 0%, #f2f5f8 100%)")}>
          <div style={{ ...columnHeaderStyle, left: bookmarkColumnRect.left - contentRect.left + 14, top: bookmarkColumnRect.top - contentRect.top + 12 }}>
            Quick links
          </div>
          <PaneScrollArea
            style={{ top: helpBookmarkScroll.viewportTop, left: 0, right: 0, bottom: 8 }}
            contentStyle={{ height: helpBookmarkScroll.contentHeight }}
          >
            {model.bookmarks.map((bookmark, index) => {
              const rect = helpBookmarkRects[index];
              const active = model.lastOpenedBookmarkId === bookmark.id;
              return (
                <div
                  key={bookmark.id}
                  style={{
                    position: "absolute",
                    left: rect.left - bookmarkColumnRect.left + 10,
                    top: helpBookmarkScroll.getTop(index),
                    width: rect.width - 20,
                    minHeight: compactContent ? rect.height + 6 : rect.height + 18,
                    borderRadius: 12,
                    border: active ? `1px solid ${yaruAccent}` : "1px solid #dfe5ec",
                    background: active ? "linear-gradient(180deg, #fff5ef 0%, #fde7de 100%)" : "#ffffff",
                    padding: compactContent ? "9px 10px" : "10px 11px",
                    boxSizing: "border-box",
                    boxShadow: active ? "0 6px 14px rgba(233,84,32,0.08)" : "0 2px 6px rgba(15,23,42,0.03)"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                    <span
                      style={{
                        minWidth: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        fontSize: compactContent ? 11.5 : 12.5,
                        fontWeight: 700,
                        color: active ? "#8f3516" : "#334155"
                      }}
                    >
                      {compactContent
                        ? compactBookmarkLabel[bookmark.id as keyof typeof compactBookmarkLabel] ?? bookmark.label
                        : bookmark.label}
                    </span>
                    {!compactContent && (
                      <span style={{ fontSize: 10.5, color: active ? "#9a3412" : yaruMuted, fontWeight: 700, flexShrink: 0 }}>
                        {bookmark.page === "help" ? "Docs" : "Board"}
                      </span>
                    )}
                  </div>
                  {!compactContent && (
                    <div style={{ marginTop: 5, fontSize: 10.5, lineHeight: 1.32, color: "#5e6978" }}>
                      {bookmarkSummary[bookmark.id as keyof typeof bookmarkSummary] ?? "Open this bookmarked workspace view."}
                    </div>
                  )}
                </div>
              );
            })}
          </PaneScrollArea>
        </div>
        <div style={panelStyle(topicPanelRect, "#d9dfe7", "linear-gradient(180deg, #f9fbfd 0%, #f2f5f8 100%)")}>
          <div style={{ ...columnHeaderStyle, left: topicPanelRect.left - contentRect.left + 14, top: topicPanelRect.top - contentRect.top + 12 }}>
            Topics
          </div>
          <PaneScrollArea
            style={{ top: helpTopicScroll.viewportTop, left: 0, right: 0, bottom: 8 }}
            contentStyle={{ height: helpTopicScroll.contentHeight }}
          >
            {model.helpTopics.map((topic, index) => {
              const rect = helpTopicRects[index];
              const active = topic.id === model.selectedHelpTopicId;
              return (
                <div
                  key={topic.id}
                  style={{
                    position: "absolute",
                    left: rect.left - topicPanelRect.left + 10,
                    top: helpTopicScroll.getTop(index),
                    width: rect.width - 20,
                    minHeight: compactContent ? rect.height + 6 : rect.height + 16,
                    borderRadius: 14,
                    border: active ? `1px solid ${yaruAccent}` : "1px solid #dce2e9",
                    background: active ? "linear-gradient(180deg, #fff5ef 0%, #fde7de 100%)" : "rgba(255,255,255,0.94)",
                    padding: compactContent ? "9px 10px" : "11px 11px",
                    boxSizing: "border-box",
                    boxShadow: active ? "0 8px 18px rgba(233,84,32,0.09)" : "0 2px 6px rgba(15,23,42,0.03)"
                  }}
                >
                  <div
                    style={{
                      fontSize: compactContent ? 12 : 13,
                      fontWeight: 700,
                      color: active ? "#8f3516" : yaruInk,
                      lineHeight: 1.3,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis"
                    }}
                  >
                    {topic.title}
                  </div>
                  {!compactContent && (
                    <div style={{ marginTop: 5, fontSize: 10.5, lineHeight: 1.32, color: active ? "#9a3412" : "#5f6c7b" }}>
                      {helpTopicSummary[topic.id as keyof typeof helpTopicSummary] ?? `${topic.lines.length} guidance lines`}
                    </div>
                  )}
                  {compactContent && (
                    <div style={{ marginTop: 4, fontSize: 10.5, lineHeight: 1.25, color: active ? "#9a3412" : "#718093", fontWeight: 700 }}>
                      {topic.lines.length} lines
                    </div>
                  )}
                </div>
              );
            })}
          </PaneScrollArea>
        </div>

        <div style={panelStyle(detailPanelRect, "#d7dde5", "linear-gradient(180deg, #ffffff 0%, #f7f9fb 100%)")}>
          <PaneScrollArea
            style={{ inset: 0 }}
            viewportStyle={{ paddingRight: 8 }}
            contentStyle={{ padding: compactContent ? 14 : 18, display: "flex", flexDirection: "column", gap: compactContent ? 8 : 12 }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: compactContent ? 15 : 18, fontWeight: 800, color: yaruInk, lineHeight: 1.25, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {selectedHelpTopic?.title ?? "Help Center"}
              </div>
              <div
                style={{
                  marginTop: 8,
                  fontSize: 12.5,
                  color: "#526071",
                  lineHeight: 1.45,
                  display: "-webkit-box",
                  WebkitLineClamp: compactContent ? 2 : 3,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden"
                }}
              >
                {selectedTopicSummary}
              </div>
            </div>

            <div
              style={{
                borderRadius: 14,
                border: `1px solid ${yaruAccent}`,
                background: "linear-gradient(180deg, #fff4ef 0%, #fde6de 100%)",
                color: yaruInk,
                padding: compactContent ? "10px 12px" : "12px 15px",
                fontSize: 14,
                fontWeight: 700,
                lineHeight: 1.45,
                boxShadow: "0 8px 18px rgba(233,84,32,0.10)"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div style={{ fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9a3412", marginBottom: 8 }}>
                  Copy this sentence
                </div>
                <div
                  style={{
                    flexShrink: 0,
                    padding: "4px 8px",
                    borderRadius: 999,
                    border: "1px solid rgba(233,84,32,0.18)",
                    background: "rgba(255,255,255,0.74)",
                    fontSize: 10.5,
                    fontWeight: 800,
                    color: "#9a3412"
                  }}
                >
                  Step {selectedHelpLineIndex + 1}
                </div>
              </div>
              <div style={{ fontSize: compactContent ? 13 : 14, lineHeight: 1.45 }}>{selectedLine}</div>
            </div>

            {!compactContent && (
              <div
                style={{
                  borderRadius: 14,
                  border: "1px solid #dbe2ea",
                  background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
                  padding: "12px 14px"
                }}
              >
                <div style={{ fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: yaruMuted }}>
                  Related guidance
                </div>
                <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                  {secondaryLines.map((line, index) => (
                    <div
                      key={`${selectedHelpTopic?.id ?? "help"}-line-secondary-${index}`}
                      style={{
                        minHeight: 48,
                        borderRadius: 12,
                        border: "1px solid #e0e6ed",
                        background: "#f8fafc",
                        padding: "10px 12px",
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#334155",
                        lineHeight: 1.45,
                        boxSizing: "border-box"
                      }}
                    >
                      {line}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </PaneScrollArea>
        </div>
      </>
    );
  }

  return (
    <div style={{ height: "100%", position: "relative", background: "#e8ecf2", overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          left: tabBarRect.left,
          top: tabBarRect.top,
          width: tabBarRect.width,
          height: tabBarRect.height,
          padding: "8px 12px 0",
          borderBottom: `1px solid ${yaruBorder}`,
          background: "linear-gradient(180deg, #e9edf1 0%, #dfe4ea 100%)",
          overflow: "hidden"
        }}
      >
        {model.tabs.map((tab, index) => {
          const rect = toLocalRect(layout.tabRects[index], windowBounds);
          return (
            <div
              key={tab.id}
              style={{
                position: "absolute",
                left: rect.left - tabBarRect.left,
                top: rect.top - tabBarRect.top,
                width: rect.width,
                height: rect.height,
                padding: "8px 14px",
                borderRadius: "10px 10px 0 0",
                background: tab.active ? "#fbfcfd" : "rgba(248,249,251,0.62)",
                color: yaruInk,
                fontSize: 12,
                fontWeight: tab.active ? 700 : 600,
                border: tab.active ? `1px solid ${yaruBorder}` : "1px solid rgba(0,0,0,0)",
                borderBottomColor: tab.active ? "#fbfcfd" : "transparent",
                pointerEvents: "auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                boxShadow: tab.active ? "0 1px 0 rgba(255,255,255,0.7) inset" : "none"
              }}
            >
              <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>{tab.title}</span>
            </div>
          );
        })}
      </div>

      <div
        style={{
          position: "absolute",
          left: addressRect.left,
          top: addressRect.top,
          width: addressRect.width,
          height: addressRect.height,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "0 12px",
          background: "#eef1f4",
          borderBottom: `1px solid ${yaruBorder}`
        }}
      >
        <div style={{ display: "flex", gap: 6, color: "#5c6675", fontSize: 13, flexShrink: 0 }}>
          {["←", "→", "↻"].map((icon) => (
            <span
              key={icon}
              style={{
                width: 26,
                height: 26,
                borderRadius: 999,
                border: "1px solid rgba(203,212,223,0.95)",
                background: "rgba(249,250,251,0.96)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              {icon}
            </span>
          ))}
        </div>
        <div
          style={{
            flex: 1,
            height: 34,
            borderRadius: 999,
            border: model.addressBarFocused ? `1px solid ${yaruAccent}` : "1px solid #ccd4df",
            background: "#ffffff",
            display: "flex",
            alignItems: "center",
            padding: "0 14px",
            color: "#4b5563",
            fontSize: 13,
            boxShadow: model.addressBarFocused
              ? "0 0 0 3px rgba(233,84,32,0.14), inset 0 1px 0 rgba(255,255,255,0.8)"
              : "inset 0 1px 0 rgba(255,255,255,0.82)",
            overflow: "hidden",
            whiteSpace: "nowrap",
            textOverflow: "ellipsis"
          }}
        >
          <span style={{ marginRight: 10, color: "#94a3b8" }}>🔒</span>
          {model.addressBarFocused ? model.addressInput || " " : model.url}
        </div>
        {!ultraCompactContent && <div style={{ display: "flex", gap: 6, color: "#64748b", fontSize: 13, flexShrink: 0 }}>
          {["★", "⇩", "☰"].map((icon) => (
            <span
              key={icon}
              style={{
                width: 26,
                height: 26,
                borderRadius: 999,
                background: "rgba(249,250,251,0.96)",
                border: "1px solid rgba(203,212,223,0.95)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              {icon}
            </span>
          ))}
        </div>}
      </div>

      <div
        style={{
          position: "absolute",
          left: contentRect.left,
          top: contentRect.top,
          width: contentRect.width,
          height: contentRect.height,
          borderTop: `1px solid ${yaruBorder}`,
          background: "#ffffff",
          overflow: "hidden"
        }}
      >
        {model.currentPage === "explorer" ? (
          renderExplorerSurface()
        ) : model.currentPage === "help" ? (
          renderHelpSurface()
        ) : hybridSurface ? (
          <>
            <img
              key={`${hybridSurface.frameUrl}-${hybridSurface.frameVersion}`}
              src={hybridSurface.frameUrl}
              alt={hybridSurface.title}
              draggable={false}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "fill",
                pointerEvents: "none",
                userSelect: "none"
              }}
            />
            {hybridSurface.loading && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(248,250,252,0.56)",
                  color: "#475569",
                  fontSize: 13,
                  fontWeight: 600
                }}
              >
                Loading page…
              </div>
            )}
          </>
        ) : (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#64748b",
              fontSize: 14,
              background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)"
            }}
          >
            Browser surface unavailable
          </div>
        )}
      </div>
    </div>
  );
}
