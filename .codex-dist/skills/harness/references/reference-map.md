# Harness Reference Map

이 문서는 `references/` 아래 설계 기준 문서를 어떤 축으로 읽을지 정리하는 인덱스다.

핵심 원칙:

- 레퍼런스는 부록이 아니라 메타시스템 설계 기준 라이브러리다.
- 시작 진입 역할, 역할 스킬, 운영 감사 역할은 이 문서들을 필요할 때 골라 참조한다.
- 모든 문서를 한 번에 읽기보다, 현재 결정하려는 축에 맞는 문서부터 읽는다.

---

## 1. 상태 모드 / 실행 모드 / 하네스 Phase 0~7 게이트

다음 질문에 답해야 할 때 먼저 읽는다.

- 지금 `신규 구축 / 기존 확장 / 운영 유지보수` 중 어디에 가까운가
- Codex에서 주 에이전트 중심으로 시작할지, 좁은 보조 위임을 둘지
- 어느 Phase부터 재진입해야 하는가
- 현재 품질 문제가 어느 Phase의 부족함에서 시작됐는가

주요 문서:

- `codex-runtime-contract.md`
- `phase-selection-matrix.md`
- `agents-sync-guide.md`
- `reentry-rules.md`

---

## 2. 아키텍처 패턴 선택

다음 질문에 답해야 할 때 먼저 읽는다.

- `파이프라인 / 팬아웃·팬인 / 전문가 풀 / 생성-검증 / 감독자 / 계층적 위임` 중 무엇이 맞는가
- 이 저장소에서 다음 역할 결정과 재진입을 어떻게 설계할까
- 어떤 작업만 서브에이전트로 위임할 수 있는가
- 팀 아키텍처 패턴을 Codex의 주 에이전트 중심 실행과 보조 위임 구조로 어떻게 해석할까

주요 문서:

- `codex-runtime-contract.md`
- `agent-design-patterns.md`
- `orchestrator-template.md`
- `team-examples.md`

---

## 3. 에이전트 정의와 상위 규칙 정렬

다음 질문에 답해야 할 때 먼저 읽는다.

- `AGENTS.md`, `.codex/config.toml`, `.codex/agents/*.toml`을 어떻게 맞출까
- team-spec에 정의한 역할 이름과 파일 구성을 어떻게 생성 결과로 옮길까
- 상위 운영 기준과 로컬 하네스가 충돌하는가
- sync가 필요한가

주요 문서:

- `codex-runtime-contract.md`
- `agents-sync-guide.md`
- `agent-design-patterns.md`
- `team-spec-schema.md`
- `team-spec-contract.md`

---

## 4. 스킬 정의와 테스트

다음 질문에 답해야 할 때 먼저 읽는다.

- SKILL.md description과 본문을 어떻게 써야 하는가
- 에이전트 정의와 스킬 정의를 어떻게 나눌까
- 어떤 회귀를 테스트로 고정할까
- description, progressive disclosure, with-skill/baseline 비교, 트리거 검증을 어떻게 적용할까

주요 문서:

- `skill-writing-guide.md`
- `skill-testing-guide.md`
- `verification-checklist.md`

---

## 5. 레퍼런스 패턴 기반 생성

다음 질문에 답해야 할 때 먼저 읽는다.

- 어떤 패턴과 예시를 현재 저장소에 맞게 해석할까
- 오케스트레이션 흐름을 어떤 실행 모드와 handoff 규칙으로 작성할까
- 역할 스킬의 description, 본문 구조, 출력 형식은 어떤 기준으로 쓸까
- 예시 문서를 team-spec과 저장소 재독해 결과에 어떻게 맞춰 다시 작성할까
- `팀 아키텍처 / 실행 모드 / 역할 구성 / 오케스트레이션 흐름` 예시 구조를 Codex용 생성 기준으로 어떻게 바꿀까

주요 문서:

- `orchestrator-template.md`
- `agent-design-patterns.md`
- `skill-writing-guide.md`
- `team-examples.md`
- `team-spec-schema.md`

---

## 6. 초기 생성 자기진화 계약

다음 질문에 답해야 할 때 먼저 읽는다.

