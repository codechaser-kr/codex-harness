const EXPECTED_SESSION_COUNT = 10;

const REQUEST_FIELDS = [
  "request_id",
  "workflow_id",
  "version",
  "task_action_id",
  "state_snapshot",
  "normalized_fact_state",
  "evaluation_result",
  "expected_session_count",
  "invocation_specification",
];
const STATE_SNAPSHOT_FIELDS = ["github_state", "local_state"];
const EVALUATION_RESULT_FIELDS = [
  "status",
  "transition_id",
  "task_action_id",
  "user_decision_specification",
  "registered_executor_reference",
  "completion_predicate",
];
const INVOCATION_FIELDS = [
  "skill_reference",
  "skill_version",
  "model_identifier",
  "reasoning_configuration",
  "role_configuration",
  "input",
];
const SESSION_RESULT_FIELDS = [
  "request_id",
  "session_index",
  "session_id",
  "observed_invocation_specification",
  "output_status",
  "normalized_structured_contract_fields",
  "semantic_decisions",
  "registered_executor_invoked",
  "side_effects",
];
const SIDE_EFFECT_FIELDS = [
  "github_state_changes",
  "github_comments",
  "repository_files",
  "branches",
  "commits",
  "pull_requests",
];

function pointer(path, segment) {
  return `${path}/${String(segment).replaceAll("~", "~0").replaceAll("/", "~1")}`;
}

function addError(errors, code, path, message) {
  errors.push({ code, path, message });
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

function validateClosedObject(value, path, fields, errors, context) {
  if (!isPlainObject(value)) {
    addError(errors, `${context}.type`, path, "Expected a plain object.");
    return false;
  }
  const allowed = new Set(fields);
  for (const key of Object.keys(value).sort()) {
    if (!allowed.has(key)) {
      addError(errors, "object.additional_property", pointer(path, key), `Unexpected property: ${key}.`);
    }
  }
  for (const field of fields) {
    if (!Object.hasOwn(value, field)) {
      addError(errors, `${context}.required`, pointer(path, field), `Missing required property: ${field}.`);
    }
  }
  return true;
}

function validateJsonCompatible(value, path, errors, ancestors = new WeakSet()) {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      addError(errors, "json_value.number.non_finite", path, "JSON numbers must be finite.");
    }
    return;
  }
  if (typeof value !== "object") {
    addError(errors, "json_value.invalid", path, "Expected a JSON-compatible value.");
    return;
  }
  if (ancestors.has(value)) {
    addError(errors, "json_value.cycle", path, "JSON-compatible values must not contain cycles.");
    return;
  }
  ancestors.add(value);
  if (Array.isArray(value)) {
    for (const key of Object.keys(value).sort()) {
      if (!/^(0|[1-9][0-9]*)$/.test(key) || Number(key) >= value.length) {
        addError(errors, "json_value.array.additional_property", pointer(path, key), "Arrays must not have additional properties.");
      }
    }
    for (let index = 0; index < value.length; index += 1) {
      if (!Object.hasOwn(value, index)) {
        addError(errors, "json_value.array.hole", pointer(path, index), "Arrays must not contain holes.");
      } else {
        validateJsonCompatible(value[index], pointer(path, index), errors, ancestors);
      }
    }
  } else if (!isPlainObject(value)) {
    addError(errors, "json_value.object.type", path, "JSON objects must be plain objects.");
  } else {
    if (Object.getOwnPropertySymbols(value).length > 0) {
      addError(errors, "json_value.symbol_property", path, "JSON objects must not have symbol properties.");
    }
    for (const key of Object.keys(value).sort()) {
      validateJsonCompatible(value[key], pointer(path, key), errors, ancestors);
    }
  }
  ancestors.delete(value);
}

function validateJsonPlainObject(value, path, errors, code) {
  if (!isPlainObject(value)) {
    addError(errors, code, path, "Expected a plain object.");
    return;
  }
  validateJsonCompatible(value, path, errors);
}

function validateInvocationSpecification(value, path, errors) {
  if (!validateClosedObject(value, path, INVOCATION_FIELDS, errors, "invocation_specification")) {
    return;
  }
  for (const field of ["skill_reference", "skill_version", "model_identifier"]) {
    if (Object.hasOwn(value, field) && !isNonEmptyString(value[field])) {
      addError(errors, "invocation_specification.string.invalid", pointer(path, field), "Expected a non-empty string.");
    }
  }
  for (const field of ["reasoning_configuration", "role_configuration", "input"]) {
    if (Object.hasOwn(value, field)) {
      validateJsonCompatible(value[field], pointer(path, field), errors);
    }
  }
}

