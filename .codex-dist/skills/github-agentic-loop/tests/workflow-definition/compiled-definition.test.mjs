import assert from "node:assert/strict";
import test from "node:test";

import {
  COMPILED_WORKFLOW_DEFINITION_ARTIFACT_TYPE,
  compileWorkflowDefinition,
  WORKFLOW_DEFINITION_COMPILER_FORMAT_VERSION,
} from "../../scripts/workflow-definition/compiler.mjs";
import { loadCompiledWorkflowDefinition } from "../../scripts/workflow-definition/compiled-definition-loader.mjs";
import { parseJsonFile } from "../../scripts/workflow-definition/parser.mjs";
import { WORKFLOW_DEFINITION_VALIDATOR_VERSION } from "../../scripts/workflow-definition/validator.mjs";

const fixtures = new URL("./fixtures/", import.meta.url);
const definitions = new URL("../../definitions/", import.meta.url);

async function validDefinition() {
  const result = await parseJsonFile(new URL("structural-valid.json", fixtures));
  assert.equal(result.ok, true, result.ok ? "" : result.error.message);
  return structuredClone(result.value.cases[0].definition);
}

function hasError(result, code, path) {
  return result.errors.some((error) => error.code === code && (path === undefined || error.path === path));
}

test("compiles a valid definition into deterministic immutable runtime metadata", async () => {
  const definition = await validDefinition();
  const original = structuredClone(definition);
  const first = compileWorkflowDefinition(definition);
  const second = compileWorkflowDefinition(definition);

  assert.equal(first.status, "compiled");
  assert.deepEqual(second, first);
  assert.deepEqual(definition, original);
  assert.equal(first.compiled_definition.artifact_type, COMPILED_WORKFLOW_DEFINITION_ARTIFACT_TYPE);
  assert.equal(first.compiled_definition.compiler_format_version, WORKFLOW_DEFINITION_COMPILER_FORMAT_VERSION);
  assert.equal(first.compiled_definition.validator_version, WORKFLOW_DEFINITION_VALIDATOR_VERSION);
  assert.match(first.compiled_definition.source_digest, /^sha256:[0-9a-f]{64}$/);
  assert.match(first.compiled_definition.compiled_digest, /^sha256:[0-9a-f]{64}$/);
  assert.deepEqual(first.compiled_definition.fact_metadata.order, ["issue_open", "review_state", "review_count"]);
  assert.deepEqual(first.compiled_definition.fact_metadata.by_id.review_count, {
    value_type: "integer",
    allowed_values: [0, 1, 2],
  });
  assert.deepEqual(first.compiled_definition.transition_lookup.order, ["FC-1", "FC-2"]);
  assert.equal(first.compiled_definition.transition_lookup.by_task_action_id["FC-1"].task_action_id, "FC-1");
  assert.equal(Object.isFrozen(first.compiled_definition), true);
  assert.equal(Object.isFrozen(first.compiled_definition.source_definition.facts), true);
  assert.equal(Object.isFrozen(first.compiled_definition.transition_lookup.by_task_action_id["FC-1"]), true);
});

test("compiles all shipped Workflow Definitions with the same format and validator versions", async () => {
  for (const filename of [
    "feature-proposal.json",
    "policy-review.json",
    "feature-change.json",
    "feature-fix.json",
    "implementation.json",
  ]) {
    const parsed = await parseJsonFile(new URL(filename, definitions));
    assert.equal(parsed.ok, true, filename);
    const result = compileWorkflowDefinition(parsed.value);
    assert.equal(result.status, "compiled", `${filename}: ${JSON.stringify(result.errors)}`);
    assert.equal(result.compiled_definition.compiler_format_version, WORKFLOW_DEFINITION_COMPILER_FORMAT_VERSION);
    assert.equal(result.compiled_definition.validator_version, WORKFLOW_DEFINITION_VALIDATOR_VERSION);
  }
});

