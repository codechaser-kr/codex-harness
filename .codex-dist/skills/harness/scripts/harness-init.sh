#!/usr/bin/env bash
# harness-init.sh
# 디렉토리, 로컬 역할 스킬, 입력 메모를 최초 1회 생성합니다.
# harness-update.sh와 차이:
#   - harness-init.sh: 디렉토리/스킬/입력 메모 생성 (기존 파일 유지)
#   - harness-update.sh: 기존 하네스 구조를 감사한 뒤 입력 메모와 재작성 대상을 다시 정리
# 사용 시점: 프로젝트에 처음 하네스를 구성할 때
set -euo pipefail

ROOT_DIR="$(pwd)"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$SCRIPT_DIR/harness-lib.sh"

log() {
  printf '[harness][init] %s\n' "$1"
}

create_dir() {
  local dir="$1"
  if [ ! -d "$dir" ]; then
    mkdir -p "$dir"
    log "디렉토리 생성: $dir"
  else
    log "이미 존재함: $dir"
  fi
}

create_file_if_missing() {
  local file="$1"
  local content="$2"

  if [ ! -f "$file" ]; then
    printf "%s\n" "$content" > "$file"
    log "파일 생성: $file"
  else
    log "기존 파일 유지: $file"
  fi
}

ensure_gitignore_entry() {
  local entry="$1"
  local gitignore_file=".gitignore"

  touch "$gitignore_file"

  if grep -Fxq "$entry" "$gitignore_file"; then
    log "gitignore 유지: $entry"
    return
  fi

  printf '%s\n' "$entry" >> "$gitignore_file"
  log "gitignore 추가: $entry"
}

HARNESS_OPERATION_MODE="$(detect_harness_operation_mode)"
HARNESS_AUDIT_SUMMARY="$(build_harness_audit_summary "$HARNESS_OPERATION_MODE")"
AGENTS_AUDIT_SUMMARY="$(build_agents_audit_summary "$HARNESS_OPERATION_MODE")"
EXPLORATION_NOTES_FILE="$EXPLORATION_NOTES_DEFAULT_PATH"
mkdir -p ".harness/reports"
bash "$SCRIPT_DIR/harness-explore.sh" "$EXPLORATION_NOTES_FILE" >/dev/null
EXPLORATION_CONTEXT_LEVEL="$(detect_exploration_context_level "$EXPLORATION_NOTES_FILE")"
EXPLORATION_ANCHOR_SUMMARY="$(build_exploration_anchor_summary "$EXPLORATION_NOTES_FILE")"
log "프로젝트 로컬 실행 하네스 초기화 시작: $ROOT_DIR"
log "하네스 운영 모드: $HARNESS_OPERATION_MODE"
log "입력 메모 문서: $EXPLORATION_NOTES_FILE"
log "입력 상태: $EXPLORATION_CONTEXT_LEVEL"
log "입력 메모 요약: $EXPLORATION_ANCHOR_SUMMARY"
while IFS= read -r audit_line; do
  [ -n "$audit_line" ] || continue
  log "하네스 감사: $audit_line"
done <<< "$HARNESS_AUDIT_SUMMARY"
while IFS= read -r agents_line; do
  [ -n "$agents_line" ] || continue
  log "상위 컨텍스트 감사: $agents_line"
done <<< "$AGENTS_AUDIT_SUMMARY"

create_dir ".codex"
create_dir ".codex/agents"
create_dir ".codex/skills"
create_dir ".codex/skills/domain-analyst"
create_dir ".codex/skills/harness-architect"
create_dir ".codex/skills/skill-scaffolder"
create_dir ".codex/skills/qa-designer"
create_dir ".codex/skills/orchestrator"
create_dir ".codex/skills/validator"
create_dir ".codex/skills/run-harness"

create_dir ".harness"
create_dir ".harness/reports"
create_dir ".harness/logs"

if optional_harness_assets_enabled "$EXPLORATION_NOTES_FILE"; then
  create_dir ".harness/scenarios"
  create_dir ".harness/templates"
else
  log "조건부 자산 생성 보류: .harness/scenarios"
  log "조건부 자산 생성 보류: .harness/templates"
fi

# 빈/약한 프로젝트: 사용자 입력 유도 파일 생성
if exploration_requires_user_bootstrap "$EXPLORATION_NOTES_FILE"; then
  create_file_if_missing ".harness/project-setup.md" \
"# 프로젝트 설정

## 작성 안내

입력 정보가 아직 부족해 자동 판단을 보류합니다.
아래 항목을 채운 뒤 AI에게 다음과 같이 요청하세요:

> project-setup.md를 작성했습니다. 이 내용을 바탕으로 하네스 분석을 시작해주세요.

그러면 domain-analyst가 이 파일의 답변을 시작 입력으로 사용해 분석을 시작합니다.

---

## 프로젝트 목표

<!-- 이 프로젝트가 해결하려는 문제를 한 문장으로 적어주세요 -->

## 프로젝트 성격

<!-- 애플리케이션, 라이브러리, 내부 도구, 운영 시스템 등 현재 생각하는 성격을 자유롭게 적어주세요 -->

## 주요 사용자

<!-- 누가 이 프로젝트를 사용하나요? (최종 사용자, 다른 개발자, 내부 팀 등) -->

## 첫 번째 성공 시나리오

<!-- 가장 먼저 동작해야 할 핵심 흐름 한 가지를 한 문장으로 적어주세요 -->

## 대표 진입점 또는 시작 경로

<!-- 어디서부터 실행 흐름을 읽어야 할지 알고 있다면 파일/디렉토리/명령 기준으로 적어주세요 -->

## 현재 알고 있는 주요 경계

<!-- 앱/서비스/패키지/모듈/문서/운영 영역처럼 나뉘는 단위가 있으면 적어주세요 -->

## 현재 알고 있는 실행·검증 경로

<!-- 실행 명령, 테스트 명령, 배포 경로, 운영 확인 경로 중 아는 것이 있으면 적어주세요 -->

## 실패 비용이 큰 영역

<!-- 이 프로젝트에서 잘못되면 가장 큰 문제가 생기는 부분은 어디인가요? -->
"
fi

ensure_gitignore_entry ".harness/logs/.current-session"
ensure_gitignore_entry ".harness/logs/session-log.md"
ensure_gitignore_entry ".harness/logs/session-events.tsv"
ensure_gitignore_entry ".harness/logs/latest-session-summary.md"
ensure_gitignore_entry ".harness/logs/role-frequency.md"
ensure_gitignore_entry ".harness/logs/session-summary-*.md"

create_file_if_missing "AGENTS.md" \
"# AGENTS.md

이 저장소는 Codex 하네스 메타시스템을 사용합니다.

## seed 팀 안내

