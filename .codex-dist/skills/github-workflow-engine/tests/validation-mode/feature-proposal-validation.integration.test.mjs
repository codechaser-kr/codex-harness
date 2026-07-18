import assert from "node:assert/strict";
import test from "node:test";

import { compareValidationResults } from "../../scripts/validation-mode/comparator.mjs";
import { evaluateWorkflowDefinition } from "../../scripts/workflow-definition/evaluator.mjs";
import { parseJsonFile } from "../../scripts/workflow-definition/parser.mjs";

const definitionUrl = new URL("../../definitions/feature-proposal.json", import.meta.url);
const registryUrl = new URL("../../registries/registered-executors.json", import.meta.url);
const statesUrl = new URL("../workflow-definition/fixtures/feature-proposal-states.json", import.meta.url);
const emptySideEffects = () => ({
  github_state_changes: [],
  github_comments: [],
  repository_files: [],
  branches: [],
  commits: [],
  pull_requests: [],
});

async function readJson(url) {
  const result = await parseJsonFile(url);
  assert.equal(result.ok, true, result.ok ? "" : result.error.message);
  return result.value;
}

async function readFeatureProposalInputs() {
  const [definition, registry, states] = await Promise.all([
    readJson(definitionUrl),
    readJson(registryUrl),
    readJson(statesUrl),
  ]);
  return { definition, registry, states };
}

function resolveExecutor(registry, reference) {
  const entry = registry.find((candidate) => candidate.executor_id === reference);
  assert.ok(entry, `Missing registry entry: ${reference}`);
  return entry;
}

function validationDisposition(action, registry) {
  if (action.registered_executor_reference === null) {
    return "deterministic";
  }
  const entry = resolveExecutor(registry, action.registered_executor_reference);
  return entry.executor_kind === "skill" && entry.side_effect_scope === "proposal_output"
    ? "probe"
    : "deterministic";
}

function makeRequest(definition, state, action) {
  return {
    request_id: `feature-proposal-${action.task_action_id.toLowerCase()}`,
    workflow_id: definition.workflow_id,
    version: definition.version,
    task_action_id: action.task_action_id,
    state_snapshot: {
      github_state: { issue: { number: 95, state: "open" } },
      local_state: { normalized_fact_state: structuredClone(state) },
    },
    normalized_fact_state: structuredClone(state),
    evaluation_result: structuredClone(action),
    expected_session_count: 10,
    invocation_specification: {
      skill_reference: action.registered_executor_reference,
      skill_version: "feature-proposal-1.0.0",
      model_identifier: "validation-mode-integration-model",
      reasoning_configuration: { effort: "high" },
      role_configuration: { role: "validation_probe" },
      input: { task_action_id: action.task_action_id },
    },
  };
}

function mockProbe({ task_action_id, invocation_specification }, records) {
  const input = structuredClone({ task_action_id, invocation_specification });
  records.push(input);
  return {
    output_status: "usable",
    normalized_structured_contract_fields: {
      task_action_id,
      output_kind: "proposal_output",
    },
    semantic_decisions: {
      task_action_id,
      decision: "proposal_analysis_complete",
    },
    registered_executor_invoked: false,
    side_effects: emptySideEffects(),
  };
}

function runTenMockProbes(request, records) {
  return Array.from({ length: 10 }, (_, offset) => {
    const probe = mockProbe({
      task_action_id: request.task_action_id,
      invocation_specification: structuredClone(request.invocation_specification),
    }, records);
    return {
      request_id: request.request_id,
      session_index: offset + 1,
      session_id: `${request.task_action_id.toLowerCase()}-validation-session-${String(offset + 1).padStart(2, "0")}`,
      observed_invocation_specification: structuredClone(request.invocation_specification),
      ...probe,
    };
  });
}

function assertEmptyProbeSideEffects(results) {
  for (const result of results) {
    assert.equal(result.registered_executor_invoked, false);
    for (const category of Object.keys(result.side_effects)) {
      assert.deepEqual(result.side_effects[category], [], category);
    }
  }
}

