import type { TaskSpec } from "../types.js";
import { REPRESENTATIVE_TASKS } from "./representative/index.js";
import { STARTER_TASKS } from "./starter/index.js";
import { FILES_WINDOW_TASKS } from "./files-window-tasks.js";

// 커스텀 태스크 불러오기
import { 
  // --- [초기 5개] ---
  mailExtractInvoiceTask,
  terminalListDirTask,
  team3TerminalRecordWorkingDirectoryTask,
  terminalCatAndSaveConfigTask,
  mailRecordSenderAddressTask,
  
  // --- [확장 배치 1 (6~15)] ---
  mailExtractResetLinkTask,
  mailExtractMeetingTimeTask,
  mailExtractTrackingTask,
  mailExtractSpamSenderTask,
  mailExtract2faCodeTask,
  terminalCatEnvPasswordTask,
  terminalCatLogErrorCodeTask,
  terminalListLogDirTask,
  terminalCatCsvEmailTask,
  terminalRecordDeepPwdTask,

  // --- [확장 배치 2 (16~25)] ---
  mailExtractTrashLinkTask,
  mailExtractMessyReceiptTask,
  mailExtractFlightPnrTask,
  mailExtractExceptionNameTask,
  mailExtractSshIpTask,
  terminalCatHiddenCredentialsTask,
  terminalListHiddenFilesTask,
  terminalCatJsonNestedTask,
  terminalCatPythonImportTask,
  terminalFindSpecificExtensionTask,

  // --- [확장 배치 3 (26~35)] ---
  mailExtractCancellationFeeTask,
  mailExtractHrPhoneTask,
  mailExtractDraftRecipientTask,
  mailExtractPromoCodeTask,
  mailExtractDeadlineTask,
  terminalCatCsvSpecificValueTask,
  terminalCatGitignoreTask,
  terminalFindBackupFileTask,
  terminalCatPackageJsonVersionTask,
  terminalFindShellScriptTask,

  // --- [최종 배치 (36~40)] ---
  terminalCatProcessListTask,
  mailExtractRebookedFlightTask,
  terminalCatYamlConfigTask,
  mailExtractUnsubscribeLinkTask,
  terminalCatCertExpiryTask
} from "./custom_team3.js";

export type TaskSplit = "all" | "starter" | "representative" | "train" | "eval";

const FW_STARTER = FILES_WINDOW_TASKS.filter((t) => t.split === "starter");
const FW_REPRESENTATIVE = FILES_WINDOW_TASKS.filter((t) => t.split === "representative");

const TEAM3_TASKS: TaskSpec[] = [
  mailExtractInvoiceTask,
  terminalListDirTask,
  team3TerminalRecordWorkingDirectoryTask,
  terminalCatAndSaveConfigTask,
  mailRecordSenderAddressTask,
  mailExtractResetLinkTask,
  mailExtractMeetingTimeTask,
  mailExtractTrackingTask,
  mailExtractSpamSenderTask,
  mailExtract2faCodeTask,
  terminalCatEnvPasswordTask,
  terminalCatLogErrorCodeTask,
  terminalListLogDirTask,
  terminalCatCsvEmailTask,
  terminalRecordDeepPwdTask,
  mailExtractTrashLinkTask,
  mailExtractMessyReceiptTask,
  mailExtractFlightPnrTask,
  mailExtractExceptionNameTask,
  mailExtractSshIpTask,
  terminalCatHiddenCredentialsTask,
  terminalListHiddenFilesTask,
  terminalCatJsonNestedTask,
  terminalCatPythonImportTask,
  terminalFindSpecificExtensionTask,
  mailExtractCancellationFeeTask,
  mailExtractHrPhoneTask,
  mailExtractDraftRecipientTask,
  mailExtractPromoCodeTask,
  mailExtractDeadlineTask,
  terminalCatCsvSpecificValueTask,
  terminalCatGitignoreTask,
  terminalFindBackupFileTask,
  terminalCatPackageJsonVersionTask,
  terminalFindShellScriptTask,
  terminalCatProcessListTask,
  mailExtractRebookedFlightTask,
  terminalCatYamlConfigTask,
  mailExtractUnsubscribeLinkTask,
  terminalCatCertExpiryTask
];
const TEAM3_STARTER = TEAM3_TASKS.filter((t) => t.split === "starter");
const TEAM3_REPRESENTATIVE = TEAM3_TASKS.filter((t) => t.split === "representative");

export const ALL_TASKS: TaskSpec[] = [...STARTER_TASKS, ...REPRESENTATIVE_TASKS, ...FILES_WINDOW_TASKS, ...TEAM3_TASKS];

const TASK_MAP = new Map<string, TaskSpec>(ALL_TASKS.map((task) => [task.id, task]));

// 2. 범인이었던 resolveTasks 함수를 동적 필터링으로 수정 ✅
function resolveTasks(split: TaskSplit = "all") {
  if (split === "all") {
    return ALL_TASKS;
  }
  if (split === "starter") {
    return [...STARTER_TASKS, ...FW_STARTER, ...TEAM3_STARTER];
  }
  if (split === "representative" || split === "train" || split === "eval") {
    return [...REPRESENTATIVE_TASKS, ...FW_REPRESENTATIVE, ...TEAM3_REPRESENTATIVE];
  }
  return ALL_TASKS;
}

function toPublicSummary(task: TaskSpec) {
  return {
    id: task.id,
    instruction: task.instruction,
    maxSteps: task.maxSteps,
    seedDefaults: task.seedDefaults,
    domain: task.domain,
    split: task.split
  };
}

function toAuthoringSummary(task: TaskSpec) {
  return {
    ...toPublicSummary(task),
    family: task.summary.family,
    level: task.summary.level,
    apps: task.summary.apps,
    startState: task.summary.startState,
    objective: task.summary.objective,
    implementationPath: task.summary.implementationPath,
    goalPredicates: task.goalPredicates,
    progressPredicates: task.progressPredicates
  };
}

export function listTasks(split: TaskSplit = "all") {
  return resolveTasks(split).map(toPublicSummary);
}

export function listTaskAuthoringMetadata(split: TaskSplit = "all") {
  return resolveTasks(split).map(toAuthoringSummary);
}

export function listStarterTasks() {
  return listTasks("starter");
}

export function getTaskSpec(taskId: string): TaskSpec {
  const task = TASK_MAP.get(taskId);
  if (!task) {
    throw new Error(`Unknown task: ${taskId}`);
  }
  return task;
}

export function sampleTask(seed = Date.now(), split: TaskSplit = "all"): TaskSpec {
  const tasks = resolveTasks(split);
  return tasks[abs(seed) % tasks.length];
}

function abs(value: number) {
  return Math.abs(value);
}
