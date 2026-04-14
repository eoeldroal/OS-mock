import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import type { Computer13Action, RenderModel } from "../../core/src/types.js";
import { DesktopSurface } from "./components/DesktopSurface";
import { fetchRenderModel, getSessionIdFromPath, postBrowserContentAction, postViewerAction } from "./render-model";

function getWsUrl(sessionId: string) {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws?sessionId=${sessionId}`;
}

function ToastOverlay({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  return (
    <div
      style={{
        position: "fixed",
        top: 16,
        right: 16,
        zIndex: 99999,
        background: "rgba(220, 38, 38, 0.92)",
        color: "#fff",
        padding: "12px 20px",
        borderRadius: 8,
        fontSize: 13,
        fontFamily: "'Ubuntu', sans-serif",
        maxWidth: 420,
        boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
        cursor: "pointer",
        lineHeight: 1.4
      }}
      onClick={onDismiss}
    >
      {message}
    </div>
  );
}

function WaitingForTaskOverlay() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99998,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none"
      }}
    >
      <div
        style={{
          background: "rgba(30, 30, 46, 0.88)",
          color: "#e2e8f0",
          padding: "32px 48px",
          borderRadius: 16,
          textAlign: "center",
          fontFamily: "'Ubuntu', sans-serif",
          boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
          maxWidth: 520
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>
          Waiting for task…
        </div>
        <div style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.6 }}>
          Run a command in the interactive CLI to load a task:
        </div>
        <div
          style={{
            marginTop: 12,
            padding: "10px 16px",
            background: "rgba(0,0,0,0.4)",
            borderRadius: 8,
            fontFamily: "'Ubuntu Mono', monospace",
            fontSize: 14,
            color: "#22d3ee"
          }}
        >
          reset rename_note_in_explorer
        </div>
        <div style={{ marginTop: 16, fontSize: 12, color: "#64748b" }}>
          The viewer will automatically update when a task is loaded.
        </div>
      </div>
    </div>
  );
}

export function DesktopApp() {
  const sessionId = useMemo(() => getSessionIdFromPath(window.location.pathname), []);
  const [model, setModel] = useState<RenderModel | null>(null);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const actionQueueRef = useRef<Promise<unknown>>(Promise.resolve());

  const dismissToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    if (!sessionId) {
      setFatalError("No session id provided in the path.");
      return;
    }

    let active = true;
    const socket = new WebSocket(getWsUrl(sessionId));

    fetchRenderModel(sessionId)
      .then((nextModel) => {
        if (active) {
          if (nextModel.sessionId && nextModel.sessionId !== sessionId) {
            setToast(`Ignored mismatched initial model for session ${nextModel.sessionId}`);
            return;
          }
          document.title = `OS Mock Viewer · ${nextModel.sessionId ?? sessionId} · ${nextModel.taskId ?? "idle"}`;
          setModel(nextModel);
        }
      })
      .catch((reason) => {
        if (active) {
          setFatalError(reason instanceof Error ? reason.message : String(reason));
        }
      });

    socket.addEventListener("message", (event) => {
      if (!active) {
        return;
      }
      try {
        const parsed = JSON.parse(event.data) as RenderModel;
        if (parsed.sessionId && parsed.sessionId !== sessionId) {
          setToast(`Ignored mismatched session update for ${parsed.sessionId}`);
          return;
        }
        document.title = `OS Mock Viewer · ${parsed.sessionId ?? sessionId} · ${parsed.taskId ?? "idle"}`;
        setModel(parsed);
        // Clear any toast when a successful model update arrives
        setToast(null);
      } catch {
        // ignore malformed WS messages
      }
    });

    socket.addEventListener("error", () => {
      if (active) {
        setFatalError("Viewer websocket failed.");
      }
    });

    return () => {
      active = false;
      socket.close();
    };
  }, [sessionId]);

  if (fatalError) {
    return (
      <div style={{ color: "#f8fafc", padding: 24 }}>
        <h1>OS Mock Viewer</h1>
        <p>{fatalError}</p>
      </div>
    );
  }

  if (!model) {
    return <div style={{ color: "#f8fafc", padding: 24 }}>Loading session viewer…</div>;
  }

  const hasTask = model.taskLoaded;

  const handleAction = (action: Computer13Action) => {
    if (!sessionId) {
      return Promise.resolve();
    }

    if (!hasTask) {
      setToast("No task loaded yet. Run 'reset <taskId>' in the CLI first.");
      return Promise.resolve();
    }

    actionQueueRef.current = actionQueueRef.current
      .catch(() => undefined)
      .then(() => postViewerAction(sessionId, action))
      .then((result) => {
        // If server returned a no_task error (200 but with error field)
        if (result && typeof result === "object" && "error" in result) {
          setToast((result as { message?: string }).message ?? "Action rejected by server");
        }
      })
      .catch((reason) => {
        // Network / HTTP error — show as toast, don't crash
        const msg = reason instanceof Error ? reason.message : String(reason);
        setToast(msg);
      });

    return actionQueueRef.current;
  };

  const handleBrowserContentAction = (
    windowId: string,
    input:
      | { kind: "click" | "double_click"; x: number; y: number }
      | { kind: "scroll"; x: number; y: number; dx: number; dy: number }
  ) => {
    if (!sessionId) {
      return Promise.resolve();
    }

    if (!hasTask) {
      setToast("No task loaded yet. Run 'reset <taskId>' in the CLI first.");
      return Promise.resolve();
    }

    actionQueueRef.current = actionQueueRef.current
      .catch(() => undefined)
      .then(() => postBrowserContentAction(sessionId, windowId, input))
      .catch((reason) => {
        const msg = reason instanceof Error ? reason.message : String(reason);
        setToast(msg);
      });

    return actionQueueRef.current;
  };

  return (
    <>
      <DesktopSurface model={model} onAction={handleAction} onBrowserContentAction={handleBrowserContentAction} />
      {toast && <ToastOverlay message={toast} onDismiss={dismissToast} />}
    </>
  );
}
