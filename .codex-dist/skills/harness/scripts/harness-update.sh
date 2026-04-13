#!/usr/bin/env bash
# harness-update.sh
# 기존 하네스 구조를 감사한 뒤 입력 메모, team-spec, 재작성 대상 역할을 다시 정리합니다.
# 사용 시점:
#   - 기존 하네스 구조 확장
#   - 운영 유지보수 중 입력 메모 재정렬
#   - 명시적 재구성 전, 현재 구조를 다시 쓸 수 있는지 점검
set -euo pipefail

DOC_DIR=".harness/docs"
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

build_selected_phase_summary() {
  local phases=()

  [ "$UPDATE_DOMAIN" -eq 1 ] && phases+=("Phase 1 도메인/작업 분석")
  if [ "$UPDATE_ARCHITECTURE" -eq 1 ] || [ "$UPDATE_TEAM_STRUCTURE" -eq 1 ]; then
    phases+=("Phase 2 프로젝트 맞춤 에이전트 팀 설계")
  fi
  [ "$UPDATE_QA" -eq 1 ] && phases+=("Phase 4 QA 및 검증 구조")
  if [ "$UPDATE_ORCHESTRATION" -eq 1 ] || [ "$UPDATE_TEAM_PLAYBOOK" -eq 1 ]; then
    phases+=("Phase 5 역할별 최종 산출물 작성")
  fi

  printf '%s\n' "${phases[@]}" | awk '!seen[$0]++'
}

build_phase7_followup_summary() {
  local selected_phase_summary="$1"

  if [ -z "$selected_phase_summary" ]; then
    printf '%s\n' "Phase 6 검증 후 필요하면 Phase 7 품질 비교와 성숙도 평가로 이어집니다."
    return
  fi

  printf '%s\n' "선택된 재진입 Phase를 마친 뒤에는 Phase 6 검증을 수행하고, 운영 가치가 약하면 Phase 7 품질 비교와 성숙도 평가로 이어집니다."
}

parse_update_targets "$@"

HARNESS_OPERATION_MODE="$(detect_harness_operation_mode)"
HARNESS_AUDIT_SUMMARY="$(build_harness_audit_summary "$HARNESS_OPERATION_MODE")"
AGENTS_ALIGNMENT_STATUS="$(detect_agents_alignment_status "$HARNESS_OPERATION_MODE")"
AGENTS_AUDIT_SUMMARY="$(build_agents_audit_summary "$HARNESS_OPERATION_MODE")"
HARNESS_SKILL_COUNT="$(count_harness_skill_dirs)"
HARNESS_REPORT_COUNT="$(count_harness_report_files)"
HARNESS_LOG_COUNT="$(count_harness_log_files)"
EXPLORATION_NOTES_FILE="$DOC_DIR/exploration-notes.md"

if [ "$HARNESS_OPERATION_MODE" = "신규 구축" ]; then
  log "하네스 운영 모드: $HARNESS_OPERATION_MODE"
  log "기존 구조가 없으므로 update 대신 harness-init.sh를 사용해야 합니다."
  exit 1
fi

if [ "$HARNESS_OPERATION_MODE" = "기존 확장" ] && { [ "$HARNESS_SKILL_COUNT" -eq 0 ] || [ "$HARNESS_REPORT_COUNT" -eq 0 ]; }; then
  if [ -f "$DOC_DIR/team-spec.md" ] && [ -f "$EXPLORATION_NOTES_FILE" ]; then
    log "하네스 운영 모드: $HARNESS_OPERATION_MODE"
    log "Phase 2/3 이전의 설계 규칙 상태로 판단합니다."
    log "team-spec 재정리와 재진입 안내를 계속 진행합니다."
  else
    log "하네스 운영 모드: $HARNESS_OPERATION_MODE"
    log "부분 구조만 남아 있어 update보다 명시적 재구성이 적절합니다."
    log "기존 하네스 구조 정리 후 harness-init.sh로 다시 구성하세요."
    exit 1
  fi
fi

if [ "$AGENTS_ALIGNMENT_STATUS" = "충돌" ] || [ "$AGENTS_ALIGNMENT_STATUS" = "재구성 필요" ]; then
  log "하네스 운영 모드: $HARNESS_OPERATION_MODE"
  while IFS= read -r agents_line; do
    [ -n "$agents_line" ] || continue
    log "상위 컨텍스트 감사: $agents_line"
  done <<< "$AGENTS_AUDIT_SUMMARY"
  log "AGENTS.md 운영 기준 충돌이 있어 update 대신 정렬 또는 명시적 재구성이 필요합니다."
  exit 1
fi

mkdir -p "$DOC_DIR"
bash "$SCRIPT_DIR/harness-explore.sh" "$EXPLORATION_NOTES_FILE" >/dev/null
EXPLORATION_CONTEXT_LEVEL="$(detect_exploration_context_level "$EXPLORATION_NOTES_FILE")"
EXPLORATION_ANCHOR_SUMMARY="$(build_exploration_anchor_summary "$EXPLORATION_NOTES_FILE")"
DISCOVERY_GUIDANCE="$(build_exploration_guidance "$EXPLORATION_NOTES_FILE" "$EXPLORATION_CONTEXT_LEVEL" "")"
SELECTED_PHASE_SUMMARY="$(build_selected_phase_summary)"
PHASE7_FOLLOWUP_SUMMARY="$(build_phase7_followup_summary "$SELECTED_PHASE_SUMMARY")"

if exploration_requires_user_bootstrap "$EXPLORATION_NOTES_FILE"; then
  DISCOVERY_GUIDANCE="현재는 입력 메모만 있으므로, run-harness는 사용자에게 프로젝트 성격, 핵심 사용자, 첫 성공 시나리오를 먼저 확인합니다."
  log "입력 부족: 사용자 확인 질문부터 정리"
fi

log "하네스 업데이트 시작"
log "하네스 운영 모드: $HARNESS_OPERATION_MODE"
log "입력 메모 문서: $EXPLORATION_NOTES_FILE"
log "입력 상태: $EXPLORATION_CONTEXT_LEVEL"
log "입력 메모 요약: $EXPLORATION_ANCHOR_SUMMARY"
log "입력 메모 안내: $DISCOVERY_GUIDANCE"
log "선택 갱신 대상: $(build_selected_target_summary)"
log "다시 호출할 역할: $(build_selected_role_summary)"
log "update 수행 범위: Phase 0 감사와 입력 메모/team-spec 재정리"
while IFS= read -r phase_line; do
  [ -n "$phase_line" ] || continue
  log "권장 재진입: $phase_line"
done <<< "$SELECTED_PHASE_SUMMARY"
log "$PHASE7_FOLLOWUP_SUMMARY"
while IFS= read -r audit_line; do
  [ -n "$audit_line" ] || continue
  log "하네스 감사: $audit_line"
done <<< "$HARNESS_AUDIT_SUMMARY"
while IFS= read -r agents_line; do
  [ -n "$agents_line" ] || continue
  log "상위 컨텍스트 감사: $agents_line"
done <<< "$AGENTS_AUDIT_SUMMARY"

log "하네스 업데이트 완료"
log "루트 기준 AI 입력 메모, team-spec 준비 상태, 재진입 안내만 다시 정리되었습니다."
log "선택된 Phase와 역할이 실제 문서를 직접 다시 작성해야 합니다."
