# OS-Mock Task Status Audit (1-100)

**작성일**: 2026-04-17  
**근거 문서**: `docs/task/task-status-log-A.md` ~ `docs/task/task-status-log-E.md`의 `Observed Result` + `Freeform Notes`  
**분류 기준**: `pass`, `fix_needed`, `blocked`, `drop`

## 최종 요약

| 상태 | 태스크 수 | 비율 |
| --- | --- | --- |
| pass | 48 | 48.0% |
| fix_needed | 44 | 44.0% |
| blocked | 3 | 3.0% |
| drop | 5 | 5.0% |
| **합계** | **100** | **100%** |

## 분류 메모

- `blocked`: 메일 하단 스크롤 불가처럼 현재 앱/환경 제약 때문에 핵심 workflow가 실제로 막힌 경우에만 사용했다.
- `drop`: `011 popup_dismiss`, `012 open_single_file`, `019 rename_preselected`, `020 rename_single`, `087 terminal_record_deep_pwd`는 다른 task와 실질적으로 중복이라는 로그 근거를 반영했다.
- `fix_needed`: 기존 `pass_with_notes`, `fail`, `pass with notes` 중 유지 가치가 있으나 수정이 필요한 태스크를 포함한다.

## Master Table

| No. | Task ID | Source Log | Status | Evidence |
| --- | --- | --- | --- | --- |
| 001 | `dismiss_popup_then_append_note` | `A` | `fix_needed` | 메모장에 입력 커서 위치가 보이지 않았다. 글자를 써야만 현재 입력 위치를 확인할 수 있었지만 작업 자체는 진행 가능했다. |
| 002 | `rename_note_in_explorer` | `A` | `pass` | 이상 없음 |
| 003 | `copy_line_between_windows` | `A` | `fix_needed` | 더블클릭해도 텍스트 블록 선택이 되지 않았다. 복사/붙여넣기 계열 조작에서 선택 UX가 불안정했다. |
| 004 | `minimize_recover_and_save` | `A` | `pass` | 이상 없음 |
| 005 | `browser_open_briefing_heading_to_note` | `A` | `pass` | 이상 없음 |
| 006 | `browser_catalog_owner_to_note` | `A` | `fix_needed` | `catalog.local`에서 빈 입력칸을 한 번 클릭해서는 박스 선택이 되지 않았고, 더블클릭해야 텍스트 입력이 가능했다. 더블클릭 이후에는 action마다 화면이 깜빡거렸다. |
| 007 | `mail_extract_mock_note` | `A` | `fix_needed` | 왼쪽 창이 너무 좁아 파일명과 메일명이 끝까지 보이지 않았고, 메일 원문 텍스트 블록 선택이 되지 않아 `ctrl+c`, `ctrl+v` 흐름이 불편했다. |
| 008 | `terminal_record_working_directory` | `A` | `pass` | 이상 없음 |
| 009 | `browser_intake_confirmation_to_note` | `A` | `fix_needed` | 6번과 동일하게 입력칸이 한 번 클릭으로는 활성화되지 않았고, 더블클릭해야 입력 가능했다. 입력 과정에서 action마다 화면이 깜빡거렸다. |
| 010 | `browser_catalog_audit_append_save` | `A` | `fix_needed` | 6번과 동일한 문제였다. 입력칸 포커스를 위해 더블클릭이 필요했고, 상호작용마다 화면이 깜빡거렸다. |
| 011 | `popup_dismiss` | `A` | `drop` | 이미 다른 task에 포함된 과제로 판단되어 별도 유지 필요가 낮다. |
| 012 | `open_single_file` | `A` | `drop` | 이미 다른 task에 포함된 과제로 판단되어 별도 유지 필요가 낮다. |
| 013 | `restore_minimized_note` | `A` | `pass` | 이상 없음 |
| 014 | `refocus_background_note` | `A` | `fix_needed` | 텍스트 편집기가 파일 매니저 뒤에 있지 않아 task setup이 기대한 창 배치와 달랐다. 복원/재포커스 태스크의 의미가 흐려졌다. |
| 015 | `save_dirty_note` | `A` | `pass` | 이상 없음 |
| 016 | `open_among_two` | `A` | `pass` | 이상 없음 |
| 017 | `open_among_three` | `A` | `pass` | 이상 없음 |
| 018 | `open_among_four` | `A` | `pass` | 이상 없음 |
| 019 | `rename_preselected` | `A` | `drop` | 이미 다른 task에 포함된 과제로 판단되어 별도 유지 필요가 낮다. + 기존 이름 삭제하려고 delete 누르는 도중 time limit에 걸려 task가 중단되었다.|
| 020 | `rename_single` | `A` | `drop` | 이미 다른 task에 포함된 과제로 판단되어 별도 유지 필요가 낮다. + 기존 이름 삭제하려고 delete 누르는 도중 time limit에 걸려 task가 중단되었다.|
| 021 | `rename_among_two` | `B` | `pass` | 로그상 이상 없음 |
| 022 | `rename_among_three` | `B` | `pass` | 로그상 이상 없음 |
| 023 | `rename_among_four` | `B` | `pass` | 로그상 이상 없음 |
| 024 | `popup_then_open` | `B` | `pass` | 로그상 이상 없음 |
| 025 | `popup_then_rename` | `B` | `pass` | 로그상 이상 없음 |
| 026 | `restore_and_save` | `B` | `pass` | 로그상 이상 없음 |
| 027 | `restore_specific_of_two` | `B` | `pass` | 로그상 이상 없음 |
| 028 | `restore_from_all_minimized` | `B` | `pass` | 로그상 이상 없음 |
| 029 | `open_and_append` | `B` | `pass` | 로그상 이상 없음 |
| 030 | `popup_then_restore` | `B` | `pass` | 로그상 이상 없음 |
| 031 | `dock_launch_then_open` | `B` | `pass` | 로그상 이상 없음 |
| 032 | `dock_launch_then_rename` | `B` | `pass` | 로그상 이상 없음 |
| 033 | `restore_explorer_then_rename` | `B` | `pass` | 로그상 이상 없음 |
| 034 | `switch_between_notes` | `B` | `pass` | 로그상 이상 없음 |
| 035 | `open_from_unfocused_explorer` | `B` | `pass` | 로그상 이상 없음 |
| 036 | `open_append_save` | `B` | `pass` | 로그상 이상 없음 |
| 037 | `open_append_save_among_three` | `B` | `pass` | 로그상 이상 없음 |
| 038 | `open_append_save_among_four` | `B` | `pass` | 로그상 이상 없음 |
| 039 | `rename_then_open` | `B` | `pass` | 로그상 이상 없음 |
| 040 | `popup_then_open_append_save` | `B` | `pass` | 로그상 이상 없음 |
| 041 | `popup_then_restore_save` | `C` | `pass` | 팝업을 닫고 에디터를 복원한 뒤 저장까지 정상적으로 완료했다. |
| 042 | `restore_append_save` | `C` | `pass` | 숨겨진 에디터를 복원하고 텍스트를 추가한 뒤 저장까지 정상적으로 완료했다. |
| 043 | `dock_launch_open_append_save` | `C` | `pass` | 독에서 Files 앱을 실행하고 대상 파일을 연 뒤 지시된 텍스트를 추가하고 저장까지 정상적으로 완료했다. |
| 044 | `all_minimized_restore_and_save` | `C` | `pass` | 모든 창이 최소화된 상태에서 올바른 에디터를 복원하고 파일 저장까지 정상적으로 완료했다. |
| 045 | `popup_then_dock_launch_open` | `C` | `pass` | 팝업을 닫고 독에서 Files 앱을 실행한 뒤 대상 파일을 정상적으로 열었다. |
| 046 | `copy_line_paste_save` | `C` | `pass` | 에디터 사이에서 한 줄을 복사해 대상 노트에 붙여넣고 저장까지 정상적으로 완료했다. |
| 047 | `rename_then_open_among_three` | `C` | `pass` | 세 개의 파일 중 올바른 파일 이름을 변경한 뒤 해당 파일을 정상적으로 열었다. |
| 048 | `popup_then_rename_among_three` | `C` | `pass` | 팝업을 닫고 세 개의 파일 중 올바른 파일 이름을 정상적으로 변경했다. |
| 049 | `dock_launch_rename_among_three` | `C` | `pass` | 독에서 Files 앱을 실행하고 세 개의 파일 중 올바른 파일 이름을 정상적으로 변경했다. |
| 050 | `restore_among_three_then_save` | `C` | `fix_needed` | 시작부터 텍스트 파일이 두 개만 보였고, 독에서 alpha 문서를 클릭했는데 delta가 열렸다. |
| 051 | `rename_open_append_save` | `C` | `pass` | 파일 이름을 변경하고 연 뒤 지시된 텍스트를 추가하고 저장까지 정상적으로 완료했다. |
| 052 | `popup_then_rename_open` | `C` | `pass` | 팝업을 닫고 파일 이름을 변경한 뒤 변경된 파일을 정상적으로 열었다. |
| 053 | `popup_then_copy_paste_save` | `C` | `pass` | 팝업을 닫고 에디터 사이에서 내용을 복사해 대상 노트에 붙여넣고 저장까지 정상적으로 완료했다. |
| 054 | `popup_then_restore_append_save` | `C` | `pass` | 팝업을 닫고 에디터를 복원한 뒤 텍스트를 추가하고 저장까지 정상적으로 완료했다. |
| 055 | `dock_launch_rename_then_open` | `C` | `pass` | 독에서 Files 앱을 실행하고 올바른 파일 이름을 변경한 뒤 변경된 파일을 정상적으로 열었다. |
| 056 | `all_minimized_restore_append_save` | `C` | `pass` | 모든 창이 최소화된 상태에서 올바른 에디터를 복원하고 텍스트를 추가한 뒤 저장까지 정상적으로 완료했다. |
| 057 | `popup_dock_launch_open_append_save` | `C` | `pass` | 팝업을 닫고 독에서 Files 앱을 실행한 뒤 대상 파일을 열고 텍스트를 추가한 뒤 저장까지 정상적으로 완료했다. |
| 058 | `popup_rename_open_append_save` | `C` | `pass` | 팝업을 닫고 파일 이름을 변경한 뒤 파일을 열고 지시된 텍스트를 추가해 저장까지 정상적으로 완료했다. |
| 059 | `popup_all_minimized_restore_save` | `C` | `pass` | 팝업과 전체 최소화 상태를 처리한 뒤 올바른 에디터를 복원하고 저장까지 정상적으로 완료했다. |
| 060 | `dock_launch_open_copy_paste_save` | `C` | `pass` | 독에서 Files 앱을 실행하고 두 파일을 연 뒤 내용을 복사해 붙여넣고 대상 파일 저장까지 정상적으로 완료했다. |
| 061 | `mail_extract_invoice_amount` | `D` | `fix_needed` | 블록 복사 우회 가능했으나 직접 입력으로 완료 |
| 062 | `mail_record_sender_address` | `D` | `fix_needed` | 정답(sender)이 헤더 영역에 위치해 스크롤 범위 밖, 선택·복사 불가, 직접 입력으로 완료 |
| 063 | `mail_extract_reset_link` | `D` | `fix_needed` | 메일 하단이 잘려 URL 끝부분 확인 불가(스크롤 안 됨), 정답 값 직접 입력 시 성공 |
| 064 | `mail_extract_meeting_time` | `D` | `fix_needed` | 블록 복사 우회 가능했으나 직접 입력으로 완료 |
| 065 | `mail_extract_tracking_info` | `D` | `fix_needed` | 블록 복사 우회 가능했으나 직접 입력으로 완료 |
| 066 | `mail_extract_spam_sender` | `D` | `fix_needed` | 폴더 클릭 오프셋으로 처음엔 선택 안 됐으나 재시도로 성공. 블록 복사 우회 가능했으나 직접 입력으로 완료 |
| 067 | `mail_extract_2fa_code` | `D` | `fix_needed` | 블록 복사 우회 가능했으나 직접 입력으로 완료 |
| 068 | `mail_extract_trash_link` | `D` | `fix_needed` | 휴지통 폴더 클릭이 불안정해 반복 클릭 후에야 선택됐고, 복사는 되지 않아 직접 입력으로 완료했다. 066과 같은 계열의 버그로 보인다. |
| 069 | `mail_extract_messy_receipt_total` | `D` | `blocked` | 메일 스크롤 불가로 하단 내용 확인 불가, 태스크 진행 불가 |
| 070 | `mail_extract_flight_pnr` | `D` | `fix_needed` | 블록 복사 우회 가능했으나 직접 입력으로 완료 |
| 071 | `mail_extract_exception_name` | `D` | `fix_needed` | 블록 복사 우회 가능했으나 직접 입력으로 완료 |
| 072 | `mail_extract_ssh_ip` | `D` | `fix_needed` | 스크롤로 블록 단위 복사 가능 발견, 문자 단위 선택 불가, 메일 하단 여전히 안 보임. 복붙 후 앞부분 잘라내는 방식으로 완료 |
| 073 | `mail_extract_cancellation_fee` | `D` | `blocked` | 메일 스크롤 불가로 cancellation fee 확인 불가, 태스크 진행 불가 |
| 074 | `mail_extract_hr_phone` | `D` | `fix_needed` | 직접 입력으로 완료. 블록 복붙 후 앞부분 편집 시도했으나 커서 위치 오프셋 + 줄 넘김 클릭 불가로 실용적이지 않음 (정답은 message body 안에 있어 블록 복사 우회 가능했음) |
| 075 | `mail_extract_draft_recipient` | `D` | `fix_needed` | 블록 복사 후 앞부분 제거 방식으로 완료. 폴더 선택 시 실제 목표보다 아래를 클릭해야 선택되는 클릭 오프셋 문제 있음 |
| 076 | `mail_extract_promo_code` | `D` | `fix_needed` | 블록 복사 후 불필요한 텍스트 제거 방식으로 완료. 백스페이스 연타 후 지연 입력이 다음 작업에 영향, 새로고침으로 해소 |
| 077 | `mail_extract_deadline` | `D` | `fix_needed` | 블록 복사 후 불필요한 텍스트 제거 방식으로 완료. 백스페이스 연타 후 지연 입력이 다음 작업에 영향, 새로고침으로 해소 |
| 078 | `mail_extract_rebooked_flight` | `D` | `fix_needed` | 블록 복사 후 불필요한 텍스트 제거 방식으로 완료. 백스페이스 연타 후 지연 입력이 다음 작업에 영향, 새로고침으로 해소 |
| 079 | `mail_extract_unsubscribe_link` | `D` | `blocked` | 메일 스크롤 불가로 하단 링크 확인 불가, 태스크 진행 불가 |
| 080 | `terminal_list_directory_contents` | `D` | `fix_needed` | 성공. instruction에 파일명을 줄바꿈으로 구분해야 한다는 설명 누락, 공백 구분으로 입력 시 실패 |
| 081 | `team3_terminal_record_working_directory` | `E` | `fix_needed` | `pwd` 기능은 정상이고 txt 저장도 가능했다. 다만 리다이렉션 기능이 없고, 명령을 여러 번 입력하면 터미널이 멈추며 스크롤도 되지 않았다. `ctrl+C`, `ctrl+v`를 쓰면 텍스트 커서 위치가 이상함 |
| 082 | `terminal_cat_and_save_config` | `E` | `fix_needed` | `cat`, `ls` 기능은 정상이고 txt 저장도 가능했다. 다만 리다이렉션 기능이 없고, 명령을 여러 번 입력하면 터미널이 멈추며 스크롤도 되지 않았다. `ctrl+C`, `ctrl+v`를 쓰면 텍스트 커서 위치가 이상함 |
| 083 | `terminal_cat_env_password` | `E` | `fix_needed` | `cat`, `ls` 기능은 정상이고 txt 저장도 가능했다. 다만 리다이렉션 기능이 없고, 명령을 여러 번 입력하면 터미널이 멈추며 스크롤도 되지 않았다. `ctrl+C`, `ctrl+v`를 쓰면 텍스트 커서 위치가 이상함 |
| 084 | `terminal_cat_log_error_code` | `E` | `fix_needed` | `cat`, `ls` 기능은 정상이고 txt 저장도 가능했다. 다만 리다이렉션 기능이 없고, 명령을 여러 번 입력하면 터미널이 멈추며 스크롤도 되지 않았다. `ctrl+C`, `ctrl+v`를 쓰면 텍스트 커서 위치가 이상함 |
| 085 | `terminal_list_log_directory` | `E` | `fix_needed` | `cat`, `ls` 기능은 정상이고 txt 저장도 가능했다. 다만 리다이렉션 기능이 없고, 명령을 여러 번 입력하면 터미널이 멈추며 스크롤도 되지 않았다. `ctrl+C`, `ctrl+v`를 쓰면 텍스트 커서 위치가 이상함 |
| 086 | `terminal_cat_csv_email` | `E` | `fix_needed` | `cat`, `ls` 기능은 정상이고 txt 저장도 가능했다. 다만 리다이렉션 기능이 없고, 명령을 여러 번 입력하면 터미널이 멈추며 스크롤도 되지 않았다. 터미널 영역 드래그 선택이 되지 않아 필요한 부분만 복사해 붙여넣을 수 없었다. |
| 087 | `terminal_record_deep_pwd` | `E` | `drop` | 중복되는 task 제거 필요 81과 동일 |
| 088 | `terminal_cat_hidden_credentials` | `E` | `fix_needed` | `ls` 실행 시 `.**` 파일들도 구분 없이 그대로 출력됐다. |
| 089 | `terminal_list_hidden_files` | `E` | `fix_needed` | `ls` 실행 시 `.**` 파일들도 구분 없이 그대로 출력됐다. |
| 090 | `terminal_cat_json_nested` | `E` | `fix_needed` | 공통 기능상 문제와 동일 |
| 091 | `terminal_cat_python_import` | `E` | `fix_needed` | 공통 기능상 문제와 동일, 일부분 복사 불가 |
| 092 | `terminal_find_specific_extension` | `E` | `fix_needed` | 공통 기능상 문제와 동일, ls *.pdf 기능 x |
| 093 | `terminal_cat_csv_specific_value` | `E` | `fix_needed` | 공통 기능상 문제와 동일, 일부분 복사 불가 |
| 094 | `terminal_cat_gitignore` | `E` | `fix_needed` | 공통 기능상 문제와 동일 |
| 095 | `terminal_find_backup_file` | `E` | `fix_needed` | 공통 기능상 문제와 동일, * 사용 불가능 |
| 096 | `terminal_cat_package_json_version` | `E` | `fix_needed` | 공통 기능상 문제와 동일, 일부분 복사 불가 |
| 097 | `terminal_find_shell_script` | `E` | `fix_needed` | 공통 기능상 문제와 동일, ls *.sh 기능 x |
| 098 | `terminal_cat_process_list` | `E` | `fix_needed` | 공통 기능상 문제와 동일, 일부분 복사 불가 |
| 099 | `terminal_cat_yaml_config` | `E` | `fix_needed` | 공통 기능상 문제와 동일, 일부분 복사 불가 |
| 100 | `terminal_cat_cert_expiry` | `E` | `fix_needed` | 공통 기능상 문제와 동일, 일부분 복사 불가 |
