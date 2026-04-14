import { produce } from 'immer';
import type { EnvState } from '../types.js';
import type { CommandResult } from '../apps/terminal-commands.js';
import {
  collectNodeSubtreeIds,
  createFileEntry,
  getFileEntry,
  insertFileEntry,
  normalizeDirectory,
  removeFileEntry,
  setWorkingDirectory,
  updateFileEntry
} from "./filesystem.js";
import { allocateEntityId } from './entity-id.js';

/**
 * Deletes a file and cleans up any orphaned NoteEditor windows that reference it.
 *
 * @param state - The current environment state
 * @param fileId - The ID of the file to delete
 * @returns The updated environment state with the file deleted and orphaned windows cleaned up
 */
export function deleteFileWithCleanup(state: EnvState, fileId: string): EnvState {
  return produce(state, draft => {
    const removedIds = new Set(collectNodeSubtreeIds(draft.fileSystem, fileId));

    // 1. Find orphaned noteEditor windows
    const orphanIds = Object.entries(draft.appStates.noteEditor)
      .filter(([, note]) => removedIds.has(note.fileId))
      .map(([id]) => id);

    // 2. Delete noteEditor app states
    for (const id of orphanIds) {
      delete draft.appStates.noteEditor[id];
    }

    // 3. Remove windows
    draft.windows = draft.windows.filter(w => !orphanIds.includes(w.id));

    // 4. Delete file from filesystem
    draft.fileSystem = removeFileEntry(draft.fileSystem, fileId);
  });
}

/**
 * Takes the result from the terminal command registry and applies file system changes to state.
 * Updates terminal output and syncs file system modifications.
 *
 * @param state - The current environment state
 * @param windowId - The ID of the terminal window
 * @param command - The command that was executed
 * @param result - The result from the command execution
 * @returns The updated environment state with terminal output and file system changes applied
 */
export function applyTerminalCommandResult(
  state: EnvState,
  windowId: string,
  command: string,
  result: CommandResult
): EnvState {
  return produce(state, draft => {
    const terminal = draft.appStates.terminalLite[windowId];
    const promptPrefix = `${terminal.prompt}:~${terminal.cwd}$`;

    // Update terminal state
    terminal.lines.push(`${promptPrefix} ${command}`, ...result.output);
    terminal.lastCommand = command;
    terminal.lastOutput = result.output.join('\n');
    terminal.executedCommands.push(command);
    terminal.selectedLineIndex = undefined;
    terminal.status = `ran ${command}`;
    terminal.input = '';
    if (result.cwd) {
      const normalizedCwd = normalizeDirectory(result.cwd);
      draft.fileSystem = setWorkingDirectory(draft.fileSystem, normalizedCwd);
      terminal.cwd = normalizedCwd;
    }

    // Apply file system changes
    if (result.fileSystemChanges) {
      if (result.fileSystemChanges.created) {
        for (const file of result.fileSystemChanges.created) {
          const fileId = allocateEntityId(draft, 'file');
          draft.fileSystem = insertFileEntry(
            draft.fileSystem,
            createFileEntry(
              fileId,
              file.name,
              file.content,
              file.directory,
              file.kind
            )
          );
        }
      }
      if (result.fileSystemChanges.updated) {
        for (const update of result.fileSystemChanges.updated) {
          if (getFileEntry(draft.fileSystem, update.id)) {
            draft.fileSystem = updateFileEntry(draft.fileSystem, update.id, {
              content: update.content,
              name: update.name,
              directory: update.directory
            });
          }
        }
      }
      if (result.fileSystemChanges.deleted) {
        for (const fileId of result.fileSystemChanges.deleted) {
          const removedIds = new Set(collectNodeSubtreeIds(draft.fileSystem, fileId));
          // Clean up orphaned note editors
          const orphanIds = Object.entries(draft.appStates.noteEditor)
            .filter(([, note]) => removedIds.has(note.fileId))
            .map(([id]) => id);
          for (const id of orphanIds) {
            delete draft.appStates.noteEditor[id];
          }
          draft.windows = draft.windows.filter(w => !orphanIds.includes(w.id));

          draft.fileSystem = removeFileEntry(draft.fileSystem, fileId);
        }
      }
    }
  });
}
