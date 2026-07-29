import assert from "node:assert/strict";
import test from "node:test";

import { evaluateWorkflowDefinition } from "../../scripts/workflow-definition/evaluator.mjs";
import { normalizeFeatureProposalFacts } from "../../scripts/workflow-definition/feature-proposal-state-adapter.mjs";
import { parseJsonFile } from "../../scripts/workflow-definition/parser.mjs";
import { validateWorkflowDefinition } from "../../scripts/workflow-definition/validator.mjs";

const definitionUrl = new URL("../../definitions/feature-proposal.json", import.meta.url);
const statesUrl = new URL("./fixtures/feature-proposal-states.json", import.meta.url);

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
    observation(
      "feature_proposal_feature_change_transition_completed",
      true,
      "github_state",
      "feature change issue #95",
    ),
    observation("feature_proposal_requested", true, "user_input", "request issue #93"),
    observation("feature_proposal_direction_reflected", true, "github_state", "issue #93"),
    observation("feature_proposal_draft_confirmed", true, "user_input", "draft decision"),
    observation("feature_proposal_issue_closed", true, "github_state", "issue #93"),
    observation("feature_proposal_direction", "feature_change", "user_input", "direction decision"),
    observation("feature_proposal_issue_created", true, "github_state", "issue #93"),
    observation(
      "feature_proposal_policy_review_transition_completed",
      false,
      "github_state",
      "no policy review issue",
    ),
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

test("feature-proposal definition parses and passes structural and semantic validation", async () => {
  const [definition, states] = await Promise.all([readJson(definitionUrl), readJson(statesUrl)]);
  const transitionsById = Object.fromEntries(
    definition.transitions.map((transition) => [transition.task_action_id, transition]),
  );
  assert.equal(Object.keys(states).length, 12);
  assert.deepEqual(
    definition.transitions.map((transition) => transition.task_action_id),
    ["FP-1", "FP-2", "FP-3", "FP-4", "FP-5", "FP-6", "FP-7", "FP-9", "FP-10", "FP-8"],
  );
  assert.equal(Object.hasOwn(definition.facts, "next_workflow"), false);
  assert.deepEqual(definition.facts.feature_proposal_policy_review_transition_completed, [true, false]);
  assert.deepEqual(definition.facts.feature_proposal_feature_change_transition_completed, [true, false]);
  assert.deepEqual(
    transitionsById["FP-6"].completion_predicate,
    { fact_id: "feature_proposal_issue_closed", operator: "equals", value: true },
  );
  assert.deepEqual(
    transitionsById["FP-7"].completion_predicate,
    { fact_id: "feature_proposal_issue_closed", operator: "equals", value: true },
  );
  assert.deepEqual(
    transitionsById["FP-9"].completion_predicate,
    {
      fact_id: "feature_proposal_policy_review_transition_completed",
      operator: "equals",
      value: true,
    },
  );
  assert.deepEqual(
    transitionsById["FP-10"].completion_predicate,
    {
      fact_id: "feature_proposal_feature_change_transition_completed",
      operator: "equals",
      value: true,
    },
  );
  const validation = validateWorkflowDefinition(definition);
  assert.equal(validation.valid, true, JSON.stringify(validation.errors));
  assert.deepEqual(validation.errors, []);
});

