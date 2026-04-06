#!/usr/bin/env bash
set -euo pipefail

LOG_DIR=".harness/logs"
EVENTS_FILE="$LOG_DIR/session-events.tsv"
CURRENT_SESSION_FILE="$LOG_DIR/.current-session"
LATEST_SUMMARY_FILE="$LOG_DIR/latest-session-summary.md"

SELF_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HARNESS_LOG_SCRIPT="$SELF_DIR/harness-log.sh"
ROLE_STATS_SCRIPT="$SELF_DIR/harness-role-stats.sh"

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

trim_text() {
  local value="$1"
  value="${value//$'\t'/ }"
  value="${value//$'\n'/ }"
  value="${value//$'\r'/ }"
  printf '%s' "$value" | sed 's/[[:space:]]\+/ /g; s/^ //; s/ $//'
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

[ -f "$EVENTS_FILE" ] || fail "missing event log: $EVENTS_FILE"

if [ -z "$SESSION_ID" ]; then
  [ -f "$CURRENT_SESSION_FILE" ] || fail "no active session"
  SESSION_ID="$(trim_text "$(cat "$CURRENT_SESSION_FILE")")"
fi

[ -n "$SESSION_ID" ] || fail "session id is empty"

FOUND=0
ALREADY_CLOSED=0
ENTRY_COUNT=0
STARTED_AT=""
ENTRY_POINT=""
START_REQUEST=""
LAST_NEXT_ROLE=""
LAST_WEAKNESSES=""

while IFS= read -r raw_line; do
  IFS=$'\034' read -r timestamp session_id status request entry_point roles inputs outputs next_role weaknesses note <<< "${raw_line//$'\t'/$'\034'}"

  if [ "$timestamp" = "timestamp" ]; then
    continue
  fi

  if [ "$session_id" != "$SESSION_ID" ]; then
    continue
  fi

  FOUND=1

  if [ -z "$STARTED_AT" ]; then
    STARTED_AT="$timestamp"
  fi

  if [ "$status" = "closed" ]; then
    ALREADY_CLOSED=1
    continue
  fi

  ENTRY_COUNT=$((ENTRY_COUNT + 1))

  if [ -z "$START_REQUEST" ] && [ -n "$request" ]; then
    START_REQUEST="$request"
  fi

  if [ -z "$ENTRY_POINT" ] && [ -n "$entry_point" ]; then
    ENTRY_POINT="$entry_point"
  fi

  if [ -n "$next_role" ]; then
    LAST_NEXT_ROLE="$next_role"
  fi

  if [ -n "$weaknesses" ]; then
    LAST_WEAKNESSES="$weaknesses"
  fi

  if [ -n "$roles" ]; then
    IFS=',' read -r -a ROLE_PARTS <<< "$roles"
    for role in "${ROLE_PARTS[@]}"; do
      role="$(trim_text "$role")"
      [ -n "$role" ] || continue
      ROLE_COUNTS["$role"]=$(( ${ROLE_COUNTS["$role"]:-0} + 1 ))
    done
  fi

  if [ -n "$outputs" ]; then
    IFS=',' read -r -a OUTPUT_PARTS <<< "$outputs"
    for output in "${OUTPUT_PARTS[@]}"; do
      output="$(trim_text "$output")"
      [ -n "$output" ] || continue
      OUTPUT_COUNTS["$output"]=$(( ${OUTPUT_COUNTS["$output"]:-0} + 1 ))
    done
  fi
done < "$EVENTS_FILE"

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

{
  printf '# 세션 요약\n\n'
  printf -- '- 세션 ID: %s\n' "$SESSION_ID"
  printf -- '- 시작 시각: %s\n' "${STARTED_AT:--}"
  printf -- '- 종료 시각: %s\n' "$ENDED_AT"
  printf -- '- 기록 수: %s\n' "$ENTRY_COUNT"
  printf -- '- 시작 요청: %s\n' "${START_REQUEST:--}"
  printf -- '- 진입점: %s\n' "${ENTRY_POINT:--}"
  printf -- '- 호출 역할: %s\n' "${ROLE_LIST:--}"
  printf -- '- 마지막 권장 역할: %s\n' "${LAST_NEXT_ROLE:--}"
  printf -- '- 남은 약점: %s\n' "${LAST_WEAKNESSES:--}"
  printf -- '- 메모: %s\n' "$SUMMARY_NOTE"
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

bash "$ROLE_STATS_SCRIPT"

log "session summary updated: $SUMMARY_FILE"
log "latest summary updated: $LATEST_SUMMARY_FILE"
