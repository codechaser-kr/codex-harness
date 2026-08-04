# Normalized Fact Adapter Contract

## 목적

`normalizeFactCandidates(definition, candidates)`는 관찰 또는 구조화된 스킬 출력에서 얻은 fact
candidate를 Definition의 `facts` 도메인에 맞춰 정규화한다. 외부 IO, LLM, GitHub API와 파일
변경을 호출하지 않는 순수 함수이며 입력을 변경하지 않는다.

Definition 전체 구조와 의미는 `validator.mjs`로 먼저 검증한다. Adapter가 별도의 축약 구조
검증을 구현하지 않는다.

## 입력

`candidates`는 다음 닫힌 객체의 배열이다.

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

`fact_id`, `value`, `evidence`는 모두 필수다. `value`는 해당 `facts[fact_id]`와 같은 추론 타입이고
도메인 안에 있어야 한다. candidate에 없는 fact는 `exists`와 `not_exists` 의미를 보존하기 위해
허용한다. 동일한 `fact_id` candidate가 둘 이상이면 거부한다.

## Evidence

모든 candidate는 evidence 항목을 하나 이상 가져야 한다. Evidence는 다음 필드만 가지는 닫힌
객체다.

- `source_kind`: `github_state`, `local_state`, `user_input`, `skill_output` 중 하나
- `source_reference`: 원본 상태, 사용자 입력 또는 스킬 출력의 비어 있지 않은 식별 문자열
- `field_reference`: candidate 값을 뒷받침하는 원본 필드나 위치

LLM의 자유 형식 설명을 fact 값으로 직접 사용하지 않는다. 의미 판단 결과는 허용된 구조화 값으로
기록하고 그 출력 필드를 `skill_output` evidence로 연결한다.

## 결과

성공 결과의 `normalized_fact_state`와 `evidence_by_fact` key는 candidate 입력 순서가 아니라
Definition `facts`의 비정수 key 선언 순서를 보존한다. 누락된 fact는 두 객체 모두에 넣지 않는다.

Definition이 잘못되면 `invalid_definition`, candidate 또는 evidence가 잘못되면
`invalid_fact_candidates`로 중단한다. 오류가 하나라도 있으면 부분 결과를 채택하지 않고 두 결과
객체를 모두 비운다.

Workflow별 adapter는 `workflow-state-adapter.mjs`를 통해 source contract를 먼저 검증한 뒤 같은
공통 adapter를 호출한다. 검증 모드에서 LLM 의존 관측을 만들었다면 독립 세션 10개의 raw result를
사용자에게 제시할 뿐, adapter가 결과 일치 여부를 판단하거나 전이를 진행하지 않는다.
