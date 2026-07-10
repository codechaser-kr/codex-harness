---
name: review-comment
description: PR Review Template 출력을 GitHub PR review thread 또는 marker가 있는 요약 피드백 댓글 게시 초안으로 변환하고 중복 게시 위험을 점검합니다.
---

# Review Comment

이 스킬은 리뷰 생성 도구와 무관하게 PR Review Template 형식의 리뷰 결과를 GitHub Pull Request review thread 또는 marker가 있는 요약 피드백 댓글 게시 초안으로 정리한다. 실제 GitHub 게시는 Workflow Engine의 후속 작업에서 처리하며, 게시된 피드백의 대응 방향과 해결 여부는 Workflow Engine의 사용자 결정에서 처리한다.

## 먼저 읽을 문서

- `../github-workflow-engine/references/workflow-engine-rules.md`

## 입력

- PR 번호
- PR Review Template 출력
- 기존 review thread 목록
- 기존 PR issue comments

## 책임

1. PR Review Template의 리뷰 결론, 중요도 라벨, 테스트 커버리지 판단을 읽는다.
2. `[차단]`, `[중요]`, `[사소]`, `[제안]`, `[학습]`, `[칭찬]` 중요도 라벨을 추출해 피드백 영향 수준과 추적 대상 여부를 정리한다.
3. `Location:` 또는 코드 위치가 있으면 PR diff에서 해당 파일과 line의 diff position 매핑을 먼저 시도한다.
4. diff position으로 매핑된 `[차단]`과 `[중요]` 피드백은 review thread 초안으로 정리한다.
5. diff position으로 매핑할 수 없는 `[차단]`과 `[중요]` 피드백은 marker가 있는 요약 피드백 댓글 체크리스트 초안으로 정리한다.
6. `[사소]`, `[제안]`, `[학습]`, `[칭찬]`은 필요한 경우 요약 참고 섹션으로 정리한다.
7. 기존 review thread와 요약 피드백 댓글을 확인해 같은 리뷰 결과의 중복 게시 위험을 산출한다.
8. marker는 반드시 `<!-- codex-harness:summary-feedback v1 -->`를 사용한다.
9. 게시 요청 초안을 `inline_review_threads`와 `summary_feedback_comment`로 분리하고 중복 게시 위험을 Workflow Engine에 반환한다.

## 피드백 판단 항목

`review-comment`는 PR Review Template의 피드백을 게시 가능한 구조로 바꾼다. 다음 판단 항목은 서로 분리한다.

| 판단 항목 | 값 또는 예시 | 이 스킬의 책임 |
| --- | --- | --- |
| 리뷰 결론 | `승인`, `의견`, `변경 요청` | PR 전체 결론을 읽고 중요도와 충돌하는지 확인한다. |
| 중요도 | `[차단]`, `[중요]`, `[사소]`, `[제안]`, `[학습]`, `[칭찬]` | 피드백 영향 수준과 게시 방식을 정리한다. |
| 대응 방향 | `수용`, `거절`, `기타 의견 입력` | Workflow Engine의 사용자 결정으로 넘긴다. |
| 해결 여부 결정 | `해결`, `미해결` | 처리 결과 댓글 뒤 Workflow Engine의 사용자 결정으로 넘긴다. |

## 중요도 처리

| 중요도 라벨 | 영향 수준 | 게시 처리 |
| --- | --- | --- |
| `[차단]` | 높음 | 파일 경로와 line을 PR diff position으로 매핑해 review thread, 매핑할 수 없으면 marker 요약 피드백 후보 |
| `[중요]` | 중간 | 파일 경로와 line을 PR diff position으로 매핑해 review thread, 매핑할 수 없으면 marker 요약 피드백 후보 |
| `[사소]` | 낮음 | 필요한 경우 요약 참고 섹션 후보 |
| `[제안]` | 낮음 | 필요한 경우 요약 참고 섹션 후보 |
| `[학습]` | 해당 없음 | 상태 추적 제외 |
| `[칭찬]` | 해당 없음 | 상태 추적 제외 |

중요도는 피드백의 영향 수준과 게시 방식을 판단하는 입력이다. `수용`, `거절`, `기타 의견 입력` 중 어떤 대응을 할지는 Workflow Engine 사용자 결정에서 다룬다.

리뷰 결론이 `변경 요청`이면 `[차단]` 또는 `[중요]`가 최소 하나 있어야 한다. 템플릿 결과에 리뷰 결론과 피드백 중요도가 충돌하면 Workflow Engine에 보류 질문으로 반환한다.

## 요약 피드백 댓글 형식

```markdown
<!-- codex-harness:summary-feedback v1 -->

## 요약 피드백

- [ ] 문제: ...
  - 근거: ...
  - 위험도: ...
  - 중요도: ...
```

## 출력

- `inline_review_threads`: PR diff position으로 매핑된 `[차단]` 또는 `[중요]` 피드백의 review thread 게시 초안
- `summary_feedback_comment`: PR diff position으로 매핑할 수 없는 `[차단]` 또는 `[중요]` 피드백의 marker 체크리스트 댓글 초안
- `duplicate_risk`: 기존 review thread 또는 marker 댓글과의 중복 게시 위험
- `questions`: 위치 판단, 중요도, 리뷰 결론이 충돌할 때 Workflow Engine이 확인할 보류 질문

## Workflow Engine이 확정할 항목

- review thread 우선 게시
- review thread 게시 실패 시 marker 요약 피드백 댓글 게시
- 게시 후 피드백 상태 추적
- 피드백 대응 방향
- 피드백 해결 여부 결정
