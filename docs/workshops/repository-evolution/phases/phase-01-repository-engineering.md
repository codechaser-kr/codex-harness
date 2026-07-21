# Phase 1. Repository Engineering

> [!NOTE]
> 이 문서는 Repository Evolution Workshop의 학습 및 분석 계획이다.
> 현재 프로젝트의 공식 설계나 정책을 정의하지 않는다.
> 학습 과정에서 검증되고 사용자 결정을 거친 내용만 별도의 Issue와 PR을 통해 공식 문서와 구현에 반영한다.

## Phase 목표

`codex-harness` 저장소를 단순한 코드 보관소가 아니라 에이전트가 이해하고 탐색하며 안전하게 작업할 수 있는 실행 환경으로 분석한다.

이 Phase에서는 다음을 학습하고 저장소에 적용해 본다.

- 저장소의 진입점과 탐색 경로
- 디렉터리와 문서의 책임 구조
- 지식의 분류와 Source of Truth
- Progressive Disclosure
- 문서와 코드의 일관성
- 문서화된 제약과 자동 검증 가능한 제약

Phase 종료 시점에는 저장소의 현재 구조를 근거와 함께 설명하고, 확인된 개선 후보를 다음 유형으로 분류할 수 있어야 한다.

- 즉시 수정
- 정책 검토
- 기능 제안
- 보류

## 시작 전에 읽을 문서

Phase 1을 시작할 때 다음 문서를 순서대로 읽는다.

1. `docs/workshops/repository-evolution/README.md`
2. `docs/workshops/repository-evolution/roadmap.md`
3. `docs/workshops/repository-evolution/execution-guide.md`
4. 이 문서

Day 2 이후에는 이전 Day의 결과 문서도 함께 읽는다. 단, 이전 결과를 현재 사실로 그대로 간주하지 않고 최신 저장소 상태와 다시 비교한다.

## 진행 원칙

- 현재 체크아웃된 저장소와 브랜치의 실제 상태를 우선한다.
- 과거 대화나 이전 분석을 현재 사실로 가정하지 않는다.
- 문서만 요약하지 말고 관련 코드, 스킬, 스크립트, 테스트와 실제 흐름을 추적한다.
- 저장소에서 확인한 사실, 문서에 명시된 설계, 분석자의 추론을 구분한다.
- 현재 구조의 의도와 장점을 먼저 이해한다.
- 외부 원칙을 현재 저장소에 기계적으로 적용하지 않는다.
- 명백한 오류가 아닌 변경은 사용자 결정 없이 구현하지 않는다.
- 학습 결과와 공식 설계 문서를 구분한다.
- 각 Day 결과는 새 세션에서도 이어갈 수 있도록 독립된 문서로 남긴다.

## 결과 문서 기본 위치

Phase 1의 학습 및 조사 결과는 다음 위치에 작성한다.

```text
docs/reviews/repository-evolution/phase-01/
├─ 01-repository-entry-points.md
├─ 02-repository-map.md
├─ 03-knowledge-architecture.md
├─ 04-progressive-disclosure.md
├─ 05-documentation-code-consistency.md
├─ 06-repository-constraints.md
└─ summary.md
```

이 결과 문서들은 학습 브랜치에서만 관리하며, 그대로 `main`에 병합하지 않는다. 확정된 설계와 개선만 별도 변경으로 `main`에 반영한다.

---

# Day 1. Repository Entry Points

## 학습 목표

에이전트와 사람이 저장소에 처음 진입했을 때 어떤 파일과 명령을 통해 저장소의 목적, 구조, 작업 방식을 이해하는지 파악한다.

## 학습 개념

- Repository Entry Point
- Human-facing Entry Point
- Agent-facing Entry Point
- Bootstrap Context
- Orientation Cost
- Minimal Sufficient Context

## 조사 항목

