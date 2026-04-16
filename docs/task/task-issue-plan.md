# Plan: Resolve task-issue.md Issues for RL-Ready Mock OS

## Context

`docs/task/legacy/task-issue.md`는 수동 검토 중 누적된 8개 이슈(ISSUE-001 ~ ISSUE-008)를 추적한다. 이 이슈들은 mock 데스크탑 환경의 UI/UX 버그(클릭 히트 영역, open/더블클릭, 브라우저 레이아웃, 노트 overflow), task 카탈로그의 instruction 모호성(요약 대상, append 위치 규칙), Windows 런타임 버그(`xdg-open ENOENT`), 그리고 중복 task 구성으로 구성되어 있다.

**목표**: AI Agent(`trainer.*` / `computer13.*` MCP 툴)를 통한 강화학습이 가능하도록, (1) a11yTree 기반 hit-test가 렌더된 화면과 일치하고, (2) 기본 상호작용(open/double-click/context menu/scroll/long-text editing)이 결정론적으로 동작하며, (3) instruction이 주어진 관찰만으로 agent가 해결 가능할 만큼 명확한 수준까지 끌어올린다. 완벽한 UI 품질이 아니라 "RL agent가 리워드를 받을 수 있을 정도"가 기준이다.

**비범위**: 시각 디자인 리팩토링, 새 task 추가, MCP 툴 스키마 변경. `Computer13Action`/`StepResult` contract은 건드리지 않는다(기존 로그 replay 호환 유지).

**중요한 전제 (2026-04-16 검증 반영)**:
- `docs/task/legacy/task-status-log-A.md`에 남아 있는 일부 browser/help 계열 task ID(`browser_help_to_preopen_note` 등)는 **현재 active registry에 존재하지 않는 historical/legacy ID**다.
- 따라서 이 문서의 실행 계획은 "현재 active catalog를 고치는 단계"와 "historical 로그를 issue provenance로만 해석하는 단계"를 구분해야 한다.
- 존재하지 않는 legacy task ID를 기준으로 새 코드를 수정하거나 수동 검증 커맨드를 적지 않는다.

## Critical Files

**Fix targets (bugs)**
- `packages/core/src/apps/file-explorer.ts` — hit-test rect 계산 및 double-click open semantics
- `packages/web/src/components/window-bodies/FileExplorerBody.tsx` — row 렌더 좌표
- `packages/web/src/components/FloatingContextMenu.tsx` — rendered menu position / canonical bounds 정렬
- `packages/core/src/env/reducer.ts` — 파일 컨텍스트 메뉴 생성 순서 및 selection 반영
- `packages/web/src/components/DesktopSurface.tsx` — click queue 보조 점검
- `packages/web/src/components/window-bodies/BrowserBody.tsx` — 북마크 패널 z/layout
- `packages/core/src/apps/browser-lite.ts` — browser semantic scroll behavior
- `packages/web/src/components/window-bodies/NoteEditorBody.tsx` — 긴 라인 horizontal scroll
- `packages/mcp-server/src/clients/interactive.ts` — `openViewer` Windows 지원
- `packages/mcp-server/src/qa/local-input.ts` — 기존 local-input QA 재사용 포인트

**Fix targets (instructions/catalog)**
- `packages/core/src/tasks/starter/browser-web-tasks.ts` — browser→note 계열 task (line 103-140)
- `packages/core/src/tasks/files-window-tasks.ts` — `open_and_append`, `copy_line_paste_save` 등 append/paste/save 계열 instruction
- `packages/core/src/tasks/starter/desktop-tasks.ts` — 현재 active starter note/clipboard 계열 instruction
- `packages/core/src/tasks/starter/**`, `packages/core/src/tasks/representative/**` — active catalog 내 instruction 필드 전반
- `packages/core/src/tasks/registry.ts` — 카탈로그 진입점 (수정은 불필요, 참고용)
- `docs/task/legacy/task-status-log-A.md` — legacy task ID provenance 확인용 (active catalog 수정 대상은 아님)

**Contract (건드리지 말 것)**
- `packages/core/src/types.ts` — `Computer13Action` (line 36-53), `StepResult` (line 590-604), `TaskSpec` (line 651-664)
- `packages/mcp-server/src/tools/computer13.ts`, `trainer.ts`

