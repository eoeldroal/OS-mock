import type { FileEntry, FileSystemState } from "../types.js";
import {
  findFileByName,
  getFileDirectory,
  getFilesInDirectory,
  getFilePath,
  normalizeDirectory,
  resolveDirectoryNodeId
} from "../system/filesystem.js";

export type TerminalCommandContext = {
  cwd: string;
  fileSystem: FileSystemState;
};

export type CommandResult = {
  output: string[];
  cwd?: string;
  fileSystemChanges?: {
    created?: Array<{ name: string; directory: string; content: string; kind?: FileEntry["kind"] }>;
    updated?: Array<{ id: string; content?: string; name?: string; directory?: string }>;
    deleted?: string[]; // file IDs to delete
  };
};

type CommandHandler = (args: string, ctx: TerminalCommandContext) => CommandResult;

function tokenizeArgs(input: string) {
  const tokens: string[] = [];
  let current = "";
  let inSingle = false;
  let inDouble = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (char === "'" && !inDouble) {
      inSingle = !inSingle;
      continue;
    }
    if (char === '"' && !inSingle) {
      inDouble = !inDouble;
      continue;
    }
    if (!inSingle && !inDouble && /\s/.test(char)) {
      if (current) {
        tokens.push(current);
        current = "";
      }
      continue;
    }
    current += char;
  }

  if (current) {
    tokens.push(current);
  }

  return tokens;
}

