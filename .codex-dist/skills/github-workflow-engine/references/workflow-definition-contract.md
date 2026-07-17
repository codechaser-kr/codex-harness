# Workflow Definition Contract

## 적용 대상

Workflow definition은 JSON 문서이며
`../schemas/workflow-definition.schema.json`의 JSON Schema draft 2020-12를 따라야 한다.
Schema가 정의하는 계약 객체는 모두 닫힌 객체다. 선언되지 않은 필드는 허용하지 않으며,
어느 위치에서도 `priority` 필드는 허용하지 않는다.

루트 객체의 필수 필드는 다음과 같다.

- `workflow_id`: 일반 안정 ID 문자열
- `version`: definition 버전 문자열
- `workflow_kind`: `feature_proposal`, `policy_review`, `feature_change`, `feature_fix`, `implementation`
- `target_type`: `issue`, `pull_request`, `repository`
- `entry_transition_id`: 시작 transition의 일반 안정 ID 문자열
- `terminal_transition_ids`: 종료 transition의 일반 안정 ID 문자열 배열
- `normalized_fact_schema`: 유한 도메인 fact 선언 배열
- `transitions`: transition 배열

`transition_id`와 모든 참조 ID는 `task_action_id`와 별개의 일반 안정 ID다. 이 ID들에
`task_action_id` 형식을 적용하지 않는다.

## Fact 선언

`normalized_fact_schema`의 각 fact는 `fact_id`, `value_type`, `allowed_values`,
`evidence_required`를 가진다. `value_type`은 `boolean`, `string`, `integer` 중 하나이고,
`allowed_values`는 비어 있지 않은 유한 배열이며 선언한 value type과 일치해야 한다.

`fact_id`의 고유성, AST가 참조하는 `fact_id`의 존재, AST 값과 fact 도메인의 일치는
C2 semantic validator가 검증한다. JSON Schema는 개별 fact의 구조와 값 타입만 검증한다.

## 조건 및 완료 predicate AST

`normalized_fact_conditions`와 `completion_predicate`는 문자열이나 코드가 아닌 JSON AST다.
각 AST 노드는 다음 형태 중 정확히 하나여야 한다.

- leaf: `{ "fact_id", "operator", "value"? }`
- all: `{ "all": [AST, ...] }`
- any: `{ "any": [AST, ...] }`
- not: `{ "not": AST }`

leaf의 `operator`는 다음 중 하나다.

| operator | `value` 규칙 |
| --- | --- |
| `equals` | 필수이며 boolean, string, integer 중 하나다. |
| `not_equals` | 필수이며 boolean, string, integer 중 하나다. |
| `in` | 필수이며 비어 있지 않은 boolean, string, integer 값 배열이다. |
| `not_in` | 필수이며 비어 있지 않은 boolean, string, integer 값 배열이다. |
| `exists` | 없어야 한다. |
| `not_exists` | 없어야 한다. |

임의 코드와 shell은 AST에 허용하지 않는다. C2 semantic validator는 leaf가 실제 fact를
참조하는지, operator와 value가 그 fact의 `value_type` 및 `allowed_values`에 맞는지,
중첩된 AST의 의미가 유효한지 검증한다.

## Transition

각 transition은 다음 필드를 모두 가진 닫힌 객체다.

- `transition_id`
- `normalized_fact_conditions`
- `task_action_id`
- `user_decision_specification`
- `completion_predicate`
- `registered_executor_reference`
- `next_transition`

`task_action_id`는 `A-1`, `B-1`, `C-1`, `D-1`, `E-1`과 같은 형식만 허용한다. 숫자는
1 이상이어야 하고 0 또는 선행 0을 허용하지 않는다. `workflow_kind`별 접두어는
`feature_proposal=A`, `policy_review=B`, `feature_change=C`, `feature_fix=D`,
`implementation=E`다. 이 상관관계는 C2 semantic validator가 검증한다.

`user_decision_specification`은 `required`, `options`, `allow_free_form`,
`block_execution_until_confirmed`를 가진 닫힌 객체다. 각 option은 `decision_id`와
`label`을 가진 닫힌 객체다. `required`가 `true`이면 option이 하나 이상 필요하고,
`false`이면 option 배열은 비어 있을 수 있다. option의 `decision_id` 고유성 및 다른
필드 간 운용 의미는 C2 semantic validator가 검증한다.

`registered_executor_reference`와 `next_transition`은 문자열 또는 `null`이다. `null`은
terminal 또는 no-execution 상태를 표현할 수 있다. 실행기 참조가 등록 레지스트리를
가리키는지는 C2 validator가 확인한다.

## C2/C3 교차 검증

JSON Schema가 표현할 수 없는 객체 속성 기반 고유성, workflow kind와 action prefix의
상관관계, registry 참조, fact 참조와 AST 의미 검증은 C2 semantic validator 책임이다.

C3 graph validator는 transition ID 고유성, `entry_transition_id`와 모든 transition
참조의 존재, `terminal_transition_ids` 참조, 도달 가능성, 그래프 종료 조건 및 순환을
검증한다. `terminal_transition_ids`가 가리키는 transition은 반드시
`next_transition: null`이어야 한다. 기존 자연어 전이표는 이 definition 또는 런타임에
연결하지 않는다.

## Executor Registry

`../registries/registered-executors.json`은 배열이며 각 항목은 `executor_id`,
`executor_kind`, `side_effect_scope`, `runtime_reference`만 가진다. `runtime_reference`는
기존 skill 또는 review mode 식별자일 뿐 실행 명령 문자열이 아니다. C2/C3 검증기는
definition이 참조하는 ID가 이 레지스트리에 정확히 존재하고 현재 런타임에서 식별 가능한
실행 주체인지 확인한다.
