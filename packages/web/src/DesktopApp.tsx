import { useEffect, useMemo, useRef, useState } from "react";
import type { Computer13Action, RenderModel } from "../../core/src/types.js";
import { DesktopSurface } from "./components/DesktopSurface";
import { fetchRenderModel, getSessionIdFromPath, postViewerAction } from "./render-model";

function getWsUrl(sessionId: string) {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws?sessionId=${sessionId}`;
}

export function DesktopApp() {
  const sessionId = useMemo(() => getSessionIdFromPath(window.location.pathname), []);
  const [model, setModel] = useState<RenderModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const actionQueueRef = useRef<Promise<unknown>>(Promise.resolve());

  useEffect(() => {
    if (!sessionId) {
      setError("No session id provided in the path.");
      return;
    }

    let active = true;
    const socket = new WebSocket(getWsUrl(sessionId));

    fetchRenderModel(sessionId)
      .then((nextModel) => {
        if (active) {
          setModel(nextModel);
        }
      })
      .catch((reason) => {
        if (active) {
          setError(reason instanceof Error ? reason.message : String(reason));
        }
      });

    socket.addEventListener("message", (event) => {
      if (!active) {
        return;
      }
      setModel(JSON.parse(event.data));
    });

    socket.addEventListener("error", () => {
      if (active) {
        setError("Viewer websocket failed.");
      }
    });

    return () => {
      active = false;
      socket.close();
    };
  }, [sessionId]);

  if (error) {
    return (
      <div style={{ color: "#f8fafc", padding: 24 }}>
        <h1>OS Mock Viewer</h1>
        <p>{error}</p>
      </div>
    );
  }

  if (!model) {
    return <div style={{ color: "#f8fafc", padding: 24 }}>Loading session viewer…</div>;
  }

  const handleAction = (action: Computer13Action) => {
    if (!sessionId) {
      return Promise.resolve();
    }

    actionQueueRef.current = actionQueueRef.current
      .catch(() => undefined)
      .then(() => postViewerAction(sessionId, action))
      .catch((reason) => {
        setError(reason instanceof Error ? reason.message : String(reason));
      });

    return actionQueueRef.current;
  };

  return <DesktopSurface model={model} onAction={handleAction} />;
}
