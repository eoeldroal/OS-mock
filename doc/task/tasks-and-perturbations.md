# 태스크 및 퍼터베이션

이 문서는 현재 `OS-mock`의 태스크 인벤토리, 태스크 생성 운영 규칙, 그리고 환경 차원에서 지원되는 퍼터베이션 capability를 함께 정리한다.
중요한 점은, 퍼터베이션은 여전히 환경 capability로 존재하지만 현재 `task-author` skill의 기본 대량 생성 정책에서는 제외된다는 것이다.

---

## 1. 태스크 시스템

태스크는 `TaskSpec` 인터페이스를 통해 정의되며 `packages/core/src/tasks/registry.ts`에 등록된다.
현재 task-author skill은 task proposal-only가 아니라 runnable task implementation을 기본 목표로 삼는다.

### 태스크 스플릿

| 스플릿 | 설명 |
|--------|------|
| `all` | 모든 태스크 |
| `starter` | 단일 앱이거나 비교적 짧은 작업 |
| `representative` | 여러 앱을 오가는 더 긴 추출/기록 workflow |
| `train` | 학습용 서브셋 (현재 representative 매핑 정책과 별도 registry 규칙을 따름) |
| `eval` | 평가용 서브셋 (현재 representative 매핑 정책과 별도 registry 규칙을 따름) |

### 현재 task-author skill intake 정책

사용자가 처음부터 완전한 입력을 줄 것이라고 가정하지 않는다.
기본적으로 아래 항목을 여러 번의 짧은 질문으로 보완한다.

1. `goal`
2. `apps`
3. `count`
4. `splits`
5. `difficulties`
6. `variation_preferences`
7. `constraints`

`workflow`, `predicates`, `required setup`, `targets`는 가능한 한 코드베이스를 보고 추론한다.

---

## 2. 현재 인벤토리

### 스타터 태스크 (8개)

`packages/core/src/tasks/starter-tasks.ts` 정의

- `dismiss_popup_then_append_note`
  - 진행 조건: `popup.dismissed` -> `note.todo_opened` -> `note.target_appended` -> `note.saved`
- `rename_note_in_explorer`
  - 진행 조건: `file.renamed`
- `copy_line_between_windows`
  - 진행 조건: `clipboard.source_line_copied` -> `note.target_pasted` -> `note.saved`
- `minimize_recover_and_save`
  - 진행 조건: `window.note_restored` -> `note.saved`
- `browser_select_category_task`
  - 진행 조건: `browser.task_selected`
  - browser-only, note 없음
- `browser_switch_to_help`
  - 진행 조건: `browser.help_page_opened`
  - browser-only, note 없음
- `browser_log_task_from_help_start`
  - 진행 조건: `browser.task_selected` -> `note.target_opened` -> `note.target_appended` -> `note.saved`
  - 초기 상태: browser가 help 페이지에서 시작
- `browser_help_to_preopen_note`
  - 진행 조건: `browser.help_page_opened` -> `note.target_appended` -> `note.saved`
  - 초기 상태: note 사전 오픈

### 리프레젠터티브 태스크 (10개)

`packages/core/src/tasks/representative-tasks.ts` 정의

- `browser_log_workflow_task_id`
  - 진행 조건: `browser.task_selected` -> `note.saved`
- `browser_capture_help_line`
  - 진행 조건: `browser.help_page_opened` -> `note.saved`
- `mail_extract_mock_note`
  - 진행 조건: `mail.message_opened` -> `note.saved`
- `terminal_record_working_directory`
  - 진행 조건: `terminal.command_ran` -> `note.saved`
- `browser_log_task_from_minimized`
  - 진행 조건: `browser.task_selected` -> `note.target_opened` -> `note.target_appended` -> `note.saved`
  - 초기 상태: browser 최소화
- `browser_help_from_minimized`
  - 진행 조건: `browser.help_page_opened` -> `note.target_opened` -> `note.target_appended` -> `note.saved`
  - 초기 상태: browser 최소화
