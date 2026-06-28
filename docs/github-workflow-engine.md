# GitHub Workflow Engine 설계

이 문서는 `codex-harness`가 타겟 프로젝트에 GitHub 중심 Workflow Engine을 생성하고 정착시키기 위한 설계 기준이다.

GitHub 템플릿은 이슈와 PR에 필요한 정보를 적는 양식이고, 이 문서는 GitHub 상태를 어떻게 읽고 다음 작업을 결정할지 정의한다. 상태 전이 규칙은 템플릿 본문에 넣지 않고 이 설계 문서에서 관리한다.

## 설계 목표

- GitHub Issue, Pull Request, Review, Label, Checklist, Comment를 작업 상태의 기준으로 사용한다.
- 별도 Run State Runtime을 우선 도입하지 않는다.
- 사람이 보는 상태와 Agent가 읽는 상태가 일치하도록 한다.
- 정책 판단, 설계 변경, 고위험 수정, PR 생성 전 승인은 Human Checkpoint로 둔다.
- 작성 Executor와 Review Executor 또는 Review Tool을 분리할 수 있게 한다.
- 리뷰 피드백은 자동 수정 명령이 아니라 분류와 승인 대상이다.

## 정책 반영 범위

이 문서는 #29의 정책 검토 결과 중 다음 항목을 설계 문서로 반영한다.

- GitHub 기반 Run State 모델
- Workflow Template 구조
- State Transition Table 형식
- Human Checkpoint 정책
- Executor Abstraction 원칙
- Review Executor / Review Tool 연동 정책
- Review Feedback Triage 기준
- 리뷰 피드백을 사람에게 전달할 때 포함해야 할 맥락 형식
- 타겟 프로젝트에 GitHub 기반 Workflow Engine을 생성하는 저장소 구조

## 핵심 개념

### Workflow Template

Workflow Template은 이슈 유형별 공통 절차다. 현재 기본 유형은 다음 네 가지다.

- `기능제안`: 기능 추가, 기능 수정, 운영 흐름 개선의 필요성을 판단한다.
- `정책검토`: 설계, 정책, 운영 기준을 결정한다.
- `기능변경`: 기능 추가 또는 기존 기능 수정을 실행한다.
- `기능결함`: 결함, 회귀, 문서와 구현 불일치, 반영 누락을 해결한다.

### GitHub Run State

GitHub Run State는 별도 파일이 아니라 GitHub 객체에서 읽는 현재 작업 상태다.

| 상태 원천 | 역할 |
| --- | --- |
| Issue title | 이슈 유형과 작업 주제를 식별한다. |
| Issue label | `기능제안`, `정책검토`, `기능변경`, `기능결함` 유형을 식별한다. |
| Issue body | 판단 근거, 범위, 완료 기준, 후속 작업을 읽는다. |
| Issue checklist | 완료 기준과 정책 반영 상태를 읽는다. |
| Issue state | 작업이 열려 있는지 닫혔는지 읽는다. |
| Pull Request body | 변경 이유, 영향 범위, 연관 이슈를 읽는다. |
| Pull Request state | 변경이 진행 중인지 병합되었는지 읽는다. |
| Review and comments | 리뷰 피드백과 사람 승인 여부를 읽는다. |

### State Transition Rule

State Transition Rule은 현재 GitHub Run State에서 다음 Action을 결정하는 규칙이다. 이 규칙은 자동 실행보다 판단의 일관성을 위해 사용한다.

State Transition Rule은 다음 형식을 따른다.

| 필드 | 의미 |
| --- | --- |
| 현재 상태 | GitHub Run State에서 읽은 이슈/PR 상태 |
| 조건 | 다음 Action을 선택하기 위한 판정 조건 |
| 다음 Action | 사람이 승인하거나 Executor가 수행할 다음 작업 |
| Human Checkpoint | 사람 승인 또는 정책 판단이 필요한 지점 |

State Transition Rule은 자동 실행 명령이 아니다. Agent는 이 규칙을 근거로 다음 Action을 제안하고, Human Checkpoint가 있으면 사람 승인 없이 다음 단계로 넘어가지 않는다.

### Human Checkpoint

Human Checkpoint는 Agent가 임의로 넘기면 안 되는 판단 지점이다.

대표적인 Human Checkpoint는 다음과 같다.

