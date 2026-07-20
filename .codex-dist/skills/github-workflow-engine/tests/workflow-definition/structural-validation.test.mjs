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
  return errors.some((error) => error.code === code && (path === undefined || error.path === path));
}

async function validDefinition() {
  const fixture = await readFixture("structural-valid.json");
  return structuredClone(fixture.cases[0].definition);
}

test("parses workflow definition fixtures and exposes structured parse errors", async () => {
  assert.equal(Array.isArray((await readFixture("structural-valid.json")).cases), true);
  assert.equal(Array.isArray((await readFixture("structural-invalid.json")).cases), true);

  const malformed = parseJson("{");
  assert.deepEqual(Object.keys(malformed.error).sort(), ["code", "message", "path"]);
  assert.equal(malformed.ok, false);
  assert.equal(malformed.error.code, "parse.invalid_json");
});

test("accepts the minimal closed workflow definition contract", async () => {
  const definition = await validDefinition();
  const result = validateWorkflowDefinition(definition);
  assert.equal(result.valid, true, JSON.stringify(result.errors));
  assert.deepEqual(Object.keys(definition), ["workflow_id", "entry_task_action_id", "facts", "transitions"]);
  assert.deepEqual(Object.keys(definition.transitions[0]), [
    "task_action_id",
    "normalized_fact_conditions",
    "user_decision_options",
    "completion_predicate",
    "executor_reference",
    "next_transition_rules",
  ]);
});

test("workflow_id is the closed identity and drives task action prefixes", async () => {
  const cases = [
    ["feature-proposal", "FP"],
    ["policy-review", "PR"],
    ["feature-change", "FC"],
    ["feature-fix", "FF"],
    ["implementation", "FI"],
  ];
  for (const [workflowId, prefix] of cases) {
    const definition = await validDefinition();
    definition.workflow_id = workflowId;
    definition.entry_task_action_id = `${prefix}-1`;
    definition.transitions.forEach((transition, index) => {
      transition.task_action_id = `${prefix}-${index + 1}`;
      for (const rule of transition.next_transition_rules) rule.task_action_id = `${prefix}-${index + 2}`;
    });
    const result = validateWorkflowDefinition(definition);
    assert.equal(result.valid, true, `${workflowId}: ${JSON.stringify(result.errors)}`);
  }

  const unsupported = await validDefinition();
  unsupported.workflow_id = "custom";
  assert.equal(hasError(validateWorkflowDefinition(unsupported).errors, "workflow_id.unsupported", "/workflow_id"), true);

  const mismatch = await validDefinition();
  mismatch.transitions[0].task_action_id = "FF-1";
  assert.equal(hasError(validateWorkflowDefinition(mismatch).errors, "task_action_id.prefix_mismatch", "/transitions/0/task_action_id"), true);
});

test("fact domains infer homogeneous boolean string and integer scalar types", async () => {
  const definition = await validDefinition();
  assert.equal(validateWorkflowDefinition(definition).valid, true);

  for (const [domain, code] of [
    [[], "fact.allowed_values.empty"],
    [[true, "true"], "fact.allowed_values.type_mismatch"],
    [[1, 1.5], "fact.allowed_values.type_mismatch"],
    [[{}], "fact.allowed_values.scalar"],
  ]) {
    const invalid = await validDefinition();
    invalid.facts.issue_open = domain;
    assert.equal(hasError(validateWorkflowDefinition(invalid).errors, code), true, code);
  }
});

test("rejects every removed root fact transition and decision field", async () => {
  for (const field of ["version", "workflow_kind", "target_type", "entry_transition_id", "terminal_transition_ids", "normalized_fact_schema"]) {
    const definition = await validDefinition();
    definition[field] = field === "terminal_transition_ids" || field === "normalized_fact_schema" ? [] : "legacy";
    assert.equal(hasError(validateWorkflowDefinition(definition).errors, "object.additional_property", `/${field}`), true, field);
  }

  const legacyFact = await validDefinition();
  legacyFact.facts.issue_open = { value_type: "boolean", allowed_values: [true, false], evidence_required: true };
  assert.equal(hasError(validateWorkflowDefinition(legacyFact).errors, "fact.allowed_values.type", "/facts/issue_open"), true);

  for (const field of ["transition_id", "user_decision_specification"]) {
    const definition = await validDefinition();
    definition.transitions[0][field] = {};
    assert.equal(hasError(validateWorkflowDefinition(definition).errors, "object.additional_property", `/transitions/0/${field}`), true, field);
  }

  const legacyDecision = await validDefinition();
  legacyDecision.transitions[0].user_decision_options = {
    required: true,
    options: [],
    allow_free_form: true,
    block_execution_until_confirmed: true,
  };
  assert.equal(hasError(validateWorkflowDefinition(legacyDecision).errors, "user_decision_options.type", "/transitions/0/user_decision_options"), true);
});

test("rejects removed expression operators and not expressions", async () => {
  for (const expression of [
    { fact_id: "issue_open", operator: "not_equals", value: false },
    { fact_id: "review_state", operator: "not_in", value: ["approved"] },
    { not: { fact_id: "issue_open", operator: "equals", value: false } },
  ]) {
    const definition = await validDefinition();
    definition.transitions[0].completion_predicate = expression;
    const errors = validateWorkflowDefinition(definition).errors;
    assert.equal(errors.some((error) => error.code === "expression.operator.invalid" || error.code === "expression.form"), true);
  }
});

test("requires direct executor_reference and accepts string or explicit null", async () => {
  const definition = await validDefinition();
  definition.transitions[0].executor_reference = "not-installed-yet";
  definition.transitions[1].executor_reference = null;
  assert.equal(validateWorkflowDefinition(definition).valid, true);

  delete definition.transitions[0].executor_reference;
  assert.equal(hasError(validateWorkflowDefinition(definition).errors, "transition.required", "/transitions/0/executor_reference"), true);
});

test("reports malformed definitions deterministically", async () => {
  const fixture = await readFixture("structural-invalid.json");
  const first = validateWorkflowDefinition(fixture.cases[0].definition);
  const second = validateWorkflowDefinition(fixture.cases[0].definition);
  assert.equal(first.valid, false);
  assert.deepEqual(first.errors, second.errors);
  assert.equal(hasError(first.errors, "priority.forbidden", "/priority"), true);
  assert.equal(hasError(first.errors, "fact.allowed_values.type_mismatch", "/facts/state/1"), true);
  assert.equal(hasError(first.errors, "decision_id.duplicate", "/transitions/0/user_decision_options/1/decision_id"), true);
  assert.equal(hasError(first.errors, "task_action_id.invalid", "/transitions/0/task_action_id"), true);
});
