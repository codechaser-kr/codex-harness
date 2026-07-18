import assert from "node:assert/strict";
import test from "node:test";

import {
  compareValidationResults,
  validateValidationRequest,
  validateValidationSessionResult,
} from "../../scripts/validation-mode/comparator.mjs";
import { parseJsonFile } from "../../scripts/workflow-definition/parser.mjs";

const fixtures = new URL("./fixtures/", import.meta.url);

async function readFixture() {
  const result = await parseJsonFile(new URL("validation-mode-cases.json", fixtures));
  assert.equal(result.ok, true, result.ok ? "" : result.error.message);
  return result.value;
}

function makeResults(fixture) {
  return Array.from({ length: 10 }, (_, offset) => ({
    request_id: fixture.request.request_id,
    session_index: offset + 1,
    session_id: `session-${String(offset + 1).padStart(2, "0")}`,
    observed_invocation_specification: structuredClone(fixture.request.invocation_specification),
    ...structuredClone(fixture.session_result_template),
  }));
}

function hasError(result, code, path) {
  return result.errors.some((error) => error.code === code && error.path === path);
}

test("passes only when ten usable session results are semantically identical", async () => {
  const fixture = await readFixture();
  const result = compareValidationResults(fixture.request, makeResults(fixture));

  assert.deepEqual(result, {
    request_id: "validation-request-001",
    status: "pass",
    reason: "reproducible",
    session_count: 10,
    errors: [],
  });
});

test("ignores session result and object key order while preserving array semantics", async () => {
  const fixture = await readFixture();
  const results = makeResults(fixture).reverse().map((result) => ({
    side_effects: {
      pull_requests: [],
      commits: [],
      branches: [],
      repository_files: [],
      github_comments: [],
      github_state_changes: [],
    },
    semantic_decisions: {
      next_steps: ["create-policy-review"],
      confidence: "high",
      direction: "policy_review",
    },
    normalized_structured_contract_fields: {
      rationale_codes: ["cross-cutting-policy-impact", "requires-policy-review"],
      recommendation: { direction: "policy_review" },
    },
    registered_executor_invoked: false,
    output_status: "usable",
    observed_invocation_specification: {
      input: { evidence: ["issue-body", "request-state"], proposal_id: "proposal-001" },
      role_configuration: { role: "feature_proposal_reviewer" },
      reasoning_configuration: { effort: "high" },
      model_identifier: "test-model",
      skill_version: "1.0.0",
      skill_reference: "feature-proposal-triage",
    },
    session_id: result.session_id,
    session_index: result.session_index,
    request_id: result.request_id,
  }));

  const comparison = compareValidationResults(fixture.request, results);
  assert.equal(comparison.status, "pass");
  assert.equal(comparison.reason, "reproducible");
});

test("stops for a one-of-ten semantic mismatch without majority selection", async () => {
  const fixture = await readFixture();
  const results = makeResults(fixture);
  results[9].normalized_structured_contract_fields.rationale_codes.reverse();
  results[9].semantic_decisions.direction = "feature_change";

  const comparison = compareValidationResults(fixture.request, results);
  assert.equal(comparison.status, "stopped");
  assert.equal(comparison.reason, "not_reproducible");
  assert.equal(hasError(comparison, "comparison.normalized_structured_contract_fields.mismatch", "/session_results/10/normalized_structured_contract_fields"), true);
  assert.equal(hasError(comparison, "comparison.semantic_decisions.mismatch", "/session_results/10/semantic_decisions"), true);
  assert.equal(Object.hasOwn(comparison, "accepted_result"), false);
});

