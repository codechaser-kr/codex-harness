import assert from "node:assert/strict";
import test from "node:test";

import { evaluateWorkflowDefinition } from "../../scripts/workflow-definition/evaluator.mjs";
import { normalizeFeatureChangeFacts } from "../../scripts/workflow-definition/feature-change-state-adapter.mjs";
import { parseJsonFile } from "../../scripts/workflow-definition/parser.mjs";
import { validateWorkflowDefinition } from "../../scripts/workflow-definition/validator.mjs";

const definitionUrl = new URL("../../definitions/feature-change.json", import.meta.url);
const statesUrl = new URL("./fixtures/feature-change-states.json", import.meta.url);

async function readJson(url) {
  const result = await parseJsonFile(url);
  assert.equal(result.ok, true, result.ok ? "" : result.error.message);
  return result.value;
}

function observation(factId, value, sourceKind, sourceReference, fieldReference = `facts.${factId}`) {
  return {
    fact_id: factId,
    value,
    source_kind: sourceKind,
    source_reference: sourceReference,
    field_reference: fieldReference,
  };
}

function validObservations() {
  return [
    observation("feature_change_issue_closed", true, "github_state", "issue #95"),
    observation("feature_change_requested", true, "user_input", "request issue #95"),
    observation("feature_plan_proposal_usable", true, "skill_output", "feature-plan"),
    observation("implementation_flow_started", true, "local_state", "workspace"),
    observation("feature_change_draft_confirmed", true, "user_input", "draft decision"),
    observation("all_planned_work_units_merged", true, "github_state", "issue #95 linked PRs"),
    observation("feature_change_issue_created", true, "github_state", "issue #95"),
    observation("feature_plan_confirmed", true, "user_input", "feature plan decision"),
    observation("feature_plan_reflected", true, "github_state", "issue #95"),
    observation("all_completion_items_reflected", true, "github_state", "issue #95 completion checklist"),
  ];
}

function assertAtomicFailure(result, reason) {
  assert.equal(result.status, "stopped");
  if (reason) {
    assert.equal(result.reason, reason);
  }
  assert.deepEqual(result.normalized_fact_state, {});
  assert.deepEqual(result.evidence_by_fact, {});
  for (const error of result.errors) {
    assert.deepEqual(Object.keys(error), ["code", "path", "message"]);
  }
}

function hasError(result, code, path) {
  return result.errors.some((error) => error.code === code && error.path === path);
}

test("feature-change definition passes C2/C3 validation with direct executor references", async () => {
  const [definition, states] = await Promise.all([readJson(definitionUrl), readJson(statesUrl)]);
  assert.equal(definition.workflow_id, "feature-change");
  assert.equal(Object.keys(states).length, 11);
  assert.deepEqual(definition.transitions.map((transition) => transition.task_action_id), [
    "FC-1", "FC-2", "FC-3", "FC-4", "FC-5", "FC-6", "FC-7",
  ]);
  assert.equal(JSON.stringify(definition).includes('"priority"'), false);
  assert.equal(Object.keys(definition.facts).length, 10);

  for (const transition of definition.transitions.slice(0, -1)) {
    assert.deepEqual(transition.next_transition_rules, [{
      condition: null,
      task_action_id: definition.transitions[definition.transitions.indexOf(transition) + 1].task_action_id,
    }]);
  }
  assert.deepEqual(definition.transitions.at(-1).next_transition_rules, []);

  assert.equal(definition.transitions.find((item) => item.task_action_id === "FC-5").executor_reference, null);
  assert.equal(definition.transitions.find((item) => item.task_action_id === "FC-7").executor_reference, null);

  const validation = validateWorkflowDefinition(definition);
  assert.equal(validation.valid, true, JSON.stringify(validation.errors));
  assert.deepEqual(validation.errors, []);
});

