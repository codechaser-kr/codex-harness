#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HARNESS_HOME="$(cd "$SCRIPT_DIR/.." && pwd)"
HARNESS_REFERENCE_DIR="$HARNESS_HOME/references"
HARNESS_SCRIPT_DIR="$HARNESS_HOME/scripts"
. "$SCRIPT_DIR/harness-lib.sh"

FAILURES=0
WARNINGS=0

log() {
  printf '[harness][verify] %s\n' "$1"
}

warn() {
  printf '[harness][verify][warn] %s\n' "$1"
  WARNINGS=$((WARNINGS + 1))
}

fail() {
  printf '[harness][verify][error] %s\n' "$1"
  FAILURES=$((FAILURES + 1))
}

check_dir() {
  local dir="$1"
  if [ -d "$dir" ]; then
    log "OK 디렉토리: $dir"
  else
    fail "누락된 디렉토리: $dir"
  fi
}

check_file() {
  local file="$1"
  if [ -f "$file" ]; then
    log "OK 파일: $file"
  else
    fail "누락된 파일: $file"
  fi
}

each_team_spec_role() {
  local team_spec_file=".harness/docs/team-spec.md"

  [ -f "$team_spec_file" ] || return 0

  awk '
    /<!-- team-spec-roles:start -->/ { in_block = 1; next }
    /<!-- team-spec-roles:end -->/ { in_block = 0; exit }
    in_block && NF { print }
  ' "$team_spec_file"
}

is_generic_framework_role() {
  local role_id="$1"

  case "$role_id" in
    domain_analyst|harness_architect|skill_scaffolder|qa_designer|orchestrator|validator|run_harness)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

is_generic_framework_name() {
  local value="$1"

  case "$value" in
    domain-analyst|harness-architect|skill-scaffolder|qa-designer|orchestrator|validator|run-harness)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

check_frontmatter_name() {
  local file="$1"
  if grep -q '^name:' "$file"; then
    log "OK name 필드: $file"
  else
    fail "name 필드 누락: $file"
  fi
}

check_frontmatter_description() {
  local file="$1"
  if grep -q '^description:' "$file"; then
    log "OK description 필드: $file"
  else
    fail "description 필드 누락: $file"
  fi
}

check_description_length() {
  local file="$1"
  local line
  line="$(grep '^description:' "$file" || true)"

  if [ -z "$line" ]; then
    fail "description 검사를 할 수 없음: $file"
    return
  fi

  local content
  content="$(printf '%s\n' "$line" | sed 's/^description:[[:space:]]*//')"

  if [ "${#content}" -lt 20 ]; then
    warn "description이 너무 짧을 수 있음: $file"
  else
    log "OK description 길이: $file"
  fi
}

check_contains_hint() {
  local file="$1"
  local pattern="$2"
  local label="$3"

  if grep -q -- "$pattern" "$file"; then
    log "OK $label: $file"
  else
    warn "$label 힌트 부족: $file"
  fi
}

check_required_contains() {
  local file="$1"
  local pattern="$2"
  local label="$3"

  if grep -q -- "$pattern" "$file"; then
    log "OK $label: $file"
  else
    fail "$label 누락: $file"
  fi
}

count_markdown_bullets_under_h2() {
  local file="$1"
  local heading="$2"

  awk -v heading="$heading" '
    BEGIN {
      in_section = 0
      count = 0
      printed = 0
    }
    $0 ~ ("^##[[:space:]]+" heading "$") {
      in_section = 1
      next
    }
    in_section && $0 ~ "^##[[:space:]]+" {
      print count
      printed = 1
      exit
    }
    in_section && $0 ~ /^- / \
      && $0 !~ /^- 아직 자동으로 포착한/ \
      && $0 !~ /^- 자동으로 포착한 .*보강해야 합니다\./ {
      count++
    }
    END {
      if (in_section && printed == 0) {
        print count
      }
    }
  ' "$file"
}

warn_if_anchor_count_below() {
  local file="$1"
  local heading="$2"
  local min_count="$3"
  local label="$4"
  local count

  count="$(count_markdown_bullets_under_h2 "$file" "$heading" | tr -d '[:space:]')"

  if ! printf '%s' "$count" | grep -qE '^[0-9]+$'; then
    warn "$label 개수를 계산하지 못함: $file"
    return
  fi

  if [ "$count" -lt "$min_count" ]; then
    warn "$label 부족: $file (현재 ${count}개, 권장 ${min_count}개 이상)"
  else
    log "OK $label 개수: $file (${count}개)"
  fi
}

