# Phase 2 Day 2 — Request and Execution Lifecycle

## 문서 성격

이 문서는 현재 체크아웃된 저장소와 브랜치를 기준으로 Harness와 GitHub Workflow Engine 역할을 수행하는
`github-agentic-loop`의 대표 요청 생명주기를 재구성한 학습 보고서다. 공식 설계나 정책을 대체하지 않으며,
개선 후보는 별도 사용자 결정과 Issue·PR을 거치기 전까지 요구사항으로 취급하지 않는다.

본문은 근거의 성격을 다음처럼 구분한다.

- **저장소 사실**: 현재 checkout의 파일, Git·GitHub 조회 또는 직접 실행 결과로 확인한 내용
- **현재 host 관측**: 이 세션에 노출된 skill metadata와 user skill root에서 확인한 내용
- **명시된 설계**: 현재 `SKILL.md`, reference와 Definition이 선언한 책임
- **역사적 실행 근거**: 당시 로그와 GitHub 이력에 남은 실제 요청·실행·검증 결과
- **조사 판단**: 위 근거를 연결한 해석 또는 후속 관측 후보

역사적 실행 근거의 경로와 이름이 현재와 다르면 현재 계약으로 소급해 같은 값이었다고 쓰지 않는다.
특히 현재 배포 식별자는 `github-agentic-loop`, target 설정·로그 경로는 `.github-agentic-loop/*`다.
`github-workflow-engine`, `.workflow-engine/settings.json`, `.harness/logs/github-workflow-log.md`는 각각 과거
식별자·경로 또는 역사 기록으로만 구분한다.

## 후속 재설치 반영 (2026-09-02)

Day 2 최초 조사 뒤 사용자가 global Codex skill을 다시 설치했다. 재설치 후 공식 user skill root인
`$HOME/.agents/skills`에 Harness 1개와 Workflow Engine 계열 17개, 총 18개 관리 skill이 존재하며 current
source tree와 18/18 일치한다. `harness`, `github-agentic-loop`, `feature-plan`, `branch-proposal`,
`github-simple-executor`의 대표 `SKILL.md` hash도 source와 installed copy가 동일하다.

현재 session의 discovery metadata에는 `$HOME/.agents/skills/github-agentic-loop`와 current companion
skills가 새로 노출된다. 동시에 installer가 지원 대상으로 관리하지 않는 `$HOME/.codex/skills`의 legacy
`harness`, `github-workflow-engine`과 backup copies도 metadata에 남아 있다. 따라서 source→official
installed copy parity는 회복됐지만, 새 session에서 current identifier가 실제로 선택되고 legacy 후보가
배제되는지는 Day 3 activation 관측으로 남긴다. 재설치 전 관측과 그로부터 도출한 영향은 아래 각 절에
후속 상태와 분리해 보존한다.

## 오늘 학습한 개념

### Request Lifecycle과 Execution Lifecycle

Request lifecycle은 사용자의 자연어 입력이 어느 runtime과 workflow로 분류되고, 필요한 상태와 계약을
찾아 현재 작업이 확정되는 과정이다. Execution lifecycle은 확정된 작업이 실행 주체에 전달되고,
부수 효과·검증·상태 반영·보고를 거쳐 종료되거나 재개 조건을 남기는 과정이다.

두 과정은 항상 같은 지점에서 시작하지 않는다. Harness는 의미가 약한 입력을 질문과 입력 문서로
보강하면서 실행 경로를 구성한다. `github-agentic-loop`는 요청을 유한 fact로 바꿀 근거가 충분한 경우에만
Definition 평가를 시작한다.

### Entry, Dispatch, Activation, Execution, Verification, Completion

- `Entry`: 사용자 요청과 대상 저장소가 현재 session에 들어온다.
- `Dispatch`: Codex host가 skill metadata와 저장소 지시를 바탕으로 소유 runtime을 선택한다.
- `Activation`: 선택한 `SKILL.md` 전체와 현재 판단에 필요한 reference·Definition·code를 읽는다.
- `Execution`: Harness 역할 또는 Workflow Engine이 확정한 executor가 제한된 작업을 수행한다.
- `Verification`: 구조·계약, request-result correlation, 사후조건과 테스트를 확인한다.
- `Completion`: 성공, 사용자 결정 대기, 보류, fail-closed 중단 또는 terminal 완료를 보고하고 재개 입력을 남긴다.

### Synchronous Boundary

현재 두 runtime 모두 별도 장기 daemon이 아니다. Codex session 안에서 문서와 코드를 읽고 tool을 호출하며,
현재 응답 전에 결과를 통합한다. 별도 session을 쓰는 optional subagent나 executor가 있더라도 발급 주체가
수명 주기를 소유하며, 결과 소비와 resource cleanup은 workflow 완료와 별도로 확인한다.

### Human Decision Boundary

Harness에서 사용자는 semantic 품질과 실제 하네스 변경 범위를 확정한다. Workflow Engine에서 사용자는
Definition의 `user_decision_options`가 요구하는 초안, 계획, 브랜치, 커밋, 리뷰·피드백·병합 방향을
확정한다. 추천이나 artifact 후보는 결정값이 아니다.

### Terminal과 Non-terminal Outcome

- `terminal`: 해당 요청의 완료 조건이 권위 있는 상태에 반영되어 다음 action이 없다.
- `사용자 결정`: 현재 action은 유효하지만 사용자 입력 없이는 완료 predicate를 충족할 수 없다.
- `보류`: 의미 입력이나 확인 근거가 부족해 현재 범위를 확정하지 못했다.
- `fail-closed 중단`: 계약·상태·source·baseline·실행·검증이 불일치해 부수 효과를 시작하거나 성공으로
  사용할 수 없다.
- `부분 실행 후 중단`: 부수 효과 시작 뒤 실패 가능성이 있어 다른 경로로 fallback하지 않고 실제 변경과
  복구 조건을 남긴다.

## 조사 기준선

### Git과 GitHub

- **저장소 사실**: 조사 시작과 문서 작성 전 branch는 `docs/repository-evolution-workshop`, HEAD는
  `55676473207de53d76a488b4d5db6219b4d237bb`이다.
- **저장소 사실**: `origin/main`은 `e0a3f690ce0e58e31c8eac1d5a198625ab05541a`이며 현재 HEAD의 ancestor다.
- **저장소 사실**: `origin/main...HEAD` divergence는 `0/11`이고 차이는 Repository Evolution Workshop
  학습 문서뿐이다. 따라서 checkout의 runtime source는 현재 `origin/main`을 포함한다.
