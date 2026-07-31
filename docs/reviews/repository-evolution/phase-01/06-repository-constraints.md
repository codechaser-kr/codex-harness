# Phase 1 Day 6 — Repository Constraints

## 문서 성격

이 문서는 현재 체크아웃된 저장소와 브랜치를 기준으로 구조·정책 제약과 검증 수단을 조사한
학습 보고서다. 학습 결과를 공식 설계로 바로 승격하지 않는다.

본문에서는 근거의 성격을 다음처럼 구분한다.

- **저장소 사실**: 현재 파일, 실행 결과, Git 또는 GitHub 상태에서 직접 확인한 내용
- **명시된 설계**: README, 스킬, reference, Workshop 문서가 책임과 규칙으로 선언한 내용
- **조사 판단**: 위 근거를 바탕으로 한 해석이나 개선 제안
- **후속 반영**: 조사 뒤 사용자 결정과 기능 변경으로 `main`에 반영된 현재 상태

## 조사 기준선

- 조사 일자: 2026-07-30 KST
- 현재 브랜치: `docs/repository-evolution-workshop`
- 현재 HEAD: `9e4308a9dac90392cbaa436204659caccf2c23b4`
- 로컬 `main`과 `origin/main`: `9f6d2f3abd2c12e8bf2dcbb335ba93e4ab10e7ad`
- 현재 HEAD는 최신 `main`을 포함한다.
- 현재 브랜치와 upstream의 divergence는 `0 / 0`이다.
- 조사 시작과 결과 작성 전 작업 트리는 깨끗했다.
- 열린 PR은 없었다.
- 열린 이슈는 프로젝트 이름 변경 정책검토 #37 하나였으며, Day 6 제약 조사와 직접 관련되지 않았다.

GitHub의 classic branch protection 조회는 `404 Branch not protected`였지만, 이것만으로 `main`이
보호되지 않는다고 판단하면 안 된다. 별도 repository ruleset `main protection`이 활성화돼 있으며
일반 적용 대상에 다음을 강제한다.

- 기본 브랜치 삭제와 non-fast-forward 금지
- linear history
- PR을 통한 변경
- unresolved review thread가 없는 상태
- squash merge만 허용

승인 리뷰 수는 0이고 required status check도 없다. `RepositoryRole` bypass actor가 있으며 현재
조회 사용자도 bypass 가능 상태다. 따라서 일반 PR 절차는 플랫폼이 보호하지만 권한 보유자는
우회할 수 있고, 저장소 테스트 실행은 GitHub merge 조건으로 강제되지 않는다.

## 후속 반영 기준선

Day 7 진입 전인 2026-08-01 KST에 Day 6 개선 후보를 최신 `main`에서 다시 확인했다.

- 최신 `main`: `80787a64670094bf40e8934e642aa6aa9474349a`
- 열린 PR: 없음
- 열린 이슈: Day 6 개선과 무관한 프로젝트 이름 변경 정책검토 #37 한 건
- Workflow Engine 전체 회귀: 115/115 통과, fail·skip 0
- PR #117: Harness 설치와 Workflow Engine 설치·초기화·코드 변경 경로의 의존성 분리
- PR #119: Workflow Engine 설정 정본을 `.workflow-engine/settings.json`으로 이전하고 인식 불가
  값을 fail-closed로 중단
- PR #121: Harness 품질 판단과 변경 범위를 사용자 결정으로 분리

아래 `현재 상태`, `영향`, `권장 방향`, `분류`는 조사 당시 판단을 보존한다. 각 D6 항목의
`후속 반영`이 Day 7에서 사용할 현재 결론이다.

## 이전 Day에서 이어받아 재확인한 기준

- `README.md`는 현재 타겟 프로젝트에 하네스를 설치할 사용자를 위한 문서다. 기여자용 inventory
  정본으로 확대하지 않는다.
- `install.sh`와 `uninstall.sh`는 관리 스킬 목록을 각각 독립적으로 소유한다. 공통 manifest를
  도입하지 않는다.
- `.workflow-engine/settings.json`은 Workflow Engine이 필요한 시점에 필요한 의존성과 리뷰 모드
  필드만 생성·보완하는 타겟별 설정이다. Harness는 이 파일을 생성·해석하지 않는다. `checkedAt`
  날짜만으로 stale 상태라 판단하거나 실행마다 의존성을 다시 탐색하지 않는다.
- `.harness/reports/*`, `.harness/evaluations/*`, `.harness/logs/*`는 관찰·평가·재진입을 돕는
  기록이며 현재 설계나 GitHub 실행 상태의 정본이 아니다.
- 설치된 전역 스킬과 메타 저장소 source의 개발 중 차이는 이 저장소 결함의 근거로 사용하지 않는다.
- Team Spec의 정책·권한·불변 조건·생성 순서·정본 관계는 `team-spec-contract.md`, 필수 구조·필드·
  형식·구조 검증은 `team-spec-schema.md`가 소유한다.
- 상대 reference 경로는 일반 Markdown 파일 위치가 아니라 skill root 기준으로 해석되는 경우가 있다.
- `humanize-korean`은 이 저장소와 무관하며 사용하거나 검증 의존성으로 추가하지 않는다.

## 오늘 학습한 개념

### Architectural Constraint

아키텍처 제약은 “현재 구조가 어떤 모습인가”보다 “변경 뒤에도 반드시 유지돼야 하는 경계가
무엇인가”를 말한다. 이 저장소에서는 source skill이 `.codex-dist/skills` 아래에 있고, Workflow
Definition의 전이가 선언형 JSON을 정본으로 사용하며, Target Harness의 역할 상세가 `team-spec`에
남는 것 등이 해당한다.

