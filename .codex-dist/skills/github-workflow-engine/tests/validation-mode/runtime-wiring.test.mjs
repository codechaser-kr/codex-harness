import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { Readable } from "node:stream";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { runValidationModeCli, runValidationModeEnvelope } from "../../scripts/validation-mode/cli.mjs";
import { evaluateWorkflowDefinition } from "../../scripts/workflow-definition/evaluator.mjs";
import { parseJsonFile } from "../../scripts/workflow-definition/parser.mjs";

const fixtures = new URL("./fixtures/", import.meta.url);
const cliPath = fileURLToPath(new URL("../../scripts/validation-mode/cli.mjs", import.meta.url));
const cliUrl = new URL("../../scripts/validation-mode/cli.mjs", import.meta.url);
const skillUrl = new URL("../../SKILL.md", import.meta.url);
const rulesUrl = new URL("../../references/workflow-engine-rules.md", import.meta.url);
const contractUrl = new URL("../../references/validation-mode-contract.md", import.meta.url);
const implementationDefinitionUrl = new URL("../../definitions/implementation.json", import.meta.url);
const implementationAdapterUrl = new URL("../../scripts/workflow-definition/implementation-state-adapter.mjs", import.meta.url);
const implementationStatesUrl = new URL("../workflow-definition/fixtures/implementation-states.json", import.meta.url);

async function readFixture() {
  const result = await parseJsonFile(new URL("validation-mode-cases.json", fixtures));
  assert.equal(result.ok, true, result.ok ? "" : result.error.message);
  return result.value;
}

function makeResults(fixture) {
  return Array.from({ length: 10 }, (_, offset) => ({
    request_id: fixture.request.request_id,
    session_index: offset + 1,
    session_id: `runtime-session-${String(offset + 1).padStart(2, "0")}`,
    observed_invocation_specification: structuredClone(fixture.request.invocation_specification),
    ...structuredClone(fixture.session_result_template),
  }));
}

function parseJsonLine(processResult) {
  assert.equal(processResult.stderr, "");
  assert.equal(processResult.stdout.endsWith("\n"), true);
  const document = processResult.stdout.slice(0, -1);
  assert.equal(document.includes("\n"), false);
  const value = JSON.parse(document);
  assert.equal(JSON.stringify(value), document);
  return value;
}

function hasError(result, code, path) {
  return result.errors.some((error) => error.code === code && error.path === path);
}

test("validation CLI accepts one stdin envelope and returns structured pass or stopped results", async () => {
  const fixture = await readFixture();
  const passEnvelope = { request: fixture.request, session_results: makeResults(fixture) };
  const pass = await runValidationModeCli({ input: Readable.from([JSON.stringify(passEnvelope)]), args: [] });
  assert.equal(pass.status, "pass");
  assert.equal(pass.request_id, fixture.request.request_id);

  const stoppedEnvelope = structuredClone(passEnvelope);
  stoppedEnvelope.session_results[9].semantic_decisions.direction = "feature_change";
  const stopped = await runValidationModeCli({ input: Readable.from([JSON.stringify(stoppedEnvelope)]), args: [] });
  assert.equal(stopped.status, "stopped");
  assert.equal(stopped.reason, "not_reproducible");

  const empty = await runValidationModeCli({ input: Readable.from([""]), args: [] });
  assert.equal(hasError(empty, "cli.stdin.empty", ""), true);

  const malformed = await runValidationModeCli({ input: Readable.from(["{"]), args: [] });
  assert.equal(hasError(malformed, "cli.stdin.invalid_json", ""), true);

  const argument = await runValidationModeCli({ input: Readable.from([JSON.stringify(passEnvelope)]), args: ["/does-not-exist.json"] });
  assert.equal(hasError(argument, "cli.arguments.forbidden", ""), true);

  const extraEnvelope = runValidationModeEnvelope({ ...passEnvelope, file_path: "/does-not-exist.json" });
  assert.equal(hasError(extraEnvelope, "validation_envelope.additional_property", "/file_path"), true);
});

