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
    files: parsedRunOptions.files,
  });
  process.exitCode = lintExitCode;
}

function printHelp(): void {
  process.stdout.write(`Usage:
  sweepi [project-dir] [--all]
  sweepi [project-dir] --file <path> [--file <path> ...]
  sweepi init

Commands:
  [project-dir]    Project directory to lint (default: current directory)
  --file <path>    Lint specific file(s), repeatable
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
  files: string[];
}

function parseRunOptions(argumentsList: string[]): ParsedRunOptions {
  let projectDirectory = '.';
  let all = false;
  const files: string[] = [];

  for (let argumentIndex = 0; argumentIndex < argumentsList.length; argumentIndex += 1) {
    const argument = argumentsList[argumentIndex];
    if (argument === undefined) continue;

    if (argument === '--all') {
      all = true;
      continue;
    }

    if (argument === '--file') {
      const nextArgument = argumentsList[argumentIndex + 1];

      if (nextArgument === undefined || nextArgument.startsWith('-')) {
        throw new Error('Missing value for "--file". Try "sweepi --help".');
      }

      files.push(nextArgument);
      argumentIndex += 1;
      continue;
    }

    if (argument.startsWith('--file=')) {
      const filePath = argument.slice('--file='.length);
      if (filePath.length === 0) {
        throw new Error('Missing value for "--file". Try "sweepi --help".');
      }

      files.push(filePath);
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

  if (all && files.length > 0) {
    throw new Error('Flags "--all" and "--file" cannot be used together. Try "sweepi --help".');
  }

  return {
    projectDirectory,
    all,
    files,
  };
}

try {
  await run();
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
}
