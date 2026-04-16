#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$SCRIPT_DIR/harness-lib.sh"

LOG_DIR=".harness/logs"
SESSION_LOG="$LOG_DIR/session-log.md"
EVENTS_FILE="$LOG_DIR/session-events.tsv"
CURRENT_SESSION_FILE="$LOG_DIR/.current-session"

SESSION_ID=""
STATUS=""
REQUEST=""
ENTRY_POINT=""
NEXT_ROLE=""
NOTE=""
PLANNED_ROLES=""
EXPECTED_OUTPUTS=""
RESULT_STATUS=""
INPUT_SUMMARY=""
OUTPUT_SUMMARY=""
CHANGED_FILES=""
UNRESOLVED_RISKS=""
NEW_SESSION=0

declare -a ROLES=()
declare -a INPUTS=()
declare -a OUTPUTS=()

log() {
  printf '[harness][log] %s\n' "$1"
}

warn() {
  printf '[harness][log][warn] %s\n' "$1" >&2
}

fail() {
  printf '[harness][log][error] %s\n' "$1" >&2
  exit 1
}

usage() {
  cat <<'EOF'
Usage:
  harness-log.sh [options]

Options:
  --new-session
  --session-id <id>
  --status <started|progress|closed>
  --request <text>
  --entry-point <role>
  --planned-roles <role1,role2>
  --role <role>
  --roles <role1,role2>
  --result-status <planned|in_progress|completed|timed_out|failed>
  --input-summary <text>
  --input <path>
  --inputs <path1,path2>
  --output-summary <text>
  --output <path>
  --outputs <path1,path2>
  --changed-files <path1,path2>
  --expected-outputs <path1,path2>
  --next-role <role>
  --unresolved-risks <text>
  --note <text>
  --help
EOF
}

append_value() {
  local -n target="$1"
  local cleaned
  cleaned="$(trim_text "$2")"
  if [ -n "$cleaned" ]; then
    target+=("$cleaned")
  fi
}

append_csv_values() {
  local -n target="$1"
  local raw="$2"
  local part
  IFS=',' read -r -a parts <<< "$raw"
  for part in "${parts[@]}"; do
    append_value "$1" "$part"
  done
}

join_list() {
  local separator="$1"
  shift
  local item
  local joined=""

  for item in "$@"; do
    [ -n "$item" ] || continue
    if [ -z "$joined" ]; then
      joined="$item"
    else
      joined="$joined$separator$item"
    fi
  done

  printf '%s' "$joined"
}

normalize_csv_text() {
  local value
  value="$(trim_text "$1")"
  if [ -z "$value" ]; then
    printf '%s' ""
    return
  fi
  printf '%s' "$value" | sed 's/[[:space:]]*,[[:space:]]*/, /g'
}

format_markdown_value() {
  if [ -n "$1" ]; then
    printf '%s' "$1"
  else
    printf '%s' '-'
  fi
}

