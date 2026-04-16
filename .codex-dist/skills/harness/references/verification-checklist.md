# Verification Checklist

이 문서는 MD-only 하네스에서 운영 감사 역할이 확인해야 하는 최소 검증 기준을 정의한다.

예전의 셸 검증기가 하던 역할을 그대로 복제하는 것이 목적이 아니라, 문서와 역할 계약이 실제로 맞는지를 점검하는 것이 목적이다.

## 핵심 전제

- 검증은 파일 존재 확인보다 문서 계약과 역할 일관성 확인을 우선한다.
- 통과/실패보다 어떤 항목이 왜 약한지 설명할 수 있어야 한다.
- 운영 감사는 단순 문서 검사자가 아니라 메타시스템 감사자다.

## 1. 구조 검증

최소한 다음 구조가 있어야 한다.

- `AGENTS.md`
- `.harness/docs/`
- `.harness/logs/`
- `team-spec.md`
- `project-setup.md`
- `exploration-notes.md`

필요한 Phase까지 진행됐다면 다음도 검토한다.

- `domain-analysis.md`
- `qa-strategy.md`
- `harness-architecture.md`
- `orchestration-plan.md`
- `team-structure.md`
- `team-playbook.md`

## 2. 역할 계약 검증

- `team-spec.md`의 최종 역할 인벤토리가 존재한다.
- 각 역할의 `agent_file`에 대응하는 `.codex/agents/*.toml`, `.codex/skills/*`가 존재한다.
- description이 실제 요청에서 트리거될 만큼 구체적이다.
- 시작 진입 역할과 중심 조율 역할이 구분된다.
- QA 역할과 운영 감사 역할이 구분된다.

## 3. 문서 계층 검증

- 입력 문서와 메타시스템 문서의 목적이 섞이지 않는다.
- `domain-analysis.md`는 저장소 근거와 실패 경계를 설명한다.
- `orchestration-plan.md`는 역할 순서와 재진입 흐름을 설명한다.
- `team-playbook.md`는 운영 루프와 실제 작업 전달 기준을 남긴다.

## 4. 로그 검증

- `session-log.md`가 현재 세션의 진행과 종료를 남긴다.
- `latest-session-summary.md`가 마지막 종료 세션 기준으로 갱신돼 있다.
- 최신 요약에 다음 시작 역할과 다음 재진입 Phase가 있다.
- 최신 요약에 다음 시작 전 우선 확인 입력 파일과 최근 출력 파일이 있다.

세부 기준은 `logging-contract.md`를 따른다.

## 5. 재진입 검증

- 현재 부족함을 `Phase 1`~`Phase 7` 중 어디로 되돌려야 하는지 설명할 수 있다.
- 재진입 사유가 문서 품질, 역할 규칙, 운영 기준 중 무엇인지 구분돼 있다.
- 최신 세션 요약에 재진입 정보가 반영돼 있다.

세부 기준은 `reentry-rules.md`를 따른다.

## 6. 품질 비교 검증

- 가능하면 `with-skill` 대비 `without-skill` 비교 관찰이 남아 있다.
- 시작 역할 판단, 질문 절제, 다음 역할 안내, 저장소 근거 연결, 검증 가능성이 나아졌는지 설명할 수 있다.
- 운영 가능 / 재작성 필요 / 재구성 필요 중 하나로 현재 상태를 설명할 수 있다.

## 7. 판정 형식

운영 감사는 최소한 아래 형식으로 결과를 남긴다.

- 통과한 항목
- 수정 필요한 항목
- 재진입 권장 Phase
- 남은 위험

## 다른 레퍼런스와의 연결

- `team-spec-contract.md`: 역할 인벤토리와 생성 결과 일관성을 검토할 때 사용한다.
- `logging-contract.md`: 로그 문서 기준을 검토할 때 사용한다.
- `reentry-rules.md`: 어떤 Phase로 되돌릴지 판단할 때 사용한다.
- `quality-evaluation-guide.md`: 품질 비교 관찰을 정리할 때 사용한다.
