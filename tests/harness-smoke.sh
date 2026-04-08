#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HARNESS_SCRIPT_DIR="$ROOT_DIR/.codex-dist/skills/harness/scripts"
TMP_ROOT="/tmp/codex-harness-smoke"

fail() {
  printf '[test][harness-smoke][error] %s\n' "$1" >&2
  exit 1
}

log() {
  printf '[test][harness-smoke] %s\n' "$1"
}

assert_contains() {
  local haystack="$1"
  local needle="$2"
  local label="$3"

  if ! printf '%s' "$haystack" | grep -Fq "$needle"; then
    fail "$label: '$needle' 없음"
  fi
}

assert_file() {
  local path="$1"

  [ -f "$path" ] || fail "파일 누락: $path"
}

assert_dir() {
  local path="$1"

  [ -d "$path" ] || fail "디렉토리 누락: $path"
}

assert_command_fails_with() {
  local workdir="$1"
  local cmd="$2"
  local needle="$3"
  local label="$4"
  local output

  set +e
  output="$(cd "$workdir" && eval "$cmd" 2>&1)"
  local status=$?
  set -e

  [ "$status" -ne 0 ] || fail "$label: 실패해야 하는 명령이 성공함"
  printf '%s' "$output" | grep -Fq "$needle" || fail "$label: '$needle' 없음"
}

run_mode_check() {
  local expected="$1"
  local actual

  actual="$(bash -c ". \"$HARNESS_SCRIPT_DIR/harness-lib.sh\"; detect_harness_operation_mode" 2>/dev/null)"
  [ "$actual" = "$expected" ] || fail "운영 모드 불일치: expected=$expected actual=$actual"
  log "운영 모드 확인: $expected"
}

rm -rf "$TMP_ROOT"
mkdir -p "$TMP_ROOT"

log "bash 문법 확인"
bash -n "$HARNESS_SCRIPT_DIR/harness-lib.sh"
bash -n "$HARNESS_SCRIPT_DIR/harness-init.sh"
bash -n "$HARNESS_SCRIPT_DIR/harness-explore.sh"
bash -n "$HARNESS_SCRIPT_DIR/harness-update.sh"
bash -n "$HARNESS_SCRIPT_DIR/harness-verify.sh"
bash -n "$HARNESS_SCRIPT_DIR/harness-session-close.sh"

log "운영 모드 판정 확인"
mkdir -p "$TMP_ROOT/mode-empty"
(
  cd "$TMP_ROOT/mode-empty"
  run_mode_check "신규 구축"
)

mkdir -p "$TMP_ROOT/mode-expand/.codex/skills/existing"
(
  cd "$TMP_ROOT/mode-expand"
  run_mode_check "기존 확장"
)

mkdir -p "$TMP_ROOT/mode-maint/.codex/skills/existing"
mkdir -p "$TMP_ROOT/mode-maint/.harness/reports"
mkdir -p "$TMP_ROOT/mode-maint/.harness/logs"
touch "$TMP_ROOT/mode-maint/.harness/reports/domain-analysis.md"
touch "$TMP_ROOT/mode-maint/.harness/logs/session-log.md"
(
  cd "$TMP_ROOT/mode-maint"
  run_mode_check "운영 유지보수"
)

log "빈 프로젝트 탐색 문서 생성 확인"
mkdir -p "$TMP_ROOT/empty-explore-project"
(
  cd "$TMP_ROOT/empty-explore-project"
  bash "$HARNESS_SCRIPT_DIR/harness-explore.sh"
)
assert_file "$TMP_ROOT/empty-explore-project/.harness/reports/exploration-notes.md"

log "빈 프로젝트 update 차단 확인"
mkdir -p "$TMP_ROOT/empty-update-project"
assert_command_fails_with \
  "$TMP_ROOT/empty-update-project" \
  "bash \"$HARNESS_SCRIPT_DIR/harness-update.sh\"" \
  "update 대신 harness-init.sh를 사용해야 합니다." \
  "빈 프로젝트 update 차단"

