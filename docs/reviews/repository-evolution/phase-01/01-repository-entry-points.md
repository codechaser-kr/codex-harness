# Phase 1 Day 1. Repository Entry Points

## 조사 기준

- 워크숍 Phase: Phase 1 Repository Engineering
- Day: Day 1 Repository Entry Points
- 조사일: 2026-07-21
- 사용자 피드백 반영일: 2026-07-22
- 브랜치: `docs/repository-evolution-workshop`
- 기준 커밋: `e8fcab117fc1197fa388ad4a102d36c6e6312faf`
- 결과 문서 성격: 학습 및 조사 기록. 공식 설계나 정책의 Source of Truth가 아니다.

사용자 요청에는 Day가 `[N]`으로 남아 있었다. 현재 Phase 1 결과 문서가 하나도 없고, Phase 문서의
`Phase 1 최초 실행` 절차가 Day 1을 지정하므로 이번 작업을 Day 1로 판단했다.

## 조사 범위와 방법

다음 범위를 직접 확인했다.

- Git: 현재 브랜치, 최근 커밋, 작업 트리, 원격 브랜치 HEAD
- GitHub: 열린 Issue와 PR, Issue 라벨, 현재 브랜치의 원격 템플릿
- 루트: `README.md`, `AGENTS.md`, `install.sh`, `uninstall.sh`, `.gitignore`
- 스킬: `.codex-dist/skills/*/SKILL.md`, 설치된 전역 스킬, `harness`의 `reference-map.md`
- 설계·운영 문서: `docs/github-workflow-engine.md`, `.harness/development-quality-evaluation.md`,
  `.harness/document-regression-checklist.md`, `.harness/evaluations/README.md`
- 협업 진입점: `.github/ISSUE_TEMPLATE/*.md`, `.github/pull_request_template.md`
- 검증 진입점: Workflow Definition CLI와 `all-fixtures.test.mjs`
- 생성·상태 산출물: `.harness/reports/exploration-notes.md`, `.harness/workflow-engine.json`,
  ignore된 `.harness/logs/*`

실행한 주요 검증은 다음과 같다.

```sh
git status --porcelain=v1 --branch
git ls-remote origin refs/heads/docs/repository-evolution-workshop
gh pr list --state open
gh issue list --state open --limit 100
gh label list --limit 100
node --test .codex-dist/skills/github-workflow-engine/tests/workflow-definition/all-fixtures.test.mjs
sh -n install.sh
sh -n uninstall.sh
git diff --check
```

## 개념 학습

### Repository Entry Point

Repository Entry Point는 단순히 저장소에서 가장 먼저 보이는 파일이 아니다. 처음 들어온 사람이거나
에이전트가 다음 행동을 안전하게 선택할 수 있게 하는 최소 진입 표면이다. 좋은 진입점은 저장소의 목적,
대상, 핵심 경계, 다음 읽을 위치와 첫 실행 명령을 짧게 제공한다.

### Human-facing Entry Point와 Agent-facing Entry Point

사람은 보통 목적, 설치 방법, 기여 흐름과 설계 배경을 먼저 필요로 한다. 에이전트는 여기에 더해 적용할
규칙, 활성화할 스킬, 허용된 변경 범위, 검증과 중단 조건을 일찍 알아야 한다. 두 경로는 같은 사실을
공유해야 하지만 읽기 순서와 표현까지 같을 필요는 없다.

### Bootstrap Context와 Minimal Sufficient Context

Bootstrap Context는 첫 작업을 잘못 시작하지 않기 위해 초기에 필요한 맥락이다. 모든 상세 문서를 처음부터
읽는 것은 안전해 보이지만 컨텍스트 비용과 오래된 정보 노출을 늘린다. Minimal Sufficient Context는 현재
작업의 다음 결정을 내리기에 충분한 정보까지만 먼저 제공하고, 세부 내용은 필요할 때 발견하게 하는 방식이다.

### Orientation Cost

