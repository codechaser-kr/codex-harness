# 구조화 실행 계약

이 문서는 확정된 작업의 실행 범위, 실행 중단과 재개, 공통 구조화 요청·결과·상관관계·성공·중단, 파일 수정 이외 실행 주체 선택을 정의한다. 사용자 결정 입력은 `user-decision-contract.md`, 명령 권한 경로는 `command-execution-path-contract.md`, 파일 수정 실행 주체 선택은 `file-change-execution-contract.md`를 따른다. 작업 전이, 전용 스킬 산출물, 상태 관측, 리뷰 형식과 검증 모드는 이 문서의 책임이 아니다. 각각 `definitions/*.json`과 `evaluator.mjs`, `artifact-output-contract.md`, `state-observation-contract.md`, `review-runtime-contract.md`, `validation-mode-contract.md`를 따른다.

## 실행 범위 규칙

- 실행 범위는 `evaluateWorkflowDefinition`이 반환한 `task_action_id`, `executor_reference`, `completion_predicate`, 확정된 사용자 결정, 기준 snapshot, 연결 이슈와 확정 계획에 기록된 허용 범위로 산출한다.
- 실행 범위에는 변경할 수 있는 GitHub 상태, 파일 또는 디렉터리, 댓글 또는 review thread, 브랜치, 커밋, PR 생성 여부를 포함한다.
- 사용자 결정 필요 여부는 현재 task의 `user_decision_options`가 비어 있는지로 판정한다. 값이 있으면 사용자 결정을 기다리고, 빈 배열이면 사용자 결정 없이 실행을 계속한다.

### Claude 리뷰 실행 요청 고정값

`FI-15`와 `FI-16`의 논리 실행 모드와 정확한 호출값은
`claude-review-executor-contract.md`의 `Workflow Engine 호출 계약`을 단일 정본으로 사용한다.
Workflow Engine은 해당 표의 `task_action_id`, 논리 실행 모드와 실제 호출을 그대로
`confirmed_request_values`에 기록하며 이 계약에서 같은 호출 표를 다시 선언하지 않는다.

- `execution_mode=foreground`, `execution_control_flag=--wait`,
  `planned_session_relation=same_session`은 실행 중 변경할 수 없는 요청값이다.
- `--wait`가 있으므로 foreground/background 선택 질문을 추가하지 않고, `--background`를 전달하지
  않는다.
- `<pr-base-branch>`는 현재 PR에서 관측한 base branch와 같아야 한다.
- `--base <pr-base-branch>`와 `--scope branch`는 현재 PR의 head branch에 포함된 전체 변경을
  base branch와 비교해 검토하기 위해 함께 고정한다. 따라서 마지막 commit만 보는 commit 단위
  범위가 아니라 PR에 누적된 branch diff 전체가 리뷰 대상이다.
- 이 고정값은 Workflow Engine의 `FI-15`와 `FI-16` 호출에만 적용한다. Workflow Engine 밖에서
  직접 사용하는 `$cc:review`, `$cc:adversarial-review`의 일반 실행 방식과
  `FI-17`의 `codex/awesome-code-review` 실행 방식은 변경하지 않는다.

## 중단과 재개 판정 규칙

자동 실행 루프는 진행 판단이 `사용자 결정`, `중단`, `완료` 중 하나로 산출될 때 멈춘다.

- 현재 task의 `user_decision_options`에 값이 있으면 진행 판단을 `사용자 결정`으로 둔다.
- 정보 부족, 의존성 확인 실패, 의도 불명확, 실행 오류, 상태 충돌, 사용자 보류 요청, 처리 범위 밖 요청은 진행 판단을 `중단`으로 둔다.
- 기준 대상의 완료 조건이 충족되면 진행 판단을 `완료`로 둔다.

재개 규칙:

- 재개할 때는 GitHub 실행 상태와 현재 코드 상태를 다시 관측하고, 선택된 Workflow Definition의 state adapter로 fact와 근거를 정규화한 뒤, 재개 전과 같은 `currentTaskActionId`로 `evaluateWorkflowDefinition`을 다시 평가한다.
- 실행 로그는 GitHub 실행 상태 밖의 중간 실행 상태를 확인할 때 보조 근거로 사용한다.
- 실행 로그와 GitHub 실행 상태가 충돌하면 GitHub 실행 상태를 우선한다.
- 재개 요청에 사용자 입력이 있으면 `user-decision-contract.md`의 사용자 입력 판정 규칙을 적용한다.
- 종료된 이슈에 체크된 후속 흐름 전환이 있지만 대응하는 후속 대상이 확인되지 않으면 해당 종료 이슈를 전환 출발점으로 사용한다.

## 종료 후 이슈 유형 전환 순서

