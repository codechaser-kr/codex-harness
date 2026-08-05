import { readFile, readdir } from "node:fs/promises";

import {
  compileArtifactManifest,
  deepFreezeArtifactContract,
} from "./manifest-compiler.mjs";

export const ARTIFACT_TYPES = Object.freeze([
  "branch-proposal",
  "commit-plan",
  "feature-plan",
  "feature-proposal-triage",
  "fix-analysis",
  "fix-plan",
  "issue-creation",
  "policy-plan",
  "policy-review-next-triage",
  "pr-creation",
  "pr-proposal",
  "review-comment",
]);

const defaultManifestsUrl = new URL("../../artifact-manifests/", import.meta.url);
let defaultRegistryPromise;

function isPlainObject(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function addError(errors, code, path, message) {
  errors.push({ code, path, message });
}

function stopped(errors) {
  return deepFreezeArtifactContract({
    status: "stopped",
    reason: "invalid_artifact_registry",
    registry: null,
    errors,
  });
}

export function compileArtifactRegistry(manifests) {
  const errors = [];
  if (!isPlainObject(manifests)) {
    addError(errors, "artifact_registry.manifests.type", "/manifests", "Artifact manifests must be a plain object keyed by artifact type.");
    return stopped(errors);
  }

  const expected = new Set(ARTIFACT_TYPES);
  for (const artifactType of Object.keys(manifests).sort()) {
    if (!expected.has(artifactType)) {
      addError(errors, "artifact_registry.manifest.unexpected", `/manifests/${artifactType}`, `Unexpected artifact manifest: ${artifactType}.`);
    }
  }
  for (const artifactType of ARTIFACT_TYPES) {
    if (!Object.hasOwn(manifests, artifactType)) {
      addError(errors, "artifact_registry.manifest.missing", `/manifests/${artifactType}`, `Missing artifact manifest: ${artifactType}.`);
    }
  }

  const byType = {};
  for (const artifactType of ARTIFACT_TYPES) {
    if (!Object.hasOwn(manifests, artifactType)) continue;
    const manifest = manifests[artifactType];
    if (manifest?.artifact_type !== artifactType) {
      addError(
        errors,
        "artifact_registry.artifact_type.mismatch",
        `/manifests/${artifactType}/artifact_type`,
        `Manifest artifact_type must match its registry key: ${artifactType}.`,
      );
      continue;
    }
    const compiled = compileArtifactManifest(manifest);
    if (compiled.status === "stopped") {
      for (const error of compiled.errors) {
        addError(
          errors,
          error.code,
          `/manifests/${artifactType}${error.path}`,
          error.message,
        );
      }
      continue;
    }
    Object.defineProperty(byType, artifactType, {
      value: deepFreezeArtifactContract({
        manifest: compiled.compiled_manifest.source_manifest,
        compiled_manifest: compiled.compiled_manifest,
      }),
      enumerable: true,
      configurable: true,
      writable: true,
    });
  }

  if (errors.length > 0) return stopped(errors);
  return deepFreezeArtifactContract({
    status: "loaded",
    reason: null,
    registry: {
      artifact_types: [...ARTIFACT_TYPES],
      by_type: byType,
    },
    errors: [],
  });
}

export async function loadArtifactRegistry({ manifestsUrl = defaultManifestsUrl } = {}) {
  let filenames;
  try {
    filenames = (await readdir(manifestsUrl)).filter((name) => name.endsWith(".json")).sort();
  } catch (error) {
    return stopped([{
      code: "artifact_registry.directory.read",
      path: "/manifests",
      message: `Unable to read artifact manifest directory: ${error.message}`,
    }]);
  }

  const manifests = {};
  const errors = [];
  for (const filename of filenames) {
    const artifactType = filename.slice(0, -5);
    try {
      const manifest = JSON.parse(await readFile(new URL(filename, manifestsUrl), "utf8"));
      Object.defineProperty(manifests, artifactType, {
        value: manifest,
        enumerable: true,
        configurable: true,
        writable: true,
      });
    } catch (error) {
      addError(errors, "artifact_registry.manifest.parse", `/manifests/${artifactType}`, `Unable to parse artifact manifest: ${error.message}`);
    }
  }
  if (errors.length > 0) return stopped(errors);
  return compileArtifactRegistry(manifests);
}

export function getArtifactRegistry() {
  defaultRegistryPromise ??= loadArtifactRegistry();
  return defaultRegistryPromise;
}
