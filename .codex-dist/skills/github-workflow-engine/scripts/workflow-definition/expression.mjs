const LEAF_OPERATORS = new Set([
  "equals",
  "not_equals",
  "in",
  "not_in",
  "exists",
  "not_exists",
]);

function escapePointerSegment(segment) {
  return String(segment).replaceAll("~", "~0").replaceAll("/", "~1");
}

function childPath(path, segment) {
  return `${path}/${escapePointerSegment(segment)}`;
}

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function addError(errors, code, path, message) {
  errors.push({ code, path, message });
}

function validateClosedObject(value, path, allowedKeys, errors, context) {
  if (!isObject(value)) {
    addError(errors, `${context}.type`, path, "Expected an object.");
    return false;
  }

  for (const key of Object.keys(value)) {
    if (key === "priority") {
      addError(errors, "priority.forbidden", childPath(path, key), "priority is not allowed.");
    } else if (!allowedKeys.has(key)) {
      addError(errors, "object.additional_property", childPath(path, key), `Unexpected property: ${key}.`);
    }
  }

  return true;
}

function requireProperties(value, path, names, errors, context) {
  for (const name of names) {
    if (!Object.hasOwn(value, name)) {
      addError(errors, `${context}.required`, childPath(path, name), `Missing required property: ${name}.`);
    }
  }
}

function isFactValue(value) {
  return typeof value === "boolean" || typeof value === "string" || Number.isInteger(value);
}

function matchesFactType(value, valueType) {
  if (valueType === "boolean") {
    return typeof value === "boolean";
  }
  if (valueType === "string") {
    return typeof value === "string";
  }
  return valueType === "integer" && Number.isInteger(value);
}

function isAllowedValue(value, fact) {
  return Array.isArray(fact.allowedValues) && fact.allowedValues.some((allowed) => allowed === value);
}

function validateValue(value, path, fact, errors) {
  if (!isFactValue(value)) {
    addError(errors, "expression.value.type", path, "Expected a boolean, string, or integer value.");
    return;
  }
  if (!fact) {
    return;
  }
  if (!matchesFactType(value, fact.valueType)) {
    addError(errors, "expression.value.type_mismatch", path, `Value must match fact type ${fact.valueType}.`);
    return;
  }
  if (!isAllowedValue(value, fact)) {
    addError(errors, "expression.value.not_allowed", path, "Value is not in the fact allowed_values domain.");
  }
}

function validateLeaf(value, path, facts, errors) {
  if (!validateClosedObject(value, path, new Set(["fact_id", "operator", "value"]), errors, "expression")) {
    return;
  }
  requireProperties(value, path, ["fact_id", "operator"], errors, "expression");

  let fact;
  if (Object.hasOwn(value, "fact_id")) {
    const factPath = childPath(path, "fact_id");
    if (typeof value.fact_id !== "string" || value.fact_id.length === 0) {
      addError(errors, "expression.fact_id.invalid", factPath, "fact_id must be a non-empty string.");
    } else {
      fact = facts.get(value.fact_id);
      if (!fact) {
        addError(errors, "expression.fact.unknown", factPath, `Unknown fact_id: ${value.fact_id}.`);
      }
    }
  }

  if (!Object.hasOwn(value, "operator")) {
    return;
  }
  const operatorPath = childPath(path, "operator");
  if (typeof value.operator !== "string" || !LEAF_OPERATORS.has(value.operator)) {
    addError(errors, "expression.operator.invalid", operatorPath, "Unsupported leaf operator.");
    return;
  }

  const valuePath = childPath(path, "value");
  if (value.operator === "exists" || value.operator === "not_exists") {
    if (Object.hasOwn(value, "value")) {
      addError(errors, "expression.value.forbidden", valuePath, `${value.operator} must not include value.`);
    }
    return;
  }

  if (!Object.hasOwn(value, "value")) {
    addError(errors, "expression.value.required", valuePath, `${value.operator} requires value.`);
    return;
  }

  if (value.operator === "equals" || value.operator === "not_equals") {
    validateValue(value.value, valuePath, fact, errors);
    return;
  }

  if (!Array.isArray(value.value)) {
    addError(errors, "expression.value.type", valuePath, `${value.operator} requires a non-empty array.`);
    return;
  }
  if (value.value.length === 0) {
    addError(errors, "expression.value.empty", valuePath, `${value.operator} requires a non-empty array.`);
  }
  for (let index = 0; index < value.value.length; index += 1) {
    validateValue(value.value[index], childPath(valuePath, index), fact, errors);
  }
}

function validateComposite(value, path, facts, errors, key) {
  if (!validateClosedObject(value, path, new Set([key]), errors, "expression")) {
    return;
  }
  if (!Object.hasOwn(value, key)) {
    addError(errors, "expression.required", childPath(path, key), `Missing required property: ${key}.`);
    return;
  }
  const collection = value[key];
  const collectionPath = childPath(path, key);
  if (!Array.isArray(collection)) {
    addError(errors, "expression.type", collectionPath, `${key} must be an array.`);
    return;
  }
  if (collection.length === 0) {
    addError(errors, "expression.empty", collectionPath, `${key} must not be empty.`);
  }
  for (let index = 0; index < collection.length; index += 1) {
    validateExpressionInto(collection[index], childPath(collectionPath, index), facts, errors);
  }
}

function validateNot(value, path, facts, errors) {
  if (!validateClosedObject(value, path, new Set(["not"]), errors, "expression")) {
    return;
  }
  if (!Object.hasOwn(value, "not")) {
    addError(errors, "expression.required", childPath(path, "not"), "Missing required property: not.");
    return;
  }
  validateExpressionInto(value.not, childPath(path, "not"), facts, errors);
}

function validateExpressionInto(value, path, facts, errors) {
  if (!isObject(value)) {
    addError(errors, "expression.type", path, "Expression must be an object.");
    return;
  }

  const hasLeafKey = ["fact_id", "operator", "value"].some((key) => Object.hasOwn(value, key));
  const forms = [
    hasLeafKey ? "leaf" : null,
    Object.hasOwn(value, "all") ? "all" : null,
    Object.hasOwn(value, "any") ? "any" : null,
    Object.hasOwn(value, "not") ? "not" : null,
  ].filter(Boolean);

  if (forms.length !== 1) {
    if (Object.hasOwn(value, "priority")) {
      addError(errors, "priority.forbidden", childPath(path, "priority"), "priority is not allowed.");
    }
    addError(errors, "expression.form", path, "Expression must contain exactly one supported form.");
    return;
  }
  if (forms[0] === "leaf") {
    validateLeaf(value, path, facts, errors);
  } else if (forms[0] === "not") {
    validateNot(value, path, facts, errors);
  } else {
    validateComposite(value, path, facts, errors, forms[0]);
  }
}

export function validateExpression(value, { path = "", facts = new Map() } = {}) {
  const errors = [];
  const factMap = facts instanceof Map ? facts : new Map(Object.entries(facts));
  validateExpressionInto(value, path, factMap, errors);
  return errors;
}
