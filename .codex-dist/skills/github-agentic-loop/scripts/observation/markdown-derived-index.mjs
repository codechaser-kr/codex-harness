import { createHash } from "node:crypto";

import {
  addError,
  deepFreeze,
  validateClosedObject,
  validateNonBlankString,
} from "./validation.mjs";

export const MARKDOWN_DERIVED_INDEX_TYPE = "markdown_derived_index";
export const MARKDOWN_DERIVED_INDEX_FORMAT_VERSION = "1";
export const MARKDOWN_DERIVED_INDEX_PARSER_VERSION = "1";

const SHA256_DIGEST = /^sha256:[0-9a-f]{64}$/;
const INPUT_FIELDS = ["body", "body_digest", "parser_version"];
const INDEX_FIELDS = [
  "index_type",
  "format_version",
  "index_digest",
  "body_digest",
  "parser_version",
  "headings",
  "sections",
  "checkboxes",
  "references",
];
const HEADING_FIELDS = ["level", "text", "line"];
const SECTION_FIELDS = ["heading_index", "heading_text", "level", "start_line", "end_line", "value"];
const CHECKBOX_FIELDS = ["line", "column", "checked", "text", "heading_index"];
const REFERENCE_FIELDS = [
  "line",
  "column",
  "reference_type",
  "number",
  "relationship",
  "heading_index",
];