Orientation Cost는 목적과 작업 위치를 찾기 위해 소비하는 탐색 비용이다. 파일 수만으로 결정되지 않는다.
정본과 생성물의 구분, source와 installed copy의 구분, 문서 간 다음 경로의 명확성이 더 큰 영향을 준다.

## 사실·명시된 설계·추론 구분

이 문서에서는 다음 표기를 사용한다.

- **사실**: 현재 파일, 명령 결과 또는 GitHub 조회에서 직접 확인한 내용
- **명시된 설계**: 저장소 문서가 책임이나 Source of Truth로 선언한 내용
- **사용자 제공 운영 맥락**: 저장소 운영자가 설명한 현재 의도와 우선순위
- **추론**: 사실과 설계를 연결해 분석한 해석. 공식 결정이 아니다.

## 사용자 제공 운영 맥락

2026-07-22 피드백으로 다음 운영 맥락을 확인했다. 이 내용은 파일에서 직접 확인한 사실과 구분하지만,
Day 2 이후의 조사 범위와 개선 우선순위를 정하는 입력으로 사용한다.

- `.harness/reports/exploration-notes.md`는 현재 메타 저장소를 설명하는 진입 문서가 아니다. 타겟 프로젝트의
  하네스 생성 결과를 바탕으로 메타 생성기에 반영할 피드백이 있는지 판단하기 위해 보존한 기록이다.
  따라서 그 안의 경로나 탐색 결과가 현재 저장소와 다르다는 이유만으로 수정 대상으로 보지 않는다.
- 관리되는 전역 스킬 목록은 현재 `README.md`의 설명이 실제 운영 상태에 가장 가깝다. 다만 README의 주
  독자는 메타 저장소 기여자가 아니라 타겟 프로젝트에 하네스를 생성할 사용자다. README를 기여자용
  inventory의 Source of Truth로 확정할지는 별도 판단이 필요하다.
- 루트 `AGENTS.md`가 GitHub 리뷰 형식에만 집중하는 것은 현재 의도된 범위다. 기여자용 에이전트 진입
  규칙은 장기적으로 필요할 수 있지만, 현재는 저장소의 런타임 품질을 높이는 작업보다 우선하지 않는다.
- 설치된 `github-workflow-engine`과 메타 저장소 source의 차이는 해당 스킬을 개선하는 과정에서 생긴
  일시적인 개발 상태로 본다. Repository Engineering의 개선 후보로 다루지 않는다.
- 현재 우선순위는 기여자 onboarding을 확장하는 것보다 Runtime Engineering을 통해 저장소 품질을 높이는 데 있다.

## 최신 상태

### 확인한 사실

- **사실**: 로컬과 원격 `docs/repository-evolution-workshop` HEAD는 모두 `e8fcab1`이다.
- **사실**: 조사 시작 시 작업 트리는 clean이었다.
- **사실**: 현재 브랜치를 head로 하는 열린 PR은 없다.
- **사실**: 열린 Issue는 정책검토 #37 한 건이며 Repository Evolution Workshop과 직접 연결된 이슈는 없다.
- **사실**: GitHub에는 `기능제안`, `정책검토`, `기능변경`, `기능결함` 라벨이 모두 존재한다.
- **사실**: 원격 브랜치에도 네 Issue 템플릿과 PR 템플릿이 존재한다.

### 해석

- **추론**: 이번 Day 결과는 아직 GitHub Workflow Engine의 공식 변경 흐름에 연결되지 않은 학습 산출물이다.
  발견 사항을 곧바로 공식 문서에 반영하지 않고 개선 후보로 남기는 것이 현재 워크숍 계약과 맞는다.

## 현재 구조의 의도와 장점

### 1. 메타 저장소와 타겟 프로젝트의 경계를 초기에 설명한다

- **명시된 설계**: `README.md:15`~`README.md:21`은 이 저장소를 하네스 생성기 메타 저장소로,
  타겟 프로젝트를 로컬 하네스 생성 대상으로 구분한다.
- **사실**: 이 설명은 상세 설치나 Workflow Engine 설명보다 앞에 있다.
- **추론**: 독자가 루트의 빈 `.codex/`와 `.agents/`를 타겟 생성물 누락으로 오해할 위험을 줄인다.

