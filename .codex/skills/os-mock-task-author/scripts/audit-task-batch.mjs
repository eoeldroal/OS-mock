#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../../../");

const PREDICATES = [
  "note.target_opened",
  "popup.dismissed",
  "note.todo_opened",
  "note.target_appended",
  "note.saved",
  "file.renamed",
  "clipboard.source_line_copied",
  "note.target_pasted",
  "window.note_restored",
  "browser.task_selected",
  "browser.help_page_opened",
  "mail.message_opened",
  "terminal.command_ran"
];

function parseArgs(argv) {
  const args = {
    mode: "inventory",
    inputPath: undefined,
    split: "all",
    json: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--mode") {
      const value = argv[index + 1];
      if (value === "inventory" || value === "candidates") {
        args.mode = value;
        index += 1;
      }
      continue;
    }
    if (arg === "--input") {
      args.inputPath = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--split") {
      args.split = argv[index + 1] ?? "all";
      index += 1;
      continue;
    }
    if (arg === "--json") {
      args.json = true;
    }
  }

  return args;
}

function uniqueSorted(values) {
  return [...new Set(Array.from(values ?? []).filter(Boolean))].sort();
}

function countMatches(text, pattern) {
  const matches = text.match(pattern);
  return matches ? matches.length : 0;
}

function sameSet(left, right) {
  return JSON.stringify(uniqueSorted(left)) === JSON.stringify(uniqueSorted(right));
}

function sameChain(left, right) {
  return JSON.stringify(left ?? []) === JSON.stringify(right ?? []);
}

function mapAppId(appId) {
  switch (appId) {
    case "file-explorer":
      return "files";
    case "note-editor":
      return "note";
    case "browser-lite":
      return "browser";
    case "terminal-lite":
      return "terminal";
    case "mail-lite":
      return "mail";
    default:
      return appId;
  }
}

function deriveFamily(goalPredicates, progressPredicates, appScope) {
  const predicates = new Set([...(goalPredicates ?? []), ...(progressPredicates ?? [])]);
  if (predicates.has("file.renamed")) return "files_rename";
  if (predicates.has("clipboard.source_line_copied") || predicates.has("note.target_pasted")) return "note_copy_paste";
  if (predicates.has("window.note_restored")) return "window_recover_save";
  if (predicates.has("browser.task_selected") || predicates.has("browser.help_page_opened")) return "browser_extract_to_note";
  if (predicates.has("mail.message_opened")) return "mail_extract_to_note";
  if (predicates.has("terminal.command_ran")) return "terminal_record_to_note";
  if (predicates.has("popup.dismissed") && predicates.has("note.todo_opened")) return "popup_open_note";
  if (predicates.has("note.target_opened") && predicates.has("note.saved")) return "note_edit_save";
  if (predicates.has("note.target_opened")) return "files_open_note";
  if ((appScope ?? []).includes("note")) return "note_general";
  return "unknown";
}

function deriveOutputArtifact(goalPredicates, targetKeys) {
  const predicates = new Set(goalPredicates ?? []);
  if (predicates.has("file.renamed")) return "rename";
  if (predicates.has("note.saved")) return (targetKeys ?? []).includes("targetFileId") ? "saved-target-file" : "saved-note";
  if (predicates.has("note.target_opened") || predicates.has("note.todo_opened")) return "opened-note";
  if (predicates.has("browser.task_selected")) return "browser-selection";
  if (predicates.has("browser.help_page_opened")) return "browser-help";
  if (predicates.has("mail.message_opened")) return "mail-selection";
  if (predicates.has("terminal.command_ran")) return "terminal-output";
  return "generic";
}

function buildFingerprint(task) {
  return [
    task.family,
    task.split ?? "unknown",
    task.domain ?? "unknown",
    (task.appScope ?? []).join("+"),
    uniqueSorted(task.goalPredicates ?? []).join("|"),
    (task.progressPredicates ?? []).join("->"),
    task.outputArtifact ?? "generic",
    `files:${task.setupShape?.fileCount ?? 0}`,
    `windows:${task.setupShape?.windowCount ?? 0}`,
    `popups:${task.setupShape?.popupCount ?? 0}`,
    `min:${task.setupShape?.minimizedCount ?? 0}`,
    `targets:${(task.targetKeys ?? []).join("+")}`
  ].join(" :: ");
}

