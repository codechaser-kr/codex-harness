import { matchesExpressionState } from "./expression.mjs";
import { validateWorkflowDefinition } from "./validator.mjs";

function escapePointerSegment(segment) {
  return String(segment).replaceAll("~", "~0").replaceAll("/", "~1");
}

function isPlainObject(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
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

function validateNormalizedFactState(definition, state) {
  const errors = [];
  if (!isPlainObject(state)) {
    return [{
      code: "state.type",
      path: "",
      message: "normalized fact state must be a plain object.",
    }];
  }

  const facts = new Map(definition.normalized_fact_schema.map((fact) => [fact.fact_id, fact]));
  for (const [factId, value] of Object.entries(state)) {
    const path = `/${escapePointerSegment(factId)}`;
    const fact = facts.get(factId);
    if (!fact) {
      errors.push({
        code: "state.fact.unknown",
        path,
        message: `Unknown fact_id: ${factId}.`,
      });
      continue;
    }
    if (!valueMatchesType(value, fact.value_type)) {
      errors.push({
        code: "state.value.type_mismatch",
        path,
        message: `Value must match fact type ${fact.value_type}.`,
      });
      continue;
    }
    if (!fact.allowed_values.some((allowedValue) => allowedValue === value)) {
      errors.push({
        code: "state.value.not_allowed",
        path,
        message: "Value is not in the fact allowed_values domain.",
      });
    }
  }
  return errors;
}

function stopped(reason, transitionId, extra = {}) {
  return {
    status: "stopped",
    reason,
    transition_id: transitionId ?? null,
    ...extra,
  };
}

/**
 * Evaluates one workflow definition against an immutable normalized fact state.
 */
export function evaluateWorkflowDefinition(definition, normalizedFactState, { currentTransitionId } = {}) {
  const validation = validateWorkflowDefinition(definition);
  if (!validation.valid) {
    return stopped("invalid_definition", null, { errors: validation.errors });
  }

  const stateErrors = validateNormalizedFactState(definition, normalizedFactState);
  if (stateErrors.length > 0) {
    return stopped("invalid_state", null, { errors: stateErrors });
  }

  const transitions = new Map(definition.transitions.map((transition) => [transition.transition_id, transition]));
  const terminalIds = new Set(definition.terminal_transition_ids);
  let transitionId = currentTransitionId ?? definition.entry_transition_id;
  const visited = new Set();

  while (true) {
    if (!transitions.has(transitionId)) {
      return stopped("current_transition_not_found", transitionId);
    }
    if (visited.has(transitionId)) {
      return stopped("evaluation_cycle", transitionId);
    }
    visited.add(transitionId);

    const transition = transitions.get(transitionId);
    if (!matchesExpressionState(transition.normalized_fact_conditions, normalizedFactState)) {
      return stopped("current_transition_condition_not_met", transitionId);
    }
    if (!matchesExpressionState(transition.completion_predicate, normalizedFactState)) {
      return {
        status: "action_required",
        transition_id: transition.transition_id,
        task_action_id: transition.task_action_id,
        user_decision_specification: transition.user_decision_specification,
        executor_reference: transition.executor_reference,
        completion_predicate: transition.completion_predicate,
      };
    }
    if (terminalIds.has(transitionId)) {
      return {
        status: "completed",
        transition_id: transitionId,
      };
    }

    const matchedRules = transition.next_transition_rules.filter(
      (rule) => rule.condition === null || matchesExpressionState(rule.condition, normalizedFactState),
    );
    if (matchedRules.length === 0) {
      return stopped("no_transition_match", transitionId);
    }
    if (matchedRules.length > 1) {
      return stopped("multiple_transition_matches", transitionId);
    }
    transitionId = matchedRules[0].transition_id;
  }
}
