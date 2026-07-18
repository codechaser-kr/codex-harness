import assert from "node:assert/strict";
import test from "node:test";

import { compareValidationResults } from "../../scripts/validation-mode/comparator.mjs";
import { evaluateWorkflowDefinition } from "../../scripts/workflow-definition/evaluator.mjs";
import { parseJsonFile } from "../../scripts/workflow-definition/parser.mjs";

const registryUrl = new URL("../../registries/registered-executors.json", import.meta.url);
const workflowCases = [
  {
    workflowId: "policy-review",
    proposalActions: [
      ["new_request", "PR-1", "issue-creation"],
      ["created_issue", "PR-3", "policy-plan"],
      ["design_document_result_reflected", "PR-7", "policy-review-next-triage"],
    ],
    deterministicActions: [
      ["confirmed_draft", "PR-2", "github-simple-executor"],
      ["reflected_policy_design_before_implementation", "PR-5", null],
    ],
    terminalState: "completed_existing_issue",
    terminalTransitionId: "complete-policy-review",
  },
  {
    workflowId: "feature-change",
    proposalActions: [
      ["new_request", "FC-1", "issue-creation"],
      ["created_issue", "FC-3", "feature-plan"],
    ],
    deterministicActions: [
      ["confirmed_draft", "FC-2", "github-simple-executor"],
      ["before_implementation_start", "FC-5", null],
    ],
    terminalState: "terminal",
    terminalTransitionId: "complete-feature-change",
  },
  {
    workflowId: "feature-fix",
    proposalActions: [
      ["new_request", "FF-1", "issue-creation"],
      ["created_issue", "FF-3", "fix-analysis"],
      ["confirmed_analysis", "FF-4", "fix-plan"],
    ],
    deterministicActions: [
      ["confirmed_draft", "FF-2", "github-simple-executor"],
      ["before_implementation_start", "FF-6", null],
    ],
    terminalState: "terminal",
    terminalTransitionId: "complete-feature-fix",
  },
];

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

async function readInputs(workflowId) {
  const [definition, states] = await Promise.all([
    readJson(new URL(`../../definitions/${workflowId}.json`, import.meta.url)),
    readJson(new URL(`../workflow-definition/fixtures/${workflowId}-states.json`, import.meta.url)),
  ]);
  return { definition, states };
}

function resolveExecutor(registry, reference) {
  const matches = registry.filter((entry) => entry.executor_id === reference);
  assert.equal(matches.length, 1, `Expected one registry entry for ${reference}.`);
  return matches[0];
}

function validationDisposition(evaluation, registry) {
  if (evaluation.status !== "action_required" || evaluation.registered_executor_reference === null) {
    return "deterministic";
  }
  const executor = resolveExecutor(registry, evaluation.registered_executor_reference);
  return executor.executor_kind === "skill" && executor.side_effect_scope === "proposal_output"
    ? "probe"
    : "deterministic";
}

function makeRequest(definition, state, evaluation) {
  return {
    request_id: `${definition.workflow_id}-${evaluation.task_action_id.toLowerCase()}-validation`,
    workflow_id: definition.workflow_id,
    version: definition.version,
    task_action_id: evaluation.task_action_id,
    state_snapshot: {
      github_state: { issue: { number: 95, state: "open" } },
      local_state: { normalized_fact_state: structuredClone(state) },
    },
    normalized_fact_state: structuredClone(state),
    evaluation_result: structuredClone(evaluation),
    expected_session_count: 10,
    invocation_specification: {
      skill_reference: evaluation.registered_executor_reference,
      skill_version: `${definition.workflow_id}-${definition.version}`,
      model_identifier: "validation-mode-integration-model",
      reasoning_configuration: { effort: "high" },
      role_configuration: { role: "validation_probe" },
      input: {
        workflow_id: definition.workflow_id,
        task_action_id: evaluation.task_action_id,
      },
    },
  };
}

