# Verification Checklist

이 문서는 의존성 없는 하네스에서 운영 감사 역할이 확인할 최소 검증 기준을 정의한다.

예전 셸 검증기의 동작을 그대로 복제하려는 문서가 아니다. 목적은 역할 계약, 오케스트레이션, 보조 운영 문서, 로그가 실제로 맞물리는지 점검하는 데 있다.

## 핵심 전제

- 검증은 파일 존재 확인보다 역할 계약과 실행 흐름의 일관성 확인을 우선한다.
- 통과/실패보다 어떤 항목이 왜 약한지 설명할 수 있어야 한다.
- 운영 감사는 단순 문서 검사자가 아니라 메타시스템 감사자다.

## 1. 구조 검증

최소한 다음 구조가 필요하다.

- `AGENTS.md`
- `.codex/config.toml`
- `.codex/agents/`
- `.codex/skills/`
- `.harness/docs/`
- `.harness/logs/`
- `team-spec.md`
- `project-setup.md`
- `exploration-notes.md`
- `logging-policy.md`

필요한 Phase까지 진행됐다면 아래 문서도 검토한다.

- `domain-analysis.md`
- `qa-strategy.md`
- `harness-architecture.md`
- `orchestration-plan.md`
- `team-structure.md`
- `team-playbook.md`

## 2. 역할 계약 검증

- `team-spec.md`에 최종 역할 인벤토리가 있다.
- 최종 역할 인벤토리는 fenced `text` 블록이며, 헤더와 모든 역할 행이 같은 블록 안에 있다.
- 역할 행이 inline code로 흩어져 있으면 `Phase 2` 재작성 대상으로 본다.
- 각 역할의 `agent_file`에 대응하는 `.codex/agents/*.toml`, `.codex/skills/*`가 존재한다.
- `.codex/config.toml`, `.codex/agents/*.toml`, `.codex/skills/*`가 `team-spec.md`의 역할 수, `agent_file`, description 기준과 어긋나지 않는다.
- 모든 역할 스킬이 `team-spec.md`의 해당 `role_id` 섹션을 참조한다.
- 모든 역할 스킬이 `team-spec.md`의 공통 출력 블록을 따르도록 지시한다.
- `.codex/agents/*.toml`과 `.codex/skills/*/SKILL.md`에 역할별 우선 입력, 절차, 다음 역할, 종료 기준이 중복 복제되어 있지 않다.
- description이 실제 요청에서 트리거될 만큼 구체적이다.
- 시작 진입 역할과 중심 조율 역할이 구분된다.
- QA 역할과 운영 감사 역할이 구분된다.

## 3. 보조 운영 문서 검증

- 보조 운영 문서가 역할 자산과 오케스트레이션을 대신하지 않는다.
- `domain-analysis.md`는 저장소 근거와 실패 경계를 설명한다.
- `orchestration-plan.md`는 역할 순서와 재진입 흐름을 설명한다.
- `team-playbook.md`는 운영 루프와 실제 작업 전달 기준을 남긴다.
- 보존 문서에 이전 역할명이나 진입점이 남아 있으면 `orchestration-plan.md` 또는 `team-playbook.md`가 이전 역할명 -> 현재 역할명 매핑과 우선 기준을 설명한다.

## 4. 로그 검증

- `session-log.md`에 현재 세션의 진행과 종료가 남아 있다.
- `latest-session-summary.md`가 마지막 종료 세션 기준으로 갱신돼 있다.
- `logging-policy.md`가 세션 로그와 최신 요약을 어떻게 남길지 설명한다.
- 로그 정책이 별도 스크립트, TSV 이벤트 파일, 자동 append 도구를 필수 조건으로 삼지 않는다.
- 두 로그 문서가 같은 세션 ID를 기준으로 현재 작업을 설명한다.
- 최신 요약에 다음 시작 역할과 다음 재진입 Phase가 있다.
- 최신 요약에 다음 시작 전 우선 확인 입력 파일과 최근 출력 파일이 있다.

세부 기준은 `logging-contract.md`를 따른다.

## 5. 재진입 검증

- 현재 부족한 부분을 `Phase 1`~`Phase 7` 중 어디로 되돌려야 하는지 설명할 수 있다.
- 재진입 사유가 저장소 입력, 역할 경계, 에이전트 정의, 역할 스킬, 오케스트레이션, 운영 감사, 피드백 반영 중 무엇인지 구분돼 있다.
- 최신 세션 요약에 재진입 정보가 반영돼 있다.

세부 기준은 `reentry-rules.md`를 따른다.

## 6. 품질 비교 검증

- 가능하면 `with-skill` 대비 `without-skill` 비교 관찰이 남아 있다.
- 시작 역할 판단, 질문 절제, 다음 역할 안내, 저장소 근거 연결, 검증 가능성이 나아졌는지 설명할 수 있다.
- 운영 가능 / 재작성 필요 / 재구성 필요 중 하나로 현재 상태를 설명할 수 있다.

## 7. 자기진화성 검증

- 신규 구축 결과라면 `initial-generation-contract.md` 기준으로 초기 생성물만 읽어도 다음 시작 역할, 다음 재진입 Phase, 학습 후보 기록 위치를 알 수 있다.
- 역할 출력이나 로그에 새로 확인한 저장소 사실을 남길 위치가 있다.
- 모든 역할 스킬이 `team-spec.md`의 해당 역할 섹션을 참조한다. 누락된 역할이 있으면 `Phase 4` 재작성 필요로 판정한다.
- 모든 역할 스킬이 `team-spec.md`의 공통 학습 출력 블록을 따르도록 지시한다.
- `.codex/agents/*.toml`과 `.codex/skills/*/SKILL.md`가 역할 세부 기준을 별도 기준처럼 복제하면 drift 위험으로 기록한다.
- 학습 후보가 있으면 어느 Phase로 재진입하고 어느 문서/스킬에 반영할지 설명한다.
- 보존 문서, 운영 문서, 역할 스킬이 서로 다른 진입점이나 역할명을 말하면 충돌로 기록한다.
- 보존 문서 충돌이 있으면 원문을 임의로 덮어쓰기보다 호환성 메모, 재진입 Phase, 사용자 승인 필요 여부를 함께 남긴다.
- 반복될 수 있는 역할 오판, 검증 공백, 문서 충돌이 로컬 보강인지 생성기 환류 후보인지 분리돼 있다.
- 자기진화 루프가 별도 스크립트, 외부 서비스, 자동 프로젝트 재작성 도구에 의존하지 않는다.

세부 기준은 `evolution-contract.md`를 따른다.

## 8. 판정 형식

운영 감사 결과는 최소한 아래 형식으로 남긴다.

- 통과한 항목
- 수정 필요한 항목
- 재진입 권장 Phase
- 남은 위험
- 학습 후보와 승격 대상

## 다른 레퍼런스와의 연결

- `team-spec-contract.md`: 역할 인벤토리와 생성 결과의 일관성을 검토할 때 쓴다.
- `initial-generation-contract.md`: 신규 구축 결과가 첫 세션부터 자기진화 루프를 갖췄는지 검토할 때 쓴다.
- `evolution-contract.md`: 자기진화 루프와 학습 후보 승격 기준을 검토할 때 쓴다.
- `logging-contract.md`: 로그 문서 기준을 검토할 때 쓴다.
- `reentry-rules.md`: 어떤 Phase로 되돌릴지 판단할 때 쓴다.
- `quality-evaluation-guide.md`: 품질 비교 관찰을 정리할 때 쓴다.
