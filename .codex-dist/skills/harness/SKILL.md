---
name: harness
description: 프로젝트에 맞는 실행 하네스 팀을 구성합니다. 현재 저장소를 분석하고, 역할 기반 로컬 스킬 팀과 오케스트레이션 구조를 생성하며, QA와 검증을 포함한 프로젝트별 실행 하네스가 필요할 때 적극적으로 사용합니다. "하네스 구성해줘", "실행 하네스 팀 만들어줘", "프로젝트용 역할 팀 구성해줘", "이 저장소에 맞는 하네스 팀 설계해줘" 같은 요청이 오면 이 스킬을 적극적으로 사용합니다.
---

# Harness — 프로젝트별 실행 하네스 팀 생성 스킬

이 스킬은 현재 저장소에 맞는 **프로젝트 로컬 실행 하네스 팀**을 구성하는 `Codex 중심 메타 프레임워크`다.

이 스킬은 저장소를 탐색해 근거를 수집하고, 그 결과를 공통 입력으로 삼아 역할 팀, 운영 구조, QA/검증 흐름, `run-harness` 진입점, drift / sync / evolve 루프를 설계한다.

---

## 이 스킬을 사용하는 상황

다음과 같은 경우 이 스킬을 적극적으로 사용한다.

- 저장소에 프로젝트별 실행 하네스 팀이 필요할 때
- 역할 기반 로컬 스킬 구조를 만들고 싶을 때
- 분석 / 설계 / 생성 / QA / 검증 역할을 분리하고 싶을 때
- orchestrator 중심의 팀 흐름이 필요할 때
- run-harness 같은 팀 기동 진입점이 필요할 때
- 프로젝트에 맞는 QA / validator 포함 구조가 필요할 때
- 이후 프로젝트 특화 실행 하네스로 확장 가능한 기반이 필요할 때

---

## 핵심 원칙

1. 현재 저장소 내부에 **프로젝트 로컬 실행 하네스 팀**을 만든다.
2. 전역 `AGENTS.md`를 생성하거나 수정하지 않는다.
3. 기존 저장소에 `AGENTS.md`가 있으면 덮어쓰기보다 감사와 정렬을 앞에 둔다.
4. 하네스의 본체는 문서가 아니라 **역할 팀**이다.
5. 역할 팀은 로컬 스킬과 orchestrator 중심 흐름으로 구성한다.
6. QA와 validator는 실행 하네스 팀의 필수 일부로 다룬다.
7. `run-harness`는 로컬 역할 팀을 실제로 기동하는 진입점으로 다룬다.
8. 리포트와 보조 문서는 사람이 구조를 이해하고 수정할 수 있게 돕는 **보조 레이어**로만 다룬다.
9. 역할 수는 많을수록 좋은 것이 아니라, 실제 프로젝트에 맞는 운영 가능한 팀 크기가 중요하다.
10. 탐색 근거가 아직 부족하면, `run-harness`가 사용자 확인 질문부터 제시하고 그 답을 다음 단계 입력으로 연결한다.
11. 언어, 구조, 경계 해석은 **코드베이스 탐색 결과**를 기준으로 한다.
12. 하네스의 핵심 입력은 탐색으로 수집한 근거와 그 해석이다.

## 작성 언어 원칙

- 프로젝트 내부 `.harness/*` 문서와 로그 본문은 특별한 요청이 없으면 한글로 작성한다.
- 보고서 파일명은 `domain-analysis.md` 같은 기존 영문 파일명을 유지하되, 본문과 항목명은 한글을 기본으로 한다.
- 프로젝트에 이미 명시된 문서 언어 규칙이 있다면 그 규칙을 앞에 두되, 별도 규칙이 없으면 한글 작성이 기본이다.

## 실행 계약

이 스킬이 트리거되었다고 해서 임의 방식으로 파일을 만들면 안 된다.

아래 `scripts/...` 경로는 현재 `harness` 스킬 디렉토리 기준 상대 경로다.
전역 설치 후 기본 위치는 `$HOME/.codex/skills/harness/scripts/*.sh`이다.

