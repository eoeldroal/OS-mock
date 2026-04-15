import { produce } from "immer";
import type {
  A11yNode,
  AppActionResult,
  AppPlugin,
  BuildContext,
  Computer13Action,
  EnvState,
  MailLiteLayout,
  MailLiteState,
  MailLiteViewModel,
  Point,
  Rect,
  WindowInstance
} from "../types.js";
import { pointInRect } from "../system/pointer.js";
import { setClipboardText } from "../system/clipboard.js";

const HEADER_HEIGHT = 32;
const PADDING = 12;

export function getVisibleMailMessages(state: MailLiteState) {
  return state.messages.filter((message) => message.folderId === state.selectedFolder);
}

function getCanonicalMailSelection(state: MailLiteState) {
  const visibleMessages = getVisibleMailMessages(state);
  const selectedMessage = visibleMessages.find((message) => message.id === state.selectedMessageId) ?? visibleMessages[0];
  const previewBody = selectedMessage?.body ?? [];
  const selectedPreviewLineIndex =
    previewBody.length === 0 || state.selectedPreviewLineIndex === undefined
      ? undefined
      : Math.max(0, Math.min(previewBody.length - 1, state.selectedPreviewLineIndex));

  return {
    selectedMessageId: selectedMessage?.id ?? "",
    previewBody,
    selectedPreviewLineIndex
  };
}

function normalizeMailState(state: MailLiteState): MailLiteState {
  const canonical = getCanonicalMailSelection(state);
  if (
    canonical.selectedMessageId === state.selectedMessageId &&
    canonical.selectedPreviewLineIndex === state.selectedPreviewLineIndex &&
    canonical.previewBody.length === state.previewBody.length &&
    canonical.previewBody.every((line, index) => line === state.previewBody[index])
  ) {
    return state;
  }

  return {
    ...state,
    ...canonical
  };
}

function getVisibleFolderRects(layout: ReturnType<typeof getMailLiteLayout>) {
  const compactFolderList = layout.sidebarBounds.width < 190;
  const paneTop = compactFolderList ? 90 : 112;
  return layout.folderRects.map((rect) => ({
    ...rect,
    y: layout.sidebarBounds.y + paneTop + (rect.y - layout.sidebarBounds.y + 14 - 36)
  }));
}

function getVisibleMessageRects(layout: ReturnType<typeof getMailLiteLayout>) {
  return layout.messageRects.map((rect) => ({
    ...rect,
    y: rect.y + 20
  }));
}

