# Compiled Artifact Consumer 계약

이 문서는 Workflow Engine이 thin 스킬의 structured handoff를 공통 artifact runtime gate 뒤에서 소비하는 경계를 정의한다. producer 출력은 `artifact-handoff-contract.md`, manifest와 receipt는 `artifact-manifest-contract.md`, 의미 사용 가능 판정은 `artifact-output-contract.md`를 따른다.

## 소비 입력

Workflow Engine은 호출한 thin 스킬에서 다음 값을 고정한다.

- expected artifact type: 호출한 thin 스킬과 같은 식별자
- expected contract digest: 현재 registry의 해당 compiled manifest가 가진 `contract_digest`
- handoff: producer가 반환한 닫힌 `artifact_type`·`artifact` envelope

consumer는 envelope 밖의 설명, 직접 작성된 Markdown 또는 이전 실행의 receipt를 입력으로 사용하지 않는다. expected artifact type이나 digest를 producer 결과로 보완하거나 다시 계산하지 않는다.

Producer가 GitHub·local raw source를 필요로 하면 Workflow Engine은 현재 `request_id`의
`observation_snapshot_consumer_input`을 producer 입력 경계로 전달한다. exact repository·source identity와
`input_snapshot_digest`가 일치하는 immutable raw source만 사용할 수 있고, 같은 평가 주기의 source를
producer가 다시 조회하거나 이전 request의 snapshot으로 보완하지 않는다. Snapshot runtime은 raw input만
공유하며 의미 판단, artifact handoff·receipt, renderer 결과와 사용자 결정을 cache하지 않는다.

## 단일 소비 순서

`scripts/artifact-contract/artifact-consumer.mjs`의 `consumeArtifactHandoff`는 다음 순서를 한 번씩 수행한다.

1. handoff가 닫힌 두 필드 envelope이고 expected artifact type과 일치하는지 검사한다.
2. `acceptArtifact`로 active compiled manifest에 대한 구조 검증과 rendering을 실행한다.
3. accepted receipt의 `artifact_type`과 `contract_digest`를 expected 값과 대조한다.
4. accepted receipt만 `artifact-output-contract.md`의 의미 판정 callback에 전달한다.
5. 의미적으로 사용 가능한 receipt만 상태 관측 정규화 callback에 전달한다.
6. 정규화 결과가 반환된 뒤에만 다음 Workflow 계산 또는 확정 실행 callback을 호출한다.

4단계 이후 callback에는 raw handoff를 전달하지 않는다. 다음 fact 관측은 `artifact_type`, `contract_digest`, immutable receipt와 그 receipt에서 판정한 의미 결과만 근거로 구성한다. renderer 출력은 사용자 표시용이며 Markdown을 다시 parse해 fact를 만들지 않는다.

## Fail-closed

invalid envelope, producer identity mismatch, unknown artifact type, 구조 오류, stale compiled manifest 또는 expected digest mismatch에서는 `receipt: null`로 중단하고 의미 판정, 상태 정규화와 후속 callback을 하나도 시작하지 않는다. 의미 판정이 `usable: false`를 반환하면 receipt는 진단 근거로 보존할 수 있지만 상태 정규화와 후속 callback은 호출하지 않는다.

consumer와 callback 오류를 raw artifact 사용이나 자연어 구조 재판정으로 복구하지 않는다. 오류 사유와 stable `code`·JSON Pointer `path`를 기록하고 새 관측 또는 수정된 producer 출력으로 재개한다.
