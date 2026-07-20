import { matchesExpressionState, validateExpression } from "./expression.mjs";

const ROOT_FIELDS = [
  "workflow_id",
  "entry_task_action_id",
  "facts",
  "transitions",
];
const TRANSITION_FIELDS = [
  "task_action_id",
  "normalized_fact_conditions",
  "user_decision_options",
  "completion_predicate",
  "executor_reference",
  "next_transition_rules",
];
const WORKFLOW_PREFIXES = {
  "feature-proposal": "FP",
  "policy-review": "PR",
  "feature-change": "FC",
  "feature-fix": "FF",
  implementation: "FI",
};
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
  if (!isPlainObject(value)) {
    addError(errors, `${context}.type`, path, "Expected a plain object.");
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

function factValueType(value) {
  if (typeof value === "boolean") {
    return "boolean";
  }
  if (typeof value === "string") {
    return "string";
  }
  return Number.isInteger(value) ? "integer" : undefined;
}

function validateFact(factId, allowedValues, path, errors) {
  const factIdValid = validateStableId(factId, path, errors, "fact_id.invalid");
  let valueType;
  let allowedValuesValid = Array.isArray(allowedValues) && allowedValues.length > 0;
  if (!Array.isArray(allowedValues)) {
    addError(errors, "fact.allowed_values.type", path, "Fact domain must be an array.");
  } else if (allowedValues.length === 0) {
    addError(errors, "fact.allowed_values.empty", path, "Fact domain must not be empty.");
  } else {
    valueType = factValueType(allowedValues[0]);
    if (!valueType) {
      allowedValuesValid = false;
      addError(errors, "fact.allowed_values.scalar", pointer(path, 0), "Fact values must be boolean, string, or integer scalars.");
    }
    for (let index = 1; index < allowedValues.length; index += 1) {
      if (factValueType(allowedValues[index]) !== valueType) {
        allowedValuesValid = false;
        addError(errors, "fact.allowed_values.type_mismatch", pointer(path, index), "Fact values must have one homogeneous scalar type.");
      }
    }
  }

  if (!factIdValid) return undefined;
  return {
    factId,
    valueType,
    allowedValues: Array.isArray(allowedValues) ? allowedValues : undefined,
    conditionReady: Boolean(valueType) && allowedValuesValid,
  };
}

function validateDecisionOptions(value, path, errors) {
  if (!Array.isArray(value)) {
    addError(errors, "user_decision_options.type", path, "user_decision_options must be an array.");
    return;
  }

  const decisionIds = new Set();
  for (let index = 0; index < value.length; index += 1) {
    const option = value[index];
    const optionPath = pointer(path, index);
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
    const metadata = { path: rulePath, taskActionId: undefined, condition: undefined, conditionValid: false, unconditional: false };
    result.rules.push(metadata);
    if (!validateClosedObject(rule, rulePath, new Set(["condition", "task_action_id"]), errors, "next_transition_rule")) {
      allConditionsValid = false;
      continue;
    }
    validateRequired(rule, rulePath, ["condition", "task_action_id"], errors, "next_transition_rule");
    if (Object.hasOwn(rule, "task_action_id") && validateStableId(rule.task_action_id, pointer(rulePath, "task_action_id"), errors, "next_transition_rule.task_action_id.invalid")) {
      metadata.taskActionId = rule.task_action_id;
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

function validateTransition(value, path, workflowId, facts, taskActionIds, errors) {
  const record = {
    path,
    taskActionId: undefined,
    completionPredicate: undefined,
    completionPredicateValid: false,
    ruleSet: undefined,
  };
  if (!validateClosedObject(value, path, new Set(TRANSITION_FIELDS), errors, "transition")) {
    return record;
  }
  validateRequired(value, path, TRANSITION_FIELDS, errors, "transition");

  if (Object.hasOwn(value, "normalized_fact_conditions")) {
    errors.push(...validateExpression(value.normalized_fact_conditions, { path: pointer(path, "normalized_fact_conditions"), facts }));
  }
  if (Object.hasOwn(value, "task_action_id")) {
    const actionPath = pointer(path, "task_action_id");
    if (typeof value.task_action_id !== "string" || !TASK_ACTION_ID.test(value.task_action_id)) {
      addError(errors, "task_action_id.invalid", actionPath, "task_action_id must match ^(FP|PR|FC|FF|FI)-[1-9][0-9]*$.");
    } else {
      record.taskActionId = value.task_action_id;
      if (taskActionIds.has(value.task_action_id)) {
        addError(errors, "task_action_id.duplicate", actionPath, `Duplicate task_action_id: ${value.task_action_id}.`);
      } else {
        taskActionIds.add(value.task_action_id);
      }
      const expectedPrefix = WORKFLOW_PREFIXES[workflowId];
      if (expectedPrefix && !value.task_action_id.startsWith(`${expectedPrefix}-`)) {
        addError(errors, "task_action_id.prefix_mismatch", actionPath, `task_action_id must use ${expectedPrefix}- for ${workflowId}.`);
      }
    }
  }
  if (Object.hasOwn(value, "user_decision_options")) {
    validateDecisionOptions(value.user_decision_options, pointer(path, "user_decision_options"), errors);
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
    if (!record.taskActionId || terminalIds.has(record.taskActionId) || !record.ruleSet?.isArray || record.ruleSet.rules.length === 0) {
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

function validateGraph(definition, records, facts, maxConditionStates, errors) {
  const transitions = new Map();
  for (const record of records) {
    if (!record.taskActionId) {
      continue;
    }
    transitions.set(record.taskActionId, record);
  }

  if (isNonEmptyString(definition.entry_task_action_id) && !transitions.has(definition.entry_task_action_id)) {
    addError(errors, "entry_task_action_id.unknown", "/entry_task_action_id", `Unknown entry_task_action_id: ${definition.entry_task_action_id}.`);
  }

  const terminalIds = new Set(records
    .filter((record) => record.ruleSet?.isArray && record.ruleSet.rules.length === 0)
    .map((record) => record.taskActionId)
    .filter(Boolean));
  validateCompletionPredicateSatisfiability(records, facts, maxConditionStates, errors);
  const matchingRules = validateRuleCoverage(records, terminalIds, facts, maxConditionStates, errors);
  const adjacency = new Map();
  for (const [taskActionId, record] of transitions) {
    const rules = record.ruleSet;
    if (!rules?.isArray) {
      adjacency.set(taskActionId, []);
      continue;
    }
    const targets = [];
    for (const rule of rules.rules) {
      if (!rule.taskActionId) {
        continue;
      }
      if (!transitions.has(rule.taskActionId)) {
        addError(errors, "next_transition_rule.task_action_id.unknown", pointer(rule.path, "task_action_id"), `Unknown task_action_id: ${rule.taskActionId}.`);
      } else if (matchingRules.has(rule)) {
        targets.push(rule.taskActionId);
      }
    }
    adjacency.set(taskActionId, targets);
  }

  if (!isNonEmptyString(definition.entry_task_action_id) || !transitions.has(definition.entry_task_action_id)) {
    return;
  }
  const reachable = reachableFrom([definition.entry_task_action_id], adjacency);
  for (const [taskActionId, record] of transitions) {
    if (!reachable.has(taskActionId)) {
      addError(errors, "transition.unreachable", pointer(record.path, "task_action_id"), `Transition is unreachable from entry_task_action_id: ${taskActionId}.`);
    }
  }

  const reverseAdjacency = new Map([...transitions.keys()].map((taskActionId) => [taskActionId, []]));
  for (const [source, targets] of adjacency) {
    for (const target of targets) {
      reverseAdjacency.get(target).push(source);
    }
  }
  const terminalSeeds = [...terminalIds].filter((taskActionId) => transitions.has(taskActionId));
  const reachesTerminal = reachableFrom(terminalSeeds, reverseAdjacency);
  for (const taskActionId of reachable) {
    if (!reachesTerminal.has(taskActionId)) {
      const record = transitions.get(taskActionId);
      addError(errors, "transition.no_terminal_path", pointer(record.path, "task_action_id"), `No path from transition to a terminal action: ${taskActionId}.`);
    }
  }
  for (const component of findStronglyConnectedComponents(adjacency, reachable)) {
    const first = component[0];
    const isCycle = component.length > 1 || (adjacency.get(first) ?? []).includes(first);
    if (isCycle && !component.some((taskActionId) => reachesTerminal.has(taskActionId))) {
      const record = transitions.get(first);
      addError(errors, "transition.cycle_without_terminal", pointer(record.path, "task_action_id"), "Cycle has no path to a terminal action.");
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
  for (const field of ["workflow_id", "entry_task_action_id"]) {
    if (Object.hasOwn(definition, field)) {
      validateStableId(definition[field], pointer("", field), errors, `${field}.invalid`);
    }
  }
  if (Object.hasOwn(definition, "workflow_id") && isNonEmptyString(definition.workflow_id)
    && !Object.hasOwn(WORKFLOW_PREFIXES, definition.workflow_id)) {
    addError(errors, "workflow_id.unsupported", "/workflow_id", "workflow_id is not supported.");
  }

  const facts = new Map();
  if (Object.hasOwn(definition, "facts")) {
    if (!isPlainObject(definition.facts)) {
      addError(errors, "facts.type", "/facts", "facts must be a plain object.");
    } else {
      const factEntries = Object.entries(definition.facts);
      if (factEntries.length === 0) {
        addError(errors, "facts.empty", "/facts", "facts must not be empty.");
      }
      for (const [factId, allowedValues] of factEntries) {
        const factPath = pointer("/facts", factId);
        const fact = validateFact(factId, allowedValues, factPath, errors);
        if (fact) {
          facts.set(fact.factId, fact);
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
          definition.workflow_id,
          facts,
          taskActionIds,
          errors,
        ));
      }
    }
  }

  validateGraph(definition, records, facts, normalizedMaxConditionStates, errors);
  return { valid: errors.length === 0, errors };
}