- **저장소 사실**: 조사 시작 작업 트리는 clean이었다.
- **저장소 사실**: 열린 PR은 없고, 열린 Issue는 이 작업과 별개인 프로젝트 이름 변경 정책검토 #37 한
  건이다.
- **저장소 사실**: PR #127은 runtime·skill 식별자를 `github-agentic-loop`로 옮겼고 현재 `main`에
  포함된다.
- **저장소 사실**: PR #136은 실제 lifecycle 실패가 확인되지 않은 #128·#129의 compiled runtime,
  artifact, snapshot·derived index 계층을 되돌렸다. rollback 뒤 Workflow Engine runtime tree는 PR #127
  기준과 일치한다.

### source, installed copy와 target 상태

| 위치 | 현재 관측 | lifecycle 의미 |
| --- | --- | --- |
| source package | `.codex-dist/skills/harness`, `.codex-dist/skills/github-agentic-loop`와 companion skills | 다음 설치에 배포할 현재 계약 |
| 공식 user skill root | `$HOME/.agents/skills`에 관리 skill 18개가 있고 source와 18/18 parity | current 배포의 installed copy |
| 현재 host discovery snapshot | `$HOME/.agents/skills/github-agentic-loop`와 current companion skills가 노출되며 `$HOME/.codex/skills`의 legacy·backup 후보도 함께 노출됨 | current activation 후보가 생겼지만 legacy 후보 배제는 미관측 |
| Workflow target config | `.github-agentic-loop/settings.json` | 현재 Workflow Engine target 설정 |
| Workflow auxiliary log | `.github-agentic-loop/logs/github-workflow-log-YYYY-MM-DD.md` | 날짜별 보조 재개 기록 |
| 현재 target Harness | `.codex/agents`, `.agents/skills`, `.harness/docs`, Harness session log·latest summary 조합 없음 | 이 저장소는 project-local Harness target으로 준비되지 않음 |
| 보존 Harness 평가 | `.harness/evaluations/targets/hakakorea_second_frontend/2026-05-09-refresh-harness-meta.md` | 구계약에서 수행된 실제 타겟 관찰 corpus |

재설치 전에는 `$HOME/.agents/skills`의 관리 skill이 없었고 `$HOME/.codex/skills`의 old
`github-workflow-engine` tree와 current `github-agentic-loop` tree가 13개 파일 차이를 보였다. 재설치 후
공식 root의 18개 tree는 모두 current source와 일치한다. `$HOME/.codex/skills`의 legacy tree는 별도
위치에 그대로 존재하며 current session metadata에도 후보로 노출된다.

### 읽은 현재 입력

- Workshop execution guide, Phase 2 계획, Phase 1 summary와 Phase 2 Day 1 결과
- current source의 Harness `SKILL.md`, `reference-map.md`, `target-evaluation-playbook.md`,
  `reentry-rules.md`, `phase-selection-matrix.md`, `verification-checklist.md`, `logging-contract.md`
- current source의 `github-agentic-loop/SKILL.md`, `feature-change.json`, `implementation.json`, state adapter,
  normalized adapter, validator, evaluator와 CLI
- `state-observation-contract.md`, `user-decision-contract.md`, `structured-execution-contract.md`,
  `file-change-execution-contract.md`, `target-harness-execution-contract.md`
- `feature-plan`, `branch-proposal`, `github-simple-executor`의 current source contract
- Issue #118, PR #119와 역사적 Workflow log
- 보존된 `hakakorea_second_frontend` Harness 평가 corpus

### 직접 실행 결과

| 검증 | 결과 |
| --- | --- |
| current Workflow Engine 집계 | 122/122 통과, fail·cancel·skip 0 |
| Harness 사용자 결정 경계 | 3/3 통과 |
| 재설치 후 source와 공식 installed copy 비교 | 관리 skill 18/18 tree parity |
| current `feature-change.json` CLI validator | `status=valid`, errors 0 |
| feature-change 대표 state 직접 evaluator 실행 | `FC-1`, `FC-3`, `FC-4`, `FC-5`, `FC-6`, terminal `FC-7` 기대값 일치 |
| implementation 초기 state 직접 evaluator 실행 | `FI-1` branch proposal 대기, 확정 후 `FI-2`, branch 전환 후 `FI-3` 일치 |
| 불완전한 FC-1 재개 state 직접 실행 | `stopped/current_task_action_condition_not_met` |
| `sh -n install.sh`, `sh -n uninstall.sh`, `git diff --check` | 통과 |

집계 검사는 Definition 구조·의미, source provenance, evaluator, 재개, user decision, runtime reference,
agent lifecycle, installer의 새·legacy 식별자 처리를 포함한다. Harness 검사는 구조·계약 결과와 품질·변경
범위 결정 권한을 구분한다.

## 먼저 구분할 두 runtime의 실행 책임

### Harness

Harness는 저장소 의미를 다시 읽고 프로젝트에 맞는 역할 팀과 운영 구조를 생성·평가하는 semantic
runtime이다. `team-spec`을 역할 정본으로 두고, agent·role skill·운영 문서·로그를 정렬한다. 구조적으로
확인 가능한 항목은 통과·실패로 기록하지만 품질과 실제 변경 범위는 사용자에게 남긴다.

### GitHub Workflow Engine (`github-agentic-loop`)

Workflow Engine은 GitHub·로컬·사용자·skill output을 provenance가 있는 유한 fact로 정규화하고,
Definition과 evaluator로 현재 action 하나를 계산하는 deterministic control plane이다. artifact skill은
후보만 만들고, executor는 확정된 structured request 범위만 수행한다.

### 같은 구조로 합치지 않는 이유

Harness의 성공은 타겟 의미에 맞는 역할 구조와 사용자 수용 범위에 의존한다. Workflow Engine의 action
계산은 같은 Definition과 normalized facts에 대해 동일해야 한다. 공통 단계 이름은 비교를 위한 관찰
형식일 뿐 공통 state schema, 공통 terminal 조건 또는 중앙 executor를 요구하지 않는다.

## 시나리오 H-D2 — 신규 타겟 Harness 구성부터 사용자 결정 대기까지

### 최초 사용자 입력

대표 입력은 다음처럼 정의한다.