### 2. 배포 source와 설치된 runtime copy를 구분한다

- **명시된 설계**: `README.md:53`~`README.md:58`은 `.codex-dist/skills/*`를 source,
  `$HOME/.codex/skills/*`를 설치 대상으로 설명한다.
- **사실**: `install.sh:34`~`install.sh:44`는 로컬 `.codex-dist/skills`를 우선 찾고,
  없을 때만 원격 archive를 사용한다.
- **사실**: 현재 설치된 `harness` 스킬은 저장소 배포본과 동일하다.
- **사용자 제공 운영 맥락**: 설치된 `github-workflow-engine`과 source의 차이는 개선 작업이 진행되는
  동안 생긴 일시적인 상태이므로 이번 분석의 문제로 다루지 않는다.
- **추론**: source와 runtime을 분리한 구조는 배포와 롤백에 유리하다. 개발 중 설치본 차이는 안정된
  릴리스 또는 배포 상태를 검증할 때 별도로 확인하는 편이 현재 목적에 맞는다.

### 3. 상세 설계는 작업 축에 따라 선택적으로 읽게 한다

- **명시된 설계**: `.codex-dist/skills/harness/references/reference-map.md:252`~`314`는
  `reference-map.md`를 먼저 읽고 현재 문제 축에 맞는 기준 문서 1~2개를 고르도록 한다.
- **사실**: `harness`에는 22개 reference가 있으며 `reference-map.md`는 12개 판단 축으로 분류한다.
- **추론**: reference 수가 많아도 인덱스가 discovery layer 역할을 하므로 무차별 전체 읽기를 피할 수 있다.

### 4. 설계 설명과 런타임 전이 원천을 분리한다

- **명시된 설계**: `docs/github-workflow-engine.md:3`~`11`은 배경과 책임 경계를 이 설계 문서에 두고,
  런타임 전이는 `definitions/*.json`, state adapter, `evaluator.mjs`가 결정한다고 선언한다.
- **명시된 설계**: `.codex-dist/skills/github-workflow-engine/SKILL.md:35`~`57`은 작업에 필요한 계약만
  추가로 읽고 설계 문서를 런타임 입력으로 사용하지 않도록 한다.
- **추론**: 사람이 읽는 설계 진입점과 에이전트가 실행 때 읽는 계약 진입점을 분리해 설명과 실행의
  책임 혼합을 줄인다.

### 5. 협업 진입점이 구조화돼 있다

- **사실**: `.github/ISSUE_TEMPLATE/`에는 기능제안, 정책검토, 기능변경, 기능결함 템플릿이 있다.
- **사실**: 각 템플릿의 title prefix와 label에 대응하는 GitHub 라벨이 실제로 존재한다.
- **사실**: `.github/pull_request_template.md`는 변경 이유, 영향, merge 전 확인, 연관 이슈를 묻는다.
- **추론**: 사람의 협업 입력과 Workflow Engine이 읽을 상태의 출발점을 같은 GitHub 표면에 둔 것이 장점이다.

### 6. 검증 집계 진입점이 실제 배포를 함께 검사한다

- **사실**: `.codex-dist/skills/github-workflow-engine/tests/workflow-definition/all-fixtures.test.mjs`는
  workflow, validation-mode, skill-quality 테스트를 import하고 임시 경로 설치 및 source/installed tree
  일치도 검사한다.
- **사실**: 위 집계 테스트, 두 shell script 문법 검사, `git diff --check`가 모두 통과했다.
- **추론**: 테스트 파일이 기능 단위로 분산돼 있어도 하나의 집계 파일로 회귀 경로를 제공하는 점은 좋다.

## 주요 진입점 인벤토리

