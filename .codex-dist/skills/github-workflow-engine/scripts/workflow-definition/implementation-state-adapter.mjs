import {
  isPlainObject,
  normalizeFactCandidates,
  pointer,
} from "./normalized-fact-adapter.mjs";

const OBSERVATION_FIELDS = ["fact_id", "value", "source_kind", "source_reference", "field_reference"];
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

function isNonEmptyString(value) {
  return typeof value === "string" && value.length > 0;
}

function addError(errors, code, path, message) {
  errors.push({ code, path, message });
}

function stopped(reason, workflowId, errors) {
  return {
    status: "stopped",
    reason,
    workflow_id: isNonEmptyString(workflowId) ? workflowId : null,
    normalized_fact_state: {},
    evidence_by_fact: {},
    errors,
  };
}

function validateSourceContracts(definition) {
  if (!Array.isArray(definition?.normalized_fact_schema)
    || definition.normalized_fact_schema.some((fact) => !isPlainObject(fact) || !isNonEmptyString(fact.fact_id))) {
    return [];
  }

  const errors = [];
  const definitionFactIds = new Set();
  for (let index = 0; index < definition.normalized_fact_schema.length; index += 1) {
    const factId = definition.normalized_fact_schema[index].fact_id;
    definitionFactIds.add(factId);
    if (!SOURCE_CONTRACTS.has(factId)) {
      addError(
        errors,
        "source_contract.missing",
        `/normalized_fact_schema/${index}/fact_id`,
        `Missing source contract for fact_id ${factId}.`,
      );
    }
  }

  for (const factId of [...SOURCE_CONTRACTS.keys()].sort()) {
    if (!definitionFactIds.has(factId)) {
      addError(
        errors,
        "source_contract.unexpected",
        pointer("/source_contracts", factId),
        `Unexpected source contract for fact_id ${factId}.`,
      );
    }
  }
  return errors;
}

function validateObservations(observations) {
  const errors = [];
  if (!Array.isArray(observations)) {
    addError(errors, "observations.type", "/observations", "observations must be an array.");
    return errors;
  }

  const allowedFields = new Set(OBSERVATION_FIELDS);
  for (let index = 0; index < observations.length; index += 1) {
    const observation = observations[index];
    const path = `/observations/${index}`;
    if (!isPlainObject(observation)) {
      addError(errors, "observation.type", path, "Expected a plain object.");
      continue;
    }
    for (const key of Object.keys(observation).sort()) {
      if (!allowedFields.has(key)) {
        addError(errors, "object.additional_property", pointer(path, key), `Unexpected property: ${key}.`);
      }
    }
    for (const field of OBSERVATION_FIELDS) {
      if (!Object.hasOwn(observation, field)) {
        addError(errors, "observation.required", pointer(path, field), `Missing required property: ${field}.`);
      }
    }
    for (const field of ["fact_id", "source_kind", "source_reference", "field_reference"]) {
      if (Object.hasOwn(observation, field) && !isNonEmptyString(observation[field])) {
        addError(errors, `observation.${field}.invalid`, pointer(path, field), `${field} must be a non-empty string.`);
      }
    }

    const sourceContract = SOURCE_CONTRACTS.get(observation.fact_id);
    if (!sourceContract) {
      continue;
    }
    if (isNonEmptyString(observation.source_kind) && observation.source_kind !== sourceContract.sourceKind) {
      addError(errors, "observation.source_kind.mismatch", pointer(path, "source_kind"), `${observation.fact_id} requires source_kind ${sourceContract.sourceKind}.`);
    }
    if (sourceContract.sourceReference
      && isNonEmptyString(observation.source_reference)
      && observation.source_reference !== sourceContract.sourceReference) {
      addError(errors, "observation.source_reference.mismatch", pointer(path, "source_reference"), `${observation.fact_id} requires source_reference ${sourceContract.sourceReference}.`);
    }
  }
  return errors;
}

/**
 * Normalizes implementation observations without external IO or input mutation.
 */
export function normalizeImplementationFacts(definition, observations) {
  if (definition?.workflow_id !== "implementation") {
    return stopped("workflow_id_mismatch", definition?.workflow_id, [{
      code: "workflow_id.mismatch",
      path: "/workflow_id",
      message: "Expected workflow_id implementation.",
    }]);
  }

  const sourceContractErrors = validateSourceContracts(definition);
  if (sourceContractErrors.length > 0) {
    return stopped("source_contract_mismatch", definition.workflow_id, sourceContractErrors);
  }

  const observationErrors = validateObservations(observations);
  if (observationErrors.length > 0) {
    return stopped("invalid_observations", definition.workflow_id, observationErrors);
  }

  const candidates = observations.map((observation) => ({
    fact_id: observation.fact_id,
    value: observation.value,
    evidence: [{
      source_kind: observation.source_kind,
      source_reference: observation.source_reference,
      field_reference: observation.field_reference,
    }],
  }));
  return normalizeFactCandidates(definition, candidates);
}
