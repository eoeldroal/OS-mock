# 현재 코드베이스 기준 Task 확장 명세

## 1. 목적

이 문서는 현재 `OS-mock` 코드베이스를 기준으로, 실제로 구현 가능한 태스크를 고품질로 여러 개 확장하기 위한 작성 규약을 정리한다.

이 명세의 목표는 네 가지다.

- 기본적으로는 현재 환경에서 실제로 풀 수 있는 태스크를 정의한다.
- 필요하면 의도적으로 불가능한 태스크도 별도 정책 아래 설계할 수 있게 한다.
- 적은 수의 family와 variation 규칙으로 100개 이상 수준의 태스크 인벤토리로 확장할 수 있게 한다.
- 대량 생성 시에도 중복과 품질 저하를 막는다.

이 문서는 `OSWorld`를 그대로 복제하기 위한 명세가 아니다. 현재의 deterministic mock desktop이 제공하는 앱, 상태, evaluator, action surface 안에서 안정적으로 학습/평가가 가능한 태스크를 설계하기 위한 명세다. 기본값은 runnable task지만, `doc/personal/20260410_osworld_impossible_tasks.md`를 참고해 intentionally impossible task도 설계할 수 있다.

---

## 2. 현재 환경에서 태스크가 만족해야 하는 조건

### 2.1 실행 가능성
- 현재 `Computer13Action`으로 수행 가능한 행동이어야 한다.
- 현재 reducer가 실제로 처리하는 상호작용이어야 한다.
- 현재 app state와 factory로 초기 상태를 구성할 수 있어야 한다.

### 2.2 채점 가능성
- `evaluateTaskState()`가 현재 지원하는 predicate와 `targets`만으로 성공 여부를 판정할 수 있어야 한다.
- 필요하면 `note.saved`처럼 파일 시스템 내용과 에디터 dirty state를 함께 확인하는 방식으로 검증한다.

### 2.3 반복 가능성
- seed에 따라 변형되어도 항상 deterministic하게 같은 초기 상태를 생성해야 한다.
- 같은 `taskId + seed + action sequence`에서 같은 결과가 나와야 한다.

### 2.4 학습 가치
- 단순히 UI를 보여주는 데 그치지 않고, 관측 -> 선택 -> 상태 전이 -> 평가가 분명해야 한다.
- `progressPredicates`가 중간 체크포인트로 작동하도록 설계하는 것이 좋다.
- instruction만 읽고 최종 산출물이 명확해야 한다.

### 2.5 intentionally impossible task의 추가 조건
- 불가능성은 환경 현실에 기반해야 하며, 단순히 instruction이 모호해서는 안 된다.
- removed/deprecated feature, 존재하지 않는 데이터/파일/리소스, 현재 mockOS에 없는 capability, 논리적으로 모순되는 요구처럼 이유가 분명해야 한다.
- 에이전트가 짧은 탐색만으로도 불가능성을 진단할 수 있어야 한다.
- 현재 런타임은 `FAIL`을 정답으로 보상하지 않으므로, runnable impossible task를 원하면 evaluator/session/reward contract를 먼저 확장해야 한다.
- 런타임 확장이 없는 경우 impossible task는 proposal-only 설계 산출물로 다뤄야 한다.

---

## 3. 현재 코드베이스에서 바로 사용할 수 있는 상호작용 표면

### 3.1 Action surface
현재 지원되는 action type은 아래와 같다.

- `MOVE_TO`
- `CLICK`
- `MOUSE_DOWN`
- `MOUSE_UP`
- `RIGHT_CLICK`
- `DOUBLE_CLICK`
- `DRAG_TO`
- `SCROLL`
- `TYPING`
- `PRESS`
- `KEY_DOWN`
- `KEY_UP`
- `HOTKEY`
- `WAIT`
- `FAIL`
- `DONE`

현재 `FAIL` action은 존재하지만, 아직 impossible task의 정답 행동으로 채점되지는 않는다.

실제로 태스크 설계에 주로 쓰이는 것은 아래다.

- `CLICK`
- `DOUBLE_CLICK`
- `TYPING`
- `PRESS`
- `HOTKEY`
- `DONE`
- 필요 시 `WAIT`

### 3.2 앱별 현재 구현 능력

#### Files
- 파일 목록 표시
- 파일 단일 선택
- 파일 더블클릭으로 Note Editor 열기
- 파일 rename mode 진입 및 이름 변경

#### Note Editor
- 텍스트 커서 위치 지정
- 텍스트 입력
- 줄 단위 선택 상태 반영
- 저장 버튼 클릭
- `ctrl+s`, `ctrl+c`, `ctrl+v`
- dirty state 관리

