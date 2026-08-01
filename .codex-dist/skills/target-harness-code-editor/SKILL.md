---
name: target-harness-code-editor
description: Workflow Engine이 검증한 대상 local run-harness 라우팅과 불변 코드 수정 요청을 일반 모드에서 실행하고, 명시적 검증 모드에서는 사용자가 판단하는 코드 수정 호출 재현성을 격리 진단합니다.
---

# Target Harness Code Editor

이 스킬은 Workflow Engine이 확정한 파일 수정 요청을 선택 타겟 역할에 위임하는 절차다. Workflow
Engine과 이 스킬은 라우팅 또는 편집 판단을 대신하지 않는다. 일반 모드에서는 기존 단일 별도 편집
session 계약을 유지하고, 검증 모드에서만 같은 baseline의 10개 격리 workspace와 실제 editing LLM
session을 오케스트레이션한다. 검증 결과는 사용자 판단을 위한 diagnostic observation이며 primary
수정이나 Workflow transition으로 채택하지 않는다.

## 먼저 읽을 문서

- 설치된 `github-workflow-engine/references/structured-execution-contract.md`에서 `실행 범위 규칙`, `중단과 재개 판정 규칙`, `구조화 실행 요청 판정 규칙`, `구조화 실행 결과와 요청-결과 상관관계 판정 규칙`, `구조화 실행 성공과 중단 판정 규칙`을 읽는다.
- 명령을 실행할 때 `github-workflow-engine/references/command-execution-path-contract.md`를 읽는다.
- 파일 수정 요청의 준비도·라우팅·선택·세션 예외·출력 사용 가능을 판정할 때 `github-workflow-engine/references/target-harness-execution-contract.md`를 읽는다.
- 검증 모드이면 `github-workflow-engine/references/validation-mode-contract.md`에서 `대상과 고정 조건`, `실행과 무결성`, `사용자 반환과 종료` 섹션만 읽는다.
- `spawn`으로 editing session을 시작할 때 `github-workflow-engine/references/agent-lifecycle-contract.md`를 읽는다.
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
  활성화 여부. 과거 요청이나 실행 주체 분류만으로 활성화하지 않는다.

요청값, baseline, 라우팅, 역할, model/reasoning/skill/config, 대상 파일 범위를 보완하거나 다시
선택하지 않는다. 식별자는 `request_id`만 사용하고 fingerprint를 만들지 않는다.

## 공통 사전 검증

1. 현재 primary baseline이 `target_baseline`과 일치하는지 확인한다.
2. 전달된 라우팅을 대상 `run-harness`, `team-spec`, `orchestration-plan`, agent TOML, local skill에
   재대조한다. 후보가 0개 또는 복수이거나 role/agent/skill/config가 다르면 파일을 변경하지 않는다.
3. model, reasoning, sandbox, permission, available tool, command path, destructive risk가 요청과 같은지
   확인한다. 확인 불가능하거나 불일치하면 session을 시작하지 않는다.
4. 이 스킬은 일반 모드의 별도 execution session과 검증 모드의 10개 session을 직접 생성하므로 첫
   `spawn` 전에 현재 host에서 callable `close_agent`를 확인한다. capability가 없으면 ID와 workspace를
   만들지 않고 `실행 세션 미시작 중단`으로 반환한다. `interrupt_agent`를 close로 대체하지 않는다.

## 일반 모드

1. 공통 사전 검증을 통과하면 orchestration session과 다른 정확히 하나의 fresh execution session에서
   선택 타겟 역할을 시작한다.
2. 선택 역할은 전달된 불변 요청과 route/model/reasoning/skill/config를 사용해 primary에서 파일을
   수정하고 각 명령 직전 permission/tool/path/risk를 재확인한다.
3. 실제 session ID가 발급되기 전 실패는 `실행 세션 미시작 중단`, 발급 뒤 실패는 해당 실제 session의
   중단 결과로 반환한다. 직접 수정 fallback이나 두 번째 편집 session은 금지한다.
4. 이 스킬이 `spawn` 도구를 직접 호출해 발급받은 일반 편집 session ID만 추적한다. 결과·오류·timeout과
   실제 session ID를 먼저 보존한 뒤, 성공·실패·중단과 무관하게 Workflow Engine에 결과를 반환하기 전에
   해당 ID에 `close_agent`를 호출한다. `close_agent` 성공 또는 `not_found`를 실행 리소스 정리 완료로
   기록하며 `not_found`일 때 내부 상태 DB를 직접 수정하지 않는다.
5. 기존 공통 구조화 실행 결과와 라우팅 고유 필드를 그대로 반환한다. `verification_results`에는 직접
   발급받은 ID별 정리 시도와 결과를 기록하고, 정리 실패는 `residual_risks_or_failure_reasons`에 기록한다.
   새 cleanup 필드, schema 또는 registry는 만들지 않는다. 정리 호출은 보존한 결과의 의미나 Workflow
   상태 전이 판정을 바꾸지 않는다.
6. Workflow Engine은 이 스킬이 직접 발급받은 ID를 중복으로 닫지 않는다. 이 스킬도 선택 타겟 역할이
   내부에서 별도의 child session을 직접 생성했다면 그 ID를 닫지 않고, 해당 생성 주체가 반환한 기존
   검증·남은 위험 필드의 정리 근거만 보존한다.

## 검증 모드

검증 모드는 코드 수정 호출 자체를 실제로 10회 실행해 사용자가 재현성을 판단하도록 하는 절차다.

1. primary를 변경하지 않은 채 `target_baseline`을 재확인하고, 같은 baseline에서 시작하는 격리
   workspace를 10개 의도된 slot마다 하나씩 만들려고 시도한다. 완전 fan-out이면 workspace ID는 모두
   고유한 정확히 10개다.
