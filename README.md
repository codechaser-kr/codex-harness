# harness (Codex)

`harness`는 Codex용 전역 스킬이자, 현재 프로젝트에 맞는 **로컬 실행 하네스 팀**을 구성하는 `Codex 중심 메타 프레임워크`입니다.

이 저장소는 입력 메모와 사용자 입력을 준비한 뒤, 역할 스킬이 루트 기준으로 저장소를 다시 읽어 역할 기반 스킬 팀, 오케스트레이션 흐름, QA/검증 구조, 시작 진입 역할, 운영 루프를 설계하는 도구입니다.

`harness`는 프로젝트 내부에 실제로 작동하는 실행 기반을 만들고, 상태 점검 / 정렬 / 개선까지 다루는 Codex용 하네스 엔지니어링 시스템입니다.

## 한눈에 보기

- 전역에 설치되는 `harness` 스킬을 제공합니다.
- 설치 스크립트와 제거 스크립트를 함께 제공합니다.
- 전역 `harness` 스킬 배포본과 참고 문서를 포함합니다.
- 프로젝트별 실행 하네스 팀을 생성하는 메타 하네스의 소스 저장소입니다.

## 설계 원칙

- 하네스의 본체는 Codex 에이전트 설정, 역할 스킬, 시작 진입 역할, 오케스트레이션 구조입니다.
- `.harness/docs`는 저장소 입력 문서와 하네스 운영 문서가 함께 있습니다.
- `exploration-notes.md`, `domain-analysis.md`, `qa-strategy.md`는 저장소 입력 문서입니다.
- `harness-architecture.md`, `orchestration-plan.md`, `team-structure.md`, `team-playbook.md`는 하네스 메타시스템 문서입니다.
- 특정 프레임워크에 과하게 고정하지 않습니다.
- 프로젝트별로 확장 가능한 구조를 기본값으로 둡니다.
- 언어, 구조, 경계 해석은 루트 기준 저장소 재독해를 기준으로 합니다.
- 하네스 설계의 주 입력은 입력 메모, 사용자 입력, 그리고 역할 스킬의 저장소 재독해입니다.

## 설치

원격 설치:

```bash
curl -fsSL https://raw.githubusercontent.com/codechaser-kr/codex-harness/main/install.sh | bash
```

저장소를 클론해서 설치:

```bash
git clone https://github.com/codechaser-kr/codex-harness.git
cd codex-harness
./install.sh
```

설치가 끝나면 전역에 다음 경로가 추가됩니다.

```text
$HOME/.codex/skills/harness
```

설치 스크립트는 다음 원칙을 따릅니다.

- 전역 `AGENTS.md`를 생성하거나 수정하지 않습니다.
- 기존 전역 설정을 덮어쓰지 않습니다.
- 설치 대상은 전역 `harness` 스킬 디렉토리입니다.

## 생성 결과

하네스 초기화 직후에는 먼저 아래 구조가 만들어집니다.

```text
repo/
├── AGENTS.md
├── .codex/
└── .harness/
    ├── docs/
    │   ├── exploration-notes.md
    │   ├── project-setup.md
    │   ├── team-spec.md
    │   └── logging-policy.md
    ├── logs/
    │   ├── session-log.md
    │   ├── session-events.tsv
    │   ├── latest-session-summary.md
    │   └── role-frequency.md
    ├── scenarios/
    └── templates/
```

`Phase 2`와 `Phase 3`까지 진행되면 아래 자산이 추가로 채워집니다.

```text
repo/
├── .codex/
│   ├── config.toml
│   ├── agents/
│   │   ├── intake-router.toml
│   │   ├── workspace-map-analyst.toml
│   │   ├── boundary-architect.toml
│   │   ├── interaction-qa.toml
│   │   ├── release-auditor.toml
│   │   └── team-orchestrator.toml
│   └── skills/
│       ├── intake-router/
│       ├── workspace-map-analyst/
│       ├── boundary-architect/
│       ├── interaction-qa/
│       ├── release-auditor/
│       └── team-orchestrator/
└── .harness/
    └── docs/
        ├── domain-analysis.md
        ├── harness-architecture.md
        ├── orchestration-plan.md
        ├── qa-strategy.md
        ├── team-playbook.md
        ├── team-structure.md
        └── template-candidates.md
```

대표적인 생성물은 다음과 같습니다.