function mockProbe(sessionInput, records) {
  const independentInput = structuredClone(sessionInput);
  records.push(independentInput);
  return {
    output_status: "usable",
    normalized_structured_contract_fields: {
      task_action_id: independentInput.invocation_specification.input.task_action_id,
      output_kind: "proposal_output",
    },
    semantic_decisions: {
      task_action_id: independentInput.invocation_specification.input.task_action_id,
      decision: "proposal_analysis_complete",
    },
    registered_executor_invoked: false,
    side_effects: emptySideEffects(),
  };
}

function runTenProbes(request, records) {
  return Array.from({ length: 10 }, (_, offset) => {
    const sessionIndex = offset + 1;
    const probeResult = mockProbe({
      invocation_specification: structuredClone(request.invocation_specification),
      environment: structuredClone(request.state_snapshot),
    }, records);
    return {
      request_id: request.request_id,
      session_index: sessionIndex,
      session_id: `${request.workflow_id}-${request.task_action_id.toLowerCase()}-session-${String(sessionIndex).padStart(2, "0")}`,
      observed_invocation_specification: structuredClone(request.invocation_specification),
      ...probeResult,
    };
  });
}

function assertEmptySideEffects(results) {
  for (const result of results) {
    assert.equal(result.registered_executor_invoked, false);
    for (const category of Object.keys(result.side_effects)) {
      assert.deepEqual(result.side_effects[category], [], category);
    }
  }
}

