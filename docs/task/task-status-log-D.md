# Task Assignment 5x20 D Log Template

이 문서는 `docs/task/task-assignment-5x40-legacy.md`의 D 파트(`061`-`080`)를 직접 수동 실행하면서 결과를 기록하기 위한 로그 템플릿이다.

## Run Setup

```bash
export PATH="/opt/homebrew/opt/node@20/bin:$PATH"
npm install
npx playwright install chromium
npm run build
```

기본 수동 실행 예시:

```bash
OS_MOCK_PORT=4315 npm run interactive:mcp-client -- \
  --task mail_extract_invoice_amount \
  --seed 0 \
  --open \
  --debug
```

태스크 바꿔서 실행하는 예시:

```bash
OS_MOCK_PORT=4315 npm run interactive:mcp-client -- \
  --task mail_record_sender_address \
  --seed 0 \
  --open \
  --debug
```

프롬프트 안에서 자주 쓰는 명령:

```text
help
observe
click <x> <y>
double <x> <y>
type <text>
press <key>
hotkey ctrl+s
done
```

## Status Taxonomy

아래 상태값 중 하나를 `Status`에 넣는다.

| Status | 의미 |
| --- | --- |
| `not_started` | 아직 시도 안 함 |
| `pass` | 기대한 경로로 정상 완료 |
| `pass_with_notes` | 완료는 됐지만 UX 이상, 헷갈림, 우회 필요 |
| `fail` | 정상 완료 못 함 |
| `blocked` | 환경 문제, 실행 문제, 재현 불가 등으로 판단 보류 |
| `needs_recheck` | 한 번 보긴 했지만 확신 부족, 다시 확인 필요 |

권장 관찰 포인트:

- instruction이 화면에 보이는 작업 경로와 맞는지
- 클릭, 포커스, 윈도우 전환이 자연스럽게 되는지
- distractor가 있어도 정답 경로가 분명한지
- 저장이 필요한 태스크에서 실제 저장 피드백이 명확한지
- evaluator 기준으로 `done` 시 성공/실패가 직관과 맞는지

## Session Meta

| Field | Value |
| --- | --- |
| Date |  |
| Runner |  |
| Branch |  |
| Commit |  |
| Default Seed | `0` |
| Port | `4315` |
| Notes |  |

## Summary

| Bucket | Count |
| --- | --- |
| `pass` | 0 |
| `pass_with_notes` | 17 |
| `fail` | 3 |
| `blocked` | 0 |
| `needs_recheck` | 0 |
| `not_started` | 0 |

## Per-Task Log

기록 규칙:

- `Observed Result`: 실제로 한 일과 나온 결과를 짧게 적기
- `Issue Type`: `none`, `ux`, `instruction`, `focus`, `window`, `browser`, `mail`, `terminal`, `save`, `evaluator`, `other`
- `Next Action`: `none`, `recheck`, `bugfix`, `clarify_instruction`, `ask_review`

