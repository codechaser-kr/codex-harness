#!/usr/bin/env bash
# harness-update.sh
# 기존 하네스 구조를 감사한 뒤 탐색 근거와 재작성 대상 역할을 다시 정리합니다.
# 사용 시점:
#   - 기존 하네스 구조 확장
#   - 운영 유지보수 중 탐색 근거 재정렬
#   - 명시적 재구성 전, 현재 구조를 다시 쓸 수 있는지 점검
set -euo pipefail

REPORT_DIR=".harness/reports"
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

build_selected_role_summary() {
  local roles=()

  [ "$UPDATE_DOMAIN" -eq 1 ] && roles+=("domain-analyst")
  [ "$UPDATE_ARCHITECTURE" -eq 1 ] && roles+=("harness-architect")
  [ "$UPDATE_QA" -eq 1 ] && roles+=("qa-designer")
  [ "$UPDATE_ORCHESTRATION" -eq 1 ] && roles+=("orchestrator")
  [ "$UPDATE_TEAM_STRUCTURE" -eq 1 ] && roles+=("harness-architect")
  [ "$UPDATE_TEAM_PLAYBOOK" -eq 1 ] && roles+=("orchestrator")

  join_by_comma "${roles[@]}"
}

parse_update_targets "$@"

HARNESS_OPERATION_MODE="$(detect_harness_operation_mode)"
HARNESS_AUDIT_SUMMARY="$(build_harness_audit_summary "$HARNESS_OPERATION_MODE")"
AGENTS_ALIGNMENT_STATUS="$(detect_agents_alignment_status "$HARNESS_OPERATION_MODE")"
AGENTS_AUDIT_SUMMARY="$(build_agents_audit_summary "$HARNESS_OPERATION_MODE")"
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

if [ "$AGENTS_ALIGNMENT_STATUS" = "충돌" ] || [ "$AGENTS_ALIGNMENT_STATUS" = "재구성 필요" ]; then
  log "하네스 운영 모드: $HARNESS_OPERATION_MODE"
  while IFS= read -r agents_line; do
    [ -n "$agents_line" ] || continue
    log "상위 컨텍스트 감사: $agents_line"
  done <<< "$AGENTS_AUDIT_SUMMARY"
  log "AGENTS.md 운영 계약 충돌이 있어 update 대신 정렬 또는 명시적 재구성이 필요합니다."
  exit 1
fi

mkdir -p "$REPORT_DIR"
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
  CORE_FLOW_HINT="$(build_core_flow_summary "$EXPLORATION_ENTRYPOINT_HINT")"
fi
DOMAIN_SUMMARY_BLOCK="$(build_domain_summary_block "$EXPLORATION_CONTEXT_LEVEL" "$PROJECT_TYPE_LABEL" "$BOUNDARY_HINT" "$CORE_FLOW_HINT" "$KEY_AXES_HINT" "$CONFIG_HINT")"
INITIAL_OBSERVATION_LINE="$(build_initial_observation "$EXPLORATION_CONTEXT_LEVEL" "$BOUNDARY_HINT" "$CONFIG_HINT" "$EXPLORATION_DOMAIN_HINT")"
if [ "$EXPLORATION_DOMAIN_HINT" != "추정 불가" ]; then
  INITIAL_OBSERVATION_LINE="- 탐색 문서에서 \`$EXPLORATION_DOMAIN_HINT\` 단서를 수집했습니다."
fi
NEXT_STEP_DETAIL_LINE="$(build_next_step_line "$EXPLORATION_CONTEXT_LEVEL" "update")"
DISCOVERY_GUIDANCE="$(build_exploration_guidance "$EXPLORATION_NOTES_FILE" "$EXPLORATION_CONTEXT_LEVEL" "$BOUNDARY_HINT")"

if exploration_requires_user_bootstrap "$EXPLORATION_NOTES_FILE"; then
  DISCOVERY_GUIDANCE="현재 탐색 근거만으로는 방향을 좁히기 어렵습니다. run-harness는 사용자에게 프로젝트 성격, 핵심 사용자, 첫 성공 시나리오를 확인합니다."
  log "탐색 근거 부족: 사용자 확인 질문부터 정리"
fi

log "하네스 업데이트 시작"
log "하네스 운영 모드: $HARNESS_OPERATION_MODE"
log "탐색 근거 문서: $EXPLORATION_NOTES_FILE"
log "탐색 상태: $EXPLORATION_CONTEXT_LEVEL"
log "탐색 근거 요약: $EXPLORATION_ANCHOR_SUMMARY"
log "선택 갱신 대상: $(build_selected_target_summary)"
log "다시 호출할 역할: $(build_selected_role_summary)"
while IFS= read -r audit_line; do
  [ -n "$audit_line" ] || continue
  log "하네스 감사: $audit_line"
done <<< "$HARNESS_AUDIT_SUMMARY"
while IFS= read -r agents_line; do
  [ -n "$agents_line" ] || continue
  log "상위 컨텍스트 감사: $agents_line"
done <<< "$AGENTS_AUDIT_SUMMARY"

log "하네스 업데이트 완료"
log "exploration-notes만 다시 정리되었습니다."
log "선택된 보고서는 위 역할이 직접 다시 작성해야 합니다."