#### Firefox
- Explorer / Help 탭 전환
- bookmark 선택
- category 선택
- task 선택
- task detail / help line 노출

#### Terminal
- 입력 버퍼 편집
- `Enter` 실행
- 현재 지원 명령
  - `pwd`
  - `ls`
  - `cat <file>`

#### Thunderbird
- 폴더 선택
- 메시지 선택
- preview body 표시

#### Window / Shell
- 창 focus
- minimize / restore
- maximize / restore
- close
- dock activation
- popup dismiss

### 3.3 지금은 핵심 태스크로 쓰지 말아야 하는 표면
- 실제 파일 drag-and-drop 의미론
- 업로드/다운로드 워크플로우
- 자유로운 웹 탐색
- 임의의 터미널 명령 실행
- 파일 생성/삭제/폴더 이동
- 메일 작성/전송
- 창 리사이즈/배치 작업
- scroll 의존 정보 탐색
- perturbation 기반 robustness task

즉, 현 단계의 대량 생성에서는 perturbation과 robustness task를 제외한다.

---

## 4. 현재 evaluator가 지원하는 predicate

현재 태스크 설계에서 직접 사용할 수 있는 predicate는 아래다.

- `note.target_opened`
- `popup.dismissed`
- `note.todo_opened`
- `note.target_appended`
- `note.saved`
- `file.renamed`
- `clipboard.source_line_copied`
- `note.target_pasted`
- `window.note_restored`
- `browser.task_selected`
- `browser.help_page_opened`
- `mail.message_opened`
- `terminal.command_ran`

이 predicate 집합이 곧 현재 runnable task space의 상한선이다. 더 다양한 태스크를 만들고 싶다면, 결국 evaluator predicate를 먼저 늘려야 한다. impossible task를 runnable하게 만들고 싶을 때도 같은 원칙이 적용된다.

---

## 5. Batch generation 기본 원칙

### 5.1 Family-first
대량 생성은 항상 아래 순서로 한다.

1. user request를 최소 입력으로 정규화
2. family를 먼저 정의
3. family별 variation matrix를 전개
4. dedup gate와 quality rubric을 통과한 후보만 구현
5. 구현 후 inventory 문서를 갱신

### 5.2 Minimal input
사람이 기본적으로 주는 입력은 아래 정도면 충분하다.

- `goal`
- `apps`
- `count`
- `splits`
- `difficulties`
- `feasibility` (`runnable`, `impossible`, `mixed`)
- `variation preferences`
- `constraints`

하지만 사용자가 이 항목을 한 번에 완전하게 줄 것이라고 가정하면 안 된다.
실제 intake는 partial request에서 시작하고, 아래 우선순위로 여러 번 질문하며 보완하는 것이 기본이다.

1. `goal`
2. `apps`
3. `count`
4. `splits`
5. `feasibility`
6. `difficulties`
7. `variation preferences`
8. `constraints`

`workflow`, `predicates`, `required setup`, `targets`는 AI가 코드베이스를 보고 추론하는 것이 기본이다.
고객 입력이 부족하더라도 곧바로 상세 스키마를 요구하지 말고, high-impact 질문부터 순차적으로 물어야 한다.

### 5.3 Variation axes
현재 대량 생성에서 우선 사용할 variation 축은 아래다.

- content
- initial window state
- initial focus
- distractor count
- layout
- initial selected item
- difficulty
- impossibility reason

한 batch에서는 content variation만 반복하지 말고, setup variation까지 함께 섞는 것이 좋다.

---

## 6. Dedup gate

각 candidate task마다 `task fingerprint`를 만든다.
구성 요소는 아래다.

- family
- split
- domain
- app scope
- feasibility
- goal predicate set
- progress chain
- setup shape
- output artifact
- 실제 사용한 variation axes

아래 항목 중 2개 이상이 사실상 동일하면 duplicate risk로 본다.

- 같은 source app -> sink app 구조
- 같은 goal predicate set
- 같은 progress chain
- 같은 setup shape
- 같은 output artifact
- 문자열만 바뀌고 workflow 의미는 동일
- impossible task라면 불가능성 이유와 관측 단서도 사실상 동일

처리 우선순위:

1. 기존 task의 seed variation으로 흡수
2. 기존 family의 documented variation으로 흡수
3. 둘 다 아니면 신규 task로 승격

---

## 7. Quality rubric

신규 task는 feasibility에 따라 아래를 만족해야 한다.

