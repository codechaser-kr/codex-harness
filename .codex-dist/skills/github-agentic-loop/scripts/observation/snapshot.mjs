import { createHash } from "node:crypto";

export const OBSERVATION_SNAPSHOT_TYPE = "content_addressed_observation_snapshot";
export const OBSERVATION_SNAPSHOT_FORMAT_VERSION = "1";
export const OBSERVATION_SOURCE_TYPES = Object.freeze([
  "github_issue",
  "github_pull_request",
  "local_repository",
]);

const INPUT_FIELDS = ["repository", "captured_at", "sources"];
const PREPARED_FIELDS = [
  "snapshot_type",
  "format_version",
  "input_snapshot_digest",
  ...INPUT_FIELDS,
];
const SOURCE_FIELDS = [
  "source_type",
  "source_identifier",
  "github_updated_at",
  "body_digest",
  "base_sha",
  "head_sha",
  "worktree_state_digest",
  "observed_value",
];
const SHA256_DIGEST = /^sha256:[0-9a-f]{64}$/;
const GIT_OBJECT_ID = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/;
const ISO_UTC_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const FORBIDDEN_JSON_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function isPlainObject(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function pointerSegment(value) {
  return String(value).replaceAll("~", "~0").replaceAll("/", "~1");
}

function addError(errors, code, path, message) {
  errors.push({ code, path, message });
}

function deepFreeze(value) {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function validateClosedObject(value, fields, context, path, errors) {
  if (!isPlainObject(value)) {
    addError(errors, `${context}.type`, path, `${context} must be a plain object.`);
    return false;
  }

  const allowed = new Set(fields);
  for (const key of Object.keys(value).sort()) {
    if (!allowed.has(key)) {
      addError(
        errors,
        `${context}.additional_property`,
        `${path}/${pointerSegment(key)}`,
        `Unexpected ${context} property: ${key}.`,
      );
    }
  }
  for (const field of fields) {
    if (!Object.hasOwn(value, field)) {
      addError(
        errors,
        `${context}.required`,
        `${path}/${field}`,
        `Missing ${context} property: ${field}.`,
      );
    }
  }
  return true;
}

function validTimestamp(value) {
  if (typeof value !== "string" || !ISO_UTC_TIMESTAMP.test(value)) return false;

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return false;

  const canonicalValue = value.includes(".")
    ? value
    : `${value.slice(0, -1)}.000Z`;
  return new Date(timestamp).toISOString() === canonicalValue;
}

function validateNonBlankString(value, code, path, label, errors) {
  if (typeof value !== "string") {
    addError(errors, `${code}.type`, path, `${label} must be a string.`);
  } else if (value.trim().length === 0) {
    addError(errors, `${code}.empty`, path, `${label} must not be blank.`);
  }
}

function validateNullable(value, predicate, code, path, message, errors) {
  if (value !== null && !predicate(value)) addError(errors, code, path, message);
}

function digestText(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function canonicalizeJson(value, path, errors, seen = new WeakSet()) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      addError(errors, "observation_snapshot.observed_value.number.invalid", path, "Observed JSON numbers must be finite.");
      return null;
    }
    return value;
  }
  if (typeof value !== "object") {
    addError(errors, "observation_snapshot.observed_value.type", path, "Observed values must contain only JSON-compatible values.");
    return null;
  }
  if (seen.has(value)) {
    addError(errors, "observation_snapshot.observed_value.cycle", path, "Observed values must not contain cycles.");
    return null;
  }
  seen.add(value);

  if (Array.isArray(value)) {
    const result = value.map((item, index) => canonicalizeJson(item, `${path}/${index}`, errors, seen));
    seen.delete(value);
    return result;
  }
  if (!isPlainObject(value)) {
    addError(errors, "observation_snapshot.observed_value.object.invalid", path, "Observed JSON objects must be plain objects.");
    seen.delete(value);
    return null;
  }

  const result = {};
  for (const key of Object.keys(value).sort()) {
    const childPath = `${path}/${pointerSegment(key)}`;
    if (FORBIDDEN_JSON_KEYS.has(key)) {
      addError(errors, "observation_snapshot.observed_value.key.forbidden", childPath, `Observed JSON key is not allowed: ${key}.`);
      continue;
    }
    Object.defineProperty(result, key, {
      value: canonicalizeJson(value[key], childPath, errors, seen),
      enumerable: true,
      configurable: true,
      writable: true,
    });
  }
  seen.delete(value);
  return result;
}

