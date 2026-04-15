import type {
  BrowserLiteViewModel,
  FileExplorerViewModel,
  MailLiteViewModel,
  NoteEditorViewModel,
  TerminalLiteViewModel
} from "../../../../core/src/types.js";

export type WindowBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type WindowBodyProps<T> = {
  model: T;
  windowBounds: WindowBounds;
  focused?: boolean;
};

export type FileExplorerBodyProps = WindowBodyProps<FileExplorerViewModel>;
export type NoteEditorBodyProps = WindowBodyProps<NoteEditorViewModel>;
export type BrowserBodyProps = WindowBodyProps<BrowserLiteViewModel>;
export type TerminalBodyProps = WindowBodyProps<TerminalLiteViewModel>;
export type MailBodyProps = WindowBodyProps<MailLiteViewModel>;
