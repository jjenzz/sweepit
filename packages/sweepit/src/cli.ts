#!/usr/bin/env node

import { initializeToolchain, runSweepit } from './toolchain';

async function run(): Promise<void> {
  const command = process.argv[2];

  if (command === undefined || command === '--help' || command === '-h') {
    printHelp();
    return;
  }

  if (command === 'init') {
    const initialization = await initializeToolchain();

    if (initialization.installedDependencies) {
      process.stdout.write(
        `Initialized Sweepit toolchain in ${initialization.toolchainDirectory}\n`,
      );
      return;
    }

    process.stdout.write(
      `Sweepit toolchain already initialized in ${initialization.toolchainDirectory}\n`,
    );
    return;
  }

  if (command.startsWith('-')) {
    throw new Error(`Unknown flag "${command}". Try "sweepit --help".`);
  }

  const lintExitCode = await runSweepit(command);
  process.exitCode = lintExitCode;
}

function printHelp(): void {
  process.stdout.write(`Usage:
  sweepit <project-dir>
  sweepit init

Commands:
  <project-dir>    Initialize if required, then run eslint using ~/.sweepit
  init    Create ~/.sweepit and install rules
`);
}

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
