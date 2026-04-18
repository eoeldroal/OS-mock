# Task 재작성/폐기 분류

## 통계

| Audit Status | Final Action | 수 |
| --- | --- | --- |
| `pass` | `keep` | 48 |
| `fix_needed` | `rewrite` (todo) | 43 |
| `fix_needed` | `rewrite` (done) | 1 |
| `blocked` | `hold` | 3 |
| `drop` | `drop` | 5 |
| **합계** | | **100** |

## Master Decision Table

| No. | Task ID | Audit Status | Final Action | Owner | Current State | Follow-up Summary | Final List Bucket | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 001 | `dismiss_popup_then_append_note` | `fix_needed` | `rewrite` |  | `todo` | `메모장 caret 가시화 및 입력 위치 피드백 복구` | `미배치` |  |
| 002 | `rename_note_in_explorer` | `pass` | `keep` |  | `done` | 유지 | `유지 Task 목록` |  |
| 003 | `copy_line_between_windows` | `fix_needed` | `rewrite` |  | `todo` | `텍스트 선택 interaction 안정화 및 highlight 복구` | `미배치` |  |
| 004 | `minimize_recover_and_save` | `pass` | `keep` |  | `done` | 유지 | `유지 Task 목록` |  |
| 005 | `browser_open_briefing_heading_to_note` | `pass` | `keep` |  | `done` | 유지 | `유지 Task 목록` |  |
| 006 | `browser_catalog_owner_to_note` | `fix_needed` | `rewrite` |  | `todo` | `브라우저 입력 포커스 복구 및 화면 깜빡임 제거` | `미배치` |  |
| 007 | `mail_extract_mock_note` | `fix_needed` | `rewrite` |  | `todo` | `메일 레이아웃 폭 조정 및 본문 텍스트 선택 UX 복구` | `미배치` |  |
| 008 | `terminal_record_working_directory` | `pass` | `keep` |  | `done` | 유지 | `유지 Task 목록` |  |
| 009 | `browser_intake_confirmation_to_note` | `fix_needed` | `rewrite` |  | `todo` | `브라우저 입력 포커스 복구 및 화면 깜빡임 제거` | `미배치` |  |
| 010 | `browser_catalog_audit_append_save` | `fix_needed` | `rewrite` |  | `todo` | `브라우저 입력 포커스 복구 및 화면 깜빡임 제거` | `미배치` |  |
| 011 | `popup_dismiss` | `drop` | `drop` |  | `done` | `popup 포함 복합 task와 중복` | `폐기 Task 목록` |  |
| 012 | `open_single_file` | `drop` | `drop` |  | `done` | `단일 open task로서 설명력 낮고 후보 비교형 open task와 중복` | `폐기 Task 목록` |  |
| 013 | `restore_minimized_note` | `pass` | `keep` |  | `done` | 유지 | `유지 Task 목록` |  |
| 014 | `refocus_background_note` | `fix_needed` | `rewrite` |  | `todo` | `시작 창 배치 수정으로 background refocus 의미 복구` | `미배치` |  |
| 015 | `save_dirty_note` | `pass` | `keep` |  | `done` | 유지 | `유지 Task 목록` |  |
| 016 | `open_among_two` | `pass` | `keep` |  | `done` | 유지 | `유지 Task 목록` |  |
| 017 | `open_among_three` | `pass` | `keep` |  | `done` | 유지 | `유지 Task 목록` |  |
| 018 | `open_among_four` | `pass` | `keep` |  | `done` | 유지 | `유지 Task 목록` |  |
| 019 | `rename_preselected` | `drop` | `drop` |  | `done` | `rename task군과 중복, 단독 유지 가치 낮음` | `폐기 Task 목록` |  |
| 020 | `rename_single` | `drop` | `drop` |  | `done` | `rename task군과 중복, 단독 유지 가치 낮음` | `폐기 Task 목록` |  |
| 021 | `rename_among_two` | `pass` | `keep` |  | `done` | 유지 | `유지 Task 목록` |  |
| 022 | `rename_among_three` | `pass` | `keep` |  | `done` | 유지 | `유지 Task 목록` |  |
| 023 | `rename_among_four` | `pass` | `keep` |  | `done` | 유지 | `유지 Task 목록` |  |
| 024 | `popup_then_open` | `pass` | `keep` |  | `done` | 유지 | `유지 Task 목록` |  |
| 025 | `popup_then_rename` | `pass` | `keep` |  | `done` | 유지 | `유지 Task 목록` |  |
| 026 | `restore_and_save` | `pass` | `keep` |  | `done` | 유지 | `유지 Task 목록` |  |
| 027 | `restore_specific_of_two` | `pass` | `keep` |  | `done` | 유지 | `유지 Task 목록` |  |
| 028 | `restore_from_all_minimized` | `pass` | `keep` |  | `done` | 유지 | `유지 Task 목록` |  |
| 029 | `open_and_append` | `pass` | `keep` |  | `done` | 유지 | `유지 Task 목록` |  |
| 030 | `popup_then_restore` | `pass` | `keep` |  | `done` | 유지 | `유지 Task 목록` |  |
| 031 | `dock_launch_then_open` | `pass` | `keep` |  | `done` | 유지 | `유지 Task 목록` |  |
| 032 | `dock_launch_then_rename` | `pass` | `keep` |  | `done` | 유지 | `유지 Task 목록` |  |
| 033 | `restore_explorer_then_rename` | `pass` | `keep` |  | `done` | 유지 | `유지 Task 목록` |  |
| 034 | `switch_between_notes` | `pass` | `keep` |  | `done` | 유지 | `유지 Task 목록` |  |
| 035 | `open_from_unfocused_explorer` | `pass` | `keep` |  | `done` | 유지 | `유지 Task 목록` |  |
| 036 | `open_append_save` | `pass` | `keep` |  | `done` | 유지 | `유지 Task 목록` |  |
| 037 | `open_append_save_among_three` | `pass` | `keep` |  | `done` | 유지 | `유지 Task 목록` |  |
| 038 | `open_append_save_among_four` | `pass` | `keep` |  | `done` | 유지 | `유지 Task 목록` |  |
| 039 | `rename_then_open` | `pass` | `keep` |  | `done` | 유지 | `유지 Task 목록` |  |
| 040 | `popup_then_open_append_save` | `pass` | `keep` |  | `done` | 유지 | `유지 Task 목록` |  |
| 041 | `popup_then_restore_save` | `pass` | `keep` |  | `done` | 유지 | `유지 Task 목록` |  |
| 042 | `restore_append_save` | `pass` | `keep` |  | `done` | 유지 | `유지 Task 목록` |  |
| 043 | `dock_launch_open_append_save` | `pass` | `keep` |  | `done` | 유지 | `유지 Task 목록` |  |
| 044 | `all_minimized_restore_and_save` | `pass` | `keep` |  | `done` | 유지 | `유지 Task 목록` |  |
| 045 | `popup_then_dock_launch_open` | `pass` | `keep` |  | `done` | 유지 | `유지 Task 목록` |  |
| 046 | `copy_line_paste_save` | `pass` | `keep` |  | `done` | 유지 | `유지 Task 목록` |  |
| 047 | `rename_then_open_among_three` | `pass` | `keep` |  | `done` | 유지 | `유지 Task 목록` |  |
| 048 | `popup_then_rename_among_three` | `pass` | `keep` |  | `done` | 유지 | `유지 Task 목록` |  |
| 049 | `dock_launch_rename_among_three` | `pass` | `keep` |  | `done` | 유지 | `유지 Task 목록` |  |
| 050 | `restore_among_three_then_save` | `fix_needed` | `rewrite` |  | `todo` | `세 후보 편집기 setup 복구 및 dock/window target 매핑 수정` | `미배치` |  |
| 051 | `rename_open_append_save` | `pass` | `keep` |  | `done` | 유지 | `유지 Task 목록` |  |
| 052 | `popup_then_rename_open` | `pass` | `keep` |  | `done` | 유지 | `유지 Task 목록` |  |
| 053 | `popup_then_copy_paste_save` | `pass` | `keep` |  | `done` | 유지 | `유지 Task 목록` |  |
| 054 | `popup_then_restore_append_save` | `pass` | `keep` |  | `done` | 유지 | `유지 Task 목록` |  |
| 055 | `dock_launch_rename_then_open` | `pass` | `keep` |  | `done` | 유지 | `유지 Task 목록` |  |
| 056 | `all_minimized_restore_append_save` | `pass` | `keep` |  | `done` | 유지 | `유지 Task 목록` |  |
| 057 | `popup_dock_launch_open_append_save` | `pass` | `keep` |  | `done` | 유지 | `유지 Task 목록` |  |
| 058 | `popup_rename_open_append_save` | `pass` | `keep` |  | `done` | 유지 | `유지 Task 목록` |  |
| 059 | `popup_all_minimized_restore_save` | `pass` | `keep` |  | `done` | 유지 | `유지 Task 목록` |  |
| 060 | `dock_launch_open_copy_paste_save` | `pass` | `keep` |  | `done` | 유지 | `유지 Task 목록` |  |
| 061 | `mail_extract_invoice_amount` | `fix_needed` | `rewrite` |  | `todo` | `문자 단위 스크롤 기능 추가 필요` | `미배치` |  |
| 062 | `mail_record_sender_address` | `fix_needed` | `rewrite` |  | `todo` | `메일 내 스크롤, 메일 주소 부분 선택 가능하게 변경 필요` | `미배치` |  |
| 063 | `mail_extract_reset_link` | `fix_needed` | `rewrite` |  | `todo` | `메일 내 스크롤 기능 부재로 주소 부분 선택 불가` | `미배치` |  |
| 064 | `mail_extract_meeting_time` | `fix_needed` | `rewrite` |  | `todo` | `문자 단위 스크롤 기능 추가 필요 + 블럭 단위 선택 마우스로 안됨` | `미배치` |  |
| 065 | `mail_extract_tracking_info` | `fix_needed` | `rewrite` |  | `todo` | `64와 동일` | `미배치` |  |
| 066 | `mail_extract_spam_sender` | `fix_needed` | `rewrite` |  | `todo` | `64와 동일` | `미배치` |  |
| 067 | `mail_extract_2fa_code` | `fix_needed` | `rewrite` |  | `todo` | `64와 동일` | `미배치` |  |
| 068 | `mail_extract_trash_link` | `fix_needed` | `rewrite` |  | `todo` | `64와 동일 + trash 폴더 클릭 잘 안됨` | `미배치` |  |
| 069 | `mail_extract_messy_receipt_total` | `blocked` | `hold` |  | `todo` | `스크롤 불가로 인한 수행 불가` | `보류 Task 목록` |  |
| 070 | `mail_extract_flight_pnr` | `fix_needed` | `rewrite` |  | `todo` | `64와 동일` | `미배치` |  |
| 071 | `mail_extract_exception_name` | `fix_needed` | `rewrite` |  | `todo` | `64와 동일` | `미배치` |  |
| 072 | `mail_extract_ssh_ip` | `fix_needed` | `rewrite` |  | `todo` | `64와 동일` | `미배치` |  |
| 073 | `mail_extract_cancellation_fee` | `blocked` | `hold` |  | `todo` | `스크롤 불가로 인한 수행 불가` | `보류 Task 목록` |  |
| 074 | `mail_extract_hr_phone` | `fix_needed` | `rewrite` |  | `todo` | `64와 동일` | `미배치` |  |
| 075 | `mail_extract_draft_recipient` | `fix_needed` | `rewrite` |  | `todo` | `64와 동일` | `미배치` |  |
| 076 | `mail_extract_promo_code` | `fix_needed` | `rewrite` |  | `todo` | `64와 동일` | `미배치` |  |
| 077 | `mail_extract_deadline` | `fix_needed` | `rewrite` |  | `todo` | `64와 동일` | `미배치` |  |
| 078 | `mail_extract_rebooked_flight` | `fix_needed` | `rewrite` |  | `todo` | `64와 동일` | `미배치` |  |
| 079 | `mail_extract_unsubscribe_link` | `blocked` | `hold` |  | `todo` | `스크롤 불가로 인한 수행 불가` | `보류 Task 목록` |  |
| 080 | `terminal_list_directory_contents` | `fix_needed` | `rewrite` |  | `done` | `instruction 수정 완료 — 파일 이름 줄바꿈 구분 명시` | `재작성 완료 Task 목록` |  |
| 081 | `team3_terminal_record_working_directory` | `fix_needed` | `rewrite` |  | `todo` | `스크롤 기능 추가 필요, 리다이렉션 기능 추가 필요, 텍스트 커서 수정 필요, 문자 드래그 기능 추가 필요` | `미배치` |  |
| 082 | `terminal_cat_and_save_config` | `fix_needed` | `rewrite` |  | `todo` | `81과 동일` | `미배치` |  |
| 083 | `terminal_cat_env_password` | `fix_needed` | `rewrite` |  | `todo` | `81과 동일` | `미배치` |  |
| 084 | `terminal_cat_log_error_code` | `fix_needed` | `rewrite` |  | `todo` | `81과 동일` | `미배치` |  |
| 085 | `terminal_list_log_directory` | `fix_needed` | `rewrite` |  | `todo` | `81과 동일` | `미배치` |  |
| 086 | `terminal_cat_csv_email` | `fix_needed` | `rewrite` |  | `todo` | `81과 동일` | `미배치` |  |
| 087 | `terminal_record_deep_pwd` | `drop` | `drop` |  | `done` | `81과 중복되는 task` | `폐기 Task 목록` |  |
| 088 | `terminal_cat_hidden_credentials` | `fix_needed` | `rewrite` |  | `todo` | `비밀 파일 '.' 기능 추가 필요` | `미배치` |  |
| 089 | `terminal_list_hidden_files` | `fix_needed` | `rewrite` |  | `todo` | `88과 동일` | `미배치` |  |
| 090 | `terminal_cat_json_nested` | `fix_needed` | `rewrite` |  | `todo` | `81과 동일` | `미배치` |  |
| 091 | `terminal_cat_python_import` | `fix_needed` | `rewrite` |  | `todo` | `81과 동일` | `미배치` |  |
| 092 | `terminal_find_specific_extension` | `fix_needed` | `rewrite` |  | `todo` | `81과 동일 + wildcard '*' 기능 추가 필요` | `미배치` |  |
| 093 | `terminal_cat_csv_specific_value` | `fix_needed` | `rewrite` |  | `todo` | `81과 동일` | `미배치` |  |
| 094 | `terminal_cat_gitignore` | `fix_needed` | `rewrite` |  | `todo` | `81과 동일` | `미배치` |  |
| 095 | `terminal_find_backup_file` | `fix_needed` | `rewrite` |  | `todo` | `81과 동일 + wildcard '*' 기능 추가 필요` | `미배치` |  |
| 096 | `terminal_cat_package_json_version` | `fix_needed` | `rewrite` |  | `todo` | `81과 동일` | `미배치` |  |
| 097 | `terminal_find_shell_script` | `fix_needed` | `rewrite` |  | `todo` | `81과 동일 + wildcard '*' 기능 추가 필요` | `미배치` |  |
| 098 | `terminal_cat_process_list` | `fix_needed` | `rewrite` |  | `todo` | `81과 동일` | `미배치` |  |
| 099 | `terminal_cat_yaml_config` | `fix_needed` | `rewrite` |  | `todo` | `81과 동일` | `미배치` |  |
| 100 | `terminal_cat_cert_expiry` | `fix_needed` | `rewrite` |  | `todo` | `81과 동일` | `미배치` |  |

