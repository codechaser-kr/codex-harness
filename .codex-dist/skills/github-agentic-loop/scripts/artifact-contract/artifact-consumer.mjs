import { acceptArtifact } from "./artifact-runtime.mjs";
import { deepFreezeArtifactContract } from "./manifest-compiler.mjs";

const HANDOFF_KEYS = ["artifact_type", "artifact"];
const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/;

function isPlainObject(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function error(code, path, message) {
  return { code, path, message };
}

function stopped(reason, artifactType, contractDigest, errors, {
  receipt = null,
  semanticResult = null,
} = {}) {
  return deepFreezeArtifactContract({
    status: "stopped",
    reason,
    artifact_type: artifactType,
    contract_digest: contractDigest,
    receipt,
    semantic_result: semanticResult,
    normalized_observation: null,
    follow_up_result: null,
    errors,
  });
}

function validateInputs(expectedArtifactType, expectedContractDigest, handoff, handlers) {
  const errors = [];
  if (typeof expectedArtifactType !== "string" || expectedArtifactType.length === 0) {
    errors.push(error("artifact_consumer.expected_artifact_type.invalid", "/expected_artifact_type", "Expected artifact type must be a non-empty string."));
  }
  if (typeof expectedContractDigest !== "string" || !DIGEST_PATTERN.test(expectedContractDigest)) {
    errors.push(error("artifact_consumer.expected_contract_digest.invalid", "/expected_contract_digest", "Expected contract digest must be a sha256 digest."));
  }
  if (!isPlainObject(handoff)) {
    errors.push(error("artifact_consumer.handoff.type", "/handoff", "Artifact handoff must be a plain object."));
  } else {
    for (const key of Object.keys(handoff).sort()) {
      if (!HANDOFF_KEYS.includes(key)) {
        errors.push(error("artifact_consumer.handoff.additional_property", `/handoff/${key}`, `Unexpected artifact handoff property: ${key}.`));
      }
    }
    for (const key of HANDOFF_KEYS) {
      if (!Object.hasOwn(handoff, key)) {
        errors.push(error("artifact_consumer.handoff.required", `/handoff/${key}`, `Missing artifact handoff property: ${key}.`));
      }
    }
  }
  if (!isPlainObject(handlers)) {
    errors.push(error("artifact_consumer.handlers.type", "/handlers", "Artifact consumer handlers must be a plain object."));
  } else {
    for (const name of ["evaluateMeaning", "normalizeObservation", "continueWorkflow"]) {
      if (typeof handlers[name] !== "function") {
        errors.push(error("artifact_consumer.handler.required", `/handlers/${name}`, `Artifact consumer handler must be a function: ${name}.`));
      }
    }
  }
  return errors;
}

function callbackFailure(stage, artifactType, contractDigest, receipt, semanticResult, cause) {
  return stopped(
    `artifact_${stage}_failed`,
    artifactType,
    contractDigest,
    [error(`artifact_consumer.${stage}.failed`, `/${stage}`, cause instanceof Error ? cause.message : String(cause))],
    { receipt, semanticResult },
  );
}

export async function consumeArtifactHandoff({
  expectedArtifactType,
  expectedContractDigest,
  handoff,
  handlers,
  registry,
  compiledManifest,
}) {
  const inputErrors = validateInputs(expectedArtifactType, expectedContractDigest, handoff, handlers);
  if (inputErrors.length > 0) {
    return stopped("invalid_artifact_consumer_input", expectedArtifactType ?? null, expectedContractDigest ?? null, inputErrors);
  }

  if (handoff.artifact_type !== expectedArtifactType) {
    return stopped("artifact_type_mismatch", expectedArtifactType, expectedContractDigest, [
      error(
        "artifact_consumer.artifact_type.mismatch",
        "/handoff/artifact_type",
        `Artifact handoff type must match expected producer type: ${expectedArtifactType}.`,
      ),
    ]);
  }

  const accepted = await acceptArtifact(handoff.artifact_type, handoff.artifact, {
    registry,
    compiledManifest,
  });
  if (accepted.status !== "accepted") {
    return stopped(accepted.reason, expectedArtifactType, expectedContractDigest, accepted.errors);
  }

  if (
    accepted.artifact_type !== expectedArtifactType
    || accepted.receipt.artifact_type !== expectedArtifactType
    || accepted.contract_digest !== expectedContractDigest
    || accepted.receipt.contract_digest !== expectedContractDigest
  ) {
    return stopped("artifact_contract_digest_mismatch", expectedArtifactType, expectedContractDigest, [
      error(
        "artifact_consumer.contract_digest.mismatch",
        "/receipt/contract_digest",
        "Accepted artifact receipt does not match the expected compiled contract digest.",
      ),
    ]);
  }

  const receiptContext = deepFreezeArtifactContract({
    artifact_type: accepted.receipt.artifact_type,
    contract_digest: accepted.receipt.contract_digest,
    receipt: accepted.receipt,
  });

  let semanticResult;
  try {
    semanticResult = await handlers.evaluateMeaning(receiptContext);
  } catch (cause) {
    return callbackFailure("meaning_evaluation", expectedArtifactType, expectedContractDigest, accepted.receipt, null, cause);
  }
  if (!isPlainObject(semanticResult) || typeof semanticResult.usable !== "boolean") {
    return stopped("invalid_artifact_semantic_result", expectedArtifactType, expectedContractDigest, [
      error("artifact_consumer.semantic_result.invalid", "/semantic_result", "Meaning evaluation must return an object with a boolean usable field."),
    ], { receipt: accepted.receipt });
  }
  deepFreezeArtifactContract(semanticResult);
  if (!semanticResult.usable) {
    return stopped("artifact_semantically_unusable", expectedArtifactType, expectedContractDigest, [], {
      receipt: accepted.receipt,
      semanticResult,
    });
  }

  const observationContext = deepFreezeArtifactContract({
    ...receiptContext,
    semantic_result: semanticResult,
  });
  let normalizedObservation;
  try {
    normalizedObservation = await handlers.normalizeObservation(observationContext);
  } catch (cause) {
    return callbackFailure("observation_normalization", expectedArtifactType, expectedContractDigest, accepted.receipt, semanticResult, cause);
  }

  const followUpContext = deepFreezeArtifactContract({
    ...observationContext,
    normalized_observation: normalizedObservation,
  });
  let followUpResult;
  try {
    followUpResult = await handlers.continueWorkflow(followUpContext);
  } catch (cause) {
    return callbackFailure("workflow_continuation", expectedArtifactType, expectedContractDigest, accepted.receipt, semanticResult, cause);
  }

  return deepFreezeArtifactContract({
    status: "consumed",
    reason: null,
    artifact_type: expectedArtifactType,
    contract_digest: expectedContractDigest,
    receipt: accepted.receipt,
    semantic_result: semanticResult,
    normalized_observation: normalizedObservation,
    follow_up_result: followUpResult,
    errors: [],
  });
}
