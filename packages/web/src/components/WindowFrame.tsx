import type {
  BrowserLiteViewModel,
  FileExplorerViewModel,
  MailLiteViewModel,
  NoteEditorViewModel,
  TerminalLiteViewModel,
  WindowViewModel
} from "../../../core/src/types.js";
import { getAppMeta } from "../app-assets";

function HeaderBarButtons({ maximized }: { maximized: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {[
        { color: "#f66151", label: "Close window" },
        { color: "#f8e45c", label: "Minimize window" },
        { color: "#57e389", label: maximized ? "Restore window" : "Maximize window" }
      ].map((button) => (
        <button
          key={button.label}
          type="button"
          aria-label={button.label}
          title={button.label}
          style={{
            width: 12,
            height: 12,
            padding: 0,
            borderRadius: 99,
            border: "none",
            background: button.color,
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35)",
            cursor: "pointer"
          }}
        />
      ))}
    </div>
  );
}

function FileExplorerView({ model }: { model: FileExplorerViewModel }) {
  return (
    <div
      style={{
        height: "100%",
        display: "grid",
        gridTemplateColumns: "176px 1fr",
        background: "#f4f5f7"
      }}
    >
      <div
        style={{
          borderRight: "1px solid #dde2ea",
          padding: "16px 14px",
          background: "#eef1f5"
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 700, color: "#7b8090", textTransform: "uppercase" }}>Places</div>
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 6 }}>
          {["Home", "Desktop", "Documents", "Downloads", "workspace"].map((item) => (
            <div
              key={item}
              style={{
                padding: "9px 12px",
                borderRadius: 10,
                background: item === "workspace" ? "#ffffff" : "transparent",
                color: "#2f3542",
                fontSize: 14,
                fontWeight: item === "workspace" ? 700 : 500,
                boxShadow: item === "workspace" ? "0 1px 2px rgba(15,23,42,0.08)" : "none"
              }}
            >
              {item}
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div
          style={{
            height: 54,
            borderBottom: "1px solid #dde2ea",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 16px",
            background: "#f8f9fb"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#5a6272", fontSize: 14, fontWeight: 500 }}>
            <span>Home</span>
            <span style={{ opacity: 0.5 }}>/</span>
            <span>workspace</span>
          </div>
          <div
            style={{
              minWidth: 180,
              height: 32,
              borderRadius: 999,
              border: "1px solid #d6dce6",
              background: "#ffffff",
              display: "flex",
              alignItems: "center",
              padding: "0 12px",
              color: "#8b93a6",
              fontSize: 13
            }}
          >
            Search
          </div>
        </div>
        <div style={{ padding: "14px 16px 16px", flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#7b8090", textTransform: "uppercase", marginBottom: 10 }}>
            {model.renameMode ? `Renaming ${model.renameMode.draft}` : "Workspace files"}
          </div>
          <div
            style={{
              borderRadius: 16,
              border: "1px solid #dbe0e8",
              background: "#ffffff",
              overflow: "hidden",
              boxShadow: "0 2px 8px rgba(15,23,42,0.04)"
            }}
          >
            {model.files.map((file, index) => {
              const selected = file.id === model.selectedFileId;
              return (
                <div
                  key={file.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "32px 1fr 90px",
                    alignItems: "center",
                    gap: 10,
                    padding: "13px 14px",
                    borderBottom: index === model.files.length - 1 ? "none" : "1px solid #eef1f5",
                    background: selected ? "#e7eef9" : "#ffffff",
                    color: "#1f2937"
                  }}
                >
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      background: selected ? "#7ea9ff" : "#dce3f1",
                      boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.6)"
                    }}
                  />
                  <div style={{ fontSize: 14, fontWeight: selected ? 700 : 500 }}>
                    {model.renameMode?.fileId === file.id ? model.renameMode.draft : file.name}
                  </div>
                  <div style={{ fontSize: 12, color: "#7b8090", textAlign: "right" }}>{index === 0 ? "Today" : "Yesterday"}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function NoteEditorView({ model }: { model: NoteEditorViewModel }) {
  return (
    <div style={{ height: "100%", background: "#f6f7f9", display: "flex", flexDirection: "column" }}>
      <div
        style={{
          height: 52,
          borderBottom: "1px solid #dde2ea",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          background: "#f8f9fb"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 9,
              background: "#dfe7f8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#2563eb",
              fontSize: 13,
              fontWeight: 700
            }}
          >
            Tx
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#2b3140" }}>{model.fileName}</div>
            <div style={{ fontSize: 12, color: "#7b8090" }}>{model.dirty ? "Unsaved changes" : "All changes saved"}</div>
          </div>
        </div>
        <button
          type="button"
          aria-label="Save"
          style={{
            padding: "7px 14px",
            borderRadius: 10,
            background: model.dirty ? "#e95420" : "#25a269",
            color: "#ffffff",
            fontSize: 13,
            fontWeight: 700,
            border: "none",
            cursor: "pointer"
          }}
        >
          Save
        </button>
      </div>

      <div style={{ flex: 1, padding: 16 }}>
        <div
          style={{
            height: "100%",
            borderRadius: 16,
            border: "1px solid #dfe5ed",
            background: "#ffffff",
            display: "grid",
            gridTemplateColumns: "56px 1fr",
            overflow: "hidden"
          }}
        >
          <div
            style={{
              background: "#f6f7fa",
              borderRight: "1px solid #eceff4",
              padding: "16px 10px",
              color: "#8c94a7",
              fontFamily: '"Ubuntu Mono", ui-monospace, monospace',
              fontSize: 14
            }}
          >
            {model.lines.map((_, index) => (
              <div key={index} style={{ minHeight: 26, textAlign: "right", lineHeight: "26px" }}>
                {index + 1}
              </div>
            ))}
          </div>
          <div
            style={{
              padding: "16px 18px",
              fontFamily: '"Ubuntu Mono", ui-monospace, monospace',
              fontSize: 15,
              color: "#1f2937",
              whiteSpace: "pre-wrap"
            }}
          >
            {model.lines.map((line, index) => (
              <div
                key={`${index}-${line}`}
                style={{
                  minHeight: 26,
                  lineHeight: "26px",
                  background: model.selectedLineIndex === index ? "#edf3ff" : "transparent",
                  borderRadius: 6,
                  padding: "0 6px"
                }}
              >
                {line || " "}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function BrowserLiteView({ model }: { model: BrowserLiteViewModel }) {
  const selectedCategory =
    model.categories.find((category) => category.id === model.selectedCategoryId) ?? model.categories[0];
  const selectedTask =
    selectedCategory?.tasks.find((task) => task.id === model.selectedTaskId) ?? selectedCategory?.tasks[0];

  return (
    <div style={{ height: "100%", background: "#edf0f5", display: "flex", flexDirection: "column" }}>
      <div
        style={{
          padding: "10px 12px 0",
          borderBottom: "1px solid #d7dde6",
          background: "#e4e8ee"
        }}
      >
        <div style={{ display: "flex", gap: 8 }}>
          {model.tabs.map((tab) => (
            <div
              key={tab.id}
              style={{
                padding: "9px 16px",
                borderRadius: "12px 12px 0 0",
                background: tab.active ? "#f8fafc" : "rgba(255,255,255,0.5)",
                color: "#293241",
                fontSize: 13,
                fontWeight: 700,
                boxShadow: tab.active ? "0 -1px 0 #cfd7e3 inset" : "none"
              }}
            >
              {tab.title}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 4px 12px" }}>
          <div style={{ display: "flex", gap: 6, color: "#4b5563", fontSize: 18 }}>
            <span>←</span>
            <span>→</span>
            <span>↻</span>
          </div>
          <div
            style={{
              flex: 1,
              height: 36,
              borderRadius: 999,
              border: "1px solid #cfd7e3",
              background: "#ffffff",
              display: "flex",
              alignItems: "center",
              padding: "0 14px",
              color: "#4b5563",
              fontSize: 14,
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)"
            }}
          >
            {model.url}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, padding: 14 }}>
        <div
          style={{
            height: "100%",
            borderRadius: 18,
            border: "1px solid #cfd7e3",
            background: "#ffffff",
            boxShadow: "0 8px 18px rgba(15,23,42,0.08)",
            display: "grid",
            gridTemplateColumns: "140px 132px 208px 1fr",
            overflow: "hidden"
          }}
        >
          <div
            style={{
              borderRight: "1px solid #d7dde6",
              padding: "18px 14px",
              background: "#f7f9fc"
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 800, color: "#6b7280", textTransform: "uppercase" }}>Bookmarks</div>
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
              {model.bookmarks.map((bookmark) => (
                <div key={bookmark} style={{ fontSize: 14, color: "#374151", fontWeight: 500 }}>
                  {bookmark}
                </div>
              ))}
            </div>
          </div>

          {model.currentPage === "explorer" ? (
            <>
              <div style={{ borderRight: "1px solid #e2e8f0", padding: "18px 12px" }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#6b7280", textTransform: "uppercase" }}>
                  Categories
                </div>
                <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                  {model.categories.map((category) => (
                    <div
                      key={category.id}
                      style={{
                        padding: "9px 10px",
                        borderRadius: 10,
                        background: category.id === model.selectedCategoryId ? "#e9f1ff" : "transparent",
                        color: "#1f2937",
                        fontSize: 14,
                        fontWeight: category.id === model.selectedCategoryId ? 700 : 500
                      }}
                    >
                      {category.label}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ borderRight: "1px solid #e2e8f0", padding: "18px 12px" }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#6b7280", textTransform: "uppercase" }}>Recording</div>
                <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                  {(selectedCategory?.tasks ?? []).map((task) => (
                    <div
                      key={task.id}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 12,
                        border: task.id === model.selectedTaskId ? "1px solid #c8dafd" : "1px solid #e8edf4",
                        background: task.id === model.selectedTaskId ? "#eef4ff" : "#f8fafc"
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{task.title}</div>
                      <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>{task.id}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ padding: "18px 18px 18px 16px" }}>
                <div style={{ fontSize: 32, fontWeight: 800, color: "#111827", lineHeight: 1.1 }}>OSWorld Explorer</div>
                <div style={{ marginTop: 18, fontSize: 12, fontWeight: 800, color: "#6b7280", textTransform: "uppercase" }}>
                  Task ID
                </div>
                <div style={{ marginTop: 8, fontSize: 14, fontWeight: 700, color: "#2563eb" }}>{selectedTask?.id}</div>
                <div style={{ marginTop: 18, fontSize: 12, fontWeight: 800, color: "#6b7280", textTransform: "uppercase" }}>
                  Instruction
                </div>
                <div style={{ marginTop: 8, fontSize: 14, lineHeight: 1.5, color: "#334155" }}>{selectedTask?.instruction}</div>
                <div style={{ marginTop: 18, fontSize: 12, fontWeight: 800, color: "#6b7280", textTransform: "uppercase" }}>
                  Actions
                </div>
                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                  {(selectedTask?.actions ?? []).map((action, index) => (
                    <div key={`${selectedTask?.id}-${index}`} style={{ fontSize: 13, color: "#334155" }}>
                      {index + 1}. {action}
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div style={{ gridColumn: "2 / span 3", padding: "22px 22px 18px" }}>
              <div style={{ fontSize: 30, fontWeight: 800, color: "#111827", lineHeight: 1.1 }}>Ubuntu help</div>
              <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 12 }}>
                {model.helpLines.map((line, index) => (
                  <div
                    key={`${index}-${line}`}
                    style={{
                      padding: "12px 14px",
                      borderRadius: 12,
                      background: index === 1 ? "#eef4ff" : "#f8fafc",
                      border: "1px solid #d7dde6",
                      fontSize: 14,
                      lineHeight: 1.5,
                      color: "#334155"
                    }}
                  >
                    {line}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TerminalLiteView({ model }: { model: TerminalLiteViewModel }) {
  return (
    <div
      style={{
        height: "100%",
        background: "linear-gradient(180deg, #2c1928 0%, #1a1220 18%, #171219 100%)",
        padding: 12
      }}
    >
      <div
        style={{
          height: "100%",
          borderRadius: 16,
          background: "#17151c",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden"
        }}
      >
        <div
          style={{
            height: 34,
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 12px",
            color: "#cbd5e1",
            fontSize: 13
          }}
        >
          <div>{model.prompt}:{model.cwd}</div>
          <div style={{ color: "#fb923c" }}>{model.status}</div>
        </div>
        <div
          style={{
            flex: 1,
            padding: 14,
            fontFamily: '"Ubuntu Mono", ui-monospace, monospace',
            fontSize: 15,
            lineHeight: 1.45,
            color: "#f8fafc"
          }}
        >
          {model.lines.map((line, index) => (
            <div
              key={`${index}-${line}`}
              style={{
                minHeight: 22,
                color: line.includes("$") ? "#f8fafc" : "#d4d7dd"
              }}
            >
              {line}
            </div>
          ))}
          <div style={{ minHeight: 22, color: "#f8fafc", marginTop: 4 }}>
            {model.prompt}:~{model.cwd}$ {model.input}
            <span style={{ color: "#fb923c" }}>|</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function MailLiteView({ model }: { model: MailLiteViewModel }) {
  const selectedMessage =
    model.messages.find((message) => message.id === model.selectedMessageId) ?? model.messages[0];

  return (
    <div style={{ height: "100%", background: "#f3f5f8", display: "flex", flexDirection: "column" }}>
      <div
        style={{
          height: 48,
          borderBottom: "1px solid #d7dde6",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          background: "#eef2f6"
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 700, color: "#2b3140" }}>Mail</div>
        <div
          style={{
            width: 200,
            height: 32,
            borderRadius: 999,
            border: "1px solid #d5dce7",
            background: "#ffffff",
            display: "flex",
            alignItems: "center",
            padding: "0 12px",
            color: "#8b93a6",
            fontSize: 13
          }}
        >
          Search messages
        </div>
      </div>

      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "0.85fr 1.1fr 1.25fr",
          gap: 12,
          padding: 12,
          minWidth: 0
        }}
      >
        <div
          style={{
            borderRadius: 14,
            border: "1px solid #d8dee8",
            background: "#eef2f6",
            padding: 10
          }}
        >
          {model.folders.map((folder) => (
            <div
              key={folder.id}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                background: model.selectedFolder === folder.id ? "#dce8fb" : "transparent",
                color: "#232a39",
                fontSize: 14,
                fontWeight: model.selectedFolder === folder.id ? 700 : 500
              }}
            >
              {folder.name}
              {folder.unread > 0 ? ` (${folder.unread})` : ""}
            </div>
          ))}
        </div>

        <div
          style={{
            borderRadius: 14,
            border: "1px solid #d8dee8",
            background: "#ffffff",
            padding: 10
          }}
        >
          {model.messages.map((message) => (
            <div
              key={message.id}
              style={{
                padding: "12px 12px",
                borderRadius: 12,
                marginBottom: 8,
                background: model.selectedMessageId === message.id ? "#eef4ff" : "#f7f9fc",
                border: model.selectedMessageId === message.id ? "1px solid #d6e4ff" : "1px solid transparent"
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1f2937" }}>{message.subject}</div>
              <div style={{ marginTop: 4, fontSize: 12, color: "#6b7280" }}>{message.sender}</div>
              <div style={{ marginTop: 8, fontSize: 12, color: "#475569", lineHeight: 1.4 }}>{message.preview}</div>
            </div>
          ))}
        </div>

        <div
          style={{
            borderRadius: 14,
            border: "1px solid #d8dee8",
            background: "#ffffff",
            padding: 18
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 700, color: "#111827" }}>{selectedMessage?.subject}</div>
          <div style={{ marginTop: 8, fontSize: 13, color: "#6b7280" }}>{selectedMessage?.sender}</div>
          <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 10 }}>
            {model.previewBody.map((line, index) => (
              <div key={`${index}-${line}`} style={{ fontSize: 14, lineHeight: 1.55, color: "#334155" }}>
                {line}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function WindowFrame({ window }: { window: WindowViewModel }) {
  if (window.minimized) {
    return null;
  }

  const meta = getAppMeta(window.appId);

  return (
    <div
      style={{
        position: "absolute",
        left: window.bounds.x,
        top: window.bounds.y,
        width: window.bounds.width,
        height: window.bounds.height,
        borderRadius: 16,
        overflow: "hidden",
        border: window.focused ? "1px solid rgba(255,255,255,0.16)" : "1px solid rgba(255,255,255,0.08)",
        background: "#f2f4f7",
        boxShadow: window.focused
          ? "0 26px 56px rgba(4, 7, 18, 0.42), 0 0 0 1px rgba(233,84,32,0.2)"
          : "0 16px 34px rgba(4, 7, 18, 0.26)",
        zIndex: window.zIndex + 10
      }}
    >
      <div
        style={{
          height: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 14px",
          background: window.focused ? "rgba(94,102,119,0.96)" : "rgba(109,116,132,0.88)",
          color: "#f8fafc"
        }}
      >
        <HeaderBarButtons maximized={window.maximized} />
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <img
            src={meta.icon}
            alt={meta.label}
            draggable={false}
            style={{ width: 18, height: 18, objectFit: "contain", filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))" }}
          />
          <div style={{ fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {window.title}
          </div>
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.2, color: "rgba(255,255,255,0.68)" }}>
          {meta.label}
        </div>
      </div>

      <div style={{ height: "calc(100% - 40px)", background: "#f8fafc" }}>
        {window.appView.type === "file-explorer" ? (
          <FileExplorerView model={window.appView} />
        ) : window.appView.type === "note-editor" ? (
          <NoteEditorView model={window.appView} />
        ) : window.appView.type === "browser-lite" ? (
          <BrowserLiteView model={window.appView} />
        ) : window.appView.type === "terminal-lite" ? (
          <TerminalLiteView model={window.appView} />
        ) : (
          <MailLiteView model={window.appView} />
        )}
      </div>
    </div>
  );
}
