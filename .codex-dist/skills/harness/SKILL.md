---
name: harness
description: "현재 저장소에 맞는 실행 하네스 팀을 설계, 생성, 정렬, 검증할 때 사용하는 메타 스킬입니다. 저장소 재독해를 바탕으로 team-spec, 로컬 agents/skills, 오케스트레이션, QA/운영 감사, 재진입 기준을 함께 다루는 요청에서 트리거합니다. 예: 하네스 구성, 역할 팀 설계, 실행 흐름 재정렬, 운영 기준 보강, 타겟 하네스 운영 감사 판정과 품질 비교. 단일 파일 수정이나 좁은 버그 픽스처럼 하네스 구조 변경이 필요 없는 요청에는 기본적으로 사용하지 않습니다."
---

# Harness — Codex용 Agent Team & Skill Architect

이 스킬은 현재 저장소에 맞는 **프로젝트 로컬 실행 하네스 팀**을 설계하고, 그 팀이 사용할 에이전트 정의와 역할 스킬을 생성하는 `Codex용 Team-Architecture Factory`다.

이 스킬은 도메인 설명과 저장소 근거를 프로젝트별 역할 팀 아키텍처로 바꾸는 메타 스킬이다. Codex에서는 주 에이전트가 오케스트레이션과 통합을 맡고, 독립 입력과 독립 산출이 있는 좁은 작업만 Codex subagent로 위임한다.

저장소를 탐색해 근거를 수집하고, 그 결과를 공통 입력으로 삼아 역할 팀, 운영 구조, QA/검증 흐름, 시작 진입 역할(`run-harness`), 상태 점검 / 정렬 / 개선 루프를 설계한다. 생성 결과의 중심은 `.codex/agents/*`와 `.agents/skills/*`이며, `.harness/docs/*`와 `.harness/logs/*`는 역할 팀이 공유하는 보조 입력과 운영 기록으로 남긴다.

---

## 핵심 원칙

1. 이 스킬은 현재 저장소에 맞는 **프로젝트 특화 실행 하네스 팀**을 만들고, 에이전트 정의와 스킬을 생성한다.
2. 하네스의 본체는 역할 팀 아키텍처다. 문서 수를 늘리는 것이 아니라, 누가 어떤 기준으로 어떤 순서에 따라 일하는지 고정한다.
3. Codex에서는 주 에이전트가 흐름을 잡고, 독립 입력과 독립 산출이 있는 좁은 작업만 서브에이전트로 병렬 위임한다.
4. `AGENTS.md`에는 하네스 포인터와 진입 규칙만 간결하게 남기고, 역할별 목적, 우선 입력, 출력, 다음 역할, 종료 기준, 공통 출력 블록은 `team-spec.md`를 단일 원천으로 둔다. `.codex/agents/*`는 역할 발견과 실행 메타데이터, `.agents/skills/*`는 해당 `team-spec` 역할 섹션을 읽게 하는 얇은 실행 포인터만 맡는다. `.harness/docs/*`는 판단 근거와 운영 기준을 보조한다.
5. 하네스는 고정물이 아니라 진화하는 시스템이다. 실행할 때마다 피드백을 반영해 에이전트 정의, 역할 스킬, 오케스트레이션 문서, `AGENTS.md`를 현재 상태에 맞게 갱신한다.

## 워크플로우

### 워크플로우 상세 (하네스 Phase 0~7)

#### 운영 루프: 상태 점검 / 정렬 / 개선

운영 루프는 특정 하네스 Phase에 속한 하위 절차가 아니라, 전체 하네스 생명주기를 가로지르는 반복 운영 방식이다.

- `상태 점검`: 산출물, 역할 설명, 운영 기준이 서로 맞지 않는 지점을 읽고 재진입 지점을 정한다. 새롭게 드러난 경계, 실패 비용, 도메인 용어도 함께 기록한다.
- `정렬`: 새로 확인된 사실을 `team-spec`, 입력 문서, 운영 문서에 반영해 기준선을 갱신한다. `AGENTS.md`, `.codex/config.toml`, `.codex/agents/*.toml`, `.agents/skills/*`, 보조 운영 문서가 같은 기준을 말하도록 다시 맞춘다.
- `개선`: 반복 패턴, 검증 비용, 다음 역할 병목과 새롭게 드러난 사실을 근거로 역할 팀, 실행 모드, 실행 패턴을 다시 설계한다.

하네스 Phase 0은 이 루프의 상태 점검을 시작하는 진입점이고, 하네스 Phase 5는 정렬을 실행 흐름에 연결하며, 하네스 Phase 6은 운영 감사 판정을 내린다. 하네스 Phase 7은 운영 감사와 실제 피드백에서 나온 개선 후보를 반영한다.

이 루프는 별도 스크립트나 외부 실행기에 의존하지 않는다. 역할 출력, Markdown 로그, 운영 감사 결과에 학습 후보와 승격 대상을 남기고, 주 에이전트가 승인 가능한 문서/스킬 변경으로 반영한다.

시작 진입 역할(`run-harness`)은 이 루프의 진입점이다. 운영 감사 역할은 감사(audit)를 맡고, `skill-scaffolder`는 정렬이 필요한 예외 상황에서만 보조적으로 개입한다.

#### 하네스 Phase 0: 하네스 현황 감사

하네스 스킬이 트리거되면, 실제 생성 전에 현재 저장소의 하네스 현황을 확인한다. 이 단계는 운영 루프 중 `상태 점검`에 해당하며, 전체 생성 또는 부분 재진입의 시작점을 정한다.

