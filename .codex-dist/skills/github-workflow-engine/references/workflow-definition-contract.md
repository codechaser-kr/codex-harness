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

## 설치 Definition

설치된 workflow definition은 `../definitions/*.json`에 둔다. 각 definition은 이 계약과
schema를 따르는 독립 JSON 문서이며, 등록 executor reference를 사용하기 전에 validator로
구조 및 semantic validation을 통과해야 한다.

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
- `next_transition_rules`

`task_action_id`는 `FP-1`, `PR-1`, `FC-1`, `FF-1`, `FI-1`과 같은 형식만 허용한다. 공통
정규식은 `^(FP|PR|FC|FF|FI)-[1-9][0-9]*$`이며 숫자는 1 이상이어야 하고 0 또는 선행
0을 허용하지 않는다.
`workflow_kind`별 접두어는 `feature_proposal=FP`, `policy_review=PR`,
`feature_change=FC`, `feature_fix=FF`, `implementation=FI`다. 이 상관관계는 C2 semantic
validator가 검증한다.

`user_decision_specification`은 `required`, `options`, `allow_free_form`,
`block_execution_until_confirmed`를 가진 닫힌 객체다. 각 option은 `decision_id`와
`label`을 가진 닫힌 객체다. `required`가 `true`이면 option이 하나 이상 필요하고,
`false`이면 option 배열은 비어 있을 수 있다. option의 `decision_id` 고유성 및 다른
필드 간 운용 의미는 C2 semantic validator가 검증한다.

`registered_executor_reference`는 문자열 또는 `null`이다. 실행기 참조가 등록 레지스트리를
가리키는지는 C2 validator가 확인한다.

`next_transition_rules`는 필수 배열이다. 각 rule은 `condition`과 `transition_id`를 가진
닫힌 객체다. `transition_id`는 비어 있지 않은 일반 안정 ID 문자열이며, `condition`은
기존 expression AST 또는 `null`이다. `condition: null`은 무조건 후속 전이를 뜻하고,
유일한 rule로만 허용한다. 일반적인 무조건 이동은 `condition: null` rule 하나로 표현한다.

terminal transition은 `next_transition_rules: []`이어야 한다. terminal이 아닌 transition은
rule을 하나 이상 가져야 한다. 조건부 rule 집합은 priority나 선언 순서로 선택하지 않는다.
선언한 normalized fact 유한 도메인의 모든 상태에서 정확히 하나의 rule만 일치해야 한다.
0개 일치는 조건 누락, 둘 이상 일치는 조건 중복 오류다.

## C2/C3 교차 검증

JSON Schema가 표현할 수 없는 객체 속성 기반 고유성, workflow kind와 action prefix의
상관관계, registry 참조, fact 참조와 AST 의미 검증은 C2 semantic validator 책임이다.

C3 graph validator는 transition ID 고유성, `entry_transition_id`,
`terminal_transition_ids`, rule `transition_id` 참조의 존재, entry 기준 전체 도달성,
terminal rule 배열, terminal 도달 가능성과 종료 불가능 순환을 검증한다. 순환 자체는
허용하지만 도달 가능한 각 transition과 SCC는 rule을 따라 적어도 하나의 terminal로 갈 수
있어야 한다. 기존 자연어 전이표는 이 definition 또는 런타임에 연결하지 않는다.

C3 semantic validation은 각 transition의 `completion_predicate`가 자신이 참조하는 선언 fact
도메인의 어떤 상태에서라도 참이 될 수 있는지 검증한다. 참조하지 않는 fact는 이 판정의 상태
공간에 포함하지 않는다. `exists`와 `not_exists` 의미를 위해 각 참조 fact의 누락 상태도
도메인 상태로 포함하며, 어떤 상태에서도 참이 될 수 없는 predicate는
`completion_predicate.unsatisfiable` 오류로 거부한다.

조건 의미 검증은 각 non-terminal candidate transition의 유효한 조건부
`next_transition_rules`가 참조하는 fact ID의 합집합만 상태 공간에 포함한다. 참조 fact는
선언된 normalized fact 순서로 탐색하고, next-transition coverage에는 기존처럼
`allowed_values` 상태만 포함하며 missing 상태는 추가하지 않는다. 기본 상태 공간 상한은
10,000개이며 `validateWorkflowDefinition`의 `maxConditionStates` option으로 양의 정수
상한을 재정의할 수 있다. 각 transition의 관련 상태 공간 곱셈 결과가 상한을 넘으면 해당
transition의 `next_transition_rules` 경로에 `condition_state_space.limit_exceeded` 구조화
오류를 반환하고 그 transition의 탐색을 하지 않는다.
completion predicate satisfiability 검증도 같은 option을 해당 predicate가 참조하는 fact와
누락 상태로 구성한 상태 공간에 적용한다. 이 상태 공간이 상한을 넘으면
`completion_predicate_state_space.limit_exceeded` 구조화 오류를 반환하고 탐색하지 않는다.
이 정적 검증은 C4 런타임 평가기와 CLI가 사용한다.

