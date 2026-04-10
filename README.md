# harness (Codex)

`harness`는 Codex용 전역 스킬이자, 현재 프로젝트에 맞는 **로컬 실행 하네스 팀**을 구성하는 `Codex 중심 메타 프레임워크`입니다.

이 저장소는 문서만 만드는 도구가 아닙니다. 입력 메모와 사용자 입력을 준비한 뒤, 역할 스킬이 루트 기준으로 저장소를 다시 읽어 역할 기반 스킬 팀, 오케스트레이션 흐름, QA/검증 구조, `run-harness` 진입점, 운영 루프를 설계합니다.

`harness`는 프로젝트 내부에 실제로 작동하는 실행 기반을 만들고, drift / sync / evolve까지 다루는 Codex용 하네스 엔지니어링 시스템입니다.

설계 기준 문서는 `.codex-dist/skills/harness/references/reference-map.md`를 인덱스로 삼아 읽습니다.

## 한눈에 보기

- 전역에 설치되는 `harness` 스킬을 제공합니다.
- 설치 스크립트와 제거 스크립트를 함께 제공합니다.
- 전역 `harness` 스킬 배포본과 참고 문서를 포함합니다.
- 프로젝트별 실행 하네스 팀을 생성하는 메타 하네스의 소스 저장소입니다.

## 설계 원칙

- 하네스의 본체는 Codex 에이전트 설정, 역할 스킬, `run-harness`, 오케스트레이션 구조입니다.
- `.harness/reports`는 한 종류가 아닙니다.
- `exploration-notes.md`, `domain-analysis.md`, `qa-strategy.md`는 저장소 입력 문서입니다.
- `harness-architecture.md`, `orchestration-plan.md`, `team-structure.md`, `team-playbook.md`는 하네스 메타시스템 문서입니다.
- QA와 validator는 실행 하네스의 일부입니다.
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

하네스 초기화가 끝나면 기본적으로 다음과 같은 구조가 생깁니다.

```text
repo/
├── AGENTS.md
├── .codex/
│   ├── config.toml
│   ├── agents/
│   │   ├── domain-analyst.toml
│   │   ├── harness-architect.toml
│   │   ├── skill-scaffolder.toml
│   │   ├── qa-designer.toml
│   │   ├── orchestrator.toml
│   │   ├── validator.toml
│   │   └── run-harness.toml
│   └── skills/
│       ├── domain-analyst/
│       ├── harness-architect/
│       ├── skill-scaffolder/
│       ├── qa-designer/
│       ├── orchestrator/
│       ├── validator/
│       └── run-harness/
└── .harness/
    ├── reports/
    │   └── exploration-notes.md
    ├── logs/
    │   ├── session-log.md
    │   ├── session-events.tsv
    │   ├── latest-session-summary.md
    │   └── role-frequency.md
    ├── scenarios/
    ├── templates/
    └── logging-policy.md
```

현재 저장소는 아직 고정 seed 역할 생성 구조를 포함하고 있지만, 목표 구조에서는 `Phase 2`가 단순 초안이 아니라 실제 프로젝트 맞춤 `team-spec`을 만들고 `Phase 3`이 그 스펙을 바탕으로 `.codex/agents/*.toml`, `.codex/skills/*`, `.codex/config.toml`을 동적으로 생성해야 합니다. 이 기준 문서는 `references/team-spec-schema.md`에 둡니다.

핵심 산출물은 `AGENTS.md`, `.codex/config.toml`, `.codex/agents/*.toml`의 로컬 Codex 에이전트 설정, `.codex/skills/*`의 로컬 역할 스킬, 그리고 그 역할이 직접 쓰는 `.harness/reports/*` 문서입니다. `harness-init.sh`는 `exploration-notes.md`, 생성 파이프라인 입력, 로그 구조를 준비하고, 최종 agent/skill 산출은 `Phase 2`와 `Phase 3` 계약을 따라야 합니다. `.harness/logs/*`와 `.harness/logging-policy.md`는 실제 운영 기록과 로그 규칙을 위한 기본 산출물입니다.

현재 구조에서 `.codex/config.toml`과 `.codex/agents/*.toml`은 `harness-init.sh`가 직접 쓰지 않고, 항상 `team-spec`을 읽는 `Phase 3` 생성기가 책임집니다.

