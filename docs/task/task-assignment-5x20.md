# Task Assignment 5x20

이 문서는 레거시 파일명(`task-assignment-5x40-legacy.md`)을 유지한 채,
현재 코드베이스의 실제 task catalog에 맞게 갱신한 배정표이다.

기준:

- `packages/core/src/tasks/registry.ts`의 `ALL_TASKS` 순서
- 현재 총 task 수: `100`
- 현재 split 구성: `starter 50`, `representative 50`
- 형식: `번호 | task_id | 간략 한국어 수동 테스트 설명`
- 아래 설명은 사람이 직접 조작해볼 때의 요약이며, 최종 정답 문자열은 실제 task instruction과 화면 상태를 따른다.

배정:

- A: `1-20`
- B: `21-40`
- C: `41-60`
- D: `61-80`
- E: `81-100`

```text
001 | dismiss_popup_then_append_note | 팝업을 닫고 `todo.txt`를 열어 지시된 줄을 추가한 뒤 저장.
002 | rename_note_in_explorer | 파일 탐색기에서 `draft.txt`를 `final.txt`로 이름 변경.
003 | copy_line_between_windows | `source.txt` 첫 줄을 `target.txt` 끝에 붙여 넣고 저장.
004 | minimize_recover_and_save | 숨겨진 메모 창을 다시 띄우고 변경 내용을 저장.
005 | browser_open_briefing_heading_to_note | Firefox에서 `briefing.local`을 열고 제목을 `briefing-log.txt`에 적어 저장.
006 | browser_catalog_owner_to_note | Firefox `catalog.local`에서 `kernel backlog`의 owner code를 찾아 `owner-log.txt`에 저장.
007 | mail_extract_mock_note | Thunderbird에서 `Loading dock reminder` 메일 문장을 추출해 `mail-log.txt`에 저장.
008 | terminal_record_working_directory | Terminal에서 `pwd` 결과를 `terminal-log.txt`에 기록하고 저장.
009 | browser_intake_confirmation_to_note | Firefox `intake.local` 폼을 제출한 뒤 확인 코드를 `intake-log.txt`에 저장.
010 | browser_catalog_audit_append_save | Firefox `catalog.local`에서 `mail audit`의 owner/status를 `audit-note.txt`에 덧붙여 저장.
011 | popup_dismiss | 화면을 가리는 팝업만 닫기.
012 | open_single_file | 파일 탐색기에서 대상 파일 하나를 열기.
013 | restore_minimized_note | 최소화된 편집기 창을 다시 복원하기.
014 | refocus_background_note | 뒤에 가려진 텍스트 편집기 창으로 다시 포커스 이동.
015 | save_dirty_note | 수정되어 더티 상태인 편집기 내용을 저장.
016 | open_among_two | 두 파일 중 정답 파일을 골라 열기.
017 | open_among_three | 세 파일 중 정답 파일을 골라 열기.
018 | open_among_four | 네 파일 중 정답 파일을 골라 열기.
019 | rename_preselected | 이미 선택된 파일의 이름만 바꾸기.
020 | rename_single | 파일 하나를 선택한 뒤 이름 변경.
021 | rename_among_two | 두 파일 중 정답 파일의 이름 변경.
022 | rename_among_three | 세 파일 중 정답 파일의 이름 변경.
023 | rename_among_four | 네 파일 중 정답 파일의 이름 변경.
024 | popup_then_open | 팝업을 닫고 나서 파일 열기.
025 | popup_then_rename | 팝업을 닫고 나서 파일 이름 변경.
026 | restore_and_save | 숨겨진 편집기를 복원하고 저장.
027 | restore_specific_of_two | 최소화된 두 편집기 중 정답 창만 복원.
028 | restore_from_all_minimized | 모두 최소화된 상태에서 정답 편집기 창을 찾아 복원.
029 | open_and_append | 파일을 열고 지시된 텍스트를 덧붙이기.
030 | popup_then_restore | 팝업을 닫고 최소화된 편집기 복원.
031 | dock_launch_then_open | 독에서 파일 탐색기를 실행한 뒤 파일 열기.
032 | dock_launch_then_rename | 독에서 파일 탐색기를 실행한 뒤 파일 이름 변경.
033 | restore_explorer_then_rename | 최소화된 파일 탐색기를 복원한 뒤 파일 이름 변경.
034 | switch_between_notes | 여러 편집기 중 정답 편집기 창으로 전환.
035 | open_from_unfocused_explorer | 뒤에 있는 파일 탐색기로 전환해 대상 파일 열기.
036 | open_append_save | 파일을 열고 텍스트를 추가한 뒤 저장.
037 | open_append_save_among_three | 세 파일 중 정답 파일을 열어 내용 추가 후 저장.
038 | open_append_save_among_four | 네 파일 중 정답 파일을 열어 내용 추가 후 저장.
039 | rename_then_open | 파일 이름을 먼저 바꾸고 그 파일을 열기.
040 | popup_then_open_append_save | 팝업을 닫고 파일을 열어 내용 추가 후 저장.
041 | popup_then_restore_save | 팝업을 닫고 편집기를 복원한 뒤 저장.
042 | restore_append_save | 숨겨진 편집기를 복원해 내용 추가 후 저장.
043 | dock_launch_open_append_save | 독에서 탐색기를 실행해 파일을 열고 내용 추가 후 저장.
044 | all_minimized_restore_and_save | 모든 창이 최소화된 상태에서 편집기를 복원하고 저장.
045 | popup_then_dock_launch_open | 팝업을 닫고 독에서 탐색기를 실행해 파일 열기.
046 | copy_line_paste_save | 편집기 사이에서 한 줄을 복사해 붙여 넣고 저장.
047 | rename_then_open_among_three | 세 파일 중 정답 파일 이름을 바꾼 뒤 열기.
048 | popup_then_rename_among_three | 팝업을 닫고 세 파일 중 정답 파일 이름 변경.
049 | dock_launch_rename_among_three | 독에서 탐색기를 실행해 세 파일 중 정답 파일 이름 변경.
050 | restore_among_three_then_save | 최소화된 세 편집기 중 정답 창을 복원하고 저장.
051 | rename_open_append_save | 파일 이름 변경, 열기, 내용 추가, 저장까지 수행.
052 | popup_then_rename_open | 팝업을 닫고 파일 이름을 바꾼 뒤 열기.
053 | popup_then_copy_paste_save | 팝업을 닫고 편집기 사이 복사/붙여넣기 후 저장.
054 | popup_then_restore_append_save | 팝업을 닫고 편집기를 복원해 내용 추가 후 저장.
055 | dock_launch_rename_then_open | 독에서 탐색기를 실행해 파일 이름을 바꾸고 열기.
056 | all_minimized_restore_append_save | 모두 최소화된 상태에서 편집기를 복원해 내용 추가 후 저장.
057 | popup_dock_launch_open_append_save | 팝업을 닫고 독에서 탐색기를 실행해 파일을 열고 내용 추가 후 저장.
058 | popup_rename_open_append_save | 팝업을 닫고 파일 이름 변경, 열기, 내용 추가, 저장까지 수행.
059 | popup_all_minimized_restore_save | 팝업과 전체 최소화 상태를 처리한 뒤 편집기를 복원하고 저장.
060 | dock_launch_open_copy_paste_save | 독에서 탐색기를 실행해 두 파일을 열고 줄을 복사/붙여넣기 후 저장.
061 | mail_extract_invoice_amount | Thunderbird에서 인보이스 메일을 찾아 총 금액을 `invoice_summary.txt`에 저장.
062 | mail_record_sender_address | `Project Update` 메일 발신자 주소를 `contacts.txt`에 저장.
063 | mail_extract_reset_link | `Password Reset Request` 메일의 재설정 URL을 `reset_link.txt`에 저장.
064 | mail_extract_meeting_time | `Team Sync` 메일의 회의 시간을 `meeting_time.txt`에 저장.
065 | mail_extract_tracking_info | 배송 메일의 tracking number를 `tracking_info.txt`에 저장.
066 | mail_extract_spam_sender | `Spam` 폴더의 `Important Tax Document` 메일 발신자 주소를 `tax_sender.txt`에 저장.
067 | mail_extract_2fa_code | `Your 2FA Code` 메일의 6자리 코드를 `2fa.txt`에 저장.
068 | mail_extract_trash_link | `Trash` 폴더의 `Canceled: Sync` 메일에서 Zoom 링크를 찾아 `recovered_link.txt`에 저장.
069 | mail_extract_messy_receipt_total | `Your Receipt` 메일에서 최종 결제 금액만 골라 `receipt_total.txt`에 저장.
070 | mail_extract_flight_pnr | `Flight Confirmation` 메일의 6자리 PNR을 `flight_pnr.txt`에 저장.
071 | mail_extract_exception_name | `Production Crash Report` 메일의 예외 이름을 `bug_type.txt`에 저장.
072 | mail_extract_ssh_ip | `New Server Credentials` 메일의 IP 주소를 `server_ip.txt`에 저장.
073 | mail_extract_cancellation_fee | `Re: Refund Request` 메일에서 취소 수수료 금액만 `fee_amount.txt`에 저장.
074 | mail_extract_hr_phone | `hr@osmock.local` 메일의 연락처 번호를 `hr_phone.txt`에 저장.
075 | mail_extract_draft_recipient | `Drafts` 폴더의 `Q3 Report` 초안에서 수신자 주소를 `draft_target.txt`에 저장.
076 | mail_extract_promo_code | `Summer Sale` 메일의 할인 코드만 `promo_code.txt`에 저장.
077 | mail_extract_deadline | `Action Required` 메일의 정확한 마감일을 `deadline.txt`에 저장.
078 | mail_extract_rebooked_flight | `Flight Canceled` 메일의 새 항공편 번호를 `new_flight.txt`에 저장.
079 | mail_extract_unsubscribe_link | `Weekly Tech Digest` 메일 맨 아래의 수신 해지 URL을 `unsubscribe.txt`에 저장.
080 | terminal_list_directory_contents | Terminal에서 `ls` 결과 파일 목록을 `dir_contents.txt`에 저장.
081 | team3_terminal_record_working_directory | Terminal에서 현재 작업 경로를 출력해 `cwd_log.txt`에 저장.
082 | terminal_cat_and_save_config | Terminal에서 `server_config.json`을 읽고 port 값을 `port_backup.txt`에 저장.
083 | terminal_cat_env_password | Terminal에서 `.env`를 읽고 `DB_PASSWORD` 값을 `db_pass.txt`에 저장.
084 | terminal_cat_log_error_code | Terminal에서 `error.log`를 읽고 오류 코드를 `last_error.txt`에 저장.
085 | terminal_list_log_directory | Terminal에서 디렉터리 목록을 확인해 `log_files.txt`에 저장.
086 | terminal_cat_csv_email | Terminal에서 `users.csv`를 읽고 admin 이메일을 `admin_email.txt`에 저장.
087 | terminal_record_deep_pwd | Terminal에서 `pwd` 결과 절대경로를 `current_path.txt`에 저장.
088 | terminal_cat_hidden_credentials | Terminal에서 숨김 파일 `.credentials`를 읽고 API 키를 `secret_api_key.txt`에 저장.
089 | terminal_list_hidden_files | Terminal에서 숨김 파일까지 포함한 목록을 확인해 `hidden_files.txt`에 저장.
090 | terminal_cat_json_nested | Terminal에서 `config.json`의 `database.port` 값을 찾아 `db_port.txt`에 저장.
091 | terminal_cat_python_import | Terminal에서 `main.py`를 읽고 import된 모듈 이름을 `imported_module.txt`에 저장.
092 | terminal_find_specific_extension | Terminal에서 목록을 보고 PDF 파일 이름을 찾아 `target_file.txt`에 저장.
093 | terminal_cat_csv_specific_value | Terminal에서 `employees.csv`를 읽고 Alice의 ID를 `alice_id.txt`에 저장.
094 | terminal_cat_gitignore | Terminal에서 `.gitignore` 첫 번째 `node_` 디렉터리 항목을 `ignored_dir.txt`에 저장.
095 | terminal_find_backup_file | Terminal에서 `backup_`로 시작하는 파일명을 찾아 `latest_backup.txt`에 저장.
096 | terminal_cat_package_json_version | Terminal에서 `package.json`을 읽고 React 버전을 `react_version.txt`에 저장.
097 | terminal_find_shell_script | Terminal에서 `.sh` 파일 이름을 찾아 `script_name.txt`에 저장.
098 | terminal_cat_process_list | Terminal에서 `processes.txt`를 읽고 nginx PID를 `nginx_pid.txt`에 저장.
099 | terminal_cat_yaml_config | Terminal에서 `database.yml`의 production 사용자명을 `prod_db_user.txt`에 저장.
100 | terminal_cat_cert_expiry | Terminal에서 `cert_info.txt`의 `Valid Until` 날짜를 `cert_expiry.txt`에 저장.
```
