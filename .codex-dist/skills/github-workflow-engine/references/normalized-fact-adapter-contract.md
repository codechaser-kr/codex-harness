# Normalized Fact Adapter Contract

## 목적

`normalizeFactCandidates(definition, candidates)`는 관찰 또는 구조화된 스킬 출력에서 얻은
fact candidate를 workflow definition의 `normalized_fact_schema`에 맞춰 정규화한다. 이
함수는 외부 IO, LLM, GitHub API, 파일 읽기나 변경을 호출하지 않는 순수 함수다. 입력 객체를
변경하지 않으며 동일 입력에는 `JSON.stringify` 기준으로 같은 결과를 반환한다.

정책검토, 기능변경, 기능결함, 공통 구현의 workflow-specific adapter는 public
`normalize*Facts(definition, observations)` wrapper와 기존 오류/result shape를 유지하고,
공통 observation/source-contract 검증은 내부 `workflow-state-adapter.mjs`의
`normalizeWorkflowObservations`를 사용한다. wrapper별 source contract map만 workflow 고유 값이다.

검증 모드에서 observation 또는 fact derivation이 LLM 의존 호출이면 같은 raw snapshot으로 독립 session
10개를 실제 실행하고 raw result를 사용자에게 제시한다. 이 adapter는 결과를 비교하거나 evaluator에
전달하지 않으며 transition을 선택·진행하지 않는다. ordinary workflow에서는 기존처럼 관측을 이
deterministic adapter에 정확히 한 번 전달한다.

## 입력

`definition`에서 adapter가 사용하는 필드는 다음과 같다.

- `workflow_id`: 비어 있지 않은 문자열
- `normalized_fact_schema`: definition 순서의 비어 있지 않은 fact 선언 배열

각 fact 선언은 `fact_id`, `value_type`, `allowed_values`, `evidence_required`만 가지는 닫힌
plain object다. 필드 의미는 `workflow-definition-contract.md`의 Fact 선언을 따른다. 전체
workflow definition의 transition 검증은 definition validator의 책임이며,
adapter는 정규화에 필요한 위 두 필드와 fact 선언을 독립적으로 검증한다.

`candidates`는 배열이다. 각 candidate는 다음 필드만 가지는 닫힌 plain object다.

```json
{
  "fact_id": "feature_proposal_requested",
  "value": true,
  "evidence": [
    {
      "source_kind": "github_state",
      "source_reference": "issue #95",
      "field_reference": "state"
    }
  ]
}
```

`fact_id`, `value`, `evidence`는 모두 필수다. 선언된 fact가 candidate에 없는 것은
`exists`와 `not_exists` 평가 의미를 보존하기 위해 허용한다. 같은 `fact_id`의 candidate가
둘 이상이면 값이 같아도 충돌 가능성을 숨기므로 거부한다.

## Evidence

`evidence`는 닫힌 plain object 배열이다. 각 항목은 `source_kind`, `source_reference`,
`field_reference`를 모두 가져야 한다.

- `source_kind`: `github_state`, `local_state`, `user_input`, `skill_output` 중 하나
- `source_reference`: 원본 상태, 사용자 입력 또는 스킬 출력의 비어 있지 않은 식별 문자열
- `field_reference`: 해당 원본에서 candidate 값을 뒷받침하는 필드나 위치의 비어 있지 않은 문자열

Evidence는 값의 출처와 원본 근거 위치를 함께 보존한다. `evidence_required: true`인 fact의
candidate는 evidence 항목을 하나 이상 가져야 한다. LLM은 자유 형식 설명을 fact 값으로 직접
넣을 수 없다. 의미 판단이 필요하면 허용된 `value`를 별도의 구조화 출력 필드에 기록하고,
그 필드를 `field_reference`로 원본 근거 위치와 연결한 `skill_output` evidence를 제공해야 한다.

## 성공 결과

모든 candidate가 유효하면 다음 결과를 반환한다.

```json
{
  "status": "normalized",
  "workflow_id": "feature-proposal",
  "normalized_fact_state": {
    "feature_proposal_requested": true
  },
  "evidence_by_fact": {
    "feature_proposal_requested": [
      {
        "source_kind": "github_state",
        "source_reference": "issue #95",
        "field_reference": "state"
      }
    ]
  },
  "errors": []
}
```

`normalized_fact_state`와 `evidence_by_fact`의 key는 candidate 입력 순서가 아니라 definition의
`normalized_fact_schema` 순서로 구성한다. 누락된 fact는 두 객체 모두에 넣지 않는다.

## 실패 결과

Definition projection이 잘못되면 `reason: "invalid_definition"`, candidate 또는 evidence가
잘못되면 `reason: "invalid_fact_candidates"`로 중단한다.

```json
{
  "status": "stopped",
  "reason": "invalid_fact_candidates",
  "workflow_id": "feature-proposal",
  "normalized_fact_state": {},
  "evidence_by_fact": {},
  "errors": [
    {
      "code": "candidate.fact.unknown",
      "path": "/candidates/0/fact_id",
      "message": "Unknown fact_id: unknown."
    }
  ]
}
```

유효한 `workflow_id`를 읽을 수 없는 definition 오류에서는 `workflow_id`가 `null`이다. 오류는
항상 `code`, JSON Pointer 형식의 `path`, `message`만 가진다. 오류가 하나라도 있으면 부분
정규화 결과를 채택하지 않고 `normalized_fact_state`와 `evidence_by_fact`를 모두 빈 객체로
반환한다.
