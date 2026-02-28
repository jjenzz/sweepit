import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { initializeToolchain, runSweepi } from '../src/toolchain';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

describe('initializeToolchain', () => {
  it('creates toolchain files and installs dependencies when missing', async () => {
    const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'sweepi-init-test-'));
    const installCalls: Array<{ command: string; args: string[]; cwd: string }> = [];

    await initializeToolchain({
      homeDirectory: tempDirectory,
      runInstallCommand: async (command, args, cwd) => {
        installCalls.push({ command, args, cwd });
        const eslintBinaryPath = path.join(cwd, 'node_modules', '.bin');
        const pluginPackageDirectoryPath = path.join(cwd, 'node_modules', 'eslint-plugin-sweepit');
        await fs.mkdir(eslintBinaryPath, { recursive: true });
        await fs.mkdir(pluginPackageDirectoryPath, { recursive: true });
        await fs.writeFile(path.join(eslintBinaryPath, 'eslint'), '', 'utf8');
        await fs.writeFile(
          path.join(pluginPackageDirectoryPath, 'package.json'),
          '{"name":"eslint-plugin-sweepit"}',
          'utf8',
        );
      },
      runSkillInstallCommand: async (command, args, cwd) => {
        installCalls.push({ command, args, cwd });
      },
    });

    const toolchainDirectory = path.join(tempDirectory, '.sweepi');
    const packageJsonPath = path.join(toolchainDirectory, 'package.json');
    const configPath = path.join(toolchainDirectory, 'eslint.config.mjs');

    expect(await readText(packageJsonPath)).toContain('"private": true');
    expect(await readText(configPath)).toContain(
      "import sweepitPlugin from 'eslint-plugin-sweepit';",
    );
    expect(await readText(configPath)).toContain("const files = ['**/*.ts', '**/*.tsx'];");
    expect(await readText(configPath)).toContain("'**/*.test.*'");
    expect(await readText(configPath)).toContain("'**/*.spec.*'");
    expect(await readText(configPath)).toContain('const withFiles = (config) => ({');
    expect(installCalls).toHaveLength(2);
    expect(installCalls[0]?.command).toBe('npm');
    expect(installCalls[0]?.cwd).toBe(toolchainDirectory);
    expect(installCalls[0]?.args.some((arg) => arg.startsWith('eslint-plugin-sweepit@'))).toBe(
      true,
    );
    expect(installCalls[0]?.args).toContain('--no-package-lock');
    expect(installCalls[1]).toEqual({
      command: 'npx',
      args: ['skills', 'add', 'jjenzz/sweepi', '--skill', 'sweepi', '--global', '--yes'],
      cwd: toolchainDirectory,
    });
  });

  it('does not reinstall dependencies when toolchain is already initialized', async () => {
    const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'sweepi-init-test-'));
    const toolchainDirectory = path.join(tempDirectory, '.sweepi');
    const eslintBinaryPath = path.join(toolchainDirectory, 'node_modules', '.bin');
    const pluginPackageDirectoryPath = path.join(
      toolchainDirectory,
      'node_modules',
      'eslint-plugin-sweepit',
    );
    await fs.mkdir(eslintBinaryPath, { recursive: true });
    await fs.mkdir(pluginPackageDirectoryPath, { recursive: true });
    await fs.writeFile(path.join(eslintBinaryPath, 'eslint'), '', 'utf8');
    await fs.writeFile(
      path.join(pluginPackageDirectoryPath, 'package.json'),
      '{"name":"eslint-plugin-sweepit"}',
      'utf8',
    );

    const installCalls: Array<{ command: string; args: string[]; cwd: string }> = [];
    const result = await initializeToolchain({
      homeDirectory: tempDirectory,
      runInstallCommand: async (command, args, cwd) => {
        installCalls.push({ command, args, cwd });
      },
      runSkillInstallCommand: async (command, args, cwd) => {
        installCalls.push({ command, args, cwd });
      },
    });

    expect(result.installedDependencies).toBe(false);
    expect(installCalls).toEqual([
      {
        command: 'npx',
        args: ['skills', 'add', 'jjenzz/sweepi', '--skill', 'sweepi', '--global', '--yes'],
        cwd: toolchainDirectory,
      },
    ]);
  });

  it('removes and reinstalls toolchain when force reset is enabled', async () => {
    const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'sweepi-init-test-'));
    const toolchainDirectory = path.join(tempDirectory, '.sweepi');
    const eslintBinaryPath = path.join(toolchainDirectory, 'node_modules', '.bin');
    const pluginPackageDirectoryPath = path.join(
      toolchainDirectory,
      'node_modules',
      'eslint-plugin-sweepit',
    );
    const staleFilePath = path.join(toolchainDirectory, 'stale.txt');

    await fs.mkdir(eslintBinaryPath, { recursive: true });
    await fs.mkdir(pluginPackageDirectoryPath, { recursive: true });
    await fs.writeFile(path.join(eslintBinaryPath, 'eslint'), '', 'utf8');
    await fs.writeFile(
      path.join(pluginPackageDirectoryPath, 'package.json'),
      '{"name":"eslint-plugin-sweepit"}',
      'utf8',
    );
    await fs.writeFile(staleFilePath, 'stale', 'utf8');

    const installCalls: Array<{ command: string; args: string[]; cwd: string }> = [];
    const result = await initializeToolchain({
      homeDirectory: tempDirectory,
      forceReset: true,
      runInstallCommand: async (command, args, cwd) => {
        installCalls.push({ command, args, cwd });
        const binaryPath = path.join(cwd, 'node_modules', '.bin');
        const packageDirectoryPath = path.join(cwd, 'node_modules', 'eslint-plugin-sweepit');
        await fs.mkdir(binaryPath, { recursive: true });
        await fs.mkdir(packageDirectoryPath, { recursive: true });
        await fs.writeFile(path.join(binaryPath, 'eslint'), '', 'utf8');
        await fs.writeFile(
          path.join(packageDirectoryPath, 'package.json'),
          '{"name":"eslint-plugin-sweepit"}',
          'utf8',
        );
        expect(args.some((arg) => arg.startsWith('eslint-plugin-sweepit@'))).toBe(true);
      },
      runSkillInstallCommand: async (command, args, cwd) => {
        installCalls.push({ command, args, cwd });
      },
    });

    expect(result.installedDependencies).toBe(true);
    expect(installCalls).toHaveLength(2);
    expect(installCalls[0]?.command).toBe('npm');
    expect(installCalls[1]).toEqual({
      command: 'npx',
      args: ['skills', 'add', 'jjenzz/sweepi', '--skill', 'sweepi', '--global', '--yes'],
      cwd: toolchainDirectory,
    });
    expect(await fs.stat(staleFilePath).catch(() => null)).toBeNull();
  });
});

