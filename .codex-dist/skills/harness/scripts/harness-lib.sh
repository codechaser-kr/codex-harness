#!/usr/bin/env bash
# 이 파일은 소싱 전용입니다. 직접 실행하지 마세요.

EXPLORATION_NOTES_DEFAULT_PATH=".harness/docs/exploration-notes.md"

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
  local has_docs=0
  local has_logs=0

  if [ -d ".codex/skills" ] && find ".codex/skills" -mindepth 1 -maxdepth 1 -type d -print -quit | grep -q .; then
    has_skills=1
  fi

  if [ -d ".harness/docs" ] && find ".harness/docs" -mindepth 1 -maxdepth 1 -type f -name '*.md' -print -quit | grep -q .; then
    has_docs=1
  fi

  if [ -d ".harness/logs" ] && find ".harness/logs" -mindepth 1 -maxdepth 1 -type f -print -quit | grep -q .; then
    has_logs=1
  fi

  if [ "$has_skills" -eq 0 ] && [ "$has_docs" -eq 0 ] && [ "$has_logs" -eq 0 ]; then
    printf '%s\n' "신규 구축"
    return
  fi

  if [ "$has_skills" -eq 1 ] && [ "$has_docs" -eq 1 ] && [ "$has_logs" -eq 1 ]; then
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

  grep -Eo 'CLAUDE\.md|\.claude/agents|\.claude/skills' "AGENTS.md" \
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
  local doc_count=0
  local log_count=0

  [ -d ".codex/skills" ] && skill_count="$(find ".codex/skills" -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d '[:space:]')"
  [ -d ".harness/docs" ] && doc_count="$(find ".harness/docs" -mindepth 1 -maxdepth 1 -type f -name '*.md' | wc -l | tr -d '[:space:]')"
  [ -d ".harness/logs" ] && log_count="$(find ".harness/logs" -mindepth 1 -maxdepth 1 -type f | wc -l | tr -d '[:space:]')"

  printf '%s\n' "모드: $mode"
  printf '%s\n' "기존 로컬 역할 스킬 수: $skill_count"
  printf '%s\n' "기존 문서 수: $doc_count"
  printf '%s\n' "기존 로그 파일 수: $log_count"
}

optional_harness_assets_enabled() {
  if [ -d ".harness/templates" ] \
    || [ -d ".harness/scenarios" ] \
    || [ -f ".harness/logs/role-frequency.md" ] \
    || [ -f ".harness/docs/template-candidates.md" ]; then
    return 0
  fi
  return 1
}

project_setup_has_answers() {
  local file="${1:-.harness/docs/project-setup.md}"

  [ -f "$file" ] || return 1

  awk '
    BEGIN { in_answers = 0; found = 0 }
    /^[[:space:]]*---[[:space:]]*$/ {
      if (in_answers == 0) {
        in_answers = 1
        next
      }
      next
    }
    in_answers == 0 { next }
    /^[[:space:]]*$/ { next }
    /^[[:space:]]*#/ { next }
    /^[[:space:]]*>/ { next }
    /^[[:space:]]*<!--/ { next }
    /^[[:space:]]*-->/ { next }
    {
      found = 1
      exit 0
    }
    END { exit(found ? 0 : 1) }
  ' "$file" >/dev/null
}

exploration_requires_user_bootstrap() {
  ! project_setup_has_answers ".harness/docs/project-setup.md"
}

detect_exploration_context_level() {
  if project_setup_has_answers ".harness/docs/project-setup.md"; then
    printf '%s\n' "제한적"
  else
    printf '%s\n' "초기"
  fi
}

build_exploration_anchor_summary() {
  if project_setup_has_answers ".harness/docs/project-setup.md"; then
    printf '%s\n' "project-setup 입력이 있어 사용자 맥락을 함께 참조할 수 있습니다"
  else
    printf '%s\n' "입력 메모는 초기 상태만 전달하며, 사용자 입력과 역할 재해석이 필요합니다"
  fi
}

count_harness_skill_dirs() {
  [ -d ".codex/skills" ] || {
    printf '0\n'
    return
  }

  find ".codex/skills" -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d '[:space:]'
}

count_harness_report_files() {
  [ -d ".harness/docs" ] || {
    printf '0\n'
    return
  }

  find ".harness/docs" -mindepth 1 -maxdepth 1 -type f -name '*.md' | wc -l | tr -d '[:space:]'
}

count_harness_log_files() {
  [ -d ".harness/logs" ] || {
    printf '0\n'
    return
  }

  find ".harness/logs" -mindepth 1 -maxdepth 1 -type f | wc -l | tr -d '[:space:]'
}

