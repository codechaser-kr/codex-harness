# Phase 3 Day 1 — Workflow Definition과 상태 전이 모델 조사

## 문서 성격과 근거 구분

이 문서는 Repository Evolution Workshop Phase 3 Day 1의 조사 기록이다. 공식 설계나 확정 정책을 대체하지 않는다. 이 조사에서는 현재 checkout의 문서·Definition·adapter·validator·evaluator·skill source와 fixture/test source를 읽었다. Workflow 실행, 재개, GitHub 조회·변경, 테스트 실행은 하지 않았다.

본문의 근거 표기는 다음처럼 사용한다.

- **[현재 source]**: 이 checkout에서 직접 읽은 코드, JSON, skill, 계약 문서와 Git 상태
- **[설계]**: 현재 계약 문서와 orchestration skill에 적힌 책임·행동 규칙. 실제 runtime이 그 규칙대로 실행됐다는 뜻은 아님
- **[이전 관측]**: Phase 1·2 보고서에 기록된 과거 실행 또는 관측. 이번 작업에서 재현하거나 현재 상태로 승격하지 않음
- **[fixture/test source]**: 테스트와 synthetic fixture가 어떤 입력·결과를 다루도록 작성됐는지 보여 주는 source. 실행 결과가 아님
- **[분석]**: 위 근거를 연결한 해석. runtime incident가 확인되지 않으면 가설 또는 명세 공백으로 표시
- **[미확인]**: 이 조사 범위와 권한으로 확인할 수 없었던 내용

### 근거 식별자

| ID | 근거 |
| --- | --- |
| `B-01` | 시작 시 branch/HEAD/worktree와 local/cached Git 기준선 |
| `DOC-01` | `.codex-dist/skills/github-agentic-loop/references/workflow-definition-contract.md` |
| `DOC-02` | `.codex-dist/skills/github-agentic-loop/references/normalized-fact-adapter-contract.md` |
| `DOC-03` | `.codex-dist/skills/github-agentic-loop/references/state-observation-contract.md` |
| `DEF-FP`, `DEF-PR`, `DEF-FC`, `DEF-FF`, `DEF-FI` | 각 workflow Definition JSON |
| `ADP-01` | `scripts/workflow-definition/workflow-state-adapter.mjs`, `normalized-fact-adapter.mjs`, workflow별 `*-state-adapter.mjs` |
| `VAL-01` | `scripts/workflow-definition/validator.mjs`, `expression.mjs` |
| `EVAL-01` | `scripts/workflow-definition/evaluator.mjs`, `cli.mjs`, `parser.mjs` |
| `ORCH-01` | `.codex-dist/skills/github-agentic-loop/SKILL.md` |
| `EXEC-01` | `github-simple-executor/SKILL.md`, `workflow-code-editor/SKILL.md`, 실행 계약 references |
| `FIX-FP`, `FIX-EVAL` | `tests/workflow-definition/fixtures/feature-proposal-states.json`, `evaluation-cases.json` |
| `TEST-FP`, `TEST-EVAL` | `tests/workflow-definition/feature-proposal.test.mjs`, `evaluator.test.mjs` |
| `P2-01` | `docs/reviews/repository-evolution/phase-02/summary.md`의 이전 관측과 사용자 범위 판단 |
| `ROAD-03` | `docs/workshops/repository-evolution/roadmap.md`의 Phase 3 주제 |

## Git 기준선

| 항목 | 조사 시작 시 확인값 |
| --- | --- |
| 조사일 | 2026-11-14 (Asia/Seoul) |
| 현재 branch | `docs/repository-evolution-workshop` |
| HEAD | `00f98a4c61532ce7f5daf98201d27e3a66003542` (`docs: Phase 2 종합 보고서 작성`, 2026-10-19) |
| 작업 트리 | `git status --short` 출력이 비어 있었음 |
| local `main` | `e0a3f690ce0e58e31c8eac1d5a198625ab05541a` |
| cached `origin/main` | `e0a3f690ce0e58e31c8eac1d5a198625ab05541a` |
| local 기준선 관계 | `main`은 HEAD의 조상이며 `main...HEAD`는 `0 17` (local main 대비 현재 branch가 17 commit 앞섬) |
| branch delta | `main...HEAD`의 파일 경로는 `docs/` 아래 문서들이다. 이번 조사 시작 시점에는 Workflow Definition, 실행 코드, 설정의 branch 차이를 확인하지 못함 |

**[현재 source, `B-01`]** 원격 최신 상태를 확인하기 위한 `fetch`는 하지 않았다. `origin/main`은 로컬에 저장된 remote-tracking 기준선이며, 현재 원격이 같은 commit인지 미확인이다. 이전 Phase 2 보고서의 기준선은 과거 기록이므로 이번 값으로 대체한다.

## 현재 Workflow Definition 목록

`ORCH-01`의 workflow 선택표와 `.codex-dist/skills/github-agentic-loop/definitions/*.json`을 대조했다. 현재 Definition은 5개이며, static JSON inventory 기준 총 72개 transition/action node가 있다. `task_action_id`는 node/action의 식별자다. 실제 작업 절차나 side effect를 JSON 안에 실행 코드로 넣지는 않는다. non-null `executor_reference`는 계약된 실행 주체를 가리킨다. (`DOC-01`, `ORCH-01`, `DEF-*`)

