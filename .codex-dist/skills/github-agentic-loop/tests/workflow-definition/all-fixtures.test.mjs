import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { access, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { compileWorkflowDefinition } from "../../scripts/workflow-definition/compiler.mjs";

import "./structural-validation.test.mjs";
import "./semantic-validation.test.mjs";
import "./compiled-definition.test.mjs";
import "./compiled-runtime.test.mjs";
import "./evaluator.test.mjs";
import "./feature-proposal.test.mjs";
import "./normalized-fact-adapter.test.mjs";
import "./policy-review.test.mjs";
import "./feature-change.test.mjs";
import "./feature-fix.test.mjs";
import "./implementation.test.mjs";
import "../validation-mode/validation-mode-contract.test.mjs";
import "../validation-mode/agent-lifecycle-contract.test.mjs";
import "../skill-quality/skill-structure-contract.test.mjs";
import "../skill-quality/reference-boundary-contract.test.mjs";
import "../artifact-contract/compiled-manifest.test.mjs";
import "../artifact-contract/validator.test.mjs";
import "../artifact-contract/renderer.test.mjs";
import "../artifact-contract/drift.test.mjs";
import "../artifact-contract/artifact-runtime.test.mjs";
import "../artifact-contract/producer-handoff.test.mjs";
import "../artifact-contract/artifact-consumer.test.mjs";
import "../pull-request/pr-input.test.mjs";
import "../pull-request/live-preflight.test.mjs";
import "../observation/snapshot.test.mjs";

const sourceSkillDirectory = fileURLToPath(new URL("../../", import.meta.url));
const repositoryRoot = fileURLToPath(new URL("../../../../../", import.meta.url));
const installScript = join(repositoryRoot, "install.sh");
const uninstallScript = join(repositoryRoot, "uninstall.sh");
const sourceWorkflowEditor = join(repositoryRoot, ".codex-dist/skills/workflow-code-editor/SKILL.md");
const removedRulesRelativePath = ["references/workflow-engine", "rules.md"].join("-");
const removedRulesFilenamePattern = new RegExp(["workflow-engine", "rules\\.md"].join("-"));

const jsonArtifacts = [
  "artifact-manifests/branch-proposal.json",
  "artifact-manifests/commit-plan.json",
  "artifact-manifests/feature-plan.json",
  "artifact-manifests/feature-proposal-triage.json",
  "artifact-manifests/fix-analysis.json",
  "artifact-manifests/fix-plan.json",
  "artifact-manifests/issue-creation.json",
  "artifact-manifests/policy-plan.json",
  "artifact-manifests/policy-review-next-triage.json",
  "artifact-manifests/pr-creation.json",
  "artifact-manifests/pr-proposal.json",
  "artifact-manifests/review-comment.json",
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
  "tests/artifact-contract/fixtures/manifest-validation-cases.json",
  "tests/artifact-contract/fixtures/artifact-validation-cases.json",
];

const requiredArtifacts = [
  "references/workflow-definition-contract.md",
  "references/validation-mode-contract.md",
  "references/agent-lifecycle-contract.md",
  "references/normalized-fact-adapter-contract.md",
  "references/artifact-output-contract.md",
  "references/artifact-manifest-contract.md",
  "references/artifact-handoff-contract.md",
  "references/artifact-consumer-contract.md",
  "references/pull-request-input-contract.md",
  "references/observation-snapshot-contract.md",
  "references/github-templates.md",
  "references/target-runtime-bootstrap-contract.md",
  "references/workflow-engine-template-compatibility-contract.md",
  "references/state-observation-contract.md",
  "references/review-runtime-contract.md",
  "references/claude-review-executor-contract.md",
  "references/structured-execution-contract.md",
  "references/user-decision-contract.md",
  "references/command-execution-path-contract.md",
  "references/file-change-execution-contract.md",
  "references/target-harness-execution-contract.md",
  "definitions/feature-proposal.json",
  "definitions/policy-review.json",
  "definitions/feature-change.json",
  "definitions/feature-fix.json",
  "definitions/implementation.json",
  "scripts/workflow-definition/parser.mjs",
  "scripts/workflow-definition/expression.mjs",
  "scripts/workflow-definition/validator.mjs",
  "scripts/workflow-definition/compiler.mjs",
  "scripts/workflow-definition/compiled-definition-loader.mjs",
  "scripts/workflow-definition/runtime-definition.mjs",
  "scripts/workflow-definition/evaluator.mjs",
  "scripts/workflow-definition/normalized-fact-adapter.mjs",
  "scripts/workflow-definition/workflow-state-adapter.mjs",
  "scripts/workflow-definition/feature-proposal-state-adapter.mjs",
  "scripts/workflow-definition/policy-review-state-adapter.mjs",
  "scripts/workflow-definition/feature-change-state-adapter.mjs",
  "scripts/workflow-definition/feature-fix-state-adapter.mjs",
  "scripts/workflow-definition/implementation-state-adapter.mjs",
  "scripts/workflow-definition/cli.mjs",
  "scripts/artifact-contract/manifest-validator.mjs",
  "scripts/artifact-contract/manifest-compiler.mjs",
  "scripts/artifact-contract/compiled-manifest-loader.mjs",
  "scripts/artifact-contract/validator.mjs",
  "scripts/artifact-contract/renderer.mjs",
  "scripts/artifact-contract/artifact-registry.mjs",
  "scripts/artifact-contract/artifact-runtime.mjs",
  "scripts/artifact-contract/artifact-consumer.mjs",
  "scripts/pull-request/pr-input.mjs",
  "scripts/pull-request/live-preflight.mjs",
  "scripts/observation/snapshot.mjs",
  "tests/workflow-definition/structural-validation.test.mjs",
  "tests/workflow-definition/semantic-validation.test.mjs",
  "tests/workflow-definition/compiled-definition.test.mjs",
  "tests/workflow-definition/compiled-runtime.test.mjs",
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
  "tests/validation-mode/agent-lifecycle-contract.test.mjs",
  "tests/skill-quality/skill-structure-contract.test.mjs",
  "tests/skill-quality/reference-boundary-contract.test.mjs",
  "artifact-manifests/branch-proposal.json",
  "artifact-manifests/commit-plan.json",
  "artifact-manifests/feature-plan.json",
  "artifact-manifests/feature-proposal-triage.json",
  "artifact-manifests/fix-analysis.json",
  "artifact-manifests/fix-plan.json",
  "artifact-manifests/issue-creation.json",
  "artifact-manifests/policy-plan.json",
  "artifact-manifests/policy-review-next-triage.json",
  "artifact-manifests/pr-creation.json",
  "artifact-manifests/pr-proposal.json",
  "artifact-manifests/review-comment.json",
  "tests/artifact-contract/compiled-manifest.test.mjs",
  "tests/artifact-contract/validator.test.mjs",
  "tests/artifact-contract/renderer.test.mjs",
  "tests/artifact-contract/drift.test.mjs",
  "tests/artifact-contract/artifact-runtime.test.mjs",
  "tests/artifact-contract/producer-handoff.test.mjs",
  "tests/artifact-contract/artifact-consumer.test.mjs",
  "tests/pull-request/pr-input.test.mjs",
  "tests/pull-request/live-preflight.test.mjs",
  "tests/observation/snapshot.test.mjs",
  "tests/artifact-contract/fixtures/manifest-validation-cases.json",
  "tests/artifact-contract/fixtures/artifact-validation-cases.json",
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
  assert.equal(files.includes(removedRulesRelativePath), false);
  await parseJsonArtifacts(sourceSkillDirectory);
});

