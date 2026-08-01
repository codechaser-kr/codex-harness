---
name: github-workflow-engine
description: GitHub 이슈와 PR의 관측 상태를 선언형 워크플로 정의에 적용해 현재 작업이나 다음 작업을 계산하고, 사용자 결정과 확정 실행을 조율합니다. 사용자가 `워크플로우 흐름으로 진행`, `계속 진행`, `다음 피드백`, `머지했습니다`처럼 기존 이슈·PR 흐름의 시작이나 재개를 요청할 때 사용합니다. 단일 코드 수정, 단순 리뷰, 커밋 메시지 작성은 각각 독립 작업 흐름으로 처리합니다.
---

# GitHub Workflow Engine

이 스킬은 GitHub와 로컬 상태를 정규화한 뒤, 워크플로 정의의 규칙을 적용해 현재 또는 다음 작업을
계산하는 흐름 조율자다. 작업 전이의 단일 기준은 `definitions/*.json`, 각 상태 변환기와
`scripts/workflow-definition/evaluator.mjs`다. 실제 GitHub 상태 변경, 파일 변경, 브랜치, 커밋, PR,
댓글과 리뷰 대화 변경은 선택된 실행 주체만 수행한다.

## 핵심 원칙

- `definitions/*.json`은 작업과 전이 조건을 담은 데이터다.
- `scripts/workflow-definition/*.mjs`는 정의 검증, 상태 정규화, 작업 계산을 수행하는 실행 코드다.
- `references/*.md`는 아래 조건에 따라 읽는 참조문서이며, 전이는 `definitions/*.json`과 실행 코드의 결과로 결정한다.
- 일반 실행은 관측, 한 번의 정규화, 한 번의 `evaluateWorkflowDefinition` 호출이라는 단일 경로를 따른다.
- 사용자 결정은 사용자가 확정하고, 실행 주체는 확정된 범위만 수행한다. 규칙 불일치나 계약 실패가 발생하면 계약이 제시한 사유와 재개 조건으로 중단한다.

## 사용 범위 예시

다음 요청에서 사용한다:

- “#93을 워크플로우 흐름으로 진행해주세요.”
- “계속 진행해주세요. 다음 피드백을 처리합시다.”
- “머지했습니다. 워크플로우 흐름을 이어가주세요.”

다음 요청은 독립 작업 흐름으로 처리한다:

- 단일 함수 또는 파일 수정: 대상 프로젝트의 코드 수정 흐름
- 단순 diff 리뷰: 코드 리뷰 흐름
- 현재 변경의 커밋 메시지 제안: 전역 `commit`

## 계약 읽기

워크플로 정의를 적용할 때 다음 계약을 기본 계약으로 읽는다.

- `references/workflow-definition-contract.md`
- `references/normalized-fact-adapter-contract.md`

현재 작업에 해당하는 계약을 다음 기준으로 추가로 읽는다.

- GitHub·로컬 원본 상태를 수집하거나 관측 근거를 분류할 때 `references/state-observation-contract.md`
- 전용 제안·분석 스킬의 결과를 사용할 때 `references/artifact-output-contract.md`
- 현재 작업에 사용자 선택지가 있거나 재개 요청의 사용자 입력을 해석할 때 `references/user-decision-contract.md`
- 리뷰를 실행·정규화·게시·대응할 때 `references/review-runtime-contract.md`
- 선택한 리뷰 실행 모드가 `claude/*`일 때 `references/claude-review-executor-contract.md`
- 중단·재개를 판정할 때 `references/structured-execution-contract.md`
- 확정된 작업을 자동 실행할 때 `references/structured-execution-contract.md`
- 실제 명령의 권한 경로를 판정하거나 실행 직전에 재판정할 때 `references/command-execution-path-contract.md`
- 확정된 파일 수정 작업의 Harness 또는 일반 경로를 선택할 때 `references/file-change-execution-contract.md`
- 파일 수정에서 Harness 경로의 준비도와 일반 handoff를 판정할 때만 `references/target-harness-execution-contract.md`
- 타겟 저장소의 설정, GitHub 템플릿 또는 라벨을 최초로 필요로 할 때 `references/target-runtime-bootstrap-contract.md`
- 사용자가 현재 요청에서 검증 모드를 명시했을 때만 `references/validation-mode-contract.md`
- 이 스킬이 서브에이전트를 직접 생성하거나 하위 실행 주체의 정리 근거를 검증할 때 `references/agent-lifecycle-contract.md`
- 이슈 또는 PR 템플릿, 제목, 라벨, 연관 이슈 계약이 필요할 때 `references/github-templates.md`와 `references/workflow-engine-template-compatibility-contract.md`

필요한 경우 대상 저장소의 `.harness/logs/github-workflow-log.md`를 보조 근거로 읽는다.
런타임 입력은 위 계약과 실행 코드로 한정한다. `docs/github-workflow-engine.md`는 설계 문서로 취급한다.

## 타겟 런타임 지연 초기화