```text
이 저장소에 맞는 프로젝트 로컬 하네스 역할 팀을 처음 구성해 주세요.
현재 저장소를 다시 읽고 생성 결과와 운영상 선택지를 검증해 주세요.
```

타겟에는 아직 `.codex/config.toml`, `.codex/agents/*`, `.agents/skills/*`, `.harness/docs/team-spec.md`,
Harness session log와 latest summary가 없다고 가정한다. 이는 Day 1이 선택한 신규 target 조건이다.

### Entry와 activation

1. Codex host가 `harness` metadata를 discovery하고 요청과 description을 매칭한다.
2. 선택하면 installed `harness/SKILL.md` 전체를 읽는다.
3. Harness Phase 0에서 target의 `AGENTS.md`, `.codex/config.toml`, `.codex/agents`, `.agents/skills`,
   `.harness/docs`, `.harness/logs`를 조회한다.
4. 자산이 없으면 `신규 구축`으로 분류하고 Harness Phase 1부터 전체 흐름을 선택한다.
5. `reference-map.md`를 먼저 읽고 현재 판단 축에 필요한 leaf만 활성화한다.

**현재 host 관측**: 재설치 후 공식 installed copy는 current source와 일치하고 current `harness` metadata가
노출된다. 동시에 `$HOME/.codex/skills`의 legacy `harness`와 backup metadata도 남아 있다. 따라서
source-installed parity는 통과했지만 위 1~2단계에서 어느 중복 후보가 실제 선택되는지는 새 session
activation 관측이 필요하다.

### Phase별 execution lifecycle

| 단계 | 핵심 입력과 조회 | 자동 진행 가능한 작업 | 검증·상태 반영 | 경계와 종료 가능성 |
| --- | --- | --- | --- | --- |
| Phase 0 감사 | target local 자산, 저장소 지시, 기존 로그 | 상태 모드와 최초 Phase 후보 선정 | 감사 근거와 세션 시작 정보 기록 | 입력·소유권 충돌이면 질문·보류 |
| Phase 1 분석 | 저장소 source, 사용자 도메인 설명, 선택 leaf | 목적·경계·실패 비용과 질문 분리 | `domain-analysis.md` 등 입력 근거 | 핵심 의미가 부족하면 1~3개 질문 후 보류 |
| Phase 2 역할 설계 | Phase 1 결과, pattern·Team Spec 계약 | 역할 inventory, handoff, 완료 기준 후보 설계 | fenced inventory와 `team-spec` 구조 검증 | 역할 경계가 확정 불가하면 사용자 확인 |
| Phase 3 agent 생성 | `team-spec` | `.codex/config.toml`, `.codex/agents/*.toml`, `AGENTS.md` 생성 | 역할 집합·description·entry 정합 검사 | `team-spec` 불일치 시 실패 |
| Phase 4 role skill 생성 | `team-spec` 역할별 section | `.agents/skills/*/SKILL.md` pointer 생성 | role ID와 공통 output block reference 검사 | 0개·복수·잘못된 pointer면 실패 |
| Phase 5 orchestration | 역할·skill·운영 문서 | `run-harness`, 다음 역할, 정상·보류·실패·재진입 연결 | `orchestration-plan`, logging contract 정렬 | 정확한 변경 역할을 하나로 고를 수 없으면 미수정 중단 |
| Phase 6 운영 감사 | 생성 자산, verification checklist, logs | 구조·계약 통과·실패와 관찰·불확실성 정리 | `현재 유지 / 부분 수정 / 구조 재설계`의 영향, latest summary 기록 | 항상 `사용자 결정 대기`에서 동기 중단 |
| Phase 7 반영 | 사용자 선택과 exact 변경 범위 | 확정 범위만 수정·재검증 | 실제 변경·학습 후보·재진입 정보 기록 | 사용자 결정 없거나 범위 불명확하면 Phase 6으로 복귀 |

### local 조회와 외부 조회

- 기본 흐름의 정본과 생성물은 target local file이다. 저장소 source, Git history와 test command도 local
  조회다.
- 외부 서비스 조회는 Harness 자체의 필수 control plane이 아니다. target 의미나 검증에 GitHub·외부
  상태가 실제로 필요할 때 선택적으로 사용한다.
- Codex tool permission, sandbox와 optional subagent session은 host가 제공한다.
- current contract는 optional subagent의 첫 spawn 전에 callable `close_agent`를 확인한다. 없으면 신규
  ID를 발급하지 않고 주 에이전트 same-session 경로로 계속한다. exactly-ten independent session 같은
  별도 session 필수 경로는 spawn 전에 중단한다.

### 검증과 실패 후 흐름

1. 운영 감사 역할은 `verification-checklist.md`의 파일·필드·참조·역할 집합·로그 조건을 검사한다.
2. 구조 조건은 `통과 / 실패`로 기록하지만 전체 품질 verdict로 확대하지 않는다.
3. 입력 부족은 가장 이른 약한 축으로 재진입 후보를 만든다.
4. 역할 또는 code editor 후보가 0개·복수이거나 계약이 불일치하면 파일을 수정하지 않는다.
5. optional subagent 실패·timeout과 resource cleanup 실패는 별도 상태로 기록한다.
6. Phase 6 뒤에는 관찰과 세 선택지의 영향을 보고하고 사용자 결정을 기다린다.
7. 사용자가 `현재 유지`를 선택하면 변경 없이 terminal 종료할 수 있다. `부분 수정` 또는 `구조 재설계`를
   선택하면 Phase 7과 필요한 선행 Phase로 재진입한다.

### 종료 상태와 결과 보고

| 결과 | terminal 여부 | side effect | 보고·재개 정보 |
| --- | --- | --- | --- |
| Phase 6 사용자 결정 대기 | non-terminal | Phase 7 개선 없음 | 검증 결과, 불확실성, 세 선택지 영향, 다음 재진입 Phase |
| 현재 유지 | terminal for current request | 추가 하네스 변경 없음 | 수용한 관찰·잔여 위험 |
| 부분 수정 확정 | non-terminal | 확정 파일·Phase만 Phase 7에서 변경 | exact 범위, 검증, 다음 시작 역할 |
| 구조 재설계 확정 | non-terminal | 확정 범위에서 Phase 0/2부터 재진입 | 보존·교체 범위와 새 검증 |
| 입력 부족 보류 | non-terminal | 불명확 범위 변경 없음 | 필요한 사용자 입력과 재진입 Phase |
| 계약·라우팅 실패 | non-terminal safe stop | 파일 미수정 또는 실제 부분 변경만 보존 | 실패 축, 실제 변경 여부, 복구 조건 |

