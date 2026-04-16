# Team Spec Contract

이 문서는 `team-spec.md`가 어떤 역할을 하는지와, 어떤 필수 섹션과 필드를 가져야 하는지 정의한다.

`team-spec.md`는 임시 메모가 아니라 이후 `.codex/agents/*.toml`, `.codex/skills/*`, 운영 문서가 따라야 하는 역할 팀의 기준 문서다.

## 핵심 전제

- `team-spec.md`는 프로젝트 특화 역할 팀의 단일 진실원천이다.
- 역할 이름, 책임, 입력/출력, 다음 역할은 생성 단계 이전에 `team-spec.md`에서 먼저 확정한다.
- `.codex/agents/*.toml`과 `.codex/skills/*`는 `team-spec.md`를 구현한 결과물이지, 별도의 기준 문서가 아니다.
- 추상적인 범용 역할명을 복사하지 말고 현재 저장소의 도메인 용어와 실패 경계를 반영해야 한다.

## 필수 섹션

`team-spec.md`에는 최소한 다음 섹션이 있어야 한다.

- `## 팀 메타데이터`
- `## 도메인 근거 요약`
- `## 역할명 설계 메모`
- `## 팀 설계 결정`
- `## 역할 스펙 초안`
- `## 생성 규칙`
- `## 최종 역할 인벤토리`

위 섹션은 순서를 바꿀 수는 있지만 생략하면 안 된다.

## 역할 스펙 초안 필수 필드

각 역할 초안은 최소한 다음 필드를 가져야 한다.

- 역할 id
- 역할 표시 이름
- 역할 유형
- 역할 목적
- 역할 책임
- 주요 입력
- 주요 출력
- 다음 역할
- 대표 시작 경로
- 우선 입력 문서
- 요청 유형별 하위 분기
- 작업 시작 체크리스트
- 주요 판단 기준
- 금지 판단/피해야 할 오해
- 출력 규칙
- 산출 형식 템플릿
- 재진입 트리거
- 종료 판정 기준
- 완료 기준
- 검증/리뷰 초점
- agent 파일명
- skill 디렉토리명
- description 초안
- 권장 모델 클래스
- sandbox 정책

## 최종 역할 인벤토리 계약

`## 최종 역할 인벤토리`에는 생성기가 읽을 수 있는 고정 형식 블록이 있어야 한다.

권장 헤더:

`role_id|display_name|agent_file|model|reasoning|sandbox|description`

각 행은 다음 규칙을 따른다.

- `role_id`는 snake_case
- `display_name`과 `agent_file`은 kebab-case
- `agent_file`은 `.codex/agents/<agent_file>.toml`, `.codex/skills/<agent_file>/SKILL.md`와 일치해야 한다
- description은 실제 요청에서 트리거될 수 있을 만큼 구체적이어야 한다

## 생성 규칙

- `Phase 2`는 저장소와 입력 문서를 다시 읽어 최종 역할 인벤토리를 작성한다.
- `Phase 3`은 최종 역할 인벤토리만 읽어 `.codex/agents/*.toml`과 `.codex/skills/*`를 작성한다.
- 역할 생성 결과가 `team-spec.md`보다 앞서거나 `team-spec.md`를 덮어써서는 안 된다.
- 역할 추가/삭제/이름 변경은 먼저 `team-spec.md`에서 반영한 뒤 관련 자산을 다시 맞춘다.

## 프로젝트 특화 역할명 기준

- 최종 역할 이름은 저장소마다 달라질 수 있다.
- 프레임워크 범용 직무명만 단독으로 쓰지 말고, 저장소 도메인 용어나 실패 경계를 함께 반영한다.
- 역할 이름은 사람이 읽었을 때 "무슨 경계를 다루는 역할인지"가 바로 드러나야 한다.

예시:

- 결제 시스템: `payment-dev`, `billing-reviewer`, `checkout-qa`
- Electron 런타임 중심 프로젝트: `desktop-runtime-dev`, `ipc-reviewer`
- 운영/릴리즈 중심 프로젝트: `release-orchestrator`, `deploy-validator`

## 품질 기준

좋은 `team-spec.md`는 다음을 만족한다.

- 역할명이 현재 저장소의 도메인 용어를 반영한다.
- 입력/출력 연결이 역할 간에 자연스럽다.
- QA와 운영 감사 역할이 별도의 책임을 가진다.
- 시작 진입 역할과 중심 조율 역할이 혼동되지 않는다.
- 재진입 기준이 역할 수준에서 드러난다.

## 다른 레퍼런스와의 연결

- `agent-design-patterns.md`: 어떤 패턴이 현재 팀 구조에 맞는지 판단할 때 사용한다.
- `orchestrator-template.md`: 중심 조율 역할과 다음 역할 흐름을 설계할 때 사용한다.
- `qa-agent-guide.md`: QA와 운영 감사 역할의 책임 경계를 설계할 때 사용한다.
- `verification-checklist.md`: `team-spec.md`와 생성 결과 간 일관성을 검토할 때 사용한다.
- `reentry-rules.md`: 어떤 Phase로 되돌아가 `team-spec.md`를 다시 써야 하는지 판단할 때 사용한다.
