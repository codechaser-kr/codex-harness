# 구조화 실행 계약

이 문서는 사용자 입력 해석, 확정된 작업의 실행 범위, 실행 중단과 재개, 명령 권한 경로, 구조화 요청·결과·상관관계·성공·중단, 실행 주체 선택과 Target Harness Code Editor 준비도를 정의한다. 작업 전이, 전용 스킬 산출물, 상태 관측, 리뷰 형식, 검증 모드와 서브에이전트 공통 수명 주기는 이 문서의 책임이 아니다. 각각 `definitions/*.json`과 `evaluator.mjs`, `artifact-output-contract.md`, `state-observation-contract.md`, `review-runtime-contract.md`, `validation-mode-contract.md`, 하네스의 `references/logging-contract.md`를 따른다.

## 사용자 입력 판정 규칙

유효 입력 형식은 다음 네 가지다.

- 제시된 번호
- 선택지 문구 그대로
- `기타 의견 입력 항목 번호: 의견`
- `기타 의견 입력: 의견`

유효 입력 판정:

- 제시된 번호 또는 선택지 문구를 그대로 입력하면 해당 선택지를 사용자 결정으로 처리한다.
- `기타 의견 입력` 허용 형식으로 구체 의견을 입력하면 그 의견을 사용자 결정으로 처리한다.
- 기타 의견이 현재 사용자 결정 대상에 속하고, 실행 범위 안에 있으며, 작업내역으로 수행할 수 있고 완료기준으로 처리 결과를 확인할 수 있으면 해당 의견을 사용자 결정으로 처리한다.
- 기타 의견이 처리 범위 밖이면 진행 판단을 `중단`으로 둔다.
- `기타 의견 입력` 항목 번호만 입력했거나 `기타 의견 입력` 문구만 입력하면 진행 판단을 `사용자 결정`으로 유지한다.
- 사용자 입력이 유효 입력 형식 밖이면 진행 판단을 `사용자 결정`으로 유지한다.
- `이대로 진행`, `생성해주세요`, `좋습니다`, `네` 같은 일반 진행 표현은 제시된 선택지 문구와 정확히 일치할 때 유효 입력으로 처리한다.

## 실행 범위 규칙

- 실행 범위는 `evaluateWorkflowDefinition`이 반환한 `task_action_id`, `executor_reference`, `completion_predicate`, 확정된 사용자 결정, 기준 snapshot, 연결 이슈와 확정 계획에 기록된 허용 범위로 산출한다.
- 실행 범위에는 변경할 수 있는 GitHub 상태, 파일 또는 디렉터리, 댓글 또는 review thread, 브랜치, 커밋, PR 생성 여부를 포함한다.
- 사용자 결정 필요 여부는 현재 task의 `user_decision_options`가 비어 있는지로 판정한다. 값이 있으면 사용자 결정을 기다리고, 빈 배열이면 사용자 결정 없이 실행을 계속한다.

## 중단과 재개 판정 규칙

자동 실행 루프는 진행 판단이 `사용자 결정`, `중단`, `완료` 중 하나로 산출될 때 멈춘다.

- 현재 task의 `user_decision_options`에 값이 있으면 진행 판단을 `사용자 결정`으로 둔다.
- 정보 부족, 의존성 확인 실패, 의도 불명확, 실행 오류, 상태 충돌, 사용자 보류 요청, 처리 범위 밖 요청은 진행 판단을 `중단`으로 둔다.
- 기준 대상의 완료 조건이 충족되면 진행 판단을 `완료`로 둔다.

재개 규칙:

- 재개할 때는 GitHub 실행 상태와 현재 코드 상태를 다시 관측하고, 선택된 Workflow Definition의 state adapter로 fact와 근거를 정규화한 뒤, 재개 전과 같은 `currentTaskActionId`로 `evaluateWorkflowDefinition`을 다시 평가한다.
- 실행 로그는 GitHub 실행 상태 밖의 중간 실행 상태를 확인할 때 보조 근거로 사용한다.
- 실행 로그와 GitHub 실행 상태가 충돌하면 GitHub 실행 상태를 우선한다.
- 재개 요청에 사용자 입력이 있으면 `사용자 입력 판정 규칙`을 적용한다.
- 종료된 이슈에 체크된 후속 흐름 전환이 있지만 대응하는 후속 대상이 확인되지 않으면 해당 종료 이슈를 전환 출발점으로 사용한다.