- 정책 방향 확정
- 설계 문서 반영 승인
- 고위험 코드 수정 승인
- 리뷰 피드백 중 오탐 또는 정책 판단이 필요한 항목 승인
- PR 생성 전 변경 범위 승인
- PR merge 전 최종 확인

### Executor Abstraction

Executor는 작업을 실제로 수행하는 도구다. Workflow Engine은 특정 Executor에 종속되지 않아야 한다.

지원 후보는 다음과 같다.

- Codex
- Claude Code
- OpenHands
- Aider
- `open-code-review`
- 기타 리뷰 또는 수정 도구

Workflow Engine은 GitHub 상태를 읽고 다음 Action을 정하지만, 실제 파일 수정이나 리뷰 생성은 선택된 Executor가 수행한다.

Executor는 다음 입출력 경계를 지킨다.

| 구분 | 내용 |
| --- | --- |
| 입력 | 이슈 번호, PR 번호, 작업 범위, 완료 기준, 관련 설계 문서, 승인된 리뷰 피드백 |
| 출력 | 변경 파일, 리뷰 결과, 보류한 판단, 후속 이슈 후보, 검증 결과 |
| 금지 | 승인되지 않은 정책 변경, 범위 밖 대규모 수정, 리뷰 피드백 자동 일괄 반영 |

Executor를 교체해도 Workflow Template, State Transition Rule, Human Checkpoint는 유지되어야 한다.

## 이슈 유형별 흐름

### 기능제안

기능제안은 아이디어의 출발점이다. 바로 구현하지 않고 먼저 필요성을 판단한다.

가능한 다음 상태는 다음과 같다.

| 조건 | 다음 Action |
| --- | --- |
| 진행하지 않음 | 판단 근거를 남기고 기능제안 이슈를 닫는다. |
| 정책 검토 필요 | 정책검토 이슈를 만들고 기능제안 이슈를 닫는다. |
| 바로 변경 가능 | 기능변경 이슈를 만들고 기능제안 이슈를 닫는다. |

### 정책검토

정책검토는 결정 자체를 관리한다. 구현은 기능변경 또는 기능결함 이슈에서 진행한다.

정책검토 이슈에서는 다음을 정리한다.

- 무엇을 결정해야 하는지
- 왜 지금 필요한지
- 선택지는 무엇인지
- 검토 결과가 무엇인지
- 후속 작업이 무엇인지

정책검토 종료 전 확인 기준은 다음과 같다.

- 확정된 정책이 관련 설계 문서에 반영되어 있다.
- 필요한 경우 기능변경 또는 기능결함 이슈의 작업 범위와 완료 기준이 갱신되어 있다.

### 기능변경

기능변경은 기능 추가 또는 기존 기능 수정을 실행하는 이슈다.

기능변경 이슈에서는 다음을 관리한다.

- 변경할 기능
- 변경이 필요한 이유
- 포함 범위와 제외 범위
- 기대 효과
- 기능별 완료 기준

기능변경 이슈 하나에 PR이 하나일 수도 있고 여러 개일 수도 있다. 모든 필요한 변경이 반영되고 완료 기준이 충족되면 기능변경 이슈를 닫는다.

### 기능결함

기능결함은 결함 해결의 출발점이다.

기능결함 이슈에서는 다음을 관리한다.

- 어떤 문제가 있는지
- 문제 유형
- 재현 과정 또는 확인 위치
- 올바른 동작
- 원인과 해결 방향
- 결함별 완료 기준

정책이나 설계 변경이 필요하다고 판단되면 정책검토 이슈를 만든다. 정책검토 결과는 기능결함 이슈의 해결 방향과 완료 기준에 반영한다.

## State Transition Table

State Transition Table은 이슈 유형과 GitHub 상태를 기준으로 다음 Action을 고르는 표다. 표의 한 행은 하나의 자동 실행 규칙이 아니라, 사람이 검토할 수 있는 판단 단위다.

