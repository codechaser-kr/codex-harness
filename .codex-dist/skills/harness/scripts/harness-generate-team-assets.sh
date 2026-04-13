#!/usr/bin/env bash
set -euo pipefail

TEAM_SPEC_FILE=".harness/docs/team-spec.md"

declare -A ROLE_TYPES
declare -A ROLE_START_PATHS
declare -A ROLE_PRIORITY_INPUTS
declare -A ROLE_REQUEST_BRANCHES
declare -A ROLE_START_CHECKLISTS
declare -A ROLE_DECISION_RULES
declare -A ROLE_ANTI_PATTERNS
declare -A ROLE_OUTPUT_CONTRACTS
declare -A ROLE_OUTPUT_TEMPLATES
declare -A ROLE_REENTRY_TRIGGERS
declare -A ROLE_EXIT_CRITERIA
declare -A ROLE_COMPLETION_CRITERIA
declare -A ROLE_VERIFICATION_FOCUS

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
  local role_type="${ROLE_TYPES[$role_id]:-역할별}"

  printf '%s\n' "이 역할의 최종 정의는 .harness/docs/team-spec.md 에 있다.
${display_name} 역할은 team-spec에 적힌 목적, 책임, 입력, 출력, 다음 역할, 실행 기준을 먼저 다시 읽고 작업한다.
역할 유형은 ${role_type} 이다.
현재 저장소의 도메인 용어와 실제 요청 경계를 기준으로 판단한다.
description 초안은 다음과 같다: ${description}"
}

trim() {
  local value="$1"

  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  printf '%s' "$value"
}

field_value() {
  local role_id="$1"
  local key="$2"
  local value=""

  case "$key" in
    "역할 유형") value="${ROLE_TYPES[$role_id]:-}" ;;
    "대표 시작 경로") value="${ROLE_START_PATHS[$role_id]:-}" ;;
    "우선 입력 문서") value="${ROLE_PRIORITY_INPUTS[$role_id]:-}" ;;
    "요청 유형별 하위 분기") value="${ROLE_REQUEST_BRANCHES[$role_id]:-}" ;;
    "작업 시작 체크리스트") value="${ROLE_START_CHECKLISTS[$role_id]:-}" ;;
    "주요 판단 기준") value="${ROLE_DECISION_RULES[$role_id]:-}" ;;
    "금지 판단/피해야 할 오해") value="${ROLE_ANTI_PATTERNS[$role_id]:-}" ;;
    "출력 규칙") value="${ROLE_OUTPUT_CONTRACTS[$role_id]:-}" ;;
    "산출 형식 템플릿") value="${ROLE_OUTPUT_TEMPLATES[$role_id]:-}" ;;
    "재진입 트리거") value="${ROLE_REENTRY_TRIGGERS[$role_id]:-}" ;;
    "종료 판정 기준") value="${ROLE_EXIT_CRITERIA[$role_id]:-}" ;;
    "완료 기준") value="${ROLE_COMPLETION_CRITERIA[$role_id]:-}" ;;
    "검증/리뷰 초점") value="${ROLE_VERIFICATION_FOCUS[$role_id]:-}" ;;
  esac

  printf '%s' "$value"
}

field_value_from_team_spec() {
  local role_id="$1"
  local key="$2"

  awk -v role_id="$role_id" -v key="$key" '
    function trim(s) {
      gsub(/^[[:space:]]+/, "", s)
      gsub(/[[:space:]]+$/, "", s)
      return s
    }
    /^## 역할 스펙 초안/ { in_specs = 1; next }
    /^## 생성 규칙/ { exit }
    !in_specs { next }
    /^### / { current_role = ""; next }
    /^[[:space:]]*[-*][[:space:]]*역할 id[[:space:]]*:/ {
      current_role = trim(substr($0, index($0, ":") + 1))
      next
    }
    current_role == role_id && $0 ~ ("^[[:space:]]*[-*][[:space:]]*" key "[[:space:]]*:") {
      print trim(substr($0, index($0, ":") + 1))
      exit
    }
  ' "$TEAM_SPEC_FILE"
}

