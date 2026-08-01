---
name: workflow-code-editor
description: Workflow Engine이 확정한 파일 변경 요청을 실행할 때 Harness 사용 가능 여부를 먼저 판정하고, 사용 가능하면 일반 Harness 진입점으로 위임하며 그렇지 않으면 현재 Codex 세션의 일반 코드 변경 경로로 실행합니다.
---

# Workflow Code Editor

이 스킬은 Workflow Engine의 파일 변경 실행기다. Workflow Engine이 확정한 요청 범위를 바꾸지 않고
Harness 경로 또는 일반 코드 변경 경로 하나를 선택해 실행한 뒤 같은 구조화 결과 계약으로 검증한다.
명시적 검증 모드는 사용자가 판단하는 코드 수정 호출 재현성을 진단한다.

## 먼저 읽을 문서

- `github-workflow-engine/references/file-change-execution-contract.md`
- `github-workflow-engine/references/structured-execution-contract.md`
- `github-workflow-engine/references/command-execution-path-contract.md`
- Harness 경로를 검토할 때만 `github-workflow-engine/references/target-harness-execution-contract.md`
- 명시적 검증 모드일 때만 `github-workflow-engine/references/validation-mode-contract.md`
- 새 execution session을 직접 생성할 때만 `github-workflow-engine/references/agent-lifecycle-contract.md`
- 대상 저장소의 `AGENTS.md`와 현재 요청에 적용되는 저장소 지시

## 입력

- 사용 가능한 구조화 실행 요청
- `request_id`, `base_issue_or_pr`, `work_target_id`, `work_type`, `target_ids_or_files`
- `confirmed_request_values`, `target_baseline`, `preconditions`, `expected_postconditions`, `verification_criteria`
- permission, tool, command path와 destructive risk 조건
- Workflow Engine orchestration session ID
- 현재 사용자 요청에서 명시적으로 활성화된 검증 모드 여부

요청값, baseline, 대상 파일과 검증 기준을 보완하거나 다시 판단하지 않는다.

## 일반 모드

1. primary의 baseline, 대상 저장소 지시와 요청 범위를 재확인한다.
2. `file-change-execution-contract.md`에 따라 Harness 준비도를 부수 효과 없이 확인한다.
3. Harness가 준비됐으면 Workflow Engine 식별자를 제외한 일반 작업 설명, 대상 파일, baseline, 제약과
   검증 기준을 Harness 일반 진입점에 전달한다.
4. Harness가 없거나 실행 전에 준비되지 않았음이 확인되면 현재 Codex 세션에서 일반 파일 편집 도구와
   저장소 지시로 변경한다.
5. 선택 경로 실행을 시작한 뒤 실패하면 다른 경로로 fallback하거나 같은 변경을 두 번 실행하지 않는다.
6. 실제 변경 파일과 GitHub 상태를 확인하고 요청에 지정된 검증을 실행한다.
7. 경로별 원본 결과를 공통 구조화 실행 결과로 정규화하고 요청-결과 상관관계, 범위와 사후조건을 검증한다.

Harness 경로는 Harness에 Workflow Engine 설정, 구조화 필드, 전용 역할 또는 전용 결과 형식을 요구하지
않는다. Harness가 현재 요청에 새 session을 요구하면 그 생성 주체의 callable `close_agent` 확인도 준비도에
포함한다. 이 capability가 없으면 첫 spawn 전에 Harness 경로를 선택하지 않는다. 일반 코드 변경 경로는
같은 session에서 실행하므로 close capability가 필요 없고 Harness 자산을 생성하거나 갱신하지 않는다.

## 검증 모드

검증 모드는 사용자가 현재 요청에서 명시한 경우에만 실행한다.

1. primary와 외부 상태를 변경하지 않고 동일 baseline의 격리 workspace와 fresh independent editing
   session을 정확히 10개 시작하려고 시도한다.
   첫 workspace 또는 session을 만들기 전에 이 스킬이 현재 host에서 callable `close_agent`를 확인한다.
   capability가 없으면 관측 session 수 0과 중단 사유를 반환하고, 더 적은 session으로 축소하거나 ordinary
   workflow를 자동 재개하지 않는다.
