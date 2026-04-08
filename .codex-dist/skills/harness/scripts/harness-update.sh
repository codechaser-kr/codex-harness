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

log() {
  printf '[harness][update] %s\n' "$1"
}

PROJECT_TYPE="$(detect_project_type)"
STACK_HINT="$(detect_stack_hint)"
PROJECT_SIGNAL_LEVEL="$(detect_project_signal_level)"
HARNESS_OPERATION_MODE="$(detect_harness_operation_mode)"
HARNESS_AUDIT_SUMMARY="$(build_harness_audit_summary "$HARNESS_OPERATION_MODE")"
EXPLORATION_NOTES_FILE="$REPORT_DIR/exploration-notes.md"
mkdir -p "$REPORT_DIR"
bash "$SCRIPT_DIR/harness-explore.sh" "$EXPLORATION_NOTES_FILE" >/dev/null
STRUCTURE_HINT="$(detect_structure_hint)"
EXPLORATION_ENTRYPOINT_HINT="$(build_exploration_section_summary "$EXPLORATION_NOTES_FILE" "대표 진입점" "추정 불가")"
EXPLORATION_BOUNDARY_HINT="$(build_exploration_section_summary "$EXPLORATION_NOTES_FILE" "주요 코드 경계" "$STRUCTURE_HINT")"
EXPLORATION_TEST_HINT="$(build_exploration_section_summary "$EXPLORATION_NOTES_FILE" "테스트 및 검증 자산" "추정 불가")"
EXPLORATION_CONFIG_HINT="$(build_exploration_section_summary "$EXPLORATION_NOTES_FILE" "설정 및 실행 경로" "추정 불가")"
EXPLORATION_DOMAIN_HINT="$(build_exploration_section_summary "$EXPLORATION_NOTES_FILE" "저장소 고유 용어 단서" "추정 불가")"
PROJECT_TYPE_LABEL="$(build_project_type_label "$PROJECT_SIGNAL_LEVEL" "$PROJECT_TYPE")"
PACKAGE_MANAGER_HINT="$(detect_package_manager)"
WORKSPACE_HINT="$(detect_workspace_packages)"
CONFIG_HINT="$(detect_config_hints)"
if [ "$EXPLORATION_BOUNDARY_HINT" != "추정 불가" ]; then
  STRUCTURE_HINT="$EXPLORATION_BOUNDARY_HINT"
fi
if [ "$EXPLORATION_CONFIG_HINT" != "추정 불가" ]; then
  CONFIG_HINT="$EXPLORATION_CONFIG_HINT"
fi
KEY_AXES_HINT="$(build_key_axes_hint "$PROJECT_SIGNAL_LEVEL" "$STRUCTURE_HINT")"
if [ "$EXPLORATION_TEST_HINT" != "추정 불가" ]; then
  KEY_AXES_HINT="$(join_by_comma "$STRUCTURE_HINT" "$EXPLORATION_TEST_HINT")"
fi
CORE_FLOW_HINT="$(build_core_flow_hint "$PROJECT_SIGNAL_LEVEL" "$PROJECT_TYPE" "$STRUCTURE_HINT")"
if [ "$EXPLORATION_ENTRYPOINT_HINT" != "추정 불가" ]; then
  CORE_FLOW_HINT="\`$EXPLORATION_ENTRYPOINT_HINT\` 기준으로 실제 시작 흐름과 소비 경계를 먼저 정리해야 합니다."
fi
DOMAIN_SUMMARY_BLOCK="$(build_domain_summary_block "$PROJECT_SIGNAL_LEVEL" "$PROJECT_TYPE_LABEL" "$STACK_HINT" "$STRUCTURE_HINT" "$CORE_FLOW_HINT" "$PACKAGE_MANAGER_HINT" "$WORKSPACE_HINT" "$KEY_AXES_HINT")"
INITIAL_OBSERVATION_LINE="$(build_initial_observation "$PROJECT_SIGNAL_LEVEL" "$STRUCTURE_HINT" "$WORKSPACE_HINT" "$CONFIG_HINT")"
if [ "$EXPLORATION_DOMAIN_HINT" != "추정 불가" ]; then
  INITIAL_OBSERVATION_LINE="- 탐색 문서에서 \`$EXPLORATION_DOMAIN_HINT\` 단서를 먼저 수집했습니다."
