# Task Assignment 5x20 E Log Template

이 문서는 `docs/task/task-assignment-5x40-legacy.md`의 E 파트(`081`-`100`)를 직접 수동 실행하면서 결과를 기록하기 위한 로그 템플릿이다.

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
  --task team3_terminal_record_working_directory \
  --seed 0 \
  --open \
  --debug
```

태스크 바꿔서 실행하는 예시:

```bash
OS_MOCK_PORT=4315 npm run interactive:mcp-client -- \
  --task terminal_cat_and_save_config \
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
| Date |  |
| Runner |  |
| Branch |  |
| Commit |  |
| Default Seed | `0` |
| Port | `4315` |
| Notes | 기존 Observed Result와 Freeform Notes를 1차 근거로 사용해 새 taxonomy로 재분류함. |

## Summary

| Bucket | Count |
| --- | --- |
| `pass` | 0 |
| `fix_needed` | 19 |
| `blocked` | 0 |
| `drop` | 1 |

## Per-Task Log

기록 규칙:

- `Observed Result`: 실제로 한 일과 나온 결과를 짧게 적기
- `Issue Type`: `none`, `ux`, `instruction`, `focus`, `window`, `browser`, `mail`, `terminal`, `save`, `evaluator`, `other`
- `Next Action`: `none`, `recheck`, `bugfix`, `clarify_instruction`, `ask_review`

| No. | Task ID | Seed | Status | Observed Result | Issue Type | Next Action |
| --- | --- | --- | --- | --- | --- | --- |
| 081 | `team3_terminal_record_working_directory` | `0` | `fix_needed` | `pwd기능 정상, txt 저장 가능. redirection 기능 없음. 하지만 명령을 여러번하면 terminal 작동 x, termianl 스크롤 안됨. ctrl+C, ctrl+v 하면 텍스트 커서 위치 이상함` | `ux, terminal` | `bugfix` |
| 082 | `terminal_cat_and_save_config` | `0` | `fix_needed` | `cat, ls 기능 정상, txt 저장 가능. redirection 기능 없음. 하지만 명령을 여러번하면 terminal 작동 x, termianl 스크롤 안됨. ctrl+C, ctrl+v 하면 텍스트 커서 위치 이상함` | `ux, terminal` | `bugfix` |
| 083 | `terminal_cat_env_password` | `0` | `fix_needed` | `cat, ls 기능 정상, txt 저장 가능. redirection 기능 없음. 하지만 명령을 여러번하면 terminal 작동 x, termianl 스크롤 안됨. ctrl+C, ctrl+v 하면 텍스트 커서 위치 이상함` | `ux, terminal` | `bugfix` |
| 084 | `terminal_cat_log_error_code` | `0` | `fix_needed` | `cat, ls 기능 정상, txt 저장 가능. redirection 기능 없음. 하지만 명령을 여러번하면 terminal 작동 x, termianl 스크롤 안됨. ctrl+C, ctrl+v 하면 텍스트 커서 위치 이상함` | `ux, terminal` | `bugfix` |
| 085 | `terminal_list_log_directory` | `0` | `fix_needed` | `cat, ls 기능 정상, txt 저장 가능. redirection 기능 없음. 하지만 명령을 여러번하면 terminal 작동 x, termianl 스크롤 안됨. ctrl+C, ctrl+v 하면 텍스트 커서 위치 이상함` | `ux, terminal` | `bugfix` |
| 086 | `terminal_cat_csv_email` | `0` | `fix_needed` | `cat, ls 기능 정상, txt 저장 가능. redirection 기능 없음. 하지만 명령을 여러번하면 terminal 작동 x, termianl 스크롤 안됨. 터미널 부분 드래그 선택 안돼서 해당 부분만 복사 붙여넣기 불가능` | `ux, terminal` | `bugfix` |
| 087 | `terminal_record_deep_pwd` | `0` | `drop` | `중복되는 task 제거 필요 81과 동일` | `none` | `none` |
| 088 | `terminal_cat_hidden_credentials` | `0` | `fix_needed` | `ls 시 .** 파일들도 그냥 출력` | `terminal` | `bugfix` |
| 089 | `terminal_list_hidden_files` | `0` | `fix_needed` | `ls 시 .** 파일들도 그냥 출력` | `terminal` | `bugfix` |
| 090 | `terminal_cat_json_nested` | `0` | `fix_needed` | `공통 기능상 문제와 동일` | `terminal` | `bugfix` |
| 091 | `terminal_cat_python_import` | `0` | `fix_needed` | `공통 기능상 문제와 동일, 일부분 복사 불가` | `terminal` | `bugfix` |
| 092 | `terminal_find_specific_extension` | `0` | `fix_needed` | `공통 기능상 문제와 동일, ls *.pdf 기능 x` | `terminal` | `bugfix` |
| 093 | `terminal_cat_csv_specific_value` | `0` | `fix_needed` | `공통 기능상 문제와 동일, 일부분 복사 불가` | `terminal` | `bugfix` |
| 094 | `terminal_cat_gitignore` | `0` | `fix_needed` | `공통 기능상 문제와 동일` | `terminal` | `bugfix` |
| 095 | `terminal_find_backup_file` | `0` | `fix_needed` | `공통 기능상 문제와 동일, * 사용 불가능` | `terminal` | `bugfix` |
| 096 | `terminal_cat_package_json_version` | `0` | `fix_needed` | `공통 기능상 문제와 동일, 일부분 복사 불가` | `terminal` | `bugfix` |
| 097 | `terminal_find_shell_script` | `0` | `fix_needed` | `공통 기능상 문제와 동일, ls *.sh 기능 x` | `terminal` | `bugfix` |
| 098 | `terminal_cat_process_list` | `0` | `fix_needed` | `공통 기능상 문제와 동일, 일부분 복사 불가` | `terminal` | `bugfix` |
| 099 | `terminal_cat_yaml_config` | `0` | `fix_needed` | `공통 기능상 문제와 동일, 일부분 복사 불가` | `terminal` | `bugfix` |
| 100 | `terminal_cat_cert_expiry` | `0` | `fix_needed` |`공통 기능상 문제와 동일, 일부분 복사 불가` | `terminal` | `bugfix` |

## Freeform Notes

### Repeated Failure Patterns

- `terminal의 출력 부분 선택 복사 불가.`
- `terminal에서 스크롤 안됨`
- `terminal 작은창 범위 넘어가면 확인 불가`
- `txt 창에 CTRL+C, CTRL+V 시 텍스트 커서가 이상한 곳에 있는 현상 발생`
- `드래그 기능 작동 x`
- `방향키 기능 x`
- `Redirection을 사용한 수행 불가`
- `ls -al 과 같은 option 기능 없음`
- 
### Ambiguous Instructions

- 

### Viewer or Runtime Oddities

- 
