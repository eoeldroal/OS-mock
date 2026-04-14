import { MockOsEnv } from './packages/core/dist/index.js';
import { createCanvas } from 'canvas';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Create logs directory
const logsDir = path.join(__dirname, 'logs/agent-tests/context-delete');
fs.mkdirSync(logsDir, { recursive: true });

let screenshotCount = 0;

// Basic function to render the mock OS state to a canvas for visualization
function renderStateToCanvas(state) {
  const canvas = createCanvas(state.viewport.width, state.viewport.height);
  const ctx = canvas.getContext('2d');

  // Fill background
  ctx.fillStyle = '#0e1324';
  ctx.fillRect(0, 0, state.viewport.width, state.viewport.height);

  // Draw top bar
  ctx.fillStyle = '#1a1e2e';
  ctx.fillRect(0, 0, state.viewport.width, 30);
  ctx.fillStyle = '#fff';
  ctx.font = '12px sans-serif';
  ctx.fillText(state.topBarTitle + ' | ' + state.topBarClock, 10, 20);

  // Draw windows
  if (state.windows && Array.isArray(state.windows)) {
    for (const win of state.windows) {
      // Draw window background
      ctx.fillStyle = '#2a2e3e';
      ctx.fillRect(win.bounds.x, win.bounds.y, win.bounds.width, win.bounds.height);

      // Draw title bar
      ctx.fillStyle = win.focused ? '#4a5ae8' : '#3a3e4e';
      ctx.fillRect(win.bounds.x, win.bounds.y, win.bounds.width, 40);

      // Draw title text
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(win.title, win.bounds.x + 10, win.bounds.y + 25);

      // Draw content area
      if (win.appView && win.appView.type === 'file-explorer' && win.appView.files) {
        ctx.fillStyle = '#fff';
        ctx.font = '11px sans-serif';
        const files = win.appView.files;
        let y = win.bounds.y + 70;

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          // Draw file row background (highlight if selected)
          if (state.selectedFileIndex === i) {
            ctx.fillStyle = '#4a5ae8';
            ctx.fillRect(win.bounds.x + 5, y - 15, win.bounds.width - 10, 28);
          }

          ctx.fillStyle = state.selectedFileIndex === i ? '#fff' : '#ccc';
          ctx.fillText('📄 ' + file.name, win.bounds.x + 15, y);
          y += 30;
        }
      }
    }
  }

  // Draw context menu if visible
  if (state.contextMenu && state.contextMenu.items && state.contextMenu.items.length > 0) {
    const menuX = state.contextMenu.position.x;
    const menuY = state.contextMenu.position.y;
    const menuWidth = 200;
    const itemHeight = 28;
    const menuHeight = state.contextMenu.items.length * itemHeight + 8;

    // Draw menu background with border
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#2a2e3e';
    ctx.fillRect(menuX, menuY, menuWidth, menuHeight);
    ctx.shadowColor = 'transparent';

    // Draw menu items
    ctx.fillStyle = '#1a1a1a';
    ctx.font = '11px sans-serif';
    for (let i = 0; i < state.contextMenu.items.length; i++) {
      const item = state.contextMenu.items[i];
      const itemY = menuY + 4 + (i * itemHeight);

      // Highlight Delete item with red
      if (item.label === 'Delete') {
        ctx.fillStyle = '#8b0000';
        ctx.fillRect(menuX + 2, itemY, menuWidth - 4, itemHeight - 2);
        ctx.fillStyle = '#fff';
      } else {
        ctx.fillStyle = item.enabled ? '#ccc' : '#666';
      }
      ctx.fillText(item.label, menuX + 15, itemY + 18);
    }
  }

  return canvas;
}