- 최초 하네스 구성 요청이면 반드시 `bash scripts/harness-init.sh`를 앞에 실행한다.
- `harness-init.sh` 직후 상태는 완료가 아니라 골격 생성 상태로 본다.
- `harness-init.sh` 다음에는 역할 팀이 `.harness/reports/*`를 직접 작성해야 한다.
- 하네스 구성이 끝났다고 판단하기 전에 반드시 `bash scripts/harness-verify.sh`를 실행한다.
- 역할 재작성 없이 `harness-verify.sh`를 먼저 실행해 통과시키려 하지 않는다.
- `scripts/harness-update.sh`는 이미 하네스 구조가 있는 프로젝트에서 필요한 문서와 탐색 근거를 다시 정리할 때 사용한다. 필요하면 `--domain`, `--architecture`, `--qa`, `--orchestration`, `--team-structure`, `--team-playbook`으로 범위를 좁힌다.
- `초기` 탐색 상태에서는 질문과 탐색 재읽기를 앞에 두고, `제한적` 상태에서는 필요한 문서만 선택 갱신하며, `충분` 상태에서는 더 구체적인 구조와 검증을 적용한다.
- `harness-init.sh` 또는 `harness-update.sh`가 만든 문서는 완성본으로 간주하지 않고, 완료 전에 반드시 저장소 사실, 기존 도메인 언어, 운영 흐름에 맞게 역할 관점으로 다시 작성한다.
- `.harness/reports/*` 문서 재가공 없이 스크립트 출력만으로 완료 처리하지 않는다.
- `scripts/harness-init.sh` 대신 `.codex/skills/*`, `.harness/*`를 수동으로 직접 생성하는 방식은 사용하지 않는다.
- `scripts/harness-verify.sh`가 실패하면 완료로 간주하지 말고, 누락된 구조를 앞에서 다시 쓴다.
- 생성 문서와 예시 명령에 사용자 홈 디렉토리나 절대경로를 하드코딩하지 않는다. 실행 예시는 상대경로나 스킬 기준 경로를 사용한다.

### 완료 기준

하네스 구성이 끝났다고 말하려면 아래가 모두 만족돼야 한다.

1. `exploration-notes.md`가 후보 단서 문서로 존재한다.
2. `domain-analysis.md`, `harness-architecture.md`, `qa-strategy.md`, `orchestration-plan.md`, `team-structure.md`, `team-playbook.md`가 골격 문구 없이 역할별 최종 결과 문서로 다시 써져 있다.
3. `run-harness`가 현재 상태를 읽고 시작 역할, 다음 역할, 미해결 질문을 분명히 제시할 수 있다.
4. `scripts/harness-verify.sh`가 구조 누락과 골격 잔존 없이 통과한다.

즉 `harness-init.sh`가 끝난 상태는 완료가 아니라 **골격이 준비된 상태**다.

## 탐색 우선 원칙

이 스킬은 탐색 기반 메타 프레임워크로 동작한다.

- `package.json`, `Cargo.toml`, 디렉토리 이름 같은 파일 단서는 탐색을 시작하는 참고 정보로만 사용한다.
- 언어, 실행 모델, 경계, 주요 흐름, 검증 비용은 실제 코드베이스 탐색 결과를 앞에서 읽고 적는다.
- 리포트와 역할 설계는 탐색 결과가 수집된 뒤에만 결과형 문서로 남긴다.
- 탐색 없이 나온 일반론 문서는 품질 저하로 본다.

### 탐색 결과 모델

탐색은 최소한 다음 개념을 수집해야 한다.

- 대표 시작점 후보
- 주요 모듈 / 패키지 / 런타임 경계
- 테스트 / 검증 자산
- 설정 / 배포 / 실행 경로
- 저장소 고유 용어와 실패 비용

이 결과는 이후 역할 팀과 문서의 공통 입력이 된다.

### 탐색 상태

탐색 결과는 다음 세 상태 중 하나로 정리한다.

- `초기`: 대표 시작점 후보, 경계 후보, 테스트 자산이 거의 잡히지 않은 상태. 역할 단정보다 사용자 질문, 첫 성공 흐름, 추가 탐색 경로 메모가 앞에 놓인다.
- `제한적`: 일부 근거는 확보됐지만 어떤 앱/패키지/런타임 경계가 중심인지 연결이 충분하지 않은 상태. 필요한 문서만 선택 갱신하고, 탐색 근거를 더 다시 확인하는 작업을 함께 진행한다.
- `충분`: 대표 시작점 후보, 주요 경계, 테스트/실행 경로, 저장소 고유 용어가 연결된 상태. 역할 팀 설계, 운영 규칙, 선택 자산, verify 기준을 더 구체적으로 적용한다.

