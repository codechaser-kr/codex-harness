#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$SCRIPT_DIR/harness-lib.sh"

LOG_DIR=".harness/logs"
REPORT_DIR=".harness/reports"
TEMPLATE_DIR=".harness/templates"
EVENTS_FILE="$LOG_DIR/session-events.tsv"
REPORT_FILE="$REPORT_DIR/template-candidates.md"

MIN_COUNT=3
MIN_ROLES=2
WRITE_TEMPLATES=0
DRY_RUN=0

log() {
  printf '[harness][template-candidates] %s\n' "$1"
}

fail() {
  printf '[harness][template-candidates][error] %s\n' "$1" >&2
  exit 1
}

usage() {
  cat <<'EOF'
Usage:
  harness-template-candidates.sh [options]

Options:
  --min-count <n>
  --min-roles <n>
  --write-templates
  --dry-run
  --help
EOF
}

candidate_name() {
  local roles="$1"
  local outputs="$2"

  case "$outputs" in
    *report:domain-analysis*)
      printf '%s' "도메인 분석 작성"
      return
      ;;
    *report:harness-architecture*)
      printf '%s' "하네스 구조 설계"
      return
      ;;
    *report:qa-strategy*)
      printf '%s' "QA 전략 보강"
      return
      ;;
    *report:orchestration-plan*)
      printf '%s' "오케스트레이션 보강"
      return
      ;;
    *skill:*)
      printf '%s' "로컬 스킬 보강"
      return
      ;;
  esac

  case "$roles" in
    *orchestrator*,validator*|*validator*,orchestrator*)
      printf '%s' "구조 보강 후 검증"
      ;;
    *domain-analyst*,harness-architect*|*harness-architect*,domain-analyst*)
      printf '%s' "분석 후 구조 설계"
      ;;
    *)
      printf '%s' "반복 작업 후보"
      ;;
  esac
}

candidate_slug() {
  local idx="$1"
  local roles="$2"
  local outputs="$3"

  case "$outputs" in
    *report:domain-analysis*)
      printf '%s' "domain-analysis-workflow"
      return
      ;;
    *report:harness-architecture*)
      printf '%s' "harness-architecture-workflow"
      return
      ;;
    *report:qa-strategy*)
      printf '%s' "qa-strategy-workflow"
      return
      ;;
    *report:orchestration-plan*)
      printf '%s' "orchestration-workflow"
      return
      ;;
    *skill:*)
      printf '%s' "skill-maintenance-workflow"
      return
      ;;
  esac

  case "$roles" in
    *orchestrator*,validator*|*validator*,orchestrator*)
      printf '%s' "structure-validation-workflow"
      ;;
    *domain-analyst*,harness-architect*|*harness-architect*,domain-analyst*)
      printf '%s' "analysis-architecture-workflow"
      ;;
    *)
      printf 'template-candidate-%s' "$idx"
      ;;
  esac
}

render_report() {
  local rows="$1"

  printf '# 템플릿 후보 분석\n\n'
  printf -- '- 분석 시각: %s\n' "$(date '+%Y-%m-%d %H:%M:%S %z')"
  printf -- '- 최소 반복 횟수: %s\n' "$MIN_COUNT"
  printf -- '- 최소 역할 수: %s\n' "$MIN_ROLES"
  printf '\n'

  if [ -z "$rows" ]; then
    printf '반복 작업 후보가 없습니다.\n'
    return
  fi

  local idx=0
  while IFS=$'\t' read -r count entry roles next_role outputs request; do
    [ -n "$count" ] || continue
    idx=$((idx + 1))

    local title
    local slug
    title="$(candidate_name "$roles" "$outputs")"
    slug="$(candidate_slug "$idx" "$roles" "$outputs")"

    printf '## 후보 %s\n\n' "$idx"
    printf -- '- 후보 이름: %s\n' "$title"
    printf -- '- 반복 횟수: %s\n' "$count"
    printf -- '- 공통 진입점: %s\n' "${entry:--}"
    printf -- '- 공통 역할 흐름: %s\n' "$roles"
    printf -- '- 공통 다음 역할: %s\n' "${next_role:--}"
    printf -- '- 공통 산출물 유형: %s\n' "$outputs"
    printf -- '- 대표 요청: %s\n' "${request:--}"
    printf '\n'
    printf '### 템플릿화 판단\n\n'
    printf -- '- 반복성이 충분함\n'
    printf -- '- 역할 흐름이 안정적으로 반복됨\n'
    printf -- '- 템플릿화 추천: 예\n'
    printf '\n'
    printf '### 제안 파일명\n\n'
    printf -- '- `.harness/templates/%s.md`\n' "$slug"
    printf '\n'
  done <<< "$rows"
}