test("feature-proposal evaluation returns the required action for each representative state without side effects", async () => {
  const [definition, states] = await Promise.all([readJson(definitionUrl), readJson(statesUrl)]);
  const definitionBefore = structuredClone(definition);
  const cases = [
    ["new_request", "FP-1", "issue-creation"],
    ["confirmed_draft", "FP-2", "github-simple-executor"],
    ["created_issue", "FP-3", "feature-proposal-triage"],
    ["direction_confirmed_not_reflected", "FP-4", "github-simple-executor"],
    ["policy_review_direction", "FP-6", "github-simple-executor"],
    ["policy_review_closed", "FP-9", "github-simple-executor"],
    ["feature_change_direction", "FP-7", "github-simple-executor"],
    ["feature_change_closed", "FP-10", "github-simple-executor"],
    ["do_not_proceed_direction", "FP-5", "github-simple-executor"],
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
  assert.deepEqual(definition, definitionBefore);
});

test("feature-proposal evaluation completes every terminal outcome", async () => {
  const [definition, states] = await Promise.all([readJson(definitionUrl), readJson(statesUrl)]);
  for (const name of ["completed_do_not_proceed", "completed_policy_review", "completed_feature_change"]) {
    const result = evaluateWorkflowDefinition(definition, states[name]);
    assert.deepEqual(result, { status: "completed", task_action_id: "FP-8" }, name);
  }
});

test("feature-proposal resumes the legacy terminal task action ID", async () => {
  const [definition, states] = await Promise.all([readJson(definitionUrl), readJson(statesUrl)]);
  for (const name of ["completed_do_not_proceed", "completed_policy_review", "completed_feature_change"]) {
    assert.deepEqual(
      evaluateWorkflowDefinition(definition, states[name], { currentTaskActionId: "FP-8" }),
      { status: "completed", task_action_id: "FP-8" },
      name,
    );
  }
});

test("feature-proposal transition start stays blocked until the original issue is closed", async () => {
  const [definition, states] = await Promise.all([readJson(definitionUrl), readJson(statesUrl)]);
  for (const [name, completionFactId, closeTaskActionId, startTaskActionId] of [
    [
      "policy_review_direction",
      "feature_proposal_policy_review_transition_completed",
      "FP-6",
      "FP-9",
    ],
    [
      "feature_change_direction",
      "feature_proposal_feature_change_transition_completed",
      "FP-7",
      "FP-10",
    ],
  ]) {
    const state = {
      ...structuredClone(states[name]),
      [completionFactId]: true,
    };
    const stateBefore = structuredClone(state);
    const result = evaluateWorkflowDefinition(definition, state);
    const directStart = evaluateWorkflowDefinition(definition, state, {
      currentTaskActionId: startTaskActionId,
    });

    assert.equal(result.status, "action_required", name);
    assert.equal(result.task_action_id, closeTaskActionId, name);
    assert.deepEqual(directStart, {
      status: "stopped",
      reason: "current_task_action_condition_not_met",
      task_action_id: startTaskActionId,
    }, name);
    assert.deepEqual(state, stateBefore, name);
  }
});

test("feature-proposal transition resumes from a closed original issue without repeating direction work", async () => {
  const [definition, states] = await Promise.all([readJson(definitionUrl), readJson(statesUrl)]);
  for (const [name, startTaskActionId] of [
    ["policy_review_closed", "FP-9"],
    ["feature_change_closed", "FP-10"],
  ]) {
    const result = evaluateWorkflowDefinition(definition, states[name]);
    assert.equal(result.status, "action_required", name);
    assert.equal(result.task_action_id, startTaskActionId, name);
    assert.equal(result.executor_reference, "github-simple-executor", name);
  }
});

test("feature-proposal adapter maps observations in definition order and preserves copied evidence", async () => {
  const definition = await readJson(definitionUrl);
  const observations = validObservations();
  const definitionBefore = structuredClone(definition);
  const observationsBefore = structuredClone(observations);
  const result = normalizeFeatureProposalFacts(definition, observations);
  const repeatedResult = normalizeFeatureProposalFacts(definition, observations);

  assert.equal(result.status, "normalized");
  assert.equal(result.workflow_id, "feature-proposal");
  assert.equal(JSON.stringify(result), JSON.stringify(repeatedResult));
  assert.deepEqual(Object.keys(result.normalized_fact_state), Object.keys(definition.facts));
  assert.deepEqual(Object.keys(result.evidence_by_fact), Object.keys(definition.facts));
  assert.deepEqual(result.evidence_by_fact.feature_proposal_direction, [{
    source_kind: "user_input",
    source_reference: "direction decision",
    field_reference: "facts.feature_proposal_direction",
  }]);
  assert.deepEqual(result.evidence_by_fact.feature_proposal_feature_change_transition_completed, [{
    source_kind: "github_state",
    source_reference: "feature change issue #95",
    field_reference: "facts.feature_proposal_feature_change_transition_completed",
  }]);
  assert.deepEqual(result.evidence_by_fact.feature_proposal_policy_review_transition_completed, [{
    source_kind: "github_state",
    source_reference: "no policy review issue",
    field_reference: "facts.feature_proposal_policy_review_transition_completed",
  }]);
  assert.notEqual(result.evidence_by_fact.feature_proposal_requested[0], observations[1]);
  assert.deepEqual(definition, definitionBefore);
  assert.deepEqual(observations, observationsBefore);
});

test("feature-proposal adapter upgrades legacy next_workflow observations without mutation", async () => {
  const definition = await readJson(definitionUrl);
  for (const [legacyValue, factId] of [
    ["policy_review", "feature_proposal_policy_review_transition_completed"],
    ["feature_change", "feature_proposal_feature_change_transition_completed"],
  ]) {
    const observations = [
      observation("next_workflow", legacyValue, "github_state", `${legacyValue} transition`),
    ];
    const observationsBefore = structuredClone(observations);
    const result = normalizeFeatureProposalFacts(definition, observations);

    assert.equal(result.status, "normalized", legacyValue);
    assert.deepEqual(result.normalized_fact_state, { [factId]: true }, legacyValue);
    assert.deepEqual(result.evidence_by_fact[factId], [{
      source_kind: "github_state",
      source_reference: `${legacyValue} transition`,
      field_reference: "facts.next_workflow",
    }], legacyValue);
    assert.deepEqual(observations, observationsBefore, legacyValue);
  }
});

test("feature-proposal adapter rejects wrong observation sources atomically", async () => {
  const definition = await readJson(definitionUrl);
  const wrongDirectionSource = normalizeFeatureProposalFacts(definition, [
    observation("feature_proposal_direction", "feature_change", "skill_output", "feature-proposal-triage"),
  ]);
  assertAtomicFailure(wrongDirectionSource, "invalid_observations");
  assert.equal(hasError(
    wrongDirectionSource,
    "observation.source_kind.mismatch",
    "/observations/0/source_kind",
  ), true);

  const wrongGitHubSource = normalizeFeatureProposalFacts(definition, [
    observation("feature_proposal_issue_created", true, "user_input", "request issue #93"),
  ]);
  assertAtomicFailure(wrongGitHubSource, "invalid_observations");
  assert.equal(hasError(
    wrongGitHubSource,
    "observation.source_kind.mismatch",
    "/observations/0/source_kind",
  ), true);

  const wrongTransitionSource = normalizeFeatureProposalFacts(definition, [
    observation(
      "feature_proposal_feature_change_transition_completed",
      true,
      "local_state",
      "local handoff",
    ),
  ]);
  assertAtomicFailure(wrongTransitionSource, "invalid_observations");
  assert.equal(hasError(
    wrongTransitionSource,
    "observation.source_kind.mismatch",
    "/observations/0/source_kind",
  ), true);

  const wrongLegacyTransitionSource = normalizeFeatureProposalFacts(definition, [
    observation("next_workflow", "feature_change", "local_state", "local handoff"),
  ]);
  assertAtomicFailure(wrongLegacyTransitionSource, "invalid_observations");
  assert.equal(hasError(
    wrongLegacyTransitionSource,
    "observation.source_kind.mismatch",
    "/observations/0/source_kind",
  ), true);
});

test("feature-proposal adapter rejects missing and unexpected source contracts before observations", async () => {
  const definition = await readJson(definitionUrl);
  const missingContractDefinition = structuredClone(definition);
  missingContractDefinition.facts.uncontracted_fact = [true, false];
  const missingContract = normalizeFeatureProposalFacts(missingContractDefinition, null);
  assertAtomicFailure(missingContract, "source_contract_mismatch");
  assert.deepEqual(missingContract.errors, [{
    code: "source_contract.missing",
    path: "/facts/uncontracted_fact",
    message: "Missing source contract for fact_id uncontracted_fact.",
  }]);

  const unexpectedContractDefinition = structuredClone(definition);
  delete unexpectedContractDefinition.facts.feature_proposal_requested;
  const unexpectedContract = normalizeFeatureProposalFacts(unexpectedContractDefinition, null);
  assertAtomicFailure(unexpectedContract, "source_contract_mismatch");
  assert.deepEqual(unexpectedContract.errors, [{
    code: "source_contract.unexpected",
    path: "/source_contracts/feature_proposal_requested",
    message: "Unexpected source contract for fact_id feature_proposal_requested.",
  }]);
});

test("feature-proposal adapter rejects malformed and duplicate observations without mutation", async () => {
  const definition = await readJson(definitionUrl);
  const observations = [
    { ...observation("feature_proposal_requested", true, "user_input", "request"), extra: true },
    { fact_id: "feature_proposal_issue_created", value: true, source_kind: "github_state", source_reference: "issue #93" },
    null,
  ];
  const definitionBefore = structuredClone(definition);
  const observationsBefore = structuredClone(observations);
  const malformed = normalizeFeatureProposalFacts(definition, observations);

  assertAtomicFailure(malformed, "invalid_observations");
  assert.equal(hasError(malformed, "object.additional_property", "/observations/0/extra"), true);
  assert.equal(hasError(malformed, "observation.required", "/observations/1/field_reference"), true);
  assert.equal(hasError(malformed, "observation.type", "/observations/2"), true);
  assert.deepEqual(definition, definitionBefore);
  assert.deepEqual(observations, observationsBefore);

  const duplicate = normalizeFeatureProposalFacts(definition, [
    observation("feature_proposal_requested", true, "user_input", "request"),
    observation("feature_proposal_requested", true, "user_input", "request"),
  ]);
  assertAtomicFailure(duplicate, "invalid_fact_candidates");
  assert.equal(hasError(duplicate, "candidate.fact_id.duplicate", "/candidates/1/fact_id"), true);
});