- `browser_log_task_unfocused_help_start`
  - 진행 조건: `browser.task_selected` -> `note.target_opened` -> `note.target_appended` -> `note.saved`
  - 초기 상태: browser unfocused + help 페이지
- `browser_help_preopen_note_distractors`
  - 진행 조건: `browser.help_page_opened` -> `note.target_appended` -> `note.saved`
  - 초기 상태: note 사전 오픈 + distractor 3개
- `browser_log_task_preopen_note_hard`
  - 진행 조건: `browser.task_selected` -> `note.target_appended` -> `note.saved`
  - 초기 상태: note 사전 오픈(기존 내용 있음) + distractor 3개
- `browser_help_unfocused_distractors`
  - 진행 조건: `browser.help_page_opened` -> `note.target_opened` -> `note.target_appended` -> `note.saved`
  - 초기 상태: browser unfocused + distractor 3개

자세한 family/coverage 현황은 `doc/task/task-hub.md`를 우선 참고한다.

---

## 3. 현재 task generation 정책

### Family-first batch generation

대량 생성은 아래 순서로 진행한다.

1. partial request를 intake
2. 필요한 정보를 질문으로 보완
3. task family를 먼저 정의
4. family별 variation matrix를 전개
5. dedup gate와 quality rubric을 통과한 후보만 구현

### 기본 variation 축

- difficulty
- content
- initial window state
- initial focus
- distractor count
- layout
- initial selected item

### Dedup gate

아래 조건 중 2개 이상이 사실상 같으면 신규 task보다 variation으로 보는 것이 기본값이다.

- 같은 source app -> sink app 구조
- 같은 goal predicate set
- 같은 progress chain
- 같은 setup shape
- 같은 output artifact
- 문자열만 바뀌고 workflow 의미는 동일

우선순위:

1. 기존 task의 seed variation으로 흡수
2. 기존 family variation으로 흡수
3. 둘 다 아니면 신규 task로 승격

### Quality rubric

신규 task는 아래를 모두 만족해야 한다.

- `Executable`
- `Evaluable`
- `Non-trivial`
- `Instruction clarity`
- `Learning value`

### 현재 제외 대상

현재 task-author skill 버전에서는 아래를 기본 생성 대상에서 제외한다.

- perturbation 기반 robustness task
- drag-and-drop 중심 task
- 자유 웹 탐색 중심 task
- 메일 작성/전송
- 파일 생성/삭제/이동

---

## 4. 퍼터베이션 capability

`packages/core/src/env/perturbations.ts` 정의

퍼터베이션은 여전히 환경 capability로 존재하며, trainer/debug 흐름이나 향후 robustness task 확장에서 사용할 수 있다.
다만 현재 task-author skill의 기본 batch generation 정책에서는 사용하지 않는다.

현재 지원되는 퍼터베이션:

- `PopupInject`
- `MinimizeAll`
- `RandomPointerSpawn`
- `WindowClose`
- `ZOrderShuffle`

### 예시

```json
{ "op": "MinimizeAll" }
```

```json
{
  "op": "WindowClose",
  "params": { "windowId": "browser-main" }
}
```

### 스케줄된 퍼터베이션

`TaskSpec.scheduledPerturbations`는 환경 차원에서 여전히 지원된다.
하지만 현재 skill 정책에서는 이 필드를 기본 task generation에 사용하지 않는다.

---

## 5. 문서 업데이트 원칙

태스크 인벤토리가 바뀌면 함께 갱신한다.

1. `doc/task/task-hub.md`
2. `doc/task/tasks-and-perturbations.md`
3. `AGENTS.md` 필요 시

자동 점검이 필요하면 아래 스크립트를 사용한다.

- `node .codex/skills/os-mock-task-author/scripts/audit-task-batch.mjs --mode inventory`
- `node .codex/skills/os-mock-task-author/scripts/audit-task-batch.mjs --mode candidates --input <candidate-json>`

가장 상세한 batch generation 운영 규칙은 아래 문서를 기준으로 본다.

- `doc/task/task-hub.md`
- `doc/task/task-expansion-spec.md`
- `doc/task/ai-task-prompt-template.md`
