# Validation Mode Contract

## 범위

Validation mode는 사용자가 현재 요청에서 명시적으로 요청했을 때만 실행하는 terminal diagnostic이다.
목적은 동일 입력에서 LLM 결과의 재현성을 관찰하고 skill/prompt 개선 근거를 사용자에게 제공하는
것이다. 일반 Workflow 실행이나 transition이 아니며 comparator의 pass/mismatch와
`unanimous_outcome`을 원래 LLM 결과로 채택하지 않는다.

Workflow Engine과 `target-harness-code-editor`가 실제 session fan-out, wait-all과 종료를
오케스트레이션한다. `scripts/validation-mode/*`는 agent를 호출하지 않으며 이미 수집된 request와
receipt를 결정론적으로 검증, 정규화, 비교한다.

## Registry 분류

`registries/registered-executors.json`의 각 entry는 기존 식별 필드에 다음을 명시한다.

- `execution_class`: `llm_session` 또는 `deterministic_tool`
- `validation_strategy`: `semantic_consensus`, `isolated_patch_consensus`, `run_once` 중 하나

registry 전체는 명시적 validation 활성화 여부와 관계없이 strict six-field closed contract로 항상
구조 검증한다. 유효한 분류 값은 명시적 validation 활성화가 확인된 뒤 진단 비교 전략을 고르는 데만
사용한다.
`llm_session`은 두 consensus strategy 중 하나만, `deterministic_tool`은 `run_once`만 사용한다.
`executor_kind`, `side_effect_scope`, proposal output 여부로 LLM 호출을 추론하지 않는다. 유효한 분류
값은 validation을 자동 활성화하거나 ordinary Workflow Definition evaluation 및 transition 선택의
입력이 아니다. malformed 분류는 ordinary 실행에서도 registry validation 실패다.

## 실행 순서

1. registry strict 구조 검증은 항상 수행한다. 현재 사용자 요청에 validation mode의 명시적 요청이
   없으면 검증된 분류 값을 diagnostic strategy로 해석하지 않고 ordinary workflow를 그대로 실행한다.
2. 진단할 원 호출의 raw GitHub/local snapshot을 읽기 전용으로 한 번 수집해 고정한다. 결정론적으로
   관측 가능한 fact는 adapter와 evaluator에 한 번 전달해 현재 진단 대상을 식별할 수 있지만 저장된
   transition을 진행·완료시키지 않는다. fact derivation 자체가 LLM 판단이면 그 호출을 진단 대상으로
   삼고 outcome을 adapter/evaluator에 전달하지 않는다.
3. 명시적 활성화 뒤에만 registry 분류로 `semantic_consensus`, `isolated_patch_consensus`, `run_once`
   중 진단 전략을 선택한다. `run_once`는 반복 진단 대상이 아님을 보고하고 종료한다.
4. `llm_session` 진단마다 동일 snapshot, route, model, reasoning, role, skill/version, config, input을
   가진 정확히 10개의 fresh independent session을 시작한다.
5. timeout, blocked, 환경 불일치, session ID 중복, 외부 부작용 또는 outcome 불일치가 있으면
   상태 변경 전에 전부 중단한다. 다수결, 재시도, 대표 결과 채택은 금지한다.
6. parser, adapter, evaluator 같은 deterministic tool은 fan-out하지 않고 진단 대상 식별에 필요한
   경우 한 번만 실행한다. comparator의 pass/mismatch 또는 `unanimous_outcome`을 adapter/evaluator에
   다시 전달하지 않는다.
7. pass와 mismatch를 모두 diagnostic observation으로 사용자에게 제시하고 종료한다. pass를 원 호출
   결과나 사용자 결정으로 채택하지 않고, 결과로 Workflow Definition transition을 선택·완료·진행하지
   않으며 normal workflow를 자동 재개하지 않는다.
8. 사용자가 skill/prompt를 개선할지, validation을 끝낼지, 나중에 ordinary workflow를 별도 요청으로
   실행할지 명시적으로 결정하도록 요청한다. 이 결정은 Workflow Definition transition이 아니다.

