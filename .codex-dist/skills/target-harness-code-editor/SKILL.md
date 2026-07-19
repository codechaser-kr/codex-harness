---
name: target-harness-code-editor
description: Workflow Engine이 검증한 대상 local run-harness 라우팅과 불변 코드 수정 요청을 일반 모드에서 실행하고, 명시적 검증 모드에서는 10-workspace patch 재현성을 격리 진단합니다.
---

# Target Harness Code Editor

이 스킬은 Workflow Engine이 확정한 파일 수정 요청을 선택 타겟 역할에 위임하는 절차다. Workflow
Engine과 이 스킬은 라우팅 또는 편집 판단을 대신하지 않는다. 일반 모드에서는 기존 단일 별도 편집
session 계약을 유지하고, 검증 모드에서만 같은 baseline의 10개 격리 workspace와 실제 editing LLM
session을 오케스트레이션한다. 검증 결과는 사용자 판단을 위한 diagnostic observation이며 primary
수정이나 Workflow transition으로 채택하지 않는다.

## 먼저 읽을 문서

- 설치된 `github-workflow-engine/references/workflow-engine-rules.md` 전체
- 검증 모드이면 `github-workflow-engine/references/validation-mode-contract.md` 전체
- 대상 프로젝트의 `AGENTS.md`, `.agents/skills/run-harness/SKILL.md`
- 대상 프로젝트의 `.harness/docs/team-spec.md`, `.harness/docs/orchestration-plan.md`
- 선택 역할의 `.codex/agents/<agent_file>.toml`, `.agents/skills/<agent_file>/SKILL.md`

## 입력

- `구조화 실행 요청 사용 가능`과 `Target Harness Code Editor 선택 가능`을 통과한 변경 불가능한 요청
- 유일한 `request_id`, `target_baseline`, `work_type`, `target_ids_or_files`,
  `confirmed_request_values`, permission/tool/path 조건
- 검증된 `routing_status`, 단일 `selected_role_id`, `agent_config_path`, `local_skill_path`,
  `routing_evidence`, `model`, `model_reasoning_effort`, `sandbox_mode`
- 메인 Workflow Engine orchestration session ID와 현재 사용자 요청에서 명시적으로 확인된 검증 모드
  활성화 여부. 과거 요청이나 registry 분류만으로 활성화하지 않는다.
- 검증 모드이면 `planned_session_relation = ten_independent_isolated_execution_sessions`와
  index 1..10의 닫힌 `planned_session_slots` 정확히 10개. 각 slot은 known ID 또는
  `pending_tool_issued`인 planned execution session/workspace ID를 가진다.

요청값, baseline, 라우팅, 역할, model/reasoning/skill/config, 대상 파일 범위를 보완하거나 다시
선택하지 않는다. 식별자는 `request_id`만 사용하고 fingerprint를 만들지 않는다.

## 공통 사전 검증

1. 현재 primary baseline이 `target_baseline`과 일치하는지 확인한다.
2. 전달된 라우팅을 대상 `run-harness`, `team-spec`, `orchestration-plan`, agent TOML, local skill에
   재대조한다. 후보가 0개 또는 복수이거나 role/agent/skill/config가 다르면 파일을 변경하지 않는다.
3. model, reasoning, sandbox, permission, available tool, command path, destructive risk가 요청과 같은지
   확인한다. 확인 불가능하거나 불일치하면 session을 시작하지 않는다.

## 일반 모드

1. 공통 사전 검증을 통과하면 orchestration session과 다른 정확히 하나의 fresh execution session에서
   선택 타겟 역할을 시작한다.
2. 선택 역할은 전달된 불변 요청과 route/model/reasoning/skill/config를 사용해 primary에서 파일을
   수정하고 각 명령 직전 permission/tool/path/risk를 재확인한다.
3. 실제 session ID가 발급되기 전 실패는 `실행 세션 미시작 중단`, 발급 뒤 실패는 해당 실제 session의
   중단 결과로 반환한다. 직접 수정 fallback이나 두 번째 편집 session은 금지한다.
4. 기존 공통 구조화 실행 결과와 라우팅 고유 필드를 그대로 반환한다.

## 검증 모드

검증 모드는 `isolated_patch_consensus`이며 다음 순서를 바꾸지 않는다.

1. primary를 변경하지 않은 채 `target_baseline`을 재확인하고, 같은 baseline에서 시작하는 격리
   workspace를 정확히 10개 만든다. workspace ID는 모두 고유하고 같은 index의 request planned slot과
   일치해야 한다. `pending_tool_issued`는 실제 발급 workspace ID로 해소한다.
2. 정확히 10개의 fresh independent editing LLM session을 시작한다. 각 session은 서로 다른 격리
   workspace 하나만 사용하고, 동일 request, route, model, reasoning, selected role, skill/version,
   config, sandbox, permission/tool/path 조건과 동일 유한 deadline을 받는다. 실제 session ID도 같은
   index의 known planned ID와 일치해야 하며 `pending_tool_issued`는 실제 발급 ID로 해소한다.
3. session reuse/continue, 이전 session의 prompt/result/context/patch 공유, primary 편집, GitHub·branch·
   commit·PR·comment 변경을 금지한다. 각 session은 자신의 workspace에서만 실제 파일을 편집·검증한다.
