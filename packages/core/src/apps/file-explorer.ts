import type {
  A11yNode,
  AppPlugin,
  BuildContext,
  FileEntry,
  FileExplorerState,
  FileExplorerViewModel,
  ReduceContext,
  Rect
} from "../types.js";
import { getOrderedFiles } from "../system/filesystem.js";

const HEADER_HEIGHT = 40;
const SIDEBAR_WIDTH = 176;
const TOOLBAR_HEIGHT = 54;
const MAIN_PADDING = 16;
const ROW_HEIGHT = 50;

export function getFileExplorerLayout(bounds: Rect, fileCount: number) {
  const mainX = bounds.x + SIDEBAR_WIDTH;
  const sectionY = bounds.y + HEADER_HEIGHT + TOOLBAR_HEIGHT + MAIN_PADDING;
  const listY = sectionY + 24;
  const listBounds = {
    x: mainX + MAIN_PADDING,
    y: listY,
    width: bounds.width - SIDEBAR_WIDTH - MAIN_PADDING * 2,
    height: bounds.height - HEADER_HEIGHT - TOOLBAR_HEIGHT - MAIN_PADDING * 2 - 24
  };

  const rows = Array.from({ length: fileCount }).map((_, index) => ({
    x: listBounds.x,
    y: listBounds.y + index * ROW_HEIGHT,
    width: listBounds.width,
    height: ROW_HEIGHT
  }));

  return {
    renameHintBounds: {
      x: mainX + MAIN_PADDING,
      y: sectionY,
      width: 220,
      height: 20
    },
    listBounds,
    rows
  };
}

function buildFileNode(file: FileEntry, bounds: Rect, selected: boolean): A11yNode {
  return {
    id: `file-${file.id}`,
    role: "listitem",
    name: file.name,
    text: file.path,
    bounds,
    visible: true,
    enabled: true,
    focusable: true,
    focused: selected,
    children: []
  };
}

export const fileExplorerPlugin: AppPlugin<FileExplorerState> = {
  id: "file-explorer",
  title: "File Explorer",
  create() {
    return {
      id: "explorer-1"
    };
  },
  reduce(state) {
    return state;
  },
  buildA11y(state, ctx: BuildContext) {
    const files = getOrderedFiles(ctx.envState.fileSystem);
    const layout = getFileExplorerLayout(ctx.window.bounds, files.length);
    return [
      {
        id: `${ctx.window.id}-window`,
        role: "window",
        name: ctx.window.title,
        bounds: ctx.window.bounds,
        visible: !ctx.window.minimized,
        enabled: true,
        focusable: true,
        focused: ctx.window.focused,
        children: [
          {
            id: `${ctx.window.id}-list`,
            role: "list",
            name: "Files",
            bounds: layout.listBounds,
            visible: true,
            enabled: true,
            focusable: true,
            focused: ctx.window.focused,
            children: files.map((file, index) =>
              buildFileNode(file, layout.rows[index], state.selectedFileId === file.id)
            )
          },
          {
            id: `${ctx.window.id}-rename-hint`,
            role: "label",
            name: "Workspace files heading",
            text: state.renameMode ? `Renaming ${state.renameMode.draft}` : "Workspace files",
            bounds: layout.renameHintBounds,
            visible: true,
            enabled: true,
            focusable: false,
            focused: false,
            children: []
          }
        ]
      }
    ];
  },
  buildViewModel(state, ctx: BuildContext): FileExplorerViewModel {
    return {
      type: "file-explorer",
      selectedFileId: state.selectedFileId,
      renameMode: state.renameMode,
      files: getOrderedFiles(ctx.envState.fileSystem)
    };
  }
};
