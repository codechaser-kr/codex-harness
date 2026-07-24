# Phase 1 Day 5: Documentation-to-Code Consistency

## 문서 성격

이 문서는 Repository Evolution Workshop Phase 1 Day 5의 학습·조사 결과다. 공식 설계 원천이나
runtime 계약이 아니며, 현재 checkout에서 문서가 설명하는 명령, 경로, 스킬, 상태와 실제 구현을
대조한 시점 기록이다.

명백한 오류가 아닌 항목은 이 문서에서 바로 구현하거나 공식 문서를 변경하지 않는다. 개선 후보는
`즉시 수정`, `정책 검토`, `기능 제안`, `보류`로 분류하고 사용자 결정 뒤 별도 작업으로 진행한다.
최초 조사 이후 별도 작업으로 반영된 결과는 원래 판단을 지우지 않고 `후속 반영`으로 구분해 기록한다.

## 조사 기준선

- 조사일: 2026-07-24 KST
- 현재 브랜치: `docs/repository-evolution-workshop`
- 현재 로컬 HEAD: `5c539dfe1ca6233404d7c72b26743dc025ed56ee`
- `main`, `origin/main`: `a48f80d7ca7f2585809ca2002be982164919d52d`
- `origin/docs/repository-evolution-workshop`:
  `9075c54c1a1cd0d8bcd99b006d5d6d83546860f4`
- GitHub 상태: 열린 PR 없음, 열린 이슈는 정책검토 #37 한 건

현재 브랜치는 `main`의 최신 commit을 포함한다. 다만 로컬 workshop 브랜치는 대응 원격 브랜치와
서로 다른 Day 4 commit을 하나씩 가져 `ahead 1, behind 1`이다. 이 차이는 Day 5의 문서-코드
불일치가 아니라 결과 문서의 전달·재개에 영향을 줄 수 있는 Git 상태다. 이번 조사에서는 사용자가
지정한 현재 checkout을 기준으로 삼고 pull, rebase, push를 수행하지 않았다.

## 후속 반영 기준선

- 후속 확인일: 2026-07-30 KST
- 현재 브랜치: `docs/repository-evolution-workshop`
- 보고서 갱신 직전 로컬·원격 workshop HEAD:
  `dcd419f6c6747d98b755cb01d65c53a228c3f65e`
- `main`, `origin/main`: `9f6d2f3abd2c12e8bf2dcbb335ba93e4ab10e7ad`
- Git 상태: workshop 브랜치는 최신 `main`을 포함하며, 보고서 갱신 직전 대응 원격 브랜치와
  동기화돼 있었다.

Day 5에서 분류한 즉시 수정과 두 정책 검토 후속 작업은 다음과 같이 `main`에 반영됐다.

| 조사 항목 | 후속 작업 | 반영 근거 | 현재 상태 |
| --- | --- | --- | --- |
| D5-1 전역 스킬 제거 설명 | README의 제거 범위와 recoverable backup 동작 명확화 | PR #103, merge `3927213` | 완료 |
| D5-2 리뷰 상태 원천 설명 | legacy marker comment 호환 계약 제거, review thread로 상태 원천 단일화 | Issue #107, PR #114, merge `8c29eb5` | 완료 |
| D5-5 Team Spec 문서 소유권 | contract와 schema의 책임 경계 및 직접 소비 문서 정렬 | Issue #108, PR #115, merge `9f6d2f3` | 완료 |

현재 README는 이 저장소가 관리하는 전역 스킬 전체를 active 경로에서 제거하고 `.removed.*` 경로로
이동한다고 설명한다. 리뷰 피드백 상태는 diff가 있는 review thread의 resolved/unresolved 상태만
사용하며 일반 PR issue comment와 legacy marker comment를 상태 원천으로 사용하지 않는다.
`team-spec-contract.md`는 정책·권한·불변 조건·생성 순서·정본 관계를,
`team-spec-schema.md`는 필수 구조·필드·형식·예시·구조 검증을 소유한다고 명시한다.

후속 보고서 갱신 뒤 `reference-boundary-contract.test.mjs` 집중 테스트 1/1과
`all-fixtures.test.mjs` 전체 집계 114/114가 통과했다. `sh -n install.sh`,
`sh -n uninstall.sh`, `git diff --check`도 모두 통과했다.

## 이전 Day에서 이어받은 판단

Day 1~4 결과와 사용자 피드백에서 다음 경계를 이어받되, 현재 파일과 동작을 다시 확인했다.

