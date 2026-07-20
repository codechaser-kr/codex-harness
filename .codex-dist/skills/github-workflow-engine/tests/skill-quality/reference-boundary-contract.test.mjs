import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const urls = {
  skill: new URL("../../SKILL.md", import.meta.url),
  structured: new URL("../../references/structured-execution-contract.md", import.meta.url),
  userDecision: new URL("../../references/user-decision-contract.md", import.meta.url),
  commandPath: new URL("../../references/command-execution-path-contract.md", import.meta.url),
  targetHarness: new URL("../../references/target-harness-execution-contract.md", import.meta.url),
  reviewRuntime: new URL("../../references/review-runtime-contract.md", import.meta.url),
  claudeReview: new URL("../../references/claude-review-executor-contract.md", import.meta.url),
  artifactOutput: new URL("../../references/artifact-output-contract.md", import.meta.url),
  githubTemplates: new URL("../../references/github-templates.md", import.meta.url),
  implementation: new URL("../../definitions/implementation.json", import.meta.url),
  simpleExecutor: new URL("../../../github-simple-executor/SKILL.md", import.meta.url),
  targetEditor: new URL("../../../target-harness-code-editor/SKILL.md", import.meta.url),
  reviewComment: new URL("../../../review-comment/SKILL.md", import.meta.url),
  harness: new URL("../../../harness/SKILL.md", import.meta.url),
  templateCompatibility: new URL(
    "../../../harness/references/workflow-engine-template-compatibility-contract.md",
    import.meta.url,
  ),
};

const artifactOutputConsumers = [
  ["issue-creation", new URL("../../../issue-creation/SKILL.md", import.meta.url)],
  ["feature-proposal-triage", new URL("../../../feature-proposal-triage/SKILL.md", import.meta.url)],
  ["policy-plan", new URL("../../../policy-plan/SKILL.md", import.meta.url)],
  ["policy-review-next-triage", new URL("../../../policy-review-next-triage/SKILL.md", import.meta.url)],
  ["feature-plan", new URL("../../../feature-plan/SKILL.md", import.meta.url)],
  ["fix-analysis", new URL("../../../fix-analysis/SKILL.md", import.meta.url)],
  ["fix-plan", new URL("../../../fix-plan/SKILL.md", import.meta.url)],
  ["commit-plan", new URL("../../../commit-plan/SKILL.md", import.meta.url)],
  ["branch-proposal", new URL("../../../branch-proposal/SKILL.md", import.meta.url)],
  ["pr-proposal", new URL("../../../pr-proposal/SKILL.md", import.meta.url)],
  ["pr-creation", new URL("../../../pr-creation/SKILL.md", import.meta.url)],
  ["review-comment", new URL("../../../review-comment/SKILL.md", import.meta.url)],
];

async function read(name) {
  return readFile(urls[name], "utf8");
}

function extractNamedSectionReferences(referenceLine) {
  const markerIndex = referenceLine.indexOf("에서");
  if (markerIndex === -1) return [];

  const source = referenceLine.slice(markerIndex + 2);
  const codeSpans = [];
  let cursor = 0;
  while (cursor < source.length) {
    const openingIndex = source.indexOf("`", cursor);
    if (openingIndex === -1) break;

    const delimiterLength = source[openingIndex + 1] === "`" ? 2 : 1;
    const delimiter = "`".repeat(delimiterLength);
    const contentStart = openingIndex + delimiterLength;
    const closingIndex = source.indexOf(delimiter, contentStart);
    if (closingIndex === -1) break;

    codeSpans.push(source.slice(contentStart, closingIndex));
    cursor = closingIndex + delimiterLength;
  }

  return codeSpans;
}

