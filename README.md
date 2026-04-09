# harness (Codex)

`harness`는 Codex용 전역 스킬이자, 현재 프로젝트에 맞는 **로컬 실행 하네스 팀**을 구성하는 `Codex 중심 메타 프레임워크`입니다.

이 저장소는 문서만 만드는 도구가 아닙니다. 저장소를 탐색해 근거 후보를 수집하고, 그 결과를 공통 입력으로 삼아 역할 기반 스킬 팀, 오케스트레이션 흐름, QA/검증 구조, `run-harness` 진입점, 운영 루프를 설계합니다.

`harness`는 프로젝트 내부에 실제로 작동하는 실행 기반을 만들고, drift / sync / evolve까지 다루는 Codex용 하네스 엔지니어링 시스템입니다.

## 한눈에 보기

- 전역에 설치되는 `harness` 스킬을 제공합니다.
- 설치 스크립트와 제거 스크립트를 함께 제공합니다.
- 전역 `harness` 스킬 배포본과 참고 문서를 포함합니다.
- 프로젝트별 실행 하네스 팀을 생성하는 메타 하네스의 소스 저장소입니다.

## 설계 원칙

- 하네스의 본체는 문서가 아니라 역할 팀입니다.
- `.harness/reports` 문서는 프로젝트 담당자가 구조를 이해하고 수정하기 위한 보조 산출물입니다.
- QA와 validator는 실행 하네스의 일부입니다.
- 특정 프레임워크에 과하게 고정하지 않습니다.
- 프로젝트별로 확장 가능한 구조를 기본값으로 둡니다.
- 언어, 구조, 경계 판단은 코드베이스 탐색 결과를 기준으로 합니다.
- 하네스 설계의 주 입력은 탐색으로 수집한 근거와 그 해석입니다.

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
├── .codex/
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
    │   ├── domain-analysis.md
    │   ├── harness-architecture.md
    │   ├── qa-strategy.md
    │   ├── orchestration-plan.md
    │   ├── team-structure.md
    │   └── team-playbook.md
    ├── logs/
    │   ├── session-log.md
    │   ├── session-events.tsv
    │   ├── latest-session-summary.md
    │   └── role-frequency.md
    ├── scenarios/
    ├── templates/
    └── logging-policy.md