warn_if_contains_literal() {
  local file="$1"
  local literal="$2"
  local label="$3"

  [ -f "$file" ] || return

  if grep -Fq -- "$literal" "$file"; then
    warn "$label: 기본 템플릿 문구가 그대로 남아 있습니다"
  fi
}

warn_if_contains_pattern() {
  local file="$1"
  local pattern="$2"
  local label="$3"

  [ -f "$file" ] || return

  if grep -Eq -- "$pattern" "$file"; then
    warn "$label: 자기설명 회귀 가능성이 있습니다 — 역할 이름이 하네스 구현 설명에 쓰이지 않는지 확인하세요"
  fi
}

fail_if_contains_literal() {
  local file="$1"
  local literal="$2"
  local label="$3"

  [ -f "$file" ] || return

  if grep -Fq -- "$literal" "$file"; then
    fail "$label: 골격 상태가 그대로 남아 있습니다"
  fi
}

fail_if_contains_pattern() {
  local file="$1"
  local pattern="$2"
  local label="$3"

  [ -f "$file" ] || return

  if grep -Eq -- "$pattern" "$file"; then
    fail "$label: 중간 산출물 문구가 그대로 남아 있습니다"
  fi
}

check_session_logging_activity() {
  local events_file=".harness/logs/session-events.tsv"
  local summary_file=".harness/logs/latest-session-summary.md"
  local session_log_file=".harness/logs/session-log.md"
  local current_session_file=".harness/logs/.current-session"
  local current_session_id=""
  local close_hint=""
  local latest_closed_session=""
  local summary_session=""

  if [ -f "$current_session_file" ]; then
    current_session_id="$(trim_text "$(cat "$current_session_file" 2>/dev/null || true)")"
    if [ -n "$current_session_id" ]; then
      close_hint="bash $HARNESS_SCRIPT_DIR/harness-session-close.sh --session-id $current_session_id"
    else
      close_hint="bash $HARNESS_SCRIPT_DIR/harness-session-close.sh"
    fi
    fail "열린 세션이 남아 있습니다: $current_session_file (복구: '$close_hint' 실행, 비정상 종료로 남은 경우 '$current_session_file' 수동 삭제)"
  fi

  if ! awk -F '\t' 'NR > 1 && $2 != "" { found = 1 } END { exit(found ? 0 : 1) }' "$events_file"; then
    fail "실행 세션 이벤트가 없습니다: $events_file"
    return
  fi

  latest_closed_session="$(
    awk -F '\t' '
      NR == 1 { next }
      $3 == "closed" && $2 != "" { session = $2 }
      END { print session }
    ' "$events_file"
  )"

  if [ -z "$latest_closed_session" ]; then
    fail "종료된 세션 이벤트가 없습니다: $events_file"
    return
  fi

  summary_session="$(
    sed -n 's/^- 세션 ID: //p' "$summary_file" | head -n 1 | tr -d '[:space:]'
  )"

  if [ -z "$summary_session" ]; then
    fail "최신 세션 요약에 세션 ID가 없습니다: $summary_file"
    return
  fi

  if [ "$summary_session" != "$latest_closed_session" ]; then
    fail "최신 세션 요약이 마지막 종료 세션과 맞지 않습니다: $summary_file"
  else
    log "OK 최신 세션 요약 동기화: $summary_file"
  fi

  if grep -Fq -- "아직 종료된 세션 집계가 없습니다." "$summary_file"; then
    fail "최신 세션 요약이 아직 placeholder 상태입니다: $summary_file"
  fi

  if grep -Fq -- "세션 ID: $latest_closed_session" "$session_log_file"; then
    log "OK 세션 로그 최신 세션 반영: $session_log_file"
  else
    fail "세션 로그에 마지막 종료 세션이 없습니다: $session_log_file"
  fi
}

has_session_logging_entries() {
  local events_file=".harness/logs/session-events.tsv"

  [ -f "$events_file" ] || return 1

  awk -F '\t' 'NR > 1 && $2 != "" { found = 1; exit 0 } END { exit(found ? 0 : 1) }' "$events_file"
}

check_final_report() {
  local file="$1"
  local label="$2"

  if [ -f "$file" ]; then
    log "OK 파일: $file"
  else
    fail "$label: 역할 재작성 미수행"
  fi
}

