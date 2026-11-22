# 상태 관측 계약

이 문서는 GitHub와 로컬 상태를 읽고, 읽기 전용 상태 요약의 사용 가능 여부를 판정하며, 관측 필드와 상태 근거를 분류하는 기준만 정의한다. 작업 전이와 현재 작업 선택은 이 문서의 책임이 아니며 `definitions/*.json`, 각 state adapter, `evaluator.mjs`가 담당한다. 구조화 실행 요청과 실행 주체 판정은 `structured-execution-contract.md`, 리뷰 런타임 판정은 `review-runtime-contract.md`를 따른다.

## 상태 읽기 규칙

- 모든 관측 요청에는 `request_id`와 `target_baseline`이 필요하다. 첫 GitHub 이슈가 생성되기 전에는 `source_issue_id`가 없을 수 있으며,
  해당 단계는 `FP-1/FP-2`, `PR-1/PR-2`, `FC-1/FC-2`, `FF-1/FF-2`로 한정한다. Workflow 평가가 다른 작업 단계를 선택하면
  요청에 현재 원본 이슈의 `source_issue_id`가 있어야 한다. 이슈 생성 뒤 오케스트레이션은 반환된 이슈 ID를 다음 관측 요청에 전달한다.
- 구현 Workflow의 `FI-36` 완료 뒤 부모 재평가로 돌아갈 때는 로그의 `parent_workflow_context.source_issue_id`가 현재 요청의
  `source_issue_id`와 같아야 한다. 값이 다르면 부모 재평가 handoff를 만들지 않고 `unresolved`로 중단한다.
- 기준 대상은 열린 PR에서 먼저 찾고, 이어갈 PR 후보가 비어 있으면 열린 이슈에서 찾는다.
- 열린 PR 중 unresolved review thread, merge 대기 상태가 있으면 새 이슈보다 먼저 처리한다.
- 기능제안 Workflow가 방향 반영 및 원본 이슈 종료 후 `completed`를 반환하면, orchestration은 사용자 선택 방향으로 후속
  `policy-review` 또는 `feature-change`를 시작한다. 새 Workflow는 원본 기능제안 이슈를 GitHub 이슈 관계로 참조한다.
- 정책검토에서 기존 기능변경 이슈를 사용자가 정확히 선택하면, 선택된 Issue ID를 원본 정책검토 이슈와 그 대상 사이의
  GitHub related-issue 관계로 `PR-9`에서 원본 정책검토 이슈를 닫기 전에 기록한다. `feature_change_transition_target_related=true`는
  원본 이슈가 사용자가 선택한 정확한 Issue ID와 연결되고 대상이 열린 기능변경 이슈임을 GitHub 관계에서 확인한 경우에만
  관측한다. 첫 `PR-9` 실행에서 관계가 없는 것은 예상 상태이며, 선택된 Issue ID로 관계를 기록한다. 기존 관계가 다른 대상,
  여러 대상, 종료된 대상 또는 기능변경 유형이 아닌 대상으로 충돌하면 새 관계를 더하지 말고 중단해 기록을 바로잡는다.
  관계 fact의 provenance는 `field_reference=related_issues[issue #<ID>]` 형식으로 정확한 대상 ID를 보존한다.
  `PR-11`에서는 이 relation ID와 `feature_change_transition_result` evidence의 `source_reference=issue #<ID>`가
  같은 대상인지 교차 검증한다. 결과 ID가 다르거나 하나라도 누락·모호하면 update 완료를 확정하지 않고 handoff를 미해결로
  반환한다. Composition runtime은 두 ID가 일치할 때만 `PR-11` 종료 결과에 이 ID를 포함한다.
  `PR-9` 완료 뒤 재개 때는 같은 관계를 읽어 해당 Issue ID를 대상 ID로 사용한다. 완료된 관계가 이후 없거나 모순이면 제목,
  본문 언급 또는 단순 관련성으로 추측하지 않고 중단한다. 이미 선택한 대상 관계가 없을 때는 재선택을 요구하지 않는다.
