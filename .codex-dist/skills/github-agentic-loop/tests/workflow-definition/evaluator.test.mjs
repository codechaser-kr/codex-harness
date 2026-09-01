import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { runWorkflowDefinitionCli } from "../../scripts/workflow-definition/cli.mjs";
import { evaluateWorkflowDefinition } from "../../scripts/workflow-definition/evaluator.mjs";
import { parseJsonFile } from "../../scripts/workflow-definition/parser.mjs";
import { validateWorkflowDefinition } from "../../scripts/workflow-definition/validator.mjs";

const fixtures = new URL("./fixtures/", import.meta.url);
const cliPath = fileURLToPath(new URL("../../scripts/workflow-definition/cli.mjs", import.meta.url));

async function readCases() {
  const result = await parseJsonFile(new URL("evaluation-cases.json", fixtures));
  assert.equal(result.ok, true, result.ok ? "" : result.error.message);
  return result.value;
}

function hasError(result, code, path) {
  return result.errors.some((error) => error.code === code && error.path === path);
}

function runCliProcess(argumentsList, cwd) {
  return spawnSync(process.execPath, [cliPath, ...argumentsList], {
    cwd,
    encoding: "utf8",
    timeout: 5_000,
  });
}

function parseSingleJsonLine(result) {
  assert.equal(result.stderr, "");
  assert.equal(result.stdout.endsWith("\n"), true);
  const document = result.stdout.slice(0, -1);
  assert.equal(document.includes("\n"), false);
  const parsed = JSON.parse(document);
  assert.equal(JSON.stringify(parsed), document);
  return parsed;
}

test("evaluation fixtures are valid C2/C3 definitions", async () => {
  const fixture = await readCases();
  for (const [name, definition] of Object.entries(fixture.definitions)) {
    const result = validateWorkflowDefinition(definition);
    assert.equal(result.valid, true, `${name}: ${JSON.stringify(result.errors)}`);
  }
});

test("returns action_required from the entry task action and does not mutate inputs", async () => {
  const fixture = await readCases();
  const definition = structuredClone(fixture.definitions.entry_action_required);
  const state = structuredClone(fixture.states.ready);
  const definitionBefore = structuredClone(definition);
  const stateBefore = structuredClone(state);

  const first = evaluateWorkflowDefinition(definition, state);
  const second = evaluateWorkflowDefinition(definition, state);

  assert.equal(first.status, "action_required");
  assert.equal(first.task_action_id, "FI-1");
  assert.equal(Object.hasOwn(first, "transition_id"), false);
  assert.deepEqual(first, second);
  assert.deepEqual(definition, definitionBefore);
  assert.deepEqual(state, stateBefore);
});

test("selects exactly one true or false conditional next action", async () => {
  const fixture = await readCases();
  const definition = fixture.definitions.conditional_next;

  const review = evaluateWorkflowDefinition(definition, fixture.states.review_needed);
  assert.equal(review.status, "action_required");
  assert.equal(review.task_action_id, "FI-2");

  const complete = evaluateWorkflowDefinition(definition, fixture.states.complete_needed);
  assert.equal(complete.status, "action_required");
  assert.equal(complete.task_action_id, "FI-3");
});

test("completes terminal actions and resumes only by task_action_id", async () => {
  const fixture = await readCases();

  const completed = evaluateWorkflowDefinition(fixture.definitions.terminal_completed, fixture.states.done);
  assert.deepEqual(completed, { status: "completed", task_action_id: "FI-1" });

  const incompleteTerminal = structuredClone(fixture.definitions.terminal_completed);
  incompleteTerminal.facts.done = [true, false];
  incompleteTerminal.transitions[0].normalized_fact_conditions = {
    fact_id: "done",
    operator: "exists"
  };
  const actionRequired = evaluateWorkflowDefinition(incompleteTerminal, { done: false });
  assert.equal(actionRequired.status, "action_required");
  assert.equal(actionRequired.task_action_id, "FI-1");

  const conditionNotMet = evaluateWorkflowDefinition(
    fixture.definitions.entry_action_required,
    fixture.states.not_ready,
    { currentTaskActionId: "FI-1" },
  );
  assert.equal(conditionNotMet.status, "stopped");
  assert.equal(conditionNotMet.reason, "current_task_action_condition_not_met");
  assert.equal(conditionNotMet.task_action_id, "FI-1");
});