check_team_spec_asset_alignment() {
  local parsed=0
  local role_id
  local display_name
  local agent_file
  local model
  local reasoning
  local sandbox
  local description
  local config_section
  local config_line
  local agent_path
  local skill_path

  while IFS='|' read -r role_id display_name agent_file model reasoning sandbox description; do
    [ -n "${role_id:-}" ] || continue
    parsed=1

    if is_generic_framework_role "$role_id"; then
      fail "team-spec 최종 역할 인벤토리에 추상 역할명이 남아 있음: ${role_id}"
    fi

    if is_generic_framework_name "$display_name"; then
      fail "team-spec 최종 역할 인벤토리에 추상 표시 이름이 남아 있음: ${display_name}"
    fi

    if is_generic_framework_name "$agent_file"; then
      fail "team-spec 최종 역할 인벤토리에 추상 agent 파일명이 남아 있음: ${agent_file}"
    fi

    config_section="^\\[agents\\.${role_id}\\]$"
    config_line="config_file = \"agents/${agent_file}.toml\""
    agent_path=".codex/agents/${agent_file}.toml"
    skill_path=".codex/skills/${agent_file}/SKILL.md"

    check_contains_hint ".codex/config.toml" "$config_section" "config team-spec 역할 섹션"
    check_contains_hint ".codex/config.toml" "$config_line" "config team-spec 역할 config_file"
    check_file "$agent_path"
    check_file "$skill_path"
    check_contains_hint "$agent_path" "^name = " "team-spec 역할 agent name 필드"
    check_contains_hint "$agent_path" "^description = " "team-spec 역할 agent description 필드"
    check_contains_hint "$agent_path" "^model = " "team-spec 역할 agent model 필드"
    check_contains_hint "$agent_path" "^sandbox_mode = " "team-spec 역할 agent sandbox_mode 필드"
    check_contains_hint "$agent_path" "^developer_instructions = " "team-spec 역할 agent developer_instructions 필드"
    check_frontmatter_name "$skill_path"
    check_frontmatter_description "$skill_path"
    check_description_length "$skill_path"
  done < <(each_team_spec_role)

  if [ "$parsed" -eq 0 ]; then
    fail "team-spec 최종 역할 인벤토리 미작성"
  else
    log "OK team-spec 역할 인벤토리 정렬 검사"
  fi
}

audit_harness_drift() {
  local mode="$1"
  local skill_count="$2"
  local doc_count="$3"
  local log_count="$4"
  local exploration_context_level="$5"

  if [ "$mode" = "기존 확장" ]; then
    if [ "$skill_count" -gt 0 ] && [ "$doc_count" -eq 0 ]; then
      warn "하네스 불일치 가능성: 역할 스킬은 있으나 문서가 비어 있습니다"
    fi

    if [ "$doc_count" -gt 0 ] && [ "$skill_count" -eq 0 ]; then
      warn "하네스 불일치 가능성: 문서는 있으나 역할 스킬이 비어 있습니다"
    fi

    if [ "$skill_count" -gt 0 ] && [ "$log_count" -eq 0 ]; then
      warn "하네스 불일치 가능성: 역할 스킬은 있으나 로그 구조가 비어 있습니다"
    fi
  fi

}

check_agents_alignment() {
  local mode="$1"
  local status
  local summary

  status="$(detect_agents_alignment_status "$mode")"
  summary="$(build_agents_audit_summary "$mode")"

  while IFS= read -r line; do
    [ -n "$line" ] || continue
    log "상위 컨텍스트 감사: $line"
  done <<< "$summary"

  case "$status" in
    없음|정렬됨)
      ;;
    보강\ 필요)
      warn "AGENTS.md가 현재 하네스 진입점 또는 운영 모드 설명을 충분히 담고 있지 않습니다"
      ;;
    충돌)
      fail "AGENTS.md 운영 기준이 현재 하네스 진입점 또는 운영 모델과 충돌합니다"
      ;;
    재구성\ 필요)
      fail "AGENTS.md 운영 기준 충돌이 커서 정렬보다 재구성이 필요합니다"
      ;;
  esac
}

HARNESS_SKILL_COUNT="$(count_harness_skill_dirs)"
HARNESS_REPORT_COUNT="$(count_harness_report_files)"
HARNESS_LOG_COUNT="$(count_harness_log_files)"
HARNESS_OPERATION_MODE="$(detect_harness_operation_mode)"
EXPLORATION_NOTES_FILE=".harness/docs/exploration-notes.md"
EXPLORATION_CONTEXT_LEVEL="$(detect_exploration_context_level "$EXPLORATION_NOTES_FILE")"
EXPLORATION_ANCHOR_SUMMARY="$(build_exploration_anchor_summary "$EXPLORATION_NOTES_FILE")"

