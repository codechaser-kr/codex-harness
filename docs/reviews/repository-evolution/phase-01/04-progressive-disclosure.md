# Phase 1 Day 4: Progressive Disclosure 조사 결과

> [!NOTE]
> 이 문서는 Repository Evolution Workshop의 학습·조사 결과다. 현재 프로젝트의 공식 설계나
> 정책을 정의하지 않는다. 개선 후보는 사용자 결정과 별도 Issue·PR 절차를 거친 뒤 공식 자산에 반영한다.

## 조사 기준

- 조사일: 2026-07-23
- 후속 반영 확인일: 2026-07-24
- 브랜치: `docs/repository-evolution-workshop`
- 로컬·원격 기준 커밋: `9075c54c1a1cd0d8bcd99b006d5d6d83546860f4`
- `main` 기준 커밋: `a48f80d7ca7f2585809ca2002be982164919d52d`
- 상태: 후속 반영 확인 시작 시 작업 트리는 clean이고, `main`은 현재 브랜치의 ancestor이며, 로컬과 원격 작업
  브랜치 HEAD가 일치했다.
- GitHub 상태: 열린 PR은 없고, 열린 Issue는 이 작업과 직접 관계없는 정책검토 #37 한 건이다.
- 최근 관련 반영: Day 4 즉시 수정 PR #102는 2026-07-24 KST 기준 merge됐으며 merge commit
  `a48f80d`가 현재 브랜치에 포함돼 있다. 앞선 Day 3 즉시 수정 PR #101의 merge commit `80cdcd0`도
  그 조상으로 유지된다.
- 이전 Day 입력: `01-repository-entry-points.md`, `02-repository-map.md`,
  `03-knowledge-architecture.md`를 현재 파일과 다시 대조했다.

이번 문서에서는 근거를 다음처럼 구분한다.

- **사실**: 현재 파일, 코드, 테스트, Git 또는 GitHub 조회에서 직접 확인했다.
- **명시된 설계**: 저장소 문서나 스킬이 책임과 읽기 순서를 선언한다.
- **사용자 결정**: 이전 Day 보고서에 반영돼 현재 작업의 입력으로 확정된 운영 방향이다.
- **추론**: 사실과 명시된 설계로부터 도출한 해석이며 공식 정책은 아니다.

조사 범위에서는 다음 결정을 그대로 유지했다.

- README는 타겟 프로젝트 사용자를 위한 문서이며 contributor 진입 문서로 확장하지 않는다.
- `humanize-korean`은 PR #101로 해결 완료됐으며 이번 지식 경로에 포함하지 않는다.
- `.harness/evaluations/*`, 과거 Issue·PR과 생성 기록은 필요할 때만 읽는 관찰·역사 근거다.
- `.harness/workflow-engine.json`은 타겟 하네스 설치·갱신 시 확인한 의존성 상태를 재사용하는 capability
  cache이며 매 실행마다 다시 탐색하기 위한 파일이 아니다.
- README의 전체 스킬 목록은 향후 에이전트 또는 기여자 문서가 실제로 생길 때 이관하며, 이번 Day에 새
  문서를 만들지 않는다.

## 오늘 학습한 개념

### Progressive Disclosure

Progressive Disclosure는 정보를 숨기는 기법이 아니라, 현재 결정을 내리는 데 필요한 정보부터 보여주고 다음
결정이 생겼을 때 상세 지식을 활성화하는 구조다. 좋은 구조에서는 진입점이 전체 세부 규칙을 복제하지 않고,
어느 조건에서 어느 상세 원천을 읽어야 하는지 알려 준다.

### Context Budget

Context Budget은 한 작업에서 모델이 읽고 유지해야 하는 정보량이다. 파일 줄 수는 토큰 사용량과 같지 않지만,
초기 노출 비용과 반복 로딩 위험을 비교하는 근사 지표로 쓸 수 있다. 실행 코드가 큰 JSON을 직접 평가하고 결과만
반환하면 파일 전체가 실행에는 사용돼도 모델 문맥에 그대로 들어올 필요는 없다.

### Discovery Layer와 Activation Layer

- Discovery Layer는 사용할 수 있는 지식과 다음 읽기 위치를 찾게 한다.
- Activation Layer는 사용자 요청과 현재 상태가 특정 스킬이나 계약을 실제로 필요하게 만드는 조건이다.

이 저장소에서는 skill metadata와 `SKILL.md`가 activation과 상위 discovery를 함께 맡고,
`reference-map.md`, 조건부 contract 목록과 named section 링크가 상세 discovery를 맡는다.

### Just-in-time Knowledge

Just-in-time Knowledge는 리뷰, 파일 수정, 사용자 결정처럼 해당 단계에 도달했을 때만 필요한 계약을 그때 읽는
방식이다. 중요한 것은 늦게 읽는 것 자체가 아니라, 그 규칙이 필요한 행동보다 먼저 활성화되는가다.

### Information Overexposure와 Late Discovery Risk

- Information Overexposure는 현재 판단과 무관한 정보를 너무 일찍 읽어 문맥을 소비하는 문제다.
- Late Discovery Risk는 안전 제약이나 필수 입력을 해당 행동 뒤에 발견해 잘못 실행하거나 다시 작업하게 되는
  문제다.

두 문제의 해결 방향은 다르다. 과다 노출은 진입 문서를 얇게 하거나 조건부 참조를 강화하는 쪽이고, 발견 지연은
상위 문서에 제약 자체를 복제하기보다 활성화 조건과 필수 링크를 더 앞에 두는 쪽이다.

## 현재 구조가 의도한 단계적 지식 노출과 장점