- `AGENTS.md`: 상위 운영 기준과 기본 진입 규칙
- `.codex/config.toml`: 프로젝트 에이전트 런타임 설정
- `.codex/agents/*.toml`: 에이전트 역할과 실행 설정
- `.codex/skills/*`: 역할별 로컬 스킬
- `.harness/docs/exploration-notes.md`: 자동 판단 보류를 위한 약한 메모
- `.harness/docs/project-setup.md`: 사용자 입력과 초기 방향 메모
- `.harness/docs/team-spec.md`: 프로젝트 맞춤 역할 팀 초안과 최종 역할 인벤토리
- `.harness/docs/domain-analysis.md`, `.harness/docs/qa-strategy.md`: 저장소 입력 문서
- `.harness/docs/harness-architecture.md`, `.harness/docs/orchestration-plan.md`, `.harness/docs/team-structure.md`, `.harness/docs/team-playbook.md`: 하네스 운영 문서
- `.harness/docs/logging-policy.md`: 로그 기록 기준과 세션 종료 요약 기준
- `.harness/logs/*`: 세션 로그, 이벤트, 요약, 역할 빈도
- `.harness/templates/*.md`: 반복 작업 흐름을 재사용할 수 있게 정리한 템플릿 파일
- `.harness/docs/template-candidates.md`: 반복 작업 흐름 중 템플릿 후보 분석 결과

즉 init 직후에는 입력 메모, 로그 기준, `team-spec` 같은 시작 문서만 먼저 생기고, 이후 역할 팀이 분석 문서와 로컬 역할 자산을 채우는 구조입니다.

## 어떻게 쓰는가

설치한 뒤 아무 프로젝트에서 Codex에게 아래처럼 요청하면 됩니다.

```text
이 프로젝트에 하네스를 구성해줘
```

또는

```text
실행 하네스 팀 만들어줘
```

또는 다음처럼 요청해도 됩니다.

```text
이 저장소에 맞는 역할 팀과 QA 흐름을 설계해줘
```

```text
프로젝트 특화 에이전트 팀을 구성해줘
```

그러면 전역 `harness` 스킬이 현재 저장소를 읽고, 프로젝트 내부에 로컬 실행 하네스 스킬과 루트 기준 AI 탐색 구조를 생성합니다.

초기화 직후에는 `exploration-notes.md`, `project-setup.md`, `team-spec.md` 같은 시작 문서만 준비됩니다. 이후 역할 팀이 저장소를 다시 읽으며 분석 문서, 운영 문서, 로컬 역할 자산을 순서대로 채웁니다.

하네스를 구성한 뒤 실제 작업을 하네스 흐름으로 태우고 싶다면, 요청에 하네스 모드를 함께 적는 편이 가장 확실합니다.

```text
하네스 모드로 진행해주세요.
- 역할 분리와 오케스트레이션 흐름을 적용해 주세요.
- QA 관점을 포함해 주세요.
- 필요한 근거는 .harness/docs 문서에 반영해 주세요.

요청:
[여기에 실제 요청]
```

입력 정보가 아직 부족한 경우에는 바로 역할을 단정하지 않고, 시작 진입 역할이 프로젝트 성격, 핵심 사용자, 첫 성공 시나리오 같은 사용자 질문을 남긴 뒤 다음 역할 흐름으로 넘어가도록 설계되어 있습니다.

## 프로젝트 특화 에이전트 팀

목표 구조에서 하네스는 현재 저장소를 읽고 프로젝트 특화 역할 팀을 설계합니다.
`Phase 2 프로젝트 맞춤 에이전트 팀 설계`에서 현재 저장소 도메인에 맞는 `team-spec`을 만들고, `Phase 3 에이전트 정의 생성`에서 그 스펙을 바탕으로 프로젝트 특화 에이전트 팀을 동적으로 생성합니다.

즉 최종 역할 이름은 저장소마다 달라질 수 있고, `team-spec`에는 왜 그 역할명이 현재 저장소의 도메인과 실패 경계를 더 잘 설명하는지 근거가 함께 남아야 합니다.

권장 형식은 `role_id`는 snake_case, 표시 이름과 파일명은 kebab-case입니다. 중요한 것은 형식 자체보다도, 역할명이 저장소 고유 용어와 실패 경계를 직접 드러내야 한다는 점입니다.

예:

- 결제 시스템: `payment-dev`, `billing-reviewer`, `checkout-qa`
- Electron 런타임 중심 앱: `desktop-runtime-dev`, `ipc-reviewer`
- 운영/배포 중심 프로젝트: `release-orchestrator`, `deploy-validator`

