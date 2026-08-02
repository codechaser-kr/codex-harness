# Workflow Definition Contract

## 실행 계약

Workflow Definition은 JSON 문서이며 `scripts/workflow-definition/validator.mjs`가 유일한 실행
검증 계약이다. 별도의 JSON Schema 파일이나 이중 구조 검증은 사용하지 않는다. 모든 객체는
명시된 필드만 허용하는 닫힌 객체이며 `priority`와 임의 확장 필드는 허용하지 않는다.

## 루트 구조

루트는 정확히 다음 네 필드를 가진다.

- `workflow_id`: 닫힌 workflow 식별자
- `entry_task_action_id`: 최초 작업의 `task_action_id`
- `facts`: fact ID를 key로 사용하는 닫힌 plain object
- `transitions`: 비어 있지 않은 작업 배열

허용되는 `workflow_id`와 작업 ID 접두어는 다음과 같다.

| `workflow_id` | 접두어 |
|---|---|
| `feature-proposal` | `FP` |
| `policy-review` | `PR` |
| `feature-change` | `FC` |
| `feature-fix` | `FF` |
| `implementation` | `FI` |

`task_action_id`는 `<접두어>-<1 이상의 10진 정수>` 형식이고 Definition 안에서 고유해야 한다.
`workflow_id`가 접두어 규칙을 직접 결정한다.

## Fact 선언

`facts`의 각 key는 비어 있지 않은 `fact_id`이며, 값은 허용 가능한 유한 값의 비어 있지 않은
배열이다. 배열 값은 모두 동일한 scalar 타입이어야 한다.

- boolean
- string
- integer

타입은 배열의 값에서 추론한다. 객체, 배열, `null`, 실수 또는 서로 다른 타입의 혼합은
허용하지 않는다. 선언 순서는 JSON 객체의 비정수 key 삽입 순서를 따르며 adapter 출력도 같은
순서를 보존한다.

모든 정규화 관측값은 evidence를 하나 이상 가져야 한다. 이 규칙은 fact별 설정이 아니라
`normalized-fact-adapter-contract.md`의 공통 계약이다.

## 표현식

표현식은 leaf 또는 compound 형식 하나만 가진다.

Leaf는 `fact_id`, `operator`와 operator별 `value`로 구성한다.

| operator | `value` |
|---|---|
| `equals` | 선언된 fact 도메인 값 하나 |
| `in` | 선언된 fact 도메인 값의 비어 있지 않은 배열 |
| `exists` | `value` 필드 없음 |
| `not_exists` | `value` 필드 없음 |

Compound 형식은 `all` 또는 `any` 하나만 가지며 값은 비어 있지 않은 표현식 배열이다.
`not`, `not_equals`, `not_in`은 지원하지 않는다.

## 작업 구조

각 `transitions` 항목은 정확히 다음 여섯 필드를 가진다.

- `task_action_id`
- `normalized_fact_conditions`
- `user_decision_options`
- `completion_predicate`
- `executor_reference`
- `next_transition_rules`

`task_action_id`가 그래프 노드와 작업의 유일한 식별자다.

`user_decision_options`는 항상 배열이다. 빈 배열이면 사용자 결정이 없다. 비어 있지 않으면
명시적인 사용자 결정이 필요하고 자유 형식 입력을 허용하며, 사용자가 확정하기 전에는 실행을
중단한다. 각 option은 `decision_id`와 `label`만 가지며 `decision_id`는 작업 안에서 고유하다.

`executor_reference`는 필수이며 비어 있지 않은 직접 실행 참조 문자열 또는 명시적 `null`이다.

`next_transition_rules`는 배열이다. 각 rule은 정확히 `condition`과 `task_action_id`를 가진다.
`condition`은 표현식 또는 무조건 전이를 뜻하는 `null`이다. 무조건 rule은 배열의 유일한
항목이어야 한다. 조건부 rule은 선언된 fact 전체 유한 상태에서 빈틈과 중복 없이 정확히 하나가
일치해야 한다.

빈 `next_transition_rules`를 가진 작업이 terminal 작업이다. terminal 목록을 별도로 선언하지
않는다.

## 의미 검증

Validator는 다음을 결정적으로 검증한다.

- 닫힌 구조와 필수 필드
- workflow ID, 작업 ID 형식·고유성·접두어
- fact 도메인의 비어 있지 않음, scalar 타입, 동질성
- 표현식의 fact 참조, 타입과 허용 값
- completion predicate 만족 가능성
- 다음 작업 참조의 존재
- entry 기준 전체 작업 도달성
- 모든 도달 작업에서 terminal 작업으로 가는 경로
- 조건부 rule의 빈틈, 중복과 상태 공간 제한

## 평가 API

`evaluateWorkflowDefinition(definition, normalizedFactState, options)`는 외부 IO와 상태 변경이 없는
Node.js API다. `options.currentTaskActionId`가 없으면 `entry_task_action_id`에서 시작한다.

완료되지 않은 작업은 `action_required`와 단일 `task_action_id`, `user_decision_options`,
`executor_reference`, `completion_predicate`를 반환한다. 완료된 terminal 작업은 `completed`와
단일 `task_action_id`를 반환한다. 중단 결과도 가능한 경우 `task_action_id`를 포함하며
`transition_id`를 반환하지 않는다.

CLI의 재개 옵션은 `--current-task-action-id`다.