### Invariant와 Guardrail

Invariant는 실행 전후에 항상 참이어야 하는 조건이다. 예를 들어 관리 스킬의 디렉터리 이름과
`SKILL.md`의 `name`이 같은 상태다. Guardrail은 이 조건을 어기지 못하게 하거나 위반을 조기에
알리는 장치다. installer의 `SKILL.md` 존재 검사와 Workflow Definition validator가 그 예다.

### Structural Validation과 Schema Validation

Structural validation은 필요한 파일·필드·섹션·형식이 존재하는지를 검사한다. Schema validation은
허용 필드, 타입, 값의 범위와 조합까지 닫힌 규칙으로 검사한다. Workflow Definition은 자체
validator로 두 수준을 모두 자동화한다. 반면 Target Harness의 Team Spec은 Markdown schema와
운영 감사 체크리스트를 사람이 적용하는 구조다.

### Policy as Code와 Fitness Function

Policy as Code는 정책을 실행 가능한 규칙으로 표현하는 접근이고, fitness function은 저장소가
진화할 때 중요한 특성이 계속 유지되는지 반복 측정하는 검증이다. 모든 정책을 코드로 바꾸는 것이
목표는 아니다. 이 저장소에서는 결정론적인 이름·경로·JSON 구조는 자동 검증에 적합하지만,
프로젝트별 역할 품질과 책임 경계의 타당성은 사람의 판단을 유지해야 한다.

## 현재 구조의 의도와 강점

### 결정론적 runtime과 의미 판단을 구분한다

**명시된 설계**: Workflow Definition의 구조, 상태 정규화, 단일 전이 계산은 JSON과 JavaScript로
검증한다. Target Harness 역할 설계, 운영 감사, 품질 비교는 Markdown 계약과 사람의 판단을
사용한다.

**조사 판단**: 이 경계는 좋은 선택이다. 상태 전이처럼 같은 입력에서 같은 결과가 나와야 하는
부분은 자동화하고, 타겟 도메인과 실패 비용을 해석해야 하는 부분은 단순 문자열 검사로 축소하지
않는다.

### 설치 동작은 보수적이고 복구 가능하다

**저장소 사실**:

- `install.sh`는 목록에 든 source마다 `SKILL.md`가 없으면 실패한다.
- 기존 설치본은 `.backup.<timestamp>.<pid>`로 이동한 뒤 새 staging tree를 배치한다.
- `uninstall.sh`는 대상을 삭제하지 않고 `.removed.<timestamp>.<pid>`로 이동한다.
- 임시 HOME에서 17개 스킬 설치와 제거를 다시 실행한 결과 active directory는 0개,
  removed directory는 17개였다.

이 방식은 설치 실패나 제거 오판 때 복구할 수 있는 guardrail이다.

### Workflow Engine은 강한 실행 가능 제약을 갖는다

**저장소 사실**: 조사 당시 `all-fixtures.test.mjs`를 직접 실행한 결과 114개 테스트가 모두
통과했고 fail·skip은 0개였다. 후속 기능 변경을 반영한 Day 7 진입 기준선은 115/115 통과,
fail·skip 0이다.

검증 범위에는 다음이 포함된다.

- Workflow Definition의 닫힌 구조, 타입, 조건식, 그래프와 완료 조건
- 한 상태에서 정확히 하나의 작업을 계산하는 evaluator
- 다섯 workflow의 대표 상태, 재개, terminal과 close-first 전이
- 관측 근거의 source contract와 adapter fail-closed 동작
- validation mode와 agent lifecycle
- Team Spec contract·schema 책임 경계
- Workflow Engine 스킬의 metadata와 progressive disclosure
- 주요 reference의 named section과 소비자 연결
- Workflow Engine 배포 tree와 설치본의 byte parity
- installer 문법과 설치본 CLI 동작

이는 문서 설명만으로 workflow를 운영하지 않고 실행 코드와 회귀 검증을 함께 둔 강점이다.

### Workflow Engine 설정은 반복 탐색 비용을 줄인다

**후속 반영**: `.workflow-engine/settings.json`은 Workflow Engine이 커밋 또는 리뷰 설정을 최초로
필요로 할 때 관측한 사용 가능 상태와 사용자가 선택한 기본 리뷰 모드를 저장한다. 누락은 정상적인
지연 초기화 대상으로 필요한 필드만 보완하고, 인식 불가 값은 원래 작업을 중단한다.

**조사 판단**: 실행마다 같은 외부 의존성을 다시 탐색하지 않는 것은 토큰과 실행 시간을 줄이는
의도적인 최적화다. 필요한 개선은 날짜 기반 재검사가 아니라 이 신뢰 경계에 들어오는 값을
생성·갱신 시 정확히 만드는 것이다.

### PR의 협업 제약은 GitHub ruleset이 일부 강제한다

PR 사용, linear history, squash merge, review thread 해결은 개인의 기억에만 의존하지 않는다.
반면 어떤 검증 명령을 통과해야 하는지는 아직 저장소와 GitHub 사이에 연결돼 있지 않다. 이 두
수준을 구분해야 한다.

## 주요 저장소 제약 목록

