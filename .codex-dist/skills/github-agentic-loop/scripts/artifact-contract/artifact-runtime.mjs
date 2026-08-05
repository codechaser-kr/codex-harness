import { getArtifactRegistry } from "./artifact-registry.mjs";
import { deepFreezeArtifactContract } from "./manifest-compiler.mjs";
import { renderArtifact } from "./renderer.mjs";

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function stopped(reason, artifactType, contractDigest, errors) {
  return deepFreezeArtifactContract({
    status: "stopped",
    reason,
    artifact_type: artifactType,
    contract_digest: contractDigest,
    receipt: null,
    errors,
  });
}

function isPlainObject(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function validRegistry(registry) {
  return typeof registry === "object"
    && registry !== null
    && Array.isArray(registry.artifact_types)
    && typeof registry.by_type === "object"
    && registry.by_type !== null;
}

export async function acceptArtifact(
  artifactType,
  artifact,
  { registry, compiledManifest } = {},
) {
  let resolvedRegistry = registry;
  if (resolvedRegistry === undefined) {
    const prepared = await getArtifactRegistry();
    if (prepared.status !== "loaded") {
      return stopped("invalid_artifact_registry", null, null, prepared.errors);
    }
    resolvedRegistry = prepared.registry;
  }

  if (!validRegistry(resolvedRegistry)) {
    return stopped("invalid_artifact_registry", null, null, [{
      code: "artifact_runtime.registry.invalid",
      path: "/registry",
      message: "Artifact registry is not a prepared registry.",
    }]);
  }
  if (typeof artifactType !== "string" || !Object.hasOwn(resolvedRegistry.by_type, artifactType)) {
    return stopped("unknown_artifact_type", typeof artifactType === "string" ? artifactType : null, null, [{
      code: "artifact_runtime.artifact_type.unknown",
      path: "/artifact_type",
      message: `Unknown artifact type: ${String(artifactType)}.`,
    }]);
  }

  const entry = resolvedRegistry.by_type[artifactType];
  if (
    !isPlainObject(entry)
    || !isPlainObject(entry.manifest)
    || !isPlainObject(entry.compiled_manifest)
  ) {
    return stopped("invalid_artifact_registry", artifactType, null, [{
      code: "artifact_runtime.registry.entry.invalid",
      path: `/registry/by_type/${artifactType}`,
      message: `Artifact registry entry is invalid: ${artifactType}.`,
    }]);
  }
  const rendered = renderArtifact(entry.manifest, artifact, {
    compiledManifest: compiledManifest ?? entry.compiled_manifest,
  });
  if (rendered.status !== "rendered") {
    return stopped(rendered.reason, artifactType, rendered.contract_digest, rendered.errors);
  }

  const receipt = deepFreezeArtifactContract({
    artifact_type: artifactType,
    contract_digest: rendered.contract_digest,
    value: cloneJson(artifact),
    rendered: {
      content_type: rendered.content_type,
      output: rendered.rendered_output,
    },
  });
  return deepFreezeArtifactContract({
    status: "accepted",
    reason: null,
    artifact_type: artifactType,
    contract_digest: rendered.contract_digest,
    receipt,
    errors: [],
  });
}
