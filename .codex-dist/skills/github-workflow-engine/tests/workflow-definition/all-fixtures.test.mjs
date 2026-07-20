import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import "./structural-validation.test.mjs";
import "./semantic-validation.test.mjs";
import "./evaluator.test.mjs";
import "./feature-proposal.test.mjs";
import "./normalized-fact-adapter.test.mjs";
import "./policy-review.test.mjs";
import "./feature-change.test.mjs";
import "./feature-fix.test.mjs";
import "./implementation.test.mjs";
import "../validation-mode/validation-mode-contract.test.mjs";

const sourceSkillDirectory = fileURLToPath(new URL("../../", import.meta.url));
const repositoryRoot = fileURLToPath(new URL("../../../../../", import.meta.url));
const installScript = join(repositoryRoot, "install.sh");
const sourceTargetEditor = join(repositoryRoot, ".codex-dist/skills/target-harness-code-editor/SKILL.md");

const jsonArtifacts = [
  "definitions/feature-proposal.json",
  "definitions/policy-review.json",
  "definitions/feature-change.json",
  "definitions/feature-fix.json",
  "definitions/implementation.json",
  "tests/workflow-definition/fixtures/structural-valid.json",
  "tests/workflow-definition/fixtures/structural-invalid.json",
  "tests/workflow-definition/fixtures/semantic-valid.json",
  "tests/workflow-definition/fixtures/semantic-invalid.json",
  "tests/workflow-definition/fixtures/evaluation-cases.json",
  "tests/workflow-definition/fixtures/feature-proposal-states.json",
  "tests/workflow-definition/fixtures/policy-review-states.json",
  "tests/workflow-definition/fixtures/feature-change-states.json",
  "tests/workflow-definition/fixtures/feature-fix-states.json",
  "tests/workflow-definition/fixtures/implementation-states.json",
];

const requiredArtifacts = [
  "references/workflow-definition-contract.md",
  "references/validation-mode-contract.md",
  "references/normalized-fact-adapter-contract.md",
  "definitions/feature-proposal.json",
  "definitions/policy-review.json",
  "definitions/feature-change.json",
  "definitions/feature-fix.json",
  "definitions/implementation.json",
  "scripts/workflow-definition/parser.mjs",
  "scripts/workflow-definition/expression.mjs",
  "scripts/workflow-definition/validator.mjs",
  "scripts/workflow-definition/evaluator.mjs",
  "scripts/workflow-definition/normalized-fact-adapter.mjs",
  "scripts/workflow-definition/workflow-state-adapter.mjs",
  "scripts/workflow-definition/policy-review-state-adapter.mjs",
  "scripts/workflow-definition/feature-change-state-adapter.mjs",
  "scripts/workflow-definition/feature-fix-state-adapter.mjs",
  "scripts/workflow-definition/implementation-state-adapter.mjs",
  "scripts/workflow-definition/cli.mjs",
  "tests/workflow-definition/structural-validation.test.mjs",
  "tests/workflow-definition/semantic-validation.test.mjs",
  "tests/workflow-definition/evaluator.test.mjs",
  "tests/workflow-definition/feature-proposal.test.mjs",
  "tests/workflow-definition/normalized-fact-adapter.test.mjs",
  "tests/workflow-definition/policy-review.test.mjs",
  "tests/workflow-definition/feature-change.test.mjs",
  "tests/workflow-definition/feature-fix.test.mjs",
  "tests/workflow-definition/implementation.test.mjs",
  "tests/workflow-definition/all-fixtures.test.mjs",
  "tests/workflow-definition/fixtures/structural-valid.json",
  "tests/workflow-definition/fixtures/structural-invalid.json",
  "tests/workflow-definition/fixtures/semantic-valid.json",
  "tests/workflow-definition/fixtures/semantic-invalid.json",
  "tests/workflow-definition/fixtures/evaluation-cases.json",
  "tests/workflow-definition/fixtures/feature-proposal-states.json",
  "tests/workflow-definition/fixtures/policy-review-states.json",
  "tests/workflow-definition/fixtures/feature-change-states.json",
  "tests/workflow-definition/fixtures/feature-fix-states.json",
  "tests/workflow-definition/fixtures/implementation-states.json",
  "tests/validation-mode/validation-mode-contract.test.mjs",
];

async function parseJsonArtifacts(root) {
  for (const relativePath of jsonArtifacts) {
    JSON.parse(await readFile(join(root, relativePath), "utf8"));
  }
}

async function listRegularFiles(root, relativePath = "") {
  const directory = join(root, relativePath);
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const entryPath = join(relativePath, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listRegularFiles(root, entryPath));
    } else if (entry.isFile()) {
      files.push(entryPath);
    } else {
      assert.fail(`Unsupported installed artifact type: ${entryPath}`);
    }
  }
  return files;
}

async function assertTreesMatch(sourceRoot, installedRoot) {
  const sourceFiles = await listRegularFiles(sourceRoot);
  const installedFiles = await listRegularFiles(installedRoot);
  assert.deepEqual(installedFiles, sourceFiles);
  for (const relativePath of sourceFiles) {
    const sourceContent = await readFile(join(sourceRoot, relativePath));
    const installedContent = await readFile(join(installedRoot, relativePath));
    assert.deepEqual(installedContent, sourceContent, relativePath);
  }
}

