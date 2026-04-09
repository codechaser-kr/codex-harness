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
  find_exploration_paths \
    -type f \
    \( -name 'main.ts' -o -name 'main.tsx' -o -name 'main.js' -o -name 'main.jsx' -o -name 'main.rs' -o \
       -name 'index.ts' -o -name 'index.tsx' -o -name 'index.js' -o -name 'index.jsx' -o \
       -name 'app.ts' -o -name 'app.tsx' -o -name 'app.js' -o -name 'app.jsx' -o \
       -name 'server.ts' -o -name 'server.tsx' -o -name 'server.js' -o -name 'server.jsx' -o \
       -name 'cli.ts' -o -name 'cli.tsx' -o -name 'cli.js' -o -name 'cli.jsx' -o \
       -name 'lib.ts' -o -name 'lib.tsx' -o -name 'lib.js' -o -name 'lib.jsx' -o \
       -name 'mod.rs' \) \
    -print | sed 's#^\./##' | head -n 5
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
    -print | sed 's#^\./##' | head -n 8
}

list_domain_context_paths() {
  find_exploration_paths -maxdepth 4 \
    -type f \
    \( -name 'README.md' -o -name '*.md' -o -name '*.mdx' -o -name '*.txt' \) \
    ! -name 'AGENTS.md' \
    ! -name 'CLAUDE.md' \
    -print | sed 's#^\./##' | head -n 8
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

  case "$exploration_context_level" in
    초기|제한적)
      cat <<EOF
## 구조 메모

이 문서는 현재 저장소에서 함께 읽을 역할 구조 후보를 적어 둡니다.

## 역할 메모

- domain-analyst
- harness-architect
- skill-scaffolder
- qa-designer
- orchestrator
- validator

## 설계 원칙

- 특정 프레임워크에 과도하게 고정하지 않는다.
- 사람이 읽고 수정할 수 있는 구조를 우선한다.
- 생성기와 프로젝트 로컬 산출물을 분리한다.
- 이후 프로젝트 특화 하네스로 확장할 수 있어야 한다.
EOF
      ;;
    *)
      cat <<EOF
## 요약

- 이 문서는 현재 저장소의 실제 구조와 변경 경계를 바탕으로 역할 배치 후보 메모를 남깁니다.
- 탐색 상태 요약: $project_type_label
- 관련 코드 경로 후보: $key_axes_hint
- 대표 시작점 후보: $core_flow_hint
EOF
      cat <<EOF

## 저장소 고유 근거

