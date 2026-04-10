// 경로: packages/core/src/tasks/terminal.ts (또는 registry.ts 내부에 추가)

import { TaskSpec } from "../types.js"; // 실제 프로젝트의 타입 임포트 경로에 맞추세요

export const terminalRecordCwdTask: TaskSpec = {
  id: "terminal_record_working_directory",
  split: "train",
  instruction: "Open Terminal, execute the command to print the current working directory, and save the absolute path to 'cwd_log.txt'.",
  
  // 1. 환경 세팅 (필요한 가짜 데이터 주입)
  setup: (state, seed) => {
    // 터미널의 초기 작업 디렉토리를 고정합니다. (Variation을 줄 때는 seed 활용)
    const initialDir = "/home/user/projects/os-mock";
    
    // 깊은 복사 등으로 상태를 안전하게 업데이트 (OS-mock 내부 규약에 따름)
    const newState = { ...state };
    newState.terminal = {
      ...newState.terminal,
      cwd: initialDir,
      history: []
    };
    return newState;
  },

  // 2. 채점 로직 (Evaluator)
  evaluator: (state) => {
    let reward = 0;
    let terminated = false;
    const targetNoteName = "cwd_log.txt";
    const targetText = "/home/user/projects/os-mock";

    // 진행도 채점 (Progress Predicates) - 터미널 명령어를 쳤는가?
    const hasExecutedCmd = state.predicates?.['terminal.command_executed']?.('pwd');
    if (hasExecutedCmd) reward += 0.2;

    // 진행도 채점 - 노트를 열고 글을 썼는가?
    const hasAppended = state.predicates?.['note.target_appended']?.(targetNoteName, targetText);
    if (hasAppended) reward += 0.3;

    // 최종 목표 채점 (Goal Predicates) - 정확한 이름과 내용으로 저장했는가?
    const isSaved = state.predicates?.['note.saved']?.(targetNoteName, targetText);
    if (isSaved) {
      reward = 1.0; // 만점
      terminated = true; // 에피소드 종료
    }

    return { reward, terminated };
  }
};
