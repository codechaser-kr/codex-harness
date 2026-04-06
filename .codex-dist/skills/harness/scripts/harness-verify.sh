#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HARNESS_HOME="$(cd "$SCRIPT_DIR/.." && pwd)"
HARNESS_REFERENCE_DIR="$HARNESS_HOME/references"
HARNESS_SCRIPT_DIR="$HARNESS_HOME/scripts"

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

  if grep -q "$pattern" "$file"; then
    log "OK $label: $file"
  else
    warn "$label 힌트 부족: $file"
  fi
}

log "실행 하네스 팀 구조 검증 시작"
log "harness 기준 경로: $HARNESS_HOME"

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
check_file "$HARNESS_REFERENCE_DIR/orchestrator-template.md"
check_file "$HARNESS_REFERENCE_DIR/skill-writing-guide.md"
check_file "$HARNESS_REFERENCE_DIR/skill-testing-guide.md"
check_file "$HARNESS_REFERENCE_DIR/qa-agent-guide.md"
check_file "$HARNESS_REFERENCE_DIR/team-examples.md"

# harness 자동화 스크립트 확인
DIST_SCRIPT_FILES=(
  "$HARNESS_SCRIPT_DIR/harness-lib.sh"
  "$HARNESS_SCRIPT_DIR/harness-init.sh"
  "$HARNESS_SCRIPT_DIR/harness-plan.sh"
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
  ".harness/logs/logging-policy.md"
  ".harness/logs/session-log.md"
  ".harness/logs/session-events.tsv"
  ".harness/logs/latest-session-summary.md"
  ".harness/logs/role-frequency.md"
)

for file in "${LOG_FILES[@]}"; do
  check_file "$file"
done

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
fi

if [ -f ".harness/reports/team-structure.md" ]; then
  check_contains_hint ".harness/reports/team-structure.md" "역할 팀" "역할 팀 설명"
fi

if [ -f ".harness/reports/team-playbook.md" ]; then
  check_contains_hint ".harness/reports/team-playbook.md" "시작 순서" "운영 시작 순서"
  check_contains_hint ".harness/reports/team-playbook.md" "운영 원칙" "운영 원칙"
fi

if [ -f ".harness/logs/logging-policy.md" ]; then
  check_contains_hint ".harness/logs/logging-policy.md" "최소 로그 항목" "최소 로그 항목"
  check_contains_hint ".harness/logs/logging-policy.md" "호출" "역할 호출 로그 기준"
  check_contains_hint ".harness/logs/logging-policy.md" "harness-log.sh" "자동 append 도구"
  check_contains_hint ".harness/logs/logging-policy.md" "세션 종료" "세션 종료 자동 집계"
  check_contains_hint ".harness/logs/logging-policy.md" "호출 빈도" "역할 호출 빈도 통계"
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
fi

if [ "$FAILURES" -eq 0 ]; then
  log "검증 통과: 실행 하네스 팀 구조가 최소 요건을 만족합니다"
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