- `README.md`의 주 독자는 메타 저장소 기여자가 아니라 타겟 프로젝트에 하네스를 설치·생성할
  사용자다.
- `install.sh`와 `uninstall.sh`는 각자 관리 대상 목록을 독립적으로 소유한다. 두 목록을 공통
  manifest로 합치는 것은 현재 개선 목표가 아니다.
- README의 17개 스킬 상세 목록은 에이전트 또는 기여자 문서가 생길 때 이관을 검토하되 지금은
  유지한다.
- `.harness/workflow-engine.json`은 타겟 하네스 생성·갱신 시 의존성 상태를 한 번 확인해 기록하고,
  이후 runtime이 반복 검증 없이 신뢰하는 capability cache다.
- `.harness/reports/exploration-notes.md`와 `.harness/evaluations/*`,
  `.harness/logs/github-workflow-log.md`의 과거 기록은 현재 설계나 코드의 정본으로 사용하지 않는다.
- 개발 중인 저장소 source와 전역 설치 copy의 일시적 차이는 저장소 결함으로 취급하지 않는다.
- `humanize-korean`은 이 프로젝트의 runtime 의존성이 아니다. PR #101에서 실행 참조가 제거됐다.
- `team-spec-contract.md`와 `team-spec-schema.md`는 둘 다 유지한다. 전자는 권위, 불변 조건, 생성
  순서와 canonical/derived 관계를, 후자는 section, field, format, example과 구조 검증을 소유하도록
  경계를 명확히 하는 사용자 결정이 Issue #108과 PR #115를 거쳐 공식 reference에 반영됐다.

## 오늘 학습한 개념

### Documentation Drift

문서가 처음에는 구현과 맞았더라도 코드의 옵션, 경로, 상태 모델이 바뀐 뒤 설명이 따라오지 못하는
현상이다. 파일이 존재하는지만으로는 확인할 수 없고, 명령의 실제 영향 범위와 출력까지 비교해야 한다.

### Executable Documentation

문서의 주장 일부를 명령이나 테스트로 직접 증명할 수 있게 만드는 방식이다. 이 저장소에서는
`workflow-definition/cli.mjs`, `all-fixtures.test.mjs`, shell syntax 검사와 임시 HOME 설치가
대표적인 예다. 모든 설명을 코드로 바꾸는 뜻은 아니며, 경로 존재, 닫힌 JSON 계약, 설치 tree
동등성처럼 결정론적으로 판단 가능한 부분을 자동화하는 데 의미가 있다.

### Contract Consistency

README, 설계 문서, runtime reference, Definition, adapter, script가 같은 개념을 각자의 책임 수준에서
모순 없이 설명하는 성질이다. 설명의 상세도가 다른 것은 허용되지만, 상태 원천이나 삭제 범위처럼
사용자 행동의 결과가 달라지면 계약 불일치다.

### Traceability

문서의 주장을 실제 구현과 검증 근거까지 추적할 수 있는 성질이다. 이번 조사에서는
`README → script/SKILL/reference → Definition/adapter → test/실행 결과` 순서로 추적했다.

### Stale Reference

이름이 바뀌거나 제거된 파일·개념을 현재 실행 문서가 계속 가리키는 상태다. 과거 로그에 남은 옛 이름은
역사 기록이므로 현재 실행 참조와 구분해야 한다.

### Undocumented Capability

코드가 지원하지만 주 독자용 문서가 설명하지 않는 기능이다. 모든 내부 옵션을 README에 공개해야 하는
것은 아니다. 공개하면 사용자가 그 동작을 안정된 계약으로 기대하므로, 사용자 가치와 유지 책임을 함께
판단해야 한다.

## 현재 구조의 의도와 강점

### 사용자 안내와 실행 계약의 층이 분리돼 있다

`README.md`는 설치와 타겟 하네스 사용 흐름을 설명하고, `SKILL.md`는 활성화와 오케스트레이션,
`references/*.md`는 세부 runtime 계약, `definitions/*.json`과
`scripts/workflow-definition/*.mjs`는 결정론적 전이와 검증을 소유한다. README를 runtime 입력으로
사용하지 않는 현재 구조는 사용자 설명이 길어져도 실행 컨텍스트에 직접 비용을 만들지 않는다.

### 설치 범위가 실제 source tree와 일치한다

현재 `.codex-dist/skills/*/SKILL.md`가 있는 디렉터리는 17개다. `install.sh`와 `uninstall.sh`의
각 `CODEX_SKILLS` 목록도 17개이며, 서로와 source tree가 정확히 일치한다. 각 `SKILL.md`의
frontmatter `name`도 디렉터리 이름과 일치했다.

