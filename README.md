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
- `.codex-dist/skills/github-workflow-engine/SKILL.md`: GitHub Run State를 읽고 다음 Workflow 액션을 제안하는 전역 스킬
- `.codex-dist/skills/{workflow-code-editor,github-state-summary,github-simple-executor,target-harness-code-editor,issue-creation,feature-proposal-triage,policy-plan,policy-review-next-triage,feature-plan,fix-analysis,fix-plan,branch-proposal,commit-plan,pr-proposal,pr-creation,review-comment}/SKILL.md`: GitHub Workflow Engine에서 사용하는 Codex 전용 전역 스킬 기본형
  - `target-harness-code-editor`는 이전 배포와의 호환을 위해 포함된 자산이며, 현재 파일 변경 executor는 `workflow-code-editor`입니다.
- `install.sh`, `uninstall.sh`: Harness와 Workflow Engine 배포본을 각각 또는 함께 전역 Codex 스킬 경로에 설치하거나 제거하는 스크립트
- `.harness/development-quality-evaluation.md`: 하네스 생성기 품질 평가 기준
- `.harness/document-regression-checklist.md`: README와 reference 문서 변경 후 회귀 점검 기준
- `docs/github-workflow-engine.md`: GitHub 이슈/PR 기반 Workflow Engine 설계
- `.harness/evaluations/*`: 타겟 프로젝트 평가 기록과 반복 결함 승격 판단 근거
- `.github/*`: 이 저장소의 이슈/PR 협업 템플릿
- `AGENTS.md`, `.gemini/styleguide.md`: 이 저장소에서 자동 리뷰 도구가 따르는 리뷰 코멘트 작성 지침

## 전역 스킬 설치

`harness`와 GitHub Workflow Engine 스킬 묶음은 서로 독립적으로 설치할 수 있습니다. 인자를 생략하면 기존과 같이 전체 배포본을 함께 설치합니다.

Harness만 설치:

```sh
curl -fsSL https://raw.githubusercontent.com/codechaser-kr/codex-harness/main/install.sh | sh -s -- harness
```

Workflow Engine 스킬 묶음만 설치:

```sh
curl -fsSL https://raw.githubusercontent.com/codechaser-kr/codex-harness/main/install.sh | sh -s -- workflow-engine
```

전체 설치:

```sh
curl -fsSL https://raw.githubusercontent.com/codechaser-kr/codex-harness/main/install.sh | sh
```

저장소를 클론한 상태에서는 같은 대상을 인자로 전달합니다.

```sh
./install.sh harness
./install.sh workflow-engine
./install.sh
```

설치 경로:

```text
Codex 소스: .codex-dist/skills/*
Codex 대상: $HOME/.agents/skills/*
```

배치한 뒤 대상 디렉터리에 다음 항목이 있는지 확인합니다.

```text
$HOME/.agents/skills/harness
$HOME/.agents/skills/harness/SKILL.md
$HOME/.agents/skills/harness/references/
$HOME/.agents/skills/github-workflow-engine
$HOME/.agents/skills/github-workflow-engine/SKILL.md
$HOME/.agents/skills/workflow-code-editor
$HOME/.agents/skills/github-state-summary
$HOME/.agents/skills/github-simple-executor
$HOME/.agents/skills/target-harness-code-editor
$HOME/.agents/skills/issue-creation
$HOME/.agents/skills/feature-proposal-triage
$HOME/.agents/skills/policy-plan
$HOME/.agents/skills/policy-review-next-triage
$HOME/.agents/skills/feature-plan
$HOME/.agents/skills/fix-analysis
$HOME/.agents/skills/fix-plan
$HOME/.agents/skills/branch-proposal
$HOME/.agents/skills/commit-plan
$HOME/.agents/skills/pr-proposal
$HOME/.agents/skills/pr-creation
$HOME/.agents/skills/review-comment
```

설치 범위:

- 전역 `harness` 스킬 디렉터리를 배치합니다.
- GitHub Workflow Engine Codex 전역 스킬 기본형을 함께 배치합니다.

