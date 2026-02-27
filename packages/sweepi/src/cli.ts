#!/usr/bin/env node

import { initializeToolchain, runSweepi } from './toolchain';

async function run(): Promise<void> {
  const [firstArgument, ...restArguments] = process.argv.slice(2);

  if (firstArgument === undefined || firstArgument === '--help' || firstArgument === '-h') {
    printHelp();
    return;
  }

  if (firstArgument === 'init') {
    const forceReset = parseForceResetOption(restArguments);
    const initialization = await initializeToolchain({
      onStatus: logStatus,
      forceReset,
    });

    if (initialization.installedDependencies) {
      process.stdout.write(
        `Initialized Sweepi toolchain in ${initialization.toolchainDirectory}\n`,
      );
      return;
    }

    process.stdout.write(
      `Sweepi toolchain already initialized in ${initialization.toolchainDirectory}\n`,
    );
    return;
  }

  const runArguments = [firstArgument, ...restArguments];
  const parsedRunOptions = parseRunOptions(runArguments);

  const lintExitCode = await runSweepi(parsedRunOptions.projectDirectory, {
    onStatus: logStatus,
    all: parsedRunOptions.all,
  });
  process.exitCode = lintExitCode;
}

function printHelp(): void {
  process.stdout.write(`Usage:
  sweepi [project-dir] [--all]
  sweepi init

Commands:
  [project-dir]    Run eslint on changed ts/tsx files (default: current directory)
  --all            Run eslint on all ts/tsx files
  init [--force, -f]    Create ~/.sweepi and install rules

Tip:
  For faster repeated runs, install globally: npm install --global sweepi
`);
}

function logStatus(message: string): void {
  process.stdout.write(`${message}\n`);
}

function parseForceResetOption(argumentsList: string[]): boolean {
  let forceReset = false;

  for (const argument of argumentsList) {
    if (argument === '--force' || argument === '-f') {
      forceReset = true;
      continue;
    }

    throw new Error(`Unknown init option "${argument}". Try "sweepi --help".`);
  }

  return forceReset;
}

interface ParsedRunOptions {
  projectDirectory: string;
  all: boolean;
}

function parseRunOptions(argumentsList: string[]): ParsedRunOptions {
  let projectDirectory = '.';
  let all = false;

  for (const argument of argumentsList) {
    if (argument === '--all') {
      all = true;
      continue;
    }

    if (argument.startsWith('-')) {
      throw new Error(`Unknown flag "${argument}". Try "sweepi --help".`);
    }

    if (projectDirectory !== '.') {
      throw new Error(`Unexpected argument "${argument}". Try "sweepi --help".`);
    }

    projectDirectory = argument;
  }

  return {
    projectDirectory,
    all,
  };
}

try {
  await run();
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
}