| Workflow / entry | 목적과 fact domain | 전이 조건·action 흐름 | Terminal |
| --- | --- | --- | --- |
| `feature-proposal` / `FP-1` (`DEF-FP`) | 기능 제안 접수·방향 분류·후속 workflow 전환. 8 facts: boolean 7개와 `feature_proposal_direction ∈ {do_not_proceed, policy_review, feature_change}` | `FP-1` 초안 사용자 결정 → `FP-2` 이슈 생성 → `FP-3` 방향 분류 → `FP-4` 방향 반영. 이후 방향별 `do_not_proceed: FP-5`, `policy_review: FP-6 → FP-9`, `feature_change: FP-7 → FP-10`. 초안/후보는 `issue-creation`, `feature-proposal-triage`, 상태 변경은 `github-simple-executor`가 맡도록 참조됨. 전환 경로는 원 이슈 방향 반영·종료 후 후속 전환을 완료한다. | `FP-8`, 방향별 완료 조건이 모두 참일 때 완료 (`feature-proposal.json:334`) |
| `policy-review` / `PR-1` (`DEF-PR`) | 정책 검토, 설계 문서 반영 및 기능변경 흐름으로 전환. 16 facts: boolean 14개와 `feature_change_transition_direction ∈ {existing_feature_issue, new_feature_issue}`, `feature_change_transition_result ∈ {existing_issue_updated, new_issue_flow_started}` | `PR-1`은 직접 요청 또는 기능제안 전환 완료에서 시작 → `PR-2` 이슈 생성 → `PR-3/4` 정책 설계·반영 → `PR-5/6` 설계 문서 구현·PR merge·결과 반영 → `PR-7/8` 기능변경 전환 후보·방향 반영 → `PR-10` 원 이슈 종료 후 기존/신규 대상에 따라 `PR-11` 또는 `PR-12` → `PR-9`. 실행 참조에는 `issue-creation`, `policy-plan`, `policy-review-next-triage`, `github-simple-executor`가 선언됨. | `PR-9`, 반영·원 이슈 종료·선택된 후속 전환 결과가 일치할 때 완료 (`policy-review.json:457`) |
| `feature-change` / `FC-1` (`DEF-FC`) | 확정된 기능 변경을 계획·구현 흐름으로 연결하고 종료. 17 facts: boolean 16개와 `feature_change_entry_source ∈ {direct_request, feature_proposal, policy_review}` | 직접 요청 진입은 요청·범위·완료 기준이 준비되고 추가 정책 결정 및 결함 조사가 불필요해야 한다. 상위 workflow 진입은 해당 전환 완료 fact가 필요하다. `FC-1` 초안 → `FC-2` 이슈 생성 → `FC-3/4` 계획 승인·반영 → `FC-5` 구현 시작·모든 작업 merge·완료 항목 반영 대기 → `FC-6` 이슈 종료. | `FC-7`, 이슈 종료 fact가 참일 때 완료 (`feature-change.json:328`) |
| `feature-fix` / `FF-1` (`DEF-FF`) | 결함 제보에서 원인 조사·해결 계획·구현 완료까지 연결. 12 facts 모두 boolean | `FF-1/2` 초안·이슈 생성 → `FF-3` `fix-analysis` 결과와 사용자 확정 → `FF-4` `fix-plan` 결과와 사용자 확정 → `FF-5` 계획 반영 → `FF-6` 구현 시작·모든 작업 merge·완료 항목 반영 대기 → `FF-7` 이슈 종료. | `FF-8`, 이슈 종료 fact가 참일 때 완료 (`feature-fix.json:294`) |
| `implementation` / `FI-1` (`DEF-FI`) | 브랜치·계획·파일 변경·커밋·PR·리뷰·피드백·merge·사후 반영을 처리. 44 facts: boolean 33개와 enum string 11개 | 주요 단계: `FI-1..4` 브랜치·계획 → `FI-5..9` work unit 검증/commit 루프와 push → `FI-10/12` PR 초안·생성 → `FI-13..18` review mode와 review 실행 → `FI-19..24` inline review comment 및 feedback inventory → `FI-25..33` 피드백 수용/수정/답변/resolution 반복 → `FI-34..36` merge 결정·merge·사후 반영. 분기·반복은 work-unit phase, review mode, feedback 상태 fact가 선택한다. 실행 참조에는 `workflow-code-editor`, `github-simple-executor`, `github-state-summary`, `commit`, `pr-proposal`, `pr-creation`, `review-comment`, 리뷰 skill 등이 나타난다. | `FI-36`, PR merged 및 post-merge reflection 후 `implementation_completed=true`일 때 완료 (`implementation.json:1404`) |

**[현재 source]** `feature-proposal.json`·`policy-review.json`·`feature-change.json`·`feature-fix.json`·`implementation.json`이 `DEF-FP`~`DEF-FI`다. Domain 개수와 enum 값은 각 JSON의 `facts`에서 읽었다. 위 경로 요약은 transition의 `normalized_fact_conditions`, `completion_predicate`, `next_transition_rules`, `executor_reference`를 따라 정리한 것이다. 전체 Boolean/enum 조건은 Definition JSON이 정본이다.

