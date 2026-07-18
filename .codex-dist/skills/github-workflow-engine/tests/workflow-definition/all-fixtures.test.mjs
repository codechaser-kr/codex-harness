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

const sourceSkillDirectory = fileURLToPath(new URL("../../", import.meta.url));
const repositoryRoot = fileURLToPath(new URL("../../../../../", import.meta.url));
const installScript = join(repositoryRoot, "install.sh");

const jsonArtifacts = [
  "schemas/workflow-definition.schema.json",
  "registries/registered-executors.json",
  "tests/workflow-definition/fixtures/structural-valid.json",
  "tests/workflow-definition/fixtures/structural-invalid.json",
  "tests/workflow-definition/fixtures/semantic-valid.json",
  "tests/workflow-definition/fixtures/semantic-invalid.json",
  "tests/workflow-definition/fixtures/evaluation-cases.json",
];

const requiredArtifacts = [
  "references/workflow-definition-contract.md",
  "schemas/workflow-definition.schema.json",
  "registries/registered-executors.json",
  "scripts/workflow-definition/parser.mjs",
  "scripts/workflow-definition/expression.mjs",
  "scripts/workflow-definition/validator.mjs",
  "scripts/workflow-definition/evaluator.mjs",
  "scripts/workflow-definition/cli.mjs",
  "tests/workflow-definition/structural-validation.test.mjs",
  "tests/workflow-definition/semantic-validation.test.mjs",
  "tests/workflow-definition/evaluator.test.mjs",
  "tests/workflow-definition/all-fixtures.test.mjs",
  "tests/workflow-definition/fixtures/structural-valid.json",
  "tests/workflow-definition/fixtures/structural-invalid.json",
  "tests/workflow-definition/fixtures/semantic-valid.json",
  "tests/workflow-definition/fixtures/semantic-invalid.json",
  "tests/workflow-definition/fixtures/evaluation-cases.json",
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

function isNestedSpawnDenied(result) {
  return result.error?.code === "EPERM";
}

test("workflow definition foundation inventory and JSON artifacts are complete", async () => {
  const files = await listRegularFiles(sourceSkillDirectory);
  for (const relativePath of requiredArtifacts) {
    assert.equal(files.includes(relativePath), true, `Missing required artifact: ${relativePath}`);
  }
  await parseJsonArtifacts(sourceSkillDirectory);
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
  await parseJsonArtifacts(installedSkillDirectory);

  const evaluationCases = JSON.parse(await readFile(join(sourceSkillDirectory, "tests/workflow-definition/fixtures/evaluation-cases.json"), "utf8"));
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
    const sourceJson = assertJsonCliResult(sourceResult, command.exitCode);
    const installedJson = assertJsonCliResult(installedResult, command.exitCode);
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
});
