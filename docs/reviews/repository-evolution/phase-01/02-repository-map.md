# Phase 1 Day 2: Repository Map 조사 결과

> [!NOTE]
> 이 문서는 Repository Evolution Workshop의 학습·조사 결과다. 현재 프로젝트의 공식 설계나
> 정책을 정의하지 않는다. 개선 후보는 사용자 결정과 별도 Issue·PR 절차를 거친 뒤 공식 자산에 반영한다.

## 조사 기준

- 조사일: 2026-07-22
- 브랜치: `docs/repository-evolution-workshop`
- 기준 커밋: `db6e1583993952223ffe6b26685bdffb944b5f88`
- 원격 확인: `origin/docs/repository-evolution-workshop`도 같은 커밋을 가리킨다.
- 조사 시작 시 작업 트리: clean
- GitHub 상태: 열린 PR은 없고, 열린 Issue는 이 작업과 직접 관계없는 정책검토 #37 한 건이다.
- 이전 Day 입력: `01-repository-entry-points.md`를 읽고 현재 파일과 다시 대조했다.

이번 문서에서는 근거의 성격을 다음처럼 표시한다.

- **사실**: 현재 체크아웃된 파일, Git, GitHub, 명령 결과에서 직접 확인했다.
- **명시된 설계**: 저장소 문서나 스킬이 책임과 동작을 선언한다.
- **사용자 제공 운영 맥락**: 파일만으로 확정할 수 없지만 사용자가 현재 의도를 설명했다.
- **추론**: 사실과 명시된 설계로부터 도출한 해석이며 공식 정책은 아니다.

## 오늘 학습한 개념

### Repository Map은 파일 트리가 아니라 판단 경로다

파일 트리는 무엇이 존재하는지 보여 주지만, Repository Map은 특정 작업에서 어디부터 읽고 어느 경계까지
확장할지를 알려 준다. 좋은 맵의 단위는 파일 확장자보다 `하네스 생성 기준 변경`, `Workflow Engine 변경`,
`품질 평가` 같은 작업 목적이다.

### Information Architecture는 위치와 권한을 함께 다룬다

Information Architecture는 문서를 보기 좋게 나누는 일에 그치지 않는다. 각 영역이 어떤 입력을 받아 무엇을
출력하고, 어떤 파일이 판단의 원천이며, 어떤 파일은 관찰 기록에 불과한지를 구분하는 구조다.

### source와 generated asset을 구분해야 수정 방향을 잃지 않는다

이 저장소에서는 `.codex-dist/skills/*`가 설치 가능한 source이고, 전역 설치 경로의 사본과 타겟 프로젝트의
로컬 하네스가 파생 자산이다. 타겟 관찰 기록을 source처럼 수정하거나 설치본 차이를 저장소 결함으로 보는
순간 잘못된 영역을 고치게 된다.

### Search Space Reduction은 근거가 생길 때만 범위를 넓히는 방식이다

처음부터 93개의 `.codex-dist/skills` 추적 파일을 모두 읽는 대신, 작업 진입점과 관련 계약을 먼저 읽고
실행 코드, 테스트, 평가 기록 순으로 확장한다. 다만 관련 경로가 없다고 단정하기 전에 참조 검색과 집계
테스트를 통해 숨은 의존성을 확인해야 한다.

## 현재 구조의 의도와 장점

### 1. 배포 단위 안에 실행에 필요한 자산을 응집한다

- **사실**: `.codex-dist/skills/`에는 추적 파일 93개와 `SKILL.md`가 있는 스킬 디렉터리 17개가 있다.
- **사실**: `github-workflow-engine` 패키지는 진입점 1개, Definition 5개, runtime reference 13개,
  script 12개, test·fixture 24개를 함께 둔다.
- **사실**: `harness` 패키지는 진입점 1개와 reference 22개를 함께 둔다.
- **명시된 설계**: `README.md`는 `.codex-dist/skills/*`를 Codex source,
  `$HOME/.codex/skills/*`를 설치 대상으로 설명한다.
- **추론**: 일반 애플리케이션처럼 코드·문서·테스트를 루트에서 파일 유형별로 나누기보다, 설치될 스킬
  패키지를 중심으로 응집한 구조다. 배포 후에도 계약과 테스트를 같은 상대 경로로 보존하기에 유리하다.