describe('runSweepi', () => {
  it('refreshes the skill when metadata is older than one day', async () => {
    const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'sweepi-run-test-'));
    const homeDirectory = path.join(tempDirectory, 'home');
    const projectDirectory = path.join(tempDirectory, 'project');
    const toolchainDirectory = path.join(homeDirectory, '.sweepi');
    const eslintBinaryPath = path.join(toolchainDirectory, 'node_modules', '.bin');
    const pluginPackageDirectoryPath = path.join(
      toolchainDirectory,
      'node_modules',
      'eslint-plugin-sweepit',
    );
    await fs.mkdir(projectDirectory, { recursive: true });
    await fs.mkdir(eslintBinaryPath, { recursive: true });
    await fs.mkdir(pluginPackageDirectoryPath, { recursive: true });
    await fs.writeFile(path.join(eslintBinaryPath, 'eslint'), '', 'utf8');
    await fs.writeFile(
      path.join(pluginPackageDirectoryPath, 'package.json'),
      '{"name":"eslint-plugin-sweepit"}',
      'utf8',
    );
    await fs.writeFile(
      path.join(toolchainDirectory, 'eslint.config.mjs'),
      'export default [];',
      'utf8',
    );
    await writeToolchainMetadata(
      toolchainDirectory,
      new Date(Date.now() - ONE_DAY_MS * 2).toISOString(),
    );

    const skillInstallCalls: Array<{ command: string; args: string[]; cwd: string }> = [];

    const exitCode = await runSweepi(projectDirectory, {
      homeDirectory,
      listChangedFiles: async () => [],
      runSkillInstallCommand: async (command, args, cwd) => {
        skillInstallCalls.push({ command, args, cwd });
      },
      runLintCommand: async () => 0,
    });

    expect(exitCode).toBe(0);
    expect(skillInstallCalls).toEqual([
      {
        command: 'npx',
        args: ['skills', 'add', 'jjenzz/sweepi', '--skill', 'sweepi', '--global', '--yes'],
        cwd: toolchainDirectory,
      },
    ]);
  });

  it('does not refresh the skill when metadata is within one day', async () => {
    const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'sweepi-run-test-'));
    const homeDirectory = path.join(tempDirectory, 'home');
    const projectDirectory = path.join(tempDirectory, 'project');
    const toolchainDirectory = path.join(homeDirectory, '.sweepi');
    const eslintBinaryPath = path.join(toolchainDirectory, 'node_modules', '.bin');
    const pluginPackageDirectoryPath = path.join(
      toolchainDirectory,
      'node_modules',
      'eslint-plugin-sweepit',
    );
    await fs.mkdir(projectDirectory, { recursive: true });
    await fs.mkdir(eslintBinaryPath, { recursive: true });
    await fs.mkdir(pluginPackageDirectoryPath, { recursive: true });
    await fs.writeFile(path.join(eslintBinaryPath, 'eslint'), '', 'utf8');
    await fs.writeFile(
      path.join(pluginPackageDirectoryPath, 'package.json'),
      '{"name":"eslint-plugin-sweepit"}',
      'utf8',
    );
    await fs.writeFile(
      path.join(toolchainDirectory, 'eslint.config.mjs'),
      'export default [];',
      'utf8',
    );
    await writeToolchainMetadata(toolchainDirectory, new Date().toISOString());

    const skillInstallCalls: Array<{ command: string; args: string[]; cwd: string }> = [];

    const exitCode = await runSweepi(projectDirectory, {
      homeDirectory,
      listChangedFiles: async () => [],
      runSkillInstallCommand: async (command, args, cwd) => {
        skillInstallCalls.push({ command, args, cwd });
      },
      runLintCommand: async () => 0,
    });

    expect(exitCode).toBe(0);
    expect(skillInstallCalls).toHaveLength(0);
  });

  it('runs eslint against changed TypeScript files when toolchain is initialized', async () => {
    const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'sweepi-run-test-'));
    const homeDirectory = path.join(tempDirectory, 'home');
    const projectDirectory = path.join(tempDirectory, 'project');
    const toolchainDirectory = path.join(homeDirectory, '.sweepi');
    const eslintBinaryPath = path.join(toolchainDirectory, 'node_modules', '.bin');
    const pluginPackageDirectoryPath = path.join(
      toolchainDirectory,
      'node_modules',
      'eslint-plugin-sweepit',
    );
    await fs.mkdir(projectDirectory, { recursive: true });
    await fs.mkdir(eslintBinaryPath, { recursive: true });
    await fs.mkdir(pluginPackageDirectoryPath, { recursive: true });
    await fs.writeFile(path.join(eslintBinaryPath, 'eslint'), '', 'utf8');
    await fs.writeFile(
      path.join(pluginPackageDirectoryPath, 'package.json'),
      '{"name":"eslint-plugin-sweepit"}',
      'utf8',
    );
    await fs.writeFile(
      path.join(toolchainDirectory, 'eslint.config.mjs'),
      'export default [];',
      'utf8',
    );

    const lintCalls: Array<{ command: string; args: string[]; cwd: string }> = [];

    const exitCode = await runSweepi(projectDirectory, {
      homeDirectory,
      runSkillInstallCommand: async () => {},
      listChangedFiles: async () => [
        'src/feature.ts',
        'src/component.tsx',
        'src/component.test.tsx',
        'README.md',
      ],
      runLintCommand: async (command, args, cwd) => {
        lintCalls.push({ command, args, cwd });
        return 0;
      },
    });

    expect(exitCode).toBe(0);
    expect(lintCalls).toHaveLength(1);
    expect(lintCalls[0]?.command).toBe(
      path.join(toolchainDirectory, 'node_modules', '.bin', 'eslint'),
    );
    expect(lintCalls[0]?.args).toEqual([
      '--config',
      path.join(toolchainDirectory, 'eslint.config.mjs'),
      '--no-error-on-unmatched-pattern',
      path.join(projectDirectory, 'src/feature.ts'),
      path.join(projectDirectory, 'src/component.tsx'),
      path.join(projectDirectory, 'src/component.test.tsx'),
      path.join(projectDirectory, 'README.md'),
    ]);
    expect(lintCalls[0]?.cwd).toBe(projectDirectory);
  });

  it('runs eslint against all TypeScript files when all mode is enabled', async () => {
    const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'sweepi-run-test-'));
    const homeDirectory = path.join(tempDirectory, 'home');
    const projectDirectory = path.join(tempDirectory, 'project');
    const toolchainDirectory = path.join(homeDirectory, '.sweepi');
    const eslintBinaryPath = path.join(toolchainDirectory, 'node_modules', '.bin');
    const pluginPackageDirectoryPath = path.join(
      toolchainDirectory,
      'node_modules',
      'eslint-plugin-sweepit',
    );
    await fs.mkdir(projectDirectory, { recursive: true });
    await fs.mkdir(eslintBinaryPath, { recursive: true });
    await fs.mkdir(pluginPackageDirectoryPath, { recursive: true });
    await fs.writeFile(path.join(eslintBinaryPath, 'eslint'), '', 'utf8');
    await fs.writeFile(
      path.join(pluginPackageDirectoryPath, 'package.json'),
      '{"name":"eslint-plugin-sweepit"}',
      'utf8',
    );
    await fs.writeFile(
      path.join(toolchainDirectory, 'eslint.config.mjs'),
      'export default [];',
      'utf8',
    );

    const lintCalls: Array<{ command: string; args: string[]; cwd: string }> = [];

    const exitCode = await runSweepi(projectDirectory, {
      homeDirectory,
      all: true,
      runSkillInstallCommand: async () => {},
      runLintCommand: async (command, args, cwd) => {
        lintCalls.push({ command, args, cwd });
        return 0;
      },
    });

    expect(exitCode).toBe(0);
    expect(lintCalls).toHaveLength(1);
    expect(lintCalls[0]?.args).toEqual([
      '--config',
      path.join(toolchainDirectory, 'eslint.config.mjs'),
      projectDirectory,
    ]);
  });

  it('returns the eslint process exit code', async () => {
    const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'sweepi-run-test-'));
    const homeDirectory = path.join(tempDirectory, 'home');
    const projectDirectory = path.join(tempDirectory, 'project');
    const toolchainDirectory = path.join(homeDirectory, '.sweepi');
    const eslintBinaryPath = path.join(toolchainDirectory, 'node_modules', '.bin');
    const pluginPackageDirectoryPath = path.join(
      toolchainDirectory,
      'node_modules',
      'eslint-plugin-sweepit',
    );
    await fs.mkdir(projectDirectory, { recursive: true });
    await fs.mkdir(eslintBinaryPath, { recursive: true });
    await fs.mkdir(pluginPackageDirectoryPath, { recursive: true });
    await fs.writeFile(path.join(eslintBinaryPath, 'eslint'), '', 'utf8');
    await fs.writeFile(
      path.join(pluginPackageDirectoryPath, 'package.json'),
      '{"name":"eslint-plugin-sweepit"}',
      'utf8',
    );
    await fs.writeFile(
      path.join(toolchainDirectory, 'eslint.config.mjs'),
      'export default [];',
      'utf8',
    );

    const exitCode = await runSweepi(projectDirectory, {
      homeDirectory,
      runSkillInstallCommand: async () => {},
      listChangedFiles: async () => ['src/feature.ts'],
      runLintCommand: async () => 2,
    });

    expect(exitCode).toBe(2);
  });

  it('returns 0 when there are no changed files', async () => {
    const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'sweepi-run-test-'));
    const homeDirectory = path.join(tempDirectory, 'home');
    const projectDirectory = path.join(tempDirectory, 'project');
    const toolchainDirectory = path.join(homeDirectory, '.sweepi');
    const eslintBinaryPath = path.join(toolchainDirectory, 'node_modules', '.bin');
    const pluginPackageDirectoryPath = path.join(
      toolchainDirectory,
      'node_modules',
      'eslint-plugin-sweepit',
    );
    await fs.mkdir(projectDirectory, { recursive: true });
    await fs.mkdir(eslintBinaryPath, { recursive: true });
    await fs.mkdir(pluginPackageDirectoryPath, { recursive: true });
    await fs.writeFile(path.join(eslintBinaryPath, 'eslint'), '', 'utf8');
    await fs.writeFile(
      path.join(pluginPackageDirectoryPath, 'package.json'),
      '{"name":"eslint-plugin-sweepit"}',
      'utf8',
    );
    await fs.writeFile(
      path.join(toolchainDirectory, 'eslint.config.mjs'),
      'export default [];',
      'utf8',
    );

    let lintAttempted = false;
    const exitCode = await runSweepi(projectDirectory, {
      homeDirectory,
      runSkillInstallCommand: async () => {},
      listChangedFiles: async () => [],
      runLintCommand: async () => {
        lintAttempted = true;
        return 1;
      },
    });

    expect(exitCode).toBe(0);
    expect(lintAttempted).toBe(false);
  });

  it('throws when the provided project directory does not exist', async () => {
    const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'sweepi-run-test-'));
    const missingProjectDirectory = path.join(tempDirectory, 'missing');

    await expect(runSweepi(missingProjectDirectory)).rejects.toThrow(
      `Project directory does not exist: ${missingProjectDirectory}`,
    );
  });

  it('throws when the toolchain is not initialized', async () => {
    const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'sweepi-run-test-'));
    const homeDirectory = path.join(tempDirectory, 'home');
    const projectDirectory = path.join(tempDirectory, 'project');
    const toolchainDirectory = path.join(homeDirectory, '.sweepi');
    await fs.mkdir(projectDirectory, { recursive: true });

    await expect(runSweepi(projectDirectory, { homeDirectory })).rejects.toThrow(
      `Sweepi toolchain is not initialized in ${toolchainDirectory}. Run "sweepi init" first.`,
    );
  });
});

async function readText(filePath: string): Promise<string> {
  return fs.readFile(filePath, 'utf8');
}

async function writeToolchainMetadata(toolchainDirectory: string, updatedAt: string): Promise<void> {
  await fs.writeFile(
    path.join(toolchainDirectory, 'metadata.json'),
    `${JSON.stringify({ updatedAt }, null, 2)}\n`,
    'utf8',
  );
}