QA와 운영 감사 역할도 이 프로젝트 특화 역할 팀의 일부로 함께 설계됩니다.

중요한 것은 고정된 역할 이름이 아니라, 타겟 프로젝트에 맞는 역할 집합이 실제로 생성되고 각 역할 스킬이 대표 시작 경로, 요청 분기, 우선 입력 문서, 시작 체크리스트, 판단 기준, 출력 형식, 재진입/종료 규칙, 완료 기준까지 실제 실행 형태로 담는 것입니다.

`team-spec`의 최종 역할 인벤토리가 먼저 확정되고, 생성기가 그 역할들만 읽어 프로젝트별 실행 팀을 구성합니다.

## 동작 방식

이 시스템은 보통 다음 순서로 동작합니다.

0. 현재 하네스 현황을 먼저 감사합니다.
1. 입력 메모, 역할 설계 규칙, 로그 구조를 생성합니다.
2. 자동 메모와 사용자 입력 준비 상태를 확인합니다.
3. 저장소를 읽고 도메인 분석, 팀 스펙, 메타시스템 문서를 작성합니다.
4. 팀 스펙을 바탕으로 프로젝트 특화 실행 팀을 동적으로 생성합니다.
5. 생성된 팀이 QA/운영 기준 문서를 완성합니다.
6. 운영 감사 역할이 구조와 운영 기준을 검증합니다.
7. 마지막에 품질 비교와 성숙도 평가를 통해 다음 재진입 지점을 정리합니다.

## 로그 운영

이 시스템은 역할 호출 흐름이 실제로 어떻게 진행됐는지 남기기 위해 로그를 수집합니다. 핵심 목적은 단순 기록이 아니라, 어떤 역할 조합과 작업 흐름이 반복되는지 축적해서 더 재사용 가능한 운영 방식으로 정리하는 것입니다.

하네스는 운영 과정에서 로그를 남기도록 설계되어 있습니다. 로그 기록과 집계는 관련 스크립트와 운영 기준을 통해 이루어지며, 누적된 로그를 바탕으로 세션 요약을 보고, 역할 호출 빈도를 집계하고, 반복 작업 흐름을 `.harness/docs/template-candidates.md`에 후보로 정리한 뒤, 필요하면 `.harness/templates/*.md` 형태의 재사용 가능한 템플릿으로 발전시킬 수 있습니다.

필요할 때는 `harness-log.sh`, `harness-session-close.sh`, `harness-role-stats.sh`, `harness-template-candidates.sh`를 보조적으로 실행해 로그나 통계를 다시 정리할 수 있습니다.

하네스를 구성한 프로젝트에서는 보통 다음 파일에서 로그 규칙, 최근 세션 요약, 역할 호출 통계를 확인합니다.

- `.harness/docs/logging-policy.md`
- `.harness/logs/session-log.md`
- `.harness/logs/latest-session-summary.md`
- `.harness/logs/role-frequency.md`

반복 작업 흐름 분석을 실행한 뒤에는 다음 파일도 확인할 수 있습니다.

- `.harness/docs/template-candidates.md`

## 현재 범위와 한계

이 저장소의 현재 목표는 **Codex 중심 범용 하네스 메타 프레임워크**입니다.

즉, 이 저장소는 어떤 프로젝트에나 공통으로 적용할 수 있는 역할 팀과 운영 기반을 앞에 두되, 그것을 루트 기준 저장소 재독해와 운영 루프 위에서 설계하는 데 집중합니다. 반대로 프로젝트마다 크게 달라지는 실행 기준과 검증 절차는 기본값으로 고정하지 않습니다.

## references 체계

`references/`는 부록이 아니라 메타시스템 설계 기준 라이브러리입니다.

기본 읽기 순서:

1. `reference-map.md`
2. 현재 문제 축에 맞는 기준 문서 1~2개
3. 필요할 때만 예시/비교 문서

대표 축:

- 상태 모드 / 실행 모드 / phase 0~7 게이트
- 아키텍처 패턴 선택
- 에이전트 정의와 상위 규칙 정렬
- 스킬 정의와 테스트
- 메타시스템 성숙도 평가
- 상태 점검 / 정렬 / 개선 운영 루프
- validator 감사 기준

현재 기본 하네스가 직접 제공하지 않는 것은 다음과 같습니다.

