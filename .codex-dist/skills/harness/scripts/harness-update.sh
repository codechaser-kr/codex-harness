#!/usr/bin/env bash
# harness-update.sh
# 기존 하네스 구조를 감사한 뒤 필요한 보조 문서와 탐색 근거를 보강합니다.
# 사용 시점:
#   - 기존 하네스 구조 확장
#   - 운영 유지보수 중 문서/근거 보강
#   - 명시적 재구성 전, 현재 구조 보강 가능성 점검
set -euo pipefail

REPORT_DIR=".harness/reports"
DOMAIN_REPORT="$REPORT_DIR/domain-analysis.md"
ARCH_REPORT="$REPORT_DIR/harness-architecture.md"
QA_REPORT="$REPORT_DIR/qa-strategy.md"
ORCH_REPORT="$REPORT_DIR/orchestration-plan.md"
TEAM_STRUCTURE_REPORT="$REPORT_DIR/team-structure.md"
TEAM_PLAYBOOK_REPORT="$REPORT_DIR/team-playbook.md"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$SCRIPT_DIR/harness-lib.sh"

UPDATE_DOMAIN=0
UPDATE_ARCHITECTURE=0
UPDATE_QA=0
UPDATE_ORCHESTRATION=0
UPDATE_TEAM_STRUCTURE=0
UPDATE_TEAM_PLAYBOOK=0

log() {
  printf '[harness][update] %s\n' "$1"
}

set_update_all() {
  UPDATE_DOMAIN=1
  UPDATE_ARCHITECTURE=1
  UPDATE_QA=1
  UPDATE_ORCHESTRATION=1
  UPDATE_TEAM_STRUCTURE=1
  UPDATE_TEAM_PLAYBOOK=1
}

parse_update_targets() {
  if [ "$#" -eq 0 ]; then
    set_update_all
    return
  fi

  while [ "$#" -gt 0 ]; do
    case "$1" in
      --all)
        set_update_all
        ;;
      --domain)
        UPDATE_DOMAIN=1
        ;;
      --architecture)
        UPDATE_ARCHITECTURE=1
        ;;
      --qa)
        UPDATE_QA=1
        ;;
      --orchestration)
        UPDATE_ORCHESTRATION=1
        ;;
      --team-structure)
        UPDATE_TEAM_STRUCTURE=1
        ;;
      --team-playbook)
        UPDATE_TEAM_PLAYBOOK=1
        ;;
      *)
        printf '[harness][update][error] 알 수 없는 옵션: %s\n' "$1" >&2
        printf '%s\n' '사용법: bash scripts/harness-update.sh [--all] [--domain] [--architecture] [--qa] [--orchestration] [--team-structure] [--team-playbook]' >&2
        exit 1
        ;;
    esac
    shift
  done
}

build_selected_target_summary() {
  local targets=()

  [ "$UPDATE_DOMAIN" -eq 1 ] && targets+=("domain")
  [ "$UPDATE_ARCHITECTURE" -eq 1 ] && targets+=("architecture")
  [ "$UPDATE_QA" -eq 1 ] && targets+=("qa")
  [ "$UPDATE_ORCHESTRATION" -eq 1 ] && targets+=("orchestration")
  [ "$UPDATE_TEAM_STRUCTURE" -eq 1 ] && targets+=("team-structure")
  [ "$UPDATE_TEAM_PLAYBOOK" -eq 1 ] && targets+=("team-playbook")

  join_by_comma "${targets[@]}"
}

parse_update_targets "$@"

HARNESS_OPERATION_MODE="$(detect_harness_operation_mode)"
HARNESS_AUDIT_SUMMARY="$(build_harness_audit_summary "$HARNESS_OPERATION_MODE")"
HARNESS_SKILL_COUNT="$(count_harness_skill_dirs)"
HARNESS_REPORT_COUNT="$(count_harness_report_files)"
HARNESS_LOG_COUNT="$(count_harness_log_files)"
EXPLORATION_NOTES_FILE="$REPORT_DIR/exploration-notes.md"

if [ "$HARNESS_OPERATION_MODE" = "신규 구축" ]; then
  log "하네스 운영 모드: $HARNESS_OPERATION_MODE"
  log "기존 구조가 없으므로 update 대신 harness-init.sh를 사용해야 합니다."
  exit 1
fi

if [ "$HARNESS_OPERATION_MODE" = "기존 확장" ] && { [ "$HARNESS_SKILL_COUNT" -eq 0 ] || [ "$HARNESS_REPORT_COUNT" -eq 0 ]; }; then
  log "하네스 운영 모드: $HARNESS_OPERATION_MODE"
  log "부분 구조만 남아 있어 update보다 명시적 재구성이 적절합니다."
  log "기존 하네스 구조 정리 후 harness-init.sh로 다시 구성하세요."
  exit 1