function validateSource(source, index, context, errors) {
  const path = `/sources/${index}`;
  if (!validateClosedObject(source, SOURCE_FIELDS, `${context}.source`, path, errors)) return;

  if (Object.hasOwn(source, "source_type")) {
    if (typeof source.source_type !== "string" || !OBSERVATION_SOURCE_TYPES.includes(source.source_type)) {
      addError(errors, `${context}.source.source_type.invalid`, `${path}/source_type`, "source_type is not supported.");
    }
  }
  if (Object.hasOwn(source, "source_identifier")) {
    validateNonBlankString(
      source.source_identifier,
      `${context}.source.source_identifier`,
      `${path}/source_identifier`,
      "source_identifier",
      errors,
    );
  }
  if (Object.hasOwn(source, "github_updated_at")) {
    validateNullable(
      source.github_updated_at,
      validTimestamp,
      `${context}.source.github_updated_at.invalid`,
      `${path}/github_updated_at`,
      "github_updated_at must be null or an ISO UTC timestamp.",
      errors,
    );
  }
  for (const field of ["body_digest", "worktree_state_digest"]) {
    if (!Object.hasOwn(source, field)) continue;
    validateNullable(
      source[field],
      (value) => typeof value === "string" && SHA256_DIGEST.test(value),
      `${context}.source.${field}.invalid`,
      `${path}/${field}`,
      `${field} must be null or a sha256 digest.`,
      errors,
    );
  }
  for (const field of ["base_sha", "head_sha"]) {
    if (!Object.hasOwn(source, field)) continue;
    validateNullable(
      source[field],
      (value) => typeof value === "string" && GIT_OBJECT_ID.test(value),
      `${context}.source.${field}.invalid`,
      `${path}/${field}`,
      `${field} must be null or a lowercase Git object ID.`,
      errors,
    );
  }
  if (Object.hasOwn(source, "observed_value")) {
    if (!isPlainObject(source.observed_value) || Object.keys(source.observed_value).length === 0) {
      addError(
        errors,
        `${context}.source.observed_value.invalid`,
        `${path}/observed_value`,
        "observed_value must be a non-empty plain JSON object.",
      );
    } else {
      canonicalizeJson(source.observed_value, `${path}/observed_value`, errors);
    }
  }

  if (!OBSERVATION_SOURCE_TYPES.includes(source.source_type)) return;
  const typeRules = {
    github_issue: {
      required: ["github_updated_at", "body_digest"],
      nulls: ["base_sha", "head_sha", "worktree_state_digest"],
    },
    github_pull_request: {
      required: ["github_updated_at", "body_digest", "base_sha", "head_sha"],
      nulls: ["worktree_state_digest"],
    },
    local_repository: {
      required: ["head_sha", "worktree_state_digest"],
      nulls: ["github_updated_at", "body_digest", "base_sha"],
    },
  }[source.source_type];
  for (const field of typeRules.required) {
    if (source[field] === null) {
      addError(
        errors,
        `${context}.source.${source.source_type}.${field}.required`,
        `${path}/${field}`,
        `${field} is required for ${source.source_type}.`,
      );
    }
  }
  for (const field of typeRules.nulls) {
    if (source[field] !== null) {
      addError(
        errors,
        `${context}.source.${source.source_type}.${field}.forbidden`,
        `${path}/${field}`,
        `${field} must be null for ${source.source_type}.`,
      );
    }
  }

  const observed = source.observed_value;
  if (!isPlainObject(observed)) return;
  if (source.source_type === "github_issue" || source.source_type === "github_pull_request") {
    if (typeof observed.body !== "string") {
      addError(
        errors,
        `${context}.source.${source.source_type}.observed_body.required`,
        `${path}/observed_value/body`,
        `observed_value.body must be a string for ${source.source_type}.`,
      );
    } else if (typeof source.body_digest === "string" && source.body_digest !== digestText(observed.body)) {
      addError(
        errors,
        `${context}.source.${source.source_type}.body_digest.mismatch`,
        `${path}/body_digest`,
        "body_digest does not match observed_value.body.",
      );
    }
    if (observed.updatedAt !== source.github_updated_at) {
      addError(
        errors,
        `${context}.source.${source.source_type}.github_updated_at.mismatch`,
        `${path}/github_updated_at`,
        "github_updated_at does not match observed_value.updatedAt.",
      );
    }
  }
  if (source.source_type === "github_pull_request") {
    for (const [field, observedField] of [["base_sha", "baseRefOid"], ["head_sha", "headRefOid"]]) {
      if (observed[observedField] !== source[field]) {
        addError(
          errors,
          `${context}.source.github_pull_request.${field}.mismatch`,
          `${path}/${field}`,
          `${field} does not match observed_value.${observedField}.`,
        );
      }
    }
  }
  if (source.source_type === "local_repository") {
    if (observed.head !== source.head_sha) {
      addError(
        errors,
        `${context}.source.local_repository.head_sha.mismatch`,
        `${path}/head_sha`,
        "head_sha does not match observed_value.head.",
      );
    }
    if (typeof observed.worktree !== "string") {
      addError(
        errors,
        `${context}.source.local_repository.observed_worktree.required`,
        `${path}/observed_value/worktree`,
        "observed_value.worktree must be a string for local_repository.",
      );
    } else if (typeof source.worktree_state_digest === "string"
      && source.worktree_state_digest !== digestText(observed.worktree)) {
      addError(
        errors,
        `${context}.source.local_repository.worktree_state_digest.mismatch`,
        `${path}/worktree_state_digest`,
        "worktree_state_digest does not match observed_value.worktree.",
      );
    }
  }
}

