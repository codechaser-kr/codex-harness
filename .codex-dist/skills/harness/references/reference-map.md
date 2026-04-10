# Harness Reference Map

이 문서는 `references/` 아래 설계 기준 문서를 어떤 축으로 읽어야 하는지 정리하는 인덱스다.

핵심 원칙:

- references는 부록이 아니라 메타시스템 설계 기준 라이브러리다.
- `run-harness`, 역할 스킬, validator는 이 문서들을 필요할 때 선택적으로 참조한다.
- 모든 문서를 한 번에 읽기보다, 현재 결정하려는 축에 맞는 문서부터 읽는다.

---

## 1. 상태 모드 / 실행 모드 / Phase 0~7 게이트

다음 질문에 답해야 할 때 먼저 읽는다.

- 지금 `신규 구축 / 기존 확장 / 운영 유지보수` 중 어디에 가까운가
- `에이전트 팀 / 단일 역할 / 하이브리드` 중 무엇으로 시작할까
- 어느 Phase부터 재진입해야 하는가
- 현재 품질 문제가 어떤 Phase의 부족함에서 시작됐는가

주요 문서:

- `phase-selection-matrix.md`
- `agents-sync-guide.md`

---

## 2. 아키텍처 패턴 선택

다음 질문에 답해야 할 때 먼저 읽는다.

- `파이프라인 / 생성-검증 / 팬아웃·팬인 / 오케스트레이션 중심 / 전문가 풀` 중 무엇이 맞는가
- 이 저장소에서 handoff와 재진입을 어떻게 설계할까

주요 문서:

- `agent-design-patterns.md`
- `orchestrator-template.md`
- `team-examples.md`

---

## 3. 에이전트 정의와 상위 계약 정렬

다음 질문에 답해야 할 때 먼저 읽는다.

- `AGENTS.md`, `.codex/config.toml`, `.codex/agents/*.toml`을 어떻게 맞출까
- team-spec에서 정의한 역할 이름과 파일 구성을 어떻게 생성 결과로 옮길까
- 상위 운영 계약과 로컬 하네스가 충돌하는가
- sync가 필요한가

주요 문서:

- `agents-sync-guide.md`
- `agent-design-patterns.md`
- `team-spec-schema.md`

---

## 4. 스킬 정의와 테스트

다음 질문에 답해야 할 때 먼저 읽는다.

- SKILL.md description과 본문을 어떻게 써야 하는가
- agent 정의와 skill 정의를 어떻게 나눌까
- 어떤 회귀를 테스트로 고정해야 하는가

주요 문서:

- `skill-writing-guide.md`
- `skill-testing-guide.md`

---

## 5. drift / sync / evolve 운영 루프

다음 질문에 답해야 할 때 먼저 읽는다.

- 현재 문제는 drift인가, sync 불일치인가, evolve 필요 상태인가
- update로 봉합할지, 재구성할지, 패턴을 다시 고를지

주요 문서:

- `agents-sync-guide.md`
- `phase-selection-matrix.md`
- `quality-evaluation-guide.md`

---

## 6. Phase 7 품질 비교와 메타시스템 성숙도 평가

다음 질문에 답해야 할 때 먼저 읽는다.

- 지금 생성된 하네스가 실제 운영 가능한 수준인가
- 상위 수준의 메타시스템 축을 갖췄는가
- 부족한 점이 입력 문서 품질 문제인지, 역할 계약 문제인지, 운영 계약 문제인지
- 다음 재진입을 어느 Phase로 돌려야 하는가

주요 문서:

- `meta-system-maturity-guide.md`
- `quality-evaluation-guide.md`
- `target-evaluation-playbook.md`

---

## 7. validator 감사 기준

다음 질문에 답해야 할 때 먼저 읽는다.

- validator가 verify와 어떻게 다른가
- 운영 계약 감사는 무엇을 봐야 하는가
- QA와 validator의 경계를 어떻게 나눌까

주요 문서:

- `qa-agent-guide.md`
- `quality-evaluation-guide.md`
- `meta-system-maturity-guide.md`
- `skill-testing-guide.md`

---

## 8. 문서 작성 기준

다음 질문에 답해야 할 때 먼저 읽는다.

- references 문서 자체를 어떤 용어와 구조로 유지할까
- 내부 설계 문서의 톤과 공통 용어를 어떻게 고정할까

주요 문서:

- `reference-writing-guide.md`

---

## 읽기 순서 기본값

기본 읽기 순서는 아래를 따른다.

1. `reference-map.md`
2. 현재 문제 축에 맞는 기준 문서 1~2개
3. 필요할 때만 예시/비교 문서

예:

- 상태 모드와 재진입 판단:
  - `reference-map.md`
  - `phase-selection-matrix.md`
  - 필요 시 `agents-sync-guide.md`
- phase 7 품질 비교와 성숙도 평가:
  - `reference-map.md`
  - `quality-evaluation-guide.md`
  - `target-evaluation-playbook.md`
  - 필요 시 `meta-system-maturity-guide.md`
- 패턴 선택:
  - `reference-map.md`
  - `agent-design-patterns.md`
  - `team-spec-schema.md`
  - 필요 시 `orchestrator-template.md`
- validator 감사 강화:
  - `reference-map.md`
  - `qa-agent-guide.md`
  - `quality-evaluation-guide.md`
- 메타시스템 성숙도 평가:
  - `reference-map.md`
  - `meta-system-maturity-guide.md`
  - 필요 시 `quality-evaluation-guide.md`

---

## 유지 원칙

- 새 reference를 추가하면 이 맵에도 축과 역할을 같이 적는다.
- 같은 기준 문서를 여러 축에서 재사용할 수 있다.
- references는 늘어나는 것보다, 어떤 축에서 어떤 문서를 읽어야 하는지가 더 중요하다.