- 루트 디렉터리 구조
- `README.md`
- `AGENTS.md`
- 설치 및 초기화 스크립트
- 전역 스킬 진입점
- 주요 설계 문서 진입점
- GitHub Issue 및 PR 템플릿
- 자동화 도구와 검증 명령 진입점

## 수행 작업

1. 저장소 루트의 주요 파일과 디렉터리를 조사한다.
2. 저장소가 스스로 설명하는 목적과 실제 구성의 관계를 확인한다.
3. 사람이 처음 읽어야 할 파일 순서를 정리한다.
4. Codex가 처음 읽어야 할 파일 순서를 정리한다.
5. 사람과 에이전트의 진입 경로가 같아야 하는지 분석한다.
6. 잘못된 링크, 오래된 경로, 중복된 안내, 누락된 안내를 찾는다.
7. 초기 진입 시 불필요하게 많은 정보를 읽어야 하는지 확인한다.
8. 현재 진입 구조의 장점과 개선 후보를 구분한다.

## 결과물

```text
docs/reviews/repository-evolution/phase-01/01-repository-entry-points.md
```

## 완료 조건

- 주요 진입점이 모두 식별된다.
- 각 진입점의 대상과 책임이 설명된다.
- 사람과 에이전트의 권장 탐색 순서가 제시된다.
- 중복, 누락, 불일치가 파일 경로 근거와 함께 기록된다.
- 다음 Day에 필요한 선행 정보가 정리된다.

---

# Day 2. Repository Map

## 학습 목표

에이전트가 저장소 전체를 무작정 탐색하지 않고 작업 목적에 따라 필요한 영역으로 이동할 수 있는 구조인지 검토한다.

## 학습 개념

- Repository Map
- Information Architecture
- Directory Responsibility
- Navigation Path
- Generated versus Source Assets
- Search Space Reduction

## 조사 항목

- 주요 디렉터리의 책임
- 코드, 문서, 스킬, 평가, 도구, 테스트의 경계
- 소스 파일과 배포 파일의 관계
- 생성 산출물과 원본 파일의 구분
- 메타 저장소와 타겟 프로젝트의 경계
- 작업 유형별 탐색 경로

## 수행 작업

1. 주요 디렉터리의 목적을 한 문장으로 정의한다.
2. 각 디렉터리의 입력, 출력, 의존 관계를 조사한다.
3. 동일한 책임이 여러 위치에 중복되는지 찾는다.
4. 원본, 배포본, 생성물 사이의 관계를 정리한다.
5. 다음 작업 유형별로 읽어야 할 경로를 제시한다.
   - 하네스 생성 기준 변경
   - GitHub Workflow Engine 변경
   - 전역 스킬 수정
   - 설치 스크립트 변경
   - 품질 평가 수행
   - 문서 회귀 검증
6. 별도의 Repository Map이 필요한지 판단한다.
7. 필요하다면 최소 형태와 유지관리 책임을 제안한다.

## 이전 Day 입력

```text
docs/reviews/repository-evolution/phase-01/01-repository-entry-points.md
```

## 결과물

```text
docs/reviews/repository-evolution/phase-01/02-repository-map.md
```

## 완료 조건

- 주요 디렉터리의 책임이 설명된다.
- 작업 유형별 탐색 경로가 정의된다.
- 역할 충돌이나 잘못된 파일 배치가 식별된다.
- Repository Map 도입 또는 개선 필요 여부가 근거와 함께 결정된다.

---

# Day 3. Knowledge Architecture

## 학습 목표

저장소의 요구사항, 정책, 설계, 실행 지침, 평가 기준과 운영 지식이 어떻게 분류되고 연결되는지 분석한다.

## 학습 개념

- Knowledge Architecture
- Source of Truth
- Canonical and Derived Documents
- Decision Record
- Knowledge Duplication
- Documentation Dependency

## 조사 항목

