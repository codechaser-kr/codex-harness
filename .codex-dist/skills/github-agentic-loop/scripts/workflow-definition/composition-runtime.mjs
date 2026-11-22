import { isDeepStrictEqual } from "node:util";

import { evaluateWorkflowDefinition } from "./evaluator.mjs";
import { normalizeFeatureChangeFacts } from "./feature-change-state-adapter.mjs";
import { normalizeFeatureFixFacts } from "./feature-fix-state-adapter.mjs";
import { normalizeFeatureProposalFacts } from "./feature-proposal-state-adapter.mjs";
import { normalizeImplementationFacts } from "./implementation-state-adapter.mjs";
import { normalizePolicyReviewFacts } from "./policy-review-state-adapter.mjs";

const NORMALIZERS = new Map([
  ["feature-proposal", normalizeFeatureProposalFacts],
  ["policy-review", normalizePolicyReviewFacts],
  ["feature-change", normalizeFeatureChangeFacts],
  ["feature-fix", normalizeFeatureFixFacts],
  ["implementation", normalizeImplementationFacts],
]);

// Match issue-owned facts when the active issue ID is available; cross-entity facts retain their own identities.
const ACTIVE_SOURCE_ISSUE_FACTS = new Map([
  ["feature-proposal", new Set([
    "feature_proposal_issue_created",
    "feature_proposal_direction_reflected",
    "feature_proposal_issue_closed",
  ])],
  ["policy-review", new Set([
    "policy_review_issue_created",
    "policy_design_reflected",
    "design_document_result_reflected",
    "feature_change_transition_reflected",
    "feature_change_transition_target_related",
    "policy_review_issue_closed",
  ])],
  ["feature-change", new Set([
    "feature_change_issue_created",
    "feature_plan_reflected",
    "all_planned_work_units_merged",
    "all_completion_items_reflected",
    "feature_change_issue_closed",
  ])],
  ["feature-fix", new Set([
    "feature_fix_issue_created",
    "feature_fix_plan_reflected",
    "all_planned_work_units_merged",
    "all_completion_items_reflected",
    "feature_fix_issue_closed",
  ])],
  ["implementation", new Set(["implementation_plan_reflected"])],
]);

const PARENT_WORKFLOW_IDS = new Set(["policy-review", "feature-change", "feature-fix"]);
const PLANNED_IMPLEMENTATION_PARENT_IDS = new Set(["feature-change", "feature-fix"]);
const ISSUE_CREATION_TASKS_WITHOUT_SOURCE_ISSUE_ID = new Map([
  ["feature-proposal", new Set(["FP-1", "FP-2"])],
  ["policy-review", new Set(["PR-1", "PR-2"])],
  ["feature-change", new Set(["FC-1", "FC-2"])],
  ["feature-fix", new Set(["FF-1", "FF-2"])],
]);
const OBSERVATION_FIELDS = ["fact_id", "value", "source_kind", "source_reference", "field_reference"];

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function hasSourceIssueIdentifier(sourceIdentifiers, sourceIssueId) {
  const expectedIdentifier = `issue #${sourceIssueId.trim()}`.toLowerCase();
  return sourceIdentifiers.some((identifier) => identifier.trim().toLowerCase() === expectedIdentifier);
}