기본 설치 루트는 Codex 사용자 스킬 경로인 `$HOME/.agents/skills`입니다. `CODEX_HOME`은 설치 루트를 변경하지 않습니다. `harness`만 별도 경로에 설치해야 하는 경우에는 `CODEX_HARNESS_DEST`를 사용할 수 있고, 전체 스킬 루트는 `CODEX_HARNESS_DEST_ROOT`로 바꿀 수 있습니다.

재설치할 때 기존 스킬은 active 스킬 루트 밖의 `${XDG_STATE_HOME:-$HOME/.local/state}/codex-harness/backups`로 이동합니다. 백업 루트는 `CODEX_HARNESS_BACKUP_ROOT`로 바꿀 수 있습니다. `$CODEX_HOME/skills`에 있는 기존 디렉터리는 설치·감지·이전 대상이 아닙니다.

## 전역 하네스 스킬의 구성

설치된 전역 `harness` 스킬의 진입점은 `SKILL.md`입니다. 이 파일은 전체 실행 흐름을 안내하고, `references/`는 하네스 Phase 선택 기준, 역할 설계, 에이전트 생성, QA, 로그, 재진입 기준을 나눠 담습니다.

전역 스킬은 타겟 프로젝트의 에이전트 팀과 역할 스킬을 미리 고정해 두지 않습니다. 하네스 구성을 요청받으면 타겟 저장소와 사용자 입력을 읽고, 필요한 하네스 Phase를 선택해 프로젝트에 맞는 에이전트 팀과 역할 스킬을 생성합니다.

## GitHub Workflow Engine 전역 스킬

GitHub Workflow Engine은 GitHub Issue와 PR을 작업 상태의 기준 저장소로 사용합니다. 별도 Run State Runtime을 만들지 않고, GitHub의 이슈 제목, 라벨, 본문, 체크리스트, PR 본문, diff가 있는 review thread의 resolved/unresolved 상태를 읽어 현재 위치와 다음 액션을 판단합니다.

배포본에는 다음 Codex 전역 스킬 기본형이 포함됩니다.

- `github-workflow-engine`: GitHub Run State를 읽고 State Transition Rule에 따라 다음 액션을 제안합니다.
- `github-state-summary`: 출처가 있는 GitHub·로컬 상태를 읽기 전용으로 요약합니다.
- `github-simple-executor`: 확정된 단일 비파일 단순 상태 변경을 검증 후 수행합니다.
- `workflow-code-editor`: 파일 변경 전에 Harness 일반 진입점 사용 가능 여부를 확인합니다. 사용 가능하면 Workflow Engine 전용 계약을 제외한 일반 요청으로 Harness를 호출하고, 사용할 수 없으면 현재 Codex 세션의 일반 코드 변경 경로를 사용합니다. 선택 경로 실행을 시작한 뒤에는 다른 경로로 재시도하지 않습니다.
- `target-harness-code-editor`: 이전 Target Harness 강제 라우팅과의 배포 호환을 위해 남아 있는 자산이며 현재 Workflow Definition의 파일 변경 executor로 사용하지 않습니다.
- `issue-creation`: `기능제안`, `정책검토`, `기능변경`, `기능결함` 이슈 초안을 템플릿 기준으로 제안합니다.
- `feature-proposal-triage`: 기능제안 이슈를 기준으로 진행하지 않음, 정책 검토 필요, 기능 변경 필요 중 적절한 진행 방향 후보와 판단 근거를 제안합니다.
- `policy-plan`: 정책검토 이슈를 기준으로 정책 설계, 판단 맥락, 설계 문서 반영 대상, 설계 반영 후 기능변경 전환 범위를 제안합니다.
- `policy-review-next-triage`: 정책검토 결과와 열린 기능변경 이슈를 비교해 기존 이슈 반영 또는 새 이슈 생성 후보와 판단 근거를 제안합니다.
- `feature-plan`: 기능변경 이슈를 브랜치/PR 단위로 나누고 검증 기준을 제안합니다.
- `fix-analysis`: 기능결함의 근거를 조사해 원인 후보, 영향 범위, 잠정 해결 방향을 제안합니다.
- `fix-plan`: 확정된 원인 조사 결과를 브랜치/PR 단위로 나누고 검증 기준을 제안합니다.
- `branch-proposal`: 기준 이슈와 구현 계획을 읽어 작업 시작 전 브랜치 이름 후보를 제안합니다.
- `commit-plan`: 현재 브랜치/PR 단위를 의미적 커밋 단위로 나누고 작업 범위와 검증 기준을 제안합니다.
- `pr-proposal`: PR 제목과 템플릿 본문 초안을 제안합니다.
- `pr-creation`: PR 생성 입력을 검증하고 생성 요청 초안을 제안합니다.
- `review-comment`: PR Review Template 출력 결과를 review thread 게시 초안으로 정리하고 위치 매핑 보류 대상을 점검합니다.