## Step-by-Step

### Step 1 — ISSUE-001: Explorer hit-test 좌표 복구

**증상(확정)**: Explorer에서 파일 row 중심을 클릭하면 아래 row가 선택된다. `file-explorer.ts:213-218`의 `fileRowRects`는 `listViewportBounds.y + index * ROW_HEIGHT`만 사용한다(확인됨).

**아직 확정되지 않은 것**: 웹 렌더러가 row를 그릴 때 별도의 세로 오프셋을 적용하는지는 **소스로 직접 확인하지 않았다**. "`rowTopOffset - listViewportTop`" 은 초기 Explore 에이전트의 가설이며, 구현 전에 반드시 render math를 직접 검증해야 한다.

**1단계 — Gate: render math 확정 (구현 전 필수)**
  - `packages/web/src/components/window-bodies/FileExplorerBody.tsx`의 파일 row 렌더 블록(대략 `~594+` 구간, `model.files.map`)을 직접 읽는다.
  - 동시에 `packages/core/src/apps/file-explorer.ts`의 `ROW_HEIGHT`, `HEADER_HEIGHT`, `TOOLBAR_HEIGHT`, `MAIN_PADDING` 상수값을 기록한다.
  - **즉시 회귀 테스트 추가** — `packages/core/test/contracts/observation-contract-regression.test.ts`에 "FileExplorer에서 `observation.a11yTree` 상의 각 file row node의 `bounds.center`를 `CLICK`으로 돌려주면 해당 row가 `selectedFileId`로 잡히는가" 케이스를 넣는다. 이 테스트가 **실패해야** 진단이 맞다는 증거가 된다(red → green 사이클).
  - 실패 양상을 보고 원인 범주를 확정:
    - (원인 α) core rect의 y가 위에서 쓴 수식 그대로지만, web 렌더러가 추가 오프셋을 적용 → "shift mismatch" 가설.
    - (원인 β) core와 web 모두 같은 수식을 쓰지만 `ROW_HEIGHT`/padding 상수가 서로 다르거나, window 타이틀바 높이가 한쪽에만 반영 → "상수 mismatch".
    - (원인 γ) pointer 이벤트가 `rect`가 아닌 `react onClick target`으로 전달돼, 브라우저의 box 모델(margin/border)이 center를 한 row 아래로 밀어냄.

**2단계 — 원인별 수정안**
  - 원인 α/β: `file-explorer.ts`를 단일 출처로 삼고 web 렌더러가 `fileRowRects[i]`의 y를 **그대로** 사용해 절대 좌표로 배치한다. core 쪽 상수(`HEADER_HEIGHT` 등)는 변경하지 않는다. 필요하면 `FileExplorerBody`에서 core 상수를 import하되, 역방향 import는 금지.
  - 원인 γ: DOM 요소의 `padding-top`/`marginTop`을 제거해 rect와 visual box가 정확히 일치하도록 조정한다.

**검증**:
  - 1단계에서 넣은 회귀 테스트가 green이 되는지.
  - `npm run qa:local-input`(local-click 회귀 QA)이 통과하는지 — **필수**.
  - 수동: `npm run interactive:mcp-client -- --task open_among_three --open` 후 Explorer 파일 3개 row 중앙 클릭 → 의도한 row 선택.

### Step 2 — ISSUE-002: open/double-click 복구

원인이 서로 독립적인 네 개의 버그가 겹쳐 있다. 네 개 모두 고쳐야 한다. 우선순위 순서대로:

**2a (1차, 확정 원인). `FloatingContextMenu.tsx:77`의 `pointerEvents: "none"` 제거**
  - 현재 해당 값이 하드코딩돼 있어 **어떤 수정을 하더라도 메뉴 항목 클릭 자체가 불가능**하다. 다른 고려보다 먼저, `pointerEvents: "auto"`로 바꾼다.
  - 이것만 바꾸면 "rename/open/delete이 눌리지 않는다"는 표면 증상 중 상당 부분이 사라진다.

