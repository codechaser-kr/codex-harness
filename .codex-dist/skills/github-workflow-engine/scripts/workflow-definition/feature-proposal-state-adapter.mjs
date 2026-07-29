import { normalizeWorkflowObservations } from "./workflow-state-adapter.mjs";

const SOURCE_CONTRACTS = new Map([
  ["feature_proposal_requested", { sourceKind: "user_input" }],
  ["feature_proposal_draft_confirmed", { sourceKind: "user_input" }],
  ["feature_proposal_issue_created", { sourceKind: "github_state" }],
  ["feature_proposal_direction", { sourceKind: "user_input" }],
  ["feature_proposal_direction_reflected", { sourceKind: "github_state" }],
  ["feature_proposal_issue_closed", { sourceKind: "github_state" }],
  ["feature_proposal_policy_review_transition_completed", { sourceKind: "github_state" }],
  ["feature_proposal_feature_change_transition_completed", { sourceKind: "github_state" }],
]);

const LEGACY_NEXT_WORKFLOW_FACTS = new Map([
  ["policy_review", "feature_proposal_policy_review_transition_completed"],
  ["feature_change", "feature_proposal_feature_change_transition_completed"],
]);

function upgradeLegacyTransitionObservation(observation) {
  if (observation?.fact_id !== "next_workflow") {
    return observation;
  }

  const factId = LEGACY_NEXT_WORKFLOW_FACTS.get(observation.value);
  if (!factId) {
    return observation;
  }

  return {
    ...observation,
    fact_id: factId,
    value: true,
  };
}

/**
 * Normalizes feature-proposal observations without external IO or input mutation.
 */
export function normalizeFeatureProposalFacts(definition, observations) {
  const upgradedObservations = Array.isArray(observations)
    ? observations.map(upgradeLegacyTransitionObservation)
    : observations;

  return normalizeWorkflowObservations(definition, upgradedObservations, {
    workflowId: "feature-proposal",
    sourceContracts: SOURCE_CONTRACTS,
  });
}
