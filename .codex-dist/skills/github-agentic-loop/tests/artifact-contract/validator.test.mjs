import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

import { compileArtifactManifest } from "../../scripts/artifact-contract/manifest-compiler.mjs";
import { validateArtifactManifest } from "../../scripts/artifact-contract/manifest-validator.mjs";
import { validateArtifact } from "../../scripts/artifact-contract/validator.mjs";

const manifestsUrl = new URL("../../artifact-manifests/", import.meta.url);
const fixturesUrl = new URL("./fixtures/artifact-validation-cases.json", import.meta.url);
const expectedArtifactTypes = [
  "branch-proposal",
  "commit-plan",
  "feature-plan",
  "feature-proposal-triage",
  "fix-analysis",
  "fix-plan",
  "issue-creation",
  "policy-plan",
  "policy-review-next-triage",
  "pr-creation",
  "pr-proposal",
  "review-comment",
];

async function readJson(url) {
  return JSON.parse(await readFile(url, "utf8"));
}

async function loadManifests() {
  const entries = (await readdir(manifestsUrl)).filter((name) => name.endsWith(".json")).sort();
  return new Map(await Promise.all(entries.map(async (name) => [name.slice(0, -5), await readJson(new URL(name, manifestsUrl))])));
}

function clone(value) {
  return structuredClone(value);
}

function hasError(result, code, path) {
  return result.errors.some((error) => error.code === code && (path === undefined || error.path === path));
}

test("ships one valid deterministic manifest for every existing artifact type", async () => {
  const manifests = await loadManifests();
  assert.deepEqual([...manifests.keys()], expectedArtifactTypes);
  for (const [artifactType, manifest] of manifests) {
    assert.equal(manifest.artifact_type, artifactType);
    assert.equal(manifest.producer_skill, artifactType);
    const validation = validateArtifactManifest(manifest);
    assert.equal(validation.valid, true, `${artifactType}: ${JSON.stringify(validation.errors)}`);
    const first = compileArtifactManifest(manifest);
    const second = compileArtifactManifest(manifest);
    assert.equal(first.status, "compiled", artifactType);
    assert.deepEqual(second, first, artifactType);
    assert.match(first.compiled_manifest.contract_digest, /^sha256:[0-9a-f]{64}$/, artifactType);
  }
});

test("accepts normal fixtures and rejects one required-field error for every artifact type", async () => {
  const manifests = await loadManifests();
  const fixtures = await readJson(fixturesUrl);
  assert.deepEqual(fixtures.cases.map((entry) => entry.artifact_type).sort(), expectedArtifactTypes);

  for (const fixture of fixtures.cases) {
    const manifest = manifests.get(fixture.artifact_type);
    const original = clone(fixture.valid_artifact);
    const valid = validateArtifact(manifest, fixture.valid_artifact);
    assert.equal(valid.status, "valid", `${fixture.artifact_type}: ${JSON.stringify(valid.errors)}`);
    assert.equal(valid.artifact_type, fixture.artifact_type);
    assert.match(valid.contract_digest, /^sha256:[0-9a-f]{64}$/);
    assert.deepEqual(fixture.valid_artifact, original);
    assert.equal(JSON.stringify(validateArtifact(manifest, fixture.valid_artifact)), JSON.stringify(valid));

    const invalid = clone(fixture.valid_artifact);
    delete invalid[fixture.invalid_path.slice(1)];
    const result = validateArtifact(manifest, invalid);
    assert.equal(result.status, "invalid", fixture.artifact_type);
    assert.equal(hasError(result, fixture.expected_code, fixture.invalid_path), true, fixture.artifact_type);
  }
});

test("returns stable structural enum and nested paths before cross-field rules", async () => {
  const manifests = await loadManifests();
  const fixtures = await readJson(fixturesUrl);
  const issue = clone(fixtures.cases.find((entry) => entry.artifact_type === "issue-creation").valid_artifact);
  issue.zeta = true;
  issue.alpha = true;
  issue.issue_type = "unknown";
  const issueResult = validateArtifact(manifests.get("issue-creation"), issue);
  assert.deepEqual(issueResult.errors.slice(0, 3).map(({ code, path }) => ({ code, path })), [
    { code: "artifact.additional_property", path: "/alpha" },
    { code: "artifact.additional_property", path: "/zeta" },
    { code: "artifact.enum", path: "/issue_type" },
  ]);

  const review = clone(fixtures.cases.find((entry) => entry.artifact_type === "review-comment").valid_artifact);
  review.inline_review_threads[0].line = 0;
  review.inline_review_threads[0].severity = "[알 수 없음]";
  const reviewResult = validateArtifact(manifests.get("review-comment"), review);
  assert.equal(hasError(reviewResult, "artifact.enum", "/inline_review_threads/0/severity"), true);
  assert.equal(hasError(reviewResult, "artifact.integer.minimum", "/inline_review_threads/0/line"), true);
});

test("validates unique IDs references and exact implementation-order coverage", async () => {
  const manifests = await loadManifests();
  const fixtures = await readJson(fixturesUrl);
  const featurePlanFixture = fixtures.cases.find((entry) => entry.artifact_type === "feature-plan").valid_artifact;

  const duplicateUnit = clone(featurePlanFixture);
  duplicateUnit.pr_units.push(clone(duplicateUnit.pr_units[0]));
  const duplicateResult = validateArtifact(manifests.get("feature-plan"), duplicateUnit);
  assert.equal(hasError(duplicateResult, "artifact.rule.unique_by.duplicate", "/pr_units/1/unit_id"), true);

  const invalidOrder = clone(featurePlanFixture);
  invalidOrder.implementation_order = ["FE-4-1", "FE-4-1", "UNKNOWN"];
  const orderResult = validateArtifact(manifests.get("feature-plan"), invalidOrder);
  assert.deepEqual(orderResult.errors.map(({ code, path }) => ({ code, path })), [
    { code: "artifact.rule.covers_exactly.duplicate", path: "/implementation_order/1" },
    { code: "artifact.rule.covers_exactly.unknown", path: "/implementation_order/2" },
  ]);

  const policy = clone(fixtures.cases.find((entry) => entry.artifact_type === "policy-plan").valid_artifact);
  policy.recommended_design = "UNKNOWN";
  const referenceResult = validateArtifact(manifests.get("policy-plan"), policy);
  assert.equal(hasError(referenceResult, "artifact.rule.references.missing", "/recommended_design"), true);

  policy.recommended_design = "";
  assert.equal(validateArtifact(manifests.get("policy-plan"), policy).status, "valid");
});

test("fails closed when an explicit compiled manifest contract is stale", async () => {
  const manifests = await loadManifests();
  const fixtures = await readJson(fixturesUrl);
  const manifest = manifests.get("pr-creation");
  const artifact = fixtures.cases.find((entry) => entry.artifact_type === "pr-creation").valid_artifact;
  const stale = clone(compileArtifactManifest(manifest).compiled_manifest);
  stale.validator_version = "stale";

  const result = validateArtifact(manifest, artifact, { compiledManifest: stale });
  assert.equal(result.status, "stopped");
  assert.equal(result.reason, "invalid_artifact_manifest_contract");
  assert.equal(result.contract_digest, null);
  assert.equal(hasError(result, "compiled_manifest.validator_version.mismatch", "/validator_version"), true);
});
