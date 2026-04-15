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
mkdir -p "$TMP_ROOT/mode-maint/.harness/docs"
mkdir -p "$TMP_ROOT/mode-maint/.harness/logs"
touch "$TMP_ROOT/mode-maint/.harness/docs/domain-analysis.md"
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
assert_file "$TMP_ROOT/empty-explore-project/.harness/docs/exploration-notes.md"

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
assert_contains "$EMPTY_INIT_OUTPUT" "입력 메모 문서: .harness/docs/exploration-notes.md" "빈 프로젝트 init 입력 메모 로그"
assert_file "$TMP_ROOT/empty-project/AGENTS.md"
assert_contains "$(cat "$TMP_ROOT/empty-project/AGENTS.md")" "init 직후에는 프로젝트 특화 역할 팀이 아직 생성되지 않은 상태입니다." "빈 프로젝트 AGENTS 역할 설계 전 안내"
assert_not_file "$TMP_ROOT/empty-project/.codex/config.toml"
assert_not_dir "$TMP_ROOT/empty-project/.codex/agents"
assert_not_dir "$TMP_ROOT/empty-project/.codex/skills"
assert_contains "$(cat "$HARNESS_REF_DIR/../SKILL.md")" "프로젝트 특화 역할 팀" "전역 harness skill 프로젝트 특화 역할 팀 표현"
assert_contains "$(cat "$HARNESS_REF_DIR/orchestrator-template.md")" "저장소 입력 문서 고정 → 팀 구조 설계 → QA 기준 설계 → 전체 흐름 조율 → 운영 기준 감사" "오케스트레이터 기본 파이프라인 성격"
assert_contains "$(cat "$HARNESS_REF_DIR/agent-design-patterns.md")" "범용 하네스는 현재 저장소의 경계와 운영 요구를 읽고 역할 팀을 설계한다." "에이전트 패턴 역할 설계 원칙"
assert_contains "$(cat "$HARNESS_REF_DIR/team-examples.md")" '`ui-flow-analyst`' "팀 예시 프로젝트 특화 역할"
assert_contains "$(cat "$HARNESS_REF_DIR/target-evaluation-playbook.md")" "운영 가능" "타겟 평가 플레이북 상태 판정"
assert_contains "$(cat "$HARNESS_REF_DIR/target-evaluation-playbook.md")" "다음 재진입 phase" "타겟 평가 플레이북 재진입 기준"
assert_contains "$(cat "$HARNESS_REF_DIR/target-evaluation-playbook.md")" "입력 문서 품질 문제" "타겟 평가 플레이북 환류 축"
assert_contains "$(cat "$HARNESS_REF_DIR/target-evaluation-playbook.md")" "생성 스킬 구체성 문제" "타겟 평가 플레이북 생성 스킬 환류"
assert_contains "$(cat "$HARNESS_REF_DIR/target-evaluation-playbook.md")" "다음 시작 전 우선 확인 입력 파일 / 최근 출력 파일" "타겟 평가 플레이북 운영 루프 입력 출력 기준"
assert_contains "$(cat "$HARNESS_REF_DIR/meta-system-maturity-guide.md")" "대등 수준 확인 질문" "성숙도 가이드 대등 수준 질문"
assert_contains "$(cat "$HARNESS_REF_DIR/meta-system-maturity-guide.md")" "생성된 역할 스킬이 시작 경로, 요청 분기, 출력 형식, 재진입/종료 규칙까지 담는가" "성숙도 가이드 역할 스킬 질문"
assert_contains "$(cat "$HARNESS_REF_DIR/meta-system-maturity-guide.md")" "다음 시작 전에 다시 읽을 입력과 최근 출력을 바로 제시하는가" "성숙도 가이드 운영 루프 질문"
assert_contains "$(cat "$HARNESS_REF_DIR/phase-selection-matrix.md")" "다음 시작 전 우선 확인 입력 파일" "phase 선택 매트릭스 운영 루프 확인 포인트"
assert_dir "$TMP_ROOT/empty-project/.harness/docs"
assert_file "$TMP_ROOT/empty-project/.harness/docs/project-setup.md"
assert_file "$TMP_ROOT/empty-project/.harness/docs/team-spec.md"
assert_contains "$(cat "$TMP_ROOT/empty-project/.harness/docs/team-spec.md")" "## 팀 메타데이터" "빈 프로젝트 team-spec 메타데이터"
assert_contains "$(cat "$TMP_ROOT/empty-project/.harness/docs/team-spec.md")" "## 도메인 근거 요약" "빈 프로젝트 team-spec 도메인 근거"
assert_contains "$(cat "$TMP_ROOT/empty-project/.harness/docs/team-spec.md")" "## 역할명 설계 메모" "빈 프로젝트 team-spec 역할명 설계 메모"
assert_contains "$(cat "$TMP_ROOT/empty-project/.harness/docs/team-spec.md")" "## 팀 설계 결정" "빈 프로젝트 team-spec 팀 설계 결정"
assert_contains "$(cat "$TMP_ROOT/empty-project/.harness/docs/team-spec.md")" "## 역할 스펙 초안" "빈 프로젝트 team-spec 역할 스펙"
assert_contains "$(cat "$TMP_ROOT/empty-project/.harness/docs/team-spec.md")" "역할 유형:" "빈 프로젝트 team-spec 역할 유형"
assert_contains "$(cat "$TMP_ROOT/empty-project/.harness/docs/team-spec.md")" "대표 시작 경로:" "빈 프로젝트 team-spec 대표 시작 경로"
assert_contains "$(cat "$TMP_ROOT/empty-project/.harness/docs/team-spec.md")" "우선 입력 문서:" "빈 프로젝트 team-spec 우선 입력 문서"
assert_contains "$(cat "$TMP_ROOT/empty-project/.harness/docs/team-spec.md")" "요청 유형별 하위 분기:" "빈 프로젝트 team-spec 요청 분기"
assert_contains "$(cat "$TMP_ROOT/empty-project/.harness/docs/team-spec.md")" "작업 시작 체크리스트:" "빈 프로젝트 team-spec 시작 체크리스트"
assert_contains "$(cat "$TMP_ROOT/empty-project/.harness/docs/team-spec.md")" "주요 판단 기준:" "빈 프로젝트 team-spec 판단 기준"
assert_contains "$(cat "$TMP_ROOT/empty-project/.harness/docs/team-spec.md")" "금지 판단/피해야 할 오해:" "빈 프로젝트 team-spec 금지 판단"
assert_contains "$(cat "$TMP_ROOT/empty-project/.harness/docs/team-spec.md")" "출력 규칙:" "빈 프로젝트 team-spec 출력 규칙"
assert_contains "$(cat "$TMP_ROOT/empty-project/.harness/docs/team-spec.md")" "산출 형식 템플릿:" "빈 프로젝트 team-spec 산출 형식 템플릿"
assert_contains "$(cat "$TMP_ROOT/empty-project/.harness/docs/team-spec.md")" "재진입 트리거:" "빈 프로젝트 team-spec 재진입 트리거"
assert_contains "$(cat "$TMP_ROOT/empty-project/.harness/docs/team-spec.md")" "종료 판정 기준:" "빈 프로젝트 team-spec 종료 판정 기준"
assert_contains "$(cat "$TMP_ROOT/empty-project/.harness/docs/team-spec.md")" "완료 기준:" "빈 프로젝트 team-spec 완료 기준"
assert_contains "$(cat "$TMP_ROOT/empty-project/.harness/docs/team-spec.md")" "검증/리뷰 초점:" "빈 프로젝트 team-spec 검증 초점"
assert_contains "$(cat "$TMP_ROOT/empty-project/.harness/docs/team-spec.md")" "## 생성 규칙" "빈 프로젝트 team-spec 생성 규칙"
assert_contains "$(cat "$TMP_ROOT/empty-project/.harness/docs/team-spec.md")" "## 최종 역할 인벤토리" "빈 프로젝트 team-spec 최종 역할 인벤토리"
assert_contains "$(cat "$TMP_ROOT/empty-project/.harness/docs/team-spec.md")" 'role_id|display_name|agent_file|model|reasoning|sandbox|description' "빈 프로젝트 team-spec 역할 블록 형식"
assert_contains "$(cat "$TMP_ROOT/empty-project/.harness/docs/team-spec.md")" "payment_dev|payment-dev|payment-dev" "빈 프로젝트 team-spec 프로젝트 특화 역할 예시"
assert_not_contains "$(cat "$TMP_ROOT/empty-project/.harness/docs/team-spec.md")" "domain_analyst|domain-analyst|domain-analyst" "빈 프로젝트 team-spec seed 역할 미생성"
if (
  cd "$TMP_ROOT/empty-project" && \
  project_setup_has_answers_check ".harness/docs/project-setup.md"
); then
  fail "빈 프로젝트 project-setup 템플릿은 답변이 없는 상태여야 함"