function validateInputFields(value, context, errors) {
  if (Object.hasOwn(value, "repository")) {
    validateNonBlankString(value.repository, `${context}.repository`, "/repository", "repository", errors);
  }
  if (Object.hasOwn(value, "captured_at") && !validTimestamp(value.captured_at)) {
    addError(errors, `${context}.captured_at.invalid`, "/captured_at", "captured_at must be an ISO UTC timestamp.");
  }
  if (!Object.hasOwn(value, "sources")) return;
  if (!Array.isArray(value.sources) || value.sources.length === 0) {
    addError(errors, `${context}.sources.invalid`, "/sources", "sources must be a non-empty array.");
    return;
  }

  const identities = new Map();
  value.sources.forEach((source, index) => {
    validateSource(source, index, context, errors);
    if (!isPlainObject(source)
      || typeof source.source_type !== "string"
      || typeof source.source_identifier !== "string") return;
    const identity = `${source.source_type}\u0000${source.source_identifier}`;
    if (identities.has(identity)) {
      addError(
        errors,
        `${context}.source.identity.duplicate`,
        `/sources/${index}/source_identifier`,
        `Duplicate source identity also appears at /sources/${identities.get(identity)}.`,
      );
    } else {
      identities.set(identity, index);
    }
  });
}

function validateSourceInput(value) {
  const errors = [];
  if (!validateClosedObject(value, INPUT_FIELDS, "observation_snapshot_input", "", errors)) return errors;
  validateInputFields(value, "observation_snapshot_input", errors);
  return errors;
}

