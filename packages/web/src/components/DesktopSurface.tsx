import { useEffect, useMemo, useRef } from "react";
import type {
  BrowserContentInput,
  BrowserLiteViewModel,
  Computer13Action,
  RenderModel,
  WindowViewModel
} from "../../../core/src/types.js";
import { getAppMeta, ubuntuWallpaper } from "../app-assets";
import { FloatingContextMenu } from "./FloatingContextMenu";
import { PointerLayer } from "./PointerLayer";
import { PopupLayer } from "./PopupLayer";
import { WindowFrame } from "./WindowFrame";

type DesktopSurfaceProps = {
  model: RenderModel;
  onAction?: (action: Computer13Action) => Promise<unknown> | void;
  onBrowserContentAction?: (windowId: string, input: BrowserContentInput) => Promise<unknown> | void;
};

type PendingTypingTarget =
  | { kind: "core" }
  | { kind: "browser"; windowId: string };

function pointInRect(point: { x: number; y: number }, rect: { x: number; y: number; width: number; height: number }) {
  return (
    point.x >= rect.x &&
    point.y >= rect.y &&
    point.x <= rect.x + rect.width &&
    point.y <= rect.y + rect.height
  );
}

function IndicatorDot({
  active,
  running,
  minimized,
  accent
}: {
  active: boolean;
  running: boolean;
  minimized: boolean;
  accent: string;
}) {
  const width = active ? 4 : minimized ? 3.5 : running ? 3 : 2;
  const height = active ? 18 : minimized ? 14 : running ? 8 : 5;
  const background = active
    ? accent
    : minimized
    ? `color-mix(in srgb, ${accent} 78%, white 22%)`
    : running
    ? "rgba(255,255,255,0.5)"
    : "rgba(255,255,255,0.18)";

  return (
    <div
      style={{
        width,
        height,
        borderRadius: 99,
        background,
        boxShadow: active
          ? `0 0 8px ${accent}`
          : minimized
          ? `0 0 10px color-mix(in srgb, ${accent} 42%, transparent)`
          : "none",
        opacity: running ? 1 : 0.85
      }}
    />
  );
}

function TopBarStatus() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--shell-topbar-muted)" }}>
      <div
        aria-hidden
        style={{
          fontSize: 10.5,
          fontWeight: 500,
          letterSpacing: 0.32,
          color: "var(--shell-topbar-muted)",
          textTransform: "lowercase"
        }}
      >
        EN
      </div>
      <div aria-hidden style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 10 }}>
        {[4, 6, 8, 10].map((height, index) => (
          <span
            key={height}
            style={{
              display: "block",
              width: 2,
              height,
              borderRadius: 999,
              background: index >= 2 ? "var(--shell-topbar-text)" : "rgba(245,243,248,0.48)"
            }}
          />
        ))}
      </div>
      <div aria-hidden style={{ position: "relative", width: 15, height: 10 }}>
        <span
          style={{
            position: "absolute",
            left: 0,
            bottom: 0,
            width: 9,
            height: 7,
            borderRadius: "7px 7px 2px 2px",
            border: "1.4px solid rgba(245,243,248,0.76)",
            borderBottomWidth: 0
          }}
        />
        <span
          style={{
            position: "absolute",
            right: 0,
            top: 1,
            width: 5,
            height: 5,
            borderRadius: 999,
            border: "1.2px solid rgba(245,243,248,0.76)"
          }}
        />
      </div>
      <div
        aria-hidden
        style={{
          position: "relative",
          width: 22,
          height: 11,
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.28)",
          background: "rgba(255,255,255,0.04)"
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 1.5,
            top: 1.5,
            width: 13,
            height: 7,
            borderRadius: 999,
            background: "rgba(245,243,248,0.9)"
          }}
        />
      </div>
      <div
        aria-hidden
        style={{
          width: 7,
          height: 7,
          borderRadius: 999,
          background: "rgba(245,243,248,0.88)",
          boxShadow: "0 0 0 2px rgba(255,255,255,0.05)"
        }}
      />
    </div>
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

function isHybridExternalBrowserWindow(window: WindowViewModel | undefined): window is WindowViewModel & {
  appView: BrowserLiteViewModel;
} {
  return Boolean(
    window &&
      window.appView.type === "browser-lite" &&
      window.appView.renderMode === "hybrid" &&
      window.appView.currentPage === "external"
  );
}