| 진입점 | 주 대상 | 책임 | 다음 이동 |
| --- | --- | --- | --- |
| `README.md` | 타겟 프로젝트 사용자, 에이전트 | 저장소 목적, 메타/타겟 경계, 설치, 주요 자산과 사용 예시 | 작업별 스킬, 설계 문서, 설치 스크립트 |
| `AGENTS.md` | Codex Connector 리뷰 | 한국어 리뷰와 문제 우선순위 규칙 | PR diff와 관련 코드·테스트 |
| `install.sh` | 운영자, 사용자 | 로컬 또는 원격 배포본을 전역 스킬 경로에 설치 | 설치된 각 `SKILL.md` |
| `uninstall.sh` | 운영자, 사용자 | 전역 스킬을 timestamp backup으로 이동 | backup 확인 또는 재설치 |
| `.codex-dist/skills/harness/SKILL.md` | Codex | 하네스 상태 점검, 설계, 생성, 검증, 재진입의 전체 흐름 | `references/reference-map.md`와 현재 하네스 Phase reference |
| `.codex-dist/skills/github-workflow-engine/SKILL.md` | Codex | GitHub·로컬 상태 관측부터 전이 계산과 실행 조율 | 런타임 계약, Definition, adapter, evaluator |
| 기타 `.codex-dist/skills/*/SKILL.md` | Codex | 좁은 제안·요약·실행 역할의 활성화와 입력 계약 | 각 `먼저 읽을 문서`에 지정된 runtime reference |
| `.codex-dist/skills/harness/references/reference-map.md` | Codex, 생성기 기여자 | 하네스 reference의 판단 축별 인덱스 | 문제 축별 기준 문서 1~2개 |
| `docs/github-workflow-engine.md` | 설계 검토자, 기여자 | Workflow Engine 배경, 책임, 상태 모델의 설계 원천 | 관련 runtime reference와 구현 자산 |
| `.harness/development-quality-evaluation.md` | 생성기 기여자 | 타겟 결과를 사용한 품질 평가 진입점 | 평가 playbook과 target corpus |
| `.harness/document-regression-checklist.md` | 문서 변경자 | reference와 Markdown 계약의 회귀 점검 | 보조 명령과 완료 기준 |
| `.github/ISSUE_TEMPLATE/*.md` | GitHub 사용자, Workflow Engine | 작업 유형별 입력 구조 | Issue 상태와 후속 Workflow |
| `.github/pull_request_template.md` | PR 작성자, Workflow Engine | 변경 이유, 영향, 검증, 연관 이슈 입력 | PR review와 merge 흐름 |
| `scripts/workflow-definition/cli.mjs` | 개발자, 검증 실행기 | Workflow Definition validate/evaluate CLI | JSON 결과와 evaluator |
| `tests/workflow-definition/all-fixtures.test.mjs` | 개발자, CI 후보 | 전체 Workflow Engine 회귀 집계 | TAP 결과 |

## 실제 진입 흐름 재구성

### 사람: 처음 설치하고 사용하는 경우

```text
README.md의 목적·메타/타겟 경계
→ README.md의 설치 섹션
→ ./install.sh 또는 원격 install.sh
→ 설치된 harness/SKILL.md의 활성화 description
→ 타겟 프로젝트에서 자연어 하네스 구성 요청
→ 타겟 프로젝트의 로컬 진입점과 운영 문서
```

첫 성공 시나리오에 필요한 핵심 정보는 `README.md:1`~`96`, `README.md:154`~`218`에 있다.
프로젝트 특화 생성물 전체 예시는 성공 흐름을 이해한 뒤 읽어도 된다.

### 사람: 하네스 생성 기준을 변경하는 경우

```text
README.md의 저장소 구성
→ .codex-dist/skills/harness/SKILL.md
→ references/reference-map.md
→ 현재 문제 축의 기준 reference
→ .harness/development-quality-evaluation.md
→ .harness/document-regression-checklist.md
→ 타겟 평가 corpus와 검증
```

이 흐름은 현재 파일에서 재구성한 분석용 경로다. 아직 공식 기여자 onboarding 경로로 확정된 것은 아니다.

### 사람: GitHub Workflow Engine을 변경하는 경우

