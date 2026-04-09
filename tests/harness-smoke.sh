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

log "내부 설계 레퍼런스 용어 확인"
assert_contains "$(cat "$HARNESS_REF_DIR/agent-design-patterns.md")" "Agent Teams / Subagents" "agent-design-patterns 실행 단위 용어"
assert_contains "$(cat "$HARNESS_REF_DIR/agent-design-patterns.md")" "## 핵심 전제" "agent-design-patterns 핵심 전제"
assert_contains "$(cat "$HARNESS_REF_DIR/agent-design-patterns.md")" "## 6. 패턴 선택 기준" "agent-design-patterns 패턴 선택 기준"
assert_contains "$(cat "$HARNESS_REF_DIR/agent-design-patterns.md")" "## 13. 다른 레퍼런스와의 연결" "agent-design-patterns 레퍼런스 연결"
assert_contains "$(cat "$HARNESS_REF_DIR/orchestrator-template.md")" "## 6. 패턴 선택 기준" "orchestrator-template 패턴 선택 기준"
assert_contains "$(cat "$HARNESS_REF_DIR/orchestrator-template.md")" "## 핵심 전제" "orchestrator-template 핵심 전제"
assert_contains "$(cat "$HARNESS_REF_DIR/orchestrator-template.md")" "## 13. 다른 레퍼런스와의 연결" "orchestrator-template 레퍼런스 연결"
assert_contains "$(cat "$HARNESS_REF_DIR/orchestrator-template.md")" "Agent Teams" "orchestrator-template agent teams 용어"
assert_contains "$(cat "$HARNESS_REF_DIR/orchestrator-template.md")" "Subagents" "orchestrator-template subagents 용어"
assert_contains "$(cat "$HARNESS_REF_DIR/qa-agent-guide.md")" "## 핵심 전제" "qa-agent-guide 핵심 전제"
assert_contains "$(cat "$HARNESS_REF_DIR/qa-agent-guide.md")" "## 10. 다른 레퍼런스와의 연결" "qa-agent-guide 레퍼런스 연결"
assert_contains "$(cat "$HARNESS_REF_DIR/team-examples.md")" "## 핵심 전제" "team-examples 핵심 전제"
assert_contains "$(cat "$HARNESS_REF_DIR/team-examples.md")" "## 다른 레퍼런스와의 연결" "team-examples 레퍼런스 연결"
assert_contains "$(cat "$HARNESS_REF_DIR/skill-writing-guide.md")" "## 핵심 전제" "skill-writing-guide 핵심 전제"
assert_contains "$(cat "$HARNESS_REF_DIR/skill-writing-guide.md")" "## 10. 다른 레퍼런스와의 연결" "skill-writing-guide 레퍼런스 연결"
assert_contains "$(cat "$HARNESS_REF_DIR/skill-testing-guide.md")" "## 핵심 전제" "skill-testing-guide 핵심 전제"
assert_contains "$(cat "$HARNESS_REF_DIR/skill-testing-guide.md")" "## 12. 다른 레퍼런스와의 연결" "skill-testing-guide 레퍼런스 연결"
assert_file "$HARNESS_REF_DIR/reference-writing-guide.md"
assert_contains "$(cat "$HARNESS_REF_DIR/reference-writing-guide.md")" "## 2. 공통 권장 구조" "reference-writing-guide 공통 구조"
assert_contains "$(cat "$HARNESS_REF_DIR/reference-writing-guide.md")" "## 3. 공통 용어" "reference-writing-guide 공통 용어"
assert_contains "$(cat "$HARNESS_REF_DIR/reference-writing-guide.md")" "Agent Teams" "reference-writing-guide 내부 설계 용어"
assert_contains "$(cat "$HARNESS_REF_DIR/reference-writing-guide.md")" "## 7. 회귀 방지 원칙" "reference-writing-guide 회귀 방지"
assert_file "$HARNESS_REF_DIR/agents-sync-guide.md"
assert_contains "$(cat "$HARNESS_REF_DIR/agents-sync-guide.md")" "## 핵심 전제" "agents-sync-guide 핵심 전제"
assert_contains "$(cat "$HARNESS_REF_DIR/agents-sync-guide.md")" "## 3. 판단 결과" "agents-sync-guide 판단 결과"
assert_contains "$(cat "$HARNESS_REF_DIR/agents-sync-guide.md")" "정렬됨" "agents-sync-guide 정렬 상태"
assert_contains "$(cat "$HARNESS_REF_DIR/agents-sync-guide.md")" "재구성 필요" "agents-sync-guide 재구성 상태"
assert_file "$HARNESS_REF_DIR/phase-selection-matrix.md"
assert_contains "$(cat "$HARNESS_REF_DIR/phase-selection-matrix.md")" "## 핵심 전제" "phase-selection-matrix 핵심 전제"
assert_contains "$(cat "$HARNESS_REF_DIR/phase-selection-matrix.md")" "## 2. 변경 유형별 권장 재진입" "phase-selection-matrix 재진입 기준"
assert_contains "$(cat "$HARNESS_REF_DIR/phase-selection-matrix.md")" "Phase 1 저장소 분석" "phase-selection-matrix phase 1"
assert_contains "$(cat "$HARNESS_REF_DIR/phase-selection-matrix.md")" "AGENTS.md와 하네스 운영 계약이 충돌하는 경우" "phase-selection-matrix agents 충돌"