`implementation`의 string fact domain은 `implementation_work_unit_phase`, `review_mode`, `review_feedback_importance`, `review_comment_location_status`, `review_comment_posting_direction`, `remaining_review_comment_location_status`, `review_feedback_inventory`, `review_feedback_direction`, `feedback_resolution`, `remaining_feedback_status`, `pull_request_merge_decision`이다. 현재 Definition 다섯 개에서는 `exists` 표현식이 사용되며 `not_exists`는 사용되지 않는다. 표현식 계약은 두 연산자를 모두 지원한다. (`DOC-01`, `DEF-FI`, `VAL-01`)

## 상태·fact·transition·action 모델

### Definition이 선언하는 값

**[현재 source + 설계, `DOC-01`]** Definition root는 `workflow_id`, `entry_task_action_id`, 닫힌 `facts` domain, 비어 있지 않은 `transitions` 배열로 구성된다. Fact domain은 비어 있지 않은 boolean/string/integer scalar 값 목록이며, 현재 다섯 Definition은 boolean 및 enum string을 사용한다. Transition node는 정확히 다음을 선언한다.

- `task_action_id`: node와 logical action의 식별자
- `normalized_fact_conditions`: 현재 task가 유효한지 판정하는 조건
- `user_decision_options`: 사용자 결정 대기 여부와 선택지
- `completion_predicate`: 현재 task의 완료를 증명하는 fact 표현식
- `executor_reference`: 직접 실행 참조 또는 명시적 `null`
- `next_transition_rules`: 완료 후 다음 task를 고르는 조건부 edge 또는 무조건 edge

표현식은 `equals`, `in`, `exists`, `not_exists` leaf와 `all`/`any` 조합으로 구성된다. 임의 우선순위, `not`, `not_equals`, `not_in`은 지원하지 않는다. Terminal node는 별도 목록이 아니라 빈 `next_transition_rules`로 표시된다. (`DOC-01`의 “표현식”·“작업 구조” 섹션)

### adapter와 validator가 받는 입력

**[현재 source, `ADP-01`]** 외부 원본을 읽어 `fact_id/value/source_kind/source_reference/field_reference` observation을 구성하는 단계는 raw GitHub parser가 아니다. `state-observation-contract.md`와 orchestration 주체가 GitHub·local·user·skill 출처를 읽고 typed observation을 제공한다. 예를 들어 `feature_change_entry_source`는 현재 요청의 직접/상위 전환 출처를 primary가 산출하며, adapter는 `local_state` source 계약을 검증한다. (`DOC-03`의 “기능변경 진입 local_state 관측 규칙” 섹션)

Workflow별 adapter는 허용된 fact ID와 source kind, 일부 고정된 skill output source reference를 검사한 다음 공통 adapter를 호출한다. 공통 normalizer는 Definition을 validator로 먼저 확인하고, 후보의 닫힌 구조·fact ID·value type/domain·중복 fact·evidence를 검사한다. Observation의 value가 허용 domain에 있지 않거나 evidence가 없으면 전체 normalization을 중단하고 partial fact/evidence 결과를 비운다. 관측되지 않은 fact는 생략할 수 있으며, 성공 결과는 전달된 fact와 evidence만 포함한다. Adapter와 normalizer는 외부 IO, GitHub API, LLM, 파일 변경을 하지 않는다. (`ADP-01`, `DOC-02`)

`feature-proposal-state-adapter.mjs`에는 과거 `next_workflow` 관측을 신규 transition 완료 fact로 바꾸는 호환 변환이 남아 있다. 이 변환도 observation normalization 앞의 좁은 입력 변환이며, 이번 조사에서 오류나 동작 문제를 확인하지 않았다. (`feature-proposal-state-adapter.mjs:14`)

**[현재 source, `VAL-01`]** `validateWorkflowDefinition`은 단일 실행 validator다. 닫힌 객체·필수 필드·workflow/task ID prefix·fact domain·표현식 참조와 값·completion predicate satisfiable 여부·edge target·entry 도달성·terminal 경로를 검사한다. Conditional next rules는 참조한 fact의 유한 상태 공간을 순회해 빈틈과 중첩이 없는지 확인하고, 상태 공간 크기에 상한을 둔다. 별도 JSON Schema나 executor registry를 사용하는 구조는 현재 contract에 없다. `executor_reference`는 non-empty string 또는 `null` 검증이며, 참조값의 존재성 확인은 registry로 수행하지 않는다. Registry를 도입하지 않는다는 점은 `validation-mode-contract.md:16`에도 명시돼 있다. (`DOC-01`의 “의미 검증” 섹션, `validator.mjs`의 `validateRuleCoverage`, `validateGraph`, `validateWorkflowDefinition`)

### evaluator의 판단

**[현재 source, `EVAL-01`]** `evaluateWorkflowDefinition(definition, normalizedFactState, {currentTaskActionId})`는 외부 IO와 상태 변경이 없는 함수다.

