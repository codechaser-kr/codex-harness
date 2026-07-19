import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { normalizeFactCandidates } from "../../scripts/workflow-definition/normalized-fact-adapter.mjs";

const registryUrl = new URL("../../registries/registered-executors.json", import.meta.url);

function definition() {
  return {
    workflow_id: "adapter-test",
    normalized_fact_schema: [
      { fact_id: "decision", value_type: "string", allowed_values: ["accept", "reject"], evidence_required: true },
      { fact_id: "count", value_type: "integer", allowed_values: [0, 1, 2], evidence_required: false },
      { fact_id: "ready", value_type: "boolean", allowed_values: [true, false], evidence_required: false },
    ],
  };
}

function evidence(overrides = {}) {
  return {
    source_kind: "github_state",
    source_reference: "issue #95",
    field_reference: "body.direction",
    ...overrides,
  };
}

function candidate(factId, value, evidenceItems = []) {
  return { fact_id: factId, value, evidence: evidenceItems };
}

function hasError(result, code, path) {
  return result.errors.some((error) => error.code === code && error.path === path);
}

function assertAtomicFailure(result, reason) {
  assert.equal(result.status, "stopped");
  assert.equal(result.reason, reason);
  assert.deepEqual(result.normalized_fact_state, {});
  assert.deepEqual(result.evidence_by_fact, {});
  for (const error of result.errors) {
    assert.deepEqual(Object.keys(error), ["code", "path", "message"]);
  }
}

test("normalizes valid candidates and groups copied evidence by fact", () => {
  const result = normalizeFactCandidates(definition(), [
    candidate("decision", "accept", [evidence()]),
    candidate("count", 2, [evidence({ source_kind: "local_state", field_reference: "checks.count" })]),
  ]);

  assert.deepEqual(result, {
    status: "normalized",
    workflow_id: "adapter-test",
    normalized_fact_state: { decision: "accept", count: 2 },
    evidence_by_fact: {
      decision: [evidence()],
      count: [evidence({ source_kind: "local_state", field_reference: "checks.count" })],
    },
    errors: [],
  });
});

test("allows missing facts and emits keys in definition order", () => {
  const result = normalizeFactCandidates(definition(), [
    candidate("ready", true),
    candidate("decision", "reject", [evidence()]),
  ]);

  assert.equal(result.status, "normalized");
  assert.deepEqual(Object.keys(result.normalized_fact_state), ["decision", "ready"]);
  assert.deepEqual(Object.keys(result.evidence_by_fact), ["decision", "ready"]);
  assert.equal(Object.hasOwn(result.normalized_fact_state, "count"), false);
});

test("does not mutate inputs and returns byte-stable JSON for the same input", () => {
  const inputDefinition = definition();
  const candidates = [
    candidate("ready", false, [evidence({ source_kind: "user_input", source_reference: "confirmation" })]),
    candidate("decision", "accept", [evidence({ source_kind: "skill_output", source_reference: "policy-plan" })]),
  ];
  const definitionBefore = structuredClone(inputDefinition);
  const candidatesBefore = structuredClone(candidates);

  const first = normalizeFactCandidates(inputDefinition, candidates);
  const second = normalizeFactCandidates(inputDefinition, candidates);

  assert.equal(JSON.stringify(first), JSON.stringify(second));
  assert.deepEqual(inputDefinition, definitionBefore);
  assert.deepEqual(candidates, candidatesBefore);
  assert.notEqual(first.evidence_by_fact.decision[0], candidates[1].evidence[0]);
});

test("rejects malformed definition projection without reading external state", () => {
  const invalidDefinition = definition();
  invalidDefinition.normalized_fact_schema[0].unexpected = true;
  invalidDefinition.normalized_fact_schema[1].allowed_values = [0, "1"];

  const result = normalizeFactCandidates(invalidDefinition, []);

  assertAtomicFailure(result, "invalid_definition");
  assert.equal(hasError(result, "object.additional_property", "/normalized_fact_schema/0/unexpected"), true);
  assert.equal(hasError(result, "fact.allowed_values.type_mismatch", "/normalized_fact_schema/1/allowed_values/1"), true);
});

