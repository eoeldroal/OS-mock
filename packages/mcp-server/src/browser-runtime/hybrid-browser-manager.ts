import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import type { A11yNode, BrowserLiteViewModel, BrowserSurfaceViewModel, Rect, RenderModel } from "../../../core/src/types.js";
import { renderBrowserSurfaceHtml } from "./browser-surface-template.js";
import { extractBrowserDomSnapshot } from "./browser-dom-snapshot.js";

type SurfaceRecord = {
  sessionId: string;
  windowId: string;
  page: Page;
  signature: string;
  frameVersion: number;
  frameBuffer?: Buffer;
  frameHistory: Map<number, Buffer>;
  mimeType: "image/png";
  title: string;
  url: string;
  width: number;
  height: number;
  loading: boolean;
  syncChain: Promise<void>;
  a11yNodes: A11yNode[];
  currentPage: BrowserLiteViewModel["currentPage"];
  contentBounds: Rect;
};

function surfaceKey(sessionId: string, windowId: string) {
  return `${sessionId}:${windowId}`;
}

export class HybridBrowserManager {
  private browser?: Browser;
  private readonly contexts = new Map<string, BrowserContext>();
  private readonly surfaces = new Map<string, SurfaceRecord>();

  private async ensureBrowser() {
    if (!this.browser) {
      this.browser = await chromium.launch({ headless: true });
    }
    return this.browser;
  }

