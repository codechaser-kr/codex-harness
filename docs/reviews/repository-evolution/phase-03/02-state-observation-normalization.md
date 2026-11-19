# Phase 3 Day 2 — State Observation and Fact Normalization

## 문서 성격과 조사 한계

이 문서는 Repository Evolution Workshop Phase 3 Day 2의 정적 조사 기록이다. 공식 설계나 확정 정책을 대체하지 않는다. 현재 checkout의 계약, skill, Definition, adapter, evaluator, fixture/test source를 읽어 근거 경계를 추적했다. GitHub 조회, Workflow 시작·재개, evaluator/normalizer 실행, 테스트 작성·실행, fetch는 하지 않았다.

근거 표시는 다음과 같다.

- **[현재 source]** 현재 checkout에서 직접 읽은 코드, JSON, skill, 계약 문서, Git 기준선
- **[설계]** 문서와 skill이 선언한 책임·처리 규칙. runtime 실행을 입증하지 않음
- **[fixture/test source]** synthetic 입력과 assertion이 다루도록 작성된 사례. 실행 결과가 아님
- **[분석 판단]** source를 연결한 해석이며 실제 incident와 구분
- **[미확인]** 현재 저장소의 정적 자료로 연결되지 않은 producer 또는 동작
- **[사용자 의도]** 이전 대화에서 정한 정책 방향. 현재 source 구현 사실로 간주하지 않음

`02-resume-and-cancellation.md`는 보조 조사 기록으로만 확인했다. 그 안의 `FC-5`, `FI-*`, `FF-*`, 취소 후 재개에 대한 대화상 판단은 아래에서 사용자 의도로만 분류한다.

## Git 기준선

조사일은 2026-11-19 (Asia/Seoul)이다. fetch 없이 조사 시작 시 확인한 기준선은 다음과 같다.

| 항목 | 값 |
|---|---|
| 현재 branch | `docs/repository-evolution-workshop` |
| HEAD | `4a89a408bb5dcaf3cd60d68c41ec7eaf2271e776` |
| 작업 트리 | `git status --short` 출력이 비어 있음 |
| local `main` | `e0a3f690ce0e58e31c8eac1d5a198625ab05541a` |
| cached `origin/main` | `e0a3f690ce0e58e31c8eac1d5a198625ab05541a` |
| `main...HEAD` | `0 20`; local `main`은 HEAD의 조상 |
| 원격 최신 여부 | **미확인**. `origin/main`은 cached remote-tracking ref이고 fetch하지 않음 |

이 기준선은 이전 Day 보고서의 HEAD와 다르므로 해당 기록의 수치를 이번 조사 값으로 사용하지 않았다.

## 선택한 Workflow와 대표 fact provenance

`feature-change`와 `feature-fix`를 서로 다른 이슈 유형의 예로 선택했다. 전자는 확정된 기능 변경 요청의 범위·완료 기준을 다루고 후자는 결함 제보의 원인 조사와 해결 계획을 다룬다. 이 두 흐름의 구현 연결 뒤에 공통 `implementation`의 PR·review thread fact도 함께 추적했다. (`github-agentic-loop/SKILL.md`의 Workflow 선택표, 각 Definition)

아래의 `#N`, 요청 ID, fixture 문자열은 설명용 식별자 또는 test source의 synthetic 값이다. 이번 조사에서 실제 Issue, PR, 사용자 입력은 조회하지 않았다.

