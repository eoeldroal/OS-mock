# Task Hub

태스크 인벤토리의 단일 관리 문서.
새 태스크를 추가하거나 상태를 변경할 때 이 문서를 함께 업데이트한다.

구현 파일: `packages/core/src/tasks/`
타입 정의: `packages/core/src/types.ts`
평가 로직: `packages/core/src/env/evaluator.ts`

---

## 분류 기준

### Split
| Split | 설명 |
|---|---|
| `starter` | 단일 앱, 짧은 horizon, 단순한 저장/완료 중심 |
| `representative` | 멀티앱 추출 워크플로우, 더 긴 horizon |

### 난이도 레벨
| Level | 설명 | 특징 |
|---|---|---|
| A | 단일 앱, 단일 목표 | predicate 1~2개, 빠른 reward |
| B | 단일 앱 + 저장 완료 | append + save 조합 |
| C | 멀티앱 추출 | 한 앱에서 정보 추출 -> 다른 앱에 기록 |
| D | 보류 | 현재 batch generation 기본값에서는 사용하지 않음 |

### 앱 범위
`files` · `note` · `popup` · `browser` · `mail` · `terminal`

---

## 구현된 태스크

### Starter (8개)

| ID | Level | 앱 | MaxSteps | Goal Predicates | 구현 파일 |
|---|---|---|---|---|---|
| `dismiss_popup_then_append_note` | B | popup, note | 30 | `popup.dismissed` -> `note.target_appended` -> `note.saved` | `starter-tasks.ts` |
| `rename_note_in_explorer` | A | files | 20 | `file.renamed` | `starter-tasks.ts` |
| `copy_line_between_windows` | B | note, clipboard | 30 | `clipboard.source_line_copied` -> `note.target_pasted` -> `note.saved` | `starter-tasks.ts` |
| `minimize_recover_and_save` | A | window, note | 20 | `window.note_restored` -> `note.saved` | `starter-tasks.ts` |
| `browser_select_category_task` | A | browser | 15 | `browser.task_selected` | `starter-tasks.ts` |
| `browser_switch_to_help` | A | browser | 10 | `browser.help_page_opened` | `starter-tasks.ts` |
| `browser_log_task_from_help_start` | B | browser, note | 40 | `browser.task_selected` -> `note.target_opened` -> `note.target_appended` -> `note.saved` | `starter-tasks.ts` |
| `browser_help_to_preopen_note` | B | browser, note | 30 | `browser.help_page_opened` -> `note.target_appended` -> `note.saved` | `starter-tasks.ts` |

### Representative (10개)

| ID | Level | 앱 | MaxSteps | Goal Predicates | 구현 파일 |
|---|---|---|---|---|---|
| `browser_log_workflow_task_id` | C | browser, note | 64 | `browser.task_selected` -> `note.target_appended` -> `note.saved` | `representative-tasks.ts` |
| `browser_capture_help_line` | C | browser, note | 128 | `browser.help_page_opened` -> `note.target_appended` -> `note.saved` | `representative-tasks.ts` |
| `mail_extract_mock_note` | C | mail, note | 96 | `mail.message_opened` -> `note.target_appended` -> `note.saved` | `representative-tasks.ts` |
| `terminal_record_working_directory` | C | terminal, note | 64 | `terminal.command_ran` -> `note.target_appended` -> `note.saved` | `representative-tasks.ts` |
| `browser_log_task_from_minimized` | C | browser, note | 80 | `browser.task_selected` -> `note.target_opened` -> `note.target_appended` -> `note.saved` | `representative-tasks.ts` |
| `browser_help_from_minimized` | C | browser, note | 80 | `browser.help_page_opened` -> `note.target_opened` -> `note.target_appended` -> `note.saved` | `representative-tasks.ts` |
| `browser_log_task_unfocused_help_start` | C | browser, note | 96 | `browser.task_selected` -> `note.target_opened` -> `note.target_appended` -> `note.saved` | `representative-tasks.ts` |
| `browser_help_preopen_note_distractors` | C | browser, note | 64 | `browser.help_page_opened` -> `note.target_appended` -> `note.saved` | `representative-tasks.ts` |
| `browser_log_task_preopen_note_hard` | C | browser, note | 80 | `browser.task_selected` -> `note.target_appended` -> `note.saved` | `representative-tasks.ts` |
| `browser_help_unfocused_distractors` | C | browser, note | 96 | `browser.help_page_opened` -> `note.target_opened` -> `note.target_appended` -> `note.saved` | `representative-tasks.ts` |

---

## Family Inventory

대량 생성 시에는 개별 태스크보다 family 단위로 먼저 계획한다.

