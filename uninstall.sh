#!/usr/bin/env bash
set -euo pipefail

CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
TARGET_DIR="$CODEX_HOME/skills/harness"
LEGACY_TARGET_DIR="$HOME/.agents/skills/harness"

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

if [ -e "$LEGACY_TARGET_DIR" ]; then
  log "removing legacy path: $LEGACY_TARGET_DIR"
  rm -rf "$LEGACY_TARGET_DIR"
fi

log "uninstall completed"
printf '\n'
printf 'Removed: %s\n' "$TARGET_DIR"
printf 'No AGENTS.md files were created or modified.\n'
