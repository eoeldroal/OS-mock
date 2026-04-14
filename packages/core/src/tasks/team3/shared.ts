import type { FileEntry, PredicateId, TaskSpec } from "../../types.js";
import type { NoteTargetOptions } from "../scenario-types.js";
import { createScenarioFile } from "../scenario-builders.js";

export const TEAM3_SEED_DEFAULTS = [0, 1, 2];

export const TEAM3_MAIL_DOMAIN = "Thunderbird + Note Editor";
export const TEAM3_TERMINAL_DOMAIN = "Terminal + Note Editor";

export function createTeam3File(
  id: string,
  name: string,
  content: string,
  directory: string,
  kind: FileEntry["kind"] = "file"
) {
  return createScenarioFile(id, name, content, directory, kind);
}

export function createTeam3NoteTarget(
  fileId: string,
  fileName: string,
  initialContent = "",
  directory = "/workspace"
): NoteTargetOptions {
  return {
    fileId,
    fileName,
    initialContent,
    directory
  };
}

type Team3TaskOptions = Omit<TaskSpec, "seedDefaults" | "goalPredicates" | "progressPredicates" | "forbiddenPredicates"> & {
  goalPredicates?: PredicateId[];
  progressPredicates?: PredicateId[];
  forbiddenPredicates?: PredicateId[];
};

export function defineTeam3Task({
  goalPredicates = ["note.saved"],
  progressPredicates,
  forbiddenPredicates = [],
  ...task
}: Team3TaskOptions): TaskSpec {
  return {
    seedDefaults: TEAM3_SEED_DEFAULTS,
    goalPredicates,
    progressPredicates:
      progressPredicates ??
      (task.domain === TEAM3_MAIL_DOMAIN
        ? ["mail.message_opened", "note.target_appended"]
        : ["terminal.command_ran", "note.target_appended"]),
    forbiddenPredicates,
    ...task
  };
}
