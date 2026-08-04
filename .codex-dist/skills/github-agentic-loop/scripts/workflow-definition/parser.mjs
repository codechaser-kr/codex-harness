import { readFile } from "node:fs/promises";

function parseError(code, message) {
  return { code, path: "", message };
}

export function parseJson(source) {
  if (typeof source !== "string") {
    return {
      ok: false,
      error: parseError("parse.input_not_string", "JSON input must be a string."),
    };
  }

  try {
    return { ok: true, value: JSON.parse(source) };
  } catch (error) {
    return {
      ok: false,
      error: parseError("parse.invalid_json", `Invalid JSON: ${error.message}`),
    };
  }
}

export async function parseJsonFile(filePath) {
  const isStringPath = typeof filePath === "string" && filePath.length > 0;
  const isFileUrl = filePath instanceof URL && filePath.protocol === "file:";
  if (!isStringPath && !isFileUrl) {
    return {
      ok: false,
      error: parseError("parse.file_path_invalid", "JSON file path must be a non-empty string or file URL."),
    };
  }

  let source;
  try {
    source = await readFile(filePath, "utf8");
  } catch (error) {
    return {
      ok: false,
      error: parseError("parse.file_read_failed", `Unable to read JSON file: ${error.message}`),
    };
  }

  return parseJson(source);
}
