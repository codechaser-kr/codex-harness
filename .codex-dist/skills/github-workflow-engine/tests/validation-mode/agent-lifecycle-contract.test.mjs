import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const engineSkillUrl = new URL("../../SKILL.md", import.meta.url);
const structuredContractUrl = new URL("../../references/structured-execution-contract.md", import.meta.url);
const targetHarnessContractUrl = new URL("../../references/target-harness-execution-contract.md", import.meta.url);
const validationContractUrl = new URL("../../references/validation-mode-contract.md", import.meta.url);
const lifecycleContractUrl = new URL("../../references/agent-lifecycle-contract.md", import.meta.url);
const workflowEditorUrl = new URL("../../../workflow-code-editor/SKILL.md", import.meta.url);
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
  const [engineSkill, workflowEditor, structuredContract] = await Promise.all([
    read(engineSkillUrl),
    read(workflowEditorUrl),
    read(structuredContractUrl),
  ]);

  for (const source of [engineSkill, workflowEditor, structuredContract]) {
    assert.doesNotMatch(source, /(?:harness\/references\/)?logging-contract\.md/);
  }
});

test("each runtime owner closes only agent IDs it issued directly", async () => {
  const [engineSkill, lifecycleContract, workflowEditor, designDocument] = await Promise.all([
    read(engineSkillUrl),
    read(lifecycleContractUrl),
    read(workflowEditorUrl),
    read(designDocumentUrl),
  ]);

  for (const source of [lifecycleContract, workflowEditor, designDocument]) {
    assert.match(source, /(?:결과|raw result|raw 결과)[\s\S]{0,500}(?:보존|기록)[\s\S]{0,500}close_agent/);
    assert.match(source, /직접[^\n]{0,120}발급받은[^\n]{0,120}ID/);
  }

  assert.match(engineSkill, /agent-lifecycle-contract\.md/);
  assert.match(lifecycleContract, /같은 세션에서[\s\S]{0,150}단순 스킬 호출[\s\S]{0,150}관리\s*대상이 아니다/);
  assert.match(lifecycleContract, /부모는[\s\S]{0,180}(?:하위|child) ID[\s\S]{0,180}중복으로 `close_agent`하지 않는다/);
  assert.match(workflowEditor, /직접 발급받으면[\s\S]{0,240}발급받은 모든 ID[\s\S]{0,80}`close_agent`/);
  assert.match(workflowEditor, /Harness 또는 그 하위 역할[\s\S]{0,180}중복으로 닫지 않고/);
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

test("workflow editor closes only sessions it actually issues", async () => {
  const workflowEditor = await read(workflowEditorUrl);
  assert.match(workflowEditor, /같은 세션의 일반 코드 변경은 새 실행 리소스가 아니므로 별도 정리하지 않는다/);
  assert.match(workflowEditor, /execution 또는 validation session ID를 직접 발급받으면[\s\S]*결과·오류·timeout[\s\S]*close_agent/);
  assert.match(workflowEditor, /성공·실패·중단과 무관하게/);
  assert.match(workflowEditor, /Harness 또는 그 하위 역할이 직접 생성한 child ID[\s\S]*중복으로 닫지 않고/);
});

test("workflow editor returns cleanup evidence through existing result fields", async () => {
  const [workflowEditor, lifecycleContract, targetHarnessContract] = await Promise.all([
    read(workflowEditorUrl),
    read(lifecycleContractUrl),
    read(targetHarnessContractUrl),
  ]);

  for (const source of [workflowEditor, lifecycleContract]) {
    assert.match(source, /(?:정리 시도와 결과|정리 결과)[\s\S]{0,220}verification_results|verification_results[\s\S]{0,220}(?:정리 시도와 결과|정리 결과)/);
    assert.match(source, /정리 실패[\s\S]{0,180}residual_risks_or_failure_reasons|residual_risks_or_failure_reasons[\s\S]{0,180}정리 실패/);
  }
  assert.match(workflowEditor, /새 cleanup 필드[\s\S]{0,80}(?:schema|필드)/);
  assert.match(lifecycleContract, /새 정리용 필드, 스키마 또는 등록부를 만들지 않는다/);
  assert.match(targetHarnessContract, /^## 결과 수용과 정규화$/m);
  assert.match(targetHarnessContract, /Harness가 하위 session을 직접 생성했다면 Harness가 그 ID를 소유하고 정리한다/);
  assert.match(targetHarnessContract, /child ID를 중복으로 닫지 않는다/);
});

test("harness logging lifecycle remains scoped to harness-owned agents", async () => {
  const loggingContract = await read(loggingContractUrl);
  assert.match(loggingContract, /하네스가 직접 생성한 역할과 subagent에만 적용/);
  assert.match(loggingContract, /Workflow Engine이나 다른 스킬의 runtime 계약[\s\S]{0,40}사용하지 않는다/);
  assert.match(loggingContract, /하네스가 직접 발급받은 각 subagent ID에 `close_agent`/);
  assert.match(loggingContract, /다른 스킬이 직접 생성한 ID[\s\S]{0,100}중복으로 닫지 않는다/);
});
