# OS-Mock

OS-Mock은 에이전트 학습, 평가, 디버깅을 위한 **결정론적 데스크톱 환경**입니다.

OSWorld 계열의 데스크톱 과제를 참고해 만들었지만, 이 저장소는 VM도 아니고 완전한 운영체제 에뮬레이터도 아닙니다. 그렇다고 단순히 스크린샷만 보여주는 정적인 목업도 아닙니다. 실제 환경 상태는 코어가 관리하고, 그 위에 viewer, MCP, 브라우저 런타임 보강, 시각적 현실감을 차례로 얹는 구조를 갖고 있습니다.

## 한 줄 요약

이 프로젝트는 다음 철학을 바탕으로 설계되어 있습니다.

> Semantic Core, Layered Realism

핵심만 풀어 쓰면 이렇습니다.

- 환경의 기준 상태는 언제나 코어가 관리합니다.
- task는 숨겨진 패치가 아니라, 사용자가 실제로 마주하는 시나리오로 정의합니다.
- observation은 형식과 의미가 분명한 contract로 다룹니다.
- 현실감은 코어 위에 더하되, 별도의 진실 원천을 만들지 않습니다.
- 호환을 위한 표면은 둘 수 있지만, 의미 자체를 바꾸지는 않습니다.

## 어디에 쓰는가

OS-Mock은 다음과 같은 작업에 특히 잘 맞습니다.

- 데스크톱형 RL/agent 루프 실험
- 라이브 viewer를 보며 task를 수동 점검하는 작업
- perturbation / recovery 실험
- visual state, a11y-like state, evaluator state 비교
- task 설계나 환경 전이, observation contract 디버깅

## 저장소 구조

- `packages/core`
  - 환경의 권위 있는 상태
  - reducer, evaluator, perturbation
  - task registry와 scenario builder
  - tree-backed filesystem과 공용 helper
- `packages/web`
  - 브라우저 viewer
  - Ubuntu/GNOME 스타일 shell
  - 브라우저 안에서 직접 마우스/키보드 입력 처리
- `packages/mcp-server`
  - MCP stdio 서버
  - viewer host
  - interactive / scripted client
  - QA 진입점
  - browser runtime augmentation
- `packages/core/test`
  - `contracts/`: public contract 테스트
  - `integration/`: 환경 흐름 테스트
  - `regression/`: 회귀 테스트
- `scripts`
  - `validation/`: 유지 중인 검증 스크립트
  - `manual/`: 사람이 직접 쓰는 도구
  - `replay/`: 로그 재생과 artifact 복구
  - `experimental/`, `archive/`: 보조/기록용 자료

## 아키텍처 개요

### 1. Semantic Core

코어는 환경의 실제 상태를 직접 관리합니다.

- 창 상태
- 앱 상태
- filesystem
- reward predicate
- perturbation
- canonical observation

주요 파일:

- [session.ts](packages/core/src/env/session.ts)
- [reducer.ts](packages/core/src/env/reducer.ts)
- [evaluator.ts](packages/core/src/env/evaluator.ts)
- [observation.ts](packages/core/src/env/observation.ts)
- [filesystem.ts](packages/core/src/system/filesystem.ts)

### 2. Scenario Layer

task는 raw state를 손으로 이어 붙이기보다, scenario builder와 family module을 통해 구성합니다.

주요 파일:

- [scenario-types.ts](packages/core/src/tasks/scenario-types.ts)
- [scenario-builders.ts](packages/core/src/tasks/scenario-builders.ts)
- [registry.ts](packages/core/src/tasks/registry.ts)
- [starter](packages/core/src/tasks/starter)
- [representative](packages/core/src/tasks/representative)
- [team3](packages/core/src/tasks/team3)

### 3. Interaction Layer

여러 상호작용 표면이 같은 코어 상태를 함께 사용합니다.

- direct core API
- MCP tools
- interactive MCP client
- scripted test client
- viewer 안의 로컬 마우스/키보드 입력

주요 파일:

- [host.ts](packages/mcp-server/src/host.ts)
- [interactive.ts](packages/mcp-server/src/clients/interactive.ts)
- [test.ts](packages/mcp-server/src/clients/test.ts)
- [DesktopApp.tsx](packages/web/src/DesktopApp.tsx)
- [DesktopSurface.tsx](packages/web/src/components/DesktopSurface.tsx)

### 4. Realism Layer

현실감은 코어 semantics 위에 계층적으로 추가합니다.

- shell과 task semantics는 env가 계속 소유합니다
- 브라우저 픽셀은 host-managed Chromium 페이지에서 가져올 수 있습니다
- browser runtime node는 observation augmentation으로 붙습니다

주요 파일:

- [browser-augmentation.ts](packages/core/src/observation/browser-augmentation.ts)
- [hybrid-browser-manager.ts](packages/mcp-server/src/browser-runtime/hybrid-browser-manager.ts)
- [browser-dom-snapshot.ts](packages/mcp-server/src/browser-runtime/browser-dom-snapshot.ts)

## 포함된 앱

- Files
- Text Editor
- Mozilla Firefox
- Terminal
- Thunderbird

Firefox는 현재 hybrid 경로를 지원합니다.

