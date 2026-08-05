---
name: fix-plan
description: 기능결함 이슈와 확정된 원인 조사 결과를 기준으로 브랜치/PR 단위별 작업 내용, 순서, 선행 조건, 검증 기준을 포함한 결함 해결 계획을 제안합니다. 기능결함 흐름의 해결 계획 수립 작업에서 사용합니다.
---

# Fix Plan

이 스킬은 `기능결함` 이슈의 실제 수정 전에 결함 해결 계획 초안을 만든다. 결함 해결 계획 사용자 결정, 이슈 반영, 구현 흐름 진입은 Workflow Engine의 후속 작업에서 처리한다.

## 먼저 읽을 문서

- `../github-agentic-loop/references/artifact-output-contract.md`에서 ``결함 해결 계획(`fix-plan`) 출력 판정 규칙`` 섹션만 읽는다.
- `../github-agentic-loop/references/artifact-handoff-contract.md`
- `../github-agentic-loop/artifact-manifests/fix-plan.json`
- `../github-agentic-loop/references/github-templates.md`

## 입력

- 기능결함 이슈 번호와 본문
- 사용자가 확정한 Fix Analysis 결과
- 문제 요약, 확정된 원인과 영향 범위, 잠정 해결 방향
- 관련 정책검토 결과
- 이미 merge된 연결 PR
- 현재 코드 상태

## 책임

1. 사용자가 확정한 원인 조사 결과와 잠정 해결 방향을 읽는다.
2. 필요한 설계 문서, 규칙 문서, 코드, 템플릿, 스킬 변경을 하나 이상의 브랜치/PR 단위로 나눈다.
3. 각 브랜치/PR 단위의 작업 내용, 선행 조건, PR 전체의 검증 기준과 전체 구현 순서를 제안한다.
4. 기존 merge PR이 이미 충족한 완료 기준을 분리한다.
5. 브랜치/PR 단위의 작업 내용과 검증 기준은 커밋 단위가 아닌 PR 전체 범위로 작성한다.
6. Workflow Engine이 검토할 결함 해결 계획 초안을 반환한다.

기능결함 해결 계획은 설계 문서 변경, 규칙 문서 변경, 코드 수정, 템플릿 수정, 스킬 배포본 정렬을 같은 결함 해결 흐름 안의 브랜치/PR 단위로 다룰 수 있다.

## 출력

- 공통 handoff 계약의 닫힌 envelope만 반환한다.
- `artifact_type: fix-plan`을 사용하고 `artifact`는 `fix-plan.json` manifest에 맞춰 구성한다.
- 계획은 사용자 검토용 초안이며 구현 단위, 브랜치, PR 또는 결함 해결 상태의 확정값이 아니다. Markdown 표시는 runtime renderer가 담당한다.

## 하지 않는 일

- 확정된 원인을 다시 판단하거나 결함 해결 계획과 사용자 결정을 확정하지 않는다.
- 브랜치를 생성·전환하거나 파일·이슈·PR·체크리스트 등 GitHub와 작업트리 상태를 변경하지 않는다.
- 확정된 Fix Analysis 결과와 기능결함 이슈의 범위를 넘는 수정 또는 후속 흐름을 추가하지 않는다.

## 사용자 결정

- 제안한 해결 단위와 구현 순서는 후보로만 반환한다. 계획 채택, 이슈 반영, 구현 흐름 진입은 `github-agentic-loop`가 사용자 결정과 전이 규칙으로 처리한다.

## 중단 조건

- 사용자가 확정한 Fix Analysis 결과, 원인, 영향 범위, 잠정 해결 방향 또는 현재 코드 상태가 없거나 충돌하면 계획을 확정하지 않는다.
- 확정된 원인을 변경해야 하거나 결함 범위 밖 수정이 필요하면 구체적인 사유와 재개에 필요한 입력을 `보류 질문`에 반환한다.

## 후속 전이

- 제어와 기존 출력 구조를 `github-agentic-loop`에 반환한다.
- Workflow Engine이 산출물 판정과 사용자 결정을 거쳐 계획 반영 또는 확정된 브랜치/PR 단위의 다음 작업을 결정한다.

## Structured artifact handoff

의미 내용은 위 책임과 확정된 원인 기준으로 작성하고, 기계 구조는 `fix-plan.json`만 따른다. envelope 밖의 설명이나 직접 조립한 Markdown을 반환하지 않는다.