1. `AGENTS.md`, `.codex/config.toml`, `.codex/agents/`, `.agents/skills/`, `.harness/docs/`, `.harness/logs/`를 읽는다.
2. 현재 상태를 `신규 구축 / 기존 확장 / 운영 유지보수`로 나누고, 상태에 맞는 시작 하네스 Phase를 정한다.
3. 기존 에이전트/스킬 인벤토리와 `AGENTS.md` 불일치를 감지해 정리한다.
4. 감사 결과를 요약하고, 이번 턴에서 수행할 실행 범위(전체 실행 또는 부분 재진입)를 확정한다.

##### 상태 모드

- `신규 구축`: 에이전트/스킬 자산이 없거나 비어 있는 상태. `하네스 Phase 1`부터 전체 흐름으로 시작한다.
- `기존 확장`: 기존 하네스가 있고 확장/보강이 필요한 상태. `하네스 Phase 선택 매트릭스`에 따라 필요한 하네스 Phase만 재진입한다.
- `운영 유지보수`: 기존 하네스의 감사/수정/동기화가 중심인 상태. 아래 `운영/유지보수 워크플로우`를 먼저 적용한다.

##### 변경 유형

- `에이전트 추가`: `하네스 Phase 1` 건너뜀(`하네스 Phase 0` 결과 활용) -> `하네스 Phase 2` 배치 결정 -> `하네스 Phase 3` 필수 -> `하네스 Phase 4`(전용 스킬 필요 시) -> `하네스 Phase 5`(오케스트레이션 연결 변경 시) -> `하네스 Phase 6` 필수 -> 필요 시 `하네스 Phase 7`
- `스킬 추가/수정`: `하네스 Phase 1` 건너뜀 -> `하네스 Phase 2` 건너뜀 -> `하네스 Phase 3` 건너뜀 -> `하네스 Phase 4` 필수 -> `하네스 Phase 5`(연결 변경 시) -> `하네스 Phase 6` 필수 -> 필요 시 `하네스 Phase 7`
- `아키텍처 변경`: `하네스 Phase 1` 건너뜀 -> `하네스 Phase 2` 필수 -> `하네스 Phase 3`(영향받는 에이전트만) -> `하네스 Phase 4`(영향받는 스킬만) -> `하네스 Phase 5` 필수 -> `하네스 Phase 6` 필수 -> 필요 시 `하네스 Phase 7`

##### 상태 점검 기준

- 역할 스킬 수와 보고서 수가 현재 기본 구조와 크게 달라졌는가
- `.harness/docs/*` 문서가 현재 저장소 구조보다 일반론으로 되돌아갔는가
- 로그 정책과 실제 로그 자산이 서로 다른 운영 모델을 말하고 있는가
- 시작 진입 역할, 흐름 조율 역할, 운영 감사 역할의 설명이 서로 충돌하는가
- 기존 `AGENTS.md`의 상위 운영 기준이 현재 하네스의 진입점, 상태 모드, 실행 모드, 재구성 원칙과 충돌하는가

#### 하네스 Phase 1: 도메인/작업 분석

- 입력: `exploration-notes.md`, `project-setup.md` 또는 사용자 답변
- 산출: `domain-analysis.md`, 저장소 고유 근거, 남아 있는 질문
- 다음 단계 조건: 실제 시작 흐름, 핵심 경계, 실패 비용이 최소한 문서로 고정됨

1. 현재 저장소의 목적, 실행 모델, 핵심 런타임 경계를 **저장소 재독해**로 파악한다.
2. 자동 메모를 그대로 복사하지 않고, 실제 파일 근거와 사용자 입력을 연결해 최종 분석에 필요한 근거를 다시 고른다.
3. 하네스 Phase 0의 감사 결과를 기준으로 기존 로컬 하네스 구조와 충돌을 피한다.
4. 저장소 근거가 적은 경우에도 사용자 요청에 담긴 도메인 설명을 하네스 Phase 1의 정상 입력으로 삼는다. 이 경우 `project-setup.md`에는 최소한 도메인 또는 만들 제품, 목표 사용자나 운영 주체, 첫 성공 시나리오, 품질 실패 비용이 큰 지점, 아직 코드가 없어 보류한 구현 경계, 코드나 설정이 생긴 뒤 재진입할 하네스 Phase를 기록하고, 파일 근거 부족은 보류 판단으로 남긴다.
5. 탐색만으로 부족한 부분은 사용자에게 확인할 질문으로 분리한다. 질문은 길게 늘리지 말고 `무엇을 만들지`, `첫 성공 시나리오`, `가장 위험한 실패 비용` 중심으로 1~3개만 묻는다.

이 단계의 결과는 실행 하네스 팀의 출발점이 된다.  
분석 기준은 `references/reference-map.md`를 먼저 읽고, `references/agent-design-patterns.md`, `references/exploration-model.md`, `references/agents-sync-guide.md`, `references/phase-selection-matrix.md` 중 현재 문제 축에 맞는 문서를 골라 참고한다.

#### 하네스 Phase 2: 프로젝트 맞춤 에이전트 팀 설계

- 입력: `domain-analysis.md`, 입력 상태, 상태 모드, 실행 모드, 실행 패턴 후보
- 산출: `harness-architecture.md`, `team-structure.md`, 선택된 실행 패턴과 역할 경계, `team-spec`
- 다음 단계 조건: 역할 경계, 다음 역할 기준, 패턴 선택 이유, 동적 생성용 역할 스펙이 운영 기준과 함께 고정됨