test("validation CLI process writes exactly one JSON line and uses documented exit codes", async (t) => {
  const fixture = await readFixture();
  const envelope = JSON.stringify({ request: fixture.request, session_results: makeResults(fixture) });
  const pass = spawnSync(process.execPath, [cliPath], { input: envelope, encoding: "utf8", timeout: 5_000 });
  if (pass.error?.code === "EPERM") {
    t.skip("The current execution sandbox does not permit nested Node child processes.");
    return;
  }
  assert.equal(pass.error, undefined, pass.error?.message);
  assert.equal(pass.status, 0);
  assert.equal(parseJsonLine(pass).status, "pass");

  const malformed = spawnSync(process.execPath, [cliPath], { input: "{", encoding: "utf8", timeout: 5_000 });
  assert.equal(malformed.error, undefined, malformed.error?.message);
  assert.equal(malformed.status, 1);
  assert.equal(parseJsonLine(malformed).reason, "invalid_envelope");

  const empty = spawnSync(process.execPath, [cliPath], { input: "", encoding: "utf8", timeout: 5_000 });
  assert.equal(empty.error, undefined, empty.error?.message);
  assert.equal(empty.status, 1);
  assert.equal(hasError(parseJsonLine(empty), "cli.stdin.empty", ""), true);

  const argument = spawnSync(process.execPath, [cliPath, "/does-not-exist.json"], { input: "", encoding: "utf8", timeout: 5_000 });
  assert.equal(argument.error, undefined, argument.error?.message);
  assert.equal(argument.status, 1);
  assert.equal(hasError(parseJsonLine(argument), "cli.arguments.forbidden", ""), true);
});

