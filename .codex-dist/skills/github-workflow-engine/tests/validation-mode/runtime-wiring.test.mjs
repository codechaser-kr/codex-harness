import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { Readable } from "node:stream";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { runValidationModeCli, runValidationModeEnvelope } from "../../scripts/validation-mode/cli.mjs";
import { compareValidationResults } from "../../scripts/validation-mode/comparator.mjs";
import { evaluateWorkflowDefinition } from "../../scripts/workflow-definition/evaluator.mjs";
import { normalizeImplementationFacts } from "../../scripts/workflow-definition/implementation-state-adapter.mjs";
import { parseJsonFile } from "../../scripts/workflow-definition/parser.mjs";

const fixtureUrl = new URL("./fixtures/validation-mode-cases.json", import.meta.url);
const cliPath = fileURLToPath(new URL("../../scripts/validation-mode/cli.mjs", import.meta.url));
const cliUrl = new URL("../../scripts/validation-mode/cli.mjs", import.meta.url);
const comparatorUrl = new URL("../../scripts/validation-mode/comparator.mjs", import.meta.url);
const skillUrl = new URL("../../SKILL.md", import.meta.url);
const rulesUrl = new URL("../../references/workflow-engine-rules.md", import.meta.url);
const contractUrl = new URL("../../references/validation-mode-contract.md", import.meta.url);
const workflowDefinitionContractUrl = new URL("../../references/workflow-definition-contract.md", import.meta.url);
const targetEditorUrl = new URL("../../../target-harness-code-editor/SKILL.md", import.meta.url);
const definitionUrl = new URL("../../definitions/implementation.json", import.meta.url);
const adapterUrl = new URL("../../scripts/workflow-definition/implementation-state-adapter.mjs", import.meta.url);
const sharedAdapterUrl = new URL("../../scripts/workflow-definition/workflow-state-adapter.mjs", import.meta.url);

async function readJson(url) {
  const result = await parseJsonFile(url);
  assert.equal(result.ok, true, result.ok ? "" : result.error.message);
  return result.value;
}

function makeReceipts(request, outcome) {
  return Array.from({ length: 10 }, (_, offset) => ({
    request_id: request.request_id,
    session_index: offset + 1,
    session_id: `runtime-session-${String(offset + 1).padStart(2, "0")}`,
    observed_state_snapshot: structuredClone(request.state_snapshot),
    observed_invocation_specification: structuredClone(request.invocation_specification),
    status: "usable",
    outcome: structuredClone(outcome),
    external_side_effects: [],
  }));
}

function hasError(result, code, path) {
  return result.errors.some((error) => error.code === code && error.path === path);
}

test("validation CLI consumes one request/receipts envelope", async () => {
  const fixture = await readJson(fixtureUrl);
  const envelope = {
    request: fixture.semantic_request,
    receipts: makeReceipts(fixture.semantic_request, fixture.semantic_outcome),
  };
  const pass = await runValidationModeCli({ input: Readable.from([JSON.stringify(envelope)]), args: [] });
  assert.equal(pass.status, "pass");
  assert.deepEqual(pass.unanimous_outcome, fixture.semantic_outcome);

  envelope.receipts[9].outcome.recommendation.direction = "feature_change";
  const stopped = await runValidationModeCli({ input: Readable.from([JSON.stringify(envelope)]), args: [] });
  assert.equal(stopped.reason, "not_unanimous");
  assert.equal(hasError(stopped, "comparison.outcome.mismatch", "/receipts/10/outcome"), true);

  assert.equal(hasError(await runValidationModeCli({ input: Readable.from([""]) }), "cli.stdin.empty", ""), true);
  assert.equal(hasError(await runValidationModeCli({ input: Readable.from(["{"]) }), "cli.stdin.invalid_json", ""), true);
  assert.equal(hasError(runValidationModeEnvelope({ ...envelope, file_path: "x" }), "validation_envelope.additional_property", "/file_path"), true);
  assert.equal(hasError(runValidationModeEnvelope({ request: envelope.request, session_results: [] }), "validation_envelope.additional_property", "/session_results"), true);
});

test("validation CLI process writes one JSON line and documented exit codes", async (t) => {
  const fixture = await readJson(fixtureUrl);
  const input = JSON.stringify({
    request: fixture.semantic_request,
    receipts: makeReceipts(fixture.semantic_request, fixture.semantic_outcome),
  });
  const pass = spawnSync(process.execPath, [cliPath], { input, encoding: "utf8", timeout: 5_000 });
  if (pass.error?.code === "EPERM") {
    t.skip("The current execution sandbox does not permit nested Node child processes.");
    return;
  }
  assert.equal(pass.error, undefined, pass.error?.message);
  assert.equal(pass.status, 0);
  assert.equal(pass.stderr, "");
  assert.equal(pass.stdout.endsWith("\n"), true);
  assert.equal(JSON.parse(pass.stdout).status, "pass");

  const malformed = spawnSync(process.execPath, [cliPath], { input: "{", encoding: "utf8", timeout: 5_000 });
  assert.equal(malformed.status, 1);
  assert.equal(JSON.parse(malformed.stdout).reason, "invalid_envelope");
});

