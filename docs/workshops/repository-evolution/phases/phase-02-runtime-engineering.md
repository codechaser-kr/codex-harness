# Phase 2. Runtime Engineering

> [!NOTE]
> 이 문서는 Repository Evolution Workshop의 학습 및 분석 계획이다.
> 현재 프로젝트의 공식 설계나 정책을 정의하지 않는다.
> 학습 과정에서 검증되고 사용자 결정을 거친 내용만 별도의 Issue와 PR을 통해 공식 문서와 구현에 반영한다.

## Phase 목표

`codex-harness`가 배포하는 두 실행 체계인 Harness와 GitHub Workflow Engine의 실제 실행 경계와 생명주기를 최신 저장소 기준으로 분석한다.

이 Phase는 새로운 범용 런타임을 만들거나 Codex의 스킬 실행 기능을 대체하려는 과정이 아니다. 현재 저장소에서 요청이 어떻게 진입하고, 어떤 문서·계약·코드가 활성화되며, 상태와 실패가 어떻게 처리되고, 중단 후 어디에서 재개되는지를 관측하고 검증하는 과정이다.

Phase 1에서 확인한 다음 사실을 출발점으로 삼는다.

- 이 저장소는 일반 애플리케이션보다 Harness와 GitHub Workflow Engine이라는 두 실행 체계를 배포하는 메타 저장소에 가깝다.
- 두 실행 체계는 지식의 성격과 검증 가능성이 다르다.
- GitHub Workflow Engine은 구조화된 상태와 선언형 Definition을 결정론적으로 평가한다.
- Harness는 타겟 프로젝트의 의미, 역할 적합성, 실패 비용을 다루므로 사용자 판단이 더 많이 필요하다.
- Harness의 discovery와 activation 경계는 아직 실제 실행 관측으로 충분히 검증되지 않았다.
- 두 실행 체계를 하나의 중앙 런타임, 공통 schema 또는 동일한 검증 방식으로 합치는 것은 현재 목표가 아니다.

Phase 종료 시점에는 다음 질문에 근거와 함께 답할 수 있어야 한다.

- Harness와 GitHub Workflow Engine 각각의 런타임 경계는 어디인가?
- Codex가 담당하는 실행 책임과 저장소가 제공하는 책임은 어떻게 나뉘는가?
- 요청부터 결과 보고까지 실제 생명주기는 어떻게 이어지는가?
- 어떤 상태가 GitHub, 타겟 프로젝트 파일, 로컬 실행 컨텍스트에 존재하는가?
- 같은 요청을 반복하거나 중단 후 재개할 때 안전한가?
- 실패는 어떻게 분류되고 어느 지점에서 fail-closed 또는 사용자 확인으로 전환되는가?
- 관측·로그·보고가 실제 문제 진단과 재개에 충분한가?
- 현재 구조에서 개선이 필요한 부분과 의도적으로 유지해야 할 차이는 무엇인가?

## 시작 전에 읽을 문서

Phase 2를 시작할 때 다음 문서를 순서대로 읽는다.

1. `docs/workshops/repository-evolution/README.md`
2. `docs/workshops/repository-evolution/roadmap.md`
3. `docs/workshops/repository-evolution/execution-guide.md`
4. `docs/reviews/repository-evolution/phase-01/summary.md`
5. 이 문서

Day 2 이후에는 이전 Day의 결과 문서도 함께 읽는다. 단, 이전 결과를 현재 사실로 그대로 간주하지 않고 최신 저장소 상태와 다시 비교한다.

## 진행 원칙

- 현재 체크아웃된 저장소와 브랜치의 실제 상태를 우선한다.
- Phase 1의 결론은 출발 가설이지 변경 요구사항이 아니다.
- Harness와 GitHub Workflow Engine을 처음부터 같은 구조로 설명하려 하지 않는다.
- Codex 자체의 스킬 탐색·활성화·도구 실행과 저장소가 제공하는 계약을 구분한다.
- 문서만 요약하지 말고 실제 스킬, reference, Definition, adapter, validator, evaluator, 설정, 테스트와 실행 흐름을 추적한다.
- 저장소에서 확인한 사실, 문서에 명시된 설계, 분석자의 추론을 구분한다.
- 새로운 상태 저장소, 중앙 registry, 장기 실행 daemon 또는 별도 런타임 구현을 전제하지 않는다.
- 실제 문제를 입증하기 전에 파일 길이, 문서 수, 단계 수만으로 복잡성을 판단하지 않는다.
- 결정론적으로 검증 가능한 영역과 사용자 의미 판단이 필요한 영역을 분리한다.
- 명백한 오류가 아닌 변경은 사용자 결정 없이 구현하지 않는다.
- 학습 결과와 공식 설계 문서를 구분한다.
- 각 Day 결과는 새 세션에서도 이어갈 수 있도록 독립된 문서로 남긴다.