| 현재 상태 | 조건 | 다음 Action | Human Checkpoint |
| --- | --- | --- | --- |
| 기능제안 open | 필요 없음 | 판단 근거를 남기고 close | 필요 시 |
| 기능제안 open | 정책 또는 설계 판단 필요 | 정책검토 생성 후 기능제안 close | 정책검토 생성 전 |
| 기능제안 open | 바로 변경 가능 | 기능변경 생성 후 기능제안 close | 기능변경 범위 확인 |
| 정책검토 open | 정책 결정 전 | 선택지와 검토 결과 보강 | 정책 결정 |
| 정책검토 open | 정책 결정 완료 | 설계 문서 반영 | 설계 반영 승인 |
| 정책검토 open | 구현 필요 | 기능변경 또는 기능결함 이슈 갱신 | 작업 범위 승인 |
| 기능변경 open | 범위 미확정 | 작업 범위와 완료 기준 보강 | 범위 승인 |
| 기능변경 open | 구현 가능 | PR 생성 | PR 생성 전 승인 |
| 기능변경 open | PR 리뷰 필요 | Review Executor 또는 Review Tool 실행 | 리뷰 요청 승인 |
| 기능변경 open | 리뷰 피드백 존재 | 사람이 피드백별 Action 결정 | 피드백 처리 승인 |
| 기능변경 open | 완료 기준 충족 | close | 최종 확인 |
| 기능결함 open | 원인 미확정 | 원인 조사 | 필요 시 |
| 기능결함 open | 정책 판단 필요 | 정책검토 생성 | 정책검토 생성 전 |
| 기능결함 open | 수정 가능 | PR 생성 | PR 생성 전 승인 |
| 기능결함 open | 리뷰 피드백 존재 | 사람이 피드백별 Action 결정 | 피드백 처리 승인 |
| 기능결함 open | 완료 기준 충족 | close | 최종 확인 |

## Human Checkpoint 정책

Human Checkpoint는 아래 기준 중 하나라도 해당할 때 필요하다.

- 정책 또는 설계 방향이 바뀐다.
- 보안, 권한, 데이터 보관, 사용자 비용에 영향을 준다.
- PR 생성 전 작업 범위가 넓거나 모호하다.
- 리뷰 피드백이 실제 결함인지 정책 판단인지 구분하기 어렵다.
- Review Tool이 제안한 수정이 완료 기준 밖의 변경을 포함한다.
- 여러 Executor의 판단이 충돌한다.

Human Checkpoint가 필요한 경우 Agent는 다음 정보를 사람에게 전달한다.

- 현재 이슈 또는 PR
- 판단해야 할 질문
- 선택 가능한 Action
- 각 Action의 영향과 위험
- 추천 Action과 근거

## PR 연결 기준

PR은 기능변경 이슈 또는 기능결함 이슈와 연결한다.

- PR 하나가 이슈를 완전히 해결하면 `Closes #번호` 또는 `Fixes #번호`를 사용할 수 있다.
- PR 여러 개가 같은 이슈를 나누어 처리하면 `Refs #번호`를 사용하고, 이슈의 완료 기준에서 진행 상태를 관리한다.
- 정책검토 이슈만으로 PR을 만들지 않는다. 정책검토 결과가 변경을 요구하면 기능변경 또는 기능결함 이슈를 기준으로 PR을 만든다.

## PR 리뷰 처리 흐름

PR 리뷰 과정에서 Review Executor 또는 Review Tool은 피드백을 생성할 수 있지만, 피드백에 대해 어떻게 행동할지는 사람이 결정한다.

기본 흐름은 다음과 같다.

```text
PR 생성
  -> Review Executor 또는 Review Tool 실행
  -> 리뷰 피드백 수집
  -> 사람이 피드백별 Action 결정
  -> 승인된 Action만 작성 Executor가 반영
  -> 필요하면 재리뷰
  -> merge 또는 close
```

사람이 결정해야 하는 Action은 다음 중 하나다.

| Action | 의미 | 후속 처리 |
| --- | --- | --- |
| 적용 | 실제 결함 또는 명확한 개선으로 판단한다. | 작성 Executor가 수정한다. |
| 보류 | 지금 판단하기 어렵거나 현재 PR 범위 밖이다. | 보류 사유를 PR 또는 이슈에 남긴다. |
| 거절 | 오탐이거나 적용하지 않기로 결정한다. | 거절 근거를 PR에 남긴다. |
| 정책검토 필요 | 정책, 설계, 운영 기준 결정이 먼저 필요하다. | 정책검토 이슈를 생성한다. |
| 사람 승인 필요 | 고위험 변경이거나 추가 승인이 필요하다. | 승인 전까지 수정하지 않는다. |