test("diagnostic consensus stays separate from ordinary adapter and evaluator wiring", async () => {
  const [skill, rules, adapter, sharedAdapter, definition, fixture] = await Promise.all([
    readFile(skillUrl, "utf8"),
    readFile(rulesUrl, "utf8"),
    readFile(adapterUrl, "utf8"),
    readFile(sharedAdapterUrl, "utf8"),
    readJson(definitionUrl),
    readJson(fixtureUrl),
  ]);
  for (const phrase of [
    "내부에서 Definition validation을 수행하는 `evaluateWorkflowDefinition`",
    "runtime에서 evaluator 호출 전에",
    "`validateWorkflowDefinition`을 중복 호출하지 않는다",
    "자연어 전이표와 Definition을 이중 실행하거나 결과를 비교하지 않는다",
  ]) {
    assert.equal(skill.includes(phrase), true, phrase);
  }
  assert.equal(rules.includes("runtime에서 validator와 evaluator를 연속 호출하지 않는다"), true);
  assert.equal(adapter.includes("normalizeWorkflowObservations"), true);
  assert.equal(adapter.includes("export function normalizeImplementationFacts"), true);
  assert.equal(sharedAdapter.includes("export function normalizeWorkflowObservations"), true);

  const ordinaryObservation = {
    fact_id: "implementation_requested",
    value: true,
    source_kind: "user_input",
    source_reference: "current-user-request",
    field_reference: "implementation_requested",
  };
  const normalized = normalizeImplementationFacts(definition, [ordinaryObservation]);
  assert.equal(normalized.status, "normalized");
  assert.deepEqual(normalized.normalized_fact_state, { implementation_requested: true });

  const factOutcome = { observations: [ordinaryObservation] };
  const consensus = compareValidationResults(
    fixture.semantic_request,
    makeReceipts(fixture.semantic_request, factOutcome),
  );
  assert.equal(consensus.status, "pass");
  assert.deepEqual(consensus.unanimous_outcome, factOutcome);
  assert.deepEqual(Object.keys(consensus.consensus_receipt), ["session_ids"]);
  assert.equal(Object.hasOwn(consensus.consensus_receipt, "workspace_ids"), false);
  assert.equal(Object.hasOwn(consensus, "transition_id"), false);
  assert.equal(Object.hasOwn(consensus, "task_action_id"), false);

  let evaluatorCallCount = 0;
  const evaluateOnce = (...args) => {
    evaluatorCallCount += 1;
    return evaluateWorkflowDefinition(...args);
  };
  const evaluation = evaluateOnce(definition, normalized.normalized_fact_state, {
    currentTransitionId: definition.entry_transition_id,
  });
  assert.equal(evaluatorCallCount, 1);
  assert.equal(evaluation.status, "action_required");
  assert.equal(evaluation.task_action_id, "FI-1");
  assert.deepEqual(definition.transitions.map((transition) => transition.task_action_id), Array.from({ length: 36 }, (_, index) => `FI-${index + 1}`));
});