test("rejects an unsatisfiable terminal completion predicate before action_required", async () => {
  const fixture = await readCases();
  const satisfiable = validateWorkflowDefinition(fixture.definitions.terminal_completed);
  assert.equal(satisfiable.valid, true);

  const definition = structuredClone(fixture.definitions.terminal_completed);
  definition.facts.done = [true, false];
  definition.transitions[0].completion_predicate = {
    all: [
      { fact_id: "done", operator: "equals", value: true },
      { fact_id: "done", operator: "equals", value: false },
    ],
  };

  const result = evaluateWorkflowDefinition(definition, fixture.states.done);
  assert.equal(result.status, "stopped");
  assert.equal(result.reason, "invalid_definition");
  assert.equal(hasError(result, "completion_predicate.unsatisfiable", "/transitions/0/completion_predicate"), true);
});

test("defends against zero and multiple matches caused by missing facts", async () => {
  const fixture = await readCases();

  const zeroMatch = evaluateWorkflowDefinition(fixture.definitions.missing_zero_match, fixture.states.missing);
  assert.equal(zeroMatch.status, "stopped");
  assert.equal(zeroMatch.reason, "no_transition_match");
  assert.equal(zeroMatch.task_action_id, "FI-1");

  const multipleMatch = evaluateWorkflowDefinition(fixture.definitions.missing_multiple_match, fixture.states.missing);
  assert.equal(multipleMatch.status, "stopped");
  assert.equal(multipleMatch.reason, "multiple_transition_matches");
  assert.equal(multipleMatch.task_action_id, "FI-1");
});

test("detects fixed-state cycles and returns structured definition and state errors", async () => {
  const fixture = await readCases();
  const cycle = evaluateWorkflowDefinition(fixture.definitions.fixed_state_cycle, fixture.states.cycle);
  assert.equal(cycle.status, "stopped");
  assert.equal(cycle.reason, "evaluation_cycle");
  assert.equal(cycle.task_action_id, "FI-2");

  const invalidDefinition = structuredClone(fixture.definitions.entry_action_required);
  invalidDefinition.transitions[0].task_action_id = "FI-0";
  const invalidDefinitionResult = evaluateWorkflowDefinition(invalidDefinition, fixture.states.ready);
  assert.equal(invalidDefinitionResult.status, "stopped");
  assert.equal(invalidDefinitionResult.reason, "invalid_definition");
  assert.equal(invalidDefinitionResult.task_action_id, null);
  assert.deepEqual(Object.keys(invalidDefinitionResult).sort(), ["errors", "reason", "status", "task_action_id"]);
  assert.equal(hasError(invalidDefinitionResult, "task_action_id.invalid", "/transitions/0/task_action_id"), true);

  const unknownFact = evaluateWorkflowDefinition(fixture.definitions.entry_action_required, fixture.states.unknown_fact);
  assert.equal(unknownFact.reason, "invalid_state");
  assert.equal(unknownFact.task_action_id, null);
  assert.deepEqual(Object.keys(unknownFact).sort(), ["errors", "reason", "status", "task_action_id"]);
  assert.equal(hasError(unknownFact, "state.fact.unknown", "/unknown"), true);

  const wrongType = evaluateWorkflowDefinition(fixture.definitions.entry_action_required, fixture.states.wrong_type);
  assert.equal(wrongType.reason, "invalid_state");
  assert.equal(hasError(wrongType, "state.value.type_mismatch", "/ready"), true);

  const outsideDomain = evaluateWorkflowDefinition(fixture.definitions.terminal_completed, fixture.states.outside_domain);
  assert.equal(outsideDomain.reason, "invalid_state");
  assert.equal(hasError(outsideDomain, "state.value.not_allowed", "/done"), true);
});

