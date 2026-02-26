import * as childProcess from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

const TOOLCHAIN_DIR_NAME = '.sweepit';
const TOOLCHAIN_PACKAGE_JSON_NAME = 'package.json';
const TOOLCHAIN_CONFIG_NAME = 'eslint.config.mjs';
const TOOLCHAIN_INSTALL_ARGUMENTS = [
  'install',
  '--no-save',
  '--no-audit',
  '--no-fund',
  'eslint@^9.0.0',
  'eslint-plugin-sweepit@latest',
];

const TOOLCHAIN_PACKAGE_JSON_CONTENT = JSON.stringify(
  {
    name: 'sweepit-toolchain',
    private: true,
  },
  null,
  2,
);

const TOOLCHAIN_CONFIG_CONTENT = `import sweepit from 'eslint-plugin-sweepit';

export default [...sweepit.configs.core, ...sweepit.configs.react];
`;

interface InitializeToolchainOptions {
  homeDirectory?: string;
  runInstallCommand?: (command: string, args: string[], cwd: string) => Promise<void>;
}

interface InitializeToolchainResult {
  toolchainDirectory: string;
  installedDependencies: boolean;
}

interface RunSweepitOptions {
  homeDirectory?: string;
  runInstallCommand?: (command: string, args: string[], cwd: string) => Promise<void>;
  runLintCommand?: (command: string, args: string[], cwd: string) => Promise<number>;
}

async function initializeToolchain(
  options: InitializeToolchainOptions = {},
): Promise<InitializeToolchainResult> {
  const homeDirectory = options.homeDirectory ?? os.homedir();
  const toolchainDirectory = path.join(homeDirectory, TOOLCHAIN_DIR_NAME);
  const packageJsonPath = path.join(toolchainDirectory, TOOLCHAIN_PACKAGE_JSON_NAME);
  const configPath = path.join(toolchainDirectory, TOOLCHAIN_CONFIG_NAME);

  await fs.mkdir(toolchainDirectory, { recursive: true });
  await ensureFile(packageJsonPath, TOOLCHAIN_PACKAGE_JSON_CONTENT);
  await ensureFile(configPath, TOOLCHAIN_CONFIG_CONTENT);

  const eslintBinaryPath = path.join(toolchainDirectory, 'node_modules', '.bin', 'eslint');
  const pluginPackagePath = path.join(
    toolchainDirectory,
    'node_modules',
    'eslint-plugin-sweepit',
    'package.json',
  );

  const eslintInstalled = await pathExists(eslintBinaryPath);
  const pluginInstalled = await pathExists(pluginPackagePath);
  const installRequired = !eslintInstalled || !pluginInstalled;

  if (installRequired) {
    const runInstallCommand = options.runInstallCommand ?? runInstallCommandWithNpm;
    await runInstallCommand('npm', TOOLCHAIN_INSTALL_ARGUMENTS, toolchainDirectory);
  }

  return {
    toolchainDirectory,
    installedDependencies: installRequired,
  };
}

async function runSweepit(
  projectDirectory: string,
  options: RunSweepitOptions = {},
): Promise<number> {
  const resolvedProjectDirectory = path.resolve(projectDirectory);
  const projectDirectoryStats = await fs.stat(resolvedProjectDirectory).catch(() => null);

  if (projectDirectoryStats === null || !projectDirectoryStats.isDirectory()) {
    throw new Error(`Project directory does not exist: ${resolvedProjectDirectory}`);
  }

  const initialization = await initializeToolchain({
    homeDirectory: options.homeDirectory,
    runInstallCommand: options.runInstallCommand,
  });
  const eslintBinaryPath = path.join(
    initialization.toolchainDirectory,
    'node_modules',
    '.bin',
    'eslint',
  );
  const configPath = path.join(initialization.toolchainDirectory, TOOLCHAIN_CONFIG_NAME);
  const runLintCommand = options.runLintCommand ?? runLintCommandWithExecutable;

  return runLintCommand(
    eslintBinaryPath,
    ['--config', configPath, resolvedProjectDirectory],
    resolvedProjectDirectory,
  );
}

async function ensureFile(filePath: string, content: string): Promise<void> {
  const exists = await pathExists(filePath);

  if (!exists) {
    await fs.writeFile(filePath, content, 'utf8');
  }
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function runInstallCommandWithNpm(
  command: string,
  args: string[],
  cwd: string,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = childProcess.spawn(command, args, {
      cwd,
      stdio: 'inherit',
      env: process.env,
    });

    child.on('error', (error) => {
      reject(error);
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Failed to initialize Sweepit toolchain (exit code ${String(code)}).`));
    });
  });
}

async function runLintCommandWithExecutable(
  command: string,
  args: string[],
  cwd: string,
): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    const child = childProcess.spawn(command, args, {
      cwd,
      stdio: 'inherit',
      env: process.env,
    });

    child.on('error', (error) => {
      reject(error);
    });

    child.on('exit', (code) => {
      resolve(code ?? 1);
    });
  });
}

export { initializeToolchain, runSweepit };
export type { InitializeToolchainOptions, InitializeToolchainResult, RunSweepitOptions };
