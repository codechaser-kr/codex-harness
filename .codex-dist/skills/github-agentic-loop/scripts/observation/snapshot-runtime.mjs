import {
  OBSERVATION_SNAPSHOT_FORMAT_VERSION,
  OBSERVATION_SNAPSHOT_TYPE,
  loadObservationSnapshot,
  prepareObservationSnapshot,
} from "./snapshot.mjs";
import {
  addError,
  deepFreeze,
  isPlainObject,
  pointerSegment,
  validateClosedObject,
  validateNonBlankString,
} from "./validation.mjs";

export const OBSERVATION_SNAPSHOT_RUNTIME_TYPE = "evaluation_cycle_observation_snapshot_runtime";
export const OBSERVATION_SNAPSHOT_RUNTIME_FORMAT_VERSION = "1";
export const OBSERVATION_SNAPSHOT_CONSUMER_INPUT_TYPE = "observation_snapshot_consumer_input";

const RUNTIME_FIELDS = [
  "runtime_type",
  "format_version",
  "request_id",
  "input_snapshot_digest",
  "observation_snapshot",
];
const IDENTITY_FIELDS = ["source_type", "source_identifier"];

function prefixErrors(errors, prefix) {
  return errors.map((error) => ({
    ...error,
    path: `${prefix}${error.path}`,
  }));
}

function snapshotInputFrom(snapshot) {
  return {
    repository: snapshot.repository,
    captured_at: snapshot.captured_at,
    sources: snapshot.sources,
  };
}

function stopped(reason, errors) {
  return deepFreeze({
    status: "stopped",
    reason,
    preparation: null,
    runtime: null,
    errors,
  });
}

function consumerStopped(reason, errors) {
  return deepFreeze({
    status: "stopped",
    reason,
    consumer_input: null,
    errors,
  });
}

function buildRuntime(requestId, observationSnapshot) {
  return deepFreeze({
    runtime_type: OBSERVATION_SNAPSHOT_RUNTIME_TYPE,
    format_version: OBSERVATION_SNAPSHOT_RUNTIME_FORMAT_VERSION,
    request_id: requestId,
    input_snapshot_digest: observationSnapshot.input_snapshot_digest,
    observation_snapshot: observationSnapshot,
  });
}

function preparedSnapshotResult(requestId, observationSnapshot, preparation) {
  return deepFreeze({
    status: "prepared",
    reason: null,
    preparation,
    runtime: buildRuntime(requestId, observationSnapshot),
    errors: [],
  });
}

function preparedResult(requestId, observationInput, preparation) {
  const prepared = prepareObservationSnapshot(observationInput);
  if (prepared.status === "stopped") {
    return stopped(prepared.reason, prepared.errors);
  }
  return preparedSnapshotResult(requestId, prepared.observation_snapshot, preparation);
}

function loadPreparedCurrentSnapshot(currentSnapshot, cachedSnapshot) {
  if (cachedSnapshot.input_snapshot_digest !== currentSnapshot.input_snapshot_digest) {
    return deepFreeze({
      status: "source_changed",
      reason: null,
      preparation: "source_changed",
      observation_snapshot: currentSnapshot,
      errors: [],
    });
  }

  return deepFreeze({
    status: "loaded",
    reason: null,
    preparation: "reused",
    observation_snapshot: currentSnapshot,
    errors: [],
  });
}

function validateRuntimeShape(runtime) {
  const errors = [];
  if (!validateClosedObject(runtime, RUNTIME_FIELDS, "observation_snapshot_runtime", "", errors)) {
    return errors;
  }
  if (runtime.runtime_type !== OBSERVATION_SNAPSHOT_RUNTIME_TYPE) {
    addError(
      errors,
      "observation_snapshot_runtime.runtime_type.mismatch",
      "/runtime_type",
      "runtime_type is not supported.",
    );
  }
  if (runtime.format_version !== OBSERVATION_SNAPSHOT_RUNTIME_FORMAT_VERSION) {
    addError(
      errors,
      "observation_snapshot_runtime.format_version.mismatch",
      "/format_version",
      "format_version is not supported.",
    );
  }
  validateNonBlankString(
    runtime.request_id,
    "observation_snapshot_runtime.request_id",
    "/request_id",
    "request_id",
    errors,
  );
  validateNonBlankString(
    runtime.input_snapshot_digest,
    "observation_snapshot_runtime.input_snapshot_digest",
    "/input_snapshot_digest",
    "input_snapshot_digest",
    errors,
  );
  if (!isPlainObject(runtime.observation_snapshot)) {
    addError(
      errors,
      "observation_snapshot_runtime.observation_snapshot.type",
      "/observation_snapshot",
      "observation_snapshot must be a plain object.",
    );
  }
  return errors;
}

function validateRuntimeIntegrity(runtime) {
  const errors = validateRuntimeShape(runtime);
  if (errors.length > 0) return errors;

  const snapshot = runtime.observation_snapshot;
  const loaded = loadObservationSnapshot(snapshotInputFrom(snapshot), { preparedSnapshot: snapshot });
  if (loaded.status === "stopped") {
    errors.push(...prefixErrors(loaded.errors, "/observation_snapshot"));
    return errors;
  }
  if (snapshot.snapshot_type !== OBSERVATION_SNAPSHOT_TYPE
    || snapshot.format_version !== OBSERVATION_SNAPSHOT_FORMAT_VERSION) {
    addError(
      errors,
      "observation_snapshot_runtime.observation_snapshot.version.mismatch",
      "/observation_snapshot",
      "observation_snapshot type or format version is not supported.",
    );
  }
  if (runtime.input_snapshot_digest !== snapshot.input_snapshot_digest) {
    addError(
      errors,
      "observation_snapshot_runtime.input_snapshot_digest.mismatch",
      "/input_snapshot_digest",
      "Runtime digest does not match observation_snapshot.input_snapshot_digest.",
    );
  }
  return errors;
}

