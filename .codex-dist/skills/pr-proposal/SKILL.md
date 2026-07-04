---
name: pr-proposal
description: Workflow Engine 기능 구현 흐름에서 기준 이슈, 변경 요약, 검증 결과를 읽어 PR 제목과 본문 초안을 제안합니다.
---

# PR Proposal

이 스킬은 PR 제목과 설명 초안을 만든다. PR 제목과 본문 승인, PR Creation Skill 입력 확정은 Workflow Engine의 Human Checkpoint와 후속 액션에서 처리한다.

## 먼저 읽을 문서

- `../github-workflow-engine/references/github-templates.md`
- `../github-workflow-engine/references/workflow-engine-rules.md`

## 입력

- 기준 이슈
- 구현 단위
- 작업 브랜치
- 변경 요약
- 검증 결과
- 연관 이슈
- PR 템플릿

## 책임

1. PR 템플릿의 섹션을 빠짐없이 채운다.
2. 변경 이유와 구현 방식을 기준 이슈와 연결해 설명한다.
3. 검증 결과와 merge 전 확인사항을 체크리스트로 정리한다.
4. `연관 이슈` 섹션에는 `Refs #번호`를 사용한다.
5. `Closes`, `Fixes`, `Resolves` 자동 close 키워드를 사용하지 않는다.
6. PR을 생성하지 않는다.

## 출력 형식

- PR 제목 후보
- PR 본문 초안
- 연결 이슈 파싱 결과
- merge 전 확인사항
- Workflow Engine이 확인할 보류 질문
