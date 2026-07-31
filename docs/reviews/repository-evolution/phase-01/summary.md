# Phase 1 Repository Engineering Summary

## 문서 성격

이 문서는 Phase 1 Day 1~6의 학습·조사 결과를 2026-08-01 현재 저장소 상태에 맞춰 통합한 학습
기록이다. 공식 설계의 대체물이 아니며, 개선 후보는 사용자 결정과 별도 이슈·구현·검증을 거치기 전까지
확정된 요구사항으로 취급하지 않는다.

본문은 다음 표기를 사용한다.

- **저장소 사실**: 현재 checkout, 추적 파일, 실행 결과 또는 GitHub API에서 직접 확인한 내용
- **명시된 설계**: README, SKILL, reference, Workshop 문서에 책임이나 의도가 명시된 내용
- **종합 판단**: 위 근거를 Day 7 관점에서 연결한 해석

## 조사 범위

### 기준선

- **저장소 사실**: 현재 브랜치는 `docs/repository-evolution-workshop`, 기준 HEAD는
  `ed7cc445e7032cce8d67e8743003dd1580d528fb`이다.
- **저장소 사실**: `main`과 `origin/main`은 모두
  `80787a64670094bf40e8934e642aa6aa9474349a`이며, `main`은 현재 HEAD의 ancestor다.
- **저장소 사실**: 조사 시작 시 작업 트리는 clean이고 upstream과의 divergence는 `0/0`이다.
- **저장소 사실**: `main...HEAD`의 차이는 Repository Evolution Workshop 문서 10개뿐이며,
  배포 source, runtime 계약, 스크립트와 테스트의 차이는 없다.
- **저장소 사실**: 열린 PR은 없고 열린 이슈는 이 Phase와 별개인 이름 변경 정책 검토 #37뿐이다.

### 직접 확인한 입력과 실행

- Day 1~6 결과 문서 전체
- `README.md`, `AGENTS.md`, `docs/github-workflow-engine.md`
- `install.sh`, `uninstall.sh`, `.workflow-engine/settings.json`
- `.codex-dist/skills/harness/**`
- `.codex-dist/skills/github-workflow-engine/**`와 관련 thin skill
- `.github/ISSUE_TEMPLATE/**`, `.github/pull_request_template.md`
- Git history의 PR #101, #102, #103, #114, #115, #117, #119, #121 반영 commit
- GitHub의 현재 열린 Issue·PR과 `main` ruleset

현재 checkout에서 다음 검증을 다시 실행했다.

- Workflow Engine 집계 테스트: **115/115 통과**, 실패·취소·제외 없음
- Harness 사용자 결정 경계 테스트: **1/1 통과**
- `sh -n install.sh`, `sh -n uninstall.sh`: 통과
- 추적된 source skill 18개와 installer 목록 대조: Harness 1개, Workflow Engine 계열 17개로 일치
- install/uninstall의 독립 목록 대조: 각각 일치
- `git diff --check`: 통과

## 현재 구조 요약

이 저장소는 일반 애플리케이션보다 **두 실행 체계를 배포하는 메타 저장소**에 가깝다.

```text
사람용 진입점 README
        |
        +-- install.sh / uninstall.sh
        |       |
        |       +-- Harness 1개
        |       +-- Workflow Engine 및 보조 skill 17개
        |
        +-- .codex-dist/skills/harness
        |       +-- 타겟 프로젝트의 역할 팀과 운영 하네스를 설계·생성·평가
        |
        +-- .codex-dist/skills/github-workflow-engine
                +-- GitHub 상태 관측
                +-- 선언형 Workflow Definition 평가
                +-- thin skill을 통한 단일 작업 실행
```

- **저장소 사실**: `.codex-dist/skills`는 생성 후 버리는 build output이 아니라 설치 source다.
- **명시된 설계**: README는 메타 저장소 기여자보다 타겟 프로젝트에 하네스를 설치·사용하는 사람을
  주 독자로 삼는다.
- **명시된 설계**: `AGENTS.md`는 현재 GitHub PR review 형식만 다루며, contributor onboarding 전체를
  소유하지 않는다.