fi
assert_file "$TMP_ROOT/empty-project/.harness/docs/exploration-notes.md"
assert_not_file "$TMP_ROOT/empty-project/.harness/docs/domain-analysis.md"
assert_contains "$(cat "$TMP_ROOT/empty-project/.harness/docs/logging-policy.md")" "다음 재진입 phase" "빈 프로젝트 logging policy 재진입 phase"
assert_contains "$(cat "$TMP_ROOT/empty-project/.harness/docs/logging-policy.md")" "다음 시작 전 우선 확인 입력 파일" "빈 프로젝트 logging policy 우선 입력 파일"
assert_contains "$(cat "$TMP_ROOT/empty-project/.harness/docs/logging-policy.md")" "최근 출력 파일" "빈 프로젝트 logging policy 최근 출력 파일"
assert_contains "$(cat "$TMP_ROOT/empty-project/.harness/docs/logging-policy.md")" "필수 완료 조건" "빈 프로젝트 logging policy 필수 완료 조건"
assert_contains "$(cat "$TMP_ROOT/empty-project/.harness/docs/logging-policy.md")" "timed_out" "빈 프로젝트 logging policy timed_out 상태"
assert_contains "$(cat "$TMP_ROOT/empty-project/.harness/docs/logging-policy.md")" "세션 종료 사유" "빈 프로젝트 logging policy 종료 사유"
assert_contains "$(cat "$TMP_ROOT/empty-project/.harness/logs/session-events.tsv")" $'planned_roles\troles\tresult_status\tinput_summary' "빈 프로젝트 session events 확장 헤더"
assert_contains "$(cat "$TMP_ROOT/empty-project/.harness/logs/session-events.tsv")" $'output_summary\toutputs\tchanged_files\texpected_outputs\tnext_role\tunresolved_risks\tnote' "빈 프로젝트 session events 후반 헤더"
assert_contains "$(cat "$TMP_ROOT/empty-project/.harness/logs/latest-session-summary.md")" "다음 시작 역할" "빈 프로젝트 latest summary 다음 시작 역할"
assert_contains "$(cat "$TMP_ROOT/empty-project/.harness/logs/latest-session-summary.md")" "다음 재진입 phase" "빈 프로젝트 latest summary 재진입 phase"
assert_contains "$(cat "$TMP_ROOT/empty-project/.harness/logs/latest-session-summary.md")" "다음 시작 전 우선 확인 입력 파일" "빈 프로젝트 latest summary 우선 입력 파일"
assert_contains "$(cat "$TMP_ROOT/empty-project/.harness/logs/latest-session-summary.md")" "최근 출력 파일" "빈 프로젝트 latest summary 최근 출력 파일"
assert_command_fails_with \
  "$TMP_ROOT/empty-project" \
  "bash \"$HARNESS_SCRIPT_DIR/harness-verify.sh\"" \
  "누락된 파일: .codex/config.toml" \
  "빈 프로젝트 verify phase 3 미수행 실패"