while [ $# -gt 0 ]; do
  case "$1" in
    --new-session)
      NEW_SESSION=1
      ;;
    --session-id)
      [ $# -ge 2 ] || fail "--session-id requires a value"
      SESSION_ID="$(trim_text "$2")"
      shift
      ;;
    --status)
      [ $# -ge 2 ] || fail "--status requires a value"
      STATUS="$(trim_text "$2")"
      shift
      ;;
    --request)
      [ $# -ge 2 ] || fail "--request requires a value"
      REQUEST="$(trim_text "$2")"
      shift
      ;;
    --entry-point)
      [ $# -ge 2 ] || fail "--entry-point requires a value"
      ENTRY_POINT="$(trim_text "$2")"
      shift
      ;;
    --planned-roles)
      [ $# -ge 2 ] || fail "--planned-roles requires a value"
      PLANNED_ROLES="$(normalize_csv_text "$2")"
      shift
      ;;
    --role)
      [ $# -ge 2 ] || fail "--role requires a value"
      append_value ROLES "$2"
      shift
      ;;
    --roles)
      [ $# -ge 2 ] || fail "--roles requires a value"
      append_csv_values ROLES "$2"
      shift
      ;;
    --result-status)
      [ $# -ge 2 ] || fail "--result-status requires a value"
      RESULT_STATUS="$(trim_text "$2")"
      shift
      ;;
    --input-summary)
      [ $# -ge 2 ] || fail "--input-summary requires a value"
      INPUT_SUMMARY="$(trim_text "$2")"
      shift
      ;;
    --input)
      [ $# -ge 2 ] || fail "--input requires a value"
      append_value INPUTS "$2"
      shift
      ;;
    --inputs)
      [ $# -ge 2 ] || fail "--inputs requires a value"
      append_csv_values INPUTS "$2"
      shift
      ;;
    --output-summary)
      [ $# -ge 2 ] || fail "--output-summary requires a value"
      OUTPUT_SUMMARY="$(trim_text "$2")"
      shift
      ;;
    --output)
      [ $# -ge 2 ] || fail "--output requires a value"
      append_value OUTPUTS "$2"
      shift
      ;;
    --outputs)
      [ $# -ge 2 ] || fail "--outputs requires a value"
      append_csv_values OUTPUTS "$2"
      shift
      ;;
    --changed-files)
      [ $# -ge 2 ] || fail "--changed-files requires a value"
      CHANGED_FILES="$(normalize_csv_text "$2")"
      shift
      ;;
    --expected-outputs)
      [ $# -ge 2 ] || fail "--expected-outputs requires a value"
      EXPECTED_OUTPUTS="$(normalize_csv_text "$2")"
      shift
      ;;
    --next-role)
      [ $# -ge 2 ] || fail "--next-role requires a value"
      NEXT_ROLE="$(trim_text "$2")"
      shift
      ;;
    --unresolved-risks)
      [ $# -ge 2 ] || fail "--unresolved-risks requires a value"
      UNRESOLVED_RISKS="$(trim_text "$2")"
      shift
      ;;
    --note)
      [ $# -ge 2 ] || fail "--note requires a value"
      NOTE="$(trim_text "$2")"
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
  if [ "$NEW_SESSION" -eq 0 ] && [ -f "$CURRENT_SESSION_FILE" ]; then
    SESSION_ID="$(trim_text "$(cat "$CURRENT_SESSION_FILE")")"
  else
    SESSION_ID="$(date '+session-%Y%m%d-%H%M%S')"
    if [ "$NEW_SESSION" -eq 0 ]; then
      warn "current session이 없어 새 세션을 암묵적으로 시작합니다. 필요하면 --new-session을 명시하세요."
    fi
    if [ -z "$STATUS" ]; then
      STATUS="started"
    fi
  fi
fi

if [ -z "$SESSION_ID" ]; then
  fail "failed to resolve session id"
fi

if [ -z "$STATUS" ]; then
  if [ -f "$CURRENT_SESSION_FILE" ] && [ "$(trim_text "$(cat "$CURRENT_SESSION_FILE")")" = "$SESSION_ID" ]; then
    STATUS="progress"
  else
    STATUS="started"
  fi
fi

case "$STATUS" in
  started|progress|closed)
    ;;
  *)
    fail "status must be one of: started, progress, closed"
    ;;
esac

if [ "$STATUS" != "closed" ]; then
  printf '%s\n' "$SESSION_ID" > "$CURRENT_SESSION_FILE"
fi

case "$RESULT_STATUS" in
  ""|planned|in_progress|completed|timed_out|failed)
    ;;
  *)
    fail "result status must be one of: planned, in_progress, completed, timed_out, failed"
    ;;
esac

TIMESTAMP="$(date '+%Y-%m-%d %H:%M:%S %z')"
ROLES_TEXT="$(join_list ', ' "${ROLES[@]:-}")"
INPUTS_TEXT="$(join_list ', ' "${INPUTS[@]:-}")"
OUTPUTS_TEXT="$(join_list ', ' "${OUTPUTS[@]:-}")"

