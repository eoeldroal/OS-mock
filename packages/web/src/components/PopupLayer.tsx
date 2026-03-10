import type { PopupViewModel } from "../../../core/src/types.js";

export function PopupLayer({ popups }: { popups: PopupViewModel[] }) {
  if (popups.length === 0) {
    return null;
  }

  return (
    <>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(17, 13, 24, 0.46)",
          backdropFilter: "blur(4px)",
          zIndex: 1400
        }}
      />
      {popups.map((popup) => (
        <div
          key={popup.id}
          style={{
            position: "absolute",
            left: popup.bounds.x,
            top: popup.bounds.y,
            width: popup.bounds.width,
            height: popup.bounds.height,
            borderRadius: 20,
            border: "1px solid rgba(255, 255, 255, 0.18)",
            background: "#fbfbfd",
            boxShadow: "0 30px 70px rgba(2, 6, 23, 0.34)",
            zIndex: 1500,
            padding: 28,
            boxSizing: "border-box"
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              background: "rgba(233,84,32,0.12)",
              color: "#e95420",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              fontWeight: 700
            }}
          >
            !
          </div>
          <div style={{ marginTop: 18, fontSize: 22, fontWeight: 700, color: "#111827" }}>{popup.title}</div>
          <div style={{ marginTop: 14, fontSize: 15, lineHeight: 1.6, color: "#475569", maxWidth: 310 }}>
            {popup.message}
          </div>
          <button
            type="button"
            aria-label={popup.buttonLabel}
            style={{
              position: "absolute",
              right: 24,
              bottom: 22,
              padding: "10px 18px",
              borderRadius: 12,
              background: "#3584e4",
              color: "#ffffff",
              fontSize: 14,
              fontWeight: 700,
              boxShadow: "0 12px 22px rgba(53,132,228,0.34)",
              border: "none",
              cursor: "pointer"
            }}
          >
            {popup.buttonLabel}
          </button>
        </div>
      ))}
    </>
  );
}
