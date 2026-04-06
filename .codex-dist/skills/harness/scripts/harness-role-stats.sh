#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$SCRIPT_DIR/harness-lib.sh"

LOG_DIR=".harness/logs"
EVENTS_FILE="$LOG_DIR/session-events.tsv"
ROLE_STATS_FILE="$LOG_DIR/role-frequency.md"

log() {
  printf '[harness][role-stats] %s\n' "$1"
}

fail() {
  printf '[harness][role-stats][error] %s\n' "$1" >&2
  exit 1
}

ensure_harness_log_scaffold

ROLE_ROWS="$(
  awk -F '\t' '
    NR == 1 { next }
    # closed 이벤트는 세션 종료 메모/집계 트리거용 레코드다.
    # 역할 호출 통계는 started/progress 단계의 실제 역할 실행만 집계한다.
    $3 == "closed" { next }
    {
      split($6, roles, ",")
      for (i in roles) {
        gsub(/^[[:space:]]+|[[:space:]]+$/, "", roles[i])
        if (roles[i] != "") {
          counts[roles[i]]++
        }
      }
    }
    END {
      for (role in counts) {
        printf "%s\t%s\n", counts[role], role
      }
    }
  ' "$EVENTS_FILE" | sort -k1,1nr -k2,2
)"

TOTAL_EVENT_COUNT="$(
  awk -F '\t' '
    NR == 1 { next }
    # 종료 이벤트는 역할 호출 건수가 아니라 세션 마감 레코드이므로 제외한다.
    $3 == "closed" { next }
    { count++ }
    END { print count + 0 }
  ' "$EVENTS_FILE"
)"

TOTAL_SESSION_COUNT="$(
  awk -F '\t' '
    NR == 1 { next }
    {
      if (!seen[$2]++) {
        count++
      }
    }
    END { print count + 0 }
  ' "$EVENTS_FILE"
)"

{
  printf '# 역할 호출 빈도\n\n'
  printf -- '- 집계 시각: %s\n' "$(date '+%Y-%m-%d %H:%M:%S %z')"
  printf -- '- 누적 세션 수: %s\n' "$TOTAL_SESSION_COUNT"
  printf -- '- 누적 로그 항목 수: %s\n' "$TOTAL_EVENT_COUNT"
  printf '\n'

  if [ -z "$ROLE_ROWS" ]; then
    printf '아직 집계된 역할 호출 통계가 없습니다.\n'
  else
    printf '| 역할 | 호출 수 |\n'
    printf '| --- | ---: |\n'
    while IFS=$'\t' read -r count role; do
      [ -n "$role" ] || continue
      printf '| %s | %s |\n' "$(trim_text "$role")" "$(trim_text "$count")"
    done <<< "$ROLE_ROWS"
  fi
} > "$ROLE_STATS_FILE"

log "updated: $ROLE_STATS_FILE"
