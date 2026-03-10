import type { A11yNode, AppPlugin, BuildContext, MailLiteState, MailLiteViewModel, Rect } from "../types.js";

const HEADER_HEIGHT = 32;
const PADDING = 12;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function getVisibleMailMessages(state: MailLiteState) {
  return state.messages.filter((message) => message.folderId === state.selectedFolder);
}

export function getMailLiteLayout(bounds: Rect, state: MailLiteState) {
  const availableWidth = bounds.width - PADDING * 2;
  const sidebarWidth = clamp(Math.floor(availableWidth * 0.24), 96, 160);
  const messageListWidth = clamp(Math.floor(availableWidth * 0.32), 120, 250);
  const gutter = 12;
  const sidebarBounds = {
    x: bounds.x + PADDING,
    y: bounds.y + HEADER_HEIGHT + 58,
    width: sidebarWidth,
    height: bounds.height - HEADER_HEIGHT - 70
  };
  const messagesBounds = {
    x: sidebarBounds.x + sidebarWidth + gutter,
    y: sidebarBounds.y,
    width: messageListWidth,
    height: sidebarBounds.height
  };
  const previewBounds = {
    x: messagesBounds.x + messageListWidth + gutter,
    y: sidebarBounds.y,
    width: bounds.x + bounds.width - PADDING - (messagesBounds.x + messageListWidth + gutter),
    height: sidebarBounds.height
  };
  const visibleMessages = getVisibleMailMessages(state);
  return {
    sidebarBounds,
    messagesBounds,
    previewBounds,
    folderRects: state.folders.map((_, index) => ({
      x: sidebarBounds.x + 10,
      y: sidebarBounds.y + index * 44 + 10,
      width: sidebarBounds.width - 20,
      height: 36
    })),
    messageRects: visibleMessages.map((_, index) => ({
      x: messagesBounds.x + 10,
      y: messagesBounds.y + index * 92 + 10,
      width: messagesBounds.width - 20,
      height: 78
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
      previewBody: []
    };
  },
  reduce(state) {
    return state;
  },
  buildA11y(state, ctx: BuildContext) {
    const nextLayout = getMailLiteLayout(ctx.window.bounds, state);
    const selectedMessage =
      state.messages.find((message) => message.id === state.selectedMessageId) ?? nextLayout.visibleMessages[0];
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
            children: state.folders.map((folder, index) => ({
              id: `${ctx.window.id}-folder-${folder.id}`,
              role: "listitem",
              name: folder.name,
              text: folder.unread > 0 ? `${folder.unread} unread` : "No unread messages",
              bounds: nextLayout.folderRects[index],
              visible: true,
              enabled: true,
              focusable: true,
              focused: state.selectedFolder === folder.id,
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
              bounds: nextLayout.messageRects[index],
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
            text: state.previewBody.join("\n"),
            bounds: nextLayout.previewBounds,
            visible: true,
            enabled: true,
            focusable: true,
            focused: false,
            children: state.previewBody.map((line, index) => ({
              id: `${ctx.window.id}-preview-line-${index}`,
              role: "label",
              name: `Preview line ${index + 1}`,
              text: line,
              bounds: {
                x: nextLayout.previewBounds.x + 10,
                y: nextLayout.previewBounds.y + 14 + index * 24,
                width: nextLayout.previewBounds.width - 20,
                height: 22
              },
              visible: true,
              enabled: true,
              focusable: false,
              focused: false,
              children: []
            }))
          }
        ]
      }
    ];
  },
  buildViewModel(state): MailLiteViewModel {
    return {
      type: "mail-lite",
      selectedFolder: state.selectedFolder,
      folders: state.folders,
      messages: getVisibleMailMessages(state),
      selectedMessageId: state.selectedMessageId,
      previewBody: state.previewBody
    };
  }
};
