#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "../../..");
const serverEntry = resolve(rootDir, "packages/mcp-server/dist/index-solver.js");

function parseArgs(argv) {
  const args = {
    task: "",
    seed: 0,
    maxSteps: undefined,
    port: 4461,
    actionsFile: "",
    outDir: ""
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--task") {
      args.task = argv[++i] ?? "";
      continue;
    }
    if (token === "--seed") {
      args.seed = Number(argv[++i] ?? "0");
      continue;
    }
    if (token === "--max-steps") {
      args.maxSteps = Number(argv[++i] ?? "0");
      continue;
    }
    if (token === "--port") {
      args.port = Number(argv[++i] ?? "4461");
      continue;
    }
    if (token === "--actions") {
      args.actionsFile = argv[++i] ?? "";
      continue;
    }
    if (token === "--out-dir") {
      args.outDir = argv[++i] ?? "";
      continue;
    }
    throw new Error(`Unknown argument: ${token}`);
  }

  if (!args.task) {
    throw new Error("Missing required --task <taskId>.");
  }
  if (!args.actionsFile) {
    throw new Error("Missing required --actions <json-file>.");
  }

  return args;
}

function defaultOutDir(taskId) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return resolve(rootDir, "output", "manual", "solver-runs", `${taskId}-${stamp}`);
}

function loadSequenceDefinition(filePath) {
  const parsed = JSON.parse(readFileSync(resolve(filePath), "utf8"));
  if (Array.isArray(parsed)) {
    return {
      name: null,
      expectedLine: null,
      manualReview: null,
      reviewChecks: [],
      actions: parsed
    };
  }

  if (!Array.isArray(parsed.actions)) {
    throw new Error("Sequence JSON must be an array or an object with an actions array.");
  }

  return {
    name: parsed.name ?? null,
    expectedLine: parsed.expectedLine ?? null,
    manualReview: parsed.manualReview ?? null,
    reviewChecks: Array.isArray(parsed.reviewChecks) ? parsed.reviewChecks : [],
    actions: parsed.actions
  };
}

function buildReviewCheckpoint({ label, stepIndex, manifest, expectation, category = "general" }) {
  if (typeof stepIndex !== "number") {
    return null;
  }
  const step = manifest.find((entry) => entry.index === stepIndex);
  if (!step) {
    return {
      label,
      category,
      status: "missing-step",
      expected: expectation ?? null
    };
  }
  return {
    label,
    category,
    status: step.imageFile ? "needs-manual-review" : "missing-image",
    expected: expectation ?? null,
    imageFile: step.imageFile ?? null,
    jsonFile: step.jsonFile ?? null,
    tool: step.tool
  };
}

function buildManualReviewSummary(sequenceDefinition, manifest) {
  const checks = [];
  const review = sequenceDefinition.manualReview;

  if (review) {
    checks.push(
      buildReviewCheckpoint({
        label: "Requested line visibility",
        stepIndex: review.requestedLineVisibleAtStep,
        manifest,
        expectation: sequenceDefinition.expectedLine
          ? `The highlighted requested line is visible and legible: "${sequenceDefinition.expectedLine}"`
          : "The requested line card is visible and legible.",
        category: "content"
      }),
      buildReviewCheckpoint({
        label: "Note text appearance",
        stepIndex: review.noteTextVisibleAtStep,
        manifest,
        expectation: sequenceDefinition.expectedLine
          ? `The note editor visibly contains the typed line: "${sequenceDefinition.expectedLine}"`
          : "The note editor visibly contains the typed line.",
        category: "content"
      }),
      buildReviewCheckpoint({
        label: "Note save state",
        stepIndex: review.noteSavedAtStep,
        manifest,
        expectation: "The note window still looks sane after save and shows a saved/clean state.",
        category: "save-state"
      })
    );
  }

  for (const check of sequenceDefinition.reviewChecks ?? []) {
    checks.push(
      buildReviewCheckpoint({
        label: check.label ?? "Manual review",
        stepIndex: check.stepIndex,
        manifest,
        expectation: check.expectation ?? null,
        category: check.category ?? "general"
      })
    );
  }

  const normalizedChecks = checks.filter(Boolean);
  if (normalizedChecks.length === 0) {
    return null;
  }

  return {
    checks: normalizedChecks,
    textOverlapChecks: normalizedChecks.filter((check) => check.category === "text-overlap")
  };
}

