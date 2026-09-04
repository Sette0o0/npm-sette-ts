import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const cliPath = path.join(projectRoot, "bin", "create-sette-ts.js");

test("cria um projeto a partir do template", async () => {
  const temporaryDir = await mkdtemp(path.join(tmpdir(), "create-sette-ts-"));

  try {
    const result = spawnSync(
      process.execPath,
      [cliPath, "meu-projeto", "--no-install"],
      {
        cwd: temporaryDir,
        encoding: "utf8",
      },
    );

    assert.equal(result.status, 0, result.stderr);
    const generatedDir = path.join(temporaryDir, "meu-projeto");
    assert.equal(existsSync(path.join(generatedDir, ".gitignore")), true);
    assert.equal(existsSync(path.join(generatedDir, "src", "index.ts")), true);
    assert.equal(
      JSON.parse(readFileSync(path.join(generatedDir, "package.json"), "utf8"))
        .name,
      "meu-projeto",
    );
  } finally {
    await rm(temporaryDir, { recursive: true, force: true });
  }
});

test("recusa sobrescrever uma pasta que contém arquivos", () => {
  const result = spawnSync(process.execPath, [cliPath, ".", "--no-install"], {
    cwd: projectRoot,
    encoding: "utf8",
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /não está vazia/);
});