운영을 시작하면 초기 생성물 중 일부가 계속 다시 쓰이거나 갱신되고, 운영 결과에 따라 새 파일이 추가될 수도 있습니다. 대표적인 범위는 다음과 같습니다.

- `AGENTS.md`: 상위 운영 계약과 기본 진입 규칙 갱신
- `.codex/config.toml`: 프로젝트 에이전트 런타임 설정 갱신
- `.codex/agents/*.toml`: 에이전트 역할, handoff, phase 책임 갱신
- `.codex/skills/*`: 역할별 실행 계약과 운영 규칙 갱신
- `.harness/reports/exploration-notes.md`: 자동 판단 보류를 위한 약한 메모
- `.harness/reports/domain-analysis.md`, `.harness/reports/qa-strategy.md`: 저장소 분석 입력 문서
- `.harness/reports/harness-architecture.md`, `.harness/reports/orchestration-plan.md`, `.harness/reports/team-structure.md`, `.harness/reports/team-playbook.md`: 하네스 메타시스템 문서
- `.harness/logs/*`: 세션 로그, 이벤트, 요약, 역할 빈도 갱신
- `.harness/templates/*.md`: 반복 작업 흐름을 재사용할 수 있게 정리한 템플릿 파일
- `.harness/reports/template-candidates.md`: 반복 작업 흐름 중 템플릿으로 정리할 만한 후보 분석 결과

## 어떻게 쓰는가

설치한 뒤 아무 프로젝트에서 Codex에게 다음처럼 요청하면 됩니다.

```text
이 프로젝트에 하네스를 구성해줘
```

또는

```text
실행 하네스 팀 만들어줘
```

그러면 전역 `harness` 스킬이 현재 저장소를 읽고, 프로젝트 내부에 로컬 실행 하네스 스킬과 루트 기준 AI 탐색 구조를 생성합니다.

초기화 직후에는 `exploration-notes.md`와 역할 스킬만 준비된 상태입니다. 여기서 `exploration-notes.md`는 자동 판단 보류를 위한 약한 메모이며, 기본 흐름은 `harness-init.sh`로 이 메모와 역할 입력을 준비한 뒤, `run-harness`와 역할 스킬이 저장소를 다시 읽어 각 보고서를 직접 작성하고, 마지막에 `harness-verify.sh`로 확인하는 순서입니다.

완료로 보기 위한 최소 기준은 아래와 같습니다.

- `exploration-notes.md`가 자동 판단 보류를 위한 약한 메모로 존재함
- `domain-analysis.md`, `qa-strategy.md`가 저장소 입력 문서로 직접 작성됨
- 비-domain 문서 4종이 하네스 메타시스템 문서로 직접 작성됨
- `run-harness`가 시작 역할과 다음 역할을 분명히 제시함
- `harness-verify.sh`가 구조 누락과 골격 잔존 없이 통과함

입력 정보가 아직 부족한 경우에는 바로 역할을 단정하지 않고, `run-harness`가 프로젝트 성격, 핵심 사용자, 첫 성공 시나리오 같은 사용자 질문을 남긴 뒤 다음 역할 흐름으로 넘어가도록 설계되어 있습니다.

## 프로젝트 특화 에이전트 팀

목표 구조에서 하네스는 고정 역할 세트를 복사하지 않습니다.
대신 `Phase 2 프로젝트 맞춤 에이전트 팀 설계`에서 현재 저장소 도메인에 맞는 `team-spec`을 만들고, `Phase 3 에이전트 정의 생성`에서 그 스펙을 바탕으로 실제 `.codex/agents/*.toml`, `.codex/skills/*`, `.codex/config.toml`을 동적으로 생성합니다.

즉 최종 역할 이름은 저장소마다 달라질 수 있고, `team-spec`에는 왜 seed 역할명을 유지하거나 버렸는지 도메인 근거가 함께 남아야 합니다.

권장 형식은 `role_id`는 snake_case, 표시 이름과 파일명은 kebab-case입니다. 중요한 것은 형식 자체보다도, 역할명이 저장소 고유 용어와 실패 경계를 직접 드러내야 한다는 점입니다.

