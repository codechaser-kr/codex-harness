# Codex Runtime Contract

이 문서는 Harness가 Codex에서 따라야 할 실행 모델을 정의한다.

이 문서는 다른 런타임의 실행 모델과 비교하지 않는다. Codex가 읽고 실행할 수 있는 계약만 다룬다.

Codex용 Harness는 주 에이전트가 역할 계약을 읽고, 필요한 작업만 명확한 경계 안에서 위임하는 구조를 기본으로 둔다.

## 핵심 전제

- Harness의 기준 런타임은 Codex다.
- 생성 결과에서 반드시 실행 기준으로 삼을 자산은 `AGENTS.md`, `.harness/docs/team-spec.md`, `.codex/skills/*`, `.harness/docs/*`다.
- `.codex/config.toml`과 `.codex/agents/*.toml`은 `team-spec.md`를 구현한 역할 메타데이터다. 생성 대상에는 포함하지만, 역할들이 자동으로 서로 통신한다고 가정하는 실행 근거로 삼지는 않는다.
- 생성된 역할들이 서로 자동 통신한다고 가정하지 않는다.
- 역할 간 연결은 `run-harness`와 `orchestration-plan.md`가 설명하는 주 에이전트 중심 handoff로 표현한다.
- 생성 판단은 `team-spec.md`와 문서 계약이 담당하고, 역할 스킬은 해당 역할 섹션을 읽게 하는 실행 포인터로 작동한다.

## Codex 실행 모델

Codex용 Harness는 다음 흐름을 기본으로 한다.

1. 주 에이전트가 `AGENTS.md`와 `run-harness` 스킬을 읽고 현재 요청을 분류한다.
2. `run-harness`가 `team-spec.md`, `domain-analysis.md`, `orchestration-plan.md`를 기준으로 시작 역할과 다음 역할을 정한다.
3. 각 역할 스킬은 자신의 `role_id`에 해당하는 `team-spec.md` 섹션을 읽고, 그 섹션의 절차, 입력, 출력, 완료 기준을 따른다.
4. 필요한 경우에만 주 에이전트가 독립적이고 경계가 분명한 작업을 보조 서브에이전트에 위임한다.
5. 결과 통합, 재진입 Phase 결정, 최신 세션 요약 갱신은 주 에이전트 책임으로 남긴다.

## 병렬 위임 기준

병렬 위임은 기본값이 아니다. 다음 조건을 만족할 때만 사용한다.

- 작업 경계가 서로 독립적이다.
- 각 위임 작업의 입력과 출력이 문서로 명확하다.
- 파일 수정 소유 범위가 겹치지 않는다.
- 주 에이전트가 결과를 통합할 수 있다.
- 실패, 지연, 미완료 상태를 `latest-session-summary.md`에 남길 수 있다.

조건을 만족하지 않으면 순차 실행 또는 단일 역할 실행으로 둔다.

## 생성 책임

Codex용 Harness의 생성 책임은 다음 순서로 정리한다.

1. `team-spec.md`가 역할 팀의 단일 진실원천이다.
2. `AGENTS.md`는 상위 운영 기준과 진입 규칙을 담는다.
3. `.codex/config.toml`과 `.codex/agents/*.toml`은 역할 식별, 모델/추론 설정, sandbox 정책 같은 실행 메타데이터를 담는다.
4. `.codex/skills/*`는 각 역할의 `team-spec.md` 섹션과 공통 출력 블록을 참조하는 실행 포인터를 담는다.
5. `.harness/docs/*`는 저장소 입력, 오케스트레이션, 검증, 재진입 상태를 담는다.
6. 생성 절차는 위 계약을 기준으로 주 에이전트가 직접 수행한다.

## 완료 기준

Codex 런타임 정렬이 끝났다고 보려면 아래 조건을 만족해야 한다.

- README와 SKILL 본문이 Codex 실행 계약을 기준으로 쓰여 있다.
- `run-harness`가 주 에이전트 중심 진입점으로 설명돼 있다.
- `team-spec.md`가 역할, handoff, 검증, 재진입 기준의 기준 문서로 남아 있다.
- `.codex/config.toml`과 `.codex/agents/*.toml`이 생성됐다면 `team-spec.md`의 역할 인벤토리와 같은 역할 식별자를 말한다.
- `.codex/skills/*/SKILL.md`가 `team-spec.md`의 해당 역할 섹션과 공통 출력 블록을 참조한다.
- Codex가 문서와 스킬 계약만 읽고 생성 절차를 수행할 수 있다.

## 다른 레퍼런스와의 연결

- `team-spec-contract.md`: 역할 팀의 선언형 기준을 정의한다.
- `orchestrator-template.md`: 주 에이전트 중심 handoff와 재진입 흐름을 구체화한다.
- `agents-sync-guide.md`: `AGENTS.md`와 로컬 하네스 자산의 정렬 기준을 제공한다.
- `verification-checklist.md`: Codex 런타임 전제가 생성 결과에 반영됐는지 검토할 때 쓴다.
