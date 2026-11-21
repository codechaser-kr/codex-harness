# Phase 3 Day 4 — Workflow Composition and Routing

## 문서 성격과 근거 구분

이 문서는 Repository Evolution Workshop Phase 3 Day 4의 정적 조사 기록이다. 공식 설계나 확정 정책을
대신하지 않는다. 지정된 workshop 문서와 Day 1~3 보고서를 읽고, 현재 checkout의 Workflow Definition,
observation·execution contract, orchestration skill, adapter, fixture/test source를 대조했다. Workflow,
GitHub, Harness를 실행하거나 테스트를 실행하지 않았다.

근거 표기는 다음 의미로 사용한다.

| 표기 | 의미 |
| --- | --- |
| **[현재 source]** | 시작 기준선에서 직접 읽은 JSON, JavaScript, Markdown, 테스트 파일 |
| **[설계]** | Skill 또는 contract가 선언한 선택·전이·실행 규칙. runtime 연결이 성공했다는 뜻은 아님 |
| **[fixture/test source]** | synthetic 입력과 테스트 assertion이 보호하려는 조건. 이번 실행에서 통과했다는 뜻은 아님 |
| **[이전 기록]** | Day 1~3 보고서가 기록한 당시의 기준선·관측 또는 사용자 의견 |
| **[분석 판단]** | 위 source를 연결해 정적으로 해석한 책임·영향 |
| **[미확인]** | 저장소 source만으로 producer, host 연결, 실제 실행을 확인할 수 없는 내용 |
| **[사용자 제안/의도]** | 사용자가 제시했으나 공식 정책·현재 source 사실로 확정하지 않은 내용 |

먼저 읽은 문서는 `docs/workshops/repository-evolution/README.md`, `roadmap.md`, `execution-guide.md`,
`docs/reviews/repository-evolution/phase-02/summary.md`,
`docs/workshops/repository-evolution/phases/phase-03-workflow-engineering.md`,
`docs/reviews/repository-evolution/phase-03/01-workflow-definition.md`,
`02-state-observation-normalization.md`, `03-transition-evaluation.md`다. Day 2 입력은 사용자가 지정한
현재 보고서 경로를 사용했다. 제거된 `02-resume-and-cancellation.md`는 찾거나 복원하지 않았다.

경로 추적표와 최초 문제 분류는 Git 기준선의 source를 설명한다. 이후 사용자와 정책을 논의하고 source 정렬을 요청한 뒤
worktree에 적용한 변경은 아래 `정책 논의 후 worktree 변경과 검증 한계` 절에 따로 기록한다. 후속 변경으로 baseline 관측을
현재 source 사실로 바꾸어 읽지 않는다.

## Git 기준선

조사일은 2026-11-20 (Asia/Seoul)이다. fetch 없이 시작 시 확인한 값은 다음과 같다.

| 항목 | 시작 시 관측값 |
| --- | --- |
| Branch | `docs/repository-evolution-workshop` |
| HEAD | `f27c0ba3da1f4616b5395b332ed0288d9a5fdc72` (`docs: Phase 3 Day 3 전이 평가 조사 기록`) |
| Worktree | `.codex-dist/skills/github-agentic-loop/tests/workflow-definition/feature-change.test.mjs` 하나가 이미 수정 상태였음 (` M`); 나머지 변경 없음 |
| Local `main` | `e0a3f690ce0e58e31c8eac1d5a198625ab05541a` |
| Cached `origin/main` | `e0a3f690ce0e58e31c8eac1d5a198625ab05541a`; local `main`과 같음 |
| `main...HEAD` | `0 21`; local `main`은 HEAD보다 21 commit 뒤에 있음 |
| Cached branch upstream | `origin/docs/repository-evolution-workshop`은 `6afe4739abc2b382155ec95b0a2600a9dfb877bb`; 현재 branch가 cached upstream보다 1 commit 앞섬 |
| 원격 최신 여부 | **미확인**. fetch하지 않았으므로 cached remote-tracking ref와 현재 원격 branch가 같은지 확인할 수 없음 |

시작 시 이미 수정돼 있던 `feature-change.test.mjs`는 Day 3 후속 provenance 변경으로 확인했다. 최초 Day 4 정적 조사 중에는
그 변경을 수정하거나 되돌리지 않았다. 이후 사용자가 논의에서 확정한 정책을 source에 정렬하도록 별도로 요청해 관련 Definition
assertion도 함께 수정했다. 이 후속 worktree 변경은 아래에 분리해 기록한다.

## 내부 task 전이와 Workflow 간 routing의 경계

**[현재 source/설계]** 각 Definition은 하나의 `workflow_id`, entry `task_action_id`, 사실 domain, task 조건,
completion predicate, `next_transition_rules`를 가진다. `workflow-definition-contract.md`는
`task_action_id`를 Definition 내부의 graph node 및 작업 식별자로 정의한다. Validator도 해당 Definition 안의
task ID, edge, domain, reachability를 검사한다. Definition 간 `workflow_id` edge나 다음 Definition 참조 필드는
선언돼 있지 않다.

**[현재 source]** `evaluateWorkflowDefinition(definition, normalizedFactState, options)`는 전달받은 단일
Definition 내부에서 현재 task를 평가해 `action_required`, `completed`, `stopped`를 반환한다. 반환 결과의
`task_action_id`는 같은 Definition의 task를 가리킨다. Evaluator는 다음 `workflow_id`를 고르거나 다른
Definition을 불러오지 않는다. 그 선택은 orchestration 책임이다. (`evaluator.mjs:79-132`,
`workflow-definition-contract.md:74-114`)

**[설계]** `github-agentic-loop/SKILL.md`는 다섯 `workflow_id`와 각 Definition/adapter 매핑, 기준 이슈 유형에
따른 하나의 Workflow 선택, 공통 구현 흐름 진입 시 `implementation` 선택을 지시한다. 작업 계산 절차는
선택된 Definition에 observation을 정규화하고 evaluator 결과를 재평가하도록 규정한다
(`SKILL.md:83-125`). `state-observation-contract.md`는 기능제안 전환 직후 같은 자동 실행 루프에서 종료된
기능제안 Issue를 후속 정책검토 또는 기능변경 흐름의 연관 Issue로 참조한다고 한다.

**[현재 source] composition runtime** 후속 편집으로 `composition-runtime.mjs`에 읽기 전용 GitHub 상태 요약 및 로그
provider 결과를 받아 request/baseline, observation provenance, GitHub 우선 conflict 처리를 적용하고 실제 adapter와
evaluator를 호출하는 `runWorkflowObservationCycle`을 추가했다. 완료 후에는 feature-proposal successor,
policy-review existing/new 분기, implementation parent 재평가 handoff를 반환한다. `selectNextImplementationGroup`은
승인 계획의 parallel group launch 후보를 순차 group barrier에 맞춰 반환한다.