print_contract_bullets() {
  local role_id="$1"
  local key="$2"
  local fallback="$3"
  local raw

  if [ "$key" = "산출 형식 템플릿" ]; then
    # 산출 형식 템플릿은 팀 스펙의 최종 입력을 그대로 반영해야 하므로,
    # 로컬 필드 캐시(field_value) 대신 team-spec 원본을 사용한다.
    raw="$(field_value_from_team_spec "$role_id" "$key")"
    if [ -z "$(trim "$raw")" ]; then
      raw="$fallback"
    fi
    print_raw_bullets "$raw" "$fallback"
    return
  fi

  raw="$(field_value "$role_id" "$key")"
  if [ -z "$(trim "$raw")" ]; then
    raw="$(field_value_from_team_spec "$role_id" "$key")"
  fi
  print_raw_bullets "$raw" "$fallback"
}

print_raw_bullets() {
  local raw="$1"
  local fallback="$2"
  local line
  local -a parts

  raw="$(trim "$raw")"

  if [ -z "$raw" ]; then
    printf -- '- %s\n' "$fallback"
    return
  fi

  if printf '%s' "$raw" | grep -q ';'; then
    IFS=';' read -r -a parts <<< "$raw"
    for line in "${parts[@]}"; do
      line="$(trim "$line")"
      [ -n "$line" ] || continue
      printf -- '- %s\n' "$line"
    done
    return
  fi

  printf -- '- %s\n' "$raw"
}

normalized_role_type() {
  local role_id="$1"
  local agent_file="$2"
  local role_type

  role_type="$(trim "${ROLE_TYPES[$role_id]:-}")"
  role_type="${role_type,,}"

  if [ -n "$role_type" ]; then
    printf '%s' "$role_type"
    return
  fi

  case "${role_id} ${agent_file}" in
    *qa* ) printf '%s' "qa" ;;
    *review*|*reviewer*|*auditor* ) printf '%s' "review" ;;
    *conductor*|*orchestr*|*router* ) printf '%s' "conductor" ;;
    *architect* ) printf '%s' "architect" ;;
    *analyst* ) printf '%s' "analyst" ;;
    * ) printf '%s' "dev" ;;
  esac
}

print_type_specific_steps() {
  local role_type="$1"

  case "$role_type" in
    conductor)
      cat <<'EOF'
1. 현재 요청을 어떤 역할이 시작해야 하는지 먼저 판정한다.
2. 필요한 입력 문서와 선행 역할 산출물이 준비됐는지 점검한다.
3. 다음 역할로 넘기는 순서, 재진입 시점, 종료 조건을 짧게 고정한 뒤 전달한다.
EOF
      ;;
    review)
      cat <<'EOF'
1. 변경 범위와 실패 비용이 큰 경계를 먼저 좁혀 읽는다.
2. correctness, regression, 문서와 실제 상태의 불일치, 테스트 공백을 우선순위대로 점검한다.
3. finding이 있으면 파일 근거와 함께 남기고, 승인 가능 여부를 분리해 정리한다.
EOF
      ;;
    qa)
      cat <<'EOF'
1. 자동 검증과 수동 확인 경로를 먼저 나눈다.
2. 실패 비용이 큰 흐름부터 검증 순서를 세운다.
3. 미실행 항목은 누락이 아니라 남은 위험으로 명시한다.
EOF
      ;;
    architect)
      cat <<'EOF'
1. 구조 경계와 역할 연결 병목을 먼저 정리한다.
2. 책임 분리와 재구성 비용이 큰 축을 우선 판단한다.
3. 팀 구조와 실행 패턴 변경이 필요한지 메타시스템 문서 기준으로 결정한다.
EOF
      ;;
    analyst)
      cat <<'EOF'
