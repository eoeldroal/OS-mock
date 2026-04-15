import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import type { BrowserContentInput, Computer13Action, RenderModel } from "../../core/src/types.js";
import { DesktopSurface } from "./components/DesktopSurface";
import { fetchRenderModel, getSessionIdFromPath, postBrowserContentAction, postViewerAction } from "./render-model";

type ToastTone = "error" | "warning" | "success" | "info";

type ToastState = {
  tone: ToastTone;
  message: string;
};

function getWsUrl(sessionId: string) {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws?sessionId=${sessionId}`;
}

function ToastOverlay({ tone, message, onDismiss }: ToastState & { onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, tone === "success" ? 4200 : 6500);
    return () => clearTimeout(timer);
  }, [message, onDismiss, tone]);

  const background =
    tone === "success"
      ? "rgba(22, 163, 74, 0.94)"
      : tone === "warning"
        ? "rgba(217, 119, 6, 0.94)"
        : tone === "info"
          ? "rgba(37, 99, 235, 0.94)"
          : "rgba(220, 38, 38, 0.92)";

  return (
    <div
      style={{
        position: "fixed",
        top: 16,
        right: 16,
        zIndex: 99999,
        background,
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
  const overlayRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    overlayRef.current?.focus();
  }, []);

  return (
    <div
      ref={overlayRef}
      tabIndex={0}
      onClick={(event) => event.preventDefault()}
      onMouseDown={(event) => event.preventDefault()}
      onKeyDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99998,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "auto",
        background: "rgba(9, 12, 20, 0.24)",
        backdropFilter: "blur(5px)",
        outline: "none"
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

function describeStepResult(result: {
  actionAccepted?: boolean;
  reward?: number;
  cumulativeReward?: number;
  terminated?: boolean;
  truncated?: boolean;
  info?: { actionSummary?: string; lastViolations?: string[] };
}) {
  if (result.truncated) {
    return {
      tone: "warning" as const,
      message: "Task reached its step limit. Inspect the visible windows and note state before retrying."
    };
  }

  if (result.terminated) {
    if ((result.cumulativeReward ?? 0) > 0) {
      return {
        tone: "success" as const,
        message: "Task completed. Review the saved note and visible output before moving on."
      };
    }

    if (result.info?.actionSummary === "terminal_task_failed") {
      return {
        tone: "error" as const,
        message: "This run was marked as failed. Check the terminal output and note contents to see where it broke."
      };
    }

    return {
      tone: "warning" as const,
      message:
        "Task ended without reaching the expected result. Check the current output, note contents, and any visible warnings."
    };
  }

  if (result.actionAccepted === false) {
    return {
      tone: "warning" as const,
      message: "Action was rejected. The current UI state may be blocking that interaction."
    };
  }

  return null;
}

export function DesktopApp() {
  const sessionId = useMemo(() => getSessionIdFromPath(window.location.pathname), []);
  const [model, setModel] = useState<RenderModel | null>(null);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
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
            setToast({
              tone: "warning",
              message: `Ignored mismatched initial model for session ${nextModel.sessionId}`
            });
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
          setToast({
            tone: "warning",
            message: `Ignored mismatched session update for ${parsed.sessionId}`
          });
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
      setToast({
        tone: "warning",
        message: "No task loaded yet. Run 'reset <taskId>' in the CLI first."
      });
      return Promise.resolve();
    }

    actionQueueRef.current = actionQueueRef.current
      .catch(() => undefined)
      .then(() => postViewerAction(sessionId, action))
      .then((result) => {
        // If server returned a no_task error (200 but with error field)
        if (result && typeof result === "object" && "error" in result) {
          setToast({
            tone: "error",
            message: (result as { message?: string }).message ?? "Action rejected by server"
          });
          return;
        }

        const described = describeStepResult(
          result as {
            actionAccepted?: boolean;
            reward?: number;
            cumulativeReward?: number;
            terminated?: boolean;
            truncated?: boolean;
            info?: { actionSummary?: string; lastViolations?: string[] };
          }
        );
        if (described) {
          setToast(described);
        }
      })
      .catch((reason) => {
        // Network / HTTP error — show as toast, don't crash
        const msg = reason instanceof Error ? reason.message : String(reason);
        setToast({ tone: "error", message: msg });
      });

    return actionQueueRef.current;
  };

  const handleBrowserContentAction = (
    windowId: string,
    input: BrowserContentInput
  ) => {
    if (!sessionId) {
      return Promise.resolve();
    }

    if (!hasTask) {
      setToast({
        tone: "warning",
        message: "No task loaded yet. Run 'reset <taskId>' in the CLI first."
      });
      return Promise.resolve();
    }

    actionQueueRef.current = actionQueueRef.current
      .catch(() => undefined)
      .then(() => postBrowserContentAction(sessionId, windowId, input))
      .then((result) => {
        const described = describeStepResult(
          result as {
            actionAccepted?: boolean;
            reward?: number;
            cumulativeReward?: number;
            terminated?: boolean;
            truncated?: boolean;
            info?: { actionSummary?: string; lastViolations?: string[] };
          }
        );
        if (described) {
          setToast(described);
        }
      })
      .catch((reason) => {
        const msg = reason instanceof Error ? reason.message : String(reason);
        setToast({ tone: "error", message: msg });
      });

    return actionQueueRef.current;
  };

  return (
    <>
      <DesktopSurface
        model={model}
        onAction={hasTask ? handleAction : undefined}
        onBrowserContentAction={hasTask ? handleBrowserContentAction : undefined}
      />
      {!hasTask && <WaitingForTaskOverlay />}
      {toast && <ToastOverlay tone={toast.tone} message={toast.message} onDismiss={dismissToast} />}
    </>
  );
}