## 결과 문서 기본 위치

Phase 2의 학습 및 조사 결과는 다음 위치에 작성한다.

```text
docs/reviews/repository-evolution/phase-02/
├─ 01-runtime-boundaries.md
├─ 02-request-execution-lifecycle.md
├─ 03-discovery-activation-observation.md
├─ 04-state-and-persistence.md
├─ 05-idempotency-resume-recovery.md
├─ 06-failure-trace-reporting.md
└─ summary.md
```

이 결과 문서들은 학습 브랜치에서만 관리하며 그대로 `main`에 병합하지 않는다. 확정된 설계와 개선만 별도 Issue, 변경 브랜치, PR을 통해 `main`에 반영한다.

---

# Day 1. Runtime Boundaries

## 학습 목표

Harness, GitHub Workflow Engine, Codex, GitHub, 타겟 프로젝트 사이의 실행 책임과 소유 경계를 구분한다.

## 학습 개념

- Runtime Boundary
- Host Runtime and Guest Contract
- Control Plane and Execution Plane
- Orchestration Boundary
- Deterministic and Semantic Responsibility
- Source Package, Installed Copy, Target Asset

## 조사 항목

- Codex가 제공하는 스킬 탐색, 활성화, 도구 실행 기능
- `.codex-dist/skills/harness/SKILL.md`
- Harness의 `references/`와 Phase 실행 계약
- `.codex-dist/skills/github-workflow-engine/SKILL.md`
- Workflow Definition, adapter, validator, evaluator
- thin skill과 외부 의존 스킬
- GitHub Issue, PR, review thread의 역할
- `.workflow-engine/settings.json`과 타겟 프로젝트 생성물
- 설치 source, 설치된 전역 copy, 타겟 프로젝트 자산의 차이

## 수행 작업

1. Harness 실행에 참여하는 구성 요소를 모두 식별한다.
2. GitHub Workflow Engine 실행에 참여하는 구성 요소를 모두 식별한다.
3. 각 구성 요소의 입력, 출력, 상태, 실패 책임을 정리한다.
4. Codex가 수행하는 책임과 저장소 문서·코드가 수행하는 책임을 분리한다.
5. Harness와 Workflow Engine 사이에서 공유되는 책임과 독립적인 책임을 구분한다.
6. 메타 저장소, 설치된 전역 스킬, 타겟 프로젝트의 경계를 실제 경로로 설명한다.
7. 경계가 중복되거나 소유자가 불명확한 부분을 찾는다.
8. 중앙 런타임이 필요한지 판단하지 말고 현재 분산 경계가 실제로 문제를 만드는지 먼저 검증한다.

## 결과물

```text
docs/reviews/repository-evolution/phase-02/01-runtime-boundaries.md
```

## 완료 조건

- 두 실행 체계의 경계가 각각 설명된다.
- Codex, 저장소, GitHub, 타겟 프로젝트의 책임이 구분된다.
- source, installed copy, generated asset가 혼동 없이 정리된다.
- 소유권 충돌과 의도적인 차이가 구분된다.
- 다음 Day에서 추적할 대표 실행 시나리오가 선정된다.

---

# Day 2. Request and Execution Lifecycle

## 학습 목표

대표 요청이 들어온 순간부터 결과가 사용자와 저장소 상태에 반영될 때까지 실제 실행 생명주기를 재구성한다.

## 학습 개념

- Request Lifecycle
- Execution Lifecycle
- Entry, Dispatch, Activation, Execution, Verification, Completion
- Synchronous Boundary
- Human Decision Boundary
- Terminal and Non-terminal Outcome

## 대표 시나리오

최소한 다음 두 계열에서 각각 하나 이상의 시나리오를 선택한다.

### Harness 계열

- 타겟 프로젝트에 처음 하네스를 생성하는 요청
- 특정 Phase만 재진입하는 요청
- 기존 하네스 평가 후 개선 후보를 제안하는 요청
- 사용자의 결정이 필요한 지점에서 중단되는 요청