이 상태는 역할 결정, update 범위, verify 강도를 함께 맞추는 공통 제어 입력이다.

## Phase 0: 하네스 현황 감사

하네스 스킬이 트리거되면, 실제 생성 전에 현재 저장소의 하네스 현황을 앞에서 감사한다.

1. `.codex/skills/`, `.harness/reports/`, `.harness/logs/`의 존재와 현재 파일 수를 앞에서 읽는다.
2. 저장소 루트에 `AGENTS.md`가 있으면 상위 운영 계약 문서로 읽고 현재 하네스와 충돌하는지 함께 본다.
3. 현황에 따라 실행 모드를 나눈다.
4. 기존 하네스가 있으면 덮어쓰기보다 필요한 문서를 다시 쓰는 쪽을 앞에 두고, drift 가능성을 읽는다.
5. 감사 결과는 이후 init/update/verify의 입력으로 계속 사용한다.

### 실행 모드

- `신규 구축`: 로컬 역할 스킬, 보고서, 로그 구조가 거의 없는 상태. `harness-init.sh` 중심으로 시작한다.
- `기존 확장`: 일부 역할 스킬, 보고서, 로그 구조가 이미 있는 상태. `harness-update.sh`로 필요한 부분만 다시 쓴다.
- `운영 유지보수`: 구조는 있으나 문서/스킬/로그 정합성 읽기나 drift 읽기가 필요한 상태. 불필요한 재생성보다 감사와 verify를 앞에 둔다.
- 핵심 역할과 handoff를 계속 운영해야 하는 저장소는 팀 구조를 기본으로 두고, 입력과 출력이 좁은 일회성 보조 해석만 별도 위임으로 본다.
- 새 구조를 안정적으로 세울 때는 파이프라인, 생성 직후 검증을 빨리 돌려야 할 때는 생성-검증, 하위 경계가 독립적일 때만 팬아웃/팬인, handoff와 재진입이 핵심이면 오케스트레이션 중심 구조를 앞에 둔다.

실행 모드와 탐색 상태는 별개다. 예를 들어 `기존 확장` 모드라도 탐색 상태가 `초기`일 수 있고, 이 경우에는 세부 역할을 늘리기보다 질문과 탐색 재확인부터 다시 시작한다.

### 기존 확장 Phase 선택

`기존 확장`과 `운영 유지보수`에서는 항상 전체 흐름을 다시 돌리지 않는다.

- domain 근거가 약하면 `Phase 1`부터 다시 들어간다.
- 역할 경계와 구조 설명이 약하면 `Phase 2`부터 다시 들어간다.
- 스킬 설명과 트리거가 약하면 `Phase 3`부터 다시 들어간다.
- QA 기준이 약하면 `Phase 4`부터 다시 들어간다.
- orchestration, handoff, 세션 운영 규칙이 약하면 `Phase 5`부터 다시 들어간다.
- 상위 운영 계약이나 `AGENTS.md` 충돌이 크면 update보다 재구성을 앞에 둔다.

세부 기준은 `references/phase-selection-matrix.md`를 참고한다.

### drift 점검 기준

- 역할 스킬 수와 보고서 수가 현재 기본 구조와 크게 어긋나는가
- `.harness/reports/*` 문서가 현재 저장소 구조보다 일반론으로 되돌아갔는가
- 로그 정책과 실제 로그 자산이 서로 다른 운영 모델을 말하고 있는가
- run-harness, orchestrator, validator의 역할 설명이 서로 충돌하는가
- 기존 `AGENTS.md`의 상위 운영 규칙이 현재 하네스의 진입점, 운영 모드, 재구성 원칙과 충돌하는가

## 기본 실행 순서

