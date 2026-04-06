#!/usr/bin/env bash
set -euo pipefail

CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
TARGET_DIR="$CODEX_HOME/skills/harness"

log() {
  printf '[harness][uninstall] %s\n' "$1"
}

log "starting uninstall"

if [ -e "$TARGET_DIR" ]; then
  log "removing: $TARGET_DIR"
  rm -rf "$TARGET_DIR"
else
  log "nothing to remove: $TARGET_DIR"
fi

log "제거 완료"
printf '\n'
printf '제거 경로: %s\n' "$TARGET_DIR"
printf 'AGENTS.md 파일은 생성하거나 수정하지 않습니다.\n'