test("user decisions are interpreted before automatic execution by one detailed contract", async () => {
  const [skill, structured, userDecision] = await Promise.all([
    read("skill"),
    read("structured"),
    read("userDecision"),
  ]);

  assert.match(skill, /선택지가 있거나 재개 요청의 사용자 입력[\s\S]*user-decision-contract\.md/);
  assert.match(skill, /## 사용자 결정[\s\S]*user-decision-contract\.md[\s\S]*## 전용 스킬 연결/);
  assert.match(userDecision, /^## 사용자 입력 판정 규칙$/m);
  assert.match(userDecision, /제시된 번호[\s\S]*선택지 문구 그대로[\s\S]*기타 의견 입력/);
  assert.doesNotMatch(structured, /^## 사용자 입력 판정 규칙$/m);
  assert.doesNotMatch(skill, /기타 의견 입력 항목 번호: 의견/);
});

test("structured execution loads command and target details only for matching work", async () => {
  const [skill, structured, commandPath, targetHarness, simpleExecutor, targetEditor] = await Promise.all([
    read("skill"),
    read("structured"),
    read("commandPath"),
    read("targetHarness"),
    read("simpleExecutor"),
    read("targetEditor"),
  ]);

  assert.match(commandPath, /^## 명령 실행 경로 규칙$/m);
  assert.match(targetHarness, /^## 준비도와 라우팅$/m);
  assert.match(structured, /^### 요청-결과 상관관계 검사$/m);
  assert.match(targetHarness, /^### 실행 세션 미시작 중단 상관관계$/m);
  assert.doesNotMatch(structured, /^## 명령 실행 경로 규칙$/m);
  assert.doesNotMatch(structured, /^## Target Harness Code Editor 준비도/m);
  assert.match(skill, /실제 명령의 권한 경로[\s\S]*command-execution-path-contract\.md/);
  assert.match(skill, /파일 수정 작업[\s\S]*target-harness-execution-contract\.md/);
  assert.match(simpleExecutor, /command-execution-path-contract\.md/);
  assert.match(targetEditor, /structured-execution-contract\.md[\s\S]*command-execution-path-contract\.md[\s\S]*target-harness-execution-contract\.md/);
});

test("template compatibility belongs to the harness", async () => {
  const [githubTemplates, templateCompatibility, harness] = await Promise.all([
    read("githubTemplates"),
    read("templateCompatibility"),
    read("harness"),
  ]);

  assert.doesNotMatch(githubTemplates, /^## 타겟 템플릿 정합성 검사$/m);
  assert.match(templateCompatibility, /^# Workflow Engine 템플릿 정합성 계약$/m);
  assert.match(templateCompatibility, /github-workflow-engine\/references\/github-templates\.md/);
  assert.match(harness, /workflow-engine-template-compatibility-contract\.md/);
});

test("every review feedback requires a diff location and provider failures stay conditional", async () => {
  const [skill, reviewRuntime, claudeReview, reviewComment, implementation] = await Promise.all([
    read("skill"),
    read("reviewRuntime"),
    read("claudeReview"),
    read("reviewComment"),
    read("implementation"),
  ]);

  assert.match(reviewRuntime, /모든 `\[차단\]`, `\[중요\]`, `\[사소\]`, `\[제안\]`, `\[학습\]`, `\[칭찬\]` 피드백의 파일 경로, diff line, GitHub diff position/);
  assert.doesNotMatch(reviewRuntime, /요약 피드백 표시|비실행 피드백 재분류/);
  assert.match(reviewRuntime, /review thread 게시 위치 재지정[\s\S]*피드백 철회[\s\S]*기타 의견 입력/);
  assert.doesNotMatch(reviewRuntime, /^## Claude 리뷰 실행 실패 판정 규칙$/m);
  assert.match(claudeReview, /`claude\/\*` 리뷰 실행 모드를 선택할 때/);
  assert.match(skill, /`claude\/\*`[\s\S]*claude-review-executor-contract\.md/);
  for (const source of [reviewComment, implementation]) {
    assert.doesNotMatch(source, /비실행 피드백 재분류|reclassify_non_actionable_feedback/);
    assert.match(source, /피드백 철회|withdraw_review_feedback/);
  }
});

test("artifact output rules use grouped sections", async () => {
  const artifactOutput = await read("artifactOutput");
  for (const heading of [
    "공통 판정",
    "이슈 및 정책 산출물",
    "구현 계획 산출물",
    "PR 및 리뷰 산출물",
  ]) {
    assert.match(artifactOutput, new RegExp(`^## ${heading}$`, "m"));
  }
  assert.match(artifactOutput, /^### 리뷰 코멘트 출력 판정 규칙/m);
  assert.doesNotMatch(artifactOutput, /^## (?:Issue Creation|Feature Plan|Review Comment) 출력 판정 규칙$/m);
});

test("artifact output consumers reference existing named sections", async () => {
  const artifactOutput = await read("artifactOutput");
  const artifactHeadings = new Set(artifactOutput.split("\n").filter((line) => line.startsWith("### ")));
  const consumerSources = await Promise.all(
    artifactOutputConsumers.map(async ([name, url]) => [name, await readFile(url, "utf8")]),
  );

  for (const [name, source] of consumerSources) {
    const referenceLine = source
      .split("\n")
      .find((line) => line.includes("artifact-output-contract.md"));
    assert.ok(referenceLine, `${name} must reference artifact-output-contract.md`);

    const sectionNames = extractNamedSectionReferences(referenceLine);
    assert.ok(sectionNames.length > 0, `${name} must name an artifact output section`);
    for (const sectionName of sectionNames) {
      assert.ok(artifactHeadings.has(`### ${sectionName}`), `${name} references missing artifact output section: ${sectionName}`);
    }
  }
});