### 2. 사람용 설계와 runtime 판단 원천을 분리한다

- **명시된 설계**: `docs/github-workflow-engine.md`는 사람을 위한 설계 문서다.
- **명시된 설계**: 실제 전이는 `definitions/*.json`, state adapter,
  `scripts/workflow-definition/evaluator.mjs`가 결정한다.
- **명시된 설계**: `github-workflow-engine/SKILL.md`는 작업에 필요한 계약만 선택해 읽고 설계 문서를
  runtime 입력으로 사용하지 않도록 한다.
- **추론**: 설명을 풍부하게 유지하면서 runtime의 결정 경로는 결정론적으로 좁힐 수 있다.

### 3. 생성기 source와 타겟 관찰을 분리한다

- **명시된 설계**: `.harness/evaluations/README.md`는 평가 아티팩트를 생성기 core reference가 아닌
  관찰 코퍼스로 정의한다.
- **사용자 제공 운영 맥락**: `.harness/reports/exploration-notes.md`도 타겟 프로젝트에 하네스를 생성한
  뒤 메타 생성기 피드백 여부를 판단하기 위해 보존한 기록이다.
- **추론**: 단일 타겟 관찰이 즉시 범용 생성 규칙으로 승격되는 것을 막는 피드백 게이트가 있다.

### 4. 유사해 보이는 자산의 책임을 계약으로 나눈다

- **명시된 설계**: 타겟 `.github/ISSUE_TEMPLATE/*.md`와 `.github/pull_request_template.md`는 실제 본문
  형식의 원천이고, `github-templates.md`는 title prefix, label, 필수 섹션, 연결 규칙의 검증 계약이다.
- **사실**: `reference-boundary-contract.test.mjs`가 하네스 템플릿 정합성 계약과 Workflow Engine 계약의
  참조 경계를 검사한다.
- **추론**: 두 위치의 내용 유사성은 무조건적인 중복이 아니라 실제 형식과 공통 정합성 계약의 역할 분리다.

## 저장소 전체 흐름 지도

```text
[메타 저장소의 설치 가능 source]
.codex-dist/skills/*
  ├─ harness: 생성 절차와 기준
  └─ github-workflow-engine: 계약, Definition, 실행 코드, 테스트
            │
            │ install.sh가 디렉터리를 그대로 복사
            ▼
[전역 설치본 / runtime copy]
$HOME/.codex/skills/*
            │
            │ 타겟 저장소 재조사 + 사용자 입력 + 승인된 적용
            ▼
[타겟 프로젝트 자산]
.codex/agents/*, .agents/skills/*, .harness/docs/*
.harness/workflow-engine.json(설치 시 확인한 capability cache), .harness/logs/*, 필요 시 .github/*
            │
            │ 실제 사용 결과와 운영 감사
            ▼
[메타 저장소의 관찰·평가]
.harness/evaluations/targets/*, .harness/reports/*
            │
            │ 반복 결함일 때만 후보로 승격
            ▼
[메타 source 개선 후보]
.codex-dist/skills/harness/SKILL.md와 관련 references
```

이 흐름에서 설치본은 source가 아니고, 타겟 생성물도 메타 저장소 source가 아니다. 평가 기록은 source 변경의
근거가 될 수 있지만 그 자체가 생성 규칙은 아니다.

**사용자 제공 운영 맥락**: `.harness/workflow-engine.json`은 타겟에 하네스를 생성하거나 갱신할 때 리뷰용
스킬 같은 의존성의 사용 가능 여부를 한 번 확인해 기록하는 타겟별 capability cache다. 이후 Workflow Engine은
매번 같은 의존성을 재검증하지 않고 이 값을 신뢰한다. 반복 탐색과 토큰 사용을 줄이는 것이 이 자산의 목적이다.

## 주요 디렉터리 책임 지도

