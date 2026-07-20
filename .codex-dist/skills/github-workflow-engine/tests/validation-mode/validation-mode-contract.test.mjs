import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const skillUrl = new URL("../../SKILL.md", import.meta.url);
const rulesUrl = new URL("../../references/workflow-engine-rules.md", import.meta.url);
const contractUrl = new URL("../../references/validation-mode-contract.md", import.meta.url);
const targetEditorUrl = new URL("../../../target-harness-code-editor/SKILL.md", import.meta.url);

async function read(url) {
  return readFile(url, "utf8");
}

test("validation mode requires explicit activation, ten independent sessions, raw results, and user judgment", async () => {
  const [skill, rules, contract, targetEditor] = await Promise.all([
    read(skillUrl),
    read(rulesUrl),
    read(contractUrl),
    read(targetEditorUrl),
  ]);

  for (const source of [skill, rules, contract, targetEditor]) {
    assert.match(source, /명시적(?:으로)? 요청|명시.*검증 모드/);
    assert.match(source, /정확히 10개|10개의 fresh independent|독립 session 10개/);
    assert.match(source, /raw result/);
    assert.match(source, /사용자.*판단|사용자에게.*판단/);
    assert.match(source, /자동 (비교|산출)|비교하지 않는다|일치 여부를 자동 비교하지 않는다/);
    assert.match(source, /자동 재개하지 않는다/);
  }
  assert.match(contract, /primary와 외부 상태를 변경하지 않는다/);
  assert.match(targetEditor, /격리[\s\S]*workspace/);
  assert.match(targetEditor, /완전 fan-out이면[\s\S]*정확히 10개/);
  assert.match(skill, /선택된 실행 주체 또는 대상 하네스 계약[\s\S]*실행 가능 여부를 확인/);
  assert.match(targetEditor, /사용자가 판단하는 코드 수정 호출 재현성/);
  assert.doesNotMatch(targetEditor, /unanimous patch/);
});

test("validation diagnostic is separate from the ordinary structured execution result", async () => {
  const targetEditor = await read(targetEditorUrl);
  const start = targetEditor.indexOf("### 검증 모드 terminal diagnostic");
  const end = targetEditor.indexOf("## 하지 않는 일", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);

  const diagnostic = targetEditor.slice(start, end);
  for (const field of [
    "request_id",
    "target_baseline",
    "snapshot_source",
    "fixed_condition_observations",
    "observed_session_count",
    "validation_session_ids",
    "raw_results",
    "integrity_verification",
    "integrity_failure_reasons",
  ]) {
    assert.match(diagnostic, new RegExp(`\\b${field}\\b`));
  }
  assert.match(diagnostic, /workspace가 필요한 경우에만/);
  assert.match(diagnostic, /고유 ID 정확히 10개/);
  assert.match(diagnostic, /결과 채택은 금지/);
  assert.match(diagnostic, /불완전 fan-out/);
  assert.match(diagnostic, /누락 ID나 결과를 만들거나 재시도하지\s*않는다/);
  assert.match(diagnostic, /관측된\s*count/);
  assert.doesNotMatch(diagnostic, /actual_execution_session_id|actual_session_relation|routing_status/);
});

test("validation mode has no comparator, CLI, or executor registry artifacts", async () => {
  for (const relativeUrl of [
    new URL("../../registries/registered-executors.json", import.meta.url),
    new URL("../../scripts/validation-mode/comparator.mjs", import.meta.url),
    new URL("../../scripts/validation-mode/cli.mjs", import.meta.url),
  ]) {
    await assert.rejects(access(relativeUrl));
  }
});
