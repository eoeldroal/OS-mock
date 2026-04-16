# Task Issue Tracker

이 문서는 각 파트별 수동 검토 로그에서 발견된 이슈를 한곳에 모아 관리하기 위한 누적 문서다.

중요:
- 이 문서는 현재까지 관찰된 이슈를 모아둔 작업용 트래커다.
- 아직 모든 파트를 완전하게 로깅한 상태가 아니므로, 아래 항목은 최종 결론이 아니라 현재까지 확인된 내용이다.
- 같은 종류의 이슈가 다른 파트에서도 다시 발견되면, 기존 항목에 재현 범위와 출처만 추가한다.
- 2026-04-16 기준 일부 browser/help 계열 task ID는 historical 수동 로그에는 남아 있지만 active registry에는 없다. 이런 ID는 코드 수정 대상이라기보다 issue provenance로 해석한다.

## Current Coverage

| Part | Source Log | Coverage Note |
| --- | --- | --- |
| A | [task-status-log-A.md](/mnt/d/0.서강대학교/7/캡스톤디자인/OS-mock/docs/task/task-status-log-A.md) | 일부 태스크만 수동 검토됨 |
| D | [task-status-log-D.md](/mnt/d/0.서강대학교/7/캡스톤디자인/OS-mock/docs/task/task-status-log-D.md) | 전반 검토 메모 있음 |

## Issue List

### ISSUE-001 Explorer 파일 클릭 히트 영역 오프셋

- Status: `open`
- Type: `ux`, `focus`
- Current Scope: A, D
- Summary: Explorer에서 파일 항목의 중심을 클릭하면 의도한 파일이 아니라 아래쪽 파일이 선택되거나, 다시 선택이 잘 되지 않는 문제가 있음.
- Known Evidence:
  - A-002: `draft.txt` 대신 `reference.txt`가 선택됨. 더 위쪽을 눌러야 의도한 파일이 선택됨.
  - A-007: `summary log txt` 클릭이 잘 되지 않음.
  - D freeform: 파일 항목 중심 클릭 시 아래 파일이 선택됨. 121-123에서 확인.
- Potential Impact:
  - rename/open 계열 전반
  - Explorer 파일 선택이 필요한 태스크 전반
- Next Action: `bugfix`

### ISSUE-002 open / 더블클릭 동작 불안정

- Status: `open`
- Type: `ux`
- Current Scope: A
- Summary: 기본 파일 열기 경로가 불안정하며, `open` 동작과 더블클릭이 기대대로 작동하지 않는 경우가 있음.
- Known Evidence:
  - A-001: `open` 동작이 되지 않고 더블클릭도 반응하지 않음. 우클릭 상세 메뉴에서는 `newfile`, `newfolder`만 보임.
  - A-007: 파일 클릭 후 열기 흐름이 일관되지 않음.
- Potential Impact:
  - Explorer 기반 open 태스크 전반
- Next Action: `bugfix`

### ISSUE-003 브라우저 레이아웃 깨짐 및 스크롤 포커스 오작동

- Status: `open`
- Type: `browser`, `window`
- Current Scope: A
- Summary: 브라우저 또는 북마크 화면에서 레이아웃이 겹치거나 깨져 보이고, 스크롤 입력이 의도한 문서 영역이 아니라 다른 선택 UI에 적용되는 문제가 있음.
- Known Evidence:
  - A-005: 스크롤만 내리려 해도 가운데 선택 창에 포커스가 걸려 다른 항목이 선택됨.
  - A-011: 북마크 레이아웃이 문서 영역과 겹쳐 보임.
  - A freeform: 브라우저 계열 화면에서 전반적인 배치가 불안정함.
- Potential Impact:
  - browser/help/bookmark 계열 태스크
- Next Action: `bugfix`

### ISSUE-004 help 요약 대상 문장 모호