### 실제 관측 범위와 한계

- **저장소 사실**: 현재 저장소는 project-local Harness target이 아니므로 여기서 신규 Harness를 생성하면
  분석 범위를 넘어 실제 target asset을 만드는 부수 효과가 발생한다. 이번 Day에는 생성하지 않았다.
- **역사적 실행 근거**: `hakakorea_second_frontend` 평가 corpus는 agent·skill·`team-spec`·logs를 실제로
  읽은 관찰을 보존한다. 다만 당시 `재작성 필요` verdict와 `.codex/skills/*` 경로는 current 계약과 다르다.
- **명시된 설계와 직접 검사**: current source는 Phase 6의 사용자 결정 대기와 Phase 7 범위 gate를
  명시하고, 3개 회귀 검사가 이를 통과했다.
- **조사 판단**: H-D2의 current intended lifecycle은 재구성할 수 있지만, current source로 생성한
  disposable target의 end-to-end 성공·실패·실제 활성화 문서 순서는 아직 관측되지 않았다. 이를 성공한
  실제 실행으로 기록하지 않는다.

## 시나리오 W-D2 — Issue #118에서 PR #119 완료까지

### 최초 사용자 입력

역사 로그의 시작 입력은 Phase 1 D6-3 개선 방향을 기능변경 흐름으로 진행하는 요청이었다. 의미를 현재
진입 형식으로 정리하면 다음과 같다.

```text
Workflow Engine 설정 정본을 Harness와 분리하는 기능변경을 Workflow 흐름으로 진행해 주세요.
누락 설정은 지연 초기화하고 인식 불가 값은 fail-closed로 중단하는 범위를 유지해 주세요.
```

현재 GitHub 재조회 결과 Issue #118은 `CLOSED/COMPLETED`, PR #119는 `MERGED`이며 merge commit은
`db40b1cbe65202f58897eeb66820c104d7af2f67`이다.

### Entry, dispatch와 activation

1. host가 workflow 시작 요청과 skill description을 매칭한다.
2. 현재 source가 정의한 활성화 대상 식별자는 `github-agentic-loop`다. 역사 실행 당시 이름은
   `github-workflow-engine`이었다.
3. primary는 target repository, 기준 요청·Issue·PR과 local baseline을 식별한다.
4. `state-observation-contract.md`, 선택한 `feature-change.json`, feature-change state adapter,
   normalized adapter, validator와 evaluator를 활성화한다.
5. 사용자 결정이 필요한 action이면 `user-decision-contract.md`, 확정 실행이면
   `structured-execution-contract.md`와 action에 맞는 conditional reference를 추가로 읽는다.
6. `feature-plan`, `branch-proposal` 같은 thin skill은 Definition의 `executor_reference`로 현재 action이
   확정된 뒤에만 활성화한다.

### 실제 feature-change → implementation 호출 순서

| action | 상태 원천 | 실행·후보 생성 | 검증 | 결과·다음 경계 |
| --- | --- | --- | --- | --- |
| FC-1 초안 | 사용자 요청, local routing check, GitHub 중복·template·label 조회 | `issue-creation`이 초안 후보 작성 | artifact 필수 section·보류 질문 | `초안 확정 / 초안 수정` 사용자 결정 |
| FC-2 이슈 생성 | 확정 user input, local baseline, GitHub 사전조건 | 결정론적 `gh issue create` | 생성 Issue 재조회 | Issue #118 OPEN 관측 후 FC-3 |
| FC-3 변경 계획 | Issue #118 body, local source·설계·test | `feature-plan`이 `FE-118-1` 후보 작성 | 고유 unit, 선행조건, 검증, 순서, 빈 보류 질문 | `변경 계획 확정 / 수정` 사용자 결정 |
| FC-4 계획 반영 | 확정 user input, Issue live body | 결정론적 `gh issue edit` | body와 unchecked completion item 재조회 | `feature_plan_reflected=true`, FC-5 |
| FC-5 구현 handoff | Issue #118, 확정 unit, local baseline | primary가 common `implementation` workflow 시작 | `implementation_requested=true` provenance | FI-1으로 handoff, 자체 branch transition 복제 없음 |
| FI-1 브랜치 제안 | Issue·unit, local/remote branch 관례·collision | `branch-proposal` 후보 생성 | 이름 규칙, 범위, 추천 참조, 빈 질문 | `브랜치 제안 확정 / 수정` 사용자 결정 |
| FI-2 branch switch | 확정 user input, latest main, clean worktree | same-session deterministic Git 명령 | current branch·HEAD·worktree 재조회 | `implementation_branch_switched=true`, FI-3 |
| FI-3 세부 계획 | Issue, unit, branch·source·test | `commit-plan` 후보 생성 | unit coverage, file·verification scope | `세부 계획 확정 / 수정` 사용자 결정 |
| FI-4 계획 반영 | 확정 plan, Issue live body | 결정론적 Issue body 변경 | exact unit·검증·순서 재조회 | file change 시작 가능 |
| FI-5 파일 변경 | immutable structured request, local baseline | `workflow-code-editor`가 `general_code_change` 선택 | 범위, changed files, tests, postconditions | 검증 성공 뒤 commit 흐름 |
| FI-6~FI-12 | local worktree·Git·remote, 사용자 message·PR draft 결정 | commit, push, PR draft와 생성 | SHA·branch·PR body·Refs 재조회 | PR #119 생성 |
| FI-13~FI-33 | settings, external review provider, PR diff threads | 리뷰 실행·게시, 피드백별 사용자 결정과 수정 | provider 결과, diff 위치, thread live state, 회귀 test | 모든 actionable thread 처리 |
| FI-34~FI-36 | PR live state와 user merge decision | human merge 후 local reflection | merged SHA, base sync, review state | implementation terminal |
| FC-5~FC-7 복귀 | Issue #118 body, PR #119 merge | completion item 반영, Issue close | checked 1/unchecked 0, Issue 재조회 | `FC-7 completed` |

### 외부 상태와 local 상태 조회 시점

**GitHub 조회**:

- 진입 전 동일 Issue·PR, template·label과 기준 대상 식별
- 각 GitHub mutation 직전 precondition과 직후 postcondition
- PR 생성 전 remote head·중복 PR
- review 전 PR diff·설정 capability, 게시 전 diff position·thread 중복
- 피드백 처리마다 unresolved/resolved thread
- merge·Issue close 전후 terminal facts

