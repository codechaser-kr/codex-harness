import assert from "node:assert/strict";
import test from "node:test";

import { parseJsonFile } from "../../scripts/workflow-definition/parser.mjs";
import { runWorkflowObservationCycle, selectNextImplementationGroup } from "../../scripts/workflow-definition/composition-runtime.mjs";

const request = (issueId) => ({
  request_id: "request-203",
  source_issue_id: String(issueId),
  target_baseline: { issue_id: String(issueId) },
});

function observed(factId, value, sourceKind, sourceReference, fieldReference) {
  return { fact_id: factId, value, source_kind: sourceKind, source_reference: sourceReference, field_reference: fieldReference };
}

function githubResult(issueId, observedFacts) {
  return {
    request_id: "request-203",
    target_baseline: { issue_id: String(issueId) },
    source_identifiers: [`issue #${issueId}`],
    observed_facts: observedFacts,
    missing_or_conflicting_facts: [],
    actual_executor_type: "mocked_skill",
    actual_agent_or_role: "github-state-summary",
    actual_model_identifier: "mock-model",
    actual_skill_identifier: "github-state-summary",
    actual_config_identifier: "mock-read-only-config",
    actual_orchestration_session_id: "mock-orchestration-session",
    actual_execution_session_id: "mock-summary-session",
    actual_session_relation: "child_execution",
    actual_permission_conditions: ["read_only"],
    actual_available_tool_conditions: ["gh issue view"],
    actual_command_execution_path: "mocked_read_only_tool_path",
    execution_path_recheck_result: "satisfied",
    performed_actions: ["mocked GitHub state observation"],
    changed_files: [],
    github_state_changes: [],
    verification_results: [],
    postconditions_satisfied: true,
    residual_risks_or_failure_reasons: [],
  };
}

function logResult(issueId, observedFacts, extra = {}) {
  return {
    request_id: "request-203",
    target_baseline: { issue_id: String(issueId) },
    source_identifiers: [".github-agentic-loop/logs/github-workflow-log-2026-11-21.md"],
    observed_facts: observedFacts,
    missing_or_conflicting_facts: [],
    ...extra,
  };
}

async function definition(workflowId) {
  const parsed = await parseJsonFile(new URL(`../../definitions/${workflowId}.json`, import.meta.url));
  assert.equal(parsed.ok, true, parsed.ok ? "" : parsed.error.message);
  return parsed.value;
}

async function runMockedRuntime({ workflowId, taskActionId, issueId, github, log, parentContext, githubResultOverrides = {} }) {
  const calls = [];
  const result = await runWorkflowObservationCycle({
    request: request(issueId),
    definition: await definition(workflowId),
    currentTaskActionId: taskActionId,
    observeGithubState: async (input) => {
      calls.push(["github", input]);
      return { ...githubResult(issueId, github), ...githubResultOverrides };
    },
    observeWorkflowLog: async (input) => {
      calls.push(["log", input]);
      return logResult(issueId, log, parentContext ? { parent_workflow_context: parentContext } : {});
    },
  });
  assert.deepEqual(calls, [
    ["github", { request_id: "request-203", target_baseline: { issue_id: String(issueId) } }],
    ["log", { request_id: "request-203", target_baseline: { issue_id: String(issueId) } }],
  ]);
  return result;
}

test("feature-proposal completes and selects its serial successor only after GitHub reports the source issue closed", async (t) => {
  for (const [direction, taskActionId, expectedWorkflow, entryFact] of [
    ["policy_review", "FP-6", "policy-review", "policy_review_entry_source"],
    ["feature_change", "FP-7", "feature-change", "feature_change_entry_source"],
  ]) {
    await t.test(direction, async () => {
      const result = await runMockedRuntime({
        workflowId: "feature-proposal",
        taskActionId,
        issueId: 203,
        github: [
          observed("feature_proposal_direction_reflected", true, "github_state", "issue #203", "body.direction"),
          observed("feature_proposal_issue_closed", true, "github_state", "issue #203", "state"),
        ],
        log: [observed("feature_proposal_direction", direction, "user_input", "request-203", "user_decision.direction")],
      });
      assert.equal(result.status, "completed");
      assert.deepEqual(result.workflow_handoff, {
        status: "start_workflow",
        workflow_id: expectedWorkflow,
        source_issue_id: "203",
        entry_facts: { [entryFact]: "feature_proposal" },
      });
    });
  }
});

