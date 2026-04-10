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

assert_not_dir() {
  local path="$1"

  [ ! -d "$path" ] || fail "디렉토리가 없어야 함: $path"
}

assert_not_file() {
  local path="$1"

  [ ! -f "$path" ] || fail "파일이 없어야 함: $path"
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
  mkdir -p "$project_path/.github/ISSUE_TEMPLATE"
  cat > "$project_path/.github/pull_request_template.md" <<'EOF'
# pr template
EOF
  cat > "$project_path/.github/ISSUE_TEMPLATE/feature_template.md" <<'EOF'
# feature template
EOF
  cat > "$project_path/.yarnrc.yml" <<'EOF'
nodeLinker: node-modules
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

project_setup_has_answers_check() {
  local file="$1"

  bash -c ". \"$HARNESS_SCRIPT_DIR/harness-lib.sh\"; project_setup_has_answers \"$1\"" bash "$file"
}

rm -rf "$TMP_ROOT"
mkdir -p "$TMP_ROOT"

log "bash 문법 확인"
bash -n "$HARNESS_SCRIPT_DIR/harness-lib.sh"
bash -n "$HARNESS_SCRIPT_DIR/harness-init.sh"
bash -n "$HARNESS_SCRIPT_DIR/harness-explore.sh"
bash -n "$HARNESS_SCRIPT_DIR/harness-generate-team-assets.sh"
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
assert_contains "$EMPTY_INIT_OUTPUT" "입력 메모 문서: .harness/reports/exploration-notes.md" "빈 프로젝트 init 입력 메모 로그"
assert_file "$TMP_ROOT/empty-project/AGENTS.md"
assert_contains "$(cat "$TMP_ROOT/empty-project/AGENTS.md")" "init 직후에는 프로젝트 특화 역할 팀이 아직 생성되지 않은 상태입니다." "빈 프로젝트 AGENTS 역할 설계 전 안내"
assert_not_file "$TMP_ROOT/empty-project/.codex/config.toml"
assert_not_dir "$TMP_ROOT/empty-project/.codex/agents"
assert_not_dir "$TMP_ROOT/empty-project/.codex/skills"
assert_contains "$(cat "$HARNESS_REF_DIR/../SKILL.md")" "프로젝트 특화 역할 팀" "전역 harness skill 프로젝트 특화 역할 팀 표현"
assert_contains "$(cat "$HARNESS_REF_DIR/orchestrator-template.md")" "domain-analyst → harness-architect → qa-designer → orchestrator → validator" "오케스트레이터 기본 파이프라인"
assert_not_contains "$(cat "$HARNESS_REF_DIR/orchestrator-template.md")" "domain-analyst → harness-architect → skill-scaffolder → qa-designer → validator" "오케스트레이터 기본 파이프라인의 skill-scaffolder 제거"
assert_contains "$(cat "$HARNESS_REF_DIR/agent-design-patterns.md")" "범용 하네스 1차 단계에서는 다음 5개 역할을 기본으로 한다." "에이전트 패턴 기본 역할 수"
assert_contains "$(cat "$HARNESS_REF_DIR/agent-design-patterns.md")" $'- domain-analyst\n- harness-architect\n- qa-designer\n- orchestrator\n- validator' "에이전트 패턴 기본 역할 목록"
assert_contains "$(cat "$HARNESS_REF_DIR/team-examples.md")" "기본 5역할 팀이 자연스럽다." "팀 예시 기본 역할 수"
assert_contains "$(cat "$HARNESS_REF_DIR/team-examples.md")" $'- domain-analyst\n- harness-architect\n- qa-designer\n- orchestrator\n- validator' "팀 예시 기본 역할 목록"
assert_contains "$(cat "$HARNESS_REF_DIR/target-evaluation-playbook.md")" "운영 가능" "타겟 평가 플레이북 상태 판정"
assert_contains "$(cat "$HARNESS_REF_DIR/target-evaluation-playbook.md")" "다음 재진입 phase" "타겟 평가 플레이북 재진입 기준"
assert_dir "$TMP_ROOT/empty-project/.harness/reports"
assert_file "$TMP_ROOT/empty-project/.harness/project-setup.md"
assert_file "$TMP_ROOT/empty-project/.harness/reports/team-spec.md"
assert_contains "$(cat "$TMP_ROOT/empty-project/.harness/reports/team-spec.md")" "## 팀 메타데이터" "빈 프로젝트 team-spec 메타데이터"
assert_contains "$(cat "$TMP_ROOT/empty-project/.harness/reports/team-spec.md")" "## 도메인 근거 요약" "빈 프로젝트 team-spec 도메인 근거"
assert_contains "$(cat "$TMP_ROOT/empty-project/.harness/reports/team-spec.md")" "## 역할명 설계 메모" "빈 프로젝트 team-spec 역할명 설계 메모"
assert_contains "$(cat "$TMP_ROOT/empty-project/.harness/reports/team-spec.md")" "## 팀 설계 결정" "빈 프로젝트 team-spec 팀 설계 결정"
assert_contains "$(cat "$TMP_ROOT/empty-project/.harness/reports/team-spec.md")" "## 역할 스펙 초안" "빈 프로젝트 team-spec 역할 스펙"
assert_contains "$(cat "$TMP_ROOT/empty-project/.harness/reports/team-spec.md")" "## 생성 규칙" "빈 프로젝트 team-spec 생성 규칙"
assert_contains "$(cat "$TMP_ROOT/empty-project/.harness/reports/team-spec.md")" "## 최종 역할 인벤토리" "빈 프로젝트 team-spec 최종 역할 인벤토리"
assert_contains "$(cat "$TMP_ROOT/empty-project/.harness/reports/team-spec.md")" 'role_id|display_name|agent_file|model|reasoning|sandbox|description' "빈 프로젝트 team-spec 역할 블록 형식"
assert_contains "$(cat "$TMP_ROOT/empty-project/.harness/reports/team-spec.md")" "payment_dev|payment-dev|payment-dev" "빈 프로젝트 team-spec 프로젝트 특화 역할 예시"
assert_not_contains "$(cat "$TMP_ROOT/empty-project/.harness/reports/team-spec.md")" "domain_analyst|domain-analyst|domain-analyst" "빈 프로젝트 team-spec seed 역할 미생성"
if (
  cd "$TMP_ROOT/empty-project" && \
  project_setup_has_answers_check ".harness/project-setup.md"
); then
  fail "빈 프로젝트 project-setup 템플릿은 답변이 없는 상태여야 함"
fi
assert_file "$TMP_ROOT/empty-project/.harness/reports/exploration-notes.md"
assert_not_file "$TMP_ROOT/empty-project/.harness/reports/domain-analysis.md"
assert_command_fails_with \
  "$TMP_ROOT/empty-project" \
  "bash \"$HARNESS_SCRIPT_DIR/harness-verify.sh\"" \
  "누락된 파일: .codex/config.toml" \
  "빈 프로젝트 verify phase 3 미수행 실패"

log "스택 프로젝트 init -> verify 확인"
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
mkdir -p "$TMP_ROOT/stack-project/src/features/auth/hooks"
cat > "$TMP_ROOT/stack-project/src/features/auth/hooks/index.ts" <<'EOF'
export const useAuth = () => true;
EOF
cat > "$TMP_ROOT/stack-project/tests/app.test.ts" <<'EOF'
import { appName } from "../src/app";

if (appName !== "smoke-stack-project") {
  throw new Error("unexpected app name");
}
EOF
cat > "$TMP_ROOT/stack-project/eslint.config.js" <<'EOF'
export default [];
EOF
setup_test_artifacts "$TMP_ROOT/stack-project"
mkdir -p "$TMP_ROOT/stack-explore-project"
cp "$TMP_ROOT/stack-project/package.json" "$TMP_ROOT/stack-explore-project/package.json"
mkdir -p "$TMP_ROOT/stack-explore-project/src" "$TMP_ROOT/stack-explore-project/tests"
cp "$TMP_ROOT/stack-project/src/main.ts" "$TMP_ROOT/stack-explore-project/src/main.ts"
mkdir -p "$TMP_ROOT/stack-explore-project/src/com.example"
cp "$TMP_ROOT/stack-project/src/com.example/Main.kt" "$TMP_ROOT/stack-explore-project/src/com.example/Main.kt"
cp "$TMP_ROOT/stack-project/src/app.ts" "$TMP_ROOT/stack-explore-project/src/app.ts"
mkdir -p "$TMP_ROOT/stack-explore-project/src/features/auth/hooks"
cp "$TMP_ROOT/stack-project/src/features/auth/hooks/index.ts" "$TMP_ROOT/stack-explore-project/src/features/auth/hooks/index.ts"
cp "$TMP_ROOT/stack-project/tests/app.test.ts" "$TMP_ROOT/stack-explore-project/tests/app.test.ts"
cp "$TMP_ROOT/stack-project/eslint.config.js" "$TMP_ROOT/stack-explore-project/eslint.config.js"
setup_test_artifacts "$TMP_ROOT/stack-explore-project"
(
  cd "$TMP_ROOT/stack-explore-project"
  bash "$HARNESS_SCRIPT_DIR/harness-explore.sh"
)
assert_file "$TMP_ROOT/stack-explore-project/.harness/reports/exploration-notes.md"
assert_contains "$(cat "$TMP_ROOT/stack-explore-project/.harness/reports/exploration-notes.md")" "## 상태" "탐색 문서 상태 섹션"
assert_contains "$(cat "$TMP_ROOT/stack-explore-project/.harness/reports/exploration-notes.md")" "이 메모는 초기 입력 상태만 전달하며, 최종 판단 근거는 아닙니다." "탐색 문서 약한 입력 전제"
assert_contains "$(cat "$TMP_ROOT/stack-explore-project/.harness/reports/exploration-notes.md")" "## 역할 팀 메모" "탐색 문서 역할 팀 메모"
assert_contains "$(cat "$TMP_ROOT/stack-explore-project/.harness/reports/exploration-notes.md")" "domain-analyst" "탐색 문서 역할 재해석 메모"
STACK_INIT_OUTPUT="$(
  cd "$TMP_ROOT/stack-project" && \
  bash "$HARNESS_SCRIPT_DIR/harness-init.sh"
)"
assert_contains "$STACK_INIT_OUTPUT" "하네스 운영 모드: 신규 구축" "스택 프로젝트 init 로그"
assert_contains "$STACK_INIT_OUTPUT" "입력 메모 요약: 입력 메모는 초기 상태만 전달하며, 사용자 입력과 역할 재해석이 필요합니다" "스택 프로젝트 init 입력 메모 요약"
assert_file "$TMP_ROOT/stack-project/AGENTS.md"
assert_not_file "$TMP_ROOT/stack-project/.codex/config.toml"
assert_not_dir "$TMP_ROOT/stack-project/.codex/agents"
assert_not_dir "$TMP_ROOT/stack-project/.codex/skills"
assert_file "$TMP_ROOT/stack-project/.harness/reports/exploration-notes.md"
assert_file "$TMP_ROOT/stack-project/.harness/reports/team-spec.md"
assert_not_file "$TMP_ROOT/stack-project/.harness/reports/domain-analysis.md"
assert_not_file "$TMP_ROOT/stack-project/.harness/reports/harness-architecture.md"
assert_contains "$(cat "$TMP_ROOT/stack-project/.harness/reports/exploration-notes.md")" "이 메모는 초기 입력 상태만 전달하며, 최종 판단 근거는 아닙니다." "생성된 탐색 문서 약한 입력 전제"
assert_contains "$(cat "$TMP_ROOT/stack-project/.harness/reports/exploration-notes.md")" "## 다음 확인 질문" "생성된 탐색 문서 확인 질문"