**local 조회**:

- 최초 branch·HEAD·worktree baseline
- 계획 후보를 만들 때 source, 계약, 문서와 test inventory
- branch switch·file edit·commit·push 전후 Git 상태
- target Harness readiness와 tool·permission 조건
- 검증 command 결과와 local main reflection

GitHub와 local 상태를 하나의 장기 cache로 고정하지 않는다. action마다 필요한 authoritative state를 다시
관측하되, 같은 action의 상태 묶음은 adapter에서 한 번 정규화하고 evaluator를 한 번 호출한다.

### 자동 진행과 사용자 결정 경계

| 자동 진행 가능 | 사용자 결정 필요 |
| --- | --- |
| Definition validate, source provenance 검사, normalize·evaluate | Issue 초안 확정·수정 |
| readonly GitHub·local state 조회 | feature plan 확정·수정 |
| 확정된 단순 mutation의 deterministic tool path 선택 | branch proposal 확정·수정 |
| 확정 request의 executor selection과 postcondition 검사 | commit plan·message와 PR draft 확정 |
| merge 뒤 state reflection과 terminal 계산 | review mode, 각 feedback 방향·thread 해결, merge 여부 |

`feature-plan`과 `branch-proposal`의 추천값은 user input fact가 아니다. 두 skill은 후보를 반환하고 control을
primary에 돌려준다. evaluator의 `user_decision_options`가 비어 있지 않으면 자동 loop는 멈춘다.

### 검증 실패와 안전 중단

역사 로그에는 FC-1 초안 확정 후 최초 routing facts를 재개 snapshot에 넣지 않아 evaluator가 다음처럼
중단한 실제 사례가 있다.

```text
status=stopped
reason=current_task_action_condition_not_met
task_action_id=FC-1
```

이 실행은 Issue·label·file을 변경하지 않았다. 같은 계산에서 facts를 즉석 보완해 재평가하지 않고,
사용자가 다시 재개했을 때 routing facts와 확정 결정을 새 read-only snapshot으로 함께 수집했다. current
evaluator에 `{feature_change_draft_confirmed: true}`만 전달해 `FC-1`에서 직접 실행한 결과도 같은 중단을
재현했다.

그 밖의 중단 경계는 다음과 같다.

- Definition invalid, fact source·type·domain·duplicate 불일치: adapter/validator 단계에서 atomic stop
- 사용자 입력 형식 불일치: decision state 유지, mutation 없음
- structured request 필수값·baseline·범위·권한·tool 불일치: executor 호출 전 stop
- file path 선택 뒤 실행 시작 후 실패: Harness↔general fallback 금지, 실제 변경과 복구 조건 기록
- postcondition·verification 실패: 결과를 성공이나 다음 fact로 사용하지 않음
- GitHub와 auxiliary log 충돌: GitHub 실행 상태 우선

### Harness handoff subcase

Issue #118의 FI-5에서는 global Harness 존재만으로 `target_harness`를 선택하지 않았다. target에
project-local general entry와 필요한 역할 자산이 없어 실행 전 `general_code_change`를 선택했고, current
root same-session에서 파일을 변경했다. Harness 설정·Team Spec·역할은 생성하지 않았다.

current contract도 같은 순서를 유지한다.

```text
immutable file-change request
→ target baseline과 repository instruction 확인
→ installed Harness + project-local entry + request suitability + session lifecycle readiness 확인
→ 준비됨: target_harness
→ 준비되지 않음: general_code_change
→ 한 경로에서 실행 시작
→ 다른 경로 fallback 금지
→ 공통 structured result 검증
```

이는 Workflow Engine이 Harness의 Phase나 역할을 소유한다는 뜻이 아니다. Workflow-specific ID와 전이
계약을 제거한 일반 file-change request만 넘기며, 결과를 원 요청과 대조하는 책임은
`workflow-code-editor`에 남는다.

### current evaluator 재실행 결과

| representative state | current 결과 |
| --- | --- |
| `new_request` | `action_required / FC-1 / issue-creation` |
| `created_issue` | `action_required / FC-3 / feature-plan` |
| `plan_proposal_waiting_for_confirmation` | `action_required / FC-3`, 사용자 결정 유지 |
| `confirmed_feature_plan` | `action_required / FC-4 / github-simple-executor` |
| `before_implementation_start` | `action_required / FC-5 / executor_reference=null` |
| implementation entry | `action_required / FI-1 / branch-proposal` |
| branch proposal confirmed | `action_required / FI-2 / executor_reference=null` |
| implementation branch switched | `action_required / FI-3 / commit-plan` |
| implementation complete before close | `action_required / FC-6 / github-simple-executor` |
| terminal feature change | `completed / FC-7` |

`executor_reference=null`은 evaluator가 side effect를 수행한다는 뜻이 아니다. primary가 common workflow
handoff, 사용자·human action 또는 결정론적 tool path를 조율하는 의도적인 경계다.

### 종료 상태와 보고 방식

| 결과 | terminal 여부 | 보고 내용 |
| --- | --- | --- |
| 사용자 결정 | non-terminal | 현재 workflow/action, 선택지, 현재까지의 read-only·mutation 결과, exact 재개 입력 |
| 정보·계약 부족 stop | non-terminal safe stop | reason, 누락·충돌 fact, side effect 없음 또는 실제 변경, 재개 조건 |
| executor·verification 실패 | non-terminal stop | request ID, baseline, 실제 동작·변경, 실패한 postcondition, 복구 조건 |
| 사용자 보류 | non-terminal | 보존한 authority state와 재개 action |
| `completed / FC-7` | terminal | Issue·PR authoritative state, merge·completion evidence, local reflection, 잔여 위험 |

Issue #118/PR #119의 최종 authoritative 상태는 Issue `CLOSED/COMPLETED`, PR `MERGED`, completion item
checked이며 current evaluator의 FC-7 terminal 조건과 일치한다.

## 문서 설명과 실제 실행 계약 비교

### 일치하는 부분

- 두 runtime 모두 host가 실행하고 repository는 guest contract를 제공한다.
- Harness Phase 6은 사용자 판단 자료를 준비하고 Phase 7 변경을 gate한다.
- Workflow Engine의 Definition→adapter→validator→evaluator와 executor 분리가 실제 tests와 history에
  나타난다.