test("policy-review existing-target route ends after updating the exact related issue", async () => {
  const github = [
    observed("feature_change_transition_reflected", true, "github_state", "issue #203", "body.transition"),
    observed("feature_change_transition_target_related", true, "github_state", "issue #203", "related_issues[issue #118]"),
    observed("policy_review_issue_closed", true, "github_state", "issue #203", "state"),
    observed("feature_change_transition_result", "existing_issue_updated", "github_state", "issue #118", "body.policy_review_update"),
  ];
  const log = [
    observed("feature_change_transition_candidates_usable", true, "skill_output", "policy-review-next-triage", "candidates[0]"),
    observed("feature_change_transition_direction", "existing_feature_issue", "user_input", "request-203", "user_decision.direction"),
    observed("feature_change_transition_target_issue_selected", true, "user_input", "request-203", "user_decision.issue_id"),
  ];
  const result = await runMockedRuntime({ workflowId: "policy-review", taskActionId: "PR-11", issueId: 203, github, log });

  assert.equal(result.status, "completed");
  assert.deepEqual(result.workflow_handoff, {
    status: "workflow_ended",
    reason: "existing_feature_issue_updated",
    updated_target_issue_id: 118,
  });

  const mismatchedUpdate = await runMockedRuntime({
    workflowId: "policy-review",
    taskActionId: "PR-11",
    issueId: 203,
    github: github.map((item) => item.fact_id === "feature_change_transition_result"
      ? { ...item, source_reference: "issue #119" }
      : item),
    log,
  });
  assert.equal(mismatchedUpdate.workflow_handoff.status, "unresolved");
  assert.equal(mismatchedUpdate.workflow_handoff.reason, "existing_target_issue_id_mismatch_between_relation_and_update_result");
  assert.equal(mismatchedUpdate.workflow_handoff.expected_target_issue_id, 118);
  assert.equal(mismatchedUpdate.workflow_handoff.observed_update_issue_id, 119);
  assert.equal(Object.hasOwn(mismatchedUpdate.workflow_handoff, "updated_target_issue_id"), false);

  const ambiguous = await runMockedRuntime({
    workflowId: "policy-review",
    taskActionId: "PR-11",
    issueId: 203,
    github: [...github, observed("feature_change_transition_target_related", true, "github_state", "issue #203", "related_issues[issue #119]")],
    log,
  });
  assert.equal(ambiguous.status, "stopped");
  assert.equal(ambiguous.reason, "invalid_fact_candidates");
  assert.equal(Object.hasOwn(ambiguous, "workflow_handoff"), false);
});

test("policy-review new-target route selects feature-change only after source close; successor creates the target", async () => {
  const openSource = await runMockedRuntime({
    workflowId: "policy-review",
    taskActionId: "PR-12",
    issueId: 203,
    github: [
      observed("feature_change_transition_reflected", true, "github_state", "issue #203", "body.transition"),
      observed("policy_review_issue_closed", false, "github_state", "issue #203", "state"),
    ],
    log: [observed("feature_change_transition_direction", "new_feature_issue", "user_input", "request-203", "user_decision.direction")],
  });
  assert.notEqual(openSource.status, "completed");
  assert.equal(openSource.workflow_handoff, null);

  const closedSource = await runMockedRuntime({
    workflowId: "policy-review",
    taskActionId: "PR-12",
    issueId: 203,
    github: [
      observed("feature_change_transition_reflected", true, "github_state", "issue #203", "body.transition"),
      observed("policy_review_issue_closed", true, "github_state", "issue #203", "state"),
    ],
    log: [observed("feature_change_transition_direction", "new_feature_issue", "user_input", "request-203", "user_decision.direction")],
  });
  assert.deepEqual(closedSource.workflow_handoff, {
    status: "start_workflow",
    workflow_id: "feature-change",
    source_issue_id: "203",
    entry_facts: { feature_change_entry_source: "policy_review" },
    create_target_in_successor: true,
  });
});

test("GitHub issue state overrides conflicting workflow-log state", async () => {
  const result = await runMockedRuntime({
    workflowId: "feature-proposal",
    taskActionId: "FP-6",
    issueId: 203,
    github: [
      observed("feature_proposal_direction_reflected", true, "github_state", "issue #203", "body.direction"),
      observed("feature_proposal_issue_closed", false, "github_state", "issue #203", "state"),
    ],
    log: [
      observed("feature_proposal_direction", "policy_review", "user_input", "request-203", "user_decision.direction"),
      observed("feature_proposal_issue_closed", true, "local_state", "request-203", "workflow_log.last_observed_state"),
    ],
  });

  assert.equal(result.status, "action_required");
  assert.equal(result.evaluation.task_action_id, "FP-6");
  assert.equal(result.normalized.normalized_fact_state.feature_proposal_issue_closed, false);
  assert.equal(result.source_conflicts.length, 1);
  assert.equal(result.source_conflicts[0].selected_source_kind, "github_state");
  assert.equal(result.workflow_handoff, null);
});

test("runtime refuses a GitHub summary with mismatched request correlation or write side effects", async () => {
  const badSummary = githubResult(203, [
    observed("feature_proposal_direction_reflected", true, "github_state", "issue #203", "body.direction"),
  ]);
  badSummary.request_id = "another-request";
  badSummary.github_state_changes = ["issue #203 closed"];
  const result = await runWorkflowObservationCycle({
    request: request(203),
    definition: await definition("feature-proposal"),
    observeGithubState: async () => badSummary,
    observeWorkflowLog: async () => logResult(203, []),
  });

  assert.equal(result.status, "stopped");
  assert.equal(result.reason, "observation_source_invalid");
  assert.equal(result.errors.some((error) => error.code === "source_result.request_id.mismatch"), true);
  assert.equal(result.errors.some((error) => error.code === "source_result.read_only_evidence.changed"), true);
  assert.equal(Object.hasOwn(result, "evaluation"), false);
});