---

## 유지 Task 목록

| No. | Task ID | 확인자 A | 확인자 B |
| --- | --- | --- | --- |
| 002 | `rename_note_in_explorer` |  |  |
| 004 | `minimize_recover_and_save` |  |  |
| 005 | `browser_open_briefing_heading_to_note` |  |  |
| 008 | `terminal_record_working_directory` |  |  |
| 013 | `restore_minimized_note` |  |  |
| 015 | `save_dirty_note` |  |  |
| 016 | `open_among_two` |  |  |
| 017 | `open_among_three` |  |  |
| 018 | `open_among_four` |  |  |
| 021 | `rename_among_two` |  |  |
| 022 | `rename_among_three` |  |  |
| 023 | `rename_among_four` |  |  |
| 024 | `popup_then_open` |  |  |
| 025 | `popup_then_rename` |  |  |
| 026 | `restore_and_save` |  |  |
| 027 | `restore_specific_of_two` |  |  |
| 028 | `restore_from_all_minimized` |  |  |
| 029 | `open_and_append` |  |  |
| 030 | `popup_then_restore` |  |  |
| 031 | `dock_launch_then_open` |  |  |
| 032 | `dock_launch_then_rename` |  |  |
| 033 | `restore_explorer_then_rename` |  |  |
| 034 | `switch_between_notes` |  |  |
| 035 | `open_from_unfocused_explorer` |  |  |
| 036 | `open_append_save` |  |  |
| 037 | `open_append_save_among_three` |  |  |
| 038 | `open_append_save_among_four` |  |  |
| 039 | `rename_then_open` |  |  |
| 040 | `popup_then_open_append_save` |  |  |
| 041 | `popup_then_restore_save` |  |  |
| 042 | `restore_append_save` |  |  |
| 043 | `dock_launch_open_append_save` |  |  |
| 044 | `all_minimized_restore_and_save` |  |  |
| 045 | `popup_then_dock_launch_open` |  |  |
| 046 | `copy_line_paste_save` |  |  |
| 047 | `rename_then_open_among_three` |  |  |
| 048 | `popup_then_rename_among_three` |  |  |
| 049 | `dock_launch_rename_among_three` |  |  |
| 051 | `rename_open_append_save` |  |  |
| 052 | `popup_then_rename_open` |  |  |
| 053 | `popup_then_copy_paste_save` |  |  |
| 054 | `popup_then_restore_append_save` |  |  |
| 055 | `dock_launch_rename_then_open` |  |  |
| 056 | `all_minimized_restore_append_save` |  |  |
| 057 | `popup_dock_launch_open_append_save` |  |  |
| 058 | `popup_rename_open_append_save` |  |  |
| 059 | `popup_all_minimized_restore_save` |  |  |
| 060 | `dock_launch_open_copy_paste_save` |  |  |