- 새 프로젝트 하네스 구성: `bash scripts/harness-init.sh` → 역할 기반 `.harness/reports/*` 문서 재작성 → 필요 시 역할 재호출 → `bash scripts/harness-verify.sh`
- 기존 프로젝트 확장: 하네스 현황 감사 → `bash scripts/harness-update.sh` → 역할 기반 `.harness/reports/*` 문서 재작성 → `bash scripts/harness-verify.sh`
- 기존 프로젝트의 구조 누락 정리: 하네스 현황 감사 → 필요한 경우에만 `bash scripts/harness-init.sh` 또는 명시적 재구성 → 역할 기반 `.harness/reports/*` 문서 재작성 → `bash scripts/harness-verify.sh`
- 기존 프로젝트의 운영 유지보수/감사: 하네스 현황 감사 → 필요 시 `bash scripts/harness-update.sh` → 역할 기반 `.harness/reports/*` 문서 재작성 → `bash scripts/harness-verify.sh`

---

## 생성 대상

이 스킬은 현재 저장소 안에 다음을 생성하거나 다시 쓴다.

### 프로젝트 로컬 역할 스킬

- `.codex/skills/domain-analyst/SKILL.md`
- `.codex/skills/harness-architect/SKILL.md`
- `.codex/skills/skill-scaffolder/SKILL.md`
- `.codex/skills/qa-designer/SKILL.md`
- `.codex/skills/orchestrator/SKILL.md`
- `.codex/skills/validator/SKILL.md`
- `.codex/skills/run-harness/SKILL.md`

### 보조 산출물

- `.harness/reports/domain-analysis.md`
- `.harness/reports/harness-architecture.md`
- `.harness/reports/qa-strategy.md`
- `.harness/reports/orchestration-plan.md`
- `.harness/reports/team-structure.md`
- `.harness/reports/team-playbook.md`

핵심은 역할 팀이며,  
리포트는 역할 팀이 직접 작성하는 결과 문서이며, init 직후에는 골격만 놓인다.

---

## 전체 워크플로우

### Phase 1: 저장소 분석

1. 현재 저장소의 목적, 실행 모델, 대표 진입점 후보와 관련 코드 근거를 **코드베이스 탐색**으로 수집한다.
2. 대표 진입점 후보, 관련 코드 경로, 테스트 자산, 설정/배포 경로, 저장소 고유 용어를 수집한다.
3. Phase 0 감사 결과를 기준으로 기존 로컬 하네스 구조와 충돌을 피한다.
4. 탐색만으로 부족한 부분은 사용자에게 확인할 질문으로 분리한다.

이 단계의 결과는 실행 하네스 팀의 출발점이 된다.  
분석 기준은 `references/agent-design-patterns.md`, 탐색 결과 형식은 `references/exploration-model.md`, 상위 컨텍스트 정렬 기준은 `references/agents-sync-guide.md`, 기존 확장 재진입 기준은 `references/phase-selection-matrix.md`를 참고한다.

### Phase 2: 실행 하네스 팀 설계

1. 이 프로젝트에 필요한 역할 팀 구성을 결정한다.
2. 기본 역할 구성을 유지할지, 축소/확장할지 적는다.
3. 어떤 역할이 중심이고, 어떤 역할이 보조인지 적는다.
4. 장기 운영 구조는 팀 역할을 앞에 두고, 좁은 보조 해석만 따로 위임할지 함께 적는다.
5. 파이프라인, 생성-검증, 팬아웃/팬인, 오케스트레이션 중심 구조 중 현재 요청과 경계에 맞는 패턴을 고른다.
6. 요청이 추상적인지, 저장소 고유 용어와 범위가 충분한지 보고 질문을 앞에 둘지 바로 역할 시작할지 적는다.
7. orchestrator를 중심으로 흐름을 설계한다.
8. run-harness를 팀 기동 진입점으로 포함한다.

이 단계의 핵심은  
문서를 늘리는 것이 아니라 **운영 가능한 역할 팀**을 설계하는 것이다.  
흐름과 위임 기준은 `references/orchestrator-template.md`를 참고한다.

### Phase 3: 로컬 역할 스킬 생성