### 1. 사람용 루트 문서와 runtime 진입점을 분리한다

- **사실**: README는 368줄이며 설치, 사용 예, 생성 결과, 범위와 한계를 타겟 사용자에게 설명한다.
- **사용자 결정**: README는 contributor나 runtime 계약의 단일 원천이 아니다.
- **사실**: 루트 `AGENTS.md`는 7줄이고 PR 리뷰 표현과 우선순위만 규정한다.
- **추론**: Workflow 요청을 수행하는 에이전트가 README 전체를 runtime 선행 입력으로 읽지 않는다면, 긴 사용자
  안내가 실행 문맥을 직접 점유하지 않는다.

### 2. `github-workflow-engine`은 기본 계약과 조건부 계약을 나눈다

- **사실**: `github-workflow-engine/SKILL.md`는 즉시 수정 반영 후 174줄이다.
- **명시된 설계**: `workflow-definition-contract.md`와 `normalized-fact-adapter-contract.md`만 기본 계약이고,
  상태 관측, 산출물, 사용자 결정, 리뷰, 구조화 실행, 명령 경로, 타겟 하네스, 검증 모드와 agent lifecycle은
  현재 작업 조건에 따라 추가한다.
- **사실**: 12개의 산출물 소비 스킬은 `artifact-output-contract.md` 전체가 아니라 자신에게 필요한 named
  section을 가리킨다.
- **사실**: `reference-boundary-contract.test.mjs`는 이 section 이름이 실제로 존재하는지 검사한다.
- **추론**: 책임별 문서 분할이 파일 수 증가에 그치지 않고 실행 시 선택적 로딩으로 연결된다.

### 3. 큰 Workflow Definition은 실행 가능한 지식으로 둔다

- **사실**: `feature-proposal.json`은 434줄, `implementation.json`은 1,475줄이다.
- **명시된 설계**: Definition은 상태와 전이 데이터이고, adapter는 출처 계약을 검증하며,
  `evaluator.mjs`가 현재 또는 다음 단일 작업을 계산한다.
- **사실**: evaluator는 외부 IO 없이 `currentTaskActionId`와 정규화 상태를 받아 `action_required`,
  `completed`, `stopped` 중 하나를 반환한다.
- **추론**: 에이전트가 Definition 전체를 자연어처럼 해석하지 않고 코드 평가 결과를 사용하면, 큰 상태 그래프는
  문맥 밖에서 결정적으로 처리할 수 있다. 이는 단순 문서 축약보다 강한 Context Budget 절감 방식이다.

### 4. 전용 스킬이 작업 직전의 얇은 실행 포인터 역할을 한다

- **사실**: 조사한 `feature-proposal-triage`, `issue-creation`, `pr-proposal`, `pr-creation`,
  `review-comment`, `github-state-summary`는 각각 56~96줄이다.
- **명시된 설계**: 각 스킬은 입력, 책임, 하지 않는 일, 사용자 결정, 중단, 후속 전이를 구분하고 필요한 contract
  section을 먼저 읽게 한다.
- **추론**: Workflow 전체 책임을 하위 스킬에 복제하지 않고 현재 산출물의 경계만 활성화한다.

### 5. 리뷰 의존성과 실행 경로는 실제 필요 시점까지 미룬다

- **명시된 설계**: 리뷰 모드는 사용자가 지원 모드 중 하나를 선택한 뒤에만 검사한다.
- **명시된 설계**: 선택된 모드가 `claude/*`일 때만 Claude 전용 contract를 읽는다.
- **명시된 설계**: `.harness/workflow-engine.json`의 저장된 `available` 값을 리뷰 실행 가능성 판정에 사용한다.
- **추론**: 매 Workflow 진입마다 외부 리뷰 도구를 다시 탐색하지 않으면서, 실제 리뷰 전에 필요한 capability
  제약은 확인한다.

### 6. 타겟 하네스의 역할 스킬도 얇은 포인터로 생성한다

- **명시된 설계**: 타겟 `.agents/skills/*/SKILL.md`는 `team-spec.md`의 해당 `role_id` section과 공통
  출력 블록만 가리키고 역할별 절차를 복제하지 않는다.
- **명시된 설계**: `AGENTS.md`는 상위 진입, agent TOML은 실행 metadata, `team-spec.md`는 역할 계약,
  보조 문서와 로그는 판단 근거와 재진입 상태를 맡는다.
- **추론**: 생성 이후 실제 역할 실행에서는 필요한 역할 section만 읽을 수 있고, 역할 정의 drift도 줄어든다.

## 정보 계층과 기본 접근 경로

| 계층 | 현재 자산 | 현재 책임 | 기본 노출 시점 |
| --- | --- | --- | --- |
| L0 사람용 진입 | `README.md` | 설치·사용·범위 설명 | 사람이 저장소를 처음 사용할 때 |
| L0 저장소 규칙 | `AGENTS.md` | 현재는 PR 리뷰 작성 규칙 | 저장소 범위 작업에서 자동 적용 |
| L1 활성화 | skill metadata | 무엇을 언제 사용할지 판정 | 사용자 요청 분류 시 |
| L2 workflow discovery | 각 `SKILL.md`, `reference-map.md` | 전체 흐름, 조건부 계약, leaf 위치 | 스킬 활성화 직후 |
| L3 실행 계약 | `references/*.md`, named section | 현재 판단과 안전 제약 | 해당 단계 진입 직전 |
| L4 실행 상태와 데이터 | GitHub, Git, target 파일, Definition·adapter·evaluator | 현재 사실과 다음 작업 계산 | 현재 작업을 계산할 때 |
| L5 이유와 관찰 | 설계 문서, 과거 Issue·PR, 평가 corpus, 생성 기록 | 이유 복원, 비교, 반복 결함 판단 | 현재 원천만으로 설명이 부족할 때 |

