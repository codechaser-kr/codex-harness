import { loadCompiledArtifactManifest } from "./compiled-manifest-loader.mjs";

function isPlainObject(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function pointer(path, segment) {
  return `${path}/${String(segment).replaceAll("~", "~0").replaceAll("/", "~1")}`;
}

function decodePointerSegment(segment) {
  return segment.replaceAll("~1", "/").replaceAll("~0", "~");
}

function addError(errors, code, path, message) {
  errors.push({ code, path, message });
}

function resolveAll(value, path) {
  if (path === "") return [value];
  const segments = path.split("/").slice(1).map(decodePointerSegment);
  let candidates = [value];
  for (const segment of segments) {
    const next = [];
    for (const candidate of candidates) {
      if (segment === "*") {
        if (Array.isArray(candidate)) next.push(...candidate);
      } else if (isPlainObject(candidate) && Object.hasOwn(candidate, segment)) {
        next.push(candidate[segment]);
      } else if (Array.isArray(candidate) && /^\d+$/.test(segment) && Number(segment) < candidate.length) {
        next.push(candidate[Number(segment)]);
      }
    }
    candidates = next;
  }
  return candidates;
}

function validateFieldDescriptors(value, fields, path, errors) {
  if (!isPlainObject(value)) {
    addError(errors, "artifact.type.object", path, "Value must be a plain object.");
    return;
  }
  const allowed = new Set(fields.map((field) => field.field_id));
  for (const key of Object.keys(value).sort()) {
    if (!allowed.has(key)) {
      addError(errors, "artifact.additional_property", pointer(path, key), `Unexpected artifact property: ${key}.`);
    }
  }
  for (const field of fields) {
    const fieldPath = pointer(path, field.field_id);
    if (!Object.hasOwn(value, field.field_id)) {
      if (field.required) addError(errors, "artifact.required", fieldPath, `Missing required artifact field: ${field.field_id}.`);
      continue;
    }
    validateShape(value[field.field_id], field.shape, fieldPath, errors);
  }
}

function validateShape(value, shape, path, errors) {
  if (shape.type === "string") {
    if (typeof value !== "string") {
      addError(errors, "artifact.type.string", path, "Value must be a string.");
      return;
    }
    if (Number.isInteger(shape.min_length) && value.length < shape.min_length) {
      addError(errors, "artifact.string.min_length", path, `String length must be at least ${shape.min_length}.`);
    }
    if (Array.isArray(shape.enum_values) && !shape.enum_values.includes(value)) {
      addError(errors, "artifact.enum", path, "Value is not in the manifest enum.");
    }
    return;
  }
  if (shape.type === "integer") {
    if (!Number.isInteger(value)) {
      addError(errors, "artifact.type.integer", path, "Value must be an integer.");
      return;
    }
    if (Number.isInteger(shape.minimum) && value < shape.minimum) {
      addError(errors, "artifact.integer.minimum", path, `Integer must be at least ${shape.minimum}.`);
    }
    return;
  }
  if (shape.type === "boolean") {
    if (typeof value !== "boolean") addError(errors, "artifact.type.boolean", path, "Value must be boolean.");
    return;
  }
  if (shape.type === "object") {
    validateFieldDescriptors(value, shape.fields, path, errors);
    return;
  }
  if (!Array.isArray(value)) {
    addError(errors, "artifact.type.array", path, "Value must be an array.");
    return;
  }
  if (Number.isInteger(shape.min_items) && value.length < shape.min_items) {
    addError(errors, "artifact.array.min_items", path, `Array length must be at least ${shape.min_items}.`);
  }
  for (const [index, item] of value.entries()) validateShape(item, shape.items, pointer(path, index), errors);
}

function valuesAt(value, path) {
  const resolved = resolveAll(value, path);
  return resolved.flatMap((entry) => Array.isArray(entry) ? entry : [entry]);
}

function validateUniqueBy(artifact, rule, errors) {
  const collections = resolveAll(artifact, rule.source_path);
  if (collections.length !== 1 || !Array.isArray(collections[0])) return;
  const seen = new Set();
  for (const [index, item] of collections[0].entries()) {
    const values = resolveAll(item, rule.target_path);
    if (values.length !== 1) continue;
    const key = JSON.stringify(values[0]);
    if (seen.has(key)) {
      addError(
        errors,
        "artifact.rule.unique_by.duplicate",
        `${rule.source_path}/${index}${rule.target_path}`,
        `Rule ${rule.rule_id} found a duplicate value.`,
      );
    } else {
      seen.add(key);
    }
  }
}

function validateReferences(artifact, rule, errors) {
  const sources = valuesAt(artifact, rule.source_path);
  const targets = valuesAt(artifact, rule.target_path);
  for (const [index, source] of sources.entries()) {
    if (rule.allow_empty === true && source === "") continue;
    if (!targets.some((target) => Object.is(target, source))) {
      const suffix = sources.length > 1 ? `/${index}` : "";
      addError(
        errors,
        "artifact.rule.references.missing",
        `${rule.source_path}${suffix}`,
        `Rule ${rule.rule_id} references a value that does not exist.`,
      );
    }
  }
}

function validateCoversExactly(artifact, rule, errors) {
  const sources = valuesAt(artifact, rule.source_path);
  const targets = valuesAt(artifact, rule.target_path);
  const seen = new Set();
  for (const [index, source] of sources.entries()) {
    const key = JSON.stringify(source);
    if (seen.has(key)) {
      addError(errors, "artifact.rule.covers_exactly.duplicate", `${rule.source_path}/${index}`, `Rule ${rule.rule_id} contains a duplicate value.`);
    } else {
      seen.add(key);
    }
    if (!targets.some((target) => Object.is(target, source))) {
      addError(errors, "artifact.rule.covers_exactly.unknown", `${rule.source_path}/${index}`, `Rule ${rule.rule_id} contains an unknown value.`);
    }
  }
  for (const target of targets) {
    if (!sources.some((source) => Object.is(source, target))) {
      addError(errors, "artifact.rule.covers_exactly.missing", rule.source_path, `Rule ${rule.rule_id} does not cover every target value.`);
    }
  }
}

function validateRules(artifact, rules, errors) {
  for (const rule of rules) {
    if (rule.rule_type === "unique_by") validateUniqueBy(artifact, rule, errors);
    else if (rule.rule_type === "references") validateReferences(artifact, rule, errors);
    else if (rule.rule_type === "covers_exactly") validateCoversExactly(artifact, rule, errors);
  }
}

export function validateArtifact(manifest, artifact, { compiledManifest } = {}) {
  const prepared = loadCompiledArtifactManifest(manifest, { compiledManifest });
  if (prepared.status === "stopped") {
    return {
      status: "stopped",
      reason: "invalid_artifact_manifest_contract",
      artifact_type: typeof manifest?.artifact_type === "string" ? manifest.artifact_type : null,
      contract_digest: null,
      errors: prepared.errors,
    };
  }

  const compiled = prepared.compiled_manifest;
  const errors = [];
  validateFieldDescriptors(artifact, compiled.source_manifest.fields, "", errors);
  if (errors.length === 0) validateRules(artifact, compiled.rule_plan.rules, errors);
  return {
    status: errors.length === 0 ? "valid" : "invalid",
    reason: errors.length === 0 ? null : "invalid_artifact",
    artifact_type: compiled.source_manifest.artifact_type,
    contract_digest: compiled.contract_digest,
    errors,
  };
}
