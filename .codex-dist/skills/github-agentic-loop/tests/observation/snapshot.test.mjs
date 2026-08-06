import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import {
  OBSERVATION_SNAPSHOT_FORMAT_VERSION,
  OBSERVATION_SNAPSHOT_TYPE,
  computeObservationSnapshotDigest,
  loadObservationSnapshot,
  prepareObservationSnapshot,
} from "../../scripts/observation/snapshot.mjs";

function digestText(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

const ISSUE_BODY = "Issue #129 body";
const PR_BODY = "PR #133 body";
const WORKTREE_STATE = "clean";
const ISSUE_UPDATED_AT = "2026-08-06T01:48:23Z";
const BODY_DIGEST = digestText(ISSUE_BODY);
const WORKTREE_DIGEST = digestText(WORKTREE_STATE);
const BASE_SHA = "1".repeat(40);
const HEAD_SHA = "2".repeat(40);

function source(overrides = {}) {
  return {
    source_type: "github_issue",
    source_identifier: "issue:129",
    github_updated_at: ISSUE_UPDATED_AT,
    body_digest: BODY_DIGEST,
    base_sha: null,
    head_sha: null,
    worktree_state_digest: null,
    observed_value: {
      state: "OPEN",
      body: ISSUE_BODY,
      updatedAt: ISSUE_UPDATED_AT,
      labels: ["기능변경"],
    },
    ...overrides,
  };
}

function validInput() {
  return {
    repository: "codechaser-kr/codex-harness",
    captured_at: "2026-08-06T02:00:00.000Z",
    sources: [
      source(),
      source({
        source_type: "github_pull_request",
        source_identifier: "pull_request:133",
        body_digest: digestText(PR_BODY),
        base_sha: BASE_SHA,
        head_sha: HEAD_SHA,
        observed_value: {
          body: PR_BODY,
          updatedAt: ISSUE_UPDATED_AT,
          headRefOid: HEAD_SHA,
          baseRefOid: BASE_SHA,
          state: "MERGED",
        },
      }),
      source({
        source_type: "local_repository",
        source_identifier: "local:worktree",
        github_updated_at: null,
        body_digest: null,
        head_sha: HEAD_SHA,
        worktree_state_digest: WORKTREE_DIGEST,
        observed_value: { branch: "main", head: HEAD_SHA, worktree: WORKTREE_STATE },
      }),
    ],
  };
}

function clone(value) {
  return structuredClone(value);
}

function hasError(result, code, path) {
  return result.errors.some((error) => error.code === code && error.path === path);
}

test("prepares a canonical byte-stable deep-frozen observation snapshot", () => {
  const input = validInput();
  const reordered = {
    sources: [...input.sources].reverse().map((item) => ({
      ...Object.fromEntries(Object.entries(item).reverse()),
      observed_value: Object.fromEntries(Object.entries(item.observed_value).reverse()),
    })),
    captured_at: input.captured_at,
    repository: input.repository,
  };

  const first = prepareObservationSnapshot(input);
  const second = prepareObservationSnapshot(reordered);

  assert.equal(first.status, "prepared", JSON.stringify(first.errors));
  assert.deepEqual(second, first);
  assert.equal(first.observation_snapshot.snapshot_type, OBSERVATION_SNAPSHOT_TYPE);
  assert.equal(first.observation_snapshot.format_version, OBSERVATION_SNAPSHOT_FORMAT_VERSION);
  assert.match(first.observation_snapshot.input_snapshot_digest, /^sha256:[0-9a-f]{64}$/);
  assert.equal(
    first.observation_snapshot.input_snapshot_digest,
    computeObservationSnapshotDigest(first.observation_snapshot),
  );
  assert.deepEqual(first.observation_snapshot.sources.map(({ source_type }) => source_type), [
    "github_issue",
    "github_pull_request",
    "local_repository",
  ]);
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first.observation_snapshot), true);
  assert.equal(Object.isFrozen(first.observation_snapshot.sources), true);
  assert.equal(Object.isFrozen(first.observation_snapshot.sources[0].observed_value), true);

  input.repository = "mutated/repository";
  input.sources[0].observed_value.body = "mutated body";
  assert.equal(first.observation_snapshot.repository, "codechaser-kr/codex-harness");
  assert.equal(first.observation_snapshot.sources[0].observed_value.body, ISSUE_BODY);
  assert.throws(() => {
    first.observation_snapshot.sources[0].observed_value.state = "CLOSED";
  }, TypeError);
});

