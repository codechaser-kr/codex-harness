import { createHash } from "node:crypto";

const EXPECTED_SESSION_COUNT = 10;
const PENDING_TOOL_ISSUED = "pending_tool_issued";
const ISOLATED_SESSION_RELATION = "ten_independent_isolated_execution_sessions";
const CONSENSUS_STRATEGIES = new Set(["semantic_consensus", "isolated_patch_consensus"]);
const SEMANTIC_REQUEST_FIELDS = [
  "request_id",
  "consensus_strategy",
  "state_snapshot",
  "invocation_specification",
];
const ISOLATED_REQUEST_FIELDS = [
  ...SEMANTIC_REQUEST_FIELDS,
  "baseline",
  "planned_session_relation",
  "planned_session_slots",
];
const PLANNED_SESSION_SLOT_FIELDS = [
  "session_index",
  "planned_execution_session_id",
  "planned_workspace_id",
];
const STATE_SNAPSHOT_FIELDS = ["github_state", "local_state"];
const INVOCATION_FIELDS = [
  "route",
  "skill_reference",
  "skill_version",
  "model_identifier",
  "reasoning_configuration",
  "role_configuration",
  "config_reference",
  "deadline_configuration",
  "input",
];
const SEMANTIC_RECEIPT_FIELDS = [
  "request_id",
  "session_index",
  "session_id",
  "observed_state_snapshot",
  "observed_invocation_specification",
  "status",
  "outcome",
  "external_side_effects",
];
const ISOLATED_RECEIPT_FIELDS = [
  ...SEMANTIC_RECEIPT_FIELDS,
  "workspace_id",
  "observed_baseline",
];
const PATCH_OUTCOME_FIELDS = ["manifest", "canonical_patch", "patch_digest"];
const DEADLINE_CONFIGURATION_FIELDS = ["timeout_ms"];
const MANIFEST_ENTRY_FIELDS = ["path", "operation"];
const PATCH_OPERATIONS = new Set(["add", "modify", "delete"]);

function pointer(path, segment) {
  return `${path}/${String(segment).replaceAll("~", "~0").replaceAll("/", "~1")}`;
}

function addError(errors, code, path, message) {
  errors.push({ code, path, message });
}

function isPlainObject(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.length > 0;
}

function validateClosedObject(value, path, fields, errors, context) {
  if (!isPlainObject(value)) {
    addError(errors, `${context}.type`, path, "Expected a plain object.");
    return false;
  }
  const allowed = new Set(fields);
  for (const key of Object.keys(value).sort()) {
    if (!allowed.has(key)) {
      addError(errors, "object.additional_property", pointer(path, key), `Unexpected property: ${key}.`);
    }
  }
  for (const field of fields) {
    if (!Object.hasOwn(value, field)) {
      addError(errors, `${context}.required`, pointer(path, field), `Missing required property: ${field}.`);
    }
  }
  return true;
}

function validateJsonCompatible(value, path, errors, ancestors = new WeakSet()) {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      addError(errors, "json_value.number.non_finite", path, "JSON numbers must be finite.");
    }
    return;
  }
  if (typeof value !== "object") {
    addError(errors, "json_value.invalid", path, "Expected a JSON-compatible value.");
    return;
  }
  if (ancestors.has(value)) {
    addError(errors, "json_value.cycle", path, "JSON-compatible values must not contain cycles.");
    return;
  }
  ancestors.add(value);
  if (Array.isArray(value)) {
    for (const key of Object.keys(value).sort()) {
      if (!/^(0|[1-9][0-9]*)$/.test(key) || Number(key) >= value.length) {
        addError(errors, "json_value.array.additional_property", pointer(path, key), "Arrays must not have additional properties.");
      }
    }
    for (let index = 0; index < value.length; index += 1) {
      if (!Object.hasOwn(value, index)) {
        addError(errors, "json_value.array.hole", pointer(path, index), "Arrays must not contain holes.");
      } else {
        validateJsonCompatible(value[index], pointer(path, index), errors, ancestors);
      }
    }
  } else if (!isPlainObject(value)) {
    addError(errors, "json_value.object.type", path, "JSON objects must be plain objects.");
  } else {
    if (Object.getOwnPropertySymbols(value).length > 0) {
      addError(errors, "json_value.symbol_property", path, "JSON objects must not have symbol properties.");
    }
    for (const key of Object.keys(value).sort()) {
      validateJsonCompatible(value[key], pointer(path, key), errors, ancestors);
    }
  }
  ancestors.delete(value);
}