Review Executor 또는 Review Tool은 이 Action을 추천할 수는 있지만 확정하지 않는다. 확정 권한은 사람에게 있다.

## Review Executor / Review Tool 연동 정책

Review Executor 또는 Review Tool은 변경사항을 독립적으로 검토하는 역할이다. 작성 Executor와 같은 도구를 사용할 수도 있지만, 역할 경계는 분리한다.

Review Executor / Review Tool은 다음 시점에 실행한다.

- 기능변경 또는 기능결함 PR이 생성된 뒤
- 사람이 별도 리뷰를 요청한 뒤
- 위험도가 높은 설계/정책 변경이 포함된 뒤
- 이전 리뷰 피드백 반영 후 재확인이 필요한 경우

입력은 다음과 같다.

- PR 번호
- 연결된 기능변경 또는 기능결함 이슈
- 관련 정책검토 이슈
- 변경 diff
- 완료 기준
- 검토에서 제외할 범위

출력은 다음 형식으로 남긴다.

- 발견한 문제
- 근거 파일 또는 문서 위치
- 위험도
- 추천 분류: 적용 / 보류 / 거절 / 정책검토 필요 / 사람 승인 필요
- 추천 수정 방향

Review Executor / Review Tool은 직접 수정하지 않는다. 수정은 사람이 피드백별 Action을 결정한 뒤, 승인된 항목만 작성 Executor가 수행한다.

## Review Feedback Triage

Review Feedback Triage는 리뷰 피드백을 수정 명령으로 바로 취급하지 않고, 사람이 Action을 결정할 수 있도록 분류와 맥락을 제공하는 절차다.

| 분류 | 의미 | 다음 Action |
| --- | --- | --- |
| 적용 | 실제 결함 또는 명확한 개선 | 기능변경 또는 기능결함 범위 안에서 수정 |
| 보류 | 더 많은 맥락 필요 | 이슈 또는 PR에 보류 사유 기록 |
| 거절 | 오탐 또는 범위 밖 제안 | 거절 근거 기록 |
| 정책검토 필요 | 정책, 설계, 운영 기준 판단 필요 | 정책검토 이슈 생성 |
| 사람 승인 필요 | 고위험 변경 또는 애매한 판단 | Human Checkpoint로 전달 |

리뷰 피드백을 사람에게 전달할 때 포함할 맥락은 다음과 같다.

- 피드백 원문
- 관련 파일 또는 문서 위치
- 예상 영향
- 적용/보류/거절/정책검토 필요/사람 승인 필요 분류
- 추천 Action
- 자동 수정 시 위험 요소

Triage 결과는 자동 수정 승인으로 해석하지 않는다. 사람이 Action을 확정한 뒤에만 수정 작업으로 넘긴다.

## 타겟 프로젝트 생성 구조

`codex-harness`가 타겟 프로젝트에 GitHub Workflow Engine 운영 기준을 생성할 때는 다음 자산을 후보로 둔다.

```text
target-repo/
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   ├── proposal_template.md
│   │   ├── decision_template.md
│   │   ├── feature_template.md
│   │   └── fix_template.md
│   └── pull_request_template.md
└── docs/
    └── github-workflow-engine.md
```

타겟 프로젝트의 도메인과 기존 운영 방식에 따라 문서 경로는 달라질 수 있다. 중요한 기준은 GitHub Issue와 PR이 프로젝트 상태의 기준이고, 별도 Runtime 상태 저장소가 필수가 아니라는 점이다.

## 운영 메모

- 이슈 제목 prefix와 라벨은 템플릿 기준을 따른다.
- 이슈 본문에 Workflow Engine 규칙을 반복해서 적지 않는다.
- 흐름이 애매하면 새 이슈를 만들기보다 현재 이슈에 판단 근거를 먼저 남긴다.
- 작업 중 정책 판단이 필요해지면 구현을 계속 진행하기 전에 정책검토 이슈를 만든다.
- 리뷰 피드백은 자동 수정 명령이 아니라 판단 대상이다.
- 리뷰 피드백별 Action은 PR 과정에서 사람이 직접 결정한다.
- 실제 반영 여부는 해당 기능변경 또는 기능결함 이슈의 완료 기준과 PR 리뷰에서 확인한다.