### Workflow Definition은 실행 가능한 계약으로 검증된다

다섯 Definition은 모두 `workflow_id`, `entry_task_action_id`, `facts`, `transitions`의 닫힌 구조를
사용한다. 현재 작업 수와 entry는 다음과 같다.

| Definition | `workflow_id` | 작업 수 | entry |
| --- | --- | ---: | --- |
| `feature-proposal.json` | `feature-proposal` | 8 | `FP-1` |
| `policy-review.json` | `policy-review` | 9 | `PR-1` |
| `feature-change.json` | `feature-change` | 7 | `FC-1` |
| `feature-fix.json` | `feature-fix` | 8 | `FF-1` |
| `implementation.json` | `implementation` | 36 | `FI-1` |

모든 non-null `executor_reference`는 현재 관리 스킬 17개 중 하나이거나 문서에 명시된 외부
실행기 `commit`, `claude/code-review`, `claude/awesome-code-review`,
`codex/awesome-code-review` 중 하나였다. 확인되지 않은 실행기 참조는 없었다.

### 상태 cache의 구조와 설명이 맞는다

`.harness/workflow-engine.json`에는 `dependencies.commit.available`,
`review.defaultMode`, `review.modes.<mode>.available`과 확인 근거가 기록돼 있다.
`review-runtime-contract.md`는 같은 필드를 요구한다. README도 이 파일을 설치·갱신 때 기록하고
runtime이 필요한 액션에 들어갈 때 읽는 설정으로 설명한다.

이는 사용자 피드백에서 설명한 “매번 외부 의존성을 재탐색하지 않고 생성 시 확인한 값을 신뢰한다”는
의도와 일치한다. 현재 계약은 `checkedAt`의 시간 경과만으로 재검증하라고 요구하지 않는다.

### stale runtime 참조가 제거돼 있다

현재 운영 자산에서 다음 과거 이름과 무관한 스킬 참조를 검색했으며 실행 참조는 발견되지 않았다.

- 제거된 과거 Workflow Engine rules 파일명
- 별도 workflow JSON Schema
- executor registry
- `humanize-korean`

과거 `.harness/logs/github-workflow-log.md`에 남은 이름은 역사적 실행 기록이므로 stale runtime
참조로 계산하지 않았다.

## 명령과 실제 동작 대조

| 문서 또는 계약의 명령 | 실제 대상 | 확인 결과 |
| --- | --- | --- |
| `./install.sh` | 로컬 `.codex-dist/skills` → 전역 스킬 root | 임시 HOME에서 17개 설치 성공 |
| 원격 `curl .../install.sh \| sh` | `main` archive 설치 | script와 URL 존재 확인. 이번 조사는 불필요한 원격 설치를 실행하지 않음 |
| `./uninstall.sh` | 관리 스킬 17개 | 임시 HOME에서 17개 모두 `.removed.<timestamp>.<pid>`로 이동 |
| 원격 `curl .../uninstall.sh \| sh` | 같은 제거 script | script와 URL 존재 확인. 이번 조사는 로컬 copy로 동작 검증 |
| `sh -n install.sh` | installer syntax | 통과 |
| `sh -n uninstall.sh` | uninstaller syntax | 통과 |
| `git diff --check` | 현재 변경 whitespace | 보고서 작성 전 통과 |
| Definition CLI `validate --definition` | 다섯 Definition | 모두 `{"status":"valid","errors":[]}` |
| `node .../all-fixtures.test.mjs` | Workflow Engine 전체 집계 | 98/98 통과, fail·skip 0 |

임시 설치·제거 검증은 실제 사용자 전역 경로를 변경하지 않도록 `/tmp` 아래의 별도 HOME에서 수행했다.
설치 뒤 active skill directory 17개가 존재했고, 제거 뒤 active directory는 0개,
복구 가능한 `.removed.*` directory는 17개였다.

`.harness/document-regression-checklist.md`의 최소 보조 명령은 현재 파일과 명령을 가리킨다.
고정 경로 `/tmp/gwk-install-test`를 사용하는 설치 확인은 반복 실행 때 timestamp backup을 남길 수 있지만,
검사 목적과 script 동작의 불일치는 아니다.

## 경로와 의존성 대조

### 저장소 내부 reference