- 사용자가 기존 대상 방향은 선택했으나 대상 이슈 번호를 명시하지 않았거나 후보를 구별할 수 없으면, PR-7의 사용자 결정 단계에서
  정확한 이슈 번호가 선택될 때까지 확인한다. `feature_change_transition_target_issue_selected=true`는 해당 결정에서 정확한 Issue ID를
  명시한 경우에만 `user_input`으로 관측한다. 최초 선택에서 이 fact가 없거나 false이면 PR-7을 완료하지 않는다. 재개에서는
  이미 기록된 정확한 GitHub 관계가 선택 identity를 보존하므로 선택 fact가 없어도 그 관계로 선택을 복구한다. 관계를 아직
  기록하지 않은 상태로 재개하면 같은 `request_id`의 원래 사용자 입력 또는 구조화 실행 요청에서 선택된 Issue ID를 복구한다.
  과거 선택 기록은 있지만 그 입력·요청 근거를 복구하지 못하면 사용자에게 재선택을 요구하지 않고 관측을 중단해 기록 근거를
  복원한다. 이 Boolean fact는 Issue ID를 담지 않으므로 실행 요청과 이후 관계가 identity를 보존한다. 원래 선택과 관계가
  충돌하거나 이미 기록한 관계가 재개에서 사라진 경우는 새 사용자 선택 단계가 아니라 기록·조회 오류다.
- PR 연결 이슈는 PR 본문의 `연관 이슈 (optional)` 섹션에서 `Refs #번호` 형식으로 판단한다.
- Workflow Engine 관리 이슈는 PR 본문에 `Refs #번호`로 연결한다.
- Pull Request review threads는 diff가 있는 피드백과 resolved/unresolved 상태를 리뷰 피드백 상태 원천으로 읽는다.
- Pull Request issue comments는 리뷰 피드백 상태 원천으로 쓰지 않는다.
- 날짜별 Workflow Engine 로그가 보조 근거로 필요하면 현재 실행 환경 날짜 파일을 먼저 읽는다.
- 날짜 경계를 넘긴 재개 요청에서 현재 날짜 파일이 없거나 관련 `request_id`, `task_action_id`, 재개 조건이
  없으면 `.github-agentic-loop/logs/github-workflow-log-YYYY-MM-DD.md` 파일명을 날짜 내림차순으로
  확인한다. 같은 기준 이슈 또는 PR과 워크플로에 해당하는 최신 이전 날짜 파일부터 필요한 재개 근거가
  복원될 때까지만 최소 범위로 읽고, 무관한 날짜 파일까지 전부 읽지 않는다.
- 날짜별 로그는 보조 근거로만 분류한다. 로그가 GitHub 완료·미완료 근거와 충돌하면 GitHub 실행 상태를
  우선하고, 관련 이전 날짜 파일에서도 필요한 재개 근거를 찾지 못하면 값을 추론하지 않고 중단한다.

## 기능변경 진입 local_state 관측 규칙

Workflow Engine은 현재 시작 요청의 출처로 기능변경 최초 상태 묶음의
`feature_change_entry_source`를 직접 산출한다. 값은 직접 기능변경 요청이면 `direct_request`, 완료된 기능제안이
후속 흐름으로 선택되면 `feature_proposal`, 완료된 정책검토가 후속 흐름으로 선택되면 `policy_review`다.
누적된 완료 fact나 제목으로 현재 출처를 추론하지 않는다. 단독 요청이면 나머지 네 routing fact도 함께 산출한다.
`github-state-summary`와 state adapter는 이 판단을 대신하지 않는다. state adapter는 산출된 관측값의
`source_kind=local_state` 계약만 검증한다.

기능제안에서 시작된 정책검토는 `policy_review_entry_source=feature_proposal`을 local state로 전달한다.
직접 시작된 정책검토는 `policy_review_requested=true` user input으로 진입한다. 두 입력 모두 이전 Workflow의 완료 뒤
orchestration이 새 Workflow의 entry facts로 구성한다.

`policy_review_entry_source`는 새 정책검토 시작 요청의 `request_id`를 `source_reference`로 사용하고
`routing_check.policy_review_entry_source`를 `field_reference`로 사용한다. 값의 근거는 완료된 기능제안의 방향 및
원본 이슈 상태이며, 새 Workflow를 시작한 orchestration이 구성한다. 이 사실은 이전 Workflow의 완료 fact 자체가 아니며,
`policy_review_requested`와 동시에 true로 두지 않는다. 원본 기능제안과 정책검토 이슈의 GitHub related-issue 관계도 함께
기록해 재개 시 원본을 식별한다.

