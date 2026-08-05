import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { loadCompiledArtifactManifest } from "../../scripts/artifact-contract/compiled-manifest-loader.mjs";
import {
  ARTIFACT_MANIFEST_COMPILER_FORMAT_VERSION,
  COMPILED_ARTIFACT_MANIFEST_TYPE,
  compileArtifactManifest,
  computeArtifactManifestSourceDigest,
  computeCompiledArtifactManifestDigest,
} from "../../scripts/artifact-contract/manifest-compiler.mjs";
import {
  ARTIFACT_MANIFEST_VALIDATOR_VERSION,
  validateArtifactManifest,
} from "../../scripts/artifact-contract/manifest-validator.mjs";

const manifestUrl = new URL("../../artifact-manifests/branch-proposal.json", import.meta.url);
const casesUrl = new URL("./fixtures/manifest-validation-cases.json", import.meta.url);

async function readJson(url) {
  return JSON.parse(await readFile(url, "utf8"));
}

function clone(value) {
  return structuredClone(value);
}

function hasError(result, code, path) {
  return result.errors.some((error) => error.code === code && error.path === path);
}

test("validates and compiles the foundation artifact manifest deterministically", async () => {
  const manifest = await readJson(manifestUrl);
  const original = clone(manifest);
  const first = compileArtifactManifest(manifest);
  const second = compileArtifactManifest(manifest);

  assert.equal(first.status, "compiled", JSON.stringify(first.errors));
  assert.deepEqual(second, first);
  assert.deepEqual(manifest, original);
  assert.equal(first.compiled_manifest.artifact_type, COMPILED_ARTIFACT_MANIFEST_TYPE);
  assert.equal(first.compiled_manifest.compiler_format_version, ARTIFACT_MANIFEST_COMPILER_FORMAT_VERSION);
  assert.equal(first.compiled_manifest.validator_version, ARTIFACT_MANIFEST_VALIDATOR_VERSION);
  assert.match(first.compiled_manifest.source_digest, /^sha256:[0-9a-f]{64}$/);
  assert.match(first.compiled_manifest.contract_digest, /^sha256:[0-9a-f]{64}$/);
  assert.match(first.compiled_manifest.compiled_digest, /^sha256:[0-9a-f]{64}$/);
  assert.deepEqual(first.compiled_manifest.field_index.order, manifest.render.section_order);
  assert.equal(first.compiled_manifest.field_index.by_id.branch_candidates.shape.type, "array");
  assert.deepEqual(first.compiled_manifest.rule_plan.order, [
    "branch-candidate-name-unique",
    "recommended-branch-reference",
  ]);
  assert.deepEqual(first.compiled_manifest.render_plan.section_order, manifest.render.section_order);
  assert.equal(Object.isFrozen(first.compiled_manifest), true);
  assert.equal(Object.isFrozen(first.compiled_manifest.source_manifest.fields[0].shape), true);
});

test("canonical source digest ignores object key order and preserves array order", async () => {
  const manifest = await readJson(manifestUrl);
  const reorderedRoot = Object.fromEntries(Object.entries(manifest).reverse());
  assert.equal(
    computeArtifactManifestSourceDigest(reorderedRoot),
    computeArtifactManifestSourceDigest(manifest),
  );
  assert.equal(
    JSON.stringify(compileArtifactManifest(reorderedRoot).compiled_manifest),
    JSON.stringify(compileArtifactManifest(manifest).compiled_manifest),
  );

  const reorderedFields = clone(manifest);
  reorderedFields.fields.reverse();
  assert.notEqual(
    computeArtifactManifestSourceDigest(reorderedFields),
    computeArtifactManifestSourceDigest(manifest),
  );
});