```text
README.md의 Workflow Engine 개요
→ docs/github-workflow-engine.md
→ github-workflow-engine/SKILL.md와 관련 runtime reference
→ definitions/*.json + state adapter + evaluator
→ tests/workflow-definition/all-fixtures.test.mjs
→ GitHub Issue/PR 템플릿
```

### Codex: 타겟 하네스 생성 요청을 처리하는 경우

```text
런타임이 제공한 상위 지침과 스킬 catalog
→ harness description으로 활성화
→ 설치된 harness/SKILL.md
→ 대상 저장소의 AGENTS.md와 현재 하네스 자산 상태
→ references/reference-map.md
→ 현재 상태·하네스 Phase에 필요한 reference
→ 생성·검증·로그·결과 보고
```

### Codex: GitHub Workflow를 시작하거나 재개하는 경우

```text
github-workflow-engine description으로 활성화
→ github-workflow-engine/SKILL.md
→ 기본 계약 + 현재 작업에 필요한 계약
→ GitHub/로컬 상태 관측
→ workflow Definition + state adapter + evaluator
→ 사용자 결정 또는 선택된 실행 주체
→ 사후조건 검증과 상태 재관측
```

## 사람과 에이전트의 권장 탐색 순서

### 사람

1. `README.md:1`~`38`에서 목적, 메타/타겟 경계, 주요 자산을 확인한다.
2. 현재 주 독자인 타겟 프로젝트 사용자는 설치 섹션과 하네스 생성 요청 예시로 이동한다.
3. 메타 저장소 개선 작업에서는 변경 대상의 source skill과 설계 문서를 직접 조사한다.
4. 하네스 변경은 `reference-map.md`, Workflow Engine 변경은 `docs/github-workflow-engine.md`를 인덱스로 삼는다.
5. 구현 자산을 확인한 뒤 대응 품질 평가나 집계 테스트로 검증한다.
6. 변경 유형에 맞는 Issue 템플릿과 PR 템플릿을 사용한다.

3~6번은 현재 저장소에서 재구성한 작업 경로이며 공식 기여자 안내는 아니다.

### Codex

1. 저장소 범위의 `AGENTS.md`와 현재 요청을 확인한다.
2. 전역 스킬 description으로 해당 스킬을 선택한다.
3. 선택한 `SKILL.md`를 읽고 거기서 요구하는 기본 계약 또는 reference map을 읽는다.
4. 현재 작업에 필요한 reference와 실행 코드만 추가로 읽는다.
5. 로컬·GitHub 상태를 관측하고 허용 범위 안에서 실행한다.
6. 해당 집계 테스트와 문서 회귀 기준으로 검증한다.

### 같아야 하는 부분과 달라야 하는 부분

- **같아야 한다**: 저장소 목적, source/runtime 경계, Source of Truth, 안전·승인 경계, 검증 결과.
- **달라도 된다**: 사람은 배경과 예시를 먼저 읽고, 에이전트는 활성화 조건과 실행 계약을 먼저 읽는다.
- **추론**: 하나의 긴 공통 읽기 순서를 강제하기보다 `README.md`를 공유 anchor로 두고 작업별 인덱스에서
  분기하는 현재 방향이 적합하다.

## Gap Analysis

### 전역 스킬 inventory의 정본 미확정

#### 현재 상태

현재 `README.md`가 관리되는 전역 스킬 목록을 가장 정확하게 설명하지만, 이 문서는 타겟 프로젝트 사용자를
주 독자로 한다. 기여자용 inventory의 Source of Truth는 아직 명시적으로 확정되지 않았다.

#### 저장소 근거

- `README.md:30`, `README.md:68`~`82`, `README.md:104`~`119`는 현재 관리 스킬을 설명한다.
- `install.sh:10`의 `CODEX_SKILLS`는 실제 설치 대상을 열거한다.
- `docs/github-workflow-engine.md:839`~`877`의 관리 자산과 표준 배포 tree에는
  `github-state-summary`, `github-simple-executor`, `target-harness-code-editor`가 나타나지 않는다.

#### 영향

현재 타겟 프로젝트 사용자는 README를 통해 필요한 설치 범위를 확인할 수 있다. 다만 향후 기여자 지원을
시작하면 변경 영향과 배포 범위를 판단할 정본이 필요하다.

