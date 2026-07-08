---
name: review-comment
description: PR Review Template 출력을 GitHub PR review thread 또는 marker가 있는 요약 피드백 댓글 게시 초안으로 변환하고 중복 게시 위험을 점검합니다.
---

# Review Comment

이 스킬은 리뷰 생성 도구와 무관하게 PR Review Template 형식으로 생성된 리뷰 결과를 GitHub Pull Request review thread 또는 marker가 있는 요약 피드백 댓글 형식으로 정리한다. 실제 GitHub 게시는 Workflow Engine의 후속 액션에서 처리하며, 게시된 피드백의 수용/거절/기타 대응 확정은 Workflow Engine의 Human Checkpoint에서 처리한다.

## 먼저 읽을 문서

- `../github-workflow-engine/references/workflow-engine-rules.md`

## 입력

- PR 번호
- PR Review Template 출력
- 기존 review thread 목록
- 기존 PR issue comments

## 책임

1. `Required Changes`, `Important Suggestions`, `Minor Suggestions`, `Learning Notes`, `Security Considerations`, `Test Coverage`, `Verdict` 섹션을 읽는다.
2. `[blocking]`, `[important]`, `[nit]`, `[suggestion]`, `[learning]`, `[praise]` severity label을 추출해 피드백 중요도와 추적 대상 여부를 정리한다.
3. `Location:` 또는 코드 위치가 있으면 PR diff에서 해당 파일과 line의 diff position 매핑을 먼저 시도한다.
4. diff position으로 매핑된 `[blocking]`과 `[important]` 피드백은 review thread 초안으로 정리한다.
5. diff position으로 매핑할 수 없는 `[blocking]`과 `[important]`만 marker가 있는 요약 피드백 댓글 체크리스트 초안으로 정리한다.
6. `[nit]`, `[suggestion]`, `[learning]`, `[praise]`는 merge 차단 피드백으로 취급하지 않고, 필요한 경우 요약 참고 섹션으로만 정리한다.
7. 같은 리뷰 결과가 중복 게시되지 않도록 기존 review thread와 요약 피드백 댓글을 확인한다.
8. marker는 반드시 `<!-- codex-harness:summary-feedback v1 -->`를 사용한다.
9. 게시 요청 초안을 `inline_review_threads`와 `summary_feedback_comment`로 분리하고 중복 게시 위험을 Workflow Skill에 반환한다.

## 피드백 판단 축

`review-comment`는 PR Review Template의 피드백을 게시 가능한 구조로 바꿀 뿐, 대응 방향을 확정하지 않는다. 다음 판단 축은 서로 분리한다.

| 판단 축 | 값 또는 예시 | 이 스킬의 책임 |
| --- | --- | --- |
| `Verdict` | `Approve`, `Comment`, `Request Changes` | PR 전체 결론을 읽고 severity와 충돌하는지 확인한다. |
| `Severity` | `[blocking]`, `[important]`, `[nit]`, `[suggestion]`, `[learning]`, `[praise]` | 피드백 중요도와 게시 방식을 정리한다. |
| `Workflow response` | `수용`, `거절`, `기타` | 확정하지 않는다. Workflow Engine Human Checkpoint로 넘긴다. |
| `Resolution decision` | resolve, 체크, 미해결 유지 | 확정하지 않는다. 수정 push와 필요한 댓글 처리 뒤 Workflow Engine이 별도로 확인한다. |

## Severity 처리

| PR Review Template label | 위험도 | 게시 처리 |
| --- | --- | --- |
| `[blocking]` | 높음 | 파일 경로와 line을 PR diff position으로 매핑해 review thread, 매핑할 수 없으면 marker 요약 피드백 후보 |
| `[important]` | 중간 | 파일 경로와 line을 PR diff position으로 매핑해 review thread, 매핑할 수 없으면 marker 요약 피드백 후보 |
| `[nit]` | 낮음 | merge 차단 피드백으로 추적하지 않고 필요한 경우 요약 참고 섹션 후보 |
| `[suggestion]` | 낮음 | merge 차단 피드백으로 추적하지 않고 필요한 경우 요약 참고 섹션 후보 |
| `[learning]` | 해당 없음 | 상태 추적 제외 |
| `[praise]` | 해당 없음 | 상태 추적 제외 |

`Severity`는 피드백의 중요도와 게시 방식을 판단하는 입력이다. `수용`, `거절`, `기타` 중 어떤 대응을 할지는 이 스킬이 정하지 않는다.

`Verdict`가 `Request Changes`이면 `[blocking]` 또는 `[important]`가 최소 하나 있어야 한다. 템플릿 결과에 verdict와 피드백 severity가 충돌하면 Workflow Skill에 보류 질문으로 반환한다.

## 요약 피드백 댓글 형식

```markdown
<!-- codex-harness:summary-feedback v1 -->

## 요약 피드백

- [ ] 문제: ...
  - 근거: ...
  - 위험도: ...
  - severity: ...
```

## 출력

- `inline_review_threads`: PR diff position으로 매핑된 `[blocking]` 또는 `[important]` 피드백의 review thread 게시 초안
- `summary_feedback_comment`: PR diff position으로 매핑할 수 없는 `[blocking]` 또는 `[important]` 피드백의 marker 체크리스트 댓글 초안
- `duplicate_risk`: 기존 review thread 또는 marker 댓글과의 중복 게시 위험
- `questions`: 위치 판단, severity, verdict가 충돌할 때 Workflow Skill이 확인할 보류 질문

## 금지

- 파일 수정
- 피드백 대응 방향 확정
- GitHub 직접 게시
- 리뷰 결과를 일반 PR review body로만 게시
- 승인 없는 review thread resolve
- marker 없는 일반 PR comment를 요약 피드백 상태 원천으로 취급