관리 스킬의 Markdown에서 `references/*.md`와 `../<skill>/references/*.md` 형태의 참조를 추출해
현재 파일 tree와 대조했다. literal glob 표기인 `references/*.md`를 제외하면 누락된 참조 파일은
없었다.

`harness/references/workflow-engine-template-compatibility-contract.md`의
`../github-workflow-engine/references/github-templates.md`는 문서 파일 자체의 디렉터리가 아니라
현재 harness skill root를 기준으로 해석하는 경로다. `harness/SKILL.md`가 reference path를 현재
스킬 디렉터리 기준으로 해석한다고 명시하므로 현재 경로는 유효하다. 따라서 이것을 잘못된 상대 경로로
분류하지 않는다.

다만 현재 테스트는 이 문자열과 활성화 링크를 확인하지만 skill-root 기준으로 실제 파일을 resolve해
존재를 검사하지는 않는다. 이는 현재 오류가 아니라 자동 검증 보강 후보다.

### 타겟 생성 경로

README와 harness 계약에 등장하는 `.harness/docs/team-spec.md`,
`.harness/docs/orchestration-plan.md`, `.codex/agents/*`, `.agents/skills/*` 등은 메타 저장소에
항상 있어야 하는 source path가 아니라 타겟 프로젝트에 생성되는 경로다. 현재 checkout에 없다는
이유만으로 stale reference로 분류하지 않았다.

### 외부 의존성

문서에 명시된 다음 외부 의존성은 이 저장소의 설치 목록에 포함되지 않는다.

- `commit`
- `awesome-code-review`
- `sendbird/cc-plugin-codex`

현재 로컬 환경에서는 `commit/SKILL.md`, `awesome-code-review/SKILL.md`와
`sendbird/cc` plugin manifest가 실제로 확인됐다. 이는 현재 환경의 availability 근거일 뿐,
저장소가 해당 외부 의존성의 설치나 버전을 소유한다는 뜻은 아니다.

## 불일치와 문서화 공백

### D5-1. README의 제거 대상 설명은 실제 영향 범위보다 좁다

#### 구분

- 저장소 사실

  - `README.md:358`은 전역 스킬 제거가 `$HOME/.codex/skills/harness`를 대상으로 한다고 설명한다.
  - `uninstall.sh:7`은 17개 관리 스킬을 열거하고, `uninstall.sh:38`~`40`은 모두 순회한다.
  - `uninstall.sh:28`~`33`은 대상을 삭제하지 않고 `.removed.<timestamp>.<pid>`로 이동하며
    backup 위치를 출력한다.

- 직접 실행 사실

  - 임시 HOME에서 `uninstall.sh`는 설치된 17개 active directory를 모두 이동했다.

- 판단

  - 문서의 단수 경로 설명은 사용자가 예상하는 제거 범위를 실제보다 작게 만든다.
  - 제거가 복구 가능한 이동이라는 중요한 출력도 README에는 설명되지 않는다.

#### 영향

사용자가 `harness` 하나만 비활성화된다고 예상했는데 Workflow Engine 관련 전역 스킬까지 active
경로에서 사라질 수 있다. 데이터는 backup으로 남지만 다음 Codex 실행에서 사용할 수 있는 스킬 범위가
달라진다.

#### 분류

`즉시 수정 — 완료`. `uninstall.sh`의 동작은 바꾸지 않고 README가 “이 저장소가 관리하는 전역 스킬
전체를 active 경로에서 복구 가능한 backup 이름으로 이동한다”는 실제 동작을 설명하도록 PR #103,
merge `3927213`에서 반영했다.

### D5-2. README의 `comment` 상태 원천 표현이 세부 계약보다 넓다

#### 구분

- 저장소 사실

  - `README.md:100`은 issue/PR의 `review thread, comment`를 읽어 현재 위치와 다음 액션을
    판단한다고 요약한다.
  - `docs/github-workflow-engine.md:44`~`56`과
    `state-observation-contract.md`는 diff가 있는 review thread를 리뷰 피드백 상태 원천으로 삼는다.
  - PR issue comment는 리뷰 피드백 상태 원천이 아니며, 기존 marker comment만 호환 정보로 읽고
    transition, 완료·미완료, merge 대기 근거로 사용하지 않는다.

- 판단

  - README의 `comment`는 “읽을 수 있는 보조/호환 정보”와 “전이를 결정하는 상태 원천”을 구분하지
    않아 세부 계약보다 넓게 해석될 수 있다.
  - README 뒤의 `README.md:141`은 후속 전이 상태를 댓글이 아니라 issue body에 반영한다고
    보완 설명하므로 직접적인 runtime 모순이라고 단정하지 않는다.

