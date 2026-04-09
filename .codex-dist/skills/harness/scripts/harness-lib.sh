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
      printf '%s\n' "탐색 근거와 사용자 응답을 함께 참고해 초기 방향을 정리합니다."
    else
      printf '%s\n' "현재 저장소는 실제 코드 경계와 대표 흐름을 다시 읽어 후속 문서를 정리해야 합니다."
    fi
    return
  fi

  if [ "$exploration_context_level" = "초기" ] || [ "$exploration_context_level" = "제한적" ]; then
    printf '%s\n' "탐색 문서에 수집된 단서를 바탕으로, 부족한 부분만 사용자 질문으로 보강합니다."
    return
  fi

  printf '%s\n' "현재 저장소는 탐색 문서의 대표 진입점과 코드 경계($boundary_hint)를 바탕으로 후속 문서를 다시 정리합니다."
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
    printf '%s\n' "대표 진입점 근거가 아직 부족해 실제 시작 흐름과 소비 경계는 추가 해석이 필요합니다."
    return
  fi

  printf '%s\n' "\`$entrypoint_hint\` 부근에서 실제 시작 흐름과 소비 경계가 드러납니다."
}

build_core_flow_hint() {
  case "$1" in
    초기)
      echo "미정"
      ;;
    제한적)
      echo "탐색 근거가 제한적이어서 README, 핵심 디렉토리, 사용자 확인 질문이 함께 있어야 첫 성공 흐름이 드러납니다."
      ;;
    *)
      echo "$2 주변에서 저장소의 핵심 사용자 흐름과 주요 변경 영향 지점이 드러납니다."
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
      echo "- 저장소를 분석한 뒤 이 내용을 구체화하세요."
      ;;
    제한적)
      echo "- 현재 탐색 근거가 제한적이므로 대표 경계와 사용자 응답을 함께 모아 초기 분석을 보강하세요."
      ;;
    *)
      if [ "$domain_hint" != "추정 불가" ]; then
        echo "- $boundary_hint, $config_hint, $domain_hint 단서를 우선 확인했습니다."
      else
        echo "- $boundary_hint, $config_hint 단서를 우선 확인했습니다."
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
## 분석 관점

이 문서는 현재 저장소를 하네스 관점에서 이해하기 위한 출발점입니다.

우선 다음을 정리해야 합니다.

- 이 저장소가 해결하려는 문제는 무엇인가
- 주요 사용자 또는 개발자 흐름은 무엇인가
- 어떤 품질 문제가 반복적으로 발생할 수 있는가
- 하네스가 우선적으로 다뤄야 할 핵심 축은 무엇인가

## 초기 질문

- 이 프로젝트는 애플리케이션인가, 라이브러리인가, 도구인가
- 핵심 기능은 어디에 모여 있는가
- 변경 시 영향이 큰 영역은 어디인가
- 검토를 자동화하거나 구조화할 가치가 큰 흐름은 무엇인가

## 사용자 확인 질문

탐색 근거가 아직 부족합니다. 아래 질문에 답하면 domain-analyst가 구체적인 분석을 시작할 수 있습니다.

1. 이 프로젝트는 무엇을 만들려고 하나요? (애플리케이션, 라이브러리, CLI 도구, 서비스 등)
2. 주요 사용자 또는 소비자는 누구인가요? (최종 사용자, 다른 개발자, 내부 팀 등)
3. 가장 먼저 동작해야 할 핵심 흐름 한 가지는 무엇인가요?
4. 사용할 언어나 프레임워크가 정해져 있나요?
5. 이 저장소에서 실패 비용이 가장 큰 영역은 어디라고 생각하나요?

## 질문 유도 메모

$discovery_guidance

## 초기 관찰 내용

$initial_observation_line

## 다음 단계

- 탐색 근거가 아직 부족하면 run-harness가 위 질문부터 사용자에게 짧게 확인합니다.
$next_step_detail_line
- 필요하면 디렉토리별 역할과 핵심 파일을 추가로 정리합니다.
EOF
      ;;
    *)
      cat <<EOF
## 요약
EOF
      printf '%s\n' "- 이 저장소는 \`$boundary_hint\` 단서에서 대표 사용자 흐름과 운영 경계가 드러납니다."
      printf '%s\n' "- 대표 흐름 요약: $core_flow_hint"
      printf '%s\n' "- 하네스 운영 구조는 위 흐름과 실패 비용을 보조하는 방식으로만 붙입니다."

      cat <<EOF

## 저장소 고유 근거
EOF
      while IFS= read -r source_anchor; do
        [ -n "$source_anchor" ] || continue
        printf '%s\n' "- \`$source_anchor\`"
        source_anchor_count=$((source_anchor_count + 1))
      done < <(list_source_anchor_paths)

      if [ "$source_anchor_count" -eq 0 ]; then
        printf '%s\n' "- 아직 자동으로 포착한 대표 소스 앵커가 충분하지 않습니다. 실제 프로젝트에서는 최소 3개 이상의 파일/경로 근거를 직접 보강해야 합니다."
      elif [ "$source_anchor_count" -lt 3 ]; then
        printf '%s\n' "- 자동으로 포착한 소스 앵커가 3개 미만입니다. 실제 프로젝트에서는 대표 파일/경로 근거를 더 보강해야 합니다."
      fi

      cat <<EOF