- **명시된 설계**: Harness는 프로젝트별 의미, 역할 구성, 평가 자료를 다루되 품질의 최종 판단과 변경
  범위를 사용자에게 돌려준다.
- **명시된 설계**: Workflow Engine은 Definition, adapter, validator, evaluator와 조건부 계약으로
  현재 task를 결정론적으로 계산하고 인식할 수 없는 입력에서는 fail-closed한다.
- **명시된 설계**: `.workflow-engine/settings.json`은 Workflow Engine이 독점 소유하는 타겟별 런타임
  설정이며, 필요한 필드만 지연 초기화한다. 현재 저장소의 파일은 유효한 JSON이다.
- **명시된 설계**: GitHub Issue·PR·review thread가 협업 상태의 원천이며, 별도 로그는 보조 근거다.
- **종합 판단**: 핵심 아키텍처 단위는 파일 형식이 아니라 설치 가능한 skill package와 책임별 runtime
  계약이다.

## 확인된 강점

### 1. 사용자, 메타 저장소, 타겟 프로젝트의 경계가 분명하다

README 초반에서 이 저장소가 무엇을 설치하고 무엇을 타겟 프로젝트에 생성하는지 설명한다. source,
설치된 전역 copy, 타겟 생성물과 관찰 기록을 같은 것으로 취급하지 않기 때문에 잘못된 위치를 수정하는
위험이 낮다.

### 2. 질문별 Source of Truth가 구분돼 있다

설계 이유는 설계 문서, 실행 조건은 SKILL과 runtime reference, 전이 유효성은 Definition과 코드,
협업 상태는 GitHub가 맡는다. 하나의 문서에 모든 권한을 집중시키지 않고 질문 범위별 정본을 둔 점은
오래된 Issue나 설명 문서가 runtime을 지배하는 문제를 줄인다.

### 3. Progressive Disclosure가 실행 경로에 연결돼 있다

Workflow Engine은 상위 SKILL에서 필요한 조건부 계약만 활성화하고, 큰 Definition은 모델이 직접 전부
해석하지 않고 코드가 평가한다. thin skill은 named section과 실행 계약을 가리키는 포인터 역할을 한다.
따라서 파일 수나 줄 수와 실제 context 비용을 분리할 수 있다.

### 4. 결정론적 영역의 제약이 강하다

Definition의 구조·의미, 단일 전이, adapter 입력, 재개, 이슈 전환 순서, agent lifecycle, 설치 배포본
일치가 테스트로 보호된다. 이번 Day의 115개 Workflow Engine 테스트도 모두 통과했다.

### 5. 의미 판단과 사용자 권한을 자동화에서 분리한다

Harness는 관찰, 불확실성, 선택지 영향과 결정론적 pass/fail을 제공하지만 결과의 우열이나 실제 변경
범위를 대신 결정하지 않는다. 이는 Markdown 기반 프로젝트별 의미를 억지로 기계화해 생길 오탐과
과도한 변경을 막는다.

### 6. 설치와 제거가 독립적이고 복구 가능하다

Harness와 Workflow Engine은 별도로 설치·제거할 수 있고, 기존 설치본은 backup, 제거본은
`.removed.*`로 이동한다. install/uninstall 목록을 공통 manifest로 합치지 않으면서도 각 실행의 독립성을
유지한다.

### 7. GitHub 보호와 로컬 검증의 역할이 구분돼 있다

현재 `main` ruleset은 삭제와 non-fast-forward를 막고 linear history, PR, squash merge, review thread
resolution을 요구한다. required status check는 두지 않는다는 Day 6 정책도 현재 상태와 일치한다.

## 핵심 문제

### 활성 문제 1. Harness의 discovery와 activation 경계는 아직 실측되지 않았다

- **저장소 사실**: Harness `SKILL.md`는 423줄, `reference-map.md`는 320줄이고 21개 reference를
  연결한다.
- **명시된 설계**: 상위 SKILL은 Phase 0~7의 전체 생명주기와 안전 불변 조건을 조율하고,
  `reference-map.md`는 문제 축별 leaf 선택을 돕는다.
- **종합 판단**: 긴 문서라는 사실만으로 결함은 아니다. 다만 특정 Phase 재진입에서도 상위 절차와 상세
  routing을 얼마나 읽는지, 그 비용이 오선택 방지 효과보다 큰지는 아직 실행 관측으로 확인되지 않았다.

