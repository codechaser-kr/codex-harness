---
name: github-workflow-engine
description: GitHub Issue, PR, label, checklist, review thread, comment를 기준으로 현재 작업 상태를 읽고 다음 Workflow 작업을 산출해 실행 범위 안에서 진행합니다. 다음 계획, 워크플로우 재개, PR merge 반영, GitHub 실행 상태, 구현 흐름 요청에서 사용합니다.
---

# GitHub Workflow Engine

이 스킬은 Workflow Engine 실행자다. GitHub 실행 상태와 현재 코드 상태를 읽고 `references/workflow-engine-rules.md`의 판정 결과에 따라 전용 스킬 호출, 사용자 응답, GitHub 상태 변경, 파일 변경, 브랜치/커밋/PR 작업을 수행한다. 작업 전이 조건은 `workflow-engine-rules.md`가 정의한다.

## 먼저 읽을 문서

- `references/workflow-engine-rules.md` 전체를 항상 읽는다.
- 현재 작업 판정이나 실행에 이슈 유형 label, 제목, 본문, 템플릿, 연관 이슈 계약이 필요하면 `references/github-templates.md`를 읽는다.

필요한 경우 대상 저장소의 `.harness/logs/github-workflow-log.md`를 읽는다. 로그는 `workflow-engine-rules.md`에서 보조 근거로 인정한 항목만 사용한다.

## 책임

1. 기준 이슈, 기준 PR, 새 요청 여부, 재개 요청 여부를 식별한다.
2. `workflow-engine-rules.md`의 판정 규칙으로 현재 작업, 진행 판단, 실행 범위를 산출한다.
3. 현재 작업이 전용 스킬의 초안, 후보, 분석 결과를 요구하면 해당 전용 스킬을 호출한다.
4. 전용 스킬 출력에 `workflow-engine-rules.md`의 해당 산출물 판정 규칙을 적용하고, 보류 판정이면 상태를 변경하거나 사용자 결정 대상으로 제시하지 않는다.
5. 사용자 결정이 필요한 작업이면 결정 대상, 선택지, `기타 의견 입력`, 입력 예시를 번호 목록으로 제시한다.
6. 자동 실행 작업이면 산출된 실행 범위 안에서만 GitHub 상태, 파일, 브랜치, 커밋, PR, 댓글, review thread를 변경한다.
7. 자동 실행 후 GitHub 실행 상태와 현재 코드 상태를 다시 읽고 다음 작업 판정을 반복한다.
8. 작업 진입, 중단, 재개, 작업 결과를 `.harness/logs/github-workflow-log.md`에 기록한다.

PR merge는 사람이 수행한다. Workflow Engine은 merge 알림이나 GitHub 실행 상태를 근거로 merge 이후 작업만 수행한다.

## 전용 스킬 연결

| 필요한 산출물 | 호출할 스킬 |
| ------------- | ----------- |
| 이슈 초안 | `issue-creation` |
| 기능제안 진행 방향 후보 | `feature-proposal-triage` |
| 정책 설계 계획 | `policy-plan` |
| 정책검토 기능변경 전환 방향 후보 | `policy-review-next-triage` |
| 기능변경 계획 | `feature-plan` |
| 기능결함 원인 조사 결과 | `fix-analysis` |
| 기능결함 해결 계획 | `fix-plan` |
| 브랜치 이름 후보 | `branch-proposal` |
| 세부 구현 계획 | `commit-plan` |
| 커밋 메시지 후보 | 전역 `commit` |
| PR 제목과 본문 초안 | `pr-proposal` |
| PR 생성 요청값 | `pr-creation` |
| 리뷰 코멘트 게시 초안 | `review-comment` |

전용 스킬은 후보, 초안, 분석 결과만 만든다. 상태 확정, 사용자 결정 처리, 실제 변경 실행은 Workflow Engine이 `workflow-engine-rules.md`에 따라 수행한다.

## 리뷰 실행 모드

| 모드 | 실행 주체 |
| ---- | --------- |
| `claude/code-review` | Claude Code `/code-review` |
| `claude/awesome-code-review` | Claude 환경의 `awesome-code-review` |
| `codex/awesome-code-review` | Codex 전역 `awesome-code-review` |

Workflow Engine은 `workflow-engine-rules.md`의 리뷰 실행 모드 판정 결과로 실행 모드를 확정하고, 확정된 모드의 리뷰 결과를 PR Review Template으로 정규화한다.

