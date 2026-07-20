---
name: github-workflow-engine
description: GitHub Issue, PR, label, checklist, review thread, comment를 관측하고 선언형 Workflow Definition으로 현재 작업과 다음 작업을 평가합니다. 확정된 자동 실행은 구조화 실행 요청으로 선택된 실행 주체에 위임합니다.
---

# GitHub Workflow Engine

이 스킬은 GitHub와 로컬 상태를 정규화한 뒤 Workflow Definition을 평가하는 얇은 오케스트레이터다.
작업 전이의 단일 원천은 `definitions/*.json`, 각 state adapter와
`scripts/workflow-definition/evaluator.mjs`다. 실제 GitHub 상태 변경, 파일 변경, 브랜치, 커밋, PR,
댓글과 review thread 변경은 선택된 실행 주체만 수행한다.

## 계약 읽기

항상 다음 계약을 읽는다.

- `references/workflow-definition-contract.md`
- `references/normalized-fact-adapter-contract.md`

작업에 해당하는 계약만 추가로 읽는다.

- raw GitHub·로컬 상태를 수집하거나 관측 근거를 분류할 때 `references/state-observation-contract.md`
- 전용 제안·분석 스킬의 결과를 사용할 때 `references/artifact-output-contract.md`
- 리뷰를 실행·정규화·게시·대응할 때 `references/review-runtime-contract.md`
- 확정된 작업을 자동 실행할 때 `references/structured-execution-contract.md`
- 사용자가 현재 요청에서 검증 모드를 명시했을 때만 `references/validation-mode-contract.md`
- 이슈 또는 PR 템플릿, 제목, label, 연관 이슈 계약이 필요할 때 `references/github-templates.md`

필요한 경우 대상 저장소의 `.harness/logs/github-workflow-log.md`를 보조 근거로 읽는다.
`docs/github-workflow-engine.md`는 설계 문서이며 런타임 입력으로 읽지 않는다.

## Workflow 선택

기준 대상과 이슈 유형을 관측한 뒤 다음 매핑 중 정확히 하나를 선택한다.

| `workflow_id` | Definition | state adapter | 정규화 함수 |
| --- | --- | --- | --- |
| `feature-proposal` | `definitions/feature-proposal.json` | `scripts/workflow-definition/feature-proposal-state-adapter.mjs` | `normalizeFeatureProposalFacts` |
| `policy-review` | `definitions/policy-review.json` | `scripts/workflow-definition/policy-review-state-adapter.mjs` | `normalizePolicyReviewFacts` |
| `feature-change` | `definitions/feature-change.json` | `scripts/workflow-definition/feature-change-state-adapter.mjs` | `normalizeFeatureChangeFacts` |
| `feature-fix` | `definitions/feature-fix.json` | `scripts/workflow-definition/feature-fix-state-adapter.mjs` | `normalizeFeatureFixFacts` |
| `implementation` | `definitions/implementation.json` | `scripts/workflow-definition/implementation-state-adapter.mjs` | `normalizeImplementationFacts` |

각 전용 state adapter는 workflow별 static source contract를 검증한 뒤 공통 fact 정규화 계약으로
관측값을 변환한다. 런타임에서 source contract를 구성하거나 보완하지 않는다.

이슈 유형 label과 제목이 충돌하거나 유형을 하나로 확정할 수 없으면 Workflow를 추정하지 않고
중단한다. 공통 구현 흐름으로 진입하는 Definition의 작업이 반환된 뒤에는 `implementation`을 선택한다.

## 선언형 평가 루프

모든 일반 실행은 다음 단일 경로만 사용한다.

1. 기준 이슈 또는 PR과 raw GitHub·로컬·사용자·스킬 상태를 읽기 전용 snapshot으로 수집한다.
2. 선택한 state adapter로 관측값을 정확히 한 번 정규화한다.
3. 정규화 성공 결과를 `evaluateWorkflowDefinition`에 정확히 한 번 전달한다. evaluator가 내부에서
   Definition을 검증하므로 런타임에서 `validateWorkflowDefinition`을 중복 호출하지 않는다.