**[미확인] host 연결** composition runtime은 provider를 dependency injection으로 받는다. 이 checkout에서는 실제 GitHub
관측 스킬·로컬 로그 reader를 함수에 연결하는 host caller와 반환된 successor/child 요청을 실제 시작하는 dispatcher를
확인하지 못했다. 따라서 runtime helper 및 mock test의 존재를 외부 provider 실행이나 live Workflow 연결 증거로 보지 않는다.

| 구분 | 책임 | 이 조사에서 확인한 범위 |
| --- | --- | --- |
| Definition 내부 전이 | `task_action_id`의 현재 조건·완료 predicate·다음 edge 계산 | JSON Definition, validator, evaluator 및 workflow별 fixture/test source |
| Workflow 선택·전환 | 기준 대상/현재 요청/완료 fact에서 단일 `workflow_id` 및 대상 선택 | `composition-runtime.mjs`가 완료 후 handoff/parent re-evaluation을 산출함. 호출 host의 실제 dispatch는 미확인 |
| 관측·provenance | 원본 GitHub/local/user/skill 사실을 typed observation과 evidence로 구성 | runtime이 주입 결과의 상관·GitHub 우선 처리·adapter provenance를 수행함. 원본을 읽는 provider 연결은 미확인 |
| 실행·handoff | 선택된 action의 확정 범위로 실행 주체를 고르고 요청·결과를 상관 | structured/file-change contract가 규정함. 이번 조사에서 실행하지 않음 |

## 주요 경로 추적표

아래 표는 조사 시작 시 Git 기준선의 Definition과 contract가 표현하는 사실 및 handoff를 나눈다. 이후 논의에 따른
현재 worktree source 변경은 아래 별도 절에 기록한다. **[분석 판단]**으로 이어 붙인 경로는 runtime에서 수행된 흐름이 아니다.

| 이전 Workflow 경로 | 이전 완료 fact와 provenance | 원본 Issue 반영·종료 조건 | 후속 handoff와 다음 Workflow 선택 | provenance 및 연결 한계 |
| --- | --- | --- | --- | --- |
| `feature-proposal` → `policy-review` | 방향은 `feature_proposal_direction=policy_review` (`user_input`); 방향 반영은 `feature_proposal_direction_reflected` (`github_state`); `FP-9` 완료 fact는 `feature_proposal_policy_review_transition_completed=true` (`github_state`)다. | `FP-4`가 방향을 Issue에 반영한 뒤 `FP-6`가 원본 기능제안 Issue의 `feature_proposal_issue_closed=true`를 기다린다. `FP-9`은 반영·원본 종료 조건과 policy-review 전환 완료를 확인한 뒤 `FP-8` terminal로 간다. | `policy-review/PR-1`은 직접 요청 또는 `feature_proposal_policy_review_transition_completed=true`에서 진입할 수 있다. 관측 계약은 닫힌 원본 기능제안 Issue를 관련 Issue로 참조하도록 선언한다. Definition edge 자체는 `policy-review`를 가리키지 않는다. | Adapter는 direction/draft 등 user facts와 Issue 상태를 구분한다. 후속 Issue ID 및 실제 `workflow_id` dispatch를 만드는 host producer는 미확인이다. Feature-proposal adapter의 legacy `next_workflow` 변환은 입력 fact 호환 동작이며 실제 selector의 증거가 아니다. |
| `feature-proposal` → `feature-change` | 방향은 `feature_proposal_direction=feature_change` (`user_input`); 반영 및 종료는 각각 `github_state`; `FP-10` 완료 fact는 `feature_proposal_feature_change_transition_completed=true` (`github_state`)다. | `FP-4` 반영 후 `FP-7`이 원본 Issue 종료를 기다리고, `FP-10`이 원본 종료와 후속 전환 완료를 확인한다. | `feature-change/FC-1`의 상위 전환 분기는 `feature_change_entry_source=feature_proposal` 및 proposal 전환 완료 fact를 요구한다. synthetic `new_issue_from_feature_proposal` state는 evaluator 진입 시 `FC-1`을 기대한다. 이는 내부 진입 조건이며 Definition 간 dispatch 구현은 아니다. | Feature-change 최초 routing의 다섯 값은 state contract상 `local_state`, `source_reference=request_id`, `field_reference=routing_check.<fact_id>`다. 이 판단을 누가 어떤 원본 field에서 만들고 후속 Workflow 호출과 묶는지는 미확인이다. |
| `policy-review` → 기존 `feature-change` 대상 갱신 | `PR-7` 후보 산출은 `feature_change_transition_candidates_usable=true` (`skill_output`, `policy-review-next-triage`); 방향은 `existing_feature_issue` (`user_input`); `PR-8` 반영은 GitHub fact다. `PR-11` 완료는 `feature_change_transition_result=existing_issue_updated`와 `policy_review_feature_change_transition_completed=true`를 요구한다. | `PR-8`이 전환 방향/범위를 반영하고 `PR-10`이 원본 정책검토 Issue 종료를 확인한 뒤에만 `PR-11`을 시작한다. 기존 대상 Issue는 열린 기능변경 Issue이며 close 대상은 원본 정책검토 Issue다. | `PR-11`이 기존 대상 갱신을 완료하면 `PR-9` terminal로 간다. 대상 Issue의 상태가 갱신된 뒤 `feature-change`를 선택할 수 있다는 설계와 `updated_open_issue_from_policy_review` fixture는 있으나, 실제 대상과 Definition 선택의 연결은 별도 orchestration 책임이다. fixture state에서는 이미 `FC-3`가 기대된다. | Triage artifact는 후보 ID, 방향, 기존 대상 Issue 번호, 범위와 위험을 담도록 요구한다. 그러나 Definition의 방향 fact는 기존/신규 enum만 가지며 선택한 후보 ID나 Issue 번호 fact는 없다. 실행 request의 target과 후보 선택을 결속하는 producer/상관 규칙은 명시적으로 확인되지 않았다. |
| `policy-review` → 새 `feature-change` 흐름 시작 | 후보 사용 가능 여부와 사용자 선택은 기존 경로와 같다. 새 경로는 `feature_change_transition_direction=new_feature_issue`; `PR-12` 완료는 `feature_change_transition_result=new_issue_flow_started` 및 정책검토 전환 완료 fact를 요구한다. | 공통 순서대로 `PR-8` 방향 반영 후 `PR-10`에서 원본 정책검토 Issue를 종료한 뒤 새 흐름을 시작한다. | `PR-12`는 `PR-9`로 간다. 새 기능변경 흐름의 adapter/Definition은 `feature_change_entry_source=policy_review`와 정책검토 전환 완료 fact를 받도록 설계돼 있다. `PR-12` 결과와 실제 생성 Issue의 `FC-1` 진입을 묶는 cross-Definition test/host caller는 확인되지 않았다. | 새 Issue가 생성되면 `Refs #원본` 관계가 사용될 수 있다는 template 계약은 있다. `new_issue_flow_started`와 boolean 완료 fact만으로 Issue 번호를 복구할 수는 없으며, 실제 관계 또는 execution result를 어떻게 읽는지는 미확인이다. |
| `feature-fix` → 공통 `implementation` | 계획 반영 전 `fix_analysis_result_usable`/`fix_analysis_confirmed`, 이후 `fix_plan_proposal_usable`/`fix_plan_confirmed`; skill output은 각각 `fix-analysis`, `fix-plan`이고 확인은 `user_input`, 반영은 `feature_fix_plan_reflected` (`github_state`)다. `FF-6` 완료는 `implementation_flow_started` (`local_state`), `all_planned_work_units_merged`, `all_completion_items_reflected` (`github_state`) 세 fact가 모두 true여야 한다. | `FF-6`은 구현 시작/모든 계획 작업 merge/완료 항목 반영을 기다린다. 이후 `FF-7`이 `feature_fix_issue_closed=true`를 요구하고 `FF-8`에서 terminal이다. | `SKILL.md`는 공통 구현 진입 작업이 반환되면 `implementation`을 선택한다고 선언한다. `implementation/FI-1`은 `implementation_requested=true` (`user_input`)에서 시작한다. Definition에는 `FF-6 → FI-1` edge가 없다. | `FF-6`의 세 완료 fact 중 구현 시작의 원본 local field, 병합된 work unit과 source fix issue checklist의 producer mapping은 확인되지 않았다. `fix-plan` 산출물과 공통 흐름의 `commit-plan` 산출물 사이 직접 artifact 전달도 contract/source에서 확정되지 않았다. |
| `feature-change` → 공통 `implementation` | Feature plan은 `feature_plan_proposal_usable` (`skill_output`, `feature-plan`), 확인은 `feature_plan_confirmed` (`user_input`), 원본 Issue 반영은 `feature_plan_reflected` (`github_state`)다. `FC-5` 완료는 `implementation_flow_started` (`local_state`)와 두 GitHub 완료 fact `all_planned_work_units_merged`, `all_completion_items_reflected`를 요구한다. | `FC-5` 뒤에 `FC-6`이 원본 기능변경 Issue를 종료하고 `FC-7`에서 terminal이다. 즉 상위 Issue close는 공통 구현 완료 fact 뒤에 있다. | `implementation/FI-1`부터 branch proposal, `FI-3`의 `commit-plan`, `FI-4` 계획 반영, work unit loop, PR 생성·review·merge와 `FI-36` 완료가 선언돼 있다. `FC-5`는 이 `FI-*` task를 복제하지 않는다. | `implementation_requested`는 user input, `implementation_plan_usable`은 `commit-plan` output이다. Feature plan과 per-work-unit commit plan의 관계, `FI-36 implementation_completed`가 상위 완료 fact로 변환되는 연결은 명시되지 않았다. 실제 producer/host 연결은 미확인이다. |

