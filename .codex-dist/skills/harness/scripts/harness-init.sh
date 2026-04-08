#!/usr/bin/env bash
# harness-init.sh
# 디렉토리, 로컬 역할 스킬, 보조 리포트를 최초 1회 생성합니다.
# harness-update.sh와 차이:
#   - harness-init.sh: 디렉토리/스킬/리포트 모두 생성 (기존 파일 유지)
#   - harness-update.sh: 기존 하네스 구조를 감사한 뒤 필요한 보조 문서를 보강
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
EXPLORATION_ENTRYPOINT_HINT="$(build_exploration_section_summary "$EXPLORATION_NOTES_FILE" "대표 진입점" "추정 불가")"
EXPLORATION_BOUNDARY_HINT="$(build_exploration_section_summary "$EXPLORATION_NOTES_FILE" "주요 코드 경계" "추정 불가")"
EXPLORATION_TEST_HINT="$(build_exploration_section_summary "$EXPLORATION_NOTES_FILE" "테스트 및 검증 자산" "추정 불가")"
EXPLORATION_CONFIG_HINT="$(build_exploration_section_summary "$EXPLORATION_NOTES_FILE" "설정 및 실행 경로" "추정 불가")"
EXPLORATION_DOMAIN_HINT="$(build_exploration_section_summary "$EXPLORATION_NOTES_FILE" "저장소 고유 용어 단서" "추정 불가")"
BOUNDARY_HINT="$EXPLORATION_BOUNDARY_HINT"
CONFIG_HINT="$EXPLORATION_CONFIG_HINT"
PROJECT_TYPE_LABEL="$(build_project_type_label "$EXPLORATION_CONTEXT_LEVEL" "$BOUNDARY_HINT")"
KEY_AXES_HINT="$(build_key_axes_hint "$EXPLORATION_CONTEXT_LEVEL" "$BOUNDARY_HINT" "$EXPLORATION_TEST_HINT" "$CONFIG_HINT")"
CORE_FLOW_HINT="$(build_core_flow_hint "$EXPLORATION_CONTEXT_LEVEL" "$BOUNDARY_HINT")"
if [ "$EXPLORATION_ENTRYPOINT_HINT" != "추정 불가" ]; then
  CORE_FLOW_HINT="\`$EXPLORATION_ENTRYPOINT_HINT\` 기준으로 실제 시작 흐름과 소비 경계를 먼저 정리해야 합니다."
fi
DOMAIN_SUMMARY_BLOCK="$(build_domain_summary_block "$EXPLORATION_CONTEXT_LEVEL" "$PROJECT_TYPE_LABEL" "$BOUNDARY_HINT" "$CORE_FLOW_HINT" "$KEY_AXES_HINT" "$CONFIG_HINT")"
INITIAL_OBSERVATION_LINE="$(build_initial_observation "$EXPLORATION_CONTEXT_LEVEL" "$BOUNDARY_HINT" "$CONFIG_HINT" "$EXPLORATION_DOMAIN_HINT")"
if [ "$EXPLORATION_DOMAIN_HINT" != "추정 불가" ]; then
  INITIAL_OBSERVATION_LINE="- 탐색 문서에서 \`$EXPLORATION_DOMAIN_HINT\` 단서를 먼저 수집했습니다."
fi
NEXT_STEP_DETAIL_LINE="$(build_next_step_line "$EXPLORATION_CONTEXT_LEVEL" "init")"
DISCOVERY_GUIDANCE="$(build_exploration_guidance "$EXPLORATION_NOTES_FILE" "$EXPLORATION_CONTEXT_LEVEL" "$BOUNDARY_HINT")"

if exploration_requires_user_bootstrap "$EXPLORATION_NOTES_FILE"; then
  DISCOVERY_GUIDANCE="현재 탐색 근거만으로는 방향 판단이 어렵습니다. run-harness는 사용자에게 프로젝트 성격, 핵심 사용자, 첫 성공 시나리오를 먼저 확인해야 합니다."
fi

