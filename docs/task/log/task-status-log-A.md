# Task Assignment 5x20 A Log Template

이 문서는 `docs/task/task-assignment-5x40-legacy.md`의 A 파트(`001`-`020`)를 직접 수동 실행하면서 결과를 기록하기 위한 로그 템플릿이다.

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
  --task dismiss_popup_then_append_note \
  --seed 0 \
  --open \
  --debug
```

태스크 바꿔서 실행하는 예시:

```bash
OS_MOCK_PORT=4315 npm run interactive:mcp-client -- \
  --task rename_note_in_explorer \
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
| Date | `2026-04-17` |
| Runner |  |
| Branch |  |
| Commit |  |
| Default Seed | `0` |
| Port | `4315` |
| Notes | 기존 Observed Result와 Freeform Notes를 1차 근거로 사용해 새 taxonomy로 재분류함. |

## Summary

| Bucket | Count |
| --- | --- |
| `pass` | 9 |
| `fix_needed` | 7 |
| `blocked` | 0 |
| `drop` | 4 |

## Per-Task Log

기록 규칙:

- `Observed Result`: 실제로 한 일과 나온 결과를 짧게 적기
- `Issue Type`: `none`, `ux`, `instruction`, `focus`, `window`, `browser`, `mail`, `terminal`, `save`, `evaluator`, `other`
- `Next Action`: `none`, `recheck`, `bugfix`, `clarify_instruction`, `ask_review`

| No. | Task ID | Seed | Status | Observed Result | Issue Type | Next Action |
| --- | --- | --- | --- | --- | --- | --- |
| 001 | `dismiss_popup_then_append_note` | `0` | `fix_needed` | 메모장에 입력 커서 위치가 보이지 않았다. 글자를 써야만 현재 입력 위치를 확인할 수 있었지만 작업 자체는 진행 가능했다. | `ux` | `bugfix` |
| 002 | `rename_note_in_explorer` | `0` | `pass` | 이상 없음 | `none` | `none` |
| 003 | `copy_line_between_windows` | `0` | `fix_needed` | 더블클릭해도 텍스트 블록 선택이 되지 않았다. | `focus` | `bugfix` |
| 004 | `minimize_recover_and_save` | `0` | `pass` | 이상 없음 | `none` | `none` |
| 005 | `browser_open_briefing_heading_to_note` | `0` | `pass` | 이상 없음 | `none` | `none` |
| 006 | `browser_catalog_owner_to_note` | `0` | `fix_needed` | `catalog.local`에서 빈 입력칸을 한 번 클릭해서는 박스 선택이 되지 않았고, 더블클릭해야 텍스트 입력이 가능했다. 더블클릭 이후에는 action마다 화면이 깜빡거렸다. | `browser` | `bugfix` |
| 007 | `mail_extract_mock_note` | `0` | `fix_needed` | 왼쪽 창이 너무 좁아 파일명과 메일명이 끝까지 보이지 않았고, 메일 원문 텍스트 블록 선택이 되지 않아 `ctrl+c`, `ctrl+v` 흐름이 불편했다. | `mail` | `bugfix` |
| 008 | `terminal_record_working_directory` | `0` | `pass` | 이상 없음 | `none` | `none` |
| 009 | `browser_intake_confirmation_to_note` | `0` | `fix_needed` | 6번과 동일하게 입력칸이 한 번 클릭으로는 활성화되지 않았고, 더블클릭해야 입력 가능했다. 입력 과정에서 action마다 화면이 깜빡거렸다. | `browser` | `bugfix` |
| 010 | `browser_catalog_audit_append_save` | `0` | `fix_needed` | 6번과 동일한 문제였다. 입력칸 포커스를 위해 더블클릭이 필요했고, 상호작용마다 화면이 깜빡거렸다. | `browser` | `bugfix` |
| 011 | `popup_dismiss` | `0` | `drop` | 이미 다른 task에 포함된 과제로 판단되어 별도 유지 필요가 낮다. | `other` | `none` |
| 012 | `open_single_file` | `0` | `drop` | 이미 다른 task에 포함된 과제로 판단되어 별도 유지 필요가 낮다. | `other` | `none` |
| 013 | `restore_minimized_note` | `0` | `pass` | 이상 없음 | `none` | `none` |
| 014 | `refocus_background_note` | `0` | `fix_needed` | 텍스트 편집기가 파일 매니저 뒤에 있지 않아 task setup이 기대한 창 배치와 달랐다. 복원/재포커스 태스크의 의미가 흐려졌다. | `window` | `bugfix` |
| 015 | `save_dirty_note` | `0` | `pass` | 이상 없음 | `none` | `none` |
| 016 | `open_among_two` | `0` | `pass` | 이상 없음 | `none` | `none` |
| 017 | `open_among_three` | `0` | `pass` | 이상 없음 | `none` | `none` |
| 018 | `open_among_four` | `0` | `pass` | 이상 없음 | `none` | `none` |
| 019 | `rename_preselected` | `0` | `drop` | 이미 다른 task에 포함된 과제로 판단되어 별도 유지 필요가 낮다. + 기존 이름 삭제하려고 delete 누르는 도중 time limit에 걸려 task가 중단되었다. | `other` | `none` |
| 020 | `rename_single` | `0` | `drop` | 이미 다른 task에 포함된 과제로 판단되어 별도 유지 필요가 낮다. + 기존 이름 삭제하려고 delete 누르는 도중 time limit에 걸려 task가 중단되었다.| `other` | `none` |

## Freeform Notes

### Repeated Failure Patterns

- 브라우저 task에서 입력칸이 한 번 클릭으로 활성화되지 않아 더블클릭이 필요한 경우가 반복됐다.
- 브라우저 입력 이후 action마다 화면이 깜빡거리는 현상이 반복됐다.
- 텍스트 선택 계열 상호작용이 불안정했다. 더블클릭 단어 선택과 메일 본문 블록 선택이 기대대로 동작하지 않았다.
- 입력 피드백이 부족했다. 메모장 caret이 보이지 않아 현재 입력 위치를 바로 파악하기 어려웠다.
- 일부 task는 이름 변경 도중 step limit로 종료돼 원인 분리를 위한 재현이 더 필요하다.

### Ambiguous Instructions

- `refocus_background_note`는 텍스트 편집기가 실제로 파일 매니저 뒤에 있지 않아 task 의도와 초기 상태가 어긋난 것으로 보였다.
- 011, 012, 019, 020은 이미 다른 task에 포함된 과제로 판단되어 중복 정리 대상이다.

### Viewer or Runtime Oddities

- 파일/메일 목록의 좌측 패널 폭이 좁아 항목명이 끝까지 보이지 않았다.
- 메모장 caret이 보이지 않아 현재 입력 위치를 시각적으로 확인하기 어려웠다.
- 더블클릭 선택 불가와 메일 본문 블록 선택 불가처럼 일부 입력 상호작용이 불안정했다.
