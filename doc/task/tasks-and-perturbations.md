# 태스크 및 퍼터베이션

이 문서는 현재 `OS-mock`의 태스크 인벤토리와 퍼터베이션 capability를 운영 관점에서 정리한다.
태스크별 시작 상태와 목표는 내부 authoring metadata를 기준으로 정리한 값이며, 이 문서는 그 요약을 한글 중심으로 정리한 운영용 문서다. agent under test에게는 직접 노출하지 않는다.

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
| `split` | starter/representative 등 split |

---

## 2. Starter Tasks

| ID | 시작 상태 | 목표 | Instruction 원문 |
|---|---|---|---|
| `dismiss_popup_then_append_note` | 바탕화면 중앙에 진행을 막는 팝업이 떠 있고, File Explorer에는 todo.txt가 보이며 다른 보조 앱들은 최소화되어 있다. | 팝업을 닫고 todo.txt를 열어 지정된 문구를 덧붙인 뒤 저장한다. | Dismiss the popup, open todo.txt, append the requested line, and save. |
| `rename_note_in_explorer` | File Explorer가 포커스된 상태이며 draft.txt와 방해 파일이 함께 보이고, 브라우저·터미널·메일도 작업공간에 열려 있다. | 파일 관리 흐름을 벗어나지 않고 draft.txt를 final.txt로 이름 변경한다. | Rename draft.txt to final.txt in File Explorer. |
| `copy_line_between_windows` | source.txt와 target.txt를 편집하는 두 개의 메모 창이 나란히 열려 있고, source 창에 포커스가 있다. | source의 첫 줄을 복사해 target 끝에 붙여 넣고 target.txt를 저장한다. | Copy the first line from source.txt into the end of target.txt, then save target.txt. |
| `minimize_recover_and_save` | 모든 창이 최소화되어 있으며, recover.txt를 편집 중인 메모 창에는 아직 저장되지 않은 변경 내용이 남아 있다. | 숨겨진 메모 창을 다시 복원하고 현재 버퍼를 저장한다. | Restore the hidden note editor window and save the pending change. |
| `browser_select_category_task` | Firefox가 OSWorld Explorer에 포커스되어 있지만 현재 선택된 카테고리와 task가 목표와 다르다. | 브라우저 안에서 목표 카테고리와 task 조합으로 선택 상태를 바꾼다. | In Firefox, select the target category and task in OSWorld Explorer. |
| `browser_switch_to_help` | Firefox가 Explorer 탭에 포커스된 상태로 열려 있고, 탭 바에 Ubuntu help 탭이 보인다. | Explorer에서 Ubuntu help 탭으로 전환한다. | In Firefox, switch to the Ubuntu help tab. |
| `browser_select_from_minimized` | Firefox는 dock에 최소화되어 있고, 작업공간에는 File Explorer만 보이는 상태다. | Firefox를 복원한 뒤 Explorer에서 목표 카테고리와 task를 선택한다. | Restore Firefox from the dock and select the target category and task. |
| `browser_select_from_unfocused` | Firefox 창은 열려 있지만 포커스를 잃은 상태이며, File Explorer가 앞에 떠 있다. | Firefox를 다시 앞으로 가져오고 Explorer 선택 상태를 목표 task로 바꾼다. | Focus Firefox and select the target category and task in OSWorld Explorer. |
| `browser_select_from_help_page` | Firefox가 Explorer가 아니라 Ubuntu help 탭에서 시작한다. | Explorer로 돌아가 목표 task 카드를 선택한다. | In Firefox, switch from Ubuntu help to OSWorld Explorer and select the target task. |
| `browser_help_from_unfocused_starter` | Firefox 창은 배경에 열려 있고 다른 창이 포커스를 가지고 있다. | Firefox에 포커스를 준 뒤 Ubuntu help 탭으로 이동한다. | Focus Firefox and switch to the Ubuntu help tab. |
| `browser_help_from_minimized_starter` | Firefox가 dock에 최소화된 상태로 시작하며, 복원 후 help 탭으로 이동할 수 있다. | Firefox를 복원한 뒤 Ubuntu help 탭을 활성화한다. | Restore Firefox from the dock and switch to the Ubuntu help tab. |
| `browser_log_task_from_help_start` | Firefox가 Ubuntu help 탭에서 시작하고, File Explorer에는 비어 있는 browser-log.txt가 준비되어 있다. | Explorer로 돌아가 목표 task를 선택하고 그 task id를 browser-log.txt에 기록한 뒤 저장한다. | Switch Firefox from help to OSWorld Explorer, select the target task, and save its id into browser-log.txt. |
| `browser_help_to_preopen_note` | Firefox는 Explorer에 열려 있고, help-notes.txt는 이미 메모 창에 열려 있다. | Ubuntu help로 전환해 dock 안내 문구를 열린 메모에 적고 저장한다. | Switch Firefox to Ubuntu help, type the dock reminder line into the open note, and save. |
| `browser_log_task_id_simple` | Firefox는 Explorer에 포커스되어 있지만 잘못된 task가 선택되어 있고, task-log.txt는 아직 열리지 않았다. | 목표 task를 고른 뒤 task-log.txt를 열어 task id를 기록하고 저장한다. | In Firefox, select the target task and save its id into task-log.txt. |
| `browser_help_log_summary_simple` | Firefox는 Explorer에 포커스되어 있고, summary-log.txt는 File Explorer에만 존재하며 아직 열리지 않았다. | Ubuntu help의 workflow summary 문구를 summary-log.txt에 기록하고 저장한다. | Switch Firefox to Ubuntu help and save the workflow summary line into summary-log.txt. |
| `browser_select_from_help_and_log_preopen` | Firefox는 Ubuntu help 탭에서 시작하고, task-log.txt는 이미 메모 창에 열려 있다. | help 탭을 벗어나 Explorer에서 목표 task를 선택하고 task id를 열린 메모에 추가해 저장한다. | Switch Firefox from help to Explorer, select the target task, and save its id into the open note. |
| `browser_help_log_summary_preopen` | Firefox는 Explorer에서 시작하고, summary-log.txt는 이미 편집 가능한 상태로 열려 있다. | Ubuntu help로 전환해 workflow summary 문구를 열린 메모에 덧붙이고 저장한다. | Switch Firefox to Ubuntu help and type the workflow summary into the open note, then save. |
| `browser_select_log_to_preopen` | Firefox는 Explorer에 포커스되어 있고, task-log.txt가 이미 옆 메모 창에 열려 있다. | Explorer에서 목표 task를 선택하고 task id를 열린 메모에 적어 저장한다. | In Firefox Explorer, select the target task and save its id into the open note. |

