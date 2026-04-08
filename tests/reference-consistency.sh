#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HARNESS_REF_DIR="$ROOT_DIR/.codex-dist/skills/harness/references"

fail() {
  printf '[test][reference-consistency][error] %s\n' "$1" >&2
  exit 1
}

log() {
  printf '[test][reference-consistency] %s\n' "$1"
}

assert_file_contains() {
  local path="$1"
  local needle="$2"
  local label="$3"

  grep -Fq -- "$needle" "$path" || fail "$label: '$needle' 없음 ($path)"
}

assert_file_not_contains() {
  local path="$1"
  local needle="$2"
  local label="$3"

  if grep -Fq -- "$needle" "$path"; then
    fail "$label: '$needle' 남아 있음 ($path)"
  fi
}

assert_count() {
  local path="$1"
  local needle="$2"
  local expected="$3"
  local label="$4"
  local actual

  actual="$(grep -Fc -- "$needle" "$path")"
  [ "$actual" = "$expected" ] || fail "$label: expected=$expected actual=$actual ($path)"
}

log "핵심 레퍼런스 구조 확인"
assert_file_contains "$HARNESS_REF_DIR/agent-design-patterns.md" "## 핵심 전제" "agent-design-patterns 핵심 전제"
assert_file_contains "$HARNESS_REF_DIR/agent-design-patterns.md" "## 6. 패턴 선택 기준" "agent-design-patterns 패턴 선택 기준"
assert_file_contains "$HARNESS_REF_DIR/agent-design-patterns.md" "## 13. 다른 레퍼런스와의 연결" "agent-design-patterns 연결 섹션"
assert_file_contains "$HARNESS_REF_DIR/agent-design-patterns.md" "Agent Teams / Subagents" "agent-design-patterns 실행 단위 용어"
assert_file_not_contains "$HARNESS_REF_DIR/agent-design-patterns.md" "## 6. 패턴 운영" "agent-design-patterns 과거 제목 제거"
assert_file_not_contains "$HARNESS_REF_DIR/agent-design-patterns.md" "장기 운영 팀 / 일회성 위임" "agent-design-patterns 과거 실행 단위 표현 제거"

assert_file_contains "$HARNESS_REF_DIR/orchestrator-template.md" "## 핵심 전제" "orchestrator-template 핵심 전제"
assert_file_contains "$HARNESS_REF_DIR/orchestrator-template.md" "## 6. 패턴 선택 기준" "orchestrator-template 패턴 선택 기준"
assert_file_contains "$HARNESS_REF_DIR/orchestrator-template.md" "## 13. 다른 레퍼런스와의 연결" "orchestrator-template 연결 섹션"
assert_file_contains "$HARNESS_REF_DIR/orchestrator-template.md" "Agent Teams" "orchestrator-template Agent Teams"
assert_file_contains "$HARNESS_REF_DIR/orchestrator-template.md" "Subagents" "orchestrator-template Subagents"
assert_file_not_contains "$HARNESS_REF_DIR/orchestrator-template.md" "## 6. 패턴 운영" "orchestrator-template 과거 제목 제거"

log "보조 레퍼런스 구조 확인"
assert_file_contains "$HARNESS_REF_DIR/qa-agent-guide.md" "## 핵심 전제" "qa-agent-guide 핵심 전제"
assert_file_contains "$HARNESS_REF_DIR/qa-agent-guide.md" "## 10. 다른 레퍼런스와의 연결" "qa-agent-guide 연결 섹션"
assert_count "$HARNESS_REF_DIR/qa-agent-guide.md" "## 9. 핵심 요약" 1 "qa-agent-guide 핵심 요약 번호"
assert_count "$HARNESS_REF_DIR/qa-agent-guide.md" "## 10. 다른 레퍼런스와의 연결" 1 "qa-agent-guide 연결 번호"

assert_file_contains "$HARNESS_REF_DIR/team-examples.md" "## 핵심 전제" "team-examples 핵심 전제"
assert_file_contains "$HARNESS_REF_DIR/team-examples.md" "## 예시를 읽는 방법" "team-examples 읽는 방법"
assert_file_contains "$HARNESS_REF_DIR/team-examples.md" "## 다른 레퍼런스와의 연결" "team-examples 연결 섹션"
assert_file_contains "$HARNESS_REF_DIR/team-examples.md" "## 핵심 요약" "team-examples 핵심 요약"

assert_file_contains "$HARNESS_REF_DIR/skill-writing-guide.md" "## 핵심 전제" "skill-writing-guide 핵심 전제"
assert_file_contains "$HARNESS_REF_DIR/skill-writing-guide.md" "## 10. 다른 레퍼런스와의 연결" "skill-writing-guide 연결 섹션"
assert_file_not_contains "$HARNESS_REF_DIR/skill-writing-guide.md" "## 9. 다른 레퍼런스와의 연결" "skill-writing-guide 과거 번호 제거"

assert_file_contains "$HARNESS_REF_DIR/skill-testing-guide.md" "## 핵심 전제" "skill-testing-guide 핵심 전제"
assert_file_contains "$HARNESS_REF_DIR/skill-testing-guide.md" "## 12. 다른 레퍼런스와의 연결" "skill-testing-guide 연결 섹션"
assert_file_not_contains "$HARNESS_REF_DIR/skill-testing-guide.md" "## 11. 다른 레퍼런스와의 연결" "skill-testing-guide 과거 번호 제거"

log "기준 문서 확인"
assert_file_contains "$HARNESS_REF_DIR/reference-writing-guide.md" "## 2. 공통 권장 구조" "reference-writing-guide 공통 구조"
assert_file_contains "$HARNESS_REF_DIR/reference-writing-guide.md" "## 3. 공통 용어" "reference-writing-guide 공통 용어"
assert_file_contains "$HARNESS_REF_DIR/reference-writing-guide.md" "Agent Teams" "reference-writing-guide Agent Teams"
assert_file_contains "$HARNESS_REF_DIR/reference-writing-guide.md" "## 7. 회귀 방지 원칙" "reference-writing-guide 회귀 방지"

log "reference consistency 통과"
