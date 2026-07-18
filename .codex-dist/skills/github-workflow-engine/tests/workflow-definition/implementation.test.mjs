import assert from "node:assert/strict";
import test from "node:test";

import { evaluateWorkflowDefinition } from "../../scripts/workflow-definition/evaluator.mjs";
import { normalizeImplementationFacts } from "../../scripts/workflow-definition/implementation-state-adapter.mjs";
import { parseJsonFile } from "../../scripts/workflow-definition/parser.mjs";
import { validateWorkflowDefinition } from "../../scripts/workflow-definition/validator.mjs";

const definitionUrl = new URL("../../definitions/implementation.json", import.meta.url);
const registryUrl = new URL("../../registries/registered-executors.json", import.meta.url);
const statesUrl = new URL("./fixtures/implementation-states.json", import.meta.url);

async function readJson(url) {
  const result = await parseJsonFile(url);
  assert.equal(result.ok, true, result.ok ? "" : result.error.message);
  return result.value;
}

function observationsFromFixture(fixture) {
  return Object.entries(fixture.observation_sources).map(([factId, [value, sourceKind, sourceReference]]) => ({
    fact_id: factId,
    value,
    source_kind: sourceKind,
    source_reference: sourceReference,
    field_reference: `facts.${factId}`,
  }));
}

function assertAtomicFailure(result, reason) {
  assert.equal(result.status, "stopped");
  assert.equal(result.reason, reason);
  assert.deepEqual(result.normalized_fact_state, {});
  assert.deepEqual(result.evidence_by_fact, {});
}

function hasError(result, code, path) {
  return result.errors.some((error) => error.code === code && error.path === path);
}

test("implementation definition preserves FI mapping, executor boundaries, and valid branching graph", async () => {
  const [definition, registry, fixture] = await Promise.all([readJson(definitionUrl), readJson(registryUrl), readJson(statesUrl)]);

  assert.deepEqual(
    [definition.workflow_id, definition.version, definition.workflow_kind, definition.target_type],
    ["implementation", "1.0.0", "implementation", "repository"],
  );
  assert.deepEqual(definition.transitions.map((transition) => transition.task_action_id), fixture.task_action_ids);
  assert.equal(new Set(fixture.task_action_ids).size, 36);
  assert.equal(JSON.stringify(definition).includes('"priority"'), false);
  assert.equal(definition.normalized_fact_schema.every((fact) => fact.evidence_required === true), true);
  assert.deepEqual(Object.keys(fixture.observation_sources), definition.normalized_fact_schema.map((fact) => fact.fact_id));

  for (const [taskActionId, executorReference] of Object.entries(fixture.executor_references)) {
    assert.equal(definition.transitions.find((transition) => transition.task_action_id === taskActionId)?.registered_executor_reference, executorReference);
  }
  for (const taskActionId of fixture.null_executor_actions) {
    assert.equal(definition.transitions.find((transition) => transition.task_action_id === taskActionId)?.registered_executor_reference, null);
  }
  for (const executorId of new Set(Object.values(fixture.executor_references))) {
    assert.equal(registry.filter((entry) => entry.executor_id === executorId).length, 1, executorId);
  }
  assert.equal(definition.transitions.find((transition) => transition.task_action_id === "FI-6").user_decision_specification.required, true);
  assert.equal(definition.transitions.find((transition) => transition.task_action_id === "FI-27").user_decision_specification.required, true);
  assert.equal(definition.transitions.find((transition) => transition.task_action_id === "FI-7").registered_executor_reference, null);
  assert.equal(definition.transitions.find((transition) => transition.task_action_id === "FI-28").registered_executor_reference, null);
  for (const transition of definition.transitions.filter((item) => item.user_decision_specification.required)) {
    assert.equal(transition.user_decision_specification.allow_free_form, true, transition.task_action_id);
  }

  const commentPosting = definition.transitions.find((transition) => transition.task_action_id === "FI-20");
  assert.deepEqual(commentPosting.user_decision_specification.options.map((option) => option.decision_id), [
    "reassign_review_thread_location",
    "reclassify_non_actionable_feedback",
  ]);
  assert.equal(commentPosting.user_decision_specification.options.some((option) => option.decision_id === "post_as_drafted"), false);
  assert.deepEqual(
    definition.normalized_fact_schema.find((fact) => fact.fact_id === "review_comment_posting_direction").allowed_values,
    ["reassign_review_thread_location", "reclassify_non_actionable_feedback"],
  );

  const feedbackDirection = definition.transitions.find((transition) => transition.task_action_id === "FI-25");
  assert.deepEqual(feedbackDirection.user_decision_specification.options.map((option) => option.decision_id), ["accept_and_fix", "reject"]);
  assert.deepEqual(
    definition.normalized_fact_schema.find((fact) => fact.fact_id === "review_feedback_direction").allowed_values,
    ["accept_and_fix", "reject", "other_requires_file_change", "other_without_file_change"],
  );
  assert.deepEqual(feedbackDirection.next_transition_rules.map((rule) => rule.transition_id), [
    "apply-feedback-fix", "apply-feedback-fix", "post-feedback-result-comment", "post-feedback-result-comment",
  ]);

  const nextCommit = definition.transitions.find((transition) => transition.task_action_id === "FI-8");
  assert.deepEqual(nextCommit.next_transition_rules, [
    { condition: { fact_id: "implementation_progress", operator: "equals", value: "next_commit_unit" }, transition_id: "implement-work-unit" },
    { condition: { fact_id: "implementation_progress", operator: "equals", value: "all_work_units_completed" }, transition_id: "push-implementation-branch" },
  ]);

  const validation = validateWorkflowDefinition(definition);
  assert.equal(validation.valid, true, JSON.stringify(validation.errors));
  assert.deepEqual(validation.errors, []);
});

