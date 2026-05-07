#!/usr/bin/env sh
set -eu

REPO="${CODEX_HARNESS_REPO:-codechaser-kr/codex-harness}"
REF="${CODEX_HARNESS_REF:-main}"
CODEX_HOME="${CODEX_HOME:-"$HOME/.codex"}"
DEST="${CODEX_HARNESS_DEST:-"$CODEX_HOME/skills/harness"}"
TMP_ROOT="${TMPDIR:-/tmp}/codex-harness-install.$$"

cleanup() {
  rm -rf "$TMP_ROOT"
}

die() {
  printf '%s\n' "install.sh: $*" >&2
  exit 1
}

download() {
  url="$1"
  out="$2"

  if command -v curl >/dev/null 2>&1; then
    curl -fsSL "$url" -o "$out"
  elif command -v wget >/dev/null 2>&1; then
    wget -qO "$out" "$url"
  else
    die "curl 또는 wget이 필요합니다."
  fi
}

find_local_source() {
  script_dir=$(CDPATH= cd "$(dirname "$0")" 2>/dev/null && pwd || printf '.')
  candidate="$script_dir/.codex-dist/skills/harness"

  if [ -f "$candidate/SKILL.md" ]; then
    printf '%s\n' "$candidate"
    return 0
  fi

  return 1
}

find_remote_source() {
  archive="$TMP_ROOT/source.tar.gz"
  extract_dir="$TMP_ROOT/source"
  archive_url="https://github.com/$REPO/archive/$REF.tar.gz"

  mkdir -p "$extract_dir"
  download "$archive_url" "$archive"
  tar -xzf "$archive" -C "$extract_dir"

  skill_file=$(find "$extract_dir" -type f -name SKILL.md | grep '/\.codex-dist/skills/harness/SKILL\.md$' | head -n 1)
  [ -n "$skill_file" ] || die "아카이브에서 harness 스킬을 찾지 못했습니다: $archive_url"

  dirname "$skill_file"
}

install_source() {
  source_dir="$1"
  stage="$TMP_ROOT/harness"

  [ -f "$source_dir/SKILL.md" ] || die "SKILL.md가 없습니다: $source_dir"
  [ -d "$source_dir/references" ] || die "references 디렉터리가 없습니다: $source_dir"

  mkdir -p "$stage"
  cp -R "$source_dir/." "$stage/"
  mkdir -p "$(dirname "$DEST")"

  if [ -e "$DEST" ]; then
    backup="$DEST.backup.$(date +%Y%m%d%H%M%S).$$"
    mv "$DEST" "$backup"
    printf '%s\n' "기존 harness 스킬 백업: $backup"
  fi

  mv "$stage" "$DEST"
}

trap cleanup EXIT INT TERM
mkdir -p "$TMP_ROOT"

if source_dir=$(find_local_source); then
  printf '%s\n' "로컬 배포본을 설치합니다: $source_dir"
else
  printf '%s\n' "원격 배포본을 설치합니다: $REPO@$REF"
  source_dir=$(find_remote_source)
fi

install_source "$source_dir"

printf '%s\n' "설치 완료: $DEST"
printf '%s\n' "확인: $DEST/SKILL.md"
