---
name: github-simple-executor
description: 완전하고 변경 불가능한 구조화 실행 요청의 단일 비파일 단순 상태 변경을 검증 후 수행하고 일반 구조화 실행 결과 계약으로 반환합니다.
---

# GitHub Simple Executor

이 스킬은 결정론적 실행 경로가 없는 경우에만 `github-workflow-engine`이 확정한 단일 비파일 단순 상태 변경을 수행한다. 요청값과 실행 범위는 변경 불가능하며, 최종 판단은 Workflow Engine에 남는다.

## 먼저 읽을 문서

- `../github-workflow-engine/references/structured-execution-contract.md`에서 `구조화 실행 요청 판정 규칙`, `구조화 실행 결과와 요청-결과 상관관계 판정 규칙`, `구조화 실행 성공과 중단 판정 규칙`, `실행 주체 선택 판정 규칙` 섹션만 읽는다.
- 실제 명령의 권한 경로를 판정하고 실행 직전에 재판정할 때 `../github-workflow-engine/references/command-execution-path-contract.md`를 읽는다.

## 입력

- `구조화 실행 요청 사용 가능`을 통과한 완전한 불변 요청 한 건
- 정확히 하나의 확정된 비파일 단순 상태 변경과 그 `confirmed_request_values`
- `target_baseline`, 전제조건, 사후조건, 검증 기준, 명령 실행 경로, 권한과 도구 조건
- `planned_model_identifier`와 `planned_config_identifier`가 실행 환경에서 확인 가능한 저비용 실행 설정을 가리키는 예정 executor, agent/role, model, skill, config, orchestration session, execution session 관계

## 책임

1. 요청 식별, 작업과 범위, 기준 상태, 계약 조건, 실행 경로 조건, 예정 실행 주체, 예정 세션 관계를 즉시 검증한다.
2. 실제 호출 직전에 명령 경로, 권한, 도구, 파괴적 명령 위험을 다시 확인한다.
3. 결정론적 도구 경로가 없고, 값 재해석·판단·범위 변경 없이 가능한 정확히 하나의 확정된 비파일 단순 상태 변경만 수행한다.
4. `structured-execution-contract.md`의 일반 구조화 실행 결과 계약 전체를 반환한다. 실제 executor/model/skill/config/session, permission/tool/path 재판정, 수행 동작, 변경 파일, GitHub 상태 변경, 검증, 사후조건, 위험 또는 실패 사유를 빠짐없이 기록한다.

## 출력

- 일반 구조화 실행 결과 계약의 `request_id`, `target_baseline`, 모든 `actual_*` 실행 식별자와 적용 불가 이유
- `actual_permission_conditions`, `actual_available_tool_conditions`, `actual_command_execution_path`, `execution_path_recheck_result`
- `performed_actions`, `changed_files`, `github_state_changes`, `verification_results`, `postconditions_satisfied`, `residual_risks_or_failure_reasons`

중단도 같은 완전한 결과 계약으로 반환한다. 요청 또는 실제 값의 불일치는 기록하되 요청값을 대체하지 않는다.

## 하지 않는 일

- 파일, 디렉터리, 작업트리, 브랜치, 커밋을 만들거나 수정하거나 삭제하지 않는다.
- 파괴적 작업, 범위 확장, 복수 동작, 새 요청값 생성, 값 재해석, 현재 작업·사용자 결정·상태 전이의 최종 판단을 수행하지 않는다.
- 결정론적 실행 경로가 있는 작업, 리뷰 내용 생성, 파일 수정 작업을 대신 수행하지 않는다.

## 사용자 결정

- 요청에 없는 사용자 의도, 일반 진행 표현, 오류 복구 선택을 확정으로 해석하지 않는다.
- 사용자 결정이 필요하거나 요청값이 불완전하면 실행하지 않고 `github-workflow-engine`에 중단 결과를 반환한다.

## 중단 조건

- 요청 사용 가능 실패, 단일 비파일 단순 상태 변경 조건 불충족, 결정론적 도구 경로 존재, 전제조건 불일치, 범위 밖 변경 필요, 권한·도구·경로 재판정 실패, 파괴적 명령 위험이 있으면 수행하지 않는다.
- `planned_model_identifier` 또는 `planned_config_identifier`가 실행 환경에서 확인 가능한 저비용 실행 설정을 가리키지 않으면 수행하지 않는다.
- 실행 또는 검증 실패, 사후조건 미충족, 요청-결과 불일치도 재해석하거나 재시도하지 않고 중단 결과로 반환한다.

## 후속 전이

- 일반 구조화 실행 결과만 `github-workflow-engine`에 반환한다.
- Workflow Engine이 요청-결과 상관관계, 실행 범위, 성공 또는 중단을 판정하고 다음 전이를 확정한다.