| 영역 | 제약 | 근거 | 현재 검증 수준 | 현재 상태 |
| --- | --- | --- | --- | --- |
| source 경계 | 배포 source는 `.codex-dist/skills/<skill>/SKILL.md`다. | `install.sh`, README | listed source 존재는 자동 | 통과 |
| 관리 범위 | 설치와 제거 목록은 각 script가 독립 소유한다. | 사용자 결정, 두 script | 두 목록을 source 전체와 대조하는 중앙 검증 없음 | Harness 1개, Workflow Engine 17개가 두 script에서 각각 일치 |
| 설치 대상 | 기본 대상은 `$CODEX_HOME/skills`, `harness`는 override 가능하다. | `install.sh`, `uninstall.sh` | script 실행으로 자동 | 통과 |
| 복구성 | 기존 설치와 제거 대상은 timestamp backup으로 이동한다. | 두 script | 동작 자체가 guardrail, 회귀 테스트는 부분적 | 임시 실행 통과 |
| 외부 의존성 | `commit`, review provider는 이 저장소가 설치하지 않는다. | README, runtime contract | cache와 실행 전 판정, 설치 자체는 외부 | 의도와 일치 |
| 스킬 이름 | source directory와 frontmatter `name`이 일치해야 한다. | skill 구조, 설치명 관례 | Workflow Engine 하나만 자동, 전체는 수동 | 현재 18개 모두 일치 |
| 스킬 metadata | `name`, `description`이 있고 trigger 범위가 분명해야 한다. | `skill-writing-guide.md` | Workflow Engine만 구체적 자동 검사 | 현재 18개 필드 존재 |
| Workflow Engine 구조 | SKILL은 500줄 미만이고 bundled resource와 조건부 reference를 설명한다. | skill structure test | 자동 | 통과 |
| Target role 명명 | `role_id`는 snake_case, 표시·파일명은 kebab-case다. | Harness SKILL, Team Spec 계약 | 타겟 운영 감사의 수동 검사 | 메타 저장소에서 직접 판정 대상 아님 |
| Team Spec 경계 | contract와 schema가 서로 다른 책임을 소유한다. | 두 reference | 자동 경계 test + 수동 checklist | 통과 |
| reference 발견성 | 새 Harness reference는 `reference-map.md`에 판단 축과 역할을 기록한다. | reference map 유지 원칙, 문서 회귀 checklist | 문서 회귀 수동 검사, Workflow Engine 소유 경계는 자동 | 조사 당시 누락은 소유권 이전으로 해결 |
| cross-skill 경로 | `../<skill>/references/*.md`는 skill root 기준으로 해석한다. | 현재 스킬 사용 방식, Day 5 확인 | 일반 경로 검사 없음 | 조사한 참조는 유효 |
| GitHub template | title, label, 필수 섹션, 선택지, `Refs` 규칙을 유지한다. | `github-templates.md`, compatibility contract | 책임 경계만 자동, 루트 template 내용은 수동 | 현재 정합 |
| Workflow Definition 형식 | 닫힌 JSON 구조, 타입, ID, graph와 completion을 지킨다. | definition contract, validator | 자동 | 통과 |
| executor 연결 | 각 workflow의 direct `executor_reference`가 의도한 스킬을 가리킨다. | definitions, workflow별 fixtures | workflow별 exact assertion | 통과 |
| Workflow Engine 설정 | 필요한 dependency와 review 필드를 최초 요구 시 생성·보완한다. | Workflow Engine SKILL, runtime contracts | 인식 가능한 값은 사용하고 인식 불가는 fail-closed 중단 | `.workflow-engine/settings.json`, Harness 비의존 |
| 평가 기록 | 타겟 관찰이 근거·불확실성·선택지 영향·사용자 결정·로컬/생성기 후보를 구분한다. | development evaluation, playbook | 경계 회귀 test + 수동 의미 판단 | 현재 corpus와 사용자 판단 경계 존재 |
| 문서 회귀 | reference와 Markdown 계약이 같은 운영 모델을 말한다. | document regression checklist | 수동 의미 검사 + 보조 명령 | 체크리스트 존재 |
| PR 절차 | main 변경은 PR, squash, linear history, thread resolve를 따른다. | GitHub ruleset | 플랫폼 자동 | 활성 |
| PR 검증 | merge 전 저장소 테스트를 통과한다. | workflow 실행 관례 | required status check 없음 | 플랫폼 비강제 |

## 검증 수단과 역할

### 자동 검증

#### Workflow Definition validator와 evaluator

- `validator.mjs`는 구조·타입·필드·조건식·그래프를 fail-closed로 검사한다.
- workflow별 state adapter는 출처와 값 도메인을 정규화한다.
- `evaluator.mjs`는 현재 상태에서 다음 작업 하나 또는 terminal 결과를 계산한다.
- workflow별 fixture test가 실제 executor와 대표 전이를 고정한다.

이 계층은 schema validation과 runtime fitness function을 함께 맡는다.

#### `all-fixtures.test.mjs`

하위 테스트를 집계하고 Workflow Engine package의 필수 artifact, JSON parse, 제거된 legacy 파일명,
installer 문법과 설치본 동작을 검사한다. 다만 repository 전체의 공통 test runner라기보다
`github-workflow-engine` package 아래에 있는 package-level 집계다.

설치와 package 경계 검증은 현재 다음 범위에 집중한다.

- `github-workflow-engine` 전체 tree
- `workflow-code-editor/SKILL.md`
- Harness와 Workflow Engine의 독립 설치·제거
- Workflow Engine의 `workflow-engine-template-compatibility-contract.md`

그 밖의 관리 스킬 전체 tree를 하나의 중앙 목록과 대조하는 parity 검사는 두지 않는다.

#### installer와 uninstaller

installer는 목록에 든 source의 `SKILL.md` 존재와 파일 복사를 실행 중 검증한다. 그러나 source에
새 스킬이 생겼지만 목록에 추가되지 않은 반대 방향 누락은 알 수 없다. uninstaller도 자신의
목록을 정상 순회하지만 install 목록 또는 source 전체와의 관계를 검증하지 않는다.