외부 의존 스킬은 이 저장소가 설치하거나 관리하지 않습니다. Workflow Engine은 타겟 레포에서 해당 의존성을 최초로 필요로 할 때 사용 가능 상태를 관측하고 `.github-agentic-loop/settings.json`의 필요한 필드만 생성하거나 보완합니다. `commit` 스킬은 `dependencies.commit.available`에 기록합니다. 설정 파일이나 필요한 필드가 없는 상태는 정상적인 지연 초기화 대상으로 처리하고 기존 유효 값은 보존합니다.

JSON 파싱 실패나 인식할 수 없는 타입·값은 자동 교정, 기본값, fallback 또는 Harness 호출로 우회하지 않고 문제 필드와 기대 형식, 영향받는 작업과 재개 조건을 안내한 뒤 워크플로우를 중단합니다.

- Codex 전역 `commit`: `$HOME/.agents/skills/commit/SKILL.md`
- Codex 전역 `awesome-code-review`: `codex/awesome-code-review` 실행에 필요. `$HOME/.agents/skills/awesome-code-review/SKILL.md`
- Claude 리뷰 브리지 `sendbird/cc-plugin-codex`: Codex에서 `claude/code-review`의 `$cc:review`와 `claude/awesome-code-review`의 `$cc:adversarial-review`를 호출할 때 필요. `$CODEX_HOME/plugins/cache/sendbird/cc/*/.codex-plugin/plugin.json` 또는 `$HOME/.codex/plugins/cache/sendbird/cc/*/.codex-plugin/plugin.json`과 같은 플러그인 루트 파일과 `$cc:setup` 실행 결과로 설치 여부를 확인합니다.

Workflow Engine의 PR 리뷰 실행 모드는 `claude/code-review`, `claude/awesome-code-review`, `codex/awesome-code-review` 중에서 선택합니다. 리뷰 설정을 최초로 필요로 할 때 실제 사용 가능한 모드를 관측하고 사용자에게 기본 모드를 확인하며, 임의 기본값을 만들지 않습니다. PR 생성 후 리뷰 실행 전에는 실제 사용할 리뷰 실행 모드를 다시 확정합니다. `dependencies.commit.available`과 사용자가 선택한 기본 리뷰 실행 모드는 타겟 레포의 `.github-agentic-loop/settings.json`에 저장하고, 리뷰 실행 모드는 PR별 선택 시 기본 후보로만 사용합니다. 사용자가 지원 모드 중 하나를 명시적으로 선택하기 전에는 리뷰 실행 모드 검사로 넘어가지 않습니다.

`awesome-code-review`는 `codex/awesome-code-review`가 PR diff와 이슈 맥락을 읽어 PR Review Template 형식의 리뷰 결과를 만들 때 사용하는 외부 의존 스킬입니다. `claude/awesome-code-review`는 이 스킬을 사용하지 않고 `sendbird/cc-plugin-codex`의 `$cc:adversarial-review`를 실행합니다. 이 저장소는 `awesome-code-review`를 설치하거나 관리하지 않습니다. 설치는 `https://github.com/codechaser-kr/repo-bootstrap`의 install 절차를 사용합니다. 원천 스킬은 `https://github.com/awesome-skills/code-review-skill`이지만, Codex 전역 설치명과 frontmatter `name`은 기본 내장 리뷰 스킬과의 이름 충돌을 피하기 위해 `awesome-code-review`로 맞춥니다.

