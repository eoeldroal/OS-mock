import type { FileEntry, FileSystemState } from "../types.js";

export function cloneFileSystem(state: FileSystemState): FileSystemState {
  return {
    cwd: state.cwd,
    order: [...state.order],
    files: Object.fromEntries(
      Object.entries(state.files).map(([id, file]) => [id, { ...file }])
    )
  };
}

export function getOrderedFiles(state: FileSystemState): FileEntry[] {
  return state.order.map((id) => state.files[id]).filter(Boolean);
}

export function renameFile(
  state: FileSystemState,
  fileId: string,
  newName: string
): FileSystemState {
  const next = cloneFileSystem(state);
  const file = next.files[fileId];
  if (!file) {
    return next;
  }
  const safeName = newName.trim();
  if (!safeName) {
    return next;
  }
  file.name = safeName;
  file.path = `${next.cwd}/${safeName}`;
  return next;
}

export function updateFileContent(
  state: FileSystemState,
  fileId: string,
  content: string
): FileSystemState {
  const next = cloneFileSystem(state);
  const file = next.files[fileId];
  if (!file) {
    return next;
  }
  file.content = content;
  return next;
}

