import type { TaskSpec } from "../types.js";
import { REPRESENTATIVE_TASKS } from "./representative-tasks.js";
import { STARTER_TASKS } from "./starter-tasks.js";

// 커스텀 태스크 불러오기
import { 
  // --- [초기 5개] ---
  mailExtractInvoiceTask,
  terminalListDirTask,
  terminalRecordWorkingDirectoryTask,
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

// 1. ALL_TASKS에 완벽하게 병합
export const ALL_TASKS: TaskSpec[] = [
  ...STARTER_TASKS, 
  ...REPRESENTATIVE_TASKS,
  
  // --- [Team 3 Custom Tasks (1~25)] ---
  mailExtractInvoiceTask,
  terminalListDirTask,
  terminalRecordWorkingDirectoryTask,
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
];

const TASK_MAP = new Map<string, TaskSpec>(ALL_TASKS.map((task) => [task.id, task]));

// 2. 범인이었던 resolveTasks 함수를 동적 필터링으로 수정 ✅
function resolveTasks(split: TaskSplit = "all") {
  if (split === "all") {
    return ALL_TASKS;
  }
  if (split === "starter") {
    return ALL_TASKS.filter(task => task.split === "starter");
  }
  // train, eval, representative 등 요청된 split에 맞춰 정확히 필터링
  return ALL_TASKS.filter(task => task.split === split || task.split === "representative");
}

function toSummary(task: TaskSpec) {
  return {
    id: task.id,
    instruction: task.instruction,
    maxSteps: task.maxSteps,
    seedDefaults: task.seedDefaults,
    domain: task.domain,
    split: task.split
  };
}

export function listTasks(split: TaskSplit = "all") {
  return resolveTasks(split).map(toSummary);
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
  return tasks[Math.abs(seed) % tasks.length];
}