## 3. Representative Tasks

| ID | 시작 상태 | 목표 | Instruction 원문 |
|---|---|---|---|
| `browser_log_workflow_task_id` | Firefox는 Explorer에 포커스되어 있지만 현재 카테고리와 task 선택이 목표와 다르고, browser-log.txt는 아직 열리지 않았다. | Workflow 카테고리의 workflow_mail_bridge task를 선택하고 browser-log.txt에 task id를 기록해 저장한다. | Open Workflow in OSWorld Explorer, select the bridge task, and save its task id into browser-log.txt. |
| `browser_log_task_from_minimized` | Firefox는 dock에 최소화되어 있고, File Explorer에는 browser-log.txt가 준비되어 있다. | Firefox를 복원한 뒤 목표 task를 선택하고 browser-log.txt에 task id를 적어 저장한다. | Restore Firefox from the dock, select the target task in OSWorld Explorer, and save its id into browser-log.txt. |
| `browser_log_task_unfocused_help_start` | Firefox는 포커스를 잃은 상태이며 Ubuntu help 탭이 열려 있고, task-log.txt는 아직 열리지 않았다. | Firefox를 다시 포커스하고 help에서 Explorer로 넘어가 목표 task를 선택한 뒤 task-log.txt에 id를 적어 저장한다. | Focus Firefox, switch from help to OSWorld Explorer, select the target task, and save its id into task-log.txt. |
| `browser_select_log_unfocused` | Firefox는 File Explorer 뒤에 가려져 포커스를 잃고 있으며, task-log.txt는 작업공간에 있지만 아직 열리지 않았다. | Firefox를 앞으로 가져와 목표 task를 선택하고 task-log.txt에 id를 기록해 저장한다. | Focus Firefox, select the target task, and save its id into task-log.txt. |
| `browser_log_task_with_distractors` | Firefox는 Explorer에 포커스되어 있고, task-log.txt 옆에 방해용 파일 두 개가 함께 보인다. | 방해 파일을 무시하고 목표 task를 선택한 뒤 task-log.txt에 id를 기록해 저장한다. | Select the target task in Explorer and save its id into task-log.txt among distractor files. |
| `browser_select_different_category_log` | Firefox는 잘못된 Explorer 카테고리와 task를 보여 주고 있고, task-log.txt는 아직 열리지 않았다. | 올바른 카테고리로 이동해 목표 task를 선택하고 task id를 note에 저장한다. | Switch to the target category in OSWorld Explorer, select the task, and save its id. |
| `browser_log_task_minimized_distractors` | Firefox는 최소화되어 있고, 작업공간에는 task-log.txt와 방해 파일 세 개가 함께 놓여 있다. | Firefox를 복원해 목표 task를 고르고, 방해 파일이 있어도 task-log.txt에 id를 적어 저장한다. | Restore Firefox, select the target task, and save its id into task-log.txt among distractors. |
| `browser_log_task_unfocused_distractors` | Firefox는 열려 있지만 포커스를 잃은 상태이고, File Explorer에는 task-log.txt와 방해 파일 세 개가 보인다. | Firefox를 다시 포커스한 뒤 목표 task를 선택하고 task-log.txt에 id를 기록해 저장한다. | Focus Firefox, select the target task, and save its id into task-log.txt among distractors. |
| `browser_log_from_help_unfocused_distractors` | Firefox는 포커스를 잃은 채 Ubuntu help 탭이 열려 있고, 주변에는 방해 파일 세 개와 task-log.txt가 있다. | Firefox를 다시 포커스하고 help에서 Explorer로 이동해 목표 task를 고른 뒤 task-log.txt에 id를 적어 저장한다. | Focus Firefox on help, switch to Explorer, select the target task, and save its id among distractors. |
| `browser_select_log_minimized_help_start` | Firefox는 dock에 최소화되어 있으며, 복원하면 Explorer가 아니라 Ubuntu help 탭부터 보인다. | Firefox를 복원하고 help를 벗어나 목표 task를 선택한 뒤 task-log.txt에 id를 기록해 저장한다. | Restore minimized Firefox from help, switch to Explorer, select the target task, and save its id. |
| `browser_capture_help_line` | Firefox는 Explorer에 포커스되어 있고, ubuntu-help.txt는 File Explorer에만 있으며 아직 열리지 않았다. | Ubuntu help의 dock reminder 줄을 찾아 ubuntu-help.txt에 기록하고 저장한다. | Switch Firefox to Ubuntu help, copy the dock reminder line into ubuntu-help.txt, and save. |
| `browser_help_from_minimized` | Firefox는 dock에 최소화되어 있고, help-log.txt는 아직 열리지 않은 상태다. | Firefox를 복원해 Ubuntu help로 이동하고 workflow summary 줄을 help-log.txt에 적어 저장한다. | Restore Firefox from the dock, switch to Ubuntu help, and save the workflow summary line into help-log.txt. |
| `browser_help_preopen_note_distractors` | help-notes.txt는 이미 열려 있고, Firefox 옆에는 방해 파일 세 개가 함께 보인다. | Ubuntu help로 전환해 dock reminder 줄을 열린 help-notes.txt에 적고 저장한다. | In Firefox, switch to Ubuntu help, type the dock reminder line into the open help-notes.txt, and save. |
| `browser_help_unfocused_distractors` | Firefox는 포커스를 잃은 상태이며, help-log.txt 주변에 여러 방해 파일이 놓여 있다. | Firefox를 다시 포커스한 뒤 Ubuntu help로 이동해 workflow summary를 help-log.txt에 기록하고 저장한다. | Focus Firefox, switch to Ubuntu help, and save the workflow summary line into help-log.txt. |
| `browser_help_log_unfocused_preopen` | Firefox는 포커스를 잃었고, help-notes.txt는 이미 메모 창에 열려 있다. | Firefox를 다시 포커스해 Ubuntu help로 이동하고 dock reminder를 열린 메모에 덧붙여 저장한다. | Focus Firefox, switch to help, and type the dock reminder into the open note, then save. |
| `browser_help_log_minimized_preopen` | Firefox는 최소화되어 있고, help-notes.txt는 이미 열려 있어 바로 입력할 수 있다. | Firefox를 복원해 Ubuntu help로 이동하고 dock reminder를 열린 메모에 적어 저장한다. | Restore Firefox, switch to help, and type the dock reminder into the open note, then save. |
| `browser_help_log_dock_with_distractors` | Firefox는 Explorer에 포커스되어 있고, help-log.txt와 방해 파일 두 개가 함께 보인다. | Ubuntu help의 dock reminder 줄을 찾아 help-log.txt에 기록하고 저장한다. | Switch to Ubuntu help and save the dock reminder into help-log.txt among distractor files. |
| `browser_help_log_summary_distractors` | Firefox는 Explorer에 포커스되어 있고, summary-log.txt 주변에 방해 파일 두 개가 보인다. | Ubuntu help의 workflow summary 줄을 찾아 summary-log.txt에 기록하고 저장한다. | Switch to Ubuntu help and save the workflow summary into summary-log.txt among distractors. |
| `browser_help_append_existing` | help-notes.txt는 기존 내용이 있는 상태로 이미 열려 있고, Firefox는 Explorer에 포커스되어 있다. | Ubuntu help로 전환해 dock reminder 줄을 기존 note 내용 뒤에 덧붙인 뒤 저장한다. | Switch to Ubuntu help and append the dock reminder to a note that already has content, then save. |
| `browser_help_minimized_distractors` | Firefox는 최소화되어 있고, summary-log.txt는 방해 파일 세 개 사이에 놓여 있다. | Firefox를 복원해 Ubuntu help로 이동하고 workflow summary를 summary-log.txt에 적어 저장한다. | Restore Firefox, switch to help, and save the workflow summary into a note among distractors. |
| `browser_help_append_unfocused_distractors` | Firefox는 포커스를 잃었고, summary-log.txt는 기존 내용이 있는 채로 열려 있으며 주변에 방해 파일 세 개가 있다. | Firefox를 다시 포커스해 Ubuntu help로 이동하고 workflow summary 줄을 열린 note 끝에 덧붙여 저장한다. | Focus Firefox, switch to help, and append the summary line to a note with existing content. |
| `browser_log_task_preopen_note_hard` | browser-log.txt는 기존 내용이 들어 있는 채로 이미 열려 있고, Firefox는 Explorer에 포커스되어 있으며 방해 파일 세 개가 보인다. | 목표 task를 선택하고 browser-log.txt 기존 내용 뒤에 task id를 덧붙여 저장한다. | In Firefox OSWorld Explorer, select the target task and append its id to the open browser-log.txt, then save. |
| `browser_log_task_instruction_text` | Firefox는 Explorer에 포커스되어 있지만 instruction-log.txt는 아직 열리지 않았고, 현재 선택된 task는 목표가 아니다. | 목표 task를 선택한 뒤 그 instruction 문구를 instruction-log.txt에 기록하고 저장한다. | Select the target task in OSWorld Explorer and save its instruction text into a note. |
| `browser_log_task_title_text` | Firefox는 Explorer에 포커스되어 있지만 title-log.txt는 아직 열리지 않았고, 현재 선택된 task도 목표와 다르다. | 목표 task를 선택한 뒤 그 제목을 title-log.txt에 기록하고 저장한다. | Select the target task in OSWorld Explorer and save its title into a note. |
| `browser_select_log_minimized_preopen` | Firefox는 dock에 최소화되어 있고, task-log.txt는 이미 메모 창에 열려 있다. | Firefox를 복원해 목표 task를 선택하고 task id를 열린 note에 덧붙여 저장한다. | Restore Firefox, select the target task, and save its id into the open note. |
| `browser_log_task_append_existing` | task-log.txt는 기존 내용이 있는 상태로 이미 열려 있고, Firefox는 Explorer에 포커스되어 있다. | 목표 task를 선택하고 task id를 기존 note 내용 뒤에 덧붙여 저장한다. | Select the target task and append its id to a note that already has content, then save. |
| `browser_log_instruction_unfocused_distractors` | Firefox는 포커스를 잃은 상태이고, instruction-log.txt는 아직 열리지 않았으며 방해 파일 세 개가 함께 보인다. | Firefox를 다시 포커스한 뒤 목표 task를 선택하고 instruction 문구를 instruction-log.txt에 기록해 저장한다. | Focus Firefox, select the target task, and save its instruction text into a note among distractors. |
| `browser_select_append_minimized_distractors` | Firefox는 최소화되어 있고, task-log.txt는 기존 내용이 있는 채 열려 있으며 방해 파일 세 개가 함께 놓여 있다. | Firefox를 복원해 목표 task를 선택하고 task id를 열린 note 끝에 덧붙여 저장한다. | Restore Firefox, select the target task, and append its id to a note with content among distractors. |
| `mail_extract_mock_note` | Thunderbird가 활성 창이고 옆에는 File Explorer가 열려 있으며, mail-log.txt는 아직 열리지 않은 상태다. | 대상 메일을 열어 reminder 문장을 읽고 mail-log.txt에 기록한 뒤 저장한다. | Open the Mock environment notes email, copy its reminder line into mail-log.txt, and save. |
| `terminal_record_working_directory` | Terminal이 포커스된 상태이며 File Explorer가 같이 보이고, terminal-log.txt는 명령 결과를 기록할 준비가 되어 있다. | Terminal에서 pwd를 실행해 나온 /workspace를 terminal-log.txt에 적고 저장한다. | Run pwd in Terminal, copy the output into terminal-log.txt, and save. |

---

## 4. 퍼터베이션 Capability

- `PopupInject`
- `MinimizeAll`
- `RandomPointerSpawn`
- `WindowClose`
- `ZOrderShuffle`

현재 task-author 기본 생성 정책에서는 퍼터베이션을 task inventory 기본축으로 사용하지 않는다.
필요하면 trainer/debug 흐름에서 별도로 적용한다.

---

## 5. 운영 규칙

1. 새 task 추가 시 `startState`, `objective`, `instruction`을 내부 authoring metadata에 같이 작성한다.
2. 같은 변경에서 이 문서와 `doc/task/task-hub.md`를 함께 갱신한다.
3. task 설명 문구는 한글로 작성하되, 실제 `TaskSpec.instruction` 문자열은 원문 보존이 필요하면 별도 열로 그대로 남긴다.
4. inventory 변경 후에는 가능하면 `npm run typecheck`와 task inventory audit를 같이 실행한다.

원칙: agent under test에게는 자연어 instruction과 화면 관측만 제공해야 하며, `family`, `startState`, `objective`, `goalPredicates`, `progressPredicates`, `implementationPath` 같은 내부 메타데이터는 공개 tool 응답에 포함하지 않는다.