fi
NEXT_STEP_DETAIL_LINE="$(build_next_step_line "$PROJECT_SIGNAL_LEVEL" "update")"
DISCOVERY_GUIDANCE="$(build_exploration_guidance "$EXPLORATION_NOTES_FILE" "$PROJECT_SIGNAL_LEVEL" "$STRUCTURE_HINT")"

if [ "$PROJECT_TYPE" = "unknown" ] && [ "$STACK_HINT" = "추정 불가" ]; then
  DISCOVERY_GUIDANCE="현재 저장소 단서만으로는 방향 판단이 어렵습니다. run-harness는 사용자에게 프로젝트 유형, 핵심 사용자, 첫 성공 시나리오를 먼저 확인해야 합니다."
  log "저장소 단서 부족: 사용자 확인 질문 우선"
fi

DOMAIN_DETAIL_BLOCK="$(build_domain_report_detail_block "$PROJECT_SIGNAL_LEVEL" "$PROJECT_TYPE" "$STRUCTURE_HINT" "$PACKAGE_MANAGER_HINT" "$WORKSPACE_HINT" "$KEY_AXES_HINT" "$CONFIG_HINT" "$CORE_FLOW_HINT" "$DISCOVERY_GUIDANCE" "$INITIAL_OBSERVATION_LINE" "$NEXT_STEP_DETAIL_LINE")"
ARCH_REPORT_BLOCK="$(build_architecture_report_block "$PROJECT_SIGNAL_LEVEL" "$PROJECT_TYPE_LABEL" "$KEY_AXES_HINT" "$WORKSPACE_HINT" "$CORE_FLOW_HINT")"
QA_REPORT_BLOCK="$(build_qa_report_block "$PROJECT_SIGNAL_LEVEL" "$KEY_AXES_HINT" "$WORKSPACE_HINT")"
ORCH_REPORT_BLOCK="$(build_orchestration_report_block "$PROJECT_SIGNAL_LEVEL" "$KEY_AXES_HINT")"
TEAM_STRUCTURE_REPORT_BLOCK="$(build_team_structure_report_block "$PROJECT_SIGNAL_LEVEL" "$KEY_AXES_HINT")"
TEAM_PLAYBOOK_REPORT_BLOCK="$(build_team_playbook_report_block "$PROJECT_SIGNAL_LEVEL" "$KEY_AXES_HINT")"

log "하네스 업데이트 시작"
log "하네스 운영 모드: $HARNESS_OPERATION_MODE"
log "탐색 근거 문서: $EXPLORATION_NOTES_FILE"
while IFS= read -r audit_line; do
  [ -n "$audit_line" ] || continue
  log "하네스 감사: $audit_line"
done <<< "$HARNESS_AUDIT_SUMMARY"

cat > "$DOMAIN_REPORT" <<EOF_DOMAIN
# 도메인 분석

## 저장소 요약

$DOMAIN_SUMMARY_BLOCK

$DOMAIN_DETAIL_BLOCK
EOF_DOMAIN

cat > "$ARCH_REPORT" <<EOF_ARCH
# 하네스 아키텍처

$ARCH_REPORT_BLOCK
EOF_ARCH

cat > "$QA_REPORT" <<EOF_QA
# QA 전략

$QA_REPORT_BLOCK
EOF_QA

cat > "$ORCH_REPORT" <<EOF_ORCH
# 오케스트레이션 계획

$ORCH_REPORT_BLOCK
EOF_ORCH

cat > "$TEAM_STRUCTURE_REPORT" <<EOF_TEAM_STRUCTURE
# 역할 팀 구조

$TEAM_STRUCTURE_REPORT_BLOCK
EOF_TEAM_STRUCTURE

cat > "$TEAM_PLAYBOOK_REPORT" <<EOF_TEAM_PLAYBOOK
# 팀 운영 플레이북

$TEAM_PLAYBOOK_REPORT_BLOCK
EOF_TEAM_PLAYBOOK

log "하네스 업데이트 완료"
log "갱신됨: $DOMAIN_REPORT"
log "갱신됨: $ARCH_REPORT"
log "갱신됨: $QA_REPORT"
log "갱신됨: $ORCH_REPORT"
log "갱신됨: $TEAM_STRUCTURE_REPORT"
log "갱신됨: $TEAM_PLAYBOOK_REPORT"
