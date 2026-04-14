# MockOsEnv 코드베이스 심층 분석 및 근본적 개선 방안

## Executive Summary

이 문서는 원래 초기 MockOsEnv 구조를 해부하기 위한 분석 초안으로 시작했지만, 현재는 **리팩토링 전 baseline과 현재 구조 사이를 연결하는 paper-draft 메모**로 읽는 것이 맞다.

현재 코드베이스 기준으로는:

- `packages/core`, `packages/mcp-server`, `packages/web` 아래 TypeScript/TSX 소스가 약 `25,198 LoC`
- 총 `86`개의 `.ts` / `.tsx` source file
- 핵심 hotspot은 여전히 [env/reducer.ts](/Users/baghyeonbin/Desktop/CoWork/packages/core/src/env/reducer.ts), [apps/browser-lite.ts](/Users/baghyeonbin/Desktop/CoWork/packages/core/src/apps/browser-lite.ts), [tasks/files-window-tasks.ts](/Users/baghyeonbin/Desktop/CoWork/packages/core/src/tasks/files-window-tasks.ts), [tasks/scenario-builders.ts](/Users/baghyeonbin/Desktop/CoWork/packages/core/src/tasks/scenario-builders.ts), [tasks/team3/mail.ts](/Users/baghyeonbin/Desktop/CoWork/packages/core/src/tasks/team3/mail.ts), [tasks/team3/terminal.ts](/Users/baghyeonbin/Desktop/CoWork/packages/core/src/tasks/team3/terminal.ts) 쪽이다.

따라서 아래 분석은 “현재도 여전히 유효한 구조적 교훈”을 정리한 문서이지만, 숫자와 일부 파일 예시는 **pre-refactor snapshot 기반의 문제 제기**와 **current implementation의 상태 요약**이 함께 섞여 있다고 보는 편이 정확하다.

---

## Part 1: 정량적 코드베이스 분석

### 1.1 파일별 핵심 지표

아래 표는 현재 구현 기준의 대표 hotspot만 다시 적은 것이다.

| 파일 | LoC | 함수 | structuredClone | pointInRect | 의존성 |
|------|-----|------|----------------|-------------|--------|
| **env/reducer.ts** | **1,020** | - | **1** | **14** | hotspot |
| apps/browser-lite.ts | 970 | - | 0 | 0 | hotspot |
| tasks/representative/browser-extended-tasks.ts | 953 | - | 0 | 0 | hotspot |
| tasks/team3/mail.ts | 803 | - | 0 | 0 | hotspot |
| tasks/starter/browser-extended-tasks.ts | 798 | - | 0 | 0 | hotspot |
| tasks/files-window-tasks.ts | 720 | - | 0 | 0 | hotspot |
| tasks/team3/terminal.ts | 710 | - | 0 | 0 | hotspot |
| tasks/scenario-builders.ts | 595 | - | 0 | 0 | hotspot |
| **합계(source)** | **25,198** | - | **8** | **38** | - |

**현재 핵심 발견:** 초기 구조에서 가장 심각했던 `structuredClone` 남용은 상당히 줄었지만, [reducer.ts](/Users/baghyeonbin/Desktop/CoWork/packages/core/src/env/reducer.ts) 의 책임 집중과 task family 쪽의 대형 파일 문제는 여전히 남아 있다.

### 1.2 Reducer 내부 복잡도

- 현재도 reducer는 약 `1,020 LoC` 규모이며, if 계열 분기 수가 많다.
- **교차 도메인 상태 변이 6패턴**: Terminal→FileSystem, FileExplorer↔NoteEditor, NoteEditor↔FileSystem, Multi-App→Clipboard, Popup↔Windows, Terminal→Windows(rm 명령)
- CLICK 핸들러 단독으로 **70줄** (1202~1303)이며 5개 앱에 대한 if-else 체인
- `runTerminalCommand` 단독으로 **166줄** (666~832)