- 요구사항 문서
- 정책 및 설계 문서
- 스킬의 `SKILL.md`와 `references/`
- 실행 및 설치 지침
- 품질 평가 기준
- 테스트 및 회귀 점검 문서
- GitHub Issue와 PR에 남은 결정
- 동일 개념을 설명하는 여러 문서

## 수행 작업

1. 문서를 목적별로 분류한다.
2. 공식 설계, 실행 지침, 평가 기준, 학습 기록을 구분한다.
3. 각 주요 개념의 Source of Truth 후보를 찾는다.
4. 정본 문서와 파생 문서를 구분한다.
5. 동일한 규칙이 여러 문서에 중복되는지 확인한다.
6. 문서 간 링크와 참조 방향을 분석한다.
7. 하나의 변경이 어떤 문서들을 함께 수정하게 만드는지 추적한다.
8. 코드와 문서가 충돌할 때 무엇을 우선해야 하는지 현재 정책을 조사한다.
9. 지식 구조의 강점과 개선 후보를 정리한다.

## 이전 Day 입력

```text
docs/reviews/repository-evolution/phase-01/01-repository-entry-points.md
docs/reviews/repository-evolution/phase-01/02-repository-map.md
```

## 결과물

```text
docs/reviews/repository-evolution/phase-01/03-knowledge-architecture.md
```

## 완료 조건

- 주요 문서 유형과 책임이 설명된다.
- 주요 개념별 Source of Truth가 식별되거나 불명확한 점이 기록된다.
- 지식 중복과 불일치가 근거와 함께 정리된다.
- 문서 변경 의존성이 설명된다.

---

# Day 4. Progressive Disclosure

## 학습 목표

에이전트가 처음부터 모든 정보를 읽지 않고 현재 작업에 필요한 정보를 단계적으로 발견할 수 있는지 검토한다.

## 학습 개념

- Progressive Disclosure
- Context Budget
- Discovery Layer
- Activation Layer
- Just-in-time Knowledge
- Information Overexposure
- Late Discovery Risk

## 조사 항목

- 루트 안내 문서의 정보량
- `SKILL.md`와 `references/`의 역할 분리
- 상세 문서로의 링크 구조
- 작업 유형별 문서 접근 경로
- 필수 정보와 선택 정보의 구분
- 중첩 참조의 깊이
- 중요한 제약이 너무 늦게 발견되는지 여부

## 수행 작업

다음 시나리오를 포함해 세 개 이상의 작업 흐름을 선정한다.

- 새로운 기능 제안
- 정책 검토
- 기능 변경 계획
- 결함 원인 분석
- PR 생성과 리뷰
- 중단된 작업 재개
- 타겟 프로젝트용 하네스 생성

각 시나리오마다 다음을 수행한다.

1. 최초 요청부터 필요한 파일을 읽는 순서를 추적한다.
2. 각 단계에서 왜 해당 정보가 필요한지 설명한다.
3. 너무 일찍 읽히는 불필요한 정보를 찾는다.
4. 너무 늦게 발견되어 오류를 유발할 정보를 찾는다.
5. 상위 진입 문서와 상세 참조 문서의 책임을 비교한다.
6. Progressive Disclosure를 적용했을 때의 기대 효과와 유지 비용을 분석한다.

## 이전 Day 입력

```text
docs/reviews/repository-evolution/phase-01/01-repository-entry-points.md
docs/reviews/repository-evolution/phase-01/02-repository-map.md
docs/reviews/repository-evolution/phase-01/03-knowledge-architecture.md
```

## 결과물

```text
docs/reviews/repository-evolution/phase-01/04-progressive-disclosure.md
```

## 완료 조건

- 주요 시나리오별 정보 탐색 경로가 기록된다.
- 정보 과다 노출과 정보 발견 지연이 구분된다.
- 개선 후보가 효과, 비용, 우선순위와 함께 정리된다.

---

# Day 5. Documentation-to-Code Consistency

## 학습 목표

