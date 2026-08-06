import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  createObservationSnapshotConsumerInput,
  loadObservationSnapshotRuntime,
  prepareObservationSnapshotRuntime,
} from "../../scripts/observation/snapshot-runtime.mjs";

function digest(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function sourceInput() {
  const issueBody = "# Scope\n\n- [ ] FE-129-1";
  const pullBody = "# Summary\n\nRefs #129";
  const worktree = " M docs/github-workflow-engine.md\n";
  return {
    repository: "codechaser-kr/codex-harness",
    captured_at: "2026-08-06T03:00:00.000Z",
    sources: [
      {
        source_type: "github_issue",
        source_identifier: "issue:129",
        github_updated_at: "2026-08-06T01:48:23.000Z",
        body_digest: digest(issueBody),
        base_sha: null,
        head_sha: null,
        worktree_state_digest: null,
        observed_value: {
          body: issueBody,
          number: 129,
          state: "OPEN",
          updatedAt: "2026-08-06T01:48:23.000Z",
        },
      },
      {
        source_type: "github_pull_request",
        source_identifier: "pull_request:133",
        github_updated_at: "2026-08-05T08:00:00.000Z",
        body_digest: digest(pullBody),
        base_sha: "1".repeat(40),
        head_sha: "2".repeat(40),
        worktree_state_digest: null,
        observed_value: {
          baseRefOid: "1".repeat(40),
          body: pullBody,
          headRefOid: "2".repeat(40),
          number: 133,
          updatedAt: "2026-08-05T08:00:00.000Z",
        },
      },
      {
        source_type: "local_repository",
        source_identifier: "worktree:primary",
        github_updated_at: null,
        body_digest: null,
        base_sha: null,
        head_sha: "3".repeat(40),
        worktree_state_digest: digest(worktree),
        observed_value: {
          branch: "feat/issue-129-add-observation-snapshot-runtime",
          head: "3".repeat(40),
          worktree,
        },
      },
    ],
  };
}

const runtimeInput = (requestId, observationInput = sourceInput()) => ({
  request_id: requestId,
  observation_input: observationInput,
});

function instrumentedSourceInput() {
  const input = sourceInput();
  let observedValueReads = 0;
  Object.defineProperty(input.sources[0].observed_value, "instrumented", {
    enumerable: true,
    get() {
      observedValueReads += 1;
      return { stable: true };
    },
  });
  return {
    input,
    observedValueReads: () => observedValueReads,
  };
}

const identities = (...sourceTypes) => sourceTypes.map(([source_type, source_identifier]) => ({
  source_type,
  source_identifier,
}));

test("evaluation-cycle runtime prepares once and shares exact immutable source objects", () => {
  const result = prepareObservationSnapshotRuntime(runtimeInput("issue-129-cycle-1"));
  assert.equal(result.status, "prepared");
  assert.equal(result.preparation, "prepared");
  assert.equal(Object.isFrozen(result.runtime), true);
  assert.equal(Object.isFrozen(result.runtime.observation_snapshot.sources[0]), true);

  const selector = {
    request_id: "issue-129-cycle-1",
    source_identities: identities(["github_issue", "issue:129"]),
  };
  const stateAdapterInput = createObservationSnapshotConsumerInput(result.runtime, selector);
  const thinSkillInput = createObservationSnapshotConsumerInput(result.runtime, selector);
  assert.equal(stateAdapterInput.status, "ready");
  assert.equal(thinSkillInput.status, "ready");
  assert.equal(
    stateAdapterInput.consumer_input.input_snapshot_digest,
    result.runtime.input_snapshot_digest,
  );
  assert.strictEqual(
    stateAdapterInput.consumer_input.sources[0],
    thinSkillInput.consumer_input.sources[0],
  );
  assert.equal(Object.hasOwn(stateAdapterInput.consumer_input, "semantic_result"), false);
  assert.equal(Object.hasOwn(stateAdapterInput.consumer_input, "artifact_receipt"), false);
  assert.equal(Object.hasOwn(stateAdapterInput.consumer_input, "user_decision"), false);
});

test("exact request and source snapshot is reused after JSON round-trip", () => {
  const initial = prepareObservationSnapshotRuntime(runtimeInput("issue-129-cycle-1"));
  const serialized = JSON.parse(JSON.stringify(initial.runtime));
  const loaded = loadObservationSnapshotRuntime(runtimeInput("issue-129-cycle-1"), {
    cachedRuntime: serialized,
  });

  assert.equal(loaded.status, "loaded");
  assert.equal(loaded.preparation, "reused");
  assert.equal(loaded.runtime.input_snapshot_digest, initial.runtime.input_snapshot_digest);
  assert.equal(Object.isFrozen(loaded.runtime.observation_snapshot), true);
});

test("cache hit prepares current observation values only once", () => {
  const initialInput = instrumentedSourceInput();
  const initial = prepareObservationSnapshotRuntime(runtimeInput("issue-129-cycle-1", initialInput.input));
  const readsForOnePreparation = initialInput.observedValueReads();
  const currentInput = instrumentedSourceInput();

  const loaded = loadObservationSnapshotRuntime(runtimeInput("issue-129-cycle-1", currentInput.input), {
    cachedRuntime: initial.runtime,
  });

  assert.equal(loaded.status, "loaded");
  assert.equal(loaded.preparation, "reused");
  assert.ok(readsForOnePreparation > 0);
  assert.equal(currentInput.observedValueReads(), readsForOnePreparation);
});

test("a new resume request invalidates a valid cached cycle without reusing its request identity", () => {
  const initial = prepareObservationSnapshotRuntime(runtimeInput("issue-129-cycle-1"));
  const resumed = loadObservationSnapshotRuntime(runtimeInput("issue-129-resume-2"), {
    cachedRuntime: initial.runtime,
  });

  assert.equal(resumed.status, "prepared");
  assert.equal(resumed.preparation, "request_changed");
  assert.equal(resumed.runtime.request_id, "issue-129-resume-2");
  assert.notStrictEqual(resumed.runtime, initial.runtime);
});

test("GitHub body or head and local worktree changes invalidate the cached source snapshot", () => {
  const initialInput = sourceInput();
  const initial = prepareObservationSnapshotRuntime(runtimeInput("issue-129-cycle-1", initialInput));
  const mutations = [
    (input) => {
      const issue = input.sources[0];
      issue.observed_value.body += "\nchanged";
      issue.observed_value.updatedAt = "2026-08-06T04:00:00.000Z";
      issue.body_digest = digest(issue.observed_value.body);
      issue.github_updated_at = issue.observed_value.updatedAt;
    },
    (input) => {
      const pullRequest = input.sources[1];
      pullRequest.head_sha = "4".repeat(40);
      pullRequest.observed_value.headRefOid = pullRequest.head_sha;
    },
    (input) => {
      const local = input.sources[2];
      local.observed_value.worktree = "clean";
      local.worktree_state_digest = digest(local.observed_value.worktree);
    },
  ];

  for (const mutate of mutations) {
    const changedInput = sourceInput();
    mutate(changedInput);
    const changed = loadObservationSnapshotRuntime(runtimeInput("issue-129-cycle-1", changedInput), {
      cachedRuntime: initial.runtime,
    });
    assert.equal(changed.status, "prepared");
    assert.equal(changed.preparation, "source_changed");
    assert.notEqual(changed.runtime.input_snapshot_digest, initial.runtime.input_snapshot_digest);
  }
});

test("corrupt cached runtime fails closed before request or source invalidation", () => {
  const initial = prepareObservationSnapshotRuntime(runtimeInput("issue-129-cycle-1"));
  const digestTamper = JSON.parse(JSON.stringify(initial.runtime));
  digestTamper.input_snapshot_digest = `sha256:${"f".repeat(64)}`;
  const malformed = JSON.parse(JSON.stringify(initial.runtime));
  malformed.observation_snapshot.sources[0].unexpected = true;

  for (const cachedRuntime of [digestTamper, malformed]) {
    const result = loadObservationSnapshotRuntime(runtimeInput("issue-129-resume-2"), { cachedRuntime });
    assert.equal(result.status, "stopped");
    assert.equal(result.reason, "invalid_cached_observation_snapshot_runtime");
    assert.equal(result.runtime, null);
    assert.notEqual(result.errors.length, 0);
  }
});

test("consumer input is closed and exact to request, digest, and source identity", () => {
  const initial = prepareObservationSnapshotRuntime(runtimeInput("issue-129-cycle-1"));
  const stale = createObservationSnapshotConsumerInput(initial.runtime, {
    request_id: "issue-129-resume-2",
    source_identities: identities(["github_issue", "issue:129"]),
  });
  assert.equal(stale.status, "stopped");
  assert.equal(stale.reason, "stale_observation_snapshot_consumer_input");

  const missing = createObservationSnapshotConsumerInput(initial.runtime, {
    request_id: "issue-129-cycle-1",
    source_identities: identities(["github_issue", "issue:404"]),
  });
  assert.equal(missing.status, "stopped");
  assert.equal(
    missing.errors.some((error) => error.code === "observation_snapshot_consumer.source_identity.not_found"),
    true,
  );
});

test("runtime boundaries preserve live preflight, GitHub precedence, and non-cacheable results", async () => {
  const [skill, state, structured, artifact, summarySkill, design] = await Promise.all([
    readFile(new URL("../../SKILL.md", import.meta.url), "utf8"),
    readFile(new URL("../../references/state-observation-contract.md", import.meta.url), "utf8"),
    readFile(new URL("../../references/structured-execution-contract.md", import.meta.url), "utf8"),
    readFile(new URL("../../references/artifact-consumer-contract.md", import.meta.url), "utf8"),
    readFile(new URL("../../../github-state-summary/SKILL.md", import.meta.url), "utf8"),
    readFile(new URL("../../../../../docs/github-workflow-engine.md", import.meta.url), "utf8"),
  ]);

  for (const source of [skill, state, structured, design]) {
    assert.match(source, /input_snapshot_digest|inputSnapshotDigest/);
    assert.match(source, /live preflight|실행 직전.*재검증/);
    assert.match(source, /GitHub.*우선/);
  }
  assert.match(skill, new RegExp("request_id[\\s\\S]*같은 평가 주기"));
  assert.match(state, /snapshot-runtime\.mjs/);
  assert.match(structured, new RegExp("snapshot[\\s\\S]*(실행 요청|preflight)"));
  assert.match(artifact, new RegExp("의미 판단[\\s\\S]*artifact[\\s\\S]*사용자 결정[\\s\\S]*(cache|캐시)", "i"));
  assert.match(summarySkill, /observation_snapshot_consumer_input/);
  assert.match(summarySkill, new RegExp("같은 source[\\s\\S]*다시 조회하지 않는다"));
});