1. 저장소 입력 문서와 실제 코드 경계를 다시 읽어 핵심 흐름을 고정한다.
2. 경로 나열보다 사용자 흐름, 운영 경계, 실패 비용을 먼저 설명한다.
3. 후속 역할이 바로 사용할 수 있는 사실 중심 입력 문서를 남긴다.
EOF
      ;;
    *)
      cat <<'EOF'
1. 변경 요청이 이 역할의 구현 경계 안에 들어오는지 먼저 확인한다.
2. 관련 입력 문서와 코드 경계를 읽고 수정 범위를 좁힌다.
3. 구현 결과와 필요한 검증 메모를 함께 남긴다.
EOF
      ;;
  esac
}

default_output_template_for_type() {
  local role_type="$1"

  case "$role_type" in
    conductor)
      cat <<'EOF'
시작 역할: <role>
이유: <why>
선행 입력: <inputs>
다음 역할: <next-role>
종료 전 검증: <checks>
EOF
      ;;
    review)
      cat <<'EOF'
findings: <severity-ordered findings>
근거: <files or docs>
필요한 재작업: <follow-up work>
추가 검증: <extra QA or checks>
EOF
      ;;
    qa)
      cat <<'EOF'
자동 검증: <commands or results>
수동 검증: <manual checks>
미실행 항목: <skipped checks>
잔여 위험: <remaining risks>
다음 조치: <next action>
EOF
      ;;
    *)
      cat <<'EOF'
구현 요약: <change summary>
영향 파일: <files>
검증 명령: <commands>
잔여 위험: <remaining risks>
후속 역할: <next role>
EOF
      ;;
  esac
}