function compareAuditTasks(left, right) {
  const reasons = [];
  if (sameSet(left.appScope, right.appScope)) reasons.push("same-app-scope");
  if (sameSet(left.goalPredicates, right.goalPredicates)) reasons.push("same-goal-set");
  if (sameChain(left.progressPredicates, right.progressPredicates)) reasons.push("same-progress-chain");
  if (left.family === right.family) reasons.push("same-family");
  if (left.outputArtifact === right.outputArtifact) reasons.push("same-output-artifact");
  if (sameSet(left.targetKeys, right.targetKeys)) reasons.push("same-target-keys");
  if (
    left.setupShape.fileCount === right.setupShape.fileCount &&
    left.setupShape.windowCount === right.setupShape.windowCount &&
    left.setupShape.popupCount === right.setupShape.popupCount &&
    left.setupShape.minimizedCount === right.setupShape.minimizedCount
  ) {
    reasons.push("same-setup-shape");
  }
  return reasons;
}

function isHardDuplicateRisk(reasons) {
  return reasons.includes("same-app-scope") && reasons.includes("same-goal-set") && reasons.includes("same-progress-chain");
}

function isSoftDuplicateRisk(reasons) {
  return (
    (reasons.includes("same-family") && reasons.includes("same-output-artifact") && (reasons.includes("same-goal-set") || reasons.includes("same-progress-chain") || reasons.includes("same-target-keys"))) ||
    (reasons.includes("same-goal-set") && reasons.includes("same-output-artifact") && reasons.includes("same-target-keys")) ||
    (reasons.includes("same-family") && reasons.includes("same-output-artifact") && reasons.includes("same-setup-shape"))
  );
}

function isVariationCandidate(reasons) {
  return (
    (reasons.includes("same-family") && reasons.includes("same-output-artifact")) ||
    (reasons.includes("same-app-scope") && reasons.includes("same-goal-set")) ||
    (reasons.includes("same-goal-set") && reasons.includes("same-target-keys"))
  );
}

function summarizeInventory(tasks) {
  const predicateUsage = new Map(PREDICATES.map((predicate) => [predicate, 0]));
  const domainUsage = new Map();
  const appScopeUsage = new Map();
  const familyUsage = new Map();
  const goalComboUsage = new Map();

  for (const task of tasks) {
    domainUsage.set(task.domain, (domainUsage.get(task.domain) ?? 0) + 1);
    appScopeUsage.set(task.appScope.join("+"), (appScopeUsage.get(task.appScope.join("+")) ?? 0) + 1);
    familyUsage.set(task.family, (familyUsage.get(task.family) ?? 0) + 1);
    const goalCombo = uniqueSorted(task.goalPredicates).join("+");
    goalComboUsage.set(goalCombo, (goalComboUsage.get(goalCombo) ?? 0) + 1);
    for (const predicate of uniqueSorted([...(task.goalPredicates ?? []), ...(task.progressPredicates ?? [])])) {
      predicateUsage.set(predicate, (predicateUsage.get(predicate) ?? 0) + 1);
    }
  }

  const duplicatePairs = [];
  for (let i = 0; i < tasks.length; i += 1) {
    for (let j = i + 1; j < tasks.length; j += 1) {
      const reasons = compareAuditTasks(tasks[i], tasks[j]);
      if (isHardDuplicateRisk(reasons) || isSoftDuplicateRisk(reasons)) {
        duplicatePairs.push({
          ids: [tasks[i].id, tasks[j].id],
          reasons,
          level: isHardDuplicateRisk(reasons) ? "fail" : "warn"
        });
      }
    }
  }

  const quotaFindings = [];
  const total = tasks.length || 1;
  for (const [domain, count] of domainUsage.entries()) {
    if (count / total > 0.4) {
      quotaFindings.push({ level: "warn", code: "domain-quota", message: `${domain} occupies ${count}/${tasks.length} tasks.` });
    }
  }
  for (const [goalCombo, count] of goalComboUsage.entries()) {
    if (count / total > 0.25) {
      quotaFindings.push({ level: "warn", code: "goal-combo-quota", message: `${goalCombo} occupies ${count}/${tasks.length} tasks.` });
    }
  }

  return {
    totalTasks: tasks.length,
    domainUsage: Object.fromEntries([...domainUsage.entries()].sort()),
    appScopeUsage: Object.fromEntries([...appScopeUsage.entries()].sort()),
    familyUsage: Object.fromEntries([...familyUsage.entries()].sort()),
    goalComboUsage: Object.fromEntries([...goalComboUsage.entries()].sort()),
    predicateUsage: Object.fromEntries([...predicateUsage.entries()].sort()),
    unusedPredicates: [...predicateUsage.entries()].filter(([, count]) => count === 0).map(([predicate]) => predicate),
    quotaFindings,
    duplicatePairs,
    tasks
  };
}

