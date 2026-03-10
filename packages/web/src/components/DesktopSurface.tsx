import { useEffect, useMemo, useRef } from "react";
import type { Computer13Action, RenderModel } from "../../../core/src/types.js";
import { getAppMeta, ubuntuWallpaper } from "../app-assets";
import { PointerLayer } from "./PointerLayer";
import { PopupLayer } from "./PopupLayer";
import { WindowFrame } from "./WindowFrame";

type DesktopSurfaceProps = {
  model: RenderModel;
  onAction?: (action: Computer13Action) => Promise<unknown> | void;
};

function IndicatorDot({ active, accent }: { active: boolean; accent: string }) {
  return (
    <div
      style={{
        width: 4,
        height: active ? 18 : 6,
        borderRadius: 99,
        background: active ? accent : "rgba(255,255,255,0.28)",
        boxShadow: active ? `0 0 10px ${accent}` : "none"
      }}
    />
  );
}

function normalizeHotkey(event: React.KeyboardEvent<HTMLDivElement>) {
  const lowerKey = event.key.toLowerCase();
  const keys = new Set<string>();

  if (event.ctrlKey || event.metaKey) {
    keys.add("ctrl");
  }
  if (event.shiftKey) {
    keys.add("shift");
  }
  if (event.altKey) {
    keys.add("alt");
  }

  if (lowerKey && !["control", "meta", "shift", "alt"].includes(lowerKey)) {
    keys.add(lowerKey);
  }

  return Array.from(keys);
}