fi

mkdir -p "$REPORT_DIR"
bash "$SCRIPT_DIR/harness-explore.sh" "$EXPLORATION_NOTES_FILE" >/dev/null
EXPLORATION_CONTEXT_LEVEL="$(detect_exploration_context_level "$EXPLORATION_NOTES_FILE")"
EXPLORATION_ANCHOR_SUMMARY="$(build_exploration_anchor_summary "$EXPLORATION_NOTES_FILE")"
STRUCTURE_HINT="$(detect_structure_hint)"
EXPLORATION_ENTRYPOINT_HINT="$(build_exploration_section_summary "$EXPLORATION_NOTES_FILE" "대표 진입점" "추정 불가")"
EXPLORATION_BOUNDARY_HINT="$(build_exploration_section_summary "$EXPLORATION_NOTES_FILE" "주요 코드 경계" "$STRUCTURE_HINT")"
EXPLORATION_TEST_HINT="$(build_exploration_section_summary "$EXPLORATION_NOTES_FILE" "테스트 및 검증 자산" "추정 불가")"
EXPLORATION_CONFIG_HINT="$(build_exploration_section_summary "$EXPLORATION_NOTES_FILE" "설정 및 실행 경로" "추정 불가")"
EXPLORATION_DOMAIN_HINT="$(build_exploration_section_summary "$EXPLORATION_NOTES_FILE" "저장소 고유 용어 단서" "추정 불가")"
WORKSPACE_HINT="$(detect_workspace_packages)"
PROJECT_TYPE_LABEL="$(build_project_type_label "$EXPLORATION_CONTEXT_LEVEL" "$STRUCTURE_HINT" "$WORKSPACE_HINT")"
PACKAGE_MANAGER_HINT="$(detect_package_manager)"
CONFIG_HINT="$(detect_config_hints)"
if [ "$EXPLORATION_BOUNDARY_HINT" != "추정 불가" ]; then
  STRUCTURE_HINT="$EXPLORATION_BOUNDARY_HINT"
fi
if [ "$EXPLORATION_CONFIG_HINT" != "추정 불가" ]; then
  CONFIG_HINT="$EXPLORATION_CONFIG_HINT"
fi
KEY_AXES_HINT="$(build_key_axes_hint "$EXPLORATION_CONTEXT_LEVEL" "$STRUCTURE_HINT")"
if [ "$EXPLORATION_TEST_HINT" != "추정 불가" ]; then
  KEY_AXES_HINT="$(join_by_comma "$STRUCTURE_HINT" "$EXPLORATION_TEST_HINT")"
fi
CORE_FLOW_HINT="$(build_core_flow_hint "$EXPLORATION_CONTEXT_LEVEL" "$STRUCTURE_HINT")"
if [ "$EXPLORATION_ENTRYPOINT_HINT" != "추정 불가" ]; then
  CORE_FLOW_HINT="\`$EXPLORATION_ENTRYPOINT_HINT\` 기준으로 실제 시작 흐름과 소비 경계를 먼저 정리해야 합니다."
fi
DOMAIN_SUMMARY_BLOCK="$(build_domain_summary_block "$EXPLORATION_CONTEXT_LEVEL" "$PROJECT_TYPE_LABEL" "$STRUCTURE_HINT" "$CORE_FLOW_HINT" "$PACKAGE_MANAGER_HINT" "$WORKSPACE_HINT" "$KEY_AXES_HINT" "$CONFIG_HINT")"
INITIAL_OBSERVATION_LINE="$(build_initial_observation "$EXPLORATION_CONTEXT_LEVEL" "$STRUCTURE_HINT" "$WORKSPACE_HINT" "$CONFIG_HINT")"
if [ "$EXPLORATION_DOMAIN_HINT" != "추정 불가" ]; then
  INITIAL_OBSERVATION_LINE="- 탐색 문서에서 \`$EXPLORATION_DOMAIN_HINT\` 단서를 먼저 수집했습니다."
fi
NEXT_STEP_DETAIL_LINE="$(build_next_step_line "$EXPLORATION_CONTEXT_LEVEL" "update")"
DISCOVERY_GUIDANCE="$(build_exploration_guidance "$EXPLORATION_NOTES_FILE" "$EXPLORATION_CONTEXT_LEVEL" "$STRUCTURE_HINT")"