#### 분류

`정책 검토 — 완료`. 저장소가 아직 배포되지 않았으므로 legacy marker comment 호환성을 유지하지
않기로 결정했다. Issue #107과 PR #114, merge `8c29eb5`에서 README 표현을 diff가 있는 review
thread 중심으로 좁히고 설계 문서, 상태 관측 계약과 Review Comment 스킬에서 legacy marker 관측
계약을 제거했다. 일반 PR issue comment를 리뷰 피드백 상태 원천으로 사용하지 않는 경계는 유지했다.

### D5-3. 원격 설치 source override는 코드에만 있다

#### 구분

- 저장소 사실

  - README는 `CODEX_HARNESS_DEST`, `CODEX_HARNESS_DEST_ROOT`를 설명한다.
  - `install.sh:4`~`9`는 추가로 `CODEX_HARNESS_REPO`, `CODEX_HARNESS_REF`, `CODEX_HOME`,
    `TMPDIR`을 지원한다.
  - 특히 `CODEX_HARNESS_REPO`와 `CODEX_HARNESS_REF`는 원격 archive source를 바꿀 수 있다.

- 판단

  - `CODEX_HOME`과 `TMPDIR`은 일반 환경 관례에 가까우며 README 필수 정보가 아니다.
  - `CODEX_HARNESS_REPO`와 `CODEX_HARNESS_REF`는 fork, branch, tag 설치에 쓸 수 있는 실제
    capability지만, 공개하면 지원되는 안정 계약으로 오해될 수 있다.

#### 분류

`보류`. 현재 README 주 독자는 `main`에서 정상 설치할 타겟 프로젝트 사용자다. fork/ref 설치를
지원할 사용자 시나리오가 생기거나 기여자 문서가 만들어질 때 공개 범위와 검증 책임을 정한다.

### D5-4. 설계 문서의 관리 스킬 inventory는 실행 목록보다 좁다

#### 구분

- 저장소 사실

  - README, source tree, 두 installer는 17개 관리 스킬을 말한다.
  - `docs/github-workflow-engine.md:842`와 표준 배포 tree에는
    `github-state-summary`, `github-simple-executor`, `target-harness-code-editor`가 나타나지 않는다.

- 이전 사용자 결정

  - README는 사용자용이고, 기여자용 inventory 정본은 아직 만들지 않는다.
  - 17개 상세 목록은 에이전트 또는 기여자 문서가 생길 때 그쪽으로 이관을 검토한다.

- 판단

  - 현재 실제 설치와 README는 일치하므로 타겟 사용자 흐름의 오류가 아니다.
  - 설계 문서의 목록을 당장 배포 manifest처럼 확대하면 설계 책임과 기여자 inventory 책임을
    다시 섞을 수 있다.

#### 분류

`보류`. Day 1의 결정을 유지한다. 기여자 지원 시점에 inventory 정본을 결정할 때 함께 정리한다.

### D5-5. `team-spec` 두 계약은 값 충돌보다 소유권 중복 위험이 남아 있다

#### 구분

- 저장소 사실

  - `team-spec-contract.md`와 `team-spec-schema.md` 모두 역할 field, reasoning 기본값, 역할 카드,
    코드 라우팅과 검증 기준 일부를 설명한다.
  - 현재 확인 범위에서는 같은 필드에 서로 다른 허용값을 강제하는 직접 충돌은 찾지 못했다.

- 사용자 결정

  - contract는 권위와 생성 불변 조건, schema는 구조와 형식 검증을 소유하도록 경계를 명시한다.

- 판단

  - 지금은 documentation drift가 발생한 결과보다 향후 drift가 생길 수 있는 중복 책임 상태다.
  - 공식 계약 문서 변경은 단순 문구 수정이 아니라 책임 경계 결정의 반영이므로 별도 범위가 필요하다.

#### 분류

`정책 검토 — 완료`. Issue #108과 PR #115, merge `9f6d2f3`에서 contract가 정책·권한·불변
조건·생성 순서·정본 관계를, schema가 필수 구조·필드·형식·예시·구조 검증을 소유하도록 공식
reference와 직접 소비 문서를 정렬했다. 두 문서에 같은 설명이 필요할 때 소유 문서만 규칙을 정의하고
다른 문서는 참조한다는 원칙과 책임 경계 회귀 테스트도 추가했다.

### D5-6. 로컬과 원격 workshop 브랜치가 갈라져 있다