**추론**: L0부터 L5까지 항상 순서대로 모두 읽는 구조가 아니다. activation이 L2를 고른 뒤 L3~L4를
왕복하고, L5는 예외적으로 보충한다. 특히 README와 설계 문서는 runtime 초기 context의 필수 입력이 아니다.

## 문맥 비용의 근사치

줄 수는 정확한 토큰 수가 아니라 “선택 전 얼마나 많은 규칙을 통과하는가”를 비교하기 위한 값이다.

| 경로 | 진입·지도 | 기본 contract | 선택된 상세 자산 | 해석 |
| --- | ---: | ---: | ---: | --- |
| Workflow Engine | `SKILL.md` 174줄 | Definition contract 114줄 + adapter contract 57줄 | 상태 관측 67줄, 현재 thin skill 56~96줄, 필요한 named section | 기본 경로가 비교적 작고 조건부 분리가 명확하다. |
| 타겟 하네스 생성 | `SKILL.md` 422줄 + `reference-map.md` 314줄 | 선택 Phase에 따라 달라짐 | phase matrix 124줄, initial contract 200줄, team-spec contract/schema 442줄, verification 158줄 등 | leaf를 고르기 전 discovery 자체가 크다. |
| Workflow 상태 그래프 | feature proposal 434줄 / implementation 1,475줄 | 코드가 validator·adapter·evaluator로 처리 | evaluator 결과의 단일 task | JSON을 모델이 전부 읽지 않는 실행 경로를 지킬 때 비용이 제한된다. |

## 시나리오 1. 새로운 기능 제안

### 요청과 목표

사용자가 비정형 아이디어를 기능제안 Issue로 만들고, 생성 후 진행 방향까지 판단하는 흐름을 가정한다.
현재 Definition에서는 `FP-1`부터 `FP-8`까지 `issue-creation`, GitHub 상태 변경,
`feature-proposal-triage`, 방향 반영과 종료·후속 Workflow 전환을 순서대로 연결한다.

### 읽기 순서와 필요한 이유

1. skill metadata로 `github-workflow-engine`을 활성화한다.
   - 기존 GitHub 흐름의 시작 요청인지, 단순 Issue 초안 작성인지 구분한다.
2. `github-workflow-engine/SKILL.md`를 읽는다.
   - 사용할 Workflow, 기본 계약, 관측→정규화→평가의 단일 경로를 찾는다.
3. `workflow-definition-contract.md`, `normalized-fact-adapter-contract.md`를 읽는다.
   - Definition과 evidence가 유효한지, 추론으로 fact를 채우면 안 되는 이유를 확인한다.
4. `state-observation-contract.md`, 현재 GitHub Issue·label·template, `feature-proposal.json`,
   `feature-proposal-state-adapter.mjs`, evaluator를 사용한다.
   - 현재 fact를 출처와 함께 만들고 정확히 하나의 `FP-*` 작업을 계산한다.
5. `FP-1`이면 `issue-creation/SKILL.md`, 타겟의 실제 기능제안 template,
   `github-templates.md`, artifact contract의 Issue 생성 section을 읽는다.
   - 초안을 만들기 전에 형식과 사용 가능 판정을 적용한다.
6. 사용자 선택지가 반환된 시점에 `user-decision-contract.md`를 읽는다.
   - 초안 확정·수정과 이후 진행 방향 선택을 일반 진행 표현으로 추정하지 않는다.
7. `FP-2`처럼 확정된 GitHub 변경 직전에 structured execution과 command path contract를 읽는다.
   - 상태 변경 범위, 권한 경로와 사후조건을 실행 전에 확정한다.
8. `FP-3`에 도달했을 때만 `feature-proposal-triage/SKILL.md`와 artifact contract의 해당 named
   section을 읽는다.
   - Issue가 생성되기 전에는 필요하지 않은 진행 방향 판단을 미룬다.
9. `.harness/logs/github-workflow-log.md`는 GitHub 밖의 중간 상태를 보충할 때만 읽는다.
   - GitHub와 충돌하면 GitHub 상태를 우선한다.

### 너무 일찍 읽히는 정보

- 리뷰 runtime, Claude executor, target harness file edit, validation mode와 agent lifecycle contract는 이
  시나리오의 초안·분류 단계에 필요하지 않으며 현재 구조도 조건부로 남긴다.
- `github-templates.md`는 130줄의 네 Issue 유형과 PR 계약을 모두 담는다. `issue-creation`이 여러 Issue
  유형을 분류하는 범용 스킬이라 초기에는 의미가 있지만, 유형 확정 뒤에도 전체 파일을 읽는 비용은 남는다.
  현재 크기와 변경 빈도에서는 낮은 수준의 과다 노출로 본다.
- README, 사람용 설계 문서, 과거 기능제안 Issue와 평가 corpus는 기본 runtime 입력이 아니다.

### 너무 늦게 발견되는 정보

- 실제 타겟 template과 사용자 결정 규칙은 초안 생성·상태 변경 전에 활성화된다.
- 구조화 실행과 권한 경로도 실제 GitHub 변경 전에 활성화된다.
- **판정**: 이 시나리오에서는 실행 오류를 유발할 명확한 발견 지연을 확인하지 못했다.

### 효과와 유지 비용