function validatePlainJson(value, path, errors, code) {
  if (!isPlainObject(value)) {
    addError(errors, code, path, "Expected a plain object.");
    return;
  }
  validateJsonCompatible(value, path, errors);
}

function validateStateSnapshot(value, path, errors) {
  if (!validateClosedObject(value, path, STATE_SNAPSHOT_FIELDS, errors, "state_snapshot")) {
    return;
  }
  for (const field of STATE_SNAPSHOT_FIELDS) {
    if (Object.hasOwn(value, field)) {
      validatePlainJson(value[field], pointer(path, field), errors, `state_snapshot.${field}.type`);
    }
  }
}

function validateInvocationSpecification(value, path, errors) {
  if (!validateClosedObject(value, path, INVOCATION_FIELDS, errors, "invocation_specification")) {
    return;
  }
  for (const field of ["route", "skill_reference", "skill_version", "model_identifier", "config_reference"]) {
    if (Object.hasOwn(value, field) && !isNonEmptyString(value[field])) {
      addError(errors, "invocation_specification.string.invalid", pointer(path, field), "Expected a non-empty string.");
    }
  }
  for (const field of ["reasoning_configuration", "role_configuration", "input"]) {
    if (Object.hasOwn(value, field)) {
      validateJsonCompatible(value[field], pointer(path, field), errors);
    }
  }
  if (Object.hasOwn(value, "deadline_configuration")) {
    const deadlinePath = pointer(path, "deadline_configuration");
    const deadline = value.deadline_configuration;
    if (validateClosedObject(deadline, deadlinePath, DEADLINE_CONFIGURATION_FIELDS, errors, "deadline_configuration")
      && Object.hasOwn(deadline, "timeout_ms")
      && (!Number.isFinite(deadline.timeout_ms) || !Number.isInteger(deadline.timeout_ms) || deadline.timeout_ms <= 0)) {
      addError(errors, "deadline_configuration.timeout_ms.invalid", pointer(deadlinePath, "timeout_ms"), "timeout_ms must be a positive finite integer.");
    }
  }
}

function validatePlannedIdentifier(value, path, errors, code) {
  if (!isNonEmptyString(value)) {
    addError(errors, code, path, "Expected a non-empty known identifier or pending_tool_issued.");
    return false;
  }
  return true;
}