#### 가능한 원인

README, 설치 스크립트, 설계 문서가 서로 다른 독자와 책임을 대상으로 작성됐기 때문이다.

#### 개선 선택지

1. README를 inventory 정본으로 확정한다.
2. `install.sh` 또는 별도 manifest를 실행 가능한 정본으로 두고 README와 설계 문서를 파생 설명으로 둔다.
3. 기여자 지원을 시작할 때 별도 inventory 계약을 만든다.

#### 권장 방향

지금은 README의 목록을 사용자 안내에 적합한 현재 설명으로 사용한다. 정본 결정과 기여자용 문서 보강은
Runtime Engineering을 통해 핵심 품질을 높인 뒤 다시 검토한다.

#### 변경하지 않을 경우

현재 사용자 흐름에는 직접적인 문제가 없다. 기여자 범위를 확장할 때 문서별 책임을 먼저 정해야 한다.

### 기여자 진입점은 현재 우선순위 밖

#### 현재 상태

`README.md`에는 개발 검증 명령이 없고 `AGENTS.md`는 GitHub 리뷰 규칙에 집중한다.

#### 저장소 근거

- `README.md`의 주 내용은 설치, 타겟 프로젝트에서의 하네스 생성, 생성 결과 설명이다.
- `AGENTS.md`는 7줄의 PR 리뷰 언어와 우선순위 규칙으로 구성된다.
- 집계 테스트와 문서 회귀 기준은 구현 및 `.harness` 아래에 이미 존재한다.

#### 영향

기여자에게는 별도 탐색 비용이 있지만, 현재 주 사용자인 타겟 프로젝트 사용자의 진입 흐름은 방해하지 않는다.

#### 가능한 원인

사용자 제공 운영 맥락에 따르면 기여자 onboarding을 아직 제품 범위로 우선하지 않았기 때문이다.

#### 개선 선택지

1. 현재 범위를 유지하고 런타임 품질 개선에 집중한다.
2. 기여자 지원 시점에 README와 분리된 가이드, `AGENTS.md` 포인터, 검증 진입점을 함께 설계한다.

#### 권장 방향

현재 범위를 유지한다. `README.md`, `AGENTS.md`, 통합 `verify` 명령의 기여자용 개선은 Runtime Engineering
이후 저장소 성숙도와 필요성이 확인될 때 다시 평가한다.

#### 변경하지 않을 경우

현재 의도와 일치한다. 다만 Codex를 통한 개선이 계속되는 동안 반복되는 탐색 비용은 후속 평가 근거로 남긴다.

### 클릭 가능한 문서 내비게이션 부재

#### 현재 상태

주요 Markdown 문서는 경로를 inline code로 제시하며 Markdown link를 사용하지 않는다.

#### 저장소 근거

`README.md`, `docs/`, `.harness`와 스킬 문서의 Markdown link 패턴 검색 결과가 없었다.

#### 영향

경로가 복사·검색에는 명확하지만 GitHub나 문서 뷰어에서 직접 이동할 수 없다.

#### 가능한 원인

경로를 실행 계약의 식별자로 일관되게 표현하는 방식을 우선한 것으로 보인다.

#### 개선 선택지

1. 현재 표기를 유지한다.
2. 루트와 인덱스 문서의 핵심 경로만 link로 만든다.
3. 모든 경로를 link로 바꾼다.

#### 권장 방향

전면 변경은 피하고, Day 4에서 사람용 discovery layer의 핵심 경로만 link로 만들 가치가 있는지 평가한다.

#### 변경하지 않을 경우

정확한 경로 표시는 유지되지만 사람의 클릭 탐색 비용은 남는다.

## 개선 후보