### Close-first와 대상 선택 조건

**[시작 기준선의 설계]** `structured-execution-contract.md`는 feature-proposal→policy-review, feature-proposal→feature-change,
policy-review→feature-change의 순서를 모두 `reflect → close → transition`으로 고정한다. 방향·범위를 원본
Issue에 반영하고 원본 Issue가 닫혔다는 GitHub fact를 관측한 뒤 후속 대상을 생성하거나 갱신한다. 닫힌 원본에
후속 Issue 번호를 기록하는 것은 전환 결과 반영이며 close 선행조건은 아니다.

**[시작 기준선의 Definition/test source]** 재개 시 우회하지 못하도록 후속 task 조건에서 반영 및 close fact를 다시 요구했다. Feature proposal의
`FP-9/FP-10`은 `FP-6/FP-7`의 원본 종료 뒤에 선택된다. Policy review의 `PR-11/PR-12`는 `PR-10`의
정책검토 Issue 종료 후에만 선택된다. 관련 fixture/test source는 시작 시 원본이 열려 있으면 직접 해당
transition task로 재개해도 조건 불일치로 멈추고, 닫힌 뒤 같은 task를 선택하는 assertion을 둔다.

**[설계]** `policy-review-next-triage`는 기능변경 목표와 열린 `기능변경` Issue를 비교한다. 기존 이슈는 구현
목표가 같고 기존 목적·완료 이력을 흐리지 않으며 남은 범위와 완료 기준을 분명히 갱신할 수 있을 때 후보가 된다.
관련 이슈가 없거나 목표가 다르거나 범위 추가가 목적·진행 상태·완료 이력을 흐리면 새 Issue 후보를 제시한다.
종료된 Issue는 기존 대상 후보가 아니다. 후보가 여러 개면 전부 비교하고, 단순 관련성만으로 하나를 확정하지
않는다. Artifact contract는 새 Issue 후보, 고유 후보 ID, 대상 번호, 범위, 근거·위험, 제외 근거를 요구한다.

**[시작 기준선의 분석 판단/현재 미확인]** 후보 산출은 대상 선택 자체와 다르다. `PR-7`의 user decision options는
`existing_feature_issue`와 `new_feature_issue` 두 방향이고, `feature_change_transition_direction`은 이 두 값만
갖는다. 후보 ID와 기존 Issue 번호는 Definition fact가 아니다. 이후 current contract는 PR-7 사용자 입력에서 고른 정확한
Issue ID를 PR-9 구조화 실행 요청의 target으로 전달하고, GitHub related-issue 관계 및 `feature_change_transition_target_related`
관측으로 같은 대상을 확인하도록 정렬됐다. 선택된 ID를 request와 실제 관계 기록·관측에 전달하는 host producer는 여전히
확인되지 않았다. 이는 misroute가 실행됐다는 증거가 아니라 handoff 구현 확인 항목이다.

**[시작 기준선의 fixture/test source]** `policy-review.test.mjs`에는 `PR-9`를 당시 terminal task ID로 직접 재개할 때
`policy_review_feature_change_transition_completed`가 빠져도 완료하는 호환 assertion이 있다. 새 순차 경로의
`PR-11/PR-12`는 해당 completion fact를 요구하지만 `PR-9` 자체의 predicate는 방향·결과 일치, 반영, 원본 종료로
구성된다. 이 직접 재개 예외가 의도된 legacy 호환 범위인지, 새 handoff의 대상 식별 검증을 우회하지 않는지
정책/호환성 검토 후보였다. 후속 결정 후 현재 `PR-9`는 기존 대상 관계 기록 task로 재사용됐고 테스트 source도 그 경로로
수정됐다. 이 assertion은 과거 기준선 상태를 설명한다. 테스트 통과나 잘못된 runtime 완료를 주장하지 않는다.

## 공통 `implementation` handoff 입력·출력

### 상위 Definition이 내보내고 기다리는 사실

`feature-change/FC-5` 및 `feature-fix/FF-6`은 다음 공통 completion facts를 기다린다.

| Fact | 상위 adapter의 허용 source kind | 상위 흐름에서 쓰임 |
| --- | --- | --- |
| `implementation_flow_started` | `local_state` | 공통 구현 진입이 기록됐는지 |
| `all_planned_work_units_merged` | `github_state` | 계획된 work unit이 모두 merge됐는지 |
| `all_completion_items_reflected` | `github_state` | 완료 항목이 원본 Issue에 반영됐는지 |