| 경로 | 한 문장 목적 | 주요 입력 | 주요 출력 | 핵심 의존성·성격 |
| --- | --- | --- | --- | --- |
| 저장소 루트 | 사용자 안내, 설치·제거, 도구별 협업 진입점을 제공한다. | 배포 스킬 목록, 저장소 운영 규칙 | 설치된 전역 스킬, 사용자·리뷰 도구 안내 | `README.md`, shell script, `AGENTS.md`; 진입점·도구 |
| `.codex-dist/skills/` | Codex에 설치할 17개 전역 스킬의 저장소 관리 source를 둔다. | 확정된 runtime 계약과 스킬 변경 | 설치 가능한 패키지 트리 | `install.sh`; source·distribution staging |
| `.codex-dist/skills/harness/` | 타겟별 하네스의 설계·생성·검증·재진입 절차를 정의한다. | 타겟 저장소 근거, 사용자 입력, reference | 타겟의 역할 팀과 로컬 하네스 자산 | `reference-map.md`, 다른 harness references, 템플릿 호환성 계약; 정책·실행 지침 |
| `.codex-dist/skills/github-workflow-engine/` | GitHub 상태를 정규화해 선언형 전이를 계산하고 실행을 조율한다. | GitHub·로컬 관측 사실, 사용자 결정 | 현재·다음 task action과 구조화 실행 요청 | Definition, adapter, evaluator, runtime contract; 실행 코드·정책·검증 |
| 나머지 `.codex-dist/skills/*/` | Workflow Engine의 좁은 관측·제안·실행 작업을 각각 담당한다. | 검증된 작업별 입력 | 계약에 맞는 제안 또는 실행 결과 | 주로 `github-workflow-engine/references/*`; 얇은 실행 어댑터 |
| `docs/` | 사람이 읽는 설계와 학습 프로그램을 관리한다. | 확정된 설계 결정 또는 워크숍 조사 | 설계 설명, 학습 계획, 분석 보고서 | `docs/github-workflow-engine.md`는 설계, 하위 workshop·review는 비공식 학습 자산 |
| `docs/workshops/` | Repository Evolution의 절차와 Day별 완료 조건을 정한다. | 학습 로드맵 | 조사 기준 | 비공식 계획 |
| `docs/reviews/` | 각 Day의 확인 사실, 추론, 개선 후보와 다음 입력을 보존한다. | 최신 저장소 조사 | 다음 Day 입력 | 비공식 학습 결과 |
| `.harness/` | 이 메타 저장소의 품질 평가와 Workflow Engine 운영 보조 자산을 모은다. | source 변경, 타겟 결과, 하네스 생성 시 확인한 의존성 상태 | 평가 기록, 회귀 기준, capability cache·로그 | 평가·관찰·cache·검증이 하위 경로별로 분리됨 |
| `.harness/evaluations/` | 타겟 생성 결과를 비교하고 반복 결함의 승격 근거를 축적한다. | 타겟 하네스 산출물과 로그 | 타겟별 평가 문서 | 관찰 코퍼스; core reference가 아님 |
| `.harness/reports/` | 타겟 탐색과 생성 과정에서 얻은 보존 기록을 둔다. | 과거 타겟 조사 | 메타 생성기 피드백 판단 근거 | 관찰 기록; 현재 구조의 진입점이 아님 |
| `.harness/logs/` | 이 저장소에서 Workflow Engine을 실행한 보조 체크포인트를 둔다. | Workflow Engine 실행 사건 | `github-workflow-log.md` | ignored local state; GitHub가 기준 상태 |
| `.github/` | 이 메타 저장소의 실제 Issue·PR 본문 형식과 협업 입력을 제공한다. | Workflow Engine 템플릿 계약, 사용자 입력 | GitHub Issue·PR | 실제 형식; `github-templates.md`는 정합성 계약 |
| `.gemini/` | Gemini Code Assist의 리뷰 표현 규칙을 제공한다. | 저장소 리뷰 정책 | Gemini 리뷰 형식 | 도구별 협업 어댑터 |
| `.codex/`, `.agents/` | 현재 체크아웃에서는 저장소 자산을 담지 않는다. | 없음 | 없음 | **사실**: 비어 있고 Git에서 추적되지 않음; 타겟 생성 경로와 혼동하지 않음 |

로컬 파일 시스템에는 `.codex-dist/skills/commit/`, `.codex-dist/skills/commit-message/`라는 빈 디렉터리도
있지만 Git 추적 자산이 아니며 `install.sh`의 관리 목록에도 없다. 디렉터리 탐색 결과만으로 저장소 구성에
포함하지 않고, 추적된 `SKILL.md`와 설치 목록을 함께 확인해야 한다.

