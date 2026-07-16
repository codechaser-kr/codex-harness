---
name: github-state-summary
description: GitHub와 로컬의 지정된 상태를 읽기 전용으로 수집해 출처와 관측 사실을 반환합니다. 현재 작업, 사용자 결정, 상태 전이, 변경은 확정하지 않습니다.
---

# GitHub State Summary

이 스킬은 `github-workflow-engine`이 이미 식별한 대상의 GitHub 및 로컬 상태를 읽기 전용으로 요약한다. 저비용 실행에 적합한 보조 단위이며, 관측 결과는 Workflow Engine의 입력일 뿐 상태나 다음 작업의 결정이 아니다.

## 먼저 읽을 문서

- `../github-workflow-engine/references/workflow-engine-rules.md`에서 `상태 읽기 규칙`, `상태 요약 출력 사용 가능 판정 규칙`, `실행 주체 선택 판정 규칙`을 읽는다.

## 입력

- 원 요청의 `request_id`, 기준 이슈 또는 PR, 조회 대상 식별자와 `target_baseline`
- 필요한 관측 사실과 허용된 읽기 전용 GitHub 또는 로컬 조회 범위
- `planned_model_identifier`와 `planned_config_identifier`가 실행 환경에서 확인 가능한 저비용 실행 설정을 가리키고, 실제 실행 주체, 권한, 도구, 세션을 기록할 수 있는 실행 맥락

## 책임

1. 허용된 범위에서 `gh issue view`, `gh pr view`, `gh pr checks`, `gh api` GET, `git status`, `git diff`, `git log`, `git show`, `rg`, `sed`, `ls`, `find`, `wc` 등 읽기 전용 명령 또는 도구만 사용한다. `sed`는 출력 또는 파이프 변환용 읽기 형태만 허용하고 `sed -i`는 금지한다. `find`는 탐색 전용만 허용하고 `find -delete` 및 파일 변경 목적의 `find -exec`는 금지한다.
2. 각 관측 사실에 출처 식별자와 조회 시점을 연결하고, 확인하지 못한 사실은 누락 또는 충돌로 분리한다.
3. 실제 executor, model, skill, config, orchestration session, execution session, permission, tool, command path 정보를 관측 결과에 기록한다.
4. 수행한 읽기 동작, 빈 `changed_files`, 빈 `github_state_changes`, 검증 결과, 사후조건, 남은 위험을 반환한다.

## 출력

- `request_id`, `target_baseline`, `source_identifiers`, `observed_facts`, `missing_or_conflicting_facts`
- `actual_executor_type`, `actual_agent_or_role`, `actual_model_identifier`, `actual_skill_identifier`, `actual_config_identifier`, `actual_orchestration_session_id`, `actual_execution_session_id`, `actual_session_relation`
- `actual_permission_conditions`, `actual_available_tool_conditions`, `actual_command_execution_path`, `execution_path_recheck_result`, `performed_actions`, 빈 `changed_files`, 빈 `github_state_changes`, `verification_results`, `postconditions_satisfied`, `residual_risks_or_failure_reasons`

관측값은 출처와 함께 반환하고 추론으로 빈칸을 채우지 않는다. 실제 실행 식별자에 적용되지 않는 값은 `not_applicable`과 이유를 기록한다.

## 하지 않는 일

- GitHub, 파일, 브랜치, 커밋, PR, 댓글, review thread, 라벨, 체크리스트 또는 로그를 변경하지 않는다.
- 현재 작업, 사용자 결정, 상태 전이, 실행 범위, 완료 또는 중단을 확정하지 않는다.
- 쓰기 명령, 권한 상승, 원격 변경, 파괴적 작업 또는 범위 밖 조회를 수행하지 않는다.

## 사용자 결정

- 관측 결과, 누락 사실, 충돌 사실을 사용자 결정이나 상태 변경 의도로 해석하지 않는다.
- 사용자 결정이 필요하다는 판단과 선택지 제시는 `github-workflow-engine`만 수행한다.

## 중단 조건

- `request_id`, 기준 대상, 조회 범위, `target_baseline`, 읽기 전용 도구 조건이 없거나 원 요청과 일치하지 않으면 조회를 넓히지 않고 중단 사유를 반환한다.
- `planned_model_identifier` 또는 `planned_config_identifier`가 실행 환경에서 확인 가능한 저비용 실행 설정을 가리키지 않으면 수행하지 않는다.
- 쓰기, 권한 상승, GitHub 변경 또는 파일 변경이 필요하면 실행하지 않고 필요한 Workflow Engine 판단 또는 새 구조화 실행 요청을 반환한다.

## 후속 전이

- 출처가 있는 관측 결과만 `github-workflow-engine`에 반환한다.
- Workflow Engine이 `상태 요약 출력 사용 가능`을 판정한 뒤 현재 작업, 사용자 결정, 상태 전이 또는 후속 실행 요청을 확정한다.