`sendbird/cc-plugin-codex`는 Codex에서 Claude를 호출하기 위한 외부 의존성입니다. 특히 `claude/awesome-code-review`의 실행기와 의존성은 이 플러그인의 `$cc:adversarial-review`이며 Claude 환경 또는 Codex 전역의 `awesome-code-review`가 아닙니다. 이 저장소는 해당 플러그인을 설치하거나 관리하지 않으며, 설치 관리는 `https://github.com/codechaser-kr/repo-bootstrap`의 install 절차에서 담당합니다. 선택된 리뷰 실행 모드의 의존성이 없으면 Workflow Engine은 다른 모드로 자동 fallback하지 않고, 설치 대상과 재개 조건을 안내한 뒤 중단합니다.

`claude/*` 리뷰 실행 모드는 `$cc:setup` 결과로 Claude CLI 인증 상태를 확인합니다. 인증 완료는 `auth.available: true`, `auth.loggedIn: true` 또는 authenticated 출력으로만 판정하며, 미인증이거나 판단할 수 없으면 `$cc:setup`의 login 안내를 전달하고 리뷰 실행을 중단합니다.

companion 실행이 실패하면 stdout·stderr의 `Claude Code CLI is not authenticated`, `Run \`claude auth login\``을 포함한 wrapper·raw 인증 오류 문구와 실패 직후 `$cc:setup`의 `auth.available`, `auth.loggedIn`을 함께 확인합니다. 따라서 companion이 raw Claude 오류를 재포맷해도 `$cc:setup`이 미인증을 보고하면 재로그인 필요로 판정합니다.

Workflow Engine은 `FI-15`의 `claude/code-review`를 `$cc:review --wait --base <pr-base-branch> --scope branch`, `FI-16`의 `claude/awesome-code-review`를 `$cc:adversarial-review --wait --base <pr-base-branch> --scope branch`로 호출합니다. 두 모드는 foreground/background 추가 질문 없이 같은 오케스트레이션 세션에서 결과를 기다리며 `--background`를 전달하지 않습니다. 이 고정값은 Workflow Engine 호출에만 적용되고, 직접 사용하는 `$cc:review`, `$cc:adversarial-review`의 일반 실행 정책과 `codex/awesome-code-review`에는 영향을 주지 않습니다.

`$cc:adversarial-review`의 companion stdout은 PR Review Template을 직접 보장하는 것으로 간주하지 않습니다. Workflow Engine은 필수 섹션과 중요도·diff 위치·문제·영향·권장 조치·테스트 판단을 정규화하고 PR 번호와 head commit SHA에 연결한 뒤에만 Review Comment 입력으로 전달합니다.

PR 연결은 PR 본문의 `연관 이슈` 섹션에서 `Refs #번호`를 파싱해 판단합니다. Workflow Engine이 관리하는 이슈에는 `Closes #번호`, `Fixes #번호`, `Resolves #번호`처럼 GitHub가 자동 close하는 키워드를 사용하지 않습니다.

Workflow Engine은 이슈 또는 PR 템플릿을 최초로 필요로 할 때 해당 유형의 템플릿과 라벨만 확인합니다. 누락됐으면 `github-templates.md`와 Engine 소유 템플릿 정합성 계약으로 생성하고, 기존 템플릿은 허용된 타겟 확장을 보존합니다. 불일치가 있으면 자동으로 덮어쓰지 않고 차이와 영향 범위, 수정 후보를 제시한 뒤 사용자 결정으로 갱신합니다.

Workflow Engine의 액션 진입과 중단 기록은 타겟 프로젝트의
`.github-agentic-loop/logs/github-workflow-log-YYYY-MM-DD.md`에 남깁니다. 파일명 날짜는 기록 시점의
실행 환경 현재 날짜이며 같은 날짜의 기록은 한 파일에 추가합니다. 이 로그는 빠른 재진입을 돕는 보조
체크포인트이고, 기준 상태는 GitHub Issue와 PR입니다. Harness는 자체 로그를 `.harness/logs/`에
독립적으로 기록합니다. 기능변경/기능결함 계획과 완료 기준 갱신처럼 후속 전이 판단에 쓰이는 상태는
댓글이 아니라 이슈 본문에 반영합니다.

전역 `harness` 스킬은 다음 하네스 Phase로 동작합니다.

