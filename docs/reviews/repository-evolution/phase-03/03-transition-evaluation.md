# Phase 3 Day 3 — Transition Rules and Deterministic Evaluation

## 문서 성격과 근거 구분

이 문서는 Repository Evolution Workshop Phase 3 Day 3의 정적 조사 기록이다. 공식 설계나 확정 정책을
대체하지 않는다. 현재 checkout의 Workflow Definition, validator/evaluator, 계약 문서, fixture/test source를
읽어 전이 계산을 추적했다. evaluator와 테스트는 실행하지 않았으며, 아래의 예상 출력은 source를 손으로
따른 **분석 판단**이지 실행 결과가 아니다.

| 표기 | 의미 |
|---|---|
| **[현재 source]** | 현재 checkout에서 직접 읽은 코드, JSON, 계약 문서와 Git 기준선 |
| **[설계]** | 계약 문서나 skill이 선언한 동작. runtime 실행 증거는 아님 |
| **[fixture/test source]** | synthetic 상태와 assertion이 대상으로 삼은 입력·예상 결과. 이번 실행 통과를 뜻하지 않음 |
| **[분석 판단]** | source를 연결해 정적으로 추적한 출력 또는 영향 |
| **[이전 관측]** | 앞선 보고서에 기록된 과거 실행. 현재 checkout에서 재현한 결과가 아님 |
| **[미확인]** | 현재 정적 자료만으로 확인할 수 없는 내용 |
| **[사용자 의도]** | 이전 대화에서 전달된 범위나 방향. 현재 Definition/runtime 사실로 간주하지 않음 |

Day 2의 기준 문서는 새 `02-state-observation-normalization.md`다. 사용자가 지정한 이전 보조 보고서는 근거로
사용하거나 복원하지 않았다.

## Git 기준선

조사일은 2026-11-20 (Asia/Seoul)이다. fetch 없이 시작 시 확인한 값은 다음과 같다.

| 항목 | 값 |
|---|---|
| Branch | `docs/repository-evolution-workshop` |
| HEAD | `6afe4739abc2b382155ec95b0a2600a9dfb877bb` (`docs: Phase 3 Day 2 상태 관측·정규화 조사`) |
| 시작 작업 트리 | `git status --short` 출력이 비어 있음 |
| Local `main` | `e0a3f690ce0e58e31c8eac1d5a198625ab05541a` |
| Cached `origin/main` | `e0a3f690ce0e58e31c8eac1d5a198625ab05541a` |
| `main...HEAD` | `0 20`; local `main`은 HEAD의 조상 |
| Branch upstream cache | `origin/docs/repository-evolution-workshop`도 `6afe4739abc2b382155ec95b0a2600a9dfb877bb` |
| 원격 최신 여부 | **미확인**. fetch하지 않았으므로 remote-tracking ref가 현재 원격과 같은지 알 수 없음 |

`main...HEAD`의 차이 파일은 Phase 1·2 조사 문서와 Phase 3 Day 1·2 보고서, workshop 문서다. 기준선은
`git branch -vv`, `git rev-parse`, `git rev-list --left-right --count`, `git diff --name-only main...HEAD`의
읽기 전용 결과다. 보고서 작성 시점 이후 후속 변경은 아래에 별도로 기록한다.

Phase 2 종합 보고서에는 과거 별도 세션에서 synthetic `FC-1` 입력을 evaluator에 명시 전달해
`action_required`를 관측했다는 기록이 있다. **[이전 관측]** 그 실행은 당시 입력·checkout에 한정되며 이번
checkout의 실행·검증으로 승격하지 않았다.

## 보고서 작성 후 후속 상태

**[후속 source 수정, 2026-11-20]** `.codex-dist/skills/github-agentic-loop/tests/workflow-definition/feature-change.test.mjs`의
adapter test input을 observation contract에 맞췄다. 다섯 routing fact가 같은 synthetic `request_id`와 각
`routing_check.<fact_id>` 경로를 사용하고 정규화 evidence 보존 assertion이 이를 확인하도록 변경했다. test는
실행하지 않았으므로 assertion 통과는 미검증이다. Adapter는 여전히 `local_state`와 non-empty reference를
검사할 뿐 canonical reference를 강제하지 않으며, 실제 producer의 출력도 확인되지 않았다.

**[사용자 정책 제안, 미확정]** `github_review_threads_observed` 하나에 의미를 겹치지 말고, “조회 성공 후 처리할
피드백 없음”과 “조회 실패/상태 불명”을 별도 fact로 표현하자는 의견이 제시됐다. 처리할 피드백이 있는 성공
관측은 기존 actionable inventory 분기가 표현할 수 있다는 해석도 논의됐다. 이는 사용자 제안이며 공식 contract나
Definition 결정이 아니다. 세부사항은 아래 후속 의견 절에 기록했다.