log "실행 하네스 팀 구조 검증 시작"
log "harness 기준 경로: $HARNESS_HOME"
log "입력 상태: $EXPLORATION_CONTEXT_LEVEL"
log "입력 메모 요약: $EXPLORATION_ANCHOR_SUMMARY"
log "하네스 운영 모드: $HARNESS_OPERATION_MODE"
log "하네스 감사: 기존 로컬 역할 스킬 수: $HARNESS_SKILL_COUNT"
log "하네스 감사: 기존 문서 수: $HARNESS_REPORT_COUNT"
log "하네스 감사: 기존 로그 파일 수: $HARNESS_LOG_COUNT"
audit_harness_drift "$HARNESS_OPERATION_MODE" "$HARNESS_SKILL_COUNT" "$HARNESS_REPORT_COUNT" "$HARNESS_LOG_COUNT" "$EXPLORATION_CONTEXT_LEVEL"
check_agents_alignment "$HARNESS_OPERATION_MODE"

# 필수 디렉토리
check_file "AGENTS.md"
check_dir ".codex"
check_file ".codex/config.toml"
check_dir ".codex/agents"
check_dir ".codex/skills"

check_dir ".harness"
check_dir ".harness/docs"
check_dir ".harness/logs"

# harness references 확인
check_dir "$HARNESS_REFERENCE_DIR"
check_file "$HARNESS_REFERENCE_DIR/agent-design-patterns.md"
check_file "$HARNESS_REFERENCE_DIR/exploration-model.md"
check_file "$HARNESS_REFERENCE_DIR/meta-system-maturity-guide.md"
check_file "$HARNESS_REFERENCE_DIR/orchestrator-template.md"
check_file "$HARNESS_REFERENCE_DIR/skill-writing-guide.md"
check_file "$HARNESS_REFERENCE_DIR/skill-testing-guide.md"
check_file "$HARNESS_REFERENCE_DIR/qa-agent-guide.md"
check_file "$HARNESS_REFERENCE_DIR/team-examples.md"
check_file "$HARNESS_REFERENCE_DIR/target-evaluation-playbook.md"

check_contains_hint ".codex/config.toml" "^\\[agents\\]$" "config agents 섹션"
check_contains_hint ".codex/config.toml" "^max_threads = " "config max_threads"
check_contains_hint ".codex/config.toml" "^\\[agents\\.default\\]$" "config default agent"
check_contains_hint ".codex/config.toml" "^config_file = \"agents/" "config agent config_file"

# harness 자동화 스크립트 확인
DIST_SCRIPT_FILES=(
  "$HARNESS_SCRIPT_DIR/harness-lib.sh"
  "$HARNESS_SCRIPT_DIR/harness-init.sh"
  "$HARNESS_SCRIPT_DIR/harness-explore.sh"
  "$HARNESS_SCRIPT_DIR/harness-generate-team-assets.sh"
  "$HARNESS_SCRIPT_DIR/harness-update.sh"
  "$HARNESS_SCRIPT_DIR/harness-verify.sh"
  "$HARNESS_SCRIPT_DIR/harness-log.sh"
  "$HARNESS_SCRIPT_DIR/harness-session-close.sh"
  "$HARNESS_SCRIPT_DIR/harness-role-stats.sh"
  "$HARNESS_SCRIPT_DIR/harness-template-candidates.sh"
)

for file in "${DIST_SCRIPT_FILES[@]}"; do
  check_file "$file"
done

# team-spec 기반 생성 결과 정렬 확인
check_team_spec_asset_alignment

while IFS= read -r file; do
  if [ -f "$file" ]; then
    check_frontmatter_name "$file"
    check_frontmatter_description "$file"
    check_description_length "$file"
    check_required_contains "$file" "## 목적" "목적 섹션"
    check_required_contains "$file" "## 주요 작업" "주요 작업 섹션"
    check_required_contains "$file" "## 입력" "입력 섹션"
    check_required_contains "$file" "## 우선 입력 문서" "우선 입력 문서 섹션"
    check_required_contains "$file" "## 작업 시작 체크리스트" "작업 시작 체크리스트 섹션"
    check_required_contains "$file" "## 주요 판단 기준" "주요 판단 기준 섹션"
    check_required_contains "$file" "## 피해야 할 오해" "피해야 할 오해 섹션"
    check_required_contains "$file" "## 출력" "출력 섹션"
    check_required_contains "$file" "## 출력 규칙" "출력 규칙 섹션"
    check_required_contains "$file" "## 완료 기준" "완료 기준 섹션"
    check_required_contains "$file" "## 검증/리뷰 초점" "검증/리뷰 초점 섹션"
    check_required_contains "$file" "## 역할 팀 내 위치" "역할 팀 위치 섹션"
    check_required_contains "$file" "## 협업 원칙" "협업 원칙 섹션"
    check_required_contains "$file" "## 운영 기준" "운영 기준 섹션"
    fail_if_contains_literal "$file" "이 파일이 얇은 기본 스킬로 시작하더라도" "역할 스킬 구체화 미반영"
  fi
