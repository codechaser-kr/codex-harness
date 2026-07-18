import assert from "node:assert/strict";
import test from "node:test";

import { compareValidationResults } from "../../scripts/validation-mode/comparator.mjs";
import { evaluateWorkflowDefinition } from "../../scripts/workflow-definition/evaluator.mjs";
import { parseJsonFile } from "../../scripts/workflow-definition/parser.mjs";

const definitionUrl = new URL("../../definitions/implementation.json", import.meta.url);
const registryUrl = new URL("../../registries/registered-executors.json", import.meta.url);
const statesUrl = new URL("../workflow-definition/fixtures/implementation-states.json", import.meta.url);
const proposalActions = [
  ["FI-1", "branch-proposal"],
  ["FI-3", "commit-plan"],
  ["FI-10", "pr-proposal"],
  ["FI-19", "review-comment"],
];
const proposalActionIds = new Set(proposalActions.map(([taskActionId]) => taskActionId));

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

async function readInputs() {
  const [definition, registry, states] = await Promise.all([
    readJson(definitionUrl),
    readJson(registryUrl),
    readJson(statesUrl),
  ]);
  return { definition, registry, states };
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

function collectRepresentativeStates(definition, states) {
  const stateByTaskActionId = new Map();
  const cumulativePrePrState = {};

  for (const scenario of states.pre_pr_cases) {
    Object.assign(cumulativePrePrState, structuredClone(scenario.updates));
    const state = structuredClone(cumulativePrePrState);
    const evaluation = evaluateWorkflowDefinition(definition, state);
    assert.equal(evaluation.status, "action_required", scenario.name);
    assert.equal(evaluation.task_action_id, scenario.task_action_id, scenario.name);
    if (!stateByTaskActionId.has(evaluation.task_action_id)) {
      stateByTaskActionId.set(evaluation.task_action_id, state);
    }
  }

  for (const scenario of states.review_feedback_cases) {
    const state = structuredClone(scenario.state);
    const evaluation = evaluateWorkflowDefinition(definition, state, {
      currentTransitionId: scenario.current_transition_id,
    });
    assert.equal(evaluation.status, scenario.status, scenario.name);
    if (evaluation.status === "action_required") {
      assert.equal(evaluation.task_action_id, scenario.task_action_id, scenario.name);
      if (!stateByTaskActionId.has(evaluation.task_action_id)) {
        stateByTaskActionId.set(evaluation.task_action_id, state);
      }
    }
  }

  assert.equal(stateByTaskActionId.size, 36);
  return stateByTaskActionId;
}

function evaluateSpecificAction(definition, stateByTaskActionId, taskActionId) {
  const transition = definition.transitions.find((candidate) => candidate.task_action_id === taskActionId);
  assert.ok(transition, `Missing transition for ${taskActionId}.`);
  const state = structuredClone(stateByTaskActionId.get(taskActionId));
  assert.ok(state, `Missing representative state for ${taskActionId}.`);
  const stateBefore = structuredClone(state);
  const evaluation = evaluateWorkflowDefinition(definition, state, {
    currentTransitionId: transition.transition_id,
  });
  assert.equal(evaluation.status, "action_required", taskActionId);
  assert.equal(evaluation.task_action_id, taskActionId);
  assert.equal(evaluation.transition_id, transition.transition_id);
  assert.deepEqual(state, stateBefore, taskActionId);
  return { evaluation, state };
}

function deepFreeze(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  for (const nestedValue of Object.values(value)) {
    deepFreeze(nestedValue);
  }
  return Object.freeze(value);
}

function makeRequest(definition, state, evaluation) {
  return deepFreeze({
    request_id: `implementation-${evaluation.task_action_id.toLowerCase()}-validation`,
    workflow_id: definition.workflow_id,
    version: definition.version,
    task_action_id: evaluation.task_action_id,
    state_snapshot: {
      github_state: { issue: { number: 95, state: "open" } },
      local_state: {
        current_transition_id: evaluation.transition_id,
        normalized_fact_state: structuredClone(state),
      },
    },
    normalized_fact_state: structuredClone(state),
    evaluation_result: structuredClone(evaluation),
    expected_session_count: 10,
    invocation_specification: {
      skill_reference: evaluation.registered_executor_reference,
      skill_version: `${evaluation.registered_executor_reference}-validation-contract`,
      model_identifier: "validation-mode-integration-model",
      reasoning_configuration: { effort: "high" },
      role_configuration: { role: "validation_probe" },
      input: {
        workflow_id: definition.workflow_id,
        task_action_id: evaluation.task_action_id,
        transition_id: evaluation.transition_id,
      },
    },
  });
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
      decision: "proposal_output_usable",
    },
    registered_executor_invoked: false,
    side_effects: emptySideEffects(),
  };
}