이는 현재 확인된 correctness bug가 아니라 Phase 2에서 검증해야 할 **운영 가설**이다.

### 수용된 한계 1. contributor 진입점은 아직 좁다

README는 사용자용이고 `AGENTS.md`는 review 형식만 제공한다. contributor용 전체 map, 18개 skill
inventory 정본, 통합 verify 진입점은 없다. 그러나 현재 제품 우선순위가 Runtime Engineering이고
기여자 지원 시점이 아직 아니라는 사용자 결정과 일치하므로 현재 사용자 흐름의 결함으로 보지 않는다.

### 수용된 한계 2. repository 전체 제약은 하나의 중앙 gate로 모이지 않는다

installer 목록, Workflow Engine 테스트, Harness 의미 검토, 문서 checklist와 GitHub ruleset이 각자
제약을 지킨다. 중앙 manifest, executor allowlist, required status check는 의도적으로 도입하지 않았다.
검증 책임이 분산돼 있다는 운영 비용은 남지만, 현재는 package 독립성과 의미 판단 유연성을 보존하는
선택이다.

### 해소된 문제를 재개하지 않는다

다음 항목은 현재 문제 목록에서 제외한다.

- `humanize-korean` 실행 참조
- Workflow 재개 시 structured contract의 늦은 활성화
- README의 잘못된 uninstall 범위
- legacy marker comment 호환 계약
- Team Spec contract와 schema의 책임 중복
- Harness가 Workflow Engine의 template·settings 초기화를 소유하던 경계
- 설정 누락·인식 불가 상태 처리의 불명확성
- Harness가 사용자 대신 품질과 변경 범위를 결정할 가능성

## 근본 원인

### 1. 두 runtime의 지식 성격이 다르다

Workflow Engine은 유한 상태와 구조화 입력을 다루므로 강한 코드 검증이 가능하다. Harness는 타겟
프로젝트의 의미, 역할 적합성, 실패 비용을 다루므로 사용자 판단이 필요하다. 두 영역을 같은 schema,
중앙 registry 또는 동일한 테스트 강도로 맞추려 하면 현재 장점을 잃는다.

### 2. 전체 생명주기 안전과 최소 context가 긴장 관계에 있다

Harness 상위 문서는 재진입과 단계 간 불변 조건을 한곳에서 보장하려 한다. 이 책임은 안전에 유리하지만
단일 Phase 실행의 초기 context를 늘릴 수 있다. 따라서 단순한 파일 분할이 아니라 실제 활성화 경로와
오선택 사례를 함께 봐야 한다.

### 3. 저장소의 현재 성숙도와 주 독자가 기여자 문서보다 runtime 품질을 앞세운다

contributor map과 inventory가 없는 원인은 문서 작성 능력 부족이 아니라 우선순위 결정이다. 제품과
지원 범위가 안정되기 전에 기여자용 정본을 만들면 사용자용 README와 새로운 동기화 책임만 늘 수 있다.

### 4. 최근 빠른 책임 재배치가 과거의 불일치를 만들었다

Day 3~6에서 발견한 일부 문제는 기능 자체보다 Harness와 Workflow Engine 사이 소유권이 이동하는 동안
설명, reference, 설정 경로가 함께 이동하지 못한 데서 생겼다. 현재는 PR #115, #117, #119, #121과
회귀 테스트로 주요 경계를 명시했으므로, 원인을 이유로 다시 중앙 소유권을 만들 필요는 없다.

## 목표 방향

Phase 1의 목표 상태는 새 계층이나 중앙 manifest를 더하는 구조가 아니다. 다음 방향을 유지하면서 Phase 2의
실행 근거로 필요한 변경만 결정한다.

1. 사용자용 README, package별 SKILL, leaf contract, 실행 코드와 GitHub 상태의 책임을 유지한다.
2. Harness와 Workflow Engine을 독립 설치·초기화 가능한 runtime으로 유지한다.
3. 결정론적 제약은 코드로, 프로젝트별 의미와 변경 범위는 근거를 받은 사용자가 판단한다.
4. 상위 문서는 안전 불변 조건과 routing만 소유하고, 상세 지식은 실제 작업에 필요한 시점에 활성화한다.
5. 문서 크기나 일반 원칙이 아니라 실제 request lifecycle, context 노출, 실패와 재개 사례로 구조 변경을
   정당화한다.