log "로그 정책 입력/출력 항목 검증 확인"
mkdir -p "$TMP_ROOT/logging-policy-invalid-project"
(
  cd "$TMP_ROOT/logging-policy-invalid-project" && \
  bash "$HARNESS_SCRIPT_DIR/harness-init.sh" >/dev/null && \
  perl -0pi -e 's/\n- 최근 출력 파일//g' .harness/docs/logging-policy.md
)
assert_command_fails_with \
  "$TMP_ROOT/logging-policy-invalid-project" \
  "bash \"$HARNESS_SCRIPT_DIR/harness-verify.sh\"" \
  "로그 정책 최근 출력 파일" \
  "로그 정책 입력 출력 검증"

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
assert_file "$TMP_ROOT/stack-explore-project/.harness/docs/exploration-notes.md"
assert_contains "$(cat "$TMP_ROOT/stack-explore-project/.harness/docs/exploration-notes.md")" "## 상태" "탐색 문서 상태 섹션"
assert_contains "$(cat "$TMP_ROOT/stack-explore-project/.harness/docs/exploration-notes.md")" "이 메모는 초기 입력 상태만 전달하며, 최종 판단 근거는 아닙니다." "탐색 문서 약한 입력 전제"
assert_contains "$(cat "$TMP_ROOT/stack-explore-project/.harness/docs/exploration-notes.md")" "## 역할 팀 메모" "탐색 문서 역할 팀 메모"
assert_contains "$(cat "$TMP_ROOT/stack-explore-project/.harness/docs/exploration-notes.md")" "도메인 분석 역할" "탐색 문서 역할 재해석 메모"
assert_contains "$(cat "$TMP_ROOT/stack-explore-project/.harness/docs/exploration-notes.md")" "## 반영 대상" "탐색 문서 반영 대상 섹션"
assert_contains "$(cat "$TMP_ROOT/stack-explore-project/.harness/docs/exploration-notes.md")" "## 판단 종료 조건" "탐색 문서 판단 종료 조건 섹션"
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
assert_file "$TMP_ROOT/stack-project/.harness/docs/exploration-notes.md"
assert_file "$TMP_ROOT/stack-project/.harness/docs/team-spec.md"
assert_not_file "$TMP_ROOT/stack-project/.harness/docs/domain-analysis.md"
assert_not_file "$TMP_ROOT/stack-project/.harness/docs/harness-architecture.md"
assert_contains "$(cat "$TMP_ROOT/stack-project/.harness/docs/exploration-notes.md")" "이 메모는 초기 입력 상태만 전달하며, 최종 판단 근거는 아닙니다." "생성된 탐색 문서 약한 입력 전제"
assert_contains "$(cat "$TMP_ROOT/stack-project/.harness/docs/exploration-notes.md")" "## 다음 확인 질문" "생성된 탐색 문서 확인 질문"
assert_contains "$(cat "$TMP_ROOT/stack-project/.harness/docs/exploration-notes.md")" "## 반영 대상" "생성된 탐색 문서 반영 대상 섹션"
assert_contains "$(cat "$TMP_ROOT/stack-project/.harness/docs/exploration-notes.md")" "## 판단 종료 조건" "생성된 탐색 문서 판단 종료 조건 섹션"

