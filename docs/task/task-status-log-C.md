# Task Assignment 5x20 C Log Template

이 문서는 `docs/task/task-assignment-5x40-legacy.md`의 C 파트(`041`-`060`)를 직접 수동 실행하면서 결과를 기록하기 위한 로그 템플릿이다.

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
  --task popup_then_restore_save \
  --seed 0 \
  --open \
  --debug
```

태스크 바꿔서 실행하는 예시:

```bash
OS_MOCK_PORT=4315 npm run interactive:mcp-client -- \
  --task restore_append_save \
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
| `pass` | 19 |
| `pass_with_notes` | 0 |
| `fail` | 1 |
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
| 041 | `popup_then_restore_save` | `0` | `pass` | Popup dismissed, editor restored, and save completed successfully. | `none` | `none` |
| 042 | `restore_append_save` | `0` | `pass` | Hidden editor was restored, text was appended, and save completed successfully. | `none` | `none` |
| 043 | `dock_launch_open_append_save` | `0` | `pass` | Files app was launched from the dock, target file was opened, requested text was appended, and save completed successfully. | `none` | `none` |
| 044 | `all_minimized_restore_and_save` | `0` | `pass` | The correct editor was restored from the all-minimized state and the file was saved successfully. | `none` | `none` |
| 045 | `popup_then_dock_launch_open` | `0` | `pass` | Popup was dismissed, Files app was launched from the dock, and the target file was opened successfully. | `none` | `none` |
| 046 | `copy_line_paste_save` | `0` | `pass` | A line was copied between editors, pasted into the target note, and the file was saved successfully. | `none` | `none` |
| 047 | `rename_then_open_among_three` | `0` | `pass` | The correct file was renamed among three options and then opened successfully. | `none` | `none` |
| 048 | `popup_then_rename_among_three` | `0` | `pass` | The popup was dismissed and the correct file was renamed successfully among three options. | `none` | `none` |
| 049 | `dock_launch_rename_among_three` | `0` | `pass` | Files app was launched from the dock and the correct file was renamed successfully among three options. | `none` | `none` |
| 050 | `restore_among_three_then_save` | `0` | `fail` | Only two text files were present from the start, and clicking the alpha document from the dock opened delta instead. | `window` | `bugfix` |
| 051 | `rename_open_append_save` | `0` | `pass` | The file was renamed, opened, updated with the requested text, and saved successfully. | `none` | `none` |
| 052 | `popup_then_rename_open` | `0` | `pass` | The popup was dismissed, the file was renamed, and the renamed file was opened successfully. | `none` | `none` |
| 053 | `popup_then_copy_paste_save` | `0` | `pass` | The popup was dismissed, content was copied between editors, pasted into the target note, and saved successfully. | `none` | `none` |
| 054 | `popup_then_restore_append_save` | `0` | `pass` | The popup was dismissed, the editor was restored, text was appended, and the file was saved successfully. | `none` | `none` |
| 055 | `dock_launch_rename_then_open` | `0` | `pass` | Files app was launched from the dock, the correct file was renamed, and the renamed file was opened successfully. | `none` | `none` |
| 056 | `all_minimized_restore_append_save` | `0` | `pass` | The correct editor was restored from the all-minimized state, text was appended, and the file was saved successfully. | `none` | `none` |
| 057 | `popup_dock_launch_open_append_save` | `0` | `pass` | The popup was dismissed, Files app was launched from the dock, the target file was opened, text was appended, and the file was saved successfully. | `none` | `none` |
| 058 | `popup_rename_open_append_save` | `0` | `pass` | The popup was dismissed, the file was renamed, opened, updated with the requested text, and saved successfully. | `none` | `none` |
| 059 | `popup_all_minimized_restore_save` | `0` | `pass` | The popup and all-minimized state were handled, the correct editor was restored, and the file was saved successfully. | `none` | `none` |
| 060 | `dock_launch_open_copy_paste_save` | `0` | `pass` | Files app was launched from the dock, two files were opened, content was copied and pasted between them, and the target file was saved successfully. | `none` | `none` |

## Freeform Notes

### Repeated Failure Patterns

- 

### Ambiguous Instructions

- 

### Viewer or Runtime Oddities

- In `050 restore_among_three_then_save`, only two text files appeared even though the scenario implies three candidate editors, and clicking the alpha document from the dock opened delta instead.