function stripMatchingQuotes(input: string) {
  const trimmed = input.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function resolveDirectory(input: string, ctx: TerminalCommandContext) {
  const trimmed = stripMatchingQuotes(input);
  if (!trimmed || trimmed === "~") {
    return ctx.fileSystem.roots.Home;
  }
  if (trimmed === ".") {
    return ctx.cwd;
  }
  if (trimmed === "..") {
    return getFileDirectory(ctx.cwd);
  }
  if (trimmed.startsWith("/")) {
    return normalizeDirectory(trimmed);
  }
  return normalizeDirectory(`${ctx.cwd}/${trimmed}`);
}

function directoryExists(state: FileSystemState, directory: string) {
  return Boolean(resolveDirectoryNodeId(state, directory));
}

function splitDestination(destination: string, ctx: TerminalCommandContext, sourceName?: string) {
  const trimmed = stripMatchingQuotes(destination);
  if (!trimmed) {
    return { directory: ctx.cwd, name: "" };
  }
  const resolvedPath = trimmed.startsWith("/")
    ? normalizeDirectory(trimmed)
    : normalizeDirectory(`${ctx.cwd}/${trimmed}`);
  if (directoryExists(ctx.fileSystem, resolvedPath)) {
    return {
      directory: resolvedPath,
      name: sourceName ?? ""
    };
  }
  if (trimmed.startsWith("/")) {
    return {
      directory: getFileDirectory(trimmed),
      name: trimmed.split("/").pop() ?? ""
    };
  }
  if (trimmed.includes("/")) {
    const resolved = normalizeDirectory(`${ctx.cwd}/${trimmed}`);
    return {
      directory: getFileDirectory(resolved),
      name: resolved.split("/").pop() ?? ""
    };
  }
  return { directory: ctx.cwd, name: trimmed };
}

// pwd: Print working directory
function pwd(args: string, ctx: TerminalCommandContext): CommandResult {
  return {
    output: [ctx.cwd]
  };
}

// ls: List files
function ls(args: string, ctx: TerminalCommandContext): CommandResult {
  const [targetArg] = tokenizeArgs(args);
  const targetDirectory = targetArg ? resolveDirectory(targetArg, ctx) : ctx.cwd;
  if (!directoryExists(ctx.fileSystem, targetDirectory)) {
    return {
      output: [`ls: cannot access '${targetArg ?? args.trim()}': No such file or directory`]
    };
  }
  const fileNames = getFilesInDirectory(ctx.fileSystem, targetDirectory)
    .map((file) => (file.kind === "folder" ? `${file.name}/` : file.name))
    .join("  ");
  return {
    output: [fileNames]
  };
}

// cat: Read file content
function cat(args: string, ctx: TerminalCommandContext): CommandResult {
  const [fileName = ""] = tokenizeArgs(args);
  const file = findFileByName(ctx.fileSystem, fileName, ctx.cwd);
  if (file) {
    if (file.kind === "folder") {
      return {
        output: [`cat: ${fileName}: Is a directory`]
      };
    }
    return {
      output: file.content.split("\n")
    };
  } else {
    return {
      output: [`cat: ${fileName}: No such file`]
    };
  }
}

// echo: Print text with redirect support
function echo(args: string, ctx: TerminalCommandContext): CommandResult {
  const text = args.trim();

  // Parse echo with redirect support, respecting quoted strings.
  // Walk the string to find an unquoted `>` or `>>` for redirection.
  let unquotedRedirectIndex = -1;
  let isAppend = false;
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "'" && !inDouble) { inSingle = !inSingle; continue; }
    if (ch === '"' && !inSingle) { inDouble = !inDouble; continue; }
    if (ch === ">" && !inSingle && !inDouble) {
      unquotedRedirectIndex = i;
      if (text[i + 1] === ">") { isAppend = true; }
      break;
    }
  }

  if (unquotedRedirectIndex >= 0) {
    const rawContent = text.slice(0, unquotedRedirectIndex).trim();
    const content = rawContent.replace(/^["']|["']$/g, "").trim();
    const targetName = text.slice(unquotedRedirectIndex + (isAppend ? 2 : 1)).trim();
    if (!targetName) {
      return {
        output: ["bash: syntax error near unexpected token `newline'"]
      };
    } else {
      const file = findFileByName(ctx.fileSystem, targetName, ctx.cwd);
      if (file) {
        if (file.kind === "folder") {
          return {
            output: [`bash: ${targetName}: Is a directory`]
          };
        }
        const newContent = isAppend ? (file.content ? file.content + "\n" + content : content) : content;
        return {
          output: [`(${isAppend ? "appended to" : "wrote to"} ${targetName})`],
          fileSystemChanges: {
            updated: [{ id: file.id, content: newContent }]
          }
        };
      } else {
        return {
          output: [`(${isAppend ? "appended to" : "wrote to"} ${targetName})`],
          fileSystemChanges: {
            created: [{
              name: targetName,
              directory: ctx.cwd,
              content
            }]
          }
        };
      }
    }
  } else {
    const output = text.replace(/^["']|["']$/g, "");
    return {
      output: [output]
    };
  }
}

// wc: Word count
function wc(args: string, ctx: TerminalCommandContext): CommandResult {
  if (!args.trim()) {
    return {
      output: ["wc: missing operand"]
    };
  }

  const parts = tokenizeArgs(args);
  const isLineCount = parts[0] === "-l";
  const fileName = isLineCount ? parts.slice(1).join(" ") : parts.join(" ");
  const file = findFileByName(ctx.fileSystem, fileName, ctx.cwd);
  if (file) {
    // Empty file = 0 lines; non-empty = count newline-terminated lines
    const lineCount = file.content === "" ? 0 : file.content.split("\n").length;
    const words = file.content.split(/\s+/).filter(Boolean);
    if (isLineCount) {
      return {
        output: [`${lineCount} ${fileName}`]
      };
    } else {
      return {
        output: [`${lineCount} ${words.length} ${file.content.length} ${fileName}`]
      };
    }
  } else {
    return {
      output: [`wc: ${fileName}: No such file`]
    };
  }
}

// head: Print first lines of a file
function head(args: string, ctx: TerminalCommandContext): CommandResult {
  if (!args.trim()) {
    return {
      output: ["head: missing operand"]
    };
  }

  const parts = tokenizeArgs(args);
  let n = 5;
  let fileName = parts[0];
  if (parts[0] === "-n" && parts.length >= 3) {
    const parsed = parseInt(parts[1], 10);
    n = Math.max(0, Number.isNaN(parsed) ? 5 : parsed);
    fileName = parts[2];
  } else if (parts.length >= 1) {
    fileName = parts[parts.length - 1];
  }
  const file = findFileByName(ctx.fileSystem, fileName, ctx.cwd);
  if (file) {
    if (n > 0) {
      return {
        output: file.content.split("\n").slice(0, n)
      };
    } else {
      return {
        output: []
      };
    }
  } else {
    return {
      output: [`head: ${fileName}: No such file`]
    };
  }
}

// touch: Create or update a file
function touch(args: string, ctx: TerminalCommandContext): CommandResult {
  if (!args.trim()) {
    return {
      output: ["touch: missing operand"]
    };
  }

  const [fileName = ""] = tokenizeArgs(args);
  const existing = findFileByName(ctx.fileSystem, fileName, ctx.cwd);
  if (!existing) {
    return {
      output: [`(created ${fileName})`],
      fileSystemChanges: {
        created: [{
          name: fileName,
          directory: ctx.cwd,
          content: ""
        }]
      }
    };
  } else {
    if (existing.kind === "folder") {
      return {
        output: [`touch: cannot touch '${fileName}': Is a directory`]
      };
    }
    return {
      output: [`(touched ${fileName})`]
    };
  }
}

function cd(args: string, ctx: TerminalCommandContext): CommandResult {
  const [targetArg = ""] = tokenizeArgs(args);
  const targetDirectory = resolveDirectory(targetArg, ctx);
  if (!directoryExists(ctx.fileSystem, targetDirectory)) {
    return {
      output: [`cd: ${targetArg || "~"}: No such file or directory`]
    };
  }
  return {
    output: [],
    cwd: targetDirectory
  };
}

function mkdir(args: string, ctx: TerminalCommandContext): CommandResult {
  const [folderName = ""] = tokenizeArgs(args);
  if (!folderName) {
    return {
      output: ["mkdir: missing operand"]
    };
  }
  if (findFileByName(ctx.fileSystem, folderName, ctx.cwd)) {
    return {
      output: [`mkdir: cannot create directory '${folderName}': File exists`]
    };
  }
  return {
    output: [],
    fileSystemChanges: {
      created: [
        {
          name: folderName,
          directory: ctx.cwd,
          content: "",
          kind: "folder"
        }
      ]
    }
  };
}

function cp(args: string, ctx: TerminalCommandContext): CommandResult {
  const [sourceName, destinationName] = tokenizeArgs(args);
  if (!sourceName || !destinationName) {
    return {
      output: ["cp: missing file operand"]
    };
  }
  const source = findFileByName(ctx.fileSystem, sourceName, ctx.cwd);
  if (!source) {
    return {
      output: [`cp: cannot stat '${sourceName}': No such file or directory`]
    };
  }
  if (source.kind === "folder") {
    return {
      output: [`cp: -r not specified; omitting directory '${sourceName}'`]
    };
  }
  const target = splitDestination(destinationName, ctx, source.name);
  if (!target.name) {
    return {
      output: [`cp: cannot create regular file '${destinationName}'`]
    };
  }
  const existing = findFileByName(ctx.fileSystem, target.name, target.directory);
  if (existing) {
    return {
      output: [],
      fileSystemChanges: {
        updated: [{ id: existing.id, content: source.content }]
      }
    };
  }
  return {
    output: [],
    fileSystemChanges: {
      created: [
        {
          name: target.name,
          directory: target.directory,
          content: source.content,
          kind: "file"
        }
      ]
    }
  };
}

function mv(args: string, ctx: TerminalCommandContext): CommandResult {
  const [sourceName, destinationName] = tokenizeArgs(args);
  if (!sourceName || !destinationName) {
    return {
      output: ["mv: missing file operand"]
    };
  }
  const source = findFileByName(ctx.fileSystem, sourceName, ctx.cwd);
  if (!source) {
    return {
      output: [`mv: cannot stat '${sourceName}': No such file or directory`]
    };
  }
  const target = splitDestination(destinationName, ctx, source.name);
  if (!target.name) {
    return {
      output: [`mv: cannot move '${sourceName}' to '${destinationName}'`]
    };
  }
  return {
    output: [],
    fileSystemChanges: {
      updated: [
        {
          id: source.id,
          name: target.name,
          directory: target.directory
        }
      ]
    }
  };
}

// rm: Remove a file
function rm(args: string, ctx: TerminalCommandContext): CommandResult {
  if (!args.trim()) {
    return {
      output: ["rm: missing operand"]
    };
  }

  const [fileName = ""] = tokenizeArgs(args);
  const file = findFileByName(ctx.fileSystem, fileName, ctx.cwd);
  if (file) {
    return {
      output: [`(removed ${fileName})`],
      fileSystemChanges: {
        deleted: [file.id]
      }
    };
  } else {
    return {
      output: [`rm: ${fileName}: No such file`]
    };
  }
}

// Command registry
const COMMANDS: Record<string, CommandHandler> = {
  pwd,
  cd,
  ls,
  cat,
  echo,
  wc,
  head,
  mkdir,
  cp,
  mv,
  touch,
  rm
};

// Main executor
export function executeCommand(input: string, ctx: TerminalCommandContext): CommandResult {
  const trimmedInput = input.trim();

  if (!trimmedInput) {
    return { output: [] };
  }

  // Split command name from args
  const spaceIndex = trimmedInput.indexOf(" ");
  const commandName = spaceIndex >= 0 ? trimmedInput.slice(0, spaceIndex) : trimmedInput;
  const args = spaceIndex >= 0 ? trimmedInput.slice(spaceIndex + 1) : "";

  // Look up handler
  const handler = COMMANDS[commandName];
  if (!handler) {
    return {
      output: [`command not found: ${trimmedInput}`]
    };
  }

  return handler(args, ctx);
}