## 코드·문서·평가·도구·테스트의 경계

| 분류 | 현재 위치 | 경계 판단 |
| --- | --- | --- |
| 스킬 진입점 | `.codex-dist/skills/*/SKILL.md` | 활성화 조건, 입력, 역할, 출력 계약을 설명한다. |
| 실행 코드 | `github-workflow-engine/scripts/workflow-definition/*.mjs` | parse, validate, normalize, evaluate를 수행한다. |
| 선언형 상태 전이 | `github-workflow-engine/definitions/*.json` | 워크플로 작업과 전이 조건의 데이터 원천이다. |
| runtime 계약 | `github-workflow-engine/references/*.md` | 실행 중 필요한 판정 경계만 제공한다. |
| 사람용 설계 | `docs/github-workflow-engine.md` | 배경과 전체 설계를 설명하지만 runtime 입력은 아니다. |
| 하네스 생성 기준 | `harness/SKILL.md`, `harness/references/*.md` | Phase별 생성·검증·재진입 기준을 제공한다. |
| 결정론적 테스트 | `github-workflow-engine/tests/*` | 전이, 계약 경계, 설치 후 tree 보존을 검사한다. |
| 개발 품질 평가 | `.harness/development-quality-evaluation.md` | 타겟 평가를 시작하는 메타 저장소용 절차다. |
| 평가 기준 | `quality-evaluation-guide.md`, `target-evaluation-playbook.md` 등 | 비교 축, 판정, 환류 계약을 제공한다. |
| 평가 corpus | `.harness/evaluations/targets/*` | 실제 타겟 관찰을 보존하며 규칙 원천은 아니다. |
| 문서 회귀 검증 | `.harness/document-regression-checklist.md` | reference 연결과 운영 모델의 수동 회귀 기준이다. |
| 설치 도구 | `install.sh`, `uninstall.sh` | source tree를 전역 설치 경로에 배치하거나 backup으로 이동한다. |
| 운영 상태 | GitHub, `.harness/workflow-engine.json`, `.harness/logs/*` | GitHub가 Workflow 기준 상태다. JSON은 설치 시 확인해 이후 신뢰하는 의존성 capability cache이고, 로그는 재진입 보조 정보다. |

## 핵심 의존 관계

### 하네스 생성 경로

`harness/SKILL.md`는 `references/reference-map.md`를 discovery layer로 사용하고, 현재 Phase와 판단 축에
필요한 reference만 선택한다. Workflow Engine을 타겟에 적용할 때만
`workflow-engine-template-compatibility-contract.md`를 거쳐 다른 패키지의 `github-templates.md`를 읽는다.
이것은 하네스와 Workflow Engine 사이에 확인된 명시적 cross-package dependency다.

### Workflow Engine 경로

`github-workflow-engine/SKILL.md`가 관측 사실을 workflow별 state adapter에 전달하고, adapter 결과와
Definition을 evaluator가 계산한다. 15개의 좁은 보조 스킬은 공통 출력·템플릿·상태·실행 계약을
`github-workflow-engine/references/*`에서 선택해 읽는다. 따라서 공통 계약을 바꾸면 단일 스킬만 보지 말고
참조하는 보조 스킬과 `reference-boundary-contract.test.mjs`까지 확인해야 한다.

### 설치 경로

`install.sh`는 로컬 `.codex-dist/skills`를 우선 사용하고 없을 때 원격 archive를 내려받는다. 두 경우 모두
17개 스킬 디렉터리를 staging한 뒤 전역 경로로 이동한다. 기존 설치본은 timestamp backup으로 보존한다.
`all-fixtures.test.mjs`는 임시 경로에서 설치를 실행해 `github-workflow-engine` source와 설치 tree가 같은지,
핵심 cross-package 파일이 함께 설치되는지 검사한다.

### 타겟별 의존성 capability cache 경로