- 기대 효과: 리뷰·파일 수정 계약을 읽지 않고 기능제안에 필요한 상태와 산출물 규칙에 집중할 수 있다.
- 유지 비용: Definition task, thin skill, artifact named section과 테스트의 이름이 함께 유지돼야 한다.
- 현재 완화책: `reference-boundary-contract.test.mjs`가 artifact section 연결을 검사한다.

## 시나리오 2. PR 생성과 리뷰

### 요청과 목표

구현 단위가 끝난 뒤 PR 초안을 만들고 PR을 생성한 다음, 사용자가 고른 리뷰 모드로 리뷰하고 feedback을
처리하는 흐름을 가정한다. `implementation.json`에서는 PR 초안 `FI-10`, 생성 결정 `FI-11`, 생성 입력
`FI-12`, 리뷰 모드 선택 `FI-13`, capability 확인 `FI-14`, 선택 provider `FI-15`~`FI-17`, 리뷰 결과
분류와 게시 `FI-18`~`FI-23`을 분리한다.

### 읽기 순서와 필요한 이유

1. Workflow Engine의 진입 스킬, 두 기본 contract와 state observation을 읽고 implementation
   Definition·adapter·evaluator로 현재 `FI-*` 작업을 계산한다.
2. `FI-10`에서 `pr-proposal/SKILL.md`, 타겟 PR template, `github-templates.md`의 PR 계약과 artifact
   contract의 PR 제목·제안 section을 읽는다.
   - 현재 변경과 검증 결과를 사용자 검토용 초안으로만 만든다.
3. `FI-11`에서 user decision contract를 적용한다.
   - PR 생성과 초안 수정을 구분하고 제목·본문을 확정한다.
4. `FI-12`에서 `pr-creation/SKILL.md`, PR 생성 named section, structured execution과 command path를
   읽는다.
   - 원격 head, base, 제목과 본문을 검증한 뒤에만 GitHub 변경을 수행한다.
5. PR 생성 뒤 `FI-13`에서 사용자가 리뷰 모드를 고른다.
   - default mode는 선택 후보이며 자동 확정값으로 사용하지 않는다.
6. 선택이 끝난 `FI-14`에서 `review-runtime-contract.md`와 타겟
   `.harness/workflow-engine.json`의 저장된 capability를 읽는다.
   - 리뷰가 실제로 필요한 시점에만 설치 시 확인한 `available` 값을 사용한다.
7. 선택 모드가 `claude/*`일 때만 `claude-review-executor-contract.md`를 추가로 읽는다.
8. 게시 가능한 feedback이 있을 때만 `review-comment/SKILL.md`, review runtime의 template·위치 section,
   artifact contract의 review-comment section과 현재 PR diff·thread를 읽는다.
   - feedback이 없으면 위치 매핑과 게시 계약을 읽을 이유가 없다.

### 너무 일찍 읽히는 정보

- 세 provider의 상세 실행 조건을 PR 초안 단계부터 모두 읽지 않는다.
- review-comment는 게시 가능한 feedback이 확인된 뒤에만 활성화된다.
- `github-templates.md` 전체를 PR 작업에서 읽는 낮은 수준의 과다 노출은 시나리오 1과 동일하다.

### 너무 늦게 발견되는 정보

- `.harness/workflow-engine.json`은 PR 작성이나 생성에는 필요하지 않으며 리뷰 모드 확인 직전에 읽어도
  실행을 되돌리지 않는다. 이 시점은 발견 지연이 아니라 just-in-time activation이다.
- diff position 제약은 review thread 초안을 만들기 전에 `review-comment`가 읽는다.
- **판정**: 명확한 발견 지연을 확인하지 못했다.

### 현재 GitHub 사례와 효과·비용

- **사실**: Day 4 즉시 수정 PR #102는 `fix/workflow-resume-contract-activation`에서 `main`으로
  merge됐고, `github-workflow-engine/SKILL.md`와 `reference-boundary-contract.test.mjs` 두 파일만
  변경했다. 현재 열린 PR은 없다.
- **사실**: PR #102의 리뷰 피드백은 테스트 이름 명확화, 긴 단언 분리, 재개 판정과 자동 실행 활성화 불릿
  분리로 반영됐다. 최종 merge commit `a48f80d`에는 네 개의 작업 커밋이 포함됐다.
- 기대 효과: 이처럼 작은 문서·테스트 변경도 리뷰 provider 전체와 feedback 게시 계약을 미리 읽지 않고 현재
  `FI-*` 단계에 필요한 정보만 활성화해 처리할 수 있다.
- 유지 비용: `implementation.json`의 36개 task와 provider별 contract·thin skill·state adapter의 fact
  연결을 함께 유지해야 한다.
- 현재 완화책: workflow fixture와 reference-boundary test가 Definition과 contract 경계를 검사한다.

## 시나리오 3. 중단된 Workflow 재개

### 요청과 목표

사용자가 “계속 진행”, 숫자 선택, 또는 “머지했습니다”처럼 기존 흐름을 재개하는 경우를 가정한다. 과거 대화의
마지막 추정을 그대로 사용하지 않고 현재 GitHub·Git·사용자 입력으로 같은 작업을 다시 계산해야 한다.

### 읽기 순서와 필요한 이유

1. skill metadata와 `github-workflow-engine/SKILL.md`를 읽어 재개 요청임을 식별한다.
2. 두 기본 contract, state observation contract, 선택 Workflow의 Definition·adapter·evaluator를 사용한다.
   - 현재 원본 상태를 다시 관측하고 evidence가 있는 fact만 만든다.