## 명령 실행 경로 규칙

명령 실행 경로는 확정된 작업을 어떤 권한 경로로 호출할지 정하는 판단 항목이며, 일반 경로와 권한 확인 경로 중 하나로 판정한다.

사용자 결정은 현재 작업과 실행 범위를 확정하는 별도 판단 항목이다. 사용자의 상태 변경 의도가 이미 명확한지는 명령 실행 경로 판정 입력으로 사용하지 않는다. 권한 확인 경로 대상 명령은 일반 경로 실패 여부를 관찰하기 전에 권한 확인 경로로 판정한다.

권한 확인 경로:

- `gh issue create`, `gh issue edit`, `gh pr create`, `gh pr comment`, `gh pr review`, `gh pr merge`, `gh api --method POST|PATCH|PUT|DELETE`처럼 GitHub issue, PR, review, checks, comment 상태를 바꾸는 GitHub API 계열 명령
- `git push`, `git fetch`, `git pull`, `git ls-remote`처럼 네트워크나 원격 저장소 접근이 필요한 Git 명령
- `git switch`, `git checkout`, `git branch`, `git commit`, `git tag`, `git merge`, `git rebase`처럼 `.git` 쓰기 또는 작업 브랜치 변경이 필요한 명령
- `sed -i`, `find -delete`, 쓰기나 삭제를 수행하는 `find -exec`처럼 로컬 파일을 수정하거나 삭제하는 명령

일반 경로:

- `gh pr view`, `gh issue view`, `gh pr checks`, `gh api` GET 조회처럼 GitHub 실행 상태를 읽는 명령
- `git status`, `git diff`, `git log`, `git show`, `rg`, 출력 또는 파이프 변환용 `sed`, `ls`, 탐색 전용 `find`, `wc`처럼 로컬 파일이나 로컬 Git 상태를 읽는 명령
- `git diff --check`처럼 로컬 변경사항을 검증하는 명령

변경 손실 가능 명령:

- `rm`, `git reset --hard`, `git clean`, `git branch -D`, 작업 브랜치 삭제, 강제 push처럼 되돌리기 어렵거나 사용자 변경을 잃게 할 수 있는 명령

추가 규칙:

- 명령 실행 경로는 현재 작업, 실행 범위, 사용자 결정의 판정 결과를 유지한다.
- 변경 손실 가능 명령은 현재 작업의 실행 범위 안에 있고 사용자 의도가 명확한 상태에서만 실행한다.
- PR merge 반영 작업의 작업 브랜치 정리는 안전 조건을 만족하면 사용자 추가 결정 없이 수행한다.
- 구조화 실행 요청은 생성 시 이 규칙으로 판정한 `command_execution_path`와 권한 조건을 기록한다. 실행 주체는 실제 명령 호출 직전에 같은 규칙으로 `실행 직전 경로 재판정 통과` 여부를 판정한다.
- `실행 직전 경로 재판정 통과`는 기록된 `command_execution_path`와 직전 판정 경로가 일치하고, 필요한 권한 조건과 사용 가능 도구 조건이 확인되며, 변경 손실 가능 명령이면 이 규칙의 추가 조건도 충족한 상태다. 하나라도 확인할 수 없거나 일치하지 않으면 명령 실행 없이 `중단`으로 판정한다.

## 구조화 실행 요청 판정 규칙

구조화 실행 요청은 확정된 현재 작업을 한 건의 추적 가능한 실행 입력으로 표현한 값이다. 요청에 없는 값, 재계산할 수 없는 값, 또는 사용자 결정으로 확정되지 않은 값은 실행 주체가 보완하거나 재판단하지 않는다.