log "team-spec custom 역할 skill 생성 확인"
mkdir -p "$TMP_ROOT/custom-role-project"
(
  cd "$TMP_ROOT/custom-role-project" && \
  bash "$HARNESS_SCRIPT_DIR/harness-init.sh" >/dev/null && \
  perl -0pi -e 's@### 역할 1\n\n- 역할 id:\n- 역할 표시 이름:\n- 역할 유형:\n- 역할 목적:\n- 역할 책임:\n- 주요 입력:\n- 주요 출력:\n- 다음 역할:\n- 중심 역할 여부:\n- 보조 역할 여부:\n- 대표 시작 경로:\n- 우선 입력 문서:\n- 요청 유형별 하위 분기:\n- 작업 시작 체크리스트:\n- 주요 판단 기준:\n- 금지 판단/피해야 할 오해:\n- 출력 규칙:\n- 산출 형식 템플릿:\n- 재진입 트리거:\n- 종료 판정 기준:\n- 완료 기준:\n- 검증/리뷰 초점:\n- agent 파일명:\n- skill 디렉토리명:\n- description 초안:\n- 권장 모델 클래스:\n- sandbox 정책:@### 역할 1\n\n- 역할 id: intake_router\n- 역할 표시 이름: intake-router\n- 역할 유형: conductor\n- 역할 목적: 요청을 프로젝트 특화 실행 경로로 분기한다.\n- 역할 책임: 시작 역할 판단;다음 역할 순서 고정;재진입 시점 기록\n- 주요 입력: 현재 요청;team-spec;domain-analysis\n- 주요 출력: 시작 역할 판단 메모;다음 역할 순서;재진입 메모\n- 다음 역할: payment_dev\n- 중심 역할 여부: 예\n- 보조 역할 여부: 아니오\n- 대표 시작 경로: .harness/docs/domain-analysis.md; .harness/docs/orchestration-plan.md\n- 우선 입력 문서: .harness/docs/team-spec.md;.harness/docs/domain-analysis.md\n- 요청 유형별 하위 분기: 구현 요청이면 payment_dev; QA 요청이면 release_qa_guard; 구조 불일치면 second_contract_auditor\n- 작업 시작 체크리스트: 요청 범위 판정;선행 문서 준비 상태 확인;시작 역할 선택\n- 주요 판단 기준: 실패 비용이 큰 경계를 먼저 판정;병렬보다 다음 역할 명확성을 우선\n- 금지 판단/피해야 할 오해: 직접 구현 역할까지 겸한다고 가정하지 않음\n- 출력 규칙: 시작 역할과 다음 역할을 한 번에 명시\n- 산출 형식 템플릿: 시작 역할: <role>; 다음 역할: <role>; 재진입 조건: <condition>\n- 재진입 트리거: 경계가 둘 이상으로 번질 때; QA 또는 감사에서 충돌이 발견될 때\n- 종료 판정 기준: 다음 역할이 추가 분류 없이 시작 가능하고 남은 질문이 분리돼 있을 때\n- 완료 기준: 다음 역할이 추가 질문 없이 시작 가능\n- 검증/리뷰 초점: 다음 역할 누락;재진입 기준 부재\n- agent 파일명: intake-router\n- skill 디렉토리명: intake-router\n- description 초안: Route requests into the right project-specific execution path.\n- 권장 모델 클래스: frontier\n- sandbox 정책: workspace-write\n\n### 역할 2\n\n- 역할 id: payment_dev\n- 역할 표시 이름: payment-dev\n- 역할 유형: dev\n- 역할 목적: 결제 흐름 변경을 구현한다.\n- 역할 책임: 구현 경계 유지;규칙 영향 확인;검증 메모 남기기\n- 주요 입력: 현재 요청;team-spec;qa-strategy\n- 주요 출력: 코드 변경;검증 메모\n- 다음 역할: billing_reviewer\n- 중심 역할 여부: 아니오\n- 보조 역할 여부: 아니오\n- 대표 시작 경로: packages/payment/src; packages/payment/tests\n- 우선 입력 문서: .harness/docs/team-spec.md;.harness/docs/qa-strategy.md\n- 요청 유형별 하위 분기: API 변경이면 규칙 검토 추가; UI 변경이면 checkout 화면 검증 메모 추가\n- 작업 시작 체크리스트: 수정 경계 확인;영향 파일 확인;검증 경로 확인\n- 주요 판단 기준: 공용 규칙 영향 우선 확인;변경 범위를 최소화\n- 금지 판단/피해야 할 오해: 리뷰나 QA 판단까지 선점하지 않음\n- 출력 규칙: 코드 변경과 필요한 검증 메모를 함께 남김\n- 산출 형식 템플릿: 변경 경계: <files>; 실행 검증: <tests>; 미실행 검증: <gaps>\n- 재진입 트리거: 공용 규칙 영향이 확인될 때; QA에서 회귀 위험이 반환될 때\n- 종료 판정 기준: 구현 범위와 검증 메모가 reviewer로 바로 넘길 수 있는 상태일 때\n- 완료 기준: 구현 범위가 닫히고 reviewer로 넘길 수 있음\n- 검증/리뷰 초점: 규칙 회귀;테스트 공백\n- agent 파일명: payment-dev\n- skill 디렉토리명: payment-dev\n- description 초안: Implement payment flow changes and write payment rollout notes.\n- 권장 모델 클래스: frontier\n- sandbox 정책: workspace-write@' .harness/docs/team-spec.md && \
  perl -0pi -e 's@<!-- team-spec-roles:start -->\n<!-- team-spec-roles:end -->@<!-- team-spec-roles:start -->\nintake_router|intake-router|intake-router|gpt-5.4|high|workspace-write|Route requests into the right project-specific execution path.\npayment_dev|payment-dev|payment-dev|gpt-5.4|high|workspace-write|Implement payment flow changes and write payment rollout notes.\n<!-- team-spec-roles:end -->@' .harness/docs/team-spec.md && \
  bash "$HARNESS_SCRIPT_DIR/harness-generate-team-assets.sh" >/dev/null
)
assert_file "$TMP_ROOT/custom-role-project/.codex/agents/payment-dev.toml"
assert_file "$TMP_ROOT/custom-role-project/.codex/agents/intake-router.toml"
assert_contains "$(cat "$TMP_ROOT/custom-role-project/.codex/config.toml")" "[agents.payment_dev]" "custom 역할 config section"
assert_contains "$(cat "$TMP_ROOT/custom-role-project/.codex/config.toml")" "[agents.intake_router]" "custom 역할 intake router config section"
assert_dir "$TMP_ROOT/custom-role-project/.codex/skills/payment-dev"
assert_dir "$TMP_ROOT/custom-role-project/.codex/skills/intake-router"
assert_contains "$(cat "$TMP_ROOT/custom-role-project/.codex/skills/payment-dev/SKILL.md")" "team-spec" "custom 역할 skill team-spec 기준"
assert_contains "$(cat "$TMP_ROOT/custom-role-project/.codex/skills/payment-dev/SKILL.md")" "payment_dev" "custom 역할 skill role id"
assert_contains "$(cat "$TMP_ROOT/custom-role-project/.codex/skills/payment-dev/SKILL.md")" "workspace-write" "custom 역할 skill sandbox"
assert_contains "$(cat "$TMP_ROOT/custom-role-project/.codex/skills/payment-dev/SKILL.md")" '역할의 유형은 `dev`' "custom payment skill 역할 유형"
assert_contains "$(cat "$TMP_ROOT/custom-role-project/.codex/skills/payment-dev/SKILL.md")" "## 대표 시작 경로" "custom payment skill 대표 시작 경로"
assert_contains "$(cat "$TMP_ROOT/custom-role-project/.codex/skills/payment-dev/SKILL.md")" "packages/payment/src" "custom payment skill 시작 경로 값"
assert_contains "$(cat "$TMP_ROOT/custom-role-project/.codex/skills/payment-dev/SKILL.md")" "## 우선 입력 문서" "custom payment skill 우선 입력 문서"
assert_contains "$(cat "$TMP_ROOT/custom-role-project/.codex/skills/payment-dev/SKILL.md")" "## 요청 유형별 하위 분기" "custom payment skill 요청 분기"
assert_contains "$(cat "$TMP_ROOT/custom-role-project/.codex/skills/payment-dev/SKILL.md")" "API 변경이면 규칙 검토 추가" "custom payment skill 요청 분기 값"
assert_contains "$(cat "$TMP_ROOT/custom-role-project/.codex/skills/payment-dev/SKILL.md")" "공용 규칙 영향 우선 확인" "custom payment skill 판단 기준"
assert_contains "$(cat "$TMP_ROOT/custom-role-project/.codex/skills/payment-dev/SKILL.md")" "리뷰나 QA 판단까지 선점하지 않음" "custom payment skill 금지 판단"
assert_contains "$(cat "$TMP_ROOT/custom-role-project/.codex/skills/payment-dev/SKILL.md")" "코드 변경과 필요한 검증 메모를 함께 남김" "custom payment skill 출력 규칙"
assert_contains "$(cat "$TMP_ROOT/custom-role-project/.codex/skills/payment-dev/SKILL.md")" "## 산출 형식 템플릿" "custom payment skill 산출 형식 템플릿"
assert_contains "$(cat "$TMP_ROOT/custom-role-project/.codex/skills/payment-dev/SKILL.md")" "변경 경계: <files>" "custom payment skill 산출 형식 값"
assert_contains "$(cat "$TMP_ROOT/custom-role-project/.codex/skills/payment-dev/SKILL.md")" "## 재진입 트리거" "custom payment skill 재진입 트리거"
assert_contains "$(cat "$TMP_ROOT/custom-role-project/.codex/skills/payment-dev/SKILL.md")" "공용 규칙 영향이 확인될 때" "custom payment skill 재진입 값"
assert_contains "$(cat "$TMP_ROOT/custom-role-project/.codex/skills/payment-dev/SKILL.md")" "## 종료 판정 기준" "custom payment skill 종료 판정 기준"
assert_contains "$(cat "$TMP_ROOT/custom-role-project/.codex/skills/payment-dev/SKILL.md")" "reviewer로 바로 넘길 수 있는 상태일 때" "custom payment skill 종료 값"
assert_not_contains "$(cat "$TMP_ROOT/custom-role-project/.codex/skills/payment-dev/SKILL.md")" "초기 스킬" "custom payment skill 초기 스킬 문구 제거"
assert_not_contains "$(cat "$TMP_ROOT/custom-role-project/.codex/skills/payment-dev/SKILL.md")" "더 보강할 수 있다" "custom payment skill 메타 보강 문구 제거"
assert_contains "$(cat "$TMP_ROOT/custom-role-project/.codex/skills/intake-router/SKILL.md")" "## 주요 작업" "custom intake router skill 주요 작업"
assert_contains "$(cat "$TMP_ROOT/custom-role-project/.codex/skills/intake-router/SKILL.md")" "## 협업 원칙" "custom intake router skill 협업 원칙"
assert_contains "$(cat "$TMP_ROOT/custom-role-project/.codex/skills/intake-router/SKILL.md")" '역할의 유형은 `conductor`' "custom intake skill 역할 유형"
assert_contains "$(cat "$TMP_ROOT/custom-role-project/.codex/skills/intake-router/SKILL.md")" "## 대표 시작 경로" "custom intake skill 대표 시작 경로"
assert_contains "$(cat "$TMP_ROOT/custom-role-project/.codex/skills/intake-router/SKILL.md")" ".harness/docs/orchestration-plan.md" "custom intake skill 시작 경로 값"
assert_contains "$(cat "$TMP_ROOT/custom-role-project/.codex/skills/intake-router/SKILL.md")" "어떤 역할이 시작해야 하는지 먼저 판정한다" "custom intake skill conductor 작업"
assert_contains "$(cat "$TMP_ROOT/custom-role-project/.codex/skills/intake-router/SKILL.md")" "## 요청 유형별 하위 분기" "custom intake skill 요청 분기"
assert_contains "$(cat "$TMP_ROOT/custom-role-project/.codex/skills/intake-router/SKILL.md")" "구조 불일치면 second_contract_auditor" "custom intake skill 요청 분기 값"
assert_contains "$(cat "$TMP_ROOT/custom-role-project/.codex/skills/intake-router/SKILL.md")" "## 산출 형식 템플릿" "custom intake skill 산출 형식 템플릿"
assert_contains "$(cat "$TMP_ROOT/custom-role-project/.codex/skills/intake-router/SKILL.md")" "시작 역할: <role>" "custom intake skill 산출 형식 값"
assert_contains "$(cat "$TMP_ROOT/custom-role-project/.codex/skills/intake-router/SKILL.md")" "## 재진입 트리거" "custom intake skill 재진입 트리거"
assert_contains "$(cat "$TMP_ROOT/custom-role-project/.codex/skills/intake-router/SKILL.md")" "경계가 둘 이상으로 번질 때" "custom intake skill 재진입 값"
assert_contains "$(cat "$TMP_ROOT/custom-role-project/.codex/skills/intake-router/SKILL.md")" "## 종료 판정 기준" "custom intake skill 종료 판정 기준"
assert_contains "$(cat "$TMP_ROOT/custom-role-project/.codex/skills/intake-router/SKILL.md")" "남은 질문이 분리돼 있을 때" "custom intake skill 종료 값"
assert_contains "$(cat "$TMP_ROOT/custom-role-project/.codex/skills/intake-router/SKILL.md")" "다음 역할 누락" "custom intake skill 검증 초점"
CUSTOM_VERIFY_OUTPUT="$(
  cd "$TMP_ROOT/custom-role-project" && \
  bash "$HARNESS_SCRIPT_DIR/harness-verify.sh" 2>&1 || true
)"
assert_not_contains "$CUSTOM_VERIFY_OUTPUT" "누락된 파일: .codex/agents/payment-dev.toml" "custom 역할 verify agent 누락 없음"
assert_not_contains "$CUSTOM_VERIFY_OUTPUT" "누락된 파일: .codex/skills/payment-dev/SKILL.md" "custom 역할 verify skill 누락 없음"
assert_not_contains "$CUSTOM_VERIFY_OUTPUT" "team-spec 최종 역할 인벤토리 미작성" "custom 역할 verify team-spec 작성 완료"
assert_not_contains "$CUSTOM_VERIFY_OUTPUT" "추상 역할명이 남아 있음" "custom 역할 verify seed 역할 없음"
assert_not_contains "$CUSTOM_VERIFY_OUTPUT" "추상 표시 이름이 남아 있음" "custom 역할 verify 범용 표시 이름 없음"
assert_not_contains "$CUSTOM_VERIFY_OUTPUT" "추상 agent 파일명이 남아 있음" "custom 역할 verify 범용 agent file 없음"
assert_contains "$CUSTOM_VERIFY_OUTPUT" "문서 누락: 역할 재작성 미수행" "custom 역할 verify는 최종 보고서 누락만 실패"

