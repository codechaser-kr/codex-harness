# Phase 1 Day 3: Knowledge Architecture 조사 결과

> [!NOTE]
> 이 문서는 Repository Evolution Workshop의 학습·조사 결과다. 현재 프로젝트의 공식 설계나
> 정책을 정의하지 않는다. 개선 후보는 사용자 결정과 별도 Issue·PR 절차를 거친 뒤 공식 자산에 반영한다.

## 조사 기준

- 조사일: 2026-07-22
- 브랜치: `docs/repository-evolution-workshop`
- 로컬 기준 커밋: `911ac065855a56dda5a71794c2f60e018f612516`
- 원격 기준 커밋: `db6e1583993952223ffe6b26685bdffb944b5f88`
- 상태: 조사 시작 시 작업 트리는 clean이고, 로컬 브랜치는 Day 2 커밋 한 개만큼 원격보다 앞서 있었다.
- GitHub 상태: 열린 PR은 없고, 열린 Issue는 이 작업과 직접 관계없는 정책검토 #37 한 건이다.
- 이전 Day 입력: `01-repository-entry-points.md`, `02-repository-map.md`를 현재 파일과 다시 대조했다.
- 조사 후 사용자 결정: team-spec 두 reference의 책임 경계, `humanize-korean` 제외, README 스킬 목록의 향후
  이관 방향을 확정했다.
- 후속 반영: PR #101에서 문서 회귀 checklist의 `humanize-korean` 참조를 제거했고, merge commit
  `80cdcd06317160e3bd9e9f326824fd6b07153128`이 현재 브랜치에 포함됐다.

이번 문서에서는 근거를 다음처럼 구분한다.

- **사실**: 현재 파일, 코드, 테스트, Git 또는 GitHub 조회에서 직접 확인했다.
- **명시된 설계**: 저장소 문서나 스킬이 책임과 우선순위를 선언한다.
- **사용자 제공 운영 맥락**: 사용자가 현재 의도와 우선순위를 설명했다.
- **추론**: 사실과 명시된 설계로부터 도출한 해석이며 공식 정책은 아니다.

## 오늘 학습한 개념

### Knowledge Architecture

Knowledge Architecture는 문서를 디렉터리에 정리하는 일보다 넓다. 요구사항, 설계 이유, 실행 계약, 현재 상태,
평가 기준과 관찰 기록을 목적별로 나누고, 서로 어떤 방향으로 참조하며, 충돌하면 어느 근거를 우선할지 정하는
구조다.

### Source of Truth는 질문의 범위와 함께 정한다

하나의 저장소에 단 하나의 Source of Truth가 있는 것이 아니다. “Workflow의 다음 작업은 무엇인가”, “Issue
본문 형식은 무엇인가”, “타겟 역할 팀은 무엇인가”처럼 질문이 달라지면 정본도 달라진다. 따라서 정본을 말할
때는 반드시 판단 범위를 함께 적어야 한다.

### Canonical Document와 Derived Document

정본(canonical) 자산은 해당 판단 규칙을 소유한다. 파생(derived) 문서는 정본을 사용자에게 설명하거나 다른
실행 환경에 배치한 결과다. 같은 내용을 일부 반복해도 대상과 갱신 방향이 명확하면 유용한 파생 표현이 될 수
있다. 반대로 두 문서가 같은 규칙을 함께 소유하면서 개별 책임을 구분하지 못하면 drift 위험이 된다.

### Decision Record

Decision Record는 어떤 선택을 왜 했는지 보존한다. 현재 동작을 직접 정의하는 runtime source와는 다르다.
결정이 설계 문서와 코드에 반영된 뒤에는 Issue·PR을 현재 규칙처럼 실행하지 않고, 설계 이유를 복원할 때만
참조한다.

### Knowledge Duplication과 Documentation Dependency

중복은 내용이 두 곳에 있다는 이유만으로 문제는 아니다. 실제 문제는 어느 쪽을 먼저 고쳐야 하는지 알 수
없거나, 한 규칙을 바꿀 때 함께 검토해야 하는 자산을 놓치기 쉬운 경우다. Documentation Dependency는 이런
동시 변경·검토 관계를 명시하는 것이다.

## 최신 상태에서 확인한 지식 구조의 의도와 장점

### 1. 설계 이유와 runtime 판단을 명시적으로 분리한다

- **명시된 설계**: `docs/github-workflow-engine.md`는 배경, 이유, 책임 경계와 상태 모델의 설계 원천이다.
- **명시된 설계**: 같은 문서는 runtime 작업 전이를 `definitions/*.json`, state adapter,
  `evaluator.mjs`가 평가하는 단일 원천으로 선언한다.
- **명시된 설계**: 목적별 runtime reference와 `SKILL.md`는 실행 계약을 제공하고 설계 문서는 runtime
  입력으로 사용하지 않는다.
- **추론**: 사람이 이해해야 할 이유를 충분히 남기면서, 실행 시 읽어야 할 지식을 좁힐 수 있다.

### 2. 과거 결정과 현재 규칙의 우선순위를 분리한다

- **사실**: 정책검토 Issue #39는 실제 Issue·PR 본문 형식의 단일 원천을 타겟 `.github` 템플릿으로,
  `github-templates.md`를 검증 계약으로 결정했다.