`feature-change`에서는 이 세 값이 모두 true여야 FC-5가 끝나고 FC-6이 원본 Issue를 닫는다. `feature-fix`도
같은 predicate로 FF-7 종료 단계에 도달한다. Adapter는 허용 source kind와 Definition domain을 적용하지만
세 fact의 canonical `source_reference`/`field_reference` 또는 실제 원본 field를 확인하는 host producer는
확인되지 않았다.

### 공통 흐름의 자체 입력·출력

**[현재 source]** `implementation`은 자기 Definition 안에서 `implementation_requested` (`user_input`)로 시작한다.
`branch_proposal_usable`, `implementation_plan_usable`은 각각 `branch-proposal`, `commit-plan` skill output이고,
사용자 확인 fact는 `user_input`; `implementation_plan_reflected`는 `github_state`다. 이후 `FI-5..FI-9`가
work unit을 반복하고, branch push·PR draft/create, 선택된 review 실행, review thread inventory/feedback loop,
merge 판단·merge·post-merge reflection을 다룬다. 마지막 `FI-36`의 terminal completion fact는
`implementation_completed` (`local_state`)다.

**[책임 분리]** PR 생성/상태, review mode, thread 관측·inventory·feedback 처리, merge 및 후속 반영 fact는
`implementation` Definition과 adapter의 입력/출력 영역이다. 상위 `feature-change`/`feature-fix` Definition은
이 FI fact를 그대로 소비하지 않고 세 aggregate completion fact로 구현 진행 및 완료를 판단한 뒤 원본 이슈를
닫는다. 이 구조는 공통 구현 세부 task를 두 상위 Definition에 복제하지 않는 설계다.

**[미확인] handoff 연결** `implementation_requested`는 source map상 `user_input`이고 parent의
`implementation_flow_started`는 `local_state`다. 부모 요청에서 FI-1을 시작하는 조건, 부모의 확정 plan/Issue를
FI-1/FI-3 입력으로 전달하는 구체 contract, FI-36 완료를 상위 세 aggregate facts 및 원본 Issue 상태와 상관시키는
실제 producer를 확인하지 못했다. `feature-plan`/`fix-plan`은 상위 Issue에 반영되는 계획 산출물이며,
`implementation` 내부 `commit-plan`은 per-work-unit 실행 계획이다. 두 계획의 연결은 별도 보존·전달 계약이
있다고 단정하지 않는다.

## Fixture/test source와 미실행 범위

**[조사 시작 기준선의 fixture/test source]** 시작 시 읽은 source와 보호하려고 작성된 불변 조건은 다음과 같다.

| Source | assertion이 대상으로 하는 불변 조건 |
| --- | --- |
| `feature-proposal.test.mjs`, `feature-proposal-states.json` | 방향별 reflect/close/transition 상태, 원본 Issue가 열린 동안 FP-9/10 직접 진입 차단, 닫힌 뒤 재개, 각 terminal, adapter evidence 보존과 legacy `next_workflow` 입력 변환 |
| `policy-review.test.mjs`, `policy-review-states.json` | 전환 방향·반영, 기존 갱신/신규 시작 분기, 원본 정책검토 Issue가 열린 동안 PR-11/12 직접 진입 차단, 닫힌 뒤 재개, 결과 불일치 차단, PR-9 legacy 재개 사례 |
| `feature-change.test.mjs`, `feature-change-states.json` | 직접 요청과 상위 전환 진입 조건 분리, 두 전환 fact가 true일 때 현재 entry source 선택, FC-5의 세 aggregate completion fact와 null executor, 상위 task를 한 Definition에 복사하지 않음 |
| `feature-fix.test.mjs`, `feature-fix-states.json` | 분석·계획 사용 가능/사용자 확인 gate, FF-6의 세 aggregate completion fact, 상위 Issue 종료 조건, common implementation task를 복제하지 않음 |
| `implementation.test.mjs`, `implementation-states.json` | FI 내부 단계·work-unit loop, PR/review/feedback 분기, current task 재평가, 단일 action 또는 terminal, 입력·evidence 보존 |
| `workflow-composition-observations.test.mjs` | mock GitHub/log provider를 실제 composition runtime에 주입해 adapter→evaluator→handoff 경로, GitHub 우선, close-first, parent re-evaluation, 승인 계획 group barrier를 확인함 |
| `evaluator.test.mjs`, `semantic-validation.test.mjs`, `structural-validation.test.mjs` 및 fixture | 단일 Definition의 edge match, terminal, invalid/missing 상태 중단, domain·graph·조건부 분기 오류 검출 |

기존 workflow별 테스트는 해당 Definition을 단독으로 읽고 evaluator/adapter 결과를 확인한다. 새
`workflow-composition-observations.test.mjs`는 `observeGithubState`와 `observeWorkflowLog` provider를 mock하고 실제
`runWorkflowObservationCycle`을 호출한다. 이 경로에서 GitHub 상태 요약을 검증·조합하고 실제 state adapter와 evaluator를
통과시킨 뒤 완료 handoff를 반환한다. 테스트는 proposal의 close-first successor 선택, policy-review의 기존 대상 갱신 후 종료와
신규 대상 경로 선택, stale log보다 GitHub 상태 우선, implementation 완료 후 parent entry 재평가 correlation을 확인한다.
별도 group scheduler test는 승인 plan의 병렬 group과 순차 barrier를 확인한다. live provider나 실제 Workflow 시작은 실행하지 않는다.

**[테스트 범위 분류]** 기존 workflow별 테스트는 단위 테스트다. 예를 들어
`feature-change.test.mjs`와 `policy-review.test.mjs`는 테스트 안에서 `observation(...)` 입력을 직접 구성해
state adapter에 전달하고, adapter는 이미 추출된 `fact_id`, `value`, `source_kind`, `source_reference`,
`field_reference`를 정규화한다. composition test는 관측 provider callback을 실행 경계에서 mock하므로 단순 fact 배열을 바로
adapter에 넘기는 테스트보다 넓게 runtime correlation·precedence·normalization·evaluation·handoff 조립을 시험한다. mock
provider는 실제 GitHub API나 log file을 읽지 않으며 이미 관측된 source result를 반환한다. 따라서 실제 observer/parser와 host의
provider binding, GitHub 상태 변경, 반환된 Workflow 시작은 여전히 미검증이다.

**실행 여부 및 한계:** 후속 변경 전 Day 4 정적 조사에서는 evaluator, CLI, fixture/test를 실행하지 않았다. 이번 사용자 요청 후
추가한 composition test 파일은 mock GitHub/log provider를 사용해 실행했다. 이는 provider 반환값을 실제 composition runtime,
adapter, evaluator와 handoff 계산에 통과시키는 로컬 검사다. 실제 GitHub/log provider, Workflow 시작·재개, GitHub 읽기/쓰기,
fetch는 수행하지 않았다. `all-fixtures.test.mjs`와 두 관련 skill-quality test도 실행했으며, 최신 결과는 후속 변경 기록에
따로 적었다.

## Day 3 provenance test 변경의 현재 상태