log "review/qa 역할 기본 산출 형식 생성 확인"
mkdir -p "$TMP_ROOT/review-qa-project"
(
  cd "$TMP_ROOT/review-qa-project" && \
  bash "$HARNESS_SCRIPT_DIR/harness-init.sh" >/dev/null && \
  perl -0pi -e 's@### 역할 1\n\n- 역할 id:\n- 역할 표시 이름:\n- 역할 유형:\n- 역할 목적:\n- 역할 책임:\n- 주요 입력:\n- 주요 출력:\n- 다음 역할:\n- 중심 역할 여부:\n- 보조 역할 여부:\n- 대표 시작 경로:\n- 우선 입력 문서:\n- 요청 유형별 하위 분기:\n- 작업 시작 체크리스트:\n- 주요 판단 기준:\n- 금지 판단/피해야 할 오해:\n- 출력 규칙:\n- 산출 형식 템플릿:\n- 재진입 트리거:\n- 종료 판정 기준:\n- 완료 기준:\n- 검증/리뷰 초점:\n- agent 파일명:\n- skill 디렉토리명:\n- description 초안:\n- 권장 모델 클래스:\n- sandbox 정책:@### 역할 1\n\n- 역할 id: workspace_boundary_reviewer\n- 역할 표시 이름: workspace-boundary-reviewer\n- 역할 유형: review\n- 역할 목적: 워크스페이스 경계 변경의 회귀 위험을 검토한다.\n- 역할 책임: 위험 순위화;근거 기록;후속 재작업 제안\n- 주요 입력: 현재 요청;team-spec;domain-analysis\n- 주요 출력: 리뷰 findings;추가 검증 요청\n- 다음 역할: release_regression_qa\n- 중심 역할 여부: 아니오\n- 보조 역할 여부: 아니오\n- 대표 시작 경로: packages/workspace/src;packages/common/src\n- 우선 입력 문서: .harness/docs/domain-analysis.md;.harness/docs/team-spec.md\n- 요청 유형별 하위 분기: 공용 타입 변경이면 common-ui 영향 확인;에디터 변경이면 저장 흐름 회귀 우선 검토\n- 작업 시작 체크리스트: 변경 경계 확인;실패 비용 큰 흐름 확인;근거 파일 확보\n- 주요 판단 기준: correctness와 회귀 위험을 먼저 정리;테스트 공백은 별도 분리\n- 금지 판단/피해야 할 오해: 구현 수정까지 직접 맡는다고 가정하지 않음\n- 출력 규칙: severity 순서 findings와 필요한 재작업을 함께 남김\n- 산출 형식 템플릿:\n- 재진입 트리거: 재현 불가 이슈가 남을 때;공용 경계 충돌이 추가로 확인될 때\n- 종료 판정 기준: QA가 바로 이어받을 수 있게 findings와 근거가 분리돼 있을 때\n- 완료 기준: 주요 위험과 근거가 정리되고 다음 역할이 시작 가능\n- 검증/리뷰 초점: correctness;regression;문서와 실제 상태의 불일치;테스트 공백\n- agent 파일명: workspace-boundary-reviewer\n- skill 디렉토리명: workspace-boundary-reviewer\n- description 초안: Review workspace boundary changes for regression and contract risks.\n- 권장 모델 클래스: frontier\n- sandbox 정책: workspace-write\n\n### 역할 2\n\n- 역할 id: release_regression_qa\n- 역할 표시 이름: release-regression-qa\n- 역할 유형: qa\n- 역할 목적: 릴리즈 전 회귀 검증과 남은 위험을 정리한다.\n- 역할 책임: 자동 검증과 수동 검증 분리;잔여 위험 기록;출시 판단 메모\n- 주요 입력: 현재 요청;team-spec;qa-strategy\n- 주요 출력: QA 결과 메모;잔여 위험;다음 조치\n- 다음 역할: second_repo_conductor\n- 중심 역할 여부: 아니오\n- 보조 역할 여부: 아니오\n- 대표 시작 경로: .harness/docs/qa-strategy.md;packages/second/tests\n- 우선 입력 문서: .harness/docs/qa-strategy.md;.harness/docs/team-spec.md\n- 요청 유형별 하위 분기: 데스크톱 변경이면 패키징 위험 기록;공용 변경이면 웹/데스크톱 공통 회귀 분리\n- 작업 시작 체크리스트: 자동 검증 목록 정리;수동 확인 경로 정리;미실행 항목 기준 고정\n- 주요 판단 기준: 실패 비용 큰 흐름부터 검증;미실행 항목은 위험으로 남김\n- 금지 판단/피해야 할 오해: 구현 보완까지 직접 맡는다고 가정하지 않음\n- 출력 규칙: 자동 검증, 수동 검증, 잔여 위험을 분리해 남김\n- 산출 형식 템플릿:\n- 재진입 트리거: 재현이 불안정한 결함이 남을 때;릴리즈 판단이 보류될 때\n- 종료 판정 기준: 다음 역할이 출시 판단을 내릴 수 있게 검증 결과와 잔여 위험이 정리될 때\n- 완료 기준: 자동 검증, 수동 검증, 미실행 항목, 잔여 위험이 구분됨\n- 검증/리뷰 초점: 회귀 위험;릴리즈 차단 요소;미실행 검증\n- agent 파일명: release-regression-qa\n- skill 디렉토리명: release-regression-qa\n- description 초안: Validate release regression risk and summarize remaining issues.\n- 권장 모델 클래스: frontier\n- sandbox 정책: workspace-write@' .harness/docs/team-spec.md && \
  perl -0pi -e 's@<!-- team-spec-roles:start -->\n<!-- team-spec-roles:end -->@<!-- team-spec-roles:start -->\nworkspace_boundary_reviewer|workspace-boundary-reviewer|workspace-boundary-reviewer|gpt-5.4|high|workspace-write|Review workspace boundary changes for regression and contract risks.\nrelease_regression_qa|release-regression-qa|release-regression-qa|gpt-5.4|high|workspace-write|Validate release regression risk and summarize remaining issues.\n<!-- team-spec-roles:end -->@' .harness/docs/team-spec.md && \
  bash "$HARNESS_SCRIPT_DIR/harness-generate-team-assets.sh" >/dev/null
)
assert_contains "$(cat "$TMP_ROOT/review-qa-project/.codex/skills/workspace-boundary-reviewer/SKILL.md")" "## 산출 형식 템플릿" "review 역할 산출 형식 템플릿 섹션"
assert_contains "$(cat "$TMP_ROOT/review-qa-project/.codex/skills/workspace-boundary-reviewer/SKILL.md")" "findings: <severity-ordered findings>" "review 역할 기본 findings 예시"
assert_contains "$(cat "$TMP_ROOT/review-qa-project/.codex/skills/workspace-boundary-reviewer/SKILL.md")" "근거: <files or docs>" "review 역할 기본 근거 예시"
assert_contains "$(cat "$TMP_ROOT/review-qa-project/.codex/skills/release-regression-qa/SKILL.md")" "## 산출 형식 템플릿" "qa 역할 산출 형식 템플릿 섹션"
assert_contains "$(cat "$TMP_ROOT/review-qa-project/.codex/skills/release-regression-qa/SKILL.md")" "자동 검증: <commands or results>" "qa 역할 기본 자동 검증 예시"
assert_contains "$(cat "$TMP_ROOT/review-qa-project/.codex/skills/release-regression-qa/SKILL.md")" "잔여 위험: <remaining risks>" "qa 역할 기본 잔여 위험 예시"

