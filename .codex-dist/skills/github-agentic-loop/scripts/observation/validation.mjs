const FORBIDDEN_JSON_KEYS = new Set(["__proto__", "constructor", "prototype"]);

export function isPlainObject(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function pointerSegment(value) {
  return String(value).replaceAll("~", "~0").replaceAll("/", "~1");
}

export function addError(errors, code, path, message) {
  errors.push({ code, path, message });
}

export function deepFreeze(value) {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

export function isForbiddenJsonKey(key) {
  return FORBIDDEN_JSON_KEYS.has(key);
}

export function validateClosedObject(value, fields, context, path, errors) {
  if (!isPlainObject(value)) {
    addError(errors, `${context}.type`, path, `${context} must be a plain object.`);
    return false;
  }

  const allowed = new Set(fields);
  for (const key of Object.keys(value).sort()) {
    if (isForbiddenJsonKey(key) || !allowed.has(key)) {
      addError(
        errors,
        `${context}.additional_property`,
        `${path}/${pointerSegment(key)}`,
        `Unexpected ${context} property: ${key}.`,
      );
    }
  }
  for (const field of fields) {
    if (!Object.hasOwn(value, field)) {
      addError(errors, `${context}.required`, `${path}/${field}`, `Missing ${context} property: ${field}.`);
    }
  }
  return true;
}

export function validateNonBlankString(value, code, path, label, errors) {
  if (typeof value !== "string") {
    addError(errors, `${code}.type`, path, `${label} must be a string.`);
  } else if (value.trim().length === 0) {
    addError(errors, `${code}.empty`, path, `${label} must not be blank.`);
  }
}
