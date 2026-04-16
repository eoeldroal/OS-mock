# Task Assignment 5x40 A Log Template

이 문서는 `docs/task-assignment-5x40.md`의 A 파트(`001`-`040`)를 직접 수동 실행하면서 결과를 기록하기 위한 로그 템플릿이다.

## Run Setup

```bash
export PATH="/opt/homebrew/opt/node@20/bin:$PATH"
npm install
npx playwright install chromium/
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
  --task browser_help_dock_line_to_note \
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
- 클릭/포커스/윈도우 전환이 자연스럽게 되는지
- distractor가 있어도 정답 경로가 분명한지
- 저장이 필요한 태스크에서 실제 저장 피드백이 명확한지
- 브라우저 help/bookmark/task 카드의 텍스트 추출 대상이 모호하지 않은지
- evaluator 기준으로 `done` 시 성공/실패가 직관과 맞는지

## Session Meta

| Field | Value |
| --- | --- |
| Date | `2026-04-15` |
| Runner |  |
| Branch |  |
| Commit |  |
| Default Seed | `0` |
| Port | `4315` |
| Notes | 사용자 수동 점검 메모 반영. 이미지 첨부는 문서에 옮기지 않음. |

## Summary

| Bucket | Count |
| --- | --- |
| `pass` | `5` |
| `pass_with_notes` | `6` |
| `fail` | `2` |
| `blocked` |  |
| `needs_recheck` | `0` |
| `not_started` | `27` |

## Per-Task Log

기록 규칙:

- `Observed Result`: 실제로 한 일과 나온 결과를 짧게 적기
- `Issue Type`: `none`, `ux`, `instruction`, `focus`, `window`, `browser`, `save`, `evaluator`, `other`
- `Next Action`: `none`, `recheck`, `bugfix`, `clarify_instruction`, `ask_review`

| No. | Task ID | Status | Observed Result | Issue Type | Next Action |
| --- | --- | --- | --- | --- | --- |
| 001 | `dismiss_popup_then_append_note` | `fail` | `open` 동작이 되지 않았고 더블클릭도 반응하지 않았다. 우클릭 상세 메뉴에서는 `newfile`, `newfolder`만 보여 정상 경로로 진행하지 못했다. | `ux` | `bugfix` |
| 002 | `rename_note_in_explorer` | `pass_with_notes` | `draft.txt`를 눌러도 `reference.txt`가 선택되는 경우가 있었고, 더 위쪽을 눌러야 `draft.txt`가 선택됐다. 한 번 `draft`를 누른 뒤 `reference`를 다시 클릭하면 재선택도 잘 되지 않았다. | `focus` | `bugfix` |
| 003 | `copy_line_between_windows` | `pass` | 사용자 메모 기준 정상 수행됐다. | `none` | `none` |
| 004 | `minimize_recover_and_save` | `pass` | 사용자 메모 기준 정상 수행됐다. | `none` | `none` |
| 005 | `browser_select_category_task` | `fail` | 레이아웃이 깨져 보였고, 스크롤만 내리려 해도 가운데 선택 창에 포커스가 걸리면서 `capture terminal` 등 다른 항목이 선택됐다. 정상 탐색 경로가 불안정했다. | `browser` | `bugfix` |
| 006 | `browser_switch_to_help` | `pass` | 사용자 메모 기준 정상 수행됐다. | `none` | `none` |
| 007 | `browser_log_task_id_simple` | `pass_with_notes` | `summary log txt` 클릭이 잘 되지 않았다. 1번과 유사하게 열기/선택 UX가 불안정했다. | `ux` | `bugfix` |
| 008 | `browser_help_log_summary_simple` | `pass_with_notes` | Ubuntu help에서 어떤 문장을 요약 내용으로 써야 하는지 명확하지 않았다. `copy this sentence`가 실제 요약 대상인지 헷갈렸다. | `instruction` | `clarify_instruction` |
| 009 | `browser_help_to_preopen_note` | `pass_with_notes` | 노트 작성 중 일정 길이를 넘기면 현재 입력 중인 문장이 레이아웃 범위를 넘어가 보이지 않았다. 방향키나 가로 스크롤로도 해소되지 않았다. | `window` | `bugfix` |
| 010 | `browser_select_from_help_and_log_preopen` | `pass_with_notes` | 9번과 동일한 입력창 overflow 문제가 반복됐다. 사실상 중복 태스크처럼 보였다. | `window` | `bugfix` |
| 011 | `browser_open_osworld_from_bookmark` | `pass_with_notes` | 북마크 레이아웃이 문서 영역과 겹쳐 보였다. 상단/문서 배치가 어색해 클릭 대상이 혼동될 수 있었다. | `browser` | `bugfix` |
| 012 | `browser_open_help_from_bookmark` | `pass` | 사용자 메모 기준 정상 수행됐다. | `none` | `none` |
| 013 | `browser_open_research_board_from_bookmark` | `pass` | 사용자 메모 기준 정상 수행됐다. | `none` | `none` |
| 014 | `browser_open_help_topic_from_bookmark` | `not_started` |  |  |  |
| 015 | `browser_help_dock_line_to_note` | `not_started` |  |  |  |
| 016 | `browser_help_shortcut_line_to_note` | `not_started` |  |  |  |
| 017 | `browser_record_task_title_to_note` | `not_started` |  |  |  |
| 018 | `browser_record_task_owner_to_note` | `not_started` |  |  |  |
| 019 | `browser_complete_help_brief_note` | `not_started` |  |  |  |
| 020 | `browser_complete_task_brief_note` | `not_started` |  |  |  |
| 021 | `browser_record_task_apps_to_note` | `not_started` |  |  |  |
| 022 | `browser_help_second_line_to_note` | `not_started` |  |  |  |
| 023 | `browser_record_task_difficulty_to_note` | `not_started` |  |  |  |
| 024 | `browser_record_task_instruction_to_note` | `not_started` |  |  |  |
| 025 | `browser_bookmark_task_difficulty_to_note` | `not_started` |  |  |  |
| 026 | `browser_record_task_first_action_to_note` | `not_started` |  |  |  |
| 027 | `browser_help_title_and_second_line_to_note` | `not_started` |  |  |  |
| 028 | `browser_record_task_last_action_to_note` | `not_started` |  |  |  |
| 029 | `browser_bookmark_help_title_to_note` | `not_started` |  |  |  |
| 030 | `browser_record_task_owner_then_apps_to_note` | `not_started` |  |  |  |
| 031 | `browser_record_task_domain_owner_to_note` | `not_started` |  |  |  |
| 032 | `browser_help_dock_heading_snapshot` | `not_started` |  |  |  |
| 033 | `browser_help_window_restore_hint_capture` | `not_started` |  |  |  |
| 034 | `browser_help_workflow_opening_sentence_capture` | `not_started` |  |  |  |
| 035 | `browser_help_shortcuts_heading_opening_block` | `not_started` |  |  |  |
| 036 | `browser_help_dock_heading_tail_block` | `not_started` |  |  |  |
| 037 | `browser_bookmark_workflow_heading_snapshot` | `not_started` |  |  |  |
| 038 | `browser_bookmark_shortcuts_tail_sentence` | `not_started` |  |  |  |
| 039 | `browser_help_window_full_excerpt` | `not_started` |  |  |  |
| 040 | `browser_help_dock_tail_sentence_preopen` | `not_started` |  |  |  |

## Freeform Notes

### Repeated Failure Patterns

- 파일 목록 클릭 hitbox가 어긋나서 의도한 항목 대신 인접 파일이 선택되거나 재선택이 잘 되지 않음.
- 더블클릭 또는 `open` 동작이 불안정해서 기본 파일 열기 흐름이 막히는 경우가 있음.
- 입력 길이가 길어질 때 텍스트 에디터/노트 영역이 overflow를 제대로 처리하지 못함.
- 브라우저/북마크 계열 태스크에서 레이아웃 겹침과 스크롤 포커스 오작동이 반복됨.

### Ambiguous Instructions

- Ubuntu help 기반 요약 태스크에서 정확히 어떤 문장을 요약 대상으로 삼아야 하는지 불명확함.
- 9번과 10번은 관찰상 거의 같은 문제를 검증하는 중복 태스크처럼 보임.

### Viewer or Runtime Oddities

- 스크롤 입력이 의도한 문서 영역이 아니라 가운데 선택 위젯에 적용되어 다른 항목이 선택됨.
- 북마크 레이아웃이 문서와 겹쳐 보이며, 브라우저 계열 화면에서 전반적인 배치가 불안정함.