export function prepareObservationSnapshotRuntime(input = {}) {
  const errors = [];
  if (!validateClosedObject(
    input,
    ["request_id", "observation_input"],
    "observation_snapshot_runtime_input",
    "",
    errors,
  )) {
    return stopped("invalid_observation_snapshot_runtime_input", errors);
  }
  const requestId = input.request_id;
  const observationInput = input.observation_input;
  validateNonBlankString(
    requestId,
    "observation_snapshot_runtime_input.request_id",
    "/request_id",
    "request_id",
    errors,
  );
  if (errors.length > 0) return stopped("invalid_observation_snapshot_runtime_input", errors);
  return preparedResult(requestId, observationInput, "prepared");
}

export function loadObservationSnapshotRuntime(
  input = {},
  { cachedRuntime } = {},
) {
  const current = prepareObservationSnapshotRuntime(input);
  if (current.status === "stopped" || cachedRuntime === undefined) return current;
  const requestId = input.request_id;
  const observationInput = input.observation_input;

  const integrityErrors = validateRuntimeIntegrity(cachedRuntime);
  if (integrityErrors.length > 0) {
    return stopped("invalid_cached_observation_snapshot_runtime", integrityErrors);
  }

  if (cachedRuntime.request_id !== requestId) {
    return preparedSnapshotResult(requestId, current.runtime.observation_snapshot, "request_changed");
  }

  const loaded = loadPreparedCurrentSnapshot(
    current.runtime.observation_snapshot,
    cachedRuntime.observation_snapshot,
  );
  if (loaded.status === "loaded") {
    return deepFreeze({
      status: "loaded",
      reason: null,
      preparation: "reused",
      runtime: buildRuntime(requestId, loaded.observation_snapshot),
      errors: [],
    });
  }

  if (loaded.status === "source_changed") {
    return preparedSnapshotResult(requestId, loaded.observation_snapshot, loaded.preparation);
  }
  return stopped("invalid_cached_observation_snapshot_runtime", prefixErrors(loaded.errors, "/observation_snapshot"));
}

function validateSourceIdentities(sourceIdentities) {
  const errors = [];
  if (!Array.isArray(sourceIdentities) || sourceIdentities.length === 0) {
    addError(
      errors,
      "observation_snapshot_consumer.source_identities.invalid",
      "/source_identities",
      "source_identities must be a non-empty array.",
    );
    return errors;
  }

  const seen = new Set();
  sourceIdentities.forEach((identity, index) => {
    const path = `/source_identities/${index}`;
    if (!validateClosedObject(identity, IDENTITY_FIELDS, "observation_snapshot_consumer.source_identity", path, errors)) {
      return;
    }
    validateNonBlankString(
      identity.source_type,
      "observation_snapshot_consumer.source_type",
      `${path}/source_type`,
      "source_type",
      errors,
    );
    validateNonBlankString(
      identity.source_identifier,
      "observation_snapshot_consumer.source_identifier",
      `${path}/source_identifier`,
      "source_identifier",
      errors,
    );
    const key = `${identity.source_type}\u0000${identity.source_identifier}`;
    if (seen.has(key)) {
      addError(
        errors,
        "observation_snapshot_consumer.source_identity.duplicate",
        `${path}/source_identifier`,
        "source identity must be unique.",
      );
    }
    seen.add(key);
  });
  return errors;
}

export function createObservationSnapshotConsumerInput(
  runtime,
  { request_id: requestId, source_identities: sourceIdentities } = {},
) {
  const errors = validateRuntimeIntegrity(runtime);
  validateNonBlankString(
    requestId,
    "observation_snapshot_consumer.request_id",
    "/request_id",
    "request_id",
    errors,
  );
  errors.push(...validateSourceIdentities(sourceIdentities));
  if (errors.length > 0) return consumerStopped("invalid_observation_snapshot_consumer_input", errors);

  if (runtime.request_id !== requestId) {
    return consumerStopped("stale_observation_snapshot_consumer_input", [{
      code: "observation_snapshot_consumer.request_id.mismatch",
      path: "/request_id",
      message: "Consumer request_id does not match the evaluation-cycle runtime.",
    }]);
  }

  const sourceLookup = new Map(runtime.observation_snapshot.sources.map((source) => [
    `${source.source_type}\u0000${source.source_identifier}`,
    source,
  ]));
  const selected = [];
  sourceIdentities.forEach((identity, index) => {
    const source = sourceLookup.get(`${identity.source_type}\u0000${identity.source_identifier}`);
    if (source === undefined) {
      addError(
        errors,
        "observation_snapshot_consumer.source_identity.not_found",
        `/source_identities/${index}/source_identifier`,
        "Requested source identity is not present in the observation snapshot.",
      );
    } else {
      selected.push(source);
    }
  });
  if (errors.length > 0) return consumerStopped("invalid_observation_snapshot_consumer_input", errors);

  return deepFreeze({
    status: "ready",
    reason: null,
    consumer_input: {
      consumer_input_type: OBSERVATION_SNAPSHOT_CONSUMER_INPUT_TYPE,
      request_id: requestId,
      repository: runtime.observation_snapshot.repository,
      input_snapshot_digest: runtime.input_snapshot_digest,
      sources: selected,
    },
    errors: [],
  });
}