1. Definition 유효성과 fact state의 plain object·known fact·type·domain을 검사한다.
2. `currentTaskActionId`가 없으면 `entry_task_action_id`에서 시작한다.
3. 현재 ID가 없거나 반복 방문됐거나 `normalized_fact_conditions`가 맞지 않으면 `stopped`를 반환한다.
4. `completion_predicate`가 아직 참이 아니면 `action_required`와 단일 task ID, `user_decision_options`, `executor_reference`, predicate를 반환한다.
5. 완료 predicate가 참이고 다음 rule이 없으면 `completed`를 반환한다.
6. 다음 rule이 있으면 일치하는 조건을 평가하고 정확히 하나일 때만 다음 task로 간다. 0개면 `no_transition_match`, 2개 이상이면 `multiple_transition_matches`로 `stopped`한다.

Evaluator는 action을 수행하지 않고 `transition_id`도 만들지 않는다. `parser.mjs`와 `cli.mjs`는 JSON 파일 입력을 읽어 `validate` 또는 `evaluate`를 호출하는 CLI를 제공한다. CLI에서는 `action_required`와 `completed`가 exit code 0, `stopped`가 exit code 1이다. (`evaluator.mjs`, `cli.mjs:61`, `workflow-definition-contract.md`의 “평가 API” 섹션)

## Definition·adapter·validator·evaluator·orchestration·executor 경계

| 구성 요소 | 현재 소유 판단·작업 | 하지 않는 일 / 경계 |
| --- | --- | --- |
| Definition JSON | workflow ID, fact domain, 현재 작업 조건, completion predicate, 사용자 선택지, executor reference, 다음 edge와 terminal 구조 선언 | raw GitHub 읽기, fact 값 생성, action 실행 |
| State observation / primary | 기준 이슈·PR과 GitHub/local/user/skill 원본 관측; 현재 계약에 따른 원시 필드 판정; observation 구성 | 다음 task ID를 Definition과 별도로 임의 선택하지 않음 (`DOC-03`, `ORCH-01`) |
| Workflow별 adapter / 공통 normalizer | observation의 출처 종류·허용 reference·field/evidence를 검증하고 Definition domain에 있는 부분 fact state로 정규화 | raw API를 parse하거나 진위를 독립 검증하지 않음; side effect 없음 (`ADP-01`) |
| Validator | Definition schema/의미/그래프 구조 및 조건 완전성 검증 | 실행 순서·GitHub 상태·executor의 기능 적합성 결정 아님 (`VAL-01`) |
| Evaluator | 검증된 Definition과 정규화 state에서 현재/다음 task, action_required, stopped, completed를 결정 | executor 호출, 상태 변경, 사용자 결정 해석 아님 (`EVAL-01`) |
| `github-agentic-loop` orchestration skill | workflow 선택, 관측·정규화·평가 흐름, 사용자 선택 대기, 실행 계약 선택, 실행 결과 확인 후 재관측·재평가 및 보고 | side effect를 evaluator에 맡기지 않음. skill 문서는 실제 runtime 호출 증거를 대신하지 않음 (`ORCH-01`) |
| executor / 전용 skill | Definition이 가리키는 범위에서 후보·분석·리뷰를 만들거나 확정된 비파일/GitHub/파일 변경을 실행하고 결과를 반환 | 현재 작업/사용자 선택/다음 transition을 재판단하지 않음 (`EXEC-01`) |

전용 제안·계획·분석 스킬은 후보 산출물을 반환하고, workflow engine은 그 결과를 다음 observation으로 사용할 수 있는지 판단한다. `github-simple-executor`는 확정된 단일 비파일 상태 변경만 수행하며, `workflow-code-editor`는 파일 변경 전 `target_harness` 또는 `general_code_change` 경로 하나를 선택하고 기존 구조화 결과 계약으로 사후 조건을 확인한다. 실제 handoff 실패를 이번 조사에서 만들거나 발견하지 않았다. (`ORCH-01:133`, `github-simple-executor/SKILL.md:8`, `workflow-code-editor/SKILL.md:8`, `file-change-execution-contract.md`)

## 대표 Workflow lifecycle — `feature-proposal`

다음은 **[source와 fixture에서 재구성한 정적 예시]**이며 runtime 실행 기록이 아니다. Definition은 `FP-1`부터 시작하고, test source는 `new_request` synthetic fact state에서 `FP-1`/`issue-creation`이 기대되는 케이스와 이후 각 대표 상태를 기술한다. (`DEF-FP`, `FIX-FP`, `TEST-FP`)