| 판정 상태 | 판정 기준 |
| --- | --- |
| 요청 식별 가능 | `request_id`가 있고, 모든 구조화 실행 요청은 `request_id`를 필수 식별자로 사용한다. 원 요청의 식별과 선택은 `request_id`로만 수행하며, 다른 식별자를 fallback으로 사용하지 않는다. |
| 작업과 범위 식별 가능 | `base_issue_or_pr`, `work_target_id`, `work_type`, `target_ids_or_files`, `confirmed_request_values`가 있고, 각 값이 현재 작업과 실행 범위 규칙으로 확정된 값과 일치한다. |
| 기준 상태 식별 가능 | 대상 저장소의 `target_baseline`에 commit SHA 또는 동등한 기준 상태 식별자가 기록되어 있다. |
| 계약 조건 식별 가능 | `preconditions`, `expected_postconditions`, `verification_criteria`가 각각 비어 있지 않고 현재 작업의 조건, 완료기준, 검증 기준과 모순되지 않는다. |
| 실행 경로 조건 식별 가능 | `command_execution_path`, `permission_conditions`, `available_tool_conditions`, `destructive_command_risk`가 있고, 명령 실행 주체이면 `command_execution_path`가 명령 실행 경로 규칙으로 판정한 값과 일치한다. 비명령 실행 주체이면 `command_execution_path`가 `not_applicable`이고 `command_execution_path_not_applicable_reason`이 있다. |
| 예정 실행 주체 식별 가능 | `planned_executor_type`가 있고, `planned_agent_or_role`, `planned_model_identifier`, `planned_skill_identifier`, `planned_config_identifier`마다 실행 주체 유형에 적용되는 확인 가능한 값 또는 `not_applicable`과 해당 `*_not_applicable_reason`이 있다. 적용 여부를 확인하지 못한 값은 통과하지 않는다. |
| 예정 세션 관계 식별 가능 | ordinary 실행에서는 `orchestration_session_id`와 `planned_session_relation`이 있다. `planned_session_relation`이 `same_session`이면 `planned_execution_session_id`가 `orchestration_session_id`와 같거나 명시적 `same_session` 표시가 있다. `separate_execution_session`이면 알려진 `planned_execution_session_id` 또는 도구 발급 대기 `pending_tool_issued`와 근거가 있다. 검증 모드는 terminal diagnostic이므로 구조화 실행 요청 사용 가능 판정에 넣지 않는다. |
| 동일 `request_id` 활성 슬롯 선점 | Workflow Engine이 `동일 request_id 활성 시도 없음` 판정과 해당 `request_id`의 활성 실행 슬롯 선점을 하나의 원자적 동작으로 수행한다. 동시에 경쟁하는 요청 중 정확히 하나만 선점에 성공하며, 선점된 슬롯은 해당 시도의 구조화 실행 성공 또는 구조화 실행 중단이 최종 기록될 때까지 유지된다. |
| 구조화 실행 요청 사용 가능 | `요청 식별 가능`, `작업과 범위 식별 가능`, `기준 상태 식별 가능`, `계약 조건 식별 가능`, `실행 경로 조건 식별 가능`, `예정 실행 주체 식별 가능`, `예정 세션 관계 식별 가능`, `동일 request_id 활성 슬롯 선점`이 모두 충족된다. |

`동일 request_id 활성 슬롯 선점`에 실패하면 Workflow Engine은 기존 활성 시도를 대체·변경·중단하지 않고, 기존 시도의 활성 상태를 종료하거나 실행 슬롯을 해제하지 않으며, 새 `run-harness` 라우팅, `target-harness-code-editor` 호출, 별도 execution session 시작 없이 선택 전에 `duplicate_active_request_id` 원인을 기록한 `구조화 실행 중단`으로 반환한다. 이 중단은 target editor 결과로 만들지 않으며 파일과 GitHub 상태를 변경하지 않는다. 기존 시도가 성공 또는 중단으로 최종 기록된 뒤에는 요청 내용 불변을 유지하는 순차 재전송만 같은 `request_id`를 다시 사용할 수 있고, execution session ID로 각 실행 시도를 구분한다.

## 구조화 실행 결과와 요청-결과 상관관계 판정 규칙

구조화 실행 결과는 한 건의 구조화 실행 요청에 대응하는 관측 결과다. 결과의 실제 값은 요청값을 대체하지 않으며, 요청값과 다르면 불일치를 기록하는 근거로만 사용한다.

