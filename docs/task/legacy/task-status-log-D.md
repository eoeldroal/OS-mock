# Task Assignment 5x40 D Log

이 문서는 `docs/task-assignment-5x40.md`의 D 파트(`121`-`160`)를 직접 수동 실행하면서 결과를 기록하기 위한 로그이다.

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

| Status | 의미 |
| --- | --- |
| `pass` | 현재 환경 기준에서 시작~종료 흐름이 자연스럽고, 시각/상호작용/instruction/evaluator 모두 문제 없이 유지 가능 |
| `fix_needed` | Task 자체는 유지할 가치가 있지만 시각, interaction, instruction, evaluator 중 일부 수정 필요 |
| `blocked` | 앱 미구현, 환경 제약 등으로 현 시점에서는 선행 작업 없이 처리 불가 |
| `drop` | 중복, 가치 낮음, 방향 불일치 등으로 카탈로그에서 정리 대상 |

## 검토 원칙

- 자동 테스트 통과만으로 pass 처리하지 않는다.
- 모든 Task는 최소 1회 이상 웹 기반 수동 검토를 거친다.
- 시작 화면, 상호작용, 종료 직전 상태를 점검한다.

권장 관찰 포인트:

- instruction이 화면에 보이는 작업 경로와 맞는지
- 클릭/포커스/윈도우 전환이 자연스럽게 되는지
- distractor가 있어도 정답 경로가 분명한지
- 저장이 필요한 태스크에서 실제 저장 피드백이 명확한지
- evaluator 기준으로 `done` 시 성공/실패가 직관과 맞는지

## Session Meta

| Field | Value |
| --- | --- |
| Date |  |
| Runner |  |
| Branch | `feat/file-window-task` |
| Commit |  |
| Default Seed | `0` |
| Port | `4315` |
| Notes |  |

## Summary

| Bucket | Count |
| --- | --- |
| `pass` | 40 |
| `fix_needed` | 0 |
| `blocked` | 0 |
| `drop` | 0 |

## Per-Task Log

기록 규칙:

- `Observed Result`: 실제로 한 일과 나온 결과를 짧게 적기
- `Issue Type`: `none`, `ux`, `instruction`, `focus`, `window`, `save`, `evaluator`, `other`
- `Next Action`: `none`, `bugfix`, `clarify_instruction`, `ask_review`