#### 구분

- Git 사실

  - 로컬 HEAD와 원격 workshop branch는 공통 parent `9bd0cd0` 뒤 서로 다른 Day 4 commit을 갖는다.
  - 두 commit의 제목은 같지만 SHA가 다르다.

- 판단

  - 문서 내용과 코드 동작의 불일치는 아니다.
  - 새 세션이 원격 브랜치만 기준으로 시작하면 현재 로컬 Day 4·Day 5 결과와 다른 입력을 읽을 수 있다.

#### 분류

`보류 — 해소`. 사용자가 workshop 브랜치를 최신 `main` 기준으로 정렬했고, 후속 보고서 갱신 직전
로컬 `docs/repository-evolution-workshop`과 대응 원격 브랜치는 `dcd419f`에서 동기화돼 있었다.
최초 조사에서 기록한 divergence는 더 이상 다음 Day의 선행 위험이 아니다.

## 코드에만 존재하는 주요 capability

| capability | 구현 근거 | 사용자 문서화 판단 |
| --- | --- | --- |
| 원격 repository override | `CODEX_HARNESS_REPO` | fork 설치 수요가 확인될 때 검토 |
| 원격 ref override | `CODEX_HARNESS_REF` | branch/tag 설치를 안정 계약으로 지원할 때 검토 |
| 기존 설치의 timestamp backup | `install.sh:83`~`90` | 제거 설명과 달리 설치 충돌 복구에도 유용하므로 사용자 문서 후보 |
| 제거 대상의 recoverable move | `uninstall.sh:28`~`33` | D5-1 후속 PR #103으로 README 반영 완료 |
| `CODEX_HOME`, `TMPDIR` override | script 초기 환경값 | 표준 환경 동작으로 유지, README 필수 항목 아님 |

Workflow Definition CLI와 validator/evaluator API는 사용자 README에는 자세히 나오지 않지만
`workflow-definition-contract.md`에 문서화돼 있다. 이는 “코드에만 있는 기능”이 아니라
runtime·기여자 층에 문서화된 기능이므로 누락으로 분류하지 않는다.

## 자동 검증 가능한 항목

### 현재 이미 자동 검증되는 항목

- Definition 닫힌 구조, ID, fact domain, expression, graph 도달성, 조건 중복·빈틈
- evaluator의 대표 상태와 terminal/re-entry 동작
- adapter source contract, evidence와 입력 불변성
- 다섯 workflow와 implementation 반복 흐름
- 외부/내부 `executor_reference`의 주요 fixture 기대값
- runtime contract의 금지된 옛 파일명
- source와 임시 설치본의 recursive byte parity
- installer shell syntax
- `SKILL.md`의 주요 activation link와 named section 소비자
- validation mode와 agent lifecycle 계약
- legacy marker 식별자의 재등장과 review thread/PR issue comment 상태 원천 경계
- Team Spec contract·schema의 문서 소유권과 직접 소비 문서의 참조 목적

### 추가 자동화 후보

1. `install.sh`와 `uninstall.sh`의 각 목록을 source skill directory와 대조한다.
   공통 manifest를 만들지 않고 테스트가 두 독립 목록을 각각 검사하면 사용자 결정과 양립한다.
2. 모든 관리 `SKILL.md` frontmatter `name`과 디렉터리 이름을 검사한다.
3. Markdown의 skill-root relative `references/*.md`, `../<skill>/references/*.md`를 실제로 resolve해
   존재를 검사한다.
4. 모든 Definition의 non-null `executor_reference`가 관리 스킬 또는 명시된 외부 실행기 집합에
   속하는지 검사한다.
5. README 제거 설명을 기계적으로 검사하려면 “17” 같은 가변 숫자보다 “관리되는 전역 스킬 전체”,
   `.removed.` backup 의미 같은 안정 문구를 assertion 대상으로 삼는다.
6. README에 공개하기로 결정한 installer 환경 변수만 allowlist로 검사한다.

1~4는 같은 유형의 drift를 낮은 비용으로 잡을 수 있다. 다만 Day 6에서 저장소 제약과 fitness
function의 적절한 위치를 먼저 판단한 뒤 구현하는 편이 낫다.

## 개선 후보 분류

