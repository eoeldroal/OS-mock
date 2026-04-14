import type { TerminalBodyProps } from "./body-types.js";
import { narrowWidth, toLocalRect } from "./layout-helpers.js";

export function TerminalBody({ model, windowBounds }: TerminalBodyProps) {
  const { layout } = model;
  const denseMode = narrowWidth(layout.terminalBounds.width, 460);
  const ultraDenseMode = narrowWidth(layout.terminalBounds.width, 320);
  const headerRect = toLocalRect(layout.headerBounds, windowBounds);
  const terminalRect = toLocalRect(layout.terminalBounds, windowBounds);
  const inputRect = toLocalRect(layout.inputBounds, windowBounds);
  const titleCwd = model.cwd === "/" ? "/" : model.cwd.replace(/^\/+/, "");

  return (
    <div
      style={{
        height: "100%",
        position: "relative",
        background:
          "radial-gradient(circle at top, rgba(126, 87, 194, 0.16), transparent 30%), linear-gradient(180deg, #2f1f46 0%, #21172f 18%, #17111f 42%, #100d14 100%)",
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
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 12px",
          color: "rgba(224,231,255,0.74)",
          fontSize: 12,
          pointerEvents: "none",
          background: "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
          backdropFilter: "blur(2px)"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, overflow: "hidden" }}>
          <span
            style={{
              padding: "3px 8px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.08)",
              color: "rgba(248,250,252,0.94)",
              fontWeight: 700
            }}
          >
            Terminal
          </span>
          {!denseMode && <span style={{ color: "rgba(196,181,253,0.8)", flexShrink: 0 }}>bash</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, marginLeft: 12 }}>
          {!denseMode && (
            <div
              style={{
                minWidth: 0,
                maxWidth: ultraDenseMode ? 92 : denseMode ? 120 : 180,
                fontSize: 11,
                color: "rgba(226,232,240,0.72)",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 999,
                padding: "3px 9px",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis"
              }}
            >
              {model.cwd}
            </div>
          )}
          <div style={{ color: "rgba(203,213,225,0.56)", flexShrink: 0 }}>⋯</div>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: terminalRect.left,
          top: terminalRect.top,
          width: 14,
          height: terminalRect.height,
          background: "linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.012) 100%)",
          borderRight: "1px solid rgba(255,255,255,0.04)",
          pointerEvents: "none"
        }}
      />

      <div
        style={{
          position: "absolute",
          left: terminalRect.left + 14,
          top: terminalRect.top,
          right: 0,
          height: terminalRect.height,
          background:
            "repeating-linear-gradient(180deg, rgba(255,255,255,0.018) 0 1px, transparent 1px 28px)",
          opacity: 0.45,
          pointerEvents: "none"
        }}
      />

      {model.lines.map((line, index) => {
        const rect = toLocalRect(layout.lineRects[index], windowBounds);
        const isPromptLine = line.includes("$");
        return (
          <div
            key={`${index}-${line}`}
            style={{
              position: "absolute",
              left: rect.left,
              top: rect.top,
              width: rect.width,
              height: rect.height,
              fontFamily: '"Ubuntu Mono", ui-monospace, monospace',
              fontSize: denseMode ? 14 : 15,
              lineHeight: 1.42,
              color: isPromptLine ? "#f8fafc" : "#d9dee7",
              background: model.selectedLineIndex === index ? "rgba(96,165,250,0.14)" : "transparent",
              borderRadius: 4,
              padding: "0 10px 0 14px",
              display: "flex",
              alignItems: "center",
              overflow: "hidden",
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
              pointerEvents: "auto"
            }}
          >
            {line}
          </div>
        );
      })}

      <div
        style={{
          position: "absolute",
          left: inputRect.left,
          top: inputRect.top,
          width: inputRect.width,
          height: inputRect.height,
          fontFamily: '"Ubuntu Mono", ui-monospace, monospace',
          fontSize: denseMode ? 14 : 15,
          lineHeight: 1.42,
          color: "#f8fafc",
          display: "flex",
          alignItems: "center",
          overflow: "hidden",
          pointerEvents: "none",
          paddingLeft: 2,
          gap: ultraDenseMode ? 2 : 3
        }}
      >
        <span style={{ color: "#8bd5ca", flexShrink: 0, whiteSpace: "nowrap" }}>{ultraDenseMode ? "user" : model.prompt}</span>
        {!ultraDenseMode && <span style={{ color: "rgba(203,213,225,0.72)", flexShrink: 0 }}>:</span>}
        <span
          style={{
            color: "#f6c177",
            minWidth: 0,
            maxWidth: ultraDenseMode ? "28%" : denseMode ? "34%" : "38%",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            flexShrink: 1
          }}
        >
          ~/{titleCwd}
        </span>
        <span style={{ marginLeft: ultraDenseMode ? 1 : 3, flexShrink: 0 }}>$</span>
        <span
          style={{
            marginLeft: ultraDenseMode ? 3 : 6,
            minWidth: 0,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            flex: 1
          }}
        >
          {model.input}
        </span>
        <span style={{ color: "#fb923c", marginLeft: 1, flexShrink: 0 }}>|</span>
      </div>
    </div>
  );
}