## 확인 범위와 책임 경계

주요 근거는 다음과 같다.

| 구간 | 근거 |
|---|---|
| Definition contract | `.codex-dist/skills/github-agentic-loop/references/workflow-definition-contract.md` |
| Definition | `.codex-dist/skills/github-agentic-loop/definitions/{feature-change,feature-fix,implementation}.json` |
| Expression/evaluator | `.codex-dist/skills/github-agentic-loop/scripts/workflow-definition/{expression,evaluator}.mjs` |
| Static validator | `.codex-dist/skills/github-agentic-loop/scripts/workflow-definition/validator.mjs` |
| CLI | `.codex-dist/skills/github-agentic-loop/scripts/workflow-definition/{parser,cli}.mjs` |
| Orchestration·재평가 | `.codex-dist/skills/github-agentic-loop/SKILL.md`, `references/structured-execution-contract.md` |
| Day 2 입력 후보 | `docs/reviews/repository-evolution/phase-03/02-state-observation-normalization.md`의 `EVAL-FC-01`, `EVAL-FF-01`, `EVAL-FI-01` |
| Fixture/test source | `.codex-dist/skills/github-agentic-loop/tests/workflow-definition/` |

**[현재 source/설계]** Definition은 fact의 유한 domain, task 조건, 완료 predicate, executor reference와 다음 edge를
선언한다. State adapter는 typed observation을 정규화하고 evidence를 보존한다. `evaluateWorkflowDefinition`은
normalized fact state만 받으므로 evidence/provenance를 재검증하지 않는다. 실행은 evaluator 밖의 orchestration과
executor 책임이다. (`workflow-definition-contract.md`; `evaluator.mjs:79-90`; Day 2 보고서의 raw observation 경계)

전달 경로는 다음과 같이 추적된다.

```text
원본 관측
→ typed observation / workflow adapter
→ normalized_fact_state (+ 별도 evidence_by_fact)
→ validateWorkflowDefinition(definition)
→ validateNormalizedFactState(state)
→ currentTaskActionId의 normalized_fact_conditions
→ completion_predicate
→ next_transition_rules 중 정확히 하나 선택
→ 다음 task_action_id / action_required / completed / stopped
```

`action_required`는 현재 미완료 task 하나와 `user_decision_options`, `executor_reference`,
`completion_predicate`를 반환한다. `completed`는 완료 predicate가 참인 terminal task에서만 나온다.
오류 또는 모호한 분기는 `stopped`와 `reason`을 반환한다. 반환 객체에는 `transition_id`가 없다.
(`evaluator.mjs:64-73, 103-132`; `workflow-definition-contract.md:106-114`)

## 대표 전이 경로: `feature-change` 진입부터 계획 작업까지

**선정 근거:** Day 2의 `EVAL-FC-01`과 `feature-change` fixture는 entry task의 직접 요청 조건, 명시적 `false`,
빠진 completion fact, 같은 action ID 재평가, 단일 다음 rule을 함께 다룬다. State fixture 자체는 normalized 값만
포함하고 evidence를 저장하지 않는다. Adapter test의 별도 `validObservations()`가 false 값에 evidence를 붙이며,
그 provenance 차이는 아래에서 분리해 다룬다. 따라서 evaluator 입력에서 현재 task와 다음 task로 이어지는 경계를
추적하기에 적합하다. 아래는 **[분석 판단]**이며 실행하지 않았다.

| 입력 상태와 `currentTaskActionId` | 현재 task 조건 | 완료 predicate 및 rule | 정적 추적 결과 |
|---|---|---|---|
| `feature-change-states.json:new_request`, `FC-1` | 직접 요청 분기에서 `feature_change_requested`, 범위, 완료 기준은 `true`; `additional_policy_decision_required`와 `defect_investigation_required`는 명시 `false`; `feature_change_entry_source=direct_request`. 모두 맞음. | `feature_change_draft_confirmed=true`는 state에서 생략되어 미충족. | `action_required`, `task_action_id=FC-1`, 옵션 `confirm_draft`/`revise_draft`, executor `issue-creation`. |
| `confirmed_draft`, 직전 결과의 `FC-1`로 재평가 | 같은 `FC-1` 조건이 계속 맞음. | draft confirmation이 `true`; `FC-1`의 유일한 무조건 rule은 `FC-2`를 가리킴. 같은 평가 호출 안에서 `FC-2` 조건도 맞지만 `feature_change_issue_created=true`는 `false`. | `FC-2`에서 `action_required`, executor `github-simple-executor`. `FC-1`을 재평가해 edge를 따라간 뒤 첫 미완료 task에서 반환한다. |
| `created_issue`, 직전 결과의 `FC-2`로 재평가 | `feature_change_draft_confirmed=true`가 맞음. | issue created가 `true`; `FC-2`의 유일한 무조건 rule은 `FC-3`. `FC-3` 조건도 맞지만 계획 산출물 사용 가능 및 사용자 확정은 모두 `false`. | `FC-3`에서 `action_required`, executor `feature-plan`. |
| `terminal`, entry `FC-1`에서 시작하거나 유효한 현재 ID로 평가 | 필요한 선행 facts가 모두 맞음. | 각 완료 predicate와 무조건 edge를 지나 `FC-7`에 도착. `feature_change_issue_closed=true`, `FC-7.next_transition_rules=[]`. | `completed`, `task_action_id=FC-7`. |

