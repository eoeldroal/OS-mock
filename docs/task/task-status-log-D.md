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
| `pass_with_notes` | 0 |
| `fail` | 0 |
| `blocked` | 0 |
| `needs_recheck` | 0 |
| `not_started` | 20 |

## Per-Task Log

기록 규칙:

- `Observed Result`: 실제로 한 일과 나온 결과를 짧게 적기
- `Issue Type`: `none`, `ux`, `instruction`, `focus`, `window`, `browser`, `mail`, `terminal`, `save`, `evaluator`, `other`
- `Next Action`: `none`, `recheck`, `bugfix`, `clarify_instruction`, `ask_review`

| No. | Task ID | Seed | Status | Observed Result | Issue Type | Next Action |
| --- | --- | --- | --- | --- | --- | --- |
| 061 | `mail_extract_invoice_amount` | `0` | `not_started` |  | `none` | `none` |
| 062 | `mail_record_sender_address` | `0` | `not_started` |  | `none` | `none` |
| 063 | `mail_extract_reset_link` | `0` | `not_started` |  | `none` | `none` |
| 064 | `mail_extract_meeting_time` | `0` | `not_started` |  | `none` | `none` |
| 065 | `mail_extract_tracking_info` | `0` | `not_started` |  | `none` | `none` |
| 066 | `mail_extract_spam_sender` | `0` | `not_started` |  | `none` | `none` |
| 067 | `mail_extract_2fa_code` | `0` | `not_started` |  | `none` | `none` |
| 068 | `mail_extract_trash_link` | `0` | `not_started` |  | `none` | `none` |
| 069 | `mail_extract_messy_receipt_total` | `0` | `not_started` |  | `none` | `none` |
| 070 | `mail_extract_flight_pnr` | `0` | `not_started` |  | `none` | `none` |
| 071 | `mail_extract_exception_name` | `0` | `not_started` |  | `none` | `none` |
| 072 | `mail_extract_ssh_ip` | `0` | `not_started` |  | `none` | `none` |
| 073 | `mail_extract_cancellation_fee` | `0` | `not_started` |  | `none` | `none` |
| 074 | `mail_extract_hr_phone` | `0` | `not_started` |  | `none` | `none` |
| 075 | `mail_extract_draft_recipient` | `0` | `not_started` |  | `none` | `none` |
| 076 | `mail_extract_promo_code` | `0` | `not_started` |  | `none` | `none` |
| 077 | `mail_extract_deadline` | `0` | `not_started` |  | `none` | `none` |
| 078 | `mail_extract_rebooked_flight` | `0` | `not_started` |  | `none` | `none` |
| 079 | `mail_extract_unsubscribe_link` | `0` | `not_started` |  | `none` | `none` |
| 080 | `terminal_list_directory_contents` | `0` | `not_started` |  | `none` | `none` |

## Freeform Notes

### Repeated Failure Patterns

- 

### Ambiguous Instructions

- 

### Viewer or Runtime Oddities

- 