각 산출 fact는 현재 요청을 식별하는 `request_id`를 `source_reference`로 사용하고, 아래
`field_reference`가 가리키는 routing check 결과와 그 입력이 실행 로그에서 원본 사용자 요청 또는
기준 이슈의 필드까지 추적 가능해야 한다. 참·거짓을 판단할 근거가 누락되거나 충돌하면 기본값을
추론하지 않고 상태 수집을 중단한다.

| fact | 값 산출 기준 | `field_reference` |
| --- | --- | --- |
| `feature_change_entry_source` | 현재 요청이 직접 요청, 기능제안 전환, 정책검토 전환 중 어디에서 시작됐는지에 따라 각각 `direct_request`, `feature_proposal`, `policy_review` | `routing_check.feature_change_entry_source` |
| `feature_change_scope_identified` | 구현 또는 문서 변경 대상과 범위가 단일 기능변경 이슈 초안으로 특정되면 `true`, 대상이 없거나 복수 후보 중 하나를 확정할 수 없으면 `false` | `routing_check.feature_change_scope_identified` |
| `feature_change_completion_criteria_ready` | 요청 또는 기준 이슈에서 검증 가능한 완료 기준을 작성할 수 있으면 `true`, 성공 조건이나 검증 기준을 확정할 수 없으면 `false` | `routing_check.feature_change_completion_criteria_ready` |
| `additional_policy_decision_required` | 구현 범위를 바꾸는 미확정 정책·설계 결정이 하나 이상 남아 있으면 `true`, 현재 근거만으로 추가 정책 결정 없이 구현 범위를 확정할 수 있으면 `false` | `routing_check.additional_policy_decision_required` |
| `defect_investigation_required` | 잘못된 동작의 원인 조사와 해결 방향 확정이 선행돼야 하면 `true`, 요청이 원인 조사를 요구하지 않는 확정된 기능변경이면 `false` | `routing_check.defect_investigation_required` |

routing check 입력에는 현재 사용자 요청 식별자, 선택된 상위 전환 이슈가 있으면 그 이슈 번호,
그리고 기준 이슈가 있으면 이슈 번호 및 판정에 사용한 본문 heading을 기록한다. 현재 진입에 필요한
fact와 evidence를 같은 상태 묶음에 포함한 뒤
`normalizeFeatureChangeFacts`를 정확히 한 번 호출한다.

## 상태 요약 출력 사용 가능 판정 규칙

| 판정 상태 | 판정 기준 |
| --- | --- |
| 상태 요약 출력 사용 가능 | `github-state-summary` 결과에 `request_id`, `target_baseline`, `source_identifiers`, `observed_facts`, `missing_or_conflicting_facts`, 실제 실행 식별자와 세션, 읽기 전용 `performed_actions`, `execution_path_recheck_result="satisfied"`, 빈 `changed_files`, 빈 `github_state_changes`, `verification_results`, `postconditions_satisfied=true`, `residual_risks_or_failure_reasons`가 있다. `request_id`, `target_baseline`, 조회 대상 식별자는 원 요청과 각각 일치한다. 요청에 `source_issue_id`가 있으면 provider 입력과 `source_identifiers`에 같은 `issue #<ID>`가 있어야 한다. 모든 관측 사실은 출처 식별자로 추적 가능하고, 쓰기 또는 상태 전이 판단이 없다. |

- 누락 또는 충돌 사실은 관측값으로 유지하며 현재 작업, 사용자 결정, 실행 범위, 상태 전이를 확정하는 근거로 자동 보완하지 않는다.
- `execution_path_recheck_result`는 정확히 `satisfied`일 때만 성공이다. 다른 값, 누락 또는 인식할 수 없는 값이면 상태 요약을 사용할 수 없다.
- `postconditions_satisfied`는 boolean `true`일 때만 성공이다. Provider는 요청·baseline·조회 대상 correlation, 읽기 전용 실행 경계, 출처가 있는 관측값, 빈 `changed_files`와 `github_state_changes` 등 이 계약의 사후조건이 모두 만족된 경우에만 `true`를 반환한다.
- `상태 요약 출력 사용 가능`은 Workflow Engine이 다시 적용할 수 있는 읽기 전용 입력 조건일 뿐 최종 판단이 아니다.