Definition 근거는 `feature-change.json:77-165` (`FC-1`), `168-187` (`FC-2`), `189-226` (`FC-3`),
`328-342` (terminal `FC-7`)이다. Fixture state는 `feature-change-states.json`의 `new_request`,
`confirmed_draft`, `created_issue`, `terminal`이다. `feature-change.test.mjs:134-164`는 각 대표 상태가
기대 task/executor 또는 terminal을 내고 입력을 바꾸지 않는다는 assertion을 **작성해 둔다**. 실행 결과는 아니다.

## `currentTaskActionId`와 재평가 경계

**[설계]** 최초 진입은 `entry_task_action_id`를 사용한다. 이후에는 직전 evaluator 결과의 `task_action_id`를
`currentTaskActionId`로 전달한다. 작업 완료 뒤 fresh state를 다시 수집·정규화하고 **같은 task ID**로 재평가한다.
(`SKILL.md:104-125`; `structured-execution-contract.md:38-43`)

**[현재 source]** 함수는 `currentTaskActionId`가 없거나 nullish면 entry ID를 쓰고, 주어진 ID가 Definition에
없으면 `current_task_action_not_found`, 존재하지만 현재 `normalized_fact_conditions`가 맞지 않으면
`current_task_action_condition_not_met`를 반환한다. 조건과 완료가 맞으면 다음 edge로 계속 순회하며 첫 미완료
작업, terminal, 중단에서 멈춘다. 함수 자체는 supplied ID가 이전 결과와 연결되는지, 호출자가 동일한 재개
ID를 보냈는지 검증하지 않는다. 그 상관관계는 orchestration 계약의 책임이다. (`evaluator.mjs:90-115`)

CLI는 `--current-task-action-id`를 받아 evaluator에 전달한다. API의 entry 기본값과 workflow orchestration의
“재개 ID가 없거나 불일치하면 중단” 규칙은 구분해야 한다. Skill은 해당 입력 오류에서 중단하도록 선언하지만,
evaluator API를 ID 없이 직접 부르면 entry 평가로 시작한다. (`cli.mjs:5, 83-85`; `SKILL.md:112-125`)

## Day 2 평가 후보 검토

Fixture에 있는 state와 새 synthetic 변형을 구분했다. `expected`는 evaluator를 돌려 얻은 값이 아니라 Definition,
expression과 evaluator 흐름에서 산출한 **정적 예상**이다. Fixture/test source 열의 “assertion”은 테스트 코드가
보호하려는 결과를 뜻하며 현재 checkout에서 통과했다는 주장이 아니다.

| ID / 입력 | Fixture/test source가 제공하는 값 | Synthetic 비교와 `currentTaskActionId` | 정적 evaluator 추적 |
|---|---|---|---|
| `EVAL-FC-01` | `feature-change-states.json:new_request`: 직접 요청에 필요한 3개 true, 두 routing false, `direct_request`; `feature_change_draft_confirmed`는 빠짐. `feature-change.test.mjs` 대표 사례는 entry에서 `FC-1` 기대를 assertion한다. | `currentTaskActionId=FC-1`. 비교 변형은 같은 state에서 `additional_policy_decision_required`를 생략한다. 값의 omission은 이 fact에 대해 `equals false`와 다르다. | 원 상태는 현재 조건을 통과하고 빠진 completion으로 `action_required FC-1`. synthetic omission은 current condition이 미충족되어 `stopped / current_task_action_condition_not_met / FC-1`. 출력은 어떤 routing fact가 빠졌는지까지 특정하지 않는다. |
| `EVAL-FF-01` | `feature-fix-states.json:work_units_merged_waiting_for_completion_items`: plan reflected와 implementation started 및 all planned units merged는 true, `all_completion_items_reflected=false`. Test source는 대표 상태에서 `FF-6`, executor `null`을 기대한다고 assertion한다. | `currentTaskActionId=FF-6`. synthetic 비교는 `all_completion_items_reflected`를 생략한다. | 두 상태 모두 FF-6의 current condition을 통과하고 completion의 세 `equals true` 중 적어도 하나가 맞지 않아 `action_required FF-6`가 된다. 반환 결과만으로 explicit false와 missing을 가를 수 없다. |
| `EVAL-FI-01` | `implementation-states.json:review_feedback_cases`의 “target comparison waits for GitHub observation”: inline threads posted=true, inventory actionable, `github_review_threads_observed` 생략, `current_task_action_id=FI-24`. 또 다른 fixture 사례는 GitHub fact=true와 actionable inventory를 제공한다. | 두 경우 모두 `currentTaskActionId=FI-24`. synthetic 비교로 `github_review_threads_observed=false`를 둔다. | fixture의 missing과 synthetic false 모두 FI-24 조건을 통과하지만 completion의 `github_review_threads_observed equals true`를 충족하지 못해 `action_required FI-24`. 값=true이고 inventory actionable이면 단일 rule로 FI-25를 고른 뒤 feedback direction을 기다린다. 이 Boolean 결과는 thread 부재나 관측 실패라는 의미를 정하지 않는다. |

