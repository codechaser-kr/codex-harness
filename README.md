# harness (Codex)

`harness`는 Codex용 전역 스킬이자, 현재 프로젝트에 맞는 **로컬 실행 하네스 팀**을 구성하는 `Codex용 Team-Architecture Factory`입니다.

이 저장소는 Codex 런타임에 맞는 프로젝트별 하네스 생성을 목표로 합니다. 도메인 설명과 저장소 근거를 읽고, 프로젝트별 역할 팀 아키텍처, 에이전트 정의, 역할 스킬, 오케스트레이션 흐름, QA/검증 구조, 재진입 운영 기준을 생성합니다.

이 프로젝트는 Codex의 실행 방식에 맞춰 주 에이전트가 오케스트레이션과 통합을 맡고, 독립 입력과 독립 산출이 있는 작업만 subagent로 좁게 위임합니다.

## 한눈에 보기

- 전역에서 사용할 수 있는 `harness` 스킬을 제공합니다.
- 전역 `harness` 스킬 배포본과 참고 문서를 포함합니다.
- 프로젝트별 실행 하네스 팀을 생성하는 메타 하네스의 소스 저장소입니다.

## 이 저장소와 타겟 프로젝트

이 저장소는 하네스 자체를 개발하고 배포하는 **메타 저장소**입니다. 전역 `harness` 스킬의 배포본, 생성 기준 문서, 품질 점검 문서를 함께 관리합니다.

타겟 프로젝트는 `harness`를 실행하는 대상 저장소입니다. 전역 `harness` 스킬은 타겟 프로젝트를 읽고, 그 프로젝트 안에 `.codex/agents/*`, `.agents/skills/*`, `.harness/docs/*` 같은 로컬 실행 하네스 자산을 생성합니다.

따라서 이 문서에서 말하는 생성물은 기본적으로 타겟 프로젝트 안에 생기는 파일을 뜻합니다. 이 저장소 루트의 `AGENTS.md`, `.gemini/styleguide.md`, `.github/*`는 메타 저장소를 리뷰하고 운영하기 위한 로컬 협업 지침입니다.

## 저장소 구성

이 저장소의 주요 구성은 다음과 같습니다.

- `.codex-dist/skills/harness/SKILL.md`: Codex에 설치되는 전역 `harness` 스킬 진입점
- `.codex-dist/skills/harness/references/*`: 하네스 Phase 선택 기준, 역할 설계, 에이전트 생성, QA, 로그, 재진입, 자기진화 기준
- `install.sh`, `uninstall.sh`: 전역 Codex 스킬 경로에 배포본을 설치하거나 제거하는 스크립트
- `docs/development-quality-evaluation.md`: 하네스 생성기 품질 평가 기준
- `docs/document-regression-checklist.md`: README와 reference 문서 변경 후 회귀 점검 기준
- `docs/github-workflow-engine.md`: GitHub 이슈/PR 기반 Workflow Engine 설계
- `docs/evaluations/*`: 타겟 프로젝트 평가 기록과 반복 결함 승격 판단 근거
- `.github/*`: 이 저장소의 이슈/PR 협업 템플릿
- `AGENTS.md`, `.gemini/styleguide.md`: 이 저장소에서 자동 리뷰 도구가 따르는 리뷰 코멘트 작성 지침

## 전역 하네스 스킬 설치

전역에서 사용하려면 설치 스크립트로 `harness` 스킬을 Codex 스킬 경로에 배치합니다.

```sh
curl -fsSL https://raw.githubusercontent.com/codechaser-kr/codex-harness/main/install.sh | sh
```

저장소를 클론한 상태라면 로컬 배포본을 바로 설치할 수 있습니다.

```sh
./install.sh
```

설치 경로:

```text
소스: .codex-dist/skills/harness
대상: $HOME/.codex/skills/harness
```

배치한 뒤 대상 디렉터리에 다음 항목이 있는지 확인합니다.

```text
$HOME/.codex/skills/harness
$HOME/.codex/skills/harness/SKILL.md
$HOME/.codex/skills/harness/references/
```

설치 범위:

- 전역 `harness` 스킬 디렉터리를 배치합니다.

## 전역 하네스 스킬의 구성

설치된 전역 `harness` 스킬의 진입점은 `SKILL.md`입니다. 이 파일은 전체 실행 흐름을 안내하고, `references/`는 하네스 Phase 선택 기준, 역할 설계, 에이전트 생성, QA, 로그, 재진입 기준을 나눠 담습니다.

전역 스킬은 타겟 프로젝트의 에이전트 팀과 역할 스킬을 미리 고정해 두지 않습니다. 하네스 구성을 요청받으면 타겟 저장소와 사용자 입력을 읽고, 필요한 하네스 Phase를 선택해 프로젝트에 맞는 에이전트 팀과 역할 스킬을 생성합니다.

전역 `harness` 스킬은 다음 하네스 Phase로 동작합니다.

- `하네스 Phase 0`: 현재 하네스 현황을 감사(audit)하고 시작 상태를 정합니다.
- `하네스 Phase 1`: 도메인과 작업 경계를 분석합니다.
- `하네스 Phase 2`: 프로젝트 맞춤 에이전트 팀과 `team-spec`을 설계합니다.
- `하네스 Phase 3`: `team-spec`을 바탕으로 에이전트 정의를 생성합니다.
- `하네스 Phase 4`: 역할별 로컬 스킬을 생성합니다.
- `하네스 Phase 5`: 시작 진입 역할과 오케스트레이션 흐름을 연결합니다.
- `하네스 Phase 6`: 생성된 구조를 검증하고 운영 감사 판정을 내립니다.
- `하네스 Phase 7`: 피드백과 반복 학습 후보를 반영합니다.

## 타겟 프로젝트의 하네스 생성 흐름

하네스는 타겟 프로젝트를 고정 템플릿으로 한 번에 덮어쓰지 않습니다. 전역 `harness` 스킬을 설치한 뒤, 하네스를 구성하려는 타겟 프로젝트 루트에서 Codex에게 아래처럼 요청하면 됩니다.

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

프로젝트가 아직 초기 단계라면 도메인 설명만 함께 적어도 시작할 수 있습니다.

```text
병원 예약 관리 서비스를 만들 예정입니다.
이 도메인에 맞는 하네스 팀을 구성해줘.
```

그러면 전역 `harness` 스킬이 요청을 받은 저장소와 사용자 입력을 함께 읽고, 해당 프로젝트 안에 로컬 실행 하네스 스킬과 루트 기준 탐색 구조를 생성합니다.

초기화 직후에는 `exploration-notes.md`, `project-setup.md`, `team-spec.md` 같은 시작 문서만 준비됩니다. 이후 역할 팀이 저장소를 다시 읽으며 분석 문서, 운영 문서, 로컬 역할 자산을 순서대로 채웁니다.

하네스를 구성한 뒤 실제 작업도 하네스 흐름으로 진행하고 싶다면, 요청에 하네스 모드를 함께 적는 편이 가장 확실합니다.

```text
하네스 모드로 진행해주세요.
- 역할 분리와 오케스트레이션 흐름을 적용해 주세요.
- QA 관점을 포함해 주세요.
- 필요한 근거는 .harness/docs 문서에 반영해 주세요.

요청:
[여기에 실제 요청]
```

입력 정보가 아직 부족한 경우에는 바로 역할을 단정하지 않고, 시작 진입 역할이 프로젝트 성격, 핵심 사용자, 첫 성공 시나리오 같은 사용자 질문을 남긴 뒤 다음 역할 흐름으로 넘어가도록 설계되어 있습니다.

요청을 받으면 전역 스킬은 저장소 근거와 사용자 입력을 읽으며 로컬 실행 팀을 단계적으로 구성합니다.

보통 다음 순서로 동작합니다. 아래 번호는 하네스 Phase 번호가 아니라 타겟 프로젝트에서 보이는 실행 순서입니다.

