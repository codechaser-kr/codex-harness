import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { consumeArtifactHandoff } from "../../scripts/artifact-contract/artifact-consumer.mjs";
import { getArtifactRegistry } from "../../scripts/artifact-contract/artifact-registry.mjs";

const fixturesUrl = new URL("./fixtures/artifact-validation-cases.json", import.meta.url);

async function readJson(url) {
  return JSON.parse(await readFile(url, "utf8"));
}

function instrumentedHandlers(expectedType) {
  const calls = { meaning: 0, normalization: 0, continuation: 0 };
  const handlers = {
    evaluateMeaning(context) {
      calls.meaning += 1;
      assert.deepEqual(Object.keys(context), ["artifact_type", "contract_digest", "receipt"]);
      assert.equal(context.artifact_type, expectedType);
      assert.equal(context.receipt.artifact_type, expectedType);
      return { usable: true, judgment: `${expectedType} 의미 판정 완료` };
    },
    normalizeObservation(context) {
      calls.normalization += 1;
      assert.deepEqual(Object.keys(context), ["artifact_type", "contract_digest", "receipt", "semantic_result"]);
      assert.equal(context.receipt.artifact_type, expectedType);
      return { facts: [{ fact_id: `${expectedType}_usable`, value: true }] };
    },
    continueWorkflow(context) {
      calls.continuation += 1;
      assert.deepEqual(Object.keys(context), ["artifact_type", "contract_digest", "receipt", "semantic_result", "normalized_observation"]);
      assert.equal(context.receipt.artifact_type, expectedType);
      return { status: "continued", task_action_id: `${expectedType}-next` };
    },
  };
  return { calls, handlers };
}

test("consumes all producer artifacts only through accepted immutable receipts", async () => {
  const fixtures = await readJson(fixturesUrl);
  const prepared = await getArtifactRegistry();

  for (const fixture of fixtures.cases) {
    const entry = prepared.registry.by_type[fixture.artifact_type];
    const { calls, handlers } = instrumentedHandlers(fixture.artifact_type);
    const result = await consumeArtifactHandoff({
      expectedArtifactType: fixture.artifact_type,
      expectedContractDigest: entry.compiled_manifest.contract_digest,
      handoff: {
        artifact_type: fixture.artifact_type,
        artifact: fixture.valid_artifact,
      },
      handlers,
      registry: prepared.registry,
    });

    assert.equal(result.status, "consumed", `${fixture.artifact_type}: ${JSON.stringify(result.errors)}`);
    assert.deepEqual(calls, { meaning: 1, normalization: 1, continuation: 1 }, fixture.artifact_type);
    assert.equal(result.contract_digest, entry.compiled_manifest.contract_digest);
    assert.equal(result.receipt.contract_digest, result.contract_digest);
    assert.equal(result.receipt.rendered.content_type, "text/markdown");
    assert.equal(result.follow_up_result.status, "continued");
    assert.equal(Object.isFrozen(result), true);
    assert.equal(Object.isFrozen(result.receipt), true);
  }
});

test("blocks meaning normalization and continuation for every structurally invalid artifact", async () => {
  const fixtures = await readJson(fixturesUrl);
  const prepared = await getArtifactRegistry();

  for (const fixture of fixtures.cases) {
    const entry = prepared.registry.by_type[fixture.artifact_type];
    const invalidArtifact = structuredClone(fixture.valid_artifact);
    delete invalidArtifact[fixture.invalid_path.slice(1)];
    const { calls, handlers } = instrumentedHandlers(fixture.artifact_type);
    const result = await consumeArtifactHandoff({
      expectedArtifactType: fixture.artifact_type,
      expectedContractDigest: entry.compiled_manifest.contract_digest,
      handoff: { artifact_type: fixture.artifact_type, artifact: invalidArtifact },
      handlers,
      registry: prepared.registry,
    });

    assert.equal(result.status, "stopped", fixture.artifact_type);
    assert.equal(result.reason, "invalid_artifact", fixture.artifact_type);
    assert.equal(result.receipt, null, fixture.artifact_type);
    assert.deepEqual(calls, { meaning: 0, normalization: 0, continuation: 0 }, fixture.artifact_type);
  }
});

