#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$SCRIPT_DIR/harness-lib.sh"

LOG_DIR=".harness/logs"
EVENTS_FILE="$LOG_DIR/session-events.tsv"
CURRENT_SESSION_FILE="$LOG_DIR/.current-session"
LATEST_SUMMARY_FILE="$LOG_DIR/latest-session-summary.md"

HARNESS_LOG_SCRIPT="$SCRIPT_DIR/harness-log.sh"
ROLE_STATS_SCRIPT="$SCRIPT_DIR/harness-role-stats.sh"
TEMPLATE_CANDIDATES_SCRIPT="$SCRIPT_DIR/harness-template-candidates.sh"

SESSION_ID=""
SUMMARY_NOTE="세션 종료 및 자동 집계 완료"

declare -A ROLE_COUNTS=()
declare -A OUTPUT_COUNTS=()

log() {
  printf '[harness][session-close] %s\n' "$1"
}

fail() {
  printf '[harness][session-close][error] %s\n' "$1" >&2
  exit 1
}

usage() {
  cat <<'EOF'
Usage:
  harness-session-close.sh [options]

Options:
  --session-id <id>
  --note <text>
  --help
EOF
}

join_keys() {
  local -n source="$1"
  local key
  local joined=""

  while IFS= read -r key; do
    [ -n "$key" ] || continue
    if [ -z "$joined" ]; then
      joined="$key"
    else
      joined="$joined, $key"
    fi
  done < <(printf '%s\n' "${!source[@]}" | sort)

  printf '%s' "$joined"
}

while [ $# -gt 0 ]; do
  case "$1" in
    --session-id)
      [ $# -ge 2 ] || fail "--session-id requires a value"
      SESSION_ID="$(trim_text "$2")"
      shift
      ;;
    --note)
      [ $# -ge 2 ] || fail "--note requires a value"
      SUMMARY_NOTE="$(trim_text "$2")"
      shift
      ;;
    --help)
      usage
      exit 0
      ;;
    *)
      fail "unknown option: $1"
      ;;
  esac
  shift
done

ensure_harness_log_scaffold

if [ -z "$SESSION_ID" ]; then
  [ -f "$CURRENT_SESSION_FILE" ] || fail "no active session"
  SESSION_ID="$(trim_text "$(cat "$CURRENT_SESSION_FILE")")"
fi

[ -n "$SESSION_ID" ] || fail "session id is empty"

FOUND=0
ALREADY_CLOSED=0
ENTRY_COUNT=0
SCHEMA_ERROR=""
STARTED_AT=""
ENTRY_POINT=""
START_REQUEST=""
PLANNED_ROLES=""
LAST_NEXT_ROLE=""
LAST_RESULT_STATUS=""
LAST_INPUT_SUMMARY=""
LAST_INPUTS=""
LAST_OUTPUT_SUMMARY=""
LAST_OUTPUTS=""
LAST_CHANGED_FILES=""
LAST_EXPECTED_OUTPUTS=""
LAST_UNRESOLVED_RISKS=""
NEXT_PHASE="미정"

declare -A RESULT_COUNTS=()

while IFS=$'\t' read -r kind value1 value2; do
  case "$kind" in
    META)
      case "$value1" in
        found)
          FOUND="$value2"
          ;;
        already_closed)
          ALREADY_CLOSED="$value2"
          ;;
        entry_count)
          ENTRY_COUNT="$value2"
          ;;
        schema_error)
          SCHEMA_ERROR="$value2"
          ;;
        started_at)
          STARTED_AT="$value2"
          ;;
        entry_point)
          ENTRY_POINT="$value2"
          ;;
        start_request)
          START_REQUEST="$value2"
          ;;
        planned_roles)
          PLANNED_ROLES="$value2"
          ;;
        last_next_role)
          LAST_NEXT_ROLE="$value2"
          ;;
        last_result_status)
          LAST_RESULT_STATUS="$value2"
          ;;
        last_input_summary)
          LAST_INPUT_SUMMARY="$value2"
          ;;
        last_inputs)
          LAST_INPUTS="$value2"
          ;;
        last_output_summary)
          LAST_OUTPUT_SUMMARY="$value2"
          ;;
        last_outputs)
          LAST_OUTPUTS="$value2"
          ;;
        last_changed_files)
          LAST_CHANGED_FILES="$value2"
          ;;
        last_expected_outputs)
          LAST_EXPECTED_OUTPUTS="$value2"
          ;;
        last_unresolved_risks)
          LAST_UNRESOLVED_RISKS="$value2"
          ;;
      esac
      ;;
    ROLE)
      ROLE_COUNTS["$value2"]="$value1"
      ;;
    RESULT)
      RESULT_COUNTS["$value2"]="$value1"
      ;;
    OUTPUT)
      OUTPUT_COUNTS["$value1"]=1
      ;;
  esac