log "역할 스킬 실행 기준 누락 검증 확인"
mkdir -p "$TMP_ROOT/invalid-skill-project"
(
  cd "$TMP_ROOT/invalid-skill-project" && \
  bash "$HARNESS_SCRIPT_DIR/harness-init.sh" >/dev/null && \
  perl -0pi -e 's@### 역할 1\n\n- 역할 id:\n- 역할 표시 이름:\n- 역할 유형:\n- 역할 목적:\n- 역할 책임:\n- 주요 입력:\n- 주요 출력:\n- 다음 역할:\n- 중심 역할 여부:\n- 보조 역할 여부:\n- 대표 시작 경로:\n- 우선 입력 문서:\n- 요청 유형별 하위 분기:\n- 작업 시작 체크리스트:\n- 주요 판단 기준:\n- 금지 판단/피해야 할 오해:\n- 출력 규칙:\n- 산출 형식 템플릿:\n- 재진입 트리거:\n- 종료 판정 기준:\n- 완료 기준:\n- 검증/리뷰 초점:\n- agent 파일명:\n- skill 디렉토리명:\n- description 초안:\n- 권장 모델 클래스:\n- sandbox 정책:@### 역할 1\n\n- 역할 id: payment_dev\n- 역할 표시 이름: payment-dev\n- 역할 유형: dev\n- 역할 목적: 결제 흐름 변경을 구현한다.\n- 역할 책임: 구현 경계 유지;규칙 영향 확인;검증 메모 남기기\n- 주요 입력: 현재 요청;team-spec;qa-strategy\n- 주요 출력: 코드 변경;검증 메모\n- 다음 역할: billing_reviewer\n- 중심 역할 여부: 아니오\n- 보조 역할 여부: 아니오\n- 대표 시작 경로: packages/payment/src; packages/payment/tests\n- 우선 입력 문서: .harness/docs/team-spec.md;.harness/docs/qa-strategy.md\n- 요청 유형별 하위 분기: API 변경이면 규칙 검토 추가; UI 변경이면 checkout 화면 검증 메모 추가\n- 작업 시작 체크리스트: 수정 경계 확인;영향 파일 확인;검증 경로 확인\n- 주요 판단 기준: 공용 규칙 영향 우선 확인;변경 범위를 최소화\n- 금지 판단/피해야 할 오해: 리뷰나 QA 판단까지 선점하지 않음\n- 출력 규칙: 코드 변경과 필요한 검증 메모를 함께 남김\n- 산출 형식 템플릿: 변경 경계: <files>; 실행 검증: <tests>; 미실행 검증: <gaps>\n- 재진입 트리거: 공용 규칙 영향이 확인될 때; QA에서 회귀 위험이 반환될 때\n- 종료 판정 기준: 구현 범위와 검증 메모가 reviewer로 바로 넘길 수 있는 상태일 때\n- 완료 기준: 구현 범위가 닫히고 reviewer로 넘길 수 있음\n- 검증/리뷰 초점: 규칙 회귀;테스트 공백\n- agent 파일명: payment-dev\n- skill 디렉토리명: payment-dev\n- description 초안: Implement payment flow changes and write payment rollout notes.\n- 권장 모델 클래스: frontier\n- sandbox 정책: workspace-write@' .harness/docs/team-spec.md && \
  perl -0pi -e 's@<!-- team-spec-roles:start -->\n<!-- team-spec-roles:end -->@<!-- team-spec-roles:start -->\npayment_dev|payment-dev|payment-dev|gpt-5.4|high|workspace-write|Implement payment flow changes and write payment rollout notes.\n<!-- team-spec-roles:end -->@' .harness/docs/team-spec.md && \
  bash "$HARNESS_SCRIPT_DIR/harness-generate-team-assets.sh" >/dev/null && \
  perl -0pi -e 's@\n## 출력 규칙\n\n- 코드 변경과 필요한 검증 메모를 함께 남김@@' .codex/skills/payment-dev/SKILL.md
)
assert_command_fails_with \
  "$TMP_ROOT/invalid-skill-project" \
  "bash \"$HARNESS_SCRIPT_DIR/harness-verify.sh\"" \
  "출력 규칙 섹션 누락: .codex/skills/payment-dev/SKILL.md" \
  "역할 스킬 출력 규칙 누락 검증"