### GitHub Workflow Engine 계열

- 기능제안 이슈의 다음 액션 판단
- 정책검토 이후 기능변경 이슈 전환
- 기능변경 이슈의 구현 계획과 브랜치 제안
- PR 생성 이후 리뷰 실행
- 중단된 Workflow의 다음 액션 재개

## 수행 작업

1. 각 시나리오의 최초 사용자 입력을 정의한다.
2. 최초로 활성화되는 스킬과 읽히는 핵심 계약을 찾는다.
3. 하위 스킬, reference, script, 코드 호출 순서를 추적한다.
4. 외부 상태 조회와 로컬 파일 조회 시점을 구분한다.
5. 사용자 결정이 필요한 지점과 자동 진행 가능한 지점을 표시한다.
6. 검증이 수행되는 시점과 검증 실패 후 흐름을 정리한다.
7. 성공, 보류, 실패, 안전 중단의 종료 조건을 구분한다.
8. 실제 흐름과 문서에 설명된 흐름이 일치하는지 확인한다.
9. 생명주기에서 중복 조회, 불필요한 재해석, 책임 역전이 있는지 찾는다.

## 이전 Day 입력

```text
docs/reviews/repository-evolution/phase-02/01-runtime-boundaries.md
```

## 결과물

```text
docs/reviews/repository-evolution/phase-02/02-request-execution-lifecycle.md
```

## 완료 조건

- Harness와 Workflow Engine의 대표 실행 흐름이 각각 하나 이상 재구성된다.
- 자동 진행과 사용자 결정 경계가 표시된다.
- 각 종료 상태와 결과 보고 방식이 설명된다.
- 문서와 실제 실행 계약의 차이가 근거와 함께 기록된다.

---

# Day 3. Discovery and Activation Observation

## 학습 목표

Phase 1에서 남은 핵심 가설인 Harness의 discovery와 activation 경계를 실제 시나리오와 관측 근거로 검증한다.

## 학습 개념

- Skill Discovery
- Skill Activation
- Progressive Activation
- Routing Precision
- Context Acquisition Path
- Over-activation and Under-activation
- Operational Observation

## 조사 항목

- Harness `SKILL.md`의 상위 생명주기 지침
- `reference-map.md`와 leaf reference 선택 구조
- Phase별 진입과 재진입 지침
- Workflow Engine의 상위 SKILL과 조건부 계약 활성화 방식
- thin skill의 description과 실행 계약
- 특정 요청에서 실제로 필요한 문서 범위
- 오선택을 막는 안전 불변 조건

## 수행 작업

다음 유형의 요청을 포함해 최소 네 개의 관측 시나리오를 만든다.

- Harness 최초 실행
- Harness 특정 Phase 재진입
- Harness 평가 또는 개선만 수행
- Workflow Engine의 단일 다음 액션 판단
- thin skill 직접 호출이 예상되는 구체적 요청

각 시나리오마다 다음을 수행한다.

1. 어떤 스킬이 discovery 후보가 되는지 설명한다.
2. 어떤 상위 문서와 leaf reference가 활성화되어야 하는지 예측한다.
3. 실제 Codex CLI 세션에서 읽은 파일, 실행한 명령, 선택한 경로를 가능한 범위에서 기록한다.
4. 필요 이상의 문서가 활성화되는지 확인한다.
5. 필요한 안전 계약이 누락되거나 너무 늦게 활성화되는지 확인한다.
6. 단순한 문서 길이와 실제 context 비용을 구분한다.
7. 과도한 분할이 routing 오류를 늘릴 가능성도 함께 평가한다.
8. 개선이 필요하다면 파일 분할보다 먼저 description, reference map, named section, 진입 프롬프트 개선을 검토한다.

## 이전 Day 입력

```text
docs/reviews/repository-evolution/phase-02/01-runtime-boundaries.md
docs/reviews/repository-evolution/phase-02/02-request-execution-lifecycle.md
```

## 결과물

```text
docs/reviews/repository-evolution/phase-02/03-discovery-activation-observation.md
```

## 완료 조건

- Harness discovery와 activation 가설이 관측 근거로 평가된다.
- 과활성화, 부족한 활성화, 적정 활성화가 구분된다.
- Workflow Engine과 Harness의 활성화 차이가 설명된다.
- 개선 여부가 문서 길이가 아니라 실제 오류·비용·안전 효과를 기준으로 판단된다.

---