test("runtime contracts require explicit user activation and terminal diagnostic-only output", async () => {
  const [skill, rules, contract, workflowDefinitionContract, targetEditor, cliSource, comparatorSource] = await Promise.all([
    readFile(skillUrl, "utf8"),
    readFile(rulesUrl, "utf8"),
    readFile(contractUrl, "utf8"),
    readFile(workflowDefinitionContractUrl, "utf8"),
    readFile(targetEditorUrl, "utf8"),
    readFile(cliUrl, "utf8"),
    readFile(comparatorUrl, "utf8"),
  ]);
  const normalizedSkill = skill.replace(/\s+/g, " ");
  const normalizedRules = rules.replace(/\s+/g, " ");
  const normalizedContract = contract.replace(/\s+/g, " ");
  const normalizedWorkflowDefinitionContract = workflowDefinitionContract.replace(/\s+/g, " ");
  const normalizedTargetEditor = targetEditor.replace(/\s+/g, " ");

  for (const phrase of [
    "현재 요청에서 검증 모드",
    "terminal diagnostic",
    "진단 관측값일 뿐",
    "명시적 활성화 뒤에만",
    "strict registry validation 실패",
    "정확히 10개의 fresh independent LLM session",
    "`planned_session_relation = ten_independent_isolated_execution_sessions`",
    "`planned_session_slots` 정확히 10개",
    "primary 또는 외부 상태를 변경하지 않는다",
    "일반 workflow를 자동 재개하지 않는다",
    "명시적 결정을 요청한 뒤 종료",
    "이 결정은 Workflow Definition transition으로 추가하지 않는다",
    "control-plane fixture는 live 10-session 수행 증거가 아니다",
  ]) {
    assert.equal(normalizedSkill.includes(phrase), true, `SKILL.md: ${phrase}`);
  }
  for (const phrase of [
    "현재 사용자 요청이 validation mode를 명시한 경우에만",
    "terminal diagnostic",
    "ordinary Definition evaluation/transition 선택의 입력이 아니다",
    "동일 raw snapshot, route, model, reasoning, role, skill/version, config, input",
    "planned_session_relation",
    "planned_session_slots",
    "검증 session set 결과 식별 가능",
    "actual_execution_session_id_not_applicable_reason = validation_consensus_uses_session_set",
    "상태 변경 전 중단",
    "normal workflow를 자동 재개하지 않는다",
    "이 결정은 Workflow Definition transition이 아니다",
  ]) {
    assert.equal(normalizedRules.includes(phrase), true, `rules: ${phrase}`);
  }
  for (const phrase of [
    "같은 strict contract를 사용한다",
    "위 여섯 필드만 정확히 가진 plain object",
    "`Set`, string array",
    "결정적인 `registry.load_failed`",
    "registry 전체 구조와 definition의 executor reference 존재를 항상 검증",
    "ordinary Definition evaluation이나 transition 선택의 입력이 아니며 validation mode를 활성화하지 않는다",
    "명시적으로 활성화된 뒤에만",
  ]) {
    assert.equal(normalizedWorkflowDefinitionContract.includes(phrase), true, `workflow definition contract: ${phrase}`);
  }
  for (const phrase of [
    "scripts/validation-mode/*`는 agent를 호출하지 않으며",
    "현재 요청에서 명시적으로 요청했을 때만",
    "terminal diagnostic",
    "정확히 10개의 fresh independent session",
    "ten_independent_isolated_execution_sessions",
    "pending_tool_issued",
    "`semantic_consensus` request는 위 공통 필드만 가진다",
    "semantic receipt에는 두 필드를 넣지 않는다",
    "null 또는 빈 배열 placeholder로 만들지 않는다",
    "정규화된 전체",
    "unanimous_outcome",
    "primary나 외부 변경으로 기록하지 않는다",
    "자동 후속 실행을 발생시키지 않는다",
    "control-plane test",
  ]) {
    assert.equal(normalizedContract.includes(phrase), true, `contract: ${phrase}`);
  }
  for (const phrase of [
    "일반 모드에서는 기존 단일 별도 편집",
    "workspace를 정확히 10개",
    "fresh independent editing LLM session",
    "manifest와 canonical patch",
    "primary baseline",
    "primary 또는 외부 상태를 변경할 수 없다",
    "top-level proof field로 복제하지 않는다",
    "ordinary workflow를 자동 재개하지 않는다",
    "consensus_session_ids",
    "consensus_workspace_ids",
    "validation_consensus_uses_session_set",
  ]) {
    assert.equal(normalizedTargetEditor.includes(phrase), true, `target editor: ${phrase}`);
  }
  for (const forbidden of [
    "원 호출 결과로 채택하고 원 workflow를 계속",
    "canonical patch를 primary에 정확히 한 번 적용",
    "unanimous patch outcome을 원래 파일 편집 결과로 채택",
    "semantic_consensus baseline must be null",
    "semantic_consensus observed_baseline must be null",
    "semantic_consensus workspace_id must be null",
  ]) {
    assert.equal(`${normalizedSkill} ${normalizedRules} ${normalizedContract} ${normalizedTargetEditor}`.includes(forbidden), false, forbidden);
  }
  for (const removedField of [
    "apply_count",
    "consensus_strategy",
    "consensus_baseline",
    "consensus_manifest",
    "consensus_patch_digest",
  ]) {
    assert.equal(normalizedTargetEditor.includes(removedField), false, `target editor removed field: ${removedField}`);
  }
  for (const removedConcept of ["apply_count", "apply count", "apply check", "apply-check", "apply_check"]) {
    assert.equal(normalizedSkill.includes(removedConcept), false, `SKILL.md removed concept: ${removedConcept}`);
    assert.equal(normalizedRules.includes(removedConcept), false, `rules removed concept: ${removedConcept}`);
    assert.equal(normalizedContract.includes(removedConcept), false, `contract removed concept: ${removedConcept}`);
    assert.equal(normalizedTargetEditor.includes(removedConcept), false, `target editor removed concept: ${removedConcept}`);
    assert.equal(comparatorSource.includes(removedConcept), false, `comparator removed concept: ${removedConcept}`);
  }
  assert.equal(cliSource.includes("node:fs"), false);
  assert.equal(cliSource.includes("session_results"), false);
});
