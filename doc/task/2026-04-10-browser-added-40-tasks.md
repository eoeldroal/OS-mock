# 2026-04-10 Browser 관련 추가 Task 40개

기준:
- 현재 registry 총합 48개 중 오리지널 baseline 8개를 제외한 추가 task만 정리했다.
- 여기서 말하는 40개는 browser 중심으로 이후 확장된 task 묶음이다.

제외한 오리지널 8개:
- `dismiss_popup_then_append_note`
- `rename_note_in_explorer`
- `copy_line_between_windows`
- `minimize_recover_and_save`
- `browser_log_task_id_simple`
- `browser_help_log_summary_simple`
- `mail_extract_mock_note`
- `terminal_record_working_directory`

요약:
- 총 `40`개
- `starter 19`
- `representative 21`

## Starter 19개

| No | ID | Family | 요약 |
|---|---|---|---|
| 1 | `browser_select_category_task` | `browser_navigate` | OSWorld Explorer에서 category와 task를 선택 |
| 2 | `browser_switch_to_help` | `browser_navigate` | Firefox에서 Ubuntu help 탭으로 전환 |
| 3 | `browser_help_to_preopen_note` | `browser_extract_to_note` | help 내용을 열린 note에 기록 후 저장 |
| 4 | `browser_select_from_help_and_log_preopen` | `browser_extract_to_note` | help에서 Explorer로 돌아와 task id를 열린 note에 기록 |
| 5 | `browser_open_osworld_from_bookmark` | `browser_bookmark_navigation` | 북마크로 OSWorld Explorer 열기 |
| 6 | `browser_open_help_from_bookmark` | `browser_bookmark_navigation` | 북마크로 Ubuntu help 열기 |
| 7 | `browser_open_research_board_from_bookmark` | `browser_bookmark_navigation` | Research Board 북마크로 Explorer를 열고 Chrome category에 맞추기 |
| 8 | `browser_open_help_topic_from_bookmark` | `browser_bookmark_navigation` | 북마크로 help를 열고 지정 topic으로 이동 |
| 9 | `browser_help_dock_line_to_note` | `browser_help_extract_to_note` | Dock basics line을 note에 기록 |
| 10 | `browser_help_shortcut_line_to_note` | `browser_help_extract_to_note` | Keyboard shortcuts line을 note에 기록 |
| 11 | `browser_record_task_title_to_note` | `browser_task_metadata_to_note` | task title을 note에 기록 |
| 12 | `browser_record_task_owner_to_note` | `browser_task_metadata_to_note` | task owner line을 note에 기록 |
| 13 | `browser_complete_help_brief_note` | `browser_brief_to_note` | help title과 detail line으로 brief 완성 |
| 14 | `browser_complete_task_brief_note` | `browser_brief_to_note` | task id와 title로 brief 완성 |
| 15 | `browser_record_task_apps_to_note` | `browser_task_metadata_to_note` | task app list를 note에 기록 |
| 16 | `browser_help_second_line_to_note` | `browser_help_extract_to_note` | help topic의 두 번째 line을 기록 |
| 17 | `browser_record_task_difficulty_to_note` | `browser_task_metadata_to_note` | task difficulty line을 기록 |
| 18 | `browser_record_task_instruction_to_note` | `browser_task_metadata_to_note` | task instruction을 기록 |
| 19 | `browser_bookmark_task_difficulty_to_note` | `browser_task_metadata_to_note` | 북마크로 Explorer를 열고 task difficulty를 기록 |

## Representative 21개

| No | ID | Family | 요약 |
|---|---|---|---|
| 1 | `browser_help_preopen_note_distractors` | `browser_extract_to_note` | distractor가 있는 상태에서 help line을 열린 note에 기록 |
| 2 | `browser_log_task_preopen_note_hard` | `browser_extract_to_note` | 열린 log note에 task id를 append |
| 3 | `browser_help_topic_title_to_note` | `browser_help_extract_to_note` | help topic title 기록 |
| 4 | `browser_help_header_and_tip_to_note` | `browser_help_extract_to_note` | help title과 첫 line 기록 |
| 5 | `browser_help_bookmark_capture_note` | `browser_help_extract_to_note` | 북마크로 help를 열고 detail line 기록 |
| 6 | `browser_record_task_action_count_note` | `browser_task_metadata_to_note` | task action count 기록 |
| 7 | `browser_record_task_apps_note` | `browser_task_metadata_to_note` | task app list 기록 |
| 8 | `browser_record_task_owner_difficulty_note` | `browser_task_metadata_to_note` | owner와 difficulty를 함께 기록 |
| 9 | `browser_record_task_full_card_note` | `browser_task_metadata_to_note` | id, title, owner, difficulty 전체 card 기록 |
| 10 | `browser_find_terminal_task_and_log_id` | `browser_compare_to_note` | Terminal이 포함된 task를 찾아 id 기록 |
| 11 | `browser_find_mail_review_task_and_log_title` | `browser_compare_to_note` | Thunderbird summary 관련 task title 기록 |
| 12 | `browser_find_easy_desktop_task_and_log_id` | `browser_compare_to_note` | Easy + Desktop Team + Firefox 조건 task id 기록 |
| 13 | `browser_find_hard_support_task_and_log_title` | `browser_compare_to_note` | Hard + Support Docs 조건 task title 기록 |
| 14 | `browser_compare_help_topics_and_log_title` | `browser_compare_to_note` | Ctrl+S가 있는 help topic title 기록 |
| 15 | `browser_compare_two_tasks_and_log_common_app` | `browser_compare_to_note` | 두 task의 공통 app 기록 |
| 16 | `browser_fix_help_digest_note` | `browser_brief_to_note` | help title과 second line으로 digest 보강 |
| 17 | `browser_fix_task_owner_brief_note` | `browser_brief_to_note` | owner와 apps block으로 brief 보강 |
| 18 | `browser_bookmark_task_title_to_note` | `browser_task_metadata_to_note` | 북마크로 Explorer를 열고 task title 기록 |
| 19 | `browser_help_two_lines_to_note` | `browser_help_extract_to_note` | help topic의 first/second line 둘 다 기록 |
| 20 | `browser_record_task_actions_to_note` | `browser_task_metadata_to_note` | 첫 action과 마지막 action 기록 |
| 21 | `browser_compare_tasks_and_log_shared_owner` | `browser_compare_to_note` | 두 task의 shared owner 기록 |