예:

- 결제 시스템: `payment-dev`, `billing-reviewer`, `checkout-qa`
- Electron 런타임 중심 앱: `desktop-runtime-dev`, `ipc-reviewer`
- 운영/배포 중심 프로젝트: `release-orchestrator`, `deploy-validator`

`AGENTS.md`와 `.codex/agents/*.toml`은 `누가 하는가`, 역할 스킬은 `어떻게 하는가`를 담당합니다. 중요한 것은 고정된 역할 이름이 아니라, 타겟 프로젝트에 맞는 역할 집합이 실제로 생성되는 것입니다.

현재 과도기 구조에서는 seed 역할의 상세 SKILL은 기본 템플릿을 유지하지만, `team-spec`에 seed 밖의 새 역할이 추가되면 `Phase 3` 생성기가 해당 역할의 `.codex/skills/*` 기본 스킬도 함께 만듭니다.

## 동작 방식

이 시스템은 보통 다음 순서로 동작합니다.

0. 현재 하네스 현황을 먼저 감사합니다.
1. `harness-init.sh`로 로컬 역할 스킬, 입력 메모, 로그 구조를 생성합니다.
2. 자동 메모와 사용자 입력 준비 상태를 확인합니다.
3. `run-harness`가 현재 상태를 읽고 어느 Phase부터 다시 시작할지 정합니다.
4. `domain-analyst`가 저장소 감사 결과를 바탕으로 도메인/작업 분석을 최종 작성합니다.
5. `harness-architect`가 프로젝트 맞춤 에이전트 팀과 메타시스템 구조를 설계합니다.
6. `Phase 2`가 만든 team-spec을 바탕으로 역할 정의와 로컬 스킬이 동적으로 생성되고, 해당 팀이 QA/운영 계약 문서를 완성합니다.
7. 필요할 때만 `skill-scaffolder`가 로컬 스킬 설명 drift를 정렬합니다.
8. `validator`와 `harness-verify.sh`가 구조/운영 계약을 검증합니다.
9. 마지막에 품질 비교와 성숙도 평가를 통해 다음 재진입 지점을 정리합니다.

## Phase 게이트

하네스는 Phase 이름만 나열하지 않고, 각 Phase가 다음 단계로 넘어갈 최소 조건을 가집니다.

- `Phase 0 저장소 감사`
  - 입력: 저장소 루트, 기존 `AGENTS.md`, `.codex/*`, `.harness/*`
  - 산출: 상태 모드, 실행 모드, 실행 패턴 후보, 재진입 시작점
  - 다음 단계 조건: 현재 하네스 상태와 충돌 지점을 설명할 수 있음
- `Phase 1 도메인/작업 분석`
  - 입력: `exploration-notes.md`, `project-setup.md` 또는 사용자 답변
  - 산출: `domain-analysis.md`
  - 다음 단계 조건: 실제 시작 흐름, 핵심 경계, 실패 비용이 최소한 문서로 고정됨
- `Phase 2 프로젝트 맞춤 에이전트 팀 설계`
  - 입력: `domain-analysis.md`, 상태 모드, 실행 모드, 실행 패턴 후보
  - 산출: `harness-architecture.md`, `team-structure.md`, `team-playbook.md`, `team-spec`
  - 다음 단계 조건: 역할 경계, handoff 기준, 패턴 선택 이유, 동적 생성용 역할 스펙이 고정됨
- `Phase 3 에이전트 정의 생성`
  - 입력: `Phase 2`가 만든 `team-spec`
  - 산출: `AGENTS.md`, `.codex/config.toml`, `.codex/agents/*.toml`, `.codex/skills/*`
  - 다음 단계 조건: team-spec과 생성 결과가 일치하고, 누가 하는가와 어떻게 하는가가 분리됨
- `Phase 4 QA 및 검증 구조`
  - 입력: 저장소 입력 문서와 팀 구조
  - 산출: `qa-strategy.md`, validator 감사 기준, verify 최소 구조 기준
  - 다음 단계 조건: 자동/수동 검증 분리와 승격 기준이 고정되고 validator가 운영 계약 감사 기준을 가짐
