import type {
  FileEntry,
  FileMetadata,
  FileSystemNode,
  FileSystemPlace,
  FileSystemState
} from "../types.js";

export const DEFAULT_FILE_SYSTEM_ROOTS: Record<FileSystemPlace, string> = {
  Home: "/",
  Desktop: "/desktop",
  Documents: "/documents",
  Downloads: "/downloads",
  workspace: "/workspace"
};

const ROOT_NODE_IDS: Record<FileSystemPlace, string> = {
  Home: "fs-root-home",
  Desktop: "fs-root-desktop",
  Documents: "fs-root-documents",
  Downloads: "fs-root-downloads",
  workspace: "fs-root-workspace"
};

function createMetadata(content = ""): FileMetadata {
  return {
    createdAt: 0,
    modifiedAt: 0,
    size: content.length
  };
}

function createRootNode(id: string, name: string, mountPath: string): FileSystemNode {
  return {
    id,
    name,
    kind: "folder",
    mountPath,
    content: "",
    childrenOrder: [],
    metadata: createMetadata()
  };
}

function cloneNodes(nodes: Record<string, FileSystemNode>) {
  return Object.fromEntries(
    Object.entries(nodes).map(([id, node]) => [
      id,
      {
        ...node,
        childrenOrder: [...node.childrenOrder],
        metadata: { ...node.metadata }
      }
    ])
  );
}

function getRootPlaceForNode(state: FileSystemState, nodeId: string): FileSystemPlace | undefined {
  for (const place of Object.keys(state.rootNodeIds) as FileSystemPlace[]) {
    let currentId: string | undefined = nodeId;
    while (currentId) {
      if (currentId === state.rootNodeIds[place]) {
        return place;
      }
      currentId = state.nodes[currentId]?.parentId;
    }
  }
  return undefined;
}

