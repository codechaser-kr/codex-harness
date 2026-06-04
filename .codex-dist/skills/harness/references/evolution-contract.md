# Evolution Contract

이 문서는 생성된 하네스가 실제 프로젝트에서 얻은 경험을 다음 실행 품질로 되돌리는 기준을 정의한다.

핵심은 자동 스크립트로 프로젝트를 바꾸는 데 있지 않다. 타겟 프로젝트에서 확인한 차이를 사람이 읽을 수 있는 로그, 역할 출력, 운영 감사 결과로 남기고, 그 차이가 어느 로컬 하네스 자산이나 생성기 reference로 승격돼야 하는지 판단할 수 있게 만드는 데 있다.

## 진화 원칙

하네스 진화에서 중요한 것은 초기 하네스와 실제 프로젝트에서 쓰며 정착한 하네스의 차이를 포착하고, 그 차이를 다음 생성 품질을 높이는 피드백으로 되돌리는 것이다.

Codex용 하네스에서는 이 원칙을 다음처럼 옮긴다.

- 명령형 `/harness:evolve`나 외부 스크립트에 의존하지 않는다.
- 타겟 프로젝트 파일을 자동으로 재작성하는 별도 실행기를 만들지 않는다.
- 차이 캡처는 Markdown 로그, 역할 출력, 운영 감사 결과, `team-spec` 재진입 판단으로 남긴다.
- 개선은 주 에이전트가 승인 가능한 문서/스킬 변경으로 수행한다.
- 반복되는 타겟 관찰만 생성기 reference 보강 후보로 승격한다.

## 자기진화 루프

생성된 하네스는 아래 루프를 닫아야 한다.

1. 실제 작업에서 새 저장소 사실, 실패 비용, 검증 공백, 역할 오판을 관찰한다.
2. 관찰을 역할 출력과 `session-log.md`에 남긴다.
3. `latest-session-summary.md`에 다음 재진입 Phase와 학습 후보를 남긴다.
4. 운영 감사 역할이 관찰을 아래 분류표에 맞춰 승격 위치로 연결한다.
5. 필요한 경우 `team-spec`, 역할 스킬, 운영 문서, QA 기준을 갱신한다.
6. 반복 타겟에서 같은 결함이 확인되면 생성기 reference 또는 전역 `SKILL.md` 보강 후보로 기록한다.

## 관찰 분류와 승격 위치

| 관찰 유형 | 예시 | 우선 재진입 | 로컬 승격 위치 | 생성기 환류 후보 |
| --- | --- | --- | --- | --- |
| 저장소 사실 누락 | 실제 런타임 경계, 핵심 사용자 흐름, 검증 비용을 놓침 | Phase 1 | `domain-analysis.md`, `project-setup.md` | `exploration-model.md`, `target-evaluation-playbook.md` |
| 역할 라우팅 오판 | 시작 역할이 반복해서 잘못 선택됨 | Phase 2, Phase 5 | `team-spec.md`, `orchestration-plan.md`, `run-harness` 스킬 | `team-spec-schema.md`, `orchestrator-template.md` |
| 역할 경계 충돌 | 시작 진입, 조율, QA, 감사 책임이 섞임 | Phase 2 | `team-spec.md`, `.codex/agents/*`, 역할 스킬 | `agent-design-patterns.md`, `team-spec-contract.md` |
| 역할 스킬 실행성 부족 | 스킬이 너무 얕아 다음 행동을 못 정함 | Phase 4 | `.codex/skills/*/SKILL.md` | `skill-writing-guide.md`, `skill-testing-guide.md` |
| QA 승격 기준 부족 | 테스트 명령, 수동 검증, 무거운 빌드 판단이 반복적으로 모호함 | Phase 4, Phase 5 | `qa-strategy.md`, QA 역할 스킬 | `qa-agent-guide.md`, `verification-checklist.md` |
| 보존 문서 충돌 | 예전 문서의 역할명/진입점이 새 운영 모델과 충돌하거나 호환성 매핑이 없음 | Phase 5, Phase 6 | `orchestration-plan.md`, `team-playbook.md`, 해당 보존 문서 메타데이터 | `orchestrator-template.md`, `target-evaluation-playbook.md`, `verification-checklist.md` |
| 로그 재사용성 부족 | 다음 시작 역할, 최근 출력, 남은 위험, 학습 후보가 없음 | Phase 5, Phase 6 | `session-log.md`, `latest-session-summary.md` | `logging-contract.md`, `reentry-rules.md` |
| 생성기 반복 결함 | 여러 타겟 프로젝트에서 같은 종류의 약점이 반복됨 | Phase 7 | 타겟 평가 기록 | 전역 `SKILL.md`, 관련 reference |

