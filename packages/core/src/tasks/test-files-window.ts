/**
 * Quick validation: reset every FILES_WINDOW task with each seed and report pass/fail.
 *
 * Usage:  npx tsx packages/core/src/tasks/test-files-window.ts
 */

import { MockOsEnv } from "../env/session.js";
import { FILES_WINDOW_TASKS } from "./files-window-tasks.js";

const env = new MockOsEnv();
let pass = 0;
let fail = 0;
const failures: string[] = [];

for (const task of FILES_WINDOW_TASKS) {
  for (const seed of task.seedDefaults) {
    const label = `${task.id} (seed=${seed})`;
    try {
      const result = env.reset({ taskId: task.id, seed });

      // Basic sanity checks
      if (!result.observation) throw new Error("no observation");
      if (!result.observation.a11yTree || result.observation.a11yTree.length === 0)
        throw new Error("empty a11y tree");
      if (result.terminated) throw new Error("terminated on reset");
      if (result.truncated) throw new Error("truncated on reset");

      pass++;
    } catch (err: unknown) {
      fail++;
      const msg = err instanceof Error ? err.message : String(err);
      failures.push(`  FAIL  ${label}: ${msg}`);
    }
  }
}

console.log(`\n=== Files + Window/Shell Task Validation ===`);
console.log(`Total instances: ${pass + fail}  (${FILES_WINDOW_TASKS.length} tasks × seeds)`);
console.log(`Pass: ${pass}`);
console.log(`Fail: ${fail}`);

if (failures.length > 0) {
  console.log(`\nFailures:`);
  for (const f of failures) console.log(f);
}

console.log();
process.exit(fail > 0 ? 1 : 0);