function sourceReferenceMatchesIssue(sourceReference, sourceIssueId) {
  if (typeof sourceReference !== "string") return false;
  const issueIds = [...sourceReference.matchAll(/\bissue\s+#(\d+)\b/gi)].map((match) => match[1]);
  return issueIds.length === 1 && issueIds[0] === sourceIssueId.trim();
}

function stopped(workflowId, reason, errors = []) {
  return { status: "stopped", workflow_id: workflowId, reason, errors };
}

function validateSourceResult(result, { name, request, workflowId, requireGithubReadOnly = false }) {
  const errors = [];
  if (!isRecord(result)) {
    return [{ code: "source_result.type", path: `/${name}`, message: `${name} must return an object.` }];
  }
  if (result.request_id !== request.request_id) {
    errors.push({ code: "source_result.request_id.mismatch", path: `/${name}/request_id`, message: `${name} must match the active request_id.` });
  }
  if (!isDeepStrictEqual(result.target_baseline, request.target_baseline)) {
    errors.push({ code: "source_result.target_baseline.mismatch", path: `/${name}/target_baseline`, message: `${name} must match the active target_baseline.` });
  }
  if (!Array.isArray(result.source_identifiers)) {
    errors.push({ code: "source_result.source_identifiers.invalid", path: `/${name}/source_identifiers`, message: `${name} must identify its observation sources.` });
  } else if (result.source_identifiers.some((identifier) => !isNonEmptyString(identifier))
    || (requireGithubReadOnly && result.source_identifiers.length === 0)) {
    errors.push({ code: "source_result.source_identifiers.invalid", path: `/${name}/source_identifiers`, message: `${name} source identifiers must be non-empty strings.` });
  }
  if (requireGithubReadOnly && isNonEmptyString(request.source_issue_id)
    && Array.isArray(result.source_identifiers)
    && result.source_identifiers.every(isNonEmptyString)
    && !hasSourceIssueIdentifier(result.source_identifiers, request.source_issue_id)) {
    errors.push({
      code: "source_result.source_identifiers.source_issue_id_mismatch",
      path: `/${name}/source_identifiers`,
      message: `${name} must identify the requested issue #${request.source_issue_id.trim()}.`,
    });
  }
  if (!Array.isArray(result.observed_facts)) {
    errors.push({ code: "source_result.observed_facts.invalid", path: `/${name}/observed_facts`, message: `${name} must return observed_facts as an array.` });
  }
  if (requireGithubReadOnly && isNonEmptyString(request.source_issue_id) && Array.isArray(result.observed_facts)) {
    const activeSourceIssueFacts = ACTIVE_SOURCE_ISSUE_FACTS.get(workflowId) ?? new Set();
    result.observed_facts.forEach((observation, index) => {
      if (!activeSourceIssueFacts.has(observation?.fact_id)
        || observation?.source_kind !== "github_state"
        || sourceReferenceMatchesIssue(observation.source_reference, request.source_issue_id)) {
        return;
      }
      errors.push({
        code: "source_result.observed_fact.source_issue_id_mismatch",
        path: `/${name}/observed_facts/${index}/source_reference`,
        message: `${observation.fact_id} must identify the active source issue #${request.source_issue_id.trim()}.`,
      });
    });
  }
  if (!Array.isArray(result.missing_or_conflicting_facts)) {
    errors.push({ code: "source_result.missing_or_conflicting_facts.invalid", path: `/${name}/missing_or_conflicting_facts`, message: `${name} must report missing or conflicting facts as an array.` });
  }
  if (requireGithubReadOnly) {
    for (const field of [
      "actual_executor_type",
      "actual_agent_or_role",
      "actual_model_identifier",
      "actual_skill_identifier",
      "actual_config_identifier",
      "actual_orchestration_session_id",
      "actual_execution_session_id",
      "actual_session_relation",
      "actual_command_execution_path",
    ]) {
      if (!isNonEmptyString(result[field])) {
        errors.push({ code: "source_result.runtime_identity.missing", path: `/${name}/${field}`, message: `${name} must identify ${field}.` });
      }
    }
    for (const field of ["actual_permission_conditions", "actual_available_tool_conditions", "performed_actions", "verification_results", "residual_risks_or_failure_reasons"]) {
      if (!Array.isArray(result[field])) {
        errors.push({ code: "source_result.runtime_evidence.missing", path: `/${name}/${field}`, message: `${name} must report ${field} as an array.` });
      }
    }
    for (const field of ["execution_path_recheck_result", "postconditions_satisfied"]) {
      if (!Object.hasOwn(result, field)) {
        errors.push({ code: "source_result.runtime_evidence.missing", path: `/${name}/${field}`, message: `${name} must report ${field}.` });
      }
    }
    if (Object.hasOwn(result, "execution_path_recheck_result")
      && result.execution_path_recheck_result !== "satisfied") {
      errors.push({
        code: "source_result.execution_path_recheck.unsatisfied",
        path: `/${name}/execution_path_recheck_result`,
        message: `${name} execution path recheck must be satisfied before its observations can be used.`,
      });
    }
    if (Object.hasOwn(result, "postconditions_satisfied") && result.postconditions_satisfied !== true) {
      errors.push({
        code: "source_result.postconditions.unsatisfied",
        path: `/${name}/postconditions_satisfied`,
        message: `${name} postconditions must be satisfied before its observations can be used.`,
      });
    }
    for (const field of ["changed_files", "github_state_changes"]) {
      if (!Array.isArray(result[field])) {
        errors.push({ code: "source_result.read_only_evidence.missing", path: `/${name}/${field}`, message: `${name} must report ${field}.` });
      } else if (result[field].length > 0) {
        errors.push({ code: "source_result.read_only_evidence.changed", path: `/${name}/${field}`, message: `${name} must not change files or GitHub state.` });
      }
    }
  } else if (Array.isArray(result.observed_facts)) {
    result.observed_facts.forEach((observation, index) => {
      if (observation?.source_kind === "github_state") {
        errors.push({
          code: "source_result.log_claims_github_state",
          path: `/${name}/observed_facts/${index}/source_kind`,
          message: "Workflow logs are auxiliary evidence and cannot assert current github_state provenance.",
        });
      }
    });
  }
  return errors;
}

function resolveGithubPrecedence(githubObservations, logObservations) {
  const githubFacts = new Map();
  for (const observation of githubObservations) {
    if (!isRecord(observation)) continue;
    const candidates = githubFacts.get(observation.fact_id) ?? [];
    candidates.push(observation);
    githubFacts.set(observation.fact_id, candidates);
  }

  const conflicts = [];
  const selectedLogObservations = logObservations.filter((observation) => {
    if (!isRecord(observation) || !githubFacts.has(observation.fact_id)) return true;
    const authoritativeValues = new Set(githubFacts.get(observation.fact_id).map((item) => JSON.stringify(item.value)));
    if (!authoritativeValues.has(JSON.stringify(observation.value))) {
      conflicts.push({
        fact_id: observation.fact_id,
        selected_source_kind: "github_state",
        selected_value: githubFacts.get(observation.fact_id)[0].value,
        ignored_source_kind: observation.source_kind,
        ignored_source_reference: observation.source_reference,
        ignored_value: observation.value,
      });
    }
    return false;
  });

  return { observations: [...githubObservations, ...selectedLogObservations], conflicts };
}

function issueNumberFromRelationEvidence(evidence = []) {
  if (!Array.isArray(evidence) || evidence.length === 0) return null;
  const issueNumbers = new Set();
  for (const item of evidence) {
    if (typeof item?.field_reference !== "string") return null;
    const match = item.field_reference.match(/^related_issues\[issue #(\d+)\]$/);
    if (!match || match[0] !== item.field_reference) return null;
    issueNumbers.add(Number(match[1]));
  }
  return issueNumbers.size === 1 ? [...issueNumbers][0] : null;
}

function issueNumberFromSourceReference(evidence = []) {
  if (!Array.isArray(evidence) || evidence.length === 0) return null;
  const issueNumbers = new Set();
  for (const item of evidence) {
    if (typeof item?.source_reference !== "string") return null;
    const match = item.source_reference.trim().match(/^issue\s+#(\d+)$/i);
    if (!match) return null;
    issueNumbers.add(Number(match[1]));
  }
  return issueNumbers.size === 1 ? [...issueNumbers][0] : null;
}

function selectCompletedWorkflowHandoff({ workflowId, evaluation, factState, normalized, request, workflowLogResult }) {
  if (evaluation.status !== "completed") return null;

  if (workflowId === "feature-proposal" && ["FP-6", "FP-7"].includes(evaluation.task_action_id)) {
    if (!isNonEmptyString(request.source_issue_id)) {
      return { status: "unresolved", reason: "source_issue_id_missing" };
    }
    const direction = factState.feature_proposal_direction;
    if (evaluation.task_action_id === "FP-6" && direction === "policy_review") {
      return {
        status: "start_workflow",
        workflow_id: "policy-review",
        source_issue_id: request.source_issue_id,
        entry_facts: { policy_review_entry_source: "feature_proposal" },
      };
    }
    if (evaluation.task_action_id === "FP-7" && direction === "feature_change") {
      return {
        status: "start_workflow",
        workflow_id: "feature-change",
        source_issue_id: request.source_issue_id,
        entry_facts: { feature_change_entry_source: "feature_proposal" },
      };
    }
  }

  if (workflowId === "policy-review" && evaluation.task_action_id === "PR-11") {
    const relationEvidence = normalized.evidence_by_fact.feature_change_transition_target_related;
    const targetIssueId = issueNumberFromRelationEvidence(relationEvidence);
    if (targetIssueId === null) {
      return { status: "unresolved", reason: "existing_target_issue_id_missing_or_ambiguous_in_relation_evidence" };
    }
    const updatedTargetIssueId = issueNumberFromSourceReference(
      normalized.evidence_by_fact.feature_change_transition_result,
    );
    if (updatedTargetIssueId === null) {
      return { status: "unresolved", reason: "updated_target_issue_id_missing_or_ambiguous_in_result_evidence" };
    }
    if (updatedTargetIssueId !== targetIssueId) {
      return {
        status: "unresolved",
        reason: "existing_target_issue_id_mismatch_between_relation_and_update_result",
        expected_target_issue_id: targetIssueId,
        observed_update_issue_id: updatedTargetIssueId,
      };
    }
    return {
      status: "workflow_ended",
      reason: "existing_feature_issue_updated",
      updated_target_issue_id: targetIssueId,
    };
  }

  if (workflowId === "policy-review" && evaluation.task_action_id === "PR-12") {
    if (!isNonEmptyString(request.source_issue_id)) {
      return { status: "unresolved", reason: "source_issue_id_missing" };
    }
    return {
      status: "start_workflow",
      workflow_id: "feature-change",
      source_issue_id: request.source_issue_id,
      entry_facts: { feature_change_entry_source: "policy_review" },
      create_target_in_successor: true,
    };
  }

  if (workflowId === "implementation" && evaluation.task_action_id === "FI-36") {
    const parent = workflowLogResult.parent_workflow_context;
    if (!isRecord(parent)) {
      if (request.parent_workflow_id !== undefined || request.implementation_unit_id !== undefined) {
        return { status: "unresolved", reason: "parent_workflow_context_missing" };
      }
      return { status: "workflow_ended", reason: "no_parent_workflow_context" };
    }
    if (!PARENT_WORKFLOW_IDS.has(request.parent_workflow_id)
      || !isNonEmptyString(request.implementation_unit_id)) {
      return { status: "unresolved", reason: "invalid_active_parent_workflow_context" };
    }
    if (!PARENT_WORKFLOW_IDS.has(parent.workflow_id)
      || !isNonEmptyString(parent.source_issue_id)
      || !isNonEmptyString(parent.implementation_unit_id)) {
      return { status: "unresolved", reason: "invalid_parent_workflow_context" };
    }
    if (parent.source_issue_id.trim() !== request.source_issue_id.trim()) {
      return {
        status: "unresolved",
        reason: "parent_source_issue_id_mismatch",
        expected_source_issue_id: request.source_issue_id.trim(),
        observed_parent_source_issue_id: parent.source_issue_id.trim(),
      };
    }
    if (parent.workflow_id !== request.parent_workflow_id
      || parent.implementation_unit_id.trim() !== request.implementation_unit_id.trim()) {
      return {
        status: "unresolved",
        reason: "parent_workflow_context_mismatch",
        expected_parent_workflow_id: request.parent_workflow_id,
        observed_parent_workflow_id: parent.workflow_id,
        expected_implementation_unit_id: request.implementation_unit_id.trim(),
        observed_implementation_unit_id: parent.implementation_unit_id.trim(),
      };
    }
    return {
      status: "re_evaluate_parent",
      workflow_id: request.parent_workflow_id,
      source_issue_id: request.source_issue_id.trim(),
      implementation_unit_id: request.implementation_unit_id.trim(),
      resume_from_definition_entry: true,
    };
  }

  return null;
}

/**
 * Runs the observation-to-evaluation boundary using injected read-only runtime providers.
 * Providers return the structured results of GitHub observation and workflow-log observation.
 */
export async function runWorkflowObservationCycle({
  request,
  definition,
  currentTaskActionId,
  observeGithubState,
  observeWorkflowLog,
}) {
  const workflowId = definition?.workflow_id;
  const normalizer = NORMALIZERS.get(workflowId);
  if (!normalizer || typeof observeGithubState !== "function" || typeof observeWorkflowLog !== "function") {
    return stopped(workflowId, "runtime_provider_invalid", [{
      code: "runtime_provider.invalid",
      path: "",
      message: "A supported workflow and both read-only observation providers are required.",
    }]);
  }
  const sourceIssueIdProvided = request?.source_issue_id !== undefined && request?.source_issue_id !== null;
  if (!isRecord(request)
    || !isNonEmptyString(request.request_id)
    || (sourceIssueIdProvided && !isNonEmptyString(request.source_issue_id))
    || request.target_baseline === undefined) {
    return stopped(workflowId, "runtime_request_invalid", [{
      code: "runtime_request.invalid",
      path: "/request",
      message: "request_id and target_baseline are required; source_issue_id must be non-empty when provided.",
    }]);
  }
  if (definition.workflow_id !== workflowId) {
    return stopped(workflowId, "workflow_id_mismatch");
  }

  let githubStateResult;
  let workflowLogResult;
  try {
    [githubStateResult, workflowLogResult] = await Promise.all([
      observeGithubState({
        request_id: request.request_id,
        ...(isNonEmptyString(request.source_issue_id) ? { source_issue_id: request.source_issue_id } : {}),
        target_baseline: request.target_baseline,
      }),
      observeWorkflowLog({ request_id: request.request_id, target_baseline: request.target_baseline }),
    ]);
  } catch (error) {
    return stopped(workflowId, "observation_provider_failed", [{
      code: "runtime_provider.failed",
      path: "",
      message: error instanceof Error ? error.message : "An observation provider failed.",
    }]);
  }

  const sourceErrors = [
    ...validateSourceResult(githubStateResult, {
      name: "github_state_summary",
      request,
      workflowId,
      requireGithubReadOnly: true,
    }),
    ...validateSourceResult(workflowLogResult, { name: "workflow_log_observation", request }),
  ];
  if (sourceErrors.length > 0) {
    return stopped(workflowId, "observation_source_invalid", sourceErrors);
  }

  const { observations, conflicts } = resolveGithubPrecedence(
    githubStateResult.observed_facts,
    workflowLogResult.observed_facts,
  );
  const normalized = normalizer(definition, observations);
  if (normalized.status !== "normalized") {
    return {
      ...stopped(workflowId, normalized.reason ?? "observation_normalization_failed", normalized.errors),
      normalized,
      source_conflicts: conflicts,
    };
  }

  const evaluation = evaluateWorkflowDefinition(definition, normalized.normalized_fact_state, {
    currentTaskActionId,
  });
  if (["action_required", "completed"].includes(evaluation.status)
    && !isNonEmptyString(request.source_issue_id)
    && !ISSUE_CREATION_TASKS_WITHOUT_SOURCE_ISSUE_ID.get(workflowId)?.has(evaluation.task_action_id)) {
    return stopped(workflowId, "runtime_request_invalid", [{
      code: "runtime_request.source_issue_id.required",
      path: "/request/source_issue_id",
      message: `${workflowId}/${evaluation.task_action_id ?? "unknown task"} requires an existing source issue.`,
    }]);
  }
  const handoff = selectCompletedWorkflowHandoff({
    workflowId,
    evaluation,
    factState: normalized.normalized_fact_state,
    normalized,
    request,
    workflowLogResult,
  });
  return {
    status: evaluation.status,
    workflow_id: workflowId,
    normalized,
    evaluation,
    source_conflicts: conflicts,
    source_gaps: [
      ...githubStateResult.missing_or_conflicting_facts,
      ...workflowLogResult.missing_or_conflicting_facts,
    ],
    workflow_handoff: handoff,
  };
}

/**
 * Selects the next parallel implementation launch group from a user-approved plan.
 * The function has no side effects; its caller starts the returned implementation workflows.
 */
export function selectNextImplementationGroup({
  parentWorkflowId,
  sourceIssueId,
  approvedPlan,
  childRuns = [],
}) {
  const errors = [];
  if (!PLANNED_IMPLEMENTATION_PARENT_IDS.has(parentWorkflowId)) errors.push("parent_workflow_id must be feature-change or feature-fix");
  if (!isNonEmptyString(sourceIssueId)) errors.push("source_issue_id is required");
  if (!isRecord(approvedPlan) || approvedPlan.approved !== true) errors.push("approved plan is required");
  if (errors.length > 0) return { status: "stopped", reason: "implementation_plan_invalid", errors };

  const units = approvedPlan.work_units;
  const groups = approvedPlan.execution_groups;
  const order = approvedPlan.execution_group_order;
  if (!Array.isArray(units) || units.length === 0
    || !Array.isArray(groups) || groups.length === 0
    || !Array.isArray(order) || order.length === 0) {
    return { status: "stopped", reason: "implementation_plan_invalid", errors: ["work_units, execution_groups, and execution_group_order are required"] };
  }

  const unitIds = units.map((unit) => unit?.unit_id);
  const groupIds = groups.map((group) => group?.group_id);
  if (unitIds.some((id) => !isNonEmptyString(id)) || new Set(unitIds).size !== unitIds.length) {
    return { status: "stopped", reason: "implementation_plan_invalid", errors: ["work unit IDs must be non-empty and unique"] };
  }
  if (groupIds.some((id) => !isNonEmptyString(id)) || new Set(groupIds).size !== groupIds.length
    || order.length !== groupIds.length || new Set(order).size !== order.length
    || order.some((id) => !groupIds.includes(id))) {
    return { status: "stopped", reason: "implementation_plan_invalid", errors: ["execution group order must list every unique group exactly once"] };
  }

  const unitGroup = new Map();
  for (const group of groups) {
    if (!Array.isArray(group.work_unit_ids) || group.work_unit_ids.length === 0) {
      return { status: "stopped", reason: "implementation_plan_invalid", errors: [`${group.group_id} must contain work units`] };
    }
    for (const unitId of group.work_unit_ids) {
      if (!unitIds.includes(unitId) || unitGroup.has(unitId)) {
        return { status: "stopped", reason: "implementation_plan_invalid", errors: [`${unitId} must appear in exactly one execution group`] };
      }
      unitGroup.set(unitId, group.group_id);
    }
  }
  if (unitGroup.size !== unitIds.length) {
    return { status: "stopped", reason: "implementation_plan_invalid", errors: ["every work unit must belong to exactly one execution group"] };
  }

  const groupPosition = new Map(order.map((groupId, index) => [groupId, index]));
  for (const unit of units) {
    const prerequisites = unit.prerequisites ?? [];
    if (!Array.isArray(prerequisites)) {
      return { status: "stopped", reason: "implementation_plan_invalid", errors: [`${unit.unit_id} prerequisites must be an array`] };
    }
    for (const prerequisite of prerequisites) {
      if (!unitIds.includes(prerequisite)
        || groupPosition.get(unitGroup.get(prerequisite)) >= groupPosition.get(unitGroup.get(unit.unit_id))) {
        return { status: "stopped", reason: "implementation_plan_invalid", errors: [`${unit.unit_id} has a missing or non-prior prerequisite ${prerequisite}`] };
      }
    }
  }

  if (!Array.isArray(childRuns)) {
    return { status: "stopped", reason: "child_run_state_invalid", errors: ["child runs must be an array"] };
  }
  const childStatus = new Map();
  for (const childRun of childRuns) {
    if (!unitIds.includes(childRun?.unit_id) || !["not_started", "running", "completed", "failed"].includes(childRun?.status)) {
      return { status: "stopped", reason: "child_run_state_invalid", errors: ["child runs must identify a planned unit and a supported status"] };
    }
    if (childStatus.has(childRun.unit_id)) {
      return { status: "stopped", reason: "child_run_state_invalid", errors: [`duplicate child state for ${childRun.unit_id}`] };
    }
    childStatus.set(childRun.unit_id, childRun.status);
  }

  for (const groupId of order) {
    const group = groups.find((item) => item.group_id === groupId);
    const statuses = group.work_unit_ids.map((unitId) => childStatus.get(unitId) ?? "not_started");
    if (statuses.includes("failed")) {
      return { status: "stopped", reason: "implementation_child_failed", group_id: groupId };
    }
    if (statuses.every((status) => status === "completed")) continue;

    const workUnitIds = group.work_unit_ids.filter((unitId) => {
      const status = childStatus.get(unitId) ?? "not_started";
      return status === "not_started";
    });
    if (workUnitIds.length === 0) {
      return { status: "waiting", group_id: groupId, work_unit_ids: group.work_unit_ids };
    }
    return {
      status: "launch",
      workflow_id: "implementation",
      parent_workflow_id: parentWorkflowId,
      source_issue_id: sourceIssueId,
      execution_group_id: groupId,
      work_unit_ids: workUnitIds,
      parallel: workUnitIds.length > 1,
    };
  }

  return { status: "all_complete", parent_workflow_id: parentWorkflowId, source_issue_id: sourceIssueId };
}
