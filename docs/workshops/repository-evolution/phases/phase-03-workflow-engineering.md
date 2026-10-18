# Phase 3. Workflow Engineering

> [!NOTE]
> 이 문서는 Repository Evolution Workshop의 **학습·조사·개선 계획**이며 공식 설계나 정책이 아니다.
> 각 Day의 분석에서 발견한 변경 후보는 사용자 결정과 별도의 Issue·PR·검증을 거친 뒤에만 `main`에 반영한다.

## Phase 목표

최신 `codex-harness`의 **GitHub Agentic Loop**를 대상으로, 선언형 Workflow Definition과 정규화된 사실, 결정론적 전이 평가, 사용자 결정, 실행 주체 및 재개 계약이 실제로 어떻게 연결되는지 학습·검증한다.

**새 엔진을 만드는 것이 목표가 아니다.** Phase 2에서 확인한 기존 구조의 강점과 수용된 제한을 보존하고, 실제로 확인된 결함 또는 비용에 대해서만 개선을 제안한다.

Phase 2에서 관측한 출발점(새 Day 시작 시 재확인 필요):

- 현재 배포 이름은 `github-agentic-loop`; `github-workflow-engine`은 과거 식별자 또는 역할 설명에서만 사용한다.
- `definitions/*.json`, 워크플로별 state adapter, validator/evaluator가 유한 상태의 다음 `task_action_id`를 계산한다.
- 현재 문서에서는 `feature-proposal`, `policy-review`, `feature-change`, `feature-fix`, `implementation`의 워크플로를 매핑한다. 실제 목록은 현재 checkout에서 확인한다.
- GitHub Issue·PR·review thread가 협업 상태의 정본이며, normalized fact와 평가 결과는 파생 상태다.
- 전문 스킬은 초안·후보를 제시하며 사용자 결정을 대신하지 않는다. 확정된 작업만 실행 주체에 전달한다.
- `workflow-code-editor`의 파일 변경 handoff와 request/baseline/result 검증을 존중한다.
- Phase 2에서는 현재 source에서 재현된 활성 결함이 없었다. 과거 관측 및 synthetic fixture와 현재 동작을 혼동하지 않는다.

### 이번 Phase에서 답할 핵심 질문

1. Workflow Definition의 작업·전이·완료 모델은 실제 사용자 흐름을 충실하게 설명하는가?
2. 원본 상태 → typed observation → normalized fact → evaluator 경계가 명확한가?
3. 단일 전이, rule 충돌, 불확실한 입력, 완료 판정은 안전하고 일관적인가?
4. 워크플로 간 진입·전환과 공통 `implementation` 흐름의 경계가 분명한가?
5. 사용자 결정, 실행 책임, 완료 후 재관측, 중단·재개가 계약과 테스트에서 일치하는가?
6. 조건과 정의의 중복·복잡도가 실제 오류나 변경 비용으로 이어지는가?
7. 현재 구조를 유지할 이유와 변경할 이유를 **증거로** 구분할 수 있는가?

## 시작 전에 읽을 문서

1. `docs/workshops/repository-evolution/README.md`
2. `docs/workshops/repository-evolution/roadmap.md`
3. `docs/workshops/repository-evolution/execution-guide.md`
4. `docs/reviews/repository-evolution/phase-02/summary.md`
5. 이 문서

필요할 때만 Phase 2 개별 Day 보고서를 읽는다. 과거 기록의 경로·커밋·시나리오·관측값은 **그 시점의 증거**이며 최신 사실이라고 가정하지 않는다.

## 진행 및 안전 원칙