if exploration_requires_user_bootstrap "$EXPLORATION_NOTES_FILE"; then
  DISCOVERY_GUIDANCE="현재 탐색 근거만으로는 방향 판단이 어렵습니다. run-harness는 사용자에게 프로젝트 성격, 핵심 사용자, 첫 성공 시나리오를 먼저 확인해야 합니다."
  log "탐색 근거 부족: 사용자 확인 질문 우선"
fi

DOMAIN_DETAIL_BLOCK="$(build_domain_report_detail_block "$EXPLORATION_CONTEXT_LEVEL" "$STRUCTURE_HINT" "$PACKAGE_MANAGER_HINT" "$WORKSPACE_HINT" "$KEY_AXES_HINT" "$CONFIG_HINT" "$CORE_FLOW_HINT" "$DISCOVERY_GUIDANCE" "$INITIAL_OBSERVATION_LINE" "$NEXT_STEP_DETAIL_LINE")"
ARCH_REPORT_BLOCK="$(build_architecture_report_block "$EXPLORATION_CONTEXT_LEVEL" "$PROJECT_TYPE_LABEL" "$KEY_AXES_HINT" "$WORKSPACE_HINT" "$CORE_FLOW_HINT")"
QA_REPORT_BLOCK="$(build_qa_report_block "$EXPLORATION_CONTEXT_LEVEL" "$KEY_AXES_HINT" "$WORKSPACE_HINT")"
ORCH_REPORT_BLOCK="$(build_orchestration_report_block "$EXPLORATION_CONTEXT_LEVEL" "$KEY_AXES_HINT")"
TEAM_STRUCTURE_REPORT_BLOCK="$(build_team_structure_report_block "$EXPLORATION_CONTEXT_LEVEL" "$KEY_AXES_HINT")"
TEAM_PLAYBOOK_REPORT_BLOCK="$(build_team_playbook_report_block "$EXPLORATION_CONTEXT_LEVEL" "$KEY_AXES_HINT")"

log "하네스 업데이트 시작"
log "하네스 운영 모드: $HARNESS_OPERATION_MODE"
log "탐색 근거 문서: $EXPLORATION_NOTES_FILE"
log "탐색 근거 요약: $EXPLORATION_ANCHOR_SUMMARY"
log "선택 갱신 대상: $(build_selected_target_summary)"
while IFS= read -r audit_line; do
  [ -n "$audit_line" ] || continue
  log "하네스 감사: $audit_line"
done <<< "$HARNESS_AUDIT_SUMMARY"

if [ "$UPDATE_DOMAIN" -eq 1 ]; then
  cat > "$DOMAIN_REPORT" <<EOF_DOMAIN
# 도메인 분석

## 저장소 요약

$DOMAIN_SUMMARY_BLOCK

$DOMAIN_DETAIL_BLOCK
EOF_DOMAIN
  log "갱신됨: $DOMAIN_REPORT"
fi

if [ "$UPDATE_ARCHITECTURE" -eq 1 ]; then
  cat > "$ARCH_REPORT" <<EOF_ARCH
# 하네스 아키텍처

$ARCH_REPORT_BLOCK
EOF_ARCH
  log "갱신됨: $ARCH_REPORT"
fi

if [ "$UPDATE_QA" -eq 1 ]; then
  cat > "$QA_REPORT" <<EOF_QA
# QA 전략

$QA_REPORT_BLOCK
EOF_QA
  log "갱신됨: $QA_REPORT"
fi

if [ "$UPDATE_ORCHESTRATION" -eq 1 ]; then
  cat > "$ORCH_REPORT" <<EOF_ORCH
# 오케스트레이션 계획

$ORCH_REPORT_BLOCK
EOF_ORCH
  log "갱신됨: $ORCH_REPORT"
fi

if [ "$UPDATE_TEAM_STRUCTURE" -eq 1 ]; then
  cat > "$TEAM_STRUCTURE_REPORT" <<EOF_TEAM_STRUCTURE
# 역할 팀 구조

$TEAM_STRUCTURE_REPORT_BLOCK
EOF_TEAM_STRUCTURE
  log "갱신됨: $TEAM_STRUCTURE_REPORT"
fi

if [ "$UPDATE_TEAM_PLAYBOOK" -eq 1 ]; then
  cat > "$TEAM_PLAYBOOK_REPORT" <<EOF_TEAM_PLAYBOOK
# 팀 운영 플레이북

$TEAM_PLAYBOOK_REPORT_BLOCK
EOF_TEAM_PLAYBOOK
  log "갱신됨: $TEAM_PLAYBOOK_REPORT"
fi

log "하네스 업데이트 완료"
