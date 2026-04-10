# Team Spec Schema

이 문서는 `Phase 2 프로젝트 맞춤 에이전트 팀 설계`의 핵심 산출물인 `team-spec`이 무엇을 담아야 하는지 정의한다.

목표는 고정 역할 목록을 복사하는 것이 아니라,  
타겟 프로젝트 도메인을 읽고 그 프로젝트에 필요한 특화 에이전트 팀을 설계한 뒤,  
그 설계 결과를 `Phase 3`에서 실제 `.codex/agents/*.toml`, `.codex/skills/*`, `.codex/config.toml` 생성으로 연결하는 것이다.

---

## 1. team-spec의 역할

team-spec은 단순 설명 문서가 아니다.

- 어떤 역할이 필요한가
- 왜 그 역할이 필요한가
- 각 역할이 무엇을 입력으로 받고 무엇을 출력하는가
- 어떤 handoff 구조로 이어지는가
- 어떤 역할이 중심이고 어떤 역할이 보조인가
- 어떤 파일명으로 Codex agent 정의를 생성할 것인가

를 고정하는 생성용 스펙이다.

즉 `Phase 2`의 결과는 보고서만이 아니라,  
`Phase 3 동적 생성`의 직접 입력이어야 한다.

---

## 2. 최소 필드

team-spec은 최소한 아래 정보를 가져야 한다.

### A. 팀 메타데이터

- 저장소/프로젝트 요약
- 선택된 실행 모드
- 선택된 실행 패턴
- 현재 상태 모드
- 팀 설계 이유

### B. 역할 목록

각 역할마다 최소한 아래를 가진다.

- 역할 id
- 역할 표시 이름
- 역할 목적
- 역할 책임
- 주요 입력
- 주요 출력
- handoff 대상
- 중심 역할 여부
- 보조 역할 여부

역할 스펙은 단순 제목 나열이 아니라, 적어도 한 개 이상의 완전한 역할 카드가 들어 있어야 한다.
즉 `역할 id:` 같은 빈 템플릿 줄만 남아 있는 상태를 완료로 보면 안 된다.

### C. Codex 생성 정보

각 역할마다 실제 생성에 필요한 정보도 가진다.

- agent 파일명
- skill 디렉토리명
- description 초안
- sandbox 정책
- 권장 모델 클래스
- role description 초안

또한 생성기는 team-spec 안의 기계 판독 블록도 읽을 수 있어야 한다.
현재 기본 형식은 아래와 같다.

`role_id|display_name|agent_file|model|reasoning|sandbox|description`

형식 규칙은 아래를 기본으로 한다.

- `role_id`: snake_case
- `display_name`: kebab-case 또는 사람이 읽는 짧은 역할명
- `agent_file`: kebab-case
- seed 역할 유지 여부와 대체 관계는 기계 블록 밖의 설명 섹션에도 남긴다

### D. 운영 계약

- 기본 시작 역할
- 요청 유형별 시작 역할 분기
- 재진입 규칙
- validator 개입 시점
- 재구성 조건

---

## 3. 중요한 원칙

- role 이름은 고정 seed 이름을 그대로 재사용할 수도 있지만, 그래야 할 의무는 없다.
- 타겟 프로젝트 도메인이 더 직접적인 이름을 요구하면 새 역할명을 만든다.
- 예를 들어 결제 시스템이면 `payment-dev`, `billing-reviewer`, `checkout-qa` 같은 이름이 더 적절할 수 있다.
- Electron 런타임 중심 프로젝트면 `desktop-runtime-dev`, `ipc-reviewer` 같은 이름이 더 적절할 수 있다.
- 즉 `domain-analyst`, `qa-designer` 같은 범용 이름은 seed 또는 fallback일 뿐, 최종 정답이 아니다.
- 따라서 team-spec 상단에는 왜 seed 이름을 유지하거나 버렸는지 설명하는 도메인 근거가 있어야 한다.
- 이름은 멋있어 보이는 추상어보다, 실제 저장소 용어와 실패 경계를 드러내는 쪽이 우선이다.
- 같은 역할을 `payment_dev`, `payment-dev`, `payments-dev`처럼 섞어 쓰지 말고 한 표기로 고정한다.

---

## 4. Phase 연결

### Phase 2

- `domain-analysis.md`
- 입력 상태
- 상태 모드
- 실행 모드
- 실행 패턴

을 바탕으로 team-spec을 설계한다.

### Phase 3

team-spec을 바탕으로 아래를 동적으로 생성한다.

- `AGENTS.md`
- `.codex/config.toml`
- `.codex/agents/*.toml`
- `.codex/skills/*`

즉 `Phase 3`은 고정 파일 복사가 아니라  
`team-spec -> Codex 자산 생성` 단계다.

초기 init 시점에는 seed 인벤토리가 들어갈 수 있지만, 목표 상태에서는 team-spec 자체가 프로젝트 특화 팀 설계서로 읽혀야 한다.
즉 `초안 필요`, `나중에 다시 정리` 같은 메타 문장보다 실제 팀 구조와 역할 결정이 더 앞에 보여야 한다.

---

## 5. 검증 포인트

verify와 smoke는 더 이상 “고정 agent 파일이 있는가”만 봐서는 안 된다.

최소한 아래를 함께 봐야 한다.

- team-spec이 존재하는가
- team-spec의 역할 수와 실제 생성된 agent 수가 맞는가
- team-spec의 역할 이름과 실제 파일명이 맞는가
- run-harness가 team-spec 기준 시작 역할과 재진입 규칙을 설명하는가
- validator가 team-spec과 산출물의 불일치를 지적할 수 있는가

---

## 6. 다른 레퍼런스와의 연결

- `agent-design-patterns.md`: 어떤 조건에서 어떤 역할 분리가 필요한지 본다.
- `orchestrator-template.md`: handoff와 재진입 규칙을 팀 스펙에 어떻게 담을지 본다.
- `phase-selection-matrix.md`: 재진입 판단을 어떤 phase로 연결할지 본다.
- `target-evaluation-playbook.md`: 타겟 프로젝트에서 team-spec 기반 생성 결과를 어떻게 평가할지 본다.
