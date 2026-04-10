#!/usr/bin/env bash
# harness-init.sh
# seed 역할 없이 입력 메모와 team-spec 설계 계약만 최초 1회 생성합니다.
set -euo pipefail

ROOT_DIR="$(pwd)"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$SCRIPT_DIR/harness-lib.sh"

log() {
  printf '[harness][init] %s\n' "$1"
}

create_dir() {
  local dir="$1"
  if [ ! -d "$dir" ]; then
    mkdir -p "$dir"
    log "디렉토리 생성: $dir"
  else
    log "이미 존재함: $dir"
  fi
}

create_file_if_missing() {
  local file="$1"
  local content="$2"

  if [ ! -f "$file" ]; then
    printf "%s\n" "$content" > "$file"
    log "파일 생성: $file"
  else
    log "기존 파일 유지: $file"
  fi
}

ensure_gitignore_entry() {
  local entry="$1"
  local gitignore_file=".gitignore"

  touch "$gitignore_file"

  if grep -Fxq "$entry" "$gitignore_file"; then
    log "gitignore 유지: $entry"
    return
  fi

  printf '%s\n' "$entry" >> "$gitignore_file"
  log "gitignore 추가: $entry"
}

HARNESS_OPERATION_MODE="$(detect_harness_operation_mode)"
HARNESS_AUDIT_SUMMARY="$(build_harness_audit_summary "$HARNESS_OPERATION_MODE")"
AGENTS_AUDIT_SUMMARY="$(build_agents_audit_summary "$HARNESS_OPERATION_MODE")"
EXPLORATION_NOTES_FILE="$EXPLORATION_NOTES_DEFAULT_PATH"

mkdir -p ".harness/reports"
bash "$SCRIPT_DIR/harness-explore.sh" "$EXPLORATION_NOTES_FILE" >/dev/null
EXPLORATION_CONTEXT_LEVEL="$(detect_exploration_context_level "$EXPLORATION_NOTES_FILE")"
EXPLORATION_ANCHOR_SUMMARY="$(build_exploration_anchor_summary "$EXPLORATION_NOTES_FILE")"

log "프로젝트 로컬 실행 하네스 초기화 시작: $ROOT_DIR"
log "하네스 운영 모드: $HARNESS_OPERATION_MODE"
log "입력 메모 문서: $EXPLORATION_NOTES_FILE"
log "입력 상태: $EXPLORATION_CONTEXT_LEVEL"
log "입력 메모 요약: $EXPLORATION_ANCHOR_SUMMARY"
while IFS= read -r audit_line; do
  [ -n "$audit_line" ] || continue
  log "하네스 감사: $audit_line"
done <<< "$HARNESS_AUDIT_SUMMARY"
while IFS= read -r agents_line; do
  [ -n "$agents_line" ] || continue
  log "상위 컨텍스트 감사: $agents_line"
done <<< "$AGENTS_AUDIT_SUMMARY"

create_dir ".codex"
create_dir ".harness"
create_dir ".harness/reports"
create_dir ".harness/logs"

if optional_harness_assets_enabled "$EXPLORATION_NOTES_FILE"; then
  create_dir ".harness/scenarios"
  create_dir ".harness/templates"
else
  log "조건부 자산 생성 보류: .harness/scenarios"
  log "조건부 자산 생성 보류: .harness/templates"
fi

if exploration_requires_user_bootstrap "$EXPLORATION_NOTES_FILE"; then
  create_file_if_missing ".harness/project-setup.md" \
"# 프로젝트 설정

## 작성 안내

입력 정보가 아직 부족해 자동 판단을 보류합니다.
아래 항목을 채운 뒤 AI에게 다음과 같이 요청하세요:

> project-setup.md를 작성했습니다. 이 내용을 바탕으로 하네스 분석을 시작해주세요.

그러면 Phase 1과 Phase 2가 이 파일의 답변을 시작 입력으로 사용해 저장소 분석과 역할 팀 설계를 진행합니다.

---

## 프로젝트 목표

<!-- 이 프로젝트가 해결하려는 문제를 한 문장으로 적어주세요 -->

## 프로젝트 성격

<!-- 애플리케이션, 라이브러리, 내부 도구, 운영 시스템 등 현재 생각하는 성격을 자유롭게 적어주세요 -->

## 주요 사용자

