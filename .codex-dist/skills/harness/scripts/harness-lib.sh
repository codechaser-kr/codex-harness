#!/usr/bin/env bash
# 이 파일은 소싱 전용입니다. 직접 실행하지 마세요.

trim_text() {
  local value="$1"
  value="${value//$'\t'/ }"
  value="${value//$'\n'/ }"
  value="${value//$'\r'/ }"
  printf '%s' "$value" | sed 's/[[:space:]]\+/ /g; s/^ //; s/ $//'
}

detect_project_type() {
  if [ -f "package.json" ]; then
    echo "node"
    return
  fi

  if [ -f "Cargo.toml" ]; then
    echo "rust"
    return
  fi

  if [ -f "pyproject.toml" ] || [ -f "requirements.txt" ]; then
    echo "python"
    return
  fi

  if [ -f "go.mod" ]; then
    echo "go"
    return
  fi

  echo "unknown"
}

detect_stack_hint() {
  local hints=()

  [ -f "package.json" ] && hints+=("Node.js")
  [ -f "Cargo.toml" ] && hints+=("Rust")
  [ -f "pyproject.toml" ] && hints+=("Python")
  [ -f "requirements.txt" ] && hints+=("Python")
  [ -f "go.mod" ] && hints+=("Go")
  [ -f "tsconfig.json" ] && hints+=("TypeScript")
  [ -f "vite.config.ts" ] && hints+=("Vite")
  [ -f "next.config.js" ] && hints+=("Next.js")
  [ -f "next.config.mjs" ] && hints+=("Next.js")

  if [ "${#hints[@]}" -eq 0 ]; then
    echo "추정 불가"
    return
  fi

  local IFS=", "
  echo "${hints[*]}"
}

detect_project_signal_level() {
  if [ -f "package.json" ] || [ -f "Cargo.toml" ] || [ -f "pyproject.toml" ] || [ -f "requirements.txt" ] || [ -f "go.mod" ]; then
    echo "stack"
    return
  fi

  local first_signal_path
  first_signal_path="$(
    find . -mindepth 1 -maxdepth 2 \
      ! -path './.git' ! -path './.git/*' \
      ! -path './.codex' ! -path './.codex/*' \
      ! -path './.harness' ! -path './.harness/*' \
      ! -name '.gitignore' \
      ! -name '.DS_Store' \
      -print -quit
  )"

  if [ -n "$first_signal_path" ]; then
    echo "low"
    return
  fi

  echo "empty"
}

detect_structure_hint() {
  local hints=()
  local candidate

  for candidate in src app lib cmd internal pkg packages services server client web api backend frontend docs tests test; do
    if [ -d "$candidate" ]; then
      hints+=("$candidate/")
    fi
  done

  if [ -f "README.md" ]; then
    hints+=("README.md")
  fi

  if [ "${#hints[@]}" -eq 0 ]; then
    echo "뚜렷한 핵심 디렉토리 없음"
    return
  fi

  local limited=("${hints[@]:0:5}")
  local IFS=", "
  echo "${limited[*]}"
}

build_core_flow_hint() {
  case "$1" in
    empty)
      echo "미정"
      ;;
    low)
      echo "저장소 단서가 제한적이므로 README, 핵심 디렉토리, 사용자 확인 질문을 함께 보며 첫 성공 흐름을 정리해야 합니다."
      ;;
    *)
      case "$2" in
        node)
          echo "package.json과 $3 기준으로 애플리케이션 진입점, 주요 모듈, 실행 또는 빌드 흐름을 우선 정리해야 합니다."
          ;;
        rust)
          echo "Cargo.toml과 $3 기준으로 크레이트 진입점, 명령 실행 흐름, 주요 모듈 연결을 우선 정리해야 합니다."
          ;;
        python)
          echo "Python 설정 파일과 $3 기준으로 실행 진입점, 패키지 구조, 핵심 스크립트 흐름을 우선 정리해야 합니다."
          ;;
        go)
          echo "go.mod와 $3 기준으로 main 패키지, 내부 패키지 연결, 실행 흐름을 우선 정리해야 합니다."
          ;;
        *)
          echo "$3 기준으로 저장소의 핵심 사용자 흐름과 주요 변경 영향 지점을 우선 정리해야 합니다."
          ;;
      esac
      ;;
  esac
}

build_initial_observation() {
  case "$1" in
    empty)
      echo "- 저장소를 분석한 뒤 이 내용을 구체화하세요."
      ;;
    low)
      echo "- 현재 저장소 단서가 제한적이므로 구조 단서와 사용자 응답을 함께 모아 초기 분석을 보강하세요."
      ;;
    *)
      echo "- 자동 재분석 결과: $2 를 중심으로 첫 분석 초안을 만들었습니다."
      ;;
  esac
}

build_next_step_line() {
  local signal_level="$1"
  local context="${2:-init}"

  case "$signal_level" in
    empty|low)
      if [ "$context" = "refresh" ]; then
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
- 전역 설치된 `harness-session-close.sh`는 세션 종료 시 최신 세션 요약과 역할 호출 빈도 통계를 자동 갱신합니다.
- 전역 설치된 `harness-role-stats.sh`는 누적 로그를 기준으로 역할 호출 빈도 통계를 다시 계산합니다.
- 전역 설치된 `harness-template-candidates.sh`는 누적 로그를 분석해 반복 업무 템플릿 후보를 `.harness/reports/template-candidates.md`로 정리합니다.

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

  if [ ! -f "$role_frequency_file" ]; then
    cat > "$role_frequency_file" <<'EOF'
# 역할 호출 빈도

아직 집계된 역할 호출 통계가 없습니다.
EOF
  fi
}
