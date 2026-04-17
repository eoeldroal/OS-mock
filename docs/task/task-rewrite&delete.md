# OSWORLD-5 Task Follow-up Decision

이 문서는 `docs/task/task-status-audit.md`의 전수조사 결과를 바탕으로,
각 Task를 `유지`, `재작성`, `보류`, `폐기` 중 어디로 가져갈지 확정하고
필요한 후속 조치를 정리하기 위한 문서다.


## Strict Rules

### 허용 입력 상태
- `pass`
- `fix_needed`
- `blocked`
- `drop`

### 상태별 허용 최종 조치

| Audit Status | Final Action | 의미 | 필수 기입 항목 |
| --- | --- | --- | --- |
| `pass` | `keep` | 현재 상태로 유지 | 유지 근거 |
| `fix_needed` | `rewrite` | Task 목적은 유지하고 현재 환경에서 다시 성립하도록 복구 | 수정 범위, owner, 검증 기준 |
| `blocked` | `hold` | 즉시 재작성하지 않고 선행 작업 backlog로 분리 | blocker, 선행 작업, backlog 링크 |
| `drop` | `drop` | 카탈로그에서 폐기 | 폐기 이유, 대체/중복 관계 |

### 금지 사항
- 한 Task를 두 개 이상의 최종 목록에 동시에 넣지 않는다.
- `pass`를 임의로 `rewrite`나 `drop`으로 바꾸지 않는다.
- `fix_needed`를 이 문서 안에서 바로 `drop`으로 바꾸지 않는다.
- `blocked`를 선행 작업 없이 `재작성 완료`로 올리지 않는다.
- `drop`을 유지 목록에 남기지 않는다.

### 재분류 요청
전수조사 상태 자체가 잘못되었다고 판단되면 이 문서에서 조치를 바꾸지 말고 아래에 남긴다.

| No. | Task ID | 현재 Audit Status | 제안 상태 | 재분류 근거 | 담당자 | 처리 상태 |
| --- | --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  | `open` |

재분류 요청이 열린 Task는 최종 확정 목록에 넣지 않는다.


### 필터링 시트

아래 표는 모든 `fix_needed`, `blocked`, `drop` Task를 반드시 포함한다.
필요하면 `pass`도 샘플링 검토로 넣을 수 있다.

| No. | Task ID | Audit Status | Evidence Summary | Final Action | Required Follow-up | Issue/PR | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
|  |  | `fix_needed` |  | `rewrite` |  |  |  |
|  |  | `blocked` |  | `hold` |  |  |  |
|  |  | `drop` |  | `drop` |  |  |  |

`Final Action`에는 아래 값만 사용한다.

- `keep`
- `rewrite`
- `hold`
- `drop`

---

## 재작성 작업 카드

`fix_needed -> rewrite`로 확정된 Task마다 아래 카드를 1개씩 만든다.

```md
### [No.] `task_id`

- 현재 목적:
- 유지 이유:
- 전수조사 근거:
- 수정 범위:
  - `instruction`
  - `task setup`
  - `window / app composition`
  - `interaction flow`
  - `evaluator / reward`
  - `visual composition`
- 이번 이슈에서 실제로 손볼 항목:
- 이번 이슈에서 손대지 않을 항목:
- 완료 조건:
- 검증 방법:
- 담당자:
- 상태:
  - `todo` | `in_progress` | `done`
- 관련 PR / commit:
- 비고:
```

재작성 완료로 올릴 수 있는 조건:
- `상태 = done`
- 검증 완료
- PR 또는 commit 기록 존재

---

## blocked 정리 카드

`blocked -> hold` Task마다 아래 카드를 1개씩 만든다.

```md
### [No.] `task_id`

- blocker:
- 지금 막히는 이유:
- 필요한 앱/환경 선행 작업:
- 선행 작업 owner:
- backlog issue:
- unblock 조건:
- 비고:
```

---

## drop 정리 카드

`drop` Task마다 아래 카드를 1개씩 만든다.

```md
### [No.] `task_id`

- 폐기 이유:
  - `duplicate`
  - `low_value`
  - `out_of_direction`
  - `high_recovery_cost_low_explanatory_value`
- 중복/대체 Task:
- 카탈로그 반영 방식:
- 관련 이슈 또는 PR:
- 비고:
```

---

## Master Decision Table

모든 Task는 아래 표에 정확히 한 번만 들어가야 한다.

