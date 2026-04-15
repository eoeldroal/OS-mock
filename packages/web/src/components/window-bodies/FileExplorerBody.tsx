import type { FileExplorerBodyProps } from "./body-types.js";
import { PaneScrollArea } from "../PaneScrollArea.js";
import { narrowWidth, toLocalRect } from "./layout-helpers.js";

const FULL_LIST_COLUMN_TEMPLATE = "minmax(0,1.75fr) minmax(72px,0.9fr) minmax(64px,0.78fr) minmax(52px,0.55fr)";
const COMPACT_LIST_COLUMN_TEMPLATE = "minmax(0,1fr) minmax(64px,auto)";
const FULL_ROW_COLUMN_TEMPLATE = "24px minmax(0,1.75fr) minmax(72px,0.9fr) minmax(64px,0.78fr) minmax(52px,0.55fr)";
const COMPACT_ROW_COLUMN_TEMPLATE = "24px minmax(0,1fr) minmax(64px,auto)";
const STACKED_ROW_COLUMN_TEMPLATE = "24px minmax(0,1fr)";

function PlaceIcon({ item, active }: { item: string; active: boolean }) {
  const stroke = active ? "#475569" : "#64748b";
  const fill = active ? "#e6edf8" : "#edf2f7";
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 18 18",
    fill: "none" as const
  };

  if (item === "Home") {
    return (
      <svg {...common}>
        <path d="M3.5 8.2 9 4l5.5 4.2v5.8H10.8v-3.7H7.2V14H3.5z" fill={fill} stroke={stroke} strokeWidth="1.1" />
      </svg>
    );
  }
  if (item === "Desktop") {
    return (
      <svg {...common}>
        <rect x="3.2" y="4.1" width="11.6" height="7.7" rx="1.4" fill={fill} stroke={stroke} strokeWidth="1.1" />
        <path d="M7 13.8h4" stroke={stroke} strokeWidth="1.1" strokeLinecap="round" />
      </svg>
    );
  }
  if (item === "Documents") {
    return (
      <svg {...common}>
        <path d="M5 2.8h5.7l2.3 2.2v10H5z" fill={fill} stroke={stroke} strokeWidth="1.1" />
        <path d="M10.7 2.8V5h2.3" stroke={stroke} strokeWidth="1.1" />
      </svg>
    );
  }
  if (item === "Downloads") {
    return (
      <svg {...common}>
        <path d="M9 3.5v6.2" stroke={stroke} strokeWidth="1.2" strokeLinecap="round" />
        <path d="m6.7 7.8 2.3 2.5 2.3-2.5" stroke={stroke} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="4" y="12" width="10" height="2.4" rx="1.1" fill={fill} stroke={stroke} strokeWidth="1.1" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M2.8 5.6h4.2l1.2 1.5h7v6.6H2.8z" fill={fill} stroke={stroke} strokeWidth="1.1" />
    </svg>
  );
}

function FileGlyph({ folder, selected }: { folder: boolean; selected: boolean }) {
  if (folder) {
    return (
      <svg width="22" height="18" viewBox="0 0 22 18" fill="none">
        <path
          d="M1.8 5.8h5.1l1.6 1.8H20v7.4a1.5 1.5 0 0 1-1.5 1.5H3.3A1.5 1.5 0 0 1 1.8 15z"
          fill={selected ? "#f8c76f" : "#f6d48f"}
          stroke={selected ? "#d4942c" : "#d9aa4f"}
          strokeWidth="1"
        />
      </svg>
    );
  }
  return (
    <svg width="18" height="22" viewBox="0 0 18 22" fill="none">
      <path d="M4 1.7h6.4l3.2 3.1V20H4z" fill={selected ? "#cfe1ff" : "#e7edf8"} stroke={selected ? "#5c8de8" : "#b5c2d8"} strokeWidth="1" />
      <path d="M10.4 1.7v3.1h3.2" stroke={selected ? "#5c8de8" : "#b5c2d8"} strokeWidth="1" />
    </svg>
  );
}