| 후보 | 기대 효과 | 비용·위험 | 권장 처리 |
| --- | --- | --- | --- |
| 전역 스킬 inventory의 정본 결정 | 향후 기여자의 변경 영향과 배포 범위 판단 개선 | 현재 사용자용 README의 책임을 불필요하게 넓힐 수 있음 | 기여자 지원 시점까지 보류 |
| 기여자용 진입 가이드와 검증 명령 | Codex와 신규 기여자의 탐색 비용 감소 | 현재 런타임 품질 개선보다 우선할 근거가 부족함 | Runtime Engineering 이후 재검토 |
| 핵심 인덱스의 선택적 Markdown link 도입 | 사람의 클릭 탐색 개선 | 경로 표기 규칙과 link 유지 비용 | Day 4에서 재검토 |

## 변경 유형 분류

### 즉시 수정

- 없음.

사용자 피드백을 반영해 `.harness/reports/exploration-notes.md`와 개발 중 설치본 차이는 수정 대상에서
제외했다. 전역 스킬 목록의 문서 차이도 현재 사용자 흐름의 오류가 아니라 향후 정본 책임을 정할 문제로
재분류했다.

### 정책 검토 필요

- 향후 기여자 지원을 시작할 때 전역 스킬 inventory의 Source of Truth를 어디에 둘지
- Day 4에서 사람용 핵심 인덱스에 Markdown link를 제한적으로 제공할지

### 기능 제안 필요

- 현재 없음.

### 보류

- README의 개발 검증 섹션, 별도 기여자 가이드, `AGENTS.md`의 일반 탐색 포인터
- 설치와 회귀 검증을 묶는 통합 `verify` 명령
- README 전체 길이나 `harness/SKILL.md` 크기 축소. Day 4의 실제 시나리오별 컨텍스트 조사가 먼저다.

앞의 두 항목은 Runtime Engineering에서 핵심 실행 품질을 높인 뒤 기여자 지원 필요성과 함께 다시 평가한다.

## 오늘 새롭게 이해한 것

- 이 저장소의 핵심 진입 구조는 루트 문서 하나가 모든 세부 내용을 담는 구조가 아니라,
  `README → 작업별 SKILL → reference map/계약 → 실행·검증`으로 분기하는 구조다.
- README는 현재 전역 스킬 목록을 정확하게 설명하지만, 주 독자는 메타 저장소 기여자가 아니라 타겟
  프로젝트 사용자다.
- `.harness/reports/exploration-notes.md`는 현재 상태 문서가 아니라 타겟 하네스 생성 결과를 메타 생성기
  피드백으로 연결하기 위한 기록이다.
- 좁은 `AGENTS.md`와 기여자 안내 부재는 현재 제품 우선순위에 따른 의도된 상태다.

## 기존 생각이 바뀐 부분

- `.harness/reports/exploration-notes.md`의 오래된 경로는 현재 저장소 문서의 오류가 아니다. 기록의 목적과
  생성 시점을 먼저 확인해야 한다.
- 루트 `AGENTS.md`가 짧다는 사실은 현재 의도와 일치한다. 기여자용 에이전트 진입 구조는 필요성이 아니라
  적용 시점이 남은 문제다.
- README의 목록이 현재 정확하더라도 곧바로 기여자용 Source of Truth라고 결론 내릴 수는 없다.
- 개발 중인 source와 설치본의 일시적 차이는 Repository Engineering 문제로 일반화하지 않는다.
- 22개 reference는 그 자체로 과도한 초기 정보가 아니다. `reference-map.md`가 작업 축별 선택을 실제로
  안내하므로 중요한 것은 문서 수보다 발견 순서다.
- README가 368줄이라는 크기보다, 첫 38줄에서 목적과 핵심 경계를 설명한다는 배치가 초기 진입 품질에 더 중요하다.

## 저장소에서 확인한 근거

- 루트 목적과 경계: `README.md:1`~`38`
- 설치 source/target과 명령: `README.md:39`~`96`, `install.sh:34`~`115`
- 하네스 사용 요청과 생성 흐름: `README.md:154`~`218`
- 생성 결과의 책임: `README.md:220`~`302`
- Agent 리뷰 규칙: `AGENTS.md:1`~`7`
- 하네스 reference 인덱스: `.codex-dist/skills/harness/references/reference-map.md`
- Workflow Engine의 설계/런타임 분리: `docs/github-workflow-engine.md:1`~`11`,
  `.codex-dist/skills/github-workflow-engine/SKILL.md:8`~`57`
