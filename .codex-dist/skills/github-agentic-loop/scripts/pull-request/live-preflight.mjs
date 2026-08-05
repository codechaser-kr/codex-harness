import { loadPullRequestInput } from "./pr-input.mjs";

const CREATION_REQUEST_FIELDS = [
  "input_digest",
  "title",
  "body",
  "base_branch",
  "head_branch",
];
const OBSERVATION_FIELDS = [
  "base_branch",
  "base_exists",
  "head_branch",
  "head_exists",
  "expected_head_oid",
  "remote_head_oid",
  "existing_pull_request_number",
];
const SHA256_DIGEST = /^sha256:[0-9a-f]{64}$/;
const GIT_OID = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/;

function isPlainObject(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function freeze(value) {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

function addError(errors, code, path, message) {
  errors.push({ code, path, message });
}

function validateClosedObject(value, fields, context, path, errors) {
  if (!isPlainObject(value)) {
    addError(errors, `${context}.type`, path, `${context} must be a plain object.`);
    return false;
  }

  const allowed = new Set(fields);
  for (const key of Object.keys(value).sort()) {
    if (!allowed.has(key)) {
      addError(errors, `${context}.additional_property`, `${path}/${key}`, `Unexpected ${context} property: ${key}.`);
    }
  }
  for (const field of fields) {
    if (!Object.hasOwn(value, field)) {
      addError(errors, `${context}.required`, `${path}/${field}`, `Missing ${context} property: ${field}.`);
    }
  }
  return true;
}

function validateNonBlankString(value, field, context, path, errors) {
  if (typeof value[field] !== "string") {
    addError(errors, `${context}.${field}.type`, `${path}/${field}`, `${field} must be a string.`);
  } else if (value[field].trim().length === 0) {
    addError(errors, `${context}.${field}.empty`, `${path}/${field}`, `${field} must not be blank.`);
  }
}

function validateCreationRequest(value) {
  const errors = [];
  const path = "/creation_request";
  if (!validateClosedObject(
    value,
    CREATION_REQUEST_FIELDS,
    "pull_request_preflight.creation_request",
    path,
    errors,
  )) return errors;
  if (errors.length > 0) return errors;

  if (typeof value.input_digest !== "string" || !SHA256_DIGEST.test(value.input_digest)) {
    addError(
      errors,
      "pull_request_preflight.creation_request.input_digest.invalid",
      `${path}/input_digest`,
      "input_digest must be a sha256 digest.",
    );
  }
  for (const field of ["title", "body", "base_branch", "head_branch"]) {
    validateNonBlankString(
      value,
      field,
      "pull_request_preflight.creation_request",
      path,
      errors,
    );
  }
  return errors;
}

function validateObservation(value) {
  const errors = [];
  const path = "/observation";
  if (!validateClosedObject(
    value,
    OBSERVATION_FIELDS,
    "pull_request_preflight.observation",
    path,
    errors,
  )) return errors;
  if (errors.length > 0) return errors;

  for (const field of ["base_branch", "head_branch"]) {
    validateNonBlankString(value, field, "pull_request_preflight.observation", path, errors);
  }
  for (const field of ["base_exists", "head_exists"]) {
    if (typeof value[field] !== "boolean") {
      addError(
        errors,
        `pull_request_preflight.observation.${field}.type`,
        `${path}/${field}`,
        `${field} must be a boolean.`,
      );
    }
  }
  if (typeof value.expected_head_oid !== "string" || !GIT_OID.test(value.expected_head_oid)) {
    addError(
      errors,
      "pull_request_preflight.observation.expected_head_oid.invalid",
      `${path}/expected_head_oid`,
      "expected_head_oid must be a full Git object ID.",
    );
  }
  if (value.remote_head_oid !== null
      && (typeof value.remote_head_oid !== "string" || !GIT_OID.test(value.remote_head_oid))) {
    addError(
      errors,
      "pull_request_preflight.observation.remote_head_oid.invalid",
      `${path}/remote_head_oid`,
      "remote_head_oid must be null or a full Git object ID.",
    );
  }
  if (value.existing_pull_request_number !== null
      && (!Number.isInteger(value.existing_pull_request_number)
        || value.existing_pull_request_number < 1)) {
    addError(
      errors,
      "pull_request_preflight.observation.existing_pull_request_number.invalid",
      `${path}/existing_pull_request_number`,
      "existing_pull_request_number must be null or a positive integer.",
    );
  }
  return errors;
}

function inputSource(input) {
  if (!isPlainObject(input)) return null;
  return {
    title: input.title,
    body: input.body,
    base_branch: input.base_branch,
    head_branch: input.head_branch,
    related_issue: input.related_issue,
  };
}

function validateImmutableInput(input) {
  const source = inputSource(input);
  if (source === null) {
    return {
      status: "stopped",
      errors: [{
        code: "pull_request_preflight.input.type",
        path: "/pull_request_input",
        message: "pull_request_input must be a prepared immutable input object.",
      }],
    };
  }

  const loaded = loadPullRequestInput(source, { preparedInput: input });
  if (loaded.status === "loaded") return loaded;
  return {
    status: "stopped",
    errors: loaded.errors.map((error) => ({
      ...error,
      path: `/pull_request_input${error.path}`,
    })),
  };
}

function stopped(reason, errors) {
  return {
    status: "stopped",
    reason,
    input_digest: null,
    live_observation: null,
    errors: freeze(errors),
  };
}

export function runPullRequestLivePreflight(
  pullRequestInput,
  creationRequest,
  observation,
) {
  const loaded = validateImmutableInput(pullRequestInput);
  if (loaded.status === "stopped") {
    return stopped("invalid_pull_request_input_identity", loaded.errors);
  }

  const creationErrors = validateCreationRequest(creationRequest);
  if (creationErrors.length > 0) {
    return stopped("invalid_pull_request_creation_request", creationErrors);
  }
  const observationErrors = validateObservation(observation);
  if (observationErrors.length > 0) {
    return stopped("invalid_pull_request_live_observation", observationErrors);
  }

  const input = loaded.pull_request_input;
  const errors = [];
  for (const field of CREATION_REQUEST_FIELDS) {
    if (creationRequest[field] !== input[field]) {
      addError(
        errors,
        `pull_request_preflight.identity.${field}.mismatch`,
        `/creation_request/${field}`,
        `${field} does not match the immutable pull request input.`,
      );
    }
  }

  if (observation.base_branch !== input.base_branch) {
    addError(
      errors,
      "pull_request_preflight.observation.base_branch.mismatch",
      "/observation/base_branch",
      "Observed base branch does not match the immutable pull request input.",
    );
  }
  if (observation.head_branch !== input.head_branch) {
    addError(
      errors,
      "pull_request_preflight.observation.head_branch.mismatch",
      "/observation/head_branch",
      "Observed head branch does not match the immutable pull request input.",
    );
  }
  if (!observation.base_exists) {
    addError(
      errors,
      "pull_request_preflight.remote_base.missing",
      "/observation/base_exists",
      "The remote base branch does not exist.",
    );
  }
  if (!observation.head_exists) {
    addError(
      errors,
      "pull_request_preflight.remote_head.missing",
      "/observation/head_exists",
      "The remote head branch does not exist.",
    );
  }
  if (observation.head_exists && observation.remote_head_oid === null) {
    addError(
      errors,
      "pull_request_preflight.remote_head_oid.required",
      "/observation/remote_head_oid",
      "A remote head object ID is required when the remote head exists.",
    );
  } else if (!observation.head_exists && observation.remote_head_oid !== null) {
    addError(
      errors,
      "pull_request_preflight.remote_head_oid.unexpected",
      "/observation/remote_head_oid",
      "A remote head object ID is not allowed when the remote head is missing.",
    );
  } else if (observation.head_exists
      && observation.remote_head_oid !== observation.expected_head_oid) {
    addError(
      errors,
      "pull_request_preflight.remote_head_oid.stale",
      "/observation/remote_head_oid",
      "The remote head object ID does not match the expected local head.",
    );
  }
  if (observation.existing_pull_request_number !== null) {
    addError(
      errors,
      "pull_request_preflight.same_head_pull_request.conflict",
      "/observation/existing_pull_request_number",
      "A pull request already exists for the same head branch.",
    );
  }

  if (errors.length > 0) return stopped("pull_request_live_preflight_failed", errors);
  return {
    status: "ready",
    reason: null,
    input_digest: input.input_digest,
    live_observation: freeze({
      base_branch: observation.base_branch,
      base_exists: observation.base_exists,
      head_branch: observation.head_branch,
      head_exists: observation.head_exists,
      expected_head_oid: observation.expected_head_oid,
      remote_head_oid: observation.remote_head_oid,
      existing_pull_request_number: observation.existing_pull_request_number,
    }),
    errors: freeze([]),
  };
}