| 분류 | 후보 | 근거 | 이번 Day 처리 |
| --- | --- | --- | --- |
| 즉시 수정 | README 제거 범위를 관리 스킬 전체로 바로잡고 `.removed.*` backup을 설명한다. | D5-1, 실제 임시 제거 결과 | **완료**. PR #103, merge `3927213` |
| 정책 검토 | README의 `comment` 표현과 legacy marker compatibility 계약을 정리한다. | D5-2 | **완료**. Issue #107, PR #114, merge `8c29eb5` |
| 정책 검토 | `team-spec-contract.md`와 `team-spec-schema.md`의 소유 경계를 공식 문서에 반영한다. | Day 3 사용자 결정, D5-5 | **완료**. Issue #108, PR #115, merge `9f6d2f3` |
| 기능 제안 | 목록, frontmatter, 경로, executor 참조를 묶은 documentation consistency test를 추가한다. | 자동화 후보 1~4 | Day 6 제약 조사 뒤 범위 확정 |
| 보류 | installer의 `CODEX_HARNESS_REPO`, `CODEX_HARNESS_REF`를 README에 공개한다. | D5-3 | 사용자 수요·지원 계약이 생길 때 검토 |
| 보류 | 기여자용 17개 inventory 정본을 만든다. | D5-4, 기존 사용자 결정 | 기여자 문서 생성 시점 |
| 보류 | workshop 로컬/원격 branch를 reconcile한다. | D5-6 | **해소**. 최신 `main` 포함 및 보고서 갱신 직전 원격과 동기화 |

## 명백한 오류와 설계 판단의 분리

### 명백한 문서 오류

- README가 `uninstall.sh`의 실제 제거 범위를 `harness` 하나로 설명하는 점
- README가 recoverable move 결과를 설명하지 않아 제거 결과를 불완전하게 안내하는 점

두 내용은 현재 script 동작을 바꾸지 않고 문서만 바로잡을 수 있으며, 사용자 의도에 따라 설계가
갈리는 문제가 아니다. PR #103, merge `3927213`에서 모두 수정됐다.

### 설계 또는 공개 범위 판단

- README와 runtime에서 legacy marker comment 호환성을 유지할지: 유지하지 않는 것으로 결정하고
  Issue #107과 PR #114에서 반영 완료
- fork/ref installer override를 공개된 사용자 계약으로 만들지
- `team-spec` 두 계약의 공식 소유권 경계: 결정된 경계를 Issue #108과 PR #115에서 반영 완료
- 기여자용 inventory와 검증 진입점을 언제 만들지

## 오늘 새롭게 이해한 것

- 이 저장소에서 documentation consistency는 모든 문서가 같은 목록을 반복하는 것이 아니라,
  사용자 안내, 설계 원천, runtime 계약, 실행 정의가 각자의 층에서 같은 행동 결과를 말하는 것이다.
- 설치는 17개 관리 스킬과 source tree가 잘 맞지만, 제거 안내 한 문장이 실제 영향 범위를 충분히
  설명하지 못한다.
- `.harness/workflow-engine.json`의 오래된 `checkedAt`은 그 자체로 stale 오류가 아니다. 이 파일은
  매 실행 때 재검증하기 위한 상태가 아니라 생성·갱신 때 확인한 capability cache다.
- 상대 경로는 Markdown 파일 위치가 아니라 skill root 기준인 경우가 있다. 경로 검사도 이 저장소의
  해석 규칙을 반영해야 하며 일반 Markdown 상대 경로 규칙을 기계적으로 적용하면 오탐이 생긴다.
- 전체 집계 테스트는 98개 runtime·contract 검증을 통과하지만, 사용자 문장의 영향 범위까지 모두
  검증하지는 않는다.

## 기존 생각이 바뀐 부분

- `../github-workflow-engine/references/github-templates.md`를 처음에는 reference 파일 위치 기준의
  잘못된 경로 후보로 보았으나, harness가 명시한 skill-root 기준으로 다시 확인해 유효 경로로
  재분류했다.
- 설계 문서의 14개 스킬 표기를 새 documentation drift로 볼 수 있었지만, Day 1 사용자 결정과 현재
  독자 경계를 다시 확인해 기여자 inventory 시점까지 보류하는 기존 판단을 유지했다.
- `.harness/workflow-engine.json`의 `checkedAt`이 2026-07-11이라는 이유만으로 재검증 누락을 의심할
  수 있었지만, capability cache라는 사용자 설명과 runtime 계약을 확인해 정상 상태로 판단했다.

## 확인 근거

### 파일

