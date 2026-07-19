import assert from "node:assert/strict";
import test from "node:test";

import { compareValidationResults } from "../../scripts/validation-mode/comparator.mjs";
import { evaluateWorkflowDefinition } from "../../scripts/workflow-definition/evaluator.mjs";
import { parseJsonFile } from "../../scripts/workflow-definition/parser.mjs";

const registryUrl = new URL("../../registries/registered-executors.json", import.meta.url);
const workflows = [
  {
    id: "policy-review",
    actions: ["new_request", "confirmed_draft", "created_issue", "design_document_result_reflected"],
    deterministicState: "reflected_policy_design_before_implementation",
    terminalState: "completed_existing_issue",
    terminalId: "complete-policy-review",
  },
  {
    id: "feature-change",
    actions: ["new_request", "confirmed_draft", "created_issue"],
    deterministicState: "before_implementation_start",
    terminalState: "terminal",
    terminalId: "complete-feature-change",
  },
  {
    id: "feature-fix",
    actions: ["new_request", "confirmed_draft", "created_issue", "confirmed_analysis"],
    deterministicState: "before_implementation_start",
    terminalState: "terminal",
    terminalId: "complete-feature-fix",
  },
];

async function readJson(url) {
  const result = await parseJsonFile(url);
  assert.equal(result.ok, true, result.ok ? "" : result.error.message);
  return result.value;
}

async function readWorkflow(id) {
  const [definition, states] = await Promise.all([
    readJson(new URL(`../../definitions/${id}.json`, import.meta.url)),
    readJson(new URL(`../workflow-definition/fixtures/${id}-states.json`, import.meta.url)),
  ]);
  return { definition, states };
}

function resolveExecutor(registry, reference) {
  const matches = registry.filter((entry) => entry.executor_id === reference);
  assert.equal(matches.length, 1, reference);
  return matches[0];
}

function consensusRequest(workflowId, state, action) {
  return {
    request_id: `${workflowId}-${action.task_action_id.toLowerCase()}`,
    consensus_strategy: "semantic_consensus",
    state_snapshot: {
      github_state: { issue: { number: 95, state: "open" } },
      local_state: { normalized_fact_state: structuredClone(state) },
    },
    invocation_specification: {
      route: `${workflowId}/${action.transition_id}`,
      skill_reference: action.registered_executor_reference,
      skill_version: `${workflowId}-1.0.0`,
      model_identifier: "control-plane-model",
      reasoning_configuration: { effort: "high" },
      role_configuration: { role: `${workflowId}-executor` },
      config_reference: `${workflowId}-executor.toml`,
      deadline_configuration: { timeout_ms: 120000 },
      input: { task_action_id: action.task_action_id },
    },
  };
}

function receipts(request, outcome) {
  return Array.from({ length: 10 }, (_, index) => ({
    request_id: request.request_id,
    session_index: index + 1,
    session_id: `${request.request_id}-session-${index + 1}`,
    observed_state_snapshot: structuredClone(request.state_snapshot),
    observed_invocation_specification: structuredClone(request.invocation_specification),
    status: "usable",
    outcome: structuredClone(outcome),
    external_side_effects: [],
  }));
}

test("issue workflow diagnostic classifications report consensus without transitions", async () => {
  const registry = await readJson(registryUrl);
  for (const workflow of workflows) {
    const { definition, states } = await readWorkflow(workflow.id);
    for (const transition of definition.transitions.filter((item) => item.registered_executor_reference !== null)) {
      const executor = resolveExecutor(registry, transition.registered_executor_reference);
      assert.equal(executor.execution_class, "llm_session", `${workflow.id}:${transition.task_action_id}`);
      assert.equal(executor.validation_strategy, "semantic_consensus", `${workflow.id}:${transition.task_action_id}`);
    }

    for (const stateName of workflow.actions) {
      const state = structuredClone(states[stateName]);
      const action = evaluateWorkflowDefinition(definition, state);
      assert.equal(action.status, "action_required", `${workflow.id}:${stateName}`);
      assert.notEqual(action.registered_executor_reference, null, `${workflow.id}:${stateName}`);
      const request = consensusRequest(workflow.id, state, action);
      const outcome = { task_action_id: action.task_action_id, normalized_result: { usable: true } };
      const sessionReceipts = receipts(request, outcome);
      const result = compareValidationResults(request, sessionReceipts);
      assert.equal(result.status, "pass", `${workflow.id}:${stateName}`);
      assert.deepEqual(result.unanimous_outcome, outcome, `${workflow.id}:${stateName}`);
      assert.equal(Object.hasOwn(request, "baseline"), false, `${workflow.id}:${stateName}`);
      assert.equal(sessionReceipts.every((receipt) => !Object.hasOwn(receipt, "workspace_id")), true, `${workflow.id}:${stateName}`);
      assert.equal(sessionReceipts.every((receipt) => !Object.hasOwn(receipt, "observed_baseline")), true, `${workflow.id}:${stateName}`);
      assert.deepEqual(Object.keys(result.consensus_receipt), ["session_ids"], `${workflow.id}:${stateName}`);
      for (const field of ["workspace_ids", "baseline", "patch_digest", "apply_count"]) {
        assert.equal(Object.hasOwn(result.consensus_receipt, field), false, `${workflow.id}:${stateName}:${field}`);
      }
      assert.equal(Object.hasOwn(result, "transition_id"), false, `${workflow.id}:${stateName}`);
      assert.equal(Object.hasOwn(result, "adopted_outcome"), false, `${workflow.id}:${stateName}`);
    }
  }
});

test("LLM-derived fact consensus remains a diagnostic observation", async () => {
  const workflow = workflows[0];
  const { definition, states } = await readWorkflow(workflow.id);
  const action = evaluateWorkflowDefinition(definition, structuredClone(states.created_issue));
  const request = consensusRequest(workflow.id, states.created_issue, action);
  request.invocation_specification.route = `${workflow.id}/fact-derivation`;
  request.invocation_specification.input = { raw_snapshot: structuredClone(request.state_snapshot) };
  const factOutcome = {
    observations: [{
      fact_id: "policy_design_proposal_usable",
      value: true,
      source_kind: "skill_output",
      source_reference: "policy-plan",
      field_reference: "status",
    }],
  };
  const result = compareValidationResults(request, receipts(request, factOutcome));
  assert.equal(result.status, "pass");
  assert.deepEqual(result.unanimous_outcome, factOutcome);
  assert.deepEqual(Object.keys(result.consensus_receipt), ["session_ids"]);
  assert.equal(Object.hasOwn(result, "transition_id"), false);
});

test("null executor and terminal states remain deterministic run-once paths", async () => {
  for (const workflow of workflows) {
    const { definition, states } = await readWorkflow(workflow.id);
    const deterministic = evaluateWorkflowDefinition(definition, structuredClone(states[workflow.deterministicState]));
    assert.equal(deterministic.status, "action_required", workflow.id);
    assert.equal(deterministic.registered_executor_reference, null, workflow.id);
    assert.deepEqual(
      evaluateWorkflowDefinition(definition, structuredClone(states[workflow.terminalState])),
      { status: "completed", transition_id: workflow.terminalId },
      workflow.id,
    );
  }
});