Workflow Engine 설치는 타겟 저장소의 설정, 템플릿 또는 GitHub 라벨을 생성하지 않는다. 현재 작업이
해당 항목을 최초로 요구할 때만 `target-runtime-bootstrap-contract.md`로 누락 상태를 확인하고 필요한
범위만 준비한다.

- `.workflow-engine/settings.json`은 Workflow Engine만 생성·해석하며 필요한 설정 필드만 보완하고
  기존 유효 값을 보존한다. 파일·필드 부재는 지연 초기화하고 인식할 수 없는 타입·값은 자동 교정이나
  fallback 없이 원래 작업을 중단한다.
- 사용자 선호가 필요한 설정은 임의 기본값을 만들지 않고 사용 가능한 선택지를 제시해 확정받는다.
- GitHub 템플릿은 `github-templates.md`와 `workflow-engine-template-compatibility-contract.md`로 적용·감사하며
  허용된 타겟 확장을 덮어쓰지 않는다.
- 이 초기화는 Harness의 설치, 생성, 갱신 또는 존재 여부와 무관하다.

필요한 초기화가 완료된 경우에만 원래 작업의 상태 관측과 실행을 계속한다. 충돌이나 사용자 결정 대기는
초기화 계약의 재개 조건을 기록하고 중단한다.

## 워크플로 선택

기준 대상과 이슈 유형을 관측한 뒤 다음 매핑에서 정확히 하나를 선택한다.

| `workflow_id` | 워크플로 정의 | 상태 변환기 | 정규화 함수 |
| --- | --- | --- | --- |
| `feature-proposal` | `definitions/feature-proposal.json` | `scripts/workflow-definition/feature-proposal-state-adapter.mjs` | `normalizeFeatureProposalFacts` |
| `policy-review` | `definitions/policy-review.json` | `scripts/workflow-definition/policy-review-state-adapter.mjs` | `normalizePolicyReviewFacts` |
| `feature-change` | `definitions/feature-change.json` | `scripts/workflow-definition/feature-change-state-adapter.mjs` | `normalizeFeatureChangeFacts` |
| `feature-fix` | `definitions/feature-fix.json` | `scripts/workflow-definition/feature-fix-state-adapter.mjs` | `normalizeFeatureFixFacts` |
| `implementation` | `definitions/implementation.json` | `scripts/workflow-definition/implementation-state-adapter.mjs` | `normalizeImplementationFacts` |

각 상태 변환기는 워크플로별로 정해진 원본 데이터 계약을 검증한 뒤, 관측값을 공통 사실 형식으로
정규화한다. 런타임은 정의된 원본 데이터 계약과 상태 변환기의 결과를 사용한다.

이슈 유형은 라벨과 제목이 일치해 하나로 확정된 경우 선택한다. 두 값이 충돌하거나 단일 유형 확정
조건을 충족하지 못하면 중단한다. 공통 구현 흐름에 진입하는 작업이 워크플로 정의에서 반환되면
`implementation`을 선택한다.

## 선언형 작업 계산 절차

모든 일반 실행은 다음 단일 경로로 수행한다.

1. 기준 이슈 또는 PR과 GitHub·로컬·사용자·스킬의 원본 상태를 특정 시점의 읽기 전용 상태 묶음으로
   수집한다.
2. 선택한 상태 변환기로 관측값을 정확히 한 번 정규화한다.
3. 정규화한 사실을 `evaluateWorkflowDefinition`에 정확히 한 번 전달한다. 이 함수는 워크플로 정의의
   규칙을 적용해 현재 또는 다음 작업을 계산한다. 워크플로 정의 검증은 이 함수 내부의 단일 검증
   경로를 사용한다.
4. 최초 진입이면 `definition.entry_task_action_id`, 재개 또는 반복이면 이전 계산 결과가 반환한
   `task_action_id`를 `currentTaskActionId`로 전달한다.
5. `action_required`가 반환한 단일 `task_action_id`, `user_decision_options`, `executor_reference`,
   `completion_predicate`를 현재 작업의 실행 입력으로 사용한다.
6. 작업 완료 뒤 상태를 다시 관측·정규화하고 같은 `task_action_id`를 `currentTaskActionId`로 전달한다.
   워크플로 정의의 `next_transition_rules`와 `evaluateWorkflowDefinition`이 다음 단일 작업 또는 완료를
   결정한다.
7. `completed`면 흐름을 완료한다. 상태 변환기 또는 워크플로 정의 검증이 실패하거나
   `evaluateWorkflowDefinition`이 `stopped`를 반환하면 중단한다. 일치하는 규칙이 없거나 여러
   개인 경우와 오류가 발생한 경우도 중단 조건으로 처리한다.

현재 또는 다음 `task_action_id`는 evaluator가 반환한 값을 그대로 사용한다. 워크플로 정의에 없는
ID, 현재 정규화 상태와 불일치하는 ID, 누락된 재개 ID가 발견되면 해당 계산의 사유와 함께 중단한다.
실패 시 선택된 워크플로 정의의 중단 결과를 반환한다. 전이는 evaluator 호출 결과 한 경로로만 수행한다.

## 사용자 결정