test("keeps compiled source isolated from later raw definition mutation", async () => {
  const definition = await validDefinition();
  const compiled = compileWorkflowDefinition(definition).compiled_definition;
  definition.workflow_id = "implementation";
  definition.facts.issue_open[0] = false;

  assert.equal(compiled.source_definition.workflow_id, "feature-change");
  assert.deepEqual(compiled.fact_metadata.by_id.issue_open.allowed_values, [true, false]);
});

test("fails compilation with the raw validator structured errors", async () => {
  const definition = await validDefinition();
  definition.priority = "forbidden";
  const result = compileWorkflowDefinition(definition);

  assert.equal(result.status, "stopped");
  assert.equal(result.reason, "invalid_definition");
  assert.equal(result.compiled_definition, null);
  assert.equal(hasError(result, "priority.forbidden", "/priority"), true);
});

test("loads a new compiled definition and reuses an exact serialized candidate", async () => {
  const definition = await validDefinition();
  const prepared = loadCompiledWorkflowDefinition(definition);
  assert.equal(prepared.status, "loaded");
  assert.equal(prepared.preparation, "compiled");

  const serialized = JSON.parse(JSON.stringify(prepared.compiled_definition));
  const reused = loadCompiledWorkflowDefinition(definition, { compiledDefinition: serialized });
  assert.equal(reused.status, "loaded");
  assert.equal(reused.preparation, "reused");
  assert.deepEqual(reused.compiled_definition, prepared.compiled_definition);
  assert.equal(Object.isFrozen(reused.compiled_definition), true);
  assert.equal(Object.isFrozen(reused.compiled_definition.fact_metadata.by_id), true);
});

test("fails closed for source validator format and representation mismatches", async () => {
  const definition = await validDefinition();
  const compiled = compileWorkflowDefinition(definition).compiled_definition;

  const changedSource = await validDefinition();
  changedSource.facts.issue_open = [false, true];
  const sourceMismatch = loadCompiledWorkflowDefinition(changedSource, { compiledDefinition: compiled });
  assert.equal(sourceMismatch.status, "stopped");
  assert.equal(hasError(sourceMismatch, "compiled.source_digest.mismatch", "/source_digest"), true);

  for (const [field, code] of [
    ["validator_version", "compiled.validator_version.mismatch"],
    ["compiler_format_version", "compiled.compiler_format_version.mismatch"],
  ]) {
    const stale = JSON.parse(JSON.stringify(compiled));
    stale[field] = "stale";
    const result = loadCompiledWorkflowDefinition(definition, { compiledDefinition: stale });
    assert.equal(result.status, "stopped");
    assert.equal(hasError(result, code, `/${field}`), true);
  }

  const tampered = JSON.parse(JSON.stringify(compiled));
  tampered.fact_metadata.by_id.issue_open.allowed_values = [false, true];
  const digestMismatch = loadCompiledWorkflowDefinition(definition, { compiledDefinition: tampered });
  assert.equal(digestMismatch.status, "stopped");
  assert.equal(hasError(digestMismatch, "compiled.compiled_digest.mismatch", "/compiled_digest"), true);
});

test("rejects unrecognized compiled shapes with stable code and path", async () => {
  const definition = await validDefinition();
  const compiled = JSON.parse(JSON.stringify(compileWorkflowDefinition(definition).compiled_definition));
  compiled.unknown = true;

  const result = loadCompiledWorkflowDefinition(definition, { compiledDefinition: compiled });
  assert.equal(result.status, "stopped");
  assert.equal(result.reason, "invalid_compiled_definition");
  assert.equal(hasError(result, "compiled.additional_property", "/unknown"), true);

  delete compiled.unknown;
  compiled.fact_metadata.unknown = true;
  const nested = loadCompiledWorkflowDefinition(definition, { compiledDefinition: compiled });
  assert.equal(nested.status, "stopped");
  assert.equal(hasError(nested, "compiled.fact_metadata.additional_property", "/fact_metadata/unknown"), true);

  delete compiled.fact_metadata.unknown;
  const missingSource = loadCompiledWorkflowDefinition(undefined, { compiledDefinition: compiled });
  assert.equal(missingSource.status, "stopped");
  assert.equal(hasError(missingSource, "compiled.requested_source.type", "/source_definition"), true);
});