export function handleMailAction(
  state: EnvState,
  window: WindowInstance,
  mail: MailLiteState,
  action: Computer13Action,
  point: Point
): AppActionResult | null {
  const stableMail = normalizeMailState(mail);
  const layout = getMailLiteLayout(window.bounds, stableMail);
  const visibleFolderRects = getVisibleFolderRects(layout);
  const visibleMessageRects = getVisibleMessageRects(layout);

  if (action.type === "CLICK") {
    let handled = false;
    const next = produce(state, (draft) => {
      const nextMail = draft.appStates.mailLite[window.id];

      const clickedFolderIndex = visibleFolderRects.findIndex((rect) => pointInRect(point, rect));
      if (clickedFolderIndex >= 0) {
        const folder = nextMail.folders[clickedFolderIndex];
        nextMail.selectedFolder = folder.id;
        const firstMessage = getVisibleMailMessages(nextMail)[0];
        nextMail.selectedMessageId = firstMessage?.id ?? "";
        nextMail.previewBody = firstMessage?.body ?? [];
        nextMail.selectedPreviewLineIndex = undefined;
        handled = true;
        return;
      }

      const visibleMessages = getVisibleMailMessages(nextMail);
      const clickedMessageIndex = visibleMessageRects.findIndex((rect) => pointInRect(point, rect));
      if (clickedMessageIndex >= 0 && visibleMessages[clickedMessageIndex]) {
        const message = visibleMessages[clickedMessageIndex];
        nextMail.selectedMessageId = message.id;
        nextMail.previewBody = message.body;
        nextMail.selectedPreviewLineIndex = undefined;
        handled = true;
        return;
      }

      const clickedPreviewLineIndex = layout.previewLineRects.findIndex((rect) => pointInRect(point, rect));
      if (clickedPreviewLineIndex >= 0) {
        nextMail.selectedPreviewLineIndex = clickedPreviewLineIndex;
        handled = true;
        return;
      }
    });

    if (handled) {
      const normalizedNext = produce(next, (draft) => {
        draft.appStates.mailLite[window.id] = normalizeMailState(draft.appStates.mailLite[window.id]);
      });
      return {
        appState: normalizedNext.appStates.mailLite[window.id],
        envState: normalizedNext,
        accepted: true
      };
    }
    // Click on empty area in mail: accept as focus click
    return { appState: stableMail, envState: state, accepted: true };
  }

  if (action.type === "HOTKEY") {
    const normalized = action.keys.map((key) => key.toLowerCase()).sort();
    if (normalized.includes("ctrl") && normalized.includes("c")) {
      if (!stableMail.previewBody[stableMail.selectedPreviewLineIndex ?? -1]) {
        return null;
      }
      const next = produce(state, (draft) => {
        const nextMail = draft.appStates.mailLite[window.id];
        draft.appStates.mailLite[window.id] = normalizeMailState(nextMail);
        const canonicalMail = draft.appStates.mailLite[window.id];
        const selectedLine = canonicalMail.previewBody[canonicalMail.selectedPreviewLineIndex ?? -1];
        draft.clipboard = setClipboardText(draft.clipboard, selectedLine);
      });
      return { appState: next.appStates.mailLite[window.id], envState: next, accepted: true };
    }
  }

  if (action.type === "SCROLL") {
    const direction = action.dy > 0 ? 1 : action.dy < 0 ? -1 : 0;
    if (direction === 0) {
      return null;
    }

    if (stableMail.previewBody.length === 0) {
      return null;
    }

    const next = produce(state, (draft) => {
      const nextMail = draft.appStates.mailLite[window.id];
      draft.appStates.mailLite[window.id] = normalizeMailState(nextMail);
      const canonicalMail = draft.appStates.mailLite[window.id];
      const current = canonicalMail.selectedPreviewLineIndex ?? 0;
      const newIndex = Math.max(0, Math.min(canonicalMail.previewBody.length - 1, current + direction));
      canonicalMail.selectedPreviewLineIndex = newIndex;
    });
    return { appState: next.appStates.mailLite[window.id], envState: next, accepted: true };
  }

  return null;
}

export function getMailLiteLayout(bounds: Rect, state: MailLiteState) {
  const PREVIEW_HEADER_ZONE = 86;
  const FOLDER_ROW_HEIGHT = 52;
  const FOLDER_ROW_GAP = 8;
  const headerBounds = {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: 42
  };
  const gutter = 12;
  const contentWidth = bounds.width - PADDING * 2 - gutter * 2;
  const stackedPreview = bounds.width < 560;
  const totalFr = 0.9 + 1.25 + 1.9;
  const sidebarWidth = Math.max(92, Math.floor((contentWidth * 0.9) / totalFr));
  const messageListWidth = stackedPreview
    ? Math.max(220, contentWidth - sidebarWidth)
    : Math.max(138, Math.floor((contentWidth * 1.25) / totalFr));
  const previewWidth = stackedPreview
    ? messageListWidth
    : Math.max(170, contentWidth - sidebarWidth - messageListWidth);
  const sidebarBounds = {
    x: bounds.x + PADDING,
    y: bounds.y + headerBounds.height + 18,
    width: sidebarWidth,
    height: bounds.height - headerBounds.height - 30
  };
  const rightPaneX = sidebarBounds.x + sidebarWidth + gutter;
  const rightPaneHeight = sidebarBounds.height;
  const messagePaneHeight = stackedPreview ? Math.max(148, Math.floor((rightPaneHeight - gutter) * 0.34)) : sidebarBounds.height;
  const messagesBounds = {
    x: rightPaneX,
    y: sidebarBounds.y,
    width: messageListWidth,
    height: messagePaneHeight
  };
  const previewBounds = stackedPreview
    ? {
        x: rightPaneX,
        y: messagesBounds.y + messagesBounds.height + gutter,
        width: previewWidth,
        height: rightPaneHeight - messagePaneHeight - gutter
      }
    : {
        x: messagesBounds.x + messageListWidth + gutter,
        y: sidebarBounds.y,
        width: previewWidth,
        height: sidebarBounds.height
      };
  const visibleMessages = getVisibleMailMessages(state);
  return {
    headerBounds,
    sidebarBounds,
    messagesBounds,
    previewBounds,
    folderRects: state.folders.map((_, index) => ({
      x: sidebarBounds.x + 10,
      y: sidebarBounds.y + index * (FOLDER_ROW_HEIGHT + FOLDER_ROW_GAP) + 10,
      width: sidebarBounds.width - 20,
      height: FOLDER_ROW_HEIGHT
    })),
    messageRects: visibleMessages.map((_, index) => ({
      x: messagesBounds.x + 10,
      y: messagesBounds.y + index * 72 + 10,
      width: messagesBounds.width - 20,
      height: 60
    })),
    previewLineRects: state.previewBody.map((_, index) => ({
      x: previewBounds.x + 10,
      y: previewBounds.y + PREVIEW_HEADER_ZONE + index * 24,
      width: previewBounds.width - 20,
      height: 22
    })),
    visibleMessages
  };
}