- `Phase 5 역할별 최종 산출물 작성`
  - 입력: 입력 문서, 메타시스템 문서, QA 기준, 현재 실행 모드와 패턴
  - 산출: 역할별 최종 보고서 본문
  - 다음 단계 조건: 문서 부재, 골격 잔존, 목적 혼합이 없어야 함
- `Phase 6 검증`
  - 입력: 최종 문서, 에이전트 정의, 역할 스킬, 로그 상태
  - 산출: validator 감사 결과, verify 통과 여부, 재작성 대상 역할
  - 다음 단계 조건: `run-harness`가 다음 재진입 지점을 다시 제시할 수 있음
- `Phase 7 품질 비교와 성숙도 평가`
  - 입력: 검증 완료 상태, `with-skill` / `without-skill` 비교 관찰, 운영 로그
  - 산출: 품질 비교 메모, 성숙도 판단, 다음 개선 대상
  - 다음 단계 조건: 현재 하네스를 `운영 가능 / 재작성 필요 / 재구성 필요` 중 하나로 설명할 수 있음

입력 정보가 아직 부족하면, 위 흐름에 들어가기 전에 `run-harness`가 짧은 사용자 질문을 만들고 그 답을 `domain-analysis`와 이후 오케스트레이션의 입력으로 사용합니다.

즉, 단순 저장소 운영 문서를 만드는 것이 아니라 `저장소 감사 -> 도메인/작업 분석 -> team-spec 설계 -> team-spec 기반 에이전트/스킬 생성 -> QA/검증 구조 -> 역할별 최종 작성 -> 검증 -> 품질 비교와 성숙도 평가` 흐름을 갖춘 실행 하네스 기반을 만드는 것이 목적입니다.

## 입력 기반 분석

이 레포는 자동 경로 수집보다 역할 재해석을 중심으로 동작합니다.

- `package.json`, `Cargo.toml`, 디렉토리명 같은 단서는 자동 확정이 아니라 다시 읽을 출발점 정도로만 사용합니다.
- 실제 해석은 역할 스킬이 저장소와 사용자 입력을 다시 읽어 적습니다.
- `.harness/reports/*` 문서는 init가 쓰지 않고, 역할 스킬이 직접 작성합니다.

자동 메모와 사용자 입력이 의미하는 핵심 입력은 다음과 같습니다.

- 사용자 입력 존재 여부
- 역할 스킬이 저장소를 다시 읽어야 한다는 메모
- 다음 확인 질문
- 저장소 고유 명사와 실패 비용을 어디서 다시 읽어야 하는지에 대한 방향

### 입력 상태

입력 상태는 다음 두 상태 중 하나로 해석합니다.

- `초기`: `project-setup.md`나 사용자 답변이 없어 자동 메모만 있는 상태입니다. 이 단계에서는 역할을 단정하지 않고 질문과 입력 작성이 앞에 놓입니다.
- `제한적`: 사용자 입력은 있어 방향을 좁힐 수 있지만, 최종 판단은 역할 스킬이 저장소를 다시 읽어야 하는 상태입니다.

이 상태는 단순 분류가 아니라 `init`, `update`, `verify`가 같은 입력 준비 상태를 공유하기 위한 공통 제어축입니다.

## 상태 모드

이 생성기는 빈 프로젝트만 대상으로 하지 않습니다. 현재 저장소의 하네스 현황을 먼저 읽고 다음 모드 중 하나로 동작합니다.

- `신규 구축`: 아직 로컬 역할 스킬과 `.harness/*` 구조가 거의 없는 프로젝트
- `기존 확장`: 이미 일부 하네스 구조가 있고, 역할/문서/로그를 다시 정리해야 하는 프로젝트
- `운영 유지보수`: 구조는 있으나 문서 정합성, drift, 운영 규칙을 다시 읽거나 보수해야 하는 프로젝트

기본 원칙은 “무조건 새로 만들기”가 아니라, 먼저 감사하고 필요한 범위만 다시 쓰는 것입니다.

## 실행 모드

상태 모드와 별개로, 하네스는 실제 시작 방식을 아래 셋 중 하나로 고릅니다.