#### GitHub ruleset

GitHub 변경 절차를 자동 강제한다. 코드·문서 품질 검증 자체는 실행하지 않는다.

### 수동 검증

#### `.harness/document-regression-checklist.md`

Harness reference 변경의 의미 일관성, reference-map 연결, Team Spec 경계, 초기 생성, 로그와
handoff를 사람이 검토한다. `git diff --check`, `rg`, 로컬 설치 명령은 보조 도구이며 문서 의미를
대신 판정하지 않는다.

#### Harness verification과 generator readiness

`verification-checklist.md`는 타겟 하네스의 역할 계약, 생성 자산, 로그, 재진입과 자기진화성을
운영 감사 역할이 판단하게 한다. `generator-readiness-checklist.md`는 메타 저장소가 그러한 감사를
수행할 기준을 갖췄는지를 판단한다. 특정 타겟의 운영 가능 판정을 메타 저장소에서 대신하지 않는
경계가 명확하다.

#### skill testing과 target evaluation

trigger, with-skill/without-skill, handoff와 품질 비교는 실제 요청과 타겟 맥락을 사용한다. 현재
고정 문자열 검사로 바꾸지 않은 것이 적절하다.

### doctor 또는 verify 진입점

**저장소 사실**: root `package.json`, `Makefile`, `justfile`, `doctor`, `verify`, GitHub Actions
workflow는 없다. 실제 반복 검증 진입점은 긴 Node test 경로와 shell 명령, 수동 checklist로
분산돼 있다.

이 자체가 곧 오류는 아니다. 이 저장소는 사용자용 installer와 메타 스킬 source가 중심이고,
기여자 onboarding은 아직 우선순위가 아니다. 다만 repository-level 제약을 추가할 때 기존
Workflow Engine package에 계속 넣을지 별도 진입점을 만들지는 결정해야 한다.

## 문서 기반 제약과 자동 제약의 경계

### 자동화가 잘 맞는 항목

- 파일·디렉터리 존재
- source, install, uninstall 집합 관계
- frontmatter 필드 존재와 정확한 이름
- JSON parse, 타입, 허용 값과 graph
- skill-root 규칙을 반영한 reference 경로 존재
- 설치 전후 파일 tree parity
- GitHub template의 안정적인 title·label·필수 heading

이 항목은 저장소 규모나 타겟 도메인에 따라 답이 달라지지 않으며 실패 원인도 명확하다.

### 수동 판단을 유지해야 하는 항목

- 타겟 프로젝트에 필요한 역할 수와 역할 경계
- description이 실제 요청에서 적절히 trigger되는지
- Team Spec의 책임과 우선 입력이 도메인 실패 비용을 잘 반영하는지
- 보조 문서 간 의미 중복이 과도한지
- with-skill과 without-skill의 관찰 가능한 차이를 어떤 비용과 맥락으로 받아들일지
- 타겟 하네스를 현재 유지할지, 부분 수정할지, 구조 재설계할지와 실제 변경 범위

이 항목을 단순 정규식으로 자동화하면 문서가 검사를 통과하기 위한 문구로 굳고 실제 품질 판단은
약해질 수 있다. Harness와 역할 에이전트는 구조·계약 검증과 관찰 자료만 제공하고 최종 선택은
사용자가 한다.

## 검증 공백

### D6-1. Harness reference가 reference map에서 누락됐다

#### 현재 상태

`workflow-engine-template-compatibility-contract.md`는 Harness SKILL이 Phase 5와 Phase 6에서 직접
읽도록 지정하고, Workflow Engine의 reference boundary test와 installer test도 존재를 확인한다.
하지만 `reference-map.md`에는 이 파일명과 언제 읽어야 하는지가 없다.

#### 저장소 근거

- `.codex-dist/skills/harness/SKILL.md`가 해당 reference를 직접 나열한다.
- `.harness/document-regression-checklist.md`는 새 reference를 추가할 때 `reference-map.md`가
  판단 축과 역할을 설명해야 한다고 규정한다.
- `reference-map.md`의 유지 원칙도 같은 규칙을 명시한다.
- 2026-07-21의 PR #100에서 reference가 추가됐지만 현재 map에는 반영되지 않았다.

#### 영향

기본 읽기 순서가 `reference-map.md`에서 시작하므로, Workflow Engine 타겟 template 적용·감사
작업에서 관련 계약을 발견하지 못할 수 있다. SKILL의 직접 포인터가 있어 실행 자체가 막히지는
않지만 reference 발견성 계약을 위반한다.

#### 권장 방향

동작이나 책임 경계를 바꾸지 않고 `reference-map.md`의 Workflow Engine template 적용·감사 축에
이 계약의 목적과 읽기 조건을 추가한다.

#### 분류

`즉시 수정`. 명백한 문서 연결 누락이다. 이번 Day에는 공식 reference를 수정하지 않고 보고서에만
기록했다.

#### 후속 반영

`해결`. 단순히 Harness의 `reference-map.md`에 항목을 추가하는 대신 책임 경계를 바로잡았다.
PR #117에서 `workflow-engine-template-compatibility-contract.md`를 Workflow Engine 소유 reference로
이전하고 Harness SKILL과 모든 Harness reference의 참조를 제거했다. Workflow Engine SKILL이
`github-templates.md`와 함께 이 계약을 직접 발견하며, reference boundary test는 Harness 쪽 참조와
옛 파일이 없고 Workflow Engine 쪽 정본과 직접 포인터가 존재함을 검증한다. 따라서 조사 당시의
Harness reference 발견성 누락은 더 이상 존재하지 않는다.