load_role_contracts() {
  local line
  local role_id
  local role_type
  local start_paths
  local priority_inputs
  local request_branches
  local start_checklist
  local decision_rules
  local anti_patterns
  local output_contract
  local output_template
  local reentry_triggers
  local exit_criteria
  local completion_criteria
  local verification_focus

  while IFS=$'\t' read -r role_id role_type start_paths priority_inputs request_branches start_checklist decision_rules anti_patterns output_contract output_template reentry_triggers exit_criteria completion_criteria verification_focus; do
    [ -n "${role_id:-}" ] || continue
    ROLE_TYPES["$role_id"]="$(trim "${role_type:-}")"
    ROLE_START_PATHS["$role_id"]="$(trim "${start_paths:-}")"
    ROLE_PRIORITY_INPUTS["$role_id"]="$(trim "${priority_inputs:-}")"
    ROLE_REQUEST_BRANCHES["$role_id"]="$(trim "${request_branches:-}")"
    ROLE_START_CHECKLISTS["$role_id"]="$(trim "${start_checklist:-}")"
    ROLE_DECISION_RULES["$role_id"]="$(trim "${decision_rules:-}")"
    ROLE_ANTI_PATTERNS["$role_id"]="$(trim "${anti_patterns:-}")"
    ROLE_OUTPUT_CONTRACTS["$role_id"]="$(trim "${output_contract:-}")"
    ROLE_OUTPUT_TEMPLATES["$role_id"]="$(trim "${output_template:-}")"
    ROLE_REENTRY_TRIGGERS["$role_id"]="$(trim "${reentry_triggers:-}")"
    ROLE_EXIT_CRITERIA["$role_id"]="$(trim "${exit_criteria:-}")"
    ROLE_COMPLETION_CRITERIA["$role_id"]="$(trim "${completion_criteria:-}")"
    ROLE_VERIFICATION_FOCUS["$role_id"]="$(trim "${verification_focus:-}")"
  done < <(awk '
    function trim(s) {
      gsub(/^[[:space:]]+/, "", s)
      gsub(/[[:space:]]+$/, "", s)
      return s
    }
    function emit() {
      if (role_id == "") {
        return
      }
      printf "%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n",
        role_id,
        role_type,
        start_paths,
        priority_inputs,
        request_branches,
        start_checklist,
        decision_rules,
        anti_patterns,
        output_contract,
        output_template,
        reentry_triggers,
        exit_criteria,
        completion_criteria,
        verification_focus
    }
    /^## 역할 스펙 초안/ {
      in_specs = 1
      next
    }
    /^## 생성 규칙/ {
      if (in_specs) {
        emit()
      }
      exit
    }
    !in_specs {
      next
    }
    /^### / {
      emit()
      role_id = ""
      role_type = ""
      start_paths = ""
      priority_inputs = ""
      request_branches = ""
      start_checklist = ""
      decision_rules = ""
      anti_patterns = ""
      output_contract = ""
      output_template = ""
      reentry_triggers = ""
      exit_criteria = ""
      completion_criteria = ""
      verification_focus = ""
      next
    }
    /^[[:space:]]*[-*][[:space:]]*역할 id[[:space:]]*:/ {
      role_id = trim(substr($0, index($0, ":") + 1))
      next
    }
    /^[[:space:]]*[-*][[:space:]]*역할 유형[[:space:]]*:/ {
      role_type = trim(substr($0, index($0, ":") + 1))
      next
    }
    /^[[:space:]]*[-*][[:space:]]*대표 시작 경로[[:space:]]*:/ {
      start_paths = trim(substr($0, index($0, ":") + 1))
      next
    }
    /^[[:space:]]*[-*][[:space:]]*우선 입력 문서[[:space:]]*:/ {
      priority_inputs = trim(substr($0, index($0, ":") + 1))
      next
    }
    /^[[:space:]]*[-*][[:space:]]*요청 유형별 하위 분기[[:space:]]*:/ {
      request_branches = trim(substr($0, index($0, ":") + 1))
      next
    }
    /^[[:space:]]*[-*][[:space:]]*작업 시작 체크리스트[[:space:]]*:/ {
      start_checklist = trim(substr($0, index($0, ":") + 1))
      next
    }
    /^[[:space:]]*[-*][[:space:]]*주요 판단 기준[[:space:]]*:/ {
      decision_rules = trim(substr($0, index($0, ":") + 1))
      next
    }
    /^[[:space:]]*[-*][[:space:]]*금지 판단\/피해야 할 오해[[:space:]]*:/ {
      anti_patterns = trim(substr($0, index($0, ":") + 1))
      next
    }
    /^[[:space:]]*[-*][[:space:]]*출력 규칙[[:space:]]*:/ {
      output_contract = trim(substr($0, index($0, ":") + 1))
      next
    }
    /^[[:space:]]*[-*][[:space:]]*산출 형식 템플릿[[:space:]]*:/ {
      output_template = trim(substr($0, index($0, ":") + 1))
      next
    }
    /^[[:space:]]*[-*][[:space:]]*재진입 트리거[[:space:]]*:/ {
      reentry_triggers = trim(substr($0, index($0, ":") + 1))
      next
    }
    /^[[:space:]]*[-*][[:space:]]*종료 판정 기준[[:space:]]*:/ {
      exit_criteria = trim(substr($0, index($0, ":") + 1))
      next
    }
    /^[[:space:]]*[-*][[:space:]]*완료 기준[[:space:]]*:/ {
      completion_criteria = trim(substr($0, index($0, ":") + 1))
      next
    }
    /^[[:space:]]*[-*][[:space:]]*검증\/리뷰 초점[[:space:]]*:/ {
      verification_focus = trim(substr($0, index($0, ":") + 1))
      next
    }
  ' "$TEAM_SPEC_FILE")
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
  local role_type
  local skill_file=".codex/skills/${skill_dir}/SKILL.md"

  role_type="$(normalized_role_type "$role_id" "$skill_dir")"

  mkdir -p ".codex/skills/${skill_dir}"

  cat > "$skill_file" <<EOF
---
name: ${display_name}
description: ${description}
---

# ${display_name}

