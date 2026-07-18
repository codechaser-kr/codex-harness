# Validation Mode Contract

## 범위

Validation mode C2는 고정 request와 이미 수집된 10개 session result를 순수하게 검증하고
비교한다. 실행 주체, dry-run, 예측 호출, GitHub, 파일, 브랜치, 커밋, PR을 호출하지 않는다.
C3가 이 계약을 이용해 실제 session을 실행하고 런타임 흐름에 연결한다.

## Validation Request

Request는 닫힌 JSON 호환 객체이며 `request_id`만 식별자로 사용한다. fingerprint 또는
추가 식별 필드는 허용하지 않는다. 필수 필드는 다음과 같다.

- `request_id`: 비어 있지 않은 문자열
- `workflow_id`, `version`, `task_action_id`: 비어 있지 않은 문자열
- `state_snapshot`: 정확히 `github_state`, `local_state` plain object를 가진 고정 raw snapshot
- `normalized_fact_state`: 고정된 plain-object state snapshot
- `evaluation_result`: 아래 action-required 계약을 따르는 고정 deterministic evaluation result
- `expected_session_count`: 숫자 `10`만 허용
- `invocation_specification`: 아래의 닫힌 객체

Invocation specification은 `skill_reference`, `skill_version`, `model_identifier`의 비어 있지
않은 문자열과 `reasoning_configuration`, `role_configuration`, `input`의 JSON 호환 값을 가진다.
`undefined`, non-finite number, cycle, function, symbol 등 JSON으로 표현할 수 없는 값은
구조화 오류다.

`state_snapshot.github_state`와 `state_snapshot.local_state`는 각각 수집 시점의 raw GitHub와
local state를 고정한다. 둘은 JSON 호환 plain object여야 하며, `normalized_fact_state`는 이
raw snapshot과 별개로 evaluator에 전달한 정규화 입력을 보존한다.

`evaluation_result`는 현재 evaluator의 `action_required` 반환 shape와 같은 닫힌 객체다.
필수 필드는 `status`, `transition_id`, `task_action_id`, `user_decision_specification`,
`registered_executor_reference`, `completion_predicate`다. `status`는 `action_required`만
허용하고, `transition_id`와 `task_action_id`, `registered_executor_reference`는 비어 있지 않은
문자열이어야 한다. `task_action_id`는 request와 같고,
`registered_executor_reference`는 `invocation_specification.skill_reference`와 같아야 한다.
`user_decision_specification`과 `completion_predicate`는 JSON 호환 plain object다.

## Session Result

Session result는 닫힌 객체이며 `request_id`, `session_index`(1부터 10), 비어 있지 않은
`session_id`, `observed_invocation_specification`, `output_status`,
`normalized_structured_contract_fields`, `semantic_decisions`,
`registered_executor_invoked`, `side_effects`를 가진다.

`output_status`는 `usable` 또는 `blocked`다. 비교에는 `usable`만 허용한다.
`observed_invocation_specification`은 request invocation specification과 의미상 동일해야 한다.
`normalized_structured_contract_fields`와 `semantic_decisions`는 JSON 호환 plain object다.

`side_effects`는 닫힌 객체이며 `github_state_changes`, `github_comments`,
`repository_files`, `branches`, `commits`, `pull_requests` 배열만 가진다. 비교에는 모두 빈
배열이고 `registered_executor_invoked`가 `false`인 result만 허용한다.

`registered_executor_invoked: false`는 Workflow Definition의 정상 구조화 실행 경로로 등록
executor를 실행하지 않았다는 뜻이다. C3가 독립 session에서 `skill_reference`의 skill을
side-effect-free validation probe로 호출하는 것은 이 필드가 뜻하는 executor 실행이 아니며,
C2 자체는 그런 probe를 호출하지 않는다.

## 비교 결과

`compareValidationResults(request, results)`는 request/result를 변경하지 않는다. result 배열의
입력 순서는 무시하고 `session_index`로 정렬한다. 객체 key 순서는 무시하지만 배열 순서는
의미 있게 비교한다.

정확히 10개의 완전한 index, 서로 다른 session ID, request/context 일치, usable output,
executor 미호출, 빈 side effect와 두 비교 대상의 완전한 의미 일치가 모두 만족될 때만 다음을
반환한다.

```json
{ "request_id": "...", "status": "pass", "reason": "reproducible", "session_count": 10, "errors": [] }
```

하나라도 위반하거나 `normalized_structured_contract_fields` 또는 `semantic_decisions`가
다르면 `status: "stopped"`와 결정적 `reason`, `{ code, path, message }` 오류를 반환한다.
9:1 다수결, 재시도, 대표값 보정, 일부 session output 채택은 허용하지 않는다.
