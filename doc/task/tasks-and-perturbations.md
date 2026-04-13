# 태스크 및 퍼터베이션

이 문서는 현재 `OS-mock`의 task inventory와 perturbation capability를 운영 관점에서 정리한다.
태스크별 시작 상태와 목표는 내부 authoring metadata를 기준으로 관리하며, agent under test에게는 직접 노출하지 않는다.

---

## 1. Registry Contract

태스크는 `packages/core/src/tasks/registry.ts`에서 집계된다.
`trainer.list_tasks`와 core `listTasks()`는 agent-safe 공개 catalog만 반환한다.

| 필드 | 설명 |
|---|---|
| `id` | task identifier |
| `instruction` | agent-facing instruction 원문 |
| `maxSteps` | 최대 step 수 |
| `seedDefaults` | 기본 seed 목록 |
| `domain` | task 분류용 domain |
| `split` | `starter` / `representative` |

내부 authoring/debug 메타데이터는 `listTaskAuthoringMetadata()`에서만 다룬다.

---

## 2. 현재 Inventory

현재 registry inventory는 총 `48`개다.

- `starter`: `25`
- `representative`: `23`
- 오리지널 8개를 포함한 현재 총합이다.

### 유지 원칙

- `추출 필드` 또는 `판단 기준`이 다르면 독립 task로 유지 가능
- `정답 문자열만 다르고 행동/채점 구조가 같은 경우`는 variant로 내린다
- `existing content`, `preopen note`, `distractors`, `help-start` 차이는 setup variation으로 본다
- duplicate audit는 semantic intent를 우선 반영한다

### 현재 starter

- `dismiss_popup_then_append_note`
- `rename_note_in_explorer`
- `copy_line_between_windows`
- `minimize_recover_and_save`
- `browser_select_category_task`
- `browser_switch_to_help`
- `browser_log_task_id_simple`
- `browser_help_log_summary_simple`
- `browser_help_to_preopen_note`
- `browser_select_from_help_and_log_preopen`
- `browser_open_osworld_from_bookmark`
- `browser_open_help_from_bookmark`
- `browser_open_research_board_from_bookmark`
- `browser_open_help_topic_from_bookmark`
- `browser_help_dock_line_to_note`
- `browser_help_shortcut_line_to_note`
- `browser_record_task_title_to_note`
- `browser_record_task_owner_to_note`
- `browser_complete_help_brief_note`
- `browser_complete_task_brief_note`
- `browser_record_task_apps_to_note`
- `browser_help_second_line_to_note`
- `browser_record_task_difficulty_to_note`
- `browser_record_task_instruction_to_note`
- `browser_bookmark_task_difficulty_to_note`

### 현재 representative

- `browser_help_preopen_note_distractors`
- `browser_log_task_preopen_note_hard`
- `browser_help_topic_title_to_note`
- `browser_help_header_and_tip_to_note`
- `browser_help_bookmark_capture_note`
- `browser_record_task_action_count_note`
- `browser_record_task_apps_note`
- `browser_record_task_owner_difficulty_note`
- `browser_record_task_full_card_note`
- `browser_find_terminal_task_and_log_id`
- `browser_find_mail_review_task_and_log_title`
- `browser_find_easy_desktop_task_and_log_id`
- `browser_find_hard_support_task_and_log_title`
- `browser_compare_help_topics_and_log_title`
- `browser_compare_two_tasks_and_log_common_app`
- `browser_fix_help_digest_note`
- `browser_fix_task_owner_brief_note`
- `browser_bookmark_task_title_to_note`
- `browser_help_two_lines_to_note`
- `browser_record_task_actions_to_note`
- `browser_compare_tasks_and_log_shared_owner`
- `mail_extract_mock_note`
- `terminal_record_working_directory`

---

## 3. Audit 상태

inventory audit 기준:

- `fail`: `0`
- `warn`: `2`

남은 warning:
- `browser_help_to_preopen_note` <-> `browser_help_preopen_note_distractors`
- `browser_select_from_help_and_log_preopen` <-> `browser_log_task_preopen_note_hard`

둘 다 setup variation 성격이 강한 쌍이라 warn으로 유지한다.

---

## 4. 퍼터베이션 Capability

현재 환경 capability로 제공되는 perturbation은 아래와 같다.

- `PopupInject`
- `MinimizeAll`
- `RandomPointerSpawn`
- `WindowClose`
- `ZOrderShuffle`

현재 task-author 기본 생성 정책에서는 perturbation을 task inventory 기본축으로 사용하지 않는다.
필요하면 trainer/debug 흐름에서 별도로 적용한다.

---

## 5. 검증 루틴

inventory 변경 후 우선 실행할 항목:

1. `npm run typecheck`
2. `npm run build`
3. `npm test`
4. `node .codex/skills/os-mock-task-author/scripts/audit-task-batch.mjs --mode inventory`
5. representative behavior가 바뀌었으면 `npm run qa:representative`

이번 변경에서 확인된 상태:

- 통과: `npm run typecheck`, `npm run build`, `npm test`
- audit: 총 `48`개, `fail 0`, `warn 2`
- representative QA: 현재는 `SyntaxError: Unexpected token 'p', "page.scree"... is not valid JSON`로 실패한다.