0. 현재 하네스 현황부터 감사(audit)를 수행합니다.
1. 사용자 입력, 저장소 근거, 기존 로그를 읽고 시작 조건을 정리합니다.
2. 타겟 프로젝트에 맞는 역할 팀 아키텍처와 `team-spec`을 설계합니다.
3. `team-spec`으로 `.codex/agents/*`와 `.agents/skills/*`를 생성합니다.
4. 시작 진입 역할과 오케스트레이터 흐름을 연결합니다.
5. QA/운영 감사 역할이 구조, 역할 경계, 실행 흐름을 검증합니다.
6. 실행 로그를 남기고 다음 재진입 지점을 정리합니다.
7. 반복 실행에서 드러난 병목과 학습 후보를 역할 정의, 스킬, 오케스트레이션에 반영합니다.

이후 여러 타겟 프로젝트에서 같은 결함이 반복될 때만 생성기 reference 보강 후보로 승격합니다. 이 승격 판단은 별도 하네스 Phase가 아니라 메타 저장소 차원의 후속 관리입니다.

세부 하네스 Phase 선택 기준은 `.codex-dist/skills/harness/references/phase-selection-matrix.md`에서 관리하고, 초기 생성물이 갖춰야 할 기준은 `.codex-dist/skills/harness/references/initial-generation-contract.md`에서 관리합니다.

## 생성 결과

하네스 구성의 핵심 결과는 타겟 프로젝트 안에 생성되는 로컬 에이전트 팀과 역할 스킬입니다. 초기화 직후에는 시작 진입점, 기본 설정, 보조 입력, 로그 기준이 먼저 준비됩니다.

```text
repo/
├── AGENTS.md
├── .codex/
│   ├── config.toml
│   └── agents/
│       └── run-harness.toml
├── .agents/
│   └── skills/
│       └── run-harness/
└── .harness/
    ├── docs/
    │   ├── exploration-notes.md
    │   ├── project-setup.md
    │   ├── team-spec.md
    │   └── logging-policy.md
    ├── logs/
    │   ├── session-log.md
    │   └── latest-session-summary.md
    └── scenarios/
```

저장소 분석과 팀 설계가 진행되면 `team-spec`에 맞춘 프로젝트 특화 역할이 추가됩니다. 아래 목록은 예시이며, 실제 역할 이름과 개수는 타겟 프로젝트의 도메인과 실패 경계에 따라 달라집니다.

```text
repo/
├── .codex/
│   ├── config.toml
│   └── agents/
│       ├── intake-router.toml
│       ├── workspace-map-analyst.toml
│       ├── boundary-architect.toml
│       ├── interaction-qa.toml
│       ├── release-auditor.toml
│       └── team-orchestrator.toml
├── .agents/
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
        └── team-structure.md
```

대표적인 생성물은 다음과 같습니다.

- `AGENTS.md`: 상위 운영 기준과 하네스 진입 규칙
- `.codex/config.toml`: 프로젝트 로컬 에이전트 런타임 설정
- `.codex/agents/*.toml`: 프로젝트 특화 역할 정의와 실행 설정
- `.agents/skills/*`: 각 역할이 실제로 따르는 프로젝트 로컬 역할 스킬
- `.harness/docs/exploration-notes.md`: 자동 판단 보류를 위한 약한 메모
- `.harness/docs/project-setup.md`: 사용자 입력과 초기 방향 메모
- `.harness/docs/team-spec.md`: 프로젝트 맞춤 역할 팀 초안과 최종 역할 인벤토리
- `.harness/docs/domain-analysis.md`, `.harness/docs/qa-strategy.md`: 역할 팀이 공유하는 저장소 분석과 검증 기준
- `.harness/docs/harness-architecture.md`, `.harness/docs/orchestration-plan.md`, `.harness/docs/team-structure.md`, `.harness/docs/team-playbook.md`: 오케스트레이터와 운영 감사 역할이 읽는 보조 운영 문서
- `.harness/docs/logging-policy.md`: 로그 기록 기준과 세션 종료 요약 기준
- `.harness/logs/*`: 세션 로그와 최신 세션 요약

문서는 역할 자산을 대신하지 않습니다. 초기 구성 직후에는 시작 진입점과 최소 입력만 준비되고, 이후 역할 팀이 저장소를 다시 읽으며 필요한 분석과 운영 기준을 채웁니다.

