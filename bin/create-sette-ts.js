#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { constants } from "node:fs";
import {
  access,
  cp,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";

const templateDir = fileURLToPath(
  new URL("../template", import.meta.url),
);

const colors = {
  cyan: "\u001b[36m",
  green: "\u001b[32m",
  red: "\u001b[31m",
  yellow: "\u001b[33m",
  reset: "\u001b[0m",
};

function paint(color, message) {
  return process.stdout.isTTY
    ? `${colors[color]}${message}${colors.reset}`
    : message;
}

function printHelp() {
  console.log(`
Uso:
  create-sette-ts <nome-do-projeto> [opções]

Opções:
  --no-install   Não instala as dependências
  --git          Inicializa um repositório Git
  -h, --help     Exibe esta ajuda

Exemplos:
  npx create-sette-ts meu-projeto
  npm create sette-ts@latest meu-projeto -- --git
`);
}

function parseArgs(args) {
  const options = {
    install: true,
    git: false,
    help: false,
    projectDir: undefined,
  };

  for (const arg of args) {
    if (arg === "-h" || arg === "--help") {
      options.help = true;
    } else if (arg === "--no-install") {
      options.install = false;
    } else if (arg === "--git") {
      options.git = true;
    } else if (arg.startsWith("-")) {
      throw new Error(`Opção desconhecida: ${arg}`);
    } else if (!options.projectDir) {
      options.projectDir = arg;
    } else {
      throw new Error(`Argumento inesperado: ${arg}`);
    }
  }

  return options;
}

async function askProjectDir() {
  if (!process.stdin.isTTY) {
    throw new Error(
      "Informe o nome do projeto. Exemplo: create-sette-ts meu-projeto",
    );
  }

  const prompt = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const answer = await prompt.question("Nome do projeto: ");
    return answer.trim();
  } finally {
    prompt.close();
  }
}

function getPackageName(projectDir) {
  return path.basename(path.resolve(projectDir)).toLowerCase();
}

function validatePackageName(packageName) {
  return (
    Boolean(packageName) &&
    packageName.length <= 214 &&
    /^(?![._])[a-z0-9][a-z0-9._-]*$/.test(packageName)
  );
}

async function pathExists(target) {
  try {
    await access(target);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") {
      return false;
    }

    throw error;
  }
}

async function isEmpty(directory) {
  try {
    return (await readdir(directory)).length === 0;
  } catch (error) {
    if (error.code === "ENOENT") {
      return true;
    }

    throw error;
  }
}

function detectPackageManager() {
  const userAgent =
    process.env.npm_config_user_agent ?? "npm";

  const name = userAgent.split("/")[0];

  return ["npm", "pnpm", "yarn", "bun"].includes(name)
    ? name
    : "npm";
}

function run(command, args, cwd) {
  let result;

  const requiresWindowsShell =
    process.platform === "win32" &&
    ["npm", "pnpm", "yarn"].includes(command);

  if (requiresWindowsShell) {
    /*
     * npm, pnpm e yarn normalmente são .cmd no Windows.
     * Chamamos cmd.exe explicitamente em vez de usar
     * spawnSync(..., { shell: true }), evitando o DEP0190.
     *
     * Os comandos e argumentos passados para esta função
     * são definidos internamente pelo CLI.
     */
    result = spawnSync(
      process.env.ComSpec ?? "cmd.exe",
      [
        "/d",
        "/s",
        "/c",
        `${command} ${args.join(" ")}`,
      ],
      {
        cwd,
        stdio: "inherit",
      },
    );
  } else {
    /*
     * git e bun possuem executáveis que podem ser
     * chamados diretamente no Windows.
     *
     * Linux/macOS também entram aqui.
     */
    result = spawnSync(command, args, {
      cwd,
      stdio: "inherit",
    });
  }

  if (result.error) {
    return false;
  }

  return result.status === 0;
}

async function createProject(options) {
  const projectDir =
    options.projectDir || (await askProjectDir());

  if (!projectDir) {
    throw new Error("O nome do projeto não pode ser vazio.");
  }

  const packageName = getPackageName(projectDir);

  if (!validatePackageName(packageName)) {
    throw new Error(
      `"${packageName}" não é um nome de pacote npm válido.`,
    );
  }

  const targetDir = path.resolve(
    process.cwd(),
    projectDir,
  );

  if (!(await isEmpty(targetDir))) {
    throw new Error(
      `A pasta ${targetDir} não está vazia.`,
    );
  }

  const directoryAlreadyExisted =
    await pathExists(targetDir);

  /*
   * Esta etapa é a criação propriamente dita.
   *
   * Se algo falhar enquanto copia/configura o template,
   * fazemos rollback caso a pasta tenha sido criada
   * pelo próprio CLI.
   */
  try {
    await mkdir(targetDir, {
      recursive: true,
    });

    await cp(templateDir, targetDir, {
      recursive: true,
    });

    const packageJsonPath = path.join(
      targetDir,
      "package.json",
    );

    const packageJson = await readFile(
      packageJsonPath,
      "utf8",
    );

    await writeFile(
      packageJsonPath,
      packageJson.replaceAll(
        "{{projectName}}",
        packageName,
      ),
    );

    await rename(
      path.join(targetDir, "_gitignore"),
      path.join(targetDir, ".gitignore"),
    );
  } catch (error) {
    if (!directoryAlreadyExisted) {
      await rm(targetDir, {
        recursive: true,
        force: true,
      });
    }

    throw error;
  }

  const packageManager = detectPackageManager();

  /*
   * A partir daqui o projeto já está criado.
   *
   * Se npm install falhar por internet, registry,
   * permissão etc., não faz sentido apagar tudo.
   */
  let installed = false;

  if (options.install) {
    console.log(
      `\n${paint(
        "cyan",
        `Instalando dependências com ${packageManager}...`,
      )}`,
    );

    installed = run(
      packageManager,
      ["install"],
      targetDir,
    );

    if (!installed) {
      console.warn(
        `\n${paint(
          "yellow",
          "Aviso:",
        )} não foi possível instalar as dependências.`,
      );

      console.warn(
        `Execute manualmente: ${packageManager} install`,
      );
    }
  }

  if (options.git) {
    console.log(
      `\n${paint(
        "cyan",
        "Inicializando o Git...",
      )}`,
    );

    if (!run("git", ["init"], targetDir)) {
      console.warn(
        `${paint(
          "yellow",
          "Aviso:",
        )} não foi possível inicializar o Git.`,
      );
    }
  }

  const relativeDir =
    path.relative(process.cwd(), targetDir) || ".";

  console.log(
    `\n${paint(
      "green",
      "Projeto criado com sucesso!",
    )}\n`,
  );

  if (relativeDir !== ".") {
    console.log(`  cd ${relativeDir}`);
  }

  if (!options.install || !installed) {
    console.log(`  ${packageManager} install`);
  }

  console.log(
    `  ${packageManager} run dev\n`,
  );
}

try {
  await access(templateDir, constants.R_OK);

  const options = parseArgs(
    process.argv.slice(2),
  );

  if (options.help) {
    printHelp();
  } else {
    await createProject(options);
  }
} catch (error) {
  const message =
    error instanceof Error
      ? error.message
      : String(error);

  console.error(
    `\n${paint("red", "Erro:")} ${message}\n`,
  );

  process.exitCode = 1;
}