import { createHash } from "node:crypto";

import {
  ARTIFACT_MANIFEST_VALIDATOR_VERSION,
  validateArtifactManifest,
} from "./manifest-validator.mjs";

export const COMPILED_ARTIFACT_MANIFEST_TYPE = "compiled_artifact_manifest";
export const ARTIFACT_MANIFEST_COMPILER_FORMAT_VERSION = "1";
const trustedCompiledManifests = new WeakSet();

function isPlainObject(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function canonicalizeJson(value) {
  if (Array.isArray(value)) return value.map(canonicalizeJson);
  if (!isPlainObject(value)) return value;
  const canonical = {};
  for (const key of Object.keys(value).sort()) {
    Object.defineProperty(canonical, key, {
      value: canonicalizeJson(value[key]),
      enumerable: true,
      configurable: true,
      writable: true,
    });
  }
  return canonical;
}

function digest(value) {
  return `sha256:${createHash("sha256").update(JSON.stringify(canonicalizeJson(value))).digest("hex")}`;
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

export function deepFreezeArtifactContract(value) {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreezeArtifactContract(child);
  return Object.freeze(value);
}

export function markTrustedCompiledArtifactManifest(compiledManifest) {
  trustedCompiledManifests.add(compiledManifest);
  return compiledManifest;
}

export function isTrustedCompiledArtifactManifest(compiledManifest) {
  return typeof compiledManifest === "object"
    && compiledManifest !== null
    && trustedCompiledManifests.has(compiledManifest);
}

export function computeArtifactManifestSourceDigest(manifest) {
  return digest(manifest);
}

export function artifactContractDigestPayload(manifest) {
  return {
    artifact_type: manifest.artifact_type,
    manifest_version: manifest.manifest_version,
    fields: manifest.fields,
    rules: manifest.rules,
    render: manifest.render,
  };
}

export function computeArtifactContractDigest(manifest) {
  return digest(artifactContractDigestPayload(manifest));
}

function buildFieldIndex(manifest) {
  const order = manifest.fields.map((field) => field.field_id);
  const byId = {};
  for (const field of manifest.fields) {
    Object.defineProperty(byId, field.field_id, {
      value: cloneJson(field),
      enumerable: true,
      configurable: true,
      writable: true,
    });
  }
  return { order, by_id: byId };
}

function buildRulePlan(manifest) {
  return {
    order: manifest.rules.map((rule) => rule.rule_id),
    rules: cloneJson(manifest.rules),
  };
}

export function compiledArtifactManifestDigestPayload(compiledManifest) {
  return {
    artifact_type: compiledManifest.artifact_type,
    compiler_format_version: compiledManifest.compiler_format_version,
    validator_version: compiledManifest.validator_version,
    source_digest: compiledManifest.source_digest,
    contract_digest: compiledManifest.contract_digest,
    source_manifest: compiledManifest.source_manifest,
    field_index: compiledManifest.field_index,
    rule_plan: compiledManifest.rule_plan,
    render_plan: compiledManifest.render_plan,
  };
}

export function computeCompiledArtifactManifestDigest(compiledManifest) {
  return digest(compiledArtifactManifestDigestPayload(compiledManifest));
}

export function compileArtifactManifest(manifest) {
  const validation = validateArtifactManifest(manifest);
  if (!validation.valid) {
    return {
      status: "stopped",
      reason: "invalid_artifact_manifest",
      compiled_manifest: null,
      errors: validation.errors,
    };
  }

  const sourceManifest = canonicalizeJson(cloneJson(manifest));
  const compiledManifest = {
    artifact_type: COMPILED_ARTIFACT_MANIFEST_TYPE,
    compiler_format_version: ARTIFACT_MANIFEST_COMPILER_FORMAT_VERSION,
    validator_version: ARTIFACT_MANIFEST_VALIDATOR_VERSION,
    source_digest: computeArtifactManifestSourceDigest(sourceManifest),
    contract_digest: computeArtifactContractDigest(sourceManifest),
    compiled_digest: "",
    source_manifest: sourceManifest,
    field_index: buildFieldIndex(sourceManifest),
    rule_plan: buildRulePlan(sourceManifest),
    render_plan: { section_order: cloneJson(sourceManifest.render.section_order) },
  };
  compiledManifest.compiled_digest = computeCompiledArtifactManifestDigest(compiledManifest);
  const frozen = deepFreezeArtifactContract(compiledManifest);
  markTrustedCompiledArtifactManifest(frozen);
  return { status: "compiled", compiled_manifest: frozen, errors: [] };
}