3. 재개 요청에 선택 입력이 있으면 `user-decision-contract.md`를 읽는다.
   - 직전 선택지와 일치하는 입력만 결정으로 사용한다.
4. `structured-execution-contract.md`의 중단과 재개 규칙을 적용한다.
   - GitHub와 현재 코드를 재관측하고, 재개 전과 같은 `currentTaskActionId`로 다시 평가하며, 로그와 GitHub가
     충돌하면 GitHub를 우선한다.
5. evaluator가 반환한 현재 task에 해당하는 thin skill과 조건부 contract만 활성화한다.
6. GitHub 밖의 실행 중간 상태가 필요할 때만 `github-workflow-log.md`를 보조 근거로 읽는다.

### 너무 일찍 읽히는 정보

- 완료된 과거 task의 모든 thin skill, 모든 provider, 사람용 설계 문서와 과거 대화 전체는 현재 task 계산에
  필요하지 않다.
- Workflow 로그도 GitHub와 local state만으로 current task가 결정되면 생략할 수 있다.

### 너무 늦게 발견될 수 있는 정보

- **사실**: `structured-execution-contract.md`는 `중단과 재개 판정 규칙` section에서 재관측, 동일
  `currentTaskActionId`, 로그의 보조 근거 지위와 GitHub 우선순위를 소유한다.
- **사실**: `github-workflow-engine/SKILL.md`의 조건부 읽기 목록은 structured contract를 “확정된 작업을
  자동 실행할 때” 읽도록 안내한다. 재개 요청 자체는 user-decision contract의 활성화 조건에는 들어가지만,
  structured contract의 활성화 조건에는 명시돼 있지 않다.
- **사실**: 같은 `SKILL.md`의 선언형 계산 절차에는 재개 시 `currentTaskActionId`를 전달하는 규칙이 있고 로그를
  보조 근거라고 설명하므로 핵심 정보가 완전히 사라진 것은 아니다.
- **추론**: 사용자 결정이나 중단 상태에서 재개해 아직 자동 실행 단계에 도달하지 않은 경우, authoritative한
  재개 section을 읽지 않을 수 있다. GitHub 우선순위와 동일 task 재평가 규칙의 상세 발견이 늦어질 위험이다.
- **판정**: 네 시나리오 중 확인된 가장 명확한 Late Discovery Risk다.

### 효과와 유지 비용

- 기대 효과: 조건부 목록에 “중단·재개 판정”을 추가하면 계약 내용을 상위 문서에 복제하지 않고도 안전 규칙을
  행동 전에 활성화할 수 있다.
- 유지 비용: `SKILL.md` 한 조건과 이를 고정할 구조 테스트를 유지하면 된다. 기존 contract나 runtime
  동작을 바꿀 필요는 없다.

## 시나리오 4. 타겟 프로젝트용 하네스 신규 생성

### 요청과 목표

타겟 저장소에서 “하네스를 구성해 달라”는 요청을 받아 현재 상태를 감사하고, 도메인 분석, 역할 팀 설계,
agent·skill 생성, orchestration, 검증까지 진행하는 신규 구축 흐름을 가정한다.

### 읽기 순서와 필요한 이유

1. skill metadata로 `harness`를 활성화한다. README는 설치·사용 안내이지 runtime 필수 입력이 아니다.
2. `harness/SKILL.md`를 읽는다.
   - Phase 0~7 전체 생명주기, 상태 모드, 변경 유형, 완료 게이트와 생성 대상의 상위 경계를 파악한다.
3. 타겟의 `AGENTS.md`, `.codex`, `.agents`, `.harness/docs`, `.harness/logs`를 읽어 Phase 0 감사를 한다.
   - 신규 구축·기존 확장·운영 유지보수와 시작 Phase를 정한다.
4. `reference-map.md`를 읽고 현재 문제 축의 leaf를 고른다.
5. 신규 구축에는 `initial-generation-contract.md`와 필요한 exploration·logging 기준을 읽는다.
   - 최소 생성물, 자동 판단 보류, 다음 역할과 재진입 정보를 초기부터 남긴다.
6. Phase 2에 도달했을 때 `team-spec-contract.md`와 `team-spec-schema.md`를 읽는다.
   - 사용자 결정에 따라 contract는 권한·불변 조건·생성 순서·정본 관계, schema는 section·field·format·example·
     구조 검증 경계를 맡는 방향을 적용한다. 공식 reference 정렬 전에는 현재 공동 기준을 함께 확인한다.
7. Phase 3~5에서는 현재 Phase에 필요한 agent, skill-writing, orchestrator leaf만 읽는다.
8. Workflow Engine을 적용하는 타겟일 때만 Phase 5에서 template compatibility contract를 읽고
   `.harness/workflow-engine.json`을 생성·갱신한다.
9. Phase 6에 도달했을 때 verification checklist와 QA 기준을 읽어 운영 가능 여부를 판정한다.
10. 평가 corpus와 target evaluation 문서는 실제 품질 비교나 Phase 7 환류를 수행할 때만 읽는다.

### 너무 일찍 읽히는 정보

- **사실**: `harness/SKILL.md` 422줄과 `reference-map.md` 314줄을 합치면 leaf contract 선택 전에 최대
  736줄의 discovery 정보를 통과한다.
- **사실**: `SKILL.md`는 Phase별 상세 절차 뒤에 실행 기준, 탐색 원칙, 운영 workflow, 생성 대상, 완료
  기준과 checklist를 다시 제공한다. 이 중 일부는 전체 생명주기 안전에 필요하지만 현재 Phase와 무관한 상세도
  함께 노출된다.
