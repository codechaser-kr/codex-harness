import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const engineSkillUrl = new URL("../../SKILL.md", import.meta.url);
const structuredContractUrl = new URL("../../references/structured-execution-contract.md", import.meta.url);
const targetHarnessContractUrl = new URL("../../references/target-harness-execution-contract.md", import.meta.url);
const validationContractUrl = new URL("../../references/validation-mode-contract.md", import.meta.url);
const lifecycleContractUrl = new URL("../../references/agent-lifecycle-contract.md", import.meta.url);
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

test("runtime orchestrators do not depend on the harness logging contract", async () => {
  const [engineSkill, targetEditor, structuredContract] = await Promise.all([
    read(engineSkillUrl),
    read(targetEditorUrl),
    read(structuredContractUrl),
  ]);

  for (const source of [engineSkill, targetEditor, structuredContract]) {
    assert.doesNotMatch(source, /(?:harness\/references\/)?logging-contract\.md/);
  }
});

test("each runtime owner closes only agent IDs it issued directly", async () => {
  const [engineSkill, lifecycleContract, targetEditor, designDocument] = await Promise.all([
    read(engineSkillUrl),
    read(lifecycleContractUrl),
    read(targetEditorUrl),
    read(designDocumentUrl),
  ]);

  for (const source of [lifecycleContract, targetEditor, designDocument]) {
    assert.match(source, /(?:결과|raw result|raw 결과)[\s\S]{0,500}(?:보존|기록)[\s\S]{0,500}close_agent/);
    assert.match(source, /직접[^\n]{0,120}발급받은[^\n]{0,120}ID/);
  }

  assert.match(engineSkill, /agent-lifecycle-contract\.md/);
  assert.match(lifecycleContract, /같은 세션에서[\s\S]{0,150}단순 스킬 호출[\s\S]{0,150}관리\s*대상이 아니다/);
  assert.match(lifecycleContract, /부모는[\s\S]{0,180}(?:하위|child) ID[\s\S]{0,180}중복으로 `close_agent`하지 않는다/);
  assert.match(targetEditor, /Workflow Engine은[\s\S]{0,180}직접 발급받은 ID[\s\S]{0,100}중복으로 닫지 않는다/);
});

test("agent lifecycle contract is the single source for shared cleanup rules", async () => {
  const [lifecycleContract, structuredContract, validationContract] = await Promise.all([
    read(lifecycleContractUrl),
    read(structuredContractUrl),
    read(validationContractUrl),
  ]);

  assert.match(lifecycleContract, /completed[\s\S]{0,100}timed_out[\s\S]{0,180}정리 완료가 아니다/);
  assert.match(lifecycleContract, /not_found[\s\S]{0,180}내부 상태 DB를 직접 수정하지 않는다/);
  assert.match(lifecycleContract, /verification_results[\s\S]{0,180}residual_risks_or_failure_reasons/);
  assert.match(lifecycleContract, /integrity_verification[\s\S]{0,180}integrity_failure_reasons/);
  assert.match(lifecycleContract, /새 정리용 필드, 스키마 또는 등록부를 만들지 않는다/);
  assert.doesNotMatch(structuredContract, /^## 생성 주체별 서브에이전트 수명 주기$/m);
  assert.doesNotMatch(validationContract, /completed[^\n]*timed_out[^\n]*정리/);
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
  assert.match(validation, /10개 의도된 slot[\s\S]*실제 발급받은 모든 검증 session ID[\s\S]*close_agent/);
  assert.match(validation, /completed` 또는[\s\S]{0,30}`timed_out`은 실행 리소스 정리 완료가 아니다/);
});

test("target editor returns cleanup evidence through existing result fields", async () => {
  const [targetEditor, lifecycleContract, targetHarnessContract] = await Promise.all([
    read(targetEditorUrl),
    read(lifecycleContractUrl),
    read(targetHarnessContractUrl),
  ]);

  for (const source of [targetEditor, lifecycleContract]) {
    assert.match(source, /(?:정리 시도와 결과|정리 결과)[\s\S]{0,220}verification_results|verification_results[\s\S]{0,220}(?:정리 시도와 결과|정리 결과)/);
    assert.match(source, /정리 실패[\s\S]{0,180}residual_risks_or_failure_reasons|residual_risks_or_failure_reasons[\s\S]{0,180}정리 실패/);
  }
  assert.match(targetEditor, /새 cleanup 필드[\s\S]{0,80}(?:schema|필드)/);
  assert.match(lifecycleContract, /새 정리용 필드, 스키마 또는 등록부를 만들지 않는다/);
  assert.match(targetHarnessContract, /^### Target Harness Code Editor 출력 사용 가능$/m);
  assert.match(targetHarnessContract, /target editor가 직접 발급받은 모든 ID[\s\S]*verification_results/);
  assert.match(targetHarnessContract, /정리 실패[\s\S]*residual_risks_or_failure_reasons/);
  assert.match(targetHarnessContract, /Workflow Engine은[\s\S]*child ID[\s\S]*중복으로 `close_agent`하지 않는다/);
});

test("harness logging lifecycle remains scoped to harness-owned agents", async () => {
  const loggingContract = await read(loggingContractUrl);
  assert.match(loggingContract, /하네스가 직접 생성한 역할과 subagent에만 적용/);
  assert.match(loggingContract, /Workflow Engine이나 다른 스킬의 runtime 계약[\s\S]{0,40}사용하지 않는다/);
  assert.match(loggingContract, /하네스가 직접 발급받은 각 subagent ID에 `close_agent`/);
  assert.match(loggingContract, /다른 스킬이 직접 생성한 ID[\s\S]{0,100}중복으로 닫지 않는다/);
});