test("blocks every digest mismatch before any consumer callback", async () => {
  const fixtures = await readJson(fixturesUrl);
  const prepared = await getArtifactRegistry();
  const wrongDigest = `sha256:${"0".repeat(64)}`;

  for (const fixture of fixtures.cases) {
    const { calls, handlers } = instrumentedHandlers(fixture.artifact_type);
    const result = await consumeArtifactHandoff({
      expectedArtifactType: fixture.artifact_type,
      expectedContractDigest: wrongDigest,
      handoff: { artifact_type: fixture.artifact_type, artifact: fixture.valid_artifact },
      handlers,
      registry: prepared.registry,
    });

    assert.equal(result.status, "stopped", fixture.artifact_type);
    assert.equal(result.reason, "artifact_contract_digest_mismatch", fixture.artifact_type);
    assert.equal(result.receipt, null, fixture.artifact_type);
    assert.deepEqual(calls, { meaning: 0, normalization: 0, continuation: 0 }, fixture.artifact_type);
  }
});

test("blocks malformed injected registry entries before any consumer callback", async () => {
  const fixtures = await readJson(fixturesUrl);
  const prepared = await getArtifactRegistry();
  const fixture = fixtures.cases[0];
  const entry = prepared.registry.by_type[fixture.artifact_type];
  const { calls, handlers } = instrumentedHandlers(fixture.artifact_type);
  const result = await consumeArtifactHandoff({
    expectedArtifactType: fixture.artifact_type,
    expectedContractDigest: entry.compiled_manifest.contract_digest,
    handoff: { artifact_type: fixture.artifact_type, artifact: fixture.valid_artifact },
    handlers,
    registry: {
      artifact_types: prepared.registry.artifact_types,
      by_type: { ...prepared.registry.by_type, [fixture.artifact_type]: null },
    },
  });

  assert.equal(result.status, "stopped");
  assert.equal(result.reason, "invalid_artifact_registry");
  assert.equal(result.receipt, null);
  assert.equal(result.errors.some((error) => (
    error.code === "artifact_runtime.registry.entry.invalid"
    && error.path === `/registry/by_type/${fixture.artifact_type}`
  )), true);
  assert.deepEqual(calls, { meaning: 0, normalization: 0, continuation: 0 });
});

test("rejects open or mismatched handoffs and stops after an unusable meaning result", async () => {
  const fixtures = await readJson(fixturesUrl);
  const prepared = await getArtifactRegistry();
  const fixture = fixtures.cases[0];
  const digest = prepared.registry.by_type[fixture.artifact_type].compiled_manifest.contract_digest;

  for (const handoff of [
    { artifact_type: fixture.artifact_type, artifact: fixture.valid_artifact, explanation: "raw fallback" },
    { artifact_type: "pr-proposal", artifact: fixture.valid_artifact },
  ]) {
    const { calls, handlers } = instrumentedHandlers(fixture.artifact_type);
    const result = await consumeArtifactHandoff({
      expectedArtifactType: fixture.artifact_type,
      expectedContractDigest: digest,
      handoff,
      handlers,
      registry: prepared.registry,
    });
    assert.equal(result.status, "stopped");
    assert.equal(result.receipt, null);
    assert.deepEqual(calls, { meaning: 0, normalization: 0, continuation: 0 });
  }

  const calls = { meaning: 0, normalization: 0, continuation: 0 };
  const result = await consumeArtifactHandoff({
    expectedArtifactType: fixture.artifact_type,
    expectedContractDigest: digest,
    handoff: { artifact_type: fixture.artifact_type, artifact: fixture.valid_artifact },
    handlers: {
      evaluateMeaning() {
        calls.meaning += 1;
        return { usable: false, blocking_reasons: ["사용 가능 기준 미충족"] };
      },
      normalizeObservation() {
        calls.normalization += 1;
      },
      continueWorkflow() {
        calls.continuation += 1;
      },
    },
    registry: prepared.registry,
  });
  assert.equal(result.status, "stopped");
  assert.equal(result.reason, "artifact_semantically_unusable");
  assert.ok(result.receipt);
  assert.deepEqual(calls, { meaning: 1, normalization: 0, continuation: 0 });
});