test("runtime refuses GitHub observations unless both read-only postconditions are satisfied", async (t) => {
  for (const [name, githubResultOverrides, expectedErrorCode] of [
    ["failed execution-path recheck", { execution_path_recheck_result: "failed" }, "source_result.execution_path_recheck.unsatisfied"],
    ["unknown execution-path recheck status", { execution_path_recheck_result: "satisfied_with_warning" }, "source_result.execution_path_recheck.unsatisfied"],
    ["unsatisfied postconditions", { postconditions_satisfied: false }, "source_result.postconditions.unsatisfied"],
    ["non-boolean postconditions", { postconditions_satisfied: "true" }, "source_result.postconditions.unsatisfied"],
  ]) {
    await t.test(name, async () => {
      const result = await runMockedRuntime({
        workflowId: "feature-proposal",
        taskActionId: "FP-6",
        issueId: 203,
        github: [
          observed("feature_proposal_direction_reflected", true, "github_state", "issue #203", "body.direction"),
          observed("feature_proposal_issue_closed", true, "github_state", "issue #203", "state"),
        ],
        log: [observed("feature_proposal_direction", "policy_review", "user_input", "request-203", "user_decision.direction")],
        githubResultOverrides,
      });

      assert.equal(result.status, "stopped");
      assert.equal(result.reason, "observation_source_invalid");
      assert.equal(result.errors.some((error) => error.code === expectedErrorCode), true);
      assert.equal(Object.hasOwn(result, "evaluation"), false);
      assert.equal(Object.hasOwn(result, "workflow_handoff"), false);
    });
  }
});

test("completed implementation returns to its recorded parent for entry re-evaluation", async () => {
  for (const parentWorkflowId of ["policy-review", "feature-change", "feature-fix"]) {
    const result = await runMockedRuntime({
      workflowId: "implementation",
      taskActionId: "FI-36",
      issueId: 203,
      github: [
        observed("pull_request_merged", true, "github_state", "PR #220", "merged"),
      ],
      log: [
        observed("post_merge_reflection_completed", true, "local_state", "request-203", "workflow_log.post_merge_reflection_completed"),
        observed("implementation_completed", true, "local_state", "request-203", "workflow_log.implementation_completed"),
      ],
      parentContext: { workflow_id: parentWorkflowId, source_issue_id: "203", implementation_unit_id: "C-1" },
    });
    assert.deepEqual(result.workflow_handoff, {
      status: "re_evaluate_parent",
      workflow_id: parentWorkflowId,
      source_issue_id: "203",
      implementation_unit_id: "C-1",
      resume_from_definition_entry: true,
    });
  }
});

test("approved implementation groups fan out in parallel and wait at each sequential group barrier", () => {
  const approvedPlan = {
    approved: true,
    work_units: [
      { unit_id: "C-1", prerequisites: [] },
      { unit_id: "C-2", prerequisites: [] },
      { unit_id: "C-3", prerequisites: ["C-1"] },
    ],
    execution_groups: [
      { group_id: "G-1", work_unit_ids: ["C-1", "C-2"] },
      { group_id: "G-2", work_unit_ids: ["C-3"] },
    ],
    execution_group_order: ["G-1", "G-2"],
  };

  assert.deepEqual(selectNextImplementationGroup({
    parentWorkflowId: "feature-change",
    sourceIssueId: "203",
    approvedPlan,
  }), {
    status: "launch",
    workflow_id: "implementation",
    parent_workflow_id: "feature-change",
    source_issue_id: "203",
    execution_group_id: "G-1",
    work_unit_ids: ["C-1", "C-2"],
    parallel: true,
  });
  assert.deepEqual(selectNextImplementationGroup({
    parentWorkflowId: "feature-change",
    sourceIssueId: "203",
    approvedPlan,
    childRuns: [
      { unit_id: "C-1", status: "completed" },
      { unit_id: "C-2", status: "completed" },
    ],
  }), {
    status: "launch",
    workflow_id: "implementation",
    parent_workflow_id: "feature-change",
    source_issue_id: "203",
    execution_group_id: "G-2",
    work_unit_ids: ["C-3"],
    parallel: false,
  });
  assert.equal(selectNextImplementationGroup({
    parentWorkflowId: "feature-change",
    sourceIssueId: "203",
    approvedPlan: { ...approvedPlan, approved: false },
  }).status, "stopped");
  assert.equal(selectNextImplementationGroup({
    parentWorkflowId: "policy-review",
    sourceIssueId: "203",
    approvedPlan,
  }).status, "stopped");
});
