import assert from "node:assert/strict";
import test from "node:test";

import { evaluateWorkflowDefinition } from "../../scripts/workflow-definition/evaluator.mjs";
import { parseJsonFile } from "../../scripts/workflow-definition/parser.mjs";
import { normalizePolicyReviewFacts } from "../../scripts/workflow-definition/policy-review-state-adapter.mjs";
import { validateWorkflowDefinition } from "../../scripts/workflow-definition/validator.mjs";

const definitionUrl = new URL("../../definitions/policy-review.json", import.meta.url);
const statesUrl = new URL("./fixtures/policy-review-states.json", import.meta.url);

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
    observation("feature_change_transition_result", "existing_issue_updated", "github_state", "issue #95"),
    observation("policy_review_requested", false, "user_input", "request issue #95"),
    observation(
      "policy_review_entry_source",
      "feature_proposal",
      "local_state",
      "test-request-policy-review",
      "routing_check.policy_review_entry_source",
    ),
    observation("policy_design_proposal_usable", true, "skill_output", "policy-plan"),
    observation("design_document_implementation_started", true, "local_state", "workspace"),
    observation("feature_change_transition_candidates_usable", true, "skill_output", "policy-review-next-triage"),
    observation("feature_change_transition_direction", "existing_feature_issue", "user_input", "transition decision"),
    observation(
      "feature_change_transition_target_issue_selected",
      true,
      "user_input",
      "transition decision with issue #83",
    ),
    observation(
      "feature_change_transition_target_related",
      true,
      "github_state",
      "issue #95",
      "related_issues[issue #83]",
    ),
    observation("design_document_pr_merged", true, "github_state", "PR #100"),
    observation("policy_review_draft_confirmed", true, "user_input", "draft decision"),
    observation("policy_review_issue_created", true, "github_state", "issue #95"),
    observation("policy_design_confirmed", true, "user_input", "policy design decision"),
    observation("policy_design_reflected", true, "github_state", "issue #95"),
    observation("design_document_result_reflected", true, "github_state", "issue #95"),
    observation("feature_change_transition_reflected", true, "github_state", "issue #95"),
    observation("policy_review_issue_closed", true, "github_state", "issue #95"),
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