function validateStateSnapshot(value, path, errors) {
  if (!validateClosedObject(value, path, STATE_SNAPSHOT_FIELDS, errors, "state_snapshot")) {
    return;
  }
  for (const field of STATE_SNAPSHOT_FIELDS) {
    if (Object.hasOwn(value, field)) {
      validateJsonPlainObject(value[field], pointer(path, field), errors, `state_snapshot.${field}.type`);
    }
  }
}

function validateEvaluationResult(value, path, request, errors) {
  if (!validateClosedObject(value, path, EVALUATION_RESULT_FIELDS, errors, "evaluation_result")) {
    return;
  }
  if (Object.hasOwn(value, "status") && value.status !== "action_required") {
    addError(errors, "evaluation_result.status.invalid", pointer(path, "status"), "evaluation_result status must be action_required.");
  }
  if (Object.hasOwn(value, "transition_id") && !isNonEmptyString(value.transition_id)) {
    addError(errors, "evaluation_result.transition_id.invalid", pointer(path, "transition_id"), "Expected a non-empty string.");
  }
  if (Object.hasOwn(value, "task_action_id")) {
    if (!isNonEmptyString(value.task_action_id)) {
      addError(errors, "evaluation_result.task_action_id.invalid", pointer(path, "task_action_id"), "Expected a non-empty string.");
    } else if (value.task_action_id !== request.task_action_id) {
      addError(errors, "evaluation_result.task_action_id.mismatch", pointer(path, "task_action_id"), "evaluation_result task_action_id must match the request.");
    }
  }
  if (Object.hasOwn(value, "registered_executor_reference")) {
    if (!isNonEmptyString(value.registered_executor_reference)) {
      addError(errors, "evaluation_result.registered_executor_reference.invalid", pointer(path, "registered_executor_reference"), "Expected a non-empty string.");
    } else if (value.registered_executor_reference !== request.invocation_specification?.skill_reference) {
      addError(errors, "evaluation_result.registered_executor_reference.mismatch", pointer(path, "registered_executor_reference"), "evaluation_result registered_executor_reference must match invocation skill_reference.");
    }
  }
  for (const field of ["user_decision_specification", "completion_predicate"]) {
    if (Object.hasOwn(value, field)) {
      validateJsonPlainObject(value[field], pointer(path, field), errors, `evaluation_result.${field}.type`);
    }
  }
}

function validateRequestInto(request, path, errors) {
  if (!validateClosedObject(request, path, REQUEST_FIELDS, errors, "validation_request")) {
    return;
  }
  for (const field of ["request_id", "workflow_id", "version", "task_action_id"]) {
    if (Object.hasOwn(request, field) && !isNonEmptyString(request[field])) {
      addError(errors, `${field}.invalid`, pointer(path, field), "Expected a non-empty string.");
    }
  }
  if (Object.hasOwn(request, "state_snapshot")) {
    validateStateSnapshot(request.state_snapshot, pointer(path, "state_snapshot"), errors);
  }
  if (Object.hasOwn(request, "normalized_fact_state")) {
    validateJsonPlainObject(request.normalized_fact_state, pointer(path, "normalized_fact_state"), errors, "normalized_fact_state.type");
  }
  if (Object.hasOwn(request, "evaluation_result")) {
    validateEvaluationResult(request.evaluation_result, pointer(path, "evaluation_result"), request, errors);
  }
  if (Object.hasOwn(request, "expected_session_count") && request.expected_session_count !== EXPECTED_SESSION_COUNT) {
    addError(errors, "expected_session_count.invalid", pointer(path, "expected_session_count"), "expected_session_count must be exactly 10.");
  }
  if (Object.hasOwn(request, "invocation_specification")) {
    validateInvocationSpecification(request.invocation_specification, pointer(path, "invocation_specification"), errors);
  }
}

function validateSideEffects(value, path, errors) {
  if (!validateClosedObject(value, path, SIDE_EFFECT_FIELDS, errors, "side_effects")) {
    return;
  }
  for (const field of SIDE_EFFECT_FIELDS) {
    if (!Object.hasOwn(value, field)) {
      continue;
    }
    const fieldPath = pointer(path, field);
    if (!Array.isArray(value[field])) {
      addError(errors, "side_effects.category.type", fieldPath, "Expected an array.");
      continue;
    }
    validateJsonCompatible(value[field], fieldPath, errors);
  }
}

