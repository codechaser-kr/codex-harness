import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { evaluateWorkflowDefinition } from "../../scripts/workflow-definition/evaluator.mjs";
import { normalizeFeatureFixFacts } from "../../scripts/workflow-definition/feature-fix-state-adapter.mjs";
import { parseJsonFile } from "../../scripts/workflow-definition/parser.mjs";
import { validateWorkflowDefinition } from "../../scripts/workflow-definition/validator.mjs";

const definitionUrl = new URL("../../definitions/feature-fix.json", import.meta.url);
const registryUrl = new URL("../../registries/registered-executors.json", import.meta.url);
const schemaUrl = new URL("../../schemas/workflow-definition.schema.json", import.meta.url);
const statesUrl = new URL("./fixtures/feature-fix-states.json", import.meta.url);

async function readJson(url) {
  const result = await parseJsonFile(url);
  assert.equal(result.ok, true, result.ok ? "" : result.error.message);
  return result.value;
}

function observation(factId, value, sourceKind, sourceReference, fieldReference = "facts." + factId) {
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
    observation("feature_fix_issue_closed", true, "github_state", "issue #95"),
    observation("feature_fix_requested", true, "user_input", "request issue #95"),
    observation("fix_plan_proposal_usable", true, "skill_output", "fix-plan"),
    observation("implementation_flow_started", true, "local_state", "workspace"),
    observation("feature_fix_draft_confirmed", true, "user_input", "draft decision"),
    observation("fix_analysis_result_usable", true, "skill_output", "fix-analysis"),
    observation("all_planned_work_units_merged", true, "github_state", "issue #95 linked PRs"),
    observation("feature_fix_issue_created", true, "github_state", "issue #95"),
    observation("fix_analysis_confirmed", true, "user_input", "analysis decision"),
    observation("fix_plan_confirmed", true, "user_input", "fix plan decision"),
    observation("feature_fix_plan_reflected", true, "github_state", "issue #95"),
    observation("all_completion_items_reflected", true, "github_state", "issue #95 completion checklist"),
  ];
}

function assertAtomicFailure(result, reason) {
  assert.equal(result.status, "stopped");
  assert.equal(result.reason, reason);
  assert.deepEqual(result.normalized_fact_state, {});
  assert.deepEqual(result.evidence_by_fact, {});
  for (const error of result.errors) {
    assert.deepEqual(Object.keys(error), ["code", "path", "message"]);
  }
}

function hasError(result, code, path) {
  return result.errors.some((error) => error.code === code && error.path === path);
}

test("feature-fix definition has the exact identity, task IDs, evidence, and executor scopes", async () => {
  const [definition, registry, states] = await Promise.all([readJson(definitionUrl), readJson(registryUrl), readJson(statesUrl)]);
  const schema = JSON.parse(await readFile(schemaUrl, "utf8"));

  assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema");
  assert.deepEqual(
    [definition.workflow_id, definition.version, definition.workflow_kind, definition.target_type],
    ["feature-fix", "1.0.0", "feature_fix", "issue"],
  );
  assert.equal(Object.keys(states).length, 12);
  assert.deepEqual(definition.transitions.map((transition) => transition.task_action_id), [
    "FF-1", "FF-2", "FF-3", "FF-4", "FF-5", "FF-6", "FF-7", "FF-8",
  ]);
  assert.equal(JSON.stringify(definition).includes('"priority"'), false);
  assert.equal(definition.normalized_fact_schema.every((fact) => fact.evidence_required === true), true);

  for (const transition of definition.transitions.slice(0, -1)) {
    assert.deepEqual(transition.next_transition_rules, [{
      condition: null,
      transition_id: definition.transitions[definition.transitions.indexOf(transition) + 1].transition_id,
    }]);
  }
  assert.deepEqual(definition.transitions.at(-1).next_transition_rules, []);

  const expectedScopes = new Map([
    ["issue-creation", "proposal_output"],
    ["fix-analysis", "proposal_output"],
    ["fix-plan", "proposal_output"],
    ["github-simple-executor", "github_state_change"],
  ]);
  for (const [executorId, sideEffectScope] of expectedScopes) {
    const matches = registry.filter((entry) => entry.executor_id === executorId);
    assert.equal(matches.length, 1, executorId);
    assert.equal(matches[0].side_effect_scope, sideEffectScope, executorId);
  }
  assert.equal(definition.transitions.find((item) => item.task_action_id === "FF-6").registered_executor_reference, null);
  assert.equal(definition.transitions.find((item) => item.task_action_id === "FF-8").registered_executor_reference, null);

  const validation = validateWorkflowDefinition(definition);
  assert.equal(validation.valid, true, JSON.stringify(validation.errors));
  assert.deepEqual(validation.errors, []);
});

