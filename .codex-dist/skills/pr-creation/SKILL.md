---
name: pr-creation
description: PR 제목과 본문, base branch, 원격 head branch를 기준으로 GitHub Pull Request 생성 입력을 검증하고 생성 요청 초안을 제안합니다.
---

# PR Creation

이 스킬은 PR 제목과 본문, base branch, 원격 head branch를 기준으로 GitHub Pull Request 생성 입력을 검증하고 생성 요청 초안을 제안한다. 실제 GitHub PR 생성은 Workflow Engine의 후속 작업에서 처리한다.

## 먼저 읽을 문서

- `../github-workflow-engine/references/workflow-engine-rules.md`
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
3. PR 본문의 `연관 이슈` 섹션에 `Refs #번호`가 있는지 확인한다.
4. PR 생성 요청 초안과 생성 전 확인해야 할 보류 질문을 반환한다.
5. 실제 GitHub PR 생성은 Workflow Engine이 수행한다.

## Workflow Engine이 확정할 항목

- 실제 PR 생성
- 생성된 PR 번호와 URL