다음 세 경로는 원본 이슈의 상태 반영(`reflect`), 원본 이슈 종료(`close`), 후속 이슈 생성 또는
갱신(`transition`)을 서로 다른 작업과 완료 조건으로 유지한다.

- 기능제안 → 정책검토
- 기능제안 → 기능변경
- 정책검토 → 기능변경

세 경로의 실행 순서는 항상 `reflect → close → transition`이다. Workflow Engine은 먼저 원본 이슈에
확정된 방향과 범위를 반영하고, 원본 이슈가 종료됐다는 GitHub fact를 관측한 뒤에만 후속 이슈를
생성하거나 갱신한다. 후속 전환 완료 fact가 먼저 관측됐더라도 원본 이슈가 열려 있으면
`transition` 작업을 시작하거나 완료된 것으로 판정하지 않는다.

후속 `transition` 작업의 `normalized_fact_conditions`가 앞선 반영·종료 fact를 반복하는 것은
`currentTaskActionId`로 해당 작업에 직접 재개할 때 close-first 선행조건을 다시 검증하기 위한
의도적인 방어 조건이다. 순차 평가에서 이미 확인했다는 이유로 이 조건을 제거하지 않는다.
후속 이슈 번호를 닫힌 원본 이슈에 사후 기록하는 작업은 `transition` 결과 반영이며 원본 이슈
종료의 선행조건이 아니다.

## 구조화 실행 요청 판정 규칙

구조화 실행 요청은 확정된 현재 작업을 한 건의 추적 가능한 실행 입력으로 표현한 값이다. 요청에 없는 값, 재계산할 수 없는 값, 또는 사용자 결정으로 확정되지 않은 값은 실행 주체가 보완하거나 재판단하지 않는다.

| 판정 상태 | 판정 기준 |
| --- | --- |
| 요청 식별 가능 | `request_id`가 있고, 모든 구조화 실행 요청은 `request_id`를 필수 식별자로 사용한다. 원 요청의 식별과 선택은 `request_id`로만 수행하며, 다른 식별자를 fallback으로 사용하지 않는다. |
| 작업과 범위 식별 가능 | `base_issue_or_pr`, `work_target_id`, `work_type`, `target_ids_or_files`, `confirmed_request_values`가 있고, 각 값이 현재 작업과 실행 범위 규칙으로 확정된 값과 일치한다. |
| 기준 상태 식별 가능 | 대상 저장소의 `target_baseline`에 commit SHA 또는 동등한 기준 상태 식별자가 기록되어 있다. |
| 계약 조건 식별 가능 | `preconditions`, `expected_postconditions`, `verification_criteria`가 각각 비어 있지 않고 현재 작업의 조건, 완료기준, 검증 기준과 모순되지 않는다. |
| 실행 경로 조건 식별 가능 | `command_execution_path`, `permission_conditions`, `available_tool_conditions`, `destructive_command_risk`가 있고, 명령 실행 주체이면 `command_execution_path`가 `command-execution-path-contract.md`로 판정한 값과 일치한다. 비명령 실행 주체이면 `command_execution_path`가 `not_applicable`이고 `command_execution_path_not_applicable_reason`이 있다. |
| 예정 실행 주체 식별 가능 | `planned_executor_type`가 있고, `planned_agent_or_role`, `planned_model_identifier`, `planned_skill_identifier`, `planned_config_identifier`마다 실행 주체 유형에 적용되는 확인 가능한 값 또는 `not_applicable`과 해당 `*_not_applicable_reason`이 있다. 적용 여부를 확인하지 못한 값은 통과하지 않는다. |
| 예정 세션 관계 식별 가능 | ordinary 실행에서는 `orchestration_session_id`와 `planned_session_relation`이 있다. `planned_session_relation`이 `same_session`이면 `planned_execution_session_id`가 `orchestration_session_id`와 같거나 명시적 `same_session` 표시가 있다. `separate_execution_session`이면 알려진 `planned_execution_session_id` 또는 도구 발급 대기 `pending_tool_issued`와 근거가 있다. 검증 모드는 terminal diagnostic이므로 구조화 실행 요청 사용 가능 판정에 넣지 않는다. |
| 동일 `request_id` 활성 슬롯 선점 | Workflow Engine이 `동일 request_id 활성 시도 없음` 판정과 해당 `request_id`의 활성 실행 슬롯 선점을 하나의 원자적 동작으로 수행한다. 동시에 경쟁하는 요청 중 정확히 하나만 선점에 성공하며, 선점된 슬롯은 해당 시도의 구조화 실행 성공 또는 구조화 실행 중단이 최종 기록될 때까지 유지된다. |
| 구조화 실행 요청 사용 가능 | `요청 식별 가능`, `작업과 범위 식별 가능`, `기준 상태 식별 가능`, `계약 조건 식별 가능`, `실행 경로 조건 식별 가능`, `예정 실행 주체 식별 가능`, `예정 세션 관계 식별 가능`, `동일 request_id 활성 슬롯 선점`이 모두 충족된다. |

