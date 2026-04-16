import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { chromium, type Browser } from "playwright";

export class ScreenshotService {
  private browser?: Browser;

  constructor(private readonly rootDir: string) {}

  private async ensureBrowser() {
    if (!this.browser) {
      this.browser = await chromium.launch({ headless: true });
    }
    return this.browser;
  }

  async capture(sessionId: string, stepIndex: number, viewerUrl: string) {
    const browser = await this.ensureBrowser();
    const page = await browser.newPage({
      viewport: { width: 1280, height: 800 }
    });
    const viewerPort = (() => {
      try {
        return new URL(viewerUrl).port || "default";
      } catch {
        return "default";
      }
    })();
    const filePath = resolve(
      this.rootDir,
      "tmp",
      "os-mock",
      "sessions",
      `port-${viewerPort}`,
      sessionId,
      `frame-${String(stepIndex).padStart(4, "0")}.png`
    );
    await mkdir(dirname(filePath), { recursive: true });
    await page.goto(viewerUrl, { waitUntil: "domcontentloaded", timeout: 5_000 }).catch(() => {});
    await page
      .waitForFunction(() => {
        const bodyText = document.body?.innerText ?? "";
        return document.readyState !== "loading" && !bodyText.includes("Loading session viewer");
      }, undefined, { timeout: 5_000 })
      .catch(() => {});
    const captured = await page
      .screenshot({ path: filePath, timeout: 5_000 })
      .then(() => true)
      .catch(() => false);
    void page.close().catch(() => {});
    return captured ? filePath : undefined;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = undefined;
    }
  }
}