- 타겟 프로젝트에 하네스를 처음 만들 때 무엇을 반드시 생성해야 하는가
- 저장소 근거가 적은 초기 단계에서 도메인 설명만으로 어떻게 시작할 것인가
- 초기 생성물만으로 다음 시작 역할과 다음 하네스 재진입 Phase를 알 수 있는가
- 생성된 역할 스킬이 처음부터 학습 후보와 승격 대상을 남길 수 있는가
- 초기 문서 골격이 완료물인지, 자동 판단 보류와 다음 입력을 남긴 상태인지 구분되는가

주요 문서:

- `initial-generation-contract.md`
- `exploration-model.md`
- `team-spec-contract.md`
- `skill-writing-guide.md`
- `logging-contract.md`
- `verification-checklist.md`

---

## 7. 상태 점검 / 정렬 / 개선 운영 루프

다음 질문에 답해야 할 때 먼저 읽는다.

- 현재 문제는 상태 점검이 필요한가, 정렬이 필요한가, 개선이 필요한가
- 부분 갱신으로 봉합할지, 재구성할지, 패턴을 다시 고를지
- 새로 드러난 사실을 어느 문서와 팀 스펙에 반영해야 하는가
- 실제 작업 관찰을 로컬 하네스 보강과 생성기 환류 후보 중 어디로 보낼까

주요 문서:

- `evolution-contract.md`
- `agents-sync-guide.md`
- `phase-selection-matrix.md`
- `quality-evaluation-guide.md`
- `reentry-rules.md`
- `logging-contract.md`

---

## 8. 하네스 Phase 7 피드백 반영과 타겟 평가

다음 질문에 답해야 할 때 먼저 읽는다.

- 생성기가 타겟 프로젝트에서 운영 가능성 평가를 수행할 준비가 돼 있는가
- 지금 생성된 하네스가 실제 운영 가능한 수준인가
- 부족한 점이 입력 문서 품질 문제인지, 역할 규칙 문제인지, 운영 기준 문제인지
- 다음 재진입을 어느 Phase로 돌려야 하는가
- 타겟 관찰은 로컬 보강으로 충분한가, 생성기 reference 보강 후보로 봐야 하는가
- 예전 `meta-system-maturity-guide.md`가 다루던 메타시스템 성숙도 판정을 어떤 기준으로 이어서 볼 것인가

주요 문서:

- `evolution-contract.md`
- `generator-readiness-checklist.md`
- `quality-evaluation-guide.md`
- `target-evaluation-playbook.md`

성숙도 판정은 생성기 자체 준비도와 타겟 하네스 운영 가능성으로 나누어 본다. 생성기 기준은 `generator-readiness-checklist.md`, 실제 생성 결과 기준은 `target-evaluation-playbook.md`와 `quality-evaluation-guide.md`를 따른다.

---

## 9. 운영 감사 기준

다음 질문에 답해야 할 때 먼저 읽는다.

- 운영 감사 역할이 구조 검증과 어떻게 다른가
- 운영 기준 감사는 무엇을 봐야 하는가
- QA와 운영 감사 역할의 경계를 어떻게 나눌까
- QA가 파일 존재 확인을 넘어 경계면 교차 비교를 수행하는가
- 새 학습 후보를 다음 실행에 반영할 위치가 있는가

주요 문서:

- `evolution-contract.md`
- `initial-generation-contract.md`
- `qa-agent-guide.md`
- `team-examples.md`
- `quality-evaluation-guide.md`
- `skill-testing-guide.md`
- `verification-checklist.md`
- `logging-contract.md`

---

## 10. 로그와 세션 재진입

다음 질문에 답해야 할 때 먼저 읽는다.

- 세션 기록을 어느 문서에 남겨야 하는가
- 다음 시작 역할과 하네스 재진입 Phase를 어디에 남겨야 하는가
- TSV나 임시 상태 파일 없이도 운영 루프를 유지할 수 있는가
- 학습 후보, 반복 신호, 승격 대상을 어디에 남길 것인가

주요 문서:

- `evolution-contract.md`
- `logging-contract.md`
- `reentry-rules.md`
- `verification-checklist.md`

