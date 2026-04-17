# OSWORLD-5 Task Follow-up Decision

이 문서는 `docs/task/task-status-audit.md`의 전수조사 결과를 바탕으로,
각 Task를 `유지`, `재작성`, `보류`, `폐기` 중 어디로 가져갈지 확정하고
필요한 후속 조치를 정리하기 위한 문서다.


## Strict Rules

### 허용 입력 상태
- `pass`
- `fix_needed`
- `blocked`
- `drop`

### 상태별 허용 최종 조치

| Audit Status | Final Action | 의미 | 필수 기입 항목 |
| --- | --- | --- | --- |
| `pass` | `keep` | 현재 상태로 유지 | 유지 근거 |
| `fix_needed` | `rewrite` | Task 목적은 유지하고 현재 환경에서 다시 성립하도록 복구 | 수정 범위, owner, 검증 기준 |
| `blocked` | `hold` | 즉시 재작성하지 않고 선행 작업 backlog로 분리 | blocker, 선행 작업, backlog 링크 |
| `drop` | `drop` | 카탈로그에서 폐기 | 폐기 이유, 대체/중복 관계 |

### 금지 사항
- 한 Task를 두 개 이상의 최종 목록에 동시에 넣지 않는다.
- `pass`를 임의로 `rewrite`나 `drop`으로 바꾸지 않는다.
- `fix_needed`를 이 문서 안에서 바로 `drop`으로 바꾸지 않는다.
- `blocked`를 선행 작업 없이 `재작성 완료`로 올리지 않는다.
- `drop`을 유지 목록에 남기지 않는다.

### 재분류 요청
전수조사 상태 자체가 잘못되었다고 판단되면 이 문서에서 조치를 바꾸지 말고 아래에 남긴다.

| No. | Task ID | 현재 Audit Status | 제안 상태 | 재분류 근거 | 담당자 | 처리 상태 |
| --- | --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  | `open` |

재분류 요청이 열린 Task는 최종 확정 목록에 넣지 않는다.


### 필터링 시트

아래 표는 모든 `fix_needed`, `blocked`, `drop` Task를 반드시 포함한다.
필요하면 `pass`도 샘플링 검토로 넣을 수 있다.

| No. | Task ID | Audit Status | Evidence Summary | Final Action | Required Follow-up | Issue/PR | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
|  |  | `fix_needed` |  | `rewrite` |  |  |  |
|  |  | `blocked` |  | `hold` |  |  |  |
|  |  | `drop` |  | `drop` |  |  |  |

`Final Action`에는 아래 값만 사용한다.

- `keep`
- `rewrite`
- `hold`
- `drop`

---

## 재작성 작업 카드

`fix_needed -> rewrite`로 확정된 Task마다 아래 카드를 1개씩 만든다.

```md
### [No.] `task_id`

- 현재 목적:
- 유지 이유:
- 전수조사 근거:
- 수정 범위:
  - `instruction`
  - `task setup`
  - `window / app composition`
  - `interaction flow`
  - `evaluator / reward`
  - `visual composition`
- 이번 이슈에서 실제로 손볼 항목:
- 이번 이슈에서 손대지 않을 항목:
- 완료 조건:
- 검증 방법:
- 담당자:
- 상태:
  - `todo` | `in_progress` | `done`
- 관련 PR / commit:
- 비고:
```

재작성 완료로 올릴 수 있는 조건:
- `상태 = done`
- 검증 완료
- PR 또는 commit 기록 존재

---

## blocked 정리 카드

`blocked -> hold` Task마다 아래 카드를 1개씩 만든다.

```md
### [No.] `task_id`

- blocker:
- 지금 막히는 이유:
- 필요한 앱/환경 선행 작업:
- 선행 작업 owner:
- backlog issue:
- unblock 조건:
- 비고:
```

---

## drop 정리 카드

`drop` Task마다 아래 카드를 1개씩 만든다.

```md
### [No.] `task_id`

- 폐기 이유:
  - `duplicate`
  - `low_value`
  - `out_of_direction`
  - `high_recovery_cost_low_explanatory_value`
- 중복/대체 Task:
- 카탈로그 반영 방식:
- 관련 이슈 또는 PR:
- 비고:
```

---

## Master Decision Table

모든 Task는 아래 표에 정확히 한 번만 들어가야 한다.

| No. | Task ID | Audit Status | Final Action | Owner | Current State | Follow-up Summary | Final List Bucket | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
|  |  | `pass` | `keep` |  | `done` | 유지 | `유지 Task 목록` |  |
|  |  | `fix_needed` | `rewrite` |  | `todo` | 재작성 카드 작성 필요 | `미배치` |  |
|  |  | `blocked` | `hold` |  | `done` | backlog 연결 필요 | `보류 Task 목록` |  |
|  |  | `drop` | `drop` |  | `done` | 카탈로그 제거 | `폐기 Task 목록` |  |

### Final List Bucket 규칙
- `pass -> keep`이면 `유지 Task 목록`
- `fix_needed -> rewrite`인데 아직 미완료면 `미배치`
- `fix_needed -> rewrite`가 완료되고 검증까지 끝나면 `재작성 완료 Task 목록`
- `blocked -> hold`이면 `보류 Task 목록`
- `drop -> drop`이면 `폐기 Task 목록`

문서를 닫을 때 `미배치`는 남기지 않는다.

---

## 최종 산출물

### 유지 Task 목록

| No. | Task ID | 유지 근거 | 확인자 A | 확인자 B | 비고 |
| --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |

### 재작성 완료 Task 목록

| No. | Task ID | 수정 범위 | 검증 결과 | 담당자 | PR / Commit | 비고 |
| --- | --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |  |

### 보류 Task 목록

| No. | Task ID | blocker | 선행 작업 | backlog issue | 비고 |
| --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |

### 폐기 Task 목록

| No. | Task ID | 폐기 이유 | 중복/대체 Task | 반영 방식 | 비고 |
| --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |

---

## 종료 체크리스트

- [ ] `task-status-audit.md` 대상 Task가 모두 `Master Decision Table`에 들어갔다.
- [ ] 모든 `fix_needed` Task에 재작성 카드가 작성되었다.
- [ ] 모든 `blocked` Task에 blocker와 backlog 연결이 남았다.
- [ ] 모든 `drop` Task에 폐기 이유와 대체 관계가 남았다.
- [ ] `Final List Bucket = 미배치`가 없다.
- [ ] 최종 4개 목록에 모든 Task가 정확히 한 번씩만 들어갔다.