EVAL 경로 근거: Day 2 보고서의 사례 정의, `feature-fix.json:224-256`, `implementation.json:984-1032`,
`implementation.test.mjs:262-277`, `implementation-states.json:684-713`. `github_review_threads_observed`의
Boolean 입력은 아래 미해결 의미와 분리해 읽는다.

## Missing, explicit false와 잘못된 상태

### Explicit `false`와 omitted fact

**[현재 source]** Normalized state는 알려진 fact의 부분 집합일 수 있다. evaluator의 state 검사기는 전달된 key만
검사하므로 fact 누락 자체를 `invalid_state`로 보지 않는다. Expression은 fact의 존재 여부를 별도로 읽는다.
`exists`는 존재, `not_exists`는 부재를 확인한다. `equals`와 `in`은 fact가 없으면 false다.
(`evaluator.mjs:22-61`; `expression.mjs:203-240`; `normalized-fact-adapter-contract.md:30-32, 48-53`)

따라서 state 안의 `fact_id: false`와 key 누락은 서로 다른 normalized state다. `equals false`는 전자만 맞고,
`exists`는 전자에서 참·누락에서 거짓, `not_exists`는 그 반대다. 다만 `action_required`는 실패한 fact나
evidence를 반환하지 않는다. 현재 조건 미충족과 `no_transition_match`도 정확히 어느 fact가 누락·불일치했는지
설명하지 않는다. FF-6, FI-24 예처럼 explicit false와 missing이 같은 `action_required` 출력을 낼 수 있다.

### Invalid normalized state

| 상태 입력 | evaluator 결과 |
|---|---|
| Plain object가 아님 | `stopped / invalid_state`, state type error, `task_action_id=null` |
| Definition에 없는 fact key | `stopped / invalid_state`, `state.fact.unknown` |
| 선언 타입과 다른 타입 (`true` 대신 `"true"` 등) | `stopped / invalid_state`, `state.value.type_mismatch` |
| 타입은 맞지만 Definition의 `allowed_values` 밖 | `stopped / invalid_state`, `state.value.not_allowed` |
| 유효한 domain 값인 `false` | 정상 입력. 이후 표현식에 따라 조건·완료·전이를 평가 |

잘못된 state 검증은 evaluator가 수행하지만, observation의 source/evidence 의미 검증은 adapter 계층에 속한다.
Evaluator 입력에서 provenance는 이미 분리되어 있어 source 충돌의 원인을 결과로 복구할 수 없다.

### `currentTaskActionId`, rule match, cycle 및 terminal

| 상황 | evaluator 처리 | 주요 근거 |
|---|---|---|
| ID가 Definition에 없음 | `stopped / current_task_action_not_found`, 전달된 task ID 포함 | `evaluator.mjs:94-97` |
| ID는 있지만 현재 task 조건 불일치 | `stopped / current_task_action_condition_not_met`, 해당 ID 포함 | `evaluator.mjs:103-106`; fixture assertion `evaluator.test.mjs:99-106` |
| 완료 후 conditional next rule이 0개 일치 | `stopped / no_transition_match` | `evaluator.mjs:123-127`; missing fixture assertion `evaluator.test.mjs:129-135` |
| conditional next rule이 2개 이상 일치 | `stopped / multiple_transition_matches` | `evaluator.mjs:123-130`; missing fixture assertion `evaluator.test.mjs:137-140` |
| 순회 중 이미 방문한 task 재진입 | `stopped / evaluation_cycle` | `evaluator.mjs:94-100`; fixed-state cycle assertion `evaluator.test.mjs:143-148` |
| 완료 predicate가 false인 terminal task | terminal이라는 이유만으로 완료되지 않음. 해당 task에서 `action_required` | `evaluator.mjs:107-120`; `evaluator.test.mjs:89-97` |
| 완료 predicate가 true이고 next rules가 빈 배열 | `completed`와 terminal `task_action_id` | `evaluator.mjs:116-120` |

