# Task Hub

태스크 인벤토리를 한 곳에서 확인하기 위한 문서다.
현재 source of truth는 task 정의와 `packages/core/src/tasks/registry.ts`의 내부 authoring metadata다.
공개 `listTasks()`와 `trainer.list_tasks`는 agent-safe catalog만 반환한다.

구현 디렉토리: `packages/core/src/tasks/`
타입 정의: `packages/core/src/types.ts`
평가 로직: `packages/core/src/env/evaluator.ts`

---

## 문서화 필드

각 task는 아래 관점으로 문서화한다.
이 정보는 authoring/debug 문서용이며, agent under test에게 직접 노출하면 안 된다.

| 필드 | 의미 |
|---|---|
| `startState` | 시작 시점의 창 배치, 포커스, 열린 파일, 초기 탭 상태 요약 |
| `objective` | 해당 시작 상태에서 실제로 달성해야 하는 목표 |
| `instruction` | 실제 `TaskSpec`에 저장된 agent-facing instruction 원문 |
| `goalPredicates` | evaluator가 성공으로 판정하는 predicate chain |
| `implementationPath` | task가 구현된 파일 경로 |

---

## Inventory 요약

- 총 task 수: `14`
- `starter`: `10`
- `representative`: `4`

### Family 요약

| Family | 개수 |
|---|---|
| `browser_extract_to_note` | 8 |
| `browser_navigate` | 2 |
| `files_rename` | 1 |
| `mail_extract_to_note` | 1 |
| `note_copy_paste` | 1 |
| `popup_open_note` | 1 |
| `terminal_record_to_note` | 1 |
| `window_recover_save` | 1 |

### 운영 기준

중복 방지를 위해 아래 축은 기본적으로 새 task가 아니라 seed/setup variation으로 취급한다.

- `minimized`
- `unfocused`
- `help-start`
- `distractors`
- `preopen note`
- `existing content`

새 task로 승격하는 기준은 workflow 의미, output artifact, 또는 goal/progress chain이 실제로 달라질 때다.

---

## Starter Inventory

| ID | Family | 시작 상태 | 목표 | Instruction 원문 | Goal Predicates |
|---|---|---|---|---|---|
| `dismiss_popup_then_append_note` | `popup_open_note` | 중앙 팝업이 작업을 막고 있고 File Explorer에는 `todo.txt`가 보인다. | 팝업을 닫고 `todo.txt`에 요청된 줄을 추가한 뒤 저장한다. | Dismiss the popup, open todo.txt, append the requested line, and save. | `popup.dismissed` -> `note.todo_opened` -> `note.target_appended` -> `note.saved` |
| `rename_note_in_explorer` | `files_rename` | File Explorer가 포커스된 상태로 `draft.txt`와 방해 파일이 함께 보인다. | `draft.txt`를 `final.txt`로 바꾼다. | Rename draft.txt to final.txt in File Explorer. | `file.renamed` |
| `copy_line_between_windows` | `note_copy_paste` | `source.txt`와 `target.txt` 편집기가 나란히 열려 있고 source 창에 포커스가 있다. | source 첫 줄을 target 끝에 붙여 넣고 저장한다. | Copy the first line from source.txt into the end of target.txt, then save target.txt. | `clipboard.source_line_copied` -> `note.target_pasted` -> `note.saved` |
| `minimize_recover_and_save` | `window_recover_save` | 모든 창이 최소화돼 있고 dirty 상태의 `recover.txt` 편집기가 숨어 있다. | 메모 창을 복원하고 현재 버퍼를 저장한다. | Restore the hidden note editor window and save the pending change. | `window.note_restored` -> `note.saved` |
| `browser_select_category_task` | `browser_navigate` | Firefox가 Explorer를 잘못된 선택 상태로 보여 주고 있다. | 요청된 category-task pair로 선택 상태를 바꾼다. | In Firefox, select the target category and task in OSWorld Explorer. | `browser.task_selected` |
| `browser_switch_to_help` | `browser_navigate` | Firefox가 Explorer 탭에 열려 있고 Ubuntu help 탭이 탭바에 있다. | help 탭으로 전환한다. | In Firefox, switch to the Ubuntu help tab. | `browser.help_page_opened` |
| `browser_log_task_id_simple` | `browser_extract_to_note` | Firefox는 Explorer에 포커스되어 있고 task-id note는 아직 열리지 않았다. | 목표 task를 선택하고 해당 id를 note에 적어 저장한다. | In Firefox, select the target task and save its id into a note. | `browser.task_selected` -> `note.target_opened` -> `note.target_appended` -> `note.saved` |
| `browser_help_log_summary_simple` | `browser_extract_to_note` | Firefox는 Explorer에 있고 help에서 가져올 줄을 적을 note는 아직 File Explorer에만 있다. | Ubuntu help에서 요청된 줄을 찾아 note에 기록하고 저장한다. | In Firefox, switch to Ubuntu help, write the requested help line into a note, and save. | `browser.help_page_opened` -> `note.target_opened` -> `note.target_appended` -> `note.saved` |
| `browser_help_to_preopen_note` | `browser_extract_to_note` | help note가 이미 열려 있고 Firefox는 Explorer에서 시작한다. | Ubuntu help의 요청된 줄을 열린 note에 적고 저장한다. | In Firefox, switch to Ubuntu help, type the requested help line into the open note, and save. | `browser.help_page_opened` -> `note.target_appended` -> `note.saved` |
| `browser_select_from_help_and_log_preopen` | `browser_extract_to_note` | Firefox가 Ubuntu help에서 시작하고 `task-log.txt`가 이미 열려 있다. | Explorer로 돌아가 목표 task를 선택하고 열린 note에 id를 적어 저장한다. | In Firefox, switch from help to Explorer, select the target task, and save its id into the open note. | `browser.task_selected` -> `note.target_appended` -> `note.saved` |