이렇게 생성되는 로컬 하네스의 구조는 다음과 같습니다.

- 하네스의 본체는 Codex 에이전트 정의, 역할 스킬, 시작 진입 역할, 오케스트레이션 구조입니다.
- 파이프라인, 팬아웃/팬인, 전문가 풀, 생성-검증, 감독자, 계층적 위임 패턴을 기본 판단 축으로 사용합니다.
- `.harness/docs`는 역할 팀과 오케스트레이터가 공유하는 보조 입력과 운영 기준을 담습니다.
- `.harness/logs`는 실행 결과를 다음 재진입과 개선 판단에 연결하는 운영 기록입니다.
- 특정 프레임워크에 과하게 고정하지 않습니다.
- 프로젝트마다 역할 수, 역할명, 실행 패턴, 검증 흐름이 달라질 수 있다는 전제를 둡니다.
- 언어, 구조, 경계 해석은 타겟 저장소 재독해와 사용자 입력을 기준으로 합니다.
- 하네스 설계의 주 입력은 저장소 근거, 사용자 입력, 기존 하네스 상태, 세션 로그입니다.

## 프로젝트 특화 에이전트 팀

하네스는 실행 대상인 타겟 저장소를 읽고, 그 프로젝트에 맞는 역할 팀을 설계합니다.
타겟 프로젝트 하네스 생성 흐름에서 `하네스 Phase 2: 프로젝트 맞춤 에이전트 팀 설계`는 타겟 저장소의 도메인, 실패 비용, 운영 흐름에 맞는 `team-spec`을 만드는 단계입니다. `하네스 Phase 3: 에이전트 정의 생성`은 그 스펙을 바탕으로 프로젝트 특화 에이전트 팀을 생성합니다.

최종 역할 이름은 저장소마다 달라질 수 있습니다. `team-spec`에는 그 역할명이 타겟 저장소의 도메인과 실패 경계를 더 잘 설명하는 근거가 함께 남아야 합니다.

역할 팀은 고정된 직무명 묶음이 아니라, 타겟 프로젝트에서 실제로 나뉘어야 하는 책임과 검증 경계를 기준으로 구성됩니다.

예를 들어 결제 시스템이라면 결제 처리, 정산 검토, 체크아웃 QA가 중요한 역할 축이 될 수 있습니다. Electron 런타임 중심 앱이라면 데스크톱 런타임, IPC 경계, 배포 검증이 더 중요해질 수 있습니다. 운영/배포 중심 프로젝트라면 릴리스 조율과 배포 검증 역할이 앞에 놓일 수 있습니다.

QA와 운영 감사 역할도 이 프로젝트 특화 역할 팀의 일부로 함께 설계됩니다.

중요한 것은 고정된 역할 이름이 아니라, 타겟 프로젝트에 맞는 역할 집합이 실제로 생성되는 것입니다. 각 역할 스킬은 언제 시작하고 무엇을 먼저 읽으며 어떤 결과를 남길지, 다음 역할이나 재진입 기준을 어떻게 판단할지 실행 가능한 형태로 담아야 합니다.

`team-spec`의 최종 역할 인벤토리가 먼저 확정되고, 생성기는 그 역할들만 읽어 프로젝트별 실행 팀을 구성합니다.

신규 구축에서는 생성 직후의 하네스도 자기진화 루프를 시작할 수 있어야 합니다. 초기 생성물에는 다음 시작 역할, 다음 하네스 재진입 Phase, 학습 후보 기록 위치가 남아야 하며, 이 기준은 `.codex-dist/skills/harness/references/initial-generation-contract.md`에서 관리합니다.

## 현재 범위와 한계

이 저장소의 현재 목표는 **Codex 중심 범용 하네스 메타 프레임워크**입니다.

즉, 이 저장소는 어떤 프로젝트에나 공통으로 적용할 수 있는 역할 팀과 운영 기반을 앞에 두되, 루트 기준 저장소 재독해와 재진입 운영 기준에 맞춰 설계하는 데 집중합니다. 반대로 프로젝트마다 크게 달라지는 실행 기준과 검증 절차는 기본값으로 고정하지 않습니다.