- 현재 checkout의 브랜치·HEAD·작업 트리·`main` 비교 기준을 먼저 기록한다. 원격을 갱신하지 않았다면 cached `origin/main`을 원격 최신 상태로 단정하지 않는다.
- 사실 / 명시된 설계 / runtime 관측 / synthetic fixture·test / 가설·판단 / 사용자 결정을 분리해 표기한다.
- 최초 단계는 **읽기 전용 분석**이다. 테스트와 실행은 해당 대상·부수 효과·격리 환경을 확인한 뒤 수행한다.
- 실제 GitHub 이슈·PR·브랜치·리뷰 변경, Workflow 시작·재개, target 파일 쓰기, 보호 경로 권한 변경은 별도 명시적 사용자 결정 없이 실행하지 않는다.
- 예상 결과와 실제 관측, 코드로 확인한 가능 동작을 구분한다. 검증을 실행하지 않았다면 통과를 주장하지 않는다.
- 현재 `state-observation-contract.md`와 workflow별 adapter 계약을 따른다. 실제 오매핑 사례 없이 새 raw GitHub parser를 제안하지 않는다.
- 기존 `workflow-code-editor` handoff와 사후 검증 경계를 유지한다. 실제 handoff 오류 없이 다른 실행 계층을 추가하지 않는다.
- 동시 `request_id`의 atomic claim 보장 검증, 별도 동시성 구현, 중앙 log/trace, 추가 stdout/stderr 수집, 새 registry/manifest/compiled runtime은 Phase 2에서 **보류·수용된 범위**다. 새 사고와 사용자 재승인 없이는 범위에 포함하지 않는다.
- Harness의 end-to-end 재진입은 이번 Phase의 필수 조건이 아니다. 필요할 경우 disposable target 및 보호 경로 권한을 먼저 확보한다.
- Phase 3은 **GitHub Agentic Loop 워크플로 제어**를 중심으로 한다. 개별 스킬 내부의 문장 최적화는 Phase 4, GitHub 제어면의 정책 재설계는 Phase 5에서 깊게 다룬다.
- 개선 후보 발견 즉시 `main`을 고치지 않는다. 학습 브랜치에 결과를 작성한 뒤 사용자 결정에 따라 별도 PR로 공식 반영한다.

## 결과 문서 기본 위치

```text
docs/reviews/repository-evolution/phase-03/
├─ 01-definition-inventory.md
├─ 02-state-observation-normalization.md
├─ 03-transition-evaluation.md
├─ 04-workflow-composition-routing.md
├─ 05-user-decision-execution-boundaries.md
├─ 06-resume-cancellation-regression.md
└─ summary.md
```

Day 결과에는 학습 개념 설명, 현재 코드·계약 근거, 관측 가능한 입력/출력, 강점, 문제/가설 구분, 변경 비용·회귀 위험, 질문, 다음 Day 선행 조건을 남긴다.

---

# Day 1. Workflow Definition Inventory and Contracts

## 학습 목표

선언형 Workflow Definition의 스키마와 실제 워크플로 집합을 파악하고, 각 definition·adapter·validator·evaluator·executor의 책임을 설명한다.

## 학습 개념

- Declarative Workflow
- State Machine / Transition Graph
- Task Action과 Workflow State의 차이
- Entry Task, Fact Domain, Completion Predicate
- Schema and Semantic Validation
- Definition as Data, Evaluator as Code

## 조사 항목

- `.codex-dist/skills/github-agentic-loop/SKILL.md`
- `definitions/*.json` (실제 존재하는 모든 workflow ID)
- `references/workflow-definition-contract.md`
- `scripts/workflow-definition/{validator,evaluator,cli}.mjs` (현재 파일 확인)
- 전역 thin skill의 `executor_reference` 연결
- 정의별 entry, transition, fact, decision, completion, terminal outcome
- `docs/github-workflow-engine.md` 등 공식 설계 문서와의 일치

## 수행 작업

1. 현재 브랜치·HEAD·작업 트리와 `main` 기준선을 기록한다.
2. 존재하는 모든 definition을 목록화하고 workflow ID, entry action, transition 수, fact 수, executor 수를 조사한다.
3. `task_action_id`와 `workflow_id`의 역할 및 유효 범위를 설명한다.
4. 각 JSON 구조의 핵심 필드와 validation 규칙을 실제 코드 및 계약과 연결한다.
5. 상태를 판단하는 규칙과 실제 부수 효과를 실행하는 경계를 구분한다.
6. entry·종료·오류 및 사용자 결정 대기 흐름을 정리한다.
7. 중복되어 보이는 정의가 실제 필요성인지 측정할 후속 기준을 제안한다.
8. 새 DSL, 상태 머신 라이브러리, 중앙 workflow registry를 전제하지 않고 현재 선언형 모델의 장점을 기록한다.

## 결과물

`docs/reviews/repository-evolution/phase-03/01-definition-inventory.md`

## 완료 조건

- 현재 workflow/adapter/definition 목록과 근거 경로가 완성된다.
- 선언형 데이터, 결정론적 코드, 실행 주체의 책임이 구분된다.
- 대표 definition의 entry→action→terminal 흐름을 설명할 수 있다.
- Day 2에서 관측할 원본 사실과 정규화 경계가 식별된다.

---