- 문서 변경 검증: `.harness/document-regression-checklist.md`
- 생성기 품질 평가: `.harness/development-quality-evaluation.md`
- GitHub 협업 입력: `.github/ISSUE_TEMPLATE/*.md`, `.github/pull_request_template.md`
- 전체 회귀 집계: `.codex-dist/skills/github-workflow-engine/tests/workflow-definition/all-fixtures.test.mjs`

## 현재 구조의 강점

- README 초반에서 제품 목적과 메타/타겟 경계를 빠르게 확정한다.
- README가 현재 주 독자인 타겟 프로젝트 사용자에게 설치 대상과 생성 흐름을 구체적으로 제공한다.
- source, installed copy, target 생성물을 명시적으로 분리한다.
- 스킬 description이 활성화 계층, `SKILL.md`가 activation/execution 계층, reference가 상세 지식 계층을 맡는다.
- 하네스 reference map이 작업 축별 선택적 읽기를 구체적으로 제공한다.
- Workflow Engine은 설계 설명과 결정론적 런타임 원천을 구분한다.
- `AGENTS.md`가 현재 필요한 GitHub 리뷰 규칙만 제공해 책임을 좁게 유지한다.
- `.harness/reports`가 타겟 관찰을 메타 생성기 개선 판단에 연결하는 기록 공간으로 쓰인다.
- GitHub 템플릿과 실제 라벨이 일치한다.
- 집계 테스트가 구현뿐 아니라 설치 배포본의 tree 정합성까지 검사한다.

## 남은 의문

1. 향후 기여자 지원을 시작할 때 전역 스킬 inventory의 정본을 `README.md`, `install.sh`, 별도 manifest 중
   어디에 둘 것인가?
2. Runtime Engineering에서 어떤 품질 기준을 충족한 뒤 기여자용 `AGENTS.md`와 검증 진입점을 확장할 것인가?
3. 코드 형태의 경로 표기가 사람용 클릭 탐색보다 우선하는 명시적 문서 정책이 있는가?

## 다음 Day의 선행 조건

Day 2 Repository Map에서는 이 문서를 입력으로 사용하되 다음을 최신 상태와 다시 비교한다.

1. 주요 디렉터리를 source, runtime code, design, policy, validation, state, generated artifact로 분류한다.
2. `.codex-dist/skills/*`의 source, 설치된 전역 copy, 타겟 프로젝트 생성물의 경계를 지도에 명시한다.
3. `.harness/reports/*`는 현재 저장소의 진입 문서가 아니라 타겟 관찰과 메타 생성기 피드백을 보존하는
   기록으로 분류한다. 기록 내용의 최신성을 개선 과제로 만들지 않는다.
4. `README.md`는 현재 타겟 프로젝트 사용자용 전역 스킬 목록으로 사용하되 기여자용 Source of Truth로
   미리 확정하지 않는다. 실제 배포 범위는 `install.sh`와 `.codex-dist/skills/*`도 함께 확인한다.
5. 개발 중인 active installed skill과 checkout source의 일시적 차이는 Day 2 개선 후보에서 제외한다.
6. `AGENTS.md`의 리뷰 전용 범위를 의도된 현재 상태로 보고 기여자 onboarding 확장을 제안하지 않는다.
7. 작업 유형별 탐색 경로에는 Runtime Engineering의 입력이 될 실행 코드, 상태, 검증 경계를 우선 포함한다.
8. Day 1 피드백 반영 결과 즉시 수정할 항목은 없다.

## Day 1 완료 조건 점검

- [x] 주요 진입점을 식별했다.
- [x] 각 진입점의 대상과 책임을 설명했다.
- [x] 사람과 에이전트의 권장 탐색 순서를 제시했다.
- [x] 중복, 누락, 불일치를 파일 경로 근거와 함께 기록했다.
- [x] 다음 Day에 필요한 선행 정보를 정리했다.