### D6-2. repository-level invariant를 한 번에 검증할 수 없다

#### 현재 상태

조사 당시 17개 source skill, 두 독립 script 목록, 전체 metadata와 루트 GitHub template은 수동 대조
결과 정합하다. Harness reference map에는 D6-1 누락이 있다. 기존 자동 테스트는 대부분 Workflow
Engine package 경계를 중심으로 한다.

#### 영향

- 새 source skill을 installer 또는 uninstaller 한쪽에서 빠뜨려도 기존 집계가 놓칠 수 있다.
- Workflow Engine 이외 스킬의 `name` drift는 설치 후 trigger 오판으로 이어질 수 있다.
- 다른 관리 스킬의 추가 파일이 설치본에 누락돼도 전체 parity 검사가 없다.
- 새 Harness reference가 map에서 다시 누락될 수 있다.
- 루트 GitHub template과 runtime template contract가 달라질 수 있다.

#### 최소 개선 후보

별도 repository-level test에서 다음만 결정론적으로 검사한다.

1. `SKILL.md`가 있는 source directory 집합과 `install.sh` 목록을 대조한다.
2. 같은 source 집합과 `uninstall.sh` 목록을 별도로 대조한다.
3. 공통 manifest를 만들지 않고 두 script가 각자 목록 소유권을 유지한다.
4. 17개 `SKILL.md`의 `name`, `description` 존재와 directory-name 일치를 검사한다.
5. 임시 설치 뒤 17개 source tree와 설치 tree의 파일 목록·내용 parity를 검사한다.
6. `uninstall.sh` 문법과 설치 후 전체 제거 결과를 검사한다.
7. Harness reference 파일이 `reference-map.md`에서 발견 가능한지 검사한다.
8. relative reference는 일반 Markdown 규칙이 아니라 skill-root와 cross-skill 규칙으로 resolve한다.
9. 루트 GitHub template의 title, label, 필수 heading처럼 안정적인 구조를 runtime contract와
   대조한다.

#### 명시적 제외

- install/uninstall 공통 manifest
- 제거된 executor registry를 대신하는 중앙 allowlist
- 모든 Markdown 의미를 정규식으로 판정하는 검사
- 실행 때마다 외부 의존성을 다시 probe하는 검사
- README를 기여자용 17개 inventory 정본으로 만드는 변경

#### 위치 판단

이 검사는 여러 스킬과 root script를 함께 다루므로
`github-workflow-engine/tests/workflow-definition/all-fixtures.test.mjs`의 책임으로 계속 확대하기보다
별도 repository-level entry point가 더 자연스럽다. 정확한 경로와 실행 명령은 기능 제안에서
확정해야 한다.

#### 분류

`기능 제안`. 새로운 repository fitness function이므로 사용자 결정과 구현 계획이 필요하다.

#### 후속 반영

`현재 설계 유지`. 관리 스킬 목록은 개발 완료 뒤 변경 빈도가 낮고, 추가·삭제 때 `install.sh`와
`uninstall.sh`가 각자 일치하도록 관리한다. 이를 중앙화하는 manifest나 inventory 문서, 별도
repository-level 목록 검사는 만들지 않는다. 두 script는 Harness와 Workflow Engine 목록을 각각
독립적으로 소유하며 현재 목록이 일치한다. `all-fixtures.test.mjs`는 Harness와 Workflow Engine을
서로 독립적으로 설치·제거할 수 있다는 경계만 검증한다. 향후 두 script의 목록 불일치 가능성은
변경 시 함께 검토할 유지보수 책임으로 수용하며 Day 7 선행 차단으로 보지 않는다.

### D6-3. capability cache의 생성 시점 구조 검증이 없다

#### 현재 상태

조사 당시 `.harness/workflow-engine.json`은 JSON으로 parse되고 `dependencies.commit.available`,
`review.defaultMode`, 세 review mode의 `available`, `checkedAt`, `evidence`를 담는다. Harness와
runtime 계약은 필수 축과 허용 default mode를 설명하지만, 타겟에 파일을 생성·갱신하는 시점에
구조를 자동 검사하는 schema 또는 validator는 없다.

#### 영향

이 파일은 이후 실행에서 재탐색 없이 신뢰하는 cache이므로 오타, 누락, 잘못된 mode 값이 들어가면
잘못된 중단 또는 실행 경로 선택이 반복될 수 있다.

#### 권장 방향

의존성의 실제 설치 여부를 매 실행 다시 검사하지 않는다. 하네스 생성·갱신 시 한 번만 다음
구조를 결정론적으로 검사하고 성공한 값만 cache에 기록하는 방향을 검토한다.

- `dependencies.commit.available`의 boolean
- `review.defaultMode`가 지원 mode 중 하나인지
- `review.modes`의 key와 각 `available`의 타입
- `defaultMode`가 `review.modes`에 존재하는지
- cache를 신뢰할 근거와 확인 시점 필드의 존재

이 범위를 runtime 매회 dependency probe와 혼동하지 않아야 한다.

#### 분류

`기능 제안`. 새 생성 시점 validator 또는 검증 절차가 필요하며, Harness와 Workflow Engine 중
어디가 실행 책임을 가질지 먼저 정해야 한다.

#### 후속 반영