function runProcess(command, argumentsList, options = {}) {
  return spawnSync(command, argumentsList, {
    encoding: "utf8",
    timeout: 10_000,
    ...options,
  });
}

function assertProcessSucceeded(result, description) {
  assert.equal(result.error, undefined, `${description}: ${result.error?.message ?? "unknown process error"}`);
  assert.equal(result.status, 0, `${description}: ${result.stderr}`);
}

function assertJsonCliResult(result, expectedExitCode) {
  assert.equal(result.error, undefined, result.error?.message);
  assert.equal(result.status, expectedExitCode, result.stderr);
  assert.equal(result.stderr, "");
  return JSON.parse(result.stdout);
}

function assertMatchingCliResults(sourceResult, installedResult, expectedExitCode) {
  const sourceJson = assertJsonCliResult(sourceResult, expectedExitCode);
  const installedJson = assertJsonCliResult(installedResult, expectedExitCode);
  assert.deepEqual(
    {
      status: installedResult.status,
      stdout: installedResult.stdout,
      stderr: installedResult.stderr,
    },
    {
      status: sourceResult.status,
      stdout: sourceResult.stdout,
      stderr: sourceResult.stderr,
    },
  );
  assert.deepEqual(installedJson, sourceJson);
}

function isNestedSpawnDenied(result) {
  return result.error?.code === "EPERM";
}

test("workflow definition foundation inventory and JSON artifacts are complete", async () => {
  const files = await listRegularFiles(sourceSkillDirectory);
  for (const relativePath of requiredArtifacts) {
    assert.equal(files.includes(relativePath), true, `Missing required artifact: ${relativePath}`);
  }
  assert.equal(files.includes("schemas/workflow-definition.schema.json"), false);
  await parseJsonArtifacts(sourceSkillDirectory);
});

test("install.sh has valid shell syntax", (t) => {
  const result = runProcess("sh", ["-n", installScript]);
  if (isNestedSpawnDenied(result)) {
    t.skip("The current execution sandbox does not permit nested child processes.");
    return;
  }
  assertProcessSucceeded(result, "sh -n install.sh");
});

test("installer preserves the github-workflow-engine distribution", async (t) => {
  const temporaryRoot = await mkdtemp(`${tmpdir()}/workflow-definition-install-`);
  t.after(() => rm(temporaryRoot, { recursive: true, force: true }));

  const destinationRoot = join(temporaryRoot, "skills");
  const harnessDestination = join(temporaryRoot, "harness");
  const home = join(temporaryRoot, "home");
  const environment = {
    ...process.env,
    HOME: home,
    CODEX_HOME: join(temporaryRoot, "codex-home"),
    CODEX_HARNESS_DEST_ROOT: destinationRoot,
    CODEX_HARNESS_DEST: harnessDestination,
  };
  const installResult = runProcess("sh", [installScript], { cwd: repositoryRoot, env: environment });
  if (isNestedSpawnDenied(installResult)) {
    t.skip("The current execution sandbox does not permit nested child processes.");
    return;
  }
  assertProcessSucceeded(installResult, "install.sh");

  const installedSkillDirectory = join(destinationRoot, "github-workflow-engine");
  await assertTreesMatch(sourceSkillDirectory, installedSkillDirectory);
  assert.equal((await listRegularFiles(installedSkillDirectory)).includes("schemas/workflow-definition.schema.json"), false);
  await parseJsonArtifacts(installedSkillDirectory);
  assert.deepEqual(
    await readFile(join(destinationRoot, "target-harness-code-editor/SKILL.md")),
    await readFile(sourceTargetEditor),
  );

  const evaluationCases = await readFile(join(sourceSkillDirectory, "tests/workflow-definition/fixtures/evaluation-cases.json"), "utf8").then(JSON.parse);
  const definitionPath = join(temporaryRoot, "definition.json");
  const statePath = join(temporaryRoot, "state.json");
  const cycleDefinitionPath = join(temporaryRoot, "cycle-definition.json");
  const cycleStatePath = join(temporaryRoot, "cycle-state.json");
  await writeFile(definitionPath, JSON.stringify(evaluationCases.definitions.terminal_completed));
  await writeFile(statePath, JSON.stringify(evaluationCases.states.done));
  await writeFile(cycleDefinitionPath, JSON.stringify(evaluationCases.definitions.fixed_state_cycle));
  await writeFile(cycleStatePath, JSON.stringify(evaluationCases.states.cycle));

  const sourceCli = join(sourceSkillDirectory, "scripts/workflow-definition/cli.mjs");
  const installedCli = join(installedSkillDirectory, "scripts/workflow-definition/cli.mjs");
  const commands = [
    { argumentsList: ["validate", "--definition", definitionPath], exitCode: 0 },
    { argumentsList: ["evaluate", "--definition", definitionPath, "--state", statePath], exitCode: 0 },
    { argumentsList: ["evaluate", "--definition", cycleDefinitionPath, "--state", cycleStatePath], exitCode: 1 },
  ];
  for (const command of commands) {
    const sourceResult = runProcess(process.execPath, [sourceCli, ...command.argumentsList]);
    if (isNestedSpawnDenied(sourceResult)) {
      t.skip("The current execution sandbox does not permit nested Node child processes.");
      return;
    }
    const installedResult = runProcess(process.execPath, [installedCli, ...command.argumentsList]);
    assertMatchingCliResults(sourceResult, installedResult, command.exitCode);
  }
});
