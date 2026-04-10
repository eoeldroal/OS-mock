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

//SessionRecord = 초경량 가상 OS (상태와 뷰의 분리)

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
  private readonly fastify = Fastify({ logger: false }); //Python의 FastAPI나 Flask와 동일한 역할
  private readonly screenshotService = new ScreenshotService(rootDir); //screenshot.ts의 객체생성
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
     //agent가 아니라, 인간이 디버깅을 위해 브라우저에서 직접 마우스로 우분투 UI를 클릭했을 때 서버의 상태를 업데이트하는 용도
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
    }); //// 2. HTTP 요청을 WebSocket(ws)으로 "업그레이드"

    this.wss.on("connection", (ws: WebSocket, request: IncomingMessage) => {
      //브라우저가 접속한 주소에서 sesionId를 추출함.
      const url = new URL(request.url ?? "/ws", this.baseUrl);
      const sessionId = url.searchParams.get("sessionId");
      if (!sessionId || !this.sessions.has(sessionId)) {
        ws.close();
        return;
      }
      //해당 세션의 구독자 명단에 브라우저의 파이프를 등록
      let subscribers = this.subscribers.get(sessionId);
      if (!subscribers) {
        subscribers = new Set<WebSocket>();
        this.subscribers.set(sessionId, subscribers);
      }
      subscribers.add(ws);
      //  [매주 중요] 접속하자마자 현재 OS의 모습(RenderModel)을 JSON으로 쏴줌
      ws.send(JSON.stringify(this.sessions.get(sessionId)!.env.getRenderModel()));
      // 브라우저가 꺼지면 명단에서 지웁
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

  createSession(opts?: { seed?: number; viewport?: Viewport; viewer?: boolean }) { //ai 에이전트의 새로운 훈련 시작시, 호출
    const sessionId = `s${this.nextSessionId++}`; //s1, s2 ....
    const env = new MockOsEnv(opts?.viewport); // 가상 OS 엔진 부팅
    const viewerUrl = `${this.baseUrl}/session/${sessionId}`;
    this.sessions.set(sessionId, { // 세션 기록 역할
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

  getHiddenState(sessionId: string) { //VLM 에이전트의 화면에는 보이지 않는, 서버 메모리 상의 '진짜 정답'을 들여다보는 치트키
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

  async step(sessionId: string, action: Computer13Action) { //computer13Action을 입력으로 받아 훈련루프를 실행
    //1.메모리 상의 가상 OS(MockOsEnv)에 마우스 클릭을 적용
    //2.화면이 바뀐 직후의 스크린샷을 찍기
    //3.프론트엔드(브라우저)에게 화면상태의 바뀜을 고지하고 다시 그리라고 방송
    
    const session = this.getSession(sessionId);
    const result = session.env.step(action);
    const decorated = await this.decorateResult(session, result); //helper 함수1
    this.broadcast(sessionId); //helper 함수 2

    //에이전트에게 결과(보상, 스크린샷 경로 등)를 반환
    return decorated;
  }
  //tools/trainer.ts가 명령을 접수 >> host.ts (지시 전달) >> packages/core 안에 있는 MockOsEnv 클래스(또는 그 하위 모듈)에서 perturbation작동
  async applyPerturbation(sessionId: string, op: string, params?: Record<string, unknown>) {
    //perturbation을 적용하는 함수, 
    const session = this.getSession(sessionId);
    const result = session.env.applyPerturbation(op, params); //OS 역할을 하는 객체
    const decorated = await this.decorateResult(session, result);
    this.broadcast(sessionId);
    return decorated;
  }
//save & load function, snapshot으로 저장해 두고, 실패할 때마다 restoreSnapshot으로 그 구간만 무한 반복 훈련
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

  private broadcast(sessionId: string) { //helper 함수 1
    // 가상 OS 환경에서 현재 화면을 그리는 데 필요한 정보(RenderModel)만 쏙 뽑아서 JSON 문자화
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }
    // 이 세션을 보고 있는 모든 브라우저(구독자)의 파이프(socket)에 데이터를 쏴버림
    const payload = JSON.stringify(session.env.getRenderModel());
    this.subscribers.get(sessionId)?.forEach((socket) => {
      if (socket.readyState === 1) {
        socket.send(payload);
      }
    });
  }
  //철저하게 서버가 데이터를 던져주는 단방향 푸시(Push) 구조 >> 프론트엔드가 할 일이 극단적으로 감소
  private async decorateResult(session: SessionRecord, result: StepResult) {
    const screenshotPath = await this.screenshotService.capture(
      session.id,
      result.stepIndex,
      session.viewerUrl
    );
    // 에이전트에게 줄 결과물 데이터에 사진 경로를 슬쩍 끼워 넣습니다.
    result.observation.screenshotPath = screenshotPath;
    result.observation.viewerUrl = session.viewerUrl;
    return result;
  }
}
