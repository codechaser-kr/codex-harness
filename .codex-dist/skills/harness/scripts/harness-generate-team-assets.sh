#!/usr/bin/env bash
set -euo pipefail

TEAM_SPEC_FILE=".harness/reports/team-spec.md"

log() {
  printf '[harness][generate] %s\n' "$1"
}

require_team_spec() {
  [ -f "$TEAM_SPEC_FILE" ] || {
    printf '[harness][generate][error] team-spec 문서가 없습니다: %s\n' "$TEAM_SPEC_FILE" >&2
    exit 1
  }
}

role_instruction_for() {
  local role_id="$1"
  local display_name="$2"
  local description="$3"

  printf '%s\n' "이 역할의 최종 정의는 .harness/reports/team-spec.md 에 있다.
${display_name} 역할은 team-spec에 적힌 목적, 책임, 입력, 출력, handoff를 먼저 다시 읽고 작업한다.
현재 저장소의 도메인 용어와 실제 요청 경계를 기준으로 판단한다.
description 초안은 다음과 같다: ${description}"
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

  instructions="$(role_instruction_for "$role_id" "$agent_file" "$description")"

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

## 주요 작업

1. \`.harness/reports/team-spec.md\`에서 이 역할의 목적, 입력, 출력, handoff를 다시 읽는다.
2. 현재 요청이 이 역할의 책임 범위에 실제로 들어오는지 먼저 확인한다.
3. 관련 보고서나 산출물을 직접 읽고, 이 역할이 담당해야 할 결과만 작성하거나 갱신한다.

## 입력

- 현재 요청
- \`.harness/reports/team-spec.md\`
- 필요 시 관련 \`.harness/reports/*\` 문서

## 출력

- team-spec에 정의된 역할 산출물

## 역할 팀 내 위치

- team-spec이 정의한 프로젝트 특화 역할

## 협업 원칙

- 이 역할은 \`team-spec\`에 적힌 목적, 입력, 출력, handoff를 먼저 따른다.
- \`AGENTS.md\`, \`.codex/config.toml\`, \`.codex/agents/*.toml\`과 서로 충돌하는 설명을 새로 만들지 않는다.
- 프로젝트 맞춤 절차가 더 필요해지면 이 스킬을 구체화하되, team-spec의 역할 책임과 어긋나지 않게 유지한다.

## 운영 규칙

- 현재 sandbox 정책은 \`${sandbox}\` 이다.
- description 초안은 다음과 같다: ${description}
- 이 파일이 얇은 기본 스킬로 시작하더라도, 실제 프로젝트 운영 중에는 해당 역할이 직접 더 구체적인 실행 계약으로 다시 써야 한다.
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
    write_skill_file "$role_id" "$display_name" "$agent_file" "$sandbox" "$description"
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