- `README.md`
- `install.sh`
- `uninstall.sh`
- `docs/github-workflow-engine.md`
- `.harness/workflow-engine.json`
- `.harness/document-regression-checklist.md`
- `.harness/development-quality-evaluation.md`
- `.codex-dist/skills/harness/SKILL.md`
- `.codex-dist/skills/harness/references/*`
- `.codex-dist/skills/github-workflow-engine/SKILL.md`
- `.codex-dist/skills/github-workflow-engine/references/*`
- `.codex-dist/skills/github-workflow-engine/definitions/*.json`
- `.codex-dist/skills/github-workflow-engine/scripts/workflow-definition/*.mjs`
- `.codex-dist/skills/github-workflow-engine/tests/*`
- Phase 1 Day 1~4 결과 문서

### 실행

- Git branch, HEAD, upstream divergence와 `main` ancestor 확인
- GitHub open PR·issue 직접 조회
- 두 installer의 목록과 source skill directory 비교
- 17개 `SKILL.md` frontmatter 이름 비교
- 임시 HOME에서 실제 설치와 제거 실행
- 관리 Markdown의 reference 경로 추출·존재 확인
- Definition별 작업 수, entry와 `executor_reference` 추출
- 다섯 Definition CLI validate
- `node .codex-dist/skills/github-workflow-engine/tests/workflow-definition/all-fixtures.test.mjs`
- `sh -n install.sh`
- `sh -n uninstall.sh`
- `git diff --check`
- 후속 반영 확인: Issue #107·#108 상태와 PR #103·#114·#115 merge 상태 직접 조회
- 최신 `main`의 README, review 상태 관측 계약, Team Spec contract·schema 및 책임 경계 테스트 재확인

## 해결된 의문

1. README 제거 설명은 PR #103에서 별도 수정으로 반영했다.
2. README의 넓은 `comment` 표현은 legacy marker compatibility 제거 결정과 함께 Issue #107,
   PR #114에서 review thread 중심으로 좁혔다.
3. `team-spec` 두 계약의 경계는 별도 기능변경 Issue #108과 PR #115로 반영했다.

## 남은 의문

1. installer의 fork/ref override를 실제 지원 기능으로 간주할 사용 사례가 있는가, 아니면 개발·복구용
   내부 escape hatch로 둘 것인가?
2. Day 6 제약 검증에서 목록·경로·executor 정합성을 기존 `all-fixtures.test.mjs`에 넣을지, 별도
   repository consistency 진입점으로 둘지?

## 다음 Day의 선행 조건

Day 6 Repository Constraints에서는 이 문서를 입력으로 사용하되 다음을 현재 상태와 다시 비교한다.

1. D5-1, D5-2와 D5-5는 각각 PR #103, #114, #115에서 완료됐으므로 미해결 개선 후보로 다시
   분류하지 않는다. 관련 문구와 책임 경계를 repository constraint의 현재 기준으로 사용한다.
2. installer 목록을 공통 manifest로 합치지 않는다. 두 독립 목록 각각의 일관성을 제약으로 검증할
   수 있는지만 본다.
3. README의 17개 목록과 기여자 inventory는 현재 결정대로 유지하고 새 정본을 만들지 않는다.
4. `.harness/workflow-engine.json`을 capability cache로 취급하며 날짜만으로 stale 판정을 만들지 않는다.
5. 타겟 생성 경로가 메타 저장소에 없다는 이유로 path violation으로 판정하지 않는다.
6. skill-root relative reference 해석을 경로 제약의 입력으로 사용한다.
7. `all-fixtures.test.mjs`가 이미 보장하는 항목과 repository-level fitness function 후보를 구분한다.
8. 최초 조사 당시 workshop branch divergence는 해소됐다. 새 commit 또는 원격 갱신으로 상태가
   달라질 수 있으므로 Day 6 시작 시 일반 Git 기준선만 다시 확인한다.

## Day 5 완료 조건 점검

- [x] 명령, 경로, 개념의 불일치를 근거와 함께 목록화했다.
- [x] 명백한 문서 오류와 설계·공개 범위 판단을 분리했다.
- [x] 코드에만 존재하는 주요 capability를 식별했다.
- [x] 현재 자동 검증되는 항목과 추가 자동화 후보를 정리했다.
- [x] 현재 구조의 의도와 장점을 먼저 설명했다.
- [x] 저장소 사실, 사용자 결정, 조사 판단을 구분했다.
- [x] 개선 후보를 즉시 수정, 정책 검토, 기능 제안, 보류로 분류했다.
- [x] 다음 Day에서 결과 문서만으로 이어갈 수 있도록 의문과 선행 조건을 남겼다.
