import type { NoteEditorBodyProps } from "./body-types.js";
import { toLocalRect } from "./layout-helpers.js";

export function NoteEditorBody({ model, windowBounds, focused = false }: NoteEditorBodyProps) {
  const { layout } = model;
  const toolbarRect = toLocalRect(layout.toolbarBounds, windowBounds);
  const saveRect = toLocalRect(layout.saveButtonBounds, windowBounds);
  const frameRect = toLocalRect(layout.editorFrameBounds, windowBounds);
  const gutterRect = toLocalRect(layout.gutterBounds, windowBounds);
  const editorRect = toLocalRect(layout.editorBounds, windowBounds);
  const compactToolbar = toolbarRect.width < 380;
  const ultraCompactToolbar = toolbarRect.width < 290;
  const stackedToolbar = toolbarRect.width < 250;
  const narrowEditor = frameRect.width < 250;
  const crampedEditor = frameRect.width < 320;
  const savedState = !model.dirty;
  const emptyPristine = savedState && model.content.trim().length === 0;
  const reservedSaveWidth = Math.max(64, Math.min(saveRect.width, ultraCompactToolbar ? 72 : compactToolbar ? 84 : saveRect.width));
  const editorLinePadding = crampedEditor ? 4 : ultraCompactToolbar ? 5 : compactToolbar ? 7 : 9;
  const editorFontSize = crampedEditor ? 11.25 : narrowEditor ? 12.25 : compactToolbar ? 13.5 : 14.5;
  const statusText = model.dirty
    ? "Draft not saved yet"
    : emptyPristine
      ? "Ready to edit"
      : "All changes saved";
  const saveButtonStyle = model.dirty
    ? {
        background: "#e95420",
        color: "#ffffff",
        border: "none",
        boxShadow: "0 1px 0 rgba(255,255,255,0.22) inset, 0 6px 14px rgba(233,84,32,0.18)"
      }
    : emptyPristine
      ? {
          background: "linear-gradient(180deg, #f8fafc 0%, #eef3f8 100%)",
          color: "#7b8798",
          border: "1px solid #d6dde7",
          boxShadow: "0 1px 0 rgba(255,255,255,0.85) inset, 0 1px 4px rgba(15,23,42,0.04)"
        }
      : {
          background: "linear-gradient(180deg, #f0f7f2 0%, #e5f0e8 100%)",
          color: "#2f6c4b",
          border: "1px solid #cbded1",
          boxShadow: "0 1px 0 rgba(255,255,255,0.8) inset, 0 2px 6px rgba(47,108,75,0.06)"
        };

  return (
    <div
      style={{
        height: "100%",
        position: "relative",
        background: "linear-gradient(180deg, #f1f3f6 0%, #eceff3 100%)",
        overflow: "hidden"
      }}
    >
      <div
        style={{
          position: "absolute",
          left: toolbarRect.left,
          top: toolbarRect.top,
          width: toolbarRect.width,
          height: toolbarRect.height,
          borderBottom: "1px solid #d6dbe3",
          display: "grid",
          alignItems: "center",
          padding: compactToolbar ? "8px 12px" : "0 16px",
          paddingRight: stackedToolbar ? 12 : reservedSaveWidth + (compactToolbar ? 16 : 22),
          background: "linear-gradient(180deg, #f7f8fb 0%, #eef1f5 100%)",
          boxSizing: "border-box",
          overflow: "hidden"
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: ultraCompactToolbar || stackedToolbar ? "minmax(0, 1fr)" : "auto minmax(0, 1fr)",
            alignItems: compactToolbar ? "start" : "center",
            gap: compactToolbar ? 8 : 10,
            minWidth: 0
          }}
        >
          {!stackedToolbar && (
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                background: savedState ? "linear-gradient(180deg, #ffffff 0%, #eef3f8 100%)" : "linear-gradient(180deg, #ffffff 0%, #edf1f7 100%)",
                border: savedState ? "1px solid #dfe6ef" : "1px solid #d7dde8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: savedState ? "#56739a" : "#3562b8",
                fontSize: 12,
                fontWeight: 700
              }}
            >
              Aa
            </div>
          )}
          <div style={{ minWidth: 0, display: "grid", gap: compactToolbar ? 2 : 1 }}>
            <div
              style={{
                fontSize: crampedEditor ? 12.5 : compactToolbar ? 13 : 14,
                fontWeight: 700,
                color: "#2b3140",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis"
              }}
            >
              {model.fileName}
            </div>
            <div
              style={{
                fontSize: crampedEditor ? 11.5 : 12,
                color: emptyPristine ? "#8c97a8" : savedState ? "#7b8798" : "#738094",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis"
              }}
            >
              {statusText}
            </div>
            {!compactToolbar && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  color: savedState ? "#8b95a5" : "#7b8797",
                  fontSize: 11.5,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis"
                }}
              >
                <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>Plain Text</span>
                {!ultraCompactToolbar && <span style={{ color: "#c0c7d3" }}>•</span>}
                {!ultraCompactToolbar && <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>UTF-8</span>}
                {ultraCompactToolbar && <span style={{ color: "#8f99a8" }}>txt</span>}
              </div>
            )}
          </div>
        </div>
      </div>

      <button
        type="button"
        aria-label="Save"
        style={{
          position: "absolute",
          left: stackedToolbar ? toolbarRect.left + 12 : saveRect.left,
          top: stackedToolbar ? toolbarRect.top + toolbarRect.height - saveRect.height - 8 : saveRect.top,
          width: stackedToolbar ? 60 : crampedEditor ? Math.min(reservedSaveWidth, 76) : reservedSaveWidth,
          height: saveRect.height,
          borderRadius: 999,
          background: saveButtonStyle.background,
          color: saveButtonStyle.color,
          fontSize: crampedEditor ? 11.5 : compactToolbar ? 12 : 13,
          fontWeight: 700,
          border: saveButtonStyle.border,
          cursor: "pointer",
          padding: "0 10px",
          pointerEvents: "auto",
          boxShadow: saveButtonStyle.boxShadow
        }}
      >
        {ultraCompactToolbar ? "Save" : "Save"}
      </button>

      <div
        style={{
          position: "absolute",
          left: frameRect.left,
          top: frameRect.top,
          width: frameRect.width,
          height: frameRect.height,
          borderRadius: 12,
          border: "1px solid #d9dee7",
          background: savedState ? "#fcfcfd" : "#fffdfc",
          boxShadow: savedState ? "0 1px 0 rgba(255,255,255,0.8) inset, 0 8px 22px rgba(15,23,42,0.04)" : "0 1px 0 rgba(255,255,255,0.75) inset, 0 8px 22px rgba(233,84,32,0.05)",
          overflow: "hidden",
          boxSizing: "border-box"
        }}
      >
        <div
          style={{
            position: "absolute",
            left: gutterRect.left - frameRect.left,
            top: gutterRect.top - frameRect.top,
            width: gutterRect.width,
            height: gutterRect.height,
            background: savedState ? "#f3f5f8" : "#f8f3f0",
            borderRight: "1px solid #e4e8ef",
            padding: `0 ${crampedEditor ? 4 : compactToolbar ? 6 : 10}px`,
            color: "#8b94a6",
            fontFamily: '"Ubuntu Mono", ui-monospace, monospace',
            fontSize: crampedEditor ? 10.5 : narrowEditor ? 11.5 : compactToolbar ? 12 : 14,
            boxSizing: "border-box",
            overflow: "hidden"
          }}
        >
          {model.lines.map((_, index) => {
            const lineHeight = layout.lineRects[index]?.height ?? 26;
            return (
              <div
                key={index}
                style={{
                  position: "absolute",
                  left: 0,
                  top: layout.lineRects[index] ? layout.lineRects[index].y - layout.editorBounds.y : index * lineHeight,
                  width: layout.gutterBounds.width,
                  height: lineHeight,
                  textAlign: "right",
                  lineHeight: `${lineHeight}px`,
                  paddingRight: crampedEditor ? 2 : narrowEditor ? 4 : compactToolbar ? 6 : 10,
                  boxSizing: "border-box"
                }}
              >
                {index + 1}
              </div>
            );
          })}
        </div>

        <div
          style={{
            position: "absolute",
            left: editorRect.left - frameRect.left,
            top: editorRect.top - frameRect.top,
            width: editorRect.width,
            height: editorRect.height,
            fontFamily: '"Ubuntu Mono", ui-monospace, monospace',
            fontSize: editorFontSize,
            color: "#1f2937",
            background:
              savedState
                ? "repeating-linear-gradient(180deg, transparent 0 25px, rgba(148,163,184,0.06) 25px 26px)"
                : "repeating-linear-gradient(180deg, transparent 0 25px, rgba(233,84,32,0.05) 25px 26px)",
            overflow: "hidden"
          }}
        >
          {model.lines.map((line, index) => {
            const lineRect = layout.lineRects[index];
            const linesBeforeThis = model.lines.slice(0, index).join("\n").length + (index > 0 ? 1 : 0);
            const lineEnd = linesBeforeThis + line.length;
            const cursorOnThisLine = focused && model.cursorIndex >= linesBeforeThis && model.cursorIndex <= lineEnd;
            const cursorCol = cursorOnThisLine ? model.cursorIndex - linesBeforeThis : -1;
            return (
              <div
                key={`${index}-${line}`}
                style={{
                  position: "absolute",
                  left: 0,
                  top: lineRect.y - layout.editorBounds.y,
                  width: editorRect.width,
                  height: lineRect.height,
                  lineHeight: "26px",
                  background: model.selectedLineIndex === index ? "#eaf1ff" : "transparent",
                  borderRadius: 6,
                  padding: `0 ${editorLinePadding}px`,
                  boxSizing: "border-box",
                  pointerEvents: "none",
                  overflow: "hidden",
                  whiteSpace: "pre"
                }}
              >
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    overflow: "hidden",
                    whiteSpace: "pre",
                    textOverflow: "clip",
                    letterSpacing: crampedEditor ? -0.15 : narrowEditor ? -0.08 : 0
                  }}
                >
                  {cursorOnThisLine ? (
                    <>
                      <span>{line.slice(0, cursorCol)}</span>
                      <span
                        style={{
                          display: "inline-block",
                          width: 2,
                          height: 18,
                          background: "#2563eb",
                          verticalAlign: "text-bottom",
                          animation: "blink 1s step-end infinite",
                          marginLeft: -1,
                          marginRight: -1
                        }}
                      />
                      <span>{line.slice(cursorCol) || " "}</span>
                    </>
                  ) : (
                    line || " "
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