## 재작성 완료 Task 목록

| No. | Task ID | 수정 범위 | 검증 결과 | 담당자 | PR / Commit |
| --- | --- | --- | --- | --- | --- |
| 080 | `terminal_list_directory_contents` | `instruction` — 파일 이름 줄바꿈 구분 명시 |  |  |  |

## 보류 Task 목록

| No. | Task ID | blocker | 선행 작업 | backlog issue |
| --- | --- | --- | --- | --- |
| 069 | `mail_extract_messy_receipt_total` | 메일 뷰어 내 스크롤 기능 미구현 | 메일 앱 스크롤 기능 구현 |  |
| 073 | `mail_extract_cancellation_fee` | 메일 뷰어 내 스크롤 기능 미구현 | 메일 앱 스크롤 기능 구현 |  |
| 079 | `mail_extract_unsubscribe_link` | 메일 뷰어 내 스크롤 기능 미구현 | 메일 앱 스크롤 기능 구현 |  |

## 폐기 Task 목록

| No. | Task ID | 폐기 이유 | 중복/대체 Task | 반영 방식 |
| --- | --- | --- | --- | --- |
| 011 | `popup_dismiss` | `duplicate` — popup 포함 복합 task와 중복 | `popup_then_open`, `popup_then_rename`, `popup_then_restore` | 카탈로그에서 011 제거 |
| 012 | `open_single_file` | `low_value` — 후보 비교형 open task로 대체 가능 | `open_among_two`, `open_among_three`, `open_among_four` | 카탈로그에서 012 제거 |
| 019 | `rename_preselected` | `duplicate` — rename task군과 중복 | `rename_note_in_explorer`, `rename_among_two`, `rename_among_three`, `rename_among_four` | 카탈로그에서 019 제거 |
| 020 | `rename_single` | `duplicate` — rename task군과 중복 | `rename_note_in_explorer`, `rename_among_two`, `rename_among_three`, `rename_among_four` | 카탈로그에서 020 제거 |
| 087 | `terminal_record_deep_pwd` | `duplicate` — 081과 목적·수행 방식 동일 | `team3_terminal_record_working_directory` (081) | 카탈로그에서 087 제거 |

