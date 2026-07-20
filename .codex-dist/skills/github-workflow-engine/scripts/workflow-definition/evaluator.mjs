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

function factValueType(value) {
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "string") return "string";
  return Number.isInteger(value) ? "integer" : undefined;
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

  const facts = new Map(Object.entries(definition.facts));
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
    const valueType = factValueType(fact[0]);
    if (factValueType(value) !== valueType) {
      errors.push({
        code: "state.value.type_mismatch",
        path,
        message: `Value must match fact type ${valueType}.`,
      });
      continue;
    }
    if (!fact.some((allowedValue) => allowedValue === value)) {
      errors.push({
        code: "state.value.not_allowed",
        path,
        message: "Value is not in the fact allowed_values domain.",
      });
    }
  }
  return errors;
}

function stopped(reason, taskActionId, errors) {
  const result = {
    status: "stopped",
    reason,
    task_action_id: taskActionId ?? null,
  };
  if (errors !== undefined) {
    result.errors = errors;
  }
  return result;
}

/**
 * Evaluates one workflow definition against an immutable normalized fact state.
 */
export function evaluateWorkflowDefinition(definition, normalizedFactState, { currentTaskActionId } = {}) {
  const validation = validateWorkflowDefinition(definition);
  if (!validation.valid) {
    return stopped("invalid_definition", null, validation.errors);
  }

  const stateErrors = validateNormalizedFactState(definition, normalizedFactState);
  if (stateErrors.length > 0) {
    return stopped("invalid_state", null, stateErrors);
  }

  const transitions = new Map(definition.transitions.map((transition) => [transition.task_action_id, transition]));
  let taskActionId = currentTaskActionId ?? definition.entry_task_action_id;
  const visited = new Set();

  while (true) {
    if (!transitions.has(taskActionId)) {
      return stopped("current_task_action_not_found", taskActionId);
    }
    if (visited.has(taskActionId)) {
      return stopped("evaluation_cycle", taskActionId);
    }
    visited.add(taskActionId);

    const transition = transitions.get(taskActionId);
    if (!matchesExpressionState(transition.normalized_fact_conditions, normalizedFactState)) {
      return stopped("current_task_action_condition_not_met", taskActionId);
    }
    if (!matchesExpressionState(transition.completion_predicate, normalizedFactState)) {
      return {
        status: "action_required",
        task_action_id: transition.task_action_id,
        user_decision_options: transition.user_decision_options,
        executor_reference: transition.executor_reference,
        completion_predicate: transition.completion_predicate,
      };
    }
    if (transition.next_transition_rules.length === 0) {
      return {
        status: "completed",
        task_action_id: taskActionId,
      };
    }

    const matchedRules = transition.next_transition_rules.filter(
      (rule) => rule.condition === null || matchesExpressionState(rule.condition, normalizedFactState),
    );
    if (matchedRules.length === 0) {
      return stopped("no_transition_match", taskActionId);
    }
    if (matchedRules.length > 1) {
      return stopped("multiple_transition_matches", taskActionId);
    }
    taskActionId = matchedRules[0].task_action_id;
  }
}