- **사실**: 정책검토 Issue #40은 공통 실행 골격과 하위 스킬 입출력 계약을 결정했다.
- **사실**: 정책검토 Issue #93과 기능변경 Issue #95는 선언형 전이의 단계적 도입 이유와 구현 범위를 보존한다.
- **사실**: Issue #93에는 당시 계획했던 `version`, JSON Schema, executor registry가 남아 있지만 PR #100과
  현재 source에서는 제거됐다.
- **명시된 설계**: `docs/github-workflow-engine.md`는 과거 Issue의 결정이 설계와 실행 계약에 반영된 뒤
  별도 원천으로 취급하지 않는다고 밝힌다.
- **추론**: Issue·PR은 현재 규칙보다 강한 정본이 아니라, 현재 구조가 형성된 이유를 찾는 역사 기록이다.

### 3. runtime 계약을 책임별로 분해하고 선택적으로 연결한다

- **사실**: Workflow Engine에는 전이 정의, 상태 관측, 산출물, 사용자 결정, 리뷰, 구조화 실행, 명령 경로,
  타겟 하네스, 검증 모드, agent lifecycle 등 13개의 runtime reference가 있다.
- **명시된 설계**: `github-workflow-engine/SKILL.md`는 기본 계약과 조건부 계약을 나누고 현재 작업에 해당하는
  계약만 읽게 한다.
- **사실**: 15개의 좁은 보조 스킬은 공유 계약의 필요한 named section을 직접 가리킨다.
- **사실**: `reference-boundary-contract.test.mjs`는 소비 스킬이 실제 존재하는 section을 참조하는지와
  책임이 잘못된 계약에 복제되지 않았는지를 검사한다.
- **추론**: 문서 분할이 단순 파일 증가로 끝나지 않고 runtime의 선택적 지식 로딩과 연결돼 있다.

### 4. 타겟 생성물에서도 정본과 포인터를 나눈다

- **명시된 설계**: 타겟의 `team-spec.md`는 역할 이름, 책임, 입력, 절차, 출력, 다음 역할과 완료 기준의
  단일 원천이다.
- **명시된 설계**: `.codex/agents/*.toml`은 역할 발견·실행 메타데이터이고,
  `.agents/skills/*/SKILL.md`는 해당 `team-spec` 역할 section으로 연결하는 얇은 포인터다.
- **명시된 설계**: `AGENTS.md`는 상위 운영 기준과 진입 규칙을 맡고 세부 역할 계약을 복제하지 않는다.
- **추론**: 생성 파일 수가 늘어나도 역할 정의를 여러 사본에서 고칠 필요가 없도록 설계했다.

### 5. 관찰 기록을 규칙 원천으로 승격하기 전에 게이트를 둔다

- **명시된 설계**: `.harness/evaluations/*`는 생성기 core reference가 아니라 타겟 관찰 corpus다.
- **사용자 제공 운영 맥락**: `.harness/reports/exploration-notes.md`도 타겟 하네스 생성 결과를 바탕으로
  메타 생성기 피드백 여부를 판단하기 위해 보존한 기록이다.
- **명시된 설계**: 단일 타겟 관찰은 우선 타겟 로컬 보강 후보이고, 반복 결함만 생성기 환류 후보가 된다.
- **추론**: 오래된 관찰의 경로나 판단을 현재 규칙으로 오해하는 위험을 줄인다.

## 문서와 지식의 목적별 분류