1. **Observation** — Primary가 요청을 확인해 `feature_proposal_requested=true`를 `source_kind=user_input`과 식별 가능한 `source_reference`·`field_reference`를 붙여 전달한다고 가정한다. `feature-proposal-state-adapter.mjs`는 이 fact가 `user_input` 출처인지 확인한다. 이 adapter가 실제 요청이나 GitHub를 조회하는 것은 아니다.
2. **Fact normalization** — 공통 adapter는 fact 값을 `feature-proposal.json`의 boolean domain과 evidence 계약에 대조한다. 확인된 fact만 `normalized_fact_state`에 남기며 아직 관측하지 않은 fact는 생략한다. 오류가 있으면 partial 결과 없이 `stopped`로 끝난다.
3. **Transition evaluation at `FP-1`** — `feature_proposal_requested=true`로 `normalized_fact_conditions`는 성립한다. `feature_proposal_draft_confirmed=true`가 아직 관측되지 않아 completion predicate는 참이 아니므로 evaluator는 `action_required`, `task_action_id=FP-1`, `user_decision_options=[confirm_draft, revise_draft]`, `executor_reference=issue-creation`을 반환한다.
4. **Human checkpoint** — `ORCH-01`은 선택지가 비어 있지 않으면 사용자 결정을 확정할 때까지 멈춘다. `issue-creation`은 초안 산출 스킬이므로 이 상태에서 초안 발행 또는 다음 transition을 자동으로 확정하지 않는다. 사용자 결정은 `feature_proposal_draft_confirmed` observation으로 돌아온다.
5. **Action 및 재평가** — 사용자 결정과 초안 확정 뒤 같은 `FP-1`을 새 state로 다시 평가하면 완료 predicate가 참이고 무조건 edge를 따라 `FP-2`가 된다. `FP-2`는 이슈 생성 completion fact를 기다리며, 실행 참조는 `github-simple-executor`다. 성공 결과를 다시 관측해 `feature_proposal_issue_created=true`가 되면 같은 `FP-2`에서 재평가하여 `FP-3`으로 이동한다. 이는 orchestration 문서에 선언된 순서이지 이번에 실행한 동작이 아니다.
6. **방향 결정과 분기** — `FP-3`은 `feature_proposal_direction` 존재를 completion으로 보고 3개 방향을 사용자 선택지로 둔다. `FP-4`가 방향 반영을 완료하면 선언된 enum 값 하나로 `FP-5`, `FP-6`, `FP-7` 중 하나를 고른다. `do_not_proceed`는 `FP-5`에서 종료 조건을 만족하고, 두 후속 전환은 각각 원 제안 이슈 종료 뒤 `FP-9` 또는 `FP-10`에서 후속 transition 완료를 확인한다.
7. **Terminal completion** — `FP-8`은 방향별 반영·종료·후속 전환 fact의 조합을 terminal predicate로 선언한다. evaluator는 predicate가 참이고 rule 배열이 비었을 때만 `{status: completed, task_action_id: FP-8}`을 반환한다. 방향 결정만으로 완료 처리하지 않는다.

`feature-proposal-states.json`의 `completed_*` 세 state와 테스트의 완료 assertion은 위 분기 결과를 위한 synthetic 예시다. 테스트 source는 실제 GitHub 상태나 이력의 증거가 아니다. (`FIX-FP`, `TEST-FP`)

## 안전 중단, 사용자 결정 대기, 완료

| 결과/경계 | 의미와 소유자 |
| --- | --- |
| `action_required` + 비어 있지 않은 `user_decision_options` | evaluator가 현재 task가 미완료임을 계산한 결과다. `github-agentic-loop`가 옵션을 제시하고 입력을 기다린다. evaluator 자체가 `user_decision_pending`을 반환하는 것은 아니다. |
| `action_required` + executor reference | action 후보와 범위를 orchestration이 받아 structured execution contract 및 맞는 executor를 판정한다. 결과 자체는 side effect가 아니다. |
| `stopped` / `invalid_definition`, `invalid_state`, `current_task_action_not_found`, `current_task_action_condition_not_met`, `no_transition_match`, `multiple_transition_matches`, `evaluation_cycle` | 불일치·불충분·잘못된 입력에서 다음 실행을 계산하지 않는 안전 경계다. Validator가 조건부 규칙의 full declared domain 빈틈/중복을 거르더라도, evaluator는 runtime state에 대해 0개/복수 match를 다시 방어한다. |
| `completed` | 완료 predicate가 참인 terminal node에서만 반환한다. 터미널 노드도 predicate가 아직 거짓이면 먼저 `action_required`다. |
| 취소 | 현재 Definition/evaluator 결과에 별도 `cancelled` status나 cancellation edge는 없다. `do_not_proceed`는 `feature-proposal`의 정상 업무 분기이지 사용자가 임의로 workflow를 취소하는 상태와 같지 않다. 사용자 보류·실행 중단은 structured execution 계약에서 다루지만, workflow terminal state로 명시된 취소 모델은 확인되지 않았다. |

### 미종료 action의 executor가 `null`인 경우

**[현재 source]** Definition contract는 `executor_reference`로 문자열 또는 `null`을 허용한다. `evaluator.mjs`는 그 값을 그대로 `action_required`에 포함하고, `ORCH-01`의 자동 실행 후보 규칙은 reference가 존재하는 task에 적용된다. Definition에는 비종료 `null` node도 있다. 예를 들어 `FC-5`는 구현 시작·모든 작업 merge·완료 항목 반영을 기다리고, `FI-2`는 브랜치 전환 사실을 요구한다. (`DOC-01:76`, `evaluator.mjs:107`, `ORCH-01:155`, `DEF-FC`, `DEF-FI`)