**[현재 worktree source]** 시작 시 수정 상태였던
`.codex-dist/skills/github-agentic-loop/tests/workflow-definition/feature-change.test.mjs`는 다섯 routing
observation의 `source_reference`를 동일한 synthetic `request_id` (`test-request-feature-change`)로 두고,
각각 `routing_check.<fact_id>`를 `field_reference`로 사용하도록 변경돼 있다. evidence assertion도 다섯 fact를
반복 검사한다. 이는 현재 `state-observation-contract.md`의 정적 provenance 형식과 맞는다.

**[Day 3 당시 기록]** `03-transition-evaluation.md`의 provenance 불일치는 그 보고서가 다룬 당시 기준선에서
테스트 입력이 `request routing` 및 일반 `facts.*` 경로를 쓰던 차이다. 현재 worktree의 변경 source를 그 과거
상태와 혼동하지 않는다. 이번 시작 기준선에는 그 테스트 파일의 변경이 이미 존재했다.

**[미검증 한계]** test를 실행하지 않았다. `feature-change-state-adapter.mjs`는 routing fact의 `local_state`를
허용하고 공통 adapter는 reference가 non-empty인지 검사하지만 canonical `request_id` 및
`routing_check.*` 형태를 자체 강제하지 않는다. 실제 host producer가 이 provenance를 내는지 여전히 미확인이다.
따라서 현재 test source 정렬은 관측한 사실이고, test 통과 또는 producer 준수는 검증되지 않았다.

## Day 3 review-thread fact 분리 제안의 범위

**[초기 조사 당시 사용자 제안/미확정]** `github_review_threads_observed`를 한 Boolean 의미에 겹치지 않고, 성공 관측 후
처리할 feedback 없음과 조회 실패/상태 불명을 분리하자는 의견이 Day 3 후속 addendum에 기록돼 있다. 성공 후
actionable feedback은 기존 `review_feedback_inventory`가 표현할 수 있다는 생각도 함께 제안됐지만, 새 fact ID,
상호 배타성, producer mapping, FI-24 전이 조건은 확정되지 않았다.

**[현재 source]** `implementation/FI-24`는 `github_review_threads_observed=true`와
`review_feedback_inventory` 존재를 모두 요구하고, inventory 값에 따라 actionable(`FI-25`) 또는
no-actionable(`FI-34`)로 분기한다. 해당 adapter는 GitHub observation 및 local inventory source kind를 각각
허용한다. 이후 확정된 정책을 source에 반영할 때 우선 영향을 받는 범위는 FI-24 review observation, feedback 처리,
merge 판단 및 implementation terminal이다. 상위 `feature-change`/`feature-fix`가 받는 직접 fact는 aggregate
completion 값이므로 상위 handoff 사실을 자동으로 바꾸는 것은 아니다. 구현 완료 집계 producer에 영향을 주는지는
별도 contract 검토가 필요하다.

초기 정적 조사에서는 이 제안을 공식 Definition/contract 의미로 취급하지 않았고 fact, adapter, Definition,
fixture/test를 바꾸지 않았다. 후속 정책 논의에서는 성공 관측과 피드백 없음, 조회 실패·상태 불명을 서로 구분하기로
정했다. 현재 worktree의 `state-observation-contract.md`는 `github_review_threads_observed=true`를 성공 조회로,
`review_feedback_inventory=no_actionable_feedback`를 성공한 빈 결과로 제한한다. 실패·미확인 상태는 `no_actionable_feedback`으로
해석하지 않는다. `FI-24`가 이미 관측 성공과 inventory 존재를 요구해 새 fact ID는 추가하지 않았으며, 실패·미확인 조합의 synthetic
fixture를 추가했지만 테스트는 실행하지 않았다. 실제 조회 producer가 이를 준수하는지는 미확인이다.

## 확인된 문제와 후속 후보 분류

### 확인된 선택 정책 문구의 모호성

- **이슈 유형 label/title 충돌 처리의 다음 단계가 명시적으로 정렬돼 있지 않다.**
  `github-agentic-loop/SKILL.md`는 Issue label과 title이 일치할 때 Workflow를 선택하며 둘이 다르면 중단한다고
  선언한다(`:98-100`). `references/github-templates.md`는 label을 title prefix보다 우선한다고 한 뒤 충돌 시
  사용자 결정으로 넘기고 선택된 유형을 반영한다고 한다(`:132`). `중단`이 사용자 결정 대기를 뜻한다면 두
  지시는 함께 적용될 수 있지만, Skill은 이 단계가 사용자 결정인지, label을 선적용하는지 명시하지 않는다.
  따라서 초기 정적 조사에서는 문구만으로 next action을 결정할 수 없다는 정책 모호성을 확인했다. 이후 사용자는 label만
  routing 기준으로 삼고 title prefix를 무시하기로 결정했다(아래 기록). runtime 충돌 사례나 실제 잘못된 workflow 선택은
  확인하지 않았다. source 정렬 여부는 아래 후속 worktree 변경 기록을 참조한다.

### 정책/contract 검토 후보

다음 항목은 최초 정적 조사가 끝났을 때 정책 또는 contract 검토가 필요하다고 분류한 내용이다. 사용자와 논의해
결정한 항목 및 아직 남은 질문은 아래 사전 정책 논의 절에 갱신했다.

- 후속 workflow selector가 feature-proposal의 direction/transition 완료 fact 및 정책검토의 transition 결과를
  어떻게 `workflow_id`로 매핑하는지, 대상 원본 Issue와 다음 기준 Issue를 어떤 relation/correlation으로 묶는지
  확정한다. 현재 Definition graph는 cross-Definition edge를 가지지 않는다.
- `policy-review-next-triage` 후보 ID/target Issue 번호와 최종 사용자 선택, PR-11/12 structured execution
  request의 target ID 사이 binding을 정의한다. 후보 복수, 추천 없음, target 누락/상태 변경, 기존 대상 종료,
  대상이 선택 전후로 달라진 경우에 stop/reselect 조건이 필요하다.
- FC-5/FF-6의 `executor_reference=null` task에서 누가 공통 `implementation`을 시작하는지, `implementation_requested`
  user fact와 부모 `implementation_flow_started` local fact를 어떻게 연결하는지, 부모 Issue 및 승인된 계획을
  어떤 producer가 전달하는지 명확히 한다.
- 부모 완료 집계 세 fact의 canonical source/field와 `FI-36 implementation_completed`, 병합된 PR·work unit,
  원본 Issue checklist 사이의 evidence correlation을 결정한다.
- PR-7에서 선택한 정확한 대상 ID가 PR-9 실행 요청과 GitHub related-issue 관측으로 이어지는 host producer를 확인한다.
- review-thread 성공·빈 결과·실패/미확인 구분의 실제 producer 처리는 확인되지 않았다.

### 기능 제안

새 workflow registry, 동적 router, Definition 간 graph engine을 만들 필요가 있다는 runtime 오류나 중복 실행
사례는 확인하지 못했다. 먼저 위 routing·handoff 책임과 사실 source를 계약으로 닫을지 검토한다. 따라서 이번
Day에는 신규 기능 제안을 작성하지 않는다.