build_exploration_guidance() {
  local file="$1"
  local exploration_context_level="$2"
  local boundary_hint="$3"

  if [ "$exploration_context_level" = "초기" ]; then
    printf '%s\n' "입력 메모만으로는 방향을 좁히기 어렵습니다. 사용자 입력과 역할 재해석을 함께 사용합니다."
    return
  fi

  printf '%s\n' "사용자 입력과 현재 저장소를 함께 다시 읽어, 역할 스킬이 최종 문서를 직접 작성합니다."
}

ensure_harness_log_scaffold() {
  local harness_dir=".harness"
  local log_dir="$harness_dir/logs"
  local doc_dir="$harness_dir/docs"
  local logging_policy_file="$doc_dir/logging-policy.md"
  local session_log_file="$log_dir/session-log.md"
  local events_file="$log_dir/session-events.tsv"
  local latest_summary_file="$log_dir/latest-session-summary.md"
  local role_frequency_file="$log_dir/role-frequency.md"

  mkdir -p "$harness_dir" "$doc_dir" "$log_dir"

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
- `harness-init`는 하네스 골격 준비로 기록하고, 실제 역할 실행 세션은 `run-harness` 또는 개별 역할 이름으로 분리해 남깁니다.
- 최신 요약은 다음 시작 역할, 다음 재진입 phase, 남은 위험뿐 아니라 다음 시작 전에 다시 읽을 입력 파일과 최근 출력 파일까지 바로 읽을 수 있어야 합니다.

## 선택 자산

- 선택 자산이 활성화된 프로젝트에서는 `harness-session-close.sh`가 역할 호출 빈도 통계와 템플릿 후보 분석까지 함께 갱신합니다.
- `harness-role-stats.sh`는 누적 로그를 기준으로 역할 호출 빈도 통계를 다시 계산합니다.
- `harness-template-candidates.sh`는 누적 로그를 분석한 반복 업무 템플릿 후보 메모를 `.harness/docs/template-candidates.md`로 남깁니다.

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
- 다음 재진입 phase
- 다음 시작 전 우선 확인 입력 파일
- 최근 출력 파일
- 남은 약점 또는 미해결 항목
- 세션 종료 사유

## 원칙

- 로그는 짧지만 구조적으로 남깁니다.
- 사람이 읽을 수 있어야 합니다.
- 역할 흐름과 피드백 루프가 보이도록 남깁니다.
- 다음 실행자가 바로 다시 시작할 수 있을 정도로 재진입 정보가 남아야 합니다.
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
- 다음 재진입 phase:
- 남은 약점:
- 세션 종료 사유:

---

## 예시

### 세션

- 시각: YYYY-MM-DD HH:MM
- 세션 ID: session-YYYYMMDD-HHMMSS
- 상태: completed
- 시작 요청: 현재 프로젝트 하네스를 초기화해줘
- 진입점: harness-init
- 호출 역할: -
- 입력 파일: 없음
- 출력 파일: AGENTS.md, .codex/config.toml, .harness/docs/exploration-notes.md
- 다음 권장 역할: run-harness
- 다음 재진입 phase: Phase 1
- 남은 약점: 역할 팀이 아직 최종 보고서를 작성하지 않음
- 세션 종료 사유: 초기화 완료, 역할 실행 전 종료

---

### 세션

- 시각: YYYY-MM-DD HH:MM
- 세션 ID: session-YYYYMMDD-HHMMSS
- 상태: started
- 시작 요청: 현재 프로젝트에 하네스 팀을 한 번 돌려줘
- 진입점: run-harness
- 호출 역할: <project-role-1>, <project-role-2>
- 입력 파일: 없음
- 출력 파일: .harness/docs/domain-analysis.md, .harness/docs/harness-architecture.md
- 다음 권장 역할: <project-role-3>
- 다음 재진입 phase: Phase 4
- 남은 약점: QA 질문이 아직 추상적임
- 세션 종료 사유: QA 기준 보강 필요
EOF
  fi

  if [ ! -f "$events_file" ]; then
    printf 'timestamp\tsession_id\tstatus\trequest\tentry_point\troles\tinputs\toutputs\tnext_role\tweaknesses\tnote\n' > "$events_file"
  fi

  if [ ! -f "$latest_summary_file" ]; then
    cat > "$latest_summary_file" <<'EOF'
# 최신 세션 요약

아직 종료된 세션 집계가 없습니다.

최신 세션 요약에는 최소한 아래를 남깁니다.

- 현재 종료된 세션 ID
- 다음 시작 역할
- 다음 재진입 phase
- 다음 시작 전 우선 확인 입력 파일
- 최근 출력 파일
- 남은 위험 또는 미해결 항목
- 세션 종료 메모
EOF
  fi

  if optional_harness_assets_enabled "$EXPLORATION_NOTES_DEFAULT_PATH" && [ ! -f "$role_frequency_file" ]; then
    cat > "$role_frequency_file" <<'EOF'
# 역할 호출 빈도

아직 집계된 역할 호출 통계가 없습니다.
EOF
  fi
}
