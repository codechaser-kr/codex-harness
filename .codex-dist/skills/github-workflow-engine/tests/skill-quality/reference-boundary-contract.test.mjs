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
  stateObservation: new URL("../../references/state-observation-contract.md", import.meta.url),
  githubTemplates: new URL("../../references/github-templates.md", import.meta.url),
  implementation: new URL("../../definitions/implementation.json", import.meta.url),
  workflowDoc: new URL("../../../../../docs/github-workflow-engine.md", import.meta.url),
  readme: new URL("../../../../../README.md", import.meta.url),
  simpleExecutor: new URL("../../../github-simple-executor/SKILL.md", import.meta.url),
  targetEditor: new URL("../../../target-harness-code-editor/SKILL.md", import.meta.url),
  reviewComment: new URL("../../../review-comment/SKILL.md", import.meta.url),
  harness: new URL("../../../harness/SKILL.md", import.meta.url),
  templateCompatibility: new URL(
    "../../../harness/references/workflow-engine-template-compatibility-contract.md",
    import.meta.url,
  ),
  workflowDefinitionContract: new URL(
    "../../references/workflow-definition-contract.md",
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

test("resume activation is covered by the structured execution contract", async () => {
  const [skill, structured] = await Promise.all([
    read("skill"),
    read("structured"),
  ]);

  assert.match(structured, /^## 중단과 재개 판정 규칙$/m);
  assert.match(skill, /중단·재개를 판정할 때 `references\/structured-execution-contract\.md`/);
  assert.match(
    skill,
    /확정된 작업을 자동 실행할 때 `references\/structured-execution-contract\.md`/,
  );
});

test("close-first issue transitions are explicit and guarded on direct resume", async () => {
  const structured = await read("structured");
  const transitionSection = structured.match(
    /## 종료 후 이슈 유형 전환 순서\n[\s\S]*?(?=\n## |\n?$)/,
  )?.[0] ?? "";

  for (const route of [
    "기능제안 → 정책검토",
    "기능제안 → 기능변경",
    "정책검토 → 기능변경",
  ]) {
    assert.match(transitionSection, new RegExp(route));
  }
  assert.match(transitionSection, /`reflect → close → transition`/);
  assert.match(transitionSection, /원본 이슈가 종료됐다는 GitHub fact[\s\S]*후속 이슈/);
  assert.match(transitionSection, /`currentTaskActionId`[\s\S]*close-first 선행조건을 다시 검증/);
  assert.match(transitionSection, /사후 기록[\s\S]*종료의 선행조건이 아니다/);
});

test("feature-change entry routing facts have owned and traceable observation rules", async () => {
  const stateObservation = await read("stateObservation");
  const routingSection = stateObservation.match(
    /## 기능변경 진입 local_state 관측 규칙\n[\s\S]*?(?=\n## |\n?$)/,
  )?.[0] ?? "";

  assert.match(routingSection, /Workflow Engine[\s\S]*최초 상태 묶음[\s\S]*직접 산출/);
  assert.match(routingSection, /완료된 전환 fact가 둘 다 `true`[\s\S]*현재 요청을 시작한 전환 하나/);
  assert.match(routingSection, /`request_id`[\s\S]*`source_reference`/);
  assert.match(routingSection, /`field_reference`[\s\S]*routing check/);
  assert.match(routingSection, /근거가 누락되거나 충돌하면[\s\S]*중단/);
  for (const factId of [
    "feature_change_entry_source",
    "feature_change_scope_identified",
    "feature_change_completion_criteria_ready",
    "additional_policy_decision_required",
    "defect_investigation_required",
  ]) {
    assert.equal(routingSection.includes(`| \`${factId}\` |`), true, factId);
    assert.equal(routingSection.includes(`| \`routing_check.${factId}\` |`), true, factId);
  }
  assert.match(routingSection, /normalizeFeatureChangeFacts[\s\S]*정확히 한 번 호출/);
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

test("existence operators are documented without a value field", async () => {
  const contract = await read("workflowDefinitionContract");
  const valuelessOperators = [...contract.matchAll(/^\| `(exists|not_exists)` \| `value` 필드 없음 \|$/gm)]
    .map((match) => match[1])
    .sort();

  assert.deepEqual(valuelessOperators, ["exists", "not_exists"]);
});

test("every review feedback requires a diff location and provider failures stay conditional", async () => {
  const [skill, reviewRuntime, claudeReview, reviewComment, implementation, workflowDoc] = await Promise.all([
    read("skill"),
    read("reviewRuntime"),
    read("claudeReview"),
    read("reviewComment"),
    read("implementation"),
    read("workflowDoc"),
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
  assert.doesNotMatch(workflowDoc, /비실행 피드백 재분류|reclassify_non_actionable_feedback/);
  assert.match(workflowDoc, /review thread 게시 위치 재지정[\s\S]*피드백 철회[\s\S]*기타 의견 입력/);
});

test("workflow-owned Claude review modes pin foreground wait without changing other call sites", async () => {
  const [skill, structured, claudeReview, workflowDoc, readme] = await Promise.all([
    read("skill"),
    read("structured"),
    read("claudeReview"),
    read("workflowDoc"),
    read("readme"),
  ]);

  for (const source of [skill, structured, claudeReview, workflowDoc, readme]) {
    assert.match(source, /\$cc:review --wait/);
    assert.match(source, /\$cc:adversarial-review --wait/);
    assert.doesNotMatch(source, /\$cc:review --background/);
    assert.doesNotMatch(source, /\$cc:adversarial-review --background/);
  }
  assert.match(structured, /execution_mode=foreground[\s\S]*execution_control_flag=--wait[\s\S]*planned_session_relation=same_session/);
  assert.match(claudeReview, /같은 세션의 foreground 실행[\s\S]*결과가 반환될 때까지/);
  assert.match(claudeReview, /Workflow Engine 밖의[\s\S]*일반 호출 정책[\s\S]*`FI-17`/);
  assert.match(workflowDoc, /foreground\/background 선택 질문을 추가하지 않고[\s\S]*`--background`를 전달하지 않는다/);
  assert.match(readme, /Workflow Engine 호출에만 적용[\s\S]*일반 실행 정책[\s\S]*`codex\/awesome-code-review`/);
});

test("FI-16 uses the adversarial companion dependency and normalizes its output", async () => {
  const [claudeReview, workflowDoc, readme] = await Promise.all([
    read("claudeReview"),
    read("workflowDoc"),
    read("readme"),
  ]);

  assert.match(
    claudeReview,
    /`FI-16`의 `claude\/awesome-code-review`[\s\S]*실제 실행기는[\s\S]*`\$cc:adversarial-review`/,
  );
  assert.match(
    claudeReview,
    /외부 `awesome-code-review` 스킬에는 의존하지 않는다[\s\S]*companion stdout은 PR Review Template을 직접 보장하는 출력으로[\s\S]*간주하지 않는다/,
  );
  assert.match(
    workflowDoc,
    /\| `claude\/awesome-code-review` \| Claude[\s\S]*`\$cc:setup` 및 `\$cc:adversarial-review` 준비 상태/,
  );
  assert.doesNotMatch(
    workflowDoc,
    /\| `claude\/awesome-code-review` \| Claude\s+\| Claude CLI 인증, Claude 환경의 `awesome-code-review`/,
  );
  assert.match(
    workflowDoc,
    /`claude\/awesome-code-review`의 `\$cc:adversarial-review` companion stdout은 해당 Template을 직접 보장하는 것으로 간주하지 않는다/,
  );
  assert.match(
    readme,
    /`claude\/awesome-code-review`의 실행기와 의존성은 이 플러그인의 `\$cc:adversarial-review`[\s\S]*`awesome-code-review`가 아닙니다/,
  );
  assert.match(
    readme,
    /`\$cc:adversarial-review`의 companion stdout은 PR Review Template을 직접 보장하는 것으로 간주하지 않습니다/,
  );
});

test("Claude review auth failures use companion wrapper output and setup recheck", async () => {
  const [claudeReview, workflowDoc, readme] = await Promise.all([
    read("claudeReview"),
    read("workflowDoc"),
    read("readme"),
  ]);

  for (const source of [claudeReview, workflowDoc, readme]) {
    assert.match(source, /Claude Code CLI is not authenticated/);
    assert.match(source, /Run \\?`claude auth login\\?`/);
    assert.match(source, /auth\.available/);
    assert.match(source, /auth\.loggedIn/);
  }
  assert.match(
    claudeReview,
    /top-level wrapper 오류는 stderr에 기록[\s\S]*raw 문구 보존에만 의존하지 않는다/,
  );
  assert.match(
    workflowDoc,
    /실패 직후 `\$cc:setup` machine-readable probe를 다시 실행한다[\s\S]*출력 문구와 무관하게 재로그인 필요/,
  );
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
