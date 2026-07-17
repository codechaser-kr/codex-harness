import { readFileSync } from "node:fs";

import { validateExpression } from "./expression.mjs";

const ROOT_FIELDS = [
  "workflow_id",
  "version",
  "workflow_kind",
  "target_type",
  "entry_transition_id",
  "terminal_transition_ids",
  "normalized_fact_schema",
  "transitions",
];
const WORKFLOW_PREFIXES = {
  feature_proposal: "A",
  policy_review: "B",
  feature_change: "C",
  feature_fix: "D",
  implementation: "E",
};
const WORKFLOW_KINDS = new Set(Object.keys(WORKFLOW_PREFIXES));
const TARGET_TYPES = new Set(["issue", "pull_request", "repository"]);
const FACT_TYPES = new Set(["boolean", "string", "integer"]);
const TASK_ACTION_ID = /^[ABCDE]-[1-9][0-9]*$/;

function pointer(path, segment) {
  return `${path}/${String(segment).replaceAll("~", "~0").replaceAll("/", "~1")}`;
}

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function addError(errors, code, path, message) {
  errors.push({ code, path, message });
}

function validateClosedObject(value, path, allowedFields, errors, context) {
  if (!isObject(value)) {
    addError(errors, `${context}.type`, path, "Expected an object.");
    return false;
  }
  for (const key of Object.keys(value)) {
    if (key === "priority") {
      addError(errors, "priority.forbidden", pointer(path, key), "priority is not allowed.");
    } else if (!allowedFields.has(key)) {
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

function validateStableId(value, path, errors, code) {
  if (!isNonEmptyString(value)) {
    addError(errors, code, path, "Expected a non-empty string.");
    return false;
  }
  return true;
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

function registryIds(registry) {
  if (registry instanceof Set) {
    return registry;
  }
  if (!Array.isArray(registry)) {
    return new Set();
  }
  return new Set(registry.map((entry) => (typeof entry === "string" ? entry : entry?.executor_id)).filter(Boolean));
}

function loadDefaultRegistry() {
  const registryUrl = new URL("../../registries/registered-executors.json", import.meta.url);
  return JSON.parse(readFileSync(registryUrl, "utf8"));
}

function validateFact(value, path, errors) {
  if (!validateClosedObject(value, path, new Set(["fact_id", "value_type", "allowed_values", "evidence_required"]), errors, "fact")) {
    return undefined;
  }
  validateRequired(value, path, ["fact_id", "value_type", "allowed_values", "evidence_required"], errors, "fact");

  const factIdValid = Object.hasOwn(value, "fact_id") && validateStableId(value.fact_id, pointer(path, "fact_id"), errors, "fact_id.invalid");
  const valueTypeValid = Object.hasOwn(value, "value_type") && FACT_TYPES.has(value.value_type);
  if (Object.hasOwn(value, "value_type") && !valueTypeValid) {
    addError(errors, "fact.value_type.invalid", pointer(path, "value_type"), "value_type must be boolean, string, or integer.");
  }
  if (Object.hasOwn(value, "allowed_values")) {
    const valuesPath = pointer(path, "allowed_values");
    if (!Array.isArray(value.allowed_values)) {
      addError(errors, "fact.allowed_values.type", valuesPath, "allowed_values must be an array.");
    } else {
      if (value.allowed_values.length === 0) {
        addError(errors, "fact.allowed_values.empty", valuesPath, "allowed_values must not be empty.");
      }
      if (valueTypeValid) {
        for (let index = 0; index < value.allowed_values.length; index += 1) {
          if (!valueMatchesType(value.allowed_values[index], value.value_type)) {
            addError(errors, "fact.allowed_values.type_mismatch", pointer(valuesPath, index), "allowed_values must match value_type.");
          }
        }
      }
    }
  }
  if (Object.hasOwn(value, "evidence_required") && typeof value.evidence_required !== "boolean") {
    addError(errors, "fact.evidence_required.type", pointer(path, "evidence_required"), "evidence_required must be boolean.");
  }

  if (!factIdValid) {
    return undefined;
  }
  return {
    factId: value.fact_id,
    valueType: valueTypeValid ? value.value_type : undefined,
    allowedValues: Array.isArray(value.allowed_values) ? value.allowed_values : undefined,
  };
}

function validateDecisionSpecification(value, path, errors) {
  if (!validateClosedObject(value, path, new Set(["required", "options", "allow_free_form", "block_execution_until_confirmed"]), errors, "user_decision_specification")) {
    return;
  }
  validateRequired(value, path, ["required", "options", "allow_free_form", "block_execution_until_confirmed"], errors, "user_decision_specification");

  const required = value.required;
  if (Object.hasOwn(value, "required") && typeof required !== "boolean") {
    addError(errors, "user_decision_specification.required.type", pointer(path, "required"), "required must be boolean.");
  }
  for (const field of ["allow_free_form", "block_execution_until_confirmed"]) {
    if (Object.hasOwn(value, field) && typeof value[field] !== "boolean") {
      addError(errors, `user_decision_specification.${field}.type`, pointer(path, field), `${field} must be boolean.`);
    }
  }
  if (!Object.hasOwn(value, "options")) {
    return;
  }
  const optionsPath = pointer(path, "options");
  if (!Array.isArray(value.options)) {
    addError(errors, "user_decision_specification.options.type", optionsPath, "options must be an array.");
    return;
  }
  if (required === true && value.options.length === 0) {
    addError(errors, "user_decision_specification.options.empty", optionsPath, "required decisions need at least one option.");
  }

  const decisionIds = new Set();
  for (let index = 0; index < value.options.length; index += 1) {
    const option = value.options[index];
    const optionPath = pointer(optionsPath, index);
    if (!validateClosedObject(option, optionPath, new Set(["decision_id", "label"]), errors, "decision_option")) {
      continue;
    }
    validateRequired(option, optionPath, ["decision_id", "label"], errors, "decision_option");
    if (Object.hasOwn(option, "decision_id") && validateStableId(option.decision_id, pointer(optionPath, "decision_id"), errors, "decision_id.invalid")) {
      if (decisionIds.has(option.decision_id)) {
        addError(errors, "decision_id.duplicate", pointer(optionPath, "decision_id"), `Duplicate decision_id: ${option.decision_id}.`);
      } else {
        decisionIds.add(option.decision_id);
      }
    }
    if (Object.hasOwn(option, "label") && !isNonEmptyString(option.label)) {
      addError(errors, "decision_option.label.invalid", pointer(optionPath, "label"), "label must be a non-empty string.");
    }
  }
}

function validateNullableStableId(value, path, errors, code) {
  if (value !== null && !isNonEmptyString(value)) {
    addError(errors, code, path, "Expected a non-empty string or null.");
    return false;
  }
  return true;
}

function validateTransition(value, path, workflowKind, facts, executorIds, taskActionIds, errors) {
  const fields = [
    "transition_id",
    "normalized_fact_conditions",
    "task_action_id",
    "user_decision_specification",
    "completion_predicate",
    "registered_executor_reference",
    "next_transition",
  ];
  if (!validateClosedObject(value, path, new Set(fields), errors, "transition")) {
    return;
  }
  validateRequired(value, path, fields, errors, "transition");

  if (Object.hasOwn(value, "transition_id")) {
    validateStableId(value.transition_id, pointer(path, "transition_id"), errors, "transition_id.invalid");
  }
  if (Object.hasOwn(value, "normalized_fact_conditions")) {
    errors.push(...validateExpression(value.normalized_fact_conditions, { path: pointer(path, "normalized_fact_conditions"), facts }));
  }
  if (Object.hasOwn(value, "task_action_id")) {
    const actionPath = pointer(path, "task_action_id");
    if (typeof value.task_action_id !== "string" || !TASK_ACTION_ID.test(value.task_action_id)) {
      addError(errors, "task_action_id.invalid", actionPath, "task_action_id must match ^[ABCDE]-[1-9][0-9]*$.");
    } else {
      if (taskActionIds.has(value.task_action_id)) {
        addError(errors, "task_action_id.duplicate", actionPath, `Duplicate task_action_id: ${value.task_action_id}.`);
      } else {
        taskActionIds.add(value.task_action_id);
      }
      const expectedPrefix = WORKFLOW_PREFIXES[workflowKind];
      if (expectedPrefix && !value.task_action_id.startsWith(`${expectedPrefix}-`)) {
        addError(errors, "task_action_id.prefix_mismatch", actionPath, `task_action_id must use ${expectedPrefix}- for ${workflowKind}.`);
      }
    }
  }
  if (Object.hasOwn(value, "user_decision_specification")) {
    validateDecisionSpecification(value.user_decision_specification, pointer(path, "user_decision_specification"), errors);
  }
  if (Object.hasOwn(value, "completion_predicate")) {
    errors.push(...validateExpression(value.completion_predicate, { path: pointer(path, "completion_predicate"), facts }));
  }
  if (Object.hasOwn(value, "registered_executor_reference")) {
    const executorPath = pointer(path, "registered_executor_reference");
    if (validateNullableStableId(value.registered_executor_reference, executorPath, errors, "registered_executor_reference.invalid") && value.registered_executor_reference !== null && !executorIds.has(value.registered_executor_reference)) {
      addError(errors, "registered_executor_reference.unknown", executorPath, `Unknown executor: ${value.registered_executor_reference}.`);
    }
  }
  if (Object.hasOwn(value, "next_transition")) {
    validateNullableStableId(value.next_transition, pointer(path, "next_transition"), errors, "next_transition.invalid");
  }
}

export function validateWorkflowDefinition(definition, { registry = loadDefaultRegistry() } = {}) {
  const errors = [];
  if (!validateClosedObject(definition, "", new Set(ROOT_FIELDS), errors, "workflow")) {
    return { valid: false, errors };
  }
  validateRequired(definition, "", ROOT_FIELDS, errors, "workflow");

  for (const field of ["workflow_id", "version", "entry_transition_id"]) {
    if (Object.hasOwn(definition, field)) {
      validateStableId(definition[field], pointer("", field), errors, `${field}.invalid`);
    }
  }
  if (Object.hasOwn(definition, "workflow_kind") && (typeof definition.workflow_kind !== "string" || !WORKFLOW_KINDS.has(definition.workflow_kind))) {
    addError(errors, "workflow_kind.invalid", "/workflow_kind", "workflow_kind is not supported.");
  }
  if (Object.hasOwn(definition, "target_type") && (typeof definition.target_type !== "string" || !TARGET_TYPES.has(definition.target_type))) {
    addError(errors, "target_type.invalid", "/target_type", "target_type is not supported.");
  }
  if (Object.hasOwn(definition, "terminal_transition_ids")) {
    if (!Array.isArray(definition.terminal_transition_ids)) {
      addError(errors, "terminal_transition_ids.type", "/terminal_transition_ids", "terminal_transition_ids must be an array.");
    } else {
      if (definition.terminal_transition_ids.length === 0) {
        addError(errors, "terminal_transition_ids.empty", "/terminal_transition_ids", "terminal_transition_ids must not be empty.");
      }
      for (let index = 0; index < definition.terminal_transition_ids.length; index += 1) {
        validateStableId(definition.terminal_transition_ids[index], `/terminal_transition_ids/${index}`, errors, "terminal_transition_id.invalid");
      }
    }
  }

  const facts = new Map();
  if (Object.hasOwn(definition, "normalized_fact_schema")) {
    if (!Array.isArray(definition.normalized_fact_schema)) {
      addError(errors, "normalized_fact_schema.type", "/normalized_fact_schema", "normalized_fact_schema must be an array.");
    } else {
      if (definition.normalized_fact_schema.length === 0) {
        addError(errors, "normalized_fact_schema.empty", "/normalized_fact_schema", "normalized_fact_schema must not be empty.");
      }
      for (let index = 0; index < definition.normalized_fact_schema.length; index += 1) {
        const factPath = `/normalized_fact_schema/${index}`;
        const fact = validateFact(definition.normalized_fact_schema[index], factPath, errors);
        if (fact) {
          if (facts.has(fact.factId)) {
            addError(errors, "fact_id.duplicate", `${factPath}/fact_id`, `Duplicate fact_id: ${fact.factId}.`);
          } else {
            facts.set(fact.factId, fact);
          }
        }
      }
    }
  }

  const executorIds = registryIds(registry);
  if (Object.hasOwn(definition, "transitions")) {
    if (!Array.isArray(definition.transitions)) {
      addError(errors, "transitions.type", "/transitions", "transitions must be an array.");
    } else {
      if (definition.transitions.length === 0) {
        addError(errors, "transitions.empty", "/transitions", "transitions must not be empty.");
      }
      const taskActionIds = new Set();
      for (let index = 0; index < definition.transitions.length; index += 1) {
        validateTransition(
          definition.transitions[index],
          `/transitions/${index}`,
          definition.workflow_kind,
          facts,
          executorIds,
          taskActionIds,
          errors,
        );
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
