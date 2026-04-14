import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { HostApp } from "../host.js";
import type { Computer13Action } from "../../../core/src/types.js";
import type { SolverSerializedResult } from "./solver-response.js";

type SolverContext = {
  host: HostApp;
  sessionId: string;
};

function toToolResult(result: SolverSerializedResult) {
  return {
    content: result.content
  };
}

async function runAction(context: SolverContext, action: Computer13Action) {
  return context.host.stepSolver(context.sessionId, action);
}

export function registerSolverTools(server: McpServer, context: SolverContext) {
  server.registerTool(
    "observe",
    {
      description: "Observe the bound solver session.",
      inputSchema: {}
    },
    async () => toToolResult(await context.host.observeSolver(context.sessionId))
  );

  server.registerTool(
    "click",
    {
      description: "Left click at screen coordinates.",
      inputSchema: {
        x: z.number(),
        y: z.number()
      }
    },
    async ({ x, y }) =>
      toToolResult(await runAction(context, { type: "CLICK", x, y }))
  );

  server.registerTool(
    "double_click",
    {
      description: "Double click at screen coordinates.",
      inputSchema: {
        x: z.number(),
        y: z.number()
      }
    },
    async ({ x, y }) =>
      toToolResult(await runAction(context, { type: "DOUBLE_CLICK", x, y }))
  );

  server.registerTool(
    "right_click",
    {
      description: "Right click at screen coordinates.",
      inputSchema: {
        x: z.number(),
        y: z.number()
      }
    },
    async ({ x, y }) =>
      toToolResult(await runAction(context, { type: "RIGHT_CLICK", x, y }))
  );

  server.registerTool(
    "drag",
    {
      description:
        "Perform one atomic drag from a start point to an end point in the bound solver session.",
      inputSchema: {
        x1: z.number(),
        y1: z.number(),
        x2: z.number(),
        y2: z.number()
      }
    },
    async ({ x1, y1, x2, y2 }) =>
      toToolResult(await runAction(context, { type: "DRAG", x1, y1, x2, y2 }))
  );

  server.registerTool(
    "scroll",
    {
      description: "Scroll by deltas in the bound solver session.",
      inputSchema: {
        dx: z.number(),
        dy: z.number()
      }
    },
    async ({ dx, dy }) =>
      toToolResult(await runAction(context, { type: "SCROLL", dx, dy }))
  );

  server.registerTool(
    "type",
    {
      description: "Type text into the currently focused input target.",
      inputSchema: {
        text: z.string()
      }
    },
    async ({ text }) =>
      toToolResult(await runAction(context, { type: "TYPING", text }))
  );

  server.registerTool(
    "press",
    {
      description: "Press a single key.",
      inputSchema: {
        key: z.string()
      }
    },
    async ({ key }) =>
      toToolResult(await runAction(context, { type: "PRESS", key }))
  );

  server.registerTool(
    "hotkey",
    {
      description: "Press a key chord such as Ctrl+S.",
      inputSchema: {
        keys: z.array(z.string()).min(1)
      }
    },
    async ({ keys }) =>
      toToolResult(await runAction(context, { type: "HOTKEY", keys }))
  );

  server.registerTool(
    "wait",
    {
      description: "Advance the environment by one wait step.",
      inputSchema: {}
    },
    async () => toToolResult(await runAction(context, { type: "WAIT" }))
  );

  server.registerTool(
    "done",
    {
      description: "Declare task completion.",
      inputSchema: {}
    },
    async () => toToolResult(await runAction(context, { type: "DONE" }))
  );

  server.registerTool(
    "fail",
    {
      description: "Declare that the task cannot be completed from the current situation.",
      inputSchema: {
        reason: z.string().optional()
      }
    },
    async ({ reason }) => {
      const result = await runAction(context, { type: "FAIL" });
      if (!reason) {
        return toToolResult(result);
      }
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                ...result.payload,
                reportedFailureReason: reason
              },
              null,
              2
            )
          },
          ...result.content.filter((entry) => entry.type === "image")
        ]
      };
    }
  );
}