`해결`. PR #119에서 설정 경로를 `.workflow-engine/settings.json`으로 이전하고 Workflow Engine의
독점 소유로 확정했다. Harness 설치·생성·갱신은 이 파일을 만들거나 읽지 않는다. Workflow Engine은
커밋 또는 리뷰 설정이 최초로 필요할 때 누락된 필드만 생성·보완한다. 별도 JSON schema나 생성 시점
validator는 추가하지 않았다. JSON 파싱 실패, 지원하지 않는 key·값 또는 인식할 수 없는 타입을
만나면 값을 추정·교정하거나 fallback하지 않고 원래 작업을 중단하며, 문제 필드와 수정 후 재개
조건을 반환한다. 이는 사용자가 정한 “인지하지 못하는 값이면 워크플로우 중단” 조건을 만족한다.

### D6-4. 저장소 테스트가 GitHub merge 조건은 아니다

#### 현재 상태

`main` ruleset은 PR, squash, linear history와 review thread 해결을 강제한다. GitHub Actions
workflow와 required status check는 없다. PR template의 merge 선행 조건 항목은 외부 선행 조건을
기록하는 용도이며 일반 검증 checklist가 아니다.

#### 영향

현재 115개 test와 향후 검증이 있어도 실행하지 않은 PR을 플랫폼이 차단하지 않는다.
현재 workflow를 충실히 수행하는 에이전트와 사용자의 실행 규율에 의존한다.

#### 선택지

1. 현재처럼 로컬·에이전트 검증을 유지한다.
2. 외부 dependency가 없는 최소 test를 GitHub Actions에서 실행하되 required check로 강제하지 않는다.
3. 최소 test를 required check로 연결해 merge gate로 만든다.

#### 권장 방향

D6-2 repository-level test의 범위와 안정성이 먼저 확인된 뒤 자동화 수준을 결정한다. 현재
ruleset과 검증 체계만으로 즉시 required check를 추가하지 않는다.

#### 분류

`정책 검토`. merge 승인과 자동화 수준을 바꾸는 결정이다.

#### 후속 반영

`현재 정책 유지`. GitHub merge 조건으로 저장소 테스트 결과를 강제할 이유가 없다는 사용자 결정을
반영했다. GitHub Actions required status check는 추가하지 않고, Workflow Engine 구현 흐름에서
변경 범위에 맞는 로컬·에이전트 검증 결과를 확인하는 현재 방식을 유지한다. PR·squash·linear
history·review thread 해결은 repository ruleset이 계속 강제한다. 따라서 required check 부재는
알려진 운영 선택이며 Day 7 선행 차단이 아니다.

### D6-5. Harness 결과의 품질을 자동 판정하기 어렵다

#### 현재 상태

조사 당시 Harness 문서와 역할 계약은 타겟 결과를 `운영 가능 / 재작성 필요 / 재구성 필요`로
분류하고 with-skill 결과의 우열을 판단하게 했다. 그러나 품질과 운영 적합성은 프로젝트 의도,
변경 비용과 허용 위험을 포함하므로 Harness 결과만으로 객관적인 최종 판정을 만들기 어렵다.

#### 영향

Harness가 최종 판정과 재진입 범위까지 선택하면 결정론적 구조·계약 검증과 사용자 가치 판단의
경계가 섞인다. 관찰 자료가 같더라도 사용자가 수용할 비용과 변경 범위에 따라 결론이 달라질 수 있다.

#### 후속 반영

`해결`. PR #121에서 Harness와 역할 에이전트의 책임을 구조·계약 `통과 / 실패`, 관찰 사실,
불확실성, 선택지별 영향 제공으로 제한했다. `현재 유지 / 부분 수정 / 구조 재설계` 선택과 실제 변경
범위는 사용자만 확정한다. Phase 6은 `사용자 결정 대기`에서 중단하고, Phase 7은 사용자가 확정한
범위만 변경한다. with-skill과 without-skill은 원본 결과와 관찰 가능한 차이를 보존하되 우열을
판정하지 않는다. `user-decision-boundary.test.mjs`가 활성 Harness 계약과 저장소 안내 문서의 이
경계를 회귀 검증한다. 과거 평가 기록은 작성 당시 계약을 보존하는 역사적 corpus로 변경하지 않았다.

## 검증 중복과 모순

### 직접 모순되는 자동 검증은 발견하지 못했다

현재 115개 test, installer 동작, 수동 checklist가 같은 항목에 서로 다른 허용 값을 적용하는 사례는
확인하지 못했다.

### 의도된 계층 중복

- Team Spec 경계는 contract/schema가 규칙을 소유하고, document checklist가 의미를 검토하며,
  reference boundary test가 핵심 소유 문구와 소비자를 검사한다.
- GitHub template은 `github-templates.md`가 runtime data, Workflow Engine의 compatibility contract가
  타겟 적용·감사 절차, root `.github` 파일이 이 저장소의 실제 template을 맡는다.
- installer shell syntax는 `all-fixtures`와 수동 명령에서 함께 확인되지만, 하나는 회귀 집계이고
  하나는 변경자가 선택해 실행하는 보조 명령이다.

이는 같은 책임을 여러 정본이 소유하는 중복이 아니라 source, 적용 절차, 검증 층의 분리다.

### 책임 범위가 섞인 지점

`all-fixtures.test.mjs`는 Workflow Engine package 집계이면서 `workflow-code-editor`와 Harness 독립
설치 경계까지 교차 검사한다. 현재는 Workflow Engine 실행에 직접 필요한 package 간 계약을
보호하는 장점이 있다. 그러나 repository 전역 제약을 계속 여기에 추가하면 package test와
repository fitness function의 경계가 흐려진다. 후속 결정에서는 이 범위를 중앙 repository-level
검사로 확대하지 않았다.

### 중앙 executor allowlist는 추가하지 않는다

