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
    const filePath = resolve(
      this.rootDir,
      "tmp",
      "os-mock",
      "sessions",
      sessionId,
      `frame-${String(stepIndex).padStart(4, "0")}.png`
    );
    await mkdir(dirname(filePath), { recursive: true });
    await page.goto(viewerUrl, { waitUntil: "networkidle" });
    await page.screenshot({ path: filePath });
    await page.close();
    return filePath;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = undefined;
    }
  }
}