# Day 2. State Observation and Fact Normalization

## 학습 목표

GitHub·로컬·사용자·스킬 근거가 전이 판단에 사용할 수 있는 typed fact로 바뀌는 경계를 파악한다.

## 학습 개념

- Observation vs. Inference
- Source of Truth and Provenance
- Normalized Facts
- Adapter / Validator Contract
- Missing, Ambiguous, Conflicting Evidence
- Fail-closed State Interpretation

## 조사 항목

- `references/state-observation-contract.md`
- `references/normalized-fact-adapter-contract.md`
- workflow별 `*-state-adapter.mjs`, 공통 adapter (실제 파일명 확인)
- Issue/PR/review thread 정본과 local evidence
- workflow `facts` 허용 도메인
- template/label/issue type 충돌과 raw→typed 관측 책임

## 수행 작업

1. Day 1의 대표 워크플로 중 서로 다른 이슈 유형 두 개 이상을 선택한다.
2. 각 fact의 원본 근거, 관측 주체, adapter 입력, 출력 도메인을 추적한다.
3. raw GitHub API를 해석하는 주체와 adapter의 typed input 검증을 구분한다.
4. 누락·상충·알 수 없는 값의 처리와 중단 사유를 정리한다.
5. 같은 입력을 두 번 normalize했을 때의 기대 일관성을 코드/fixture로 검토한다.
6. GitHub 정본과 보조 log 충돌 시 우선순위를 확인한다.
7. 실제 오류 없이 parser/저장 계층을 확장하는 선택지는 제외하고, 필요한 경우 격리 fixture 후보만 기록한다.
8. Phase 5에서 다룰 정책적 상태 의미와 이번 Phase의 기술적 변환 계약을 분리한다.

## 이전 Day 입력

`docs/reviews/repository-evolution/phase-03/01-definition-inventory.md`

## 결과물

`docs/reviews/repository-evolution/phase-03/02-state-observation-normalization.md`

## 완료 조건

- 대표 fact의 provenance가 추적 가능하다.
- raw observation과 normalized fact의 소유 경계가 설명된다.
- 누락·상충·비허용 값에서 현재 계약의 동작이 명확하다.
- Day 3의 평가 입력 사례가 마련된다.

---

# Day 3. Transition Rules and Deterministic Evaluation

## 학습 목표

`evaluateWorkflowDefinition`이 단일 action 또는 completed/stopped를 계산하는 원리와 안전 불변 조건을 검증한다.

## 학습 개념

- Deterministic Transition
- Guards and Predicates
- Rule Exclusivity / Ambiguity
- Completion Predicate
- Terminal State
- Re-evaluation and Purity
- Model Checking by Fixtures

## 조사 항목

- `definitions/*.json`의 `normalized_fact_conditions`, `completion_predicate`, `next_transition_rules`
- `scripts/workflow-definition/{validator,evaluator,cli}.mjs`
- `references/workflow-definition-contract.md`
- 정상 action_required, completed, stopped와 오류 사유
- evaluator 입력/출력, 현재 action 재평가 계약
- `tests/workflow-definition/`의 fixture 및 회귀 테스트

## 수행 작업

1. 단일 경로를 선정해 fact→rule→task→완료 predicate→다음 rule을 손으로 추적한다.
2. 조건이 0개/복수 매칭, 사실 누락, 비허용 값, 부정확한 current action일 때의 동작을 조사한다.
3. 최초 진입과 실행 완료 후 **같은 task action ID**를 사용한 재관측·재평가 흐름을 구분한다.
4. evaluator가 외부 상태를 변경하지 않는지 확인한다.
5. 별도의 새 테스트 실행 전, 기존 fixture가 어느 안전 불변 조건을 보호하는지 목록화한다.
6. 실행이 안전한 경우에만 로컬 pure evaluator/fixture 검증을 수행하고 실행 명령·결과를 기록한다. 실행하지 못하면 미검증으로 남긴다.
7. 중복 조건/복잡도는 실제 unreachable action, rule conflict, drift, 유지보수 실패의 증거로 판단한다.
8. 규칙 변경이 필요하면 예상되는 fixture 보강과 영향 범위를 먼저 제시한다.

## 이전 Day 입력

Day 1·2 결과 문서.

## 결과물

`docs/reviews/repository-evolution/phase-03/03-transition-evaluation.md`

## 완료 조건

