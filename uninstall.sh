#!/usr/bin/env sh
set -eu

CODEX_HOME="${CODEX_HOME:-"$HOME/.codex"}"
DEST="${CODEX_HARNESS_DEST:-"$CODEX_HOME/skills/harness"}"

if [ ! -e "$DEST" ]; then
  printf '%s\n' "삭제할 harness 스킬이 없습니다: $DEST"
  exit 0
fi

backup="$DEST.removed.$(date +%Y%m%d%H%M%S).$$"
mv "$DEST" "$backup"

printf '%s\n' "harness 스킬을 제거했습니다."
printf '%s\n' "백업 위치: $backup"
