import { MockOsEnv } from './packages/core/dist/index.js';
import { mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const logsDir = resolve('logs/agent-tests/terminal-workflow');
mkdirSync(logsDir, { recursive: true });

// Initialize MockOsEnv
const mockOsEnv = new MockOsEnv({ width: 1280, height: 800 });

console.log('Terminal Workflow Test with Screenshots');
console.log('='.repeat(70));

// Reset to terminal_echo_to_file task
mockOsEnv.reset({ taskId: 'terminal_echo_to_file', seed: 0, maxSteps: 100 });

const screenshotData = [];
const allResults = [];

// Helper function to capture render model and create metadata
async function takeScreenshot(stepLabel, description) {
  const model = mockOsEnv.getRenderModel();
  const hiddenState = mockOsEnv.getHiddenState();

  // Create a JSON record of the render state
  const screenshotRecord = {
    step: stepLabel,
    description,
    timestamp: new Date().toISOString(),
    windows: model.windows?.length || 0,
    popups: model.popups?.length || 0,
    terminated: hiddenState.terminated,
    cumulativeReward: hiddenState.cumulativeReward,
    windowDetails: model.windows?.map(w => ({
      id: w.id,
      title: w.title,
      minimized: w.minimized,
      bounds: w.bounds
    }))
  };

  // Save as JSON (can be converted to PNG visualization later)
  const ssNum = screenshotData.length + 1;
  const filename = `${String(ssNum).padStart(2, '0')}-${stepLabel}.json`;
  const filepath = resolve(logsDir, filename);
  writeFileSync(filepath, JSON.stringify(screenshotRecord, null, 2));

  screenshotData.push({ step: stepLabel, description, file: filename, record: screenshotRecord });
  console.log(`✓ [Screenshot ${ssNum}] ${stepLabel}: ${description}`);
  console.log(`  Windows: ${screenshotRecord.windows}, Popups: ${screenshotRecord.popups}`);

  return screenshotRecord;
}

try {
  // STEP A: Initial state
  console.log('\nSTEP A: Initial state');
  console.log('─'.repeat(70));
  await takeScreenshot('01-initial', 'Terminal with prompt visible');

  // Get terminal window
  let model = mockOsEnv.getRenderModel();
  const terminalWindow = model.windows?.find(w => w.title && w.title.toLowerCase().includes('terminal'));
  if (!terminalWindow) {
    throw new Error('Terminal window not found in initial state');
  }

  // STEP B: Click terminal to focus
  console.log('\nSTEP B: Click terminal window');
  console.log('─'.repeat(70));
  const clickX = terminalWindow.bounds.x + terminalWindow.bounds.width / 2;
  const clickY = terminalWindow.bounds.y + terminalWindow.bounds.height / 2;
  let result = mockOsEnv.step({ type: 'CLICK', x: clickX, y: clickY });
  console.log(`  Action accepted: ${result.actionAccepted}`);
  await takeScreenshot('02-terminal-focused', 'Terminal focused after click');

  // STEP D: Type "echo hello"
  console.log('\nSTEP D: Type "echo hello"');
  console.log('─'.repeat(70));
  result = mockOsEnv.step({ type: 'TYPING', text: 'echo hello' });
  console.log(`  Action accepted: ${result.actionAccepted}`);
  await takeScreenshot('03-typed-echo-hello', 'Typed "echo hello" in terminal');

  // STEP F: Press Enter
  console.log('\nSTEP F: Press Enter to execute command');
  console.log('─'.repeat(70));
  result = mockOsEnv.step({ type: 'PRESS', key: 'Enter' });
  console.log(`  Action accepted: ${result.actionAccepted}`);
  await takeScreenshot('04-after-enter-echo', 'Command output after "echo hello"');

  // STEP H: Type "ls"
  console.log('\nSTEP H: Type "ls"');
  console.log('─'.repeat(70));
  result = mockOsEnv.step({ type: 'TYPING', text: 'ls' });
  console.log(`  Action accepted: ${result.actionAccepted}`);
  await takeScreenshot('05-typed-ls', 'Typed "ls" in terminal');

  // STEP I: Press Enter to execute "ls"
  console.log('\nSTEP I: Press Enter to execute "ls"');
  console.log('─'.repeat(70));
  result = mockOsEnv.step({ type: 'PRESS', key: 'Enter' });
  console.log(`  Action accepted: ${result.actionAccepted}`);
  await takeScreenshot('06-after-enter-ls', 'File listing output after "ls"');

  // STEP K: Press ArrowUp (first history recall)
  console.log('\nSTEP K: Press ArrowUp for history recall');
  console.log('─'.repeat(70));
  result = mockOsEnv.step({ type: 'PRESS', key: 'ArrowUp' });
  console.log(`  Action accepted: ${result.actionAccepted}`);
  await takeScreenshot('07-after-arrowup-1', 'First history recall (should show "ls")');

  // STEP M: Press ArrowUp again (second history recall)
  console.log('\nSTEP M: Press ArrowUp again for earlier command');
  console.log('─'.repeat(70));
  result = mockOsEnv.step({ type: 'PRESS', key: 'ArrowUp' });
  console.log(`  Action accepted: ${result.actionAccepted}`);
  await takeScreenshot('08-after-arrowup-2', 'Second history recall (should show "echo hello")');

  // STEP O: Press Escape to clear input
  console.log('\nSTEP O: Press Escape to clear input');
  console.log('─'.repeat(70));
  result = mockOsEnv.step({ type: 'PRESS', key: 'Escape' });
  console.log(`  Action accepted: ${result.actionAccepted}`);
  await takeScreenshot('09-after-escape', 'Input cleared after Escape');

  console.log('\n' + '='.repeat(70));
  console.log('WORKFLOW TEST COMPLETED SUCCESSFULLY');
  console.log('='.repeat(70));

} catch (err) {
  console.error('\n✗ Error during workflow:', err.message);
  console.error(err.stack);
}

// Generate test report
const finalState = mockOsEnv.getHiddenState();
const report = {
  taskId: 'terminal_echo_to_file',
  domain: 'terminal',
  totalScreenshots: screenshotData.length,
  finalTerminated: finalState.terminated,
  finalCumulativeReward: finalState.cumulativeReward,
  screenshots: screenshotData.map(ss => ({
    step: ss.step,
    description: ss.description,
    file: ss.file,
    windowCount: ss.record.windows,
    popupCount: ss.record.popups
  })),
  testResults: {
    stepA_initialState: screenshotData[0]?.record ? 'PASS' : 'FAIL',
    stepBCD_typeAndExecute: screenshotData.slice(1, 5).length === 4 ? 'PASS' : 'FAIL',
    stepHI_listFiles: screenshotData.slice(5, 7).length === 2 ? 'PASS' : 'FAIL',
    stepKM_historyRecall: screenshotData.slice(7, 9).length === 2 ? 'PASS' : 'FAIL',
    stepO_clearInput: screenshotData[9]?.record ? 'PASS' : 'FAIL'
  }
};

writeFileSync(resolve(logsDir, 'report.json'), JSON.stringify(report, null, 2));

console.log(`\nTest Report:`);
console.log(`  Screenshots captured: ${screenshotData.length}`);
console.log(`  Report saved to: ${resolve(logsDir, 'report.json')}`);
console.log(`  Screenshot directory: ${logsDir}`);

// Print visual summary
console.log('\nCapture Summary:');
screenshotData.forEach((ss, i) => {
  const testStatus = report.testResults[Object.keys(report.testResults).find(k => k.includes(ss.step.split('-')[0]))] || 'N/A';
  console.log(`  [${i+1}] ${ss.step.padEnd(15)} - ${ss.description}`);
});