log "세션 종료 요약 재진입 정보 확인"
mkdir -p "$TMP_ROOT/session-close-project"
(
  cd "$TMP_ROOT/session-close-project" && \
  bash "$HARNESS_SCRIPT_DIR/harness-init.sh" >/dev/null && \
  bash "$HARNESS_SCRIPT_DIR/harness-log.sh" \
    --new-session \
    --status started \
    --request "워크스페이스 변경 검토를 시작한다" \
    --entry-point "second-repo-conductor" \
    --planned-roles "workspace-boundary-reviewer, release-regression-qa" \
    --role "workspace-boundary-reviewer" \
    --result-status "completed" \
    --input-summary "도메인 분석과 팀 스펙을 기준으로 경계 리뷰를 시작했다" \
    --inputs ".harness/docs/domain-analysis.md,.harness/docs/team-spec.md" \
    --output-summary "오케스트레이션 계획과 플레이북에 리뷰 결과를 반영했다" \
    --outputs ".harness/docs/orchestration-plan.md,.harness/docs/team-playbook.md" \
    --changed-files ".harness/docs/orchestration-plan.md,.harness/docs/team-playbook.md" \
    --expected-outputs ".harness/docs/orchestration-plan.md,.harness/docs/team-playbook.md,.harness/logs/latest-session-summary.md" \
    --next-role "release-regression-qa" \
    --unresolved-risks "릴리즈 검증과 잔여 위험 정리가 남아 있음" \
    --note "리뷰 단계 기록" >/dev/null && \
  bash "$HARNESS_SCRIPT_DIR/harness-session-close.sh" --note "리뷰 종료 후 QA 재진입 준비" >/dev/null
)
assert_contains "$(cat "$TMP_ROOT/session-close-project/.harness/logs/session-log.md")" "계획 역할: workspace-boundary-reviewer, release-regression-qa" "세션 로그 계획 역할 기록"
assert_contains "$(cat "$TMP_ROOT/session-close-project/.harness/logs/session-log.md")" "실행 결과 상태: completed" "세션 로그 실행 결과 상태 기록"
assert_contains "$(cat "$TMP_ROOT/session-close-project/.harness/logs/session-log.md")" "변경 파일: .harness/docs/orchestration-plan.md, .harness/docs/team-playbook.md" "세션 로그 변경 파일 기록"
assert_contains "$(cat "$TMP_ROOT/session-close-project/.harness/logs/session-events.tsv")" "completed" "세션 이벤트 결과 상태 기록"
assert_contains "$(cat "$TMP_ROOT/session-close-project/.harness/logs/latest-session-summary.md")" "## 재진입 요약" "세션 종료 latest summary 재진입 요약"
assert_contains "$(cat "$TMP_ROOT/session-close-project/.harness/logs/latest-session-summary.md")" "계획 역할: workspace-boundary-reviewer, release-regression-qa" "세션 종료 latest summary 계획 역할 값"
assert_contains "$(cat "$TMP_ROOT/session-close-project/.harness/logs/latest-session-summary.md")" "역할 결과 상태: completed" "세션 종료 latest summary 결과 상태 값"
assert_contains "$(cat "$TMP_ROOT/session-close-project/.harness/logs/latest-session-summary.md")" "다음 시작 역할: release-regression-qa" "세션 종료 latest summary 다음 시작 역할 값"
assert_contains "$(cat "$TMP_ROOT/session-close-project/.harness/logs/latest-session-summary.md")" "다음 재진입 phase: Phase 4" "세션 종료 latest summary 다음 재진입 phase 값"
assert_contains "$(cat "$TMP_ROOT/session-close-project/.harness/logs/latest-session-summary.md")" "다음 시작 전 우선 확인 입력 파일: .harness/docs/domain-analysis.md, .harness/docs/team-spec.md" "세션 종료 latest summary 우선 입력 값"
assert_contains "$(cat "$TMP_ROOT/session-close-project/.harness/logs/latest-session-summary.md")" "최근 출력 파일: .harness/docs/orchestration-plan.md, .harness/docs/team-playbook.md" "세션 종료 latest summary 최근 출력 값"
assert_contains "$(cat "$TMP_ROOT/session-close-project/.harness/logs/latest-session-summary.md")" "최근 변경 파일: .harness/docs/orchestration-plan.md, .harness/docs/team-playbook.md" "세션 종료 latest summary 최근 변경 파일 값"
assert_contains "$(cat "$TMP_ROOT/session-close-project/.harness/logs/latest-session-summary.md")" "세션 종료 메모: 리뷰 종료 후 QA 재진입 준비" "세션 종료 latest summary 종료 메모 값"

cat > "$TMP_ROOT/stack-project/.harness/docs/project-setup.md" <<'EOF'
# 프로젝트 설정

## 작성 안내

입력 정보가 아직 부족해 자동 판단을 보류합니다.

---

## 프로젝트 목표

ERP 관리 화면과 데스크톱 운영 경로를 함께 정리한다.
EOF
if ! (
  cd "$TMP_ROOT/stack-project" && \
  project_setup_has_answers_check ".harness/docs/project-setup.md"
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
assert_contains "$(cat "$TMP_ROOT/multi-boundary-project/.harness/docs/exploration-notes.md")" "실제 시작점, 경계, 검증 경로는 역할 스킬이 저장소를 다시 읽으며 확정합니다." "다중 경계 탐색 역할 재해석 전제"

log "harness smoke test 통과"