**2b (1차, 확정 원인). Context menu 아이템이 클릭 이전 selection 기준으로 만들어짐**
  - `reducer.ts:1108-1134`에서 `RIGHT_CLICK` 시 `getFileExplorerContextMenu(!!explorer.selectedFileId)`를 **앱 핸들러 실행 전에** 호출한다(step 6에서 menu 생성, step 7에서 app handler). 따라서 selection이 비어 있을 때 file row를 우클릭하면 `open/rename/delete`가 disabled로 뜬다.
  - 수정: reducer의 `RIGHT_CLICK` 분기에서 파일 row hit-test를 먼저 수행해 `selectedFileId`를 갱신한 뒤 메뉴 아이템을 빌드한다. `file-explorer.ts`에 `getFileAtPoint(...)` 헬퍼를 노출해 재사용한다.

**2c (1차, 독립 버그). `file-explorer.ts:324-346` `RIGHT_CLICK`이 자동으로 renameMode 진입**
  - 현재 우클릭만으로 `renameMode = { fileId, draft, replaceOnType: true }`를 설정한다(line 339-343). 이는 rename 메뉴 항목 클릭/F2 전용 동작이어야 한다.
  - 수정: 해당 핸들러에서 `renameMode` 설정 코드를 제거하고, `selectedFileId` 갱신만 남긴다. Rename 진입은 메뉴 아이템 dispatch 또는 F2 경로에서만 일어나도록 한다.

**2d (2차, app semantics). 파일 더블클릭이 open으로 연결되지 않음**
  - `DesktopSurface.tsx:473-534`의 click queue는 정상 동작한다(180ms timeout + `cancelled` 플래그, double-click 시 `clearPendingSingleClick()`로 취소). 이 경로는 건드리지 않는다.
  - 진짜 원인은 `file-explorer.ts:313-318`의 double-click 분기가 **folder일 때만** 처리하고 file은 그냥 선택만 한다는 점이다(line 319에서 `selectedFileId`만 갱신). 파일에 대해 `numClicks === 2` 이면 해당 파일을 note editor 등으로 여는 동작을 추가한다. open 대상 앱 결정은 파일 확장자 또는 `kind`로 라우팅한다.

**검증**:
  - Explorer: 빈 상태에서 file row 우클릭 → `open/rename/delete`가 **즉시 enabled**로 뜨고 클릭 가능.
  - 우클릭만으로는 rename draft에 진입하지 **않음** (F2 / 메뉴 Rename 항목 경유 시에만 진입).
  - 파일 더블클릭 → 대응 editor 창 open, selection만 되는 현상 없음.
  - 기존 `npm run qa:local-input` 회귀 통과.

### Step 3 — ISSUE-005: Note editor 긴 라인 overflow
**문제**: `NoteEditorBody.tsx:202-269`. line div에 `overflow: hidden` + `whiteSpace: pre`라 커서가 화면 밖으로 나가면 보이지 않는다.

**수정 방향**:
  - 우선 editor viewport를 horizontal scroll 가능하게 만들고, active caret이 화면 밖으로 나가면 `scrollLeft`를 자동 조정한다.
  - 첫 번째 구현은 web/view layer에서 해결한다. 현재 evaluator와 task contract는 note의 의미론적 텍스트/저장 상태를 기준으로 하므로, 단순 view-state인 horizontal scroll을 곧바로 core contract로 올릴 필요는 없다.
  - 이후 RL 관찰 계약에 실제 horizontal scroll 상태가 필요하다고 확인될 때만 optional 필드로 승격한다.
  - `whiteSpace: pre`는 유지하되 caret이 있는 line wrapper 또는 editor viewport에 `overflowX: auto`를 부여한다.

**검증**: note에 80자+ 한 줄 입력 → 마지막 문자가 보이는지, `←` 키로 되돌아가면 커서가 따라 보이는지.

### Step 4 — ISSUE-003: Browser layout & scroll focus

이 이슈는 **두 개의 독립 문제**로 쪼갠다. 한 PR에 묶지 않는다.

**4a (1차, 시각 레이아웃). 북마크 패널이 content와 겹침 (A-011)**
  - `BrowserBody.tsx:116-172` 북마크 패널이 `position: absolute`이고(line 116, 124) stacking이 content보다 낮다.
  - 수정: `zIndex`를 올리거나, content와 별도 섹션(flex 분리)으로 배치해 겹침 자체를 제거한다.
  - 이 수정은 `browser-lite.ts`와 `Computer13Action`/`observation` 계약을 건드리지 않는다 → **안전**. 먼저 merge할 수 있다.

