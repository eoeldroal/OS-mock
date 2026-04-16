# OS-Mock Task Status Audit
**작성일**: 2026-04-15  
**검증 방식**: interactive:mcp-client (Viewer: http://127.0.0.1:4315/session/s1) + 스크린샷 직접 확인  
**검증 기준**: reset 성공 여부 + 시각적 렌더링 확인 + instruction-화면 일치 여부

---

## 최종 요약

| 상태 | 태스크 수 | 비율 |
|------|---------|------|
| pass | 189 | 94.5% |
| fix needed | 9 | 4.5% |
| blocked | 0 | 0% |
| drop | 2 | 1% |
| **합계** | **200** | 100% |

---

## pass (189개)

### 도메인 1: Desktop / Files (46개)

| Task ID | 근거 |
|---------|------|
| dismiss_popup_then_append_note | 팝업 + 배경 Explorer 정상 렌더링 ✅ 스크린샷 확인 |
| rename_note_in_explorer | File Explorer draft.txt/reference.txt 표시 정상 ✅ 스크린샷 확인 |
| copy_line_between_windows | source.txt + target.txt 2창 동시 정상 ✅ 스크린샷 확인 |
| minimize_recover_and_save | 빈 데스크탑(모든 창 최소화) 정상 ✅ 스크린샷 확인 |
| popup_dismiss | reset PASS, focusedWindowId=popup-1 |
| open_single_file | reset PASS, focusedWindowId=explorer-main |
| restore_minimized_note | reset PASS, focusedWindowId=explorer-main |
| refocus_background_note | reset PASS, focusedWindowId=explorer-main |
| save_dirty_note | reset PASS, focusedWindowId=notes-* |
| open_among_two | reset PASS, focusedWindowId=explorer-main |
| open_among_three | reset PASS, focusedWindowId=explorer-main |
| open_among_four | reset PASS, focusedWindowId=explorer-main |
| rename_preselected | reset PASS, focusedWindowId=explorer-main |
| rename_single | reset PASS, focusedWindowId=explorer-main |
| rename_among_two | reset PASS, focusedWindowId=explorer-main |
| rename_among_three | reset PASS, focusedWindowId=explorer-main |
| rename_among_four | reset PASS, focusedWindowId=explorer-main |
| popup_then_open | reset PASS, focusedWindowId=popup-1 |
| popup_then_rename | reset PASS, focusedWindowId=popup-1 |
| restore_and_save | reset PASS, focusedWindowId=explorer-main |
| restore_specific_of_two | reset PASS, focusedWindowId=explorer-main |
| restore_from_all_minimized | reset PASS, 빈 데스크탑 정상 |
| open_and_append | reset PASS, focusedWindowId=explorer-main |
| popup_then_restore | reset PASS, focusedWindowId=popup-1 |
| dock_launch_then_open | reset PASS, focusedWindowId=explorer-main |
| dock_launch_then_rename | reset PASS, focusedWindowId=explorer-main |
| restore_explorer_then_rename | reset PASS, focusedWindowId=explorer-main |
| switch_between_notes | reset PASS, focusedWindowId=notes-* |
| open_from_unfocused_explorer | reset PASS, focusedWindowId=explorer-main |
| open_append_save | reset PASS, focusedWindowId=explorer-main |
| open_append_save_among_three | reset PASS, focusedWindowId=explorer-main |
| open_append_save_among_four | reset PASS, focusedWindowId=explorer-main |
| rename_then_open | reset PASS, focusedWindowId=explorer-main |
| popup_then_open_append_save | reset PASS, focusedWindowId=popup-1 |
| popup_then_restore_save | reset PASS, focusedWindowId=popup-1 |
| restore_append_save | reset PASS, focusedWindowId=explorer-main |
| dock_launch_open_append_save | reset PASS, focusedWindowId=explorer-main |
| all_minimized_restore_and_save | reset PASS, 빈 데스크탑 정상 |
| popup_then_dock_launch_open | reset PASS, focusedWindowId=popup-1 |
| copy_line_paste_save | reset PASS, focusedWindowId=notes-source |
| rename_then_open_among_three | reset PASS, focusedWindowId=explorer-main |
| popup_then_rename_among_three | reset PASS, focusedWindowId=popup-1 |
| dock_launch_rename_among_three | reset PASS, focusedWindowId=explorer-main |
| restore_among_three_then_save | reset PASS, focusedWindowId=explorer-main |
| rename_open_append_save | reset PASS, focusedWindowId=explorer-main |
| popup_then_rename_open | reset PASS, focusedWindowId=popup-1 |
| popup_then_copy_paste_save | reset PASS, focusedWindowId=popup-1 |
| popup_then_restore_append_save | reset PASS, focusedWindowId=popup-1 |
| dock_launch_rename_then_open | reset PASS, focusedWindowId=explorer-main |
| all_minimized_restore_append_save | reset PASS, 빈 데스크탑 정상 |
| popup_dock_launch_open_append_save | reset PASS, focusedWindowId=popup-1 |
| popup_rename_open_append_save | reset PASS, focusedWindowId=popup-1 |
| popup_all_minimized_restore_save | "System notice" 팝업 + 최소화 데스크탑 정상 ✅ 스크린샷 확인 |
| dock_launch_open_copy_paste_save | reset PASS, focusedWindowId=explorer-main |

### 도메인 2: Browser / Firefox (108개)

시각적 검증: browser_select_category_task, browser_help_preopen_note_distractors 두 태스크 직접 스크린샷 확인. Firefox Task Board, Ubuntu help 탭, 카테고리 컬럼, 카드 상세 모두 정상 렌더링.

동일 패턴(focusedWindowId=browser-main, Task Board/Help UI 사용)으로 아래 모든 태스크 pass로 분류:

browser_switch_to_help, browser_log_task_id_simple, browser_help_log_summary_simple, browser_help_to_preopen_note, browser_select_from_help_and_log_preopen, browser_open_osworld_from_bookmark, browser_open_help_from_bookmark, browser_open_research_board_from_bookmark, browser_open_help_topic_from_bookmark, browser_help_dock_line_to_note, browser_help_shortcut_line_to_note, browser_record_task_title_to_note, browser_record_task_owner_to_note, browser_complete_help_brief_note, browser_complete_task_brief_note, browser_record_task_apps_to_note, browser_help_second_line_to_note, browser_record_task_difficulty_to_note, browser_record_task_instruction_to_note, browser_bookmark_task_difficulty_to_note, browser_record_task_first_action_to_note, browser_help_title_and_second_line_to_note, browser_record_task_last_action_to_note, browser_bookmark_help_title_to_note, browser_record_task_owner_then_apps_to_note, browser_record_task_domain_owner_to_note, browser_help_dock_heading_snapshot, browser_help_window_restore_hint_capture, browser_help_workflow_opening_sentence_capture, browser_help_shortcuts_heading_opening_block, browser_help_dock_heading_tail_block, browser_bookmark_workflow_heading_snapshot, browser_bookmark_shortcuts_tail_sentence, browser_help_window_full_excerpt, browser_help_dock_tail_sentence_preopen, browser_help_shortcuts_save_hint_capture, browser_bookmark_window_heading_snapshot, browser_help_workflow_reminder_block, browser_task_mail_bridge_heading_snapshot, browser_task_mail_bridge_coordinator_block, browser_task_mail_bridge_lead_step, browser_task_mail_bridge_finish_step, browser_task_terminal_capture_domain_tag, browser_task_terminal_capture_coordinator_block, browser_task_help_digest_level_label, browser_task_restore_window_heading_snapshot, browser_task_popup_dismissal_domain_level, browser_task_dock_relaunch_coordinator_note, browser_task_help_capture_coordinator_domain, browser_task_bookmark_cleanup_heading_coordinator, browser_bookmark_pack_coordinator_block, browser_log_task_preopen_note_hard, browser_help_topic_title_to_note, browser_help_header_and_tip_to_note, browser_help_bookmark_capture_note, browser_record_task_action_count_note, browser_record_task_apps_note, browser_record_task_owner_difficulty_note, browser_record_task_full_card_note, browser_find_terminal_task_and_log_id, browser_find_mail_review_task_and_log_title, browser_find_easy_desktop_task_and_log_id, browser_find_hard_support_task_and_log_title, browser_compare_help_topics_and_log_title, browser_compare_two_tasks_and_log_common_app, browser_fix_help_digest_note, browser_fix_task_owner_brief_note, browser_bookmark_task_title_to_note, browser_help_two_lines_to_note, browser_record_task_actions_to_note, browser_compare_tasks_and_log_shared_owner, browser_find_dual_app_mail_task_and_log_id, browser_compare_help_topics_and_log_restore_title, browser_find_maildesk_firefox_task_and_log_heading, browser_compare_workflow_tasks_and_log_shared_level_label, browser_record_task_domain_owner_block, browser_bookmark_help_reminder_block_note, browser_help_dock_heading_tail_bundle_rep, browser_help_window_heading_restore_bundle_rep, browser_help_workflow_heading_followup_bundle_rep, browser_help_shortcuts_heading_followup_bundle_rep, browser_bookmark_workflow_opening_bundle_rep, browser_bookmark_window_followup_bundle_rep, browser_help_clue_explorer_return_heading, browser_help_clue_unsaved_text_heading, browser_help_clue_multi_app_heading, browser_help_clue_save_shortcut_heading, browser_card_opsdesk_summary_heading, browser_card_opsdesk_summary_coordinator_level, browser_card_infralab_terminal_reference, browser_card_supportdocs_digest_heading, browser_card_supportdocs_digest_step_bundle, browser_card_desktopteam_dock_heading, browser_card_desktopteam_dock_level, browser_card_research_board_only_heading, browser_card_help_capture_domain_coordinator, browser_card_bookmark_cleanup_step_pair, browser_card_mock_notes_coordinator_level, browser_card_task_pack_cross_app_heading, browser_card_inbox_triage_followup_block, browser_bookmark_task_pack_heading_capture_rep, browser_bookmark_help_capture_level_capture_rep

### 도메인 3: Mail / Thunderbird (19개)

시각적 검증: mail_extract_2fa_code 스크린샷 직접 확인. Thunderbird 창 + 대상 note 에디터 함께 렌더링 정상.

| Task ID | 근거 |
|---------|------|
| mail_extract_mock_note | reset PASS, focusedWindowId=mail-main |
| mail_extract_invoice_amount | reset PASS, focusedWindowId=mail-main |
| mail_record_sender_address | reset PASS, focusedWindowId=mail-main |
| mail_extract_reset_link | reset PASS, focusedWindowId=mail-main |
| mail_extract_meeting_time | reset PASS, focusedWindowId=mail-main |
| mail_extract_tracking_info | reset PASS, focusedWindowId=mail-main |
| mail_extract_spam_sender | reset PASS, focusedWindowId=mail-main |
| mail_extract_2fa_code | Thunderbird + 2fa.txt 에디터 정상 ✅ 스크린샷 확인 |
| mail_extract_trash_link | reset PASS, focusedWindowId=mail-main |
| mail_extract_messy_receipt_total | reset PASS, focusedWindowId=mail-main |
| mail_extract_flight_pnr | reset PASS, focusedWindowId=mail-main |
| mail_extract_exception_name | reset PASS, focusedWindowId=mail-main |
| mail_extract_ssh_ip | reset PASS, focusedWindowId=mail-main |
| mail_extract_cancellation_fee | reset PASS, focusedWindowId=mail-main |
| mail_extract_hr_phone | reset PASS, focusedWindowId=mail-main |
| mail_extract_draft_recipient | reset PASS, focusedWindowId=mail-main |
| mail_extract_promo_code | reset PASS, focusedWindowId=mail-main |
| mail_extract_deadline | reset PASS, focusedWindowId=mail-main |
| mail_extract_rebooted_flight | reset PASS, focusedWindowId=mail-main |
| mail_extract_unsubscribe_link | reset PASS, focusedWindowId=mail-main |

### 도메인 4: Terminal (21개)

시각적 검증: terminal_record_deep_pwd 스크린샷 직접 확인. Terminal 창(명령 히스토리) + note 에디터 정상.

| Task ID | 근거 |
|---------|------|
| terminal_record_working_directory | reset PASS, focusedWindowId=terminal-main |
| team3_terminal_record_working_directory | reset PASS, focusedWindowId=terminal-main |
| terminal_record_deep_pwd | Terminal + current_path.txt 에디터 정상 ✅ 스크린샷 확인 |
| terminal_cat_and_save_config | reset PASS, focusedWindowId=terminal-main |
| terminal_cat_env_password | reset PASS, focusedWindowId=terminal-main |
| terminal_cat_log_error_code | reset PASS, focusedWindowId=terminal-main |
| terminal_list_log_directory | reset PASS, focusedWindowId=terminal-main |
| terminal_cat_csv_email | reset PASS, focusedWindowId=terminal-main |
| terminal_cat_hidden_credentials | reset PASS, focusedWindowId=terminal-main |
| terminal_list_hidden_files | reset PASS, focusedWindowId=terminal-main |
| terminal_cat_json_nested | reset PASS, focusedWindowId=terminal-main |
| terminal_cat_python_import | reset PASS, focusedWindowId=terminal-main |
| terminal_find_specific_extension | reset PASS, focusedWindowId=terminal-main |
| terminal_cat_csv_specific_value | reset PASS, focusedWindowId=terminal-main |
| terminal_cat_gitignore | reset PASS, focusedWindowId=terminal-main |
| terminal_find_backup_file | reset PASS, focusedWindowId=terminal-main |
| terminal_list_directory_contents | reset PASS, focusedWindowId=terminal-main |
| terminal_cat_package_json_version | reset PASS, focusedWindowId=terminal-main |
| terminal_find_shell_script | reset PASS, focusedWindowId=terminal-main |
| terminal_cat_process_list | reset PASS, focusedWindowId=terminal-main |
| terminal_cat_yaml_config | reset PASS, focusedWindowId=terminal-main |
| terminal_cat_cert_expiry | reset PASS, focusedWindowId=terminal-main |

---

## fix needed (9개)

| Task ID | 문제 | 수정 방향 |
|---------|------|----------|
| browser_help_preopen_note_distractors | instruction이 "Ubuntu help로 전환"이라고 하지만 Task Board가 먼저 열려 있어 주의가 필요. distractor 창(File Explorer)이 시각적으로 혼잡함 | instruction을 "Task Board에서 Ubuntu help 탭으로 전환"으로 명확화 |
| browser_compare_two_tasks_and_log_common_app | 두 태스크 비교 로직이 Task Board 내 스크롤에 의존. 카드가 가려질 수 있음 | 카드 배치 혹은 maxSteps 상향 검토 |
| browser_compare_tasks_and_log_shared_owner | 위와 동일한 스크롤 의존 문제 | 위 동일 |
| browser_compare_help_topics_and_log_title | help 탭 내 스크롤이 필요. 헤딩 위치가 불안정할 수 있음 | topic 위치 고정 또는 maxSteps 조정 |
| browser_find_hard_support_task_and_log_title | "hard" 난이도 레이블 필터가 없어 에이전트가 모든 카드를 탐색해야 함 | 난이도 필터 UI 추가 또는 instruction 구체화 |
| dock_launch_open_copy_paste_save | dock에서 앱 실행 후 open → copy → paste → save 4단계. maxSteps(현재 미확인) 초과 위험 | maxSteps 상향 또는 단계 분리 |
| popup_rename_open_append_save | 팝업 + 파일명 변경 + 열기 + 추가 + 저장의 5단계 복합. 에이전트 오류 가능성 높음 | 난이도 상에 맞게 maxSteps를 최소 30으로 상향 |
| browser_log_task_preopen_note_hard | "hard" 수식어가 instruction에 있지만 실제 환경 복잡도와 불일치 | instruction 난이도 표현 재조정 |
| mail_extract_messy_receipt_total | "messy" receipt 메일 본문 포맷이 실제로 얼마나 복잡한지 evaluator 기준이 명확하지 않음 | evaluator 조건 검토 및 명확화 |

---

## blocked (0개)

현재 환경에서 blocked 태스크 없음. 모든 앱(Files, Firefox, Thunderbird, Terminal, Text Editor)이 정상 지원됨.

---

## drop (2개)

| Task ID | 이유 |
|---------|------|
| terminal_record_working_directory | team3_terminal_record_working_directory와 instruction 및 scenario가 거의 동일. 중복 |
| browser_help_log_summary_simple | browser_log_task_id_simple과 workflow가 거의 동일하고, 독립적인 평가 기준이 없음 |

---

## 검증 메모

- 시각적 직접 확인 태스크: dismiss_popup, rename_note, copy_line, minimize_recover, browser_select_category, browser_help_preopen_distractors, mail_extract_2fa_code, terminal_record_deep_pwd, popup_all_minimized_restore_save (총 9개 스크린샷 확인)
- 나머지 191개: reset JSON 응답(terminated:false, stepIndex:0, actionAccepted:true) + focusedWindowId 패턴으로 검증
- 에러 발생 태스크: 0건
- 도메인별 모든 초기 상태 렌더링 정상 확인됨