function validatePreparedInput(value) {
  const errors = [];
  if (!validateClosedObject(value, PREPARED_FIELDS, "prepared_observation_snapshot", "", errors)) return errors;
  if (Object.hasOwn(value, "snapshot_type") && value.snapshot_type !== OBSERVATION_SNAPSHOT_TYPE) {
    addError(errors, "prepared_observation_snapshot.snapshot_type.mismatch", "/snapshot_type", "snapshot_type is not supported.");
  }
  if (Object.hasOwn(value, "format_version") && value.format_version !== OBSERVATION_SNAPSHOT_FORMAT_VERSION) {
    addError(errors, "prepared_observation_snapshot.format_version.mismatch", "/format_version", "format_version is not supported.");
  }
  if (Object.hasOwn(value, "input_snapshot_digest")
    && (typeof value.input_snapshot_digest !== "string" || !SHA256_DIGEST.test(value.input_snapshot_digest))) {
    addError(
      errors,
      "prepared_observation_snapshot.input_snapshot_digest.invalid",
      "/input_snapshot_digest",
      "input_snapshot_digest must be a sha256 digest.",
    );
  }
  validateInputFields(value, "prepared_observation_snapshot", errors);
  return errors;
}

function compareUtf16CodeUnits(left, right) {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

function canonicalSources(sources) {
  return sources
    .map((source, index) => ({
      source_type: source.source_type,
      source_identifier: source.source_identifier,
      github_updated_at: source.github_updated_at,
      body_digest: source.body_digest,
      base_sha: source.base_sha,
      head_sha: source.head_sha,
      worktree_state_digest: source.worktree_state_digest,
      observed_value: canonicalizeJson(source.observed_value, `/sources/${index}/observed_value`, []),
    }))
    .sort((left, right) => compareUtf16CodeUnits(left.source_type, right.source_type)
      || compareUtf16CodeUnits(left.source_identifier, right.source_identifier));
}

function digestPayload(input) {
  return {
    snapshot_type: OBSERVATION_SNAPSHOT_TYPE,
    format_version: OBSERVATION_SNAPSHOT_FORMAT_VERSION,
    repository: input.repository,
    captured_at: input.captured_at,
    sources: canonicalSources(input.sources),
  };
}

export function computeObservationSnapshotDigest(input) {
  return `sha256:${createHash("sha256").update(JSON.stringify(digestPayload(input))).digest("hex")}`;
}

function buildPreparedSnapshot(input) {
  const payload = digestPayload(input);
  return deepFreeze({
    snapshot_type: payload.snapshot_type,
    format_version: payload.format_version,
    input_snapshot_digest: computeObservationSnapshotDigest(payload),
    repository: payload.repository,
    captured_at: payload.captured_at,
    sources: payload.sources,
  });
}

function stopped(reason, errors) {
  return deepFreeze({
    status: "stopped",
    reason,
    preparation: null,
    observation_snapshot: null,
    errors,
  });
}

export function prepareObservationSnapshot(input) {
  const errors = validateSourceInput(input);
  if (errors.length > 0) return stopped("invalid_observation_snapshot_input", errors);
  return deepFreeze({
    status: "prepared",
    reason: null,
    preparation: "prepared",
    observation_snapshot: buildPreparedSnapshot(input),
    errors: [],
  });
}

export function loadObservationSnapshot(input, { preparedSnapshot } = {}) {
  const expected = prepareObservationSnapshot(input);
  if (expected.status === "stopped") return expected;
  if (preparedSnapshot === undefined) return expected;

  const errors = validatePreparedInput(preparedSnapshot);
  if (errors.length > 0) return stopped("invalid_prepared_observation_snapshot", errors);

  const embeddedDigest = computeObservationSnapshotDigest(preparedSnapshot);
  if (preparedSnapshot.input_snapshot_digest !== embeddedDigest) {
    addError(
      errors,
      "prepared_observation_snapshot.embedded_digest.mismatch",
      "/input_snapshot_digest",
      "Prepared observation snapshot does not match its embedded digest.",
    );
  }
  if (preparedSnapshot.input_snapshot_digest !== expected.observation_snapshot.input_snapshot_digest) {
    addError(
      errors,
      "prepared_observation_snapshot.source_digest.mismatch",
      "/input_snapshot_digest",
      "Prepared observation snapshot does not match the current source input.",
    );
  }
  if (errors.length > 0) return stopped("invalid_prepared_observation_snapshot", errors);

  return deepFreeze({
    status: "loaded",
    reason: null,
    preparation: "reused",
    observation_snapshot: expected.observation_snapshot,
    errors: [],
  });
}