write_templates() {
  local rows="$1"
  local idx=0

  [ -n "$rows" ] || return
  mkdir -p "$TEMPLATE_DIR"

  while IFS=$'\t' read -r count entry roles next_role outputs request; do
    [ -n "$count" ] || continue
    idx=$((idx + 1))

    local title
    local slug
    local template_file
    local step
    local role
    local output
    title="$(candidate_name "$roles" "$outputs")"
    slug="$(candidate_slug "$idx" "$roles" "$outputs")"
    template_file="$TEMPLATE_DIR/$slug.md"

    if [ -f "$template_file" ]; then
      log "기존 템플릿 유지: $template_file"
      continue
    fi

    {
      printf '# %s\n\n' "$title"
      printf '## 사용 시점\n\n'
      printf -- '- 반복적으로 관찰된 실행 흐름을 재사용하고 싶을 때\n'
      printf '\n'
      printf '## 권장 진입점\n\n'
      printf -- '- %s\n' "${entry:--}"
      printf '\n'
      printf '## 권장 역할 흐름\n\n'
      step=0
      IFS=',' read -r -a role_parts <<< "$roles"
      for role in "${role_parts[@]}"; do
        [ -n "$role" ] || continue
        step=$((step + 1))
        printf '%s. %s\n' "$step" "$role"
      done
      printf '\n'
      printf '## 주요 산출물 유형\n\n'
      IFS=',' read -r -a output_parts <<< "$outputs"
      for output in "${output_parts[@]}"; do
        [ -n "$output" ] || continue
        printf -- '- %s\n' "$output"
      done
      printf '\n'
      printf '## 후속 역할\n\n'
      printf -- '- %s\n' "${next_role:--}"
      printf '\n'
      printf '## 대표 요청 예시\n\n'
      printf -- '- %s\n' "${request:--}"
      printf '\n'
      printf '## 로그 확인\n\n'
      printf -- '- .harness/logs/session-log.md\n'
      printf -- '- .harness/logs/session-events.tsv\n'
      printf -- '- .harness/logs/latest-session-summary.md\n'
    } > "$template_file"

    log "템플릿 초안 생성: $template_file"
  done <<< "$rows"
}

while [ $# -gt 0 ]; do
  case "$1" in
    --min-count)
      [ $# -ge 2 ] || fail "--min-count requires a value"
      MIN_COUNT="$2"
      shift
      ;;
    --min-roles)
      [ $# -ge 2 ] || fail "--min-roles requires a value"
      MIN_ROLES="$2"
      shift
      ;;
    --write-templates)
      WRITE_TEMPLATES=1
      ;;
    --dry-run)
      DRY_RUN=1
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

case "$MIN_COUNT" in
  ''|*[!0-9]*)
    fail "--min-count must be a non-negative integer"
    ;;
esac

case "$MIN_ROLES" in
  ''|*[!0-9]*)
    fail "--min-roles must be a non-negative integer"
    ;;
esac

ensure_harness_log_scaffold
[ -f "$EVENTS_FILE" ] || fail "missing event log: $EVENTS_FILE"
mkdir -p "$REPORT_DIR"

