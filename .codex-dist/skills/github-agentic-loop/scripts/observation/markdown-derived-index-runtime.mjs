import { createHash } from "node:crypto";

import {
  MARKDOWN_DERIVED_INDEX_PARSER_VERSION,
  loadMarkdownDerivedIndex,
  prepareMarkdownDerivedIndex,
  validateMarkdownDerivedIndexIntegrity,
} from "./markdown-derived-index.mjs";
import { createObservationSnapshotConsumerInput } from "./snapshot-runtime.mjs";
import {
  addError,
  deepFreeze,
  isPlainObject,
  validateClosedObject,
  validateNonBlankString,
} from "./validation.mjs";

export const MARKDOWN_DERIVED_INDEX_RUNTIME_TYPE = "evaluation_cycle_markdown_derived_index_runtime";
export const MARKDOWN_DERIVED_INDEX_RUNTIME_FORMAT_VERSION = "1";
export const MARKDOWN_DERIVED_INDEX_CONSUMER_INPUT_TYPE = "markdown_derived_index_consumer_input";

const SHA256_DIGEST = /^sha256:[0-9a-f]{64}$/;
const SOURCE_IDENTITY_FIELDS = ["source_type", "source_identifier"];
const INPUT_FIELDS = [
  "request_id",
  "observation_snapshot_runtime",
  "source_identity",
  "parser_version",
];
const RUNTIME_FIELDS = [
  "runtime_type",
  "format_version",
  "runtime_digest",
  "request_id",
  "input_snapshot_digest",
  "source_identity",
  "parser_version",
  "observation_snapshot_runtime",
  "markdown_index",
];
const CONSUMER_SELECTOR_FIELDS = [
  "request_id",
  "input_snapshot_digest",
  "source_identity",
  "index_digest",
];
const trustedRuntimes = new WeakSet();

