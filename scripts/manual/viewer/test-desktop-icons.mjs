/**
 * Desktop Icon Double-Click Test
 * Tests the workflow: initial state -> click -> double-click -> window opens
 */
import { MockOsEnv } from "../../packages/core/dist/index.js";
import { mkdirSync, writeFileSync } from "fs";
import { resolve } from "path";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { chromium } from "playwright";

const OUTPUT_DIR = resolve("logs/agent-tests/desktop-icons");
mkdirSync(OUTPUT_DIR, { recursive: true });

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

// Initialize MockOsEnv
log("=== Initializing MockOsEnv ===");
const mockEnv = new MockOsEnv({ width: 1280, height: 800 });
mockEnv.reset({ taskId: "desktop_icon_launch", seed: 0 });
log("Reset to task: desktop_icon_launch, seed: 0");

// Get initial state
let state = mockEnv.getRenderModel();
log(`Initial windows: ${state.windows?.length || 0}`);
log(`Initial desktop icons: ${state.desktopIcons?.length || 0}`);

// Log desktop icons details
if (state.desktopIcons && state.desktopIcons.length > 0) {
  log("\n=== Desktop Icons ===");
  state.desktopIcons.forEach((icon, idx) => {
    const posX = icon.position?.x ?? icon.x ?? icon.bounds?.x ?? "?";
    const posY = icon.position?.y ?? icon.y ?? icon.bounds?.y ?? "?";
    log(`  [${idx}] ${icon.label} (${icon.appId}): (${posX}, ${posY}), bounds: ${JSON.stringify(icon.bounds)}`);
    log(`    Full icon object: ${JSON.stringify(icon)}`);
  });
}

// Start Fastify server
log("\n=== Starting Fastify Server ===");
const fastify = Fastify({ logger: false });

try {
  const webAssetsDir = resolve("packages/web/dist/assets");
  await fastify.register(fastifyStatic, { root: webAssetsDir, prefix: "/assets/" });
} catch (e) {
  log("Note: web assets not available");
}

let currentModel = state;
fastify.get("/api/sessions/s1/render-model", async () => currentModel);

await fastify.listen({ host: "127.0.0.1", port: 3001 });
log("Fastify listening on http://127.0.0.1:3001");

// Launch Playwright
log("\n=== Launching Playwright ===");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