##### 하네스 Phase 2 범위

하네스 Phase 2는 역할 팀을 설계하고 `team-spec`을 단일 원천으로 고정하는 단계다. 에이전트 TOML이나 역할 스킬 파일을 직접 작성하는 단계는 아니다. 그 작업은 하네스 Phase 3과 하네스 Phase 4에서 수행한다.

`team-spec`에는 역할 인벤토리, 역할 경계, 실행 패턴, 시작/조율/QA/운영 감사 책임, 공통 출력 블록, 학습 후보 기록 규칙처럼 생성에 필요한 계약을 남긴다. 역할별 상세 작성법과 검증 절차는 `references/team-spec-contract.md`, `references/team-spec-schema.md`, `references/skill-writing-guide.md`, `references/verification-checklist.md`를 따른다. 하네스 Phase 2에는 설계 범위만 남긴다.

##### 아키텍처 패턴

여섯 가지 팀 아키텍처 패턴을 Codex 런타임에 맞게 해석해 고른다.

- `파이프라인`: 순차 의존 작업. 저장소 입력 문서 → 구조 설계 → QA 기준 → 운영 감사처럼 앞 단계 출력이 뒤 단계 입력이 될 때 사용한다.
- `팬아웃/팬인`: 독립 영역을 나눠 분석한 뒤 주 에이전트가 통합할 때 사용한다. Codex에서는 subagent 간 직접 통신이 없으므로 통합 책임을 주 에이전트나 중심 조율 역할에 둔다.
- `전문가 풀`: 요청 유형이나 저장소 경계에 따라 필요한 역할만 선택할 때 사용한다.
- `생성-검증`: 역할 스킬이나 운영 문서를 만든 직후 QA/운영 감사 관점으로 되돌려 검토할 때 사용한다.
- `감독자`: 중심 조율 역할이 작업 상태와 다음 역할을 계속 판단해야 할 때 사용한다.
- `계층적 위임`: 큰 문제를 하위 경계로 나눌 수 있을 때 사용하되, Codex에서는 깊은 중첩 위임을 피하고 한 단계 보조 위임 뒤 주 에이전트가 다시 통합한다.

##### 실행 모드

- `주 에이전트 중심 실행`: 핵심 역할 선택, 문서 갱신, 로그 정리, 최종 통합을 주 에이전트가 책임지는 기본 방식이다.
- `병렬 보조 위임`: 입력과 출력이 독립적인 보조 분석, 검증, 비교 작업에만 제한적으로 사용한다.
- `단일 보조 위임`: 입력과 출력이 좁고 독립적인 단일 작업일 때만 예외적으로 사용한다.

실행 모드와 상태 모드는 별개다. 예를 들어 `기존 확장` 상태라도 주 에이전트 중심으로 전체 흐름을 다시 잡을 수 있고, `운영 유지보수` 상태라도 범위를 좁혀 단일 보조 위임으로 시작할 수 있다.

1. 이 프로젝트에 필요한 역할 팀 구성을 결정한다.
2. 고정 역할 복사가 아니라, 이 프로젝트에 필요한 특화 역할 이름과 책임을 설계한다.
3. 어떤 역할이 중심이고, 어떤 역할이 보조인지 적는다.
4. 장기 운영 구조는 팀 역할을 앞에 두고, 좁은 보조 해석만 따로 위임할지 함께 정리한다.
5. 파이프라인, 팬아웃/팬인, 전문가 풀, 생성-검증, 감독자, 계층적 위임 중 현재 요청과 경계에 맞는 패턴을 고른다.
6. 요청이 추상적인지, 저장소 고유 용어와 범위가 충분한지 보고 질문을 앞에 둘지 바로 역할 시작할지 적는다.
7. 팀 흐름을 조율하는 중심 역할과 팀을 실제로 시작시키는 진입 역할을 각각 설계한다.
8. 운영 감사와 품질 전략이 별도 책임으로 읽히도록 역할 경계를 분리한다.
9. 각 역할의 식별자, 책임, 입력/출력, 다음 역할, 실행 설정, 완료 기준을 `team-spec`에 정리한다. 상세 필드와 작성 순서는 `references/team-spec-contract.md`와 `references/team-spec-schema.md`를 따른다.
10. 역할 목적, 책임, 주요 출력과 우선 입력 문서의 정합성은 `references/team-spec-contract.md`의 생성 규칙과 `references/team-spec-schema.md`의 역할별 실행 기준을 단일 상세 기준으로 따른다.
11. 설계/정책/사양 문서는 team-spec 상단의 `설계 원천 우선순위` 또는 `설계 원천 인벤토리`에 포함하고, 운영 로그와 세션 요약 같은 재진입 문서는 설계 원천 우선순위에 넣지 않는다.
12. team-spec 상단에는 왜 그 역할명이 현재 저장소의 도메인과 실패 경계를 더 잘 설명하는지 도메인 근거를 함께 남긴다.
13. 새 역할명을 만들 때는 저장소 용어와 실패 경계를 드러내는 이름을 우선하고, `role_id`는 snake_case, 표시 이름과 파일명은 kebab-case로 정리한다.
14. `analyst`, `architect`, `orchestrator`, `validator` 같은 추상 직무명만 단독으로 역할명에 쓰지 않고, 반드시 저장소 고유 용어나 책임 축을 붙인다.
15. `## 최종 역할 인벤토리`는 반드시 fenced `text` 블록으로 남긴다. 헤더와 모든 역할 행은 같은 블록 안에 있어야 하며, inline code 행을 여러 줄 나열한 결과는 하네스 Phase 2 미완료로 본다.