test("stops for duplicate or missing session indices and duplicate session IDs", async () => {
  const fixture = await readFixture();
  const indexResults = makeResults(fixture);
  indexResults[9].session_index = 9;
  const indexComparison = compareValidationResults(fixture.request, indexResults);
  assert.equal(indexComparison.status, "stopped");
  assert.equal(hasError(indexComparison, "session_index.duplicate", "/session_results/9/session_index"), true);
  assert.equal(hasError(indexComparison, "session_index.missing", "/session_results/10/session_index"), true);

  const idResults = makeResults(fixture);
  idResults[9].session_id = idResults[8].session_id;
  const idComparison = compareValidationResults(fixture.request, idResults);
  assert.equal(idComparison.status, "stopped");
  assert.equal(hasError(idComparison, "session_id.duplicate", "/session_results/10/session_id"), true);
});

test("stops for request and observed invocation mismatches", async () => {
  const fixture = await readFixture();
  const results = makeResults(fixture);
  results[4].request_id = "other-request";
  results[5].observed_invocation_specification.model_identifier = "other-model";

  const comparison = compareValidationResults(fixture.request, results);
  assert.equal(comparison.status, "stopped");
  assert.equal(hasError(comparison, "session_result.request_id.mismatch", "/session_results/5/request_id"), true);
  assert.equal(hasError(comparison, "session_result.invocation.mismatch", "/session_results/6/observed_invocation_specification"), true);
});

test("stops for blocked outputs, executor invocation, and every side-effect category", async () => {
  const fixture = await readFixture();
  const results = makeResults(fixture);
  results[0].output_status = "blocked";
  results[1].registered_executor_invoked = true;
  for (const category of Object.keys(results[2].side_effects)) {
    results[2].side_effects[category] = [{ observed: category }];
  }

  const comparison = compareValidationResults(fixture.request, results);
  assert.equal(comparison.status, "stopped");
  assert.equal(hasError(comparison, "session_result.output_status.blocked", "/session_results/1/output_status"), true);
  assert.equal(hasError(comparison, "registered_executor_invoked.forbidden", "/session_results/2/registered_executor_invoked"), true);
  for (const category of Object.keys(results[2].side_effects)) {
    assert.equal(hasError(comparison, "side_effects.nonempty", `/session_results/3/side_effects/${category}`), true, category);
  }
});

test("stops for an incorrect result count", async () => {
  const fixture = await readFixture();
  const comparison = compareValidationResults(fixture.request, makeResults(fixture).slice(0, 9));

  assert.equal(comparison.status, "stopped");
  assert.equal(comparison.session_count, 9);
  assert.equal(hasError(comparison, "session_results.count.invalid", "/session_results"), true);
  assert.equal(hasError(comparison, "session_index.missing", "/session_results/10/session_index"), true);
});

test("rejects invalid raw snapshots and inconsistent evaluation results", async () => {
  const fixture = await readFixture();

  const missingSnapshot = structuredClone(fixture.request);
  delete missingSnapshot.state_snapshot;
  const missingSnapshotResult = compareValidationResults(missingSnapshot, makeResults(fixture));
  assert.equal(missingSnapshotResult.status, "stopped");
  assert.equal(hasError(missingSnapshotResult, "validation_request.required", "/state_snapshot"), true);

  const invalidSnapshot = structuredClone(fixture.request);
  invalidSnapshot.state_snapshot.local_state = [];
  const invalidSnapshotResult = compareValidationResults(invalidSnapshot, makeResults(fixture));
  assert.equal(invalidSnapshotResult.status, "stopped");
  assert.equal(hasError(invalidSnapshotResult, "state_snapshot.local_state.type", "/state_snapshot/local_state"), true);

  const wrongStatus = structuredClone(fixture.request);
  wrongStatus.evaluation_result.status = "completed";
  const wrongStatusResult = compareValidationResults(wrongStatus, makeResults(fixture));
  assert.equal(wrongStatusResult.status, "stopped");
  assert.equal(hasError(wrongStatusResult, "evaluation_result.status.invalid", "/evaluation_result/status"), true);

  const wrongTaskAction = structuredClone(fixture.request);
  wrongTaskAction.evaluation_result.task_action_id = "FP-4";
  const wrongTaskActionResult = compareValidationResults(wrongTaskAction, makeResults(fixture));
  assert.equal(wrongTaskActionResult.status, "stopped");
  assert.equal(hasError(wrongTaskActionResult, "evaluation_result.task_action_id.mismatch", "/evaluation_result/task_action_id"), true);

  const wrongExecutor = structuredClone(fixture.request);
  wrongExecutor.evaluation_result.registered_executor_reference = "issue-creation";
  const wrongExecutorResult = compareValidationResults(wrongExecutor, makeResults(fixture));
  assert.equal(wrongExecutorResult.status, "stopped");
  assert.equal(hasError(wrongExecutorResult, "evaluation_result.registered_executor_reference.mismatch", "/evaluation_result/registered_executor_reference"), true);
});

