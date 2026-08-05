import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

const skillRootUrl = new URL("../../../", import.meta.url);
const manifestsUrl = new URL("../../artifact-manifests/", import.meta.url);
const handoffContractUrl = new URL("../../references/artifact-handoff-contract.md", import.meta.url);

const semanticMarkers = new Map([
  ["branch-proposal", "브랜치 이름"],
  ["commit-plan", "상위 계획"],
  ["feature-plan", "PR 전체"],
  ["feature-proposal-triage", "판단 근거와 위험"],
  ["fix-analysis", "확인 수준"],
  ["fix-plan", "확정된 원인"],
  ["issue-creation", "템플릿"],
  ["policy-plan", "설계 문서"],
  ["policy-review-next-triage", "기능변경"],
  ["pr-creation", "PR 제목"],
  ["pr-proposal", "PR 템플릿"],
  ["review-comment", "diff position"],
]);

test("every artifact producer uses the common structured handoff without duplicating machine rules", async () => {
  const filenames = (await readdir(manifestsUrl)).filter((name) => name.endsWith(".json")).sort();
  assert.equal(filenames.length, semanticMarkers.size);

  for (const filename of filenames) {
    const artifactType = filename.slice(0, -5);
    const manifest = JSON.parse(await readFile(new URL(filename, manifestsUrl), "utf8"));
    const skill = await readFile(new URL(`${artifactType}/SKILL.md`, skillRootUrl), "utf8");

    assert.equal(manifest.producer_skill, artifactType);
    assert.match(skill, /artifact-handoff-contract\.md/, artifactType);
    assert.ok(skill.includes(`artifact-manifests/${filename}`), artifactType);
    assert.ok(skill.includes(`\`artifact_type: ${artifactType}\``), artifactType);
    assert.match(skill, /## Structured artifact handoff/, artifactType);
    assert.doesNotMatch(skill, /## 필수 출력(?: 섹션)?\n/, artifactType);
    assert.doesNotMatch(skill, /필수 필드|enum|ID·참조·순서 규칙을 .*검증/, artifactType);
    assert.ok(skill.includes(semanticMarkers.get(artifactType)), artifactType);
  }
});

test("handoff contract keeps machine validation rendering and semantic judgment separated", async () => {
  const contract = await readFile(handoffContractUrl, "utf8");
  assert.match(contract, /두 필드만 가진 닫힌 handoff envelope/);
  assert.match(contract, /`artifact-manifests\/\*\.json`.*단일 원천/);
  assert.match(contract, /`contract_digest`, receipt, renderer 결과.*만들거나 추정하지 않는다/);
  assert.match(contract, /Markdown heading을 직접 조립하지 않는다/);
  assert.match(contract, /manifest validator는 이 의미 판단을 대신하지 않는다/);
  assert.match(contract, /`status: accepted`인 receipt만 사용할 수 있다/);
});