| No. | Task ID | Status | Observed Result | Issue Type | Next Action |
| --- | --- | --- | --- | --- | --- |
| 121 | `rename_among_two` | `pass` | rename 정상 완료 | `none` | `none` |
| 122 | `rename_among_three` | `pass` | rename 정상 완료 | `none` | `none` |
| 123 | `rename_among_four` | `pass` | rename 정상 완료 | `none` | `none` |
| 124 | `popup_then_open` | `pass` | 팝업 닫기 + 파일 열기 정상 | `none` | `none` |
| 125 | `popup_then_rename` | `pass` | 팝업 닫기 + rename 정상 | `none` | `none` |
| 126 | `restore_and_save` | `pass` | 에디터 복원 + 저장 정상 | `none` | `none` |
| 127 | `restore_specific_of_two` | `pass` | 2개 중 정답 에디터 복원 정상 | `none` | `none` |
| 128 | `restore_from_all_minimized` | `pass` | 전체 최소화에서 에디터 복원 정상 | `none` | `none` |
| 129 | `open_and_append` | `pass` | 파일 열기 + 텍스트 append 정상 | `none` | `none` |
| 130 | `popup_then_restore` | `pass` | 팝업 닫기 + 에디터 복원 정상 | `none` | `none` |
| 131 | `dock_launch_then_open` | `pass` | 독에서 Files 실행 + 파일 열기 정상 | `none` | `none` |
| 132 | `dock_launch_then_rename` | `pass` | 독에서 Files 실행 + rename 정상 | `none` | `none` |
| 133 | `restore_explorer_then_rename` | `pass` | Explorer 복원 + rename 정상 | `none` | `none` |
| 134 | `switch_between_notes` | `pass` | 에디터 포커스 전환 정상 | `none` | `none` |
| 135 | `open_from_unfocused_explorer` | `pass` | Explorer 포커스 전환 + 파일 열기 정상 | `none` | `none` |
| 136 | `open_append_save` | `pass` | 파일 열기 + append + 저장 정상 | `none` | `none` |
| 137 | `open_append_save_among_three` | `pass` | 3개 중 파일 선택 + append + 저장 정상 | `none` | `none` |
| 138 | `open_append_save_among_four` | `pass` | 4개 중 파일 선택 + append + 저장 정상 | `none` | `none` |
| 139 | `rename_then_open` | `pass` | rename + 파일 열기 정상 | `none` | `none` |
| 140 | `popup_then_open_append_save` | `pass` | 팝업 닫기 + 파일 열기 + append + 저장 정상 | `none` | `none` |
| 141 | `popup_then_restore_save` | `pass` | 팝업 닫기 + 에디터 복원 + 저장 정상 | `none` | `none` |
| 142 | `restore_append_save` | `pass` | 에디터 복원 + append + 저장 정상 | `none` | `none` |
| 143 | `dock_launch_open_append_save` | `pass` | 독 실행 + 파일 열기 + append + 저장 정상 | `none` | `none` |
| 144 | `all_minimized_restore_and_save` | `pass` | 전체 최소화에서 에디터 복원 + 저장 정상 | `none` | `none` |
| 145 | `popup_then_dock_launch_open` | `pass` | 팝업 닫기 + 독 실행 + 파일 열기 정상 | `none` | `none` |
| 146 | `copy_line_paste_save` | `pass` | 복사 + 붙여넣기 + 저장 성공. 단, append 위치(줄바꿈 여부)가 태스크마다 달라 instruction이 모호함 | `instruction` | `clarify_instruction` |
| 147 | `rename_then_open_among_three` | `pass` | 3개 중 rename + 열기 정상 | `none` | `none` |
| 148 | `popup_then_rename_among_three` | `pass` | 팝업 닫기 + 3개 중 rename 정상 | `none` | `none` |
| 149 | `dock_launch_rename_among_three` | `pass` | 독 실행 + 3개 중 rename 정상 | `none` | `none` |
| 150 | `restore_among_three_then_save` | `pass` | 3개 중 에디터 복원 + 저장 정상 | `none` | `none` |
| 151 | `rename_open_append_save` | `pass` | rename + 열기 + append + 저장 정상 | `none` | `none` |
| 152 | `popup_then_rename_open` | `pass` | 팝업 닫기 + rename + 열기 정상 | `none` | `none` |
| 153 | `popup_then_copy_paste_save` | `pass` | 팝업 닫기 + 복사 붙여넣기 + 저장 정상 | `none` | `none` |
| 154 | `popup_then_restore_append_save` | `pass` | 팝업 닫기 + 에디터 복원 + append + 저장 정상 | `none` | `none` |
| 155 | `dock_launch_rename_then_open` | `pass` | 독 실행 + rename + 열기 정상 | `none` | `none` |
| 156 | `all_minimized_restore_append_save` | `pass` | 전체 최소화에서 복원 + append + 저장 정상 | `none` | `none` |
| 157 | `popup_dock_launch_open_append_save` | `pass` | 팝업 닫기 + 독 실행 + 열기 + append + 저장 정상 | `none` | `none` |
| 158 | `popup_rename_open_append_save` | `pass` | 팝업 닫기 + rename + 열기 + append + 저장 정상 | `none` | `none` |
| 159 | `popup_all_minimized_restore_save` | `pass` | 팝업 닫기 + 전체 최소화 복원 + 저장 정상 | `none` | `none` |
| 160 | `dock_launch_open_copy_paste_save` | `pass` | 독 실행 + 두 파일 열기 + 복사 붙여넣기 + 저장 정상 | `none` | `none` |

## Freeform Notes

### Repeated Failure Patterns

- [Explorer 파일 클릭 히트 영역 오프셋] Explorer에서 파일 항목의 중심을 클릭하면 아래쪽 파일이 선택됨. 정확한 선택을 위해 항목 중심보다 위쪽을 클릭해야 함. 파일 선택이 필요한 모든 태스크에 영향 (121-123 확인, rename/open 계열 전반에 해당 가능성)

### Interaction Issues

- [append 위치 모호] 텍스트 추가 태스크에서 새 줄에 적어야 성공하는 것(open_and_append 등)과 기존 텍스트 바로 뒤에 적어야 성공하는 것(copy_line_paste_save 등)이 혼재. instruction에서 줄바꿈 여부가 명시되지 않아 사용자가 시행착오로 파악해야 함. instruction 개선 필요.


### Viewer or Runtime Oddities

- Windows 환경에서 `--open` 옵션 사용 시 `xdg-open ENOENT` 에러 발생. `--open` 빼고 브라우저에서 직접 `http://127.0.0.1:4315/session/s1` 접속으로 우회.

### Task 구조 분석

- 40개 태스크 전체 pass. 완전 중복 태스크는 없음.
- 6개 기본 동작(팝업/독실행/복원/열기/rename/append+save)의 조합으로 난이도를 올리는 설계.
- distractor 수 변형(2/3/4개), popup 접두 조합, dock/restore 시작 조건 변형이 주요 패턴.
- 유사도가 높은 쌍은 존재하나, 각각 setup 또는 goal predicate에서 최소 1가지 이상 차이 있음.