6. 공식 설계 변경은 학습 보고서에서 바로 수행하지 않고 정책 검토 또는 기능 제안과 사용자 결정을 거친다.

## 즉시 수정 후보

**현재 남은 후보 없음.**

현재 checkout에서 경로 오류, 잘못된 JSON, installer 불일치, 테스트 실패, 열린 관련 회귀를 확인하지
못했다. 과거 즉시 수정 항목은 모두 `main`에 반영됐다. 새로운 근거 없이 문서나 runtime을 더 수정하면
확정된 책임 경계를 다시 흔들 위험이 더 크다.

## 정책 검토 후보

### P-1. Harness 상위 lifecycle과 discovery map의 최소 책임 경계

| 항목 | 내용 |
| --- | --- |
| 근거 | Day 4의 네 시나리오에서 Harness 경로만 상대적으로 큰 discovery layer를 가졌음 |
| 기대 효과 | Phase 재진입 시 불필요한 context를 줄이고 필요한 leaf에 더 빨리 도달 |
| 위험 | 생명주기 불변 조건을 너무 늦게 발견하거나 SKILL과 map에 routing이 중복될 수 있음 |
| 선행 조건 | Phase 2에서 실제 요청 유형별 읽기 경로, 오선택, 재진입 실패와 context 비용을 관측 |
| 현재 처리 | 정책 검토의 주제는 유지하되, 관측 전 문서 재배치나 공식 경계 확정은 보류 |

이 후보는 `SKILL.md`를 줄여야 한다는 결론이 아니다. 어느 정보가 항상 필요한 불변 조건이고 어느 정보가
Phase별 leaf인지 결정하는 문제다.

## 기능 제안 후보

### F-1. Harness routing·reference 경계 회귀 검사

| 항목 | 내용 |
| --- | --- |
| 근거 | Workflow Engine은 activation link와 named section을 자동 검증하지만 Harness는 사용자 결정 경계 1개만 자동 검증함 |
| 기대 효과 | 정책 확정 후 stale reference, 필수 bundle 누락, routing 단절을 조기에 발견 |
| 위험 | 아직 결정하지 않은 문서 배치를 테스트가 먼저 고정하거나 Markdown 의미를 과도하게 경직할 수 있음 |
| 선행 조건 | P-1에서 상위 lifecycle, map, Phase별 leaf의 공식 책임을 먼저 결정 |
| 현재 처리 | 기능 이슈를 만들지 않고 의존 후보로 유지 |

중앙 repository consistency test, executor registry, 공통 installer manifest와 required status check는 이
후보에 포함하지 않는다. 이들은 Day 6에서 현재 설계·정책을 유지하기로 결정한 별도 항목이다.

## 보류 항목

| 항목 | 보류 이유 | 재검토 조건 |
| --- | --- | --- |
| contributor용 Repository Map·onboarding·통합 verify | 현재 주 독자와 Runtime Engineering 우선순위에 맞지 않음 | 실제 외부 기여자 지원을 시작할 때 |
| README의 상세 skill inventory 이관 | 이관 받을 contributor/agent 문서가 없음 | 해당 문서의 소유권이 정해질 때 |
| installer의 fork/ref override 공개 | 내부 escape hatch 이상의 사용자 수요가 확인되지 않음 | 지원 사례와 호환성 책임이 생길 때 |
| `.harness` 자산의 물리적 재배치 | 하위 경계가 있고 이동·링크 회귀 비용이 더 큼 | 관측된 탐색 실패가 반복될 때 |
| 별도 ADR·Decision Record index | 현재 설계 문서와 GitHub history의 역할이 충분함 | 결정 검색 실패가 반복될 때 |
| Markdown 의미 규칙 전면 자동화 | 오탐과 표현 경직 위험이 큼 | 반복 가능한 결정론적 실패 패턴이 생길 때 |
| 중앙 executor registry·allowlist | workflow별 exact contract와 registry 제거 의도에 어긋남 | 여러 workflow에서 동일 drift가 반복될 때 |
| 중앙 repository-level constraint test | 독립 installer 목록 관리와 package별 검증 정책을 유지하기로 결정함 | 현재 검증 경계에서 반복 누락이 확인될 때 |
| GitHub required status check | 현재 PR ruleset과 로컬·agent 검증을 유지하기로 결정함 | merge 회귀나 협업 규모 증가로 강제가 필요해질 때 |
| `github-templates.md` 추가 분할 | 현재 규모에서 반복 context·유지보수 문제가 확인되지 않음 | 유형별 로딩 비용이 실제 병목일 때 |