done < <(find ".codex/skills" -mindepth 2 -maxdepth 2 -type f -name 'SKILL.md' | sort)

# 로그 구조
LOG_FILES=(
  ".harness/logs/session-log.md"
  ".harness/logs/session-events.tsv"
  ".harness/logs/latest-session-summary.md"
)

for file in "${LOG_FILES[@]}"; do
  check_file "$file"
done

check_file ".harness/docs/logging-policy.md"
check_file ".harness/docs/exploration-notes.md"
check_file ".harness/docs/team-spec.md"

check_final_report ".harness/docs/domain-analysis.md" "도메인 분석 문서 누락"
check_final_report ".harness/docs/harness-architecture.md" "하네스 아키텍처 문서 누락"
check_final_report ".harness/docs/qa-strategy.md" "QA 전략 문서 누락"
check_final_report ".harness/docs/orchestration-plan.md" "오케스트레이션 계획 문서 누락"
check_final_report ".harness/docs/team-structure.md" "팀 구조 문서 누락"
check_final_report ".harness/docs/team-playbook.md" "팀 플레이북 문서 누락"

if [ -f ".harness/docs/domain-analysis.md" ]; then
  check_contains_hint ".harness/docs/domain-analysis.md" "## 저장소 고유 근거" "도메인 분석 저장소 고유 근거"
  check_contains_hint ".harness/docs/domain-analysis.md" "## 사실 기준 구조" "도메인 분석 사실 기준 구조"
  check_contains_hint ".harness/docs/domain-analysis.md" "## 핵심 실행 흐름" "도메인 분석 핵심 실행 흐름"
  check_contains_hint ".harness/docs/domain-analysis.md" "## 반복적으로 위험한 변경 유형" "도메인 분석 위험 변경 유형"
  check_contains_hint ".harness/docs/domain-analysis.md" "## 남아 있는 질문" "도메인 분석 남은 질문"
  fail_if_contains_pattern ".harness/docs/domain-analysis.md" "후보로 수집되었습니다|자동 수집만으로는|최종 분석은 domain-analyst가 직접 작성합니다\\.|직접 작성합니다\\.|다시 씁니다\\.|추가 읽기가 필요합니다" "도메인 분석 역할 재작성 미수행"
fi

if [ -f ".harness/docs/harness-architecture.md" ]; then
  check_contains_hint ".harness/docs/harness-architecture.md" "## 저장소 고유 근거" "아키텍처 저장소 고유 근거"
  check_contains_hint ".harness/docs/harness-architecture.md" "## 저장소 운영 구조" "아키텍처 저장소 운영 구조"
  check_contains_hint ".harness/docs/harness-architecture.md" "## 실행 모드 선택" "아키텍처 실행 모드 선택"
  check_contains_hint ".harness/docs/harness-architecture.md" "## 아키텍처 패턴 선택" "아키텍처 패턴 선택"
  check_contains_hint ".harness/docs/harness-architecture.md" "## 역할별 개입 기준" "아키텍처 역할 개입 기준"
  check_contains_hint ".harness/docs/harness-architecture.md" "## 경계별 다음 역할 기준" "아키텍처 다음 역할 기준"
  check_contains_hint ".harness/docs/harness-architecture.md" "## 역할 유지와 조정 기준" "아키텍처 역할 유지 기준"
  check_contains_hint ".harness/docs/harness-architecture.md" "## 남아 있는 질문" "아키텍처 남은 질문"
  fail_if_contains_pattern ".harness/docs/harness-architecture.md" "최종 구조 설명은 harness-architect가 직접 작성합니다\\.|직접 작성합니다\\." "아키텍처 역할 재작성 미수행"
  warn_if_contains_pattern ".harness/docs/harness-architecture.md" "skill-scaffolder" "아키텍처 자기설명 회귀"
