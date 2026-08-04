import { normalizeWorkflowObservations } from "./workflow-state-adapter.mjs";

const SOURCE_CONTRACTS = new Map([
  ["feature_fix_requested", { sourceKind: "user_input" }],
  ["feature_fix_draft_confirmed", { sourceKind: "user_input" }],
  ["feature_fix_issue_created", { sourceKind: "github_state" }],
  ["fix_analysis_result_usable", { sourceKind: "skill_output", sourceReference: "fix-analysis" }],
  ["fix_analysis_confirmed", { sourceKind: "user_input" }],
  ["fix_plan_proposal_usable", { sourceKind: "skill_output", sourceReference: "fix-plan" }],
  ["fix_plan_confirmed", { sourceKind: "user_input" }],
  ["feature_fix_plan_reflected", { sourceKind: "github_state" }],
  ["implementation_flow_started", { sourceKind: "local_state" }],
  ["all_planned_work_units_merged", { sourceKind: "github_state" }],
  ["all_completion_items_reflected", { sourceKind: "github_state" }],
  ["feature_fix_issue_closed", { sourceKind: "github_state" }],
]);

/**
 * Normalizes feature-fix observations without external IO or input mutation.
 */
export function normalizeFeatureFixFacts(definition, observations) {
  return normalizeWorkflowObservations(definition, observations, {
    workflowId: "feature-fix",
    sourceContracts: SOURCE_CONTRACTS,
  });
}