DOMAIN_DETAIL_BLOCK="$(build_domain_report_detail_block "$EXPLORATION_CONTEXT_LEVEL" "$BOUNDARY_HINT" "$KEY_AXES_HINT" "$CONFIG_HINT" "$CORE_FLOW_HINT" "$DISCOVERY_GUIDANCE" "$INITIAL_OBSERVATION_LINE" "$NEXT_STEP_DETAIL_LINE")"
ARCH_REPORT_BLOCK="$(build_architecture_report_block "$EXPLORATION_CONTEXT_LEVEL" "$PROJECT_TYPE_LABEL" "$KEY_AXES_HINT" "$CORE_FLOW_HINT")"
QA_REPORT_BLOCK="$(build_qa_report_block "$EXPLORATION_CONTEXT_LEVEL" "$KEY_AXES_HINT" "$BOUNDARY_HINT" "$EXPLORATION_TEST_HINT")"
ORCH_REPORT_BLOCK="$(build_orchestration_report_block "$EXPLORATION_CONTEXT_LEVEL" "$KEY_AXES_HINT")"
TEAM_STRUCTURE_REPORT_BLOCK="$(build_team_structure_report_block "$EXPLORATION_CONTEXT_LEVEL" "$KEY_AXES_HINT")"
TEAM_PLAYBOOK_REPORT_BLOCK="$(build_team_playbook_report_block "$EXPLORATION_CONTEXT_LEVEL" "$KEY_AXES_HINT")"

log "프로젝트 로컬 실행 하네스 초기화 시작: $ROOT_DIR"
log "하네스 운영 모드: $HARNESS_OPERATION_MODE"
log "탐색 근거 문서: $EXPLORATION_NOTES_FILE"
log "탐색 근거 요약: $EXPLORATION_ANCHOR_SUMMARY"
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

create_file_if_missing ".codex/agents/domain-analyst.md" \
"# domain-analyst

## 역할

- 저장소 탐색의 출발점을 맡는 분석 역할

## 핵심 책임

- 대표 진입점, 주요 코드 경계, 실행·검증 경로를 정리한다.
- 후속 역할이 공통으로 사용할 분석 근거를 만든다.

## 입력

- 저장소 루트
- 탐색 결과

## 출력

