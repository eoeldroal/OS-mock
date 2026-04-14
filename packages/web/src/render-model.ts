import type { Computer13Action, RenderModel } from "../../core/src/types.js";

export function getSessionIdFromPath(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  return parts[0] === "session" ? parts[1] : undefined;
}

export async function fetchRenderModel(sessionId: string): Promise<RenderModel> {
  const response = await fetch(`/api/sessions/${sessionId}/render-model`);
  if (!response.ok) {
    throw new Error(`Failed to load session ${sessionId}`);
  }
  return response.json();
}

export async function postViewerAction(sessionId: string, action: Computer13Action) {
  const response = await fetch(`/api/sessions/${sessionId}/viewer-action`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({ action })
  });

  if (!response.ok) {
    throw new Error(`Failed to apply viewer action for session ${sessionId}`);
  }

  return response.json();
}

export async function postBrowserContentAction(
  sessionId: string,
  windowId: string,
  input:
    | { kind: "click" | "double_click"; x: number; y: number }
    | { kind: "scroll"; x: number; y: number; dx: number; dy: number }
) {
  const response = await fetch(`/api/sessions/${sessionId}/browser/${windowId}/input`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    throw new Error(`Failed to apply browser input for session ${sessionId} window ${windowId}`);
  }

  return response.json();
}
