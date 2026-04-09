#!/usr/bin/env bash
# 이 파일은 소싱 전용입니다. 직접 실행하지 마세요.

EXPLORATION_NOTES_DEFAULT_PATH=".harness/reports/exploration-notes.md"

trim_text() {
  local value="$1"
  value="${value//$'\t'/ }"
  value="${value//$'\n'/ }"
  value="${value//$'\r'/ }"
  printf '%s' "$value" | sed 's/[[:space:]]\+/ /g; s/^ //; s/ $//'
}

join_by_comma() {
  local delimiter=", "
  local result=""
  local item

  for item in "$@"; do
    if [ -z "$result" ]; then
      result="$item"
    else
      result="$result$delimiter$item"
    fi
  done

  printf '%s\n' "$result"
}

detect_harness_operation_mode() {
  local has_skills=0
  local has_reports=0
  local has_logs=0

  if [ -d ".codex/skills" ] && find ".codex/skills" -mindepth 1 -maxdepth 1 -type d -print -quit | grep -q .; then
    has_skills=1
  fi

  if [ -d ".harness/reports" ] && find ".harness/reports" -mindepth 1 -maxdepth 1 -type f -name '*.md' -print -quit | grep -q .; then
    has_reports=1
  fi

  if [ -d ".harness/logs" ] && find ".harness/logs" -mindepth 1 -maxdepth 1 -type f -print -quit | grep -q .; then
    has_logs=1
  fi

  if [ "$has_skills" -eq 0 ] && [ "$has_reports" -eq 0 ] && [ "$has_logs" -eq 0 ]; then
    printf '%s\n' "신규 구축"
    return
  fi

  if [ "$has_skills" -eq 1 ] && [ "$has_reports" -eq 1 ] && [ "$has_logs" -eq 1 ]; then
    printf '%s\n' "운영 유지보수"
    return
  fi

  printf '%s\n' "기존 확장"
}

has_agents_contract() {
  [ -f "AGENTS.md" ]
}

agents_mentions_current_harness() {
  [ -f "AGENTS.md" ] || return 1
  grep -Eq 'run-harness|harness-init\.sh|harness-update\.sh|harness-verify\.sh|\.codex/skills|\.harness/' "AGENTS.md"
}

agents_mentions_operation_modes() {
  [ -f "AGENTS.md" ] || return 1
  grep -Eq '신규 구축|기존 확장|운영 유지보수|재구성' "AGENTS.md"
}

agents_conflict_markers() {
  [ -f "AGENTS.md" ] || return 0

  grep -Eo 'CLAUDE\.md|\.claude/agents|\.claude/skills|harness-refresh-reports\.sh|refresh-reports' "AGENTS.md" \
    | awk '!seen[$0]++'
}

build_agents_conflict_summary() {
  local markers

  markers="$(agents_conflict_markers || true)"
  if [ -n "$markers" ]; then
    printf '%s\n' "$markers" | paste -sd ', ' -
  else
    printf '%s\n' "없음"
  fi
}

detect_agents_alignment_status() {
  local mode="${1:-$(detect_harness_operation_mode)}"

  if ! has_agents_contract; then
    printf '%s\n' "없음"
    return
  fi

  local has_current_markers=0
  local has_mode_markers=0
  local has_conflict_markers=0

  agents_mentions_current_harness && has_current_markers=1
  agents_mentions_operation_modes && has_mode_markers=1
  [ "$(build_agents_conflict_summary)" != "없음" ] && has_conflict_markers=1

  if [ "$has_conflict_markers" -eq 1 ] && [ "$mode" = "운영 유지보수" ] && [ "$has_current_markers" -eq 0 ]; then
    printf '%s\n' "재구성 필요"
    return
  fi

  if [ "$has_conflict_markers" -eq 1 ]; then
    printf '%s\n' "충돌"
    return
  fi

  if [ "$has_current_markers" -eq 1 ] && [ "$has_mode_markers" -eq 1 ]; then
    printf '%s\n' "정렬됨"
    return
  fi

  printf '%s\n' "보강 필요"
}

build_agents_audit_summary() {
  local mode="${1:-$(detect_harness_operation_mode)}"
  local status
  local current_harness_marker="아니오"
  local mode_marker="아니오"
  local conflict_summary

  status="$(detect_agents_alignment_status "$mode")"
  conflict_summary="$(build_agents_conflict_summary)"
  agents_mentions_current_harness && current_harness_marker="예"
  agents_mentions_operation_modes && mode_marker="예"

  printf '%s\n' "AGENTS.md 상태: $status"

  if [ "$status" = "없음" ]; then
    return
  fi

  printf '%s\n' "AGENTS.md 현재 하네스 진입점 언급: $current_harness_marker"
  printf '%s\n' "AGENTS.md 운영 모드 언급: $mode_marker"
  printf '%s\n' "AGENTS.md 충돌 단서: $conflict_summary"
}