CANDIDATE_ROWS="$(
  awk -F '\t' -v min_count="$MIN_COUNT" -v min_roles="$MIN_ROLES" '
    function trim(value) {
      gsub(/^[[:space:]]+|[[:space:]]+$/, "", value)
      return value
    }

    function normalize_roles(raw,    count, i, item, out) {
      out = ""
      count = split(raw, parts, ",")
      for (i = 1; i <= count; i++) {
        item = trim(parts[i])
        if (item == "") {
          continue
        }
        if (out == "") {
          out = item
        } else {
          out = out "," item
        }
      }
      return out
    }

    function count_roles(raw,    count, i, item, total) {
      total = 0
      count = split(raw, parts, ",")
      for (i = 1; i <= count; i++) {
        item = trim(parts[i])
        if (item == "") {
          continue
        }
        total++
      }
      return total
    }

    function classify_output(path,    value) {
      value = trim(path)
      if (value ~ /^\.harness\/reports\/.*\.md$/) {
        sub(/^\.harness\/reports\//, "", value)
        sub(/\.md$/, "", value)
        return "report:" value
      }
      if (value ~ /^\.codex\/skills\/[^\/]+\/SKILL\.md$/) {
        sub(/^\.codex\/skills\//, "", value)
        sub(/\/SKILL\.md$/, "", value)
        return "skill:" value
      }
      if (value ~ /^\.harness\/logs\/.*$/) {
        sub(/^\.harness\/logs\//, "", value)
        sub(/\.md$/, "", value)
        sub(/\.tsv$/, "", value)
        return "log:" value
      }
      return "other"
    }

    function normalize_outputs(raw,    count, i, item, kind, out) {
      out = ""
      count = split(raw, parts, ",")
      for (i = 1; i <= count; i++) {
        item = trim(parts[i])
        if (item == "") {
          continue
        }
        kind = classify_output(item)
        if (index("," out ",", "," kind ",") > 0) {
          continue
        }
        if (out == "") {
          out = kind
        } else {
          out = out "," kind
        }
      }
      return out
    }

    NR == 1 { next }
    $3 == "closed" { next }
    {
      request = trim($4)
      entry = trim($5)
      roles = normalize_roles($6)
      role_count = count_roles($6)
      outputs = normalize_outputs($8)
      next_role = trim($9)

      if (role_count < min_roles) {
        next
      }

      if (roles == "") {
        next
      }

      if (entry == "") {
        entry = "-"
      }

      if (next_role == "") {
        next_role = "-"
      }

      if (outputs == "") {
        outputs = "-"
      }

      key = entry "|" roles "|" next_role "|" outputs
      counts[key]++
      entry_map[key] = entry
      roles_map[key] = roles
      next_map[key] = next_role
      outputs_map[key] = outputs

      if (!(key in request_map) && request != "") {
        request_map[key] = request
      }
    }
    END {
      for (key in counts) {
        if (counts[key] < min_count) {
          continue
        }
        printf "%s\t%s\t%s\t%s\t%s\t%s\n",
          counts[key],
          entry_map[key],
          roles_map[key],
          next_map[key],
          outputs_map[key],
          request_map[key]
      }
    }
  ' "$EVENTS_FILE" | sort -t $'\t' -k1,1nr -k2,2
)"

if [ "$DRY_RUN" -eq 1 ]; then
  render_report "$CANDIDATE_ROWS"
  log "dry-run 모드이므로 후보 보고서를 stdout으로 출력했습니다"
else
  render_report "$CANDIDATE_ROWS" > "$REPORT_FILE"
  log "후보 보고서 생성: $REPORT_FILE"
fi

if [ "$WRITE_TEMPLATES" -eq 1 ]; then
  if [ "$DRY_RUN" -eq 1 ]; then
    log "dry-run 모드이므로 템플릿 파일은 생성하지 않습니다"
  else
    write_templates "$CANDIDATE_ROWS"
  fi
fi

log "템플릿 후보 분석 완료"