- artifact skill은 후보를 만들 뿐 user decision과 state transition을 확정하지 않는다.
- target Harness가 준비되지 않은 file change는 실행 전에 `general_code_change`로 선택되고, 시작 뒤
  fallback하지 않는다.
- GitHub state가 auxiliary log보다 우선하며 재개 시 다시 관측한다.

### 최신 변경으로 달라진 부분

- Day 1의 source 경로 `github-workflow-engine`은 current source에서 `github-agentic-loop`로 바뀌었다.
- Issue #118의 `.workflow-engine/settings.json`은 이후 PR #127에서 `.github-agentic-loop/settings.json`으로
  이동했다. #118의 lifecycle 순서는 유효한 역사 근거지만 target path는 current state가 아니다.
- Workflow log는 과거 `.harness/logs/github-workflow-log.md` 단일 파일에서 current
  `.github-agentic-loop/logs/github-workflow-log-YYYY-MM-DD.md`로 소유권·날짜가 분리됐다.
- #129 실행에 등장한 compiled Definition, immutable receipt와 observation snapshot 계층은 #136에서
  제거됐다. current lifecycle 설명에 포함하지 않는다.

### 확인된 차이와 관측 공백

1. 재설치 후 `$HOME/.agents/skills`의 current source parity와 `github-agentic-loop` metadata 노출은
   확인됐다. 다만 `$HOME/.codex/skills`의 legacy·backup metadata도 함께 노출되어 실제 선택 우선순위와
   legacy 배제는 확인되지 않았다.
2. current Harness 계약으로 생성한 disposable target end-to-end evidence가 없다.
3. 보존 Harness 평가의 agent-owned `재작성 필요` verdict는 current user-owned quality contract와 맞지
   않는다. 이는 역사 기록이며 current instruction으로 사용하지 않는다.

## 중복 조회, 재해석과 책임 역전 분석

### 의도적인 재조회

- GitHub mutation 직전 preflight와 직후 postcondition 조회
- 재개할 때 GitHub·local authoritative state 재관측
- branch·PR·review thread의 live state 확인
- file change 전 baseline과 실행 경로 재판정

이 조회들은 stale state와 중복 side effect를 막는다. 단순 반복이라는 이유로 제거할 대상이 아니다.

### 줄어든 중복

- 같은 action은 observation을 adapter로 한 번 정규화하고 evaluator를 한 번 호출한다.
- Definition이 transition을 소유하므로 `feature-plan`, `branch-proposal`과 reference에 자연어 전이표를
  복제하지 않는다.
- `feature-change`의 FC-5는 branch·commit·PR transition을 복제하지 않고 `implementation`으로 handoff한다.
- 결정론적 tool path가 있으면 `github-simple-executor`를 별도 session으로 호출하지 않는다.

### 현재 확인된 불필요한 재해석 또는 책임 역전

- **현재 host discovery 중복**: 공식 installed copy는 source와 일치하지만 legacy·backup metadata도 함께
  노출된다. 새 요청에서 current identifier가 선택되는지 확인하기 전에는 entry/activation ambiguity가
  완전히 해소됐다고 볼 수 없다.
- **보존 Harness verdict**: 구평가가 품질 결론을 agent가 확정했다. current source는 이를 사용자 책임으로
  바꿨고 회귀 검사가 보호한다. 역사 문서를 current verdict로 재사용하면 책임이 다시 역전된다.
- **입증되지 않은 runtime 계층**: #128·#129의 compiled/snapshot 계층은 측정된 실패 없이 반복 조회를
  줄이려다 유지비를 늘렸고 현재 revert됐다. 같은 근거 없이 cache·registry·compiled layer를 다시
  제안하지 않는다.

Harness의 `SKILL.md`·`reference-map.md` 반복 읽기 비용이나 잘못된 leaf 선택은 current target 실제 실행이
없어 아직 입증하지 못했다. 이는 Day 3의 activation 관측 대상이다.

## Gap Analysis

### G1. 공식 installed parity 회복과 legacy discovery 후보 공존

#### 후속 상태 (2026-09-02)

사용자 재설치 뒤 `$HOME/.agents/skills`의 관리 skill 18개가 current source와 모두 일치하고
`github-agentic-loop`가 current discovery metadata에 노출된다. 최초 조사에서 확인한 “공식 root 설치본
없음”과 source-installed content drift는 해소됐다.

그러나 `$HOME/.codex/skills`의 legacy `github-workflow-engine`, legacy `harness`와 여러 backup copy도
현재 metadata에 남아 있다. current identifier 선택과 legacy 후보 배제는 아직 실제 새 요청으로 관측하지
않았다.

#### 현재 상태

source와 공식 installed copy는 `github-agentic-loop`와 current companion contract로 일치한다. host는
공식 root의 current metadata와 `$HOME/.codex/skills`의 legacy·backup metadata를 함께 제공한다.

#### 저장소 근거

- current `install.sh`의 `WORKFLOW_ENGINE_SKILL="github-agentic-loop"`
- installer 집계의 user skill root·legacy migration·설치 tree 122/122 통과
- 재설치 후 `$HOME/.agents/skills` 관리 tree 18/18 parity와 대표 `SKILL.md` hash 일치
- 이 session의 available skill metadata에 current `github-agentic-loop`와 legacy `github-workflow-engine`
  후보가 함께 존재

#### 영향

공식 설치 누락 위험은 해소됐다. 다만 host가 중복 metadata 중 어느 항목을 실제 activation 대상으로
선택하는지 확인되지 않아, 자연어 요청에서 legacy identifier나 구 reference가 선택될 가능성은 아직
관측으로 배제하지 못했다.

#### 가능한 원인

최초 상태는 PR #125·#127 이후 새 기본 root에 재설치하지 않은 운영 상태였다. 재설치 뒤에도 남은 중복은
installer가 `$HOME/.codex/skills` legacy root를 지원·정리 범위로 두지 않는 정책과 host가 그 root 및 backup
directory까지 discovery metadata로 제공하는 환경 동작의 조합이다. source installer content 결함은
확인되지 않았다.

#### 개선 선택지

1. 새 independent session에서 `github-agentic-loop`가 실제 activation되는지 관측한다.
2. legacy·backup metadata가 후보로 보이더라도 current 요청 routing에 참여하지 않는지 확인한다.
3. 실제 오선택이 재현되면 `$HOME/.codex/skills` 정리 여부를 사용자 결정으로 분리하고 host/runtime
   compatibility와 installer scope 중 어느 책임인지 판정한다.

