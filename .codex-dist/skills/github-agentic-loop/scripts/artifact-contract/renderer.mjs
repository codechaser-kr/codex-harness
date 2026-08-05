import { loadCompiledArtifactManifest } from "./compiled-manifest-loader.mjs";
import { validateArtifact } from "./validator.mjs";

function scalarText(value) {
  if (value === "") return "N/A";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

function appendScalar(lines, prefix, value, continuationIndent) {
  const parts = scalarText(value).split("\n");
  lines.push(`${prefix}${parts[0]}`);
  for (const part of parts.slice(1)) lines.push(`${" ".repeat(continuationIndent)}${part}`);
}

function renderObject(value, shape, indent) {
  const lines = [];
  for (const field of shape.fields) {
    const prefix = `${" ".repeat(indent)}- ${field.render_label}:`;
    if (!Object.hasOwn(value, field.field_id)) {
      lines.push(`${prefix} N/A`);
      continue;
    }
    if (field.shape.type === "string" || field.shape.type === "integer" || field.shape.type === "boolean") {
      appendScalar(lines, `${prefix} `, value[field.field_id], indent + 2);
    } else {
      lines.push(prefix);
      lines.push(...renderValue(value[field.field_id], field.shape, indent + 2));
    }
  }
  return lines;
}

function renderArray(value, shape, indent) {
  if (value.length === 0) return [`${" ".repeat(indent)}없음`];
  const lines = [];
  for (const [index, item] of value.entries()) {
    if (shape.items.type === "string" || shape.items.type === "integer" || shape.items.type === "boolean") {
      appendScalar(lines, `${" ".repeat(indent)}- `, item, indent + 2);
    } else if (shape.items.type === "object") {
      lines.push(`${" ".repeat(indent)}- 항목 ${index + 1}`);
      lines.push(...renderObject(item, shape.items, indent + 2));
    } else {
      lines.push(`${" ".repeat(indent)}- 항목 ${index + 1}`);
      lines.push(...renderValue(item, shape.items, indent + 2));
    }
  }
  return lines;
}

function renderValue(value, shape, indent) {
  if (shape.type === "string" || shape.type === "integer" || shape.type === "boolean") {
    return scalarText(value).split("\n").map((line) => `${" ".repeat(indent)}${line}`);
  }
  if (shape.type === "object") return renderObject(value, shape, indent);
  return renderArray(value, shape, indent);
}

function stopped(validation) {
  return {
    status: "stopped",
    reason: validation.reason,
    artifact_type: validation.artifact_type,
    contract_digest: validation.contract_digest,
    content_type: "text/markdown",
    rendered_output: null,
    errors: validation.errors,
  };
}

export function renderArtifact(manifest, artifact, { compiledManifest } = {}) {
  const prepared = loadCompiledArtifactManifest(manifest, { compiledManifest });
  if (prepared.status === "stopped") {
    return stopped({
      reason: "invalid_artifact_manifest_contract",
      artifact_type: typeof manifest?.artifact_type === "string" ? manifest.artifact_type : null,
      contract_digest: null,
      errors: prepared.errors,
    });
  }

  const compiled = prepared.compiled_manifest;
  const validation = validateArtifact(compiled.source_manifest, artifact, { compiledManifest: compiled });
  if (validation.status !== "valid") return stopped(validation);

  const sections = [];
  for (const fieldId of compiled.render_plan.section_order) {
    const field = compiled.field_index.by_id[fieldId];
    const content = Object.hasOwn(artifact, fieldId)
      ? renderValue(artifact[fieldId], field.shape, 0).join("\n")
      : "N/A";
    sections.push(`## ${field.render_label}\n\n${content}`);
  }
  return {
    status: "rendered",
    reason: null,
    artifact_type: validation.artifact_type,
    contract_digest: validation.contract_digest,
    content_type: "text/markdown",
    rendered_output: `${sections.join("\n\n")}\n`,
    errors: [],
  };
}
