# Phase 2 Day 1 — Runtime Boundaries

## 문서 성격

이 문서는 현재 체크아웃된 저장소와 브랜치를 기준으로 Harness, GitHub Workflow Engine, Codex,
GitHub와 타겟 프로젝트 사이의 실행 책임과 소유 경계를 조사한 학습 보고서다. 공식 설계나 정책을
대체하지 않으며, 개선 후보는 별도 사용자 결정과 Issue·PR을 거치기 전까지 요구사항으로 취급하지
않는다.

본문은 근거의 성격을 다음처럼 구분한다.

- **저장소 사실**: 현재 파일, Git·GitHub 조회 또는 직접 실행 결과로 확인한 내용
- **공식 Codex 사실**: 2026-08-01에 새로 받은 공식 Codex manual에서 확인한 현재 공개 동작
- **현재 세션 사실**: 이번 Codex 세션에 실제로 노출된 skill과 tool surface에서 확인한 내용
- **명시된 설계**: README, SKILL, reference와 설계 문서가 책임으로 선언한 내용
- **조사 판단**: 위 근거를 연결한 해석 또는 후속 후보

## 후속 해결 반영 (2026-08-02)

이 섹션은 Day 1 조사 당시의 코드·세션 관측과 테스트 수치를 소급 변경하지 않고, 이후 사용자 결정과
기능변경 흐름으로 해결된 상태를 별도로 기록한다. 당시 확인한 두 경계 문제는 모두 `main`에 반영됐고
연결된 기능변경 이슈도 완료 상태로 종료됐다.

