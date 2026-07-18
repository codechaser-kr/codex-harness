import { normalizeFactCandidates } from "./normalized-fact-adapter.mjs";

const OBSERVATION_FIELDS = ["fact_id", "value", "source_kind", "source_reference", "field_reference"];
const SOURCE_CONTRACTS = new Map([
  ["policy_review_requested", { sourceKind: "user_input" }],
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

function escapePointerSegment(segment) {
  return String(segment).replaceAll("~", "~0").replaceAll("/", "~1");
}

function pointer(path, segment) {
  return `${path}/${escapePointerSegment(segment)}`;
}

function isPlainObject(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

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
      addError(
        errors,
        "observation.source_kind.mismatch",
        pointer(path, "source_kind"),
        `${observation.fact_id} requires source_kind ${sourceContract.sourceKind}.`,
      );
    }
    if (sourceContract.sourceReference
      && isNonEmptyString(observation.source_reference)
      && observation.source_reference !== sourceContract.sourceReference) {
      addError(
        errors,
        "observation.source_reference.mismatch",
        pointer(path, "source_reference"),
        `${observation.fact_id} requires source_reference ${sourceContract.sourceReference}.`,
      );
    }
  }
  return errors;
}

/**
 * Normalizes policy-review observations without external IO or input mutation.
 */
export function normalizePolicyReviewFacts(definition, observations) {
  if (definition?.workflow_id !== "policy-review") {
    return stopped("workflow_id_mismatch", definition?.workflow_id, [{
      code: "workflow_id.mismatch",
      path: "/workflow_id",
      message: "Expected workflow_id policy-review.",
    }]);
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
