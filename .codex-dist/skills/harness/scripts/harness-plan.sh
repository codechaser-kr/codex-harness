#!/usr/bin/env bash
set -euo pipefail

REPORT_DIR=".harness/reports"
DOMAIN_REPORT="$REPORT_DIR/domain-analysis.md"
ARCH_REPORT="$REPORT_DIR/harness-architecture.md"
QA_REPORT="$REPORT_DIR/qa-strategy.md"
ORCH_REPORT="$REPORT_DIR/orchestration-plan.md"

log() {
  printf '[harness][plan] %s\n' "$1"
}

detect_project_type() {
  if [ -f "package.json" ]; then
    echo "node"
    return
  fi

  if [ -f "Cargo.toml" ]; then
    echo "rust"
    return
  fi

  if [ -f "pyproject.toml" ] || [ -f "requirements.txt" ]; then
    echo "python"
    return
  fi

  if [ -f "go.mod" ]; then
    echo "go"
    return
  fi

  echo "unknown"
}

detect_stack_hint() {
  local hints=()

  [ -f "package.json" ] && hints+=("Node.js")
  [ -f "Cargo.toml" ] && hints+=("Rust")
  [ -f "pyproject.toml" ] && hints+=("Python")
  [ -f "requirements.txt" ] && hints+=("Python")
  [ -f "go.mod" ] && hints+=("Go")
  [ -f "tsconfig.json" ] && hints+=("TypeScript")
  [ -f "vite.config.ts" ] && hints+=("Vite")
  [ -f "next.config.js" ] && hints+=("Next.js")
  [ -f "next.config.mjs" ] && hints+=("Next.js")

  if [ "${#hints[@]}" -eq 0 ]; then
    echo "추정 불가"
    return
  fi

  local joined=""
  local i
  for i in "${!hints[@]}"; do
    if [ "$i" -eq 0 ]; then
      joined="${hints[$i]}"
    else
      joined="$joined, ${hints[$i]}"
    fi
  done

  echo "$joined"
}

PROJECT_TYPE="$(detect_project_type)"
STACK_HINT="$(detect_stack_hint)"

log "하네스 계획 리포트 생성 시작"
mkdir -p "$REPORT_DIR"

cat > "$DOMAIN_REPORT" <<EOF_DOMAIN
# 도메인 분석

## 저장소 요약

- 프로젝트 유형: $PROJECT_TYPE
- 주요 기술 스택 추정: $STACK_HINT

## 분석 관점

이 문서는 현재 저장소를 하네스 관점에서 이해하기 위한 출발점입니다.

우선 다음을 정리해야 합니다.

- 이 저장소가 해결하려는 문제는 무엇인가
- 주요 사용자 또는 개발자 흐름은 무엇인가
- 어떤 품질 문제가 반복적으로 발생할 수 있는가
- 하네스가 우선적으로 다뤄야 할 핵심 축은 무엇인가

## 초기 질문

- 이 프로젝트는 애플리케이션인가, 라이브러리인가, 도구인가
- 핵심 기능은 어디에 모여 있는가
- 변경 시 영향이 큰 영역은 어디인가
- 검토를 자동화하거나 구조화할 가치가 큰 흐름은 무엇인가

## 다음 단계

- domain-analyst가 실제 저장소 구조를 읽고 내용을 구체화합니다.
- 필요하면 디렉토리별 역할과 핵심 파일을 추가로 정리합니다.
EOF_DOMAIN

cat > "$ARCH_REPORT" <<EOF_ARCH
# 하네스 아키텍처

## 목적

이 문서는 현재 저장소에 어떤 범용 하네스 구조를 둘지 정의합니다.

## 권장 역할

- domain-analyst
- harness-architect
- skill-scaffolder
- qa-designer
- orchestrator
- validator

## 역할별 책임

### domain-analyst
- 저장소 목적과 도메인 파악
- 기술 스택과 핵심 흐름 분석
- 하네스 관점의 주요 관심사 정리

