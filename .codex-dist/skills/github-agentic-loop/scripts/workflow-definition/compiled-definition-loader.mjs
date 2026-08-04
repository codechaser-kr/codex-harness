import {
  COMPILED_WORKFLOW_DEFINITION_ARTIFACT_TYPE,
  compileWorkflowDefinition,
  computeCompiledWorkflowDefinitionDigest,
  computeWorkflowDefinitionSourceDigest,
  deepFreeze,
  isTrustedCompiledWorkflowDefinition,
  markTrustedCompiledWorkflowDefinition,
  WORKFLOW_DEFINITION_COMPILER_FORMAT_VERSION,
} from "./compiler.mjs";
import { WORKFLOW_DEFINITION_VALIDATOR_VERSION } from "./validator.mjs";

const COMPILED_FIELDS = [
  "artifact_type",
  "compiler_format_version",
  "validator_version",
  "source_digest",
  "compiled_digest",
  "source_definition",
  "fact_metadata",
  "transition_lookup",
];
const DIGEST = /^sha256:[0-9a-f]{64}$/;

function isPlainObject(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function addError(errors, code, path, message) {
  errors.push({ code, path, message });
}

function pointer(path, segment) {
  return `${path}/${String(segment).replaceAll("~", "~0").replaceAll("/", "~1")}`;
}

function validateClosedObject(value, path, fields, errors, context) {
  if (!isPlainObject(value)) return;
  const allowedFields = new Set(fields);
  for (const key of Object.keys(value).sort()) {
    if (!allowedFields.has(key)) {
      addError(errors, `${context}.additional_property`, `${path}/${key}`, `Unexpected ${context} property: ${key}.`);
    }
  }
  for (const field of fields) {
    if (!Object.hasOwn(value, field)) {
      addError(errors, `${context}.required`, `${path}/${field}`, `Missing ${context} property: ${field}.`);
    }
  }
}

function validateShape(value) {
  const errors = [];
  if (!isPlainObject(value)) {
    addError(errors, "compiled.type", "", "Compiled Workflow Definition must be a plain object.");
    return errors;
  }

  const allowedFields = new Set(COMPILED_FIELDS);
  for (const key of Object.keys(value).sort()) {
    if (!allowedFields.has(key)) {
      addError(errors, "compiled.additional_property", `/${key}`, `Unexpected compiled property: ${key}.`);
    }
  }
  for (const field of COMPILED_FIELDS) {
    if (!Object.hasOwn(value, field)) {
      addError(errors, "compiled.required", `/${field}`, `Missing compiled property: ${field}.`);
    }
  }
  if (errors.length > 0) return errors;

  for (const field of ["artifact_type", "compiler_format_version", "validator_version"]) {
    if (typeof value[field] !== "string" || value[field].length === 0) {
      addError(errors, `compiled.${field}.invalid`, `/${field}`, `${field} must be a non-empty string.`);
    }
  }
  for (const field of ["source_digest", "compiled_digest"]) {
    if (typeof value[field] !== "string" || !DIGEST.test(value[field])) {
      addError(errors, `compiled.${field}.invalid`, `/${field}`, `${field} must be a sha256 digest.`);
    }
  }
  for (const field of ["source_definition", "fact_metadata", "transition_lookup"]) {
    if (!isPlainObject(value[field])) {
      addError(errors, `compiled.${field}.type`, `/${field}`, `${field} must be a plain object.`);
    }
  }
  if (isPlainObject(value.fact_metadata)) {
    validateClosedObject(value.fact_metadata, "/fact_metadata", ["order", "by_id"], errors, "compiled.fact_metadata");
    if (!Array.isArray(value.fact_metadata.order)) {
      addError(errors, "compiled.fact_metadata.order.type", "/fact_metadata/order", "fact metadata order must be an array.");
    }
    if (!isPlainObject(value.fact_metadata.by_id)) {
      addError(errors, "compiled.fact_metadata.by_id.type", "/fact_metadata/by_id", "fact metadata by_id must be a plain object.");
    } else {
      for (const [factId, metadata] of Object.entries(value.fact_metadata.by_id)) {
        const path = pointer("/fact_metadata/by_id", factId);
        if (!isPlainObject(metadata)) {
          addError(errors, "compiled.fact_metadata.entry.type", path, "fact metadata entry must be a plain object.");
          continue;
        }
        validateClosedObject(metadata, path, ["value_type", "allowed_values"], errors, "compiled.fact_metadata.entry");
        if (!new Set(["boolean", "string", "integer"]).has(metadata.value_type)) {
          addError(errors, "compiled.fact_metadata.value_type.invalid", `${path}/value_type`, "fact metadata value_type is not supported.");
        }
        if (!Array.isArray(metadata.allowed_values) || metadata.allowed_values.length === 0) {
          addError(errors, "compiled.fact_metadata.allowed_values.invalid", `${path}/allowed_values`, "fact metadata allowed_values must be a non-empty array.");
        }
      }
    }
  }
  if (isPlainObject(value.transition_lookup)) {
    validateClosedObject(value.transition_lookup, "/transition_lookup", ["order", "by_task_action_id"], errors, "compiled.transition_lookup");
    if (!Array.isArray(value.transition_lookup.order)) {
      addError(errors, "compiled.transition_lookup.order.type", "/transition_lookup/order", "transition lookup order must be an array.");
    }
    if (!isPlainObject(value.transition_lookup.by_task_action_id)) {
      addError(errors, "compiled.transition_lookup.by_task_action_id.type", "/transition_lookup/by_task_action_id", "transition lookup by_task_action_id must be a plain object.");
    }
  }
  return errors;
}

function stopped(errors) {
  return {
    status: "stopped",
    reason: "invalid_compiled_definition",
    preparation: null,
    compiled_definition: null,
    errors,
  };
}

function validateCompatibility(definition, compiledDefinition) {
  const errors = validateShape(compiledDefinition);
  if (errors.length > 0) return errors;

  if (!isPlainObject(definition)) {
    addError(errors, "compiled.requested_source.type", "/source_definition", "Requested Workflow Definition must be a plain object.");
    return errors;
  }

  if (compiledDefinition.artifact_type !== COMPILED_WORKFLOW_DEFINITION_ARTIFACT_TYPE) {
    addError(errors, "compiled.artifact_type.mismatch", "/artifact_type", "Compiled artifact type is not supported.");
  }
  if (compiledDefinition.compiler_format_version !== WORKFLOW_DEFINITION_COMPILER_FORMAT_VERSION) {
    addError(errors, "compiled.compiler_format_version.mismatch", "/compiler_format_version", "Compiled format version does not match the current compiler.");
  }
  if (compiledDefinition.validator_version !== WORKFLOW_DEFINITION_VALIDATOR_VERSION) {
    addError(errors, "compiled.validator_version.mismatch", "/validator_version", "Compiled validator version does not match the current validator.");
  }

  const sourceDigest = computeWorkflowDefinitionSourceDigest(definition);
  if (compiledDefinition.source_digest !== sourceDigest) {
    addError(errors, "compiled.source_digest.mismatch", "/source_digest", "Compiled source digest does not match the requested Workflow Definition.");
  }
  const embeddedSourceDigest = computeWorkflowDefinitionSourceDigest(compiledDefinition.source_definition);
  if (compiledDefinition.source_digest !== embeddedSourceDigest) {
    addError(errors, "compiled.embedded_source_digest.mismatch", "/source_definition", "Compiled source definition does not match its source digest.");
  }
  const compiledDigest = computeCompiledWorkflowDefinitionDigest(compiledDefinition);
  if (compiledDefinition.compiled_digest !== compiledDigest) {
    addError(errors, "compiled.compiled_digest.mismatch", "/compiled_digest", "Compiled representation digest does not match its contents.");
  }
  return errors;
}

/**
 * Reuses a compatible compiled Definition or compiles the raw source when no candidate exists.
 * An explicitly supplied but incompatible candidate fails closed instead of silently recompiling.
 */
export function loadCompiledWorkflowDefinition(definition, { compiledDefinition } = {}) {
  if (compiledDefinition === undefined) {
    const result = compileWorkflowDefinition(definition);
    if (result.status === "stopped") {
      return { ...result, preparation: null };
    }
    return {
      status: "loaded",
      preparation: "compiled",
      compiled_definition: result.compiled_definition,
      errors: [],
    };
  }

  if (isTrustedCompiledWorkflowDefinition(compiledDefinition)
    && definition === compiledDefinition.source_definition) {
    return {
      status: "loaded",
      preparation: "reused",
      compiled_definition: compiledDefinition,
      errors: [],
    };
  }

  const errors = validateCompatibility(definition, compiledDefinition);
  if (errors.length === 0) {
    const expected = compileWorkflowDefinition(definition);
    if (expected.status === "stopped") {
      errors.push(...expected.errors);
    } else if (expected.compiled_definition.compiled_digest !== compiledDefinition.compiled_digest) {
      addError(
        errors,
        "compiled.representation.mismatch",
        "/compiled_digest",
        "Compiled representation does not match the deterministic representation of its source.",
      );
    }
  }
  if (errors.length > 0) {
    return stopped(errors);
  }
  const reusedCompiledDefinition = deepFreeze(cloneJson(compiledDefinition));
  markTrustedCompiledWorkflowDefinition(reusedCompiledDefinition);
  return {
    status: "loaded",
    preparation: "reused",
    compiled_definition: reusedCompiledDefinition,
    errors: [],
  };
}