## C4 결정론적 평가와 CLI

`evaluateWorkflowDefinition(definition, normalizedFactState, options?)`는 외부 실행 주체,
GitHub, LLM, 파일 변경 없이 definition과 고정된 normalized fact state만 평가하는 순수
Node.js API다. `options.currentTransitionId`가 없으면 `entry_transition_id`에서 시작한다.
평가 전 C2/C3 validator를 호출하며 definition 오류는 `stopped`와
`invalid_definition`으로 반환한다.

state는 plain object여야 한다. 선언되지 않은 fact, value type 불일치, 또는
`allowed_values` 밖의 값은 `stopped`와 `invalid_state`로 반환한다. 선언된 fact의 누락은
`exists`와 `not_exists` 의미를 위해 허용한다. 각 transition에서 normalized condition이
거짓이면 중단하고, completion predicate가 거짓이면 `action_required`를 반환한다.
predicate가 참인 non-terminal은 `next_transition_rules`를 평가해 정확히 하나의 rule만
일치할 때 이동한다. 0개 또는 복수 일치는 각각 중단 오류이며 선언 순서나 priority로
선택하지 않는다. 같은 호출에서 transition을 다시 방문하면 `evaluation_cycle`로 중단한다.
이 순서는 terminal transition에도 동일하게 적용된다. terminal도
`normalized_fact_conditions`가 참이어야 하며, 거짓이면 중단한다. 진입 조건이 참이더라도
`completion_predicate`가 거짓이면 `action_required`, 둘 다 참일 때만 `completed`를 반환한다.
terminal의 `normalized_fact_conditions`와 `completion_predicate`를 동일하게 두는 것은 schema
필수 제약이 아니다. 현재 설치 Definition은 완료 상태에서 진입과 완료를 동시에 만족시키기
위한 권장 관용구로 이 방식을 사용한다.

`cli.mjs`는 다음 read-only 명령을 제공하고 stdout에는 구조화 JSON만 쓴다.

```
node cli.mjs validate --definition <path>
node cli.mjs evaluate --definition <path> --state <path> [--current-transition-id <id>]
```

validate 성공과 evaluate의 `action_required` 또는 `completed`는 exit 0이다. definition,
state, 평가 중단 오류는 exit 1이고 usage 오류는 exit 2다.

## Executor Registry

`../registries/registered-executors.json`은 배열이며 각 항목은 ordinary 실행 주체 식별 필드
`executor_id`, `executor_kind`, `side_effect_scope`, `runtime_reference`와 validation 전용 분류 필드
`execution_class`, `validation_strategy`를 가진다. `runtime_reference`는 기존 skill, review mode 또는
설치된 deterministic script 식별자이며 임의 실행 명령 문자열이 아니다.

기본 registry와 `validateWorkflowDefinition(..., { registry })`의 custom registry는 같은 strict
contract를 사용한다. registry는 비어 있지 않은 배열이어야 하고 각 entry는 위 여섯 필드만 정확히
가진 plain object여야 한다. 모든 필드 값은 비어 있지 않은 문자열이고 `executor_id`는 고유해야 한다.
`executor_kind`, `side_effect_scope`, `execution_class`, `validation_strategy`는 등록 enum에 속해야 하며,
`llm_session`은 `semantic_consensus` 또는 `isolated_patch_consensus`만,
`deterministic_tool`은 `run_once`만 사용할 수 있다. 추가·누락 필드, 중복 ID, `Set`, string array,
non-plain entry, 잘못된 enum 또는 execution class/strategy 조합은 결정적인 `registry.load_failed`로
거부한다.

C2/C3 validator는 ordinary 실행에서도 registry 전체 구조와 definition의 executor reference 존재를
항상 검증한다. 이 구조 검증은 classification metadata를 ordinary transition 선택에 사용하는 것과
다르다. 유효한 `execution_class`와 `validation_strategy` 값은 ordinary Definition evaluation이나
transition 선택의 입력이 아니며 validation mode를 활성화하지 않는다. 현재 사용자 요청에서
validation mode가 명시적으로 활성화된 뒤에만 runtime이 이미 검증된 두 값을 읽어 diagnostic 비교
전략을 선택한다.
