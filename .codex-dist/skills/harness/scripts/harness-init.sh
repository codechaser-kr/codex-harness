#!/usr/bin/env bash
# harness-init.sh
# 디렉토리, 로컬 역할 스킬, 보조 리포트를 최초 1회 생성합니다.
# harness-update.sh와 차이:
#   - harness-init.sh: 디렉토리/스킬/리포트 모두 생성 (기존 파일 유지)
#   - harness-update.sh: 기존 하네스 구조를 감사한 뒤 필요한 보고서를 다시 정리
# 사용 시점: 프로젝트에 처음 하네스를 구성할 때
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
EXPLORATION_ENTRYPOINT_HINT="$(build_exploration_section_summary "$EXPLORATION_NOTES_FILE" "대표 진입점" "추정 불가")"
EXPLORATION_BOUNDARY_HINT="$(build_exploration_section_summary "$EXPLORATION_NOTES_FILE" "주요 코드 경계" "추정 불가")"
EXPLORATION_TEST_HINT="$(build_exploration_section_summary "$EXPLORATION_NOTES_FILE" "테스트 및 검증 자산" "추정 불가")"
EXPLORATION_CONFIG_HINT="$(build_exploration_section_summary "$EXPLORATION_NOTES_FILE" "설정 및 실행 경로" "추정 불가")"
EXPLORATION_DOMAIN_HINT="$(build_exploration_section_summary "$EXPLORATION_NOTES_FILE" "저장소 고유 용어 단서" "추정 불가")"
log "프로젝트 로컬 실행 하네스 초기화 시작: $ROOT_DIR"
log "하네스 운영 모드: $HARNESS_OPERATION_MODE"
log "탐색 근거 문서: $EXPLORATION_NOTES_FILE"
log "탐색 상태: $EXPLORATION_CONTEXT_LEVEL"
log "탐색 근거 요약: $EXPLORATION_ANCHOR_SUMMARY"
while IFS= read -r audit_line; do
  [ -n "$audit_line" ] || continue
  log "하네스 감사: $audit_line"
done <<< "$HARNESS_AUDIT_SUMMARY"
while IFS= read -r agents_line; do
  [ -n "$agents_line" ] || continue
  log "상위 컨텍스트 감사: $agents_line"
done <<< "$AGENTS_AUDIT_SUMMARY"

create_dir ".codex"
create_dir ".codex/skills"
create_dir ".codex/skills/domain-analyst"
create_dir ".codex/skills/harness-architect"
create_dir ".codex/skills/skill-scaffolder"
create_dir ".codex/skills/qa-designer"
create_dir ".codex/skills/orchestrator"
create_dir ".codex/skills/validator"
create_dir ".codex/skills/run-harness"

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

# 빈/약한 프로젝트: 사용자 입력 유도 파일 생성
if exploration_requires_user_bootstrap "$EXPLORATION_NOTES_FILE"; then
  create_file_if_missing ".harness/project-setup.md" \
"# 프로젝트 설정

## 작성 안내

탐색 근거가 아직 부족해 자동 분석이 제한적입니다.
아래 항목을 채운 뒤 AI에게 다음과 같이 요청하세요:

> project-setup.md를 작성했습니다. 이 내용을 바탕으로 하네스 분석을 시작해주세요.

그러면 domain-analyst가 이 파일의 답변을 시작 입력으로 사용해 분석을 시작합니다.

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

ensure_gitignore_entry ".harness/logs/.current-session"
ensure_gitignore_entry ".harness/logs/session-log.md"
ensure_gitignore_entry ".harness/logs/session-events.tsv"
ensure_gitignore_entry ".harness/logs/latest-session-summary.md"
ensure_gitignore_entry ".harness/logs/role-frequency.md"
ensure_gitignore_entry ".harness/logs/session-summary-*.md"

create_file_if_missing ".codex/skills/domain-analyst/SKILL.md" \
"---
name: domain-analyst
description: 저장소의 목적, 대표 진입점 후보, 관련 코드 경로, 실행·검증 경로, 하네스 관점의 핵심 관심사를 분석하고 최종 도메인 분석 문서를 작성합니다. 프로젝트 구조 분석, 탐색 근거 해석, 핵심 흐름 정리, 하네스 출발점 정의가 필요할 때 적극적으로 사용합니다.
---

# domain-analyst

이 스킬은 프로젝트 실행 하네스 팀의 출발점이 되는 분석 역할을 맡는다.

## 목적

현재 저장소가 무엇을 하는 프로젝트인지 파악하고, 이후 역할 팀이 공통으로 참조할 수 있는 분석 결과를 만든다.

## 주요 작업