## 우선순위와 의존성

```text
현재 main 기준선 고정
        |
        v
Phase 2에서 runtime boundary와 lifecycle 관측
        |
        +-- Harness context·routing 문제가 확인되지 않음
        |       `-- P-1, F-1 계속 보류
        |
        `-- 반복되는 과다 노출·오선택·재진입 실패 확인
                |
                v
             P-1 정책 경계 결정
                |
                v
             승인된 문서 재배치
                |
                v
             F-1 회귀 검사 제안·구현
```

권장 순서는 다음과 같다.

1. **P0 — 현재 기준선 보존**: 완료된 소유권과 사용자 결정 경계를 Phase 2 입력으로 사용한다.
2. **P1 — Runtime Engineering 관측**: 요청 수신, 실행 주체 선택, 상태 기록, 중단·재개를 실제 경로로
   추적한다.
3. **P2 — 조건부 정책 검토 P-1**: 관측 근거가 있을 때만 Harness 상위/leaf 책임을 결정한다.
4. **P3 — 조건부 기능 제안 F-1**: 확정된 경계를 보호할 최소 테스트만 제안한다.
5. **장기 보류**: contributor 지원과 중앙화 후보는 별도 수요가 생길 때 다시 평가한다.

## main 반영 대상

### 이미 반영 완료

| PR | 반영 commit | 현재 기준에 남긴 결과 |
| --- | --- | --- |
| #101 | `80cdcd0` | 저장소와 무관한 `humanize-korean` 참조 제거 |
| #102 | `a48f80d` | 중단·재개 시 structured execution contract 활성화 보강 |
| #103 | `3927213` | README의 uninstall 범위와 recoverable backup 설명 정정 |
| #114 | `8c29eb5` | legacy marker comment 호환 제거와 review thread 기준 정렬 |
| #115 | `9f6d2f3` | Team Spec contract와 schema의 책임 경계 명시 |
| #117 | `ed644af` | Harness·Workflow Engine 독립 설치와 template 초기화 소유권 이전 |
| #119 | `db40b1c` | `.workflow-engine/settings.json` 정본, 지연 초기화, fail-closed 확정 |
| #121 | `80787a6` | Harness 품질 판단과 변경 범위를 사용자 권한으로 확정 |

### 현재 새로 반영할 항목

없다. P-1과 F-1은 각각 Phase 2 관측과 사용자 결정이 선행돼야 하며, 이 종합문서만으로 공식 자산을
변경하지 않는다.

## 학습 브랜치 유지 대상

다음은 공식 runtime 계약이 아니라 탐색 과정, 근거, 바뀐 판단과 후속 질문을 보존하는 학습 기록이므로
현재 `docs/repository-evolution-workshop` 브랜치에 유지한다.

- `docs/workshops/repository-evolution/**`
- `docs/reviews/repository-evolution/phase-01/01-repository-entry-points.md`
- `docs/reviews/repository-evolution/phase-01/02-repository-map.md`
- `docs/reviews/repository-evolution/phase-01/03-knowledge-architecture.md`
- `docs/reviews/repository-evolution/phase-01/04-progressive-disclosure.md`
- `docs/reviews/repository-evolution/phase-01/05-documentation-code-consistency.md`
- `docs/reviews/repository-evolution/phase-01/06-repository-constraints.md`
- 이 `summary.md`

학습 문서에 남은 과거 경로와 당시 수치는 그 Day의 관찰 이력이다. 현재 실행 원천으로 사용하지 않고,
현재 상태 판단은 이 종합문서와 최신 source를 다시 대조한다.

