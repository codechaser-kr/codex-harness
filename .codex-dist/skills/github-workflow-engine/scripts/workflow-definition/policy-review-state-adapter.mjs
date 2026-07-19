import { normalizeWorkflowObservations } from "./workflow-state-adapter.mjs";

const SOURCE_CONTRACTS = new Map([
  ["policy_review_requested", { sourceKind: "user_input" }],
  ["feature_proposal_policy_review_transition_completed", { sourceKind: "github_state" }],
  ["policy_review_draft_confirmed", { sourceKind: "user_input" }],
  ["policy_review_issue_created", { sourceKind: "github_state" }],
  ["policy_design_proposal_usable", { sourceKind: "skill_output", sourceReference: "policy-plan" }],
  ["policy_design_confirmed", { sourceKind: "user_input" }],
  ["policy_design_reflected", { sourceKind: "github_state" }],
  ["design_document_implementation_started", { sourceKind: "local_state" }],
  ["design_document_pr_merged", { sourceKind: "github_state" }],
  ["design_document_result_reflected", { sourceKind: "github_state" }],
  ["feature_change_transition_candidates_usable", { sourceKind: "skill_output", sourceReference: "policy-review-next-triage" }],
  ["feature_change_transition_direction", { sourceKind: "user_input" }],
  ["feature_change_transition_reflected", { sourceKind: "github_state" }],
  ["policy_review_issue_closed", { sourceKind: "github_state" }],
  ["feature_change_transition_result", { sourceKind: "github_state" }],
]);

/**
 * Normalizes policy-review observations without external IO or input mutation.
 */
export function normalizePolicyReviewFacts(definition, observations) {
  return normalizeWorkflowObservations(definition, observations, {
    workflowId: "policy-review",
    sourceContracts: SOURCE_CONTRACTS,
  });
}