1. 각 역할에 대한 로컬 SKILL.md를 생성한다.
2. 각 역할은 SKILL.md 하나로 실행 계약과 책임 범위를 함께 설명한다.
3. 보조 역할 정의 문서를 따로 만들지 않는다.
4. 각 역할은 명확한 입력/출력/책임 범위를 가져야 한다.
5. description은 실제 요청에서 트리거될 수 있도록 구체적으로 작성한다.
6. 역할 팀이 실제로 사용 가능한 수준의 스킬 구조를 만든다.
7. run-harness가 팀의 실제 진입점으로 기능하도록 한다.

`skill-scaffolder`는 핵심 보고서 작성 흐름의 기본 단계가 아니다. 이 역할은 로컬 스킬 설명 drift, 구조 문구 불일치, 스킬 계약 재정렬이 필요할 때만 보조적으로 사용한다.

스킬 작성 기준은 `references/skill-writing-guide.md`를 참고한다.

### Phase 4: QA 및 검증 구조 포함

1. QA 역할을 포함해 품질 관점을 적는다.
2. validator를 포함해 최소 검증 구조를 만든다.
3. orchestrator가 각 역할의 입력/출력을 연결할 수 있게 한다.
4. QA와 validator의 피드백이 다시 구조 재작성으로 이어질 수 있게 한다.

QA 기준은 `references/qa-agent-guide.md`를 참고한다.

### Phase 5: `.harness/reports/*` 문서 프로젝트 맞춤 작성

1. `harness-init.sh` 또는 `harness-update.sh`가 만든 `.harness/reports/*` 문서는 골격 상태로 보고, 최종본으로 간주하지 않는다.
2. domain-analyst가 저장소 사실, 대표 흐름, 예외를 기준으로 `domain-analysis.md`를 직접 다시 쓴다.
3. 이 단계에서 기존 README, 도메인 문서, 사용자 흐름 설명에 있던 업무 용어와 문제 정의를 하네스 운영 문구가 덮어쓰지 않게 유지한다.
4. harness-architect와 qa-designer가 역할 경계, handoff, 검증 기준을 현재 저장소 운영 방식에 맞는 결과 문서로 다시 쓴다.
5. orchestrator가 시작 분기, 재진입 루프, 세션 운영 규칙을 실제 요청 유형 기준의 운영 문서로 다시 쓴다.
6. validator는 문서가 스키마만 맞춘 일반론에 머물지 않고 저장소 특화 근거와 도메인 밀도를 유지하는지 확인한다.

이 단계의 목적은 스크립트 골격을 남겨 두는 것이 아니라, 각 프로젝트의 구조, 운영 맥락, 기존 도메인 언어에 맞는 결과 문서를 직접 작성하는 것이다.

### Phase 6: 실행 하네스 팀 검증

1. 필수 역할 스킬이 모두 존재하는지 확인한다.
2. 각 역할이 충분히 구분되는지 확인한다.
3. description이 실제로 트리거될 수 있는 수준인지 확인한다.
4. orchestrator가 중심 역할처럼 읽히는지 확인한다.
5. run-harness가 실제 기동 엔트리포인트처럼 읽히는지 확인한다.
6. QA / validator가 형식적인 보조 역할이 아니라 실제 팀 일부처럼 보이는지 확인한다.
7. 역할 팀 구조가 이후 프로젝트 특화 하네스로 확장 가능한지 본다.
8. 가능하면 `without-skill` 기준선과 비교해 시작 역할 해석, 질문 절제, handoff, 저장소 근거 연결, 검증 가능성이 실제로 나아졌는지 본다.

테스트/검증 관점은 `references/skill-testing-guide.md`, 품질 비교 기준은 `references/quality-evaluation-guide.md`를 참고한다.

---

## 기본 역할 팀

### domain-analyst

저장소 분석과 실행 하네스의 출발점 정의를 맡는다.

### harness-architect

프로젝트 로컬 실행 하네스의 구조와 역할 경계를 설계한다.

### skill-scaffolder

로컬 스킬 설명 drift가 생겼을 때만 보조적으로 정렬한다.

### qa-designer

저장소 기준의 최종 QA 전략 문서를 작성한다.

### orchestrator

요청 유형별 시작점과 재진입 기준이 보이는 최종 운영 계획 문서를 작성한다.

### validator

생성된 실행 하네스가 최소 요건을 만족하는지 읽는다.

### run-harness