fi

if [ -f ".harness/docs/qa-strategy.md" ]; then
  check_contains_hint ".harness/docs/qa-strategy.md" "## 저장소 고유 단서" "QA 저장소 고유 단서"
  check_contains_hint ".harness/docs/qa-strategy.md" "## 핵심 품질 축" "QA 핵심 품질 축"
  check_contains_hint ".harness/docs/qa-strategy.md" "## 자동/수동 검증 분리" "QA 자동 수동 검증 분리"
  check_contains_hint ".harness/docs/qa-strategy.md" "## 핵심 질문" "QA 핵심 질문"
  check_contains_hint ".harness/docs/qa-strategy.md" "## 변경 유형별 체크 기준" "QA 변경 유형별 체크 기준"
  check_required_contains ".harness/docs/qa-strategy.md" "자동 검증" "QA 자동 검증 항목"
  check_required_contains ".harness/docs/qa-strategy.md" "수동 검증" "QA 수동 검증 항목"
  check_required_contains ".harness/docs/qa-strategy.md" "미실행 항목" "QA 미실행 항목"
  check_required_contains ".harness/docs/qa-strategy.md" "잔여 위험" "QA 잔여 위험 항목"
  check_required_contains ".harness/docs/qa-strategy.md" "다음 조치" "QA 다음 조치 항목"
  fail_if_contains_pattern ".harness/docs/qa-strategy.md" "최종 QA 전략은 qa-designer가 직접 작성합니다\\.|직접 작성합니다\\." "QA 역할 재작성 미수행"
fi

if [ -f ".harness/docs/orchestration-plan.md" ]; then
  check_contains_hint ".harness/docs/orchestration-plan.md" "## 저장소 고유 근거" "오케스트레이션 저장소 고유 근거"
  check_contains_hint ".harness/docs/orchestration-plan.md" "## 요청 유형별 시작점" "오케스트레이션 요청 유형별 시작점"
  check_contains_hint ".harness/docs/orchestration-plan.md" "## 시작점 선택 이유" "오케스트레이션 시작점 선택 이유"
  check_contains_hint ".harness/docs/orchestration-plan.md" "## 표준 진행 흐름" "오케스트레이션 표준 진행 흐름"
  check_contains_hint ".harness/docs/orchestration-plan.md" "## 재진입 및 다음 역할 기준" "오케스트레이션 재진입 및 다음 역할 기준"
  check_contains_hint ".harness/docs/orchestration-plan.md" "## 남아 있는 질문" "오케스트레이션 남은 질문"
  fail_if_contains_pattern ".harness/docs/orchestration-plan.md" "최종 오케스트레이션 계획은 orchestrator가 직접 작성합니다\\.|직접 작성합니다\\." "오케스트레이션 역할 재작성 미수행"
  warn_if_contains_pattern ".harness/docs/orchestration-plan.md" "skill-scaffolder" "오케스트레이션 자기설명 회귀"
fi

if [ -f ".harness/docs/team-structure.md" ]; then
  check_contains_hint ".harness/docs/team-structure.md" "## 저장소 고유 근거" "팀 구조 저장소 고유 근거"
  check_contains_hint ".harness/docs/team-structure.md" "## 저장소 경계" "팀 구조 저장소 경계"
  check_contains_hint ".harness/docs/team-structure.md" "## 실행 경계와 검증 비용" "팀 구조 실행 경계와 검증 비용"
  check_contains_hint ".harness/docs/team-structure.md" "## 경계별 역할 분담" "팀 구조 경계별 역할 분담"
  check_contains_hint ".harness/docs/team-structure.md" "## 역할 추가/축소 기준" "팀 구조 역할 추가 축소 기준"
  fail_if_contains_pattern ".harness/docs/team-structure.md" "최종 팀 구조는 harness-architect가 직접 작성합니다\\.|직접 작성합니다\\." "팀 구조 역할 재작성 미수행"
  warn_if_contains_pattern ".harness/docs/team-structure.md" "skill-scaffolder" "팀 구조 자기설명 회귀"
fi