| Workflow / fact | 원본 근거와 원본 필드 | 읽기·판단 주체와 typed observation | adapter 계약과 Definition domain | provenance |
|---|---|---|---|---|
| `feature-change` / `feature_change_scope_identified` | 현재 사용자 요청 및 선택된 기준 이슈가 있다면 그 번호와 판정에 쓴 본문 heading. 단일 범위가 식별되는지를 판단한다. | **[설계]** Workflow primary가 routing check를 산출한다. 계약상 `source_kind=local_state`, `source_reference=request_id`, `field_reference=routing_check.feature_change_scope_identified`. state adapter는 이 결정을 대신하지 않는다. | `feature-change-state-adapter.mjs`는 `local_state`만 요구한다. Definition domain은 `[true, false]`; 정상값은 단일 범위가 식별되면 `true`, 없거나 복수 후보면 `false`. | **보존됨.** Normalizer 결과의 `evidence_by_fact`로 복사된다. 실제 요청/이슈 필드까지의 연결은 primary가 source reference와 routing 입력을 기록해야 한다. |
| `feature-change` / `feature_change_entry_source` | 직접 기능변경 요청인지, 기능제안 또는 정책검토에서 전환됐는지. 과거 전환 fact의 누적값만으로 현재 진입 경로를 추론하지 않는다. | **[설계]** Workflow primary가 현재 요청의 진입 출처를 산출한다. 계약상 `local_state`, `request_id`, `routing_check.feature_change_entry_source`. | adapter는 `local_state`를 허용한다. Definition domain은 `direct_request`, `feature_proposal`, `policy_review`. 직접 요청이면 나머지 routing facts도 필요하다. | **보존됨.** 다만 contract가 요구한 `request_id`와 구체 field reference를 adapter가 강제하지 않는 차이는 아래 확인된 불일치에 기록했다. |
| `feature-fix` / `fix_analysis_result_usable` | `fix-analysis` 결과의 구조화된 산출물. `artifact-output-contract.md`는 기준 이슈, 문제 요약, 재현/확인 결과, 원인 후보, 추천 원인, 잠정 해결 방향, 보류 질문 등의 사용 가능 기준을 둔다. | **[설계]** 전용 skill이 후보 분석을 내고 Workflow primary가 그 산출물이 기준을 만족하는지 판단해 typed fact로 포함한다. raw 자유 형식 문장 자체를 fact 값으로 사용하지 않는다. | `feature-fix-state-adapter.mjs`는 `source_kind=skill_output`, `source_reference=fix-analysis`를 요구한다. Definition domain은 `[true, false]`. `field_reference`는 adapter에서 비어 있지 않은 문자열만 검사한다. | **보존됨.** Test source의 synthetic 예는 `facts.fix_analysis_result_usable`를 가리킨다. 실제 skill 산출물과 typed field의 실행 연결은 미확인이다. |
| `implementation` / `pull_request_merged` | 연결된 PR의 GitHub `merged` 값 또는 PR `state`. 관측 계약은 `merged=true` 또는 `state=MERGED/merged`를 merged 상태로 판정한다고 명시한다. | **[설계]** GitHub 읽기 주체가 PR 상태를 읽고 Workflow primary가 bool observation을 구성한다. `github-state-summary`는 출처 있는 read-only 결과를 반환하되 action/전이는 결정하지 않는다. | `implementation-state-adapter.mjs`는 `github_state`를 요구한다. Definition domain은 `[true, false]`; FI-35/FI-36은 `true`를 merge 완료 조건으로 참조한다. | **보존됨.** Fixture의 예시는 `source_reference=PR #99`, `field_reference=facts.pull_request_merged`지만 이는 test 식별자이며 실제 GitHub API 필드 경로가 아니다. |
| `implementation` / `github_review_threads_observed` | PR의 diff에 연결된 review thread와 resolved/unresolved 상태. 일반 PR issue comment는 review feedback 정본으로 쓰지 않는다. | **[설계]** GitHub 상태 읽기 주체가 thread 상태를 관측하고 primary가 boolean fact로 구성한다. 현재 source에는 raw thread 응답 parser가 보이지 않는다. | adapter는 `github_state`를 요구한다. Definition domain은 `[true, false]`; FI-24 완료 조건은 이 fact가 `true`이고 `review_feedback_inventory`가 존재하는 것이다. | **보존됨.** Fixture는 `PR #99 unresolved review threads`를 source reference로 쓴다. 정확한 raw field path와 `false`의 의미는 계약에서 더 구체화되지 않았다. |
| `implementation` / `review_feedback_inventory` | unresolved threads와 이미 처리한 feedback의 비교 결과. 결과 domain은 `actionable_feedback_present` 또는 `no_actionable_feedback`. | **[설계]** 현재 source는 이를 `local_state`로 분류한다. 의미상 thread 관측에 의존하지만, 그 집계 값을 만드는 별도 producer 코드는 이 범위의 source에서 확인하지 못했다. | adapter는 `local_state`를 요구한다. Definition은 FI-24에서 이 enum으로 FI-25 또는 FI-34를 고른다. | **보존됨.** Fixture는 `unresolved threads and processed feedback comparison`을 source reference로 사용한다. 실제 집계 과정은 미확인이다. |
| `implementation` / `feedback_resolution` | 사용자가 특정 review thread 피드백을 `resolved` 또는 `unresolved`로 처리하겠다고 결정한 입력. GitHub thread의 현재 resolved 상태와는 별도 사실이다. | **[설계]** 사용자 선택을 다음 상태 묶음에 포함한다. adapter는 사용자 입력이 아닌 다른 source kind를 거부한다. | `implementation-state-adapter.mjs`는 `user_input`을 요구한다. Definition domain은 `resolved`, `unresolved`. | **보존됨.** Fixture의 `feedback resolution decision`은 synthetic source reference이며 raw 대화 위치의 구조는 미확인이다. |

