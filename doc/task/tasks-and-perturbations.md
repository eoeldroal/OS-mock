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

현재 registry inventory는 총 `160`개다.

- `starter`: `96`
- `representative`: `64`
- browser/editor slice: `110`
- files/window slice: `50`

### 유지 원칙

- `추출 필드` 또는 `판단 기준`이 다르면 독립 task로 유지 가능
- `정답 문자열만 다르고 행동/채점 구조가 같은 경우`는 variant로 내린다
- `existing content`, `preopen note`, `distractors`, `help-start` 차이는 browser/editor 쪽에서 setup variation으로 본다
- files/window batch는 파일 개수, 최소화 상태, dock launch 여부 같은 variation이 많아서 `warn`이 남아도 `fail 0`이면 유지 가능하다
- duplicate audit는 semantic intent와 subtype을 우선 반영한다

### 구현 위치

- browser/editor starter: `packages/core/src/tasks/starter/`
- browser/editor representative: `packages/core/src/tasks/representative/`
- browser/editor bulk batch:
  - `packages/core/src/tasks/starter/browser-bulk-tasks.ts`
  - `packages/core/src/tasks/representative/browser-bulk-tasks.ts`
- files/window batch: `packages/core/src/tasks/files-window-tasks.ts`

전체 task ID 목록은 `doc/task/task-hub.md`를 따른다.

---

## 3. Audit 상태

inventory audit 기준:

- `fail`: `0`
- `warn`: `29`

요약:

- browser/editor slice의 setup-variation warning `2`개는 유지한다.
- files/window slice는 variation-heavy batch라 `27`개의 soft warning이 남아 있다.
- 현재 기준으로 hard duplicate fail은 없다.

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
2. `npm run build` 또는 최소 `npm run build:core`
3. `node .codex/skills/os-mock-task-author/scripts/audit-task-batch.mjs --mode inventory`
4. representative behavior까지 건드렸을 때만 `npm run qa:representative`

이번 변경에서 확인된 상태:

- 통과: `npm run typecheck`, `npm run build:core`
- audit: 총 `160`개, `fail 0`, `warn 29`
- `qa:representative`는 이번 task-only pass에서 범위 밖이라 재실행하지 않았다.
