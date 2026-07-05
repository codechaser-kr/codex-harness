---
name: github-workflow-engine
description: GitHub Issue, PR, label, checklist, review thread, comment를 기준으로 현재 작업 상태를 읽고 다음 Workflow 액션을 제안합니다. 다음 계획, 워크플로우 재개, PR merge 반영, GitHub Run State, 기능 구현 흐름 요청에서 사용합니다.
---

# GitHub Workflow Engine

이 스킬은 GitHub Run State를 기준으로 현재 작업 위치를 판단하고 다음 액션을 제안한다. 별도 Run State Runtime을 만들지 않는다. 기준 상태는 GitHub의 열린 이슈, PR, 라벨, 체크리스트, 댓글, review thread, PR 본문이다.

## 먼저 읽을 문서

- `references/workflow-engine-rules.md`
- `references/github-templates.md`

필요한 경우 대상 저장소의 `.harness/logs/github-workflow-log.md`를 읽되, 이 로그는 보조 체크포인트일 뿐 상태 원천이 아니다.

## 책임

1. 사용자의 요청이 새 요청인지, 중단된 흐름 재개인지, 특정 이슈/PR 기준 진행인지 구분한다.
2. GitHub Run State에서 진행 중이거나 멈춰 있는 열린 이슈 또는 PR을 먼저 찾는다.
3. 이어갈 수 있는 열린 작업이 있으면 신규 후보보다 재개를 우선한다.
4. 선택된 이슈 유형에 맞는 State Transition Rule을 적용해 다음 액션 후보를 제안한다.
5. Human Checkpoint가 있으면 사용자 결정 없이 다음 액션을 확정하지 않는다.
6. 액션 진입, 중단, 재개는 `.harness/logs/github-workflow-log.md`에 기록한다.
7. 이슈 생성이 필요하면 `issue-creation` 스킬로 타겟 `.github` 템플릿 형식의 초안을 만들고, Workflow Engine이 사용자 의도 확인 이후 실제 GitHub 이슈를 생성한다.
8. 기능 개발 계획은 `feature-plan`, 기능 결함 해결 계획은 `fix-plan` 스킬로 넘긴다.
9. 구현 단위가 확정되면 `branch-plan`, 외부 전역 `commit`, `pr-proposal`, `pr-creation`, 외부 `awesome-code-review`, `review-comment`를 순서대로 연결한다.
10. 타겟 레포에 GitHub Workflow Engine을 적용하거나 템플릿을 갱신할 때는 `github-templates.md` 계약과 타겟 `.github` 템플릿의 정합성을 먼저 검사한다.
11. 사용자의 PR merge 알림이나 다음 계획 요청이 있으면 GitHub 상태를 다시 읽고 연결 이슈의 체크리스트와 진행 상태를 갱신할 액션을 제안한다.

## GitHub 상태 변경 기준

이슈, PR, 체크리스트, 댓글 같은 GitHub 상태 변경은 사용자의 생성/수정/닫기 의도가 자연어 맥락에서 명확할 때만 수행한다.

- `이대로 진행`, `생성해주세요`, `좋습니다`처럼 현재 초안이나 후보에 대한 진행 의도가 명확하면 상태 변경 액션으로 볼 수 있다.
- 사용자의 의도가 모호하면 상태를 변경하지 않고 초안, 수정 후보, 필요한 확인 질문만 제시한다.
- 사용자-facing 응답에는 `승인 절차`, `절차 누락` 같은 운영 용어를 과하게 드러내지 않는다.

## 타겟 GitHub 템플릿 정합성

GitHub Workflow Engine을 타겟 레포에 적용하거나 운영 기준을 갱신할 때는 `references/github-templates.md`의 "타겟 템플릿 정합성 검사"를 따른다.

- 타겟 `.github/ISSUE_TEMPLATE/*.md`와 `.github/pull_request_template.md`를 읽는다.
- 실제 이슈/PR 본문 형식은 타겟 `.github` 템플릿을 단일 원천으로 본다.
- `github-templates.md` 계약의 title prefix, label, 필수 섹션, PR `Refs #번호` 연결 규칙과 비교한다.
- 결과를 `정합`, `허용된 확장`, `불일치`로 나눈다.
- 불일치가 있으면 차이와 영향 범위, 수정 후보를 사용자에게 제시하고 승인 전까지 템플릿을 수정하지 않는다.