**[분석/명세 공백, runtime 영향 미확인]** 계약은 비종료 `action_required`에 `executor_reference=null`과 빈 decision list가 함께 나왔을 때 “외부 상태를 기다림”, “primary의 조율 작업”, “중단 후 사용자가 재개” 중 어떤 응답을 해야 하는지 명시하지 않는다. 일부 null node는 외부 완료 fact를 기다리는 것으로 읽히지만, 모든 null task의 의미가 같다고 source가 선언하지는 않는다. 따라서 이를 현재 runtime 결함으로 확정하지 않고 다음 Day의 정책 질문으로 넘긴다.

## 문서 설계와 현재 구현 대조

| 주제 | 현재 문서 설계 | 현재 source 대조 | 판단 |
| --- | --- | --- | --- |
| Definition schema | 닫힌 JSON, fact domain, 명시 transition graph, terminal rule 없음으로 terminal 표현 | `validator.mjs`가 동일 필드와 domain/graph를 직접 검증하고 JSON Schema를 추가하지 않음 | 일치 (`DOC-01`, `VAL-01`) |
| Fact 정규화 | source/evidence가 연결된 observation만 정규화; 누락 fact는 생략 가능 | workflow adapter의 source map + 공통 normalizer가 같은 계약을 적용 | 일치. adapter는 raw GitHub parser가 아님 (`DOC-02`, `DOC-03`, `ADP-01`) |
| Transition 계산 | 단일 evaluator 결과를 현재 task로 사용하고 재개 시 task ID로 같은 node 재평가 | evaluator는 action_required/terminal/stopped를 구현하고 edge match의 0/복수도 fail-closed | 일치 (`ORCH-01`, `EVAL-01`) |
| Executor reference | 직접 참조 식별자 또는 null; registry 도입 없음 | Validator는 string/null만 검사하고 validation mode 문서도 registry 해석을 금지 | 일치. 현재 값이 등록된 목록에 드는지 검사하는 계층을 제안할 근거는 없음 (`DOC-01`, `validation-mode-contract.md:16`) |
| `null` executor의 진행 방식 | null 허용 | evaluator 값 반환 및 skill의 자동 실행 규칙은 있으나 non-terminal null action의 대화상 응답/재개 방식은 규정 없음 | 명세 공백. actual stalled run은 확인하지 못함 |
| evaluator의 실제 호출 연결 | Skill은 정상 흐름에서 normalization 및 `evaluateWorkflowDefinition` 단일 호출을 규정 | JS export와 파일 기반 CLI가 존재한다. 다만 검토한 Skill/reference에서 `cli.mjs`를 실제 호출하는 명령이나 별도 caller binding은 확인하지 못함 | runtime adapter/tool 호출이 별도로 있을 수 있어 결함 판정 불가. source-only로는 지침 준수 및 실제 evaluator 실행을 입증할 수 없음 |
| cancellation | Phase 3 로드맵이 resume/cancellation을 주제로 제시 | 현재 Workflow Definition/status 모델에는 명시 `cancelled` 상태/edge가 없음 | 아직 다뤄야 할 상태 모델 질문. 자동으로 누락 결함이라 판단하지 않음 (`ROAD-03`) |

이 조사는 source 구조 비교다. 실제 모델이 매 workflow 실행에서 JS evaluator를 호출하는지, `executor_reference=null`에서 host가 어떤 절차를 택하는지, 사용자 취소 후 어떤 재개 사실이 남는지 runtime 관측은 없다. (`EVAL-01`, `ORCH-01`, `[미확인]`)

## 현재 구조의 강점과 실제 확인된 문제

### 강점

1. **상태 공간이 명시적이다.** Workflow별 fact는 선언된 유한 domain을 가지며, task 전이와 terminal predicate를 JSON에서 추적할 수 있다. (`DEF-*`)
2. **결정론적 검증과 의미 판단이 분리돼 있다.** Validator는 도메인·표현식·그래프 무결성을 검사하고, orchestration은 GitHub/사용자/skill observation을 공급한다. (`VAL-01`, `DOC-03`)
3. **실행은 전이 계산과 분리돼 있다.** Evaluator와 adapter는 순수 함수이고, 실제 GitHub·파일 변경은 구조화 실행 계약을 따르는 executor가 한다. (`ADP-01`, `EVAL-01`, `EXEC-01`)
4. **안전 중단이 이중화돼 있다.** Definition validation은 규칙의 선언적 빈틈과 overlap을 막고 evaluator는 실제 input에서 no-match/multiple-match를 다시 거부한다. fixture/test source도 잘못된 정의, 미충족 상태, 안전 중단 결과를 다루도록 작성돼 있다. (`VAL-01`, `EVAL-01`, `TEST-EVAL`)
5. **Fact provenance와 사용자 gate가 있다.** Normalizer는 evidence 없는 candidate와 중복 fact를 거부하고, 사용자 선택은 실행 fact로 확정될 때까지 진행을 멈춘다. (`DOC-02`, `ORCH-01`)

### 실제 확인된 문제와 미확인 가설