Workflow Definition validator는 `executor_reference`를 stable ID 또는 `null`로 구조 검증하고,
각 workflow test가 현재 Definition의 정확한 executor를 고정한다. PR #100에서 중앙 executor
registry를 의도적으로 제거했다. 관리 스킬과 외부 provider를 다시 하나의 중앙 목록으로 묶는
검사는 기존 단순화 설계를 되돌릴 수 있으므로 Day 5의 일반 후보를 그대로 채택하지 않는다.

## 자동화 가치와 우선순위

| 우선순위 | 후보 | 기대 효과 | 구현 비용 | 후속 처리 |
| --- | --- | --- | --- | --- |
| P0 | `workflow-engine-template-compatibility-contract.md` 발견성 정리 | 실제 발견성 누락 해소 | 낮음 | PR #117에서 Workflow Engine 소유로 이전해 해결 |
| P1 | 별도 repository-level constraint test | 설치·명명·reference·template drift를 한 번에 조기 탐지 | 중간 | 중앙화하지 않고 두 script의 독립 관리 유지 |
| P1 | capability cache 생성 시점 구조 검증 | 이후 신뢰하는 cache의 잘못된 입력 차단 | 중간 | PR #119의 지연 초기화와 fail-closed 인식 계약으로 해결 |
| P2 | 최소 검증을 CI 및 required check로 연결할지 결정 | 검증 미실행 merge 차단 | 중간, 운영 정책 영향 | required check를 추가하지 않기로 결정 |
| P3 | 모든 Harness 의미 규칙 자동화 | 일부 반복 확인 감소 | 높음, 오탐과 문구 경직 위험 | PR #121에서 사용자 판단으로 경계 확정 |
| P3 | installer fork/ref override를 공개 계약으로 고정 | 일부 fork·복구 사용성 증가 | 수요 불명, 지원 비용 발생 | 보류 |
| P3 | 기여자용 17개 inventory 정본 생성 | contributor onboarding 개선 | 현재 우선순위 아님 | 보류 |

조사 당시 후보의 우선순위는 위와 같았지만, 후속 사용자 결정은 중앙 검증 문서나 merge gate를
추가하지 않고 소유 경계를 분리하는 방향을 택했다.

## 후속 개선 처리 결과

### 해결

- D6-1: PR #117에서 template 적용·감사 계약을 Workflow Engine으로 이전했다.
- D6-3: PR #119에서 `.workflow-engine/settings.json` 지연 초기화와 fail-closed 중단을 확정했다.
- D6-5: PR #121에서 Harness 품질 판단과 변경 범위를 사용자 결정으로 분리했다.

### 현재 설계·정책 유지

- D6-2: install/uninstall 공통 manifest나 중앙 inventory를 만들지 않고 두 script의 목록을 함께
  관리한다.
- D6-4: 저장소 테스트를 GitHub required status check로 강제하지 않는다.

### 계속 보류

- Harness의 프로젝트별 역할 품질과 Markdown 의미를 전면 자동화한다.
- 중앙 executor registry 또는 allowlist를 복구한다.
- installer fork/ref override를 README의 공개 지원 계약으로 만든다.
- 기여자용 전역 스킬 inventory 정본을 만든다.

## 변경 유형 분류

| ID | 조사 당시 분류 | 후속 결정 | 현재 상태 |
| --- | --- | --- | --- |
| D6-1 | 즉시 수정 | Harness에 map 항목을 추가하지 않고 계약을 Workflow Engine 소유로 이전 | 해결 |
| D6-2 | 기능 제안 | 중앙 repository-level 목록 검사를 만들지 않고 두 script를 함께 관리 | 수용된 현재 설계 |
| D6-3 | 기능 제안 | Workflow Engine 전용 설정, 지연 초기화, 인식 불가 시 중단 | 해결 |
| D6-4 | 정책 검토 | required status check를 추가하지 않음 | 수용된 현재 정책 |
| D6-5 | 보류 | 결정론적 검증과 사용자 품질 판단을 분리 | 해결 |

## 오늘 새롭게 이해한 것

- 이 저장소의 제약 체계는 “자동화가 부족한 하나의 체계”가 아니라 결정론적 runtime은 코드로,
  타겟별 의미 판단은 Markdown 계약으로 지키는 두 층으로 구성돼 있다.
- 테스트 수보다 package 경계가 중요하다. Workflow Engine은 강하게 검증되지만 repository 전체
  installation surface를 소유하는 검증 진입점은 없다.
- Workflow Engine 설정은 stale 날짜보다 필요한 시점의 정확한 관측과 인식 가능성이 중요하다.
  반복 probe나 별도 schema보다 누락 필드의 지연 초기화와 인식 불가 값의 fail-closed 중단이 현재
  사용자 의도와 맞는다.
- GitHub classic branch protection API의 `404`는 보호 없음의 충분한 근거가 아니다. 이 저장소는
  repository ruleset으로 `main`을 보호한다.
- PR 절차 강제와 테스트 강제는 별개다. 현재 전자는 있고 후자는 없다.

## 기존 생각이 바뀐 부분

- Harness SKILL에서 추출한 `references/github-templates.md`가 처음에는 존재하지 않는 로컬
  reference처럼 보였지만, 전체 문자열과 skill-root 규칙을 다시 확인해
  `../github-workflow-engine/references/github-templates.md`라는 유효한 cross-skill reference로
  판정했다. 일반 Markdown 상대 경로 검사였다면 오탐이 됐을 것이다.
- Day 5의 executor allowlist 후보는 현재 PR #100의 registry 제거 의도와 workflow별 exact test를
  함께 보면 그대로 자동화할 대상이 아니다. 중앙 목록 대신 workflow별 계약 검증을 유지하는 편이
  현재 구조에 맞다.