이 문서의 원래 문제의식은 여전히 유효하다. 다만 현재 구현에서는 reducer가 모든 문제의 유일한 원천이라기보다:

- reducer의 책임 집중
- task family 대형 파일
- viewer/browser의 layered authority 관리

가 함께 주요 유지보수 비용을 만든다.

### 1.3 structuredClone 성능 분석

초기 분석 당시와 달리 현재 구현에서는 `structuredClone` 사용량이 많이 줄었다. 지금은 전체 source 기준 약 `8회`, reducer 내부 직접 사용은 `1회` 수준이다.

즉 현재 병목은 예전처럼 “무차별 전체 복사” 그 자체보다는:

- 일부 남아 있는 wide state transitions
- 큰 reducer와 task setup 파일
- browser/task/viewer 간 contract complexity

쪽으로 이동했다.

```
reduceEnvState 진입: 2회 (previousState + next)
└─ handleXxxClick: +1회
└─ openOrFocusNoteEditor 호출 시: +1회 (addNoteEditorWindow → structuredClone)
└─ syncWindowTitles 호출 시: +1회
```

벤치마크 기준, structuredClone은 Immer 대비 **단순 객체에서 6x 느리고**, 깊은 중첩에서는 유사하다. 그러나 현재 코드에서는 **불필요한 전체 복사**가 문제의 핵심이다. 예를 들어 터미널 입력 한 글자를 추가할 때도 BrowserLiteState의 categories 트리 전체가 복사된다.

---

## Part 2: 구조적 결함 분석 (5대 결함)

### 결함 1: God Object Reducer (심각도: Critical)

`reducer.ts`는 모든 앱의 모든 액션을 하나의 함수 체인에서 처리한다. 이는 OSWorld benchmark의 Computer13 action space (16 action types × 5 apps)가 만드는 **80가지 조합**을 단일 파일에서 관리하는 구조다.

**근본 원인:** 이 문서가 처음 쓰일 당시에는 AppPlugin 경계가 존재해도 실제 액션 로직은 거의 전부 `reducer.ts`에 몰려 있었다. 현재는 일부 정리가 진행됐지만, reducer가 여전히 핵심 orchestration 지점을 과도하게 많이 책임진다는 교훈은 유지된다.

**영향:**
- 한 앱의 버그 수정이 다른 앱의 회귀를 유발 (Round 8에서 echo 수정 → terminal 전체 불안정)
- 새 앱 추가 시 reducer.ts의 모든 핸들러(handleTyping, handlePress, handleHotkey, handleScroll, CLICK handler)에 분기를 추가해야 함
- 코드 리뷰 시 여전히 `reducer.ts` 전체를 크게 잡고 봐야 하는 부담이 남음

### 결함 2: 전체 복사 남용 (심각도: High)

초기 snapshot에서는 35회의 structuredClone 중 **대부분이 불필요**했다. 현재는 그 수가 줄었지만, 이 섹션의 요지는 “wide state transition이 성능과 유지보수성을 동시에 악화시킨다”는 점이다. 예시:

```typescript
// handleTyping에서 터미널 입력 한 글자 추가 시
const next = structuredClone(state);  // ← 전체 EnvState 복사
const terminal = next.appStates.terminalLite[focusedWindow.id];
terminal.input = `${terminal.input}${text}`;
```

실제 변경은 `terminal.input` 하나뿐인데, FileSystem, BrowserLite, MailLite, Popups 등 관련 없는 모든 상태가 deep copy된다.

**정량적 영향:** EnvState 평균 크기 약 8KB (BrowserLite categories 포함). 1 episode에 ~50 step, step당 평균 3회 clone = **episode당 ~1.2MB 불필요 할당**, 1000 episode 학습 시 ~1.2GB.

### 결함 3: 하드코딩된 Hit Test (심각도: High)

27개 pointInRect 호출이 모두 reducer.ts에서 인라인으로 실행된다. Hit test는 layout 함수의 결과를 사용하지만, **layout과 hit test가 분리**되어 있어 불일치 발생이 용이하다:

```typescript
// 레이아웃은 apps/terminal-lite.ts에서 계산
const layout = getTerminalLiteLayout(window.bounds, terminal);

// 히트 테스트는 env/reducer.ts에서 수행
if (pointInRect(point, layout.inputBounds)) { ... }
```

Round 10에서 발견된 "터미널 빈 공간 클릭 무시" 버그가 정확히 이 패턴에서 발생했다. 레이아웃에 `terminalBounds`가 있었지만, reducer의 hit test에서 이를 검사하지 않았다.

### 결함 4: 교차 도메인 암묵적 의존성 (심각도: Medium)

Terminal의 `rm` 명령이 NoteEditor 윈도우를 직접 닫고, FileExplorer의 DELETE 키도 동일한 정리 로직을 **별도로 구현**한다:

```typescript
// runTerminalCommand 내부 (line 806-812)
const orphanedNoteWindowIds = Object.entries(next.appStates.noteEditor)
  .filter(([, note]) => note.fileId === file.id)
  .map(([windowId]) => windowId);
for (const windowId of orphanedNoteWindowIds) {
  delete next.appStates.noteEditor[windowId];
  next.windows = next.windows.filter((w) => w.id !== windowId);
}

// handlePress 내부 (line 966-972) — 거의 동일한 코드 중복
const orphanedNoteWindowIds = Object.entries(next.appStates.noteEditor)
  .filter(([, note]) => note.fileId === fileId)
  .map(([windowId]) => windowId);
```

이 중복 코드는 하나를 수정하면 다른 하나도 수정해야 하는 함정을 만든다.

### 결함 5: 테스트 체계의 후행 정비 (심각도: Medium)

이 문서를 처음 쓸 당시에는 테스트 부재가 실질적 결함이었다. 현재는 상황이 바뀌었다.

지금은:

- `packages/core/test/contracts`
- `packages/core/test/integration`
- `packages/core/test/regression`
- `scripts/validation/validate-stack.sh`

를 통해 계약/통합/회귀 검증이 분리되어 있다.

따라서 현재의 결함은 “테스트가 없다”가 아니라:

- 중요한 테스트가 refactor 이후에 뒤늦게 정리되었다는 점
- 일부 historical 분석 문서가 그 이전 상태를 전제로 서술한다는 점
- 아직도 대형 task file에 비해 test decomposition이 완벽하진 않다는 점

에 가깝다.

---

## Part 3: 세계적 프로젝트 비교 분석

### 3.1 BrowserGym (ServiceNow, 2024)

BrowserGym은 POMDP 기반 RL 환경으로, 핵심 설계 원칙:

- **BID (Browser Element ID)**: 모든 UI 요소에 고유 ID를 부여하여 DOM과 AXTree 양쪽에서 참조 가능. 현재 MockOsEnv의 A11yNode.id가 유사하나, **reducer의 hit test에서는 ID 대신 좌표 기반** pointInRect를 사용하는 불일치.
- **Action 추상화**: `click(bid)`, `fill(bid, text)` 처럼 요소 ID 기반 액션 → 좌표 계산은 환경 내부에서 자동 수행. Computer13은 좌표 기반이므로 직접 적용 불가하나, **내부적으로 BID 기반 디스패치로 변환**하면 reducer의 if-else 체인을 제거할 수 있다.

### 3.2 WebArena (CMU, 2023)

- **Docker 기반 결정적 리셋**: 각 에피소드마다 완전히 동일한 초기 상태 보장. MockOsEnv의 `reset({taskId, seed})`와 동일한 목적이나, WebArena는 실제 앱을 사용하므로 상태 일관성 문제가 더 심각.
- **멀티 앱 독립 배포**: 각 앱(e-commerce, forum, CMS, GitLab)이 별도 Docker 컨테이너. 이 원칙이 MockOsEnv의 앱별 reducer 분리 필요성과 직접 연결된다.

### 3.3 XState v5 (Stately, 2024)