function digestText(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function stopped(reason, errors) {
  return deepFreeze({
    status: "stopped",
    reason,
    preparation: null,
    markdown_index: null,
    errors,
  });
}

function positiveInteger(value, code, path, label, errors, { allowZero = false } = {}) {
  const minimum = allowZero ? 0 : 1;
  if (!Number.isInteger(value) || value < minimum) {
    addError(errors, code, path, `${label} must be an integer greater than or equal to ${minimum}.`);
  }
}

function optionalHeadingIndex(value, code, path, errors) {
  if (value !== null && (!Number.isInteger(value) || value < 0)) {
    addError(errors, code, path, "heading_index must be null or a non-negative integer.");
  }
}

function validateInput(input) {
  const errors = [];
  if (!validateClosedObject(input, INPUT_FIELDS, "markdown_derived_index_input", "", errors)) {
    return errors;
  }
  if (typeof input.body !== "string") {
    addError(errors, "markdown_derived_index_input.body.type", "/body", "body must be a string.");
  }
  if (typeof input.body_digest !== "string" || !SHA256_DIGEST.test(input.body_digest)) {
    addError(
      errors,
      "markdown_derived_index_input.body_digest.invalid",
      "/body_digest",
      "body_digest must be a sha256 digest.",
    );
  } else if (typeof input.body === "string" && input.body_digest !== digestText(input.body)) {
    addError(
      errors,
      "markdown_derived_index_input.body_digest.mismatch",
      "/body_digest",
      "body_digest does not match body.",
    );
  }
  validateNonBlankString(
    input.parser_version,
    "markdown_derived_index_input.parser_version",
    "/parser_version",
    "parser_version",
    errors,
  );
  if (typeof input.parser_version === "string"
    && input.parser_version !== MARKDOWN_DERIVED_INDEX_PARSER_VERSION) {
    addError(
      errors,
      "markdown_derived_index_input.parser_version.unsupported",
      "/parser_version",
      "parser_version is not supported.",
    );
  }
  return errors;
}

function stripInlineCode(line) {
  const characters = line.split("");
  let index = 0;
  while (index < characters.length) {
    if (characters[index] !== "`") {
      index += 1;
      continue;
    }
    let runLength = 1;
    while (characters[index + runLength] === "`") runLength += 1;
    let closing = index + runLength;
    while (closing < characters.length) {
      if (characters[closing] !== "`") {
        closing += 1;
        continue;
      }
      let closingLength = 1;
      while (characters[closing + closingLength] === "`") closingLength += 1;
      if (closingLength === runLength) break;
      closing += closingLength;
    }
    if (closing >= characters.length) {
      index += runLength;
      continue;
    }
    for (let cursor = index; cursor < closing + runLength; cursor += 1) characters[cursor] = " ";
    index = closing + runLength;
  }
  return characters.join("");
}

function stripHtmlComments(line, commentState) {
  const characters = line.split("");
  let searchable = commentState.open ? line : stripInlineCode(line);
  let cursor = 0;
  while (cursor < line.length) {
    if (commentState.open) {
      const closing = searchable.indexOf("-->", cursor);
      const end = closing === -1 ? line.length : closing + 3;
      for (let index = cursor; index < end; index += 1) characters[index] = " ";
      if (closing === -1) return characters.join("");
      commentState.open = false;
      searchable = stripInlineCode(line);
      cursor = end;
      continue;
    }
    const opening = searchable.indexOf("<!--", cursor);
    if (opening === -1) break;
    const closing = searchable.indexOf("-->", opening + 4);
    const end = closing === -1 ? line.length : closing + 3;
    for (let index = opening; index < end; index += 1) characters[index] = " ";
    if (closing === -1) {
      commentState.open = true;
      break;
    }
    cursor = end;
  }
  return characters.join("");
}

function relationshipAt(line, column) {
  return /\bRefs?\s*$/i.test(line.slice(0, column)) ? "refs" : "mention";
}

function parseReferences(line, lineNumber, headingIndex) {
  const masked = stripInlineCode(line);
  const references = [];
  const urlRanges = [];
  const urlPattern = /https:\/\/github\.com\/[^\s/]+\/[^\s/]+\/(issues|pull)\/(\d+)/g;
  for (const match of masked.matchAll(urlPattern)) {
    const column = match.index;
    urlRanges.push([column, column + match[0].length]);
    references.push({
      line: lineNumber,
      column: column + 1,
      reference_type: match[1] === "issues" ? "issue" : "pull_request",
      number: Number(match[2]),
      relationship: relationshipAt(masked, column),
      heading_index: headingIndex,
    });
  }

  for (const match of masked.matchAll(/#([1-9]\d*)/g)) {
    const column = match.index;
    if (urlRanges.some(([start, end]) => column >= start && column < end)) continue;
    references.push({
      line: lineNumber,
      column: column + 1,
      reference_type: "issue_or_pull_request",
      number: Number(match[1]),
      relationship: relationshipAt(masked, column),
      heading_index: headingIndex,
    });
  }
  return references.sort((left, right) => left.column - right.column
    || (left.reference_type < right.reference_type ? -1 : left.reference_type > right.reference_type ? 1 : 0));
}

function sectionValue(lines, startIndex, endIndex) {
  return lines
    .slice(startIndex, endIndex)
    .join("\n")
    .replace(/<!--[\s\S]*?-->/g, "")
    .trim();
}

function parseMarkdown(body) {
  const lines = body.split(/\r?\n/);
  const headings = [];
  const checkboxes = [];
  const references = [];
  let currentHeadingIndex = null;
  let fence = null;
  const commentState = { open: false };

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    if (fence !== null) {
      const closingFence = line.match(/^\s*(`{3,}|~{3,})/);
      if (closingFence
        && closingFence[1][0] === fence.character
        && closingFence[1].length >= fence.length) {
        fence = null;
      }
      return;
    }

    const visibleLine = stripHtmlComments(line, commentState);
    const openingFence = visibleLine.match(/^\s*(`{3,}|~{3,})/);
    if (openingFence) {
      fence = { character: openingFence[1][0], length: openingFence[1].length };
      return;
    }

    const headingMatch = visibleLine.match(/^(#{1,6})[ \t]+(.*)$/);
    const headingText = headingMatch?.[2]
      .trimEnd()
      .replace(/[ \t]+#+[ \t]*$/, "")
      .trim();
    if (headingMatch && headingText.length > 0) {
      const heading = {
        level: headingMatch[1].length,
        text: headingText,
        line: lineNumber,
      };
      currentHeadingIndex = headings.length;
      headings.push(heading);
    }

    const checkboxMatch = visibleLine.match(/^\s*[-*+]\s+\[([ xX])\]\s+(.*)$/);
    if (checkboxMatch) {
      checkboxes.push({
        line: lineNumber,
        column: visibleLine.indexOf("[") + 1,
        checked: checkboxMatch[1].toLowerCase() === "x",
        text: checkboxMatch[2].trim(),
        heading_index: currentHeadingIndex,
      });
    }
    references.push(...parseReferences(visibleLine, lineNumber, currentHeadingIndex));
  });

  const sections = headings.map((heading, headingIndex) => {
    const nextHeading = headings[headingIndex + 1];
    const endLine = nextHeading === undefined ? lines.length : nextHeading.line - 1;
    return {
      heading_index: headingIndex,
      heading_text: heading.text,
      level: heading.level,
      start_line: heading.line + 1,
      end_line: endLine,
      value: sectionValue(lines, heading.line, endLine),
    };
  });

  return { headings, sections, checkboxes, references };
}

function digestPayload(value) {
  return {
    index_type: MARKDOWN_DERIVED_INDEX_TYPE,
    format_version: MARKDOWN_DERIVED_INDEX_FORMAT_VERSION,
    body_digest: value.body_digest,
    parser_version: value.parser_version,
    headings: value.headings,
    sections: value.sections,
    checkboxes: value.checkboxes,
    references: value.references,
  };
}

export function computeMarkdownDerivedIndexDigest(value) {
  return digestText(JSON.stringify(digestPayload(value)));
}

function buildIndex(input) {
  const parsed = parseMarkdown(input.body);
  const payload = digestPayload({
    body_digest: input.body_digest,
    parser_version: input.parser_version,
    ...parsed,
  });
  return deepFreeze({
    index_type: payload.index_type,
    format_version: payload.format_version,
    index_digest: computeMarkdownDerivedIndexDigest(payload),
    body_digest: payload.body_digest,
    parser_version: payload.parser_version,
    headings: payload.headings,
    sections: payload.sections,
    checkboxes: payload.checkboxes,
    references: payload.references,
  });
}

function validateObjectArray(value, fields, context, path, errors, validateItem) {
  if (!Array.isArray(value)) {
    addError(errors, `${context}.type`, path, `${context} must be an array.`);
    return;
  }
  value.forEach((item, index) => {
    const itemPath = `${path}/${index}`;
    if (!validateClosedObject(item, fields, `${context}.item`, itemPath, errors)) return;
    validateItem(item, itemPath, errors);
  });
}

function validatePreparedIndex(value) {
  const errors = [];
  if (!validateClosedObject(value, INDEX_FIELDS, "prepared_markdown_derived_index", "", errors)) {
    return errors;
  }
  if (value.index_type !== MARKDOWN_DERIVED_INDEX_TYPE) {
    addError(errors, "prepared_markdown_derived_index.index_type.mismatch", "/index_type", "index_type is not supported.");
  }
  if (value.format_version !== MARKDOWN_DERIVED_INDEX_FORMAT_VERSION) {
    addError(errors, "prepared_markdown_derived_index.format_version.mismatch", "/format_version", "format_version is not supported.");
  }
  for (const field of ["index_digest", "body_digest"]) {
    if (typeof value[field] !== "string" || !SHA256_DIGEST.test(value[field])) {
      addError(errors, `prepared_markdown_derived_index.${field}.invalid`, `/${field}`, `${field} must be a sha256 digest.`);
    }
  }
  validateNonBlankString(
    value.parser_version,
    "prepared_markdown_derived_index.parser_version",
    "/parser_version",
    "parser_version",
    errors,
  );
  if (typeof value.parser_version === "string"
    && value.parser_version !== MARKDOWN_DERIVED_INDEX_PARSER_VERSION) {
    addError(
      errors,
      "prepared_markdown_derived_index.parser_version.unsupported",
      "/parser_version",
      "parser_version is not supported.",
    );
  }
  validateObjectArray(value.headings, HEADING_FIELDS, "prepared_markdown_derived_index.headings", "/headings", errors, (item, path, itemErrors) => {
    positiveInteger(item.level, "prepared_markdown_derived_index.heading.level.invalid", `${path}/level`, "level", itemErrors);
    validateNonBlankString(item.text, "prepared_markdown_derived_index.heading.text", `${path}/text`, "text", itemErrors);
    positiveInteger(item.line, "prepared_markdown_derived_index.heading.line.invalid", `${path}/line`, "line", itemErrors);
  });
  validateObjectArray(value.sections, SECTION_FIELDS, "prepared_markdown_derived_index.sections", "/sections", errors, (item, path, itemErrors) => {
    positiveInteger(item.heading_index, "prepared_markdown_derived_index.section.heading_index.invalid", `${path}/heading_index`, "heading_index", itemErrors, { allowZero: true });
    validateNonBlankString(item.heading_text, "prepared_markdown_derived_index.section.heading_text", `${path}/heading_text`, "heading_text", itemErrors);
    for (const field of ["level", "start_line", "end_line"]) {
      positiveInteger(item[field], `prepared_markdown_derived_index.section.${field}.invalid`, `${path}/${field}`, field, itemErrors);
    }
    if (typeof item.value !== "string") {
      addError(itemErrors, "prepared_markdown_derived_index.section.value.type", `${path}/value`, "value must be a string.");
    }
  });
  validateObjectArray(value.checkboxes, CHECKBOX_FIELDS, "prepared_markdown_derived_index.checkboxes", "/checkboxes", errors, (item, path, itemErrors) => {
    positiveInteger(item.line, "prepared_markdown_derived_index.checkbox.line.invalid", `${path}/line`, "line", itemErrors);
    positiveInteger(item.column, "prepared_markdown_derived_index.checkbox.column.invalid", `${path}/column`, "column", itemErrors);
    if (typeof item.checked !== "boolean") {
      addError(itemErrors, "prepared_markdown_derived_index.checkbox.checked.type", `${path}/checked`, "checked must be a boolean.");
    }
    validateNonBlankString(item.text, "prepared_markdown_derived_index.checkbox.text", `${path}/text`, "text", itemErrors);
    optionalHeadingIndex(item.heading_index, "prepared_markdown_derived_index.checkbox.heading_index.invalid", `${path}/heading_index`, itemErrors);
  });
  validateObjectArray(value.references, REFERENCE_FIELDS, "prepared_markdown_derived_index.references", "/references", errors, (item, path, itemErrors) => {
    positiveInteger(item.line, "prepared_markdown_derived_index.reference.line.invalid", `${path}/line`, "line", itemErrors);
    positiveInteger(item.column, "prepared_markdown_derived_index.reference.column.invalid", `${path}/column`, "column", itemErrors);
    if (!["issue", "pull_request", "issue_or_pull_request"].includes(item.reference_type)) {
      addError(itemErrors, "prepared_markdown_derived_index.reference.reference_type.invalid", `${path}/reference_type`, "reference_type is not supported.");
    }
    positiveInteger(item.number, "prepared_markdown_derived_index.reference.number.invalid", `${path}/number`, "number", itemErrors);
    if (!["refs", "mention"].includes(item.relationship)) {
      addError(itemErrors, "prepared_markdown_derived_index.reference.relationship.invalid", `${path}/relationship`, "relationship is not supported.");
    }
    optionalHeadingIndex(item.heading_index, "prepared_markdown_derived_index.reference.heading_index.invalid", `${path}/heading_index`, itemErrors);
  });
  return errors;
}

export function prepareMarkdownDerivedIndex(input) {
  const errors = validateInput(input);
  if (errors.length > 0) return stopped("invalid_markdown_derived_index_input", errors);
  return deepFreeze({
    status: "prepared",
    reason: null,
    preparation: "prepared",
    markdown_index: buildIndex(input),
    errors: [],
  });
}

export function loadMarkdownDerivedIndex(input, { preparedIndex } = {}) {
  const expected = prepareMarkdownDerivedIndex(input);
  if (expected.status === "stopped") return expected;
  if (preparedIndex === undefined) return expected;

  const errors = validatePreparedIndex(preparedIndex);
  if (errors.length > 0) return stopped("invalid_prepared_markdown_derived_index", errors);

  const embeddedDigest = computeMarkdownDerivedIndexDigest(preparedIndex);
  if (preparedIndex.index_digest !== embeddedDigest) {
    addError(
      errors,
      "prepared_markdown_derived_index.embedded_digest.mismatch",
      "/index_digest",
      "Prepared Markdown index does not match its embedded digest.",
    );
  }
  if (preparedIndex.index_digest !== expected.markdown_index.index_digest) {
    addError(
      errors,
      "prepared_markdown_derived_index.source_digest.mismatch",
      "/index_digest",
      "Prepared Markdown index does not match the current body and parser input.",
    );
  }
  if (errors.length > 0) return stopped("invalid_prepared_markdown_derived_index", errors);

  return deepFreeze({
    status: "loaded",
    reason: null,
    preparation: "reused",
    markdown_index: expected.markdown_index,
    errors: [],
  });
}