### harness-architect
- 로컬 하네스 구조 설계
- 역할 분리와 확장 방향 정의
- 스킬/리포트/시나리오 구성 제안

### skill-scaffolder
- 로컬 스킬 생성 및 보완
- 구조와 스킬의 일관성 유지

### qa-designer
- 품질 기준과 검토 관점 정의
- 체크포인트와 검토 흐름 정리

### orchestrator
- 여러 역할을 실제 작업 순서로 연결
- 반복 가능한 작업 흐름 정의

### validator
- 현재 하네스 구조가 최소 요건을 만족하는지 점검

## 설계 원칙

- 특정 프레임워크에 과도하게 고정하지 않는다.
- 사람이 읽고 수정할 수 있는 구조를 우선한다.
- 생성기와 프로젝트 로컬 산출물을 분리한다.
- 이후 프로젝트 특화 하네스로 확장할 수 있어야 한다.

## 다음 단계

- skill-scaffolder가 현재 구조를 실제 파일로 유지/보완합니다.
- qa-designer와 orchestrator가 이 구조를 운영 가능한 흐름으로 연결합니다.
EOF_ARCH

cat > "$QA_REPORT" <<EOF_QA
# QA 전략

## 목적

이 문서는 저장소에서 중요하게 봐야 할 품질 기준과 검토 지점을 정리합니다.

## 기본 관점

범용 하네스 1차 단계에서는 다음을 우선합니다.

- 저장소 구조를 이해할 수 있는가
- 역할이 분리되어 있는가
- 생성된 하네스 산출물이 사람이 검토 가능한가
- 로컬 스킬 구성이 반복 사용에 적합한가

## 검토 질문

- 이 저장소에서 가장 중요한 실패 유형은 무엇인가
- 어떤 영역은 변경 영향도가 큰가
- 어떤 흐름은 반복적으로 점검할 가치가 있는가
- 어떤 산출물이 있으면 팀이 더 쉽게 검토할 수 있는가

## 체크포인트 예시

- 도메인 분석 리포트가 실제 저장소와 맞는가
- 하네스 역할 정의가 과하거나 부족하지 않은가
- 스킬 설명이 충분히 명확한가
- 오케스트레이션 계획이 실제 작업 흐름과 연결되는가

## 다음 단계

- 프로젝트별로 expected-state, diff, scenario 실행 전략이 필요해지면 이 문서를 확장합니다.
EOF_QA

cat > "$ORCH_REPORT" <<EOF_ORCH
# 오케스트레이션 계획

## 목적

이 문서는 여러 하네스 역할이 실제로 어떤 순서와 방식으로 협력해야 하는지 정리합니다.

## 기본 흐름

1. domain-analyst가 저장소를 분석한다.
2. harness-architect가 하네스 구조를 설계한다.
3. skill-scaffolder가 로컬 스킬과 기본 산출물을 정리한다.
4. qa-designer가 품질 전략과 검토 지점을 정의한다.
5. orchestrator가 반복 가능한 작업 흐름을 정리한다.
6. validator가 현재 구성이 최소 요건을 만족하는지 점검한다.

## 운영 원칙

- 먼저 분석하고, 그 다음 구조를 만든다.
- 구조를 만든 뒤 품질 관점을 붙인다.
- 역할 간 책임이 겹치지 않게 한다.
- 결과물은 사람이 쉽게 검토할 수 있어야 한다.

## 확장 방향

이 범용 하네스는 이후 다음으로 확장될 수 있습니다.

- 프로젝트 특화 하네스
- expected-state 구조
- diff 전략
- 시나리오 실행 연결
- 자동 검증 파이프라인

## 메모

이 문서는 현재 저장소의 실제 작업 흐름에 맞게 계속 수정되어야 합니다.
EOF_ORCH

log "하네스 계획 리포트 생성 완료"
log "생성됨: $DOMAIN_REPORT"
log "생성됨: $ARCH_REPORT"
log "생성됨: $QA_REPORT"
log "생성됨: $ORCH_REPORT"