- **Parallel States**: 여러 상태 영역이 동시에 독립적으로 작동. MockOsEnv의 앱별 상태를 자연스럽게 모델링.
- **Actor Model**: 각 앱 인스턴스가 독립적 액터로 동작, 메시지 패싱으로 통신. `rm` → NoteEditor 정리 같은 교차 도메인 이벤트를 명시적으로 모델링.
- **적용 가치**: drag FSM(idle → dragging → released), terminal FSM(idle → editing → executing), rename FSM(view → editing → committing) 등 현재 암묵적인 상태 전이를 명시화.

### 3.4 Redux Toolkit EntityAdapter

- **정규화 상태**: `{ ids: string[], entities: Record<string, T> }` — MockOsEnv의 FileSystem이 이미 이 패턴(`order` + `files`)을 사용하나, WindowInstance[]는 배열 기반이라 O(n) 탐색.
- **셀렉터 자동 생성**: `selectById`, `selectAll` 등이 메모이제이션과 함께 제공.
- **적용 가치**: windows를 `{ ids: string[], entities: Record<string, WindowInstance> }`로 정규화하면, `find(w => w.id === id)` O(n)이 `entities[id]` O(1)로 개선.

### 3.5 Immer vs structuredClone

벤치마크 결과 요약:
- structuredClone: 깊은 객체에서 가장 느림, DOM 타입 지원으로 오버헤드
- Immer (Proxy): structuredClone 대비 2-5x 빠름, **변경된 부분만 새 참조** 생성
- 수동 spread: 가장 빠르나 유지보수 비용 높음
- Structura.js: Immer와 유사한 API, Immer 대비 2x 빠름

**권장:** Immer의 `produce()`로 점진적 마이그레이션. 변경되지 않은 하위 트리는 동일 참조를 유지하므로 React 렌더러의 메모이제이션에도 유리.

---

## Part 4: 근본적 개선 전략 (3단계)

### Phase 1: 안정화 (1-2일) — 리팩토링 없이 안전망 구축

#### 1A. 핵심 단위 테스트 추가

테스트 없이 리팩토링을 시작하면 회귀를 감지할 수 없다. 최소한의 테스트부터:

```typescript
// packages/core/src/__tests__/terminal-commands.test.ts
import { describe, it, expect } from 'vitest';
import { createTestEnv } from './helpers';

describe('runTerminalCommand', () => {
  it('echo with quoted > does not redirect', () => {
    const env = createTestEnv({ files: [{ name: 'test.txt', content: 'old' }] });
    const result = step(env, { type: 'TYPING', text: 'echo "hello > world"' });
    const result2 = step(result.envState, { type: 'PRESS', key: 'Enter' });
    // File content should be unchanged
    expect(getFileContent(result2.envState, 'test.txt')).toBe('old');
    // Output should contain the full string
    expect(getLastTerminalOutput(result2.envState)).toBe('hello > world');
  });

  it('wc -l returns 0 for empty file', () => {
    const env = createTestEnv({ files: [{ name: 'empty.txt', content: '' }] });
    // ... type 'wc -l empty.txt' + Enter
    expect(getLastTerminalOutput(env)).toBe('0 empty.txt');
  });

  it('rm closes orphaned note editor windows', () => {
    const env = createTestEnvWithNoteEditor('test.txt');
    // ... type 'rm test.txt' + Enter
    expect(env.windows.filter(w => w.appId === 'note-editor')).toHaveLength(0);
  });
});
```

**목표:** 현재 발견된 버그 패턴 전부를 테스트로 고정 (regression shield).

#### 1B. 중복 코드 추출

파일 삭제 시 orphan 정리 로직을 유틸리티로 추출:

```typescript
// system/filesystem.ts에 추가
export function deleteFileWithCleanup(state: EnvState, fileId: string): EnvState {
  const next = { ...state };
  // 1. noteEditor orphan 정리
  const orphanIds = Object.entries(next.appStates.noteEditor)
    .filter(([, note]) => note.fileId === fileId)
    .map(([id]) => id);
  const noteEditor = { ...next.appStates.noteEditor };
  for (const id of orphanIds) { delete noteEditor[id]; }

  // 2. 파일 삭제
  const files = { ...next.fileSystem.files };
  delete files[fileId];

  // 3. 윈도우 정리
  return {
    ...next,
    fileSystem: { ...next.fileSystem, files, order: next.fileSystem.order.filter(id => id !== fileId) },
    appStates: { ...next.appStates, noteEditor },
    windows: next.windows.filter(w => !orphanIds.includes(w.id))
  };
}
```

### Phase 2: 구조적 리팩토링 (3-5일) — 핵심 아키텍처 변경

#### 2A. App-Delegated Reducer 패턴

현재 사용하지 않는 AppPlugin.reduce를 실제로 활용:

```typescript
// 새로운 reducer 핵심 구조
export function reduceEnvState(state: EnvState, action: Computer13Action): ReduceResult {
  // 1. 시스템 레벨 처리 (포인터, 키보드, 팝업)
  let next = reduceSystemAction(state, action);

  // 2. 포커싱된 윈도우 식별
  const focusedWindow = getFocusedWindow(next);
  if (!focusedWindow) return { envState: next, ... };

  // 3. 앱별 플러그인에 위임
  const plugin = APP_PLUGINS[focusedWindow.appId];
  if (plugin) {
    const appState = getAppState(next, focusedWindow);
    const result = plugin.reduce(appState, action, {
      envState: next,
      window: focusedWindow,
      pointer: next.pointer
    });
    next = applyAppResult(next, focusedWindow, result);
  }

  return buildResult(state, next, action);
}
```

이 구조에서 각 앱의 로직은 **해당 앱 파일 내**에서 관리된다:

```typescript
// apps/terminal-lite.ts
export const terminalLitePlugin: AppPlugin<TerminalLiteState> = {
  id: 'terminal-lite',
  title: 'Terminal',

  reduce(state, action, ctx) {
    if (action.type === 'TYPING') return handleTerminalTyping(state, action.text);
    if (action.type === 'PRESS' && action.key === 'Enter') return runCommand(state, ctx);
    if (action.type === 'CLICK') return handleTerminalClick(state, action, ctx);
    return state;
  },

  // buildA11y, buildViewModel도 여기에
};
```

**효과:**
- reducer.ts가 ~300줄로 축소 (시스템 레벨 + 디스패치만)
- 앱 추가 시 reducer.ts 수정 불필요
- 각 앱이 자체 테스트 가능

#### 2B. Terminal Command Registry

터미널 명령의 166줄 if-else를 레지스트리 패턴으로:

```typescript
// apps/terminal/commands.ts
type CommandHandler = (args: string, ctx: TerminalCommandContext) => CommandResult;

const COMMANDS: Record<string, CommandHandler> = {
  pwd:   (_, ctx) => ({ output: [ctx.cwd] }),
  ls:    (_, ctx) => ({ output: [ctx.listFiles().join('  ')] }),
  cat:   (args, ctx) => {
    const file = ctx.findFile(args.trim());
    return file ? { output: file.content.split('\n') } : { output: [`cat: ${args}: No such file`] };
  },
  echo:  (args, ctx) => handleEcho(args, ctx),
  wc:    (args, ctx) => handleWc(args, ctx),
  head:  (args, ctx) => handleHead(args, ctx),
  touch: (args, ctx) => handleTouch(args, ctx),
  rm:    (args, ctx) => handleRm(args, ctx),
};

export function executeCommand(input: string, ctx: TerminalCommandContext): CommandResult {
  const [cmd, ...rest] = input.trim().split(/\s+/);
  const handler = COMMANDS[cmd];
  if (!handler) return { output: [`command not found: ${cmd}`] };
  if (!rest.length && REQUIRES_ARGS.has(cmd)) return { output: [`${cmd}: missing operand`] };
  return handler(rest.join(' '), ctx);
}
```