`동일 request_id 활성 슬롯 선점`에 실패하면 Workflow Engine은 기존 활성 시도를 대체·변경·중단하지 않고, 기존 시도의 활성 상태를 종료하거나 실행 슬롯을 해제하지 않으며, 새 실행 주체 호출이나 별도 execution session 시작 전에 `duplicate_active_request_id` 원인을 기록한 `구조화 실행 중단`으로 반환한다. 이 중단은 실행 주체 결과로 만들지 않으며 파일과 GitHub 상태를 변경하지 않는다. 기존 시도가 성공 또는 중단으로 최종 기록된 뒤에는 요청 내용 불변을 유지하는 순차 재전송만 같은 `request_id`를 다시 사용할 수 있고, execution session ID로 각 실행 시도를 구분한다.

## 구조화 실행 결과와 요청-결과 상관관계 판정 규칙

구조화 실행 결과는 한 건의 구조화 실행 요청에 대응하는 관측 결과다. 결과의 실제 값은 요청값을 대체하지 않으며, 요청값과 다르면 불일치를 기록하는 근거로만 사용한다.

### 결과 필수 정보

- `결과 식별 정보 존재`: `request_id`, `target_baseline`, 모든 `actual_*` 실행 식별자와 세션 관계,
  권한·도구·명령 경로, `execution_path_recheck_result`가 있다. 실행 주체 유형에 적용되는 식별자는
  확인 가능한 값으로 기록하고, 적용 대상이 아닌 식별자는 `not_applicable`과 해당 이유를 기록한다.
- `결과 수행 근거 존재`: `performed_actions`, `changed_files`, `github_state_changes`,
  `verification_results`, `postconditions_satisfied`, `residual_risks_or_failure_reasons`가 있다. 변경이 없는
  필드는 빈 값임을 명시한다.

### 요청-결과 상관관계 검사

1. 결과의 `request_id`와 일치하는 원 요청을 선택한다. 원 요청 선택에는 다른 식별자를 사용하지 않는다.
2. `target_baseline`, 실제 실행 주체 유형, agent/role·model·skill·config 식별 정보와 권한·도구 조건을
   선택한 원 요청의 값과 대조한다.
3. 명령 실행 주체는 `actual_command_execution_path`와 `execution_path_recheck_result`를 요청의
   `command_execution_path` 및 `command-execution-path-contract.md`의 실행 직전 재판정 결과와 대조한다.
   비명령 실행 주체는 두 실제 경로 필드의 `not_applicable`과 이유를 요청의 적용 불가 이유와 대조한다.
4. `actual_orchestration_session_id`를 요청의 `orchestration_session_id`와 대조한다.
   `actual_session_relation`과 `actual_execution_session_id`는 `planned_session_relation`에 맞아야 한다.
   `same_session`은 두 세션 ID가 같고, `separate_execution_session`은 두 세션 ID가 다르다.
5. 알려진 `planned_execution_session_id`는 실제 세션 ID와 대조한다. `pending_tool_issued`이면 도구가 발급한
   실제 세션 ID의 존재를 확인한다.
6. 실행 주체별 결과 예외와 출력 사용 가능 조건은 선택한 실행 주체의 계약으로 추가 판정한다.

위 검사를 모두 통과하면 `요청-결과 상관관계 통과`로 판정한다.

### 실행 범위와 결과 사용

- `실행 범위 준수`: `performed_actions`, `changed_files`, `github_state_changes`가 원 요청의 `work_type`,
  `target_ids_or_files`, `confirmed_request_values`로 확정한 범위 안에 있다.
- `구조화 실행 결과 사용 가능`: ordinary 실행에서 `결과 식별 정보 존재`, `결과 수행 근거 존재`,
  `요청-결과 상관관계 통과`, `실행 범위 준수`를 모두 충족한다. 실행 주체별 예외는 선택한 실행 주체의
  계약을 적용한다. validation session set은 별도 진단 결과로 처리한다.

## 구조화 실행 성공과 중단 판정 규칙

| 판정 상태 | 판정 기준 | 중단 사유와 재개 조건 |
| --- | --- | --- |
| 구조화 실행 성공 | `구조화 실행 요청 사용 가능`, `구조화 실행 결과 사용 가능`이 모두 충족되고, 모든 `expected_postconditions`가 충족되며 모든 `verification_criteria`의 `verification_results`가 성공이다. | 해당 없음 |
| 구조화 실행 중단 | 요청 또는 결과 필수값 누락, 요청-결과 불일치, 실행 범위 확대, `preconditions` 실패, 적절한 실행 주체 선택 실패, 필요한 권한 또는 사용 가능 도구 조건 미확인, 실행 직전 경로 재판정 실패, 사후조건 실패, 검증 실패 중 하나 이상이 있다. | 충족하지 못한 판정 상태와 원인을 기록하고, 누락값 보완, 기준 상태 재확인, 사용자 결정, 권한 또는 도구 조건 확인, 범위 축소 또는 새 구조화 실행 요청 중 필요한 재개 조건을 산출한다. |

