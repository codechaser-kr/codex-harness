---
name: feature-plan
description: 기능변경 이슈를 기준으로 브랜치/PR 단위별 작업 내용, 순서, 선행 조건, 검증 기준을 포함한 변경 계획 초안을 작성합니다. 기능변경 이슈의 변경 계획 수립 요청에서 사용합니다.
---

# Feature Plan

이 스킬은 `기능변경` 이슈의 실제 구현 전에 변경 계획 초안을 만든다. 변경 계획 사용자 결정, 이슈 반영, 구현 흐름 진입은 Workflow Engine의 후속 작업에서 처리한다.

## 먼저 읽을 문서

- `../github-agentic-loop/references/artifact-output-contract.md`에서 ``기능 변경 계획(`feature-plan`) 출력 판정 규칙`` 섹션만 읽는다.
- `../github-agentic-loop/references/artifact-handoff-contract.md`
- `../github-agentic-loop/artifact-manifests/feature-plan.json`
- `../github-agentic-loop/references/github-templates.md`

## 입력

- 기능변경 이슈 번호와 본문
- 완료 기준 체크리스트
- 연관 정책검토, 기능제안, 기능결함 이슈
- 관련 설계 문서
- 이미 merge된 연결 PR
- 현재 코드 상태

## 책임

1. 기능변경 이슈의 작업 범위와 완료 기준을 읽는다.
2. 정책검토 결과와 관련 설계 문서를 함께 참조한다.
3. 변경 범위를 하나 이상의 브랜치/PR 단위로 나눈다.
4. 각 브랜치/PR 단위의 작업 내용, 선행 조건, PR 전체의 검증 기준과 전체 구현 순서를 제안한다.
5. 기존 merge PR이 이미 충족한 완료 기준을 분리한다.
6. 브랜치/PR 단위의 작업 내용과 검증 기준은 커밋 단위가 아닌 PR 전체 범위로 작성한다.
7. Workflow Engine이 검토할 변경 계획 초안을 반환한다.

## 출력

- 공통 handoff 계약의 닫힌 envelope만 반환한다.
- `artifact_type: feature-plan`을 사용하고 `artifact`는 `feature-plan.json` manifest에 맞춰 구성한다.
- 계획은 사용자 검토용 초안이며 구현 단위, 브랜치, PR 또는 현재 Workflow 상태의 확정값이 아니다. Markdown 표시는 runtime renderer가 담당한다.

## 하지 않는 일

- 변경 계획, 구현 순서, 브랜치/PR 단위, 사용자 결정을 확정하지 않는다.
- 브랜치를 생성·전환하거나 파일·이슈·PR·체크리스트 등 GitHub와 작업트리 상태를 변경하지 않는다.
- 기능변경 이슈와 참조한 설계 문서에서 확인된 범위를 넘어 구현 범위를 늘리지 않는다.

## 사용자 결정

- 제안한 단위와 구현 순서는 후보로만 반환한다. 계획 채택, 이슈 반영, 구현 흐름 진입은 `github-agentic-loop`가 사용자 결정과 전이 규칙으로 처리한다.

## 중단 조건

- 기준 이슈, 완료 기준, 관련 설계 문서 또는 현재 코드 상태가 없거나 충돌하면 계획을 확정하지 않는다.
- 상위 이슈 범위를 변경해야 하거나 범위 밖 구현이 필요하면 구체적인 사유와 재개에 필요한 입력을 `보류 질문`에 반환한다.

## 후속 전이

- 제어와 기존 출력 구조를 `github-agentic-loop`에 반환한다.
- Workflow Engine이 산출물 판정과 사용자 결정을 거쳐 계획 반영 또는 확정된 브랜치/PR 단위의 다음 작업을 결정한다.

## Structured artifact handoff

의미 내용은 위 책임과 PR 전체 계획 기준으로 작성하고, 기계 구조는 `feature-plan.json`만 따른다. envelope 밖의 설명이나 직접 조립한 Markdown을 반환하지 않는다.
