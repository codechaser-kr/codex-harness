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
9. 구현 단위가 확정되면 `branch-plan`, 외부 전역 `commit`, `pr-proposal`, `pr-creation`, 리뷰 실행 모드 선택, 리뷰 실행 모드 검사, 리뷰 실행, 리뷰 결과 정규화, `review-comment`를 순서대로 연결한다.
10. 타겟 레포에 GitHub Workflow Engine을 적용하거나 템플릿을 갱신할 때는 `github-templates.md` 계약과 타겟 `.github` 템플릿의 정합성을 먼저 검사한다.
11. 사용자의 PR merge 알림이나 다음 계획 요청이 있으면 GitHub 상태를 다시 읽고 연결 이슈의 체크리스트와 진행 상태를 갱신할 액션을 제안한다.

## GitHub 상태 변경 기준

이슈, PR, 체크리스트, 댓글 같은 GitHub 상태 변경은 사용자의 생성/수정/닫기 의도가 자연어 맥락에서 명확할 때만 수행한다.

- `이대로 진행`, `생성해주세요`, `좋습니다`처럼 현재 초안이나 후보에 대한 진행 의도가 명확하면 상태 변경 액션으로 볼 수 있다.
- 사용자의 의도가 모호하면 상태를 변경하지 않고 초안, 수정 후보, 필요한 확인 질문만 제시한다.
- 사용자-facing 응답에는 `승인 절차`, `절차 누락` 같은 운영 용어를 과하게 드러내지 않는다.

## 명령 실행 경로 선택

이 섹션은 `docs/github-workflow-engine.md`의 명령 실행 경로 규칙을 배포본 `SKILL.md`에 복제한 실행 지침이다. 규칙을 바꿀 때는 원천 설계 문서와 `references/workflow-engine-rules.md`의 같은 섹션을 함께 정렬한다.

Workflow Engine은 명령을 실행하기 전에 일반 경로와 승인 경로 중 어느 쪽이 맞는지 판단한다. 일반 경로는 현재 권한 안에서 바로 실행할 수 있는 읽기, 조회, 로컬 검증 명령을 뜻한다. 승인 경로는 권한 상승, 원격 접근, GitHub 상태 변경, `.git` 쓰기, 파일 수정 또는 삭제 가능성이 있어 실행 전 사용자 의도 확인이 필요한 명령을 뜻한다. 실행 경로 선택은 권한과 실패 가능성을 줄이기 위한 판단이며, Human Checkpoint를 대체하지 않는다. 사용자 결정이 필요한 상태 변경, 커밋 메시지 확정, PR merge 같은 항목은 승인 경로를 쓰더라도 별도로 사용자 의도가 명확해야 한다.

처음부터 승인 경로를 사용하는 명령:

- `gh pr comment`, `gh pr review`, `gh pr merge`, `gh issue edit`, `gh api --method POST|PATCH|PUT|DELETE`처럼 GitHub PR, issue, review, checks, comment 상태를 바꾸는 GitHub API 계열 명령
- `git push`, `git fetch`, `git pull`, `git ls-remote`처럼 네트워크나 원격 저장소 접근이 필요한 Git 명령
- `git commit`, `git tag`, `git merge`, `git rebase`처럼 `.git` 쓰기가 필요한 명령
- `sed -i`, `find -delete`, 쓰기나 삭제를 수행하는 `find -exec`처럼 로컬 파일을 수정하거나 삭제하는 명령

일반 경로를 우선 사용하는 명령:

- `gh pr view`, `gh issue view`, `gh pr checks`, `gh api` GET 조회처럼 GitHub Run State를 읽기만 하는 명령
- `git status`, `git diff`, `git log`, `git show`, `rg`, 출력 또는 파이프 변환용 `sed`, `ls`, 탐색 전용 `find`, `wc`처럼 로컬 파일이나 로컬 Git 상태를 읽는 명령
- `git diff --check`처럼 로컬 변경사항만 검증하는 명령

파괴적 명령은 실행 경로와 별개로 사용자 의도가 명확해야 한다. `rm`, `git reset --hard`, `git clean`, 강제 push처럼 되돌리기 어렵거나 사용자 변경을 잃게 할 수 있는 명령은 승인 경로 사용 여부만으로 실행하지 않는다.

## 타겟 GitHub 템플릿 정합성

GitHub Workflow Engine을 타겟 레포에 적용하거나 운영 기준을 갱신할 때는 `references/github-templates.md`의 "타겟 템플릿 정합성 검사"를 따른다.

