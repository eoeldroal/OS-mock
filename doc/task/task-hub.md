# Task Hub

태스크 인벤토리를 한 곳에서 확인하기 위한 문서다.
현재 source of truth는 task 정의와 [packages/core/src/tasks/registry.ts](/mnt/d/0.서강대학교/7/캡스톤디자인/OS-mock/packages/core/src/tasks/registry.ts)의 내부 authoring metadata다. 공개 `listTasks()`/`trainer.list_tasks`는 agent-safe catalog만 반환한다.
새 태스크를 추가하거나 기존 태스크의 시작 상태, 목표, instruction을 바꾸면 task 코드와 이 문서를 함께 갱신한다.

구현 디렉토리: `packages/core/src/tasks/`
타입 정의: `packages/core/src/types.ts`
평가 로직: `packages/core/src/env/evaluator.ts`

---

## 문서화 필드

각 task는 아래 관점으로 문서화한다. 이 정보는 authoring/debug 문서용이며, agent under test에게 직접 노출하면 안 된다.

| 필드 | 의미 |
|---|---|
| `startState` | 에이전트가 시작할 때의 창 배치, 포커스, 열린 파일, 초기 탭 상태 요약 |
| `objective` | 그 시작 상태에서 실제로 달성해야 하는 작업 목표 요약 |
| `instruction` | 실제 TaskSpec에 저장된 agent-facing instruction 원문 |
| `goalPredicates` | evaluator가 성공으로 판정하는 predicate chain |
| `implementationPath` | task가 구현된 파일 경로 |

---

## Split 요약

| Split | 개수 |
|---|---|
| `representative` | 30 |
| `starter` | 18 |

## Family 요약

| Family | 개수 |
|---|---|
| `browser_extract_to_note` | 35 |
| `browser_navigate` | 7 |
| `files_rename` | 1 |
| `mail_extract_to_note` | 1 |
| `note_copy_paste` | 1 |
| `popup_note_save` | 1 |
| `terminal_record_to_note` | 1 |
| `window_recover_save` | 1 |

## 앱 커버리지

| 앱 | 태스크 수 |
|---|---|
| `browser` | 42 |
| `note` | 40 |
| `window` | 21 |
| `files` | 17 |
| `clipboard` | 1 |
| `mail` | 1 |
| `popup` | 1 |
| `terminal` | 1 |

---

## Starter Inventory

아래 표의 `Instruction 원문` 열은 실제 `TaskSpec.instruction` 문자열을 그대로 보존한다.
설명 문구는 한글 기준으로 정리했다.

