---
name: pr-creation
description: PR 제목과 본문, base branch, 원격 head branch를 기준으로 GitHub Pull Request 생성 입력을 검증하고 생성 요청 초안을 제안합니다.
---

# PR Creation

이 스킬은 PR 제목과 본문, base branch, 원격 head branch를 기준으로 GitHub Pull Request 생성 입력을 검증하고 생성 요청 초안을 제안한다. 실제 GitHub PR 생성은 Workflow Engine의 후속 작업에서 처리한다.

## 먼저 읽을 문서

- `../github-workflow-engine/references/artifact-output-contract.md`에서 `PR 제목 판정 규칙`과 ``PR 생성(`pr-creation`) 출력 판정 규칙`` 섹션만 읽는다.
- `../github-workflow-engine/references/github-templates.md`

## 입력

- PR 제목
- PR 본문
- base branch
- 원격 head branch
- 기준 이슈와 연관 이슈

## 책임

1. 원격 head branch가 존재하는지 확인한다.
2. 제목과 본문이 Workflow Engine에서 전달한 입력과 같은지 확인한다.
3. PR 제목이 `artifact-output-contract.md`의 PR 제목 판정 규칙을 벗어나는지 확인하고, 벗어나면 생성 전 보류 질문에 근거를 포함한다.
4. PR 본문의 `연관 이슈` 섹션에 `Refs #번호`가 있는지 확인한다.
5. 제목, 본문, base branch, head branch와 생성 전 확인해야 할 보류 질문을 반환한다.
6. 실제 GitHub PR 생성은 Workflow Engine이 확정한 구조화 실행 요청을 선택된 실행 주체가 수행한다.

## 출력

- 기존 `필수 출력`의 `title`, `body`, `base_branch`, `head_branch`, `blocking_questions`만 반환한다.
- 반환값은 검증된 PR 생성 요청 초안이며 실제 GitHub PR 생성 요청이나 현재 PR 상태의 확정값이 아니다.

## 하지 않는 일

- PR 생성 여부, 제목·본문·브랜치 값, 사용자 결정, 현재 Workflow 상태를 최종 확정하지 않는다.
- PR을 생성·갱신하거나 브랜치·파일·이슈·댓글 등 GitHub와 작업트리 상태를 변경하지 않는다.
- 전달된 PR 입력과 연관 이슈의 범위를 넘어 제목·본문 또는 대상 브랜치를 재구성하지 않는다.

## 사용자 결정

- 검증 결과와 `blocking_questions`를 사용자 결정으로 해석하지 않는다. PR 생성 요청값의 확정과 실행 요청 구성은 `github-workflow-engine`이 처리한다.

## 중단 조건

- 원격 head branch, 제목, 본문, base branch, 연관 이슈가 없거나 서로 충돌하면 생성 요청을 확정하지 않는다.
- 제목·본문 계약 위반, 원격 head branch 부재, 범위 밖 변경 필요 상황이면 구체적인 사유와 재개에 필요한 입력을 `blocking_questions`에 반환한다.

## 후속 전이

- 제어와 기존 출력 구조를 `github-workflow-engine`에 반환한다.
- Workflow Engine이 산출물 판정과 사용자 결정을 거쳐 실제 PR 생성의 구조화 실행 요청 또는 중단을 확정한다.

## 필수 출력

PR 생성 요청 초안은 다음 필드를 빠짐없이 채운다. 필수 필드를 채울 수 없으면 생성 요청을 확정하지 말고 `blocking_questions`에 보류 질문을 기록한다.

- `title`
- `body`
- `base_branch`
- `head_branch`
- `blocking_questions`
