import { createHash } from "node:crypto";

export const PULL_REQUEST_INPUT_TYPE = "validated_pull_request_input";
export const PULL_REQUEST_INPUT_FORMAT_VERSION = "1";

const SOURCE_FIELDS = [
  "title",
  "body",
  "base_branch",
  "head_branch",
  "related_issue",
];
const PREPARED_FIELDS = [
  "input_type",
  "format_version",
  "input_digest",
  ...SOURCE_FIELDS,
];
const SHA256_DIGEST = /^sha256:[0-9a-f]{64}$/;

function isPlainObject(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function addError(errors, code, path, message) {
  errors.push({ code, path, message });
}

function validateClosedObject(value, fields, context, errors) {
  if (!isPlainObject(value)) {
    addError(errors, `${context}.type`, "", `${context} must be a plain object.`);
    return false;
  }

  const allowed = new Set(fields);
  for (const key of Object.keys(value).sort()) {
    if (!allowed.has(key)) {
      addError(errors, `${context}.additional_property`, `/${key}`, `Unexpected ${context} property: ${key}.`);
    }
  }
  for (const field of fields) {
    if (!Object.hasOwn(value, field)) {
      addError(errors, `${context}.required`, `/${field}`, `Missing ${context} property: ${field}.`);
    }
  }
  return true;
}

function validateInputFields(value, context, errors) {
  for (const field of ["title", "body", "base_branch", "head_branch"]) {
    if (!Object.hasOwn(value, field)) continue;
    if (typeof value[field] !== "string") {
      addError(errors, `${context}.${field}.type`, `/${field}`, `${field} must be a string.`);
    } else if (value[field].trim().length === 0) {
      addError(errors, `${context}.${field}.empty`, `/${field}`, `${field} must not be blank.`);
    }
  }

  if (Object.hasOwn(value, "related_issue")) {
    if (!Number.isInteger(value.related_issue)) {
      addError(
        errors,
        `${context}.related_issue.type`,
        "/related_issue",
        "related_issue must be an integer.",
      );
    } else if (value.related_issue < 1) {
      addError(
        errors,
        `${context}.related_issue.minimum`,
        "/related_issue",
        "related_issue must be greater than zero.",
      );
    }
  }
}

function validateSourceInput(value) {
  const errors = [];
  if (!validateClosedObject(value, SOURCE_FIELDS, "pull_request_input", errors)) return errors;
  validateInputFields(value, "pull_request_input", errors);
  return errors;
}

function validatePreparedInput(value) {
  const errors = [];
  if (!validateClosedObject(value, PREPARED_FIELDS, "prepared_pull_request_input", errors)) {
    return errors;
  }

  if (Object.hasOwn(value, "input_type")) {
    if (typeof value.input_type !== "string" || value.input_type.length === 0) {
      addError(
        errors,
        "prepared_pull_request_input.input_type.invalid",
        "/input_type",
        "input_type must be a non-empty string.",
      );
    } else if (value.input_type !== PULL_REQUEST_INPUT_TYPE) {
      addError(
        errors,
        "prepared_pull_request_input.input_type.mismatch",
        "/input_type",
        "Prepared pull request input type is not supported.",
      );
    }
  }

  if (Object.hasOwn(value, "format_version")) {
    if (typeof value.format_version !== "string" || value.format_version.length === 0) {
      addError(
        errors,
        "prepared_pull_request_input.format_version.invalid",
        "/format_version",
        "format_version must be a non-empty string.",
      );
    } else if (value.format_version !== PULL_REQUEST_INPUT_FORMAT_VERSION) {
      addError(
        errors,
        "prepared_pull_request_input.format_version.mismatch",
        "/format_version",
        "Prepared pull request input format version is not supported.",
      );
    }
  }

  if (Object.hasOwn(value, "input_digest")
      && (typeof value.input_digest !== "string" || !SHA256_DIGEST.test(value.input_digest))) {
    addError(
      errors,
      "prepared_pull_request_input.input_digest.invalid",
      "/input_digest",
      "input_digest must be a sha256 digest.",
    );
  }

  validateInputFields(value, "prepared_pull_request_input", errors);
  return errors;
}

function freeze(value) {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

function digestPayload(input) {
  return {
    input_type: PULL_REQUEST_INPUT_TYPE,
    format_version: PULL_REQUEST_INPUT_FORMAT_VERSION,
    title: input.title,
    body: input.body,
    base_branch: input.base_branch,
    head_branch: input.head_branch,
    related_issue: input.related_issue,
  };
}

export function computePullRequestInputDigest(input) {
  return `sha256:${createHash("sha256").update(JSON.stringify(digestPayload(input))).digest("hex")}`;
}

function buildPreparedInput(input) {
  const payload = digestPayload(input);
  return freeze({
    input_type: payload.input_type,
    format_version: payload.format_version,
    input_digest: computePullRequestInputDigest(payload),
    title: payload.title,
    body: payload.body,
    base_branch: payload.base_branch,
    head_branch: payload.head_branch,
    related_issue: payload.related_issue,
  });
}

function stopped(reason, errors) {
  return {
    status: "stopped",
    reason,
    preparation: null,
    pull_request_input: null,
    errors: freeze(errors),
  };
}

export function preparePullRequestInput(input) {
  const errors = validateSourceInput(input);
  if (errors.length > 0) return stopped("invalid_pull_request_input", errors);

  return {
    status: "prepared",
    reason: null,
    pull_request_input: buildPreparedInput(input),
    errors: freeze([]),
  };
}

export function loadPullRequestInput(input, { preparedInput } = {}) {
  const expected = preparePullRequestInput(input);
  if (expected.status === "stopped") return expected;
  if (preparedInput === undefined) {
    return {
      status: "loaded",
      reason: null,
      preparation: "prepared",
      pull_request_input: expected.pull_request_input,
      errors: freeze([]),
    };
  }

  const errors = validatePreparedInput(preparedInput);
  if (errors.length > 0) return stopped("invalid_prepared_pull_request_input", errors);

  const embeddedDigest = computePullRequestInputDigest(preparedInput);
  if (preparedInput.input_digest !== embeddedDigest) {
    addError(
      errors,
      "prepared_pull_request_input.embedded_digest.mismatch",
      "/input_digest",
      "Prepared pull request input does not match its embedded digest.",
    );
  }
  if (preparedInput.input_digest !== expected.pull_request_input.input_digest) {
    addError(
      errors,
      "prepared_pull_request_input.source_digest.mismatch",
      "/input_digest",
      "Prepared pull request input does not match the confirmed source input.",
    );
  }
  if (errors.length > 0) return stopped("invalid_prepared_pull_request_input", errors);

  return {
    status: "loaded",
    reason: null,
    preparation: "reused",
    pull_request_input: expected.pull_request_input,
    errors: freeze([]),
  };
}
