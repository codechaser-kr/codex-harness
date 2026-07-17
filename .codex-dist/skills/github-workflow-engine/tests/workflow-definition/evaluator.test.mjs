import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join } from "node:path";
import test from "node:test";

import { runWorkflowDefinitionCli } from "../../scripts/workflow-definition/cli.mjs";
import { evaluateWorkflowDefinition } from "../../scripts/workflow-definition/evaluator.mjs";
import { parseJsonFile } from "../../scripts/workflow-definition/parser.mjs";
import { validateWorkflowDefinition } from "../../scripts/workflow-definition/validator.mjs";

const fixtures = new URL("./fixtures/", import.meta.url);
const cliPath = fileURLToPath(new URL("../../scripts/workflow-definition/cli.mjs", import.meta.url));
const sourceScriptsDirectory = fileURLToPath(new URL("../../scripts/workflow-definition/", import.meta.url));

async function readCases() {
  const result = await parseJsonFile(new URL("evaluation-cases.json", fixtures));
  assert.equal(result.ok, true, result.ok ? "" : result.error.message);
  return result.value;
}

function hasError(result, code, path) {
  return result.errors.some((error) => error.code === code && error.path === path);
}

function runCliProcess(argumentsList) {
  return spawnSync(process.execPath, [cliPath, ...argumentsList], {
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

async function importWorkflowModulesWithoutRegistry(t, registryContent) {
  const directory = await mkdtemp(`${tmpdir()}/workflow-definition-registry-`);
  t.after(() => rm(directory, { recursive: true, force: true }));
  const scriptsDirectory = join(directory, "scripts", "workflow-definition");
  await mkdir(scriptsDirectory, { recursive: true });
  for (const name of ["parser.mjs", "expression.mjs", "validator.mjs", "evaluator.mjs", "cli.mjs"]) {
    await writeFile(join(scriptsDirectory, name), await readFile(join(sourceScriptsDirectory, name)));
  }
  if (registryContent !== undefined) {
    const registriesDirectory = join(directory, "registries");
    await mkdir(registriesDirectory, { recursive: true });
    await writeFile(join(registriesDirectory, "registered-executors.json"), registryContent);
  }
  return {
    cliPath: join(scriptsDirectory, "cli.mjs"),
    cli: await import(pathToFileURL(join(scriptsDirectory, "cli.mjs")).href),
    evaluator: await import(pathToFileURL(join(scriptsDirectory, "evaluator.mjs")).href),
    validator: await import(pathToFileURL(join(scriptsDirectory, "validator.mjs")).href),
  };
}

async function assertRegistryLoadFailure(t, modules, definition, state) {
  const directory = await mkdtemp(`${tmpdir()}/workflow-definition-registry-input-`);
  t.after(() => rm(directory, { recursive: true, force: true }));
  const definitionPath = join(directory, "definition.json");
  const statePath = join(directory, "state.json");
  await writeFile(definitionPath, JSON.stringify(definition));
  await writeFile(statePath, JSON.stringify(state));

  const validation = modules.validator.validateWorkflowDefinition(definition);
  assert.equal(validation.valid, false);
  assert.equal(hasError(validation, "registry.load_failed", ""), true);

  const evaluation = modules.evaluator.evaluateWorkflowDefinition(definition, state);
  assert.equal(evaluation.status, "stopped");
  assert.equal(evaluation.reason, "invalid_definition");
  assert.equal(hasError(evaluation, "registry.load_failed", ""), true);

  const validate = await modules.cli.runWorkflowDefinitionCli(["validate", "--definition", definitionPath]);
  assert.equal(validate.exitCode, 1);
  assert.equal(validate.result.status, "stopped");
  assert.equal(validate.result.reason, "invalid_definition");
  assert.equal(hasError(validate.result, "registry.load_failed", ""), true);

  const evaluate = await modules.cli.runWorkflowDefinitionCli(["evaluate", "--definition", definitionPath, "--state", statePath]);
  assert.equal(evaluate.exitCode, 1);
  assert.equal(evaluate.result.status, "stopped");
  assert.equal(evaluate.result.reason, "invalid_definition");
  assert.equal(hasError(evaluate.result, "registry.load_failed", ""), true);

  return { definitionPath, statePath };
}

test("evaluation fixtures are valid C2/C3 definitions", async () => {
  const fixture = await readCases();
  for (const [name, definition] of Object.entries(fixture.definitions)) {
    const result = validateWorkflowDefinition(definition);
    assert.equal(result.valid, true, `${name}: ${JSON.stringify(result.errors)}`);
  }
});

test("returns action_required from the entry transition and does not mutate inputs", async () => {
  const fixture = await readCases();
  const definition = structuredClone(fixture.definitions.entry_action_required);
  const state = structuredClone(fixture.states.ready);
  const definitionBefore = structuredClone(definition);
  const stateBefore = structuredClone(state);

  const first = evaluateWorkflowDefinition(definition, state);
  const second = evaluateWorkflowDefinition(definition, state);

  assert.equal(first.status, "action_required");
  assert.equal(first.transition_id, "start");
  assert.equal(first.task_action_id, "FI-1");
  assert.deepEqual(first, second);
  assert.deepEqual(definition, definitionBefore);
  assert.deepEqual(state, stateBefore);
});

test("selects exactly one true or false conditional next action", async () => {
  const fixture = await readCases();
  const definition = fixture.definitions.conditional_next;

  const review = evaluateWorkflowDefinition(definition, fixture.states.review_needed);
  assert.equal(review.status, "action_required");
  assert.equal(review.transition_id, "review");
  assert.equal(review.task_action_id, "FI-2");

  const complete = evaluateWorkflowDefinition(definition, fixture.states.complete_needed);
  assert.equal(complete.status, "action_required");
  assert.equal(complete.transition_id, "complete");
  assert.equal(complete.task_action_id, "FI-3");
});

test("completes terminal transitions and stops when the current condition is not met", async () => {
  const fixture = await readCases();

  const completed = evaluateWorkflowDefinition(fixture.definitions.terminal_completed, fixture.states.done);
  assert.deepEqual(completed, { status: "completed", transition_id: "complete" });

  const incompleteTerminal = structuredClone(fixture.definitions.terminal_completed);
  incompleteTerminal.normalized_fact_schema[0].allowed_values = [true, false];
  incompleteTerminal.transitions[0].normalized_fact_conditions = {
    fact_id: "done",
    operator: "exists"
  };
  const actionRequired = evaluateWorkflowDefinition(incompleteTerminal, { done: false });
  assert.equal(actionRequired.status, "action_required");
  assert.equal(actionRequired.transition_id, "complete");

  const conditionNotMet = evaluateWorkflowDefinition(fixture.definitions.entry_action_required, fixture.states.not_ready);
  assert.equal(conditionNotMet.status, "stopped");
  assert.equal(conditionNotMet.reason, "current_transition_condition_not_met");
  assert.equal(conditionNotMet.transition_id, "start");
});

test("rejects an unsatisfiable terminal completion predicate before action_required", async () => {
  const fixture = await readCases();
  const satisfiable = validateWorkflowDefinition(fixture.definitions.terminal_completed);
  assert.equal(satisfiable.valid, true);

  const definition = structuredClone(fixture.definitions.terminal_completed);
  definition.transitions[0].completion_predicate = {
    all: [
      { fact_id: "done", operator: "equals", value: true },
      { not: { fact_id: "done", operator: "equals", value: true } },
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
  assert.equal(zeroMatch.transition_id, "check");

  const multipleMatch = evaluateWorkflowDefinition(fixture.definitions.missing_multiple_match, fixture.states.missing);
  assert.equal(multipleMatch.status, "stopped");
  assert.equal(multipleMatch.reason, "multiple_transition_matches");
  assert.equal(multipleMatch.transition_id, "check");
});

test("detects fixed-state cycles and returns structured definition and state errors", async () => {
  const fixture = await readCases();
  const cycle = evaluateWorkflowDefinition(fixture.definitions.fixed_state_cycle, fixture.states.cycle);
  assert.equal(cycle.status, "stopped");
  assert.equal(cycle.reason, "evaluation_cycle");
  assert.equal(cycle.transition_id, "loop");

  const invalidDefinition = structuredClone(fixture.definitions.entry_action_required);
  invalidDefinition.transitions[0].task_action_id = "FI-0";
  const invalidDefinitionResult = evaluateWorkflowDefinition(invalidDefinition, fixture.states.ready);
  assert.equal(invalidDefinitionResult.status, "stopped");
  assert.equal(invalidDefinitionResult.reason, "invalid_definition");
  assert.equal(hasError(invalidDefinitionResult, "task_action_id.invalid", "/transitions/0/task_action_id"), true);

  const unknownFact = evaluateWorkflowDefinition(fixture.definitions.entry_action_required, fixture.states.unknown_fact);
  assert.equal(unknownFact.reason, "invalid_state");
  assert.equal(hasError(unknownFact, "state.fact.unknown", "/unknown"), true);

  const wrongType = evaluateWorkflowDefinition(fixture.definitions.entry_action_required, fixture.states.wrong_type);
  assert.equal(wrongType.reason, "invalid_state");
  assert.equal(hasError(wrongType, "state.value.type_mismatch", "/ready"), true);

  const outsideDomain = evaluateWorkflowDefinition(fixture.definitions.terminal_completed, fixture.states.outside_domain);
  assert.equal(outsideDomain.reason, "invalid_state");
  assert.equal(hasError(outsideDomain, "state.value.not_allowed", "/done"), true);
});

test("stops validator, evaluator, and CLI when the default registry cannot load", async (t) => {
  const fixture = await readCases();
  const modules = await importWorkflowModulesWithoutRegistry(t);
  const { definitionPath, statePath } = await assertRegistryLoadFailure(
    t,
    modules,
    fixture.definitions.terminal_completed,
    fixture.states.done,
  );

  await t.test("CLI script emits structured registry errors", async (childTest) => {
    for (const argumentsList of [
      ["validate", "--definition", definitionPath],
      ["evaluate", "--definition", definitionPath, "--state", statePath],
    ]) {
      const result = spawnSync(process.execPath, [modules.cliPath, ...argumentsList], {
        encoding: "utf8",
        timeout: 5_000,
      });
      if (result.error?.code === "EPERM") {
        childTest.skip("The current execution sandbox does not permit nested Node child processes.");
        return;
      }
      assert.equal(result.error, undefined, result.error?.message);
      assert.equal(result.status, 1);
      assert.equal(result.stderr, "");
      const output = JSON.parse(result.stdout);
      assert.equal(output.status, "stopped");
      assert.equal(output.reason, "invalid_definition");
      assert.equal(hasError(output, "registry.load_failed", ""), true);
    }
  });
});

test("stops validator, evaluator, and CLI when the default registry is malformed", async (t) => {
  const fixture = await readCases();
  const modules = await importWorkflowModulesWithoutRegistry(t, "{");
  await assertRegistryLoadFailure(t, modules, fixture.definitions.terminal_completed, fixture.states.done);
});

test("CLI returns JSON-serializable results and specified exit codes", async (t) => {
  const fixture = await readCases();
  const directory = await mkdtemp(`${tmpdir()}/workflow-definition-cli-`);
  t.after(() => rm(directory, { recursive: true, force: true }));
  const definitionPath = `${directory}/definition.json`;
  const statePath = `${directory}/state.json`;
  const cyclePath = `${directory}/cycle.json`;
  await writeFile(definitionPath, JSON.stringify(fixture.definitions.terminal_completed));
  await writeFile(statePath, JSON.stringify(fixture.states.done));
  await writeFile(cyclePath, JSON.stringify(fixture.definitions.fixed_state_cycle));

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

  await t.test("actual child process emits one JSON line with documented exit codes", async (childTest) => {
    const validateProcess = runCliProcess(["validate", "--definition", definitionPath]);
    if (validateProcess.error?.code === "EPERM") {
      childTest.skip("The current execution sandbox does not permit nested Node child processes.");
      return;
    }
    assert.equal(validateProcess.error, undefined, validateProcess.error?.message);
    assert.equal(validateProcess.status, 0);
    assert.deepEqual(parseSingleJsonLine(validateProcess), { status: "valid", errors: [] });

    await writeFile(statePath, JSON.stringify(fixture.states.done));
    const evaluateProcess = runCliProcess(["evaluate", "--definition", definitionPath, "--state", statePath]);
    assert.equal(evaluateProcess.error, undefined, evaluateProcess.error?.message);
    assert.equal(evaluateProcess.status, 0);
    assert.deepEqual(parseSingleJsonLine(evaluateProcess), { status: "completed", transition_id: "complete" });

    await writeFile(statePath, JSON.stringify(fixture.states.cycle));
    const stoppedProcess = runCliProcess(["evaluate", "--definition", cyclePath, "--state", statePath]);
    assert.equal(stoppedProcess.error, undefined, stoppedProcess.error?.message);
    assert.equal(stoppedProcess.status, 1);
    assert.equal(parseSingleJsonLine(stoppedProcess).reason, "evaluation_cycle");

    const usageProcess = runCliProcess(["validate"]);
    assert.equal(usageProcess.error, undefined, usageProcess.error?.message);
    assert.equal(usageProcess.status, 2);
    assert.equal(parseSingleJsonLine(usageProcess).reason, "usage_error");
  });
});