4. 최초 진입이면 `definition.entry_task_action_id`, 재개 또는 반복이면 이전 evaluation이 반환한
   `task_action_id`를 `currentTaskActionId`로 전달한다.
5. `action_required`가 반환한 단일 `task_action_id`, `user_decision_options`, `executor_reference`,
   `completion_predicate`를 현재 작업의 실행 입력으로 사용한다.
6. 작업 완료 뒤 상태를 다시 관측·정규화하고 같은 `task_action_id`를 `currentTaskActionId`로 전달한다.
   Definition의 `next_transition_rules`와 evaluator가 다음 단일 작업 또는 완료를 결정한다.
7. `completed`면 흐름을 완료한다. adapter 또는 Definition validation 실패, evaluator의 `stopped`,
   매칭 없음·복수 매칭과 오류는 중단한다.

현재 또는 다음 `task_action_id`를 자연어로 추론하거나 전이표로 보완하지 않는다. Definition에 없는
ID, 현재 정규화 상태와 불일치하는 ID, 재개 ID 누락을 entry로 대체하지 않는다. 실패 시 다른 흐름의
Definition을 시도하거나 자연어 판정과 이중 실행·비교하지 않는다.

## 사용자 결정

`action_required.user_decision_options`가 비어 있지 않으면 사용자 결정으로 멈춘다. 결정 대상과
선택지를 번호 목록으로 제시하고 `기타 의견 입력`을 마지막 항목에 포함한다. 번호, 선택지 문구,
`기타 의견 입력 항목 번호: 의견`, `기타 의견 입력: 의견`만 유효 입력으로 처리한다. 일반 진행 표현을
선택으로 추정하지 않는다. 사용자가 확정한 값은 다음 snapshot의 사용자 관측값으로 정규화하며,
사용자 결정을 실행 주체에 위임하지 않는다.

## 전용 스킬 연결

| 필요한 산출물 | 호출할 스킬 |
| --- | --- |
| 이슈 초안 | `issue-creation` |
| 기능제안 진행 방향 후보 | `feature-proposal-triage` |
| 정책 설계 계획 | `policy-plan` |
| 정책검토 기능변경 전환 방향 후보 | `policy-review-next-triage` |
| 기능변경 계획 | `feature-plan` |
| 기능결함 원인 조사 결과 | `fix-analysis` |
| 기능결함 해결 계획 | `fix-plan` |
| 브랜치 이름 후보 | `branch-proposal` |
| 세부 구현 계획 | `commit-plan` |
| 커밋 메시지 후보 | 전역 `commit` |
| PR 제목과 본문 초안 | `pr-proposal` |
| PR 생성 요청값 | `pr-creation` |
| 리뷰 코멘트 게시 초안 | `review-comment` |

전용 스킬은 후보, 초안 또는 분석 결과만 반환한다. 결과는
`artifact-output-contract.md`를 통과한 경우에만 다음 관측 snapshot에 포함한다. 보류 결과를 상태나
사용자 결정으로 확정하지 않는다.

## 자동 실행

`action_required.executor_reference`가 있고 사용자 결정이 모두 반영된 작업만 자동 실행 후보가 된다.
`structured-execution-contract.md`로 실행 범위, 불변 요청, 실행 주체, 명령 경로, 요청-결과 상관관계와
사후조건을 검증한다.

- 결정론적 비파일 경로가 있으면 추가 LLM 판단 없이 사용한다.
- 결정론적 경로가 없는 확정된 단일 비파일 동작만 `github-simple-executor`에 맡길 수 있다.
- 파일 수정은 대상 프로젝트의 로컬 `run-harness`가 반환한 단일 역할 라우팅과 역할 자산·모델·권한을
  검증한 뒤 `target-harness-code-editor`에 전달한다. 직접 수정 fallback은 사용하지 않는다.