타겟에 하네스를 생성하거나 갱신할 때 리뷰 실행 모드와 외부 스킬 의존성의 사용 가능 여부를 확인해
`.harness/workflow-engine.json`에 기록한다. 이후 Workflow Engine은 액션마다 같은 도구를 다시 탐색하지 않고
저장된 값을 신뢰해 진행한다. 이 파일은 Workflow 진행 상태의 정본도, 생성기 규칙도 아니다. 설치 시점의 환경
확인 결과를 재사용해 반복 검증과 토큰 비용을 줄이는 타겟별 운영 cache다.

### 품질 환류 경로

`.harness/development-quality-evaluation.md`가 메타 저장소에서의 평가 절차를 시작하고, harness reference의
비교·판정·환류 기준을 사용해 결과를 `.harness/evaluations/targets/*`에 남긴다. 단일 관찰은 먼저 타겟 로컬
보강 후보이며, 여러 타겟에서 반복되거나 생성기 계약 자체의 공백일 때만 source 보강 후보가 된다.

## 작업 유형별 권장 탐색 경로

각 경로는 앞쪽의 최소 입력으로 시작하고, 변경 영향이 확인될 때 뒤쪽으로 넓힌다.

### 1. 하네스 생성 기준 변경

```text
.codex-dist/skills/harness/SKILL.md
→ references/reference-map.md
→ 변경 판단 축의 reference 1~2개
→ 직접 참조하는 다른 harness reference
→ .harness/document-regression-checklist.md
→ 필요 시 타겟 재생성
→ .harness/development-quality-evaluation.md
→ .harness/evaluations/targets/*
```

Workflow Engine 템플릿 적용을 바꾸는 경우에만 template compatibility contract와
`github-workflow-engine/references/github-templates.md`까지 확장한다.

### 2. GitHub Workflow Engine 변경

```text
docs/github-workflow-engine.md
→ .codex-dist/skills/github-workflow-engine/SKILL.md
→ 변경 축의 runtime reference
→ 해당 definitions/*.json
→ 해당 state adapter + evaluator/parser/validator
→ 관련 좁은 보조 스킬
→ 관련 단위 테스트
→ tests/workflow-definition/all-fixtures.test.mjs
```

Issue·PR 입력 형식이 영향받으면 `.github/*`와 `github-templates.md`의 서로 다른 책임을 함께 검토한다.

### 3. 전역 스킬 수정

```text
대상 .codex-dist/skills/<skill>/SKILL.md
→ 그 파일의 `먼저 읽을 문서`
→ 공유 contract의 해당 출력 판정 규칙
→ reference-boundary-contract.test.mjs 또는 skill-structure-contract.test.mjs
→ install.sh의 관리 대상 여부
→ 임시 설치를 포함한 all-fixtures.test.mjs
```

설치된 전역 copy는 검증 대상 파생물이며 편집 원천이 아니다. 개발 중 설치본 차이는 이번 Phase의 구조 결함으로
일반화하지 않는다.

### 4. 설치 스크립트 변경

```text
README.md의 설치·제거 설명
→ install.sh + uninstall.sh
→ .codex-dist/skills/*의 추적된 SKILL.md 인벤토리
→ CODEX_SKILLS 목록과 목적지 override
→ all-fixtures.test.mjs의 임시 설치·tree 비교
→ sh -n install.sh + sh -n uninstall.sh
```

관리 스킬 목록 변경은 README, 두 script, 필요한 설치 검증의 동시 영향으로 본다.

### 5. 품질 평가 수행

```text
.harness/development-quality-evaluation.md
→ harness/references/target-evaluation-playbook.md
→ quality-evaluation-guide.md
→ generator-readiness-checklist.md / evolution-contract.md
→ 타겟 프로젝트의 생성 자산과 로그
→ .harness/evaluations/README.md
→ .harness/evaluations/targets/<target>/<date>-<topic>.md
→ 반복 여부에 따라 타겟 로컬 보강 또는 생성기 환류 후보
```

`.harness/reports/exploration-notes.md`는 관련 과거 관찰이 있을 때 참고할 수 있지만 현재 메타 저장소를 설명하는
필수 진입점이나 자동 수정 대상은 아니다.

### 6. 문서 회귀 검증

```text
변경한 README·SKILL·reference·설계 문서
→ .harness/document-regression-checklist.md의 해당 섹션
→ reference-map.md와 직접 참조 경로 검색
→ 필요 시 Workflow Engine contract test와 all-fixtures.test.mjs
→ git diff --check
```

