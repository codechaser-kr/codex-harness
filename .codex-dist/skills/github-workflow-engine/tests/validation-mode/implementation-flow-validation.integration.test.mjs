import assert from "node:assert/strict";
import test from "node:test";

import { compareValidationResults } from "../../scripts/validation-mode/comparator.mjs";
import { parseJsonFile } from "../../scripts/workflow-definition/parser.mjs";

const definitionUrl = new URL("../../definitions/implementation.json", import.meta.url);
const registryUrl = new URL("../../registries/registered-executors.json", import.meta.url);
const fixtureUrl = new URL("./fixtures/validation-mode-cases.json", import.meta.url);

async function readJson(url) {
  const result = await parseJsonFile(url);
  assert.equal(result.ok, true, result.ok ? "" : result.error.message);
  return result.value;
}

function resolveExecutor(registry, reference) {
  const matches = registry.filter((entry) => entry.executor_id === reference);
  assert.equal(matches.length, 1, reference);
  return matches[0];
}

function makeReceipts(request, outcome) {
  const isolated = request.consensus_strategy === "isolated_patch_consensus";
  return Array.from({ length: 10 }, (_, index) => {
    const slot = request.planned_session_slots?.[index];
    return {
      request_id: request.request_id,
      session_index: index + 1,
      session_id: slot?.planned_execution_session_id === "pending_tool_issued"
        ? `implementation-session-${index + 1}`
        : slot?.planned_execution_session_id ?? `implementation-session-${index + 1}`,
      ...(isolated ? {
        workspace_id: slot?.planned_workspace_id === "pending_tool_issued"
          ? `implementation-workspace-${index + 1}`
          : slot?.planned_workspace_id ?? `implementation-workspace-${index + 1}`,
        observed_baseline: structuredClone(request.baseline),
      } : {}),
      observed_state_snapshot: structuredClone(request.state_snapshot),
      observed_invocation_specification: structuredClone(request.invocation_specification),
      status: "usable",
      outcome: structuredClone(outcome),
      external_side_effects: [],
    };
  });
}

test("implementation registry declares diagnostic comparison strategies", async () => {
  const [definition, registry] = await Promise.all([readJson(definitionUrl), readJson(registryUrl)]);
  const references = [...new Set(definition.transitions
    .map((transition) => transition.registered_executor_reference)
    .filter((reference) => reference !== null))];

  for (const reference of references) {
    const executor = resolveExecutor(registry, reference);
    assert.equal(executor.execution_class, "llm_session", reference);
    assert.equal(
      executor.validation_strategy,
      reference === "target-harness-code-editor" ? "isolated_patch_consensus" : "semantic_consensus",
      reference,
    );
  }
  for (const reference of ["workflow-definition-evaluator", "validation-mode-comparator"]) {
    const executor = resolveExecutor(registry, reference);
    assert.equal(executor.executor_kind, "deterministic_tool");
    assert.equal(executor.execution_class, "deterministic_tool");
    assert.equal(executor.validation_strategy, "run_once");
  }
  assert.deepEqual(
    definition.transitions.filter((transition) => transition.registered_executor_reference === "target-harness-code-editor").map((transition) => transition.task_action_id),
    ["FI-5", "FI-26"],
  );
});

test("implementation semantic diagnostic reports unanimity without adoption or transition", async () => {
  const fixture = await readJson(fixtureUrl);
  const request = structuredClone(fixture.semantic_request);
  request.request_id = "implementation-fi-19";
  request.invocation_specification.route = "implementation/draft-inline-review-comments";
  request.invocation_specification.skill_reference = "review-comment";
  request.invocation_specification.skill_version = "review-comment-1.0.0";
  request.invocation_specification.input = { task_action_id: "FI-19" };
  const outcome = {
    task_action_id: "FI-19",
    inline_review_thread_drafts: [{ path: "file.mjs", line: 10, body: "finding" }],
  };
  const result = compareValidationResults(request, makeReceipts(request, outcome));
  assert.equal(result.status, "pass");
  assert.deepEqual(result.unanimous_outcome, outcome);
  assert.equal(Object.hasOwn(request, "baseline"), false);
  assert.deepEqual(Object.keys(result.consensus_receipt), ["session_ids"]);
  assert.equal(Object.hasOwn(result.consensus_receipt, "workspace_ids"), false);
  assert.equal(Object.hasOwn(result, "transition_id"), false);
  assert.equal(Object.hasOwn(result, "next_transition_id"), false);
  assert.equal(Object.hasOwn(result, "adopted_outcome"), false);
});

test("ten identical isolated patches remain diagnostic without duplicated proof fields", async () => {
  const fixture = await readJson(fixtureUrl);
  const request = structuredClone(fixture.patch_request);
  request.invocation_specification.input.task_action_id = "FI-5";
  const receipts = makeReceipts(request, fixture.patch_outcome);
  const result = compareValidationResults(request, receipts);

  assert.equal(result.status, "pass");
  assert.equal(result.consensus_strategy, "isolated_patch_consensus");
  assert.equal(result.consensus_receipt.session_ids.length, 10);
  assert.equal(new Set(result.consensus_receipt.session_ids).size, 10);
  assert.equal(result.consensus_receipt.workspace_ids.length, 10);
  assert.equal(new Set(result.consensus_receipt.workspace_ids).size, 10);
  assert.deepEqual(Object.keys(result.consensus_receipt).sort(), ["session_ids", "workspace_ids"]);
  assert.deepEqual(receipts[0].observed_baseline, request.baseline);
  assert.equal(result.unanimous_outcome.patch_digest, fixture.patch_outcome.patch_digest);
  for (const field of ["baseline", "patch_digest", "apply_count"]) {
    assert.equal(Object.hasOwn(result.consensus_receipt, field), false, field);
  }
  assert.equal(Object.hasOwn(result, "transition_id"), false);
  assert.equal(Object.hasOwn(result, "adopted_patch"), false);
});

test("implementation file editing mismatch returns no consensus receipt", async () => {
  const fixture = await readJson(fixtureUrl);
  const request = structuredClone(fixture.patch_request);
  const receipts = makeReceipts(request, fixture.patch_outcome);
  receipts[9].outcome.canonical_patch += "different";
  receipts[9].outcome.patch_digest = "sha256:different";
  const result = compareValidationResults(request, receipts);

  assert.equal(result.status, "stopped");
  assert.equal(Object.hasOwn(result, "unanimous_outcome"), false);
  assert.equal(Object.hasOwn(result, "consensus_receipt"), false);
  assert.equal(result.errors.some((error) => error.code === "patch_outcome.patch_digest.mismatch"), true);
});