### 보류

- host-level `workflow_id` selector, typed observation producer, target Issue ID 및 사용자 선택의 correlation,
  common implementation start/completion producer는 source를 확인하기 전까지 미확인으로 둔다.
- 모든 test/assertion 실행 결과, 실제 PR/review 상태, 실제 cross-workflow handoff 성공 여부는 미확인이다.
- `github_review_threads_observed`의 실제 producer mapping은 미확인이다. 사용자 결정은 현재 observation contract와 fixture source에
  반영했지만 실행하지 않았으므로 producer 준수 여부는 확인되지 않았다.
- 과거 대화의 `FC-5`, `FI-*`, `FF-*`, 취소 후 재개 판단은 그 자체로 현재 Definition/runtime 사실이 아니다. 아래 기록은
  Day 4 이후 사용자가 명시적으로 확정한 정책만 따로 수록한다.

## Day 4 사전 정책 논의 결과 (Day 5 진행 전, 2026-11-21)

이 절은 Day 4 정적 조사에서 식별한 사용자 정책 질문을 Day 5 시작 전에 대화로 결정한 기록이다. 여기 적힌 내용은
사용자가 확정한 설계 의도이며, Definition, contract, adapter, orchestration host가 이미 그에 맞게 동작했다는
과거 증거로 취급하지 않는다. 이후 사용자가 source 정렬을 요청해 worktree 변경을 적용했으며, 그 범위와 미검증 상태는
아래에 분리해 기록한다.

### 확정된 사용자 정책

1. **이슈 유형 선택**: Workflow 유형은 GitHub issue label로 정한다. title prefix는 무시하며, workflow 동작에서
   prefix를 읽거나 보존하는 정책은 두지 않는다. Workflow가 명시적 사용자 입력을 요구하는 단계에서 입력이
   모호하면 정확한 선택을 받을 때까지 질문한다. 사용자 입력이 요구되지 않는 단계에서 생긴 모호성은 사용자에게
   임의로 넘기지 말고 원인을 바로잡는다.
2. **Workflow 전환의 cardinality**: 사용자가 선택한 후속 Workflow가 하나인 1:1 전환은 기존 Workflow와 원본 이슈를
   정리하고 완료한 다음 오케스트레이션이 후속 Workflow를 시작한다. 부모가 여러 구현 Workflow를 시작하는 1:다 전환은
   부모 Workflow를 유지하며, 병렬 자식 흐름의 결과를 모아 부모 작업 단계가 다시 완료 조건을 판단한다. 자식 구현 단위와
   병렬화 여부는 오케스트레이션이 임의로 정하지 않는다. 오케스트레이션이 계획을 제안하고 사용자가 승인할 때 단위와
   병렬 진행 구성을 확정하며, 이후 오케스트레이션은 승인된 구성을 실행한다.
3. **기능제안 후속 흐름**: 기능제안에서 정책검토 또는 기능변경 중 하나를 선택하면 기능제안의 결정 내용을 원본 이슈에
   반영하고 원본 흐름을 종료한 후 오케스트레이션이 선택된 후속 Workflow를 시작한다. 두 경로 모두 선택당 후속 흐름은
   하나인 1:1 전환이다.
4. **정책검토의 기존 기능변경 대상 경로**: 기존 이슈를 갱신하기로 한 결정은 정확한 대상 이슈까지 명시적으로 선택하고
   기록해야 한다. 이슈 관계를 이용해 원본 정책검토 이슈와 선택된 대상 이슈를 연결하고, 재개 시 그 기록을 읽는다.
   선택 기록이 없거나 모순되면 재선택을 정상 흐름으로 요구하지 않고 기록·조회 계약의 문제로 멈춰 원인을 바로잡는다.
   기존 대상 경로는 `PR-9`에서 선택 대상과 원본의 GitHub related-issue 관계를 먼저 기록하고 `PR-10`에서 원본 정책검토
   이슈를 닫은 뒤, `PR-11`에서 선택된 이슈를 갱신하고 정책검토를 종료하며
   기능변경 Workflow를 자동 재개하지 않는다. 이 경로는 기존 대상 갱신 완료에서 종료한다. 갱신과 원본 종료가 현재 상태에서
   확인되면 별도 전환 완료 표시를 독립 완료 조건으로 요구하지 않는다.
5. **정책검토의 신규 기능변경 경로**: `PR-12`는 새 이슈를 만들거나 기능변경 Workflow를 먼저 시작하지 않고 정책검토를
   종료한다. 완료 뒤 오케스트레이션이 기능변경 Workflow를 시작하고, 새 이슈 생성은 기능변경 Workflow가 담당한다.
   이 경로는 기존 대상 경로와 terminal task를 공유하지 않는다. 실제 시작 전에 “새 흐름이 시작됨”을 나타내는 별도 fact는
   필요하지 않으며, 선택된 방향과 정책검토 완료를 이용해 오케스트레이션이 다음 흐름을 선택한다.
6. **Workflow 시작 및 사용자 승인**: 다른 Workflow를 선택하고 시작하는 책임은 오케스트레이션에 있다. 사용자의 최초
   요청이 해당 흐름의 시작을 승인했으므로, 기능제안·정책검토가 공통 `implementation`으로 이어질 때 별도 시작 승인을
   추가로 묻지 않는다. 각 Workflow 작업 단계가 명시적으로 요구하는 사용자 입력은 해당 단계에서 받는다.
7. **중단 후 재개**: 재개 시 저장된 `task_action_id`를 현재 단계의 권위 있는 기준으로 삼지 않고 최신 관측 fact로
   Definition 시작점부터 다시 평가한다. 로그의 작업 ID는 진행 이력 참고용이다. 부모 Workflow로 돌아온 뒤에는 부모의
   작업 단계가 원본 이슈의 구현 결과 반영 상태와 현재 연결 상태를 바탕으로 자기 완료 조건을 판단한다. 완료를 입증할
   상태가 누락되거나 충돌하면 추측하지 않고 멈춘다. 정책검토 기존 대상 경로에서는 대상 갱신과 원본 종료가 관측되면
   별도 전환 표시 없이 처음부터 평가해 종료에 도달해야 한다.
8. **구현 완료와 부모 이슈 완료**: 공통 `implementation`은 구현 결과를 원본 이슈에 반영한 뒤 완료한다. 그 후
   오케스트레이션은 구현을 시작한 부모 Workflow를 다시 평가한다. 구현 Workflow의 완료만으로 부모 이슈를 닫지 않으며,
   부모 Workflow의 작업 단계가 원본 이슈의 반영 결과와 자기 완료 조건을 확인한 뒤 종료 단계로 진행한다.
9. **PR review 관측**: 성공한 조회 결과 처리할 피드백이 없는 경우와 조회 실패 또는 상태 불명인 경우를 구분한다.
   조회 실패·상태 불명은 피드백 없음으로 취급하지 않고 확인될 때까지 멈춘다.

### 남은 정책 결정

