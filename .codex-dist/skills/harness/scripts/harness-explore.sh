#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(pwd)"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$SCRIPT_DIR/harness-lib.sh"

OUTPUT_FILE="${1:-.harness/reports/exploration-notes.md}"

log() {
  printf '[harness][explore] %s\n' "$1"
}

mkdir -p "$(dirname "$OUTPUT_FILE")"

{
  cat <<EOF
# Exploration Notes

이 문서는 코드베이스 탐색에서 직접 수집한 근거를 바탕으로,
후속 역할이 실제 구조와 도메인을 다시 해석할 때 참고할 후보 단서를 정리합니다.
해석 문서를 대신하지 않으며, 자동 수집된 시작점 후보와 관련 경로를 먼저 공유하는 것을 목적으로 합니다.

## 요약

- 현재 작업 디렉토리: \`$ROOT_DIR\`
- 하네스 운영 모드: \`$(detect_harness_operation_mode)\`
- 탐색은 대표 시작점 후보, 관련 코드 경로, 검증 자산, 실행/설정 경로, 저장소 용어 단서를 우선 수집합니다.

## 대표 진입점

이 목록은 자동으로 포착한 시작점 후보이며, 실제 사용자 흐름의 출발점은 후속 역할이 다시 확인합니다.
EOF
  print_markdown_bullets_or_fallback list_entrypoint_anchor_paths "아직 자동으로 포착한 대표 진입점이 없습니다."

  cat <<'EOF'

## 주요 코드 경계

이 목록은 함께 읽어야 할 관련 코드 경로 후보이며, 최종 경계 판단은 후속 역할이 실제 책임과 소비 관계를 보고 정리합니다.
EOF
  print_markdown_bullets_or_fallback list_code_boundary_paths "아직 자동으로 포착한 주요 코드 경계가 없습니다."

  cat <<'EOF'

## 테스트 및 검증 자산

이 목록은 자동으로 포착한 검증 자산 후보이며, 실제 핵심 흐름을 덮는지 여부는 후속 역할이 다시 판단합니다.
EOF
  print_markdown_bullets_or_fallback list_test_asset_paths "아직 자동으로 포착한 테스트 또는 검증 자산이 없습니다."

  cat <<'EOF'

## 설정 및 실행 경로

이 목록은 실행, 빌드, 배포, 검증에 연결될 수 있는 설정 후보이며, 실제 운영 경로인지 여부는 후속 역할이 다시 확인합니다.
EOF
  print_markdown_bullets_or_fallback list_config_asset_paths "아직 자동으로 포착한 설정 또는 실행 경로가 없습니다."

  cat <<'EOF'

## 저장소 고유 용어 단서

이 목록은 문서에서 포착한 용어 후보이며, 실제 도메인 설명에 쓸 용어는 코드와 함께 다시 검토합니다.
EOF
  print_markdown_bullets_or_fallback list_domain_context_paths "아직 자동으로 포착한 문서 기반 용어 단서가 없습니다."

  cat <<'EOF'

## 다음 탐색 질문

- 자동 수집한 시작점 후보 중 실제 사용자 흐름의 출발점은 무엇인가
- 함께 수집된 코드 경로 중 어떤 것들이 같은 책임이나 흐름으로 묶이는가
- 검증 자산이 실제 핵심 흐름과 변경 위험을 얼마나 직접 덮고 있는가
- 문서 용어와 코드 근거 중 무엇이 이 저장소의 실제 도메인을 더 잘 설명하는가
EOF
} > "$OUTPUT_FILE"

log "탐색 근거 문서 생성: $OUTPUT_FILE"