build_harness_audit_summary() {
  local mode="$1"
  local skill_count=0
  local report_count=0
  local log_count=0

  [ -d ".codex/skills" ] && skill_count="$(find ".codex/skills" -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d '[:space:]')"
  [ -d ".harness/reports" ] && report_count="$(find ".harness/reports" -mindepth 1 -maxdepth 1 -type f -name '*.md' | wc -l | tr -d '[:space:]')"
  [ -d ".harness/logs" ] && log_count="$(find ".harness/logs" -mindepth 1 -maxdepth 1 -type f | wc -l | tr -d '[:space:]')"

  printf '%s\n' "모드: $mode"
  printf '%s\n' "기존 로컬 역할 스킬 수: $skill_count"
  printf '%s\n' "기존 보고서 수: $report_count"
  printf '%s\n' "기존 로그 파일 수: $log_count"
}

optional_harness_assets_enabled() {
  local exploration_file="${1:-$EXPLORATION_NOTES_DEFAULT_PATH}"
  local entrypoint_count=0
  local boundary_count=0
  local test_count=0

  if [ -d ".harness/templates" ] \
    || [ -d ".harness/scenarios" ] \
    || [ -f ".harness/logs/role-frequency.md" ] \
    || [ -f ".harness/reports/template-candidates.md" ]; then
    return 0
  fi

  [ -f "$exploration_file" ] || return 1

  entrypoint_count="$(count_markdown_bullets_under_heading "$exploration_file" "대표 진입점" | tr -d '[:space:]')"
  boundary_count="$(count_markdown_bullets_under_heading "$exploration_file" "주요 코드 경계" | tr -d '[:space:]')"
  test_count="$(count_markdown_bullets_under_heading "$exploration_file" "테스트 및 검증 자산" | tr -d '[:space:]')"

  [ "${entrypoint_count:-0}" -gt 0 ] && [ "${boundary_count:-0}" -gt 0 ] && return 0
  [ "${boundary_count:-0}" -gt 0 ] && [ "${test_count:-0}" -gt 0 ] && return 0
  return 1
}

find_exploration_paths() {
  find . \
    \( -path './.git' -o -path './.codex' -o -path './.harness' -o -path './.claude' -o -path './.cursor' -o -path './.agents' -o -name node_modules -o -path './.yarn' -o -name dist -o -name build -o -name coverage \) -prune \
    -o \
    "$@"
}

list_source_group_boundary_roots() {
  find_exploration_paths \
    -type f \
    \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.jsx' -o -name '*.rs' -o -name '*.py' -o -name '*.go' -o -name '*.java' -o -name '*.kt' -o -name '*.swift' -o -name '*.php' -o -name '*.rb' -o -name '*.cpp' -o -name '*.c' -o -name '*.h' -o -name '*.hpp' \) \
    -print | sed 's#^\./##' | awk -F/ '
      NF >= 3 {
        print $1 "/" $2
        next
      }
      NF == 2 {
        print $1
        next
      }
      NF == 1 { print $1 }
    ' | awk '!seen[$0]++'
}

list_source_anchor_paths() {
  find_exploration_paths \
    -type f \
    \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.jsx' -o -name '*.rs' -o -name '*.py' -o -name '*.go' -o -name '*.java' -o -name '*.kt' -o -name '*.swift' -o -name '*.php' -o -name '*.rb' -o -name '*.cpp' -o -name '*.c' -o -name '*.h' -o -name '*.hpp' \) \
    -print | sed 's#^\./##' | head -n 5
}

list_entrypoint_anchor_paths() {
  local root
  local printed=0

  while IFS= read -r root; do
    [ -n "$root" ] || continue

    find "./$root" \
      \( -path "./$root/node_modules" -o -name dist -o -name build -o -name coverage \) -prune \
      -o -type f \
      \( -name 'main.ts' -o -name 'main.tsx' -o -name 'main.js' -o -name 'main.jsx' -o -name 'main.rs' -o \
         -name 'index.ts' -o -name 'index.tsx' -o -name 'index.js' -o -name 'index.jsx' -o \
         -name 'app.ts' -o -name 'app.tsx' -o -name 'app.js' -o -name 'app.jsx' -o \
         -name 'server.ts' -o -name 'server.tsx' -o -name 'server.js' -o -name 'server.jsx' -o \
         -name 'cli.ts' -o -name 'cli.tsx' -o -name 'cli.js' -o -name 'cli.jsx' -o \
         -name 'lib.ts' -o -name 'lib.tsx' -o -name 'lib.js' -o -name 'lib.jsx' -o \
         -name 'mod.rs' \) \
      -print | sed 's#^\./##' | head -n 1
  done < <(list_source_group_boundary_roots) | awk '!seen[$0]++' | head -n 5
}