현재 source 검색에서 `current_task_action_not_found` 자체를 assertion하는 fixture/test는 찾지 못했다. 이 결과는
evaluator 분기에서 정적으로 확인했으며 테스트로 실행해 확인한 것은 아니다.

0개/복수 match 검사는 현재 task 조건 및 completion predicate가 통과한 다음 수행된다. 따라서 먼저 predicate가
false이면 rule 상태와 관계없이 `action_required`가 반환된다. Definition validator는 static contract 문제를
미리 거르지만, evaluator는 실제 partial normalized state에서 안전 중단을 다시 적용한다.

### `github_review_threads_observed=false` 의미 보류

**[현재 source]** `implementation.json`은 이 fact의 domain으로 Boolean true/false를 선언하고 FI-24의 completion에서
`equals true`를 요구한다. `state-observation-contract.md`는 Pull Request review thread의 diff 피드백과
resolved/unresolved 상태를 읽는다는 원칙을 두지만, 이 Boolean의 `false`를 “성공적으로 관측했으나 thread 없음”,
“thread 조회를 수행하지 못함” 또는 다른 상태 중 무엇으로 의미화하는지 세부 계약을 정하지 않는다.

**[분석 판단]** evaluator에 `false`가 들어오면 FI-24의 predicate는 충족되지 않는다. 이 계산만으로 실제 thread가
없다거나 관측 실패였다고 해석할 수 없다. Day 2의 의미 미확정 상태를 유지한다. 값의 출처 의미를 정하는 것은
evaluator 계산 결과가 아니라 observation contract/producer 경계의 후속 질문이다.

## Definition validator와 evaluator의 역할 차이

| 계층 | 입력과 확인 | 오류와 범위 |
|---|---|---|
| Definition validator | Definition 구조·필수 필드·fact domain·expression 참조/값·completion satisfiability·target 존재·entry 도달성·terminal 경로를 검사한다. Conditional rule의 gap/overlap은 그 rule이 참조하는 fact의 **선언된 각 allowed value 조합**을 순회해 검사한다. | 실패는 evaluator에 의해 `stopped / invalid_definition` 및 validator errors로 반환된다. 이는 task별 실행 상태 판정이 아니다. (`validator.mjs:273-324, 384-407, 414-459, 530-589, 673-674`) |
| Evaluator state validation | 제공된 normalized state 객체를 검사한다. 알려진 fact의 type/domain을 확인하지만 일부 fact 생략을 허용하고 evidence/provenance는 입력받지 않는다. | 오류는 `stopped / invalid_state` 및 code/path/message errors다. |
| Evaluator 실행 입력별 평가 | `currentTaskActionId`의 조건 → completion → next rule을 순서대로 평가한다. | current condition 불일치, no/multiple match, unknown task ID, fixed-state cycle은 각각 실행별 reason으로 fail-closed한다. |

Validator의 조건부 coverage 열거는 rule 조건 fact를 allowed values로 완전 할당한다. 반면 evaluator는 partial state를
허용한다. 그러므로 valid Definition의 rule이 모든 선언값에서는 배타적·완전해도 omitted fact가 있는 실제 평가
입력에서 0개 또는 복수 rule이 일치할 수 있다. `evaluation-cases.json`의 missing-rule 사례는 이 차이를 대상으로
작성돼 있다. Validator와 evaluator가 같은 오류를 확인한다고 가정하면 안 된다.

Validator는 graph에 cycle이 있다는 사실만으로 모두 거부하지 않는다. 정적 그래프에 terminal로 가는 경로가
있는지 검사한다. evaluator는 고정된 한 normalized state로 실제 순회하는 동안 task ID가 반복되면
`evaluation_cycle`로 멈춘다. 선언된 반복 경로의 존재와 한 상태에서의 무한 평가를 구별한다.
(`validator.mjs:580-610`; `evaluator.mjs:94-100`; `semantic-validation.test.mjs:39-70`)

## Fixture/test source가 보호하도록 작성된 불변 조건

**[fixture/test source]** 다음 source를 읽었다. 실행 결과로 표현하지 않는다.

