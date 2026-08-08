import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import {
  MARKDOWN_DERIVED_INDEX_FORMAT_VERSION,
  MARKDOWN_DERIVED_INDEX_PARSER_VERSION,
  MARKDOWN_DERIVED_INDEX_TYPE,
  computeMarkdownDerivedIndexDigest,
  loadMarkdownDerivedIndex,
  prepareMarkdownDerivedIndex,
} from "../../scripts/observation/markdown-derived-index.mjs";

const BODY = [
  "Prelude #7",
  "# Summary",
  "",
  "<!-- template-only guidance -->",
  "Actual text Refs #129.",
  "- [x] completed (#12)",
  "## Links",
  "",
  "Refs https://github.com/acme/project/issues/8",
  "See https://github.com/acme/project/pull/9 and `#999`.",
  "```md",
  "# Ignored",
  "- [ ] hidden",
  "Refs #500",
  "```",
  "# Summary",
  "- [ ] second item",
].join("\n");

function digest(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function input(body = BODY) {
  return {
    body,
    body_digest: digest(body),
    parser_version: MARKDOWN_DERIVED_INDEX_PARSER_VERSION,
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function hasError(result, code, path) {
  return result.errors.some((error) => error.code === code && error.path === path);
}

test("prepares a deterministic immutable Markdown derived index", () => {
  const first = prepareMarkdownDerivedIndex(input());
  const second = prepareMarkdownDerivedIndex({
    parser_version: MARKDOWN_DERIVED_INDEX_PARSER_VERSION,
    body_digest: digest(BODY),
    body: BODY,
  });

  assert.equal(first.status, "prepared");
  assert.equal(first.preparation, "prepared");
  assert.deepEqual(first, second);
  assert.equal(first.markdown_index.index_type, MARKDOWN_DERIVED_INDEX_TYPE);
  assert.equal(first.markdown_index.format_version, MARKDOWN_DERIVED_INDEX_FORMAT_VERSION);
  assert.match(first.markdown_index.index_digest, /^sha256:[0-9a-f]{64}$/);
  assert.equal(Object.isFrozen(first.markdown_index), true);
  assert.equal(Object.isFrozen(first.markdown_index.headings), true);
  assert.equal(Object.isFrozen(first.markdown_index.references[0]), true);
});

test("indexes headings sections checkboxes and references outside code spans", () => {
  const index = prepareMarkdownDerivedIndex(input()).markdown_index;

  assert.deepEqual(index.headings, [
    { level: 1, text: "Summary", line: 2 },
    { level: 2, text: "Links", line: 7 },
    { level: 1, text: "Summary", line: 16 },
  ]);
  assert.deepEqual(index.sections.map((section) => ({
    heading_index: section.heading_index,
    heading_text: section.heading_text,
    start_line: section.start_line,
    end_line: section.end_line,
  })), [
    { heading_index: 0, heading_text: "Summary", start_line: 3, end_line: 6 },
    { heading_index: 1, heading_text: "Links", start_line: 8, end_line: 15 },
    { heading_index: 2, heading_text: "Summary", start_line: 17, end_line: 17 },
  ]);
  assert.doesNotMatch(index.sections[0].value, /template-only/);
  assert.match(index.sections[0].value, /^Actual text Refs #129\./);
  assert.deepEqual(index.checkboxes, [
    { line: 6, column: 3, checked: true, text: "completed (#12)", heading_index: 0 },
    { line: 17, column: 3, checked: false, text: "second item", heading_index: 2 },
  ]);
  assert.deepEqual(index.references.map((reference) => ({
    line: reference.line,
    reference_type: reference.reference_type,
    number: reference.number,
    relationship: reference.relationship,
    heading_index: reference.heading_index,
  })), [
    { line: 1, reference_type: "issue_or_pull_request", number: 7, relationship: "mention", heading_index: null },
    { line: 5, reference_type: "issue_or_pull_request", number: 129, relationship: "refs", heading_index: 0 },
    { line: 6, reference_type: "issue_or_pull_request", number: 12, relationship: "mention", heading_index: 0 },
    { line: 9, reference_type: "issue", number: 8, relationship: "refs", heading_index: 1 },
    { line: 10, reference_type: "pull_request", number: 9, relationship: "mention", heading_index: 1 },
  ]);
  assert.equal(index.references.some((reference) => [500, 999].includes(reference.number)), false);
});

test("keeps duplicate headings as distinct source-ordered sections", () => {
  const body = "# Same\nfirst\n# Same\nsecond";
  const index = prepareMarkdownDerivedIndex(input(body)).markdown_index;

  assert.deepEqual(index.headings.map((heading) => heading.text), ["Same", "Same"]);
  assert.deepEqual(index.sections.map((section) => section.value), ["first", "second"]);
  assert.deepEqual(index.sections.map((section) => section.heading_index), [0, 1]);
});

test("keeps non-closing hash characters while trimming spaced ATX closing markers", () => {
  const body = "# C#\nvalue\n## Title ###\nnext";
  const index = prepareMarkdownDerivedIndex(input(body)).markdown_index;

  assert.deepEqual(index.headings.map((heading) => heading.text), ["C#", "Title"]);
});

test("ignores Markdown-looking tokens inside multiline HTML comments", () => {
  const body = [
    "# Visible",
    "<!--",
    "## Hidden",
    "- [x] fake",
    "Refs #9",
    "-->",
    "- [ ] real Refs #10",
  ].join("\n");
  const index = prepareMarkdownDerivedIndex(input(body)).markdown_index;

  assert.deepEqual(index.headings, [{ level: 1, text: "Visible", line: 1 }]);
  assert.deepEqual(index.checkboxes, [{
    line: 7,
    column: 3,
    checked: false,
    text: "real Refs #10",
    heading_index: 0,
  }]);
  assert.deepEqual(index.references.map((reference) => reference.number), [10]);
});

test("does not treat an HTML comment marker inside inline code as a comment", () => {
  const body = "# Visible\n`<!--` Refs #11\n- [ ] still visible";
  const index = prepareMarkdownDerivedIndex(input(body)).markdown_index;

  assert.deepEqual(index.references.map((reference) => reference.number), [11]);
  assert.equal(index.checkboxes.length, 1);
});

test("rejects malformed closed input and source identity mismatches", () => {
  const extra = { ...input(), cached: true };
  const extraResult = prepareMarkdownDerivedIndex(extra);
  assert.equal(extraResult.reason, "invalid_markdown_derived_index_input");
  assert.equal(hasError(extraResult, "markdown_derived_index_input.additional_property", "/cached"), true);

  const wrongBody = input();
  wrongBody.body += "\nchanged";
  const mismatch = prepareMarkdownDerivedIndex(wrongBody);
  assert.equal(hasError(mismatch, "markdown_derived_index_input.body_digest.mismatch", "/body_digest"), true);

  const unsupported = input();
  unsupported.parser_version = "2";
  const version = prepareMarkdownDerivedIndex(unsupported);
  assert.equal(hasError(version, "markdown_derived_index_input.parser_version.unsupported", "/parser_version"), true);
});

test("loads an exact JSON-round-tripped index as a frozen canonical value", () => {
  const prepared = clone(prepareMarkdownDerivedIndex(input()).markdown_index);
  const loaded = loadMarkdownDerivedIndex(input(), { preparedIndex: prepared });

  assert.equal(loaded.status, "loaded");
  assert.equal(loaded.preparation, "reused");
  assert.deepEqual(loaded.markdown_index, prepared);
  assert.equal(Object.isFrozen(loaded.markdown_index), true);
  assert.equal(Object.isFrozen(loaded.markdown_index.sections[0]), true);
});

test("fails closed for malformed prepared root and nested records", () => {
  const missing = clone(prepareMarkdownDerivedIndex(input()).markdown_index);
  delete missing.references;
  const missingResult = loadMarkdownDerivedIndex(input(), { preparedIndex: missing });
  assert.equal(missingResult.reason, "invalid_prepared_markdown_derived_index");
  assert.equal(hasError(missingResult, "prepared_markdown_derived_index.required", "/references"), true);

  const nested = clone(prepareMarkdownDerivedIndex(input()).markdown_index);
  nested.headings[0].extra = true;
  const nestedResult = loadMarkdownDerivedIndex(input(), { preparedIndex: nested });
  assert.equal(
    hasError(nestedResult, "prepared_markdown_derived_index.headings.item.additional_property", "/headings/0/extra"),
    true,
  );
});

test("rejects type format and digest errors with stable paths", () => {
  const type = clone(prepareMarkdownDerivedIndex(input()).markdown_index);
  type.index_type = "other";
  const typeResult = loadMarkdownDerivedIndex(input(), { preparedIndex: type });
  assert.equal(hasError(typeResult, "prepared_markdown_derived_index.index_type.mismatch", "/index_type"), true);

  const format = clone(prepareMarkdownDerivedIndex(input()).markdown_index);
  format.format_version = "2";
  const formatResult = loadMarkdownDerivedIndex(input(), { preparedIndex: format });
  assert.equal(hasError(formatResult, "prepared_markdown_derived_index.format_version.mismatch", "/format_version"), true);

  const invalidDigest = clone(prepareMarkdownDerivedIndex(input()).markdown_index);
  invalidDigest.index_digest = "sha256:not-a-digest";
  const digestResult = loadMarkdownDerivedIndex(input(), { preparedIndex: invalidDigest });
  assert.equal(hasError(digestResult, "prepared_markdown_derived_index.index_digest.invalid", "/index_digest"), true);

  const parserVersion = clone(prepareMarkdownDerivedIndex(input()).markdown_index);
  parserVersion.parser_version = "2";
  const parserVersionResult = loadMarkdownDerivedIndex(input(), { preparedIndex: parserVersion });
  assert.equal(
    hasError(parserVersionResult, "prepared_markdown_derived_index.parser_version.unsupported", "/parser_version"),
    true,
  );
});

test("rejects ordinary self-consistent and stale-source tampering", () => {
  const ordinary = clone(prepareMarkdownDerivedIndex(input()).markdown_index);
  ordinary.sections[0].value = "tampered";
  const ordinaryResult = loadMarkdownDerivedIndex(input(), { preparedIndex: ordinary });
  assert.equal(
    hasError(ordinaryResult, "prepared_markdown_derived_index.embedded_digest.mismatch", "/index_digest"),
    true,
  );

  const selfConsistent = clone(ordinary);
  selfConsistent.index_digest = computeMarkdownDerivedIndexDigest(selfConsistent);
  const selfConsistentResult = loadMarkdownDerivedIndex(input(), { preparedIndex: selfConsistent });
  assert.equal(
    hasError(selfConsistentResult, "prepared_markdown_derived_index.source_digest.mismatch", "/index_digest"),
    true,
  );

  const changedBody = `${BODY}\nchanged`;
  const staleResult = loadMarkdownDerivedIndex(input(changedBody), {
    preparedIndex: clone(prepareMarkdownDerivedIndex(input()).markdown_index),
  });
  assert.equal(hasError(staleResult, "prepared_markdown_derived_index.source_digest.mismatch", "/index_digest"), true);
});