---

## 11. Codex 런타임 계약

다음 질문에 답해야 할 때 먼저 읽는다.

- 생성 결과의 필수 실행 자산은 무엇인가
- 생성 판단의 진실원천을 어디에 둘 것인가
- 주 에이전트가 어떤 기준으로 역할을 선택하고 결과를 통합하는가
- 병렬 위임은 어떤 조건에서만 허용되는가

주요 문서:

- `codex-runtime-contract.md`
- `initial-generation-contract.md`
- `team-spec-contract.md`
- `orchestrator-template.md`
- `verification-checklist.md`

---

## 12. 메타하네스 생성기 준비도

다음 질문에 답해야 할 때 먼저 읽는다.

- `SKILL.md`와 레퍼런스 묶음이 타겟 프로젝트에서 운영 가능성 평가를 수행할 준비가 돼 있는가
- 도메인 분석, 팀 설계, 에이전트 정의, 스킬 생성, 오케스트레이션, 검증, 피드백 반영이 하나의 생명주기로 연결되는가
- 생성 결과가 Codex 로컬 실행 자산으로 설명되는가
- 신규 구축 결과가 첫 세션부터 자기진화 루프를 이어 갈 수 있는가
- 주 에이전트가 같은 기준으로 하네스를 구성할 수 있는가
- 팀 아키텍처, 오케스트레이터, 스킬 작성/검증, QA, 팀 예시가 Codex 런타임에 맞게 모두 대응되는가
- 타겟 프로젝트에서 확인한 차이를 다음 생성기 개선 후보로 환류할 기준이 있는가

주요 문서:

- `evolution-contract.md`
- `initial-generation-contract.md`
- `generator-readiness-checklist.md`
- `codex-runtime-contract.md`
- `team-spec-contract.md`
- `orchestrator-template.md`
- `verification-checklist.md`

---

## 읽기 순서 기본값

기본 읽기 순서는 아래를 따른다.

1. `reference-map.md`
2. 현재 문제 축에 맞는 기준 문서 1~2개
3. 필요할 때만 예시/비교 문서

예:

- 상태 모드와 재진입 판단:
  - `reference-map.md`
  - `codex-runtime-contract.md`
  - `phase-selection-matrix.md`
  - 필요 시 `agents-sync-guide.md`
- Codex 런타임 정렬:
  - `reference-map.md`
  - `codex-runtime-contract.md`
  - `team-spec-contract.md`
  - 필요 시 `orchestrator-template.md`
- 하네스 Phase 7 피드백 반영과 타겟 평가:
  - `reference-map.md`
  - `evolution-contract.md`
  - `quality-evaluation-guide.md`
  - `target-evaluation-playbook.md`
- 패턴 선택:
  - `reference-map.md`
  - `agent-design-patterns.md`
  - `team-spec-schema.md`
  - 필요 시 `orchestrator-template.md`
- 레퍼런스 패턴 기반 생성:
  - `reference-map.md`
  - `initial-generation-contract.md`
  - `orchestrator-template.md`
  - `skill-writing-guide.md`
  - 필요 시 `team-examples.md`
- 초기 생성 자기진화 계약:
  - `reference-map.md`
  - `initial-generation-contract.md`
  - `team-spec-contract.md`
  - `skill-writing-guide.md`
  - 필요 시 `verification-checklist.md`
- 운영 감사 강화:
  - `reference-map.md`
  - `initial-generation-contract.md`
  - `evolution-contract.md`
  - `qa-agent-guide.md`
  - `quality-evaluation-guide.md`
- 메타하네스 생성기 준비도 점검:
  - `reference-map.md`
  - `evolution-contract.md`
  - `generator-readiness-checklist.md`
  - `codex-runtime-contract.md`
  - `team-spec-contract.md`
  - 필요 시 `orchestrator-template.md`

---

## 유지 원칙

- 새 reference를 추가하면 이 맵에도 축과 역할을 같이 적는다.
- 같은 기준 문서를 여러 축에서 재사용할 수 있다.
- 레퍼런스는 늘어나는 것보다, 어느 축에서 어떤 문서를 읽어야 하는지가 더 중요하다.