- `all-fixtures`에 repository 검증을 더 추가하는 것이 가장 작은 변경처럼 보일 수 있지만,
  이미 cross-package 책임이 포함돼 있어 장기적으로는 별도 repository-level test가 더 작은
  책임 경계를 만든다.

## 저장소에서 확인한 근거

### 문서와 설정

- `README.md`
- `AGENTS.md`
- `docs/github-workflow-engine.md`
- `.github/ISSUE_TEMPLATE/*.md`
- `.github/pull_request_template.md`
- `.workflow-engine/settings.json`
- `.harness/document-regression-checklist.md`
- `.harness/development-quality-evaluation.md`
- Phase 1 Day 1~5 결과 문서

### source와 실행 코드

- `install.sh`
- `uninstall.sh`
- `.codex-dist/skills/*/SKILL.md`
- `.codex-dist/skills/harness/references/*`
- `.codex-dist/skills/github-workflow-engine/definitions/*.json`
- `.codex-dist/skills/github-workflow-engine/scripts/workflow-definition/*.mjs`
- `.codex-dist/skills/github-workflow-engine/tests/*`

### 실행과 관측

- branch, HEAD, main ancestor, upstream divergence, working tree 확인
- GitHub open issue·PR 직접 조회
- GitHub main ruleset과 classic protection API 직접 조회
- 17개 source skill과 install/uninstall 목록 대조
- 17개 `SKILL.md`의 `name`, `description`과 directory 대조
- Harness reference 파일과 `reference-map.md` 항목 대조
- skill-root와 cross-skill reference 경로 확인
- root GitHub template과 `github-templates.md`의 title·label·필수 section 대조
- `.workflow-engine/settings.json` JSON과 현재 필요한 필드 확인
- 임시 HOME에서 17개 설치와 제거 실행
- `node .codex-dist/skills/github-workflow-engine/tests/workflow-definition/all-fixtures.test.mjs`
- `node --test .codex-dist/skills/github-workflow-engine/tests/workflow-definition/all-fixtures.test.mjs`
- `sh -n install.sh`
- `sh -n uninstall.sh`
- `git diff --check`

## 후속 결정으로 해소된 의문

1. D6-1은 Harness map을 보강하지 않고 template compatibility 계약을 Workflow Engine 소유로
   이전해 해결했다.
2. D6-2의 중앙 repository-level 목록 검사는 추가하지 않는다. install/uninstall script의 독립
   목록을 변경 시 함께 관리한다.
3. D6-3 설정은 Workflow Engine이 독점 소유하고 최초 필요 시 생성·보완한다. Harness는 관여하지
   않으며 인식 불가 값은 워크플로우를 중단한다.
4. D6-2를 확대하지 않으므로 root GitHub template 구조를 중앙 repository-level 검사에 추가하지
   않는다. 기존 template 계약과 변경 범위별 검증을 유지한다.
5. D6-4의 required status check는 추가하지 않는다. PR 절차 ruleset과 로컬·에이전트 검증을
   유지한다.
6. D6-5의 Harness 결과 품질과 변경 범위는 사용자가 판단한다. Harness는 선택지와 근거만 제공한다.

## 다음 Day의 선행 조건

Day 7 Phase 1 Synthesis에서는 이 문서를 Day 1~5 결과와 함께 사용하고 다음을 유지한다.

1. D6-1, D6-3, D6-5는 각각 PR #117, #119, #121의 현재 설계를 기준으로 통합한다.
2. D6-2는 미구현 기능이 아니라 중앙화를 도입하지 않기로 한 설계 결정으로 기록한다.
3. D6-4는 required status check를 추가하지 않기로 한 정책 결정으로 기록한다.
4. install/uninstall 목록을 공통 manifest로 합치지 않는다.
5. `.workflow-engine/settings.json`을 날짜 기반으로 stale 판정하거나 매 실행 dependency probe 대상으로
   만들지 않는다.
6. 중앙 executor registry를 복구하지 않는다.
7. Harness의 구조·계약 검증과 사용자 품질 판단을 구분하고, Harness가 결과의 우열이나 변경 범위를
   대신 결정하지 않게 한다.
8. 현재 열린 #37은 별도 이름 변경 정책검토이며 Phase 1 제약 개선과 자동 연결하지 않는다.
9. 열린 PR이 없고 Day 6 관련 기능변경 이슈가 모두 종료됐으므로 추가 기능 변경 없이 Day 7
   Synthesis를 시작할 수 있다.

## Day 6 완료 조건 점검

- [x] 디렉터리, 명명, 스킬 구조, 배포, 설치, 문서, 상태, 평가, PR의 주요 제약을 목록화했다.
- [x] 문서 기반 제약과 자동 검증 제약을 구분했다.
- [x] 기존 script, test, checklist, 평가 기준과 GitHub ruleset의 검증 역할을 정리했다.
- [x] 검증 공백, 의도된 계층 중복, package/repository 책임 혼합을 식별했다.
- [x] 자동화 후보를 효과, 비용과 우선순위로 정리했다.
- [x] 즉시 수정, 정책 검토, 기능 제안, 보류를 분리했다.
- [x] 현재 구조의 의도와 강점을 먼저 설명했다.
- [x] 저장소 사실, 명시된 설계와 조사 판단을 구분했다.
- [x] 다음 Day 또는 새 세션에서 이 문서만으로 재개할 의문과 선행 조건을 남겼다.
- [x] D6-1~D6-5의 후속 사용자 결정과 `main` 반영 결과를 현재 상태로 연결했다.