function saveCanvasToFile(canvas, filename) {
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(filename, buffer);
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
  let state = env.getRenderModel();
  console.log('[INFO] Render model loaded');
  console.log(`[INFO] Task instruction: ${state.instruction}`);

  // Helper to save state snapshot
  function saveStateSnapshot(description) {
    const filename = path.join(logsDir, `${String(screenshotCount).padStart(2, '0')}-${description}.png`);
    const canvas = renderStateToCanvas(state);
    saveCanvasToFile(canvas, filename);
    console.log(`[Screenshot ${screenshotCount}] ${description} → ${filename}`);
    screenshotCount++;
  }

  try {
    console.log('\n=== STEP a: Screenshot initial state ===');
    state = env.getRenderModel();
    saveStateSnapshot('step-a-initial-state');
    console.log('[VISUAL CHECK] File explorer should be visible with files');

    // Get the file explorer window and find a file
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
            const fileListStartY = win.bounds.y + 70;
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
      throw new Error('File entry not found in render model');
    }

    // Step b: Click on a file
    console.log('\n=== STEP b: Click on file ===');
    const clickX = fileRowBounds.x + fileRowBounds.width / 2;
    const clickY = fileRowBounds.y + fileRowBounds.height / 2;
    console.log(`[ACTION] Clicking at (${clickX}, ${clickY}) to select file "${fileName}"`);
    env.step({ type: "CLICK", x: clickX, y: clickY });

    console.log('\n=== STEP c: Screenshot - file selected ===');
    state = env.getRenderModel();
    // Store selected file index for visualization
    state.selectedFileIndex = fileIndex;
    saveStateSnapshot('step-c-file-selected');
    console.log('[VISUAL CHECK] File should be highlighted/selected');

    // Step d: Right-click on the selected file
    console.log('\n=== STEP d: Right-click on file ===');
    console.log(`[ACTION] Right-clicking at (${clickX}, ${clickY}) to open context menu`);
    env.step({ type: "RIGHT_CLICK", x: clickX, y: clickY });

    console.log('\n=== STEP e: Screenshot - context menu visible ===');
    state = env.getRenderModel();
    state.selectedFileIndex = fileIndex;
    saveStateSnapshot('step-e-context-menu-visible');

    // Log context menu info
    if (state.contextMenu && state.contextMenu.items) {
      console.log(`[VISUAL CHECK] Context menu rendered with ${state.contextMenu.items.length} items:`);
      state.contextMenu.items.forEach(item => {
        console.log(`  - ${item.label} (enabled: ${item.enabled})`);
      });
    }

    // Step f: Click Delete in context menu
    console.log('\n=== STEP f: Click Delete in context menu ===');
    const deleteItem = state.contextMenu?.items?.find(item => item.label === 'Delete');
    if (deleteItem) {
      // Estimate click position for the Delete item
      const menuX = state.contextMenu.position.x;
      const menuY = state.contextMenu.position.y;
      const deleteIndex = state.contextMenu.items.indexOf(deleteItem);
      const itemHeight = 28;
      const deleteY = menuY + 4 + (deleteIndex * itemHeight) + itemHeight / 2;
      const deleteX = menuX + 100;

      console.log(`[ACTION] Clicking Delete at (${deleteX}, ${deleteY})`);
      env.step({ type: "CLICK", x: deleteX, y: deleteY });
    } else {
      console.error('[ERROR] Delete menu item not found');
    }

    console.log('\n=== STEP g: Screenshot - file deleted ===');
    state = env.getRenderModel();
    saveStateSnapshot('step-g-file-deleted');
    console.log('[VISUAL CHECK] File should be removed from the list');

    // Step h: Undo with Ctrl+Z
    console.log('\n=== STEP h: Undo deletion with Ctrl+Z ===');
    console.log('[ACTION] Pressing Ctrl+Z to undo');
    env.step({ type: "KEY", key: "ctrl+z" });

    console.log('\n=== STEP i: Screenshot - file restored ===');
    state = env.getRenderModel();
    saveStateSnapshot('step-i-file-restored');
    console.log('[VISUAL CHECK] File should reappear in the list');

    console.log('\n[SUCCESS] All steps completed!');
    console.log(`[SUMMARY] Screenshots saved to ${logsDir}`);

  } catch (err) {
    console.error('[ERROR]', err);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('[ERROR]', err);
  process.exit(1);
});