- `에이전트 팀`: 기본 모드. 역할 간 handoff와 phase 진행을 유지해야 하는 프로젝트에 둡니다.
- `단일 역할`: 한 문서나 한 축만 다시 쓰면 되는 좁은 요청에 둡니다.
- `하이브리드`: 팀 구조를 유지하되 일부 보조 해석이나 drift 정렬만 별도 역할로 분리할 때 둡니다.

즉 `기존 확장` 상태에서도 `에이전트 팀`으로 갈 수 있고, `운영 유지보수` 상태에서도 `단일 역할`로 시작할 수 있습니다.

## 실행 패턴

실행 모드와 별개로, 메타시스템 구조는 아래 패턴 중 하나를 앞에 둡니다.

- `파이프라인`: 새 구조를 안정적으로 세울 때
- `생성-검증`: 생성 직후 검증을 빠르게 붙일 때
- `팬아웃/팬인`: 하위 경계가 충분히 독립적일 때만
- `오케스트레이션 중심`: handoff와 재진입이 핵심일 때
- `전문가 풀`: 저장소마다 역할 구성이 크게 달라질 때

패턴은 부가 설명이 아니라 메타시스템의 중심 선택 결과입니다. `run-harness`는 현재 상태에서 어떤 패턴을 먼저 적용할지 제시하고, `harness-architect`는 그 패턴이 왜 맞는지와 handoff 구조를 문서로 고정합니다.

### 하네스 현황 감사에서 보는 것

- `.codex/skills/*`가 어느 정도 이미 존재하는가
- `.harness/reports/*`와 `.harness/logs/*`가 어느 정도 운영되고 있는가
- run-harness, orchestrator, validator 설명이 현재 저장소와 맞는가
- 문서가 실제 저장소 분석보다 일반론으로 되돌아간 흔적이 있는가

### drift 예시

- 역할 스킬은 있는데 보고서가 오래된 구조를 설명함
- 로그 정책은 선택 자산을 말하는데 실제 로그 자산은 전혀 없음
- run-harness 출력 계약과 orchestration 흐름 설명이 서로 다름
- 보고서는 존재하지만 저장소 고유 근거나 도메인 밀도가 사라짐

## 운영 루프

이 하네스는 한 번 생성하고 끝나는 구조가 아니라, 아래 세 루프를 계속 도는 메타시스템입니다.

- `drift`: 현재 약해진 역할, 문서, 운영 계약, 로그 정합성을 읽습니다.
- `sync`: `AGENTS.md`, `.codex/config.toml`, `.codex/agents/*.toml`, `.codex/skills/*`, 문서 계층이 같은 운영 계약을 말하도록 다시 맞춥니다.
- `evolve`: 반복 패턴, 검증 비용, handoff 병목을 바탕으로 역할 팀, 실행 모드, 실행 패턴을 다시 설계합니다.

`run-harness`는 이 루프의 진입점이고, `validator`는 운영 계약 감사자이며, `skill-scaffolder`는 sync가 필요한 예외 상황에서만 보조적으로 개입합니다.

## 고급 스크립트

전역 설치된 `harness` 스킬은 다음 스크립트를 사용합니다.

- `harness-init.sh`: 새 하네스 구조 생성 또는 명시적 재구성
- `harness-update.sh`: 기존 하네스 구조를 감사한 뒤 필요한 문서와 입력 메모를 다시 정리
- `harness-verify.sh`: 파일/구조 기준 검증
- `harness-log.sh`: 세션 로그 기록
- `harness-session-close.sh`: 세션 종료 로그 정리와 요약/통계 갱신
- `harness-role-stats.sh`: 누적 로그 기반 역할 호출 빈도 재계산
- `harness-template-candidates.sh`: 반복 작업 흐름 중 템플릿화할 후보 분석

기본 동작 원칙은 다음과 같습니다.

