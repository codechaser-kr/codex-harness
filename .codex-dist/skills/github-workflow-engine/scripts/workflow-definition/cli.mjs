import { parseJsonFile } from "./parser.mjs";
import { evaluateWorkflowDefinition } from "./evaluator.mjs";
import { validateWorkflowDefinition } from "./validator.mjs";

function usage(message) {
  return {
    exitCode: 2,
    result: {
      status: "stopped",
      reason: "usage_error",
      errors: [{ code: "cli.usage", path: "", message }],
    },
  };
}

function invalidInput(reason, error) {
  return {
    exitCode: 1,
    result: { status: "stopped", reason, errors: [error] },
  };
}

function parseOptions(argumentsList) {
  const [command, ...tokens] = argumentsList;
  if (command !== "validate" && command !== "evaluate") {
    return { error: "Expected command validate or evaluate." };
  }
  const values = {};
  for (let index = 0; index < tokens.length; index += 1) {
    const flag = tokens[index];
    if (!["--definition", "--state", "--current-transition-id"].includes(flag)) {
      return { error: `Unexpected argument: ${flag}.` };
    }
    if (Object.hasOwn(values, flag)) {
      return { error: `Duplicate argument: ${flag}.` };
    }
    const value = tokens[index + 1];
    if (typeof value !== "string" || value.startsWith("--")) {
      return { error: `Missing value for ${flag}.` };
    }
    if (value.length === 0) {
      return { error: `Empty value for ${flag}.` };
    }
    values[flag] = value;
    index += 1;
  }
  if (!values["--definition"]) {
    return { error: "--definition is required." };
  }
  if (command === "validate" && (values["--state"] || values["--current-transition-id"])) {
    return { error: "validate accepts only --definition." };
  }
  if (command === "evaluate" && !values["--state"]) {
    return { error: "evaluate requires --state." };
  }
  return { command, values };
}

export async function runWorkflowDefinitionCli(argumentsList) {
  const parsedArguments = parseOptions(argumentsList);
  if (parsedArguments.error) {
    return usage(parsedArguments.error);
  }

  const definitionResult = await parseJsonFile(parsedArguments.values["--definition"]);
  if (!definitionResult.ok) {
    return invalidInput("invalid_definition", definitionResult.error);
  }
  if (parsedArguments.command === "validate") {
    const validation = validateWorkflowDefinition(definitionResult.value);
    if (validation.valid) {
      return { exitCode: 0, result: { status: "valid", errors: [] } };
    }
    return { exitCode: 1, result: { status: "stopped", reason: "invalid_definition", errors: validation.errors } };
  }

  const stateResult = await parseJsonFile(parsedArguments.values["--state"]);
  if (!stateResult.ok) {
    return invalidInput("invalid_state", stateResult.error);
  }
  const result = evaluateWorkflowDefinition(definitionResult.value, stateResult.value, {
    currentTransitionId: parsedArguments.values["--current-transition-id"],
  });
  return {
    exitCode: result.status === "action_required" || result.status === "completed" ? 0 : 1,
    result,
  };
}

async function main() {
  const response = await runWorkflowDefinitionCli(process.argv.slice(2));
  process.stdout.write(`${JSON.stringify(response.result)}\n`);
  process.exitCode = response.exitCode;
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main().catch((error) => {
    process.stdout.write(`${JSON.stringify({
      status: "stopped",
      reason: "internal_error",
      errors: [{ code: "cli.internal", path: "", message: error.message }],
    })}\n`);
    process.exitCode = 1;
  });
}
