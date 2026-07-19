import assert from "node:assert/strict";
import test from "node:test";

import { compareValidationResults } from "../../scripts/validation-mode/comparator.mjs";
import { evaluateWorkflowDefinition } from "../../scripts/workflow-definition/evaluator.mjs";
import { parseJsonFile } from "../../scripts/workflow-definition/parser.mjs";

const definitionUrl = new URL("../../definitions/feature-proposal.json", import.meta.url);
const registryUrl = new URL("../../registries/registered-executors.json", import.meta.url);
const statesUrl = new URL("../workflow-definition/fixtures/feature-proposal-states.json", import.meta.url);

async function readJson(url) {
  const result = await parseJsonFile(url);
  assert.equal(result.ok, true, result.ok ? "" : result.error.message);
  return result.value;
}

function resolveExecutor(registry, reference) {
  const matches = registry.filter((entry) => entry.executor_id === reference);
  assert.equal(matches.length, 1, reference);
  return matches[0];
}

function makeRequest(state, action) {
  return {
    request_id: `feature-proposal-${action.task_action_id.toLowerCase()}`,
    consensus_strategy: "semantic_consensus",
    state_snapshot: {
      github_state: { issue: { number: 95, state: "open" } },
      local_state: { normalized_fact_state: structuredClone(state) },
    },
    invocation_specification: {
      route: `feature-proposal/${action.transition_id}`,
      skill_reference: action.registered_executor_reference,
      skill_version: "feature-proposal-1.0.0",
      model_identifier: "control-plane-model",
      reasoning_configuration: { effort: "high" },
      role_configuration: { role: "feature_proposal_executor" },
      config_reference: "feature-proposal-executor.toml",
      deadline_configuration: { timeout_ms: 120000 },
      input: { task_action_id: action.task_action_id },
    },
  };
}

function makeReceipts(request, outcome) {
  return Array.from({ length: 10 }, (_, offset) => ({
    request_id: request.request_id,
    session_index: offset + 1,
    session_id: `${request.request_id}-session-${offset + 1}`,
    observed_state_snapshot: structuredClone(request.state_snapshot),
    observed_invocation_specification: structuredClone(request.invocation_specification),
    status: "usable",
    outcome: structuredClone(outcome),
    external_side_effects: [],
  }));
}

test("feature-proposal diagnostic classifications produce comparison observations only", async () => {
  const [definition, registry, states] = await Promise.all([
    readJson(definitionUrl),
    readJson(registryUrl),
    readJson(statesUrl),
  ]);
  for (const transition of definition.transitions.filter((item) => item.registered_executor_reference !== null)) {
    const executor = resolveExecutor(registry, transition.registered_executor_reference);
    assert.equal(executor.execution_class, "llm_session", transition.task_action_id);
    assert.equal(executor.validation_strategy, "semantic_consensus", transition.task_action_id);
  }

  for (const stateName of ["new_request", "confirmed_draft", "created_issue", "direction_confirmed_not_reflected"]) {
    const state = structuredClone(states[stateName]);
    const action = evaluateWorkflowDefinition(definition, state);
    assert.equal(action.status, "action_required", stateName);
    assert.notEqual(action.registered_executor_reference, null, stateName);
    const request = makeRequest(state, action);
    const outcome = { task_action_id: action.task_action_id, plan: { status: "usable" } };
    const sessionReceipts = makeReceipts(request, outcome);
    const result = compareValidationResults(request, sessionReceipts);
    assert.equal(result.status, "pass", stateName);
    assert.deepEqual(result.unanimous_outcome, outcome, stateName);
    assert.equal(Object.hasOwn(request, "baseline"), false, stateName);
    assert.equal(sessionReceipts.every((receipt) => !Object.hasOwn(receipt, "workspace_id")), true, stateName);
    assert.equal(sessionReceipts.every((receipt) => !Object.hasOwn(receipt, "observed_baseline")), true, stateName);
    assert.deepEqual(Object.keys(result.consensus_receipt), ["session_ids"], stateName);
    for (const field of ["workspace_ids", "baseline", "patch_digest", "apply_count"]) {
      assert.equal(Object.hasOwn(result.consensus_receipt, field), false, `${stateName}:${field}`);
    }
    assert.equal(Object.hasOwn(result, "transition_id"), false, stateName);
    assert.equal(Object.hasOwn(result, "adopted_outcome"), false, stateName);
  }
});

test("feature-proposal control-plane mismatch stops without majority adoption", async () => {
  const [definition, states] = await Promise.all([readJson(definitionUrl), readJson(statesUrl)]);
  const action = evaluateWorkflowDefinition(definition, structuredClone(states.created_issue));
  const request = makeRequest(states.created_issue, action);
  const receipts = makeReceipts(request, { task_action_id: action.task_action_id, direction: "policy_review" });
  receipts[9].outcome.direction = "feature_change";
  const result = compareValidationResults(request, receipts);
  assert.equal(result.status, "stopped");
  assert.equal(result.reason, "not_unanimous");
  assert.equal(Object.hasOwn(result, "unanimous_outcome"), false);
});

test("ordinary feature-proposal terminal evaluation remains unchanged", async () => {
  const [definition, states] = await Promise.all([readJson(definitionUrl), readJson(statesUrl)]);
  for (const stateName of ["completed_do_not_proceed", "completed_policy_review", "completed_feature_change"]) {
    assert.deepEqual(
      evaluateWorkflowDefinition(definition, structuredClone(states[stateName])),
      { status: "completed", transition_id: "complete-feature-proposal" },
    );
  }
});