test("sorts source identities by locale-independent UTF-16 code units", () => {
  const input = validInput();
  input.sources.push(
    source({ source_identifier: "issue:ä" }),
    source({ source_identifier: "issue:z" }),
  );
  const reversed = { ...input, sources: [...input.sources].reverse() };

  const first = prepareObservationSnapshot(input);
  const second = prepareObservationSnapshot(reversed);

  assert.deepEqual(second, first);
  assert.deepEqual(
    first.observation_snapshot.sources
      .filter(({ source_type: sourceType }) => sourceType === "github_issue")
      .map(({ source_identifier: sourceIdentifier }) => sourceIdentifier),
    ["issue:129", "issue:z", "issue:ä"],
  );
});

test("rejects malformed closed inputs and source-specific baseline mismatches", () => {
  const input = validInput();
  input.repository = "   ";
  input.captured_at = "today";
  input.extra = true;
  delete input.sources[0].observed_value;
  input.sources.push(clone(input.sources[0]));
  input.sources[1].base_sha = null;
  input.sources[2].github_updated_at = "2026-08-06T00:00:00Z";

  const result = prepareObservationSnapshot(input);
  assert.equal(result.status, "stopped");
  assert.equal(result.reason, "invalid_observation_snapshot_input");
  assert.equal(result.observation_snapshot, null);
  assert.equal(hasError(result, "observation_snapshot_input.additional_property", "/extra"), true);
  assert.equal(hasError(result, "observation_snapshot_input.repository.empty", "/repository"), true);
  assert.equal(hasError(result, "observation_snapshot_input.captured_at.invalid", "/captured_at"), true);
  assert.equal(hasError(result, "observation_snapshot_input.source.required", "/sources/0/observed_value"), true);
  assert.equal(hasError(
    result,
    "observation_snapshot_input.source.github_pull_request.base_sha.required",
    "/sources/1/base_sha",
  ), true);
  assert.equal(hasError(
    result,
    "observation_snapshot_input.source.local_repository.github_updated_at.forbidden",
    "/sources/2/github_updated_at",
  ), true);
  assert.equal(hasError(
    result,
    "observation_snapshot_input.source.identity.duplicate",
    "/sources/3/source_identifier",
  ), true);
});

test("rejects UTC timestamps that Date.parse normalizes to a different calendar instant", () => {
  const capturedAt = validInput();
  capturedAt.captured_at = "2026-02-31T00:00:00Z";
  const capturedAtResult = prepareObservationSnapshot(capturedAt);
  assert.equal(hasError(
    capturedAtResult,
    "observation_snapshot_input.captured_at.invalid",
    "/captured_at",
  ), true);

  const updatedAt = validInput();
  updatedAt.sources[0].github_updated_at = "2026-02-31T00:00:00Z";
  updatedAt.sources[0].observed_value.updatedAt = "2026-02-31T00:00:00Z";
  const updatedAtResult = prepareObservationSnapshot(updatedAt);
  assert.equal(hasError(
    updatedAtResult,
    "observation_snapshot_input.source.github_updated_at.invalid",
    "/sources/0/github_updated_at",
  ), true);
});

test("rejects unsafe or non-JSON observed values", () => {
  const forbidden = validInput();
  forbidden.sources[0].observed_value = JSON.parse('{"__proto__":{"polluted":true}}');
  const forbiddenResult = prepareObservationSnapshot(forbidden);
  assert.equal(hasError(
    forbiddenResult,
    "observation_snapshot.observed_value.key.forbidden",
    "/sources/0/observed_value/__proto__",
  ), true);

  const cyclic = validInput();
  cyclic.sources[0].observed_value.self = cyclic.sources[0].observed_value;
  const cyclicResult = prepareObservationSnapshot(cyclic);
  assert.equal(hasError(
    cyclicResult,
    "observation_snapshot.observed_value.cycle",
    "/sources/0/observed_value/self",
  ), true);

  const nonFinite = validInput();
  nonFinite.sources[0].observed_value.count = Number.POSITIVE_INFINITY;
  const numberResult = prepareObservationSnapshot(nonFinite);
  assert.equal(hasError(
    numberResult,
    "observation_snapshot.observed_value.number.invalid",
    "/sources/0/observed_value/count",
  ), true);
});