- \`.harness/reports/domain-analysis.md\`

## handoff

- \`harness-architect\`
- \`qa-designer\`
- \`orchestrator\`
"

create_file_if_missing ".codex/agents/harness-architect.md" \
"# harness-architect

## 역할

- 역할 팀 구조와 경계를 설계하는 구조 설계 역할

## 핵심 책임

- 분석 결과를 역할 팀 구조로 번역한다.
- 어떤 역할을 유지·축소·확장할지 정한다.

## 입력

- \`.harness/reports/domain-analysis.md\`

## 출력

- \`.harness/reports/harness-architecture.md\`

## handoff

- \`skill-scaffolder\`
- \`orchestrator\`
"

create_file_if_missing ".codex/agents/skill-scaffolder.md" \
"# skill-scaffolder

## 역할

- 역할 정의와 구조 설계를 실제 로컬 파일로 옮기는 구현 역할

## 핵심 책임

- 역할 팀 구조를 \`.codex/skills/*\`와 선택 자산으로 반영한다.
- validator가 점검 가능한 구조를 유지한다.

## 입력

- \`.harness/reports/harness-architecture.md\`

## 출력

- \`.codex/skills/*\`
- 필요 시 \`.harness/templates/*\`
- 필요 시 \`.harness/scenarios/*\`

## handoff

- \`orchestrator\`
- \`validator\`
"

create_file_if_missing ".codex/agents/qa-designer.md" \
"# qa-designer

## 역할

- 품질 축과 반복 검토 질문을 설계하는 QA 역할

## 핵심 책임

- 프로젝트의 반복 위험을 품질 질문으로 정리한다.
- validator와 orchestrator가 참조할 QA 기준을 만든다.

## 입력

- \`.harness/reports/domain-analysis.md\`
- \`.harness/reports/harness-architecture.md\`

## 출력

- \`.harness/reports/qa-strategy.md\`

## handoff

- \`orchestrator\`
- \`validator\`
"

create_file_if_missing ".codex/agents/orchestrator.md" \
"# orchestrator

## 역할

- 역할 팀 전체 흐름과 handoff를 조율하는 중심 역할

## 핵심 책임

- 역할 호출 순서와 재진입 기준을 정리한다.
- 산출물 연결과 피드백 루프를 유지한다.

## 입력

- \`.harness/reports/domain-analysis.md\`
- \`.harness/reports/harness-architecture.md\`
- \`.harness/reports/qa-strategy.md\`

## 출력

- \`.harness/reports/orchestration-plan.md\`

## handoff

- \`validator\`
- 필요 시 앞선 역할 재호출
"

create_file_if_missing ".codex/agents/validator.md" \
"# validator

## 역할

- 실행 하네스 구조와 연결성을 점검하는 검증 역할

## 핵심 책임

- 누락, 충돌, 약한 설명, 잘못된 연결을 식별한다.
- 보완이 필요한 위치를 다시 역할 팀에 돌려보낸다.

## 입력

- \`.codex/skills/*\`
- \`.harness/reports/*\`

## 출력

- 검증 로그
- 보완 제안

## handoff

- \`harness-architect\`
- \`skill-scaffolder\`
- \`qa-designer\`
- \`orchestrator\`
"

create_file_if_missing ".codex/agents/run-harness.md" \
"# run-harness

## 역할

- 현재 상태를 읽고 시작 역할과 보강 역할을 정하는 팀 기동 역할

## 핵심 책임

- 신규 구축, 기존 확장, 운영 유지보수, 재구성 여부를 판단한다.
- 현재 시작 역할과 후속 handoff를 제안한다.

## 입력

- 현재 저장소 상태
- \`.codex/skills/*\`
- \`.harness/reports/*\`

## 출력

- 시작 역할 1개
- 보강 필요 역할 0~2개
- 추가 질문 0~2개

## handoff

- \`domain-analyst\`
- \`harness-architect\`
- \`qa-designer\`
- \`orchestrator\`
- \`validator\`
"

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

탐색 근거가 아직 부족해 자동 분석이 제한적입니다.
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

create_file_if_missing ".codex/skills/domain-analyst/SKILL.md" \
"---
name: domain-analyst
description: 저장소의 목적, 대표 진입점, 주요 코드 경계, 실행·검증 경로, 하네스 관점의 핵심 관심사를 분석합니다. 프로젝트 구조 분석, 탐색 근거 정리, 핵심 흐름 해석, 하네스 출발점 정의가 필요할 때 적극적으로 사용합니다.
---

# domain-analyst

이 스킬은 프로젝트 실행 하네스 팀의 출발점이 되는 분석 역할을 맡는다.

## 목적

현재 저장소가 무엇을 하는 프로젝트인지 파악하고, 이후 역할 팀이 공통으로 참조할 수 있는 분석 결과를 만든다.

## 주요 작업

1. 저장소의 목적과 범위를 추정한다.
2. 대표 진입점과 주요 코드 경계를 확인한다.
3. 주요 흐름을 식별한다.
4. 실행·검증 경로와 하네스 관점에서 중요한 영역을 정리한다.
5. 결과를 \`.harness/reports/domain-analysis.md\`에 반영한다.

## 입력

- 저장소 루트 구조
- 주요 설정 및 실행 경로
- 핵심 소스 디렉토리와 테스트 자산

## 출력

- \`.harness/reports/domain-analysis.md\`

## 역할 팀 내 위치

- 실행 하네스의 첫 단계
- harness-architect, qa-designer, orchestrator의 입력을 만든다

역할 정체성과 handoff 기준은 \`.codex/agents/domain-analyst.md\`를 따른다.

## 협업 원칙

- 이후 역할이 사용할 수 있도록 구조적이고 요약된 결과를 남긴다.
- 추정과 사실을 구분한다.
- 구현 세부보다 역할 팀이 참고해야 할 핵심 흐름에 집중한다.

## 운영 규칙

- 분석이 불충분하면 architect가 설계를 강하게 진행할 수 없다는 점을 항상 의식한다.
- 핵심 흐름이 불명확하면 \"무엇이 아직 불명확한지\"를 명시한다.
- validator나 QA가 분석 약점을 지적하면, 요약만 고치지 말고 분석의 기준 자체를 다시 본다.
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

분석 결과를 바탕으로, 이 프로젝트에 어떤 역할 팀과 산출물 구조가 필요한지 정의한다.

## 주요 작업

1. domain-analysis를 읽는다.
2. 필요한 역할 구성을 정한다.
3. 어떤 역할은 유지하고 어떤 역할은 줄일지 판단한다.
4. 실행 하네스 구조를 \`.harness/reports/harness-architecture.md\`에 정리한다.

## 입력

- \`.harness/reports/domain-analysis.md\`

## 출력

- \`.harness/reports/harness-architecture.md\`

## 역할 팀 내 위치

- 구조 설계 담당
- skill-scaffolder와 orchestrator의 기준점 역할

역할 정체성과 handoff 기준은 \`.codex/agents/harness-architect.md\`를 따른다.

## 협업 원칙

- domain-analyst의 결과를 단순 요약하지 말고, 역할 팀 구조로 번역한다.
- skill-scaffolder가 바로 반영할 수 있는 수준으로 구조를 구체화한다.
- 역할을 과도하게 늘리지 않는다.

## 운영 규칙

- 분석 결과가 약하면 설계를 단정하지 말고, 어떤 판단이 보류 상태인지 남긴다.
- 기본 역할 구성을 기계적으로 강제하지 말고 프로젝트 규모에 맞게 조정한다.
- validator가 과한 분리나 약한 구조를 지적하면 역할 수와 경계를 다시 검토한다.
- \`.harness/*\` 문서는 특별한 요청이 없으면 한글로 작성한다. 파일명은 기존 영문 이름을 유지한다.
- 역할이 호출되면 \`.harness/logs/session-log.md\`에 호출 이유, 입력 파일, 출력 파일, 남은 약점을 남긴다.
"

create_file_if_missing ".codex/skills/skill-scaffolder/SKILL.md" \
"---
name: skill-scaffolder
description: 실행 하네스 구조를 바탕으로 프로젝트 로컬 역할 스킬과 기본 파일을 생성하거나 보완합니다. 로컬 스킬 생성, 역할 파일 정리, 하네스 구조 반영이 필요할 때 적극적으로 사용합니다.
---

# skill-scaffolder

이 스킬은 설계된 실행 하네스 구조를 실제 파일로 옮긴다.

## 목적

실행 하네스가 문서 수준에 머물지 않고, 프로젝트 안에서 실제로 사용할 수 있는 역할 스킬 구조로 정착되게 한다.

## 주요 작업

1. harness-architecture를 읽는다.
2. 로컬 역할 스킬 파일을 생성하거나 보완한다.
3. 역할별 설명과 책임 범위를 정리한다.
4. 결과 구조를 validator가 점검할 수 있게 유지한다.

## 입력

- \`.harness/reports/harness-architecture.md\`

## 출력

- \`.codex/skills/*\`
- 필요 시 \`.harness/templates/*\`
- 필요 시 \`.harness/scenarios/*\`

## 역할 팀 내 위치

- 구조를 실제 파일로 만드는 역할
- architect의 설계를 구현으로 옮긴다

역할 정체성과 handoff 기준은 \`.codex/agents/skill-scaffolder.md\`를 따른다.

## 협업 원칙

- 생성 결과는 validator가 점검하기 쉬운 구조여야 한다.
- 설명이 지나치게 약한 스킬을 만들지 않는다.
- orchestrator가 흐름을 연결할 수 있게 입력/출력 구조를 유지한다.

## 운영 규칙

- 설명만 있는 얇은 스킬을 만들지 않는다.
- 각 스킬이 실제로 팀 멤버처럼 읽히는지 항상 확인한다.
- validator가 약한 설명이나 연결 부족을 지적하면, 텍스트만 덧붙이지 말고 구조를 다시 정돈한다.
- \`.harness/*\` 문서는 특별한 요청이 없으면 한글로 작성한다. 파일명은 기존 영문 이름을 유지한다.
- 역할이 호출되면 \`.harness/logs/session-log.md\`에 생성/보완한 파일과 다음 권장 역할을 남긴다.
"

create_file_if_missing ".codex/skills/qa-designer/SKILL.md" \
"---
name: qa-designer
description: 프로젝트 실행 하네스에서 필요한 품질 기준, 검토 질문, 경계면 점검 포인트를 설계합니다. QA 전략 수립, 품질 기준 정의, 구조 정합성 검토가 필요할 때 적극적으로 사용합니다.
---

# qa-designer

이 스킬은 실행 하네스가 어떤 품질 관점으로 프로젝트를 볼지 정의한다.

## 목적

이 프로젝트에서 무엇을 반복적으로 검토해야 하는지 정하고, 역할 팀이 공유할 QA 관점을 만든다.

## 주요 작업

1. domain-analysis와 harness-architecture를 함께 읽는다.
2. 품질 실패 유형을 정리한다.
3. 반복 검토 질문을 정의한다.
4. 결과를 \`.harness/reports/qa-strategy.md\`에 반영한다.

## 입력

- \`.harness/reports/domain-analysis.md\`
- \`.harness/reports/harness-architecture.md\`

## 출력

- \`.harness/reports/qa-strategy.md\`

## 역할 팀 내 위치

- 역할 팀의 QA 기준 제공
- validator와 orchestrator가 참고하는 품질 기준점

역할 정체성과 handoff 기준은 \`.codex/agents/qa-designer.md\`를 따른다.

## 협업 원칙

- 존재 여부보다 정합성과 연결성을 본다.
- validator가 실제 피드백을 줄 수 있게 검토 질문을 구체화한다.
- orchestrator가 흐름에 포함할 수 있는 품질 기준을 만든다.

## 운영 규칙

- 추상적인 좋은 말보다 실제 반복 검토 가능한 질문을 우선한다.
- 프로젝트 목적과 무관한 품질 기준을 과하게 추가하지 않는다.
- validator 피드백이 반복되면 QA 질문이 충분히 구체적인지 다시 점검한다.
- \`.harness/*\` 문서는 특별한 요청이 없으면 한글로 작성한다. 파일명은 기존 영문 이름을 유지한다.
- 역할이 호출되면 \`.harness/logs/session-log.md\`에 추가/보강한 QA 질문과 후속 권장 역할을 남긴다.
"

create_file_if_missing ".codex/skills/orchestrator/SKILL.md" \
"---
name: orchestrator
description: 프로젝트 로컬 실행 하네스의 중심 역할입니다. 도메인 분석, 구조 설계, 스킬 생성, QA, 검증 역할을 실제 작업 순서와 연결 구조로 정리하고, 역할 팀이 어떻게 협업해야 하는지 정의할 때 적극적으로 사용합니다.
---

# orchestrator

이 스킬은 프로젝트 실행 하네스 팀의 중심 역할이다.

## 목적

여러 역할이 따로 존재하는 데 그치지 않고, 실제로 하나의 역할 팀처럼 동작하도록 흐름과 연결 구조를 정리한다.

## 주요 작업

1. domain-analysis, harness-architecture, qa-strategy를 읽는다.
2. 어떤 역할이 먼저 수행되어야 하는지 정한다.
3. 어떤 산출물이 다음 단계의 입력이 되는지 연결한다.
4. 프로젝트 로컬 실행 하네스 구조를 \`.harness/reports/orchestration-plan.md\`에 정리한다.
5. 이후 프로젝트 특화 실행 하네스로 확장 가능한 포인트를 남긴다.

## 입력

- \`.harness/reports/domain-analysis.md\`
- \`.harness/reports/harness-architecture.md\`
- \`.harness/reports/qa-strategy.md\`

## 출력

- \`.harness/reports/orchestration-plan.md\`

## 역할 팀 내 위치

- 실행 하네스의 조율 중심
- 각 역할을 하나의 팀 흐름으로 묶는다
- 프로젝트별 실행 하네스의 운영 기준점이 된다

역할 정체성과 handoff 기준은 \`.codex/agents/orchestrator.md\`를 따른다.

## 협업 원칙

- 모든 일을 직접 대신하지 않는다.
- 각 역할의 입력과 출력을 연결하는 데 집중한다.
- 역할 간 중복을 줄이고 흐름을 단순하게 유지한다.
- validator의 피드백이 다시 구조 보완으로 이어질 수 있게 루프를 만든다.

## 운영 규칙

- 중심 역할이지만, 모든 산출물을 직접 작성하려고 하지 않는다.
- 흐름이 복잡해지면 병렬화보다 단순화가 가능한지 먼저 본다.
- QA와 validator의 피드백이 반복되면 흐름 자체를 다시 설계할 수 있어야 한다.
- 리포트가 본체처럼 커지고 역할 팀이 약해지는 징후를 경계한다.
- \`.harness/*\` 문서는 특별한 요청이 없으면 한글로 작성한다. 파일명은 기존 영문 이름을 유지한다.
- 역할이 호출되면 \`.harness/logs/session-log.md\`에 흐름 변경, 연결 변경, 다음 권장 역할을 남긴다.
"

create_file_if_missing ".codex/skills/validator/SKILL.md" \
"---
name: validator
description: 생성된 프로젝트 로컬 실행 하네스가 최소 요건을 만족하는지 점검하고, 누락·충돌·약한 설명을 식별합니다. 구조 검증, 역할 점검, 연결성 점검이 필요할 때 적극적으로 사용합니다.
---

# validator

이 스킬은 생성된 실행 하네스가 실제로 쓸 만한 출발점인지 점검한다.

## 목적

프로젝트 로컬 실행 하네스가 최소한의 구조, 설명, 연결성을 갖추었는지 확인한다.

## 주요 작업

1. 필수 디렉토리와 파일을 점검한다.
2. 각 역할 스킬의 설명이 약하지 않은지 본다.
3. 리포트와 역할 구조가 연결되는지 확인한다.
4. 필요하면 보완 항목을 제안한다.

## 입력

- \`.codex/skills/*\`
- \`.harness/reports/*\`
- 필요 시 \`.harness/templates/*\`
- 필요 시 \`.harness/scenarios/*\`

## 출력

- 검증 로그 또는 보완 제안

## 역할 팀 내 위치

- 실행 하네스의 품질 점검 역할
- 생성 이후 최소 품질 보장을 담당

역할 정체성과 handoff 기준은 \`.codex/agents/validator.md\`를 따른다.

## 협업 원칙

- 단순 존재 확인에 그치지 않는다.
- 부족한 설명, 약한 연결, 과한 역할 분리를 적극적으로 지적한다.
- 피드백은 다시 architect / scaffolder / orchestrator가 반영할 수 있게 구체적으로 남긴다.

## 운영 규칙

- 체크리스트만 읽고 끝내지 않는다.
- 구조적 약점이 반복되면 어느 역할에서 문제가 시작됐는지 함께 본다.
- 보완 제안은 실행 가능한 수준으로 남긴다.
- QA와 유사해 보일 때도, validator는 최소 구조 요건과 연결성에 더 집중한다.
- \`.harness/*\` 문서는 특별한 요청이 없으면 한글로 작성한다. 파일명은 기존 영문 이름을 유지한다.
- 역할이 호출되면 \`.harness/logs/session-log.md\`에 지적 사항, 영향 받은 파일, 다음 권장 역할을 남긴다.
"

create_file_if_missing ".codex/skills/run-harness/SKILL.md" \
"---
name: run-harness
description: 프로젝트 로컬 실행 하네스 팀을 실제로 기동하는 진입점입니다. 현재 저장소 상태를 보고 어떤 역할을 먼저 사용해야 할지 판단하고, 분석·설계·QA·오케스트레이션·검증 흐름을 시작하거나 보강할 때 적극적으로 사용합니다.
---

# run-harness

이 스킬은 프로젝트 실행 하네스 팀의 운영 진입점이다.

## 목적

현재 저장소 상태를 보고, 실행 하네스 팀이 어떤 순서로 움직여야 할지 결정하고 시작한다.

## 주요 작업

1. 현재 \`.harness/reports/*\`, \`.codex/skills/*\`, 로그 파일 상태를 읽는다.
2. 요청이 기능 구현, 구조 정리, 공통 모듈 보강, 빌드/검증 보강 중 어디에 가까운지 먼저 분류한다.
3. 변경 영향 범위가 단일 모듈인지, 여러 경계나 공통 계층까지 전파되는지 판단한다.
4. 탐색 근거가 부족하거나 빈 프로젝트에 가까우면 사용자에게 먼저 확인할 질문을 정리한다.
5. domain-analysis가 비어 있거나 약하면 domain-analyst부터 시작한다.
6. 구조 설계나 패키지 경계 판단이 부족하면 harness-architect를 우선한다.
7. QA 기준이 약하면 qa-designer를 다시 호출할 수 있다.
8. 흐름 연결이 약하면 orchestrator를 중심으로 재정리한다.
9. 마지막에 validator 관점으로 최소 구조를 점검한다.

## 입력

- 현재 저장소 상태
- \`.codex/skills/*\`
- \`.harness/reports/*\`

## 출력

- 현재 시점에 필요한 실행 하네스 팀 진행 순서
- 보강이 필요한 역할 제안
- 사용자에게 먼저 확인할 질문 세트

## 출력 계약

- 현재 시작 역할 1개를 먼저 제시한다.
- 보강 필요 역할은 0~2개로 제한해 제안한다.
- 추가 질문이 필요하면 0~2개만 남긴다.
- 판단 근거는 1~3줄로 짧게 설명한다.
- 세션을 시작했다면 session-log 반영 여부를 함께 남긴다.

## 현재 상태별 진입 규칙

- 신규 구축이면 \`harness-init.sh\` 기준으로 기본 팀 구조를 먼저 만든다.
- 기존 확장 또는 운영 유지보수이면 \`harness-update.sh\`를 기본 진입점으로 사용한다.
- 부분 구조만 남아 있거나 문서와 역할 구성이 크게 어긋나면 update로 봉합하지 말고 명시적 재구성을 먼저 제안한다.
- 보고서 한 영역만 약하면 \`harness-update.sh --domain\`, \`--qa\`, \`--architecture\`, \`--orchestration\`, \`--team-structure\`, \`--team-playbook\` 같은 선택 갱신을 우선 고려한다.

## 역할 팀 내 위치

- 실행 하네스 팀의 기동 엔트리포인트
- 팀 전체를 실제로 움직이기 시작하게 만드는 역할

역할 정체성과 handoff 기준은 \`.codex/agents/run-harness.md\`를 따른다.

## 협업 원칙

- 항상 모든 역할을 다 호출하려 하지 않는다.
- 현재 상태에서 가장 약한 지점을 먼저 보강한다.
- orchestrator와 validator를 흐름의 중심 축으로 삼는다.
- 판단 근거가 약하면 역할 호출을 단정하기 전에 사용자 확인 질문부터 짧게 제시한다.

## 운영 규칙

- 새 프로젝트라면 domain-analyst → harness-architect → skill-scaffolder → qa-designer → orchestrator → validator 순서를 기본으로 본다.
- 이미 구조가 있는 프로젝트라면 \`harness-update.sh\`로 현재 상태를 다시 읽고 부족한 역할만 다시 호출하는 쪽을 우선한다.
- 문서, 로그, handoff를 계속 유지해야 하는 중심 역할은 팀 구조로 유지하고, 입력과 출력이 좁은 보조 판단만 일회성 위임으로 다룬다.
- 새 구조를 안정적으로 세울 때는 파이프라인을, 생성 직후 검증을 붙여야 할 때는 생성-검증을, 하위 경계가 독립적일 때만 팬아웃/팬인을, handoff와 재진입이 핵심이면 오케스트레이션 중심 구조를 우선한다.
- 요청이 기능 구현, 구조 정리, 공통 모듈 보강, 빌드/검증 중 어디에 걸리는지 먼저 분류하고 그 결과를 orchestration-plan 판단의 입력으로 사용한다.
- 요청이 추상적이거나 저장소 맥락이 약하면 질문과 탐색 보강을 먼저 두고, 저장소 고유 용어와 영향 범위를 정확히 말하면 더 직접적인 역할 시작을 허용한다.
- 영향 범위가 공통 계층이나 다중 모듈로 번지면 domain-analyst와 qa-designer를 더 이른 순서에 배치한다.
- 빈 저장소이거나 탐색 근거가 부족하면, \`.harness/project-setup.md\`가 있는지 먼저 확인한다.
- \`.harness/project-setup.md\`가 작성되어 있으면 그 내용을 domain-analyst의 시작 입력으로 연결한다.
- 작성되어 있지 않으면 사용자에게 프로젝트 성격, 핵심 사용자, 첫 성공 시나리오를 먼저 확인한 뒤, 파일이 없는 경우 템플릿 내용을 포함하여 \`.harness/project-setup.md\`에 채우도록 안내한다.
- 사용자 답변이 모이면 그 내용을 domain-analysis와 orchestration-plan의 입력으로 바로 연결한다.
- 재구성이 필요한 상태라면 어떤 구조가 비어 있거나 어긋났는지 먼저 설명하고, 기존 하네스 정리 후 \`harness-init.sh\`로 다시 구성하도록 제안한다.
- 리포트보다 실제 역할 팀 구조와 설명 품질을 더 중요하게 본다.
- \`.harness/*\` 문서는 특별한 요청이 없으면 한글로 작성한다. 파일명은 기존 영문 이름을 유지한다.
- 로그 운영 기준은 \`.harness/logging-policy.md\`를 먼저 확인한다.
- 이 역할이 호출되면 \`.harness/logs/session-log.md\`에 새로운 세션 시작 기록을 남긴다.

## 판단 예시

- 요청: "새 API 엔드포인트 추가" → 판단: 기능 구현, 단일 경계 → 시작: domain-analyst → qa-designer → orchestrator
- 요청: "공통 유틸 함수 리팩터" → 판단: 공통 계층 영향, 다중 소비자 → 시작: domain-analyst → qa-designer → orchestrator
- 요청: "하네스 역할 구조 재설계" → 판단: 경계 재정의, 구조 변경 → 시작: harness-architect → qa-designer → orchestrator
- 요청: "QA 문서만 보강" → 판단: 기존 확장, 단일 보고서 보강 → 시작: \`harness-update.sh --qa\` 검토 후 qa-designer
- 요청: "domain-analysis만 오래됐음" → 판단: 기존 확장, 단일 보고서 보강 → 시작: \`harness-update.sh --domain\` 검토 후 domain-analyst
- 요청: 역할 스킬은 있는데 보고서가 대부분 비어 있음 → 판단: 부분 구조 drift → 시작: 명시적 재구성 제안
- 요청: 탐색 근거 부족, project-setup.md 미작성 → 판단: 프로젝트 성격 불명 → 시작: project-setup.md 템플릿 제공 및 작성 안내 후 대기
- 요청: 탐색 근거 부족, project-setup.md 작성됨 → 판단: 목표·성격 확인됨 → 시작: domain-analyst(project-setup.md 입력 연결)
"

create_file_if_missing ".harness/reports/domain-analysis.md" \
"# 도메인 분석

## 저장소 요약

$DOMAIN_SUMMARY_BLOCK

$DOMAIN_DETAIL_BLOCK
"

create_file_if_missing ".harness/reports/harness-architecture.md" \
"# 실행 하네스 아키텍처

$ARCH_REPORT_BLOCK
"

create_file_if_missing ".harness/reports/qa-strategy.md" \
"# QA 전략

$QA_REPORT_BLOCK
"

create_file_if_missing ".harness/reports/orchestration-plan.md" \
"# 실행 하네스 오케스트레이션 계획

$ORCH_REPORT_BLOCK
"

create_file_if_missing ".harness/reports/team-structure.md" \
"# 역할 팀 구조

$TEAM_STRUCTURE_REPORT_BLOCK
"

create_file_if_missing ".harness/reports/team-playbook.md" \
"# 팀 운영 플레이북

$TEAM_PLAYBOOK_REPORT_BLOCK
"

create_file_if_missing ".harness/logging-policy.md" \
"# 로그 정책

## 목적

이 문서는 실행 하네스 팀을 실제로 운용할 때 어떤 로그를 남겨야 하는지 정의합니다.

## 자동화 도구

- 전역 설치된 \`harness-log.sh\`는 역할 호출 시 세션 로그에 자동 append 합니다.
- 전역 설치된 \`harness-session-close.sh\`는 세션 종료 시 최신 세션 요약을 자동 갱신합니다.
- 선택 자산이 활성화된 프로젝트에서는 \`harness-session-close.sh\`가 역할 호출 빈도 통계와 템플릿 후보 분석까지 함께 갱신합니다.
- 선택 자산이 활성화된 프로젝트에서는 \`harness-role-stats.sh\`가 누적 로그를 기준으로 역할 호출 빈도 통계를 다시 계산합니다.
- 선택 자산이 활성화된 프로젝트에서는 \`harness-template-candidates.sh\`가 누적 로그를 분석해 반복 업무 템플릿 후보를 \`.harness/reports/template-candidates.md\`로 정리합니다.

## 로그를 남겨야 하는 상황

- run-harness로 팀을 시작했을 때
- 특정 역할을 직접 호출했을 때
- validator 피드백이 나왔을 때
- QA 질문이 보강되었을 때
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
