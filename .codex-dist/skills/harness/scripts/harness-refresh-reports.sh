#!/usr/bin/env bash
# harness-refresh-reports.sh
# `.harness/reports` 문서를 프로젝트 유형 감지 기반으로 덮어써서 생성합니다.
# harness-init.sh와 차이:
#   - harness-init.sh: 디렉토리/스킬/리포트를 최초 1회 생성 (기존 파일 유지)
#   - harness-refresh-reports.sh: `.harness/reports` 문서 전체를 다시 생성 (항상 덮어씀, 스킬은 건드리지 않음)
# 사용 시점: 이미 init된 저장소에서 `.harness/reports` 문서를 초기화하거나 재생성할 때
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
  printf '[harness][refresh] %s\n' "$1"
}

PROJECT_TYPE="$(detect_project_type)"
STACK_HINT="$(detect_stack_hint)"
PROJECT_SIGNAL_LEVEL="$(detect_project_signal_level)"
HARNESS_OPERATION_MODE="$(detect_harness_operation_mode)"
HARNESS_AUDIT_SUMMARY="$(build_harness_audit_summary "$HARNESS_OPERATION_MODE")"
STRUCTURE_HINT="$(detect_structure_hint)"
PROJECT_TYPE_LABEL="$(build_project_type_label "$PROJECT_SIGNAL_LEVEL" "$PROJECT_TYPE")"
PACKAGE_MANAGER_HINT="$(detect_package_manager)"
WORKSPACE_HINT="$(detect_workspace_packages)"
CONFIG_HINT="$(detect_config_hints)"
KEY_AXES_HINT="$(build_key_axes_hint "$PROJECT_SIGNAL_LEVEL" "$STRUCTURE_HINT")"
CORE_FLOW_HINT="$(build_core_flow_hint "$PROJECT_SIGNAL_LEVEL" "$PROJECT_TYPE" "$STRUCTURE_HINT")"
DOMAIN_SUMMARY_BLOCK="$(build_domain_summary_block "$PROJECT_SIGNAL_LEVEL" "$PROJECT_TYPE_LABEL" "$STACK_HINT" "$STRUCTURE_HINT" "$CORE_FLOW_HINT" "$PACKAGE_MANAGER_HINT" "$WORKSPACE_HINT" "$KEY_AXES_HINT")"
INITIAL_OBSERVATION_LINE="$(build_initial_observation "$PROJECT_SIGNAL_LEVEL" "$STRUCTURE_HINT" "$WORKSPACE_HINT" "$CONFIG_HINT")"
NEXT_STEP_DETAIL_LINE="$(build_next_step_line "$PROJECT_SIGNAL_LEVEL" "refresh")"
DISCOVERY_GUIDANCE="저장소 단서와 사용자 응답을 함께 참고해 초기 방향을 정리합니다."

if [ "$PROJECT_TYPE" = "unknown" ] && [ "$STACK_HINT" = "추정 불가" ]; then
  DISCOVERY_GUIDANCE="현재 저장소 단서만으로는 방향 판단이 어렵습니다. run-harness는 사용자에게 프로젝트 유형, 핵심 사용자, 첫 성공 시나리오를 먼저 확인해야 합니다."
  log "저장소 단서 부족: 사용자 확인 질문 우선"
elif [ "$PROJECT_SIGNAL_LEVEL" = "stack" ]; then
  DISCOVERY_GUIDANCE="현재 저장소는 $STRUCTURE_HINT 단서를 바탕으로 자동 재분석을 시작할 수 있습니다."
fi

DOMAIN_DETAIL_BLOCK="$(build_domain_report_detail_block "$PROJECT_SIGNAL_LEVEL" "$PROJECT_TYPE" "$STRUCTURE_HINT" "$PACKAGE_MANAGER_HINT" "$WORKSPACE_HINT" "$KEY_AXES_HINT" "$CONFIG_HINT" "$CORE_FLOW_HINT" "$DISCOVERY_GUIDANCE" "$INITIAL_OBSERVATION_LINE" "$NEXT_STEP_DETAIL_LINE")"
ARCH_REPORT_BLOCK="$(build_architecture_report_block "$PROJECT_SIGNAL_LEVEL" "$PROJECT_TYPE_LABEL" "$KEY_AXES_HINT" "$WORKSPACE_HINT" "$CORE_FLOW_HINT")"
QA_REPORT_BLOCK="$(build_qa_report_block "$PROJECT_SIGNAL_LEVEL" "$KEY_AXES_HINT" "$WORKSPACE_HINT")"
ORCH_REPORT_BLOCK="$(build_orchestration_report_block "$PROJECT_SIGNAL_LEVEL" "$KEY_AXES_HINT")"
TEAM_STRUCTURE_REPORT_BLOCK="$(build_team_structure_report_block "$PROJECT_SIGNAL_LEVEL" "$KEY_AXES_HINT")"
TEAM_PLAYBOOK_REPORT_BLOCK="$(build_team_playbook_report_block "$PROJECT_SIGNAL_LEVEL" "$KEY_AXES_HINT")"

log "하네스 리포트 새로고침 시작"
log "하네스 운영 모드: $HARNESS_OPERATION_MODE"
while IFS= read -r audit_line; do
  [ -n "$audit_line" ] || continue
  log "하네스 감사: $audit_line"
done <<< "$HARNESS_AUDIT_SUMMARY"
mkdir -p "$REPORT_DIR"

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

log "하네스 리포트 새로고침 완료"
log "생성됨: $DOMAIN_REPORT"
log "생성됨: $ARCH_REPORT"
log "생성됨: $QA_REPORT"
log "생성됨: $ORCH_REPORT"
log "생성됨: $TEAM_STRUCTURE_REPORT"
log "생성됨: $TEAM_PLAYBOOK_REPORT"
