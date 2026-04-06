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
WEAKNESSES=""
NOTE=""
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
  --role <role>
  --roles <role1,role2>
  --input <path>
  --inputs <path1,path2>
  --output <path>
  --outputs <path1,path2>
  --next-role <role>
  --weaknesses <text>
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
    --next-role)
      [ $# -ge 2 ] || fail "--next-role requires a value"
      NEXT_ROLE="$(trim_text "$2")"
      shift
      ;;
    --weaknesses)
      [ $# -ge 2 ] || fail "--weaknesses requires a value"
      WEAKNESSES="$(trim_text "$2")"
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

TIMESTAMP="$(date '+%Y-%m-%d %H:%M:%S %z')"
ROLES_TEXT="$(join_list ', ' "${ROLES[@]:-}")"
INPUTS_TEXT="$(join_list ', ' "${INPUTS[@]:-}")"
OUTPUTS_TEXT="$(join_list ', ' "${OUTPUTS[@]:-}")"

printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
  "$TIMESTAMP" \
  "$SESSION_ID" \
  "$STATUS" \
  "$REQUEST" \
  "$ENTRY_POINT" \
  "$ROLES_TEXT" \
  "$INPUTS_TEXT" \
  "$OUTPUTS_TEXT" \
  "$NEXT_ROLE" \
  "$WEAKNESSES" \
  "$NOTE" >> "$EVENTS_FILE"

{
  printf '\n### 세션\n\n'
  printf -- '- 시각: %s\n' "$(format_markdown_value "$TIMESTAMP")"
  printf -- '- 세션 ID: %s\n' "$(format_markdown_value "$SESSION_ID")"
  printf -- '- 상태: %s\n' "$(format_markdown_value "$STATUS")"
  printf -- '- 시작 요청: %s\n' "$(format_markdown_value "$REQUEST")"
  printf -- '- 진입점: %s\n' "$(format_markdown_value "$ENTRY_POINT")"
  printf -- '- 호출 역할: %s\n' "$(format_markdown_value "$ROLES_TEXT")"
  printf -- '- 입력 파일: %s\n' "$(format_markdown_value "$INPUTS_TEXT")"
  printf -- '- 출력 파일: %s\n' "$(format_markdown_value "$OUTPUTS_TEXT")"
  printf -- '- 다음 권장 역할: %s\n' "$(format_markdown_value "$NEXT_ROLE")"
  printf -- '- 남은 약점: %s\n' "$(format_markdown_value "$WEAKNESSES")"
  printf -- '- 메모: %s\n' "$(format_markdown_value "$NOTE")"
} >> "$SESSION_LOG"

if [ "$STATUS" = "closed" ] && [ -f "$CURRENT_SESSION_FILE" ] && [ "$(trim_text "$(cat "$CURRENT_SESSION_FILE")")" = "$SESSION_ID" ]; then
  rm -f "$CURRENT_SESSION_FILE"
fi

log "session appended: $SESSION_ID ($STATUS)"
printf '%s\n' "$SESSION_ID"
