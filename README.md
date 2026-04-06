# harness (Codex)

이 저장소는 Codex를 위한 **프로젝트별 실행 하네스 팀 생성기**입니다.

이 레포는 단순 문서 생성기나 테스트 러너가 아니라,  
현재 프로젝트에 맞는 **로컬 실행 하네스 팀**을 생성하는 메타 시스템입니다.

즉 이 저장소의 역할은 다음과 같습니다.

- 전역에 설치되는 하네스 생성기 제공
- 현재 프로젝트 분석
- 프로젝트별 역할 팀 생성
- orchestrator 중심 흐름 포함
- QA / validator / run-harness 포함 구조 생성
- 이후 프로젝트 특화 실행 하네스로 확장 가능한 기반 제공

---

## 핵심 개념

이 시스템은 두 층으로 구성됩니다.

### 1. 전역 메타 하네스 생성기

전역 설치 후 다음 경로에 스킬이 설치됩니다.

    $HOME/.codex/skills/harness

이 스킬은 어떤 프로젝트에서든 재사용 가능한  
**메타 하네스 생성기**입니다.

### 2. 프로젝트 로컬 실행 하네스 팀

실제 프로젝트에서 하네스를 구성하면  
다음과 같은 구조가 생성됩니다.

    repo/
    ├── .codex/
    │   └── skills/
    │       ├── domain-analyst/
    │       ├── harness-architect/
    │       ├── skill-scaffolder/
    │       ├── qa-designer/
    │       ├── orchestrator/
    │       ├── validator/
    │       └── run-harness/
    │
    └── .harness/
        └── reports/
            ├── domain-analysis.md
            ├── harness-architecture.md
            ├── qa-strategy.md
            ├── orchestration-plan.md
            ├── team-structure.md
            └── team-playbook.md

핵심은 `.codex/skills/*` 아래의 **로컬 역할 팀**입니다.  
`.harness/reports/*` 는 사람이 읽고 수정할 수 있게 돕는 **보조 산출물**입니다.
기본적으로 `.harness/*` 문서와 로그 본문은 한글로 작성되며, 파일명만 영문 규칙을 유지합니다.

---

## 설치 방법

다음과 같이 설치합니다.

    curl -fsSL https://raw.githubusercontent.com/codechaser-kr/codex-harness/main/install.sh | bash

클론 후 로컬에서 설치해도 됩니다.

    git clone https://github.com/codechaser-kr/codex-harness.git
    cd codex-harness
    ./install.sh

설치 후 전역에 다음이 추가됩니다.

    $HOME/.codex/skills/harness

중요:

- 전역 AGENTS.md는 수정하지 않습니다.
- 사용자의 기존 전역 설정을 덮어쓰지 않습니다.
- 프로젝트 내부에 생성되는 로컬 역할 팀 경로는 `.codex/skills/*` 를 사용합니다.
- 프로젝트 내부 `.harness/*` 문서와 로그 본문은 특별한 요청이 없으면 한글로 작성합니다.

---

## 사용 방법

아무 프로젝트에서 다음과 같이 요청하면 됩니다.

    이 프로젝트에 하네스를 구성해줘

또는

    실행 하네스 팀 만들어줘

또는

    이 저장소에 맞는 역할 팀 구성해줘

그러면 전역 `harness` 스킬이 현재 저장소를 분석하고,  
프로젝트 내부에 **로컬 실행 하네스 팀**을 생성합니다.

하네스 구성 이후에는 프로젝트 내부에서  
`run-harness`를 실행 하네스 팀의 진입점으로 사용할 수 있습니다.

전역 `harness` 스킬은 다음 원칙으로 동작해야 합니다.

- 최초 구성 요청이면 `$HOME/.codex/skills/harness/scripts/harness-init.sh`를 먼저 실행합니다.
- 리포트만 다시 정리할 때만 `$HOME/.codex/skills/harness/scripts/harness-plan.sh`를 사용합니다.
- 하네스 구성이 끝났다고 말하기 전에 `$HOME/.codex/skills/harness/scripts/harness-verify.sh`를 반드시 실행합니다.
- `harness-verify.sh`가 실패하면 구성이 완료된 것으로 보지 않습니다.

로그 운영을 보강하려면 다음 스크립트를 함께 사용할 수 있습니다.

- `$HOME/.codex/skills/harness/scripts/harness-log.sh`
- `$HOME/.codex/skills/harness/scripts/harness-session-close.sh`
- `$HOME/.codex/skills/harness/scripts/harness-role-stats.sh`
- `$HOME/.codex/skills/harness/scripts/harness-template-candidates.sh`

예시:

    bash "$HOME/.codex/skills/harness/scripts/harness-log.sh" \
      --new-session \
      --request "현재 프로젝트에 하네스 팀을 구성해줘" \
      --entry-point run-harness \
      --role run-harness \
      --next-role domain-analyst

    bash "$HOME/.codex/skills/harness/scripts/harness-session-close.sh"

    bash "$HOME/.codex/skills/harness/scripts/harness-template-candidates.sh" \
      --min-count 3

타겟 프로젝트에서 로그 지침은 보통 다음 파일에서 확인합니다.

- `.harness/logging-policy.md`
- `.harness/logs/session-log.md`
- `.harness/logs/latest-session-summary.md`
- `.harness/logs/role-frequency.md`
- `.harness/reports/template-candidates.md`

---

## 이 시스템이 실제로 하는 일

이 시스템은 다음 흐름으로 동작합니다.

1. 저장소 분석
2. 실행 하네스 팀 설계
3. 로컬 역할 스킬 생성
4. QA 구조 포함
5. 오케스트레이션 구조 포함
6. run-harness 진입점 포함
7. 검증 구조 포함