리뷰 실행 모드 선택지는 대상 저장소의 `.harness/workflow-engine.json`에 저장된 사용 가능 모드에서 만든다. 저장된 사용 가능 모드가 없거나 설정 파일이 없으면 하네스 설치 또는 갱신 재실행 조건을 안내하고 중단한다.

리뷰 실행 명령은 stdout을 `/tmp` 아래 파일로 저장하는 형태로 실행한다. 파일명은 PR 번호, head commit SHA, 리뷰 실행 모드를 드러내게 정하고, 리뷰 결과 정규화는 저장된 파일 경로를 입력으로 사용한다.
리뷰 결과 정규화는 `workflow-engine-rules.md`의 PR Review Template 판정 기준을 적용한다. 정규화 결과는 현재 PR 번호와 head commit SHA를 본문과 파일명에 포함한 별도 `/tmp` 파일로 저장하고 해당 경로를 실행 로그에 기록한다.
정규화 결과에 `workflow-engine-rules.md`의 `게시할 리뷰 피드백 존재` 또는 `게시할 리뷰 피드백 없음` 판정 규칙을 적용한다. 게시할 리뷰 피드백이 있을 때만 리뷰 코멘트 게시 초안을 만들고, 없으면 `리뷰 대응 대상 확인`으로 전환한다.

Claude 리뷰 실행 실패가 `Claude CLI 재로그인 필요`로 판정되면 토큰 만료 가능성만 안내하고 중단한다.

## 명령 실행

Workflow Engine은 `workflow-engine-rules.md`의 명령 실행 경로 판정 결과에 따라 일반 경로 또는 권한 확인 경로로 명령을 실행한다. 명령 실행 경로는 도구 권한을 정하는 절차이며, 사용자 결정이 필요한 작업은 사용자 결정 판정과 출력 기준으로 확정한다.

`workflow-engine-rules.md`가 권한 확인 경로로 판정한 명령은 일반 경로를 먼저 시도하지 않고 권한 확인 경로로 실행한다.

사용자 변경 보존 확인이 필요한 명령은 권한 확인 경로로 실행한다.
변경 손실 가능 명령은 `workflow-engine-rules.md`의 변경 손실 가능 명령 판정 기준을 적용한 뒤 실행한다.

## 외부 의존성 확인

Workflow Engine은 외부 의존성이 필요한 현재 작업에 진입하기 전에 하네스 설치 또는 갱신 시 저장된 실행 가능 상태를 확인한다.

- 커밋 메시지 제안은 `.harness/workflow-engine.json`의 `dependencies.commit.available` 값으로 판단한다.
- 리뷰 실행 모드 사용 가능 여부는 하네스 설치 또는 갱신 시 저장된 `.harness/workflow-engine.json`의 사용 가능 상태로 확인한다.
- 저장된 사용 가능 상태가 없으면 하네스 설치 또는 갱신 재실행 조건을 안내하고 중단한다.
- 선택된 리뷰 실행 모드는 사용자의 명시 선택으로 확정한다.

## 출력 기준

사용자 결정, 중단, 완료로 멈출 때는 다음 항목을 포함한다.

- 현재 이슈 또는 PR
- 현재 작업
- 진행 판단
- 중단 사유, 완료 근거, 또는 사용자 결정 질문
- 선택 가능한 응답 번호 목록과 입력 예시

선택 가능한 응답을 제시할 때는 `기타 의견 입력`을 마지막 번호 항목에 포함한다.

판정 결과가 `자동 실행`인 작업만 실행한다. 판정 결과가 `사용자 결정`, `중단`, `완료`이면 출력 기준에 따라 응답한다.

## 로그 기록

작업에 진입하거나 중단 또는 재개 상태를 기록해야 할 때 대상 저장소의 `.harness/logs/github-workflow-log.md`에 다음 항목을 남긴다.

- 대상 이슈 또는 PR
- 작업 대상 식별자
- 워크플로우 유형
- 진입한 작업 이름
- 적용한 조건
- 실행 범위와 수행한 작업 내용
- 확정된 사용자 결정 또는 사용자 결정 필요 여부
- 완료기준과 충족 근거
- 참조한 GitHub 실행 상태
- GitHub 상태에 반영한 내용
- 남은 판단 질문 또는 재개 조건

반복 가능한 작업은 해당 대상을 유일하게 구분할 수 있는 작업 대상 식별자를 기록한다.
