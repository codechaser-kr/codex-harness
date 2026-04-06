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

log "uninstall completed"
printf '\n'
printf 'Removed: %s\n' "$TARGET_DIR"
printf 'No AGENTS.md files were created or modified.\n'