log "내부 설계 레퍼런스 일관성 검사"
bash "$ROOT_DIR/tests/reference-consistency.sh"

log "품질 비교 기준 검사"
bash "$ROOT_DIR/tests/quality-comparison.sh"

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
assert_dir "$TMP_ROOT/empty-project/.codex/agents"
assert_dir "$TMP_ROOT/empty-project/.harness/reports"
assert_file "$TMP_ROOT/empty-project/.harness/project-setup.md"
assert_file "$TMP_ROOT/empty-project/.harness/reports/exploration-notes.md"
assert_contains "$(cat "$TMP_ROOT/empty-project/.harness/project-setup.md")" "## 프로젝트 성격" "project-setup 프로젝트 성격 항목"
assert_contains "$(cat "$TMP_ROOT/empty-project/.harness/project-setup.md")" "## 대표 진입점 또는 시작 경로" "project-setup 진입점 항목"
assert_contains "$(cat "$TMP_ROOT/empty-project/.harness/project-setup.md")" "## 현재 알고 있는 주요 경계" "project-setup 경계 항목"
assert_contains "$(cat "$TMP_ROOT/empty-project/.harness/project-setup.md")" "## 현재 알고 있는 실행·검증 경로" "project-setup 실행 검증 경로 항목"
assert_contains "$(cat "$TMP_ROOT/empty-project/.codex/skills/run-harness/SKILL.md")" "harness-update.sh" "run-harness update 진입 규칙"
assert_contains "$(cat "$TMP_ROOT/empty-project/.codex/skills/run-harness/SKILL.md")" "명시적 재구성" "run-harness 재구성 규칙"
assert_contains "$(cat "$TMP_ROOT/empty-project/.codex/skills/run-harness/SKILL.md")" "--domain" "run-harness 선택 갱신 예시"
assert_contains "$(cat "$TMP_ROOT/empty-project/.codex/skills/run-harness/SKILL.md")" "팀 구조로 유지" "run-harness 실행 단위 판단"
assert_contains "$(cat "$TMP_ROOT/empty-project/.codex/skills/run-harness/SKILL.md")" "일회성 위임" "run-harness 보조 위임 판단"
assert_contains "$(cat "$TMP_ROOT/empty-project/.codex/skills/run-harness/SKILL.md")" "생성-검증" "run-harness 패턴 판단"
assert_contains "$(cat "$TMP_ROOT/empty-project/.codex/skills/run-harness/SKILL.md")" "저장소 고유 용어" "run-harness 사용자 맥락 판단"
assert_contains "$(cat "$TMP_ROOT/empty-project/.codex/skills/run-harness/SKILL.md")" "domain-analyst의 근거 제외 규칙" "run-harness 근거 제외 규칙 위임"
assert_file "$TMP_ROOT/empty-project/.codex/agents/run-harness.md"
assert_contains "$(cat "$TMP_ROOT/empty-project/.codex/agents/run-harness.md")" "## 역할" "run-harness agent 역할"
assert_contains "$(cat "$TMP_ROOT/empty-project/.codex/agents/run-harness.md")" "## handoff" "run-harness agent handoff"
assert_contains "$(cat "$TMP_ROOT/empty-project/.codex/skills/domain-analyst/SKILL.md")" ".codex/agents/domain-analyst.md" "domain skill agent 연결"
assert_contains "$(cat "$TMP_ROOT/empty-project/.codex/skills/domain-analyst/SKILL.md")" ".claude" "domain skill AI 설정 디렉토리 제외 규칙"
assert_contains "$(cat "$TMP_ROOT/empty-project/.codex/skills/domain-analyst/SKILL.md")" "build" "domain skill 생성 산출물 제외 규칙"
assert_contains "$(cat "$TMP_ROOT/empty-project/.codex/skills/domain-analyst/SKILL.md")" "도메인 문장으로 번역" "domain skill 해석 책임"
assert_contains "$(cat "$TMP_ROOT/empty-project/.codex/skills/domain-analyst/SKILL.md")" "사용자 문제 또는 운영 문제" "domain skill 출력 구조 사용자 문제"
assert_contains "$(cat "$TMP_ROOT/empty-project/.codex/skills/domain-analyst/SKILL.md")" "핵심 실행 흐름" "domain skill 핵심 흐름 문장 규칙"
assert_contains "$(cat "$TMP_ROOT/empty-project/.codex/skills/domain-analyst/SKILL.md")" "사실 기준 구조" "domain skill 구조 요약 규칙"
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
assert_contains "$STACK_UPDATE_OUTPUT" "탐색 상태: 충분" "스택 프로젝트 update 충분 탐색 상태"
assert_contains "$STACK_UPDATE_OUTPUT" "상위 컨텍스트 감사: AGENTS.md 상태: 없음" "스택 프로젝트 update agents 감사"
assert_file "$TMP_ROOT/stack-project/.harness/reports/domain-analysis.md"
assert_file "$TMP_ROOT/stack-project/.harness/reports/harness-architecture.md"
assert_file "$TMP_ROOT/stack-project/.harness/reports/exploration-notes.md"
assert_contains "$(cat "$TMP_ROOT/stack-project/.codex/skills/run-harness/SKILL.md")" '요청: "새 API 엔드포인트 추가"' "run-harness 판단 예시 따옴표 유지"
assert_contains "$(cat "$TMP_ROOT/stack-project/.harness/reports/exploration-notes.md")" '`src/main.ts`' "생성된 탐색 문서 대표 진입점"
assert_not_contains "$(cat "$TMP_ROOT/stack-project/.harness/reports/exploration-notes.md")" ".claude/" "생성된 탐색 문서 AI 설정 디렉토리 제외"
assert_not_contains "$(cat "$TMP_ROOT/stack-project/.harness/reports/exploration-notes.md")" ".cursor/" "생성된 탐색 문서 cursor 디렉토리 제외"
assert_not_contains "$(cat "$TMP_ROOT/stack-project/.harness/reports/exploration-notes.md")" "CLAUDE.md" "생성된 탐색 문서 AI 컨텍스트 파일 제외"
assert_not_contains "$(cat "$TMP_ROOT/stack-project/.harness/reports/exploration-notes.md")" "node_modules/" "생성된 탐색 문서 의존성 테스트 제외"
assert_not_contains "$(cat "$TMP_ROOT/stack-project/.harness/reports/exploration-notes.md")" "app.asar" "생성된 탐색 문서 빌드 산출물 제외"
assert_contains "$(cat "$TMP_ROOT/stack-project/.harness/reports/domain-analysis.md")" "저장소 고유 근거" "스택 프로젝트 domain-analysis 저장소 근거"
assert_contains "$(cat "$TMP_ROOT/stack-project/.harness/reports/domain-analysis.md")" "핵심 경계와 책임" "domain-analysis 핵심 경계와 책임 섹션"
assert_contains "$(cat "$TMP_ROOT/stack-project/.harness/reports/domain-analysis.md")" "어떤 책임을 맡고" "domain-analysis 책임 해석 문장"
assert_contains "$(cat "$TMP_ROOT/stack-project/.harness/reports/domain-analysis.md")" "소비 경계" "domain-analysis 흐름 해석 문장"
assert_not_contains "$(cat "$TMP_ROOT/stack-project/.harness/reports/domain-analysis.md")" '대표 흐름 요약: ``' "domain-analysis 대표 흐름 이중 백틱 제거"
assert_not_contains "$(cat "$TMP_ROOT/stack-project/.harness/reports/domain-analysis.md")" "핵심 작업 축: src/main.ts" "domain-analysis 핵심 작업 축에 진입점 경로 직접 노출 금지"
assert_not_contains "$(cat "$TMP_ROOT/stack-project/.harness/reports/domain-analysis.md")" ".claude/" "domain-analysis AI 설정 디렉토리 제외"
assert_not_contains "$(cat "$TMP_ROOT/stack-project/.harness/reports/domain-analysis.md")" ".cursor/" "domain-analysis cursor 디렉토리 제외"
assert_not_contains "$(cat "$TMP_ROOT/stack-project/.harness/reports/domain-analysis.md")" "node_modules/" "domain-analysis 의존성 테스트 제외"
assert_not_contains "$(cat "$TMP_ROOT/stack-project/.harness/reports/domain-analysis.md")" "app.asar" "domain-analysis 빌드 산출물 제외"
assert_contains "$(cat "$TMP_ROOT/stack-project/.harness/reports/team-playbook.md")" "역할 호출 순서" "스택 프로젝트 team-playbook 상세 운영 규칙"
STACK_VERIFY_OUTPUT="$(
  cd "$TMP_ROOT/stack-project" && \
  bash "$HARNESS_SCRIPT_DIR/harness-verify.sh"
)"
assert_contains "$STACK_VERIFY_OUTPUT" "탐색 상태: 충분" "스택 프로젝트 verify 충분 탐색 상태"
assert_contains "$STACK_VERIFY_OUTPUT" "OK 도메인 분석 저장소 고유 근거" "스택 프로젝트 verify 도메인 근거 검사"
assert_contains "$STACK_VERIFY_OUTPUT" "OK 탐색 대표 진입점 개수" "스택 프로젝트 verify 탐색 앵커 검사"

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

