# Target Harness 실행 계약

이 문서는 파일 수정 작업의 Target Harness 준비도, 라우팅, `target-harness-code-editor` 선택, 세션 예외, 출력 사용 가능과 정리 근거 검증을 정의한다. 공통 구조화 요청·결과 필드, `request_id` 상관관계, 실행 범위, 성공·중단은 `structured-execution-contract.md`를 따르고, 명령 경로는 `command-execution-path-contract.md`, 실행 리소스 정리는 `agent-lifecycle-contract.md`를 따른다.

## 준비도와 라우팅

| 판정 상태 | 판정 기준 |
| --- | --- |
| 대상 하네스 준비됨 | `target-harness-code-editor`가 설치되어 있고, 대상 프로젝트의 `AGENTS.md`, 로컬 `run-harness` 스킬, `.harness/docs/team-spec.md`, `.harness/docs/orchestration-plan.md`가 존재하며, 요청의 `target_baseline`이 대상 프로젝트의 현재 기준 상태와 일치한다. |
| 대상 코드 수정 라우팅 사용 가능 | Workflow Engine이 로컬 `run-harness`에서 받은 라우팅 결과에 `routing_status`, 정확히 하나의 `selected_role_id`, `agent_config_path`, `local_skill_path`, `routing_evidence`, 선택 역할의 `model`, `model_reasoning_effort`, `sandbox_mode`가 있음을 확인한다. 그 결과와 선택 역할의 team-spec 역할 카드, agent TOML, local skill, 예정 실행 식별자 및 조건을 대조해 일치함을 검증한다. 현재 실행 중 누락된 전용 스킬, 실행기 구현, 모델 설정을 새로 만들거나 변경해 이 판정을 충족시킨 경우에는 통과하지 않는다. |

## 파일 수정 실행 주체 선택

| 판정 상태 | 판정 기준 |
| --- | --- |
| Target Harness Code Editor 선택 가능 | 파일 수정 작업이며 `대상 하네스 준비됨`, `대상 코드 수정 라우팅 사용 가능`이 모두 충족되고, 유효한 `request_id`·orchestration context와 검증된 라우팅 결과를 완전한 불변 구조화 실행 요청과 함께 `target-harness-code-editor` 입력으로 전달할 수 있다. 이 조건을 충족하지 못하면 target editor를 호출하지 않고 Workflow Engine이 선택 전에 `구조화 실행 중단`으로 처리한다. |
| 대상 코드 수정 구조화 중단 | 대상 하네스 또는 실행 스킬 누락, 기준 상태 불일치, 라우팅 결과 누락, 라우팅 후보 0개 또는 복수, Workflow Engine 검증 뒤의 라우팅·역할 자산·설정 변경, 현재 실행 중 전용 스킬·실행기 구현·모델 설정의 신규 생성 또는 변경, 역할·agent·skill·model·reasoning·sandbox·권한·도구·경로·파괴적 위험 불일치, 별도 execution session 시작 불가, 출력 사용 가능 실패 중 하나 이상이 있다. 누락 또는 불일치의 재개 조건은 설치 또는 하네스 생성기 갱신 후 해당 실행을 다시 시작하는 것이다. |

- `대상 코드 수정 구조화 중단`이면 파일을 변경하지 않고 공통 구조화 실행 결과로 중단을 반환한다. `direct-edit fallback`과 라우팅 우회는 허용하지 않는다.

## Target Harness 결과 상관관계와 출력 사용 가능

공통 요청-결과 상관관계가 `request_id` 일치로 원 요청을 식별·선택한 뒤 다음 Target Harness 전용 조건을 적용한다. 다른 식별자를 fallback으로 사용하지 않는다.

### 실행 세션 미시작 중단 상관관계

다음 조건을 모두 충족하면 `실행 세션 미시작 중단 상관관계 통과`로 판정한다.

1. `Target Harness Code Editor 선택 가능`을 통과한 입력으로 target editor를 실제 호출했다.
2. 유효한 `request_id`, orchestration context와 검증된 라우팅 입력이 있다.
3. 사전 검증 실패로 별도 execution session 시작을 시도하지 않았거나, 시작을 시도했지만 도구가 실제
   세션 ID를 발급하기 전에 실패했다.
4. `routing_status = aborted`, 예정 관계 `separate_execution_session`, 실제 세션 ID 미발급 상태다.
5. `changed_files`와 `github_state_changes`는 빈 값이고, `performed_actions`, `verification_results`,
   `residual_risks_or_failure_reasons`에는 수행한 사전 검증과 중단 원인이 기록돼 있다.
6. `actual_execution_session_id`와 `actual_session_relation`은 각각 `not_applicable`이며 이유는
   `execution_session_not_started`다.
7. 검증된 입력 라우팅에서 `routing_status`만 `aborted`로 전이되고 나머지 라우팅 고유 필드는 입력과 같다.

세션 시작을 시도한 경우에만 시도·실패 기록을 요구한다. 실제 execution session ID가 발급된 뒤의 중단은
공통 계약의 실제 별도 세션 ID와 관계 검증을 적용한다.

### Target Harness Code Editor 출력 사용 가능

ordinary 실행에서 다음 조건을 모두 충족하면 출력 사용 가능으로 판정한다.

1. `Target Harness Code Editor 선택 가능`을 통과한 입력으로 target editor를 실제 호출했다.
2. 공통 계약의 `구조화 실행 결과 사용 가능`과 `실행 범위 준수`를 충족한다.
3. 일반 모드 성공 또는 실제 execution session ID 발급 뒤 중단이면 라우팅 고유 필드가 검증된 입력과
   일치하고, 선택 역할의 agent config, local skill, model, reasoning, sandbox를 사용한 별도 execution
   session임이 확인된다.
4. target editor가 직접 발급받은 모든 ID의 정리 시도와 결과가 `verification_results`에 기록돼 있다.
   정리 실패는 `residual_risks_or_failure_reasons`에 기록돼 있으며 Workflow Engine은 해당 child ID를
   중복으로 `close_agent`하지 않는다.
5. 실행 세션 미시작 중단이면 앞 절의 전용 상관관계와 세션 `not_applicable` 사유 대조를 통과한다.

validation mode 결과는 10개 raw result와 무결성 정보를 사용자에게 제시하는 terminal diagnostic으로
반환한다. 이 결과는 ordinary 출력 사용 가능, 구조화 실행 성공 또는 다음 transition 판정과 분리한다.
불완전 fan-out, 선택 전 중단, 구조화 요청 식별 불능, 검증된 라우팅 입력 누락은 출력 사용 가능 판정 전에
중단 사유로 기록한다.

대응할 원 요청의 식별 자체가 불가능하거나 검증된 라우팅 입력이 없으면 target editor 출력 사용 가능 판정으로 진행하지 않고 Workflow Engine이 선택 전에 `구조화 실행 중단`으로 처리하며, 이 상태를 target editor 결과로 만들지 않는다.