2. 10개 의도된 slot마다 fresh independent editing LLM session 하나를 시작하려고 시도한다. 각 session은
   서로 다른 격리 workspace 하나만 사용하고, 동일 request, route, model, reasoning, selected role,
   skill/version, config, sandbox, permission/tool/path 조건과 동일 유한 deadline을 받는다. 완전 fan-out이면
   session ID는 모두 고유한 정확히 10개다.
3. session reuse/continue, 이전 session의 prompt/result/context/patch 공유, primary 편집, GitHub·branch·
   commit·PR·comment 변경을 금지한다. 각 session은 자신의 workspace에서만 실제 파일을 편집·검증한다.
4. 시작된 session을 유한 wait-all로 기다리고 각 raw result, session/workspace ID, 조건 관측값과 실패
   사유를 그대로 보존한다. fan-out이 일부만 시작됐거나 session 생성이 실패하면 발급된 모든 ID와 사용
   가능한 raw result, 관측된 session/workspace 수, 명시적 무결성 실패 사유를 기록한다. retry하거나
   누락 ID·결과를 만들지 않는다. timeout, blocked, 환경·baseline 불일치, 중복 ID 또는 외부 부수 효과도
   실험 무결성 실패로 기록한다.
5. 이 스킬이 `spawn` 도구를 직접 호출해 10개 의도된 slot에서 실제 발급받은 모든 검증 session ID의
   결과·오류·timeout을 보존하고 소비한 뒤 각 ID에 `close_agent`를 호출한다. `completed` 또는
   `timed_out`은 실행 리소스 정리 완료가 아니다.
   `close_agent` 성공 또는 `not_found`를 정리 완료로 기록하고 `not_found`일 때 내부 상태 DB를 직접
   수정하지 않는다. 정리 결과는 기존 `integrity_verification`에, 정리 실패는 기존
   `integrity_failure_reasons`에 기록한다. 새 cleanup 필드는 만들지 않으며, 정리 결과는 raw result
   의미나 실험 무결성 판정을 바꾸지 않는다.
6. patch를 정규화하거나 비교하지 않는다. pass/mismatch, 다수결, 대표 patch, 결과 채택은 금지한다.
   validation session/workspace 결과로 primary 파일을 수정하거나 Workflow Definition transition을
   선택·완료·진행하지 않는다.
7. 완전 fan-out이면 10개의 raw result와 무결성 결과를, 불완전 fan-out이면 사용 가능한 모든 raw result와
   실패 사유를 사용자에게 제시하고 skill/prompt 개선, validation 종료 또는 나중의 ordinary workflow 실행
   중 다음 행동을 명시적으로 결정하도록 요청한 뒤 종료한다. 이 결정은 Workflow Definition transition으로
   추가하지 않고 ordinary workflow를 자동 재개하지 않는다.

close capability preflight 실패는 1개 또는 더 적은 session으로 축소하지 않는다. 관측 session 수 0,
발급된 ID 없음과 명시적 실패 사유만 기록하며 호출하지 않은 raw result나 정리 결과를 만들지 않는다.

## 출력

### 일반 모드 구조화 실행 결과

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

일반 모드의 `actual_execution_session_id`는 단일 실제 편집 session을 가리킨다.

### 검증 모드 terminal diagnostic

검증 모드는 일반 모드 구조화 실행 결과를 반환하지 않는다. 완전 또는 불완전 fan-out 모두 다음 필드만
반환한다.

```text
request_id
target_baseline
snapshot_source
fixed_condition_observations
observed_session_count
observed_workspace_count (격리 workspace가 필요한 경우에만)
validation_session_ids
validation_workspace_ids (격리 workspace가 필요한 경우에만)
raw_results
integrity_verification
integrity_failure_reasons
```

완전 fan-out의 `observed_session_count`는 10이고 `validation_session_ids`는 고유 ID 정확히 10개이며
`raw_results`는 각 session의 원본 결과를 모두 보존한다. 격리 workspace를 사용한 완전 fan-out은
`observed_workspace_count`와 `validation_workspace_ids`에도 각각 고유 ID 정확히 10개를 기록한다.
불완전 fan-out은 발급된 모든 session/workspace ID와 사용 가능한 모든 raw result만 기록하고, 관측된
count와 `integrity_failure_reasons`에 명시적 실패 사유를 남긴다. 누락 ID나 결과를 만들거나 재시도하지
않는다. 이 진단에는 일반 모드 구조화 실행 결과 필드를 넣지 않으며 자동 결과 채택은 금지한다.

## 하지 않는 일

- 라우팅을 새로 수행하거나 다른 역할, model, reasoning, skill, config를 선택하지 않는다.
- 일반 모드에서 복수 session을 시작하거나 검증 모드에서 primary를 session workspace로 사용하지 않는다.
- 불일치 결과를 다수결로 채택하거나 patch를 수동 병합·보정하지 않는다.
- validation session/workspace에서 primary 또는 외부 상태를 변경하지 않는다.
- 이 스킬 또는 Node script가 실제 editing LLM을 호출한 것처럼 허위 receipt를 만들지 않는다.
- commit, push, PR, GitHub 상태, review thread 또는 하네스 로그를 변경하지 않는다.

## 중단 조건과 후속 전이

일반 모드의 사전 검증 실패, session 미시작/실패, baseline 변경은 `routing_status: aborted`, 빈 변경
결과와 구체적인 재개 조건으로 반환한다. 검증 모드는 완전 또는 불완전 fan-out 모두 위 terminal
diagnostic에 관측된 ID, 사용 가능한 원본 결과와 무결성 실패 사유를 보존한다. 검증 결과는 ordinary
구조화 실행 성공이나 다음 Workflow transition에 연결하지 않는다.
