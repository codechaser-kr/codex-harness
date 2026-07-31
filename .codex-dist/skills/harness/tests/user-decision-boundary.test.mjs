import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

const urls = {
  skill: new URL("../SKILL.md", import.meta.url),
  references: new URL("../references/", import.meta.url),
  verification: new URL("../references/verification-checklist.md", import.meta.url),
  targetDecision: new URL("../references/target-evaluation-playbook.md", import.meta.url),
  comparison: new URL("../references/quality-evaluation-guide.md", import.meta.url),
  reentry: new URL("../references/reentry-rules.md", import.meta.url),
  phaseSelection: new URL("../references/phase-selection-matrix.md", import.meta.url),
  initialGeneration: new URL("../references/initial-generation-contract.md", import.meta.url),
  readme: new URL("../../../../README.md", import.meta.url),
  developmentEvaluation: new URL(
    "../../../../.harness/development-quality-evaluation.md",
    import.meta.url,
  ),
  documentRegression: new URL(
    "../../../../.harness/document-regression-checklist.md",
    import.meta.url,
  ),
};

async function read(name) {
  return readFile(urls[name], "utf8");
}

async function readMarkdownTree(directoryUrl) {
  const entries = await readdir(directoryUrl, { withFileTypes: true });
  const documents = [];

  for (const entry of entries) {
    const entryUrl = new URL(entry.isDirectory() ? `${entry.name}/` : entry.name, directoryUrl);
    if (entry.isDirectory()) {
      documents.push(...await readMarkdownTree(entryUrl));
    } else if (entry.name.endsWith(".md")) {
      documents.push([entryUrl.pathname, await readFile(entryUrl, "utf8")]);
    }
  }

  return documents;
}

test("harness quality and change-scope decisions belong only to the user", async () => {
  const [skill, verification, targetDecision, comparison, reentry, phaseSelection, initialGeneration] =
    await Promise.all([
      read("skill"),
      read("verification"),
      read("targetDecision"),
      read("comparison"),
      read("reentry"),
      read("phaseSelection"),
      read("initialGeneration"),
    ]);

  assert.match(skill, /품질이나 운영 적합성을 최종 판정하지 않는다/);
  assert.match(skill, /`현재 유지 \/ 부분 수정 \/ 구조 재설계` 선택과 실제 반영 범위는 사용자만 확정/);
  assert.match(skill, /사용자 결정 전에는 `사용자 결정 대기`로 중단/);
  assert.match(skill, /사용자 결정이 없거나 변경 범위가 불명확하면 파일을 변경하지 않고/);
  assert.match(skill, /어느 결과가 더 낫다고 판정하지 않는다/);

  assert.match(verification, /^## 8\. 사용자 판단 자료 형식$/m);
  assert.match(verification, /사용자 결정 상태: `대기 \/ 현재 유지 \/ 부분 수정 \/ 구조 재설계`/);
  assert.match(targetDecision, /^## 4\. 사용자 선택지의 범위$/m);
  assert.match(targetDecision, /에이전트는 관찰 신호만 제공하고 선택하지 않는다/);
  assert.match(comparison, /우열, 품질 향상 또는 운영 적합성을 최종 판정하지 않는다/);
  assert.match(reentry, /실제 재진입 Phase와 변경 범위는 사용자가 확정/);
  assert.match(phaseSelection, /실제 재진입 하네스 Phase와 변경 범위는 사용자가 확정/);
  assert.doesNotMatch(phaseSelection, /필요 시 `하네스 Phase 7`/);
  assert.match(initialGeneration, /사용자 결정 전에는 `사용자 결정 대기`로 중단/);
});

test("active harness contracts no longer assign legacy quality verdicts to agents", async () => {
  const legacyTerms = [
    ["운영", "가능"].join(" "),
    ["재작성", "필요"].join(" "),
    ["재구성", "필요"].join(" "),
  ];

  for (const [path, source] of await readMarkdownTree(urls.references)) {
    for (const term of legacyTerms) {
      assert.equal(source.includes(term), false, `${path}: ${term}`);
    }
  }

  const activeGuidance = await Promise.all([
    ["SKILL.md", "skill"],
    ["README.md", "readme"],
    [".harness/development-quality-evaluation.md", "developmentEvaluation"],
    [".harness/document-regression-checklist.md", "documentRegression"],
  ].map(async ([path, name]) => [path, await read(name)]));

  for (const [path, source] of activeGuidance) {
    for (const term of legacyTerms) {
      assert.equal(source.includes(term), false, `${path}: ${term}`);
    }
  }
});

test("repository guidance preserves the Phase 6 user checkpoint", async () => {
  const [readme, developmentEvaluation, documentRegression] = await Promise.all([
    read("readme"),
    read("developmentEvaluation"),
    read("documentRegression"),
  ]);

  assert.match(readme, /`하네스 Phase 6`:[\s\S]*사용자가 판단할 관찰·선택지 자료/);
  assert.match(readme, /`하네스 Phase 7`:[\s\S]*사용자가 확정한 범위/);
  assert.match(developmentEvaluation, /사용자가 품질을 판단할 자료/);
  assert.match(documentRegression, /사용자 결정 상태와 확정 범위/);
});