test("feature-fix keeps common implementation as one handoff without branch, commit, PR, or review loops", async () => {
  const definition = await readJson(definitionUrl);
  const implementationFactIds = definition.normalized_fact_schema
    .map((fact) => fact.fact_id)
    .filter((factId) => factId === "implementation_flow_started"
      || factId === "all_planned_work_units_merged"
      || factId === "all_completion_items_reflected");
  const handoff = definition.transitions.find((transition) => transition.task_action_id === "FF-6");

  assert.deepEqual(implementationFactIds, [
    "implementation_flow_started",
    "all_planned_work_units_merged",
    "all_completion_items_reflected",
  ]);
  assert.deepEqual(handoff.completion_predicate, {
    all: implementationFactIds.map((factId) => ({ fact_id: factId, operator: "equals", value: true })),
  });
  assert.equal(handoff.registered_executor_reference, null);
  assert.equal(definition.transitions.some((transition) => transition.task_action_id.startsWith("FI-")), false);
  assert.equal(definition.transitions.some((transition) => /branch|commit|pull-request|review/.test(transition.transition_id)), false);
});

test("feature-fix representative states resolve to exactly one expected action or terminal", async () => {
  const [definition, states] = await Promise.all([readJson(definitionUrl), readJson(statesUrl)]);
  const definitionBefore = structuredClone(definition);
  const cases = [
    ["new_request", "FF-1", "issue-creation"],
    ["confirmed_draft", "FF-2", "github-simple-executor"],
    ["created_issue", "FF-3", "fix-analysis"],
    ["analysis_output_waiting_for_confirmation", "FF-3", "fix-analysis"],
    ["confirmed_analysis", "FF-4", "fix-plan"],
    ["plan_output_waiting_for_confirmation", "FF-4", "fix-plan"],
    ["confirmed_plan", "FF-5", "github-simple-executor"],
    ["before_implementation_start", "FF-6", null],
    ["implementation_started_waiting_for_merge", "FF-6", null],
    ["work_units_merged_waiting_for_completion_items", "FF-6", null],
    ["implementation_complete_waiting_for_issue_close", "FF-7", "github-simple-executor"],
  ];

  for (const [name, taskActionId, executorReference] of cases) {
    const state = structuredClone(states[name]);
    const stateBefore = structuredClone(state);
    const result = evaluateWorkflowDefinition(definition, state);
    assert.equal(result.status, "action_required", name);
    assert.equal(result.task_action_id, taskActionId, name);
    assert.equal(result.registered_executor_reference, executorReference, name);
    assert.deepEqual(state, stateBefore, name);
  }
  assert.deepEqual(
    evaluateWorkflowDefinition(definition, states.terminal),
    { status: "completed", transition_id: "complete-feature-fix" },
  );
  assert.deepEqual(definition, definitionBefore);
});

test("feature-fix cannot start fix-plan before usable, user-confirmed analysis", async () => {
  const [definition, states] = await Promise.all([readJson(definitionUrl), readJson(statesUrl)]);
  for (const factId of ["fix_analysis_result_usable", "fix_analysis_confirmed"]) {
    const state = structuredClone(states.confirmed_analysis);
    state[factId] = false;
    const result = evaluateWorkflowDefinition(definition, state);
    assert.equal(result.status, "action_required", factId);
    assert.equal(result.task_action_id, "FF-3", factId);
    assert.equal(result.registered_executor_reference, "fix-analysis", factId);
  }
  const ready = evaluateWorkflowDefinition(definition, states.confirmed_analysis);
  assert.equal(ready.task_action_id, "FF-4");
  assert.equal(ready.registered_executor_reference, "fix-plan");
});

test("feature-fix cannot close the issue until all common implementation completion facts are true", async () => {
  const [definition, states] = await Promise.all([readJson(definitionUrl), readJson(statesUrl)]);
  for (const factId of [
    "implementation_flow_started",
    "all_planned_work_units_merged",
    "all_completion_items_reflected",
  ]) {
    const state = structuredClone(states.implementation_complete_waiting_for_issue_close);
    state[factId] = false;
    const result = evaluateWorkflowDefinition(definition, state);
    assert.equal(result.status, "action_required", factId);
    assert.equal(result.task_action_id, "FF-6", factId);
    assert.equal(result.registered_executor_reference, null, factId);
  }
  const ready = evaluateWorkflowDefinition(definition, states.implementation_complete_waiting_for_issue_close);
  assert.equal(ready.task_action_id, "FF-7");
  assert.equal(ready.registered_executor_reference, "github-simple-executor");
});