이 단계의 핵심은 문서를 늘리는 데 있지 않다. **운영 가능한 역할 팀 아키텍처**를 설계하는 데 있다.
흐름과 위임 기준은 `references/reference-map.md`를 먼저 읽고, `references/initial-generation-contract.md`, `references/orchestrator-template.md`, `references/team-spec-schema.md`를 필요할 때 참고한다.

#### 하네스 Phase 3: 에이전트 정의 생성

- 입력: `하네스 Phase 2`가 만든 `team-spec`, `harness-architecture.md`, `team-structure.md`
- 산출: `AGENTS.md`, `.codex/config.toml`, `.codex/agents/*.toml`
- 다음 단계 조건: team-spec과 에이전트 정의 결과가 일치하고, 시작 진입 역할(`run-harness`)과 흐름 조율 역할, QA/운영 감사 역할의 책임 경계가 분리됨

1. team-spec에 정의된 역할 인벤토리를 기준으로 에이전트 정의를 확정한다.
2. 역할 식별과 실행 설정은 `.codex/agents/*.toml`에 두고, 역할 설명 문서와 분리한다.
3. 역할 이름, 파일명, sandbox 정책, description은 team-spec을 구현하는 형태로 쓴다.
4. 시작 진입 역할(`run-harness`)이 실제 기동 엔트리포인트로 읽히도록 정의한다.
5. QA 역할과 운영 감사 역할을 에이전트 단계에서 명시하고, 검증 관점과 감사 책임을 역할 정의에 포함한다.
6. `.codex/agents/*.toml`의 `developer_instructions`에는 해당 역할의 `team-spec` 섹션을 단일 원천으로 따른다는 지시만 두고, 역할별 우선 입력, 절차, 다음 역할, 종료 기준을 반복하지 않는다.

에이전트 정의 기준은 `references/reference-map.md`, `references/team-spec-schema.md`, `references/qa-agent-guide.md`를 순서대로 참고한다.

#### 하네스 Phase 4: 로컬 역할 스킬 생성

- 입력: `하네스 Phase 3` 에이전트 정의, `team-spec`, `harness-architecture.md`
- 산출: `.agents/skills/*` 역할별 `SKILL.md`
- 다음 단계 조건: 역할별 실행 기준은 `team-spec`에 남고, 스킬 본문은 해당 역할 섹션과 공통 출력 블록을 명확히 참조함

1. team-spec과 에이전트 정의에 맞춰 역할별 로컬 `SKILL.md`를 만든다.
2. 각 역할의 `SKILL.md`는 얇은 역할 포인터로 유지한다.
3. `SKILL.md`에는 역할명과 description, 먼저 읽을 `team-spec.md`의 `role_id` 섹션, 역할 세부 기준을 복제하지 말라는 지시, 종료 시 따를 `team-spec` 공통 출력 블록 지시만 둔다.
4. 역할별 작업 절차, 우선 입력, 출력, 다음 역할, 종료 기준, 공통 출력 블록은 `team-spec.md`에 둔다.
5. `SKILL.md`나 `.codex/agents/*.toml`에 역할별 우선 입력, 절차, 다음 역할을 반복 복제하지 않는다.
6. team-spec에 없는 역할 스킬은 생성하지 않는다.

`skill-scaffolder`는 핵심 보고서 작성 흐름의 기본 단계가 아니다. 이 역할은 로컬 스킬 설명 불일치, 구조 문구 불일치, 스킬 규칙 재정렬이 필요할 때만 보조적으로 사용한다.

스킬 작성 기준은 `references/reference-map.md`, `references/initial-generation-contract.md`, `references/skill-writing-guide.md`, `references/team-spec-schema.md`를 순서대로 참고한다.

#### 하네스 Phase 5: 통합 및 오케스트레이터 구성

- 입력: `team-spec`, 에이전트 정의, 역할 스킬, 저장소 입력 문서, QA 기준, 현재 실행 모드와 패턴
- 산출: 시작 진입 역할(`run-harness`), 중심 조율 역할, 역할 handoff 규칙, 정상/보류/실패 흐름
- 다음 단계 조건: 시작 진입 역할이 현재 상태를 읽고 다음 역할 또는 하네스 재진입 Phase를 일관되게 안내할 수 있음

1. 시작 진입 역할에서 어떤 조건으로 어떤 역할을 시작할지 분기 규칙을 확정한다.
2. 역할 간 handoff 입력/출력 형식과 다음 역할 판정 기준을 명시한다.
3. 기존 확장/운영 유지보수 재진입 시나리오를 오케스트레이션 흐름에 포함한다.
4. 실패/보류/재시도 상황에서 되돌아갈 하네스 Phase와 책임 역할을 명확히 적는다.
5. 마지막 종료 세션이 `session-log.md`와 `latest-session-summary.md`에 남도록 운영 루틴을 고정한다.
6. 역할 스킬이 작성해야 하는 보조 문서가 있다면, 그 문서의 목적과 담당 역할을 오케스트레이션 흐름 안에서만 정의한다.
7. `.harness/docs/*` 문서가 생성되거나 수정되면 같은 세션 로그에도 반영 역할, QA 관점, 남은 위험을 함께 남긴다.
8. 기존 하네스 문서를 보존하면서 역할명이나 진입점이 새 `team-spec`과 다르면, 원문을 바로 고치기보다 `orchestration-plan.md`나 `team-playbook.md`에 이전 역할명 -> 현재 역할명 호환성 매핑과 우선 기준을 남긴다.
9. GitHub Workflow Engine을 타겟 레포에 적용하는 경우 `.harness/workflow-engine.json`에 `dependencies.commit.available`, `review.defaultMode`, `review.modes`를 기록한다. 각 리뷰 실행 모드에는 하네스 설치 또는 갱신 시 확인한 `available` 값을 남긴다.