export function normalizeDirectory(path: string) {
  if (!path || path === "/") {
    return "/";
  }
  const normalized = path.replace(/\/+/g, "/").replace(/\/$/, "");
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

function getNodePathSegments(state: FileSystemState, nodeId: string): string[] {
  const node = state.nodes[nodeId];
  if (!node) {
    return [];
  }
  if (!node.parentId) {
    return [];
  }
  return [...getNodePathSegments(state, node.parentId), node.name];
}

export function getNodePath(state: FileSystemState, nodeId: string) {
  const node = state.nodes[nodeId];
  if (!node) {
    return "/";
  }
  if (!node.parentId) {
    return normalizeDirectory(node.mountPath ?? "/");
  }
  const rootPlace = getRootPlaceForNode(state, nodeId);
  const rootPath = normalizeDirectory(
    rootPlace ? DEFAULT_FILE_SYSTEM_ROOTS[rootPlace] : state.nodes[nodeId].mountPath ?? "/"
  );
  const segments = getNodePathSegments(state, nodeId);
  if (segments.length === 0) {
    return rootPath;
  }
  return normalizeDirectory(
    rootPath === "/" ? `/${segments.join("/")}` : `${rootPath}/${segments.join("/")}`
  );
}

function getNodeDirectoryPath(state: FileSystemState, nodeId: string) {
  const node = state.nodes[nodeId];
  if (!node) {
    return "/";
  }
  if (!node.parentId) {
    return getNodePath(state, nodeId);
  }
  return getNodePath(state, node.parentId);
}

function findRootForPath(state: FileSystemState, directory: string) {
  const normalized = normalizeDirectory(directory);
  const candidates = (Object.keys(state.rootNodeIds) as FileSystemPlace[])
    .map((place) => ({ place, path: normalizeDirectory(getPlacePath(state, place)) }))
    .sort((left, right) => right.path.length - left.path.length);

  return candidates.find(({ path }) => {
    if (path === "/") {
      return normalized === "/" || normalized.startsWith("/");
    }
    return normalized === path || normalized.startsWith(`${path}/`);
  });
}

function materializeFileEntry(state: FileSystemState, nodeId: string): FileEntry | undefined {
  const node = state.nodes[nodeId];
  if (!node || !node.parentId) {
    return undefined;
  }
  const directory = getNodeDirectoryPath(state, nodeId);
  return {
    id: node.id,
    name: node.name,
    directory,
    path: getNodePath(state, nodeId),
    content: node.content,
    kind: node.kind
  };
}

function getLegacyEntryDirectory(entry: FileEntry) {
  return normalizeDirectory(entry.directory ?? getFileDirectory(entry.path));
}

function getLegacyEntryKind(entry: FileEntry) {
  return entry.kind ?? "file";
}

function getLegacyFilesInDirectory(state: FileSystemState, directory = state.cwd) {
  const normalizedDirectory = normalizeDirectory(directory);
  return state.order
    .map((id) => state.files[id])
    .filter(Boolean)
    .filter((entry) => getLegacyEntryDirectory(entry) === normalizedDirectory)
    .map((entry) => ({
      ...entry,
      directory: getLegacyEntryDirectory(entry),
      kind: getLegacyEntryKind(entry),
      path: entry.path || getFilePath({ directory: getLegacyEntryDirectory(entry), name: entry.name })
    }));
}

function collectChildDirectoryBuckets(
  state: FileSystemState,
  nodeId: string,
  directoryChildren: Record<string, string[]>,
  order: string[]
) {
  const node = state.nodes[nodeId];
  if (!node || node.kind !== "folder") {
    return;
  }

  const directoryPath = getNodePath(state, nodeId);
  directoryChildren[directoryPath] = [...node.childrenOrder];

  for (const childId of node.childrenOrder) {
    const child = state.nodes[childId];
    if (!child) {
      continue;
    }
    if (child.parentId) {
      order.push(childId);
    }
    if (child.kind === "folder") {
      collectChildDirectoryBuckets(state, childId, directoryChildren, order);
    }
  }
}

function collectTreeOrder(state: FileSystemState) {
  const order: string[] = [];
  const directoryChildren: Record<string, string[]> = {};

  for (const place of Object.keys(state.rootNodeIds) as FileSystemPlace[]) {
    const rootId = state.rootNodeIds[place];
    directoryChildren[getNodePath(state, rootId)] = [...(state.nodes[rootId]?.childrenOrder ?? [])];
    collectChildDirectoryBuckets(state, rootId, directoryChildren, order);
  }

  return { order, directoryChildren };
}

function materializeOrderedEntriesFromIds(state: FileSystemState, order: string[]) {
  return order
    .map((nodeId) => materializeFileEntry(state, nodeId))
    .filter((entry): entry is FileEntry => Boolean(entry));
}

function getLegacyOrderedFiles(state: FileSystemState) {
  return state.order.map((id) => state.files[id]).filter(Boolean);
}

function syncLegacyFileSystemState(state: FileSystemState): FileSystemState {
  const next = state;
  const files: Record<string, FileEntry> = {};
  const { order, directoryChildren } = collectTreeOrder(next);
  const roots = Object.fromEntries(
    (Object.keys(next.rootNodeIds) as FileSystemPlace[]).map((place) => [
      place,
      getNodePath(next, next.rootNodeIds[place])
    ])
  ) as Record<FileSystemPlace, string>;

  for (const entry of materializeOrderedEntriesFromIds(next, order)) {
    files[entry.id] = entry;
  }

  next.files = files;
  next.order = order;
  next.directoryChildren = directoryChildren;
  next.roots = roots;
  next.cwd = getNodePath(next, next.cwdNodeId);

  return next;
}

export function resolveDirectoryNodeId(state: FileSystemState, directory: string) {
  const normalized = normalizeDirectory(directory);
  const root = findRootForPath(state, normalized);
  if (!root) {
    return undefined;
  }

  const rootPath = root.path;
  const rootId = state.rootNodeIds[root.place];
  if (normalized === rootPath) {
    return rootId;
  }

  const relative =
    rootPath === "/"
      ? normalized.slice(1)
      : normalized.slice(rootPath.length + 1);

  const segments = relative.split("/").filter(Boolean);
  let currentId = rootId;
  for (const segment of segments) {
    const current = state.nodes[currentId];
    if (!current || current.kind !== "folder") {
      return undefined;
    }
    const nextId = current.childrenOrder.find((childId) => state.nodes[childId]?.name === segment);
    if (!nextId) {
      return undefined;
    }
    currentId = nextId;
  }
  return currentId;
}

export function createEmptyFileSystemState(cwd = DEFAULT_FILE_SYSTEM_ROOTS.workspace): FileSystemState {
  const nodes: Record<string, FileSystemNode> = {
    [ROOT_NODE_IDS.Home]: createRootNode(ROOT_NODE_IDS.Home, "Home", DEFAULT_FILE_SYSTEM_ROOTS.Home),
    [ROOT_NODE_IDS.Desktop]: createRootNode(ROOT_NODE_IDS.Desktop, "Desktop", DEFAULT_FILE_SYSTEM_ROOTS.Desktop),
    [ROOT_NODE_IDS.Documents]: createRootNode(ROOT_NODE_IDS.Documents, "Documents", DEFAULT_FILE_SYSTEM_ROOTS.Documents),
    [ROOT_NODE_IDS.Downloads]: createRootNode(ROOT_NODE_IDS.Downloads, "Downloads", DEFAULT_FILE_SYSTEM_ROOTS.Downloads),
    [ROOT_NODE_IDS.workspace]: createRootNode(ROOT_NODE_IDS.workspace, "workspace", DEFAULT_FILE_SYSTEM_ROOTS.workspace)
  };

  const defaultCwdNodeId =
    ROOT_NODE_IDS[
      ((Object.keys(DEFAULT_FILE_SYSTEM_ROOTS) as FileSystemPlace[]).find(
        (place) => normalizeDirectory(DEFAULT_FILE_SYSTEM_ROOTS[place]) === normalizeDirectory(cwd)
      ) ?? "workspace") as FileSystemPlace
    ];

  const state: FileSystemState = {
    cwdNodeId: defaultCwdNodeId,
    rootNodeIds: { ...ROOT_NODE_IDS },
    nodes,
    cwd: normalizeDirectory(cwd),
    roots: { ...DEFAULT_FILE_SYSTEM_ROOTS },
    files: {},
    order: [],
    directoryChildren: {}
  };

  const next = setWorkingDirectory(syncLegacyFileSystemState(state), cwd);
  if (next.nodes[next.cwdNodeId]) {
    return next;
  }
  return syncLegacyFileSystemState(state);
}

export function getFilePath(file: Pick<FileEntry, "directory" | "name">) {
  const directory = normalizeDirectory(file.directory);
  return directory === "/" ? `/${file.name}` : `${directory}/${file.name}`;
}

export function createFileEntry(
  id: string,
  name: string,
  content: string,
  directory = DEFAULT_FILE_SYSTEM_ROOTS.workspace,
  kind: FileEntry["kind"] = "file"
): FileEntry {
  const normalizedDirectory = normalizeDirectory(directory);
  return {
    id,
    name,
    directory: normalizedDirectory,
    path: getFilePath({ directory: normalizedDirectory, name }),
    content,
    kind
  };
}

export function getPlacePath(state: FileSystemState, place: FileSystemPlace) {
  return state.roots[place];
}

export function getFileDirectory(path: string) {
  const lastSlash = path.lastIndexOf("/");
  if (lastSlash <= 0) {
    return "/";
  }
  return normalizeDirectory(path.slice(0, lastSlash));
}

export function cloneFileSystem(state: FileSystemState): FileSystemState {
  return {
    cwdNodeId: state.cwdNodeId,
    rootNodeIds: { ...state.rootNodeIds },
    nodes: cloneNodes(state.nodes),
    cwd: state.cwd,
    roots: { ...state.roots },
    order: [...state.order],
    directoryChildren: Object.fromEntries(
      Object.entries(state.directoryChildren).map(([directory, children]) => [directory, [...children]])
    ),
    files: Object.fromEntries(
      Object.entries(state.files).map(([id, file]) => [id, { ...file }])
    )
  };
}

function getDirectoryNodeId(path: string) {
  const normalized = normalizeDirectory(path);
  return normalized === "/" ? "fs-dir:/" : `fs-dir:${normalized}`;
}

export function getOrderedFiles(state: FileSystemState): FileEntry[] {
  const { order } = collectTreeOrder(state);
  const treeEntries = materializeOrderedEntriesFromIds(state, order);
  if (treeEntries.length > 0) {
    return treeEntries;
  }
  return getLegacyOrderedFiles(state);
}

export function getFileEntry(state: FileSystemState, fileId: string): FileEntry | undefined {
  const entry = materializeFileEntry(state, fileId);
  if (entry) {
    return entry;
  }

  const legacyEntry = state.files[fileId];
  if (!legacyEntry) {
    return undefined;
  }

  const directory = getLegacyEntryDirectory(legacyEntry);
  return {
    ...legacyEntry,
    directory,
    kind: getLegacyEntryKind(legacyEntry),
    path: legacyEntry.path || getFilePath({ directory, name: legacyEntry.name })
  };
}

function isRootNode(state: FileSystemState, nodeId: string) {
  return Object.values(state.rootNodeIds).includes(nodeId);
}

function isDescendantNode(state: FileSystemState, ancestorId: string, targetId: string) {
  let currentId: string | undefined = targetId;
  while (currentId) {
    if (currentId === ancestorId) {
      return true;
    }
    currentId = state.nodes[currentId]?.parentId;
  }
  return false;
}

export function insertFileEntry(state: FileSystemState, entry: FileEntry) {
  const next = ensureDirectoryPath(state, entry.directory);
  const parentId = resolveDirectoryNodeId(next, entry.directory);
  if (!parentId || next.nodes[parentId]?.kind !== "folder") {
    return next;
  }

  const existingNode = next.nodes[entry.id];
  if (existingNode && !isRootNode(next, entry.id)) {
    const detached = removeFileEntry(next, entry.id);
    return insertFileEntry(detached, entry);
  }

  next.nodes[entry.id] = {
    id: entry.id,
    name: entry.name,
    kind: entry.kind,
    parentId,
    content: entry.content,
    childrenOrder: [],
    metadata: createMetadata(entry.kind === "file" ? entry.content : "")
  };
  next.nodes[parentId].childrenOrder.push(entry.id);

  return syncLegacyFileSystemState(next);
}

export function ensureDirectoryPath(state: FileSystemState, directory: string) {
  const normalized = normalizeDirectory(directory);
  if (resolveDirectoryNodeId(state, normalized)) {
    return state;
  }

  const root = findRootForPath(state, normalized);
  if (!root) {
    return state;
  }

  const next = cloneFileSystem(state);
  const rootId = next.rootNodeIds[root.place];
  if (normalized === root.path) {
    return next;
  }

  const relative = root.path === "/" ? normalized.slice(1) : normalized.slice(root.path.length + 1);
  const segments = relative.split("/").filter(Boolean);
  let currentId = rootId;
  let currentPath = normalizeDirectory(root.path);

  for (const segment of segments) {
    const current = next.nodes[currentId];
    if (!current || current.kind !== "folder") {
      return syncLegacyFileSystemState(next);
    }

    const existingChildId = current.childrenOrder.find((childId) => {
      const child = next.nodes[childId];
      return child?.kind === "folder" && child.name === segment;
    });
    if (existingChildId) {
      currentId = existingChildId;
      currentPath = getNodePath(next, existingChildId);
      continue;
    }

    currentPath = currentPath === "/" ? `/${segment}` : `${currentPath}/${segment}`;
    const nodeId = getDirectoryNodeId(currentPath);
    next.nodes[nodeId] = {
      id: nodeId,
      name: segment,
      kind: "folder",
      parentId: currentId,
      content: "",
      childrenOrder: [],
      metadata: createMetadata()
    };
    current.childrenOrder.push(nodeId);
    currentId = nodeId;
  }

  return syncLegacyFileSystemState(next);
}

export function setWorkingDirectory(state: FileSystemState, directory: string) {
  const normalized = normalizeDirectory(directory);
  const next = ensureDirectoryPath(state, normalized);
  const cwdNodeId = resolveDirectoryNodeId(next, normalized);
  if (!cwdNodeId) {
    return next;
  }

  next.cwdNodeId = cwdNodeId;
  next.cwd = getNodePath(next, cwdNodeId);
  return syncLegacyFileSystemState(next);
}

export function collectNodeSubtreeIds(state: FileSystemState, nodeId: string, acc: string[] = []) {
  const node = state.nodes[nodeId];
  if (!node) {
    return acc;
  }
  for (const childId of node.childrenOrder) {
    collectNodeSubtreeIds(state, childId, acc);
  }
  acc.push(nodeId);
  return acc;
}

export function removeFileEntry(state: FileSystemState, fileId: string) {
  const next = cloneFileSystem(state);
  const node = next.nodes[fileId];
  if (!node) {
    if (next.files[fileId]) {
      delete next.files[fileId];
      next.order = next.order.filter((id) => id !== fileId);
    }
    return next;
  }
  if (isRootNode(next, fileId)) {
    return next;
  }

  const parentId = node.parentId;
  if (parentId && next.nodes[parentId]) {
    next.nodes[parentId].childrenOrder = next.nodes[parentId].childrenOrder.filter((id) => id !== fileId);
  }

  for (const nodeId of collectNodeSubtreeIds(next, fileId)) {
    delete next.nodes[nodeId];
  }

  if (!next.nodes[next.cwdNodeId]) {
    next.cwdNodeId = next.rootNodeIds.workspace;
  }

  return syncLegacyFileSystemState(next);
}

export function updateFileEntry(
  state: FileSystemState,
  fileId: string,
  updates: Partial<Pick<FileEntry, "name" | "directory" | "content">>
) {
  const next =
    updates.directory !== undefined
      ? ensureDirectoryPath(state, updates.directory)
      : cloneFileSystem(state);
  const node = next.nodes[fileId];
  if (!node) {
    const existing = next.files[fileId];
    if (!existing) {
      return next;
    }
    const directory = updates.directory ? normalizeDirectory(updates.directory) : getLegacyEntryDirectory(existing);
    const name = updates.name?.trim() ? updates.name.trim() : existing.name;
    next.files[fileId] = {
      ...existing,
      name,
      directory,
      path: getFilePath({ directory, name }),
      content: updates.content ?? existing.content,
      kind: getLegacyEntryKind(existing)
    };
    return next;
  }
  if (isRootNode(next, fileId)) {
    return next;
  }

  if (updates.content !== undefined) {
    node.content = updates.content;
    node.metadata.modifiedAt = 0;
    node.metadata.size = updates.content.length;
  }

  if (updates.name !== undefined && updates.name.trim()) {
    node.name = updates.name.trim();
    node.metadata.modifiedAt = 0;
  }

  if (updates.directory !== undefined) {
    const nextParentId = resolveDirectoryNodeId(next, updates.directory);
    if (
      nextParentId &&
      next.nodes[nextParentId]?.kind === "folder" &&
      !isDescendantNode(next, fileId, nextParentId)
    ) {
      const previousParentId = node.parentId;
      if (previousParentId && next.nodes[previousParentId]) {
        next.nodes[previousParentId].childrenOrder = next.nodes[previousParentId].childrenOrder.filter(
          (id) => id !== fileId
        );
      }
      node.parentId = nextParentId;
      if (!next.nodes[nextParentId].childrenOrder.includes(fileId)) {
        next.nodes[nextParentId].childrenOrder.push(fileId);
      }
      node.metadata.modifiedAt = 0;
    }
  }

  if (!next.nodes[next.cwdNodeId]) {
    next.cwdNodeId = next.rootNodeIds.workspace;
  }

  return syncLegacyFileSystemState(next);
}

export function getFilesInDirectory(state: FileSystemState, directory = state.cwd) {
  const directoryNodeId = resolveDirectoryNodeId(state, directory);
  if (!directoryNodeId) {
    return getLegacyFilesInDirectory(state, directory);
  }
  const directoryNode = state.nodes[directoryNodeId];
  if (!directoryNode || directoryNode.kind !== "folder") {
    return getLegacyFilesInDirectory(state, directory);
  }
  const entries = directoryNode.childrenOrder
    .map((childId) => materializeFileEntry(state, childId))
    .filter((entry): entry is FileEntry => Boolean(entry));
  if (entries.length > 0) {
    return entries;
  }
  return getLegacyFilesInDirectory(state, directory);
}

export function findFileByName(state: FileSystemState, name: string, directory = state.cwd) {
  const normalizedDirectory = normalizeDirectory(directory);
  return getFilesInDirectory(state, normalizedDirectory).find((entry) => entry.name === name);
}

export function createUniqueEntryName(
  state: FileSystemState,
  directory: string,
  baseName: string,
  extension = ""
) {
  const normalizedDirectory = normalizeDirectory(directory);
  const existingNames = getFilesInDirectory(state, normalizedDirectory).map((file) => file.name);
  let candidateName = `${baseName}${extension}`;
  let suffix = 2;
  while (existingNames.includes(candidateName)) {
    candidateName = extension ? `${baseName} ${suffix}${extension}` : `${baseName} ${suffix}`;
    suffix += 1;
  }
  return candidateName;
}

export function renameFile(
  state: FileSystemState,
  fileId: string,
  newName: string
): FileSystemState {
  const safeName = newName.trim();
  if (!safeName) {
    return cloneFileSystem(state);
  }
  return updateFileEntry(state, fileId, { name: safeName });
}

export function updateFileContent(
  state: FileSystemState,
  fileId: string,
  content: string
): FileSystemState {
  return updateFileEntry(state, fileId, { content });
}
