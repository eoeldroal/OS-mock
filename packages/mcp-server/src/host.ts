import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { existsSync } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { WebSocketServer, type WebSocket } from "ws";
import type { IncomingMessage } from "node:http";
import { MockOsEnv } from "../../core/src/index.js";
import type { Computer13Action, StepResult, Viewport } from "../../core/src/types.js";
import type { TaskSplit } from "../../core/src/tasks/registry.js";
import { ScreenshotService } from "./screenshot.js";

type SessionRecord = {
  id: string;
  env: MockOsEnv;
  viewerUrl: string;
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "../../..");
const webDistDir = resolve(rootDir, "packages/web/dist");
const webAssetsDir = resolve(webDistDir, "assets");

export class HostApp {
  private readonly fastify = Fastify({ logger: false });
  private readonly screenshotService = new ScreenshotService(rootDir);
  private readonly sessions = new Map<string, SessionRecord>();
  private readonly subscribers = new Map<string, Set<WebSocket>>();
  private readonly wss = new WebSocketServer({ noServer: true });
  private nextSessionId = 1;
  private started = false;
  readonly baseUrl = "http://127.0.0.1:4315";

  async start() {
    if (this.started) {
      return;
    }

    await mkdir(resolve(rootDir, "tmp", "os-mock"), { recursive: true });

    if (existsSync(webAssetsDir)) {
      await this.fastify.register(fastifyStatic, {
        root: webAssetsDir,
        prefix: "/assets/"
      });
    }

    this.fastify.get("/healthz", async () => ({ ok: true }));

     this.fastify.get("/api/sessions/:sessionId/render-model", async (request, reply) => {
       const sessionId = (request.params as { sessionId: string }).sessionId;
       const session = this.getSession(sessionId);
       return reply.send(session.env.getRenderModel());
     });

    this.fastify.post("/api/sessions/:sessionId/viewer-action", async (request, reply) => {
      const sessionId = (request.params as { sessionId: string }).sessionId;
      const action = (request.body as { action?: Computer13Action } | undefined)?.action;
      if (!action) {
        return reply.code(400).send({ error: "Missing action payload." });
      }
      return reply.send(this.viewerAction(sessionId, action));
    });

    this.fastify.get("/session/:sessionId", async (_, reply) => {
      if (existsSync(join(webDistDir, "index.html"))) {
        return reply.type("text/html").send(await readFile(join(webDistDir, "index.html"), "utf8"));
      }
      return reply
        .type("text/html")
        .send("<html><body><h1>OS Mock Viewer</h1><p>Run npm run build:web first.</p></body></html>");
    });

    this.fastify.server.on("upgrade", (request, socket, head) => {
      if (!request.url?.startsWith("/ws")) {
        socket.destroy();
        return;
      }
      this.wss.handleUpgrade(request, socket, head, (ws) => {
        this.wss.emit("connection", ws, request);
      });
    });

    this.wss.on("connection", (ws: WebSocket, request: IncomingMessage) => {
      const url = new URL(request.url ?? "/ws", this.baseUrl);
      const sessionId = url.searchParams.get("sessionId");
      if (!sessionId || !this.sessions.has(sessionId)) {
        ws.close();
        return;
      }
      let subscribers = this.subscribers.get(sessionId);
      if (!subscribers) {
        subscribers = new Set<WebSocket>();
        this.subscribers.set(sessionId, subscribers);
      }
      subscribers.add(ws);
      ws.send(JSON.stringify(this.sessions.get(sessionId)!.env.getRenderModel()));
      ws.on("close", () => {
        subscribers?.delete(ws);
      });
    });

    await this.fastify.listen({ host: "127.0.0.1", port: 4315 });
    this.started = true;
  }

  async stop() {
    await this.screenshotService.close();
    if (this.started) {
      await this.fastify.close();
      this.started = false;
    }
  }

  createSession(opts?: { seed?: number; viewport?: Viewport; viewer?: boolean }) {
    const sessionId = `s${this.nextSessionId++}`;
    const env = new MockOsEnv(opts?.viewport);
    const viewerUrl = `${this.baseUrl}/session/${sessionId}`;
    this.sessions.set(sessionId, {
      id: sessionId,
      env,
      viewerUrl
    });
    return {
      sessionId,
      viewerUrl
    };
  }

  listTasks(split: TaskSplit = "all") {
    return new MockOsEnv().listTasks(split);
  }

  closeSession(sessionId: string) {
    this.sessions.delete(sessionId);
    this.subscribers.get(sessionId)?.forEach((socket) => socket.close());
    this.subscribers.delete(sessionId);
    return { sessionId, closed: true };
  }

  getHiddenState(sessionId: string) {
    return this.getSession(sessionId).env.getHiddenState();
  }

  listActionSpace(sessionId?: string) {
    if (sessionId && this.sessions.has(sessionId)) {
      return this.sessions.get(sessionId)!.env.getActionSpace();
    }
    return new MockOsEnv().getActionSpace();
  }

  sampleTask(sessionId: string, seed?: number, split: TaskSplit = "all") {
    const task = this.getSession(sessionId).env.sampleTask(seed, split);
    return {
      id: task.id,
      instruction: task.instruction,
      maxSteps: task.maxSteps,
      seedDefaults: task.seedDefaults,
      domain: task.domain,
      split: task.split
    };
  }

  async reset(sessionId: string, taskId: string, seed: number) {
    const session = this.getSession(sessionId);
    const result = session.env.reset({ taskId, seed });
    const decorated = await this.decorateResult(session, result);
    this.broadcast(sessionId);
    return decorated;
  }

  async observe(sessionId: string) {
    const session = this.getSession(sessionId);
    const result = session.env.observe();
    return this.decorateResult(session, result);
  }

  async step(sessionId: string, action: Computer13Action) {
    const session = this.getSession(sessionId);
    const result = session.env.step(action);
    const decorated = await this.decorateResult(session, result);
    this.broadcast(sessionId);
    return decorated;
  }

  async applyPerturbation(sessionId: string, op: string, params?: Record<string, unknown>) {
    const session = this.getSession(sessionId);
    const result = session.env.applyPerturbation(op, params);
    const decorated = await this.decorateResult(session, result);
    this.broadcast(sessionId);
    return decorated;
  }

  snapshot(sessionId: string, name?: string) {
    const session = this.getSession(sessionId);
    const snapshotId = session.env.snapshot(name);
    return { sessionId, snapshotId };
  }

  async restoreSnapshot(sessionId: string, snapshotId: string) {
    const session = this.getSession(sessionId);
    const result = session.env.restore(snapshotId);
    const decorated = await this.decorateResult(session, result);
    this.broadcast(sessionId);
    return decorated;
  }

  viewerAction(sessionId: string, action: Computer13Action) {
    const session = this.getSession(sessionId);
    const result = session.env.step(action);
    this.broadcast(sessionId);
    return result;
  }

  private getSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Unknown session: ${sessionId}`);
    }
    return session;
  }

  private broadcast(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }
    const payload = JSON.stringify(session.env.getRenderModel());
    this.subscribers.get(sessionId)?.forEach((socket) => {
      if (socket.readyState === 1) {
        socket.send(payload);
      }
    });
  }

  private async decorateResult(session: SessionRecord, result: StepResult) {
    const screenshotPath = await this.screenshotService.capture(
      session.id,
      result.stepIndex,
      session.viewerUrl
    );
    result.observation.screenshotPath = screenshotPath;
    result.observation.viewerUrl = session.viewerUrl;
    return result;
  }
}
