#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HARNESS_HOME="$(cd "$SCRIPT_DIR/.." && pwd)"
HARNESS_REFERENCE_DIR="$HARNESS_HOME/references"
HARNESS_SCRIPT_DIR="$HARNESS_HOME/scripts"
. "$SCRIPT_DIR/harness-lib.sh"

FAILURES=0
WARNINGS=0

log() {
  printf '[harness][verify] %s\n' "$1"
}

warn() {
  printf '[harness][verify][warn] %s\n' "$1"
  WARNINGS=$((WARNINGS + 1))
}

fail() {
  printf '[harness][verify][error] %s\n' "$1"
  FAILURES=$((FAILURES + 1))
}

check_dir() {
  local dir="$1"
  if [ -d "$dir" ]; then
    log "OK 디렉토리: $dir"
  else
    fail "누락된 디렉토리: $dir"
  fi
}

check_file() {
  local file="$1"
  if [ -f "$file" ]; then
    log "OK 파일: $file"
  else
    fail "누락된 파일: $file"
  fi
}

check_frontmatter_name() {
  local file="$1"
  if grep -q '^name:' "$file"; then
    log "OK name 필드: $file"
  else
    fail "name 필드 누락: $file"
  fi
}

check_frontmatter_description() {
  local file="$1"
  if grep -q '^description:' "$file"; then
    log "OK description 필드: $file"
  else
    fail "description 필드 누락: $file"
  fi
}

check_description_length() {
  local file="$1"
  local line
  line="$(grep '^description:' "$file" || true)"

  if [ -z "$line" ]; then
    fail "description 검사를 할 수 없음: $file"
    return
  fi

  local content
  content="$(printf '%s\n' "$line" | sed 's/^description:[[:space:]]*//')"

  if [ "${#content}" -lt 20 ]; then
    warn "description이 너무 짧을 수 있음: $file"
  else
    log "OK description 길이: $file"
  fi
}

check_contains_hint() {
  local file="$1"
  local pattern="$2"
  local label="$3"

  if grep -q -- "$pattern" "$file"; then
    log "OK $label: $file"
  else
    warn "$label 힌트 부족: $file"
  fi
}

check_contains_any_hint() {
  local file="$1"
  local pattern="$2"
  local label="$3"

  if grep -Eq -- "$pattern" "$file"; then
    log "OK $label: $file"
  else
    warn "$label 힌트 부족: $file"
  fi
}

check_required_any_hint() {
  local file="$1"
  local pattern="$2"
  local label="$3"

  if grep -Eq -- "$pattern" "$file"; then
    log "OK $label: $file"
  else
    fail "$label 누락: $file"
  fi
}

check_placeholder_state() {
  local file="$1"
  local pattern="$2"
  local label="$3"

  if grep -Eq -- "$pattern" "$file"; then
    if [ "$EXPLORATION_CONTEXT_LEVEL" = "충분" ]; then
      fail "$label 미해결: $file"
    elif [ "$EXPLORATION_CONTEXT_LEVEL" = "초기" ]; then
      log "OK $label 초기값 유지: $file"
    else
      warn "$label 미해결: $file"
    fi
  else
    log "OK $label: $file"
  fi
}