test("normal runtime wires implementation through one fail-closed Definition path", async () => {
  const [skill, rules, adapter, definitionResult, statesResult] = await Promise.all([
    readFile(skillUrl, "utf8"),
    readFile(rulesUrl, "utf8"),
    readFile(implementationAdapterUrl, "utf8"),
    parseJsonFile(implementationDefinitionUrl),
    parseJsonFile(implementationStatesUrl),
  ]);
  assert.equal(definitionResult.ok, true, definitionResult.ok ? "" : definitionResult.error.message);
  assert.equal(statesResult.ok, true, statesResult.ok ? "" : statesResult.error.message);
  const definition = definitionResult.value;
  const implementationStates = statesResult.value;
  const normalizedSkill = skill.replace(/\s+/g, " ");
  const normalizedRules = rules.replace(/\s+/g, " ");

  for (const phrase of [
    "## 일반 실행 Workflow Definition",
    "`definitions/implementation.json`",
    "`scripts/workflow-definition/implementation-state-adapter.mjs`",
    "`normalizeImplementationFacts`로 정확히 한 번",
    "`validateWorkflowDefinition`과 `evaluateWorkflowDefinition`을 각각 정확히 한 번",
    "단일 경로만 사용",
    "최초 진입이 명확히 관측된 경우에만 `definition.entry_transition_id`",
    "이전 evaluation이 반환한 단일 `transition_id`",
    "`currentTransitionId`로 다시 전달해 Definition의 `next_transition_rules`",
    "재개할 current transition id가 없거나 Definition에 존재하지 않거나 현재 normalized fact 조건과 불일치",
    "entry를 추정하거나 자연어 전이로 fallback하지 않고 구조화 중단",
    "current transition id는 LLM이 임의로 추론하지 않으며 `task_action_id`와 혼용하지 않는다",
    "단일 현재 작업의 `task_action_id`",
    "adapter·Definition validation 또는 evaluation의 `stopped`와 오류는 구조화 중단",
    "자연어 구현 전이로 fallback하지 않고",
    "자연어 전이표와 Definition을 이중 실행하거나 결과를 비교하지 않는다",
    "명시적 검증 모드는 아래 별도 계약으로만 실행",
  ]) {
    assert.equal(normalizedSkill.includes(phrase), true, `SKILL.md implementation runtime: ${phrase}`);
  }

  for (const phrase of [
    "## 일반 실행 Workflow Definition 규칙",
    "`definitions/implementation.json`",
    "`scripts/workflow-definition/implementation-state-adapter.mjs`",
    "정확히 한 번 정규화",
    "정확히 한 번 validate",
    "정확히 한 번 evaluate",
    "최초 진입이 명확히 관측된 경우에만 `entry_transition_id`를 evaluator의 `currentTransitionId`로 사용",
    "이전 evaluation의 단일 `transition_id`를 current transition id로 확정·기록",
    "같은 ID에서 Definition의 `next_transition_rules`를 평가",
    "재개할 current transition id가 없거나 Definition에 존재하지 않거나 현재 normalized fact 조건과 불일치",
    "entry 추정 없이 구조화 중단",
    "current transition id를 LLM이 임의 추론하거나 `task_action_id`와 혼용하지 않는다",
    "자연어 구현 전이 fallback",
    "자연어 전이표와 Definition의 이중 실행·비교",
    "관측되지 않은 fact 추론은 허용하지 않는다",
    "단일 현재 작업만 기존 현재 작업 산출, 사용자 결정, 실행 주체 선택, 구조화 실행 요청·결과 판정에 연결",
    "기능제안·정책검토·기능변경·기능결함의 기존 Workflow Definition 선택 경로를 변경하지 않는다",
  ]) {
    assert.equal(normalizedRules.includes(phrase), true, `workflow-engine-rules.md implementation runtime: ${phrase}`);
  }

  assert.equal(definition.workflow_id, "implementation");
  assert.equal(definition.workflow_kind, "implementation");
  assert.deepEqual(
    definition.transitions.map((transition) => transition.task_action_id),
    Array.from({ length: 36 }, (_, index) => `FI-${index + 1}`),
  );
  assert.equal(adapter.includes("export function normalizeImplementationFacts"), true);
  assert.equal(adapter.includes("validateSourceContracts(definition)"), true);
  assert.equal(adapter.includes("validateObservations(observations)"), true);

  const firstEntryState = { implementation_requested: true };
  const firstEntryResult = evaluateWorkflowDefinition(definition, firstEntryState, {
    currentTransitionId: definition.entry_transition_id,
  });
  assert.equal(firstEntryResult.status, "action_required");
  assert.equal(firstEntryResult.task_action_id, "FI-1");

  const repeatCases = [
    implementationStates.branch_cases.find((scenario) => scenario.name === "next work unit repeats implementation"),
    implementationStates.review_feedback_cases.find((scenario) => scenario.name === "remaining location deferral repeats user direction"),
    implementationStates.review_feedback_cases.find((scenario) => scenario.name === "unresolved choice advances to next unhandled feedback"),
  ];
  for (const scenario of repeatCases) {
    assert.notEqual(scenario, undefined);
    const stateBefore = structuredClone(scenario.state);
    const withoutCurrentTransition = evaluateWorkflowDefinition(definition, scenario.state);
    assert.equal(withoutCurrentTransition.status, "stopped", `${scenario.name}: missing current transition`);
    assert.notEqual(withoutCurrentTransition.reason, undefined, scenario.name);

    const withCurrentTransition = evaluateWorkflowDefinition(definition, scenario.state, {
      currentTransitionId: scenario.current_transition_id,
    });
    assert.equal(withCurrentTransition.status, "action_required", scenario.name);
    assert.equal(withCurrentTransition.task_action_id, scenario.task_action_id, scenario.name);
    assert.deepEqual(scenario.state, stateBefore, scenario.name);
  }

  const repeatedWorkUnit = repeatCases[0];
  const taskActionAsTransition = evaluateWorkflowDefinition(definition, repeatedWorkUnit.state, {
    currentTransitionId: "FI-8",
  });
  assert.equal(taskActionAsTransition.status, "stopped");
  assert.equal(taskActionAsTransition.reason, "current_transition_not_found");
  const mismatchedTransition = evaluateWorkflowDefinition(definition, repeatedWorkUnit.state, {
    currentTransitionId: "switch-branch",
  });
  assert.equal(mismatchedTransition.status, "stopped");
  assert.equal(mismatchedTransition.reason, "current_transition_condition_not_met");

  const implementationSection = rules.slice(rules.indexOf("### 구현 흐름"));
  const normalizedImplementationSection = implementationSection.replace(/\s+/g, " ");
  assert.equal(implementationSection.split("\n").some((line) => line.startsWith("|")), false);
  for (const phrase of [
    "`FI-1`~`FI-36` 전이와 terminal만",
    "상태 읽기, evidence/source, 사용자 입력 유효성, 사용자 결정",
    "실행 주체·권한·명령, 구조화 요청·결과, retry, 외부 의존성 계약",
    "`target-harness-code-editor`",
    "확정된 고사양 리뷰 실행 주체",
    "inline diff review thread만 사용",
    "PR merge는 사람만 수행",
    "`미해결`은 선택 thread를 unresolved로 유지",
    "다음 미처리 피드백이 있으면 그 대상으로 이동",
    "`거절`은 사용자 확정값만 사용",
    "거절 근거를 생성하거나 추론하지 않는다",
    "marker 요약 피드백 게시 fallback",
  ]) {
    assert.equal(normalizedImplementationSection.includes(phrase), true, `implementation declaration: ${phrase}`);
  }
  assert.equal(implementationSection.includes("legacy_marker_comments"), false);
  assert.equal(implementationSection.includes("| 브랜치 이름 제안"), false);

  for (const heading of ["### 기능제안 흐름", "### 정책검토 흐름", "### 기능변경 흐름", "### 기능결함 흐름"]) {
    assert.equal(rules.includes(heading), true, heading);
  }
  for (const reviewExecutor of ["`claude/code-review`", "`claude/awesome-code-review`", "`codex/awesome-code-review`"]) {
    assert.equal(skill.includes(reviewExecutor), true, reviewExecutor);
  }
  assert.equal(normalizedSkill.includes("`docs/github-workflow-engine.md`는 런타임 판정 원천으로 읽지 않는다"), true);
});

