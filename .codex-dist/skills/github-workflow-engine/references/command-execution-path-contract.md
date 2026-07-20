# 명령 실행 경로 계약

이 문서는 확정된 작업을 어떤 권한 경로로 호출할지와 실제 명령 호출 직전의 재판정을 정의한다. 실행 범위와 구조화 요청·결과 상관관계는 `structured-execution-contract.md`를 따른다.

## 명령 실행 경로 규칙

명령 실행 경로는 확정된 작업을 어떤 권한 경로로 호출할지 정하는 판단 항목이며, 일반 경로와 권한 확인 경로 중 하나로 판정한다.

사용자 결정은 현재 작업과 실행 범위를 확정하는 별도 판단 항목이다. 사용자의 상태 변경 의도가 이미 명확한지는 명령 실행 경로 판정 입력으로 사용하지 않는다. 권한 확인 경로 대상 명령은 일반 경로 실패 여부를 관찰하기 전에 권한 확인 경로로 판정한다.

### 권한 확인 경로

- `gh issue create`, `gh issue edit`, `gh pr create`, `gh pr comment`, `gh pr review`, `gh pr merge`, `gh api --method POST|PATCH|PUT|DELETE`처럼 GitHub issue, PR, review, checks, comment 상태를 바꾸는 GitHub API 계열 명령
- `git push`, `git fetch`, `git pull`, `git ls-remote`처럼 네트워크나 원격 저장소 접근이 필요한 Git 명령
- `git switch`, `git checkout`, `git branch`, `git commit`, `git tag`, `git merge`, `git rebase`처럼 `.git` 쓰기 또는 작업 브랜치 변경이 필요한 명령
- `sed -i`, `find -delete`, 쓰기나 삭제를 수행하는 `find -exec`처럼 로컬 파일을 수정하거나 삭제하는 명령

### 일반 경로

- `gh pr view`, `gh issue view`, `gh pr checks`, `gh api` GET 조회처럼 GitHub 실행 상태를 읽는 명령
- `git status`, `git diff`, `git log`, `git show`, `rg`, 출력 또는 파이프 변환용 `sed`, `ls`, 탐색 전용 `find`, `wc`처럼 로컬 파일이나 로컬 Git 상태를 읽는 명령
- `git diff --check`처럼 로컬 변경사항을 검증하는 명령

### 변경 손실 가능 명령

- `rm`, `git reset --hard`, `git clean`, `git branch -D`, 작업 브랜치 삭제, 강제 push처럼 되돌리기 어렵거나 사용자 변경을 잃게 할 수 있는 명령

## 요청 기록과 실행 직전 재판정

- 명령 실행 경로는 현재 작업, 실행 범위, 사용자 결정의 판정 결과를 유지한다.
- 변경 손실 가능 명령은 현재 작업의 실행 범위 안에 있고 사용자 의도가 명확한 상태에서만 실행한다.
- PR merge 반영 작업의 작업 브랜치 정리는 안전 조건을 만족하면 사용자 추가 결정 없이 수행한다.
- 구조화 실행 요청은 생성 시 이 규칙으로 판정한 `command_execution_path`와 권한 조건을 기록한다. 실행 주체는 실제 명령 호출 직전에 같은 규칙으로 `실행 직전 경로 재판정 통과` 여부를 판정한다.
- `실행 직전 경로 재판정 통과`는 기록된 `command_execution_path`와 직전 판정 경로가 일치하고, 필요한 권한 조건과 사용 가능 도구 조건이 확인되며, 변경 손실 가능 명령이면 이 규칙의 추가 조건도 충족한 상태다. 하나라도 확인할 수 없거나 일치하지 않으면 명령 실행 없이 `중단`으로 판정한다.