```

핵심 산출물은 `.codex/skills/*` 아래의 로컬 역할 팀입니다. `.harness/reports/*`는 프로젝트 담당자가 구조를 검토하고 수정하기 위한 문서 묶음이고, `.harness/logs/*`와 `.harness/logging-policy.md`는 실제 운영 기록과 로그 규칙을 위한 기본 산출물입니다.

운영을 시작하면 초기 생성물 중 일부가 계속 보강되거나 갱신되고, 운영 결과에 따라 새 파일이 추가될 수도 있습니다. 대표적인 범위는 다음과 같습니다.

- `.codex/skills/*`: 역할 정의와 운영 규칙 보강
- `.harness/reports/*`: 분석, 구조, QA, 운영 문서 보강
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

그러면 전역 `harness` 스킬이 현재 저장소를 분석하고, 프로젝트 내부에 로컬 실행 하네스 팀을 생성합니다.

탐색 근거가 아직 부족한 경우에는 바로 역할을 확정하지 않고, `run-harness`가 먼저 프로젝트 성격, 핵심 사용자, 첫 성공 시나리오 같은 확인 질문을 제시한 뒤 다음 역할 흐름으로 넘어가도록 설계되어 있습니다.

## 기본 역할 팀

생성되는 기본 역할은 다음과 같습니다.

- `domain-analyst`: 저장소 분석과 핵심 흐름 파악
- `harness-architect`: 로컬 실행 하네스 구조와 역할 경계 설계
- `skill-scaffolder`: 설계된 구조를 실제 로컬 스킬 파일로 생성
- `qa-designer`: 품질 기준과 반복 검토 질문 정리
- `orchestrator`: 역할 간 흐름과 입력/출력 연결 조율
- `validator`: 구조 누락과 설명 약점을 점검
- `run-harness`: 현재 상태를 보고 어떤 역할부터 움직일지 결정하는 진입점

`orchestrator`는 팀 흐름의 중심이고, `run-harness`는 팀을 실제로 시작하는 엔트리포인트입니다.

## 동작 방식

이 시스템은 보통 다음 순서로 동작합니다.

0. 현재 하네스 현황을 먼저 감사합니다.
1. 저장소를 탐색하고 근거를 수집합니다.
2. 프로젝트에 맞는 실행 하네스 팀 구조를 설계합니다.
3. 로컬 역할 스킬을 생성합니다.
4. QA와 validator를 포함한 검토 구조를 넣습니다.
5. 로그 정책과 세션 로그 구조를 함께 준비합니다.
6. `run-harness`를 포함해 실제 기동 가능한 형태로 정리합니다.

탐색 근거가 아직 부족하면, 위 흐름에 들어가기 전에 `run-harness`가 먼저 짧은 사용자 확인 질문을 만들고 그 답을 `domain-analysis`와 이후 오케스트레이션의 입력으로 사용합니다.

즉, 단순 문서 생성이 아니라 `탐색 -> 역할 설계 -> 스킬 생성 -> 오케스트레이션 -> QA/검증 -> 로그 운영` 흐름을 갖춘 실행 하네스 기반을 만드는 것이 목적입니다.

## 탐색 기반 분석

이 레포는 탐색 기반 분석기를 중심으로 동작합니다.

- `package.json`, `Cargo.toml`, 디렉토리명 같은 단서는 탐색을 시작하는 참고 정보로만 사용합니다.
- 실제 판단은 대표 시작점 후보, 핵심 모듈·패키지·런타임 경계, 테스트 자산, 설정/배포 경로, 저장소 고유 용어를 읽고 내립니다.
- `.harness/reports/*` 문서는 이 탐색 결과를 해석하고 운영 규칙으로 연결하는 용도로 생성됩니다.

탐색 기반 분석이 의미하는 핵심 입력은 다음과 같습니다.

- 대표 시작점 후보
- 주요 모듈 / 패키지 / 런타임 경계
- 테스트 / 검증 자산
- 설정 / 배포 / 실행 경로
- 저장소 고유 명사와 실패 비용

### 탐색 상태

탐색 결과는 다음 세 상태 중 하나로 해석합니다.

- `초기`: 대표 시작점 후보, 경계 후보, 테스트 자산 같은 근거가 거의 수집되지 않은 상태입니다. 이 단계에서는 역할을 단정하지 않고 사용자 질문과 첫 성공 흐름 정리가 우선입니다.
- `제한적`: 일부 근거는 수집됐지만 어떤 앱/패키지/런타임 경계가 중심인지 충분히 연결되지 않은 상태입니다. 이 단계에서는 문서를 보강하되, 저장소 특화 판단은 더 좁게 하고 추가 탐색을 병행합니다.
- `충분`: 대표 시작점 후보, 주요 경계, 테스트/실행 경로, 저장소 고유 용어가 연결된 상태입니다. 이 단계에서 역할 팀, 운영 규칙, 선택 자산, verify 기준을 더 구체적으로 적용합니다.

이 상태는 단순 분류가 아니라 `init`, `update`, `verify`가 같은 탐색 결과를 공유하기 위한 공통 제어축입니다.

## 운영 모드

이 생성기는 빈 프로젝트만 대상으로 하지 않습니다. 현재 저장소의 하네스 현황을 먼저 보고 다음 모드 중 하나로 동작합니다.

- `신규 구축`: 아직 로컬 역할 스킬과 `.harness/*` 구조가 거의 없는 프로젝트
- `기존 확장`: 이미 일부 하네스 구조가 있고, 역할/문서/로그를 보강해야 하는 프로젝트
- `운영 유지보수`: 구조는 있으나 문서 정합성, drift, 운영 규칙을 점검하거나 보수해야 하는 프로젝트

기본 원칙은 “무조건 새로 만들기”가 아니라, 먼저 감사하고 필요한 범위만 보강하는 것입니다.

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

## 고급 스크립트

전역 설치된 `harness` 스킬은 다음 스크립트를 사용합니다.

- `harness-init.sh`: 새 하네스 구조 생성 또는 명시적 재구성
- `harness-update.sh`: 기존 하네스 구조를 감사한 뒤 필요한 문서와 탐색 근거를 보강
- `harness-verify.sh`: 필수 구조 검증
- `harness-log.sh`: 세션 로그 기록
- `harness-session-close.sh`: 세션 종료 로그 정리와 요약/통계 갱신
- `harness-role-stats.sh`: 누적 로그 기반 역할 호출 빈도 재계산
- `harness-template-candidates.sh`: 반복 작업 흐름 중 템플릿화할 후보 분석

기본 동작 원칙은 다음과 같습니다.

- 최초 구성 요청이면 `harness-init.sh`를 먼저 실행합니다.
- 기존 확장이나 운영 유지보수는 `harness-update.sh`를 우선 사용합니다.
- `harness-update.sh`는 `--domain`, `--architecture`, `--qa`, `--orchestration`, `--team-structure`, `--team-playbook`으로 필요한 범위만 갱신할 수 있습니다.
- `초기` 탐색 상태에서는 질문과 탐색 보강을 우선하고, `제한적` 상태에서는 필요한 문서만 선택 갱신하며, `충분` 상태에서는 더 구체적인 구조 보강과 검증을 적용합니다.
- 완료로 보기 전에 `harness-verify.sh`를 반드시 실행합니다.
- `harness-verify.sh`가 실패하면 구성이 완료된 것으로 보지 않습니다.

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

즉, 이 저장소는 어떤 프로젝트에나 공통으로 적용할 수 있는 역할 팀과 운영 기반을 먼저 만들되, 그것을 코드베이스 탐색과 운영 루프 위에서 설계하는 데 집중합니다. 반대로 프로젝트마다 정의가 크게 달라지는 실행 기준과 검증 절차는 기본값으로 고정하지 않습니다.

현재 기본 하네스가 직접 제공하지 않는 것은 다음과 같습니다.

- `expected-state` 비교
  각 프로젝트에서 "어떤 상태를 정상으로 볼 것인가"가 다르기 때문에, 전역 기본 스킬이 공통 규칙으로 단정하기 어렵습니다. 예를 들어 문서 저장소, 웹 애플리케이션, 백엔드 서비스는 기대 상태 자체가 다릅니다.
- `diff` 엔진 실행
  무엇을 어떻게 비교해야 의미 있는지 역시 프로젝트마다 다릅니다. 파일 구조 비교가 중요한 경우도 있고, 설정 값이나 실행 결과 비교가 중요한 경우도 있습니다.
- 시나리오 실행 자동화
  시나리오는 각 프로젝트의 핵심 흐름, 실패 위험, 검토 우선순위에 맞게 설계되어야 합니다. 그래서 범용 하네스가 미리 정답을 넣기보다, 프로젝트 구조와 요구사항을 본 뒤 대화를 통해 필요한 시나리오를 정리하고 발전시키는 편이 맞습니다.
- 프로젝트 특화 실행 검증기
  실제 검증 로직은 프로젝트의 언어, 프레임워크, 테스트 방식, 배포 구조에 따라 달라집니다. 이런 부분은 공통 생성기보다 프로젝트 로컬 하네스에서 구체화하는 것이 더 안전합니다.

이런 영역은 보통 하네스를 구성한 뒤, 프로젝트 내부의 로컬 역할 팀이 프로젝트 담당자와의 대화를 바탕으로 점차 구체화합니다. 예를 들어 먼저 `.harness/reports` 문서에서 중요한 흐름과 실패 유형을 정리하고, 그 다음 반복되는 검토 흐름을 시나리오나 템플릿으로 만들고, 필요하면 프로젝트 전용 스킬이나 검증 절차로 확장하는 방식입니다.

즉 현재 단계의 `harness`는 완성된 프로젝트 전용 실행기라기보다, 그런 특화 하네스를 각 저장소 안에서 만들어 갈 수 있게 출발점을 제공하는 메타 하네스에 가깝습니다.

## references

전역 `harness` 스킬은 다음 참고 문서를 함께 사용합니다.

- `references/agent-design-patterns.md`
- `references/orchestrator-template.md`
- `references/skill-writing-guide.md`
- `references/skill-testing-guide.md`
- `references/qa-agent-guide.md`
- `references/team-examples.md`

이 문서들은 실행 하네스 팀을 설계하고 보강하기 위한 지식 베이스입니다.

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