list_code_boundary_paths() {
  list_source_group_boundary_roots | head -n 5
}

list_test_asset_paths() {
  find_exploration_paths \
    \( -type d \( -name 'test' -o -name 'tests' -o -name '__tests__' \) -print \
    -o -type f \( -name '*test*' -o -name '*spec*' \) -print \) | sed 's#^\./##' | head -n 5
}

list_config_asset_paths() {
  find_exploration_paths -maxdepth 3 \
    -type f \
    \( -name 'package.json' -o -name 'Cargo.toml' -o -name 'pyproject.toml' -o -name 'requirements.txt' -o -name 'go.mod' -o -name 'pom.xml' -o -name 'build.gradle' -o -name 'build.gradle.kts' -o -name 'settings.gradle' -o -name 'settings.gradle.kts' -o -name 'composer.json' -o -name 'Gemfile' -o -name 'Makefile' -o -name 'CMakeLists.txt' -o -name 'Dockerfile' -o -name '*.yml' -o -name '*.yaml' \) \
    -print | sed 's#^\./##' | awk '
      {
        n = split($0, parts, "/")
        base = parts[n]
        if (base ~ /^\./) {
          next
        }
        print
      }
    ' | head -n 8
}

list_domain_context_paths() {
  find_exploration_paths -maxdepth 4 \
    -type f \
    \( -name 'README.md' -o -name '*.md' -o -name '*.mdx' -o -name '*.txt' \) \
    ! -name 'AGENTS.md' \
    ! -name 'CLAUDE.md' \
    -print | sed 's#^\./##' | awk '
      /(^|\/)README\.md$/ { print; next }
      /^docs\/.*\.(md|mdx|txt)$/ { print; next }
      /^references\/.*\.(md|mdx|txt)$/ { print; next }
    ' | awk '!seen[$0]++' | head -n 8
}

print_markdown_bullets_or_fallback() {
  local producer="$1"
  local fallback="$2"
  local printed=0
  local item

  while IFS= read -r item; do
    [ -n "$item" ] || continue
    printf '%s\n' "- \`$item\`"
    printed=1
  done < <("$producer")

  if [ "$printed" -eq 0 ]; then
    printf '%s\n' "- $fallback"
  fi
}