log "빈 프로젝트 init -> verify 확인"
mkdir -p "$TMP_ROOT/empty-project"
EMPTY_INIT_OUTPUT="$(
  cd "$TMP_ROOT/empty-project" && \
  bash "$HARNESS_SCRIPT_DIR/harness-init.sh"
)"
assert_contains "$EMPTY_INIT_OUTPUT" "하네스 운영 모드: 신규 구축" "빈 프로젝트 init 로그"
assert_contains "$EMPTY_INIT_OUTPUT" "탐색 근거 문서: .harness/reports/exploration-notes.md" "빈 프로젝트 init 탐색 로그"
assert_dir "$TMP_ROOT/empty-project/.codex/skills/run-harness"
assert_dir "$TMP_ROOT/empty-project/.harness/reports"
assert_file "$TMP_ROOT/empty-project/.harness/project-setup.md"
assert_file "$TMP_ROOT/empty-project/.harness/reports/exploration-notes.md"
(
  cd "$TMP_ROOT/empty-project"
  bash "$HARNESS_SCRIPT_DIR/harness-verify.sh"
)

log "스택 프로젝트 update -> verify 확인"
mkdir -p "$TMP_ROOT/stack-project"
cat > "$TMP_ROOT/stack-project/package.json" <<'EOF'
{
  "name": "smoke-stack-project",
  "private": true,
  "scripts": {
    "test": "echo ok"
  }
}
EOF
mkdir -p "$TMP_ROOT/stack-explore-project"
cp "$TMP_ROOT/stack-project/package.json" "$TMP_ROOT/stack-explore-project/package.json"
(
  cd "$TMP_ROOT/stack-explore-project"
  bash "$HARNESS_SCRIPT_DIR/harness-explore.sh"
)
assert_file "$TMP_ROOT/stack-explore-project/.harness/reports/exploration-notes.md"
assert_contains "$(cat "$TMP_ROOT/stack-explore-project/.harness/reports/exploration-notes.md")" "## 대표 진입점" "탐색 문서 진입점 섹션"
STACK_INIT_OUTPUT="$(
  cd "$TMP_ROOT/stack-project" && \
  bash "$HARNESS_SCRIPT_DIR/harness-init.sh"
)"
assert_contains "$STACK_INIT_OUTPUT" "하네스 운영 모드: 신규 구축" "스택 프로젝트 init 로그"
STACK_UPDATE_OUTPUT="$(
  cd "$TMP_ROOT/stack-project" && \
  bash "$HARNESS_SCRIPT_DIR/harness-update.sh"
)"
assert_contains "$STACK_UPDATE_OUTPUT" "하네스 운영 모드: 운영 유지보수" "스택 프로젝트 update 로그"
assert_contains "$STACK_UPDATE_OUTPUT" "탐색 근거 문서: .harness/reports/exploration-notes.md" "스택 프로젝트 update 탐색 로그"
assert_file "$TMP_ROOT/stack-project/.harness/reports/domain-analysis.md"
assert_file "$TMP_ROOT/stack-project/.harness/reports/harness-architecture.md"
assert_file "$TMP_ROOT/stack-project/.harness/reports/exploration-notes.md"
(
  cd "$TMP_ROOT/stack-project"
  bash "$HARNESS_SCRIPT_DIR/harness-verify.sh"
)

log "선택 갱신 범위 확인"
rm -f "$TMP_ROOT/stack-project/.harness/reports/qa-strategy.md"
SELECTIVE_UPDATE_OUTPUT="$(
  cd "$TMP_ROOT/stack-project" && \
  bash "$HARNESS_SCRIPT_DIR/harness-update.sh" --domain
)"
assert_contains "$SELECTIVE_UPDATE_OUTPUT" "선택 갱신 대상: domain" "선택 갱신 로그"
assert_file "$TMP_ROOT/stack-project/.harness/reports/domain-analysis.md"
[ ! -f "$TMP_ROOT/stack-project/.harness/reports/qa-strategy.md" ] || fail "선택 갱신이 qa 보고서를 재생성함"

log "부분 구조 프로젝트 재구성 안내 확인"
mkdir -p "$TMP_ROOT/partial-project/.codex/skills/existing"
assert_command_fails_with \
  "$TMP_ROOT/partial-project" \
  "bash \"$HARNESS_SCRIPT_DIR/harness-update.sh\"" \
  "명시적 재구성이 적절합니다." \
  "부분 구조 update 차단"

log "harness smoke test 통과"
