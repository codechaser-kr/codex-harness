import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { evaluateWorkflowDefinition } from "../../scripts/workflow-definition/evaluator.mjs";
import { parseJsonFile } from "../../scripts/workflow-definition/parser.mjs";
import { validateWorkflowDefinition } from "../../scripts/workflow-definition/validator.mjs";

const definitionUrl = new URL("../../definitions/feature-proposal.json", import.meta.url);
const registryUrl = new URL("../../registries/registered-executors.json", import.meta.url);
const schemaUrl = new URL("../../schemas/workflow-definition.schema.json", import.meta.url);
const statesUrl = new URL("./fixtures/feature-proposal-states.json", import.meta.url);

async function readJson(url) {
  const result = await parseJsonFile(url);
  assert.equal(result.ok, true, result.ok ? "" : result.error.message);
  return result.value;
}

test("feature-proposal definition parses and passes structural and semantic validation", async () => {
  const [definition, registry, states] = await Promise.all([readJson(definitionUrl), readJson(registryUrl), readJson(statesUrl)]);
  const schema = JSON.parse(await readFile(schemaUrl, "utf8"));

  assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema");
  assert.equal(Object.keys(states).length, 10);
  for (const executorId of ["issue-creation", "feature-proposal-triage"]) {
    const executor = registry.find((entry) => entry.executor_id === executorId);
    assert.equal(executor?.side_effect_scope, "proposal_output", executorId);
  }
  const validation = validateWorkflowDefinition(definition);
  assert.equal(validation.valid, true, JSON.stringify(validation.errors));
  assert.deepEqual(validation.errors, []);
});

test("feature-proposal evaluation returns the required action for each representative state without side effects", async () => {
  const [definition, states] = await Promise.all([readJson(definitionUrl), readJson(statesUrl)]);
  const definitionBefore = structuredClone(definition);
  const cases = [
    ["new_request", "FP-1", "issue-creation"],
    ["confirmed_draft", "FP-2", "github-simple-executor"],
    ["created_issue", "FP-3", "feature-proposal-triage"],
    ["direction_confirmed_not_reflected", "FP-4", "github-simple-executor"],
    ["policy_review_direction", "FP-6", "github-simple-executor"],
    ["feature_change_direction", "FP-7", "github-simple-executor"],
    ["do_not_proceed_direction", "FP-5", "github-simple-executor"],
  ];

  for (const [name, taskActionId, executorReference] of cases) {
    const state = structuredClone(states[name]);
    const stateBefore = structuredClone(state);
    const result = evaluateWorkflowDefinition(definition, state);

    assert.equal(result.status, "action_required", name);
    assert.equal(result.task_action_id, taskActionId, name);
    assert.equal(result.registered_executor_reference, executorReference, name);
    assert.deepEqual(state, stateBefore, name);
  }
  assert.deepEqual(definition, definitionBefore);
});

test("feature-proposal evaluation completes every terminal outcome", async () => {
  const [definition, states] = await Promise.all([readJson(definitionUrl), readJson(statesUrl)]);
  for (const name of ["completed_do_not_proceed", "completed_policy_review", "completed_feature_change"]) {
    const result = evaluateWorkflowDefinition(definition, states[name]);
    assert.deepEqual(result, { status: "completed", transition_id: "complete-feature-proposal" }, name);
  }
});