function validateSessionResultInto(result, path, errors) {
  if (!validateClosedObject(result, path, SESSION_RESULT_FIELDS, errors, "session_result")) {
    return;
  }
  for (const field of ["request_id", "session_id"]) {
    if (Object.hasOwn(result, field) && !isNonEmptyString(result[field])) {
      addError(errors, `session_result.${field}.invalid`, pointer(path, field), "Expected a non-empty string.");
    }
  }
  if (Object.hasOwn(result, "session_index") && (!Number.isInteger(result.session_index) || result.session_index < 1 || result.session_index > EXPECTED_SESSION_COUNT)) {
    addError(errors, "session_result.session_index.invalid", pointer(path, "session_index"), "session_index must be an integer from 1 to 10.");
  }
  if (Object.hasOwn(result, "observed_invocation_specification")) {
    validateInvocationSpecification(result.observed_invocation_specification, pointer(path, "observed_invocation_specification"), errors);
  }
  if (Object.hasOwn(result, "output_status") && !["usable", "blocked"].includes(result.output_status)) {
    addError(errors, "session_result.output_status.invalid", pointer(path, "output_status"), "output_status must be usable or blocked.");
  }
  for (const field of ["normalized_structured_contract_fields", "semantic_decisions"]) {
    if (Object.hasOwn(result, field)) {
      validateJsonPlainObject(result[field], pointer(path, field), errors, `session_result.${field}.type`);
    }
  }
  if (Object.hasOwn(result, "registered_executor_invoked") && typeof result.registered_executor_invoked !== "boolean") {
    addError(errors, "session_result.registered_executor_invoked.type", pointer(path, "registered_executor_invoked"), "Expected a boolean.");
  }
  if (Object.hasOwn(result, "side_effects")) {
    validateSideEffects(result.side_effects, pointer(path, "side_effects"), errors);
  }
}

function semanticEqual(left, right) {
  if (left === right) {
    return true;
  }
  if (left === null || right === null || typeof left !== "object" || typeof right !== "object") {
    return false;
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
      return false;
    }
    return left.every((item, index) => semanticEqual(item, right[index]));
  }
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  if (leftKeys.length !== rightKeys.length || leftKeys.some((key, index) => key !== rightKeys[index])) {
    return false;
  }
  return leftKeys.every((key) => semanticEqual(left[key], right[key]));
}

function requestIdFrom(request) {
  return isPlainObject(request) && isNonEmptyString(request.request_id) ? request.request_id : null;
}

function resultPath(entry) {
  if (isPlainObject(entry.value) && Number.isInteger(entry.value.session_index)) {
    return `/session_results/${entry.value.session_index}`;
  }
  return `/session_results/input-${entry.inputIndex}`;
}

function compareEntries(left, right) {
  const leftIndex = isPlainObject(left.value) && Number.isInteger(left.value.session_index) ? left.value.session_index : Number.POSITIVE_INFINITY;
  const rightIndex = isPlainObject(right.value) && Number.isInteger(right.value.session_index) ? right.value.session_index : Number.POSITIVE_INFINITY;
  if (leftIndex !== rightIndex) {
    return leftIndex - rightIndex;
  }
  const leftId = isPlainObject(left.value) && typeof left.value.session_id === "string" ? left.value.session_id : "";
  const rightId = isPlainObject(right.value) && typeof right.value.session_id === "string" ? right.value.session_id : "";
  return leftId.localeCompare(rightId) || left.inputIndex - right.inputIndex;
}

function stopped(requestId, reason, sessionCount, errors) {
  return { request_id: requestId, status: "stopped", reason, session_count: sessionCount, errors };
}

export function validateValidationRequest(request) {
  try {
    const errors = [];
    validateRequestInto(request, "", errors);
    return { valid: errors.length === 0, errors };
  } catch {
    return { valid: false, errors: [{ code: "validation_mode.internal", path: "", message: "Validation request could not be inspected." }] };
  }
}

export function validateValidationSessionResult(result) {
  try {
    const errors = [];
    validateSessionResultInto(result, "", errors);
    return { valid: errors.length === 0, errors };
  } catch {
    return { valid: false, errors: [{ code: "validation_mode.internal", path: "", message: "Session result could not be inspected." }] };
  }
}