test("runtime contracts do not duplicate natural-language transition tables", async () => {
  const forbiddenTransitionContractText = [
    "작업 전이표",
    "현재 작업 산출 규칙",
    "재사용 상태 규칙",
  ];
  for (const relativePath of [
    "references/artifact-output-contract.md",
    "references/state-observation-contract.md",
    "references/review-runtime-contract.md",
    "references/structured-execution-contract.md",
    "references/user-decision-contract.md",
    "references/command-execution-path-contract.md",
    "references/file-change-execution-contract.md",
    "references/target-harness-execution-contract.md",
    "references/target-runtime-bootstrap-contract.md",
    "references/workflow-engine-template-compatibility-contract.md",
    "references/claude-review-executor-contract.md",
  ]) {
    const source = await readFile(join(sourceSkillDirectory, relativePath), "utf8");
    assert.doesNotMatch(source, /^## 작업 전이 규칙$/m, relativePath);
    for (const forbiddenText of forbiddenTransitionContractText) {
      assert.equal(
        source.includes(forbiddenText),
        false,
        `${relativePath} contains legacy transition text: ${forbiddenText}`,
      );
    }
  }
});

test("removed workflow rules filename is not referenced by distribution or docs", async () => {
  for (const root of [join(repositoryRoot, ".codex-dist"), join(repositoryRoot, "docs")]) {
    for (const relativePath of await listRegularFiles(root)) {
      const source = await readFile(join(root, relativePath), "utf8");
      assert.doesNotMatch(source, removedRulesFilenamePattern, join(root, relativePath));
    }
  }
});

test("installer owns the current workflow engine skill identifier in one variable", async () => {
  const source = await readFile(installScript, "utf8");
  const currentSkillIdentifier = "github-agentic-loop";

  assert.equal(source.split(currentSkillIdentifier).length - 1, 1);
  assert.match(source, /^WORKFLOW_ENGINE_SKILL="github-agentic-loop"$/m);
  assert.match(source, /^WORKFLOW_ENGINE_SKILLS="\$WORKFLOW_ENGINE_SKILL workflow-code-editor/m);
  assert.match(source, /^      SOURCE_MARKER="\$WORKFLOW_ENGINE_SKILL"$/m);
  assert.match(source, /^  if \[ "\$skill" = "\$WORKFLOW_ENGINE_SKILL" \]; then$/m);
});

test("install and uninstall scripts have valid shell syntax", (t) => {
  for (const script of [installScript, uninstallScript]) {
    const result = runProcess("sh", ["-n", script]);
    if (isNestedSpawnDenied(result)) {
      t.skip("The current execution sandbox does not permit nested child processes.");
      return;
    }
    assertProcessSucceeded(result, `sh -n ${script}`);
  }
});

test("installer uses the user skill root and keeps legacy CODEX_HOME skills untouched", async (t) => {
  const temporaryRoot = await mkdtemp(`${tmpdir()}/default-skill-install-`);
  t.after(() => rm(temporaryRoot, { recursive: true, force: true }));

  const home = join(temporaryRoot, "home");
  const codexHome = join(temporaryRoot, "codex-home");
  const legacySkill = join(codexHome, "skills/harness/SKILL.md");
  const destinationRoot = join(home, ".agents/skills");
  const backupRoot = join(home, ".local/state/codex-harness/backups");
  await mkdir(join(codexHome, "skills/harness"), { recursive: true });
  await writeFile(legacySkill, "legacy sentinel\n");

  const {
    CODEX_HARNESS_BACKUP_ROOT: _backupRoot,
    CODEX_HARNESS_DEST: _harnessDestination,
    CODEX_HARNESS_DEST_ROOT: _destinationRoot,
    XDG_STATE_HOME: _xdgStateHome,
    ...baseEnvironment
  } = process.env;
  const environment = {
    ...baseEnvironment,
    HOME: home,
    CODEX_HOME: codexHome,
  };

  const firstInstall = runProcess("sh", [installScript, "harness"], { cwd: repositoryRoot, env: environment });
  if (isNestedSpawnDenied(firstInstall)) {
    t.skip("The current execution sandbox does not permit nested child processes.");
    return;
  }
  assertProcessSucceeded(firstInstall, "first default install.sh harness");
  await access(join(destinationRoot, "harness/SKILL.md"));
  assert.equal(await readFile(legacySkill, "utf8"), "legacy sentinel\n");

  const secondInstall = runProcess("sh", [installScript, "harness"], { cwd: repositoryRoot, env: environment });
  assertProcessSucceeded(secondInstall, "second default install.sh harness");
  assert.deepEqual(await readdir(destinationRoot), ["harness"]);
  assert.equal((await readdir(backupRoot)).some((name) => /^harness\.backup\./.test(name)), true);

  const uninstall = runProcess("sh", [uninstallScript, "harness"], { cwd: repositoryRoot, env: environment });
  assertProcessSucceeded(uninstall, "default uninstall.sh harness");
  await assert.rejects(access(join(destinationRoot, "harness/SKILL.md")));
  assert.equal(await readFile(legacySkill, "utf8"), "legacy sentinel\n");
  assert.equal((await readdir(backupRoot)).some((name) => /^harness\.removed\./.test(name)), true);
});

test("installer and uninstaller keep harness and workflow-engine targets independent", async (t) => {
  const temporaryRoot = await mkdtemp(`${tmpdir()}/independent-skill-install-`);
  t.after(() => rm(temporaryRoot, { recursive: true, force: true }));

  const destinationRoot = join(temporaryRoot, "skills");
  const harnessDestination = join(temporaryRoot, "harness");
  const backupRoot = join(temporaryRoot, "backups");
  const environment = {
    ...process.env,
    HOME: join(temporaryRoot, "home"),
    CODEX_HOME: join(temporaryRoot, "codex-home"),
    CODEX_HARNESS_DEST_ROOT: destinationRoot,
    CODEX_HARNESS_DEST: harnessDestination,
    CODEX_HARNESS_BACKUP_ROOT: backupRoot,
  };

  const harnessInstall = runProcess("sh", [installScript, "harness"], { cwd: repositoryRoot, env: environment });
  if (isNestedSpawnDenied(harnessInstall)) {
    t.skip("The current execution sandbox does not permit nested child processes.");
    return;
  }
  assertProcessSucceeded(harnessInstall, "install.sh harness");
  await access(join(harnessDestination, "SKILL.md"));
  await assert.rejects(access(join(destinationRoot, "github-agentic-loop/SKILL.md")));
  await assert.rejects(access(join(destinationRoot, "github-workflow-engine/SKILL.md")));

  const workflowInstall = runProcess("sh", [installScript, "workflow-engine"], { cwd: repositoryRoot, env: environment });
  assertProcessSucceeded(workflowInstall, "install.sh workflow-engine");
  await access(join(harnessDestination, "SKILL.md"));
  await access(join(destinationRoot, "github-agentic-loop/SKILL.md"));
  await assert.rejects(access(join(destinationRoot, "github-workflow-engine/SKILL.md")));
  await access(join(destinationRoot, "workflow-code-editor/SKILL.md"));

  const harnessUninstall = runProcess("sh", [uninstallScript, "harness"], { cwd: repositoryRoot, env: environment });
  assertProcessSucceeded(harnessUninstall, "uninstall.sh harness");
  await assert.rejects(access(join(harnessDestination, "SKILL.md")));
  await access(join(destinationRoot, "github-agentic-loop/SKILL.md"));

  const workflowUninstall = runProcess("sh", [uninstallScript, "workflow-engine"], { cwd: repositoryRoot, env: environment });
  assertProcessSucceeded(workflowUninstall, "uninstall.sh workflow-engine");
  await assert.rejects(access(join(destinationRoot, "github-agentic-loop/SKILL.md")));
  await assert.rejects(access(join(destinationRoot, "github-workflow-engine/SKILL.md")));
  await assert.rejects(access(join(destinationRoot, "workflow-code-editor/SKILL.md")));
  const backupNames = await readdir(backupRoot);
  assert.equal(backupNames.some((name) => /^harness\.removed\./.test(name)), true);
  assert.equal(backupNames.some((name) => /^github-agentic-loop\.removed\./.test(name)), true);
});

test("installer migrates a legacy workflow engine installation and uninstaller handles both names", async (t) => {
  const temporaryRoot = await mkdtemp(`${tmpdir()}/workflow-engine-rename-install-`);
  t.after(() => rm(temporaryRoot, { recursive: true, force: true }));

  const destinationRoot = join(temporaryRoot, "skills");
  const backupRoot = join(temporaryRoot, "backups");
  const legacySkillDirectory = join(destinationRoot, "github-workflow-engine");
  const currentSkillDirectory = join(destinationRoot, "github-agentic-loop");
  const environment = {
    ...process.env,
    HOME: join(temporaryRoot, "home"),
    CODEX_HOME: join(temporaryRoot, "codex-home"),
    CODEX_HARNESS_DEST_ROOT: destinationRoot,
    CODEX_HARNESS_BACKUP_ROOT: backupRoot,
  };

  await mkdir(legacySkillDirectory, { recursive: true });
  await writeFile(join(legacySkillDirectory, "SKILL.md"), "legacy sentinel\n");

  const installResult = runProcess("sh", [installScript, "workflow-engine"], { cwd: repositoryRoot, env: environment });
  if (isNestedSpawnDenied(installResult)) {
    t.skip("The current execution sandbox does not permit nested child processes.");
    return;
  }
  assertProcessSucceeded(installResult, "install.sh workflow-engine with legacy installation");
  await access(join(currentSkillDirectory, "SKILL.md"));
  await assert.rejects(access(legacySkillDirectory));

  let backupNames = await readdir(backupRoot);
  const migratedLegacyBackup = backupNames.find((name) => /^github-workflow-engine\.backup\./.test(name));
  assert.ok(migratedLegacyBackup);
  assert.equal(
    await readFile(join(backupRoot, migratedLegacyBackup, "SKILL.md"), "utf8"),
    "legacy sentinel\n",
  );

  await mkdir(legacySkillDirectory, { recursive: true });
  await writeFile(join(legacySkillDirectory, "SKILL.md"), "stale legacy sentinel\n");
  const uninstallResult = runProcess("sh", [uninstallScript, "workflow-engine"], { cwd: repositoryRoot, env: environment });
  assertProcessSucceeded(uninstallResult, "uninstall.sh workflow-engine with both installation names");
  await assert.rejects(access(currentSkillDirectory));
  await assert.rejects(access(legacySkillDirectory));

  backupNames = await readdir(backupRoot);
  assert.equal(backupNames.some((name) => /^github-agentic-loop\.removed\./.test(name)), true);
  assert.equal(backupNames.some((name) => /^github-workflow-engine\.removed\./.test(name)), true);
});

test("installer preserves the github-agentic-loop distribution", async (t) => {
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

  const installedSkillDirectory = join(destinationRoot, "github-agentic-loop");
  await assertTreesMatch(sourceSkillDirectory, installedSkillDirectory);
  assert.equal((await listRegularFiles(installedSkillDirectory)).includes("schemas/workflow-definition.schema.json"), false);
  assert.equal((await listRegularFiles(installedSkillDirectory)).includes(removedRulesRelativePath), false);
  await parseJsonArtifacts(installedSkillDirectory);
  assert.deepEqual(
    await readFile(join(destinationRoot, "workflow-code-editor/SKILL.md")),
    await readFile(sourceWorkflowEditor),
  );
  assert.equal(
    (await listRegularFiles(installedSkillDirectory)).includes(
      "references/workflow-engine-template-compatibility-contract.md",
    ),
    true,
  );

  const evaluationCases = await readFile(join(sourceSkillDirectory, "tests/workflow-definition/fixtures/evaluation-cases.json"), "utf8").then(JSON.parse);
  const definitionPath = join(temporaryRoot, "definition.json");
  const statePath = join(temporaryRoot, "state.json");
  const cycleDefinitionPath = join(temporaryRoot, "cycle-definition.json");
  const cycleStatePath = join(temporaryRoot, "cycle-state.json");
  const compiledDefinitionPath = join(temporaryRoot, "compiled-definition.json");
  await writeFile(definitionPath, JSON.stringify(evaluationCases.definitions.terminal_completed));
  await writeFile(statePath, JSON.stringify(evaluationCases.states.done));
  await writeFile(cycleDefinitionPath, JSON.stringify(evaluationCases.definitions.fixed_state_cycle));
  await writeFile(cycleStatePath, JSON.stringify(evaluationCases.states.cycle));
  await writeFile(
    compiledDefinitionPath,
    JSON.stringify(compileWorkflowDefinition(evaluationCases.definitions.terminal_completed).compiled_definition),
  );

  const sourceCli = join(sourceSkillDirectory, "scripts/workflow-definition/cli.mjs");
  const installedCli = join(installedSkillDirectory, "scripts/workflow-definition/cli.mjs");
  const commands = [
    { argumentsList: ["validate", "--definition", definitionPath], exitCode: 0 },
    { argumentsList: ["compile", "--definition", definitionPath], exitCode: 0 },
    { argumentsList: ["evaluate", "--definition", definitionPath, "--state", statePath], exitCode: 0 },
    {
      argumentsList: [
        "evaluate",
        "--definition",
        definitionPath,
        "--compiled-definition",
        compiledDefinitionPath,
        "--state",
        statePath,
      ],
      exitCode: 0,
    },
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