test("policy-review definition passes C2/C3 validation with direct executor references", async () => {
  const [definition, states] = await Promise.all([readJson(definitionUrl), readJson(statesUrl)]);
  assert.equal(Object.keys(states).length, 18);
  assert.deepEqual(definition.transitions.map((transition) => transition.task_action_id), [
    "PR-1", "PR-2", "PR-3", "PR-4", "PR-5", "PR-6",
    "PR-7", "PR-8", "PR-9", "PR-10", "PR-11", "PR-12",
  ]);
  assert.equal(JSON.stringify(definition).includes('"priority"'), false);

  for (const transition of definition.transitions.slice(0, 7)) {
    assert.deepEqual(transition.next_transition_rules, [{
      condition: null,
      task_action_id: definition.transitions[definition.transitions.indexOf(transition) + 1].task_action_id,
    }]);
  }
  assert.deepEqual(definition.transitions.find((item) => item.task_action_id === "PR-8").next_transition_rules, [
    {
      condition: {
        fact_id: "feature_change_transition_direction",
        operator: "equals",
        value: "existing_feature_issue",
      },
      task_action_id: "PR-9",
    },
    {
      condition: {
        fact_id: "feature_change_transition_direction",
        operator: "equals",
        value: "new_feature_issue",
      },
      task_action_id: "PR-10",
    },
  ]);
  assert.deepEqual(definition.transitions.find((item) => item.task_action_id === "PR-9").next_transition_rules, [{
    condition: null,
    task_action_id: "PR-10",
  }]);
  assert.deepEqual(definition.transitions.find((item) => item.task_action_id === "PR-10").next_transition_rules, [
    {
      condition: {
        fact_id: "feature_change_transition_direction",
        operator: "equals",
        value: "existing_feature_issue",
      },
      task_action_id: "PR-11",
    },
    {
      condition: {
        fact_id: "feature_change_transition_direction",
        operator: "equals",
        value: "new_feature_issue",
      },
      task_action_id: "PR-12",
    },
  ]);
  assert.deepEqual(definition.transitions.find((item) => item.task_action_id === "PR-11").next_transition_rules, []);
  assert.deepEqual(definition.transitions.find((item) => item.task_action_id === "PR-12").next_transition_rules, []);

  assert.equal(definition.transitions.find((item) => item.task_action_id === "PR-5").executor_reference, null);
  assert.equal(definition.transitions.find((item) => item.task_action_id === "PR-12").executor_reference, null);
  assert.deepEqual(
    definition.transitions.find((item) => item.task_action_id === "PR-8").completion_predicate,
    { fact_id: "feature_change_transition_reflected", operator: "equals", value: true },
  );
  assert.deepEqual(
    definition.transitions.find((item) => item.task_action_id === "PR-9").completion_predicate,
    { fact_id: "feature_change_transition_target_related", operator: "equals", value: true },
  );
  assert.deepEqual(
    definition.transitions.find((item) => item.task_action_id === "PR-10").completion_predicate,
    { fact_id: "policy_review_issue_closed", operator: "equals", value: true },
  );
  assert.deepEqual(
    definition.transitions.find((item) => item.task_action_id === "PR-11").completion_predicate,
    {
      all: [
        { fact_id: "feature_change_transition_result", operator: "equals", value: "existing_issue_updated" },
        { fact_id: "feature_change_transition_reflected", operator: "equals", value: true },
        { fact_id: "policy_review_issue_closed", operator: "equals", value: true },
        { fact_id: "feature_change_transition_target_related", operator: "equals", value: true },
      ],
    },
  );
  assert.deepEqual(
    definition.transitions.find((item) => item.task_action_id === "PR-12").completion_predicate,
    {
      all: [
        { fact_id: "feature_change_transition_direction", operator: "equals", value: "new_feature_issue" },
        { fact_id: "feature_change_transition_reflected", operator: "equals", value: true },
        { fact_id: "policy_review_issue_closed", operator: "equals", value: true },
      ],
    },
  );

  const validation = validateWorkflowDefinition(definition);
  assert.equal(validation.valid, true, JSON.stringify(validation.errors));
  assert.deepEqual(validation.errors, []);
});

test("policy-review representative states resolve to exactly one expected action or terminal outcome", async () => {
  const [definition, states] = await Promise.all([readJson(definitionUrl), readJson(statesUrl)]);
  const definitionBefore = structuredClone(definition);
  const cases = [
    ["new_request", "PR-1", "issue-creation"],
    ["completed_feature_proposal_transition", "PR-1", "issue-creation"],
    ["confirmed_draft", "PR-2", "github-simple-executor"],
    ["created_issue", "PR-3", "policy-plan"],
    ["confirmed_policy_design", "PR-4", "github-simple-executor"],
    ["reflected_policy_design_before_implementation", "PR-5", null],
    ["implementation_started_waiting_for_merge", "PR-5", null],
    ["design_document_merged", "PR-6", "github-simple-executor"],
    ["design_document_result_reflected", "PR-7", "policy-review-next-triage"],
    ["transition_candidates_waiting_for_direction", "PR-7", "policy-review-next-triage"],
    ["existing_direction_target_unselected", "PR-7", "policy-review-next-triage"],
    ["existing_direction_not_reflected", "PR-8", "github-simple-executor"],
    ["existing_direction_reflected_open", "PR-9", "github-simple-executor"],
    ["existing_direction_related_open", "PR-10", "github-simple-executor"],
    ["closed_existing_update_pending", "PR-11", "github-simple-executor"],
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
    evaluateWorkflowDefinition(definition, states.completed_existing_issue),
    { status: "completed", task_action_id: "PR-11" },
  );
  for (const name of ["completed_new_issue", "closed_new_flow_ready"]) {
    assert.deepEqual(
      evaluateWorkflowDefinition(definition, states[name]),
      { status: "completed", task_action_id: "PR-12" },
      name,
    );
  }
  assert.deepEqual(definition, definitionBefore);
});

