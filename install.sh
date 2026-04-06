#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST_DIR="$ROOT_DIR/.codex-dist"
LOCAL_SOURCE_DIR="$DIST_DIR/skills/harness"
CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
TARGET_BASE="$CODEX_HOME/skills"
TARGET_DIR="$TARGET_BASE/harness"
BOOTSTRAP_REPO="${HARNESS_INSTALL_REPO:-codechaser-kr/codex-harness}"
BOOTSTRAP_REF="${HARNESS_INSTALL_REF:-main}"
BOOTSTRAP_URL="${HARNESS_INSTALL_ARCHIVE_URL:-https://github.com/${BOOTSTRAP_REPO}/archive/refs/heads/${BOOTSTRAP_REF}.tar.gz}"
BOOTSTRAP_TMPDIR=""
SOURCE_DIR=""

log() {
  printf '[harness][install] %s\n' "$1"
}

fail() {
  printf '[harness][install][error] %s\n' "$1" >&2
  exit 1
}

cleanup() {
  if [ -n "$BOOTSTRAP_TMPDIR" ] && [ -d "$BOOTSTRAP_TMPDIR" ]; then
    rm -rf "$BOOTSTRAP_TMPDIR"
  fi
}

has_command() {
  command -v "$1" >/dev/null 2>&1
}

download_to() {
  local url="$1"
  local output_path="$2"

  if has_command curl; then
    curl -fsSL "$url" -o "$output_path"
    return
  fi

  if has_command wget; then
    wget -qO "$output_path" "$url"
    return
  fi

  fail "부트스트랩 설치에 curl 또는 wget이 필요합니다"
}

bootstrap_source_dir() {
  local archive_path
  local extract_dir
  local repository_root

  has_command tar || fail "부트스트랩 설치에 tar가 필요합니다"
  has_command mktemp || fail "부트스트랩 설치에 mktemp가 필요합니다"

  BOOTSTRAP_TMPDIR="$(mktemp -d)"
  archive_path="$BOOTSTRAP_TMPDIR/codex-harness.tar.gz"
  extract_dir="$BOOTSTRAP_TMPDIR/extracted"

  log "로컬 배포본 없음, 다운로드 시작: ${BOOTSTRAP_REPO}@${BOOTSTRAP_REF}"
  download_to "$BOOTSTRAP_URL" "$archive_path"

  mkdir -p "$extract_dir"
  tar -xzf "$archive_path" -C "$extract_dir"

  repository_root="$(find "$extract_dir" -mindepth 1 -maxdepth 1 -type d -print -quit)"
  [ -n "$repository_root" ] || fail "압축 해제된 저장소 디렉토리를 찾을 수 없습니다"

  SOURCE_DIR="$repository_root/.codex-dist/skills/harness"
  [ -d "$SOURCE_DIR" ] || fail "원격 배포본에 .codex-dist/skills/harness가 없습니다"
}

resolve_source_dir() {
  if [ -d "$LOCAL_SOURCE_DIR" ]; then
    SOURCE_DIR="$LOCAL_SOURCE_DIR"
    log "로컬 배포본 사용: $SOURCE_DIR"
    return
  fi

  bootstrap_source_dir
  log "다운로드 배포본 사용: $SOURCE_DIR"
}

trap cleanup EXIT

log "설치 시작"
resolve_source_dir

mkdir -p "$TARGET_BASE"

if [ -e "$TARGET_DIR" ]; then
  log "기존 설치 제거: $TARGET_DIR"
  rm -rf "$TARGET_DIR"
fi

log "스킬 파일 복사 중"
cp -R "$SOURCE_DIR" "$TARGET_DIR"

if [ -d "$TARGET_DIR/scripts" ]; then
  log "셸 스크립트 실행 권한 설정 중"
  find "$TARGET_DIR/scripts" -type f -name "*.sh" -exec chmod +x {} \;
fi

log "설치 완료"
printf '\n'
printf '설치 경로: %s\n' "$TARGET_DIR"
printf 'AGENTS.md 파일은 생성하거나 수정하지 않습니다.\n'