log "team-spec custom 역할 skill 생성 확인"
mkdir -p "$TMP_ROOT/custom-role-project"
(
  cd "$TMP_ROOT/custom-role-project" && \
  bash "$HARNESS_SCRIPT_DIR/harness-init.sh" >/dev/null && \
  perl -0pi -e 's@<!-- team-spec-roles:start -->\n<!-- team-spec-roles:end -->@<!-- team-spec-roles:start -->\nrun_harness|run-harness|run-harness|gpt-5.4|high|workspace-write|Entry agent that chooses phase, mode, pattern, and next roles.\npayment_dev|payment-dev|payment-dev|gpt-5.4|high|workspace-write|Implement payment flow changes and write payment rollout notes.\n<!-- team-spec-roles:end -->@' .harness/reports/team-spec.md && \
  bash "$HARNESS_SCRIPT_DIR/harness-generate-team-assets.sh" >/dev/null
)
assert_file "$TMP_ROOT/custom-role-project/.codex/agents/payment-dev.toml"
assert_file "$TMP_ROOT/custom-role-project/.codex/agents/run-harness.toml"
assert_contains "$(cat "$TMP_ROOT/custom-role-project/.codex/config.toml")" "[agents.payment_dev]" "custom 역할 config section"
assert_contains "$(cat "$TMP_ROOT/custom-role-project/.codex/config.toml")" "[agents.run_harness]" "custom 역할 run_harness config section"
assert_dir "$TMP_ROOT/custom-role-project/.codex/skills/payment-dev"
assert_dir "$TMP_ROOT/custom-role-project/.codex/skills/run-harness"
assert_contains "$(cat "$TMP_ROOT/custom-role-project/.codex/skills/payment-dev/SKILL.md")" "team-spec" "custom 역할 skill team-spec 기준"
assert_contains "$(cat "$TMP_ROOT/custom-role-project/.codex/skills/payment-dev/SKILL.md")" "payment_dev" "custom 역할 skill role id"
assert_contains "$(cat "$TMP_ROOT/custom-role-project/.codex/skills/payment-dev/SKILL.md")" "workspace-write" "custom 역할 skill sandbox"
assert_contains "$(cat "$TMP_ROOT/custom-role-project/.codex/skills/run-harness/SKILL.md")" "## 주요 작업" "custom run-harness skill 주요 작업"
assert_contains "$(cat "$TMP_ROOT/custom-role-project/.codex/skills/run-harness/SKILL.md")" "## 협업 원칙" "custom run-harness skill 협업 원칙"
CUSTOM_VERIFY_OUTPUT="$(
  cd "$TMP_ROOT/custom-role-project" && \
  bash "$HARNESS_SCRIPT_DIR/harness-verify.sh" 2>&1 || true
)"
assert_not_contains "$CUSTOM_VERIFY_OUTPUT" "누락된 파일: .codex/agents/payment-dev.toml" "custom 역할 verify agent 누락 없음"
assert_not_contains "$CUSTOM_VERIFY_OUTPUT" "누락된 파일: .codex/skills/payment-dev/SKILL.md" "custom 역할 verify skill 누락 없음"
assert_not_contains "$CUSTOM_VERIFY_OUTPUT" "team-spec 최종 역할 인벤토리 미작성" "custom 역할 verify team-spec 작성 완료"
assert_contains "$CUSTOM_VERIFY_OUTPUT" "문서 누락: 역할 재작성 미수행" "custom 역할 verify는 최종 보고서 누락만 실패"

