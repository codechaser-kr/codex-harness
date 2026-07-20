import { matchesExpressionState, validateExpression } from "./expression.mjs";

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
const TRANSITION_FIELDS = [
  "transition_id",
  "normalized_fact_conditions",
  "task_action_id",
  "user_decision_specification",
  "completion_predicate",
  "executor_reference",
  "next_transition_rules",
];
const WORKFLOW_PREFIXES = {
  feature_proposal: "FP",
  policy_review: "PR",
  feature_change: "FC",
  feature_fix: "FF",
  implementation: "FI",
};
const WORKFLOW_KINDS = new Set(Object.keys(WORKFLOW_PREFIXES));
const TARGET_TYPES = new Set(["issue", "pull_request", "repository"]);
const FACT_TYPES = new Set(["boolean", "string", "integer"]);
const TASK_ACTION_ID = /^(FP|PR|FC|FF|FI)-[1-9][0-9]*$/;
export const DEFAULT_MAX_CONDITION_STATES = 10_000;

function pointer(path, segment) {
  return `${path}/${String(segment).replaceAll("~", "~0").replaceAll("/", "~1")}`;
}

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPlainObject(value) {
  if (!isObject(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function addError(errors, code, path, message, witness) {
  const error = { code, path, message };
  if (witness !== undefined) {
    error.witness = witness;
  }
  errors.push(error);
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
    conditionReady: valueTypeValid && allowedValuesValid,
  };
}

function validateDecisionSpecification(value, path, errors) {
  const fields = ["required", "options", "allow_free_form", "block_execution_until_confirmed"];
  if (!validateClosedObject(value, path, new Set(fields), errors, "user_decision_specification")) {
    return;
  }
  validateRequired(value, path, fields, errors, "user_decision_specification");

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

function validateNextTransitionRules(value, path, facts, errors) {
  const result = { isArray: false, rules: [], hasConditionalRules: false, conditionsValid: false };
  if (!Array.isArray(value)) {
    addError(errors, "next_transition_rules.type", path, "next_transition_rules must be an array.");
    return result;
  }
  result.isArray = true;
  let allConditionsValid = true;
  const unconditionalIndexes = [];
  for (let index = 0; index < value.length; index += 1) {
    const rule = value[index];
    const rulePath = pointer(path, index);
    const metadata = { path: rulePath, transitionId: undefined, condition: undefined, conditionValid: false, unconditional: false };
    result.rules.push(metadata);
    if (!validateClosedObject(rule, rulePath, new Set(["condition", "transition_id"]), errors, "next_transition_rule")) {
      allConditionsValid = false;
      continue;
    }
    validateRequired(rule, rulePath, ["condition", "transition_id"], errors, "next_transition_rule");
    if (Object.hasOwn(rule, "transition_id") && validateStableId(rule.transition_id, pointer(rulePath, "transition_id"), errors, "next_transition_rule.transition_id.invalid")) {
      metadata.transitionId = rule.transition_id;
    }
    if (!Object.hasOwn(rule, "condition")) {
      allConditionsValid = false;
      continue;
    }
    if (rule.condition === null) {
      metadata.unconditional = true;
      metadata.conditionValid = true;
      unconditionalIndexes.push(index);
      continue;
    }
    const expressionErrors = validateExpression(rule.condition, { path: pointer(rulePath, "condition"), facts });
    errors.push(...expressionErrors);
    metadata.condition = rule.condition;
    metadata.conditionValid = expressionErrors.length === 0;
    result.hasConditionalRules = true;
    allConditionsValid &&= metadata.conditionValid;
  }
  if (unconditionalIndexes.length > 0 && value.length > 1) {
    addError(errors, "next_transition_rules.unconditional_mixed", pointer(pointer(path, unconditionalIndexes[0]), "condition"), "An unconditional rule must be the only next transition rule.");
  }
  result.conditionsValid = allConditionsValid && unconditionalIndexes.length === 0;
  return result;
}

function validateTransition(value, path, workflowKind, facts, taskActionIds, errors) {
  const record = {
    path,
    transitionId: undefined,
    completionPredicate: undefined,
    completionPredicateValid: false,
    ruleSet: undefined,
  };
  if (!validateClosedObject(value, path, new Set(TRANSITION_FIELDS), errors, "transition")) {
    return record;
  }
  validateRequired(value, path, TRANSITION_FIELDS, errors, "transition");

  if (Object.hasOwn(value, "transition_id") && validateStableId(value.transition_id, pointer(path, "transition_id"), errors, "transition_id.invalid")) {
    record.transitionId = value.transition_id;
  }
  if (Object.hasOwn(value, "normalized_fact_conditions")) {
    errors.push(...validateExpression(value.normalized_fact_conditions, { path: pointer(path, "normalized_fact_conditions"), facts }));
  }
  if (Object.hasOwn(value, "task_action_id")) {
    const actionPath = pointer(path, "task_action_id");
    if (typeof value.task_action_id !== "string" || !TASK_ACTION_ID.test(value.task_action_id)) {
      addError(errors, "task_action_id.invalid", actionPath, "task_action_id must match ^(FP|PR|FC|FF|FI)-[1-9][0-9]*$.");
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
    const completionErrors = validateExpression(value.completion_predicate, { path: pointer(path, "completion_predicate"), facts });
    errors.push(...completionErrors);
    record.completionPredicate = value.completion_predicate;
    record.completionPredicateValid = completionErrors.length === 0;
  }
  if (Object.hasOwn(value, "executor_reference")) {
    validateNullableStableId(value.executor_reference, pointer(path, "executor_reference"), errors, "executor_reference.invalid");
  }
  if (Object.hasOwn(value, "next_transition_rules")) {
    record.ruleSet = validateNextTransitionRules(value.next_transition_rules, pointer(path, "next_transition_rules"), facts, errors);
  }
  return record;
}

function collectReferencedStateFacts(factIds, facts) {
  const stateFacts = [];
  for (const [factId, fact] of facts) {
    if (!factIds.has(factId)) {
      continue;
    }
    if (!fact.conditionReady) {
      return undefined;
    }
    stateFacts.push(fact);
  }
  return stateFacts.length === factIds.size ? stateFacts : undefined;
}

function stateSpaceSize(facts, maxConditionStates) {
  let size = 1;
  for (const fact of facts) {
    if (size > Math.floor(maxConditionStates / fact.allowedValues.length)) {
      return undefined;
    }
    size *= fact.allowedValues.length;
  }
  return size;
}

function forEachState(facts, visit) {
  const state = new Map();
  let keepGoing = true;
  function traverse(index) {
    if (!keepGoing) {
      return;
    }
    if (index === facts.length) {
      keepGoing = visit(new Map(state)) !== false;
      return;
    }
    const fact = facts[index];
    for (const value of fact.allowedValues) {
      state.set(fact.factId, value);
      traverse(index + 1);
      if (!keepGoing) {
        return;
      }
    }
  }
  traverse(0);
}

function collectExpressionFactIds(expression, factIds) {
  if (!isObject(expression)) {
    return;
  }
  if (Object.hasOwn(expression, "fact_id")) {
    factIds.add(expression.fact_id);
    return;
  }
  if (Array.isArray(expression.all)) {
    for (const child of expression.all) {
      collectExpressionFactIds(child, factIds);
    }
    return;
  }
  if (Array.isArray(expression.any)) {
    for (const child of expression.any) {
      collectExpressionFactIds(child, factIds);
    }
    return;
  }
  if (Object.hasOwn(expression, "not")) {
    collectExpressionFactIds(expression.not, factIds);
  }
}

function collectExpressionStateFacts(expression, facts) {
  const factIds = new Set();
  collectExpressionFactIds(expression, factIds);
  return collectReferencedStateFacts(factIds, facts);
}

function collectRuleConditionFacts(ruleSet, facts) {
  const factIds = new Set();
  for (const rule of ruleSet.rules) {
    if (rule.conditionValid && !rule.unconditional) {
      collectExpressionFactIds(rule.condition, factIds);
    }
  }
  return collectReferencedStateFacts(factIds, facts);
}

function completionPredicateStateSpaceSize(facts, maxConditionStates) {
  let size = 1;
  for (const fact of facts) {
    const stateCount = fact.allowedValues.length + 1;
    if (size > Math.floor(maxConditionStates / stateCount)) {
      return undefined;
    }
    size *= stateCount;
  }
  return size;
}

function forEachCompletionPredicateState(facts, visit) {
  const state = new Map();
  let keepGoing = true;
  function traverse(index) {
    if (!keepGoing) {
      return;
    }
    if (index === facts.length) {
      keepGoing = visit(new Map(state)) !== false;
      return;
    }
    const fact = facts[index];
    state.delete(fact.factId);
    traverse(index + 1);
    for (const value of fact.allowedValues) {
      state.set(fact.factId, value);
      traverse(index + 1);
      if (!keepGoing) {
        return;
      }
    }
  }
  traverse(0);
}

function validateCompletionPredicateSatisfiability(records, facts, maxConditionStates, errors) {
  for (const record of records) {
    if (!record.completionPredicateValid) {
      continue;
    }
    const stateFacts = collectExpressionStateFacts(record.completionPredicate, facts);
    if (!stateFacts) {
      continue;
    }
    const predicatePath = `${record.path}/completion_predicate`;
    if (completionPredicateStateSpaceSize(stateFacts, maxConditionStates) === undefined) {
      addError(errors, "completion_predicate_state_space.limit_exceeded", predicatePath, `Completion predicate state space exceeds configured limit ${maxConditionStates}.`);
      continue;
    }
    let satisfiable = false;
    forEachCompletionPredicateState(stateFacts, (state) => {
      if (matchesExpressionState(record.completionPredicate, state)) {
        satisfiable = true;
        return false;
      }
      return true;
    });
    if (!satisfiable) {
      addError(errors, "completion_predicate.unsatisfiable", predicatePath, "completion_predicate cannot be true for any declared fact state.");
    }
  }
}

function stateWitness(state) {
  return Object.fromEntries(state.entries());
}

function validateRuleCoverage(records, terminalIds, facts, maxConditionStates, errors) {
  const matchingRules = new Set();
  for (const record of records) {
    for (const rule of record.ruleSet?.rules ?? []) {
      if (rule.unconditional || !rule.conditionValid) {
        matchingRules.add(rule);
      }
    }
  }
  const candidates = records.filter((record) => {
    if (!record.transitionId || terminalIds.has(record.transitionId) || !record.ruleSet?.isArray || record.ruleSet.rules.length === 0) {
      return false;
    }
    return record.ruleSet.hasConditionalRules && record.ruleSet.conditionsValid;
  });
  for (const record of candidates) {
    const stateFacts = collectRuleConditionFacts(record.ruleSet, facts);
    if (!stateFacts) {
      for (const rule of record.ruleSet.rules) {
        matchingRules.add(rule);
      }
      continue;
    }
    if (stateSpaceSize(stateFacts, maxConditionStates) === undefined) {
      addError(errors, "condition_state_space.limit_exceeded", `${record.path}/next_transition_rules`, `Condition state space exceeds configured limit ${maxConditionStates}.`);
      for (const rule of record.ruleSet.rules) {
        matchingRules.add(rule);
      }
      continue;
    }
    let gapReported = false;
    let overlapReported = false;
    forEachState(stateFacts, (state) => {
      const matchedInState = record.ruleSet.rules.filter((rule) => rule.conditionValid && matchesExpressionState(rule.condition, state));
      for (const rule of matchedInState) {
        matchingRules.add(rule);
      }
      if (matchedInState.length === 0 && !gapReported) {
        addError(errors, "next_transition_rules.condition_gap", record.ruleSet.rules[0]?.path ?? `${record.path}/next_transition_rules`, "No conditional next transition rule matches this declared fact state.", stateWitness(state));
        gapReported = true;
      }
      if (matchedInState.length > 1 && !overlapReported) {
        addError(errors, "next_transition_rules.condition_overlap", record.ruleSet.rules[0]?.path ?? `${record.path}/next_transition_rules`, "Multiple conditional next transition rules match this declared fact state.", stateWitness(state));
        overlapReported = true;
      }
      // Continue collecting satisfiable rules after recording the first witnesses.
      return true;
    });
  }
  return matchingRules;
}

function reachableFrom(seeds, adjacency) {
  const reached = new Set();
  const queue = [...seeds];
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    if (reached.has(current)) {
      continue;
    }
    reached.add(current);
    for (const next of adjacency.get(current) ?? []) {
      if (!reached.has(next)) {
        queue.push(next);
      }
    }
  }
  return reached;
}

function findStronglyConnectedComponents(adjacency, reachable) {
  let index = 0;
  const indexes = new Map();
  const lowlinks = new Map();
  const stack = [];
  const onStack = new Set();
  const components = [];

  function visit(node) {
    indexes.set(node, index);
    lowlinks.set(node, index);
    index += 1;
    stack.push(node);
    onStack.add(node);
    for (const next of adjacency.get(node) ?? []) {
      if (!reachable.has(next)) {
        continue;
      }
      if (!indexes.has(next)) {
        visit(next);
        lowlinks.set(node, Math.min(lowlinks.get(node), lowlinks.get(next)));
      } else if (onStack.has(next)) {
        lowlinks.set(node, Math.min(lowlinks.get(node), indexes.get(next)));
      }
    }
    if (lowlinks.get(node) !== indexes.get(node)) {
      return;
    }
    const component = [];
    let next;
    do {
      next = stack.pop();
      onStack.delete(next);
      component.push(next);
    } while (next !== node);
    components.push(component);
  }

  for (const node of reachable) {
    if (!indexes.has(node)) {
      visit(node);
    }
  }
  return components;
}

function validateGraph(definition, records, terminalEntries, facts, maxConditionStates, errors) {
  const transitions = new Map();
  for (const record of records) {
    if (!record.transitionId) {
      continue;
    }
    if (transitions.has(record.transitionId)) {
      addError(errors, "transition_id.duplicate", pointer(record.path, "transition_id"), `Duplicate transition_id: ${record.transitionId}.`);
    } else {
      transitions.set(record.transitionId, record);
    }
  }

  const terminalIds = new Set();
  for (const entry of terminalEntries) {
    if (terminalIds.has(entry.id)) {
      addError(errors, "terminal_transition_id.duplicate", entry.path, `Duplicate terminal_transition_id: ${entry.id}.`);
    } else {
      terminalIds.add(entry.id);
    }
    if (!transitions.has(entry.id)) {
      addError(errors, "terminal_transition_id.unknown", entry.path, `Unknown terminal_transition_id: ${entry.id}.`);
    }
  }
  if (isNonEmptyString(definition.entry_transition_id) && !transitions.has(definition.entry_transition_id)) {
    addError(errors, "entry_transition_id.unknown", "/entry_transition_id", `Unknown entry_transition_id: ${definition.entry_transition_id}.`);
  }

  validateCompletionPredicateSatisfiability(records, facts, maxConditionStates, errors);
  const matchingRules = validateRuleCoverage(records, terminalIds, facts, maxConditionStates, errors);
  const adjacency = new Map();
  for (const [transitionId, record] of transitions) {
    const rules = record.ruleSet;
    const isTerminal = terminalIds.has(transitionId);
    if (!rules?.isArray) {
      adjacency.set(transitionId, []);
      continue;
    }
    if (isTerminal && rules.rules.length !== 0) {
      addError(errors, "transition.terminal_rules_not_empty", `${record.path}/next_transition_rules`, "A terminal transition must have an empty next_transition_rules array.");
    }
    if (!isTerminal && rules.rules.length === 0) {
      addError(errors, "transition.non_terminal_rules_empty", `${record.path}/next_transition_rules`, "A non-terminal transition must have at least one next transition rule.");
    }
    const targets = [];
    for (const rule of rules.rules) {
      if (!rule.transitionId) {
        continue;
      }
      if (!transitions.has(rule.transitionId)) {
        addError(errors, "next_transition_rule.transition_id.unknown", pointer(rule.path, "transition_id"), `Unknown transition_id: ${rule.transitionId}.`);
      } else if (matchingRules.has(rule)) {
        targets.push(rule.transitionId);
      }
    }
    adjacency.set(transitionId, targets);
  }

  if (!isNonEmptyString(definition.entry_transition_id) || !transitions.has(definition.entry_transition_id)) {
    return;
  }
  const reachable = reachableFrom([definition.entry_transition_id], adjacency);
  for (const [transitionId, record] of transitions) {
    if (!reachable.has(transitionId)) {
      addError(errors, "transition.unreachable", pointer(record.path, "transition_id"), `Transition is unreachable from entry_transition_id: ${transitionId}.`);
    }
  }

  const reverseAdjacency = new Map([...transitions.keys()].map((transitionId) => [transitionId, []]));
  for (const [source, targets] of adjacency) {
    for (const target of targets) {
      reverseAdjacency.get(target).push(source);
    }
  }
  const terminalSeeds = [...terminalIds].filter((transitionId) => transitions.has(transitionId));
  const reachesTerminal = reachableFrom(terminalSeeds, reverseAdjacency);
  for (const transitionId of reachable) {
    if (!reachesTerminal.has(transitionId)) {
      const record = transitions.get(transitionId);
      addError(errors, "transition.no_terminal_path", pointer(record.path, "transition_id"), `No path from transition to a terminal transition: ${transitionId}.`);
    }
  }
  for (const component of findStronglyConnectedComponents(adjacency, reachable)) {
    const first = component[0];
    const isCycle = component.length > 1 || (adjacency.get(first) ?? []).includes(first);
    if (isCycle && !component.some((transitionId) => reachesTerminal.has(transitionId))) {
      const record = transitions.get(first);
      addError(errors, "transition.cycle_without_terminal", pointer(record.path, "transition_id"), "Cycle has no path to a terminal transition.");
    }
  }
}

function normalizeMaxConditionStates(value, errors) {
  if (value === undefined) {
    return DEFAULT_MAX_CONDITION_STATES;
  }
  if (Number.isInteger(value) && value > 0) {
    return value;
  }
  addError(errors, "validator.max_condition_states.invalid", "", "maxConditionStates must be a positive integer.");
  return DEFAULT_MAX_CONDITION_STATES;
}

export function validateWorkflowDefinition(definition, { maxConditionStates } = {}) {
  const errors = [];
  const normalizedMaxConditionStates = normalizeMaxConditionStates(maxConditionStates, errors);
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

  const terminalEntries = [];
  if (Object.hasOwn(definition, "terminal_transition_ids")) {
    if (!Array.isArray(definition.terminal_transition_ids)) {
      addError(errors, "terminal_transition_ids.type", "/terminal_transition_ids", "terminal_transition_ids must be an array.");
    } else {
      if (definition.terminal_transition_ids.length === 0) {
        addError(errors, "terminal_transition_ids.empty", "/terminal_transition_ids", "terminal_transition_ids must not be empty.");
      }
      for (let index = 0; index < definition.terminal_transition_ids.length; index += 1) {
        const idPath = `/terminal_transition_ids/${index}`;
        if (validateStableId(definition.terminal_transition_ids[index], idPath, errors, "terminal_transition_id.invalid")) {
          terminalEntries.push({ id: definition.terminal_transition_ids[index], path: idPath });
        }
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

  const records = [];
  if (Object.hasOwn(definition, "transitions")) {
    if (!Array.isArray(definition.transitions)) {
      addError(errors, "transitions.type", "/transitions", "transitions must be an array.");
    } else {
      if (definition.transitions.length === 0) {
        addError(errors, "transitions.empty", "/transitions", "transitions must not be empty.");
      }
      const taskActionIds = new Set();
      for (let index = 0; index < definition.transitions.length; index += 1) {
        records.push(validateTransition(
          definition.transitions[index],
          `/transitions/${index}`,
          definition.workflow_kind,
          facts,
          taskActionIds,
          errors,
        ));
      }
    }
  }

  validateGraph(definition, records, terminalEntries, facts, normalizedMaxConditionStates, errors);
  return { valid: errors.length === 0, errors };
}
