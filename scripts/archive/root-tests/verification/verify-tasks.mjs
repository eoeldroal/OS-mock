import { MockOsEnv } from "./packages/core/dist/index.js";

const env = new MockOsEnv();
const allTasks = env.listTasks("all");
console.log(`Total tasks: ${allTasks.length}`);
console.log("Tasks:");
for (const t of allTasks) {
  console.log(`  ${t.id} (${t.domain}, ${t.split})`);
}

// Verify every task can reset with seed 0, 1, 2
let failures = 0;
for (const task of allTasks) {
  for (const seed of [0, 1, 2]) {
    try {
      const obs = env.reset({ taskId: task.id, seed });
      if (!obs.task) {
        console.log(`❌ ${task.id} seed=${seed}: no task in observation`);
        failures++;
      }
    } catch (err) {
      console.log(`❌ ${task.id} seed=${seed}: ${err.message}`);
      failures++;
    }
  }
}
console.log(`\nReset verification: ${allTasks.length * 3} resets, ${failures} failures`);
if (failures === 0) {
  console.log("✅ All tasks registered and can be reset successfully!");
}