# Day 4. State and Persistence

## 학습 목표

실행 중 사용되는 상태를 종류별로 식별하고, 각 상태의 Source of Truth와 지속 범위를 분석한다.

## 학습 개념

- Runtime State
- Persistent and Ephemeral State
- Source of Truth
- Derived State
- Checkpoint
- Configuration State
- Observation Record
- State Ownership

## 조사 항목

- GitHub Issue, PR, label, checklist, comment, review thread
- `.workflow-engine/settings.json`
- 타겟 프로젝트의 `.harness/` 문서와 평가 기록
- 생성된 `.codex/agents/`와 `.agents/skills/`
- 현재 세션의 임시 판단과 도구 결과
- 설치 source와 설치된 copy의 상태
- lock, marker, trace, report 또는 이에 준하는 파일과 계약
- 재개 시 다시 계산되는 상태와 보존되는 상태

## 수행 작업

1. 상태를 영구 상태, 설정 상태, 파생 상태, 임시 세션 상태, 관측 기록으로 분류한다.
2. 각 상태의 소유자와 Source of Truth를 정리한다.
3. 상태가 생성, 수정, 읽기, 폐기되는 시점을 추적한다.
4. 동일한 사실이 여러 위치에 중복 저장되는지 확인한다.
5. 상태 불일치가 발생할 때 어떤 근거가 우선하는지 조사한다.
6. 지연 초기화와 누락 상태 처리 방식을 확인한다.
7. 새로운 상태 저장소가 필요한지 전제하지 않고 현재 상태 모델로 재개와 감사가 가능한지 평가한다.
8. 보조 로그와 정본 상태를 혼동할 가능성이 있는지 확인한다.

## 이전 Day 입력

```text
docs/reviews/repository-evolution/phase-02/01-runtime-boundaries.md
docs/reviews/repository-evolution/phase-02/02-request-execution-lifecycle.md
docs/reviews/repository-evolution/phase-02/03-discovery-activation-observation.md
```

## 결과물

```text
docs/reviews/repository-evolution/phase-02/04-state-and-persistence.md
```

## 완료 조건

- 주요 상태가 유형, 소유자, 지속 범위와 함께 정리된다.
- GitHub 상태와 타겟 프로젝트 파일의 역할이 구분된다.
- 정본 상태와 파생·보조 기록이 구분된다.
- 상태 중복이나 불일치 위험이 근거와 함께 기록된다.

---

# Day 5. Idempotency, Resume, and Recovery

## 학습 목표

같은 요청의 반복 실행, 중단 후 재개, 부분 실패 후 복구가 현재 구조에서 안전하게 처리되는지 검증한다.

## 학습 개념

- Idempotency
- Replay Safety
- Resume Point
- Recovery Boundary
- Partial Failure
- Duplicate Prevention
- Compensating Action
- Reconciliation

## 조사 항목

- 이미 생성된 파일과 스킬의 재생성 처리
- 기존 설정과 지연 초기화
- 동일한 GitHub 상태 변경의 반복 요청
- 중단된 Workflow의 다음 액션 재계산
- 브랜치, Issue, PR, comment 중복 생성 방지
- Harness Phase 재진입
- 설치, 제거, backup, `.removed.*` 복구 흐름
- 실패 후 사용자에게 제시되는 재개 조건

## 수행 작업

최소한 다음 실패·반복 시나리오를 검증한다.

- 동일한 Harness 생성 요청을 두 번 수행
- Harness의 특정 Phase 도중 중단 후 재진입
- Workflow Engine의 동일한 다음 액션 요청 반복
- 설정 일부만 존재하는 상태에서 재실행
- 외부 의존 스킬이 없는 상태에서 중단 후 설치 뒤 재개
- 이미 존재하는 Issue, 브랜치 또는 PR과 충돌하는 요청
- 설치 또는 제거 도중 일부 단계 실패

각 시나리오마다 다음을 기록한다.

1. 최초 실행 전 상태
2. 실행 중 변경되는 상태
3. 실패 또는 중단 지점
4. 재실행 시 다시 계산되는 정보
5. 중복 방지 또는 충돌 감지 방식
6. 사용자가 수행해야 하는 복구 행동
7. 최종적으로 일관된 상태로 돌아가는지 여부

## 이전 Day 입력