이 단계의 목적은 문서 묶음을 완성하는 것이 아니다. 생성된 역할 팀이 실제 요청에서 어떤 순서로 움직이고, 어디서 멈추며, 어떤 기준으로 다시 들어갈지를 실행 가능한 형태로 고정하는 것이다.

오케스트레이션 기준은 `references/reference-map.md`, `references/orchestrator-template.md`, `references/reentry-rules.md`를 순서대로 참고한다.

#### 하네스 Phase 6: 검증 및 운영 감사

- 입력: 에이전트 정의, 역할 스킬, team-spec, 오케스트레이션 흐름, 로그 상태
- 산출: 구조 검증 결과, 누락/충돌 목록, `운영 가능 / 재작성 필요 / 재구성 필요` 판정, 재진입 권장 하네스 Phase
- 다음 단계 조건: 운영 감사 역할이 현재 하네스의 정합성과 재진입 필요 여부를 설명할 수 있음

1. `team-spec`의 역할 인벤토리와 `.codex/agents/*`, `.agents/skills/*`가 같은 역할 집합을 말하는지 확인한다.
2. 시작 진입 역할, 중심 조율 역할, QA 역할, 운영 감사 역할의 책임이 서로 겹치지 않는지 본다.
3. 정상 흐름, 보류 흐름, 실패 흐름, 재진입 흐름이 오케스트레이션에 모두 남아 있는지 확인한다.
4. `.harness/docs/*`가 역할 자산을 대신하는 골격 문서로 남아 있지 않은지 검토한다.
5. 모든 역할 스킬이 `team-spec`의 해당 역할 섹션과 공통 출력 블록을 명확히 참조하는지 확인한다. 참조가 없거나 역할 세부 기준을 복제했다면 `운영 가능`으로 판정하지 않고 `하네스 Phase 4` 재작성 대상으로 분류한다.
6. 역할별 `우선 입력`의 설계/정책/사양 문서가 `team-spec` 상단의 `설계 원천 우선순위` 또는 `설계 원천 인벤토리`에 빠짐없이 포함됐는지 확인한다.
7. 역할 목적, 책임, 주요 출력과 우선 입력 문서가 `team-spec` 상세 기준에 맞게 정합적인지 확인한다.
8. 실행 로그와 최신 세션 요약이 다음 실행의 입력으로 읽힐 수 있는지 확인한다.
9. GitHub Workflow Engine을 타겟 레포에 적용하는 경우, `../github-workflow-engine/references/github-templates.md` 원형과 타겟 `.github/ISSUE_TEMPLATE/*.md`, `.github/pull_request_template.md`의 title prefix, label, 필수 섹션, PR 연결 규칙 정합성을 확인한다.
10. 부족한 축이 `team-spec` 역할 정의 문제인지, agent/skill 포인터 문제인지, 오케스트레이션 문제인지, GitHub 템플릿 정합성 문제인지 분류한다.
11. `운영 가능 / 재작성 필요 / 재구성 필요` 판정은 여기서 내린다. 피드백을 실제 문서나 역할 자산에 반영하는 작업은 하네스 Phase 7에서 다룬다.

검증 기준은 `references/reference-map.md`, `references/initial-generation-contract.md`, `references/verification-checklist.md`, `references/qa-agent-guide.md`, `references/skill-testing-guide.md`를 순서대로 참고한다.

#### 하네스 Phase 7: 하네스 피드백 반영

- 입력: 오케스트레이션 실행 로그, QA/운영 감사 피드백, `with-skill` / `without-skill` 비교 관찰
- 산출: 피드백 반영 변경점, 품질 비교 관찰, 다음 하네스 재진입 Phase 제안, 학습 후보와 승격 대상
- 다음 단계 조건: 피드백이 에이전트 정의, 역할 스킬, 운영 문서에 반영되고 다음 실행에서 바로 재사용 가능한 상태

1. 실행 로그와 QA/운영 감사 피드백을 기준으로 구조/규칙/문서 변경점을 분리한다.
2. `without-skill` 기준선과 비교해 시작 역할 판단, 질문 절제, 다음 역할 안내, 저장소 근거 연결이 실제로 개선됐는지 확인한다.
3. 부족한 축이 입력 문서 품질 문제인지, 역할 규칙 문제인지, 오케스트레이션 문제인지 분류한다.
4. 필요한 경우 다음 재진입 시작점을 `하네스 Phase 1`~`하네스 Phase 6` 중 어디로 둘지 다시 제안한다.
5. 새로 확인한 저장소 사실, 반복될 수 있는 판단, 하네스 갱신 후보, 생성기 환류 후보를 `evolution-contract.md` 기준으로 나눈다.
6. 타겟 로컬 보강으로 충분한 항목은 `team-spec`, 역할 스킬, 운영 문서, 로그 중 어디에 반영할지 지정한다.
7. 여러 타겟 프로젝트에서 반복될 가능성이 있는 항목만 전역 `SKILL.md` 또는 reference 보강 후보로 남긴다.
8. 생성기 자체 준비도는 `generator-readiness-checklist.md`로 점검한다. 타겟 하네스 운영 감사 판정은 실제 생성 결과가 있는 타겟 프로젝트에서만 남긴다.
9. 하네스 Phase 7은 하네스 Phase 6의 운영 감사 자체를 반복하는 단계가 아니다. 이미 드러난 피드백과 비교 관찰을 반영해 다음 실행 품질을 높이는 단계다.