function readCandidateFile(inputPath) {
  const resolved = path.resolve(process.cwd(), inputPath);
  const parsed = JSON.parse(fs.readFileSync(resolved, "utf8"));
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed.tasks)) return parsed.tasks;
  throw new Error(`Invalid candidate file: ${resolved}`);
}

function normalizeCandidate(candidate) {
  const appScope = uniqueSorted(candidate.appScope ?? candidate.setupShape?.appScope ?? []);
  const targetKeys = uniqueSorted(candidate.targetKeys ?? candidate.setupShape?.targetKeys ?? []);
  const goalPredicates = candidate.goalPredicates ?? [];
  const progressPredicates = candidate.progressPredicates ?? [];
  const family = candidate.family ?? deriveFamily(goalPredicates, progressPredicates, appScope);
  const outputArtifact = candidate.outputArtifact ?? deriveOutputArtifact(goalPredicates, targetKeys);
  const setupShape = {
    fileCount: candidate.setupShape?.fileCount ?? 0,
    windowCount: candidate.setupShape?.windowCount ?? 0,
    popupCount: candidate.setupShape?.popupCount ?? 0,
    minimizedCount: candidate.setupShape?.minimizedCount ?? 0,
    appScope,
    targetKeys
  };

  return {
    id: candidate.id,
    split: candidate.split ?? "unknown",
    domain: candidate.domain ?? "unknown",
    instruction: candidate.instruction ?? "",
    family,
    appScope,
    goalPredicates,
    progressPredicates,
    targetKeys,
    outputArtifact,
    setupShape,
    variationAxes: candidate.variationAxes ?? [],
    fingerprint: ""
  };
}

function toCandidateFindings(candidate, inventory) {
  const findings = [];
  if (!candidate.id) findings.push({ level: "fail", code: "missing-id", message: "Candidate is missing id." });
  if (!candidate.split) findings.push({ level: "fail", code: "missing-split", message: `${candidate.id}: split is required.` });
  if (!candidate.domain) findings.push({ level: "fail", code: "missing-domain", message: `${candidate.id}: domain is required.` });
  if (!candidate.instruction) findings.push({ level: "fail", code: "missing-instruction", message: `${candidate.id}: instruction is required.` });
  if (!(candidate.goalPredicates?.length > 0)) findings.push({ level: "fail", code: "missing-goals", message: `${candidate.id}: goalPredicates are required.` });
  if (!(candidate.progressPredicates?.length > 0)) findings.push({ level: "fail", code: "missing-progress", message: `${candidate.id}: progressPredicates are required.` });
  if ((candidate.variationAxes?.length ?? 0) === 0) findings.push({ level: "warn", code: "missing-variation-axes", message: `${candidate.id}: variationAxes are missing.` });
  if ((candidate.instruction?.trim().length ?? 0) < 20) findings.push({ level: "warn", code: "weak-instruction", message: `${candidate.id}: instruction may be too short to be clear.` });

  for (const predicate of [...(candidate.goalPredicates ?? []), ...(candidate.progressPredicates ?? [])]) {
    if (!PREDICATES.includes(predicate)) {
      findings.push({ level: "fail", code: "unknown-predicate", message: `${candidate.id}: unsupported predicate ${predicate}.` });
    }
  }

  const normalized = normalizeCandidate(candidate);
  normalized.fingerprint = buildFingerprint(normalized);

  for (const existing of inventory) {
    const reasons = [];
    if (normalized.appScope.length > 0 && sameSet(normalized.appScope, existing.appScope)) reasons.push("same-app-scope");
    if (normalized.goalPredicates.length > 0 && sameSet(normalized.goalPredicates, existing.goalPredicates)) reasons.push("same-goal-set");
    if (normalized.progressPredicates.length > 0 && sameChain(normalized.progressPredicates, existing.progressPredicates)) reasons.push("same-progress-chain");
    if (normalized.family === existing.family) reasons.push("same-family");
    if (normalized.outputArtifact === existing.outputArtifact) reasons.push("same-output-artifact");
    if (normalized.targetKeys.length > 0 && sameSet(normalized.targetKeys, existing.targetKeys)) reasons.push("same-target-keys");

    if (isHardDuplicateRisk(reasons) || isSoftDuplicateRisk(reasons)) {
      findings.push({
        level: isHardDuplicateRisk(reasons) ? "fail" : "warn",
        code: "duplicate-risk",
        message: `${candidate.id}: duplicate risk against ${existing.id} (${reasons.join(", ")}).`
      });
    } else if (isVariationCandidate(reasons)) {
      findings.push({
        level: "warn",
        code: "variation-candidate",
        message: `${candidate.id}: likely family or seed variation of ${existing.id} (${reasons.join(", ")}).`
      });
    }
  }

  return { normalized, findings };
}