**4b (2차, semantic change — 신중히). Wheel scroll이 selection을 바꿈 (A-005)**
  - `browser-lite.ts:400-426`에서 `SCROLL`이 `selectedHelpLineIndex` / `selectedTaskId`를 ±1 이동시킨다. 이건 **의도된 설계**이지 단순 버그가 아니다. 기존 scripted solve 로그와 evaluator가 이 semantics에 의존할 가능성이 높다.
  - **1단계 접근 (권장 기본)**: 코드는 건드리지 말고, 해당 task들의 `instruction`에 "wheel scroll moves the selected line/task" 를 명시한다. 수동 검토자와 RL agent 모두에게 semantics가 보이면 혼란이 줄어든다. → Step 6과 함께 처리.
  - **2단계 접근 (stretch)**: semantics 자체를 viewport offset으로 바꾸고 selection 이동은 키보드/명시적 list 클릭으로 제한한다. 이 경우 다음을 모두 확인한 뒤에만 진행한다:
    - `output/` 하위 기존 browser 계열 scripted solve가 wheel SCROLL에 의존하는지 grep (`logs/` 디렉토리는 존재하지 않음).
    - 있다면 해당 로그를 먼저 replay해 reward 회귀 확인.
    - 별도 PR로 분리하고, 영향 받는 task의 `goalPredicates`/`instruction`을 동시에 업데이트.
  - 이 결정(유지 vs. 변경)은 구현자가 단독 판단하지 말고 문서 ISSUE-003 코멘트로 남긴 뒤 진행한다.

**검증**: 북마크 토글 시 content와 겹치지 않음. 기본안에서는 wheel scroll이 실제로 selection을 이동시키며, 그 의미론이 instruction과 일치해야 한다. stretch안을 택한 경우에만 "content scroll" 동작을 기대한다. `test:contracts` 통과.

### Step 5 — ISSUE-007: Windows `--open` 지원
**위치**: `packages/mcp-server/src/clients/interactive.ts:262-268` `openViewer`. 현재 macOS(`open`)와 Linux(`xdg-open`) 분기만 존재하며, Windows에서는 `xdg-open`으로 fallthrough해 `ENOENT` 발생.

**수정**:
```ts
function openViewer(url: string) {
  if (!/^https?:\/\//.test(url)) {
    console.warn(`[openViewer] refusing non-http(s) url: ${url}`);
    return;
  }
  const isWin = process.platform === "win32";
  const isMac = process.platform === "darwin";
  const command = isMac ? "open" : isWin ? "cmd" : "xdg-open";
  // cmd /c start "" <url> — shell wrapping 없이도 동작한다. shell:true는 URL escaping 문제가 있어 피한다.
  const args = isWin ? ["/c", "start", "", url] : [url];
  const child = spawn(command, args, { stdio: "ignore", detached: true });
  child.unref();
}
```

**검증**: Windows에서 `npm run interactive:mcp-client -- --open` 실행 시 기본 브라우저로 viewer URL이 열리는지 확인. 실패 시 stderr 대신 "브라우저에서 직접 열어 주세요: <url>" 안내 출력.

### Step 6 — ISSUE-004/006: Instruction 명확화
**문제**: task별 instruction이 모호(요약 대상 문장 지정 누락, append 위치 규칙 누락).

