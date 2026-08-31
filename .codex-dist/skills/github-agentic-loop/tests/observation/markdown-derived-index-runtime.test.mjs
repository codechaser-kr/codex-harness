import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  MARKDOWN_DERIVED_INDEX_PARSER_VERSION,
  computeMarkdownDerivedIndexDigest,
} from "../../scripts/observation/markdown-derived-index.mjs";
import {
  computeMarkdownDerivedIndexRuntimeDigest,
  createMarkdownDerivedIndexConsumerInput,
  loadMarkdownDerivedIndexRuntime,
  prepareMarkdownDerivedIndexRuntime,
} from "../../scripts/observation/markdown-derived-index-runtime.mjs";
import { prepareObservationSnapshotRuntime } from "../../scripts/observation/snapshot-runtime.mjs";

function digest(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function observationInput({
  issueBody = "# Scope\n\n- [ ] FE-129-2\n\nRefs #129",
  issueIdentifier = "issue:129",
  localOnly = false,
} = {}) {
  const source = localOnly
    ? {
        source_type: "local_repository",
        source_identifier: "worktree:primary",
        github_updated_at: null,
        body_digest: null,
        base_sha: null,
        head_sha: "3".repeat(40),
        worktree_state_digest: digest("clean"),
        observed_value: {
          branch: "feat/issue-129-add-markdown-derived-index",
          head: "3".repeat(40),
          worktree: "clean",
        },
      }
    : {
        source_type: "github_issue",
        source_identifier: issueIdentifier,
        github_updated_at: "2026-08-09T01:00:00.000Z",
        body_digest: digest(issueBody),
        base_sha: null,
        head_sha: null,
        worktree_state_digest: null,
        observed_value: {
          body: issueBody,
          number: Number(issueIdentifier.split(":")[1]),
          state: "OPEN",
          updatedAt: "2026-08-09T01:00:00.000Z",
        },
      };
  return {
    repository: "codechaser-kr/codex-harness",
    captured_at: "2026-08-09T02:00:00.000Z",
    sources: [source],
  };
}

function snapshotRuntime(requestId, source = observationInput()) {
  const result = prepareObservationSnapshotRuntime({
    request_id: requestId,
    observation_input: source,
  });
  assert.equal(result.status, "prepared");
  return result.runtime;
}

function sourceIdentity(identifier = "issue:129", type = "github_issue") {
  return { source_type: type, source_identifier: identifier };
}

function runtimeInput(requestId, snapshot = snapshotRuntime(requestId), identity = sourceIdentity()) {
  return {
    request_id: requestId,
    observation_snapshot_runtime: snapshot,
    source_identity: identity,
    parser_version: MARKDOWN_DERIVED_INDEX_PARSER_VERSION,
  };
}

function selector(runtime) {
  return {
    request_id: runtime.request_id,
    input_snapshot_digest: runtime.input_snapshot_digest,
    source_identity: runtime.source_identity,
    index_digest: runtime.markdown_index.index_digest,
  };
}

test("evaluation cycle prepares one frozen index shared by state and thin-skill consumers", () => {
  const prepared = prepareMarkdownDerivedIndexRuntime(runtimeInput("issue-129-cycle-1"));
  assert.equal(prepared.status, "prepared");
  assert.equal(prepared.preparation, "prepared");
  assert.equal(Object.isFrozen(prepared.runtime), true);
  assert.equal(Object.isFrozen(prepared.runtime.markdown_index), true);

  const state = createMarkdownDerivedIndexConsumerInput(prepared.runtime, selector(prepared.runtime));
  const summary = createMarkdownDerivedIndexConsumerInput(prepared.runtime, selector(prepared.runtime));
  assert.equal(state.status, "ready");
  assert.equal(summary.status, "ready");
  assert.strictEqual(state.consumer_input.markdown_index, summary.consumer_input.markdown_index);
  assert.equal(state.consumer_input.input_snapshot_digest, prepared.runtime.input_snapshot_digest);
  assert.equal(state.consumer_input.index_digest, prepared.runtime.markdown_index.index_digest);
  for (const forbidden of ["semantic_result", "artifact_receipt", "user_decision", "workflow_transition"]) {
    assert.equal(Object.hasOwn(state.consumer_input, forbidden), false);
  }
});

test("exact request, snapshot, source, and parser reuse a JSON-round-tripped cached index", () => {
  const input = runtimeInput("issue-129-cycle-1");
  const initial = prepareMarkdownDerivedIndexRuntime(input);
  const cached = JSON.parse(JSON.stringify(initial.runtime));
  const loaded = loadMarkdownDerivedIndexRuntime(input, { cachedRuntime: cached });

  assert.equal(loaded.status, "loaded");
  assert.equal(loaded.preparation, "reused");
  assert.equal(loaded.runtime.markdown_index.index_digest, initial.runtime.markdown_index.index_digest);
  assert.equal(Object.isFrozen(loaded.runtime.markdown_index), true);
});

test("trusted in-memory runtime takes the same-cycle reuse path", () => {
  const input = runtimeInput("issue-129-cycle-1");
  const initial = prepareMarkdownDerivedIndexRuntime(input);
  const loaded = loadMarkdownDerivedIndexRuntime(input, { cachedRuntime: initial.runtime });

  assert.equal(loaded.status, "loaded");
  assert.equal(loaded.preparation, "reused");
  assert.equal(loaded.runtime.markdown_index.index_digest, initial.runtime.markdown_index.index_digest);
});

test("request, source snapshot, source identity, and parser changes invalidate deterministically", () => {
  const initialInput = runtimeInput("issue-129-cycle-1");
  const initial = prepareMarkdownDerivedIndexRuntime(initialInput);

  const requestChanged = loadMarkdownDerivedIndexRuntime(runtimeInput(
    "issue-129-resume-2",
    snapshotRuntime("issue-129-resume-2"),
  ), { cachedRuntime: initial.runtime });
  assert.equal(requestChanged.status, "prepared");
  assert.equal(requestChanged.preparation, "request_changed");

  const changedBody = observationInput({ issueBody: "# Scope\n\n- [x] FE-129-2\n\nRefs #129" });
  const sourceChanged = loadMarkdownDerivedIndexRuntime(runtimeInput(
    "issue-129-cycle-1",
    snapshotRuntime("issue-129-cycle-1", changedBody),
  ), { cachedRuntime: initial.runtime });
  assert.equal(sourceChanged.status, "prepared");
  assert.equal(sourceChanged.preparation, "source_changed");
  assert.notEqual(sourceChanged.runtime.input_snapshot_digest, initial.runtime.input_snapshot_digest);

  const identityInput = observationInput({ issueIdentifier: "issue:130" });
  const identityChanged = loadMarkdownDerivedIndexRuntime(runtimeInput(
    "issue-129-cycle-1",
    snapshotRuntime("issue-129-cycle-1", identityInput),
    sourceIdentity("issue:130"),
  ), { cachedRuntime: initial.runtime });
  assert.equal(identityChanged.status, "prepared");
  assert.equal(identityChanged.preparation, "source_changed");

  const legacyParser = JSON.parse(JSON.stringify(initial.runtime));
  legacyParser.parser_version = "0";
  legacyParser.markdown_index.parser_version = "0";
  legacyParser.markdown_index.index_digest = computeMarkdownDerivedIndexDigest(legacyParser.markdown_index);
  legacyParser.runtime_digest = computeMarkdownDerivedIndexRuntimeDigest(legacyParser);
  const parserChanged = loadMarkdownDerivedIndexRuntime(initialInput, { cachedRuntime: legacyParser });
  assert.equal(parserChanged.status, "prepared");
  assert.equal(parserChanged.preparation, "parser_changed");
  assert.equal(parserChanged.runtime.parser_version, MARKDOWN_DERIVED_INDEX_PARSER_VERSION);
});

test("corrupt cache fails closed before request or source invalidation", () => {
  const input = runtimeInput("issue-129-cycle-1");
  const initial = prepareMarkdownDerivedIndexRuntime(input);
  const corruptions = [];

  const unexpected = JSON.parse(JSON.stringify(initial.runtime));
  unexpected.unexpected = true;
  corruptions.push(unexpected);

  const embeddedDigest = JSON.parse(JSON.stringify(initial.runtime));
  embeddedDigest.markdown_index.headings[0].text = "Tampered";
  corruptions.push(embeddedDigest);

  const selfConsistent = JSON.parse(JSON.stringify(initial.runtime));
  selfConsistent.markdown_index.headings[0].text = "Tampered";
  selfConsistent.markdown_index.index_digest = computeMarkdownDerivedIndexDigest(selfConsistent.markdown_index);
  selfConsistent.runtime_digest = computeMarkdownDerivedIndexRuntimeDigest(selfConsistent);
  corruptions.push(selfConsistent);

  const nestedSnapshot = JSON.parse(JSON.stringify(initial.runtime));
  nestedSnapshot.observation_snapshot_runtime.observation_snapshot.sources[0].unexpected = true;
  corruptions.push(nestedSnapshot);

  const changedRequest = runtimeInput(
    "issue-129-resume-2",
    snapshotRuntime("issue-129-resume-2"),
  );
  for (const cachedRuntime of corruptions) {
    const result = loadMarkdownDerivedIndexRuntime(changedRequest, { cachedRuntime });
    assert.equal(result.status, "stopped");
    assert.equal(result.reason, "invalid_cached_markdown_derived_index_runtime");
    assert.equal(result.runtime, null);
    assert.notEqual(result.errors.length, 0);
  }
});

test("consumer requires exact request, source, snapshot digest, and index digest", () => {
  const prepared = prepareMarkdownDerivedIndexRuntime(runtimeInput("issue-129-cycle-1"));
  const exact = selector(prepared.runtime);
  const variants = [
    { ...exact, request_id: "issue-129-resume-2" },
    { ...exact, input_snapshot_digest: `sha256:${"f".repeat(64)}` },
    { ...exact, source_identity: sourceIdentity("issue:404") },
    { ...exact, index_digest: `sha256:${"e".repeat(64)}` },
  ];
  for (const candidate of variants) {
    const result = createMarkdownDerivedIndexConsumerInput(prepared.runtime, candidate);
    assert.equal(result.status, "stopped");
    assert.equal(result.reason, "stale_markdown_derived_index_consumer_input");
  }
});

test("consumer semantically verifies untrusted runtimes while preserving trusted same-cycle reuse", () => {
  const prepared = prepareMarkdownDerivedIndexRuntime(runtimeInput("issue-129-cycle-1"));
  const trusted = createMarkdownDerivedIndexConsumerInput(
    prepared.runtime,
    selector(prepared.runtime),
  );
  assert.equal(trusted.status, "ready");

  const untrusted = JSON.parse(JSON.stringify(prepared.runtime));
  untrusted.markdown_index.references = [];
  untrusted.markdown_index.index_digest = computeMarkdownDerivedIndexDigest(
    untrusted.markdown_index,
  );
  untrusted.runtime_digest = computeMarkdownDerivedIndexRuntimeDigest(untrusted);

  const rejected = createMarkdownDerivedIndexConsumerInput(untrusted, selector(untrusted));
  assert.equal(rejected.status, "stopped");
  assert.equal(rejected.reason, "invalid_markdown_derived_index_consumer_input");
  assert.equal(rejected.consumer_input, null);
  assert.equal(rejected.errors.some((error) => (
    error.code === "prepared_markdown_derived_index.source_digest.mismatch"
      && error.path === "/markdown_index/index_digest"
  )), true);
});

test("non-GitHub body sources and malformed runtime inputs stop without fallback", () => {
  const localSnapshot = snapshotRuntime("issue-129-cycle-1", observationInput({ localOnly: true }));
  const local = prepareMarkdownDerivedIndexRuntime(runtimeInput(
    "issue-129-cycle-1",
    localSnapshot,
    sourceIdentity("worktree:primary", "local_repository"),
  ));
  assert.equal(local.status, "stopped");
  assert.equal(local.reason, "invalid_markdown_derived_index_runtime_input");

  const malformed = prepareMarkdownDerivedIndexRuntime({});
  assert.equal(malformed.status, "stopped");
  assert.equal(malformed.runtime, null);
  assert.notEqual(malformed.errors.length, 0);
});

test("runtime and consumer documentation preserve sharing, invalidation, and live-state boundaries", async () => {
  const [runtime, contract, skill, state, summary, design] = await Promise.all([
    readFile(new URL("../../scripts/observation/markdown-derived-index-runtime.mjs", import.meta.url), "utf8"),
    readFile(new URL("../../references/markdown-derived-index-contract.md", import.meta.url), "utf8"),
    readFile(new URL("../../SKILL.md", import.meta.url), "utf8"),
    readFile(new URL("../../references/state-observation-contract.md", import.meta.url), "utf8"),
    readFile(new URL("../../../github-state-summary/SKILL.md", import.meta.url), "utf8"),
    readFile(new URL("../../../../../docs/github-workflow-engine.md", import.meta.url), "utf8"),
  ]);

  assert.match(runtime, /createObservationSnapshotConsumerInput/);
  for (const source of [contract, skill, state, summary, design]) {
    assert.match(source, /markdown_derived_index_consumer_input/);
    assert.match(source, /body digest|body_digest/);
    assert.match(source, /parser version|parser_version/);
  }
  for (const source of [contract, skill, state, design]) {
    assert.match(source, /live preflight|실행 직전.*재검증/);
    assert.match(source, /GitHub.*우선/);
  }
  assert.match(summary, new RegExp("markdown_derived_index_consumer_input[\\s\\S]*다시 parse하지 않는다"));
  assert.match(state, /markdown-derived-index-runtime\.mjs/);
  assert.match(contract, /request_changed[\s\S]*source_changed[\s\S]*parser_changed/);
});