`source_kind`는 사실의 종류를, `source_reference`는 원본 식별자를, `field_reference`는 값을 뒷받침한 원본 위치를 가리키도록 설계돼 있다. Definition은 값 domain만 선언하고 source/provenance 규칙은 workflow adapter에 둔다. Adapter는 evidence를 결과에 보존하지만 해당 reference가 실제 원본을 가리키는지 해석하거나 조회하지 않는다.

## Raw observation에서 evaluator까지의 책임 경계

| 단계 | 현재 source에서 확인되는 책임 | 확인되지 않는 점 |
|---|---|---|
| 원본 상태 읽기 | `state-observation-contract.md`는 Issue/PR 상태, issue body의 `Refs #번호`, checklist, PR review thread resolved/unresolved, 로컬 Git 판정 기준을 정의한다. `github-state-summary/SKILL.md`는 허용된 read-only GitHub/local 조회와 출처 식별자·조회 시점 기록을 선언한다. | raw GitHub API 응답을 특정 `fact_id`로 변환하는 실행 parser/observation producer는 workflow-definition source에 없다. `parser.mjs`는 JSON 입력 파싱 경로이지 GitHub API parser가 아니다. 현재 저장소에서 보이지 않는 host/tool 경로는 추정하지 않는다. |
| Typed observation 구성 | `github-agentic-loop/SKILL.md`는 네 출처(GitHub, local, user, skill)의 원본 상태를 한 시점의 묶음으로 수집한 뒤 선택된 workflow adapter를 호출한다고 설계한다. observation 모양은 `fact_id`, `value`, `source_kind`, `source_reference`, `field_reference`다. | 실제 runtime에서 어떤 주체가 raw REST/GraphQL/`gh` 결과를 읽고 이 객체를 생성하는지, provenance를 어떤 영속 입력에서 가져오는지는 미확인이다. |
| Workflow adapter 검증 | 각 `*-state-adapter.mjs`는 공통 `workflow-state-adapter.mjs`를 호출한다. 공통 경로는 workflow ID, Definition facts와 source contract의 빠짐/초과, 닫힌 observation 객체, 필수·문자열 필드, `source_kind`, skill fact의 고정 `source_reference`를 검사한다. | GitHub/local/user `source_reference`가 실제 Issue/PR/request를 가리키는지, `field_reference`가 허용된 원본 필드인지 확인하지 않는다. |
| 공통 normalization | `normalizeFactCandidates`가 Definition을 validator로 검증하고 fact ID, scalar type/domain, 중복 fact, evidence 구조와 최소 1개 evidence를 검사한다. 성공 시 Definition 선언 순서로 값을 만들고 evidence를 복사한다. | 원본을 다시 읽거나, 값과 여러 evidence 사이의 의미적 모순을 판단하지 않는다. |
| Evaluation | `evaluateWorkflowDefinition`은 normalized state만 받아 현재 task와 completion/next rule을 계산한다. 외부 IO와 상태 변경은 하지 않는다. | evaluator는 `evidence_by_fact`를 입력받지 않으므로 source/provenance의 충돌 원인을 출력에서 복원할 수 없다. |