**수정 방향 (카탈로그 일괄 패스)**:
  - 먼저 historical 로그와 active catalog를 분리한다. `docs/task/legacy/task-status-log-A.md`의 help/bookmark 계열 task ID는 provenance로만 취급하고, 현재 active registry(`packages/core/src/tasks/**/*.ts`)에 실제로 존재하는 task만 코드 수정 대상으로 삼는다.
  - 최소 수정 범위는 `packages/core/src/tasks/files-window-tasks.ts`, `packages/core/src/tasks/starter/desktop-tasks.ts`, `packages/core/src/tasks/starter/browser-web-tasks.ts`, `packages/core/src/tasks/representative/browser-web-tasks.ts`다. 필요하면 predicate 매칭 결과에 따라 다른 active task 모듈로 확장한다.
  - ISSUE-006은 `open_and_append` 계열뿐 아니라 `copy_line_paste_save` 계열에서도 append 위치 모호성이 보고됐으므로(`docs/task/legacy/task-issue.md:95`), 추림 조건을 다음처럼 넓게 잡는다:
    - `goalPredicates`에 `note.target_appended` / `note.target_pasted` / `note.saved` / `clipboard.source_line_copied` / `browser.help_page_opened` / `browser.help_topic_opened` / `browser.bookmark_opened` 중 하나 이상 포함
    - `instruction`에 `append`, `paste`, `copy`, `summarize`, `save`, `help`, `bookmark` 키워드가 등장
    - 둘 중 **어느 한쪽이라도 해당되면** 대상에 포함 (과수정이 과소수정보다 낫다)
  - 각 `instruction` 문자열에 다음 세 가지를 명시:
    1. **어느 문장/라인을 대상으로 하는가** (help summary: "Summarize the line that starts with `Tip:` on the help page" 같은 앵커).
    2. **append 위치** ("at the end of the existing text without adding a newline" 또는 "on a new line after the last line").
    3. **저장 단계 포함 여부** ("and save the file via Ctrl+S" 등).
  - 수정 대상은 `goalPredicates`를 참조해 결정: 즉, 실제 성공 판정이 요구하는 문자열 위치에 맞춰 instruction을 고친다(반대로 instruction에 맞춰 predicate를 고치면 기존 로그가 깨진다).
  - historical help-summary ambiguity(ISSUE-004)에 대응하는 active task가 현재 registry에 없으면, 코드를 억지로 수정하지 말고 `task-issue.md`에 "legacy observation / no active counterpart as of 2026-04-16" 메모를 남긴다.

**검증**: `npm run test`, `npm run test:contracts` 통과. 수정된 task는 interactive session에서 instruction만 보고 해결 가능한지 1회씩 확인한다.

### Step 7 — ISSUE-008: A-009/A-010 중복 의심 검토

> **⚠ 계획 수정 (2026-04-16 검증 결과 반영)**
> 원래 계획에서 참조한 `packages/core/src/tasks/starter/browser-note-tasks.ts`는 **존재하지 않는 파일**이다.
> A-009/A-010은 task ID가 아니라 `docs/task/legacy/task-issue.md` ISSUE-005의 **수동 검토 관찰 ID**로, "note 입력 시 overflow 문제"가 반복 관찰된 사례이다.
> ISSUE-008("중복 태스크로 보이는 구성")은 이 관찰들이 서로 다른 task에서 동일 버그를 재현한 것인지, 실질적으로 같은 task가 중복 등록된 것인지를 판별해야 한다.
> 추가로, 이 관찰이 발생한 task ID `browser_help_to_preopen_note`, `browser_select_from_help_and_log_preopen`는 `docs/task/legacy/task-status-log-A.md`에는 남아 있지만 현재 active registry에는 없다. 따라서 ISSUE-008은 "active catalog duplication"이 아니라 "historical task duplication 또는 동일 버그의 반복 관찰" 가능성을 먼저 검토해야 한다.

**수정 방향**:
  - 먼저 A-009/A-010 관찰이 **어떤 task ID에서 발생했는지** 확인한다. 현재 확인된 출처는 `docs/task/legacy/task-status-log-A.md`의 `browser_help_to_preopen_note`, `browser_select_from_help_and_log_preopen`이다.
  - 두 task ID가 active registry에 존재하는지 먼저 확인한다. 존재하지 않으면 active catalog dedupe 작업은 **중단**하고, historical log 중복 여부만 판단한다.
  - historical-only라면 ISSUE-008을 `closed` 또는 tracker 문구 조정으로 정리한다. 권장 기본은 "동일 overflow 버그(ISSUE-005)가 서로 다른 historical task에서 재현됨"으로 바꾸는 것이다.
  - active registry에 실제 동등 task가 존재할 때만 그 task가 속한 현재 모듈에서 setup/targets/goalPredicates/interaction path를 비교한다. 이때도 실질적으로 동일 시나리오일 때만 하나를 `seedDefaults` 케이스로 흡수하고, `registry.ts` reference를 정리한다.
  - 삭제 시 기존 replay 로그가 깨지지 않도록 `output/`에 해당 id 참조가 있는지 grep하고, 있다면 유지 + deprecation 주석을 선택한다.

