import * as childProcess from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const TOOLCHAIN_DIR_NAME = '.sweepi';
const TOOLCHAIN_PACKAGE_JSON_NAME = 'package.json';
const TOOLCHAIN_CONFIG_NAME = 'eslint.config.mjs';
const MINIMUM_NODE_VERSION = {
  major: 22,
  minor: 13,
  patch: 0,
};

const TOOLCHAIN_PACKAGE_JSON_CONTENT = JSON.stringify(
  {
    name: 'sweepi-toolchain',
    private: true,
  },
  null,
  2,
);

const TOOLCHAIN_CONFIG_CONTENT = `import sweepitPlugin from 'eslint-plugin-sweepit';

const files = ['**/*.ts', '**/*.tsx'];
const ignores = [
  '**/*.test.*',
  '**/*.spec.*',
  '**/node_modules/**',
  '**/.next/**',
  '**/dist/**',
  '**/build/**',
  '**/coverage/**',
  '**/.turbo/**',
  '**/out/**',
];

const withFiles = (config) => ({ ...config, files });

export default [
  { ignores },
  ...sweepitPlugin.configs.core.map(withFiles),
  ...sweepitPlugin.configs.react.map(withFiles),
];
`;

interface InitializeToolchainOptions {
  homeDirectory?: string;
  runInstallCommand?: (command: string, args: string[], cwd: string) => Promise<void>;
  runSkillInstallCommand?: (command: string, args: string[], cwd: string) => Promise<void>;
  onStatus?: (message: string) => void;
  forceReset?: boolean;
}

interface InitializeToolchainResult {
  toolchainDirectory: string;
  installedDependencies: boolean;
}

interface RunSweepiOptions {
  homeDirectory?: string;
  runLintCommand?: (command: string, args: string[], cwd: string) => Promise<number>;
  listChangedFiles?: (projectDirectory: string) => Promise<string[]>;
  onStatus?: (message: string) => void;
  all?: boolean;
}

async function initializeToolchain(
  options: InitializeToolchainOptions = {},
): Promise<InitializeToolchainResult> {
  assertSupportedNodeVersion();

  const homeDirectory = options.homeDirectory ?? os.homedir();
  const toolchainDirectory = path.join(homeDirectory, TOOLCHAIN_DIR_NAME);
  const packageJsonPath = path.join(toolchainDirectory, TOOLCHAIN_PACKAGE_JSON_NAME);
  const configPath = path.join(toolchainDirectory, TOOLCHAIN_CONFIG_NAME);
  const onStatus = options.onStatus;
  const forceReset = options.forceReset === true;

  if (forceReset) {
    onStatus?.(`Removing existing Sweepi toolchain in ${toolchainDirectory}`);
    await fs.rm(toolchainDirectory, { recursive: true, force: true });
  }

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
    onStatus?.(`Initializing Sweepi toolchain in ${toolchainDirectory}`);
    onStatus?.('Installing eslint-plugin-sweepit and peer dependencies...');

    const packageVersion = await readCurrentPackageVersion();
    const installArguments = [
      'install',
      '--no-save',
      '--no-audit',
      '--no-fund',
      '--no-package-lock',
      `eslint-plugin-sweepit@${packageVersion}`,
    ];
    const runInstallCommand = options.runInstallCommand ?? runInstallCommandWithNpm;
    const installStartedAt = Date.now();
    await runInstallCommand('npm', installArguments, toolchainDirectory);
    const installDurationSeconds = ((Date.now() - installStartedAt) / 1000).toFixed(1);
    onStatus?.(`Installed toolchain dependencies in ${installDurationSeconds}s`);
  } else {
    onStatus?.(`Reusing existing Sweepi toolchain in ${toolchainDirectory}`);
  }

  onStatus?.('Installing Sweepi LLM skill...');
  const runSkillInstallCommand = options.runSkillInstallCommand ?? runInstallCommandWithNpm;
  await runSkillInstallCommand(
    'npx',
    ['skills', 'add', 'jjenzz/sweepi', '--skill', 'sweepi', '--global', '--yes'],
    toolchainDirectory,
  );
  onStatus?.('Installed Sweepi LLM skill');

  return {
    toolchainDirectory,
    installedDependencies: installRequired,
  };
}

async function runSweepi(
  projectDirectory: string,
  options: RunSweepiOptions = {},
): Promise<number> {
  const resolvedProjectDirectory = path.resolve(projectDirectory);
  const projectDirectoryStats = await fs.stat(resolvedProjectDirectory).catch(() => null);

  if (projectDirectoryStats?.isDirectory() !== true) {
    throw new Error(`Project directory does not exist: ${resolvedProjectDirectory}`);
  }

  const homeDirectory = options.homeDirectory ?? os.homedir();
  const toolchainDirectory = path.join(homeDirectory, TOOLCHAIN_DIR_NAME);
  const eslintBinaryPath = path.join(toolchainDirectory, 'node_modules', '.bin', 'eslint');
  const pluginPackagePath = path.join(
    toolchainDirectory,
    'node_modules',
    'eslint-plugin-sweepit',
    'package.json',
  );
  const configPath = path.join(toolchainDirectory, TOOLCHAIN_CONFIG_NAME);
  const runLintCommand = options.runLintCommand ?? runLintCommandWithExecutable;
  const listChangedFiles = options.listChangedFiles ?? listChangedFilesFromGit;
  const onStatus = options.onStatus;
  const lintAllFiles = options.all === true;

  const eslintInstalled = await pathExists(eslintBinaryPath);
  const pluginInstalled = await pathExists(pluginPackagePath);
  const configInstalled = await pathExists(configPath);

  if (!eslintInstalled || !pluginInstalled || !configInstalled) {
    throw new Error(
      `Sweepi toolchain is not initialized in ${toolchainDirectory}. Run "sweepi init" first.`,
    );
  }

  onStatus?.(`Using Sweepi toolchain in ${toolchainDirectory}`);

  if (!lintAllFiles) {
    const changedFiles = await listChangedFiles(resolvedProjectDirectory);
    if (changedFiles.length === 0) {
      onStatus?.('No changed files to lint.');
      return 0;
    }

    return runLintCommand(
      eslintBinaryPath,
      [
        '--config',
        configPath,
        '--no-error-on-unmatched-pattern',
        ...changedFiles.map((filePath) => path.resolve(resolvedProjectDirectory, filePath)),
      ],
      resolvedProjectDirectory,
    );
  }

  return runLintCommand(
    eslintBinaryPath,
    ['--config', configPath, resolvedProjectDirectory],
    resolvedProjectDirectory,
  );
}

