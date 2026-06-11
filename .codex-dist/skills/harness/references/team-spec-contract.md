# Team Spec Contract

이 문서는 `team-spec.md`의 역할과 필수 섹션, 필수 필드를 정의한다.

`team-spec.md`는 임시 메모가 아니다. 이후 `.codex/config.toml`, `.codex/agents/*.toml`, `.codex/skills/*`, 운영 문서가 따라야 하는 역할 팀의 기준 문서이며, 역할별 실행 기준의 단일 원천이다.

## 핵심 전제

- `team-spec.md`는 프로젝트 특화 역할 팀의 단일 진실원천이다.
- 역할 이름, 목적, 책임, 우선 입력, 절차, 출력, 다음 역할, 종료 기준, 공통 출력 블록은 생성 단계 이전에 `team-spec.md`에서 먼저 확정한다.
- `.codex/config.toml`, `.codex/agents/*.toml`, `.codex/skills/*`는 `team-spec.md`를 구현한 결과물이지, 별도의 기준 문서가 아니다.
- `.codex/agents/*.toml`은 역할 발견과 실행 메타데이터만 담는다.
- `.codex/skills/*/SKILL.md`는 해당 역할의 `team-spec` 섹션과 공통 출력 블록을 읽게 하는 실행 포인터다.
- agent/skill 자산에 역할별 우선 입력, 절차, 다음 역할, 종료 기준을 반복 복제하지 않는다.
- 추상적인 범용 역할명을 복사하지 말고, 현재 저장소의 도메인 용어와 실패 경계를 반영한다.
- 신규 구축에서도 `team-spec.md`는 첫 세션부터 학습 후보, 승격 대상, 다음 재진입 Phase를 남길 수 있는 역할 계약을 제공해야 한다.

## 필수 섹션

`team-spec.md`에는 최소한 다음 섹션이 필요하다.

- `## 팀 메타데이터`
- `## 도메인 근거 요약`
- `## 설계 원천 우선순위` 또는 `## 설계 원천 인벤토리`
- `## 역할명 설계 메모`
- `## 팀 설계 결정`
- `## 역할 스펙 초안`
- `## 공통 출력 블록`
- `## 생성 규칙`
- `## 최종 역할 인벤토리`

섹션 순서는 바꿀 수 있지만 생략해서는 안 된다.

## 역할 스펙 초안 필수 필드

각 역할 초안에는 최소한 다음 필드가 필요하다.

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
- 산출 형식 기준
- 학습 후보 기록 규칙
- 승격 대상 기준
- 생성기 환류 후보 기준
- 재진입 트리거
- 종료 판정 기준
- 완료 기준
- 검증/리뷰 초점
- agent 파일명
- skill 디렉터리명
- description 초안
- 권장 모델 클래스
- sandbox 정책

## 최종 역할 인벤토리 계약

`## 최종 역할 인벤토리`에는 생성기가 읽을 수 있는 고정 형식 블록을 둔다. 이 블록은 반드시 fenced `text` 블록이어야 한다.

권장 형식:

```text
role_id|display_name|agent_file|model|reasoning|sandbox|description
run_harness|run-harness|run-harness|default|medium|workspace-write|현재 하네스 상태를 읽고 시작 역할과 재진입 Phase를 안내한다.
```

각 행은 다음 규칙을 따른다.

- `role_id`는 snake_case
- `display_name`과 `agent_file`은 kebab-case
- `agent_file`은 `.codex/agents/<agent_file>.toml`, `.codex/skills/<agent_file>/SKILL.md`와 일치해야 한다
- description은 실제 요청에서 트리거될 만큼 구체적이어야 한다
- 헤더와 모든 역할 행은 같은 fenced `text` 블록 안에 있어야 한다
- 각 역할 행을 inline code로 따로 나열하지 않는다
- fenced `text` 블록이 없으면 `Phase 2` 결과를 완료로 보지 않고 다시 쓴다

## 생성 규칙