**검증**: `npm run test`, `npm run test:contracts` 통과. 필요하면 `packages/core/test/contracts/task-contract-regression.test.ts`에 alias/uniqueness 회귀를 추가한다.

### Step 8 — task-issue.md 상태 갱신
각 이슈의 `Status`를 `resolved`로 바꾸고, 해결 commit/PR을 `Known Evidence` 하위에 한 줄씩 추가한다. ISSUE-008처럼 "ask_review" 결과가 판단인 경우 `closed`(중복 아님) 또는 `resolved`(통합)로 명시한다.

## Verification (End-to-End)

1. **Unit/Integration**
   - `npm run typecheck`
   - `npm run test`
   - `npm run test:contracts`

2. **Web smoke (수동, ≤10분)**
   - Explorer smoke: `npm run interactive:mcp-client -- --task open_among_three --open`
   - Browser smoke: `npm run interactive:mcp-client -- --task browser_catalog_owner_to_note --open`
   - Note editor smoke: `npm run interactive:mcp-client -- --task open_append_save --open`
   - Explorer: 파일 3개 각각 단일 클릭 → 의도한 row 선택 / 더블클릭 → open 전이 / 우클릭 → rename/open/delete 활성 및 클릭 반응.
   - Browser: 북마크 토글 시 content와 겹치지 않음. 기본안에서는 wheel scroll이 selection 이동으로 동작하되 instruction/관찰과 모순되지 않아야 한다. stretch안을 택한 경우에만 content scroll을 기대한다.
   - Note editor: 120자 한 줄 입력 후 커서 visible 유지, `Home`/`End`로 좌우 이동 시 스크롤 복귀.
   - 가능하면 기존 `npm run qa:local-input` 시나리오도 함께 재사용해 local click 경로 회귀를 본다.

3. **MCP Agent loop (RL contract 회귀 확인)**
   - `trainer.create_session` → `trainer.reset(task_id=open_among_three)` → `computer13.observe` 또는 기존 QA 스크립트로, `StepResult.observation.a11yTree` 내 파일 노드 bounds가 viewer 클릭 좌표와 일치하는지 확인한다.
   - browser/instruction 회귀는 active browser task(예: `browser_catalog_owner_to_note`)로 별도 reset해 확인한다. historical task ID(`browser_help_to_preopen_note` 등)는 여기 사용하지 않는다.
   - scripted solve가 있는 항목은 reward/cumulativeReward가 양수로 끝나는지 확인한다.
   - Windows: `--open` 플래그로 CLI 기동 시 viewer가 기본 브라우저에 뜨는지.

4. **Task catalog 회귀**
   - 수정한 task 각각에 대해 interactive session으로 1회씩 solve → 기존 goal predicates가 여전히 만족되는지.

## 잠재 리스크 & 주의점

- **Contract drift**: note horizontal scroll을 core state로 올리면 replay/observation 영향 범위가 커진다. 1차 구현은 view-layer로 두고, 정말 필요할 때만 optional 필드로 승격한다.
- **Context menu visual drift**: floating renderer가 canonical menu bounds와 다르게 배치되면 사람이 보는 위치와 reducer hit-test가 다시 어긋날 수 있다.
- **Hit-test 상수 공유**: core → web 단방향 import만 허용. `FileExplorerBody`가 core 상수를 import하는 방향은 OK, 반대는 금지.
- **Windows spawn**: `shell: true`는 arg escaping 이슈가 있으니 URL은 `https?://`로 시작하는 것만 받도록 간단한 validation을 한 줄 추가.
- **중복 task 삭제**: `output/`에 id 참조가 있으면 삭제 대신 alias 유지 고려 (`logs/` 디렉토리는 현재 존재하지 않음).

## 산출물 순서 (PR 분할 권장)