- **사실**: `reference-map.md`의 “읽기 순서 기본값”은 12개 문제 축 설명 뒤인 252줄부터 나온다.
- **추론**: 전체 생명주기를 한 번에 조율하는 장점과 교환해 단일 Phase 재진입에서도 큰 discovery layer를
  다시 읽을 가능성이 있다. 이는 명확한 정보 누락보다 Information Overexposure 문제에 가깝다.
- README의 17개 스킬 상세 목록은 사람용 사용 문서의 정보량 문제지만, runtime이 README를 선행 입력으로
  삼지 않으므로 하네스 실행 문맥 과다 노출로 직접 계산하지 않는다.

### 너무 늦게 발견되는 정보

- team-spec 상세 기준은 Phase 2 생성 전에, Workflow Engine compatibility는 적용 시점인 Phase 5 전에,
  verification은 완료 판정인 Phase 6 전에 활성화된다.
- `.harness/workflow-engine.json`의 capability 확인도 설치·갱신 시 한 번 기록한 뒤 runtime이 신뢰하도록
  설계돼 있어 매 실행 재검증을 요구하지 않는다.
- **판정**: 조사한 신규 생성 경로에서는 잘못된 생성 뒤에 발견되는 명확한 안전 제약은 확인하지 못했다.

### 효과와 유지 비용

- 기대 효과: 상위 `SKILL.md`를 생명주기·Phase gate·leaf routing 중심으로 줄이고 Phase별 상세를 leaf로
  이동하면 재진입 작업의 초기 문맥을 줄일 수 있다.
- 위험: 전체 Phase를 조율하는 상위 불변 조건까지 leaf로 밀면 오히려 순서 누락과 Late Discovery를 만든다.
- 유지 비용: 문서 이동, 링크 정렬, 중복 제거, 설치 배포본 검증과 기존 타겟 평가를 함께 해야 하므로 높다.
- **판정**: 외부 progressive disclosure 원칙을 기계적으로 적용해 즉시 분할할 사안이 아니라 책임 경계를 먼저
  결정할 정책 검토 대상이다.

## 상위 진입 문서와 상세 참조의 책임 비교

| 영역 | 상위 진입 문서가 유지해야 할 것 | 상세 참조가 소유해야 할 것 | 현재 판정 |
| --- | --- | --- | --- |
| Workflow Engine | 활성화 범위, 기본 contract, 조건별 contract 링크, 단일 평가 순서, 중단 원칙 | fact·전이 구조, 상태 근거, 산출물, 사용자 결정, review·execution 세부 판정 | 대체로 분리됨. 재개→structured contract 링크 조건만 보강 필요 |
| thin skill | 현재 산출물의 입력·책임·금지·출력, 읽을 named section | 공유 산출물 사용 가능 판정과 provider·GitHub 세부 규칙 | 분리와 테스트가 잘 되어 있음 |
| Harness | 전체 생명주기, Phase gate, 상태 모드, 상위 불변 조건, leaf routing | Phase별 생성 절차, 형식, 예시, 검증 checklist | 상위 문서에 Phase 상세와 반복 checklist가 많이 남아 있음 |
| `reference-map.md` | 문제 축→첫 leaf의 짧은 routing | 각 축의 판단 규칙 | routing 기본값이 상세 축 목록 뒤에 있어 discovery 비용이 큼 |
| README | 타겟 사용자의 설치·첫 실행·결과·범위 | runtime 계약과 contributor inventory | 현재 대상은 명확함. 스킬 전체 목록 이관은 보류 결정 유지 |

## Information Overexposure와 Late Discovery Risk 구분

| 관찰 | 유형 | 근거와 영향 |
| --- | --- | --- |
| `harness/SKILL.md`와 `reference-map.md`가 leaf 선택 전에 최대 736줄 노출됨 | 정보 과다 노출 | 단일 Phase 재진입에서도 전체 생명주기와 12개 축을 다시 읽을 수 있다. 오류보다 문맥·집중 비용 문제다. |
| `reference-map.md`의 기본 읽기 순서가 252줄 이후에 있음 | 정보 과다 노출 | routing을 찾으려면 상세 축을 먼저 통과한다. 다만 축 설명 자체가 선택 근거를 제공하는 장점이 있다. |
| 범용 `github-templates.md` 전체를 특정 Issue/PR thin skill이 읽음 | 낮은 수준의 정보 과다 노출 | 선택 유형 외 template도 읽지만 파일이 130줄이고 하나의 공유 계약으로 유지되는 장점이 있다. |
| 재개 규칙 소유 contract가 조건부 목록에서 자동 실행 때만 연결됨 | 정보 발견 지연 | 자동 실행 전의 사용자 결정·중단 재개에서 authoritative한 재관측·우선순위 규칙을 놓칠 수 있다. |
| review capability를 모드 선택 뒤 확인함 | 정상 JIT | 그 전에는 review를 실행하지 않으므로 되돌림을 만들지 않는다. |
| verification checklist를 Phase 6에서 읽음 | 정상 JIT | 완료 판정 직전에 활성화되며 생성 순서를 방해하지 않는다. |
| README 전체 스킬 목록 | 사람용 정보 과다 후보, runtime 직접 영향 없음 | 향후 contributor 문서가 생길 때 이관하기로 한 사용자 결정을 유지한다. |

## 개선 후보

