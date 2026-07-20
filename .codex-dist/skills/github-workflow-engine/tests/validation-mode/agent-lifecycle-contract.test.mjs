import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const engineSkillUrl = new URL("../../SKILL.md", import.meta.url);
const rulesUrl = new URL("../../references/workflow-engine-rules.md", import.meta.url);
const validationContractUrl = new URL("../../references/validation-mode-contract.md", import.meta.url);
const targetEditorUrl = new URL("../../../target-harness-code-editor/SKILL.md", import.meta.url);
const harnessSkillUrl = new URL("../../../harness/SKILL.md", import.meta.url);
const loggingContractUrl = new URL("../../../harness/references/logging-contract.md", import.meta.url);
const readinessChecklistUrl = new URL("../../../harness/references/generator-readiness-checklist.md", import.meta.url);
const verificationChecklistUrl = new URL("../../../harness/references/verification-checklist.md", import.meta.url);
const designDocumentUrl = new URL("../../../../../docs/github-workflow-engine.md", import.meta.url);

async function read(url) {
  return readFile(url, "utf8");
}

test("subagent result status is distinct from execution resource cleanup", async () => {
  const [harnessSkill, loggingContract, readinessChecklist, verificationChecklist] = await Promise.all([
    read(harnessSkillUrl),
    read(loggingContractUrl),
    read(readinessChecklistUrl),
    read(verificationChecklistUrl),
  ]);

  for (const source of [harnessSkill, loggingContract, readinessChecklist, verificationChecklist]) {
    assert.match(source, /completed[\s\S]{0,180}(?:실행 리소스 정리|정리 완료)/);
    assert.match(source, /close_agent/);
  }

  for (const source of [harnessSkill, loggingContract, readinessChecklist]) {
    assert.doesNotMatch(source, /(?:subagent|비동기 역할)[^\n]*completed`? 또는 `?timed_out[^\n]*정리한다/);
  }
});

test("all orchestrators preserve results before closing every issued agent", async () => {
  const [engineSkill, rules, validationContract, targetEditor, designDocument] = await Promise.all([
    read(engineSkillUrl),
    read(rulesUrl),
    read(validationContractUrl),
    read(targetEditorUrl),
    read(designDocumentUrl),
  ]);

  for (const source of [engineSkill, rules, validationContract, targetEditor, designDocument]) {
    assert.match(source, /(?:결과|raw result|raw 결과)[\s\S]{0,500}(?:보존|기록)[\s\S]{0,500}close_agent/);
    assert.match(source, /close_agent[\s\S]{0,350}not_found/);
    assert.match(source, /내부 상태\s*DB를 직접 수정하지 않는다/);
    assert.match(source, /(?:결과의\s*의미|결과\s*의미|raw result(?:의)?\s*의미)[\s\S]{0,250}(?:전이|판정)|(?:전이|판정)[\s\S]{0,250}(?:결과의\s*의미|결과\s*의미)/);
  }
});

test("ordinary target editing and validation fan-out both close issued sessions", async () => {
  const targetEditor = await read(targetEditorUrl);
  const ordinaryStart = targetEditor.indexOf("## 일반 모드");
  const validationStart = targetEditor.indexOf("## 검증 모드", ordinaryStart);
  const outputStart = targetEditor.indexOf("## 출력", validationStart);
  assert.notEqual(ordinaryStart, -1);
  assert.notEqual(validationStart, -1);
  assert.notEqual(outputStart, -1);

  const ordinary = targetEditor.slice(ordinaryStart, validationStart);
  const validation = targetEditor.slice(validationStart, outputStart);
  assert.match(ordinary, /결과·오류·timeout[\s\S]*보존[\s\S]*close_agent/);
  assert.match(ordinary, /성공·실패·중단과 무관하게/);
  assert.match(validation, /10개 의도된 slot[\s\S]*실제 발급된 모든 session ID[\s\S]*close_agent/);
  assert.match(validation, /completed` 또는 `timed_out`은 실행 리소스 정리 완료가 아니다/);
});
