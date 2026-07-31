# 파일 변경 실행 경로 계약

이 문서는 Workflow Engine이 확정한 파일 변경을 `workflow-code-editor`로 실행할 때 Harness 경로와 일반 코드 변경 경로 중 하나를 선택하고, 두 경로의 결과를 같은 구조화 실행 계약으로 검증하는 절차를 정의한다.

공통 요청·결과 필드와 상관관계는 `structured-execution-contract.md`, 명령 권한과 도구 경로는 `command-execution-path-contract.md`, Harness 경로의 세부 준비도와 일반 handoff는 `target-harness-execution-contract.md`, 실행 리소스 정리는 `agent-lifecycle-contract.md`를 따른다.

## 경로 선택

파일을 변경하기 전에 다음 순서로 정확히 한 경로를 선택한다.

1. 대상 저장소의 현재 baseline과 저장소 지시를 확인한다.
2. 설치된 Harness와 대상 저장소의 일반 실행 진입점이 현재 요청을 Workflow Engine 전용 계약 없이 처리할 수 있는지 `target-harness-execution-contract.md`로 확인한다.
3. 준비되었으면 `target_harness`, 설치되지 않았거나 준비되지 않았으면 `general_code_change`를 선택한다.
4. 선택 결과와 근거를 구조화 실행 요청의 예정 실행 주체와 세션 관계에 반영한다.
5. 실행을 시작한 뒤에는 다른 경로로 전환하거나 같은 변경을 재시도하지 않는다.

Harness 준비도 실패는 파일 변경 자체의 중단 사유가 아니다. 이 실패가 실행 시작 전에 확인됐고 일반 코드 변경 경로의 권한·도구·baseline 조건을 충족하면 `general_code_change`를 선택한다.

## Harness 경로

`target_harness`는 다음 조건을 모두 충족할 때만 선택한다.

- 전역 Harness 스킬과 대상 저장소의 일반 실행 진입점이 존재한다.
- Harness가 현재 저장소와 변경 유형을 처리할 수 있다는 준비도 근거가 있다.
- Workflow Engine 전용 설정, 요청 필드, 결과 필드 또는 전용 역할 생성을 Harness에 요구하지 않는다.
- Workflow Engine 요청을 작업 설명, 대상 파일, baseline, 변경 제약, 검증 기준으로 구성한 일반 코드 변경 요청으로 변환할 수 있다.

Harness의 일반 결과는 `workflow-code-editor`가 원 요청 범위와 대조하고 공통 구조화 실행 결과로 정규화한다. Harness가 파일 변경을 시작한 뒤 실패했거나 변경 여부를 확인할 수 없으면 일반 경로로 fallback하지 않고 해당 실행을 중단한다.

## 일반 코드 변경 경로

`general_code_change`는 Harness가 설치되지 않았거나 실행 전 준비도 검증을 통과하지 못한 경우 사용한다.

- 현재 Codex 오케스트레이션 세션에서 저장소 지시와 일반 파일 편집 도구를 사용한다.
- 별도의 Harness 설정, 역할, Team Spec 또는 Workflow Engine 전용 타겟 자산을 생성하지 않는다.
- `target_ids_or_files`, `confirmed_request_values`, `target_baseline`, 권한·도구·명령 경로·파괴적 위험 조건을 그대로 따른다.
- 변경 뒤 요청의 `verification_criteria`를 실행하고 실제 결과만 기록한다.

일반 경로를 선택할 권한·도구가 없거나 baseline이 달라졌으면 파일을 변경하지 않고 구조화 실행 중단으로 반환한다.

## `general_code_change` 성공 결과 예시

다음은 별도 execution session을 만들지 않고 현재 Codex 오케스트레이션 세션에서 변경과 검증을 마친 경우의 최소 예시다. `<...>` 값은 결과를 만들 때 실제 관측 식별자와 대상 값으로 바꾸며 literal 값으로 반환하지 않는다.

```json
{
  "request_id": "<원 요청 request_id>",
  "target_baseline": "<변경 전 commit SHA>",
  "actual_executor_type": "workflow-code-editor",
  "actual_agent_or_role": "<현재 Codex orchestration agent ID>",
  "actual_model_identifier": "<현재 Codex orchestration model ID>",
  "actual_skill_identifier": "workflow-code-editor",
  "actual_config_identifier": "not_applicable",
  "actual_config_identifier_not_applicable_reason": "general_code_change에서 별도 Harness 또는 editor config를 선택하지 않음",
  "actual_orchestration_session_id": "<orchestration-session-id>",
  "actual_execution_session_id": "<같은 orchestration-session-id>",
  "actual_session_relation": "same_session",
  "actual_permission_conditions": ["<확인된 workspace 쓰기 조건>"],
  "actual_available_tool_conditions": ["<사용한 편집·검증 도구 조건>"],
  "actual_command_execution_path": "일반 경로",
  "execution_path_recheck_result": "실행 직전 경로 재판정 통과",
  "performed_actions": [
    "general_code_change 선택과 Harness 준비도 실패 근거 기록",
    "<확정된 대상 파일 변경>"
  ],
  "changed_files": ["<실제로 변경한 파일>"],
  "github_state_changes": [],
  "verification_results": [
    "general_code_change 경로와 선택 근거 확인",
    "<요청된 검증 성공>"
  ],
  "postconditions_satisfied": true,
  "residual_risks_or_failure_reasons": []
}
```

현재 Codex 오케스트레이션 agent와 model이 편집을 수행했으므로 해당 두 식별자는 실제 값이며 `not_applicable`로 기록하지 않는다. 새 session을 만들지 않은 경우 `actual_execution_session_id`는 `actual_orchestration_session_id`와 같고 `actual_session_relation`은 `same_session`이다. 별도 config처럼 실제로 선택하지 않은 식별자만 `not_applicable`로 기록하고 대응하는 `*_not_applicable_reason`에 사유를 남긴다. 이 예시는 공통 결과 필드를 재정의하지 않으며 필드의 최종 의미와 상관관계 판정은 `structured-execution-contract.md`를 따른다.

## 공통 결과 검증

두 경로 모두 다음을 만족해야 한다.

- `request_id`로 원 요청을 선택하고 `target_baseline`과 실행 범위를 대조한다.
- 실제 선택 경로와 선택 근거를 `performed_actions`와 `verification_results`에 기록한다.
- `actual_executor_type`, 적용 가능한 actual agent·model·skill·config, 실제 세션 관계를 선택 경로와 일치하게 기록한다.
- `changed_files`, `github_state_changes`, 검증 결과, 사후조건과 남은 위험을 실제 값으로 반환한다.
- `structured-execution-contract.md`의 요청-결과 상관관계, 실행 범위 준수와 구조화 실행 성공 판정을 통과한다.

Harness 전용 결과 형식은 공통 결과 계약의 선행 조건이 아니다. 경로별 원본 결과를 공통 결과로 정규화하는 책임은 `workflow-code-editor`에 있다.

## 중단과 재개

- 실행 전 Harness 미설치 또는 준비도 실패: 조건을 충족하면 일반 경로를 선택해 계속한다.
- 선택 경로 실행 시작 뒤 실패 또는 부분 변경 가능성: 다른 경로로 재시도하지 않고 실제 변경 여부와 복구 조건을 기록한다.
- baseline, 요청 범위 또는 사용자 확정값 불일치: 파일을 변경하지 않고 새 관측과 새 요청이 필요하다고 기록한다.
- 검증 실패: 변경 결과와 실패 근거를 보존하고 구조화 실행 중단으로 반환한다.