- 타겟 `.github/ISSUE_TEMPLATE/*.md`와 `.github/pull_request_template.md`를 읽는다.
- 실제 이슈/PR 본문 형식은 타겟 `.github` 템플릿을 단일 원천으로 본다.
- `github-templates.md` 계약의 title prefix, label, 필수 섹션, PR `Refs #번호` 연결 규칙과 비교한다.
- 결과를 `정합`, `허용된 확장`, `불일치`로 나눈다.
- 불일치가 있으면 차이와 영향 범위, 수정 후보를 사용자에게 제시하고 승인 전까지 템플릿을 수정하지 않는다.

## 외부 의존 스킬 검사

`commit`, `awesome-code-review`, `sendbird/cc-plugin-codex`는 이 저장소에서 관리하지 않는 외부 전역 의존성이다. Workflow Engine은 해당 액션에 들어가기 전에 설치 여부를 확인한다.

- 커밋 메시지 제안 전에 `$CODEX_HOME/skills/commit/SKILL.md` 또는 `$HOME/.codex/skills/commit/SKILL.md`가 있는지 확인한다.
- `codex/awesome-code-review` 리뷰 실행 전에는 `$CODEX_HOME/skills/awesome-code-review/SKILL.md` 또는 `$HOME/.codex/skills/awesome-code-review/SKILL.md`가 있는지 확인한다.
- `claude/code-review` 리뷰 실행 전에는 Claude CLI 인증, `git diff` 결과를 `claude -p`로 전달할 수 있는 Claude CLI 실행 가능 상태, Codex에서 Claude를 호출하기 위한 `sendbird/cc-plugin-codex`의 `$cc:setup` 준비 상태를 확인한다.
- `claude/awesome-code-review` 리뷰 실행 전에는 Claude CLI 인증, Claude 환경의 `awesome-code-review`, Codex에서 Claude를 호출하기 위한 `sendbird/cc-plugin-codex` 사용 가능 여부를 확인한다.
- 의존성이 없으면 설치 가능한 소스, 설치 대상 경로, 설치 후 확인할 파일 또는 명령, 재개 조건을 사용자에게 알리고, 현재 액션을 중단한다.
- 누락 상태에서는 대체 커밋 메시지 생성이나 대체 리뷰 생성을 진행하지 않는다.

`awesome-code-review`가 없으면 이 저장소가 해당 스킬을 배포하거나 관리하지 않는다는 점을 먼저 알린다. 설치는 `https://github.com/codechaser-kr/repo-bootstrap`의 install 절차를 사용한다고 안내한다. 원천 스킬은 `https://github.com/awesome-skills/code-review-skill`이지만, repo-bootstrap install은 기본 내장 리뷰 스킬과의 이름 충돌을 피하기 위해 Codex 전역 설치명과 frontmatter `name`을 `awesome-code-review`로 맞춘다. 설치 후에는 `$CODEX_HOME/skills/awesome-code-review/SKILL.md` 또는 `$HOME/.codex/skills/awesome-code-review/SKILL.md` 중 하나가 존재하고, 해당 파일의 frontmatter `name`이 `awesome-code-review`여야 리뷰 실행을 재개할 수 있다고 안내한다.

설치 기본 리뷰 실행 모드는 타겟 레포의 `.harness/workflow-engine.json`에 `review.defaultMode`로 저장한다. 값은 `claude/code-review`, `claude/awesome-code-review`, `codex/awesome-code-review` 중 하나여야 한다. 이 값은 리뷰 실행 모드 선택 Human Checkpoint에서 기본 후보로만 제시하며, 실제 리뷰 실행 모드 확정을 대체하지 않는다. 사용자가 지원 모드 중 하나를 명시적으로 선택하지 않으면 리뷰 실행 모드 검사로 전이하지 않고 선택 질문을 유지한다.

`sendbird/cc-plugin-codex`는 `$CODEX_HOME/plugins/cache/sendbird/cc/*/.codex-plugin/plugin.json` 또는 `$HOME/.codex/plugins/cache/sendbird/cc/*/.codex-plugin/plugin.json`으로 설치 여부를 확인한다. 같은 플러그인 루트에 `skills/setup/SKILL.md`와 `scripts/claude-companion.mjs`가 있어야 하며, `$cc:setup`으로 플러그인 설치 상태와 Claude Code 호출 준비 상태를 확인한다. `$cc:setup`이 설치 누락, hook trust, Claude Code 사용 불가, 인증 필요 상태를 보고하면 출력된 안내를 사용자에게 전달하고 리뷰 실행으로 넘어가지 않는다.

