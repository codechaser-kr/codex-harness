# Codex Runtime Contract

이 문서는 Harness가 Codex에서 따라야 할 실행 모델을 정의한다.

이 문서는 다른 런타임의 실행 모델과 비교하지 않는다. Codex가 읽고 실행할 수 있는 계약만 다룬다.

Codex용 Harness는 주 에이전트가 역할 계약을 읽고, 필요한 작업만 명확한 경계 안에서 위임하는 구조를 기본으로 둔다.

## 핵심 전제

- Harness의 기준 런타임은 Codex다.
- 생성 결과에서 반드시 실행 기준으로 삼을 자산은 `AGENTS.md`, `.agents/skills/*`, `.harness/docs/*`다. 이 중 역할 기준의 중심은 `team-spec.md`다.
- `.codex/config.toml`과 `.codex/agents/*.toml`은 `team-spec.md`를 구현한 역할 메타데이터다. 생성 대상에는 포함하지만, 역할들이 자동으로 서로 통신한다고 가정하는 실행 근거로 삼지는 않는다.
- `.codex/config.toml`의 `[agents]`에는 `max_threads`, `max_depth`, `[agents.<role_id>]`, `config_file = "agents/<agent_file>.toml"` 형식을 사용하고, `directory` 또는 `skills_directory` 포인터를 두지 않는다.
- `.codex/agents/*.toml`은 `model_reasoning_effort`와 `sandbox_mode` 필드를 사용하고, `reasoning` 또는 `sandbox` 키를 쓰지 않는다.
- 생성된 역할들이 서로 자동 통신한다고 가정하지 않는다.
- 역할 간 연결은 `run-harness`와 `orchestration-plan.md`가 설명하는 주 에이전트 중심 handoff로 표현한다.
- 생성 판단은 `team-spec.md`와 문서 계약이 담당하고, 역할 스킬은 해당 역할 섹션을 읽게 하는 실행 포인터로 작동한다.
- GitHub Workflow Engine의 완전 구조화 코드 수정 요청은 `run-harness`의 진입 입력이 될 수 있다. 이 요청의 공통 필드 집합은 아래 계약을 따르며, 라우팅 중 재판단, 확장, 변경할 수 없다.
- 메타 저장소의 생성기 계약을 수정하는 실행과 생성된 타겟 프로젝트의 코드 수정 실행을 구분한다. 전자는 생성기 역할의 범위이고, 후자는 타겟 프로젝트가 생성한 실제 코드 수정 역할의 범위다.

## Codex 실행 모델

Codex용 Harness는 다음 흐름을 기본으로 한다.

1. 주 에이전트가 `AGENTS.md`와 `run-harness` 스킬을 읽고 현재 요청을 분류한다.
2. `run-harness`가 `team-spec.md`, `domain-analysis.md`, `orchestration-plan.md`를 기준으로 시작 역할과 다음 역할을 정한다. Workflow Engine 구조화 코드 수정 요청이면 `team-spec.md`와 `orchestration-plan.md`의 코드 수정 라우팅 규칙으로 정확히 하나의 실제 수정 역할을 선택하거나 중단한다.
3. 각 역할 스킬은 자신의 `role_id`에 해당하는 `team-spec.md` 섹션을 읽고, 그 섹션의 절차, 입력, 출력, 완료 기준을 따른다.
4. 필요한 경우에만 주 에이전트가 독립적이고 경계가 분명한 작업을 보조 서브에이전트에 위임한다.
5. 결과 통합, 하네스 재진입 Phase 결정, 최신 세션 요약 갱신은 주 에이전트 책임으로 남긴다.

## Workflow Engine 구조화 코드 수정 라우팅

### 공통 구조화 요청 계약

아래 식별자는 Workflow Engine 공통 구조화 요청 계약의 정확한 필드명이다. 한국어 설명은 의미를 보조할 뿐 필드명을 대체하지 않는다.

```text
request_id                         # 요청 식별자
base_issue_or_pr                   # 기준 이슈 또는 풀 리퀘스트
work_target_id                     # 작업 대상 식별자
work_type                          # 확정된 작업 유형
target_ids_or_files                # 변경 대상 식별자 또는 파일
confirmed_request_values           # 확정된 요청 값
target_baseline                    # 변경 기준선
preconditions                      # 사전 조건
expected_postconditions            # 기대 사후 조건
verification_criteria              # 검증 기준
command_execution_path             # 명령 실행 경로
permission_conditions              # 권한 조건
available_tool_conditions          # 사용 가능한 도구 조건
destructive_command_risk           # 파괴적 명령 위험
planned_executor_type              # 예정 실행 주체 유형
planned_agent_or_role              # 예정 agent 또는 역할
planned_model_identifier           # 예정 모델 식별자
planned_skill_identifier           # 예정 skill 식별자
planned_config_identifier          # 예정 config 식별자
orchestration_session_id           # 오케스트레이션 세션 식별자
planned_session_relation           # 예정 세션 관계
planned_execution_session_id       # 예정 실행 세션 식별자
```