문서가 runtime 계약을 바꾼 경우 문서 검사만으로 끝내지 않고 Definition·코드·테스트까지 확장한다.

## 책임 중복과 파일 배치 판정

### 관리되는 전역 스킬 목록은 두 script가 각각 소유한다

#### 현재 상태

`install.sh`와 `uninstall.sh`는 각 동작에 필요한 17개 관리 스킬 목록을 각각 갖고 있다. `README.md`도 현재
설치되는 스킬 이름을 사용자 설명으로 나열한다.

#### 저장소 근거

- 현재 README와 두 script의 목록은 일치한다.
- `install.sh`는 목록에 든 디렉터리의 `SKILL.md`가 없으면 실패한다.
- `uninstall.sh`는 자신의 목록을 기준으로 설치된 스킬을 timestamp backup으로 이동한다.

#### 영향과 판단

**사용자 제공 운영 맥락**: 두 script의 목록은 공통화하지 않고 지금처럼 각각 관리하면 충분하다. 설치와 제거는
서로 다른 실행 작업이므로 별도 manifest나 공통 목록을 새로 두지 않는다. 이는 현재 규모와 변경 비용에 맞는
의도된 중복이며, 현재 동작 오류도 없다.

README의 목록은 실행용 인벤토리가 아니라 타겟 프로젝트 사용자에게 설치 결과를 설명하는 정보다. 따라서
script와의 Source of Truth 문제로 다루지 않는다. 남은 판단은 사용자가 실제로 17개 이름을 모두 알아야 하는지,
아니면 대표 스킬과 역할 범주만으로 충분한지라는 README의 대상·정보량 문제다.

#### 권장 방향

두 script의 목록은 현재대로 유지한다. 공통 manifest나 목록 일치 자동화는 제안하지 않는다. README의 상세
목록이 사용자에게 필요한지는 Day 3에서 사용자용 안내의 지식 범위로만 검토하며, 명백한 불편 근거 없이
바로 줄이지 않는다.

### `.harness/`는 세 종류의 자산을 함께 담는다

#### 현재 상태

`.harness/` 아래에는 품질 평가·회귀 기준, 타겟 관찰 corpus·보고서, Workflow Engine 보조 설정·ignored 로그가
함께 있다.

#### 저장소 근거

각 하위 파일은 자신의 성격을 설명하고, GitHub를 기준 상태로 두며, 평가 corpus를 core reference와 구분한다.

#### 영향과 판단

책임 자체는 하위 경로에서 분리되어 있어 잘못 배치됐다고 볼 근거가 없다. 다만 `.harness`라는 이름만 보고
들어오면 무엇이 source 판단 기준이고 무엇이 상태·관찰 기록인지 즉시 알기 어렵다. 디렉터리 이동보다 맵에서
`평가/관찰/상태`를 표시하는 편이 현재 비용과 우선순위에 맞다.

### apparent duplication이지만 유지할 책임 분리

- `docs/github-workflow-engine.md`와 runtime references: 사람용 전체 설계와 실행 시 선택적으로 읽는 계약이다.
- `.github/*`와 `github-templates.md`: 실제 본문 형식과 공통 정합성 계약이다.
- `.harness/development-quality-evaluation.md`와 품질 관련 harness references: 메타 저장소용 평가 진입 절차와
  재사용 가능한 비교·판정 기준이다.
- `AGENTS.md`와 `.gemini/styleguide.md`: 같은 리뷰 정책을 각 도구의 진입 형식으로 제공한다.
- 코드·reference·test의 package co-location: 파일 유형 혼합이 아니라 설치 단위 응집이다.

현재 확인한 범위에서는 즉시 이동해야 할 파일이나 명백한 역할 충돌은 없다.

## 별도 Repository Map 필요성 결정

### 결정

**이번 워크숍과 후속 분석에 사용할 작업 지도는 필요하지만, 별도의 공식 Repository Map 문서를 지금 추가할
필요는 없다.** 이 Day 2 결과 문서를 Phase 1의 분석용 지도와 Day 3 입력으로 사용한다.

### 근거