`claude/*` 리뷰 실행 모드에서는 리뷰 실행 전에 `$cc:setup` 결과의 인증 상태를 확인한다. 인증 완료 판정은 `$cc:setup`의 machine-readable probe에서 `auth.available: true`, `auth.loggedIn: true`이거나 사용자 표시 출력이 authenticated 상태를 보고하는 경우로 제한한다. 인증이 없거나 만료되었거나 판단할 수 없으면 리뷰 실행을 중단하고, `$cc:setup`이 제공하는 Claude login 안내를 그대로 전달한다. 재개 조건은 사용자가 Claude CLI 인증을 완료한 뒤 `$cc:setup`을 다시 실행해 인증 완료 상태가 확인되는 것이다.

`claude/code-review`는 `$cc:review` companion review나 Claude 공식 `/code-review` command 직접 호출이 아니라 `git diff` 결과를 `claude -p`로 전달해 코드 리뷰를 요청한다. `$cc:review` companion review는 `claude/code-review`에 매핑하지 않는다. GitHub comment 게시, review thread 게시, 파일 수정은 Workflow Engine 후속 단계에서만 수행한다.

예상 실행 형태:

```bash
git diff <base-branch>...<head-branch> | claude -p --permission-mode bypassPermissions -- "
제공된 diff를 기준으로 코드 리뷰를 수행해 주세요.

조건:
- GitHub PR에 직접 comment를 게시하지 마세요.
- 파일을 수정하지 마세요.
- 리뷰 결과만 대화 출력으로 반환하세요.
"
```

`claude/code-review`의 Claude stdout findings는 Workflow Engine이 PR Review Template으로 정규화한다. 필수 필드는 PR 전체 `Verdict`, 각 피드백의 severity label, 파일 경로와 diff 위치 또는 요약 피드백 여부, 문제와 영향, 권장 조치, 테스트 커버리지 판단이다. 위치, severity, verdict, 문제 영향, 권장 조치, 테스트 커버리지 판단 중 하나라도 판단할 수 없으면 GitHub comment 또는 review thread를 게시하지 않고 보류 질문으로 중단한다. `$cc:review` 기반 companion review가 필요하면 `claude/code-review`와 다른 별도 리뷰 실행 모드로 분리해야 한다.

