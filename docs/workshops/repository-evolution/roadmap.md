# Repository Evolution Roadmap

## 목적

이 로드맵은 `codex-harness` 저장소를 실제 사례로 사용해 에이전트 하네스 설계를 학습하고, 학습 결과를 근거로 저장소를 점진적으로 개선하기 위한 과정이다.

각 Phase는 다음 흐름을 따른다.

```text
개념 학습
→ 최신 저장소 조사
→ 현재 구조와 설계 의도 이해
→ 원칙과 현재 구현 비교
→ 개선 후보 분류
→ 정책 검토 또는 기능 제안
→ 승인된 변경 구현 및 검증
```

## Phase 1. Repository Engineering

저장소 자체를 에이전트가 이해하고 탐색하며 안전하게 작업할 수 있는 환경으로 분석한다.

핵심 주제:

- Repository Entry Points
- Repository Map
- Knowledge Architecture
- Progressive Disclosure
- Documentation-to-Code Consistency
- Repository Constraints

## Phase 2. Runtime Engineering

요청 수신부터 실행, 상태 기록, 실패 복구까지 런타임 경계와 생명주기를 분석한다.

핵심 주제:

- Runtime Boundary
- Request and Execution Lifecycle
- State Persistence
- Idempotency and Recovery
- Locking, Trace, Reporting
- Error Classification

## Phase 3. Workflow Engineering

워크플로우를 조건문 집합이 아니라 중단·재개 가능한 상태 전이 구조로 분석한다.

핵심 주제:

- Workflow Definition
- State Machine
- Transition Rules
- Resume and Cancellation
- Workflow Composition
- Policy-driven Routing

## Phase 4. Skill Engineering

스킬을 작고 명확하며 발견·평가 가능한 실행 단위로 분석한다.

핵심 주제:

- Skill Boundary
- Discovery and Activation
- Progressive Disclosure
- References, Scripts, Assets
- Skill Composition
- Description Optimization and Evaluation

## Phase 5. GitHub-native State and Control Plane

GitHub Issue, PR, Label, Review, Comment를 상태 저장소와 사용자 제어면으로 사용하는 구조를 분석한다.

핵심 주제:

- GitHub as Source of Truth
- Issue Taxonomy and Relationships
- Label Semantics
- PR and Review State
- Comment Commands
- Human Checkpoints and Auditability

## Phase 6. Planning and Goal Decomposition

장기 목표를 실행 가능한 작업으로 분해하고 계획과 실행 상태를 연결하는 방식을 분석한다.

핵심 주제:

- Goal Representation
- Task Decomposition
- Dependency and Priority
- Plan Validation and Revision
- Next-action Selection
- Completion Criteria

## Phase 7. Verification and Review Engineering

에이전트가 생성한 결과를 결정적으로 검증하고 독립적으로 리뷰하는 구조를 분석한다.

핵심 주제:

- Deterministic Verification
- Test and Static Analysis
- Acceptance Criteria
- Independent and Adversarial Review
- Review Evidence and Resolution

## Phase 8. Human Checkpoint and Safety

자동화와 사용자 통제 사이의 경계를 설계한다.

핵심 주제:

- Approval Boundaries
- Risk Classification
- Reversible and Irreversible Actions
- Capability Permissions
- Escalation and Safe Stop
- Resume after Approval

## Phase 9. Evaluation and Reproducibility

스킬과 워크플로우의 품질을 반복 실행과 회귀 평가로 측정한다.

핵심 주제:

- Scenario Evaluation
- Trigger Precision and Recall
- Completion and Recovery Rates
- Reproducibility
- Session Isolation
- Regression Dataset

## Phase 10. Multi-agent and Model-independent Architecture

Codex에 우선 최적화하되 공통 계약과 모델별 어댑터의 경계를 분석한다.

핵심 주제:

- Agent-neutral Contracts
- Model-specific Adapters
- Tool Capability Differences
- Prompt and Skill Portability
- Cross-model Review
- Fallback and Capability Detection

## 운영 원칙

Phase 2 이후의 Day 단위 계획은 이전 Phase 결과를 반영해 해당 Phase 시작 직전에 구체화한다. 이 로드맵은 방향을 제공하지만 현재 구현을 미리 단정하지 않는다.