- shell chrome과 task semantics는 env가 소유합니다
- 브라우저 픽셀은 host-managed Chromium 페이지에서 올 수 있습니다
- DOM 기반 정보는 structured augmentation으로 붙습니다

## 요구 사항

- macOS 또는 Linux
- Node 20 LTS
- npm
- Playwright Chromium 설치

`node@20`를 Homebrew로 설치했다면:

```bash
export PATH="/opt/homebrew/opt/node@20/bin:$PATH"
```

## 빠른 시작

```bash
npm install
npx playwright install chromium
npm run build
npm test
```

자주 쓰는 명령:

```bash
npm run start:mcp
npm run interactive:mcp-client -- --task dismiss_popup_then_append_note --open
npm run test:mcp-client
npm run qa:representative
npm run qa:local-input
npm run validate:all
```

## 웹에서 직접 보며 테스트하기

브라우저로 화면을 보면서, 터미널에서 step을 직접 넣어 확인하려면 `interactive:mcp-client`를 쓰는 것이 가장 편합니다.

### 권장 실행 방식

```bash
OS_MOCK_PORT=4315 npm run interactive:mcp-client -- \
  --task mail_extract_mock_note \
  --seed 0 \
  --open \
  --debug
```

이 명령을 실행하면 다음 순서로 준비됩니다.

- MCP 서버와 viewer host가 뜨고
- 지정한 task가 reset되며
- 브라우저에서 viewer가 자동으로 열리고
- 터미널에는 수동 명령 프롬프트가 나타납니다

직접 보기 좋은 task 예시:

- `mail_extract_mock_note`
- `mail_extract_mock_note`
- `rename_note_in_explorer`
- `minimize_recover_and_save`

### 프롬프트에서 자주 쓰는 명령

- `help`
- `tasks`
- `observe`
- `reset <taskId> <seed>`
- `click <x> <y>`
- `double <x> <y>`
- `type <text>`
- `press <key>`
- `hotkey ctrl+s`
- `done`

### Viewer 주소

기본 viewer 주소 형식은 아래와 같습니다.

```text
http://127.0.0.1:4315/session/<sessionId>
```

### 포트가 이미 사용 중일 때

다른 포트로 실행하면 됩니다.

```bash
OS_MOCK_PORT=4461 npm run interactive:mcp-client -- \
  --task mail_extract_mock_note \
  --seed 0 \
  --open \
  --debug
```

### Solver 전용 수동 테스트

solver 전용 surface만 따로 확인하고 싶다면 아래 명령도 사용할 수 있습니다.

```bash
OS_MOCK_PORT=4514 \
OS_MOCK_SOLVER_TASK_ID=mail_extract_mock_note \
OS_MOCK_SOLVER_TASK_SEED=0 \
OS_MOCK_SOLVER_MAX_STEPS=64 \
npm run interactive:solver-mcp
```

다만 사람이 직접 viewer를 보며 점검하는 용도라면, 일반적으로는 `interactive:mcp-client`가 더 편합니다.

## 검증

코어 검증:

- `npm run typecheck`
- `npm test`
- `npm run test:contracts`

스택 검증:

- `npm run qa:representative`
- `npm run qa:local-input`
- `npm run validate:all`

유지 중인 시각 검증 진입점:

- `npm run validate:browser-help-visual`
- `bash scripts/validation/validate-text-overlap-visual.sh`

contract 중심 테스트는 특히 아래 항목이 깨지지 않도록 보호합니다.

- task registry integrity
- task target/predicate wiring
- browser observation augmentation shape
- team3 visible mail/terminal scenario wiring

## RL에서 직접 쓰기

빠른 rollout이 필요하면 MCP를 거치기보다 core API를 직접 쓰는 편이 낫습니다.

```ts
import { MockOsEnv } from "./packages/core/src/index.js";

const env = new MockOsEnv();
env.reset({ taskId: "dismiss_popup_then_append_note", seed: 0 });

while (true) {
  const observation = env.observe();
  const action = policy(observation.observation);
  const step = env.step(action);
  if (step.terminated || step.truncated) break;
}
```

다음 경우에는 MCP를 쓰는 편이 좋습니다.

- 사람이 환경을 직접 봐야 할 때
- live viewer가 중요할 때
- tool-call trace가 필요할 때

다음 경우에는 core API를 직접 쓰는 편이 좋습니다.

- rollout 속도가 중요할 때
- collector나 training loop를 만들 때
- viewer host가 필요 없을 때

## 주요 진입점

- [packages/core/src/env/session.ts](packages/core/src/env/session.ts)
- [packages/core/src/tasks/scenario-builders.ts](packages/core/src/tasks/scenario-builders.ts)
- [packages/core/src/tasks/registry.ts](packages/core/src/tasks/registry.ts)
- [packages/mcp-server/src/host.ts](packages/mcp-server/src/host.ts)
- [packages/mcp-server/src/clients/interactive.ts](packages/mcp-server/src/clients/interactive.ts)
- [packages/web/src/components/DesktopSurface.tsx](packages/web/src/components/DesktopSurface.tsx)

## 더 읽어볼 문서

- [AGENTS.md](AGENTS.md)
- [README-Revised.md](README-Revised.md)
- [docs/paper-draft/README.md](docs/paper-draft/README.md)