- **재현된 active correctness bug: 없음.** 이번 조사에서 Definition 간 참조 오류, 선언 domain 밖 전이, validator/evaluator가 side effect를 하는 코드, source에 기록된 실제 잘못된 GitHub mapping이나 실행 incident를 확인하지 않았다.
- **명세 공백 1 — non-terminal `executor_reference=null`:** 위 표와 같이 합법 입력이지만 orchestration 응답이 명시되지 않았다. 현재 source에서 확인한 공백은 사실이나 실제 workflow 중단 사례는 아니다. correctness 영향은 가능성 수준, 운영 비용은 null 상태를 사람이 해석해야 할 가능성으로 한정한다.
- **명세/운영 연결 미확인 2 — evaluator 호출 경로:** Skill은 함수 호출을 규정하고 JS API·CLI는 있으나, normal skill runtime에서 어떤 도구 호출로 이어지는지 이 checkout의 문서/source만으로 닫히지 않는다. 이는 실행 정확성을 검증할 수 없는 범위이지, evaluator가 잘못 계산한다는 증거가 아니다.
- **정책 질문 — cancellation:** 별도 `cancelled` state는 없다. 사용자가 중단을 요청할 때 단순 `stopped`/대기/정상 terminal 중 무엇을 기록하는지 결정해야 할 필요가 있지만, 이번에는 사례를 관측하지 않았다.
- **fixture/test source는 실제 성능·runtime 증거가 아니다.** `feature-proposal.test.mjs`와 `evaluator.test.mjs`는 synthetic 입력 및 예상 결과 assertion을 포함하지만 실행하지 않았다. Phase 2 보고서에 기록된 이전 실행 수치 역시 그 시점의 과거 근거일 뿐 이번 checkout에서 다시 확인한 결과가 아니다. (`TEST-FP`, `TEST-EVAL`, `P2-01`)

### 증상·원인·영향 분류

| 항목 | 확인한 증상 | 원인 판단 | Correctness / 운영 비용 |
| --- | --- | --- | --- |
| null executor | non-terminal task가 `action_required`, null executor, 빈 선택지로 반환될 수 있지만 호출자 동작이 문서화되지 않음 | nullable field와 action-output을 정의한 contract에 null 처리 branch가 없는 것이 source에서 확인됨 | 잠재 correctness/coordination 모호성; 실제 오진행·정지 incident 없음. 우선 정책 명세 질문 |
| evaluator 호출 연결 | Skill은 함수 호출을 선언하지만 normal runtime caller/CLI 명령이 검토 파일에 없음 | host integration이 이 저장소 source에 없거나 문서화되지 않았을 수 있음. 원인은 미확인 | 실행 결과의 재현성/감사 가능성을 이번 조사에서 판정할 수 없음. 실제 잘못된 transition은 미관측 |
| partial observation | Definition fact 일부가 누락될 수 있고 evaluator가 `exists`/value 조건에 따라 false match를 반환할 수 있음 | partial facts를 허용하는 공통 adapter contract. 필요한 관측 사실이 불명확하면 상태 observation contract가 중단하도록 지시 | fail-closed no-match는 안전장치. 이번 조사에서 오류 mapping 또는 unsafe 실행은 확인하지 않음 |

## Phase 2의 범위 판단 유지

`P2-01`에서 정한 범위는 이번 Day에도 그대로 적용한다.

- 동일 `request_id`의 동시 중복 실행 방지는 조사·구현하지 않았고 보장한다고 표현하지 않는다. 계약의 atomic-slot 요구와 실제 owner 확인은 구분한다.
- GitHub 상태 판단은 `state-observation-contract.md`와 현재 adapter/source 계약을 따른다. mapping 오류를 발견하지 않았으므로 별도 parser를 제안하지 않는다.
- `workflow-code-editor` handoff는 현재 `file-change-execution-contract.md`와 `target-harness-execution-contract.md`를 사용한다. 실제 handoff failure가 발견되지 않았으므로 결함으로 취급하지 않는다.
- stdout/stderr 수집, 실행 log 보존·이식성 또는 중앙 저장 기능을 추가·제안하지 않는다.
- 새 common schema, executor registry, 공통 workflow registry는 반복적인 drift나 오류 근거 없이 도입 결론을 내리지 않는다. 현재 contract가 direct executor reference를 허용하고 validation-mode에서 registry 미사용을 선언한다.
- Harness 재진입, Workflow 시작/재개, GitHub 상태 변경, 테스트 실행, remote fetch를 하지 않았다.

## 증상과 원인에 따른 후보 분류

### 즉시 수정

없음. 재현 가능한 source correctness bug나 현재 정의에서 잘못된 transition을 만드는 구체적 증거를 확인하지 못했다.

### 정책 검토

- **Non-terminal null executor 처리 정책:** null과 빈 decision list가 동시에 반환될 때 wait-for-fact, orchestration-owned step, 사용자 중단 중 어떤 계약을 적용할지 결정할 필요가 있는지 검토한다. 먼저 Day 2에서 실제 transition 예와 계약을 더 대조한다. 현재 결함 판정은 아니다.
- **Cancellation semantics:** user cancellation, safe stop, incomplete/waiting action, terminal `completed`를 구분하는 명시 모델이 필요한지 Phase 3 범위에서 검토한다.

### 기능 제안

없음. source에 registry, 공통 schema, parser, log collector 또는 새 runtime을 추가해야 한다는 확인된 오류·비용 근거가 없다.

### 보류

