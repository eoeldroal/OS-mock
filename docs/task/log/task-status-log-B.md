# Task Assignment 5x20 B Log Template

이 문서는 `docs/task/task-assignment-5x40-legacy.md`의 B 파트(`021`-`040`)를 직접 수동 실행하면서 결과를 기록하기 위한 로그 템플릿이다.

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
  --task rename_among_two \
  --seed 0 \
  --open \
  --debug
```

태스크 바꿔서 실행하는 예시:

```bash
OS_MOCK_PORT=4315 npm run interactive:mcp-client -- \
  --task rename_among_three \
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
| `pass` | 현재 환경 기준에서 Task가 정상적으로 성립하며, 시각 구성/상호작용/instruction/evaluator 모두 큰 문제 없이 유지 가능 |
| `fix_needed` | Task 자체는 유지할 가치가 있지만 시각, interaction, instruction, evaluator, maxSteps, setup 중 일부 수정 필요 |
| `blocked` | 현재 앱 지원 범위나 환경 제약 때문에 선행 작업 없이 핵심 workflow를 재현하거나 복구하기 어려움 |
| `drop` | 중복되거나 유지 가치가 낮아 현재 카탈로그에서 정리 대상 |

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
| Notes | 기존 Observed Result와 Freeform Notes를 1차 근거로 사용해 새 taxonomy로 재분류함. |

## Summary

| Bucket | Count |
| --- | --- |
| `pass` | 20 |
| `fix_needed` | 0 |
| `blocked` | 0 |
| `drop` | 0 |

## Per-Task Log

기록 규칙:

- `Observed Result`: 실제로 한 일과 나온 결과를 짧게 적기
- `Issue Type`: `none`, `ux`, `instruction`, `focus`, `window`, `browser`, `mail`, `terminal`, `save`, `evaluator`, `other`
- `Next Action`: `none`, `recheck`, `bugfix`, `clarify_instruction`, `ask_review`

| No. | Task ID | Seed | Status | Observed Result | Issue Type | Next Action |
| --- | --- | --- | --- | --- | --- | --- |
| 021 | `rename_among_two` | `0` | `pass` |  | `none` | `none` |
| 022 | `rename_among_three` | `0` | `pass` |  | `none` | `none` |
| 023 | `rename_among_four` | `0` | `pass` |  | `none` | `none` |
| 024 | `popup_then_open` | `0` | `pass` |  | `none` | `none` |
| 025 | `popup_then_rename` | `0` | `pass` |  | `none` | `none` |
| 026 | `restore_and_save` | `0` | `pass` |  | `none` | `none` |
| 027 | `restore_specific_of_two` | `0` | `pass` |  | `none` | `none` |
| 028 | `restore_from_all_minimized` | `0` | `pass` |  | `none` | `none` |
| 029 | `open_and_append` | `0` | `pass` |  | `none` | `none` |
| 030 | `popup_then_restore` | `0` | `pass` |  | `none` | `none` |
| 031 | `dock_launch_then_open` | `0` | `pass` |  | `none` | `none` |
| 032 | `dock_launch_then_rename` | `0` | `pass` |  | `none` | `none` |
| 033 | `restore_explorer_then_rename` | `0` | `pass` |  | `none` | `none` |
| 034 | `switch_between_notes` | `0` | `pass` |  | `none` | `none` |
| 035 | `open_from_unfocused_explorer` | `0` | `pass` |  | `none` | `none` |
| 036 | `open_append_save` | `0` | `pass` |  | `none` | `none` |
| 037 | `open_append_save_among_three` | `0` | `pass` |  | `none` | `none` |
| 038 | `open_append_save_among_four` | `0` | `pass` |  | `none` | `none` |
| 039 | `rename_then_open` | `0` | `pass` |  | `none` | `none` |
| 040 | `popup_then_open_append_save` | `0` | `pass` |  | `none` | `none` |


## Freeform Notes

### Repeated Failure Patterns

- 

### Ambiguous Instructions

- 

### Viewer or Runtime Oddities

- 드래그 동작 입력시 드래그가 안 멈추는 오류 발생

- 