| 분류 | 현재 자산 | 책임과 권한 |
| --- | --- | --- |
| 사용자 진입·사용 안내 | `README.md` | 타겟 프로젝트 사용자를 위해 목적, 설치, 사용 흐름과 범위를 설명한다. runtime 규칙이나 contributor inventory의 정본은 아니다. |
| 저장소 협업 규칙 | `AGENTS.md`, `.gemini/styleguide.md` | 각 리뷰 도구가 이 저장소에서 따를 표현·우선순위 규칙이다. 현재 범위는 review에 한정된다. |
| 작업 요구사항·완료 기준 | 활성 GitHub Issue 본문, 현재 사용자 결정 | 현재 작업의 범위, 선택, 완료 기준을 제공한다. 작업 종료 뒤에는 역사 기록이 된다. |
| 정책 결정 기록 | `정책검토` Issue와 연결 PR | 선택지, 결정 이유, 승인 맥락을 보존한다. 반영 뒤 현재 runtime source를 대체하지 않는다. |
| 사람용 공식 설계 | `docs/github-workflow-engine.md` | Workflow Engine의 배경, 이유, 책임, 상태 모델과 적용 구조를 설명하는 설계 원천이다. |
| Workflow 실행 진입 | `github-workflow-engine/SKILL.md` | 관측, 계약 선택, 전이 평가, 실행과 재관측 순서를 조율한다. |
| Workflow runtime 계약 | `github-workflow-engine/references/*.md` | 상태 관측, 출력, 사용자 결정, 리뷰와 실행 경계를 목적별로 정의한다. |
| 실행 가능한 전이 지식 | `definitions/*.json`, state adapter, `validator.mjs`, `evaluator.mjs` | workflow별 사실 도메인, 전이 조건, 정규화, 유효성, 현재·다음 작업을 결정한다. |
| 보조 실행 지침 | 나머지 `.codex-dist/skills/*/SKILL.md` | 공유 runtime 계약의 일부 section을 특정 작업의 입력·출력 절차로 적용한다. |
| 하네스 생성 지침 | `harness/SKILL.md` | 하네스 Phase 0~7의 orchestration과 생성·검증 완료 기준을 제공한다. |
| 하네스 생성 계약 | `harness/references/*.md` | 역할 설계, runtime, team-spec, 로그, QA, 평가와 재진입의 판단 축별 기준을 제공한다. |
| reference discovery | `harness/references/reference-map.md` | 필요한 기준 문서를 선택하는 인덱스다. 각 leaf reference의 규칙을 대신 소유하지 않는다. |
| 설치·제거 실행 | `install.sh`, `uninstall.sh` | 각 script가 자신의 관리 스킬 목록과 파일 이동 동작을 독립적으로 소유한다. |
| 품질 평가 진입 | `.harness/development-quality-evaluation.md` | 메타 저장소에서 타겟 평가를 시작하는 개발 절차를 설명한다. |
| 품질·환류 기준 | `quality-evaluation-guide.md`, `target-evaluation-playbook.md`, `evolution-contract.md` 등 | 비교 축, 운영 판정, 로컬 보강과 생성기 환류 기준을 정의한다. |
| 문서 회귀 기준 | `.harness/document-regression-checklist.md` | harness 생성기 Markdown 계약 변경의 수동 의미 검증 절차다. |
| 결정론적 검증 | `github-workflow-engine/tests/*` | Definition, 코드, contract section, 책임 경계와 설치 tree를 실행 가능한 assertion으로 고정한다. |
| 관찰·예제 | `.harness/evaluations/targets/*`, `.harness/reports/*`, `team-examples.md` | 판단 보조와 사례를 제공하지만 범용 규칙이나 현재 저장소 사실의 정본은 아니다. |
| 상태·cache·로그 | GitHub, `.harness/workflow-engine.json`, `.harness/logs/*` | GitHub가 Workflow 상태 원천이고, JSON은 설치 시 확인한 capability cache, 로그는 재진입 체크포인트다. |
| 학습 계획·기록 | `docs/workshops/*`, `docs/reviews/*` | 워크숍 절차와 분석 결과다. 공식 설계나 runtime source가 아니다. |

별도 요구사항 사양 문서는 없다. 현재 변경의 요구사항과 완료 기준은 GitHub Issue가 담당하고, 확정된 정책은
설계 문서와 runtime 자산에 반영된다. 현재 GitHub-native 흐름과 저장소 규모에서 별도 requirements 문서를
추가해야 할 근거는 확인하지 못했다.

## 주요 개념별 Source of Truth

| 판단 범위 | 현재 Source of Truth | 파생·보조 자산 | 충돌 시 처리 |
| --- | --- | --- | --- |
| 저장소 목적과 사용자 사용 흐름 | `README.md` | 없음 | 실제 동작과 다르면 source·script를 사실로 확인하고 README 불일치로 기록한다. |
| Workflow Engine 설계 이유와 책임 모델 | `docs/github-workflow-engine.md` | 과거 정책 Issue·PR | Issue의 옛 결정이 현재 설계에 반영된 뒤에는 설계 문서를 우선한다. |
| workflow별 전이와 작업 선택 | `definitions/*.json` + 해당 state adapter + `evaluator.mjs` | 설계 설명, `SKILL.md` | runtime 결과를 현재 동작 사실로 보고 문서 불일치를 결함 후보로 기록한다. |
| Workflow Definition 유효성 | `validator.mjs` | `workflow-definition-contract.md`, fixture | contract와 validator가 다르면 실행 결과를 임의 보정하지 않고 불일치로 중단·수정한다. |
| 관측값과 근거 분류 | GitHub·Git·파일의 원본 상태 + state adapter | `state-observation-contract.md`, `github-state-summary` | 관측하지 않은 값을 문서 설명이나 LLM 추론으로 채우지 않는다. |
| 현재 Workflow 진행 상태 | GitHub Issue·PR·review thread | 현재 코드, 보조 로그, 현재 대화 | 보조 근거가 충돌하면 GitHub 실행 상태를 우선한다. |
| 사용자 결정 해석 | 현재 사용자 입력 + `user-decision-contract.md` | 과거 대화·Issue 결정 | 현재 결정 범위를 벗어나면 추정하지 않고 다시 묻거나 중단한다. |
| 전용 스킬 출력 사용 가능성 | `artifact-output-contract.md` | 각 thin skill의 출력 설명 | 소비자가 계약 section을 충족하지 못한 출력을 후속 실행에 사용하지 않는다. |
| Issue·PR 실제 본문 형식 | 타겟 `.github/ISSUE_TEMPLATE/*.md`, `.github/pull_request_template.md` | `github-templates.md`, `docs/github-workflow-engine.md` | 실제 body는 target template, prefix·label·필수 section·연결 규칙은 contract로 검증한다. |
| 타겟 역할 팀의 실행 기준 | 타겟 `.harness/docs/team-spec.md` | agent TOML, local role skill, 운영 문서 | 파생 자산이 다르면 `team-spec`을 기준으로 audit·정렬한다. |
| 하네스 생성기의 team-spec 생성 규칙 | `team-spec-contract.md` + `team-spec-schema.md`의 공동 기준 | `harness/SKILL.md`, 다른 references | 공식 재정렬 전에는 충돌을 임의 해석하지 않는다. 후속 변경에서는 contract가 권한·불변 조건·생성 순서·정본 관계를, schema가 구조·형식·예시·구조 검증을 소유한다. |
| 하네스 reference 선택 | `reference-map.md` | `harness/SKILL.md`의 단계별 링크 | index는 leaf contract 내용을 덮어쓰지 않는다. |
| 세션 로그 형식과 재진입 정보 | `logging-contract.md`, `reentry-rules.md` | 생성된 Markdown 로그 | 로그는 Workflow Engine의 runtime 상태 원천으로 사용하지 않는다. |
| 타겟 의존성 사용 가능 상태 | 타겟 `.harness/workflow-engine.json` | README와 review runtime 설명 | **사용자 제공 운영 맥락**에 따라 생성·갱신 시 기록한 값을 이후 재검증 없이 신뢰한다. |
| 설치 동작과 설치 대상 | `install.sh` | README의 사용자 설명, 설치된 copy | script 동작이 우선이며 설치 copy는 검증 가능한 파생물이다. |
| 제거 동작과 제거 대상 | `uninstall.sh` | README의 사용자 설명 | `install.sh`와 공통 manifest로 묶지 않고 각 script가 독립 소유한다. |
| 생성기 평가 절차 | `.harness/development-quality-evaluation.md` + 관련 harness 평가 계약 | target 평가 corpus | corpus의 단일 관찰을 곧바로 생성기 규칙으로 일반화하지 않는다. |
| Repository Evolution 진행 기준 | `execution-guide.md` + 현재 Phase 문서 | Day별 review 결과 | 결과 문서는 다음 Day 입력이지만 공식 설계로 자동 승격하지 않는다. |