log "정렬된 AGENTS.md 감사 확인"
mkdir -p "$TMP_ROOT/aligned-agents-project"
cp "$TMP_ROOT/stack-project/package.json" "$TMP_ROOT/aligned-agents-project/package.json"
mkdir -p "$TMP_ROOT/aligned-agents-project/src" "$TMP_ROOT/aligned-agents-project/tests"
cp "$TMP_ROOT/stack-project/src/main.ts" "$TMP_ROOT/aligned-agents-project/src/main.ts"
cp "$TMP_ROOT/stack-project/src/app.ts" "$TMP_ROOT/aligned-agents-project/src/app.ts"
cp "$TMP_ROOT/stack-project/tests/app.test.ts" "$TMP_ROOT/aligned-agents-project/tests/app.test.ts"
cat > "$TMP_ROOT/aligned-agents-project/AGENTS.md" <<'EOF'
# AGENTS

- run-harness를 기본 진입점으로 사용합니다.
- 신규 구축, 기존 확장, 운영 유지보수를 구분합니다.
- 구조 변경이 크면 재구성을 먼저 판단합니다.
- 세부 실행은 .codex/skills 와 .harness 자산을 따릅니다.
EOF
ALIGNED_INIT_OUTPUT="$(
  cd "$TMP_ROOT/aligned-agents-project" && \
  bash "$HARNESS_SCRIPT_DIR/harness-init.sh"
)"
assert_contains "$ALIGNED_INIT_OUTPUT" "상위 컨텍스트 감사: AGENTS.md 상태: 정렬됨" "정렬된 agents init 감사"
(
  cd "$TMP_ROOT/aligned-agents-project"
  bash "$HARNESS_SCRIPT_DIR/harness-verify.sh"
)