### 사실 기준 구조
EOF
      if [ "$boundary_hint" != "추정 불가" ]; then
        printf '%s\n' "- 아래 항목은 저장소의 책임 경계를 보여주는 구조 요약입니다."
        print_boundary_interpretation_lines "$boundary_hint"
      else
        printf '%s\n' "- 주요 코드 경계 근거가 아직 부족해 대표 경계 해석이 더 필요합니다."
      fi
      [ "$config_hint" = "추정 불가" ] || printf '%s\n' "- \`$config_hint\`: 실제 실행, 빌드, 검증 경로를 해석할 때 다시 확인할 설정 단서입니다."

      cat <<EOF

### 예외 및 운영 메모
EOF
      printf '%s\n' "- 예외 판단은 자동 분류보다 탐색 문서와 실제 실행 로그를 우선합니다."
      printf '%s\n' "- 루트 흐름과 다른 설치, 빌드, 검증 단계가 보이면 그 차이만 짧게 보강합니다."
      printf '%s\n' "- validator는 예외가 빈칸인지보다 실제 경계 변화와 운영 비용이 설명되는지를 우선 확인합니다."

      cat <<EOF

## 운영 규칙

### 핵심 도메인 흐름과 위험 축
EOF
      printf '%s\n' "- 대표 사용자 흐름과 운영 흐름은 실제 시작점과 종료 지점이 보이는 경계에서 드러납니다."
      printf '%s\n' "- \`$boundary_hint\` 경계 중 실제 업무 가치나 운영 비용이 크게 걸린 영역이 핵심 위험 축을 이룹니다."
      [ "$config_hint" = "추정 불가" ] || printf '%s\n' "- 설정·실행 경로는 실제 사용자 흐름이나 운영 리스크에 직접 연결될 때만 함께 다룹니다."
      printf '%s\n' "- 구조 변경 위험과 기능 흐름 단절 위험은 같은 변경 안에서도 따로 나타날 수 있습니다."

      cat <<EOF

### 핵심 경계와 책임
EOF
      if [ "$boundary_hint" != "추정 불가" ]; then
        print_boundary_interpretation_lines "$boundary_hint"
      else
        printf '%s\n' "- 주요 경계의 책임은 후속 역할이 실제 파일과 소비 관계를 읽으며 보강해야 합니다."
      fi

      cat <<EOF

### 핵심 실행 흐름
EOF
      printf '%s\n' "- $core_flow_hint"
      [ "$config_hint" = "추정 불가" ] || printf '%s\n' "- \`$config_hint\` 경로에서 실제 실행, 빌드, 검증 흐름이 갈라지는 지점이 나타납니다."
      [ "$boundary_hint" = "추정 불가" ] || printf '%s\n' "- \`$boundary_hint\` 경계를 따라 변경 영향 범위와 소비 관계가 연결됩니다."

      cat <<EOF

### 하네스 관점 핵심 관심사
EOF
      [ "$boundary_hint" = "추정 불가" ] || printf '%s\n' "- 실제 코드 경계를 흐리지 않는 변경 분류"
      [ "$boundary_hint" = "추정 불가" ] || printf '%s\n' "- \`$boundary_hint\` 경계에서 영향도가 큰 영역 식별"
      printf '%s\n' "- 실행 흐름, 설정 파일, 공용 계층 중 변경 출발점이 달라질 수 있다는 점"
      printf '%s\n' "- 검증 비용이 큰 경계와 수동 확인이 필요한 결합 지점을 역할 관점으로 분리"

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

## 아직 열려 있는 질문
EOF
      printf '%s\n' "- 자동 분석만으로는 핵심 사용자 흐름과 실패 비용을 완전히 확정할 수 없습니다."
      printf '%s\n' "- 대표 진입점 파일과 영향도가 큰 변경 경계는 후속 역할이 보강해야 합니다."
      printf '%s\n' "- 이 저장소에서 하네스가 실제로 개입해야 하는 핵심 불확실성은 무엇인가."
      printf '%s\n' "- 어떤 실패 시나리오가 가장 비용이 크고, 현재 구조로 그것을 감지할 수 있는가."

      cat <<EOF

## 다음 단계

$next_step_detail_line
- qa-designer와 orchestrator가 위 구조와 흐름을 기준으로 후속 문서를 구체화합니다.
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
## 목적

이 문서는 현재 저장소에 어떤 범용 하네스 구조를 둘지 정의합니다.

## 권장 역할

- domain-analyst
- harness-architect
- skill-scaffolder
- qa-designer
- orchestrator
- validator

## 역할별 책임

### domain-analyst
- 저장소 목적과 도메인 파악
- 대표 진입점, 주요 경계, 핵심 흐름 분석
- 하네스 관점의 주요 관심사 정리

### harness-architect
- 로컬 하네스 구조 설계
- 역할 분리와 확장 방향 정의
- 스킬/리포트/시나리오 구성 제안

### skill-scaffolder
- 로컬 스킬 생성 및 보완
- 구조와 스킬의 일관성 유지

### qa-designer
- 품질 기준과 검토 관점 정의
- 체크포인트와 검토 흐름 정리