test("CLI returns JSON-serializable results and specified exit codes", async (t) => {
  const fixture = await readCases();
  const directory = await mkdtemp(`${tmpdir()}/workflow-definition-cli-`);
  t.after(() => rm(directory, { recursive: true, force: true }));
  const definitionPath = `${directory}/definition.json`;
  const statePath = `${directory}/state.json`;
  const cyclePath = `${directory}/cycle.json`;
  const leadingDefinitionPath = `${directory}/--definition.json`;
  const leadingStatePath = `${directory}/--state.json`;
  await writeFile(definitionPath, JSON.stringify(fixture.definitions.terminal_completed));
  await writeFile(statePath, JSON.stringify(fixture.states.done));
  await writeFile(cyclePath, JSON.stringify(fixture.definitions.fixed_state_cycle));
  await writeFile(leadingDefinitionPath, JSON.stringify(fixture.definitions.terminal_completed));
  await writeFile(leadingStatePath, JSON.stringify(fixture.states.done));

  const validate = await runWorkflowDefinitionCli(["validate", "--definition", definitionPath]);
  assert.equal(validate.exitCode, 0);
  assert.deepEqual(JSON.parse(JSON.stringify(validate.result)), { status: "valid", errors: [] });

  const evaluate = await runWorkflowDefinitionCli(["evaluate", "--definition", definitionPath, "--state", statePath]);
  assert.equal(evaluate.exitCode, 0);
  assert.equal(JSON.parse(JSON.stringify(evaluate.result)).status, "completed");

  await writeFile(statePath, JSON.stringify(fixture.states.cycle));
  const stopped = await runWorkflowDefinitionCli(["evaluate", "--definition", cyclePath, "--state", statePath]);
  assert.equal(stopped.exitCode, 1);
  assert.equal(JSON.parse(JSON.stringify(stopped.result)).reason, "evaluation_cycle");

  const usage = await runWorkflowDefinitionCli(["validate"]);
  assert.equal(usage.exitCode, 2);
  assert.equal(JSON.parse(JSON.stringify(usage.result)).reason, "usage_error");

  const emptyValueArguments = [
    ["validate", "--definition", ""],
    ["evaluate", "--definition", definitionPath, "--state", ""],
    ["evaluate", "--definition", definitionPath, "--state", statePath, "--current-task-action-id", ""],
  ];
  for (const argumentsList of emptyValueArguments) {
    const response = await runWorkflowDefinitionCli(argumentsList);
    assert.equal(response.exitCode, 2);
    assert.equal(response.result.reason, "usage_error");
    assert.equal(hasError(response.result, "cli.usage", ""), true);
  }

  for (const argumentsList of [
    ["validate", "--definition", "--state"],
    ["evaluate", "--definition", "--state", "--current-task-action-id"],
  ]) {
    const response = await runWorkflowDefinitionCli(argumentsList);
    assert.equal(response.exitCode, 2);
    assert.equal(response.result.reason, "usage_error");
    assert.equal(hasError(response.result, "cli.usage", ""), true);
  }

  await t.test("actual child process emits one JSON line with documented exit codes", async (childTest) => {
    const validateProcess = runCliProcess(["validate", "--definition", definitionPath]);
    if (validateProcess.error?.code === "EPERM") {
      childTest.skip("The current execution sandbox does not permit nested Node child processes.");
      return;
    }
    assert.equal(validateProcess.error, undefined, validateProcess.error?.message);
    assert.equal(validateProcess.status, 0);
    assert.deepEqual(parseSingleJsonLine(validateProcess), { status: "valid", errors: [] });

    const leadingValidateProcess = runCliProcess(
      ["validate", "--definition", "--definition.json"],
      directory,
    );
    assert.equal(leadingValidateProcess.error, undefined, leadingValidateProcess.error?.message);
    assert.equal(leadingValidateProcess.status, 0);
    assert.deepEqual(parseSingleJsonLine(leadingValidateProcess), { status: "valid", errors: [] });

    await writeFile(statePath, JSON.stringify(fixture.states.done));
    const evaluateProcess = runCliProcess(["evaluate", "--definition", definitionPath, "--state", statePath]);
    assert.equal(evaluateProcess.error, undefined, evaluateProcess.error?.message);
    assert.equal(evaluateProcess.status, 0);
    assert.deepEqual(parseSingleJsonLine(evaluateProcess), { status: "completed", task_action_id: "FI-1" });

    const leadingEvaluateProcess = runCliProcess(
      ["evaluate", "--definition", "--definition.json", "--state", "--state.json"],
      directory,
    );
    assert.equal(leadingEvaluateProcess.error, undefined, leadingEvaluateProcess.error?.message);
    assert.equal(leadingEvaluateProcess.status, 0);
    assert.deepEqual(parseSingleJsonLine(leadingEvaluateProcess), { status: "completed", task_action_id: "FI-1" });

    await writeFile(statePath, JSON.stringify(fixture.states.cycle));
    const stoppedProcess = runCliProcess(["evaluate", "--definition", cyclePath, "--state", statePath]);
    assert.equal(stoppedProcess.error, undefined, stoppedProcess.error?.message);
    assert.equal(stoppedProcess.status, 1);
    assert.equal(parseSingleJsonLine(stoppedProcess).reason, "evaluation_cycle");

    const usageProcess = runCliProcess(["validate"]);
    assert.equal(usageProcess.error, undefined, usageProcess.error?.message);
    assert.equal(usageProcess.status, 2);
    assert.equal(parseSingleJsonLine(usageProcess).reason, "usage_error");

    for (const argumentsList of emptyValueArguments) {
      const emptyValueProcess = runCliProcess(argumentsList);
      assert.equal(emptyValueProcess.error, undefined, emptyValueProcess.error?.message);
      assert.equal(emptyValueProcess.status, 2);
      assert.equal(parseSingleJsonLine(emptyValueProcess).reason, "usage_error");
    }
  });
});
