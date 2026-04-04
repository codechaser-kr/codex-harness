#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST_DIR="$ROOT_DIR/.codex-dist"
SOURCE_DIR="$DIST_DIR/skills/harness"
TARGET_BASE="$HOME/.agents/skills"
TARGET_DIR="$TARGET_BASE/harness"

log() {
  printf '[harness][install] %s\n' "$1"
}

fail() {
  printf '[harness][install][error] %s\n' "$1" >&2
  exit 1
}

log "starting installation"

[ -d "$DIST_DIR" ] || fail "missing distribution directory: $DIST_DIR"
[ -d "$SOURCE_DIR" ] || fail "missing skill source directory: $SOURCE_DIR"

mkdir -p "$TARGET_BASE"

if [ -e "$TARGET_DIR" ]; then
  log "removing existing installation: $TARGET_DIR"
  rm -rf "$TARGET_DIR"
fi

log "copying skill files"
cp -R "$SOURCE_DIR" "$TARGET_DIR"

if [ -d "$TARGET_DIR/scripts" ]; then
  log "making shell scripts executable"
  find "$TARGET_DIR/scripts" -type f -name "*.sh" -exec chmod +x {} \;
fi

log "installation completed"
printf '\n'
printf 'Installed to: %s\n' "$TARGET_DIR"
printf 'No AGENTS.md files were created or modified.\n'
