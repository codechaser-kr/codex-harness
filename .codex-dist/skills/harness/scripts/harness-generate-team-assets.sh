#!/usr/bin/env bash
set -euo pipefail

TEAM_SPEC_FILE=".harness/reports/team-spec.md"

log() {
  printf '[harness][generate] %s\n' "$1"
}

is_seed_role() {
  local role_id="$1"

  case "$role_id" in
    domain_analyst|harness_architect|skill_scaffolder|qa_designer|orchestrator|validator|run_harness)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

require_team_spec() {
  [ -f "$TEAM_SPEC_FILE" ] || {
    printf '[harness][generate][error] team-spec 문서가 없습니다: %s\n' "$TEAM_SPEC_FILE" >&2
    exit 1
  }
}

role_instruction_for() {
  local role_id="$1"

  case "$role_id" in
    domain_analyst)
      printf '%s\n' "저장소를 직접 읽고 domain-analysis.md를 최종 분석 문서로 작성한다.
exploration-notes.md는 자동 판단을 보류하는 약한 메모로만 보고, 실제 코드와 문서를 다시 읽어 핵심 흐름과 위험 변경 유형을 고정한다.
qa-designer, harness-architect, orchestrator가 공통으로 참조할 수 있는 분석 결과를 남긴다."
      ;;
    harness_architect)
      printf '%s\n' "저장소 입력 문서를 바탕으로 harness-architecture.md와 team-structure.md를 메타시스템 문서로 작성한다.
실행 모드와 아키텍처 패턴 선택을 먼저 고정하고, 왜 그 패턴이 현재 저장소와 요청에 맞는지부터 적는다.
그 다음 역할 경계와 handoff 기준을 분명히 적는다."
      ;;
    skill_scaffolder)
      printf '%s\n' "핵심 문서 작성 흐름이 아니라 sync 루프에서 스킬 계약 정렬이 필요한 예외 상황에서만 개입한다.