- `README.md`의 저장소 구성은 현재 주 독자인 타겟 프로젝트 사용자에게 필요한 상위 안내를 이미 제공한다.
- `harness/references/reference-map.md`는 harness package 내부의 progressive disclosure를 이미 제공한다.
- 부족한 부분은 메타 저장소 전체의 작업별 경로와 `.harness` 하위 자산의 성격, source에서 평가 환류까지의
  연결이다. 이 문서가 분석 단계에서는 그 공백을 채운다.
- **사용자 제공 운영 맥락**상 현재 우선순위는 기여자 onboarding 확대보다 Runtime Engineering 품질이다.
- 공식 맵을 추가하면 위치, Source of Truth, 갱신 책임을 정해야 하므로 단순 문서 추가가 아니라 정책 결정과
  지속적인 유지 비용이 생긴다.

### 분석용 Repository Map의 최소 형태

1. 주요 경로의 한 문장 책임표
2. `source → 전역 설치본 → 타겟 생성물 → 평가 환류` 흐름
3. 빈번한 작업 유형별 시작 경로와 검증 종점
4. `정본 / 계약 / 파생물 / 상태 / 관찰 기록` 표기

세부 파일 전부를 나열하거나 자동 생성된 tree를 붙이지 않는다. 이 네 항목은 현재 Day 2 문서에 이미 포함되어
있으므로 분석용 맵의 요구는 충족됐다. 공식 문서 승격은 현재 필요하지 않으며 Day 3의 선행 과제로 넘기지 않는다.

## 개선 후보와 변경 유형 분류

| 분류 | 후보 | 현재 판단 |
| --- | --- | --- |
| 즉시 수정 | 없음 | 현재 경로 오류, 역할 충돌, 설치 실패를 확인하지 못했다. |
| 정책 검토 | 없음 | 두 installer의 독립 목록 관리와 공식 Repository Map 미도입 방향이 사용자 피드백으로 정리됐다. |
| 기능 제안 | 없음 | 새 명령, 스킬, runtime 기능, 평가 도구가 필요하다는 근거가 없다. |
| 보류 | README에 17개 스킬 이름을 모두 유지할지 간소화한다. | 타겟 프로젝트 사용자에게 필요한 정보량을 Day 3에서 먼저 판단한다. |
| 보류 | `.harness/`의 평가·관찰·상태 자산을 물리적으로 재배치한다. | 현재 하위 경계가 설명되어 있고 이동 비용과 링크 회귀 위험이 더 크다. |
| 보류 | `AGENTS.md`를 기여자용 전체 Repository Map으로 확장한다. | 현재 review 전용 범위는 의도적이며 Runtime Engineering보다 우선하지 않는다. |
| 보류 | 공식 contributor onboarding 문서를 새로 만든다. | 현재 주 독자와 우선순위에 비해 근거와 즉시 효과가 부족하다. |

따라서 이번 Day에서는 학습 결과 문서 외에 source, 공식 설계, 스크립트, 테스트를 수정하지 않았다.

## 검증 결과

- `git ls-remote origin refs/heads/docs/repository-evolution-workshop`: 로컬과 원격 HEAD 일치
- `gh pr list --state open`: 열린 PR 없음
- `gh issue list --state open`: 관련 없는 정책검토 #37만 확인
- `node --test .codex-dist/skills/github-workflow-engine/tests/workflow-definition/all-fixtures.test.mjs`: 통과
- `sh -n install.sh`: 통과
- `sh -n uninstall.sh`: 통과
- `git diff --check`: 통과

## 오늘 새롭게 이해한 것

- 이 저장소의 핵심 구조 단위는 언어나 파일 유형이 아니라 설치 가능한 스킬 패키지다.
- `.codex-dist`는 이름과 달리 생성된 build output이 아니라 저장소가 관리하는 설치 source다.
- `.harness`는 하나의 책임이 아니라 평가, 관찰, capability cache, 운영 로그를 하위 경로로 나눈 메타 운영 공간이다.
- task-specific path는 기존에 일부 존재하지만 저장소 전체의 흐름은 README와 package별 index 사이에 분산돼 있다.

## 기존 생각이 바뀐 부분

