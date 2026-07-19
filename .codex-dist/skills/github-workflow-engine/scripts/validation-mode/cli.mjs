import { pathToFileURL } from "node:url";

import { compareValidationResults } from "./comparator.mjs";

function isPlainObject(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function requestIdFrom(value) {
  return isPlainObject(value?.request) && typeof value.request.request_id === "string" && value.request.request_id.length > 0
    ? value.request.request_id
    : null;
}

function stopped(requestId, reason, receiptCount, code, path, message) {
  return {
    request_id: requestId,
    status: "stopped",
    reason,
    receipt_count: receiptCount,
    errors: [{ code, path, message }],
  };
}

export function runValidationModeEnvelope(envelope) {
  try {
    if (!isPlainObject(envelope)) {
      return stopped(null, "invalid_envelope", 0, "validation_envelope.type", "", "Expected a JSON object envelope.");
    }
    const fields = ["request", "receipts"];
    for (const key of Object.keys(envelope).sort()) {
      if (!fields.includes(key)) {
        return stopped(requestIdFrom(envelope), "invalid_envelope", 0, "validation_envelope.additional_property", `/${key}`, `Unexpected property: ${key}.`);
      }
    }
    for (const field of fields) {
      if (!Object.hasOwn(envelope, field)) {
        return stopped(requestIdFrom(envelope), "invalid_envelope", 0, "validation_envelope.required", `/${field}`, `Missing required property: ${field}.`);
      }
    }
    return compareValidationResults(envelope.request, envelope.receipts);
  } catch {
    return stopped(null, "invalid_envelope", 0, "validation_mode.internal", "", "Validation envelope could not be inspected.");
  }
}

async function readStdin(input) {
  let source = "";
  for await (const chunk of input) {
    source += chunk;
  }
  return source;
}

export async function runValidationModeCli({ input = process.stdin, args = [] } = {}) {
  if (!Array.isArray(args) || args.length > 0) {
    return stopped(null, "invalid_envelope", 0, "cli.arguments.forbidden", "", "This CLI accepts JSON from stdin and no arguments.");
  }
  let source;
  try {
    source = await readStdin(input);
  } catch {
    return stopped(null, "invalid_envelope", 0, "cli.stdin.read_failed", "", "Unable to read validation envelope from stdin.");
  }
  if (source.trim().length === 0) {
    return stopped(null, "invalid_envelope", 0, "cli.stdin.empty", "", "stdin must contain one JSON envelope.");
  }
  try {
    return runValidationModeEnvelope(JSON.parse(source));
  } catch {
    return stopped(null, "invalid_envelope", 0, "cli.stdin.invalid_json", "", "stdin must contain one valid JSON envelope.");
  }
}

async function main() {
  const result = await runValidationModeCli({ args: process.argv.slice(2) });
  process.stdout.write(`${JSON.stringify(result)}\n`);
  process.exitCode = result.status === "pass" ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => {
    process.stdout.write(`${JSON.stringify(stopped(null, "invalid_envelope", 0, "validation_mode.internal", "", "Validation CLI failed."))}\n`);
    process.exitCode = 1;
  });
}
