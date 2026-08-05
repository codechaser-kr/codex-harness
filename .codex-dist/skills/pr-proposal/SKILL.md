---
name: pr-proposal
description: Workflow Engine 구현 흐름에서 기준 이슈, 변경 요약, 검증 결과를 읽어 PR 제목과 본문 초안을 제안합니다.
---

# PR Proposal

이 스킬은 PR 제목과 설명 초안을 만든다. PR 제목과 본문 사용자 결정, PR Creation Skill 입력 확정은 Workflow Engine의 후속 작업에서 처리한다.

## 먼저 읽을 문서

- `../github-agentic-loop/references/github-templates.md`
- `../github-agentic-loop/references/artifact-output-contract.md`에서 `PR 제목 판정 규칙`과 ``PR 제안(`pr-proposal`) 출력 판정 규칙`` 섹션만 읽는다.
- `../github-agentic-loop/references/artifact-handoff-contract.md`
- `../github-agentic-loop/artifact-manifests/pr-proposal.json`

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
6. PR 제목 후보는 `artifact-output-contract.md`의 PR 제목 판정 규칙을 적용해 제안한다.
7. 실제 PR 생성은 Workflow Engine이 확정한 구조화 실행 요청을 선택된 실행 주체가 수행한다.

## 출력

- 공통 handoff 계약의 닫힌 envelope만 반환한다.
- `artifact_type: pr-proposal`을 사용하고 `artifact`는 `pr-proposal.json` manifest에 맞춰 구성한다.
- 제목과 본문은 사용자 검토용 초안이며 PR 생성 입력이나 현재 PR 상태의 확정값이 아니다. Markdown 표시는 runtime renderer가 담당한다.

## 하지 않는 일

- PR 제목·본문, 사용자 결정, PR 생성 여부, 현재 Workflow 상태를 확정하지 않는다.
- PR을 생성·갱신하거나 파일·브랜치·이슈·댓글 등 GitHub와 작업트리 상태를 변경하지 않는다.
- 기준 이슈, 구현 단위, 작업 브랜치, 전달된 변경 요약과 검증 결과의 범위를 넘어 PR 내용을 추가하지 않는다.

## 사용자 결정

- 제목 후보와 본문 초안을 사용자 결정으로 해석하지 않는다. 제목·본문의 선택과 `pr-creation` 입력 확정은 `github-agentic-loop`가 처리한다.

## 중단 조건

- 기준 이슈, 구현 단위, 작업 브랜치, 변경 요약, 검증 결과 또는 PR 템플릿이 없거나 충돌하면 PR 초안을 확정하지 않는다.
- 템플릿 계약을 채울 수 없거나 범위 밖 변경을 설명해야 하면 구체적인 사유와 재개에 필요한 입력을 `보류 질문`에 반환한다.

## 후속 전이

- 제어와 기존 출력 구조를 `github-agentic-loop`에 반환한다.
- Workflow Engine이 산출물 판정과 사용자 결정을 거쳐 `pr-creation`에 전달할 확정 입력 또는 중단을 결정한다.

## Structured artifact handoff

의미 내용은 위 PR 템플릿·제목 판단 기준에 따라 작성하고, 기계 구조는 `pr-proposal.json`만 따른다. envelope 밖의 설명이나 직접 조립한 Markdown을 반환하지 않는다.
