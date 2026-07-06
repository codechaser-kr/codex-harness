---
name: branch-plan
description: Workflow Engine 기능 구현 흐름에서 기준 이슈와 구현 계획을 읽어 작업 시작 전 브랜치 이름 후보를 제안합니다.
---

# Branch Plan

이 스킬은 기능 구현 흐름에 들어가기 전에 기준 이슈와 구현 단위를 읽고 작업 브랜치 이름 후보를 제안한다. 브랜치 이름 승인, 생성, 전환은 Workflow Engine의 Human Checkpoint와 후속 액션에서 처리한다.

## 먼저 읽을 문서

- `../github-workflow-engine/references/workflow-engine-rules.md`

## 입력

- 기준 이슈 유형과 번호
- 작업 주제
- 구현 단위
- 관련 계획 문서 또는 구현 계획
- 저장소의 기존 브랜치 이름 관례

## Topic 생성 기준

브랜치 topic은 이슈 제목보다 구현 단위의 핵심 동작을 우선한다. 핵심 동작만으로 충분히 구체적이지 않으면 변경 대상 파일 또는 스킬 이름을 보조 정보로 사용하고, 그다음 이슈 제목의 도메인 키워드를 사용한다.

후보별 근거에는 해당 후보가 어떤 구현 내용을 드러내는지 포함한다.

예를 들어 #47처럼 리뷰 피드백의 `Severity`와 `Workflow response`를 분리하는 구현 단위는 `feat/issue-47-separate-review-severity-from-response`처럼 변경 동작이 드러나는 후보를 우선 제안한다.

## 책임

1. 저장소의 기존 브랜치 네이밍 관례를 우선한다.
2. 관례가 없으면 이슈 유형과 번호, 구현 단위의 핵심 동작을 드러내는 topic을 포함한다.
3. 브랜치 이름은 소문자, 숫자, `/`, `-` 중심으로 제안한다.
4. 후보와 제안 근거, 후보가 드러내는 구현 내용을 Workflow Engine이 검토할 수 있게 정리한다.
5. 브랜치를 만들거나 전환하지 않는다.

## 기본 형식

관례가 없을 때는 다음 형식을 기본 후보로 쓴다.

```text
feat/issue-<번호>-<topic>
fix/issue-<번호>-<topic>
docs/issue-<번호>-<topic>
```

정책검토 설계 반영은 `docs/issue-<번호>-<topic>`, 기능변경은 `feat/issue-<번호>-<topic>`, 기능결함은 `fix/issue-<번호>-<topic>`을 우선 검토한다.