`github-state-summary`의 출력 계약에는 `observed_facts`와 별도의 `missing_or_conflicting_facts`가 있다. 그러나 workflow adapter의 typed 입력은 observation 배열 하나이며 이 구분 필드가 없다. 따라서 설계대로라면 primary가 충돌을 감지해 정규화 전에 중단하거나 누락을 유지해야 한다. 이 분기가 실제 host에서 실행되는지는 이 checkout source로 확인되지 않는다.

## Missing, ambiguous, conflicting, invalid 입력

| 입력 상태 | Observation contract / primary 설계 | Normalizer·adapter 결과 | Evaluator가 볼 수 있는 결과와 한계 |
|---|---|---|---|
| 근거가 있어 명시적으로 `false` | `false`를 허용 domain의 명시값으로 제공하고 source/evidence를 연결한다. 예: 기능변경 진입 routing의 `additional_policy_decision_required=false`. | 값과 evidence가 `normalized_fact_state` 및 `evidence_by_fact`에 포함된다. | `equals false`는 일치하고 `exists`도 참이다. 다만 `action_required` 결과 자체는 이 값이 어떤 source에서 왔는지 포함하지 않는다. |
| 이번 관측에서 제공되지 않은 fact | 상태 요약의 missing 항목으로 유지하고 값을 보충 추론하지 않는다. Normalization contract는 omitted fact를 허용한다. | Fact key와 evidence key를 모두 생략한다. 전체 입력 오류로 처리하지 않는다. | `exists`/`not_exists`는 존재 여부를 구분한다. `equals false`에서 missing은 일치하지 않는다. 하지만 completion predicate가 미충족일 때 같은 `action_required`가 반환될 수 있어 출력만으로 “명시 false”와 “missing”을 판별하지 못한다. 필요 task 조건이 안 맞으면 `current_task_action_condition_not_met`, 전이 규칙이 하나도 안 맞으면 `no_transition_match`가 될 수 있다. |
| 둘 이상의 source가 충돌 | 상태 요약은 conflict로 분리한다. 이슈 유형의 label/title이 충돌하거나 하나의 작업을 고를 근거가 모호하면 Skill/관측 계약은 중단을 지시한다. 날짜별 log가 GitHub 완료·미완료 상태와 충돌하면 그 상태 판단에는 GitHub를 우선한다. | 같은 `fact_id`가 서로 다른 값으로 두 번 전달되면 중복 candidate로 `invalid_fact_candidates` 중단, 두 결과 map 모두 빈 객체다. 공통 candidate에 여러 evidence가 붙더라도 evidence 항목 자체에는 값이 없어 normalizer는 그 evidence끼리의 모순을 검사하지 않는다. Workflow observation 객체는 evidence 배열을 받지 않고 source reference 한 쌍만 받는다. | evaluator는 증거와 충돌 원인을 받지 않는다. 정규화 전에 중단하지 않고 충돌 observation을 빠뜨렸거나 임의의 한 값만 선택했다면 그 사실을 출력에서 알아낼 수 없다. 중복 입력 중단은 evaluator에 도달하지 않는다. |
| 값 또는 provenance 형식 위반 | Source kind·출처가 틀렸거나 충분한 근거가 없으면 추론으로 보완하지 않고 중단한다. | observation shape/source kind/reference 검증 실패는 `invalid_observations`; Definition/source contract 차이는 `workflow_id_mismatch` 또는 `source_contract_mismatch`; fact domain/type/evidence 오류는 `invalid_definition` 또는 `invalid_fact_candidates`. 어떤 normalization 오류든 partial state/evidence를 채택하지 않는다. | 별도로 잘못 만들어진 normalized state가 evaluator에 들어가면 unknown fact, type/domain 오류는 `invalid_state`로 중단한다. evaluator는 evidence provenance 자체를 검증하지 않는다. |