- 정상 Skill runtime의 evaluator 호출 연결은 host/tool 경로를 확인하기 전까지 미확인으로 유지한다. 이번 Day에는 실행 진입을 하지 않았다.
- `no_transition_match`·`multiple_transition_matches`의 실제 발생 빈도와 영향은 현재 workflow runtime 관측이 없어 판단하지 않는다. Fixture assertions를 incident로 세지 않는다.
- 동일 request ID 동시성, raw GitHub mapping, handoff failure, 추가 로그 수집은 Phase 2 결정에 따라 현재 범위 밖이다.

## 다음 Day 조사 질문 및 근거 식별자

Phase 3 상세 day-plan 파일은 이번 checkout의 `docs/workshops/repository-evolution/phases/`에서 Phase 1·2만 확인했다. 따라서 아래는 Phase 3 roadmap 주제인 State Machine, Transition Rules, Resume and Cancellation, Workflow Composition, Policy-driven Routing에 근거한 다음 Day 질문 초안이며 이미 승인된 계획은 아니다. (`ROAD-03`)

1. **`executor_reference=null`인 미완료 task를 orchestration은 어떻게 처리해야 하는가?** `FC-5` 외부 구현 완료 대기, `FI-2` branch switch, `FI-8` work-unit routing에서 action_required가 만들어지는 경로를 대조하고, 대화상 대기·실행·재개 조건을 source에서 확인한다. (`DEF-FC`, `DEF-FI`, `ORCH-01`, `DOC-01`)
2. **재개 기준은 어떤 값으로 고정되고 어떤 값을 다시 관측하는가?** structured execution contract의 `currentTaskActionId`, fresh snapshot과 GitHub 우선 규칙이 실제 current task 재평가에 어떻게 대응하는지 정적으로 정리한다. 같은 request ID의 동시 중복 방지는 범위 밖으로 유지한다. (`EVAL-01`, `DOC-03`, `structured-execution-contract.md`)
3. **`stopped`, 사용자 결정 대기, 외부 상태 대기, 정상 `do_not_proceed`, `completed`와 cancellation은 어떤 상태 전이 관계인가?** 정의된 terminal node가 아닌 중단 후 재개/취소의 사용자 계약을 찾아 대조한다. (`DOC-01`, `ORCH-01`, `structured-execution-contract.md`, `DEF-FP`)
4. **Definition 사이 workflow composition은 어떤 fact와 orchestration 선택으로 연결되는가?** `feature-proposal → policy-review/feature-change → implementation`, `feature-fix → implementation`에서 후속 Definition 선택·전환 완료 fact·원 이슈 close-first 조건을 추적한다. 별도 registry가 필요하다고 가정하지 않는다. (`DEF-FP`, `DEF-PR`, `DEF-FC`, `DEF-FF`, `DEF-FI`, `DOC-03`)
5. **Evaluator API가 정상 orchestration에서 실제로 호출된다는 근거는 어디에 있는가?** 현재 source의 export/CLI와 skill 지시 사이 host/tool binding을 확인할 수 있는 안전한 정적 자료가 있는지 살핀다. 실제 workflow 시작이나 GitHub 변경으로 검증하지 않는다. (`EVAL-01`, `ORCH-01`, `[미확인]`)
6. **Implementation의 반복 그래프는 어떤 완료 fact로 loop에서 빠져나오는가?** work-unit loop(`FI-5..FI-9`)와 review feedback loop(`FI-25..FI-34`)에서 선언 조건, missing fact 시 fail-closed 결과, fixture coverage를 대조한다. 테스트 실행은 하지 않는다. (`DEF-FI`, `VAL-01`, `EVAL-01`, `FIX-EVAL`, `TEST-EVAL`)

## Day 1 완료 조건 체크리스트

- [x] 현재 branch, HEAD, 시작 worktree, local `main`, cached `origin/main`, ancestor 관계, ahead count와 fetch 미실행 한계를 기록했다.
- [x] 다섯 Workflow Definition의 목적, fact domain, 대표 transition/action 흐름과 terminal을 현재 JSON source에서 조사했다.
- [x] Definition, observation/adapter, validator, evaluator, orchestration skill, executor 책임을 분리했다.
- [x] `feature-proposal` 입력→fact normalization→FP-1/FP-2 평가→사용자 gate→분기→terminal 흐름을 source/fixture 근거로 재구성했고 runtime 관측처럼 표현하지 않았다.
- [x] `user_decision_options`, `no_transition_match`, `multiple_transition_matches`, `completed`, safe stop 및 취소 미표현 경계를 확인했다.
- [x] JSON에 선언된 규칙과 adapter/validator/evaluator/orchestration에 남아 있는 규칙을 구분하고 schema/registry 도입 결론을 내리지 않았다.
- [x] `request_id` 동시성, GitHub mapping, `workflow-code-editor` handoff, 로그 수집·보존의 Phase 2 범위를 유지했다.
- [x] 현재 source, 문서 설계, 이전 관측, fixture/test source, 분석 판단, 미확인 항목을 구분했다.
- [x] 테스트를 작성·실행하지 않았고 Workflow 시작·재개, GitHub 상태 변경, fetch를 하지 않았다.
- [x] 산출물은 이 조사 보고서 하나로 한정했다.