#### 권장 방향

Day 3에서 새 independent session의 activation scenario로 우선 재현한다. 재설치 자체로 source 변경은
필요하지 않으며, legacy user-home 정리는 별도 사용자 결정 없이 수행하지 않는다.

#### 변경하지 않을 경우

공식 installed copy로 current contract를 사용할 수 있지만, legacy metadata 오선택이 실제로 발생하는지
확인하지 않으면 discovery ambiguity의 운영 영향을 확정할 수 없다.

### G2. current Harness end-to-end target 관측 부재

#### 현재 상태

current source에서 신규 target을 Phase 0~6까지 생성·평가한 disposable evidence가 없다. 보존 corpus는
구계약의 실제 관찰이고 current target은 Harness 준비 상태가 아니다.

#### 저장소 근거

- current repository에 project-local Harness entry·role assets가 없음
- 보존 corpus의 target commit·산출물 목록과 구 verdict
- current Harness test는 user decision boundary 3건이며 생성 lifecycle fixture가 아님

#### 영향

문서의 생성 순서와 user gate는 설명할 수 있지만 실제 activation leaf, 생성 순서, tool call, log append,
subagent capability fallback과 target-specific failure는 current runtime evidence로 확정할 수 없다.

#### 가능한 원인

Harness는 semantic·target-specific runtime이고 disposable target을 임의 생성하는 것이 별도 부수 효과와
평가 범위를 요구한다. current repository 자체도 Harness target으로 구성하지 않은 의도된 상태다.

#### 개선 선택지

1. 별도 disposable target과 허용된 생성 범위를 준비해 H-D2를 실행한다.
2. 기존 실제 target의 current-source 재실행 결과와 logs를 독립 evidence로 가져온다.
3. 그 전에는 source contract·static test와 historical corpus의 성격을 분리해 유지한다.

#### 권장 방향

Day 3 discovery·activation 관측 전에 disposable target 또는 current target evidence를 선행 조건으로 둔다.
새 범용 runtime이나 deterministic Harness schema를 먼저 추가하지 않는다.

#### 변경하지 않을 경우

Harness activation 비용, 과활성화·부족 활성화와 current end-to-end failure를 추론에 의존하게 된다.

## 변경 유형 분류

### 즉시 수정

없다. current source의 Definition, adapter, evaluator, Harness user gate, installer와 shell syntax는 모두
검증을 통과했다. 역사 문서의 당시 경로·수치를 소급 수정하지 않는다.

### 정책 검토 필요

없다. runtime 책임, state source, user decision과 file-change handoff 경계를 바꿀 근거가 확인되지 않았다.

### 기능 제안 필요

없다. current 관측 gap은 먼저 설치·activation과 disposable target 실행으로 재현해야 한다. 새 registry,
cache, compiled runtime 또는 중앙 executor는 현재 근거보다 앞선다.

### 보류·후속 관측

| 후보 | 이유 | 재검토 조건 |
| --- | --- | --- |
| legacy discovery 공존 문제 분류 | 공식 root 18/18 parity는 회복됐지만 legacy·backup metadata가 함께 노출됨 | 새 session에서 legacy 오선택 또는 routing ambiguity 재현 |
| Harness activation 개선 | current target 실행 evidence 없음 | 불필요한 leaf, 누락 safety contract 또는 반복 비용 관측 |
| Workflow 조회 최적화 | 안전을 위한 live re-observation과 불필요한 반복을 아직 분리할 측정값 부족 | 같은 evaluation cycle의 실제 중복 IO·parse 비용 재현 |
| 공통 lifecycle/runtime | 두 runtime의 terminal·state·판단 책임이 의도적으로 다름 | 분산 경계가 반복 side effect·state loss를 만드는 사례 확보 |

## 오늘 새롭게 이해한 것

- request lifecycle의 가장 이른 실패는 executor가 아니라 host discovery와 installed snapshot에서 시작할 수
  있다.
- Harness Phase 6의 completion은 품질 완료가 아니라 사용자 판단 자료 준비와 synchronous checkpoint다.
- Workflow Engine의 action completion과 전체 workflow terminal completion은 다르며, 매 action 뒤
  authoritative state를 다시 fact로 만들어야 다음 action으로 이동한다.
- 역사 로그의 실제 fail-closed 사례는 incomplete state를 같은 계산에서 보완하지 않는 단일 평가 경계를
  보여 준다.
- `executor_reference=null`은 공백이 아니라 primary coordination 또는 handoff 경계다.
- 안전을 위한 re-observation은 cache로 제거할 중복이 아니며, 실제 비용과 stale risk를 함께 측정해야 한다.

## 기존 생각이 바뀐 부분

- Day 1의 parity 결론은 최초 Day 2 조사 시점에는 깨져 있었지만 사용자 재설치 후 공식 root에서 18/18로
  회복됐다. 다만 content parity와 실제 activation 선택은 별도 관측이다.
- #118의 설정 경로 변경은 현재 최종 path가 아니지만, feature-change→implementation lifecycle의 실제
  순서와 user decision·fail-closed 근거로는 여전히 유효하다.
- 보존 Harness 평가가 있다는 사실만으로 current Harness end-to-end 실행 근거가 되지 않는다. current
  user-owned verdict 계약과 target path를 다시 대조해야 한다.
- 반복 조회를 줄인다는 목표만으로 compiled artifact나 snapshot 계층을 정당화할 수 없다. #136 rollback은
  실제 lifecycle failure와 측정 비용이 먼저 필요하다는 기준을 제공한다.

## 저장소에서 확인한 근거

### Harness

- `.codex-dist/skills/harness/SKILL.md`
- `.codex-dist/skills/harness/references/reference-map.md`
- `.codex-dist/skills/harness/references/target-evaluation-playbook.md`
- `.codex-dist/skills/harness/references/reentry-rules.md`
- `.codex-dist/skills/harness/references/phase-selection-matrix.md`
- `.codex-dist/skills/harness/references/verification-checklist.md`
- `.codex-dist/skills/harness/references/logging-contract.md`
- `.codex-dist/skills/harness/tests/user-decision-boundary.test.mjs`
- `.harness/evaluations/targets/hakakorea_second_frontend/2026-05-09-refresh-harness-meta.md`