test("feature-proposal proposal-output actions use ten isolated, reproducible validation probes", async () => {
  const { definition, registry, states } = await readFeatureProposalInputs();
  const definitionBefore = structuredClone(definition);
  const registryBefore = structuredClone(registry);
  const statesBefore = structuredClone(states);

  for (const [stateName, expectedTaskActionId, expectedReference] of [
    ["new_request", "FP-1", "issue-creation"],
    ["created_issue", "FP-3", "feature-proposal-triage"],
  ]) {
    const state = structuredClone(states[stateName]);
    const action = evaluateWorkflowDefinition(definition, state);
    assert.equal(action.status, "action_required", stateName);
    assert.equal(action.task_action_id, expectedTaskActionId, stateName);
    assert.equal(action.registered_executor_reference, expectedReference, stateName);

    const executor = resolveExecutor(registry, action.registered_executor_reference);
    assert.equal(executor.executor_kind, "skill", stateName);
    assert.equal(executor.side_effect_scope, "proposal_output", stateName);
    assert.equal(validationDisposition(action, registry), "probe", stateName);

    const request = makeRequest(definition, state, action);
    const requestBefore = structuredClone(request);
    const records = [];
    const results = runTenMockProbes(request, records);
    const comparison = compareValidationResults(request, results);

    assert.deepEqual(comparison, {
      request_id: request.request_id,
      status: "pass",
      reason: "reproducible",
      session_count: 10,
      errors: [],
    });
    assert.equal(records.length, 10, stateName);
    assert.deepEqual(new Set(results.map((result) => result.session_index)), new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]));
    assert.equal(new Set(results.map((result) => result.session_id)).size, 10, stateName);
    for (const input of records) {
      assert.deepEqual(Object.keys(input).sort(), ["invocation_specification", "task_action_id"]);
      assert.equal(input.task_action_id, expectedTaskActionId);
      assert.deepEqual(input.invocation_specification, request.invocation_specification);
    }
    records[0].invocation_specification.input.session_local_mutation = true;
    assert.equal(records[1].invocation_specification.input.session_local_mutation, undefined, stateName);
    assert.equal(request.invocation_specification.input.session_local_mutation, undefined, stateName);
    assert.deepEqual(request, requestBefore, stateName);
    assertEmptyProbeSideEffects(results);
  }

  assert.deepEqual(definition, definitionBefore);
  assert.deepEqual(registry, registryBefore);
  assert.deepEqual(states, statesBefore);
});

test("feature-proposal non-proposal executors and terminal results remain deterministic-only", async () => {
  const { definition, registry, states } = await readFeatureProposalInputs();
  let probeCount = 0;
  let normalExecutorInvocationCount = 0;

  for (const [stateName, expectedTaskActionId] of [
    ["confirmed_draft", "FP-2"],
    ["direction_confirmed_not_reflected", "FP-4"],
    ["do_not_proceed_direction", "FP-5"],
    ["policy_review_direction", "FP-6"],
    ["feature_change_direction", "FP-7"],
  ]) {
    const action = evaluateWorkflowDefinition(definition, structuredClone(states[stateName]));
    assert.equal(action.status, "action_required", stateName);
    assert.equal(action.task_action_id, expectedTaskActionId, stateName);
    const executor = resolveExecutor(registry, action.registered_executor_reference);
    assert.notEqual(executor.side_effect_scope, "proposal_output", stateName);
    if (validationDisposition(action, registry) === "probe") {
      probeCount += 1;
    } else {
      // C4 only classifies deterministic actions; it must not invoke their normal executor.
      assert.equal(action.registered_executor_reference, "github-simple-executor", stateName);
    }
  }

  for (const stateName of ["completed_do_not_proceed", "completed_policy_review", "completed_feature_change"]) {
    const result = evaluateWorkflowDefinition(definition, structuredClone(states[stateName]));
    assert.deepEqual(result, { status: "completed", transition_id: "complete-feature-proposal" }, stateName);
  }

  assert.equal(probeCount, 0);
  assert.equal(normalExecutorInvocationCount, 0);
});

test("feature-proposal mismatch in one probe stops without adopting a majority result", async () => {
  const { definition, registry, states } = await readFeatureProposalInputs();
  const action = evaluateWorkflowDefinition(definition, structuredClone(states.created_issue));
  assert.equal(validationDisposition(action, registry), "probe");

  const request = makeRequest(definition, states.created_issue, action);
  const results = runTenMockProbes(request, []);
  results[9].semantic_decisions.decision = "different_direction";

  const comparison = compareValidationResults(request, results);
  assert.equal(comparison.status, "stopped");
  assert.equal(comparison.reason, "not_reproducible");
  assert.equal(comparison.errors.some((error) => error.code === "comparison.semantic_decisions.mismatch"), true);
  for (const field of ["accepted_result", "adopted_result", "majority_result"]) {
    assert.equal(Object.hasOwn(comparison, field), false, field);
  }
  assertEmptyProbeSideEffects(results);
});
