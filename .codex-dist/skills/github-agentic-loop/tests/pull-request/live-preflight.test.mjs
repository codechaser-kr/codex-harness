import assert from "node:assert/strict";
import test from "node:test";

import { runPullRequestLivePreflight } from "../../scripts/pull-request/live-preflight.mjs";
import { preparePullRequestInput } from "../../scripts/pull-request/pr-input.mjs";

const HEAD_OID = "6f61cca7df8ebab203a78ae6e7e37cf4b48076ec";

function sourceInput(overrides = {}) {
  return {
    title: "semantic judgment stays upstream",
    body: "plain body that live preflight must not parse",
    base_branch: "main",
    head_branch: "feat/issue-128-separate-pr-input-preflight",
    related_issue: 128,
    ...overrides,
  };
}

function preparedInput(overrides = {}) {
  return preparePullRequestInput(sourceInput(overrides)).pull_request_input;
}

function creationRequest(input, overrides = {}) {
  return {
    input_digest: input.input_digest,
    title: input.title,
    body: input.body,
    base_branch: input.base_branch,
    head_branch: input.head_branch,
    ...overrides,
  };
}

function liveObservation(overrides = {}) {
  return {
    base_branch: "main",
    base_exists: true,
    head_branch: "feat/issue-128-separate-pr-input-preflight",
    head_exists: true,
    expected_head_oid: HEAD_OID,
    remote_head_oid: HEAD_OID,
    existing_pull_request_number: null,
    ...overrides,
  };
}

function clone(value) {
  return structuredClone(value);
}

function hasError(result, code, path) {
  return result.errors.some((error) => error.code === code && error.path === path);
}

test("accepts exact immutable identity and fresh remote facts without semantic revalidation", () => {
  const input = preparedInput();
  const request = creationRequest(input);
  const observation = liveObservation();
  const requestBefore = clone(request);
  const observationBefore = clone(observation);
  const result = runPullRequestLivePreflight(input, request, observation);

  assert.equal(result.status, "ready", JSON.stringify(result.errors));
  assert.equal(result.reason, null);
  assert.equal(result.input_digest, input.input_digest);
  assert.deepEqual(request, requestBefore);
  assert.deepEqual(observation, observationBefore);
  assert.equal(Object.isFrozen(result.live_observation), true);
  assert.equal(result.live_observation.remote_head_oid, HEAD_OID);
});

test("rejects every duplicated creation field that differs from immutable identity", () => {
  const input = preparedInput();
  for (const field of ["input_digest", "title", "body", "base_branch", "head_branch"]) {
    const request = creationRequest(input);
    request[field] = field === "input_digest"
      ? `sha256:${"0".repeat(64)}`
      : `${request[field]}-mismatch`;
    const result = runPullRequestLivePreflight(input, request, liveObservation());
    assert.equal(result.status, "stopped", field);
    assert.equal(result.reason, "pull_request_live_preflight_failed", field);
    assert.equal(hasError(
      result,
      `pull_request_preflight.identity.${field}.mismatch`,
      `/creation_request/${field}`,
    ), true, field);
  }
});

test("fails closed for missing or mismatched remote base and head observations", () => {
  const input = preparedInput();
  const request = creationRequest(input);
  const result = runPullRequestLivePreflight(input, request, liveObservation({
    base_branch: "release",
    base_exists: false,
    head_branch: "other-head",
    head_exists: false,
    remote_head_oid: null,
  }));

  assert.equal(result.status, "stopped");
  assert.equal(hasError(
    result,
    "pull_request_preflight.observation.base_branch.mismatch",
    "/observation/base_branch",
  ), true);
  assert.equal(hasError(
    result,
    "pull_request_preflight.remote_base.missing",
    "/observation/base_exists",
  ), true);
  assert.equal(hasError(
    result,
    "pull_request_preflight.observation.head_branch.mismatch",
    "/observation/head_branch",
  ), true);
  assert.equal(hasError(
    result,
    "pull_request_preflight.remote_head.missing",
    "/observation/head_exists",
  ), true);
});

test("blocks stale head OIDs and an existing same-head pull request", () => {
  const input = preparedInput();
  const request = creationRequest(input);
  const result = runPullRequestLivePreflight(input, request, liveObservation({
    remote_head_oid: "0".repeat(40),
    existing_pull_request_number: 132,
  }));

  assert.equal(result.status, "stopped");
  assert.equal(hasError(
    result,
    "pull_request_preflight.remote_head_oid.stale",
    "/observation/remote_head_oid",
  ), true);
  assert.equal(hasError(
    result,
    "pull_request_preflight.same_head_pull_request.conflict",
    "/observation/existing_pull_request_number",
  ), true);
});

test("rejects malformed input request and observation shapes with stable paths", () => {
  const input = preparedInput();

  const badInput = clone(input);
  badInput.title = "tampered without digest update";
  const inputResult = runPullRequestLivePreflight(
    badInput,
    creationRequest(input),
    liveObservation(),
  );
  assert.equal(inputResult.reason, "invalid_pull_request_input_identity");
  assert.equal(hasError(
    inputResult,
    "prepared_pull_request_input.embedded_digest.mismatch",
    "/pull_request_input/input_digest",
  ), true);

  const openRequest = creationRequest(input);
  openRequest.template = "must not be interpreted";
  const requestResult = runPullRequestLivePreflight(input, openRequest, liveObservation());
  assert.equal(requestResult.reason, "invalid_pull_request_creation_request");
  assert.equal(hasError(
    requestResult,
    "pull_request_preflight.creation_request.additional_property",
    "/creation_request/template",
  ), true);

  const badObservation = liveObservation({ base_exists: "yes" });
  const observationResult = runPullRequestLivePreflight(
    input,
    creationRequest(input),
    badObservation,
  );
  assert.equal(observationResult.reason, "invalid_pull_request_live_observation");
  assert.equal(hasError(
    observationResult,
    "pull_request_preflight.observation.base_exists.type",
    "/observation/base_exists",
  ), true);
});