export function compareValidationResults(request, results) {
  try {
    const requestId = requestIdFrom(request);
    const requestValidation = validateValidationRequest(request);
    if (!requestValidation.valid) {
      return stopped(requestId, "invalid_request", Array.isArray(results) ? results.length : 0, requestValidation.errors);
    }
    if (!Array.isArray(results)) {
      return stopped(request.request_id, "invalid_results", 0, [{ code: "session_results.type", path: "/session_results", message: "Expected an array of session results." }]);
    }

    const errors = [];
    if (results.length !== EXPECTED_SESSION_COUNT) {
      addError(errors, "session_results.count.invalid", "/session_results", "Exactly 10 session results are required.");
    }
    const entries = results.map((value, inputIndex) => ({ value, inputIndex })).sort(compareEntries);
    const indices = new Map();
    const sessionIds = new Map();

    for (const entry of entries) {
      const path = resultPath(entry);
      validateSessionResultInto(entry.value, path, errors);
      if (!isPlainObject(entry.value)) {
        continue;
      }
      const result = entry.value;
      if (Number.isInteger(result.session_index) && result.session_index >= 1 && result.session_index <= EXPECTED_SESSION_COUNT) {
        if (indices.has(result.session_index)) {
          addError(errors, "session_index.duplicate", pointer(path, "session_index"), `Duplicate session_index: ${result.session_index}.`);
        } else {
          indices.set(result.session_index, result);
        }
      }
      if (isNonEmptyString(result.session_id)) {
        if (sessionIds.has(result.session_id)) {
          addError(errors, "session_id.duplicate", pointer(path, "session_id"), `Duplicate session_id: ${result.session_id}.`);
        } else {
          sessionIds.set(result.session_id, result);
        }
      }
      if (result.request_id !== request.request_id) {
        addError(errors, "session_result.request_id.mismatch", pointer(path, "request_id"), "session request_id must match the validation request.");
      }
      if (isPlainObject(result.observed_invocation_specification) && !semanticEqual(result.observed_invocation_specification, request.invocation_specification)) {
        addError(errors, "session_result.invocation.mismatch", pointer(path, "observed_invocation_specification"), "Observed invocation specification must match the request.");
      }
      if (result.output_status === "blocked") {
        addError(errors, "session_result.output_status.blocked", pointer(path, "output_status"), "Blocked output is not usable for reproducibility comparison.");
      }
      if (result.registered_executor_invoked === true) {
        addError(errors, "registered_executor_invoked.forbidden", pointer(path, "registered_executor_invoked"), "Registered executors must not be invoked during validation mode.");
      }
      if (isPlainObject(result.side_effects)) {
        for (const field of SIDE_EFFECT_FIELDS) {
          if (Array.isArray(result.side_effects[field]) && result.side_effects[field].length > 0) {
            addError(errors, "side_effects.nonempty", pointer(pointer(path, "side_effects"), field), "Validation mode session results must report no side effects.");
          }
        }
      }
    }
    for (let index = 1; index <= EXPECTED_SESSION_COUNT; index += 1) {
      if (!indices.has(index)) {
        addError(errors, "session_index.missing", `/session_results/${index}/session_index`, `Missing session_index: ${index}.`);
      }
    }
    if (errors.length > 0) {
      return stopped(request.request_id, "invalid_results", results.length, errors);
    }

    const reference = indices.get(1);
    for (let index = 2; index <= EXPECTED_SESSION_COUNT; index += 1) {
      const result = indices.get(index);
      if (!semanticEqual(result.normalized_structured_contract_fields, reference.normalized_structured_contract_fields)) {
        addError(errors, "comparison.normalized_structured_contract_fields.mismatch", `/session_results/${index}/normalized_structured_contract_fields`, "Normalized structured contract fields differ from session_index 1.");
      }
      if (!semanticEqual(result.semantic_decisions, reference.semantic_decisions)) {
        addError(errors, "comparison.semantic_decisions.mismatch", `/session_results/${index}/semantic_decisions`, "Semantic decisions differ from session_index 1.");
      }
    }
    if (errors.length > 0) {
      return stopped(request.request_id, "not_reproducible", results.length, errors);
    }
    return { request_id: request.request_id, status: "pass", reason: "reproducible", session_count: EXPECTED_SESSION_COUNT, errors: [] };
  } catch {
    return stopped(requestIdFrom(request), "invalid_results", Array.isArray(results) ? results.length : 0, [{ code: "validation_mode.internal", path: "", message: "Validation results could not be compared." }]);
  }
}