test("policy-review blocks both feature-change handoffs until the original issue is closed", async () => {
  const [definition, states] = await Promise.all([readJson(definitionUrl), readJson(statesUrl)]);
  for (const [direction, startTaskActionId] of [
    ["existing_feature_issue", "PR-11"],
    ["new_feature_issue", "PR-12"],
  ]) {
    const state = structuredClone(
      direction === "existing_feature_issue"
        ? states.existing_direction_related_open
        : states.existing_direction_reflected_open,
    );
    state.feature_change_transition_direction = direction;
    const stateBefore = structuredClone(state);
    const result = evaluateWorkflowDefinition(definition, state);
    const directStart = evaluateWorkflowDefinition(definition, state, {
      currentTaskActionId: startTaskActionId,
    });

    assert.equal(result.status, "action_required", direction);
    assert.equal(result.task_action_id, "PR-10", direction);
    assert.deepEqual(directStart, {
      status: "stopped",
      reason: "current_task_action_condition_not_met",
      task_action_id: startTaskActionId,
    }, direction);
    assert.deepEqual(state, stateBefore, direction);
  }
});

test("policy-review only performs the existing-target update after closing its original issue", async () => {
  const [definition, states] = await Promise.all([readJson(definitionUrl), readJson(statesUrl)]);
  const existingState = structuredClone(states.closed_existing_update_pending);
  const existingBefore = structuredClone(existingState);
  const existingResult = evaluateWorkflowDefinition(definition, existingState);
  assert.equal(existingResult.status, "action_required");
  assert.equal(existingResult.task_action_id, "PR-11");
  assert.equal(existingResult.executor_reference, "github-simple-executor");
  assert.deepEqual(existingState, existingBefore);

  assert.deepEqual(
    evaluateWorkflowDefinition(definition, states.closed_new_flow_ready),
    { status: "completed", task_action_id: "PR-12" },
  );
});

test("policy-review records the selected existing target relation before closing the source issue", async () => {
  const [definition, states] = await Promise.all([readJson(definitionUrl), readJson(statesUrl)]);
  const targetNotSelected = evaluateWorkflowDefinition(definition, states.existing_direction_target_unselected);
  assert.equal(targetNotSelected.status, "action_required");
  assert.equal(targetNotSelected.task_action_id, "PR-7");
  assert.deepEqual(
    evaluateWorkflowDefinition(definition, states.existing_direction_target_unselected, { currentTaskActionId: "PR-8" }),
    {
      status: "stopped",
      reason: "current_task_action_condition_not_met",
      task_action_id: "PR-8",
    },
  );

  const missingRelation = evaluateWorkflowDefinition(definition, states.existing_direction_reflected_open);
  assert.equal(missingRelation.status, "action_required");
  assert.equal(missingRelation.task_action_id, "PR-9");

  const relationRecorded = evaluateWorkflowDefinition(definition, states.existing_direction_related_open);
  assert.equal(relationRecorded.status, "action_required");
  assert.equal(relationRecorded.task_action_id, "PR-10");

  const closedWithoutRelation = structuredClone(states.closed_existing_update_pending);
  closedWithoutRelation.feature_change_transition_target_related = false;
  const repairRelation = evaluateWorkflowDefinition(definition, closedWithoutRelation);
  assert.equal(repairRelation.status, "action_required");
  assert.equal(repairRelation.task_action_id, "PR-9");
  assert.deepEqual(
    evaluateWorkflowDefinition(definition, closedWithoutRelation, { currentTaskActionId: "PR-11" }),
    {
      status: "stopped",
      reason: "current_task_action_condition_not_met",
      task_action_id: "PR-11",
    },
  );
});