## 외부 의존 스킬 검사

`commit`과 `awesome-code-review`는 이 저장소에서 관리하지 않는 외부 전역 스킬이다. Workflow Engine은 해당 액션에 들어가기 전에 설치 여부를 확인한다.

- 커밋 메시지 제안 전에 `$CODEX_HOME/skills/commit/SKILL.md` 또는 `$HOME/.codex/skills/commit/SKILL.md`가 있는지 확인한다.
- 리뷰 실행 전에 `$CODEX_HOME/skills/awesome-code-review/SKILL.md` 또는 `$HOME/.codex/skills/awesome-code-review/SKILL.md`가 있는지 확인한다.
- 의존 스킬이 없으면 설치 가능한 소스, 설치 대상 경로, 설치 후 확인할 파일, 재개 조건을 사용자에게 알리고, 현재 액션을 중단한다.
- 누락 상태에서는 대체 커밋 메시지 생성이나 대체 리뷰 생성을 진행하지 않는다.

`awesome-code-review`가 없으면 이 저장소가 해당 스킬을 배포하거나 관리하지 않는다는 점을 먼저 알린다. 설치는 `https://github.com/codechaser-kr/repo-bootstrap`의 install 절차를 사용한다고 안내한다. 원천 스킬은 `https://github.com/awesome-skills/code-review-skill`이지만, repo-bootstrap install은 기본 내장 리뷰 스킬과의 이름 충돌을 피하기 위해 Codex 전역 설치명과 frontmatter `name`을 `awesome-code-review`로 맞춘다. 설치 후에는 `$CODEX_HOME/skills/awesome-code-review/SKILL.md` 또는 `$HOME/.codex/skills/awesome-code-review/SKILL.md` 중 하나가 존재하고, 해당 파일의 frontmatter `name`이 `awesome-code-review`여야 리뷰 실행을 재개할 수 있다고 안내한다.

전역 `commit` 스킬이 없으면 `$CODEX_HOME/skills/commit/SKILL.md` 또는 `$HOME/.codex/skills/commit/SKILL.md`에 `commit` 스킬을 설치해야 한다고 안내한다.

## GitHub Run State 읽기

- Issue title, label, body, checklist, state를 읽어 이슈 유형과 완료 기준을 확인한다.
- PR body의 `연관 이슈` 섹션에서 `Refs #번호` 형식을 파싱해 연결 이슈를 판단한다.
- `Closes #번호`, `Fixes #번호`, `Resolves #번호`는 Workflow Engine 관리 이슈에 사용하지 않는다.
- GitHub sidebar linked issue는 표준 상태 원천으로 보지 않는다.
- 기능변경/기능결함 계획과 완료 기준 갱신처럼 후속 전이 판단에 쓰이는 상태는 이슈 본문을 기준으로 읽는다.
- Review thread는 unresolved 상태를 우선 읽고, 라인에 붙일 수 없는 피드백은 `<!-- codex-harness:summary-feedback v1 -->` marker가 있는 PR issue comment의 미체크 항목만 읽는다.

## 다음 계획 요청

사용자가 "다음 계획"을 요청하면 다음 순서로 판단한다.

1. 열린 PR 중 미해결 review thread, 미체크 요약 피드백, merge 대기 상태가 있는지 확인한다.
2. 열린 `기능변경` 또는 `기능결함` 이슈 중 승인된 계획이나 남은 완료 기준이 있는지 확인한다.
3. 열린 `정책검토` 이슈 중 설계 반영, 후속 이슈 생성, 종료 조건이 남았는지 확인한다.
4. 열린 `기능제안` 이슈 중 판단 결과가 비어 있는 항목이 있는지 확인한다.
5. 이어갈 작업이 없을 때만 새 기능제안 후보 생성을 검토한다.

진행 중인 작업이 있으면 병렬 신규 계획을 만들지 않고, 현재 작업의 재개 또는 보류 여부를 사용자에게 확인한다.

## 기능 구현 흐름

기능 구현 흐름은 정책검토, 기능변경, 기능결함에서 실제 파일 변경과 PR 생성이 필요한 구현 단위에 공통 적용한다.

순서는 다음을 따른다.