## 정본과 파생 문서의 연결

### 정책 결정에서 현재 runtime까지

```text
사용자 문제와 선택지
→ 정책검토 Issue의 검토 결과
→ 설계 반영 PR
→ 공식 설계 문서
→ 기능변경 Issue의 범위·완료 기준
→ runtime contract / Definition / code / test PR
→ 현재 source와 GitHub 실행 상태
```

Issue #93 → PR #94 → Issue #95 → PR #96~#100이 이 흐름의 실제 사례다. PR #94는 설계 문서 한 파일만
수정했고, 최종 단순화 PR #100은 설계·스킬·reference·Definition·script·test를 포함한 78개 파일을 함께
변경했다. 과거 정책을 보존하는 Issue와 현재 실행 source의 역할이 다르다는 점을 보여 준다.

### 하네스 생성 기준에서 타겟 역할 자산까지

```text
harness/SKILL.md의 Phase orchestration
→ reference-map.md에서 판단 축 선택
→ team-spec-contract.md + team-spec-schema.md와 필요한 leaf contract
→ 타겟 team-spec.md
→ .codex/config.toml + .codex/agents/*.toml + .agents/skills/*
→ verification-checklist.md 기반 audit
```

이 흐름에서는 타겟 `team-spec.md`가 역할 계약의 정본이고, agent·skill 파일은 생성된 표현이다. 반면 메타
생성기에서 `team-spec.md`를 어떻게 작성할지에 관한 기준은 두 reference가 공동 소유한다.

### 타겟 관찰에서 생성기 개선까지

```text
타겟 생성물과 실제 실행 로그
→ target-evaluation-playbook.md 기준 평가
→ .harness/evaluations/targets/* 관찰 기록
→ 단일 타겟 로컬 보강 / 반복 결함 분류
→ evolution-contract.md의 승격 게이트
→ 사용자 결정 후 harness SKILL 또는 leaf reference 변경
```

평가 기록 안에 현재와 다른 `.codex/skills/*` 경로가 남아 있어도 기록 시점의 관찰이므로 현재 source의 오류로
보지 않는다.

## 문서 참조 방향

### 사용자와 사람의 설명 경로

```text
README.md
├─ install.sh / uninstall.sh
├─ harness/SKILL.md와 주요 reference 개념
├─ github-workflow-engine/SKILL.md
├─ docs/github-workflow-engine.md
└─ .harness의 품질 평가·회귀 진입점
```

README는 여러 정본을 사용자 관점으로 요약하는 파생 설명이다. 현재 17개 스킬 이름의 상세 나열은 향후
에이전트 또는 기여자용 문서가 생길 때 이관한다. Day 4에서는 새 문서 도입 여부가 아니라 이관 전 README에
필요한 최소 정보와 late discovery 위험을 판단한다.

### Harness의 discovery와 실행 경로

```text
harness/SKILL.md
→ reference-map.md
→ 현재 판단 축의 leaf reference 1~2개
→ 타겟 team-spec·agent·skill·운영 문서 생성
→ verification / evaluation reference
```

`reference-map.md`는 22개 reference를 판단 축별로 연결한다. leaf reference가 서로 직접 연결될 때도 있지만,
index에서 시작해 현재 축만 읽는 방향이 기본이다.

### Workflow Engine의 runtime 경로

```text
github-workflow-engine/SKILL.md
├─ 기본: workflow-definition-contract + normalized-fact-adapter-contract
├─ 조건부: state / artifact / user-decision / review / execution / validation 계약
├─ workflow별 Definition + state adapter
└─ validator + evaluator

thin skill/SKILL.md
→ 공유 runtime contract의 named section
```

### 검증의 역방향 참조

테스트는 runtime source를 소비할 뿐 아니라 책임 경계를 역으로 고정한다.