async function listChangedFilesFromGit(projectDirectory: string): Promise<string[]> {
  const [unstagedFiles, stagedFiles, untrackedFiles] = await Promise.all([
    runGitListCommand(projectDirectory, ['diff', '--name-only', '--diff-filter=ACMR']),
    runGitListCommand(projectDirectory, ['diff', '--cached', '--name-only', '--diff-filter=ACMR']),
    runGitListCommand(projectDirectory, ['ls-files', '--others', '--exclude-standard']),
  ]);

  return Array.from(new Set([...unstagedFiles, ...stagedFiles, ...untrackedFiles]));
}

function runGitListCommand(projectDirectory: string, args: string[]): Promise<string[]> {
  return new Promise<string[]>((resolve, reject) => {
    const child = childProcess.spawn('git', args, {
      cwd: projectDirectory,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
    });
    let output = '';
    let errorOutput = '';

    child.stdout.on('data', (chunk) => {
      output += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      errorOutput += chunk.toString();
    });

    child.on('error', (error) => {
      reject(error);
    });

    child.on('exit', (code) => {
      if (code !== 0) {
        reject(
          new Error(
            `Failed to list changed files with "git ${args.join(' ')}" in ${projectDirectory}.\n${errorOutput.trim()}`,
          ),
        );
        return;
      }

      const files = output
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
      resolve(files);
    });
  });
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
      stdio: ['ignore', 'inherit', 'pipe'],
      env: process.env,
    });
    let stderrOutput = '';

    child.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      stderrOutput += text;
      process.stderr.write(text);
    });

    child.on('error', (error) => {
      reject(error);
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(createInstallFailureError(command, args, cwd, code, stderrOutput));
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

function assertSupportedNodeVersion(): void {
  const parsedNodeVersion = parseNodeVersion(process.versions.node);

  if (
    parsedNodeVersion === null ||
    parsedNodeVersion.major < MINIMUM_NODE_VERSION.major ||
    (parsedNodeVersion.major === MINIMUM_NODE_VERSION.major &&
      parsedNodeVersion.minor < MINIMUM_NODE_VERSION.minor) ||
    (parsedNodeVersion.major === MINIMUM_NODE_VERSION.major &&
      parsedNodeVersion.minor === MINIMUM_NODE_VERSION.minor &&
      parsedNodeVersion.patch < MINIMUM_NODE_VERSION.patch)
  ) {
    throw new Error(
      `Sweepi requires Node.js >= ${formatNodeVersion(MINIMUM_NODE_VERSION)}. Detected ${process.version}.`,
    );
  }
}

function createInstallFailureError(
  command: string,
  args: string[],
  cwd: string,
  code: number | null,
  stderrOutput: string,
): Error {
  const lines = [
    `Failed to initialize Sweepi toolchain (exit code ${String(code)}).`,
    `Command: ${command} ${args.join(' ')}`,
    `Working directory: ${cwd}`,
  ];

  if (stderrOutput.length > 0) {
    lines.push('See npm output above for full error details.');
  }

  return new Error(lines.join('\n'));
}

async function readCurrentPackageVersion(): Promise<string> {
  const filePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'package.json');
  const packageJson = await fs.readFile(filePath, 'utf8');
  const parsedPackageJson = JSON.parse(packageJson) as { version?: string };

  if (parsedPackageJson.version === undefined || parsedPackageJson.version.length === 0) {
    throw new Error(`Unable to resolve version from ${filePath}`);
  }

  return parsedPackageJson.version;
}

function parseNodeVersion(version: string): { major: number; minor: number; patch: number } | null {
  const [majorPart, minorPart, patchPart] = version.split('.');
  const major = Number.parseInt(majorPart ?? '', 10);
  const minor = Number.parseInt(minorPart ?? '', 10);
  const patch = Number.parseInt(patchPart ?? '', 10);

  if (Number.isNaN(major) || Number.isNaN(minor) || Number.isNaN(patch)) {
    return null;
  }

  return {
    major,
    minor,
    patch,
  };
}

function formatNodeVersion(version: { major: number; minor: number; patch: number }): string {
  return `${String(version.major)}.${String(version.minor)}.${String(version.patch)}`;
}

export { initializeToolchain, runSweepi };
export type { InitializeToolchainOptions, InitializeToolchainResult, RunSweepiOptions };
