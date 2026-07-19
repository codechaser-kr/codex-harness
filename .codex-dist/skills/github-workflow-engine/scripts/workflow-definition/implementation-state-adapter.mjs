import { normalizeWorkflowObservations } from "./workflow-state-adapter.mjs";

const SOURCE_CONTRACTS = new Map([
  ["implementation_requested", { sourceKind: "user_input" }],
  ["branch_proposal_usable", { sourceKind: "skill_output", sourceReference: "branch-proposal" }],
  ["branch_proposal_confirmed", { sourceKind: "user_input" }],
  ["implementation_branch_switched", { sourceKind: "local_state" }],
  ["implementation_plan_usable", { sourceKind: "skill_output", sourceReference: "commit-plan" }],
  ["implementation_plan_confirmed", { sourceKind: "user_input" }],
  ["implementation_plan_reflected", { sourceKind: "github_state" }],
  ["implementation_work_unit_state", { sourceKind: "local_state" }],
  ["implementation_commit_message_proposal_usable", { sourceKind: "skill_output", sourceReference: "commit" }],
  ["implementation_commit_message_confirmed", { sourceKind: "user_input" }],
  ["implementation_commit_created", { sourceKind: "local_state" }],
  ["implementation_progress", { sourceKind: "local_state" }],
  ["implementation_branch_pushed", { sourceKind: "local_state" }],
  ["pull_request_draft_usable", { sourceKind: "skill_output", sourceReference: "pr-proposal" }],
  ["pull_request_draft_confirmed", { sourceKind: "user_input" }],
  ["pull_request_creation_requested", { sourceKind: "user_input" }],
  ["pull_request_created", { sourceKind: "github_state" }],
  ["review_mode", { sourceKind: "user_input" }],
  ["review_mode_checked", { sourceKind: "local_state" }],
  ["claude_code_review_completed", { sourceKind: "skill_output", sourceReference: "claude/code-review" }],
  ["claude_awesome_code_review_completed", { sourceKind: "skill_output", sourceReference: "claude/awesome-code-review" }],
  ["codex_awesome_code_review_completed", { sourceKind: "skill_output", sourceReference: "codex/awesome-code-review" }],
  ["review_feedback_importance", { sourceKind: "local_state" }],
  ["inline_review_thread_drafts_usable", { sourceKind: "skill_output", sourceReference: "review-comment" }],
  ["review_comment_location_status", { sourceKind: "local_state" }],
  ["review_comment_posting_direction", { sourceKind: "user_input" }],
  ["review_comment_posting_direction_reflected", { sourceKind: "local_state" }],
  ["remaining_review_comment_location_status", { sourceKind: "local_state" }],
  ["inline_review_threads_posted", { sourceKind: "github_state" }],
  ["github_review_threads_observed", { sourceKind: "github_state" }],
  ["review_feedback_inventory", { sourceKind: "local_state" }],
  ["review_feedback_direction", { sourceKind: "user_input" }],
  ["review_feedback_fixed", { sourceKind: "local_state" }],
  ["feedback_commit_message_proposal_usable", { sourceKind: "skill_output", sourceReference: "commit" }],
  ["feedback_commit_message_confirmed", { sourceKind: "user_input" }],
  ["feedback_commit_created", { sourceKind: "local_state" }],
  ["feedback_branch_pushed", { sourceKind: "local_state" }],
  ["selected_review_thread_reply_posted", { sourceKind: "github_state" }],
  ["feedback_resolution", { sourceKind: "user_input" }],
  ["feedback_resolution_reflected", { sourceKind: "local_state" }],
  ["remaining_feedback_status", { sourceKind: "local_state" }],
  ["pull_request_merge_decision", { sourceKind: "user_input" }],
  ["pull_request_merged", { sourceKind: "github_state" }],
  ["post_merge_reflection_completed", { sourceKind: "local_state" }],
  ["implementation_completed", { sourceKind: "local_state" }],
]);

/**
 * Normalizes implementation observations without external IO or input mutation.
 */
export function normalizeImplementationFacts(definition, observations) {
  return normalizeWorkflowObservations(definition, observations, {
    workflowId: "implementation",
    sourceContracts: SOURCE_CONTRACTS,
  });
}