test("implementation branch and repeat states resolve deterministically", async () => {
  const [definition, fixture] = await Promise.all([readJson(definitionUrl), readJson(statesUrl)]);
  for (const scenario of fixture.branch_cases) {
    const stateBefore = structuredClone(scenario.state);
    const result = evaluateWorkflowDefinition(definition, scenario.state, {
      currentTransitionId: scenario.current_transition_id,
    });
    assert.equal(result.status, "action_required", scenario.name);
    assert.equal(result.task_action_id, scenario.task_action_id, scenario.name);
    assert.deepEqual(scenario.state, stateBefore, scenario.name);
  }
});

test("implementation adapter normalizes exact source contracts in definition order without inference", async () => {
  const [definition, fixture] = await Promise.all([readJson(definitionUrl), readJson(statesUrl)]);
  const observations = observationsFromFixture(fixture);
  const definitionBefore = structuredClone(definition);
  const observationsBefore = structuredClone(observations);

  const result = normalizeImplementationFacts(definition, observations);
  assert.equal(result.status, "normalized");
  assert.equal(result.workflow_id, "implementation");
  assert.deepEqual(Object.keys(result.normalized_fact_state), definition.normalized_fact_schema.map((fact) => fact.fact_id));
  assert.deepEqual(Object.keys(result.evidence_by_fact), definition.normalized_fact_schema.map((fact) => fact.fact_id));
  assert.deepEqual(result.evidence_by_fact.review_mode, [{
    source_kind: "user_input",
    source_reference: "review mode decision",
    field_reference: "facts.review_mode",
  }]);
  assert.deepEqual(result.evidence_by_fact.review_feedback_inventory, [{
    source_kind: "github_state",
    source_reference: "PR #99 review threads",
    field_reference: "facts.review_feedback_inventory",
  }]);
  assert.deepEqual(result.evidence_by_fact.remaining_feedback_status, [{
    source_kind: "local_state",
    source_reference: "processed feedback comparison",
    field_reference: "facts.remaining_feedback_status",
  }]);
  assert.deepEqual(normalizeImplementationFacts(definition, observations), result);
  assert.deepEqual(definition, definitionBefore);
  assert.deepEqual(observations, observationsBefore);

  const partial = normalizeImplementationFacts(definition, [observations[0]]);
  assert.equal(partial.status, "normalized");
  assert.deepEqual(partial.normalized_fact_state, { implementation_requested: true });
  assert.deepEqual(Object.keys(partial.evidence_by_fact), ["implementation_requested"]);
});

test("implementation adapter fail-closes contract, source, duplicate, conflicting, and malformed observations", async () => {
  const [definition, fixture] = await Promise.all([readJson(definitionUrl), readJson(statesUrl)]);
  const observations = observationsFromFixture(fixture);

  const missingContractDefinition = structuredClone(definition);
  missingContractDefinition.normalized_fact_schema.push({
    ...structuredClone(definition.normalized_fact_schema[0]),
    fact_id: "uncontracted_fact",
  });
  const missingContract = normalizeImplementationFacts(missingContractDefinition, observations);
  assertAtomicFailure(missingContract, "source_contract_mismatch");
  assert.equal(hasError(missingContract, "source_contract.missing", `/normalized_fact_schema/${definition.normalized_fact_schema.length}/fact_id`), true);

  const missingFactDefinition = structuredClone(definition);
  const [removedFact] = missingFactDefinition.normalized_fact_schema.splice(0, 1);
  const unexpectedContract = normalizeImplementationFacts(missingFactDefinition, observations);
  assertAtomicFailure(unexpectedContract, "source_contract_mismatch");
  assert.equal(hasError(unexpectedContract, "source_contract.unexpected", `/source_contracts/${removedFact.fact_id}`), true);

  const reviewMode = observations.find((observation) => observation.fact_id === "review_mode");
  const wrongSource = normalizeImplementationFacts(definition, [{ ...reviewMode, source_kind: "github_state" }]);
  assertAtomicFailure(wrongSource, "invalid_observations");
  assert.equal(hasError(wrongSource, "observation.source_kind.mismatch", "/observations/0/source_kind"), true);

  const duplicateConflict = normalizeImplementationFacts(definition, [
    observations[0],
    { ...observations[0], value: false },
  ]);
  assertAtomicFailure(duplicateConflict, "invalid_fact_candidates");
  assert.equal(hasError(duplicateConflict, "candidate.fact_id.duplicate", "/candidates/1/fact_id"), true);

  const malformed = normalizeImplementationFacts(definition, [{ ...observations[0], field_reference: "" }]);
  assertAtomicFailure(malformed, "invalid_observations");
  assert.equal(hasError(malformed, "observation.field_reference.invalid", "/observations/0/field_reference"), true);
});