function validatePlannedSessionSlots(value, path, errors) {
  if (!Array.isArray(value)) {
    addError(errors, "planned_session_slots.type", path, "planned_session_slots must be an array.");
    return;
  }
  if (value.length !== EXPECTED_SESSION_COUNT) {
    addError(errors, "planned_session_slots.count.invalid", path, "Exactly 10 planned session slots are required.");
  }

  const indices = new Set();
  const knownSessionIds = new Set();
  const knownWorkspaceIds = new Set();
  for (let index = 0; index < value.length; index += 1) {
    const slotPath = pointer(path, index);
    const slot = value[index];
    if (!validateClosedObject(slot, slotPath, PLANNED_SESSION_SLOT_FIELDS, errors, "planned_session_slot")) {
      continue;
    }
    if (Object.hasOwn(slot, "session_index")) {
      if (!Number.isInteger(slot.session_index) || slot.session_index < 1 || slot.session_index > EXPECTED_SESSION_COUNT) {
        addError(errors, "planned_session_slot.session_index.invalid", pointer(slotPath, "session_index"), "session_index must be an integer from 1 to 10.");
      } else {
        if (indices.has(slot.session_index)) {
          addError(errors, "planned_session_slot.session_index.duplicate", pointer(slotPath, "session_index"), `Duplicate planned session_index: ${slot.session_index}.`);
        }
        if (slot.session_index !== index + 1) {
          addError(errors, "planned_session_slots.order.invalid", pointer(slotPath, "session_index"), "planned_session_slots must be ordered by session_index 1 through 10.");
        }
        indices.add(slot.session_index);
      }
    }

    for (const [field, knownIds] of [
      ["planned_execution_session_id", knownSessionIds],
      ["planned_workspace_id", knownWorkspaceIds],
    ]) {
      if (!Object.hasOwn(slot, field)
        || !validatePlannedIdentifier(slot[field], pointer(slotPath, field), errors, `planned_session_slot.${field}.invalid`)
        || slot[field] === PENDING_TOOL_ISSUED) {
        continue;
      }
      if (knownIds.has(slot[field])) {
        addError(errors, `planned_session_slot.${field}.duplicate`, pointer(slotPath, field), `Duplicate known ${field}: ${slot[field]}.`);
      }
      knownIds.add(slot[field]);
    }
  }
  for (let index = 1; index <= EXPECTED_SESSION_COUNT; index += 1) {
    if (!indices.has(index)) {
      addError(errors, "planned_session_slot.session_index.missing", pointer(path, index - 1), `Missing planned session_index: ${index}.`);
    }
  }
}

function validateRequestInto(request, path, errors) {
  const requestFields = isPlainObject(request) && request.consensus_strategy === "isolated_patch_consensus"
    ? ISOLATED_REQUEST_FIELDS
    : SEMANTIC_REQUEST_FIELDS;
  if (!validateClosedObject(request, path, requestFields, errors, "validation_request")) {
    return;
  }
  if (Object.hasOwn(request, "request_id") && !isNonEmptyString(request.request_id)) {
    addError(errors, "request_id.invalid", pointer(path, "request_id"), "Expected a non-empty string.");
  }
  if (Object.hasOwn(request, "consensus_strategy") && !CONSENSUS_STRATEGIES.has(request.consensus_strategy)) {
    addError(errors, "consensus_strategy.invalid", pointer(path, "consensus_strategy"), "Unsupported consensus strategy.");
  }
  if (Object.hasOwn(request, "state_snapshot")) {
    validateStateSnapshot(request.state_snapshot, pointer(path, "state_snapshot"), errors);
  }
  if (request.consensus_strategy === "isolated_patch_consensus" && Object.hasOwn(request, "baseline")) {
    validatePlainJson(request.baseline, pointer(path, "baseline"), errors, "baseline.type");
  }
  if (Object.hasOwn(request, "invocation_specification")) {
    validateInvocationSpecification(request.invocation_specification, pointer(path, "invocation_specification"), errors);
  }
  if (request.consensus_strategy === "isolated_patch_consensus") {
    if (Object.hasOwn(request, "planned_session_relation")
      && request.planned_session_relation !== ISOLATED_SESSION_RELATION) {
      addError(
        errors,
        "planned_session_relation.invalid",
        pointer(path, "planned_session_relation"),
        `planned_session_relation must be ${ISOLATED_SESSION_RELATION}.`,
      );
    }
    if (Object.hasOwn(request, "planned_session_slots")) {
      validatePlannedSessionSlots(request.planned_session_slots, pointer(path, "planned_session_slots"), errors);
    }
  }
}

function patchDigest(canonicalPatch) {
  return `sha256:${createHash("sha256").update(canonicalPatch, "utf8").digest("hex")}`;
}

