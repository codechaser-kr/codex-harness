# Structured Artifact Handoff 계약

이 문서는 전용 thin 스킬이 만든 의미 결과를 공통 artifact runtime gate에 전달하는 producer 경계를 정의한다. `artifact-manifests/*.json`은 기계 구조의 단일 원천이며, 이 문서는 manifest 필드와 규칙을 복제하지 않는다.

## Producer 출력

thin 스킬은 다음 두 필드만 가진 닫힌 handoff envelope를 반환한다.

```json
{
  "artifact_type": "<producer-skill-id>",
  "artifact": {}
}
```

- `artifact_type`은 호출된 thin 스킬 이름 및 해당 manifest의 `artifact_type`과 정확히 같아야 한다.
- `artifact`는 해당 `artifact-manifests/<artifact_type>.json`의 최상위 `fields`를 manifest 순서로 채운 structured object다.
- 필수 여부, nested shape, enum, ID·참조·순서 rule과 표시 순서를 자연어로 복제하거나 producer가 다시 판정하지 않는다.
- 입력이 부족하거나 충돌한 경우에도 envelope 밖의 별도 설명을 만들지 않고 manifest가 선언한 보류 질문 field에 사유와 필요한 재개 입력을 기록한다.
- producer는 `contract_digest`, receipt, renderer 결과 또는 runtime 승인 상태를 만들거나 추정하지 않는다.
- producer는 Markdown heading을 직접 조립하지 않는다. 사용자 표시용 Markdown은 runtime gate가 검증 성공 artifact를 renderer에 전달해 만든다.

## 의미 판단 경계

각 thin 스킬은 기존 책임에 따라 정책 타당성, 추천 근거, 원인 확인 수준, 범위 적합성, 템플릿·diff 위치 같은 의미를 판단한 뒤 그 결과를 `artifact`에 담는다. manifest validator는 이 의미 판단을 대신하지 않는다.

## Consumer 전제

handoff envelope는 아직 검증된 receipt가 아니다. consumer는 `artifact_type`과 `artifact`를 공통 runtime gate에 그대로 전달하고, `status: accepted`인 receipt만 사용할 수 있다. invalid artifact, unknown type 또는 contract mismatch에서는 producer 결과를 보완·재해석하거나 raw artifact로 fallback하지 않는다.