- 코드·문서·테스트가 한 패키지 아래 있다는 사실을 경계 혼합으로 보기보다 배포 단위 응집으로 보게 됐다.
- `.github` 템플릿과 `github-templates.md`는 중복 정본이 아니라 실제 형식과 검증 계약의 분리다.
- `.harness/workflow-engine.json`은 일반적인 Workflow 상태가 아니라 설치 시 확인한 의존성 가용성을 이후
  실행에서 신뢰하기 위한 타겟별 capability cache다.
- 두 installer의 스킬 목록 중복은 공통화 대상이 아니라 각 실행이 독립적으로 소유하는 의도된 중복이다.
- 새 공식 문서를 추가하는 것이 곧 탐색 비용 절감은 아니다. 현재는 workshop 결과가 분석용 지도로 충분하다.

## 저장소에서 확인한 근거

- 추적 파일 116개 중 93개가 `.codex-dist/skills/` 아래에 있다.
- `SKILL.md`가 있는 관리 source 스킬 17개와 두 installer의 목록이 현재 일치한다.
- Workflow Engine 집계 테스트는 하위 테스트 import, 임시 설치, source·설치 tree 비교를 수행한다.
- `.harness/logs/`는 `.gitignore` 대상이며, GitHub가 Workflow 상태의 기준 원천으로 문서화돼 있다.
- 로컬의 빈 `.codex/`, `.agents/`, 두 empty skill directory는 Git 추적 자산이 아니다.

## 현재 구조의 강점

- source, 설치 copy, 타겟 생성물, 평가 corpus를 개념적으로 구분한다.
- package 내부에 진입점, 계약, 실행 코드, 테스트를 함께 두어 배포 경계를 유지한다.
- package별 reference map과 선택적 참조로 전체 읽기를 피할 수 있다.
- 사람용 설계와 runtime 결정 원천을 분리한다.
- 타겟별 의존성 확인 결과를 cache해 매 Workflow 실행의 반복 탐색과 토큰 비용을 줄인다.
- 설치 copy가 source package와 같은지 결정론적으로 확인하는 회귀 경로가 있다.

## 남은 의문

1. 타겟 프로젝트 사용자가 설치·사용을 이해하는 데 README의 17개 스킬 전체 이름이 필요한가, 아니면
   `harness`, Workflow Engine, 보조 스킬 범주와 대표 예시만으로 충분한가?

기존 2번 질문의 `사용자용 인벤토리`는 README의 스킬 나열, `실행용 인벤토리`는 script의 `CODEX_SKILLS`
목록을 뜻했다. 사용자 피드백에 따라 두 목록의 일치 관리 문제는 철회했다. 기존 3번은 capability cache라는
책임이 확인되어 해결됐고, 기존 4번은 공식 Repository Map을 현재 도입하지 않기로 했으므로 제거했다.

## 다음 Day의 선행 조건

Day 3 Knowledge Architecture에서는 이 문서의 디렉터리 경계를 입력으로 사용하되 다음을 다시 확인한다.

1. 공식 설계, runtime 계약, 실행 지침, 평가 기준, 학습 기록, 상태·관찰 기록을 목적별로 분류한다.
2. `README.md`는 사용자용 안내라는 현재 의도를 유지하고 기여자용 Source of Truth로 자동 승격하지 않는다.
3. README의 상세 스킬 목록이 타겟 프로젝트 사용자에게 필요한 정보인지 검토한다. `install.sh`와
   `uninstall.sh`의 독립 `CODEX_SKILLS` 목록은 공통화 후보로 다루지 않는다.
4. `docs/github-workflow-engine.md`, runtime references, Definition·코드가 같은 개념을 설명할 때 각각의 정본
   범위를 정리한다.
5. `.harness/reports/*`와 `.harness/evaluations/*`는 core 규칙이 아닌 관찰 기록으로 분류한다.
6. `.harness/workflow-engine.json`은 하네스 생성 시 확인한 의존성 capability cache로 분류하고 Workflow 상태의
   정본이나 생성기 규칙과 혼동하지 않는다.
7. 설치본과 source의 개발 중 차이는 구조 결함으로 다루지 않고, 안정된 배포 검증이 필요할 때만 별도 확인한다.
8. AGENTS contributor onboarding과 공식 Repository Map은 현재 Runtime Engineering 우선순위를 바꾸지 않는다.