test("rejects baseline metadata that does not match the raw observed value", () => {
  const input = validInput();
  input.sources[0].body_digest = digestText("different body");
  input.sources[1].head_sha = "3".repeat(40);
  input.sources[2].worktree_state_digest = digestText("dirty");
  const result = prepareObservationSnapshot(input);

  assert.equal(hasError(
    result,
    "observation_snapshot_input.source.github_issue.body_digest.mismatch",
    "/sources/0/body_digest",
  ), true);
  assert.equal(hasError(
    result,
    "observation_snapshot_input.source.github_pull_request.head_sha.mismatch",
    "/sources/1/head_sha",
  ), true);
  assert.equal(hasError(
    result,
    "observation_snapshot_input.source.local_repository.worktree_state_digest.mismatch",
    "/sources/2/worktree_state_digest",
  ), true);
});

test("loads only an exact JSON-round-tripped snapshot for the current source", () => {
  const input = validInput();
  const prepared = prepareObservationSnapshot(input).observation_snapshot;
  const serialized = JSON.parse(JSON.stringify(prepared));
  const loaded = loadObservationSnapshot(input, { preparedSnapshot: serialized });

  assert.equal(loaded.status, "loaded", JSON.stringify(loaded.errors));
  assert.equal(loaded.preparation, "reused");
  assert.deepEqual(loaded.observation_snapshot, prepared);
  assert.equal(Object.isFrozen(loaded.observation_snapshot), true);

  const newlyPrepared = loadObservationSnapshot(input);
  assert.equal(newlyPrepared.status, "prepared");
  assert.equal(newlyPrepared.preparation, "prepared");
  assert.deepEqual(newlyPrepared.observation_snapshot, prepared);
});

test("fails closed for prepared shape type version and digest errors", () => {
  const input = validInput();
  const prepared = prepareObservationSnapshot(input).observation_snapshot;

  const missing = clone(prepared);
  delete missing.repository;
  assert.equal(hasError(
    loadObservationSnapshot(input, { preparedSnapshot: missing }),
    "prepared_observation_snapshot.required",
    "/repository",
  ), true);

  const extra = clone(prepared);
  extra.cache_hit = true;
  assert.equal(hasError(
    loadObservationSnapshot(input, { preparedSnapshot: extra }),
    "prepared_observation_snapshot.additional_property",
    "/cache_hit",
  ), true);

  for (const [field, code] of [
    ["snapshot_type", "prepared_observation_snapshot.snapshot_type.mismatch"],
    ["format_version", "prepared_observation_snapshot.format_version.mismatch"],
  ]) {
    const stale = clone(prepared);
    stale[field] = "stale";
    assert.equal(hasError(loadObservationSnapshot(input, { preparedSnapshot: stale }), code, `/${field}`), true);
  }

  const malformedDigest = clone(prepared);
  malformedDigest.input_snapshot_digest = "sha256:not-a-digest";
  assert.equal(hasError(
    loadObservationSnapshot(input, { preparedSnapshot: malformedDigest }),
    "prepared_observation_snapshot.input_snapshot_digest.invalid",
    "/input_snapshot_digest",
  ), true);
});

test("rejects ordinary self-consistent and stale-source tampering", () => {
  const input = validInput();
  const prepared = prepareObservationSnapshot(input).observation_snapshot;

  const ordinary = clone(prepared);
  ordinary.repository = "tampered/repository";
  const ordinaryResult = loadObservationSnapshot(input, { preparedSnapshot: ordinary });
  assert.equal(ordinaryResult.status, "stopped");
  assert.equal(hasError(
    ordinaryResult,
    "prepared_observation_snapshot.embedded_digest.mismatch",
    "/input_snapshot_digest",
  ), true);

  const selfConsistent = clone(prepared);
  selfConsistent.repository = "self-consistent/repository";
  selfConsistent.input_snapshot_digest = computeObservationSnapshotDigest(selfConsistent);
  const selfConsistentResult = loadObservationSnapshot(input, { preparedSnapshot: selfConsistent });
  assert.equal(hasError(
    selfConsistentResult,
    "prepared_observation_snapshot.embedded_digest.mismatch",
    "/input_snapshot_digest",
  ), false);
  assert.equal(hasError(
    selfConsistentResult,
    "prepared_observation_snapshot.source_digest.mismatch",
    "/input_snapshot_digest",
  ), true);

  const changedSource = validInput();
  changedSource.sources[1].head_sha = "3".repeat(40);
  changedSource.sources[1].observed_value.headRefOid = "3".repeat(40);
  const staleResult = loadObservationSnapshot(changedSource, { preparedSnapshot: prepared });
  assert.equal(hasError(
    staleResult,
    "prepared_observation_snapshot.source_digest.mismatch",
    "/input_snapshot_digest",
  ), true);
});
