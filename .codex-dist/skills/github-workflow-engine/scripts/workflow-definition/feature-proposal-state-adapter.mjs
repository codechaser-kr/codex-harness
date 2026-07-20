import { normalizeWorkflowObservations } from "./workflow-state-adapter.mjs";

const SOURCE_CONTRACTS = new Map([
  ["feature_proposal_requested", { sourceKind: "user_input" }],
  ["feature_proposal_draft_confirmed", { sourceKind: "user_input" }],
  ["feature_proposal_issue_created", { sourceKind: "github_state" }],
  ["feature_proposal_direction", { sourceKind: "user_input" }],
  ["feature_proposal_direction_reflected", { sourceKind: "github_state" }],
  ["feature_proposal_issue_closed", { sourceKind: "github_state" }],
  ["next_workflow", { sourceKind: "github_state" }],
]);

/**
 * Normalizes feature-proposal observations without external IO or input mutation.
 */
export function normalizeFeatureProposalFacts(definition, observations) {
  return normalizeWorkflowObservations(definition, observations, {
    workflowId: "feature-proposal",
    sourceContracts: SOURCE_CONTRACTS,
  });
}