| No. | Task ID | Seed | Status | Observed Result | Issue Type | Next Action |
| --- | --- | --- | --- | --- | --- | --- |
| 061 | `mail_extract_invoice_amount` | `0` | `pass_with_notes` | 블록 복사 우회 가능했으나 직접 입력으로 완료 | `ux` | `bugfix` |
| 062 | `mail_record_sender_address` | `0` | `pass_with_notes` | 정답(sender)이 헤더 영역에 위치해 스크롤 범위 밖, 선택·복사 불가, 직접 입력으로 완료 | `ux` | `bugfix` |
| 063 | `mail_extract_reset_link` | `0` | `pass_with_notes` | 메일 하단이 잘려 URL 끝부분 확인 불가(스크롤 안 됨), 정답 값 직접 입력 시 성공 | `mail` | `bugfix` |
| 064 | `mail_extract_meeting_time` | `0` | `pass_with_notes` | 블록 복사 우회 가능했으나 직접 입력으로 완료 | `ux` | `bugfix` |
| 065 | `mail_extract_tracking_info` | `0` | `pass_with_notes` | 블록 복사 우회 가능했으나 직접 입력으로 완료 | `ux` | `bugfix` |
| 066 | `mail_extract_spam_sender` | `0` | `pass_with_notes` | 폴더 클릭 오프셋으로 처음엔 선택 안 됐으나 재시도로 성공. 블록 복사 우회 가능했으나 직접 입력으로 완료 | `mail` | `bugfix` |
| 067 | `mail_extract_2fa_code` | `0` | `pass_with_notes` | 블록 복사 우회 가능했으나 직접 입력으로 완료 | `ux` | `bugfix` |
| 068 | `mail_extract_trash_link` | `0` | `pass_with_notes` | Trash folder 클릭 불안정(반복 클릭 후 간신히 선택됨), 복사 불가, 직접 입력으로 완료. 066과 동일 계열 버그로 추정 | `mail` | `bugfix` |
| 069 | `mail_extract_messy_receipt_total` | `0` | `fail` | 메일 스크롤 불가로 하단 내용 확인 불가, 태스크 진행 불가 | `mail` | `bugfix` |
| 070 | `mail_extract_flight_pnr` | `0` | `pass_with_notes` | 블록 복사 우회 가능했으나 직접 입력으로 완료 | `ux` | `bugfix` |
| 071 | `mail_extract_exception_name` | `0` | `pass_with_notes` | 블록 복사 우회 가능했으나 직접 입력으로 완료 | `ux` | `bugfix` |
| 072 | `mail_extract_ssh_ip` | `0` | `pass_with_notes` | 스크롤로 블록 단위 복사 가능 발견, 문자 단위 선택 불가, 메일 하단 여전히 안 보임. 복붙 후 앞부분 잘라내는 방식으로 완료 | `ux` | `bugfix` |
| 073 | `mail_extract_cancellation_fee` | `0` | `fail` | 메일 스크롤 불가로 cancellation fee 확인 불가, 태스크 진행 불가 | `mail` | `bugfix` |
| 074 | `mail_extract_hr_phone` | `0` | `pass_with_notes` | 직접 입력으로 완료. 블록 복붙 후 앞부분 편집 시도했으나 커서 위치 오프셋 + 줄 넘김 클릭 불가로 실용적이지 않음 (정답은 message body 안에 있어 블록 복사 우회 가능했음) | `ux` | `bugfix` |
| 075 | `mail_extract_draft_recipient` | `0` | `pass_with_notes` | 블록 복사 후 앞부분 제거 방식으로 완료. 폴더 선택 시 실제 목표보다 아래를 클릭해야 선택되는 클릭 오프셋 문제 있음 | `ux` | `bugfix` |
| 076 | `mail_extract_promo_code` | `0` | `pass_with_notes` | 블록 복사 후 불필요한 텍스트 제거 방식으로 완료. 백스페이스 연타 후 지연 입력이 다음 작업에 영향, 새로고침으로 해소 | `ux` | `bugfix` |
| 077 | `mail_extract_deadline` | `0` | `pass_with_notes` | 블록 복사 후 불필요한 텍스트 제거 방식으로 완료. 백스페이스 연타 후 지연 입력이 다음 작업에 영향, 새로고침으로 해소 | `ux` | `bugfix` |
| 078 | `mail_extract_rebooked_flight` | `0` | `pass_with_notes` | 블록 복사 후 불필요한 텍스트 제거 방식으로 완료. 백스페이스 연타 후 지연 입력이 다음 작업에 영향, 새로고침으로 해소 | `ux` | `bugfix` |
| 079 | `mail_extract_unsubscribe_link` | `0` | `fail` | 메일 스크롤 불가로 하단 링크 확인 불가, 태스크 진행 불가 | `mail` | `bugfix` |
| 080 | `terminal_list_directory_contents` | `0` | `pass_with_notes` | 성공. instruction에 파일명을 줄바꿈으로 구분해야 한다는 설명 누락, 공백 구분으로 입력 시 실패 | `instruction` | `clarify_instruction` |

