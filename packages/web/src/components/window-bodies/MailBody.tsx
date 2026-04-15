import type { MailBodyProps } from "./body-types.js";
import { PaneScrollArea } from "../PaneScrollArea.js";
import { toLocalRect, narrowWidth } from "./layout-helpers.js";

function senderMonogram(sender: string) {
  const [local = "mail"] = sender.split("@");
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function folderDescription(folderName: string | undefined) {
  switch (folderName) {
    case "Inbox":
      return "Recent mail and active threads";
    case "Spam":
      return "Suspected junk and review items";
    case "Drafts":
      return "Unsent drafts and working copies";
    default:
      return "Message folders";
  }
}

function folderAccent(folderName: string | undefined) {
  switch (folderName) {
    case "Spam":
      return {
        border: "#f4b89a",
        background: "linear-gradient(180deg, #fff3ed 0%, #ffe8dc 100%)",
        shadow: "0 1px 0 rgba(255,255,255,0.68) inset, 0 6px 16px rgba(233,84,32,0.14)",
        text: "#9a3412",
        chip: "#e95420",
        chipText: "#ffffff"
      };
    case "Inbox":
      return {
        border: "#cadcff",
        background: "linear-gradient(180deg, #ffffff 0%, #eef4ff 100%)",
        shadow: "0 1px 0 rgba(255,255,255,0.7) inset, 0 6px 16px rgba(59,130,246,0.12)",
        text: "#1d4ed8",
        chip: "#3b82f6",
        chipText: "#ffffff"
      };
    default:
      return {
        border: "#d8dee8",
        background: "linear-gradient(180deg, #ffffff 0%, #f6f8fb 100%)",
        shadow: "0 1px 0 rgba(255,255,255,0.7) inset, 0 4px 10px rgba(15,23,42,0.05)",
        text: "#475569",
        chip: "#94a3b8",
        chipText: "#ffffff"
      };
  };
}

export function MailBody({ model, windowBounds }: MailBodyProps) {
  const { layout } = model;
  const hasSelection = model.selectedMessageId.length > 0;
  const selectedMessage = model.messages.find((message) => message.id === model.selectedMessageId);
  const denseMode = narrowWidth(layout.previewBounds.width, 340);
  const fauxDates = ["11:24", "10:08", "Yesterday", "Fri"];
  const selectedFolder = model.folders.find((folder) => folder.id === model.selectedFolder);
  const unreadTotal = model.folders.reduce((sum, folder) => sum + folder.unread, 0);
  const visibleMessages = model.messages.filter((message) => message.folderId === model.selectedFolder);

  const headerRect = toLocalRect(layout.headerBounds, windowBounds);
  const sidebarRect = toLocalRect(layout.sidebarBounds, windowBounds);
  const messageListRect = toLocalRect(layout.messageListBounds, windowBounds);
  const previewRect = toLocalRect(layout.previewBounds, windowBounds);
  const compactHeader = narrowWidth(headerRect.width, 520);
  const compactFolderList = narrowWidth(sidebarRect.width, 190);
  const compactMessageList = narrowWidth(messageListRect.width, 260);
  const folderRowOffset = 14;
  const folderViewportTop = 36;
  const folderOffsets = model.folders.map((_, index) => {
    const rect = toLocalRect(layout.folderRects[index], windowBounds);
    return rect.top - sidebarRect.top + folderRowOffset;
  });
  const folderContentHeight =
    folderOffsets.length > 0
      ? Math.max(
          sidebarRect.height - folderViewportTop,
          ...model.folders.map((_, index) => {
            const rect = toLocalRect(layout.folderRects[index], windowBounds);
            return rect.top - sidebarRect.top + folderRowOffset - folderViewportTop + rect.height;
          })
        )
      : sidebarRect.height - folderViewportTop;
  const messageHeaderHeight = 36;
  const messageRowOffset = 20;
  const messageOffsets = model.messages.map((_, index) => {
    const rect = toLocalRect(layout.messageRects[index], windowBounds);
    return rect.top - messageListRect.top + messageRowOffset;
  });
  const messageViewportTop = Math.max(messageHeaderHeight, messageOffsets.length > 0 ? Math.min(...messageOffsets) : messageHeaderHeight);
  const messageContentHeight =
    messageOffsets.length > 0
      ? Math.max(
          messageListRect.height - messageViewportTop,
          ...model.messages.map((_, index) => {
            const rect = toLocalRect(layout.messageRects[index], windowBounds);
            return rect.top - messageListRect.top + messageRowOffset - messageViewportTop + rect.height;
          })
        )
      : messageListRect.height - messageViewportTop;
  const previewSummary = selectedMessage?.preview ?? "";
  const previewTimestamp = selectedFolder?.name === "Spam" ? "Flagged today" : "Today 11:24";
  const selectedFolderAccent = folderAccent(selectedFolder?.name);

  return (
    <div
      style={{
        height: "100%",
        position: "relative",
        background: "linear-gradient(180deg, #e7ebf1 0%, #eceff4 100%)",
        overflow: "hidden"
      }}
    >
      <div
        style={{
          position: "absolute",
          left: headerRect.left,
          top: headerRect.top,
          width: headerRect.width,
          height: headerRect.height,
          borderBottom: "1px solid #cfd6e1",
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr) auto",
          alignItems: "center",
          gap: compactHeader ? 10 : 16,
          padding: "0 16px",
          background: "linear-gradient(180deg, #f4f6fa 0%, #eef2f7 100%)",
          pointerEvents: "none"
        }}
      >
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              background: "linear-gradient(180deg, #5b6b87 0%, #425067 100%)",
              color: "#f8fafc",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 700
            }}
          >
            Tb
          </div>
          <div style={{ minWidth: 0, overflow: "hidden" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#293241", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {selectedFolder?.name ?? "Inbox"}
            </div>
            <div style={{ fontSize: 11, color: "#738094", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {visibleMessages.length} visible, {unreadTotal} unread across folders
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          {!denseMode && !compactHeader &&
            ["Archive", "Junk", "Delete"].map((label, index) => (
              <div
                key={label}
                style={{
                  height: 26,
                  padding: "0 10px",
                  borderRadius: 999,
                  border: "1px solid #cfd6e1",
                  background: index === 2 ? "#ffffff" : "#f6f8fb",
                  display: "flex",
                  alignItems: "center",
                  color: "#576478",
                  fontSize: 12,
                  boxShadow: "0 1px 0 rgba(255,255,255,0.65) inset"
                }}
              >
                {label}
              </div>
            ))}
          <div
            style={{
              width: denseMode ? 160 : compactHeader ? 180 : 220,
              minWidth: denseMode ? 140 : 160,
              height: 32,
              borderRadius: 999,
              border: "1px solid #d1d8e3",
              background: "#ffffff",
              display: "flex",
              alignItems: "center",
              padding: "0 12px",
              color: "#7b8697",
              fontSize: 13,
              boxShadow: "0 1px 0 rgba(255,255,255,0.7) inset",
              overflow: "hidden",
              whiteSpace: "nowrap",
              textOverflow: "ellipsis"
            }}
          >
            Search in {selectedFolder?.name?.toLowerCase() ?? "mail"}
          </div>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: sidebarRect.left,
          top: sidebarRect.top,
          width: sidebarRect.width,
          height: sidebarRect.height,
          borderRadius: 0,
          borderRight: "1px solid #d2d9e2",
          borderTop: "1px solid #d2d9e2",
          borderBottom: "1px solid #d2d9e2",
          borderLeft: "1px solid #d2d9e2",
          background: "linear-gradient(180deg, #e7ebf2 0%, #dfe6ef 100%)",
          padding: 10,
          overflow: "hidden"
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 12,
            top: 10,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.06em",
            color: "#8a93a6",
            textTransform: "uppercase"
          }}
        >
          Folders
        </div>
        <div
          style={{
            position: "absolute",
            left: 12,
            right: 12,
            top: compactFolderList ? 26 : 58,
            borderRadius: 10,
            background: "rgba(255,255,255,0.58)",
            border: "1px solid rgba(209,216,227,0.95)",
            boxShadow: "0 1px 0 rgba(255,255,255,0.72) inset",
            padding: "8px 10px",
            display: "grid",
            gap: 2
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: "#334155", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            personal@workspace.local
          </div>
          <div style={{ fontSize: 10.5, color: "#64748b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {folderDescription(selectedFolder?.name)}
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            left: 12,
            right: 12,
            top: compactFolderList ? 72 : 108,
            height: 28,
            borderRadius: 8,
            background: "rgba(255,255,255,0.52)",
            border: "1px solid rgba(209,216,227,0.9)",
            display: compactFolderList ? "none" : "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 10px",
            fontSize: 11,
            color: "#5e6b7d"
          }}
        >
          <span>Personal</span>
          <span style={{ color: "#7a8698" }}>Online</span>
        </div>
        <PaneScrollArea
          style={{
            top: compactFolderList ? folderViewportTop + 54 : folderViewportTop + 76,
            left: 0,
            right: 0,
            bottom: 0
          }}
          contentStyle={{
            height: folderContentHeight
          }}
        >
          {model.folders.map((folder, index) => {
            const rect = toLocalRect(layout.folderRects[index], windowBounds);
            const active = model.selectedFolder === folder.id;
            const accent = folderAccent(folder.name);
            return (
              <div
                key={folder.id}
                style={{
                  position: "absolute",
                  left: rect.left - sidebarRect.left,
                  top: rect.top - sidebarRect.top + folderRowOffset - folderViewportTop,
                  width: rect.width,
                  height: rect.height,
                  padding: compactFolderList ? "9px 12px" : "8px 12px 9px",
                  borderRadius: 8,
                  background: active ? accent.background : "transparent",
                  boxShadow: active ? accent.shadow : "none",
                  border: active ? `1px solid ${accent.border}` : "1px solid transparent",
                  color: "#232a39",
                  fontSize: 12,
                  fontWeight: active ? 700 : 500,
                  pointerEvents: "none",
                  boxSizing: "border-box"
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0,1fr) auto",
                    alignItems: compactFolderList ? "center" : "start",
                    gap: 10,
                    minWidth: 0
                  }}
                >
                  <div style={{ minWidth: 0, display: "grid", gap: 2 }}>
                    <span
                      style={{
                        minWidth: 0,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        color: active ? accent.text : "#232a39"
                      }}
                    >
                      {folder.name}
                    </span>
                    {!compactFolderList && (
                      <span
                        style={{
                          fontSize: 10,
                          color: active ? "#64748b" : "#7b8798",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis"
                        }}
                      >
                        {folder.unread > 0 ? `${folder.unread} unread` : "No unread messages"}
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {folder.unread > 0 && (
                      <span
                        style={{
                          minWidth: 18,
                          height: 18,
                          padding: "0 5px",
                          borderRadius: 999,
                          background: active ? accent.chip : "#cbd5e1",
                          color: active ? accent.chipText : "#334155",
                          fontSize: 10,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 700
                        }}
                      >
                        {compactFolderList && folder.unread > 99 ? "99+" : folder.unread}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </PaneScrollArea>
      </div>

      <div
        style={{
          position: "absolute",
          left: messageListRect.left,
          top: messageListRect.top,
          width: messageListRect.width,
          height: messageListRect.height,
          borderRadius: 0,
          border: "1px solid #d2d9e2",
          background: "linear-gradient(180deg, #fbfcfe 0%, #f7f9fc 100%)",
          padding: 10,
          overflow: "hidden"
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 14,
            right: 14,
            top: 8,
            height: 24,
            display: "grid",
            gridTemplateColumns: compactMessageList ? "minmax(0,1fr)" : "minmax(0,1fr) auto",
            alignItems: "center",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.06em",
            color: "#8a93a6",
            textTransform: "uppercase",
            borderBottom: "1px solid #eef2f6"
          }}
        >
          <span>Messages</span>
          {!compactMessageList && <span>Date</span>}
        </div>
        <PaneScrollArea
          style={{
            top: messageViewportTop,
            left: 0,
            right: 0,
            bottom: 0
          }}
          contentStyle={{
            height: messageContentHeight
          }}
        >
          {model.messages.map((message, index) => {
            const rect = toLocalRect(layout.messageRects[index], windowBounds);
            return (
              <div
                key={message.id}
                style={{
                  position: "absolute",
                  left: rect.left - messageListRect.left,
                  top: rect.top - messageListRect.top + messageRowOffset - messageViewportTop,
                  width: rect.width,
                  height: rect.height,
                  padding: "9px 10px",
                  borderRadius: 8,
                  background:
                    model.selectedMessageId === message.id
                      ? "linear-gradient(180deg, #edf5ff 0%, #e4efff 100%)"
                      : index % 2 === 0
                        ? "#ffffff"
                        : "#fbfcfe",
                  border: model.selectedMessageId === message.id ? "1px solid #a9c5fb" : "1px solid #e7ebf0",
                  boxShadow:
                    model.selectedMessageId === message.id
                      ? "inset 4px 0 0 #4f86f7, 0 1px 0 rgba(255,255,255,0.78) inset, 0 4px 14px rgba(59,130,246,0.14)"
                      : "0 1px 0 rgba(255,255,255,0.5) inset",
                  pointerEvents: "none",
                  overflow: "hidden"
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: compactMessageList ? "minmax(0,1fr)" : "minmax(0,1fr) auto",
                    alignItems: "center",
                    gap: 8,
                    minWidth: 0
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      minWidth: 0
                    }}
                  >
                    <div
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        background: model.selectedMessageId === message.id ? "#dbeafe" : "#eef2f7",
                        color: model.selectedMessageId === message.id ? "#1d4ed8" : "#475569",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 10,
                        fontWeight: 800,
                        flexShrink: 0
                      }}
                    >
                      {senderMonogram(message.sender)}
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        color: "#586375",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        minWidth: 0
                      }}
                    >
                      {message.sender}
                    </span>
                  </div>
                  {!compactMessageList && <div style={{ fontSize: 10, color: "#94a3b8", flexShrink: 0 }}>{fauxDates[index % fauxDates.length]}</div>}
                </div>
                <div
                  style={{
                    marginTop: 3,
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: "#1f2937",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis"
                  }}
                >
                  {message.subject}
                </div>
                <div
                  style={{
                    marginTop: 5,
                    fontSize: 11,
                    color: model.selectedMessageId === message.id ? "#334155" : "#475569",
                    lineHeight: 1.3,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden"
                  }}
                >
                  {message.preview}
                </div>
              </div>
            );
          })}
        </PaneScrollArea>
      </div>

      <div
        style={{
          position: "absolute",
          left: previewRect.left,
          top: previewRect.top,
          width: previewRect.width,
          height: previewRect.height,
          borderRadius: 0,
          border: "1px solid #d2d9e2",
          background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
          padding: 18,
          overflow: "hidden"
        }}
      >
        {hasSelection && selectedMessage ? (
          <>
            <div
              style={{
                display: "flex",
                alignItems: denseMode ? "flex-start" : "center",
                justifyContent: "space-between",
                gap: 12,
                flexDirection: denseMode ? "column" : "row"
              }}
            >
              <div
                style={{
                  fontSize: denseMode ? 18 : 20,
                  fontWeight: 700,
                  color: "#111827",
                  overflowWrap: "anywhere",
                  minWidth: 0
                }}
              >
                {selectedMessage.subject}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <div
                  style={{
                    padding: "4px 9px",
                    borderRadius: 999,
                    background: "#fff7f3",
                    border: "1px solid #f1d2c5",
                    color: "#9a3412",
                    fontSize: 10.5,
                    fontWeight: 700
                  }}
                >
                  {selectedFolder?.name === "Spam" ? "Flagged" : "Important"}
                </div>
                {!denseMode && <div style={{ color: "#64748b", fontSize: 11.5, fontWeight: 600 }}>Reply</div>}
              </div>
            </div>
            <div
              style={{
                marginTop: 10,
                display: "grid",
                gridTemplateColumns: denseMode ? "1fr" : "minmax(0,1fr) auto",
                gap: 8,
                fontSize: 13,
                color: "#6b7280",
                minWidth: 0
              }}
            >
              <div style={{ minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {selectedMessage.sender}
              </div>
              {!denseMode && <div style={{ color: "#94a3b8" }}>{previewTimestamp}</div>}
            </div>
            <div
              style={{
                marginTop: 10,
                borderRadius: 10,
                border: "1px solid #e6ebf1",
                background: "#f9fbfd",
                padding: "10px 12px",
                fontSize: 12,
                lineHeight: 1.45,
                color: "#4b5563",
                boxShadow: "0 1px 0 rgba(255,255,255,0.72) inset"
              }}
            >
              {previewSummary}
            </div>
            <div
              style={{
                marginTop: 12,
                display: "grid",
                gridTemplateColumns: denseMode ? "1fr" : "repeat(2, minmax(0, 1fr))",
                gap: 10
              }}
            >
              <div
                style={{
                  borderRadius: 10,
                  border: "1px solid #e6ebf1",
                  background: "#fbfcfd",
                  padding: "9px 10px"
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#8a93a6" }}>
                  Folder
                </div>
                <div style={{ marginTop: 4, fontSize: 12.5, fontWeight: 700, color: "#334155" }}>
                  {selectedFolder?.name ?? "Inbox"}
                </div>
              </div>
              <div
                style={{
                  borderRadius: 10,
                  border: "1px solid #e6ebf1",
                  background: "#fbfcfd",
                  padding: "9px 10px"
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#8a93a6" }}>
                  Sender
                </div>
                <div style={{ marginTop: 4, fontSize: 12.5, fontWeight: 700, color: "#334155" }}>
                  {selectedMessage?.sender ?? "Unknown sender"}
                </div>
              </div>
            </div>
            <div
              style={{
                marginTop: 12,
                fontSize: 11,
                color: "#94a3b8",
                textTransform: "uppercase",
                letterSpacing: 0.08
              }}
            >
              Message body
            </div>
            <div style={{ position: "relative", marginTop: 12, height: Math.max(96, previewRect.height - (denseMode ? 128 : 144)) }}>
              <PaneScrollArea
                style={{
                  inset: 0
                }}
                viewportStyle={{
                  paddingRight: 6
                }}
                contentStyle={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6
                }}
              >
                {model.previewBody.map((line, index) => (
                  <div
                    key={`${index}-${line}`}
                    style={{
                      fontSize: denseMode ? 13 : 14,
                      lineHeight: 1.55,
                      color: "#334155",
                      background: model.selectedPreviewLineIndex === index ? "#edf4ff" : index === 0 ? "#f8fafc" : "transparent",
                      border: model.selectedPreviewLineIndex === index ? "1px solid #c7ddff" : index === 0 ? "1px solid #e8edf3" : "1px solid transparent",
                      borderRadius: 6,
                      padding: "6px 8px",
                      pointerEvents: "auto",
                      overflow: "hidden"
                    }}
                  >
                    {line}
                  </div>
                ))}
              </PaneScrollArea>
            </div>
          </>
        ) : (
          <>
            <div style={{ display: "grid", gap: 10 }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  alignSelf: "flex-start",
                  padding: "5px 10px",
                  borderRadius: 999,
                  border: `1px solid ${selectedFolderAccent.border}`,
                  background: selectedFolderAccent.background,
                  color: selectedFolderAccent.text,
                  fontSize: 11,
                  fontWeight: 700
                }}
              >
                {selectedFolder?.name === "Spam" ? "Spam queue active" : `${selectedFolder?.name ?? "Inbox"} active`}
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#111827" }}>
                {selectedFolder?.name ?? "Inbox"} overview
              </div>
              <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.55 }}>
                Select a message from the list to open its preview. Messages in this folder will appear here when available.
              </div>
            </div>
            <div
              style={{
                marginTop: 16,
                display: "grid",
                gridTemplateColumns: denseMode ? "1fr" : "repeat(3, minmax(0, 1fr))",
                gap: 10
              }}
            >
              {[
                { label: "Visible", value: `${visibleMessages.length} messages` },
                { label: "Unread", value: `${selectedFolder?.unread ?? 0} unread` },
                { label: "Selection", value: "No message selected" }
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    borderRadius: 10,
                    border: "1px solid #e6ebf1",
                    background: "#fbfcfd",
                    padding: "10px 11px"
                  }}
                >
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#8a93a6" }}>
                    {item.label}
                  </div>
                  <div style={{ marginTop: 6, fontSize: 13, fontWeight: 700, color: "#334155" }}>{item.value}</div>
                </div>
              ))}
            </div>
            <div
              style={{
                marginTop: 16,
                borderRadius: 12,
                border: "1px solid #e6ebf1",
                background: "linear-gradient(180deg, #fbfcfe 0%, #f8fafc 100%)",
                padding: "14px 16px",
                display: "grid",
                gap: 10
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8" }}>
                Folder summary
              </div>
              {visibleMessages.length > 0 ? (
                visibleMessages.slice(0, 3).map((message) => (
                  <div
                    key={message.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "auto minmax(0,1fr)",
                      gap: 10,
                      alignItems: "start"
                    }}
                  >
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        background: "#eef2f7",
                        color: "#475569",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 10,
                        fontWeight: 800
                      }}
                    >
                      {senderMonogram(message.sender)}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: "#1f2937", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {message.subject}
                      </div>
                      <div style={{ marginTop: 2, fontSize: 11, color: "#64748b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {message.sender}
                      </div>
                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 11,
                          color: "#475569",
                          lineHeight: 1.35,
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden"
                        }}
                      >
                        {message.preview}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: "#ffffff",
                    border: "1px solid #e6ebf1",
                    fontSize: 12,
                    color: "#64748b"
                  }}
                >
                  No messages in this folder right now.
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