| ID | Family | Level | MaxSteps | Apps | 시작 상태 | 목표 | Instruction 원문 | Goal Predicates | 구현 파일 |
|---|---|---|---|---|---|---|---|---|---|
| `dismiss_popup_then_append_note` | `popup_note_save` | B | 30 | `popup`, `files`, `note` | 바탕화면 중앙에 진행을 막는 팝업이 떠 있고, File Explorer에는 todo.txt가 보이며 다른 보조 앱들은 최소화되어 있다. | 팝업을 닫고 todo.txt를 열어 지정된 문구를 덧붙인 뒤 저장한다. | Dismiss the popup, open todo.txt, append the requested line, and save. | `popup.dismissed` -> `note.todo_opened` -> `note.target_appended` -> `note.saved` | `packages/core/src/tasks/starter/desktop-tasks.ts` |
| `rename_note_in_explorer` | `files_rename` | A | 20 | `files` | File Explorer가 포커스된 상태이며 draft.txt와 방해 파일이 함께 보이고, 브라우저·터미널·메일도 작업공간에 열려 있다. | 파일 관리 흐름을 벗어나지 않고 draft.txt를 final.txt로 이름 변경한다. | Rename draft.txt to final.txt in File Explorer. | `file.renamed` | `packages/core/src/tasks/starter/desktop-tasks.ts` |
| `copy_line_between_windows` | `note_copy_paste` | B | 30 | `note`, `clipboard` | source.txt와 target.txt를 편집하는 두 개의 메모 창이 나란히 열려 있고, source 창에 포커스가 있다. | source의 첫 줄을 복사해 target 끝에 붙여 넣고 target.txt를 저장한다. | Copy the first line from source.txt into the end of target.txt, then save target.txt. | `clipboard.source_line_copied` -> `note.target_pasted` -> `note.saved` | `packages/core/src/tasks/starter/desktop-tasks.ts` |
| `minimize_recover_and_save` | `window_recover_save` | A | 20 | `window`, `note` | 모든 창이 최소화되어 있으며, recover.txt를 편집 중인 메모 창에는 아직 저장되지 않은 변경 내용이 남아 있다. | 숨겨진 메모 창을 다시 복원하고 현재 버퍼를 저장한다. | Restore the hidden note editor window and save the pending change. | `window.note_restored` -> `note.saved` | `packages/core/src/tasks/starter/desktop-tasks.ts` |
| `browser_select_category_task` | `browser_navigate` | A | 15 | `browser` | Firefox가 OSWorld Explorer에 포커스되어 있지만 현재 선택된 카테고리와 task가 목표와 다르다. | 브라우저 안에서 목표 카테고리와 task 조합으로 선택 상태를 바꾼다. | In Firefox, select the target category and task in OSWorld Explorer. | `browser.task_selected` | `packages/core/src/tasks/starter/browser-navigation-tasks.ts` |
| `browser_switch_to_help` | `browser_navigate` | A | 10 | `browser` | Firefox가 Explorer 탭에 포커스된 상태로 열려 있고, 탭 바에 Ubuntu help 탭이 보인다. | Explorer에서 Ubuntu help 탭으로 전환한다. | In Firefox, switch to the Ubuntu help tab. | `browser.help_page_opened` | `packages/core/src/tasks/starter/browser-navigation-tasks.ts` |
| `browser_select_from_minimized` | `browser_navigate` | A | 20 | `browser`, `window` | Firefox는 dock에 최소화되어 있고, 작업공간에는 File Explorer만 보이는 상태다. | Firefox를 복원한 뒤 Explorer에서 목표 카테고리와 task를 선택한다. | Restore Firefox from the dock and select the target category and task. | `browser.task_selected` | `packages/core/src/tasks/starter/browser-navigation-tasks.ts` |
| `browser_select_from_unfocused` | `browser_navigate` | A | 15 | `browser`, `window` | Firefox 창은 열려 있지만 포커스를 잃은 상태이며, File Explorer가 앞에 떠 있다. | Firefox를 다시 앞으로 가져오고 Explorer 선택 상태를 목표 task로 바꾼다. | Focus Firefox and select the target category and task in OSWorld Explorer. | `browser.task_selected` | `packages/core/src/tasks/starter/browser-navigation-tasks.ts` |
| `browser_select_from_help_page` | `browser_navigate` | A | 15 | `browser` | Firefox가 Explorer가 아니라 Ubuntu help 탭에서 시작한다. | Explorer로 돌아가 목표 task 카드를 선택한다. | In Firefox, switch from Ubuntu help to OSWorld Explorer and select the target task. | `browser.task_selected` | `packages/core/src/tasks/starter/browser-navigation-tasks.ts` |
| `browser_help_from_unfocused_starter` | `browser_navigate` | A | 15 | `browser`, `window` | Firefox 창은 배경에 열려 있고 다른 창이 포커스를 가지고 있다. | Firefox에 포커스를 준 뒤 Ubuntu help 탭으로 이동한다. | Focus Firefox and switch to the Ubuntu help tab. | `browser.help_page_opened` | `packages/core/src/tasks/starter/browser-navigation-tasks.ts` |
| `browser_help_from_minimized_starter` | `browser_navigate` | A | 20 | `browser`, `window` | Firefox가 dock에 최소화된 상태로 시작하며, 복원 후 help 탭으로 이동할 수 있다. | Firefox를 복원한 뒤 Ubuntu help 탭을 활성화한다. | Restore Firefox from the dock and switch to the Ubuntu help tab. | `browser.help_page_opened` | `packages/core/src/tasks/starter/browser-navigation-tasks.ts` |
| `browser_log_task_from_help_start` | `browser_extract_to_note` | B | 40 | `browser`, `note` | Firefox가 Ubuntu help 탭에서 시작하고, File Explorer에는 비어 있는 browser-log.txt가 준비되어 있다. | Explorer로 돌아가 목표 task를 선택하고 그 task id를 browser-log.txt에 기록한 뒤 저장한다. | Switch Firefox from help to OSWorld Explorer, select the target task, and save its id into browser-log.txt. | `browser.task_selected` -> `note.target_opened` -> `note.target_appended` -> `note.saved` | `packages/core/src/tasks/starter/browser-note-tasks.ts` |
| `browser_help_to_preopen_note` | `browser_extract_to_note` | B | 30 | `browser`, `note` | Firefox는 Explorer에 열려 있고, help-notes.txt는 이미 메모 창에 열려 있다. | Ubuntu help로 전환해 dock 안내 문구를 열린 메모에 적고 저장한다. | Switch Firefox to Ubuntu help, type the dock reminder line into the open note, and save. | `browser.help_page_opened` -> `note.target_appended` -> `note.saved` | `packages/core/src/tasks/starter/browser-note-tasks.ts` |
| `browser_log_task_id_simple` | `browser_extract_to_note` | B | 35 | `browser`, `note` | Firefox는 Explorer에 포커스되어 있지만 잘못된 task가 선택되어 있고, task-log.txt는 아직 열리지 않았다. | 목표 task를 고른 뒤 task-log.txt를 열어 task id를 기록하고 저장한다. | In Firefox, select the target task and save its id into task-log.txt. | `browser.task_selected` -> `note.target_opened` -> `note.target_appended` -> `note.saved` | `packages/core/src/tasks/starter/browser-note-tasks.ts` |
| `browser_help_log_summary_simple` | `browser_extract_to_note` | B | 35 | `browser`, `note` | Firefox는 Explorer에 포커스되어 있고, summary-log.txt는 File Explorer에만 존재하며 아직 열리지 않았다. | Ubuntu help의 workflow summary 문구를 summary-log.txt에 기록하고 저장한다. | Switch Firefox to Ubuntu help and save the workflow summary line into summary-log.txt. | `browser.help_page_opened` -> `note.target_opened` -> `note.target_appended` -> `note.saved` | `packages/core/src/tasks/starter/browser-note-tasks.ts` |
| `browser_select_from_help_and_log_preopen` | `browser_extract_to_note` | B | 35 | `browser`, `note` | Firefox는 Ubuntu help 탭에서 시작하고, task-log.txt는 이미 메모 창에 열려 있다. | help 탭을 벗어나 Explorer에서 목표 task를 선택하고 task id를 열린 메모에 추가해 저장한다. | Switch Firefox from help to Explorer, select the target task, and save its id into the open note. | `browser.task_selected` -> `note.target_appended` -> `note.saved` | `packages/core/src/tasks/starter/browser-note-tasks.ts` |
| `browser_help_log_summary_preopen` | `browser_extract_to_note` | B | 30 | `browser`, `note` | Firefox는 Explorer에서 시작하고, summary-log.txt는 이미 편집 가능한 상태로 열려 있다. | Ubuntu help로 전환해 workflow summary 문구를 열린 메모에 덧붙이고 저장한다. | Switch Firefox to Ubuntu help and type the workflow summary into the open note, then save. | `browser.help_page_opened` -> `note.target_appended` -> `note.saved` | `packages/core/src/tasks/starter/browser-note-tasks.ts` |
| `browser_select_log_to_preopen` | `browser_extract_to_note` | B | 25 | `browser`, `note` | Firefox는 Explorer에 포커스되어 있고, task-log.txt가 이미 옆 메모 창에 열려 있다. | Explorer에서 목표 task를 선택하고 task id를 열린 메모에 적어 저장한다. | In Firefox Explorer, select the target task and save its id into the open note. | `browser.task_selected` -> `note.target_appended` -> `note.saved` | `packages/core/src/tasks/starter/browser-note-tasks.ts` |