- `skill-structure-contract.test.mjs`: `SKILL.md`가 얇고 package 자산 역할을 설명하는지 검사한다.
- `reference-boundary-contract.test.mjs`: 계약 분리와 thin skill의 named-section 링크를 검사한다.
- workflow fixture tests: Definition, adapter, validator, evaluator의 실행 의미를 검사한다.
- `agent-lifecycle-contract.test.mjs`: 설계 문서, harness 계약, target editor와 lifecycle 계약이 같은 소유권을
  말하는지 교차 검사한다.
- `all-fixtures.test.mjs`: 하위 테스트를 집계하고 설치 tree가 source와 같은지 확인한다.

현재 Markdown 문서들은 일반적인 clickable link보다 backtick 경로와 named section으로 서로를 가리킨다.
Codex가 파일 경로를 직접 읽는 구조에는 맞지만, 사람의 클릭 탐색성은 Day 4에서 별도로 평가할 수 있다.

## 대표 변경의 Documentation Dependency

| 변경 종류 | 먼저 확인할 정본 | 함께 검토할 자산 | 검증 종점 |
| --- | --- | --- | --- |
| Workflow 설계 원칙 변경 | 정책검토 결정, `docs/github-workflow-engine.md` | 영향받는 runtime contract, SKILL, Definition·code | 관련 contract test와 전체 fixture |
| 특정 workflow 전이 변경 | 해당 `definitions/*.json`, state adapter, evaluator | 설계 설명, output contract, 관련 thin skill | workflow별 fixture test + `all-fixtures` |
| Definition 형식·유효성 변경 | `validator.mjs`, `workflow-definition-contract.md` | parser, expression, evaluator, 모든 Definition·fixture | structural·semantic·evaluator tests |
| 전용 스킬 출력 변경 | `artifact-output-contract.md`의 named section | 소비 thin skill, 해당 workflow Definition의 executor reference | `reference-boundary-contract.test.mjs` + workflow test |
| Issue·PR 본문 규칙 변경 | 타겟 `.github/*`, `github-templates.md`의 범위별 책임 | issue/pr skill, artifact contract, harness template compatibility, 설계 설명 | reference boundary test + target 정합성 audit |
| team-spec 역할 계약 변경 | `team-spec-contract.md` + `team-spec-schema.md` | harness SKILL, reference-map, initial generation, skill writing, verification, regression checklist | 수동 문서 회귀와 target 재생성 평가 |
| 하네스 Phase·재진입 변경 | `harness/SKILL.md`, phase/reentry leaf contract | logging, orchestration, verification, evaluation refs | document regression + target evaluation |
| capability cache 구조 변경 | harness Phase 5 기록 규칙, review runtime contract | `docs/github-workflow-engine.md`, README, target JSON 생성·읽기 경로 | target 생성·갱신 후 실제 workflow 재개 확인 |
| 설치 동작 변경 | 변경 대상 script | README의 사용자 동작 설명, `.codex-dist/skills`, install regression | shell syntax + 임시 설치 tree 검사 |
| 평가 기준 변경 | 해당 quality/evolution leaf contract | 개발 평가 진입 문서, corpus README, regression checklist | target 평가 재실행 또는 근거 있는 수동 audit |

## 코드와 문서가 충돌할 때의 현재 우선순위

현재 저장소는 모든 충돌에 “코드가 무조건 우선”이라는 하나의 규칙을 쓰지 않는다.

1. **현재 실행 동작 확인**: 실행 코드, Definition, adapter, GitHub·Git 관측 결과를 사실로 본다.
2. **의도 확인**: 해당 범위의 설계 문서와 runtime contract에서 기대 동작을 확인한다.
3. **불일치 처리**: 코드를 문서에 맞는 것으로 상상하거나 문서를 코드에 맞게 즉시 고치지 않고 결함 후보로
   기록한다. 설계 변경이 필요하면 정책검토, 구현 결함이면 기능결함 흐름을 사용한다.
4. **특수 우선순위**:
   - Workflow 전이는 Definition·adapter·evaluator가 우선한다.
   - Definition 유효성은 `validator.mjs`가 실행 계약이다.
   - GitHub Workflow 상태는 로컬 로그보다 우선한다.
   - target template body는 `github-templates.md`의 본문 설명보다 우선하며 contract로 정합성을 검사한다.
   - target 역할 정의는 `team-spec.md`가 generated agent·skill보다 우선한다.
   - 현재 저장소 재조사와 사용자 입력은 `exploration-notes.md`보다 우선한다.
   - 저장소 `.codex-dist/skills/*`는 설치된 runtime copy의 편집 원천이다.

Issue #93의 옛 schema·registry 계획과 현재 PR #100 이후 source의 차이는 이 우선순위가 필요한 구체적인 사례다.
Issue는 결정 당시의 단계적 계획을 설명하지만 현재 실행에는 존재하지 않는 자산까지 포함하므로, 현재 source를
대신할 수 없다.

## 지식 중복과 불명확성 분석

### 의도된 중복과 파생 설명

- `README.md`와 source 자산: README는 타겟 사용자 관점의 설명이고 source는 실행 원천이다.
- `docs/github-workflow-engine.md`와 runtime reference: 설계 이유와 실행 계약의 분리다.
- `.github/*`와 `github-templates.md`: 실제 body와 공통 검증 계약의 분리다.
- `AGENTS.md`와 `.gemini/styleguide.md`: 같은 리뷰 원칙의 도구별 adapter다.
- `.harness/development-quality-evaluation.md`와 품질 reference: 메타 저장소용 진입 절차와 재사용 가능한 판정
  계약의 분리다.