---

## Representative Inventory

| ID | Family | 시작 상태 | 목표 | Instruction 원문 | Goal Predicates |
|---|---|---|---|---|---|
| `browser_help_preopen_note_distractors` | `browser_extract_to_note` | help note가 이미 열려 있고 File Explorer에는 방해 파일이 함께 보인다. | Ubuntu help의 요청된 줄을 열린 note에 적고 저장한다. | In Firefox, switch to Ubuntu help, type the requested help line into the open note, and save. | `browser.help_page_opened` -> `note.target_appended` -> `note.saved` |
| `browser_log_task_preopen_note_hard` | `browser_extract_to_note` | 기존 내용이 들어 있는 log note가 이미 열려 있고 주변에 방해 파일이 있다. | 목표 task를 선택하고 열린 log note 끝에 task id를 덧붙여 저장한다. | In Firefox OSWorld Explorer, select the target task and append its id to the open note, then save. | `browser.task_selected` -> `note.target_appended` -> `note.saved` |
| `mail_extract_mock_note` | `mail_extract_to_note` | Thunderbird가 열려 있고 `mail-log.txt`는 아직 열리지 않았다. | 대상 메일의 reminder 문장을 읽고 `mail-log.txt`에 적어 저장한다. | Open the Mock environment notes email, copy its reminder line into mail-log.txt, and save. | `mail.message_opened` -> `note.target_opened` -> `note.target_appended` -> `note.saved` |
| `terminal_record_working_directory` | `terminal_record_to_note` | Terminal이 포커스된 상태이며 `terminal-log.txt`는 명령 결과 기록을 기다리고 있다. | `pwd` 결과를 note에 적어 저장한다. | Run pwd in Terminal, copy the output into terminal-log.txt, and save. | `terminal.command_ran` -> `note.target_opened` -> `note.target_appended` -> `note.saved` |

---

## 운영 원칙

1. 새 task 추가 시 먼저 family와 canonical workflow를 정의한다.
2. 표면 variation만 다른 browser task는 seed/setup variation으로 흡수한다.
3. `startState`, `objective`, `goalPredicates` 같은 내부 메타데이터는 authoring/debug 용도로만 유지한다.
4. inventory 변경 후에는 `npm run typecheck`, `npm run build`, `node .codex/skills/os-mock-task-author/scripts/audit-task-batch.mjs --mode inventory`를 우선 실행한다.