```text
docs/reviews/repository-evolution/phase-02/01-runtime-boundaries.md
docs/reviews/repository-evolution/phase-02/02-request-execution-lifecycle.md
docs/reviews/repository-evolution/phase-02/03-discovery-activation-observation.md
docs/reviews/repository-evolution/phase-02/04-state-and-persistence.md
```

## 결과물

```text
docs/reviews/repository-evolution/phase-02/05-idempotency-resume-recovery.md
```

## 완료 조건

- 주요 반복·중단·복구 시나리오가 검증된다.
- 안전한 재실행과 위험한 재실행이 구분된다.
- 재개 지점과 사용자 복구 행동이 설명된다.
- 중복 생성, 부분 상태, 무한 반복 위험이 근거와 함께 기록된다.

---

# Day 6. Failure, Trace, and Reporting

## 학습 목표

실패가 어떻게 분류되고 안전하게 중단되며, 실행 근거와 결과가 문제 진단 및 재개에 충분히 남는지 분석한다.

## 학습 개념

- Error Taxonomy
- Expected and Unexpected Failure
- Fail-closed
- Diagnostic Evidence
- Traceability
- Execution Report
- Actionable Error
- Observability without Central Runtime

## 조사 항목

- 인식할 수 없는 GitHub 상태 처리
- 계약 또는 schema 검증 실패
- 설정 누락과 잘못된 설정
- 외부 의존 스킬 또는 도구 부재
- 사용자 결정 대기
- 명령 실행 실패와 파일 변경 실패
- 테스트 실패
- 로그, 평가 기록, comment, report, 도구 출력
- 오류 메시지의 재개 조건과 다음 행동 안내

## 수행 작업

1. 현재 오류 유형을 저장소 근거로 수집한다.
2. 예상 가능한 운영 실패와 구현 결함을 구분한다.
3. fail-closed, 사용자 확인, 재시도, 보류, 즉시 실패의 기준을 정리한다.
4. 오류 메시지가 원인, 영향, 해결 행동, 재개 조건을 제공하는지 확인한다.
5. 실행 근거가 GitHub, 타겟 프로젝트, 로컬 출력 중 어디에 남는지 추적한다.
6. 중앙 trace 시스템 없이도 문제를 재현하고 진단할 수 있는지 평가한다.
7. 장기 로그 저장이 필요한 문제와 일회성 도구 출력으로 충분한 문제를 구분한다.
8. 보고가 과도해 context를 늘리거나 정본 상태와 혼동되는지 확인한다.
9. 개선 후보를 메시지 개선, 계약 개선, 테스트 추가, 상태 모델 변경으로 구분한다.

## 이전 Day 입력

```text
docs/reviews/repository-evolution/phase-02/01-runtime-boundaries.md
docs/reviews/repository-evolution/phase-02/02-request-execution-lifecycle.md
docs/reviews/repository-evolution/phase-02/03-discovery-activation-observation.md
docs/reviews/repository-evolution/phase-02/04-state-and-persistence.md
docs/reviews/repository-evolution/phase-02/05-idempotency-resume-recovery.md
```

## 결과물

```text
docs/reviews/repository-evolution/phase-02/06-failure-trace-reporting.md
```

## 완료 조건

- 주요 실패 유형과 처리 방식이 정리된다.
- 안전 중단과 구현 오류가 구분된다.
- 각 오류에서 필요한 진단 근거와 재개 조건이 설명된다.
- 중앙 런타임이나 별도 trace 저장소의 필요성이 실제 근거로 평가된다.

---

# Day 7. Phase 2 Synthesis

## 학습 목표

Day 1~6의 결과를 통합해 현재 런타임 구조의 강점, 활성 문제, 수용된 한계와 개선 우선순위를 결정한다.

## 수행 작업

1. Day 1~6 결과 문서를 모두 검토한다.
2. Harness와 Workflow Engine을 각각 요약한 뒤 공통점과 차이를 정리한다.
3. Phase 1에서 제기한 discovery와 activation 가설의 결론을 기록한다.
4. 실행 경계, 상태, 반복 실행, 재개, 실패, 보고 문제를 증상과 근본 원인으로 구분한다.
5. correctness 문제와 운영 비용 문제를 구분한다.
6. 현재 구조의 의도적인 차이를 결함 목록에서 제외한다.
7. 개선 후보를 즉시 수정, 정책 검토, 기능 제안, 보류로 분류한다.
8. 중앙 runtime, registry, manifest, log store 같은 새 계층이 필요한지 근거로 판단한다.
9. 필요한 경우 GitHub Issue 초안을 작성하되 사용자 승인 없이 생성하지 않는다.
10. Phase 3 Workflow Engineering에서 이어서 검토할 질문과 선행 조건을 정리한다.
11. Phase 2에서 공식 반영된 변경이 있다면 최신 `main`과 학습 브랜치의 기준선을 다시 기록한다.