function computeCandidateBatchFindings(candidates) {
  const findings = [];
  const seenIds = new Set();
  const domainUsage = new Map();
  const goalComboUsage = new Map();
  const fingerprintUsage = new Map();
  const appScopeRuns = [];
  let lastAppScope = "";
  let currentRun = 0;

  for (const candidate of candidates) {
    if (seenIds.has(candidate.id)) {
      findings.push({ level: "fail", code: "duplicate-id", message: `Duplicate candidate id: ${candidate.id}.` });
    }
    seenIds.add(candidate.id);

    domainUsage.set(candidate.domain, (domainUsage.get(candidate.domain) ?? 0) + 1);
    const goalCombo = uniqueSorted(candidate.goalPredicates).join("+");
    goalComboUsage.set(goalCombo, (goalComboUsage.get(goalCombo) ?? 0) + 1);
    fingerprintUsage.set(candidate.fingerprint, (fingerprintUsage.get(candidate.fingerprint) ?? 0) + 1);

    const appScopeKey = candidate.appScope.join("+");
    if (appScopeKey === lastAppScope) {
      currentRun += 1;
    } else {
      if (lastAppScope) appScopeRuns.push({ appScopeKey: lastAppScope, length: currentRun });
      lastAppScope = appScopeKey;
      currentRun = 1;
    }
  }
  if (lastAppScope) appScopeRuns.push({ appScopeKey: lastAppScope, length: currentRun });

  const total = candidates.length || 1;
  if (candidates.length >= 4) {
    for (const [domain, count] of domainUsage.entries()) {
      if (count / total > 0.4) {
        findings.push({ level: "warn", code: "domain-quota", message: `${domain} occupies ${count}/${candidates.length} candidates.` });
      }
    }
    for (const [goalCombo, count] of goalComboUsage.entries()) {
      if (count / total > 0.25) {
        findings.push({ level: "warn", code: "goal-combo-quota", message: `${goalCombo} occupies ${count}/${candidates.length} candidates.` });
      }
    }
  }
  for (const run of appScopeRuns) {
    if (run.length > 3) {
      findings.push({ level: "warn", code: "app-scope-run", message: `${run.appScopeKey} appears ${run.length} times in a row.` });
    }
  }
  for (const [fingerprint, count] of fingerprintUsage.entries()) {
    if (count > 1) {
      findings.push({ level: "fail", code: "duplicate-fingerprint", message: `${fingerprint} appears ${count} times in the candidate batch.` });
    }
  }

  return findings;
}