test("feature-fix adapter accepts exact sources and returns copied facts in definition order", async () => {
  const definition = await readJson(definitionUrl);
  const observations = validObservations();
  const definitionBefore = structuredClone(definition);
  const observationsBefore = structuredClone(observations);
  const result = normalizeFeatureFixFacts(definition, observations);
  const repeatedResult = normalizeFeatureFixFacts(definition, observations);

  assert.equal(result.status, "normalized");
  assert.equal(result.workflow_id, "feature-fix");
  assert.equal(JSON.stringify(result), JSON.stringify(repeatedResult));
  assert.deepEqual(Object.keys(result.normalized_fact_state), definition.normalized_fact_schema.map((fact) => fact.fact_id));
  assert.deepEqual(Object.keys(result.evidence_by_fact), definition.normalized_fact_schema.map((fact) => fact.fact_id));
  assert.deepEqual(result.evidence_by_fact.fix_analysis_result_usable, [{
    source_kind: "skill_output",
    source_reference: "fix-analysis",
    field_reference: "facts.fix_analysis_result_usable",
  }]);
  assert.deepEqual(result.evidence_by_fact.fix_plan_proposal_usable, [{
    source_kind: "skill_output",
    source_reference: "fix-plan",
    field_reference: "facts.fix_plan_proposal_usable",
  }]);
  assert.notEqual(result.evidence_by_fact.feature_fix_requested[0], observations[1]);
  assert.deepEqual(definition, definitionBefore);
  assert.deepEqual(observations, observationsBefore);
});

test("feature-fix adapter rejects workflow, source, and exact skill-reference mismatches atomically", async () => {
  const definition = await readJson(definitionUrl);
  const wrongWorkflow = structuredClone(definition);
  wrongWorkflow.workflow_id = "feature-change";
  const mismatch = normalizeFeatureFixFacts(wrongWorkflow, []);
  assertAtomicFailure(mismatch, "workflow_id_mismatch");
  assert.equal(hasError(mismatch, "workflow_id.mismatch", "/workflow_id"), true);

  const wrongSource = normalizeFeatureFixFacts(definition, [
    observation("fix_analysis_confirmed", true, "github_state", "issue #95"),
  ]);
  assertAtomicFailure(wrongSource, "invalid_observations");
  assert.equal(hasError(wrongSource, "observation.source_kind.mismatch", "/observations/0/source_kind"), true);

  for (const [factId, sourceReference] of [
    ["fix_analysis_result_usable", "fix-plan"],
    ["fix_plan_proposal_usable", "fix-analysis"],
  ]) {
    const wrongExecutor = normalizeFeatureFixFacts(definition, [
      observation(factId, true, "skill_output", sourceReference),
    ]);
    assertAtomicFailure(wrongExecutor, "invalid_observations");
    assert.equal(hasError(wrongExecutor, "observation.source_reference.mismatch", "/observations/0/source_reference"), true);
  }
});

test("feature-fix adapter rejects wrong types, values outside the domain, unknown facts, and duplicates atomically", async () => {
  const definition = await readJson(definitionUrl);
  const domainDefinition = structuredClone(definition);
  domainDefinition.normalized_fact_schema
    .find((fact) => fact.fact_id === "feature_fix_requested").allowed_values = [true];

  const typeResult = normalizeFeatureFixFacts(definition, [
    observation("feature_fix_requested", "true", "user_input", "request"),
  ]);
  assertAtomicFailure(typeResult, "invalid_fact_candidates");
  assert.equal(hasError(typeResult, "candidate.value.type_mismatch", "/candidates/0/value"), true);

  const domainResult = normalizeFeatureFixFacts(domainDefinition, [
    observation("feature_fix_requested", false, "user_input", "request"),
  ]);
  assertAtomicFailure(domainResult, "invalid_fact_candidates");
  assert.equal(hasError(domainResult, "candidate.value.not_allowed", "/candidates/0/value"), true);

  const identityResult = normalizeFeatureFixFacts(definition, [
    observation("unknown", true, "github_state", "issue #95"),
    observation("feature_fix_requested", true, "user_input", "request"),
    observation("feature_fix_requested", true, "user_input", "request"),
  ]);
  assertAtomicFailure(identityResult, "invalid_fact_candidates");
  assert.equal(hasError(identityResult, "candidate.fact.unknown", "/candidates/0/fact_id"), true);
  assert.equal(hasError(identityResult, "candidate.fact_id.duplicate", "/candidates/2/fact_id"), true);
});

test("feature-fix adapter rejects open and malformed observations atomically without mutation", async () => {
  const definition = await readJson(definitionUrl);
  const observations = [
    { ...observation("feature_fix_requested", true, "user_input", "request"), extra: true },
    { fact_id: "feature_fix_issue_created", value: true, source_kind: "github_state", source_reference: "issue #95" },
    null,
  ];
  const definitionBefore = structuredClone(definition);
  const observationsBefore = structuredClone(observations);

  const result = normalizeFeatureFixFacts(definition, observations);

  assertAtomicFailure(result, "invalid_observations");
  assert.equal(hasError(result, "object.additional_property", "/observations/0/extra"), true);
  assert.equal(hasError(result, "observation.required", "/observations/1/field_reference"), true);
  assert.equal(hasError(result, "observation.type", "/observations/2"), true);
  assert.deepEqual(definition, definitionBefore);
  assert.deepEqual(observations, observationsBefore);
});
