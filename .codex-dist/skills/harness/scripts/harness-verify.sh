#!/usr/bin/env bash
set -euo pipefail

FAILURES=0
WARNINGS=0
LOCAL_SKILLS_DIR=".codex/skills"

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
  content="$(echo "$line" | sed 's/^description:[[:space:]]*//')"

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

# 필수 디렉토리
check_dir "$LOCAL_SKILLS_DIR"
check_dir "$LOCAL_SKILLS_DIR/domain-analyst"
check_dir "$LOCAL_SKILLS_DIR/harness-architect"
check_dir "$LOCAL_SKILLS_DIR/skill-scaffolder"
check_dir "$LOCAL_SKILLS_DIR/qa-designer"
check_dir "$LOCAL_SKILLS_DIR/orchestrator"
check_dir "$LOCAL_SKILLS_DIR/validator"
check_dir "$LOCAL_SKILLS_DIR/run-harness"

check_dir ".harness"
check_dir ".harness/reports"

# 전역 references 확인
check_dir ".codex-dist/skills/harness/references"
check_file ".codex-dist/skills/harness/references/agent-design-patterns.md"
check_file ".codex-dist/skills/harness/references/orchestrator-template.md"
check_file ".codex-dist/skills/harness/references/skill-writing-guide.md"
check_file ".codex-dist/skills/harness/references/skill-testing-guide.md"
check_file ".codex-dist/skills/harness/references/qa-agent-guide.md"
check_file ".codex-dist/skills/harness/references/team-examples.md"

# 필수 로컬 역할 스킬
SKILL_FILES=(
  "$LOCAL_SKILLS_DIR/domain-analyst/SKILL.md"
  "$LOCAL_SKILLS_DIR/harness-architect/SKILL.md"
  "$LOCAL_SKILLS_DIR/skill-scaffolder/SKILL.md"
  "$LOCAL_SKILLS_DIR/qa-designer/SKILL.md"
  "$LOCAL_SKILLS_DIR/orchestrator/SKILL.md"
  "$LOCAL_SKILLS_DIR/validator/SKILL.md"
  "$LOCAL_SKILLS_DIR/run-harness/SKILL.md"
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

# 본체/보조 위계와 실행 팀 성격 힌트 확인
if [ -f "$LOCAL_SKILLS_DIR/orchestrator/SKILL.md" ]; then
  check_contains_hint "$LOCAL_SKILLS_DIR/orchestrator/SKILL.md" "중심 역할" "중심 역할 표현"
  check_contains_hint "$LOCAL_SKILLS_DIR/orchestrator/SKILL.md" "흐름" "흐름 설명"
  check_contains_hint "$LOCAL_SKILLS_DIR/orchestrator/SKILL.md" "연결" "연결 설명"
fi

if [ -f "$LOCAL_SKILLS_DIR/validator/SKILL.md" ]; then
  check_contains_hint "$LOCAL_SKILLS_DIR/validator/SKILL.md" "피드백" "피드백 루프 설명"
fi

if [ -f "$LOCAL_SKILLS_DIR/run-harness/SKILL.md" ]; then
  check_contains_hint "$LOCAL_SKILLS_DIR/run-harness/SKILL.md" "기동" "기동 엔트리포인트 설명"
  check_contains_hint "$LOCAL_SKILLS_DIR/run-harness/SKILL.md" "현재 상태" "현재 상태 기반 판단"
fi

if [ -f ".harness/reports/team-structure.md" ]; then
  check_contains_hint ".harness/reports/team-structure.md" "역할 팀" "역할 팀 설명"
fi

if [ -f ".harness/reports/team-playbook.md" ]; then
  check_contains_hint ".harness/reports/team-playbook.md" "시작 순서" "운영 시작 순서"
  check_contains_hint ".harness/reports/team-playbook.md" "운영 원칙" "운영 원칙"
fi

if [ "$FAILURES" -eq 0 ]; then
  log "검증 통과: 실행 하네스 팀 구조가 최소 요건을 만족합니다"
  if [ "$WARNINGS" -gt 0 ]; then
    warn "경고 수: $WARNINGS"
  fi
  exit 0
fi

fail "검증 실패: $FAILURES 개 문제 발견"
if [ "$WARNINGS" -gt 0 ]; then
  warn "경고 수: $WARNINGS"
fi
exit 1