1. PR #1 — ISSUE-002 2a+2b+2c (`pointerEvents` + reducer selection 갱신 순서 + 자동 renameMode 제거) · 가장 작은 단위로 먼저 merge.
2. PR #2 — ISSUE-001 + ISSUE-002 2d (Explorer hit-test + file double-click open) · 회귀 테스트 먼저, 그 다음 수정.
3. PR #3 — ISSUE-005 (Note overflow; core state 승격은 보류가 기본).
4. PR #4 — ISSUE-003 4a (Browser 북마크 layout만) · semantic scroll은 건드리지 않음.
5. PR #5 — ISSUE-007 (Windows `--open`).
6. PR #6 — ISSUE-004/006 (instruction 명확화). ISSUE-003 4b의 "wheel scroll semantics 명시"는 이 PR에서 함께 처리.
7. PR #7 — ISSUE-008 (A-009/A-010 관찰 대상 task 추적 → 중복 판별 후 정리 또는 closed 처리).
8. PR #8 (optional / stretch) — ISSUE-003 4b 구조 변경 (wheel SCROLL → viewport offset). `output/` replay 회귀를 먼저 확인한 경우에만 진행.
9. PR #9 — task-issue.md 상태 업데이트.

각 PR은 green build + 해당 검증 항목만 만족하면 merge 가능.

---

## Appendix: 코드베이스 대조 검증 로그

> **최종 검증일: 2026-04-16** (commit `961154c` 기준). 라인 번호는 이 시점 기준이며, 이후 수정으로 변동될 수 있다.

아래는 본문 수정에 반영된 코드 검증 사실의 출처 기록이다. 결론과 권고는 이미 본문 각 Step에 병합됐으므로 여기서는 반복하지 않는다.

| 항목 | 검증 소스 (file:line) | 확인 사실 |
|---|---|---|
| `fileRowRects` 계산식 | `file-explorer.ts:213-218` | `listViewportBounds.y + index * ROW_HEIGHT` (단순 선형) ✓ |
| `FileExplorerBody` render shift | `FileExplorerBody.tsx:~594+` | `model.files.map` 시작, 아직 직접 미확인 ⚠ → Step 1 Gate에 반영 |
| Context menu 생성 순서 | `reducer.ts:1108-1134` | step 6에서 `getFileExplorerContextMenu(!!explorer.selectedFileId)` 호출, step 7에서 app handler ✓ |
| RIGHT_CLICK 자동 renameMode | `file-explorer.ts:324-346` | 우클릭 시 즉시 `renameMode` 진입 (line 339-343) ✓ |
| `pointerEvents: "none"` | `FloatingContextMenu.tsx:77` | 하드코딩 ✓ |
| FloatingUI middleware | `FloatingContextMenu.tsx:34-57` | `offset(6) + flip + shift + size` ✓ |
| DesktopSurface click queue | `DesktopSurface.tsx:473-534` | 180ms timeout (line 530-534) + `cancelled` 플래그 (line 481) ✓ |
| File double-click semantics | `file-explorer.ts:313-318` | folder만 처리, file은 selection만 (line 319) ✓ |
| Browser SCROLL semantics | `browser-lite.ts:400-426` | `selectedHelpLineIndex` / `selectedTaskId` ±1 이동 ✓ |
| Windows `openViewer` | `interactive.ts:262-268` | macOS(`open`)/Linux(`xdg-open`) 분기만 존재, Windows는 `xdg-open`으로 fallthrough ✓ |
| `browser-note-tasks.ts` | ❌ **존재하지 않음** | starter/에는 `browser-web-tasks.ts`, `desktop-tasks.ts`, `index.ts`, `shared.ts`만 있음 |
| `browser_help_to_preopen_note` 등 A-part browser/help task ID | ❌ **현재 active registry에 없음** | `docs/task/legacy/task-status-log-A.md`에는 남아 있으나 `packages/core/src`, `packages/core/test`, `packages/mcp-server/src` 전역 검색 결과 없음 |
| `logs/` 디렉토리 | ❌ **존재하지 않음** | `output/` 디렉토리가 대안 |
| npm scripts 존재 여부 | `package.json` | `typecheck`, `test`, `test:contracts`, `interactive:mcp-client`, `qa:local-input` 모두 존재 ✓ |
| Contract types | `types.ts` | `Computer13Action` (line 36-53), `StepResult` (line 590-604), `TaskSpec` (line 651-664) ✓ |
| Contract test 경로 | `packages/core/test/contracts/` | `task-contract-regression.test.ts`, `observation-contract-regression.test.ts` 존재 ✓ |
| QA 스크립트 | `packages/mcp-server/src/qa/` | `local-input.ts`, `representative.ts`, `osworld-adversarial.ts`, `viewer-desync.ts` 존재 ✓ |