## 이전 Day 입력

```text
docs/reviews/repository-evolution/phase-02/01-runtime-boundaries.md
docs/reviews/repository-evolution/phase-02/02-request-execution-lifecycle.md
docs/reviews/repository-evolution/phase-02/03-discovery-activation-observation.md
docs/reviews/repository-evolution/phase-02/04-state-and-persistence.md
docs/reviews/repository-evolution/phase-02/05-idempotency-resume-recovery.md
docs/reviews/repository-evolution/phase-02/06-failure-trace-reporting.md
```

## 결과물

```text
docs/reviews/repository-evolution/phase-02/summary.md
```

## 요약 문서 권장 구조

```markdown
# Phase 2 Runtime Engineering Summary

## 문서 성격

## 조사 기준선

## 두 실행 체계의 런타임 경계

## 실제 실행 생명주기

## Discovery와 Activation 관측 결과

## 상태와 Source of Truth

## 반복 실행, 재개와 복구

## 실패, Trace와 보고

## 확인된 강점

## 활성 문제

## 수용된 한계

## 해소되었거나 재개하지 않을 문제

## 근본 원인

## 목표 방향

## 변경 유형 분류

### 즉시 수정

### 정책 검토

### 기능 제안

### 보류

## Phase 3 선행 조건

## 남은 질문
```

## 완료 조건

- 두 실행 체계의 런타임 경계와 차이가 근거로 설명된다.
- 요청부터 결과까지 대표 생명주기가 재구성된다.
- Harness discovery와 activation 가설에 관측 기반 결론이 내려진다.
- 상태, 반복 실행, 재개, 실패와 보고의 현재 품질이 평가된다.
- 새 런타임 계층 도입 여부가 선입견 없이 판단된다.
- 개선 후보의 처리 방식과 우선순위가 정리된다.
- Phase 3의 선행 조건이 명확해진다.

---

# Codex CLI 실행 방법

Phase 2의 각 Day를 시작할 때 `execution-guide.md`의 기본 프롬프트를 단독으로 제출하지 않는다.

다음 문서를 명시적으로 읽도록 요청한다.

```text
docs/workshops/repository-evolution/execution-guide.md
docs/workshops/repository-evolution/phases/phase-02-runtime-engineering.md
docs/reviews/repository-evolution/phase-01/summary.md
```

Day 2 이후에는 이전 Day 결과 문서도 함께 읽도록 요청한다.

예시:

```text
현재 체크아웃된 저장소와 브랜치의 최신 상태를 기준으로 작업하세요.

먼저 다음 문서를 읽으세요.

1. docs/workshops/repository-evolution/execution-guide.md
2. docs/workshops/repository-evolution/phases/phase-02-runtime-engineering.md
3. docs/reviews/repository-evolution/phase-01/summary.md
4. 이전 Day 결과 문서

이번 작업은 Phase 2 Runtime Engineering의 Day [N]입니다.

execution-guide.md의 공통 원칙과 Phase 2 문서의 Day [N]에 정의된 학습 목표,
조사 항목, 수행 작업, 결과물 경로, 완료 조건을 실행 기준으로 사용하세요.

Phase 1 결과는 출발 가설로만 사용하고 최신 코드, 스킬, reference, 설정, 테스트와
실제 실행 근거를 다시 조사하세요. Harness와 GitHub Workflow Engine을 같은 구조로
맞추는 것을 목표로 하지 말고 각각의 실행 책임과 의도적인 차이를 먼저 설명하세요.

먼저 오늘 학습할 개념과 조사 순서를 설명한 뒤 작업을 진행하세요.
```

## 학습 브랜치 운영

```text
Phase 2 학습과 결과 기록
→ docs/repository-evolution-workshop 브랜치

공식 반영 후보 발견
→ 정책 검토 또는 기능 제안
→ 사용자 결정
→ main 기준 별도 변경 브랜치와 PR

main 반영 완료
→ docs/repository-evolution-workshop 브랜치를 최신 main 기준으로 갱신
→ Phase 2 결과 문서의 기준선 갱신
→ 다음 Day 또는 Phase 3 진행
```