function validateManifestPath(value, path, errors) {
  if (!isNonEmptyString(value)) {
    addError(errors, "patch_outcome.manifest.path.invalid", path, "path must be a non-empty repository-relative path.");
    return false;
  }
  if (value.includes("\0") || value.includes("\n") || value.includes("\r")
    || value.startsWith("/") || /^[A-Za-z]:[\\/]/.test(value) || value.startsWith("\\\\")) {
    addError(errors, "patch_outcome.manifest.path.invalid", path, "path must be a repository-relative path without NUL or newline characters.");
    return false;
  }
  const segments = value.split(/[\\/]/);
  if (segments.some((segment) => segment === "" || segment === "." || segment === "..")) {
    addError(errors, "patch_outcome.manifest.path.invalid", path, "path must not contain empty, dot, or dot-dot segments.");
    return false;
  }
  return true;
}

function validateManifest(manifest, path, errors) {
  if (!Array.isArray(manifest)) {
    addError(errors, "patch_outcome.manifest.type", path, "manifest must be an array.");
    return [];
  }
  if (manifest.length === 0) {
    addError(errors, "patch_outcome.manifest.empty", path, "manifest must contain at least one changed path.");
  }
  const validated = [];
  const paths = new Set();
  let previousPath;
  for (let index = 0; index < manifest.length; index += 1) {
    const entryPath = pointer(path, index);
    const entry = manifest[index];
    if (!validateClosedObject(entry, entryPath, MANIFEST_ENTRY_FIELDS, errors, "patch_outcome.manifest_entry")) {
      continue;
    }
    const pathValue = entry.path;
    const pathValid = validateManifestPath(pathValue, pointer(entryPath, "path"), errors);
    if (!PATCH_OPERATIONS.has(entry.operation)) {
      addError(errors, "patch_outcome.manifest.operation.invalid", pointer(entryPath, "operation"), "operation must be add, modify, or delete.");
    }
    if (pathValid) {
      if (paths.has(pathValue)) {
        addError(errors, "patch_outcome.manifest.path.duplicate", pointer(entryPath, "path"), `Duplicate manifest path: ${pathValue}.`);
      }
      if (previousPath !== undefined && previousPath >= pathValue) {
        addError(errors, "patch_outcome.manifest.order.invalid", pointer(entryPath, "path"), "manifest paths must be unique and sorted in ascending code-unit order.");
      }
      paths.add(pathValue);
      previousPath = pathValue;
    }
    if (pathValid && PATCH_OPERATIONS.has(entry.operation)) {
      validated.push({ path: pathValue, operation: entry.operation });
    }
  }
  return validated;
}