done < <(
  awk -F '\t' -v target_session="$SESSION_ID" '
    function col(name) {
      if (name in col_idx) {
        return $(col_idx[name])
      }
      return ""
    }
    NR == 1 {
      for (i = 1; i <= NF; i++) {
        col_idx[$i] = i
      }

      required_count = split("timestamp session_id status request entry_point planned_roles roles result_status input_summary inputs output_summary outputs changed_files expected_outputs next_role unresolved_risks", required, " ")
      for (i = 1; i <= required_count; i++) {
        if (!(required[i] in col_idx)) {
          if (schema_error != "") {
            schema_error = schema_error ", "
          }
          schema_error = schema_error required[i]
        }
      }
      next
    }
    col("session_id") != target_session { next }
    {
      result_status_col = col("result_status")
      found = 1

      if (started_at == "") {
        started_at = col("timestamp")
      }

      if (col("status") == "closed") {
        already_closed = 1
        next
      }

      entry_count++

      if (start_request == "" && col("request") != "") {
        start_request = col("request")
      }

      if (entry_point == "" && col("entry_point") != "") {
        entry_point = col("entry_point")
      }

      if (planned_roles == "" && col("planned_roles") != "") {
        planned_roles = col("planned_roles")
      }

      if (col("next_role") != "") {
        last_next_role = col("next_role")
      }

      if (result_status_col != "") {
        last_result_status = result_status_col
      }

      if (col("input_summary") != "") {
        last_input_summary = col("input_summary")
      }

      if (col("inputs") != "") {
        last_inputs = col("inputs")
      }

      if (col("output_summary") != "") {
        last_output_summary = col("output_summary")
      }

      if (col("outputs") != "") {
        last_outputs = col("outputs")
      }

      if (col("changed_files") != "") {
        last_changed_files = col("changed_files")
      }

      if (col("expected_outputs") != "") {
        last_expected_outputs = col("expected_outputs")
      }

      if (col("unresolved_risks") != "") {
        last_unresolved_risks = col("unresolved_risks")
      }

      if (result_status_col != "") {
        result_counts[result_status_col]++
      }

      split(col("roles"), roles, ",")
      for (i in roles) {
        gsub(/^[[:space:]]+|[[:space:]]+$/, "", roles[i])
        if (roles[i] != "") {
          role_counts[roles[i]]++
        }
      }

      split(col("outputs"), outputs, ",")
      for (i in outputs) {
        gsub(/^[[:space:]]+|[[:space:]]+$/, "", outputs[i])
        if (outputs[i] != "") {
          output_paths[outputs[i]] = 1
        }
      }
    }
    END {
      printf "META\tfound\t%d\n", found + 0
      printf "META\talready_closed\t%d\n", already_closed + 0
      printf "META\tentry_count\t%d\n", entry_count + 0
      printf "META\tschema_error\t%s\n", schema_error
      printf "META\tstarted_at\t%s\n", started_at
      printf "META\tentry_point\t%s\n", entry_point
      printf "META\tstart_request\t%s\n", start_request
      printf "META\tplanned_roles\t%s\n", planned_roles
      printf "META\tlast_next_role\t%s\n", last_next_role
      printf "META\tlast_result_status\t%s\n", last_result_status
      printf "META\tlast_input_summary\t%s\n", last_input_summary
      printf "META\tlast_inputs\t%s\n", last_inputs
      printf "META\tlast_output_summary\t%s\n", last_output_summary
      printf "META\tlast_outputs\t%s\n", last_outputs
      printf "META\tlast_changed_files\t%s\n", last_changed_files
      printf "META\tlast_expected_outputs\t%s\n", last_expected_outputs
      printf "META\tlast_unresolved_risks\t%s\n", last_unresolved_risks

      for (role in role_counts) {
        printf "ROLE\t%d\t%s\n", role_counts[role], role
      }

      for (result in result_counts) {
        printf "RESULT\t%d\t%s\n", result_counts[result], result
      }

      for (output in output_paths) {
        printf "OUTPUT\t%s\n", output
      }
    }
  ' "$EVENTS_FILE"
)

[ -z "$SCHEMA_ERROR" ] || fail "session-events.tsv schema missing columns: $SCHEMA_ERROR"
[ "$FOUND" -eq 1 ] || fail "session not found: $SESSION_ID"
[ "$ALREADY_CLOSED" -eq 0 ] || fail "session already closed: $SESSION_ID"

bash "$HARNESS_LOG_SCRIPT" \
  --session-id "$SESSION_ID" \
  --status closed \
  --note "$SUMMARY_NOTE" \
  >/dev/null

ENDED_AT="$(date '+%Y-%m-%d %H:%M:%S %z')"
SUMMARY_FILE="$LOG_DIR/session-summary-$SESSION_ID.md"
ROLE_LIST="$(join_keys ROLE_COUNTS)"
OUTPUT_LIST="$(join_keys OUTPUT_COUNTS)"
RESULT_LIST="$(join_keys RESULT_COUNTS)"