## Runtime observation 입력 경계

`scripts/workflow-definition/composition-runtime.mjs`의 `runWorkflowObservationCycle`은 주입된
`observeGithubState` 및 `observeWorkflowLog` 결과를 현재 정규화·평가 경로의 입력으로 사용한다. 두 결과는 같은
`request_id`와 `target_baseline`을 가져야 하고, `source_identifiers`, `observed_facts`,
`missing_or_conflicting_facts`를 포함해야 한다. GitHub 상태 요약은 읽기 전용 결과여야 하며
요청에 `source_issue_id`가 있으면 composition runtime은 해당 ID를 GitHub provider에 전달하고, 반환된
`source_identifiers`에 같은 `issue #<ID>`가 있는지 확인한다.
실행 주체·session·permission·tool·command path 식별, `performed_actions`, `verification_results`,
`postconditions_satisfied`, `residual_risks_or_failure_reasons`를 함께 반환해야 한다. `changed_files`와
`github_state_changes`는 빈 배열이어야 한다. composition runtime은 이 correlation·read-only 결과 필수값을 검사하고
하나라도 누락되거나 상태 변경이 있으면 adapter/evaluator 전에 중단한다. 관측 결과는
`execution_path_recheck_result="satisfied"`와 `postconditions_satisfied=true`일 때만 사용할 수 있다.
실행 경로 재검사가 만족되지 않았거나 사후조건이 `true`가 아니면 반환된 `observed_facts`를 사용하지 않고
`observation_source_invalid`로 중단한다.

각 `observed_facts` 항목은 state adapter가 요구하는 `fact_id`, `value`, `source_kind`,
`source_reference`, `field_reference`를 포함한다. Runtime은 같은 `fact_id`에 대해 GitHub 현재 관측과 로그 fact가
서로 다른 값을 내면 GitHub 현재 값을 정본으로 사용하고, 무시된 로그 값을 `source_conflicts`로 남긴다. 현재 GitHub
관측끼리 충돌하거나 GitHub 관측이 없는 fact의 나머지 provenance 값들이 충돌하면 adapter가 중단한다. 로그가 현재
GitHub 관측 없이 `source_kind=github_state`를 주장하면 잘못된 source로 중단한다. 누락 fact를 로그나 추론으로
채우지 않는다.

이 함수는 source provider를 호출하는 조립 경계이지만 GitHub API, 로컬 파일, 외부 Skill을 직접 실행하지 않는다.
실제 provider를 연결하는 host는 별도 실행 책임이며, fixture 테스트는 provider 반환값만 모킹하고 이 함수의 조립·정규화·평가
경로를 실행한다.

## 필드 판정 규칙

