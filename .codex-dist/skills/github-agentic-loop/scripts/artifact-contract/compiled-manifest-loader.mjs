import {
  ARTIFACT_MANIFEST_COMPILER_FORMAT_VERSION,
  COMPILED_ARTIFACT_MANIFEST_TYPE,
  compileArtifactManifest,
  computeArtifactContractDigest,
  computeArtifactManifestSourceDigest,
  computeCompiledArtifactManifestDigest,
  deepFreezeArtifactContract,
  isTrustedCompiledArtifactManifest,
  markTrustedCompiledArtifactManifest,
} from "./manifest-compiler.mjs";
import { ARTIFACT_MANIFEST_VALIDATOR_VERSION } from "./manifest-validator.mjs";

const COMPILED_FIELDS = [
  "artifact_type",
  "compiler_format_version",
  "validator_version",
  "source_digest",
  "contract_digest",
  "compiled_digest",
  "source_manifest",
  "field_index",
  "rule_plan",
  "render_plan",
];
const DIGEST = /^sha256:[0-9a-f]{64}$/;

function isPlainObject(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function addError(errors, code, path, message) {
  errors.push({ code, path, message });
}

function validateClosedObject(value, path, fields, errors, context) {
  if (!isPlainObject(value)) {
    addError(errors, `${context}.type`, path, `${context} must be a plain object.`);
    return false;
  }
  const allowed = new Set(fields);
  for (const key of Object.keys(value).sort()) {
    if (!allowed.has(key)) addError(errors, `${context}.additional_property`, `${path}/${key}`, `Unexpected ${context} property: ${key}.`);
  }
  for (const field of fields) {
    if (!Object.hasOwn(value, field)) addError(errors, `${context}.required`, `${path}/${field}`, `Missing ${context} property: ${field}.`);
  }
  return true;
}

function validateShape(value) {
  const errors = [];
  if (!validateClosedObject(value, "", COMPILED_FIELDS, errors, "compiled_manifest")) return errors;
  if (errors.length > 0) return errors;

  for (const field of ["artifact_type", "compiler_format_version", "validator_version"]) {
    if (typeof value[field] !== "string" || value[field].length === 0) {
      addError(errors, `compiled_manifest.${field}.invalid`, `/${field}`, `${field} must be a non-empty string.`);
    }
  }
  for (const field of ["source_digest", "contract_digest", "compiled_digest"]) {
    if (typeof value[field] !== "string" || !DIGEST.test(value[field])) {
      addError(errors, `compiled_manifest.${field}.invalid`, `/${field}`, `${field} must be a sha256 digest.`);
    }
  }
  if (!isPlainObject(value.source_manifest)) {
    addError(errors, "compiled_manifest.source_manifest.type", "/source_manifest", "source_manifest must be a plain object.");
  }
  if (isPlainObject(value.field_index)) {
    validateClosedObject(value.field_index, "/field_index", ["order", "by_id"], errors, "compiled_manifest.field_index");
    if (!Array.isArray(value.field_index.order)) addError(errors, "compiled_manifest.field_index.order.type", "/field_index/order", "field index order must be an array.");
    if (!isPlainObject(value.field_index.by_id)) addError(errors, "compiled_manifest.field_index.by_id.type", "/field_index/by_id", "field index by_id must be a plain object.");
  } else {
    addError(errors, "compiled_manifest.field_index.type", "/field_index", "field_index must be a plain object.");
  }
  if (isPlainObject(value.rule_plan)) {
    validateClosedObject(value.rule_plan, "/rule_plan", ["order", "rules"], errors, "compiled_manifest.rule_plan");
    if (!Array.isArray(value.rule_plan.order)) addError(errors, "compiled_manifest.rule_plan.order.type", "/rule_plan/order", "rule plan order must be an array.");
    if (!Array.isArray(value.rule_plan.rules)) addError(errors, "compiled_manifest.rule_plan.rules.type", "/rule_plan/rules", "rule plan rules must be an array.");
  } else {
    addError(errors, "compiled_manifest.rule_plan.type", "/rule_plan", "rule_plan must be a plain object.");
  }
  if (isPlainObject(value.render_plan)) {
    validateClosedObject(value.render_plan, "/render_plan", ["section_order"], errors, "compiled_manifest.render_plan");
    if (!Array.isArray(value.render_plan.section_order)) addError(errors, "compiled_manifest.render_plan.section_order.type", "/render_plan/section_order", "render section order must be an array.");
  } else {
    addError(errors, "compiled_manifest.render_plan.type", "/render_plan", "render_plan must be a plain object.");
  }
  return errors;
}

function validateCompatibility(manifest, compiledManifest) {
  const errors = validateShape(compiledManifest);
  if (errors.length > 0) return errors;
  if (!isPlainObject(manifest)) {
    addError(errors, "compiled_manifest.requested_source.type", "/source_manifest", "Requested artifact manifest must be a plain object.");
    return errors;
  }
  if (compiledManifest.artifact_type !== COMPILED_ARTIFACT_MANIFEST_TYPE) {
    addError(errors, "compiled_manifest.artifact_type.mismatch", "/artifact_type", "Compiled artifact manifest type is not supported.");
  }
  if (compiledManifest.compiler_format_version !== ARTIFACT_MANIFEST_COMPILER_FORMAT_VERSION) {
    addError(errors, "compiled_manifest.compiler_format_version.mismatch", "/compiler_format_version", "Compiled manifest format version does not match the current compiler.");
  }
  if (compiledManifest.validator_version !== ARTIFACT_MANIFEST_VALIDATOR_VERSION) {
    addError(errors, "compiled_manifest.validator_version.mismatch", "/validator_version", "Compiled manifest validator version does not match the current validator.");
  }
  if (compiledManifest.source_digest !== computeArtifactManifestSourceDigest(manifest)) {
    addError(errors, "compiled_manifest.source_digest.mismatch", "/source_digest", "Compiled source digest does not match the requested artifact manifest.");
  }
  if (compiledManifest.source_digest !== computeArtifactManifestSourceDigest(compiledManifest.source_manifest)) {
    addError(errors, "compiled_manifest.embedded_source_digest.mismatch", "/source_manifest", "Embedded source manifest does not match its source digest.");
  }
  if (compiledManifest.contract_digest !== computeArtifactContractDigest(compiledManifest.source_manifest)) {
    addError(errors, "compiled_manifest.contract_digest.mismatch", "/contract_digest", "Contract digest does not match the embedded artifact contract.");
  }
  if (compiledManifest.compiled_digest !== computeCompiledArtifactManifestDigest(compiledManifest)) {
    addError(errors, "compiled_manifest.compiled_digest.mismatch", "/compiled_digest", "Compiled artifact manifest digest does not match its contents.");
  }
  return errors;
}

function stopped(errors) {
  return {
    status: "stopped",
    reason: "invalid_compiled_artifact_manifest",
    preparation: null,
    compiled_manifest: null,
    errors,
  };
}

export function loadCompiledArtifactManifest(manifest, { compiledManifest } = {}) {
  if (compiledManifest === undefined) {
    const result = compileArtifactManifest(manifest);
    if (result.status === "stopped") return { ...result, preparation: null };
    return { status: "loaded", preparation: "compiled", compiled_manifest: result.compiled_manifest, errors: [] };
  }

  if (isTrustedCompiledArtifactManifest(compiledManifest) && manifest === compiledManifest.source_manifest) {
    return { status: "loaded", preparation: "reused", compiled_manifest: compiledManifest, errors: [] };
  }

  const errors = validateCompatibility(manifest, compiledManifest);
  if (errors.length === 0) {
    const expected = compileArtifactManifest(manifest);
    if (expected.status === "stopped") {
      errors.push(...expected.errors);
    } else if (expected.compiled_manifest.compiled_digest !== compiledManifest.compiled_digest) {
      addError(errors, "compiled_manifest.representation.mismatch", "/compiled_digest", "Compiled representation does not match the deterministic representation of its source.");
    }
  }
  if (errors.length > 0) return stopped(errors);

  const frozen = deepFreezeArtifactContract(cloneJson(compiledManifest));
  markTrustedCompiledArtifactManifest(frozen);
  return { status: "loaded", preparation: "reused", compiled_manifest: frozen, errors: [] };
}
