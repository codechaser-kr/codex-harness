#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HARNESS_SCRIPT_DIR="$ROOT_DIR/.codex-dist/skills/harness/scripts"
HARNESS_REF_DIR="$ROOT_DIR/.codex-dist/skills/harness/references"
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

  if ! printf '%s' "$haystack" | grep -Fq -- "$needle"; then
    fail "$label: '$needle' 없음"
  fi
}

assert_not_contains() {
  local haystack="$1"
  local needle="$2"
  local label="$3"

  if printf '%s' "$haystack" | grep -Fq -- "$needle"; then
    fail "$label: '$needle' 포함됨"
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
  printf '%s' "$output" | grep -Fq -- "$needle" || fail "$label: '$needle' 없음"
}

setup_test_artifacts() {
  local project_path="$1"

  mkdir -p "$project_path/.claude/commands"
  cat > "$project_path/.claude/note-explorer-implementation-plan.md" <<'EOF'
# note explorer plan
EOF
  cat > "$project_path/.claude/commands/branch.md" <<'EOF'
# branch command
EOF
  mkdir -p "$project_path/.cursor/commands" "$project_path/.cursor/rules"
  cat > "$project_path/.cursor/commands/propose-commit-message.md" <<'EOF'
# commit command
EOF
  cat > "$project_path/.cursor/rules/user_rules.md" <<'EOF'
# user rules
EOF
  cat > "$project_path/CLAUDE.md" <<'EOF'
# claude contract
EOF
  mkdir -p "$project_path/build/win/win-unpacked/resources"
  touch "$project_path/build/win/win-unpacked/resources/app.asar"
  mkdir -p "$project_path/packages/app/node_modules/example/test"
  cat > "$project_path/packages/app/node_modules/example/test/example.test.js" <<'EOF'
test("example", () => true);
EOF
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
mkdir -p "$TMP_ROOT/stack-project/src" "$TMP_ROOT/stack-project/tests"
cat > "$TMP_ROOT/stack-project/src/main.ts" <<'EOF'
export function main() {
  return "ok";
}
EOF
mkdir -p "$TMP_ROOT/stack-project/src/com.example"
cat > "$TMP_ROOT/stack-project/src/com.example/Main.kt" <<'EOF'
class Main
EOF
cat > "$TMP_ROOT/stack-project/src/app.ts" <<'EOF'
export const appName = "smoke-stack-project";
EOF
cat > "$TMP_ROOT/stack-project/tests/app.test.ts" <<'EOF'
import { appName } from "../src/app";

if (appName !== "smoke-stack-project") {
  throw new Error("unexpected app name");
}
EOF
setup_test_artifacts "$TMP_ROOT/stack-project"
mkdir -p "$TMP_ROOT/stack-explore-project"
cp "$TMP_ROOT/stack-project/package.json" "$TMP_ROOT/stack-explore-project/package.json"
mkdir -p "$TMP_ROOT/stack-explore-project/src" "$TMP_ROOT/stack-explore-project/tests"
cp "$TMP_ROOT/stack-project/src/main.ts" "$TMP_ROOT/stack-explore-project/src/main.ts"
mkdir -p "$TMP_ROOT/stack-explore-project/src/com.example"
cp "$TMP_ROOT/stack-project/src/com.example/Main.kt" "$TMP_ROOT/stack-explore-project/src/com.example/Main.kt"
cp "$TMP_ROOT/stack-project/src/app.ts" "$TMP_ROOT/stack-explore-project/src/app.ts"
cp "$TMP_ROOT/stack-project/tests/app.test.ts" "$TMP_ROOT/stack-explore-project/tests/app.test.ts"
setup_test_artifacts "$TMP_ROOT/stack-explore-project"
(
  cd "$TMP_ROOT/stack-explore-project"
  bash "$HARNESS_SCRIPT_DIR/harness-explore.sh"
)
assert_file "$TMP_ROOT/stack-explore-project/.harness/reports/exploration-notes.md"
assert_contains "$(cat "$TMP_ROOT/stack-explore-project/.harness/reports/exploration-notes.md")" "## 대표 진입점" "탐색 문서 진입점 섹션"
assert_contains "$(cat "$TMP_ROOT/stack-explore-project/.harness/reports/exploration-notes.md")" '`src/main.ts`' "탐색 문서 대표 진입점 앵커"
assert_contains "$(cat "$TMP_ROOT/stack-explore-project/.harness/reports/exploration-notes.md")" '`tests/app.test.ts`' "탐색 문서 테스트 자산 앵커"
assert_contains "$(cat "$TMP_ROOT/stack-explore-project/.harness/reports/exploration-notes.md")" '`src/com.example`' "탐색 문서 점 포함 디렉토리 경계"
assert_not_contains "$(cat "$TMP_ROOT/stack-explore-project/.harness/reports/exploration-notes.md")" ".claude/" "탐색 문서 AI 설정 디렉토리 제외"
assert_not_contains "$(cat "$TMP_ROOT/stack-explore-project/.harness/reports/exploration-notes.md")" ".cursor/" "탐색 문서 cursor 디렉토리 제외"
assert_not_contains "$(cat "$TMP_ROOT/stack-explore-project/.harness/reports/exploration-notes.md")" "CLAUDE.md" "탐색 문서 AI 컨텍스트 파일 제외"
assert_not_contains "$(cat "$TMP_ROOT/stack-explore-project/.harness/reports/exploration-notes.md")" "node_modules/" "탐색 문서 의존성 테스트 제외"
assert_not_contains "$(cat "$TMP_ROOT/stack-explore-project/.harness/reports/exploration-notes.md")" "app.asar" "탐색 문서 빌드 산출물 제외"
STACK_INIT_OUTPUT="$(
  cd "$TMP_ROOT/stack-project" && \
  bash "$HARNESS_SCRIPT_DIR/harness-init.sh"
)"
assert_contains "$STACK_INIT_OUTPUT" "하네스 운영 모드: 신규 구축" "스택 프로젝트 init 로그"
assert_contains "$STACK_INIT_OUTPUT" "탐색 근거 요약: 대표 진입점" "스택 프로젝트 init 탐색 요약"
STACK_UPDATE_OUTPUT="$(
  cd "$TMP_ROOT/stack-project" && \
  bash "$HARNESS_SCRIPT_DIR/harness-update.sh"
)"
assert_contains "$STACK_UPDATE_OUTPUT" "하네스 운영 모드: 운영 유지보수" "스택 프로젝트 update 로그"
assert_contains "$STACK_UPDATE_OUTPUT" "탐색 근거 문서: .harness/reports/exploration-notes.md" "스택 프로젝트 update 탐색 로그"
assert_contains "$STACK_UPDATE_OUTPUT" "탐색 근거 요약: 대표 진입점" "스택 프로젝트 update 탐색 요약"
assert_contains "$STACK_UPDATE_OUTPUT" "상위 컨텍스트 감사: AGENTS.md 상태: 없음" "스택 프로젝트 update agents 감사"
assert_file "$TMP_ROOT/stack-project/.harness/reports/domain-analysis.md"
assert_file "$TMP_ROOT/stack-project/.harness/reports/harness-architecture.md"
assert_file "$TMP_ROOT/stack-project/.harness/reports/exploration-notes.md"
assert_contains "$(cat "$TMP_ROOT/stack-project/.harness/reports/exploration-notes.md")" '`src/main.ts`' "생성된 탐색 문서 대표 진입점"
assert_contains "$(cat "$TMP_ROOT/stack-project/.harness/reports/exploration-notes.md")" '`src/com.example`' "생성된 탐색 문서 점 포함 디렉토리 경계"
assert_not_contains "$(cat "$TMP_ROOT/stack-project/.harness/reports/exploration-notes.md")" ".claude/" "생성된 탐색 문서 AI 설정 디렉토리 제외"
assert_not_contains "$(cat "$TMP_ROOT/stack-project/.harness/reports/exploration-notes.md")" ".cursor/" "생성된 탐색 문서 cursor 디렉토리 제외"
assert_not_contains "$(cat "$TMP_ROOT/stack-project/.harness/reports/exploration-notes.md")" "CLAUDE.md" "생성된 탐색 문서 AI 컨텍스트 파일 제외"
assert_not_contains "$(cat "$TMP_ROOT/stack-project/.harness/reports/exploration-notes.md")" "node_modules/" "생성된 탐색 문서 의존성 테스트 제외"
assert_not_contains "$(cat "$TMP_ROOT/stack-project/.harness/reports/exploration-notes.md")" "app.asar" "생성된 탐색 문서 빌드 산출물 제외"
assert_not_contains "$(cat "$TMP_ROOT/stack-project/.harness/reports/domain-analysis.md")" ".claude/" "domain-analysis AI 설정 디렉토리 제외"
assert_not_contains "$(cat "$TMP_ROOT/stack-project/.harness/reports/domain-analysis.md")" ".cursor/" "domain-analysis cursor 디렉토리 제외"
assert_not_contains "$(cat "$TMP_ROOT/stack-project/.harness/reports/domain-analysis.md")" "node_modules/" "domain-analysis 의존성 테스트 제외"
assert_not_contains "$(cat "$TMP_ROOT/stack-project/.harness/reports/domain-analysis.md")" "app.asar" "domain-analysis 빌드 산출물 제외"
STACK_VERIFY_OUTPUT="$(
  cd "$TMP_ROOT/stack-project" && \
  bash "$HARNESS_SCRIPT_DIR/harness-verify.sh"
)"