4. 각 session 완료 뒤 deterministic normalization으로 닫힌 `{path, operation}` manifest와 canonical
   patch를 만들고 SHA-256 `patch_digest`를 계산한다. Manifest path는 고유한 저장소 상대경로이고
   code-unit 오름차순이며 operation은 `add|modify|delete`다. Canonical patch는 rename/copy detection을
   끄고 고정 `diff --git`, `---`, `+++` header와 add/delete mode marker를 사용하며 manifest의
   path/operation/order와 정확히 일치해야 한다. Node script는 editing agent를 시작하지 않으며 receipt와
   patch를 검증·정규화·비교하는 데만 사용한다.
5. 10개 모두를 유한 wait-all로 기다린다. timeout, blocked, 환경·baseline 불일치, 중복 session 또는
   workspace ID, 외부 부작용, manifest/canonical patch/digest 불일치가 하나라도 있으면 실행 중 session을
   종료·close하고 validation을 중단한다. retry, majority, representative patch 채택은 금지한다.
6. `{ request, receipts }`를 validation comparator에 한 번 전달한다. `pass`의
   `unanimous_outcome`과 mismatch를 모두 diagnostic observation으로만 사용한다.
7. validation session/workspace는 primary 또는 외부 상태를 변경할 수 없다. 모든 editing 결과는 격리
   workspace 안에만 남고, pass/mismatch로 원 파일 편집 결과를 채택하거나 Workflow Definition
   transition을 선택·완료·진행하지 않는다.
8. 최종 결과의 validation-only proof에는 authoritative session/workspace ID와 공통 correlation 필드만
   둔다. isolated baseline은 request/receipts에서, manifest/canonical patch/digest는 comparator outcome과
   receipts에서 읽으며 top-level proof field로 복제하지 않는다.
9. 결과를 사용자에게 제시하고 skill/prompt 개선, validation 종료 또는 나중의 ordinary workflow 실행
   중 다음 행동을 명시적으로 결정하도록 요청한 뒤 종료한다. 이 결정을 Workflow Definition
   transition으로 추가하지 않고 ordinary workflow를 자동 재개하지 않는다.

## 출력

라우팅 고유 필드와 기존 공통 구조화 실행 결과 필드를 반환한다.

```text
routing_status
selected_role_id
agent_config_path
local_skill_path
routing_evidence
model
model_reasoning_effort
sandbox_mode
request_id
target_baseline
actual_executor_type
actual_agent_or_role
actual_model_identifier
actual_skill_identifier
actual_config_identifier
actual_orchestration_session_id
actual_execution_session_id
actual_session_relation
actual_permission_conditions
actual_available_tool_conditions
actual_command_execution_path
execution_path_recheck_result
performed_actions
changed_files
github_state_changes
verification_results
postconditions_satisfied
residual_risks_or_failure_reasons
```

검증 모드에서는 다음 증명 필드를 추가한다.

```text
consensus_session_ids
consensus_workspace_ids
actual_execution_session_id_not_applicable_reason
```

일반 모드의 `actual_execution_session_id`는 단일 실제 편집 session을 가리킨다. 검증 모드에서는
`consensus_session_ids`와 `consensus_workspace_ids`가 authoritative actual 식별자이며 request slot과
대조된 고유 ID를 정확히 10개 기록한다. 이때 singular 필드는
`actual_execution_session_id = not_applicable`,
`actual_execution_session_id_not_applicable_reason = validation_consensus_uses_session_set`이고,
`actual_session_relation = ten_independent_isolated_execution_sessions`다. 이 명시적 사유는 session을
시작하지 못한 `execution_session_not_started`와 혼용하지 않는다.

## 하지 않는 일

- 라우팅을 새로 수행하거나 다른 역할, model, reasoning, skill, config를 선택하지 않는다.
- 일반 모드에서 복수 session을 시작하거나 검증 모드에서 primary를 session workspace로 사용하지 않는다.
- 불일치 결과를 다수결로 채택하거나 patch를 수동 병합·보정하지 않는다.
- validation session/workspace에서 primary 또는 외부 상태를 변경하지 않는다.
- unanimous patch를 원래 편집 결과로 자동 채택하지 않는다.
- 이 스킬 또는 Node script가 실제 editing LLM을 호출한 것처럼 허위 receipt를 만들지 않는다.
- commit, push, PR, GitHub 상태, review thread 또는 하네스 로그를 변경하지 않는다.

## 중단 조건과 후속 전이

사전 검증 실패, session 미시작/실패, consensus 실패, baseline 변경은 모두
`routing_status: aborted`, 빈 변경 결과와 구체적인 재개 조건으로 반환한다. 실제 session ID가 발급된
뒤의 중단은 발급된 모든 ID와 상태를 보존한다. 10개 fan-out이 완료된 뒤의 중단은 두 consensus ID
배열에 정확히 10개를 기록하고 `validation_consensus_uses_session_set` 사유를 사용한다. fan-out 전에
아무 session도 시작하지 못한 중단은 기존 `execution_session_not_started` 사유와 빈 consensus 배열을
사용한다. 일부만 시작된 불완전 set은 발급된 ID와 실패 근거를 보존하지만 target editor 출력 사용 가능
판정을 통과하지 못하고 validation 중단으로 처리한다. 완전한 pass도 진단 결과만 반환하며 Workflow
Engine은 이를 ordinary 구조화 실행 성공이나 다음 Workflow transition에 연결하지 않는다.
