# Task Hub

현재 source of truth는 task 정의와 `packages/core/src/tasks/registry.ts`의 authoring metadata다.
공개 `listTasks()`와 `trainer.list_tasks`는 agent-safe catalog만 반환한다.

구현 디렉토리: `packages/core/src/tasks/`
타입 정의: `packages/core/src/types.ts`
평가 로직: `packages/core/src/env/evaluator.ts`

---

## Inventory 요약

- 총 task 수: `48`
- `starter`: `25`
- `representative`: `23`
- 오리지널 8개를 포함한 현재 registry 총합이다.
- duplicate-risk audit 결과: `fail 0`, `warn 2`

남은 warning:
- `browser_help_to_preopen_note` <-> `browser_help_preopen_note_distractors`
- `browser_select_from_help_and_log_preopen` <-> `browser_log_task_preopen_note_hard`

둘 다 의도적으로 남겨둔 setup-variation 계열 경고다.

---

## Starter Inventory

- `dismiss_popup_then_append_note`
- `rename_note_in_explorer`
- `copy_line_between_windows`
- `minimize_recover_and_save`
- `browser_select_category_task`
- `browser_switch_to_help`
- `browser_log_task_id_simple`
- `browser_help_log_summary_simple`
- `browser_help_to_preopen_note`
- `browser_select_from_help_and_log_preopen`
- `browser_open_osworld_from_bookmark`
- `browser_open_help_from_bookmark`
- `browser_open_research_board_from_bookmark`
- `browser_open_help_topic_from_bookmark`
- `browser_help_dock_line_to_note`
- `browser_help_shortcut_line_to_note`
- `browser_record_task_title_to_note`
- `browser_record_task_owner_to_note`
- `browser_complete_help_brief_note`
- `browser_complete_task_brief_note`
- `browser_record_task_apps_to_note`
- `browser_help_second_line_to_note`
- `browser_record_task_difficulty_to_note`
- `browser_record_task_instruction_to_note`
- `browser_bookmark_task_difficulty_to_note`

## Representative Inventory

- `browser_help_preopen_note_distractors`
- `browser_log_task_preopen_note_hard`
- `browser_help_topic_title_to_note`
- `browser_help_header_and_tip_to_note`
- `browser_help_bookmark_capture_note`
- `browser_record_task_action_count_note`
- `browser_record_task_apps_note`
- `browser_record_task_owner_difficulty_note`
- `browser_record_task_full_card_note`
- `browser_find_terminal_task_and_log_id`
- `browser_find_mail_review_task_and_log_title`
- `browser_find_easy_desktop_task_and_log_id`
- `browser_find_hard_support_task_and_log_title`
- `browser_compare_help_topics_and_log_title`
- `browser_compare_two_tasks_and_log_common_app`
- `browser_fix_help_digest_note`
- `browser_fix_task_owner_brief_note`
- `browser_bookmark_task_title_to_note`
- `browser_help_two_lines_to_note`
- `browser_record_task_actions_to_note`
- `browser_compare_tasks_and_log_shared_owner`
- `mail_extract_mock_note`
- `terminal_record_working_directory`

---

## 운영 메모

- 현재 registry는 오리지널 8개 + 이후 추가분을 함께 포함한다.
- `existing content`, `preopen note`, `distractors`, `help-start` 차이는 기본적으로 setup variation으로 본다.
- duplicate audit는 semantic intent 기준으로 완화했다. 직접 추출과 비교/탐색형은 더 이상 같은 shape만으로 fail하지 않는다.

## 검증 메모

- 통과: `npm run typecheck`, `npm run build`, `npm test`
- audit: `Total tasks 48`, `fail 0`, `warn 2`
- `npm run qa:representative`: 현재는 `SyntaxError: Unexpected token 'p', "page.scree"... is not valid JSON`로 실패한다.
