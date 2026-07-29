# 상태 관측 계약

이 문서는 GitHub와 로컬 상태를 읽고, 읽기 전용 상태 요약의 사용 가능 여부를 판정하며, 관측 필드와 상태 근거를 분류하는 기준만 정의한다. 작업 전이와 현재 작업 선택은 이 문서의 책임이 아니며 `definitions/*.json`, 각 state adapter, `evaluator.mjs`가 담당한다. 구조화 실행 요청과 실행 주체 판정은 `structured-execution-contract.md`, 리뷰 런타임 판정은 `review-runtime-contract.md`를 따른다.

## 상태 읽기 규칙

- 기준 대상은 열린 PR에서 먼저 찾고, 이어갈 PR 후보가 비어 있으면 열린 이슈에서 찾는다.
- 열린 PR 중 unresolved review thread, merge 대기 상태가 있으면 새 이슈보다 먼저 처리한다.
- 기능제안 전환 완료 직후 같은 자동 실행 루프에서는 종료된 기능제안 이슈를 후속 정책검토 또는 기능변경 흐름의 연관 이슈로 참조한다.
- PR 연결 이슈는 PR 본문의 `연관 이슈 (optional)` 섹션에서 `Refs #번호` 형식으로 판단한다.
- Workflow Engine 관리 이슈는 PR 본문에 `Refs #번호`로 연결한다.
- Pull Request review threads는 diff가 있는 피드백과 resolved/unresolved 상태를 리뷰 피드백 상태 원천으로 읽는다.
- Pull Request issue comments는 리뷰 피드백 상태 원천으로 쓰지 않는다.
- 기존 marker 요약 피드백 댓글은 `리뷰 대응 대상 확인`과 `남은 피드백 확인`에서만 과거 호환 정보로 읽고 `legacy_marker_comments`를 산출한다. 새 게시 대상, 새 대응 대상, 완료 근거, 미완료 근거, merge 대기 판정 근거로 쓰지 않는다.
- 기존 marker 요약 피드백은 다음 marker가 있는 PR comment로 식별한다.

```markdown
<!-- codex-harness:summary-feedback v1 -->
```

`legacy_marker_comments`는 marker 댓글마다 `comment_id`, `url`, 체크된 항목 수, 미체크 항목 수를 기록한다. 기존 marker 댓글이 없으면 빈 배열로 기록한다. 이 결과는 과거 댓글의 존재와 체크 상태를 안내하기 위한 호환 정보이며 GitHub 상태를 변경하거나 작업 전이를 결정하지 않는다.

## 기능변경 단독 진입 local_state 관측 규칙

Workflow Engine은 단독 기능변경 요청의 최초 상태 묶음을 수집할 때 아래 네 routing fact를 직접 산출한다.
`github-state-summary`와 state adapter는 이 판단을 대신하지 않는다. state adapter는 산출된 관측값의
`source_kind=local_state` 계약만 검증한다.

각 routing fact는 현재 요청을 식별하는 `request_id`를 `source_reference`로 사용하고, 아래
`field_reference`가 가리키는 routing check 결과와 그 입력이 실행 로그에서 원본 사용자 요청 또는
기준 이슈의 필드까지 추적 가능해야 한다. 참·거짓을 판단할 근거가 누락되거나 충돌하면 기본값을
추론하지 않고 상태 수집을 중단한다.

| fact | 값 산출 기준 | `field_reference` |
| --- | --- | --- |
| `feature_change_scope_identified` | 구현 또는 문서 변경 대상과 범위가 단일 기능변경 이슈 초안으로 특정되면 `true`, 대상이 없거나 복수 후보 중 하나를 확정할 수 없으면 `false` | `routing_check.feature_change_scope_identified` |
| `feature_change_completion_criteria_ready` | 요청 또는 기준 이슈에서 검증 가능한 완료 기준을 작성할 수 있으면 `true`, 성공 조건이나 검증 기준을 확정할 수 없으면 `false` | `routing_check.feature_change_completion_criteria_ready` |
| `additional_policy_decision_required` | 구현 범위를 바꾸는 미확정 정책·설계 결정이 하나 이상 남아 있으면 `true`, 현재 근거만으로 추가 정책 결정 없이 구현 범위를 확정할 수 있으면 `false` | `routing_check.additional_policy_decision_required` |
| `defect_investigation_required` | 잘못된 동작의 원인 조사와 해결 방향 확정이 선행돼야 하면 `true`, 요청이 원인 조사를 요구하지 않는 확정된 기능변경이면 `false` | `routing_check.defect_investigation_required` |

routing check 입력에는 현재 사용자 요청 식별자와, 기준 이슈가 있으면 이슈 번호 및 판정에 사용한
본문 heading을 기록한다. 네 fact와 evidence를 같은 상태 묶음에 포함한 뒤
`normalizeFeatureChangeFacts`를 정확히 한 번 호출한다.

## 상태 요약 출력 사용 가능 판정 규칙

| 판정 상태 | 판정 기준 |
| --- | --- |
| 상태 요약 출력 사용 가능 | `github-state-summary` 결과에 `request_id`, `target_baseline`, `source_identifiers`, `observed_facts`, `missing_or_conflicting_facts`, 실제 실행 식별자와 세션, 읽기 전용 `performed_actions`, 빈 `changed_files`, 빈 `github_state_changes`, `verification_results`, `postconditions_satisfied`, `residual_risks_or_failure_reasons`가 있다. `request_id`, `target_baseline`, 조회 대상 식별자는 원 요청과 각각 일치한다. 모든 관측 사실은 출처 식별자로 추적 가능하고, 쓰기 또는 상태 전이 판단이 없다. |

- 누락 또는 충돌 사실은 관측값으로 유지하며 현재 작업, 사용자 결정, 실행 범위, 상태 전이를 확정하는 근거로 자동 보완하지 않는다.
- `상태 요약 출력 사용 가능`은 Workflow Engine이 다시 적용할 수 있는 읽기 전용 입력 조건일 뿐 최종 판단이 아니다.

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
