import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

import { compileArtifactManifest } from "../../scripts/artifact-contract/manifest-compiler.mjs";
import { renderArtifact } from "../../scripts/artifact-contract/renderer.mjs";
import { validateArtifact } from "../../scripts/artifact-contract/validator.mjs";

const manifestsUrl = new URL("../../artifact-manifests/", import.meta.url);
const fixturesUrl = new URL("./fixtures/artifact-validation-cases.json", import.meta.url);

async function readJson(url) {
  return JSON.parse(await readFile(url, "utf8"));
}

async function loadManifests() {
  const entries = (await readdir(manifestsUrl)).filter((name) => name.endsWith(".json")).sort();
  return new Map(await Promise.all(entries.map(async (name) => [name.slice(0, -5), await readJson(new URL(name, manifestsUrl))])));
}

test("renders every valid artifact in manifest section order without mutation", async () => {
  const manifests = await loadManifests();
  const fixtures = await readJson(fixturesUrl);
  for (const fixture of fixtures.cases) {
    const manifest = manifests.get(fixture.artifact_type);
    const original = structuredClone(fixture.valid_artifact);
    const first = renderArtifact(manifest, fixture.valid_artifact);
    const second = renderArtifact(manifest, fixture.valid_artifact);
    const validation = validateArtifact(manifest, fixture.valid_artifact);

    assert.equal(first.status, "rendered", `${fixture.artifact_type}: ${JSON.stringify(first.errors)}`);
    assert.deepEqual(second, first, fixture.artifact_type);
    assert.deepEqual(fixture.valid_artifact, original, fixture.artifact_type);
    assert.equal(first.contract_digest, validation.contract_digest);
    assert.equal(first.content_type, "text/markdown");
    const headings = [...first.rendered_output.matchAll(/^## (.+)$/gm)].map((match) => match[1]);
    const expectedHeadings = manifest.render.section_order.map((fieldId) => (
      manifest.fields.find((field) => field.field_id === fieldId).render_label
    ));
    assert.deepEqual(headings, expectedHeadings, fixture.artifact_type);
  }
});

test("renders nested objects arrays and empty values with byte-stable Markdown", async () => {
  const manifests = await loadManifests();
  const fixtures = await readJson(fixturesUrl);
  const artifact = fixtures.cases.find((entry) => entry.artifact_type === "branch-proposal").valid_artifact;
  const result = renderArtifact(manifests.get("branch-proposal"), artifact);

  assert.equal(result.rendered_output, `## 기준 이슈

#8

## 구현 단위

FE-8-1

## 확인한 브랜치 이름 규칙

feat/issue-<number>-<topic>

## 브랜치 이름 후보

- 항목 1
  - 브랜치 이름: feat/issue-8-validator
  - 제안 근거와 범위: validator 범위를 나타냄

## 추천 브랜치

feat/issue-8-validator

## 보류 질문

없음
`);
});

test("refuses to render invalid artifacts and stale compiled contracts", async () => {
  const manifests = await loadManifests();
  const fixtures = await readJson(fixturesUrl);
  const manifest = manifests.get("pr-creation");
  const artifact = structuredClone(
    fixtures.cases.find((entry) => entry.artifact_type === "pr-creation").valid_artifact,
  );
  delete artifact.title;

  const invalid = renderArtifact(manifest, artifact);
  assert.equal(invalid.status, "stopped");
  assert.equal(invalid.reason, "invalid_artifact");
  assert.equal(invalid.rendered_output, null);
  assert.deepEqual(invalid.errors.map(({ code, path }) => ({ code, path })), [
    { code: "artifact.required", path: "/title" },
  ]);

  const stale = structuredClone(compileArtifactManifest(manifest).compiled_manifest);
  stale.compiler_format_version = "stale";
  const staleResult = renderArtifact(manifest, fixtures.cases[10].valid_artifact, {
    compiledManifest: stale,
  });
  assert.equal(staleResult.status, "stopped");
  assert.equal(staleResult.reason, "invalid_artifact_manifest_contract");
  assert.equal(staleResult.rendered_output, null);
});

test("renders omitted optional fields as N/A after successful validation", async () => {
  const manifests = await loadManifests();
  const fixtures = await readJson(fixturesUrl);
  const manifest = structuredClone(manifests.get("pr-proposal"));
  manifest.fields.find((field) => field.field_id === "blocking_questions").required = false;
  const artifact = structuredClone(
    fixtures.cases.find((entry) => entry.artifact_type === "pr-proposal").valid_artifact,
  );
  delete artifact.blocking_questions;

  const result = renderArtifact(manifest, artifact);
  assert.equal(result.status, "rendered", JSON.stringify(result.errors));
  assert.match(result.rendered_output, /## 보류 질문\n\nN\/A\n$/);
});