case "${LAST_NEXT_ROLE:-}" in
  ""|-)
    NEXT_PHASE="미정"
    ;;
  run-harness|*-orchestrator|*-conductor|*router*)
    NEXT_PHASE="Phase 0 또는 Phase 5"
    ;;
  *qa*|*guard*)
    NEXT_PHASE="Phase 4"
    ;;
  *auditor*|*reviewer*)
    NEXT_PHASE="Phase 6"
    ;;
  *)
    NEXT_PHASE="Phase 5"
    ;;
esac

{
  printf '# 세션 요약\n\n'
  printf -- '- 세션 ID: %s\n' "$SESSION_ID"
  printf -- '- 시작 시각: %s\n' "${STARTED_AT:--}"
  printf -- '- 종료 시각: %s\n' "$ENDED_AT"
  printf -- '- 기록 수: %s\n' "$ENTRY_COUNT"
  printf -- '- 시작 요청: %s\n' "${START_REQUEST:--}"
  printf -- '- 진입점: %s\n' "${ENTRY_POINT:--}"
  printf -- '- 계획 역할: %s\n' "${PLANNED_ROLES:--}"
  printf -- '- 호출 역할: %s\n' "${ROLE_LIST:--}"
  printf -- '- 역할 결과 상태: %s\n' "${RESULT_LIST:--}"
  printf -- '- 최근 입력 요약: %s\n' "${LAST_INPUT_SUMMARY:--}"
  printf -- '- 최근 출력 요약: %s\n' "${LAST_OUTPUT_SUMMARY:--}"
  printf -- '- 최근 변경 파일: %s\n' "${LAST_CHANGED_FILES:--}"
  printf -- '- 예상 산출물: %s\n' "${LAST_EXPECTED_OUTPUTS:--}"
  printf -- '- 마지막 권장 역할: %s\n' "${LAST_NEXT_ROLE:--}"
  printf -- '- 다음 재진입 phase: %s\n' "$NEXT_PHASE"
  printf -- '- 남은 위험: %s\n' "${LAST_UNRESOLVED_RISKS:--}"
  printf -- '- 메모: %s\n' "$SUMMARY_NOTE"
  printf '\n'
  printf '## 재진입 요약\n\n'
  printf -- '- 다음 시작 역할: %s\n' "${LAST_NEXT_ROLE:--}"
  printf -- '- 다음 재진입 phase: %s\n' "$NEXT_PHASE"
  printf -- '- 다음 시작 전 우선 확인 입력 파일: %s\n' "${LAST_INPUTS:--}"
  printf -- '- 최근 출력 파일: %s\n' "${LAST_OUTPUTS:--}"
  printf -- '- 최근 변경 파일: %s\n' "${LAST_CHANGED_FILES:--}"
  printf -- '- 남은 위험 또는 미해결 항목: %s\n' "${LAST_UNRESOLVED_RISKS:--}"
  printf -- '- 세션 종료 메모: %s\n' "$SUMMARY_NOTE"
  printf '\n'
  printf '## 역할별 호출 수\n\n'

  if [ "${#ROLE_COUNTS[@]}" -eq 0 ]; then
    printf '기록된 역할 호출이 없습니다.\n'
  else
    printf '| 역할 | 호출 수 |\n'
    printf '| --- | ---: |\n'
    while IFS=$'\t' read -r count role; do
      [ -n "$role" ] || continue
      printf '| %s | %s |\n' "$role" "$count"
    done < <(
      for role in "${!ROLE_COUNTS[@]}"; do
        printf '%s\t%s\n' "${ROLE_COUNTS[$role]}" "$role"
      done | sort -k1,1nr -k2,2
    )
  fi

  printf '\n'
  printf '## 출력 파일\n\n'

  if [ "${#OUTPUT_COUNTS[@]}" -eq 0 ]; then
    printf '기록된 출력 파일이 없습니다.\n'
  else
    while IFS= read -r output; do
      [ -n "$output" ] || continue
      printf -- '- %s\n' "$output"
    done < <(printf '%s\n' "${!OUTPUT_COUNTS[@]}" | sort)
  fi
} > "$SUMMARY_FILE"

cp "$SUMMARY_FILE" "$LATEST_SUMMARY_FILE"

if optional_harness_assets_enabled; then
  bash "$ROLE_STATS_SCRIPT"
  bash "$TEMPLATE_CANDIDATES_SCRIPT"
else
  log "optional assets disabled: skip role stats and template candidates"
fi

log "session summary updated: $SUMMARY_FILE"
log "latest summary updated: $LATEST_SUMMARY_FILE"
if optional_harness_assets_enabled; then
  log "template candidates updated"
fi
