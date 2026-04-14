/**
 * Standalone replay server using built dist files.
 * Starts HostApp, creates a session, resets to task, keeps server running.
 */
import { MockOsEnv } from "../../packages/core/dist/index.js";
import Fastify from "fastify";
import { WebSocketServer } from "ws";
import { readFileSync } from "fs";

const PORT = 4315;
const TASK_ID = process.argv[2] || "dismiss_popup_then_append_note";
const SEED = parseInt(process.argv[3] || "0", 10);

// ── Create env ──
const env = new MockOsEnv({ width: 1280, height: 800 });
const resetResult = env.reset({ taskId: TASK_ID, seed: SEED, maxSteps: 0 });
console.log(`Task: ${TASK_ID}, Seed: ${SEED}, maxSteps: unlimited`);
console.log(`Initial windows: ${resetResult.observation.a11yTree?.children?.length || 0}`);

// ── HTTP server ──
const fastify = Fastify({ logger: false });

fastify.get("/healthz", async () => ({ ok: true }));

fastify.get("/api/sessions/s1/render-model", async () => {
  return env.getRenderModel();
});

fastify.post("/api/sessions/s1/viewer-action", async (request) => {
  const action = request.body?.action;
  if (!action) return { error: "Missing action" };
  const result = env.step(action);
  return result;
});

fastify.post("/api/sessions/s1/batch-actions", async (request) => {
  const actions = request.body?.actions || [];
  const results = [];
  for (const action of actions) {
    const result = env.step(action);
    results.push({
      stepIndex: result.stepIndex,
      actionAccepted: result.actionAccepted,
      actionSummary: result.info.actionSummary,
      reward: result.reward,
      cumulativeReward: result.cumulativeReward,
      terminated: result.terminated,
      truncated: result.truncated
    });
  }
  return {
    count: results.length,
    finalStep: results[results.length - 1]?.stepIndex,
    issues: results.filter((r, i) => !r.actionAccepted).map((r, i) => ({
      stepIndex: r.stepIndex,
      summary: r.actionSummary
    })),
    results
  };
});

fastify.get("/api/sessions/s1/state-summary", async () => {
  const model = env.getRenderModel();
  const hidden = env.getHiddenState();
  return {
    stepIndex: hidden.stepIndex,
    cumulativeReward: hidden.cumulativeReward,
    terminated: hidden.terminated,
    truncated: hidden.truncated,
    windowCount: model.windows?.length || 0,
    windows: model.windows?.map(w => ({
      id: w.id,
      appId: w.appId,
      title: w.title,
      focused: w.focused,
      minimized: w.minimized,
      bounds: w.bounds
    })),
    popupCount: model.popups?.length || 0,
    contextMenu: model.contextMenu ? "open" : null,
    desktopIcons: model.desktopIcons?.length || 0
  };
});

// Serve viewer HTML
fastify.get("/session/s1", async (_, reply) => {
  try {
    const html = readFileSync("packages/web/dist/index.html", "utf8");
    return reply.type("text/html").send(html);
  } catch {
    return reply.type("text/html").send("<h1>Build web first: npm run build:web</h1>");
  }
});

// Static assets
import fastifyStatic from "@fastify/static";
import { resolve } from "path";
const webAssetsDir = resolve("packages/web/dist/assets");
try {
  await fastify.register(fastifyStatic, { root: webAssetsDir, prefix: "/assets/" });
} catch {}

// WebSocket for viewer live updates
const wss = new WebSocketServer({ noServer: true });
const subscribers = new Set();

fastify.server.on("upgrade", (request, socket, head) => {
  if (!request.url?.startsWith("/ws")) { socket.destroy(); return; }
  wss.handleUpgrade(request, socket, head, (ws) => {
    subscribers.add(ws);
    ws.send(JSON.stringify(env.getRenderModel()));
    ws.on("close", () => subscribers.delete(ws));
  });
});

function broadcast() {
  const payload = JSON.stringify(env.getRenderModel());
  for (const ws of subscribers) {
    if (ws.readyState === 1) ws.send(payload);
  }
}

// Patch: broadcast after each viewer-action
const origStep = env.step.bind(env);
env.step = function(action) {
  const result = origStep(action);
  setTimeout(broadcast, 0);
  return result;
};

await fastify.listen({ host: "127.0.0.1", port: PORT });
console.log(`\nServer ready at http://127.0.0.1:${PORT}`);
console.log(`Viewer: http://127.0.0.1:${PORT}/session/s1`);
console.log(`\nEndpoints:`);
console.log(`  GET  /api/sessions/s1/render-model`);
console.log(`  GET  /api/sessions/s1/state-summary`);
console.log(`  POST /api/sessions/s1/viewer-action   { action: {...} }`);
console.log(`  POST /api/sessions/s1/batch-actions    { actions: [...] }`);

process.on("SIGINT", async () => {
  await fastify.close();
  process.exit(0);
});
