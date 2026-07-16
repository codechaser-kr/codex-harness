---
name: target-harness-code-editor
description: Workflow Engine이 검증한 대상 local run-harness 라우팅 결과와 완전한 불변 구조화 코드 수정 요청을 재검증하고, 선택된 편집 역할의 별도 실행 세션 결과만 반환합니다.
---

# Target Harness Code Editor

이 스킬은 Workflow Engine이 확정한 파일 수정 요청을 적용하는 중개 절차다. 메인 Workflow Engine은 orchestration session이고, 이 스킬은 그 세션에서 적용되는 위임 절차다. 이 스킬, Workflow Engine, 그리고 대상 프로젝트의 `run-harness`는 파일을 수정하지 않는다. 실제 파일 수정과 검증은 검증된 라우팅이 선택한 정확히 하나의 타겟 편집 역할의 별도 execution session만 수행한다.

## 먼저 읽을 문서

- 설치된 `github-workflow-engine/references/workflow-engine-rules.md` 전체
- 대상 프로젝트의 `AGENTS.md`, `.agents/skills/run-harness/SKILL.md`
- 대상 프로젝트의 `.harness/docs/team-spec.md`, `.harness/docs/orchestration-plan.md`
- 라우팅으로 선택된 역할의 `.codex/agents/<agent_file>.toml`과 `.agents/skills/<agent_file>/SKILL.md`

## 입력

- `workflow-engine-rules.md`의 `구조화 실행 요청 사용 가능` 판정을 이미 통과한 완전하고 변경 불가능한 한 건의 구조화 코드 수정 요청을 받는다.
- 대상 로컬 `run-harness`가 반환하고 Workflow Engine이 검증한 라우팅 결과를 함께 받는다. 이 결과에는 `routing_status`, 정확히 하나의 `selected_role_id`, `agent_config_path`, `local_skill_path`, `routing_evidence`, 선택 역할의 `model`, `model_reasoning_effort`, `sandbox_mode`가 있어야 한다.
- 요청의 `request_id`로만 원 요청을 식별한다. 요청 본문, `target_baseline`, `work_type`, `target_ids_or_files`, `confirmed_request_values`를 보완, 재계산, 대체하거나 범위를 넓히지 않는다.

## 책임

1. 요청이 파일 수정 작업인지와 `구조화 실행 요청 사용 가능` 판정 통과를 확인한다.
2. 대상 프로젝트의 현재 기준 상태가 요청의 `target_baseline`과 일치하는지 확인하고, 로컬 `run-harness`, `team-spec.md`, `orchestration-plan.md`와 역할 자산이 모두 준비됐는지 확인한다.
3. 전달받은 라우팅 결과의 `routing_status`, 단일 선택 역할, 경로, 근거와 선택 역할의 model, reasoning, sandbox를 대상 `team-spec.md`, `orchestration-plan.md`, agent TOML, local skill에 다시 대조한다. Workflow Engine 검증 뒤 기준 상태, 라우팅 근거, 선택 역할 자산 또는 설정이 바뀌지 않았음을 확인한다.
4. 대조한 역할·모델·스킬·config·세션 관계가 불변 요청의 예정 실행 식별자와 일치하는지 확인한다. 이 스킬은 라우팅을 새로 얻거나 `run-harness` 라우팅을 다시 수행하지 않는다.
5. 메인 Workflow Engine의 orchestration session과 다른 별도 execution session 하나에서 정확히 하나의 선택 역할만 시작한다. 선택한 agent config, local skill, model, reasoning, sandbox와 불변 요청 및 검증된 라우팅 결과를 그대로 전달한다.
6. 실제 명령 직전에 선택 역할의 `permission_conditions`, `available_tool_conditions`, `command_execution_path`, `destructive_command_risk`를 다시 확인한다. 하나라도 불일치하거나 확인할 수 없으면 명령을 실행하지 않는다.
7. 선택 역할의 수행 결과를 변경하지 않고 라우팅 고유 필드와 공통 구조화 실행 결과로 반환한다.

## 출력

라우팅 고유 필드 `routing_status`, `selected_role_id`, `agent_config_path`, `local_skill_path`, `routing_evidence`와 함께 다음 공통 구조화 실행 결과 필드를 정확한 이름으로 반환한다.

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

적용할 수 없는 실제 식별자 또는 비명령 실행 경로 필드는 `workflow-engine-rules.md`의 공통 계약에 따라 `not_applicable`과 해당 이유를 함께 반환한다.

`actual_executor_type`, `actual_agent_or_role`, `actual_model_identifier`, `actual_skill_identifier`, `actual_config_identifier`, `actual_execution_session_id`는 중개 절차가 아니라 실제 파일을 수정한 선택 타겟 역할과 그 별도 execution session을 가리킨다. `actual_orchestration_session_id`는 메인 Workflow Engine의 orchestration session을, `actual_session_relation`은 두 세션의 별도 관계를 가리킨다.

## 하지 않는 일

- 파일을 직접 읽기 전용 확인 외의 방식으로 수정, 생성, 삭제하거나 직접 수정 fallback을 사용하지 않는다.
- 사용자 의도, 현재 상태, 작업 전이, 실행 범위, 커밋, PR, 리뷰, 모델 또는 역할 선택을 결정하거나 재판단하지 않는다.
- `run-harness` 라우팅을 새로 얻거나 대체하지 않고, 전달받은 라우팅 결과를 다른 역할로 바꾸지 않는다. 선택 역할의 model, reasoning, sandbox, agent config, local skill을 재정의하거나 더 저렴한 모델로 바꾸지 않는다.
- 라우팅 후보가 없거나 여러 개일 때 임의 역할을 선택하거나 같은 세션에서 직접 수행하지 않는다.

## 사용자 결정

- 없다. 사용자 결정과 구조화 요청 확정은 Workflow Engine의 책임이다.

## 중단 조건

- 요청 또는 Workflow Engine 검증 라우팅 결과 누락, 기준 상태 불일치, 대상 하네스 자산 누락, `routing_status` 불일치, 선택 역할 0개 또는 복수, Workflow Engine 검증 뒤의 라우팅 근거·역할 자산·설정 변경, agent/skill/config 메타데이터 불일치가 있으면 중단한다.
- 역할·모델·reasoning·sandbox·권한·도구·경로·파괴적 위험 조건이 요청 또는 라우팅 결과와 다르거나, 선택 역할의 별도 세션을 시작할 수 없으면 중단한다.
- 중단 시 파일 변경 없이 `routing_status = aborted`와 공통 구조화 실행 결과를 반환한다. 적용 불가 실제 실행 필드는 `not_applicable`과 이유를 기록하고, `changed_files`와 `github_state_changes`는 빈 값으로 둔다. `performed_actions`에는 라우팅 확인과 중단만, `verification_results`에는 중단 검증만, 실패 사유에는 `residual_risks_or_failure_reasons`를 사용한다.

## 후속 전이

- 성공 또는 중단의 공통 구조화 실행 결과만 `github-workflow-engine`에 반환한다.
- Workflow Engine이 요청-결과 상관관계, 실행 범위, 성공 또는 중단과 다음 상태 전이를 판정한다.