`action_required.user_decision_options`에 값이 있으면 `user-decision-contract.md`를 읽고 사용자 결정으로
멈춘다. 결정 대상과 선택지를 번호 목록으로 제시하고 계약이 허용한 입력으로 결정값을 확정한다. 사용자가
확정한 값은 다음 상태 묶음의 사용자 관측값으로 정규화하고, 실행 주체에는 확정된 결정값만 전달한다.

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
`artifact-output-contract.md`의 요구사항을 충족한 경우에만 다음 관측 상태 묶음에 포함한다.
보류 결과는 보류 상태로 유지한다.

## 자동 실행

`action_required.executor_reference`가 있고 사용자 결정이 모두 반영된 작업을 자동 실행 후보로 삼는다.
`structured-execution-contract.md`로 실행 범위, 실행 중 바꿀 수 없는 요청 값, 공통 실행 주체,
요청과 결과의 대응 관계, 실행 후 충족해야 할 조건을 검증한다. 실제 명령 경로와 권한은
`command-execution-path-contract.md`로 판정한다.

- 같은 입력에 항상 같은 결과를 내는 비파일 실행 경로를 우선 사용한다.
- 결정론적 경로가 없는 확정된 단일 비파일 동작은 `github-simple-executor`에 맡긴다.
- 파일 수정은 `file-change-execution-contract.md`로 실행 경로를 판정한 뒤 `workflow-code-editor`에
  전달한다. Harness와 일반 진입점이 사용 가능하면 Workflow Engine 전용 계약을 제외한 일반 코드 변경
  요청으로 Harness를 호출하고, 설치되지 않았거나 실행 전 준비되지 않았으면 현재 Codex 세션의 일반
  코드 변경 경로를 사용한다. 선택 경로 실행이 시작된 뒤에는 다른 경로로 fallback하지 않는다.
- 리뷰 내용은 사용자가 확정한 리뷰 실행 모드의 실행 주체만 생성한다. `claude/*` 모드는
  `claude-review-executor-contract.md`로 실행 요청과 실패·재개 조건을 판정한다. `FI-15`의
  `claude/code-review`는 `$cc:review --wait`, `FI-16`의 `claude/awesome-code-review`는
  `$cc:adversarial-review --wait`로 같은 오케스트레이션 세션에서 foreground 실행한다. 두 작업은
  `--background`를 전달하거나 foreground/background 선택을 추가하지 않는다.

구조화 실행 성공일 때만 상태를 다시 관측해 선언형 작업 계산 절차를 반복한다.
요청·결과·범위·실행 후 조건을 검증하고, 검증에 실패하면 계약이 산출한 사유와 재개 조건으로
중단한다. 검증 실패 상태에서는 요청 값과 실행 범위를 고정하고 계약이 제시한 재개 조건을 기다린다.

## 명시적 검증 모드

사용자가 현재 요청에서 검증 모드를 명시한 경우 검증 모드로 실행한다. 같은 조건의 서로 독립된 새 세션을 정확히
10개 호출하기 전에 ID 생성 주체가 callable `close_agent`를 확인한다. capability가 없으면 첫 session 전에
중단하고 더 적은 수로 축소하지 않는다. 실행했다면 결과를 사용자에게 제시한다. 재현성은 사용자가 판단한다. 검증 결과는 사용자 판단을 위한
최종 진단 결과로 반환하고 검증 모드를 종료한다. 세부 조건과 오류 처리는
`references/validation-mode-contract.md`를 따른다.

## 서브에이전트 수명 주기

`spawn`으로 ID를 직접 발급받은 실행 주체가 해당 ID의 소유자로서 추적과 종료를 담당한다. 결과를 먼저
보존한 뒤 다음 전이 또는 최종 응답 전에 정리한다. 부모 실행 주체는 자신이 발급받은 ID만 종료하고,
하위 실행 주체가 발급한 ID는 하위 실행 주체의 종료 결과로 확인한다. 세부 처리와 오류 기록은
`references/agent-lifecycle-contract.md`를 따른다.

각 생성 주체는 첫 `spawn` 전에 현재 host의 callable `close_agent`를 확인한다. capability가 없으면 새 ID를
발급하지 않으며, 선택적 위임은 실행 주체가 소유한 same-session 경로로만 계속하고 필수 별도 session은
중단한다. `interrupt_agent`를 close로 대체하지 않는다.

## 로그와 출력

작업 진입, 계산 결과, 사용자 결정, 구조화 실행 요청·결과, 중단과 재개를 대상 저장소의
`.harness/logs/github-workflow-log.md`에 기록한다. `request_id`, 기준 상태 묶음, `workflow_id`,
`task_action_id`, 상태 변환기의 정규화 결과와 근거, 사용자 결정, 실행 범위, 실행 주체와 세션 관계,
실행 후 조건, 검증 결과, 남은 위험 또는 재개 조건을 추적할 수 있어야 한다.

사용자 결정, 중단 또는 완료로 멈출 때는 현재 이슈 또는 PR, `workflow_id`, `task_action_id`, 진행 판단,
중단 사유·완료 근거·결정 질문을 제시한다. 선택지가 있으면 번호 목록과 입력 예시를 함께 제시한다.