| 판정                       | 산출 규칙                                                                                                                                                 |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 본문 섹션 값 있음          | 지정된 heading 아래에서 다음 heading 전까지의 본문에 공백, HTML comment, 템플릿 안내문을 제외한 텍스트, 체크항목, issue 번호, PR 번호 중 하나가 존재한다. |
| 본문 섹션 빈 상태          | 지정된 heading 아래에서 다음 heading 전까지의 본문이 공백, HTML comment, 템플릿 안내문만 가진다.                                                          |
| 체크항목 체크됨            | Markdown 체크항목이 `- [x]` 또는 `- [X]` 형식이다.                                                                                                        |
| 체크항목 미체크            | Markdown 체크항목이 `- [ ]` 형식이다.                                                                                                                     |
| GitHub 이슈 open           | GitHub issue state가 `OPEN` 또는 `open`이다.                                                                                                              |
| GitHub PR open             | GitHub pull request state가 `OPEN` 또는 `open`이다.                                                                                                       |
| GitHub PR merged           | GitHub pull request merged 값이 `true`이거나 state가 `MERGED` 또는 `merged`다.                                                                            |
| PR base branch 식별됨      | PR의 base branch 이름이 GitHub PR 상태 또는 PR 생성 요청값에서 확인되는 상태다.                                                                           |
| 로컬 작업트리 안전 확인    | `git status --short` 결과가 비어 있거나, 남은 변경이 현재 Workflow Engine 실행 범위 안에서 보존 가능한 상태로 기록된다.                                   |
| base branch 갱신 명령 완료 | PR merge 이후 PR base branch에서 `git pull --ff-only -p` 또는 동등한 fast-forward 확인 절차가 exit code `0`으로 종료된 결과가 기록된다.                   |
| 사용자 선택 확정           | 사용자 입력이 직전 응답에서 제시한 번호, 선택지 문구, 유효한 `기타 의견 입력` 형식 중 하나와 일치한다.                                                    |
| 로컬 수정 존재             | `git diff --name-only` 출력에 현재 작업 범위에 속한 파일이 하나 이상 포함된다.                                                                            |
| 검증 성공                  | 현재 작업의 검증 명령이 exit code `0`으로 종료된 결과가 실행 로그에 기록된다.                                                                             |
| 커밋 생성 완료             | 현재 작업 범위의 마지막 commit hash가 실행 로그 또는 연결 이슈/PR 본문에 기록된다.                                                                        |
| 원격 push 완료             | 원격 head branch가 존재하고 원격 head branch의 HEAD commit이 로컬 작업 브랜치 HEAD commit과 일치한다.                                                     |
| 작업 대상 식별자           | 기준 이슈 또는 PR, 구현 단위, 커밋 단위, 브랜치, PR, 위치 매핑 보류 피드백, review thread처럼 반복 가능한 작업 대상을 구분하는 값이다.                  |

## 상태 근거 분류 규칙

| 묶음        | 포함할 수 있는 근거                                                                                     |
| ----------- | ------------------------------------------------------------------------------------------------------- |
| 완료 근거   | 체크된 완료 조건, merged PR, resolved review thread        |
| 미완료 근거 | 미체크 완료 조건, open 연결 PR, unresolved review thread |
| 보조 근거   | 현재 코드 상태, 보조 로그, 현재 대화에서 확인한 마지막 관련 작업, 마지막 사용자 결정, 마지막 실행 결과  |
| 무효 근거   | 이슈 본문의 일반 설명, 추천 문장, 미선택 후보, 구조화된 스킬 출력 필드 밖의 설명 문장                   |

- 완료 근거와 미완료 근거는 GitHub 실행 상태에서 읽는다.
- 보조 근거는 GitHub 실행 상태 밖의 중간 실행 상태를 판단할 때 사용한다.
- 보조 근거가 완료 근거 또는 미완료 근거와 충돌하면 GitHub 실행 상태를 우선한다.
- 무효 근거는 배경 설명으로만 참고한다.
- 현재 작업은 완료 근거, 미완료 근거, 보조 근거만으로 하나의 작업을 산출할 수 있을 때 확정한다.
- 사용자 결정 없이 작업 전이가 특정 반영 대상, 기존 이슈, 완료 기준 항목 중 하나를 확정해야 하는데 명시 근거가 없거나 후보가 둘 이상이면 추론하지 않고 진행 판단을 `중단`으로 둔다.

## Pull Request review thread 관측 fact

`github_review_threads_observed=true`는 기준 PR의 review thread 조회가 성공해 관측을 마쳤다는 뜻이다. 조회 실패 또는
관측 상태 불명은 성공한 빈 결과로 취급하지 않는다. 그런 경우에는 `github_review_threads_observed`를 `false`로 두거나
생략할 수 있지만, 이는 조회 실패·미완료를 뜻하며 피드백이 없다는 뜻은 아니다. 현재 상태를 성공적으로 관측하기 전까지
`review_feedback_inventory`의 `no_actionable_feedback`도 산출하지 않는다.

성공한 조회 결과에 처리할 피드백이 없으면 `github_review_threads_observed=true`와
`review_feedback_inventory=no_actionable_feedback`를 함께 둔다. 처리할 피드백이 있으면 관측 성공 fact와
`actionable_feedback_present`를 함께 둔다. 따라서 implementation의 `FI-24`는 관측 성공과 inventory가 모두 있을 때만
다음 단계로 나아가며, 실패·미확인 상태에서는 피드백 없음이나 merge 준비 상태로 진행하지 않는다.
