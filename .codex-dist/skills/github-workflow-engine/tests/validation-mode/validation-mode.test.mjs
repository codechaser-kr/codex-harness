import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import {
  compareValidationResults,
  normalizeConsensusOutcome,
  validateValidationRequest,
  validateValidationSessionReceipt,
} from "../../scripts/validation-mode/comparator.mjs";
import { parseJsonFile } from "../../scripts/workflow-definition/parser.mjs";

const fixtureUrl = new URL("./fixtures/validation-mode-cases.json", import.meta.url);

async function readFixture() {
  const result = await parseJsonFile(fixtureUrl);
  assert.equal(result.ok, true, result.ok ? "" : result.error.message);
  return result.value;
}

function makeReceipts(request, outcome) {
  const isolated = request.consensus_strategy === "isolated_patch_consensus";
  return Array.from({ length: 10 }, (_, offset) => {
    const slot = request.planned_session_slots?.[offset];
    const defaultSessionId = `session-${String(offset + 1).padStart(2, "0")}`;
    const defaultWorkspaceId = `workspace-${String(offset + 1).padStart(2, "0")}`;
    return {
      request_id: request.request_id,
      session_index: offset + 1,
      session_id: slot?.planned_execution_session_id === "pending_tool_issued"
        ? defaultSessionId
        : slot?.planned_execution_session_id ?? defaultSessionId,
      ...(isolated ? {
        workspace_id: slot?.planned_workspace_id === "pending_tool_issued"
          ? defaultWorkspaceId
          : slot?.planned_workspace_id ?? defaultWorkspaceId,
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

function hasError(result, code, path) {
  return result.errors.some((error) => error.code === code && (path === undefined || error.path === path));
}

function assertMinimalConsensusReceipt(result, strategy) {
  const expectedFields = strategy === "isolated_patch_consensus"
    ? ["session_ids", "workspace_ids"]
    : ["session_ids"];
  assert.deepEqual(Object.keys(result.consensus_receipt).sort(), expectedFields);
  for (const field of ["baseline", "patch_digest", "apply_count"]) {
    assert.equal(Object.hasOwn(result.consensus_receipt, field), false, field);
  }
}

function patchOutcome(manifest, canonicalPatch) {
  return {
    manifest,
    canonical_patch: canonicalPatch,
    patch_digest: `sha256:${createHash("sha256").update(canonicalPatch, "utf8").digest("hex")}`,
  };
}

test("control-plane semantic receipts return the unanimous full outcome", async () => {
  const fixture = await readFixture();
  const receipts = makeReceipts(fixture.semantic_request, fixture.semantic_outcome);
  const result = compareValidationResults(fixture.semantic_request, receipts.reverse());

  assert.equal(result.status, "pass");
  assert.equal(result.reason, "unanimous");
  assert.equal(result.consensus_strategy, "semantic_consensus");
  assert.deepEqual(result.unanimous_outcome, normalizeConsensusOutcome(fixture.semantic_outcome));
  assert.deepEqual(result.consensus_receipt.session_ids, Array.from({ length: 10 }, (_, index) => `session-${String(index + 1).padStart(2, "0")}`));
  assert.equal(Object.hasOwn(fixture.semantic_request, "baseline"), false);
  assert.equal(receipts.every((receipt) => !Object.hasOwn(receipt, "workspace_id")), true);
  assert.equal(receipts.every((receipt) => !Object.hasOwn(receipt, "observed_baseline")), true);
  assertMinimalConsensusReceipt(result, "semantic_consensus");
  assert.equal(result.receipt_count, 10);
});

test("control-plane comparison normalizes object keys but preserves array order", async () => {
  const fixture = await readFixture();
  const receipts = makeReceipts(fixture.semantic_request, fixture.semantic_outcome);
  receipts[9].outcome = {
    next_steps: ["create-policy-review"],
    rationale_codes: ["cross-cutting-policy-impact", "requires-policy-review"],
    recommendation: { direction: "policy_review" },
  };
  assert.equal(compareValidationResults(fixture.semantic_request, receipts).status, "pass");

  receipts[9].outcome.rationale_codes.reverse();
  const mismatch = compareValidationResults(fixture.semantic_request, receipts);
  assert.equal(mismatch.status, "stopped");
  assert.equal(mismatch.reason, "not_unanimous");
  assert.equal(hasError(mismatch, "comparison.outcome.mismatch", "/receipts/10/outcome"), true);
  for (const field of ["majority_outcome", "representative_outcome", "unanimous_outcome"]) {
    assert.equal(Object.hasOwn(mismatch, field), false);
  }
});

test("control-plane receipts fail closed on count and identity errors", async () => {
  const fixture = await readFixture();
  const missing = makeReceipts(fixture.semantic_request, fixture.semantic_outcome).slice(0, 9);
  const missingResult = compareValidationResults(fixture.semantic_request, missing);
  assert.equal(missingResult.status, "stopped");
  assert.equal(hasError(missingResult, "receipts.count.invalid", "/receipts"), true);
  assert.equal(hasError(missingResult, "session_index.missing", "/receipts/10/session_index"), true);

  const duplicate = makeReceipts(fixture.semantic_request, fixture.semantic_outcome);
  duplicate[9].session_index = 9;
  duplicate[9].session_id = duplicate[8].session_id;
  const duplicateResult = compareValidationResults(fixture.semantic_request, duplicate);
  assert.equal(hasError(duplicateResult, "session_index.duplicate"), true);
  assert.equal(hasError(duplicateResult, "session_id.duplicate"), true);
});

test("control-plane receipts stop before adoption on blocked, timeout, environment mismatch, or side effects", async () => {
  const fixture = await readFixture();
  const receipts = makeReceipts(fixture.semantic_request, fixture.semantic_outcome);
  receipts[0].status = "blocked";
  receipts[1].status = "timeout";
  receipts[2].observed_state_snapshot.local_state.branch = "other";
  receipts[3].observed_invocation_specification.model_identifier = "other-model";
  receipts[4].external_side_effects.push({ kind: "github_comment" });
  receipts[5].observed_invocation_specification.deadline_configuration.timeout_ms = 1;

  const result = compareValidationResults(fixture.semantic_request, receipts);
  assert.equal(result.status, "stopped");
  assert.equal(result.reason, "environment_mismatch");
  assert.equal(hasError(result, "session_receipt.status.blocked"), true);
  assert.equal(hasError(result, "session_receipt.status.timeout"), true);
  assert.equal(hasError(result, "session_receipt.environment.mismatch"), true);
  assert.equal(hasError(result, "external_side_effects.nonempty"), true);
});

test("isolated patch consensus keeps baseline and digest in their source contracts", async () => {
  const fixture = await readFixture();
  const receipts = makeReceipts(fixture.patch_request, fixture.patch_outcome);
  const result = compareValidationResults(fixture.patch_request, receipts);

  assert.equal(result.status, "pass");
  assert.equal(result.consensus_strategy, "isolated_patch_consensus");
  assert.deepEqual(result.unanimous_outcome, normalizeConsensusOutcome(fixture.patch_outcome));
  assert.deepEqual(fixture.patch_request.baseline, receipts[0].observed_baseline);
  assert.equal(result.unanimous_outcome.patch_digest, fixture.patch_outcome.patch_digest);
  assert.equal(result.consensus_receipt.workspace_ids.length, 10);
  assert.equal(new Set(result.consensus_receipt.workspace_ids).size, 10);
  assertMinimalConsensusReceipt(result, "isolated_patch_consensus");
});

test("isolated patch request requires ten ordered planned slots and correlates known or pending identifiers", async () => {
  const fixture = await readFixture();
  const missingPlan = structuredClone(fixture.patch_request);
  delete missingPlan.planned_session_relation;
  delete missingPlan.planned_session_slots;
  const missingValidation = validateValidationRequest(missingPlan);
  assert.equal(missingValidation.valid, false);
  assert.equal(hasError(missingValidation, "validation_request.required", "/planned_session_relation"), true);
  assert.equal(hasError(missingValidation, "validation_request.required", "/planned_session_slots"), true);

  const malformedPlan = structuredClone(fixture.patch_request);
  malformedPlan.planned_session_slots.pop();
  malformedPlan.planned_session_slots[1].session_index = 1;
  malformedPlan.planned_session_slots[1].planned_workspace_id = malformedPlan.planned_session_slots[0].planned_workspace_id;
  const malformedValidation = validateValidationRequest(malformedPlan);
  assert.equal(hasError(malformedValidation, "planned_session_slots.count.invalid"), true);
  assert.equal(hasError(malformedValidation, "planned_session_slot.session_index.duplicate"), true);
  assert.equal(hasError(malformedValidation, "planned_session_slot.planned_workspace_id.duplicate"), true);

  const pendingPlan = structuredClone(fixture.patch_request);
  pendingPlan.planned_session_slots[0].planned_execution_session_id = "pending_tool_issued";
  pendingPlan.planned_session_slots[0].planned_workspace_id = "pending_tool_issued";
  const pendingReceipts = makeReceipts(pendingPlan, fixture.patch_outcome);
  pendingReceipts[0].session_id = "tool-issued-session";
  pendingReceipts[0].workspace_id = "tool-issued-workspace";
  assert.equal(compareValidationResults(pendingPlan, pendingReceipts).status, "pass");

  const mismatchedReceipts = makeReceipts(fixture.patch_request, fixture.patch_outcome);
  mismatchedReceipts[0].session_id = "wrong-known-session";
  mismatchedReceipts[1].workspace_id = "wrong-known-workspace";
  const mismatch = compareValidationResults(fixture.patch_request, mismatchedReceipts);
  assert.equal(mismatch.status, "stopped");
  assert.equal(hasError(mismatch, "session_receipt.session_id.planned_mismatch", "/receipts/1/session_id"), true);
  assert.equal(hasError(mismatch, "session_receipt.workspace_id.planned_mismatch", "/receipts/2/workspace_id"), true);
});

test("isolated patch manifest accepts canonical add, modify, delete records", async () => {
  const fixture = await readFixture();
  const canonicalPatch = [
    "diff --git a/added.txt b/added.txt",
    "new file mode 100644",
    "index 0000000..e69de29",
    "--- /dev/null",
    "+++ b/added.txt",
    "@@ -0,0 +1 @@",
    "+added",
    "diff --git a/deleted.txt b/deleted.txt",
    "deleted file mode 100644",
    "index e69de29..0000000",
    "--- a/deleted.txt",
    "+++ /dev/null",
    "@@ -1 +0,0 @@",
    "-deleted",
    "diff --git a/modified.txt b/modified.txt",
    "index 257cc56..5716ca5 100644",
    "--- a/modified.txt",
    "+++ b/modified.txt",
    "@@ -1 +1 @@",
    "-old",
    "+new",
    "",
  ].join("\n");
  const outcome = patchOutcome([
    { path: "added.txt", operation: "add" },
    { path: "deleted.txt", operation: "delete" },
    { path: "modified.txt", operation: "modify" },
  ], canonicalPatch);

  const result = compareValidationResults(fixture.patch_request, makeReceipts(fixture.patch_request, outcome));
  assert.equal(result.status, "pass");
  assert.deepEqual(result.unanimous_outcome.manifest, outcome.manifest);
});

test("isolated patch manifest and deterministic headers fail closed on mismatch, rename, unsafe paths, and ordering", async () => {
  const fixture = await readFixture();
  const cases = [];

  const operationMismatch = structuredClone(fixture.patch_outcome);
  operationMismatch.manifest[0].operation = "delete";
  cases.push([operationMismatch, "patch_outcome.manifest_patch.mismatch"]);

  for (const path of ["/file.txt", "C:\\file.txt", "dir/./file.txt", "dir/../file.txt", "nul\0file.txt", "line\nfile.txt"]) {
    const unsafePath = structuredClone(fixture.patch_outcome);
    unsafePath.manifest[0].path = path;
    cases.push([unsafePath, "patch_outcome.manifest.path.invalid"]);
  }

  const openEntry = structuredClone(fixture.patch_outcome);
  openEntry.manifest[0].extra = true;
  cases.push([openEntry, "object.additional_property"]);

  const duplicatePath = structuredClone(fixture.patch_outcome);
  duplicatePath.manifest.push(structuredClone(duplicatePath.manifest[0]));
  cases.push([duplicatePath, "patch_outcome.manifest.path.duplicate"]);

  const unsorted = patchOutcome([
    { path: "z.txt", operation: "modify" },
    { path: "a.txt", operation: "modify" },
  ], fixture.patch_outcome.canonical_patch);
  cases.push([unsorted, "patch_outcome.manifest.order.invalid"]);

  const renamePatch = fixture.patch_outcome.canonical_patch.replace(
    "index 257cc56..5716ca5 100644",
    "similarity index 100%\nrename from old.txt\nrename to file.txt",
  );
  cases.push([patchOutcome([{ path: "file.txt", operation: "modify" }], renamePatch), "patch_outcome.canonical_patch.rename_forbidden"]);

  const wrongHeader = fixture.patch_outcome.canonical_patch.replace(
    "diff --git a/file.txt b/file.txt",
    "diff --git a/other.txt b/other.txt",
  );
  cases.push([patchOutcome([{ path: "file.txt", operation: "modify" }], wrongHeader), "patch_outcome.canonical_patch.diff_header"]);

  for (const [outcome, expectedCode] of cases) {
    const receipt = makeReceipts(fixture.patch_request, outcome)[0];
    const validation = validateValidationSessionReceipt(receipt, fixture.patch_request);
    assert.equal(validation.valid, false, expectedCode);
    assert.equal(hasError(validation, expectedCode), true, expectedCode);
  }
});

test("isolated patch consensus rejects duplicate workspaces, baseline drift, bad digest, and one changed patch", async () => {
  const fixture = await readFixture();
  const receipts = makeReceipts(fixture.patch_request, fixture.patch_outcome);
  receipts[1].workspace_id = receipts[0].workspace_id;
  receipts[2].observed_baseline.revision = "other";
  receipts[3].outcome.patch_digest = "sha256:bad";
  receipts[4].outcome.manifest[0].operation = "delete";

  const result = compareValidationResults(fixture.patch_request, receipts);
  assert.equal(result.status, "stopped");
  assert.equal(result.reason, "environment_mismatch");
  assert.equal(hasError(result, "workspace_id.duplicate"), true);
  assert.equal(hasError(result, "session_receipt.environment.mismatch"), true);
  assert.equal(hasError(result, "patch_outcome.patch_digest.mismatch"), true);
  assert.equal(Object.hasOwn(result, "unanimous_outcome"), false);
});

test("request and receipt contracts reject extra identifiers and non-JSON values", async () => {
  const fixture = await readFixture();
  const request = structuredClone(fixture.semantic_request);
  request.fingerprint = "forbidden";
  request.invocation_specification.input.score = Number.NaN;
  const requestValidation = validateValidationRequest(request);
  assert.equal(requestValidation.valid, false);
  assert.equal(requestValidation.errors.some((error) => error.code === "object.additional_property"), true);
  assert.equal(requestValidation.errors.some((error) => error.code === "json_value.number.non_finite"), true);

  const [receipt] = makeReceipts(fixture.semantic_request, fixture.semantic_outcome);
  receipt.outcome.invalid = undefined;
  const receiptValidation = validateValidationSessionReceipt(receipt, fixture.semantic_request);
  assert.equal(receiptValidation.valid, false);
  assert.equal(receiptValidation.errors.some((error) => error.code === "json_value.invalid"), true);
});

test("strategy-specific contracts reject semantic null placeholders and require isolated fields", async () => {
  const fixture = await readFixture();

  const semanticRequest = structuredClone(fixture.semantic_request);
  semanticRequest.baseline = null;
  const semanticRequestValidation = validateValidationRequest(semanticRequest);
  assert.equal(semanticRequestValidation.valid, false);
  assert.equal(hasError(semanticRequestValidation, "object.additional_property", "/baseline"), true);

  const [semanticReceipt] = makeReceipts(fixture.semantic_request, fixture.semantic_outcome);
  semanticReceipt.workspace_id = null;
  semanticReceipt.observed_baseline = null;
  const semanticReceiptValidation = validateValidationSessionReceipt(semanticReceipt, fixture.semantic_request);
  assert.equal(semanticReceiptValidation.valid, false);
  assert.equal(hasError(semanticReceiptValidation, "object.additional_property", "/workspace_id"), true);
  assert.equal(hasError(semanticReceiptValidation, "object.additional_property", "/observed_baseline"), true);

  const isolatedRequest = structuredClone(fixture.patch_request);
  delete isolatedRequest.baseline;
  const isolatedRequestValidation = validateValidationRequest(isolatedRequest);
  assert.equal(isolatedRequestValidation.valid, false);
  assert.equal(hasError(isolatedRequestValidation, "validation_request.required", "/baseline"), true);

  const [isolatedReceipt] = makeReceipts(fixture.patch_request, fixture.patch_outcome);
  delete isolatedReceipt.workspace_id;
  delete isolatedReceipt.observed_baseline;
  const isolatedReceiptValidation = validateValidationSessionReceipt(isolatedReceipt, fixture.patch_request);
  assert.equal(isolatedReceiptValidation.valid, false);
  assert.equal(hasError(isolatedReceiptValidation, "session_receipt.required", "/workspace_id"), true);
  assert.equal(hasError(isolatedReceiptValidation, "session_receipt.required", "/observed_baseline"), true);
});

test("deadline_configuration is a closed object with one positive finite integer timeout", async () => {
  const fixture = await readFixture();
  assert.equal(validateValidationRequest(fixture.semantic_request).valid, true);

  for (const deadline of [null, {}, { timeout_ms: 1, extra: true }, { timeout_ms: 0 }, { timeout_ms: 1.5 }, { timeout_ms: Number.POSITIVE_INFINITY }]) {
    const request = structuredClone(fixture.semantic_request);
    request.invocation_specification.deadline_configuration = deadline;
    const validation = validateValidationRequest(request);
    assert.equal(validation.valid, false, JSON.stringify(deadline));
  }
});

test("comparison does not mutate request or receipts", async () => {
  const fixture = await readFixture();
  const request = structuredClone(fixture.semantic_request);
  const receipts = makeReceipts(request, fixture.semantic_outcome);
  const requestBefore = structuredClone(request);
  const receiptsBefore = structuredClone(receipts);
  compareValidationResults(request, receipts);
  assert.deepEqual(request, requestBefore);
  assert.deepEqual(receipts, receiptsBefore);
});