| Source | 보호하려고 작성된 불변 조건 / 사례 |
|---|---|
| `tests/workflow-definition/evaluator.test.mjs` 및 `fixtures/evaluation-cases.json` | entry의 단일 `action_required`, 반복 평가의 결정성·입력 불변성, true/false conditional branch, `currentTaskActionId` 재개, terminal 완료와 미완료, unsatisfiable completion 거부, 누락으로 인한 0/복수 match 중단, fixed-state cycle, unknown/wrong type/out-of-domain state 오류, CLI JSON·exit code 계약 |
| `feature-change.test.mjs` 및 `fixtures/feature-change-states.json` | direct/상위 전환 진입, 대표 상태별 단일 task/executor, 계획·구현 완료까지의 gate, 입력 불변성, adapter source와 atomic failure. Fixture terminal은 `FC-7` 완료를 기대 |
| `feature-fix.test.mjs` 및 `fixtures/feature-fix-states.json` | 분석·계획 확정 전 단계 차단, FF-6의 세 completion fact, null executor 대기, issue terminal, adapter source/domain/duplicate 거부 |
| `implementation.test.mjs` 및 `fixtures/implementation-states.json` | `FI-24` review inventory 분기, feedback loop branch, 명시된 `current_task_action_id`, task 하나 선택 및 입력 불변성. FI-24 source fixture에는 GitHub observation 누락 상태와 true 상태가 있음 |
| `semantic-validation.test.mjs`, `structural-validation.test.mjs` 및 validation fixture | 닫힌 구조·ID/domain/expression 계약, completion satisfiable, conditional gap/overlap, graph reachability/terminal 경로 및 결정적인 오류 목록 |
| `normalized-fact-adapter.test.mjs` | missing fact 생략, Definition 순서, repeated normalization 결과, 입력 불변, unknown/wrong type/domain/duplicate/evidence 오류의 atomic failure |

이 source들은 fixture 입력과 assertion을 보호하려는 의도를 보여 준다. 현재 checkout에서 assertions가 통과했다고
보고하지 않는다. Fixture의 issue/PR 식별 문자열은 synthetic 근거이며 live GitHub 상태가 아니다.

**실행 여부:** evaluator, CLI, 테스트를 실행하지 않았고 새 테스트도 만들지 않았다. 조사 대상은 순수 함수처럼
보이지만 테스트 일부는 CLI child process를 띄우고 `/tmp` 임시 파일을 만들며 설치 관련 통합 fixture도
`all-fixtures.test.mjs`에 함께 있다. 이번 정적 추적 목표에서 실행 범위를 추가하지 않았다. 따라서 코드 경로와
test source는 확인했으나 runtime 출력 및 테스트 통과는 미검증이다.

## Day 2 미해결 항목: 영향 범위와 후속 검토 분류

### Feature-change routing provenance source 불일치 — Day 3 기준선

**[Day 3 기준선에서 확인한 source 차이]** `state-observation-contract.md:22-48`은 기능변경 routing fact 다섯 개가
`request_id`를 `source_reference`로 사용하고, 각 `routing_check.*` 값을 `field_reference`로 가리키도록 요구한다.
그러나 `feature-change.test.mjs:28-42`의 `validObservations()`는 네 fact의 reference로 `request routing`을,
기본 field reference로 `facts.<fact_id>`를 사용한다. `feature_change_entry_source`만 routing field reference를
지정하지만 그 source reference도 `request routing`이다. 같은 test source는 이 관측들이 normalized state와
evidence로 보존되는 assertion을 둔다.

`feature-change-state-adapter.mjs`는 routing fact에 `source_kind=local_state`를 요구하고,
`workflow-state-adapter.mjs`는 reference가 비어 있지 않은 문자열인지 검사한다. canonical `request_id`와
field path는 adapter가 강제하지 않는다. 따라서 test source는 **adapter의 현재 syntactic 계약**은 맞추지만
observation contract의 provenance 요구를 보호하지 않는다.

**Evaluator 영향:** 값이 허용 domain에 들어와 normalized state에 도달하면 evaluator는 value만 보므로 이
reference 차이는 그 자체로 branch 계산을 바꾸지 않는다. 다만 evidence의 origin 추적과 테스트가 계약 위반을
잡는 능력에 영향이 있다. 실제 observation producer가 계약 위반 값을 내보낸 runtime 증거는 없다.
Day 3 조사 중에는 contract·adapter·fixture를 수정하지 않았다. 후속 상태는 보고서 앞부분의 요약과 아래 후보
분류를 참조한다.

### PR review thread Boolean

`github_review_threads_observed=false`가 무엇을 뜻하는지와 어떤 source field로 산출되는지는 Day 2에서 미확정으로
남았다. 이번에는 Definition/evaluator가 false를 `equals true`와 비교해 FI-24 완료를 아직 충족하지 않는다는
계산 영향만 정리했다. 이후 사용자는 조회 성공 후 actionable feedback이 없다는 상태와 조회 실패/상태 불명
상태를 별도 fact로 나누자는 정책 의견을 제시했다. 이 의견은 의미 모호성을 해소할 후보이며 아직 contract·Definition에
반영되지 않았다. 상세 후보와 미결정 사항은 후속 의견 절을 참조한다. 운영 의미나 실제 thread 부재를 현재 source의
확정 사실로 확대하지 않는다.

### Missing/conflicting observation 전달