| Gap | 반영 결과 | 추적 근거 | 완료 검증 |
| --- | --- | --- | --- |
| G1. subagent close capability 불일치 | 첫 spawn 전에 terminal close capability를 확인한다. capability가 없으면 Harness는 주 에이전트 경로를 사용하고, same-session 일반 변경은 그대로 진행하며, 별도 session·정확히 10개 session이 필수인 경로는 spawn 전에 중단한다. `interrupt_agent`는 close 대체로 사용하지 않는다. | [Issue #122](https://github.com/codechaser-kr/codex-harness/issues/122), [PR #123](https://github.com/codechaser-kr/codex-harness/pull/123), merge `02c477c` | 병합 트리 Workflow Engine 117/117, lifecycle·validation·reference 집중 검사, shell syntax와 diff check 통과 |
| G2. installer와 공식 user skill 위치 차이 | 기본 설치·제거 root를 `$HOME/.agents/skills`로 바꾸고 `CODEX_HOME`과 분리했다. backup은 `${XDG_STATE_HOME:-$HOME/.local/state}/codex-harness/backups`로 옮겼으며 destination·backup override를 유지한다. `$CODEX_HOME/skills` legacy 경로는 지원하지 않는다. | [Issue #124](https://github.com/codechaser-kr/codex-harness/issues/124), [PR #125](https://github.com/codechaser-kr/codex-harness/pull/125), merge `1bb2f7c` | 병합 트리 Workflow Engine 118/118, default·override·반복 설치/제거·legacy 불변 검사, shell syntax와 diff check 통과 |

따라서 G1과 G2는 더 이상 활성 즉시 수정 항목이나 Day 2·3 진행의 선행 정책 질문이 아니다. Day 2에서
같은 경계를 다시 관측하는 경우에는 미해결 여부를 판단하기 위한 탐색이 아니라 반영된 계약이 실제
scenario에서도 유지되는지 확인하는 회귀 관측으로 다룬다.

## 오늘 학습한 개념

### Runtime Boundary

Runtime boundary는 파일이 어느 디렉터리에 있는지뿐 아니라 입력, 상태, 부수 효과, 실패와 최종 보고를
누가 소유하는지를 구분한다. 이 저장소에서는 Harness와 Workflow Engine이 같은 Codex 호스트에서
실행되지만, 서로 다른 상태 모델과 성공 기준을 갖는다.

### Host Runtime과 Guest Contract

Codex는 skill metadata를 발견하고 선택된 `SKILL.md`를 활성화하며, 모델 실행, tool, 권한, sandbox와
subagent orchestration을 제공하는 host runtime이다. `codex-harness`는 이 host 위에서 실행되는 skill,
reference, Definition과 script를 배포하는 guest contract다. 저장소 문서가 `close_agent` 같은 host
capability를 직접 구현하는 것은 아니다.

### Control Plane과 Execution Plane

Workflow Engine의 Definition·adapter·validator·evaluator와 사용자 결정 조율은 현재 작업을 계산하고
실행 범위를 고정하는 control plane이다. GitHub 상태 변경, 파일 편집, review 생성 같은 부수 효과는
선택된 executor가 담당하는 execution plane이다. Harness에서는 `team-spec`과 `run-harness`가 역할 선택과
handoff를 조율하고, 선택된 프로젝트 로컬 역할이 실제 변경을 수행한다.

### Orchestration Boundary

오케스트레이션은 모든 작업을 한 실행기가 직접 처리한다는 뜻이 아니다. Harness의 주 에이전트는 역할
계약을 해석해 다음 역할을 선택하고 결과를 통합한다. Workflow Engine은 구조화된 상태를 한 번
정규화하고 evaluator 결과 하나를 현재 작업으로 채택한 뒤, 직접 참조된 thin skill이나 실행 주체에
제한된 작업을 맡긴다.

### Deterministic Responsibility와 Semantic Responsibility

Workflow Definition의 닫힌 구조, fact domain, 상태 정규화, 조건식, 그래프와 단일 전이는 같은 입력에서
같은 결과를 내야 하는 결정론적 책임이다. Harness의 역할 경계, 프로젝트 적합성, 실패 비용과 실제 변경
범위는 저장소 의미를 해석해야 하는 semantic responsibility다. Harness도 파일·필드·참조 같은 구조
조건은 `통과 / 실패`로 검증하지만, 품질과 운영 적합성의 최종 판단은 사용자에게 남긴다.

### Source Package, Installed Copy, Target Asset

- source package는 이 저장소의 `.codex-dist/skills/*`다.
- installed copy는 Codex가 실행 시 발견하는 전역 skill snapshot이다.
- target asset은 특정 타겟 프로젝트 안에 생성·초기화되며 그 프로젝트의 상태와 생명주기를 따른다.

세 위치의 내용이 현재 같더라도 소유권과 갱신 시점은 같지 않다.

## 조사 기준선

### Git과 GitHub

- **저장소 사실**: 조사 시작과 문서 작성 전 branch는 `docs/repository-evolution-workshop`, HEAD는
  `1be04f5970044a235ad3d5e1bd662eb764d83e36`이다.
- **저장소 사실**: upstream은 `origin/docs/repository-evolution-workshop`이며 divergence는 `0/0`이다.
- **저장소 사실**: `origin/main`은 `80787a64670094bf40e8934e642aa6aa9474349a`이고 현재 HEAD의 ancestor다.
- **저장소 사실**: `origin/main...HEAD`에는 Repository Evolution Workshop 문서만 있으며 runtime
  source, 설정, script와 test 차이는 없다.
- **저장소 사실**: 조사 시작 작업 트리는 clean이었다.
- **저장소 사실**: `codechaser-kr/codex-harness`의 열린 PR은 없고, 열린 Issue는 이 작업과 별개인
  프로젝트 이름 변경 정책검토 #37 한 건이다.

Phase 1의 branch·HEAD·Issue·PR 수치와 테스트 결과는 현재 사실로 재사용하지 않고 모두 다시 조회했다.

### 읽은 현재 입력

- Workshop `README.md`, `roadmap.md`, `execution-guide.md`, Phase 2 계획
- Phase 1 Day 6 결과와 Phase 1 종합 결과
- `README.md`, `docs/github-workflow-engine.md`, `install.sh`, `uninstall.sh`
- source와 installed `harness/SKILL.md`, `github-workflow-engine/SKILL.md`
- Harness `reference-map.md`, `codex-runtime-contract.md`, `initial-generation-contract.md`,
  `logging-contract.md`, `reentry-rules.md`, `phase-selection-matrix.md`
- Workflow Engine Definition, state adapter, normalized adapter, validator, evaluator와 관련 runtime contract
- Workflow Engine이 관리하는 thin skill의 metadata, 입력·출력·금지 책임
- `.workflow-engine/settings.json`, `.harness/logs/github-workflow-log.md`, GitHub template
- 공식 Codex manual의 skill discovery·activation, `AGENTS.md`, subagent와 tool lifecycle 설명

Harness reference는 `reference-map.md`의 기본 순서에 따라 오늘의 runtime·상태·재진입 경계에 필요한
leaf만 선택했다. 모든 예시와 품질 가이드를 한 번에 활성화하지 않았다.

### 직접 실행 결과

| 검증 | 결과 |
| --- | --- |
| source와 installed copy의 18개 관리 skill tree 비교 | 18/18 parity |
| Workflow Engine 집계 실행 | 115/115 통과, fail·cancel·skip 0 |
| Harness 사용자 결정 경계 | 1/1 통과 |
| `sh -n install.sh`, `sh -n uninstall.sh` | 통과 |
| `.workflow-engine/settings.json` parse와 현재 지원 필드 인식 보조 검사 | 인식 가능 |
| `feature-change.json` validator | `valid=true` |
| `new_request` 대표 상태 evaluator | `action_required`, `FC-1`, `issue-creation` |
| `terminal` 대표 상태 evaluator | `completed`, `FC-7` |

Workflow Engine 집계의 115개 테스트는 Definition 구조·의미, adapter evidence, evaluator, 다섯 workflow,
재개, close-first 전환, runtime reference 경계, validation mode, agent lifecycle, installer 독립성과 설치본
보존을 포함한다. Harness의 1개 집계 테스트는 사용자 품질 판단과 변경 범위 경계를 확인한다. 테스트 수의
비대칭은 각 runtime의 지식 성격 차이와 현재 검증 가능 범위를 반영한다.

## Codex host runtime 경계

### Codex가 소유하는 책임

**공식 Codex 사실**:

- Codex는 처음에 skill의 name, description과 경로를 보고, 사용하기로 선택한 경우 전체 `SKILL.md`를
  읽는 progressive disclosure를 사용한다.
- skill은 사용자의 명시적 호출 또는 description과 요청의 암시적 일치로 활성화된다.
- skill은 workflow instruction, reference와 script를 제공하며 host가 실제 모델·tool 실행을 제공한다.
- subagent workflow의 spawn, follow-up, wait와 thread close orchestration은 Codex가 담당한다.
- `AGENTS.md`는 project root에서 CWD까지 instruction chain으로 읽히고 가까운 지시가 우선한다.

근거는 공식 [Build skills](https://learn.chatgpt.com/docs/build-skills),
[Skills](https://developers.openai.com/plugins/concepts/skills),
[AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md),
[Subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents) 문서다.

**현재 세션 사실**:

- 이번 세션은 `harness`, `github-workflow-engine`, thin skill과 외부 plugin skill의 name, description,
  경로를 실제 discovery 목록으로 제공했다.
- repository instruction인 `AGENTS.md`의 한국어 GitHub review 규칙이 현재 실행 지시로 적용됐다.
- 파일·shell·GitHub 조회는 Codex가 제공한 tool과 sandbox·approval 경계 안에서 실행됐다.

### 저장소가 소유하지 않는 책임

`codex-harness`는 다음을 구현하지 않는다.

- 모델이 description을 보고 어떤 skill을 선택하는 host discovery 알고리즘
- tool permission과 sandbox enforcement
- GitHub 인증과 `gh` 자체의 동작
- subagent thread scheduler와 실제 lifecycle API
- 외부 `commit`, `awesome-code-review`, `sendbird/cc-plugin-codex`, Claude CLI

저장소는 이 capability를 전제로 한 조건, 허용 범위, 중단과 재개 계약을 제공한다.

## Harness runtime boundary

### 한 문장 경계

Harness는 전역 meta skill과 reference를 Codex 주 에이전트가 해석해, 타겟 프로젝트의 의미에 맞는 로컬
역할 팀을 설계·생성·연결·감사하고 사용자가 확정한 범위만 개선하는 semantic runtime이다.

### 입력에서 결과까지의 경계

```text
사용자 Harness 요청
→ Codex가 전역 harness skill 활성화
→ 주 에이전트가 타겟 저장소와 기존 로컬 Harness 자산 감사
→ 상태 모드와 재진입 하네스 Phase 후보 선택
→ reference map에서 현재 판단 축의 leaf contract 선택
→ team-spec 중심의 역할 팀 설계
→ project-local agent·skill·운영 자산 생성 또는 정렬
→ 구조·계약 검증과 운영 감사 자료 준비
→ 사용자 결정 대기
→ 사용자 확정 범위만 하네스 Phase 7에서 반영
→ Markdown log와 latest summary로 다음 재진입 입력 보존
```

이는 하나의 daemon이나 별도 executable이 계속 실행되는 흐름이 아니다. Codex 주 에이전트가 Markdown
계약, repository tool과 필요 시 좁은 subagent 위임을 사용해 매 요청에서 실행을 구성한다.

### 구성 요소별 책임

| 구성 요소 | 입력 | 출력·부수 효과 | 상태 | 실패 책임 |
| --- | --- | --- | --- | --- |
| Codex host | 사용자 요청, discovered metadata, repository 지시 | skill 활성화, tool·모델·subagent 실행 | 현재 session context와 host thread | tool·권한·sandbox·thread 오류를 surface |
| 전역 `harness` installed copy | Harness 요청, 타겟 repository | 하네스 Phase 0~7 orchestration instruction | 자체 영구 상태 없음 | 필요한 계약·입력 누락 시 보류 또는 중단 지시 |
| Harness source package | repository contributor 변경 | 설치될 SKILL, reference, test | Git history | source 계약·test 유지 책임 |
| `reference-map.md` | 현재 판단 질문 | 읽을 leaf contract 선택 | routing knowledge | 필요한 leaf 누락·오선택 위험을 줄임 |
| 주 에이전트 | 타겟 사실, 사용자 입력, contract | 상태 모드·하네스 Phase·역할 선택, 결과 통합 | session 판단, target log | 불명확한 입력을 추정하지 않고 질문·보류로 전환 |
| `team-spec.md` | domain 분석, 사용자 기준 | 역할 inventory, 권한, handoff, 완료 기준 | 타겟의 역할 정본 | role·agent·skill drift를 가장 이른 계약 실패로 기록 |
| `.codex/config.toml`, `.codex/agents/*` | `team-spec` | project agent metadata | 타겟 project 설정 | `team-spec`과 불일치하면 파생 산출물 실패 |
| `.agents/skills/*` | `team-spec` role section | project-local role pointer | 타겟 project skill | pointer·description·공통 출력 연결 실패 |
| `.harness/docs/*` | repository 사실, team·orchestration 결정 | 보조 입력과 운영 기준 | 타겟 project Markdown | 역할 자산을 대신하거나 정본과 충돌하면 감사 실패 |
| `.harness/logs/session-log.md` | 세션 사건과 실행 결과 | 누적 journal | 타겟 영구 기록 | 실패·timeout·환경 이력을 숨기지 않음 |
| `.harness/logs/latest-session-summary.md` | 종료 시 최신 상태 | 다음 역할·재진입 Phase·위험 | 최신 checkpoint | 완료 근거가 없으면 완료를 선언하지 않음 |
| QA·운영 감사 역할 | 생성 자산, contract, log | 구조 결과, 관찰, 선택지 영향 | audit output | 품질 우열을 확정하지 않고 사용자 결정 대기 |
| 사용자 | 질문과 선택지별 영향 | 현재 유지·부분 수정·구조 재설계와 범위 확정 | 대화와 target 기록 | semantic 품질과 변경 권한의 최종 소유자 |

### Harness의 상태와 Source of Truth

- 역할 팀의 단일 정본은 타겟의 `team-spec.md`다.
- agent TOML과 local role skill은 `team-spec`의 파생 실행 자산이다.
- `.harness/docs/*`는 저장소 입력과 운영 기준을 보조한다.
- `session-log.md`는 누적 journal, `latest-session-summary.md`는 다음 실행용 최신 checkpoint다.
- 현재 session의 해석은 파일에 반영되기 전까지 ephemeral state다.
- 하네스 품질과 실제 변경 범위의 최종 상태는 사용자 결정 없이는 확정되지 않는다.

### Harness의 실패와 안전 중단

- 입력이 약하면 하네스 Phase 1, 역할 경계가 약하면 Phase 2처럼 가장 이른 실패 축으로 재진입 후보를
  만든다.
- role/agent/skill 후보가 0개 또는 복수이거나 서로 불일치하면 `run-harness`는 파일을 수정하지 않고
  중단한다.
- Phase 6 결과가 있어도 사용자 결정 전에는 Phase 7 변경을 시작하지 않는다.
- subagent 결과 상태와 실행 resource cleanup은 별도 상태로 기록한다.
- 환경성 일회 오류는 누적 log에 남기되 다음 실행 판단에 영향을 주지 않으면 latest risk로 승격하지
  않는다.

### 이 저장소 자체의 Target Harness 준비도

**저장소 사실**: 현재 repository에는 `.codex/agents`, `.agents/skills`, `.harness/docs`가 없다.
`.harness/reports`, `.harness/evaluations`, repository 점검 문서와 Workflow Engine log는 있지만,
Harness가 정의한 `run-harness`·`team-spec`·`orchestration-plan` 조합은 없다.

**조사 판단**: 전역 Harness 설치 여부와 타겟 Harness 준비도는 다른 조건이다. 현재 repository에서
Workflow Engine 파일 변경이 발생하면 `target_harness` 준비도를 통과하지 못하고, 실행 시작 전이라면
`general_code_change`가 정상 경로다. 실제 Issue #118의 historical workflow log도 같은 판정을 기록한다.
이는 Harness 설치 실패나 누락 생성물이 아니라 현재 타겟에 project-local Harness를 구성하지 않은
상태다.

## GitHub Workflow Engine runtime boundary

### 한 문장 경계

GitHub Workflow Engine은 GitHub·로컬·사용자·skill output을 provenance가 있는 유한 fact로 정규화하고,
선언형 Definition과 순수 함수 evaluator로 현재 단일 작업을 계산한 뒤 확정 범위만 executor에 맡기는
deterministic control plane이다.

### 입력에서 결과까지의 경계

```text
사용자 시작·재개 요청
→ Codex가 github-workflow-engine 활성화
→ GitHub·로컬·사용자·skill source를 한 snapshot으로 관측
→ workflow별 state adapter가 source contract 확인
→ normalized adapter가 fact domain·evidence 확인
→ validator가 Definition 구조·의미 검증
→ evaluator가 현재 task 하나, completed 또는 stopped 반환
→ 사용자 결정이 있으면 중단
→ 확정 작업이면 thin skill·deterministic tool·외부 provider 중 실행 주체 선택
→ 구조화 요청과 결과의 상관관계·범위·사후조건 검증
→ GitHub와 local state를 다시 관측해 다음 task 계산
→ GitHub 정본 반영, 보조 log와 사용자 보고
```

### Definition, adapter, validator, evaluator

| 구성 요소 | 소유 책임 | 소유하지 않는 책임 |
| --- | --- | --- |
| `definitions/*.json` | workflow ID, 유한 fact domain, task, 사용자 선택지, completion, direct executor, next rule | GitHub 조회, 파일 변경, 자연어 상태 추론 |
| workflow별 state adapter | fact별 허용 source kind와 일부 exact source reference, observation closed shape | GitHub API 호출, 누락 fact 추정, transition 선택 |
| `normalized-fact-adapter.mjs` | fact type·domain·중복·evidence 검증, Definition 순서의 normalized state | Definition 축약 검증, 외부 IO, LLM 판단 |
| `validator.mjs` | 닫힌 객체, ID, 표현식, satisfiability, rule gap·overlap, reachability, terminal path | 실제 상태 조회, task 실행 |
| `evaluator.mjs` | validated definition과 immutable normalized state에서 현재 단일 task·completed·stopped 계산 | state mutation, executor 호출, 사용자 의미 판단 |
| `cli.mjs` | Definition·state file parse, validate/evaluate command와 exit code | runtime 전체 orchestration |

현재 다섯 Definition은 다음 실행 surface를 가진다.

| workflow | entry | facts / tasks | direct executor 종류 | 사용자 결정 task | terminal |
| --- | --- | --- | --- | --- | --- |
| `feature-proposal` | `FP-1` | 8 / 10 | 3 | `FP-1`, `FP-3` | `FP-8` |
| `policy-review` | `PR-1` | 16 / 12 | 4 | `PR-1`, `PR-3`, `PR-7` | `PR-9` |
| `feature-change` | `FC-1` | 17 / 7 | 3 | `FC-1`, `FC-3` | `FC-7` |
| `feature-fix` | `FF-1` | 12 / 8 | 4 | `FF-1`, `FF-3`, `FF-4` | `FF-8` |
| `implementation` | `FI-1` | 44 / 35 | 12 | 10개 | `FI-36` |

`executor_reference=null`은 evaluator가 실행을 한다는 뜻이 아니다. direct skill pointer가 없는 task이며,
Workflow Engine primary가 사용자 결정, 관측 또는 계약에 맞는 결정론적 tool path를 조율한다. 중앙
executor registry는 없고, 각 Definition의 direct reference와 workflow별 exact test가 현재 연결을
보호한다.

### thin skill 경계

| 범주 | 구성 요소 | 책임 | 금지 경계 |
| --- | --- | --- | --- |
| 읽기 보조 | `github-state-summary` | 지정된 GitHub·local 사실을 provenance와 함께 읽기 전용 반환 | 현재 task·전이·결정·변경 확정 금지 |
| 단순 실행 | `github-simple-executor` | 결정론적 tool path가 없는 단일 비파일 상태 변경 | 파일 변경, 범위 해석, 복수 동작 금지 |
| 파일 변경 | `workflow-code-editor` | Harness 준비도 판정, 한 실행 경로 선택, 결과 정규화 | 시작 뒤 fallback, Harness 생성, commit·push·PR 금지 |
| 호환 자산 | `target-harness-code-editor` | 이전 배포와의 compatibility | 현재 Definition executor로 사용되지 않음 |
| 산출물 후보 | `issue-creation`, triage·plan·proposal 계열 | 초안·후보·분석을 정해진 output contract로 반환 | 사용자 결정과 GitHub·file 상태 변경 금지 |
| 리뷰 게시 초안 | `review-comment` | review output의 diff 위치·중복을 점검해 thread draft 생성 | 실제 게시·resolve·대응 방향 확정 금지 |

thin skill은 control plane을 분산 복제하지 않는다. Definition과 evaluator가 task를 정하고, artifact
skill은 후보를 만들며, Workflow Engine이 output 사용 가능 여부와 다음 전이를 다시 판정한다.

### 외부 의존 skill과 provider

- `commit`은 commit message 후보를 만든다.
- `awesome-code-review`는 `codex/awesome-code-review` mode의 review 생성기다.
- `sendbird/cc-plugin-codex`의 `$cc:review`, `$cc:adversarial-review`는 두 Claude review mode의
  companion executor다.
- Claude CLI는 Claude mode의 실제 외부 실행 환경이다.

**저장소 사실**: 네 의존 경로와 Claude CLI가 현재 설치돼 있다. `.workflow-engine/settings.json`도 세
review mode와 `commit`을 인식 가능한 값으로 기록한다.

**명시된 설계**: 이 저장소는 위 외부 dependency를 설치·관리하지 않는다. 선택된 mode의 dependency가
없으면 다른 mode로 fallback하지 않고 설치·재개 조건을 안내해 중단한다.

### Workflow Engine 구성 요소별 책임

| 구성 요소 | 입력 | 출력·부수 효과 | 상태 | 실패 책임 |
| --- | --- | --- | --- | --- |
| GitHub | Issue, PR, label, review thread | 협업 상태와 변경 이력 | authoritative persistent state | API·권한·충돌을 반환 |
| observer / primary | 기준 대상과 조회 범위 | read-only snapshot과 evidence | execution snapshot | 누락·충돌을 추정하지 않고 중단 |
| state adapter | raw observation | source-checked candidates | 없음, pure result | source mismatch를 원자적으로 거부 |
| normalized adapter | candidates와 Definition | normalized facts, evidence map | 없음, pure result | 오류 시 partial result를 비움 |
| validator | Definition | valid 또는 structured errors | 없음, pure result | invalid definition fail-closed |
| evaluator | Definition, state, current task ID | action 하나, completed 또는 stopped | 없음, pure result | gap·overlap·condition·cycle에서 stopped |
| Workflow Engine primary | 계산 결과, 사용자 결정, contracts | 범위 고정, executor 선택, 재관측, 최종 보고 | session과 auxiliary log | 불완전 요청·결과·상관관계에서 중단 |
| thin artifact skill | 제한된 source와 output contract | 후보·초안·분석 | structured skill output | 필수 output 누락 시 보류 반환 |
| executor | immutable structured request | 제한된 side effect와 actual result | GitHub 또는 worktree | 범위·baseline·권한·검증 실패 반환 |
| `.workflow-engine/settings.json` | 실제 capability 관측과 사용자 preference | 필요한 필드의 lazy initialization | target config | 인식 불가 값은 자동 교정 없이 중단 |
| `.harness/logs/github-workflow-log.md` | task·결정·실행·재개 사건 | 재진입용 auxiliary record | target Markdown log | GitHub 상태와 충돌하면 GitHub 우선 |
| 사용자 | Definition이 제시한 선택지 | 결정값, merge 같은 human action | 대화와 GitHub state | 미확정 선택은 실행하지 않음 |

## GitHub와 타겟 프로젝트의 상태 경계

### GitHub가 소유하는 상태

- Issue title·label은 workflow 유형 식별 근거다. 둘이 충돌하면 단일 workflow를 추정하지 않는다.
- Issue·PR 본문의 계획, checklist와 연결 정보는 후속 전이 판단에 쓰이는 협업 상태다.
- PR state와 merge fact는 구현 완료·병합 상태의 원천이다.
- diff review thread의 resolved/unresolved는 review feedback 상태의 원천이다.
- 일반 PR issue comment는 review feedback 상태 원천이 아니다.

완료·미완료 근거와 auxiliary log가 충돌하면 GitHub 실행 상태가 우선한다.

### 타겟 프로젝트가 소유하는 상태

- Git commit, branch와 worktree는 baseline과 로컬 실행 상태다.
- `.workflow-engine/settings.json`은 Workflow Engine 전용 target config다.
- `.github` template은 target의 허용 확장을 보존하는 적용 자산이다.
- `.codex/agents/*`, `.agents/skills/*`, `.harness/docs/*`는 Harness가 별도로 구성된 target에만 존재한다.
- `.harness/logs/github-workflow-log.md`는 Workflow Engine 보조 log이고, Harness의 `session-log.md`와
  `latest-session-summary.md`는 Harness session log다.

`.harness`라는 상위 디렉터리를 함께 쓰지만 현재 파일별 소유자는 구분돼 있다. 이 물리적 co-location은
공통 runtime이나 공통 상태 모델을 뜻하지 않는다.

## source, installed copy, generated asset

| 층 | 현재 실제 경로 | 소유자 | 갱신 방식 | 삭제·drift 의미 |
| --- | --- | --- | --- | --- |
| source package | `.codex-dist/skills/harness/**` | meta repository | commit·PR | Harness 배포 원천 변경 |
| source package | `.codex-dist/skills/github-workflow-engine/**`와 16개 보조 skill | meta repository | commit·PR | Workflow Engine 배포 원천 변경 |
| installed Harness | `/home/codechaser/.codex/skills/harness/**` | 현재 Codex 사용자 환경 | `install.sh harness` | runtime discovery snapshot 변경, source 삭제 아님 |
| installed Workflow Engine | `/home/codechaser/.codex/skills/{github-workflow-engine,...}` | 현재 Codex 사용자 환경 | `install.sh workflow-engine` | runtime snapshot 변경, target state 삭제 아님 |
| target Harness | `<target>/.codex/agents`, `<target>/.agents/skills`, `<target>/.harness/docs` | 타겟 프로젝트와 사용자 | Harness 명시 요청과 사용자 확정 | uninstall 대상이 아닌 project asset |
| target Workflow config | `<target>/.workflow-engine/settings.json` | Workflow Engine | 최초 필요 시 필요한 필드만 | installed skill copy와 독립 |
| target GitHub asset | `<target>/.github/**`, labels | 타겟 프로젝트·GitHub | 최초 요구 시 audit·사용자 결정 | 허용 확장 보존 |
| target runtime log | `<target>/.harness/logs/github-workflow-log.md` | Workflow Engine | task·중단·재개 시 | GitHub state를 대체하지 않음 |

**저장소 사실**: 현재 18개 source package와 installed tree가 모두 동일하다. 이는 설치가 정상이라는
관측이지 source와 installed copy가 하나의 파일 집합이라는 뜻은 아니다. source 변경 뒤 재설치 전이나
사용자 환경의 독립 변경으로 둘은 달라질 수 있다.

`install.sh`와 `uninstall.sh`는 `harness` 1개와 Workflow Engine 계열 17개를 독립 대상 목록으로
관리한다. install은 기존 destination을 backup으로 이동하고, uninstall은 active directory를
`.removed.*`로 이동한다. target project asset은 uninstall하지 않는다.

## Harness와 Workflow Engine의 handoff

둘 사이의 현재 의도된 연결은 확정된 파일 변경의 실행 경로 선택이다.

```text
Workflow Definition/evaluator
→ task_action_id + immutable change scope
→ workflow-code-editor
→ target Harness readiness를 side-effect 없이 확인
   ├─ 준비됨: Workflow 전용 필드를 제거한 일반 코드 변경 요청으로 Harness 호출
   └─ 미설치·미준비: 현재 Codex session의 general_code_change
→ 실제 변경·검증 결과
→ workflow-code-editor가 공통 structured result로 정규화
→ Workflow Engine이 request/result correlation과 다음 전이 판정
```

소유권은 다음처럼 나뉜다.

- Workflow Engine은 task ID, baseline, 대상, 변경 제약, 사용자 확정값과 검증 기준을 소유한다.
- `workflow-code-editor`는 경로 선택과 두 경로 결과의 공통 정규화를 소유한다.
- Harness는 일반 요청을 받아 target role과 실행 방식을 고르며 Workflow 호출 사실을 알 필요가 없다.
- Harness는 Workflow 전용 role, Team Spec field, settings 또는 result schema를 생성하지 않는다.
- Harness 실행 시작 전 준비도 실패는 general path 선택 사유지만, 시작 뒤 실패는 fallback 사유가 아니다.

이 경계는 두 runtime의 결합을 최소화하면서 중복 파일 변경을 막는다.

## 공유 책임과 독립 책임

### 공유되는 실행 기반

- Codex host의 skill discovery, model, tool, sandbox와 session
- target repository의 `AGENTS.md`와 현재 baseline
- 근거를 보존하고 누락·충돌을 추정하지 않는 원칙
- 사용자 결정이 필요한 상태에서의 안전 중단
- 변경 뒤 실제 검증 결과와 남은 위험 보고
- 자신이 직접 생성한 subagent/thread만 lifecycle 관리한다는 소유 원칙

### Harness에 독립적인 책임

- domain과 실패 비용에 맞는 role team 설계
- `team-spec`을 중심으로 project-local agent·skill 생성
- Markdown 기반 상태 점검·정렬·개선과 하네스 Phase 재진입
- 구조·계약 관찰과 사용자 품질 판단 자료 준비

### Workflow Engine에 독립적인 책임

- GitHub fact 관측과 provenance 분류
- Definition, adapter, validator, evaluator의 deterministic task 계산
- immutable structured execution request/result correlation
- `.workflow-engine/settings.json` 지연 초기화와 인식 불가 값 fail-closed
- Issue·PR·review thread 상태 반영과 workflow 재개

두 runtime이 사용자 결정과 log를 모두 사용한다는 이유만으로 같은 schema나 공통 state store가 필요한
것은 아니다. 결정의 대상, 정본과 검증 가능성이 다르다.

## 소유권 충돌, 불명확성, 의도적인 차이

### 의도적인 차이 1. 검증 강도

Workflow Engine은 115개 회귀로 유한 상태와 실행 계약을 강하게 고정한다. Harness는 semantic 품질을
자동 pass/fail로 축소하지 않고 구조 검증과 사용자 판단을 분리한다. Harness test 수가 작다는 사실만으로
Workflow Engine과 같은 schema·fixture 체계를 추가하지 않는다.

### 의도적인 차이 2. 상태 정본

Workflow Engine의 협업 상태 정본은 GitHub이고 log는 auxiliary다. Harness의 역할 정본은 target
`team-spec`이고 Markdown log는 운영 재진입 상태다. 하나의 중앙 상태 저장소로 합칠 근거가 없다.

### 의도적인 차이 3. target asset 생성 시점

Harness는 명시적 구성 요청으로 local role team을 만든다. Workflow Engine은 현재 task가 설정,
template 또는 label을 처음 요구할 때 해당 범위만 lazy initialize한다. 설치가 target initialization을
암시하지 않는다.

### 명확한 co-location 1. `.harness/logs`

Harness와 Workflow Engine이 같은 상위 directory를 쓰지만 파일과 state authority는 다르다.
현재 contract와 실제 filename으로 소유자가 식별되므로 충돌로 판정하지 않는다. 향후 같은 filename이나
상충하는 retention 규칙이 생길 때만 다시 연다.

### 명확한 compatibility 1. `target-harness-code-editor`

installer에는 이전 배포 호환 자산으로 남아 있지만 현재 Definition은 이를 executor로 참조하지 않는다.
현재 active file-change owner는 `workflow-code-editor`다. 설치 목록 존재만으로 중복 owner로 판정하지
않는다.

### 경계 불명확성 1. user skill install 위치

**공식 Codex 사실**: 현재 공개 manual은 repository skill을 `.agents/skills`, user skill을
`$HOME/.agents/skills`에서 discovery한다고 설명한다.

**저장소 사실**: installer와 README는 기본 destination으로 `$CODEX_HOME/skills`, 현재 환경에서는
`/home/codechaser/.codex/skills`를 사용한다.

**현재 세션 사실**: 이 위치의 Harness와 Workflow Engine은 실제 discovery 목록에 나타났고 source와
18/18 parity로 실행됐다.

**조사 판단**: 현재 환경의 correctness bug는 아니다. 다만 최신 공개 discovery 위치와 저장소의 배포
계약이 다른 이유가 공식 compatibility인지 현재 integration의 별도 loader인지 repository만으로는
확정할 수 없다. 설치 경로를 바로 바꾸면 현재 사용자의 global skill, backup·uninstall 경로와
호환성을 깨뜨릴 수 있으므로 정책·호환성 확인 없이 수정하지 않는다.

### 경계 불일치 2. subagent close capability

**명시된 설계**: Harness `SKILL.md`, `logging-contract.md`와 완료 조건은 자신이 발급한 모든 subagent
ID의 결과를 보존한 뒤 `close_agent`를 호출하도록 요구한다. Workflow Engine의 agent lifecycle test도
owner별 cleanup 분리를 보호한다.

**공식 Codex 사실**: 현재 manual의 configuration reference는 multi-agent tool에 `spawn_agent`,
`send_input`, `resume_agent`, `wait_agent`, `close_agent`가 포함된다고 설명한다.

**현재 세션 사실**: 이번 host가 노출한 collaboration surface에는 spawn, message/follow-up, wait,
interrupt와 list는 있지만 `close_agent` 이름의 callable tool은 없다.

**조사 판단**: 이번 Day는 subagent를 생성하지 않았으므로 resource leak을 만들지는 않았다. 그러나 이
surface에서 Harness가 subagent를 실제 생성하면 현재 완료 조건의 cleanup evidence를 문서대로 만들 수
없다. `interrupt_agent`를 완료 thread close와 동등하다고 추정해서는 안 된다. 이는 중앙 runtime
부재가 아니라 guest contract와 host capability surface의 version·adapter 경계 문제다.

## 현재 분산 경계가 실제 문제를 만드는가

### 검증된 정상 분산

- source, installed copy와 target asset이 서로 다른 lifecycle로 동작한다.
- Harness와 Workflow Engine을 독립 설치·제거할 수 있다.
- Definition→adapter→validator→evaluator는 pure computation이고 side effect executor와 분리된다.
- current repository에 Target Harness가 없어도 general file-change path가 계약대로 존재한다.
- GitHub 정본과 auxiliary log의 우선순위가 명시돼 있다.
- shared `.harness` namespace와 compatibility skill은 현재 소유권 충돌을 만들지 않는다.

### 조사 당시 확인된 실제 경계 문제

- current host surface에서는 Harness가 요구하는 `close_agent` 완료 조건을 직접 충족할 수 없다.
- installer 위치는 현재 동작하지만 최신 공개 Codex discovery 문서와 차이가 있어 portability와 향후
  upgrade 책임이 불명확하다.

두 문제 모두 공통 schema, daemon, 중앙 registry 또는 두 runtime 통합으로 해결될 성격이 아니다.
필요한 것은 지원할 Codex surface와 capability detection·compatibility policy를 먼저 확정하는 것이다.

**후속 상태**: 두 문제 모두 중앙 runtime 통합 없이 각 실행 책임에 맞는 capability gate와 installer
계약 변경으로 해결됐다. 세부 근거는 `후속 해결 반영 (2026-08-02)`에 기록했다.

## Gap Analysis

### G1. Harness lifecycle contract와 current host close surface 불일치

#### 후속 상태 (2026-08-02)

해결됨. Issue #122와 PR #123에서 subagent를 만들기 전에 terminal close capability를 확인하도록 계약과
회귀 검사를 정렬했다. capability가 없는 surface에서는 새 agent ID를 만들지 않으며, 실행 주체의
의도적인 session 경계에 따라 주 에이전트 fallback 또는 spawn 전 중단을 선택한다.

#### 조사 당시 상태

Harness는 `close_agent` evidence를 완료 조건으로 요구하지만 current session에는 같은 이름의 callable
tool이 없다. 공식 manual에는 capability가 존재한다고 설명돼 있어 repository contract 자체가 임의
개념을 만든 것은 아니다.

#### 저장소 근거

- `.codex-dist/skills/harness/SKILL.md`
- `.codex-dist/skills/harness/references/logging-contract.md`
- `.codex-dist/skills/github-workflow-engine/references/agent-lifecycle-contract.md`
- Workflow Engine agent lifecycle regression test

#### 영향

Harness가 이 surface에서 subagent를 생성하면 작업 결과는 얻더라도 resource cleanup 완료를 계약대로
증명할 수 없어 Harness 완료 조건을 충족하지 못한다. 이름이 비슷한 다른 tool을 임의 대체하면 실제
thread state와 기록이 달라질 수 있다.

#### 가능한 원인

- Codex product surface별 tool adapter 차이
- current collaboration integration의 API naming 또는 capability subset
- repository contract가 기준으로 삼은 Codex version과 current session surface 차이

현재 근거로 하나를 확정하지 않는다.

#### 개선 선택지

1. 지원 Codex surface에서 `close_agent` availability를 확인하고 현재 계약을 유지한다.
2. host capability preflight와 surface별 cleanup mapping을 정의한다.
3. close capability가 없는 surface에서는 subagent를 생성하지 않고 주 에이전트 중심 실행으로 안전
   중단·degrade하는 정책을 정의한다.

#### 권장 방향

먼저 Day 2·3 실제 Harness scenario에서 callable lifecycle surface와 thread 종료 결과를 관측한다.
동등성 확인 전 `interrupt_agent`를 대체 구현으로 문서화하지 않는다. 지원 surface 정책이 결정된 뒤
최소 capability gate나 회귀 검사를 기능 제안으로 분리한다.

#### 변경하지 않을 경우

subagent를 사용한 Harness 실행이 결과를 만들고도 완료로 선언할 수 없거나, cleanup 상태를 부정확하게
기록할 수 있다.

### G2. installer destination과 최신 공개 skill discovery 위치 차이

#### 후속 상태 (2026-08-02)

해결됨. Issue #124와 PR #125에서 기본 user skill root를 `$HOME/.agents/skills`로 전환하고 backup을 active
discovery root 밖으로 분리했다. 명시적 destination·backup override는 유지하며, 내부 테스트 단계에서
사용자 결정한 대로 `$CODEX_HOME/skills` legacy 설치·탐지·이관·제거는 지원하지 않는다.

#### 조사 당시 상태

repository installer는 `$CODEX_HOME/skills`를 사용하고 current host는 이 경로를 실제 discovery한다.
최신 공개 manual은 user scope를 `$HOME/.agents/skills`로 설명한다.

#### 저장소 근거

- `install.sh`, `uninstall.sh`, `README.md`
- current installed tree `/home/codechaser/.codex/skills/*`
- current session available skill paths
- 공식 Codex `Build skills`

#### 영향

현재 environment에서는 영향이 없다. 다른 최신 Codex surface가 `$CODEX_HOME/skills` compatibility를
제공하지 않으면 설치 성공 메시지 뒤 skill이 discovery되지 않을 가능성이 있다. 반대로 즉시 destination을
바꾸면 기존 설치·backup·uninstall과 사용자 운영 경로를 깨뜨릴 수 있다.

#### 가능한 원인

- 문서화되지 않은 compatibility loader
- current integration의 추가 skill root
- Codex skill location migration 중 legacy/current 경로 공존

#### 개선 선택지

1. 현재 destination을 유지하고 지원 근거를 더 수집한다.
2. 두 경로의 discovery를 읽기 전용으로 probe하고 명확한 우선순위·migration 정책을 정한다.
3. 공식 경로로 이동하되 backup, duplicate name과 uninstall migration을 함께 설계한다.

#### 권장 방향

Day 3 activation observation에서 새 독립 Codex session과 설치 직후 discovery를 관측한 뒤 정책 검토한다.
현재 한 session의 성공만으로 모든 surface compatibility를 일반화하지 않는다.

#### 변경하지 않을 경우

현재 환경은 계속 동작하지만 공식 discovery contract와 차이의 유지보수 책임이 남는다.

## 변경 유형 분류

### 즉시 수정

Day 1 조사 종료 시점에는 재현된 코드 오류가 없어 `없음`으로 분류했다. 이후 사용자가 두 경계 문제를
즉시 해결 대상으로 확정했고 다음과 같이 반영을 완료했다.

| ID | 해결 내용 | 상태 |
| --- | --- | --- |
| P2-D1-1 | subagent terminal close capability preflight와 실행 주체별 fallback·중단 계약 | 해결됨 — Issue #122, PR #123, merge `02c477c` |
| P2-D1-2 | 공식 user skill root, 외부 backup, override와 legacy 무지원 설치 계약 | 해결됨 — Issue #124, PR #125, merge `1bb2f7c` |

### 정책 검토 필요 — 조사 당시 후보

아래 질문은 후속 사용자 결정과 기능변경으로 해소됐으며 현재 활성 정책 검토 항목이 아니다.

| ID | 당시 결정 질문 | 확정 결과 |
| --- | --- | --- |
| P2-D1-1 | close capability가 없는 host에서 Harness가 subagent를 금지·degrade·중단할지 | 첫 spawn 전 capability gate를 적용하고, 실행 주체별로 주 에이전트 fallback 또는 중단한다. |
| P2-D1-2 | `$CODEX_HOME/skills`를 유지할지 공식 user scope로 이동할지 | `$HOME/.agents/skills`만 기본 경로로 사용하고 legacy compatibility는 지원하지 않는다. |

### 기능 제안 필요

Day 1 조사 종료 시점에는 정책 확정 전이라 없었다. 이후 두 항목 모두 기능변경 이슈로 전환해 구현,
리뷰, 병합과 완료 기준 반영까지 마쳤다. 추가 기능 제안은 남아 있지 않다.

### 보류

| 후보 | 보류 이유 | 재검토 조건 |
| --- | --- | --- |
| Harness와 Workflow Engine 중앙 runtime | 현재 독립 책임과 handoff가 동작하며 확인된 두 문제를 해결하지 않음 | 분산 경계 때문에 중복 side effect나 상태 손실이 반복될 때 |
| 공통 state schema | GitHub fact와 semantic team state의 성격이 다름 | 같은 사실의 drift가 두 runtime에서 반복될 때 |
| 공통 installer manifest | 독립 목록 유지 정책과 현재 18/18 parity가 확인됨 | 실제 install/uninstall 누락이 반복될 때 |
| `.harness` 물리 분리 | filename owner와 authority가 현재 명확함 | collision·retention·잘못된 state 우선순위 사례가 생길 때 |
| `target-harness-code-editor` 즉시 제거 | compatibility asset이며 active Definition owner가 아님 | 지원 종료 정책과 설치 migration이 결정될 때 |
| Harness 검증을 Workflow Engine 수준으로 확대 | semantic 책임을 같은 fixture 강도로 만들 근거가 없음 | 반복 가능한 deterministic Harness failure가 확인될 때 |

## 다음 Day 대표 실행 시나리오

### Harness 시나리오 H-D2

**신규 타겟의 최초 Harness 구성부터 Phase 6 사용자 결정 대기까지**를 추적한다.

- 최초 입력: local Harness asset이 없는 타겟에서 프로젝트 역할 팀 구성 요청
- 추적 이유: source→installed skill→target asset 생성 경계, `team-spec` 정본, role handoff, Markdown state,
  사용자 결정과 Phase 7 gate를 한 흐름에서 볼 수 있다.
- 필수 관측: 실제 활성화 문서, 생성 순서, tool과 optional subagent capability, failure·보류, session log,
  `close_agent` availability
- 종료점: 구조·계약 결과와 선택지 영향을 제시하고 사용자 결정 전 파일 개선을 시작하지 않은 상태

Day 2에서 적절한 disposable target이나 기존 target evidence가 없으면 파일을 임의 생성해 성공한 것처럼
다루지 않고, 실제 target 확보 필요를 선행 조건으로 기록한다.

### Workflow Engine 시나리오 W-D2

**기능변경 Issue #118에서 PR #119 완료까지의 feature-change→implementation 흐름**을 현재 Definition과
historical log·GitHub 상태로 재구성한다.

- 선택 이유: `.workflow-engine/settings.json` 소유권 이전, `FC`에서 `FI` handoff, 사용자 결정,
  structured execution, file change, review와 merge 후 반영을 모두 포함한다.
- 실제 경계 근거: 당시 target Harness는 global skill만 있고 project-local entry가 없어
  `general_code_change`를 선택했다.
- 최신성 원칙: historical log는 호출 순서의 보조 근거로만 쓰고 GitHub와 current source를 다시 조회한다.

### 교차 비교 subcase

같은 immutable file-change request에 대해 target Harness가 준비된 경우와 준비되지 않은 경우의 실행
시작 전 경로 선택을 비교한다. 어느 경로든 시작 뒤 fallback을 금지하고 같은 structured result 검증을
적용하는지 확인한다. 이는 두 runtime을 합치기 위한 비교가 아니라 handoff 경계가 중복 변경을 막는지
검증하기 위한 비교다.

## 오늘 새롭게 이해한 것

- Codex는 범용 host runtime이고 두 package는 그 위의 서로 다른 guest contract다.
- Harness의 runtime은 별도 executable보다 주 에이전트, target role team과 Markdown state의 실행
  조합이다.
- Workflow Engine의 deterministic core는 GitHub API 자체가 아니라 Definition→adapter→validator→
  evaluator의 pure path다.
- thin skill은 workflow를 나눠 소유하지 않고 후보·관측·제한 실행만 맡는다.
- global Harness가 설치돼 있다는 사실만으로 target Harness 실행 경로가 준비되지는 않는다.
- source와 installed parity는 설치 상태의 관측이며 소유권 통합의 근거가 아니다.
- 현재 분산 경계는 중앙 runtime 없이도 동작한다. 새로 드러난 문제는 중앙화보다 host capability와
  install compatibility 경계에 가깝다.

## 기존 생각이 바뀐 부분

- Phase 1에서는 Harness discovery 비용이 가장 큰 미검증 가설이었지만, Day 1의 더 이른 runtime
  boundary에는 host가 실제 제공하는 skill root와 subagent lifecycle capability도 포함된다.
- `.harness/logs`를 두 runtime이 사용한다는 사실은 곧 상태 소유권 충돌이 아니다. filename, authority와
  conflict resolution이 분리돼 있다.
- Workflow Engine의 많은 `executor_reference=null` task는 executor 누락이 아니라 primary가 사용자
  결정 또는 결정론적 tool path를 조율하는 의도된 경계다.
- current repository의 general code path 선택은 Harness fallback 실패가 아니라 target-local readiness
  검증의 정상 결과다.

## 저장소에서 확인한 근거

### Harness

- `.codex-dist/skills/harness/SKILL.md`
- `.codex-dist/skills/harness/references/reference-map.md`
- `.codex-dist/skills/harness/references/codex-runtime-contract.md`
- `.codex-dist/skills/harness/references/initial-generation-contract.md`
- `.codex-dist/skills/harness/references/logging-contract.md`
- `.codex-dist/skills/harness/references/reentry-rules.md`
- `.codex-dist/skills/harness/references/phase-selection-matrix.md`
- `.codex-dist/skills/harness/tests/user-decision-boundary.test.mjs`

### Workflow Engine

- `.codex-dist/skills/github-workflow-engine/SKILL.md`
- `.codex-dist/skills/github-workflow-engine/definitions/*.json`
- `.codex-dist/skills/github-workflow-engine/scripts/workflow-definition/*.mjs`
- `.codex-dist/skills/github-workflow-engine/references/workflow-definition-contract.md`
- `.codex-dist/skills/github-workflow-engine/references/normalized-fact-adapter-contract.md`
- `.codex-dist/skills/github-workflow-engine/references/state-observation-contract.md`
- `.codex-dist/skills/github-workflow-engine/references/structured-execution-contract.md`
- `.codex-dist/skills/github-workflow-engine/references/file-change-execution-contract.md`
- `.codex-dist/skills/github-workflow-engine/references/target-harness-execution-contract.md`
- `.codex-dist/skills/github-workflow-engine/references/target-runtime-bootstrap-contract.md`
- `.codex-dist/skills/github-workflow-engine/tests/**`
- Workflow Engine 계열 16개 보조 `SKILL.md`

### 설치·타겟·운영

- `install.sh`, `uninstall.sh`, `README.md`
- `docs/github-workflow-engine.md`
- `/home/codechaser/.codex/skills/*` current installed copy
- `.workflow-engine/settings.json`
- `.github/ISSUE_TEMPLATE/*`, `.github/pull_request_template.md`
- `.harness/logs/github-workflow-log.md`
- current GitHub open Issue·PR 조회

## 현재 구조의 강점

- host runtime과 repository guest contract가 분리돼 있다.
- source, installed copy와 target asset의 갱신 책임이 다르다.
- Harness의 semantic 판단과 Workflow Engine의 deterministic 계산을 같은 schema로 축소하지 않는다.
- Workflow Engine은 상태 수집, source validation, normalization, definition validation, evaluation과
  side effect를 단계별로 분리한다.
- thin skill이 사용자 결정이나 전이를 자체 확정하지 않아 control plane이 분산되지 않는다.
- Harness handoff는 Workflow 전용 정보를 제거한 일반 요청이며 시작 뒤 fallback을 금지한다.
- GitHub 정본과 auxiliary log의 conflict priority가 명확하다.
- target 설정·template의 lazy initialization이 설치와 독립적이다.
- 결정론적 오류는 fail-closed, semantic 변경 범위는 사용자 확인으로 전환된다.

## 개선 후보

- P2-D1-1과 P2-D1-2는 구현과 회귀 검사까지 완료되어 활성 개선 후보에서 제거한다.
- 실제 Harness scenario에서는 capability gate가 첫 spawn 전에 작동하고 실행 주체별 fallback·중단 차이가
  유지되는지 회귀 관측한다.
- 새 independent session에서는 `$HOME/.agents/skills` 설치·활성화와 discovery root 밖 backup 동작을
  회귀 관측한다.

## 남은 의문

### 해소된 운영 질문

- close capability가 확인되지 않은 surface에서는 대체 mapping을 추정하지 않고 첫 spawn 전에
  fallback·중단한다.
- installer는 `$HOME/.agents/skills`만 공식 user scope로 사용하며 `$CODEX_HOME/skills` compatibility를
  지원 계약으로 두지 않는다.

### 계속 조사할 질문

1. disposable target에서 최초 Harness 구성 시 항상 읽히는 상위 contract와 실제로 선택되는 leaf는
   무엇인가?
2. target Harness 준비도 확인 결과를 현재 계약만으로 부수 효과 없이 일관되게 재현할 수 있는가?
3. 14,000줄이 넘는 current Workflow log가 Day 2 lifecycle 재구성에서 필요한 checkpoint를 실제로
   빠르게 제공하는지, GitHub 재관측보다 불필요한 재해석을 늘리는지는 아직 검증되지 않았다.

## 다음 Day의 선행 조건

1. Harness H-D2를 실제로 관측할 수 있는 target 또는 보존된 독립 실행 evidence를 확보한다.
2. subagent를 사용할 경우 capability gate가 첫 spawn 전에 current tool surface를 확인하는지 검증한다.
   terminal close capability가 없으면 실제로 새 ID를 만들지 않고 실행 주체별 fallback·중단 결과를
   lifecycle evidence로 기록한다.
3. Workflow Engine W-D2는 current Definition, adapter와 evaluator를 다시 실행하고 GitHub Issue #118,
   PR #119 상태를 authoritative하게 재조회한다.
4. historical `.harness/logs/github-workflow-log.md`는 순서·request ID의 보조 근거로만 사용한다.
5. source, installed copy와 target asset을 lifecycle 단계마다 별도 열로 기록한다.
6. 자동 진행, 사용자 결정, fail-closed, 보류, 성공과 terminal completion을 구분한다.
7. P2-D1-1과 P2-D1-2는 해결된 기준선으로 사용하며, Day 2·3에서는 정책을 다시 여는 대신 실제
   scenario의 회귀 여부를 관측한다.

## Day 1 완료 조건 점검

- [x] Harness runtime boundary를 입력, 실행, 상태, 실패와 결과 책임으로 설명했다.
- [x] Workflow Engine runtime boundary를 Definition, adapter, validator, evaluator와 executor 경계로
  설명했다.
- [x] Codex, 저장소, GitHub, 사용자와 타겟 프로젝트의 책임을 구분했다.
- [x] source package, installed copy와 generated·initialized target asset을 실제 경로로 구분했다.
- [x] thin skill과 외부 dependency skill의 책임을 구분했다.
- [x] 두 runtime의 공유 기반, 독립 책임과 일반 file-change handoff를 설명했다.
- [x] 소유권 충돌이 아닌 의도적인 차이와 실제 host boundary 불일치를 분리했다.
- [x] 중앙 runtime을 전제하지 않고 현재 분산 경계가 만드는 실제 문제를 먼저 검증했다.
- [x] 다음 Day에서 추적할 Harness와 Workflow Engine 대표 scenario를 선정했다.

**Day 1 판단**: 두 runtime의 현재 경계는 대부분 의도적으로 분산돼 있고 source·installed·target
lifecycle도 구분된다. 중앙 runtime이나 공통 schema가 필요하다는 근거는 없다. 활성 후속 질문은
Harness contract가 기대하는 subagent close capability와 current host surface의 차이, 그리고 installer
destination과 최신 공개 Codex skill root의 compatibility다. 둘 다 실제 lifecycle·activation 관측이
선행돼야 하며 오늘 공식 runtime 자산을 변경할 근거는 아니다.

**후속 반영 판단 (2026-08-02)**: 사용자가 두 항목을 즉시 해결 대상으로 확정한 뒤 각각 독립된
기능변경 흐름으로 구현·검증·병합했다. G1은 host capability를 저장소가 구현하거나 `interrupt_agent`로
대체하지 않고 spawn 전 gate와 실행 주체별 fallback·중단으로 해결했다. G2는 migration이나 dual-path
지원을 추가하지 않고 공식 `$HOME/.agents/skills` 단일 기본 경로와 외부 backup으로 해결했다. 따라서
두 항목은 더 이상 활성 문제나 Day 2 진행 blocker가 아니며, 다음 Day에서는 반영된 경계가 실제
scenario에서도 유지되는지를 검증한다.
