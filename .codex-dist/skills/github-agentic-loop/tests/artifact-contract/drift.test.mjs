import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

const manifestsUrl = new URL("../../artifact-manifests/", import.meta.url);
const artifactOutputUrl = new URL("../../references/artifact-output-contract.md", import.meta.url);
const manifestContractUrl = new URL("../../references/artifact-manifest-contract.md", import.meta.url);
const workflowDocUrl = new URL("../../../../../docs/github-workflow-engine.md", import.meta.url);

async function readJson(url) {
  return JSON.parse(await readFile(url, "utf8"));
}

test("keeps manifests contract headings producer skills and render labels aligned", async () => {
  const artifactOutput = await readFile(artifactOutputUrl, "utf8");
  const manifestFiles = (await readdir(manifestsUrl)).filter((name) => name.endsWith(".json")).sort();
  const manifests = await Promise.all(manifestFiles.map((name) => readJson(new URL(name, manifestsUrl))));
  const manifestHeadings = manifests.map((manifest) => manifest.contract_section).sort();
  const artifactHeadings = artifactOutput
    .split("\n")
    .filter((line) => line.startsWith("### "))
    .map((line) => line.slice(4))
    .filter((heading) => heading !== "PR 제목 판정 규칙")
    .sort();
  assert.deepEqual(manifestHeadings, artifactHeadings);

  for (const [index, manifest] of manifests.entries()) {
    const filename = manifestFiles[index].slice(0, -5);
    assert.equal(manifest.artifact_type, filename);
    assert.equal(manifest.producer_skill, filename);
    assert.match(artifactOutput, new RegExp(`^### ${manifest.contract_section.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "m"));

    const consumer = await readFile(new URL(`../../../${manifest.producer_skill}/SKILL.md`, import.meta.url), "utf8");
    assert.match(consumer, /artifact-output-contract\.md/, manifest.producer_skill);
    assert.equal(consumer.includes(manifest.contract_section), true, manifest.producer_skill);
    for (const fieldId of manifest.render.section_order) {
      const field = manifest.fields.find((candidate) => candidate.field_id === fieldId);
      assert.ok(field, `${manifest.artifact_type} missing rendered field ${fieldId}`);
      assert.equal(consumer.includes(field.render_label), true, `${manifest.producer_skill}: ${field.render_label}`);
    }
  }
});

test("documents one machine-rule source and a separate semantic Markdown boundary", async () => {
  const [artifactOutput, manifestContract, workflowDoc] = await Promise.all([
    readFile(artifactOutputUrl, "utf8"),
    readFile(manifestContractUrl, "utf8"),
    readFile(workflowDocUrl, "utf8"),
  ]);
  assert.match(artifactOutput, /`artifact-manifests\/\*\.json`[\s\S]*machine-readable 단일 원천/);
  assert.match(artifactOutput, /설명과 의미적 사용 가능 기준/);
  assert.match(manifestContract, /`artifact-manifests\/\*\.json`이 기계 규칙의 단일 원천/);
  assert.match(manifestContract, /renderer는 validator가 성공한 structured artifact만 입력/);
  assert.match(workflowDoc, /^### Artifact manifest와 renderer$/m);
  assert.match(workflowDoc, /manifest 구조를 다시 실행하지 않고 사용자 설명[\s\S]*의미 판정/);
});
