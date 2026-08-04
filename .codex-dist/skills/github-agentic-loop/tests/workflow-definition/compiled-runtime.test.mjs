import assert from "node:assert/strict";
import test from "node:test";

import { compileWorkflowDefinition } from "../../scripts/workflow-definition/compiler.mjs";
import { evaluateWorkflowDefinition } from "../../scripts/workflow-definition/evaluator.mjs";
import { normalizeImplementationFacts } from "../../scripts/workflow-definition/implementation-state-adapter.mjs";
import { normalizeFactCandidates } from "../../scripts/workflow-definition/normalized-fact-adapter.mjs";
import { parseJsonFile } from "../../scripts/workflow-definition/parser.mjs";

const definitions = new URL("../../definitions/", import.meta.url);
const fixtures = new URL("./fixtures/", import.meta.url);
const workflowNames = [
  "feature-proposal",
  "policy-review",
  "feature-change",
  "feature-fix",
  "implementation",
];

async function readJson(url) {
  const parsed = await parseJsonFile(url);
  assert.equal(parsed.ok, true, parsed.ok ? "" : parsed.error.message);
  return parsed.value;
}

function evaluationCases(workflowName, fixture) {
  if (workflowName !== "implementation") {
    return Object.entries(fixture).map(([name, state]) => ({ name, state }));
  }
  const cases = [];
  for (const [groupName, group] of Object.entries(fixture)) {
    if (!Array.isArray(group)) continue;
    for (const [index, entry] of group.entries()) {
      if (typeof entry !== "object" || entry === null || Array.isArray(entry)) continue;
      const state = entry.state ?? entry.updates;
      if (typeof state !== "object" || state === null || Array.isArray(state)) continue;
      cases.push({
        name: `${groupName}/${entry.name ?? index}`,
        state,
        currentTaskActionId: entry.current_task_action_id,
      });
    }
  }
  return cases;
}

test("raw and compiled runtime evaluation are exactly equivalent for all shipped workflows", async () => {
  for (const workflowName of workflowNames) {
    const definition = await readJson(new URL(`${workflowName}.json`, definitions));
    const fixture = await readJson(new URL(`${workflowName}-states.json`, fixtures));
    const compilation = compileWorkflowDefinition(definition);
    assert.equal(compilation.status, "compiled", workflowName);

    for (const scenario of evaluationCases(workflowName, fixture)) {
      const options = { currentTaskActionId: scenario.currentTaskActionId };
      const rawResult = evaluateWorkflowDefinition(definition, scenario.state, options);
      const compiledResult = evaluateWorkflowDefinition(
        compilation.compiled_definition,
        scenario.state,
        options,
      );
      assert.deepEqual(compiledResult, rawResult, `${workflowName}: ${scenario.name}`);
    }
  }
});

test("compiled evaluation validates normalized state on every execution", async () => {
  const definition = await readJson(new URL("feature-change.json", definitions));
  const compiled = compileWorkflowDefinition(definition).compiled_definition;

  const unknown = evaluateWorkflowDefinition(compiled, { unknown: true });
  assert.equal(unknown.reason, "invalid_state");
  assert.equal(unknown.errors.some((error) => error.code === "state.fact.unknown"), true);

  const prototypeKey = evaluateWorkflowDefinition(compiled, JSON.parse('{"__proto__":true}'));
  assert.equal(prototypeKey.reason, "invalid_state");
  assert.equal(prototypeKey.errors.some((error) => error.code === "state.fact.unknown"), true);

  const missingAction = evaluateWorkflowDefinition(compiled, {}, { currentTaskActionId: "FC-404" });
  assert.deepEqual(missingAction, {
    status: "stopped",
    reason: "current_task_action_not_found",
    task_action_id: "FC-404",
  });
});

test("fact and workflow adapters accept compiled metadata while rechecking candidates and evidence", async () => {
  const definition = await readJson(new URL("implementation.json", definitions));
  const fixture = await readJson(new URL("implementation-states.json", fixtures));
  const compiled = compileWorkflowDefinition(definition).compiled_definition;
  const observations = Object.entries(fixture.observation_sources).map(
    ([factId, [value, sourceKind, sourceReference]]) => ({
      fact_id: factId,
      value,
      source_kind: sourceKind,
      source_reference: sourceReference,
      field_reference: factId,
    }),
  );

  assert.deepEqual(
    normalizeImplementationFacts(compiled, observations),
    normalizeImplementationFacts(definition, observations),
  );

  const invalid = normalizeFactCandidates(compiled, [{
    fact_id: "implementation_requested",
    value: true,
    evidence: [],
  }]);
  assert.equal(invalid.reason, "invalid_fact_candidates");
  assert.equal(invalid.errors.some((error) => error.code === "candidate.evidence.required"), true);
});

test("runtime rejects a tampered compiled candidate instead of falling back to raw validation", async () => {
  const definition = await readJson(new URL("feature-change.json", definitions));
  const compiled = JSON.parse(JSON.stringify(compileWorkflowDefinition(definition).compiled_definition));
  compiled.transition_lookup.order.reverse();

  const result = evaluateWorkflowDefinition(compiled, {});
  assert.equal(result.status, "stopped");
  assert.equal(result.reason, "invalid_compiled_definition");
  assert.equal(result.errors.some((error) => error.code === "compiled.compiled_digest.mismatch"), true);
});
