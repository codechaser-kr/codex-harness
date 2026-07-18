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
  assert.equal(definition.normalized_fact_schema.some((fact) => /reject.*(reason|rationale)/i.test(fact.fact_id)), false);

  const reviewInspection = definition.transitions.find((transition) => transition.task_action_id === "FI-14");
  assert.deepEqual(reviewInspection.next_transition_rules, [
    { condition: { fact_id: "review_mode", operator: "equals", value: "claude_code_review" }, transition_id: "run-claude-code-review" },
    { condition: { fact_id: "review_mode", operator: "equals", value: "claude_awesome_code_review" }, transition_id: "run-claude-awesome-code-review" },
    { condition: { fact_id: "review_mode", operator: "equals", value: "codex_awesome_code_review" }, transition_id: "run-codex-awesome-code-review" },
  ]);
  for (const [taskActionId, executorId] of [
    ["FI-15", "claude/code-review"],
    ["FI-16", "claude/awesome-code-review"],
    ["FI-17", "codex/awesome-code-review"],
  ]) {
    const transition = definition.transitions.find((item) => item.task_action_id === taskActionId);
    const executor = registry.find((entry) => entry.executor_id === executorId);
    assert.equal(transition.registered_executor_reference, executorId);
    assert.deepEqual([executor.executor_kind, executor.side_effect_scope], ["review_mode", "review_output"]);
    assert.equal(executor.executor_kind === "skill" && executor.side_effect_scope === "proposal_output", false);
    assert.deepEqual(transition.next_transition_rules, [{ condition: null, transition_id: "normalize-review-results" }]);
  }

  assert.deepEqual(definition.transitions.find((transition) => transition.task_action_id === "FI-18").next_transition_rules, [
    { condition: { fact_id: "review_feedback_importance", operator: "equals", value: "no_publishable_feedback" }, transition_id: "check-review-feedback-targets" },
    { condition: { fact_id: "review_feedback_importance", operator: "equals", value: "publishable_feedback" }, transition_id: "draft-review-comments" },
  ]);
  assert.equal(
    /marker|fallback|summary/i.test(JSON.stringify({
      fact_ids: definition.normalized_fact_schema.map((fact) => fact.fact_id),
      review_states: fixture.review_feedback_cases.map((scenario) => scenario.state),
    })),
    false,
  );

  const feedbackTargetCheck = definition.transitions.find((transition) => transition.task_action_id === "FI-24");
  assert.deepEqual(feedbackTargetCheck.completion_predicate, {
    all: [
      { fact_id: "github_review_threads_observed", operator: "equals", value: true },
      { fact_id: "review_feedback_inventory", operator: "exists" },
    ],
  });

  assert.equal(definition.transitions.find((transition) => transition.task_action_id === "FI-32").registered_executor_reference, null);
  assert.deepEqual(definition.transitions.find((transition) => transition.task_action_id === "FI-33").next_transition_rules, [
    { condition: { fact_id: "remaining_feedback_status", operator: "equals", value: "unhandled_feedback_present" }, transition_id: "determine-feedback-direction" },
    { condition: { fact_id: "remaining_feedback_status", operator: "equals", value: "unresolved_thread_present" }, transition_id: "determine-feedback-resolution" },
    { condition: { fact_id: "remaining_feedback_status", operator: "equals", value: "all_resolved" }, transition_id: "determine-pull-request-merge" },
  ]);

  const mergeDecision = definition.transitions.find((transition) => transition.task_action_id === "FI-34");
  assert.deepEqual(mergeDecision.user_decision_specification.options.map((option) => option.decision_id), ["merge_confirmed", "merge_deferred"]);
  assert.deepEqual(mergeDecision.completion_predicate, {
    fact_id: "pull_request_merge_decision", operator: "equals", value: "merge_confirmed",
  });
  assert.deepEqual(definition.transitions.find((transition) => transition.task_action_id === "FI-35").completion_predicate, {
    all: [
      { fact_id: "pull_request_merged", operator: "equals", value: true },
      { fact_id: "post_merge_reflection_completed", operator: "equals", value: true },
    ],
  });

  const nextCommit = definition.transitions.find((transition) => transition.task_action_id === "FI-8");
  assert.deepEqual(nextCommit.next_transition_rules, [
    { condition: { fact_id: "implementation_progress", operator: "equals", value: "next_commit_unit" }, transition_id: "implement-work-unit" },
    { condition: { fact_id: "implementation_progress", operator: "equals", value: "all_work_units_completed" }, transition_id: "push-implementation-branch" },
  ]);

  for (const [taskActionId, proposalFactId, confirmationFactId] of [
    ["FI-1", "branch_proposal_usable", "branch_proposal_confirmed"],
    ["FI-3", "implementation_plan_usable", "implementation_plan_confirmed"],
    ["FI-10", "pull_request_draft_usable", "pull_request_draft_confirmed"],
  ]) {
    assert.deepEqual(definition.transitions.find((transition) => transition.task_action_id === taskActionId).completion_predicate, {
      all: [
        { fact_id: proposalFactId, operator: "equals", value: true },
        { fact_id: confirmationFactId, operator: "equals", value: true },
      ],
    });
  }
  assert.deepEqual(definition.transitions.find((transition) => transition.task_action_id === "FI-11").completion_predicate, {
    fact_id: "pull_request_creation_requested", operator: "equals", value: true,
  });
  assert.deepEqual(definition.transitions.find((transition) => transition.task_action_id === "FI-12").completion_predicate, {
    fact_id: "pull_request_created", operator: "equals", value: true,
  });

  const validation = validateWorkflowDefinition(definition);
  assert.equal(validation.valid, true, JSON.stringify(validation.errors));
  assert.deepEqual(validation.errors, []);
});