- `하네스 Phase 0`: 현재 하네스 현황을 감사(audit)하고 시작 상태를 정합니다.
- `하네스 Phase 1`: 도메인과 작업 경계를 분석합니다.
- `하네스 Phase 2`: 프로젝트 맞춤 에이전트 팀과 `team-spec`을 설계합니다.
- `하네스 Phase 3`: `team-spec`을 바탕으로 에이전트 정의를 생성합니다.
- `하네스 Phase 4`: 역할별 로컬 스킬을 생성합니다.
- `하네스 Phase 5`: 시작 진입 역할과 오케스트레이션 흐름을 연결합니다.
- `하네스 Phase 6`: 생성된 구조와 계약을 검증하고 사용자가 판단할 관찰·선택지 자료를 준비합니다.
- `하네스 Phase 7`: 사용자가 확정한 범위의 피드백과 반복 학습 후보만 반영합니다.

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

하네스의 진화는 별도 스크립트나 외부 실행기에 의존하지 않습니다. 실제 작업에서 확인한 새 저장소 사실, 반복될 수 있는 판단, 검증 공백, 역할 오판은 역할 출력과 `.harness/logs/*` Markdown 로그에 남깁니다. 이후 운영 감사 역할은 승격 위치 후보와 영향을 제시하고, 사용자가 실제 반영 여부와 범위를 확정합니다.

단일 타겟 프로젝트에서 나온 관찰은 먼저 그 프로젝트의 `team-spec`, 역할 스킬, 운영 문서, QA 기준을 보강하는 입력으로 씁니다. 여러 타겟 프로젝트에서 같은 결함이 반복될 때만 전역 `harness` 스킬이나 `references/` 보강 후보로 승격합니다.

이 기준은 `.codex-dist/skills/harness/references/evolution-contract.md`에서 관리합니다.

생성기 개발 중 타겟 관찰 자료는 `.harness/evaluations/targets/` 아래에 남깁니다. 이 기록은 단일 타겟 프로젝트 관찰과 반복 결함을 구분하고, 사용자가 생성기 reference 보강 여부를 판단하는 근거로 씁니다.

문서와 reference를 수정한 뒤에는 `.harness/document-regression-checklist.md`를 기준으로 회귀를 점검합니다. 이 점검은 새 스크립트를 도입하지 않고, Markdown 계약과 reference 연결이 같은 운영 모델을 유지하는지 확인하는 절차입니다.

## 제거

제거 스크립트도 `harness`, `workflow-engine`, `all` 대상을 구분합니다. 인자를 생략하면 이 저장소가 관리하는 전역 스킬 전체를 `$HOME/.agents/skills`에서 제거합니다. 각 스킬 디렉터리는 영구 삭제하지 않고 `${XDG_STATE_HOME:-$HOME/.local/state}/codex-harness/backups/<skill>.removed.<timestamp>.<pid>`로 이동하며, 출력된 백업 위치를 원래 경로로 되돌리는 방식으로 필요할 때 수동 복구할 수 있습니다. `CODEX_HARNESS_DEST_ROOT`, `CODEX_HARNESS_DEST`, `CODEX_HARNESS_BACKUP_ROOT`를 지정하면 설치와 같은 사용자 정의 경로를 사용합니다. `$CODEX_HOME/skills`와 각 프로젝트 내부에 생성된 `.agents/skills/*`, `.harness/*` 등은 제거하지 않습니다.

Harness만 제거:

```sh
curl -fsSL https://raw.githubusercontent.com/codechaser-kr/codex-harness/main/uninstall.sh | sh -s -- harness
```

Workflow Engine 스킬 묶음만 제거:

```sh
curl -fsSL https://raw.githubusercontent.com/codechaser-kr/codex-harness/main/uninstall.sh | sh -s -- workflow-engine
```

전체 제거:

```sh
curl -fsSL https://raw.githubusercontent.com/codechaser-kr/codex-harness/main/uninstall.sh | sh
```

저장소를 클론한 상태라면 다음 명령을 사용할 수 있습니다.

```sh
./uninstall.sh harness
./uninstall.sh workflow-engine
./uninstall.sh
```
