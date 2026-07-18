import { normalizeFactCandidates } from "./normalized-fact-adapter.mjs";

const OBSERVATION_FIELDS = ["fact_id", "value", "source_kind", "source_reference", "field_reference"];
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

function escapePointerSegment(segment) {
  return String(segment).replaceAll("~", "~0").replaceAll("/", "~1");
}

function pointer(path, segment) {
  return path + "/" + escapePointerSegment(segment);
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
        "/normalized_fact_schema/" + index + "/fact_id",
        "Missing source contract for fact_id " + factId + ".",
      );
    }
  }

  for (const factId of [...SOURCE_CONTRACTS.keys()].sort()) {
    if (!definitionFactIds.has(factId)) {
      addError(
        errors,
        "source_contract.unexpected",
        pointer("/source_contracts", factId),
        "Unexpected source contract for fact_id " + factId + ".",
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
    const path = "/observations/" + index;
    if (!isPlainObject(observation)) {
      addError(errors, "observation.type", path, "Expected a plain object.");
      continue;
    }

    for (const key of Object.keys(observation).sort()) {
      if (!allowedFields.has(key)) {
        addError(errors, "object.additional_property", pointer(path, key), "Unexpected property: " + key + ".");
      }
    }
    for (const field of OBSERVATION_FIELDS) {
      if (!Object.hasOwn(observation, field)) {
        addError(errors, "observation.required", pointer(path, field), "Missing required property: " + field + ".");
      }
    }

    for (const field of ["fact_id", "source_kind", "source_reference", "field_reference"]) {
      if (Object.hasOwn(observation, field) && !isNonEmptyString(observation[field])) {
        addError(errors, "observation." + field + ".invalid", pointer(path, field), field + " must be a non-empty string.");
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
        observation.fact_id + " requires source_kind " + sourceContract.sourceKind + ".",
      );
    }
    if (sourceContract.sourceReference
      && isNonEmptyString(observation.source_reference)
      && observation.source_reference !== sourceContract.sourceReference) {
      addError(
        errors,
        "observation.source_reference.mismatch",
        pointer(path, "source_reference"),
        observation.fact_id + " requires source_reference " + sourceContract.sourceReference + ".",
      );
    }
  }
  return errors;
}

/**
 * Normalizes feature-fix observations without external IO or input mutation.
 */
export function normalizeFeatureFixFacts(definition, observations) {
  if (definition?.workflow_id !== "feature-fix") {
    return stopped("workflow_id_mismatch", definition?.workflow_id, [{
      code: "workflow_id.mismatch",
      path: "/workflow_id",
      message: "Expected workflow_id feature-fix.",
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