- 관련 코드 경로 후보: \`$key_axes_hint\`
- 대표 시작점 후보: $core_flow_hint

## 구조 메모

### 역할 메모

- domain-analyst: 실제 코드 경로와 책임 경계를 다시 읽을 역할입니다.
- harness-architect: $key_axes_hint 단서를 역할 책임과 문서 구조로 다시 정리할 역할입니다.
- skill-scaffolder: 역할 정의와 구조 설계를 로컬 스킬과 자산으로 옮길 역할입니다.
- qa-designer: 영향도가 큰 경계와 검증 비용이 큰 흐름을 질문 세트로 다시 쓸 역할입니다.
- orchestrator: 작업 시작점, handoff, 재진입 루프를 하나의 운영 흐름 메모로 묶는 역할입니다.
- validator: 일반론 회귀와 되돌림 지점을 점검할 역할입니다.
- run-harness: 현재 요청과 문서 상태를 읽고 시작 흐름과 다음 역할 메모를 여는 역할입니다.

### 역할 유지와 조정 기준

- 역할 수는 고정 답안보다 경계 종류, 검증 비용, 운영 복잡도를 함께 읽은 메모에 가깝습니다.
- 중심 역할과 보조 역할 구분은 실제 저장소 읽기 이후 다시 적습니다.

### 흐름 메모

- 신규 구축, 기존 확장, 운영 유지보수는 같은 역할 목록이라도 시작 역할과 재진입 지점이 달라집니다.
- 팬아웃/팬인은 하위 영역이 실제로 독립적일 때만 쓰고, 최종 통합 책임은 항상 역할 팀으로 다시 모읍니다.

### 확장 메모

- templates/scenarios는 반복 handoff와 산출물 흐름이 실제로 누적될 때만 붙습니다.
- role-frequency나 template-candidates는 운영 유지보수 단계에서 반복성 분석 가치가 생길 때만 붙습니다.

### 설계 원칙

- 역할은 저장소 구조보다 추상적이어야 하지만, 저장소 경계를 무시하면 안 됩니다.
- 관련 코드 경로 후보가 많을수록 역할 수를 늘리기보다 역할 판단 기준을 선명하게 둡니다.
- 자동 재생성 결과라도 실제 탐색 근거를 반영한 분석 메모가 앞에 놓입니다.
- 프로젝트 특화 판단이 필요한 부분은 역할 팀 메모에서 따로 적힙니다.

## 이어서 볼 항목

- domain-analysis와 qa-strategy에는 저장소 고유 명사와 실패 지점 메모가 이어집니다.
- run-harness와 validator 메모는 현재 역할 구조를 함께 소비하는 흐름으로 이어집니다.
EOF
      ;;
  esac
}

build_qa_report_block() {
  local exploration_context_level="$1"
  local key_axes_hint="$2"
  local boundary_hint="$3"
  local test_hint="$4"

  case "$exploration_context_level" in
    초기|제한적)
      cat <<EOF
## QA 메모

이 문서는 저장소에서 함께 볼 품질 기준 후보 메모를 적어 둡니다.

## 확인 메모 예시

- 도메인 분석 리포트가 실제 저장소와 맞는가
- 하네스 역할 정의가 과하거나 부족하지 않은가
- 스킬 설명이 충분히 명확한가
- 오케스트레이션 계획이 실제 작업 흐름과 연결되는가
EOF
      ;;
    *)
      cat <<EOF
## 요약

- 이 문서는 현재 저장소에서 변경 영향이 큰 경계와 반복 검증 후보를 QA 관점 메모로 남깁니다.
- 저장소 전용 질문은 구조 일반론보다 실제 파일, 테스트 유틸, 진입점 단서 쪽에 더 가깝게 붙습니다.

## 저장소 고유 단서
EOF
      source_anchor_count=0
      while IFS= read -r workspace_path; do
        [ -n "$workspace_path" ] || continue
        printf '%s\n' "- \`$workspace_path\`: 이번 저장소에서 QA 질문을 적을 때 함께 읽을 대표 소스 앵커입니다."
        source_anchor_count=$((source_anchor_count + 1))
      done < <(list_source_anchor_paths)

      if [ "$source_anchor_count" -eq 0 ]; then
        printf '%s\n' "- 자동으로 포착한 소스 앵커가 부족하면, 테스트 유틸 위치나 대표 진입점 파일을 더 읽은 QA 메모가 필요합니다."
      fi

      cat <<EOF

## QA 메모

### 핵심 품질 축

- $key_axes_hint
EOF
      [ "$boundary_hint" = "추정 불가" ] || printf '%s\n' "- 실제 코드 경계와 소비 관계의 영향 전파"
      [ "$test_hint" = "추정 불가" ] || printf '%s\n' "- 테스트 자산과 검증 유틸리티의 안정성"
      printf '%s\n' "- 공용 계층, 진입점 설정, 소비 경로 사이의 영향 전파"
      cat <<EOF

### 핵심 질문

- 이번 변경이 어떤 작업 축을 건드리는가
- 변경 범위가 단일 영역인지, 여러 경계까지 전파되는가
- 빌드/테스트/배포 중 어떤 검증 경로를 다시 읽어야 하는가
- 자동화보다 사람이 직접 봐야 하는 결합 지점은 어디인가

### 변경 유형별 체크 메모

- 기능 변경: 영향받는 사용자 또는 호출 흐름, 핵심 진입점, 최소 회귀 메모 대상을 함께 적습니다.
- 구조 변경: 역할 문서, 경계 설명, 오케스트레이션 계획이 새 구조와 맞물리는지 보는 메모가 붙습니다.
- 빌드/설정 변경: 실행 명령, 검증 명령, 배포 또는 산출물 경로를 다시 읽는 메모가 붙습니다.
- 경계 변경: 여러 모듈, 서비스, 패키지, 런타임 중 어디로 영향이 번지는지 실제 저장소 기준으로 다시 적습니다.

### 테스트 설계 기준

- 빠르게 실패를 잡는 얕은 체크와 실제 영향 경계를 읽는 깊은 체크를 나눕니다.
- 빠른 검증과 느린 검증, 단일 경계 검증과 교차 경계 검증을 구분해 적습니다.

### 실행 예시

- 로컬 역할 구조와 보고서 정합성 메모: \`bash .codex-dist/skills/harness/scripts/harness-verify.sh\`
- 최신 탐색 근거와 보고서 갱신: \`bash .codex-dist/skills/harness/scripts/harness-update.sh --qa\`
- 세션 로그와 최신 요약 다시 읽기: \`tail -n 40 .harness/logs/session-log.md\` 와 \`cat .harness/logs/latest-session-summary.md\`
- 저장소별 실제 테스트나 빌드 명령은 위 단서와 대표 진입점 파일을 다시 읽은 프로젝트 문맥 메모 위에 놓입니다.

### 추가 메모 관점

- 공개 인터페이스, 설정 진입점, 소비 경로가 함께 흔들리는지도 같이 보이는 메모가 남습니다.
- 공용 계층과 검증 경로가 같은 변경 안에서 동시에 깨질 수 있는지 살핍니다.
- 문서 정합성보다 실제 운영 리스크가 더 큰 지점이 앞에 놓이는 수동 메모가 남습니다.

## QA 운영 메모

- QA는 체크리스트 실행기가 아니라 변경 영향의 triage 도구로 작동합니다.
- 매 요청마다 전체 질문 세트를 다 읽지 않고, 이번 변경이 걸리는 축을 앞에 적고 나머지는 위험 순위를 매깁니다.
- QA 질문이 일반론에 머물면 의미가 없습니다. 저장소 고유 파일 이름, 경계, 실패 유형을 직접 참조해 적습니다.
- 하네스 문서와 스킬 변경도 QA 범위에 포함합니다. 구조 정합성 역시 운영 품질입니다.
- validator와 역할을 나누되, QA는 "무엇을 볼 것인가" 메모를 남기고 validator는 "최소 구조" 메모를 남깁니다.

## 이어서 볼 항목

- 저장소 고유 단서를 기준으로 QA 질문은 로컬 고유 명사와 실패 지점 메모로 이어집니다.
- validator 메모와 실제 검증 경로가 문서 질문 세트와 얼마나 맞물리는지도 함께 남깁니다.
EOF
      ;;
  esac
}

build_orchestration_report_block() {
  local exploration_context_level="$1"
  local key_axes_hint="$2"

  case "$exploration_context_level" in
    초기|제한적)
      cat <<EOF
## 흐름 메모

이 문서는 여러 하네스 역할이 실제로 어떤 순서와 방식으로 협력하는지 적어 둔 메모입니다.

## 기본 흐름 메모

1. domain-analyst
2. harness-architect
3. skill-scaffolder
4. qa-designer
5. orchestrator
6. validator

## 운영 메모

- 분석 메모가 앞에 놓이고, 그 위에 구조와 품질 문서가 이어집니다.
- 구조 문서가 정리된 뒤 품질 관점과 운영 흐름이 함께 붙습니다.
- 역할 간 책임이 겹치지 않게 한다.
- 결과물은 사람이 쉽게 읽을 수 있어야 한다.

## 확장 메모

이 범용 하네스는 아래 방향 메모로 이어집니다.

- 프로젝트 특화 하네스
- expected-state 구조
- diff 전략
- 시나리오 실행 연결
- 자동 검증 파이프라인

## 메모

이 문서는 현재 저장소의 실제 작업 흐름에 맞게 계속 수정되어야 합니다.
EOF
      ;;
    *)
      cat <<EOF
## 요약

- 이 문서는 현재 저장소에서 어떤 요청 흐름과 역할 순서를 함께 볼지 적어둔 운영 메모입니다.
- 시작 분기와 재진입 기준은 현재 요청의 영향 범위와 검증 비용을 다시 읽을 때 참고할 운영 메모입니다.

## 저장소 고유 근거

- 현재 저장소에서 함께 읽을 관련 코드 경로 후보는 \`$key_axes_hint\` 입니다.
- 시작 흐름과 재진입 지점은 사용자 요청 유형, 경계 영향 범위, 남은 검증 비용을 함께 읽는 메모로 남습니다.

## 흐름 메모

### 시작 분기

1. run-harness
2. domain-analyst
3. qa-designer
4. orchestrator
5. validator

### 표준 전체 시퀀스

1. domain-analyst가 실제 코드 경로와 변경 경계를 다시 읽습니다.
2. harness-architect가 현재 역할 구조와 문서 층을 다시 맞춥니다.
3. skill-scaffolder가 필요한 스킬 설명과 템플릿을 갱신합니다.
4. qa-designer가 이번 축에 맞는 질문과 체크포인트 메모를 남깁니다.
5. orchestrator가 작업 시작 루프와 검증 루프 메모를 묶습니다.
6. validator가 산출물이 일반론으로 흐르지 않았는지 보는 마지막 메모를 남깁니다.

### 대표 요청별 루프

- 기능 또는 사용자 흐름 수정: run-harness -> domain-analyst -> qa-designer -> orchestrator -> validator
- 구조 또는 문서 정비: run-harness -> skill-scaffolder -> orchestrator -> validator
- 경계 재정의가 필요한 변경: run-harness -> domain-analyst -> harness-architect -> qa-designer -> orchestrator -> validator
- 검증 비용이 큰 변경: run-harness -> domain-analyst -> qa-designer -> orchestrator -> validator

### 운영 구조

- 신규 구축, 기존 확장, 운영 유지보수는 같은 역할 목록이라도 다른 시작 흐름이 열릴 수 있습니다.
- 팬아웃/팬인은 하위 영역 간 비교 축이 이미 정리된 경우에 가까운 메모로 남습니다.
- 문서와 로그에 계속 남는 중심 역할과 단발성 보조 판단은 같은 방식으로 다루지 않습니다.
- 요청이 추상적이거나 맥락이 약하면 사용자 질문과 탐색 재읽기가 앞에 오는 흐름 메모가 열립니다.

### 순서 조정 및 재진입 기준

- 시작 분기에서 뒤쪽 역할이 진입점이 되더라도, 앞 단계 해석이 충분한지 보는 메모가 앞에 붙습니다.
- 핵심 경계나 다중 모듈 영향이 보이면 qa-designer와 validator를 앞쪽에 두는 흐름을 다시 엽니다.
- domain-analysis가 generic하거나 예외 메모가 비어 있으면 domain-analyst 재진입 메모가 앞에 열립니다.
- 구조 설명, 체크리스트, handoff 중 어느 층이 가장 약한지에 따라 harness-architect, qa-designer, orchestrator 재진입을 고릅니다.

### 역할 간 handoff 규칙

- domain-analyst -> harness-architect: 실제 경계, 예외, 핵심 흐름을 읽은 뒤 구조 책임으로 넘깁니다.
- harness-architect -> skill-scaffolder: 역할 책임과 출력 문서 층을 맞춘 뒤 로컬 스킬 설명과 템플릿 반영으로 넘깁니다.
- qa-designer -> orchestrator: 질문과 최소 체크 메모를 적은 뒤 어떤 루프로 이어질지 넘깁니다.
- validator -> orchestrator: 회귀, 누락, 재진입 필요 지점을 찾으면 다시 어떤 역할부터 볼지 되돌립니다.

### 피드백 루프

- validator가 generic 회귀를 발견하면 domain-analyst 또는 harness-architect 재진입이 열립니다.
- qa-designer가 새 위험 축을 찾거나 session-log에 반복 우회 흐름이 쌓이면 orchestrator가 시작 분기와 검증 루프를 다시 정리하고, 필요하면 team-playbook과 함께 갱신합니다.

### 운영 메모

- 작은 변경도 핵심 경계나 빌드 경계를 건드리면 별도 검증 루프 메모가 함께 붙습니다.
- 문서 재생성에서는 기존 문장 보존보다 실제 저장소 분석 반영을 앞에 둡니다.
- 역할 호출 순서는 고정보다 영향 범위와 검증 비용을 다시 읽으며 정합니다.

## 이어서 볼 항목

- 반복적으로 등장하는 우회 흐름은 team-playbook과 함께 다시 적히는 루프 메모로 이어집니다.
- run-harness 출력 계약과 실제 시작 분기 관계도 validator 메모와 함께 다시 읽힙니다.
EOF
      ;;
  esac
}

build_team_structure_report_block() {
  local exploration_context_level="$1"
  local key_axes_hint="$2"

  case "$exploration_context_level" in
    초기|제한적)
      cat <<EOF
## 팀 메모

이 문서는 현재 프로젝트의 로컬 실행 하네스를 역할 팀 관점에서 설명합니다.

## 팀 구성

- domain-analyst
- harness-architect
- skill-scaffolder
- qa-designer
- orchestrator
- validator
- run-harness

## 설명

이 역할들은 각각 독립적인 판단 단위를 가지며,
함께 프로젝트 실행 하네스를 구성합니다.
EOF
      ;;
    *)
      cat <<EOF
## 요약

- 이 문서는 현재 저장소의 관련 코드 경로 후보를 어떤 역할 팀이 나눠 읽는지 적어둔 메모입니다.
- 역할 팀 구성은 저장소의 경계 종류와 검증 비용을 나눠 읽기 위한 운영 메모입니다.

## 저장소 고유 근거

- QA는 \`$key_axes_hint\` 축이 동시에 흔들릴 때 함께 읽어야 할 역할입니다.
- 경계 설명은 단일 수정처럼 보여도 여러 소비 경계나 호출 경로로 전파될 때 함께 보이는 메모가 남습니다.
- orchestrator와 validator는 handoff 순서와 회귀 점검을 함께 붙잡는 역할입니다.

## 팀 메모

### 팀 구성

- domain-analyst
- harness-architect
- skill-scaffolder
- qa-designer
- orchestrator
- validator
- run-harness

### 역할별 책임 요약

- domain-analyst: $key_axes_hint 축에서 사실 기준 분석을 적는 역할입니다.
- harness-architect: 역할 경계와 구조 배치를 정리하는 역할입니다.
- skill-scaffolder: 로컬 스킬과 템플릿 반영을 맡는 역할입니다.
- qa-designer: 품질 질문과 기준 메모를 적는 역할입니다.
- orchestrator: 역할 간 handoff와 재진입 흐름을 정리하는 역할입니다.
- validator: 회귀와 누락을 점검하는 역할입니다.
- run-harness: 시작 흐름 메모와 사용자 질문을 여는 역할입니다.

### 실전 분류 예시

- 변경 중심은 사용자 진입점, 공용 계층, 별도 실행 환경 중 어디에 가까운지로 갈립니다.
- 단일 수정처럼 보여도 소비 경로나 공용 계층까지 번지면 domain-analyst와 qa-designer를 앞에 두는 흐름 메모가 놓입니다.
- 문서 정비 요청이라도 handoff나 다음 진입점이 바뀌면 orchestrator와 validator를 함께 붙이는 흐름 메모가 놓입니다.

### 운영 기준

- 역할 수는 많을수록 좋은 것이 아니라, 현재 저장소에서 실제로 구분이 필요한 책임 경계만큼만 둡니다.
- 역할을 추가하거나 줄일 때는 각 역할의 산출물과 해석 기준이 실제로 어떻게 갈리는지 다시 읽습니다.
- domain-analyst와 harness-architect는 각각 사실 기반 경계 분석과 역할 구조 설계를 맡는 다른 층입니다.
- validator는 회귀와 누락 점검을 맡는 별도 역할로 유지합니다.

## 이어서 볼 항목

- 실제 저장소에서 자주 등장하는 변경 유형은 이 팀 구조 예시에 계속 누적합니다.
- architecture와 orchestration 메모도 이 팀 구조 설명과 같은 경계를 가리키는 흐름으로 이어집니다.
EOF
      ;;
  esac
}

build_team_playbook_report_block() {
  local exploration_context_level="$1"
  local key_axes_hint="$2"

  case "$exploration_context_level" in
    초기|제한적)
      cat <<EOF
## 세션 메모

이 문서는 프로젝트 로컬 실행 하네스 팀을 실제로 어떻게 시작하고 운용할지 요약합니다.

## 시작 메모

1. 기본적으로는 run-harness를 실행 하네스 팀의 진입점으로 사용합니다.
2. run-harness는 현재 상태를 보고, 탐색 근거가 부족하면 사용자 질문으로 이어지고, 근거가 충분하면 필요한 역할 순서 메모가 열립니다.
3. 새 프로젝트에서는 domain-analyst부터 시작하는 흐름이 기본값에 가깝습니다.
4. 구조가 이미 있으면 orchestrator / validator 중심의 점검 루프가 더 자주 열립니다.

## 시작 체크 메모

- 현재 요청 한 줄 요약과 영향 범위가 앞에 기록됩니다.
- 직전 session-log를 읽으면 미해결 항목 연결 여부가 드러납니다.
- 이번 세션에서 앞에 놓을 문서는 1~2개로 좁혀집니다.

## 기본 흐름 메모

- 문서보다 역할 팀을 본체로 봅니다.
- \`.harness/reports\` 문서는 팀이 공유하는 보조 기준으로 사용합니다.
- 빈 저장소이거나 탐색 근거가 부족하면 역할 호출보다 사용자 질문이 앞에 놓입니다.
- validator 피드백이 나오면 architect / scaffolder / orchestrator 재작성 루프가 다시 열립니다.
- QA 질문이 약하면 qa-designer 재작성 루프가 다시 붙습니다.
- 중요한 역할 호출이나 흐름 변경은 session-log에 남습니다.

## 로그 운영

- 로그 정책은 \`.harness/logging-policy.md\` 메모에서 이어집니다.
- 역할별 누적 기록은 \`.harness/logs/session-log.md\`에 남깁니다.
- 구조화된 이벤트 원장은 \`.harness/logs/session-events.tsv\`를 사용합니다.
- 최신 세션 요약은 \`.harness/logs/latest-session-summary.md\` 메모에서 이어집니다.
EOF
      if optional_harness_assets_enabled; then
        printf '%s\n' "- 역할 호출 빈도 집계는 \`.harness/logs/role-frequency.md\` 메모에서 이어집니다."
        printf '%s\n' "- 반복 업무 템플릿 후보 분석 결과는 \`.harness/reports/template-candidates.md\` 메모에서 이어집니다."
      fi
      ;;
    *)
      cat <<EOF
## 요약

- 이 문서는 현재 저장소의 실제 변경 경계를 기준으로 실행 하네스 팀을 어떻게 시작하고 되돌릴지 요약합니다.
- 빠른 체크리스트와 절차 문서는 세션 재진입 속도와 일관성을 위해 함께 둡니다.

## 저장소 고유 근거

- 앞에 놓을 문서는 보통 domain-analysis, orchestration-plan, qa-strategy 중 현재 요청과 직접 연결되는 문서입니다.
- 직전 session-log와 latest-session-summary는 현재 세션의 재진입 지점을 정할 때 함께 읽는 기본 근거입니다.

## 세션 메모

### 시작 체크 메모

- 직전 session-log와 latest-session-summary를 읽으면 미해결 항목과 재진입 지점이 보입니다.
- domain-analysis, orchestration-plan, qa-strategy 중 이번 요청과 직접 연결되는 문서 쪽부터 읽는 흐름이 열립니다.
- 현재 요청 요약과 영향 범위는 session-log 앞부분에 남습니다.
- 직전 세션의 남은 약점이 이번 요청과 이어지는지 여부가 함께 보입니다.
- 앞에 놓을 문서와 나중에 볼 문서를 구분해 시작하고, 역할 호출이나 전환 이유가 바뀌면 그 근거도 함께 남깁니다.

### 역할 호출 순서

1. run-harness는 요청을 받고 $key_axes_hint 중 어느 축을 건드리는지 앞에 적어 둡니다.
2. 영향 범위가 넓거나 핵심 경계를 건드리면 domain-analyst와 qa-designer를 앞에 두는 흐름 메모가 놓입니다.
3. 구조 재정리가 필요하면 harness-architect와 skill-scaffolder를 붙여 역할 설명과 템플릿을 맞춥니다.
4. orchestrator가 작업 루프와 검증 루프를 묶고 validator가 마지막 구조 메모를 남깁니다.

### 작업 유형별 메모

- 기능 또는 사용자 흐름 수정: domain-analysis와 qa-strategy부터 읽으며 최소 회귀 범위를 함께 적습니다.
- 구조 또는 경계 수정: 바뀐 책임 경계와 영향 전파 범위를 적고 architect/qa 투입 시점을 고릅니다.
- 실행 또는 배포 경로 수정: 환경 차이와 최종 검증 경로를 분리해 기록합니다.
- 여러 경계를 가로지르는 수정: 소비자 경로와 핵심 경계 재정리 필요 여부 메모가 앞에 놓입니다.
- 문서 재생성 또는 하네스 정비: wording보다 저장소 사실, 이번 세션의 남은 약점, 다음 진입점 유지 여부가 앞에 옵니다.

### 로그 운영

- 로그 정책은 \`.harness/logging-policy.md\` 메모에서 이어집니다.
- 역할별 누적 기록은 \`.harness/logs/session-log.md\`에 남깁니다.
- 구조화된 이벤트 원장은 \`.harness/logs/session-events.tsv\`를 사용합니다.
- 최신 세션 요약은 \`.harness/logs/latest-session-summary.md\` 메모에서 이어집니다.
EOF
      if optional_harness_assets_enabled; then
        printf '%s\n' "- 역할 호출 빈도 집계는 \`.harness/logs/role-frequency.md\` 메모에서 이어집니다."
        printf '%s\n' "- 반복 업무 템플릿 후보 분석 결과는 \`.harness/reports/template-candidates.md\` 메모에서 이어집니다."
      fi
      cat <<EOF

### 종료 메모

- 이번 세션에서 시작 역할, handoff, 남은 약점은 session-log에 남습니다.
- validator 피드백이 있으면 다음 진입점이 명시된 채 세션이 닫힙니다.
- 재생성된 문서가 실제 저장소 분석을 잃지 않았는지 보는 마지막 메모가 남습니다.

## 이어서 볼 항목

- 다음 세션이 바로 이어질 수 있게 시작 흐름, 다음 역할, 남은 질문 메모가 최신 요약에 남습니다.
- 반복 업무가 누적되면 선택 자산을 활성화해 역할 빈도와 템플릿 후보를 함께 관리합니다.
EOF
      ;;
  esac
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
