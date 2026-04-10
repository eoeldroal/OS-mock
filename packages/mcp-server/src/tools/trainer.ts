import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { HostApp } from "../host.js";

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

export function registerTrainerTools(server: McpServer, host: HostApp) {
  server.registerTool(
    "trainer.create_session", //훈련을 시작할 빈 방을 하나 파달라
    {
      description: "Create a new OS mock session.",
      inputSchema: {
        seed: z.number().optional(),
        viewport: z
          .object({
            width: z.number(),
            height: z.number()
          })
          .optional(),
        viewer: z.boolean().optional()
      }
    },
    async ({ seed, viewport, viewer }) =>
      jsonResponse(host.createSession({ seed, viewport, viewer }))
  );

  server.registerTool(
    "trainer.list_tasks",
    {
      description: "List tasks available in the OS mock environment.",
      inputSchema: {
        split: z.enum(["all", "starter", "representative", "train", "eval"]).optional()
      }
    },
    async ({ split }) => jsonResponse(host.listTasks(split))
  );

  server.registerTool(
    "trainer.reset",
    {
      description: "Reset a session to a deterministic task and seed.",
      inputSchema: {
        sessionId: z.string(),
        taskId: z.string(),
        seed: z.number()
      }
    },
    async ({ sessionId, taskId, seed }) => jsonResponse(await host.reset(sessionId, taskId, seed))
  );

  server.registerTool(
    "trainer.sample_task",
    {
      description: "Sample one task for a session.",
      inputSchema: {
        sessionId: z.string(),
        split: z.enum(["all", "starter", "representative", "train", "eval"]).optional(),
        seed: z.number().optional()
      }
    },
    async ({ sessionId, seed, split }) => jsonResponse(host.sampleTask(sessionId, seed, split))
  );

  server.registerTool(
    "trainer.apply_perturbation",
    {
      description: "Apply a named perturbation operator to a session.",
      inputSchema: {
        sessionId: z.string(),
        op: z.string(),
        params: z.record(z.any()).optional()
      }
    },
    async ({ sessionId, op, params }) =>
      jsonResponse(await host.applyPerturbation(sessionId, op, params))
  );

  server.registerTool(
    "trainer.snapshot",
    {
      description: "Save a snapshot of the current session state.",
      inputSchema: {
        sessionId: z.string(),
        name: z.string().optional()
      }
    },
    async ({ sessionId, name }) => jsonResponse(host.snapshot(sessionId, name))
  );

  server.registerTool(
    "trainer.restore_snapshot",
    {
      description: "Restore a previously created snapshot.",
      inputSchema: {
        sessionId: z.string(),
        snapshotId: z.string()
      }
    },
    async ({ sessionId, snapshotId }) =>
      jsonResponse(await host.restoreSnapshot(sessionId, snapshotId))
  );

  server.registerTool(
    "trainer.get_hidden_state",
    {
      description: "Return hidden simulator state for debugging or trainer inspection.",
      inputSchema: {
        sessionId: z.string()
      }
    },
    async ({ sessionId }) => jsonResponse(host.getHiddenState(sessionId))
  );

  server.registerTool(
    "trainer.close_session",
    {
      description: "Close an existing OS mock session.",
      inputSchema: {
        sessionId: z.string()
      }
    },
    async ({ sessionId }) => jsonResponse(host.closeSession(sessionId))
  );
}
