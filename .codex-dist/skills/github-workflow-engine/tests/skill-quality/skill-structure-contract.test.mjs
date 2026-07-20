import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";

const skillPath = fileURLToPath(new URL("../../SKILL.md", import.meta.url));

function descriptionFrom(source) {
  const frontmatter = source.match(/^---\n([\s\S]*?)\n---/);
  assert.notEqual(frontmatter, null, "SKILL.md frontmatter is missing");
  const description = frontmatter[1].match(/^description:\s*(.+)$/m);
  assert.notEqual(description, null, "description is missing");
  return description[1].trim().replace(/^['"]|['"]$/g, "");
}

test("skill metadata states what, when, and independent-task scope", async () => {
  const description = descriptionFrom(await readFile(skillPath, "utf8"));
  assert.ok(Array.from(description).length < 1024);
  assert.doesNotMatch(description, /[<>]/);
  // WHAT: 이슈·PR 워크플로 작업을 계산하고 조율한다.
  assert.match(description, /GitHub 이슈와 PR[\s\S]*워크플로[\s\S]*계산[\s\S]*조율/);
  // WHEN/SCOPE: 기존 흐름의 시작 또는 재개를 요청할 때 사용한다.
  assert.match(description, /기존[\s\S]*흐름[\s\S]*(시작|재개)[\s\S]*요청할 때 사용/);
  // SCOPE: 단일 코드 수정·단순 리뷰·커밋 메시지 요청을 독립 작업 흐름으로 식별한다.
  assert.match(description, /단일 코드 수정[\s\S]*단순 리뷰[\s\S]*커밋 메시지/);
  assert.match(description, /독립 작업 흐름/);
});

test("SKILL stays concise and explains bundled resource roles", async () => {
  const source = await readFile(skillPath, "utf8");
  assert.ok(source.split("\n").length < 500);
  assert.match(source, /`definitions\/\*\.json`[\s\S]{0,150}(전이 조건|전이)[\s\S]{0,100}데이터/);
  assert.match(source, /`scripts\/workflow-definition\/\*\.mjs`[\s\S]{0,150}(정의 검증|상태 정규화|작업 계산)[\s\S]{0,100}실행 코드/);
  assert.match(source, /`references\/\*\.md`[\s\S]{0,150}(조건|필요)[\s\S]{0,100}참조문서/);
  assert.match(source, /작업 전이의 단일 기준[\s\S]{0,180}`definitions\/\*\.json`[\s\S]{0,180}`scripts\/workflow-definition\/evaluator\.mjs`/);
});

test("scope examples cover workflow-engine and independent-task requests", async () => {
  const source = await readFile(skillPath, "utf8");
  const examples = source.match(/## 사용 범위 예시[\s\S]*?(?=\n## |$)/)?.[0] ?? "";
  assert.match(examples, /워크플로우 흐름|계속 진행|다음 피드백|머지했습니다/);
  assert.match(examples, /단일 코드 수정|단순 리뷰|커밋 메시지/);
  assert.match(examples, /독립 작업 흐름/);
});

test("conditional contracts are linked directly from SKILL", async () => {
  const source = await readFile(skillPath, "utf8");
  assert.match(source, /사용자가 현재 요청에서 검증 모드를 명시했을 때만 `references\/validation-mode-contract\.md`/);
  assert.match(source, /이 스킬이 서브에이전트를 직접 생성하거나 하위 실행 주체의 정리 근거를 검증할 때 `references\/agent-lifecycle-contract\.md`/);
});

test("declarative task computation procedure describes the single ordered path", async () => {
  const source = await readFile(skillPath, "utf8");
  assert.match(source, /^## 선언형 작업 계산 절차$/m);
  // 번호 단계가 순서대로 존재한다.
  assert.match(source, /## 선언형 작업 계산 절차[\s\S]*?\n1\. [\s\S]*?\n2\. [\s\S]*?\n3\. [\s\S]*?\n7\. /);
  // 관측 → 정규화 → evaluateWorkflowDefinition → currentTaskActionId → 완료 뒤 재관측이라는 의미 흐름을 따른다.
  assert.match(
    source,
    /## 선언형 작업 계산 절차[\s\S]*정규화[\s\S]*evaluateWorkflowDefinition[\s\S]*currentTaskActionId[\s\S]*완료[\s\S]*다시 관측/,
  );
  // 실행 성공 후 상태를 다시 관측해 같은 절차를 반복한다.
  assert.match(source, /구조화 실행 성공[\s\S]*?상태를 다시 관측[\s\S]*?선언형 작업 계산 절차를 반복/);
});
