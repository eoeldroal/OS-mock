import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { HostApp } from "../host.js";
import type { Computer13Action } from "../../../core/src/types.js";

const ActionSchema = z.object({
  type: z.enum([
    "MOVE_TO",
    "CLICK",
    "MOUSE_DOWN",
    "MOUSE_UP",
    "RIGHT_CLICK",
    "DOUBLE_CLICK",
    "DRAG_TO",
    "SCROLL",
    "TYPING",
    "PRESS",
    "KEY_DOWN",
    "KEY_UP",
    "HOTKEY",
    "WAIT",
    "FAIL",
    "DONE"
  ]),
  button: z.enum(["left", "middle", "right"]).optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  dx: z.number().optional(),
  dy: z.number().optional(),
  text: z.string().optional(),
  key: z.string().optional(),
  keys: z.array(z.string()).optional(),
  numClicks: z.number().optional()
});

function jsonResponse(payload: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(payload, null, 2)
      }
    ]
  };
}

export function registerComputer13Tools(server: McpServer, host: HostApp) {
  server.registerTool(
    "computer13.observe",
    {
      description: "Observe the current state of a Computer-13 session.",
      inputSchema: {
        sessionId: z.string()
      }
    },
    async ({ sessionId }) => jsonResponse(await host.observe(sessionId))
  );

  server.registerTool(
    "computer13.step",
    {
      description: "Apply one Computer-13 action to a session and return the new observation.",
      inputSchema: {
        sessionId: z.string(),
        action: ActionSchema
      }
    },
    async ({ sessionId, action }) =>
      jsonResponse(await host.step(sessionId, action as unknown as Computer13Action))
  );

  server.registerTool(
    "computer13.list_action_space",
    {
      description: "List the Computer-13 action space and supported key names.",
      inputSchema: {
        sessionId: z.string().optional()
      }
    },
    async ({ sessionId }) => jsonResponse(host.listActionSpace(sessionId))
  );
}
