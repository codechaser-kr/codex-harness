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
2. `workflow-engine-rules.md`의 리뷰 게시 위치 판정 결과에 따라 피드백의 게시 방식을 분류한다.
3. 위치 매핑이 필요한 피드백은 PR diff에서 해당 파일과 line의 diff position 매핑을 시도하고, 매핑 결과를 기록한다.
4. review thread 게시 대상으로 판정된 피드백은 review thread 초안으로 정리한다.
5. marker 요약 피드백 대상으로 판정된 피드백은 marker가 있는 요약 피드백 댓글 체크리스트 초안으로 정리한다.
6. 보류 질문 대상으로 판정된 피드백은 `questions`로 정리한다.
7. 기존 review thread와 요약 피드백 댓글을 확인해 같은 리뷰 결과의 중복 게시 위험을 산출한다.
8. marker는 반드시 `<!-- codex-harness:summary-feedback v1 -->`를 사용한다.
9. 게시 요청 초안을 `inline_review_threads`와 `summary_feedback_comment`로 분리하고 중복 게시 위험을 Workflow Engine에 반환한다.

## 판정 기준 참조

게시 위치, marker fallback, 보류 질문 판정은 `workflow-engine-rules.md`의 리뷰 게시 위치 판정 규칙을 따른다.

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

- `inline_review_threads`: review thread 게시 대상으로 판정된 피드백의 게시 초안
- `summary_feedback_comment`: marker 요약 피드백 대상으로 판정된 피드백의 체크리스트 댓글 초안
- `duplicate_risk`: 기존 review thread 또는 marker 댓글과의 중복 게시 위험
- `questions`: Workflow Engine이 확인할 보류 질문

## Workflow Engine이 확정할 항목

- review thread 우선 게시
- review thread 게시 실패 시 marker 요약 피드백 댓글 게시
- 게시 후 피드백 상태 추적
- 피드백 대응 방향
- 피드백 해결 여부 결정