1. 저장소의 목적과 범위를 추정한다.
2. 대표 진입점 후보와 함께 읽을 관련 코드 경로를 적는다.
3. 저장소 고유 명사, 핵심 패키지 또는 모듈 책임, 주요 흐름을 식별한다.
4. 상태 관리 경계, 데이터 흐름, 배포 또는 런타임 차이가 보이면 실제 파일 근거와 함께 적는다.
5. 실행·검증 경로와 하네스 관점에서 중요한 영역을 분석 결과로 적는다.
6. 결과를 \`.harness/reports/domain-analysis.md\`에 직접 작성한다.
7. 파일·경로 목록을 그대로 반복하지 말고, 왜 그 경계가 중요한지 도메인 문장으로 번역한다.

## 입력

- 저장소 루트 구조
- 주요 설정 및 실행 경로
- 탐색 문서에 모인 시작점 후보, 관련 코드 경로, 테스트 자산

## 출력

- \`.harness/reports/domain-analysis.md\`

출력은 가능하면 아래 순서를 따른다.

1. 이 저장소가 실제로 다루는 사용자 문제 또는 운영 문제
2. 핵심 패키지, 모듈, 런타임 경계의 역할
3. 실제 시작 흐름과 영향 전파 경로
4. 반복적으로 실패 비용이 큰 변경 유형
5. 위 해석을 뒷받침하는 대표 파일·경로 근거

## 역할 팀 내 위치

- 실행 하네스의 첫 단계
- harness-architect, qa-designer, orchestrator의 입력을 만든다

## 협업 원칙

- 이후 역할이 사용할 수 있도록 구조적이고 요약된 결과를 남긴다.
- 추정과 사실을 구분한다.
- 구현 세부보다 역할 팀이 참고해야 할 핵심 흐름에 집중한다.
- 저장소 고유 명사와 실제 업무 용어를 가능한 한 보존한다.
- 도메인 설명은 실제 파일 또는 경로 근거와 연결해 남긴다.
- 패키지 책임, 상태 흐름, 배포 경계가 보이면 파일 근거와 함께 적는다.
- 파일명이나 경로를 나열하는 데서 멈추지 말고, 그 근거가 왜 중요한지 해석 문장으로 이어 적는다.
- 비슷한 경로를 여러 섹션에 반복하기보다, 한 번 근거를 제시한 뒤 이후 섹션에서는 의미와 위험을 설명한다.

## 운영 규칙

- 분석이 불충분하면 architect가 설계를 강하게 진행할 수 없다는 점을 항상 의식한다.
- 핵심 흐름이 불명확하면 \"무엇이 아직 불명확한지\"를 명시한다.
- validator나 QA가 분석 약점을 지적하면, 요약만 고치지 말고 분석의 기준 자체를 다시 쓴다.
- \`저장소 요약\`은 가능하면 일반 기술 스택 설명보다 실제 사용자 문제와 핵심 도메인 흐름을 앞에 둔다.
- \`저장소 고유 근거\`에는 자동 탐색 결과를 그대로 복사하지 말고, 도메인 설명을 뒷받침하는 대표 파일과 경로를 다시 골라 남긴다.
- \`exploration-notes\`는 후보 단서 문서로만 보고, 실제 저장소 구조와 흐름을 바탕으로 최종 분석 결과를 쓴다.
- \`핵심 실행 흐름\`은 경로 목록이 아니라 사용자 흐름, 상태 전파, 소비 관계를 설명하는 문장으로 적는다.
- \`사실 기준 구조\`는 파일 목록이 아니라 패키지·모듈·런타임이 어떤 책임으로 나뉘는지 설명하는 구조 요약으로 유지한다.
- \`.claude\`, \`.codex\`, \`.agents\` 같은 AI 설정 디렉토리는 도메인 근거와 실행 흐름 해석에서 제외한다.
- \`build\`, \`dist\`, \`coverage\` 같은 생성 산출물 경로는 대표 진입점이나 핵심 흐름 근거로 쓰지 않는다.
- \`.harness/*\` 문서는 특별한 요청이 없으면 한글로 작성한다. 파일명은 기존 영문 이름을 유지한다.
- 역할이 호출되면 \`.harness/logs/session-log.md\`에 시작 요청, 호출 역할, 출력 파일, 다음 권장 역할을 남긴다.
"

create_file_if_missing ".codex/skills/harness-architect/SKILL.md" \
"---
name: harness-architect
description: 저장소에 맞는 프로젝트 로컬 실행 하네스 구조와 역할 경계를 설계합니다. 하네스 구조 설계, 역할 분리, 팀 구조 정리, 확장 가능한 하네스 설계가 필요할 때 적극적으로 사용합니다.
---

# harness-architect

이 스킬은 프로젝트에 맞는 실행 하네스 구조를 설계한다.

## 목적

분석 결과를 바탕으로, 이 저장소를 운영할 때 어떤 경계와 비용 차이를 기준으로 역할 팀을 나눌지 최종 구조 문서로 작성한다.

## 주요 작업

1. domain-analysis를 읽는다.
2. init가 남긴 골격 문구를 유지하지 않고, 저장소 운영 구조로 다시 쓴다.
3. 웹/서비스/라이브러리/런타임/배포 경계 중 실제 운영 비용이 갈리는 지점을 적는다.
4. 어떤 역할은 항상 유지하고 어떤 역할은 요청 유형에 따라 생략할 수 있는지 적는다.
5. 역할 간 handoff가 실제로 필요한 지점을 적는다.
6. 실행 하네스 구조를 \`.harness/reports/harness-architecture.md\`에 최종 결과로 작성한다.

## 입력

- \`.harness/reports/domain-analysis.md\`

## 출력

- \`.harness/reports/harness-architecture.md\`

출력은 가능하면 아래 순서를 따른다.

1. 저장소 운영 구조와 핵심 경계
2. 역할별 개입 기준
3. 경계별 handoff 기준
4. 역할 유지/축소 기준

## 협업 원칙

- domain-analyst의 결과를 단순 요약하지 말고, 역할 팀 구조로 번역한다.
- init가 만든 \`최종 구조 설명은 harness-architect가 직접 작성합니다.\` 문구를 그대로 남기지 않는다.
- 하네스 자체 설명서보다 이 저장소에서 실제로 운영 기준이 갈리는 경계를 앞에 둔다.
- 역할을 과도하게 늘리지 않는다.
- 역할 이름만 나열하지 말고, 어떤 경계에서 왜 그 역할이 개입하는지 저장소 기준으로 설명한다.
- 비슷한 역할 설명을 여러 섹션에서 반복하지 말고, 경계·handoff·유지 기준으로 나눠 적는다.
- \`skill-scaffolder\`는 스킬 설명 drift 같은 예외 상황이 아니면 구조 문서의 중심 역할로 쓰지 않는다.

## 운영 규칙

- 분석 결과가 약하면 설계를 단정하지 말고, 어떤 해석이 보류 상태인지 남긴다.
- 기본 역할 구성을 기계적으로 강제하지 말고 프로젝트 규모에 맞게 조정한다.
- validator 메모가 과한 분리나 약한 구조를 가리키면 역할 수와 경계를 다시 읽는다.
- 골격 문구를 확장하거나 덧붙이지 말고, 최종 구조 설명으로 전체 문단을 다시 쓴다.
- \`저장소 운영 구조\`는 하네스 일반론이 아니라 이 저장소의 런타임, 공용 계층, 배포 비용 차이를 설명하는 문단이어야 한다.
- \`역할별 개입 기준\`은 역할 카드 소개보다 어떤 변경에서 누가 먼저 들어오는지 기준을 적는다.
- \`경계별 handoff 기준\`은 실제로 손이 바뀌는 경계만 남기고, 자동으로 이어지는 역할 순서를 장황하게 늘어놓지 않는다.
- \`역할 유지와 조정 기준\`은 역할 이름 반복보다 어떤 조건에서 축소·확장하는지 기준을 먼저 적는다.
- 완료 상태의 \`harness-architecture.md\`는 역할 카드 소개보다 저장소 운영 구조, 역할 개입 기준, handoff 기준이 더 앞에 와야 한다.
- \`.harness/*\` 문서는 특별한 요청이 없으면 한글로 작성한다. 파일명은 기존 영문 이름을 유지한다.
- 역할이 호출되면 \`.harness/logs/session-log.md\`에 호출 이유, 입력 파일, 출력 파일, 남은 약점을 남긴다.
"

create_file_if_missing ".codex/skills/skill-scaffolder/SKILL.md" \
"---
name: skill-scaffolder
description: 실행 하네스 구조를 바탕으로 프로젝트 로컬 역할 스킬과 기본 파일을 생성하거나 갱신합니다. 로컬 스킬 생성, 역할 파일 정리, 하네스 구조 반영이 필요할 때 적극적으로 사용합니다.
---

# skill-scaffolder

이 스킬은 설계된 실행 하네스 구조를 실제 파일로 옮긴다.

## 목적

실행 하네스가 문서 수준에 머물지 않고, 프로젝트 안에서 실제로 사용할 수 있는 역할 스킬 구조로 정착되게 한다.

## 주요 작업

1. harness-architecture를 읽는다.
2. 로컬 역할 스킬 파일을 생성하거나 갱신한다.
3. 역할별 설명과 책임 범위를 정리한다.
4. 결과 구조를 validator가 바로 읽을 수 있게 유지한다.

## 입력

- \`.harness/reports/harness-architecture.md\`

## 출력

- \`.codex/skills/*\`
- 필요 시 \`.harness/templates/*\`
- 필요 시 \`.harness/scenarios/*\`

## 역할 팀 내 위치

- 구조를 실제 파일로 만드는 역할
- architect의 설계를 구현으로 옮긴다

## 협업 원칙

- 생성 결과는 validator가 바로 읽기 쉬운 구조여야 한다.
- 설명이 지나치게 약한 스킬을 만들지 않는다.
- orchestrator가 흐름을 연결할 수 있게 입력/출력 구조를 유지한다.

## 운영 규칙

- 설명만 있는 얇은 스킬을 만들지 않는다.
- 각 스킬이 실제로 팀 멤버처럼 읽히는지 항상 다시 읽는다.
- validator가 약한 설명이나 연결 부족을 지적하면, 텍스트만 덧붙이지 말고 구조를 다시 쓴다.
- \`.harness/*\` 문서는 특별한 요청이 없으면 한글로 작성한다. 파일명은 기존 영문 이름을 유지한다.
- 역할이 호출되면 \`.harness/logs/session-log.md\`에 생성하거나 갱신한 파일과 다음 권장 역할을 남긴다.
"

create_file_if_missing ".codex/skills/qa-designer/SKILL.md" \
"---
name: qa-designer
description: 프로젝트 실행 하네스에서 필요한 품질 기준과 질문 세트를 설계하고 최종 QA 전략 문서를 작성합니다. QA 전략 수립, 품질 기준 정리, 구조 정합성 검토가 필요할 때 적극적으로 사용합니다.
---

# qa-designer

이 스킬은 실행 하네스가 어떤 품질 관점으로 프로젝트를 볼지 적는다.

## 목적

이 프로젝트에서 어떤 변경이 실제 회귀 비용을 만들고, 어떤 검증이 자동/수동으로 나뉘는지 최종 QA 전략 문서로 작성한다.

## 주요 작업

1. domain-analysis와 harness-architecture를 함께 읽는다.
2. init가 남긴 골격 문구를 유지하지 않고, 저장소 기준 QA 전략으로 다시 쓴다.
3. 자동 검증으로 충분한 영역과 수동 확인이 필요한 영역을 나눈다.
4. 품질 실패 유형과 반복 확인 질문을 적는다.
5. 결과를 \`.harness/reports/qa-strategy.md\`에 직접 작성한다.
6. 경계나 파일 목록을 그대로 옮기지 말고, 무엇을 왜 검증해야 하는지 품질 질문으로 번역한다.

## 입력

- \`.harness/reports/domain-analysis.md\`
- \`.harness/reports/harness-architecture.md\`

## 출력

- \`.harness/reports/qa-strategy.md\`

출력은 가능하면 아래 순서를 따른다.

1. 저장소 고유 단서
2. 핵심 품질 축
3. 핵심 질문
4. 변경 유형별 체크 기준

## 협업 원칙

- 존재 여부보다 정합성과 연결성을 본다.
- validator가 바로 사용할 수 있게 질문 세트를 또렷하게 적는다.
- orchestrator가 흐름에 포함할 수 있는 품질 기준을 만든다.
- init가 만든 \`최종 QA 전략은 qa-designer가 직접 작성합니다.\` 문구를 그대로 남기지 않는다.
- 저장소 QA 전략을 설명하지, 하네스 일반론을 길게 복사하지 않는다.
- 웹/데스크톱/공용 계층/배포 중 어디까지 자동 검증으로 덮이고 어디서부터 수동 확인이 필요한지 분명히 적는다.
- 체크리스트를 나열하기보다, 왜 그 질문이 필요한지 변경 영향과 실패 비용을 기준으로 설명한다.

## 운영 규칙

- 추상적인 좋은 말보다 실제 반복 검토 가능한 질문을 우선한다.
- 프로젝트 목적과 무관한 품질 기준을 과하게 추가하지 않는다.
- validator 피드백이 반복되면 QA 질문이 충분히 구체적인지 다시 읽는다.
- 골격 문구를 일부 수정하는 데서 멈추지 말고, 최종 QA 전략 문서 전체를 다시 쓴다.
- \`핵심 품질 축\`은 경로 목록이 아니라 어떤 경계에서 어떤 실패가 반복될 수 있는지 설명하는 문장으로 정리한다.
- \`변경 유형별 체크 기준\`은 일반 조언이 아니라, 어떤 명령을 우선 돌리고 어떤 경우에 수동 확인으로 승격하는지까지 적는다.
- 완료 상태의 \`qa-strategy.md\`는 하네스 일반 QA 설명보다 이 저장소의 자동/수동 검증 분리와 승격 기준이 더 앞에 와야 한다.
- \`.harness/*\` 문서는 특별한 요청이 없으면 한글로 작성한다. 파일명은 기존 영문 이름을 유지한다.
- 역할이 호출되면 \`.harness/logs/session-log.md\`에 새로 정한 QA 질문과 다음 권장 역할을 남긴다.
"

create_file_if_missing ".codex/skills/orchestrator/SKILL.md" \
"---
name: orchestrator
description: 프로젝트 로컬 실행 하네스의 중심 역할입니다. 도메인 분석, 구조 설계, 스킬 생성, QA, 검증 역할을 실제 작업 순서와 연결 구조로 정리하고 최종 오케스트레이션 계획을 작성할 때 적극적으로 사용합니다.
---

# orchestrator

이 스킬은 프로젝트 실행 하네스 팀의 중심 역할이다.

## 목적

여러 역할이 따로 존재하는 데 그치지 않고, 이 저장소에서 요청 유형별 시작점과 재진입 기준이 보이는 최종 운영 계획 문서를 작성한다.

## 주요 작업

1. domain-analysis, harness-architecture, qa-strategy를 읽는다.
2. init가 남긴 골격 문구를 유지하지 않고, 저장소 기준 운영 계획으로 다시 쓴다.
3. 요청 유형별 시작 역할과 재진입 기준을 적는다.
4. 어떤 산출물이 다음 단계의 입력이 되는지 연결한다.
5. 프로젝트 로컬 실행 하네스 구조를 \`.harness/reports/orchestration-plan.md\`에 최종 결과로 작성한다.
6. 이후 프로젝트 특화 실행 하네스로 확장 가능한 포인트를 남긴다.
7. 순서 목록을 그대로 늘어놓지 말고, 왜 이 시작점과 재진입이 맞는지 운영 근거로 설명한다.

## 입력

- \`.harness/reports/domain-analysis.md\`
- \`.harness/reports/harness-architecture.md\`
- \`.harness/reports/qa-strategy.md\`

## 출력

- \`.harness/reports/orchestration-plan.md\`

출력은 가능하면 아래 순서를 따른다.

1. 저장소 고유 근거
2. 요청 유형별 시작점
3. 표준 진행 흐름
4. 재진입 및 handoff 기준

## 협업 원칙

- 모든 일을 직접 대신하지 않는다.
- 각 역할의 입력과 출력을 연결하는 데 집중한다.
- 역할 간 중복을 줄이고 흐름을 단순하게 유지한다.
- validator의 피드백이 다시 구조 재작성으로 이어질 수 있게 루프를 만든다.
- init가 만든 \`최종 오케스트레이션 계획은 orchestrator가 직접 작성합니다.\` 문구를 그대로 남기지 않는다.
- 하네스 일반 흐름보다 이 저장소에서 실제로 어떻게 시작하고 재진입하는지를 앞에 둔다.
- \`run-harness\`, \`validator\`, \`skill-scaffolder\` 설명 자체를 길게 적기보다, 언제 누구를 먼저 호출하는지가 먼저 보이게 쓴다.
- 시작 역할과 재진입 기준은 사용자 요청, 경계 영향, 검증 비용을 함께 설명하는 운영 문장으로 남긴다.

## 운영 규칙

- 중심 역할이지만, 모든 산출물을 직접 작성하려고 하지 않는다.
- 흐름이 복잡해지면 병렬화보다 단순화가 가능한지 먼저 본다.
- QA와 validator의 피드백이 반복되면 흐름 자체를 다시 설계할 수 있어야 한다.
- 리포트가 본체처럼 커지고 역할 팀이 약해지는 징후를 경계한다.
- 골격 문구에 몇 줄 덧붙이는 방식이 아니라, 최종 운영 계획 문서 전체를 다시 쓴다.
- \`요청 유형별 시작점\`은 패키지 경계, 런타임 경계, 검증 비용 차이 기준으로 적는다.
- \`표준 진행 흐름\`은 모든 역할을 다 부르는 목록이 아니라, 실제로 자주 쓰는 흐름만 남긴다.
- \`재진입 및 handoff 기준\`은 앞뒤 단계 이름 반복보다, 어떤 신호가 나오면 어디로 되돌아갈지 먼저 적는다.
- 완료 상태의 \`orchestration-plan.md\`와 \`team-playbook.md\`는 역할 소개보다 요청 유형별 시작점, 재진입 기준, 종료 조건이 더 앞에 와야 한다.
- \`.harness/*\` 문서는 특별한 요청이 없으면 한글로 작성한다. 파일명은 기존 영문 이름을 유지한다.
- 역할이 호출되면 \`.harness/logs/session-log.md\`에 흐름 변경, 연결 변경, 다음 권장 역할을 남긴다.
"

create_file_if_missing ".codex/skills/validator/SKILL.md" \
"---
name: validator
description: 생성된 프로젝트 로컬 실행 하네스가 최소 요건을 만족하는지 점검하고, 누락·충돌·약한 설명을 식별합니다. 구조 검증, 역할 점검, 연결성 점검이 필요할 때 적극적으로 사용합니다.
---

# validator

이 스킬은 생성된 실행 하네스가 실제로 쓸 만한 출발점인지 판독한다.

## 목적

프로젝트 로컬 실행 하네스가 최소한의 구조, 설명, 연결성을 갖추었는지 판독한다.

## 주요 작업

1. 필수 디렉토리와 파일을 판독한다.
2. 각 역할 스킬의 설명이 약하지 않은지 본다.
3. 리포트와 역할 구조가 연결되는지 판독한다.
4. 필요하면 다시 써야 할 문서와 역할을 제안한다.
5. 저장소 맞춤 근거가 일반론으로 약해지거나 generic 문장으로 되돌아간 지점을 찾는다.

## 입력

- \`.codex/skills/*\`
- \`.harness/reports/*\`
- 필요 시 \`.harness/templates/*\`
- 필요 시 \`.harness/scenarios/*\`

## 출력

- 검증 로그 또는 재작성 제안

출력은 가능하면 아래 순서를 따른다.

1. 지금 실패하거나 약한 구조 요건은 무엇인가
2. 어떤 문서나 역할이 generic 회귀 또는 저장소 맞춤성 약화를 보이는가
3. 그 약점이 어느 역할에서 시작된 것으로 보이는가
4. 다음에 누가 어떤 기준으로 다시 써야 하는가

## 역할 팀 내 위치

- 실행 하네스의 품질 점검 역할
- 생성 이후 최소 품질 보장을 담당

## 협업 원칙

- 단순 존재 확인에 그치지 않는다.
- 부족한 설명, 약한 연결, 과한 역할 분리를 적극적으로 지적한다.
- 피드백은 다시 architect / scaffolder / orchestrator가 반영할 수 있게 구체적으로 남긴다.
- generic 문장이 늘어나거나 저장소 고유 근거가 약해진 지점은 우선순위를 높여 지적한다.

## 운영 규칙

- 체크리스트만 읽고 끝내지 않는다.
- 구조적 약점이 반복되면 어느 역할에서 문제가 시작됐는지 함께 본다.
- 재작성 제안은 실행 가능한 수준으로 남긴다.
- QA와 유사해 보일 때도, validator는 최소 구조 요건과 연결성에 더 집중한다.
- 저장소 고유 경계나 업무 용어가 일반론으로 치환되면, 어떤 문장이 약해졌는지 직접 짚어 남긴다.
- 경로 목록만 반복되고 해석 문장이 약하면 generic 회귀 징후로 보고 재작성 역할을 분명히 지정한다.
- 문서가 하네스 자기설명서처럼 읽히고 저장소 운영 기준이 약하면, 그 문서를 실패로 보고 담당 역할을 다시 지정한다.
- \`.harness/*\` 문서는 특별한 요청이 없으면 한글로 작성한다. 파일명은 기존 영문 이름을 유지한다.
- 역할이 호출되면 \`.harness/logs/session-log.md\`에 지적 사항, 영향 받은 파일, 다음 권장 역할을 남긴다.
"

create_file_if_missing ".codex/skills/run-harness/SKILL.md" \
"---
name: run-harness
description: 프로젝트 로컬 실행 하네스 팀을 실제로 기동하는 진입점입니다. 현재 저장소 상태를 보고 어떤 역할 흐름을 먼저 시작할지 결정하고, 분석·설계·QA·오케스트레이션·검증 흐름을 시작하거나 다시 이을 때 적극적으로 사용합니다.
---

# run-harness

이 스킬은 프로젝트 실행 하네스 팀의 운영 진입점이다.

## 목적

현재 저장소 상태를 보고, 실행 하네스 팀이 어느 Phase부터 다시 시작해야 하는지 결정하고 시작한다. \`harness-init.sh\` 직후에는 보고서가 아직 골격 상태라는 점을 전제로 한다.

## 주요 작업

1. 현재 \`.harness/reports/*\`, \`.codex/skills/*\`, 로그 파일 상태를 읽는다.
2. 보고서가 골격 상태인지, 이미 역할이 직접 작성한 최종 문서인지 먼저 가른다.
3. 요청이 기능 구현, 구조 정리, 공통 모듈 수정, 빌드/검증 변경 중 어디에 가까운지 가른다.
4. 변경 영향 범위가 단일 모듈인지, 여러 경계나 공통 계층까지 전파되는지 함께 읽는다.
5. 탐색 근거가 부족하거나 빈 프로젝트에 가까우면 사용자 질문을 남긴다.
6. 아래 Phase 중 어디서부터 다시 시작해야 하는지 정한다.
7. 마지막에 validator 관점의 최소 구조 확인을 남긴다.

## 입력

- 현재 저장소 상태
- \`.codex/skills/*\`
- \`.harness/reports/*\`

## 출력

- 현재 시점에 필요한 실행 하네스 팀 진행 순서
- 다음에 이어질 역할 제안
- 사용자에게 앞에 놓을 질문 세트

## 출력 계약

- 현재 시작 역할 1개를 앞에 제시한다.
- 다음 역할은 0~2개로 제한해 제안한다.
- 추가 질문이 필요하면 0~2개만 남긴다.
- 시작 근거는 1~3줄로 짧게 설명한다.
- 시작 근거에는 현재 가장 약한 경계 또는 문서, 그리고 왜 이 시작 역할이 필요한지를 함께 적는다.
- init 직후라면 보고서가 아직 골격 상태이며, verify 전에 역할 작성이 필요하다는 점을 함께 적는다.
- 세션을 시작했다면 session-log 반영 여부를 함께 남긴다.

## Phase 기준

- Phase 0 감사: 기존 하네스 구조, 탐색 상태, 골격 잔존 여부를 읽는다.
- Phase 1 도메인 분석: \`domain-analysis.md\`가 비어 있거나 약하면 \`domain-analyst\`부터 시작한다.
- Phase 2 팀 아키텍처 설계: 구조 문서가 약하면 \`harness-architect\`를 앞에 둔다.
- Phase 3 QA 전략 정렬: 검증 비용 분리나 체크 기준이 약하면 \`qa-designer\`를 앞에 둔다.
- Phase 4 운영 흐름 정렬: 시작점, 재진입 기준, 종료 조건이 약하면 \`orchestrator\`를 앞에 둔다.
- Phase 5 검증: 위 문서가 다 써진 뒤에만 \`validator\`와 \`harness-verify.sh\`를 둔다.

## 현재 상태별 진입 규칙

- 신규 구축이면 \`harness-init.sh\` 기준의 기본 팀 구조를 연다.
- 신규 구축 직후에는 verify보다 역할 작성이 앞에 놓인다.
- 기존 확장 또는 운영 유지보수이면 \`harness-update.sh\`를 기본 진입점으로 둔다.
- 부분 구조만 남아 있거나 문서와 역할 구성이 크게 어긋나면 update로 봉합하지 말고 명시적 재구성을 제안한다.
- 보고서 한 영역만 약하면 \`harness-update.sh --domain\`, \`--qa\`, \`--architecture\`, \`--orchestration\`, \`--team-structure\`, \`--team-playbook\` 같은 선택 갱신부터 연다.

## 역할 팀 내 위치

- 실행 하네스 팀의 기동 엔트리포인트
- 팀 전체를 실제로 움직이기 시작하게 만드는 역할

## 협업 원칙

- 항상 모든 역할을 다 호출하려 하지 않는다.
- 현재 상태에서 가장 약한 지점을 먼저 다시 쓴다.
- orchestrator와 validator는 Phase를 마무리하는 역할이지, 모든 문서의 대리 작성자가 아니다.
- 시작 근거가 약하면 역할 호출을 단정하기보다 사용자 확인 질문을 짧게 제시한다.
- 시작 역할을 제시할 때는 저장소 맞춤 근거와 현재 약점을 같이 묶어 설명한다.

## 운영 규칙

- 새 프로젝트라면 domain-analyst → harness-architect → qa-designer → orchestrator → validator 순서를 기본 흐름으로 둔다.
- 새 프로젝트에서 \`harness-init.sh\`만 끝난 상태라면 domain-analyst → harness-architect → qa-designer → orchestrator 순서로 보고서를 먼저 작성하고, 그 다음 validator와 \`harness-verify.sh\`를 둔다.
- 이미 구조가 있는 프로젝트라면 \`harness-update.sh\`로 현재 상태를 다시 읽고 부족한 역할만 다시 호출하는 흐름을 앞에서 연다.
- \`skill-scaffolder\`는 로컬 스킬 설명 drift, 구조 문구 불일치, 스킬 계약 재정렬이 필요할 때만 보조적으로 둔다.
- 문서, 로그, handoff를 계속 유지해야 하는 중심 역할은 팀 구조로 유지하고, 입력과 출력이 좁은 보조 판단만 일회성 위임으로 다룬다.
- 새 구조를 안정적으로 세울 때는 파이프라인을, 생성 직후 검증을 붙일 때는 생성-검증을, 하위 경계가 독립적일 때만 팬아웃/팬인을, handoff와 재진입이 핵심이면 오케스트레이션 중심 구조를 앞에서 연다.
- 요청이 기능 구현, 구조 정리, 공통 모듈 수정, 빌드/검증 변경 중 어디에 걸리는지 분류하고 그 결과를 orchestration-plan 입력으로 사용한다.
- 요청이 추상적이거나 저장소 맥락이 약하면 질문과 탐색 재확인을 앞에 두고, 저장소 고유 용어와 영향 범위를 정확히 말하면 더 직접적인 역할 시작 흐름을 연다.
- 영향 범위가 공통 계층이나 다중 모듈로 번지면 domain-analyst와 qa-designer를 더 이른 순서에 배치한다.
- 다른 역할이 저장소를 직접 읽더라도 domain-analyst의 근거 제외 규칙을 그대로 따른다.
- 현재 보고서가 generic 문장으로 약해졌거나 저장소 고유 근거가 흐리면 domain-analyst 또는 validator를 더 이른 순서에 둔다.
- 시작 역할을 정한 뒤에는 무엇이 바뀌면 다른 시작점이 더 적절해지는지도 짧게 남긴다.
- 보고서 골격 문구나 scaffold 문구가 남아 있으면 \`harness-verify.sh\`보다 역할 재작성부터 앞에 둔다.
- 빈 저장소이거나 탐색 근거가 부족하면, \`.harness/project-setup.md\` 존재 여부부터 읽는다.
- \`.harness/project-setup.md\`가 작성되어 있으면 그 내용을 domain-analyst의 시작 입력으로 연결한다.
- 작성되어 있지 않으면 사용자에게 프로젝트 성격, 핵심 사용자, 첫 성공 시나리오를 먼저 묻고, 파일이 없는 경우 템플릿 내용을 포함하여 \`.harness/project-setup.md\`에 채우도록 안내한다.
- 사용자 답변이 모이면 그 내용을 domain-analysis와 orchestration-plan의 입력으로 바로 연결한다.
- 재구성이 필요한 상태라면 어떤 구조가 비어 있거나 어긋났는지 설명하고, 기존 하네스 정리 후 \`harness-init.sh\`로 다시 구성하도록 제안한다.
- 리포트보다 실제 역할 팀 구조와 설명 품질을 더 중요하게 본다.
- \`.harness/*\` 문서는 특별한 요청이 없으면 한글로 작성한다. 파일명은 기존 영문 이름을 유지한다.
- 로그 운영 기준은 \`.harness/logging-policy.md\`를 먼저 읽는다.
- 이 역할이 호출되면 \`.harness/logs/session-log.md\`에 새로운 세션 시작 기록을 남긴다.

## 시작 예시

- 요청: \"새 API 엔드포인트 추가\" → 흐름: 기능 구현, 단일 경계 → 시작: domain-analyst → qa-designer → orchestrator
- 요청: \"공통 유틸 함수 리팩터\" → 흐름: 공통 계층 영향, 다중 소비자 → 시작: domain-analyst → qa-designer → orchestrator
- 요청: \"하네스 역할 구조 재설계\" → 흐름: 경계 재정의, 구조 변경 → 시작: harness-architect → qa-designer → orchestrator
- 요청: \"QA 문서만 다시 작성\" → 흐름: 기존 확장, 단일 보고서 갱신 → 시작: \`harness-update.sh --qa\` 후 qa-designer
- 요청: \"domain-analysis만 오래됐음\" → 흐름: 기존 확장, 단일 보고서 갱신 → 시작: \`harness-update.sh --domain\` 후 domain-analyst
- 요청: 역할 스킬은 있는데 보고서가 대부분 비어 있음 → 흐름: 부분 구조 drift → 시작: 명시적 재구성 제안
- 요청: 탐색 근거 부족, project-setup.md 미작성 → 흐름: 프로젝트 성격 불명 → 시작: project-setup.md 템플릿 제공 및 작성 안내 후 대기
- 요청: 탐색 근거 부족, project-setup.md 작성됨 → 흐름: 목표·성격 확인됨 → 시작: domain-analyst(project-setup.md 입력 연결)
"

create_file_if_missing ".harness/reports/domain-analysis.md" \
"# 도메인 분석

## 저장소 요약

- 최종 분석은 domain-analyst가 직접 작성합니다.

## 저장소 고유 근거

## 사실 기준 구조

## 핵심 실행 흐름

## 반복적으로 위험한 변경 유형

## 남아 있는 질문
"

create_file_if_missing ".harness/reports/harness-architecture.md" \
"# 실행 하네스 아키텍처

## 요약

- 최종 구조 설명은 harness-architect가 직접 작성합니다.

## 저장소 고유 근거

## 저장소 운영 구조

## 역할별 개입 기준

## 경계별 handoff 기준

## 역할 유지와 조정 기준

## 남아 있는 질문
"

create_file_if_missing ".harness/reports/qa-strategy.md" \
"# QA 전략

## 요약

- 최종 QA 전략은 qa-designer가 직접 작성합니다.

## 저장소 고유 단서

## 핵심 품질 축

## 핵심 질문

## 변경 유형별 체크 기준

## 남아 있는 질문
"

create_file_if_missing ".harness/reports/orchestration-plan.md" \
"# 실행 하네스 오케스트레이션 계획

## 요약

- 최종 오케스트레이션 계획은 orchestrator가 직접 작성합니다.

## 저장소 고유 근거

## 요청 유형별 시작점

## 표준 진행 흐름

## 재진입 및 handoff 기준

## 남아 있는 질문
"

create_file_if_missing ".harness/reports/team-structure.md" \
"# 역할 팀 구조

## 요약

- 최종 팀 구조는 harness-architect가 직접 작성합니다.

## 저장소 고유 근거

## 저장소 경계

## 경계별 역할 분담

## 역할 추가/축소 기준
"

create_file_if_missing ".harness/reports/team-playbook.md" \
"# 팀 운영 플레이북

## 요약

- 최종 운영 플레이북은 orchestrator가 직접 작성합니다.

## 저장소 고유 근거

## 시작 조건

## 작업 유형별 시작 흐름

## 검증과 종료 조건
"

create_file_if_missing ".harness/logging-policy.md" \
"# 로그 정책

## 목적

이 문서는 실행 하네스 팀을 실제로 운용할 때 어떤 로그를 남겨야 하는지 적습니다.

## 자동화 도구

- 전역 설치된 \`harness-log.sh\`는 역할 호출 시 세션 로그에 자동 append 합니다.
- 전역 설치된 \`harness-session-close.sh\`는 세션 종료 시 최신 세션 요약을 자동 갱신합니다.
- 선택 자산이 활성화된 프로젝트에서는 \`harness-session-close.sh\`가 역할 호출 빈도 통계와 템플릿 후보 분석까지 함께 갱신합니다.
- 선택 자산이 활성화된 프로젝트에서는 \`harness-role-stats.sh\`가 누적 로그를 기준으로 역할 호출 빈도 통계를 다시 계산합니다.
- 선택 자산이 활성화된 프로젝트에서는 \`harness-template-candidates.sh\`가 누적 로그를 분석해 반복 업무 템플릿 후보를 \`.harness/reports/template-candidates.md\`에 남깁니다.

## 로그를 남겨야 하는 상황

- run-harness로 팀을 시작했을 때
- 특정 역할을 직접 호출했을 때
- validator 피드백이 나왔을 때
- QA 질문이 다시 정리되었을 때
- orchestrator가 흐름을 변경했을 때
- 역할 팀 구조가 변경되었을 때

## 최소 로그 항목

- 시각
- 시작 요청 요약
- 진입점 역할
- 호출된 역할
- 입력으로 본 파일
- 출력/갱신된 파일
- 다음 권장 역할
- 남은 약점 또는 미해결 항목

## 원칙

- 로그는 짧지만 구조적으로 남깁니다.
- 사람이 읽을 수 있어야 합니다.
- 역할 흐름과 피드백 루프가 보이도록 남깁니다.
- 각 역할은 자신이 수행한 주요 변경과 다음 권장 단계를 남길 책임이 있습니다.
- 가능하면 수동 편집보다 자동 append 스크립트를 우선 사용합니다.
"

create_file_if_missing ".harness/logs/session-log.md" \
"# 실행 하네스 세션 로그

## 기록 원칙

각 세션마다 아래 형식으로 기록합니다.

---

### 세션

- 시각:
- 세션 ID:
- 상태:
- 시작 요청:
- 진입점:
- 호출 역할:
- 입력 파일:
- 출력 파일:
- 다음 권장 역할:
- 남은 약점:

---

## 예시

### 세션

- 시각: YYYY-MM-DD HH:MM
- 세션 ID: session-YYYYMMDD-HHMMSS
- 상태: started
- 시작 요청: 현재 프로젝트에 하네스 팀을 한 번 돌려줘
- 진입점: run-harness
- 호출 역할: domain-analyst, harness-architect, orchestrator
- 입력 파일: 없음
- 출력 파일: .harness/reports/domain-analysis.md, .harness/reports/harness-architecture.md
- 다음 권장 역할: qa-designer
- 남은 약점: QA 질문이 아직 추상적임
"

create_file_if_missing ".harness/logs/session-events.tsv" \
"timestamp	session_id	status	request	entry_point	roles	inputs	outputs	next_role	weaknesses	note"

create_file_if_missing ".harness/logs/latest-session-summary.md" \
"# 최신 세션 요약

아직 종료된 세션 집계가 없습니다.
"

if optional_harness_assets_enabled "$EXPLORATION_NOTES_FILE"; then
  create_file_if_missing ".harness/logs/role-frequency.md" \
"# 역할 호출 빈도

아직 집계된 역할 호출 통계가 없습니다.
"
fi

log "프로젝트 로컬 실행 하네스 초기화 완료"
log "현재 .harness/reports/* 는 골격만 생성된 상태입니다."
log "다음 단계: run-harness 또는 역할 스킬로 보고서를 직접 작성한 뒤 harness-verify.sh 를 실행하세요."
