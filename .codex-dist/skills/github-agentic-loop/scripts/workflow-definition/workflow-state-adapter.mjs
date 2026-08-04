import {
  isPlainObject,
  normalizePreparedFactCandidates,
  pointer,
} from "./normalized-fact-adapter.mjs";
import {
  isCompiledDefinitionCandidate,
  prepareWorkflowDefinition,
} from "./runtime-definition.mjs";

const OBSERVATION_FIELDS = ["fact_id", "value", "source_kind", "source_reference", "field_reference"];

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

function validateSourceContracts(definition, sourceContracts) {
  if (!isPlainObject(definition?.facts)) {
    return [];
  }

  const errors = [];
  const definitionFactIds = new Set();
  for (const factId of Object.keys(definition.facts)) {
    definitionFactIds.add(factId);
    if (!sourceContracts.has(factId)) {
      addError(
        errors,
        "source_contract.missing",
        pointer("/facts", factId),
        `Missing source contract for fact_id ${factId}.`,
      );
    }
  }

  for (const factId of [...sourceContracts.keys()].sort()) {
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

function validateObservations(observations, sourceContracts) {
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

    const sourceContract = sourceContracts.get(observation.fact_id);
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

export function normalizeWorkflowObservations(definition, observations, { workflowId, sourceContracts }) {
  let prepared;
  let sourceDefinition = definition;
  if (isCompiledDefinitionCandidate(definition)) {
    prepared = prepareWorkflowDefinition(definition);
    if (prepared.status === "stopped") {
      return stopped(
        prepared.reason,
        definition?.source_definition?.workflow_id,
        prepared.errors,
      );
    }
    sourceDefinition = prepared.source_definition;
  }

  if (sourceDefinition?.workflow_id !== workflowId) {
    return stopped("workflow_id_mismatch", sourceDefinition?.workflow_id, [{
      code: "workflow_id.mismatch",
      path: "/workflow_id",
      message: `Expected workflow_id ${workflowId}.`,
    }]);
  }

  const sourceContractErrors = validateSourceContracts(sourceDefinition, sourceContracts);
  if (sourceContractErrors.length > 0) {
    return stopped("source_contract_mismatch", sourceDefinition.workflow_id, sourceContractErrors);
  }

  if (prepared === undefined) {
    prepared = prepareWorkflowDefinition(sourceDefinition);
    if (prepared.status === "stopped") {
      return stopped(prepared.reason, sourceDefinition.workflow_id, prepared.errors);
    }
  }

  const observationErrors = validateObservations(observations, sourceContracts);
  if (observationErrors.length > 0) {
    return stopped("invalid_observations", sourceDefinition.workflow_id, observationErrors);
  }

  return normalizePreparedFactCandidates(prepared, observations.map((observation) => ({
    fact_id: observation.fact_id,
    value: observation.value,
    evidence: [{
      source_kind: observation.source_kind,
      source_reference: observation.source_reference,
      field_reference: observation.field_reference,
    }],
  })));
}