log "충돌하는 AGENTS.md update 차단 확인"
mkdir -p "$TMP_ROOT/conflict-agents-project"
cp "$TMP_ROOT/stack-project/package.json" "$TMP_ROOT/conflict-agents-project/package.json"
mkdir -p "$TMP_ROOT/conflict-agents-project/src" "$TMP_ROOT/conflict-agents-project/tests"
cp "$TMP_ROOT/stack-project/src/main.ts" "$TMP_ROOT/conflict-agents-project/src/main.ts"
cp "$TMP_ROOT/stack-project/src/app.ts" "$TMP_ROOT/conflict-agents-project/src/app.ts"
cp "$TMP_ROOT/stack-project/tests/app.test.ts" "$TMP_ROOT/conflict-agents-project/tests/app.test.ts"
(
  cd "$TMP_ROOT/conflict-agents-project"
  bash "$HARNESS_SCRIPT_DIR/harness-init.sh" >/dev/null
)
cat > "$TMP_ROOT/conflict-agents-project/AGENTS.md" <<'EOF'
# AGENTS

- CLAUDE.md를 상위 계약으로 사용합니다.
- .claude/agents 와 .claude/skills 를 기준으로 동작합니다.
- harness-refresh-reports.sh 로 보고서를 재생성합니다.
EOF
assert_command_fails_with \
  "$TMP_ROOT/conflict-agents-project" \
  "bash \"$HARNESS_SCRIPT_DIR/harness-update.sh\"" \
  "AGENTS.md 운영 계약 충돌" \
  "충돌 agents update 차단"
assert_command_fails_with \
  "$TMP_ROOT/conflict-agents-project" \
  "bash \"$HARNESS_SCRIPT_DIR/harness-verify.sh\"" \
  "AGENTS.md 운영 계약 충돌이 커서 정렬보다 재구성이 필요합니다" \
  "충돌 agents verify 실패"

log "harness smoke test 통과"