function runTenIndependentProbes(request, records) {
  return Array.from({ length: 10 }, (_, offset) => {
    const sessionIndex = offset + 1;
    const probeResult = mockProbe({
      invocation_specification: structuredClone(request.invocation_specification),
      environment: structuredClone(request.state_snapshot),
    }, records);
    return {
      request_id: request.request_id,
      session_index: sessionIndex,
      session_id: `${request.task_action_id.toLowerCase()}-validation-session-${String(sessionIndex).padStart(2, "0")}`,
      observed_invocation_specification: structuredClone(request.invocation_specification),
      ...probeResult,
    };
  });
}

function assertEmptySideEffects(results) {
  for (const result of results) {
    assert.equal(result.registered_executor_invoked, false);
    for (const [category, effects] of Object.entries(result.side_effects)) {
      assert.deepEqual(effects, [], category);
    }
  }
}

test("implementation proposal-output inventory uses ten isolated reproducible action probes", async () => {
  const { definition, registry, states } = await readInputs();
  const definitionBefore = structuredClone(definition);
  const registryBefore = structuredClone(registry);
  const statesBefore = structuredClone(states);
  const stateByTaskActionId = collectRepresentativeStates(definition, states);

  const registeredProposalActions = definition.transitions
    .filter((transition) => transition.registered_executor_reference !== null)
    .filter((transition) => {
      const executor = resolveExecutor(registry, transition.registered_executor_reference);
      return executor.executor_kind === "skill" && executor.side_effect_scope === "proposal_output";
    })
    .map((transition) => [transition.task_action_id, transition.registered_executor_reference]);
  assert.deepEqual(registeredProposalActions, proposalActions);

  for (const [taskActionId, expectedReference] of proposalActions) {
    const { evaluation, state } = evaluateSpecificAction(definition, stateByTaskActionId, taskActionId);
    assert.equal(evaluation.registered_executor_reference, expectedReference);
    const executor = resolveExecutor(registry, expectedReference);
    assert.deepEqual(
      [executor.executor_kind, executor.side_effect_scope, executor.runtime_reference],
      ["skill", "proposal_output", expectedReference],
    );
    assert.equal(validationDisposition(evaluation, registry), "probe");

    const request = makeRequest(definition, state, evaluation);
    const requestBefore = structuredClone(request);
    const records = [];
    const results = runTenIndependentProbes(request, records);
    const comparison = compareValidationResults(request, results);

    assert.deepEqual(comparison, {
      request_id: request.request_id,
      status: "pass",
      reason: "reproducible",
      session_count: 10,
      errors: [],
    });
    assert.deepEqual(results.map((result) => result.session_index), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    assert.equal(new Set(results.map((result) => result.session_id)).size, 10);
    assert.equal(records.length, 10);
    for (const record of records) {
      assert.deepEqual(record.invocation_specification, request.invocation_specification);
      assert.deepEqual(record.environment, request.state_snapshot);
    }
    assert.equal(Object.isFrozen(request), true);
    assert.equal(Object.isFrozen(request.invocation_specification.input), true);
    assert.equal(Object.isFrozen(request.state_snapshot.local_state.normalized_fact_state), true);
    records[0].invocation_specification.input.session_local_mutation = true;
    records[0].environment.local_state.session_local_mutation = true;
    results[0].semantic_decisions.session_local_mutation = true;
    assert.equal(records[1].invocation_specification.input.session_local_mutation, undefined);
    assert.equal(records[1].environment.local_state.session_local_mutation, undefined);
    assert.equal(results[1].semantic_decisions.session_local_mutation, undefined);
    assert.deepEqual(request, requestBefore);
    assertEmptySideEffects(results);
  }

  assert.deepEqual(definition, definitionBefore);
  assert.deepEqual(registry, registryBefore);
  assert.deepEqual(states, statesBefore);
});

test("one changed implementation proposal result stops without majority adoption", async () => {
  const { definition, registry, states } = await readInputs();
  const stateByTaskActionId = collectRepresentativeStates(definition, states);

  for (const [taskActionId] of proposalActions) {
    const { evaluation, state } = evaluateSpecificAction(definition, stateByTaskActionId, taskActionId);
    assert.equal(validationDisposition(evaluation, registry), "probe");
    const request = makeRequest(definition, state, evaluation);
    const results = runTenIndependentProbes(request, []);
    results[9].semantic_decisions.decision = "different_semantic_result";
    const comparison = compareValidationResults(request, results);

    assert.equal(comparison.status, "stopped", taskActionId);
    assert.equal(comparison.reason, "not_reproducible", taskActionId);
    assert.equal(
      comparison.errors.some((error) => error.code === "comparison.semantic_decisions.mismatch"),
      true,
      taskActionId,
    );
    for (const field of ["accepted_result", "adopted_result", "majority_result"]) {
      assert.equal(Object.hasOwn(comparison, field), false, `${taskActionId}:${field}`);
    }
    assertEmptySideEffects(results);
  }
});

test("all non-proposal implementation actions and terminal stay deterministic-only", async () => {
  const { definition, registry, states } = await readInputs();
  const stateByTaskActionId = collectRepresentativeStates(definition, states);
  const deterministicReferences = {
    "target-harness-code-editor": ["FI-5", "FI-26"],
    commit: ["FI-6", "FI-27"],
    "pr-creation": ["FI-12"],
    "claude/code-review": ["FI-15"],
    "claude/awesome-code-review": ["FI-16"],
    "codex/awesome-code-review": ["FI-17"],
    "github-state-summary": ["FI-24", "FI-33"],
    "github-simple-executor": ["FI-4", "FI-30"],
  };
  let validationProbeInvocationCount = 0;
  let normalExecutorInvocationCount = 0;

  for (const transition of definition.transitions) {
    if (proposalActionIds.has(transition.task_action_id)) {
      continue;
    }
    const { evaluation } = evaluateSpecificAction(
      definition,
      stateByTaskActionId,
      transition.task_action_id,
    );
    assert.equal(validationDisposition(evaluation, registry), "deterministic", transition.task_action_id);
    if (validationDisposition(evaluation, registry) === "probe") {
      validationProbeInvocationCount += 1;
    }
    if (evaluation.registered_executor_reference !== null) {
      const executor = resolveExecutor(registry, evaluation.registered_executor_reference);
      assert.equal(executor.side_effect_scope === "proposal_output" && executor.executor_kind === "skill", false);
    }
  }

  for (const [reference, expectedTaskActionIds] of Object.entries(deterministicReferences)) {
    assert.deepEqual(
      definition.transitions
        .filter((transition) => transition.registered_executor_reference === reference)
        .map((transition) => transition.task_action_id),
      expectedTaskActionIds,
      reference,
    );
  }
  assert.deepEqual(
    definition.transitions
      .filter((transition) => transition.registered_executor_reference === null)
      .map((transition) => transition.task_action_id),
    states.null_executor_actions,
  );
  for (const transition of definition.transitions.filter((candidate) => (
    candidate.user_decision_specification.required && !proposalActionIds.has(candidate.task_action_id)
  ))) {
    const { evaluation } = evaluateSpecificAction(definition, stateByTaskActionId, transition.task_action_id);
    assert.equal(validationDisposition(evaluation, registry), "deterministic", transition.task_action_id);
  }

  const terminalScenario = states.review_feedback_cases.find((scenario) => scenario.status === "completed");
  assert.ok(terminalScenario);
  const terminal = evaluateWorkflowDefinition(definition, structuredClone(terminalScenario.state), {
    currentTransitionId: terminalScenario.current_transition_id,
  });
  assert.deepEqual(terminal, { status: "completed", transition_id: "complete-implementation" });
  assert.equal(validationDisposition(terminal, registry), "deterministic");
  assert.equal(validationProbeInvocationCount, 0);
  assert.equal(normalExecutorInvocationCount, 0);
});
