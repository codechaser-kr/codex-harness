---
name: review-comment
description: Claude code-review-skill의 PR Review Template 출력을 GitHub PR review thread 또는 marker가 있는 요약 피드백 댓글 게시 초안으로 변환하고 중복 게시 위험을 점검합니다.
---

# Review Comment

이 스킬은 외부 Claude `code-review-skill`이 PR Review Template 형식으로 생성한 리뷰 결과를 GitHub Pull Request review thread 또는 marker가 있는 요약 피드백 댓글 형식으로 정리한다. 게시 승인과 실제 GitHub 게시는 Workflow Engine의 Human Checkpoint와 후속 액션에서 처리한다.

## 먼저 읽을 문서

- `../github-workflow-engine/references/workflow-engine-rules.md`

## 입력

- PR 번호
- Claude `code-review-skill` PR Review Template 출력
- 기존 review thread 목록
- 기존 PR issue comments

## 책임

1. `Required Changes`, `Important Suggestions`, `Minor Suggestions`, `Learning Notes`, `Security Considerations`, `Test Coverage`, `Verdict` 섹션을 읽는다.
2. `[blocking]`, `[important]`, `[nit]`, `[suggestion]`, `[learning]`, `[praise]` severity label을 Workflow Engine 피드백 모델로 매핑한다.
3. `Location:` 또는 코드 위치가 diff line에 붙을 수 있으면 review thread 초안으로 정리한다.
4. 라인에 붙일 수 없는 `[blocking]`과 `[important]`는 marker가 있는 요약 피드백 댓글 체크리스트 초안으로 정리한다.
5. `[nit]`, `[suggestion]`, `[learning]`, `[praise]`는 merge 차단 피드백으로 취급하지 않고, 필요한 경우 요약 참고 섹션으로만 정리한다.
6. 같은 리뷰 결과가 중복 게시되지 않도록 기존 review thread와 요약 피드백 댓글을 확인한다.
7. marker는 반드시 `<!-- codex-harness:summary-feedback v1 -->`를 사용한다.
8. 게시 요청 초안과 중복 게시 위험을 Workflow Skill에 반환한다.

## Severity 매핑

| code-review-skill label | Workflow 피드백 유형 | 기본 대응 후보 |
| --- | --- | --- |
| `[blocking]` | 해결 전 merge 불가 피드백 | `적용` |
| `[important]` | 중요 검토 피드백 | `적용` 또는 `사람 승인 필요` |
| `[nit]` | 선택적 참고 | `보류` |
| `[suggestion]` | 선택적 개선 제안 | `보류` |
| `[learning]` | 교육용 참고 | 상태 추적 제외 |
| `[praise]` | 긍정 피드백 | 상태 추적 제외 |

`Verdict`가 `Request Changes`이면 `[blocking]` 또는 `[important]`가 최소 하나 있어야 한다. 템플릿 결과에 verdict와 피드백 severity가 충돌하면 Workflow Skill에 보류 질문으로 반환한다.

## 요약 피드백 댓글 형식

```markdown
<!-- codex-harness:summary-feedback v1 -->

## 요약 피드백

- [ ] 문제: ...
  - 근거: ...
  - 위험도: ...
  - 추천 분류: ...
  - 확신도: ...
```

## 금지

- 파일 수정
- 피드백 적용 여부 확정
- GitHub 직접 게시
- 승인 없는 review thread resolve
- marker 없는 일반 PR comment를 요약 피드백 상태 원천으로 취급