| Family | Source app | Sink app | Core predicates | Current count | Allowed variation axes |
|---|---|---|---|---|---|
| `files_rename` | Files | Files | `file.renamed` | 1 | content, distractor count, initial focus |
| `note_edit_save` | Files/Note | Note | `note.target_opened`, `note.target_appended`, `note.saved` | 1 | content, layout, initial focus, distractor count |
| `note_copy_paste` | Note | Note | `clipboard.source_line_copied`, `note.target_pasted`, `note.saved` | 1 | content, layout, initial focus |
| `window_recover_save` | Window | Note | `window.note_restored`, `note.saved` | 1 | initial window state, focus, distractor windows |
| `browser_navigate` | Browser | Browser | `browser.task_selected` or `browser.help_page_opened` | 2 | initial category, initial page, target category/task |
| `browser_extract_to_note` | Browser | Note | `browser.task_selected` or `browser.help_page_opened`, `note.target_appended`, `note.saved` | 10 | difficulty, content, initial page, initial visibility, preopen note, distractor count |
| `mail_extract_to_note` | Mail | Note | `mail.message_opened`, `note.target_appended`, `note.saved` | 1 | content, initial selected item, distractor count |
| `terminal_record_to_note` | Terminal | Note | `terminal.command_ran`, `note.target_appended`, `note.saved` | 1 | content, initial focus, distractor count |

---

## 계획된 태스크 (미구현)

새 태스크를 설계하면 아래에 추가한다. 구현이 완료되면 위 테이블로 이동한다.

| ID (안) | Family | Level | Split | 앱 | 목적 | 상태 |
|---|---|---|---|---|---|---|
| _(비어 있음)_ | | | | | | |

---

## 커버리지 현황

### Split × Level 매트릭스

|  | Level A | Level B | Level C | Level D |
|---|---|---|---|---|
| **starter** | 4 | 4 | — | — |
| **representative** | — | — | 10 | — |

### 앱별 커버리지

| 앱 | 등장 태스크 수 | 태스크 ID |
|---|---|---|
| note | 15 | 대부분 태스크 (browser-only 2개, rename 1개 제외) |
| files | 2 | `rename_note_in_explorer`, `dismiss_popup_then_append_note` |
| popup | 1 | `dismiss_popup_then_append_note` |
| browser | 12 | 기존 2개 + 신규 10개 |
| mail | 1 | `mail_extract_mock_note` |
| terminal | 1 | `terminal_record_working_directory` |

### 지원 Predicate 사용 현황

| Predicate | 사용 태스크 |
|---|---|
| `note.target_opened` | 6개 (browser_log_task_from_help_start 외 5개 representative) |
| `popup.dismissed` | `dismiss_popup_then_append_note` |
| `note.todo_opened` | `dismiss_popup_then_append_note` |
| `note.target_appended` | 14개 |
| `note.saved` | 15개 |
| `file.renamed` | `rename_note_in_explorer` |
| `clipboard.source_line_copied` | `copy_line_between_windows` |
| `note.target_pasted` | `copy_line_between_windows` |
| `window.note_restored` | `minimize_recover_and_save` |
| `browser.task_selected` | 7개 (기존 1개 + 신규 6개) |
| `browser.help_page_opened` | 7개 (기존 1개 + 신규 6개) |
| `mail.message_opened` | `mail_extract_mock_note` |
| `terminal.command_ran` | `terminal_record_working_directory` |

미사용 predicate: 없음 (모든 predicate 사용 중)

---

## Coverage Gaps

대량 생성 시 아래 빈칸을 우선적으로 메우는 편이 좋다.

- Files -> Note 계열은 1개뿐이라 variation 폭이 좁음
- Mail, Terminal 계열은 각 1개뿐이라 batch 생성 시 쉽게 편향됨
- Level D와 perturbation 기반 family는 현재 생성 대상에서 제외
- Browser 계열은 12개로 충분하나, Mail/Terminal 계열 확장이 필요

---

## Duplicate Risk Rules

아래 조건 중 2개 이상이 동일하면 신규 task보다 기존 family variation으로 보는 것이 기본값이다.

- 같은 source app -> sink app 구조
- 같은 goal predicate set
- 같은 progress chain
- 같은 setup shape
- 같은 output artifact
- 문자열만 바뀌고 workflow 의미는 동일

처리 우선순위:

1. 기존 task의 seed variation으로 흡수
2. 기존 family의 documented variation으로 흡수
3. 둘 다 아니면 신규 task로 승격

---

## Batch Generation Defaults

별도 요청이 없으면 아래 분배 규칙을 기본으로 쓴다.

- 동일 `domain` 비중은 batch의 40% 이하
- 동일 `goalPredicates` 조합은 batch의 25% 이하
- 동일 `app scope`는 3개 이상 연속 배치하지 않음
- `starter`는 Level A/B 중심
- `representative`는 Level C 중심
- variation은 content + setup 계열 2축 이상 확보를 기본값으로 함

---

## 업데이트 방법

태스크를 추가/변경할 때:

1. 구현된 태스크 테이블에 행 추가 (또는 계획된 -> 구현됨으로 이동)
2. Family Inventory와 Coverage Gaps를 함께 업데이트
3. 커버리지 현황 수치 업데이트
4. `doc/task/tasks-and-perturbations.md`도 동기화
