# Task Hub

현재 source of truth는 task 정의와 `packages/core/src/tasks/registry.ts`의 authoring metadata다.
공개 `listTasks()`와 `trainer.list_tasks`는 agent-safe catalog만 반환한다.

구현 디렉토리: `packages/core/src/tasks/`
타입 정의: `packages/core/src/types.ts`
평가 로직: `packages/core/src/env/evaluator.ts`

---

## Inventory 요약

- 총 task 수: `160`
- `starter`: `96`
- `representative`: `64`
- browser/editor slice: `110` (`starter 56`, `representative 54`)
- files/window slice: `50` (`starter 40`, `representative 10`)
- 이번 pass에서 추가한 browser/editor task: `50`
  - starter bulk batch `25`
  - representative bulk batch `25`
- duplicate-risk audit 결과: `fail 0`, `warn 29`

---

## Browser/Editor Starter Inventory

### 기존 starter browser/editor

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
- `browser_record_task_first_action_to_note`
- `browser_help_title_and_second_line_to_note`
- `browser_record_task_last_action_to_note`
- `browser_bookmark_help_title_to_note`
- `browser_record_task_owner_then_apps_to_note`
- `browser_record_task_domain_owner_to_note`

### starter browser bulk batch

- `browser_help_dock_heading_snapshot`
- `browser_help_window_restore_hint_capture`
- `browser_help_workflow_opening_sentence_capture`
- `browser_help_shortcuts_heading_opening_block`
- `browser_help_dock_heading_tail_block`
- `browser_bookmark_workflow_heading_snapshot`
- `browser_bookmark_shortcuts_tail_sentence`
- `browser_help_window_full_excerpt`
- `browser_help_dock_tail_sentence_preopen`
- `browser_help_shortcuts_save_hint_capture`
- `browser_bookmark_window_heading_snapshot`
- `browser_help_workflow_reminder_block`
- `browser_task_mail_bridge_heading_snapshot`
- `browser_task_mail_bridge_coordinator_block`
- `browser_task_mail_bridge_lead_step`
- `browser_task_mail_bridge_finish_step`
- `browser_task_terminal_capture_domain_tag`
- `browser_task_terminal_capture_coordinator_block`
- `browser_task_help_digest_level_label`
- `browser_task_restore_window_heading_snapshot`
- `browser_task_popup_dismissal_domain_level`
- `browser_task_dock_relaunch_coordinator_note`
- `browser_task_help_capture_coordinator_domain`
- `browser_task_bookmark_cleanup_heading_coordinator`
- `browser_bookmark_pack_coordinator_block`

## Browser/Editor Representative Inventory

### 기존 representative browser/editor

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
- `browser_find_dual_app_mail_task_and_log_id`
- `browser_compare_help_topics_and_log_restore_title`
- `browser_find_maildesk_firefox_task_and_log_heading`
- `browser_compare_workflow_tasks_and_log_shared_level_label`
- `browser_record_task_domain_owner_block`
- `browser_bookmark_help_reminder_block_note`
- `mail_extract_mock_note`
- `terminal_record_working_directory`

### representative browser bulk batch

- `browser_help_dock_heading_tail_bundle_rep`
- `browser_help_window_heading_restore_bundle_rep`
- `browser_help_workflow_heading_followup_bundle_rep`
- `browser_help_shortcuts_heading_followup_bundle_rep`
- `browser_bookmark_workflow_opening_bundle_rep`
- `browser_bookmark_window_followup_bundle_rep`
- `browser_help_clue_explorer_return_heading`
- `browser_help_clue_unsaved_text_heading`
- `browser_help_clue_multi_app_heading`
- `browser_help_clue_save_shortcut_heading`
- `browser_card_opsdesk_summary_heading`
- `browser_card_opsdesk_summary_coordinator_level`
- `browser_card_infralab_terminal_reference`
- `browser_card_supportdocs_digest_heading`
- `browser_card_supportdocs_digest_step_bundle`
- `browser_card_desktopteam_dock_heading`
- `browser_card_desktopteam_dock_level`
- `browser_card_research_board_only_heading`
- `browser_card_help_capture_domain_coordinator`
- `browser_card_bookmark_cleanup_step_pair`
- `browser_card_mock_notes_coordinator_level`
- `browser_card_task_pack_cross_app_heading`
- `browser_card_inbox_triage_followup_block`
- `browser_bookmark_task_pack_heading_capture_rep`
- `browser_bookmark_help_capture_level_capture_rep`

## Files/Window Starter Inventory

- `popup_dismiss`
- `open_single_file`
- `restore_minimized_note`
- `refocus_background_note`
- `save_dirty_note`
- `open_among_two`
- `open_among_three`
- `open_among_four`
- `rename_preselected`
- `rename_single`
- `rename_among_two`
- `rename_among_three`
- `rename_among_four`
- `popup_then_open`
- `popup_then_rename`
- `restore_and_save`
- `restore_specific_of_two`
- `restore_from_all_minimized`
- `open_and_append`
- `popup_then_restore`
- `dock_launch_then_open`
- `dock_launch_then_rename`
- `restore_explorer_then_rename`
- `switch_between_notes`
- `open_from_unfocused_explorer`
- `open_append_save`
- `open_append_save_among_three`
- `open_append_save_among_four`
- `rename_then_open`
- `popup_then_open_append_save`
- `popup_then_restore_save`
- `restore_append_save`
- `dock_launch_open_append_save`
- `all_minimized_restore_and_save`
- `popup_then_dock_launch_open`
- `copy_line_paste_save`
- `rename_then_open_among_three`
- `popup_then_rename_among_three`
- `dock_launch_rename_among_three`
- `restore_among_three_then_save`

## Files/Window Representative Inventory

- `rename_open_append_save`
- `popup_then_rename_open`
- `popup_then_copy_paste_save`
- `popup_then_restore_append_save`
- `dock_launch_rename_then_open`
- `all_minimized_restore_append_save`
- `popup_dock_launch_open_append_save`
- `popup_rename_open_append_save`
- `popup_all_minimized_restore_save`
- `dock_launch_open_copy_paste_save`

---

## 운영 메모

- browser/editor task는 `packages/core/src/tasks/starter/`와 `packages/core/src/tasks/representative/` 아래에 유지한다.
- 이번 pass에서 추가한 batch 구현 파일:
  - `packages/core/src/tasks/starter/browser-bulk-tasks.ts`
  - `packages/core/src/tasks/representative/browser-bulk-tasks.ts`
- files/window batch는 `packages/core/src/tasks/files-window-tasks.ts` 하나로 관리한다.
- 현재 registry는 browser/editor slice와 files/window slice를 함께 포함한다.
- `existing content`, `preopen note`, `distractors`, `help-start` 차이는 browser/editor 쪽에서 기본적으로 setup variation으로 본다.
- files/window batch는 선택 개수와 창 상태 variation이 많아서 audit 상 `warn`이 다수 남아도 `fail 0`이면 유지한다.

## 검증 메모

- 이번 task-only pass에서 확인한 항목:
  - `npm run typecheck`
  - `npm run build:core`
  - `node .codex/skills/os-mock-task-author/scripts/audit-task-batch.mjs --mode inventory`
- 결과: `Total tasks 160`, `fail 0`, `warn 29`
- `qa:representative`는 이번 pass 범위에 포함하지 않았고 재실행하지 않았다.