외부 상태 변경은 10개 session에서 read-only plan으로만 관찰한다. isolated editing은 같은 baseline의
격리 workspace에서만 수행한다. validation session/workspace는 primary 또는 외부 상태를 변경할 수
없다.

## Consensus Request

Request는 닫힌 JSON 호환 객체이고 `request_id`만 식별자로 사용한다. 추가 fingerprint나 파생
식별자는 허용하지 않는다.

- `request_id`: 비어 있지 않은 문자열
- `consensus_strategy`: `semantic_consensus` 또는 `isolated_patch_consensus`
- `state_snapshot`: 정확히 `github_state`, `local_state` plain object를 가진 raw snapshot
- `invocation_specification`: 아래의 닫힌 객체

`semantic_consensus` request는 위 공통 필드만 가진다. `isolated_patch_consensus` request만 다음 세
필드를 추가로 필수로 가진다. semantic request에는 이 필드를 넣지 않는다.

- `baseline`: 고정 baseline plain object
- `planned_session_relation`: 정확히 `ten_independent_isolated_execution_sessions`
- `planned_session_slots`: `session_index`, `planned_execution_session_id`, `planned_workspace_id`만
  가진 닫힌 entry 정확히 10개. 배열은 `session_index` 1..10 순서이며 index는 고유하다. 두 ID는
  비어 있지 않은 known ID 또는 `pending_tool_issued`이고, known ID는 종류별로 고유하다.

Invocation specification 필드는 `route`, `skill_reference`, `skill_version`, `model_identifier`,
`reasoning_configuration`, `role_configuration`, `config_reference`, `deadline_configuration`, `input`이다. route, skill/version,
model, config는 비어 있지 않은 문자열이고 나머지는 JSON 호환 값이다. `deadline_configuration`은
`timeout_ms`만 가진 닫힌 plain object이고 `timeout_ms`는 양의 finite integer다. `null`, 빈 객체,
추가 필드, 0, 음수, 실수, 비유한 값은 허용하지 않는다. 10개 session은 이 객체를 그대로 관측해야 한다.

## Session Receipt

`semantic_consensus` receipt는 다음 공통 필드를 모두 가지는 닫힌 객체다.

- `request_id`, `session_index`(1..10), 고유 `session_id`
- `observed_state_snapshot`, `observed_invocation_specification`
- `status`: `usable`, `blocked`, `timeout`, `environment_mismatch` 중 하나
- `outcome`: session이 반환한 정규화된 전체 plain object
- `external_side_effects`: primary 또는 외부 상태 변경 목록이며 pass에는 빈 배열만 허용

`isolated_patch_consensus` receipt는 위 공통 필드에 고유 문자열 `workspace_id`와 plain object
`observed_baseline`을 필수로 추가한다. semantic receipt에는 두 필드를 넣지 않는다.

Comparator는 observed snapshot과 invocation이 request와 의미상 같은지 확인하고 isolated patch에서는
observed baseline도 request baseline과 대조한다.
`usable`이 아닌 receipt, 중복·누락 index/ID, 환경 불일치, 외부 부작용은 pass할 수 없다.
Isolated patch receipt의 `session_index`는 같은 index의 planned slot과 대조한다. known planned ID는
실제 `session_id` 또는 `workspace_id`와 정확히 같아야 하고, `pending_tool_issued`는 도구가 발급한
비어 있지 않은 실제 ID로 해소되어야 한다. 실제 session ID와 workspace ID는 각각 정확히 10개이며
모두 고유해야 한다.

`isolated_patch_consensus` outcome은 정확히 다음 필드를 가진다.

```json
{
  "manifest": [{ "path": "relative/path", "operation": "modify" }],
  "canonical_patch": "diff --git ...",
  "patch_digest": "sha256:..."
}
```

Comparator는 `canonical_patch`의 SHA-256과 `patch_digest`를 다시 계산하고, manifest를 포함한 전체
outcome이 10개 모두 같은지 비교한다. workspace 내부 변경은 canonical patch로만 전달하며 primary나
외부 변경으로 기록하지 않는다.

