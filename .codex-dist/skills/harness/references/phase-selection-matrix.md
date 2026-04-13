# Phase Selection Matrix

이 문서는 기존 하네스를 확장하거나 유지보수할 때 어떤 단계만 다시 수행해야 하는지 정의한다.

목표는 두 가지다.

- `harness-update.sh`가 무조건 전체 보강을 향하지 않게 한다.
- 변경 유형에 따라 `Phase 0 ~ 7` 중 어디부터 다시 들어갈지 명확히 만든다.

---

## 핵심 전제

- 기존 확장은 전부 다시 만드는 작업이 아니다.
- 먼저 drift와 변경 범위를 읽고, 필요한 단계만 다시 수행한다.
- 부분 구조 drift나 상위 운영 계약 충돌이 크면 update보다 재구성을 우선한다.

---

## 1. 기본 분기

### 신규 구축

- `Phase 0 감사` -> `Phase 1 도메인/작업 분석` -> `Phase 2 팀 설계` -> `Phase 3 에이전트/스킬 생성` -> `Phase 4 QA/검증 구조` -> `Phase 5 역할별 최종 작성` -> `Phase 6 verify` -> `Phase 7 품질 비교와 성숙도 평가`

### 기존 확장

- `Phase 0 감사` 후 변경 범위에 따라 필요한 단계만 다시 수행한다.

### 운영 유지보수

- `Phase 0 감사` -> 필요한 `Phase` 재진입 -> `Phase 6 verify` -> 필요 시 `Phase 7 품질 비교와 성숙도 평가`

### 재구성

- `Phase 0 감사`에서 부분 구조 drift 또는 상위 계약 충돌이 크면 기존 구조 정리 후 `신규 구축` 흐름으로 다시 간다.

---

## 2. 변경 유형별 권장 재진입

### domain 근거가 약하거나 오래된 경우

- 시작: `Phase 1 도메인/작업 분석`
- 이후: `Phase 2`, `Phase 4`, `Phase 5`, `Phase 6`, 필요 시 `Phase 7`

### 역할 경계나 구조 설명이 흐린 경우

- 시작: `Phase 2 실행 하네스 팀 설계`
- 이후: `Phase 3`, `Phase 4`, `Phase 5`, `Phase 6`, 필요 시 `Phase 7`

### 로컬 스킬 설명이나 트리거가 약한 경우

- 시작: `Phase 3 에이전트 정의 생성`
- 이후: `Phase 4`, `Phase 6`, 필요 시 `Phase 7`

### QA 질문과 최소 체크가 약한 경우

- 시작: `Phase 4 QA 및 검증 구조`
- 이후: `Phase 5`, `Phase 6`, 필요 시 `Phase 7`

### orchestration과 handoff가 약한 경우

- 시작: `Phase 5 역할별 최종 작성`
- 이후: `Phase 6`, 필요 시 `Phase 7`

### verify는 통과하지만 운영 품질이 약한 경우

- 시작: `Phase 7 품질 비교와 성숙도 평가`
- 이후: 부족 축에 따라 `Phase 1`~`Phase 5` 중 하나로 재진입

### AGENTS.md와 하네스 운영 계약이 충돌하는 경우

- 시작: `Phase 0 감사`
- 이후: `정렬 가능하면 Phase 2 또는 Phase 5`, 충돌이 크면 `재구성`

### 로그 정책과 실제 운영 루프가 어긋난 경우

- 시작: `Phase 0 감사`
- 확인 포인트: 다음 시작 역할, 다음 재진입 phase, 다음 시작 전 우선 확인 입력 파일, 최근 출력 파일이 실제 로그와 요약에 남는지 본다.
- 이후: `Phase 4` 또는 `Phase 5`, 마지막에 `Phase 6`, 필요 시 `Phase 7`

---

## 3. update 옵션과의 연결

- `--domain`: `Phase 1` 결과가 약한 경우 우선 사용한다.
- `--architecture`: `Phase 2` 결과가 약한 경우 우선 사용한다.
- `--qa`: `Phase 4` 결과가 약한 경우 우선 사용한다.
- `--orchestration`: `Phase 5` 중 흐름 보강이 필요한 경우 우선 사용한다.
- `--team-structure`, `--team-playbook`: 구조 설명 또는 운영 플레이북만 약한 경우 우선 사용한다.

옵션은 파일 단위 선택일 뿐이고, 실제 판단은 항상 Phase 기준으로 내려야 한다.

---

## 4. 재구성을 선택해야 하는 경우

- 역할 스킬과 보고서가 부분적으로만 남아 있다.
- `AGENTS.md`와 현재 하네스가 서로 다른 운영 모델을 강하게 말한다.
- run-harness, orchestrator, validator 설명이 함께 어긋난다.
- update를 반복해도 drift가 계속 되돌아온다.

이 경우에는 필요한 문서만 덧칠하지 말고, 기존 구조 정리 후 다시 구성하는 것이 맞다.

---

## 5. 다른 레퍼런스와의 연결

- `agents-sync-guide.md`: `AGENTS.md` 충돌이 있을 때 update가 아니라 감사와 정렬을 먼저 두는 기준을 제공한다.
- `agent-design-patterns.md`: 어떤 변경이 구조 설계까지 다시 흔드는지 상위 기준을 제공한다.
- `orchestrator-template.md`: 재진입 후 어떤 handoff와 피드백 루프를 복구해야 하는지 연결한다.