- 리뷰 내용은 사용자가 확정한 리뷰 실행 모드의 실행 주체만 생성한다.

구조화 실행 성공일 때만 상태를 다시 관측해 선언형 평가 루프를 반복한다. 요청·결과·범위·사후조건
검증 실패는 값을 재해석하거나 범위를 넓혀 재시도하지 않고 계약이 산출한 사유와 재개 조건으로
중단한다.

## 명시적 검증 모드

검증 모드는 사용자가 현재 요청에서 명시적으로 요청한 경우에만 실행하는 terminal diagnostic이다.
선택된 실행 주체 또는 대상 하네스 계약으로 실행 가능 여부를 확인한 뒤, 같은 snapshot, route, model,
reasoning, role, skill version, config, input과 deadline으로 정확히 10개의 fresh independent session을
호출한다. parser, adapter와 evaluator는 결정론적이므로 반복하지 않는다.

각 raw result와 session ID, 고정 조건, 오류와 timeout을 보존한다. 결과 의미나 patch 일치 여부를 자동
비교하지 않고, 다수결·대표 결과·결과 채택을 하지 않는다. 10개 raw result와 무결성 확인 결과를
사용자에게 제시하고 재현성은 사용자가 판단한다. 검증 결과로 작업 전이를 진행하거나 일반 workflow를
자동 재개하지 않는다.

## 서브에이전트 수명 주기

Workflow Engine은 자신이 `spawn` 도구를 직접 호출해 발급받은 ID만 현재 오케스트레이션에서 추적하고
닫는다. 여기에는 Workflow Engine이 직접 fan-out한 검증 session과, 상태 요약·단순 실행·리뷰 실행
주체를 별도 subagent로 직접 시작한 session이 포함된다. 같은 session에서 스킬 지시를 읽고 수행하는
단순 스킬 호출은 새 실행 리소스를 만들지 않으므로 수명 주기 관리 대상이 아니다.

직접 발급받은 session의 결과·오류·timeout을 먼저 보존하고 소비한 뒤 성공·실패·중단과 관계없이 다음
전이 또는 최종 응답 전에 각 ID에 `close_agent`를 호출한다. `completed`와 `timed_out`은 결과 상태이지
실행 리소스 정리 완료가 아니다. `close_agent` 성공 또는 `not_found`를 정리 완료로 취급하며,
`not_found`는 이미 런타임에서 제거된 상태로 기록하되 내부 상태 DB를 직접 수정하지 않는다. 정리
결과는 보존한 결과의 의미와 Workflow Definition 전이 판정을 바꾸지 않는다.

`target-harness-code-editor`처럼 하위 실행 주체가 직접 발급받은 child ID는 해당 실행 주체가 소유한다.
Workflow Engine은 그 ID를 추적하거나 중복으로 `close_agent`하지 않고, 반환된 `verification_results`와
`residual_risks_or_failure_reasons`에서 정리 시도와 결과 또는 실패 근거를 검증한다. 새 cleanup 필드,
schema 또는 registry는 만들지 않는다.

## 로그와 출력

작업 진입, evaluation 결과, 사용자 결정, 구조화 실행 요청·결과, 중단과 재개를 대상 저장소의
`.harness/logs/github-workflow-log.md`에 기록한다. `request_id`, 기준 snapshot, `workflow_id`,
`task_action_id`, adapter 정규화 결과와 근거, 사용자 결정, 실행 범위, 실행 주체와 세션 관계,
사후조건, 검증 결과, 남은 위험 또는 재개 조건을 추적할 수 있어야 한다.

사용자 결정, 중단 또는 완료로 멈출 때는 현재 이슈 또는 PR, `workflow_id`, `task_action_id`, 진행 판단,
중단 사유·완료 근거·결정 질문을 제시한다. 선택지가 있으면 번호 목록과 입력 예시를 함께 제시한다.