export function DesktopSurface({ model, onAction }: DesktopSurfaceProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const clickTimerRef = useRef<number | null>(null);
  const interactionQueueRef = useRef<Promise<unknown>>(Promise.resolve());
  const pendingClickRef = useRef<{
    cancel: () => void;
  } | null>(null);

  const topBarClock = useMemo(() => model.topBarClock, [model.topBarClock]);

  useEffect(() => {
    rootRef.current?.focus();
    return () => {
      if (clickTimerRef.current !== null) {
        window.clearTimeout(clickTimerRef.current);
      }
      pendingClickRef.current?.cancel();
    };
  }, []);

  const toPoint = (event: { clientX: number; clientY: number }) => {
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) {
      return { x: 0, y: 0 };
    }
    return {
      x: Math.max(0, Math.min(model.viewport.width, Math.round(event.clientX - rect.left))),
      y: Math.max(0, Math.min(model.viewport.height, Math.round(event.clientY - rect.top)))
    };
  };

  const dispatchAction = (action: Computer13Action) => {
    if (!onAction) {
      return Promise.resolve();
    }
    interactionQueueRef.current = interactionQueueRef.current
      .catch(() => undefined)
      .then(() => onAction(action));
    return interactionQueueRef.current;
  };

  const clearPendingSingleClick = () => {
    if (clickTimerRef.current !== null) {
      window.clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    pendingClickRef.current?.cancel();
    pendingClickRef.current = null;
  };

  const queueSingleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!onAction || event.button !== 0) {
      return;
    }
    const point = toPoint(event);
    rootRef.current?.focus();
    clearPendingSingleClick();

    let cancelled = false;
    let releaseClick: (() => void) | null = null;
    const gate = new Promise<void>((resolve) => {
      releaseClick = resolve;
    });

    interactionQueueRef.current = interactionQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        await gate;
        if (!cancelled) {
          await onAction({ type: "CLICK", x: point.x, y: point.y });
        }
      });

    pendingClickRef.current = {
      cancel: () => {
        cancelled = true;
        releaseClick?.();
      }
    };

    clickTimerRef.current = window.setTimeout(() => {
      releaseClick?.();
      clickTimerRef.current = null;
      pendingClickRef.current = null;
    }, 180);
  };

  const handleDoubleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!onAction) {
      return;
    }
    event.preventDefault();
    rootRef.current?.focus();
    clearPendingSingleClick();
    const point = toPoint(event);
    void dispatchAction({ type: "DOUBLE_CLICK", x: point.x, y: point.y });
  };

  const handleContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!onAction) {
      return;
    }
    event.preventDefault();
    rootRef.current?.focus();
    const point = toPoint(event);
    void dispatchAction({ type: "RIGHT_CLICK", x: point.x, y: point.y });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!onAction) {
      return;
    }

    const lowerKey = event.key.toLowerCase();

    if (event.ctrlKey || event.metaKey || event.altKey) {
      const keys = normalizeHotkey(event);
      if (keys.length > 1) {
        event.preventDefault();
        void dispatchAction({ type: "HOTKEY", keys });
      }
      return;
    }

    if (lowerKey === "enter" || lowerKey === "backspace" || lowerKey === "escape" || lowerKey === "f2") {
      event.preventDefault();
      void dispatchAction({ type: "PRESS", key: lowerKey });
      return;
    }

    if (event.key === "Tab") {
      event.preventDefault();
      void dispatchAction({ type: "PRESS", key: "tab" });
      return;
    }

    if (event.key.length === 1) {
      event.preventDefault();
      void dispatchAction({ type: "TYPING", text: event.key });
    }
  };

  return (
    <div
      ref={rootRef}
      tabIndex={0}
      onClick={queueSingleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      onKeyDown={handleKeyDown}
      onMouseDown={() => rootRef.current?.focus()}
      title="Click, double-click, and type to interact with the mock desktop."
      style={{
        position: "relative",
        width: model.viewport.width,
        height: model.viewport.height,
        backgroundImage: `linear-gradient(180deg, rgba(17,10,24,0.42) 0%, rgba(9,14,28,0.54) 100%), url(${ubuntuWallpaper})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        overflow: "hidden",
        userSelect: "none",
        outline: "none",
        cursor: "default"
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 18% 22%, rgba(255,140,84,0.16), transparent 20%), radial-gradient(circle at 82% 16%, rgba(150,120,255,0.14), transparent 18%)"
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: "0 0 auto 0",
          height: 30,
          background: "rgba(20, 17, 31, 0.72)",
          backdropFilter: "blur(18px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 18px",
          color: "#f7f7fb",
          fontSize: 14,
          zIndex: 1200,
          boxShadow: "0 1px 0 rgba(255,255,255,0.05)"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, fontWeight: 700 }}>
          <span>{model.topBarTitle}</span>
          <span style={{ fontWeight: 500, opacity: 0.55 }}>{model.desktopTitle}</span>
        </div>
        <div style={{ fontWeight: 500, letterSpacing: 0.2 }}>{topBarClock}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13 }}>
          <span style={{ opacity: 0.85 }}>en</span>
          <span style={{ opacity: 0.85 }}>net</span>
          <span style={{ opacity: 0.85 }}>vol</span>
          <div
            style={{
              width: 18,
              height: 10,
              borderRadius: 3,
              border: "1px solid rgba(255,255,255,0.7)",
              position: "relative"
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 1,
                top: 1,
                bottom: 1,
                width: 11,
                borderRadius: 2,
                background: "#fafafc"
              }}
            />
          </div>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 10,
          top: 66,
          width: 58,
          bottom: 18,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
          padding: "12px 0",
          borderRadius: 22,
          background: "rgba(18, 16, 28, 0.46)",
          backdropFilter: "blur(20px)",
          zIndex: 1200,
          boxSizing: "border-box",
          boxShadow: "0 24px 48px rgba(6, 8, 14, 0.34), inset 0 0 0 1px rgba(255,255,255,0.06)"
        }}
      >
        {model.taskbarItems.map((item) => {
          const meta = getAppMeta(item.appId);
          const active = model.focusedWindowId === item.windowId;
          return (
            <div
              key={item.windowId}
              title={item.title}
              style={{
                position: "absolute",
                left: item.bounds.x - 10,
                top: item.bounds.y - 66,
                width: item.bounds.width,
                height: item.bounds.height,
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <div style={{ position: "absolute", left: 5 }}>
                <IndicatorDot active={active} accent={meta.accent} />
              </div>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: active ? "rgba(255,255,255,0.12)" : "transparent",
                  boxShadow: active ? "0 10px 22px rgba(0,0,0,0.26)" : "none",
                  border: active ? "1px solid rgba(255,255,255,0.1)" : "1px solid transparent"
                }}
              >
                <img
                  src={meta.icon}
                  alt={meta.label}
                  draggable={false}
                  style={{
                    width: 30,
                    height: 30,
                    objectFit: "contain",
                    filter: active ? "drop-shadow(0 8px 10px rgba(0,0,0,0.25))" : "none"
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          position: "absolute",
          right: 22,
          bottom: 20,
          width: 420,
          padding: "14px 16px",
          borderRadius: 18,
          background: "rgba(20, 18, 28, 0.54)",
          border: "1px solid rgba(255,255,255,0.08)",
          backdropFilter: "blur(18px)",
          boxShadow: "0 18px 36px rgba(10, 11, 18, 0.34)",
          color: "#f9fafb",
          zIndex: 1100,
          pointerEvents: "none"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 9,
              height: 9,
              borderRadius: 99,
              background: "#e95420",
              boxShadow: "0 0 10px rgba(233,84,32,0.6)"
            }}
          />
          <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.7)", textTransform: "uppercase" }}>
            Step {model.stepIndex}
          </div>
        </div>
        <div style={{ marginTop: 8, fontSize: 16, lineHeight: 1.45, fontWeight: 500 }}>
          {model.instruction ?? "No task loaded."}
        </div>
      </div>

      {model.windows.map((window) => (
        <WindowFrame key={window.id} window={window} />
      ))}

      <PopupLayer popups={model.popups} />
      <PointerLayer pointer={model.pointer} />
    </div>
  );
}