- 단일 작업·완료·안전 중단의 결정 과정이 재구성된다.
- 모호하거나 누락된 입력에 대한 반응이 코드와 계약으로 확인된다.
- 중요한 안전 불변 조건과 현재 fixture coverage가 연결된다.
- Day 4에서 다룰 워크플로 간 경계가 식별된다.

---

# Day 4. Workflow Composition and Routing

## 학습 목표

여러 개의 workflow ID와 공통 `implementation` 흐름이 어떻게 연결되는지 파악하고, 상태 해석·계획·실행 책임이 혼합되지 않았는지 확인한다.

## 학습 개념

- Workflow Composition
- Entry and Handoff Contract
- Routing vs. Transition
- Single Workflow Selection
- Subworkflow / Shared Execution Flow
- Boundary Ownership
- Avoiding Duplicated Business Rules

## 조사 항목

- `feature-proposal`, `policy-review`, `feature-change`, `feature-fix`, `implementation` (현재 상태 재확인)
- `SKILL.md`의 workflow 선택 규칙
- definition의 entry source, 전환 조건, `executor_reference`
- 전문 제안·계획 스킬과 thin executor
- `references/{artifact-output-contract,structured-execution-contract}.md`
- 파일 변경 시 `workflow-code-editor` handoff
- 이슈 유형·라벨 충돌, 중복 routing, 교차 흐름 종료 조건

## 수행 작업

1. 기능제안→기능변경→implementation 및 정책검토→기능변경 사례를 추적한다.
2. 기능결함→implementation 경로와 기존 feature flow의 차이를 파악한다.
3. 단일 workflow 선택 조건을 검토하고 불명확한 대상에서의 안전 중단을 확인한다.
4. 이전 workflow 완료 사실이 다음 workflow의 입력 사실로 어떻게 전달되는지 설명한다.
5. 각 경로가 중복으로 실행 주체를 호출하거나 사용자 결정 없이 다음 흐름을 확정하지 않는지 확인한다.
6. code editor의 target/general 경로 선택과 사전·사후 검증 소유권을 확인한다.
7. 공통 implementation 재사용이 유익한 부분과 지나친 중앙화가 위험한 부분을 구분한다.
8. 새로운 Workflow Graph 엔진이나 동적 라우터를 제안하기 전에 기존 definition·adapter만으로 가능한 개선을 평가한다.

## 이전 Day 입력

Day 1~3 결과 문서.

## 결과물

`docs/reviews/repository-evolution/phase-03/04-workflow-composition-routing.md`

## 완료 조건

- 주요 워크플로 간 전환 경로가 정의·계약 기준으로 설명된다.
- workflow 선택과 action 전이의 책임이 구분된다.
- 사용자 결정과 실행 주체가 혼합되지 않음이 평가된다.
- Day 5에서 검토할 승인·실행 사례가 선정된다.

---

# Day 5. Human Decisions and Execution Boundaries

## 학습 목표

전이 계산, 사용자 선택, artifact 준비, 실제 부수 효과 실행과 검증 사이의 경계를 분석한다.

## 학습 개념

- Decision vs. Execution
- Authorization and Confirmation
- Artifact Proposal vs. Durable Mutation
- Executor Contract
- Precondition, Baseline, Postcondition
- Correlation and Auditability

## 조사 항목

- `user_decision_options`, `completion_predicate`, `executor_reference`
- `references/{user-decision-contract,artifact-output-contract,structured-execution-contract}.md`
- `references/{command-execution-path-contract,file-change-execution-contract,target-harness-execution-contract}.md`
- `.codex-dist/skills/workflow-code-editor/SKILL.md`
- 실행 요청·결과의 `request_id`, `task_action_id`, `target_baseline`, 실제 session ID
- GitHub mutation과 로컬 file mutation을 수행하는 실행 주체

## 수행 작업

1. 확정 전 초안 생성과 확정 뒤 durable mutation을 별도로 추적한다.
2. 사용자 승인 없이 실행될 수 있는 것과 반드시 결정을 기다리는 것을 문서/definition 기준으로 구분한다.
3. 요청 범위, baseline, executor 결과, postcondition이 서로 맞는지 확인하는 경로를 재구성한다.
4. `workflow-code-editor`에서 단일 실행 경로 선택 후 fallback하지 않는 계약을 확인한다.
5. 외부 스킬·도구 부재, 결과 불일치, 사용자 미결정 때 재개 조건을 기록한다.
6. read-only 분석이나 synthetic fixture 범위를 넘어서는 실습은 승인 전 수행하지 않는다.
7. 실제 incident 없는 새로운 승인 단계·권한 시스템·실행 래퍼 도입을 전제하지 않는다.
8. Phase 8 Human Checkpoint에서 다룰 정책 수준의 승인 체계와 이번 계약 검증을 구분한다.

