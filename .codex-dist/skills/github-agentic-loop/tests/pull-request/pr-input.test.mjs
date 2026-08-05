import assert from "node:assert/strict";
import test from "node:test";

import {
  PULL_REQUEST_INPUT_FORMAT_VERSION,
  PULL_REQUEST_INPUT_TYPE,
  computePullRequestInputDigest,
  loadPullRequestInput,
  preparePullRequestInput,
} from "../../scripts/pull-request/pr-input.mjs";

function validInput() {
  return {
    title: "feature: immutable PR input 기반 추가",
    body: "## 작업 내용\n\n- immutable input을 연결합니다.\n\nRefs #128",
    base_branch: "main",
    head_branch: "feat/issue-128-separate-pr-input-preflight",
    related_issue: 128,
  };
}

function clone(value) {
  return structuredClone(value);
}

function hasError(result, code, path) {
  return result.errors.some((error) => error.code === code && error.path === path);
}

test("prepares byte-stable deep-frozen input without retaining mutable source state", () => {
  const source = validInput();
  const reordered = Object.fromEntries(Object.entries(source).reverse());
  const first = preparePullRequestInput(source);
  const second = preparePullRequestInput(reordered);

  assert.equal(first.status, "prepared", JSON.stringify(first.errors));
  assert.deepEqual(second, first);
  assert.equal(first.pull_request_input.input_type, PULL_REQUEST_INPUT_TYPE);
  assert.equal(first.pull_request_input.format_version, PULL_REQUEST_INPUT_FORMAT_VERSION);
  assert.match(first.pull_request_input.input_digest, /^sha256:[0-9a-f]{64}$/);
  assert.equal(
    first.pull_request_input.input_digest,
    computePullRequestInputDigest(first.pull_request_input),
  );
  assert.equal(Object.isFrozen(first.pull_request_input), true);
  assert.equal(JSON.stringify(first.pull_request_input), JSON.stringify(second.pull_request_input));

  source.title = "mutated after preparation";
  source.related_issue = 999;
  assert.equal(first.pull_request_input.title, "feature: immutable PR input 기반 추가");
  assert.equal(first.pull_request_input.related_issue, 128);
  assert.throws(() => {
    first.pull_request_input.body = "mutation attempt";
  }, TypeError);
});

test("returns stable closed-shape and field errors for malformed source input", () => {
  const invalid = validInput();
  delete invalid.body;
  invalid.title = "   ";
  invalid.related_issue = "#128";
  invalid.zeta = true;
  invalid.alpha = true;
  const result = preparePullRequestInput(invalid);

  assert.equal(result.status, "stopped");
  assert.equal(result.reason, "invalid_pull_request_input");
  assert.equal(result.pull_request_input, null);
  assert.deepEqual(result.errors.slice(0, 2).map(({ code, path }) => ({ code, path })), [
    { code: "pull_request_input.additional_property", path: "/alpha" },
    { code: "pull_request_input.additional_property", path: "/zeta" },
  ]);
  assert.equal(hasError(result, "pull_request_input.required", "/body"), true);
  assert.equal(hasError(result, "pull_request_input.title.empty", "/title"), true);
  assert.equal(hasError(result, "pull_request_input.related_issue.type", "/related_issue"), true);

  const nonObject = preparePullRequestInput("renderer Markdown");
  assert.equal(hasError(nonObject, "pull_request_input.type", ""), true);
});

test("loads an exact JSON-round-tripped prepared input as a frozen deterministic value", () => {
  const source = validInput();
  const prepared = preparePullRequestInput(source).pull_request_input;
  const serialized = JSON.parse(JSON.stringify(prepared));
  const loaded = loadPullRequestInput(source, { preparedInput: serialized });

  assert.equal(loaded.status, "loaded", JSON.stringify(loaded.errors));
  assert.equal(loaded.preparation, "reused");
  assert.deepEqual(loaded.pull_request_input, prepared);
  assert.equal(Object.isFrozen(loaded.pull_request_input), true);

  const newlyPrepared = loadPullRequestInput(source);
  assert.equal(newlyPrepared.status, "loaded");
  assert.equal(newlyPrepared.preparation, "prepared");
  assert.deepEqual(newlyPrepared.pull_request_input, prepared);
});

test("fails closed for missing extra type version and digest mismatches", () => {
  const source = validInput();
  const prepared = preparePullRequestInput(source).pull_request_input;

  const missing = clone(prepared);
  delete missing.body;
  const missingResult = loadPullRequestInput(source, { preparedInput: missing });
  assert.equal(hasError(missingResult, "prepared_pull_request_input.required", "/body"), true);

  const extra = clone(prepared);
  extra.markdown = "must not be parsed";
  const extraResult = loadPullRequestInput(source, { preparedInput: extra });
  assert.equal(hasError(extraResult, "prepared_pull_request_input.additional_property", "/markdown"), true);

  const wrongType = clone(prepared);
  wrongType.related_issue = "128";
  const typeResult = loadPullRequestInput(source, { preparedInput: wrongType });
  assert.equal(hasError(
    typeResult,
    "prepared_pull_request_input.related_issue.type",
    "/related_issue",
  ), true);

  for (const [field, code] of [
    ["input_type", "prepared_pull_request_input.input_type.mismatch"],
    ["format_version", "prepared_pull_request_input.format_version.mismatch"],
  ]) {
    const stale = clone(prepared);
    stale[field] = "stale";
    const result = loadPullRequestInput(source, { preparedInput: stale });
    assert.equal(hasError(result, code, `/${field}`), true);
  }

  const malformedDigest = clone(prepared);
  malformedDigest.input_digest = "sha256:not-a-digest";
  const digestResult = loadPullRequestInput(source, { preparedInput: malformedDigest });
  assert.equal(hasError(
    digestResult,
    "prepared_pull_request_input.input_digest.invalid",
    "/input_digest",
  ), true);
});

test("rejects both ordinary and self-consistent tampering against confirmed input identity", () => {
  const source = validInput();
  const prepared = preparePullRequestInput(source).pull_request_input;

  for (const field of ["title", "body", "base_branch", "head_branch", "related_issue"]) {
    const tampered = clone(prepared);
    tampered[field] = field === "related_issue" ? 129 : `${tampered[field]}-tampered`;
    const result = loadPullRequestInput(source, { preparedInput: tampered });
    assert.equal(result.status, "stopped", field);
    assert.equal(result.reason, "invalid_prepared_pull_request_input", field);
    assert.equal(hasError(
      result,
      "prepared_pull_request_input.embedded_digest.mismatch",
      "/input_digest",
    ), true, field);
    assert.equal(hasError(
      result,
      "prepared_pull_request_input.source_digest.mismatch",
      "/input_digest",
    ), false, field);
  }

  const selfConsistent = clone(prepared);
  selfConsistent.title = "feature: self-consistent tamper";
  selfConsistent.input_digest = computePullRequestInputDigest(selfConsistent);
  const result = loadPullRequestInput(source, { preparedInput: selfConsistent });
  assert.equal(result.status, "stopped");
  assert.equal(hasError(
    result,
    "prepared_pull_request_input.embedded_digest.mismatch",
    "/input_digest",
  ), false);
  assert.equal(hasError(
    result,
    "prepared_pull_request_input.source_digest.mismatch",
    "/input_digest",
  ), true);
});