  private async ensureContext(sessionId: string) {
    const existing = this.contexts.get(sessionId);
    if (existing) {
      return existing;
    }
    const browser = await this.ensureBrowser();
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      colorScheme: "light",
      locale: "en-US",
      timezoneId: "UTC",
      deviceScaleFactor: 1
    });
    this.contexts.set(sessionId, context);
    return context;
  }

  async syncSession(sessionId: string, renderModel: RenderModel) {
    const hybridWindows = renderModel.windows.filter(
      (window): window is typeof window & { appView: BrowserLiteViewModel } =>
        window.appView.type === "browser-lite" && window.appView.renderMode === "hybrid"
    );

    const activeKeys = new Set(hybridWindows.map((window) => surfaceKey(sessionId, window.id)));

    for (const [key, surface] of this.surfaces.entries()) {
      if (surface.sessionId === sessionId && !activeKeys.has(key)) {
        await surface.page.close();
        this.surfaces.delete(key);
      }
    }

    if (hybridWindows.length === 0) {
      return;
    }

    const context = await this.ensureContext(sessionId);
    for (const window of hybridWindows) {
      await this.syncWindow(context, sessionId, window.id, window.appView);
    }
  }

  private async syncWindow(
    context: BrowserContext,
    sessionId: string,
    windowId: string,
    viewModel: BrowserLiteViewModel
  ) {
    const key = surfaceKey(sessionId, windowId);
    let surface = this.surfaces.get(key);
    if (!surface) {
      const page = await context.newPage();
      surface = {
        sessionId,
        windowId,
        page,
        signature: "",
        frameVersion: 0,
        frameHistory: new Map(),
        mimeType: "image/png",
        title: viewModel.pageTitle,
        url: viewModel.url,
        width: 0,
        height: 0,
        loading: true,
        syncChain: Promise.resolve(),
        a11yNodes: [],
        currentPage: viewModel.currentPage,
        contentBounds: viewModel.layout.contentBounds
      };
      this.surfaces.set(key, surface);
    }

    const width = Math.max(1, viewModel.layout.contentBounds.width);
    const height = Math.max(1, viewModel.layout.contentBounds.height);
    const signature = JSON.stringify({
      width,
      height,
      currentPage: viewModel.currentPage,
      url: viewModel.url,
      pageTitle: viewModel.pageTitle,
      selectedCategoryId: viewModel.selectedCategoryId,
      selectedTaskId: viewModel.selectedTaskId,
      selectedHelpLineIndex: viewModel.selectedHelpLineIndex,
      bookmarks: viewModel.bookmarks,
      categories: viewModel.categories,
      helpLines: viewModel.helpLines,
      layout: viewModel.layout
    });

    if (surface.signature === signature) {
      return;
    }

    surface.syncChain = surface.syncChain
      .catch(() => undefined)
      .then(async () => {
        if (surface!.signature === signature) {
          return;
        }

        surface!.loading = true;
        try {
          await surface!.page.setViewportSize({ width, height });
          if (viewModel.currentPage === "external") {
            try {
              await surface!.page.goto(viewModel.url, {
                waitUntil: "domcontentloaded",
                timeout: 15000
              });
            } catch (error) {
              const message = error instanceof Error ? error.message : String(error);
              await surface!.page.setContent(
                `<!doctype html><html><body style="margin:0;padding:24px;font-family:Ubuntu,system-ui,sans-serif;background:#fff;color:#1f2937;">
                  <div style="font-size:24px;font-weight:700;">Failed to load page</div>
                  <div style="margin-top:12px;font-size:14px;color:#475569;">${viewModel.url}</div>
                  <pre style="margin-top:18px;white-space:pre-wrap;font-size:12px;color:#64748b;">${message}</pre>
                </body></html>`,
                { waitUntil: "load" }
              );
            }
          } else {
            await surface!.page.setContent(renderBrowserSurfaceHtml(viewModel), { waitUntil: "load" });
          }
          const frameBuffer = (await surface!.page.screenshot({
            type: "png"
          })) as Buffer;
          surface!.frameVersion += 1;
          surface!.frameBuffer = frameBuffer;
          surface!.frameHistory.set(surface!.frameVersion, frameBuffer);
          while (surface!.frameHistory.size > 4) {
            const oldest = Math.min(...surface!.frameHistory.keys());
            surface!.frameHistory.delete(oldest);
          }
          surface!.signature = signature;
          surface!.title = (await surface!.page.title()) || viewModel.pageTitle;
          surface!.url = surface!.page.url() || viewModel.url;
          surface!.width = width;
          surface!.height = height;
          surface!.currentPage = viewModel.currentPage;
          surface!.contentBounds = viewModel.layout.contentBounds;
          surface!.a11yNodes = await extractBrowserDomSnapshot(
            surface!.page,
            windowId,
            viewModel.layout.contentBounds
          );
        } finally {
          surface!.loading = false;
        }
      });

    await surface.syncChain;
  }

  getSurface(sessionId: string, windowId: string): BrowserSurfaceViewModel | undefined {
    const surface = this.surfaces.get(surfaceKey(sessionId, windowId));
    if (!surface?.frameBuffer) {
      return undefined;
    }
    return {
      windowId,
      frameVersion: surface.frameVersion,
      frameUrl: `/api/sessions/${sessionId}/browser/${windowId}/frame?v=${surface.frameVersion}`,
      title: surface.title,
      url: surface.url,
      loading: surface.loading,
      width: surface.width,
      height: surface.height
    };
  }

  getFrame(sessionId: string, windowId: string, frameVersion?: number) {
    const surface = this.surfaces.get(surfaceKey(sessionId, windowId));
    if (!surface?.frameBuffer) {
      return undefined;
    }
    const buffer =
      frameVersion !== undefined ? surface.frameHistory.get(frameVersion) : surface.frameBuffer;
    if (!buffer) {
      return undefined;
    }
    return {
      buffer,
      mimeType: surface.mimeType
    };
  }

  getA11yNodes(sessionId: string, windowId: string) {
    const surface = this.surfaces.get(surfaceKey(sessionId, windowId));
    return surface?.a11yNodes ?? [];
  }

  isExternalPage(sessionId: string, windowId: string) {
    const surface = this.surfaces.get(surfaceKey(sessionId, windowId));
    return surface?.currentPage === "external";
  }

  resolveActionPoint(sessionId: string, windowId: string, point: { x: number; y: number }) {
    const candidates = this.getA11yNodes(sessionId, windowId).filter((node) => {
      return (
        point.x >= node.bounds.x &&
        point.y >= node.bounds.y &&
        point.x <= node.bounds.x + node.bounds.width &&
        point.y <= node.bounds.y + node.bounds.height
      );
    });

    if (candidates.length === 0) {
      return point;
    }

    const winner = candidates.sort(
      (left, right) => left.bounds.width * left.bounds.height - right.bounds.width * right.bounds.height
    )[0];

    return {
      x: winner.bounds.x + Math.round(winner.bounds.width / 2),
      y: winner.bounds.y + Math.round(winner.bounds.height / 2)
    };
  }

  async forwardInput(
    sessionId: string,
    windowId: string,
    input:
      | { kind: "click" | "double_click"; x: number; y: number }
      | { kind: "scroll"; x: number; y: number; dx?: number; dy?: number }
  ) {
    const surface = this.surfaces.get(surfaceKey(sessionId, windowId));
    if (!surface) {
      return false;
    }
    const localX = Math.max(0, Math.min(surface.width - 1, input.x - surface.contentBounds.x));
    const localY = Math.max(0, Math.min(surface.height - 1, input.y - surface.contentBounds.y));

    if (input.kind === "scroll") {
      await surface.page.mouse.move(localX, localY);
      await surface.page.mouse.wheel((input.dx ?? 0) * 80, (input.dy ?? 0) * 120);
    } else {
      await surface.page.mouse.click(localX, localY, {
        clickCount: input.kind === "double_click" ? 2 : 1
      });
    }

    await surface.page.waitForTimeout(120);
    const frameBuffer = (await surface.page.screenshot({ type: "png" })) as Buffer;
    surface.frameVersion += 1;
    surface.frameBuffer = frameBuffer;
    surface.frameHistory.set(surface.frameVersion, frameBuffer);
    while (surface.frameHistory.size > 4) {
      const oldest = Math.min(...surface.frameHistory.keys());
      surface.frameHistory.delete(oldest);
    }
    surface.title = (await surface.page.title()) || surface.title;
    surface.url = surface.page.url() || surface.url;
    surface.a11yNodes = await extractBrowserDomSnapshot(surface.page, windowId, surface.contentBounds);
    return true;
  }

  async closeSession(sessionId: string) {
    for (const [key, surface] of this.surfaces.entries()) {
      if (surface.sessionId === sessionId) {
        await surface.page.close();
        this.surfaces.delete(key);
      }
    }
    const context = this.contexts.get(sessionId);
    if (context) {
      await context.close();
      this.contexts.delete(sessionId);
    }
  }

  async close() {
    for (const surface of this.surfaces.values()) {
      await surface.page.close();
    }
    this.surfaces.clear();
    for (const context of this.contexts.values()) {
      await context.close();
    }
    this.contexts.clear();
    if (this.browser) {
      await this.browser.close();
      this.browser = undefined;
    }
  }
}