- `Phase 2`는 저장소와 입력 문서를 다시 읽고 최종 역할 인벤토리를 작성한다.
- 역할별 `우선 입력 문서`에 등장하는 설계/정책/사양 문서는 `설계 원천 우선순위` 또는 `설계 원천 인벤토리`에 포함한다.
- 운영 로그, 세션 요약, 임시 산출물처럼 재진입 상태를 설명하는 문서는 설계 원천 우선순위에 넣지 않는다.
- 역할이 정책 판단 기준으로 사용하는 문서가 상단 원천 목록에 없으면 `Phase 2` 결과를 완료로 보지 않는다.
- `Phase 3`은 최종 역할 인벤토리만 읽어 `.codex/config.toml`, `.codex/agents/*.toml`, `.codex/skills/*`를 작성한다.
- 역할 생성 결과가 `team-spec.md`보다 앞서거나 `team-spec.md`를 덮어써서는 안 된다.
- 역할 추가/삭제/이름 변경과 실행 기준 변경은 먼저 `team-spec.md`에서 반영한 뒤 관련 자산을 다시 맞춘다.
- `.codex/agents/*.toml`은 역할 식별과 실행 메타데이터를 담고, `.codex/skills/*`는 `team-spec` 역할 섹션을 가리키는 실행 포인터를 담는다. 두 자산은 같은 `agent_file` 값과 `role_id`를 기준으로 연결돼야 한다.
- 각 역할 스킬은 `team-spec.md`의 해당 역할 섹션, 학습 후보 기록 규칙, 승격 대상 기준, 생성기 환류 후보 기준, 공통 출력 블록을 따르도록 지시해야 한다.
- 각 역할 스킬 자체에 역할별 우선 입력, 절차, 다음 역할, 종료 기준을 다시 쓰면 drift 위험으로 보고 재작성한다.
- 신규 구축에서 입력이 부족하면 역할 생성을 완료처럼 보이게 하지 말고, 보류한 판단과 다음 질문을 `team-spec.md`와 로그에 남긴다.

## 프로젝트 특화 역할명 기준

- 최종 역할 이름은 저장소마다 달라질 수 있다.
- 프레임워크 범용 직무명만 단독으로 쓰지 말고, 저장소 도메인 용어나 실패 경계를 함께 반영한다.
- 역할 이름은 사람이 읽었을 때 다루는 경계가 바로 드러나야 한다.

예시:

- 결제 시스템: `payment-dev`, `billing-reviewer`, `checkout-qa`
- Electron 런타임 중심 프로젝트: `desktop-runtime-dev`, `ipc-reviewer`
- 운영/릴리즈 중심 프로젝트: `release-orchestrator`, `deploy-validator`

## 품질 기준

좋은 `team-spec.md`는 다음 조건을 만족한다.

- 역할명이 현재 저장소의 도메인 용어를 반영한다.
- 역할별 우선 입력의 설계/정책/사양 문서가 상단 설계 원천 목록에 빠짐없이 포함된다.
- 문서 간 충돌 시 어떤 설계 원천을 우선해야 하는지 `team-spec.md`만 보고 판단할 수 있다.
- 입력/출력 연결이 역할 간에 자연스럽다.
- 최종 역할 인벤토리의 `agent_file` 값이 `.codex/agents/*.toml`과 `.codex/skills/*/SKILL.md` 경로에 그대로 반영된다.
- QA와 운영 감사 역할이 별도의 책임을 가진다.
- 시작 진입 역할과 중심 조율 역할이 혼동되지 않는다.
- 재진입 기준이 역할 수준에서 드러난다.
- 새로 확인한 저장소 사실과 반복될 수 있는 판단을 어느 역할이 기록하고 어디로 승격할지 드러나야 한다.
- 초기 생성물만으로 다음 시작 역할과 재진입 Phase를 설명할 수 있다.
- 각 역할 스킬이 `team-spec.md`의 해당 역할 섹션과 공통 출력 블록을 명확히 참조한다.
- `.codex/agents/*.toml`과 `.codex/skills/*/SKILL.md`가 역할별 우선 입력, 절차, 다음 역할, 종료 기준을 별도 기준처럼 복제하지 않는다.

## 다른 레퍼런스와의 연결

- `agent-design-patterns.md`: 어떤 패턴이 현재 팀 구조에 맞는지 판단할 때 쓴다.
- `orchestrator-template.md`: 중심 조율 역할과 다음 역할 흐름을 설계할 때 쓴다.
- `qa-agent-guide.md`: QA와 운영 감사 역할의 책임 경계를 설계할 때 쓴다.
- `verification-checklist.md`: `team-spec.md`와 생성 결과의 일관성을 검토할 때 쓴다.
- `reentry-rules.md`: 어떤 Phase로 되돌아가 `team-spec.md`를 다시 써야 하는지 판단할 때 쓴다.
- `initial-generation-contract.md`: 신규 구축 결과가 처음부터 자기진화 루프를 갖췄는지 볼 때 쓴다.
- `evolution-contract.md`: 학습 후보와 승격 대상 기준을 역할 스펙에 포함할 때 쓴다.
