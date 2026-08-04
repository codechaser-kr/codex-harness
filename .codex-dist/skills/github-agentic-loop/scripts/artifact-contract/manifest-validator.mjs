export const ARTIFACT_MANIFEST_VALIDATOR_VERSION = "1";
export const ARTIFACT_MANIFEST_VERSION = 1;

const IDENTIFIER = /^[a-z][a-z0-9]*(?:[-_][a-z0-9]+)*$/;
const RESERVED_FIELD_IDS = new Set(["__proto__", "prototype", "constructor"]);
const SHAPE_TYPES = new Set(["string", "integer", "boolean", "object", "array"]);
const RULE_TYPES = new Set(["unique_by", "references", "covers_exactly"]);
const ROOT_FIELDS = [
  "artifact_type",
  "manifest_version",
  "producer_skill",
  "contract_section",
  "fields",
  "rules",
  "render",
];
const FIELD_DESCRIPTOR_FIELDS = ["field_id", "required", "render_label", "shape"];
const RULE_FIELDS = ["rule_id", "rule_type", "source_path", "target_path"];

function isPlainObject(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function pointer(path, segment) {
  return `${path}/${String(segment).replaceAll("~", "~0").replaceAll("/", "~1")}`;
}

function addError(errors, code, path, message) {
  errors.push({ code, path, message });
}

function validateClosedObject(value, path, allowedFields, requiredFields, errors, context) {
  if (!isPlainObject(value)) {
    addError(errors, `${context}.type`, path, `${context} must be a plain object.`);
    return false;
  }
  const allowed = new Set(allowedFields);
  for (const key of Object.keys(value).sort()) {
    if (!allowed.has(key)) {
      addError(errors, `${context}.additional_property`, pointer(path, key), `Unexpected ${context} property: ${key}.`);
    }
  }
  for (const field of requiredFields) {
    if (!Object.hasOwn(value, field)) {
      addError(errors, `${context}.required`, pointer(path, field), `Missing ${context} property: ${field}.`);
    }
  }
  return true;
}

function validateNonEmptyString(value, path, errors, code) {
  if (typeof value !== "string" || value.length === 0) {
    addError(errors, code, path, "Value must be a non-empty string.");
    return false;
  }
  return true;
}

function validateIdentifier(value, path, errors, code) {
  if (!validateNonEmptyString(value, path, errors, code)) return false;
  if (!IDENTIFIER.test(value)) {
    addError(errors, code, path, "Value must be a lowercase kebab-case or snake_case identifier.");
    return false;
  }
  return true;
}

function validateFieldDescriptors(value, path, errors) {
  if (!Array.isArray(value) || value.length === 0) {
    addError(errors, "manifest.fields.invalid", path, "fields must be a non-empty array.");
    return;
  }

  const seen = new Set();
  for (const [index, descriptor] of value.entries()) {
    const descriptorPath = pointer(path, index);
    if (!validateClosedObject(
      descriptor,
      descriptorPath,
      FIELD_DESCRIPTOR_FIELDS,
      FIELD_DESCRIPTOR_FIELDS,
      errors,
      "manifest.field",
    )) continue;

    if (validateIdentifier(descriptor.field_id, `${descriptorPath}/field_id`, errors, "manifest.field.field_id.invalid")) {
      if (RESERVED_FIELD_IDS.has(descriptor.field_id)) {
        addError(errors, "manifest.field.field_id.reserved", `${descriptorPath}/field_id`, "field_id is reserved.");
      } else if (seen.has(descriptor.field_id)) {
        addError(errors, "manifest.field.field_id.duplicate", `${descriptorPath}/field_id`, `Duplicate field_id: ${descriptor.field_id}.`);
      } else {
        seen.add(descriptor.field_id);
      }
    }
    if (typeof descriptor.required !== "boolean") {
      addError(errors, "manifest.field.required.type", `${descriptorPath}/required`, "required must be boolean.");
    }
    validateNonEmptyString(
      descriptor.render_label,
      `${descriptorPath}/render_label`,
      errors,
      "manifest.field.render_label.invalid",
    );
    validateShape(descriptor.shape, `${descriptorPath}/shape`, errors);
  }
}

function validateShape(value, path, errors) {
  if (!isPlainObject(value)) {
    addError(errors, "manifest.shape.type", path, "shape must be a plain object.");
    return;
  }
  const type = value.type;
  const allowedByType = {
    string: ["type", "min_length", "enum_values"],
    integer: ["type", "minimum"],
    boolean: ["type"],
    object: ["type", "fields", "additional_properties"],
    array: ["type", "items", "min_items"],
  };
  const allowed = allowedByType[type] ?? ["type"];
  validateClosedObject(value, path, allowed, ["type"], errors, "manifest.shape");
  if (!SHAPE_TYPES.has(type)) {
    addError(errors, "manifest.shape.type.unsupported", `${path}/type`, "shape type is not supported.");
    return;
  }

  if (type === "string") {
    if (Object.hasOwn(value, "min_length") && (!Number.isInteger(value.min_length) || value.min_length < 0)) {
      addError(errors, "manifest.shape.min_length.invalid", `${path}/min_length`, "min_length must be a non-negative integer.");
    }
    if (Object.hasOwn(value, "enum_values")) {
      if (!Array.isArray(value.enum_values) || value.enum_values.length === 0 || value.enum_values.some((entry) => typeof entry !== "string")) {
        addError(errors, "manifest.shape.enum_values.invalid", `${path}/enum_values`, "enum_values must be a non-empty string array.");
      } else if (new Set(value.enum_values).size !== value.enum_values.length) {
        addError(errors, "manifest.shape.enum_values.duplicate", `${path}/enum_values`, "enum_values must not contain duplicates.");
      }
    }
  } else if (type === "integer" && Object.hasOwn(value, "minimum") && !Number.isInteger(value.minimum)) {
    addError(errors, "manifest.shape.minimum.invalid", `${path}/minimum`, "minimum must be an integer.");
  } else if (type === "object") {
    if (value.additional_properties !== false) {
      addError(errors, "manifest.shape.additional_properties.invalid", `${path}/additional_properties`, "object shape must set additional_properties to false.");
    }
    validateFieldDescriptors(value.fields, `${path}/fields`, errors);
  } else if (type === "array") {
    validateShape(value.items, `${path}/items`, errors);
    if (Object.hasOwn(value, "min_items") && (!Number.isInteger(value.min_items) || value.min_items < 0)) {
      addError(errors, "manifest.shape.min_items.invalid", `${path}/min_items`, "min_items must be a non-negative integer.");
    }
  }
}

function validateRules(value, path, errors) {
  if (!Array.isArray(value)) {
    addError(errors, "manifest.rules.type", path, "rules must be an array.");
    return;
  }
  const seen = new Set();
  for (const [index, rule] of value.entries()) {
    const rulePath = pointer(path, index);
    if (!validateClosedObject(rule, rulePath, RULE_FIELDS, RULE_FIELDS, errors, "manifest.rule")) continue;
    if (validateIdentifier(rule.rule_id, `${rulePath}/rule_id`, errors, "manifest.rule.rule_id.invalid")) {
      if (seen.has(rule.rule_id)) {
        addError(errors, "manifest.rule.rule_id.duplicate", `${rulePath}/rule_id`, `Duplicate rule_id: ${rule.rule_id}.`);
      } else {
        seen.add(rule.rule_id);
      }
    }
    if (!RULE_TYPES.has(rule.rule_type)) {
      addError(errors, "manifest.rule.rule_type.unsupported", `${rulePath}/rule_type`, "rule_type is not supported.");
    }
    for (const field of ["source_path", "target_path"]) {
      if (typeof rule[field] !== "string" || !rule[field].startsWith("/")) {
        addError(errors, `manifest.rule.${field}.invalid`, `${rulePath}/${field}`, `${field} must be a JSON Pointer beginning with /.`);
      }
    }
  }
}

function validateRender(value, path, fieldIds, errors) {
  if (!validateClosedObject(value, path, ["section_order"], ["section_order"], errors, "manifest.render")) return;
  if (!Array.isArray(value.section_order) || value.section_order.some((entry) => typeof entry !== "string")) {
    addError(errors, "manifest.render.section_order.type", `${path}/section_order`, "section_order must be a string array.");
    return;
  }
  const seen = new Set();
  for (const [index, fieldId] of value.section_order.entries()) {
    if (seen.has(fieldId)) {
      addError(errors, "manifest.render.section_order.duplicate", `${path}/section_order/${index}`, `Duplicate rendered field: ${fieldId}.`);
    }
    seen.add(fieldId);
    if (!fieldIds.includes(fieldId)) {
      addError(errors, "manifest.render.section_order.unknown", `${path}/section_order/${index}`, `Unknown rendered field: ${fieldId}.`);
    }
  }
  for (const fieldId of fieldIds) {
    if (!seen.has(fieldId)) {
      addError(errors, "manifest.render.section_order.missing", `${path}/section_order`, `Missing rendered field: ${fieldId}.`);
    }
  }
}

export function validateArtifactManifest(manifest) {
  const errors = [];
  if (!validateClosedObject(manifest, "", ROOT_FIELDS, ROOT_FIELDS, errors, "manifest")) {
    return { valid: false, errors };
  }

  validateIdentifier(manifest.artifact_type, "/artifact_type", errors, "manifest.artifact_type.invalid");
  if (manifest.manifest_version !== ARTIFACT_MANIFEST_VERSION) {
    addError(errors, "manifest.manifest_version.unsupported", "/manifest_version", `manifest_version must be ${ARTIFACT_MANIFEST_VERSION}.`);
  }
  validateIdentifier(manifest.producer_skill, "/producer_skill", errors, "manifest.producer_skill.invalid");
  if (typeof manifest.producer_skill === "string"
    && typeof manifest.artifact_type === "string"
    && manifest.producer_skill !== manifest.artifact_type) {
    addError(
      errors,
      "manifest.producer_skill.mismatch",
      "/producer_skill",
      "producer_skill must match artifact_type.",
    );
  }
  validateNonEmptyString(manifest.contract_section, "/contract_section", errors, "manifest.contract_section.invalid");
  validateFieldDescriptors(manifest.fields, "/fields", errors);
  validateRules(manifest.rules, "/rules", errors);
  const fieldIds = Array.isArray(manifest.fields)
    ? manifest.fields.filter(isPlainObject).map((field) => field.field_id).filter((fieldId) => typeof fieldId === "string")
    : [];
  validateRender(manifest.render, "/render", fieldIds, errors);
  return { valid: errors.length === 0, errors };
}