2. 각 session에 같은 요청, 선택 경로, 저장소 지시, permission/tool/path 조건과 동일 유한 deadline을
   전달한다.
3. session과 workspace를 재사용하지 않고 결과, 오류, timeout과 실제 ID를 그대로 보존한다.
4. 이 스킬이 직접 발급받은 모든 session ID는 결과를 보존한 뒤 `close_agent`하고 정리 결과를 기존
   `integrity_verification`, 실패는 `integrity_failure_reasons`에 기록한다.
5. patch를 자동 비교·채택하거나 primary에 적용하지 않는다. 완전 fan-out이면 고유 session ID와 raw
   result 정확히 10개를, 불완전 fan-out이면 실제로 얻은 결과와 실패 사유를 사용자에게 제시한다.
6. 사용자가 재현성을 판단할 수 있는 terminal diagnostic을 반환하고 ordinary workflow를 자동 재개하지
   않는다.

## 출력

일반 모드는 다음 공통 필드를 실제 값으로 반환한다.

```text
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

`performed_actions`와 `verification_results`에는 `target_harness` 또는 `general_code_change` 선택과 근거를
포함한다. 적용되지 않는 actual 식별자는 공통 계약의 `not_applicable` 값과 사유를 사용한다.

### 검증 모드 terminal diagnostic

검증 모드는 일반 구조화 실행 결과를 반환하지 않고 다음 필드만 반환한다.

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

완전 fan-out이면 고유 ID 정확히 10개와 대응하는 raw result 정확히 10개가 있어야 한다. 불완전 fan-out에서는 관측된
count, 실제 ID와 사용 가능한 결과만 반환하고 누락 ID나 결과를 만들거나 재시도하지 않는다. 이 진단의
결과 채택은 금지하며 사용자의 판단과 종료로 끝난다.

## 실행 리소스 소유권

- 같은 세션의 일반 코드 변경은 새 실행 리소스가 아니므로 별도 정리하지 않는다.
- execution 또는 validation session을 만들기 전에 callable `close_agent`를 확인한다. 없으면 새 ID를
  발급하지 않으며 `interrupt_agent`나 host 자동 정리를 close로 간주하지 않는다.
- 이 스킬이 execution 또는 validation session ID를 직접 발급받으면 결과·오류·timeout을 먼저 보존한
  뒤 성공·실패·중단과 무관하게 자신이 발급받은 모든 ID에 `close_agent`를 호출한다.
- `close_agent` 성공 또는 `not_found`를 정리 완료로 기록하고 내부 상태 DB를 직접 수정하지 않는다.
- ordinary execution session의 정리 시도와 결과는 기존 `verification_results`, 정리 실패는
  `residual_risks_or_failure_reasons`에 기록한다. 검증 session은 기존 `integrity_verification`과
  `integrity_failure_reasons`를 사용하며 새 cleanup 필드나 schema를 만들지 않는다.
- Harness 또는 그 하위 역할이 직접 생성한 child ID는 중복으로 닫지 않고 반환된 정리 근거만 검증한다.
- 발급된 ID가 0개인 same-session 일반 변경의 정리는 적용되지 않는다. 예외적으로 ID 발급 뒤
  `close_agent`를 호출할 수 없게 되면 결과를 보존하고 기존 실패 필드에 unresolved cleanup을 기록하며
  구조화 실행 성공 또는 완전한 검증으로 반환하지 않는다.

## 하지 않는 일

- 확정된 요청 범위, baseline, 사용자 결정 또는 검증 기준 변경
- Harness 미설치 상태를 해결하기 위한 Harness 설치·생성·갱신
- 선택 경로 실행 시작 뒤 다른 경로 fallback
- commit, push, PR 생성 또는 review thread 변경
- 실행하지 않은 편집이나 검증 결과를 성공으로 기록