function canonicalPatchEntries(canonicalPatch, path, errors) {
  if (canonicalPatch.includes("\0") || canonicalPatch.includes("\r")) {
    addError(errors, "patch_outcome.canonical_patch.characters", path, "canonical_patch must not contain NUL or carriage-return characters.");
  }
  if (!canonicalPatch.endsWith("\n") || canonicalPatch.endsWith("\n\n")) {
    addError(errors, "patch_outcome.canonical_patch.termination", path, "canonical_patch must end with exactly one newline.");
  }
  const lines = canonicalPatch.split("\n");
  const starts = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index].startsWith("diff --git ")) {
      starts.push(index);
    }
  }
  if (starts.length === 0) {
    addError(errors, "patch_outcome.canonical_patch.format", path, "canonical_patch must contain git unified diff records.");
    return [];
  }
  if (starts[0] !== 0) {
    addError(errors, "patch_outcome.canonical_patch.preamble", path, "canonical_patch must start with a diff --git record.");
  }

  const entries = [];
  for (let sectionIndex = 0; sectionIndex < starts.length; sectionIndex += 1) {
    const start = starts[sectionIndex];
    const end = starts[sectionIndex + 1] ?? lines.length;
    const section = lines.slice(start, end);
    if (section.some((line) => /^(rename|copy) (from|to) /.test(line) || line.startsWith("similarity index "))) {
      addError(errors, "patch_outcome.canonical_patch.rename_forbidden", path, "canonical_patch must be generated with rename and copy detection disabled.");
      continue;
    }
    const preambleEnd = section.findIndex((line) => line.startsWith("@@ ") || line === "GIT binary patch");
    const preamble = preambleEnd === -1 ? section : section.slice(0, preambleEnd);
    const oldHeaders = preamble.filter((line) => line.startsWith("--- "));
    const newHeaders = preamble.filter((line) => line.startsWith("+++ "));
    if (oldHeaders.length !== 1 || newHeaders.length !== 1) {
      addError(errors, "patch_outcome.canonical_patch.file_headers", path, "Each diff record must contain exactly one --- and +++ file header.");
      continue;
    }
    const oldPath = oldHeaders[0].slice(4);
    const newPath = newHeaders[0].slice(4);
    let entry;
    if (oldPath === "/dev/null" && newPath.startsWith("b/")) {
      entry = { path: newPath.slice(2), operation: "add" };
    } else if (newPath === "/dev/null" && oldPath.startsWith("a/")) {
      entry = { path: oldPath.slice(2), operation: "delete" };
    } else if (oldPath.startsWith("a/") && newPath.startsWith("b/") && oldPath.slice(2) === newPath.slice(2)) {
      entry = { path: oldPath.slice(2), operation: "modify" };
    } else {
      addError(errors, "patch_outcome.canonical_patch.path_relation", path, "Diff file headers must describe an add, modify, or delete without rename.");
      continue;
    }
    if (!validateManifestPath(entry.path, path, errors)) {
      continue;
    }

    const expectedDiffHeader = `diff --git a/${entry.path} b/${entry.path}`;
    if (section[0] !== expectedDiffHeader) {
      addError(errors, "patch_outcome.canonical_patch.diff_header", path, `Diff header must be exactly: ${expectedDiffHeader}.`);
      continue;
    }
    const newFileModes = section.filter((line) => line.startsWith("new file mode "));
    const deletedFileModes = section.filter((line) => line.startsWith("deleted file mode "));
    const operationMarkersValid = entry.operation === "add"
      ? newFileModes.length === 1 && deletedFileModes.length === 0
      : entry.operation === "delete"
        ? deletedFileModes.length === 1 && newFileModes.length === 0
        : newFileModes.length === 0 && deletedFileModes.length === 0;
    if (!operationMarkersValid) {
      addError(errors, "patch_outcome.canonical_patch.operation_marker", path, "File mode headers must agree with the add, modify, or delete operation.");
      continue;
    }
    entries.push(entry);
  }
  return entries;
}

function validatePatchOutcome(outcome, path, errors) {
  if (!validateClosedObject(outcome, path, PATCH_OUTCOME_FIELDS, errors, "patch_outcome")) {
    return;
  }
  const manifest = validateManifest(outcome.manifest, pointer(path, "manifest"), errors);
  let patchEntries = [];
  if (!isNonEmptyString(outcome.canonical_patch)) {
    addError(errors, "patch_outcome.canonical_patch.invalid", pointer(path, "canonical_patch"), "canonical_patch must be a non-empty string.");
  } else {
    patchEntries = canonicalPatchEntries(outcome.canonical_patch, pointer(path, "canonical_patch"), errors);
  }
  if (manifest.length !== patchEntries.length
    || manifest.some((entry, index) => entry.path !== patchEntries[index]?.path || entry.operation !== patchEntries[index]?.operation)) {
    addError(errors, "patch_outcome.manifest_patch.mismatch", pointer(path, "manifest"), "manifest entries must exactly match canonical_patch changed paths, operations, and order.");
  }
  if (!isNonEmptyString(outcome.patch_digest)) {
    addError(errors, "patch_outcome.patch_digest.invalid", pointer(path, "patch_digest"), "patch_digest must be a non-empty string.");
  } else if (isNonEmptyString(outcome.canonical_patch) && outcome.patch_digest !== patchDigest(outcome.canonical_patch)) {
    addError(errors, "patch_outcome.patch_digest.mismatch", pointer(path, "patch_digest"), "patch_digest does not match canonical_patch.");
  }
}

