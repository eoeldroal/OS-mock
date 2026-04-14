import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { chromium } from 'playwright';

const root = '/Users/baghyeonbin/Desktop/CoWork';
const port = '4624';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const artifactDir = resolve(root, 'output', 'playwright', 'live-audits', `shell-mail-terminal-${stamp}`);
const serverEntry = resolve(root, 'packages/mcp-server/dist/index.js');
const parse = (result) => JSON.parse(result.content?.find((item) => item.type === 'text')?.text ?? '{}');
const flatten = (nodes) => nodes.flatMap((node) => [node, ...flatten(node.children ?? [])]);
const findNode = (nodes, pred) => {
  const match = flatten(nodes).find(pred);
  if (!match) throw new Error('Required a11y node not found');
  return match;
};
const center = (b) => ({ x: b.x + Math.round(b.width / 2), y: b.y + Math.round(b.height / 2) });
async function shot(page, name) {
  const path = resolve(artifactDir, name);
  await page.screenshot({ path, fullPage: true });
  return path;
}
async function call(client, name, args) {
  return parse(await client.callTool({ name, arguments: args }));
}
async function wait(page, ms = 320) {
  await page.waitForTimeout(ms);
}
async function observe(client, sessionId) {
  return call(client, 'computer13.observe', { sessionId });
}
await mkdir(artifactDir, { recursive: true });
const transport = new StdioClientTransport({ command: 'node', args: [serverEntry], env: { ...process.env, OS_MOCK_PORT: port } });
const client = new Client({ name: 'live-shell-audit', version: '0.1.0' });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const artifacts = [];
const findings = [];
try {
  await client.connect(transport);
  const created = await call(client, 'trainer.create_session', {});
  const sessionId = created.sessionId;

  let reset = await call(client, 'trainer.reset', { sessionId, taskId: 'rename_note_in_explorer', seed: 0 });
  await page.goto(reset.observation.viewerUrl, { waitUntil: 'domcontentloaded' });
  await wait(page, 400);
  artifacts.push(await shot(page, '00-shell-initial.png'));
  let observed = await observe(client, sessionId);
  const filesWindow = findNode(observed.observation.a11yTree, (n) => n.role === 'window' && /files/i.test(n.name));
  const dragStart = { x: filesWindow.bounds.x + Math.round(filesWindow.bounds.width / 2), y: filesWindow.bounds.y + 18 };
  await page.mouse.move(dragStart.x, dragStart.y);
  await page.mouse.down();
  await page.mouse.move(18, 78, { steps: 14 });
  await page.mouse.up();
  await wait(page, 420);
  artifacts.push(await shot(page, '01-shell-dragged-left-edge.png'));
  findings.push('Dragged Files to the left edge; it remained a floating window instead of snapping/tiled layout.');

  reset = await call(client, 'trainer.reset', { sessionId, taskId: 'mail_extract_mock_note', seed: 0 });
  await page.goto(reset.observation.viewerUrl, { waitUntil: 'domcontentloaded' });
  await wait(page, 420);
  artifacts.push(await shot(page, '02-mail-initial.png'));
  observed = await observe(client, sessionId);
  const messageNode = findNode(observed.observation.a11yTree, (n) => n.role === 'listitem' && String(n.name).includes('Mock environment notes'));
  const msg = center(messageNode.bounds);
  await page.mouse.click(msg.x, msg.y);
  await wait(page, 360);
  artifacts.push(await shot(page, '03-mail-message-selected.png'));
  observed = await observe(client, sessionId);
  const previewLine = findNode(observed.observation.a11yTree, (n) => n.role === 'label' && String(n.text).includes('Remember to test perturbations'));
  const prev = center(previewLine.bounds);
  await page.mouse.click(prev.x, prev.y);
  await wait(page, 250);
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+C' : 'Control+C');
  await wait(page, 250);
  artifacts.push(await shot(page, '04-mail-copied.png'));

  reset = await call(client, 'trainer.reset', { sessionId, taskId: 'terminal_record_working_directory', seed: 0 });
  await page.goto(reset.observation.viewerUrl, { waitUntil: 'domcontentloaded' });
  await wait(page, 420);
  artifacts.push(await shot(page, '05-terminal-initial.png'));
  observed = await observe(client, sessionId);
  const terminalInput = findNode(observed.observation.a11yTree, (n) => n.role === 'textbox' && n.name === 'Terminal session');
  const term = { x: terminalInput.bounds.x + 20, y: terminalInput.bounds.y + 10 };
  await page.mouse.click(term.x, term.y);
  await wait(page, 250);
  await page.keyboard.type('pwd', { delay: 35 });
  await page.keyboard.press('Enter');
  await wait(page, 300);
  await page.keyboard.type('mkdir audit-folder', { delay: 30 });
  await page.keyboard.press('Enter');
  await wait(page, 300);
  await page.keyboard.type('cd audit-folder', { delay: 30 });
  await page.keyboard.press('Enter');
  await wait(page, 360);
  artifacts.push(await shot(page, '06-terminal-after-commands.png'));
  observed = await observe(client, sessionId);
  const selectedLine = findNode(observed.observation.a11yTree, (n) => n.role === 'label' && String(n.text).includes('/workspace/audit-folder'));
  const selected = center(selectedLine.bounds);
  await page.mouse.click(selected.x, selected.y);
  await wait(page, 250);
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+C' : 'Control+C');
  await wait(page, 250);
  artifacts.push(await shot(page, '07-terminal-copied.png'));

  const report = { generatedAt: new Date().toISOString(), sessionId, viewerUrl: `http://127.0.0.1:${port}/session/${sessionId}`, artifacts, findings };
  await writeFile(resolve(artifactDir, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await page.close();
  await browser.close();
  await client.close();
}