`manifest`는 canonical code-unit 오름차순 배열이고 각 entry는 정확히 `path`, `operation`만 가진다.
`operation`은 `add`, `modify`, `delete` 중 하나다. `path`는 비어 있지 않은 저장소 상대경로이며
absolute path, 빈 segment, `.`/`..` segment, NUL, CR/LF를 허용하지 않는다. path는 고유해야 한다.

Canonical patch 생성은 rename/copy detection을 끄고 각 파일을 독립 `diff --git a/<path> b/<path>`
record로 출력한다. `---`/`+++` header에는 timestamp나 임의 prefix를 넣지 않고 add는
`/dev/null` -> `b/<path>`와 `new file mode`, delete는 `a/<path>` -> `/dev/null`과
`deleted file mode`, modify는 같은 `a/<path>`/`b/<path>`를 사용한다. record는 manifest와 같은
path 순서이며 전체 patch는 LF 하나로 끝난다. Comparator는 rename/copy header를 거부하고 diff/file
header, operation marker, manifest path/operation/order가 changed file record와 정확히 일치하는지
fail-closed로 검증한다.

## 비교 결과

객체 key 순서는 정규화하고 배열 순서는 보존한다. 정확히 10개의 usable receipt와 정규화된 전체
outcome이 전원 일치할 때만 다음 중심 필드를 반환한다.

```json
{
  "request_id": "...",
  "status": "pass",
  "reason": "unanimous",
  "consensus_strategy": "semantic_consensus",
  "unanimous_outcome": {},
  "consensus_receipt": {
    "session_ids": ["..."]
  },
  "receipt_count": 10,
  "errors": []
}
```

semantic `consensus_receipt`는 실제 `session_ids`만 증명한다. isolated patch 결과만 실제
`workspace_ids`를 추가한다. isolated baseline은 request와 각 receipt의 `observed_baseline`에서
검증하고 manifest, canonical patch, digest는 `unanimous_outcome`에서 읽는다. 전략에 적용되지 않는
필드는 null 또는 빈 배열 placeholder로 만들지 않는다.

Target editor의 검증 모드 진단 결과에서는 `consensus_session_ids`와
`consensus_workspace_ids`가 actual session set의 authoritative 식별자다. 완전한 진단 결과와
10개 fan-out 뒤의 중단 결과는 두 배열에 request slot과 대조된 고유 ID를 정확히 10개 기록하고,
`actual_execution_session_id = not_applicable`,
`actual_execution_session_id_not_applicable_reason = validation_consensus_uses_session_set`,
`actual_session_relation = ten_independent_isolated_execution_sessions`를 기록한다. 이는 fan-out 전에
아무 session도 시작하지 못한 `execution_session_not_started` 중단과 다른 사유다. 일부 session만
시작된 불완전 set은 발급된 ID를 실패 근거로 보존하되 완전한 진단 결과가 아니므로 validation
중단으로만 처리한다. pass 결과도 ordinary 구조화 실행 성공이나 Workflow transition 완료로 판정하지
않는다.

불일치나 contract 위반은 `status: stopped`, 결정적 `reason`, `{ code, path, message }` 오류를
반환한다. pass output의 일부만 채택하거나 9:1 다수결을 적용하지 않는다. `pass`와 `stopped` 모두
사용자가 다음 행동을 판단하기 위한 진단 결과이며 자동 후속 실행을 발생시키지 않는다.

## Control-plane 검증 경계

fixture가 10개 receipt를 구성해 comparator를 검증하는 테스트는 control-plane test다. 이 테스트는
request 고정, 고유 ID, fail-closed 비교와 설치본 정합성을 검증하지만 실제 LLM session을 시작했다는
live evidence가 아니다. mock/control-plane 결과를 live evidence라고 부르지 않는다. 실제 validation
관측은 부모 orchestration이 발급한 10개 session ID와 runtime receipt를 별도로 보존해 확인한다.