### False와 missing 해석의 세부 한계

**[현재 source]** Expression 구현은 fact의 존재 여부를 별도로 읽으며 `exists`와 `not_exists`를 지원한다. 반면 `equals`/`in`은 fact가 없으면 false를 반환한다. (`expression.mjs`, `evaluator.mjs`)

**[분석 판단]** 따라서 normalized state 자체에서는 명시적 `false`와 missing이 다르지만, 둘 다 completion predicate를 충족하지 않는 경우 evaluator가 반환하는 `action_required`의 필드는 같다. 평가 결과만으로 원본 관측 상태를 재구성할 수 없고, `no_transition_match` 역시 missing이 직접 원인인지 다른 조건 조합 때문인지 증명하지 않는다. 이 차이는 evidence/state input을 함께 확인해야 한다.

## GitHub 정본과 보조 local evidence

**[설계]** Issue, PR, label, checklist, PR review thread의 완료·미완료 사실은 GitHub 상태에서 읽는다. 날짜별 `.github-agentic-loop/logs/github-workflow-log-YYYY-MM-DD.md`와 현재 코드, 대화의 이전 결정·실행 기록은 중간 실행 상태를 위한 보조 근거다. 보조 log가 GitHub의 완료 또는 미완료 근거와 충돌하면 GitHub 실행 상태를 우선하며, 이전 log에서도 재개 근거를 복원하지 못하면 추론하지 않고 중단한다. (`state-observation-contract.md`; Phase 2 summary의 Source of Truth 절)

이 우선순위는 모든 사실 영역에 대한 일반 precedence로 확대하지 않는다. 예를 들어 사용자의 명시 결정 fact는 `user_input`, 리뷰 skill의 사용 가능 판정은 `skill_output`으로 별도 provenance를 갖는다. 이번 보고서는 날짜별 log를 상태 사실로 사용하거나 로그·stdout/stderr 수집·보존 기능을 제안하지 않는다.

## Contract와 현재 source 대조

### 일치하는 부분

- **[설계/현재 source]** 다섯 Workflow Definition에 유한 fact domain이 선언돼 있고, 다섯 workflow별 adapter는 공통 adapter를 호출한다. 각 adapter의 source map은 사실별 허용 source kind를 둔다. Skill output fact 일부는 `feature-plan`, `fix-analysis`, `commit`, `review-comment` 등 정확한 `source_reference`도 제한한다.
- **[설계/현재 source]** Observation, candidate, evidence는 닫힌 객체다. Evidence의 네 종류, 비어 있지 않은 source/field reference, Definition domain 안의 값, 중복 ID 거부, 실패 시 전체 결과 비우기, missing fact 생략, Definition 순서 출력이 contract와 코드에 대응한다.
- **[fixture/test source]** `normalized-fact-adapter.test.mjs`와 Workflow별 adapter test source는 반복 호출의 JSON 결과 일치, 입력 비변경, evidence 복사, 누락 fact 생략, 순서 보존, 잘못된 source/domain/중복의 atomic failure 사례를 작성해 둔다.

### 확인된 contract/test source 불일치