Day 2에서 typed observation 입력과 `missing_or_conflicting_facts` 전달 주체/중단 지점은 정적으로 닫히지 않았다.
Evaluator는 fact omission을 허용하고 이를 현재 조건 불일치, action 대기 또는 rule no/multiple match로 처리할 수
있다. 따라서 orchestration이 ambiguous/conflicting source를 사전에 거르지 않는 경우의 실제 영향은 evaluator
출력만으로 진단되지 않는다. Host producer 연결은 미확인이다.

`FC-5`, `FI-*`, `FF-*`, 취소 후 재개에 관한 과거 대화 내용은 **사용자 의도**로만 남긴다. 이번 Definition/runtime
조사에서 구현 사실로 승격하지 않았고 Day 4~6 정책으로 확장하지 않았다.

## 확인된 문제와 후보 분류

### 확인된 source 문제

- **Feature-change provenance contract/test source 불일치.** Day 3 기준선에서 확인됐다. 후속으로 test input은
  contract의 synthetic `request_id` 및 `routing_check.*` 경로에 맞게 수정됐으나 실행 여부는 미검증이다. Adapter가
  이 canonical reference를 강제하지 않고 실제 producer도 확인하지 않았으므로 producer 정합성은 미확인이다.
- 그 외 이번 조사에서 재현된 evaluator correctness bug는 없다. 실행 검증을 하지 않았으므로 runtime 결함이
  없다고 단정하지 않는다.

### 즉시 수정 후속 상태

- 보고서 작성 후 `feature-change.test.mjs`의 다섯 routing observation을 같은 synthetic `request_id`와 각각의
  `routing_check.<fact_id>`로 바꾸고, 정규화 뒤 evidence 보존을 assertion하도록 수정했다.
- 해당 test는 실행하지 않았다. 따라서 현재 source 정렬은 확인했으나 테스트 결과는 미검증이며, adapter에서 canonical
  provenance를 enforce할지 여부는 별도의 정책/계약 검토로 남긴다.

### 정책 검토

- `github_review_threads_observed`가 관측 성공 상태인지, thread 집합 존재 여부인지 등 false의 의미와 producer
  mapping을 정할 필요가 있는지 검토한다. 사용자는 단일 Boolean 의미를 겹치기보다 “관측 성공 후 처리할 피드백 없음”과
  “관측 실패/상태 불명”을 별도 fact로 두자는 의견을 냈다. 이 분리와 actionable inventory 연결, FI-24 중단/대기
  조건을 정책으로 확정해야 한다. 이는 evaluator Boolean 계산과 분리한다.
- fact 누락과 상충 상태를 adapter 호출 전 중단해야 하는 경계, 그리고 `action_required`/`stopped`만으로 부족할
  때 어떤 진단 책임을 둘지 observation·orchestration 계약 관점에서 검토한다.
- routing provenance의 canonical source/field를 adapter가 강제해야 하는지, contract가 producer 책임으로 두는지
  기존 책임 경계 안에서 검토한다.

### 기능 제안

- 새 evaluator, rule engine, parser, registry 또는 진단 저장 기능을 추가해야 한다는 확인된 비용·오류 근거는 없다.
  이번 조사에서는 기능 제안을 만들지 않는다.

### 보류

- raw GitHub/local/user/skill 상태에서 typed observation을 만드는 실제 host 경로와 provenance trace는 미확인이다.
- evaluator 실행, 테스트 통과, 실제 missing/conflicting state에서의 runtime 행동은 이 보고서에서 검증하지 않았다.
- `github_review_threads_observed=false`의 운영상 의미와 routing producer의 실제 reference 값은 증거가 생기기 전까지
  보류한다.

## Day 4로 넘길 Workflow 간 경계 질문

1. `feature-proposal`/`policy-review`에서 `feature-change`로 넘어갈 때 이전 Definition의 완료 fact와 후속 Definition의
   `feature_change_entry_source`를 누가 어떤 source로 묶는가?
2. `feature-change` 및 `feature-fix`가 `implementation`에 넘기는 계획·기준 이슈·완료 fact의 소유권은 어디까지이며,
   공통 flow의 `FI-*` 반환값을 상위 workflow가 어떻게 소비하는가?
3. evaluator는 한 Definition 안의 `task_action_id`만 선택한다. 후속 workflow ID를 고르는 책임은 orchestration과
   Definition 전환 fact 중 어디에 있는가?
4. 이전 workflow가 terminal/completed여도 후속 대상이 없거나 source가 충돌할 때 workflow 선택·중단을 어떤 계약이
   소유하는가?
5. Day 2 routing provenance 차이와 FI-24 review thread fact의 meaning gap이 workflow 경계의 fact handoff에 미치는
   영향은 무엇인가? 실제 host trace 없이 일반 동작으로 가정하지 않는다.

