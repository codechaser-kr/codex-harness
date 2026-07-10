---
name: pr-proposal
description: Workflow Engine 구현 흐름에서 기준 이슈, 변경 요약, 검증 결과를 읽어 PR 제목과 본문 초안을 제안합니다.
---

# PR Proposal

이 스킬은 PR 제목과 설명 초안을 만든다. PR 제목과 본문 사용자 결정, PR Creation Skill 입력 확정은 Workflow Engine의 후속 작업에서 처리한다.

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
3. 검증 결과는 PR 템플릿의 기존 섹션에 맞춰 반영한다.
4. `머지하기 전에 반드시 확인되어야 할 사항이 있다면 작성해 주세요. (optional)` 섹션에는 다른 PR merge, 정책 결정, 배포 창구, 수동 운영 작업처럼 PR merge 전에 끝나야 하는 선행 조건만 적는다. 선행 조건이 없으면 `N/A`로 둔다.
5. Workflow Engine 관리 이슈는 `연관 이슈` 섹션에 `Refs #번호` 형식으로 연결한다.
6. 실제 PR 생성은 Workflow Engine이 수행한다.

## 출력 형식

- PR 제목 후보
- PR 본문 초안
- 연결 이슈 파싱 결과
- merge 선행 조건
- Workflow Engine이 확인할 보류 질문