test("issue workflow proposal-output actions use ten isolated reproducible probes", async () => {
  const registry = await readJson(registryUrl);
  const registryBefore = structuredClone(registry);

  for (const workflowCase of workflowCases) {
    const { definition, states } = await readInputs(workflowCase.workflowId);
    const definitionBefore = structuredClone(definition);
    const statesBefore = structuredClone(states);
    const registeredProposalActions = definition.transitions
      .filter((transition) => transition.registered_executor_reference !== null)
      .filter((transition) => {
        const executor = resolveExecutor(registry, transition.registered_executor_reference);
        return executor.executor_kind === "skill" && executor.side_effect_scope === "proposal_output";
      })
      .map((transition) => [transition.task_action_id, transition.registered_executor_reference]);
    assert.deepEqual(
      registeredProposalActions,
      workflowCase.proposalActions.map(([, taskActionId, reference]) => [taskActionId, reference]),
      `${workflowCase.workflowId} proposal-output inventory`,
    );

    for (const [stateName, expectedTaskActionId, expectedSkillReference] of workflowCase.proposalActions) {
      const state = structuredClone(states[stateName]);
      const stateBefore = structuredClone(state);
      const evaluation = evaluateWorkflowDefinition(definition, state);
      assert.equal(evaluation.status, "action_required", stateName);
      assert.equal(evaluation.task_action_id, expectedTaskActionId, stateName);
      assert.equal(evaluation.registered_executor_reference, expectedSkillReference, stateName);

      const executor = resolveExecutor(registry, expectedSkillReference);
      assert.equal(executor.executor_kind, "skill", stateName);
      assert.equal(executor.side_effect_scope, "proposal_output", stateName);
      assert.equal(executor.runtime_reference, expectedSkillReference, stateName);
      assert.equal(validationDisposition(evaluation, registry), "probe", stateName);

      const request = makeRequest(definition, state, evaluation);
      const requestBefore = structuredClone(request);
      const records = [];
      const results = runTenProbes(request, records);
      const comparison = compareValidationResults(request, results);

      assert.deepEqual(comparison, {
        request_id: request.request_id,
        status: "pass",
        reason: "reproducible",
        session_count: 10,
        errors: [],
      });
      assert.equal(results.length, 10, stateName);
      assert.deepEqual(results.map((result) => result.session_index), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      assert.equal(new Set(results.map((result) => result.session_id)).size, 10, stateName);
      assert.equal(records.length, 10, stateName);
      for (const record of records) {
        assert.deepEqual(record.invocation_specification, request.invocation_specification, stateName);
        assert.deepEqual(record.environment, request.state_snapshot, stateName);
      }
      records[0].invocation_specification.input.session_local_mutation = true;
      records[0].environment.local_state.session_local_mutation = true;
      assert.equal(records[1].invocation_specification.input.session_local_mutation, undefined, stateName);
      assert.equal(records[1].environment.local_state.session_local_mutation, undefined, stateName);
      assert.equal(request.invocation_specification.input.session_local_mutation, undefined, stateName);
      assert.equal(request.state_snapshot.local_state.session_local_mutation, undefined, stateName);
      assert.deepEqual(request, requestBefore, stateName);
      assert.deepEqual(state, stateBefore, stateName);
      assertEmptySideEffects(results);
    }

    assert.deepEqual(definition, definitionBefore, workflowCase.workflowId);
    assert.deepEqual(states, statesBefore, workflowCase.workflowId);
  }

  assert.deepEqual(registry, registryBefore);
});

test("one changed semantic result stops each issue workflow without adopting a majority", async () => {
  const registry = await readJson(registryUrl);

  for (const workflowCase of workflowCases) {
    const { definition, states } = await readInputs(workflowCase.workflowId);
    const [stateName] = workflowCase.proposalActions.at(-1);
    const evaluation = evaluateWorkflowDefinition(definition, structuredClone(states[stateName]));
    assert.equal(validationDisposition(evaluation, registry), "probe", workflowCase.workflowId);

    const request = makeRequest(definition, states[stateName], evaluation);
    const requestBefore = structuredClone(request);
    const results = runTenProbes(request, []);
    results[9].semantic_decisions.decision = "different_semantic_decision";
    const comparison = compareValidationResults(request, results);

    assert.equal(comparison.status, "stopped", workflowCase.workflowId);
    assert.equal(comparison.reason, "not_reproducible", workflowCase.workflowId);
    assert.equal(
      comparison.errors.some((error) => error.code === "comparison.semantic_decisions.mismatch"),
      true,
      workflowCase.workflowId,
    );
    for (const field of ["accepted_result", "adopted_result", "majority_result"]) {
      assert.equal(Object.hasOwn(comparison, field), false, `${workflowCase.workflowId}:${field}`);
    }
    assert.deepEqual(request, requestBefore, workflowCase.workflowId);
    assertEmptySideEffects(results);
  }
});

test("issue workflow state-change, internal handoff, and terminal paths stay deterministic-only", async () => {
  const registry = await readJson(registryUrl);
  let probeCount = 0;

  for (const workflowCase of workflowCases) {
    const { definition, states } = await readInputs(workflowCase.workflowId);
    const definitionBefore = structuredClone(definition);
    const statesBefore = structuredClone(states);

    for (const [stateName, expectedTaskActionId, expectedReference] of workflowCase.deterministicActions) {
      const evaluation = evaluateWorkflowDefinition(definition, structuredClone(states[stateName]));
      assert.equal(evaluation.status, "action_required", stateName);
      assert.equal(evaluation.task_action_id, expectedTaskActionId, stateName);
      assert.equal(evaluation.registered_executor_reference, expectedReference, stateName);
      assert.equal(validationDisposition(evaluation, registry), "deterministic", stateName);
      if (validationDisposition(evaluation, registry) === "probe") {
        probeCount += 1;
      }
      if (expectedReference !== null) {
        const executor = resolveExecutor(registry, expectedReference);
        assert.equal(executor.executor_id, "github-simple-executor", stateName);
        assert.equal(executor.side_effect_scope, "github_state_change", stateName);
      }
    }

    const terminal = evaluateWorkflowDefinition(definition, structuredClone(states[workflowCase.terminalState]));
    assert.deepEqual(terminal, {
      status: "completed",
      transition_id: workflowCase.terminalTransitionId,
    });
    assert.equal(validationDisposition(terminal, registry), "deterministic", workflowCase.workflowId);
    assert.deepEqual(definition, definitionBefore, workflowCase.workflowId);
    assert.deepEqual(states, statesBefore, workflowCase.workflowId);
  }

  assert.equal(probeCount, 0);
});