count_markdown_bullets_under_h2() {
  local file="$1"
  local heading="$2"

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
    in_section && $0 ~ /^- / && $0 ~ /`/ {
      count++
    }
    END {
      if (in_section && printed == 0) {
        print count
      }
    }
  ' "$file"
}

warn_if_anchor_count_below() {
  local file="$1"
  local heading="$2"
  local min_count="$3"
  local label="$4"
  local count

  count="$(count_markdown_bullets_under_h2 "$file" "$heading" | tr -d '[:space:]')"

  if ! printf '%s' "$count" | grep -qE '^[0-9]+$'; then
    warn "$label 개수를 계산하지 못함: $file"
    return
  fi

  if [ "$count" -lt "$min_count" ]; then
    warn "$label 부족: $file (현재 ${count}개, 권장 ${min_count}개 이상)"
  else
    log "OK $label 개수: $file (${count}개)"
  fi
}

audit_harness_drift() {
  local mode="$1"
  local skill_count="$2"
  local report_count="$3"
  local log_count="$4"
  local exploration_context_level="$5"

  if [ "$mode" = "기존 확장" ]; then
    if [ "$skill_count" -gt 0 ] && [ "$report_count" -eq 0 ]; then
      warn "하네스 drift 가능성: 역할 스킬은 있으나 보고서가 비어 있습니다"
    fi

    if [ "$report_count" -gt 0 ] && [ "$skill_count" -eq 0 ]; then
      warn "하네스 drift 가능성: 보고서는 있으나 역할 스킬이 비어 있습니다"
    fi

    if [ "$skill_count" -gt 0 ] && [ "$log_count" -eq 0 ]; then
      warn "하네스 drift 가능성: 역할 스킬은 있으나 로그 구조가 비어 있습니다"
    fi
  fi

  if [ "$mode" = "운영 유지보수" ] && [ "$exploration_context_level" = "충분" ]; then
    if [ -f ".harness/reports/orchestration-plan.md" ] && ! grep -Eq 'run-harness|시작 역할|진입점' ".harness/reports/orchestration-plan.md"; then
      warn "운영 drift 가능성: orchestration-plan이 run-harness 진입 규칙을 충분히 설명하지 않습니다"
    fi

    if [ -f ".harness/logging-policy.md" ] && { [ -f ".harness/logs/role-frequency.md" ] || [ -f ".harness/reports/template-candidates.md" ]; } && ! grep -Eq '선택 자산|호출 빈도|template-candidates|템플릿 후보' ".harness/logging-policy.md"; then
      warn "운영 drift 가능성: 로그 정책이 선택 자산 운영 규칙을 충분히 설명하지 않습니다"
    fi
  fi
}

HARNESS_SKILL_COUNT="$(count_harness_skill_dirs)"
HARNESS_REPORT_COUNT="$(count_harness_report_files)"
HARNESS_LOG_COUNT="$(count_harness_log_files)"
HARNESS_OPERATION_MODE="$(detect_harness_operation_mode)"
EXPLORATION_NOTES_FILE=".harness/reports/exploration-notes.md"
EXPLORATION_CONTEXT_LEVEL="$(detect_exploration_context_level "$EXPLORATION_NOTES_FILE")"
EXPLORATION_ANCHOR_SUMMARY="$(build_exploration_anchor_summary "$EXPLORATION_NOTES_FILE")"

log "실행 하네스 팀 구조 검증 시작"
log "harness 기준 경로: $HARNESS_HOME"
log "탐색 상태: $EXPLORATION_CONTEXT_LEVEL"
log "탐색 근거 요약: $EXPLORATION_ANCHOR_SUMMARY"
log "하네스 운영 모드: $HARNESS_OPERATION_MODE"
log "하네스 감사: 기존 로컬 역할 스킬 수: $HARNESS_SKILL_COUNT"
log "하네스 감사: 기존 보고서 수: $HARNESS_REPORT_COUNT"
log "하네스 감사: 기존 로그 파일 수: $HARNESS_LOG_COUNT"
audit_harness_drift "$HARNESS_OPERATION_MODE" "$HARNESS_SKILL_COUNT" "$HARNESS_REPORT_COUNT" "$HARNESS_LOG_COUNT" "$EXPLORATION_CONTEXT_LEVEL"

# 필수 디렉토리
check_dir ".codex/skills"
check_dir ".codex/skills/domain-analyst"
check_dir ".codex/skills/harness-architect"
check_dir ".codex/skills/skill-scaffolder"
check_dir ".codex/skills/qa-designer"
check_dir ".codex/skills/orchestrator"
check_dir ".codex/skills/validator"
check_dir ".codex/skills/run-harness"

check_dir ".harness"
check_dir ".harness/reports"
check_dir ".harness/logs"

# harness references 확인
check_dir "$HARNESS_REFERENCE_DIR"
check_file "$HARNESS_REFERENCE_DIR/agent-design-patterns.md"
check_file "$HARNESS_REFERENCE_DIR/exploration-model.md"
check_file "$HARNESS_REFERENCE_DIR/orchestrator-template.md"
check_file "$HARNESS_REFERENCE_DIR/skill-writing-guide.md"
check_file "$HARNESS_REFERENCE_DIR/skill-testing-guide.md"
check_file "$HARNESS_REFERENCE_DIR/qa-agent-guide.md"
check_file "$HARNESS_REFERENCE_DIR/team-examples.md"

# harness 자동화 스크립트 확인
DIST_SCRIPT_FILES=(
  "$HARNESS_SCRIPT_DIR/harness-lib.sh"
  "$HARNESS_SCRIPT_DIR/harness-init.sh"
  "$HARNESS_SCRIPT_DIR/harness-explore.sh"
  "$HARNESS_SCRIPT_DIR/harness-update.sh"
  "$HARNESS_SCRIPT_DIR/harness-verify.sh"
  "$HARNESS_SCRIPT_DIR/harness-log.sh"
  "$HARNESS_SCRIPT_DIR/harness-session-close.sh"
  "$HARNESS_SCRIPT_DIR/harness-role-stats.sh"
  "$HARNESS_SCRIPT_DIR/harness-template-candidates.sh"
)

for file in "${DIST_SCRIPT_FILES[@]}"; do
  check_file "$file"
done

# 필수 로컬 역할 스킬
SKILL_FILES=(
  ".codex/skills/domain-analyst/SKILL.md"
  ".codex/skills/harness-architect/SKILL.md"
  ".codex/skills/skill-scaffolder/SKILL.md"
  ".codex/skills/qa-designer/SKILL.md"
  ".codex/skills/orchestrator/SKILL.md"
  ".codex/skills/validator/SKILL.md"
  ".codex/skills/run-harness/SKILL.md"
)

for file in "${SKILL_FILES[@]}"; do
  check_file "$file"
done

# 로컬 역할 스킬 최소 품질 점검
for file in "${SKILL_FILES[@]}"; do
  if [ -f "$file" ]; then
    check_frontmatter_name "$file"
    check_frontmatter_description "$file"
    check_description_length "$file"
    check_contains_hint "$file" "## 목적" "목적 섹션"
    check_contains_hint "$file" "## 주요 작업" "주요 작업 섹션"
    check_contains_hint "$file" "## 입력" "입력 섹션"
    check_contains_hint "$file" "## 출력" "출력 섹션"
    check_contains_hint "$file" "## 역할 팀 내 위치" "역할 팀 위치 섹션"
    check_contains_hint "$file" "## 협업 원칙" "협업 원칙 섹션"
    check_contains_hint "$file" "## 운영 규칙" "운영 규칙 섹션"
  fi
done

# 실행 하네스 팀 보조 리포트
REPORT_FILES=(
  ".harness/reports/domain-analysis.md"
  ".harness/reports/harness-architecture.md"
  ".harness/reports/qa-strategy.md"
  ".harness/reports/orchestration-plan.md"
  ".harness/reports/team-structure.md"
  ".harness/reports/team-playbook.md"
)

for file in "${REPORT_FILES[@]}"; do
  check_file "$file"
done

# 로그 구조
LOG_FILES=(
  ".harness/logs/session-log.md"
  ".harness/logs/session-events.tsv"
  ".harness/logs/latest-session-summary.md"
)

for file in "${LOG_FILES[@]}"; do
  check_file "$file"
done

check_file ".harness/logging-policy.md"
check_file ".harness/reports/exploration-notes.md"

# 본체/보조 위계와 실행 팀 성격 힌트 확인
if [ -f ".codex/skills/orchestrator/SKILL.md" ]; then
  check_contains_hint ".codex/skills/orchestrator/SKILL.md" "중심 역할" "중심 역할 표현"
  check_contains_hint ".codex/skills/orchestrator/SKILL.md" "흐름" "흐름 설명"
  check_contains_hint ".codex/skills/orchestrator/SKILL.md" "연결" "연결 설명"
fi

if [ -f ".codex/skills/validator/SKILL.md" ]; then
  check_contains_hint ".codex/skills/validator/SKILL.md" "피드백" "피드백 루프 설명"
fi

if [ -f ".codex/skills/run-harness/SKILL.md" ]; then
  check_contains_hint ".codex/skills/run-harness/SKILL.md" "기동" "기동 엔트리포인트 설명"
  check_contains_hint ".codex/skills/run-harness/SKILL.md" "현재 상태" "현재 상태 기반 판단"
  check_contains_hint ".codex/skills/run-harness/SKILL.md" "분류" "요청 유형 분류"
  check_contains_hint ".codex/skills/run-harness/SKILL.md" "영향 범위" "영향 범위 판단"
  check_contains_hint ".codex/skills/run-harness/SKILL.md" "질문" "사용자 질문 유도"
  check_contains_any_hint ".codex/skills/run-harness/SKILL.md" "출력 계약|현재 시작 역할|보강 필요 역할|추가 질문" "출력 계약"
  check_contains_any_hint ".codex/skills/run-harness/SKILL.md" "신규 구축|기존 확장|운영 유지보수" "운영 모드 진입 규칙"
  check_contains_any_hint ".codex/skills/run-harness/SKILL.md" "명시적 재구성|재구성" "재구성 판단 규칙"
  check_contains_any_hint ".codex/skills/run-harness/SKILL.md" "--domain|--qa|--architecture|--orchestration|--team-structure|--team-playbook" "선택 갱신 예시"
fi

if [ -f ".harness/reports/team-structure.md" ]; then
  check_contains_hint ".harness/reports/team-structure.md" "역할 팀" "역할 팀 설명"
fi

if [ -f ".harness/reports/domain-analysis.md" ]; then
  check_placeholder_state ".harness/reports/domain-analysis.md" "프로젝트 유형: (미정|unknown)" "프로젝트 유형 구체화"
  check_placeholder_state ".harness/reports/domain-analysis.md" "주요 기술 스택( 추정)?: (미정|추정 불가)" "기술 스택 구체화"
  check_placeholder_state ".harness/reports/domain-analysis.md" "핵심 흐름: 미정" "핵심 흐름 구체화"
  check_placeholder_state ".harness/reports/domain-analysis.md" "저장소를 분석한 뒤 이 내용을 구체화하세요|domain-analyst가 실제 저장소 구조를 읽고 내용을 구체화합니다" "도메인 분석 초안 치환"
fi

if [ -f ".harness/reports/team-playbook.md" ]; then
  check_contains_any_hint ".harness/reports/team-playbook.md" "세션 시작 절차|세션 시작 체크|시작 체크|시작 순서" "운영 시작 순서"
  check_contains_hint ".harness/reports/team-playbook.md" "운영 원칙" "운영 원칙"
fi

if [ -f ".harness/logging-policy.md" ]; then
  check_contains_hint ".harness/logging-policy.md" "최소 로그 항목" "최소 로그 항목"
  check_contains_hint ".harness/logging-policy.md" "호출" "역할 호출 로그 기준"
  check_contains_hint ".harness/logging-policy.md" "harness-log.sh" "자동 append 도구"
  check_contains_hint ".harness/logging-policy.md" "세션 종료" "세션 종료 자동 집계"
  check_contains_hint ".harness/logging-policy.md" "호출 빈도" "역할 호출 빈도 통계"
fi

if [ -f ".harness/reports/exploration-notes.md" ]; then
  check_contains_hint ".harness/reports/exploration-notes.md" "## 대표 진입점" "탐색 진입점 섹션"
  check_contains_hint ".harness/reports/exploration-notes.md" "## 주요 코드 경계" "탐색 코드 경계 섹션"
  check_contains_hint ".harness/reports/exploration-notes.md" "## 테스트 및 검증 자산" "탐색 테스트 자산 섹션"
  check_contains_hint ".harness/reports/exploration-notes.md" "## 설정 및 실행 경로" "탐색 설정 경로 섹션"
  check_contains_hint ".harness/reports/exploration-notes.md" "## 저장소 고유 용어 단서" "탐색 도메인 단서 섹션"
fi

if [ -f ".harness/logs/session-log.md" ]; then
  check_contains_hint ".harness/logs/session-log.md" "세션 ID" "세션 ID 로그"
  check_contains_hint ".harness/logs/session-log.md" "상태" "세션 상태 로그"
  check_contains_hint ".harness/logs/session-log.md" "시작 요청" "시작 요청 로그"
  check_contains_hint ".harness/logs/session-log.md" "진입점" "진입점 로그"
  check_contains_hint ".harness/logs/session-log.md" "다음 권장 역할" "다음 권장 역할 로그"
fi

check_contains_hint ".harness/logs/session-events.tsv" "session_id" "세션 이벤트 헤더"
check_contains_hint ".harness/logs/session-events.tsv" "status" "이벤트 상태 헤더"

if [ -f ".harness/logs/latest-session-summary.md" ]; then
  check_contains_hint ".harness/logs/latest-session-summary.md" "세션 요약" "최신 세션 요약"
fi

if [ -f ".harness/logs/role-frequency.md" ]; then
  check_contains_hint ".harness/logs/role-frequency.md" "역할 호출 빈도" "역할 빈도 보고서"
else
  log "선택 자산 생략: .harness/logs/role-frequency.md"
fi

if [ "$EXPLORATION_CONTEXT_LEVEL" = "초기" ]; then
  warn "빈 프로젝트 또는 프로젝트 단서가 거의 없는 저장소로 판단됨: 구조 검증과 사용자 질문 유도 기본값 중심으로 확인합니다"

  if [ -f ".harness/reports/domain-analysis.md" ]; then
    check_contains_any_hint ".harness/reports/domain-analysis.md" "프로젝트 유형: (미정|unknown)" "빈 프로젝트용 프로젝트 유형 기본값"
    check_contains_any_hint ".harness/reports/domain-analysis.md" "가장 먼저 성공|첫 성공|핵심 흐름 한 가지|가장 먼저 동작해야 할 핵심 흐름" "빈 프로젝트용 첫 성공 흐름 질문"
  fi
fi

if [ "$EXPLORATION_CONTEXT_LEVEL" = "제한적" ]; then
  warn "저장소 단서가 제한적입니다: 역할 추천 전에 사용자 질문 유도 흐름이 중요합니다"

  if [ -f ".harness/reports/domain-analysis.md" ]; then
    check_contains_hint ".harness/reports/domain-analysis.md" "사용자 확인 질문" "저신호 저장소용 질문 섹션"
  fi

  if [ -f ".harness/reports/team-playbook.md" ]; then
    check_contains_hint ".harness/reports/team-playbook.md" "사용자 확인 질문" "저신호 저장소용 사용자 질문 우선 흐름"
  fi
fi

if [ "$EXPLORATION_CONTEXT_LEVEL" = "충분" ]; then
  log "프로젝트 단서가 충분한 저장소로 판단됨: 프로젝트 특화 초안이 남아 있으면 실패로 처리합니다"

  if [ -f ".codex/skills/run-harness/SKILL.md" ]; then
    check_contains_any_hint ".codex/skills/run-harness/SKILL.md" "기존 확장|운영 유지보수|harness-update|update.sh" "run-harness update 진입 규칙"
  fi

  if [ -f ".harness/reports/domain-analysis.md" ]; then
    check_required_any_hint ".harness/reports/domain-analysis.md" "저장소 고유 근거|소스 앵커" "도메인 분석 저장소 고유 근거"
    check_contains_any_hint ".harness/reports/domain-analysis.md" "사실 기준 구조|주요 구조 단서|구조 단서" "도메인 분석 구조 요약"
    check_contains_any_hint ".harness/reports/domain-analysis.md" "예외 및 운영 메모|예외 메모|운영 메모" "도메인 분석 예외 메모"
    check_contains_any_hint ".harness/reports/domain-analysis.md" "핵심 실행 흐름|핵심 흐름|실행 흐름" "도메인 분석 핵심 흐름"
    check_contains_any_hint ".harness/reports/domain-analysis.md" "반복적으로 위험한 변경 유형|위험 변경 유형|위험 축" "도메인 분석 위험 요약"
    warn_if_anchor_count_below ".harness/reports/domain-analysis.md" "저장소 고유 근거" 3 "도메인 분석 소스 앵커"
  fi

  if [ -f ".harness/reports/harness-architecture.md" ]; then
    check_contains_any_hint ".harness/reports/harness-architecture.md" "저장소 특성 요약|프로젝트 성격|대표 흐름" "아키텍처 저장소 특성 요약"
    check_contains_any_hint ".harness/reports/harness-architecture.md" "역할별 초점|권장 역할|역할별 책임" "아키텍처 역할 배치"
    check_contains_any_hint ".harness/reports/harness-architecture.md" "보조 구조|reports|logs|templates|scenarios" "아키텍처 보조 구조"
    check_contains_any_hint ".harness/reports/harness-architecture.md" "7역할 유지 기준|역할 유지 기준|역할 수" "아키텍처 역할 유지 기준"
    check_contains_any_hint ".harness/reports/harness-architecture.md" "아키텍처 패턴 선택 기준|패턴 선택 기준|파이프라인|팬아웃|운영 유지보수" "아키텍처 패턴 선택 기준"
    check_contains_any_hint ".harness/reports/harness-architecture.md" "역할 분리 판단 기준|분리 판단 기준|입력과 출력|위임 비용" "아키텍처 역할 분리 기준"
    check_contains_any_hint ".harness/reports/harness-architecture.md" "축소/확장 판단|축소|확장" "아키텍처 축소 확장 기준"
    check_contains_any_hint ".harness/reports/harness-architecture.md" "설계 원칙|원칙" "아키텍처 설계 원칙"
  fi

  if [ -f ".harness/reports/qa-strategy.md" ]; then
    check_contains_any_hint ".harness/reports/qa-strategy.md" "핵심 품질 축|품질 축" "QA 핵심 품질 축"
    check_contains_any_hint ".harness/reports/qa-strategy.md" "우선 검토 질문|검토 질문|핵심 질문" "QA 검토 질문"
    check_contains_any_hint ".harness/reports/qa-strategy.md" "변경 유형별 최소 체크|최소 체크|변경 유형" "QA 변경 유형별 최소 체크"
    check_contains_any_hint ".harness/reports/qa-strategy.md" "테스트 설계 기준|테스트 기준|설계 기준" "QA 테스트 설계 기준"
    check_contains_any_hint ".harness/reports/qa-strategy.md" "추가 확인 관점|경계별 추가 확인|추가 확인|영향 전파|소비 경로" "QA 추가 확인 기준"
  fi

  if [ -f ".harness/reports/orchestration-plan.md" ]; then
    check_contains_any_hint ".harness/reports/orchestration-plan.md" "시작 분기|진입점 규칙|시작점" "오케스트레이션 시작 분기"
    check_contains_any_hint ".harness/reports/orchestration-plan.md" "표준 전체 시퀀스|표준 시퀀스|전체 순서" "오케스트레이션 표준 전체 시퀀스"
    check_contains_any_hint ".harness/reports/orchestration-plan.md" "작업 축별 권장 루프|대표 요청별 루프|작업 유형별 대표 루프|작업 유형별 루프|권장 루프|시작 루프" "오케스트레이션 작업 유형별 루프"
    check_contains_any_hint ".harness/reports/orchestration-plan.md" "운영 패턴 선택 기준|패턴 선택 기준|신규 구축|기존 확장|운영 유지보수" "오케스트레이션 패턴 선택 기준"
    check_contains_any_hint ".harness/reports/orchestration-plan.md" "순서 조정 및 재진입 기준|순서 조정 규칙|순서 조정|조정 규칙|재진입 기준" "오케스트레이션 순서 조정 규칙"
    check_contains_any_hint ".harness/reports/orchestration-plan.md" "현재 상태 판단 규칙|현재 상태 판단|재진입 기준|재진입|다시 시작" "오케스트레이션 현재 상태 판단"
    check_contains_any_hint ".harness/reports/orchestration-plan.md" "역할 간 handoff 규칙|handoff|역할 간 연결" "오케스트레이션 handoff 규칙"
    check_contains_any_hint ".harness/reports/orchestration-plan.md" "피드백 루프|되돌림|피드백" "오케스트레이션 피드백 루프"
  fi

  if [ -f ".harness/reports/team-structure.md" ]; then
    check_contains_any_hint ".harness/reports/team-structure.md" "역할 팀 해석|역할별 책임 요약" "팀 구조 해석"
    check_contains_any_hint ".harness/reports/team-structure.md" "저장소 고유 근거|저장소 맞춤 근거|저장소 근거|맞춤 근거|왜 .* 중요한 이유" "팀 구조 저장소 맞춤 근거"
  fi

  if [ -f ".harness/reports/team-playbook.md" ]; then
    check_contains_any_hint ".harness/reports/team-playbook.md" "실제 변경 경계|영향 범위|핵심 경계" "플레이북 변경 경계 기준"
    check_contains_any_hint ".harness/reports/team-playbook.md" "문서 재생성은 실제 저장소 분석|실제 저장소 분석을 반영|일반론으로 되돌아가면 안 됩니다|wording보다 저장소 사실|저장소 분석을 잃지 않았는지" "플레이북 재생성 원칙"
    check_contains_any_hint ".harness/reports/team-playbook.md" "세션 시작 체크|세션 시작 절차|시작 체크|시작 순서" "플레이북 세션 시작 규칙"
    check_contains_any_hint ".harness/reports/team-playbook.md" "작업 유형별 빠른 운영 규칙|작업 유형별 운영 규칙|운영 규칙" "플레이북 작업 유형별 운영 규칙"
    check_contains_any_hint ".harness/reports/team-playbook.md" "세션 종료 기준|세션 종료|종료 기준" "플레이북 세션 종료 기준"
  fi

  if [ -f ".harness/reports/exploration-notes.md" ]; then
    warn_if_anchor_count_below ".harness/reports/exploration-notes.md" "대표 진입점" 1 "탐색 대표 진입점"
    warn_if_anchor_count_below ".harness/reports/exploration-notes.md" "주요 코드 경계" 1 "탐색 주요 코드 경계"
  fi
fi

if [ "$FAILURES" -eq 0 ]; then
  if [ "$EXPLORATION_CONTEXT_LEVEL" = "초기" ]; then
    log "검증 통과: 빈 프로젝트용 하네스 구조와 질문 유도 기본값이 최소 요건을 만족합니다"
  elif [ "$EXPLORATION_CONTEXT_LEVEL" = "제한적" ]; then
    log "검증 통과: 저신호 저장소용 하네스 구조와 질문 유도 흐름이 최소 요건을 만족합니다"
  else
    log "검증 통과: 실행 하네스 팀 구조가 최소 요건을 만족합니다"
  fi
  if [ "$WARNINGS" -gt 0 ]; then
    warn "경고 수: $WARNINGS"
  fi
  exit 0
fi

printf '[harness][verify][error] 검증 실패: %s 개 문제 발견\n' "$FAILURES"
if [ "$WARNINGS" -gt 0 ]; then
  warn "경고 수: $WARNINGS"
fi
exit 1