- `install.sh`와 `uninstall.sh`의 `CODEX_SKILLS`: **사용자 제공 운영 맥락**에 따라 각 실행이 독립 소유하는
  충분하고 의도된 중복이다.

현재 이 항목들에서 즉시 수정할 불일치는 확인하지 못했다.

### `team-spec-contract.md`와 `team-spec-schema.md`의 공동 소유 범위

#### 현재 상태

- **사실**: 두 문서는 합계 442줄이며 필수 field, 최종 역할 inventory 형식, `role_id`·`agent_file`, model,
  reasoning, sandbox, 우선 입력, 생성 규칙과 검증 기준을 넓게 반복한다.
- **사실**: `harness/SKILL.md`는 두 문서 모두를 상세 기준으로 읽게 한다.
- **사실**: PR #27은 역할 실행 기준의 상세 규칙을 이 두 문서에 두는 방향을 의도적으로 도입했다.
- **사실**: 현재 직접 충돌하는 값은 확인하지 못했다.

#### 영향

정본이 두 파일의 공동 집합이라는 점은 확인되지만, 개별 규칙을 어느 문서가 최종 소유하는지는 분명하지 않다.
동일한 field나 default를 바꿀 때 두 문서를 함께 수정해야 하고, harness 쪽 검증은 주로 수동 checklist라 drift를
늦게 발견할 수 있다.

#### 개선 선택지

1. 현재 두 문서를 유지하되 `contract = 불변 조건·권한`, `schema = field shape·생성 mapping`처럼 개별 책임을
   명시하고 반복 규칙은 한쪽으로 모은다.
2. 두 문서를 하나의 canonical contract로 통합한다.
3. 현재 구조를 유지하고 대표 중복 field의 의미 일치만 결정론적으로 검사한다.

#### 권장 방향

**사용자 결정**: 두 문서를 유지하되 개별 책임을 명시하는 선택지 1로 개선한다.

- `team-spec-contract.md`: 권한, 불변 조건, 생성 순서, 정본과 파생 자산의 관계를 소유한다.
- `team-spec-schema.md`: 실제 section·field 구조, 표기 형식, 작성 예시와 구조 검증 기준을 소유한다.

두 문서는 동시에 설계된 것이 아니다. Git 이력상 `team-spec-schema.md`는 스크립트 기반 team-spec 생성과 함께
2026-04-13의 PR #20에서 먼저 추가됐고, `team-spec-contract.md`는 실행 스크립트를 제거하고 Markdown 계약
기반으로 전환한 2026-05-07의 PR #24에서 추가됐다. 2026-06-11의 PR #27에서 두 문서를 상세 규칙의 공동
원천으로 확장하면서 현재의 중복이 굳어졌다.
따라서 현재 상태는 잘못된 이중 설계라기보다 실행 모델 전환 과정에서 생긴 역사적 계층화로 본다.

공식 reference 재정렬은 별도 변경으로 수행한다. 현재 Runtime Engineering 우선순위를 감안해 다음 team-spec
규칙 변경 전에 위 경계를 기준으로 중복 규칙의 소유 위치를 정리한다.

#### 변경하지 않을 경우

현재 동작은 유지되지만 두 문서 중 하나만 갱신하는 순간 타겟 생성 기준이 달라질 수 있다.

### 문서 회귀의 `humanize-korean` 의존성

#### 조사 당시 상태와 후속 반영

- **조사 당시 사실**: `.harness/document-regression-checklist.md`는 모든 Markdown 수정 후 `humanize-korean` 기준으로
  문장을 다듬도록 한다.
- **조사 당시 사실**: 저장소 안에서 `humanize-korean`을 언급하는 곳은 이 한 곳뿐이었다.
- **조사 당시 사실**: `install.sh`, README의 외부 의존성 설명, repository source는 이 스킬을 설치하거나 버전 고정하지 않았다.
- **조사 당시 사실**: 당시 설치된 전역 `humanize-korean` v2.0.0은 사용자가 AI 문체 윤문을 요청할 때 활성화하며,
  실행 시 `_workspace/<run_id>/` 산출물을 만들도록 정의한다.
- **조사 당시 사실**: `_workspace/`는 `.gitignore` 대상이 아니었다.
- **후속 반영 사실**: PR #101이 checklist의 해당 지시 한 줄을 제거했다. merge commit은 `80cdcd0`이며,
  현재 운영 자산에는 이 스킬을 실행하라는 참조가 남아 있지 않다. 이 보고서의 언급은 조사 이력이다.

#### 영향

조사 당시에는 저장소만 읽은 다음 작업자가 이 회귀 조건을 재현할 수 없었다. 외부 스킬의 활성화 조건과 산출물 정책을
그대로 적용하면 일반 문서 변경마다 별도 작업 공간이 생길 수 있어, 체크리스트가 의도한 단순 문장 검토와 실제
스킬 실행 계약도 일치하지 않았다. PR #101 반영 후 이 영향은 해소됐다.

#### 개선 선택지