test("feature-change keeps common implementation as a handoff without copying branch, commit, or PR transitions", async () => {
  const definition = await readJson(definitionUrl);
  const implementationFactIds = Object.keys(definition.facts)
    .filter((factId) => factId === "implementation_flow_started"
      || factId === "all_planned_work_units_merged"
      || factId === "all_completion_items_reflected");
  const handoff = definition.transitions.find((transition) => transition.task_action_id === "FC-5");

  assert.deepEqual(implementationFactIds, [
    "implementation_flow_started",
    "all_planned_work_units_merged",
    "all_completion_items_reflected",
  ]);
  assert.deepEqual(handoff.completion_predicate, {
    all: implementationFactIds.map((factId) => ({ fact_id: factId, operator: "equals", value: true })),
  });
  assert.equal(handoff.executor_reference, null);
  assert.equal(definition.transitions.some((transition) => transition.task_action_id.startsWith("FI-")), false);
  assert.equal(definition.transitions.some((transition) => transition.task_action_id.startsWith("FI-")), false);
});

test("feature-change representative entry states resolve to exactly one expected action or terminal", async () => {
  const [definition, states] = await Promise.all([readJson(definitionUrl), readJson(statesUrl)]);
  const definitionBefore = structuredClone(definition);
  const cases = [
    ["new_request", "FC-1", "issue-creation"],
    ["confirmed_draft", "FC-2", "github-simple-executor"],
    ["created_issue", "FC-3", "feature-plan"],
    ["updated_open_issue_from_policy_review", "FC-3", "feature-plan"],
    ["plan_proposal_waiting_for_confirmation", "FC-3", "feature-plan"],
    ["confirmed_feature_plan", "FC-4", "github-simple-executor"],
    ["before_implementation_start", "FC-5", null],
    ["implementation_started_waiting_for_merge", "FC-5", null],
    ["planned_work_merged_waiting_for_completion_items", "FC-5", null],
    ["implementation_complete_waiting_for_issue_close", "FC-6", "github-simple-executor"],
  ];

  for (const [name, taskActionId, executorReference] of cases) {
    const state = structuredClone(states[name]);
    const stateBefore = structuredClone(state);
    const result = evaluateWorkflowDefinition(definition, state);
    assert.equal(result.status, "action_required", name);
    assert.equal(result.task_action_id, taskActionId, name);
    assert.equal(result.executor_reference, executorReference, name);
    assert.deepEqual(state, stateBefore, name);
  }
  assert.deepEqual(
    evaluateWorkflowDefinition(definition, states.terminal),
    { status: "completed", task_action_id: "FC-7" },
  );
  assert.deepEqual(definition, definitionBefore);
});

test("feature-change adapter maps observations in definition order and preserves copied evidence", async () => {
  const definition = await readJson(definitionUrl);
  const observations = validObservations();
  const definitionBefore = structuredClone(definition);
  const observationsBefore = structuredClone(observations);
  const result = normalizeFeatureChangeFacts(definition, observations);
  const repeatedResult = normalizeFeatureChangeFacts(definition, observations);

  assert.equal(result.status, "normalized");
  assert.equal(result.workflow_id, "feature-change");
  assert.equal(JSON.stringify(result), JSON.stringify(repeatedResult));
  assert.deepEqual(Object.keys(result.normalized_fact_state), Object.keys(definition.facts));
  assert.deepEqual(Object.keys(result.evidence_by_fact), Object.keys(definition.facts));
  assert.deepEqual(result.evidence_by_fact.feature_plan_proposal_usable, [{
    source_kind: "skill_output",
    source_reference: "feature-plan",
    field_reference: "facts.feature_plan_proposal_usable",
  }]);
  assert.notEqual(result.evidence_by_fact.feature_change_requested[0], observations[1]);
  assert.deepEqual(definition, definitionBefore);
  assert.deepEqual(observations, observationsBefore);
});