이 단계는 결과 보고가 아니다. 다음 실행 품질을 높이기 위한 메타시스템 업데이트 단계다.

## 작성 언어 원칙

- 프로젝트 내부 `.harness/*` 문서와 로그 본문은 특별한 요청이 없으면 한글로 쓴다.
- 보고서 파일명은 `domain-analysis.md` 같은 기존 영문 파일명을 유지하되, 본문과 항목명은 한글을 기본값으로 둔다.
- 프로젝트에 이미 명시된 문서 언어 규칙이 있다면 그 규칙을 앞에 두되, 별도 규칙이 없으면 한글 작성이 기본이다.
- 한국어만으로 뜻이 모호한 기술 용어는 영어 용어를 괄호 안에 병기한다. 예를 들어 audit 뜻의 `감사`는 `감사(audit)` 또는 `감사(audit)를 수행한다`로 쓰고, 감사 인사로 오해될 수 있는 종결 표현은 피한다.
- 생성되는 타겟 문서와 로그도 같은 용어 원칙을 따른다. 하네스 생명주기 단계는 `하네스 Phase N`으로 쓰고, 제품/로드맵/개발 단계는 `제품 로드맵 Phase N`, `블로그 개발 Phase N`처럼 의미 영역을 붙인다.

## 실행 기준

이 스킬이 트리거됐다고 해서 임의 방식으로 파일을 만들면 안 된다.

아래 문서들은 현재 `harness` 스킬 디렉터리 기준 상대 경로다.

- `references/team-spec-contract.md`
- `references/initial-generation-contract.md`
- `references/logging-contract.md`
- `references/reentry-rules.md`
- `references/verification-checklist.md`
- `references/evolution-contract.md`

- 최초 하네스 구성 요청이면 `하네스 Phase 0` 감사 뒤에 시작 진입 역할(`run-harness`)이 `exploration-notes.md`, `project-setup.md`, `team-spec.md`, `logging-policy.md` 같은 시작 문서를 먼저 준비한다. `logging-policy.md`는 삭제 가능한 예전 스크립트 안내가 아니라, 현재 하네스가 따를 Markdown 로그 계약 문서다.
- 시작 문서가 생성된 상태는 완료가 아니라 자동 판단 보류 메모와 역할 입력이 준비된 상태로 본다.
- `하네스 Phase 2`는 `team-spec.md`의 최종 역할 인벤토리를 fenced `text` 블록으로 만들고, `하네스 Phase 3`은 `.codex/config.toml`, `.codex/agents/*.toml`을, `하네스 Phase 4`는 `.agents/skills/*`를 작성해야 한다.
- `하네스 Phase 5`는 시작 진입 역할과 오케스트레이션 흐름을 연결하고, `하네스 Phase 6`은 운영 감사 역할이 구조와 실행 가능성을 검증한다.
- GitHub Workflow Engine을 타겟 레포에 적용하는 경우 `하네스 Phase 5`에서 `.harness/workflow-engine.json`을 만들거나 갱신하고, `dependencies.commit.available`과 리뷰 실행 모드별 사용 가능 상태를 기록한다.
- `.codex/config.toml`과 `.codex/agents/*.toml`은 별도 진실원천이 아니라 `team-spec.md`를 구현한 결과물이다.
- 세션 기록은 `references/logging-contract.md`를 따라 `.harness/docs/logging-policy.md`, `.harness/logs/session-log.md`, `.harness/logs/latest-session-summary.md`가 같은 계약을 말하도록 남긴다.
- 신규 구축에서는 `references/initial-generation-contract.md`를 따라 초기 생성물 안에 학습 후보 기록 위치, 승격 대상 기준, 다음 하네스 재진입 Phase를 반드시 남긴다.
- 세션 시작 기록에는 최소한 `세션 ID`, `시작 요청`, `진입점`, `계획 역할`, `예상 산출물`을 남긴다.
- 각 역할 또는 subagent 완료 뒤에는 호출 역할, 결과 상태, 입력/출력 요약, 변경 파일, 남은 위험을 같은 세션 기록에 누적한다.
- 역할 출력이나 세션 로그에는 필요 시 `evolution-contract.md` 기준의 학습 후보, 반복 신호, 승격 대상, 생성기 환류 후보를 남긴다.
- 생성된 로그 정책 문서와 로그 예시는 별도 스크립트, TSV 이벤트 파일, 자동 append 도구를 필수 전제로 삼지 않는다.
- 비동기 subagent는 최종 완료 전에 모두 `completed` 또는 `timed_out`으로 정리한다. 늦게 끝난 결과는 후속 로그 보강 대상으로 남긴다.
- 하네스 구성이 끝났다고 판단하기 전에 운영 감사 역할이 `references/verification-checklist.md`를 기준으로 현재 상태를 검토해야 한다.
- 최종 응답 전에는 `latest-session-summary.md`에 다음 시작 역할, 다음 하네스 재진입 Phase, 다시 읽을 입력, 최근 출력을 남긴다.
- `기존 확장`과 `운영 유지보수`는 별도 갱신 명령이 아니라 `references/reentry-rules.md`를 따라 필요한 하네스 Phase부터 다시 들어가는 방식으로 다룬다.
- `초기` 입력 상태에서는 질문과 `project-setup.md` 작성을 앞에 두고, `제한적` 상태에서는 역할 스킬이 저장소를 다시 읽으며 문서를 작성한다.
- 시작 문서나 골격 문서는 완성본으로 간주하지 않고, 완료 전에 반드시 저장소 사실, 기존 도메인 언어, 운영 흐름에 맞게 역할 관점으로 다시 확인한다.
- `.harness/docs/*` 문서는 역할 팀과 오케스트레이션을 보조해야 하며, 문서 초안만으로 완료 처리하지 않는다.
- 생성 문서와 예시에는 사용자 홈 디렉터리나 절대경로를 하드코딩하지 않는다. 실행 예시는 상대경로나 저장소 기준 경로를 쓴다.
- 생성되는 타겟 문서에서 하네스 생명주기 단계는 반드시 `하네스 Phase N`으로 쓰고, 저장소의 제품/로드맵/개발 단계는 `제품 로드맵 Phase N`, `블로그 개발 Phase N`처럼 도메인 수식어를 붙인다. 두 의미를 모두 `Phase N`으로만 쓰면 운영 감사에서 문서 충돌로 본다.

