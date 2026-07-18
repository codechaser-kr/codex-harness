import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { Readable } from "node:stream";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { runValidationModeCli, runValidationModeEnvelope } from "../../scripts/validation-mode/cli.mjs";
import { parseJsonFile } from "../../scripts/workflow-definition/parser.mjs";

const fixtures = new URL("./fixtures/", import.meta.url);
const cliPath = fileURLToPath(new URL("../../scripts/validation-mode/cli.mjs", import.meta.url));
const cliUrl = new URL("../../scripts/validation-mode/cli.mjs", import.meta.url);
const skillUrl = new URL("../../SKILL.md", import.meta.url);
const rulesUrl = new URL("../../references/workflow-engine-rules.md", import.meta.url);
const contractUrl = new URL("../../references/validation-mode-contract.md", import.meta.url);

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
    "majority, retry, representative adoption은 금지",
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
  for (const field of ["state_snapshot", "normalized_fact_state", "registered_executor_invoked", "github_state_changes", "pull_requests"]) {
    assert.equal(contract.includes(`\`${field}\``), true, field);
  }
  assert.equal(cliSource.includes("node:fs"), false);
  assert.equal(cliSource.includes("readFile"), false);
  assert.equal(cliSource.includes("writeFile"), false);
});