test("policy-review re-evaluates completed branches from the definition entry without a transition marker", async () => {
  const [definition, states] = await Promise.all([readJson(definitionUrl), readJson(statesUrl)]);
  assert.deepEqual(
    evaluateWorkflowDefinition(definition, states.completed_existing_issue),
    { status: "completed", task_action_id: "PR-11" },
  );
  assert.deepEqual(
    evaluateWorkflowDefinition(definition, states.completed_new_issue),
    { status: "completed", task_action_id: "PR-12" },
  );
  const existingResumed = structuredClone(states.completed_existing_issue);
  delete existingResumed.feature_change_transition_target_issue_selected;
  assert.deepEqual(
    evaluateWorkflowDefinition(definition, existingResumed),
    { status: "completed", task_action_id: "PR-11" },
  );
});

test("policy-review adapter maps observations in definition order and preserves copied evidence", async () => {
  const definition = await readJson(definitionUrl);
  const observations = validObservations();
  const definitionBefore = structuredClone(definition);
  const observationsBefore = structuredClone(observations);
  const result = normalizePolicyReviewFacts(definition, observations);
  const repeatedResult = normalizePolicyReviewFacts(definition, observations);

  assert.equal(result.status, "normalized");
  assert.equal(result.workflow_id, "policy-review");
  assert.equal(JSON.stringify(result), JSON.stringify(repeatedResult));
  assert.deepEqual(Object.keys(result.normalized_fact_state), Object.keys(definition.facts));
  assert.deepEqual(Object.keys(result.evidence_by_fact), Object.keys(definition.facts));
  assert.deepEqual(result.evidence_by_fact.policy_design_proposal_usable, [{
    source_kind: "skill_output",
    source_reference: "policy-plan",
    field_reference: "facts.policy_design_proposal_usable",
  }]);
  assert.deepEqual(result.evidence_by_fact.policy_review_entry_source, [{
    source_kind: "local_state",
    source_reference: "test-request-policy-review",
    field_reference: "routing_check.policy_review_entry_source",
  }]);
  assert.deepEqual(result.evidence_by_fact.feature_change_transition_target_related, [{
    source_kind: "github_state",
    source_reference: "issue #95",
    field_reference: "related_issues[issue #83]",
  }]);
  assert.deepEqual(result.evidence_by_fact.feature_change_transition_target_issue_selected, [{
    source_kind: "user_input",
    source_reference: "transition decision with issue #83",
    field_reference: "facts.feature_change_transition_target_issue_selected",
  }]);
  assert.notEqual(result.evidence_by_fact.policy_review_requested[0], observations[1]);
  assert.deepEqual(definition, definitionBefore);
  assert.deepEqual(observations, observationsBefore);
});

test("policy-review adapter rejects missing and unexpected source contracts before observation validation", async () => {
  const definition = await readJson(definitionUrl);
  const missingContractDefinition = structuredClone(definition);
  missingContractDefinition.facts.uncontracted_fact = [true, false];

  const missingContract = normalizePolicyReviewFacts(missingContractDefinition, null);
  assertAtomicFailure(missingContract, "source_contract_mismatch");
  assert.deepEqual(missingContract.errors, [{
    code: "source_contract.missing",
    path: "/facts/uncontracted_fact",
    message: "Missing source contract for fact_id uncontracted_fact.",
  }]);
  assert.deepEqual(normalizePolicyReviewFacts(missingContractDefinition, null), missingContract);

  const unexpectedContractDefinition = structuredClone(definition);
  const removedFactId = Object.keys(unexpectedContractDefinition.facts)[0];
  delete unexpectedContractDefinition.facts[removedFactId];
  const unexpectedContract = normalizePolicyReviewFacts(unexpectedContractDefinition, null);
  assertAtomicFailure(unexpectedContract, "source_contract_mismatch");
  assert.deepEqual(unexpectedContract.errors, [{
    code: "source_contract.unexpected",
    path: `/source_contracts/${removedFactId}`,
    message: `Unexpected source contract for fact_id ${removedFactId}.`,
  }]);
  assert.deepEqual(normalizePolicyReviewFacts(unexpectedContractDefinition, null), unexpectedContract);
});