- Day 4 보고서에서 제기한 사용자 정책 질문은 위 결정으로 정리됐다. 계획 안의 구현 단위 경계와 병렬화는 계획 승인에서
  사용자가 확정한다. 별도로 남은 정책 결정은 현재 없다.

### 결정과 현재 source의 차이 및 미검증 범위

- **[시작 기준선]** 당시 `policy-review.json`은 기존·신규 분기를 모두 `PR-9` terminal로 보냈고 신규 경로에서
  `new_issue_flow_started` 및 별도 전환 fact를 요구했다. 당시 `SKILL.md`는 재개 시 이전 `task_action_id` 사용을
  선언했다. 이는 baseline 조사 결과이며 아래 변경 후 source 상태와 구분한다.
- **[현재 worktree 변경]** `policy-review.json`에서 공통 `PR-9` terminal을 제거했다. 기존 대상 방향은 `PR-8` 뒤에 기존 경로 전용
  `PR-9` 관계 기록 task를 거치고, 신규 대상 방향은 이를 건너뛴다. `PR-7`은 기존 방향과 정확한 대상 Issue ID를 같은 사용자
  결정으로 받으며 최초 선택은 `feature_change_transition_target_issue_selected=true` (`user_input`)를 요구한다. 이미 저장된 대상 관계는
  재개 때 같은 선택을 복구하는 근거로 사용한다. 관계 기록 전 재개는 같은 request의 원래 사용자 입력 또는 구조화 실행 요청에서
  ID를 복원하며, 둘 다 없으면 재선택하지 않고 관측을 멈춘다. 이 boolean 선택 fact는 Issue ID 자체를 담지 않고, ID는 PR-9
  실행 요청과 저장된 GitHub 관계가 보존한다. `PR-9` 완료 fact인
  `feature_change_transition_target_related=true`는 원본 정책검토 이슈와 사용자가 고른 정확한 열린 기능변경 이슈의 관계를
  확인한 GitHub observation이다. `PR-10`은 기존 경로에서 이 fact를 close 선행조건으로 요구하고 신규 경로에서는 요구하지
  않는다. 원본 이슈 종료 후 기존 대상 갱신은 `PR-11`에서
  기존 이슈 갱신 결과, 방향 반영, 원본 정책검토 이슈 종료, 동일 대상 관계를 함께 확인하고 완료한다. 신규 대상 경로는 `PR-12`에서
  선택 방향, 반영, 원본 종료를 확인하고 완료한다. 새 이슈 생성 및 후속 Workflow 시작 fact는 제거했다. `PR-12` 완료
  이후 `feature-change`를 시작하는 선택은 orchestration 설계로 `SKILL.md`에 선언했다.
- **[현재 worktree 변경]** `feature-proposal`의 정책검토·기능변경 전환 완료 fact와 `FP-9/FP-10` 후속 task를 제거했다.
  원본 방향 반영과 이슈 종료가 충족되면 해당 경로(`FP-6` 또는 `FP-7`)가 완료되고, orchestration이 그 후 후속 Workflow를
  선택한다. `feature-change`에는 `feature_change_entry_source=feature_proposal`, `policy-review`에는
  `policy_review_entry_source=feature_proposal`을 진입 출처로 전달하도록 Definition·adapter·계약을 정렬했다. 새 후속 이슈와
  닫힌 원본 기능제안 이슈 사이의 GitHub related-issue 관계가 출처를 식별한다는 설계도 명문화했다.
- **[현재 worktree 변경]** `feature-change`의 정책검토 진입에서 별도 `policy_review_feature_change_transition_completed`
  fact를 제거하고 `feature_change_entry_source=policy_review`를 진입 근거로 남겼다. 재개는 Definition 시작점에서 최신 fact를
  다시 평가한다고 `SKILL.md`를 정렬했다. 세 Definition의 fixture/test assertion은 successor marker 제거, 각 terminal 경로,
  새 entry source 계약을 반영하도록 수정했지만 실행하지 않았다. skill-quality test source도 entry-task 재개와 close-first
  contract assertion을 새 정책에 맞게 바꿨지만 실행하지 않았다.
- **[현재 worktree 변경]** 기존 기능변경 대상은 사용자가 정확한 이슈를 선택한 뒤 원본 정책검토 이슈와 GitHub related-issue
  관계로 `PR-10` 종료 전에 기록하고, 재개 시 관계에서 같은 대상 ID를 읽도록 state-observation 및 structured-execution 계약에
  선언했다. `PR-9`의 대상 ID와 `PR-11`의 갱신 target은 같아야 하며 관계 누락·중복·유형/상태 불일치는 재선택을 요구하지 않고
  관계 기록·조회 원인을 바로잡도록 한다. 본문 이슈 언급은 관계를 대체하지 않는다고 명문화했다. relation 기록·조회와 선택
  입력에서 실행 요청으로 이어지는 host producer는 확인하지 못했다. policy-review adapter와 fixture/test source에도 새
  GitHub/user-input fact source, 정확한 대상 선택 및 기존 대상 relation 상태와 close-first route assertion을 추가했지만 실행하지 않았다.
- **[현재 worktree 변경]** 이슈 유형 선택은 유형 라벨 하나만 기준으로 하고 제목/title prefix는 routing이나 template 보존에
  사용하지 않도록 orchestration/issue creation 안내, template contract, 실제 `.github/ISSUE_TEMPLATE`의 prefix 기본값을
  정렬했다. 이는 현재 source 변경 내용이며 runtime에서 동작을 확인한 결과는 아니다.
- **[현재 worktree 변경/정책]** 구현 단위 경계와 병렬 진행 구성은 사용자 승인 계획에서 정하고, orchestration은 승인안을 실행한
  뒤 같은 부모 Workflow를 시작점부터 다시 평가한다는 규칙을 orchestration Skill과 설계·execution contract에 선언했다.
  승인 계획은 포함된 구현 시작 권한도 제공하므로 별도 시작 승인을 추가하지 않는다고 명시했다. 여러 자식 Workflow를 부모가
  실제로 생성·추적하는 host 동작, 승인 계획과 자식 실행 요청 간 producer·correlation은 여전히 확인하지 못했다.
- **[현재 worktree 변경]** 이전 계획 출력 contract는 각 PR 단위와 전체 `구현 순서`만 요구해 승인된 병렬 구성을 구조적으로
  표현하지 못했다. `feature-plan`, `fix-plan` 및 `artifact-output-contract.md`를 `실행 그룹`과 `실행 그룹 순서`로 정렬했다.
  한 그룹의 단위는 서로 선행 관계가 없고 병렬로 시작하며, 다음 그룹은 앞 그룹 전체가 끝난 뒤 시작한다. 전부 직렬인 계획은
  단위마다 그룹을 둔다. 사용자가 승인한 그룹을 실행하는 실제 host producer는 미확인이다.
- **[현재 worktree 변경]** 중단 후 재개는 저장된 `task_action_id`가 아니라 Definition 시작점과 최신 fact에서 평가하도록
  orchestration Skill, execution contract, 설계 문서를 정렬했다. 같은 실행 루프에서 다음 task를 평가할 때 evaluator가 반환한
  `task_action_id`를 쓰는 절차는 그대로 유지한다.