**효과:**
- 새 명령 추가: 한 줄 등록 + 핸들러 함수
- 명령별 독립 테스트 가능
- missing operand 처리 자동화

#### 2C. Immer 도입 (점진적)

```typescript
import { produce } from 'immer';

// Before: 전체 deep copy
function handleTyping(state: EnvState, text: string) {
  const next = structuredClone(state);  // ~8KB 전체 복사
  const terminal = next.appStates.terminalLite[focusedWindow.id];
  terminal.input = `${terminal.input}${text}`;
  return { envState: next, accepted: true };
}

// After: 변경된 경로만 새 참조
function handleTyping(state: EnvState, text: string) {
  const next = produce(state, draft => {
    const terminal = draft.appStates.terminalLite[focusedWindow.id];
    terminal.input += text;
    // draft의 다른 부분은 동일 참조 유지
  });
  return { envState: next, accepted: true };
}
```

**마이그레이션 전략:** reducer.ts의 structuredClone을 하나씩 produce로 교체. 테스트가 통과하면 다음 사이트로 진행.

#### 2D. Hit Test를 앱 플러그인으로 이동

```typescript
// AppPlugin 인터페이스 확장
interface AppPlugin<TState> {
  // 기존
  reduce(state: TState, action: Computer13Action, ctx: ReduceContext): TState;

  // 새로 추가: 클릭 처리를 앱 자체에서
  handleClick?(state: TState, point: Point, ctx: ReduceContext): {
    state: TState;
    accepted: boolean;
  };
}
```

이렇게 하면 각 앱이 **자신의 레이아웃과 hit test를 하나의 파일에서 관리**하게 되어, 레이아웃 변경 시 hit test 누락 방지.

### Phase 3: 고도화 (선택적, 1-2주)

#### 3A. XState로 Drag/Drop 상태 머신

```typescript
import { createMachine } from 'xstate';

const dragMachine = createMachine({
  id: 'windowDrag',
  initial: 'idle',
  states: {
    idle: {
      on: {
        MOUSE_DOWN: {
          target: 'dragging',
          guard: 'isOnTitleBar',
          actions: 'recordOffset'
        }
      }
    },
    dragging: {
      on: {
        DRAG_TO: { actions: 'updatePosition' },
        MOUSE_UP: { target: 'idle', actions: 'clearDragState' },
        WINDOW_CLOSED: { target: 'idle', actions: 'clearDragState' }
      }
    }
  }
});
```

**효과:** dragState orphan 버그가 구조적으로 불가능해짐 (WINDOW_CLOSED 이벤트가 반드시 idle로 전이).

#### 3B. Window Entity Normalization

```typescript
// 현재: 배열 기반 O(n) 탐색
windows: WindowInstance[]

// 개선: 정규화된 O(1) 탐색
windows: {
  ids: string[];
  entities: Record<string, WindowInstance>;
  focusedId: string | null;
  zOrder: string[];  // z-index 순서를 별도 배열로
}
```

#### 3C. 이벤트 버스로 교차 도메인 통신

```typescript
// rm 명령 실행 시
function handleRm(args: string, ctx: TerminalCommandContext): CommandResult {
  const file = ctx.findFile(args);
  if (!file) return { output: [`rm: ${args}: No such file`] };

  // 이벤트 발행 — 구독자가 정리
  ctx.emit({ type: 'FILE_DELETED', fileId: file.id });
  return { output: [`(removed ${args})`] };
}

// NoteEditor 플러그인이 구독
noteEditorPlugin.onEvent = (event, state) => {
  if (event.type === 'FILE_DELETED') {
    return closeWindowsForFile(state, event.fileId);
  }
  return state;
};
```

---

## Part 5: 리팩토링 우선순위 매트릭스