if [ -f ".harness/docs/team-playbook.md" ]; then
  check_contains_hint ".harness/docs/team-playbook.md" "## 저장소 고유 근거" "플레이북 저장소 고유 근거"
  check_contains_hint ".harness/docs/team-playbook.md" "## 시작 조건" "플레이북 시작 조건"
  check_contains_hint ".harness/docs/team-playbook.md" "## 작업 유형별 시작 흐름" "플레이북 작업 유형별 시작 흐름"
  check_contains_hint ".harness/docs/team-playbook.md" "## 역할 팀 운영 원칙" "플레이북 역할 팀 운영 원칙"
  check_contains_hint ".harness/docs/team-playbook.md" "## 검증과 종료 조건" "플레이북 검증과 종료 조건"
  fail_if_contains_pattern ".harness/docs/team-playbook.md" "최종 운영 플레이북은 orchestrator가 직접 작성합니다\\.|직접 작성합니다\\." "플레이북 역할 재작성 미수행"
  warn_if_contains_pattern ".harness/docs/team-playbook.md" "skill-scaffolder" "플레이북 자기설명 회귀"
fi

if [ -f ".harness/docs/exploration-notes.md" ]; then
  check_contains_hint ".harness/docs/exploration-notes.md" "## 상태" "입력 상태 섹션"
  check_contains_hint ".harness/docs/exploration-notes.md" "## 현재 입력 상태" "입력 상태 안내 섹션"
  check_contains_hint ".harness/docs/exploration-notes.md" "## 역할 팀 메모" "역할 팀 메모 섹션"
  check_contains_hint ".harness/docs/exploration-notes.md" "## 반영 대상" "반영 대상 섹션"
  check_contains_hint ".harness/docs/exploration-notes.md" "## 판단 종료 조건" "판단 종료 조건 섹션"
  check_contains_hint ".harness/docs/exploration-notes.md" "## 다음 확인 질문" "다음 확인 질문 섹션"
  check_contains_hint ".harness/docs/exploration-notes.md" "역할 팀은 이 문서를 출발점 정도로만 보고" "약한 메모 전제"
fi

if [ -f ".harness/docs/team-spec.md" ]; then
  check_contains_hint ".harness/docs/team-spec.md" "## 팀 메타데이터" "team-spec 메타데이터 섹션"
  check_contains_hint ".harness/docs/team-spec.md" "## 도메인 근거 요약" "team-spec 도메인 근거 섹션"
  check_contains_hint ".harness/docs/team-spec.md" "## 역할명 설계 메모" "team-spec 역할명 설계 메모 섹션"
  check_contains_hint ".harness/docs/team-spec.md" "## 팀 설계 결정" "team-spec 팀 설계 결정 섹션"
  check_contains_hint ".harness/docs/team-spec.md" "## 역할 스펙 초안" "team-spec 역할 스펙 섹션"
  check_contains_hint ".harness/docs/team-spec.md" "## 생성 규칙" "team-spec 생성 규칙 섹션"
  check_contains_hint ".harness/docs/team-spec.md" "## 최종 역할 인벤토리" "team-spec 최종 역할 인벤토리 섹션"
  check_contains_hint ".harness/docs/team-spec.md" "agent 파일명" "team-spec agent 파일명 힌트"
  check_contains_hint ".harness/docs/team-spec.md" "skill 디렉토리명" "team-spec skill 디렉토리명 힌트"
fi

if [ -f ".harness/logs/session-log.md" ]; then
  check_contains_hint ".harness/logs/session-log.md" "세션 ID" "세션 ID 로그"
  check_contains_hint ".harness/logs/session-log.md" "상태" "세션 상태 로그"
  check_contains_hint ".harness/logs/session-log.md" "시작 요청" "시작 요청 로그"
  check_contains_hint ".harness/logs/session-log.md" "진입점" "진입점 로그"
  check_contains_hint ".harness/logs/session-log.md" "계획 역할" "계획 역할 로그"
  check_contains_hint ".harness/logs/session-log.md" "실행 결과 상태" "역할 실행 결과 상태 로그"
  check_contains_hint ".harness/logs/session-log.md" "입력 요약" "입력 요약 로그"
  check_contains_hint ".harness/logs/session-log.md" "출력 요약" "출력 요약 로그"
  check_contains_hint ".harness/logs/session-log.md" "변경 파일" "변경 파일 로그"
  check_contains_hint ".harness/logs/session-log.md" "예상 산출물" "예상 산출물 로그"
  check_contains_hint ".harness/logs/session-log.md" "다음 권장 역할" "다음 권장 역할 로그"
  check_contains_hint ".harness/logs/session-log.md" "남은 위험" "남은 위험 로그"
fi