function validateReceiptInto(receipt, path, request, errors) {
  const receiptFields = request.consensus_strategy === "isolated_patch_consensus"
    ? ISOLATED_RECEIPT_FIELDS
    : SEMANTIC_RECEIPT_FIELDS;
  if (!validateClosedObject(receipt, path, receiptFields, errors, "session_receipt")) {
    return;
  }
  for (const field of ["request_id", "session_id"]) {
    if (Object.hasOwn(receipt, field) && !isNonEmptyString(receipt[field])) {
      addError(errors, `session_receipt.${field}.invalid`, pointer(path, field), "Expected a non-empty string.");
    }
  }
  if (Object.hasOwn(receipt, "session_index")
    && (!Number.isInteger(receipt.session_index) || receipt.session_index < 1 || receipt.session_index > EXPECTED_SESSION_COUNT)) {
    addError(errors, "session_receipt.session_index.invalid", pointer(path, "session_index"), "session_index must be an integer from 1 to 10.");
  }
  if (Object.hasOwn(receipt, "observed_state_snapshot")) {
    validateStateSnapshot(receipt.observed_state_snapshot, pointer(path, "observed_state_snapshot"), errors);
  }
  if (request.consensus_strategy === "isolated_patch_consensus" && Object.hasOwn(receipt, "observed_baseline")) {
    validatePlainJson(receipt.observed_baseline, pointer(path, "observed_baseline"), errors, "observed_baseline.type");
  }
  if (Object.hasOwn(receipt, "observed_invocation_specification")) {
    validateInvocationSpecification(receipt.observed_invocation_specification, pointer(path, "observed_invocation_specification"), errors);
  }
  if (Object.hasOwn(receipt, "status") && !["usable", "blocked", "timeout", "environment_mismatch"].includes(receipt.status)) {
    addError(errors, "session_receipt.status.invalid", pointer(path, "status"), "Unsupported receipt status.");
  }
  if (Object.hasOwn(receipt, "outcome")) {
    validatePlainJson(receipt.outcome, pointer(path, "outcome"), errors, "session_receipt.outcome.type");
    if (request.consensus_strategy === "isolated_patch_consensus" && isPlainObject(receipt.outcome)) {
      validatePatchOutcome(receipt.outcome, pointer(path, "outcome"), errors);
    }
  }
  if (Object.hasOwn(receipt, "external_side_effects")) {
    if (!Array.isArray(receipt.external_side_effects)) {
      addError(errors, "external_side_effects.type", pointer(path, "external_side_effects"), "external_side_effects must be an array.");
    } else {
      validateJsonCompatible(receipt.external_side_effects, pointer(path, "external_side_effects"), errors);
    }
  }
  if (request.consensus_strategy === "isolated_patch_consensus") {
    if (!isNonEmptyString(receipt.workspace_id)) {
      addError(errors, "workspace_id.required", pointer(path, "workspace_id"), "isolated_patch_consensus requires a workspace_id.");
    }
  }
}

function semanticEqual(left, right) {
  if (left === right) {
    return true;
  }
  if (left === null || right === null || typeof left !== "object" || typeof right !== "object") {
    return false;
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right)
      && left.length === right.length
      && left.every((item, index) => semanticEqual(item, right[index]));
  }
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  return leftKeys.length === rightKeys.length
    && leftKeys.every((key, index) => key === rightKeys[index] && semanticEqual(left[key], right[key]));
}

export function normalizeConsensusOutcome(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeConsensusOutcome);
  }
  if (isPlainObject(value)) {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, normalizeConsensusOutcome(value[key])]));
  }
  return value;
}