- 최초 구성 요청이면 `harness-init.sh`를 앞에 실행합니다.
- `harness-init.sh` 직후 상태는 완료가 아니라 자동 판단 보류 메모와 역할 입력만 준비된 상태로 봅니다.
- `run-harness`와 역할 스킬이 `.harness/reports/*`를 직접 작성한 뒤에만 완료 흐름으로 봅니다.
- 기존 확장이나 운영 유지보수는 `harness-update.sh`를 기본 진입점으로 둡니다.
- `harness-update.sh`는 `--domain`, `--architecture`, `--qa`, `--orchestration`, `--team-structure`, `--team-playbook`으로 필요한 범위만 갱신할 수 있습니다.
- `초기` 입력 상태에서는 질문과 `project-setup.md` 작성이 앞에 놓이고, `제한적` 상태에서는 역할 스킬의 저장소 재독해와 문서 작성이 앞에 놓입니다.
- 완료로 보기 전에 `validator` 감사와 `harness-verify.sh`를 모두 거칩니다.
- 역할 재작성 없이 `harness-verify.sh`를 먼저 통과시키는 흐름은 정상 완료로 보지 않습니다.
- `harness-verify.sh`가 실패하면 구성이 완료된 것으로 보지 않습니다.
- `run-harness`와 `validator`는 현재 상태를 `운영 가능 / 재작성 필요 / 재구성 필요` 중 하나로 설명할 수 있어야 합니다.

## 로그 운영

이 시스템은 역할 호출 흐름이 실제로 어떻게 진행됐는지 남기기 위해 로그를 수집합니다. 핵심 목적은 단순 기록이 아니라, 어떤 역할 조합과 작업 흐름이 반복되는지 축적해서 더 재사용 가능한 운영 방식으로 정리하는 것입니다.

하네스는 운영 과정에서 로그를 남기도록 설계되어 있습니다. 로그 기록과 집계는 관련 스크립트와 운영 규칙을 통해 이루어지며, 누적된 로그를 바탕으로 세션 요약을 보고, 역할 호출 빈도를 집계하고, 반복 작업 흐름을 `.harness/reports/template-candidates.md`에 후보로 정리한 뒤, 필요하면 `.harness/templates/*.md` 형태의 재사용 가능한 템플릿으로 발전시킬 수 있습니다.

필요할 때는 `harness-log.sh`, `harness-session-close.sh`, `harness-role-stats.sh`, `harness-template-candidates.sh`를 보조적으로 실행해 로그나 통계를 다시 정리할 수 있습니다.

하네스를 구성한 프로젝트에서는 보통 다음 파일에서 로그 규칙, 최근 세션 요약, 역할 호출 통계를 확인합니다.

- `.harness/logging-policy.md`
- `.harness/logs/session-log.md`
- `.harness/logs/latest-session-summary.md`
- `.harness/logs/role-frequency.md`

반복 작업 흐름 분석을 실행한 뒤에는 다음 파일도 확인할 수 있습니다.

- `.harness/reports/template-candidates.md`

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
- 에이전트 정의와 상위 계약 정렬
- 스킬 정의와 테스트
- 메타시스템 성숙도 평가
- drift / sync / evolve 운영 루프
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

이런 영역은 보통 하네스를 구성한 뒤, 프로젝트 내부의 로컬 역할 팀이 프로젝트 담당자와의 대화를 바탕으로 실제 문서와 규칙을 직접 다시 씁니다. 예를 들어 `.harness/reports` 문서에서 중요한 흐름과 실패 유형을 적고, 그 다음 반복되는 읽기 흐름을 시나리오나 템플릿으로 만들고, 필요하면 프로젝트 전용 스킬이나 검증 절차로 확장하는 방식입니다.

즉 현재 단계의 `harness`는 완성된 프로젝트 전용 실행기라기보다, 그런 특화 하네스를 각 저장소 안에서 만들어 갈 수 있게 출발점을 제공하는 메타 하네스에 가깝습니다.

상위 수준의 메타시스템 성숙도를 목표로 볼 때도 기준은 “문서가 많아졌는가”가 아니라 “에이전트 팀 / 실행 패턴 / 운영 계약이 실제로 살아 있는가”입니다. 이 판단은 `references/meta-system-maturity-guide.md` 기준으로 합니다.

## 타겟 프로젝트 평가

생성기 변경 후에는 실제 타겟 프로젝트에서 재생성과 평가를 함께 해야 합니다.

권장 절차는 다음과 같습니다.

1. 타겟 프로젝트의 기존 하네스 상태를 먼저 기록합니다.
2. `harness-init.sh` 또는 `harness-update.sh`/`run-harness`로 필요한 phase부터 다시 들어갑니다.
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