HAS_EXECUTION_SIGNAL=0
if [ "${#ROLES[@]}" -gt 0 ] || [ -n "$INPUT_SUMMARY" ] || [ "${#INPUTS[@]}" -gt 0 ] || [ -n "$OUTPUT_SUMMARY" ] || [ "${#OUTPUTS[@]}" -gt 0 ] || [ -n "$CHANGED_FILES" ] || [ -n "$EXPECTED_OUTPUTS" ] || [ -n "$NEXT_ROLE" ] || [ -n "$UNRESOLVED_RISKS" ]; then
  HAS_EXECUTION_SIGNAL=1
fi

if [ "$STATUS" != "started" ] && [ "$HAS_EXECUTION_SIGNAL" -eq 1 ] && [ -z "$RESULT_STATUS" ]; then
  fail "result status is required for progress/closed events with execution details"
fi

printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
  "$TIMESTAMP" \
  "$SESSION_ID" \
  "$STATUS" \
  "$REQUEST" \
  "$ENTRY_POINT" \
  "$PLANNED_ROLES" \
  "$ROLES_TEXT" \
  "$RESULT_STATUS" \
  "$INPUT_SUMMARY" \
  "$INPUTS_TEXT" \
  "$OUTPUT_SUMMARY" \
  "$OUTPUTS_TEXT" \
  "$CHANGED_FILES" \
  "$EXPECTED_OUTPUTS" \
  "$NEXT_ROLE" \
  "$UNRESOLVED_RISKS" \
  "$NOTE" >> "$EVENTS_FILE"

{
  printf '\n### 세션\n\n'
  printf -- '- 시각: %s\n' "$(format_markdown_value "$TIMESTAMP")"
  printf -- '- 세션 ID: %s\n' "$(format_markdown_value "$SESSION_ID")"
  printf -- '- 상태: %s\n' "$(format_markdown_value "$STATUS")"
  printf -- '- 시작 요청: %s\n' "$(format_markdown_value "$REQUEST")"
  printf -- '- 진입점: %s\n' "$(format_markdown_value "$ENTRY_POINT")"
  printf -- '- 계획 역할: %s\n' "$(format_markdown_value "$PLANNED_ROLES")"
  printf -- '- 호출 역할: %s\n' "$(format_markdown_value "$ROLES_TEXT")"
  printf -- '- 실행 결과 상태: %s\n' "$(format_markdown_value "$RESULT_STATUS")"
  printf -- '- 입력 요약: %s\n' "$(format_markdown_value "$INPUT_SUMMARY")"
  printf -- '- 입력 파일: %s\n' "$(format_markdown_value "$INPUTS_TEXT")"
  printf -- '- 출력 요약: %s\n' "$(format_markdown_value "$OUTPUT_SUMMARY")"
  printf -- '- 출력 파일: %s\n' "$(format_markdown_value "$OUTPUTS_TEXT")"
  printf -- '- 변경 파일: %s\n' "$(format_markdown_value "$CHANGED_FILES")"
  printf -- '- 예상 산출물: %s\n' "$(format_markdown_value "$EXPECTED_OUTPUTS")"
  printf -- '- 다음 권장 역할: %s\n' "$(format_markdown_value "$NEXT_ROLE")"
  printf -- '- 남은 위험: %s\n' "$(format_markdown_value "$UNRESOLVED_RISKS")"
  printf -- '- 메모: %s\n' "$(format_markdown_value "$NOTE")"
} >> "$SESSION_LOG"

if [ "$STATUS" = "closed" ] && [ -f "$CURRENT_SESSION_FILE" ] && [ "$(trim_text "$(cat "$CURRENT_SESSION_FILE")")" = "$SESSION_ID" ]; then
  rm -f "$CURRENT_SESSION_FILE"
fi

log "session appended: $SESSION_ID ($STATUS)"
printf '%s\n' "$SESSION_ID"