`sendbird/cc-plugin-codex`가 없으면 이 저장소가 해당 플러그인을 배포하거나 관리하지 않는다는 점을 먼저 알린다. 설치 관리는 `https://github.com/codechaser-kr/repo-bootstrap`의 install 절차에서 담당한다고 안내한다. `claude/*` 리뷰 실행 모드의 의존성이 누락되면 다른 리뷰 실행 모드로 자동 fallback하지 않고, 사용자가 의존성을 설치하거나 리뷰 실행 모드를 다시 선택해야 재개할 수 있다.

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
3. Codex가 세부 구현 계획과 의미적 커밋 단위 목록을 제안하고, Workflow Engine이 이를 Human Checkpoint로 확정한다. 각 커밋 단위는 범위, 검증 기준, 커밋 메시지 승인 지점, 다음 단위 진행 조건을 포함해야 한다.
4. 현재 커밋 단위 하나의 승인된 범위만 파일에 수정한다.
5. 외부 전역 `commit` 스킬 설치를 확인한 뒤 커밋 메시지 후보를 제안하고, Workflow Engine이 변경 내용과 커밋 메시지에 대한 사용자 의도를 함께 확인한다.
6. 확정된 변경만 커밋한다.
7. 남은 커밋 단위가 있으면 4번부터 반복하고, 없으면 `pr-proposal`로 PR 제목과 본문 초안을 제안한다.
8. Workflow Engine이 PR 제목과 본문을 Human Checkpoint로 확정하고, 확정된 브랜치를 push한 뒤 `pr-creation`으로 PR 생성 입력을 검증한다.
9. Workflow Engine이 검증된 입력으로 실제 GitHub PR을 생성한다.
10. Workflow Engine이 타겟 레포의 `.harness/workflow-engine.json`에서 `review.defaultMode`를 읽고, 사용 가능한 모드, 각 모드의 의존성과 함께 제시한 뒤 사용자가 지원 모드 중 하나를 명시 선택할 때만 PR 리뷰에 사용할 리뷰 실행 모드로 확정한다.
11. Workflow Engine이 선택된 리뷰 실행 모드의 실행 환경과 의존성 설치 여부를 확인한다.
12. 선택된 리뷰 실행 모드로 PR diff와 이슈 맥락, 출력 템플릿 요구사항을 준비해 리뷰 결과를 생성한다. `claude/code-review`는 `$cc:review`가 아니라 base/head 브랜치의 `git diff` 결과를 `claude -p`로 전달해 코드 리뷰를 요청한다.
13. 리뷰 실행 결과가 PR Review Template 형식이 아니면 Workflow Engine이 `Required Changes`, `Important Suggestions`, `Minor Suggestions`, `Learning Notes`, `Security Considerations`, `Test Coverage`, `Verdict`와 severity label을 갖춘 PR Review Template으로 정규화한다. 위치, severity, verdict, 문제 영향, 권장 조치, 테스트 커버리지 판단 중 하나라도 판단할 수 없어 정규화가 불완전하면 리뷰 코멘트 게시로 넘어가지 않고 보류 질문을 제시한다.
14. `review-comment`로 PR Review Template 출력 결과를 review thread 또는 marker가 있는 요약 피드백 댓글 게시 초안으로 정리한다.
15. Workflow Engine이 게시 초안을 확인한 뒤 실제 GitHub 리뷰 코멘트를 게시한다.
16. Workflow Engine이 unresolved thread와 미체크 요약 피드백을 확인해 리뷰 대응 대상 여부를 판단한다.
17. 미해결 피드백이 있으면 가장 우선순위가 높은 피드백 1건만 가져와 원문, 맥락, 위험도, severity, 권장 대응을 설명하고 `수용`, `거절`, `기타` 중 하나로 사용자 의도를 확인한다. 여러 피드백을 조회하거나 맥락으로 확보했더라도 현재 처리 대상은 이 단계에서 선택해 사용자에게 제시한 피드백 1건뿐이다. 사용자가 세 가지 대응 방향 중 하나를 명시하지 않으면 선택된 피드백 1건도 파일 수정이나 댓글 처리로 넘어가지 않는다.
18. `수용` 피드백은 선택된 피드백 1건에 한정해 승인된 PR 범위 안에서 수정한다. 선택되지 않은 피드백은 읽기 전용 맥락이며, 같은 수정 작업이나 같은 커밋에 함께 포함하지 않는다.
19. 피드백 수정 변경이 있으면 전역 `commit` 스킬로 커밋 메시지를 제안하고, 확정된 변경만 커밋한다.
20. 피드백 수정 커밋을 원격 head branch에 push한다.
21. 현재 Workflow Engine 실행이 `review-comment`로 게시한 피드백을 수정한 경우에만 해당 review thread 또는 요약 피드백 항목에 `commit-hash 수정했습니다.` 형식으로 댓글을 남긴다. 판단 기준은 작성자 계정, bot 이름, 리뷰 문체가 아니라 현재 리뷰 코멘트 게시 액션의 게시 결과 또는 같은 실행 로그에 남은 추적 근거다. 현재 실행이 게시한 피드백인지 확정할 수 없으면 자동 수정 댓글을 남기지 않는다. 외부 리뷰 도구, 사람이 남긴 피드백, 이전 실행에서 생성된 피드백에는 일반 피드백 처리 요청만으로 답글을 추가하지 않고, 별도 답글 요청이 있을 때만 외부 피드백 형식에 맞춘다.
22. 피드백 수정 push와 필요한 수정 댓글 처리가 끝나면 해당 피드백을 resolve 또는 체크할지 사용자 의도를 확인한다. 사용자 결정 전에는 review thread를 resolve하거나 요약 피드백을 체크하지 않는다.
23. 사용자가 resolve 또는 체크를 선택한 경우 라인 피드백은 resolve하고 요약 피드백은 체크한다. 사용자가 미해결 유지를 선택하면 GitHub 상태를 변경하지 않는다.
24. GitHub Run State를 다시 읽어 남은 unresolved thread 또는 미체크 요약 피드백이 있으면 17번부터 반복한다. 재조회 전에는 남은 피드백을 이어서 수정하지 않는다.
25. 16번 또는 24번 확인 결과 리뷰 대응 대상이 없으면 `리뷰 대응 대상 없음`을 명시하고 PR merge 대기로 이동한다.
26. 사람이 PR을 merge하면 GitHub Run State를 다시 읽고 연결 이슈의 PR merged 전이를 적용한다.

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
