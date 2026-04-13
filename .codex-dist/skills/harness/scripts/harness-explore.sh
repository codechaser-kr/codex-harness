#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(pwd)"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$SCRIPT_DIR/harness-lib.sh"

OUTPUT_FILE="${1:-.harness/docs/exploration-notes.md}"

log() {
  printf '[harness][explore] %s\n' "$1"
}

mkdir -p "$(dirname "$OUTPUT_FILE")"

{
  cat <<EOF
# Exploration Notes

이 문서는 자동 탐색 결과를 최종 판단으로 사용하지 않기 위한 약한 탐색 메모입니다.
역할 팀은 이 문서를 출발점 정도로만 보고, 실제 저장소와 사용자 입력을 다시 읽어 최종 문서를 작성합니다.

## 상태

- 현재 작업 디렉토리: \`$ROOT_DIR\`
- 하네스 운영 모드: \`$(detect_harness_operation_mode)\`
- 이 메모는 초기 입력 상태만 전달하며, 최종 판단 근거는 아닙니다.
- 실제 시작점, 경계, 검증 경로는 역할 스킬이 저장소를 다시 읽으며 확정합니다.

## 현재 입력 상태

EOF
  if project_setup_has_answers ".harness/docs/project-setup.md"; then
    cat <<'EOF'
- `project-setup.md`에 사용자 입력이 있습니다.
- 역할 스킬은 이 입력을 저장소 재탐색과 함께 사용해야 합니다.
EOF
  else
    cat <<'EOF'
- 아직 사용자 입력이 충분하지 않습니다.
- `project-setup.md` 또는 사용자 답변이 들어오기 전까지는 방향 확정을 유보합니다.
EOF
  fi

  cat <<'EOF'

## 역할 팀 메모

- `exploration-notes.md`는 후보 경로 목록이 아니라, 추가 확인이 필요하다는 신호를 남기는 문서입니다.
- `domain-analyst`는 이 문서를 복사하지 말고 저장소를 직접 다시 읽어 `domain-analysis.md`를 작성해야 합니다.
- `run-harness`는 이 문서만으로 시작 역할을 단정하지 말고, 사용자 입력과 현재 문서 품질을 함께 읽어야 합니다.

## 다음 확인 질문

- 이 저장소가 해결하는 사용자 문제 또는 운영 문제는 무엇인가
- 어떤 실행 흐름이 가장 먼저 성공해야 하는가
- 어떤 실패가 가장 비용이 큰가
- 지금 부족한 것은 저장소 입력 부족인지, 문서 재작성 부족인지, 운영 기준과 실제 상태의 불일치인지
EOF
} > "$OUTPUT_FILE"

log "입력 메모 문서 생성: $OUTPUT_FILE"
