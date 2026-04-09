# AI Task 설계 프롬프트 템플릿

현재 `OS-mock` 코드베이스를 기준으로, 적은 입력으로도 바로 구현 가능한 task batch를 만들기 위한 프롬프트 템플릿이다.
목표는 자세한 내부 파라미터를 사람이 일일이 쓰지 않아도, AI가 family-first 방식으로 varied하고 non-duplicate한 task를 생성하고 바로 구현까지 이어가게 만드는 것이다.
사용자가 처음부터 완전한 입력을 주지 않아도 괜찮으며, 필요한 정보는 AI가 여러 번의 짧은 질문으로 보완해야 한다.

---

## 프롬프트 템플릿

```md
현재 `OS-mock` 코드베이스를 기준으로 task batch를 만들어줘.
최종 결과는 mockOS에서 바로 돌 수 있도록 실제 `TaskSpec` 구현까지 포함해줘.

## 최소 입력
사용자는 아래를 전부 줄 필요가 없다. 일부만 줘도 되고, AI가 부족한 항목을 질문으로 채워야 한다.

- goal: `{GOAL}`
  - 예: `브라우저에서 정보를 읽고 note 파일에 저장한다`
- apps: `{APPS}`
  - 예: `Browser + Note Editor`, `Files + Note Editor`
- count: `{COUNT}`
  - 예: `12`, `20`
- splits: `{SPLITS}`
  - `starter`: 단일 앱이거나 비교적 짧은 작업
  - `representative`: 여러 앱을 오가는 더 긴 작업
  - 예: `starter`, `representative`, `starter + representative`
- difficulties: `{DIFFICULTIES}`
  - 예: `easy`, `easy + medium`, `medium + hard`
- variation preferences: `{VARIATION_PREFERENCES}`
  - 예: `초기 창 포커스 다양화, distractor 파일 수 변화, target 문자열 변화`
- constraints: `{CONSTRAINTS}`
  - 예: `현재 코드로 바로 가능한 것만`, `perturbation 제외`, `메일 작성 제외`

AI는 최소한 `goal`, `apps`, `count`가 모자라면 먼저 질문해야 한다.
`split`을 물을 때는 label만 던지지 말고 `starter`와 `representative`의 차이를 짧게 설명해야 한다.

## 필수 제약
1. 현재 reducer, evaluator, app state, factory로 구현 가능한 태스크만 만들 것.
2. perturbation은 사용하지 말 것.
3. 태스크를 flat list로 바로 만들지 말고, 먼저 family를 정의한 뒤 variation matrix를 전개할 것.
4. 기존 inventory와 의미적으로 중복되는 후보는 seed variation 또는 family variation으로 흡수할 것.
5. 결과는 proposal-only가 아니라 실제 구현 가능한 task code 기준으로 작성할 것.
6. 각 태스크는 instruction만 읽어도 최종 산출물이 명확해야 한다.
7. 가능한 한 기존 `targets` 키 이름 규약을 재사용할 것.

## 출력 형식
### 1. Normalized Request
- goal:
- apps:
- count:
- splits:
- difficulties:
- variation_preferences:
- constraints:
- assumptions:

### 2. Family Plan
family별로 아래를 적을 것:
- family 이름:
- source app / sink app:
- 핵심 workflow:
- 핵심 predicates:
- 허용 variation axes:
- 예상 생성 개수:

### 3. Batch Candidates
각 task마다 아래를 적을 것:
- `id`:
- `family`:
- `split`:
- `domain`:
- `instruction`:
- `required setup`:
- `targets`:
- `goalPredicates`:
- `progressPredicates`:
- `suggested maxSteps`:
- `difficulty`:
- `task fingerprint`:
- `why not duplicate`:
- `quality rubric pass/fail`:
- `현재 코드로 바로 구현 가능한지`:

### 4. Coverage Summary
- 어떤 family를 얼마나 생성했는지
- 어떤 app/predicate coverage를 넓혔는지
- 어떤 후보를 중복으로 흡수했는지

### 5. Implementation Result
- 실제로 추가/변경할 task ids
- 수정할 문서
- 실행할 validation
```

---

## 짧은 요청 예시

- `Browser + Note로 representative 12개. easy/medium/hard 섞고, 초기 창 상태랑 distractor variation을 주고, 현재 코드로 바로 구현 가능한 것만.`
- `Files + Note starter 10개. rename 말고 open/edit/save 계열 위주로, focus와 layout variation을 섞어줘.`
- `Terminal + Note task 8개. output 기록형으로 만들고, 기존 representative와 중복되지 않게 해줘.`

## 사용 팁

- predicate나 targets를 사람이 먼저 다 쓰지 않아도 된다.
- 여러 난이도를 한 번에 주면 AI가 family별 variation matrix로 batch를 분배해야 한다.
- `중복되지 않게`라는 조건은 기존 task의 seed variation으로 흡수할 후보를 구분하라는 의미다.
- `바로 구현 가능한 것만`을 기본값으로 두는 편이 안전하다.


## 부분 입력 예시

- `Browser + Note로 representative 여러 개 만들어줘.`
- `메일에서 읽은 내용을 note에 적는 task batch가 필요해.`
- `starter 10개, easy 위주로.`

이런 수준의 요청이 들어오면, AI는 바로 거절하거나 완전한 스키마를 요구하지 말고 필요한 항목을 짧게 추가 질문해야 한다.