test("returns stable code and path for invalid manifest fixtures", async () => {
  const manifest = await readJson(manifestUrl);
  const fixtures = await readJson(casesUrl);
  for (const fixture of fixtures.root_mutations) {
    const candidate = clone(manifest);
    candidate[fixture.field] = fixture.value;
    const result = validateArtifactManifest(candidate);
    assert.equal(result.valid, false, fixture.name);
    assert.equal(hasError(result, fixture.code, fixture.path), true, fixture.name);
  }

  const additional = clone(manifest);
  additional.zeta = true;
  additional.alpha = true;
  const additionalResult = validateArtifactManifest(additional);
  assert.deepEqual(additionalResult.errors.slice(0, 2).map(({ code, path }) => ({ code, path })), [
    { code: "manifest.additional_property", path: "/alpha" },
    { code: "manifest.additional_property", path: "/zeta" },
  ]);

  const duplicateField = clone(manifest);
  duplicateField.fields[1].field_id = duplicateField.fields[0].field_id;
  const duplicateResult = validateArtifactManifest(duplicateField);
  assert.equal(hasError(duplicateResult, "manifest.field.field_id.duplicate", "/fields/1/field_id"), true);
});

test("loads exact serialized compiled manifests and freezes reused values", async () => {
  const manifest = await readJson(manifestUrl);
  const prepared = loadCompiledArtifactManifest(manifest);
  assert.equal(prepared.status, "loaded");
  assert.equal(prepared.preparation, "compiled");

  const serialized = JSON.parse(JSON.stringify(prepared.compiled_manifest));
  const reused = loadCompiledArtifactManifest(manifest, { compiledManifest: serialized });
  assert.equal(reused.status, "loaded", JSON.stringify(reused.errors));
  assert.equal(reused.preparation, "reused");
  assert.deepEqual(reused.compiled_manifest, prepared.compiled_manifest);
  assert.equal(Object.isFrozen(reused.compiled_manifest.field_index.by_id), true);
});

test("fails closed for source version digest shape and representation mismatches", async () => {
  const manifest = await readJson(manifestUrl);
  const compiled = compileArtifactManifest(manifest).compiled_manifest;

  const changedSource = clone(manifest);
  changedSource.fields[0].render_label = "변경된 기준 이슈";
  const sourceMismatch = loadCompiledArtifactManifest(changedSource, { compiledManifest: compiled });
  assert.equal(sourceMismatch.status, "stopped");
  assert.equal(hasError(sourceMismatch, "compiled_manifest.source_digest.mismatch", "/source_digest"), true);

  for (const [field, code] of [
    ["validator_version", "compiled_manifest.validator_version.mismatch"],
    ["compiler_format_version", "compiled_manifest.compiler_format_version.mismatch"],
  ]) {
    const stale = clone(compiled);
    stale[field] = "stale";
    const result = loadCompiledArtifactManifest(manifest, { compiledManifest: stale });
    assert.equal(result.status, "stopped");
    assert.equal(hasError(result, code, `/${field}`), true);
  }

  const unknownShape = clone(compiled);
  unknownShape.unknown = true;
  const shapeResult = loadCompiledArtifactManifest(manifest, { compiledManifest: unknownShape });
  assert.equal(shapeResult.status, "stopped");
  assert.equal(hasError(shapeResult, "compiled_manifest.additional_property", "/unknown"), true);

  const tampered = clone(compiled);
  tampered.field_index.order.reverse();
  const digestMismatch = loadCompiledArtifactManifest(manifest, { compiledManifest: tampered });
  assert.equal(hasError(digestMismatch, "compiled_manifest.compiled_digest.mismatch", "/compiled_digest"), true);

  const selfConsistentTamper = clone(compiled);
  selfConsistentTamper.field_index.order.reverse();
  selfConsistentTamper.compiled_digest = computeCompiledArtifactManifestDigest(selfConsistentTamper);
  const representationMismatch = loadCompiledArtifactManifest(manifest, {
    compiledManifest: selfConsistentTamper,
  });
  assert.equal(hasError(
    representationMismatch,
    "compiled_manifest.representation.mismatch",
    "/compiled_digest",
  ), true);
});