// Create simple render visualization
async function renderPage(title, renderModel) {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: "Courier New", monospace;
      background: #1e1e1e;
      color: #fff;
      padding: 20px;
      margin: 0;
    }
    .title {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 20px;
      color: #4a9eff;
    }
    .desktop {
      position: relative;
      width: 640px;
      height: 480px;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      border: 2px solid #444;
      margin: 20px 0;
      overflow: hidden;
    }
    .icon {
      position: absolute;
      width: 80px;
      text-align: center;
      color: #fff;
      font-size: 11px;
    }
    .icon-image {
      width: 48px;
      height: 48px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 4px;
      margin: 0 auto 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
    }
    .icon-label {
      word-wrap: break-word;
      margin-top: 4px;
    }
    .window {
      position: absolute;
      background: #2d2d2d;
      border: 1px solid #666;
      border-radius: 4px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .window-title {
      background: #3d3d3d;
      padding: 4px 8px;
      font-size: 11px;
      border-bottom: 1px solid #555;
      flex-shrink: 0;
    }
    .window-content {
      flex: 1;
      padding: 8px;
      font-size: 10px;
    }
    .stats-box {
      background: #2d2d2d;
      border: 1px solid #444;
      padding: 12px;
      margin: 10px 0;
      border-radius: 4px;
    }
    .stat-row {
      display: flex;
      justify-content: space-between;
      margin: 4px 0;
    }
    .stat-label {
      color: #888;
      width: 150px;
    }
    .stat-value {
      color: #4a9eff;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="title">${title}</div>

  <div class="desktop">
    ${renderModel.desktopIcons?.map(icon => `
      <div class="icon" style="left: ${icon.x}px; top: ${icon.y}px;">
        <div class="icon-image">📁</div>
        <div class="icon-label">${icon.label}</div>
      </div>
    `).join('') || ''}

    ${renderModel.windows?.map(w => `
      <div class="window" style="left: ${w.bounds.x}px; top: ${w.bounds.y}px; width: ${w.bounds.width}px; height: ${w.bounds.height}px;">
        <div class="window-title">${w.title || "Untitled"}</div>
        <div class="window-content">${w.type}</div>
      </div>
    `).join('') || ''}
  </div>

  <div class="stats-box">
    <div class="stat-row">
      <span class="stat-label">Windows:</span>
      <span class="stat-value">${renderModel.windows?.length || 0}</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">Desktop Icons:</span>
      <span class="stat-value">${renderModel.desktopIcons?.length || 0}</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">Popups:</span>
      <span class="stat-value">${renderModel.popups?.length || 0}</span>
    </div>
  </div>

  <div class="stats-box">
    <div style="color: #4a9eff; font-weight: bold; margin-bottom: 8px;">Desktop Icons:</div>
    ${renderModel.desktopIcons?.map(icon => `
      <div style="margin: 6px 0; padding: 6px; background: #1a1a2e; border-left: 2px solid #667eea;">
        <strong>${icon.label}</strong> (${icon.appId})<br>
        Pos: (${icon.x}, ${icon.y})<br>
        Bounds: {x:${icon.bounds?.x}, y:${icon.bounds?.y}, w:${icon.bounds?.width}, h:${icon.bounds?.height}}
      </div>
    `).join('') || '<div>No icons</div>'}
  </div>

  ${renderModel.windows?.length > 0 ? `
    <div class="stats-box">
      <div style="color: #4a9eff; font-weight: bold; margin-bottom: 8px;">Windows:</div>
      ${renderModel.windows.map((w, i) => `
        <div style="margin: 6px 0; padding: 6px; background: #1a1a2e; border-left: 2px solid #764ba2;">
          <strong>[${i}] ${w.title || 'Untitled'}</strong> (${w.type})<br>
          Bounds: {x:${w.bounds?.x}, y:${w.bounds?.y}, w:${w.bounds?.width}, h:${w.bounds?.height}}
        </div>
      `).join('')}
    </div>
  ` : ''}
</body>
</html>
  `;
  await page.setContent(html);
}

let screenshotCount = 0;

async function takeScreenshot(label) {
  screenshotCount++;
  const filename = `${screenshotCount.toString().padStart(2, '0')}-${label}.png`;
  const filepath = resolve(OUTPUT_DIR, filename);

  log(`  Screenshot: ${filename}`);
  await renderPage(label, currentModel);
  await page.screenshot({ path: filepath });

  return filepath;
}

try {
  // Step A: Initial desktop
  log("\n=== STEP A: Initial Desktop ===");
  currentModel = mockEnv.getRenderModel();
  await takeScreenshot("00-initial-desktop");
  log(`  Windows: ${currentModel.windows?.length || 0}`);
  log(`  Desktop icons: ${currentModel.desktopIcons?.length || 0}`);

  // Step B: Single click on Home icon
  log("\n=== STEP B: Click Home Icon ===");
  const homeIcon = currentModel.desktopIcons?.[0];
  if (!homeIcon) {
    throw new Error("No desktop icon found!");
  }

  // Use bounds to get position (bounds.x + bounds.width/2, bounds.y + bounds.height/2)
  const clickX = homeIcon.bounds.x + homeIcon.bounds.width / 2;
  const clickY = homeIcon.bounds.y + homeIcon.bounds.height / 2;
  log(`  Home icon bounds: ${JSON.stringify(homeIcon.bounds)}`);
  log(`  Clicking at (${clickX}, ${clickY})`);

  const clickResult = mockEnv.step({ type: "CLICK", x: clickX, y: clickY });
  currentModel = mockEnv.getRenderModel();
  log(`  Action accepted: ${clickResult.actionAccepted}`);
  log(`  Windows after click: ${currentModel.windows?.length || 0}`);

  await takeScreenshot("01-after-single-click");

  // Step C: Take screenshot after click
  log("\n=== STEP C: Screenshot After Click ===");
  log(`  Windows: ${currentModel.windows?.length || 0}`);

  // Step D: Double-click on Home icon
  log("\n=== STEP D: Double-Click Home Icon ===");
  const windowsBefore = currentModel.windows?.length || 0;
  log(`  Windows before double-click: ${windowsBefore}`);
  log(`  Double-clicking at (${clickX}, ${clickY})`);

  const dcResult = mockEnv.step({ type: "DOUBLE_CLICK", x: clickX, y: clickY });
  currentModel = mockEnv.getRenderModel();
  const windowsAfter = currentModel.windows?.length || 0;

  log(`  Action accepted: ${dcResult.actionAccepted}`);
  log(`  Windows after double-click: ${windowsAfter}`);
  log(`  Windows changed: ${windowsBefore !== windowsAfter}`);

  // Step E: Screenshot after double-click
  log("\n=== STEP E: Screenshot After Double-Click ===");
  await takeScreenshot("02-after-double-click");

  // Step F: Check window count increase
  log("\n=== STEP F: Window Count Analysis ===");
  log(`  Initial windows: ${state.windows?.length || 0}`);
  log(`  Final windows: ${currentModel.windows?.length || 0}`);
  if (currentModel.windows && currentModel.windows.length > 0) {
    currentModel.windows.forEach((w, idx) => {
      log(`    [${idx}] ${w.title || 'Untitled'} (${w.type})`);
    });
  }

  // Step G: Click in the new window
  log("\n=== STEP G: Click in New Window ===");
  if (currentModel.windows && currentModel.windows.length > windowsBefore) {
    const newWindow = currentModel.windows[currentModel.windows.length - 1];
    const contentX = newWindow.bounds.x + newWindow.bounds.width / 2;
    const contentY = newWindow.bounds.y + newWindow.bounds.height / 2;
    log(`  Clicking in new window at (${contentX}, ${contentY})`);

    const clickInWinResult = mockEnv.step({ type: "CLICK", x: contentX, y: contentY });
    currentModel = mockEnv.getRenderModel();
    log(`  Action accepted: ${clickInWinResult.actionAccepted}`);
  }

  // Step H: Final screenshot
  log("\n=== STEP H: Final Screenshot ===");
  await takeScreenshot("03-final-state");
  log(`  Final windows: ${currentModel.windows?.length || 0}`);

  // Summary
  log("\n" + "═".repeat(70));
  log("TEST SUMMARY");
  log("═".repeat(70));

  const initialWindows = state.windows?.length || 0;
  const finalWindows = currentModel.windows?.length || 0;
  const iconsVisible = currentModel.desktopIcons?.length || 0;

  const results = {
    scenario: "Double-click desktop icon to launch app",
    timestamp: new Date().toISOString(),
    task: "desktop_icon_launch",
    seed: 0,
    checks: {
      "Desktop icons visible initially": iconsVisible > 0,
      "Home icon exists": (state.desktopIcons?.length || 0) > 0,
      "Windows created after double-click": finalWindows > initialWindows,
      "Window count increased": finalWindows > initialWindows,
      "Final window is file explorer": currentModel.windows?.some(w => w.type === "file_explorer") || false
    },
    stats: {
      initial_windows: initialWindows,
      final_windows: finalWindows,
      desktop_icons: iconsVisible,
      window_increase: finalWindows - initialWindows
    },
    screenshots: [
      "00-initial-desktop.png",
      "01-after-single-click.png",
      "02-after-double-click.png",
      "03-final-state.png"
    ],
    output_dir: OUTPUT_DIR
  };

  log(`\nDesktop Icons Visible: ${results.checks["Desktop icons visible initially"]}`);
  log(`Home Icon Exists: ${results.checks["Home icon exists"]}`);
  log(`Windows Increased: ${results.checks["Windows created after double-click"]}`);
  log(`Window Type: ${currentModel.windows?.map(w => w.type).join(", ")}`);

  writeFileSync(resolve(OUTPUT_DIR, "test-report.json"), JSON.stringify(results, null, 2));
  log(`\nReport saved: ${OUTPUT_DIR}/test-report.json`);

} catch (error) {
  log(`\nERROR: ${error.message}`);
  log(error.stack);
  process.exit(1);
} finally {
  await browser.close();
  await fastify.close();
  log("\n=== Cleanup Complete ===");
}