export const mailLitePlugin: AppPlugin<MailLiteState> = {
  id: "mail-lite",
  title: "Thunderbird",
  create() {
    return {
      id: "mail-1",
      selectedFolder: "inbox",
      folders: [],
      messages: [],
      selectedMessageId: "",
      previewBody: [],
      selectedPreviewLineIndex: undefined
    };
  },
  reduce(state) {
    return normalizeMailState(state);
  },
  buildA11y(state, ctx: BuildContext) {
    const stableMail = normalizeMailState(state);
    const nextLayout = getMailLiteLayout(ctx.window.bounds, stableMail);
    const visibleFolderRects = getVisibleFolderRects(nextLayout);
    const visibleMessageRects = getVisibleMessageRects(nextLayout);
    const selectedMessage =
      stableMail.messages.find((message) => message.id === stableMail.selectedMessageId) ?? nextLayout.visibleMessages[0];
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
            id: `${ctx.window.id}-folders`,
            role: "list",
            name: "Folders",
            bounds: nextLayout.sidebarBounds,
            visible: true,
            enabled: true,
            focusable: true,
            focused: false,
            children: stableMail.folders.map((folder, index) => ({
              id: `${ctx.window.id}-folder-${folder.id}`,
              role: "listitem",
              name: folder.name,
              text: folder.unread > 0 ? `${folder.unread} unread` : "No unread messages",
              bounds: visibleFolderRects[index],
              visible: true,
              enabled: true,
              focusable: true,
              focused: stableMail.selectedFolder === folder.id,
              children: []
            }))
          },
          {
            id: `${ctx.window.id}-messages`,
            role: "list",
            name: "Messages",
            bounds: nextLayout.messagesBounds,
            visible: true,
            enabled: true,
            focusable: true,
            focused: false,
            children: nextLayout.visibleMessages.map((message, index) => ({
              id: `${ctx.window.id}-message-${message.id}`,
              role: "listitem",
              name: `${message.sender} - ${message.subject}`,
              text: message.preview,
              bounds: visibleMessageRects[index],
              visible: true,
              enabled: true,
              focusable: true,
              focused: selectedMessage?.id === message.id,
              children: []
            }))
          },
          {
            id: `${ctx.window.id}-preview`,
            role: "textbox",
            name: selectedMessage?.subject ?? "Message preview",
            text: stableMail.previewBody.join("\n"),
            bounds: nextLayout.previewBounds,
            visible: true,
            enabled: true,
            focusable: true,
            focused: false,
            children: stableMail.previewBody.map((line, index) => ({
                id: `${ctx.window.id}-preview-line-${index}`,
                role: "label",
                name: `Preview line ${index + 1}`,
                text: line,
                bounds: nextLayout.previewLineRects[index],
                visible: true,
                enabled: true,
                focusable: true,
                focused: stableMail.selectedPreviewLineIndex === index,
                children: []
              }))
          }
        ]
      }
    ];
  },
  buildViewModel(state, ctx: BuildContext): MailLiteViewModel {
    const stableMail = normalizeMailState(state);
    const layout = getMailLiteLayout(ctx.window.bounds, stableMail);
    const visibleMessages = getVisibleMailMessages(stableMail);
    return {
      type: "mail-lite",
      selectedFolder: stableMail.selectedFolder,
      folders: stableMail.folders,
      messages: visibleMessages,
      selectedMessageId: stableMail.selectedMessageId,
      previewBody: stableMail.previewBody,
      selectedPreviewLineIndex: stableMail.selectedPreviewLineIndex,
      layout: {
        headerBounds: layout.headerBounds,
        sidebarBounds: layout.sidebarBounds,
        folderRects: layout.folderRects,
        messageListBounds: layout.messagesBounds,
        messageRects: layout.messageRects,
        previewBounds: layout.previewBounds,
        previewLineRects: layout.previewLineRects
      }
    };
  }
};
