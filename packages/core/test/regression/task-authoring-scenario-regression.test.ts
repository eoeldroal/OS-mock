import { describe, expect, it } from "vitest";
import { MockOsEnv } from "../../src/env/session.js";

function resetTask(taskId: string) {
  const env = new MockOsEnv();
  env.reset({ taskId, seed: 0, maxSteps: 0 });
  return env.getHiddenState().envState;
}

describe("task authoring scenario regression", () => {
  it("keeps starter desktop tasks workspace-driven", () => {
    const popupState = resetTask("dismiss_popup_then_append_note");
    expect(popupState.popups.map((popup) => popup.id)).toContain("popup-1");
    expect(popupState.windows.find((window) => window.id === "explorer-main")).toBeTruthy();
    expect(popupState.windows.find((window) => window.id === "browser-main")?.minimized).toBe(true);
    expect(popupState.windows.find((window) => window.id === "terminal-main")?.minimized).toBe(true);
    expect(popupState.windows.find((window) => window.id === "mail-main")?.minimized).toBe(true);

    const copyState = resetTask("copy_line_between_windows");
    expect(copyState.windows.find((window) => window.id === "notes-source")?.focused).toBe(true);
    expect(copyState.windows.find((window) => window.id === "notes-target")).toBeTruthy();

    const recoverState = resetTask("minimize_recover_and_save");
    expect(recoverState.windows.find((window) => window.id === "notes-recover")?.minimized).toBe(true);
  });

  it("keeps representative cross-app tasks scenario-authored without pre-opening notes", () => {
    const mailState = resetTask("mail_extract_mock_note");
    expect(mailState.windows.find((window) => window.id === "mail-main")?.focused).toBe(true);
    expect(mailState.windows.find((window) => window.id === "explorer-main")).toBeTruthy();
    expect(Object.values(mailState.appStates.noteEditor).find((note) => note.fileId === "file-mail-log")).toBeFalsy();
    expect(mailState.fileSystem.nodes["file-mail-log"]).toBeTruthy();

    const terminalState = resetTask("terminal_record_working_directory");
    expect(terminalState.windows.find((window) => window.id === "terminal-main")?.focused).toBe(true);
    expect(terminalState.windows.find((window) => window.id === "explorer-main")).toBeTruthy();
    expect(
      Object.values(terminalState.appStates.noteEditor).find((note) => note.fileId === "file-terminal-log")
    ).toBeFalsy();
    expect(terminalState.fileSystem.nodes["file-terminal-log"]).toBeTruthy();
  });
});