- init이 만든 역할 목록과 에이전트 정의는 프로젝트 맞춤 팀이 확정되기 전의 초기 seed입니다.
- \`Phase 2 프로젝트 맞춤 에이전트 팀 설계\`에서 역할 수, 중심 역할, handoff를 다시 정합니다.
- \`Phase 3 에이전트 정의 생성\`에서 \`.codex/config.toml\`, \`.codex/agents/*.toml\`, \`.codex/skills/*\`를 그 결정에 맞게 다시 정렬합니다.

## 기본 진입점

- 하네스 초기화: \`bash ~/.codex/skills/harness/scripts/harness-init.sh\`
- 하네스 갱신: \`bash ~/.codex/skills/harness/scripts/harness-update.sh\`
- 하네스 검증: \`bash ~/.codex/skills/harness/scripts/harness-verify.sh\`

## 상태 모드

- 신규 구축
- 기존 확장
- 운영 유지보수

## 실행 모드

- 에이전트 팀
- 단일 역할
- 하이브리드

## 실행 패턴

- 파이프라인
- 생성-검증
- 팬아웃/팬인
- 오케스트레이션 중심
- 전문가 풀

## 운영 원칙

- \`exploration-notes.md\`는 자동 판단 보류를 위한 약한 메모로 사용합니다.
- \`domain-analysis.md\`, \`qa-strategy.md\`는 저장소 입력 문서입니다.
- \`harness-architecture.md\`, \`orchestration-plan.md\`, \`team-structure.md\`, \`team-playbook.md\`는 하네스 메타시스템 문서입니다.
- \`harness-init.sh\` 직후 상태는 완료가 아니라 자동 판단 보류 메모와 역할 정의가 준비된 상태입니다.
- 최종 문서는 역할 스킬과 에이전트 팀이 직접 작성한 뒤 검증합니다.
- drift / sync / evolve는 운영 유지보수의 기본 루프입니다.
"

create_file_if_missing ".codex/config.toml" \
"# 초기 seed 에이전트 팀 설정
# Phase 2에서 팀 구조를 정한 뒤 Phase 3에서 이 파일을 프로젝트 맞춤 구성으로 다시 정렬합니다.

[agents]
max_threads = 4
max_depth = 1

[agents.default]
description = \"General-purpose helper.\"

[agents.domain_analyst]
description = \"Analyze the repository and write domain-analysis.md.\"
config_file = \"agents/domain-analyst.toml\"

[agents.harness_architect]
description = \"Design the harness meta-system structure and handoff rules.\"
config_file = \"agents/harness-architect.toml\"

[agents.skill_scaffolder]
description = \"Realign local skill contracts when sync drift appears.\"
config_file = \"agents/skill-scaffolder.toml\"

[agents.qa_designer]
description = \"Write qa-strategy.md with validation boundaries and escalation rules.\"
config_file = \"agents/qa-designer.toml\"

[agents.orchestrator]
description = \"Choose start points, re-entry rules, and team flow.\"
config_file = \"agents/orchestrator.toml\"

[agents.validator]
description = \"Audit operating contracts, drift, and rewrite ownership.\"
config_file = \"agents/validator.toml\"

[agents.run_harness]
description = \"Entry agent that chooses phase, mode, pattern, and next roles.\"
config_file = \"agents/run-harness.toml\"
"

create_file_if_missing ".codex/skills/domain-analyst/SKILL.md" \
"---
name: domain-analyst
description: 저장소의 목적, 핵심 런타임 경계, 실행·검증 흐름을 다시 읽고 최종 도메인 분석 문서를 작성합니다. 프로젝트 구조 분석, 사용자 입력 해석, 핵심 흐름 정리가 필요할 때 적극적으로 사용합니다.
---

# domain-analyst

이 스킬은 프로젝트 실행 하네스 팀의 출발점이 되는 분석 역할을 맡는다.

## 목적

현재 저장소가 무엇을 하는 프로젝트인지 파악하고, 이후 저장소 입력 문서가 공통으로 참조할 수 있는 분석 결과를 만든다.

## 주요 작업

1. 저장소의 목적과 범위를 추정한다.
2. 실제 시작 흐름과 핵심 런타임 경계를 다시 읽는다.
3. 저장소 고유 명사, 핵심 패키지 또는 모듈 책임, 주요 흐름을 식별한다.
4. 상태 관리 경계, 데이터 흐름, 배포 또는 런타임 차이가 보이면 실제 파일 근거와 함께 적는다.
5. 실행·검증 경로와 운영상 중요한 영역을 분석 결과로 적는다.
6. 결과를 \`.harness/reports/domain-analysis.md\`에 직접 작성한다.
7. 파일·경로 목록을 그대로 반복하지 말고, 왜 그 경계가 중요한지 도메인 문장으로 번역한다.

## 입력

- 저장소 루트 구조
- \`project-setup.md\` 또는 사용자 답변
- 약한 탐색 메모와 현재 문서 상태

## 출력

- \`.harness/reports/domain-analysis.md\`

출력은 가능하면 아래 순서를 따른다.

1. 이 저장소가 실제로 다루는 사용자 문제 또는 운영 문제
2. 핵심 패키지, 모듈, 런타임 경계의 역할
3. 실제 시작 흐름과 영향 전파 경로
4. 반복적으로 실패 비용이 큰 변경 유형
5. 위 해석을 뒷받침하는 대표 파일·경로 근거

## 역할 팀 내 위치

- 저장소 입력 문서 작성의 첫 단계
- qa-strategy와 메타시스템 문서의 입력을 만든다

## 협업 원칙

- 이후 역할이 사용할 수 있도록 구조적이고 요약된 결과를 남긴다.
- 추정과 사실을 구분한다.
- 구현 세부보다 이후 운영 문서가 참고해야 할 핵심 흐름에 집중한다.
- 저장소 고유 명사와 실제 업무 용어를 가능한 한 보존한다.
- 도메인 설명은 실제 파일 또는 경로 근거와 연결해 남긴다.
- 패키지 책임, 상태 흐름, 배포 경계가 보이면 파일 근거와 함께 적는다.
- 파일명이나 경로를 나열하는 데서 멈추지 말고, 그 근거가 왜 중요한지 해석 문장으로 이어 적는다.
- 비슷한 경로를 여러 섹션에 반복하기보다, 한 번 근거를 제시한 뒤 이후 섹션에서는 의미와 위험을 설명한다.

## 운영 규칙

- 분석이 불충분하면 이후 운영 구조 문서가 약해진다는 점을 항상 의식한다.
- 핵심 흐름이 불명확하면 \"무엇이 아직 불명확한지\"를 명시한다.
- validator나 QA가 분석 약점을 지적하면, 요약만 고치지 말고 분석의 기준 자체를 다시 쓴다.
- \`저장소 요약\`은 가능하면 일반 기술 스택 설명보다 실제 사용자 문제와 핵심 도메인 흐름을 앞에 둔다.
- \`저장소 고유 근거\`에는 자동 메모를 복사하지 말고, 도메인 설명을 뒷받침하는 대표 파일과 경로를 다시 골라 남긴다.
- \`exploration-notes\`는 자동 판단을 보류하는 약한 메모로만 보고, 실제 저장소 구조와 흐름을 바탕으로 최종 분석 결과를 쓴다.
- \`핵심 실행 흐름\`은 경로 목록이 아니라 사용자 흐름, 상태 전파, 소비 관계를 설명하는 문장으로 적는다.
- \`사실 기준 구조\`는 파일 목록이 아니라 패키지·모듈·런타임이 어떤 책임으로 나뉘는지 설명하는 구조 요약으로 유지한다.
- \`.claude\`, \`.codex\`, \`.agents\` 같은 AI 설정 디렉토리는 도메인 근거와 실행 흐름 해석에서 제외한다.
- \`build\`, \`dist\`, \`coverage\` 같은 생성 산출물 경로는 대표 진입점이나 핵심 흐름 근거로 쓰지 않는다.
- \`.harness/*\` 문서는 특별한 요청이 없으면 한글로 작성한다. 파일명은 기존 영문 이름을 유지한다.
- 역할이 호출되면 \`.harness/logs/session-log.md\`에 시작 요청, 호출 역할, 출력 파일, 다음 권장 역할을 남긴다.
"

create_file_if_missing ".codex/skills/harness-architect/SKILL.md" \
"---
name: harness-architect
description: 저장소에 맞는 프로젝트 로컬 실행 하네스 구조와 역할 경계를 설계합니다. 하네스 구조 설계, 역할 분리, 팀 구조 정리, 확장 가능한 하네스 설계가 필요할 때 적극적으로 사용합니다.
---

# harness-architect

이 스킬은 프로젝트에 맞는 실행 하네스 구조를 설계한다.

## 목적

분석 결과를 바탕으로, 이 저장소에 맞는 하네스 메타시스템 구조와 역할 경계를 최종 문서로 작성한다.

## 주요 작업

1. domain-analysis를 읽는다.
2. 하네스 메타시스템 구조를 최종 문서로 직접 작성한다.
3. 웹/서비스/라이브러리/런타임/배포 경계 중 실제 운영 비용이 갈리는 지점을 적는다.
4. 어떤 역할은 항상 유지하고 어떤 역할은 요청 유형에 따라 생략할 수 있는지 적는다.
5. 역할 간 handoff가 실제로 필요한 지점을 적는다.
6. 실행 하네스 구조를 \`.harness/reports/harness-architecture.md\`에 최종 결과로 작성한다.

## 입력

- \`.harness/reports/domain-analysis.md\`

## 출력

- \`.harness/reports/harness-architecture.md\`

출력은 가능하면 아래 순서를 따른다.

1. 하네스 메타시스템 구조와 핵심 경계
2. 역할별 개입 기준
3. 경계별 handoff 기준
4. 역할 유지/축소 기준

## 협업 원칙

- domain-analyst의 결과를 단순 요약하지 말고, 하네스 메타시스템 구조로 번역한다.
- 하네스 자체 설명서보다 이 저장소에서 실제로 운영 기준이 갈리는 경계를 앞에 둔다.
- 역할을 과도하게 늘리지 않는다.
- 역할 이름만 나열하지 말고, 어떤 경계에서 왜 그 역할이 개입하는지 저장소 기준으로 설명한다.
- 비슷한 역할 설명을 여러 섹션에서 반복하지 말고, 경계·handoff·유지 기준으로 나눠 적는다.
- \`skill-scaffolder\`는 스킬 설명 drift 같은 예외 상황이 아니면 구조 문서의 중심 역할로 쓰지 않는다.

## 운영 규칙

- 분석 결과가 약하면 설계를 단정하지 말고, 어떤 해석이 보류 상태인지 남긴다.
- 기본 역할 구성을 기계적으로 강제하지 말고 프로젝트 규모에 맞게 조정한다.
- 기본 역할 구성을 적을 때는 domain-analyst, harness-architect, qa-designer, orchestrator, validator의 5역할을 기준으로 보고, \`skill-scaffolder\`는 sync 상황의 보조 역할로만 다룬다.
- validator 메모가 과한 분리나 약한 구조를 가리키면 역할 수와 경계를 다시 읽는다.
- \`하네스 메타시스템 구조\`는 이 저장소의 런타임, 공용 계층, 배포 비용 차이를 바탕으로 어떤 역할 구성이 필요한지 설명하는 문단이어야 한다.
- \`역할별 개입 기준\`은 역할 카드 소개보다 어떤 변경에서 누가 먼저 들어오는지 기준을 적는다.
- \`경계별 handoff 기준\`은 실제로 손이 바뀌는 경계만 남기고, 자동으로 이어지는 역할 순서를 장황하게 늘어놓지 않는다.
- \`역할 유지와 조정 기준\`은 역할 이름 반복보다 어떤 조건에서 축소·확장하는지 기준을 먼저 적는다.
- 완료 상태의 \`harness-architecture.md\`는 역할 카드 소개보다 메타시스템 구조, 역할 개입 기준, handoff 기준이 더 앞에 와야 한다.
- \`.harness/*\` 문서는 특별한 요청이 없으면 한글로 작성한다. 파일명은 기존 영문 이름을 유지한다.
- 역할이 호출되면 \`.harness/logs/session-log.md\`에 호출 이유, 입력 파일, 출력 파일, 남은 약점을 남긴다.
"

create_file_if_missing ".codex/skills/skill-scaffolder/SKILL.md" \
"---
name: skill-scaffolder
description: 실행 하네스 구조를 바탕으로 프로젝트 로컬 역할 스킬과 기본 파일을 생성하거나 갱신합니다. 로컬 스킬 생성, 역할 파일 정리, 하네스 구조 반영이 필요할 때 적극적으로 사용합니다.
---

# skill-scaffolder

이 스킬은 설계된 실행 하네스 구조를 실제 파일로 옮긴다.

## 목적

실행 하네스가 문서 수준에 머물지 않고, 프로젝트 안에서 실제로 사용할 수 있는 역할 스킬 구조로 정착되게 한다.

## 주요 작업

1. harness-architecture를 읽는다.
2. 로컬 역할 스킬 파일을 생성하거나 갱신한다.
3. 역할별 설명과 책임 범위를 정리한다.
4. 결과 구조를 validator가 바로 읽을 수 있게 유지한다.

## 입력

- \`.harness/reports/harness-architecture.md\`

## 출력

- \`.codex/skills/*\`
- 필요 시 \`.harness/templates/*\`
- 필요 시 \`.harness/scenarios/*\`

## 역할 팀 내 위치

- 구조를 실제 파일로 만드는 역할
- architect의 설계를 구현으로 옮긴다

## 협업 원칙

- 생성 결과는 validator가 바로 읽기 쉬운 구조여야 한다.
- 설명이 지나치게 약한 스킬을 만들지 않는다.
- orchestrator가 흐름을 연결할 수 있게 입력/출력 구조를 유지한다.

## 운영 규칙

- 설명만 있는 얇은 스킬을 만들지 않는다.
- 각 스킬이 실제로 팀 멤버처럼 읽히는지 항상 다시 읽는다.
- validator가 약한 설명이나 연결 부족을 지적하면, 텍스트만 덧붙이지 말고 구조를 다시 쓴다.
- \`.harness/*\` 문서는 특별한 요청이 없으면 한글로 작성한다. 파일명은 기존 영문 이름을 유지한다.
- 역할이 호출되면 \`.harness/logs/session-log.md\`에 생성하거나 갱신한 파일과 다음 권장 역할을 남긴다.
"

create_file_if_missing ".codex/skills/qa-designer/SKILL.md" \
"---
name: qa-designer
description: 프로젝트 실행 하네스에서 필요한 품질 기준과 질문 세트를 설계하고 최종 QA 전략 문서를 작성합니다. QA 전략 수립, 품질 기준 정리, 구조 정합성 검토가 필요할 때 적극적으로 사용합니다.
---

# qa-designer

이 스킬은 실행 하네스가 어떤 품질 관점으로 프로젝트를 볼지 적는다.

## 목적

이 프로젝트에서 어떤 변경이 실제 회귀 비용을 만들고, 어떤 검증이 자동/수동으로 나뉘는지 저장소 입력 문서로 작성한다.

## 주요 작업

1. domain-analysis와 harness-architecture를 함께 읽는다.
2. 저장소 기준 QA 전략을 최종 문서로 직접 작성한다.
3. 자동 검증으로 충분한 영역과 수동 확인이 필요한 영역을 나눈다.
4. 품질 실패 유형과 반복 확인 질문을 적는다.
5. 결과를 \`.harness/reports/qa-strategy.md\`에 직접 작성한다.
6. 경계나 파일 목록을 그대로 옮기지 말고, 무엇을 왜 검증해야 하는지 품질 질문으로 번역한다.

## 입력

- \`.harness/reports/domain-analysis.md\`
- \`.harness/reports/harness-architecture.md\`

## 출력

- \`.harness/reports/qa-strategy.md\`

출력은 가능하면 아래 순서를 따른다.

1. 저장소 고유 단서
2. 핵심 품질 축
3. 핵심 질문
4. 변경 유형별 체크 기준

## 역할 팀 내 위치

- 저장소 입력 문서 작성 역할
- 메타시스템 문서와 검증 흐름의 QA 입력을 만든다

## 협업 원칙

- 존재 여부보다 정합성과 연결성을 본다.
- validator가 바로 사용할 수 있게 질문 세트를 또렷하게 적는다.
- orchestrator가 흐름에 포함할 수 있는 품질 기준을 만든다.
- 저장소 QA 전략을 설명하지, 하네스 일반론을 길게 복사하지 않는다.
- 웹/데스크톱/공용 계층/배포 중 어디까지 자동 검증으로 덮이고 어디서부터 수동 확인이 필요한지 분명히 적는다.
- 체크리스트를 나열하기보다, 왜 그 질문이 필요한지 변경 영향과 실패 비용을 기준으로 설명한다.

## 운영 규칙

- 추상적인 좋은 말보다 실제 반복 검토 가능한 질문을 우선한다.
- 프로젝트 목적과 무관한 품질 기준을 과하게 추가하지 않는다.
- validator 피드백이 반복되면 QA 질문이 충분히 구체적인지 다시 읽는다.
- \`자동/수동 검증 분리\`와 \`변경 유형별 체크 기준\`은 중첩 불릿보다 한 줄짜리 문장형 항목으로 정리한다.
- \`핵심 품질 축\`은 경로 목록이 아니라 어떤 경계에서 어떤 실패가 반복될 수 있는지 설명하는 문장으로 정리한다.
- \`변경 유형별 체크 기준\`은 일반 조언이 아니라, 어떤 명령을 우선 돌리고 어떤 경우에 수동 확인으로 승격하는지까지 적는다.
- 완료 상태의 \`qa-strategy.md\`는 하네스 일반 QA 설명보다 이 저장소의 자동/수동 검증 분리와 승격 기준이 더 앞에 와야 한다.
- \`.harness/*\` 문서는 특별한 요청이 없으면 한글로 작성한다. 파일명은 기존 영문 이름을 유지한다.
- 역할이 호출되면 \`.harness/logs/session-log.md\`에 새로 정한 QA 질문과 다음 권장 역할을 남긴다.
"

create_file_if_missing ".codex/skills/orchestrator/SKILL.md" \
"---
name: orchestrator
description: 프로젝트 로컬 실행 하네스의 중심 역할입니다. 도메인 분석, 구조 설계, 스킬 생성, QA, 검증 역할을 실제 작업 순서와 연결 구조로 정리하고 최종 오케스트레이션 계획을 작성할 때 적극적으로 사용합니다.
---

# orchestrator

이 스킬은 프로젝트 실행 하네스 팀의 중심 역할이다.

## 목적

여러 역할이 따로 존재하는 데 그치지 않고, 이 저장소에 맞는 하네스 메타시스템 오케스트레이션 구조를 문서로 작성한다.

## 주요 작업

1. domain-analysis, harness-architecture, qa-strategy를 읽는다.
2. 하네스 메타시스템 운영 계획을 최종 문서로 직접 작성한다.
3. 요청 유형별 시작 역할과 재진입 기준을 적는다.
4. 어떤 산출물이 다음 단계의 입력이 되는지 연결한다.
5. 프로젝트 로컬 실행 하네스 오케스트레이션 구조를 \`.harness/reports/orchestration-plan.md\`에 최종 결과로 작성한다.
6. 이후 프로젝트 특화 실행 하네스로 확장 가능한 포인트를 남긴다.
7. 순서 목록을 그대로 늘어놓지 말고, 왜 이 시작점과 재진입이 맞는지 운영 근거로 설명한다.

## 입력

- \`.harness/reports/domain-analysis.md\`
- \`.harness/reports/harness-architecture.md\`
- \`.harness/reports/qa-strategy.md\`

## 출력

- \`.harness/reports/orchestration-plan.md\`

출력은 가능하면 아래 순서를 따른다.

1. 저장소 고유 근거
2. 요청 유형별 시작점
3. 표준 진행 흐름
4. 재진입 및 handoff 기준

## 역할 팀 내 위치

- 하네스 메타시스템 흐름 작성 역할
- 시작점, 재진입, 종료 조건을 고정한다

## 협업 원칙

- 모든 일을 직접 대신하지 않는다.
- 각 역할의 입력과 출력을 연결하는 데 집중한다.
- 역할 간 중복을 줄이고 흐름을 단순하게 유지한다.
- validator의 피드백이 다시 구조 재작성으로 이어질 수 있게 루프를 만든다.
- 하네스 일반 흐름보다 이 저장소에서 실제로 어떻게 시작하고 재진입하는지를 앞에 둔다.
- \`run-harness\`, \`validator\`, \`skill-scaffolder\` 설명 자체를 길게 적기보다, 언제 누구를 먼저 호출하는지가 먼저 보이게 쓴다.
- 시작 역할과 재진입 기준은 사용자 요청, 경계 영향, 검증 비용을 함께 설명하는 운영 문장으로 남긴다.

## 운영 규칙

- 중심 역할이지만, 모든 산출물을 직접 작성하려고 하지 않는다.
- 흐름이 복잡해지면 병렬화보다 단순화가 가능한지 먼저 본다.
- QA와 validator의 피드백이 반복되면 흐름 자체를 다시 설계할 수 있어야 한다.
- 리포트가 본체처럼 커지고 역할 팀이 약해지는 징후를 경계한다.
- 부분 메모를 덧붙이는 데서 멈추지 말고, 최종 운영 계획 문서 전체를 다시 쓴다.
- \`요청 유형별 시작점\`은 패키지 경계, 런타임 경계, 검증 비용 차이 기준으로 적는다.
- \`표준 진행 흐름\`은 모든 역할을 다 부르는 목록이 아니라, 실제로 자주 쓰는 흐름만 남긴다.
- \`재진입 및 handoff 기준\`은 앞뒤 단계 이름 반복보다, 어떤 신호가 나오면 어디로 되돌아갈지 먼저 적는다.
- 완료 상태의 \`orchestration-plan.md\`와 \`team-playbook.md\`는 역할 소개보다 요청 유형별 시작점, 재진입 기준, 종료 조건이 더 앞에 와야 한다.
- \`.harness/*\` 문서는 특별한 요청이 없으면 한글로 작성한다. 파일명은 기존 영문 이름을 유지한다.
- 역할이 호출되면 \`.harness/logs/session-log.md\`에 흐름 변경, 연결 변경, 다음 권장 역할을 남긴다.
"

create_file_if_missing ".codex/skills/validator/SKILL.md" \
"---
name: validator
description: 생성된 프로젝트 로컬 실행 하네스의 운영 계약, drift, 역할 정렬 상태를 감사하고 재작성 대상을 식별합니다. 운영 계약 감사, 역할 정렬 판단, drift 판독이 필요할 때 적극적으로 사용합니다.
---

# validator

이 스킬은 생성된 실행 하네스의 운영 계약이 실제로 유지되고 있는지 감사한다.

## 목적

프로젝트 로컬 실행 하네스의 운영 계약, drift, 역할 정렬 상태를 감사하고 입력 문서와 메타시스템 문서가 서로 다른 목적을 유지하는지 확인한다.

## 주요 작업

1. 실행 모드, 실행 패턴, phase 게이트가 실제 문서와 역할 구조에 반영됐는지 본다.
2. 에이전트 정의와 역할 스킬이 서로 다른 책임을 유지하는지 본다.
3. 입력 문서와 메타시스템 문서의 목적이 섞였는지 본다.
4. drift, generic 회귀, handoff 약화가 어디서 시작됐는지 찾는다.
5. 필요하면 다시 써야 할 문서와 역할을 제안한다.
6. verify가 봐야 할 파일/구조 문제와 validator가 봐야 할 운영 계약 문제를 구분한다.
7. \`meta-system-maturity-guide.md\` 기준으로 현재 상태가 운영 가능, 재작성 필요, 재구성 필요 중 어디에 가까운지 판단한다.

## 입력

- \`.codex/skills/*\`
- \`.harness/reports/*\`
- 필요 시 \`.harness/templates/*\`
- 필요 시 \`.harness/scenarios/*\`

## 출력

- 운영 계약 감사 결과 또는 재작성 제안

출력은 가능하면 아래 순서를 따른다.

1. 지금 약해진 운영 계약은 무엇인가
2. 어떤 문서나 역할이 입력 문서/메타시스템 문서 목적을 잃었는가
3. 그 drift가 어느 역할 또는 phase에서 시작된 것으로 보이는가
4. 다음에 누가 어떤 기준으로 다시 써야 하는가

## 역할 팀 내 위치

- 실행 하네스의 운영 계약 감사 역할
- 생성 이후 drift와 정렬 상태를 읽는 역할

## 협업 원칙

- 단순 존재 확인에 그치지 않는다.
- 운영 계약, drift, phase 누락, 역할 정렬 약화를 적극적으로 지적한다.
- 피드백은 다시 architect / orchestrator / run-harness가 반영할 수 있게 구체적으로 남긴다.
- generic 문장이 늘어나거나 저장소 고유 근거가 약해진 지점은 우선순위를 높여 지적한다.
- 입력 문서가 메타 하네스 설명으로 흐르거나, 메타시스템 문서가 저장소 입력 문서처럼 흐르는 지점을 함께 본다.
- 성숙도 판단은 \`references/meta-system-maturity-guide.md\` 기준을 먼저 따르고, 품질 비교는 \`references/quality-evaluation-guide.md\`와 함께 본다.

## 운영 규칙

- 체크리스트만 읽고 끝내지 않는다.
- 구조적 약점이 반복되면 어느 역할과 어느 phase에서 문제가 시작됐는지 함께 본다.
- 재작성 제안은 실행 가능한 수준으로 남긴다.
- QA와 유사해 보일 때도, validator는 품질 질문보다 운영 계약과 정렬 상태에 더 집중한다.
- 감사 결과는 가능하면 \`운영 가능 / 재작성 필요 / 재구성 필요\` 중 하나로 먼저 요약한다.
- verify는 통과했지만 운영 가치가 약하면 \`Phase 7\` 품질 비교와 성숙도 평가 기준으로 다음 재진입 Phase를 다시 제안한다.
- 저장소 고유 경계나 업무 용어가 일반론으로 치환되면, 어떤 문장이 약해졌는지 직접 짚어 남긴다.
- 경로 목록만 반복되고 해석 문장이 약하면 generic 회귀 징후로 보고 재작성 역할을 분명히 지정한다.
- 입력 문서와 메타시스템 문서의 목적이 뒤섞이면, 그 문서를 실패로 보고 담당 역할을 다시 지정한다.
- 파일 부재, 디렉토리 부재, 필수 필드 누락 같은 문제는 validator 판단과 구분해 verify로 넘긴다.
- \`.harness/*\` 문서는 특별한 요청이 없으면 한글로 작성한다. 파일명은 기존 영문 이름을 유지한다.
- 역할이 호출되면 \`.harness/logs/session-log.md\`에 지적 사항, 영향 받은 파일, 다음 권장 역할을 남긴다.
"

create_file_if_missing ".codex/skills/run-harness/SKILL.md" \
"---
name: run-harness
description: 프로젝트 로컬 실행 하네스 팀을 실제로 기동하는 진입점입니다. 현재 저장소 상태를 보고 어떤 역할 흐름을 먼저 시작할지 결정하고, 분석·설계·QA·오케스트레이션·검증 흐름을 시작하거나 다시 이을 때 적극적으로 사용합니다.
---

# run-harness

이 스킬은 프로젝트 실행 하네스 팀의 운영 진입점이다.

## 목적

현재 저장소 상태를 보고, 어떤 저장소 입력 문서 또는 메타시스템 문서부터 다시 써야 하는지와 어느 Phase부터 다시 시작해야 하는지 결정한다.

## 주요 작업

1. 현재 \`.harness/reports/*\`, \`.codex/skills/*\`, 로그 파일 상태를 읽는다.
2. 저장소 입력 문서와 메타시스템 문서가 각각 이미 있는지, 아직 작성되지 않았는지 먼저 가른다.
3. 요청이 기능 구현, 구조 정리, 공통 모듈 수정, 빌드/검증 변경 중 어디에 가까운지 가른다.
4. 변경 영향 범위가 단일 모듈인지, 여러 경계나 공통 계층까지 전파되는지 함께 읽는다.
5. 입력 정보가 부족하거나 빈 프로젝트에 가까우면 사용자 질문을 남긴다.
6. 아래 Phase 중 어디서부터 다시 시작해야 하는지 정한다.
7. 현재 상태가 drift, sync, evolve 중 어떤 루프에 가까운지도 함께 적는다.
8. 마지막에 validator 관점의 최소 구조 확인을 남긴다.

## 입력

- 현재 저장소 상태
- \`.codex/skills/*\`
- \`.harness/reports/*\`

## 출력

- 현재 시점에 필요한 실행 하네스 팀 진행 순서
- 다음에 이어질 역할 제안
- 사용자에게 앞에 놓을 질문 세트
- 현재 루프 판단(drift / sync / evolve)
- 현재 성숙도 판단(운영 가능 / 재작성 필요 / 재구성 필요)

## 출력 계약

- 현재 시작 역할 1개를 앞에 제시한다.
- 다음 역할은 0~2개로 제한해 제안한다.
- 추가 질문이 필요하면 0~2개만 남긴다.
- 시작 근거는 1~3줄로 짧게 설명한다.
- 시작 근거에는 현재 가장 약한 경계 또는 문서, 그리고 왜 이 시작 역할이 필요한지를 함께 적는다.
- 상태 모드, 실행 모드, 실행 패턴을 함께 적는다.
- 현재 루프 판단을 함께 적는다.
- 현재 성숙도 판단을 함께 적는다.
- init 직후라면 최종 문서가 아직 없고, verify 전에 역할 작성이 필요하다는 점을 함께 적는다.
- 세션을 시작했다면 session-log 반영 여부를 함께 남긴다.

## Phase 기준

- Phase 0 감사: 기존 하네스 구조, 입력 준비 상태, 문서 부재 여부를 읽는다.
- Phase 1 도메인/작업 분석: 입력은 \`exploration-notes.md\`, \`project-setup.md\` 또는 사용자 답변이다. 산출은 \`domain-analysis.md\`다. 다음 단계 조건은 실제 시작 흐름, 핵심 경계, 실패 비용이 문서로 고정되는 것이다.
- Phase 2 프로젝트 맞춤 에이전트 팀 설계: 입력은 \`domain-analysis.md\`, 상태 모드, 실행 모드, 실행 패턴 후보다. 산출은 \`harness-architecture.md\`, \`team-structure.md\`, \`team-playbook.md\`다. 다음 단계 조건은 역할 경계, handoff 기준, 패턴 선택 이유가 문서에 고정되는 것이다.
- Phase 3 에이전트 정의 생성: 입력은 선택된 팀 구조와 패턴이다. 산출은 \`AGENTS.md\`, \`.codex/config.toml\`, \`.codex/agents/*.toml\`, \`.codex/skills/*\`다. 다음 단계 조건은 누가 하는가와 어떻게 하는가가 분리되는 것이다.
- Phase 4 QA 및 검증 구조: 입력은 저장소 입력 문서와 현재 팀 구조다. 산출은 \`qa-strategy.md\`와 검증 승격 기준이다. 다음 단계 조건은 자동/수동 검증 분리와 체크 기준이 문서로 고정되는 것이다.
- Phase 5 역할별 최종 산출물 작성: 입력은 저장소 입력 문서, 메타시스템 구조 문서, 현재 실행 모드와 패턴이다. 산출은 역할별 최종 보고서다. 다음 단계 조건은 시작점, 재진입 기준, 종료 조건이 문서에 고정되는 것이다.
- Phase 6 검증: 입력은 최종 문서, 에이전트 정의, 역할 스킬, 로그 상태다. 산출은 validator 판단과 \`harness-verify.sh\` 결과다. 다음 단계 조건은 run-harness가 다시 읽을 수 있는 정상 상태 또는 재작성 대상 역할이 분명한 상태다.
- Phase 7 품질 비교와 성숙도 평가: 입력은 검증 완료 상태, 운영 로그, \`with-skill\` / \`without-skill\` 비교 관찰이다. 산출은 품질 비교 메모, 성숙도 판단, 다음 재진입 Phase 제안이다. 다음 단계 조건은 현재 하네스를 \`운영 가능 / 재작성 필요 / 재구성 필요\` 중 하나로 설명할 수 있는 것이다.

## 실행 패턴 기준

- 파이프라인: 새 구조를 안정적으로 세울 때 기본으로 둔다.
- 생성-검증: 생성 직후 validator와 verify를 빨리 붙여야 할 때 둔다.
- 팬아웃/팬인: 하위 경계가 충분히 독립적이고, 마지막에 단일 문서로 다시 모을 수 있을 때만 둔다.
- 오케스트레이션 중심: handoff와 재진입 기준이 핵심인 상태에서 둔다.
- 전문가 풀: 저장소마다 필요한 역할 구성이 크게 달라져, 역할 선택 자체가 패턴 결정의 핵심일 때 둔다.
- 실행 패턴은 부가 메모가 아니라 상태 모드, 실행 모드와 함께 항상 고정해야 하는 핵심 선택이다.

## 상태 모드 기준

- 신규 구축이면 \`harness-init.sh\` 기준의 기본 팀 구조를 연다.
- 신규 구축 직후에는 verify보다 역할 작성이 앞에 놓인다.
- 기존 확장 또는 운영 유지보수이면 \`harness-update.sh\`를 기본 진입점으로 둔다.
- 부분 구조만 남아 있거나 문서와 역할 구성이 크게 어긋나면 update로 봉합하지 말고 명시적 재구성을 제안한다.
- 보고서 한 영역만 약하면 \`harness-update.sh --domain\`, \`--qa\`, \`--architecture\`, \`--orchestration\`, \`--team-structure\`, \`--team-playbook\` 같은 선택 갱신부터 연다.

## 실행 모드 기준

- 에이전트 팀: 기본 모드다. 핵심 역할과 handoff를 계속 운영해야 하는 상태에서 앞에 둔다.
- 단일 역할: 한 문서 또는 한 축만 다시 쓰면 되는 경우에만 둔다.
- 하이브리드: 팀 구조를 유지하되 일부 보조 해석이나 drift 정렬만 별도 역할로 분리할 때 둔다.
- 상태 모드와 실행 모드는 별개다. 예를 들어 기존 확장 상태라도 에이전트 팀으로 다시 들어갈 수 있고, 운영 유지보수 상태라도 단일 역할로 시작할 수 있다.

## 운영 루프 기준

- drift: 문서, 역할, 로그, 운영 계약이 서로 어긋난 상태다. 약해진 지점부터 다시 쓴다.
- sync: \`AGENTS.md\`, 에이전트 정의, 역할 스킬, 문서 계층이 서로 다른 계약을 말하는 상태다. 계약 정렬을 앞에 둔다.
- evolve: 반복 패턴, 검증 비용, handoff 병목 때문에 현재 팀 구조나 패턴 선택이 더 이상 맞지 않는 상태다. 역할 팀이나 패턴 선택 자체를 다시 설계한다.
- run-harness는 항상 현재 요청이 어떤 루프에 가까운지 먼저 적고 시작한다.
- run-harness는 항상 \`references/meta-system-maturity-guide.md\` 기준으로 현재 상태가 운영 가능, 재작성 필요, 재구성 필요 중 어디에 가까운지도 함께 적는다.
- verify를 막 통과한 상태라도 운영 가치가 약하면 \`Phase 7\` 관점에서 비교/회고를 먼저 남기고 필요한 Phase로 되돌아갈 수 있어야 한다.

## 역할 팀 내 위치

- 실행 하네스 팀의 기동 엔트리포인트
- 팀 전체를 실제로 움직이기 시작하게 만드는 역할

## 협업 원칙

- 항상 모든 역할을 다 호출하려 하지 않는다.
- 현재 상태에서 가장 약한 지점을 먼저 다시 쓴다.
- orchestrator와 validator는 Phase를 마무리하는 역할이지, 모든 문서의 대리 작성자가 아니다.
- 시작 근거가 약하면 역할 호출을 단정하기보다 사용자 확인 질문을 짧게 제시한다.
- 시작 역할을 제시할 때는 저장소 맞춤 근거와 현재 약점을 같이 묶어 설명한다.
- 항상 상태 모드와 실행 모드를 함께 적는다.
- 항상 실행 패턴까지 함께 적는다.
- 항상 현재 루프 판단까지 함께 적는다.
- 항상 현재 성숙도 판단까지 함께 적는다.

## 운영 규칙

- 새 프로젝트라면 상태 모드는 신규 구축, 실행 모드는 에이전트 팀, 실행 패턴은 파이프라인을 기본으로 둔다.
- 새 프로젝트라면 domain-analyst → harness-architect → qa-designer → orchestrator → validator 순서를 기본 흐름으로 둔다.
- 새 프로젝트에서 \`harness-init.sh\`만 끝난 상태라면 domain-analyst → qa-designer → harness-architect → orchestrator 순서로 문서를 먼저 작성하고, 그 다음 validator와 \`harness-verify.sh\`를 둔다.
- 이미 구조가 있는 프로젝트라면 \`harness-update.sh\`로 현재 상태를 다시 읽고 부족한 역할만 다시 호출하는 흐름을 앞에서 연다.
- \`skill-scaffolder\`는 하이브리드 모드에서 로컬 스킬 설명 drift, 구조 문구 불일치, 스킬 계약 재정렬이 필요할 때만 보조적으로 둔다.
- 문서, 로그, handoff를 계속 유지해야 하는 중심 역할은 에이전트 팀 모드로 유지하고, 입력과 출력이 좁은 보조 판단만 단일 역할 모드로 다룬다.
- 새 구조를 안정적으로 세울 때는 파이프라인을, 생성 직후 검증을 붙일 때는 생성-검증을, 하위 경계가 독립적일 때만 팬아웃/팬인을, handoff와 재진입이 핵심이면 오케스트레이션 중심 구조를, 역할 선택 자체가 핵심이면 전문가 풀을 앞에서 연다.
- 요청이 기능 구현, 구조 정리, 공통 모듈 수정, 빌드/검증 변경 중 어디에 걸리는지 분류하고 그 결과를 orchestration-plan 입력으로 사용한다.
- 요청이 추상적이거나 저장소 맥락이 약하면 질문과 탐색 재확인을 앞에 두고, 저장소 고유 용어와 영향 범위를 정확히 말하면 더 직접적인 역할 시작 흐름을 연다.
- 영향 범위가 공통 계층이나 다중 모듈로 번지면 domain-analyst와 qa-designer를 더 이른 순서에 배치한다.
- 다른 역할이 저장소를 직접 읽더라도 domain-analyst의 근거 제외 규칙을 그대로 따른다.
- 현재 보고서가 generic 문장으로 약해졌거나 저장소 고유 근거가 흐리면 domain-analyst 또는 validator를 더 이른 순서에 둔다.
- \`AGENTS.md\`, 에이전트 정의, 역할 스킬, 문서 계층이 서로 다른 계약을 말하면 sync 루프를 앞에 둔다.
- 반복되는 검증 비용, handoff 병목, 역할 과밀화가 보이면 evolve 루프를 앞에 둔다.
- 시작 역할을 정한 뒤에는 무엇이 바뀌면 다른 시작점이 더 적절해지는지도 짧게 남긴다.
- 입력 문서나 메타시스템 문서가 비어 있거나 generic 문장만 남아 있으면 \`harness-verify.sh\`보다 역할 재작성부터 앞에 둔다.
- 성숙도 판단이 \`재구성 필요\`이면 부분 갱신보다 명시적 재구성을 먼저 제안한다.
- 빈 저장소이거나 입력 정보가 부족하면, \`.harness/project-setup.md\` 존재 여부부터 읽는다.
- \`.harness/project-setup.md\`가 작성되어 있으면 그 내용을 domain-analyst의 시작 입력으로 연결한다.
- 작성되어 있지 않으면 사용자에게 프로젝트 성격, 핵심 사용자, 첫 성공 시나리오를 먼저 묻고, 파일이 없는 경우 템플릿 내용을 포함하여 \`.harness/project-setup.md\`에 채우도록 안내한다.
- 사용자 답변이 모이면 그 내용을 domain-analysis와 orchestration-plan의 입력으로 바로 연결한다.
- 재구성이 필요한 상태라면 어떤 구조가 비어 있거나 어긋났는지 설명하고, 기존 하네스 정리 후 \`harness-init.sh\`로 다시 구성하도록 제안한다.
- 리포트보다 실제 역할 팀 구조와 설명 품질을 더 중요하게 본다.
- \`.harness/*\` 문서는 특별한 요청이 없으면 한글로 작성한다. 파일명은 기존 영문 이름을 유지한다.
- 로그 운영 기준은 \`.harness/logging-policy.md\`를 먼저 읽는다.
- 이 역할이 호출되면 \`.harness/logs/session-log.md\`에 새로운 세션 시작 기록을 남긴다.

## 시작 예시

- 요청: \"새 API 엔드포인트 추가\" → 흐름: 기능 구현, 단일 경계 → 시작: domain-analyst → qa-designer → orchestrator
- 요청: \"공통 유틸 함수 리팩터\" → 흐름: 공통 계층 영향, 다중 소비자 → 시작: domain-analyst → qa-designer → orchestrator
- 요청: \"하네스 역할 구조 재설계\" → 흐름: 경계 재정의, 구조 변경 → 시작: harness-architect → qa-designer → orchestrator
- 요청: \"QA 문서만 다시 작성\" → 흐름: 기존 확장, 단일 보고서 갱신 → 시작: \`harness-update.sh --qa\` 후 qa-designer
- 요청: \"domain-analysis만 오래됐음\" → 흐름: 기존 확장, 단일 보고서 갱신 → 시작: \`harness-update.sh --domain\` 후 domain-analyst
- 요청: 역할 스킬은 있는데 보고서가 대부분 비어 있음 → 흐름: 부분 구조 drift → 시작: 명시적 재구성 제안
- 요청: 입력 정보 부족, project-setup.md 미작성 → 흐름: 프로젝트 성격 불명 → 시작: project-setup.md 템플릿 제공 및 작성 안내 후 대기
- 요청: 입력 정보 부족, project-setup.md 작성됨 → 흐름: 목표·성격 확인됨 → 시작: domain-analyst(project-setup.md 입력 연결)
"

create_file_if_missing ".codex/agents/domain-analyst.toml" \
"# 초기 seed 정의
# Phase 2/3에서 프로젝트 맞춤 역할 체계에 맞게 이름, 설명, 지침을 다시 정렬합니다.
name = \"domain_analyst\"
description = \"저장소를 읽고 domain-analysis.md를 최종 분석 문서로 작성하는 분석 에이전트.\"
model = \"gpt-5.4\"
model_reasoning_effort = \"high\"
sandbox_mode = \"workspace-write\"
developer_instructions = \"\"\"\n저장소를 직접 읽고 domain-analysis.md를 최종 분석 문서로 작성한다.\nexploration-notes.md는 자동 판단을 보류하는 약한 메모로만 보고, 실제 코드와 문서를 다시 읽어 핵심 흐름과 위험 변경 유형을 고정한다.\nqa-designer, harness-architect, orchestrator가 공통으로 참조할 수 있는 분석 결과를 남긴다.\n\"\"\""

create_file_if_missing ".codex/agents/harness-architect.toml" \
"# 초기 seed 정의
# Phase 2/3에서 프로젝트 맞춤 역할 체계에 맞게 이름, 설명, 지침을 다시 정렬합니다.
name = \"harness_architect\"
description = \"하네스 메타시스템 구조, 역할 경계, handoff 기준을 설계하는 아키텍트 에이전트.\"
model = \"gpt-5.4\"
model_reasoning_effort = \"high\"
sandbox_mode = \"workspace-write\"
developer_instructions = \"\"\"\n저장소 입력 문서를 바탕으로 harness-architecture.md와 team-structure.md를 메타시스템 문서로 작성한다.\n실행 모드와 아키텍처 패턴 선택을 먼저 고정하고, 왜 그 패턴이 현재 저장소와 요청에 맞는지부터 적는다.\n그 다음 역할 경계와 handoff 기준을 분명히 적는다.\n\"\"\""

create_file_if_missing ".codex/agents/skill-scaffolder.toml" \
"# 초기 seed 정의
# Phase 2/3에서 프로젝트 맞춤 역할 체계에 맞게 이름, 설명, 지침을 다시 정렬합니다.
name = \"skill_scaffolder\"
description = \"로컬 스킬 설명 drift와 계약 불일치를 정렬하는 보조 에이전트.\"
model = \"gpt-5.4-mini\"
model_reasoning_effort = \"medium\"
sandbox_mode = \"workspace-write\"
developer_instructions = \"\"\"\n핵심 문서 작성 흐름이 아니라 sync 루프에서 스킬 계약 정렬이 필요한 예외 상황에서만 개입한다.\n.codex/skills/*의 설명, 책임, 트리거가 현재 메타시스템 구조와 어긋나는 지점을 정렬한다.\n\"\"\""

create_file_if_missing ".codex/agents/qa-designer.toml" \
"# 초기 seed 정의
# Phase 2/3에서 프로젝트 맞춤 역할 체계에 맞게 이름, 설명, 지침을 다시 정렬합니다.
name = \"qa_designer\"
description = \"자동/수동 검증 분리와 변경 유형별 체크 기준을 작성하는 QA 설계 에이전트.\"
model = \"gpt-5.4\"
model_reasoning_effort = \"high\"
sandbox_mode = \"workspace-write\"
developer_instructions = \"\"\"\nqa-strategy.md를 최종 QA 전략 문서로 작성한다.\n자동과 수동 검증을 나누고, 승격 기준과 변경 유형별 체크 기준을 validator와 orchestrator가 공통으로 쓸 수 있게 고정한다.\n\"\"\""

create_file_if_missing ".codex/agents/orchestrator.toml" \
"# 초기 seed 정의
# Phase 2/3에서 프로젝트 맞춤 역할 체계에 맞게 이름, 설명, 지침을 다시 정렬합니다.
name = \"orchestrator\"
description = \"시작점, 재진입, 종료 조건을 설계하는 오케스트레이션 에이전트.\"
model = \"gpt-5.4\"
model_reasoning_effort = \"high\"
sandbox_mode = \"workspace-write\"
developer_instructions = \"\"\"\n요청 유형별 시작점과 재진입 기준을 orchestration-plan.md와 team-playbook.md에 작성한다.\n팀 운영 원칙과 종료 조건을 실제 하네스 운영 흐름으로 고정한다.\n\"\"\""

create_file_if_missing ".codex/agents/validator.toml" \
"# 초기 seed 정의
# Phase 2/3에서 프로젝트 맞춤 역할 체계에 맞게 이름, 설명, 지침을 다시 정렬합니다.
name = \"validator\"
description = \"저장소 입력 문서와 메타시스템 문서의 운영 계약을 감사하는 검증 에이전트.\"
model = \"gpt-5.4\"
model_reasoning_effort = \"high\"
sandbox_mode = \"read-only\"
developer_instructions = \"\"\"\n저장소 입력 문서와 메타시스템 문서의 목적 혼합, 실행 모드/패턴 drift, phase 게이트 누락, sync 불일치, evolve 필요 신호를 찾는다.\nverify가 맡는 파일/구조 문제와 validator가 맡는 운영 계약 문제를 구분한다.\n어떤 역할이 어느 문서를 다시 써야 하는지 재작성 책임을 분명히 지정한다.\n\"\"\""

create_file_if_missing ".codex/agents/run-harness.toml" \
"# 초기 seed 정의
# Phase 2/3에서 프로젝트 맞춤 역할 체계에 맞게 이름, 설명, 지침을 다시 정렬합니다.
name = \"run_harness\"
description = \"현재 상태를 읽고 어떤 Phase와 어떤 역할 조합부터 시작할지 결정하는 진입 에이전트.\"
model = \"gpt-5.4\"
model_reasoning_effort = \"high\"
sandbox_mode = \"workspace-write\"
developer_instructions = \"\"\"\n현재 .harness/reports/*, .codex/config.toml, .codex/agents/*.toml, .codex/skills/*, 로그 상태를 읽는다.\n어떤 저장소 입력 문서 또는 메타시스템 문서부터 다시 써야 하는지와 어느 Phase부터 다시 시작해야 하는지 결정한다.\n항상 상태 모드, 실행 모드, 실행 패턴, 현재 루프 판단(drift / sync / evolve)을 함께 제시하고 그 이유를 짧게 남긴다.\n\"\"\""

create_file_if_missing ".harness/logging-policy.md" \
"# 로그 정책

## 목적

이 문서는 실행 하네스 팀을 실제로 운용할 때 어떤 로그를 남겨야 하는지 적습니다.

## 자동화 도구

- 전역 설치된 \`harness-log.sh\`는 역할 호출 시 세션 로그에 자동 append 합니다.
- 전역 설치된 \`harness-session-close.sh\`는 세션 종료 시 최신 세션 요약을 자동 갱신합니다.
- 선택 자산이 활성화된 프로젝트에서는 \`harness-session-close.sh\`가 역할 호출 빈도 통계와 템플릿 후보 분석까지 함께 갱신합니다.
- 선택 자산이 활성화된 프로젝트에서는 \`harness-role-stats.sh\`가 누적 로그를 기준으로 역할 호출 빈도 통계를 다시 계산합니다.
- 선택 자산이 활성화된 프로젝트에서는 \`harness-template-candidates.sh\`가 누적 로그를 분석해 반복 업무 템플릿 후보를 \`.harness/reports/template-candidates.md\`에 남깁니다.

## 로그를 남겨야 하는 상황

- run-harness로 팀을 시작했을 때
- 특정 역할을 직접 호출했을 때
- validator 피드백이 나왔을 때
- QA 질문이 다시 정리되었을 때
- orchestrator가 흐름을 변경했을 때
- 역할 팀 구조가 변경되었을 때

## 최소 로그 항목

- 시각
- 시작 요청 요약
- 진입점 역할
- 호출된 역할
- 입력으로 본 파일
- 출력/갱신된 파일
- 다음 권장 역할
- 남은 약점 또는 미해결 항목

## 원칙

- 로그는 짧지만 구조적으로 남깁니다.
- 사람이 읽을 수 있어야 합니다.
- 역할 흐름과 피드백 루프가 보이도록 남깁니다.
- 각 역할은 자신이 수행한 주요 변경과 다음 권장 단계를 남길 책임이 있습니다.
- \`harness-init\`는 하네스 골격 준비로 기록하고, 실제 역할 실행 세션은 \`run-harness\` 또는 개별 역할 이름으로 분리해 남깁니다.
- 가능하면 수동 편집보다 자동 append 스크립트를 우선 사용합니다.
"

create_file_if_missing ".harness/logs/session-log.md" \
"# 실행 하네스 세션 로그

## 기록 원칙

각 세션마다 아래 형식으로 기록합니다.

---

### 세션

- 시각:
- 세션 ID:
- 상태:
- 시작 요청:
- 진입점:
- 호출 역할:
- 입력 파일:
- 출력 파일:
- 다음 권장 역할:
- 남은 약점:

---

## 예시

### 세션

- 시각: YYYY-MM-DD HH:MM
- 세션 ID: session-YYYYMMDD-HHMMSS
- 상태: completed
- 시작 요청: 현재 프로젝트 하네스를 초기화해줘
- 진입점: harness-init
- 호출 역할: -
- 입력 파일: 없음
- 출력 파일: AGENTS.md, .codex/config.toml, .harness/reports/exploration-notes.md
- 다음 권장 역할: run-harness
- 남은 약점: 역할 팀이 아직 최종 보고서를 작성하지 않음

---

### 세션

- 시각: YYYY-MM-DD HH:MM
- 세션 ID: session-YYYYMMDD-HHMMSS
- 상태: started
- 시작 요청: 현재 프로젝트에 하네스 팀을 한 번 돌려줘
- 진입점: run-harness
- 호출 역할: domain-analyst, harness-architect, orchestrator
- 입력 파일: 없음
- 출력 파일: .harness/reports/domain-analysis.md, .harness/reports/harness-architecture.md
- 다음 권장 역할: qa-designer
- 남은 약점: QA 질문이 아직 추상적임
"

create_file_if_missing ".harness/logs/session-events.tsv" \
"timestamp	session_id	status	request	entry_point	roles	inputs	outputs	next_role	weaknesses	note"

create_file_if_missing ".harness/logs/latest-session-summary.md" \
"# 최신 세션 요약

아직 종료된 세션 집계가 없습니다.
"

if optional_harness_assets_enabled "$EXPLORATION_NOTES_FILE"; then
  create_file_if_missing ".harness/logs/role-frequency.md" \
"# 역할 호출 빈도

아직 집계된 역할 호출 통계가 없습니다.
"
fi

log "프로젝트 로컬 실행 하네스 초기화 완료"
log "루트 기준 AI 탐색 메모와 로컬 역할 스킬이 준비되었습니다."
log "최종 보고서는 run-harness 또는 역할 스킬이 직접 작성해야 합니다."
log "다음 단계: 역할이 보고서를 작성한 뒤 harness-verify.sh 를 실행하세요."
