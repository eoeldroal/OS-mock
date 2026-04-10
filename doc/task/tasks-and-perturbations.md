# 태스크 및 퍼터베이션

이 문서는 현재 `OS-mock`의 task inventory와 perturbation capability를 운영 관점에서 정리한다.
태스크별 시작 상태와 목표는 내부 authoring metadata를 기준으로 관리하며, agent under test에게는 직접 노출하지 않는다.

---

## 1. Registry Contract

태스크는 `packages/core/src/tasks/registry.ts`에서 집계된다.
`trainer.list_tasks`와 core `listTasks()`는 agent-safe 공개 catalog만 반환한다.

| 필드 | 설명 |
|---|---|
| `id` | task identifier |
| `instruction` | agent-facing instruction 원문 |
| `maxSteps` | 최대 step 수 |
| `seedDefaults` | 기본 seed 목록 |
| `domain` | task 분류용 domain |
| `split` | `starter` / `representative` |

내부 authoring/debug 용 메타데이터는 `listTaskAuthoringMetadata()`에서만 다룬다.

원칙: agent under test에게는 자연어 instruction과 화면 관측만 제공해야 하며, `family`, `startState`, `objective`, `goalPredicates`, `progressPredicates`, `implementationPath` 같은 내부 메타데이터는 공개 tool 응답에 포함하지 않는다.

---

## 2. 현재 Task Inventory

현재 inventory는 총 `14`개다.

- `starter`: `10`
- `representative`: `4`

### Starter Tasks

| ID | 시작 상태 | 목표 | Instruction 원문 |
|---|---|---|---|
| `dismiss_popup_then_append_note` | 작업을 막는 팝업이 떠 있고 `todo.txt`가 File Explorer에서 보인다. | 팝업을 닫고 `todo.txt`에 요청된 줄을 추가해 저장한다. | Dismiss the popup, open todo.txt, append the requested line, and save. |
| `rename_note_in_explorer` | File Explorer가 포커스된 상태이며 `draft.txt`가 보인다. | `draft.txt`를 `final.txt`로 이름 변경한다. | Rename draft.txt to final.txt in File Explorer. |
| `copy_line_between_windows` | `source.txt`와 `target.txt` 편집기가 둘 다 열려 있다. | source 첫 줄을 target 끝에 붙여 넣고 저장한다. | Copy the first line from source.txt into the end of target.txt, then save target.txt. |
| `minimize_recover_and_save` | dirty 상태의 `recover.txt` 편집기가 최소화되어 숨어 있다. | 메모 창을 복원하고 저장한다. | Restore the hidden note editor window and save the pending change. |
| `browser_select_category_task` | Firefox가 Explorer를 잘못된 선택 상태로 보여 준다. | 목표 category-task pair를 선택한다. | In Firefox, select the target category and task in OSWorld Explorer. |
| `browser_switch_to_help` | Firefox가 Explorer 탭에서 시작하고 Ubuntu help 탭이 보인다. | help 탭으로 전환한다. | In Firefox, switch to the Ubuntu help tab. |
| `browser_log_task_id_simple` | Explorer task id를 적을 note는 아직 열리지 않았다. | 목표 task를 고르고 id를 note에 기록해 저장한다. | In Firefox, select the target task and save its id into a note. |
| `browser_help_log_summary_simple` | help line을 적을 note가 아직 File Explorer에만 있다. | Ubuntu help의 요청된 줄을 note에 저장한다. | In Firefox, switch to Ubuntu help, write the requested help line into a note, and save. |
| `browser_help_to_preopen_note` | help note가 이미 열려 있다. | Ubuntu help의 요청된 줄을 열린 note에 적어 저장한다. | In Firefox, switch to Ubuntu help, type the requested help line into the open note, and save. |
| `browser_select_from_help_and_log_preopen` | Firefox가 help 탭에서 시작하고 `task-log.txt`가 이미 열려 있다. | Explorer로 돌아가 목표 task를 선택하고 id를 열린 note에 저장한다. | In Firefox, switch from help to Explorer, select the target task, and save its id into the open note. |

### Representative Tasks

| ID | 시작 상태 | 목표 | Instruction 원문 |
|---|---|---|---|
| `browser_help_preopen_note_distractors` | help note가 이미 열려 있고 주변에 방해 파일이 있다. | Ubuntu help의 요청된 줄을 열린 note에 적고 저장한다. | In Firefox, switch to Ubuntu help, type the requested help line into the open note, and save. |
| `browser_log_task_preopen_note_hard` | 기존 내용이 있는 log note가 이미 열려 있고 주변에 방해 파일이 있다. | 목표 task를 선택하고 id를 열린 note 끝에 덧붙여 저장한다. | In Firefox OSWorld Explorer, select the target task and append its id to the open note, then save. |
| `mail_extract_mock_note` | Thunderbird가 열려 있고 `mail-log.txt`는 아직 닫혀 있다. | 메일의 reminder 문장을 읽어 `mail-log.txt`에 저장한다. | Open the Mock environment notes email, copy its reminder line into mail-log.txt, and save. |
| `terminal_record_working_directory` | Terminal이 포커스되어 있고 `terminal-log.txt`가 준비돼 있다. | `pwd` 결과를 `terminal-log.txt`에 저장한다. | Run pwd in Terminal, copy the output into terminal-log.txt, and save. |

---

## 3. Authoring 운영 규칙

### Canonical-first

browser task를 늘릴 때는 먼저 canonical workflow를 정의한다.
현재 canonical browser workflow는 크게 네 가지다.

- browser selection -> unopened note
- help capture -> unopened note
- help capture -> pre-opened note
- browser selection -> pre-opened note with existing content

### Variation 흡수 규칙

다음 축은 기본적으로 새 task가 아니라 seed/setup variation으로 흡수한다.

- `minimized`
- `unfocused`
- `help-start`
- `distractors`
- `preopen note`
- `existing content`
- target text / target file name 차이

### Data leak 방지 규칙

`doc/task/osworld-mock-authoring-guide.md`를 기준 정책으로 사용한다.

- 원본 benchmark task를 표면적으로 복제하지 않는다.
- 먼저 `core capability`를 정한 뒤 mock domain으로 치환한다.
- 유명 외부 서비스나 원본 benchmark 텍스트를 그대로 쓰지 않는다.
- target file name, seed text, 초기 선택 상태는 가능한 한 seed variation으로 파라미터화한다.
- 채점용 메타데이터는 내부 authoring path에만 두고 AUT 쪽으로 노출하지 않는다.

---

## 4. 퍼터베이션 Capability

현재 환경 capability로 제공되는 perturbation은 아래와 같다.

- `PopupInject`
- `MinimizeAll`
- `RandomPointerSpawn`
- `WindowClose`
- `ZOrderShuffle`

현재 task-author 기본 생성 정책에서는 perturbation을 task inventory 기본축으로 사용하지 않는다.
필요하면 trainer/debug 흐름에서 별도로 적용한다.

---

## 5. 검증 루틴

inventory 변경 후 우선 실행할 항목:

1. `npm run typecheck`
2. `npm run build`
3. `node .codex/skills/os-mock-task-author/scripts/audit-task-batch.mjs --mode inventory`
4. representative behavior가 바뀌었으면 `npm run qa:representative`
