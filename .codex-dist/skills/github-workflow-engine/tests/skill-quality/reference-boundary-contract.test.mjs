import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import test from "node:test";

// Keep the removed path out of official source text while still asserting that it is absent.
const legacySettingsRelativePath = [
  ".harness",
  ["workflow", "engine.json"].join("-"),
].join("/");

const urls = {
  skill: new URL("../../SKILL.md", import.meta.url),
  structured: new URL("../../references/structured-execution-contract.md", import.meta.url),
  userDecision: new URL("../../references/user-decision-contract.md", import.meta.url),
  commandPath: new URL("../../references/command-execution-path-contract.md", import.meta.url),
  fileChange: new URL("../../references/file-change-execution-contract.md", import.meta.url),
  targetHarness: new URL("../../references/target-harness-execution-contract.md", import.meta.url),
  reviewRuntime: new URL("../../references/review-runtime-contract.md", import.meta.url),
  claudeReview: new URL("../../references/claude-review-executor-contract.md", import.meta.url),
  artifactOutput: new URL("../../references/artifact-output-contract.md", import.meta.url),
  stateObservation: new URL("../../references/state-observation-contract.md", import.meta.url),
  githubTemplates: new URL("../../references/github-templates.md", import.meta.url),
  targetRuntimeBootstrap: new URL(
    "../../references/target-runtime-bootstrap-contract.md",
    import.meta.url,
  ),
  implementation: new URL("../../definitions/implementation.json", import.meta.url),
  workflowDoc: new URL("../../../../../docs/github-workflow-engine.md", import.meta.url),
  readme: new URL("../../../../../README.md", import.meta.url),
  settings: new URL("../../../../../.workflow-engine/settings.json", import.meta.url),
  legacySettings: new URL(`../../../../../${legacySettingsRelativePath}`, import.meta.url),
  simpleExecutor: new URL("../../../github-simple-executor/SKILL.md", import.meta.url),
  workflowEditor: new URL("../../../workflow-code-editor/SKILL.md", import.meta.url),
  reviewComment: new URL("../../../review-comment/SKILL.md", import.meta.url),
  harnessRoot: new URL("../../../harness/", import.meta.url),
  harness: new URL("../../../harness/SKILL.md", import.meta.url),
  harnessTemplateCompatibility: new URL(
    "../../../harness/references/workflow-engine-template-compatibility-contract.md",
    import.meta.url,
  ),
  teamSpecContract: new URL("../../../harness/references/team-spec-contract.md", import.meta.url),
  teamSpecSchema: new URL("../../../harness/references/team-spec-schema.md", import.meta.url),
  initialGeneration: new URL(
    "../../../harness/references/initial-generation-contract.md",
    import.meta.url,
  ),
  verificationChecklist: new URL(
    "../../../harness/references/verification-checklist.md",
    import.meta.url,
  ),
  qaAgentGuide: new URL("../../../harness/references/qa-agent-guide.md", import.meta.url),
  referenceMap: new URL("../../../harness/references/reference-map.md", import.meta.url),
  codexRuntime: new URL("../../../harness/references/codex-runtime-contract.md", import.meta.url),
  evolutionContract: new URL("../../../harness/references/evolution-contract.md", import.meta.url),
  generatorReadiness: new URL(
    "../../../harness/references/generator-readiness-checklist.md",
    import.meta.url,
  ),
  documentRegression: new URL(
    "../../../../../.harness/document-regression-checklist.md",
    import.meta.url,
  ),
  templateCompatibility: new URL(
    "../../references/workflow-engine-template-compatibility-contract.md",
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

test("Team Spec contract and schema have distinct ownership and aligned consumers", async () => {
  const [
    contract,
    schema,
    harness,
    initialGeneration,
    verificationChecklist,
    qaAgentGuide,
    referenceMap,
    codexRuntime,
    evolutionContract,
    generatorReadiness,
    documentRegression,
  ] = await Promise.all([
    read("teamSpecContract"),
    read("teamSpecSchema"),
    read("harness"),
    read("initialGeneration"),
    read("verificationChecklist"),
    read("qaAgentGuide"),
    read("referenceMap"),
    read("codexRuntime"),
    read("evolutionContract"),
    read("generatorReadiness"),
    read("documentRegression"),
  ]);

  assert.match(contract, /^## 문서 소유권과 참조 규칙$/m);
  assert.match(contract, /정책·권한·불변 조건·생성 순서·정본 관계를 소유한다/);
  assert.match(contract, /`team-spec-schema\.md`는 필수 섹션·필드[\s\S]*구조 검증 기준을 소유한다/);
  assert.match(contract, /^## 생성 규칙$/m);
  assert.doesNotMatch(contract, /```text\s+role_id\|display_name\|agent_file/);

  assert.match(schema, /^## 문서 소유권과 참조 규칙$/m);
  assert.match(schema, /필수 섹션·필드[\s\S]*역할 인벤토리와 역할 카드 형식[\s\S]*구조 검증 기준을 소유한다/);
  assert.match(schema, /`team-spec-contract\.md`는 Team Spec의 정책·권한·불변 조건·생성 순서·정본 관계/);
  assert.match(schema, /^### 필수 섹션과 필드$/m);
  assert.match(schema, /```text\s+role_id\|display_name\|agent_file\|model\|reasoning\|sandbox\|description/);
  assert.doesNotMatch(schema, /^## 생성 규칙$/m);

  for (const consumer of [
    harness,
    initialGeneration,
    verificationChecklist,
    qaAgentGuide,
    referenceMap,
    codexRuntime,
    evolutionContract,
    generatorReadiness,
  ]) {
    assert.match(consumer, /team-spec-contract\.md/);
    assert.match(consumer, /team-spec-schema\.md/);
  }

  assert.match(documentRegression, /team-spec-contract\.md.*정책·권한·불변 조건·생성 순서·정본 관계/);
  assert.match(documentRegression, /team-spec-schema\.md.*필수 구조·필드·형식·예시·구조 검증/);
  assert.match(documentRegression, /같은 규칙을 각각 정본으로 주장하지 않는가/);
});

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
  const [skill, structured, commandPath, fileChange, targetHarness, simpleExecutor, workflowEditor] = await Promise.all([
    read("skill"),
    read("structured"),
    read("commandPath"),
    read("fileChange"),
    read("targetHarness"),
    read("simpleExecutor"),
    read("workflowEditor"),
  ]);

  assert.match(commandPath, /^## 명령 실행 경로 규칙$/m);
  assert.match(fileChange, /^# 파일 변경 실행 경로 계약$/m);
  assert.match(targetHarness, /^## 준비도와 라우팅$/m);
  assert.match(structured, /^### 요청-결과 상관관계 검사$/m);
  assert.doesNotMatch(structured, /^## 명령 실행 경로 규칙$/m);
  assert.doesNotMatch(structured, /^## Target Harness Code Editor 준비도/m);
  assert.match(skill, /실제 명령의 권한 경로[\s\S]*command-execution-path-contract\.md/);
  assert.match(skill, /파일 수정 작업[\s\S]*file-change-execution-contract\.md/);
  assert.match(simpleExecutor, /command-execution-path-contract\.md/);
  assert.match(workflowEditor, /file-change-execution-contract\.md[\s\S]*structured-execution-contract\.md[\s\S]*command-execution-path-contract\.md[\s\S]*target-harness-execution-contract\.md/);
  assert.match(fileChange, /target_harness[\s\S]*general_code_change/);
  assert.match(fileChange, /실행을 시작한 뒤에는 다른 경로로 전환하거나[\s\S]*재시도하지 않는다/);
  assert.match(fileChange, /^## `general_code_change` 성공 결과 예시$/m);
  assert.match(fileChange, /"actual_executor_type": "workflow-code-editor"/);
  assert.match(fileChange, /"actual_config_identifier": "not_applicable"[\s\S]*"actual_config_identifier_not_applicable_reason"/);
  assert.match(fileChange, /"actual_orchestration_session_id"[\s\S]*"actual_execution_session_id"[\s\S]*"actual_session_relation": "same_session"/);
  assert.match(fileChange, /현재 Codex 오케스트레이션 agent와 model[\s\S]*`not_applicable`로 기록하지 않는다/);
  assert.match(targetHarness, /Workflow Engine 전용 설정·필드·역할·결과 계약을 요구하지 않는다/);
  assert.match(workflowEditor, /Harness가 없거나 실행 전에 준비되지 않았음[\s\S]*현재 Codex 세션/);
  assert.match(targetHarness, /실행 session 수명 주기 준비됨/);
  assert.match(targetHarness, /새 session이 필요하면[\s\S]{0,120}callable `close_agent`/);
  assert.match(targetHarness, /같은 session에서 처리할 수 있는 요청은 이 사유만으로 제외하지 않는다/);
  assert.match(fileChange, /같은 session에서 실행하므로 `close_agent` capability가 없어도 사용할 수/);
  assert.match(fileChange, /필요한 별도 session의 close capability 부재[\s\S]{0,120}일반 경로/);
});

test("target runtime bootstrap and template compatibility belong to the workflow engine", async () => {
  const [
    skill,
    harness,
    harnessDocuments,
    workflowEngineDocuments,
    githubTemplates,
    targetRuntimeBootstrap,
    templateCompatibility,
    reviewRuntime,
    structured,
    workflowDoc,
    readme,
    settingsSource,
    referenceEntries,
  ] = await Promise.all([
    read("skill"),
    read("harness"),
    readMarkdownTree(urls.harnessRoot),
    readMarkdownTree(new URL("../../", import.meta.url)),
    read("githubTemplates"),
    read("targetRuntimeBootstrap"),
    read("templateCompatibility"),
    read("reviewRuntime"),
    read("structured"),
    read("workflowDoc"),
    read("readme"),
    read("settings"),
    readdir(new URL("../../references/", import.meta.url)),
  ]);

  const settings = JSON.parse(settingsSource);
  assert.ok(settings && typeof settings === "object");
  assert.ok(settings.dependencies && typeof settings.dependencies === "object");
  assert.ok(settings.dependencies.commit && typeof settings.dependencies.commit === "object");
  assert.ok(settings.review && typeof settings.review === "object");
  assert.ok(settings.review.modes && typeof settings.review.modes === "object");
  const supportedReviewModes = [
    "claude/code-review",
    "claude/awesome-code-review",
    "codex/awesome-code-review",
  ];
  assert.match(targetRuntimeBootstrap, /^# 타겟 Workflow Engine 런타임 초기화 계약$/m);
  assert.match(targetRuntimeBootstrap, /최초로 필요로 하는 시점/);
  assert.match(targetRuntimeBootstrap, /Harness 설치, 생성, 갱신 또는 감사\(audit\)의 책임이 아니다/);
  assert.match(targetRuntimeBootstrap, /임의 기본값을 만들지 않는다/);
  assert.match(targetRuntimeBootstrap, /기존 키와 유효한 값을 보존하면서 누락 필드만 생성/);
  assert.match(targetRuntimeBootstrap, /`\.workflow-engine\/settings\.json`은 Workflow Engine이 독점적으로 생성·해석/);
  assert.match(targetRuntimeBootstrap, /^### 누락 상태의 지연 초기화$/m);
  assert.match(targetRuntimeBootstrap, /^### 인식 불가 상태의 fail-closed 중단$/m);
  assert.match(targetRuntimeBootstrap, /설정 경로[\s\S]*문제가 된 필드와 관측된 값[\s\S]*기대 형식과 지원 값[\s\S]*현재 작업[\s\S]*재개 조건/);
  assert.match(targetRuntimeBootstrap, /별도 JSON Schema나[\s\S]*범용 설정 validator를 두지 않고/);
  assert.match(targetRuntimeBootstrap, /임의 기본값, 실행 모드 fallback, 충돌 값 덮어쓰기 또는 Harness 호출/);
  assert.match(reviewRuntime, /리뷰 실행 모드 지연 초기화 필요/);
  assert.match(reviewRuntime, /리뷰 실행 모드 설정 인식 불가/);
  assert.match(structured, /`\.workflow-engine\/settings\.json`에서 `리뷰 실행 모드 사용 가능`/);
  assert.match(templateCompatibility, /^# Workflow Engine 템플릿 정합성 계약$/m);
  assert.match(templateCompatibility, /같은 스킬의 `github-templates\.md`/);
  assert.match(templateCompatibility, /현재 작업이 요구하는 이슈 유형 또는 PR 템플릿만/);
  assert.match(templateCompatibility, /허용된 타겟 확장[\s\S]*보존/);
  assert.doesNotMatch(harness, /workflow-engine-template-compatibility-contract\.md/);
  await assert.rejects(access(urls.harnessTemplateCompatibility));
  for (const [path, document] of harnessDocuments) {
    assert.doesNotMatch(document, /Workflow Engine|workflow-engine|GitHub Workflow/i, path);
    assert.doesNotMatch(
      document,
      /\.workflow-engine\/settings\.json|target_ids_or_files|공통 구조화 실행 결과 계약/,
      path,
    );
  }
  for (const [path, document] of workflowEngineDocuments) {
    assert.equal(document.includes(legacySettingsRelativePath), false, path);
  }
  for (const [path, document] of [["README.md", readme], ["docs/github-workflow-engine.md", workflowDoc]]) {
    assert.equal(document.includes(legacySettingsRelativePath), false, path);
  }
  assert.equal(referenceEntries.some((entry) => /settings.*(?:schema|validator)/i.test(entry)), false);
  await access(urls.settings);
  await assert.rejects(access(urls.legacySettings));
  assert.equal(typeof settings.dependencies.commit.available, "boolean");
  assert.equal(typeof settings.dependencies.commit.checkedAt, "string");
  assert.equal(typeof settings.dependencies.commit.evidence, "string");
  assert.equal(supportedReviewModes.includes(settings.review.defaultMode), true);
  assert.deepEqual(Object.keys(settings.review.modes).sort(), supportedReviewModes.sort());
  for (const mode of Object.values(settings.review.modes)) {
    assert.equal(typeof mode.available, "boolean");
    assert.equal(typeof mode.checkedAt, "string");
    assert.equal(typeof mode.evidence, "string");
  }
  assert.match(githubTemplates, /target-runtime-bootstrap-contract\.md/);
  assert.match(githubTemplates, /workflow-engine-template-compatibility-contract\.md/);
  assert.match(skill, /target-runtime-bootstrap-contract\.md/);
  assert.match(skill, /workflow-engine-template-compatibility-contract\.md/);
  assert.match(workflowDoc, /현재 작업에서 해당 이슈 유형 라벨을 최초로 필요로 할 때/);
  assert.match(workflowDoc, /Harness 설치·생성·갱신 과정은 이 라벨을 만들거나 검사하지 않는다/);
  assert.match(workflowDoc, /`workflow-code-editor`가 실행 전 Harness 준비도를 확인/);
  assert.match(workflowDoc, /현재 Codex 세션의 일반 코드 변경 경로/);
  assert.match(workflowDoc, /`\.workflow-engine\/settings\.json`은 Workflow Engine이 독점적으로 생성·해석/);
  assert.doesNotMatch(workflowDoc, /직접 수정으로 우회하지 않고/);
  assert.match(readme, /해당 의존성을 최초로 필요로 할 때/);
  assert.match(readme, /`\.workflow-engine\/settings\.json`의 필요한 필드만 생성하거나 보완/);
  assert.match(readme, /`workflow-code-editor`:[\s\S]*Harness 일반 진입점[\s\S]*일반 코드 변경 경로/);
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

test("review feedback state comes only from diff review threads", async () => {
  const [stateObservation, reviewComment, workflowDoc, readme] = await Promise.all([
    read("stateObservation"),
    read("reviewComment"),
    read("workflowDoc"),
    read("readme"),
  ]);
  const removedObservationKey = ["legacy", "marker", "comments"].join("_");
  const removedSummaryMarker = ["codex-harness:", "summary", "-", "feedback", " v1"].join("");
  const readmeStateSourceParagraph = readme
    .split(/\n{2,}/)
    .find((paragraph) => paragraph.startsWith("GitHub Workflow Engine은 GitHub Issue와 PR을 작업 상태의 기준 저장소로 사용합니다."));

  assert.match(
    stateObservation,
    /Pull Request review threads는 diff가 있는 피드백과 resolved\/unresolved 상태를 리뷰 피드백 상태 원천으로 읽는다/,
  );
  assert.match(
    stateObservation,
    /Pull Request issue comments는 리뷰 피드백 상태 원천으로 쓰지 않는다/,
  );
  assert.match(
    workflowDoc,
    /\| Pull Request issue comments \| 리뷰 피드백 상태 원천으로 쓰지 않는다\. \|/,
  );
  assert.match(
    readme,
    /PR 본문, diff가 있는 review thread의 resolved\/unresolved 상태를 읽어 현재 위치와 다음 액션을 판단합니다/,
  );
  assert.equal(typeof readmeStateSourceParagraph, "string");
  assert.doesNotMatch(readmeStateSourceParagraph, /\bcomments?\b|댓글/i);
  for (const source of [stateObservation, reviewComment, workflowDoc]) {
    assert.doesNotMatch(source, new RegExp(removedObservationKey));
    assert.doesNotMatch(source, new RegExp(removedSummaryMarker));
  }
});

test("workflow-owned Claude review modes pin foreground wait without changing other call sites", async () => {
  const [skill, structured, claudeReview, workflowDoc, readme] = await Promise.all([
    read("skill"),
    read("structured"),
    read("claudeReview"),
    read("workflowDoc"),
    read("readme"),
  ]);

  assert.match(
    claudeReview,
    /\| `FI-15` \| `claude\/code-review` \| `\$cc:review --wait --base <pr-base-branch> --scope branch` \|/,
  );
  assert.match(
    claudeReview,
    /\| `FI-16` \| `claude\/awesome-code-review` \| `\$cc:adversarial-review --wait --base <pr-base-branch> --scope branch` \|/,
  );
  for (const source of [skill, workflowDoc, readme]) {
    assert.match(source, /`FI-15`[\s\S]*`FI-16`/);
    assert.match(source, /--wait/);
    assert.match(source, /foreground/);
    assert.doesNotMatch(source, /\$cc:review --background/);
    assert.doesNotMatch(source, /\$cc:adversarial-review --background/);
  }
  assert.match(
    claudeReview,
    /`FI-15`와 `FI-16`[\s\S]*정확한 호출값[\s\S]*단일 정본[\s\S]*같은 호출 표를 다시 선언하지 않는다/,
  );
  assert.match(
    structured,
    /`claude-review-executor-contract\.md`의 `Workflow Engine 호출 계약`을 단일 정본으로 사용한다[\s\S]*`confirmed_request_values`[\s\S]*같은 호출 표를 다시 선언하지 않는다/,
  );
  assert.doesNotMatch(structured, /\$cc:review --wait --base/);
  assert.doesNotMatch(structured, /\$cc:adversarial-review --wait --base/);
  assert.match(structured, /execution_mode=foreground[\s\S]*execution_control_flag=--wait[\s\S]*planned_session_relation=same_session/);
  assert.match(
    structured,
    /`--base <pr-base-branch>`와 `--scope branch`[\s\S]*PR의 head branch에 포함된 전체 변경[\s\S]*base branch와 비교[\s\S]*branch diff 전체/,
  );
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