프로젝트별로 확장하는 영역은 다음과 같습니다.

- `expected-state` 비교
  각 프로젝트에서 "어떤 상태를 정상으로 볼 것인가"가 다르기 때문에, 전역 기본 스킬이 공통 규칙으로 단정하기 어렵습니다. 예를 들어 문서 저장소, 웹 애플리케이션, 백엔드 서비스는 기대 상태 자체가 다릅니다.
- `diff` 엔진 실행
  무엇을 어떻게 비교해야 의미 있는지 역시 프로젝트마다 다릅니다. 파일 구조 비교가 중요한 경우도 있고, 설정 값이나 실행 결과 비교가 중요한 경우도 있습니다.
- 시나리오 실행 자동화
  시나리오는 각 프로젝트의 핵심 흐름, 실패 위험, 읽기 우선순위에 맞게 설계해야 합니다. 그래서 범용 하네스가 미리 정답을 넣기보다, 프로젝트 구조와 요구사항을 본 뒤 대화를 통해 필요한 시나리오를 적고 발전시키는 편이 맞습니다.
- 프로젝트 특화 실행 검증기
  실제 검증 로직은 프로젝트의 언어, 프레임워크, 테스트 방식, 배포 구조에 따라 달라집니다. 이런 부분은 공통 생성기보다 프로젝트 로컬 하네스에서 직접 작성하는 것이 더 안전합니다.

이런 영역은 보통 하네스를 구성한 뒤, 프로젝트 내부의 로컬 역할 팀이 프로젝트 담당자와의 대화를 토대로 실제 문서와 규칙을 직접 다시 씁니다. 예를 들어 `.harness/docs` 문서에서 중요한 흐름과 실패 유형을 적고, 반복되는 읽기 흐름을 시나리오, 프로젝트 전용 스킬, 검증 절차로 확장하는 방식입니다.

즉 현재 단계의 `harness`는 완성된 프로젝트 전용 실행기라기보다, 그런 특화 하네스를 각 저장소 안에서 만들어 갈 수 있게 출발점을 제공하는 메타 하네스에 가깝습니다.

## 자기진화 원칙

하네스의 진화는 별도 스크립트나 외부 실행기에 의존하지 않습니다. 실제 작업에서 확인한 새 저장소 사실, 반복될 수 있는 판단, 검증 공백, 역할 오판은 역할 출력과 `.harness/logs/*` Markdown 로그에 남깁니다. 이후 운영 감사 역할이 어느 문서나 스킬로 승격할지 판단합니다.

단일 타겟 프로젝트에서 나온 관찰은 먼저 그 프로젝트의 `team-spec`, 역할 스킬, 운영 문서, QA 기준을 보강하는 입력으로 씁니다. 여러 타겟 프로젝트에서 같은 결함이 반복될 때만 전역 `harness` 스킬이나 `references/` 보강 후보로 승격합니다.

이 기준은 `.codex-dist/skills/harness/references/evolution-contract.md`에서 관리합니다.

생성기 개발 중 타겟 평가 결과는 `docs/evaluations/targets/` 아래에 남깁니다. 이 기록은 단일 타겟 프로젝트 관찰과 반복 결함을 구분하고, 생성기 reference 보강이 필요한지 판단하는 근거로 씁니다.

문서와 reference를 수정한 뒤에는 `docs/document-regression-checklist.md`를 기준으로 회귀를 점검합니다. 이 점검은 새 스크립트를 도입하지 않고, Markdown 계약과 reference 연결이 같은 운영 모델을 유지하는지 확인하는 절차입니다.

## 제거

전역 스킬 제거는 `$HOME/.codex/skills/harness`를 대상으로 합니다. 각 프로젝트 내부에 생성된 `.agents/skills/*`, `.harness/*`는 프로젝트별 자산으로 따로 관리합니다.

```sh
curl -fsSL https://raw.githubusercontent.com/codechaser-kr/codex-harness/main/uninstall.sh | sh
```

저장소를 클론한 상태라면 다음 명령을 사용할 수 있습니다.

```sh
./uninstall.sh
```