## Representative Inventory

| ID | Family | Level | MaxSteps | Apps | 시작 상태 | 목표 | Instruction 원문 | Goal Predicates | 구현 파일 |
|---|---|---|---|---|---|---|---|---|---|
| `browser_log_workflow_task_id` | `browser_extract_to_note` | C | 64 | `browser`, `note` | Firefox는 Explorer에 포커스되어 있지만 현재 카테고리와 task 선택이 목표와 다르고, browser-log.txt는 아직 열리지 않았다. | Workflow 카테고리의 workflow_mail_bridge task를 선택하고 browser-log.txt에 task id를 기록해 저장한다. | Open Workflow in OSWorld Explorer, select the bridge task, and save its task id into browser-log.txt. | `browser.task_selected` -> `note.target_opened` -> `note.target_appended` -> `note.saved` | `packages/core/src/tasks/representative/browser-selection-log-tasks.ts` |
| `browser_log_task_from_minimized` | `browser_extract_to_note` | C | 80 | `browser`, `window`, `note` | Firefox는 dock에 최소화되어 있고, File Explorer에는 browser-log.txt가 준비되어 있다. | Firefox를 복원한 뒤 목표 task를 선택하고 browser-log.txt에 task id를 적어 저장한다. | Restore Firefox from the dock, select the target task in OSWorld Explorer, and save its id into browser-log.txt. | `browser.task_selected` -> `note.target_opened` -> `note.target_appended` -> `note.saved` | `packages/core/src/tasks/representative/browser-selection-log-tasks.ts` |
| `browser_log_task_unfocused_help_start` | `browser_extract_to_note` | C | 96 | `browser`, `window`, `note` | Firefox는 포커스를 잃은 상태이며 Ubuntu help 탭이 열려 있고, task-log.txt는 아직 열리지 않았다. | Firefox를 다시 포커스하고 help에서 Explorer로 넘어가 목표 task를 선택한 뒤 task-log.txt에 id를 적어 저장한다. | Focus Firefox, switch from help to OSWorld Explorer, select the target task, and save its id into task-log.txt. | `browser.task_selected` -> `note.target_opened` -> `note.target_appended` -> `note.saved` | `packages/core/src/tasks/representative/browser-selection-log-tasks.ts` |
| `browser_select_log_unfocused` | `browser_extract_to_note` | C | 64 | `browser`, `window`, `note` | Firefox는 File Explorer 뒤에 가려져 포커스를 잃고 있으며, task-log.txt는 작업공간에 있지만 아직 열리지 않았다. | Firefox를 앞으로 가져와 목표 task를 선택하고 task-log.txt에 id를 기록해 저장한다. | Focus Firefox, select the target task, and save its id into task-log.txt. | `browser.task_selected` -> `note.target_opened` -> `note.target_appended` -> `note.saved` | `packages/core/src/tasks/representative/browser-selection-log-tasks.ts` |
| `browser_log_task_with_distractors` | `browser_extract_to_note` | C | 80 | `browser`, `note`, `files` | Firefox는 Explorer에 포커스되어 있고, task-log.txt 옆에 방해용 파일 두 개가 함께 보인다. | 방해 파일을 무시하고 목표 task를 선택한 뒤 task-log.txt에 id를 기록해 저장한다. | Select the target task in Explorer and save its id into task-log.txt among distractor files. | `browser.task_selected` -> `note.target_opened` -> `note.target_appended` -> `note.saved` | `packages/core/src/tasks/representative/browser-selection-log-tasks.ts` |
| `browser_select_different_category_log` | `browser_extract_to_note` | C | 80 | `browser`, `note` | Firefox는 잘못된 Explorer 카테고리와 task를 보여 주고 있고, task-log.txt는 아직 열리지 않았다. | 올바른 카테고리로 이동해 목표 task를 선택하고 task id를 note에 저장한다. | Switch to the target category in OSWorld Explorer, select the task, and save its id. | `browser.task_selected` -> `note.target_opened` -> `note.target_appended` -> `note.saved` | `packages/core/src/tasks/representative/browser-selection-log-tasks.ts` |
| `browser_log_task_minimized_distractors` | `browser_extract_to_note` | C | 96 | `browser`, `window`, `note`, `files` | Firefox는 최소화되어 있고, 작업공간에는 task-log.txt와 방해 파일 세 개가 함께 놓여 있다. | Firefox를 복원해 목표 task를 고르고, 방해 파일이 있어도 task-log.txt에 id를 적어 저장한다. | Restore Firefox, select the target task, and save its id into task-log.txt among distractors. | `browser.task_selected` -> `note.target_opened` -> `note.target_appended` -> `note.saved` | `packages/core/src/tasks/representative/browser-selection-log-tasks.ts` |
| `browser_log_task_unfocused_distractors` | `browser_extract_to_note` | C | 96 | `browser`, `window`, `note`, `files` | Firefox는 열려 있지만 포커스를 잃은 상태이고, File Explorer에는 task-log.txt와 방해 파일 세 개가 보인다. | Firefox를 다시 포커스한 뒤 목표 task를 선택하고 task-log.txt에 id를 기록해 저장한다. | Focus Firefox, select the target task, and save its id into task-log.txt among distractors. | `browser.task_selected` -> `note.target_opened` -> `note.target_appended` -> `note.saved` | `packages/core/src/tasks/representative/browser-selection-log-tasks.ts` |
| `browser_log_from_help_unfocused_distractors` | `browser_extract_to_note` | C | 112 | `browser`, `window`, `note`, `files` | Firefox는 포커스를 잃은 채 Ubuntu help 탭이 열려 있고, 주변에는 방해 파일 세 개와 task-log.txt가 있다. | Firefox를 다시 포커스하고 help에서 Explorer로 이동해 목표 task를 고른 뒤 task-log.txt에 id를 적어 저장한다. | Focus Firefox on help, switch to Explorer, select the target task, and save its id among distractors. | `browser.task_selected` -> `note.target_opened` -> `note.target_appended` -> `note.saved` | `packages/core/src/tasks/representative/browser-selection-log-tasks.ts` |
| `browser_select_log_minimized_help_start` | `browser_extract_to_note` | C | 96 | `browser`, `window`, `note` | Firefox는 dock에 최소화되어 있으며, 복원하면 Explorer가 아니라 Ubuntu help 탭부터 보인다. | Firefox를 복원하고 help를 벗어나 목표 task를 선택한 뒤 task-log.txt에 id를 기록해 저장한다. | Restore minimized Firefox from help, switch to Explorer, select the target task, and save its id. | `browser.task_selected` -> `note.target_opened` -> `note.target_appended` -> `note.saved` | `packages/core/src/tasks/representative/browser-selection-log-tasks.ts` |
| `browser_capture_help_line` | `browser_extract_to_note` | C | 128 | `browser`, `note` | Firefox는 Explorer에 포커스되어 있고, ubuntu-help.txt는 File Explorer에만 있으며 아직 열리지 않았다. | Ubuntu help의 dock reminder 줄을 찾아 ubuntu-help.txt에 기록하고 저장한다. | Switch Firefox to Ubuntu help, copy the dock reminder line into ubuntu-help.txt, and save. | `browser.help_page_opened` -> `note.target_opened` -> `note.target_appended` -> `note.saved` | `packages/core/src/tasks/representative/browser-help-tasks.ts` |
| `browser_help_from_minimized` | `browser_extract_to_note` | C | 80 | `browser`, `window`, `note` | Firefox는 dock에 최소화되어 있고, help-log.txt는 아직 열리지 않은 상태다. | Firefox를 복원해 Ubuntu help로 이동하고 workflow summary 줄을 help-log.txt에 적어 저장한다. | Restore Firefox from the dock, switch to Ubuntu help, and save the workflow summary line into help-log.txt. | `browser.help_page_opened` -> `note.target_opened` -> `note.target_appended` -> `note.saved` | `packages/core/src/tasks/representative/browser-help-tasks.ts` |
| `browser_help_preopen_note_distractors` | `browser_extract_to_note` | C | 64 | `browser`, `note`, `files` | help-notes.txt는 이미 열려 있고, Firefox 옆에는 방해 파일 세 개가 함께 보인다. | Ubuntu help로 전환해 dock reminder 줄을 열린 help-notes.txt에 적고 저장한다. | In Firefox, switch to Ubuntu help, type the dock reminder line into the open help-notes.txt, and save. | `browser.help_page_opened` -> `note.target_appended` -> `note.saved` | `packages/core/src/tasks/representative/browser-help-tasks.ts` |
| `browser_help_unfocused_distractors` | `browser_extract_to_note` | C | 96 | `browser`, `window`, `note`, `files` | Firefox는 포커스를 잃은 상태이며, help-log.txt 주변에 여러 방해 파일이 놓여 있다. | Firefox를 다시 포커스한 뒤 Ubuntu help로 이동해 workflow summary를 help-log.txt에 기록하고 저장한다. | Focus Firefox, switch to Ubuntu help, and save the workflow summary line into help-log.txt. | `browser.help_page_opened` -> `note.target_opened` -> `note.target_appended` -> `note.saved` | `packages/core/src/tasks/representative/browser-help-tasks.ts` |
| `browser_help_log_unfocused_preopen` | `browser_extract_to_note` | C | 64 | `browser`, `window`, `note` | Firefox는 포커스를 잃었고, help-notes.txt는 이미 메모 창에 열려 있다. | Firefox를 다시 포커스해 Ubuntu help로 이동하고 dock reminder를 열린 메모에 덧붙여 저장한다. | Focus Firefox, switch to help, and type the dock reminder into the open note, then save. | `browser.help_page_opened` -> `note.target_appended` -> `note.saved` | `packages/core/src/tasks/representative/browser-help-tasks.ts` |
| `browser_help_log_minimized_preopen` | `browser_extract_to_note` | C | 64 | `browser`, `window`, `note` | Firefox는 최소화되어 있고, help-notes.txt는 이미 열려 있어 바로 입력할 수 있다. | Firefox를 복원해 Ubuntu help로 이동하고 dock reminder를 열린 메모에 적어 저장한다. | Restore Firefox, switch to help, and type the dock reminder into the open note, then save. | `browser.help_page_opened` -> `note.target_appended` -> `note.saved` | `packages/core/src/tasks/representative/browser-help-tasks.ts` |
| `browser_help_log_dock_with_distractors` | `browser_extract_to_note` | C | 80 | `browser`, `note`, `files` | Firefox는 Explorer에 포커스되어 있고, help-log.txt와 방해 파일 두 개가 함께 보인다. | Ubuntu help의 dock reminder 줄을 찾아 help-log.txt에 기록하고 저장한다. | Switch to Ubuntu help and save the dock reminder into help-log.txt among distractor files. | `browser.help_page_opened` -> `note.target_opened` -> `note.target_appended` -> `note.saved` | `packages/core/src/tasks/representative/browser-help-tasks.ts` |
| `browser_help_log_summary_distractors` | `browser_extract_to_note` | C | 80 | `browser`, `note`, `files` | Firefox는 Explorer에 포커스되어 있고, summary-log.txt 주변에 방해 파일 두 개가 보인다. | Ubuntu help의 workflow summary 줄을 찾아 summary-log.txt에 기록하고 저장한다. | Switch to Ubuntu help and save the workflow summary into summary-log.txt among distractors. | `browser.help_page_opened` -> `note.target_opened` -> `note.target_appended` -> `note.saved` | `packages/core/src/tasks/representative/browser-help-tasks.ts` |
| `browser_help_append_existing` | `browser_extract_to_note` | C | 96 | `browser`, `note`, `files` | help-notes.txt는 기존 내용이 있는 상태로 이미 열려 있고, Firefox는 Explorer에 포커스되어 있다. | Ubuntu help로 전환해 dock reminder 줄을 기존 note 내용 뒤에 덧붙인 뒤 저장한다. | Switch to Ubuntu help and append the dock reminder to a note that already has content, then save. | `browser.help_page_opened` -> `note.target_appended` -> `note.saved` | `packages/core/src/tasks/representative/browser-help-tasks.ts` |
| `browser_help_minimized_distractors` | `browser_extract_to_note` | C | 96 | `browser`, `window`, `note`, `files` | Firefox는 최소화되어 있고, summary-log.txt는 방해 파일 세 개 사이에 놓여 있다. | Firefox를 복원해 Ubuntu help로 이동하고 workflow summary를 summary-log.txt에 적어 저장한다. | Restore Firefox, switch to help, and save the workflow summary into a note among distractors. | `browser.help_page_opened` -> `note.target_opened` -> `note.target_appended` -> `note.saved` | `packages/core/src/tasks/representative/browser-help-tasks.ts` |
| `browser_help_append_unfocused_distractors` | `browser_extract_to_note` | C | 112 | `browser`, `window`, `note`, `files` | Firefox는 포커스를 잃었고, summary-log.txt는 기존 내용이 있는 채로 열려 있으며 주변에 방해 파일 세 개가 있다. | Firefox를 다시 포커스해 Ubuntu help로 이동하고 workflow summary 줄을 열린 note 끝에 덧붙여 저장한다. | Focus Firefox, switch to help, and append the summary line to a note with existing content. | `browser.help_page_opened` -> `note.target_appended` -> `note.saved` | `packages/core/src/tasks/representative/browser-help-tasks.ts` |
| `browser_log_task_preopen_note_hard` | `browser_extract_to_note` | C | 80 | `browser`, `note`, `files` | browser-log.txt는 기존 내용이 들어 있는 채로 이미 열려 있고, Firefox는 Explorer에 포커스되어 있으며 방해 파일 세 개가 보인다. | 목표 task를 선택하고 browser-log.txt 기존 내용 뒤에 task id를 덧붙여 저장한다. | In Firefox OSWorld Explorer, select the target task and append its id to the open browser-log.txt, then save. | `browser.task_selected` -> `note.target_appended` -> `note.saved` | `packages/core/src/tasks/representative/browser-note-log-tasks.ts` |
| `browser_log_task_instruction_text` | `browser_extract_to_note` | C | 64 | `browser`, `note` | Firefox는 Explorer에 포커스되어 있지만 instruction-log.txt는 아직 열리지 않았고, 현재 선택된 task는 목표가 아니다. | 목표 task를 선택한 뒤 그 instruction 문구를 instruction-log.txt에 기록하고 저장한다. | Select the target task in OSWorld Explorer and save its instruction text into a note. | `browser.task_selected` -> `note.target_opened` -> `note.target_appended` -> `note.saved` | `packages/core/src/tasks/representative/browser-note-log-tasks.ts` |
| `browser_log_task_title_text` | `browser_extract_to_note` | C | 64 | `browser`, `note` | Firefox는 Explorer에 포커스되어 있지만 title-log.txt는 아직 열리지 않았고, 현재 선택된 task도 목표와 다르다. | 목표 task를 선택한 뒤 그 제목을 title-log.txt에 기록하고 저장한다. | Select the target task in OSWorld Explorer and save its title into a note. | `browser.task_selected` -> `note.target_opened` -> `note.target_appended` -> `note.saved` | `packages/core/src/tasks/representative/browser-note-log-tasks.ts` |
| `browser_select_log_minimized_preopen` | `browser_extract_to_note` | C | 64 | `browser`, `window`, `note` | Firefox는 dock에 최소화되어 있고, task-log.txt는 이미 메모 창에 열려 있다. | Firefox를 복원해 목표 task를 선택하고 task id를 열린 note에 덧붙여 저장한다. | Restore Firefox, select the target task, and save its id into the open note. | `browser.task_selected` -> `note.target_appended` -> `note.saved` | `packages/core/src/tasks/representative/browser-note-log-tasks.ts` |
| `browser_log_task_append_existing` | `browser_extract_to_note` | C | 96 | `browser`, `note`, `files` | task-log.txt는 기존 내용이 있는 상태로 이미 열려 있고, Firefox는 Explorer에 포커스되어 있다. | 목표 task를 선택하고 task id를 기존 note 내용 뒤에 덧붙여 저장한다. | Select the target task and append its id to a note that already has content, then save. | `browser.task_selected` -> `note.target_appended` -> `note.saved` | `packages/core/src/tasks/representative/browser-note-log-tasks.ts` |
| `browser_log_instruction_unfocused_distractors` | `browser_extract_to_note` | C | 112 | `browser`, `window`, `note`, `files` | Firefox는 포커스를 잃은 상태이고, instruction-log.txt는 아직 열리지 않았으며 방해 파일 세 개가 함께 보인다. | Firefox를 다시 포커스한 뒤 목표 task를 선택하고 instruction 문구를 instruction-log.txt에 기록해 저장한다. | Focus Firefox, select the target task, and save its instruction text into a note among distractors. | `browser.task_selected` -> `note.target_opened` -> `note.target_appended` -> `note.saved` | `packages/core/src/tasks/representative/browser-note-log-tasks.ts` |
| `browser_select_append_minimized_distractors` | `browser_extract_to_note` | C | 112 | `browser`, `window`, `note`, `files` | Firefox는 최소화되어 있고, task-log.txt는 기존 내용이 있는 채 열려 있으며 방해 파일 세 개가 함께 놓여 있다. | Firefox를 복원해 목표 task를 선택하고 task id를 열린 note 끝에 덧붙여 저장한다. | Restore Firefox, select the target task, and append its id to a note with content among distractors. | `browser.task_selected` -> `note.target_appended` -> `note.saved` | `packages/core/src/tasks/representative/browser-note-log-tasks.ts` |
| `mail_extract_mock_note` | `mail_extract_to_note` | C | 96 | `mail`, `note` | Thunderbird가 활성 창이고 옆에는 File Explorer가 열려 있으며, mail-log.txt는 아직 열리지 않은 상태다. | 대상 메일을 열어 reminder 문장을 읽고 mail-log.txt에 기록한 뒤 저장한다. | Open the Mock environment notes email, copy its reminder line into mail-log.txt, and save. | `mail.message_opened` -> `note.target_opened` -> `note.target_appended` -> `note.saved` | `packages/core/src/tasks/representative/cross-app-tasks.ts` |
| `terminal_record_working_directory` | `terminal_record_to_note` | C | 64 | `terminal`, `note` | Terminal이 포커스된 상태이며 File Explorer가 같이 보이고, terminal-log.txt는 명령 결과를 기록할 준비가 되어 있다. | Terminal에서 pwd를 실행해 나온 /workspace를 terminal-log.txt에 적고 저장한다. | Run pwd in Terminal, copy the output into terminal-log.txt, and save. | `terminal.command_ran` -> `note.target_opened` -> `note.target_appended` -> `note.saved` | `packages/core/src/tasks/representative/cross-app-tasks.ts` |