if [ -f ".harness/docs/logging-policy.md" ]; then
  check_contains_hint ".harness/docs/logging-policy.md" "다음 재진입 phase" "로그 정책 다음 재진입 phase"
  check_contains_hint ".harness/docs/logging-policy.md" "다음 시작 전 우선 확인 입력 파일" "로그 정책 우선 입력 파일"
  check_contains_hint ".harness/docs/logging-policy.md" "최근 출력 파일" "로그 정책 최근 출력 파일"
  check_contains_hint ".harness/docs/logging-policy.md" "timed_out" "로그 정책 timed_out 상태"
  check_contains_hint ".harness/docs/logging-policy.md" "필수 완료 조건" "로그 정책 필수 완료 조건"
fi

check_contains_hint ".harness/logs/session-events.tsv" "session_id" "세션 이벤트 헤더"
check_contains_hint ".harness/logs/session-events.tsv" "status" "이벤트 상태 헤더"
check_contains_hint ".harness/logs/session-events.tsv" "planned_roles" "세션 이벤트 계획 역할 헤더"
check_contains_hint ".harness/logs/session-events.tsv" "result_status" "세션 이벤트 결과 상태 헤더"
check_contains_hint ".harness/logs/session-events.tsv" "input_summary" "세션 이벤트 입력 요약 헤더"
check_contains_hint ".harness/logs/session-events.tsv" "output_summary" "세션 이벤트 출력 요약 헤더"
check_contains_hint ".harness/logs/session-events.tsv" "changed_files" "세션 이벤트 변경 파일 헤더"
check_contains_hint ".harness/logs/session-events.tsv" "expected_outputs" "세션 이벤트 예상 산출물 헤더"
check_contains_hint ".harness/logs/session-events.tsv" "unresolved_risks" "세션 이벤트 남은 위험 헤더"

if [ -f ".harness/logs/latest-session-summary.md" ]; then
  check_contains_hint ".harness/logs/latest-session-summary.md" "세션 요약" "최신 세션 요약"
  check_contains_hint ".harness/logs/latest-session-summary.md" "계획 역할" "최신 세션 요약 계획 역할"
  check_contains_hint ".harness/logs/latest-session-summary.md" "역할 결과 상태" "최신 세션 요약 결과 상태"
  check_contains_hint ".harness/logs/latest-session-summary.md" "다음 시작 역할" "최신 세션 요약 다음 시작 역할"
  check_contains_hint ".harness/logs/latest-session-summary.md" "다음 재진입 phase" "최신 세션 요약 다음 재진입 phase"
  check_contains_hint ".harness/logs/latest-session-summary.md" "다음 시작 전 우선 확인 입력 파일" "최신 세션 요약 우선 입력 파일"
  check_contains_hint ".harness/logs/latest-session-summary.md" "최근 출력 파일" "최신 세션 요약 최근 출력 파일"
  check_contains_hint ".harness/logs/latest-session-summary.md" "최근 변경 파일" "최신 세션 요약 최근 변경 파일"
fi

if has_session_logging_entries; then
  check_session_logging_activity
else
  log "세션 이벤트가 없어 실행 로그 동기화 검사를 건너뜁니다"
fi

if [ -f ".harness/logs/role-frequency.md" ]; then
  check_contains_hint ".harness/logs/role-frequency.md" "역할 호출 빈도" "역할 빈도 보고서"
else
  log "선택 자산 생략: .harness/logs/role-frequency.md"
fi

if [ "$EXPLORATION_CONTEXT_LEVEL" = "제한적" ]; then
  log "사용자 입력은 있으나 최종 판단은 역할 재작성에 의존합니다"
fi

if [ "$FAILURES" -eq 0 ]; then
  if [ "$EXPLORATION_CONTEXT_LEVEL" = "초기" ]; then
    log "검증 통과: 입력 부족 상태에서의 질문 유도 구조가 최소 요건을 만족합니다"
  elif [ "$EXPLORATION_CONTEXT_LEVEL" = "제한적" ]; then
    log "검증 통과: 사용자 입력 기반 저장소 재독해 흐름이 최소 요건을 만족합니다"
  else
    log "검증 통과: 실행 하네스 팀 구조가 최소 요건을 만족합니다"
  fi
  if [ "$WARNINGS" -gt 0 ]; then
    warn "경고 수: $WARNINGS"
  fi
  exit 0
fi

printf '[harness][verify][error] 검증 실패: %s 개 문제 발견\n' "$FAILURES"
if [ "$WARNINGS" -gt 0 ]; then
  warn "경고 수: $WARNINGS"
fi
exit 1