문서가 설명하는 파일, 명령, 스킬, 상태와 실제 코드 및 동작이 일치하는지 검증한다.

## 학습 개념

- Documentation Drift
- Executable Documentation
- Contract Consistency
- Traceability
- Stale Reference
- Undocumented Capability

## 조사 항목

- 설치 및 제거 명령
- 전역 스킬 경로
- 스킬 의존성
- 설정 파일과 상태 파일
- Workflow Engine 흐름
- 외부 의존 스킬
- 품질 검증 및 회귀 점검 명령
- README와 상세 reference 문서

## 수행 작업

1. 문서에 등장하는 명령을 수집한다.
2. 명령과 스크립트가 실제로 존재하는지 확인한다.
3. 문서의 옵션, 입력, 출력 설명이 실제 동작과 일치하는지 검증한다.
4. 문서에 등장하는 파일 경로와 설치 대상 경로를 검증한다.
5. 이름이 변경되거나 삭제된 개념이 남아 있는지 확인한다.
6. 코드와 스킬에는 있으나 문서화되지 않은 주요 기능을 찾는다.
7. 같은 동작을 서로 다르게 설명하는 문서를 찾는다.
8. 명백한 문서 오류와 정책 판단이 필요한 설계 불일치를 구분한다.

## 이전 Day 입력

Phase 1의 Day 1~4 결과 문서를 읽는다.

## 결과물

```text
docs/reviews/repository-evolution/phase-01/05-documentation-code-consistency.md
```

## 완료 조건

- 명령, 경로, 개념의 불일치가 근거와 함께 목록화된다.
- 명백한 오류와 설계 불일치가 분리된다.
- 코드에만 존재하는 주요 기능이 식별된다.
- 자동 검증 가능한 항목이 정리된다.

---

# Day 6. Repository Constraints

## 학습 목표

에이전트가 저장소의 구조와 정책을 위반하지 않도록 하는 제약이 문서뿐 아니라 검증 가능한 형태로 존재하는지 분석한다.

## 학습 개념

- Architectural Constraint
- Policy as Code
- Structural Validation
- Schema Validation
- Guardrail
- Invariant
- Fitness Function

## 조사 항목

- 디렉터리 경계
- 파일과 스킬 명명 규칙
- `SKILL.md` 구조 규칙
- 원본과 배포본의 동기화 규칙
- 설치 대상 및 의존성 규칙
- 문서 구조와 참조 규칙
- 평가 파일과 상태 파일 형식
- 테스트, 체크리스트, doctor 또는 verify 역할
- PR 완료 조건

## 수행 작업

1. 현재 저장소에서 지켜야 하는 명시적·암묵적 규칙을 수집한다.
2. 문서에만 존재하는 규칙과 자동 검증되는 규칙을 구분한다.
3. 중요한 규칙 중 자동 검증되지 않는 항목을 찾는다.
4. 기존 스크립트, 테스트, 체크리스트와 평가 기준이 어떤 제약을 검증하는지 정리한다.
5. 검증이 중복되거나 서로 모순되는 지점을 찾는다.
6. 자동화할 가치가 있는 제약을 효과와 구현 비용으로 분류한다.
7. 최소 범위의 검증 개선 후보를 제안한다.

## 이전 Day 입력

Phase 1의 Day 1~5 결과 문서를 읽는다.

## 결과물

```text
docs/reviews/repository-evolution/phase-01/06-repository-constraints.md
```

## 완료 조건

- 저장소의 주요 제약이 목록화된다.
- 문서 기반 제약과 자동 검증 제약이 구분된다.
- 검증 공백과 중복이 식별된다.
- 자동화 후보가 우선순위와 함께 정리된다.

---

# Day 7. Phase 1 Synthesis

## 학습 목표

Day 1~6의 결과를 통합하여 Repository Engineering 관점의 현재 상태, 강점, 핵심 문제와 개선 우선순위를 정리한다.

## 학습 개념