`run-harness`는 위 요청 필드를 그대로 보존하고, `team-spec.md`의 역할 카드와 최종 역할 인벤토리, `orchestration-plan.md`의 라우팅 규칙으로 후보를 확인한다. 선택 가능한 후보는 `target_ids_or_files`, `permission_conditions`, `available_tool_conditions`, `command_execution_path`, `destructive_command_risk` 조건을 모두 만족하는 코드 수정 역할이어야 한다.

비명령 실행 주체이면 `command_execution_path`는 `not_applicable`이고 `command_execution_path_not_applicable_reason`을 보존한다. `planned_agent_or_role`, `planned_model_identifier`, `planned_skill_identifier`, `planned_config_identifier`은 예정 실행 주체 유형에 적용되지 않으면 각각 `not_applicable`과 `planned_agent_or_role_not_applicable_reason`, `planned_model_identifier_not_applicable_reason`, `planned_skill_identifier_not_applicable_reason`, `planned_config_identifier_not_applicable_reason`을 보존한다. `planned_session_relation = separate_execution_session`이면 `planned_execution_session_id`는 알려진 세션 값 또는 도구 발급 대기 값 `pending_tool_issued`와 그 근거를 유지한다.

선택 전에는 해당 역할의 `role_id`, `agent_file`, `.codex/agents/<agent_file>.toml`, `.agents/skills/<agent_file>/SKILL.md`가 모두 존재하고 서로 일치하는지 확인한다. agent TOML에서 확인한 `model`, `model_reasoning_effort`, `sandbox_mode`는 team-spec의 `model`, `reasoning`, `sandbox`과 대응해야 한다.

후보가 0개 또는 복수이거나, role/agent/skill 메타데이터가 누락 또는 불일치하면 `run-harness`는 파일을 수정하지 않고 중단한다. `run-harness`는 코드 수정 역할을 대신 실행하거나 모델을 임의 선택하지 않는다. 선택이 성공한 경우에만 실제 수정 서브에이전트가 선택 역할의 agent config, local skill, model, reasoning, sandbox와 요청의 `permission_conditions`, `available_tool_conditions`, `command_execution_path`, `destructive_command_risk`를 사용하도록 라우팅한다.

라우팅 단계는 아래 고유 필드를 별도로 유지할 수 있다.

```text
routing_status, selected_role_id, agent_config_path, local_skill_path, routing_evidence, model, model_reasoning_effort, sandbox_mode
```

최종 반환은 라우팅 고유 필드와 함께 아래 Workflow Engine 공통 구조화 실행 결과 계약을 정확한 필드명으로 포함해야 한다.

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

실제 실행 주체 유형에 적용되지 않는 `actual_agent_or_role`, `actual_model_identifier`, `actual_skill_identifier`, `actual_config_identifier`은 각각 `not_applicable`과 `actual_agent_or_role_not_applicable_reason`, `actual_model_identifier_not_applicable_reason`, `actual_skill_identifier_not_applicable_reason`, `actual_config_identifier_not_applicable_reason`을 반환한다. 비명령 실행 주체이면 `actual_command_execution_path`, `execution_path_recheck_result`는 각각 `not_applicable`이고 `command_execution_path_not_applicable_reason`을 반환한다.

`routing_status = aborted`이면 공통 결과 계약으로도 반환한다. 적용할 수 없는 실제 실행 필드는 위 사유 필드와 함께 `not_applicable`으로 기록하고, `changed_files`와 `github_state_changes`는 빈 값으로 둔다. `performed_actions`에는 라우팅 확인과 중단만, `verification_results`에는 중단 검증 결과만 기록하며, 실패 사유는 `residual_risks_or_failure_reasons`에 남긴다. 성공 결과도 이 필드에 실제 실행 값만 기록한다.

### 요청-결과 상관관계

결과는 `request_id` 일치로만 원 요청을 식별하고 선택한다. `base_issue_or_pr`, `work_target_id`, `target_ids_or_files` 또는 다른 식별자는 fallback으로 사용할 수 없다. 원 요청을 선택한 뒤에만 다음을 대조한다.