현재 상태를 보고 어떤 역할부터 기동할지 결정하는 실행 하네스 팀의 진입점이다.
탐색 근거가 부족하면 프로젝트 성격, 핵심 사용자, 첫 성공 시나리오를 앞에서 사용자에게 묻는다.

---

## orchestrator와 run-harness의 위치

이 실행 하네스 팀에서:

- orchestrator는 **팀 구조와 흐름의 중심**
- run-harness는 **팀을 실제로 시작하는 진입점**

으로 본다.

즉:

- orchestrator = 중심 조율자
- run-harness = 기동 엔트리포인트

이다.

---

## QA와 validator의 위치

QA와 validator는 비슷해 보여도 다르다.

### qa-designer

- 어떤 품질 질문을 반복해서 읽을지 적는다
- 어떤 연결이 중요한지, 어떤 실패가 위험한지 적는다

### validator

- 최소 구조 요건을 읽는다
- 누락, 약한 설명, 흐름 끊김을 식별한다
- 구체적 피드백을 남긴다

즉:

- QA는 품질 관점의 공급자
- validator는 최소 품질 읽기 역할

이며, 둘 다 실행 하네스 팀의 일부로 기능해야 한다.

---

## 리포트의 위치

리포트는 중요하지만 본체는 아니다.

이 스킬에서 본체는:

- 역할 팀
- 로컬 스킬
- run-harness 진입점
- 오케스트레이션 구조
- QA/검증 구조

리포트는:

- 사람이 팀 구조를 이해하게 하고
- 역할 간 합의를 남기고
- 이후 수정과 확장을 쉽게 하도록 돕는 보조 산출물이다

즉 리포트는 중심이 아니라  
👉 **실행 하네스 팀을 지원하는 문서 레이어**이다.

---

## 사람 개입의 위치

이 스킬은 요구사항과 평가 기준을 완전 자동으로 확정하려 하지 않는다.

대신:

- AI는 역할 팀, 구조, QA, 흐름 문서를 실제 결과물로 작성한다
- 사람은 무엇이 중요한지, 어떤 실패가 치명적인지, 어떤 기준을 유지할지 선택하고 수정한다

이 사람 개입은 주로:

- domain-analysis
- harness-architecture
- qa-strategy
- orchestration-plan
- team-structure
- team-playbook

같은 보조 문서 레이어에 반영된다.

즉 사람 개입은 본체를 대신하는 것이 아니라,  
👉 **실행 하네스 팀이 더 정확해지도록 보조 문서에 결과가 반영되는 구조**이다.

---

## 주의사항

- 이 스킬은 현재 단계에서 **프로젝트별 실행 하네스 팀 생성기**를 만드는 데 집중한다.
- expected-state, diff, scenario runner는 이후 프로젝트 특화 실행 하네스로 확장할 수 있다.
- 역할 팀의 본체와 보조 문서를 혼동하지 말라.
- 역할을 과도하게 늘리지 말고, 실제로 의미 있는 팀 구조를 앞에 둔다.
- 리포트가 역할 팀보다 더 커지는 구조를 경계하라.

---

## 산출물 체크리스트

작업 후 최소한 다음을 확인한다.

- [ ] 로컬 역할 스킬 구조가 생성되었다.
- [ ] orchestrator가 포함되어 있다.
- [ ] run-harness가 포함되어 있다.
- [ ] QA와 validator가 포함되어 있다.
- [ ] 실행 하네스 팀이 프로젝트에 맞게 구성되어 있다.
- [ ] 역할 팀이 본체처럼 읽히고, 리포트는 보조 문서로 존재한다.
- [ ] 이후 프로젝트 특화 실행 하네스로 확장 가능한 구조다.

---

## 참고 문서

- `references/agent-design-patterns.md`
- `references/orchestrator-template.md`
- `references/skill-writing-guide.md`
- `references/skill-testing-guide.md`
- `references/qa-agent-guide.md`
- `references/team-examples.md`

이 문서들은 실행 하네스 팀을 더 잘 설계하고 다시 쓰기 위한 지식 베이스이다.
이 참고 문서들은 `Codex 중심 메타 프레임워크`의 설계 규칙 집합 역할도 함께 맡는다.