| 개선 항목 | 영향도 | 난이도 | 위험도 | 우선순위 |
|-----------|--------|--------|--------|----------|
| 단위 테스트 추가 | ★★★★★ | ★★☆☆☆ | ★☆☆☆☆ | **P0** |
| 중복 코드 추출 | ★★★☆☆ | ★☆☆☆☆ | ★☆☆☆☆ | **P0** |
| Terminal Command Registry | ★★★★☆ | ★★☆☆☆ | ★★☆☆☆ | **P1** |
| App-Delegated Reducer | ★★★★★ | ★★★☆☆ | ★★★☆☆ | **P1** |
| Immer 마이그레이션 | ★★★☆☆ | ★★☆☆☆ | ★★☆☆☆ | **P1** |
| Hit Test 앱 위임 | ★★★★☆ | ★★★☆☆ | ★★☆☆☆ | **P2** |
| XState Drag FSM | ★★☆☆☆ | ★★★☆☆ | ★★☆☆☆ | **P3** |
| Window Normalization | ★★☆☆☆ | ★★★☆☆ | ★★☆☆☆ | **P3** |
| Event Bus | ★★★☆☆ | ★★★★☆ | ★★★☆☆ | **P3** |

---

## Part 6: 목표 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────┐
│                   MockOsEnv                          │
│  reset() → step(action) → observe()                 │
├─────────────────────────────────────────────────────┤
│  System Reducer (~200 LoC)                           │
│  ┌──────────┬────────────┬──────────┬─────────────┐ │
│  │ Pointer  │ Keyboard   │ Window   │ Popup       │ │
│  │ Manager  │ Manager    │ Manager  │ Manager     │ │
│  └──────────┴────────────┴──────────┴─────────────┘ │
│                      ↓ dispatch                      │
│  ┌──────────────────────────────────────────────────┐│
│  │ App Plugin Registry                              ││
│  │ ┌──────────┐ ┌──────────┐ ┌──────────┐         ││
│  │ │FileExplr │ │NoteEdit  │ │Terminal  │ ...      ││
│  │ │ .reduce  │ │ .reduce  │ │ .reduce  │         ││
│  │ │ .click   │ │ .click   │ │ .click   │         ││
│  │ │ .layout  │ │ .layout  │ │ .layout  │         ││
│  │ │ .a11y    │ │ .a11y    │ │ .a11y    │         ││
│  │ └──────────┘ └──────────┘ └──────────┘         ││
│  │      ↕ events (FILE_DELETED, etc.)              ││
│  └──────────────────────────────────────────────────┘│
│                      ↓                               │
│  ┌──────────────────────────────────────────────────┐│
│  │ Immer-based State (produce)                      ││
│  │ ┌─────────┐ ┌────────────────┐ ┌──────────┐    ││
│  │ │FileSystem│ │Windows (norm.) │ │AppStates │    ││
│  │ └─────────┘ └────────────────┘ └──────────┘    ││
│  └──────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────┘
```

**예상 효과:**
- reducer.ts: 현재 `~1,020 LoC` 수준의 hotspot을 더 작고 명시적인 coordinator로 축소
- 앱별 파일: 가족별 책임과 task builder를 더 명확하게 분리
- structuredClone: 남은 wide-copy 경로를 더 줄이고, 변경은 가능한 한 국소적 state transition으로 제한
- 새 앱 추가: reducer.ts 수정 불필요 (플러그인 등록만)
- 버그 밀도: 교차 도메인 버그 구조적 제거

---

## Appendix: 참조 프로젝트

- [BrowserGym](https://github.com/ServiceNow/BrowserGym) — POMDP RL 환경, BID 기반 요소 추적
- [WebArena](https://github.com/web-arena-x/webarena) — Docker 기반 결정적 리셋, 멀티 앱 격리
- [XState v5](https://stately.ai/docs/xstate) — Parallel states, Actor model
- [Redux Toolkit EntityAdapter](https://redux-toolkit.js.org/api/createEntityAdapter) — 정규화 상태
- [Immer](https://immerjs.github.io/immer/) — Structural sharing, Proxy 기반 불변 업데이트
- [OS.js v3](https://github.com/os-js/OS.js) — 브라우저 기반 데스크톱 환경, 플러그인 아키텍처