- 결과의 `target_baseline`과 요청의 `target_baseline`
- `actual_executor_type`과 예정 실행 주체, 적용 가능한 actual/planned agent·model·skill·config 식별자 또는 `not_applicable` 사유
- `actual_permission_conditions`, `actual_available_tool_conditions`, `actual_command_execution_path`, `execution_path_recheck_result`와 요청의 권한·도구·명령 경로 조건
- `actual_orchestration_session_id`와 `orchestration_session_id`, `actual_session_relation` 및 `actual_execution_session_id`와 예정 세션 관계

명령 실행 주체이면 실제 명령 경로는 요청의 `command_execution_path`와 일치하고 `execution_path_recheck_result`는 실행 직전 경로 재판정 통과여야 한다. 비명령 실행 주체이면 두 실제 경로 필드의 `not_applicable`과 사유가 요청의 `command_execution_path_not_applicable_reason`과 일치해야 한다. `same_session`이면 실제 오케스트레이션 세션과 실행 세션이 같아야 하며, `separate_execution_session`이면 달라야 한다. 알려진 `planned_execution_session_id`는 실제 세션과 일치해야 하지만, 값이 `pending_tool_issued`이면 문자 그대로 대조하지 않고 도구가 발급한 `actual_execution_session_id`를 확인한다.

## 병렬 위임 기준

병렬 위임은 기본값이 아니다. 다음 조건을 만족할 때만 사용한다.

- 작업 경계가 서로 독립적이다.
- 각 위임 작업의 입력과 출력이 문서로 명확하다.
- 파일 수정 소유 범위가 겹치지 않는다.
- 주 에이전트가 결과를 통합할 수 있다.
- 실패, 지연, 미완료 상태를 `latest-session-summary.md`에 남길 수 있다.

조건을 만족하지 않으면 순차 실행 또는 단일 역할 실행으로 둔다.

## 생성 책임

Codex용 Harness의 생성 책임은 다음 순서로 정리한다.

1. `team-spec.md`가 역할 팀의 단일 진실원천이다.
2. `AGENTS.md`는 상위 운영 기준과 진입 규칙을 담는다.
3. `.codex/config.toml`과 `.codex/agents/*.toml`은 역할 식별, 모델/추론 설정, sandbox 정책 같은 실행 메타데이터를 담는다. `team-spec`의 `reasoning`과 `sandbox` 값은 agent TOML에서 각각 `model_reasoning_effort`, `sandbox_mode`로 매핑한다.
4. `.agents/skills/*`는 각 역할의 `team-spec.md` 섹션과 공통 출력 블록을 참조하는 실행 포인터를 담는다.
5. `.harness/docs/*`는 저장소 입력, 오케스트레이션, 검증, 재진입 상태를 담는다.
6. 생성 절차는 위 계약을 기준으로 주 에이전트가 직접 수행한다.

## 완료 기준

Codex 런타임 정렬이 끝났다고 보려면 아래 조건을 만족해야 한다.

- README와 SKILL 본문이 Codex 실행 계약을 기준으로 쓰여 있다.
- `run-harness`가 주 에이전트 중심 진입점으로 설명돼 있다.
- Workflow Engine 구조화 코드 수정 요청에서 `run-harness`가 공통 구조화 요청 계약을 보존하고, 정확히 하나의 실제 코드 수정 역할을 라우팅하거나 파일 수정 없이 중단한다.
- 최종 결과가 라우팅 고유 필드와 공통 구조화 실행 결과 계약의 실제 값을 제공한다.
- `team-spec.md`가 역할, handoff, 검증, 재진입 기준의 기준 문서로 남아 있다.
- `.codex/config.toml`과 `.codex/agents/*.toml`이 생성됐다면 `team-spec.md`의 역할 인벤토리와 같은 역할 식별자를 말한다.
- `.agents/skills/*/SKILL.md`가 `team-spec.md`의 해당 역할 섹션과 공통 출력 블록을 참조한다.
- Codex가 문서와 스킬 계약만 읽고 생성 절차를 수행할 수 있다.

## 다른 레퍼런스와의 연결

- `team-spec-contract.md`: 역할 팀의 선언형 기준을 정의한다.
- `orchestrator-template.md`: 주 에이전트 중심 handoff와 재진입 흐름을 구체화한다.
- `agents-sync-guide.md`: `AGENTS.md`와 로컬 하네스 자산의 정렬 기준을 제공한다.
- `verification-checklist.md`: Codex 런타임 전제가 생성 결과에 반영됐는지 검토할 때 쓴다.