- Status: `open`
- Type: `instruction`
- Current Scope: A
- Summary: help 기반 요약 대상 문장 모호성은 historical browser/help task에서 관찰됐지만, 현재 active registry에 직접 대응되는 task는 아직 확인되지 않았다.
- Known Evidence:
  - A-008: `copy this sentence`가 실제 요약 대상인지 헷갈림.
- Potential Impact:
  - historical help-summary 로그 해석
  - 향후 동일 family 재도입 시 instruction 품질
- Next Action: `clarify_instruction` 또는 historical observation 유지 여부 검토

### ISSUE-005 텍스트 입력 영역 overflow 처리 불량

- Status: `open`
- Type: `window`
- Current Scope: A
- Summary: 노트 작성 중 일정 길이를 넘기면 현재 입력 중인 텍스트가 레이아웃 범위를 벗어나 보이지 않고, 방향키나 가로 스크롤로도 회복되지 않음.
- Known Evidence:
  - A-009: note 작성 중 현재 입력 위치가 보이지 않음.
  - A-010: 동일 문제 반복.
- Potential Impact:
  - preopen note / append 계열 태스크
  - 긴 문자열 입력이 필요한 에디터 태스크
- Next Action: `bugfix`

### ISSUE-006 append 위치 규칙이 instruction에 명시되지 않음

- Status: `open`
- Type: `instruction`
- Current Scope: D
- Summary: append/paste/save 계열 task에서 줄바꿈 여부와 입력 위치 규칙이 instruction에 명시되지 않아, 같은 동작을 해도 성공 조건을 추측해야 하는 경우가 있음.
- Known Evidence:
  - D-146: append 위치와 줄바꿈 여부가 태스크마다 다르게 느껴짐.
  - D freeform: `open_and_append`류와 `copy_line_paste_save`류 사이에 기대 append 위치가 혼재.
- Potential Impact:
  - `files-window-tasks.ts`의 append/paste/save 계열
  - starter desktop note/clipboard 계열
  - browser-to-note append 계열
- Next Action: `clarify_instruction`

### ISSUE-007 Windows에서 `--open` 옵션 사용 시 `xdg-open ENOENT`

- Status: `open`
- Type: `runtime`
- Current Scope: D
- Summary: Windows 환경에서 `--open` 옵션을 사용하면 `xdg-open ENOENT` 에러가 발생함.
- Known Evidence:
  - D freeform: `--open` 없이 실행 후 브라우저에서 직접 `http://127.0.0.1:4315/session/s1` 접속으로 우회.
- Potential Impact:
  - Windows 기반 수동 검토 세션 전반
- Next Action: `bugfix` 또는 실행 안내 보강

### ISSUE-008 중복 태스크로 보이는 구성

- Status: `open`
- Type: `catalog`
- Current Scope: A
- Summary: A-009/A-010은 현재로서는 active catalog 중복이라기보다, 동일한 note overflow 문제가 서로 다른 historical task에서 반복 관찰된 사례로 해석된다. active registry duplication 여부는 별도 확인이 필요하다.
- Known Evidence:
  - A-009 / A-010: 동일한 입력창 overflow 문제를 반복 검증하는 형태로 보임.
- Potential Impact:
  - 수동 검토 결과의 해석 정확성
  - active catalog duplication 판정의 정확성
- Next Action: `ask_review` (historical vs active catalog 구분 우선)

## Update Rules

- 새 파트에서 같은 문제가 다시 나오면 새 이슈를 만들지 말고 기존 이슈에 `Current Scope`와 `Known Evidence`를 추가한다.
- 아직 단일 관찰만 있는 항목도 삭제하지 않고 유지한다. 이후 다른 파트에서 재현되면 우선순위를 올린다.
- 태스크 로그 쪽에는 태스크별 사실만 적고, 공통 패턴이나 플랫폼 이슈는 이 문서에 모은다.
- 최종 정리 전까지는 `Status: open`을 기본으로 두고, 수정 완료 후 `resolved`, 검토 결과 무효이면 `closed`로 바꾼다.
