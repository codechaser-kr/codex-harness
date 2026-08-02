import { validateWorkflowDefinition } from "./validator.mjs";

const CANDIDATE_FIELDS = ["fact_id", "value", "evidence"];
const EVIDENCE_FIELDS = ["source_kind", "source_reference", "field_reference"];
const SOURCE_KINDS = new Set(["github_state", "local_state", "user_input", "skill_output"]);

export function escapePointerSegment(segment) {
  return String(segment).replaceAll("~", "~0").replaceAll("/", "~1");
}

export function pointer(path, segment) {
  return `${path}/${escapePointerSegment(segment)}`;
}

export function isPlainObject(value) {
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

function factValueType(value) {
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "string") return "string";
  return Number.isInteger(value) ? "integer" : undefined;
}

function validateDefinition(definition) {
  const validation = validateWorkflowDefinition(definition);
  const facts = validation.valid
    ? Object.entries(definition.facts).map(([factId, allowedValues]) => ({
      factId,
      allowedValues,
      valueType: factValueType(allowedValues[0]),
    }))
    : [];
  return { errors: validation.errors, facts };
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

  const factsById = new Map(facts.map((fact) => [fact.factId, fact]));
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
      if (factValueType(candidate.value) !== fact.valueType) {
        addError(errors, "candidate.value.type_mismatch", valuePath, `Value must match fact type ${fact.valueType}.`);
      } else if (!fact.allowedValues.some((allowedValue) => allowedValue === candidate.value)) {
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
        if (fact && candidate.evidence.length === 0) {
          addError(errors, "candidate.evidence.required", evidencePath, "At least one evidence item is required for every normalized fact.");
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
    const candidate = candidateValidation.candidatesByFact.get(fact.factId);
    if (!candidate) {
      continue;
    }
    normalizedFactState[fact.factId] = candidate.value;
    evidenceByFact[fact.factId] = candidate.evidence.map((item) => ({
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