- **[현재 worktree 변경]** review-thread 조회 정책은 성공 관측과 결과 inventory가 함께 있어야 `FI-24`가 다음 단계로
  넘어가도록 observation contract에 의미를 명시했다. 실패 또는 상태 불명은 피드백 없음으로 취급하지 않으며, 관련 fixture에 이
  모호한 조합을 넣었다. Definition의 현재 두 fact 구조를 사용했고 새 fact ID나 producer 구현은 추가하지 않았다. 조회 producer의
  실제 오류 처리는 미확인이다.
- **[현재 worktree 변경]** `docs/github-workflow-engine.md`의 전환·복구 설명을 1:1 successor 흐름과 기존 대상 갱신 종료 흐름으로
  정렬했다. 계획 승인 때 구현 단위 및 병렬 배치를 결정하고 오케스트레이션이 그 배치를 임의로 바꾸지 않는 규칙, 부모 Workflow
  식별·재평가, 이슈 관계를 대상 identity의 정본으로 사용하는 원칙을 반영했다.
- **[현재 worktree 변경]** `composition-runtime.mjs`를 추가했다. `runWorkflowObservationCycle`은 read-only GitHub 상태 요약 및
  workflow log provider 결과를 요청·기준선과 상관하고, 같은 fact의 충돌에서는 GitHub 상태를 우선하며 adapter/evaluator를 한 번씩
  호출한다. 완료 뒤 feature-proposal·policy-review successor, 기존 대상 갱신 종료, implementation parent 재평가 handoff를 반환한다.
  `selectNextImplementationGroup`은 승인 plan의 단위·그룹·선행 관계를 확인하고 현재 그룹 전체 완료 전에는 다음 그룹을 내지 않는다.
  실제 provider binding과 반환된 start 요청 실행은 host 책임으로 남아 있다.
- **[현재 worktree 변경]** FI-36 parent 재평가 대상에 `policy-review`도 허용했다. policy-review Definition은 설계 문서 구현을
  공통 `implementation`으로 위임하고 그 merge·반영 결과를 부모 task에서 판단한다. 승인된 병렬 실행 그룹 스케줄러는 계획 승인
  경로가 있는 `feature-change`와 `feature-fix`에만 적용한다.
- **[현재 worktree 변경]** `workflow-composition-observations.test.mjs`를 runtime provider mock으로 교체했다. mock은 GitHub summary와
  workflow log 결과를 반환하고 실제 composition runtime→adapter→evaluator→handoff 코드를 지난다. source-issue close-first,
  PR-11 exact relation 후 종료, PR-12 close 이후 `feature-change` 선택, GitHub 상태 우선, FI-36 parent re-evaluation, 승인된 실행
  그룹의 병렬 launch 및 순차 barrier를 다룬다. 현재 FI-36 test는 `policy-review`, `feature-change`, `feature-fix` parent context를
  모두 다루며, `policy-review`는 planned-group launcher에서 거부되는 것도 확인한다. mock은 live GitHub, 로그 파일, host provider
  연결을 대신하지 않는다.
- **[현재 worktree 변경]** 변경 후 테스트 결과: composition runtime mock test 9개 통과, `all-fixtures.test.mjs` 120개 통과·실패 0,
  `reference-boundary-contract.test.mjs` 17개 통과, `skill-structure-contract.test.mjs` 5개 통과. 이 결과는 위 각
  로컬 테스트 범위만 가리키며 live provider, Workflow 시작 또는 host 연결의 실행을 검증하지 않는다.
- 이슈 관계 기록·조회, 사용자 대상 선택과 request target binding, 승인 plan group 실행, 부모 완료 fact producer, 실제
  cross-workflow handoff를 실행하는 외부 host와 provider 결과 producer는 확인되지 않았다. 실행한 것은 injected mock을 통한
  composition-runtime 로컬 테스트이며 기존 fixture/test 전체 또는 live handoff를 검증한 것은 아니다.
- 후속 source 편집 뒤 `policy-review.json`과 그 fixture는 JSON parser로 읽었고, policy-review adapter/test source는 `node --check`,
  worktree는 `git diff --check`로 확인했다. 이는 형식·공백 검사이며 evaluator 동작, assertion 결과 또는 workflow 실행 검증이 아니다.

## Day 4 완료 조건 체크리스트

- [x] 시작 branch, HEAD, 작업 트리, local `main`, cached `origin/main` 및 branch upstream 기준선을 기록했다.
- [x] fetch하지 않았으며 원격 최신 여부를 미확인으로 표시했다.
- [x] 지정 문서에서 Day 1 경로 `01-workflow-definition.md`와 Day 2 경로 `02-state-observation-normalization.md`를 읽고 사용했다. 제거된 보고서는 검색·복원하지 않았다.
- [x] 내부 `task_action_id`와 orchestration의 `workflow_id` 선택을 구분하고 evaluator의 반환 책임을 기록했다.
- [x] 기능제안→정책검토/기능변경, 정책검토→기존/신규 기능변경, 기능결함/기능변경→공통 `implementation` 경로를 fact·원본 종료·handoff·선택 책임으로 추적했다.
- [x] close-first, 기존/신규 후보 조건, 대상 선택 및 누락 시 미확인 책임을 확인했다.
- [x] 공통 구현으로 전달되는 plan·completion facts와 implementation의 PR/review 자체 facts, 미확인 producer 연결을 나눴다.
- [x] workflow별 fixture/test source가 보호하려는 조건을 읽었다. 최초 정적 조사 시에는 실행하지 않았고, 후속 변경 이후 mock 기반
  composition test 및 지정된 전체 fixture·관련 skill-quality 테스트를 실행해 결과와 한계를 기록했다.
- [x] Day 3 provenance finding을 당시 기준선으로 구분하고 현재 test source 변경, 미실행 한계, 미확인 producer를 기록했다.
- [x] 초기 정적 조사에서 review-thread 분리 의견을 미확정 사용자 제안으로 분류했다. 후속 정책은 별도 fact를 추가하지 않고
  현재 observation contract와 fixture source의 성공 조회/빈 결과 조건에 반영했으며, producer 동작은 미확인으로 남겼다.
- [x] 과거 `FC-5`, `FI-*`, `FF-*`, cancellation/resume 판단을 당시 source 사실로 취급하지 않았다. 이후 사용자가 명시적으로
  확정한 정책은 위 별도 절에서 source 사실과 구분해 기록했다.
- [x] 초기 정적 조사 시 Definition·contract·adapter·fixture/test source를 변경하지 않고 Day 4 보고서를 작성했다.
  후속 사용자 요청으로 적용한 source/test 변경은 baseline 조사와 별도 절에 표시했으며 테스트를 실행하지 않았다.
- [x] Harness 재진입, Workflow 시작·재개, GitHub 조회/상태 변경, fetch를 하지 않았다.
- [x] Day 5 시작 전 정책 논의에서 확정된 결정을 Day 4 보고서와 관련 source에 반영하고, 남은 producer 미확인 범위와
  미실행 테스트를 분리했다.