## 역할 출력에 남길 학습 항목

역할 스킬은 산출 형식에 아래 항목을 필요에 따라 포함해야 한다.

- 새로 확인한 저장소 사실
- 반복될 수 있는 판단
- 하네스 갱신 후보
- 권장 재진입 Phase
- 생성기 환류 후보 여부

모든 역할이 매번 긴 학습 보고서를 쓸 필요는 없다. 관찰이 없으면 `없음`으로 짧게 남긴다. 관찰이 있으면 다음 역할이 바로 판단할 수 있도록 경로와 이유를 함께 적는다.

## 로그 확장 항목

`latest-session-summary.md`에는 기본 로그 계약에 더해 아래 항목을 남길 수 있어야 한다.

- 학습 후보
- 반복 신호
- 승격 대상
- 생성기 환류 후보

이 항목은 통계 수집용이 아니다. 다음 실행에서 `run-harness`, 중심 조율 역할, 운영 감사 역할이 읽을 입력이다.

## 운영 감사 게이트

운영 감사 역할은 완료 전 아래 질문에 답해야 한다.

- 이번 작업에서 새로 확인한 저장소 사실이 있는가
- 그 사실이 `domain-analysis.md`, `team-spec.md`, 역할 스킬, 운영 문서 중 어디에 반영돼야 하는가
- 반복될 수 있는 검증 공백이나 역할 오판이 있었는가
- 로그가 다음 실행의 학습 입력으로 충분한가
- 타겟 로컬 보강으로 충분한가, 생성기 reference 보강 후보로 봐야 하는가
- 승격 결정은 운영 감사 역할의 권고와 사용자 또는 흐름 조율 역할의 승인으로 나눈다.
- 운영 감사 역할: 승격 위치와 이유를 제안한다.
- 사용자 또는 흐름 조율 역할: 제안을 검토하고 최종 반영 범위를 승인한다.

## 금지 사항

- 타겟 프로젝트를 자동으로 재작성하는 별도 스크립트를 자기진화 루프의 필수 요소로 만들지 않는다.
- 외부 런타임, 외부 명령, 특정 서비스에 의존해야만 진화가 가능하도록 설계하지 않는다.
- 한 번의 타겟 관찰을 곧바로 범용 생성기 규칙으로 일반화하지 않는다.
- 파일 존재 확인만으로 자기진화 루프가 닫혔다고 판정하지 않는다.

## 완료 판정

자기진화형 하네스라고 말하려면 최소한 아래 조건을 만족해야 한다.

1. 역할 출력이나 로그에 학습 후보를 남길 위치가 있다.
2. 학습 후보가 어느 Phase와 어느 문서/스킬로 승격될지 설명할 수 있다.
3. 운영 감사 역할이 학습 후보 반영 여부를 확인한다.
4. 반복 타겟 결함을 생성기 reference 보강 후보로 남길 수 있다.
5. 위 과정이 스크립트나 외부 의존성 없이 Markdown 계약과 역할 절차만으로 작동한다.

## 다른 레퍼런스와의 연결

- `logging-contract.md`: 학습 후보와 승격 대상을 최신 세션 요약에 남기는 기준을 제공한다.
- `reentry-rules.md`: 관찰 유형을 Phase 재진입으로 연결한다.
- `verification-checklist.md`: 운영 감사가 자기진화 루프를 검증한다.
- `target-evaluation-playbook.md`: 타겟 평가 결과를 로컬 보강과 생성기 환류 후보로 분리한다.
- `quality-evaluation-guide.md`: with-skill / without-skill 차이를 학습 후보로 남길 때 사용한다.