## Phase 2 선행 조건

현재 저장소에는 Phase 2 상세 Day 계획 문서가 아직 없고 roadmap의 방향만 있다. 따라서 다음 항목은
Phase 2 설계의 결론이 아니라 계획 작성 전에 고정할 입력이다.

1. **기준선**: `main`의 PR #117, #119, #121 이후 구조를 시작점으로 삼는다.
2. **runtime 분리**: Harness와 Workflow Engine을 하나의 lifecycle로 합치지 말고 요청마다 실제 소유
   runtime과 handoff 경계를 구분한다.
3. **조사 축**: Runtime Boundary, Request and Execution Lifecycle, State Persistence, Idempotency and
   Recovery, Locking·Trace·Reporting, Error Classification을 현재 코드와 GitHub 상태에서 직접 조사한다.
4. **대표 시나리오**: 최소한 다음 경로를 추적한다.
   - Workflow Engine 단독 이슈·PR 흐름
   - 파일 변경에서 Harness 사용 가능 여부에 따른 실행 주체 선택
   - 중단된 workflow의 authoritative 재관측과 재개
   - `.workflow-engine/settings.json`의 누락 필드 지연 초기화와 인식 불가 값 중단
   - Harness Phase 6 사용자 결정 대기와 승인 범위만 Phase 7에 반영하는 흐름
5. **관측 항목**: 각 시나리오에서 최초 입력, 읽은 계약, 상태 원천, side effect, idempotency key 또는
   반복 실행 결과, 중단 이유, 재개 조건, 최종 보고 책임을 기록한다.
6. **보존 제약**: GitHub가 협업 상태의 원천이고, 설정은 Workflow Engine이 독점 소유하며, Harness
   품질·변경 범위는 사용자가 결정한다는 경계를 바꾸지 않는다.
7. **재논의 금지 기준**: required check, 공통 installer manifest, 중앙 executor registry와 contributor
   inventory는 새 runtime 증거 없이 다시 개선 후보로 올리지 않는다.
8. **P-1 판정 자료**: Harness 요청별 실제 context 노출, leaf 선택 실패, Phase 재진입 누락, 반복 읽기
   비용을 수집한다. 줄 수만으로 구조 변경을 결론 내리지 않는다.
9. **완료 기준**: Phase 2 계획은 각 runtime의 시작·종료·handoff, 상태 지속 위치, 실패 분류와 재개
   조건을 검증 가능한 질문으로 바꿀 수 있어야 한다.

## 오늘 새롭게 이해한 것

- Phase 1의 성과는 새 Repository Map을 만드는 것보다, 질문별로 어느 원천을 읽고 어느 소유권을
  보존해야 하는지 합의한 데 있다.
- 현재 비대칭 검증은 단순한 테스트 부족이 아니라 결정론적 Workflow Engine과 의미 중심 Harness의
  성격 차이를 반영한다.
- “문서가 크다”는 증상만으로는 원인이 되지 않는다. 실제 activation 경로와 실패를 관측해야 target
  state를 정할 수 있다.
- 이미 해소된 후보와 의도적으로 수용한 한계를 구분해야 다음 Phase가 같은 논의를 반복하지 않는다.

## 기존 생각이 바뀐 부분

- Day 1의 전역 skill inventory, Day 5의 consistency test, Day 6의 중앙 constraint test는 하나의
  manifest로 통합할 문제가 아니었다. 현재 독립 소유 구조는 의도된 선택이다.
- Harness의 긴 진입 문서를 즉시 분할하는 것이 우선순위처럼 보였지만, 안전 불변 조건의 가치와 실제
  runtime 비용을 함께 측정하기 전에는 보류해야 한다.
- repository-level CI gate가 없다는 사실은 자동으로 결함이 아니다. 현재 ruleset과 검증 방식에서 어떤
  실패가 실제로 통과하는지 근거가 생길 때 정책을 다시 열어야 한다.

## 저장소에서 확인한 근거

- 사용자 진입과 설치 범위: `README.md`, `install.sh`, `uninstall.sh`
- 에이전트 review 범위: `AGENTS.md`
- Workflow Engine 설계와 runtime 경계: `docs/github-workflow-engine.md`,
  `.codex-dist/skills/github-workflow-engine/SKILL.md`