- Synthesis
- Root Cause Analysis
- Target State
- Improvement Portfolio
- Dependency Ordering
- Phase Exit Criteria

## 수행 작업

1. Day 1~6 결과 문서를 모두 검토한다.
2. 중복된 발견 사항을 통합한다.
3. 증상과 근본 원인을 구분한다.
4. 현재 구조의 강점을 보존해야 할 이유를 정리한다.
5. 목표 구조를 과도한 선행 설계 없이 설명한다.
6. 개선 후보를 다음 유형으로 분류한다.
   - 즉시 수정
   - 정책 검토
   - 기능 제안
   - 보류
7. 각 개선 후보의 근거, 기대 효과, 위험과 선행 조건을 기록한다.
8. 개선 후보 간 의존성과 권장 순서를 정리한다.
9. `main`에 반영할 항목과 학습 브랜치에만 남길 항목을 구분한다.
10. Phase 2 Runtime Engineering 계획을 작성하기 전에 알아야 할 선행 조건을 정리한다.

## 입력 문서

```text
docs/reviews/repository-evolution/phase-01/01-repository-entry-points.md
docs/reviews/repository-evolution/phase-01/02-repository-map.md
docs/reviews/repository-evolution/phase-01/03-knowledge-architecture.md
docs/reviews/repository-evolution/phase-01/04-progressive-disclosure.md
docs/reviews/repository-evolution/phase-01/05-documentation-code-consistency.md
docs/reviews/repository-evolution/phase-01/06-repository-constraints.md
```

## 결과물

```text
docs/reviews/repository-evolution/phase-01/summary.md
```

## 요약 문서 권장 구조

```markdown
# Phase 1 Repository Engineering Summary

## 조사 범위

## 현재 구조 요약

## 확인된 강점

## 핵심 문제

## 근본 원인

## 목표 방향

## 즉시 수정 후보

## 정책 검토 후보

## 기능 제안 후보

## 보류 항목

## 우선순위와 의존성

## main 반영 대상

## 학습 브랜치 유지 대상

## Phase 2 선행 조건
```

## 완료 조건

- Phase 1의 조사 결과가 하나의 문서로 통합된다.
- 강점, 문제, 근본 원인이 구분된다.
- 모든 개선 후보의 처리 유형이 결정된다.
- `main` 반영 대상과 학습 전용 기록이 분리된다.
- Phase 2 계획을 작성하기 위한 선행 조건이 명확하다.

---

# Codex CLI 실행 방법

각 Day를 시작할 때 `execution-guide.md`의 기본 프롬프트를 사용하되 다음 문서를 명시적으로 읽도록 한다.

## Phase 1 최초 실행

```text
다음 문서를 먼저 읽으세요.

1. docs/workshops/repository-evolution/README.md
2. docs/workshops/repository-evolution/roadmap.md
3. docs/workshops/repository-evolution/execution-guide.md
4. docs/workshops/repository-evolution/phases/phase-01-repository-engineering.md

이번 작업은 Phase 1 Repository Engineering의 Day 1입니다.
공통 실행 원칙은 execution-guide.md를 따르고,
구체적인 학습 목표, 조사 항목, 수행 작업, 결과물과 완료 조건은
Phase 1 문서의 Day 1 정의를 따르세요.
```

## Day 2 이후

위 문서에 더해 이전 Day 결과 문서를 읽도록 지정한다.

```text
이전 Day의 결과를 참고하되 현재 사실로 그대로 가정하지 말고,
최신 저장소 상태와 다시 비교하세요.
```

## Phase 종료 후

Phase 1의 공식 반영 대상이 `main`에 병합되면 다음 순서로 진행한다.

```text
main 최신화
→ docs/repository-evolution-workshop 브랜치를 최신 main 기준으로 갱신
→ Phase 1 결과와 최신 저장소를 함께 검토
→ Phase 2 상세 계획 작성
```