| No. | Task ID | Audit Status | Final Action | Owner | Current State | Follow-up Summary | Final List Bucket | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
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
| 080 | `terminal_list_directory_contents` | `fix_needed` | `rewrite` |  | `done` | `instruction 수정 필요 -> 파일 이름이 줄바꿈으로 처리되도록 instruction 구체화` | `재작성 완료 Task 목록` |  |
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
|  |  | `fix_needed` | `rewrite` |  | `todo` | 재작성 카드 작성 필요 | `미배치` |  |
|  |  | `blocked` | `hold` |  | `done` | backlog 연결 필요 | `보류 Task 목록` |  |
|  |  | `drop` | `drop` |  | `done` | 카탈로그 제거 | `폐기 Task 목록` |  |

### Final List Bucket 규칙
- `pass -> keep`이면 `유지 Task 목록`
- `fix_needed -> rewrite`인데 아직 미완료면 `미배치`
- `fix_needed -> rewrite`가 완료되고 검증까지 끝나면 `재작성 완료 Task 목록`
- `blocked -> hold`이면 `보류 Task 목록`
- `drop -> drop`이면 `폐기 Task 목록`

문서를 닫을 때 `미배치`는 남기지 않는다.

---

## 최종 산출물

### 유지 Task 목록

| No. | Task ID | 유지 근거 | 확인자 A | 확인자 B | 비고 |
| --- | --- | --- | --- | --- | --- |
| 051 | `rename_open_append_save` | 전수조사 `pass` |  |  |  |
| 052 | `popup_then_rename_open` | 전수조사 `pass` |  |  |  |
| 053 | `popup_then_copy_paste_save` | 전수조사 `pass` |  |  |  |
| 054 | `popup_then_restore_append_save` | 전수조사 `pass`  |  |  |  |
| 055 | `dock_launch_rename_then_open` | 전수조사 `pass`  |  |  |  |
| 056 | `all_minimized_restore_append_save` | 전수조사 `pass` |  |  |  |
| 057 | `popup_dock_launch_open_append_save` | 전수조사 `pass` |  |  |  |
| 058 | `popup_rename_open_append_save` | 전수조사 `pass` |  |  |  |
| 059 | `popup_all_minimized_restore_save` | 전수조사 `pass` |  |  |  |
| 060 | `dock_launch_open_copy_paste_save` | 전수조사 `pass` |  |  |  |

### 재작성 완료 Task 목록

| No. | Task ID | 수정 범위 | 검증 결과 | 담당자 | PR / Commit | 비고 |
| --- | --- | --- | --- | --- | --- | --- |
| 080 | `terminal_list_directory_contents` | `instruction` — 파일 이름 줄바꿈 구분 명시 |  |  |  |  |

### 보류 Task 목록

| No. | Task ID | blocker | 선행 작업 | backlog issue | 비고 |
| --- | --- | --- | --- | --- | --- |
| 069 | `mail_extract_messy_receipt_total` | 메일 뷰어 내 스크롤 기능 미구현 — 긴 본문 접근 불가 | 메일 앱 스크롤 기능 구현 |  |  |
| 073 | `mail_extract_cancellation_fee` | 메일 뷰어 내 스크롤 기능 미구현 — 긴 본문 접근 불가 | 메일 앱 스크롤 기능 구현 |  |  |
| 079 | `mail_extract_unsubscribe_link` | 메일 뷰어 내 스크롤 기능 미구현 — 긴 본문 접근 불가 | 메일 앱 스크롤 기능 구현 |  |  |

### 폐기 Task 목록

| No. | Task ID | 폐기 이유 | 중복/대체 Task | 반영 방식 | 비고 |
| --- | --- | --- | --- | --- | --- |
| 087 | `terminal_record_deep_pwd` | `duplicate` — 081과 목적·수행 방식 동일 | `team3_terminal_record_working_directory` (081) | 카탈로그에서 087 제거 |  |

---

## 종료 체크리스트

- [ ] `task-status-audit.md` 대상 Task가 모두 `Master Decision Table`에 들어갔다.
- [ ] 모든 `fix_needed` Task에 재작성 카드가 작성되었다.
- [ ] 모든 `blocked` Task에 blocker와 backlog 연결이 남았다.
- [ ] 모든 `drop` Task에 폐기 이유와 대체 관계가 남았다.
- [ ] `Final List Bucket = 미배치`가 없다.
- [ ] 최종 4개 목록에 모든 Task가 정확히 한 번씩만 들어갔다.