## Freeform Notes

### [메일 뷰어] message body 블록 복사 가능, 헤더 영역은 불가

072에서 발견: message body 영역은 스크롤 후 클릭하면 블록(라인) 단위 복사 가능. 단, 문자 단위 선택은 불가. sender·subject 등 헤더 영역은 스크롤 범위에 포함되지 않아 선택 자체가 불가능.

- **헤더 영역에만 정답이 있는 태스크** (062): 블록 복사 우회 불가, 직접 입력만 가능
- **body 안에 정답이 있었으나 방법 미발견 상태에서 직접 입력한 태스크** (061, 064, 065, 066, 067, 068, 070, 071, 074): 072 이전에 진행했기 때문에 블록 복사 방법을 몰랐음. 블록 복사로 우회 가능했던 케이스들임.
- 헤더 영역이 복사가 안 되는 것 자체는 여전히 버그. 062처럼 body에 값이 없는 태스크는 구조적으로 복사 우회가 불가능함.

### [메일 뷰어] 긴 본문 스크롤 불가 / 하단 내용 잘림

영향 태스크: 063(`pass_with_notes`), 069(`fail`), 073(`fail`), 079(`fail`)

메일 본문이 길 경우 뷰어 하단이 잘리고 스크롤이 되지 않음. 정답이 하단에 있는 경우 화면에서 확인 자체가 불가능해 직접 입력 우회도 막힘. 063은 정답 형식을 추론해 직접 입력하여 우회 성공, 나머지 3건은 실패.

### [메일 뷰어] 폴더 클릭 수직 오프셋

영향 태스크: 066, 068, 075

Inbox 외 폴더(Spam, Trash, Drafts)를 클릭할 때 실제 목표보다 아래를 클릭해야 선택됨. 수직 클릭 오프셋 버그로 추정. 066은 재시도로 성공, 068은 반복 클릭으로 간신히 성공, 075도 성공. 오프셋을 인지하고 의도적으로 아래를 누르면 우회 가능.

### [텍스트 편집기] 커서 이동 불가 및 클릭 오프셋

영향 태스크: 072, 074, 075, 076, 077, 078

- 키보드 좌우 방향키로 커서 이동 불가, 클릭으로만 이동 가능
- 클릭 시 실제 위치보다 왼쪽에 커서가 찍히는 수평 오프셋 버그
- 텍스트가 한 줄을 넘길 경우 다음 줄 끝 너머(파일 영역 밖)를 클릭해야 하는데 이게 불가능해 줄 끝 편집이 막힘
- 결과적으로 블록 복붙 후 앞부분 제거는 가능하지만 뒷부분 제거는 어려움

### [텍스트 편집기] 백스페이스 연타 후 입력 지연 잔류

영향 태스크: 076, 077, 078

백스페이스를 길게 누르면 지연된 키 입력이 이후 작업에도 계속 영향을 미침(다음 화면에서 의도치 않은 삭제 발생). 새로고침으로 해소 가능. 텍스트 편집 후 다음 태스크로 넘어가기 전 새로고침 권장.

### [텍스트 편집기] 자동 줄바꿈 없음

영향 태스크: 074 (이후 태스크 전반에서 관찰)

긴 텍스트가 txt 파일에서 자동 줄바꿈 없이 한 줄로 표시되며 뒷부분이 잘려 보임. 실제 저장 내용에는 영향 없을 수 있으나, 저장된 값 확인을 어렵게 만드는 요인.

### Ambiguous Instructions

- **080 `terminal_list_directory_contents`**: instruction에 파일명을 줄바꿈으로 구분해서 저장해야 한다는 설명이 없음. 공백 구분으로 입력하면 evaluator에서 실패 처리됨. `ls` 출력 형식과 저장 형식이 다를 수 있음을 명시 필요.
