import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  ARTIFACT_TYPES,
  compileArtifactRegistry,
  getArtifactRegistry,
} from "../../scripts/artifact-contract/artifact-registry.mjs";
import { acceptArtifact } from "../../scripts/artifact-contract/artifact-runtime.mjs";

const fixturesUrl = new URL("./fixtures/artifact-validation-cases.json", import.meta.url);

async function readJson(url) {
  return JSON.parse(await readFile(url, "utf8"));
}

function hasError(result, code, path) {
  return result.errors.some((error) => error.code === code && error.path === path);
}

test("loads compiles and caches the complete immutable artifact registry", async () => {
  const first = await getArtifactRegistry();
  const second = await getArtifactRegistry();

  assert.equal(first.status, "loaded", JSON.stringify(first.errors));
  assert.equal(second, first);
  assert.deepEqual(first.registry.artifact_types, ARTIFACT_TYPES);
  assert.deepEqual(Object.keys(first.registry.by_type), ARTIFACT_TYPES);
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first.registry), true);
  for (const artifactType of ARTIFACT_TYPES) {
    const entry = first.registry.by_type[artifactType];
    assert.equal(entry.manifest.artifact_type, artifactType);
    assert.equal(Object.isFrozen(entry.compiled_manifest), true);
    assert.match(entry.compiled_manifest.contract_digest, /^sha256:[0-9a-f]{64}$/);
  }
});

test("returns deterministic immutable receipts for every artifact type", async () => {
  const fixtures = await readJson(fixturesUrl);
  const prepared = await getArtifactRegistry();

  for (const fixture of fixtures.cases) {
    const original = structuredClone(fixture.valid_artifact);
    const first = await acceptArtifact(fixture.artifact_type, fixture.valid_artifact, {
      registry: prepared.registry,
    });
    const second = await acceptArtifact(fixture.artifact_type, fixture.valid_artifact, {
      registry: prepared.registry,
    });

    assert.equal(first.status, "accepted", `${fixture.artifact_type}: ${JSON.stringify(first.errors)}`);
    assert.equal(JSON.stringify(second), JSON.stringify(first), fixture.artifact_type);
    assert.deepEqual(fixture.valid_artifact, original, fixture.artifact_type);
    assert.notEqual(first.receipt.value, fixture.valid_artifact);
    assert.equal(first.receipt.artifact_type, fixture.artifact_type);
    assert.equal(first.receipt.contract_digest, prepared.registry.by_type[fixture.artifact_type].compiled_manifest.contract_digest);
    assert.equal(first.receipt.rendered.content_type, "text/markdown");
    assert.match(first.receipt.rendered.output, /^## /);
    assert.equal(Object.isFrozen(first.receipt), true);
    assert.equal(Object.isFrozen(first.receipt.value), true);
  }
});

test("fails closed for invalid artifacts unknown types and stale compiled manifests", async () => {
  const fixtures = await readJson(fixturesUrl);
  const prepared = await getArtifactRegistry();

  for (const fixture of fixtures.cases) {
    const invalid = structuredClone(fixture.valid_artifact);
    delete invalid[fixture.invalid_path.slice(1)];
    const result = await acceptArtifact(fixture.artifact_type, invalid, { registry: prepared.registry });
    assert.equal(result.status, "stopped", fixture.artifact_type);
    assert.equal(result.reason, "invalid_artifact", fixture.artifact_type);
    assert.equal(result.receipt, null, fixture.artifact_type);
    assert.equal(hasError(result, fixture.expected_code, fixture.invalid_path), true, fixture.artifact_type);
  }

  const unknown = await acceptArtifact("unknown-artifact", {}, { registry: prepared.registry });
  assert.equal(unknown.status, "stopped");
  assert.equal(unknown.reason, "unknown_artifact_type");
  assert.equal(hasError(unknown, "artifact_runtime.artifact_type.unknown", "/artifact_type"), true);

  const fixture = fixtures.cases.find((entry) => entry.artifact_type === "pr-proposal");
  const stale = structuredClone(prepared.registry.by_type[fixture.artifact_type].compiled_manifest);
  stale.validator_version = "stale";
  const mismatch = await acceptArtifact(fixture.artifact_type, fixture.valid_artifact, {
    registry: prepared.registry,
    compiledManifest: stale,
  });
  assert.equal(mismatch.status, "stopped");
  assert.equal(mismatch.reason, "invalid_artifact_manifest_contract");
  assert.equal(mismatch.receipt, null);
  assert.equal(hasError(mismatch, "compiled_manifest.validator_version.mismatch", "/validator_version"), true);
});

test("rejects incomplete and mismatched registry inputs deterministically", async () => {
  const prepared = await getArtifactRegistry();
  const manifests = Object.fromEntries(ARTIFACT_TYPES.map((artifactType) => [
    artifactType,
    prepared.registry.by_type[artifactType].manifest,
  ]));
  delete manifests[ARTIFACT_TYPES[0]];
  manifests[ARTIFACT_TYPES[1]] = structuredClone(manifests[ARTIFACT_TYPES[1]]);
  manifests[ARTIFACT_TYPES[1]].artifact_type = "wrong-type";
  manifests.unexpected = {};

  const result = compileArtifactRegistry(manifests);
  assert.equal(result.status, "stopped");
  assert.deepEqual(result.errors.slice(0, 3).map(({ code, path }) => ({ code, path })), [
    { code: "artifact_registry.manifest.unexpected", path: "/manifests/unexpected" },
    { code: "artifact_registry.manifest.missing", path: `/manifests/${ARTIFACT_TYPES[0]}` },
    { code: "artifact_registry.artifact_type.mismatch", path: `/manifests/${ARTIFACT_TYPES[1]}/artifact_type` },
  ]);
});