**[확인된 source 차이; runtime 오류로 확대하지 않음]** `state-observation-contract.md`는 기능변경 진입의 다섯 routing fact 모두 `source_reference=request_id`와 각 `routing_check.*` field reference를 요구한다. 그러나 `feature-change.test.mjs`의 `validObservations()`는 네 routing fact의 source reference에 `request routing`을 사용하고, 기본 field reference `facts.<fact_id>`를 둔다. `feature_change_entry_source`도 source reference는 `request routing`이며 field reference만 요구 형식이다. 같은 test source는 이 입력이 정규화되고 evidence가 보존되는 예상 결과를 assertion으로 기술한다.

현재 `feature-change-state-adapter.mjs`의 source contract는 이 fact들에 대해 `source_kind=local_state`만 정의하고, 공통 adapter는 `source_reference`와 `field_reference`가 비어 있지 않은지만 확인한다. 따라서 해당 test source는 adapter의 syntactic 계약을 보이지만 `state-observation-contract.md`가 요구한 routing provenance를 확인하지 않는다. 이 차이는 test/contract 정합성 검토 대상이다. producer가 실제로 계약을 어긴다는 runtime 증거는 없으며 이번 조사에서 수정하지 않았다.

### 차이와 미확인 사항

- **[미확인] raw GitHub → observation parser/producer:** 상태 판정 규칙과 skill 출력 계약은 있으나 GitHub API 응답·로컬 출력·사용자 메시지·skill 결과를 typed observation으로 만드는 구현 경로가 보이지 않는다. `github-state-summary`도 skill 계약이며 실행 parser source는 아니다.
- **[미확인/계약 연결] conflict 전달:** `missing_or_conflicting_facts`를 typed observation 입력에 어떻게 유지하는지, conflict가 발견됐을 때 누가 어떤 오류로 adapter 호출을 막는지 코드 경로가 확인되지 않는다. 계약은 추론 금지/중단을 말하지만 adapter는 개별 fact 생략을 정상화할 수 있다.
- **[미확인] provenance 검증 깊이:** adapter는 `source_kind`와 일부 skill `source_reference`를 제한하지만 GitHub/local/user reference의 실재성, `field_reference`의 source 경로 정확성은 확인하지 않는다. 계약이 그 확인을 primary에게 맡기는지 현재 source만으로 닫히지 않는다.
- **[명세 불충분] review thread boolean:** 상태 계약은 review thread의 diff 피드백과 resolved/unresolved를 정의하지만 `github_review_threads_observed=false`의 의미와 raw field mapping은 자세히 규정되지 않는다. Fixture는 unresolved thread 사례를 `true`로 둔다. `review_feedback_inventory`는 별도 local enum fact이며 실제 집계 producer는 보이지 않는다.
- **[현재 source]** Definition domain은 fact 값을 검사하지만 원본 provenance 제약은 선언하지 않는다. 그 제약은 workflow adapter/source contract가 담당한다. evaluator는 이미 provenance가 제거된 state만 받아 의미 평가를 수행한다.

## Repeated normalization과 fixture/test source

**[현재 source]** 공통 normalizer는 먼저 Definition 순서대로 사실을 순회하고, 전달된 candidate에서 값을 복사한다. 입력 객체를 변경하거나 외부 IO를 호출하지 않는다. 같은 Definition과 candidate 순서라면 같은 key 순서와 같은 evidence 내용을 만들도록 구현돼 있다.

**[fixture/test source]** 다음 test source는 일관성 기대를 명시한다.

