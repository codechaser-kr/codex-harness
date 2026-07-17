import assert from "node:assert/strict";
import test from "node:test";

import { parseJsonFile } from "../../scripts/workflow-definition/parser.mjs";
import { validateWorkflowDefinition } from "../../scripts/workflow-definition/validator.mjs";

const fixtures = new URL("./fixtures/", import.meta.url);

async function readFixture(name) {
  const result = await parseJsonFile(new URL(name, fixtures));
  assert.equal(result.ok, true, result.ok ? "" : result.error.message);
  return result.value;
}

function applyMutations(definition, mutations) {
  for (const mutation of mutations) {
    if (mutation.op === "append") {
      let target = definition;
      for (const segment of mutation.path) {
        target = target[segment];
      }
      target.push(structuredClone(mutation.value));
      continue;
    }
    let parent = definition;
    for (const segment of mutation.path.slice(0, -1)) {
      parent = parent[segment];
    }
    const key = mutation.path.at(-1);
    if (mutation.op === "set") {
      parent[key] = structuredClone(mutation.value);
    } else {
      throw new Error(`Unsupported fixture mutation: ${mutation.op}`);
    }
  }
  return definition;
}

test("accepts unconditional, conditional, and terminal-escaping cyclic graphs", async () => {
  const fixture = await readFixture("semantic-valid.json");
  for (const scenario of fixture.cases) {
    const result = validateWorkflowDefinition(scenario.definition);
    assert.equal(result.valid, true, `${scenario.name}: ${JSON.stringify(result.errors)}`);
    assert.deepEqual(result.errors, []);
  }
});

test("checks completion predicate satisfiability using only its referenced facts", async () => {
  const fixture = await readFixture("semantic-valid.json");
  const definition = structuredClone(fixture.cases[0].definition);
  definition.normalized_fact_schema.push({
    fact_id: "unrelated",
    value_type: "integer",
    allowed_values: Array.from({ length: 100 }, (_, index) => index),
    evidence_required: false,
  });

  const result = validateWorkflowDefinition(definition, { maxConditionStates: 3 });
  assert.equal(result.valid, true, JSON.stringify(result.errors));
  assert.deepEqual(result.errors, []);
});

test("reports deterministic C3 graph and condition errors", async () => {
  const fixture = await readFixture("semantic-invalid.json");
  for (const scenario of fixture.cases) {
    const definition = applyMutations(structuredClone(fixture.base_definition), scenario.mutations);
    const first = validateWorkflowDefinition(definition, scenario.options);
    const second = validateWorkflowDefinition(definition, scenario.options);

    assert.deepEqual(first.errors, second.errors, `${scenario.name} must be deterministic`);
    assert.equal(first.valid, false, scenario.name);
    const error = first.errors.find((item) => item.code === scenario.expected_code);
    assert.notEqual(error, undefined, `${scenario.name}: ${JSON.stringify(first.errors)}`);
    if (scenario.expected_code === "next_transition_rules.condition_overlap" || scenario.expected_code === "next_transition_rules.condition_gap") {
      assert.equal(typeof error.witness, "object");
      assert.equal(typeof error.message, "string");
    }
    for (const absentCode of scenario.absent_codes ?? []) {
      assert.equal(first.errors.some((item) => item.code === absentCode), false, `${scenario.name}: ${absentCode}`);
    }
  }
});
