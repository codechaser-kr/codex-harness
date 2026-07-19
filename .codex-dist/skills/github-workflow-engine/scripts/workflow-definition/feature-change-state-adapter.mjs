import { normalizeWorkflowObservations } from "./workflow-state-adapter.mjs";

const SOURCE_CONTRACTS = new Map([
  ["feature_change_requested", { sourceKind: "user_input" }],
  ["feature_change_draft_confirmed", { sourceKind: "user_input" }],
  ["feature_change_issue_created", { sourceKind: "github_state" }],
  ["feature_plan_proposal_usable", { sourceKind: "skill_output", sourceReference: "feature-plan" }],
  ["feature_plan_confirmed", { sourceKind: "user_input" }],
  ["feature_plan_reflected", { sourceKind: "github_state" }],
  ["implementation_flow_started", { sourceKind: "local_state" }],
  ["all_planned_work_units_merged", { sourceKind: "github_state" }],
  ["all_completion_items_reflected", { sourceKind: "github_state" }],
  ["feature_change_issue_closed", { sourceKind: "github_state" }],
]);

/**
 * Normalizes feature-change observations without external IO or input mutation.
 */
export function normalizeFeatureChangeFacts(definition, observations) {
  return normalizeWorkflowObservations(definition, observations, {
    workflowId: "feature-change",
    sourceContracts: SOURCE_CONTRACTS,
  });
}