function buildReportMarkdown({ taskId, seed, maxSteps, port, manifest, sequenceDefinition, summary }) {
  const lines = [
    "# Solver Sequence Report",
    "",
    `- Task: \`${taskId}\``,
    `- Seed: \`${seed}\``,
    `- Max steps: \`${maxSteps ?? "task-default"}\``,
    `- Port: \`${port}\``,
    `- Captured steps: \`${manifest.length}\``,
    ""
  ];

  if (sequenceDefinition.name) {
    lines.splice(2, 0, `- Sequence: \`${sequenceDefinition.name}\``);
  }

  if (sequenceDefinition.expectedLine) {
    lines.push(`- Expected requested line: \`${sequenceDefinition.expectedLine}\``);
    lines.push("");
  }

  if (summary.manualReview) {
    if (summary.manualReview.textOverlapChecks?.length) {
      lines.push("## Text Overlap Checks");
      lines.push("");
      for (const item of summary.manualReview.textOverlapChecks) {
        lines.push(`- ${item.label}: \`${item.status}\``);
        if (item.expected) lines.push(`  Expectation: ${item.expected}`);
        if (item.imageFile) lines.push(`  Inspect image: [${item.imageFile}](${item.imageFile})`);
        if (item.jsonFile) lines.push(`  Step payload: [${item.jsonFile}](${item.jsonFile})`);
      }
      lines.push("");
    }

    const nonOverlapChecks = summary.manualReview.checks.filter(
      (item) => item.category !== "text-overlap"
    );

    if (nonOverlapChecks.length) {
    lines.push("## Manual Review Focus");
    lines.push("");
    for (const item of nonOverlapChecks) {
      lines.push(`- ${item.label}: \`${item.status}\``);
      if (item.expected) lines.push(`  Expectation: ${item.expected}`);
      if (item.imageFile) lines.push(`  Inspect image: [${item.imageFile}](${item.imageFile})`);
      if (item.jsonFile) lines.push(`  Step payload: [${item.jsonFile}](${item.jsonFile})`);
    }
    lines.push("");
    }
  }

  for (const step of manifest) {
    lines.push(`## ${String(step.index).padStart(2, "0")} · \`${step.tool}\``);
    lines.push("");
    lines.push(`- Args: \`${JSON.stringify(step.args)}\``);
    lines.push(`- stepIndex: \`${step.stepIndex ?? "n/a"}\``);
    lines.push(`- actionAccepted: \`${step.actionAccepted ?? "n/a"}\``);
    lines.push(`- terminated: \`${step.terminated ?? "n/a"}\``);
    lines.push(`- truncated: \`${step.truncated ?? "n/a"}\``);
    lines.push(`- JSON: [${step.jsonFile}](${step.jsonFile})`);
    if (step.imageFile) {
      lines.push(`- Image: [${step.imageFile}](${step.imageFile})`);
      lines.push("");
      lines.push(`![${step.imageFile}](${step.imageFile})`);
    }
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const sequenceDefinition = loadSequenceDefinition(args.actionsFile);
  const actions = sequenceDefinition.actions;
  const outDir = args.outDir ? resolve(args.outDir) : defaultOutDir(args.task);
  mkdirSync(outDir, { recursive: true });

  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [serverEntry],
    cwd: rootDir,
    env: {
      ...process.env,
      OS_MOCK_PORT: String(args.port),
      OS_MOCK_SOLVER_TASK_ID: args.task,
      OS_MOCK_SOLVER_TASK_SEED: String(args.seed),
      ...(args.maxSteps !== undefined
        ? { OS_MOCK_SOLVER_MAX_STEPS: String(args.maxSteps) }
        : {})
    },
    stderr: "pipe"
  });

  transport.stderr?.on("data", (chunk) => {
    process.stderr.write(String(chunk));
  });

  const client = new Client(
    {
      name: "solver-sequence-runner",
      version: "0.1.0"
    },
    { capabilities: {} }
  );

  await client.connect(transport);

  try {
    const manifest = [];
    const steps = [{ tool: "observe", args: {} }, ...actions];

    for (let index = 0; index < steps.length; index += 1) {
      const step = steps[index];
      const result = await client.callTool({
        name: step.tool,
        arguments: step.args
      });
      const textItem = result.content?.find((item) => item.type === "text");
      const imageItem = result.content?.find((item) => item.type === "image");
      const payload = textItem?.text ? JSON.parse(textItem.text) : null;
      const prefix = String(index).padStart(2, "0");

      const jsonPath = join(outDir, `${prefix}-${step.tool}.json`);
      writeFileSync(jsonPath, JSON.stringify(payload, null, 2));
      const jsonFile = `${prefix}-${step.tool}.json`;

      let imagePath = null;
      let imageFile = null;
      if (imageItem?.data) {
        imagePath = join(outDir, `${prefix}-${step.tool}.png`);
        imageFile = `${prefix}-${step.tool}.png`;
        writeFileSync(imagePath, Buffer.from(imageItem.data, "base64"));
      }

      manifest.push({
        index,
        tool: step.tool,
        args: step.args,
        jsonFile,
        imageFile,
        stepIndex: payload?.stepIndex,
        actionAccepted: payload?.actionAccepted,
        terminated: payload?.terminated,
        truncated: payload?.truncated
      });

      console.log(
        JSON.stringify(
          {
            index,
            tool: step.tool,
            stepIndex: payload?.stepIndex,
            actionAccepted: payload?.actionAccepted,
            terminated: payload?.terminated,
            truncated: payload?.truncated,
            imagePath
          },
          null,
          2
        )
      );

      if (payload?.terminated || payload?.truncated) {
        break;
      }
    }

    const summary = {
      taskId: args.task,
      seed: args.seed,
      maxSteps: args.maxSteps ?? "task-default",
      port: args.port,
      sequence: sequenceDefinition.name,
      expectedLine: sequenceDefinition.expectedLine,
      stepsCaptured: manifest.length,
      finalStep: manifest[manifest.length - 1] ?? null,
      manualReview: buildManualReviewSummary(sequenceDefinition, manifest)
    };

    writeFileSync(join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));
    writeFileSync(join(outDir, "summary.json"), JSON.stringify(summary, null, 2));
    writeFileSync(
      join(outDir, "README.md"),
      buildReportMarkdown({
        taskId: args.task,
        seed: args.seed,
        maxSteps: args.maxSteps,
        port: args.port,
        manifest,
        sequenceDefinition,
        summary
      })
    );
    console.log(`Artifacts written to ${outDir}`);
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