- `expected-state` 비교
  각 프로젝트에서 "어떤 상태를 정상으로 볼 것인가"가 다르기 때문에, 전역 기본 스킬이 공통 규칙으로 단정하기 어렵습니다. 예를 들어 문서 저장소, 웹 애플리케이션, 백엔드 서비스는 기대 상태 자체가 다릅니다.
- `diff` 엔진 실행
  무엇을 어떻게 비교해야 의미 있는지 역시 프로젝트마다 다릅니다. 파일 구조 비교가 중요한 경우도 있고, 설정 값이나 실행 결과 비교가 중요한 경우도 있습니다.
- 시나리오 실행 자동화
  시나리오는 각 프로젝트의 핵심 흐름, 실패 위험, 읽기 우선순위에 맞게 설계되어야 합니다. 그래서 범용 하네스가 미리 정답을 넣기보다, 프로젝트 구조와 요구사항을 본 뒤 대화를 통해 필요한 시나리오를 적고 발전시키는 편이 맞습니다.
- 프로젝트 특화 실행 검증기
  실제 검증 로직은 프로젝트의 언어, 프레임워크, 테스트 방식, 배포 구조에 따라 달라집니다. 이런 부분은 공통 생성기보다 프로젝트 로컬 하네스에서 직접 작성하는 것이 더 안전합니다.

이런 영역은 보통 하네스를 구성한 뒤, 프로젝트 내부의 로컬 역할 팀이 프로젝트 담당자와의 대화를 바탕으로 실제 문서와 규칙을 직접 다시 씁니다. 예를 들어 `.harness/docs` 문서에서 중요한 흐름과 실패 유형을 적고, 그 다음 반복되는 읽기 흐름을 시나리오나 템플릿으로 만들고, 필요하면 프로젝트 전용 스킬이나 검증 절차로 확장하는 방식입니다.

즉 현재 단계의 `harness`는 완성된 프로젝트 전용 실행기라기보다, 그런 특화 하네스를 각 저장소 안에서 만들어 갈 수 있게 출발점을 제공하는 메타 하네스에 가깝습니다.

상위 수준의 메타시스템 성숙도를 목표로 볼 때도 기준은 “문서가 많아졌는가”가 아니라 “에이전트 팀 / 실행 패턴 / 운영 기준이 실제로 살아 있는가”입니다. 이 판단은 `references/meta-system-maturity-guide.md` 기준으로 합니다.

## 타겟 프로젝트 평가

생성기 변경 후에는 실제 타겟 프로젝트에서 재생성과 평가를 함께 해야 합니다.

권장 절차는 다음과 같습니다.

1. 타겟 프로젝트의 기존 하네스 상태를 먼저 기록합니다.
2. `harness-init.sh` 또는 `harness-update.sh`/시작 진입 역할로 필요한 phase부터 다시 들어갑니다.
3. 역할 작성이 끝난 뒤 `harness-verify.sh`를 실행합니다.
4. verify 통과 후에도 바로 합격 처리하지 않고, `quality-evaluation-guide.md`와 `meta-system-maturity-guide.md` 기준으로 `운영 가능 / 재작성 필요 / 재구성 필요`를 판정합니다.
5. 판정 결과에 따라 다음 재진입 phase를 정합니다.

구체적인 타겟 프로젝트 절차와 체크리스트는 `references/target-evaluation-playbook.md`를 기준으로 봅니다.

## references

전역 `harness` 스킬은 다음 참고 문서를 함께 사용합니다.

- `references/agent-design-patterns.md`
- `references/meta-system-maturity-guide.md`
- `references/orchestrator-template.md`
- `references/skill-writing-guide.md`
- `references/skill-testing-guide.md`
- `references/qa-agent-guide.md`
- `references/team-examples.md`
- `references/target-evaluation-playbook.md`

이 문서들은 실행 하네스 팀을 설계하고 다시 쓰기 위한 지식 베이스입니다.

## 제거

클론한 저장소가 있다면 다음으로 제거할 수 있습니다.

```bash
./uninstall.sh
```

저장소를 클론하지 않고 설치했다면:

```bash
curl -fsSL https://raw.githubusercontent.com/codechaser-kr/codex-harness/main/uninstall.sh | bash
```

직접 제거:

```bash
rm -rf "$HOME/.codex/skills/harness"
```

제거 스크립트도 전역 `AGENTS.md`를 생성하거나 수정하지 않습니다. 이미 각 프로젝트 내부에 생성된 `.codex/skills/*`, `.harness/*`는 자동으로 삭제하지 않습니다.