test("feature-change adapter rejects missing and unexpected source contracts before observation validation", async () => {
  const definition = await readJson(definitionUrl);
  const missingContractDefinition = structuredClone(definition);
  missingContractDefinition.facts.uncontracted_fact = [true, false];

  const missingContract = normalizeFeatureChangeFacts(missingContractDefinition, null);
  assertAtomicFailure(missingContract, "source_contract_mismatch");
  assert.deepEqual(missingContract.errors, [{
    code: "source_contract.missing",
    path: "/facts/uncontracted_fact",
    message: "Missing source contract for fact_id uncontracted_fact.",
  }]);
  assert.deepEqual(normalizeFeatureChangeFacts(missingContractDefinition, null), missingContract);

  const unexpectedContractDefinition = structuredClone(definition);
  const removedFactId = Object.keys(unexpectedContractDefinition.facts)[0];
  delete unexpectedContractDefinition.facts[removedFactId];
  const unexpectedContract = normalizeFeatureChangeFacts(unexpectedContractDefinition, null);
  assertAtomicFailure(unexpectedContract, "source_contract_mismatch");
  assert.deepEqual(unexpectedContract.errors, [{
    code: "source_contract.unexpected",
    path: `/source_contracts/${removedFactId}`,
    message: `Unexpected source contract for fact_id ${removedFactId}.`,
  }]);
  assert.deepEqual(normalizeFeatureChangeFacts(unexpectedContractDefinition, null), unexpectedContract);
});

test("feature-change adapter rejects workflow mismatch, wrong sources, and wrong feature-plan references atomically", async () => {
  const definition = await readJson(definitionUrl);
  const wrongWorkflow = structuredClone(definition);
  wrongWorkflow.workflow_id = "policy-review";
  const mismatch = normalizeFeatureChangeFacts(wrongWorkflow, []);
  assertAtomicFailure(mismatch, "workflow_id_mismatch");
  assert.equal(hasError(mismatch, "workflow_id.mismatch", "/workflow_id"), true);

  const wrongSource = normalizeFeatureChangeFacts(definition, [
    observation("feature_plan_confirmed", true, "github_state", "issue #95"),
  ]);
  assertAtomicFailure(wrongSource, "invalid_observations");
  assert.equal(hasError(wrongSource, "observation.source_kind.mismatch", "/observations/0/source_kind"), true);

  const wrongFeaturePlan = normalizeFeatureChangeFacts(definition, [
    observation("feature_plan_proposal_usable", true, "skill_output", "policy-plan"),
  ]);
  assertAtomicFailure(wrongFeaturePlan, "invalid_observations");
  assert.equal(hasError(wrongFeaturePlan, "observation.source_reference.mismatch", "/observations/0/source_reference"), true);
});

test("feature-change adapter delegates unknown and duplicate fact rejection to the C1 adapter", async () => {
  const definition = await readJson(definitionUrl);
  const result = normalizeFeatureChangeFacts(definition, [
    observation("unknown", true, "github_state", "issue #95"),
    observation("feature_change_requested", true, "user_input", "request"),
    observation("feature_change_requested", true, "user_input", "request"),
  ]);

  assertAtomicFailure(result, "invalid_fact_candidates");
  assert.equal(hasError(result, "candidate.fact.unknown", "/candidates/0/fact_id"), true);
  assert.equal(hasError(result, "candidate.fact_id.duplicate", "/candidates/2/fact_id"), true);
});

test("feature-change adapter rejects open and malformed observations without mutation", async () => {
  const definition = await readJson(definitionUrl);
  const observations = [
    { ...observation("feature_change_requested", true, "user_input", "request"), extra: true },
    { fact_id: "feature_change_issue_created", value: true, source_kind: "github_state", source_reference: "issue #95" },
    null,
  ];
  const definitionBefore = structuredClone(definition);
  const observationsBefore = structuredClone(observations);

  const result = normalizeFeatureChangeFacts(definition, observations);

  assertAtomicFailure(result, "invalid_observations");
  assert.equal(hasError(result, "object.additional_property", "/observations/0/extra"), true);
  assert.equal(hasError(result, "observation.required", "/observations/1/field_reference"), true);
  assert.equal(hasError(result, "observation.type", "/observations/2"), true);
  assert.deepEqual(definition, definitionBefore);
  assert.deepEqual(observations, observationsBefore);
});