<!-- 누가 이 프로젝트를 사용하나요? (최종 사용자, 다른 개발자, 내부 팀 등) -->

## 첫 번째 성공 시나리오

<!-- 가장 먼저 동작해야 할 핵심 흐름 한 가지를 한 문장으로 적어주세요 -->

## 대표 진입점 또는 시작 경로

<!-- 어디서부터 실행 흐름을 읽어야 할지 알고 있다면 파일/디렉토리/명령 기준으로 적어주세요 -->

## 현재 알고 있는 주요 경계

<!-- 앱/서비스/패키지/모듈/문서/운영 영역처럼 나뉘는 단위가 있으면 적어주세요 -->

## 현재 알고 있는 실행·검증 경로

<!-- 실행 명령, 테스트 명령, 배포 경로, 운영 확인 경로 중 아는 것이 있으면 적어주세요 -->

## 실패 비용이 큰 영역

<!-- 이 프로젝트에서 잘못되면 가장 큰 문제가 생기는 부분은 어디인가요? -->
"
fi

create_file_if_missing ".harness/reports/team-spec.md" \
"# 팀 스펙

이 문서는 \`Phase 2 프로젝트 맞춤 에이전트 팀 설계\`의 핵심 산출물입니다.
\`Phase 2\`가 이 문서에 최종 역할 인벤토리를 직접 작성한 뒤에만, \`Phase 3\`이 \`.codex/config.toml\`, \`.codex/agents/*.toml\`, \`.codex/skills/*\`를 생성해야 합니다.

## 상태

- 현재 상태: 역할 설계 전
- 다음 단계: 저장소 분석과 메타시스템 설계를 반영해 프로젝트 맞춤 역할 팀 스펙과 최종 역할 인벤토리 작성

## 팀 메타데이터

- 저장소 요약:
- 상태 모드:
- 실행 모드:
- 실행 패턴:
- 팀 설계 이유:

## 도메인 근거 요약

- 대표 사용자/운영 흐름:
- 실패 비용이 큰 경계:
- 핵심 코드/문서 근거:
- 이 팀이 먼저 다뤄야 할 요청 유형:
- seed 역할 이름을 그대로 쓰기 어려운 이유:

## 역할명 설계 메모

- 역할명은 도메인 명사 + 책임 동사/역할 조합을 우선합니다.
- 예: \`payment-dev\`, \`billing-reviewer\`, \`checkout-qa\`, \`desktop-runtime-dev\`, \`ipc-reviewer\`
- seed 이름을 유지한다면 왜 범용 이름이 더 적절한지 적습니다.
- 새 역할명을 만들었다면 어떤 기존 역할 개념을 대체하는지 함께 적습니다.
- \`role_id\`는 snake_case, 표시 이름과 파일/디렉토리명은 kebab-case를 기본으로 둡니다.

## 팀 설계 결정

- 중심 역할:
- 보조 역할:
- 기본 시작 역할:
- 요청 유형별 시작 역할:
- 재진입 규칙:
- validator 개입 시점:
- 재구성 조건:

## 역할 스펙 초안

### 역할 1

- 역할 id:
- 역할 표시 이름:
- 역할 목적:
- 역할 책임:
- 주요 입력:
- 주요 출력:
- handoff 대상:
- 중심 역할 여부:
- 보조 역할 여부:
- agent 파일명:
- skill 디렉토리명:
- description 초안:
- 권장 모델 클래스:
- sandbox 정책:

## 생성 규칙

- \`.codex/config.toml\`에는 아래 최종 역할 목록을 모두 등록합니다.
- \`.codex/agents/*.toml\`은 역할 식별, 모델, sandbox, 짧은 실행 설명을 담습니다.
- \`.codex/skills/*\`는 역할별 절차, 입력/출력, handoff, 완료 기준을 담습니다.
- 생성기보다 team-spec이 우선하며, 파일명/역할명/책임 범위가 다르면 team-spec 기준으로 다시 생성합니다.
- 프로젝트 특화 역할을 만들 때는 seed 이름보다 저장소 고유 용어를 우선합니다.
- 같은 역할을 서로 다른 표기로 중복 정의하지 않습니다. 예: \`payment_dev\`, \`payment-dev\`, \`payments-dev\`

## 최종 역할 인벤토리

아래 블록은 \`Phase 2\`가 직접 채워야 하는 최종 역할 인벤토리입니다.
\`harness-init.sh\`는 seed 역할을 넣지 않습니다.
\`Phase 3\`은 이 블록만 입력으로 \`.codex/config.toml\`, \`.codex/agents/*.toml\`, \`.codex/skills/*\`를 생성합니다.
줄 형식은 \`role_id|display_name|agent_file|model|reasoning|sandbox|description\` 입니다.

<!-- team-spec-roles:start -->
<!-- team-spec-roles:end -->

프로젝트 특화 역할 예시:

- \`payment_dev|payment-dev|payment-dev|gpt-5.4|high|workspace-write|Implement payment flow changes and write payment rollout notes.\`
- \`billing_reviewer|billing-reviewer|billing-reviewer|gpt-5.4|high|read-only|Review billing contract changes and regression risks.\`

## 작성 메모

- 고정 seed 역할 이름을 그대로 유지할지, 프로젝트 도메인에 맞는 새 역할명을 만들지 여기서 결정합니다.
- 역할 이름을 바꾸면 seed 흔적을 남기지 말고, 그 이유와 대체 관계를 팀 메타데이터 또는 역할 책임에 적습니다.
- 최종 역할 인벤토리가 비어 있으면 \`Phase 2\`가 끝나지 않은 상태로 봅니다.
- 이 문서가 정리되기 전에는 \`.codex/config.toml\`, \`.codex/agents/*.toml\`, \`.codex/skills/*\`를 만들지 않습니다.
- \`Phase 2\`가 역할 인벤토리를 실제로 작성한 뒤에만 \`Phase 3\` 생성기를 실행합니다.
"

ensure_gitignore_entry ".harness/logs/.current-session"
ensure_gitignore_entry ".harness/logs/session-log.md"
ensure_gitignore_entry ".harness/logs/session-events.tsv"
ensure_gitignore_entry ".harness/logs/latest-session-summary.md"
ensure_gitignore_entry ".harness/logs/role-frequency.md"
ensure_gitignore_entry ".harness/logs/session-summary-*.md"

create_file_if_missing "AGENTS.md" \
"# AGENTS.md

이 저장소는 Codex 하네스 메타시스템을 사용합니다.

## 역할 팀 생성 안내

- init 직후에는 프로젝트 특화 역할 팀이 아직 생성되지 않은 상태입니다.
- \`Phase 2 프로젝트 맞춤 에이전트 팀 설계\`가 \`team-spec.md\`의 최종 역할 인벤토리를 직접 작성합니다.
- \`Phase 3 에이전트 정의 생성\`은 그 결과만 읽고 \`.codex/config.toml\`, \`.codex/agents/*.toml\`, \`.codex/skills/*\`를 생성합니다.

## 기본 진입점

- 하네스 초기화: \`bash ~/.codex/skills/harness/scripts/harness-init.sh\`
- 하네스 갱신: \`bash ~/.codex/skills/harness/scripts/harness-update.sh\`
- 하네스 검증: \`bash ~/.codex/skills/harness/scripts/harness-verify.sh\`
- 에이전트 생성: \`bash ~/.codex/skills/harness/scripts/harness-generate-team-assets.sh\`

## 상태 모드

- 신규 구축
- 기존 확장
- 운영 유지보수

## 실행 모드

- 에이전트 팀
- 단일 역할
- 하이브리드

## 실행 패턴

- 파이프라인
- 생성-검증
- 팬아웃/팬인
- 오케스트레이션 중심
- 전문가 풀

## 운영 원칙

- \`exploration-notes.md\`는 자동 판단 보류를 위한 약한 메모로 사용합니다.
- \`team-spec.md\`는 프로젝트 맞춤 에이전트 팀과 동적 생성 결과를 연결하는 스펙 문서입니다.
- \`harness-init.sh\` 직후 상태는 완료가 아니라 자동 판단 보류 메모와 역할 설계 계약만 준비된 상태입니다.
- 최종 문서는 역할 스킬과 에이전트 팀이 직접 작성한 뒤 검증합니다.
- drift / sync / evolve는 운영 유지보수의 기본 루프입니다.
"

ensure_harness_log_scaffold

log "하네스 초기화 완료"
log "현재 상태는 입력 메모와 역할 설계 계약만 준비된 상태입니다."
log "다음 단계: Phase 2가 team-spec의 최종 역할 인벤토리를 작성한 뒤 Phase 3 생성기를 실행해야 합니다."