log "다중 실행 경계 탐색 확인"
mkdir -p "$TMP_ROOT/multi-boundary-project/packages/web/src" \
  "$TMP_ROOT/multi-boundary-project/packages/desktop/src" \
  "$TMP_ROOT/multi-boundary-project/packages/common/src"
cat > "$TMP_ROOT/multi-boundary-project/package.json" <<'EOF'
{
  "name": "multi-boundary-project",
  "private": true
}
EOF
cat > "$TMP_ROOT/multi-boundary-project/packages/web/package.json" <<'EOF'
{ "name": "@example/web" }
EOF
cat > "$TMP_ROOT/multi-boundary-project/packages/desktop/package.json" <<'EOF'
{ "name": "@example/desktop" }
EOF
cat > "$TMP_ROOT/multi-boundary-project/packages/common/package.json" <<'EOF'
{ "name": "@example/common" }
EOF
cat > "$TMP_ROOT/multi-boundary-project/packages/web/src/main.ts" <<'EOF'
export const web = true;
EOF
cat > "$TMP_ROOT/multi-boundary-project/packages/desktop/src/main.ts" <<'EOF'
export const desktop = true;
EOF
cat > "$TMP_ROOT/multi-boundary-project/packages/common/src/index.ts" <<'EOF'
export const common = true;
EOF
(
  cd "$TMP_ROOT/multi-boundary-project"
  bash "$HARNESS_SCRIPT_DIR/harness-explore.sh"
)
assert_contains "$(cat "$TMP_ROOT/multi-boundary-project/.harness/reports/exploration-notes.md")" '`packages/web`' "다중 경계 탐색 web 경계"
assert_contains "$(cat "$TMP_ROOT/multi-boundary-project/.harness/reports/exploration-notes.md")" '`packages/desktop`' "다중 경계 탐색 desktop 경계"
assert_contains "$(cat "$TMP_ROOT/multi-boundary-project/.harness/reports/exploration-notes.md")" '`packages/common`' "다중 경계 탐색 common 경계"
assert_contains "$(cat "$TMP_ROOT/multi-boundary-project/.harness/reports/exploration-notes.md")" '`packages/web/src/main.ts`' "다중 경계 탐색 web 진입점"
assert_contains "$(cat "$TMP_ROOT/multi-boundary-project/.harness/reports/exploration-notes.md")" '`packages/desktop/src/main.ts`' "다중 경계 탐색 desktop 진입점"

log "harness smoke test 통과"