### GitHub Workflow Engine

- `.codex-dist/skills/github-agentic-loop/SKILL.md`
- `.codex-dist/skills/github-agentic-loop/definitions/feature-change.json`
- `.codex-dist/skills/github-agentic-loop/definitions/implementation.json`
- `.codex-dist/skills/github-agentic-loop/scripts/workflow-definition/*.mjs`
- `.codex-dist/skills/github-agentic-loop/references/state-observation-contract.md`
- `.codex-dist/skills/github-agentic-loop/references/user-decision-contract.md`
- `.codex-dist/skills/github-agentic-loop/references/structured-execution-contract.md`
- `.codex-dist/skills/github-agentic-loop/references/file-change-execution-contract.md`
- `.codex-dist/skills/github-agentic-loop/references/target-harness-execution-contract.md`
- `.codex-dist/skills/feature-plan/SKILL.md`
- `.codex-dist/skills/branch-proposal/SKILL.md`
- `.codex-dist/skills/github-agentic-loop/tests/**`

### 실행·상태 근거

- Issue #118, PR #119의 current GitHub state
- `.harness/logs/github-workflow-log.md`의 #118→#119 history와 FC-1 safe stop
- `.github-agentic-loop/logs/*`의 rename 이후 lifecycle·재개 기록
- `.github-agentic-loop/settings.json`
- PR #127과 PR #136의 merge 결과
- `install.sh`, `uninstall.sh`
- `$HOME/.agents/skills`와 `$HOME/.codex/skills`의 현재 존재·hash·tree diff 관측

## 현재 구조의 강점

- Harness와 Workflow Engine의 human decision 의미가 분리돼 있다.
- Workflow Engine의 fact source, transition 계산과 side effect가 분리되고 atomic failure가 검증된다.
- thin skill이 추천을 결정이나 mutation으로 승격하지 않는다.
- common implementation workflow가 branch·commit·PR lifecycle 중복을 줄인다.
- target Harness가 준비되지 않아도 별도 Harness asset을 생성하지 않고 일반 file-change 경로를 안전하게
  선택할 수 있다.
- execution 시작 뒤 fallback 금지와 공통 structured result 검증이 중복 변경을 막는다.
- GitHub authoritative state와 auxiliary log의 우선순위가 명확하다.
- 검증되지 않은 compiled/cache 계층을 rollback해 current runtime을 실제 근거 수준으로 유지했다.

## 개선 후보

- 재설치된 current skill과 legacy metadata가 공존하는 상태에서 실제 activation 선택을 독립 session으로
  관측한다.
- current Harness disposable target 또는 실제 target evidence를 확보한다.
- Day 3에서 H-D2의 실제 activated files와 leaf 순서를 기록한다.
- 같은 evaluation cycle에서 실제로 중복되는 IO·parse가 있다면 safety re-observation과 분리해 측정한다.

위 항목은 아직 source 변경 승인이 필요한 개선안이 아니라 다음 관측 조건이다.

## 남은 의문

1. 재설치 후 새 session에서 host가 `$HOME/.agents/skills/github-agentic-loop`를 실제로 활성화하고
   `$HOME/.codex/skills`의 legacy·backup 후보를 routing에서 배제하는가?
2. disposable Harness target에서 최초 요청 시 `SKILL.md`와 `reference-map.md` 다음 실제로 읽히는 leaf는
   무엇이며, Phase별로 같은 상위 내용을 불필요하게 다시 읽는가?
3. current host에 callable `close_agent`가 없는 상태에서 Harness 신규 구성은 실제로 ID 0개 same-session
   경로를 사용하고 logs에 cleanup `not_applicable`을 남기는가?
4. 날짜별 Workflow log가 새 session의 exact 재개 지점을 찾는 비용을 충분히 줄였는가?
5. GitHub preflight·postcondition과 같은 안전 조회를 제외하고도 같은 action 안에 중복 관측·파싱이 남는가?

## 다음 Day의 선행 조건

1. current source와 installed discovery snapshot을 별도 열로 유지한다.
2. 재설치된 상태의 새 session에서 `github-agentic-loop` activation과 legacy 후보 배제를 관측한다.
3. Harness는 disposable target 또는 current 실제 target evidence가 없으면 성공 실행을 주장하지 않는다.
4. H-D2 최초 구성, 특정 Phase 재진입, 평가-only 요청에서 예상 상위·leaf contract를 각각 기록한다.
5. Workflow Engine은 단일 next action 요청에서 Definition·adapter·reference의 실제 활성 범위를 기록한다.
6. 문서 길이가 아니라 과활성화, 부족 활성화, 잘못된 routing, 반복 IO와 안전 효과를 측정한다.
7. #136에서 제거된 compiled·snapshot 계층은 새 failure evidence 없이 재도입 후보로 올리지 않는다.

## Day 2 완료 조건 점검

- [x] Harness 대표 요청의 Entry→Phase 6 user checkpoint lifecycle을 current source로 재구성했다.
- [x] Harness current end-to-end target evidence가 없다는 한계와 보존 history의 구계약 차이를 기록했다.
- [x] Workflow Engine의 Issue #118→PR #119 feature-change→implementation 흐름을 current Definition,
  history와 GitHub authoritative state로 재구성했다.
- [x] 자동 진행과 사용자 결정 경계를 각 runtime별로 표시했다.
- [x] 성공, 보류, 실패, 안전 중단과 terminal/non-terminal 결과를 구분했다.
- [x] local·external 조회, 검증 시점과 실패 후 재개를 기록했다.
- [x] 문서·history와 current source의 rename·path·rollback 차이를 근거와 함께 기록했다.
- [x] 중복 조회, 재해석, handoff와 책임 역전을 분석했다.
- [x] 다음 Day의 discovery·activation 관측 선행 조건을 남겼다.

**Day 2 판단**: 두 runtime의 대표 lifecycle과 의도적인 차이는 설명 가능하다. Workflow Engine은 current
code·test·GitHub history로 end-to-end 근거가 충분하다. 재설치로 source와 공식 installed copy의 18/18
parity도 회복됐다. Harness는 current 계약상 lifecycle과 user gate는 검증됐지만 current target 실제 실행
근거가 부족하다. legacy metadata 공존과 Harness target 관측 공백은 Day 2 문서화를 막지는 않지만 Day 3의
activation 평가에서 추론을 사실로 승격하지 않도록 명시적 선행 조건으로 유지한다.