cat > "$TMP_ROOT/stack-project/.harness/project-setup.md" <<'EOF'
# 프로젝트 설정

## 작성 안내

입력 정보가 아직 부족해 자동 판단을 보류합니다.

---

## 프로젝트 목표

ERP 관리 화면과 데스크톱 운영 경로를 함께 정리한다.
EOF
if ! (
  cd "$TMP_ROOT/stack-project" && \
  project_setup_has_answers_check ".harness/project-setup.md"
); then
  fail "작성된 project-setup 답변은 감지되어야 함"
fi
STACK_VERIFY_OUTPUT="$(
  cd "$TMP_ROOT/stack-project" && \
  bash "$HARNESS_SCRIPT_DIR/harness-verify.sh" 2>&1 || true
)"
assert_contains "$STACK_VERIFY_OUTPUT" "누락된 파일: .codex/config.toml" "스택 프로젝트 verify phase 3 미수행 실패"
STACK_UPDATE_OUTPUT="$(
  cd "$TMP_ROOT/stack-project" && \
  bash "$HARNESS_SCRIPT_DIR/harness-update.sh" --domain --qa
)"
assert_contains "$STACK_UPDATE_OUTPUT" "update 수행 범위: Phase 0 감사와 입력 메모/team-spec 재정리" "스택 프로젝트 update phase 0 감사"
assert_contains "$STACK_UPDATE_OUTPUT" "권장 재진입: Phase 1 도메인/작업 분석" "스택 프로젝트 update phase 1 재진입"
assert_contains "$STACK_UPDATE_OUTPUT" "권장 재진입: Phase 4 QA 및 검증 구조" "스택 프로젝트 update phase 4 재진입"
assert_contains "$STACK_UPDATE_OUTPUT" "Phase 6 검증을 수행하고, 운영 가치가 약하면 Phase 7 품질 비교와 성숙도 평가로 이어집니다." "스택 프로젝트 update phase 7 후속"

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
assert_contains "$(cat "$TMP_ROOT/multi-boundary-project/.harness/reports/exploration-notes.md")" "실제 시작점, 경계, 검증 경로는 역할 스킬이 저장소를 다시 읽으며 확정합니다." "다중 경계 탐색 역할 재해석 전제"

log "harness smoke test 통과"