count_markdown_bullets_under_heading() {
  local file="$1"
  local heading="$2"

  [ -f "$file" ] || {
    printf '0\n'
    return
  }

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

exploration_requires_user_bootstrap() {
  local file="${1:-$EXPLORATION_NOTES_DEFAULT_PATH}"
  local entrypoint_count=0
  local boundary_count=0

  [ -f "$file" ] || return 0

  entrypoint_count="$(count_markdown_bullets_under_heading "$file" "대표 진입점" | tr -d '[:space:]')"
  boundary_count="$(count_markdown_bullets_under_heading "$file" "주요 코드 경계" | tr -d '[:space:]')"

  [ "${entrypoint_count:-0}" -eq 0 ] && [ "${boundary_count:-0}" -eq 0 ]
}

detect_exploration_context_level() {
  local file="${1:-$EXPLORATION_NOTES_DEFAULT_PATH}"
  local entrypoint_count=0
  local boundary_count=0

  [ -f "$file" ] || {
    printf '%s\n' "초기"
    return
  }

  entrypoint_count="$(count_markdown_bullets_under_heading "$file" "대표 진입점" | tr -d '[:space:]')"
  boundary_count="$(count_markdown_bullets_under_heading "$file" "주요 코드 경계" | tr -d '[:space:]')"

  if [ "${entrypoint_count:-0}" -eq 0 ] && [ "${boundary_count:-0}" -eq 0 ]; then
    printf '%s\n' "초기"
    return
  fi

  if [ "${entrypoint_count:-0}" -eq 0 ] || [ "${boundary_count:-0}" -eq 0 ]; then
    printf '%s\n' "제한적"
    return
  fi

  if [ "${entrypoint_count:-0}" -lt 2 ] || [ "${boundary_count:-0}" -lt 2 ]; then
    printf '%s\n' "제한적"
    return
  fi

  printf '%s\n' "충분"
}

build_exploration_anchor_summary() {
  local file="${1:-$EXPLORATION_NOTES_DEFAULT_PATH}"
  local entrypoint_count=0
  local boundary_count=0
  local test_count=0
  local config_count=0
  local domain_count=0

  if [ -f "$file" ]; then
    entrypoint_count="$(count_markdown_bullets_under_heading "$file" "대표 진입점" | tr -d '[:space:]')"
    boundary_count="$(count_markdown_bullets_under_heading "$file" "주요 코드 경계" | tr -d '[:space:]')"
    test_count="$(count_markdown_bullets_under_heading "$file" "테스트 및 검증 자산" | tr -d '[:space:]')"
    config_count="$(count_markdown_bullets_under_heading "$file" "설정 및 실행 경로" | tr -d '[:space:]')"
    domain_count="$(count_markdown_bullets_under_heading "$file" "저장소 고유 용어 단서" | tr -d '[:space:]')"
  fi

  printf '대표 진입점 %s개, 주요 코드 경계 %s개, 테스트 자산 %s개, 설정 경로 %s개, 도메인 단서 %s개\n' \
    "${entrypoint_count:-0}" "${boundary_count:-0}" "${test_count:-0}" "${config_count:-0}" "${domain_count:-0}"
}

count_harness_skill_dirs() {
  [ -d ".codex/skills" ] || {
    printf '0\n'
    return
  }

  find ".codex/skills" -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d '[:space:]'
}

count_harness_report_files() {
  [ -d ".harness/reports" ] || {
    printf '0\n'
    return
  }

  find ".harness/reports" -mindepth 1 -maxdepth 1 -type f -name '*.md' | wc -l | tr -d '[:space:]'
}

count_harness_log_files() {
  [ -d ".harness/logs" ] || {
    printf '0\n'
    return
  }

  find ".harness/logs" -mindepth 1 -maxdepth 1 -type f | wc -l | tr -d '[:space:]'
}

list_markdown_bullets_under_heading() {
  local file="$1"
  local heading="$2"

  [ -f "$file" ] || return

  awk -v heading="$heading" '
    BEGIN {
      in_section = 0
    }
    $0 ~ ("^##[[:space:]]+" heading "$") {
      in_section = 1
      next
    }
    in_section && $0 ~ "^##[[:space:]]+" {
      exit
    }
    in_section && $0 ~ /^- / {
      sub(/^- /, "", $0)
      gsub(/`/, "", $0)
      print $0
    }
  ' "$file"
}

build_exploration_section_summary() {
  local file="$1"
  local heading="$2"
  local fallback="$3"
  local limit="${4:-3}"
  local items=()
  local item

  while IFS= read -r item; do
    [ -n "$item" ] || continue
    items+=("$item")
    [ "${#items[@]}" -ge "$limit" ] && break
  done < <(list_markdown_bullets_under_heading "$file" "$heading")

  if [ "${#items[@]}" -eq 0 ]; then
    printf '%s\n' "$fallback"
    return
  fi

  join_by_comma "${items[@]}"
}

build_exploration_guidance() {
  local file="$1"
  local exploration_context_level="$2"
  local boundary_hint="$3"

  if [ ! -f "$file" ]; then
    if [ "$exploration_context_level" = "초기" ] || [ "$exploration_context_level" = "제한적" ]; then
      printf '%s\n' "탐색 근거와 사용자 응답을 함께 참고한 초기 방향 메모가 놓입니다."
    else
      printf '%s\n' "현재 저장소는 실제 코드 경계와 대표 흐름을 다시 읽는 관련 문서 메모로 이어집니다."
    fi
    return
  fi

  if [ "$exploration_context_level" = "초기" ] || [ "$exploration_context_level" = "제한적" ]; then
    printf '%s\n' "탐색 문서에 수집된 단서를 바탕으로, 부족한 부분은 사용자 질문 메모로 이어집니다."
    return
  fi

  printf '%s\n' "현재 저장소는 탐색 문서의 대표 진입점과 코드 경계($boundary_hint)를 바탕으로 관련 문서 메모가 이어집니다."
}

build_project_type_label() {
  local exploration_context_level="$1"
  local boundary_hint="$2"

  case "$exploration_context_level" in
    초기)
      echo "미정"
      return
      ;;
    제한적)
      echo "탐색 근거가 제한적인 프로젝트"
      return
      ;;
  esac

  echo "탐색 근거가 수집된 저장소"
}

build_key_axes_hint() {
  local exploration_context_level="$1"
  local boundary_hint="$2"
  local test_hint="${3:-추정 불가}"
  local config_hint="${4:-추정 불가}"
  local axes=()

  if [ "$exploration_context_level" = "초기" ]; then
    echo "미정"
    return
  fi

  if [ "$exploration_context_level" = "제한적" ]; then
    echo "$boundary_hint"
    return
  fi

  [ "$boundary_hint" = "추정 불가" ] || axes+=("$boundary_hint")
  [ "$config_hint" = "추정 불가" ] || axes+=("$config_hint")

  if [ "${#axes[@]}" -eq 0 ]; then
    echo "$boundary_hint"
    return
  fi

  join_by_comma "${axes[@]}"
}

build_core_flow_summary() {
  local entrypoint_hint="${1:-추정 불가}"

  if [ -z "$entrypoint_hint" ] || [ "$entrypoint_hint" = "추정 불가" ]; then
    printf '%s\n' "대표 진입점 후보가 아직 충분하지 않습니다."
    return
  fi

  printf '%s\n' "\`$entrypoint_hint\` 부근이 시작 흐름 후보로 수집되었습니다."
}

build_core_flow_hint() {
  case "$1" in
    초기)
      echo "미정"
      ;;
    제한적)
      echo "README, 핵심 디렉토리, 사용자 질문이 함께 놓여야 시작 흐름 메모가 또렷해집니다."
      ;;
    *)
      echo "$2 주변이 시작 흐름과 영향 전파를 다시 읽을 후보로 수집되었습니다."
      ;;
  esac
}

build_initial_observation() {
  local exploration_context_level="$1"
  local boundary_hint="$2"
  local config_hint="${3:-}"
  local domain_hint="${4:-}"

  case "$exploration_context_level" in
    초기)
      echo "- 저장소를 분석한 뒤 이 내용을 실제 결과 문장으로 다시 써주세요."
      ;;
    제한적)
      echo "- 현재 탐색 근거가 제한적이므로 대표 경계와 사용자 응답을 함께 모아 초기 분석을 다시 써주세요."
      ;;
    *)
      if [ "$domain_hint" != "추정 불가" ]; then
        echo "- $boundary_hint, $config_hint, $domain_hint 단서를 함께 읽었습니다."
      else
        echo "- $boundary_hint, $config_hint 단서를 함께 읽었습니다."
      fi
      ;;
  esac
}

print_boundary_interpretation_lines() {
  local boundary_hint="$1"
  local item
  local trimmed_item

  [ -n "$boundary_hint" ] || return
  [ "$boundary_hint" = "추정 불가" ] && return

  while IFS= read -r item; do
    trimmed_item="$(trim_text "$item")"
    [ -n "$trimmed_item" ] || continue
    printf '%s\n' "- \`$trimmed_item\`: 독립 책임과 영향 전파가 나타나는 핵심 경계입니다."
  done < <(printf '%s\n' "$boundary_hint" | tr ',' '\n')
}

build_domain_report_detail_block() {
  local exploration_context_level="$1"
  local boundary_hint="$2"
  local key_axes_hint="$3"
  local config_hint="$4"
  local core_flow_hint="$5"
  local discovery_guidance="$6"
  local initial_observation_line="$7"
  local next_step_detail_line="$8"
  local source_anchor
  local source_anchor_count=0

  case "$exploration_context_level" in
    초기|제한적)
      cat <<EOF
## 요약

- 탐색 상태: $exploration_context_level
- 대표 시작점 후보: $core_flow_hint
- 관련 코드 경로 후보: $key_axes_hint
- 설정 및 실행 단서: $config_hint
- 참고 메모: $discovery_guidance

## 초기 관찰 내용

$initial_observation_line

## 저장소 고유 근거
EOF
      while IFS= read -r source_anchor; do
        [ -n "$source_anchor" ] || continue
        printf '%s\n' "- \`$source_anchor\`"
        source_anchor_count=$((source_anchor_count + 1))
      done < <(list_source_anchor_paths)

      if [ "$source_anchor_count" -eq 0 ]; then
        printf '%s\n' "- 자동으로 포착한 대표 소스 앵커가 아직 충분하지 않습니다."
      fi

      cat <<EOF

### 사실 기준 구조
EOF
      if [ "$boundary_hint" != "추정 불가" ]; then
        while IFS= read -r item; do
          item="$(trim_text "$item")"
          [ -n "$item" ] || continue
          printf '%s\n' "- \`$item\`"
        done < <(printf '%s\n' "$boundary_hint" | tr ',' '\n')
      else
        printf '%s\n' "- 주요 코드 경계 후보가 아직 충분하지 않습니다."
      fi

      cat <<EOF

### 예외 및 운영 메모

- 예외 메모가 아직 충분하지 않습니다.
- 설치, 빌드, 검증 차이는 실제 저장소 읽기 이후 다시 적습니다.

### 핵심 실행 흐름

- $core_flow_hint

### 반복적으로 위험한 변경 유형

- 진입점 설정 파일과 빌드 설정 변경
- 공용 모듈, 공개 인터페이스, 소비 경로 변경

## 남아 있는 질문

- 이 저장소의 실제 사용자 또는 운영 흐름은 어디서 시작되는가.
- 어떤 경계가 가장 큰 실패 비용을 만드는가.

## 이어서 볼 항목

$next_step_detail_line
- 필요하면 디렉토리별 역할과 핵심 파일 메모가 더해집니다.
EOF
      ;;
    *)
      cat <<EOF
## 요약
EOF
      printf '%s\n' "- 탐색 상태: $exploration_context_level"
      printf '%s\n' "- 대표 시작점 후보: $core_flow_hint"
      printf '%s\n' "- 관련 코드 경로 후보: $key_axes_hint"
      printf '%s\n' "- 설정 및 실행 단서: $config_hint"

      cat <<EOF

## 저장소 고유 근거
EOF
      while IFS= read -r source_anchor; do
        [ -n "$source_anchor" ] || continue
        printf '%s\n' "- \`$source_anchor\`"
        source_anchor_count=$((source_anchor_count + 1))
      done < <(list_source_anchor_paths)

      if [ "$source_anchor_count" -eq 0 ]; then
        printf '%s\n' "- 아직 자동으로 포착한 대표 소스 앵커가 충분하지 않습니다. 실제 프로젝트에서는 최소 3개 이상의 파일/경로 근거를 직접 골라야 합니다."
      elif [ "$source_anchor_count" -lt 3 ]; then
        printf '%s\n' "- 자동으로 포착한 소스 앵커가 3개 미만입니다. 실제 프로젝트에서는 대표 파일/경로 근거를 더 골라야 합니다."
      fi

      cat <<EOF

### 사실 기준 구조
EOF
      if [ "$boundary_hint" != "추정 불가" ]; then
        while IFS= read -r item; do
          item="$(trim_text "$item")"
          [ -n "$item" ] || continue
          printf '%s\n' "- \`$item\`"
        done < <(printf '%s\n' "$boundary_hint" | tr ',' '\n')
      else
        printf '%s\n' "- 주요 코드 경계 후보가 아직 충분하지 않습니다."
      fi
      [ "$config_hint" = "추정 불가" ] || printf '%s\n' "- \`$config_hint\`"

      cat <<EOF

### 예외 및 운영 메모
EOF
      printf '%s\n' "- 설치, 빌드, 검증 경로 차이는 실제 저장소 읽기 이후 다시 적습니다."
      printf '%s\n' "- 운영 로그와 탐색 문서 사이 차이가 있으면 그 차이만 남깁니다."

      cat <<EOF

### 핵심 실행 흐름
EOF
      printf '%s\n' "- $core_flow_hint"
      [ "$config_hint" = "추정 불가" ] || printf '%s\n' "- \`$config_hint\`"

      cat <<EOF

### 반복적으로 위험한 변경 유형
EOF
      printf '%s\n' "- 진입점 설정 파일과 빌드 설정 변경"
      [ "$boundary_hint" = "추정 불가" ] || printf '%s\n' "- 여러 경계에 걸친 공개 경로 또는 소비 관계 변경"
      printf '%s\n' "- 공용 모듈, 공개 인터페이스, 소비 경로 변경"
      printf '%s\n' "- 테스트 또는 검증 도구, 픽스처, 기준 문서 변경"

      cat <<EOF

### 초기 관찰 내용

$initial_observation_line

## 남아 있는 질문
EOF
      printf '%s\n' "- 자동 수집만으로는 핵심 사용자 흐름과 실패 비용을 완전히 확정할 수 없습니다."
      printf '%s\n' "- 대표 진입점 파일과 영향도가 큰 변경 경계는 추가 읽기가 필요합니다."
      printf '%s\n' "- 이 저장소에서 하네스가 실제로 개입해야 하는 핵심 불확실성은 무엇인가."
      printf '%s\n' "- 어떤 실패 시나리오가 가장 비용이 크고, 현재 구조로 그것을 감지할 수 있는가."

      cat <<EOF

## 이어서 볼 항목

$next_step_detail_line
- qa-designer와 orchestrator 메모는 위 구조와 흐름을 기준으로 이어집니다.
- 필요하면 대표 디렉토리와 핵심 파일 단위로 분석 해상도를 올립니다.
EOF
      ;;
  esac
}

build_architecture_report_block() {
  local exploration_context_level="$1"
  local project_type_label="$2"
  local key_axes_hint="$3"
  local core_flow_hint="$4"

  cat <<EOF
## 요약

- 최종 구조 설명은 harness-architect가 직접 작성합니다.
- 탐색 상태 요약: $project_type_label
- 관련 코드 경로 후보: $key_axes_hint
- 대표 시작점 후보: $core_flow_hint

## 저장소 고유 근거

## 저장소 운영 구조

## 역할별 개입 기준

## 경계별 handoff 기준

## 역할 유지와 조정 기준

## 남아 있는 질문
EOF
}

build_qa_report_block() {
  local exploration_context_level="$1"
  local key_axes_hint="$2"
  local boundary_hint="$3"
  local test_hint="$4"

  cat <<EOF
## 요약

- 최종 QA 전략은 qa-designer가 직접 작성합니다.
- 관련 코드 경로 후보: $key_axes_hint
EOF
  [ "$test_hint" = "추정 불가" ] || printf '%s\n' "- 테스트 및 검증 자산 후보: $test_hint"
  cat <<EOF

## 저장소 고유 단서

## 핵심 품질 축

## 핵심 질문

## 변경 유형별 체크 기준

## 남아 있는 질문
EOF
}

build_orchestration_report_block() {
  local exploration_context_level="$1"
  local key_axes_hint="$2"

  cat <<EOF
## 요약

- 최종 오케스트레이션 계획은 orchestrator가 직접 작성합니다.
- 관련 코드 경로 후보: $key_axes_hint

## 저장소 고유 근거

## 요청 유형별 시작점

## 표준 진행 흐름

## 재진입 및 handoff 기준

## 남아 있는 질문
EOF
}

build_team_structure_report_block() {
  local exploration_context_level="$1"
  local key_axes_hint="$2"

  cat <<EOF
## 요약

- 최종 팀 구조는 harness-architect가 직접 작성합니다.
- 관련 코드 경로 후보: $key_axes_hint

## 저장소 고유 근거

## 저장소 경계

## 경계별 역할 분담

## 역할 추가/축소 기준
EOF
}

build_team_playbook_report_block() {
  local exploration_context_level="$1"
  local key_axes_hint="$2"

  cat <<EOF
## 요약

- 최종 운영 플레이북은 orchestrator가 직접 작성합니다.
- 관련 코드 경로 후보: $key_axes_hint

## 저장소 고유 근거

## 시작 조건

## 작업 유형별 시작 흐름

## 검증과 종료 조건

EOF
}

build_domain_summary_block() {
  local exploration_context_level="$1"
  local project_type_label="$2"
  local boundary_hint="$3"
  local core_flow_hint="$4"
  local key_axes_hint="$5"
  local config_hint="$6"

  case "$exploration_context_level" in
    초기)
      cat <<EOF
- 탐색 상태 요약: 미정
- 설정 및 실행 단서: 미정
- 대표 시작점 후보: 미정
EOF
      ;;
    제한적)
      cat <<EOF
- 탐색 상태 요약: $project_type_label
 - 주요 구조 단서: $boundary_hint
- 설정 및 실행 단서: $config_hint
- 대표 시작점 후보: $core_flow_hint
EOF
      ;;
    *)
      printf '%s\n' "- 탐색 상태 요약: $project_type_label"
      [ "$config_hint" = "추정 불가" ] || printf '%s\n' "- 설정 및 실행 단서: $config_hint"
      printf '%s\n' "- 주요 구조 단서: $boundary_hint"
      [ "$key_axes_hint" = "$boundary_hint" ] || printf '%s\n' "- 관련 코드 경로 후보: $key_axes_hint"
      printf '%s\n' "- 대표 시작점 후보: $core_flow_hint"
      ;;
  esac
}

build_next_step_line() {
  local exploration_context_level="$1"
  local context="${2:-init}"

  case "$exploration_context_level" in
    초기|제한적)
      if [ "$context" = "update" ]; then
        echo "- domain-analyst가 실제 저장소 구조를 읽고 내용을 다시 씁니다."
      else
        echo "- 답변이 모이면 domain-analyst가 저장소 요약과 핵심 흐름을 다시 씁니다."
      fi
      ;;
    *)
      echo "- domain-analyst가 자동 관찰 결과를 다시 읽고 실제 코드 경로와 사용자 흐름 기준의 분석 결과를 다시 씁니다."
      ;;
  esac
}

ensure_harness_log_scaffold() {
  local harness_dir=".harness"
  local log_dir="$harness_dir/logs"
  local logging_policy_file="$harness_dir/logging-policy.md"
  local session_log_file="$log_dir/session-log.md"
  local events_file="$log_dir/session-events.tsv"
  local latest_summary_file="$log_dir/latest-session-summary.md"
  local role_frequency_file="$log_dir/role-frequency.md"

  mkdir -p "$harness_dir" "$log_dir"

  if [ ! -f "$logging_policy_file" ]; then
    cat > "$logging_policy_file" <<'EOF'
# 로그 정책

## 로그 메모

이 문서는 실행 하네스 팀을 실제로 운용할 때 남는 로그 메모를 적어 둡니다.

## 자동화 도구

- 전역 설치된 `harness-log.sh`는 역할 호출 시 세션 로그에 자동 append 합니다.
- 전역 설치된 `harness-session-close.sh`는 세션 종료 시 최신 세션 요약을 자동 갱신합니다.

## 기본 동작

- 역할 호출 기록은 `.harness/logs/session-log.md`에 누적합니다.
- 구조화된 이벤트는 `.harness/logs/session-events.tsv`에 남깁니다.
- 세션 종료 시 최신 요약은 `.harness/logs/latest-session-summary.md`로 갱신합니다.

## 선택 자산

- 선택 자산이 활성화된 프로젝트에서는 `harness-session-close.sh`가 역할 호출 빈도 통계와 템플릿 후보 분석까지 함께 갱신합니다.
- `harness-role-stats.sh`는 누적 로그를 기준으로 역할 호출 빈도 통계를 다시 계산합니다.
- `harness-template-candidates.sh`는 누적 로그를 분석한 반복 업무 템플릿 후보 메모를 `.harness/reports/template-candidates.md`로 남깁니다.

## 로그를 남겨야 하는 상황

- run-harness로 팀을 시작했을 때
- 특정 역할을 직접 호출했을 때
- validator 피드백이 나왔을 때
- QA 질문이 다시 정리되었을 때
- orchestrator가 흐름을 변경했을 때
- 역할 팀 구조가 변경되었을 때

## 최소 로그 항목

- 시각
- 시작 요청 요약
- 진입점 역할
- 호출된 역할
- 입력으로 본 파일
- 출력/갱신된 파일
- 다음 권장 역할
- 남은 약점 또는 미해결 항목

## 원칙

- 로그는 짧지만 구조적으로 남깁니다.
- 사람이 읽을 수 있어야 합니다.
- 역할 흐름과 피드백 루프가 보이도록 남깁니다.
- 각 역할은 자신이 수행한 주요 변경과 다음 권장 단계를 남길 책임이 있습니다.
- 가능하면 수동 편집보다 자동 append 스크립트 쪽에 더 가깝게 둡니다.
EOF
  fi

  if [ ! -f "$session_log_file" ]; then
    cat > "$session_log_file" <<'EOF'
# 실행 하네스 세션 로그

## 기록 원칙

각 세션마다 아래 형식으로 기록합니다.

---

### 세션

- 시각:
- 세션 ID:
- 상태:
- 시작 요청:
- 진입점:
- 호출 역할:
- 입력 파일:
- 출력 파일:
- 다음 권장 역할:
- 남은 약점:

---

## 예시

### 세션

- 시각: YYYY-MM-DD HH:MM
- 세션 ID: session-YYYYMMDD-HHMMSS
- 상태: started
- 시작 요청: 현재 프로젝트에 하네스 팀을 한 번 돌려줘
- 진입점: run-harness
- 호출 역할: domain-analyst, harness-architect, orchestrator
- 입력 파일: 없음
- 출력 파일: .harness/reports/domain-analysis.md, .harness/reports/harness-architecture.md
- 다음 권장 역할: qa-designer
- 남은 약점: QA 질문이 아직 추상적임
EOF
  fi

  if [ ! -f "$events_file" ]; then
    printf 'timestamp\tsession_id\tstatus\trequest\tentry_point\troles\tinputs\toutputs\tnext_role\tweaknesses\tnote\n' > "$events_file"
  fi

  if [ ! -f "$latest_summary_file" ]; then
    cat > "$latest_summary_file" <<'EOF'
# 최신 세션 요약

아직 종료된 세션 집계가 없습니다.
EOF
  fi

  if optional_harness_assets_enabled "$EXPLORATION_NOTES_DEFAULT_PATH" && [ ! -f "$role_frequency_file" ]; then
    cat > "$role_frequency_file" <<'EOF'
# 역할 호출 빈도

아직 집계된 역할 호출 통계가 없습니다.
EOF
  fi
}
