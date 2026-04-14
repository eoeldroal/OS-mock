import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { chromium } from 'playwright';

const rootDir = '/Users/baghyeonbin/Desktop/CoWork';
const artifactDir = resolve(rootDir, 'output/playwright/live-audits/browser-' + new Date().toISOString().replace(/[:.]/g, '-'));
await mkdir(artifactDir, { recursive: true });

const serverEntry = resolve(rootDir, 'packages/mcp-server/dist/index.js');
const env = { ...process.env, OS_MOCK_PORT: '4707' };
const transport = new StdioClientTransport({ command: 'node', args: [serverEntry], env });
const client = new Client({ name: 'browser-live-audit', version: '0.1.0' });
const parse = (result: any) => JSON.parse(result.content.find((item: any) => item.type === 'text').text);
const flatten = (nodes: any[]): any[] => nodes.flatMap((n) => [n, ...(n.children ? flatten(n.children) : [])]);
const center = (b: any) => ({ x: b.x + Math.round(b.width / 2), y: b.y + Math.round(b.height / 2) });
const report: { artifacts: string[]; steps: Array<Record<string, unknown>> } = { artifacts: [], steps: [] };

function pushStep(label: string, extra: Record<string, unknown> = {}) { report.steps.push({ label, ...extra }); }
async function snap(page: import('playwright').Page, name: string) {
  const path = resolve(artifactDir, name);
  await page.screenshot({ path, fullPage: true });
  report.artifacts.push(path);
}
async function tool(name: string, args: Record<string, unknown>) { return parse(await client.callTool({ name, arguments: args })); }
async function observe(sessionId: string) { return tool('computer13.observe', { sessionId }); }
function find(nodes: any[], pred: (n: any) => boolean) { return flatten(nodes).find(pred); }
async function waitForNode(sessionId: string, page: import('playwright').Page, pred: (n:any)=>boolean, attempts = 12, delayMs = 350) {
  for (let index = 0; index < attempts; index += 1) {
    const obs = await observe(sessionId);
    const node = find(obs.observation.a11yTree, pred);
    if (node) return node;
    await page.waitForTimeout(delayMs);
  }
  throw new Error('Required node not found');
}

let browser: import('playwright').Browser | undefined;
try {
  await client.connect(transport);
  const created = await tool('trainer.create_session', {});
  const sessionId = created.sessionId as string;
  const reset = await tool('trainer.reset', { sessionId, taskId: 'browser_log_workflow_task_id', seed: 0, maxSteps: 0 });
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(reset.observation.viewerUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
  await snap(page, '01-google-start.png');
  pushStep('google_start', { viewerUrl: reset.observation.viewerUrl });

  const initialObs = await observe(sessionId);
  const osworldTab = find(initialObs.observation.a11yTree, (n) => n.role === 'button' && n.name === 'OSWorld Explorer');
  if (!osworldTab) throw new Error('OSWorld tab not found');
  const osworldPoint = center(osworldTab.bounds);
  await page.mouse.click(osworldPoint.x, osworldPoint.y);
  await page.waitForTimeout(1000);
  await snap(page, '02-osworld-tab.png');
  pushStep('clicked_osworld_tab', { point: osworldPoint });

  const workflow = await waitForNode(sessionId, page, (n) => (n.name || '') === 'Workflow');
  const workflowPoint = center(workflow.bounds);
  await page.mouse.click(workflowPoint.x, workflowPoint.y);
  await page.waitForTimeout(700);
  await snap(page, '03-workflow-category.png');
  pushStep('clicked_workflow', { point: workflowPoint });

  const task1 = await waitForNode(sessionId, page, (n) => n.role === 'listitem' && (n.name || '') === 'Task 1');
  const taskPoint = center(task1.bounds);
  await page.mouse.click(taskPoint.x, taskPoint.y);
  await page.waitForTimeout(700);
  await snap(page, '04-task-1-selected.png');
  pushStep('clicked_task_1', { point: taskPoint });

  const addressBar = await waitForNode(sessionId, page, (n) => n.role === 'textbox' && n.name === 'Address bar');
  const addressPoint = center(addressBar.bounds);
  await page.mouse.click(addressPoint.x, addressPoint.y);
  await page.waitForTimeout(300);
  await page.keyboard.type('example.com', { delay: 30 });
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2500);
  await snap(page, '05-example-dot-com.png');
  pushStep('navigated_example', { point: addressPoint });

  await page.mouse.wheel(0, 900);
  await page.waitForTimeout(900);
  await snap(page, '06-example-scrolled.png');
  pushStep('scrolled_example');

  const reportPath = resolve(artifactDir, 'report.json');
  await writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ artifactDir, artifacts: report.artifacts, reportPath }, null, 2));
} finally {
  if (browser) await browser.close().catch(() => {});
  await client.close().catch(() => {});
}