function prefixErrors(errors, prefix) {
  return errors.map((error) => ({
    ...error,
    path: `${prefix}${error.path}`,
  }));
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

function validateDigest(value, context, path, label, errors) {
  if (typeof value !== "string" || !SHA256_DIGEST.test(value)) {
    addError(errors, `${context}.invalid`, path, `${label} must be a sha256 digest.`);
  }
}

function validateSourceIdentity(value, path, errors, context = "markdown_derived_index_runtime.source_identity") {
  if (!validateClosedObject(value, SOURCE_IDENTITY_FIELDS, context, path, errors)) return;
  validateNonBlankString(
    value.source_type,
    `${context}.source_type`,
    `${path}/source_type`,
    "source_type",
    errors,
  );
  validateNonBlankString(
    value.source_identifier,
    `${context}.source_identifier`,
    `${path}/source_identifier`,
    "source_identifier",
    errors,
  );
}

function sameSourceIdentity(left, right) {
  return left.source_type === right.source_type
    && left.source_identifier === right.source_identifier;
}

function runtimeDigestPayload(value) {
  return {
    runtime_type: MARKDOWN_DERIVED_INDEX_RUNTIME_TYPE,
    format_version: MARKDOWN_DERIVED_INDEX_RUNTIME_FORMAT_VERSION,
    request_id: value.request_id,
    input_snapshot_digest: value.input_snapshot_digest,
    source_identity: value.source_identity,
    parser_version: value.parser_version,
    index_digest: value.markdown_index.index_digest,
  };
}

export function computeMarkdownDerivedIndexRuntimeDigest(value) {
  return `sha256:${createHash("sha256").update(JSON.stringify(runtimeDigestPayload(value))).digest("hex")}`;
}

function buildRuntime(selected, markdownIndex) {
  const runtime = {
    runtime_type: MARKDOWN_DERIVED_INDEX_RUNTIME_TYPE,
    format_version: MARKDOWN_DERIVED_INDEX_RUNTIME_FORMAT_VERSION,
    runtime_digest: null,
    request_id: selected.request_id,
    input_snapshot_digest: selected.consumer_input.input_snapshot_digest,
    source_identity: {
      source_type: selected.source.source_type,
      source_identifier: selected.source.source_identifier,
    },
    parser_version: selected.parser_version,
    observation_snapshot_runtime: selected.observation_snapshot_runtime,
    markdown_index: markdownIndex,
  };
  runtime.runtime_digest = computeMarkdownDerivedIndexRuntimeDigest(runtime);
  const preparedRuntime = deepFreeze(runtime);
  trustedRuntimes.add(preparedRuntime);
  return preparedRuntime;
}

function readyResult(selected, markdownIndex, preparation, status = "prepared") {
  return deepFreeze({
    status,
    reason: null,
    preparation,
    runtime: buildRuntime(selected, markdownIndex),
    errors: [],
  });
}

function selectCurrentSource(input) {
  const errors = [];
  if (!validateClosedObject(input, INPUT_FIELDS, "markdown_derived_index_runtime_input", "", errors)) {
    return { status: "stopped", reason: "invalid_markdown_derived_index_runtime_input", errors };
  }
  validateNonBlankString(
    input.request_id,
    "markdown_derived_index_runtime_input.request_id",
    "/request_id",
    "request_id",
    errors,
  );
  validateSourceIdentity(
    input.source_identity,
    "/source_identity",
    errors,
    "markdown_derived_index_runtime_input.source_identity",
  );
  validateNonBlankString(
    input.parser_version,
    "markdown_derived_index_runtime_input.parser_version",
    "/parser_version",
    "parser_version",
    errors,
  );
  if (!isPlainObject(input.observation_snapshot_runtime)) {
    addError(
      errors,
      "markdown_derived_index_runtime_input.observation_snapshot_runtime.type",
      "/observation_snapshot_runtime",
      "observation_snapshot_runtime must be a plain object.",
    );
  }
  if (errors.length > 0) {
    return { status: "stopped", reason: "invalid_markdown_derived_index_runtime_input", errors };
  }

  const selected = createObservationSnapshotConsumerInput(input.observation_snapshot_runtime, {
    request_id: input.request_id,
    source_identities: [input.source_identity],
  });
  if (selected.status === "stopped") {
    return {
      status: "stopped",
      reason: "invalid_markdown_derived_index_runtime_input",
      errors: prefixErrors(selected.errors, "/observation_snapshot_runtime"),
    };
  }

  const source = selected.consumer_input.sources[0];
  if (!(["github_issue", "github_pull_request"].includes(source.source_type))) {
    addError(
      errors,
      "markdown_derived_index_runtime_input.source_type.unsupported",
      "/source_identity/source_type",
      "Markdown derived indexes require a GitHub issue or pull request source.",
    );
  }
  if (errors.length > 0) {
    return { status: "stopped", reason: "invalid_markdown_derived_index_runtime_input", errors };
  }

  return {
    status: "ready",
    request_id: input.request_id,
    parser_version: input.parser_version,
    observation_snapshot_runtime: input.observation_snapshot_runtime,
    consumer_input: selected.consumer_input,
    source,
  };
}

function prepareSelected(selected, preparation) {
  const prepared = prepareMarkdownDerivedIndex({
    body: selected.source.observed_value.body,
    body_digest: selected.source.body_digest,
    parser_version: selected.parser_version,
  });
  if (prepared.status === "stopped") {
    return stopped(
      "invalid_markdown_derived_index_runtime_input",
      prefixErrors(prepared.errors, "/markdown_index"),
    );
  }
  return readyResult(selected, prepared.markdown_index, preparation);
}

function validateRuntimeShape(runtime) {
  const errors = [];
  if (!validateClosedObject(runtime, RUNTIME_FIELDS, "markdown_derived_index_runtime", "", errors)) {
    return errors;
  }
  if (runtime.runtime_type !== MARKDOWN_DERIVED_INDEX_RUNTIME_TYPE) {
    addError(
      errors,
      "markdown_derived_index_runtime.runtime_type.mismatch",
      "/runtime_type",
      "runtime_type is not supported.",
    );
  }
  if (runtime.format_version !== MARKDOWN_DERIVED_INDEX_RUNTIME_FORMAT_VERSION) {
    addError(
      errors,
      "markdown_derived_index_runtime.format_version.mismatch",
      "/format_version",
      "format_version is not supported.",
    );
  }
  validateDigest(
    runtime.runtime_digest,
    "markdown_derived_index_runtime.runtime_digest",
    "/runtime_digest",
    "runtime_digest",
    errors,
  );
  validateNonBlankString(
    runtime.request_id,
    "markdown_derived_index_runtime.request_id",
    "/request_id",
    "request_id",
    errors,
  );
  validateDigest(
    runtime.input_snapshot_digest,
    "markdown_derived_index_runtime.input_snapshot_digest",
    "/input_snapshot_digest",
    "input_snapshot_digest",
    errors,
  );
  validateSourceIdentity(runtime.source_identity, "/source_identity", errors);
  validateNonBlankString(
    runtime.parser_version,
    "markdown_derived_index_runtime.parser_version",
    "/parser_version",
    "parser_version",
    errors,
  );
  if (!isPlainObject(runtime.observation_snapshot_runtime)) {
    addError(
      errors,
      "markdown_derived_index_runtime.observation_snapshot_runtime.type",
      "/observation_snapshot_runtime",
      "observation_snapshot_runtime must be a plain object.",
    );
  }
  if (!isPlainObject(runtime.markdown_index)) {
    addError(
      errors,
      "markdown_derived_index_runtime.markdown_index.type",
      "/markdown_index",
      "markdown_index must be a plain object.",
    );
  }
  return errors;
}

function validateRuntimeIntegrity(runtime, { verifySemanticIndex = true } = {}) {
  const errors = validateRuntimeShape(runtime);
  if (errors.length > 0) return { errors, source: null };

  if (runtime.runtime_digest !== computeMarkdownDerivedIndexRuntimeDigest(runtime)) {
    addError(
      errors,
      "markdown_derived_index_runtime.runtime_digest.mismatch",
      "/runtime_digest",
      "runtime_digest does not match the runtime identity.",
    );
  }

  const selected = createObservationSnapshotConsumerInput(runtime.observation_snapshot_runtime, {
    request_id: runtime.request_id,
    source_identities: [runtime.source_identity],
  });
  if (selected.status === "stopped") {
    errors.push(...prefixErrors(selected.errors, "/observation_snapshot_runtime"));
    return { errors, source: null };
  }
  const source = selected.consumer_input.sources[0];
  if (!(["github_issue", "github_pull_request"].includes(source.source_type))) {
    addError(
      errors,
      "markdown_derived_index_runtime.source_type.unsupported",
      "/source_identity/source_type",
      "Markdown derived indexes require a GitHub issue or pull request source.",
    );
  }
  if (runtime.input_snapshot_digest !== selected.consumer_input.input_snapshot_digest) {
    addError(
      errors,
      "markdown_derived_index_runtime.input_snapshot_digest.mismatch",
      "/input_snapshot_digest",
      "input_snapshot_digest does not match observation_snapshot_runtime.",
    );
  }

  const indexIntegrity = validateMarkdownDerivedIndexIntegrity(runtime.markdown_index, {
    allowUnsupportedParser: true,
  });
  errors.push(...prefixErrors(indexIntegrity.errors, "/markdown_index"));
  if (indexIntegrity.status === "valid") {
    if (runtime.markdown_index.body_digest !== source.body_digest) {
      addError(
        errors,
        "markdown_derived_index_runtime.body_digest.mismatch",
        "/markdown_index/body_digest",
        "markdown_index body_digest does not match the selected snapshot source.",
      );
    }
    if (runtime.markdown_index.parser_version !== runtime.parser_version) {
      addError(
        errors,
        "markdown_derived_index_runtime.parser_version.mismatch",
        "/parser_version",
        "runtime parser_version does not match markdown_index.parser_version.",
      );
    }
  }

  if (verifySemanticIndex
    && errors.length === 0
    && runtime.parser_version === MARKDOWN_DERIVED_INDEX_PARSER_VERSION) {
    const loaded = loadMarkdownDerivedIndex({
      body: source.observed_value.body,
      body_digest: source.body_digest,
      parser_version: runtime.parser_version,
    }, { preparedIndex: runtime.markdown_index });
    errors.push(...prefixErrors(loaded.errors, "/markdown_index"));
  }
  return { errors, source };
}

function cloneMarkdownIndex(value) {
  return deepFreeze(JSON.parse(JSON.stringify(value)));
}

export function prepareMarkdownDerivedIndexRuntime(input = {}) {
  const selected = selectCurrentSource(input);
  if (selected.status === "stopped") return stopped(selected.reason, selected.errors);
  return prepareSelected(selected, "prepared");
}

export function loadMarkdownDerivedIndexRuntime(input = {}, { cachedRuntime } = {}) {
  if (cachedRuntime === undefined) return prepareMarkdownDerivedIndexRuntime(input);

  const cached = validateRuntimeIntegrity(cachedRuntime, {
    verifySemanticIndex: !trustedRuntimes.has(cachedRuntime),
  });
  if (cached.errors.length > 0) {
    return stopped("invalid_cached_markdown_derived_index_runtime", cached.errors);
  }

  const current = selectCurrentSource(input);
  if (current.status === "stopped") return stopped(current.reason, current.errors);

  if (cachedRuntime.request_id !== current.request_id) {
    return prepareSelected(current, "request_changed");
  }
  if (!sameSourceIdentity(cachedRuntime.source_identity, current.source)
    || cachedRuntime.input_snapshot_digest !== current.consumer_input.input_snapshot_digest
    || cachedRuntime.markdown_index.body_digest !== current.source.body_digest) {
    return prepareSelected(current, "source_changed");
  }
  if (cachedRuntime.parser_version !== current.parser_version) {
    return prepareSelected(current, "parser_changed");
  }

  return readyResult(
    current,
    cloneMarkdownIndex(cachedRuntime.markdown_index),
    "reused",
    "loaded",
  );
}

export function createMarkdownDerivedIndexConsumerInput(runtime, selector = {}) {
  const integrity = validateRuntimeIntegrity(runtime, {
    verifySemanticIndex: !trustedRuntimes.has(runtime),
  });
  const errors = [...integrity.errors];
  if (!validateClosedObject(
    selector,
    CONSUMER_SELECTOR_FIELDS,
    "markdown_derived_index_consumer_selector",
    "",
    errors,
  )) {
    return consumerStopped("invalid_markdown_derived_index_consumer_input", errors);
  }
  validateNonBlankString(
    selector.request_id,
    "markdown_derived_index_consumer_selector.request_id",
    "/request_id",
    "request_id",
    errors,
  );
  validateDigest(
    selector.input_snapshot_digest,
    "markdown_derived_index_consumer_selector.input_snapshot_digest",
    "/input_snapshot_digest",
    "input_snapshot_digest",
    errors,
  );
  validateSourceIdentity(
    selector.source_identity,
    "/source_identity",
    errors,
    "markdown_derived_index_consumer_selector.source_identity",
  );
  validateDigest(
    selector.index_digest,
    "markdown_derived_index_consumer_selector.index_digest",
    "/index_digest",
    "index_digest",
    errors,
  );
  if (errors.length > 0) {
    return consumerStopped("invalid_markdown_derived_index_consumer_input", errors);
  }

  if (runtime.request_id !== selector.request_id
    || runtime.input_snapshot_digest !== selector.input_snapshot_digest
    || !sameSourceIdentity(runtime.source_identity, selector.source_identity)
    || runtime.markdown_index.index_digest !== selector.index_digest) {
    return consumerStopped("stale_markdown_derived_index_consumer_input", [{
      code: "markdown_derived_index_consumer.identity.mismatch",
      path: "",
      message: "Consumer identity does not match the evaluation-cycle Markdown runtime.",
    }]);
  }

  return deepFreeze({
    status: "ready",
    reason: null,
    consumer_input: {
      consumer_input_type: MARKDOWN_DERIVED_INDEX_CONSUMER_INPUT_TYPE,
      request_id: runtime.request_id,
      repository: runtime.observation_snapshot_runtime.observation_snapshot.repository,
      input_snapshot_digest: runtime.input_snapshot_digest,
      source_identity: runtime.source_identity,
      body_digest: runtime.markdown_index.body_digest,
      parser_version: runtime.parser_version,
      index_digest: runtime.markdown_index.index_digest,
      markdown_index: runtime.markdown_index,
    },
    errors: [],
  });
}