test("runtime instructions keep validation mode explicit, isolated, and side-effect-free", async () => {
  const [skill, rules, contract, cliSource] = await Promise.all([
    readFile(skillUrl, "utf8"),
    readFile(rulesUrl, "utf8"),
    readFile(contractUrl, "utf8"),
    readFile(cliUrl, "utf8"),
  ]);

  for (const phrase of [
    "현재 요청에서 검증 모드",
    "단순한 `검증` 표현",
    "제안·분석 스킬의 일반 호출",
    "정확히 10개의 fresh independent session",
    "reuse/continue, prompt/result/context sharing은 금지",
    "read-only sandbox와 state-changing tools 없는 조건",
    "10개 모두 complete return할 때까지 wait-all",
    "retry, majority, representative",
    "stdin JSON envelope",
    "normal structured",
    ".harness/logs/github-workflow-log.md`도 파일이므로 읽거나 쓰지 않는다",
    "deterministic_evaluation",
  ]) {
    assert.equal(skill.includes(phrase), true, phrase);
  }
  for (const phrase of [
    "현재 요청에서 `검증 모드`를 명시",
    "정확히 10개 fresh independent session",
    "index는 1..10, session ID는 모두 고유",
    "reuse/continue, prompt/result/context sharing은 금지",
    "read-only sandbox",
    "wait-all",
    "comparator `pass`만 허용",
    "retry, majority, representative adoption 없이",
    "normal workflow state transition이 아닌 validation terminal result",
  ]) {
    assert.equal(rules.includes(phrase), true, phrase);
  }
  for (const phrase of [
    "registries/registered-executors.json",
    "한 번만 validate/resolve",
    "registered_executor_reference: null",
    "registry load/resolve 실패",
    'executor_kind === "skill" && side_effect_scope === "proposal_output"',
    "정상 registered executor를 호출하지 않고",
  ]) {
    assert.equal(skill.includes(phrase), true, `SKILL.md: ${phrase}`);
    assert.equal(rules.includes(phrase), true, `workflow-engine-rules.md: ${phrase}`);
  }
  for (const phrase of [
    "probe session 시작 전에",
    "런타임이 강제할 수 있는 유한한 deadline",
    "10개 session 시작 전 `stopped`",
    "정확히 같은 유한 deadline 조건을 10개 fresh independent session 모두에 적용",
    "wait-all도 이 deadline으로 유한하게 제한",
    "deadline을 초과한 session",
    "런타임에서 종료하거나 close",
    "session return 실패로 기록",
    "시작된 session을 방치하지 않는다",
    "부분 `session_results`를 comparator에 전달하지 않고",
    "retry, majority, representative adoption 없이 전체 검증을 `stopped`로 종료",
  ]) {
    assert.equal(skill.includes(phrase), true, `SKILL.md deadline contract: ${phrase}`);
    assert.equal(rules.includes(phrase), true, `workflow-engine-rules.md deadline contract: ${phrase}`);
  }
  for (const field of ["state_snapshot", "normalized_fact_state", "registered_executor_invoked", "github_state_changes", "pull_requests"]) {
    assert.equal(contract.includes(`\`${field}\``), true, field);
  }
  assert.equal(cliSource.includes("node:fs"), false);
  assert.equal(cliSource.includes("readFile"), false);
  assert.equal(cliSource.includes("writeFile"), false);
});