- Workflow 실행 원천: `definitions/*.json`, `scripts/workflow-definition/*.mjs`
- 설정 초기화: `references/target-runtime-bootstrap-contract.md`, `.workflow-engine/settings.json`
- 파일 변경 handoff: `references/file-change-execution-contract.md`,
  `references/target-harness-execution-contract.md`, `workflow-code-editor/SKILL.md`
- Harness lifecycle과 사용자 결정: `.codex-dist/skills/harness/SKILL.md`,
  `references/reference-map.md`, `references/target-evaluation-playbook.md`
- 자동 검증: Workflow Engine의 `tests/**`, Harness의 `tests/user-decision-boundary.test.mjs`
- GitHub 운영 제약: repository ruleset `main protection`
- 반영 이력: PR #101, #102, #103, #114, #115, #117, #119, #121

## 현재 구조의 강점

- 메타 source, 설치 copy, 타겟 생성물, runtime 상태와 관찰 기록의 경계가 분명하다.
- package 단위로 지식과 실행 자산을 응집하면서 조건부 reference로 context를 줄인다.
- 설계 설명과 실행 가능한 Definition·코드를 분리한다.
- Workflow Engine의 상태 계산과 fail-closed 경계가 결정론적으로 검증된다.
- Harness가 의미 판단 자료를 제공하되 사용자의 최종 권한을 침범하지 않는다.
- 설치·제거가 선택 가능하고 복구 가능하며, GitHub 보호와 로컬 검증의 책임도 구분돼 있다.

## 남은 의문

1. 실제 Harness 실행에서 어느 요청과 Phase가 상위 `SKILL.md`와 `reference-map.md`의 정보를 반복해서
   읽으며, 그 비용이 잘못된 leaf 선택을 막는 효과보다 큰가?
2. Phase 2에서 state persistence를 조사할 때 GitHub 상태, `.workflow-engine/settings.json`, Harness
   생성 문서와 로그의 수명·권한·재생성 기준을 어떤 공통 관찰 형식으로 비교할 것인가?
3. contributor 지원을 시작했다고 판단할 수 있는 구체적인 제품 성숙도나 협업 신호는 무엇인가?

## 다음 Day의 선행 조건

1. Phase 2 상세 계획을 작성하기 전에 roadmap의 여섯 Runtime Engineering 주제를 현재 두 runtime에
   매핑한다.
2. 이 문서의 `Phase 2 선행 조건`에 적은 다섯 대표 시나리오를 최소 조사 단위로 사용한다.
3. P-1은 runtime 관측 결과가 나올 때까지 공식 정책 변경으로 전이하지 않는다.
4. F-1은 P-1의 경계가 확정되기 전 구현하지 않는다.
5. 새로운 세션에서는 현재 branch, `main`, 열린 Issue·PR, 테스트 결과를 다시 확인하고 이 문서의 수치를
   현재 사실로 가정하지 않는다.

## Phase 1 완료 조건 점검

- [x] Day 1~6의 조사 결과를 현재 기준선에서 하나의 문서로 통합했다.
- [x] 현재 구조의 강점, 활성 문제, 수용된 한계와 근본 원인을 구분했다.
- [x] 즉시 수정, 정책 검토, 기능 제안, 보류의 모든 처리 유형을 결정했다.
- [x] 각 후보의 근거, 기대 효과, 위험과 선행 조건을 기록했다.
- [x] 후보 간 의존성과 권장 순서를 정리했다.
- [x] 이미 `main`에 반영된 변경, 새 반영 대상과 학습 브랜치 기록을 구분했다.
- [x] Phase 2 계획을 작성하기 전에 고정할 입력과 남은 의문을 정리했다.

**Phase Exit 판단**: 현재 확인된 즉시 수정 대상은 없고, 이미 승인된 변경은 모두 `main`에 반영돼 있다.
남은 P-1과 F-1은 Phase 2 관측과 사용자 결정이 선행되는 조건부 후보이므로 Repository Engineering의
종료를 막지 않는다. Phase 1은 완료 조건을 충족하며 Phase 2 상세 계획 작성으로 진행할 수 있다.
