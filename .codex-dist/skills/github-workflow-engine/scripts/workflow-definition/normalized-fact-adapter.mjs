const FACT_FIELDS = ["fact_id", "value_type", "allowed_values", "evidence_required"];
const CANDIDATE_FIELDS = ["fact_id", "value", "evidence"];
const EVIDENCE_FIELDS = ["source_kind", "source_reference", "field_reference"];
const FACT_TYPES = new Set(["boolean", "string", "integer"]);
const SOURCE_KINDS = new Set(["github_state", "local_state", "user_input", "skill_output"]);

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

function addError(errors, code, path, message) {
  errors.push({ code, path, message });
}

function validateClosedObject(value, path, fields, errors, context) {
  if (!isPlainObject(value)) {
    addError(errors, `${context}.type`, path, "Expected a plain object.");
    return false;
  }
  const allowedFields = new Set(fields);
  for (const key of Object.keys(value).sort()) {
    if (!allowedFields.has(key)) {
      addError(errors, "object.additional_property", pointer(path, key), `Unexpected property: ${key}.`);
    }
  }
  return true;
}

function validateRequired(value, path, fields, errors, context) {
  for (const field of fields) {
    if (!Object.hasOwn(value, field)) {
      addError(errors, `${context}.required`, pointer(path, field), `Missing required property: ${field}.`);
    }
  }
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.length > 0;
}

function valueMatchesType(value, valueType) {
  if (valueType === "boolean") {
    return typeof value === "boolean";
  }
  if (valueType === "string") {
    return typeof value === "string";
  }
  return valueType === "integer" && Number.isInteger(value);
}

function validateFactDefinition(value, path, errors) {
  if (!validateClosedObject(value, path, FACT_FIELDS, errors, "fact")) {
    return undefined;
  }
  validateRequired(value, path, FACT_FIELDS, errors, "fact");

  const factIdValid = Object.hasOwn(value, "fact_id") && isNonEmptyString(value.fact_id);
  if (Object.hasOwn(value, "fact_id") && !factIdValid) {
    addError(errors, "fact_id.invalid", pointer(path, "fact_id"), "Expected a non-empty string.");
  }

  const valueTypeValid = Object.hasOwn(value, "value_type") && FACT_TYPES.has(value.value_type);
  if (Object.hasOwn(value, "value_type") && !valueTypeValid) {
    addError(errors, "fact.value_type.invalid", pointer(path, "value_type"), "value_type must be boolean, string, or integer.");
  }

  let allowedValuesValid = false;
  if (Object.hasOwn(value, "allowed_values")) {
    const valuesPath = pointer(path, "allowed_values");
    if (!Array.isArray(value.allowed_values)) {
      addError(errors, "fact.allowed_values.type", valuesPath, "allowed_values must be an array.");
    } else {
      allowedValuesValid = value.allowed_values.length > 0;
      if (!allowedValuesValid) {
        addError(errors, "fact.allowed_values.empty", valuesPath, "allowed_values must not be empty.");
      }
      if (valueTypeValid) {
        for (let index = 0; index < value.allowed_values.length; index += 1) {
          if (!valueMatchesType(value.allowed_values[index], value.value_type)) {
            allowedValuesValid = false;
            addError(errors, "fact.allowed_values.type_mismatch", pointer(valuesPath, index), "allowed_values must match value_type.");
          }
        }
      }
    }
  }

  const evidenceRequiredValid = Object.hasOwn(value, "evidence_required") && typeof value.evidence_required === "boolean";
  if (Object.hasOwn(value, "evidence_required") && !evidenceRequiredValid) {
    addError(errors, "fact.evidence_required.type", pointer(path, "evidence_required"), "evidence_required must be boolean.");
  }

  if (!factIdValid || !valueTypeValid || !allowedValuesValid || !evidenceRequiredValid) {
    return undefined;
  }
  return value;
}

function validateDefinition(definition) {
  const errors = [];
  if (!isPlainObject(definition)) {
    addError(errors, "workflow.type", "", "Expected a plain object.");
    return { errors, facts: [] };
  }

  if (!Object.hasOwn(definition, "workflow_id")) {
    addError(errors, "workflow.required", "/workflow_id", "Missing required property: workflow_id.");
  } else if (!isNonEmptyString(definition.workflow_id)) {
    addError(errors, "workflow_id.invalid", "/workflow_id", "Expected a non-empty string.");
  }

  const facts = [];
  if (!Object.hasOwn(definition, "normalized_fact_schema")) {
    addError(errors, "workflow.required", "/normalized_fact_schema", "Missing required property: normalized_fact_schema.");
  } else if (!Array.isArray(definition.normalized_fact_schema)) {
    addError(errors, "normalized_fact_schema.type", "/normalized_fact_schema", "normalized_fact_schema must be an array.");
  } else {
    if (definition.normalized_fact_schema.length === 0) {
      addError(errors, "normalized_fact_schema.empty", "/normalized_fact_schema", "normalized_fact_schema must not be empty.");
    }
    const factIds = new Set();
    for (let index = 0; index < definition.normalized_fact_schema.length; index += 1) {
      const path = `/normalized_fact_schema/${index}`;
      const fact = validateFactDefinition(definition.normalized_fact_schema[index], path, errors);
      if (!fact) {
        continue;
      }
      if (factIds.has(fact.fact_id)) {
        addError(errors, "fact_id.duplicate", `${path}/fact_id`, `Duplicate fact_id: ${fact.fact_id}.`);
      } else {
        factIds.add(fact.fact_id);
        facts.push(fact);
      }
    }
  }

  return { errors, facts };
}