### orchestrator
- 여러 역할을 실제 작업 순서로 연결
- 반복 가능한 작업 흐름 정의

### validator
- 현재 하네스 구조가 최소 요건을 만족하는지 점검

## 보조 구조

- \`.harness/reports\`는 역할 판단 근거와 저장소 분석 결과를 공유하는 보조 레이어입니다.
- \`.harness/logs\`는 실제 세션 흐름과 역할 호출 이력을 남기는 운영 레이어입니다.
- templates/scenarios 같은 반복 자산은 역할 팀이 공유하는 실행 보조 구조로 확장할 수 있습니다.

## 입력/출력 표

- domain-analyst: 저장소 구조와 핵심 단서를 입력으로 받아 \`.harness/reports/domain-analysis.md\`를 출력합니다.
- harness-architect: domain-analysis를 입력으로 받아 \`.harness/reports/harness-architecture.md\`를 출력합니다.
- skill-scaffolder: architecture와 역할 정의를 입력으로 받아 \`.codex/skills/*\`를 출력합니다.
- qa-designer: domain-analysis와 architecture를 입력으로 받아 \`.harness/reports/qa-strategy.md\`를 출력합니다.
- orchestrator: 주요 보고서를 입력으로 받아 \`.harness/reports/orchestration-plan.md\`를 출력합니다.
- validator: 전체 구조를 입력으로 받아 보완 지점과 다음 역할을 출력합니다.

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

- 이 문서는 현재 저장소의 실제 구조와 변경 경계를 바탕으로 실행 하네스 역할을 어떻게 배치할지 정리합니다.
- 프로젝트 성격: $project_type_label
- 핵심 작업 축: $key_axes_hint
- 대표 흐름 해석: $core_flow_hint
EOF
      cat <<EOF

## 저장소 고유 근거

- 역할 분리는 저장소 사실 확인, 구조 설계, 스킬 반영, QA 설계, 흐름 조율, 최종 검증, 기동 진입점을 분리하기 위한 장치입니다.
- templates/scenarios 같은 반복 자산은 기본값이 아니라 저장소에 반복 패턴이 축적될 때만 붙는 확장 자산으로 봅니다.
- run-harness를 별도 역할로 유지해야 현재 상태 판단과 실제 작업 역할 호출을 분리할 수 있습니다.

## 운영 규칙

### 역할 배치

- domain-analyst: 실제 코드 경로와 책임 경계를 구체화하고, 이후 역할이 공유할 사실 기반 입력을 만듭니다.
- harness-architect: $key_axes_hint 축을 기준으로 역할 책임과 핵심 문서 구조를 정렬합니다.
- skill-scaffolder: 역할 정의와 구조 설계를 실제 로컬 스킬과 자산으로 반영합니다.
- qa-designer: 영향도가 큰 경계와 고비용 검증 흐름을 검토 질문으로 번역합니다.
- orchestrator: 작업 시작점, handoff, 재진입 루프를 하나의 운영 흐름으로 묶습니다.
- validator: 프로젝트 특화 분석이 일반론으로 흐르지 않았는지 점검하고 되돌림 지점을 잡습니다.
- run-harness: 현재 요청과 문서 상태를 읽고 시작 역할, 보강 역할, 질문 여부를 결정합니다.

### 역할 유지와 조정 기준

- 사실 확인, 구조 설계, 스킬 반영, QA 설계, 흐름 조율, 최종 검증, 기동 진입점을 분리해야 재생성 후에도 책임 충돌이 줄어듭니다.
- 역할 수는 고정 답안이 아니라 경계 종류, 검증 비용, 운영 복잡도를 기준으로 조정합니다.
- 단일 패키지이고 흐름이 단순하면 skill-scaffolder와 orchestrator의 책임을 일부 묶을 수 있습니다.
- 여러 경계를 넘는 영향이나 별도 검증 축이 있으면 QA와 validator를 더 분리해 운영하는 편이 안전합니다.
- 문서, 로그, handoff를 계속 유지해야 하는 중심 역할은 팀 구조로 유지하고, 입력과 출력이 좁은 일회성 보조 판단만 따로 위임합니다.
- 역할을 줄일 때는 두 역할의 산출물과 판단 기준이 실제로 겹치는 경우가 많습니다.

### 운영 구조

- 신규 구축: domain-analyst -> harness-architect -> skill-scaffolder -> validator 중심의 기본 파이프라인이 기준이 됩니다.
- 기존 확장: 전부 재생성하지 않고, 현재 요청과 맞닿은 문서와 역할에서 재진입합니다.
- 운영 유지보수: 새 초안 생성보다 drift 감지, 피드백 루프, 로그 정합성 점검 비중이 커집니다.
- 팬아웃/팬인은 하위 영역이 실제로 독립적일 때만 쓰고, 최종적으로 다시 하나의 구조 설명으로 모읍니다.

- fan-out 분석이 필요해도 최종 통합 책임은 항상 역할 팀으로 다시 모읍니다.

### 확장 자산

- templates/scenarios는 반복 handoff와 산출물 흐름이 실제로 누적될 때만 붙입니다.
- role-frequency나 template-candidates는 운영 유지보수 단계에서 반복성 분석 가치가 생길 때 활성화합니다.
- 확장 자산은 기본값이 아니라, 팀이 반복 작업을 학습하기 시작했을 때 추가하는 보조 구조입니다.

### 설계 원칙

- 역할은 저장소 구조보다 추상적이어야 하지만, 저장소 경계를 무시하면 안 됩니다.
- 핵심 작업 축이 많은 저장소일수록 역할 수를 늘리기보다 역할 판단 기준을 선명하게 둡니다.
- 자동 재생성 결과라도 실제 탐색 근거를 반영한 분석이 앞에 옵니다.
- 프로젝트 특화 판단이 필요한 부분은 후속 역할이 보강할 수 있게 열어 둡니다.

## 다음 단계

- domain-analysis와 qa-strategy가 실제 저장소 고유 명사와 실패 지점을 충분히 담는지 다시 확인합니다.
- run-harness와 validator가 현재 역할 구조를 무리 없이 소비하는지 점검합니다.
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
## 목적

이 문서는 저장소에서 중요하게 봐야 할 품질 기준과 검토 지점을 정리합니다.

## 기본 관점

범용 하네스 1차 단계에서는 다음을 우선합니다.

- 저장소 구조를 이해할 수 있는가
- 역할이 분리되어 있는가
- 생성된 하네스 산출물이 사람이 검토 가능한가
- 로컬 스킬 구성이 반복 사용에 적합한가

## 검토 질문

- 이 저장소에서 가장 중요한 실패 유형은 무엇인가
- 어떤 영역은 변경 영향도가 큰가
- 어떤 흐름은 반복적으로 점검할 가치가 있는가
- 어떤 산출물이 있으면 팀이 더 쉽게 검토할 수 있는가

## 체크포인트 예시

- 도메인 분석 리포트가 실제 저장소와 맞는가
- 하네스 역할 정의가 과하거나 부족하지 않은가
- 스킬 설명이 충분히 명확한가
- 오케스트레이션 계획이 실제 작업 흐름과 연결되는가
EOF
      ;;
    *)
      cat <<EOF
## 요약

- 이 문서는 현재 저장소에서 변경 영향이 큰 경계와 반복 검증이 필요한 흐름을 QA 관점으로 정리합니다.
- 저장소 전용 질문은 구조 일반론이 아니라 실제 파일, 테스트 유틸, 진입점 단서를 기준으로 보강해야 합니다.

## 저장소 고유 확인 단서
EOF
      source_anchor_count=0
      while IFS= read -r workspace_path; do
        [ -n "$workspace_path" ] || continue
        printf '%s\n' "- \`$workspace_path\`: 이번 저장소에서 QA 질문을 구체화할 때 다시 확인할 대표 소스 앵커입니다."
        source_anchor_count=$((source_anchor_count + 1))
      done < <(list_source_anchor_paths)

      if [ "$source_anchor_count" -eq 0 ]; then
        printf '%s\n' "- 자동으로 포착한 소스 앵커가 부족하면, 테스트 유틸 위치나 대표 진입점 파일을 직접 찾아 QA 질문을 보강해야 합니다."
      fi

      cat <<EOF

## 운영 규칙

### 핵심 품질 축

- $key_axes_hint
EOF
      [ "$boundary_hint" = "추정 불가" ] || printf '%s\n' "- 실제 코드 경계와 소비 관계의 영향 전파"
      [ "$test_hint" = "추정 불가" ] || printf '%s\n' "- 테스트 자산과 검증 유틸리티의 안정성"
      printf '%s\n' "- 공용 계층, 진입점 설정, 소비 경로 사이의 영향 전파"
      cat <<EOF

### 우선 검토 질문

- 이번 변경이 어떤 작업 축을 건드리는가
- 변경 범위가 단일 영역인지, 여러 경계까지 전파되는가
- 빌드/테스트/배포 중 어떤 검증 경로를 반드시 다시 확인해야 하는가
- 자동화보다 사람이 직접 봐야 하는 결합 지점은 어디인가

### 변경 유형별 최소 체크

- 기능 변경: 영향받는 사용자 또는 호출 흐름, 핵심 진입점, 최소 회귀 확인 대상을 함께 적습니다.
- 구조 변경: 역할 문서, 경계 설명, 오케스트레이션 계획이 새 구조를 반영하는지 확인합니다.
- 빌드/설정 변경: 실행 명령, 검증 명령, 배포 또는 산출물 경로를 다시 확인합니다.
- 경계 변경: 여러 모듈, 서비스, 패키지, 런타임 중 어디로 영향이 번지는지 실제 저장소 기준으로 다시 적습니다.

### 테스트 설계 기준

- 빠르게 실패를 잡는 얕은 체크와 실제 영향 경계를 확인하는 깊은 체크를 구분합니다.
- 빠른 검증과 느린 검증, 단일 경계 검증과 교차 경계 검증을 구분해 적습니다.
- 문서나 하네스 변경이라도 verify가 잡지 못하는 운영 판단 공백이 없는지 수동 확인 질문을 남깁니다.

### 실행 예시

- 로컬 역할 구조와 보고서 정합성 확인: \`bash .codex-dist/skills/harness/scripts/harness-verify.sh\`
- 최신 탐색 근거와 보고서 보강: \`bash .codex-dist/skills/harness/scripts/harness-update.sh --qa\`
- 세션 로그와 최신 요약 재확인: \`tail -n 40 .harness/logs/session-log.md\` 와 \`cat .harness/logs/latest-session-summary.md\`
- 저장소별 실제 테스트나 빌드 명령은 위 단서와 대표 진입점 파일을 다시 읽고 프로젝트 문맥에 맞게 직접 보강합니다.

### 추가 확인 관점

- 공개 인터페이스, 설정 진입점, 소비 경로가 함께 흔들리는지 확인합니다.
- 공용 계층과 검증 경로가 같은 변경 안에서 동시에 깨질 수 있는지 살핍니다.
- 문서 정합성보다 실제 운영 리스크가 더 큰 지점을 우선 수동 확인합니다.

## QA 역할 운영 원칙

- QA는 체크리스트 실행기가 아니라 변경 영향의 triage 도구로 작동합니다.
- 매 요청마다 전체 질문 세트를 다 확인하지 않고, 이번 변경이 걸리는 축만 먼저 조이고 나머지는 위험 순위를 매깁니다.
- QA 질문이 일반론에 머물면 의미가 없습니다. 저장소 고유 파일 이름, 경계, 실패 유형을 직접 참조하도록 계속 보강합니다.
- 하네스 문서와 스킬 변경도 QA 범위에 포함합니다. 구조 정합성 역시 운영 품질입니다.
- validator와 역할을 나누되, QA는 "무엇을 봐야 하는가"를 정의하고 validator는 "최소 구조가 갖춰졌는가"를 점검합니다.

## 다음 단계

- 저장소 고유 확인 단서를 기준으로 QA 질문을 로컬 고유 명사와 실패 지점까지 더 구체화합니다.
- validator와 함께 실제 검증 경로가 문서 질문 세트와 어긋나지 않는지 확인합니다.
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
## 목적

이 문서는 여러 하네스 역할이 실제로 어떤 순서와 방식으로 협력해야 하는지 정리합니다.

## 기본 흐름

1. domain-analyst가 저장소를 분석한다.
2. harness-architect가 하네스 구조를 설계한다.
3. skill-scaffolder가 로컬 스킬과 기본 산출물을 정리한다.
4. qa-designer가 품질 전략과 검토 지점을 정의한다.
5. orchestrator가 반복 가능한 작업 흐름을 정리한다.
6. validator가 현재 구성이 최소 요건을 만족하는지 점검한다.

## 운영 원칙

- 먼저 분석하고, 그 다음 구조를 만든다.
- 구조를 만든 뒤 품질 관점을 붙인다.
- 역할 간 책임이 겹치지 않게 한다.
- 결과물은 사람이 쉽게 검토할 수 있어야 한다.

## 확장 방향

이 범용 하네스는 이후 다음으로 확장될 수 있습니다.

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

- 이 문서는 현재 저장소에서 어떤 요청이 들어왔을 때 어떤 역할을 먼저 움직여야 하는지 운영 흐름으로 정리합니다.
- 시작 분기와 재진입 기준은 현재 요청의 영향 범위와 검증 비용을 빨리 판별하기 위한 규칙입니다.

## 저장소 고유 근거

- 현재 저장소의 핵심 작업 축은 \`$key_axes_hint\` 입니다.
- 실제 시작 역할은 사용자 요청 유형보다도 경계 영향 범위와 남은 검증 비용에 더 크게 좌우됩니다.

## 운영 규칙

### 시작 분기

1. run-harness는 요청을 기능 구현, 구조 정리, 공통 모듈 보강, 빌드/검증 보강 중 어디에 가까운지 분류합니다.
2. 변경이 $key_axes_hint 중 어느 축에 걸리는지 판단합니다.
3. 영향 범위가 넓거나 경계가 불명확한 요청은 domain-analyst와 qa-designer에서 시작하는 경우가 많습니다.
4. 영향 범위가 좁고 구조 설명이 이미 충분한 요청은 skill-scaffolder 또는 orchestrator에서 시작할 수 있습니다.
5. 시작 분기는 단계를 건너뛰는 규칙이 아니라, 어떤 역할이 첫 판단을 맡는지 보여주는 운영 규칙입니다.

### 표준 전체 시퀀스

1. domain-analyst가 실제 코드 경로와 변경 경계를 재확인합니다.
2. harness-architect가 현재 역할 구조가 이번 변경 유형을 충분히 설명하는지 봅니다.
3. skill-scaffolder가 필요한 스킬 설명과 템플릿을 보강합니다.
4. qa-designer가 이번 축에 맞는 검토 질문과 체크포인트를 보강합니다.
5. orchestrator가 작업 시작 루프와 검증 루프를 정리합니다.
6. validator가 산출물이 다시 일반론으로 흐르지 않았는지 확인합니다.

### 대표 요청별 루프

- 기능 또는 사용자 흐름 보강: run-harness -> domain-analyst -> qa-designer -> orchestrator -> validator
  - domain-analyst가 실제 코드 경로와 변경 경계를 확정하면 qa-designer의 검증 기준이 뒤따릅니다.
- 구조 또는 문서 정비: run-harness -> skill-scaffolder -> orchestrator -> validator
  - 역할 설명과 템플릿 반영이 중심이라 domain 재분석 없이 scaffolder부터 시작하는 경우가 많습니다.
- 경계 재정의가 필요한 변경: run-harness -> domain-analyst -> harness-architect -> qa-designer -> orchestrator -> validator
  - 기존 경계 가정이 바뀌면 구조 재설계(harness-architect)가 QA 기준 수립보다 앞에 옵니다.
- 검증 비용이 큰 변경: run-harness -> domain-analyst -> qa-designer -> orchestrator -> validator
  - 경계가 비교적 명확하지만 회귀 비용이 높아 qa-designer가 domain-analyst 직후에 붙어 검증 기준을 일찍 고정합니다.

### 운영 구조

- 신규 구축: 기본 파이프라인이 중심이 되고, 분기는 최소한으로 남습니다.
- 기존 확장: 현재 요청과 drift 지점이 만나는 역할에서 재진입이 시작됩니다.
- 운영 유지보수: validator와 session-log를 먼저 읽은 뒤, 되돌림 지점이 가장 짧은 루프가 선택됩니다.
- 팬아웃/팬인은 하위 영역 간 비교 축이 이미 정리된 경우에만 어울립니다.
- 문서와 로그에 남아야 하는 중심 역할은 팀 구조로 두고, 입력과 출력이 좁은 단발성 보조 판단만 별도 위임으로 고려합니다.
- 요청이 추상적이거나 맥락이 약하면 사용자 확인 질문과 탐색 보강부터 두고, 구조 재설계인지 운영 점검인지에 따라 루프를 고릅니다.

### 순서 조정 및 재진입 기준

- 시작 분기에서 뒤쪽 역할이 진입점이 되더라도, 앞 단계 판단이 이미 충분한 경우에만 일부 단계가 생략됩니다.
- 핵심 경계나 다중 모듈 영향이 보이면 qa-designer와 validator는 앞쪽에 남습니다.
- domain-analysis가 generic하거나 예외 메모가 비어 있으면 domain-analyst부터 다시 시작합니다.
- 구조 설명이 흐리면 harness-architect, 체크리스트가 약하면 qa-designer, handoff가 끊기면 orchestrator 재진입이 먼저 열립니다.

### 역할 간 handoff 규칙

- domain-analyst -> harness-architect: 실제 경계, 예외, 핵심 흐름이 정리되면 구조 책임으로 넘깁니다.
- harness-architect -> skill-scaffolder: 역할 책임과 출력 문서가 정리되면 로컬 스킬 설명과 템플릿 반영으로 넘깁니다.
- qa-designer -> orchestrator: 검토 질문과 최소 체크가 정리되면 어떤 루프로 운영할지 넘깁니다.
- validator -> orchestrator: 회귀, 누락, 재진입 필요 지점을 찾으면 다시 어떤 역할부터 돌릴지 되돌립니다.

### 피드백 루프

- validator가 generic 회귀를 발견하면 domain-analyst 또는 harness-architect 단계로 되돌립니다.
- qa-designer가 새 위험 축을 찾거나 session-log에 반복 우회 흐름이 쌓이면 orchestrator가 시작 분기와 검증 루프를 다시 조정하고, 필요하면 team-playbook과 함께 갱신합니다.

### 운영 원칙

- 작은 변경도 핵심 경계나 빌드 경계를 건드리면 별도 검증 루프로 올라갑니다.
- 문서 재생성에서는 기존 문장 보존보다 실제 저장소 분석 반영이 앞에 옵니다.
- 역할 호출 순서는 고정보다 영향 범위와 검증 비용에 따라 달라집니다.

## 다음 단계

- 반복적으로 등장하는 우회 흐름이 있으면 team-playbook과 함께 루프를 다시 압축합니다.
- run-harness 출력 계약이 실제 시작 분기와 어긋나지 않는지 validator로 다시 확인합니다.
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
## 목적

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

- 이 문서는 현재 저장소의 핵심 작업 축을 어떤 역할 팀이 나눠서 다뤄야 하는지 설명합니다.
- 역할 팀 구성은 저장소의 경계 종류와 검증 비용을 분리하기 위한 운영 장치입니다.

## 저장소 고유 근거

- QA가 중요한 이유: \`$key_axes_hint\` 축이 동시에 흔들리면 문서 정합성보다 실제 운영 리스크가 먼저 커지기 때문입니다.
- 경계 설명이 중요한 이유: 단일 수정처럼 보여도 실제로는 여러 소비 경계나 호출 경로로 전파될 수 있기 때문입니다.
- orchestrator와 validator가 중요한 이유: handoff 순서와 회귀 점검이 흐트러지면 운영 비용이 빠르게 늘기 때문입니다.

## 운영 규칙

### 팀 구성

- domain-analyst
- harness-architect
- skill-scaffolder
- qa-designer
- orchestrator
- validator
- run-harness

### 역할별 책임 요약

- domain-analyst: $key_axes_hint 축에서 사실 기준 분석을 맡습니다.
- harness-architect: 역할 경계와 구조 배치를 맡습니다.
- skill-scaffolder: 로컬 스킬과 템플릿 반영을 맡습니다.
- qa-designer: 품질 질문과 검토 기준 정리를 맡습니다.
- orchestrator: 역할 간 handoff와 재진입 흐름을 맡습니다.
- validator: 회귀와 누락 점검을 맡습니다.
- run-harness: 시작 역할 결정과 사용자 확인 질문을 맡습니다.

### 실전 분류 예시

- 변경 중심은 사용자 진입점, 공용 계층, 별도 실행 환경 중 어디에 가까운지로 갈립니다.
- 단일 수정처럼 보여도 소비 경로나 공용 계층까지 번지면 domain-analyst와 qa-designer가 더 앞에 옵니다.
- 문서 정비 요청이라도 handoff나 다음 진입점이 바뀌면 orchestrator와 validator가 함께 붙습니다.

### 운영 기준

- 역할 수는 많을수록 좋은 것이 아닙니다. 현재 저장소에서 실제로 구분이 필요한 책임 경계만큼만 팀을 구성합니다.
- 역할을 추가할 때는 기존 역할이 담당하기 어려운 새 책임 경계가 생긴 경우가 많습니다.
- 역할을 줄일 때는 두 역할의 산출물과 판단 기준이 실제로 겹칩니다.
- domain-analyst와 harness-architect는 서로 다른 층을 봅니다. domain-analyst는 사실 기반 경계 분석, harness-architect는 역할 구조 설계입니다.
- validator는 항상 유지합니다. 회귀와 누락 점검을 다른 역할이 겸하면 피드백 루프가 흐려집니다.

## 다음 단계

- 실제 저장소에서 자주 등장하는 변경 유형을 이 팀 구조의 실전 예시에 계속 누적합니다.
- architecture와 orchestration은 이 팀 구조 설명과 같은 경계를 함께 가리키는 편이 안정적입니다.
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
## 목적

이 문서는 프로젝트 로컬 실행 하네스 팀을 실제로 어떻게 시작하고 운용할지 요약합니다.

## 세션 시작 절차

1. 기본적으로는 run-harness를 실행 하네스 팀의 진입점으로 사용합니다.
2. run-harness는 현재 상태를 보고, 탐색 근거가 부족하면 사용자 확인 질문으로 이어지고, 근거가 충분하면 필요한 역할 우선순위가 정리됩니다.
3. 새 프로젝트에서는 domain-analyst부터 시작하는 흐름이 기본값에 가깝습니다.
4. 구조가 이미 있으면 orchestrator / validator 중심의 보강 루프가 더 자주 열립니다.

## 세션 시작 체크

- 현재 요청 한 줄 요약과 영향 범위가 먼저 기록됩니다.
- 직전 session-log를 읽으면 미해결 항목 연결 여부가 드러납니다.
- 이번 세션에서 먼저 읽을 문서는 1~2개로 좁혀집니다.

## 기본 운영 원칙

- 문서보다 역할 팀을 본체로 봅니다.
- \`.harness/reports\` 문서는 팀이 공유하는 보조 기준으로 사용합니다.
- 빈 저장소이거나 탐색 근거가 부족하면 역할 호출보다 사용자 확인 질문이 앞에 옵니다.
- validator 피드백이 나오면 architect / scaffolder / orchestrator 보강 루프가 다시 열립니다.
- QA 질문이 약하면 qa-designer 보강이 다시 붙습니다.
- 중요한 역할 호출이나 흐름 변경은 session-log에 남습니다.

## 로그 운영

- 로그 정책은 \`.harness/logging-policy.md\`에서 확인합니다.
- 역할별 누적 기록은 \`.harness/logs/session-log.md\`에 남깁니다.
- 구조화된 이벤트 원장은 \`.harness/logs/session-events.tsv\`를 사용합니다.
- 최신 세션 요약은 \`.harness/logs/latest-session-summary.md\`에서 확인합니다.
EOF
      if optional_harness_assets_enabled; then
        printf '%s\n' "- 역할 호출 빈도 집계는 \`.harness/logs/role-frequency.md\`에서 확인합니다."
        printf '%s\n' "- 반복 업무 템플릿 후보 분석 결과는 \`.harness/reports/template-candidates.md\`에서 확인합니다."
      fi
      ;;
    *)
      cat <<EOF
## 요약

- 이 문서는 현재 저장소의 실제 변경 경계를 기준으로 실행 하네스 팀을 어떻게 시작하고 되돌릴지 요약합니다.
- 빠른 체크리스트와 절차 문서는 함께 유지해야 세션 재진입 속도와 일관성이 올라갑니다.

## 저장소 고유 근거

- 먼저 읽는 문서는 보통 domain-analysis, orchestration-plan, qa-strategy 중 현재 요청과 직접 연결되는 문서입니다.
- 직전 session-log와 latest-session-summary는 현재 세션의 재진입 지점을 정하는 기본 근거가 됩니다.

## 운영 규칙

### 세션 시작 체크

- 직전 session-log와 latest-session-summary를 읽으면 미해결 항목과 재진입 지점이 드러납니다.
- domain-analysis, orchestration-plan, qa-strategy 중 이번 요청과 직접 연결되는 문서가 먼저 읽힙니다.
- 현재 요청 요약과 영향 범위는 session-log 앞부분에 남습니다.
- 직전 세션의 남은 약점이 이번 요청과 이어지는지 여부가 함께 보입니다.
- 먼저 읽을 문서와 나중에 볼 문서를 구분해 빠르게 시작하고, 역할 호출이나 전환 이유가 바뀌면 그 근거도 함께 남습니다.

### 역할 호출 순서

1. run-harness는 요청을 받고 $key_axes_hint 중 어느 축을 건드리는지 먼저 분류합니다.
2. 영향 범위가 넓거나 핵심 경계를 건드리는 요청에서는 domain-analyst와 qa-designer가 앞에 옵니다.
3. 구조 보강이 필요하면 harness-architect와 skill-scaffolder를 붙여 역할 설명과 템플릿을 맞춥니다.
4. orchestrator가 작업 루프와 검증 루프를 묶고 validator가 최종 구조를 점검합니다.

### 작업 유형별 운영 규칙

- 기능 또는 사용자 흐름 보강: domain-analysis와 qa-strategy가 먼저 읽히며 최소 회귀 범위가 고정됩니다.
- 구조 또는 경계 수정: 바뀐 책임 경계와 영향 전파 범위가 먼저 적히고 architect/qa 투입 시점이 갈립니다.
- 실행 또는 배포 경로 수정: 환경 차이와 최종 검증 경로를 분리해 기록합니다.
- 여러 경계를 가로지르는 수정: 소비자 경로와 핵심 경계 보강 여부가 앞에서 확인됩니다.
- 문서 재생성 또는 하네스 정비: wording보다 저장소 사실, 이번 세션의 남은 약점, 다음 진입점 유지 여부가 앞에 옵니다.

### 로그 운영

- 로그 정책은 \`.harness/logging-policy.md\`에서 확인합니다.
- 역할별 누적 기록은 \`.harness/logs/session-log.md\`에 남깁니다.
- 구조화된 이벤트 원장은 \`.harness/logs/session-events.tsv\`를 사용합니다.
- 최신 세션 요약은 \`.harness/logs/latest-session-summary.md\`에서 확인합니다.
EOF
      if optional_harness_assets_enabled; then
        printf '%s\n' "- 역할 호출 빈도 집계는 \`.harness/logs/role-frequency.md\`에서 확인합니다."
        printf '%s\n' "- 반복 업무 템플릿 후보 분석 결과는 \`.harness/reports/template-candidates.md\`에서 확인합니다."
      fi
      cat <<EOF

### 세션 종료 기준

- 이번 세션에서 시작 역할, handoff, 남은 약점은 session-log에 남습니다.
- validator 피드백이 있으면 다음 진입점이 명시된 채 세션이 닫힙니다.
- 재생성된 문서가 실제 저장소 분석을 잃지 않았는지 마지막 점검이 따라옵니다.

## 다음 단계

- 다음 세션이 바로 이어질 수 있게 시작 역할, 보강 역할, 남은 질문을 최신 요약에 반영합니다.
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
- 프로젝트 성격: 미정
- 설정 및 실행 단서: 미정
- 핵심 흐름: 미정
EOF
      ;;
    제한적)
      cat <<EOF
- 프로젝트 성격: $project_type_label
 - 주요 구조 단서: $boundary_hint
- 설정 및 실행 단서: $config_hint
- 핵심 흐름: $core_flow_hint
EOF
      ;;
    *)
      printf '%s\n' "- 프로젝트 성격: $project_type_label"
      [ "$config_hint" = "추정 불가" ] || printf '%s\n' "- 설정 및 실행 단서: $config_hint"
      printf '%s\n' "- 주요 구조 단서: $boundary_hint"
      [ "$key_axes_hint" = "$boundary_hint" ] || printf '%s\n' "- 핵심 작업 축: $key_axes_hint"
      printf '%s\n' "- 핵심 흐름: $core_flow_hint"
      ;;
  esac
}

build_next_step_line() {
  local exploration_context_level="$1"
  local context="${2:-init}"

  case "$exploration_context_level" in
    초기|제한적)
      if [ "$context" = "update" ]; then
        echo "- domain-analyst가 실제 저장소 구조를 읽고 내용을 구체화합니다."
      else
        echo "- 답변이 모이면 domain-analyst가 저장소 요약과 핵심 흐름을 구체화합니다."
      fi
      ;;
    *)
      echo "- domain-analyst가 자동 관찰 결과를 바탕으로 실제 코드 경로와 사용자 흐름 기준으로 분석을 보정합니다."
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

## 목적

이 문서는 실행 하네스 팀을 실제로 운용할 때 어떤 로그를 남겨야 하는지 정의합니다.

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
- `harness-template-candidates.sh`는 누적 로그를 분석해 반복 업무 템플릿 후보를 `.harness/reports/template-candidates.md`로 정리합니다.

## 로그를 남겨야 하는 상황

- run-harness로 팀을 시작했을 때
- 특정 역할을 직접 호출했을 때
- validator 피드백이 나왔을 때
- QA 질문이 보강되었을 때
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
- 가능하면 수동 편집보다 자동 append 스크립트를 우선 사용합니다.
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
