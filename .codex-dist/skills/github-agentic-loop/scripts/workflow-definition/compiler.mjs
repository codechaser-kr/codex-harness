import { createHash } from "node:crypto";

import {
  validateWorkflowDefinition,
  WORKFLOW_DEFINITION_VALIDATOR_VERSION,
} from "./validator.mjs";

export const COMPILED_WORKFLOW_DEFINITION_ARTIFACT_TYPE = "compiled_workflow_definition";
export const WORKFLOW_DEFINITION_COMPILER_FORMAT_VERSION = "1";

function digest(value) {
  return `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

export function deepFreeze(value) {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value)) {
    deepFreeze(child);
  }
  return Object.freeze(value);
}

function factValueType(value) {
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "string") return "string";
  return "integer";
}

function buildFactMetadata(definition) {
  const order = Object.keys(definition.facts);
  const byId = {};
  for (const factId of order) {
    const allowedValues = definition.facts[factId];
    Object.defineProperty(byId, factId, {
      value: {
        value_type: factValueType(allowedValues[0]),
        allowed_values: cloneJson(allowedValues),
      },
      enumerable: true,
      configurable: true,
      writable: true,
    });
  }
  return { order, by_id: byId };
}

function buildTransitionLookup(definition) {
  const order = definition.transitions.map((transition) => transition.task_action_id);
  const byTaskActionId = {};
  for (const transition of definition.transitions) {
    Object.defineProperty(byTaskActionId, transition.task_action_id, {
      value: cloneJson(transition),
      enumerable: true,
      configurable: true,
      writable: true,
    });
  }
  return { order, by_task_action_id: byTaskActionId };
}

export function computeWorkflowDefinitionSourceDigest(definition) {
  return digest(definition);
}

export function compiledWorkflowDefinitionDigestPayload(compiledDefinition) {
  return {
    artifact_type: compiledDefinition.artifact_type,
    compiler_format_version: compiledDefinition.compiler_format_version,
    validator_version: compiledDefinition.validator_version,
    source_digest: compiledDefinition.source_digest,
    source_definition: compiledDefinition.source_definition,
    fact_metadata: compiledDefinition.fact_metadata,
    transition_lookup: compiledDefinition.transition_lookup,
  };
}

export function computeCompiledWorkflowDefinitionDigest(compiledDefinition) {
  return digest(compiledWorkflowDefinitionDigestPayload(compiledDefinition));
}

function stopped(reason, errors) {
  return {
    status: "stopped",
    reason,
    compiled_definition: null,
    errors,
  };
}

/**
 * Validates a raw Workflow Definition once and prepares its immutable runtime representation.
 */
export function compileWorkflowDefinition(definition) {
  const validation = validateWorkflowDefinition(definition);
  if (!validation.valid) {
    return stopped("invalid_definition", validation.errors);
  }

  const sourceDefinition = cloneJson(definition);
  const compiledDefinition = {
    artifact_type: COMPILED_WORKFLOW_DEFINITION_ARTIFACT_TYPE,
    compiler_format_version: WORKFLOW_DEFINITION_COMPILER_FORMAT_VERSION,
    validator_version: WORKFLOW_DEFINITION_VALIDATOR_VERSION,
    source_digest: computeWorkflowDefinitionSourceDigest(sourceDefinition),
    compiled_digest: "",
    source_definition: sourceDefinition,
    fact_metadata: buildFactMetadata(sourceDefinition),
    transition_lookup: buildTransitionLookup(sourceDefinition),
  };
  compiledDefinition.compiled_digest = computeCompiledWorkflowDefinitionDigest(compiledDefinition);

  return {
    status: "compiled",
    compiled_definition: deepFreeze(compiledDefinition),
    errors: [],
  };
}