| 판정 상태 | 판정 기준 |
| --- | --- |
| 결과 식별 정보 존재 | `request_id`, `target_baseline`, `actual_executor_type`, `actual_agent_or_role`, `actual_model_identifier`, `actual_skill_identifier`, `actual_config_identifier`, `actual_orchestration_session_id`, `actual_execution_session_id`, `actual_session_relation`, `actual_permission_conditions`, `actual_available_tool_conditions`, `actual_command_execution_path`, `execution_path_recheck_result`가 있다. 결과의 `request_id`는 요청의 `request_id`와 같아야 하며, `actual_agent_or_role`, `actual_model_identifier`, `actual_skill_identifier`, `actual_config_identifier`마다 실행 주체 유형에 적용되는 확인 가능한 값 또는 `not_applicable`과 해당 `*_not_applicable_reason`이 있다. 비명령 실행 주체이면 `actual_command_execution_path`, `execution_path_recheck_result`가 각각 `not_applicable`이고 `command_execution_path_not_applicable_reason`이 있으며, 단순 누락은 통과하지 않는다. |
| 결과 수행 근거 존재 | `performed_actions`, 변경 파일 `changed_files`, `github_state_changes`, 검증 결과 `verification_results`, `postconditions_satisfied`, 남은 위험 또는 실패 사유 `residual_risks_or_failure_reasons`가 있다. 변경 또는 GitHub 상태 변경이 없으면 각각 빈 값임을 명시한다. |
| 요청-결과 상관관계 통과 | 먼저 결과의 `request_id` 일치로 대응할 원 요청을 식별·선택한다. 원 요청이 식별된 뒤 `target_baseline`, 실제 실행 주체 유형, 적용 가능한 agent/role·model·skill·config 식별 정보 또는 `not_applicable` 근거, 권한·도구 조건이 선택된 원 요청의 해당 값 및 `실행 직전 경로 재판정 통과` 결과와 일치하는지 별도로 검사한다. 명령 실행 주체이면 `actual_command_execution_path`가 선택된 원 요청의 `command_execution_path`와 일치하고 `execution_path_recheck_result`가 `실행 직전 경로 재판정 통과`다. 비명령 실행 주체이면 두 실제 경로 필드의 `not_applicable`과 근거가 선택된 원 요청의 `command_execution_path_not_applicable_reason`과 일치한다. `actual_orchestration_session_id`는 `orchestration_session_id`와 일치하고, `actual_session_relation`과 `actual_execution_session_id`는 `planned_session_relation`에 일치한다. `same_session`이면 두 실제 세션 ID가 같아야 하고, `separate_execution_session`이면 달라야 하며, 알려진 `planned_execution_session_id`가 `pending_tool_issued`가 아니면 그 값과도 일치해야 한다. `planned_execution_session_id`가 `pending_tool_issued`이면 이를 실제 세션 ID와 문자 그대로 비교하지 않고 도구가 발급한 `actual_execution_session_id`를 확인한다. 단, `Target Harness Code Editor 선택 가능`을 통과해 target editor가 실제 호출되고 유효한 `request_id`, orchestration context와 검증된 라우팅 입력이 있는 경우에 한해, target editor 호출 후 사전 검증 실패로 별도 execution session 시작을 시도하지 않았거나 시작을 시도했지만 도구가 실제 세션 ID를 발급하기 전에 실패한 `실행 세션 미시작 중단`이면서 `routing_status = aborted`, 예정 관계 `separate_execution_session`, 실제 세션 ID 미발급, `changed_files`와 `github_state_changes` 빈 값, `performed_actions`·`verification_results`·`residual_risks_or_failure_reasons`에 실제로 수행한 사전 검증과 중단 원인이 기록된 경우에만 `actual_execution_session_id = not_applicable`과 `actual_execution_session_id_not_applicable_reason = execution_session_not_started`, `actual_session_relation = not_applicable`과 `actual_session_relation_not_applicable_reason = execution_session_not_started`로 대조한다. 세션 시작 시도·실패 기록은 시도한 경우에만 요구하고, 시도하지 않은 경우에는 시도하지 않았음과 실제 사전 검증 실패 근거를 요구한다. 이 경우 검증된 입력 라우팅의 `routing_status`만 `aborted`로 전이할 수 있고 나머지 라우팅 고유 필드는 항상 입력과 일치해야 한다. 실제 execution session ID가 발급된 뒤의 중단은 기존 실제 별도 세션 ID와 관계 검증을 적용한다. 대응할 원 요청의 식별 자체가 불가능하거나 검증된 라우팅 입력이 없으면 target editor 출력 사용 가능 판정으로 진행하지 않고 Workflow Engine이 선택 전에 `구조화 실행 중단`으로 처리하며, 이 상태를 target editor 결과로 만들지 않는다. 대응할 원 요청의 식별과 선택은 `request_id` 일치로만 판정하며, 다른 식별자를 fallback으로 사용하지 않는다. |
| 실행 범위 준수 | 결과의 `performed_actions`, `changed_files`, `github_state_changes`가 원 요청의 `work_type`, `target_ids_or_files`, `confirmed_request_values`로 확정된 실행 범위를 벗어나지 않으며, 그 범위 밖의 값을 포함하지 않는다. |
| 구조화 실행 결과 사용 가능 | ordinary 실행에서 `결과 식별 정보 존재`, `결과 수행 근거 존재`, `요청-결과 상관관계 통과`, `실행 범위 준수`가 모두 충족된다. validation session set은 진단 결과이므로 이 판정과 구조화 실행 성공 판정에 입력하지 않는다. `실행 세션 미시작 중단`은 위의 전용 조건과 세션 `not_applicable` 사유 대조까지 충족한 경우에만 이 판정을 통과한다. |

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
| 결정론적 실행기 선택 | 파일 수정 작업이 아닌 경우에만 성립하며, 확정된 단순 상태 변경이고, 명령 실행 경로 규칙과 사용 가능 도구 조건으로 확인되는 결정론적 도구 경로가 있다. |
| 저비용 상태 요약 실행 주체 선택 | 읽기 전용 상태 요약이 필요하고, `github-state-summary`가 출처 식별자가 있는 관측값만 반환하며, 파일·GitHub 상태·로그 변경, 현재 작업·사용자 결정·상태 전이 판단이 없고, `planned_model_identifier`와 `planned_config_identifier`가 실행 환경에서 확인 가능한 저비용 실행 설정을 가리키며, 실행 주체 식별 정보와 읽기 전용 도구 조건이 확인 가능한 상태다. |
| 저비용 실행 서브에이전트 선택 | `github-simple-executor`에만 적용하며, 파일 수정 작업이 아닌 경우에만 성립하고, 결정론적 도구 경로가 없으며, 정확히 하나의 확정된 비파일 단순 상태 변경을 판단·값 재해석·범위 변경 없이 수행할 수 있고, `planned_model_identifier`와 `planned_config_identifier`가 실행 환경에서 확인 가능한 저비용 실행 설정을 가리키며, 실행 주체 유형에 적용되는 agent/role, model, skill, config 식별 정보가 확인 가능하거나 `not_applicable` 근거가 있다. |
| 타겟 하네스 코드 수정 서브에이전트 선택 | `Target Harness Code Editor 선택 가능` 판정이 충족된 상태다. |
| 리뷰 실행 주체 선택 | 현재 작업이 `리뷰 실행`이고, 사용자가 확정한 리뷰 실행 모드가 `.harness/workflow-engine.json`에서 `리뷰 실행 모드 사용 가능`이며, 해당 모드의 실행 주체 식별 정보와 권한·도구 조건이 확인 가능한 상태다. |
| 파일 수정 중단 | 파일 수정 작업인데 `Target Harness Code Editor 선택 가능` 판정이 실패해 `대상 코드 수정 구조화 중단`으로 이어지는 상태다. 직접 수정은 허용하지 않는다. |

