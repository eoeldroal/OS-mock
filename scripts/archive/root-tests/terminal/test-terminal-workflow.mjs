import { MockOsEnv } from './packages/core/dist/index.js';
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { mkdirSync, writeFileSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { chromium } from 'playwright';

const logsDir = resolve('logs/agent-tests/terminal-workflow');
mkdirSync(logsDir, { recursive: true });

// Initialize MockOsEnv
const mockOsEnv = new MockOsEnv({ width: 1280, height: 800 });

// Initialize Fastify server
async function startServer(port) {
  const fastify = Fastify({ logger: false });
  try {
    const webAssetsDir = resolve('packages/web/dist/assets');
    await fastify.register(fastifyStatic, { root: webAssetsDir, prefix: '/assets/' });
  } catch {}
  fastify.get('/session/s1', async (_, reply) => {
    try {
      const html = readFileSync('packages/web/dist/index.html', 'utf8');
      return reply.type('text/html').send(html);
    } catch {
      return reply.type('text/html').send('<h1>Build web first</h1>');
    }
  });

  let currentModel = null;
  fastify.get('/api/sessions/s1/render-model', async () => currentModel);

  const setModel = (m) => {
    currentModel = m;
  };

  await fastify.listen({ host: '127.0.0.1', port });

  return { setModel, async close() { await fastify.close(); } };
}

console.log('Starting server...');
const server = await startServer(3000);
console.log('Server started on http://127.0.0.1:3000');

// Initialize and reset to task
mockOsEnv.reset({ taskId: 'terminal_echo_to_file', seed: 0, maxSteps: 100 });
server.setModel(mockOsEnv.getRenderModel());

console.log('Task reset successfully');

// Launch Playwright
const browser = await chromium.launch({ headless: false });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

console.log('Navigating to session...');
await page.goto('http://127.0.0.1:3000/session/s1');
await page.waitForTimeout(1500);

// Helper function to take screenshots
let screenshotCount = 0;
async function takeScreenshot(label) {
  screenshotCount++;
  const filename = resolve(logsDir, `${String(screenshotCount).padStart(2, '0')}-${label}.png`);
  await page.screenshot({ path: filename, fullPage: true });
  console.log(`[${screenshotCount}] Screenshot saved: ${label}`);
  return filename;
}

// Test sequence
const results = [];

try {
  // a. Initial state
  console.log('\n[STEP a] Taking initial screenshot...');
  await takeScreenshot('01-initial-state');
  results.push({ step: 'a', action: 'Initial state screenshot', status: 'CAPTURED' });

  // Find terminal window in page
  console.log('\n[STEP b] Looking for terminal window to click...');
  const terminalArea = page.locator('canvas').first(); // Try to find the main canvas or window
  await terminalArea.click({ position: { x: 400, y: 300 } });
  await page.waitForTimeout(200);

  // c. Screenshot - terminal focused
  console.log('\n[STEP c] Taking screenshot after terminal focus...');
  await takeScreenshot('02-terminal-focused');
  results.push({ step: 'b-c', action: 'Click terminal and screenshot', status: 'EXECUTED' });

  // d. Type "echo hello"
  console.log('\n[STEP d] Typing "echo hello"...');
  await page.keyboard.type('echo hello', { delay: 50 });
  await page.waitForTimeout(300);
  await takeScreenshot('03-typed-echo-hello');
  results.push({ step: 'd-e', action: 'Type "echo hello"', status: 'EXECUTED' });

  // f. Press Enter
  console.log('\n[STEP f] Pressing Enter to execute command...');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
  await takeScreenshot('04-after-enter-echo');
  results.push({ step: 'f-g', action: 'Press Enter and screenshot', status: 'EXECUTED' });

  // h-i. Type "ls" and press Enter
  console.log('\n[STEP h-i] Typing "ls" and pressing Enter...');
  await page.keyboard.type('ls', { delay: 50 });
  await page.waitForTimeout(300);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
  await takeScreenshot('05-after-enter-ls');
  results.push({ step: 'h-i', action: 'Type "ls" and press Enter', status: 'EXECUTED' });

  // j. Screenshot - file listing
  console.log('\n[STEP j] File listing should be visible...');
  results.push({ step: 'j', action: 'File listing visible', status: 'CAPTURED' });

  // k. Press ArrowUp (history recall - should show "ls")
  console.log('\n[STEP k] Pressing ArrowUp to recall previous command...');
  await page.keyboard.press('ArrowUp');
  await page.waitForTimeout(300);
  await takeScreenshot('06-after-arrowup-1');
  results.push({ step: 'k-l', action: 'Press ArrowUp (first recall)', status: 'EXECUTED' });

  // m. Press ArrowUp again (history recall - should show "echo hello")
  console.log('\n[STEP m] Pressing ArrowUp again for earlier command...');
  await page.keyboard.press('ArrowUp');
  await page.waitForTimeout(300);
  await takeScreenshot('07-after-arrowup-2');
  results.push({ step: 'm-n', action: 'Press ArrowUp (second recall)', status: 'EXECUTED' });

  // o. Press Escape (clear input)
  console.log('\n[STEP o] Pressing Escape to clear input...');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await takeScreenshot('08-after-escape');
  results.push({ step: 'o-p', action: 'Press Escape and clear input', status: 'EXECUTED' });

  console.log('\n✓ Workflow execution completed!');
} catch (err) {
  console.error('\n✗ Error during workflow:', err.message);
  results.push({ error: err.message, status: 'FAILED' });
}

// Print results summary
console.log('\n' + '='.repeat(70));
console.log('WORKFLOW TEST RESULTS');
console.log('='.repeat(70));
console.log(JSON.stringify(results, null, 2));

// Close browser and server
await browser.close();
await server.close();

console.log(`\n✓ Screenshots saved to: ${logsDir}`);