function requestIdFrom(request) {
  return isPlainObject(request) && isNonEmptyString(request.request_id) ? request.request_id : null;
}

function stopped(requestId, reason, receiptCount, errors) {
  return { request_id: requestId, status: "stopped", reason, receipt_count: receiptCount, errors };
}

export function validateValidationRequest(request) {
  try {
    const errors = [];
    validateRequestInto(request, "", errors);
    return { valid: errors.length === 0, errors };
  } catch {
    return { valid: false, errors: [{ code: "validation_mode.internal", path: "", message: "Validation request could not be inspected." }] };
  }
}

export function validateValidationSessionReceipt(receipt, request) {
  try {
    const errors = [];
    validateReceiptInto(receipt, "", request, errors);
    return { valid: errors.length === 0, errors };
  } catch {
    return { valid: false, errors: [{ code: "validation_mode.internal", path: "", message: "Session receipt could not be inspected." }] };
  }
}

export function compareValidationResults(request, receipts) {
  try {
    const requestValidation = validateValidationRequest(request);
    if (!requestValidation.valid) {
      return stopped(requestIdFrom(request), "invalid_request", Array.isArray(receipts) ? receipts.length : 0, requestValidation.errors);
    }
    if (!Array.isArray(receipts)) {
      return stopped(request.request_id, "invalid_receipts", 0, [{ code: "receipts.type", path: "/receipts", message: "Expected an array of session receipts." }]);
    }

    const errors = [];
    if (receipts.length !== EXPECTED_SESSION_COUNT) {
      addError(errors, "receipts.count.invalid", "/receipts", "Exactly 10 session receipts are required.");
    }
    const entries = receipts.map((value, inputIndex) => ({ value, inputIndex })).sort((left, right) => {
      const leftIndex = Number.isInteger(left.value?.session_index) ? left.value.session_index : Number.POSITIVE_INFINITY;
      const rightIndex = Number.isInteger(right.value?.session_index) ? right.value.session_index : Number.POSITIVE_INFINITY;
      return leftIndex - rightIndex || left.inputIndex - right.inputIndex;
    });
    const indices = new Map();
    const plannedSlots = request.consensus_strategy === "isolated_patch_consensus"
      ? new Map(request.planned_session_slots.map((slot) => [slot.session_index, slot]))
      : new Map();
    const sessionIds = new Set();
    const workspaceIds = new Set();
    let environmentMismatch = false;
    let sessionFailure = false;

    for (const entry of entries) {
      const index = Number.isInteger(entry.value?.session_index) ? entry.value.session_index : `input-${entry.inputIndex}`;
      const path = `/receipts/${index}`;
      validateReceiptInto(entry.value, path, request, errors);
      if (!isPlainObject(entry.value)) {
        continue;
      }
      const receipt = entry.value;
      if (Number.isInteger(receipt.session_index) && receipt.session_index >= 1 && receipt.session_index <= EXPECTED_SESSION_COUNT) {
        if (indices.has(receipt.session_index)) {
          addError(errors, "session_index.duplicate", pointer(path, "session_index"), `Duplicate session_index: ${receipt.session_index}.`);
        } else {
          indices.set(receipt.session_index, receipt);
        }
      }
      if (isNonEmptyString(receipt.session_id)) {
        if (sessionIds.has(receipt.session_id)) {
          addError(errors, "session_id.duplicate", pointer(path, "session_id"), `Duplicate session_id: ${receipt.session_id}.`);
        }
        sessionIds.add(receipt.session_id);
      }
      if (request.consensus_strategy === "isolated_patch_consensus" && isNonEmptyString(receipt.workspace_id)) {
        if (workspaceIds.has(receipt.workspace_id)) {
          addError(errors, "workspace_id.duplicate", pointer(path, "workspace_id"), `Duplicate workspace_id: ${receipt.workspace_id}.`);
        }
        workspaceIds.add(receipt.workspace_id);
      }
      const plannedSlot = plannedSlots.get(receipt.session_index);
      if (plannedSlot) {
        if (plannedSlot.planned_execution_session_id !== PENDING_TOOL_ISSUED
          && receipt.session_id !== plannedSlot.planned_execution_session_id) {
          addError(errors, "session_receipt.session_id.planned_mismatch", pointer(path, "session_id"), "Receipt session_id must match its known planned session slot.");
        }
        if (plannedSlot.planned_workspace_id !== PENDING_TOOL_ISSUED
          && receipt.workspace_id !== plannedSlot.planned_workspace_id) {
          addError(errors, "session_receipt.workspace_id.planned_mismatch", pointer(path, "workspace_id"), "Receipt workspace_id must match its known planned session slot.");
        }
      }
      if (receipt.request_id !== request.request_id) {
        addError(errors, "session_receipt.request_id.mismatch", pointer(path, "request_id"), "Receipt request_id must match the validation request.");
      }
      const baselineMismatch = request.consensus_strategy === "isolated_patch_consensus"
        && !semanticEqual(receipt.observed_baseline, request.baseline);
      if (!semanticEqual(receipt.observed_state_snapshot, request.state_snapshot)
        || baselineMismatch
        || !semanticEqual(receipt.observed_invocation_specification, request.invocation_specification)
        || receipt.status === "environment_mismatch") {
        environmentMismatch = true;
        addError(errors, "session_receipt.environment.mismatch", path, "Session environment must match the fixed request.");
      }
      if (["blocked", "timeout"].includes(receipt.status)) {
        sessionFailure = true;
        addError(errors, `session_receipt.status.${receipt.status}`, pointer(path, "status"), "Every session must return a usable outcome.");
      }
      if (Array.isArray(receipt.external_side_effects) && receipt.external_side_effects.length > 0) {
        addError(errors, "external_side_effects.nonempty", pointer(path, "external_side_effects"), "Consensus sessions must not change primary or external state.");
      }
    }
    for (let index = 1; index <= EXPECTED_SESSION_COUNT; index += 1) {
      if (!indices.has(index)) {
        addError(errors, "session_index.missing", `/receipts/${index}/session_index`, `Missing session_index: ${index}.`);
      }
    }
    if (errors.length > 0) {
      const reason = environmentMismatch ? "environment_mismatch" : sessionFailure ? "session_failed" : "invalid_receipts";
      return stopped(request.request_id, reason, receipts.length, errors);
    }

    const reference = indices.get(1);
    for (let index = 2; index <= EXPECTED_SESSION_COUNT; index += 1) {
      if (!semanticEqual(indices.get(index).outcome, reference.outcome)) {
        addError(errors, "comparison.outcome.mismatch", `/receipts/${index}/outcome`, "Normalized full outcome differs from session_index 1.");
      }
    }
    if (errors.length > 0) {
      return stopped(request.request_id, "not_unanimous", receipts.length, errors);
    }

    const unanimousOutcome = normalizeConsensusOutcome(reference.outcome);
    const consensusReceipt = {
      session_ids: [...indices.values()].map((receipt) => receipt.session_id),
    };
    if (request.consensus_strategy === "isolated_patch_consensus") {
      consensusReceipt.workspace_ids = [...indices.values()].map((receipt) => receipt.workspace_id);
    }
    return {
      request_id: request.request_id,
      status: "pass",
      reason: "unanimous",
      consensus_strategy: request.consensus_strategy,
      unanimous_outcome: unanimousOutcome,
      consensus_receipt: consensusReceipt,
      receipt_count: EXPECTED_SESSION_COUNT,
      errors: [],
    };
  } catch {
    return stopped(requestIdFrom(request), "invalid_receipts", Array.isArray(receipts) ? receipts.length : 0, [{
      code: "validation_mode.internal",
      path: "",
      message: "Validation receipts could not be compared.",
    }]);
  }
}

export const compareValidationReceipts = compareValidationResults;
