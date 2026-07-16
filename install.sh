#!/usr/bin/env sh
set -eu

REPO="${CODEX_HARNESS_REPO:-codechaser-kr/codex-harness}"
REF="${CODEX_HARNESS_REF:-main}"
CODEX_HOME="${CODEX_HOME:-"$HOME/.codex"}"
DEST_ROOT="${CODEX_HARNESS_DEST_ROOT:-"$CODEX_HOME/skills"}"
HARNESS_DEST="${CODEX_HARNESS_DEST:-"$DEST_ROOT/harness"}"
TMP_ROOT="${TMPDIR:-/tmp}/codex-harness-install.$$"
CODEX_SKILLS="harness github-workflow-engine github-state-summary github-simple-executor issue-creation feature-proposal-triage policy-plan policy-review-next-triage feature-plan fix-analysis fix-plan branch-proposal commit-plan pr-proposal pr-creation review-comment"

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
  candidate="$script_dir/.codex-dist/skills"

  if [ -f "$candidate/harness/SKILL.md" ]; then
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

  dirname "$(dirname "$skill_file")"
}

dest_for_skill() {
  skill="$1"

  if [ "$skill" = "harness" ]; then
    printf '%s\n' "$HARNESS_DEST"
  else
    printf '%s\n' "$DEST_ROOT/$skill"
  fi
}

install_skill() {
  source_root="$1"
  skill="$2"
  source_dir="$source_root/$skill"
  dest=$(dest_for_skill "$skill")
  stage="$TMP_ROOT/stage/$skill"

  mkdir -p "$stage"
  [ -f "$source_dir/SKILL.md" ] || die "SKILL.md가 없습니다: $source_dir"
  cp -R "$source_dir/." "$stage/"
  mkdir -p "$(dirname "$dest")"

  if [ -e "$dest" ]; then
    backup="$dest.backup.$(date +%Y%m%d%H%M%S).$$"
    mv "$dest" "$backup"
    printf '%s\n' "기존 $skill 스킬 백업: $backup"
  fi

  mv "$stage" "$dest"
  printf '%s\n' "설치: $dest"
}

install_source() {
  source_root="$1"

  for skill in $CODEX_SKILLS; do
    install_skill "$source_root" "$skill"
  done
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

printf '%s\n' "설치 완료: $DEST_ROOT"
printf '%s\n' "확인: $(dest_for_skill harness)/SKILL.md"
printf '%s\n' "확인: $DEST_ROOT/github-workflow-engine/SKILL.md"
