import { MockOsEnv } from './packages/core/dist/index.js';
import { mkdirSync } from 'fs';
import { resolve } from 'path';

const logsDir = resolve('logs/agent-tests/terminal-workflow');
mkdirSync(logsDir, { recursive: true });

// Initialize MockOsEnv
const mockOsEnv = new MockOsEnv({ width: 1280, height: 800 });

console.log('Initializing terminal workflow test...\n');

// Reset to terminal_echo_to_file task
mockOsEnv.reset({ taskId: 'terminal_echo_to_file', seed: 0, maxSteps: 100 });

// Get initial state
let model = mockOsEnv.getRenderModel();
let hiddenState = mockOsEnv.getHiddenState();

console.log('Initial state:');
console.log(`  Windows: ${model.windows?.length || 0}`);
console.log(`  Terminated: ${hiddenState.terminated}`);
console.log(`  Cumulative Reward: ${hiddenState.cumulativeReward}`);
console.log('');

const results = [];
const actions = [];

// Helper to find terminal window
function getTerminalWindow() {
  return model.windows?.find(w => w.title && w.title.toLowerCase().includes('terminal'));
}

// Helper to save action and results
function recordAction(step, description, action, result) {
  actions.push({ step, description, action, accepted: result.actionAccepted });
  results.push({
    step,
    description,
    actionAccepted: result.actionAccepted,
    reward: result.reward,
    terminated: result.terminated,
    info: result.info?.actionSummary
  });
  console.log(`[${step}] ${description}`);
  if (!result.actionAccepted) console.log(`     ✗ Action rejected: ${result.info?.actionSummary}`);
  if (result.reward !== 0) console.log(`     ⚠ Reward: ${result.reward}`);
}

try {
  // STEP A: Initial state - just observe
  console.log('━'.repeat(70));
  console.log('STEP A: Initial state - screenshot would be taken here');
  console.log('━'.repeat(70));
  results.push({ step: 'a', action: 'Initial observation', status: 'CAPTURED' });

  // STEP B-C: Find and click terminal window
  console.log('\nSTEP B-C: Clicking on terminal window to focus');
  const terminalWindow = getTerminalWindow();
  if (terminalWindow) {
    const clickX = terminalWindow.bounds.x + terminalWindow.bounds.width / 2;
    const clickY = terminalWindow.bounds.y + terminalWindow.bounds.height / 2;
    const clickAction = { type: 'CLICK', x: clickX, y: clickY };
    let result = mockOsEnv.step(clickAction);
    recordAction('b-c', 'Click terminal window', clickAction, result);
    model = mockOsEnv.getRenderModel();
  } else {
    console.log('  ✗ No terminal window found!');
    results.push({ step: 'b-c', error: 'Terminal window not found', status: 'FAILED' });
  }

  // STEP D-E: Type "echo hello"
  console.log('\nSTEP D-E: Typing "echo hello"');
  const typeAction = { type: 'TYPING', text: 'echo hello' };
  let result = mockOsEnv.step(typeAction);
  recordAction('d-e', 'Type "echo hello"', typeAction, result);
  model = mockOsEnv.getRenderModel();

  // STEP F-G: Press Enter to execute command
  console.log('\nSTEP F-G: Pressing Enter to execute command');
  const enterAction = { type: 'PRESS', key: 'Enter' };
  result = mockOsEnv.step(enterAction);
  recordAction('f-g', 'Press Enter (execute "echo hello")', enterAction, result);
  model = mockOsEnv.getRenderModel();
  hiddenState = mockOsEnv.getHiddenState();

  // STEP H-I: Type "ls" and press Enter
  console.log('\nSTEP H-I: Typing "ls" and pressing Enter');
  const lsAction = { type: 'TYPING', text: 'ls' };
  result = mockOsEnv.step(lsAction);
  recordAction('h1', 'Type "ls"', lsAction, result);
  model = mockOsEnv.getRenderModel();

  result = mockOsEnv.step(enterAction);
  recordAction('i', 'Press Enter (execute "ls")', enterAction, result);
  model = mockOsEnv.getRenderModel();

  // STEP J: File listing is now visible
  console.log('\nSTEP J: File listing output is visible');
  results.push({ step: 'j', action: 'File listing visible', status: 'CAPTURED' });

  // STEP K-L: Press ArrowUp to recall previous command
  console.log('\nSTEP K-L: Pressing ArrowUp to recall previous command');
  const arrowUpAction = { type: 'PRESS', key: 'ArrowUp' };
  result = mockOsEnv.step(arrowUpAction);
  recordAction('k-l', 'Press ArrowUp (first recall)', arrowUpAction, result);
  model = mockOsEnv.getRenderModel();

  // STEP M-N: Press ArrowUp again to recall earlier command
  console.log('\nSTEP M-N: Pressing ArrowUp again to recall earlier command');
  result = mockOsEnv.step(arrowUpAction);
  recordAction('m-n', 'Press ArrowUp (second recall)', arrowUpAction, result);
  model = mockOsEnv.getRenderModel();

  // STEP O-P: Press Escape to clear input
  console.log('\nSTEP O-P: Pressing Escape to clear input');
  const escapeAction = { type: 'PRESS', key: 'Escape' };
  result = mockOsEnv.step(escapeAction);
  recordAction('o-p', 'Press Escape (clear input)', escapeAction, result);
  model = mockOsEnv.getRenderModel();

  console.log('\n' + '='.repeat(70));
  console.log('WORKFLOW TEST COMPLETED');
  console.log('='.repeat(70));

} catch (err) {
  console.error('\n✗ Error during workflow:', err.message);
  console.error(err.stack);
  results.push({ error: err.message, stack: err.stack, status: 'FAILED' });
}

// Final summary
const finalState = mockOsEnv.getHiddenState();
console.log(`\nFinal State:`);
console.log(`  Terminated: ${finalState.terminated}`);
console.log(`  Truncated: ${finalState.truncated}`);
console.log(`  Cumulative Reward: ${finalState.cumulativeReward}`);

console.log(`\nActions Executed: ${actions.length}`);
console.log(`Results Summary:`);
let passCount = 0, failCount = 0;
results.forEach(r => {
  if (r.status === 'FAILED' || r.error) {
    failCount++;
    console.log(`  ✗ [${r.step}] ${r.description || r.error}`);
  } else if (!r.actionAccepted && r.step) {
    failCount++;
    console.log(`  ✗ [${r.step}] ${r.description} - rejected`);
  } else {
    passCount++;
    console.log(`  ✓ [${r.step}] ${r.description}`);
  }
});

console.log(`\nSUMMARY: ${passCount} passed, ${failCount} failed`);
console.log(`Logs directory: ${logsDir}`);