## 이전 Day 입력

Day 1~4 결과 문서.

## 결과물

`docs/reviews/repository-evolution/phase-03/05-user-decision-execution-boundaries.md`

## 완료 조건

- 제안·승인·실행·검증의 소유자가 명확히 구분된다.
- 실제 side effect에 도달하기 위한 근거·사전조건을 설명한다.
- 잘못된 결과 correlation에 대한 현재 방어 계약을 확인한다.
- Day 6에서 재개·취소를 검토할 대표 시나리오가 준비된다.

---

# Day 6. Resume, Cancellation, and Regression Scenarios

## 학습 목표

중단·반복·취소 후 워크플로가 정본을 다시 읽고 안전한 다음 작업을 선택하는지 계약과 격리된 시나리오로 검토한다.

## 학습 개념

- Resume and Reconciliation
- Cancellation vs. Stop vs. Complete
- Re-observation
- Idempotent Evaluation
- Partial Completion
- Regression Scenario
- Fail-closed Recovery

## 조사 항목

- `SKILL.md`의 최초 진입/재개/반복 절차
- `references/structured-execution-contract.md`
- Definition별 terminal/completion 조건
- 현재 작업의 `currentTaskActionId`, `task_action_id`, 결과 이유 코드
- GitHub 재관측과 local ignored log의 보조 역할
- 기존 workflow fixture 및 과거 PR/Issue 기록
- 미완료 사용자 결정, 실행 실패, 이미 완료된 작업의 반복 요청

## 수행 작업

1. 최소한 신규 시작, 사용자 결정 대기, 작업 완료 직후, 동일 요청 반복, 변경된 GitHub 상태, 불명확한 상태의 여섯 사례를 선정한다.
2. 각 시나리오의 초기 관측, current action, fact, expected evaluation, 다음 재개 조건을 기록한다.
3. 순수 evaluator fixture와 실제 외부 mutation을 엄격히 분리한다.
4. 부수 효과 없는 fixture를 실행할 수 있으면 명령·HEAD·결과를 기록하고, 불가하면 코드 수준에서만 평가한다.
5. 실패 후 재실행 시 동일 사실을 그대로 신뢰하지 않고 새 authoritative snapshot을 요구하는지 확인한다.
6. 완료 판정과 stopped, 취소/보류, user-decision pending을 혼동하지 않는지 검토한다.
7. 기존 테스트에서 보호되는 전이와 확인되지 않은 경계를 구분해 추가 fixture 필요성을 평가한다.
8. Phase 2에서 명시적으로 보류한 동시 `request_id` 충돌과 로그 수집 확장은 다시 열지 않는다.
9. 새로운 테스트나 계약 변경 제안은 재현 가능한 실패 또는 현재 contract gap을 근거로 작성한다.

## 이전 Day 입력

Day 1~5 결과 문서.

## 결과물

`docs/reviews/repository-evolution/phase-03/06-resume-cancellation-regression.md`

## 완료 조건

- 시작·대기·재개·완료·안전 중단의 대표 경로가 검증 또는 미검증으로 정확히 기록된다.
- durable GitHub 정본과 derived fact 및 local log의 우선순위가 유지된다.
- 누락된 회귀 보호가 근거와 함께 분리된다.
- Phase 3 종합에서 판단할 개선 후보와 재검토 조건이 정리된다.

---

# Day 7. Phase 3 Synthesis

## 학습 목표

Day 1~6 근거를 통합해 GitHub Agentic Loop 워크플로 구조의 강점·확인된 결함·수용된 한계·개선 후보를 판단하고 Phase 4 Skill Engineering의 입력을 준비한다.

## 수행 작업