function printHumanInventory(inventory) {
  console.log("Mode: inventory");
  console.log(`Total tasks: ${inventory.totalTasks}`);
  console.log(`Domain usage: ${JSON.stringify(inventory.domainUsage)}`);
  console.log(`App scope usage: ${JSON.stringify(inventory.appScopeUsage)}`);
  console.log(`Family usage: ${JSON.stringify(inventory.familyUsage)}`);
  console.log(`Goal combo usage: ${JSON.stringify(inventory.goalComboUsage)}`);
  console.log(`Unused predicates: ${inventory.unusedPredicates.join(", ") || "none"}`);
  if (inventory.quotaFindings.length > 0) {
    console.log("Quota risks:");
    for (const finding of inventory.quotaFindings) {
      console.log(`- [${finding.level}] ${finding.code}: ${finding.message}`);
    }
  }
  if (inventory.duplicatePairs.length === 0) {
    console.log("Duplicate risks: none");
    return;
  }
  console.log("Duplicate risks:");
  for (const pair of inventory.duplicatePairs) {
    console.log(`- [${pair.level}] ${pair.ids[0]} <-> ${pair.ids[1]} :: ${pair.reasons.join(", ")}`);
  }
}

function printHumanCandidates(findingsByTask, batchFindings) {
  console.log("Mode: candidates");
  if (batchFindings.length > 0) {
    console.log("Batch findings:");
    for (const finding of batchFindings) {
      console.log(`- [${finding.level}] ${finding.code}: ${finding.message}`);
    }
  }
  for (const entry of findingsByTask) {
    const failures = entry.findings.filter((finding) => finding.level === "fail");
    const warnings = entry.findings.filter((finding) => finding.level === "warn");
    const status = failures.length > 0 ? "FAIL" : warnings.length > 0 ? "WARN" : "PASS";
    console.log(`- ${entry.id}: ${status}`);
    for (const finding of entry.findings) {
      console.log(`  - [${finding.level}] ${finding.code}: ${finding.message}`);
    }
  }
}