| 분류 | 후보 | 기대 효과 | 유지 비용 | 우선순위 | 현재 판단 |
| --- | --- | --- | --- | --- | --- |
| 즉시 수정 | `github-workflow-engine/SKILL.md`의 structured contract 활성화 조건에 “중단·재개 판정”을 명시하고 구조 테스트를 추가한다. | 재개 시 authoritative한 재관측, 동일 `currentTaskActionId`, GitHub 우선 규칙을 행동 전에 발견한다. | 낮음. 한 routing 문구와 기존 `skill-quality` 테스트 보강 | 완료 | PR #102, merge commit `a48f80d`에서 반영했다. `SKILL.md`는 중단·재개 판정과 자동 실행을 별도 활성화 불릿으로 두고, `reference-boundary-contract.test.mjs`는 contract 소유 section과 두 activation link를 각각 검증한다. |
| 정책 검토 | `harness/SKILL.md`가 반드시 소유할 생명주기 불변 조건과 Phase별 leaf로 이동할 상세 절차의 경계를 정한다. | 단일 Phase 재진입의 초기 context를 줄이면서 전체 조율 안전을 유지한다. | 높음. 문서 재배치, 링크, 설치 배포본, 타겟 평가 회귀 검토 필요 | P1 | Runtime Engineering 우선순위와 맞지만 기계적 분할은 금지한다. 먼저 경계 결정을 기록한다. |
| 정책 검토 | `reference-map.md`의 짧은 기본 routing을 앞에 두고 상세 12개 축을 뒤에서 설명하는 2단 구조를 검토한다. | leaf 선택까지의 탐색 거리를 줄인다. | 중간. map의 중복·링크와 `SKILL.md` Phase 안내를 함께 정렬해야 함 | P1 | 앞 후보와 함께 검토한다. 독립적으로 문단만 이동하면 중복 routing이 남을 수 있다. |
| 기능 제안 | Harness의 `SKILL.md`→`reference-map.md`→leaf 경로, 참조 파일 존재, Phase별 필수 bundle을 검사하는 회귀 테스트를 추가한다. | Workflow Engine에 이미 있는 named-section 보호와 비슷하게 stale reference와 routing 누락을 조기에 찾는다. | 중간. 먼저 공식 routing 경계를 결정하고 변경 시 fixture를 유지해야 함 | P2 | 정책 경계 확정 후 제안할 항목이다. 현재 Harness에는 대응 테스트 디렉터리가 없다. |
| 보류 | `github-templates.md`를 유형별 named section만 읽도록 더 세분화한다. | Issue·PR별 소량의 context 절감 | 중간. 범용 `issue-creation`의 유형 판정 순서와 section-link test 보강 필요 | P3 | 130줄 규모에서 반복 결함 근거가 없으므로 지금은 공유 계약의 단순성이 더 유리하다. |
| 보류 | README의 17개 스킬 상세 목록을 이관한다. | 타겟 사용자의 첫 읽기 정보량을 줄인다. | contributor 문서의 소유권·동기화 비용 발생 | 후속 시점 | 에이전트 또는 기여자 문서가 실제로 만들어질 때 이관한다. |
| 기존 정책 후속 | `team-spec-contract.md`와 `team-spec-schema.md`를 결정된 책임 경계로 정렬한다. | Phase 2에서 공동 기준의 중복과 판단 비용을 줄인다. | 높음. 두 문서와 verification·initial contract 연결을 함께 조정 | 별도 정책 작업 | Day 3 사용자 결정의 후속이며 Day 4에서 새 설계로 확장하지 않는다. |

## 이번 작업과 후속 반영의 변경 범위

- 최초 Workshop에서는 학습·조사 결과인 이 문서만 추가했다.
- 이후 사용자 승인에 따라 PR #102에서 `github-workflow-engine/SKILL.md`에 중단·재개 판정용
  structured contract 활성화 불릿을 추가하고, 기존 자동 실행 활성화 불릿과 책임을 분리했다.
- `reference-boundary-contract.test.mjs`에는 재개 규칙 소유 section, 재개 판정 activation link,
  자동 실행 activation link를 각각 검증하는 회귀 test를 추가했다. 리뷰 과정에서 테스트 이름과 단언 경계도
  명확히 했다.
- 최종 merge commit `a48f80d`의 변경 범위는 위 두 파일, 15개 추가 줄이며 삭제된 줄은 없다.
- contract 본문, Definition, 실행 코드, README, `AGENTS.md`와 다른 정책·보류 후보는 수정하지 않았다.

## 검증 결과

- `git status --short`: 후속 반영 확인 시작 시 작업 트리 clean
- `git merge-base --is-ancestor main HEAD`: 통과
- `git ls-remote origin refs/heads/main refs/heads/docs/repository-evolution-workshop`: 원격 `main`은
  `a48f80d`, 원격 작업 브랜치는 로컬과 같은 `9075c54`
- `gh pr list --state open`: 열린 PR 없음
- `gh issue list --state open`: 관련 없는 정책검토 #37 한 건
- `gh pr view 102`: `main` 대상으로 merge됐고 merge commit `a48f80d`와 최종 head `757e0ac` 확인
- `node --test .codex-dist/skills/github-workflow-engine/tests/skill-quality/reference-boundary-contract.test.mjs`:
  8 tests 모두 통과
- `node .codex-dist/skills/github-workflow-engine/tests/workflow-definition/all-fixtures.test.mjs`:
  98 tests 모두 통과, 실패·제외 없음
- 새 회귀 test가 structured contract의 `중단과 재개 판정 규칙` section과 `SKILL.md`의 중단·재개 판정 및
  자동 실행 activation link를 각각 검증함
- `git diff --check`: 통과
- Harness 전용 자동 테스트 디렉터리는 현재 `.codex-dist/skills/harness` 아래에 존재하지 않음

## 오늘 새롭게 이해한 것