test("rejects unknown facts, wrong value types, values outside the domain, and duplicates", () => {
  const result = normalizeFactCandidates(definition(), [
    candidate("unknown", true),
    candidate("count", "2"),
    candidate("ready", null),
    candidate("decision", "later", [evidence()]),
    candidate("ready", null),
  ]);

  assertAtomicFailure(result, "invalid_fact_candidates");
  assert.equal(hasError(result, "candidate.fact.unknown", "/candidates/0/fact_id"), true);
  assert.equal(hasError(result, "candidate.value.type_mismatch", "/candidates/1/value"), true);
  assert.equal(hasError(result, "candidate.value.type_mismatch", "/candidates/2/value"), true);
  assert.equal(hasError(result, "candidate.value.not_allowed", "/candidates/3/value"), true);
  assert.equal(hasError(result, "candidate.fact_id.duplicate", "/candidates/4/fact_id"), true);
});

test("rejects missing required evidence and malformed or open candidate objects", () => {
  const result = normalizeFactCandidates(definition(), [
    candidate("decision", "accept"),
    { fact_id: "count", value: 1, evidence: [], extra: true },
    { fact_id: "ready", evidence: [] },
    null,
  ]);

  assertAtomicFailure(result, "invalid_fact_candidates");
  assert.equal(hasError(result, "candidate.evidence.required", "/candidates/0/evidence"), true);
  assert.equal(hasError(result, "object.additional_property", "/candidates/1/extra"), true);
  assert.equal(hasError(result, "candidate.required", "/candidates/2/value"), true);
  assert.equal(hasError(result, "candidate.type", "/candidates/3"), true);
});

test("rejects malformed or open evidence objects", () => {
  const result = normalizeFactCandidates(definition(), [
    candidate("decision", "accept", [
      evidence({ source_kind: "web" }),
      evidence({ source_reference: "" }),
      evidence({ field_reference: "" }),
      { ...evidence(), extra: true },
      { source_kind: "local_state", source_reference: "workspace" },
      null,
    ]),
  ]);

  assertAtomicFailure(result, "invalid_fact_candidates");
  assert.equal(hasError(result, "evidence.source_kind.invalid", "/candidates/0/evidence/0/source_kind"), true);
  assert.equal(hasError(result, "evidence.source_reference.invalid", "/candidates/0/evidence/1/source_reference"), true);
  assert.equal(hasError(result, "evidence.field_reference.invalid", "/candidates/0/evidence/2/field_reference"), true);
  assert.equal(hasError(result, "object.additional_property", "/candidates/0/evidence/3/extra"), true);
  assert.equal(hasError(result, "evidence.required", "/candidates/0/evidence/4/field_reference"), true);
  assert.equal(hasError(result, "evidence.type", "/candidates/0/evidence/5"), true);
});

test("rejects non-array candidates and evidence", () => {
  const candidatesResult = normalizeFactCandidates(definition(), {});
  assertAtomicFailure(candidatesResult, "invalid_fact_candidates");
  assert.equal(hasError(candidatesResult, "candidates.type", "/candidates"), true);

  const evidenceResult = normalizeFactCandidates(definition(), [
    { fact_id: "decision", value: "accept", evidence: {} },
  ]);
  assertAtomicFailure(evidenceResult, "invalid_fact_candidates");
  assert.equal(hasError(evidenceResult, "candidate.evidence.type", "/candidates/0/evidence"), true);
});

test("registers the five proposal executors exactly once", async () => {
  const registry = JSON.parse(await readFile(registryUrl, "utf8"));
  const executorIds = ["policy-plan", "policy-review-next-triage", "feature-plan", "fix-analysis", "fix-plan"];

  for (const executorId of executorIds) {
    const matches = registry.filter((entry) => entry.executor_id === executorId);
    assert.deepEqual(matches, [{
      executor_id: executorId,
      executor_kind: "skill",
      side_effect_scope: "proposal_output",
      runtime_reference: executorId,
      execution_class: "llm_session",
      validation_strategy: "semantic_consensus",
    }]);
  }
});