## 탐색 우선 원칙

이 스킬은 자동 경로 수집보다 역할 재해석을 앞에 두는 메타 프레임워크다.

- `package.json`, `Cargo.toml`, 디렉터리 이름 같은 파일 단서는 자동 확정이 아니라 다시 읽을 출발점 정도로만 사용한다.
- 언어, 실행 모델, 경계, 주요 흐름, 검증 비용은 역할 스킬이 실제 저장소와 사용자 입력을 다시 읽고 적는다.
- 리포트와 역할 설계는 자동 메모를 복사하지 않는다. 역할 재해석을 거친 뒤 결과형 문서로 남긴다.
- 저장소 재독해 없이 나온 일반론 문서는 품질 저하로 본다.

### 탐색 결과 모델

탐색 메모는 최소한 다음을 남겨야 한다.

- 자동 판단을 보류한다는 전제
- 사용자 입력 존재 여부
- 역할 스킬이 저장소를 다시 읽어야 한다는 메모
- 다음 확인 질문

이 메모는 이후 역할 팀과 문서의 보조 입력으로 쓴다.

### 입력 상태

입력 상태는 다음 두 가지로 정리한다.

- `초기`: `project-setup.md`나 사용자 답변이 없어 자동 메모만 있는 상태. 역할 단정보다 질문과 입력 작성이 앞에 놓인다.
- `제한적`: 사용자 입력이나 `project-setup.md`가 있어 방향을 좁힐 수 있지만, 최종 판단은 역할 스킬이 저장소를 다시 읽은 뒤 내려야 하는 상태.

이 상태는 역할 결정, 갱신 범위, 검증 강도를 맞추는 공통 제어 입력이다. 저장소 근거가 적더라도 사용자 도메인 설명이 있으면 `제한적` 입력으로 보고 하네스 Phase 1을 진행한다.

## 운영/유지보수 워크플로우

- 새 프로젝트 하네스 구성: `하네스 Phase 0` 감사 → 시작 입력 정리 → 역할 팀 설계 → 에이전트/스킬 생성 → 오케스트레이션 연결 → 운영 감사 역할 검토
- 기존 프로젝트 확장: 하네스 현황 감사 → 필요한 하네스 Phase 선택 → 영향받는 에이전트/스킬/오케스트레이션 갱신 → 운영 감사 역할 검토
- 기존 프로젝트의 구조 누락 정리: 하네스 현황 감사 → 필요한 경우 명시적 재구성 또는 초기 하네스 Phase 재진입 → 역할 자산과 오케스트레이션 정렬 → 운영 감사 역할 검토
- 기존 프로젝트의 운영 유지보수/감사: 하네스 현황 감사 → 필요한 하네스 Phase 재진입 → 역할 자산, 운영 문서, 로그 정렬 → 운영 감사 역할 검토

운영 유지보수에서는 아래 루프를 반복한다.

- 상태 점검: 현재 약해진 문서/역할/규칙을 읽는다.
- 정렬: 상위 운영 기준과 로컬 하네스 자산을 다시 맞춘다.
- 개선: 반복 패턴과 병목을 근거로 팀 구조나 패턴 선택을 다시 고른다.

---

## 생성 대상

이 스킬은 현재 저장소 안에 다음을 만들거나 다시 쓴다.

### 프로젝트 로컬 역할 스킬

- `.agents/skills/<team-spec의 agent_file>/SKILL.md`
- 각 스킬은 `하네스 Phase 2`가 설계한 프로젝트 특화 역할 하나를 맡는다.
- 생성기는 역할 개수를 미리 가정하지 않고, `team-spec`의 최종 역할 인벤토리만 읽는다.
- 중심 조율 역할 또는 시작 진입 역할은 오케스트레이터 역할을 맡는다. Codex에서는 팀원 간 직접 메시지 대신 파일 기반 handoff, 세션 로그, 주 에이전트 통합 규칙을 명시한다.

### 프로젝트 로컬 에이전트 정의

- `AGENTS.md`
- `.codex/config.toml`
- `.codex/agents/<team-spec의 agent_file>.toml`
- 역할 수와 파일 목록은 `하네스 Phase 2`가 설계한 팀 스펙에 따라 달라진다.

`AGENTS.md`는 상위 진입 규칙을, `.codex/agents/*.toml`은 역할 발견과 실행 메타데이터를, `.agents/skills/*`는 해당 `team-spec` 역할 섹션으로 연결하는 실행 포인터를 담당한다.

