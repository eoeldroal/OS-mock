import { MockOsEnv } from './packages/core/dist/index.js';
import Fastify from 'fastify';
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Create logs directory
const logsDir = path.join(__dirname, 'logs/agent-tests/context-delete');
fs.mkdirSync(logsDir, { recursive: true });

let screenshotCount = 0;

async function takeScreenshot(browser, description) {
  const page = await browser.newPage();
  try {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    const filename = path.join(logsDir, `${String(screenshotCount).padStart(2, '0')}-${description}.png`);
    await page.screenshot({ path: filename, fullPage: false });
    console.log(`[Screenshot ${screenshotCount}] ${description} → ${filename}`);
    screenshotCount++;
    return filename;
  } finally {
    await page.close();
  }
}

async function main() {
  // Initialize MockOsEnv
  const env = new MockOsEnv();

  // Reset to the task
  console.log('[SETUP] Resetting to task "context_menu_delete" seed 0...');
  env.reset({
    taskId: 'context_menu_delete',
    seed: 0
  });

  // Get the render model
  const renderModel = env.getRenderModel();
  console.log('[INFO] Render model loaded');
  console.log(`[INFO] Environment state: ${JSON.stringify(renderModel, null, 2).substring(0, 500)}...`);

  // Launch Fastify server (following pattern from scripts/batch-replay-all.mjs)
  const fastify = Fastify();

  fastify.get('/', async (request, reply) => {
    const state = env.getRenderModel();
    return {
      state,
      timestamp: new Date().toISOString()
    };
  });

  fastify.get('/render', async (request, reply) => {
    return env.getRenderModel();
  });

  // Start the server
  const port = 3001 + Math.floor(Math.random() * 100);
  await fastify.listen({ port, host: '0.0.0.0' });
  console.log(`[SERVER] Fastify server running on http://localhost:${port}`);

  // Give server time to start
  await new Promise(resolve => setTimeout(resolve, 500));

  // Launch Playwright browser
  const browser = await chromium.launch({ headless: true });

  // Update takeScreenshot to use the dynamic port
  const originalTakeScreenshot = takeScreenshot;
  const localTakeScreenshot = async (browser, description) => {
    const page = await browser.newPage();
    try {
      await page.goto(`http://localhost:${port}`, { waitUntil: 'networkidle' });
      const filename = path.join(logsDir, `${String(screenshotCount).padStart(2, '0')}-${description}.png`);
      await page.screenshot({ path: filename, fullPage: false });
      console.log(`[Screenshot ${screenshotCount}] ${description} → ${filename}`);
      screenshotCount++;
      return filename;
    } finally {
      await page.close();
    }
  };

  try {
    console.log('\n=== STEP a: Screenshot initial state ===');
    await localTakeScreenshot(browser, 'step-a-initial-state');

    // Get the file explorer window and find a file
    const state = env.getRenderModel();
    console.log('[INFO] Current render state keys:', Object.keys(state));

    // Find the file explorer window
    let fileExplorerWindow = null;
    let fileRowBounds = null;
    let fileName = null;
    let fileIndex = 0;

    if (state.windows && Array.isArray(state.windows)) {
      for (const win of state.windows) {
        if (win.appId === 'file-explorer' && win.appView && win.appView.files) {
          fileExplorerWindow = win;
          // Get first file entry
          const files = win.appView.files;
          if (files.length > 0) {
            const firstFile = files[0];
            fileName = firstFile.name;
            fileIndex = 0;
            // Calculate bounds for the file row based on window position
            const fileListStartY = win.bounds.y + 70; // rough estimate for header
            const fileRowHeight = 30;
            fileRowBounds = {
              x: win.bounds.x + 10,
              y: fileListStartY + (fileIndex * fileRowHeight),
              width: win.bounds.width - 20,
              height: fileRowHeight
            };
            console.log(`[INFO] Found file: ${fileName} at bounds:`, fileRowBounds);
          }
          break;
        }
      }
    }

    if (!fileRowBounds) {
      console.error('[ERROR] Could not find file entry in render model');
      console.error('[DEBUG] Full render model:', JSON.stringify(state, null, 2).substring(0, 2000));
      throw new Error('File entry not found in render model');
    }

    // Step b: Click on a file
    console.log('\n=== STEP b: Click on file ===');
    const clickX = fileRowBounds.x + fileRowBounds.width / 2;
    const clickY = fileRowBounds.y + fileRowBounds.height / 2;
    console.log(`[ACTION] Clicking at (${clickX}, ${clickY}) to select file "${fileName}"`);
    env.step({ type: "CLICK", x: clickX, y: clickY });
    await new Promise(resolve => setTimeout(resolve, 200));

    console.log('\n=== STEP c: Screenshot - file selected ===');
    await localTakeScreenshot(browser, 'step-c-file-selected');

    // Step d: Right-click on the selected file
    console.log('\n=== STEP d: Right-click on file ===');
    console.log(`[ACTION] Right-clicking at (${clickX}, ${clickY}) to open context menu`);
    env.step({ type: "RIGHT_CLICK", x: clickX, y: clickY });
    await new Promise(resolve => setTimeout(resolve, 200));

    console.log('\n=== STEP e: Screenshot - context menu visible ===');
    await localTakeScreenshot(browser, 'step-e-context-menu-visible');

    // Step f: Find and click Delete menu item
    console.log('\n=== STEP f: Click Delete in context menu ===');
    const updatedState = env.getRenderModel();
    let deleteMenuBounds = null;

    if (updatedState.contextMenu && updatedState.contextMenu.items) {
      for (const item of updatedState.contextMenu.items) {
        if (item.label === 'Delete') {
          deleteMenuBounds = item.bounds;
          console.log(`[INFO] Found Delete menu item at bounds:`, deleteMenuBounds);
          break;
        }
      }
    }

    if (deleteMenuBounds) {
      const deleteX = deleteMenuBounds.x + deleteMenuBounds.width / 2;
      const deleteY = deleteMenuBounds.y + deleteMenuBounds.height / 2;
      console.log(`[ACTION] Clicking Delete at (${deleteX}, ${deleteY})`);
      env.step({ type: "CLICK", x: deleteX, y: deleteY });
      await new Promise(resolve => setTimeout(resolve, 200));
    } else {
      console.error('[ERROR] Delete menu item not found');
      console.error('[DEBUG] Context menu state:', JSON.stringify(updatedState.contextMenu, null, 2));
    }

    console.log('\n=== STEP g: Screenshot - file deleted ===');
    await localTakeScreenshot(browser, 'step-g-file-deleted');

    // Step h: Undo with Ctrl+Z
    console.log('\n=== STEP h: Undo deletion with Ctrl+Z ===');
    console.log('[ACTION] Pressing Ctrl+Z to undo');
    env.step({ type: "KEY", key: "ctrl+z" });
    await new Promise(resolve => setTimeout(resolve, 200));

    console.log('\n=== STEP i: Screenshot - file restored ===');
    await localTakeScreenshot(browser, 'step-i-file-restored');

    console.log('\n[SUCCESS] All steps completed!');

  } finally {
    await browser.close();
    await fastify.close();
  }
}

main().catch(err => {
  console.error('[ERROR]', err);
  process.exit(1);
});