1. `humanize-korean`을 필수 외부 품질 의존성으로 정의하고 설치·버전·실행·산출물 처리 기준을 관리한다.
2. 특정 스킬 의존을 제거하고 저장소가 원하는 문장 품질 기준을 checklist 자체에 짧게 둔다.
3. 필수 완료 조건이 아닌 선택적 윤문 도구로 명확히 낮춘다.

#### 권장 방향

**사용자 결정**: `humanize-korean`은 이 저장소와 무관하며 명시적으로 사용해서는 안 된다. 따라서 외부 품질
의존성이나 선택적 도구로 관리하지 않고, `.harness/document-regression-checklist.md`의 해당 지시를 제거하는
것이 올바른 후속 조치다. 저장소 자체의 Markdown 의미 검증 기준은 나머지 checklist 항목으로 계속 수행한다.

이 결정은 PR #101에서 공식 checklist에 반영됐다. `humanize-korean`을 설치 목록에 추가하거나 대체 실행 절차를
만들지 않았으며, 나머지 Markdown 의미 검증 기준은 그대로 유지했다.

#### 해결 결과

문서 회귀 완료 조건에서 저장소 밖 의존성이 제거됐다. 다음 세션은 별도 스킬이나 예상하지 않은 로컬 산출물 없이
checklist의 저장소 자체 기준만 적용할 수 있다.

### README의 17개 스킬 상세 목록

README는 타겟 사용자를 위한 파생 안내이고 두 installer의 목록은 각 script가 독립 소유한다. 따라서 README의
목록은 설치 대상의 정본 문제로 다루지 않는다. **사용자 결정**에 따라 전체 스킬 이름과 개별 설명은 향후
에이전트 또는 기여자용 문서가 실제로 만들어질 때 그쪽으로 이관한다. 현재는 contributor onboarding 문서를
새로 만드는 시점이 아니므로, README에서 먼저 제거해 정보가 사라지게 하거나 새 문서를 선행 생성하지 않는다.
Day 4에서는 이 결정에 따라 이관 전까지 README에서 필요한 최소 정보와 late discovery 위험만 평가한다.

### 별도 Decision Record 문서 도입 여부

GitHub 정책 Issue가 선택지와 결정을, PR이 반영 파일과 검증을 충분히 보존한다. commit message의 PR 번호로
역사를 추적할 수도 있다. 현재 설계 문서가 반영된 과거 Issue를 별도 원천으로 사용하지 않는다고 명시하므로,
로컬 ADR이나 decision index를 추가하면 현재 구조에서는 오히려 세 번째 사본이 된다. 별도 도입은 보류한다.

## 개선 후보

1. `team-spec-contract.md`는 권한·불변 조건·생성 순서·정본 관계를, `team-spec-schema.md`는 구조·형식·예시·구조
   검증을 소유하도록 공식 reference를 재정렬한다.
2. **완료**: `.harness/document-regression-checklist.md`에서 저장소와 무관한 `humanize-korean` 지시를
   PR #101로 제거했다.
3. 에이전트 또는 기여자용 문서가 만들어질 때 README의 17개 스킬 상세 목록을 그 문서로 이관한다.

## 변경 유형 분류

| 분류 | 후보 | 현재 판단 |
| --- | --- | --- |
| 즉시 수정 | `.harness/document-regression-checklist.md`의 `humanize-korean` 지시를 제거한다. | **완료**. PR #101, merge commit `80cdcd0`에서 제거했으며 추적 파일에 실행 참조가 남아 있지 않다. |
| 정책 검토 | `team-spec-contract.md`와 `team-spec-schema.md`의 규칙 소유권을 나눈다. | 사용자 결정 완료. contract는 권한·불변 조건·생성 순서·정본 관계, schema는 구조·형식·예시·구조 검증을 소유하는 방향으로 후속 변경한다. |
| 기능 제안 | 없음 | 새로운 runtime 기능이나 평가 도구가 필요하다는 근거가 없다. |
| 보류 | README의 17개 스킬 상세 목록을 이관한다. | 에이전트 또는 기여자용 문서가 실제로 만들어질 때 이관한다. 그 전에는 정보 유실을 피하기 위해 현 위치를 유지한다. |
| 보류 | 별도 ADR·Decision Record index를 추가한다. | GitHub와 현재 설계 문서의 역할 분리가 충분하며 새 사본의 유지 비용이 더 크다. |
| 보류 | harness 문서 의미 일치 자동화 도구를 추가한다. | 현재는 수동 의미 검증이 의도된 구조이고, 반복 결함 근거가 없다. |

Day 3 최초 조사에서는 학습 결과 문서 외의 공식 자산을 수정하지 않았다. 사용자 결정 후 별도 PR #101에서
명백한 checklist 오류 한 줄만 제거했으며, 공식 설계, runtime source, 스크립트와 테스트는 변경하지 않았다.

## 검증 결과

- `git ls-remote origin refs/heads/docs/repository-evolution-workshop`: 원격은 `db6e158`, 로컬은 Day 2
  커밋 `911ac06`으로 한 커밋 앞섬