export function DesktopSurface({ model, onAction, onBrowserContentAction }: DesktopSurfaceProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const clickTimerRef = useRef<number | null>(null);
  const pendingClickRef = useRef<{
    fire: () => void;
    cancel: () => void;
    settled: Promise<void>;
  } | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    button: number;
    origin: { x: number; y: number };
    lastPoint: { x: number; y: number };
    dragging: boolean;
  } | null>(null);
  const dragDispatchChainRef = useRef<Promise<void>>(Promise.resolve());
  /** Throttle DRAG_TO to avoid HTTP queue backlog */
  const lastDragDispatchRef = useRef(0);
  const activeHybridContentWindowIdRef = useRef<string | null>(null);
  const pendingAddressBarFocusWindowIdRef = useRef<string | null>(null);
  const pendingTypingRef = useRef<{
    target: PendingTypingTarget;
    text: string;
  } | null>(null);
  const pendingTypingTimerRef = useRef<number | null>(null);
  const pendingTypingChainRef = useRef<Promise<void>>(Promise.resolve());
  const keyDispatchChainRef = useRef<Promise<void>>(Promise.resolve());
  const DRAG_THROTTLE_MS = 32; // ~30fps
  const TYPING_BATCH_IDLE_MS = 90;

  /** Stable ref for onAction so closures never go stale */
  const onActionRef = useRef(onAction);
  onActionRef.current = onAction;
  const onBrowserContentActionRef = useRef(onBrowserContentAction);
  onBrowserContentActionRef.current = onBrowserContentAction;

  const topBarClock = useMemo(() => model.topBarClock, [model.topBarClock]);
  const secondaryTopBarLabel = useMemo(() => {
    const primary = (model.topBarTitle || "").trim();
    const secondary = (model.desktopTitle || "").trim();
    if (!secondary) {
      return "";
    }
    if (!primary) {
      return secondary;
    }
    if (secondary.toLowerCase() === primary.toLowerCase()) {
      return "";
    }
    return secondary;
  }, [model.desktopTitle, model.topBarTitle]);
  const visibleSecondaryTopBarLabel =
    secondaryTopBarLabel && secondaryTopBarLabel !== "Ubuntu Desktop" ? secondaryTopBarLabel : "";

  const dispatchAction = (action: Computer13Action) => {
    const handler = onActionRef.current;
    if (!handler) {
      return Promise.resolve();
    }
    return Promise.resolve(handler(action));
  };

  const enqueueKeyDispatch = (task: () => Promise<void> | void) => {
    const run = async () => {
      try {
        await task();
      } catch (error) {
        console.error("desktop-surface key dispatch failed", error);
      }
    };

    keyDispatchChainRef.current = keyDispatchChainRef.current.then(run, run);
    return keyDispatchChainRef.current;
  };

  const sendTypingToTarget = (pending: { target: PendingTypingTarget; text: string }) => {
    if (pending.target.kind === "browser") {
      const handler = onBrowserContentActionRef.current;
      if (!handler) {
        return Promise.resolve();
      }
      return Promise.resolve(handler(pending.target.windowId, { kind: "type", text: pending.text }));
    }
    return dispatchAction({ type: "TYPING", text: pending.text });
  };

  const enqueueTypingDelivery = (pending: { target: PendingTypingTarget; text: string }) => {
    pendingTypingChainRef.current = pendingTypingChainRef.current.then(() =>
      sendTypingToTarget(pending).then(() => undefined)
    );
    return pendingTypingChainRef.current;
  };

  const clearPendingTypingTimer = () => {
    if (pendingTypingTimerRef.current !== null) {
      window.clearTimeout(pendingTypingTimerRef.current);
      pendingTypingTimerRef.current = null;
    }
  };

  const drainPendingTyping = () => {
    clearPendingTypingTimer();
    const pending = pendingTypingRef.current;
    pendingTypingRef.current = null;
    if (!pending) {
      return pendingTypingChainRef.current;
    }
    return enqueueTypingDelivery(pending);
  };

  const schedulePendingTypingDrain = () => {
    clearPendingTypingTimer();
    pendingTypingTimerRef.current = window.setTimeout(() => {
      void enqueueKeyDispatch(async () => {
        await flushPendingSingleClick();
        await drainPendingTyping();
      });
    }, TYPING_BATCH_IDLE_MS);
  };

  const sameTypingTarget = (left: PendingTypingTarget, right: PendingTypingTarget) =>
    left.kind === right.kind && (left.kind !== "browser" || left.windowId === (right as { windowId: string }).windowId);

  const bufferTyping = (target: PendingTypingTarget, text: string) => {
    if (!text) {
      return;
    }

    const pending = pendingTypingRef.current;
    if (pending && sameTypingTarget(pending.target, target)) {
      pending.text += text;
      schedulePendingTypingDrain();
      return;
    }

    if (pending) {
      void enqueueTypingDelivery(pending);
    }

    pendingTypingRef.current = { target, text };
    schedulePendingTypingDrain();
  };

  const enqueueDragAction = (action: Computer13Action) => {
    dragDispatchChainRef.current = dragDispatchChainRef.current.then(() => dispatchAction(action).then(() => undefined));
    return dragDispatchChainRef.current;
  };

  const getHybridBrowserAtPoint = (point: { x: number; y: number }) => {
    if (model.popups.length > 0 || model.contextMenu) {
      return undefined;
    }
    const topmostWindow = [...model.windows]
      .sort((left, right) => right.zIndex - left.zIndex)
      .find((window) => !window.minimized && pointInRect(point, window.bounds));

    if (
      !topmostWindow ||
      topmostWindow.appView.type !== "browser-lite" ||
      topmostWindow.appView.renderMode !== "hybrid" ||
      topmostWindow.appView.currentPage !== "external" ||
      !pointInRect(point, topmostWindow.appView.layout.contentBounds)
    ) {
      return undefined;
    }

    return topmostWindow;
  };

  const getBrowserAddressBarAtPoint = (point: { x: number; y: number }) => {
    if (model.popups.length > 0 || model.contextMenu) {
      return undefined;
    }

    const topmostWindow = [...model.windows]
      .sort((left, right) => right.zIndex - left.zIndex)
      .find(
        (window) =>
          !window.minimized &&
          window.appView.type === "browser-lite" &&
          pointInRect(point, window.bounds) &&
          pointInRect(point, window.appView.layout.addressBarBounds)
      );

    if (!topmostWindow || topmostWindow.appView.type !== "browser-lite") {
      return undefined;
    }

    return topmostWindow;
  };

  const getHybridBrowserById = (windowId?: string | null) => {
    if (!windowId) {
      return undefined;
    }
    const window = model.windows.find((candidate) => candidate.id === windowId);
    if (!isHybridExternalBrowserWindow(window) || window.appView.addressBarFocused) {
      return undefined;
    }
    return window;
  };

  const getHybridBrowserForKeyboard = () =>
    getHybridBrowserById(activeHybridContentWindowIdRef.current) ?? getHybridBrowserById(model.focusedWindowId);

  useEffect(() => {
    rootRef.current?.focus();

    return () => {
      void enqueueKeyDispatch(async () => {
        await flushPendingSingleClick();
        await drainPendingTyping();
      });
      clearPendingTypingTimer();
      if (clickTimerRef.current !== null) {
        window.clearTimeout(clickTimerRef.current);
      }
      pendingClickRef.current?.cancel();
    };
  }, []);

  useEffect(() => {
    if (!getHybridBrowserById(activeHybridContentWindowIdRef.current)) {
      activeHybridContentWindowIdRef.current = null;
    }
  }, [model.windows, model.focusedWindowId]);

  useEffect(() => {
    const windowId = pendingAddressBarFocusWindowIdRef.current;
    if (!windowId) {
      return;
    }
    const browserWindow = model.windows.find((window) => window.id === windowId);
    if (!browserWindow || browserWindow.appView.type !== "browser-lite" || !browserWindow.appView.addressBarFocused) {
      pendingAddressBarFocusWindowIdRef.current = null;
    }
  }, [model.windows, model.focusedWindowId]);

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

  const clearPendingSingleClick = () => {
    if (clickTimerRef.current !== null) {
      window.clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    pendingClickRef.current?.cancel();
    pendingClickRef.current = null;
  };

  const flushPendingSingleClick = () => {
    if (clickTimerRef.current !== null) {
      window.clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    const pending = pendingClickRef.current;
    pending?.fire();
    pendingClickRef.current = null;
    return pending?.settled ?? Promise.resolve();
  };

  const releasePointerCapture = (pointerId: number) => {
    const element = rootRef.current;
    if (!element?.hasPointerCapture(pointerId)) {
      return;
    }
    element.releasePointerCapture(pointerId);
  };

  const scheduleSingleClick = (point: { x: number; y: number }) => {
    if (!onActionRef.current && !onBrowserContentActionRef.current) {
      return;
    }

    rootRef.current?.focus();
    clearPendingSingleClick();

    let cancelled = false;
    let releaseClick: (() => void) | null = null;
    let settleClick: (() => void) | null = null;
    const gate = new Promise<void>((resolve) => {
      releaseClick = resolve;
    });
    const settled = new Promise<void>((resolve) => {
      settleClick = resolve;
    });

    void gate.then(() => {
      void drainPendingTyping().then(() => {
        if (cancelled) {
          settleClick?.();
          return;
        }
        const addressBarWindow = getBrowserAddressBarAtPoint(point);
        if (addressBarWindow) {
          pendingAddressBarFocusWindowIdRef.current = addressBarWindow.id;
          activeHybridContentWindowIdRef.current = null;
        } else {
          pendingAddressBarFocusWindowIdRef.current = null;
        }
        const hybridWindow = getHybridBrowserAtPoint(point);
        if (hybridWindow && onBrowserContentActionRef.current) {
          activeHybridContentWindowIdRef.current = hybridWindow.id;
          void Promise.resolve(
            onBrowserContentActionRef.current(hybridWindow.id, { kind: "click", x: point.x, y: point.y })
          ).finally(() => settleClick?.());
          return;
        }
        activeHybridContentWindowIdRef.current = null;
        void Promise.resolve(onActionRef.current?.({ type: "CLICK", x: point.x, y: point.y })).finally(() =>
          settleClick?.()
        );
      });
    });

    pendingClickRef.current = {
      fire: () => {
        releaseClick?.();
      },
      cancel: () => {
        cancelled = true;
        releaseClick?.();
      },
      settled
    };

    clickTimerRef.current = window.setTimeout(() => {
      releaseClick?.();
      clickTimerRef.current = null;
      pendingClickRef.current = null;
    }, 180);
  };

  const finalizeDrag = (point?: { x: number; y: number }) => {
    const drag = dragRef.current;
    if (!drag) {
      return;
    }

    dragRef.current = null;
    const finalPoint = point ?? drag.lastPoint ?? drag.origin;

    if (!drag.dragging) {
      return;
    }

    void enqueueDragAction({ type: "DRAG_TO", x: finalPoint.x, y: finalPoint.y }).then(() =>
      enqueueDragAction({ type: "MOUSE_UP", button: "left" })
    );
  };

  const handleDoubleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!onActionRef.current && !onBrowserContentActionRef.current) {
      return;
    }
    event.preventDefault();
    rootRef.current?.focus();
    clearPendingSingleClick();
    pendingAddressBarFocusWindowIdRef.current = null;
    const point = toPoint(event);
    void drainPendingTyping().then(() => {
      const hybridWindow = getHybridBrowserAtPoint(point);
      if (hybridWindow && onBrowserContentActionRef.current) {
        activeHybridContentWindowIdRef.current = hybridWindow.id;
        void onBrowserContentActionRef.current(hybridWindow.id, { kind: "double_click", x: point.x, y: point.y });
        return;
      }
      activeHybridContentWindowIdRef.current = null;
      void dispatchAction({ type: "DOUBLE_CLICK", x: point.x, y: point.y });
    });
  };

  const handleContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!onActionRef.current) {
      return;
    }
    event.preventDefault();
    rootRef.current?.focus();
    activeHybridContentWindowIdRef.current = null;
    pendingAddressBarFocusWindowIdRef.current = null;
    const point = toPoint(event);
    void drainPendingTyping().then(() => dispatchAction({ type: "RIGHT_CLICK", x: point.x, y: point.y }));
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    rootRef.current?.focus();
    if (!onAction || event.button !== 0) {
      return;
    }
    event.preventDefault();
    void drainPendingTyping();
    pendingAddressBarFocusWindowIdRef.current = null;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      button: event.button,
      origin: toPoint(event),
      lastPoint: toPoint(event),
      dragging: false
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!onAction || !dragRef.current || dragRef.current.button !== 0 || dragRef.current.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();

    const point = toPoint(event);
    dragRef.current.lastPoint = point;
    if ((event.buttons & 1) === 0) {
      finalizeDrag(point);
      releasePointerCapture(event.pointerId);
      return;
    }

    const distance = Math.hypot(point.x - dragRef.current.origin.x, point.y - dragRef.current.origin.y);
    if (!dragRef.current.dragging && distance < 6) {
      return;
    }

    if (!dragRef.current.dragging) {
      clearPendingSingleClick();
      dragRef.current.dragging = true;
      void enqueueDragAction({ type: "MOVE_TO", x: dragRef.current.origin.x, y: dragRef.current.origin.y });
      void enqueueDragAction({ type: "MOUSE_DOWN", button: "left" });
    }

    const now = performance.now();
    if (now - lastDragDispatchRef.current < DRAG_THROTTLE_MS) {
      return;
    }
    lastDragDispatchRef.current = now;

    void enqueueDragAction({ type: "DRAG_TO", x: point.x, y: point.y });
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!onAction || !dragRef.current || dragRef.current.button !== 0 || dragRef.current.pointerId !== event.pointerId) {
      return;
    }

    const wasDragging = dragRef.current.dragging;
    const point = toPoint(event);
    dragRef.current.lastPoint = point;
    finalizeDrag(point);
    releasePointerCapture(event.pointerId);
    if (!wasDragging) {
      scheduleSingleClick(point);
    }
  };

  const handlePointerCancel = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) {
      return;
    }

    finalizeDrag(dragRef.current.lastPoint);
    releasePointerCapture(event.pointerId);
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (!onActionRef.current && !onBrowserContentActionRef.current) {
      return;
    }
    event.preventDefault();
    const point = toPoint(event);
    // Normalize: deltaY > 0 = scroll down, deltaY < 0 = scroll up
    // deltaX > 0 = scroll right, deltaX < 0 = scroll left
    const dy = Math.sign(event.deltaY) * Math.min(3, Math.ceil(Math.abs(event.deltaY) / 40));
    const dx = Math.sign(event.deltaX) * Math.min(3, Math.ceil(Math.abs(event.deltaX) / 40));
    if (dx !== 0 || dy !== 0) {
      void drainPendingTyping().then(() => {
        pendingAddressBarFocusWindowIdRef.current = null;
        const hybridWindow = getHybridBrowserAtPoint(point);
        if (hybridWindow && onBrowserContentActionRef.current) {
          activeHybridContentWindowIdRef.current = hybridWindow.id;
          void onBrowserContentActionRef.current(hybridWindow.id, { kind: "scroll", x: point.x, y: point.y, dx, dy });
          return;
        }
        activeHybridContentWindowIdRef.current = null;
        void dispatchAction({ type: "SCROLL", dx, dy });
      });
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!onActionRef.current && !onBrowserContentActionRef.current) {
      return;
    }

    const eventKey = event.key;
    const lowerKey = eventKey.toLowerCase();
    const isHotkey = event.ctrlKey || event.metaKey || event.altKey;
    const isPressKey =
      lowerKey === "enter" || lowerKey === "backspace" || lowerKey === "escape" || lowerKey === "f2" || lowerKey === "delete";
    const isTab = eventKey === "Tab";
    const isPrintable = eventKey.length === 1;
    const hotkeyKeys = isHotkey ? normalizeHotkey(event) : [];

    if (isHotkey || isPressKey || isTab || isPrintable) {
      event.preventDefault();
    }

    void enqueueKeyDispatch(async () => {
      await flushPendingSingleClick();
      const hybridWindow = pendingAddressBarFocusWindowIdRef.current ? undefined : getHybridBrowserForKeyboard();

      if (isHotkey) {
        if (hotkeyKeys.length > 1) {
          await drainPendingTyping();
          if (
            hybridWindow &&
            onBrowserContentActionRef.current &&
            !(hotkeyKeys.length === 2 && hotkeyKeys.includes("ctrl") && hotkeyKeys.includes("l"))
          ) {
            await Promise.resolve(onBrowserContentActionRef.current(hybridWindow.id, { kind: "hotkey", keys: hotkeyKeys }));
            return;
          }
          await dispatchAction({ type: "HOTKEY", keys: hotkeyKeys });
        }
        return;
      }

      if (isPressKey) {
        await drainPendingTyping();
        if (lowerKey === "enter" || lowerKey === "escape") {
          pendingAddressBarFocusWindowIdRef.current = null;
        }
        if (hybridWindow && onBrowserContentActionRef.current) {
          await Promise.resolve(onBrowserContentActionRef.current(hybridWindow.id, { kind: "press", key: lowerKey }));
          return;
        }
        await dispatchAction({ type: "PRESS", key: lowerKey });
        return;
      }

      if (isTab) {
        await drainPendingTyping();
        pendingAddressBarFocusWindowIdRef.current = null;
        if (hybridWindow && onBrowserContentActionRef.current) {
          await Promise.resolve(onBrowserContentActionRef.current(hybridWindow.id, { kind: "press", key: "tab" }));
          return;
        }
        await dispatchAction({ type: "PRESS", key: "tab" });
        return;
      }

      if (isPrintable) {
        if (hybridWindow && onBrowserContentActionRef.current) {
          bufferTyping({ kind: "browser", windowId: hybridWindow.id }, eventKey);
          return;
        }
        bufferTyping({ kind: "core" }, eventKey);
      }
    });
  };

  return (
    <div
      ref={rootRef}
      tabIndex={0}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      onKeyDown={handleKeyDown}
      onBlur={() => {
        void enqueueKeyDispatch(async () => {
          await flushPendingSingleClick();
          await drainPendingTyping();
        });
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onWheel={handleWheel}
      style={{
        position: "relative",
        width: model.viewport.width,
        height: model.viewport.height,
        backgroundImage: `linear-gradient(180deg, rgba(24,11,33,0.28) 0%, rgba(11,10,20,0.44) 100%), url(${ubuntuWallpaper})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        overflow: "hidden",
        userSelect: "none",
        touchAction: "none",
        outline: "none",
        cursor: "default"
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 16% 16%, rgba(233,84,32,0.16), transparent 22%), radial-gradient(circle at 82% 14%, rgba(94,58,138,0.18), transparent 22%), linear-gradient(180deg, rgba(255,255,255,0.025), rgba(255,255,255,0))"
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 96,
          top: 42,
          bottom: 26,
          width: 108,
          background: "linear-gradient(180deg, rgba(255,255,255,0.012), rgba(255,255,255,0.002) 28%, rgba(255,255,255,0.006) 100%)",
          borderRight: "1px solid rgba(255,255,255,0.02)",
          pointerEvents: "none"
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: "0 0 auto 0",
          height: 34,
          background: "var(--shell-topbar-bg)",
          backdropFilter: "blur(16px) saturate(115%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 14px 0 12px",
          color: "var(--shell-topbar-text)",
          fontSize: 13,
          zIndex: 1200,
          boxShadow: "0 1px 0 var(--shell-topbar-border)"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600, minWidth: 0 }}>
          <span style={{ letterSpacing: 0.02 }}>Activities</span>
          {!!visibleSecondaryTopBarLabel && (
            <span
              style={{
                fontWeight: 500,
                color: "var(--shell-topbar-muted)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                paddingLeft: 4
              }}
            >
              {visibleSecondaryTopBarLabel}
            </span>
          )}
        </div>
        <div
          style={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            fontWeight: 500,
            letterSpacing: 0.12,
            color: "rgba(243,238,245,0.95)"
          }}
        >
          {topBarClock}
        </div>
        <TopBarStatus />
      </div>

      <div
        style={{
          position: "absolute",
          left: 14,
          top: 46,
          width: 70,
          bottom: 18,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          borderRadius: 24,
          background: "var(--shell-dock-bg)",
          backdropFilter: "blur(18px) saturate(116%)",
          zIndex: 1200,
          boxSizing: "border-box",
          boxShadow: "var(--shell-dock-shadow), inset 0 0 0 1px var(--shell-dock-border)"
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 8,
            bottom: 8,
            left: 8,
            right: 8,
            borderRadius: 18,
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.028), rgba(255,255,255,0.012) 18%, rgba(255,255,255,0.008) 82%, rgba(255,255,255,0.016))",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03), inset 0 -1px 0 rgba(255,255,255,0.012)",
            pointerEvents: "none"
          }}
        />
        {model.taskbarItems.map((item) => {
          const meta = getAppMeta(item.appId);
          const active = model.focusedWindowId === item.windowId;
          const running = item.running;
          const minimized = item.minimized;
          return (
            <div
              key={item.windowId}
              title={item.title}
              style={{
                position: "absolute",
                left: item.bounds.x - 14,
                top: item.bounds.y - 48,
                width: item.bounds.width,
                height: item.bounds.height,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none"
              }}
            >
              <div style={{ position: "absolute", left: 4 }}>
                <IndicatorDot active={active} running={running} minimized={minimized} accent={meta.accent} />
              </div>
              <div
                style={{
                  width: active ? 48 : 44,
                  height: active ? 48 : 44,
                  borderRadius: 15,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: active
                    ? "linear-gradient(180deg, rgba(255,255,255,0.18), rgba(255,255,255,0.075))"
                    : minimized
                    ? "linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04))"
                    : "linear-gradient(180deg, rgba(255,255,255,0.065), rgba(255,255,255,0.02))",
                  boxShadow: active
                    ? "0 10px 18px rgba(0,0,0,0.16)"
                    : minimized
                    ? `0 8px 18px color-mix(in srgb, ${meta.accent} 18%, rgba(0,0,0,0.14))`
                    : "0 3px 8px rgba(0,0,0,0.05)",
                  border: active
                    ? "1px solid rgba(255,255,255,0.12)"
                    : minimized
                    ? `1px solid color-mix(in srgb, ${meta.accent} 24%, rgba(255,255,255,0.1))`
                    : "1px solid rgba(255,255,255,0.04)",
                  transform: active ? "translateX(1px)" : "none"
                }}
              >
                <img
                  src={meta.icon}
                  alt={meta.label}
                  draggable={false}
                  style={{
                    width: active ? 33 : 31,
                    height: active ? 33 : 31,
                    objectFit: "contain",
                    filter: active || minimized ? "drop-shadow(0 5px 7px rgba(0,0,0,0.18))" : "none",
                    opacity: minimized ? 0.96 : 1
                  }}
                />
                {item.badgeLabel && (
                  <div
                    style={{
                      position: "absolute",
                      right: -2,
                      bottom: -3,
                      minWidth: 20,
                      height: 16,
                      padding: "0 5px",
                      borderRadius: 999,
                      background: "rgba(15,23,42,0.92)",
                      color: "#f8fafc",
                      border: "1px solid rgba(255,255,255,0.12)",
                      boxShadow: "0 6px 12px rgba(0,0,0,0.24)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 9,
                      fontWeight: 800,
                      letterSpacing: 0.45,
                      textTransform: "uppercase"
                    }}
                  >
                    {item.badgeLabel}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Icons */}
      {model.desktopIcons.map((icon) => (
        <div
          key={icon.id}
          style={{
            position: "absolute",
            left: icon.bounds.x,
            top: icon.bounds.y,
            width: icon.bounds.width,
            height: icon.bounds.height,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-start",
            gap: 4,
            zIndex: 1,
            pointerEvents: "none",
            userSelect: "none",
            paddingTop: 2
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "transparent",
              backdropFilter: "none",
              border: "none",
              boxShadow: "none"
            }}
          >
            {icon.appId ? (
              <img
                src={getAppMeta(icon.appId).icon}
                alt={icon.label}
                draggable={false}
                style={{
                  width: 32,
                  height: 32,
                  objectFit: "contain",
                  filter: "drop-shadow(0 3px 5px rgba(0,0,0,0.22))"
                }}
              />
            ) : (
              <span style={{ fontSize: 24, opacity: 0.88, filter: "drop-shadow(0 3px 5px rgba(0,0,0,0.18))" }}>
                {icon.action === "open-trash" ? "\uD83D\uDDD1" : "\uD83D\uDCC1"}
              </span>
            )}
          </div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: "#f4eff6",
              background: "transparent",
              border: "none",
              borderRadius: 0,
              padding: 0,
              boxShadow: "none",
              textAlign: "center",
              lineHeight: 1.2,
              maxWidth: icon.bounds.width,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              textShadow: "0 1px 2px rgba(0,0,0,0.68)",
              letterSpacing: -0.05
            }}
          >
            {icon.label}
          </span>
        </div>
      ))}

      {model.windows.map((window) => (
        <WindowFrame key={window.id} window={window} />
      ))}

      {model.contextMenu && <FloatingContextMenu contextMenu={model.contextMenu} viewport={model.viewport} />}

      <PopupLayer popups={model.popups} />
      <PointerLayer pointer={model.pointer} />
    </div>
  );
}