- Progressive Disclosure의 핵심은 파일을 작게 나누는 것이 아니라 “어떤 조건에서 무엇을 읽는가”를 실행 경로와
  연결하는 데 있다.
- 큰 Definition은 코드가 평가하고 단일 task만 반환하면 raw line 수와 모델 context 비용을 분리할 수 있다.
- `.harness/workflow-engine.json`을 리뷰 직전에 읽는 것은 늦은 발견이 아니라 설치 시 검증 결과를 재사용하는 JIT
  지식이다.
- named section 링크는 문서 분할보다 작은 단위로 context를 제한하며, 테스트가 링크를 보호할 때 유지 가능성이
  높아진다.

## 기존 생각이 바뀐 부분

- README가 길다는 사실만으로 runtime context 과다라고 볼 수 없다. 활성 스킬이 README를 선행 입력으로 삼는지
  먼저 확인해야 한다.
- Harness의 긴 `SKILL.md`는 모두 중복 문서라기보다 전체 생명주기를 한 주체가 조율하기 위한 안전 장치도 포함한다.
  따라서 줄 수만으로 분할하면 안 된다.
- 반대로 안전 규칙이 상세 contract에 올바르게 있어도 상위 활성화 조건이 빠지면 실제 실행에서는 늦게 발견될 수
  있다. 지식의 위치와 링크 조건을 함께 봐야 한다.

## 저장소에서 확인한 근거

- Workflow Engine `SKILL.md`는 두 기본 contract와 12개의 조건부 활성화 항목을 구분한다. 동일한
  structured contract도 중단·재개 판정과 자동 실행이라는 서로 다른 활성화 조건으로 나뉜다.
- thin skill의 “먼저 읽을 문서”는 artifact와 review contract의 named section을 직접 지정한다.
- `feature-proposal.json`과 `implementation.json`, 두 state adapter, evaluator가 현재 작업을 선언형으로 계산한다.
- structured execution contract가 중단·재개 판정과 GitHub 우선순위를 소유한다.
- review runtime contract가 `.harness/workflow-engine.json` capability cache 판정을 소유한다.
- Harness `SKILL.md`는 Phase 0~7 전체 절차와 완료 기준을, `reference-map.md`는 12개 문제 축과 leaf 순서를 제공한다.
- Initial Generation Contract는 Phase별 필수 생성물과 다음 재진입 정보를 앞선 Phase에서 요구한다.
- Workflow Engine에는 문서 경계 회귀 테스트가 있고 Harness에는 동등한 자동 경로 테스트가 없다.

## 현재 구조의 강점

- 사람용 설명, runtime 조율, 세부 계약, 실행 데이터와 역사·관찰 근거가 서로 다른 계층에 있다.
- Workflow Engine의 조건부 contract와 thin skill named section이 대부분의 작업에서 필요한 지식만 활성화한다.
- Definition·adapter·evaluator가 큰 상태 그래프를 결정적으로 계산해 모델의 자유 해석과 문맥 부담을 줄인다.
- 리뷰 provider, 파일 수정, 검증 모드와 agent lifecycle 같은 고비용 계약이 실제 필요 전에는 활성화되지 않는다.
- 타겟 하네스 역할 스킬을 얇은 `team-spec` 포인터로 생성해 장기 drift를 줄인다.
- 테스트가 일부 문서 링크와 책임 경계를 executable knowledge로 고정한다.

## 남은 의문

1. Harness 상위 `SKILL.md`에서 모든 Phase를 조율하기 위해 반드시 유지할 최소 불변 조건은 정확히 어디까지인가?
2. `reference-map.md`의 routing을 앞당길 때, 상세 문제 축을 읽지 않아 잘못된 leaf를 고르는 위험을 어떤 최소
   질문이나 gate로 막을 것인가?
3. Harness reference 경로 테스트는 파일·heading 존재만 검사할지, Phase별 필수 bundle과 순서까지 실행 계약으로
   고정할지?

## 다음 Day의 선행 조건

Day 5 Documentation-to-Code Consistency에서는 다음 기준을 입력으로 사용한다.

1. README는 타겟 사용자 안내이며 runtime 또는 contributor 정본으로 간주하지 않는다.
2. 문서의 파일·명령·경로를 검증할 때 raw Definition 전체를 설명 문서와 대조하기보다 validator·adapter·evaluator의
   실제 API와 test fixture를 우선한다.
3. `github-workflow-engine/SKILL.md`의 재개→structured contract 활성화 링크는 PR #102, merge commit
   `a48f80d`와 회귀 테스트에 반영됐다. Day 5에서는 유사한 activation 누락이 다른 문서·코드 경계에
   남았는지 확인한다.
4. `.harness/workflow-engine.json`은 설치·갱신 시 생성한 capability cache이며 매 runtime 실행에서 외부 의존성을
   다시 탐색해야 한다는 불일치로 분류하지 않는다.
5. Harness의 큰 discovery layer는 확인된 과다 노출 후보지만, 공식 책임 경계 결정 전에는 문서 분할을 수행하지
   않는다.
6. `team-spec-contract.md`와 `team-spec-schema.md`는 Day 3에서 결정한 경계를 후속 기준으로 사용하되, 현재 코드·
   생성물과 일치하는지는 Day 5에서 직접 검증한다.
7. README 스킬 목록 이관과 contributor 문서 생성은 계속 보류한다.
8. `humanize-korean`은 해결 완료이며 운영 자산의 stale reference가 다시 생기지 않았는지만 확인한다.
9. Day 4가 제안한 Harness reference 경로 자동 검사는 정책 경계 확정 전 기능 구현으로 진행하지 않는다.