---

## 앱/런타임 버그 목록

task 문제가 아닌 web/OS 레벨에서 발견된 버그. 각 항목은 영향받는 task와 함께 기록.

### 브라우저

| 버그 | 영향 Task |
| --- | --- |
| 입력칸 단일 클릭 포커스 불가 — 더블클릭 필요 | 006, 009, 010 |
| 입력 후 action마다 화면 깜빡거림 | 006, 009, 010 |

### 메일 뷰어

| 버그 | 영향 Task |
| --- | --- |
| 헤더 영역(sender, subject 등) 선택·복사 불가 | 062 |
| 긴 본문 스크롤 불가 — 하단 내용 잘려 확인 불가 | 063, 069, 073, 079 |
| 본문 블록 단위 복사 가능하나 문자 단위 선택 불가 | 061–078 전반 |
| 폴더(Spam, Trash, Drafts) 클릭 수직 오프셋 — 실제 목표보다 아래 클릭해야 선택됨 | 066, 068, 075 |

### 텍스트 편집기

| 버그 | 영향 Task |
| --- | --- |
| caret 미표시 — 입력 위치를 시각적으로 확인 불가 | 001 |
| 더블클릭 단어 선택 불가 | 003, 007 |
| 키보드 방향키 커서 이동 불가 | 072, 074, 075, 076, 077, 078 |
| 클릭 수평 오프셋 — 실제 위치보다 왼쪽에 커서 위치 | 072, 074, 075, 076, 077, 078 |
| 줄 끝 편집 불가 — 다음 줄 끝 너머 클릭이 막혀 뒷부분 제거 어려움 | 074, 076, 077, 078 |
| 백스페이스 연타 후 키 입력 지연이 다음 작업에 잔류 | 076, 077, 078 |
| 자동 줄바꿈 없음 — 긴 텍스트가 한 줄로 표시되어 뒷부분 잘림 | 074+ |
| 좌측 패널 폭 좁아 항목명 끝까지 표시 안됨 | 007 |

### 터미널

| 버그 | 영향 Task |
| --- | --- |
| 명령 여러 번 입력 시 터미널 작동 중단 | 081–086, 090–100 |
| 터미널 스크롤 불가 — 출력이 창 범위를 넘으면 확인 불가 | 081–100 |
| 터미널 출력 드래그 선택·복사 불가 | 086, 091, 093, 096, 098, 099, 100 |
| ctrl+C / ctrl+V 시 텍스트 커서 위치 오류 | 081–086 |
| 키보드 방향키 기능 없음 | 081–100 |
| 리다이렉션(`>`) 기능 없음 | 081–100 |
| ls 옵션(`-al` 등) 기능 없음 | 081–100 |
| wildcard(`*`) 사용 불가 | 092, 095, 097 |
| 숨김 파일(`.**`) 구분 없이 일반 파일과 함께 출력 | 088, 089 |

### 일반 인터랙션

| 버그 | 영향 Task |
| --- | --- |
| 드래그 입력 후 드래그가 멈추지 않는 오류 | 021–040 전반 (log B) |