### 보조 운영 문서와 로그

- `.harness/docs/exploration-notes.md`
- `.harness/docs/domain-analysis.md`
- `.harness/docs/qa-strategy.md`
- `.harness/docs/harness-architecture.md`
- `.harness/docs/orchestration-plan.md`
- `.harness/docs/team-structure.md`
- `.harness/docs/team-playbook.md`

보조 운영 문서와 로그는 아래처럼 구분한다.

- `exploration-notes.md`: 자동 판단 보류를 위한 약한 메모
- `domain-analysis.md`, `qa-strategy.md`: 저장소 입력 문서
- `harness-architecture.md`, `orchestration-plan.md`, `team-structure.md`, `team-playbook.md`: 오케스트레이터와 운영 감사 역할이 읽는 보조 운영 문서

초기 구성은 자동 판단 보류 메모와 최소 운영 기준만 만든다. 나머지 문서는 역할 스킬과 오케스트레이터가 필요할 때 직접 작성한다.

## 완료 기준

하네스 구성이 끝났다고 말하려면 아래 조건을 모두 만족해야 한다.

1. `exploration-notes.md`가 자동 판단 보류를 위한 약한 메모로 존재한다.
2. `team-spec.md`가 프로젝트 특화 역할 인벤토리와 역할 경계를 설명한다.
3. `.codex/agents/*`와 `.agents/skills/*`가 `team-spec`의 역할 집합을 구현한다.
4. 시작 진입 역할(`run-harness`)이 현재 상태를 읽고 시작 역할, 다음 역할, 미해결 질문을 분명히 제시할 수 있다.
5. 오케스트레이션 흐름이 정상, 보류, 실패, 재진입 상황을 모두 다룬다.
6. 운영 감사 역할이 `references/verification-checklist.md` 기준으로 구조 누락과 골격 잔존이 없다고 설명할 수 있다.
7. GitHub Workflow Engine을 적용한 경우 `.harness/workflow-engine.json`에 `dependencies.commit.available`, `review.defaultMode`, `review.modes`가 기록돼 있다.
8. 마지막 실행 세션이 `.harness/logs/session-log.md`, `.harness/logs/latest-session-summary.md`에 같은 세션 ID로 남아 있다.
9. 모든 필수 역할과 subagent가 `completed` 또는 `timed_out`으로 정리되고, `timed_out` 또는 `failed` 항목은 남은 위험과 후속 보강 대상으로 기록돼 있다.
10. 운영 감사 역할이 새 학습 후보의 반영 위치를 설명하거나, 이번 작업에는 학습 후보가 없다고 명시할 수 있다.
11. 신규 구축 결과는 `references/initial-generation-contract.md` 기준으로 첫 세션부터 자기진화 루프를 이어 갈 수 있다고 설명할 수 있다.

시작 문서가 준비된 상태는 완료가 아니다. **자동 판단 보류 메모와 역할 입력이 준비된 상태**다.

---

## 산출물 체크리스트

작업 후 최소한 다음을 확인한다.

- [ ] 로컬 역할 스킬 구조가 생성되었다.
- [ ] 중심 조율 역할 또는 오케스트레이터 역할이 포함되어 있다.
- [ ] 시작 진입 역할이 포함되어 있다.
- [ ] 품질 전략과 운영 감사 역할이 포함되어 있다.
- [ ] 실행 하네스 팀이 프로젝트에 맞는 아키텍처 패턴으로 구성되어 있다.
- [ ] 정상 흐름과 보류/실패 흐름 시나리오가 오케스트레이션 문서나 시작 진입 역할에 포함되어 있다.
- [ ] GitHub Workflow Engine을 적용한 경우 `.harness/workflow-engine.json`에 `dependencies.commit.available`과 리뷰 실행 모드 사용 가능 상태가 기록되어 있다.
- [ ] 보조 문서와 로그가 역할 자산과 오케스트레이션을 보조한다.
- [ ] 이후 프로젝트 특화 실행 하네스로 확장할 수 있는 구조다.
- [ ] 현재 상태를 운영 가능 / 재작성 필요 / 재구성 필요 중 하나로 설명할 수 있다.
- [ ] 학습 후보와 승격 대상을 남길 위치가 있으며, 스크립트나 외부 의존성 없이 다음 실행에 반영할 수 있다.
- [ ] 신규 구축 결과라면 초기 생성물만 읽어도 다음 시작 역할, 다음 하네스 재진입 Phase, 학습 후보 기록 위치를 알 수 있다.

---

## 참고 문서

- `references/reference-map.md`
- `references/generator-readiness-checklist.md`
- `references/agent-design-patterns.md`
- `references/orchestrator-template.md`
- `references/skill-writing-guide.md`
- `references/skill-testing-guide.md`
- `references/team-spec-contract.md`
- `references/initial-generation-contract.md`
- `references/evolution-contract.md`
- `references/logging-contract.md`
- `references/reentry-rules.md`
- `references/verification-checklist.md`
- `references/qa-agent-guide.md`
- `references/team-examples.md`
- `references/team-spec-schema.md`
- `references/target-evaluation-playbook.md`

이 문서들은 실행 하네스 팀을 더 잘 설계하고 다시 쓰기 위한 지식 베이스다.
이 참고 문서들은 `Codex 중심 메타 프레임워크`의 설계 규칙 집합 역할도 함께 맡는다.
생성기는 이 레퍼런스의 패턴과 예시를 현재 저장소의 `team-spec`과 재독해 결과에 맞게 해석해 작성한다.