- `gh pr list --state open`: 열린 PR 없음
- `gh issue list --state open`: 관련 없는 정책검토 #37만 확인
- GitHub 정책·반영 기록: Issue #39, #40, #93, #95와 PR #25, #27, #34, #94, #100 직접 확인
- `node --test .codex-dist/skills/github-workflow-engine/tests/workflow-definition/all-fixtures.test.mjs`: 통과
- `sh -n install.sh`: 통과
- `sh -n uninstall.sh`: 통과
- `git diff --check`: 통과
- 후속 PR #101: Claude 코드 리뷰에서 안전하고 승인 가능 판정, 게시할 피드백과 review thread 없음
- merge commit `80cdcd0`: `.harness/document-regression-checklist.md` 한 줄 삭제, 현재 브랜치에 포함됨
- `git grep -n 'humanize-korean' HEAD -- .harness/document-regression-checklist.md .codex-dist README.md install.sh uninstall.sh`:
  운영 자산의 실행 참조 없음. `docs/reviews/*`의 언급은 조사·해결 기록으로 유지

## 오늘 새롭게 이해한 것

- 이 저장소의 Source of Truth는 파일 하나가 아니라 판단 범위별 canonical set으로 구성된다.
- 설계 문서, runtime contract, Definition·code는 같은 주제를 반복하는 사본이 아니라 이유·경계·실행을 나눈다.
- GitHub Issue는 활성 작업에서는 요구사항과 상태를 제공하지만, 반영 완료 후에는 역사적 Decision Record가 된다.
- 테스트가 코드 동작뿐 아니라 문서 section과 책임 경계도 일부 고정하므로 executable knowledge 역할을 한다.

## 기존 생각이 바뀐 부분

- 과거 정책 Issue가 상세하더라도 현재 설계와 runtime source보다 우선하지 않는다.
- `reference-map.md`는 전체 지식의 정본이 아니라 leaf contract를 찾게 하는 discovery layer다.
- `team-spec-contract.md`와 `team-spec-schema.md`는 단순 정본·파생 관계가 아니라 현재 공동 정본으로 의도됐다.
  이는 동시에 계획된 이중 설계가 아니라 스크립트 기반 생성에서 Markdown 계약으로 전환한 이력의 결과다.
- README의 전체 스킬 목록 문제는 installer와의 정합성보다 사용자에게 필요한 정보량 문제다.

## 저장소에서 확인한 근거

- `docs/github-workflow-engine.md`가 설계 원천, runtime source, 과거 Issue의 역할을 첫 section에서 명시한다.
- `github-workflow-engine/SKILL.md`가 기본·조건부 계약과 workflow별 Definition·adapter를 직접 연결한다.
- `validator.mjs`와 `evaluator.mjs`가 Definition 유효성과 단일 전이를 실제 코드로 판정한다.
- contract·workflow·lifecycle test가 문서, Definition, 코드와 thin skill의 연결을 검사한다.
- PR #27이 `team-spec-contract.md`와 `team-spec-schema.md`를 공동 상세 원천으로 도입했다.
- 문서 회귀 checklist의 `humanize-korean`은 조사 당시 저장소 안의 유일한 참조였으며, 사용자가 저장소와
  무관한 의존성으로 확인한 뒤 PR #101에서 제거했다.

## 현재 구조의 강점

- 범위별 Source of Truth가 여러 문서에 명시되어 있다.
- 현재 설계, runtime 계약, 실행 코드, GitHub 상태, 관찰 기록의 권한이 구분된다.
- leaf contract와 named section 참조로 필요한 지식만 읽을 수 있다.
- 역사적 결정과 현재 실행 source를 분리해 오래된 Issue가 runtime을 지배하지 않는다.
- 주요 Workflow Engine 지식 의존성이 결정론적 테스트로 보호된다.
- 타겟 관찰을 반복 근거 없이 생성기 규칙으로 일반화하지 않는다.

## 남은 의문

1. `team-spec` 두 reference의 경계를 공식 문서에 반영할 때, 현재 중복 규칙을 어느 순서로 이동해야 기존
   하네스 생성 흐름의 발견 경로를 깨뜨리지 않는가?
2. 에이전트 또는 기여자용 문서를 도입할 정도로 contributor onboarding이 우선순위에 오르는 시점은 언제인가?

## 다음 Day의 선행 조건

Day 4 Progressive Disclosure에서는 다음 기준을 입력으로 사용한다.

1. README는 타겟 사용자용 파생 안내이며 contributor Source of Truth로 확장하지 않는다.
2. `harness/SKILL.md → reference-map.md → leaf contract`와
   `github-workflow-engine/SKILL.md → 조건부 contract → Definition·code` 경로를 각각 평가한다.
3. README의 전체 스킬 나열은 정확성 문제가 아니라 이관 전 임시 위치로 본다. Day 4에서는 첫 성공에 필요한
   최소 정보와 late discovery 위험을 평가하되, 에이전트·기여자 문서를 새로 만들지는 않는다.
4. 중요한 안전 제약이 leaf reference에만 있어 너무 늦게 발견되는지 세 개 이상의 실제 시나리오로 확인한다.
5. `team-spec` 공동 정본은 유지하되 contract와 schema의 결정된 책임 경계를 Day 4 탐색 비용 분석에 사용한다.
6. PR #101로 제거된 `humanize-korean`은 해결 완료 항목이며, 저장소 지식이나 문서 검증 절차로 취급하지 않고
   Day 4 조사 범위에서 제외한다.
7. GitHub Issue·PR 기록과 평가 corpus는 필요할 때 이유와 관찰을 보충하지만 runtime 초기 context에는 넣지 않는다.
8. 현재 우선순위인 Runtime Engineering을 바꾸는 contributor onboarding 확장은 제안하지 않는다.
