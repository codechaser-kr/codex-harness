---
name: review-comment
description: PR Review Template 출력을 GitHub PR review thread 게시 초안으로 변환하고 중복 게시 위험과 위치 매핑 보류 대상을 점검합니다.
---

# Review Comment

이 스킬은 리뷰 생성 도구와 무관하게 PR Review Template 형식의 리뷰 결과를 GitHub Pull Request review thread 게시 초안으로 정리한다. 실제 GitHub 게시는 Workflow Engine의 후속 작업에서 처리하며, 게시된 피드백의 대응 방향과 해결 여부는 Workflow Engine의 사용자 결정에서 처리한다.

## 먼저 읽을 문서

- `../github-workflow-engine/references/review-runtime-contract.md`에서 `PR Review Template 판정 규칙`과 `리뷰 게시 위치 판정 규칙` 섹션만 읽는다.
- `../github-workflow-engine/references/artifact-output-contract.md`에서 `Review Comment 출력 판정 규칙` 섹션만 읽는다.

## 입력

- PR 번호
- PR Review Template 출력
- 기존 review thread 목록

## 책임

1. PR Review Template의 리뷰 결론, 중요도 라벨, 테스트 커버리지 판단을 읽는다.
2. `review-runtime-contract.md`의 리뷰 게시 위치 판정 결과에 따라 피드백의 게시 방식을 분류한다.
3. 위치 매핑이 필요한 피드백은 PR diff에서 해당 파일과 line의 diff position 매핑을 시도하고, 매핑 결과를 기록한다.
4. review thread 게시 대상으로 판정된 피드백은 review thread 초안으로 정리한다.
5. 위치 매핑 보류 대상으로 판정된 피드백은 원문, 보류 사유, 현재 `file`·`line` 근거와 `review thread 게시 위치 재지정`, `비실행 피드백 재분류` 선택지를 `questions`로 정리한다.
6. 기존 review thread를 확인해 중복 게시 대상을 제외한다.
7. 게시 요청 초안을 `inline_review_threads`와 `questions`로 분리한다.

## 출력

- 기존 `필수 출력`의 `pr_number`, `inline_review_threads`, `questions`만 반환한다.
- `inline_review_threads`는 게시 가능한 review thread 초안이며 실제 게시 요청, 피드백 대응 방향, 해결 여부 또는 PR 상태의 확정값이 아니다.

## 하지 않는 일

- review thread 게시·답글·resolve, 리뷰 피드백 대응 방향, 해결 여부, 현재 Workflow 상태를 확정하거나 GitHub에 반영하지 않는다.
- 정규화된 리뷰 결과의 중요도나 내용을 사용자 결정 없이 바꾸지 않고, 기존 review thread를 변경하지 않는다.
- 전달된 PR Review Template, PR diff, 기존 review thread 범위를 넘어 새 리뷰 피드백이나 수정 범위를 추가하지 않는다.

## 사용자 결정

- 위치 재지정 또는 비실행 피드백 재분류가 필요한 경우 `questions`에 선택지로만 반환한다. 사용자의 일반 진행 표현을 선택 확정으로 해석하지 않는다.
- 게시 대상, 재분류, 게시 요청, 이후 대응 방향과 해결 여부는 `github-workflow-engine`이 사용자 결정과 전이 규칙으로 처리한다.

## 중단 조건

- PR 번호, 정규화된 PR Review Template 출력, 기존 review thread 또는 필요한 diff position 근거가 없거나 충돌하면 게시 초안을 확정하지 않는다.
- 위치 매핑 실패, 중복 여부 확인 불가, 범위 밖 피드백 요청이 있으면 GitHub 상태를 변경하지 않고 구체적인 사유와 재개에 필요한 `file`·`line` 또는 재분류 입력을 `questions`에 반환한다.

## 후속 전이

- 제어와 기존 출력 구조를 `github-workflow-engine`에 반환한다.
- Workflow Engine이 산출물 판정과 사용자 결정을 거쳐 위치 매핑 재시도, 비실행 피드백 재분류, 또는 review thread 게시의 구조화 실행 요청을 확정한다.

## 판정 기준 참조

게시 위치와 보류 질문 판정은 `review-runtime-contract.md`의 리뷰 게시 위치 판정 규칙을 따른다. `[차단]`과 `[중요]` 피드백은 `file`, `line`, diff position 매핑 성공 근거가 있을 때만 review thread 게시 초안으로 만들고, 근거가 없거나 매핑할 수 없으면 GitHub 상태를 변경하지 않도록 `questions`에 보류 사유를 기록한다.

Workflow Engine이 `review thread 게시 위치 재지정`을 확정하면 새 `file`과 `line`으로 diff position 매핑을 다시 시도한다. `비실행 피드백 재분류`를 확정하면 정규화 결과의 중요도 라벨을 `[사소]`, `[제안]`, `[학습]`, `[칭찬]` 중 하나로 바꾼 뒤 게시 초안을 다시 정리한다. 모든 위치 매핑 보류가 해소되기 전에는 게시 요청을 만들지 않는다.

## 필수 출력

리뷰 코멘트 게시 초안은 다음 필드를 빠짐없이 채운다. 해당 게시 대상이 없으면 빈 배열 또는 `N/A`를 명시한다.

- `pr_number`
- `inline_review_threads`: review thread 게시 대상으로 판정된 피드백의 게시 초안
- `questions`: Workflow Engine이 확인할 보류 질문

기존 marker 요약 피드백 댓글의 호환 확인은 이 스킬의 입력이나 출력에 포함하지 않는다. Workflow Engine이 `리뷰 대응 대상 확인`과 `남은 피드백 확인`에서 GitHub issue comments를 다시 읽고 `legacy_marker_comments`로 산출한다.
