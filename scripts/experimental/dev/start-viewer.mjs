/**
 * Quick-start script: launches HostApp, creates a session,
 * resets a specified task, and prints the viewer URL.
 *
 * Usage:  node scripts/experimental/dev/start-viewer.mjs [taskId] [seed]
 * Defaults: taskId = dismiss_popup_then_append_note, seed = 0
 */
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { existsSync, appendFileSync, mkdirSync } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";
import { MockOsEnv } from "../../../packages/core/dist/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "../../..");
const webDistDir = resolve(rootDir, "packages/web/dist");
const webAssetsDir = resolve(webDistDir, "assets");
const PORT = 4315;

// ─── Inline mini-host ─────────────────────────────────────────────────────────
const fastify = Fastify({ logger: false });
const sessions = new Map();
const subscribers = new Map();
const wss = new WebSocketServer({ noServer: true });
let nextId = 1;

// Viewer log
const logsDir = resolve(rootDir, "logs");
mkdirSync(logsDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const logPath = join(logsDir, `viewer-${stamp}.jsonl`);
let logSeq = 0;
const logStartMs = Date.now();
function logEvent(entry) {
  appendFileSync(logPath, JSON.stringify({ seq: logSeq++, ts: new Date().toISOString(), elapsed_ms: Date.now() - logStartMs, ...entry }) + "\n");
}

// Static assets
if (existsSync(webAssetsDir)) {
  await fastify.register(fastifyStatic, { root: webAssetsDir, prefix: "/assets/" });
}

fastify.get("/healthz", async () => ({ ok: true }));

fastify.get("/api/sessions/:sid/render-model", async (req, reply) => {
  const s = sessions.get(req.params.sid);
  if (!s) return reply.code(404).send({ error: "no session" });
  return reply.send(s.env.getRenderModel());
});

fastify.post("/api/sessions/:sid/viewer-action", async (req, reply) => {
  const s = sessions.get(req.params.sid);
  if (!s) return reply.code(404).send({ error: "no session" });
  const action = req.body?.action;
  if (!action) return reply.code(400).send({ error: "missing action" });
  if (!s.env.getTask()) {
    logEvent({ source: "viewer", sessionId: req.params.sid, event: "rejected", action, reason: "no_task" });
    return reply.send({ error: "no_task", message: "No task loaded." });
  }
  const result = s.env.step(action);
  logEvent({ source: "viewer", sessionId: req.params.sid, event: "step", action, stepIndex: result.stepIndex, actionAccepted: result.actionAccepted, actionSummary: result.info?.actionSummary });
  broadcast(req.params.sid);
  return reply.send(result);
});

fastify.get("/session/:sid", async (_, reply) => {
  if (existsSync(join(webDistDir, "index.html"))) {
    return reply.type("text/html").send(await readFile(join(webDistDir, "index.html"), "utf8"));
  }
  return reply.type("text/html").send("<h1>Build web first</h1>");
});

fastify.server.on("upgrade", (request, socket, head) => {
  if (!request.url?.startsWith("/ws")) { socket.destroy(); return; }
  wss.handleUpgrade(request, socket, head, ws => wss.emit("connection", ws, request));
});

wss.on("connection", (ws, request) => {
  const url = new URL(request.url ?? "/ws", `http://127.0.0.1:${PORT}`);
  const sid = url.searchParams.get("sessionId");
  if (!sid || !sessions.has(sid)) { ws.close(); return; }
  if (!subscribers.has(sid)) subscribers.set(sid, new Set());
  subscribers.get(sid).add(ws);
  ws.send(JSON.stringify(sessions.get(sid).env.getRenderModel()));
  ws.on("close", () => subscribers.get(sid)?.delete(ws));
});

function broadcast(sid) {
  const s = sessions.get(sid);
  if (!s) return;
  const payload = JSON.stringify(s.env.getRenderModel());
  subscribers.get(sid)?.forEach(ws => { if (ws.readyState === 1) ws.send(payload); });
}

await fastify.listen({ host: "127.0.0.1", port: PORT });
console.log(`Server running at http://127.0.0.1:${PORT}`);

// ─── Create session + reset task ──────────────────────────────────────────────
const taskId = process.argv[2] || "dismiss_popup_then_append_note";
const seed = parseInt(process.argv[3] || "0", 10);

const sid = `s${nextId++}`;
const env = new MockOsEnv();
sessions.set(sid, { id: sid, env });

const tasks = env.listTasks("all");
console.log(`\nAvailable tasks (${tasks.length}):`);
for (const t of tasks) {
  console.log(`  ${t.id}`);
}

env.reset({ taskId, seed });
logEvent({ source: "cli", sessionId: sid, event: "reset", taskId, seed });
broadcast(sid);

const viewerUrl = `http://127.0.0.1:${PORT}/session/${sid}`;
console.log(`\n>>> Task: ${taskId} (seed=${seed})`);
console.log(`>>> Viewer: ${viewerUrl}`);
console.log(`>>> Log: ${logPath}`);
console.log(`\nTo switch task, restart with: node scripts/experimental/dev/start-viewer.mjs <taskId> [seed]`);
console.log("Press Ctrl+C to stop.\n");

process.stdin.resume();