test("implementation pre-PR states resolve from entry to exactly one expected action without mutation", async () => {
  const [definition, fixture] = await Promise.all([readJson(definitionUrl), readJson(statesUrl)]);
  const cumulativeState = {};

  for (const scenario of fixture.pre_pr_cases) {
    Object.assign(cumulativeState, structuredClone(scenario.updates));
    const state = structuredClone(cumulativeState);
    const stateBefore = structuredClone(state);
    const result = evaluateWorkflowDefinition(definition, state);
    assert.equal(result.status, "action_required", scenario.name);
    assert.equal(result.task_action_id, scenario.task_action_id, scenario.name);
    assert.deepEqual(state, stateBefore, scenario.name);
  }
});

test("implementation pre-PR condition mismatch stops without mutating state", async () => {
  const definition = await readJson(definitionUrl);
  const state = { branch_proposal_usable: true, branch_proposal_confirmed: false };
  const stateBefore = structuredClone(state);
  const result = evaluateWorkflowDefinition(definition, state, { currentTransitionId: "switch-branch" });

  assert.deepEqual(result, {
    status: "stopped",
    reason: "current_transition_condition_not_met",
    transition_id: "switch-branch",
  });
  assert.deepEqual(state, stateBefore);
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

test("implementation review and feedback states resolve to one action or completion without mutation", async () => {
  const [definition, fixture] = await Promise.all([readJson(definitionUrl), readJson(statesUrl)]);
  for (const scenario of fixture.review_feedback_cases) {
    const stateBefore = structuredClone(scenario.state);
    const result = evaluateWorkflowDefinition(definition, scenario.state, {
      currentTransitionId: scenario.current_transition_id,
    });
    assert.equal(result.status, scenario.status, scenario.name);
    if (scenario.status === "action_required") {
      assert.equal(result.task_action_id, scenario.task_action_id, scenario.name);
    } else {
      assert.equal(result.transition_id, "complete-implementation", scenario.name);
    }
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
    source_kind: "local_state",
    source_reference: "unresolved threads and processed feedback comparison",
    field_reference: "facts.review_feedback_inventory",
  }]);
  assert.deepEqual(result.evidence_by_fact.github_review_threads_observed, [{
    source_kind: "github_state",
    source_reference: "PR #99 unresolved review threads",
    field_reference: "facts.github_review_threads_observed",
  }]);
  assert.deepEqual(result.evidence_by_fact.remaining_feedback_status, [{
    source_kind: "local_state",
    source_reference: "processed feedback comparison",
    field_reference: "facts.remaining_feedback_status",
  }]);
  for (const [factId, sourceReference] of [
    ["branch_proposal_confirmed", "branch proposal decision"],
    ["implementation_plan_confirmed", "implementation plan decision"],
    ["pull_request_draft_confirmed", "PR draft decision"],
    ["pull_request_creation_requested", "PR creation decision"],
  ]) {
    assert.deepEqual(result.evidence_by_fact[factId], [{
      source_kind: "user_input",
      source_reference: sourceReference,
      field_reference: `facts.${factId}`,
    }]);
  }
  assert.deepEqual(result.evidence_by_fact.pull_request_created, [{
    source_kind: "github_state",
    source_reference: "PR #99",
    field_reference: "facts.pull_request_created",
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

  for (const [factId, sourceKind] of [
    ["branch_proposal_confirmed", "skill_output"],
    ["implementation_plan_confirmed", "github_state"],
    ["pull_request_draft_confirmed", "skill_output"],
  ]) {
    const confirmation = observations.find((observation) => observation.fact_id === factId);
    const invalidConfirmation = normalizeImplementationFacts(definition, [{ ...confirmation, source_kind: sourceKind }]);
    assertAtomicFailure(invalidConfirmation, "invalid_observations");
    assert.equal(hasError(invalidConfirmation, "observation.source_kind.mismatch", "/observations/0/source_kind"), true, factId);
  }

  const branchProposal = observations.find((observation) => observation.fact_id === "branch_proposal_usable");
  const wrongReference = normalizeImplementationFacts(definition, [{ ...branchProposal, source_reference: "commit-plan" }]);
  assertAtomicFailure(wrongReference, "invalid_observations");
  assert.equal(hasError(wrongReference, "observation.source_reference.mismatch", "/observations/0/source_reference"), true);

  const implementationProgress = observations.find((observation) => observation.fact_id === "implementation_progress");
  const invalidEnum = normalizeImplementationFacts(definition, [{ ...implementationProgress, value: "pending_assessment" }]);
  assertAtomicFailure(invalidEnum, "invalid_fact_candidates");
  assert.equal(hasError(invalidEnum, "candidate.value.not_allowed", "/candidates/0/value"), true);

  for (const [factId, value] of [
    ["review_mode", "unknown_review_mode"],
    ["review_comment_posting_direction", "post_as_drafted"],
    ["review_feedback_direction", "reject_with_generated_reason"],
    ["feedback_resolution", "partially_resolved"],
    ["remaining_feedback_status", "marker_comment_present"],
    ["pull_request_merge_decision", "automatically_merge"],
  ]) {
    const observation = observations.find((item) => item.fact_id === factId);
    const result = normalizeImplementationFacts(definition, [{ ...observation, value }]);
    assertAtomicFailure(result, "invalid_fact_candidates");
    assert.equal(hasError(result, "candidate.value.not_allowed", "/candidates/0/value"), true, factId);
  }

  for (const [factId, sourceKind] of [
    ["review_mode_checked", "github_state"],
    ["review_feedback_importance", "github_state"],
    ["github_review_threads_observed", "local_state"],
    ["review_feedback_inventory", "github_state"],
    ["review_feedback_direction", "local_state"],
    ["feedback_resolution", "github_state"],
    ["feedback_resolution_reflected", "github_state"],
    ["remaining_feedback_status", "github_state"],
    ["pull_request_merge_decision", "github_state"],
    ["pull_request_merged", "local_state"],
    ["post_merge_reflection_completed", "github_state"],
  ]) {
    const observation = observations.find((item) => item.fact_id === factId);
    const result = normalizeImplementationFacts(definition, [{ ...observation, source_kind: sourceKind }]);
    assertAtomicFailure(result, "invalid_observations");
    assert.equal(hasError(result, "observation.source_kind.mismatch", "/observations/0/source_kind"), true, factId);
  }

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