function validateEvidence(value, path, errors) {
  if (!validateClosedObject(value, path, EVIDENCE_FIELDS, errors, "evidence")) {
    return;
  }
  validateRequired(value, path, EVIDENCE_FIELDS, errors, "evidence");

  if (Object.hasOwn(value, "source_kind") && !SOURCE_KINDS.has(value.source_kind)) {
    addError(errors, "evidence.source_kind.invalid", pointer(path, "source_kind"), "source_kind is not supported.");
  }
  for (const field of ["source_reference", "field_reference"]) {
    if (Object.hasOwn(value, field) && !isNonEmptyString(value[field])) {
      addError(errors, `evidence.${field}.invalid`, pointer(path, field), `${field} must be a non-empty string.`);
    }
  }
}

function validateCandidates(candidates, facts) {
  const errors = [];
  const candidatesByFact = new Map();
  if (!Array.isArray(candidates)) {
    addError(errors, "candidates.type", "/candidates", "candidates must be an array.");
    return { errors, candidatesByFact };
  }

  const factsById = new Map(facts.map((fact) => [fact.fact_id, fact]));
  const seenFactIds = new Set();
  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    const path = `/candidates/${index}`;
    if (!validateClosedObject(candidate, path, CANDIDATE_FIELDS, errors, "candidate")) {
      continue;
    }
    validateRequired(candidate, path, CANDIDATE_FIELDS, errors, "candidate");

    let fact;
    if (Object.hasOwn(candidate, "fact_id")) {
      const factIdPath = pointer(path, "fact_id");
      if (!isNonEmptyString(candidate.fact_id)) {
        addError(errors, "candidate.fact_id.invalid", factIdPath, "fact_id must be a non-empty string.");
      } else {
        fact = factsById.get(candidate.fact_id);
        if (!fact) {
          addError(errors, "candidate.fact.unknown", factIdPath, `Unknown fact_id: ${candidate.fact_id}.`);
        }
        if (seenFactIds.has(candidate.fact_id)) {
          addError(errors, "candidate.fact_id.duplicate", factIdPath, `Duplicate fact candidate: ${candidate.fact_id}.`);
        } else {
          seenFactIds.add(candidate.fact_id);
          candidatesByFact.set(candidate.fact_id, candidate);
        }
      }
    }

    if (fact && Object.hasOwn(candidate, "value")) {
      const valuePath = pointer(path, "value");
      if (!valueMatchesType(candidate.value, fact.value_type)) {
        addError(errors, "candidate.value.type_mismatch", valuePath, `Value must match fact type ${fact.value_type}.`);
      } else if (!fact.allowed_values.some((allowedValue) => allowedValue === candidate.value)) {
        addError(errors, "candidate.value.not_allowed", valuePath, "Value is not in the fact allowed_values domain.");
      }
    }

    if (Object.hasOwn(candidate, "evidence")) {
      const evidencePath = pointer(path, "evidence");
      if (!Array.isArray(candidate.evidence)) {
        addError(errors, "candidate.evidence.type", evidencePath, "evidence must be an array.");
      } else {
        for (let evidenceIndex = 0; evidenceIndex < candidate.evidence.length; evidenceIndex += 1) {
          validateEvidence(candidate.evidence[evidenceIndex], pointer(evidencePath, evidenceIndex), errors);
        }
        if (fact?.evidence_required && candidate.evidence.length === 0) {
          addError(errors, "candidate.evidence.required", evidencePath, "At least one evidence item is required for this fact.");
        }
      }
    }
  }

  return { errors, candidatesByFact };
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

/**
 * Normalizes already collected fact candidates without external IO or mutation.
 */
export function normalizeFactCandidates(definition, candidates) {
  const definitionValidation = validateDefinition(definition);
  if (definitionValidation.errors.length > 0) {
    return stopped("invalid_definition", definition?.workflow_id, definitionValidation.errors);
  }

  const candidateValidation = validateCandidates(candidates, definitionValidation.facts);
  if (candidateValidation.errors.length > 0) {
    return stopped("invalid_fact_candidates", definition.workflow_id, candidateValidation.errors);
  }

  const normalizedFactState = {};
  const evidenceByFact = {};
  for (const fact of definitionValidation.facts) {
    const candidate = candidateValidation.candidatesByFact.get(fact.fact_id);
    if (!candidate) {
      continue;
    }
    normalizedFactState[fact.fact_id] = candidate.value;
    evidenceByFact[fact.fact_id] = candidate.evidence.map((item) => ({
      source_kind: item.source_kind,
      source_reference: item.source_reference,
      field_reference: item.field_reference,
    }));
  }

  return {
    status: "normalized",
    workflow_id: definition.workflow_id,
    normalized_fact_state: normalizedFactState,
    evidence_by_fact: evidenceByFact,
    errors: [],
  };
}