function findMatching(text, startIndex, openChar, closeChar) {
  let depth = 0;
  let quote = "";
  for (let index = startIndex; index < text.length; index += 1) {
    const char = text[index];
    const previous = text[index - 1];
    if (quote) {
      if (char === quote && previous !== "\\") {
        quote = "";
      }
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === openChar) depth += 1;
    if (char === closeChar) {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  throw new Error(`Could not find matching ${closeChar} for ${openChar} at ${startIndex}`);
}

function extractNamedFunctions(text) {
  const functions = new Map();
  const regex = /function\s+([A-Za-z0-9_]+)\s*\([^)]*\)\s*\{/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const name = match[1];
    const braceIndex = text.indexOf("{", match.index);
    const endIndex = findMatching(text, braceIndex, "{", "}");
    functions.set(name, text.slice(braceIndex + 1, endIndex));
    regex.lastIndex = endIndex + 1;
  }
  return functions;
}

function extractExportArray(text, exportName) {
  const exportIndex = text.indexOf(`export const ${exportName}`);
  if (exportIndex === -1) {
    throw new Error(`Could not find export array ${exportName}`);
  }
  const equalsIndex = text.indexOf("=", exportIndex);
  const arrayStart = text.indexOf("[", equalsIndex);
  const arrayEnd = findMatching(text, arrayStart, "[", "]");
  return text.slice(arrayStart + 1, arrayEnd);
}

function splitTopLevelObjects(arrayBody) {
  const objects = [];
  let quote = "";
  let depth = 0;
  let objectStart = -1;

  for (let index = 0; index < arrayBody.length; index += 1) {
    const char = arrayBody[index];
    const previous = arrayBody[index - 1];
    if (quote) {
      if (char === quote && previous !== "\\") {
        quote = "";
      }
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "{") {
      if (depth === 0) objectStart = index;
      depth += 1;
      continue;
    }
    if (char === "}") {
      depth -= 1;
      if (depth === 0 && objectStart !== -1) {
        objects.push(arrayBody.slice(objectStart, index + 1));
        objectStart = -1;
      }
    }
  }

  return objects;
}

function parseStringProp(objectText, propName) {
  const match = objectText.match(new RegExp(`${propName}\\s*:\\s*"([^"]*)"`));
  return match ? match[1] : undefined;
}

function parseIdentifierProp(objectText, propName) {
  const match = objectText.match(new RegExp(`${propName}\\s*:\\s*([A-Za-z0-9_]+)`));
  return match ? match[1] : undefined;
}

function parseArrayStringsProp(objectText, propName) {
  const match = objectText.match(new RegExp(`${propName}\\s*:\\s*\\[([^\\]]*)\\]`, "s"));
  if (!match) return [];
  return [...match[1].matchAll(/"([^"]+)"/g)].map((entry) => entry[1]);
}

function extractObjectKeysFromSnippet(snippet) {
  return [...snippet.matchAll(/([A-Za-z0-9_]+)\s*:/g)].map((match) => match[1]);
}

function extractTargetKeysFromFunctionBody(body) {
  const targetsIndex = body.indexOf("targets:");
  if (targetsIndex === -1) return [];
  const objectStart = body.indexOf("{", targetsIndex);
  if (objectStart === -1) return [];
  const objectEnd = findMatching(body, objectStart, "{", "}");
  return uniqueSorted(extractObjectKeysFromSnippet(body.slice(objectStart + 1, objectEnd)));
}

function applyCompanionHelper(shape, fileKind, mode) {
  shape.windowCount += 3;
  shape.appScope.add("browser");
  shape.appScope.add("terminal");
  shape.appScope.add("mail");
  if (fileKind === "starter") {
    shape.minimizedCount += mode === "visible-browser" ? 2 : 3;
    return;
  }
  shape.minimizedCount += 2;
}

function analyzeBuilderFromSource(body, fileKind) {
  const shape = {
    fileCount: 0,
    windowCount: 0,
    popupCount: 0,
    minimizedCount: 0,
    appScope: new Set(),
    targetKeys: extractTargetKeysFromFunctionBody(body)
  };

  for (const match of body.matchAll(/addUbuntuCompanionApps\([^\)]*"([^"]+)"[^\)]*\)/g)) {
    applyCompanionHelper(shape, fileKind, match[1]);
  }

  shape.fileCount += countMatches(body, /\bcreateFile\(/g);

  const directWindows = [
    { pattern: /\baddExplorerWindow\(/g, app: "files" },
    { pattern: /\baddNoteEditorWindow\(/g, app: "note" },
    { pattern: /\baddBrowserWindow\(/g, app: "browser" },
    { pattern: /\baddTerminalWindow\(/g, app: "terminal" },
    { pattern: /\baddMailWindow\(/g, app: "mail" }
  ];

  for (const entry of directWindows) {
    const count = countMatches(body, entry.pattern);
    if (count > 0) {
      shape.windowCount += count;
      shape.appScope.add(entry.app);
    }
  }

  shape.popupCount += countMatches(body, /\bcreatePopup\(/g);
  if (shape.popupCount > 0) {
    shape.appScope.add("popup");
  }

  if (/\bminimizeAllWindows\(/.test(body)) {
    shape.minimizedCount = Math.max(shape.minimizedCount, shape.windowCount);
  }

  return {
    fileCount: shape.fileCount,
    windowCount: shape.windowCount,
    popupCount: shape.popupCount,
    minimizedCount: shape.minimizedCount,
    appScope: uniqueSorted(shape.appScope),
    targetKeys: shape.targetKeys
  };
}

function parseTaskFile(filePath, exportName, fileKind) {
  const text = fs.readFileSync(filePath, "utf8");
  const functions = extractNamedFunctions(text);
  const arrayBody = extractExportArray(text, exportName);
  const taskObjects = splitTopLevelObjects(arrayBody);

  return taskObjects.map((objectText) => {
    const id = parseStringProp(objectText, "id") ?? "unknown-task";
    const split = parseStringProp(objectText, "split") ?? fileKind;
    const domain = parseStringProp(objectText, "domain") ?? "unknown";
    const instruction = parseStringProp(objectText, "instruction") ?? "";
    const goalPredicates = parseArrayStringsProp(objectText, "goalPredicates");
    const progressPredicates = parseArrayStringsProp(objectText, "progressPredicates");
    const setupName = parseIdentifierProp(objectText, "setup") ?? "";
    const setupBody = functions.get(setupName) ?? "";
    const setupShape = analyzeBuilderFromSource(setupBody, fileKind);
    const appScope = setupShape.appScope;
    const targetKeys = setupShape.targetKeys;
    const family = deriveFamily(goalPredicates, progressPredicates, appScope);
    const outputArtifact = deriveOutputArtifact(goalPredicates, targetKeys);

    const task = {
      id,
      split,
      domain,
      instruction,
      goalPredicates,
      progressPredicates,
      appScope,
      targetKeys,
      family,
      outputArtifact,
      setupShape,
      fingerprint: ""
    };
    task.fingerprint = buildFingerprint(task);
    return task;
  });
}

async function loadRuntimeInventoryTasks() {
  const distRegistryPath = path.join(repoRoot, "packages/core/dist/tasks/registry.js");
  const distFactoryPath = path.join(repoRoot, "packages/core/dist/env/factory.js");
  if (!fs.existsSync(distRegistryPath) || !fs.existsSync(distFactoryPath)) {
    return null;
  }

  const registryModule = await import(pathToFileURL(distRegistryPath).href);
  const factoryModule = await import(pathToFileURL(distFactoryPath).href);
  const tasks = registryModule.ALL_TASKS ?? [];
  const viewport = factoryModule.DEFAULT_VIEWPORT;

  return tasks.map((task) => {
    const seed = task.seedDefaults?.[0] ?? 0;
    const setup = task.setup(seed, viewport);
    const appScope = uniqueSorted([
      ...setup.envState.windows.map((window) => mapAppId(window.appId)),
      ...(setup.envState.popups.length > 0 ? ["popup"] : [])
    ]);
    const targetKeys = uniqueSorted(Object.keys(setup.targets ?? {}));
    const setupShape = {
      fileCount: setup.envState.fileSystem.order.length,
      windowCount: setup.envState.windows.length,
      popupCount: setup.envState.popups.length,
      minimizedCount: setup.envState.windows.filter((window) => window.minimized).length,
      appScope,
      targetKeys
    };
    const family = deriveFamily(task.goalPredicates, task.progressPredicates, appScope);
    const outputArtifact = deriveOutputArtifact(task.goalPredicates, targetKeys);
    const auditTask = {
      id: task.id,
      split: task.split ?? "unknown",
      domain: task.domain ?? "unknown",
      instruction: task.instruction,
      goalPredicates: [...task.goalPredicates],
      progressPredicates: [...task.progressPredicates],
      appScope,
      targetKeys,
      family,
      outputArtifact,
      setupShape,
      fingerprint: ""
    };
    auditTask.fingerprint = buildFingerprint(auditTask);
    return auditTask;
  });
}

async function loadInventoryTasks(split) {
  const runtimeTasks = await loadRuntimeInventoryTasks();
  const tasks = runtimeTasks ?? [
    ...parseTaskFile(path.join(repoRoot, "packages/core/src/tasks/starter-tasks.ts"), "STARTER_TASKS", "starter"),
    ...parseTaskFile(path.join(repoRoot, "packages/core/src/tasks/representative-tasks.ts"), "REPRESENTATIVE_TASKS", "representative")
  ];
  if (split === "all") return tasks;
  return tasks.filter((task) => task.split === split);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inventoryTasks = await loadInventoryTasks(args.split);
  const inventory = summarizeInventory(inventoryTasks);

  if (args.mode === "inventory") {
    if (args.json) {
      console.log(JSON.stringify(inventory, null, 2));
    } else {
      printHumanInventory(inventory);
    }
    if (inventory.duplicatePairs.some((pair) => pair.level === "fail")) {
      process.exitCode = 1;
    }
    return;
  }

  if (!args.inputPath) {
    throw new Error("--input is required in candidates mode");
  }

  const candidates = readCandidateFile(args.inputPath);
  const findingsByTask = candidates.map((candidate) => {
    const { normalized, findings } = toCandidateFindings(candidate, inventoryTasks);
    return {
      id: candidate.id || "<missing-id>",
      normalized,
      findings
    };
  });
  const batchFindings = computeCandidateBatchFindings(findingsByTask.map((entry) => entry.normalized));

  if (args.json) {
    console.log(JSON.stringify({ mode: "candidates", batchFindings, findingsByTask }, null, 2));
  } else {
    printHumanCandidates(findingsByTask, batchFindings);
  }

  const hasFailures = batchFindings.some((finding) => finding.level === "fail") || findingsByTask.some((entry) => entry.findings.some((finding) => finding.level === "fail"));
  if (hasFailures) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