1. Day 1~6 결과와 Phase 2 Summary를 함께 검토한다.
2. 최신 checkout, `main` 기준선, 관측 시점과 테스트 실행 여부를 명시한다.
3. Definition/adapter/evaluator/실행 스킬 사이 책임 분리를 종합한다.
4. 상태 전이, 복합 워크플로, 사용자 결정, 반복·재개에서 확인한 강점과 문제를 분리한다.
5. 실제 재현된 correctness 오류, 운영상 비용, 미측정 가설, 이미 수용한 제한을 구분한다.
6. Phase 2에서 제외한 중앙 계층·동시성·로그 확장을 무근거로 재제안하지 않는다.
7. 즉시 수정/정책 검토/기능 제안/보류로 분류하고, 변경하지 않는 선택의 장점과 비용도 기록한다.
8. 개선이 승인된다면 필요한 issue, 최소 변경 범위, 회귀 fixture, `main` 대상 별도 PR 계획을 제안한다. 사용자 승인 없이 이슈 생성·GitHub 변경·공식 설계 반영을 하지 않는다.
9. Phase 4의 스킬 설명·책임·references·tool activation 분석에 전달할 실증 근거를 정리한다.

## 이전 Day 입력

`docs/reviews/repository-evolution/phase-03/01-definition-inventory.md`부터 `06-resume-cancellation-regression.md`까지.

## 결과물

`docs/reviews/repository-evolution/phase-03/summary.md`

## 요약 문서 권장 구조

```markdown
# Phase 3 Workflow Engineering Summary

## 문서 성격과 조사 기준선
## GitHub Agentic Loop의 현재 Workflow Definition 구조
## Observation → Normalization → Evaluation 근거
## 단일 전이와 종료 판정
## 워크플로 간 전환·공통 Implementation
## 사용자 결정과 실행 책임
## 중단·재개·취소·회귀 검증
## 확인된 강점
## 재현된 활성 문제
## 수용된 한계와 미관측 가설
## 근본 원인
## 변경 유형별 개선 후보
### 즉시 수정
### 정책 검토
### 기능 제안
### 보류
## 확정된 사용자 결정과 공식 반영 상태
## Phase 4 선행 조건
## 남은 질문과 근거 경로
```

## 완료 조건

- 현재 모든 workflow와 주요 transition 경계가 근거와 함께 설명된다.
- 결정론적 평가, 사용자 결정, 단일 실행 주체의 책임이 분리되어 있다.
- 중단·재개와 완료의 안전성 수준 및 미관측 한계가 명확하다.
- 개선 후보가 사용자 승인 여부 및 회귀 위험과 함께 분류된다.
- Phase 4 시작에 필요한 skill execution·activation 분석 입력이 정리된다.

---

# Codex CLI 실행 방법

기본 프롬프트만 단독 제출하지 않고 다음 파일을 명시적으로 읽게 한다.

```text
docs/workshops/repository-evolution/execution-guide.md
docs/workshops/repository-evolution/phases/phase-03-workflow-engineering.md
docs/reviews/repository-evolution/phase-02/summary.md
```

Day 2 이후에는 이전 Day 결과도 읽도록 지시한다.

```text
현재 체크아웃된 저장소의 최신 상태를 기준으로 Repository Evolution Workshop
Phase 3 Workflow Engineering의 Day [N]을 수행하세요.

먼저 아래 문서를 읽으세요.
1. docs/workshops/repository-evolution/execution-guide.md
2. docs/workshops/repository-evolution/phases/phase-03-workflow-engineering.md
3. docs/reviews/repository-evolution/phase-02/summary.md
4. 이전 Day 결과 문서(존재하는 경우)

Phase 2에서 보류·수용된 범위 결정을 존중하세요. 문서 내용을 현재 실행 사실로
단정하지 말고 최신 코드, definitions, adapters, validator/evaluator 및 계약을
직접 확인하세요.

오늘 Day [N]의 학습 개념을 먼저 설명하고, 조사 순서·읽을 파일·검증 방법을
제시한 뒤 수행하세요. 사실, 설계, 과거 관측, 테스트 및 가설을 구분하세요.
학습·분석 결과는 지정된 Day 결과 문서에 저장하세요.

실제 GitHub mutation, Workflow 시작·재개, 보호 경로 쓰기, 공식 설계 변경은
사용자 승인 전 수행하지 마세요. 필요한 개선은 분류와 제안까지만 진행하세요.
```

## 학습 브랜치 운영

- 학습 계획과 Day 결과: `docs/repository-evolution-workshop` 브랜치에 유지한다.
- 공식 개선이 승인되면 `main` 기준 별도 변경 브랜치/PR로 반영한다.
- `main` 반영 후 학습 브랜치를 최신 `main` 기준으로 갱신하고 조사 baseline을 기록한다.
- 학습 문서 자체를 공식 설계 문서와 혼합하거나 `main`에 통째로 병합하지 않는다.