1. `branch-plan`으로 작업 브랜치 이름 후보를 제안한다.
2. Workflow Engine이 브랜치 이름을 Human Checkpoint로 확정하고, 확정된 브랜치로 전환한다.
3. Codex가 세부 구현 계획과 커밋 단위 분할 계획을 제안하고, Workflow Engine이 이를 Human Checkpoint로 확정한다.
4. 커밋 단위별로 파일을 수정한다.
5. 외부 전역 `commit` 스킬 설치를 확인한 뒤 커밋 메시지 후보를 제안하고, Workflow Engine이 변경 내용과 커밋 메시지에 대한 사용자 의도를 함께 확인한다.
6. 확정된 변경만 커밋한다.
7. 모든 커밋 단위가 끝나면 `pr-proposal`로 PR 제목과 본문 초안을 제안한다.
8. Workflow Engine이 PR 제목과 본문을 Human Checkpoint로 확정하고, 확정된 브랜치를 push한 뒤 `pr-creation`으로 PR 생성 입력을 검증한다.
9. Workflow Engine이 검증된 입력으로 실제 GitHub PR을 생성한다.
10. Workflow Engine이 외부 `awesome-code-review` 설치를 확인하고 PR diff와 이슈 맥락, 출력 템플릿 요구사항을 준비해 PR Review Template 형식의 리뷰 결과를 생성한다.
11. `review-comment`로 PR Review Template 출력 결과를 review thread 또는 marker가 있는 요약 피드백 댓글 게시 초안으로 정리한다.
12. Workflow Engine이 게시 초안을 확인한 뒤 실제 GitHub 리뷰 코멘트를 게시한다.
13. 미해결 피드백이 있으면 가장 우선순위가 높은 피드백 1건만 가져와 원문, 맥락, 위험도, 권장 대응을 설명하고 적용, 보류, 거절, 사람 승인 필요 중 하나로 사용자 의도를 확인한다. 사용자가 네 가지 대응 방향 중 하나를 명시하지 않으면 파일 수정이나 댓글 처리로 넘어가지 않는다.
14. `적용` 피드백은 선택된 피드백 1건에 한정해 승인된 PR 범위 안에서 수정한다.
15. 피드백 수정 변경이 있으면 전역 `commit` 스킬로 커밋 메시지를 제안하고, 확정된 변경만 커밋한다.
16. 피드백 수정 커밋을 원격 head branch에 push한다.
17. Workflow Engine이 `review-comment`로 게시한 피드백을 수정한 경우에만 해당 review thread 또는 요약 피드백 항목에 `commit-hash 수정했습니다.` 형식으로 댓글을 남긴다. 외부 리뷰 도구나 사람이 남긴 피드백에는 일반 피드백 처리 요청만으로 답글을 추가하지 않고, 별도 답글 요청이 있을 때만 외부 피드백 형식에 맞춘다.
18. Workflow Engine 생성 피드백은 수정 댓글 후 라인 피드백을 resolve하고 요약 피드백을 체크한다. 외부 피드백은 수정 push 완료를 Workflow Engine의 처리 완료 조건으로 보고, 외부 review thread는 resolve하지 않는다. 보류/거절은 근거 반영, 사람 승인 필요는 추가 승인 완료 후 처리 완료로 본다.
19. GitHub Run State를 다시 읽어 남은 unresolved thread 또는 미체크 요약 피드백이 있으면 13번부터 반복한다.
20. 사람이 PR을 merge하면 GitHub Run State를 다시 읽고 연결 이슈의 PR merged 전이를 적용한다.

## 로그

액션에 들어갈 때마다 대상 저장소의 `.harness/logs/github-workflow-log.md`에 다음 항목을 남긴다.

- 대상 이슈 또는 PR
- 워크플로우 유형
- 진입한 액션 이름
- 적용한 조건
- 선택한 작업 내용
- Human Checkpoint 필요 여부
- 참조한 GitHub Run State
- GitHub 상태에 반영된 승인 계획 요약 또는 보조 체크포인트
- 남은 판단 질문 또는 다음 확인 항목

중단 시에는 중단된 액션, 중단 사유, 마지막으로 확인한 GitHub Run State, 남은 판단 질문, 선택 가능한 액션, 추천 액션과 근거, 재개 시 먼저 확인할 항목을 기록한다.