.codex/skills/*의 설명, 책임, 트리거가 현재 메타시스템 구조와 어긋나는 지점을 정렬한다."
      ;;
    qa_designer)
      printf '%s\n' "qa-strategy.md를 최종 QA 전략 문서로 작성한다.
자동과 수동 검증을 나누고, 승격 기준과 변경 유형별 체크 기준을 validator와 orchestrator가 공통으로 쓸 수 있게 고정한다."
      ;;
    orchestrator)
      printf '%s\n' "요청 유형별 시작점과 재진입 기준을 orchestration-plan.md와 team-playbook.md에 작성한다.
팀 운영 원칙과 종료 조건을 실제 하네스 운영 흐름으로 고정한다."
      ;;
    validator)
      printf '%s\n' "저장소 입력 문서와 메타시스템 문서의 목적 혼합, 실행 모드/패턴 drift, phase 게이트 누락, sync 불일치, evolve 필요 신호를 찾는다.
verify가 맡는 파일/구조 문제와 validator가 맡는 운영 계약 문제를 구분한다.
어떤 역할이 어느 문서를 다시 써야 하는지 재작성 책임을 분명히 지정한다."
      ;;
    run_harness)
      printf '%s\n' "현재 .harness/reports/*, .codex/config.toml, .codex/agents/*.toml, .codex/skills/*, 로그 상태를 읽는다.
어떤 저장소 입력 문서 또는 메타시스템 문서부터 다시 써야 하는지와 어느 Phase부터 다시 시작해야 하는지 결정한다.
항상 상태 모드, 실행 모드, 실행 패턴, 현재 루프 판단(drift / sync / evolve)을 함께 제시하고 그 이유를 짧게 남긴다."
      ;;
    *)
      printf '%s\n' "team-spec에 정의된 역할 책임과 입력/출력 계약을 기준으로 작업한다."
      ;;
  esac
}

write_config_header() {
  cat > ".codex/config.toml" <<'EOF'
# team-spec 기반 초기 에이전트 팀 설정
# Phase 2에서 team-spec을 다시 작성하면, 이 파일도 해당 스펙을 기준으로 다시 생성합니다.

[agents]
max_threads = 4
max_depth = 1

[agents.default]
description = "General-purpose helper."
EOF
}

append_config_section() {
  local role_id="$1"
  local agent_file="$2"
  local description="$3"

  cat >> ".codex/config.toml" <<EOF

[agents.${role_id}]
description = "${description}"
config_file = "agents/${agent_file}.toml"
EOF
}

write_agent_file() {
  local role_id="$1"
  local agent_file="$2"
  local model="$3"
  local reasoning="$4"
  local sandbox="$5"
  local description="$6"
  local instructions

  instructions="$(role_instruction_for "$role_id")"

  cat > ".codex/agents/${agent_file}.toml" <<EOF
# team-spec 기반 생성 결과
# team-spec 역할 id: ${role_id}
name = "${role_id}"
description = "${description}"
model = "${model}"
model_reasoning_effort = "${reasoning}"
sandbox_mode = "${sandbox}"
developer_instructions = """\n${instructions}\n"""
EOF

  log "agent 생성: .codex/agents/${agent_file}.toml"
}

write_skill_file() {
  local role_id="$1"
  local display_name="$2"
  local skill_dir="$3"
  local sandbox="$4"
  local description="$5"
  local skill_file=".codex/skills/${skill_dir}/SKILL.md"

  mkdir -p ".codex/skills/${skill_dir}"

  if [ -f "$skill_file" ]; then
    log "기존 skill 유지: ${skill_file}"
    return
  fi

  cat > "$skill_file" <<EOF
---
name: ${display_name}
description: ${description}
---

# ${display_name}

이 스킬은 \`team-spec\`에서 정의한 역할을 Codex 로컬 실행 계약으로 옮긴 기본 스킬이다.

## 목적

\`${role_id}\` 역할이 맡아야 하는 작업 범위와 산출물 책임을 현재 프로젝트 기준으로 유지한다.

## 입력

- 현재 요청
- \`.harness/reports/team-spec.md\`
- 필요 시 관련 \`.harness/reports/*\` 문서

## 출력

- team-spec에 정의된 역할 산출물

## 기본 운영 규칙

- 이 역할은 \`team-spec\`에 적힌 목적, 입력, 출력, handoff를 먼저 따른다.
- \`AGENTS.md\`, \`.codex/config.toml\`, \`.codex/agents/*.toml\`과 서로 충돌하는 설명을 새로 만들지 않는다.
- 현재 sandbox 정책은 \`${sandbox}\` 이다.
- description 초안은 다음과 같다: ${description}
- 프로젝트 맞춤 절차가 더 필요해지면 이 스킬을 구체화하되, team-spec의 역할 책임과 어긋나지 않게 유지한다.
EOF

  log "skill 생성: ${skill_file}"
}

generate_assets() {
  local parsed=0

  mkdir -p ".codex" ".codex/agents" ".codex/skills"
  write_config_header

  while IFS='|' read -r role_id display_name agent_file model reasoning sandbox description; do
    [ -n "${role_id:-}" ] || continue
    append_config_section "$role_id" "$agent_file" "$description"
    write_agent_file "$role_id" "$agent_file" "$model" "$reasoning" "$sandbox" "$description"
    if ! is_seed_role "$role_id"; then
      write_skill_file "$role_id" "$display_name" "$agent_file" "$sandbox" "$description"
    fi
    parsed=1
  done < <(awk '
    /<!-- team-spec-roles:start -->/ { in_block = 1; next }
    /<!-- team-spec-roles:end -->/ { in_block = 0; exit }
    in_block && NF { print }
  ' "$TEAM_SPEC_FILE")

  if [ "$parsed" -eq 0 ]; then
    printf '[harness][generate][error] team-spec 역할 인벤토리를 읽지 못했습니다: %s\n' "$TEAM_SPEC_FILE" >&2
    exit 1
  fi

  log "config 생성: .codex/config.toml"
}

require_team_spec
generate_assets
