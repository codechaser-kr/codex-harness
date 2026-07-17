import assert from "node:assert/strict";
import test from "node:test";

import { parseJson, parseJsonFile } from "../../scripts/workflow-definition/parser.mjs";
import { validateWorkflowDefinition } from "../../scripts/workflow-definition/validator.mjs";

const fixtures = new URL("./fixtures/", import.meta.url);

async function readFixture(name) {
  const result = await parseJsonFile(new URL(name, fixtures));
  assert.equal(result.ok, true, result.ok ? "" : result.error.message);
  return result.value;
}

function hasError(errors, code, path) {
  return errors.some((error) => error.code === code && error.path === path);
}

test("parses workflow definition fixtures and exposes structured parse errors", async () => {
  const valid = await readFixture("structural-valid.json");
  const invalid = await readFixture("structural-invalid.json");
  assert.equal(Array.isArray(valid.cases), true);
  assert.equal(Array.isArray(invalid.cases), true);

  const malformed = parseJson("{");
  assert.deepEqual(Object.keys(malformed.error).sort(), ["code", "message", "path"]);
  assert.equal(malformed.ok, false);
  assert.equal(malformed.error.code, "parse.invalid_json");
  assert.equal(malformed.error.path, "");
});

test("accepts a valid workflow definition", async () => {
  const fixture = await readFixture("structural-valid.json");
  const result = validateWorkflowDefinition(fixture.cases[0].definition);
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test("accepts every workflow_kind task_action_id prefix", async () => {
  const fixture = await readFixture("structural-valid.json");
  const prefixCases = [
    ["feature_proposal", "A"],
    ["policy_review", "B"],
    ["feature_change", "C"],
    ["feature_fix", "D"],
    ["implementation", "E"],
  ];

  for (const [workflowKind, prefix] of prefixCases) {
    const definition = structuredClone(fixture.cases[0].definition);
    definition.workflow_kind = workflowKind;
    definition.transitions[0].task_action_id = `${prefix}-1`;
    definition.transitions[1].task_action_id = `${prefix}-2`;

    const result = validateWorkflowDefinition(definition);
    assert.equal(result.valid, true, `${workflowKind} should accept ${prefix}-1 and ${prefix}-2`);
    assert.deepEqual(result.errors, []);
  }
});

test("rejects zero and leading-zero task action numbers", async () => {
  const fixture = await readFixture("structural-valid.json");

  for (const actionId of ["A-0", "A-01"]) {
    const definition = structuredClone(fixture.cases[0].definition);
    definition.workflow_kind = "feature_proposal";
    definition.transitions[0].task_action_id = actionId;
    definition.transitions[1].task_action_id = "A-2";

    const result = validateWorkflowDefinition(definition);
    assert.equal(result.valid, false);
    assert.equal(hasError(result.errors, "task_action_id.invalid", "/transitions/0/task_action_id"), true);
  }
});

test("reports C2 fact, action, decision, AST, registry, and priority failures deterministically", async () => {
  const fixture = await readFixture("structural-invalid.json");
  const definition = fixture.cases[0].definition;
  const first = validateWorkflowDefinition(definition);
  const second = validateWorkflowDefinition(definition);

  assert.equal(first.valid, false);
  assert.deepEqual(first.errors, second.errors);
  assert.equal(hasError(first.errors, "priority.forbidden", "/priority"), true);
  assert.equal(hasError(first.errors, "fact_id.duplicate", "/normalized_fact_schema/1/fact_id"), true);
  assert.equal(hasError(first.errors, "expression.fact.unknown", "/transitions/0/normalized_fact_conditions/fact_id"), true);
  assert.equal(hasError(first.errors, "expression.value.not_allowed", "/transitions/0/completion_predicate/value"), true);
  assert.equal(hasError(first.errors, "decision_id.duplicate", "/transitions/0/user_decision_specification/options/1/decision_id"), true);
  assert.equal(hasError(first.errors, "registered_executor_reference.unknown", "/transitions/0/registered_executor_reference"), true);
  assert.equal(hasError(first.errors, "task_action_id.duplicate", "/transitions/1/task_action_id"), true);
  assert.equal(hasError(first.errors, "expression.value.type_mismatch", "/transitions/1/normalized_fact_conditions/value/1"), true);
  assert.equal(hasError(first.errors, "expression.value.forbidden", "/transitions/1/completion_predicate/value"), true);

  const valid = await readFixture("structural-valid.json");
  const prefixMismatch = structuredClone(valid.cases[0].definition);
  prefixMismatch.transitions[0].task_action_id = "D-1";
  const prefixResult = validateWorkflowDefinition(prefixMismatch);
  assert.equal(hasError(prefixResult.errors, "task_action_id.prefix_mismatch", "/transitions/0/task_action_id"), true);
});

test("reports C1 structural errors without adding C3 graph validation", async () => {
  const fixture = await readFixture("structural-invalid.json");
  const structural = validateWorkflowDefinition(fixture.cases[1].definition);

  assert.equal(hasError(structural.errors, "workflow_id.invalid", "/workflow_id"), true);
  assert.equal(hasError(structural.errors, "terminal_transition_ids.empty", "/terminal_transition_ids"), true);
  assert.equal(hasError(structural.errors, "transition_id.invalid", "/transitions/0/transition_id"), true);
  assert.equal(hasError(structural.errors, "task_action_id.invalid", "/transitions/0/task_action_id"), true);
  assert.equal(hasError(structural.errors, "expression.empty", "/transitions/0/normalized_fact_conditions/all"), true);
  assert.equal(hasError(structural.errors, "priority.forbidden", "/transitions/0/priority"), true);

  const valid = await readFixture("structural-valid.json");
  const c3Only = structuredClone(valid.cases[0].definition);
  c3Only.entry_transition_id = "missing-entry";
  c3Only.terminal_transition_ids = ["missing-terminal"];
  c3Only.transitions[0].next_transition = "missing-next";
  c3Only.transitions[1].transition_id = c3Only.transitions[0].transition_id;

  const c3Result = validateWorkflowDefinition(c3Only);
  assert.equal(c3Result.valid, true);
  assert.deepEqual(c3Result.errors, []);
});