test("policy-review adapter rejects workflow mismatch, wrong sources, and wrong skill executors atomically", async () => {
  const definition = await readJson(definitionUrl);
  const wrongWorkflow = structuredClone(definition);
  wrongWorkflow.workflow_id = "feature-proposal";
  const mismatch = normalizePolicyReviewFacts(wrongWorkflow, []);
  assertAtomicFailure(mismatch, "workflow_id_mismatch");
  assert.equal(hasError(mismatch, "workflow_id.mismatch", "/workflow_id"), true);

  const wrongSource = normalizePolicyReviewFacts(definition, [
    observation("policy_design_confirmed", true, "github_state", "issue #95"),
  ]);
  assertAtomicFailure(wrongSource, "invalid_observations");
  assert.equal(hasError(wrongSource, "observation.source_kind.mismatch", "/observations/0/source_kind"), true);

  const wrongTransitionSource = normalizePolicyReviewFacts(definition, [
    observation("policy_review_entry_source", "feature_proposal", "github_state", "issue #93"),
  ]);
  assertAtomicFailure(wrongTransitionSource, "invalid_observations");
  assert.equal(hasError(wrongTransitionSource, "observation.source_kind.mismatch", "/observations/0/source_kind"), true);

  const wrongTargetRelationSource = normalizePolicyReviewFacts(definition, [
    observation("feature_change_transition_target_related", true, "local_state", "workflow log"),
  ]);
  assertAtomicFailure(wrongTargetRelationSource, "invalid_observations");
  assert.equal(
    hasError(wrongTargetRelationSource, "observation.source_kind.mismatch", "/observations/0/source_kind"),
    true,
  );

  const wrongTargetSelectionSource = normalizePolicyReviewFacts(definition, [
    observation("feature_change_transition_target_issue_selected", true, "local_state", "workflow log"),
  ]);
  assertAtomicFailure(wrongTargetSelectionSource, "invalid_observations");
  assert.equal(
    hasError(wrongTargetSelectionSource, "observation.source_kind.mismatch", "/observations/0/source_kind"),
    true,
  );


  for (const [factId, sourceReference] of [
    ["policy_design_proposal_usable", "policy-review-next-triage"],
    ["feature_change_transition_candidates_usable", "policy-plan"],
  ]) {
    const wrongExecutor = normalizePolicyReviewFacts(definition, [
      observation(factId, true, "skill_output", sourceReference),
    ]);
    assertAtomicFailure(wrongExecutor, "invalid_observations");
    assert.equal(hasError(wrongExecutor, "observation.source_reference.mismatch", "/observations/0/source_reference"), true);
  }
});

test("policy-review adapter delegates unknown and duplicate fact rejection to the C1 adapter", async () => {
  const definition = await readJson(definitionUrl);
  const result = normalizePolicyReviewFacts(definition, [
    observation("unknown", true, "github_state", "issue #95"),
    observation("policy_review_requested", true, "user_input", "request"),
    observation("policy_review_requested", true, "user_input", "request"),
  ]);

  assertAtomicFailure(result, "invalid_fact_candidates");
  assert.equal(hasError(result, "candidate.fact.unknown", "/candidates/0/fact_id"), true);
  assert.equal(hasError(result, "candidate.fact_id.duplicate", "/candidates/2/fact_id"), true);
});

test("policy-review adapter rejects open and malformed observations without mutation", async () => {
  const definition = await readJson(definitionUrl);
  const observations = [
    { ...observation("policy_review_requested", true, "user_input", "request"), extra: true },
    { fact_id: "policy_review_issue_created", value: true, source_kind: "github_state", source_reference: "issue #95" },
    null,
  ];
  const definitionBefore = structuredClone(definition);
  const observationsBefore = structuredClone(observations);

  const result = normalizePolicyReviewFacts(definition, observations);

  assertAtomicFailure(result, "invalid_observations");
  assert.equal(hasError(result, "object.additional_property", "/observations/0/extra"), true);
  assert.equal(hasError(result, "observation.required", "/observations/1/field_reference"), true);
  assert.equal(hasError(result, "observation.type", "/observations/2"), true);
  assert.deepEqual(definition, definitionBefore);
  assert.deepEqual(observations, observationsBefore);
});