이 질문들은 다음 Day의 workflow composition 조사 입력이며 이번 보고서에서 답이나 정책을 확정하지 않는다.

## Day 3 완료 조건 체크리스트

- [x] 현재 branch, HEAD, 시작 worktree, local `main`, cached `origin/main`, ancestor/ahead 관계와 fetch 미실행에 따른 원격 최신 여부 미확인을 기록했다.
- [x] `normalized_fact_conditions` → `completion_predicate` → `next_transition_rules`의 평가 순서를 evaluator source에서 추적했다.
- [x] 대표 `feature-change` 경로를 fixture 값으로 손으로 추적하고 Definition·함수·fixture/test 경로를 기록했다.
- [x] Day 2의 `EVAL-FC-01`, `EVAL-FF-01`, `EVAL-FI-01`을 분리해 읽고 각각의 `currentTaskActionId` 및 synthetic 변형을 명시했다.
- [x] explicit false, missing, invalid state, current task mismatch, zero/multiple rule match, cycle, terminal 완료를 Definition contract와 evaluator source로 대조했다.
- [x] normalized state/expression에서 false와 missing을 구분하고 evaluator 반환만으로 판별되지 않는 사례를 기록했다.
- [x] `github_review_threads_observed=false`의 evaluator 계산만 기술하고 “thread 없음”/“관측 실패”로 해석하지 않았다.
- [x] Definition validator의 static domain·graph 규칙과 evaluator의 input별 fail-closed 처리를 분리했다.
- [x] Fixture/test source가 보호하려는 조건을 목록화했으며 테스트나 evaluator를 실행 결과로 주장하지 않았다.
- [x] Day 2 feature-change routing provenance contract/test 불일치를 재확인하고 evaluator 영향과 후속 검토 유형을 분리했다.
- [x] `FC-5`, `FI-*`, `FF-*`, 취소 후 재개 대화 판단을 사용자 의도로만 취급했다.
- [x] Day 3 조사 당시에는 코드, Definition, 설정, fixture/test source 및 기존 보고서를 수정하지 않았고 산출물은 이 보고서 하나로 한정했다.
- [x] Harness 재진입, Workflow 시작·재개, GitHub 조회·상태 변경, fetch를 하지 않았다.
- [x] Day 4의 Workflow 간 경계 질문을 남겼다.

## 후속 사용자 의견 — review thread 관측 fact 분리 제안

> 이 절은 Day 3 조사 후 2026-11-20에 추가했다. 조사 기준선의 현재 source 사실이나 확정된 공식 정책으로
> 소급하지 않는다.

**[사용자 제안]** `github_review_threads_observed` 하나에 서로 다른 의미를 담지 말고 다음 상태를 별도 fact로
표현하는 편이 좋다는 의견이다.

1. GitHub review thread 조회에 성공했고 처리할 피드백이 없음
2. 조회에 실패했거나 현재 상태를 확인할 수 없음

처리할 피드백이 있는 성공 관측은 기존 `review_feedback_inventory=actionable_feedback_present` 분기가
표현할 수 있다는 해석을 함께 논의했다. 이 점은 fact schema와 producer contract에 아직 확정되지 않았다.

**[분석 판단/미확정]** 첫 상태는 `no_actionable_feedback`로 `FI-34` 분기와 연결하고, 두 번째 상태는
“피드백 없음”으로 추론하지 않고 `FI-24`에서 대기하거나 중단하는 방향으로 읽을 수 있다. 이는 제안의 가능한
전이 해석이며 사용자 확정 정책이나 현재 Definition 동작이 아니다. 현 Definition은 여전히
`github_review_threads_observed=true`와 inventory 존재를 FI-24 완료 조건으로 요구한다.

후속 정책 검토에서 다음을 정해야 한다.

- 새 fact의 ID와 타입, 기존 `github_review_threads_observed`의 유지·대체 여부
- 관측 성공 후 actionable/no-actionable 결과와 관측 불가 결과의 배타성 및 허용 입력
- 실패·상충·누락 상태를 normalized state에서 어떻게 표현하고 FI-24에서 어떻게 중단할지
- `review_feedback_inventory`와 새 fact 사이의 중복 여부 및 evidence/provenance mapping
- 세 상태를 각각 구별하는 Definition transition과 fixture/test assertion

이번 addendum은 제안을 기록하기 위한 것이며 Definition, contract, adapter, fixture/test source를 수정하거나
검증하지 않았다. 별도 요청으로 `.codex-dist/skills/github-agentic-loop/tests/workflow-definition/feature-change.test.mjs`의
routing provenance test 입력을 현재 observation contract에 맞췄으나 해당 test는 실행하지 않았다. 따라서 이
별도 변경에 따라 본문의 feature-change provenance 차이는 Day 3 기준선에서 확인한 사항으로 읽어야 한다.
