#!/usr/bin/env sh
set -eu

DEST_ROOT="${CODEX_HARNESS_DEST_ROOT:-"$HOME/.agents/skills"}"
HARNESS_DEST="${CODEX_HARNESS_DEST:-"$DEST_ROOT/harness"}"
STATE_HOME="${XDG_STATE_HOME:-"$HOME/.local/state"}"
BACKUP_ROOT="${CODEX_HARNESS_BACKUP_ROOT:-"$STATE_HOME/codex-harness/backups"}"
HARNESS_SKILLS="harness"
WORKFLOW_ENGINE_SKILLS="github-agentic-loop workflow-code-editor github-state-summary github-simple-executor target-harness-code-editor issue-creation feature-proposal-triage policy-plan policy-review-next-triage feature-plan fix-analysis fix-plan branch-proposal commit-plan pr-proposal pr-creation review-comment"
LEGACY_WORKFLOW_ENGINE_SKILL="github-workflow-engine"
UNINSTALL_TARGET="${1:-all}"

die() {
  printf '%s\n' "uninstall.sh: $*" >&2
  exit 1
}

select_skills() {
  case "$UNINSTALL_TARGET" in
    harness)
      CODEX_SKILLS="$HARNESS_SKILLS"
      ;;
    workflow-engine)
      CODEX_SKILLS="$WORKFLOW_ENGINE_SKILLS $LEGACY_WORKFLOW_ENGINE_SKILL"
      ;;
    all)
      CODEX_SKILLS="$HARNESS_SKILLS $WORKFLOW_ENGINE_SKILLS $LEGACY_WORKFLOW_ENGINE_SKILL"
      ;;
    *)
      die "제거 대상은 harness, workflow-engine, all 중 하나여야 합니다: $UNINSTALL_TARGET"
      ;;
  esac
}

dest_for_skill() {
  skill="$1"

  if [ "$skill" = "harness" ]; then
    printf '%s\n' "$HARNESS_DEST"
  else
    printf '%s\n' "$DEST_ROOT/$skill"
  fi
}

next_backup_path() {
  skill="$1"
  event="$2"
  backup_base="$BACKUP_ROOT/$skill.$event.$(date +%Y%m%d%H%M%S).$$"
  backup_candidate="$backup_base"
  backup_suffix=0

  while [ -e "$backup_candidate" ]; do
    backup_suffix=$((backup_suffix + 1))
    backup_candidate="$backup_base.$backup_suffix"
  done

  printf '%s\n' "$backup_candidate"
}

remove_skill() {
  skill="$1"
  dest="$2"

  if [ ! -e "$dest" ]; then
    printf '%s\n' "삭제할 $skill 스킬이 없습니다: $dest"
    return 0
  fi

  mkdir -p "$BACKUP_ROOT"
  backup=$(next_backup_path "$skill" removed)
  mv "$dest" "$backup"
  removed=1

  printf '%s\n' "$skill 스킬을 제거했습니다."
  printf '%s\n' "백업 위치: $backup"
}

removed=0

[ "$#" -le 1 ] || die "제거 대상은 하나만 지정할 수 있습니다."
select_skills

for skill in $CODEX_SKILLS; do
  remove_skill "$skill" "$(dest_for_skill "$skill")"
done

if [ "$removed" -eq 0 ]; then
  exit 0
fi