test("returns structured errors for non-JSON, cyclic, and non-finite contracts", async () => {
  const fixture = await readFixture();
  const nonFiniteRequest = structuredClone(fixture.request);
  nonFiniteRequest.invocation_specification.input.score = Number.NaN;
  const nonFinite = compareValidationResults(nonFiniteRequest, makeResults(fixture));
  assert.equal(nonFinite.status, "stopped");
  assert.equal(nonFinite.reason, "invalid_request");
  assert.equal(hasError(nonFinite, "json_value.number.non_finite", "/invocation_specification/input/score"), true);

  const cyclicRequest = structuredClone(fixture.request);
  cyclicRequest.invocation_specification.input.self = cyclicRequest.invocation_specification.input;
  const cyclic = compareValidationResults(cyclicRequest, makeResults(fixture));
  assert.equal(cyclic.status, "stopped");
  assert.equal(hasError(cyclic, "json_value.cycle", "/invocation_specification/input/self"), true);

  const invalidResult = makeResults(fixture);
  invalidResult[0].normalized_structured_contract_fields.score = Number.NaN;
  const invalid = compareValidationResults(fixture.request, invalidResult);
  assert.equal(invalid.status, "stopped");
  assert.equal(hasError(invalid, "json_value.number.non_finite", "/session_results/1/normalized_structured_contract_fields/score"), true);

  const undefinedRequest = structuredClone(fixture.request);
  undefinedRequest.invocation_specification.input.omitted = undefined;
  const undefinedValue = compareValidationResults(undefinedRequest, makeResults(fixture));
  assert.equal(undefinedValue.status, "stopped");
  assert.equal(hasError(undefinedValue, "json_value.invalid", "/invocation_specification/input/omitted"), true);

  const fingerprintedRequest = structuredClone(fixture.request);
  fingerprintedRequest.fingerprint = "not-allowed";
  const fingerprinted = compareValidationResults(fingerprintedRequest, makeResults(fixture));
  assert.equal(fingerprinted.status, "stopped");
  assert.equal(hasError(fingerprinted, "object.additional_property", "/fingerprint"), true);

  const wrongExpectedCount = structuredClone(fixture.request);
  wrongExpectedCount.expected_session_count = 9;
  const wrongCount = compareValidationResults(wrongExpectedCount, makeResults(fixture));
  assert.equal(wrongCount.status, "stopped");
  assert.equal(hasError(wrongCount, "expected_session_count.invalid", "/expected_session_count"), true);

  assert.equal(validateValidationRequest(nonFiniteRequest).valid, false);
  assert.equal(validateValidationSessionResult(invalidResult[0]).valid, false);
});

test("does not mutate request or session result inputs", async () => {
  const fixture = await readFixture();
  const request = structuredClone(fixture.request);
  const results = makeResults(fixture);
  const requestBefore = structuredClone(request);
  const resultsBefore = structuredClone(results);

  const comparison = compareValidationResults(request, results);
  assert.equal(comparison.status, "pass");
  assert.deepEqual(request, requestBefore);
  assert.deepEqual(results, resultsBefore);
});