export function FileExplorerBody({ model, windowBounds }: FileExplorerBodyProps) {
  const { layout } = model;
  const compactToolbar = narrowWidth(layout.toolbarBounds.width, 430);
  const ultraCompactToolbar = narrowWidth(layout.toolbarBounds.width, 320);
  const compressedToolbar = narrowWidth(layout.toolbarBounds.width, 380);
  const compactRows = layout.compactRows;
  const stackedRows = layout.stackedRows;
  const folderCount = model.files.filter((file) => file.kind === "folder").length;
  const fileCount = model.files.length - folderCount;

  const breadcrumbParts =
    model.currentDirectory === "/"
      ? ["Home"]
      : ["Home", ...model.currentDirectory.split("/").filter(Boolean)];
  const compactFolderLabel = breadcrumbParts[breadcrumbParts.length - 1] ?? "Home";
  const toolbarSearchLabel = ultraCompactToolbar ? "Find" : "Search";

  const formatMeta = (file: (typeof model.files)[number]) => {
    if (file.kind === "folder") {
      return { kind: "Folder", modified: "Today", size: "—" };
    }
    const approxBytes = Math.max(1, file.content.length);
    const size = approxBytes < 1024 ? `${approxBytes} B` : `${Math.ceil(approxBytes / 1024)} KB`;
    return { kind: "Text file", modified: "Today", size };
  };

  const sidebarRect = toLocalRect(layout.sidebarBounds, windowBounds);
  const toolbarRect = toLocalRect(layout.toolbarBounds, windowBounds);
  const sectionHeadingRect = toLocalRect(layout.renameHintBounds, windowBounds);
  const listRect = toLocalRect(layout.listBounds, windowBounds);
  const listHeaderRect = toLocalRect(layout.listHeaderBounds, windowBounds);
  const listViewportRect = toLocalRect(layout.listViewportBounds, windowBounds);
  const listFooterRect = toLocalRect(layout.listFooterBounds, windowBounds);
  const favoritesHeadingRect = layout.sidebarFavoritesHeadingBounds
    ? toLocalRect(layout.sidebarFavoritesHeadingBounds, windowBounds)
    : undefined;
  const favoriteItemRects = layout.sidebarFavoriteItemRects.map((rect) => toLocalRect(rect, windowBounds));
  const storageHeadingRect = layout.sidebarStorageHeadingBounds
    ? toLocalRect(layout.sidebarStorageHeadingBounds, windowBounds)
    : undefined;
  const storageItemRects = layout.sidebarStorageItemRects.map((rect) => toLocalRect(rect, windowBounds));
  const sidebarSummaryRect = layout.sidebarSummaryBounds ? toLocalRect(layout.sidebarSummaryBounds, windowBounds) : undefined;
  // Keep file-list vertical geometry canonical: the core layout owns header, viewport, footer, and row positions.
  const fileRowOffsets = model.files.map((_, index) => {
    const rect = toLocalRect(layout.fileRowRects[index], windowBounds);
    return rect.top - listViewportRect.top;
  });
  const listContentHeight =
    fileRowOffsets.length > 0
      ? Math.max(
          listViewportRect.height,
          ...model.files.map((_, index) => {
            const rect = toLocalRect(layout.fileRowRects[index], windowBounds);
            return rect.top - listViewportRect.top + rect.height;
          })
        )
      : listViewportRect.height;
  const favorites = [
    { label: "Recent", icon: "⟳" },
    { label: "Starred", icon: "★" },
    { label: "Trash", icon: "⌫" }
  ];
  const storage = [
    { label: "Computer", icon: "💽" },
    { label: "Network", icon: "⇄" },
    { label: "Other Locations", icon: "⋯" }
  ];
  const listColumnTemplate = stackedRows
    ? "minmax(0,1fr)"
    : compactRows
    ? COMPACT_LIST_COLUMN_TEMPLATE
    : FULL_LIST_COLUMN_TEMPLATE;
  const rowColumnTemplate = stackedRows
    ? STACKED_ROW_COLUMN_TEMPLATE
    : compactRows
    ? COMPACT_ROW_COLUMN_TEMPLATE
    : FULL_ROW_COLUMN_TEMPLATE;
  const sectionLabel = compactToolbar ? compactFolderLabel : breadcrumbParts[breadcrumbParts.length - 1];
  const sectionLabelWidth = Math.max(0, listRect.width - 24);
  const yaruInk = "#2e3436";
  const yaruMuted = "#6f7682";
  const yaruBorder = "#d7dde5";
  const yaruSidebar = "#f2f4f6";
  const yaruSidebarAlt = "#ebeef2";
  const yaruSurface = "#fafbfc";
  const yaruAccent = "#e95420";
  const yaruAccentSoft = "#fde6de";

  return (
    <div style={{ height: "100%", position: "relative", background: "#eef1f4", overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          left: sidebarRect.left,
          top: sidebarRect.top,
          width: sidebarRect.width,
          height: sidebarRect.height,
          borderRight: `1px solid ${yaruBorder}`,
          background: `linear-gradient(180deg, ${yaruSidebar} 0%, ${yaruSidebarAlt} 100%)`,
          padding: "14px 12px"
        }}
      >
        <div style={{ fontSize: 10, fontWeight: 700, color: yaruMuted, textTransform: "uppercase", letterSpacing: "0.07em" }}>Places</div>
      </div>

      {model.places.map((item, index) => {
        const rect = toLocalRect(layout.sidebarItemRects[index], windowBounds);
        const active = model.currentPlace === item;
        return (
          <div
            key={item}
            style={{
              position: "absolute",
              left: rect.left,
              top: rect.top,
              width: rect.width,
              height: rect.height,
              borderRadius: 9,
              background: active ? yaruAccentSoft : "transparent",
              color: active ? "#8f3516" : yaruInk,
              fontSize: 13.5,
              fontWeight: active ? 700 : 500,
              boxShadow: active ? "inset 0 0 0 1px rgba(233,84,32,0.18)" : "none",
              display: "flex",
              alignItems: "center",
              padding: "0 11px",
              cursor: "pointer",
              pointerEvents: "auto"
            }}
          >
            <span style={{ width: 18, height: 18, marginRight: 10, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              <PlaceIcon item={item} active={active} />
            </span>
            {item}
          </div>
        );
      })}

      <>
        {favoritesHeadingRect && (
          <div
            style={{
              position: "absolute",
              left: favoritesHeadingRect.left,
              top: favoritesHeadingRect.top,
              width: favoritesHeadingRect.width,
              height: favoritesHeadingRect.height,
              fontSize: 11,
              fontWeight: 700,
              color: yaruMuted,
              textTransform: "uppercase",
              letterSpacing: "0.06em"
            }}
          >
            Favorites
          </div>
        )}
        {favorites.map((item, index) => {
          const rect = favoriteItemRects[index];
          if (!rect) {
            return null;
          }
          return (
            <div
              key={item.label}
              style={{
                position: "absolute",
                left: rect.left,
                top: rect.top,
                width: rect.width,
                height: rect.height,
                display: "flex",
                alignItems: "center",
                gap: 10,
                color: "#7f8793",
                fontSize: 12
              }}
            >
              <span style={{ width: 16, textAlign: "center", opacity: 0.75 }}>{item.icon}</span>
              <span>{item.label}</span>
            </div>
          );
        })}
        {storageHeadingRect && (
          <div
            style={{
              position: "absolute",
              left: storageHeadingRect.left,
              top: storageHeadingRect.top,
              width: storageHeadingRect.width,
              height: storageHeadingRect.height,
              fontSize: 11,
              fontWeight: 700,
              color: yaruMuted,
              textTransform: "uppercase",
              letterSpacing: "0.06em"
            }}
          >
            Storage
          </div>
        )}
        {storage.map((item, index) => {
          const rect = storageItemRects[index];
          if (!rect) {
            return null;
          }
          return (
            <div
              key={item.label}
              style={{
                position: "absolute",
                left: rect.left,
                top: rect.top,
                width: rect.width,
                height: rect.height,
                display: "flex",
                alignItems: "center",
                gap: 10,
                color: item.label === "Computer" ? "#6f7682" : "#8a92a0",
                fontSize: 11
              }}
            >
              <span style={{ width: 16, textAlign: "center", opacity: 0.72 }}>{item.icon}</span>
              <span>{item.label}</span>
            </div>
          );
        })}
        {sidebarSummaryRect && (
          <div
            style={{
              position: "absolute",
              left: sidebarSummaryRect.left,
              top: sidebarSummaryRect.top,
              width: sidebarSummaryRect.width,
              height: sidebarSummaryRect.height,
              borderRadius: 10,
              background: "rgba(255,255,255,0.42)",
              border: `1px solid ${yaruBorder}`,
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4)",
              padding: "8px 10px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: 4
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 700, color: yaruMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              On this device
            </div>
            <div style={{ fontSize: 11.5, color: "#5f6875", display: "flex", justifyContent: "space-between", gap: 8 }}>
              <span>{folderCount} folders</span>
              <span>{fileCount} files</span>
            </div>
          </div>
        )}
      </>

      <div
        style={{
          position: "absolute",
          left: toolbarRect.left,
          top: toolbarRect.top,
          width: toolbarRect.width,
          height: toolbarRect.height,
          borderBottom: `1px solid ${yaruBorder}`,
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr) auto",
          alignItems: "center",
          gap: compactToolbar ? 6 : 8,
          padding: compactToolbar ? "0 8px" : "0 10px",
          background: `linear-gradient(180deg, ${yaruSurface} 0%, #f3f5f7 100%)`
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: compactToolbar ? 5 : 8,
            color: "#4f5662",
            fontSize: compactToolbar ? 13 : 14,
            fontWeight: 500,
            minWidth: 0,
            overflow: "hidden"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: compactToolbar ? 4 : 6, marginRight: compactToolbar ? 0 : 4, flexShrink: 0 }}>
            <span
              style={{
                width: compactToolbar ? 24 : 24,
                height: compactToolbar ? 24 : 24,
                borderRadius: 7,
                border: `1px solid ${yaruBorder}`,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: compactToolbar ? 11 : 12,
                background: "#ffffff",
                pointerEvents: "auto"
              }}
            >
              {`<`}
            </span>
            {!compactToolbar && (
              <span
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 7,
                  border: `1px solid ${yaruBorder}`,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  background: "#fff",
                  color: "#a1a8b8"
                }}
              >
                {`>`}
              </span>
            )}
          </div>
          {compactToolbar ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, overflow: "hidden" }}>
              <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>
                {compactFolderLabel}
              </span>
              {!ultraCompactToolbar && (
                <span
                  style={{
                    flexShrink: 0,
                    padding: "2px 6px",
                    borderRadius: 999,
                    background: "#ffffff",
                    border: `1px solid ${yaruBorder}`,
                    fontSize: 10.5,
                    color: yaruMuted
                  }}
                >
                  {model.files.length}
                </span>
              )}
            </div>
          ) : (
            breadcrumbParts.map((part, index) => (
              <div
                key={`${part}-${index}`}
                style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, overflow: "hidden", flexShrink: 1 }}
              >
                {index > 0 && <span style={{ opacity: 0.5 }}>/</span>}
                <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>{part}</span>
              </div>
            ))
          )}
          {!compactToolbar && !ultraCompactToolbar && (
            <span
              style={{
                padding: "3px 7px",
                borderRadius: 7,
                background: "#ffffff",
                border: `1px solid ${yaruBorder}`,
                fontSize: 11,
                color: yaruMuted
              }}
            >
              List
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: compactToolbar ? 6 : 8, minWidth: 0 }}>
          {!compactToolbar && !ultraCompactToolbar &&
            ["⤢", "⇅", "⋯"].map((icon) => (
              <span
                key={icon}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  border: `1px solid ${yaruBorder}`,
                  background: "#ffffff",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: yaruMuted,
                  fontSize: 13
                }}
              >
                {icon}
              </span>
            ))}
          <div
            style={{
              minWidth: ultraCompactToolbar ? 60 : compactToolbar ? 78 : 132,
              width: ultraCompactToolbar ? 64 : compactToolbar ? 84 : 144,
              maxWidth: ultraCompactToolbar ? 68 : compactToolbar ? 92 : 176,
              height: compactToolbar ? 28 : 32,
              borderRadius: 999,
              border: `1px solid ${yaruBorder}`,
              background: "#ffffff",
              display: "flex",
              alignItems: "center",
              padding: ultraCompactToolbar ? "0 8px" : compactToolbar ? "0 10px" : "0 12px",
              color: yaruMuted,
              fontSize: compactToolbar ? 12 : 13,
              gap: compactToolbar ? 6 : 8,
              overflow: "hidden"
            }}
          >
            <span style={{ fontSize: 12, flexShrink: 0 }}>⌕</span>
            <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{toolbarSearchLabel}</span>
          </div>
        </div>
      </div>

      {!compressedToolbar && (
        <div
          style={{
            position: "absolute",
            left: sectionHeadingRect.left,
            top: sectionHeadingRect.top + 2,
            width: sectionLabelWidth,
            height: sectionHeadingRect.height,
            fontSize: 11,
            fontWeight: 700,
            color: yaruMuted,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis"
          }}
        >
          {`${sectionLabel} · ${model.files.length} item${model.files.length === 1 ? "" : "s"}`}
        </div>
      )}

      {model.renameMode && !compressedToolbar && (
        <div
          style={{
            position: "absolute",
            left: sectionHeadingRect.left,
            top: sectionHeadingRect.top + 19,
            width: sectionLabelWidth,
            fontSize: 11,
            color: yaruMuted,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis"
          }}
        >
          Rename selected item
        </div>
      )}

      <div
        style={{
          position: "absolute",
          left: listRect.left,
          top: listRect.top,
          width: listRect.width,
          height: listRect.height,
          border: `1px solid ${yaruBorder}`,
          borderRadius: 11,
          background: "#ffffff",
          overflow: "hidden",
          boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 18px rgba(15,23,42,0.03)"
        }}
      >
        <div
          style={{
            height: listHeaderRect.height,
            boxSizing: "border-box",
            borderBottom: "1px solid #eef1f5",
            display: "grid",
            gridTemplateColumns: listColumnTemplate,
            gap: compactRows ? 6 : 7,
            alignItems: "center",
            padding: compactRows ? "0 8px" : "0 10px",
            fontSize: compactRows ? 9.5 : 10,
            fontWeight: 700,
            letterSpacing: "0.07em",
            textTransform: "uppercase",
            color: yaruMuted,
            background: "linear-gradient(180deg, #f7f8fa 0%, #f2f4f7 100%)"
          }}
        >
          <span>Name</span>
          {!compactRows && <span style={{ minWidth: 0 }}>Kind</span>}
          {!stackedRows && <span style={{ textAlign: compactRows ? "right" : "left", minWidth: 0 }}>Modified</span>}
          {!compactRows && <span style={{ textAlign: "right", minWidth: 0 }}>Size</span>}
        </div>

        <PaneScrollArea
          style={{
            top: listViewportRect.top - listRect.top,
            left: listViewportRect.left - listRect.left,
            right: "auto",
            bottom: "auto",
            width: listViewportRect.width,
            height: listViewportRect.height
          }}
          viewportStyle={{
            paddingBottom: 8
          }}
          contentStyle={{
            height: listContentHeight
          }}
        >
          {model.files.length === 0 && (
            <div style={{ padding: "20px 24px", textAlign: "center", color: "#8b93a6", fontSize: 14 }}>
              This folder is empty
            </div>
          )}

          {model.files.map((file, index) => {
            const rect = toLocalRect(layout.fileRowRects[index], windowBounds);
            const selected = file.id === model.selectedFileId;
            const meta = formatMeta(file);
            return (
              <div
                key={file.id}
                title={file.path}
                style={{
                  position: "absolute",
                  left: rect.left - listViewportRect.left,
                  top: rect.top - listViewportRect.top,
                  width: rect.width,
                  height: rect.height,
                  display: "grid",
                  gridTemplateColumns: rowColumnTemplate,
                  alignItems: "center",
                  gap: compactRows ? 6 : 7,
                  padding: compactRows ? "0 8px" : "0 10px",
                  borderBottom: index === model.files.length - 1 ? "none" : "1px solid #eef1f5",
                  background: selected ? "linear-gradient(180deg, #fff4ef 0%, #fde6de 100%)" : index % 2 === 0 ? "#ffffff" : "#fafbfc",
                  color: yaruInk,
                  pointerEvents: "auto",
                  boxShadow: selected ? "inset 0 0 0 1px rgba(233,84,32,0.22)" : "none"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <FileGlyph folder={file.kind === "folder"} selected={selected} />
                </div>
            <div style={{ minWidth: 0, overflow: "hidden" }}>
              <div
                style={{
                      fontSize: compactRows ? 13 : 14,
                      fontWeight: selected ? 700 : 600,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      display: "inline-flex",
                      alignItems: "center",
                      minWidth: 0,
                      padding:
                        model.renameMode?.fileId === file.id ? "4px 8px" : 0,
                      borderRadius: model.renameMode?.fileId === file.id ? 8 : 0,
                      border:
                        model.renameMode?.fileId === file.id
                          ? `1px solid ${yaruAccent}`
                          : "none",
                      background:
                        model.renameMode?.fileId === file.id ? "#ffffff" : "transparent",
                      boxShadow:
                        model.renameMode?.fileId === file.id
                          ? "0 0 0 3px rgba(233,84,32,0.10)"
                          : "none",
                      color: selected ? "#0f172a" : yaruInk,
                      maxWidth: "100%"
                    }}
                  >
                    {model.renameMode?.fileId === file.id ? model.renameMode.draft : file.name}
                  </div>
              <div
                style={{
                  marginTop: 4,
                  fontSize: compactRows ? 10.5 : 11,
                  fontWeight: 500,
                  color: selected ? "#5c4c45" : yaruMuted,
                  display: "flex",
                  gap: 8,
                  flexWrap: "nowrap",
                  overflow: "hidden"
                }}
              >
                <span
                  style={{
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    minWidth: 0
                  }}
                >
                  {compactRows ? meta.kind : file.directory === "/" ? "root" : file.directory}
                </span>
                {stackedRows && (
                  <>
                    <span style={{ color: "#c7ced9" }}>•</span>
                    <span
                      style={{
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        minWidth: 0
                      }}
                    >
                      {meta.modified}
                    </span>
                  </>
                )}
              </div>
            </div>
            {!compactRows && (
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: "#526071",
                      minWidth: 0,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis"
                    }}
                  >
                    {meta.kind}
                  </div>
                )}
            {!stackedRows && (
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: yaruMuted,
                  textAlign: compactRows ? "right" : "left",
                  minWidth: 0,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis"
                }}
              >
                {meta.modified}
              </div>
            )}
                {!compactRows && (
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: yaruMuted,
                      textAlign: "right",
                      minWidth: 0,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis"
                    }}
                  >
                    {meta.size}
                  </div>
                )}
              </div>
            );
          })}
        </PaneScrollArea>

        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: listFooterRect.height,
            boxSizing: "border-box",
            borderTop: "1px solid #eef1f5",
            background: "linear-gradient(180deg, #fafbfc 0%, #f3f5f7 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 14px",
            fontSize: 11,
            color: yaruMuted
          }}
        >
          <span>{folderCount} folders, {fileCount} files</span>
          <span>{model.selectedFileId ? "1 selected" : "No selection"}</span>
        </div>
      </div>
    </div>
  );
}