- `normalized-fact-adapter.test.mjs`: 동일 input 두 번 정규화한 JSON 결과 일치, 입력 비변경, evidence 복사, Definition 순서, missing 생략, duplicate/domain/evidence 오류에서 빈 결과.
- `feature-change.test.mjs`, `feature-fix.test.mjs`, `feature-proposal.test.mjs`, `policy-review.test.mjs`: adapter 반복 결과 equality, Definition 순서, source 계약 거부, 복사된 evidence assertion.
- `implementation.test.mjs`: fixture의 44 observation source가 Definition facts와 대응한다는 assertion, Definition 순서와 부분 관측 결과, source/domain/duplicate/malformed 입력에 대한 fail-closed assertion.
- `evaluator.test.mjs`와 `fixtures/evaluation-cases.json`: missing fact로 인해 전이 규칙이 0개 또는 복수 일치하는 안전 중단 입력, invalid state/domain 입력 사례.
- `fixtures/feature-change-states.json`, `feature-fix-states.json`, `implementation-states.json`: 단계별 normalized state와 provenance 예시. 실제 Issue/PR snapshot이 아니다.

이는 source와 예상 동작만 확인한 것이다. 테스트를 실행하지 않았으므로 현재 checkout에서 assertions가 통과한다고 보고하지 않는다. Fixture의 `facts.*`, `PR #99`, `issue #95` 같은 문자열을 실제 API raw field나 실제 GitHub 상태로 취급하지 않는다.

## 확인된 문제와 후보 분류

### 즉시 수정 검토 후보

- **Feature change routing fixture/test provenance가 observation contract와 다름.** 근거: `state-observation-contract.md`의 routing 표와 `feature-change.test.mjs:28-42, 225-257`. 후속 유형은 contract와 test source의 정합성 확인 및 테스트 입력 교정 검토다. 이번에는 수정하거나 실행하지 않는다. runtime fact 오분류는 확인되지 않았다.

그 외 재현 가능한 runtime correctness bug는 확인하지 못했다. Runtime validation 자체를 하지 않았으므로 “runtime에 결함이 없다”고 단정하는 뜻은 아니다.

### 정책 검토

- missing/conflicting fact가 있으면 adapter에 partial observation을 보내도 되는 경우와 호출 전에 반드시 중단해야 하는 경우의 경계를 문서화할지 검토한다. 현재 contract는 ambiguous state에서 중단을 요구하고 normalizer는 생략 fact를 허용하지만, 실제 host 연결은 미확인이다.
- PR review thread를 `github_review_threads_observed` bool과 `review_feedback_inventory` enum으로 나누는 의미, 특히 `false` 및 “관측 성공했으나 thread 없음” 표현을 명확히 할지 검토한다.
- state contract의 provenance reference를 adapter가 syntactically만 검사할지, 특정 routing facts의 canonical source/field reference도 검사해야 하는지 정책·계약 단계에서 검토한다. 새 parser를 도입할 근거는 확인하지 않았다.

### 기능 제안

- 확인된 오매핑 사례나 runtime parser 부재의 영향이 증명되지 않았다. 새 parser, 저장 계층, 로그 수집·보존 기능은 제안하지 않는다.

### 보류

- GitHub API·local/user/skill observation producer의 실제 host/tool 연결과 호출 순서는 현재 저장소에서 확인할 수 없다.
- `source_reference`·`field_reference`가 실행 시 실제 원본까지 추적되는지, fixture 예시보다 강한 provenance가 기록되는지 미확인이다.
- `FC-5`, `FI-*`, `FF-*`, 취소 후 재개 관련 이전 대화 결정은 **사용자 의도**로 기록한다. Definition, adapter, evaluator가 그 의도를 구현한다는 증거로 쓰지 않으며 이번 보고서에서 Day 4~6의 실행 주체·handoff·취소 정책을 새로 결정하지 않는다.

## Day 3 평가 입력 사례와 근거 식별자

아래는 다음 Day의 정적 evaluator 사례 입력 후보다. 이 보고서에서 평가 실행은 하지 않았다.