즉 단순히 파일이나 문서를 만드는 것이 아니라,  
**분석 → 역할 팀 설계 → 역할 스킬 생성 → 팀 기동 진입점 포함 → QA/검증 포함**의 실행 하네스 구조를 생성합니다.

---

## 기본 역할 팀

이 시스템은 기본적으로 다음 역할을 생성합니다.

### domain-analyst

- 저장소 분석
- 기술 스택 파악
- 핵심 흐름 식별
- 실행 하네스의 출발점 정의

### harness-architect

- 로컬 실행 하네스 구조 설계
- 역할 경계 정의
- 확장 가능한 팀 구조 설계

### skill-scaffolder

- 로컬 역할 스킬 생성
- 하네스 구조를 실제 파일로 정착

### qa-designer

- 품질 기준 정의
- 반복 검토 질문 설계
- 경계면 정합성 관점 정리

### orchestrator

- 역할 간 흐름 설계
- 입력/출력 연결
- 프로젝트 실행 하네스 팀의 중심 조율 역할

### validator

- 구조 검증
- 누락 탐지
- 약한 설명/연결성 보완 포인트 제안

### run-harness

- 실행 하네스 팀의 기동 엔트리포인트
- 현재 상태를 보고 어떤 역할부터 움직여야 할지 결정

---

## references 문서

전역 harness 스킬은 `references/` 문서를 함께 사용합니다.

포함된 문서:

- `agent-design-patterns.md`
- `orchestrator-template.md`
- `skill-writing-guide.md`
- `skill-testing-guide.md`
- `qa-agent-guide.md`
- `team-examples.md`

이 문서들은 부가 설명이 아니라,  
실행 하네스 팀을 설계하고 보강하기 위한 **핵심 지식 베이스**입니다.

---

## 본체와 보조의 구분

이 시스템의 **본체**는 다음입니다.

- 프로젝트 로컬 역할 팀
- 역할별 로컬 스킬
- orchestrator 중심 흐름
- validator / QA 포함 구조
- run-harness 기동 진입점

보조는 다음입니다.

- `.harness/reports/*`

리포트는 중요하지만 중심이 아닙니다.  
리포트는 사람이 구조를 이해하고 수정하고 합의할 수 있게 돕는  
**보조 문서 레이어**입니다.

즉 이 시스템은  
문서를 만드는 도구가 아니라  
👉 **프로젝트별 실행 하네스 팀을 만드는 도구**입니다.

---

## 운영 시작 방법

하네스 생성 이후에는 보통 다음 흐름으로 시작합니다.

1. 새 프로젝트라면 `run-harness`를 실행 하네스 팀의 시작점으로 사용합니다.
2. `run-harness`가 현재 상태를 보고 필요한 역할을 우선순위로 판단합니다.
3. 새 프로젝트라면 domain-analyst부터 시작하는 흐름이 일반적입니다.
4. 이미 구조가 있다면 orchestrator / validator 중심으로 보강 루프를 돌릴 수 있습니다.

---

## 설계 철학

이 시스템은 다음 원칙을 따릅니다.

- 전역 AGENTS.md를 수정하지 않음
- 사용자 파일을 임의로 덮어쓰지 않음
- 사람이 읽고 수정 가능한 구조 유지
- 특정 프레임워크에 과도하게 고정되지 않음
- 문서보다 역할 팀을 중심에 둠
- QA와 검증을 실행 하네스의 일부로 포함함
- run-harness를 실제 기동 엔트리포인트로 둠

---

## 중요한 점

이 시스템은 아직 다음을 직접 수행하지 않습니다.

- expected-state 비교
- diff 엔진 실행
- 시나리오 실행 자동화
- 프로젝트 특화 실행 검증기

이들은 다음 단계에서  
프로젝트별 특화 실행 하네스로 확장됩니다.

즉 현재 단계의 목표는:

👉 **범용 프로젝트 실행 하네스 팀 생성기**

입니다.

---

## 이후 확장 방향

각 프로젝트에서는 이후 다음을 추가할 수 있습니다.

- expected-state 정의 전략
- diff 전략
- 시나리오 실행 연결
- 자동 검증 파이프라인
- 프로젝트 전용 역할 확장

하지만 이들은 기본 실행 하네스 팀 이후의 확장입니다.

---

## 제거 방법

전역 메타 하네스 생성기는 다음 경로에 설치됩니다.

    $HOME/.codex/skills/harness

클론한 저장소가 있다면 다음으로 제거할 수 있습니다.

    ./uninstall.sh

저장소를 클론하지 않고 설치했다면 다음으로 제거할 수 있습니다.

    curl -fsSL https://raw.githubusercontent.com/codechaser-kr/codex-harness/main/uninstall.sh | bash

직접 제거해도 됩니다.

    rm -rf "$HOME/.codex/skills/harness"

주의:

- 이 제거는 전역 메타 하네스 생성기만 삭제합니다.
- 이미 각 프로젝트 내부에 생성된 `.codex/skills/*`, `.harness/*` 는 자동으로 삭제하지 않습니다.

---

## 요약

이 레포는 다음을 제공합니다.

- Codex용 전역 메타 하네스 생성기
- 프로젝트 내부의 로컬 실행 하네스 팀 자동 생성
- 역할 기반 하네스 구조
- orchestrator 중심 흐름
- run-harness 기동 진입점
- QA / 검증 포함 구조
- 향후 프로젝트 특화 실행 하네스로 확장 가능한 기반

즉 이 시스템은

👉 **하네스를 실행하는 도구**라기보다  
👉 **프로젝트별 실행 하네스 팀을 만들어내고 기동할 수 있게 하는 도구**

입니다.