- 최종 판단, 사용자 결정 해석, 커밋 생성 여부 판단, PR 생성 여부 판단은 실행 주체에 위임하지 않는다.
- `github-state-summary`는 읽기 전용 지원 단위이고, 그 결과는 Workflow Engine의 상태 판정 입력이다. `github-simple-executor`는 일반 구조화 실행 결과 계약을 따르는 실행 단위다.
- 리뷰 내용 생성은 사용자가 확정한 리뷰 실행 모드에 대해 `리뷰 실행 주체 선택`으로 확정된 실행 주체만 담당한다. 결정론적 실행기, 저비용 실행 서브에이전트, 타겟 하네스 코드 수정 서브에이전트에는 리뷰 내용 생성을 위임하지 않는다. Workflow Engine은 리뷰 결과 정규화와 게시할 리뷰 피드백 존재 또는 없음 판정을 담당한다.
- 위 선택 판정에 맞는 실행 주체가 없으면 `구조화 실행 중단`으로 판정한다.

## Target Harness Code Editor 준비도, 라우팅, 출력 사용 가능 판정

이 절이 파일 수정 실행 주체의 최종 선택·중단 판정과 target editor 출력 사용 가능 판정을 담당한다.

| 판정 상태 | 판정 기준 |
| --- | --- |
| 대상 하네스 준비됨 | `target-harness-code-editor`가 설치되어 있고, 대상 프로젝트의 `AGENTS.md`, 로컬 `run-harness` 스킬, `.harness/docs/team-spec.md`, `.harness/docs/orchestration-plan.md`가 존재하며, 요청의 `target_baseline`이 대상 프로젝트의 현재 기준 상태와 일치한다. |
| 대상 코드 수정 라우팅 사용 가능 | Workflow Engine이 로컬 `run-harness`에서 받은 라우팅 결과에 `routing_status`, 정확히 하나의 `selected_role_id`, `agent_config_path`, `local_skill_path`, `routing_evidence`, 선택 역할의 `model`, `model_reasoning_effort`, `sandbox_mode`가 있음을 확인한다. 그 결과와 선택 역할의 team-spec 역할 카드, agent TOML, local skill, 예정 실행 식별자 및 조건을 대조해 일치함을 검증한다. 현재 실행 중 누락된 전용 스킬, 실행기 구현, 모델 설정을 새로 만들거나 변경해 이 판정을 충족시킨 경우에는 통과하지 않는다. |
| Target Harness Code Editor 선택 가능 | 파일 수정 작업이며 `대상 하네스 준비됨`, `대상 코드 수정 라우팅 사용 가능`이 모두 충족되고, 유효한 `request_id`·orchestration context와 검증된 라우팅 결과를 완전한 불변 구조화 실행 요청과 함께 `target-harness-code-editor` 입력으로 전달할 수 있다. 이 조건을 충족하지 못하면 target editor를 호출하지 않고 Workflow Engine이 선택 전에 `구조화 실행 중단`으로 처리한다. |
| Target Harness Code Editor 출력 사용 가능 | ordinary 실행에서 target editor가 `Target Harness Code Editor 선택 가능`을 통과한 입력으로 실제 호출된 경우에만 기존 `구조화 실행 결과 사용 가능`과 `실행 범위 준수`를 적용한다. 일반 모드의 성공 또는 실제 execution session ID가 발급된 뒤의 중단이면 반환된 `routing_status`, `selected_role_id`, `agent_config_path`, `local_skill_path`, `routing_evidence`, `model`, `model_reasoning_effort`, `sandbox_mode`가 Workflow Engine이 검증해 전달한 입력 라우팅 결과와 모두 일치하며 실제 실행 주체가 선택 역할의 agent config, local skill, model, reasoning, sandbox를 사용한 별도 execution session임이 확인된다. validation mode 결과는 10개의 raw result와 무결성 정보를 사용자에게 제시하는 terminal diagnostic이며 출력 사용 가능 판정, 구조화 실행 성공 또는 다음 transition에 연결하지 않는다. 실행 세션 미시작 중단이면 `routing_status`만 `aborted`로 전이할 수 있고 나머지 라우팅 고유 필드는 검증해 전달한 입력과 항상 일치해야 하며, 전용 중단 조건과 세션 `not_applicable` 사유 대조를 통과해야 한다. 불완전 fan-out, 선택 전 중단, 구조화 요청 식별 불능, 검증된 라우팅 입력 누락은 target editor 출력 사용 가능 판정 대상이 아니다. |
| 대상 코드 수정 구조화 중단 | 대상 하네스 또는 실행 스킬 누락, 기준 상태 불일치, 라우팅 결과 누락, 라우팅 후보 0개 또는 복수, Workflow Engine 검증 뒤의 라우팅·역할 자산·설정 변경, 현재 실행 중 전용 스킬·실행기 구현·모델 설정의 신규 생성 또는 변경, 역할·agent·skill·model·reasoning·sandbox·권한·도구·경로·파괴적 위험 불일치, 별도 execution session 시작 불가, 출력 사용 가능 실패 중 하나 이상이 있다. 누락 또는 불일치의 재개 조건은 설치 또는 하네스 생성기 갱신 후 해당 실행을 다시 시작하는 것이다. |

- `대상 코드 수정 구조화 중단`이면 파일을 변경하지 않고 공통 구조화 실행 결과로 중단을 반환한다. `direct-edit fallback`과 라우팅 우회는 허용하지 않는다.
- 이 절은 공통 구조화 요청과 결과의 필드 집합을 중복 정의하지 않는다. 요청 사용 가능, 결과 사용 가능, 요청-결과 상관관계, 실행 범위, 성공 또는 중단은 기존 구조화 실행 판정 규칙을 그대로 적용한다.
