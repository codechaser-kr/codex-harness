import { loadCompiledWorkflowDefinition } from "./compiled-definition-loader.mjs";
import { COMPILED_WORKFLOW_DEFINITION_ARTIFACT_TYPE } from "./compiler.mjs";

function isPlainObject(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function isCompiledDefinitionCandidate(value) {
  return isPlainObject(value)
    && value.artifact_type === COMPILED_WORKFLOW_DEFINITION_ARTIFACT_TYPE;
}

/**
 * Produces the single compiled representation consumed by runtime adapters and evaluators.
 */
export function prepareWorkflowDefinition(definition, { compiledDefinition } = {}) {
  let sourceDefinition = definition;
  let candidate = compiledDefinition;
  if (candidate === undefined && isCompiledDefinitionCandidate(definition)) {
    sourceDefinition = definition.source_definition;
    candidate = definition;
  }

  const loaded = loadCompiledWorkflowDefinition(sourceDefinition, {
    compiledDefinition: candidate,
  });
  if (loaded.status === "stopped") {
    return {
      status: "stopped",
      reason: loaded.reason,
      preparation: null,
      source_definition: null,
      compiled_definition: null,
      errors: loaded.errors,
    };
  }
  return {
    status: "prepared",
    preparation: loaded.preparation,
    source_definition: loaded.compiled_definition.source_definition,
    compiled_definition: loaded.compiled_definition,
    errors: [],
  };
}
