import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { existsSync, appendFileSync, mkdirSync } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { WebSocketServer, type WebSocket } from "ws";
import type { IncomingMessage } from "node:http";
import { MockOsEnv } from "../../core/src/index.js";
import {
  createBrowserContentReplacementAugmentation,
  withBrowserAugmentations
} from "../../core/src/observation/index.js";
import type {
  BrowserLiteViewModel,
  BrowserObservationAugmentation,
  Computer13Action,
  Observation,
  RenderModel,
  StepResult,
  Viewport
} from "../../core/src/types.js";
import type { TaskSplit } from "../../core/src/tasks/registry.js";
import { ScreenshotService } from "./screenshot.js";
import { HybridBrowserManager } from "./browser-runtime/hybrid-browser-manager.js";
import {
  serializeSolverResult,
  type SolverSerializedResult
} from "./tools/solver-response.js";

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
  private readonly hybridBrowserManager = new HybridBrowserManager();
  private readonly sessions = new Map<string, SessionRecord>();
  private readonly subscribers = new Map<string, Set<WebSocket>>();
  private readonly wss = new WebSocketServer({ noServer: true });
  private nextSessionId = 1;
  private started = false;
  private readonly port = Number(process.env.OS_MOCK_PORT ?? "4315");
  readonly baseUrl = `http://127.0.0.1:${this.port}`;
  private viewerLogPath: string | undefined;
  private viewerLogSeq = 0;
  private viewerLogStartMs = Date.now();

  private initViewerLog() {
    const logsDir = resolve(rootDir, "logs");
    mkdirSync(logsDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    this.viewerLogPath = join(logsDir, `viewer-${stamp}.jsonl`);
    this.viewerLogSeq = 0;
    this.viewerLogStartMs = Date.now();
  }

  private logViewerEvent(entry: Record<string, unknown>) {
    if (!this.viewerLogPath) {
      this.initViewerLog();
    }
    const line = JSON.stringify({
      seq: this.viewerLogSeq++,
      ts: new Date().toISOString(),
      elapsed_ms: Date.now() - this.viewerLogStartMs,
      ...entry
    });
    appendFileSync(this.viewerLogPath!, line + "\n");
  }

  async start() {
    if (this.started) {
      return;
    }

    this.initViewerLog();
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
       this.logViewerEvent({
         source: "viewer",
         sessionId,
         event: "render_model_fetch"
       });
       return reply.send(await this.getSessionRenderModel(session));
     });

    this.fastify.get("/api/sessions/:sessionId/browser/:windowId/frame", async (request, reply) => {
      const params = request.params as { sessionId: string; windowId: string };
      const requestedVersion = Number((request.query as { v?: string } | undefined)?.v);
      const frame = this.hybridBrowserManager.getFrame(
        params.sessionId,
        params.windowId,
        Number.isFinite(requestedVersion) ? requestedVersion : undefined
      );
      if (!frame) {
        return reply.code(404).send({ error: "frame_not_found" });
      }
      return reply
        .header("cache-control", "no-store")
        .type(frame.mimeType)
        .send(frame.buffer);
    });

    this.fastify.post("/api/sessions/:sessionId/browser/:windowId/input", async (request, reply) => {
      const params = request.params as { sessionId: string; windowId: string };
      const body = (
        request.body as
          | { kind?: "click" | "double_click"; x?: number; y?: number }
          | { kind?: "scroll"; x?: number; y?: number; dx?: number; dy?: number }
          | undefined
      ) ?? {};
      if (!body.kind || body.x === undefined || body.y === undefined) {
        return reply.code(400).send({ error: "invalid_browser_input" });
      }
      const input =
        body.kind === "scroll"
          ? { kind: "scroll" as const, x: body.x, y: body.y, dx: body.dx, dy: body.dy }
          : { kind: body.kind, x: body.x, y: body.y };
      return reply.send(await this.viewerBrowserContentAction(params.sessionId, params.windowId, input));
    });

    this.fastify.post("/api/sessions/:sessionId/viewer-action", async (request, reply) => {
      const sessionId = (request.params as { sessionId: string }).sessionId;
      const action = (request.body as { action?: Computer13Action } | undefined)?.action;
      if (!action) {
        return reply.code(400).send({ error: "Missing action payload." });
      }
      return reply.send(await this.viewerAction(sessionId, action));
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
      this.logViewerEvent({
        source: "viewer",
        sessionId,
        event: "ws_connected",
        subscribers: subscribers.size
      });
      void this.getSessionRenderModel(this.sessions.get(sessionId)!)
        .then((model) => {
          if (ws.readyState === 1) {
            ws.send(JSON.stringify(model));
          }
        })
        .catch((error) => {
          this.logViewerEvent({
            source: "hybrid",
            sessionId,
            event: "initial_render_failed",
            error: error instanceof Error ? error.message : String(error)
          });
        });
      ws.on("close", () => {
        subscribers?.delete(ws);
        this.logViewerEvent({
          source: "viewer",
          sessionId,
          event: "ws_closed",
          subscribers: subscribers?.size ?? 0
        });
      });
    });

    await this.fastify.listen({ host: "127.0.0.1", port: this.port });
    this.started = true;
  }

  async stop() {
    await this.screenshotService.close();
    await this.hybridBrowserManager.close();
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
    void this.hybridBrowserManager.closeSession(sessionId);
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

  async reset(sessionId: string, taskId: string, seed: number, maxSteps?: number) {
    const session = this.getSession(sessionId);
    const result = session.env.reset({ taskId, seed, maxSteps });
    this.logViewerEvent({
      source: "cli",
      sessionId,
      event: "reset",
      taskId,
      seed
    });
    const decorated = await this.decorateResult(session, result);
    await this.broadcast(sessionId);
    return decorated;
  }

  async observe(sessionId: string) {
    const session = this.getSession(sessionId);
    const result = session.env.observe();
    return this.decorateResult(session, result);
  }

  async observeSolver(sessionId: string): Promise<SolverSerializedResult> {
    return serializeSolverResult(await this.observe(sessionId));
  }

  async step(sessionId: string, action: Computer13Action) {
    const session = this.getSession(sessionId);
    const result = session.env.step(action);
    this.logViewerEvent({
      source: "cli",
      sessionId,
      event: "step",
      action,
      stepIndex: result.stepIndex,
      actionAccepted: result.actionAccepted,
      actionSummary: result.info.actionSummary
    });
    const decorated = await this.decorateResult(session, result);
    await this.broadcast(sessionId);
    return decorated;
  }

  async stepSolver(sessionId: string, action: Computer13Action): Promise<SolverSerializedResult> {
    return serializeSolverResult(await this.step(sessionId, action));
  }

  async applyPerturbation(sessionId: string, op: string, params?: Record<string, unknown>) {
    const session = this.getSession(sessionId);
    const result = session.env.applyPerturbation(op, params);
    const decorated = await this.decorateResult(session, result);
    await this.broadcast(sessionId);
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
    await this.broadcast(sessionId);
    return decorated;
  }

  async resetSolver(
    sessionId: string,
    taskId: string,
    seed: number,
    maxSteps?: number
  ): Promise<SolverSerializedResult> {
    return serializeSolverResult(await this.reset(sessionId, taskId, seed, maxSteps));
  }

  async viewerAction(sessionId: string, action: Computer13Action) {
    const session = this.getSession(sessionId);
    if (!session.env.getTask()) {
      this.logViewerEvent({
        source: "viewer",
        sessionId,
        event: "rejected",
        action,
        reason: "no_task"
      });
      return {
        error: "no_task",
        message: "No task loaded. Use the CLI to run: reset <taskId>"
      };
    }
    const result = session.env.step(action);
    result.observation = await this.decorateObservation(session, result.observation);
    this.logViewerEvent({
      source: "viewer",
      sessionId,
      event: "step",
      action,
      stepIndex: result.stepIndex,
      actionAccepted: result.actionAccepted,
      actionSummary: result.info.actionSummary,
      reward: result.reward,
      cumulativeReward: result.cumulativeReward,
      terminated: result.terminated,
      truncated: result.truncated
    });
    await this.broadcast(sessionId);
    return result;
  }

  private async viewerBrowserContentAction(
    sessionId: string,
    windowId: string,
    input:
      | { kind: "click" | "double_click"; x: number; y: number }
      | { kind: "scroll"; x: number; y: number; dx?: number; dy?: number }
  ) {
    const session = this.getSession(sessionId);
    if (this.hybridBrowserManager.isExternalPage(sessionId, windowId)) {
      const forwarded = await this.hybridBrowserManager.forwardInput(sessionId, windowId, input);
      this.logViewerEvent({
        source: "viewer",
        sessionId,
        event: "browser_runtime_input",
        windowId,
        input,
        forwarded
      });
      await this.broadcast(sessionId);
      return { ok: forwarded };
    }

    const resolvedPoint = this.hybridBrowserManager.resolveActionPoint(sessionId, windowId, {
      x: input.x,
      y: input.y
    });
    const action: Computer13Action =
      input.kind === "double_click"
        ? { type: "DOUBLE_CLICK", x: resolvedPoint.x, y: resolvedPoint.y }
        : input.kind === "scroll"
          ? { type: "SCROLL", dx: input.dx ?? 0, dy: input.dy ?? 0 }
          : { type: "CLICK", x: resolvedPoint.x, y: resolvedPoint.y };

    const result = session.env.step(action);
    this.logViewerEvent({
      source: "viewer",
      sessionId,
      event: "browser_content_step",
      windowId,
      input,
      resolvedPoint,
      stepIndex: result.stepIndex,
      actionAccepted: result.actionAccepted,
      actionSummary: result.info.actionSummary
    });
    result.observation = await this.decorateObservation(session, result.observation);
    await this.broadcast(sessionId);
    return result;
  }

  private getSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Unknown session: ${sessionId}`);
    }
    return session;
  }

  private async broadcast(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }
    let payload: string;
    try {
      payload = JSON.stringify(await this.getSessionRenderModel(session));
    } catch (error) {
      this.logViewerEvent({
        source: "hybrid",
        sessionId,
        event: "broadcast_render_failed",
        error: error instanceof Error ? error.message : String(error)
      });
      return;
    }
    this.subscribers.get(sessionId)?.forEach((socket) => {
      if (socket.readyState === 1) {
        socket.send(payload);
      }
    });
    this.logViewerEvent({
      source: "viewer",
      sessionId,
      event: "broadcast",
      subscribers: this.subscribers.get(sessionId)?.size ?? 0
    });
  }

  private async getSessionRenderModel(session: SessionRecord): Promise<RenderModel> {
    const model = session.env.getRenderModel();
    try {
      await this.hybridBrowserManager.syncSession(session.id, model);
    } catch (error) {
      this.logViewerEvent({
        source: "hybrid",
        sessionId: session.id,
        event: "sync_failed",
        error: error instanceof Error ? error.message : String(error)
      });
    }
    const windows = model.windows.map((window) => {
      if (window.appView.type !== "browser-lite" || window.appView.renderMode !== "hybrid") {
        return window;
      }
      const surface = this.hybridBrowserManager.getSurface(session.id, window.id);
      if (!surface) {
        return window;
      }
      return {
        ...window,
        appView: {
          ...(window.appView as BrowserLiteViewModel),
          url:
            (window.appView as BrowserLiteViewModel).currentPage === "external"
              ? surface.url
              : (window.appView as BrowserLiteViewModel).url,
          pageTitle:
            (window.appView as BrowserLiteViewModel).currentPage === "external"
              ? surface.title
              : (window.appView as BrowserLiteViewModel).pageTitle,
          addressInput:
            (window.appView as BrowserLiteViewModel).currentPage === "external"
              ? surface.url
              : (window.appView as BrowserLiteViewModel).addressInput,
          surface
        }
      };
    });
    return {
      ...model,
      windows,
      sessionId: session.id
    };
  }

  private async decorateResult(session: SessionRecord, result: StepResult) {
    result.observation = await this.decorateObservation(session, result.observation, {
      includeScreenshot: true
    });
    return result;
  }

  private async decorateObservation(
    session: SessionRecord,
    observation: Observation,
    opts?: { includeScreenshot?: boolean }
  ) {
    const renderModel = session.env.getRenderModel();
    try {
      await this.hybridBrowserManager.syncSession(session.id, renderModel);
    } catch (error) {
      this.logViewerEvent({
        source: "hybrid",
        sessionId: session.id,
        event: "decorate_sync_failed",
        error: error instanceof Error ? error.message : String(error)
      });
    }
    const browserAugmentations = this.collectBrowserObservationAugmentations(
      session.id,
      renderModel
    );
    const screenshotPath = opts?.includeScreenshot
      ? await this.screenshotService.capture(session.id, renderModel.stepIndex, session.viewerUrl)
      : observation.screenshotPath;
    return withBrowserAugmentations(
      {
        ...observation,
        screenshotPath,
        viewerUrl: session.viewerUrl
      },
      browserAugmentations
    );
  }

  private collectBrowserObservationAugmentations(
    sessionId: string,
    renderModel: RenderModel
  ): BrowserObservationAugmentation[] {
    return renderModel.windows.flatMap((window) => {
      if (window.appView.type !== "browser-lite" || window.appView.renderMode !== "hybrid") {
        return [];
      }
      if (window.appView.currentPage !== "external") {
        return [];
      }
      const nodes = this.hybridBrowserManager.getA11yNodes(sessionId, window.id);
      if (nodes.length === 0) {
        return [];
      }
      return [
        createBrowserContentReplacementAugmentation({
          windowId: window.id,
          source: "hybrid-dom",
          contentBounds: window.appView.layout.contentBounds,
          nodes
        })
      ];
    });
  }
}