| 사례 ID | evaluator 입력 후보 | 비교할 점 | 근거 |
|---|---|---|---|
| `EVAL-FC-01` | `feature-change`의 `new_request` fixture를 `currentTaskActionId=FC-1`으로 사용한다. `additional_policy_decision_required=false`, `defect_investigation_required=false`가 evidence와 함께 명시된 상태를 만들고, 별도 비교 입력에서는 한 fact를 omitted로 둔다. | 같은 도메인에서 명시적 false와 missing이 adapter output 및 `equals false`/`exists` 평가에서 다르게 보이는 지점, 필요한 진입 fact가 missing일 때의 stop 결과를 확인한다. | `DEF-FC`, `FIX-FC:new_request`, `OBS-FC-01`, `DOC-OBS`, `EVAL-01` |
| `EVAL-FF-01` | `feature-fix`의 `work_units_merged_waiting_for_completion_items`를 `currentTaskActionId=FF-6`으로 사용한다. `all_planned_work_units_merged=true`, `all_completion_items_reflected=false`를 유지한다. | GitHub 완료 fact 하나와 미완료 checklist fact의 조합, 미완료 fact omission 시 기존 `action_required` 또는 stop 조건이 바뀌는지 비교한다. | `DEF-FF`, `FIX-FF:work_units_merged_waiting_for_completion_items`, `OBS-FF-01`, `EVAL-01` |
| `EVAL-FI-01` | PR review synthetic state에서 `currentTaskActionId=FI-24`. `inline_review_threads_posted=true`, `github_review_threads_observed=true`, `review_feedback_inventory=actionable_feedback_present`인 경우와 `github_review_threads_observed`가 빠지거나 명시적 false인 경우를 비교한다. | PR thread 관측 fact, local inventory enum, missing/false 조합이 완료 predicate와 전이 선택에 미치는 영향. `evidence_by_fact`가 evaluator 결과에는 전달되지 않는 점도 분리한다. | `DEF-FI`, `FIX-FI:review_feedback_cases`, `TEST-FI`, `OBS-FI-01`, `DOC-OBS` |

`OBS-FC-01`은 local routing provenance 계약과 test source 간 불일치, `OBS-FF-01`은 `fix-analysis` 구조화 산출물에서 bool fact로 가는 출처 제약, `OBS-FI-01`은 PR review thread와 local inventory의 두 fact 경계를 뜻한다. 이 사례들은 fixture/test source를 근거로 삼으며 live GitHub 관측으로 간주하지 않는다.

## Day 2 완료 조건

- [x] 시작 branch, HEAD, 작업 트리, local `main`, cached `origin/main`, `main...HEAD` 관계와 fetch 미실행에 따른 원격 최신 여부 미확인을 기록했다.
- [x] 기능변경·기능결함이라는 서로 다른 Issue Workflow 두 개를 선택하고 공통 implementation의 PR/review fact까지 provenance를 추적했다.
- [x] raw source, observation producer 책임, typed adapter 입력, source contract, Definition value domain, evidence 보존을 구분했다.
- [x] state-observation contract, normalized-fact contract, 공통 adapter, 다섯 workflow adapter를 대조했다.
- [x] raw GitHub API 해석 책임과 adapter의 typed observation 검증을 나눴고, 보이지 않는 parser/producer를 미확인으로 남겼다.
- [x] explicit false, missing, ambiguous/conflicting, invalid evidence의 contract/normalizer/evaluator 처리 차이와 evaluator output 한계를 기록했다.
- [x] GitHub 정본과 날짜별 log 등 보조 evidence의 우선순위를 기록했다.
- [x] 반복 정규화 관련 code와 fixture/test source를 읽었으나 테스트를 실행하지 않았다.
- [x] contract와 test source 사이 feature-change routing provenance 차이를 근거와 후속 검토 유형으로 기록했다.
- [x] Day 3의 evaluator 입력 사례와 근거 식별자를 작성했다.
- [x] 기존 Day 1 보고서와 보조 `02-resume-and-cancellation.md`는 변경하지 않았고, 새 보고서 하나만 작성했다.
