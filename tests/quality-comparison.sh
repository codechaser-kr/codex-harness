#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HARNESS_REF_DIR="$ROOT_DIR/.codex-dist/skills/harness/references"
HARNESS_SKILL_FILE="$ROOT_DIR/.codex-dist/skills/harness/SKILL.md"

fail() {
  printf '[test][quality-comparison][error] %s\n' "$1" >&2
  exit 1
}

log() {
  printf '[test][quality-comparison] %s\n' "$1"
}

assert_file_contains() {
  local path="$1"
  local needle="$2"
  local label="$3"

  grep -Fq -- "$needle" "$path" || fail "$label: '$needle' 없음 ($path)"
}

QUALITY_REF="$HARNESS_REF_DIR/quality-evaluation-guide.md"

log "품질 비교 기준 문서 확인"
assert_file_contains "$QUALITY_REF" "## 핵심 전제" "quality guide 핵심 전제"
assert_file_contains "$QUALITY_REF" "without-skill" "quality guide without-skill"
assert_file_contains "$QUALITY_REF" "with-skill" "quality guide with-skill"
assert_file_contains "$QUALITY_REF" "시작 역할 판단" "quality guide 시작 역할 판단"
assert_file_contains "$QUALITY_REF" "사용자 질문 절제" "quality guide 질문 절제"
assert_file_contains "$QUALITY_REF" "handoff 명확성" "quality guide handoff 명확성"
assert_file_contains "$QUALITY_REF" "저장소 근거 연결" "quality guide 저장소 근거 연결"
assert_file_contains "$QUALITY_REF" "검증 가능성" "quality guide 검증 가능성"
assert_file_contains "$QUALITY_REF" "## 6. 다른 레퍼런스와의 연결" "quality guide 연결 섹션"

log "상위 스킬 연결 확인"
assert_file_contains "$HARNESS_SKILL_FILE" "without-skill" "skill 품질 비교 기준선"
assert_file_contains "$HARNESS_SKILL_FILE" "quality-evaluation-guide.md" "skill 품질 비교 레퍼런스 연결"
assert_file_contains "$HARNESS_REF_DIR/skill-testing-guide.md" "quality-evaluation-guide.md" "skill-testing-guide 품질 비교 연결"

log "quality comparison 기준 통과"