### Runnable task rubric
- `Executable`: reducer/app/factory 안에서 실제 수행 가능
- `Evaluable`: 현재 predicate와 targets로 성공 판정 가능
- `Non-trivial`: 기존 task의 단순 문구 치환이 아님
- `Instruction clarity`: instruction만 읽고 최종 산출물이 분명함
- `Learning value`: 관측, 선택, 상태 전이, 완료가 의미 있게 분리됨

### Impossible task rubric
- `Clearly impossible`: 환경 현실상 불가능한 이유가 분명함
- `Diagnosable`: 짧은 탐색만으로도 불가능성을 확인할 수 있음
- `No fake workaround`: 에이전트가 환각으로 성공을 꾸며낼 여지를 줄임
- `Abort semantics defined`: 올바른 종료 행동이 `FAIL` 등으로 명시됨
- `Runtime path declared`: proposal-only인지, runnable하게 만들기 위해 evaluator/session을 확장했는지 분명함

하나라도 실패하면 candidate를 버리거나 family variation으로 낮춘다.

---

## 8. 난이도 계층

### 8.1 Easy
- 짧은 horizon
- 단순 setup
- 적은 distractor
- 유리한 초기 포커스

### 8.2 Medium
- 2~3 step workflow
- 중간 수준 distractor
- 덜 유리한 초기 상태

### 8.3 Hard
- 더 긴 multi-step workflow
- 불리한 초기 상태
- 더 많은 distractor
- 멀티앱 추출 중심

Level D robustness는 현재 batch generation 기본값에서 제외한다.

---

## 9. TaskSpec 작성 규약

현재 태스크는 아래 형태를 따른다.

```ts
export type TaskSpec = {
  id: string;
  instruction: string;
  maxSteps: number;
  seedDefaults: number[];
  domain?: string;
  split?: "starter" | "representative";
  setup(seed: number, viewport: Viewport): TaskSetup;
  goalPredicates: PredicateId[];
  progressPredicates: PredicateId[];
  forbiddenPredicates: PredicateId[];
  scheduledPerturbations?: ScheduledPerturbation[];
};
```

현재 skill 버전에서는 `scheduledPerturbations`를 사용하지 않는다.

### 9.1 필드별 작성 원칙

| 필드 | 작성 원칙 |
|------|-----------|
| `id` | 동사 중심으로 짧고 재사용 가능한 이름 사용 |
| `instruction` | 에이전트가 해야 할 실제 작업을 순서대로 적기 |
| `maxSteps` | 난이도와 split에 맞게 정하되, 짧은 task는 과도하게 늘리지 않기 |
| `seedDefaults` | 기본적으로 `[0, 1, 2]` 유지 |
| `domain` | `OS`, `Files`, `Workflow`, `Chrome`, `Thunderbird` 등 현재 문맥에 맞게 사용 |
| `split` | `starter` 또는 `representative` |
| `setup()` | factory 함수 조합으로 deterministic 초기 상태 구성 |
| `goalPredicates` | 최종 성공 판정에 꼭 필요한 predicate만 포함 |
| `progressPredicates` | 학습 중간 보상을 줄 체크포인트를 순서대로 배치 |
| `forbiddenPredicates` | 현재는 거의 비어 있어도 되지만, 실패 조건이 이미 표현 가능할 때만 사용 |

### 9.2 `targets` 네이밍 규약

현재 코드베이스에서 자주 쓰이는 `targets` 키는 아래다.

- `targetFileId`
- `sourceFileId`
- `noteWindowId`
- `popupId`
- `appendText`
- `expectedSavedContent`
- `oldName`
- `newName`
- `sourceLine`
- `targetCategoryId`
- `targetBrowserTaskId`
- `targetMessageId`
- `targetCommand`
- `targetCommandOutput`

새 태스크도 가능한 한 이 네이밍을 재사용하는 편이 좋다.

---

## 10. Batch quota defaults

별도 요청이 없으면 아래를 기본값으로 쓴다.

- 같은 `domain`은 batch의 40% 이하
- 같은 `goalPredicates` 조합은 batch의 25% 이하
- 같은 `app scope`는 3개 이상 연속 배치하지 않음
- underused predicate와 underused app combination을 우선 소진

---

## 11. Runnable completion 기준

batch 생성은 아래를 만족해야 완료로 본다.

- task가 registry를 통해 접근 가능하다
- setup이 deterministic하다
- evaluator가 targets로 성공을 판정할 수 있다
- 문서가 inventory와 일치한다
- 필요한 build/test가 통과한다