- `구조화 실행 성공` 이외의 모든 상태는 성공으로 판정하지 않는다.
- 실행 주체는 `confirmed_request_values`, `target_ids_or_files`, `work_type`, `expected_postconditions`, `verification_criteria`를 재판단하거나 실행 범위를 넓힐 수 없다. 불일치 또는 추가 판단 필요는 `구조화 실행 중단`으로 판정한다.
- 하나의 `request_id`는 하나의 변경 불가능한 구조화 요청 내용에만 대응한다. 같은 `request_id`에서 `target_baseline`, `work_type`, `target_ids_or_files`, `confirmed_request_values` 또는 그 밖의 요청 내용 불일치가 관측되면 계약 위반으로 중단한다.
- 동일 요청의 단순 재전송은 이전 시도의 성공 또는 중단이 최종 기록되어 같은 `request_id`의 활성 시도가 없을 때만 같은 `request_id`를 유지하는 순차 재전송으로 허용한다. 요청 내용이나 기준 상태가 바뀐 새 요청은 새 `request_id`를 사용한다.
- 실행 시도와 세션 차이는 `orchestration_session_id`와 `execution_session_id`의 관계로 구분하며, 식별자 대체나 혼용으로 해석하지 않는다.

## 실행 주체 선택 판정 규칙

| 판정 상태 | 판정 기준 |
| --- | --- |
| 결정론적 실행기 선택 | 파일 수정 작업이 아닌 경우에만 성립하며, 확정된 단순 상태 변경이고, `command-execution-path-contract.md`와 사용 가능 도구 조건으로 확인되는 결정론적 도구 경로가 있다. |
| 저비용 상태 요약 실행 주체 선택 | 읽기 전용 상태 요약이 필요하고, `github-state-summary`가 출처 식별자가 있는 관측값만 반환하며, 파일·GitHub 상태·로그 변경, 현재 작업·사용자 결정·상태 전이 판단이 없고, `planned_model_identifier`와 `planned_config_identifier`가 실행 환경에서 확인 가능한 저비용 실행 설정을 가리키며, 실행 주체 식별 정보와 읽기 전용 도구 조건이 확인 가능한 상태다. |
| 저비용 실행 서브에이전트 선택 | `github-simple-executor`에만 적용하며, 파일 수정 작업이 아닌 경우에만 성립하고, 결정론적 도구 경로가 없으며, 정확히 하나의 확정된 비파일 단순 상태 변경을 판단·값 재해석·범위 변경 없이 수행할 수 있고, `planned_model_identifier`와 `planned_config_identifier`가 실행 환경에서 확인 가능한 저비용 실행 설정을 가리키며, 실행 주체 유형에 적용되는 agent/role, model, skill, config 식별 정보가 확인 가능하거나 `not_applicable` 근거가 있다. |
| 리뷰 실행 주체 선택 | 현재 작업이 `리뷰 실행`이고, 사용자가 확정한 리뷰 실행 모드가 `.workflow-engine/settings.json`에서 `리뷰 실행 모드 사용 가능`이며, 해당 모드의 실행 주체 식별 정보와 권한·도구 조건이 확인 가능한 상태다. |

- 최종 판단, 사용자 결정 해석, 커밋 생성 여부 판단, PR 생성 여부 판단은 실행 주체에 위임하지 않는다.
- `github-state-summary`는 읽기 전용 지원 단위이고, 그 결과는 Workflow Engine의 상태 판정 입력이다. `github-simple-executor`는 일반 구조화 실행 결과 계약을 따르는 실행 단위다.
- 파일 수정 작업의 실행 주체 선택과 중단은 `file-change-execution-contract.md`를 적용한다. 이 계약은 실행 전 Harness 준비도에 따라 Harness 또는 일반 코드 변경 경로 하나를 선택하고, 선택 경로 실행 시작 뒤의 재시도 금지와 두 경로의 공통 결과 검증을 정의한다.
- 리뷰 내용 생성은 사용자가 확정한 리뷰 실행 모드에 대해 `리뷰 실행 주체 선택`으로 확정된 실행 주체만 담당한다. 결정론적 실행기와 저비용 실행 서브에이전트에는 리뷰 내용 생성을 위임하지 않는다. Workflow Engine은 리뷰 결과 정규화와 게시할 리뷰 피드백 존재 또는 없음 판정을 담당한다.
- 위 선택 판정에 맞는 실행 주체가 없으면 `구조화 실행 중단`으로 판정한다.