이 스킬은 \`team-spec\`에서 정의한 역할을 Codex 로컬 실행 기준으로 옮긴 기본 스킬이다.

## 목적

\`${role_id}\` 역할이 맡아야 하는 작업 범위와 산출물 책임을 현재 프로젝트 기준으로 유지한다.
\`${role_id}\` 역할의 유형은 \`${role_type}\` 이며, 이 스킬은 team-spec의 실행 기준을 로컬 실행 절차로 옮긴다.

## 주요 작업

$(print_type_specific_steps "$role_type")

## 입력

- 현재 요청
- \`.harness/docs/team-spec.md\`
- 필요 시 관련 \`.harness/docs/*\` 문서

## 대표 시작 경로

$(print_contract_bullets "$role_id" "대표 시작 경로" "관련 코드 경계와 보고서 중 이 역할의 대표 진입 경로를 먼저 고른다.")

## 우선 입력 문서

$(print_contract_bullets "$role_id" "우선 입력 문서" "관련 .harness 입력 문서와 team-spec 역할 카드를 먼저 읽는다.")

## 요청 유형별 하위 분기

$(print_contract_bullets "$role_id" "요청 유형별 하위 분기" "요청 유형이 갈라지면 하위 분기와 추가 다음 역할을 먼저 정리한다.")

## 작업 시작 체크리스트

$(print_contract_bullets "$role_id" "작업 시작 체크리스트" "현재 요청이 이 역할의 책임 범위에 들어오는지 먼저 확인한다.")

## 주요 판단 기준

$(print_contract_bullets "$role_id" "주요 판단 기준" "도메인 용어와 실패 비용이 큰 경계를 기준으로 범위를 좁힌다.")

## 피해야 할 오해

$(print_contract_bullets "$role_id" "금지 판단/피해야 할 오해" "team-spec에 없는 책임까지 이 역할이 맡는다고 가정하지 않는다.")

## 출력

- team-spec에 정의된 역할 산출물

## 출력 규칙

$(print_contract_bullets "$role_id" "출력 규칙" "파일, 로그, 보고서 중 무엇을 남겨야 하는지 team-spec 기준으로 분명히 남긴다.")

## 산출 형식 템플릿

$(print_contract_bullets "$role_id" "산출 형식 템플릿" "$(default_output_template_for_type "$role_type")")

## 재진입 트리거

$(print_contract_bullets "$role_id" "재진입 트리거" "현재 역할 범위를 넘는 경계가 드러나면 조율 역할 또는 이전 단계로 되돌린다.")

## 종료 판정 기준

$(print_contract_bullets "$role_id" "종료 판정 기준" "다음 역할이 추가 해석 없이 이어받을 수 있으면 이 역할을 종료한다.")

## 완료 기준

$(print_contract_bullets "$role_id" "완료 기준" "이 역할이 맡은 산출물과 다음 역할로 넘길 조건이 모두 충족되어야 한다.")

## 검증/리뷰 초점

$(print_contract_bullets "$role_id" "검증/리뷰 초점" "다음 역할이 재해석 없이 이어받을 수 있을 정도로 근거와 상태를 남긴다.")

## 역할 팀 내 위치

- team-spec이 정의한 프로젝트 특화 역할

## 협업 원칙

- 이 역할은 \`team-spec\`에 적힌 목적, 입력, 출력, 다음 역할을 먼저 따른다.
- 이 역할은 \`team-spec\`에 적힌 실행 기준 필드를 기본 절차로 본다.
- \`AGENTS.md\`, \`.codex/config.toml\`, \`.codex/agents/*.toml\`과 서로 충돌하는 설명을 새로 만들지 않는다.
- 결과를 남길 때는 다음 역할이 재해석 없이 이어받을 수 있게 출력 형식을 유지한다.

## 운영 기준

- 현재 sandbox 정책은 \`${sandbox}\` 이다.
- description 초안은 다음과 같다: ${description}
- 이 역할은 현재 저장소의 경계와 출력 형식에 맞춰 바로 실행할 수 있어야 한다.
EOF

  log "skill 생성: ${skill_file}"
}

generate_assets() {
  local parsed=0

  mkdir -p ".codex" ".codex/agents" ".codex/skills"
  load_role_contracts
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
