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

이 문서는 코드베이스 탐색에서 직접 수집한 근거를 정리합니다.
해석이나 운영 규칙보다 먼저, 실제로 확인한 파일·경로·경계 단서를 남기는 것을 목적으로 합니다.

## 요약

- 현재 작업 디렉토리: \`$ROOT_DIR\`
- 하네스 운영 모드: \`$(detect_harness_operation_mode)\`
- 탐색은 대표 진입점, 코드 경계, 테스트 자산, 설정 경로, 도메인 문서 단서를 우선 수집합니다.

## 대표 진입점
EOF
  print_markdown_bullets_or_fallback list_entrypoint_anchor_paths "아직 자동으로 포착한 대표 진입점이 없습니다."

  cat <<'EOF'

## 주요 코드 경계
EOF
  print_markdown_bullets_or_fallback list_code_boundary_paths "아직 자동으로 포착한 주요 코드 경계가 없습니다."

  cat <<'EOF'

## 테스트 및 검증 자산
EOF
  print_markdown_bullets_or_fallback list_test_asset_paths "아직 자동으로 포착한 테스트 또는 검증 자산이 없습니다."

  cat <<'EOF'

## 설정 및 실행 경로
EOF
  print_markdown_bullets_or_fallback list_config_asset_paths "아직 자동으로 포착한 설정 또는 실행 경로가 없습니다."

  cat <<'EOF'

## 저장소 고유 용어 단서
EOF
  print_markdown_bullets_or_fallback list_domain_context_paths "아직 자동으로 포착한 문서 기반 용어 단서가 없습니다."

  cat <<'EOF'

## 다음 탐색 질문

- 어떤 파일이 실제 첫 성공 흐름의 시작점인가
- 어떤 경계가 변경 영향과 실패 비용을 가장 크게 만든다고 볼 수 있는가
- 테스트 자산이 실제 운영 경계를 얼마나 덮고 있는가
- README나 도메인 문서의 용어가 코드 구조와 어떻게 연결되는가
EOF
} > "$OUTPUT_FILE"

log "탐색 근거 문서 생성: $OUTPUT_FILE"
